import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildStats, distanceByWeek, distanceByMonth, localIsoDate } from '../js/stats.js';
import { makeRun, day } from './helpers.mjs';

/** Bezugstag für "aktuelle Serie" – makeRun(0) ist der 01.01.2026. */
const HEUTE = (offset) => day(offset);

describe('Leere und einzelne Historie', () => {
  test('ohne Läufe ist alles null oder 0', () => {
    const stats = buildStats([], { todayIso: HEUTE(0) });

    assert.equal(stats.runCount, 0);
    assert.equal(stats.totalDistanceKm, 0);
    assert.equal(stats.averageDistanceKm, 0, 'keine Division durch 0');
    assert.equal(stats.longestRun, null);
    assert.equal(stats.firstRun, null);
    assert.equal(stats.lastRun, null);
    assert.equal(stats.currentDayStreak, 0);
    assert.equal(stats.longestDayStreak, 0);
    assert.equal(stats.currentWeekStreak, 0);
    assert.equal(stats.longestWeekStreak, 0);
    assert.equal(stats.activeDays, 0);
  });

  test('kaputte Eingaben werfen nicht', () => {
    for (const value of [null, undefined, 'text', 42, {}]) {
      assert.doesNotThrow(() => buildStats(value, { todayIso: HEUTE(0) }));
      assert.equal(buildStats(value, { todayIso: HEUTE(0) }).runCount, 0);
    }
  });

  test('ein einziger Lauf', () => {
    const stats = buildStats([makeRun(0, 7.5)], { todayIso: HEUTE(0) });

    assert.equal(stats.runCount, 1);
    assert.equal(stats.totalDistanceKm, 7.5);
    assert.equal(stats.averageDistanceKm, 7.5, 'Durchschnitt = der eine Lauf');
    assert.deepEqual(stats.longestRun, { distanceKm: 7.5, date: day(0) });
    assert.equal(stats.firstRun.date, stats.lastRun.date);
    assert.equal(stats.currentDayStreak, 1);
    assert.equal(stats.longestDayStreak, 1);
    assert.equal(stats.activeDays, 1);
  });
});

describe('Summen und Durchschnitt', () => {
  const runs = [makeRun(0, 5), makeRun(1, 10), makeRun(2, 3)];

  test('Gesamtdistanz und Anzahl', () => {
    const stats = buildStats(runs, { todayIso: HEUTE(2) });
    assert.equal(stats.totalDistanceKm, 18);
    assert.equal(stats.runCount, 3);
  });

  test('Durchschnitt wird nicht gerundet – das macht die Anzeige', () => {
    const stats = buildStats(runs, { todayIso: HEUTE(2) });
    assert.equal(stats.averageDistanceKm, 6);

    const krumm = buildStats([makeRun(0, 5), makeRun(1, 5), makeRun(2, 5)], { todayIso: HEUTE(2) });
    assert.equal(krumm.averageDistanceKm, 5);
  });

  test('Kommazahlen summieren sich sauber genug', () => {
    const stats = buildStats([makeRun(0, 0.1), makeRun(1, 0.2)], { todayIso: HEUTE(1) });
    assert.ok(Math.abs(stats.totalDistanceKm - 0.3) < 1e-9);
  });
});

describe('Längster Lauf', () => {
  test('findet das Maximum samt Datum', () => {
    const runs = [makeRun(0, 5), makeRun(5, 21.1), makeRun(9, 12)];
    assert.deepEqual(buildStats(runs, { todayIso: HEUTE(9) }).longestRun, {
      distanceKm: 21.1,
      date: day(5),
    });
  });

  test('bei Gleichstand gewinnt der frühere Lauf', () => {
    const runs = [makeRun(3, 10), makeRun(7, 10)];
    assert.equal(buildStats(runs, { todayIso: HEUTE(7) }).longestRun.date, day(3));
  });

  test('unabhängig von der Reihenfolge in der Liste', () => {
    const runs = [makeRun(9, 12), makeRun(0, 5), makeRun(5, 21.1)];
    assert.equal(buildStats(runs, { todayIso: HEUTE(9) }).longestRun.distanceKm, 21.1);
  });
});

