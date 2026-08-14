/**
 * Gemeinsame Testhilfen.
 *
 * Läuft im Node-Testrunner (`node --test tests/`), nicht im Browser.
 * Die reinen Module lassen sich direkt importieren; für tracker.js gibt es
 * hier eine Geolocation-Attrappe.
 */

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
