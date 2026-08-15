/**
 * Prüfung und Normalisierung von Lauf-Eingaben.
 *
 * Pur und ohne DOM: dieselbe Prüfung gilt für das Formular (neu und
 * bearbeiten) und für jeden Eintrag aus einer Importdatei. Dadurch kann kein
 * Weg in den Speicher an der Validierung vorbeiführen.
 */

import { normalizeTrack, MIN_POINTS } from './route.js';

export const MAX_DISTANCE_KM = 1000;
export const MAX_DURATION_MINUTES = 1440;

/** Reicht für jeden Namen und für jede Kopfzeile, in die er passen muss. */
export const MAX_NAME_LENGTH = 30;

/** Zweimal am Tag ist reichlich; darüber ist es ein Vertipper. */
export const MAX_WEEKLY_GOAL = 14;

/**
 * Grenzen der Pace in Minuten pro Kilometer. Unter 2:00 liefe man
 * Weltrekord, über 30:00 ginge man spazieren – beides ist eher ein
 * Zahlendreher als eine Angabe.
 */
export const MIN_PACE_MIN_PER_KM = 2;
export const MAX_PACE_MIN_PER_KM = 30;

/**
 * Wie weit die eingetragene Pace von der gerechneten abweichen darf, bevor
 * es einen Hinweis gibt: 15 Sekunden oder 10 %, je nachdem was grösser ist.
 * Wer Distanz und Dauer gerundet einträgt, liegt schnell ein paar Sekunden
 * daneben – das ist normal und keine Meldung wert.
 */
const PACE_TOLERANCE_MIN = 0.25;
const PACE_TOLERANCE_RATIO = 0.1;

const PACE_CLOCK = /^(\d{1,2}):([0-5]\d)$/;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Zahl aus Eingabe lesen. Akzeptiert auch "5,4" aus deutschen Tastaturen.
 * @returns {?number} null, wenn keine brauchbare Zahl drinsteht
 */
