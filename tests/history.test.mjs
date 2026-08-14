import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { replayHistory, achievementUnlockDates, titleHistory } from '../js/history.js';
import { ACHIEVEMENTS, evaluateAchievements } from '../js/achievements.js';
import { makeRun, day } from './helpers.mjs';

describe('replayHistory', () => {
  test('leere Historie', () => {
    assert.deepEqual(replayHistory([]), []);
    assert.deepEqual(replayHistory(null), []);
  });

  test('ein Schritt je Lauf, chronologisch', () => {
    const runs = [makeRun(5, 4), makeRun(0, 3), makeRun(9, 5)];
    const steps = replayHistory(runs);

    assert.equal(steps.length, 3);
    assert.deepEqual(steps.map((s) => s.date), [day(0), day(5), day(9)]);
  });

  test('die ungeordnete Eingabe ändert nichts am Ergebnis', () => {
    const runs = [makeRun(0, 3), makeRun(5, 4), makeRun(9, 5)];
    assert.deepEqual(replayHistory([...runs].reverse()), replayHistory(runs));
  });

  test('XP und Level wachsen monoton', () => {
    const runs = Array.from({ length: 25 }, (_, i) => makeRun(i, 3 + (i % 5)));
    const steps = replayHistory(runs);

    for (let i = 1; i < steps.length; i++) {
      assert.ok(steps[i].totalXp >= steps[i - 1].totalXp, `XP fallen bei Schritt ${i}`);
      assert.ok(steps[i].level >= steps[i - 1].level, `Level fällt bei Schritt ${i}`);
    }
  });

  test('einmal Freigeschaltetes bleibt freigeschaltet', () => {
    // Die Grundannahme des Moduls: alle Bedingungen sind monoton.
    const runs = [
      makeRun(0, 5, { timeOfDay: '05:30', durationMinutes: 30 }),
      makeRun(1, 5, { durationMinutes: 26 }),
      makeRun(2, 40),
      makeRun(30, 3),
      ...Array.from({ length: 10 }, (_, i) => makeRun(40 + i, 6)),
    ];

    const steps = replayHistory(runs);
    for (let i = 1; i < steps.length; i++) {
      for (const id of steps[i - 1].unlocked) {
        assert.ok(steps[i].unlocked.includes(id), `${id} ging bei Schritt ${i} verloren`);
      }
    }
  });

  test('der letzte Schritt entspricht dem Jetzt-Zustand', () => {
    const runs = [makeRun(0, 5), makeRun(1, 60), makeRun(2, 8)];
    const jetzt = evaluateAchievements(runs).filter((a) => a.unlocked).map((a) => a.id).sort();

    assert.deepEqual(replayHistory(runs).at(-1).unlocked.sort(), jetzt);
  });
});

