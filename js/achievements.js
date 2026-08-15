/**
 * Achievement-System.
 *
 * Wie die XP werden auch die Achievements NICHT gespeichert, sondern bei
 * jedem Render aus der Lauf-Liste neu abgeleitet. Dadurch stimmt der Stand
 * immer – auch wenn ein Lauf nachträglich gelöscht wird.
 *
 * Neues Achievement ergänzen: einen Eintrag in ACHIEVEMENTS hinzufügen.
 * Reicht die vorhandene Statistik nicht aus, in buildRunStats() ein Feld
 * ergänzen. Sonst muss nichts angefasst werden.
 */

import { buildExerciseStats } from './exercise-log.js';

/** Distanzen, auf denen persönliche Rekorde gezählt werden (km). */
const PR_DISTANCES_KM = [5, 10];

/** Toleranz, mit der ein Lauf einer PR-Distanz zugeordnet wird (km). */
const PR_TOLERANCE_KM = 0.5;

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} name
 * @property {string} description  Bedingung in einem Satz
 * @property {number} xp           Bonus-XP beim Freischalten
 * @property {'meilenstein'|'herausforderung'|'uebung'} category
 * @property {(stats: RunStats) => boolean} check
 * @property {(stats: RunStats) => {current: number, target: number, unit: string}} [progress]
 */

