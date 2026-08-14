/**
 * Auswertung der Lauf-Historie: Summen, Durchschnitte, Serien, Zeitreihen.
 *
 * Pur und ohne DOM. Der heutige Tag kommt als Parameter herein, damit sich
 * "aktuelle Serie" testen lässt, ohne die Systemuhr zu stellen.
 *
 * Alle Datumsangaben sind lokale ISO-Tage ("JJJJ-MM-TT"), so wie sie auch im
 * Speicher liegen.
 */

/** Wie viele Tage eine Serie überleben darf, ohne dass gelaufen wurde. */
const STREAK_GRACE_DAYS = 1;

/**
 * @typedef {Object} Stats
 * @property {number} runCount
 * @property {number} totalDistanceKm
 * @property {number} averageDistanceKm      0 bei keinen Läufen
 * @property {?{distanceKm: number, date: string}} longestRun
 * @property {?{date: string}} firstRun
 * @property {?{date: string}} lastRun
 * @property {number} currentDayStreak       Tage in Folge, heute noch lebendig
 * @property {number} longestDayStreak
 * @property {number} currentWeekStreak      Wochen in Folge, aktuell lebendig
 * @property {number} longestWeekStreak
 * @property {number} activeDays             Tage mit mindestens einem Lauf
 */

/**
 * @param {import('./storage.js').Run[]} runs
 * @param {{ todayIso?: string }} [options]
 * @returns {Stats}
 */
