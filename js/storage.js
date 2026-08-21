/**
 * Persistenz der Läufe im localStorage.
 *
 * Weder XP-Stand noch freigeschaltete Achievements werden gespeichert – beides
 * wird immer aus den Läufen berechnet (siehe xp.js und achievements.js). So
 * bleibt alles konsistent, wenn ein Lauf gelöscht oder eine Regel später
 * angepasst wird.
 */

/**
 * Die Schlüssel behalten den alten Namen, obwohl die App jetzt FunRun heisst.
 * Ein Umbenennen wäre für jedes bestehende Gerät ein Datenverlust – die Läufe
 * lägen unter dem alten Schlüssel und wären für die App verschwunden.
 */
const STORAGE_KEY = 'laufapp.runs.v1';
const EXERCISE_KEY = 'laufapp.exercises.v1';
const TRAINING_KEY = 'laufapp.training.v1';
const PROFILE_KEY = 'laufapp.profile.v1';
const EXERCISE_PLAN_KEY = 'laufapp.exercise-plan.v1';
const RECORDING_KEY = 'laufapp.recording.v1';

/* --------------------------------------------------- Schreiben ---- */

/**
 * Was passiert, wenn das Schreiben fehlschlägt.
 *
 * Bis hierher wurde jeder Fehler nur auf die Konsole gelegt. Auf dem Handy
 * sieht die niemand: der Speicher ist voll, der Lauf ist weg, und die App tut,
 * als sei nichts gewesen. Für eine App, in der eine Stunde Laufen in einem
 * einzigen `setItem` steckt, ist das der schlimmste mögliche Ausgang.
 *
 * Deshalb darf sich eine Stelle eintragen, die den Fehler sichtbar macht –
 * gesetzt wird sie beim Start in app.js. Absichtlich nur eine: zwei Melder
 * hiessen zwei Meldungen für einen Fehler.
 *
 * @type {?(info: StorageError) => void}
 */
let fehlerMelder = null;

/**
 * @typedef {Object} StorageError
 * @property {string} key    der betroffene Speicherschlüssel
 * @property {string} was    was nicht gespeichert werden konnte, im Klartext
 * @property {boolean} voll  der Speicher ist voll (im Unterschied zu gesperrt)
 * @property {unknown} error der ursprüngliche Fehler
 */

/**
 * Trägt die Meldestelle ein. `null` schaltet sie wieder ab.
 * @param {?(info: StorageError) => void} melder
 */
export function setStorageErrorHandler(melder) {
  fehlerMelder = typeof melder === 'function' ? melder : null;
}

/**
 * Ist das ein „Speicher voll"? Firefox, Safari und Chrome melden das
 * unterschiedlich – über `name`, über `code` oder gar nicht. Wer keine der
 * bekannten Kennungen trägt, gilt als anderer Fehler; dann steht in der
 * Meldung nicht fälschlich „voll".
 */
function istQuotaFehler(err) {
  if (err === null || typeof err !== 'object') return false;

  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

/**
 * Schreibt einen Wert und meldet, wenn es schiefgeht.
 *
 * Alle Töpfe laufen hier durch, damit die Behandlung an einer Stelle steht und
 * nicht sechsmal leicht verschieden.
 *
 * @param {string} key
 * @param {unknown} wert wird als JSON abgelegt
 * @param {string} was für die Meldung an den Nutzer
 * @returns {boolean} true, wenn es geschrieben wurde
 */
function schreibe(key, wert, was) {
  try {
    localStorage.setItem(key, JSON.stringify(wert));
    return true;
  } catch (err) {
    return melde(key, was, err);
  }
}

/** Entfernt einen Wert; dieselbe Behandlung wie beim Schreiben. */
function entferne(key, was) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    return melde(key, was, err);
  }
}

function melde(key, was, err) {
  // Doppelpunkt statt gebautem Satz: „was“ kommt mal im Singular, mal im
  // Plural herein, und ein Verb dazwischen müsste sich beugen.
  console.error(`${was}: nicht gespeichert.`, err);

  // Die Meldestelle darf den Aufrufer nicht mitreissen: ein Fehler beim
  // Anzeigen der Fehlermeldung wäre ein besonders dummer Weg, Daten zu
  // verlieren.
  try {
    fehlerMelder?.({ key, was, voll: istQuotaFehler(err), error: err });
  } catch (melderFehler) {
    console.error('Die Fehlermeldung selbst ist fehlgeschlagen:', melderFehler);
  }

  return false;
}

