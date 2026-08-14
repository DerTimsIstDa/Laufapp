import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  EXERCISES,
  CATEGORIES,
  ALL_CATEGORIES,
  findCategory,
  filterExercises,
  countByCategory,
} from '../js/exercises.js';

describe('Datenbestand', () => {
  test('alle fünf geforderten Kategorien sind da', () => {
    assert.deepEqual(
      CATEGORIES.map((c) => c.id).sort(),
      ['drills', 'kraft', 'mobility', 'regeneration', 'warmup']
    );
  });

  test('Kategorie-Ids sind eindeutig', () => {
    assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
  });

  test('Übungs-Ids sind eindeutig', () => {
    assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  });

  test('jede Übung ist vollständig', () => {
    for (const exercise of EXERCISES) {
      for (const feld of ['id', 'name', 'category', 'instruction', 'dose']) {
        assert.ok(
          typeof exercise[feld] === 'string' && exercise[feld].trim() !== '',
          `${exercise.id ?? '?'}: ${feld} fehlt`
        );
      }
    }
  });

  test('jede Übung zeigt auf eine bekannte Kategorie', () => {
    for (const exercise of EXERCISES) {
      assert.ok(findCategory(exercise.category), `${exercise.id}: Kategorie ${exercise.category}`);
    }
  });

  test('keine Kategorie ist leer', () => {
    for (const category of CATEGORIES) {
      assert.ok(
        EXERCISES.some((e) => e.category === category.id),
        `${category.id} hat keine Übungen`
      );
    }
  });

  test('die Anleitungen sind brauchbar lang, nicht nur Stichworte', () => {
    for (const exercise of EXERCISES) {
      assert.ok(exercise.instruction.length >= 40, `${exercise.id}: Anleitung zu knapp`);
    }
  });

  test('Aufwärmen ist eine kurze Reihe aus vier bis fünf Übungen', () => {
    const warmup = EXERCISES.filter((e) => e.category === 'warmup');
    assert.ok(warmup.length >= 4 && warmup.length <= 5, `${warmup.length} statt 4 bis 5`);
    assert.equal(findCategory('warmup').ordered, true, 'Reihenfolge muss ausgewiesen sein');
  });

  test('die geforderten Beispielübungen sind enthalten', () => {
    const namen = EXERCISES.map((e) => e.name.toLowerCase());
    const erwartet = [
      'wadendehnung', 'hüftbeuger', 'it-band',
      'kniehebelauf', 'anfersen', 'skipping', 'steigerungslauf',
      'ausfallschritte', 'kniebeugen', 'wadenheben', 'plank',
    ];

    for (const begriff of erwartet) {
      assert.ok(namen.some((n) => n.includes(begriff)), `${begriff} fehlt`);
    }
  });

  test('Regeneration nennt Foam Rolling und Stretching', () => {
    const namen = EXERCISES.filter((e) => e.category === 'regeneration').map((e) => e.name.toLowerCase());
    assert.ok(namen.some((n) => n.includes('foam')), 'Foam Rolling fehlt');
    assert.ok(namen.some((n) => n.includes('stretching')), 'Stretching fehlt');
  });
});

describe('filterExercises', () => {
  test('ohne Filter kommt alles', () => {
    assert.equal(filterExercises(ALL_CATEGORIES).length, EXERCISES.length);
  });

  test('eine Kategorie liefert nur deren Übungen', () => {
    for (const category of CATEGORIES) {
      const treffer = filterExercises(category.id);
      assert.ok(treffer.length > 0, `${category.id} leer`);
      assert.ok(
        treffer.every((e) => e.category === category.id),
        `${category.id} enthält Fremdes`
      );
    }
  });

  test('die Kategorien ergeben zusammen den ganzen Bestand', () => {
    const summe = CATEGORIES.reduce((n, c) => n + filterExercises(c.id).length, 0);
    assert.equal(summe, EXERCISES.length, 'Übungen doppelt oder verloren');
  });

  test('unbekannte Filter liefern alles statt nichts', () => {
    // Lieber zu viel anzeigen als eine leere Seite.
    assert.equal(filterExercises('quatsch').length, EXERCISES.length);
    assert.equal(filterExercises(undefined).length, EXERCISES.length);
    assert.equal(filterExercises(null).length, EXERCISES.length);
  });

  test('die Reihenfolge der Aufwärmreihe bleibt erhalten', () => {
    const original = EXERCISES.filter((e) => e.category === 'warmup').map((e) => e.id);
    assert.deepEqual(filterExercises('warmup').map((e) => e.id), original);
  });

  test('gibt eine Kopie zurück, keine Referenz auf den Bestand', () => {
    const treffer = filterExercises(ALL_CATEGORIES);
    treffer.length = 0;
    assert.ok(EXERCISES.length > 0, 'der Bestand wurde beschädigt');
  });
});

describe('countByCategory', () => {
  test('zählt jede Kategorie', () => {
    const zaehler = countByCategory();

    assert.equal(zaehler.size, CATEGORIES.length);
    for (const category of CATEGORIES) {
      assert.equal(zaehler.get(category.id), filterExercises(category.id).length, category.id);
    }
  });

  test('die Summe passt zum Bestand', () => {
    const summe = [...countByCategory().values()].reduce((a, b) => a + b, 0);
    assert.equal(summe, EXERCISES.length);
  });
});

describe('findCategory', () => {
  test('findet vorhandene und meldet fehlende', () => {
    assert.equal(findCategory('kraft').label, 'Kraft');
    assert.equal(findCategory('gibtsnicht'), undefined);
    assert.equal(findCategory(undefined), undefined);
  });

  test('jede Kategorie hat Beschriftung und Beschreibung', () => {
    for (const category of CATEGORIES) {
      assert.ok(category.label?.trim(), `${category.id}: keine Beschriftung`);
      assert.ok(category.description?.trim(), `${category.id}: keine Beschreibung`);
    }
  });
});