export function buildStats(runs, { todayIso = localIsoDate(new Date()) } = {}) {
  const empty = {
    runCount: 0,
    totalDistanceKm: 0,
    averageDistanceKm: 0,
    longestRun: null,
    firstRun: null,
    lastRun: null,
    currentDayStreak: 0,
    longestDayStreak: 0,
    currentWeekStreak: 0,
    longestWeekStreak: 0,
    activeDays: 0,
  };

  if (!Array.isArray(runs) || runs.length === 0) return empty;

  const chronological = [...runs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let totalDistanceKm = 0;
  let longestRun = null;

  for (const run of chronological) {
    totalDistanceKm += run.distanceKm;
    // Bei gleicher Distanz gewinnt der frühere Lauf.
    if (longestRun === null || run.distanceKm > longestRun.distanceKm) {
      longestRun = { distanceKm: run.distanceKm, date: run.date };
    }
  }

  const days = uniqueSorted(chronological.map((run) => toDayNumber(run.date)));
  const weeks = uniqueSorted(days.map(toWeekIndex));

  const todayDay = toDayNumber(todayIso);

  return {
    runCount: chronological.length,
    totalDistanceKm,
    averageDistanceKm: totalDistanceKm / chronological.length,
    longestRun,
    firstRun: { date: chronological[0].date },
    lastRun: { date: chronological.at(-1).date },
    currentDayStreak: currentStreak(days, todayDay, STREAK_GRACE_DAYS),
    longestDayStreak: longestStreak(days),
    currentWeekStreak: currentStreak(weeks, toWeekIndex(todayDay), 1),
    longestWeekStreak: longestStreak(weeks),
    activeDays: days.length,
  };
}

/**
 * Distanz je Kalenderwoche, lückenlos bis zur laufenden Woche.
 *
 * Wochen ohne Lauf erscheinen mit 0 – sonst würde ein Balkendiagramm eine
 * Pause verschlucken und den Verlauf schönen.
 *
 * @returns {{ start: string, isoWeek: number, isoYear: number, distanceKm: number, runCount: number }[]}
 */
export function distanceByWeek(runs, { limit = 12, todayIso = localIsoDate(new Date()) } = {}) {
  return buildBuckets(runs, {
    limit,
    todayIso,
    toIndex: (dayNumber) => toWeekIndex(dayNumber),
    describe: (weekIndex) => {
      const start = fromDayNumber(weekIndex * 7 + MONDAY_OFFSET);
      return { start, ...isoWeekOf(start) };
    },
  });
}

/**
 * Distanz je Monat, lückenlos bis zum laufenden Monat.
 * @returns {{ month: string, distanceKm: number, runCount: number }[]}
 */
export function distanceByMonth(runs, { limit = 12, todayIso = localIsoDate(new Date()) } = {}) {
  return buildBuckets(runs, {
    limit,
    todayIso,
    toIndex: (dayNumber) => toMonthIndex(fromDayNumber(dayNumber)),
    describe: (monthIndex) => ({
      month: `${Math.floor(monthIndex / 12)}-${String((monthIndex % 12) + 1).padStart(2, '0')}`,
    }),
  });
}

/** Date -> "JJJJ-MM-TT" in lokaler Zeit. */
export function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/* ----------------------------------------------------------------- Intern */

/** 1970-01-01 war ein Donnerstag; der erste Montag liegt auf Tag 4. */
const MONDAY_OFFSET = 4;
const MS_PER_DAY = 86_400_000;

function buildBuckets(runs, { limit, todayIso, toIndex, describe }) {
  if (!Array.isArray(runs) || runs.length === 0) return [];

  /** @type {Map<number, {distanceKm: number, runCount: number}>} */
  const byIndex = new Map();

  for (const run of runs) {
    const index = toIndex(toDayNumber(run.date));
    const bucket = byIndex.get(index) ?? { distanceKm: 0, runCount: 0 };
    bucket.distanceKm += run.distanceKm;
    bucket.runCount += 1;
    byIndex.set(index, bucket);
  }

  const indices = [...byIndex.keys()];
  const newest = Math.max(...indices, toIndex(toDayNumber(todayIso)));
  const oldest = Math.max(Math.min(...indices), newest - limit + 1);

  const buckets = [];
  for (let index = oldest; index <= newest; index++) {
    const bucket = byIndex.get(index) ?? { distanceKm: 0, runCount: 0 };
    buckets.push({ ...describe(index), ...bucket });
  }

  return buckets;
}

/** Längste Kette aufeinanderfolgender Zahlen. */
function longestStreak(sortedIndices) {
  let longest = 0;
  let current = 0;

  sortedIndices.forEach((value, position) => {
    current = position > 0 && value === sortedIndices[position - 1] + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  });

  return longest;
}

/**
 * Kette, die bis heute reicht. `grace` erlaubt eine Lücke: eine Tagesserie
 * gilt noch als lebendig, wenn gestern gelaufen wurde – sonst wäre sie jeden
 * Morgen bei 0, bis man wieder losläuft.
 */
function currentStreak(sortedIndices, todayIndex, grace) {
  if (sortedIndices.length === 0) return 0;

  const last = sortedIndices.at(-1);
  if (last > todayIndex) return 0; // Läufe in der Zukunft zählen nicht mit
  if (todayIndex - last > grace) return 0;

  let streak = 1;
  for (let position = sortedIndices.length - 1; position > 0; position--) {
    if (sortedIndices[position] - sortedIndices[position - 1] !== 1) break;
    streak++;
  }

  return streak;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

/** ISO-Tag -> fortlaufende Tagesnummer. */
function toDayNumber(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function fromDayNumber(dayNumber) {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Fortlaufender Wochenindex, Woche beginnt montags. */
function toWeekIndex(dayNumber) {
  return Math.floor((dayNumber - MONDAY_OFFSET) / 7);
}

function toMonthIndex(isoDate) {
  const [year, month] = isoDate.split('-').map(Number);
  return year * 12 + (month - 1);
}

/** Kalenderwoche nach ISO 8601 – die Woche gehört dem Jahr ihres Donnerstags. */
function isoWeekOf(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  const weekday = (date.getUTCDay() + 6) % 7; // Montag = 0
  date.setUTCDate(date.getUTCDate() - weekday + 3); // Donnerstag dieser Woche

  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);

  const isoWeek = 1 + Math.round((date - firstThursday) / (7 * MS_PER_DAY));
  return { isoWeek, isoYear };
}