describe('Tages-Serie', () => {
  const streakRuns = (count, from = 0) =>
    Array.from({ length: count }, (_, i) => makeRun(from + i, 3));

  test('läuft heute weiter', () => {
    const stats = buildStats(streakRuns(5), { todayIso: HEUTE(4) });
    assert.equal(stats.currentDayStreak, 5);
    assert.equal(stats.longestDayStreak, 5);
  });

  test('überlebt einen Tag Pause – gestern gelaufen zählt noch', () => {
    const stats = buildStats(streakRuns(5), { todayIso: HEUTE(5) });
    assert.equal(stats.currentDayStreak, 5);
  });

  test('zwei Tage Pause beenden sie', () => {
    const stats = buildStats(streakRuns(5), { todayIso: HEUTE(6) });
    assert.equal(stats.currentDayStreak, 0);
    assert.equal(stats.longestDayStreak, 5, 'die längste bleibt erhalten');
  });

  test('eine Lücke zerreißt die Serie', () => {
    // Tage 0,1,2 dann Lücke bei 3, dann 4,5
    const runs = [0, 1, 2, 4, 5].map((d) => makeRun(d, 3));
    const stats = buildStats(runs, { todayIso: HEUTE(5) });

    assert.equal(stats.longestDayStreak, 3);
    assert.equal(stats.currentDayStreak, 2, 'nur die Tage nach der Lücke');
  });

  test('die längste Serie muss nicht die aktuelle sein', () => {
    const runs = [...[0, 1, 2, 3, 4, 5, 6], 20, 21].map((d) => makeRun(d, 3));
    const stats = buildStats(runs, { todayIso: HEUTE(21) });

    assert.equal(stats.longestDayStreak, 7);
    assert.equal(stats.currentDayStreak, 2);
  });

  test('mehrere Läufe am selben Tag zählen als ein Tag', () => {
    const runs = [makeRun(0, 3), makeRun(0, 4), makeRun(0, 5), makeRun(1, 3)];
    const stats = buildStats(runs, { todayIso: HEUTE(1) });

    assert.equal(stats.currentDayStreak, 2);
    assert.equal(stats.activeDays, 2);
    assert.equal(stats.runCount, 4);
  });

  test('Läufe in der Zukunft ergeben keine laufende Serie', () => {
    const stats = buildStats([makeRun(10, 5)], { todayIso: HEUTE(0) });
    assert.equal(stats.currentDayStreak, 0);
    assert.equal(stats.longestDayStreak, 1);
  });
});

describe('Wochen-Serie', () => {
  test('vier Wochen hintereinander', () => {
    // day(0) ist der 01.01.2026, ein Donnerstag – je ein Lauf pro Woche
    const runs = [0, 7, 14, 21].map((d) => makeRun(d, 5));
    const stats = buildStats(runs, { todayIso: HEUTE(21) });

    assert.equal(stats.currentWeekStreak, 4);
    assert.equal(stats.longestWeekStreak, 4);
  });

  test('eine ausgelassene Woche zerreißt sie', () => {
    const runs = [0, 7, 21, 28].map((d) => makeRun(d, 5));
    const stats = buildStats(runs, { todayIso: HEUTE(28) });

    assert.equal(stats.longestWeekStreak, 2);
    assert.equal(stats.currentWeekStreak, 2);
  });

  test('mehrere Läufe in derselben Woche zählen einmal', () => {
    const runs = [0, 1, 2].map((d) => makeRun(d, 5));
    assert.equal(buildStats(runs, { todayIso: HEUTE(2) }).longestWeekStreak, 1);
  });

  test('die Vorwoche hält die Serie noch am Leben', () => {
    const runs = [0, 7].map((d) => makeRun(d, 5));
    assert.equal(buildStats(runs, { todayIso: HEUTE(14) }).currentWeekStreak, 2);
    assert.equal(buildStats(runs, { todayIso: HEUTE(21) }).currentWeekStreak, 0);
  });
});

