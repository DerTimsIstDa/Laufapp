/**
 * Geplante Übungen: welche Übung an welchem Tag vorgenommen ist.
 *
 * Pur und ohne DOM. Bewusst getrennt vom Übungs-Protokoll in
 * exercise-log.js: dort steht, was **gemacht** wurde, hier, was **vorhat**
 * gemacht zu werden. Beide teilen sich nur die `exerciseId`.
 *
 * Diese Datei rechnet keine XP aus und soll das auch nie tun. Die Belohnung
 * hängt am Erledigen (3 XP je Übung und Tag, siehe exercise-log.js) – wer sich
 * etwas vornimmt, hat noch nichts geleistet.
 *
 * @typedef {{ id: string, exerciseId: string, date: string }} PlannedExercise
 */

import { EXERCISES } from './exercises.js';

/**
 * Obergrenze je Tag. Kein technischer Zwang, sondern eine Bremse: ein Tag mit
 * dreißig Vorhaben ist kein Plan mehr.
 */
export const MAX_PLANNED_PER_DAY = 12;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Bekannte Übungs-IDs – Einträge auf Unbekanntes sind wertlos. */
const KNOWN_IDS = new Set(EXERCISES.map((exercise) => exercise.id));

/** Wirft alles weg, womit sich nichts anzeigen lässt. */
export function normalizePlan(entries) {
  if (!Array.isArray(entries)) return [];

  return entries.filter(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof entry.exerciseId === 'string' &&
      KNOWN_IDS.has(entry.exerciseId) &&
      typeof entry.date === 'string' &&
      ISO_DATE.test(entry.date)
  );
}

/**
 * Die für einen Tag geplanten Übungen, in der Reihenfolge der Bibliothek.
 *
 * Nicht in Eingabereihenfolge: die Aufwärmreihe ist als Abfolge gedacht, und
 * sie soll auch dann stimmen, wenn sie in beliebiger Reihenfolge eingeplant
 * wurde.
 *
 * @returns {PlannedExercise[]}
 */
export function plannedOn(entries, date) {
  if (typeof date !== 'string' || !ISO_DATE.test(date)) return [];

  const reihenfolge = new Map(EXERCISES.map((exercise, index) => [exercise.id, index]));

  return normalizePlan(entries)
    .filter((entry) => entry.date === date)
    .sort((a, b) => reihenfolge.get(a.exerciseId) - reihenfolge.get(b.exerciseId));
}

/** Steht diese Übung an diesem Tag schon im Plan? */
export function isPlanned(entries, exerciseId, date) {
  return plannedOn(entries, date).some((entry) => entry.exerciseId === exerciseId);
}

/** Ist an diesem Tag noch Platz für eine weitere Übung? */
export function hasRoomOn(entries, date) {
  return plannedOn(entries, date).length < MAX_PLANNED_PER_DAY;
}

/**
 * Trägt eine Übung für einen Tag ein.
 *
 * Doppelte werden stillschweigend geschluckt – eine Übung zweimal am selben
 * Tag vorzuhaben ist keine zweite Übung, und XP bringt sie ohnehin nur einmal
 * am Tag.
 *
 * @returns {PlannedExercise[]} unverändert, wenn die Vorgabe unbrauchbar oder
 *   der Tag schon voll ist
 */
export function planExercise(entries, { exerciseId, date, createId }) {
  const sauber = normalizePlan(entries);

  if (typeof exerciseId !== 'string' || !KNOWN_IDS.has(exerciseId)) return sauber;
  if (typeof date !== 'string' || !ISO_DATE.test(date)) return sauber;
  if (isPlanned(sauber, exerciseId, date)) return sauber;
  if (!hasRoomOn(sauber, date)) return sauber;

  const vergeben = new Set(sauber.map((entry) => entry.id).filter(Boolean));
  let id = createId ? createId() : `plan-${exerciseId}-${date}`;
  while (vergeben.has(id)) id = `${id}-x`;

  return [...sauber, { id, exerciseId, date }];
}

/**
 * Nimmt eine Übung für einen Tag wieder aus dem Plan.
 * @returns {PlannedExercise[]}
 */
export function unplanExercise(entries, { exerciseId, date }) {
  return normalizePlan(entries).filter(
    (entry) => !(entry.exerciseId === exerciseId && entry.date === date)
  );
}
