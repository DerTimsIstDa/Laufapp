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

import { validateRun, isValidIsoDate, normalizeName, normalizeWeeklyGoal } from './validation.js';
import { validateSession } from './training.js';
import { normalizePlan } from './exercise-plan.js';

export const EXPORT_FORMAT = 'funrun-export';

/**
 * Kennung aus der Zeit, als die App "Laufapp" hiess. Ältere Sicherungen
 * müssen sich weiter einlesen lassen – eine Datei, die die App selbst
 * geschrieben hat, darf sie nicht ablehnen.
 */
export const LEGACY_EXPORT_FORMATS = ['laufapp-export'];

/**
 * Bleibt bei 1, obwohl seither Felder dazugekommen sind. Neue Felder sind
 * additiv: eine ältere App überliest sie, eine neuere ergänzt sie mit dem
 * Leerwert. Eine höhere Zahl würde die Datei für ältere Fassungen dagegen
 * rundheraus unlesbar machen – siehe die Prüfung in parseImport().
 */
export const EXPORT_VERSION = 1;

/**
 * Baut das Export-Objekt.
 * @param {import('./storage.js').Run[]} runs
 */
export function buildExport(
  runs,
  {
    exportedAt = new Date(),
    exerciseLog = [],
    sessions = [],
    exercisePlan = [],
    profile = { name: '', weeklyGoal: 0, goalSince: '' },
  } = {}
) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    runCount: runs.length,
    runs,
    // Alles, was sonst nur in diesem Browser läge, gehört mit in die
    // Sicherung – sonst wäre der Export kein vollständiges Abbild mehr.
    exerciseLog,
    sessions,
    exercisePlan,
    profile,
  };
}

/** Export als eingerückter JSON-Text – von Hand lesbar und korrigierbar. */
export function serializeExport(runs, options) {
  return JSON.stringify(buildExport(runs, options), null, 2);
}

/**
 * Nach so vielen Tagen ohne Sicherung wird erinnert.
 *
 * Dreissig Tage sind der Kompromiss zwischen "nervt" und "zu spät": die Daten
 * liegen ausschliesslich im localStorage eines Browsers, und ein geleerter
 * Cache nimmt alles mit. Häufiger zu erinnern trainiert nur, den Hinweis zu
 * übersehen – und ein übersehener Hinweis schützt niemanden.
 */
export const EXPORT_REMINDER_DAYS = 30;

/**
 * @typedef {Object} ExportReminder
 * @property {boolean} due      es ist Zeit für eine Sicherung
 * @property {boolean} never    es wurde noch nie gesichert
 * @property {?number} daysSince Tage seit der letzten Sicherung, null = nie
 */

/**
 * Ist eine Sicherung fällig?
 *
 * Pur und ohne Uhr: der heutige Tag kommt herein, damit sich jede Grenze
 * prüfen lässt, ohne die Systemzeit zu stellen.
 *
 * Ohne einen einzigen Lauf gibt es nichts zu verlieren – dann wird nicht
 * erinnert. Ein Hinweis, der zum Sichern von nichts auffordert, ist der
 * schnellste Weg, dass der Hinweis künftig ignoriert wird.
 *
 * Eine Sicherung, die in der Zukunft liegt, zählt als heute. Das passiert bei
 * verstellter Uhr oder über Zeitzonen hinweg, und eine negative Zahl Tage
 * wäre keine Aussage, sondern ein Rechenfehler auf dem Schirm.
 *
 * @param {{ lastExport?: ?string, runCount?: number, todayIso: string }} stand
 * @returns {ExportReminder}
 */
export function exportReminder({ lastExport = null, runCount = 0, todayIso } = {}) {
  const nie = { due: false, never: true, daysSince: null };

  if (!Number.isFinite(runCount) || runCount <= 0) {
    return { due: false, never: !isValidIsoDate(lastExport), daysSince: null };
  }

  if (!isValidIsoDate(lastExport)) return { ...nie, due: true };
  if (!isValidIsoDate(todayIso)) return nie;

  const daysSince = Math.max(0, tagesAbstand(lastExport, todayIso));

  return {
    due: daysSince >= EXPORT_REMINDER_DAYS,
    never: false,
    daysSince,
  };
}

/**
 * Ganze Tage zwischen zwei ISO-Tagen.
 *
 * Über UTC gerechnet, obwohl beides lokale Tage sind: Date.UTC() kennt keine
 * Sommerzeit, und genau deshalb ist die Differenz hier immer ein Vielfaches
 * von 24 Stunden. Mit lokalen Daten läge zweimal im Jahr eine Stunde daneben.
 */
function tagesAbstand(vonIso, bisIso) {
  const alsZahl = (iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };

  return Math.round((alsZahl(bisIso) - alsZahl(vonIso)) / 86_400_000);
}

/** Dateiname mit lokalem Datum, z.B. "funrun-2026-08-14.json". */
export function exportFileName(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `funrun-${year}-${month}-${day}.json`;
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
  if (
    payload.format !== undefined &&
    payload.format !== EXPORT_FORMAT &&
    !LEGACY_EXPORT_FORMATS.includes(payload.format)
  ) {
    return fail('Die Datei stammt nicht aus FunRun.');
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
    exercisePlan: readExercisePlan(payload.exercisePlan),
    profile: readProfile(payload),
  };
}

/**
 * Name und Wochenziel aus der Datei.
 *
 * `profileName` auf oberster Ebene ist die Schreibweise der ersten Fassung, in
 * der es nur einen Namen gab. Sie wird weiter gelesen: eine Datei, die die App
 * selbst geschrieben hat, darf sie nicht stillschweigend um den Namen bringen.
 */
function readProfile(payload) {
  const roh = payload?.profile !== null && typeof payload?.profile === 'object' ? payload.profile : {};

  const weeklyGoal = normalizeWeeklyGoal(roh.weeklyGoal);

  // Ohne brauchbaren Stichtag zählt der Bonus ab dem Einlesen, nicht ab
  // irgendwann: eine Datei soll keine Wochen mitbringen können, die niemand
  // gelaufen ist.
  const goalSince = isValidIsoDate(roh.goalSince) ? roh.goalSince : '';

  return {
    name: normalizeName(roh.name ?? payload?.profileName),
    weeklyGoal,
    goalSince: weeklyGoal === 0 ? '' : goalSince,
  };
}

/**
 * Geplante Übungen aus der Datei. Fehlen sie oder verweisen sie auf Übungen,
 * die es nicht mehr gibt, bleibt der Plan eben leer – ein Vorhaben ist nichts,
 * was sich verlieren liesse.
 */
function readExercisePlan(raw) {
  const vergebeneIds = new Set();

  return normalizePlan(raw).map((entry, index) => {
    const kandidat = typeof entry.id === 'string' ? entry.id.trim() : '';

    let id = kandidat !== '' && !vergebeneIds.has(kandidat) ? kandidat : `geplant-${index + 1}`;
    while (vergebeneIds.has(id)) id = `${id}-x`;
    vergebeneIds.add(id);

    return { id, exerciseId: entry.exerciseId, date: entry.date };
  });
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
