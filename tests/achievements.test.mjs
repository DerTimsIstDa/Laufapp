import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACHIEVEMENTS,
  buildRunStats,
  evaluateAchievements,
  achievementXp,
  achievementsByCategory,
} from '../js/achievements.js';
import { getProgress, totalXpFromRuns } from '../js/xp.js';
import { CATEGORIES, EXERCISES } from '../js/exercises.js';
import { setExerciseCount } from '../js/exercise-log.js';
import { makeRun, day } from './helpers.mjs';

/** IDs aller freigeschalteten Achievements, alphabetisch. */
const unlockedIds = (runs) =>
  evaluateAchievements(runs)
    .filter((a) => a.unlocked)
    .map((a) => a.id)
    .sort();

const has = (runs, id) => unlockedIds(runs).includes(id);

/** n Läufe, weit genug auseinander, dass keine Serie entsteht. */
const spacedRuns = (count, distanceKm = 1) =>
  Array.from({ length: count }, (_, i) => makeRun(i * 100, distanceKm));

/** Läufe an aufeinanderfolgenden Tagen. */
const consecutiveRuns = (count, distanceKm = 3) =>
  Array.from({ length: count }, (_, i) => makeRun(i, distanceKm));

describe('Definitionen', () => {
  test('IDs sind eindeutig', () => {
    assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  });

  test('jedes Achievement ist vollständig', () => {
    for (const achievement of ACHIEVEMENTS) {
      assert.ok(achievement.name, `${achievement.id}: kein Name`);
      assert.ok(achievement.description, `${achievement.id}: keine Beschreibung`);
      assert.equal(typeof achievement.check, 'function', `${achievement.id}: keine Prüfung`);
      assert.ok(achievement.xp > 0, `${achievement.id}: keine XP`);
      assert.ok(
        ['meilenstein', 'herausforderung', 'uebung'].includes(achievement.category),
        `${achievement.id}: unbekannte Kategorie`
      );
    }
  });
});

describe('Leerer Zustand', () => {
  test('nichts freigeschaltet, keine Bonus-XP', () => {
    assert.deepEqual(unlockedIds([]), []);
    assert.equal(achievementXp(evaluateAchievements([])), 0);
  });
});

describe('Meilensteine nach Anzahl', () => {
  test('greifen genau an ihrer Schwelle', () => {
    const schwellen = [
      ['erste-meile', 1],
      ['aufgewaermt', 5],
      ['eingelaufen', 10],
      ['auf-kurs', 25],
      ['stammlaeufer', 50],
      ['alter-hase', 100],
      ['unermuedlich', 250],
    ];

    for (const [id, threshold] of schwellen) {
      assert.equal(has(spacedRuns(threshold - 1), id), false, `${id} bei ${threshold - 1} Läufen`);
      assert.equal(has(spacedRuns(threshold), id), true, `${id} bei ${threshold} Läufen`);
    }
  });
});

describe('Meilensteine nach Distanz', () => {
  test('50-km-Club', () => {
    assert.equal(has([makeRun(0, 49.9)], 'club-50-km'), false);
    assert.equal(has([makeRun(0, 50)], 'club-50-km'), true);
  });

  test('500-km-Club zählt über mehrere Läufe', () => {
    assert.equal(has([makeRun(0, 499)], 'club-500-km'), false);
    assert.equal(has([makeRun(0, 250), makeRun(100, 250)], 'club-500-km'), true);
  });

  test('jede Club-Stufe greift genau an ihrer Schwelle', () => {
    for (const [id, schwelle] of [
      ['club-50-km', 50],
      ['club-100-km', 100],
      ['club-250-km', 250],
      ['club-500-km', 500],
      ['club-1000-km', 1000],
    ]) {
      assert.equal(has([makeRun(0, schwelle - 0.1)], id), false, `${id} knapp darunter`);
      assert.equal(has([makeRun(0, schwelle)], id), true, `${id} genau auf der Schwelle`);
    }
  });

  test('die Stufen bauen aufeinander auf', () => {
    // 300 km schalten alles bis 250 frei und nichts darüber.
    const frei = unlockedIds([makeRun(0, 300)]);

    assert.ok(frei.includes('club-250-km'));
    assert.equal(frei.includes('club-500-km'), false);
  });
});

