import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTrack,
  hasDrawableRoute,
  projectTrack,
  thinTrack,
  toStorageTrack,
  MIN_POINTS,
  DEFAULT_VIEWPORT,
} from '../js/route.js';

const VIEWPORT = { width: 320, height: 200, padding: 20 };

/** Innerhalb der Zeichenfläche inklusive Rand? */
function assertInside(point, viewport, label) {
  assert.ok(
    point.x >= viewport.padding - 1e-9 && point.x <= viewport.width - viewport.padding + 1e-9,
    `${label}: x=${point.x} liegt außerhalb`
  );
  assert.ok(
    point.y >= viewport.padding - 1e-9 && point.y <= viewport.height - viewport.padding + 1e-9,
    `${label}: y=${point.y} liegt außerhalb`
  );
}

describe('normalizeTrack', () => {
  test('nimmt Paare und Objekte', () => {
    assert.deepEqual(normalizeTrack([[52.5, 13.4]]), [{ lat: 52.5, lon: 13.4 }]);
    assert.deepEqual(normalizeTrack([{ lat: 52.5, lon: 13.4 }]), [{ lat: 52.5, lon: 13.4 }]);
  });

  test('wirft unbrauchbare Punkte weg statt NaN weiterzureichen', () => {
    const track = [
      [52.5, 13.4],
      [NaN, 13.4],
      [52.5, null],
      ['52.5', '13.4'],
      [91, 13.4],
      [52.5, 181],
      null,
      undefined,
      {},
      [52.6, 13.5],
    ];

    assert.deepEqual(normalizeTrack(track), [
      { lat: 52.5, lon: 13.4 },
      { lat: 52.6, lon: 13.5 },
    ]);
  });

  test('Randwerte der Koordinaten sind erlaubt', () => {
    assert.equal(normalizeTrack([[90, 180], [-90, -180], [0, 0]]).length, 3);
  });

  test('Nicht-Listen ergeben eine leere Strecke', () => {
    for (const value of [null, undefined, 'text', 42, {}]) {
      assert.deepEqual(normalizeTrack(value), []);
    }
  });
});

describe('hasDrawableRoute', () => {
  test('braucht mindestens zwei brauchbare Punkte', () => {
    assert.equal(MIN_POINTS, 2);
    assert.equal(hasDrawableRoute([]), false);
    assert.equal(hasDrawableRoute([[52.5, 13.4]]), false);
    assert.equal(hasDrawableRoute([[52.5, 13.4], [52.6, 13.5]]), true);
  });

  test('kaputte Punkte zählen nicht mit', () => {
    assert.equal(hasDrawableRoute([[52.5, 13.4], [NaN, NaN]]), false);
  });

  test('manuell eingetragene Läufe haben gar keine Strecke', () => {
    assert.equal(hasDrawableRoute(undefined), false);
  });
});

describe('projectTrack – Randfälle', () => {
  test('ohne Punkte gibt es nichts zu projizieren', () => {
    assert.equal(projectTrack([], VIEWPORT), null);
    assert.equal(projectTrack(null, VIEWPORT), null);
    assert.equal(projectTrack([[NaN, NaN]], VIEWPORT), null);
  });

  test('ein einziger Punkt landet in der Mitte', () => {
    const result = projectTrack([[52.5, 13.4]], VIEWPORT);

    assert.equal(result.pointCount, 1);
    assert.equal(result.points[0].x, VIEWPORT.width / 2);
    assert.equal(result.points[0].y, VIEWPORT.height / 2);
    assert.equal(result.scale, 0, 'ohne Ausdehnung gibt es nichts zu skalieren');
    assert.deepEqual(result.start, result.end);
  });

  test('lauter identische Punkte verhalten sich wie ein einziger', () => {
    const result = projectTrack([[52.5, 13.4], [52.5, 13.4], [52.5, 13.4]], VIEWPORT);

    assert.equal(result.pointCount, 3);
    for (const point of result.points) {
      assert.equal(point.x, VIEWPORT.width / 2);
      assert.equal(point.y, VIEWPORT.height / 2);
    }
  });
});