/** @type {Achievement[]} */
export const ACHIEVEMENTS = [
  // --- Meilensteine (kumulativ) -------------------------------------------
  {
    id: 'erste-meile',
    name: 'Erste Meile',
    description: 'Trage deinen ersten Lauf ein.',
    xp: 15,
    category: 'meilenstein',
    check: (s) => s.runCount >= 1,
    progress: (s) => ({ current: s.runCount, target: 1, unit: 'Läufe' }),
  },
  {
    id: 'aufgewaermt',
    name: 'Aufgewärmt',
    description: '5 Läufe eingetragen.',
    xp: 30,
    category: 'meilenstein',
    check: (s) => s.runCount >= 5,
    progress: (s) => ({ current: s.runCount, target: 5, unit: 'Läufe' }),
  },
  {
    id: 'eingelaufen',
    name: 'Eingelaufen',
    description: '10 Läufe eingetragen.',
    xp: 50,
    category: 'meilenstein',
    check: (s) => s.runCount >= 10,
    progress: (s) => ({ current: s.runCount, target: 10, unit: 'Läufe' }),
  },
  {
    id: 'auf-kurs',
    name: 'Auf Kurs',
    description: '25 Läufe eingetragen.',
    xp: 80,
    category: 'meilenstein',
    check: (s) => s.runCount >= 25,
    progress: (s) => ({ current: s.runCount, target: 25, unit: 'Läufe' }),
  },
  {
    id: 'stammlaeufer',
    name: 'Stammläufer',
    description: '50 Läufe eingetragen.',
    xp: 150,
    category: 'meilenstein',
    check: (s) => s.runCount >= 50,
    progress: (s) => ({ current: s.runCount, target: 50, unit: 'Läufe' }),
  },
  {
    id: 'alter-hase',
    name: 'Alter Hase',
    description: '100 Läufe eingetragen.',
    xp: 250,
    category: 'meilenstein',
    check: (s) => s.runCount >= 100,
    progress: (s) => ({ current: s.runCount, target: 100, unit: 'Läufe' }),
  },
  {
    id: 'unermuedlich',
    name: 'Unermüdlich',
    description: '250 Läufe eingetragen.',
    xp: 500,
    category: 'meilenstein',
    check: (s) => s.runCount >= 250,
    progress: (s) => ({ current: s.runCount, target: 250, unit: 'Läufe' }),
  },
  {
    id: 'club-50-km',
    name: '50-km-Club',
    description: '50 km Gesamtdistanz erreicht.',
    xp: 50,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 50,
    progress: (s) => ({ current: s.totalDistanceKm, target: 50, unit: 'km' }),
  },
  {
    id: 'club-100-km',
    name: '100-km-Club',
    description: '100 km Gesamtdistanz erreicht.',
    xp: 90,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 100,
    progress: (s) => ({ current: s.totalDistanceKm, target: 100, unit: 'km' }),
  },
  {
    id: 'club-250-km',
    name: '250-km-Club',
    description: '250 km Gesamtdistanz erreicht.',
    xp: 180,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 250,
    progress: (s) => ({ current: s.totalDistanceKm, target: 250, unit: 'km' }),
  },
  {
    id: 'club-500-km',
    name: '500-km-Club',
    description: '500 km Gesamtdistanz erreicht.',
    xp: 300,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 500,
    progress: (s) => ({ current: s.totalDistanceKm, target: 500, unit: 'km' }),
  },
  {
    id: 'club-1000-km',
    name: '1000-km-Club',
    description: '1000 km Gesamtdistanz erreicht.',
    xp: 600,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 1000,
    progress: (s) => ({ current: s.totalDistanceKm, target: 1000, unit: 'km' }),
  },
  {
    id: 'serientaeter',
    name: 'Serientäter',
    description: 'An 7 Tagen in Folge gelaufen.',
    xp: 35,
    category: 'meilenstein',
    check: (s) => s.longestDailyStreak >= 7,
    progress: (s) => ({ current: s.longestDailyStreak, target: 7, unit: 'Tage' }),
  },
  {
    id: 'eiserner-wille',
    name: 'Eiserner Wille',
    description: '30 Tage am Stück dabeigeblieben, ohne Pause über 7 Tage.',
    xp: 120,
    category: 'meilenstein',
    check: (s) => s.longestWeeklyStreakDays >= 30,
    progress: (s) => ({
      current: s.longestWeeklyStreakDays,
      target: 30,
      unit: 'Tage',
    }),
  },

  // --- Herausforderungen (situativ) ---------------------------------------
  {
    id: 'fruehaufsteher',
    name: 'Frühaufsteher',
    description: 'Ein Lauf vor 7:00 Uhr (Uhrzeit eintragen).',
    xp: 15,
    category: 'herausforderung',
    check: (s) => s.earlyRunCount >= 1,
    progress: (s) => ({ current: s.earlyRunCount, target: 1, unit: 'Läufe' }),
  },
  {
    id: 'morgenroutine',
    name: 'Morgenroutine',
    description: '5 Läufe vor 7:00 Uhr.',
    xp: 40,
    category: 'herausforderung',
    check: (s) => s.earlyRunCount >= 5,
    progress: (s) => ({ current: s.earlyRunCount, target: 5, unit: 'Läufe' }),
  },
  {
    id: 'morgenmensch',
    name: 'Morgenmensch',
    description: '15 Läufe vor 7:00 Uhr.',
    xp: 90,
    category: 'herausforderung',
    check: (s) => s.earlyRunCount >= 15,
    progress: (s) => ({ current: s.earlyRunCount, target: 15, unit: 'Läufe' }),
  },
  {
    id: 'nachteule',
    name: 'Nachteule',
    description: 'Ein Lauf ab 21:00 Uhr (Uhrzeit eintragen).',
    xp: 15,
    category: 'herausforderung',
    check: (s) => s.lateRunCount >= 1,
    progress: (s) => ({ current: s.lateRunCount, target: 1, unit: 'Läufe' }),
  },
  {
    id: 'abendrunde',
    name: 'Abendrunde',
    description: '5 Läufe ab 21:00 Uhr.',
    xp: 40,
    category: 'herausforderung',
    check: (s) => s.lateRunCount >= 5,
    progress: (s) => ({ current: s.lateRunCount, target: 5, unit: 'Läufe' }),
  },
  {
    id: 'nachtschicht',
    name: 'Nachtschicht',
    description: '15 Läufe ab 21:00 Uhr.',
    xp: 90,
    category: 'herausforderung',
    check: (s) => s.lateRunCount >= 15,
    progress: (s) => ({ current: s.lateRunCount, target: 15, unit: 'Läufe' }),
  },
  {
    id: 'neue-bestzeit',
    name: 'Neue Bestzeit',
    description: 'Persönlicher Rekord auf 5 oder 10 km (Dauer eintragen).',
    xp: 25,
    category: 'herausforderung',
    check: (s) => s.hasPersonalBest,
  },
  {
    id: 'comeback',
    name: 'Comeback',
    description: 'Wieder gelaufen nach mindestens 14 Tagen Pause.',
    xp: 10,
    category: 'herausforderung',
    check: (s) => s.hasComeback,
  },
  {
    id: 'langer-atem',
    name: 'Der lange Atem',
    description: 'Den bisher längsten Lauf um mindestens 20 % übertroffen.',
    xp: 60,
    category: 'herausforderung',
    check: (s) => s.hasLongRunBreakthrough,
  },

  // --- Übungen ------------------------------------------------------------
  {
    id: 'erste-uebung',
    name: 'Erste Übung',
    description: 'Eine Übung als erledigt abgehakt.',
    xp: 10,
    category: 'uebung',
    check: (s) => s.exerciseCompletions >= 1,
    progress: (s) => ({ current: s.exerciseCompletions, target: 1, unit: 'Übungen' }),
  },
  {
    id: 'dranbleiber',
    name: 'Dranbleiber',
    description: '10 Übungen insgesamt erledigt.',
    xp: 30,
    category: 'uebung',
    check: (s) => s.exerciseCompletions >= 10,
    progress: (s) => ({ current: s.exerciseCompletions, target: 10, unit: 'Übungen' }),
  },
  {
    id: 'uebungsroutine',
    name: 'Übungsroutine',
    description: '50 Übungen insgesamt erledigt.',
    xp: 100,
    category: 'uebung',
    check: (s) => s.exerciseCompletions >= 50,
    progress: (s) => ({ current: s.exerciseCompletions, target: 50, unit: 'Übungen' }),
  },
  {
    id: 'vielseitig',
    name: 'Vielseitig',
    description: 'Aus jeder der fünf Kategorien mindestens eine Übung gemacht.',
    xp: 50,
    category: 'uebung',
    check: (s) => s.exerciseCategoriesDone >= s.exerciseCategoryTotal,
    progress: (s) => ({
      current: s.exerciseCategoriesDone,
      target: s.exerciseCategoryTotal,
      unit: 'Kategorien',
    }),
  },
];