describe('Serientäter – 7 Tage in Folge', () => {
  test('greift ab dem siebten Tag', () => {
    assert.equal(has(consecutiveRuns(6), 'serientaeter'), false);
    assert.equal(has(consecutiveRuns(7), 'serientaeter'), true);
  });

  test('eine Lücke bricht die Serie', () => {
    const runs = [0, 1, 2, 4, 5].map((d) => makeRun(d, 3));
    assert.equal(buildRunStats(runs).longestDailyStreak, 3);
  });

  test('zwei Läufe am selben Tag zählen als ein Tag', () => {
    const runs = [makeRun(0, 3), makeRun(0, 4), makeRun(1, 3)];
    assert.equal(buildRunStats(runs).longestDailyStreak, 2);
  });
});

describe('Eiserner Wille – 30 Tage ohne Pause über 7 Tage', () => {
  test('29 Tage reichen nicht, 31 schon', () => {
    const knapp = [0, 7, 14, 21, 28].map((d) => makeRun(d, 3));
    const genug = [0, 7, 14, 21, 28, 30].map((d) => makeRun(d, 3));

    assert.equal(buildRunStats(knapp).longestWeeklyStreakDays, 29);
    assert.equal(has(knapp, 'eiserner-wille'), false);
    assert.equal(buildRunStats(genug).longestWeeklyStreakDays, 31);
    assert.equal(has(genug, 'eiserner-wille'), true);
  });

  test('eine Pause von 8 Tagen setzt die Spanne zurück', () => {
    const runs = [0, 7, 15, 22, 29, 36].map((d) => makeRun(d, 3));
    assert.equal(buildRunStats(runs).longestWeeklyStreakDays, 22);
  });
});

describe('Frühaufsteher und Nachteule', () => {
  test('Grenzen 7:00 und 21:00', () => {
    assert.equal(has([makeRun(0, 5, { timeOfDay: '06:59' })], 'fruehaufsteher'), true);
    assert.equal(has([makeRun(0, 5, { timeOfDay: '07:00' })], 'fruehaufsteher'), false);
    assert.equal(has([makeRun(0, 5, { timeOfDay: '21:00' })], 'nachteule'), true);
    assert.equal(has([makeRun(0, 5, { timeOfDay: '20:59' })], 'nachteule'), false);
  });

  test('ohne Uhrzeit bleibt beides gesperrt', () => {
    const runs = [makeRun(0, 5)];
    assert.equal(has(runs, 'fruehaufsteher'), false);
    assert.equal(has(runs, 'nachteule'), false);
  });

  test('unbrauchbare Uhrzeit wird ignoriert statt zu stören', () => {
    assert.equal(has([makeRun(0, 5, { timeOfDay: 'abc' })], 'fruehaufsteher'), false);
    assert.equal(has([makeRun(0, 5, { timeOfDay: '99:99' })], 'nachteule'), false);
  });

  /** n Läufe zur gegebenen Uhrzeit, weit genug auseinander für keine Serie. */
  const zurZeit = (count, timeOfDay) =>
    Array.from({ length: count }, (_, i) => makeRun(i * 100, 3, { timeOfDay }));

  test('die frühen Stufen greifen an ihrer Schwelle', () => {
    for (const [id, schwelle] of [
      ['fruehaufsteher', 1],
      ['morgenroutine', 5],
      ['morgenmensch', 15],
    ]) {
      assert.equal(has(zurZeit(schwelle - 1, '05:30'), id), false, `${id} knapp darunter`);
      assert.equal(has(zurZeit(schwelle, '05:30'), id), true, `${id} auf der Schwelle`);
    }
  });

  test('die späten Stufen greifen an ihrer Schwelle', () => {
    for (const [id, schwelle] of [
      ['nachteule', 1],
      ['abendrunde', 5],
      ['nachtschicht', 15],
    ]) {
      assert.equal(has(zurZeit(schwelle - 1, '22:30'), id), false, `${id} knapp darunter`);
      assert.equal(has(zurZeit(schwelle, '22:30'), id), true, `${id} auf der Schwelle`);
    }
  });

  test('früh und spät zählen getrennt', () => {
    const gemischt = [...zurZeit(5, '05:30'), ...Array.from({ length: 5 }, (_, i) => makeRun(1000 + i * 100, 3, { timeOfDay: '22:30' }))];
    const stats = buildRunStats(gemischt);

    assert.equal(stats.earlyRunCount, 5);
    assert.equal(stats.lateRunCount, 5);
    assert.ok(has(gemischt, 'morgenroutine'));
    assert.ok(has(gemischt, 'abendrunde'));
    assert.equal(has(gemischt, 'morgenmensch'), false, '10 Läufe sind keine 15 frühen');
  });

  test('Läufe ohne Uhrzeit zählen für keine Seite', () => {
    const stats = buildRunStats([...zurZeit(3, '05:30'), makeRun(9000, 5), makeRun(9100, 5)]);

    assert.equal(stats.earlyRunCount, 3);
    assert.equal(stats.lateRunCount, 0);
  });
});

