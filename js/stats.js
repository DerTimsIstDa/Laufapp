/**
 * Auswertung der Lauf-Historie: Summen, Durchschnitte, Serien, Zeitreihen.
 *
 * Pur und ohne DOM. Der heutige Tag kommt als Parameter herein, damit sich
 * "aktuelle Serie" testen lässt, ohne die Systemuhr zu stellen.
 *
 * Alle Datumsangaben sind lokale ISO-Tage ("JJJJ-MM-TT"), so wie sie auch im
 * Speicher liegen.
 */

import { runPaceMinPerKm } from './geo.js';

/** Wie viele Tage eine Serie überleben darf, ohne dass gelaufen wurde. */
const STREAK_GRACE_DAYS = 1;

/**
 * @typedef {Object} Stats
 * @property {number} runCount
 * @property {number} totalDistanceKm
 * @property {number} averageDistanceKm      0 bei keinen Läufen
 * @property {?number} averagePaceMinPerKm   null, wenn kein Lauf eine Pace hat
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
    averagePaceMinPerKm: null,
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

  // Für die Ø-Pace: Strecke und daraus folgende Zeit, aber nur von Läufen,
  // die überhaupt eine Pace haben.
  let paceDistanceKm = 0;
  let paceMinutes = 0;

  for (const run of chronological) {
    totalDistanceKm += run.distanceKm;
    // Bei gleicher Distanz gewinnt der frühere Lauf.
    if (longestRun === null || run.distanceKm > longestRun.distanceKm) {
      longestRun = { distanceKm: run.distanceKm, date: run.date };
    }

    const pace = runPaceMinPerKm(run);
    if (pace !== null) {
      paceDistanceKm += run.distanceKm;
      paceMinutes += pace * run.distanceKm;
    }
  }

  const days = uniqueSorted(chronological.map((run) => toDayNumber(run.date)));
  const weeks = uniqueSorted(days.map(toWeekIndex));

  const todayDay = toDayNumber(todayIso);

  return {
    runCount: chronological.length,
    totalDistanceKm,
    averageDistanceKm: totalDistanceKm / chronological.length,
    // Nach Strecke gewichtet, nicht der Mittelwert der Einzel-Paces: zwanzig
    // Kilometer in 6:00 wiegen schwerer als zwei in 5:00, und der schlichte
    // Mittelwert behauptete das Gegenteil.
    averagePaceMinPerKm: paceDistanceKm > 0 ? paceMinutes / paceDistanceKm : null,
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

/**
 * Läufe der laufenden Woche bzw. des laufenden Monats.
 *
 * Die Woche beginnt montags – dieselbe Grenze, mit der auch das
 * Balkendiagramm rechnet (siehe MONDAY_OFFSET). Zwei verschiedene
 * Wochenanfänge in einer App wären ein Fehler, der nur sonntags auffällt.
 *
 * Läufe in der Zukunft fallen nicht heraus: wer einen Lauf auf morgen
 * datiert, hat sich vertippt, und ein stillschweigend verschwundener Lauf
 * wäre die schlechtere Rückmeldung als ein sichtbar falscher.
 *
 * @param {import('./storage.js').Run[]} runs
 * @param {{ period: 'week' | 'month', todayIso?: string }} options
 * @returns {import('./storage.js').Run[]}
 */
export function runsInPeriod(runs, { period, todayIso = localIsoDate(new Date()) } = {}) {
  if (!Array.isArray(runs)) return [];

  const inSelbem =
    period === 'month'
      ? (isoDate) => toMonthIndex(isoDate) === toMonthIndex(todayIso)
      : (isoDate) => toWeekIndex(toDayNumber(isoDate)) === toWeekIndex(toDayNumber(todayIso));

  return runs.filter((run) => typeof run?.date === 'string' && inSelbem(run.date));
}

/**
 * Wie viele Wochen die Aktivitäts-Heatmap zeigt.
 *
 * Achtzehn Wochen sind gut vier Monate. Mehr passt auf einem Handy nicht mehr
 * mit einer Feldbreite hin, die sich noch treffen lässt: bei 375 px bleiben
 * für die Spalten rund 300 px, das sind hier knapp 15 px je Feld. Bei einem
 * halben Jahr wären es unter 10 px – gut zum Ansehen, nichts zum Antippen.
 */
export const ACTIVITY_WEEKS = 18;

/**
 * Kilometergrenzen zwischen den Stufen.
 *
 * Vier Stufen über "kein Lauf": bis 5 km ein normaler Feierabendlauf, bis
 * 10 km eine ordentliche Runde, bis 15 km ein langer Lauf, darüber ein sehr
 * langer. Gezählt wird die Summe des Tages – zweimal 5 km sind ein 10-km-Tag.
 */
export const ACTIVITY_LEVELS = [5, 10, 15];

