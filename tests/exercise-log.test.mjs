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
  setExerciseCount,
  MAX_EXERCISE_COUNT,
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

describe('setExerciseCount – Handkorrektur', () => {
  const dreiTage = [
    eintrag('kraft-plank', '2026-08-12', 1),
    eintrag('kraft-plank', '2026-08-13', 2),
    eintrag('kraft-plank', '2026-08-14', 3),
  ];

  test('gleicher Wert ändert nichts', () => {
    assert.deepEqual(setExerciseCount(dreiTage, 'kraft-plank', 3, { date: '2026-08-14' }), dreiTage);
  });

  test('verringern entfernt die neuesten Einträge', () => {
    const nachher = setExerciseCount(dreiTage, 'kraft-plank', 1, { date: '2026-08-14' });

    assert.equal(nachher.length, 1);
    assert.equal(nachher[0].date, '2026-08-12', 'der älteste muss bleiben');
  });

  test('auf null setzen leert die Übung ganz', () => {
    assert.deepEqual(setExerciseCount(dreiTage, 'kraft-plank', 0, { date: '2026-08-14' }), []);
  });

  test('andere Übungen bleiben unberührt', () => {
    const gemischt = [...dreiTage, eintrag('mob-wadendehnung', '2026-08-14', 9)];
    const nachher = setExerciseCount(gemischt, 'kraft-plank', 1, { date: '2026-08-14' });

    assert.equal(countsByExercise(nachher).get('mob-wadendehnung'), 1);
    assert.equal(countsByExercise(nachher).get('kraft-plank'), 1);
  });

  test('erhöhen ergänzt Einträge mit dem heutigen Datum', () => {
    const nachher = setExerciseCount(dreiTage, 'kraft-plank', 6, { date: '2026-08-20' });

    assert.equal(countsByExercise(nachher).get('kraft-plank'), 6);
    assert.equal(nachher.filter((e) => e.date === '2026-08-20').length, 3);
  });

  test('erhöhen lässt sich nicht als XP-Quelle missbrauchen', () => {
    // Von 3 auf 20 wären naiv 17 mal 3 XP. Weil alles auf denselben Tag
    // fällt, gibt es dafür genau einen Tag mehr.
    const vorher = exerciseXp(dreiTage);
    const nachher = exerciseXp(setExerciseCount(dreiTage, 'kraft-plank', 20, { date: '2026-08-20' }));

    assert.equal(vorher, 9);
    assert.equal(nachher, 12, 'nur ein zusätzlicher Tag zählt');
  });

  test('neue Einträge bekommen eindeutige Ids', () => {
    const nachher = setExerciseCount(dreiTage, 'kraft-plank', 8, { date: '2026-08-20' });
    const ids = nachher.map((e) => e.id);

    assert.equal(new Set(ids).size, ids.length, `nicht eindeutig: ${ids.join(', ')}`);
  });

  test('eigene Id-Vergabe wird benutzt', () => {
    const nachher = setExerciseCount([], 'kraft-plank', 2, {
      date: '2026-08-20',
      createId: (i) => `eigen-${i}`,
    });

    assert.deepEqual(nachher.map((e) => e.id), ['eigen-0', 'eigen-1']);
  });

  test('unbrauchbare Vorgaben lassen alles wie es war', () => {
    for (const wert of [-1, 1.5e400, NaN, 'zwei', null, undefined, true, [], {}, MAX_EXERCISE_COUNT + 1]) {
      assert.deepEqual(
        setExerciseCount(dreiTage, 'kraft-plank', wert, { date: '2026-08-14' }),
        dreiTage,
        `${JSON.stringify(wert)} hätte nichts ändern dürfen`
      );
    }
  });

  test('ein leeres Eingabefeld löscht nicht den Zähler', () => {
    // Number('') ist 0 – ohne Typprüfung würde ein leeres Feld alles löschen.
    for (const leer of ['', '   ']) {
      assert.deepEqual(setExerciseCount(dreiTage, 'kraft-plank', leer, { date: '2026-08-14' }), dreiTage);
    }
  });

  test('eine ausdrückliche Null löscht sehr wohl', () => {
    assert.deepEqual(setExerciseCount(dreiTage, 'kraft-plank', 0, {}), []);
    assert.deepEqual(setExerciseCount(dreiTage, 'kraft-plank', '0', {}), []);
  });

  test('erhöhen ohne Datum ändert nichts', () => {
    assert.deepEqual(setExerciseCount(dreiTage, 'kraft-plank', 5, {}), dreiTage);
    assert.deepEqual(setExerciseCount(dreiTage, 'kraft-plank', 5, { date: '20.08.2026' }), dreiTage);
  });

  test('verringern braucht kein Datum', () => {
    assert.equal(setExerciseCount(dreiTage, 'kraft-plank', 1, {}).length, 1);
  });

  test('unbekannte Übung ohne Bestand lässt sich hochsetzen', () => {
    const nachher = setExerciseCount([], 'drill-anfersen', 2, { date: '2026-08-20' });
    assert.equal(countsByExercise(nachher).get('drill-anfersen'), 2);
  });

  test('Kommazahlen werden abgeschnitten', () => {
    assert.equal(setExerciseCount(dreiTage, 'kraft-plank', 1.9, { date: '2026-08-14' }).length, 1);
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