describe('Neue Bestzeit', () => {
  test('braucht eine Verbesserung, nicht nur einen Lauf', () => {
    assert.equal(has([makeRun(0, 5, { durationMinutes: 30 })], 'neue-bestzeit'), false);
    assert.equal(
      has([makeRun(0, 5, { durationMinutes: 30 }), makeRun(1, 5, { durationMinutes: 28 })], 'neue-bestzeit'),
      true
    );
  });

  test('langsamer als vorher zählt nicht', () => {
    const runs = [makeRun(0, 5, { durationMinutes: 28 }), makeRun(1, 5, { durationMinutes: 30 })];
    assert.equal(has(runs, 'neue-bestzeit'), false);
  });

  test('ohne Dauer keine Wertung', () => {
    assert.equal(has([makeRun(0, 5), makeRun(1, 5)], 'neue-bestzeit'), false);
  });

  test('5 und 10 km werden getrennt gewertet', () => {
    const runs = [makeRun(0, 5, { durationMinutes: 30 }), makeRun(1, 10, { durationMinutes: 55 })];
    assert.equal(has(runs, 'neue-bestzeit'), false);
  });

  test('Toleranz ist ±0,5 km', () => {
    const drin = [makeRun(0, 5, { durationMinutes: 30 }), makeRun(1, 5.5, { durationMinutes: 29 })];
    const draussen = [makeRun(0, 7, { durationMinutes: 40 }), makeRun(1, 7, { durationMinutes: 38 })];

    assert.equal(has(drin, 'neue-bestzeit'), true);
    assert.equal(has(draussen, 'neue-bestzeit'), false);
  });
});

describe('Comeback', () => {
  test('ab 14 Tagen Pause', () => {
    assert.equal(has([makeRun(0, 5), makeRun(13, 5)], 'comeback'), false);
    assert.equal(has([makeRun(0, 5), makeRun(14, 5)], 'comeback'), true);
  });

  test('ein einzelner Lauf ist kein Comeback', () => {
    assert.equal(has([makeRun(0, 5)], 'comeback'), false);
  });
});

describe('Der lange Atem', () => {
  test('braucht 20 % mehr als den bisher längsten Lauf', () => {
    assert.equal(has([makeRun(0, 10)], 'langer-atem'), false);
    assert.equal(has([makeRun(0, 10), makeRun(1, 11.9)], 'langer-atem'), false);
    assert.equal(has([makeRun(0, 10), makeRun(1, 12)], 'langer-atem'), true);
  });

  test('die Reihenfolge zählt – erst lang, dann kurz reicht nicht', () => {
    assert.equal(has([makeRun(0, 12), makeRun(1, 10)], 'langer-atem'), false);
  });
});

describe('Zusammenspiel mit dem XP-System', () => {
  test('Bonus-XP fließen in Level und Fortschritt ein', () => {
    const runs = [makeRun(0, 7)];
    const evaluated = evaluateAchievements(runs);

    assert.deepEqual(
      evaluated.filter((a) => a.unlocked).map((a) => a.id),
      ['erste-meile']
    );
    assert.equal(achievementXp(evaluated), 15);

    const progress = getProgress(totalXpFromRuns(runs) + achievementXp(evaluated));
    assert.equal(progress.totalXp, 85, '70 aus dem Lauf plus 15 Bonus');
    assert.equal(progress.level, 2);
    assert.equal(progress.xpIntoLevel, 25);
  });

  test('Löschen eines Laufs sperrt das Achievement wieder', () => {
    const runs = [makeRun(0, 5), makeRun(1, 5), makeRun(2, 5), makeRun(3, 5), makeRun(4, 5)];
    assert.equal(has(runs, 'aufgewaermt'), true);
    assert.equal(has(runs.slice(1), 'aufgewaermt'), false);
  });
});

