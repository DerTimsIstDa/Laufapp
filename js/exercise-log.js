/**
 * Erledigte Übungen: Zählung, XP und Kennzahlen für Achievements.
 *
 * Pur und ohne DOM. Die Einträge kommen als Liste herein, gespeichert wird in
 * storage.js.
 *
 * Zwei Zahlen, die man nicht verwechseln darf:
 *   - **Zähler**: wie oft eine Übung insgesamt angetippt wurde. Läuft immer
 *     weiter, auch mehrfach am selben Tag.
 *   - **XP**: nur einmal je Übung und Kalendertag. Sonst liesse sich die
 *     Belohnung durch wiederholtes Antippen beliebig hochtreiben.
 *
 * @typedef {{ id: string, exerciseId: string, date: string, at?: string }} ExerciseEntry
 */

import { EXERCISES, CATEGORIES } from './exercises.js';

/** XP je Übung und Kalendertag. */
export const XP_PER_EXERCISE = 3;

/** exerciseId -> Kategorie, einmal aufgebaut. */
const CATEGORY_OF = new Map(EXERCISES.map((exercise) => [exercise.id, exercise.category]));

/** Wirft alles weg, womit sich nicht rechnen lässt. */
export function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries.filter(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof entry.exerciseId === 'string' &&
      entry.exerciseId !== '' &&
      typeof entry.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
  );
}

/** Wie oft wurde jede Übung insgesamt gemacht – ohne Tagesgrenze. */
export function countsByExercise(entries) {
  const zaehler = new Map();

  for (const entry of normalizeEntries(entries)) {
    zaehler.set(entry.exerciseId, (zaehler.get(entry.exerciseId) ?? 0) + 1);
  }

  return zaehler;
}

/** Summe aller Erledigungen, mehrfach am Tag inbegriffen. */
export function totalCompletions(entries) {
  return normalizeEntries(entries).length;
}

/** Zahl der Übung-Tag-Paare – nur die bringen XP. */
export function xpEarningCount(entries) {
  const paare = new Set(
    normalizeEntries(entries).map((entry) => `${entry.exerciseId}@${entry.date}`)
  );

  return paare.size;
}

export function exerciseXp(entries) {
  return xpEarningCount(entries) * XP_PER_EXERCISE;
}

/**
 * Würde ein weiterer Eintrag für diese Übung an diesem Tag XP bringen?
 * Für die Rückmeldung beim Antippen.
 */
export function awardsXp(entries, exerciseId, date) {
  return !normalizeEntries(entries).some(
    (entry) => entry.exerciseId === exerciseId && entry.date === date
  );
}

/** Wurde diese Übung an diesem Tag schon erledigt? */
export function doneOnDay(entries, exerciseId, date) {
  return !awardsXp(entries, exerciseId, date);
}

/**
 * Kennzahlen für die Übungs-Achievements.
 *
 * @returns {{ exerciseCompletions: number, exerciseCategoriesDone: number, exerciseCategoryTotal: number }}
 */
export function buildExerciseStats(entries) {
  const sauber = normalizeEntries(entries);
  const kategorien = new Set();

  for (const entry of sauber) {
    // Einträge zu unbekannten Übungen zählen mit, tragen aber zu keiner
    // Kategorie bei – etwa nach einem Import aus einer älteren Bibliothek.
    const kategorie = CATEGORY_OF.get(entry.exerciseId);
    if (kategorie) kategorien.add(kategorie);
  }

  return {
    exerciseCompletions: sauber.length,
    exerciseCategoriesDone: kategorien.size,
    exerciseCategoryTotal: CATEGORIES.length,
  };
}
