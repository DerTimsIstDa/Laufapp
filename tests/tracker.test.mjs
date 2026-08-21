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

describe('Kilometer-Splits', () => {
  /**
   * Die Uhr des Trackers ist `Date.now()`, nicht der Zeitstempel der
   * Position – gemessen wird, wie lange der Läufer unterwegs war, nicht was
   * das GPS-Gerät meldet. Für die Splits muss sie deshalb steuerbar sein.
   */
  let echteNow;
  let jetzt;

  const stelleUhr = (sekunden) => {
    jetzt = 1_700_000_000_000 + sekunden * 1000;
  };

  beforeEach(() => {
    echteNow = Date.now;
    stelleUhr(0);
    Date.now = () => jetzt;
  });

  afterEach(() => {
    Date.now = echteNow;
  });

  /**
   * Läuft bis `bisMeter`, wobei die Uhr auf `beiSekunde` steht.
   *
   * Die Marken liegen bewusst ein paar Meter **über** dem vollen Kilometer:
   * Der Umrechnungsfaktor der Attrappe (ein Grad ≈ 111,19 km) ist gerundet,
   * 1000 „Meter" ergeben in der Haversine-Rechnung 999,9. Genau auf der Marke
   * zu füttern hiesse, den Rundungsfehler der Attrappe zu prüfen statt den
   * Tracker.
   */
  const laufeBis = (bisMeter, beiSekunde) => {
    stelleUhr(beiSekunde);
    gps.feed({ meters: bisMeter, seconds: beiSekunde });
  };

  test('ohne vollen Kilometer bleibt die Liste leer', () => {
    tracker.start();
    laufeBis(0, 0);
    laufeBis(990, 300);

    assert.deepEqual(tracker.getState().splits, []);
  });

  test('jeder volle Kilometer bekommt seine Sekunden', () => {
    tracker.start();
    laufeBis(0, 0);
    laufeBis(1010, 300); // erster km in 5:00
    assert.deepEqual(tracker.getState().splits, [300]);

    laufeBis(2010, 660); // zweiter km in 6:00
    assert.deepEqual(tracker.getState().splits, [300, 360]);
  });

  test('gemessen wird von Übergang zu Übergang, nicht ab dem Start', () => {
    // Sonst schleppte ein langsamer erster Kilometer alle folgenden mit.
    tracker.start();
    laufeBis(0, 0);
    laufeBis(1010, 600); // erster km sehr langsam
    laufeBis(2010, 900); // zweiter km in 5:00

    assert.deepEqual(tracker.getState().splits, [600, 300]);
  });

  test('ein Sprung über mehrere Kilometer hinterlässt keine Lücke', () => {
    // Fehlten Einträge, verschöben sich alle folgenden Nummern: der dritte
    // Kilometer stünde an zweiter Stelle.
    tracker.start();
    laufeBis(0, 0);
    laufeBis(3400, 900); // Tunnel: drei Kilometer auf einmal, 15 Minuten

    assert.deepEqual(tracker.getState().splits, [300, 300, 300]);
  });

  test('das Ergebnis enthält die Splits', () => {
    tracker.start();
    laufeBis(0, 0);
    laufeBis(2010, 620);

    assert.deepEqual(tracker.stop().splits, [310, 310]);
  });

  test('ein neuer Lauf fängt bei null an', () => {
    tracker.start();
    laufeBis(0, 0);
    laufeBis(1010, 300);
    tracker.stop();

    tracker.start();
    assert.deepEqual(tracker.getState().splits, []);
  });

  test('der Zustand gibt eine Kopie heraus', () => {
    // Sonst schriebe die Anzeige in die Messung hinein.
    tracker.start();
    laufeBis(0, 0);
    laufeBis(1010, 300);

    tracker.getState().splits.push(999);

    assert.deepEqual(tracker.getState().splits, [300]);
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

describe('Aufgezeichnete Strecke', () => {
  test('nur angenommene Punkte landen in der Strecke', () => {
    tracker.start();
    gps.feed({ meters: 0, seconds: 0 });
    gps.feed({ meters: 10, accuracy: 90, seconds: 1 }); // ungenau
    gps.feed({ meters: 2, seconds: 2 }); // Jitter
    gps.feed({ meters: 10, seconds: 3 });

    const summary = tracker.stop();

    assert.equal(summary.track.length, 2);
    for (const point of summary.track) {
      assert.ok(Number.isFinite(point.lat) && Number.isFinite(point.lon));
    }
  });

  test('die Punkte stehen in der gelaufenen Reihenfolge', () => {
    tracker.start();
    runMeters(50);
    const summary = tracker.stop();

    for (let i = 1; i < summary.track.length; i++) {
      assert.ok(
        summary.track[i].lat > summary.track[i - 1].lat,
        `Punkt ${i} liegt nicht nördlicher als sein Vorgänger`
      );
    }
  });

  test('eine Pause hinterlässt eine Lücke, keine Luftlinie durch die Pause', () => {
    tracker.start();
    runMeters(20);
    const vorPause = tracker.getState().pointCount;

    tracker.pause();
    gps.feed({ meters: 5000, seconds: 300 }); // Transport
    tracker.resume();
    runMeters(20, { from: 6000, startSecond: 400 });

    const summary = tracker.stop();
    assert.equal(summary.track.length, vorPause * 2, 'nur die gelaufenen Punkte');
    assert.equal(
      summary.track.some((point) => Math.abs(point.lat - (52.5 + 5000 * 0.000008993)) < 1e-9),
      false,
      'der Transportpunkt darf nicht in der Strecke stehen'
    );
  });

  test('ein neuer Start beginnt mit leerer Strecke', () => {
    tracker.start();
    runMeters(50);
    tracker.stop();

    tracker.start();
    assert.deepEqual(tracker.getState().pointCount, 0);
    gps.feed({ meters: 0, seconds: 0 });
    assert.equal(tracker.stop().track.length, 1);
  });

  test('ohne Signal bleibt die Strecke leer', () => {
    tracker.start();
    const summary = tracker.stop();
    assert.deepEqual(summary.track, []);
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
