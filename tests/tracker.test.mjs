import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createTracker } from '../js/tracker.js';
import { installFakeGeolocation } from './helpers.mjs';

let gps;
let tracker;
let updates;

beforeEach(() => {
  gps = installFakeGeolocation();
  updates = [];
  tracker = createTracker({ onUpdate: (state) => updates.push(state) });
});

afterEach(() => {
  tracker.discard(); // stoppt Intervall und watchPosition, sonst hängt der Testlauf
  gps.restore();
});

/** Läuft `meters` Meter in Schritten von 10 m, ein Punkt pro Sekunde. */
function runMeters(meters, { from = 0, startSecond = 0 } = {}) {
  for (let m = 0; m <= meters; m += 10) {
    gps.feed({ meters: from + m, seconds: startSecond + m / 10 });
  }
}

describe('Start', () => {
  test('meldet watchPosition an und wechselt in den Aufzeichnungsmodus', () => {
    assert.equal(tracker.getState().status, 'idle');
    assert.equal(gps.watcherCount(), 0);

    tracker.start();

    assert.equal(tracker.getState().status, 'tracking');
    assert.equal(gps.watcherCount(), 1);
  });

  test('zweimal Start ändert nichts', () => {
    tracker.start();
    tracker.start();
    assert.equal(gps.watcherCount(), 1);
  });

  test('vor dem ersten Fix ist die Genauigkeit unbekannt', () => {
    tracker.start();
    assert.equal(tracker.getState().lastAccuracyM, null);
    assert.equal(tracker.getState().distanceKm, 0);
  });
});

describe('Strecke', () => {
  test('summiert die gelaufenen Meter', () => {
    tracker.start();
    runMeters(1000);

    const state = tracker.getState();
    assert.ok(Math.abs(state.distanceKm - 1) < 0.001, `1 km erwartet, war ${state.distanceKm}`);
    assert.equal(state.pointCount, 101);
    assert.equal(state.rejectedCount, 0);
  });

  test('zählt ungenaue Punkte und Ausreißer als unbrauchbar', () => {
    tracker.start();
    gps.feed({ meters: 0, seconds: 0 });
    gps.feed({ meters: 10, accuracy: 90, seconds: 1 });
    gps.feed({ meters: 500, seconds: 2 });

    const state = tracker.getState();
    assert.equal(state.rejectedCount, 2);
    assert.equal(state.distanceKm, 0);
  });

  test('Zittern im Stand ist kein Fehler und wird getrennt gezählt', () => {
    tracker.start();
    gps.feed({ meters: 0, seconds: 0 });
    gps.feed({ meters: 2, seconds: 1 });
    gps.feed({ meters: 3, seconds: 2 });

    const state = tracker.getState();
    assert.equal(state.stillCount, 2);
    assert.equal(state.rejectedCount, 0, 'Jitter darf nicht als unbrauchbar erscheinen');
    assert.equal(state.distanceKm, 0);
  });

  test('die Genauigkeit des letzten Fixes wird gemeldet', () => {
    tracker.start();
    gps.feed({ meters: 0, accuracy: 12, seconds: 0 });
    assert.equal(tracker.getState().lastAccuracyM, 12);
  });
});