/**
 * Alle Kennzahlen, die die Achievements oben brauchen – in einem Durchlauf.
 *
 * @typedef {Object} RunStats
 * @property {number} runCount
 * @property {number} totalDistanceKm
 * @property {number} longestDailyStreak        Tage in Folge mit Lauf
 * @property {number} longestWeeklyStreakDays   längste Spanne ohne Pause > 7 Tage
 * @property {number} earlyRunCount             Läufe vor 7:00 Uhr
 * @property {number} lateRunCount              Läufe ab 21:00 Uhr
 * @property {boolean} hasPersonalBest
 * @property {boolean} hasComeback
 * @property {boolean} hasLongRunBreakthrough
 *
 * @param {import('./storage.js').Run[]} runs
 * @returns {RunStats}
 */
export function buildRunStats(runs) {
  const chronological = [...runs].sort(byTimeAsc);

  const stats = {
    runCount: chronological.length,
    totalDistanceKm: 0,
    longestDailyStreak: 0,
    longestWeeklyStreakDays: 0,
    earlyRunCount: 0,
    lateRunCount: 0,
    hasPersonalBest: false,
    hasComeback: false,
    hasLongRunBreakthrough: false,
  };

  let longestSoFarKm = 0;
  /** @type {Map<number, number>} beste Dauer je PR-Distanz */
  const bestDurations = new Map();

  for (const run of chronological) {
    stats.totalDistanceKm += run.distanceKm;

    // Tageszeit. Gezählt statt nur vermerkt: darauf bauen mehrere Stufen auf.
    // Läufe ohne Uhrzeit zählen für keine Seite – ohne Angabe ist nicht
    // entscheidbar, wann gelaufen wurde.
    const minutes = minutesOfDay(run.timeOfDay);
    if (minutes !== null) {
      if (minutes < 7 * 60) stats.earlyRunCount++;
      if (minutes >= 21 * 60) stats.lateRunCount++;
    }

    // Längster Lauf um 20 % übertroffen
    if (longestSoFarKm > 0 && run.distanceKm >= longestSoFarKm * 1.2) {
      stats.hasLongRunBreakthrough = true;
    }
    longestSoFarKm = Math.max(longestSoFarKm, run.distanceKm);

    // Persönlicher Rekord auf 5 bzw. 10 km
    const prDistance = matchPrDistance(run.distanceKm);
    if (prDistance !== null && isPositive(run.durationMinutes)) {
      const best = bestDurations.get(prDistance);
      if (best !== undefined && run.durationMinutes < best) {
        stats.hasPersonalBest = true;
      }
      if (best === undefined || run.durationMinutes < best) {
        bestDurations.set(prDistance, run.durationMinutes);
      }
    }
  }

  // Serien und Pausen über die Lauf-Tage
  const days = [...new Set(chronological.map((run) => toDayNumber(run.date)))].sort(
    (a, b) => a - b
  );

  let dailyStreak = 0;
  let weeklyStreakStart = null;

  days.forEach((day, index) => {
    const previous = index > 0 ? days[index - 1] : null;
    const gap = previous === null ? null : day - previous;

    if (gap !== null && gap >= 14) stats.hasComeback = true;

    dailyStreak = gap === 1 ? dailyStreak + 1 : 1;
    stats.longestDailyStreak = Math.max(stats.longestDailyStreak, dailyStreak);

    if (gap === null || gap > 7) weeklyStreakStart = day;
    stats.longestWeeklyStreakDays = Math.max(
      stats.longestWeeklyStreakDays,
      day - weeklyStreakStart + 1
    );
  });

  return stats;
}