describe('Übungs-Achievements', () => {
  const eintrag = (exerciseId, date, n = 0) => ({ id: `e${n}`, exerciseId, date });
  const nUebungen = (count) =>
    Array.from({ length: count }, (_, i) => eintrag('kraft-plank', day(i), i));

  /** Freigeschaltete Ids bei gegebenem Übungsprotokoll, ohne Läufe. */
  const mitUebungen = (log) =>
    evaluateAchievements([], log).filter((a) => a.unlocked).map((a) => a.id).sort();

  test('ohne Übungen ist keines davon frei', () => {
    assert.deepEqual(mitUebungen([]), []);
  });

  test('greifen an ihren Schwellen', () => {
    for (const [id, schwelle] of [['erste-uebung', 1], ['dranbleiber', 10], ['uebungsroutine', 50]]) {
      assert.equal(mitUebungen(nUebungen(schwelle - 1)).includes(id), false, `${id} zu früh`);
      assert.equal(mitUebungen(nUebungen(schwelle)).includes(id), true, `${id} greift nicht`);
    }
  });

  test('der Zähler zählt Mehrfachnennungen am selben Tag mit', () => {
    // Zehnmal dieselbe Übung am selben Tag: ein XP-Tag, aber zehn Erledigungen.
    const log = Array.from({ length: 10 }, (_, i) => eintrag('kraft-plank', day(0), i));
    assert.equal(mitUebungen(log).includes('dranbleiber'), true);
  });

  test('Vielseitig braucht alle fünf Kategorien', () => {
    const ids = CATEGORIES.map((k) => EXERCISES.find((e) => e.category === k.id).id);

    const vier = ids.slice(0, 4).map((id, i) => eintrag(id, day(i), i));
    assert.equal(mitUebungen(vier).includes('vielseitig'), false, 'vier reichen nicht');

    const fuenf = ids.map((id, i) => eintrag(id, day(i), i));
    assert.equal(mitUebungen(fuenf).includes('vielseitig'), true);
  });

  test('Fortschritt wird für alle vier gemeldet', () => {
    const bewertet = evaluateAchievements([], nUebungen(3));

    for (const id of ['erste-uebung', 'dranbleiber', 'uebungsroutine', 'vielseitig']) {
      const a = bewertet.find((x) => x.id === id);
      assert.ok(a.progress, `${id} ohne Fortschritt`);
      assert.ok(a.progress.target > 0);
    }
  });

  test('Läufe schalten keine Übungs-Achievements frei', () => {
    const nurLaeufe = evaluateAchievements(spacedRuns(60), []).filter((a) => a.unlocked).map((a) => a.id);
    assert.equal(nurLaeufe.some((id) => id.includes('uebung')), false);
    assert.equal(nurLaeufe.includes('dranbleiber'), false);
    assert.equal(nurLaeufe.includes('vielseitig'), false);
  });

  test('Übungen schalten keine Lauf-Achievements frei', () => {
    assert.deepEqual(mitUebungen(nUebungen(60)).filter((id) => id === 'erste-meile'), []);
  });

  test('das Protokoll ist wahlfrei – alter Aufruf bleibt gültig', () => {
    assert.doesNotThrow(() => evaluateAchievements([makeRun(0, 5)]));
  });
});

