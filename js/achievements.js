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
 * @property {'meilenstein'|'herausforderung'} category
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
    id: 'auf-kurs',
    name: 'Auf Kurs',
    description: '25 Läufe eingetragen.',
    xp: 80,
    category: 'meilenstein',
    check: (s) => s.runCount >= 25,
    progress: (s) => ({ current: s.runCount, target: 25, unit: 'Läufe' }),
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
    id: 'club-50-km',
    name: '50-km-Club',
    description: '50 km Gesamtdistanz erreicht.',
    xp: 50,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 50,
    progress: (s) => ({ current: s.totalDistanceKm, target: 50, unit: 'km' }),
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
    check: (s) => s.hasEarlyRun,
  },
  {
    id: 'nachteule',
    name: 'Nachteule',
    description: 'Ein Lauf ab 21:00 Uhr (Uhrzeit eintragen).',
    xp: 15,
    category: 'herausforderung',
    check: (s) => s.hasLateRun,
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
];

/**
 * Alle Kennzahlen, die die Achievements oben brauchen – in einem Durchlauf.
 *
 * @typedef {Object} RunStats
 * @property {number} runCount
 * @property {number} totalDistanceKm
 * @property {number} longestDailyStreak        Tage in Folge mit Lauf
 * @property {number} longestWeeklyStreakDays   längste Spanne ohne Pause > 7 Tage
 * @property {boolean} hasEarlyRun
 * @property {boolean} hasLateRun
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
    hasEarlyRun: false,
    hasLateRun: false,
    hasPersonalBest: false,
    hasComeback: false,
    hasLongRunBreakthrough: false,
  };

  let longestSoFarKm = 0;
  /** @type {Map<number, number>} beste Dauer je PR-Distanz */
  const bestDurations = new Map();

  for (const run of chronological) {
    stats.totalDistanceKm += run.distanceKm;

    // Tageszeit
    const minutes = minutesOfDay(run.timeOfDay);
    if (minutes !== null) {
      if (minutes < 7 * 60) stats.hasEarlyRun = true;
      if (minutes >= 21 * 60) stats.hasLateRun = true;
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
 * Wertet alle Achievements gegen die Lauf-Liste aus.
 *
 * @param {import('./storage.js').Run[]} runs
 * @returns {(Achievement & { unlocked: boolean, progress: ?{current: number, target: number, unit: string} })[]}
 */
export function evaluateAchievements(runs) {
  const stats = buildRunStats(runs);

  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: achievement.check(stats),
    progress: achievement.progress ? achievement.progress(stats) : null,
  }));
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