/**
 * @typedef {Object} ActivityDay
 * @property {string} date         ISO-Tag
 * @property {number} distanceKm   Summe des Tages
 * @property {number} runCount
 * @property {number} level        0 = kein Lauf, sonst 1..ACTIVITY_LEVELS.length+1
 * @property {boolean} future      liegt nach heute – die laufende Woche ist voll
 */

/**
 * Ein Feld je Tag, montags beginnend und lückenlos.
 *
 * Die Liste beginnt am Montag der ersten gezeigten Woche und endet am Sonntag
 * der laufenden – so ist sie immer ein Vielfaches von sieben und lässt sich
 * ohne Rechnung spaltenweise in ein Raster mit sieben Zeilen füllen. Die Tage
 * nach heute sind mit `future` ausgezeichnet: sie halten das Raster
 * rechteckig, sind aber keine Aussage.
 *
 * @param {import('./storage.js').Run[]} runs
 * @param {{ weeks?: number, todayIso?: string }} [options]
 * @returns {ActivityDay[]}
 */
export function activityCalendar(
  runs,
  { weeks = ACTIVITY_WEEKS, todayIso = localIsoDate(new Date()) } = {}
) {
  /** @type {Map<string, {distanceKm: number, runCount: number}>} */
  const proTag = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    if (typeof run?.date !== 'string' || typeof run.distanceKm !== 'number') continue;

    const eintrag = proTag.get(run.date) ?? { distanceKm: 0, runCount: 0 };
    eintrag.distanceKm += run.distanceKm;
    eintrag.runCount += 1;
    proTag.set(run.date, eintrag);
  }

  const heute = toDayNumber(todayIso);
  const letzterMontag = toWeekIndex(heute) * 7 + MONDAY_OFFSET;
  const ersterTag = letzterMontag - (weeks - 1) * 7;

  const tage = [];
  for (let nummer = ersterTag; nummer < ersterTag + weeks * 7; nummer++) {
    const date = fromDayNumber(nummer);
    const { distanceKm = 0, runCount = 0 } = proTag.get(date) ?? {};

    tage.push({
      date,
      distanceKm,
      runCount,
      level: activityLevel(distanceKm, runCount),
      future: nummer > heute,
    });
  }

  return tage;
}

/** 0 ohne Lauf, sonst die Stufe nach den Kilometergrenzen. */
function activityLevel(distanceKm, runCount) {
  if (runCount === 0) return 0;
  return 1 + ACTIVITY_LEVELS.filter((grenze) => distanceKm >= grenze).length;
}

/**
 * So viele Punkte braucht eine Linie, damit sie einen Verlauf zeigt.
 *
 * Zwei Punkte sind keine Entwicklung, sondern ein Vergleich – und als Linie
 * gezeichnet behaupten sie eine Richtung, die die Daten nicht hergeben.
 */
export const PACE_TREND_MIN_POINTS = 3;

/** Ab wie vielen Wochen Spannweite nach Monaten statt nach Wochen gebündelt wird. */
const PACE_TREND_WEEK_SPAN = 12;

/**
 * @typedef {Object} PaceTrend
 * @property {'week'|'month'} period
 * @property {{ start: string, paceMinPerKm: number, runCount: number, distanceKm: number }[]} points
 */

/**
 * Ø-Pace je Zeitraum, für die Verlaufslinie.
 *
 * Gebündelt wird nach Wochen, solange die Läufe in ein Vierteljahr passen,
 * sonst nach Monaten – zwölf Wochenpunkte sind lesbar, fünfzig sind ein
 * Zaun. Zeiträume ohne Lauf fallen heraus statt auf 0 zu gehen: eine Pace von
 * null wäre kein langsamer Zeitraum, sondern gar keiner.
 *
 * Der Durchschnitt ist wie in buildStats() nach Strecke gewichtet – zwanzig
 * Kilometer in 6:00 wiegen schwerer als zwei in 5:00.
 *
 * @param {import('./storage.js').Run[]} runs
 * @param {{ limit?: number, todayIso?: string }} [options]
 * @returns {PaceTrend}
 */
