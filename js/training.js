/**
 * Selbst geplante Trainingseinheiten: Prüfung, Abgleich mit den Läufen und XP.
 *
 * Pur und ohne DOM. Die Einheiten kommen als Liste herein, gespeichert wird in
 * storage.js, angezeigt in app.js.
 *
 * Eine Einheit ist ein Vorhaben für einen Tag – nicht mehr. Es gibt bewusst
 * keine Wochenvorlagen: der Trainingsplan-Generator soll später genau diese
 * Einheiten erzeugen und nicht ein zweites, eigenes Format mitbringen.
 *
 * Der Abgleich läuft in eine Richtung: aufgezeichnete Läufe bleiben unberührt,
 * die Einheit merkt sich nichts. Welcher Lauf welche Einheit erfüllt, wird bei
 * jeder Anzeige neu ausgerechnet – wie bei XP und Achievements auch.
 *
 * @typedef {{
 *   kind: 'warmup' | 'main' | 'recovery' | 'cooldown',
 *   repeats?: number,
 *   distanceKm?: number,
 *   durationMinutes?: number
 * }} Segment
 *
 * @typedef {{
 *   id: string,
 *   date: string,
 *   type: string,
 *   segments: Segment[],
 *   note?: string,
 *   createdAt?: string
 * }} Session
 */

import { parseNumber, isValidIsoDate, MAX_DISTANCE_KM, MAX_DURATION_MINUTES } from './validation.js';

/** XP für eine eingehaltene Einheit. */
export const XP_PER_SESSION = 15;

/**
 * Ab welchem Anteil der geplanten Distanz die Einheit als erfüllt gilt.
 * 100 % wäre unrealistisch – kaum ein Lauf trifft die Planung auf den Meter.
 */
export const FULFILL_RATIO = 0.8;

export const MAX_SEGMENTS = 12;
export const MAX_REPEATS = 50;
export const MAX_NOTE_LENGTH = 200;

export const SESSION_TYPES = [
  { id: 'easy', label: 'Dauerlauf', hint: 'Ruhiges Tempo, Grundlage.' },
  { id: 'long', label: 'Long Run', hint: 'Die lange Einheit der Woche.' },
  { id: 'tempo', label: 'Tempolauf', hint: 'Zügig und gleichmäßig.' },
  { id: 'interval', label: 'Intervalle', hint: 'Belastung im Wechsel mit Trabpausen.' },
  { id: 'rest', label: 'Ruhetag', hint: 'Bewusst kein Lauf.' },
];

export const SEGMENT_KINDS = [
  { id: 'warmup', label: 'Einlaufen' },
  { id: 'main', label: 'Belastung' },
  { id: 'recovery', label: 'Trabpause' },
  { id: 'cooldown', label: 'Auslaufen' },
];

const TYPE_IDS = new Set(SESSION_TYPES.map((type) => type.id));
const KIND_IDS = new Set(SEGMENT_KINDS.map((kind) => kind.id));

/** Ruhetage haben keine Segmente – ein Ruhetag mit Belastung wäre keiner. */
export function isRestType(type) {
  return type === 'rest';
}

export function typeLabel(type) {
  return SESSION_TYPES.find((entry) => entry.id === type)?.label ?? type;
}

export function segmentLabel(kind) {
  return SEGMENT_KINDS.find((entry) => entry.id === kind)?.label ?? kind;
}

/* ------------------------------------------------------------- Prüfung ---- */

/**
 * Prüft eine Einheit und gibt sie normalisiert zurück.
 *
 * Wie bei validateRun() bleibt die `id` außen vor: beim Anlegen vergibt sie der
 * Speicher, beim Bearbeiten bleibt die alte, beim Import kommt sie aus der
 * Datei.
 *
 * Eine Einheit **ohne** Segmente ist erlaubt und ausdrücklich gewollt – "am
 * Dienstag locker laufen" ist eine gültige Planung. Sie hat dann kein
 * Distanzziel, und jeder Lauf an diesem Tag erfüllt sie.
 *
 * @param {unknown} input
 * @returns {{ ok: true, session: Session } | { ok: false, errors: {field: string, message: string}[] }}
 */