describe('projectTrack – Punkte auf einer Geraden', () => {
  test('reine Ost-West-Linie füllt die Breite und sitzt mittig', () => {
    const track = [[52.5, 13.40], [52.5, 13.41], [52.5, 13.42]];
    const result = projectTrack(track, VIEWPORT);

    assert.equal(result.points[0].x, VIEWPORT.padding);
    assert.equal(result.points.at(-1).x, VIEWPORT.width - VIEWPORT.padding);

    for (const point of result.points) {
      assert.equal(point.y, VIEWPORT.height / 2, 'ohne Nord-Süd-Ausdehnung mittig');
    }
  });

  test('reine Nord-Süd-Linie füllt die Höhe und sitzt mittig', () => {
    const track = [[52.50, 13.4], [52.51, 13.4], [52.52, 13.4]];
    const result = projectTrack(track, VIEWPORT);

    assert.equal(result.points[0].y, VIEWPORT.height - VIEWPORT.padding, 'Norden oben');
    assert.equal(result.points.at(-1).y, VIEWPORT.padding);

    for (const point of result.points) {
      assert.equal(point.x, VIEWPORT.width / 2);
    }
  });

  test('Zwischenpunkte einer Geraden bleiben auf der Geraden', () => {
    const track = [[52.50, 13.40], [52.51, 13.41], [52.52, 13.42]];
    const [a, b, c] = projectTrack(track, VIEWPORT).points;

    // Kreuzprodukt der Richtungsvektoren muss 0 sein
    const kreuz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    assert.ok(Math.abs(kreuz) < 1e-6, `Punkte nicht kollinear, Kreuzprodukt ${kreuz}`);
  });
});

describe('projectTrack – Norden oben', () => {
  test('ein nördlicherer Punkt bekommt ein kleineres y', () => {
    const result = projectTrack([[52.50, 13.4], [52.52, 13.4]], VIEWPORT);
    assert.ok(result.points[1].y < result.points[0].y);
  });

  test('ein östlicherer Punkt bekommt ein größeres x', () => {
    const result = projectTrack([[52.5, 13.40], [52.5, 13.42]], VIEWPORT);
    assert.ok(result.points[1].x > result.points[0].x);
  });
});

describe('projectTrack – Seitenverhältnis', () => {
  test('ein Quadrat auf der Erde bleibt ein Quadrat auf dem Schirm', () => {
    // Auf 52,5° Nord ist ein Längengrad etwa cos(52,5) so lang wie ein
    // Breitengrad. Ein "quadratischer" Kasten braucht also mehr Längengrade.
    const latSpan = 0.01;
    const lonSpan = latSpan / Math.cos((52.5 * Math.PI) / 180);
    const track = [
      [52.5, 13.4],
      [52.5 + latSpan, 13.4],
      [52.5 + latSpan, 13.4 + lonSpan],
      [52.5, 13.4 + lonSpan],
      [52.5, 13.4],
    ];

    const result = projectTrack(track, VIEWPORT);
    const xs = result.points.map((p) => p.x);
    const ys = result.points.map((p) => p.y);
    const breite = Math.max(...xs) - Math.min(...xs);
    const hoehe = Math.max(...ys) - Math.min(...ys);

    assert.ok(
      Math.abs(breite - hoehe) < 0.5,
      `Quadrat verzerrt: ${breite.toFixed(2)} breit, ${hoehe.toFixed(2)} hoch`
    );
  });

  test('eine breite Strecke wird nicht in die Höhe gezogen', () => {
    // 4x so breit wie hoch – darf die Höhe nicht ausfüllen
    const track = [[52.5, 13.40], [52.5001, 13.44]];
    const result = projectTrack(track, VIEWPORT);
    const hoehe = Math.abs(result.points[1].y - result.points[0].y);

    assert.ok(hoehe < 20, `Strecke gedehnt, Höhe ${hoehe}`);
  });

  test('beide Achsen benutzen dieselbe Skala', () => {
    const track = [[52.50, 13.40], [52.52, 13.45]];
    const result = projectTrack(track, VIEWPORT);

    const lonScale = Math.cos((52.51 * Math.PI) / 180);
    const gradX = Math.abs(0.05 * lonScale);
    const gradY = Math.abs(0.02);
    const pixelX = Math.abs(result.points[1].x - result.points[0].x);
    const pixelY = Math.abs(result.points[1].y - result.points[0].y);

    assert.ok(
      Math.abs(pixelX / gradX - pixelY / gradY) < 0.5,
      'unterschiedliche Skalen je Achse'
    );
  });
});

