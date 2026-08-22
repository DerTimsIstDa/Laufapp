import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStats,
  distanceByWeek,
  distanceByMonth,
  runsInPeriod,
  localIsoDate,
  bestTimes,
  activityCalendar,
  paceTrend,
  PACE_TREND_MIN_POINTS,
  ACTIVITY_WEEKS,
  ACTIVITY_LEVELS,
  BEST_TIME_DISTANCES,
  BEST_TIME_TOLERANCE_KM,
} from '../js/stats.js';
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

/**
 * Welcher Balken grün ist (D1).
 *
 * Die Anzeige färbt genau einen Balken – den laufenden Zeitraum. Läge die
 * Entscheidung dort, hiesse sie "der letzte", und das ist fast immer richtig.
 * Diese Tests halten die beiden Fälle fest, in denen es das nicht ist.
 */
describe('Der laufende Zeitraum ist markiert', () => {
  test('genau eine Woche trägt isCurrent', () => {
    const wochen = distanceByWeek([makeRun(0, 5), makeRun(14, 8)], { todayIso: HEUTE(14) });

    assert.deepEqual(wochen.map((w) => w.isCurrent), [false, false, true]);
  });

  test('genau ein Monat trägt isCurrent', () => {
    const runs = [
      { id: 'a', date: '2026-01-15', distanceKm: 10 },
      { id: 'c', date: '2026-03-02', distanceKm: 7 },
    ];
    const monate = distanceByMonth(runs, { todayIso: '2026-03-10' });

    assert.deepEqual(monate.map((m) => m.isCurrent), [false, false, true]);
  });

  test('auch die laufende Woche ohne Lauf ist markiert', () => {
    const wochen = distanceByWeek([makeRun(0, 5)], { todayIso: HEUTE(21) });

    assert.equal(wochen.at(-1).distanceKm, 0);
    assert.equal(wochen.at(-1).isCurrent, true, 'leer heisst nicht "nicht jetzt"');
  });

  test('ein Lauf in der Zukunft bekommt die Markierung nicht', () => {
    // Genau der Fall, für den die Markierung mitgeführt wird statt "der
    // letzte Eimer": runsInPeriod() lässt vertippte Zukunftsläufe stehen,
    // also steht hier ein Balken hinter der laufenden Woche.
    const wochen = distanceByWeek([makeRun(0, 5), makeRun(21, 9)], { todayIso: HEUTE(7) });

    assert.equal(wochen.length, 4, 'die Zukunftswoche zählt mit');
    assert.deepEqual(wochen.map((w) => w.isCurrent), [false, true, false, false]);
    assert.equal(wochen.at(-1).distanceKm, 9, 'der Zukunftslauf steht am Ende');
  });

  test('dasselbe für Monate', () => {
    const runs = [
      { id: 'a', date: '2026-01-15', distanceKm: 10 },
      { id: 'b', date: '2026-04-02', distanceKm: 7 },
    ];
    const monate = distanceByMonth(runs, { todayIso: '2026-02-10' });

    assert.deepEqual(monate.map((m) => m.month), ['2026-01', '2026-02', '2026-03', '2026-04']);
    assert.deepEqual(monate.map((m) => m.isCurrent), [false, true, false, false]);
  });
});

