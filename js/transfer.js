/**
 * Export- und Importformat für die Lauf-Daten.
 *
 * Pur und ohne DOM: hier wird nur die JSON-Struktur gebaut und gelesen. Das
 * Herunterladen und Einlesen der Datei macht app.js.
 *
 * Weil der Export aktuell die einzige Sicherung ist, prüft parseImport()
 * jeden Eintrag einzeln und liefert immer eine verständliche Meldung statt
 * einer Ausnahme.
 */

import { validateRun, isValidIsoDate } from './validation.js';
import { validateSession } from './training.js';

export const EXPORT_FORMAT = 'laufapp-export';
export const EXPORT_VERSION = 1;

/**
 * Baut das Export-Objekt.
 * @param {import('./storage.js').Run[]} runs
 */
export function buildExport(runs, { exportedAt = new Date(), exerciseLog = [], sessions = [] } = {}) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    runCount: runs.length,
    runs,
    // Erledigte Übungen und der Trainingsplan gehören mit in die Sicherung,
    // sonst wäre der Export kein vollständiges Abbild mehr.
    exerciseLog,
    sessions,
  };
}

/** Export als eingerückter JSON-Text – von Hand lesbar und korrigierbar. */
export function serializeExport(runs, options) {
  return JSON.stringify(buildExport(runs, options), null, 2);
}

/** Dateiname mit lokalem Datum, z.B. "laufapp-2026-08-14.json". */
export function exportFileName(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `laufapp-${year}-${month}-${day}.json`;
}

/**
 * Liest eine Exportdatei ein.
 *
 * Einzelne kaputte Einträge führen nicht zum Abbruch – sie werden übersprungen
 * und gemeldet. Erst wenn die Datei als Ganzes unbrauchbar ist oder kein
 * einziger Lauf lesbar war, gibt es einen Fehler.
 *
 * @param {unknown} text Inhalt der Datei
 * @returns {{ ok: true, runs: object[], skipped: {index: number, reason: string}[] }
 *          | { ok: false, error: string }}
 */
export function parseImport(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return fail('Die Datei ist leer.');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('Die Datei ist kein gültiges JSON.');
  }

  // Eine nackte Liste von Läufen wird auch akzeptiert – etwa aus einer von
  // Hand zusammengestellten Datei.
  const payload = Array.isArray(data) ? { runs: data } : data;

  if (payload === null || typeof payload !== 'object') {
    return fail('Die Datei hat nicht das erwartete Format.');
  }
  if (payload.format !== undefined && payload.format !== EXPORT_FORMAT) {
    return fail('Die Datei stammt nicht aus der Laufapp.');
  }
  if (typeof payload.version === 'number' && payload.version > EXPORT_VERSION) {
    return fail(
      `Die Datei wurde mit einer neueren Version der App erstellt (Version ${payload.version}).`
    );
  }
  if (!Array.isArray(payload.runs)) {
    return fail('In der Datei steht keine Liste von Läufen.');
  }
  if (payload.runs.length === 0) {
    return fail('Die Datei enthält keine Läufe.');
  }

  const runs = [];
  const skipped = [];
  const usedIds = new Set();

  payload.runs.forEach((entry, index) => {
    const result = validateRun(entry);
    if (!result.ok) {
      skipped.push({ index, reason: result.errors[0].message });
      return;
    }

    runs.push({ id: pickId(entry, index, usedIds), ...result.run });
  });

  if (runs.length === 0) {
    return fail(
      `Kein einziger Lauf in der Datei ist lesbar (${skipped.length} übersprungen). ` +
        `Erster Grund: ${skipped[0].reason}`
    );
  }

  return {
    ok: true,
    runs,
    skipped,
    exerciseLog: readExerciseLog(payload.exerciseLog),
    sessions: readSessions(payload.sessions),
  };
}

/**
 * Geplante Einheiten aus der Datei. Fehlen sie – etwa in einer Sicherung von
 * vor diesem Feature – ist das kein Fehler, dann gibt es eben keinen Plan.
 *
 * Kaputte Einheiten werden still übersprungen: anders als bei den Läufen wäre
 * ein verlorener Planeintrag kein Datenverlust, sondern nur ein Termin weniger.
 */
function readSessions(raw) {
  if (!Array.isArray(raw)) return [];

  const einheiten = [];
  const vergebeneIds = new Set();

  raw.forEach((entry, index) => {
    const geprueft = validateSession(entry);
    if (!geprueft.ok) return;

    const kandidat =
      entry !== null && typeof entry === 'object' && typeof entry.id === 'string'
        ? entry.id.trim()
        : '';

    let id = kandidat !== '' && !vergebeneIds.has(kandidat) ? kandidat : `einheit-${index + 1}`;
    while (vergebeneIds.has(id)) id = `${id}-x`;
    vergebeneIds.add(id);

    einheiten.push({ id, ...geprueft.session });
  });

  return einheiten;
}

/**
 * Erledigte Übungen aus der Datei. Fehlen sie – etwa in einer Sicherung von
 * vor diesem Feature – ist das kein Fehler, dann gibt es eben keine.
 *
 * Unbekannte Übungs-Ids bleiben erhalten: sie zählen weiter mit, auch wenn die
 * Bibliothek sich inzwischen geändert hat.
 */
function readExerciseLog(raw) {
  if (!Array.isArray(raw)) return [];

  const eintraege = [];
  const vergebeneIds = new Set();

  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== 'object') return;
    if (typeof entry.exerciseId !== 'string' || entry.exerciseId.trim() === '') return;
    if (!isValidIsoDate(entry.date)) return;

    let id = typeof entry.id === 'string' && entry.id.trim() !== '' ? entry.id.trim() : '';
    if (id === '' || vergebeneIds.has(id)) id = `uebung-${index + 1}`;
    while (vergebeneIds.has(id)) id = `${id}-x`;
    vergebeneIds.add(id);

    const eintrag = { id, exerciseId: entry.exerciseId.trim(), date: entry.date };
    if (typeof entry.at === 'string') eintrag.at = entry.at;

    eintraege.push(eintrag);
  });

  return eintraege;
}

/* ----------------------------------------------------------------- Intern */

/** Nimmt die ID aus der Datei, sofern brauchbar und noch nicht vergeben. */
function pickId(entry, index, usedIds) {
  const raw = entry !== null && typeof entry === 'object' ? entry.id : undefined;
  const candidate = typeof raw === 'string' ? raw.trim() : '';

  let id = candidate !== '' && !usedIds.has(candidate) ? candidate : `import-${index + 1}`;
  while (usedIds.has(id)) id = `${id}-x`;

  usedIds.add(id);
  return id;
}

function fail(error) {
  return { ok: false, error };
}
