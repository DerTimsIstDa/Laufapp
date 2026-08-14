/**
 * Persistenz der Läufe im localStorage.
 *
 * Weder XP-Stand noch freigeschaltete Achievements werden gespeichert – beides
 * wird immer aus den Läufen berechnet (siehe xp.js und achievements.js). So
 * bleibt alles konsistent, wenn ein Lauf gelöscht oder eine Regel später
 * angepasst wird.
 */

const STORAGE_KEY = 'laufapp.runs.v1';

/**
 * `timeOfDay` ("HH:MM") und `durationMinutes` sind optional. Sie werden nur
 * für die Achievements Frühaufsteher, Nachteule und Neue Bestzeit gebraucht;
 * Läufe ohne diese Angaben bleiben gültig.
 *
 * `source` unterscheidet aufgezeichnete von handgetippten Läufen.
 *
 * @typedef {{
 *   id: string,
 *   distanceKm: number,
 *   date: string,
 *   timeOfDay?: string,
 *   durationMinutes?: number,
 *   source?: 'manual' | 'gps'
 * }} Run
 */

/**
 * Lädt alle Läufe, neuester zuerst.
 * @returns {Run[]}
 */
export function loadRuns() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return []; // localStorage gesperrt, z.B. im Privatmodus
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRun).sort(byDateDesc);
  } catch {
    return [];
  }
}

/** @param {Run[]} runs */
export function saveRuns(runs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (err) {
    console.error('Läufe konnten nicht gespeichert werden:', err);
  }
}

/**
 * Fügt einen Lauf hinzu und gibt die neue Liste zurück.
 * @param {Run[]} runs
 * @returns {Run[]}
 */
export function addRun(runs, { distanceKm, date, timeOfDay, durationMinutes, source }) {
  const run = { id: createId(), distanceKm, date };

  // Optionale Felder nur setzen, wenn sie ausgefüllt wurden.
  if (timeOfDay) run.timeOfDay = timeOfDay;
  if (durationMinutes) run.durationMinutes = durationMinutes;
  if (source) run.source = source;

  const next = [run, ...runs].sort(byDateDesc);
  saveRuns(next);
  return next;
}

/**
 * Entfernt einen Lauf und gibt die neue Liste zurück.
 * @param {Run[]} runs
 * @returns {Run[]}
 */
export function removeRun(runs, id) {
  const next = runs.filter((run) => run.id !== id);
  saveRuns(next);
  return next;
}

function isValidRun(run) {
  return (
    run !== null &&
    typeof run === 'object' &&
    typeof run.id === 'string' &&
    typeof run.date === 'string' &&
    typeof run.distanceKm === 'number' &&
    Number.isFinite(run.distanceKm) &&
    run.distanceKm > 0
  );
}

/** Neueste zuerst. ISO-Strings lassen sich direkt als String vergleichen. */
function byDateDesc(a, b) {
  const keyA = `${a.date}T${a.timeOfDay ?? '00:00'}`;
  const keyB = `${b.date}T${b.timeOfDay ?? '00:00'}`;
  if (keyA === keyB) return 0;
  return keyA < keyB ? 1 : -1;
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