describe('runsInPeriod', () => {
  /** Der 08.01.2026 ist ein Donnerstag; die Woche läuft vom 05. bis 11.01. */
  const DONNERSTAG = '2026-01-08';

  const runs = [
    { id: 'so', date: '2026-01-04', distanceKm: 1 }, // Sonntag davor
    { id: 'mo', date: '2026-01-05', distanceKm: 2 }, // Wochenanfang
    { id: 'do', date: '2026-01-08', distanceKm: 3 },
    { id: 'so2', date: '2026-01-11', distanceKm: 4 }, // Wochenende
    { id: 'mo2', date: '2026-01-12', distanceKm: 5 }, // nächste Woche
    { id: 'dez', date: '2025-12-30', distanceKm: 6 }, // Vormonat
  ];

  test('die Woche läuft von Montag bis Sonntag', () => {
    const ids = runsInPeriod(runs, { period: 'week', todayIso: DONNERSTAG }).map((r) => r.id);
    assert.deepEqual(ids, ['mo', 'do', 'so2']);
  });

  test('die Woche reicht über den Jahreswechsel', () => {
    // Sonntag, 04.01.2026 – die Woche begann am Montag, dem 29.12.2025.
    const ids = runsInPeriod(runs, { period: 'week', todayIso: '2026-01-04' }).map((r) => r.id);
    assert.deepEqual(ids, ['so', 'dez']);
  });

  test('der Monat nimmt alles aus demselben Kalendermonat', () => {
    const ids = runsInPeriod(runs, { period: 'month', todayIso: DONNERSTAG }).map((r) => r.id);
    assert.deepEqual(ids, ['so', 'mo', 'do', 'so2', 'mo2']);
  });

  test('gleicher Monat in einem anderen Jahr zählt nicht mit', () => {
    const jahre = [
      { id: 'alt', date: '2025-01-08', distanceKm: 1 },
      { id: 'neu', date: '2026-01-08', distanceKm: 1 },
    ];
    const ids = runsInPeriod(jahre, { period: 'month', todayIso: DONNERSTAG }).map((r) => r.id);
    assert.deepEqual(ids, ['neu']);
  });

  test('kaputte Eingaben werfen nicht', () => {
    for (const value of [null, undefined, 'text', 42, {}]) {
      assert.doesNotThrow(() => runsInPeriod(value, { period: 'week', todayIso: DONNERSTAG }));
      assert.deepEqual(runsInPeriod(value, { period: 'week', todayIso: DONNERSTAG }), []);
    }

    assert.deepEqual(
      runsInPeriod([null, { id: 'x' }, { id: 'y', date: 5 }], {
        period: 'week',
        todayIso: DONNERSTAG,
      }),
      []
    );
  });
});