export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "JJJJ-MM-TT" und ein real existierender Tag (der 30. Februar zählt nicht). */
export function isValidIsoDate(value) {
  if (typeof value !== 'string') return false;

  const match = ISO_DATE.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Namen aufräumen: Rand-Leerraum weg, innere Leerraumketten auf ein Leerzeichen
 * zusammengezogen, Steuerzeichen entfernt, dann auf MAX_NAME_LENGTH gekürzt.
 *
 * Mehr Prüfung wäre Anmaßung – ein Name ist, was jemand als seinen angibt.
 * Gekürzt statt abgelehnt: wer 40 Zeichen tippt, will nicht belehrt werden.
 *
 * @returns {string} leer, wenn nichts Brauchbares übrig bleibt
 */
export function normalizeName(value) {
  if (typeof value !== 'string') return '';

  return value
    // Tabulator und Zeilenumbruch trennen Wörter – die werden zum Leerzeichen,
    // sonst klebte "Tim\tB." als "TimB." zusammen.
    .replace(/\p{Cc}/gu, ' ')
    // Was übrig bleibt (Richtungsmarken, unbelegte Stellen), ist unsichtbar
    // und fliegt ersatzlos raus.
    .replace(/\p{C}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

/**
 * Wochenziel: wie oft in der Woche gelaufen werden soll.
 *
 * 0 heißt "kein Ziel" und ist eine gültige Angabe – nicht jeder will sich
 * eine Vorgabe machen. Unbrauchbares ergibt ebenfalls 0: ein Ziel, das
 * niemand lesen kann, ist keines.
 *
 * @returns {number} ganze Zahl von 0 bis MAX_WEEKLY_GOAL
 */
export function normalizeWeeklyGoal(value) {
  const zahl = parseNumber(value);
  if (zahl === null) return 0;

  const ganz = Math.trunc(zahl);
  if (ganz < 0 || ganz > MAX_WEEKLY_GOAL) return 0;

  return ganz;
}

/**
 * Pace aus einer Eingabe lesen.
 *
 * Zwei Schreibweisen, weil beide vorkommen: "5:30" steht so auf jeder Uhr,
 * "5,5" tippt, wer das Feld für ein normales Zahlenfeld hält. Beides ergibt
 * 5,5 Minuten pro Kilometer.
 *
 * @returns {?number} Minuten pro km; null, wenn nichts Brauchbares drinsteht
 */
export function parsePace(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (text === '') return null;

  const uhr = PACE_CLOCK.exec(text);
  if (uhr) return Number(uhr[1]) + Number(uhr[2]) / 60;

  // Ein Doppelpunkt, der die Prüfung oben nicht bestanden hat, ist ein
  // Tippfehler – nicht als Dezimalzahl weiterreichen.
  if (text.includes(':')) return null;

  return parseNumber(text);
}

/** "HH:MM" von 00:00 bis 23:59. */
export function isValidTimeOfDay(value) {
  return typeof value === 'string' && TIME_OF_DAY.test(value);
}

/**
 * Prüft eine Lauf-Eingabe und gibt sie normalisiert zurück.
 *
 * Die `id` bleibt bewusst außen vor – beim Anlegen vergibt sie der Speicher,
 * beim Bearbeiten bleibt die alte, beim Import kommt sie aus der Datei.
 *
 * `warnings` meldet Auffälligkeiten, die den Lauf nicht ungültig machen –
 * derzeit nur eine Pace, die nicht zu Distanz und Dauer passt. Gespeichert
 * wird trotzdem: wer die Pace von der Uhr abtippt, hat sie vermutlich
 * richtiger als die Rechnung aus zwei gerundeten Zahlen.
 *
 * @param {unknown} input
 * @returns {{ ok: true, run: object, warnings: string[] }
 *          | { ok: false, errors: {field: string, message: string}[] }}
 */
export function validateRun(input) {
  if (input === null || typeof input !== 'object') {
    return {
      ok: false,
      errors: [{ field: 'run', message: 'Das ist kein Lauf-Eintrag.' }],
    };
  }

  const errors = [];

  const distanceKm = parseNumber(input.distanceKm);
  if (distanceKm === null) {
    // Seit die Felder type="text" sind, kommt hier auch Text an. "Bitte eine
    // Distanz eintragen" wäre die falsche Auskunft, wenn etwas drinsteht.
    errors.push({
      field: 'distanceKm',
      message: isFilled(input.distanceKm)
        ? 'Die Distanz muss eine Zahl sein, zum Beispiel 5,4.'
        : 'Bitte eine Distanz eintragen.',
    });
  } else if (!(distanceKm > 0)) {
    errors.push({ field: 'distanceKm', message: 'Die Distanz muss größer als 0 km sein.' });
  } else if (distanceKm > MAX_DISTANCE_KM) {
    errors.push({
      field: 'distanceKm',
      message: `Das sind mehr als ${MAX_DISTANCE_KM} km – bitte prüfen.`,
    });
  }

  const date = typeof input.date === 'string' ? input.date.trim() : '';
  if (date === '') {
    errors.push({ field: 'date', message: 'Bitte ein Datum wählen.' });
  } else if (!isValidIsoDate(date)) {
    errors.push({ field: 'date', message: 'Das Datum muss im Format JJJJ-MM-TT vorliegen.' });
  }

  let timeOfDay;
  if (isFilled(input.timeOfDay)) {
    const candidate = String(input.timeOfDay).trim();
    if (isValidTimeOfDay(candidate)) timeOfDay = candidate;
    else errors.push({ field: 'timeOfDay', message: 'Die Uhrzeit muss im Format HH:MM vorliegen.' });
  }

  let durationMinutes;
  if (isFilled(input.durationMinutes)) {
    const candidate = parseNumber(input.durationMinutes);
    if (candidate === null) {
      errors.push({
        field: 'durationMinutes',
        message: 'Die Dauer muss eine Zahl sein, zum Beispiel 28.',
      });
    } else if (!(candidate > 0)) {
      errors.push({ field: 'durationMinutes', message: 'Die Dauer muss größer als 0 Minuten sein.' });
    } else if (candidate > MAX_DURATION_MINUTES) {
      errors.push({
        field: 'durationMinutes',
        message: `Das sind mehr als ${MAX_DURATION_MINUTES} Minuten – bitte prüfen.`,
      });
    } else {
      durationMinutes = candidate;
    }
  }

  let paceMinPerKm;
  if (isFilled(input.paceMinPerKm)) {
    const candidate = parsePace(input.paceMinPerKm);
    if (candidate === null) {
      errors.push({
        field: 'paceMinPerKm',
        message: 'Die Pace muss wie 5:30 aussehen – Minuten und Sekunden je Kilometer.',
      });
    } else if (candidate < MIN_PACE_MIN_PER_KM || candidate > MAX_PACE_MIN_PER_KM) {
      errors.push({
        field: 'paceMinPerKm',
        message: `Die Pace muss zwischen ${MIN_PACE_MIN_PER_KM}:00 und ${MAX_PACE_MIN_PER_KM}:00 min/km liegen.`,
      });
    } else {
      paceMinPerKm = candidate;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  // Unbekannte Felder fallen hier absichtlich weg.
  const run = { distanceKm, date };
  if (timeOfDay) run.timeOfDay = timeOfDay;
  if (durationMinutes) run.durationMinutes = durationMinutes;
  if (paceMinPerKm) run.paceMinPerKm = paceMinPerKm;
  if (input.source === 'gps' || input.source === 'manual') run.source = input.source;

  const warnings = [];
  if (paceMinPerKm !== undefined && durationMinutes !== undefined) {
    const gerechnet = durationMinutes / distanceKm;
    const spanne = Math.max(PACE_TOLERANCE_MIN, gerechnet * PACE_TOLERANCE_RATIO);

    if (Math.abs(paceMinPerKm - gerechnet) > spanne) {
      warnings.push(
        `Die eingetragene Pace passt nicht zu Distanz und Dauer – daraus ergäben sich ` +
          `${formatMinutes(gerechnet)} min/km. Gespeichert wurde deine Angabe.`
      );
    }
  }

  // Eine unbrauchbare Strecke macht den Lauf nicht ungültig – sie fällt
  // stillschweigend weg, dann zeigt die Detailansicht eben keine Route.
  const track = normalizeTrack(input.track);
  if (track.length >= MIN_POINTS) {
    run.track = track.map((point) => [point.lat, point.lon]);
  }

  return { ok: true, run, warnings };
}

/** Erste Fehlermeldung eines Ergebnisses – für die einzeilige Anzeige. */
export function firstErrorMessage(result) {
  return result.ok ? null : result.errors[0].message;
}

/**
 * Minuten als "5:30". Eigene kleine Fassung, damit validation.js pur bleibt
 * und nicht wegen einer Meldung von geo.js abhängt.
 */
function formatMinutes(minutes) {
  const gesamt = Math.round(minutes * 60);
  return `${Math.floor(gesamt / 60)}:${String(gesamt % 60).padStart(2, '0')}`;
}

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}
