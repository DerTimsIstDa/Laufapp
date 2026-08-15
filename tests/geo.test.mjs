import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  haversineKm,
  evaluateSegment,
  reduceTrack,
  paceMinPerKm,
  runPaceMinPerKm,
  formatDuration,
  formatPace,
} from '../js/geo.js';
import { pointNorth } from './helpers.mjs';

/** assert.ok mit lesbarer Meldung für Fließkomma-Vergleiche. */
function near(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} weicht von ${expected} um mehr als ${tolerance} ab`
  );
}

describe('Haversine', () => {
  const berlin = { lat: 52.52, lon: 13.405 };
  const hamburg = { lat: 53.5511, lon: 9.9937 };
  const muenchen = { lat: 48.1351, lon: 11.582 };

  test('bekannte Strecken', () => {
    near(haversineKm(berlin, hamburg), 255, 3, 'Berlin–Hamburg');
    near(haversineKm(berlin, muenchen), 504, 4, 'Berlin–München');
  });

  test('gleicher Punkt ist 0 und die Richtung egal', () => {
    assert.equal(haversineKm(berlin, berlin), 0);
    near(haversineKm(berlin, hamburg) - haversineKm(hamburg, berlin), 0, 1e-9, 'symmetrisch');
  });

  test('Gradabstände', () => {
    near(haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }), 111.19, 0.05, '1° Breite');
    near(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }), 111.19, 0.05, '1° Länge am Äquator');
    near(haversineKm({ lat: 60, lon: 0 }, { lat: 60, lon: 1 }), 55.6, 0.1, '1° Länge bei 60°N');
  });

  test('Datumsgrenze nimmt keinen Umweg um die Erde', () => {
    near(
      haversineKm({ lat: 0, lon: 179.99 }, { lat: 0, lon: -179.99 }),
      2.22,
      0.05,
      'über 180°'
    );
  });

  test('Testhilfe erzeugt tatsächlich 10-Meter-Schritte', () => {
    near(haversineKm(pointNorth(0), pointNorth(10)) * 1000, 10, 0.05, '10 m');
  });
});

describe('evaluateSegment – Genauigkeit', () => {
  test('erster Punkt zählt 0 km, wird aber Bezugspunkt', () => {
    const result = evaluateSegment(null, pointNorth(0));
    assert.equal(result.accepted, true);
    assert.equal(result.distanceKm, 0);
  });

  test('30 m Genauigkeit ist die Grenze', () => {
    assert.equal(evaluateSegment(null, pointNorth(0, { accuracy: 30 })).accepted, true);
    assert.equal(evaluateSegment(null, pointNorth(0, { accuracy: 31 })).accepted, false);
  });

  test('zu ungenau wird verworfen', () => {
    assert.deepEqual(evaluateSegment(null, pointNorth(0, { accuracy: 50 })), {
      accepted: false,
      reason: 'ungenau',
      distanceKm: 0,
    });
  });

  test('fehlende Genauigkeit gilt als unbrauchbar', () => {
    const result = evaluateSegment(null, { lat: 52.5, lon: 13.4, timestamp: 1 });
    assert.equal(result.reason, 'ungenau');
  });

  test('auch ein Folgepunkt wird auf Genauigkeit geprüft', () => {
    const result = evaluateSegment(pointNorth(0), pointNorth(10, { accuracy: 99, seconds: 1 }));
    assert.equal(result.reason, 'ungenau');
  });
});

describe('evaluateSegment – Bewegung, Zeit, Tempo', () => {
  test('normaler Schritt wird übernommen', () => {
    assert.equal(evaluateSegment(pointNorth(0), pointNorth(10, { seconds: 1 })).accepted, true);
  });

  test('unter 5 m gilt als Zittern im Stand', () => {
    const result = evaluateSegment(pointNorth(0), pointNorth(2, { seconds: 1 }));
    assert.equal(result.reason, 'jitter');
    assert.equal(result.distanceKm, 0);
  });

  test('rückwärts laufende oder stehende Zeit', () => {
    assert.equal(evaluateSegment(pointNorth(0, { seconds: 5 }), pointNorth(10)).reason, 'zeitsprung');
    assert.equal(evaluateSegment(pointNorth(0), pointNorth(10)).reason, 'zeitsprung');
  });

  test('10 m/s ist die Grenze, darüber ist es ein Ausreißer', () => {
    assert.equal(evaluateSegment(pointNorth(0), pointNorth(10, { seconds: 1 })).accepted, true);
    assert.equal(evaluateSegment(pointNorth(0), pointNorth(11, { seconds: 1 })).reason, 'sprung');
  });

  test('Teleport über 100 m in einer Sekunde', () => {
    assert.equal(evaluateSegment(pointNorth(0), pointNorth(100, { seconds: 1 })).reason, 'sprung');
  });
});

describe('reduceTrack', () => {
  test('saubere Strecke: 100 Schritte à 10 m ergeben 1 km', () => {
    const points = Array.from({ length: 101 }, (_, i) => pointNorth(i * 10, { seconds: i }));
    const result = reduceTrack(points);

    near(result.distanceKm, 1, 0.001, '1 km');
    assert.equal(result.accepted.length, 101);
    assert.equal(result.rejected.length, 0);
  });

  test('Störungen werden aussortiert, die echte Strecke bleibt', () => {
    const points = [
      pointNorth(0, { seconds: 0 }),
      pointNorth(0, { accuracy: 80, seconds: 1 }),
      pointNorth(10, { seconds: 2 }),
      pointNorth(11, { seconds: 3 }),
      pointNorth(20, { seconds: 4 }),
      { lat: 52.6, lon: 13.4, accuracy: 10, timestamp: 1_005_000 },
      pointNorth(30, { seconds: 6 }),
    ];
    const result = reduceTrack(points);

    near(result.distanceKm * 1000, 30, 0.2, 'nur die echten 30 m');
    assert.deepEqual(
      result.rejected.map((entry) => entry.reason),
      ['ungenau', 'jitter', 'sprung']
    );
  });

  test('ein Ausreißer reißt die Messkette nicht ab', () => {
    const points = [
      pointNorth(0, { seconds: 0 }),
      { lat: 52.6, lon: 13.4, accuracy: 10, timestamp: 1_001_000 },
      pointNorth(10, { seconds: 2 }),
    ];
    const result = reduceTrack(points);

    near(result.distanceKm * 1000, 10, 0.1, 'nach dem Ausreißer wird weitergemessen');
    assert.equal(result.accepted.length, 2);
  });

  test('Stillstand mit zitterndem GPS ergibt 0 km', () => {
    const points = Array.from({ length: 60 }, (_, i) => ({
      lat: 52.5 + (i % 2 === 0 ? 0.00001 : -0.00001),
      lon: 13.4 + (i % 3 === 0 ? 0.00001 : -0.00001),
      accuracy: 8,
      timestamp: 1_000_000 + i * 1000,
    }));

    assert.equal(reduceTrack(points).distanceKm, 0);
  });

  test('leere und einelementige Strecke', () => {
    assert.deepEqual(reduceTrack([]), { distanceKm: 0, accepted: [], rejected: [] });
    assert.equal(reduceTrack([pointNorth(0)]).distanceKm, 0);
  });

  test('langsamer Läufer: 2 m pro Sekunde bleibt exakt, obwohl viel gefiltert wird', () => {
    // Bei 1 Fix/Sekunde liegt ein Schritt unter der 5-m-Schwelle. Der
    // Bezugspunkt bleibt stehen, bis genug zusammengekommen ist – die
    // Gesamtstrecke darf darunter nicht leiden.
    const points = Array.from({ length: 1501 }, (_, i) => pointNorth(i * 2, { accuracy: 6, seconds: i }));
    const result = reduceTrack(points);

    near(result.distanceKm * 1000, 3000, 1, '3000 m trotz Filterung');
    assert.deepEqual(new Set(result.rejected.map((e) => e.reason)), new Set(['jitter']));
    assert.equal(result.accepted.length, 501, 'jeder dritte Punkt wird Bezugspunkt');
  });
});

describe('Pace', () => {
  test('ohne Strecke oder ohne Zeit gibt es keine Pace', () => {
    assert.equal(paceMinPerKm(0, 60_000), null);
    assert.equal(paceMinPerKm(1, 0), null);
  });

  test('5 km in 25 Minuten sind 5 min/km', () => {
    assert.equal(paceMinPerKm(5, 25 * 60_000), 5);
  });
});

describe('Formatierung', () => {
  test('Dauer', () => {
    assert.equal(formatDuration(0), '0:00');
    assert.equal(formatDuration(9_000), '0:09');
    assert.equal(formatDuration(90_000), '1:30');
    assert.equal(formatDuration(3_599_000), '59:59');
    assert.equal(formatDuration(3_600_000), '1:00:00');
    assert.equal(formatDuration(3_723_000), '1:02:03');
  });

  test('negative Dauer wird abgefangen', () => {
    assert.equal(formatDuration(-5000), '0:00');
  });

  test('Pace', () => {
    assert.equal(formatPace(5.5), '5:30');
    assert.equal(formatPace(null), '–');
    assert.equal(formatPace(Infinity), '–');
  });
});

describe('runPaceMinPerKm', () => {
  test('rechnet aus Distanz und Dauer', () => {
    assert.equal(runPaceMinPerKm({ distanceKm: 5, durationMinutes: 27.5 }), 5.5);
  });

  test('die eingetragene Pace sticht die Rechnung', () => {
    // Wer sie von der Uhr abtippt, hat sie genauer als zwei gerundete Zahlen.
    const run = { distanceKm: 5, durationMinutes: 28, paceMinPerKm: 5.5 };
    assert.equal(runPaceMinPerKm(run), 5.5);
  });

  test('eine eingetragene Pace reicht auch ohne Dauer', () => {
    assert.equal(runPaceMinPerKm({ distanceKm: 5, paceMinPerKm: 6 }), 6);
  });

  test('ohne beides gibt es keine Pace', () => {
    assert.equal(runPaceMinPerKm({ distanceKm: 5 }), null);
  });

  test('unbrauchbare Läufe ergeben null statt NaN', () => {
    for (const run of [null, undefined, {}, 'text', 42, { distanceKm: 0, durationMinutes: 30 }]) {
      assert.equal(runPaceMinPerKm(run), null, `${JSON.stringify(run)}`);
    }
  });

  test('kaputte Werte werden nicht durchgereicht', () => {
    assert.equal(runPaceMinPerKm({ distanceKm: 5, paceMinPerKm: 0 }), null);
    assert.equal(runPaceMinPerKm({ distanceKm: 5, durationMinutes: NaN }), null);
    assert.equal(runPaceMinPerKm({ distanceKm: NaN, durationMinutes: 30 }), null);
  });
});