/**
 * Wertet alle Achievements gegen Läufe und erledigte Übungen aus.
 *
 * @param {import('./storage.js').Run[]} runs
 * @param {import('./exercise-log.js').ExerciseEntry[]} [exerciseLog]
 * @returns {(Achievement & { unlocked: boolean, progress: ?{current: number, target: number, unit: string} })[]}
 */
export function evaluateAchievements(runs, exerciseLog = []) {
  const stats = { ...buildRunStats(runs), ...buildExerciseStats(exerciseLog) };

  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: achievement.check(stats),
    progress: achievement.progress ? achievement.progress(stats) : null,
  }));
}

/** Die Gruppen, in denen Achievements angezeigt werden. */
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'meilenstein', label: 'Meilensteine' },
  { id: 'herausforderung', label: 'Herausforderungen' },
  { id: 'uebung', label: 'Übungen' },
];

/**
 * Wie viele Achievements sind je Gruppe freigeschaltet?
 *
 * @param {ReturnType<typeof evaluateAchievements>} evaluated
 * @returns {{ id: string, label: string, unlocked: number, total: number }[]}
 */
export function achievementsByCategory(evaluated) {
  return ACHIEVEMENT_CATEGORIES.map(({ id, label }) => {
    const eigene = (evaluated ?? []).filter((a) => a.category === id);

    return {
      id,
      label,
      unlocked: eigene.filter((a) => a.unlocked).length,
      total: eigene.length,
    };
  });
}

/** Summe der Bonus-XP aus allen freigeschalteten Achievements. */
export function achievementXp(evaluated) {
  return evaluated.reduce((sum, a) => (a.unlocked ? sum + a.xp : sum), 0);
}

/* ----------------------------------------------------------------- Intern */

/** Ordnet eine Distanz einer PR-Distanz zu, sonst null. */
function matchPrDistance(distanceKm) {
  for (const target of PR_DISTANCES_KM) {
    if (Math.abs(distanceKm - target) <= PR_TOLERANCE_KM) return target;
  }
  return null;
}

/** "HH:MM" -> Minuten seit Mitternacht, sonst null. */
function minutesOfDay(timeOfDay) {
  if (typeof timeOfDay !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeOfDay);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** ISO-Datum -> fortlaufende Tagesnummer, damit sich Abstände rechnen lassen. */
function toDayNumber(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Chronologisch aufsteigend; ohne Uhrzeit zählt der Lauf als Tagesbeginn. */
function byTimeAsc(a, b) {
  const keyA = `${a.date}T${a.timeOfDay ?? '00:00'}`;
  const keyB = `${b.date}T${b.timeOfDay ?? '00:00'}`;
  if (keyA === keyB) return 0;
  return keyA < keyB ? -1 : 1;
}

function isPositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
