/**
 * Gemeinsame Testhilfen.
 *
 * Läuft im Node-Testrunner (`node --test tests/`), nicht im Browser.
 * Die reinen Module lassen sich direkt importieren; für tracker.js gibt es
 * hier eine Geolocation-Attrappe.
 */

import { readFileSync, readdirSync } from 'node:fs';

/** Ein Grad Breite sind ~111,19 km, ein Meter also ~0,000008993°. */
export const METER_IN_DEGREES_LAT = 0.000008993;

/** Tagesnummer -> ISO-Datum, Basis 2026-01-01. */
export function day(offset) {
  return new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10);
}

/**
 * Lauf für Achievement-Tests.
 * @param {number} dayOffset Tage seit 2026-01-01
 */
export function makeRun(dayOffset, distanceKm, extra = {}) {
  return {
    id: `run-${dayOffset}-${distanceKm}-${extra.timeOfDay ?? ''}`,
    date: day(dayOffset),
    distanceKm,
    ...extra,
  };
}

/**
 * GPS-Punkt, `meters` Meter nördlich vom Startpunkt.
 * `seconds` ist der Abstand zum Zeitnullpunkt der Strecke.
 */
export function pointNorth(meters, { accuracy = 10, seconds = 0 } = {}) {
  return {
    lat: 52.5 + meters * METER_IN_DEGREES_LAT,
    lon: 13.4,
    accuracy,
    timestamp: 1_000_000 + seconds * 1000,
  };
}

/**
 * localStorage im Arbeitsspeicher – Node hat von Haus aus keins.
 * Muss am Ende jedes Tests mit restore() zurückgesetzt werden.
 */
export function installFakeLocalStorage(initial = null) {
  const store = new Map();
  if (initial !== null) store.set('laufapp.runs.v1', JSON.stringify(initial));

  /** Wird gesetzt, wirft jedes Schreiben diesen Fehler – siehe failWrites(). */
  let schreibFehler = null;

  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        if (schreibFehler !== null) throw schreibFehler;
        store.set(key, String(value));
      },
      removeItem: (key) => {
        if (schreibFehler !== null) throw schreibFehler;
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });

  return {
    /** Was tatsächlich im Speicher gelandet ist. */
    read: (key = 'laufapp.runs.v1') => {
      const raw = store.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },

    /**
     * Lässt jedes weitere Schreiben scheitern.
     *
     * Der Vorgabefehler ist ein voller Speicher, weil das der Fall ist, der auf
     * einem echten Gerät tatsächlich eintritt: eine Stunde GPS je Lauf, und der
     * localStorage fasst nur wenige Megabyte. `null` schaltet wieder frei.
     */
    failWrites(err = quotaFehler()) {
      schreibFehler = err;
    },

    restore() {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else delete globalThis.localStorage;
    },
  };
}

/** Ein „Speicher voll", wie ihn Chrome und Safari werfen. */
export function quotaFehler() {
  const err = new Error('The quota has been exceeded.');
  err.name = 'QuotaExceededError';
  err.code = 22;
  return err;
}

/**
 * Ersetzt navigator.geolocation durch eine steuerbare Attrappe.
 * Muss am Ende jedes Tests mit restore() zurückgesetzt werden.
 */
export function installFakeGeolocation() {
  const watchers = new Map();
  let nextId = 1;

  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: {
      geolocation: {
        watchPosition(success, error) {
          const id = nextId++;
          watchers.set(id, { success, error });
          return id;
        },
        clearWatch(id) {
          watchers.delete(id);
        },
        getCurrentPosition() {},
      },
    },
  });

  return {
    /** Wie viele watchPosition-Abos gerade offen sind. */
    watcherCount: () => watchers.size,

    /** Schiebt eine Position an alle Abos. */
    feed({ meters, accuracy = 10, seconds = 0 }) {
      const point = pointNorth(meters, { accuracy, seconds });
      const position = {
        coords: { latitude: point.lat, longitude: point.lon, accuracy: point.accuracy },
        timestamp: point.timestamp,
      };
      for (const watcher of watchers.values()) watcher.success(position);
    },

    /** Löst einen Geolocation-Fehler aus (1 = abgelehnt, 2 = kein Signal, 3 = Timeout). */
    fail(code) {
      for (const watcher of watchers.values()) watcher.error?.({ code, message: 'test' });
    },

    restore() {
      if (previous) Object.defineProperty(globalThis, 'navigator', previous);
      else delete globalThis.navigator;
    },
  };
}

/**
 * Alle Module unter `js/`, samt Unterverzeichnissen, als Pfad ab der Wurzel.
 *
 * Steht hier, weil drei Testdateien dieselbe Frage stellen. Bis B1 lasen sie
 * alle einfach `js/app.js` – das war dieselbe Datei wie "die App". Seit die
 * Ansichten unter `js/views/` liegen, ist es das nicht mehr, und ein Test, der
 * weiter nur `app.js` liest, sucht in der falschen Datei und bleibt trotzdem
 * grün. Genau das ist beim Herauslösen dreimal passiert.
 */
export function moduleDateien(verzeichnis = 'js/') {
  const wurzel = new URL('../', import.meta.url);

  return readdirSync(new URL(verzeichnis, wurzel), { withFileTypes: true }).flatMap((eintrag) => {
    if (eintrag.isDirectory()) return moduleDateien(`${verzeichnis}${eintrag.name}/`);
    return eintrag.name.endsWith('.js') ? [`${verzeichnis}${eintrag.name}`] : [];
  });
}

/**
 * Der Quelltext aller Module hintereinander.
 *
 * Für Tests, die im Quelltext nach einer Regel suchen, statt Verhalten zu
 * prüfen – wo im Baum die Zeile steht, ist für sie ohne Belang. Nur die
 * Reihenfolge ist verlässlich, nicht die Zeilennummern: wer auf Position
 * prüfen will, liest die einzelne Datei.
 */
export function quelltextDerModule() {
  const wurzel = new URL('../', import.meta.url);
  return moduleDateien()
    .map((pfad) => readFileSync(new URL(pfad, wurzel), 'utf8'))
    .join('\n');
}