export function paceTrend(runs, { limit = 12 } = {}) {
  const mitPace = (Array.isArray(runs) ? runs : []).filter(
    (run) => typeof run?.date === 'string' && runPaceMinPerKm(run) !== null
  );

  if (mitPace.length === 0) return { period: 'week', points: [] };

  const wochen = mitPace.map((run) => toWeekIndex(toDayNumber(run.date)));
  const spanne = Math.max(...wochen) - Math.min(...wochen) + 1;
  const period = spanne > PACE_TREND_WEEK_SPAN ? 'month' : 'week';

  const toIndex =
    period === 'month'
      ? (isoDate) => toMonthIndex(isoDate)
      : (isoDate) => toWeekIndex(toDayNumber(isoDate));

  const start =
    period === 'month'
      ? (index) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`
      : (index) => fromDayNumber(index * 7 + MONDAY_OFFSET);

  /** @type {Map<number, {distanceKm: number, minutes: number, runCount: number}>} */
  const eimer = new Map();

  for (const run of mitPace) {
    const index = toIndex(run.date);
    const eimerchen = eimer.get(index) ?? { distanceKm: 0, minutes: 0, runCount: 0 };

    eimerchen.distanceKm += run.distanceKm;
    eimerchen.minutes += runPaceMinPerKm(run) * run.distanceKm;
    eimerchen.runCount += 1;
    eimer.set(index, eimerchen);
  }

  const points = [...eimer.entries()]
    .sort(([a], [b]) => a - b)
    .slice(-limit)
    .map(([index, wert]) => ({
      start: start(index),
      paceMinPerKm: wert.minutes / wert.distanceKm,
      runCount: wert.runCount,
      distanceKm: wert.distanceKm,
    }));

  return { period, points };
}

/** Die Distanzen, für die eine Bestzeit geführt wird. */
export const BEST_TIME_DISTANCES = [5, 8, 10, 12, 15, 21.1];

/**
 * Wie weit ein Lauf von der Zielmarke abweichen darf.
 *
 * Gespeicherte Strecken sind reine Punktlisten ohne Zeitstempel (siehe
 * route.js) – Kilometer-Splits lassen sich daraus nicht rekonstruieren. Eine
 * Bestzeit kann deshalb nur aus der Gesamtzeit eines Laufs kommen, der ohnehin
 * fast genau so lang war. Hundert Meter sind der Spielraum, den eine
 * GPS-Aufzeichnung von 5,00 km üblicherweise streut; wer 5,3 km gelaufen ist,
 * hat keine 5-km-Zeit gestellt, sondern eine über 5,3 km.
 */
export const BEST_TIME_TOLERANCE_KM = 0.1;

/**
 * @typedef {Object} BestTime
 * @property {number} targetKm            die Zielmarke
 * @property {?number} durationMinutes    null, wenn es noch keine Zeit gibt
 * @property {?string} date               Tag des Laufs
 * @property {?number} distanceKm         tatsächlich gelaufene Strecke
 * @property {?number} paceMinPerKm
 */

/**
 * Schnellste Zeit je Zielmarke.
 *
 * Gewertet wird nur, was auch gemessen wurde: ein Lauf ohne Dauer und ohne
 * Pace bringt keine Zeit ein. Bei gleicher Zeit gewinnt der frühere Lauf – die
 * Bestzeit ist dann dort gefallen und wird nicht später noch einmal vergeben.
 *
 * @param {import('./storage.js').Run[]} runs
 * @param {{ distances?: number[], toleranceKm?: number }} [options]
 * @returns {BestTime[]} eine Zeile je Zielmarke, in der Reihenfolge der Marken
 */
export function bestTimes(
  runs,
  { distances = BEST_TIME_DISTANCES, toleranceKm = BEST_TIME_TOLERANCE_KM } = {}
) {
  // Älteste zuerst, damit bei Gleichstand wirklich der frühere Lauf gewinnt.
  const liste = (Array.isArray(runs) ? [...runs] : []).sort((a, b) =>
    String(a?.date) < String(b?.date) ? -1 : String(a?.date) > String(b?.date) ? 1 : 0
  );

  return distances.map((targetKm) => {
    const leer = {
      targetKm,
      durationMinutes: null,
      date: null,
      distanceKm: null,
      paceMinPerKm: null,
    };

    let bester = null;

    for (const run of liste) {
      if (typeof run?.distanceKm !== 'number') continue;
      if (Math.abs(run.distanceKm - targetKm) > toleranceKm) continue;

      const dauer = runDurationMinutes(run);
      if (dauer === null) continue;

      if (bester !== null && dauer >= bester.durationMinutes) continue;

      bester = {
        targetKm,
        durationMinutes: dauer,
        date: run.date,
        distanceKm: run.distanceKm,
        paceMinPerKm: runPaceMinPerKm(run),
      };
    }

    return bester ?? leer;
  });
}

/**
 * Gelaufene Zeit in Minuten.
 *
 * Die eingetragene Dauer zählt zuerst – sie ist gemessen. Fehlt sie, aber es
 * steht eine Pace da (etwa aus einer anderen Uhr), ergibt sich die Zeit aus
 * Pace und Strecke.
 */
function runDurationMinutes(run) {
  const dauer = run?.durationMinutes;
  if (typeof dauer === 'number' && Number.isFinite(dauer) && dauer > 0) return dauer;

  const pace = runPaceMinPerKm(run);
  if (pace === null) return null;

  return pace * run.distanceKm;
}

/**
 * Montag der Woche, in der dieser Tag liegt.
 *
 * Dieselbe Wochengrenze wie überall sonst hier. Wer eine Woche als Schlüssel
 * braucht, nimmt diesen Montag – zwei Tage derselben Woche ergeben denselben
 * Wert.
 *
 * @returns {?string} null, wenn das Datum unbrauchbar ist
 */
export function weekStart(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;

  const woche = toWeekIndex(toDayNumber(isoDate));
  return fromDayNumber(woche * 7 + MONDAY_OFFSET);
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