/**
 * `timeOfDay` ("HH:MM") und `durationMinutes` sind optional. Sie werden nur
 * für die Achievements Frühaufsteher, Nachteule und Neue Bestzeit gebraucht;
 * Läufe ohne diese Angaben bleiben gültig.
 *
 * `paceMinPerKm` ist ebenfalls optional und wird nur gesetzt, wenn jemand sie
 * von Hand einträgt – etwa aus einer anderen Uhr. Fehlt sie, rechnet
 * geo.js/runPaceMinPerKm sie aus Distanz und Dauer aus. Ältere Läufe ohne
 * das Feld bleiben unverändert gültig.
 *
 * `source` unterscheidet aufgezeichnete von handgetippten Läufen.
 *
 * @typedef {{
 *   id: string,
 *   distanceKm: number,
 *   date: string,
 *   timeOfDay?: string,
 *   durationMinutes?: number,
 *   paceMinPerKm?: number,
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

/**
 * @param {Run[]} runs
 * @returns {boolean} false, wenn nicht geschrieben werden konnte
 */
export function saveRuns(runs) {
  return schreibe(STORAGE_KEY, runs, 'Die Läufe');
}

/**
 * Fügt einen Lauf hinzu und gibt die neue Liste zurück.
 * @param {Run[]} runs
 * @returns {Run[]}
 */
export function addRun(
  runs,
  { distanceKm, date, timeOfDay, durationMinutes, paceMinPerKm, source, track, interval }
) {
  const run = { id: createId(), distanceKm, date };

  // Optionale Felder nur setzen, wenn sie ausgefüllt wurden.
  if (timeOfDay) run.timeOfDay = timeOfDay;
  if (durationMinutes) run.durationMinutes = durationMinutes;
  if (paceMinPerKm) run.paceMinPerKm = paceMinPerKm;
  if (source) run.source = source;
  if (interval) run.interval = interval;
  if (track?.length) run.track = track;

  const next = [run, ...runs].sort(byDateDesc);
  saveRuns(next);
  return next;
}

/**
 * Überschreibt einen Lauf mit geprüften Feldern und gibt die neue Liste zurück.
 *
 * Der Lauf wird komplett neu aufgebaut, damit geleerte Felder auch wirklich
 * verschwinden. `id`, `source` und die aufgezeichnete `track` bleiben
 * erhalten: ein aufgezeichneter Lauf bleibt als GPS-Lauf erkennbar und behält
 * seine Route, auch wenn die Distanz nachträglich korrigiert wurde. Das
 * Formular kann die Route gar nicht bearbeiten.
 *
 * @param {Run[]} runs
 * @returns {Run[]} unverändert, falls es die id nicht gibt
 */
