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
export function addRun(runs, { distanceKm, date, timeOfDay, durationMinutes, source, track }) {
  const run = { id: createId(), distanceKm, date };

  // Optionale Felder nur setzen, wenn sie ausgefüllt wurden.
  if (timeOfDay) run.timeOfDay = timeOfDay;
  if (durationMinutes) run.durationMinutes = durationMinutes;
  if (source) run.source = source;
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
export function updateRun(runs, id, { distanceKm, date, timeOfDay, durationMinutes }) {
  const existing = runs.find((run) => run.id === id);
  if (!existing) return runs;

  const updated = { id, distanceKm, date };
  if (timeOfDay) updated.timeOfDay = timeOfDay;
  if (durationMinutes) updated.durationMinutes = durationMinutes;
  if (existing.source) updated.source = existing.source;
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

/** @param {ExerciseEntry[]} entries */
export function saveExerciseLog(entries) {
  try {
    localStorage.setItem(EXERCISE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Übungen konnten nicht gespeichert werden:', err);
  }
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

/** @param {Session[]} sessions */
export function saveSessions(sessions) {
  try {
    localStorage.setItem(TRAINING_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Trainingsplan konnte nicht gespeichert werden:', err);
  }
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
export function addSession(sessions, { date, type, segments, note, createdAt }) {
  const session = {
    id: createId(),
    date,
    type,
    segments: segments ?? [],
    createdAt: createdAt ?? new Date().toISOString(),
  };
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
export function updateSession(sessions, id, { date, type, segments, note }) {
  const existing = sessions.find((session) => session.id === id);
  if (!existing) return sessions;

  const updated = { id, date, type, segments: segments ?? [] };
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

/** @param {PlannedExercise[]} entries bereits geprüfte Einträge */
export function saveExercisePlan(entries) {
  try {
    localStorage.setItem(EXERCISE_PLAN_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Übungsplan konnte nicht gespeichert werden:', err);
  }
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
 * @typedef {{ name: string, weeklyGoal: number }} Profile
 * @returns {Profile} Leerwerte, wenn nichts hinterlegt ist
 */
export function loadProfile() {
  const leer = { name: '', weeklyGoal: 0 };

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
    };
  } catch {
    return leer;
  }
}

/**
 * @param {Profile} profile bereits geprüfte Werte
 * @returns {Profile} dieselben Werte, zum Weiterreichen
 */
export function saveProfile({ name, weeklyGoal }) {
  const profil = { name, weeklyGoal };

  try {
    // Ohne Name und ohne Ziel gibt es nichts zu merken – dann weg damit,
    // statt eine leere Hülle liegen zu lassen.
    if (name === '' && weeklyGoal === 0) localStorage.removeItem(PROFILE_KEY);
    else localStorage.setItem(PROFILE_KEY, JSON.stringify(profil));
  } catch (err) {
    console.error('Profil konnte nicht gespeichert werden:', err);
  }

  return profil;
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