describe('localIsoDate', () => {
  test('nimmt die lokale Zeit, nicht UTC', () => {
    // 1. Januar 2026, 00:30 Ortszeit – in UTC wäre es je nach Zone der 31.12.
    assert.equal(localIsoDate(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
    assert.equal(localIsoDate(new Date(2026, 11, 31, 23, 30)), '2026-12-31');
  });
});

describe('Durchschnitts-Pace', () => {
  test('ohne Pace-Angaben gibt es keine', () => {
    assert.equal(buildStats([]).averagePaceMinPerKm, null);
    assert.equal(buildStats([{ id: 'a', date: HEUTE(0), distanceKm: 5 }]).averagePaceMinPerKm, null);
  });

  test('rechnet aus Distanz und Dauer', () => {
    const runs = [{ id: 'a', date: HEUTE(0), distanceKm: 5, durationMinutes: 27.5 }];
    assert.equal(buildStats(runs).averagePaceMinPerKm, 5.5);
  });

  test('die eingetragene Pace zählt genauso', () => {
    const runs = [{ id: 'a', date: HEUTE(0), distanceKm: 5, paceMinPerKm: 6 }];
    assert.equal(buildStats(runs).averagePaceMinPerKm, 6);
  });

  test('gewichtet nach Strecke, nicht je Lauf', () => {
    // 2 km in 5:00 und 20 km in 6:00 – der lange Lauf muss schwerer wiegen.
    const runs = [
      { id: 'a', date: HEUTE(0), distanceKm: 2, paceMinPerKm: 5 },
      { id: 'b', date: HEUTE(1), distanceKm: 20, paceMinPerKm: 6 },
    ];

    const schlichterMittelwert = 5.5;
    const gewichtet = (2 * 5 + 20 * 6) / 22;

    assert.equal(buildStats(runs).averagePaceMinPerKm, gewichtet);
    assert.ok(gewichtet > schlichterMittelwert, 'näher an der langen Einheit');
  });

  test('Läufe ohne Pace ziehen den Schnitt nicht herunter', () => {
    const mitUndOhne = [
      { id: 'a', date: HEUTE(0), distanceKm: 5, paceMinPerKm: 5 },
      { id: 'b', date: HEUTE(1), distanceKm: 100 },
    ];

    assert.equal(buildStats(mitUndOhne).averagePaceMinPerKm, 5, 'nur der Lauf mit Pace zählt');
  });
});

describe('Bestzeiten je Distanz', () => {
  /** Kurz für einen Lauf mit Dauer. */
  const lauf = (dayOffset, distanceKm, durationMinutes) =>
    makeRun(dayOffset, distanceKm, { durationMinutes });

  /** Die Zeile zu einer Zielmarke. */
  const zu = (zeilen, targetKm) => zeilen.find((z) => z.targetKm === targetKm);

  test('führt genau die sechs Marken, immer in derselben Reihenfolge', () => {
    assert.deepEqual(BEST_TIME_DISTANCES, [5, 8, 10, 12, 15, 21.1]);
    assert.deepEqual(
      bestTimes([]).map((z) => z.targetKm),
      BEST_TIME_DISTANCES
    );
  });

  test('ohne Läufe steht jede Marke offen', () => {
    for (const zeile of bestTimes([])) {
      assert.equal(zeile.durationMinutes, null);
      assert.equal(zeile.date, null);
    }
  });

  test('nimmt die schnellste Zeit über die Distanz', () => {
    const zeilen = bestTimes([lauf(0, 5, 26), lauf(10, 5, 24.5), lauf(20, 5, 25)]);
    const fuenf = zu(zeilen, 5);

    assert.equal(fuenf.durationMinutes, 24.5);
    assert.equal(fuenf.date, day(10));
  });

  test('nicht die schnellste Pace irgendeines Laufs', () => {
    // Der 3-km-Lauf ist deutlich schneller unterwegs, ist aber keine 5-km-Zeit.
    const zeilen = bestTimes([lauf(0, 3, 12), lauf(1, 5, 26)]);

    assert.equal(zu(zeilen, 5).durationMinutes, 26);
  });

  test('knapp daneben zählt noch, deutlich daneben nicht', () => {
    assert.equal(BEST_TIME_TOLERANCE_KM, 0.1);

    const knapp = bestTimes([lauf(0, 5.05, 25)]);
    assert.equal(zu(knapp, 5).durationMinutes, 25);
    assert.equal(zu(knapp, 5).distanceKm, 5.05, 'die echte Strecke bleibt erhalten');

    const zuWeit = bestTimes([lauf(0, 5.3, 22)]);
    assert.equal(zu(zuWeit, 5).durationMinutes, null);
  });

  test('genau auf der Toleranzgrenze zählt noch', () => {
    assert.equal(zu(bestTimes([lauf(0, 5.1, 25)]), 5).durationMinutes, 25);
    assert.equal(zu(bestTimes([lauf(0, 4.9, 25)]), 5).durationMinutes, 25);
  });

  test('ein Lauf ohne Zeit bringt keine Bestzeit', () => {
    assert.equal(zu(bestTimes([makeRun(0, 10)]), 10).durationMinutes, null);
  });

  test('eine eingetragene Pace ergibt die Zeit, wenn die Dauer fehlt', () => {
    const zeilen = bestTimes([makeRun(0, 8, { paceMinPerKm: 5.25 })]);

    assert.equal(zu(zeilen, 8).durationMinutes, 42);
  });

  test('die gemessene Dauer schlägt eine eingetragene Pace', () => {
    // Die Pace kann von einer anderen Uhr stammen und auf eine andere Strecke
    // gerechnet sein; gelaufen ist, was auf der Uhr stand.
    const zeilen = bestTimes([makeRun(0, 10, { durationMinutes: 50, paceMinPerKm: 4 })]);

    assert.equal(zu(zeilen, 10).durationMinutes, 50);
  });

  test('bei gleicher Zeit gewinnt der frühere Lauf', () => {
    const zeilen = bestTimes([lauf(30, 10, 50), lauf(5, 10, 50)]);

    assert.equal(zu(zeilen, 10).date, day(5));
  });

  test('der Halbmarathon liegt auf 21,1 km', () => {
    const zeilen = bestTimes([lauf(0, 21.08, 118.5)]);

    assert.equal(zu(zeilen, 21.1).durationMinutes, 118.5);
    assert.equal(zu(zeilen, 15).durationMinutes, null, 'zählt nicht auch als 15 km');
  });

  test('kaputte Eingabe stürzt nicht ab', () => {
    assert.equal(bestTimes(null).length, BEST_TIME_DISTANCES.length);
    assert.equal(zu(bestTimes([null, {}, { distanceKm: 'fünf' }]), 5).durationMinutes, null);
  });
});

describe('Aktivitätsraster', () => {
  test('zeigt volle Wochen, montags beginnend', () => {
    // day(0) ist Donnerstag, der 01.01.2026 – die Woche davor beginnt am 29.12.
    const tage = activityCalendar([], { todayIso: HEUTE(0) });

    assert.equal(tage.length, ACTIVITY_WEEKS * 7);
    assert.equal(tage.at(-1).date, '2026-01-04', 'endet am Sonntag der laufenden Woche');
    assert.equal(new Date(`${tage[0].date}T00:00:00Z`).getUTCDay(), 1, 'beginnt an einem Montag');
  });

  test('die Tage sind lückenlos und aufsteigend', () => {
    const tage = activityCalendar([], { todayIso: HEUTE(0) });

    for (let i = 1; i < tage.length; i++) {
      const vorher = Date.parse(`${tage[i - 1].date}T00:00:00Z`);
      const jetzt = Date.parse(`${tage[i].date}T00:00:00Z`);
      assert.equal(jetzt - vorher, 86_400_000, `Lücke vor ${tage[i].date}`);
    }
  });

  test('summiert mehrere Läufe eines Tages', () => {
    const tage = activityCalendar([makeRun(0, 4), makeRun(0, 6.5)], { todayIso: HEUTE(0) });
    const tag = tage.find((t) => t.date === day(0));

    assert.equal(tag.runCount, 2);
    assert.equal(tag.distanceKm, 10.5);
    assert.equal(tag.level, 3, '10,5 km liegen über der 10-km-Grenze');
  });

  test('die Stufen folgen den Kilometergrenzen', () => {
    assert.deepEqual(ACTIVITY_LEVELS, [5, 10, 15]);

    const stufeVon = (km) => {
      const tage = activityCalendar([makeRun(0, km)], { todayIso: HEUTE(0) });
      return tage.find((t) => t.date === day(0)).level;
    };

    assert.equal(stufeVon(0.5), 1);
    assert.equal(stufeVon(4.99), 1);
    assert.equal(stufeVon(5), 2, 'genau auf der Grenze zählt zur höheren Stufe');
    assert.equal(stufeVon(9.99), 2);
    assert.equal(stufeVon(10), 3);
    assert.equal(stufeVon(15), 4);
    assert.equal(stufeVon(42.2), 4, 'über der letzten Grenze bleibt es die höchste Stufe');
  });

  test('ein Tag ohne Lauf ist Stufe 0', () => {
    const tage = activityCalendar([], { todayIso: HEUTE(0) });
    assert.ok(tage.every((t) => t.level === 0 && t.runCount === 0 && t.distanceKm === 0));
  });

  test('Tage nach heute sind ausgezeichnet', () => {
    // day(0) ist ein Donnerstag: Freitag, Samstag und Sonntag stehen noch aus.
    const tage = activityCalendar([], { todayIso: HEUTE(0) });
    const zukunft = tage.filter((t) => t.future);

    assert.equal(zukunft.length, 3);
    assert.ok(zukunft.every((t) => t.date > day(0)));
  });

  test('Läufe ausserhalb des Zeitraums bleiben draussen', () => {
    const tage = activityCalendar([makeRun(-400, 10), makeRun(0, 5)], { todayIso: HEUTE(0) });

    assert.equal(tage.filter((t) => t.runCount > 0).length, 1);
  });

  test('der Jahreswechsel ist keine Lücke', () => {
    // 18 Wochen zurück von Anfang Januar liegen zum grössten Teil im Vorjahr.
    // Gerechnet wird in Tagesnummern, nicht in Datumsteilen – Silvester und
    // Neujahr sind zwei benachbarte Felder wie jedes andere Paar auch.
    const tage = activityCalendar(
      [
        { id: 'silvester', date: '2025-12-31', distanceKm: 6 },
        { id: 'neujahr', date: '2026-01-01', distanceKm: 7 },
      ],
      { todayIso: HEUTE(0) }
    );

    const silvester = tage.findIndex((t) => t.date === '2025-12-31');

    assert.ok(silvester >= 0, 'der 31.12. steht im Raster');
    assert.equal(tage[silvester + 1].date, '2026-01-01', 'und direkt daneben der 01.01.');
    assert.equal(tage[silvester].runCount, 1);
    assert.equal(tage[silvester + 1].runCount, 1, 'die beiden Läufe landen nicht auf einem Tag');
    assert.deepEqual([...new Set(tage.map((t) => t.date.slice(0, 4)))], ['2025', '2026']);
  });

  test('auch über den Jahreswechsel beginnt jede Woche montags', () => {
    const tage = activityCalendar([], { todayIso: HEUTE(0) });

    for (let i = 0; i < tage.length; i += 7) {
      const wochentag = new Date(`${tage[i].date}T00:00:00Z`).getUTCDay();
      assert.equal(wochentag, 1, `${tage[i].date} ist kein Montag`);
    }
  });

  test('kaputte Eingabe stürzt nicht ab', () => {
    for (const value of [null, undefined, 'text', [null, {}, { date: 5 }]]) {
      assert.doesNotThrow(() => activityCalendar(value, { todayIso: HEUTE(0) }));
      assert.equal(activityCalendar(value, { todayIso: HEUTE(0) }).length, ACTIVITY_WEEKS * 7);
    }
  });
});

describe('Pace im Verlauf', () => {
  /** Lauf mit gerechneter Pace: 5 km in `pace` min/km. */
  const lauf = (dayOffset, pace, distanceKm = 5) =>
    makeRun(dayOffset, distanceKm, { durationMinutes: distanceKm * pace });

  test('ohne Läufe gibt es keine Punkte', () => {
    assert.deepEqual(paceTrend([]), { period: 'week', points: [] });
    assert.deepEqual(paceTrend(null).points, []);
  });

  test('Läufe ohne Pace zählen nicht mit', () => {
    // Ohne Dauer und ohne Pace ist da nichts, was sich auftragen liesse.
    assert.deepEqual(paceTrend([makeRun(0, 5), makeRun(7, 8)]).points, []);
  });

  test('drei Punkte sind die Untergrenze für eine Linie', () => {
    assert.equal(PACE_TREND_MIN_POINTS, 3);
  });

  test('zwei Zeiträume ergeben zwei Punkte – zu wenig für eine Linie', () => {
    // paceTrend selbst hält nichts zurück; es liefert, was da ist. Die Grenze
    // zieht die Anzeige. Geprüft wird deshalb, dass die Zahl stimmt, an der
    // sie das entscheidet – ein Zeitraum weniger, und die Linie behauptete
    // eine Richtung, die zwei Punkte nicht hergeben.
    const zwei = paceTrend([lauf(0, 6), lauf(7, 5.5)]).points;
    const drei = paceTrend([lauf(0, 6), lauf(7, 5.5), lauf(14, 5.4)]).points;

    assert.equal(zwei.length, 2);
    assert.ok(zwei.length < PACE_TREND_MIN_POINTS, 'zwei reichen nicht');

    assert.equal(drei.length, 3);
    assert.ok(drei.length >= PACE_TREND_MIN_POINTS, 'drei reichen');
  });

  test('zwei Läufe in derselben Woche sind nur ein Punkt', () => {
    // Nicht die Zahl der Läufe entscheidet, sondern die der Zeiträume.
    const trend = paceTrend([lauf(0, 6), lauf(1, 5.9), lauf(2, 5.8)]);

    assert.equal(trend.points.length, 1);
    assert.equal(trend.points[0].runCount, 3);
  });

  test('genau ein Vierteljahr Spannweite bleibt bei Wochen', () => {
    // 12 Wochen sind die Grenze, und sie zählt noch zur Wochenansicht:
    // day(0) und day(77) liegen elf Wochen auseinander, die Spannweite ist 12.
    const trend = paceTrend([lauf(0, 6), lauf(40, 5.8), lauf(77, 5.5)]);

    assert.equal(trend.period, 'week');
    assert.equal(trend.points[0].start, '2025-12-29', 'ein Montag');
  });

  test('eine Woche mehr schaltet auf Monate um', () => {
    const trend = paceTrend([lauf(0, 6), lauf(40, 5.8), lauf(84, 5.5)]);

    assert.equal(trend.period, 'month');
    assert.deepEqual(trend.points.map((p) => p.start), ['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  test('die Monatsbeschriftung überlebt den Jahreswechsel', () => {
    // Der Monatsindex ist Jahr × 12 + Monat; ein Rechenfehler beim Zerlegen
    // ergäbe hier einen 13. Monat oder das falsche Jahr.
    const trend = paceTrend([lauf(-98, 6), lauf(-40, 5.8), lauf(0, 5.5)]);

    assert.equal(trend.period, 'month');
    assert.deepEqual(trend.points.map((p) => p.start), ['2025-09-01', '2025-11-01', '2026-01-01']);
  });

  test('kurze Historie wird nach Wochen gebündelt', () => {
    const trend = paceTrend([lauf(0, 6), lauf(7, 5.8), lauf(14, 5.5)]);

    assert.equal(trend.period, 'week');
    assert.equal(trend.points.length, 3);
    // day(0) ist Donnerstag, der 01.01.2026 – die Woche beginnt am 29.12.
    assert.equal(trend.points[0].start, '2025-12-29');
  });

  test('lange Historie wird nach Monaten gebündelt', () => {
    // Über ein Vierteljahr hinaus wären es zu viele Wochenpunkte.
    const trend = paceTrend([lauf(0, 6), lauf(60, 5.8), lauf(120, 5.5)]);

    assert.equal(trend.period, 'month');
    assert.deepEqual(trend.points.map((p) => p.start), ['2026-01-01', '2026-03-01', '2026-05-01']);
  });

  test('Zeiträume ohne Lauf fallen heraus statt auf null zu gehen', () => {
    // Woche 1 und Woche 4 – die beiden dazwischen tauchen nicht auf.
    const trend = paceTrend([lauf(0, 6), lauf(21, 5.5), lauf(28, 5.4)]);

    assert.equal(trend.points.length, 3);
    assert.ok(trend.points.every((p) => p.paceMinPerKm > 0));
  });

  test('der Durchschnitt ist nach Strecke gewichtet', () => {
    // 20 km in 6:00 und 2 km in 5:00 – der schlichte Mittelwert wäre 5:30.
    const trend = paceTrend([lauf(0, 6, 20), lauf(1, 5, 2), lauf(7, 5.5), lauf(14, 5.5)]);

    const erwartet = (6 * 20 + 5 * 2) / 22;
    assert.ok(Math.abs(trend.points[0].paceMinPerKm - erwartet) < 1e-9);
    assert.equal(trend.points[0].runCount, 2);
    assert.equal(trend.points[0].distanceKm, 22);
  });

  test('eine von Hand eingetragene Pace zählt genauso', () => {
    const runs = [
      makeRun(0, 5, { paceMinPerKm: 5.5 }),
      makeRun(7, 5, { paceMinPerKm: 5.4 }),
      makeRun(14, 5, { paceMinPerKm: 5.3 }),
    ];

    assert.equal(paceTrend(runs).points.length, 3);
    assert.equal(paceTrend(runs).points[0].paceMinPerKm, 5.5);
  });

  test('nur die letzten Zeiträume, älteste fallen weg', () => {
    const runs = Array.from({ length: 20 }, (_, i) => lauf(i * 30, 6 - i * 0.05));
    const trend = paceTrend(runs, { limit: 12 });

    assert.equal(trend.points.length, 12);
    // Die jüngsten Monate bleiben stehen, nicht die ältesten.
    assert.equal(trend.points.at(-1).start.slice(0, 7), day(19 * 30).slice(0, 7));
    assert.ok(trend.points[0].start > day(0), 'der erste Monat ist weggefallen');
  });

  test('die Punkte kommen chronologisch', () => {
    const trend = paceTrend([lauf(14, 5.5), lauf(0, 6), lauf(7, 5.8)]);

    const daten = trend.points.map((p) => p.start);
    assert.deepEqual(daten, [...daten].sort());
  });
});