describe('projectTrack – Zeichenfläche', () => {
  const track = [
    [52.50, 13.40],
    [52.51, 13.42],
    [52.515, 13.405],
    [52.505, 13.395],
  ];

  test('kein Punkt verlässt die Fläche', () => {
    for (const viewport of [
      VIEWPORT,
      { width: 100, height: 400, padding: 5 },
      { width: 600, height: 80, padding: 0 },
      { width: 40, height: 40, padding: 15 },
    ]) {
      const result = projectTrack(track, viewport);
      const full = { ...DEFAULT_VIEWPORT, ...viewport };
      result.points.forEach((point, index) => assertInside(point, full, `Punkt ${index}`));
    }
  });

  test('die Strecke berührt mindestens eine Kante – sie wird ausgefüllt', () => {
    const result = projectTrack(track, VIEWPORT);
    const xs = result.points.map((p) => p.x);
    const ys = result.points.map((p) => p.y);

    const fuelltBreite = Math.abs(Math.min(...xs) - VIEWPORT.padding) < 1e-6;
    const fuelltHoehe = Math.abs(Math.min(...ys) - VIEWPORT.padding) < 1e-6;

    assert.ok(fuelltBreite || fuelltHoehe, 'Strecke nutzt die Fläche nicht aus');
  });

  test('Voreinstellungen greifen, wenn nichts übergeben wird', () => {
    const result = projectTrack(track);
    assert.equal(result.width, DEFAULT_VIEWPORT.width);
    assert.equal(result.height, DEFAULT_VIEWPORT.height);
  });

  test('Start und Ende zeigen auf den ersten und letzten Punkt', () => {
    const result = projectTrack(track, VIEWPORT);
    assert.deepEqual(result.start, result.points[0]);
    assert.deepEqual(result.end, result.points.at(-1));
  });

  test('eine Rundstrecke hat Start und Ende am selben Fleck', () => {
    const rund = [...track, track[0]];
    const result = projectTrack(rund, VIEWPORT);
    assert.deepEqual(result.start, result.end);
  });

  test('kaputte Punkte werden vor der Projektion aussortiert', () => {
    const result = projectTrack([[52.5, 13.4], [NaN, 13.4], [52.6, 13.5]], VIEWPORT);

    assert.equal(result.pointCount, 2);
    for (const point of result.points) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    }
  });
});

describe('thinTrack', () => {
  const lang = Array.from({ length: 2000 }, (_, i) => [52.5 + i * 0.0001, 13.4]);

  test('kurze Strecken bleiben unangetastet', () => {
    const kurz = [[52.5, 13.4], [52.6, 13.5]];
    assert.deepEqual(thinTrack(kurz, 500), normalizeTrack(kurz));
  });

  test('lange Strecken werden auf die Obergrenze gekürzt', () => {
    assert.equal(thinTrack(lang, 500).length, 500);
    assert.equal(thinTrack(lang, 10).length, 10);
  });

  test('Anfang und Ende bleiben erhalten', () => {
    const thinned = thinTrack(lang, 50);
    assert.deepEqual(thinned[0], { lat: 52.5, lon: 13.4 });
    assert.deepEqual(thinned.at(-1), normalizeTrack(lang).at(-1));
  });

  test('die Reihenfolge bleibt erhalten', () => {
    const thinned = thinTrack(lang, 100);
    for (let i = 1; i < thinned.length; i++) {
      assert.ok(thinned[i].lat > thinned[i - 1].lat, `Punkt ${i} springt zurück`);
    }
  });

  test('unsinnige Obergrenzen brechen nichts', () => {
    assert.equal(thinTrack(lang, 0).length, 1);
    assert.deepEqual(thinTrack([], 0), []);
  });
});

describe('toStorageTrack', () => {
  test('kompakte Paare mit fünf Nachkommastellen', () => {
    const gespeichert = toStorageTrack([{ lat: 52.5123456, lon: 13.4098765 }]);
    assert.deepEqual(gespeichert, [[52.51235, 13.40988]]);
  });

  test('bleibt unter der Obergrenze', () => {
    const lang = Array.from({ length: 3000 }, (_, i) => [52.5 + i * 0.0001, 13.4]);
    assert.equal(toStorageTrack(lang, 500).length, 500);
  });

  test('lässt sich direkt wieder projizieren', () => {
    const original = [[52.50, 13.40], [52.51, 13.41], [52.52, 13.42]];
    const result = projectTrack(toStorageTrack(original), VIEWPORT);

    assert.equal(result.pointCount, 3);
  });

  test('fünf Nachkommastellen kosten weniger als einen Meter Genauigkeit', () => {
    const [[lat]] = toStorageTrack([[52.5123456, 13.4]]);
    const abweichungGrad = Math.abs(lat - 52.5123456);
    assert.ok(abweichungGrad * 111_190 < 1, 'Rundung verschiebt um mehr als einen Meter');
  });
});