export function updateRun(runs, id, { distanceKm, date, timeOfDay, durationMinutes, paceMinPerKm }) {
  const existing = runs.find((run) => run.id === id);
  if (!existing) return runs;

  const updated = { id, distanceKm, date };
  if (timeOfDay) updated.timeOfDay = timeOfDay;
  if (durationMinutes) updated.durationMinutes = durationMinutes;
  if (paceMinPerKm) updated.paceMinPerKm = paceMinPerKm;
  if (existing.source) updated.source = existing.source;
  // Wie die Route: das Formular kennt das Intervall-Merkmal nicht und darf es
  // deshalb auch nicht wegwerfen.
  if (existing.interval) updated.interval = existing.interval;
  if (existing.track?.length) updated.track = existing.track;

  const next = runs.map((run) => (run.id === id ? updated : run)).sort(byDateDesc);
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

/**
 * Ersetzt den kompletten Bestand – für den Import.
 * @param {Run[]} nextRuns bereits geprüfte Läufe
 * @returns {Run[]}
 */
export function replaceRuns(nextRuns) {
  const next = [...nextRuns].sort(byDateDesc);
  saveRuns(next);
  return next;
}

/* ------------------------------------------------- Erledigte Übungen ---- */

/**
 * Eigene Datenstruktur neben den Läufen – sie hat nichts mit Distanzen zu tun
 * und soll die Lauf-Liste nicht aufblähen.
 *
 * @typedef {import('./exercise-log.js').ExerciseEntry} ExerciseEntry
 * @returns {ExerciseEntry[]} älteste zuerst
 */
export function loadExerciseLog() {
  let raw;
  try {
    raw = localStorage.getItem(EXERCISE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

/**
 * @param {ExerciseEntry[]} entries
 * @returns {boolean} false, wenn nicht geschrieben werden konnte
 */
export function saveExerciseLog(entries) {
  return schreibe(EXERCISE_KEY, entries, 'Die erledigten Übungen');
}

/**
 * Hängt eine erledigte Übung an. Mehrfach am selben Tag ist erlaubt – der
 * Zähler läuft weiter, die XP-Grenze zieht exercise-log.js.
 *
 * @returns {ExerciseEntry[]}
 */
export function addExerciseEntry(entries, { exerciseId, date, at }) {
  const entry = { id: createId(), exerciseId, date, at: at ?? new Date().toISOString() };
  const next = [...entries, entry];

  saveExerciseLog(next);
  return next;
}

/** Ersetzt den ganzen Bestand – für den Import. */
export function replaceExerciseLog(entries) {
  const next = [...entries];
  saveExerciseLog(next);
  return next;
}

/* ------------------------------------------------ Geplante Einheiten ---- */

/**
 * Der Trainingsplan liegt neben den Läufen, nicht in ihnen: eine geplante
 * Einheit ist ein Vorhaben, ein Lauf eine Tatsache. Ob ein Lauf eine Einheit
 * erfüllt, rechnet training.js bei jeder Anzeige neu aus.
 *
 * @typedef {import('./training.js').Session} Session
 * @returns {Session[]} nach Datum, nächster Termin zuerst
 */
export function loadSessions() {
  let raw;
  try {
    raw = localStorage.getItem(TRAINING_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSession).sort(bySessionDate);
  } catch {
    return [];
  }
}

/**
 * @param {Session[]} sessions
 * @returns {boolean} false, wenn nicht geschrieben werden konnte
 */
export function saveSessions(sessions) {
  return schreibe(TRAINING_KEY, sessions, 'Der Trainingsplan');
}

/**
 * Legt eine geprüfte Einheit an und gibt die neue Liste zurück.
 *
 * `createdAt` wird hier gesetzt und nie wieder angefasst: daran hängt, ob eine
 * Einheit rechtzeitig geplant war und XP bringen kann (siehe
 * training.js/plannedInAdvance).
 *
 * @param {Session[]} sessions
 * @returns {Session[]}
 */
export function addSession(sessions, { date, type, segments, interval, note, createdAt }) {
  const session = {
    id: createId(),
    date,
    type,
    segments: segments ?? [],
    createdAt: createdAt ?? new Date().toISOString(),
  };
  if (interval) session.interval = interval;
  if (note) session.note = note;

  const next = [...sessions, session].sort(bySessionDate);
  saveSessions(next);
  return next;
}

/**
 * Überschreibt eine Einheit mit geprüften Feldern.
 *
 * `id` und `createdAt` bleiben erhalten – sonst liesse sich eine nachträglich
 * erfundene Einheit durch einmaliges Bearbeiten in eine rechtzeitig geplante
 * verwandeln.
 *
 * @param {Session[]} sessions
 * @returns {Session[]} unverändert, falls es die id nicht gibt
 */
export function updateSession(sessions, id, { date, type, segments, interval, note }) {
  const existing = sessions.find((session) => session.id === id);
  if (!existing) return sessions;

  const updated = { id, date, type, segments: segments ?? [] };
  if (interval) updated.interval = interval;
  if (note) updated.note = note;
  if (existing.createdAt) updated.createdAt = existing.createdAt;

  const next = sessions.map((session) => (session.id === id ? updated : session)).sort(bySessionDate);
  saveSessions(next);
  return next;
}

/**
 * Entfernt eine Einheit und gibt die neue Liste zurück.
 * @param {Session[]} sessions
 * @returns {Session[]}
 */
export function removeSession(sessions, id) {
  const next = sessions.filter((session) => session.id !== id);
  saveSessions(next);
  return next;
}

/** Ersetzt den kompletten Bestand – für den Import. */
export function replaceSessions(nextSessions) {
  const next = [...nextSessions].sort(bySessionDate);
  saveSessions(next);
  return next;
}

/* ------------------------------------------------- Geplante Übungen ---- */

/**
 * Eigener Schlüssel neben dem Übungs-Protokoll: das eine ist ein Vorhaben,
 * das andere eine Tatsache. Vermischt liessen sie sich nicht mehr trennen,
 * und ein Vorhaben darf keine XP bringen.
 *
 * @typedef {import('./exercise-plan.js').PlannedExercise} PlannedExercise
 * @returns {PlannedExercise[]}
 */
export function loadExercisePlan() {
  let raw;
  try {
    raw = localStorage.getItem(EXERCISE_PLAN_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidPlanned) : [];
  } catch {
    return [];
  }
}

/**
 * @param {PlannedExercise[]} entries bereits geprüfte Einträge
 * @returns {PlannedExercise[]} dieselben Einträge, zum Weiterreichen
 */
export function saveExercisePlan(entries) {
  schreibe(EXERCISE_PLAN_KEY, entries, 'Der Übungsplan');
  return entries;
}

function isValidPlanned(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.exerciseId === 'string' &&
    entry.exerciseId !== '' &&
    typeof entry.date === 'string'
  );
}

/* -------------------------------------------------------------- Profil ---- */

/**
 * Name und Wochenziel liegen in einem eigenen Schlüssel, nicht bei den Läufen:
 * beides ist Einstellung, keine Aufzeichnung. Als Objekt gespeichert, damit
 * weitere Angaben dazukommen können, ohne das Format zu brechen.
 *
 * `goalSince` ist der Tag, an dem das aktuelle Wochenziel gesetzt wurde. Er
 * gehört zum Ziel und nicht zu den Läufen: ohne ihn liesse sich der Bonus
 * rückwirkend ernten (siehe goal.js).
 *
 * @typedef {{ name: string, weeklyGoal: number, goalSince: string }} Profile
 * @returns {Profile} Leerwerte, wenn nichts hinterlegt ist
 */
export function loadProfile() {
  const leer = { name: '', weeklyGoal: 0, goalSince: '' };

  let raw;
  try {
    raw = localStorage.getItem(PROFILE_KEY);
  } catch {
    return leer;
  }
  if (!raw) return leer;

  try {
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      weeklyGoal: typeof parsed?.weeklyGoal === 'number' ? parsed.weeklyGoal : 0,
      goalSince: typeof parsed?.goalSince === 'string' ? parsed.goalSince : '',
    };
  } catch {
    return leer;
  }
}

/**
 * @param {Profile} profile bereits geprüfte Werte
 * @returns {Profile} dieselben Werte, zum Weiterreichen
 */
export function saveProfile({ name, weeklyGoal, goalSince }) {
  const profil = { name, weeklyGoal, goalSince };

  // Ohne Name und ohne Ziel gibt es nichts zu merken – dann weg damit,
  // statt eine leere Hülle liegen zu lassen.
  if (name === '' && weeklyGoal === 0) entferne(PROFILE_KEY, 'Das Profil');
  else schreibe(PROFILE_KEY, profil, 'Das Profil');

  return profil;
}

/* ------------------------------------------------- Aufzeichnungsart ---- */

/**
 * Mit oder ohne GPS – die zuletzt getroffene Wahl.
 *
 * Beim allerersten Mal ist die Antwort auf jedem Gerät "ohne": erst wer sie
 * aktiv umstellt, löst die Standortabfrage des Betriebssystems aus. Ein
 * voreingestelltes "mit GPS" fragte danach schon beim blossen Aufmachen.
 *
 * @returns {boolean}
 */
export function loadGpsPreference() {
  let raw;
  try {
    raw = localStorage.getItem(RECORDING_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;

  try {
    return JSON.parse(raw)?.gps === true;
  } catch {
    return false;
  }
}

/**
 * @param {boolean} gps
 * @returns {boolean} derselbe Wert, zum Weiterreichen
 */
export function saveGpsPreference(gps) {
  const wert = gps === true;

  schreibe(RECORDING_KEY, { gps: wert }, 'Die Aufzeichnungsart');

  return wert;
}

function isValidSession(session) {
  return (
    session !== null &&
    typeof session === 'object' &&
    typeof session.id === 'string' &&
    session.id !== '' &&
    typeof session.date === 'string' &&
    typeof session.type === 'string' &&
    session.type !== ''
  );
}

/**
 * Älteste zuerst. Anders als bei den Läufen: ein Plan liest sich vorwärts, vom
 * nächsten Termin in die Zukunft.
 */
function bySessionDate(a, b) {
  if (a.date === b.date) return 0;
  return a.date < b.date ? -1 : 1;
}

function isValidEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.exerciseId === 'string' &&
    entry.exerciseId !== '' &&
    typeof entry.date === 'string'
  );
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
