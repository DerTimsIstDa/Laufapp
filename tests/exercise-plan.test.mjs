import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePlan,
  plannedOn,
  isPlanned,
  hasRoomOn,
  planExercise,
  unplanExercise,
  MAX_PLANNED_PER_DAY,
} from '../js/exercise-plan.js';
import { EXERCISES } from '../js/exercises.js';

const HEUTE = '2026-08-15';
const MORGEN = '2026-08-16';

/** Echte IDs aus der Bibliothek – auf Erfundenes reagiert das Modul absichtlich nicht. */
const [ERSTE, ZWEITE, DRITTE] = EXERCISES.map((exercise) => exercise.id);

const eintrag = (exerciseId, date) => ({ id: `${exerciseId}@${date}`, exerciseId, date });

describe('normalizePlan', () => {
  test('behält brauchbare Einträge', () => {
    const plan = [eintrag(ERSTE, HEUTE)];
    assert.deepEqual(normalizePlan(plan), plan);
  });

  test('wirft Unbrauchbares weg', () => {
    const plan = [
      null,
      'text',
      { exerciseId: ERSTE },
      { date: HEUTE },
      { exerciseId: 'gibt-es-nicht', date: HEUTE },
      { exerciseId: ERSTE, date: '15.08.2026' },
      eintrag(ERSTE, HEUTE),
    ];

    assert.deepEqual(normalizePlan(plan), [eintrag(ERSTE, HEUTE)]);
  });

  test('kaputte Eingaben werfen nicht', () => {
    for (const value of [null, undefined, 'text', 42, {}]) {
      assert.deepEqual(normalizePlan(value), []);
    }
  });
});

describe('plannedOn', () => {
  test('nimmt nur den gefragten Tag', () => {
    const plan = [eintrag(ERSTE, HEUTE), eintrag(ZWEITE, MORGEN)];
    assert.deepEqual(plannedOn(plan, HEUTE).map((e) => e.exerciseId), [ERSTE]);
  });

  test('sortiert nach der Bibliothek, nicht nach Eingabe', () => {
    // Die Aufwärmreihe ist als Abfolge gedacht; die Eingabereihenfolge zählt nicht.
    const plan = [eintrag(DRITTE, HEUTE), eintrag(ERSTE, HEUTE), eintrag(ZWEITE, HEUTE)];
    assert.deepEqual(plannedOn(plan, HEUTE).map((e) => e.exerciseId), [ERSTE, ZWEITE, DRITTE]);
  });

  test('unbrauchbares Datum ergibt eine leere Liste', () => {
    const plan = [eintrag(ERSTE, HEUTE)];
    for (const value of [null, undefined, 42, '15.08.2026', '']) {
      assert.deepEqual(plannedOn(plan, value), []);
    }
  });
});

describe('planExercise', () => {
  test('trägt ein', () => {
    const plan = planExercise([], { exerciseId: ERSTE, date: HEUTE });
    assert.equal(plan.length, 1);
    assert.equal(isPlanned(plan, ERSTE, HEUTE), true);
  });

  test('derselbe Tag zweimal bleibt einmal', () => {
    let plan = planExercise([], { exerciseId: ERSTE, date: HEUTE });
    plan = planExercise(plan, { exerciseId: ERSTE, date: HEUTE });
    assert.equal(plan.length, 1);
  });

  test('dieselbe Übung an einem anderen Tag ist ein zweiter Eintrag', () => {
    let plan = planExercise([], { exerciseId: ERSTE, date: HEUTE });
    plan = planExercise(plan, { exerciseId: ERSTE, date: MORGEN });
    assert.equal(plan.length, 2);
  });

  test('unbekannte Übung und krummes Datum ändern nichts', () => {
    assert.deepEqual(planExercise([], { exerciseId: 'gibt-es-nicht', date: HEUTE }), []);
    assert.deepEqual(planExercise([], { exerciseId: ERSTE, date: 'morgen' }), []);
    assert.deepEqual(planExercise([], { exerciseId: null, date: HEUTE }), []);
  });

  test('mehr als MAX_PLANNED_PER_DAY je Tag geht nicht', () => {
    let plan = [];
    for (const exercise of EXERCISES.slice(0, MAX_PLANNED_PER_DAY + 3)) {
      plan = planExercise(plan, { exerciseId: exercise.id, date: HEUTE });
    }

    assert.equal(plannedOn(plan, HEUTE).length, MAX_PLANNED_PER_DAY);
    assert.equal(hasRoomOn(plan, HEUTE), false);
    // Der nächste Tag ist davon unberührt.
    assert.equal(hasRoomOn(plan, MORGEN), true);
  });

  test('vergibt keine doppelte id', () => {
    let plan = planExercise([], { exerciseId: ERSTE, date: HEUTE, createId: () => 'fest' });
    plan = planExercise(plan, { exerciseId: ZWEITE, date: HEUTE, createId: () => 'fest' });

    assert.equal(new Set(plan.map((e) => e.id)).size, plan.length);
  });
});

describe('unplanExercise', () => {
  test('nimmt genau diesen Tag heraus', () => {
    let plan = planExercise([], { exerciseId: ERSTE, date: HEUTE });
    plan = planExercise(plan, { exerciseId: ERSTE, date: MORGEN });

    const rest = unplanExercise(plan, { exerciseId: ERSTE, date: HEUTE });

    assert.equal(isPlanned(rest, ERSTE, HEUTE), false);
    assert.equal(isPlanned(rest, ERSTE, MORGEN), true, 'der andere Tag bleibt stehen');
  });

  test('was nicht drinsteht, lässt den Plan in Ruhe', () => {
    const plan = planExercise([], { exerciseId: ERSTE, date: HEUTE });
    assert.deepEqual(unplanExercise(plan, { exerciseId: ZWEITE, date: HEUTE }), plan);
  });
});
