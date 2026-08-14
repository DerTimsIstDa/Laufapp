import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  XP_PER_EXERCISE,
  normalizeEntries,
  countsByExercise,
  totalCompletions,
  xpEarningCount,
  exerciseXp,
  awardsXp,
  doneOnDay,
  buildExerciseStats,
} from '../js/exercise-log.js';
import { CATEGORIES, EXERCISES } from '../js/exercises.js';

/** Ein Eintrag; `n` nur zur Unterscheidung. */
const eintrag = (exerciseId, date, n = 0) => ({ id: `e${n}`, exerciseId, date, at: `${date}T08:00:00.000Z` });

/** Eine Übung je Kategorie, für Vielseitig. */
const ersteJeKategorie = CATEGORIES.map(
  (kategorie) => EXERCISES.find((e) => e.category === kategorie.id).id
);

describe('normalizeEntries', () => {
  test('behält brauchbare Einträge', () => {
    const gut = [eintrag('mob-wadendehnung', '2026-08-14')];
    assert.deepEqual(normalizeEntries(gut), gut);
  });

  test('wirft Unbrauchbares weg', () => {
    const gemischt = [
      eintrag('mob-wadendehnung', '2026-08-14'),
      null,
      'text',
      { exerciseId: '', date: '2026-08-14' },
      { exerciseId: 'x' },
      { exerciseId: 'x', date: '14.08.2026' },
      { date: '2026-08-14' },
    ];

    assert.equal(normalizeEntries(gemischt).length, 1);
  });

  test('Nicht-Listen ergeben eine leere Liste', () => {
    for (const wert of [null, undefined, 'text', 42, {}]) {
      assert.deepEqual(normalizeEntries(wert), []);
    }
  });
});

describe('Zähler – unabhängig vom Tageslimit', () => {
  test('mehrfach am selben Tag zählt mehrfach', () => {
    const log = [
      eintrag('kraft-plank', '2026-08-14', 1),
      eintrag('kraft-plank', '2026-08-14', 2),
      eintrag('kraft-plank', '2026-08-14', 3),
    ];

    assert.equal(countsByExercise(log).get('kraft-plank'), 3);
    assert.equal(totalCompletions(log), 3);
  });

  test('zählt je Übung getrennt', () => {
    const log = [
      eintrag('kraft-plank', '2026-08-14', 1),
      eintrag('kraft-plank', '2026-08-15', 2),
      eintrag('mob-wadendehnung', '2026-08-14', 3),
    ];

    const zaehler = countsByExercise(log);
    assert.equal(zaehler.get('kraft-plank'), 2);
    assert.equal(zaehler.get('mob-wadendehnung'), 1);
    assert.equal(zaehler.has('drill-anfersen'), false);
  });

  test('leeres Protokoll', () => {
    assert.equal(totalCompletions([]), 0);
    assert.equal(countsByExercise([]).size, 0);
  });
});

describe('XP – einmal je Übung und Kalendertag', () => {
  test('drei XP für die erste Erledigung', () => {
    assert.equal(XP_PER_EXERCISE, 3);
    assert.equal(exerciseXp([eintrag('kraft-plank', '2026-08-14')]), 3);
  });

  test('mehrfaches Antippen am selben Tag bringt kein weiteres XP', () => {
    const log = [
      eintrag('kraft-plank', '2026-08-14', 1),
      eintrag('kraft-plank', '2026-08-14', 2),
      eintrag('kraft-plank', '2026-08-14', 3),
    ];

    assert.equal(xpEarningCount(log), 1);
    assert.equal(exerciseXp(log), 3, 'zehnmal tippen bringt trotzdem nur drei XP');
    assert.equal(totalCompletions(log), 3, 'der Zähler läuft aber weiter');
  });

  test('dieselbe Übung an verschiedenen Tagen zählt jedes Mal', () => {
    const log = [
      eintrag('kraft-plank', '2026-08-14', 1),
      eintrag('kraft-plank', '2026-08-15', 2),
      eintrag('kraft-plank', '2026-08-16', 3),
    ];

    assert.equal(exerciseXp(log), 9);
  });

  test('verschiedene Übungen am selben Tag zählen jede', () => {
    const log = [
      eintrag('kraft-plank', '2026-08-14', 1),
      eintrag('mob-wadendehnung', '2026-08-14', 2),
      eintrag('drill-anfersen', '2026-08-14', 3),
    ];

    assert.equal(exerciseXp(log), 9);
  });

  test('gemischter Fall', () => {
    const log = [
      eintrag('kraft-plank', '2026-08-14', 1),
      eintrag('kraft-plank', '2026-08-14', 2), // kein XP
      eintrag('kraft-plank', '2026-08-15', 3),
      eintrag('mob-wadendehnung', '2026-08-15', 4),
      eintrag('mob-wadendehnung', '2026-08-15', 5), // kein XP
    ];

    assert.equal(totalCompletions(log), 5);
    assert.equal(xpEarningCount(log), 3);
    assert.equal(exerciseXp(log), 9);
  });

  test('leeres Protokoll bringt keine XP', () => {
    assert.equal(exerciseXp([]), 0);
  });
});