describe('achievementUnlockDates', () => {
  test('ohne Läufe ist nichts freigeschaltet', () => {
    assert.equal(achievementUnlockDates([]).size, 0);
  });

  test('der erste Lauf schaltet Erste Meile am selben Tag frei', () => {
    const daten = achievementUnlockDates([makeRun(3, 5)]);
    assert.equal(daten.get('erste-meile'), day(3));
  });

  test('nennt den auslösenden Lauf, nicht den letzten', () => {
    // 50 km sind nach dem dritten Lauf voll, danach kommen noch zwei dazu.
    const runs = [makeRun(0, 20), makeRun(1, 20), makeRun(2, 20), makeRun(3, 5), makeRun(4, 5)];
    const daten = achievementUnlockDates(runs);

    assert.equal(daten.get('club-50-km'), day(2), 'nicht der Tag des letzten Laufs');
  });

  test('jedes freigeschaltete Achievement hat ein Datum', () => {
    const runs = [
      makeRun(0, 5, { timeOfDay: '06:00', durationMinutes: 30 }),
      ...Array.from({ length: 8 }, (_, i) => makeRun(i + 1, 12, { timeOfDay: '21:30' })),
      makeRun(30, 40),
    ];

    const jetzt = evaluateAchievements(runs).filter((a) => a.unlocked).map((a) => a.id);
    const daten = achievementUnlockDates(runs);

    assert.ok(jetzt.length > 3, 'Szenario schaltet zu wenig frei');
    for (const id of jetzt) {
      assert.ok(daten.has(id), `${id} ohne Datum`);
      assert.match(daten.get(id), /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('offene Achievements tauchen nicht auf', () => {
    const daten = achievementUnlockDates([makeRun(0, 5)]);
    assert.equal(daten.has('alter-hase'), false);
    assert.equal(daten.size, 1);
  });

  test('keine Daten für unbekannte Ids', () => {
    const daten = achievementUnlockDates([makeRun(0, 5)]);
    for (const id of daten.keys()) {
      assert.ok(ACHIEVEMENTS.some((a) => a.id === id), `unbekannte id ${id}`);
    }
  });
});

describe('Übungen in der Historie', () => {
  const uebung = (exerciseId, tag, n = 0) => ({ id: `u${n}`, exerciseId, date: day(tag) });

  test('Übungen allein ergeben schon eine Zeitachse', () => {
    const steps = replayHistory([], [uebung('kraft-plank', 3)]);

    assert.equal(steps.length, 1);
    assert.equal(steps[0].date, day(3));
    assert.ok(steps[0].unlocked.includes('erste-uebung'));
  });

  test('Läufe und Übungen werden nach Datum verwoben', () => {
    const steps = replayHistory(
      [makeRun(0, 5), makeRun(4, 5)],
      [uebung('kraft-plank', 2, 1), uebung('mob-wadendehnung', 6, 2)]
    );

    assert.deepEqual(steps.map((s) => s.date), [day(0), day(2), day(4), day(6)]);
  });

  test('Übungs-XP fliessen in den Verlauf ein', () => {
    const ohne = replayHistory([makeRun(0, 5)], []);
    const mit = replayHistory([makeRun(0, 5)], [uebung('kraft-plank', 0)]);

    assert.ok(mit.at(-1).totalXp > ohne.at(-1).totalXp, 'Übungen bringen keine XP');
  });

  test('Freischaltdatum nennt den auslösenden Tag', () => {
    const log = [uebung('kraft-plank', 1, 1), uebung('mob-wadendehnung', 5, 2)];
    const daten = achievementUnlockDates([], log);

    assert.equal(daten.get('erste-uebung'), day(1), 'nicht der letzte Eintrag');
  });

  test('auch mit Übungen bleibt alles monoton', () => {
    const runs = [makeRun(0, 5), makeRun(10, 40)];
    const log = Array.from({ length: 12 }, (_, i) => uebung('kraft-plank', i, i));
    const steps = replayHistory(runs, log);

    for (let i = 1; i < steps.length; i++) {
      assert.ok(steps[i].totalXp >= steps[i - 1].totalXp, `XP fallen bei ${i}`);
      for (const id of steps[i - 1].unlocked) {
        assert.ok(steps[i].unlocked.includes(id), `${id} ging bei ${i} verloren`);
      }
    }
  });

  test('das Protokoll ist wahlfrei', () => {
    assert.doesNotThrow(() => replayHistory([makeRun(0, 5)]));
    assert.doesNotThrow(() => achievementUnlockDates([makeRun(0, 5)]));
    assert.doesNotThrow(() => titleHistory([makeRun(0, 5)]));
  });
});

describe('titleHistory', () => {
  test('ohne Läufe nur der Starttitel', () => {
    assert.deepEqual(titleHistory([]), [{ title: 'Neuling', level: 1, date: null }]);
  });

  test('der Starttitel hat kein Datum – den hat man von Anfang an', () => {
    assert.equal(titleHistory([makeRun(0, 5)])[0].date, null);
  });

  test('Läufer wird bei Level 5 vermerkt', () => {
    // Level 5 braucht 360 XP; ein 40-km-Lauf bringt 400 plus Boni.
    const verlauf = titleHistory([makeRun(0, 5), makeRun(1, 40)]);
    const laeufer = verlauf.find((e) => e.title === 'Läufer');

    assert.ok(laeufer, 'Läufer fehlt in der Historie');
    assert.equal(laeufer.level, 5, 'der Titel gehört zu Level 5');
    assert.equal(laeufer.date, day(1));
  });

  test('ein grosser Sprung überspringt keine Stufe', () => {
    // Ein einziger sehr langer Lauf schiebt weit über Level 15 hinaus.
    const verlauf = titleHistory([makeRun(0, 900)]);
    const titel = verlauf.map((e) => e.title);

    assert.deepEqual(titel.slice(0, 3), ['Neuling', 'Läufer', 'Ausdauerläufer']);
    for (const eintrag of verlauf.slice(1)) {
      assert.equal(eintrag.date, day(0), 'alle am selben Tag erreicht');
    }
  });

  test('keine Dubletten und aufsteigende Level', () => {
    const runs = Array.from({ length: 40 }, (_, i) => makeRun(i, 10));
    const verlauf = titleHistory(runs);

    assert.equal(new Set(verlauf.map((e) => e.title)).size, verlauf.length, 'Titel doppelt');
    for (let i = 1; i < verlauf.length; i++) {
      assert.ok(verlauf[i].level > verlauf[i - 1].level, 'Level nicht aufsteigend');
    }
  });

  test('Daten laufen vorwärts', () => {
    const runs = Array.from({ length: 30 }, (_, i) => makeRun(i * 2, 12));
    const mitDatum = titleHistory(runs).filter((e) => e.date !== null);

    for (let i = 1; i < mitDatum.length; i++) {
      assert.ok(mitDatum[i].date >= mitDatum[i - 1].date, `Datum springt zurück bei ${i}`);
    }
  });

  test('wer klein bleibt, bleibt Neuling', () => {
    assert.deepEqual(titleHistory([makeRun(0, 1), makeRun(1, 1)]).map((e) => e.title), ['Neuling']);
  });
});