describe('Handkorrektur setzt Achievements zurück', () => {
  const zehnTage = Array.from({ length: 10 }, (_, i) => ({
    id: `u${i}`,
    exerciseId: 'kraft-plank',
    date: day(i),
  }));

  const frei = (log) => evaluateAchievements([], log).filter((a) => a.unlocked).map((a) => a.id);

  test('unter die Schwelle korrigiert verliert das Achievement', () => {
    assert.ok(frei(zehnTage).includes('dranbleiber'), 'Ausgangslage stimmt nicht');

    const nachKorrektur = setExerciseCount(zehnTage, 'kraft-plank', 9, { date: day(20) });

    assert.equal(frei(nachKorrektur).includes('dranbleiber'), false, 'bleibt fälschlich frei');
    assert.ok(frei(nachKorrektur).includes('erste-uebung'), 'die kleinere Stufe bleibt');
  });

  test('auf null korrigiert verliert auch die erste Stufe', () => {
    const leer = setExerciseCount(zehnTage, 'kraft-plank', 0, {});
    assert.deepEqual(frei(leer), []);
  });

  test('Vielseitig fällt weg, wenn eine Kategorie geleert wird', () => {
    const ids = CATEGORIES.map((k) => EXERCISES.find((e) => e.category === k.id).id);
    const alleFuenf = ids.map((id, i) => ({ id: `v${i}`, exerciseId: id, date: day(i) }));

    assert.ok(frei(alleFuenf).includes('vielseitig'));

    const ohneEine = setExerciseCount(alleFuenf, ids[2], 0, {});
    assert.equal(frei(ohneEine).includes('vielseitig'), false);
  });

  test('die XP fallen mit', () => {
    const vorher = achievementXp(evaluateAchievements([], zehnTage));
    const nachher = achievementXp(evaluateAchievements([], setExerciseCount(zehnTage, 'kraft-plank', 5, {})));

    assert.ok(nachher < vorher, `XP sind nicht gefallen: ${vorher} -> ${nachher}`);
  });

  test('wieder hochkorrigiert kommt es zurück', () => {
    const runter = setExerciseCount(zehnTage, 'kraft-plank', 5, {});
    const rauf = setExerciseCount(runter, 'kraft-plank', 10, { date: day(20) });

    assert.ok(frei(rauf).includes('dranbleiber'));
  });
});

describe('achievementsByCategory', () => {
  test('zählt je Gruppe', () => {
    const bewertet = evaluateAchievements([], []);
    const gruppen = achievementsByCategory(bewertet);

    assert.deepEqual(gruppen.map((g) => g.id), ['meilenstein', 'herausforderung', 'uebung']);
    for (const gruppe of gruppen) {
      assert.equal(gruppe.unlocked, 0, `${gruppe.id} sollte leer starten`);
      assert.ok(gruppe.total > 0, `${gruppe.id} ohne Achievements`);
    }
  });

  test('die Summen ergeben den Gesamtbestand', () => {
    const gruppen = achievementsByCategory(evaluateAchievements([], []));
    assert.equal(gruppen.reduce((n, g) => n + g.total, 0), ACHIEVEMENTS.length);
  });

  test('jede vergebene Kategorie hat eine Gruppe', () => {
    const bekannt = new Set(achievementsByCategory([]).map((g) => g.id));
    for (const achievement of ACHIEVEMENTS) {
      assert.ok(bekannt.has(achievement.category), `${achievement.category} fehlt in der Übersicht`);
    }
  });

  test('zählt Freigeschaltetes richtig', () => {
    const log = [{ id: 'u1', exerciseId: 'kraft-plank', date: day(0) }];
    const uebungen = achievementsByCategory(evaluateAchievements([], log)).find((g) => g.id === 'uebung');

    assert.equal(uebungen.unlocked, 1, 'nur die erste Übung');
    // Mitgezählt statt fest verdrahtet: die Gruppe darf wachsen.
    assert.equal(uebungen.total, ACHIEVEMENTS.filter((a) => a.category === 'uebung').length);
  });

  test('leere Eingabe kippt nicht', () => {
    assert.doesNotThrow(() => achievementsByCategory(null));
    assert.equal(achievementsByCategory(null).every((g) => g.total === 0), true);
  });
});

