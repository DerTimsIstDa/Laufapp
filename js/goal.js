/**
 * Wochenziel: erreichte Wochen und die Bonus-XP dafür.
 *
 * Pur und ohne DOM. Wie überall in dieser App wird nichts gespeichert, was
 * sich ausrechnen lässt – die erreichten Wochen ergeben sich jedes Mal neu
 * aus den Läufen.
 *
 * Gezählt wird ab `goalSince`, dem Tag, an dem das aktuelle Ziel gesetzt
 * wurde. Ohne diese Grenze liesse sich der Bonus beliebig ernten: Ziel auf 1
 * stellen, und jede jemals gelaufene Woche zahlte rückwirkend aus. Dasselbe
 * Problem löst training.js mit `createdAt` – ein Vorhaben zählt nur, wenn es
 * vorher feststand.
 *
 * Die Kehrseite: wer das Ziel ändert, fängt zu zählen von vorn an. Das ist
 * gewollt. Ein Ziel im Nachhinein zu senken und dafür bezahlt zu werden wäre
 * keine Zielerfüllung, sondern Buchhaltung.
 */

import { weekStart, localIsoDate } from './stats.js';

/** Bonus für jede Woche, in der das Ziel erreicht wurde. */
export const XP_PER_GOAL_WEEK = 100;

const MS_PER_DAY = 86_400_000;

/**
 * @typedef {{ start: string, runCount: number, reached: boolean }} GoalWeek
 *
 * Alle Wochen von `goalSince` bis einschliesslich heute, älteste zuerst.
 *
 * Die laufende Woche ist dabei: sie zählt, sobald das Ziel erreicht ist, und
 * nicht erst am Sonntag. Auf den Bonus bis Wochenende zu warten wäre die
 * schlechtere Rückmeldung.
 *
 * @param {import('./storage.js').Run[]} runs
 * @param {{ weeklyGoal: number, goalSince: string, todayIso?: string }} options
 * @returns {GoalWeek[]} leer, wenn es kein Ziel gibt
 */
export function goalWeeks(runs, { weeklyGoal, goalSince, todayIso = localIsoDate(new Date()) } = {}) {
  if (!Number.isFinite(weeklyGoal) || weeklyGoal <= 0) return [];

  const ersteWoche = weekStart(goalSince);
  const letzteWoche = weekStart(todayIso);
  if (ersteWoche === null || letzteWoche === null) return [];
  if (ersteWoche > letzteWoche) return [];

  /** Montag der Woche -> Zahl der Läufe darin. */
  const proWoche = new Map();
  for (const run of Array.isArray(runs) ? runs : []) {
    const woche = weekStart(run?.date);
    if (woche !== null) proWoche.set(woche, (proWoche.get(woche) ?? 0) + 1);
  }

  const wochen = [];
  for (let tag = ersteWoche; tag <= letzteWoche; tag = naechsteWoche(tag)) {
    const runCount = proWoche.get(tag) ?? 0;
    wochen.push({ start: tag, runCount, reached: runCount >= weeklyGoal });
  }

  return wochen;
}

/** Zahl der erreichten Wochen. */
export function reachedGoalWeeks(runs, options) {
  return goalWeeks(runs, options).filter((woche) => woche.reached).length;
}

/** Bonus-XP aus allen erreichten Wochen. */
export function goalXp(runs, options) {
  return reachedGoalWeeks(runs, options) * XP_PER_GOAL_WEEK;
}

/* ----------------------------------------------------------------- Intern */

function naechsteWoche(isoMontag) {
  const [year, month, day] = isoMontag.split('-').map(Number);
  const naechster = new Date(Date.UTC(year, month - 1, day) + 7 * MS_PER_DAY);
  return naechster.toISOString().slice(0, 10);
}