describe('Distanz pro Woche', () => {
  test('summiert je Woche und füllt Lücken mit 0', () => {
    // Woche 1: Tag 0; Woche 2 ausgelassen; Woche 3: Tag 14
    const runs = [makeRun(0, 5), makeRun(14, 8)];
    const wochen = distanceByWeek(runs, { todayIso: HEUTE(14), limit: 12 });

    assert.equal(wochen.length, 3);
    assert.deepEqual(wochen.map((w) => w.distanceKm), [5, 0, 8]);
    assert.deepEqual(wochen.map((w) => w.runCount), [1, 0, 1]);
  });

  test('läuft bis zur aktuellen Woche, auch ohne Lauf darin', () => {
    const wochen = distanceByWeek([makeRun(0, 5)], { todayIso: HEUTE(21) });

    assert.equal(wochen.length, 4);
    assert.equal(wochen.at(-1).distanceKm, 0, 'diese Woche noch nichts gelaufen');
  });

  test('begrenzt auf die letzten n Wochen', () => {
    const runs = Array.from({ length: 30 }, (_, i) => makeRun(i * 7, 5));
    const wochen = distanceByWeek(runs, { todayIso: HEUTE(29 * 7), limit: 8 });

    assert.equal(wochen.length, 8);
    assert.equal(wochen.at(-1).distanceKm, 5);
  });

  test('jede Woche beginnt an einem Montag', () => {
    const wochen = distanceByWeek([makeRun(0, 5), makeRun(14, 8)], { todayIso: HEUTE(14) });

    for (const woche of wochen) {
      const wochentag = new Date(`${woche.start}T00:00:00Z`).getUTCDay();
      assert.equal(wochentag, 1, `${woche.start} ist kein Montag`);
    }
  });

  test('liefert die Kalenderwoche mit', () => {
    // 01.01.2026 ist ein Donnerstag und liegt in KW 1
    const [erste] = distanceByWeek([makeRun(0, 5)], { todayIso: HEUTE(0) });
    assert.equal(erste.isoWeek, 1);
    assert.equal(erste.isoYear, 2026);
  });

  test('ohne Läufe bleibt die Liste leer', () => {
    assert.deepEqual(distanceByWeek([], { todayIso: HEUTE(0) }), []);
  });
});

describe('Distanz pro Monat', () => {
  test('summiert je Monat und füllt Lücken', () => {
    const runs = [
      { id: 'a', date: '2026-01-15', distanceKm: 10 },
      { id: 'b', date: '2026-01-20', distanceKm: 5 },
      { id: 'c', date: '2026-03-02', distanceKm: 7 },
    ];
    const monate = distanceByMonth(runs, { todayIso: '2026-03-10' });

    assert.deepEqual(monate.map((m) => m.month), ['2026-01', '2026-02', '2026-03']);
    assert.deepEqual(monate.map((m) => m.distanceKm), [15, 0, 7]);
  });

  test('über den Jahreswechsel', () => {
    const runs = [
      { id: 'a', date: '2025-12-20', distanceKm: 4 },
      { id: 'b', date: '2026-01-05', distanceKm: 6 },
    ];
    const monate = distanceByMonth(runs, { todayIso: '2026-01-31' });

    assert.deepEqual(monate.map((m) => m.month), ['2025-12', '2026-01']);
    assert.deepEqual(monate.map((m) => m.distanceKm), [4, 6]);
  });

  test('ohne Läufe bleibt die Liste leer', () => {
    assert.deepEqual(distanceByMonth([], { todayIso: '2026-01-01' }), []);
  });
});

describe('localIsoDate', () => {
  test('nimmt die lokale Zeit, nicht UTC', () => {
    // 1. Januar 2026, 00:30 Ortszeit – in UTC wäre es je nach Zone der 31.12.
    assert.equal(localIsoDate(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
    assert.equal(localIsoDate(new Date(2026, 11, 31, 23, 30)), '2026-12-31');
  });
});