describe('Vollständigkeit', () => {
  const langesLaufjahr = [
    makeRun(0, 5, { timeOfDay: '06:00', durationMinutes: 30 }),
    // 80 Tage am Stück: deckt Tagesserie, Wochenserie und Läufe je Woche ab.
    ...Array.from({ length: 80 }, (_, i) =>
      makeRun(i + 1, 13, { timeOfDay: '22:00', durationMinutes: 70 })
    ),
    // Dieselbe Distanz deutlich schneller als oben: Bestzeit, Pace unter 5:00
    // und zusammen mit dem ersten Lauf (6:00) über 30 Sekunden Verbesserung.
    makeRun(81, 5, { durationMinutes: 24 }),
    // Zweiter Lauf am selben Tag.
    makeRun(81, 4),
    // 19 Tage Pause, dann weit über den bisher längsten Lauf.
    makeRun(100, 30),
    ...Array.from({ length: 200 }, (_, i) => makeRun(300 + i * 100, 20)),
    // Weit auseinander und ohne Uhrzeit-Nachbarn: die frühen Läufe sollen die
    // Zähler füllen, aber keine Serie und keine Pause verfälschen.
    ...Array.from({ length: 14 }, (_, i) => makeRun(30_000 + i * 100, 6, { timeOfDay: '06:00' })),
  ];

  /**
   * 100 Erledigungen an aufeinanderfolgenden Tagen, reihum durch die ganze
   * Bibliothek – damit ist jede Übung mehrfach dran und jede Kategorie voll.
   */
  const vieleUebungen = Array.from({ length: 100 }, (_, i) => ({
    id: `u${i}`,
    exerciseId: EXERCISES[i % EXERCISES.length].id,
    date: day(i),
  }));

  test('Läufe allein schalten alle Lauf-Achievements frei', () => {
    const laufIds = ACHIEVEMENTS.filter((a) => a.category !== 'uebung').map((a) => a.id).sort();

    assert.ok(langesLaufjahr.length >= 250, 'Szenario muss auch Unermüdlich erreichen');
    assert.deepEqual(unlockedIds(langesLaufjahr), laufIds);
  });

  test('Läufe und Übungen zusammen schalten alles frei', () => {
    const alle = evaluateAchievements(langesLaufjahr, vieleUebungen);

    assert.deepEqual(
      alle.filter((a) => a.unlocked).map((a) => a.id).sort(),
      ACHIEVEMENTS.map((a) => a.id).sort()
    );
    assert.equal(
      achievementXp(alle),
      ACHIEVEMENTS.reduce((sum, a) => sum + a.xp, 0)
    );
  });
});

describe('Neue Kennzahlen aus den Läufen', () => {
  test('Läufe je Tag und je Woche', () => {
    // Zwei am selben Tag, danach zwei weitere in derselben Woche.
    const stats = buildRunStats([
      makeRun(0, 5),
      makeRun(0, 3),
      makeRun(1, 4),
      makeRun(2, 4),
      makeRun(40, 4),
    ]);

    assert.equal(stats.maxRunsPerDay, 2);
    assert.equal(stats.maxRunsPerWeek, 4, 'die vier Läufe der ersten Woche');
    assert.equal(stats.activeDays, 4, 'zwei Läufe an einem Tag sind ein Tag');
  });

  test('aktive Wochen und Wochen in Folge sind zweierlei', () => {
    // 2026-01-01 ist ein Donnerstag. Tag 0 und 7 liegen in Folgewochen,
    // Tag 100 steht allein.
    const stats = buildRunStats([makeRun(0, 3), makeRun(7, 3), makeRun(100, 3)]);

    assert.equal(stats.activeWeeks, 3);
    assert.equal(stats.longestWeekStreak, 2, 'die Lücke bricht die Serie');
  });

  test('Kalendermonate werden gezählt, nicht Zeiträume von 30 Tagen', () => {
    const stats = buildRunStats([makeRun(0, 3), makeRun(31, 3), makeRun(60, 3)]);
    assert.equal(stats.activeMonths, 3);
  });

  test('längster Lauf und Gesamtdauer', () => {
    const stats = buildRunStats([
      makeRun(0, 5, { durationMinutes: 30 }),
      makeRun(1, 12),
      makeRun(2, 8, { durationMinutes: 50 }),
    ]);

    assert.equal(stats.maxDistanceKm, 12);
    assert.equal(stats.totalDurationMinutes, 80, 'der Lauf ohne Dauer zählt nicht mit');
  });

  test('die beste Pace ignoriert kurze Strecken', () => {
    // 1 km in 4 Minuten waere 4:00, zaehlt aber nicht: zu kurz.
    const kurz = buildRunStats([makeRun(0, 1, { durationMinutes: 4 })]);
    assert.equal(kurz.bestPaceMinPerKm, null);

    const lang = buildRunStats([
      makeRun(0, 5, { durationMinutes: 30 }),
      makeRun(1, 4, { durationMinutes: 22 }),
    ]);
    assert.equal(lang.bestPaceMinPerKm, 5.5, 'die schnellere der beiden');
  });

  test('ohne eingetragene Dauer gibt es keine Pace', () => {
    assert.equal(buildRunStats([makeRun(0, 10)]).bestPaceMinPerKm, null);
    assert.equal(has([makeRun(0, 10)], 'flott-unterwegs'), false);
  });

  test('die Pace-Trophäe greift unter 6:00 min/km', () => {
    assert.equal(has([makeRun(0, 5, { durationMinutes: 30 })], 'flott-unterwegs'), false);
    assert.equal(has([makeRun(0, 5, { durationMinutes: 29 })], 'flott-unterwegs'), true);
  });
});

