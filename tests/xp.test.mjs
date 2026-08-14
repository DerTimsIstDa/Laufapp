import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  XP_PER_KM,
  xpForDistance,
  xpToAdvance,
  totalXpForLevel,
  levelForXp,
  getProgress,
  totalXpFromRuns,
} from '../js/xp.js';

describe('XP pro Distanz', () => {
  test('10 XP pro Kilometer', () => {
    assert.equal(XP_PER_KM, 10);
    assert.equal(xpForDistance(5), 50);
    assert.equal(xpForDistance(0), 0);
  });

  test('rundet auf ganze XP', () => {
    assert.equal(xpForDistance(5.4), 54);
    assert.equal(xpForDistance(0.05), 1);
    assert.equal(xpForDistance(0.04), 0);
  });
});

describe('Aufstiegskosten', () => {
  test('40 + 20 x Level', () => {
    assert.equal(xpToAdvance(1), 60);
    assert.equal(xpToAdvance(2), 80);
    assert.equal(xpToAdvance(10), 240);
  });

  test('kein Cap – wächst linear weiter', () => {
    assert.equal(xpToAdvance(1000), 20_040);
    assert.equal(xpToAdvance(2000) - xpToAdvance(1999), 20);
  });
});

describe('Kumulierte Schwelle', () => {
  test('geschlossene Formel entspricht der Summe der Einzelkosten', () => {
    let sum = 0;
    for (let level = 1; level <= 5000; level++) {
      assert.equal(totalXpForLevel(level), sum, `Level ${level}`);
      sum += xpToAdvance(level);
    }
  });

  test('Level 1 kostet nichts', () => {
    assert.equal(totalXpForLevel(1), 0);
    assert.equal(totalXpForLevel(0), 0);
  });
});

describe('Level aus XP', () => {
  test('trifft jede Grenze exakt, auch weit oben', () => {
    for (let level = 1; level <= 5000; level++) {
      const threshold = totalXpForLevel(level);
      assert.equal(levelForXp(threshold), level, `genau auf Grenze ${level}`);
      assert.equal(levelForXp(threshold + 1), level, `knapp über Grenze ${level}`);
      if (level > 1) {
        assert.equal(levelForXp(threshold - 1), level - 1, `knapp unter Grenze ${level}`);
      }
    }
  });

  test('Randfälle', () => {
    assert.equal(levelForXp(0), 1);
    assert.equal(levelForXp(-5), 1);
    assert.equal(levelForXp(59), 1);
    assert.equal(levelForXp(60), 2);
  });
});

describe('getProgress', () => {
  test('Startzustand', () => {
    assert.deepEqual(getProgress(0), {
      level: 1,
      totalXp: 0,
      xpIntoLevel: 0,
      xpForLevel: 60,
      xpToNextLevel: 60,
      progressPercent: 0,
    });
  });

  test('halb durch Level 1', () => {
    const progress = getProgress(30);
    assert.equal(progress.level, 1);
    assert.equal(progress.xpIntoLevel, 30);
    assert.equal(progress.progressPercent, 50);
  });

  test('exakt auf dem Levelaufstieg beginnt das neue Level bei 0', () => {
    assert.deepEqual(getProgress(60), {
      level: 2,
      totalXp: 60,
      xpIntoLevel: 0,
      xpForLevel: 80,
      xpToNextLevel: 80,
      progressPercent: 0,
    });
    assert.equal(getProgress(140).level, 3);
    assert.equal(getProgress(140).xpIntoLevel, 0);
  });

  test('Fortschritt bleibt über einen breiten Bereich innerhalb des Levels', () => {
    for (let xp = 0; xp <= 200_000; xp += 7) {
      const progress = getProgress(xp);
      assert.ok(progress.xpIntoLevel >= 0, `xpIntoLevel negativ bei ${xp}`);
      assert.ok(progress.xpIntoLevel < progress.xpForLevel, `Level nicht gewechselt bei ${xp}`);
      assert.ok(progress.progressPercent >= 0 && progress.progressPercent < 100, `Prozent bei ${xp}`);
    }
  });

  test('negative XP werden abgefangen', () => {
    assert.equal(getProgress(-100).totalXp, 0);
    assert.equal(getProgress(-100).level, 1);
  });
});

describe('totalXpFromRuns', () => {
  test('summiert gerundete Einzelwerte', () => {
    assert.equal(totalXpFromRuns([{ distanceKm: 5 }, { distanceKm: 3.3 }, { distanceKm: 10 }]), 183);
  });

  test('leere Liste', () => {
    assert.equal(totalXpFromRuns([]), 0);
  });
});
