import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { existsSync } from 'node:fs';

import {
  titleForLevel,
  nextTitle,
  badgeForLevel,
  badgeSrc,
  BASE_TITLES,
  ENDLESS_START_LEVEL,
  ENDLESS_STEP,
  ELITE_BADGE,
  LEGEND_BADGE,
} from '../js/titles.js';

describe('Rang-Abzeichen', () => {
  test('jede feste Stufe hat ihr eigenes Abzeichen', () => {
    assert.equal(badgeForLevel(1), 'neuling');
    assert.equal(badgeForLevel(4), 'neuling');
    assert.equal(badgeForLevel(5), 'laeufer');
    assert.equal(badgeForLevel(15), 'ausdauerlaeufer');
    assert.equal(badgeForLevel(30), 'veteran');
    assert.equal(badgeForLevel(79), 'veteran');
    assert.equal(badgeForLevel(ENDLESS_START_LEVEL), ELITE_BADGE);
  });

  test('alle Legenden-Stufen teilen sich ein Abzeichen', () => {
    // Es gibt sechs Bilder, aber endlos viele Legenden. Die roemische Ziffer
    // unterscheidet sie im Text, nicht im Bild.
    for (let stufe = 1; stufe <= 40; stufe++) {
      const level = ENDLESS_START_LEVEL + stufe * ENDLESS_STEP;
      assert.equal(badgeForLevel(level), LEGEND_BADGE, `Level ${level}`);
      assert.match(titleForLevel(level), /^Legende /);
    }
  });

  test('das Abzeichen wechselt genau dort, wo der Titel wechselt', () => {
    let vorherTitel = titleForLevel(1);
    let vorherBadge = badgeForLevel(1);

    for (let level = 2; level <= 300; level++) {
      const titel = titleForLevel(level);
      const badge = badgeForLevel(level);

      // Umgekehrt gilt es nicht: Legende II erbt das Bild von Legende I.
      if (badge !== vorherBadge) {
        assert.notEqual(titel, vorherTitel, `Level ${level}: Bild wechselt ohne Titelwechsel`);
      }
      vorherTitel = titel;
      vorherBadge = badge;
    }
  });

  test('zu jedem Abzeichen liegt eine Bilddatei', () => {
    const namen = [...BASE_TITLES.map((t) => t.badge), ELITE_BADGE, LEGEND_BADGE];

    for (const name of namen) {
      const pfad = new URL(`../${badgeSrc(name)}`, import.meta.url);
      assert.ok(existsSync(pfad), `fehlt: ${badgeSrc(name)}`);
    }
  });

  test('jeder feste Titel bringt ein Abzeichen mit', () => {
    for (const stufe of BASE_TITLES) {
      assert.ok(stufe.badge, `${stufe.title} hat kein Abzeichen`);
    }
  });
});

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
