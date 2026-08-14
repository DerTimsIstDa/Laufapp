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

/** Obergrenze für eine Handkorrektur – darüber ist es ein Tippfehler. */
export const MAX_EXERCISE_COUNT = 999;

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
 * Setzt den Zähler einer Übung von Hand auf `target`.
 *
 * Es gibt keinen gespeicherten Zähler – die Zahl ist immer die Anzahl der
 * Einträge. Eine Korrektur muss also Einträge entfernen oder ergänzen, sonst
 * liefen Anzeige und Datenbasis auseinander.
 *
 * Verringern entfernt die **neuesten** Einträge; das entspricht dem
 * Rückgängigmachen der letzten Tipps und lässt alte Freischaltdaten in Ruhe.
 *
 * Erhöhen legt Einträge mit dem heutigen Datum an. Damit greift die
 * Tagesgrenze weiterhin: eine Korrektur von 3 auf 20 bringt höchstens die
 * drei XP dieses einen Tages, nicht siebzehnmal drei.
 *
 * @param {ExerciseEntry[]} entries
 * @param {string} exerciseId
 * @param {number} target gewünschte Gesamtzahl
 * @param {{ date?: string, createId?: (index: number) => string }} [options]
 * @returns {ExerciseEntry[]} unverändert, wenn die Vorgabe unbrauchbar ist
 */
export function setExerciseCount(entries, exerciseId, target, { date, createId } = {}) {
  const sauber = normalizeEntries(entries);
  if (typeof exerciseId !== 'string' || exerciseId === '') return sauber;

  // Kein Number(target) auf Verdacht: Number(null) und Number('') sind beide 0,
  // ein leeres Eingabefeld würde sonst klaglos den ganzen Zähler löschen.
  if (typeof target !== 'number' && typeof target !== 'string') return sauber;
  if (typeof target === 'string' && target.trim() === '') return sauber;

  const ziel = Math.trunc(Number(target));
  if (!Number.isFinite(ziel) || ziel < 0 || ziel > MAX_EXERCISE_COUNT) return sauber;

  const eigene = sauber.filter((entry) => entry.exerciseId === exerciseId);
  const differenz = ziel - eigene.length;
  if (differenz === 0) return sauber;

  if (differenz < 0) {
    const zuEntfernen = new Set(
      [...eigene].sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1)).slice(0, -differenz)
    );

    return sauber.filter((entry) => !zuEntfernen.has(entry));
  }

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return sauber;

  const vergeben = new Set(sauber.map((entry) => entry.id).filter(Boolean));
  const neue = [];

  for (let i = 0; i < differenz; i++) {
    let id = createId ? createId(i) : `manuell-${exerciseId}-${date}-${i}`;
    while (vergeben.has(id)) id = `${id}-x`;
    vergeben.add(id);

    neue.push({ id, exerciseId, date, at: `${date}T12:00:00.000Z` });
  }

  return [...sauber, ...neue];
}

/** Nach Tag und Zeitstempel – für „neueste zuerst". */
function sortKey(entry) {
  return `${entry.date}T${entry.at ?? ''}`;
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