describe('Pause', () => {
  test('meldet watchPosition ab', () => {
    tracker.start();
    runMeters(100);
    tracker.pause();

    assert.equal(tracker.getState().status, 'paused');
    assert.equal(gps.watcherCount(), 0);
  });

  test('Strecke während der Pause zählt nicht mit', () => {
    tracker.start();
    runMeters(100);
    const vorPause = tracker.getState().distanceKm;

    tracker.pause();
    gps.feed({ meters: 2000, seconds: 200 }); // Autofahrt
    assert.equal(tracker.getState().distanceKm, vorPause);

    tracker.resume();
    assert.equal(tracker.getState().distanceKm, vorPause, 'Fortsetzen darf nichts nachtragen');
  });

  test('nach dem Fortsetzen wird ab dem neuen Standort weitergemessen', () => {
    tracker.start();
    runMeters(100);
    tracker.pause();
    tracker.resume();
    runMeters(100, { from: 3000, startSecond: 300 });

    const state = tracker.getState();
    assert.ok(
      Math.abs(state.distanceKm - 0.2) < 0.001,
      `200 m erwartet, war ${state.distanceKm} km – der Pausensprung wurde mitgezählt`
    );
  });

  test('Fortsetzen meldet watchPosition wieder an', () => {
    tracker.start();
    tracker.pause();
    tracker.resume();

    assert.equal(tracker.getState().status, 'tracking');
    assert.equal(gps.watcherCount(), 1);
  });

  test('Pause im Ruhezustand tut nichts', () => {
    tracker.pause();
    assert.equal(tracker.getState().status, 'idle');
  });
});

describe('Beenden', () => {
  test('liefert eine Zusammenfassung und setzt zurück', () => {
    tracker.start();
    runMeters(1500);

    const summary = tracker.stop();

    assert.ok(Math.abs(summary.distanceKm - 1.5) < 0.01, `1,5 km erwartet, war ${summary.distanceKm}`);
    assert.ok(summary.startedAt instanceof Date);
    assert.ok(summary.durationMinutes >= 0);
    assert.equal(summary.pointCount, 151);

    assert.equal(tracker.getState().status, 'idle');
    assert.equal(tracker.getState().distanceKm, 0);
    assert.equal(gps.watcherCount(), 0);
  });

  test('rundet die Distanz auf 10 Meter', () => {
    tracker.start();
    gps.feed({ meters: 0, seconds: 0 });
    gps.feed({ meters: 1234, seconds: 200 });

    const summary = tracker.stop();
    assert.equal(summary.distanceKm, Math.round(summary.distanceKm * 100) / 100);
  });

  test('Beenden ohne Start liefert nichts', () => {
    assert.equal(tracker.stop(), null);
  });

  test('Verwerfen liefert nichts und setzt zurück', () => {
    tracker.start();
    runMeters(500);
    tracker.discard();

    assert.equal(tracker.getState().status, 'idle');
    assert.equal(tracker.getState().distanceKm, 0);
    assert.equal(gps.watcherCount(), 0);
  });
});

describe('Fehler', () => {
  test('abgelehnter Standortzugriff bricht die Aufzeichnung ab', () => {
    const fehler = [];
    const t = createTracker({ onError: (message) => fehler.push(message) });

    t.start();
    gps.fail(1);

    assert.equal(t.getState().status, 'idle');
    assert.equal(gps.watcherCount(), 0);
    assert.match(fehler[0], /abgelehnt/i);
  });

  test('Timeout meldet, lässt die Aufzeichnung aber laufen', () => {
    const fehler = [];
    const t = createTracker({ onError: (message) => fehler.push(message) });

    t.start();
    gps.fail(3);

    assert.equal(t.getState().status, 'tracking');
    assert.equal(gps.watcherCount(), 1);
    assert.equal(fehler.length, 1);

    t.discard();
  });

  test('fehlendes Signal beendet die Aufzeichnung nicht', () => {
    const t = createTracker({});
    t.start();
    gps.fail(2);

    assert.equal(t.getState().status, 'tracking');
    t.discard();
  });
});

describe('Meldungen an die Anzeige', () => {
  test('jeder Zustandswechsel und jeder Punkt löst ein Update aus', () => {
    tracker.start();
    const nachStart = updates.length;

    gps.feed({ meters: 0, seconds: 0 });
    gps.feed({ meters: 10, seconds: 1 });

    assert.ok(updates.length > nachStart, 'Punkte müssen die Anzeige aktualisieren');
    assert.equal(updates.at(-1).status, 'tracking');
  });
});