describe('Neue Kennzahlen aus den Übungen', () => {
  /** Wie `has`, aber für den Übungs-Zweig: die Läufe bleiben leer. */
  const hat = (log, id) =>
    evaluateAchievements([], log)
      .filter((a) => a.unlocked)
      .some((a) => a.id === id);

  /** Eine Erledigung je Tag, reihum durch die Bibliothek. */
  const reihum = (anzahl, startTag = 0) =>
    Array.from({ length: anzahl }, (_, i) => ({
      id: `u${i}`,
      exerciseId: EXERCISES[i % EXERCISES.length].id,
      date: day(startTag + i),
    }));

  test('Tage zählen anders als Erledigungen', () => {
    const dreimalAmSelbenTag = [0, 1, 2].map((i) => ({
      id: `u${i}`,
      exerciseId: EXERCISES[i].id,
      date: day(0),
    }));

    assert.equal(hat(dreimalAmSelbenTag, 'fuenf-uebungstage'), false, 'ein Tag bleibt ein Tag');
    assert.equal(hat(reihum(5), 'fuenf-uebungstage'), true);
  });

  test('die Übungsserie bricht bei einer Lücke', () => {
    const mitLuecke = [...reihum(3), ...reihum(3, 10)];

    assert.equal(hat(reihum(3), 'uebungsserie-3'), true);
    assert.equal(hat(mitLuecke, 'uebungsserie-7'), false, '3 und 3 sind keine 7 in Folge');
    assert.equal(hat(reihum(7), 'uebungsserie-7'), true);
  });

  test('verschiedene Übungen statt oft dieselbe', () => {
    const immerDieselbe = Array.from({ length: 20 }, (_, i) => ({
      id: `u${i}`,
      exerciseId: EXERCISES[0].id,
      date: day(i),
    }));

    assert.equal(hat(immerDieselbe, 'fuenf-verschiedene'), false);
    assert.equal(hat(reihum(5), 'fuenf-verschiedene'), true);
    assert.equal(hat(reihum(10), 'zehn-verschiedene'), true);
    assert.equal(hat(reihum(20), 'zwanzig-verschiedene'), true);
  });

  test('eine volle Reihe ist eine komplette Kategorie', () => {
    const aufwaermen = EXERCISES.filter((e) => e.category === CATEGORIES[0].id);
    const halb = aufwaermen.slice(0, -1).map((e, i) => ({ id: `u${i}`, exerciseId: e.id, date: day(i) }));
    const ganz = aufwaermen.map((e, i) => ({ id: `u${i}`, exerciseId: e.id, date: day(i) }));

    assert.equal(hat(halb, 'volle-reihe'), false, 'eine Übung fehlt noch');
    assert.equal(hat(ganz, 'volle-reihe'), true);
    assert.equal(hat(ganz, 'zwei-volle-reihen'), false);
  });
});

