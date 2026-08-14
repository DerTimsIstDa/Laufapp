/**
 * Live-Tracking über die Geolocation-API.
 *
 * Kapselt den gesamten Browser-Kram: watchPosition, Pausen-Zeitrechnung,
 * Wake Lock und Fehlerübersetzung. Die Streckenberechnung selbst kommt aus
 * geo.js, deshalb ist hier keine Mathematik.
 *
 * navigator.geolocation wird bewusst erst in start() gelesen – so lässt sich
 * das Tracking im Test mit einer Attrappe betreiben.
 */

import { evaluateSegment, DEFAULT_FILTER } from './geo.js';

/** Position gilt nach so vielen ms ohne Fix als "kein Signal". */
const POSITION_TIMEOUT_MS = 20_000;

/**
 * @typedef {Object} TrackerState
 * @property {'idle'|'tracking'|'paused'} status
 * @property {number} distanceKm
 * @property {number} elapsedMs
 * @property {?Date} startedAt
 * @property {?number} lastAccuracyM
 * @property {number} pointCount     akzeptierte Punkte
 * @property {number} rejectedCount  wegen schlechter Qualität verworfen
 * @property {number} stillCount     zu kleine Bewegung (Normalfall, kein Fehler)
 */

export function createTracker({ onUpdate, onError, filter = DEFAULT_FILTER } = {}) {
  let status = 'idle';
  let watchId = null;
  let tickId = null;
  let wakeLock = null;

  let startedAt = null;
  let segmentStartMs = 0; // Beginn des laufenden (nicht pausierten) Abschnitts
  let accumulatedMs = 0; // Summe abgeschlossener Abschnitte

  let distanceKm = 0;
  let lastPoint = null;
  let lastAccuracyM = null;
  let pointCount = 0;
  let rejectedCount = 0;
  let stillCount = 0;

  /* ------------------------------------------------------------- Öffentlich */

  function isSupported() {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  function start() {
    if (status !== 'idle') return;
    if (!isSupported()) {
      onError?.('Dieser Browser kennt keine Standortbestimmung.');
      return;
    }

    startedAt = new Date();
    accumulatedMs = 0;
    segmentStartMs = Date.now();
    distanceKm = 0;
    lastPoint = null;
    lastAccuracyM = null;
    pointCount = 0;
    rejectedCount = 0;
    stillCount = 0;
    status = 'tracking';

    beginWatching();
    emit();
  }

  function pause() {
    if (status !== 'tracking') return;

    accumulatedMs += Date.now() - segmentStartMs;
    status = 'paused';

    // Ohne letzten Punkt zählt der Weg während der Pause später nicht mit.
    lastPoint = null;
    stopWatching();
    emit();
  }

  function resume() {
    if (status !== 'paused') return;

    segmentStartMs = Date.now();
    status = 'tracking';

    beginWatching();
    emit();
  }

  /**
   * Beendet die Aufzeichnung und liefert das Ergebnis.
   * @returns {?{ distanceKm: number, durationMinutes: number, startedAt: Date, pointCount: number }}
   */
  function stop() {
    if (status === 'idle') return null;

    const elapsedMs = getElapsedMs();
    const summary = {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.round((elapsedMs / 60_000) * 10) / 10,
      startedAt,
      pointCount,
    };

    reset();
    emit();
    return summary;
  }

  /** Bricht ab, ohne ein Ergebnis zu liefern. */
  function discard() {
    if (status === 'idle') return;
    reset();
    emit();
  }

  /** @returns {TrackerState} */
  function getState() {
    return {
      status,
      distanceKm,
      elapsedMs: getElapsedMs(),
      startedAt,
      lastAccuracyM,
      pointCount,
      rejectedCount,
      stillCount,
    };
  }

  /* ------------------------------------------------------------------ Intern */

  function beginWatching() {
    watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: POSITION_TIMEOUT_MS,
    });

    tickId = setInterval(emit, 1000); // Uhr läuft auch ohne neuen Fix weiter
    requestWakeLock();
  }

  function stopWatching() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
    releaseWakeLock();
  }

  function reset() {
    stopWatching();
    status = 'idle';
    startedAt = null;
    accumulatedMs = 0;
    segmentStartMs = 0;
    distanceKm = 0;
    lastPoint = null;
    lastAccuracyM = null;
    pointCount = 0;
    rejectedCount = 0;
    stillCount = 0;
  }

  function handlePosition(position) {
    if (status !== 'tracking') return;

    const point = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };

    const result = evaluateSegment(lastPoint, point, filter);
    lastAccuracyM = point.accuracy;

    if (result.accepted) {
      distanceKm += result.distanceKm;
      lastPoint = point;
      pointCount++;
    } else if (result.reason === 'jitter') {
      // Normalfall: bei 1 Fix/Sekunde liegt ein Laufschritt oft unter der
      // Mindeststrecke. Der Bezugspunkt bleibt stehen, die Distanz wird beim
      // nächsten größeren Schritt vollständig mitgezählt – kein Datenverlust.
      stillCount++;
    } else {
      rejectedCount++;
    }

    emit();
  }

  function handleError(error) {
    // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
    if (error.code === 1) {
      reset();
      onError?.('Standortzugriff abgelehnt. Ohne Freigabe geht kein Tracking.');
      emit();
      return;
    }

    // Kein Signal oder Timeout: Aufzeichnung läuft weiter, nur melden.
    onError?.(
      error.code === 3
        ? 'Noch kein GPS-Signal – die Uhr läuft weiter.'
        : 'GPS-Signal gerade nicht verfügbar.'
    );
  }

  function getElapsedMs() {
    if (status === 'tracking') return accumulatedMs + (Date.now() - segmentStartMs);
    return accumulatedMs;
  }

  function emit() {
    onUpdate?.(getState());
  }

  /* Bildschirm wach halten – sonst schläft das GPS auf dem Handy ein. */

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      wakeLock = null; // z.B. Akkusparmodus – kein Grund abzubrechen
    }
  }

  function releaseWakeLock() {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }

  // Nach dem Zurückschalten in den Tab ist der Wake Lock weg.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && status === 'tracking') {
        requestWakeLock();
      }
    });
  }

  return { start, pause, resume, stop, discard, getState, isSupported };
}
