import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { goalWeeks, reachedGoalWeeks, goalXp, XP_PER_GOAL_WEEK } from '../js/goal.js';
import { weekStart } from '../js/stats.js';

/** 2026-08-10 ist ein Montag; die Woche läuft bis zum 16.08. */
const MO = '2026-08-10';
const MI = '2026-08-12';
const SO = '2026-08-16';
const MO2 = '2026-08-17';
const MO3 = '2026-08-24';

const lauf = (date, i = 0) => ({ id: `${date}-${i}`, distanceKm: 5, date });

/** Tag n Tage nach einem ISO-Datum. */
const plusTage = (isoDate, tage) => {
  const [jahr, monat, tag] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(jahr, monat - 1, tag + tage)).toISOString().slice(0, 10);
};

/** n Läufe in der Woche ab diesem Montag, an aufeinanderfolgenden Tagen. */
const wocheMit = (montag, anzahl) =>
  Array.from({ length: anzahl }, (_, i) => lauf(plusTage(montag, i), i));

describe('weekStart', () => {
  test('jeder Tag der Woche ergibt denselben Montag', () => {
    for (const tag of [MO, MI, SO]) assert.equal(weekStart(tag), MO);
  });

  test('der nächste Montag ist eine eigene Woche', () => {
    assert.equal(weekStart(MO2), MO2);
  });

  test('unbrauchbare Eingaben ergeben null', () => {
    for (const value of [null, undefined, 42, '10.08.2026', '']) {
      assert.equal(weekStart(value), null);
    }
  });
});

describe('goalWeeks', () => {
  test('ohne Ziel gibt es keine Wochen', () => {
    const runs = wocheMit(MO, 3);
    for (const ziel of [0, -1, null, undefined, NaN]) {
      assert.deepEqual(goalWeeks(runs, { weeklyGoal: ziel, goalSince: MO, todayIso: SO }), []);
    }
  });

  test('ohne brauchbaren Stichtag gibt es keine Wochen', () => {
    const runs = wocheMit(MO, 3);
    for (const seit of ['', null, 'gestern', 42]) {
      assert.deepEqual(goalWeeks(runs, { weeklyGoal: 2, goalSince: seit, todayIso: SO }), []);
    }
  });

  test('die laufende Woche zählt, sobald das Ziel steht', () => {
    const runs = wocheMit(MO, 2);
    const wochen = goalWeeks(runs, { weeklyGoal: 2, goalSince: MO, todayIso: MI });

    assert.equal(wochen.length, 1);
    assert.deepEqual(wochen[0], { start: MO, runCount: 2, reached: true });
  });

  test('knapp darunter zählt nicht', () => {
    const wochen = goalWeeks(wocheMit(MO, 1), { weeklyGoal: 2, goalSince: MO, todayIso: MI });
    assert.equal(wochen[0].reached, false);
  });

  test('Wochen ohne Lauf stehen mit 0 drin, statt zu fehlen', () => {
    // Sonst liesse sich nicht sehen, dass eine Woche ausgelassen wurde.
    const runs = [...wocheMit(MO, 3), ...wocheMit(MO3, 3)];
    const wochen = goalWeeks(runs, { weeklyGoal: 2, goalSince: MO, todayIso: MO3 });

    assert.deepEqual(wochen.map((w) => w.start), [MO, MO2, MO3]);
    assert.deepEqual(wochen.map((w) => w.reached), [true, false, true]);
    assert.equal(wochen[1].runCount, 0);
  });

  test('Wochen vor dem Stichtag bleiben draussen', () => {
    // Genau das verhindert das rueckwirkende Ernten: Ziel spaeter setzen
    // zahlt nicht fuer frueher.
    const runs = [...wocheMit(MO, 5), ...wocheMit(MO2, 5)];
    const wochen = goalWeeks(runs, { weeklyGoal: 2, goalSince: MO2, todayIso: MO2 });

    assert.deepEqual(wochen.map((w) => w.start), [MO2]);
  });

  test('ein Stichtag in der Zukunft ergibt nichts', () => {
    assert.deepEqual(goalWeeks(wocheMit(MO, 5), { weeklyGoal: 2, goalSince: MO3, todayIso: MO }), []);
  });

  test('Läufe nach der laufenden Woche zahlen nicht voraus', () => {
    const runs = wocheMit(MO3, 5);
    const wochen = goalWeeks(runs, { weeklyGoal: 2, goalSince: MO, todayIso: MO });

    assert.deepEqual(wochen.map((w) => w.reached), [false]);
  });

  test('kaputte Läufe werfen nicht', () => {
    for (const value of [null, undefined, 'text', 42, [null, { date: 5 }, {}]]) {
      assert.doesNotThrow(() =>
        goalWeeks(value, { weeklyGoal: 2, goalSince: MO, todayIso: MO })
      );
    }
  });
});

describe('goalXp', () => {
  const optionen = { weeklyGoal: 2, goalSince: MO, todayIso: MO3 };
  const runs = [...wocheMit(MO, 3), ...wocheMit(MO3, 2)];

  test('100 XP je erreichter Woche', () => {
    assert.equal(reachedGoalWeeks(runs, optionen), 2);
    assert.equal(goalXp(runs, optionen), 2 * XP_PER_GOAL_WEEK);
  });

  test('ohne Ziel keine XP', () => {
    assert.equal(goalXp(runs, { ...optionen, weeklyGoal: 0 }), 0);
  });

  test('ein hoeheres Ziel senkt die Ausbeute', () => {
    assert.equal(goalXp(runs, { ...optionen, weeklyGoal: 3 }), XP_PER_GOAL_WEEK);
    assert.equal(goalXp(runs, { ...optionen, weeklyGoal: 4 }), 0);
  });
});