describe('Pace-Trophäen', () => {
  /** n Läufe mit dieser Pace, weit genug auseinander für keine Serie. */
  const mitPace = (anzahl, paceMinPerKm, distanceKm = 5) =>
    Array.from({ length: anzahl }, (_, i) => makeRun(i * 100, distanceKm, { paceMinPerKm }));

  test('die drei Stufen greifen strikt unter ihrer Schwelle', () => {
    for (const [id, schwelle] of [
      ['flott-unterwegs', 6],
      ['zuegig', 5.5],
      ['unter-fuenf', 5],
    ]) {
      assert.equal(has(mitPace(1, schwelle), id), false, `${id} genau auf der Schwelle`);
      assert.equal(has(mitPace(1, schwelle - 0.01), id), true, `${id} knapp darunter`);
    }
  });

  test('die Stufen bauen aufeinander auf', () => {
    const frei = unlockedIds(mitPace(1, 4.9));

    assert.ok(frei.includes('flott-unterwegs'));
    assert.ok(frei.includes('zuegig'));
    assert.ok(frei.includes('unter-fuenf'));
  });

  test('kurze Läufe zählen nicht – ein Sprint ist kein Ausdauerbeleg', () => {
    assert.equal(has(mitPace(1, 4, 2.9), 'unter-fuenf'), false);
    assert.equal(has(mitPace(1, 4, 3), 'unter-fuenf'), true);
  });

  test('eine von Hand eingetragene Pace zählt genauso', () => {
    // Ohne Dauer, nur mit Pace – aus Teil 1 des Formulars.
    const nurPace = [{ id: 'a', date: day(0), distanceKm: 5, paceMinPerKm: 5.2 }];
    assert.equal(has(nurPace, 'zuegig'), true);
  });

  test('Läufe ohne Pace verursachen keinen Fehler', () => {
    const ohne = [makeRun(0, 10), makeRun(100, 12)];

    assert.doesNotThrow(() => buildRunStats(ohne));
    assert.equal(buildRunStats(ohne).bestPaceMinPerKm, null);
    assert.equal(buildRunStats(ohne).steadyPaceRunCount, 0);
    assert.equal(has(ohne, 'flott-unterwegs'), false);
  });

  test('die Zähler der Meilensteine greifen an ihrer Schwelle', () => {
    for (const [id, schwelle] of [
      ['fuenfmal-flott', 5],
      ['regelmaessig-flott', 15],
    ]) {
      assert.equal(has(mitPace(schwelle - 1, 5.5), id), false, `${id} knapp darunter`);
      assert.equal(has(mitPace(schwelle, 5.5), id), true, `${id} auf der Schwelle`);
    }
  });

  test('langsame Läufe füllen den Zähler nicht', () => {
    assert.equal(has(mitPace(10, 6.5), 'fuenfmal-flott'), false);
  });

  describe('Schneller geworden', () => {
    test('misst gegen den ersten gewerteten Lauf', () => {
      const runs = [
        makeRun(0, 5, { paceMinPerKm: 6 }),
        makeRun(10, 5, { paceMinPerKm: 5.6 }),
      ];

      // Nicht auf die Nachkommastelle festnageln: 6 − 5,6 ist im Fließkomma
      // nicht exakt 0,4, und für die Trophäe zählt ohnehin nur die Schwelle.
      assert.ok(Math.abs(buildRunStats(runs).paceImprovementMin - 0.4) < 1e-9);
      assert.equal(has(runs, 'schneller-geworden'), false, '24 Sekunden reichen nicht');

      const schneller = [...runs, makeRun(20, 5, { paceMinPerKm: 5.5 })];
      assert.equal(has(schneller, 'schneller-geworden'), true, '30 Sekunden reichen');
    });

    test('ein späterer langsamer Lauf nimmt die Verbesserung nicht weg', () => {
      // Sonst verschwaende eine Trophaee wieder, weil man einmal ruhig lief.
      const runs = [
        makeRun(0, 5, { paceMinPerKm: 6 }),
        makeRun(10, 5, { paceMinPerKm: 5.4 }),
        makeRun(20, 5, { paceMinPerKm: 7 }),
      ];

      assert.equal(has(runs, 'schneller-geworden'), true);
    });

    test('wer schnell anfängt, hat nichts zu verbessern', () => {
      const runs = [makeRun(0, 5, { paceMinPerKm: 5 }), makeRun(10, 5, { paceMinPerKm: 5.5 })];

      assert.equal(buildRunStats(runs).paceImprovementMin, 0, 'nie negativ');
      assert.equal(has(runs, 'schneller-geworden'), false);
    });

    test('ein einziger Lauf ergibt keine Verbesserung', () => {
      assert.equal(buildRunStats(mitPace(1, 4)).paceImprovementMin, 0);
    });
  });
});
