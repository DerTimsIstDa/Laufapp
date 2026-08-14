import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { loadRuns, addRun, updateRun, removeRun } from '../js/storage.js';
import { getProgress, totalXpFromRuns } from '../js/xp.js';
import { evaluateAchievements, achievementXp } from '../js/achievements.js';
import { titleForLevel } from '../js/titles.js';
import { installFakeLocalStorage } from './helpers.mjs';

let store;

beforeEach(() => {
  store = installFakeLocalStorage();
});

afterEach(() => {
  store.restore();
});

/** Der komplette abgeleitete Zustand – genau das, was die Anzeige zeigt. */
function derive(runs) {
  const achievements = evaluateAchievements(runs);
  const totalXp = totalXpFromRuns(runs) + achievementXp(achievements);
  const progress = getProgress(totalXp);

  return {
    totalXp,
    level: progress.level,
    title: titleForLevel(progress.level),
    unlocked: achievements.filter((a) => a.unlocked).map((a) => a.id).sort(),
  };
}

describe('addRun', () => {
  test('legt an, vergibt eine id und schreibt in den Speicher', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });

    assert.equal(runs.length, 1);
    assert.ok(runs[0].id.length > 0);
    assert.deepEqual(store.read(), runs);
  });

  test('optionale Felder nur, wenn gefüllt', () => {
    const [ohne] = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.deepEqual(Object.keys(ohne).sort(), ['date', 'distanceKm', 'id']);

    const [mit] = addRun([], {
      distanceKm: 5,
      date: '2026-08-14',
      timeOfDay: '06:30',
      durationMinutes: 28,
      source: 'gps',
    });
    assert.equal(mit.timeOfDay, '06:30');
    assert.equal(mit.durationMinutes, 28);
    assert.equal(mit.source, 'gps');
  });

  test('sortiert neueste zuerst', () => {
    let runs = addRun([], { distanceKm: 5, date: '2026-08-10' });
    runs = addRun(runs, { distanceKm: 6, date: '2026-08-14' });
    runs = addRun(runs, { distanceKm: 7, date: '2026-08-12' });

    assert.deepEqual(runs.map((r) => r.date), ['2026-08-14', '2026-08-12', '2026-08-10']);
  });
});

describe('updateRun', () => {
  test('ändert Distanz und Datum und speichert', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    const id = runs[0].id;

    const next = updateRun(runs, id, { distanceKm: 12, date: '2026-08-01' });

    assert.equal(next[0].id, id, 'die id bleibt');
    assert.equal(next[0].distanceKm, 12);
    assert.equal(next[0].date, '2026-08-01');
    assert.deepEqual(store.read(), next);
  });

  test('geleerte Felder verschwinden wirklich', () => {
    const runs = addRun([], {
      distanceKm: 5,
      date: '2026-08-14',
      timeOfDay: '06:30',
      durationMinutes: 28,
    });

    const next = updateRun(runs, runs[0].id, { distanceKm: 5, date: '2026-08-14' });

    assert.equal('timeOfDay' in next[0], false);
    assert.equal('durationMinutes' in next[0], false);
  });

  test('ein aufgezeichneter Lauf bleibt als GPS-Lauf erkennbar', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14', source: 'gps' });
    const next = updateRun(runs, runs[0].id, { distanceKm: 5.2, date: '2026-08-14' });

    assert.equal(next[0].source, 'gps');
  });

  test('sortiert nach einer Datumsänderung neu', () => {
    let runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    runs = addRun(runs, { distanceKm: 6, date: '2026-08-10' });

    const aeltester = runs[1].id;
    const next = updateRun(runs, aeltester, { distanceKm: 6, date: '2026-08-20' });

    assert.equal(next[0].id, aeltester, 'der bearbeitete Lauf steht jetzt vorn');
  });

  test('unbekannte id lässt alles unverändert', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.equal(updateRun(runs, 'gibt-es-nicht', { distanceKm: 9, date: '2026-01-01' }), runs);
  });
});

describe('removeRun', () => {
  test('entfernt genau einen Lauf', () => {
    let runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    runs = addRun(runs, { distanceKm: 6, date: '2026-08-10' });

    const next = removeRun(runs, runs[0].id);

    assert.equal(next.length, 1);
    assert.deepEqual(store.read(), next);
  });
});

describe('loadRuns', () => {
  test('leerer Speicher ergibt eine leere Liste', () => {
    assert.deepEqual(loadRuns(), []);
  });

  test('liest Gespeichertes zurück', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.deepEqual(loadRuns(), runs);
  });

  test('kaputter Inhalt führt nicht zum Absturz', () => {
    localStorage.setItem('laufapp.runs.v1', '{kein json');
    assert.deepEqual(loadRuns(), []);

    localStorage.setItem('laufapp.runs.v1', '{"nicht":"array"}');
    assert.deepEqual(loadRuns(), []);
  });

  test('unbrauchbare Einträge werden aussortiert', () => {
    localStorage.setItem(
      'laufapp.runs.v1',
      JSON.stringify([
        { id: 'gut', distanceKm: 5, date: '2026-08-14' },
        { id: 'negativ', distanceKm: -1, date: '2026-08-13' },
        null,
      ])
    );

    assert.deepEqual(loadRuns().map((r) => r.id), ['gut']);
  });
});

describe('Neuberechnung nach dem Bearbeiten', () => {
  test('mehr Distanz hebt XP, Level und Titel', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    const vorher = derive(runs);

    const next = updateRun(runs, runs[0].id, { distanceKm: 300, date: '2026-08-14' });
    const nachher = derive(next);

    assert.equal(vorher.totalXp, 65, '50 aus dem Lauf plus 15 für Erste Meile');
    assert.equal(nachher.totalXp, 3065, '3000 plus Erste Meile plus 50-km-Club');
    assert.ok(nachher.level > vorher.level);
    assert.ok(nachher.unlocked.includes('club-50-km'));
  });

  test('weniger Distanz sperrt ein Achievement wieder und senkt das Level', () => {
    const runs = addRun([], { distanceKm: 60, date: '2026-08-14' });
    assert.ok(derive(runs).unlocked.includes('club-50-km'));

    const next = updateRun(runs, runs[0].id, { distanceKm: 10, date: '2026-08-14' });
    const nachher = derive(next);

    assert.equal(nachher.unlocked.includes('club-50-km'), false);
    assert.equal(nachher.totalXp, 115, '100 aus dem Lauf plus 15 für Erste Meile');
  });

  test('ein geändertes Datum kann eine Serie zerreißen', () => {
    let runs = [];
    for (let i = 0; i < 7; i++) {
      runs = addRun(runs, { distanceKm: 3, date: `2026-03-0${i + 1}` });
    }
    assert.ok(derive(runs).unlocked.includes('serientaeter'), '7 Tage in Folge');

    const mittlerer = runs.find((run) => run.date === '2026-03-04');
    const next = updateRun(runs, mittlerer.id, { distanceKm: 3, date: '2026-09-01' });

    assert.equal(derive(next).unlocked.includes('serientaeter'), false, 'Lücke bricht die Serie');
  });

  test('eine Uhrzeit nachtragen schaltet Frühaufsteher frei', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.equal(derive(runs).unlocked.includes('fruehaufsteher'), false);

    const next = updateRun(runs, runs[0].id, {
      distanceKm: 5,
      date: '2026-08-14',
      timeOfDay: '05:45',
    });

    assert.ok(derive(next).unlocked.includes('fruehaufsteher'));
  });
});