describe('awardsXp und doneOnDay', () => {
  const log = [eintrag('kraft-plank', '2026-08-14')];

  test('erste Erledigung des Tages bringt XP', () => {
    assert.equal(awardsXp(log, 'mob-wadendehnung', '2026-08-14'), true);
    assert.equal(awardsXp([], 'kraft-plank', '2026-08-14'), true);
  });

  test('zweite Erledigung derselben Übung am selben Tag nicht', () => {
    assert.equal(awardsXp(log, 'kraft-plank', '2026-08-14'), false);
    assert.equal(doneOnDay(log, 'kraft-plank', '2026-08-14'), true);
  });

  test('am nächsten Tag wieder', () => {
    assert.equal(awardsXp(log, 'kraft-plank', '2026-08-15'), true);
    assert.equal(doneOnDay(log, 'kraft-plank', '2026-08-15'), false);
  });
});

describe('buildExerciseStats', () => {
  test('ohne Einträge ist alles null', () => {
    const stats = buildExerciseStats([]);
    assert.equal(stats.exerciseCompletions, 0);
    assert.equal(stats.exerciseCategoriesDone, 0);
    assert.equal(stats.exerciseCategoryTotal, CATEGORIES.length);
  });

  test('zählt Erledigungen inklusive Mehrfachnennungen', () => {
    const log = [
      eintrag('kraft-plank', '2026-08-14', 1),
      eintrag('kraft-plank', '2026-08-14', 2),
    ];

    assert.equal(buildExerciseStats(log).exerciseCompletions, 2);
  });

  test('vier von fünf Kategorien reichen für Vielseitig nicht', () => {
    const log = ersteJeKategorie
      .slice(0, 4)
      .map((id, i) => eintrag(id, '2026-08-14', i));

    const stats = buildExerciseStats(log);
    assert.equal(stats.exerciseCategoriesDone, 4);
    assert.ok(stats.exerciseCategoriesDone < stats.exerciseCategoryTotal);
  });

  test('alle fünf Kategorien erfüllen es', () => {
    const log = ersteJeKategorie.map((id, i) => eintrag(id, '2026-08-14', i));
    const stats = buildExerciseStats(log);

    assert.equal(stats.exerciseCategoriesDone, 5);
    assert.equal(stats.exerciseCategoriesDone, stats.exerciseCategoryTotal);
  });

  test('viele Übungen aus einer Kategorie ergeben trotzdem nur eine', () => {
    const kraft = EXERCISES.filter((e) => e.category === 'kraft');
    const log = kraft.map((e, i) => eintrag(e.id, '2026-08-14', i));

    assert.equal(buildExerciseStats(log).exerciseCategoriesDone, 1);
    assert.equal(buildExerciseStats(log).exerciseCompletions, kraft.length);
  });

  test('unbekannte Übungs-Ids zählen mit, gehören aber zu keiner Kategorie', () => {
    // Etwa nach einem Import aus einer älteren Bibliothek.
    const log = [eintrag('gibt-es-nicht-mehr', '2026-08-14')];
    const stats = buildExerciseStats(log);

    assert.equal(stats.exerciseCompletions, 1);
    assert.equal(stats.exerciseCategoriesDone, 0);
  });
});
