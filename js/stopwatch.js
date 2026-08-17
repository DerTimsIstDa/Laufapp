/**
 * Aufzeichnung ohne GPS – reine Zeitnahme.
 *
 * Nach aussen dieselbe Form wie tracker.js: start, pause, resume, stop,
 * discard, getState. Nur so lässt sich in app.js zwischen beiden umschalten,
 * ohne die Bedienung, die Tastensperre und die Anzeige zu verdoppeln. Die
 * Streckenfelder gibt es deshalb auch hier, sie bleiben nur bei null.
 *
 * Es wird kein Standort abgefragt – deshalb fragt das Betriebssystem in
 * diesem Weg auch nie nach der Freigabe.
 */

import { createWakeLock } from './wake-lock.js';

export function createStopwatch({ onUpdate } = {}) {
  let status = 'idle';
  let tickId = null;

  let startedAt = null;
  let segmentStartMs = 0; // Beginn des laufenden (nicht pausierten) Abschnitts
  let accumulatedMs = 0; // Summe abgeschlossener Abschnitte

  const wakeLock = createWakeLock(() => status === 'tracking');

  /* ------------------------------------------------------------- Öffentlich */

  /** Eine Stoppuhr braucht nichts, was fehlen könnte. */
  function isSupported() {
    return true;
  }

  function start() {
    if (status !== 'idle') return;

    startedAt = new Date();
    accumulatedMs = 0;
    segmentStartMs = Date.now();
    status = 'tracking';

    beginTicking();
    emit();
  }

  function pause() {
    if (status !== 'tracking') return;

    accumulatedMs += Date.now() - segmentStartMs;
    status = 'paused';

    stopTicking();
    emit();
  }

  function resume() {
    if (status !== 'paused') return;

    segmentStartMs = Date.now();
    status = 'tracking';

    beginTicking();
    emit();
  }

  /**
   * Beendet die Zeitnahme und liefert das Ergebnis.
   *
   * `distanceKm` ist immer 0 und `track` immer leer – gemessen wurde nur die
   * Zeit. Die Distanz trägt der Läufer danach im Formular nach.
   *
   * @returns {?{
   *   distanceKm: number, durationMinutes: number, startedAt: Date,
   *   pointCount: number, track: {lat: number, lon: number}[]
   * }}
   */
  function stop() {
    if (status === 'idle') return null;

    const elapsedMs = getElapsedMs();
    const summary = {
      distanceKm: 0,
      durationMinutes: Math.round((elapsedMs / 60_000) * 10) / 10,
      startedAt,
      pointCount: 0,
      track: [],
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

  /** @returns {import('./tracker.js').TrackerState} */
  function getState() {
    return {
      gps: false,
      status,
      distanceKm: 0,
      elapsedMs: getElapsedMs(),
      startedAt,
      lastAccuracyM: null,
      pointCount: 0,
      rejectedCount: 0,
      stillCount: 0,
    };
  }

  /* ------------------------------------------------------------------ Intern */

  function beginTicking() {
    tickId = setInterval(emit, 1000);
    wakeLock.request();
  }

  function stopTicking() {
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
    wakeLock.release();
  }

  function reset() {
    stopTicking();
    status = 'idle';
    startedAt = null;
    accumulatedMs = 0;
    segmentStartMs = 0;
  }

  function getElapsedMs() {
    if (status === 'tracking') return accumulatedMs + (Date.now() - segmentStartMs);
    return accumulatedMs;
  }

  function emit() {
    onUpdate?.(getState());
  }

  return { start, pause, resume, stop, discard, getState, isSupported };
}
