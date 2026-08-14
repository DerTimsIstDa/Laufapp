import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { titleForLevel, nextTitle, BASE_TITLES, ENDLESS_START_LEVEL } from '../js/titles.js';

describe('Feste Titelstufen', () => {
  test('greifen ab ihrem Level und gelten bis zur nächsten Stufe', () => {
    assert.equal(titleForLevel(1), 'Neuling');
    assert.equal(titleForLevel(4), 'Neuling');
    assert.equal(titleForLevel(5), 'Läufer');
    assert.equal(titleForLevel(14), 'Läufer');
    assert.equal(titleForLevel(15), 'Ausdauerläufer');
    assert.equal(titleForLevel(29), 'Ausdauerläufer');
    assert.equal(titleForLevel(30), 'Veteran');
    assert.equal(titleForLevel(79), 'Veteran');
  });

  test('BASE_TITLES ist aufsteigend sortiert', () => {
    for (let i = 1; i < BASE_TITLES.length; i++) {
      assert.ok(
        BASE_TITLES[i].level > BASE_TITLES[i - 1].level,
        `${BASE_TITLES[i].title} steht nicht nach ${BASE_TITLES[i - 1].title}`
      );
    }
    assert.ok(BASE_TITLES.at(-1).level < ENDLESS_START_LEVEL);
  });
});

describe('Endlose Titelstufen alle 50 Level', () => {
  test('Elite und die Legenden', () => {
    assert.equal(titleForLevel(80), 'Elite');
    assert.equal(titleForLevel(129), 'Elite');
    assert.equal(titleForLevel(130), 'Legende I');
    assert.equal(titleForLevel(180), 'Legende II');
    assert.equal(titleForLevel(230), 'Legende III');
    assert.equal(titleForLevel(380), 'Legende VI');
    assert.equal(titleForLevel(2580), 'Legende L');
  });

  test('jedes Level bis 3000 hat einen Titel', () => {
    for (let level = 1; level <= 3000; level++) {
      const title = titleForLevel(level);
      assert.ok(typeof title === 'string' && title.length > 0, `Level ${level} ohne Titel`);
    }
  });

  test('sehr hohe Level fallen auf Ziffern zurück statt endloser Römischer', () => {
    assert.equal(titleForLevel(ENDLESS_START_LEVEL + 4000 * 50), 'Legende 4000');
  });
});

describe('nextTitle', () => {
  test('nennt die nächste Stufe', () => {
    assert.deepEqual(nextTitle(1), { level: 5, title: 'Läufer' });
    assert.deepEqual(nextTitle(5), { level: 15, title: 'Ausdauerläufer' });
    assert.deepEqual(nextTitle(30), { level: 80, title: 'Elite' });
    assert.deepEqual(nextTitle(80), { level: 130, title: 'Legende I' });
    assert.deepEqual(nextTitle(129), { level: 130, title: 'Legende I' });
    assert.deepEqual(nextTitle(130), { level: 180, title: 'Legende II' });
  });

  test('liegt immer in der Zukunft und nennt nie den aktuellen Titel', () => {
    for (let level = 1; level <= 2000; level++) {
      const upcoming = nextTitle(level);

      assert.ok(upcoming.level > level, `nextTitle(${level}) zeigt nicht nach vorn`);
      assert.notEqual(upcoming.title, titleForLevel(level), `nextTitle(${level}) wiederholt sich`);
      assert.equal(
        titleForLevel(upcoming.level),
        upcoming.title,
        `nextTitle(${level}) passt nicht zu titleForLevel`
      );
    }
  });
});