export function validateSession(input) {
  if (input === null || typeof input !== 'object') {
    return { ok: false, errors: [{ field: 'session', message: 'Das ist keine Einheit.' }] };
  }

  const errors = [];

  const date = typeof input.date === 'string' ? input.date.trim() : '';
  if (date === '') {
    errors.push({ field: 'date', message: 'Bitte ein Datum wählen.' });
  } else if (!isValidIsoDate(date)) {
    errors.push({ field: 'date', message: 'Das Datum muss im Format JJJJ-MM-TT vorliegen.' });
  }

  const type = typeof input.type === 'string' ? input.type.trim() : '';
  if (type === '') {
    errors.push({ field: 'type', message: 'Bitte eine Art der Einheit wählen.' });
  } else if (!TYPE_IDS.has(type)) {
    errors.push({ field: 'type', message: 'Diese Art der Einheit gibt es nicht.' });
  }

  const rohSegmente = Array.isArray(input.segments) ? input.segments : [];
  if (rohSegmente.length > MAX_SEGMENTS) {
    errors.push({
      field: 'segments',
      message: `Mehr als ${MAX_SEGMENTS} Abschnitte sind zu viel für eine Einheit.`,
    });
  }

  const segments = [];
  if (!isRestType(type)) {
    rohSegmente.slice(0, MAX_SEGMENTS).forEach((raw, index) => {
      const geprueft = validateSegment(raw, index);
      if (geprueft.ok) segments.push(geprueft.segment);
      else errors.push(...geprueft.errors);
    });
  }

  let note;
  if (typeof input.note === 'string' && input.note.trim() !== '') {
    const candidate = input.note.trim();
    if (candidate.length > MAX_NOTE_LENGTH) {
      errors.push({
        field: 'note',
        message: `Die Notiz darf höchstens ${MAX_NOTE_LENGTH} Zeichen lang sein.`,
      });
    } else {
      note = candidate;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  // Unbekannte Felder fallen hier absichtlich weg.
  const session = { date, type, segments };
  if (note) session.note = note;
  if (typeof input.createdAt === 'string' && input.createdAt.trim() !== '') {
    session.createdAt = input.createdAt.trim();
  }

  return { ok: true, session };
}

function validateSegment(raw, index) {
  const position = index + 1;
  if (raw === null || typeof raw !== 'object') {
    return {
      ok: false,
      errors: [{ field: `segments.${index}`, message: `Abschnitt ${position} ist unbrauchbar.` }],
    };
  }

  const errors = [];

  const kind = typeof raw.kind === 'string' ? raw.kind.trim() : 'main';
  if (!KIND_IDS.has(kind)) {
    errors.push({
      field: `segments.${index}.kind`,
      message: `Abschnitt ${position} hat keine bekannte Art.`,
    });
  }

  let repeats = 1;
  if (isFilled(raw.repeats)) {
    const candidate = parseNumber(raw.repeats);
    if (candidate === null || !Number.isInteger(candidate) || candidate < 1) {
      errors.push({
        field: `segments.${index}.repeats`,
        message: `Abschnitt ${position}: die Wiederholungen müssen eine ganze Zahl ab 1 sein.`,
      });
    } else if (candidate > MAX_REPEATS) {
      errors.push({
        field: `segments.${index}.repeats`,
        message: `Abschnitt ${position}: mehr als ${MAX_REPEATS} Wiederholungen – bitte prüfen.`,
      });
    } else {
      repeats = candidate;
    }
  }

  let distanceKm;
  if (isFilled(raw.distanceKm)) {
    const candidate = parseNumber(raw.distanceKm);
    if (candidate === null || !(candidate > 0)) {
      errors.push({
        field: `segments.${index}.distanceKm`,
        message: `Abschnitt ${position}: die Distanz muss größer als 0 km sein.`,
      });
    } else if (candidate > MAX_DISTANCE_KM) {
      errors.push({
        field: `segments.${index}.distanceKm`,
        message: `Abschnitt ${position}: das sind mehr als ${MAX_DISTANCE_KM} km – bitte prüfen.`,
      });
    } else {
      distanceKm = candidate;
    }
  }

  let durationMinutes;
  if (isFilled(raw.durationMinutes)) {
    const candidate = parseNumber(raw.durationMinutes);
    if (candidate === null || !(candidate > 0)) {
      errors.push({
        field: `segments.${index}.durationMinutes`,
        message: `Abschnitt ${position}: die Dauer muss größer als 0 Minuten sein.`,
      });
    } else if (candidate > MAX_DURATION_MINUTES) {
      errors.push({
        field: `segments.${index}.durationMinutes`,
        message: `Abschnitt ${position}: das sind mehr als ${MAX_DURATION_MINUTES} Minuten – bitte prüfen.`,
      });
    } else {
      durationMinutes = candidate;
    }
  }

  if (distanceKm === undefined && durationMinutes === undefined && errors.length === 0) {
    errors.push({
      field: `segments.${index}`,
      message: `Abschnitt ${position} braucht eine Distanz oder eine Dauer.`,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  const segment = { kind, repeats };
  if (distanceKm !== undefined) segment.distanceKm = distanceKm;
  if (durationMinutes !== undefined) segment.durationMinutes = durationMinutes;

  return { ok: true, segment };
}

/** Wirft alles weg, womit sich nicht rechnen lässt. */
export function normalizeSessions(sessions) {
  if (!Array.isArray(sessions)) return [];

  return sessions
    .filter(
      (session) =>
        session !== null &&
        typeof session === 'object' &&
        typeof session.id === 'string' &&
        session.id !== '' &&
        isValidIsoDate(session.date) &&
        TYPE_IDS.has(session.type)
    )
    .map((session) => ({ ...session, segments: Array.isArray(session.segments) ? session.segments : [] }));
}

/* -------------------------------------------------------------- Umfang ---- */

/** Geplante Gesamtdistanz. 0 heißt "kein Distanzziel", nicht "0 km laufen". */
export function sessionDistanceKm(session) {
  if (isRestType(session?.type)) return 0;

  return (session?.segments ?? []).reduce(
    (summe, segment) => summe + (segment?.distanceKm ?? 0) * (segment?.repeats ?? 1),
    0
  );
}

/** Geplante Gesamtdauer in Minuten. 0 heißt "kein Zeitziel". */
export function sessionDurationMinutes(session) {
  if (isRestType(session?.type)) return 0;

  return (session?.segments ?? []).reduce(
    (summe, segment) => summe + (segment?.durationMinutes ?? 0) * (segment?.repeats ?? 1),
    0
  );
}

/**
 * Kurzfassung einer Einheit für die Liste, z.B.
 * "2 km Einlaufen · 6× 0,4 km Belastung · 2 km Auslaufen".
 */
export function describeSession(session) {
  if (isRestType(session?.type)) return 'Kein Lauf geplant';

  const teile = (session?.segments ?? []).map((segment) => {
    const menge =
      segment.distanceKm !== undefined
        ? `${formatKm(segment.distanceKm)} km`
        : `${segment.durationMinutes} min`;
    const wiederholungen = (segment.repeats ?? 1) > 1 ? `${segment.repeats}× ` : '';

    return `${wiederholungen}${menge} ${segmentLabel(segment.kind)}`;
  });

  return teile.length > 0 ? teile.join(' · ') : 'Ohne festes Ziel';
}

/* ------------------------------------------------------------- Abgleich ---- */

/**
 * Wurde die Einheit **vor** dem geplanten Tag angelegt?
 *
 * Nur dann gibt es XP. Ohne diese Bedingung könnte man eine Einheit
 * nachträglich zu einem längst gelaufenen Lauf erfinden und sich beliebig viele
 * Bonus-XP holen – das wäre keine Plantreue, sondern Buchhaltung.
 *
 * Einheiten ohne `createdAt` stammen aus einer Sicherung von vor diesem Feature
 * oder aus einer handgeschriebenen Datei; sie gelten als rechtzeitig geplant.
 */
export function plannedInAdvance(session) {
  if (typeof session?.createdAt !== 'string' || session.createdAt === '') return true;
  return session.createdAt.slice(0, 10) <= session.date;
}

/**
 * Ordnet jeder Einheit den Lauf zu, der sie erfüllt.
 *
 * Ein Lauf kann höchstens eine Einheit erfüllen. Innerhalb eines Tages werden
 * die anspruchsvollsten Einheiten zuerst bedient und bekommen den längsten noch
 * freien Lauf – sonst würde ein 3-km-Lauf den geplanten Long Run "verbrauchen"
 * und die lockere Einheit daneben ginge leer aus.
 *
 * Status:
 *   geplant   – Tag liegt noch vor uns (oder ist heute) und ist offen
 *   erfuellt  – passender Lauf da, bzw. beim Ruhetag: kein Lauf an dem Tag
 *   teilweise – gelaufen, aber unter `FULFILL_RATIO` der geplanten Distanz
 *   verpasst  – Tag ist vorbei und die Einheit blieb offen
 *
 * @param {Session[]} sessions
 * @param {import('./storage.js').Run[]} runs
 * @param {{ today?: string }} [options]
 * @returns {{ session: Session, run: ?object, status: string, targetKm: number, xp: number }[]}
 *          in derselben Reihenfolge wie `sessions`
 */
export function matchPlan(sessions, runs, { today = todayIso() } = {}) {
  const sauber = normalizeSessions(sessions);
  const laeufeAmTag = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    if (run === null || typeof run !== 'object' || !isValidIsoDate(run.date)) continue;
    if (!(run.distanceKm > 0)) continue;

    if (!laeufeAmTag.has(run.date)) laeufeAmTag.set(run.date, []);
    laeufeAmTag.get(run.date).push(run);
  }

  // Längster Lauf zuerst – passend zur Reihenfolge der Einheiten unten.
  for (const liste of laeufeAmTag.values()) liste.sort((a, b) => b.distanceKm - a.distanceKm);

  const ergebnis = new Map();

  // Nach Tag gruppieren, damit die Zuordnung je Tag entschieden werden kann.
  const proTag = new Map();
  for (const session of sauber) {
    if (!proTag.has(session.date)) proTag.set(session.date, []);
    proTag.get(session.date).push(session);
  }

  for (const [datum, einheiten] of proTag) {
    const vergangen = datum < today;
    const frei = [...(laeufeAmTag.get(datum) ?? [])];

    const laufeinheiten = einheiten.filter((session) => !isRestType(session.type));
    const ruhetage = einheiten.filter((session) => isRestType(session.type));

    // Anspruchsvollstes zuerst; Einheiten ohne Distanzziel ganz zum Schluss,
    // sie lassen sich von jedem Lauf erfüllen.
    laufeinheiten.sort((a, b) => sessionDistanceKm(b) - sessionDistanceKm(a));

    for (const session of laufeinheiten) {
      const targetKm = sessionDistanceKm(session);
      const lauf = frei.shift() ?? null;

      let status;
      if (lauf === null) status = vergangen ? 'verpasst' : 'geplant';
      else if (targetKm === 0 || lauf.distanceKm >= targetKm * FULFILL_RATIO) status = 'erfuellt';
      else status = 'teilweise';

      ergebnis.set(session.id, {
        session,
        run: lauf,
        status,
        targetKm,
        xp: status === 'erfuellt' && plannedInAdvance(session) ? XP_PER_SESSION : 0,
      });
    }

    for (const session of ruhetage) {
      // Ein Ruhetag ist erst am Abend gewonnen: solange der Tag läuft, kann
      // noch ein Lauf dazukommen.
      const gelaufen = (laeufeAmTag.get(datum) ?? []).length > 0;
      const status = !vergangen ? 'geplant' : gelaufen ? 'verpasst' : 'erfuellt';

      // Ruhetage bringen keine XP – fürs Nichtlaufen soll es keine Belohnung
      // geben, sie stehen im Plan zur Übersicht.
      ergebnis.set(session.id, { session, run: null, status, targetKm: 0, xp: 0 });
    }
  }

  return sauber.map((session) => ergebnis.get(session.id)).filter(Boolean);
}

/** Bonus-XP aus eingehaltenen Einheiten. */
export function planXp(sessions, runs, options) {
  return matchPlan(sessions, runs, options).reduce((summe, eintrag) => summe + eintrag.xp, 0);
}

/**
 * Kennzahlen für die Anzeige im Trainings-Tab.
 *
 * `adherencePercent` bezieht sich nur auf abgeschlossene Tage – offene
 * Einheiten in der Zukunft würden die Quote sonst künstlich drücken.
 *
 * @returns {{
 *   total: number, open: number, fulfilled: number, partial: number,
 *   missed: number, decided: number, adherencePercent: number, xp: number
 * }}
 */
export function buildPlanStats(sessions, runs, options) {
  const eintraege = matchPlan(sessions, runs, options);

  const zaehler = { erfuellt: 0, teilweise: 0, verpasst: 0, geplant: 0 };
  let xp = 0;

  for (const eintrag of eintraege) {
    zaehler[eintrag.status] += 1;
    xp += eintrag.xp;
  }

  const entschieden = zaehler.erfuellt + zaehler.teilweise + zaehler.verpasst;

  return {
    total: eintraege.length,
    open: zaehler.geplant,
    fulfilled: zaehler.erfuellt,
    partial: zaehler.teilweise,
    missed: zaehler.verpasst,
    decided: entschieden,
    adherencePercent: entschieden === 0 ? 0 : (zaehler.erfuellt / entschieden) * 100,
    xp,
  };
}

/* ----------------------------------------------------------------- Intern -- */

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatKm(value) {
  return String(Number(value.toFixed(2))).replace('.', ',');
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
