/**
 * Anzeige und Interaktion.
 *
 * Diese Datei kennt das DOM, rechnet aber nichts selbst aus:
 *   xp.js           XP und Level
 *   achievements.js Achievements und deren Bonus-XP
 *   titles.js       Titel zum Level
 *   geo.js          Streckenberechnung und Formatierung
 *   tracker.js      Live-Aufzeichnung über die Geolocation-API
 *   stopwatch.js    Aufzeichnung ohne GPS, dieselbe Form wie tracker.js
 *   wake-lock.js    Bildschirm wach halten, für beide Aufzeichnungsarten
 *   validation.js   Prüfung der Eingaben
 *   transfer.js     Export-/Importformat
 *   stats.js        Summen, Durchschnitte, Serien, Zeitreihen
 *   route.js        GPS-Strecke auf Zeichenflächen-Koordinaten
 *   pwa.js          Installationshinweis und Aktualisierung
 *   lock.js         Tastensperre während der Aufzeichnung
 *   history.js      Freischaltdaten der Achievements
 *   training.js     Geplante Einheiten, Abgleich mit den Läufen
 *   exercise-plan.js Für einen Tag vorgenommene Übungen
 *   goal.js         Wochenziel: erreichte Wochen und Bonus-XP
 *   share-card.js   Teilen-Karte auf einem Canvas
 *   storage.js      Persistenz
 *   format.js       Zahlen, Daten und Zeiten in Anzeigeform
 *
 * Die Ansichten liegen seit B1 unter js/views/:
 *   views/dom.js    Verweise auf das Markup, gemeinsam genutzt
 */

import { getProgress, totalXpFromRuns, xpForDistance } from './xp.js';
import {
  evaluateAchievements,
  achievementXp,
  achievementsByCategory,
  ACHIEVEMENT_CATEGORIES,
} from './achievements.js';
import { titleForLevel, nextTitle, badgeForLevel, badgeSrc } from './titles.js';
import { paceMinPerKm, runPaceMinPerKm, formatDuration, formatPace } from './geo.js';
import { createTracker } from './tracker.js';
import { createStopwatch } from './stopwatch.js';
import {
  validateRun,
  firstErrorMessage,
  parseNumber,
  normalizeName,
  normalizeWeeklyGoal,
  isValidIsoDate,
  MAX_WEEKLY_GOAL,
} from './validation.js';
import {
  serializeExport,
  exportFileName,
  parseImport,
  exportReminder,
  EXPORT_REMINDER_DAYS,
} from './transfer.js';
import {
  buildStats,
  distanceByWeek,
  distanceByMonth,
  runsInPeriod,
  bestTimes,
  activityCalendar,
  paceTrend,
  ACTIVITY_WEEKS,
  PACE_TREND_MIN_POINTS,
} from './stats.js';
import { goalXp, reachedGoalWeeks, XP_PER_GOAL_WEEK } from './goal.js';
import { drawShareCard } from './share-card.js';
import { phaseAt, summarize, WORK, REST, PHASE_LABEL } from './interval.js';
import { unlock, isSoundOn, setSoundOn, beepWork, beepRest, beepFinish } from './beep.js';
import { projectTrack, hasDrawableRoute, toStorageTrack, DEFAULT_VIEWPORT } from './route.js';
import {
  isStandalone,
  wasInstallHintDismissed,
  rememberInstallHintDismissed,
  shouldShowInstallHint,
  ownCacheNames,
  ownRegistrations,
} from './pwa.js';
import {
  holdProgress,
  isHoldComplete,
  canLock,
  controlsEnabled,
  shouldReleaseLock,
} from './lock.js';
import { achievementUnlockDates } from './history.js';
import {
  EXERCISES,
  CATEGORIES,
  ALL_CATEGORIES,
  findCategory,
  filterExercises,
  countByCategory,
} from './exercises.js';
import {
  matchPlan,
  planXp,
  describeSession,
  intervalTotalSeconds,
  clock,
  typeLabel,
  validateInterval,
  DEFAULT_INTERVAL,
} from './training.js';
import {
  loadRuns, addRun, updateRun, removeRun, replaceRuns,
  loadExerciseLog, addExerciseEntry, replaceExerciseLog,
  loadSessions, replaceSessions,
  loadExercisePlan, saveExercisePlan,
  loadProfile, saveProfile,
  loadGpsPreference, saveGpsPreference,
  loadLastExport, saveLastExport,
  setStorageErrorHandler,
} from './storage.js';
import {
  normalizePlan,
  plannedOn,
  isPlanned,
  hasRoomOn,
  planExercise,
  unplanExercise,
  upcomingPlan,
  MAX_PLANNED_PER_DAY,
} from './exercise-plan.js';
import {
  exerciseXp,
  countsByExercise,
  awardsXp,
  doneOnDay,
  setExerciseCount,
  XP_PER_EXERCISE,
  MAX_EXERCISE_COUNT,
} from './exercise-log.js';
import { el, SVG_NS, createSvg } from './views/dom.js';
import {
  connectTrainingView,
  setupSessionForm,
  resetSessionForm,
  renderTraining,
  STATUS_TEXT,
} from './views/training.js';
import {
  numberFormat,
  distanceFormat,
  shortMonthFormat,
  weekdayFormat,
  todayIso,
  toIsoDate,
  toTimeOfDay,
  formatDate,
  formatDays,
  formatMonth,
  formatAveragePace,
  round,
  r1,
} from './format.js';

/** @type {import('./storage.js').Run[]} */
let runs = [];

/**
 * Tag der letzten Sicherung, als lokaler ISO-Tag; null = noch nie.
 *
 * Steht hier oben beim übrigen Zustand und nicht bei der Anzeige: init() läuft
 * am Modulanfang, und eine let-Deklaration weiter unten wäre zu dem Zeitpunkt
 * noch nicht initialisiert.
 */
let lastExport = null;

/** @type {import('./exercise-log.js').ExerciseEntry[]} */
let exerciseLog = [];

/** @type {import('./training.js').Session[]} */
let sessions = [];

/** @type {import('./exercise-plan.js').PlannedExercise[]} */
let exercisePlan = [];

/** id der Übung, für die gerade ein Termin gewählt wird; null = keine. */
let planningExerciseId = null;

/**
 * Selbst eingetragene Angaben: Name (leer = nur den Titel zeigen) und
 * Wochenziel (0 = kein Ziel, dann bleibt der Ring weg).
 * @type {import('./storage.js').Profile}
 */
let profile = { name: '', weeklyGoal: 0, goalSince: '' };

/** IDs der zuletzt gerenderten Achievements – für die Freischalt-Meldung. */
let unlockedIds = new Set();

/** id des Laufs, der gerade im Formular bearbeitet wird; null = neuer Lauf. */
let editingId = null;

/** id des Laufs, für den die Löschrückfrage offen ist. */
let pendingDeleteId = null;

/** Geprüftes Importergebnis, das auf die Bestätigung wartet. */
let pendingImport = null;

/**
 * Zeitraum der Profil-Statistik: 'week' oder 'month'. Steuert beides – welche
 * Läufe in die Kennzahlen zählen und wie fein das Balkendiagramm aufteilt.
 */
let statsPeriod = 'week';

/** id des Laufs, dessen Detailansicht offen ist; null = zu. */
let detailId = null;

/** Sichtbarer Bereich: 'start', 'trophies' oder 'profile'. */
let activeView = 'start';

/** Eine neuere Fassung liegt bereit und wartet auf ein Neuladen. */
let updateReady = false;

/**
 * Eigener Wert für den Filter "Geplant". Keine Kategorie in exercises.js:
 * die Bibliothek weiß nichts von Terminen, und der Filter zeigt auch keine
 * Übungen, sondern Tage.
 */
const PLANNED_VIEW = 'geplant';

/** Gewählte Übungskategorie; ALL_CATEGORIES zeigt alles, PLANNED_VIEW den Plan. */
let exerciseCategory = ALL_CATEGORIES;

/**
 * Sichtbare Trophäen-Gruppe. Immer genau eine – zweiundfünfzig Kacheln am
 * Stück wären eine Scrollstrecke, kein Überblick.
 */
let trophyCategory = ACHIEVEMENT_CATEGORIES[0].id;

/** id der Übung, deren Zähler gerade von Hand korrigiert wird. */
let editingExerciseId = null;

/** Tastensperre während der Aufzeichnung. */
let locked = false;

/** Zeitpunkt, seit dem der Entsperr-Knopf gehalten wird; null = nicht gehalten. */
let unlockStartedAt = null;

/** Laufender Takt der Entsperr-Anzeige. */
let unlockFrame = null;

/** Umfang des Stoppuhr-Rings, 2·π·110 – der Radius steht im Markup. */
const INTERVAL_RING = 2 * Math.PI * 110;

/**
 * Umfang des Zielrings, 2·π·52 – der Radius steht im Markup. Muss mit der
 * stroke-dasharray im Stylesheet übereinstimmen, sonst füllt der Bogen falsch.
 */
const RING_UMFANG = 2 * Math.PI * 52;

const tracker = createTracker({
  onUpdate: renderTracking,
  onError: showTrackError,
});

/** Aufzeichnung ohne Standort – dieselbe Bedienung, nur die Uhr. */
const stopwatch = createStopwatch({ onUpdate: renderTracking });

/**
 * Mit oder ohne GPS bei der normalen Aufzeichnung.
 *
 * Beim allerersten Mal steht es auf "ohne": das Öffnen der Ansicht soll keine
 * Standortabfrage des Betriebssystems auslösen, die kommt erst mit dem Tippen
 * auf "Mit GPS". Danach gilt die zuletzt getroffene Wahl.
 */
let trackGps = false;

/** Das Gerät, das gerade aufzeichnet – oder das bei einem Start drankäme. */
function recorder() {
  return trackGps ? tracker : stopwatch;
}

/** Läuft gerade irgendeine Aufzeichnung? */
function isRecording() {
  return tracker.getState().status !== 'idle' || stopwatch.getState().status !== 'idle';
}

/**
 * Was die herausgelösten Ansichten unter `js/views/` von hier brauchen.
 *
 * Zugriffsfunktionen statt der Werte selbst: `runs` und `sessions` werden bei
 * jeder Änderung neu zugewiesen, ein einmal übergebener Wert wäre ab der
 * ersten Änderung veraltet. Und Zugriff statt Import, weil ein Import den
 * Stand zum Ladezeitpunkt festhielte.
 *
 * Nur Lesen und Schreiben des Zustands plus das zentrale Neuzeichnen – wächst
 * dieses Objekt weiter, ist das ein Zeichen, dass eine Ansicht sich zu viel
 * aus `app.js` holt.
 */
const verdrahtung = {
  getRuns: () => runs,
  getSessions: () => sessions,
  setSessions: (neue) => {
    sessions = neue;
  },
  render: (optionen) => render(optionen),
};

init();

function init() {
  // Vor allem anderen: die Ansichten kennen den Zustand sonst nicht, und
  // schon das erste render() unten liefe ins Leere.
  connectTrainingView(verdrahtung);

  // Als Allererstes, noch vor dem Laden: ab hier bleibt kein Schreibfehler
  // mehr unbemerkt.
  setStorageErrorHandler(showStorageError);

  runs = loadRuns();
  lastExport = loadLastExport();
  exerciseLog = loadExerciseLog();
  sessions = loadSessions();
  exercisePlan = normalizePlan(loadExercisePlan());
  profile = readProfile(loadProfile());
  el.date.value = todayIso();
  fillProfileForm();
  document.getElementById('goal-xp-hint').textContent = XP_PER_GOAL_WEEK;
  el.profileNameForm.addEventListener('submit', handleProfileSubmit);
  setupShare();

  el.form.addEventListener('submit', handleSubmit);
  el.formCancel.addEventListener('click', stopEditing);
  el.runsList.addEventListener('click', handleListClick);

  setupSessionForm();

  bindTabs();
  el.refreshButton.addEventListener('click', handleRefresh);
  el.installHintClose.addEventListener('click', dismissInstallHint);
  el.storageHintClose.addEventListener('click', () => {
    el.storageHint.hidden = true;
  });
  el.updateReload.addEventListener('click', () => location.reload());
  el.detailClose.addEventListener('click', closeDetail);
  el.periodWeek.addEventListener('click', () => setStatsPeriod('week'));
  el.periodMonth.addEventListener('click', () => setStatsPeriod('month'));

  el.exportButton.addEventListener('click', handleExport);
  el.importButton.addEventListener('click', () => el.importInput.click());
  el.importInput.addEventListener('change', handleImportFile);
  el.importApply.addEventListener('click', handleImportApply);
  el.importCancel.addEventListener('click', cancelImport);

  el.trackStart.addEventListener('click', handleTrackStart);
  el.trackPause.addEventListener('click', handleTrackPause);
  el.trackStop.addEventListener('click', handleTrackStop);
  el.trackDiscard.addEventListener('click', handleTrackDiscard);
  bindUnlockHold();
  el.trackLock.addEventListener('click', () => setLocked(true));

  setupIntervalScreen();
  setupQuickInterval();
  setupHeatmap();

  el.trackGpsOn.addEventListener('click', () => setTrackGps(true));
  el.trackGpsOff.addEventListener('click', () => setTrackGps(false));
  setTrackGps(loadGpsPreference(), { merken: false });

  maybeShowInstallHint();
  render({ announceUnlocks: false });
  registerServiceWorker();
}

/* ------------------------------------------------------------- Bereiche */

function bindTabs() {
  for (const tab of el.tabs) {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  }

  // Pfeiltasten wandern durch die Leiste, wie bei Tabs üblich.
  el.tabbar.addEventListener('keydown', (event) => {
    const richtung = { ArrowRight: 1, ArrowLeft: -1, Home: 'erste', End: 'letzte' }[event.key];
    if (richtung === undefined) return;

    event.preventDefault();
    const aktuell = el.tabs.findIndex((tab) => tab.dataset.view === activeView);
    const ziel =
      richtung === 'erste' ? 0
      : richtung === 'letzte' ? el.tabs.length - 1
      : (aktuell + richtung + el.tabs.length) % el.tabs.length;

    setView(el.tabs[ziel].dataset.view);
    el.tabs[ziel].focus();
  });
}

function setView(view) {
  if (!el.views[view]) return;

  activeView = view;

  for (const [name, panel] of Object.entries(el.views)) {
    panel.hidden = name !== view;
  }

  for (const tab of el.tabs) {
    const aktiv = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(aktiv));
    // Nur der aktive Tab liegt im Tabulator-Pfad.
    tab.tabIndex = aktiv ? 0 : -1;
  }

  // Erst beim Ansehen aufbauen – das Durchspielen der Historie kostet mehr
  // als eine simple Anzeige.
  if (view === 'trophies') renderTrophies();
  if (view === 'profile') renderProfile();
  if (view === 'exercises') renderExercises();
  if (view === 'training') renderTraining();

  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ------------------------------------------------------------ Begrüßung */

/**
 * "Willkommen" oder "Willkommen, Tim".
 *
 * Der Name kommt als eigenes Element und wird per textContent gesetzt – so
 * kann in der Begrüßung nichts landen, was der Browser als Markup liest.
 */
function renderGreeting() {
  if (profile.name === '') {
    el.greeting.textContent = 'Willkommen';
    return;
  }

  const name = document.createElement('span');
  name.className = 'greeting-name';
  name.textContent = profile.name;

  el.greeting.replaceChildren('Willkommen, ', name);
}

/* --------------------------------------------------------- Heute geplant */

/**
 * Was für heute ansteht: Trainingseinheiten und vorgemerkte Übungen. Reine
 * Anzeige – geplant und abgehakt wird in den jeweiligen Tabs; ein zweiter Weg
 * zum Abhaken wäre ein zweiter Weg, sich zu verzählen.
 *
 * Der Bereich bleibt auch an leeren Tagen stehen und zeigt einen Hinweis. Ihn
 * auszublenden würde den Tab je nach Tag anders hoch machen.
 */
function renderToday() {
  const heute = todayIso();

  const einheiten = matchPlan(sessions, runs, { today: heute }).filter(
    (eintrag) => eintrag.session.date === heute
  );
  const uebungen = plannedOn(exercisePlan, heute);

  el.todayEmpty.hidden = einheiten.length + uebungen.length > 0;

  // Die Überschriften erscheinen nur, wenn darunter auch etwas steht – sonst
  // stünde "Training" über einer leeren Liste.
  el.todaySessionsTitle.hidden = einheiten.length === 0;
  el.todayExercisesTitle.hidden = uebungen.length === 0;

  el.todaySessions.replaceChildren(...einheiten.map(createTodaySession));
  el.todayExercises.replaceChildren(
    ...uebungen.map((eintrag) => {
      const uebung = EXERCISES.find((e) => e.id === eintrag.exerciseId);
      return createTodayItem({
        name: uebung.name,
        detail: uebung.dose,
        erledigt: doneOnDay(exerciseLog, eintrag.exerciseId, heute),
        stand: doneOnDay(exerciseLog, eintrag.exerciseId, heute) ? 'erledigt' : 'offen',
      });
    })
  );
}

function createTodaySession({ session, status }) {
  const zeile = createTodayItem({
    name: typeLabel(session.type),
    detail: session.note ? `${describeSession(session)} · ${session.note}` : describeSession(session),
    // "teilweise" ist angefangen, nicht erledigt – nur das Erfüllte wird grün.
    erledigt: status === 'erfuellt',
    stand: STATUS_TEXT[status] ?? status,
  });

  // Eine geplante Intervall-Einheit lässt sich von hier aus starten – das ist
  // die Stelle, an der man am Trainingstag ohnehin nachsieht.
  if (session.interval) {
    const starten = document.createElement('button');
    starten.type = 'button';
    starten.className = 'small today-start';
    starten.textContent = 'Starten';
    starten.setAttribute('aria-label', `Intervall-Training vom ${formatDate(session.date)} starten`);
    starten.addEventListener('click', () =>
      startIntervalRun(session.interval, { sessionId: session.id, gps: intervalGpsPreferred })
    );

    zeile.append(starten);
  }

  return zeile;
}

function createTodayItem({ name, detail, erledigt, stand }) {
  const zeile = document.createElement('li');
  zeile.className = erledigt ? 'today-item done' : 'today-item';

  const marke = document.createElement('span');
  marke.className = 'today-mark';
  marke.textContent = erledigt ? '✓' : '○';
  marke.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'today-text';

  const titel = document.createElement('span');
  titel.className = 'today-name';
  titel.textContent = name;

  const zusatz = document.createElement('span');
  zusatz.className = 'today-dose muted';
  zusatz.textContent = detail;

  text.append(titel, zusatz);

  const zustand = document.createElement('span');
  zustand.className = 'today-state';
  zustand.textContent = stand;

  zeile.append(marke, text, zustand);
  zeile.setAttribute('aria-label', `${name}: ${stand}`);

  return zeile;
}

/* --------------------------------------------------------------- Übungen */

function renderExercises() {
  renderExerciseFilter();

  if (exerciseCategory === PLANNED_VIEW) return renderPlannedAgenda();

  const kategorie = findCategory(exerciseCategory);
  el.exerciseNote.hidden = !kategorie;
  if (kategorie) {
    el.exerciseNote.textContent = kategorie.ordered
      ? `${kategorie.description} Der Reihe nach durchgehen.`
      : kategorie.description;
  }

  const uebungen = filterExercises(exerciseCategory);
  const nummeriert = Boolean(kategorie?.ordered);
  const zaehler = countsByExercise(exerciseLog);
  const heute = todayIso();

  el.exerciseList.classList.toggle('ordered', nummeriert);
  el.exerciseList.replaceChildren(
    ...uebungen.map((uebung, index) =>
      createExerciseCard(uebung, nummeriert ? index + 1 : null, {
        anzahl: zaehler.get(uebung.id) ?? 0,
        heuteErledigt: doneOnDay(exerciseLog, uebung.id, heute),
        heuteGeplant: isPlanned(exercisePlan, uebung.id, heute),
      })
    )
  );
}

/**
 * Der Plan nach Tagen – was in den nächsten Tagen ansteht, auf einen Blick.
 *
 * Andere Bauform als die Übungsliste daneben: hier ist der Tag die Einheit,
 * nicht die Übung. Eine Übung an drei Tagen wäre in Kartenform ein Eintrag
 * mit drei Daten daran; als Tagesliste liest sie sich wie ein Kalender.
 */
function renderPlannedAgenda() {
  const heute = todayIso();
  const tage = upcomingPlan(exercisePlan, heute);

  el.exerciseNote.hidden = false;
  el.exerciseNote.textContent =
    tage.length === 0
      ? 'Noch nichts vorgemerkt. Über den Kalenderknopf einer Übung lässt sich ein Tag wählen.'
      : 'Was in den nächsten Tagen ansteht. Vergangene Tage stehen nicht mehr hier.';

  el.exerciseList.classList.remove('ordered');
  el.exerciseList.replaceChildren(...tage.map((tag) => createPlannedDay(tag, heute)));
}

function createPlannedDay({ date, entries }, heute) {
  const block = document.createElement('li');
  block.className = date === heute ? 'planned-day today' : 'planned-day';

  const kopf = document.createElement('div');
  kopf.className = 'planned-day-head';

  const datum = document.createElement('span');
  datum.className = 'planned-date';
  datum.textContent = date === heute ? `Heute, ${formatDate(date)}` : formatDate(date);

  const anzahl = document.createElement('span');
  anzahl.className = 'planned-count muted';
  anzahl.textContent = `${entries.length} ${entries.length === 1 ? 'Übung' : 'Übungen'}`;

  kopf.append(datum, anzahl);

  const liste = document.createElement('ul');
  liste.className = 'planned-entries';
  liste.replaceChildren(...entries.map((eintrag) => createPlannedEntry(eintrag, date, heute)));

  block.append(kopf, liste);
  return block;
}

function createPlannedEntry(eintrag, date, heute) {
  const uebung = EXERCISES.find((e) => e.id === eintrag.exerciseId);

  // Nur für heute lässt sich sagen, ob es schon gemacht ist – für morgen
  // wäre die Frage sinnlos.
  const erledigt = date === heute && doneOnDay(exerciseLog, eintrag.exerciseId, heute);

  const zeile = document.createElement('li');
  zeile.className = erledigt ? 'planned-entry done' : 'planned-entry';

  const name = document.createElement('span');
  name.className = 'planned-name';
  name.textContent = uebung.name;

  const dosis = document.createElement('span');
  dosis.className = 'planned-dose muted';
  dosis.textContent = erledigt ? `${uebung.dose} · erledigt` : uebung.dose;

  const entfernen = document.createElement('button');
  entfernen.type = 'button';
  entfernen.className = 'icon-button';
  entfernen.textContent = '×';
  entfernen.setAttribute('aria-label', `${uebung.name} am ${formatDate(date)} austragen`);
  entfernen.addEventListener('click', () => handleUnplan(uebung, date));

  zeile.append(name, dosis, entfernen);
  return zeile;
}

/**
 * Übung abhaken. Der Zähler läuft immer weiter, XP gibt es nur einmal je
 * Übung und Kalendertag – sonst liesse sich das Level durch Dauerklicken
 * hochtreiben.
 */
function handleExerciseDone(exercise) {
  const heute = todayIso();
  const bringtXp = awardsXp(exerciseLog, exercise.id, heute);

  exerciseLog = addExerciseEntry(exerciseLog, { exerciseId: exercise.id, date: heute });

  showExerciseFeedback(
    bringtXp
      ? `${exercise.name} erledigt · +${XP_PER_EXERCISE} XP`
      : `${exercise.name} erledigt · heute schon gezählt, XP gibt es morgen wieder`,
    bringtXp
  );

  render({ announceUnlocks: true });
}

function showExerciseFeedback(text, positiv) {
  el.exerciseFeedback.textContent = text;
  el.exerciseFeedback.className = positiv ? 'exercise-feedback earned' : 'exercise-feedback';
  el.exerciseFeedback.hidden = false;
}

function renderExerciseFilter() {
  const zaehler = countByCategory();
  const gesamt = [...zaehler.values()].reduce((a, b) => a + b, 0);

  // Der Plan zählt Termine, nicht Übungen – dieselbe Übung an drei Tagen
  // sind drei Einträge.
  const vorgemerkt = upcomingPlan(exercisePlan, todayIso()).reduce(
    (summe, tag) => summe + tag.entries.length,
    0
  );

  const knoepfe = [{ id: ALL_CATEGORIES, label: 'Alle', anzahl: gesamt }]
    .concat(
      CATEGORIES.map((kategorie) => ({
        id: kategorie.id,
        label: kategorie.label,
        anzahl: zaehler.get(kategorie.id) ?? 0,
      }))
    )
    .concat([{ id: PLANNED_VIEW, label: 'Geplant', anzahl: vorgemerkt }]);

  el.exerciseFilter.replaceChildren(
    ...knoepfe.map(({ id, label, anzahl }) => {
      const aktiv = id === exerciseCategory;

      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = aktiv ? 'chip active' : 'chip';
      knopf.dataset.category = id;
      knopf.setAttribute('aria-pressed', String(aktiv));
      knopf.textContent = `${label} ${anzahl}`;
      knopf.addEventListener('click', () => {
        exerciseCategory = id;
        renderExercises();
      });

      return knopf;
    })
  );
}

function createExerciseCard(exercise, position, { anzahl, heuteErledigt, heuteGeplant }) {
  const karte = document.createElement('li');
  karte.className = heuteErledigt ? 'exercise done-today' : 'exercise';

  const kopf = document.createElement('div');
  kopf.className = 'exercise-head';

  const name = document.createElement('span');
  name.className = 'exercise-name';
  // In der Aufwärmreihe zählt die Reihenfolge, deshalb die Nummer davor.
  name.textContent = position === null ? exercise.name : `${position}. ${exercise.name}`;

  const dosis = document.createElement('span');
  dosis.className = 'exercise-dose';
  dosis.textContent = exercise.dose;

  kopf.append(name, dosis);

  const anleitung = document.createElement('p');
  anleitung.className = 'exercise-instruction';
  anleitung.textContent = exercise.instruction;

  karte.append(kopf, anleitung);

  const fuss = document.createElement('div');
  fuss.className = 'exercise-foot';

  const links = document.createElement('div');
  links.className = 'exercise-meta';

  // Ohne Filter ist nicht ersichtlich, wohin eine Übung gehört.
  if (exerciseCategory === ALL_CATEGORIES) {
    const marke = document.createElement('span');
    marke.className = 'exercise-tag';
    marke.textContent = findCategory(exercise.category)?.label ?? exercise.category;
    links.append(marke);
  }

  const zaehler = document.createElement('span');
  zaehler.className = 'exercise-count';
  zaehler.textContent = anzahl === 0 ? 'noch nie gemacht' : `${anzahl}× gemacht`;
  links.append(zaehler);

  if (heuteErledigt) {
    const heute = document.createElement('span');
    heute.className = 'exercise-today';
    heute.textContent = 'heute erledigt';
    links.append(heute);
  }

  // Nur den heutigen Termin als Marke: der ist der einzige, der auf dem
  // Start-Tab auftaucht. Spätere sieht man, wenn der Tag da ist.
  if (heuteGeplant) {
    const vorgemerkt = document.createElement('span');
    vorgemerkt.className = 'exercise-planned';
    vorgemerkt.textContent = 'für heute geplant';
    links.append(vorgemerkt);
  }

  const einplanen = document.createElement('button');
  einplanen.type = 'button';
  einplanen.className = 'icon-button';
  einplanen.textContent = '📅';
  einplanen.setAttribute('aria-label', `${exercise.name} einplanen`);
  einplanen.addEventListener('click', () => {
    planningExerciseId = planningExerciseId === exercise.id ? null : exercise.id;
    editingExerciseId = null;
    renderExercises();
  });

  const korrigieren = document.createElement('button');
  korrigieren.type = 'button';
  korrigieren.className = 'icon-button';
  korrigieren.textContent = '✎';
  korrigieren.setAttribute('aria-label', `Zähler von ${exercise.name} korrigieren`);
  korrigieren.addEventListener('click', () => {
    editingExerciseId = exercise.id;
    planningExerciseId = null;
    renderExercises();
  });

  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = heuteErledigt ? 'secondary small' : 'small';
  knopf.textContent = 'Erledigt';
  knopf.setAttribute('aria-label', `${exercise.name} als erledigt eintragen`);
  knopf.addEventListener('click', () => handleExerciseDone(exercise));

  const aktionen = document.createElement('div');
  aktionen.className = 'exercise-actions';
  aktionen.append(einplanen, korrigieren, knopf);

  fuss.append(links, aktionen);
  karte.append(fuss);

  if (exercise.id === editingExerciseId) karte.append(createCountEditor(exercise, anzahl));
  if (exercise.id === planningExerciseId) karte.append(createPlanEditor(exercise));

  return karte;
}

/**
 * Termin wählen, direkt auf der Karte – wie die Zählerkorrektur daneben.
 * Voreingestellt ist heute: das ist der häufige Fall, und der Start-Tab zeigt
 * ohnehin nur den heutigen Tag.
 */
function createPlanEditor(exercise) {
  const box = document.createElement('form');
  box.className = 'plan-editor';

  const feldHuelle = document.createElement('div');
  feldHuelle.className = 'field';

  const label = document.createElement('label');
  label.setAttribute('for', 'plan-date-input');
  label.textContent = 'An welchem Tag?';

  const feld = document.createElement('input');
  feld.type = 'date';
  feld.id = 'plan-date-input';
  feld.value = todayIso();

  feldHuelle.append(label, feld);

  const hinweis = document.createElement('p');
  hinweis.className = 'count-hint muted';
  hinweis.textContent =
    `Höchstens ${MAX_PLANNED_PER_DAY} Übungen je Tag. Geplantes bringt keine ` +
    'XP – die gibt es fürs Erledigen, unverändert einmal je Übung und Tag.';

  const knoepfe = document.createElement('div');
  knoepfe.className = 'count-buttons';

  const speichern = document.createElement('button');
  speichern.type = 'submit';
  speichern.className = 'small';
  speichern.textContent = 'Einplanen';

  const abbrechen = document.createElement('button');
  abbrechen.type = 'button';
  abbrechen.className = 'secondary small';
  abbrechen.textContent = 'Abbrechen';
  abbrechen.addEventListener('click', () => {
    planningExerciseId = null;
    renderExercises();
  });

  knoepfe.append(speichern, abbrechen);

  // Austragen nur anbieten, wenn es etwas auszutragen gibt.
  if (isPlanned(exercisePlan, exercise.id, todayIso())) {
    const austragen = document.createElement('button');
    austragen.type = 'button';
    austragen.className = 'ghost small';
    austragen.textContent = 'Für heute austragen';
    austragen.addEventListener('click', () => handleUnplan(exercise, todayIso()));
    knoepfe.append(austragen);
  }

  box.append(feldHuelle, hinweis, knoepfe);
  box.addEventListener('submit', (event) => {
    event.preventDefault();
    handlePlan(exercise, feld.value);
  });

  return box;
}

function handlePlan(exercise, datum) {
  if (!isValidIsoDate(datum)) {
    return showExerciseFeedback('Bitte ein gültiges Datum wählen.', false);
  }

  if (isPlanned(exercisePlan, exercise.id, datum)) {
    planningExerciseId = null;
    showExerciseFeedback(`${exercise.name} steht am ${formatDate(datum)} schon im Plan.`, false);
    return renderExercises();
  }

  if (!hasRoomOn(exercisePlan, datum)) {
    return showExerciseFeedback(
      `Am ${formatDate(datum)} stehen schon ${MAX_PLANNED_PER_DAY} Übungen – das reicht.`,
      false
    );
  }

  exercisePlan = saveExercisePlan(planExercise(exercisePlan, { exerciseId: exercise.id, date: datum }));
  planningExerciseId = null;

  showExerciseFeedback(`${exercise.name} für den ${formatDate(datum)} eingeplant.`, true);
  render({ announceUnlocks: false });
}

function handleUnplan(exercise, datum) {
  exercisePlan = saveExercisePlan(unplanExercise(exercisePlan, { exerciseId: exercise.id, date: datum }));
  planningExerciseId = null;

  showExerciseFeedback(`${exercise.name} am ${formatDate(datum)} ausgetragen.`, false);
  render({ announceUnlocks: false });
}

/**
 * Handkorrektur des Zählers, direkt auf der Karte statt in einem Systemdialog –
 * wie die Löschrückfrage bei den Läufen.
 */
function createCountEditor(exercise, anzahl) {
  const box = document.createElement('form');
  box.className = 'count-editor';

  const label = document.createElement('label');
  label.className = 'count-label';
  label.setAttribute('for', 'count-input');
  label.textContent = 'Wie oft insgesamt gemacht?';

  const feld = document.createElement('input');
  // type="text" wie überall sonst – type="number" liefert bei einer Eingabe,
  // die der Browser nicht mag, einen leeren Wert, und leer heisst hier "bitte
  // eine Zahl eintragen" statt "auf 0 setzen".
  feld.type = 'text';
  feld.id = 'count-input';
  // Ein Zähler ist eine ganze Zahl. Deshalb "numeric" statt "decimal": das
  // Komma auf der Tastatur brächte hier nichts zu tippen.
  feld.inputMode = 'numeric';
  feld.autocomplete = 'off';
  feld.value = String(anzahl);

  const hinweis = document.createElement('p');
  hinweis.className = 'count-hint muted';
  hinweis.textContent =
    'Weniger entfernt die neuesten Einträge. Mehr wird auf heute datiert – ' +
    'XP gibt es weiterhin nur einmal je Tag.';

  const knoepfe = document.createElement('div');
  knoepfe.className = 'count-buttons';

  const speichern = document.createElement('button');
  speichern.type = 'submit';
  speichern.className = 'small';
  speichern.textContent = 'Übernehmen';

  const abbrechen = document.createElement('button');
  abbrechen.type = 'button';
  abbrechen.className = 'secondary small';
  abbrechen.textContent = 'Abbrechen';
  abbrechen.addEventListener('click', () => {
    editingExerciseId = null;
    renderExercises();
  });

  knoepfe.append(speichern, abbrechen);
  box.append(label, feld, hinweis, knoepfe);

  box.addEventListener('submit', (event) => {
    event.preventDefault();
    handleCountCorrection(exercise, feld.value, anzahl);
  });

  return box;
}

function handleCountCorrection(exercise, rohwert, vorher) {
  // Leeres Feld ist keine Null – sonst löscht ein versehentlich geleertes
  // Eingabefeld den ganzen Zähler.
  if (typeof rohwert !== 'string' || rohwert.trim() === '') {
    showExerciseFeedback('Bitte eine Zahl eintragen.', false);
    return;
  }

  const zahl = parseNumber(rohwert);
  const ziel = zahl === null ? null : Math.trunc(zahl);

  if (ziel === null || ziel < 0 || ziel > MAX_EXERCISE_COUNT) {
    showExerciseFeedback(`Bitte eine Zahl zwischen 0 und ${MAX_EXERCISE_COUNT} eintragen.`, false);
    return;
  }

  exerciseLog = replaceExerciseLog(
    setExerciseCount(exerciseLog, exercise.id, ziel, { date: todayIso() })
  );

  editingExerciseId = null;
  showExerciseFeedback(
    ziel === vorher
      ? `${exercise.name}: unverändert bei ${vorher}.`
      : `${exercise.name}: Zähler von ${vorher} auf ${ziel} gesetzt.`,
    false
  );

  render({ announceUnlocks: false });
}

/* -------------------------------------------------------------- Trophäen */

function renderTrophies() {
  const achievements = evaluateAchievements(runs, exerciseLog);
  const daten = achievementUnlockDates(runs, exerciseLog);
  const freigeschaltet = achievements.filter((a) => a.unlocked);

  el.trophyCount.textContent = freigeschaltet.length;
  el.trophyTotal.textContent = achievements.length;
  el.trophyXp.textContent = numberFormat.format(achievementXp(achievements));

  renderTrophyFilter(achievements);

  for (const [category, liste] of Object.entries(el.trophyLists)) {
    liste.hidden = category !== trophyCategory;

    // Auch die verborgenen Listen werden gefüllt: das Umschalten soll nichts
    // nachladen müssen, und zweiundfünfzig Kacheln sind schnell gebaut.
    liste.replaceChildren(
      ...achievements
        .filter((a) => a.category === category)
        .map((a) => createTrophyTile(a, daten.get(a.id)))
    );
  }
}

/** Kompakte Chips wie im Übungen-Tab, mit dem Stand je Gruppe. */
function renderTrophyFilter(achievements) {
  el.trophyFilter.replaceChildren(
    ...achievementsByCategory(achievements).map(({ id, label, unlocked, total }) => {
      const aktiv = id === trophyCategory;

      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = aktiv ? 'chip active' : 'chip';
      knopf.dataset.trophyCategory = id;
      knopf.setAttribute('aria-pressed', String(aktiv));
      knopf.textContent = `${label} ${unlocked}/${total}`;
      knopf.addEventListener('click', () => {
        trophyCategory = id;
        renderTrophies();
      });

      return knopf;
    })
  );
}

function createTrophyTile(achievement, unlockDate) {
  const kachel = document.createElement('li');
  kachel.className = achievement.unlocked ? 'trophy unlocked' : 'trophy';

  const marke = document.createElement('span');
  marke.className = 'trophy-mark';
  marke.textContent = achievement.unlocked ? '✓' : '○';
  marke.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'trophy-name';
  name.textContent = achievement.name;

  const beschreibung = document.createElement('span');
  beschreibung.className = 'trophy-description';
  beschreibung.textContent = achievement.description;

  const xp = document.createElement('span');
  xp.className = 'trophy-xp';
  xp.textContent = `${achievement.unlocked ? '+' : ''}${achievement.xp} XP`;

  kachel.append(marke, name, beschreibung, xp);

  if (achievement.unlocked) {
    const datum = document.createElement('span');
    datum.className = 'trophy-date';
    datum.textContent = unlockDate ? `Freigeschaltet am ${formatDate(unlockDate)}` : 'Freigeschaltet';
    kachel.append(datum);
    kachel.setAttribute('aria-label', `${achievement.name}: freigeschaltet`);
    return kachel;
  }

  // Nur Bedingungen mit klarem Zähler bekommen einen Balken.
  if (achievement.progress) kachel.append(createTrophyProgress(achievement.progress));
  kachel.setAttribute('aria-label', `${achievement.name}: offen`);

  return kachel;
}

function createTrophyProgress(progress) {
  const erreicht = Math.min(progress.current, progress.target);
  const anteil = progress.target > 0 ? (erreicht / progress.target) * 100 : 0;

  const huelle = document.createElement('div');
  huelle.className = 'trophy-progress';

  const spur = document.createElement('span');
  spur.className = 'trophy-track';

  const balken = document.createElement('span');
  balken.className = 'trophy-bar';
  balken.style.width = `${anteil}%`;
  spur.append(balken);

  const zahl = document.createElement('span');
  zahl.className = 'trophy-progress-text';
  zahl.textContent =
    `${numberFormat.format(erreicht)} / ${numberFormat.format(progress.target)} ${progress.unit}`;

  huelle.append(spur, zahl);
  return huelle;
}

/* ---------------------------------------------------------------- Profil */

function renderProfile() {
  const achievements = evaluateAchievements(runs, exerciseLog);
  const gesamtXp =
    totalXpFromRuns(runs) +
    exerciseXp(exerciseLog) +
    achievementXp(achievements) +
    planXp(sessions, runs, { today: todayIso() }) +
    currentGoalXp();
  const progress = getProgress(gesamtXp);
  const upcoming = nextTitle(progress.level);

  el.profileName.hidden = profile.name === '';
  el.profileName.textContent = profile.name;
  el.profileTitleName.textContent = titleForLevel(progress.level);
  el.profileBadge.src = badgeSrc(badgeForLevel(progress.level));
  el.profileLevel.textContent = progress.level;
  el.profileXp.textContent = numberFormat.format(progress.totalXp);
  el.profileNext.textContent = `Nächster Titel: ${upcoming.title} ab Level ${upcoming.level}`;

  const prozent = Math.min(100, Math.max(0, progress.progressPercent));
  el.profileProgressFill.style.width = `${prozent}%`;
  el.profileProgress.setAttribute('aria-valuenow', Math.round(prozent));
  el.profileProgressCaption.textContent =
    `${numberFormat.format(progress.xpIntoLevel)} / ${numberFormat.format(progress.xpForLevel)} XP – ` +
    `noch ${numberFormat.format(progress.xpToNextLevel)} XP bis Level ${progress.level + 1}`;

  renderTrophySummary(achievements);
  renderGoal();
  renderPeriodStats();
  renderProfileStats();
  renderActivity();
  renderPaceTrend();
  renderBestTimes();
}

/** Rohwerte aus Speicher oder Datei auf gültige Angaben bringen. */
function readProfile(roh) {
  const weeklyGoal = normalizeWeeklyGoal(roh?.weeklyGoal);

  // Ein Ziel ohne Stichtag käme aus einer Fassung vor dem Bonus. Es zählt ab
  // heute – rückwirkend Wochen zu vergeben, die niemand als Ziel hatte, wäre
  // geschenktes Level.
  const goalSince = isValidIsoDate(roh?.goalSince) ? roh.goalSince : todayIso();

  return { name: normalizeName(roh?.name), weeklyGoal, goalSince: weeklyGoal === 0 ? '' : goalSince };
}

/** Zeigt im Formular, was tatsächlich gespeichert ist. */
function fillProfileForm() {
  el.profileNameInput.value = profile.name;
  el.profileGoalInput.value = profile.weeklyGoal === 0 ? '' : String(profile.weeklyGoal);
}

/**
 * Name und Ziel übernehmen. Es gibt nichts, was hier fehlschlagen könnte –
 * beides wird aufgeräumt, nicht abgelehnt. Leere Felder sind gültige Angaben:
 * dann steht wieder nur der Titel im Kopf und es gibt kein Wochenziel.
 */
function handleProfileSubmit(event) {
  event.preventDefault();

  const weeklyGoal = normalizeWeeklyGoal(el.profileGoalInput.value);

  // Der Stichtag bleibt stehen, solange das Ziel dasselbe ist – sonst setzte
  // jedes Speichern des Namens die gesammelten Wochen zurück. Bei einem
  // geänderten Ziel beginnt die Zählung neu (siehe goal.js).
  const goalSince =
    weeklyGoal === 0 ? ''
    : weeklyGoal === profile.weeklyGoal && profile.goalSince !== '' ? profile.goalSince
    : todayIso();

  profile = saveProfile({
    name: normalizeName(el.profileNameInput.value),
    weeklyGoal,
    goalSince,
  });

  // Zurückschreiben, damit sichtbar wird, was tatsächlich gespeichert wurde.
  fillProfileForm();

  el.profileNameStatus.textContent = describeProfileSaved();
  el.profileNameStatus.hidden = false;

  // Nicht nur renderProfile(): der Name steht auch in der Begrüßung auf dem
  // Start-Bereich, und die soll nicht bis zum nächsten Laden alt aussehen.
  render({ announceUnlocks: false });
}

function describeProfileSaved() {
  const teile = [
    profile.name === '' ? 'kein Name' : profile.name,
    profile.weeklyGoal === 0
      ? 'kein Wochenziel'
      : `${profile.weeklyGoal}× pro Woche`,
  ];

  return `Gespeichert: ${teile.join(' · ')}`;
}

/**
 * Fortschrittsring für die laufende Woche.
 *
 * Gezählt werden die Läufe der Woche, nicht die Tage: wer zweimal an einem
 * Tag läuft, ist zweimal gelaufen. Die Woche beginnt montags, wie überall
 * sonst in der App auch (siehe runsInPeriod).
 *
 * Über dem Ziel bleibt der Ring voll, die Zahl läuft weiter – "4/3" ist eine
 * bessere Nachricht als ein abgeschnittener Zähler.
 */
function renderGoal() {
  el.goal.hidden = profile.weeklyGoal === 0;
  if (profile.weeklyGoal === 0) return;

  const gelaufen = runsInPeriod(runs, { period: 'week', todayIso: todayIso() }).length;
  const ziel = profile.weeklyGoal;
  const erreicht = gelaufen >= ziel;
  const anteil = Math.min(1, gelaufen / ziel);

  el.goal.classList.toggle('reached', erreicht);
  el.goalCount.textContent = `${gelaufen}/${ziel}`;
  el.goalBar.style.strokeDashoffset = RING_UMFANG * (1 - anteil);

  const fehlend = ziel - gelaufen;
  el.goalCaption.textContent = erreicht
    ? gelaufen === ziel
      ? `Wochenziel erreicht · +${XP_PER_GOAL_WEEK} XP`
      : `Wochenziel erreicht · +${XP_PER_GOAL_WEEK} XP · ` +
        `${gelaufen - ziel} ${gelaufen - ziel === 1 ? 'Lauf' : 'Läufe'} darüber`
    : `Diese Woche – noch ${fehlend} ${fehlend === 1 ? 'Lauf' : 'Läufe'} für ${XP_PER_GOAL_WEEK} XP.`;

  // Die Bilanz seit dem Stichtag. Sie erklärt, woher die XP kommen, und macht
  // sichtbar, dass ein geändertes Ziel neu zu zählen beginnt.
  const wochen = reachedGoalWeeks(runs, { ...profile, todayIso: todayIso() });
  el.goalTally.textContent =
    wochen === 0
      ? `Seit ${formatDate(profile.goalSince)} noch keine Woche geschafft.`
      : `${wochen} ${wochen === 1 ? 'Woche' : 'Wochen'} seit ${formatDate(profile.goalSince)} ` +
        `geschafft · ${numberFormat.format(wochen * XP_PER_GOAL_WEEK)} XP`;

  el.goal.setAttribute(
    'aria-label',
    `Wochenziel: ${gelaufen} von ${ziel} Läufen`
  );
}

/* ----------------------------------------------- Intervall-Stoppuhr */

/**
 * Das laufende Intervall-Training.
 *
 * `elapsedMs` sammelt die Zeit abgeschlossener Abschnitte, `startedAt` ist
 * der Beginn des laufenden. Pausieren heisst: das eine ins andere schieben.
 * Ohne diese Trennung müsste bei jeder Pause die Startzeit verbogen werden,
 * und ein zweites Pausieren rechnete auf einem verbogenen Wert weiter.
 *
 * @type {?{
 *   interval: import('./training.js').Interval,
 *   sessionId: ?string,
 *   gps: boolean,
 *   startedAt: ?number,
 *   elapsedMs: number,
 *   lastPhase: ?string,
 *   beganAt: Date,
 * }}
 */
let intervalRun = null;

/** Laufender Takt der Stoppuhr. */
let intervalTick = null;

/** Zuletzt gewählt: mit oder ohne GPS. Gilt als Vorschlag beim nächsten Mal. */
let intervalGpsPreferred = true;

/** Spontanstart: dieselben drei Werte wie im Plan, plus die GPS-Wahl. */
function setupQuickInterval() {
  fillQuickForm();

  for (const feld of [el.quickWork, el.quickRest, el.quickRepeats]) {
    feld.addEventListener('input', renderQuickTotal);
  }

  el.quickGpsOn.addEventListener('click', () => setQuickGps(true));
  el.quickGpsOff.addEventListener('click', () => setQuickGps(false));
  el.quickStart.addEventListener('click', handleQuickStart);

  renderQuickTotal();
}

function fillQuickForm(interval = DEFAULT_INTERVAL) {
  el.quickWork.value = clock(interval.workSeconds);
  el.quickRest.value = clock(interval.restSeconds);
  el.quickRepeats.value = String(interval.repeats);
}

function setQuickGps(an) {
  intervalGpsPreferred = an;

  el.quickGpsOn.className = an ? 'chip active' : 'chip';
  el.quickGpsOff.className = an ? 'chip' : 'chip active';
  el.quickGpsOn.setAttribute('aria-pressed', String(an));
  el.quickGpsOff.setAttribute('aria-pressed', String(!an));
}

function renderQuickTotal() {
  const geprueft = validateInterval({
    workSeconds: el.quickWork.value,
    restSeconds: el.quickRest.value,
    repeats: el.quickRepeats.value,
  });

  el.quickTotal.textContent = geprueft.ok
    ? `Macht ${clock(intervalTotalSeconds(geprueft.interval))} insgesamt.`
    : 'Belastung, Pause und Wiederholungen ausfüllen.';

  return geprueft;
}

function handleQuickStart() {
  const geprueft = renderQuickTotal();

  if (!geprueft.ok) {
    el.quickError.textContent = firstErrorMessage(geprueft);
    el.quickError.hidden = false;
    return;
  }

  el.quickError.hidden = true;
  // Ohne sessionId: spontan geplant heisst keine Bonus-XP, nur der Lauf.
  startIntervalRun(geprueft.interval, { gps: intervalGpsPreferred });
}

/**
 * Skalenstriche innerhalb des Rings – sechzig Stück, jeder fünfte länger.
 *
 * In JS erzeugt statt sechzigmal im Markup: das Muster ist eine Rechnung, und
 * als Rechnung bleibt es lesbar.
 */
function buildIntervalTicks() {
  const striche = [];

  for (let i = 0; i < 60; i++) {
    const winkel = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const lang = i % 5 === 0;
    const aussen = 96;
    const innen = aussen - (lang ? 9 : 5);

    const strich = document.createElementNS(SVG_NS, 'line');
    strich.setAttribute('x1', r1(120 + Math.cos(winkel) * innen));
    strich.setAttribute('y1', r1(120 + Math.sin(winkel) * innen));
    strich.setAttribute('x2', r1(120 + Math.cos(winkel) * aussen));
    strich.setAttribute('y2', r1(120 + Math.sin(winkel) * aussen));
    if (lang) strich.setAttribute('class', 'long');

    striche.push(strich);
  }

  document.getElementById('interval-ticks').replaceChildren(...striche);
}

function setupIntervalScreen() {
  buildIntervalTicks();
  el.intervalPauseButton.addEventListener('click', toggleIntervalPause);
  el.intervalStopButton.addEventListener('click', askStopInterval);
  el.intervalStopCancel.addEventListener('click', cancelStopInterval);
  el.intervalStopConfirm.addEventListener('click', () => finishIntervalRun({ abgebrochen: true }));

  el.intervalSettingsButton.addEventListener('click', () => {
    const offen = el.intervalPanel.hidden;
    el.intervalPanel.hidden = !offen;
    el.intervalSettingsButton.setAttribute('aria-expanded', String(offen));
  });

  el.intervalSound.addEventListener('change', () => {
    setSoundOn(el.intervalSound.checked);
    if (el.intervalSound.checked) unlock();
  });
}

/**
 * Startet ein Intervall-Training.
 *
 * Beide Wege – geplante Einheit und Spontanstart – münden hier. `sessionId`
 * unterscheidet sie nur für die Rückmeldung am Ende; die Bonus-XP holt sich
 * der Plan ohnehin selbst aus dem gespeicherten Lauf.
 */
function startIntervalRun(interval, { sessionId = null, gps = intervalGpsPreferred } = {}) {
  if (intervalRun !== null) return;

  intervalGpsPreferred = gps;

  // Aus dem Klick heraus, sonst bleibt der Ton auf iOS für immer stumm.
  unlock();

  intervalRun = {
    interval,
    sessionId,
    gps,
    startedAt: performance.now(),
    elapsedMs: 0,
    lastPhase: null,
    beganAt: new Date(),
    // Strecke und Zeit allein aus den Belastungsphasen. Die Gesamt-Pace eines
    // Intervall-Trainings enthält die Gehpausen und sagt über das Tempo in
    // der Belastung nichts aus.
    workDistanceKm: 0,
    workMs: 0,
    lastDistanceKm: 0,
    lastSampleAt: performance.now(),
    lastKind: WORK,
  };

  if (gps && tracker.isSupported() && window.isSecureContext) tracker.start();

  el.intervalSound.checked = isSoundOn();
  el.intervalPanel.hidden = true;
  el.intervalSettingsButton.setAttribute('aria-expanded', 'false');
  el.intervalConfirm.hidden = true;
  el.intervalScreen.hidden = false;
  el.intervalRepeats.textContent = interval.repeats;

  // Der Rest der Seite ist während des Trainings nicht zu bedienen.
  setAppInert(true);
  setBodyScrollLocked(true);
  el.intervalScreen.scrollTop = 0;

  intervalTick = setInterval(renderIntervalScreen, 200);
  renderIntervalScreen();
}

/** Verstrichene Zeit ohne die Zeit in der Pause. */
function intervalElapsedMs() {
  if (intervalRun === null) return 0;
  if (intervalRun.startedAt === null) return intervalRun.elapsedMs;

  return intervalRun.elapsedMs + (performance.now() - intervalRun.startedAt);
}

function toggleIntervalPause() {
  if (intervalRun === null) return;

  if (intervalRun.startedAt === null) {
    intervalRun.startedAt = performance.now();
    intervalRun.lastSampleAt = performance.now();
    unlock();
    if (intervalRun.gps) tracker.resume();
  } else {
    intervalRun.elapsedMs = intervalElapsedMs();
    intervalRun.startedAt = null;
    // Sonst zählte Herumstehen als aufgezeichnete Strecke.
    if (intervalRun.gps) tracker.pause();
  }

  renderIntervalScreen();
}

function askStopInterval() {
  el.intervalConfirm.hidden = false;
}

function cancelStopInterval() {
  el.intervalConfirm.hidden = true;
}

/**
 * Zeichnet die Stoppuhr und schaltet die Phasen weiter.
 *
 * Der Phasenwechsel hängt am Rendern statt an eigenen Zeitgebern: ein Takt,
 * der ohnehin läuft, holt auch dann auf, wenn das Betriebssystem die App
 * zwischendurch angehalten hat. Ein Wecker je Phase wäre in dem Moment
 * verfallen.
 */
function renderIntervalScreen() {
  if (intervalRun === null) return;

  const stand = phaseAt(intervalRun.interval, intervalElapsedMs());
  const pausiert = intervalRun.startedAt === null;

  sampleWorkPhase(stand, pausiert);

  if (stand.done) return finishIntervalRun({ abgebrochen: false });

  // Ton nur beim tatsächlichen Wechsel, nicht bei jedem Takt.
  const marke = `${stand.kind}-${stand.repeat}`;
  if (intervalRun.lastPhase !== null && intervalRun.lastPhase !== marke) {
    if (stand.kind === WORK) beepWork();
    else beepRest();
  }
  intervalRun.lastPhase = marke;

  el.intervalScreen.classList.toggle('rest', stand.kind === REST);
  el.intervalIcon.firstElementChild.firstElementChild.setAttribute(
    'href',
    stand.kind === WORK ? '#icon-run' : '#icon-walk'
  );

  el.intervalRepeat.textContent = stand.repeat;
  el.intervalTime.textContent = clock(stand.remainingSeconds);
  el.intervalPhase.textContent = PHASE_LABEL[stand.kind];

  // Der Ring leert sich: voll zu Beginn der Phase, leer an ihrem Ende.
  el.intervalBar.style.strokeDashoffset = INTERVAL_RING * stand.phaseProgress;

  if (stand.nextKind === null) {
    el.intervalNextPhase.textContent = 'Fertig';
    el.intervalNextTime.textContent = '';
  } else {
    el.intervalNextPhase.textContent = PHASE_LABEL[stand.nextKind];
    el.intervalNextTime.textContent = clock(stand.nextSeconds);
  }

  el.intervalPauseButton.setAttribute('aria-label', pausiert ? 'Fortsetzen' : 'Pausieren');
  el.intervalPauseButton.firstElementChild.firstElementChild.setAttribute(
    'href',
    pausiert ? '#icon-play' : '#icon-pause'
  );

  el.intervalStatus.textContent = pausiert
    ? 'Pausiert'
    : intervalRun.gps
      ? gpsIntervalStatus()
      : 'Ohne GPS – nur Zeit';
}

/**
 * Schreibt Strecke und Zeit der Belastungsphasen fort.
 *
 * Zugeordnet wird rückwirkend: was seit dem letzten Takt dazugekommen ist,
 * gehört zu der Phase, die damals lief. Beim Wechsel landet der letzte
 * Bruchteil dadurch noch auf der richtigen Seite.
 */
function sampleWorkPhase(stand, pausiert) {
  const jetzt = performance.now();
  const distanz = intervalRun.gps ? tracker.getState().distanceKm : 0;

  if (!pausiert && intervalRun.lastKind === WORK) {
    intervalRun.workMs += jetzt - intervalRun.lastSampleAt;
    intervalRun.workDistanceKm += Math.max(0, distanz - intervalRun.lastDistanceKm);
  }

  intervalRun.lastSampleAt = jetzt;
  intervalRun.lastDistanceKm = distanz;
  intervalRun.lastKind = stand.kind;
}

function gpsIntervalStatus() {
  const zustand = tracker.getState();
  if (zustand.status === 'idle') return 'GPS nicht verfügbar – nur Zeit';

  return zustand.lastAccuracyM === null
    ? 'Warte auf das erste GPS-Signal …'
    : `${distanceFormat.format(zustand.distanceKm)} km aufgezeichnet`;
}

/**
 * Beendet das Training und legt es als Lauf ab.
 *
 * Auch ein Abbruch wird gespeichert: gelaufen ist gelaufen. Ohne GPS gibt es
 * keine Distanz – dann ist es kein Lauf im Sinne der Lauf-Liste, sondern nur
 * eine Zeit, und wird nicht abgelegt.
 */
function finishIntervalRun({ abgebrochen }) {
  if (intervalRun === null) return;

  const { interval, gps, beganAt, workDistanceKm, workMs } = intervalRun;
  const bilanz = summarize(interval, intervalElapsedMs());

  // Nur wenn wirklich gemessen wurde: eine Pace aus null Kilometern wäre
  // keine Zahl, sondern eine Division.
  const workPaceMinPerKm =
    gps && workDistanceKm > 0 && workMs > 0 ? workMs / 60_000 / workDistanceKm : null;

  clearInterval(intervalTick);
  intervalTick = null;

  const aufzeichnung = gps ? tracker.stop() : null;

  intervalRun = null;
  el.intervalScreen.hidden = true;
  el.intervalConfirm.hidden = true;
  setAppInert(false);
  setBodyScrollLocked(false);

  if (!abgebrochen) beepFinish();

  const gespeichert = saveIntervalRun({
    interval,
    bilanz,
    aufzeichnung,
    beganAt,
    gps,
    workPaceMinPerKm,
  });

  // Ohne Strecke fehlt dem Lauf die Distanz, und ohne Distanz ist er keiner.
  // Statt das Training wegzuwerfen, steht es vorbereitet im Formular: Datum,
  // Uhrzeit und Dauer sind schon da, es fehlt nur die Distanz.
  if (!gespeichert && bilanz.completedRepeats > 0) {
    prefillFromInterval(bilanz, beganAt);
  }

  el.trackStatus.textContent = describeIntervalResult(bilanz, gespeichert, abgebrochen);
  render({ announceUnlocks: true });
}

function prefillFromInterval(bilanz, beganAt) {
  prefillManualRun(beganAt, bilanz.elapsedSeconds / 60);
}

/**
 * Legt einen gestoppten Lauf im Handformular bereit.
 *
 * Datum, Uhrzeit und Dauer sind gemessen, nur die Distanz fehlt – deshalb
 * steht der Cursor gleich in ihrem Feld. Gemeinsamer Weg für die Aufzeichnung
 * ohne GPS und für ein Intervall-Training ohne Strecke.
 */
function prefillManualRun(beganAt, durationMinutes) {
  stopEditing();

  el.date.value = toIsoDate(beganAt);
  el.time.value = toTimeOfDay(beganAt);
  el.duration.value = String(round(durationMinutes));
  el.distance.focus();
}

function saveIntervalRun({ interval, bilanz, aufzeichnung, beganAt, gps, workPaceMinPerKm }) {
  // Unter einer vollen Runde ist es kein Training, sondern ein Fehlstart.
  if (bilanz.completedRepeats === 0) return false;

  const distanceKm = aufzeichnung?.distanceKm ?? 0;
  const durationMinutes = bilanz.elapsedSeconds / 60;

  if (!(distanceKm > 0)) return false;

  runs = addRun(runs, {
    distanceKm,
    date: toIsoDate(beganAt),
    timeOfDay: toTimeOfDay(beganAt),
    durationMinutes: round(durationMinutes),
    source: 'gps',
    track: aufzeichnung ? toStorageTrack(aufzeichnung.track) : undefined,
    interval: {
      workSeconds: interval.workSeconds,
      restSeconds: interval.restSeconds,
      repeats: interval.repeats,
      completedRepeats: bilanz.completedRepeats,
      gps,
      ...(workPaceMinPerKm === null ? {} : { workPaceMinPerKm }),
    },
  });

  return true;
}

function describeIntervalResult(bilanz, gespeichert, abgebrochen) {
  const runden = `${bilanz.completedRepeats} ${bilanz.completedRepeats === 1 ? 'Runde' : 'Runden'}`;
  const zeit = clock(bilanz.elapsedSeconds);
  const kopf = abgebrochen ? 'Abgebrochen' : 'Training fertig';

  if (gespeichert) return `${kopf}: ${runden} in ${zeit} – als Lauf gespeichert.`;
  if (bilanz.completedRepeats === 0) return `${kopf} vor der ersten Runde – nichts gespeichert.`;

  return (
    `${kopf}: ${runden} in ${zeit}. Ohne GPS fehlt die Distanz – ` +
    'sie steht unten im Formular schon vorbereitet, trag sie nach.'
  );
}

/** Sperrt alles ausser der Stoppuhr – wie die Tastensperre beim Aufzeichnen. */
function setAppInert(inert) {
  for (const bereich of document.querySelectorAll('.app > *')) {
    // Die Stoppuhr liegt selbst in `.app` und darf nicht mitgesperrt werden.
    // Sonst steht sie zwar da, nimmt aber keine Berührung an: die Knöpfe sind
    // tot und Tippen wie Scrollen gehen durch sie hindurch in den Start-Hub.
    if (bereich === el.intervalScreen) continue;
    bereich.inert = inert;
  }
}

/**
 * Sperrt das Scrollen der Seite hinter der Stoppuhr.
 *
 * `overflow: hidden` allein reicht auf iOS nicht: das Gummiband-Scrollen zieht
 * auch feste Elemente mit und legt darüber den Start-Hub frei. Deshalb wird
 * der Body festgestellt und um die bisherige Scrollhöhe nach oben versetzt –
 * so bleibt das Bild stehen und die Position ist nach dem Training wieder da.
 */
let scrollLockY = 0;

function setBodyScrollLocked(gesperrt) {
  if (gesperrt) {
    if (document.body.classList.contains('scroll-locked')) return;
    scrollLockY = window.scrollY;
    document.body.style.top = `-${scrollLockY}px`;
    document.body.classList.add('scroll-locked');
    return;
  }

  if (!document.body.classList.contains('scroll-locked')) return;
  document.body.classList.remove('scroll-locked');
  document.body.style.top = '';
  window.scrollTo(0, scrollLockY);
}

/* ----------------------------------------------------------------- Teilen */

/** Gewählte Art der Karte: 'run', 'total', 'week' oder 'month'. */
let shareKind = null;

function setupShare() {
  el.shareOpen.addEventListener('click', toggleSharePanel);
  el.shareCancel.addEventListener('click', closeSharePanel);
  el.shareCreate.addEventListener('click', handleShare);

  for (const knopf of el.sharePanel.querySelectorAll('[data-share]')) {
    knopf.addEventListener('click', () => selectShareKind(knopf.dataset.share));
  }
}

function toggleSharePanel() {
  if (!el.sharePanel.hidden) return closeSharePanel();

  shareKind = null;
  el.sharePanel.hidden = false;
  el.shareOpen.setAttribute('aria-expanded', 'true');

  renderShareChoices();
  fillShareRuns();
}

function closeSharePanel() {
  shareKind = null;
  el.sharePanel.hidden = true;
  el.shareOpen.setAttribute('aria-expanded', 'false');
  clearShareMessages();
  renderShareChoices();
}

function selectShareKind(kind) {
  shareKind = kind;
  clearShareMessages();
  renderShareChoices();
}

function renderShareChoices() {
  for (const knopf of el.sharePanel.querySelectorAll('[data-share]')) {
    const aktiv = knopf.dataset.share === shareKind;
    knopf.className = aktiv ? 'chip active' : 'chip';
    knopf.setAttribute('aria-pressed', String(aktiv));
  }

  // Die Auswahl des Laufs erscheint nur, wenn sie gebraucht wird.
  el.shareRunPicker.hidden = shareKind !== 'run' || runs.length === 0;
  el.shareCreate.hidden = shareKind === null || (shareKind === 'run' && runs.length === 0);

  if (shareKind === 'run' && runs.length === 0) {
    showShareError('Es gibt noch keinen Lauf zum Teilen.');
  }
}

function fillShareRuns() {
  el.shareRun.replaceChildren(
    ...runs.map((run) => {
      const option = document.createElement('option');
      option.value = run.id;
      option.textContent = `${numberFormat.format(run.distanceKm)} km · ${formatDate(run.date)}`;
      return option;
    })
  );
}

/**
 * Karte bauen und weitergeben.
 *
 * Die Web Share API braucht eine Nutzeraktion. Zwischen Klick und Aufruf
 * liegt deshalb nur das Zeichnen und toBlob – wird dazwischen noch etwas
 * anderes abgewartet, verwirft Safari die Erlaubnis und der Dialog bleibt zu.
 */
async function handleShare() {
  if (shareKind === null) return;

  clearShareMessages();

  const daten = buildShareData(shareKind);
  if (daten === null) return showShareError('Für diesen Zeitraum gibt es noch keine Läufe.');

  const canvas = document.createElement('canvas');
  drawShareCard(canvas, daten);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob === null) return showShareError('Die Karte konnte nicht erzeugt werden.');

  const datei = new File([blob], shareFileName(), { type: 'image/png' });

  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: 'FunRun' });
      return showShareStatus('Geteilt.');
    } catch (err) {
      // Abbrechen ist kein Fehler – nur alles andere ist einer.
      if (err?.name === 'AbortError') return;
      console.warn('Teilen fehlgeschlagen, lade stattdessen herunter:', err);
    }
  }

  downloadCard(blob, datei.name);
  showShareStatus('Als Bild gespeichert.');
}

/** Ohne Web Share API bleibt der Weg über den Download. */
function downloadCard(blob, name) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();

  URL.revokeObjectURL(url);
}

function shareFileName() {
  const teil = { run: 'lauf', total: 'gesamt', week: 'woche', month: 'monat' }[shareKind];
  return `funrun-${teil}-${todayIso()}.png`;
}

/**
 * Was auf die Karte kommt.
 *
 * Der Profil-Kopf ist immer derselbe; nur der Block darunter hängt von der
 * Auswahl ab.
 *
 * @returns {?import('./share-card.js').CardData} null, wenn es nichts zu zeigen gibt
 */
function buildShareData(kind) {
  const achievements = evaluateAchievements(runs, exerciseLog);
  const progress = getProgress(
    totalXpFromRuns(runs) +
      exerciseXp(exerciseLog) +
      achievementXp(achievements) +
      planXp(sessions, runs, { today: todayIso() }) +
      currentGoalXp()
  );

  const unten = kind === 'run' ? shareRunBlock() : sharePeriodBlock(kind);
  if (unten === null) return null;

  return {
    name: profile.name,
    title: titleForLevel(progress.level),
    percent: progress.progressPercent,
    badge: el.profileBadge.complete ? el.profileBadge : null,
    ...unten,
  };
}

function shareRunBlock() {
  const run = runs.find((entry) => entry.id === el.shareRun.value) ?? runs[0];
  if (!run) return null;

  const stats = [
    { label: 'Distanz', value: `${numberFormat.format(run.distanceKm)} km` },
  ];

  if (run.durationMinutes) {
    stats.push({ label: 'Dauer', value: `${numberFormat.format(run.durationMinutes)} min` });
  }

  const pace = runPaceMinPerKm(run);
  if (pace !== null) stats.push({ label: 'Pace', value: `${formatPace(pace)} min/km` });

  stats.push({ label: 'Verdient', value: `${numberFormat.format(xpForDistance(run.distanceKm))} XP` });

  return {
    heading: 'Einzelner Lauf',
    subheading: formatDate(run.date),
    stats,
  };
}

function sharePeriodBlock(kind) {
  const heute = todayIso();

  const gewaehlt =
    kind === 'total' ? runs : runsInPeriod(runs, { period: kind, todayIso: heute });

  const stats = buildStats(gewaehlt, { todayIso: heute });
  if (stats.runCount === 0) return null;

  const ueberschrift = { total: 'Gesamt', week: 'Diese Woche', month: 'Dieser Monat' }[kind];

  return {
    heading: ueberschrift,
    subheading: kind === 'total' ? null : `Stand ${formatDate(heute)}`,
    stats: [
      { label: 'Distanz', value: `${numberFormat.format(round(stats.totalDistanceKm))} km` },
      { label: 'Läufe', value: String(stats.runCount) },
      { label: 'Ø Pace', value: formatAveragePace(stats.averagePaceMinPerKm) },
      { label: 'Längster Lauf', value: `${numberFormat.format(stats.longestRun.distanceKm)} km` },
    ],
  };
}

function showShareStatus(message) {
  el.shareStatus.textContent = message;
  el.shareStatus.hidden = false;
}

function showShareError(message) {
  el.shareError.textContent = message;
  el.shareError.hidden = false;
}

function clearShareMessages() {
  el.shareStatus.hidden = true;
  el.shareStatus.textContent = '';
  el.shareError.hidden = true;
  el.shareError.textContent = '';
}

/** Kompakte Übersicht: wie viele Achievements je Gruppe. */
function renderTrophySummary(achievements) {
  el.profileTrophySummary.replaceChildren(
    ...achievementsByCategory(achievements).map(({ label, unlocked, total }) => {
      const zeile = document.createElement('li');
      zeile.className = unlocked === total ? 'category-row complete' : 'category-row';

      const name = document.createElement('span');
      name.className = 'category-name';
      name.textContent = label;

      const zahl = document.createElement('span');
      zahl.className = 'category-count';
      zahl.textContent = `${unlocked}/${total}`;

      const spur = document.createElement('span');
      spur.className = 'category-track';

      const balken = document.createElement('span');
      balken.className = 'category-bar';
      balken.style.width = total > 0 ? `${(unlocked / total) * 100}%` : '0';
      spur.append(balken);

      zeile.append(name, zahl, spur);
      zeile.setAttribute('aria-label', `${label}: ${unlocked} von ${total} freigeschaltet`);
      return zeile;
    })
  );
}

function renderProfileStats() {
  const stats = buildStats(runs);

  el.profileStatsEmpty.hidden = stats.runCount > 0;
  el.profileStats.hidden = stats.runCount === 0;
  if (stats.runCount === 0) return;

  el.profileStats.replaceChildren(
    ...buildStatBlocks([
      ['Gesamtdistanz', `${numberFormat.format(round(stats.totalDistanceKm))} km`],
      ['Läufe', String(stats.runCount)],
      ['Ø pro Lauf', `${numberFormat.format(round(stats.averageDistanceKm))} km`],
      ['Ø Pace', formatAveragePace(stats.averagePaceMinPerKm)],
      ['Längster Lauf', `${numberFormat.format(stats.longestRun.distanceKm)} km`],
      ['Aktive Tage', String(stats.activeDays)],
      ['Aktuelle Serie', formatDays(stats.currentDayStreak)],
      ['Längste Serie', formatDays(stats.longestDayStreak)],
    ])
  );
}

/**
 * Aktivität der letzten Wochen als Raster.
 *
 * Wochen als Spalten, Wochentage als Zeilen. Die Tage kommen chronologisch
 * herein und werden vom CSS spaltenweise verteilt – hier ist deshalb keine
 * Rechnung nötig, nur eine Schleife.
 */
function renderActivity() {
  const tage = activityCalendar(runs, { todayIso: todayIso() });

  el.heatmap.style.setProperty('--heatmap-weeks', String(ACTIVITY_WEEKS));
  el.heatmapMonths.replaceChildren(...buildHeatmapMonths(tage));
  el.heatmapGrid.replaceChildren(...tage.map(buildHeatmapCell));

  // Ein Hinweis zu einem Tag, den es nach dem Neuzeichnen nicht mehr gibt,
  // wäre eine Aussage über nichts.
  el.heatmapDetail.textContent = '';
}

/**
 * Monatsnamen über den Spalten.
 *
 * Beschriftet wird die Spalte, in der ein neuer Monat beginnt – also die
 * erste Woche, deren Montag in einem anderen Monat liegt als die davor. Die
 * erste Spalte bleibt frei: dort steht meist ein angebrochener Monat, dessen
 * Name mehr behauptet, als die Spalte zeigt.
 */
function buildHeatmapMonths(tage) {
  const labels = [];
  let letzterMonat = null;

  for (let woche = 0; woche * 7 < tage.length; woche++) {
    const montag = tage[woche * 7].date;
    const monat = montag.slice(0, 7);

    if (monat !== letzterMonat) {
      if (letzterMonat !== null) {
        const label = document.createElement('span');
        label.style.gridColumn = String(woche + 1);
        label.textContent = kurzerMonat(montag);
        labels.push(label);
      }
      letzterMonat = monat;
    }
  }

  return labels;
}

/** "2026-08-17" -> "Aug". */
function kurzerMonat(isoDate) {
  const [year, month] = isoDate.split('-').map(Number);
  return shortMonthFormat.format(new Date(year, month - 1, 1));
}

/**
 * Ein Feld je Tag.
 *
 * Als Knopf und nicht als blosse Fläche: das Feld ist antippbar, und ohne
 * Knopf gäbe es weder Tastaturbedienung noch eine Beschriftung, die eine
 * Vorlesehilfe ausgeben könnte.
 */
function buildHeatmapCell(tag) {
  const feld = document.createElement('button');
  feld.type = 'button';
  feld.className = 'heatmap-cell';
  feld.dataset.level = String(tag.level);
  feld.dataset.date = tag.date;
  feld.setAttribute('aria-pressed', 'false');

  if (tag.future) {
    feld.dataset.future = 'true';
    feld.disabled = true;
    feld.setAttribute('aria-hidden', 'true');
    feld.tabIndex = -1;
  }

  feld.setAttribute('aria-label', describeActivityDay(tag));
  return feld;
}

/** "Mo, 17.08.2026 · 8,40 km · 1 Lauf" bzw. "… · kein Lauf". */
function describeActivityDay(tag) {
  const [year, month, day] = tag.date.split('-').map(Number);
  const wochentag = weekdayFormat.format(new Date(year, month - 1, day));
  const kopf = `${wochentag}, ${formatDate(tag.date)}`;

  if (tag.runCount === 0) return `${kopf} · kein Lauf`;

  const laeufe = `${tag.runCount} ${tag.runCount === 1 ? 'Lauf' : 'Läufe'}`;
  return `${kopf} · ${distanceFormat.format(tag.distanceKm)} km · ${laeufe}`;
}

/**
 * Ein angetipptes Feld erklärt sich in der Zeile darunter.
 *
 * Über die Liste statt an jedem Feld: hundertsechsundzwanzig eigene Handler
 * wären hundertsechsundzwanzigmal dasselbe.
 */
function setupHeatmap() {
  el.heatmapGrid.addEventListener('click', (event) => {
    const feld = event.target.closest('.heatmap-cell');
    if (feld === null) return;

    const schonOffen = feld.getAttribute('aria-pressed') === 'true';

    for (const anderes of el.heatmapGrid.querySelectorAll('[aria-pressed="true"]')) {
      anderes.setAttribute('aria-pressed', 'false');
    }

    if (schonOffen) {
      el.heatmapDetail.textContent = '';
      return;
    }

    feld.setAttribute('aria-pressed', 'true');
    el.heatmapDetail.textContent = feld.getAttribute('aria-label');
  });
}

/* ------------------------------------------------------ Pace-Verlauf */

/** Zeichenfläche der Verlaufslinie, in Einheiten des viewBox. */
const PACE_CHART = {
  width: 320,
  height: 150,
  padTop: 10,
  padRight: 6,
  padBottom: 18,
  // Links Platz für die Pace-Beschriftung ("5:30").
  padLeft: 30,
};

/**
 * Ø-Pace im Verlauf als Linie.
 *
 * Unter drei Punkten wird nichts gezeichnet: zwei Werte sind ein Vergleich,
 * keine Entwicklung, und als Linie behaupten sie eine Richtung, die die Daten
 * nicht hergeben.
 */
function renderPaceTrend() {
  const { period, points } = paceTrend(runs);
  const genug = points.length >= PACE_TREND_MIN_POINTS;

  el.paceTrendEmpty.hidden = genug;
  el.paceTrend.hidden = !genug;
  el.paceTrendCaption.hidden = !genug;

  if (!genug) {
    el.paceTrend.replaceChildren();
    return;
  }

  el.paceTrendCaption.textContent =
    period === 'month'
      ? 'Ø-Pace je Monat. Weiter oben heisst schneller.'
      : 'Ø-Pace je Woche. Weiter oben heisst schneller.';

  el.paceTrend.replaceChildren(createPaceChart(points, period));
}

function createPaceChart(points, period) {
  const { width, height, padTop, padRight, padBottom, padLeft } = PACE_CHART;
  const innenBreite = width - padLeft - padRight;
  const innenHoehe = height - padTop - padBottom;

  const paces = points.map((p) => p.paceMinPerKm);
  const skala = paceScale(Math.min(...paces), Math.max(...paces));

  // Die Achse steht auf dem Kopf: die schnellste Pace ist der kleinste Wert
  // und gehört nach oben, sonst läse sich jede Verbesserung als Absturz.
  const y = (pace) => padTop + ((pace - skala.min) / (skala.max - skala.min)) * innenHoehe;
  const x = (index) =>
    points.length === 1
      ? padLeft + innenBreite / 2
      : padLeft + (index / (points.length - 1)) * innenBreite;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent =
    `Ø-Pace je ${period === 'month' ? 'Monat' : 'Woche'} über ${points.length} Zeiträume, ` +
    `von ${formatPace(points[0].paceMinPerKm)} auf ${formatPace(points.at(-1).paceMinPerKm)} min/km`;
  svg.append(title);

  for (const marke of skala.ticks) {
    svg.append(
      createSvg('line', {
        class: 'pace-grid',
        x1: padLeft,
        x2: width - padRight,
        y1: r1(y(marke)),
        y2: r1(y(marke)),
      }),
      createSvg('text', {
        class: 'pace-axis-label',
        x: padLeft - 5,
        y: r1(y(marke) + 3),
        'text-anchor': 'end',
      }, formatPace(marke))
    );
  }

  const stellen = points.map((punkt, index) => `${r1(x(index))},${r1(y(punkt.paceMinPerKm))}`);

  svg.append(
    createSvg('polygon', {
      class: 'pace-area',
      points: [`${r1(x(0))},${height - padBottom}`, ...stellen, `${r1(x(points.length - 1))},${height - padBottom}`].join(' '),
    }),
    createSvg('polyline', { class: 'pace-line', points: stellen.join(' ') })
  );

  points.forEach((punkt, index) => {
    svg.append(
      createSvg('circle', {
        class: 'pace-point',
        cx: r1(x(index)),
        cy: r1(y(punkt.paceMinPerKm)),
        r: 3,
      })
    );
  });

  // Nur der erste und der letzte Zeitraum werden beschriftet – dazwischen
  // stünden die Beschriftungen auf einem Handy übereinander.
  svg.append(
    createSvg('text', {
      class: 'pace-axis-label',
      x: padLeft,
      y: height - 5,
      'text-anchor': 'start',
    }, formatTrendPoint(points[0].start, period)),
    createSvg('text', {
      class: 'pace-axis-label',
      x: width - padRight,
      y: height - 5,
      'text-anchor': 'end',
    }, formatTrendPoint(points.at(-1).start, period))
  );

  return svg;
}

/**
 * Wertebereich der Achse samt Gitterlinien.
 *
 * Etwas Luft nach beiden Seiten, damit die Linie nicht am Rand klebt. Liegen
 * alle Werte gleich, bekommt die Achse trotzdem eine Spanne – sonst wäre sie
 * null breit und jede Rechnung darauf eine Division durch null.
 */
function paceScale(min, max) {
  const luft = Math.max((max - min) * 0.2, 0.25);
  const unten = Math.max(0, min - luft);
  const oben = max + luft;

  return {
    min: unten,
    max: oben,
    ticks: [unten, (unten + oben) / 2, oben],
  };
}

/** Wochenbeginn als "18.08.", Monat als "Aug 2026". */
function formatTrendPoint(isoDate, period) {
  if (period === 'month') return formatMonth(isoDate.slice(0, 7));

  const [year, month, day] = isoDate.split('-').map(Number);
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.`;
}

/**
 * Bestzeiten über die gängigen Distanzen.
 *
 * Alle Marken stehen immer da, auch die noch offenen: eine Liste, die mit
 * jedem Lauf um eine Zeile wächst, verrät nicht, was überhaupt zu holen ist.
 * Die offenen Zeilen treten dafür farblich zurück.
 */
function renderBestTimes() {
  el.bestTimes.replaceChildren(
    ...bestTimes(runs).map((eintrag) => {
      const zeile = document.createElement('li');

      const block = document.createElement('div');
      block.className = eintrag.durationMinutes === null ? 'best-time empty' : 'best-time';

      const marke = document.createElement('span');
      marke.className = 'best-time-distance';
      marke.textContent = `${numberFormat.format(eintrag.targetKm)} km`;

      const tag = document.createElement('span');
      tag.className = 'best-time-date';

      const wert = document.createElement('span');
      wert.className = 'best-time-value';

      if (eintrag.durationMinutes === null) {
        wert.textContent = 'noch keine Zeit';
      } else {
        wert.textContent = formatDuration(eintrag.durationMinutes * 60_000);
        // Die tatsächlich gelaufene Strecke gehört dazu: 5,07 km erklärt,
        // warum diese Zeit für die 5-km-Marke zählt.
        tag.textContent =
          `${formatDate(eintrag.date)} · ${numberFormat.format(eintrag.distanceKm)} km`;
      }

      block.append(marke, tag, wert);
      zeile.append(block);
      return zeile;
    })
  );
}

/** Kacheln fürs .stat-grid – dieselbe Form für Zeitraum und Gesamtstand. */
function buildStatBlocks(werte) {
  return werte.map(([label, wert]) => {
    const block = document.createElement('div');
    block.className = 'stat';

    const dt = document.createElement('dt');
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.textContent = wert;

    block.append(dt, dd);
    return block;
  });
}

/* ------------------------------------------------ Speicher-Warnung */

/**
 * Meldet, dass etwas nicht in den Speicher geschrieben werden konnte.
 *
 * Wird einmal in init() bei storage.js hinterlegt und von dort aus jedem
 * fehlgeschlagenen Schreibversuch aufgerufen. Vorher landete so ein Fehler nur
 * auf der Konsole – die auf einem Handy niemand sieht.
 *
 * Der Text sagt, was zu tun ist, und das hängt vom Grund ab: ein voller
 * Speicher lässt sich durch Exportieren und Aufräumen beheben, ein gesperrter
 * (Privatmodus, blockierte Website-Daten) nicht.
 *
 * @param {import('./storage.js').StorageError} info
 */
function showStorageError({ was, voll }) {
  el.storageHintTitle.textContent = voll ? 'Speicher voll' : 'Nicht gespeichert';

  // Doppelpunkt statt Satzbau: „was“ kommt mal im Singular („Der
  // Trainingsplan“), mal im Plural („Die Läufe“) herein. Ein gebauter Satz
  // müsste das Verb beugen; so passt eine Formulierung auf alle Fälle.
  el.storageHintText.textContent = voll
    ? `${was}: kein Platz mehr im Speicher. Sichere die Daten über „Daten sichern“ und lösche danach alte Läufe.`
    : `${was}: das Speichern ist fehlgeschlagen. Läuft die App in einem privaten Fenster oder sind Website-Daten blockiert?`;

  el.storageHint.hidden = false;
}

/* ----------------------------------------------- Installationshinweis */

function maybeShowInstallHint() {
  const show = shouldShowInstallHint({
    standalone: isStandalone(window),
    dismissed: wasInstallHintDismissed(safeLocalStorage()),
  });

  el.installHint.hidden = !show;
}

function dismissInstallHint() {
  el.installHint.hidden = true;
  rememberInstallHintDismissed(safeLocalStorage());
}

/** Der Zugriff auf localStorage selbst kann werfen, etwa im Privatmodus. */
function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------ Aktualisieren */

/**
 * Leert den Zwischenspeicher und lädt neu. Gespeicherte Läufe liegen im
 * localStorage und bleiben davon unberührt.
 */
async function handleRefresh() {
  el.refreshButton.disabled = true;
  el.refreshButton.textContent = 'Aktualisiere …';

  try {
    await clearOwnCaches();
    await unregisterOwnServiceWorkers();
  } catch (err) {
    console.warn('Aufräumen vor dem Neuladen fehlgeschlagen:', err);
  }

  // Ohne Cache-Buster liefert der Browser sonst womöglich seinen eigenen
  // Zwischenspeicher aus.
  location.reload();
}

async function clearOwnCaches() {
  if (!('caches' in window)) return;

  const eigene = ownCacheNames(await caches.keys());
  await Promise.all(eigene.map((name) => caches.delete(name)));
}

async function unregisterOwnServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const basis = new URL('./', location.href).href;
  const eigene = ownRegistrations(await navigator.serviceWorker.getRegistrations(), basis);
  await Promise.all(eigene.map((registration) => registration.unregister()));
}

/* ---------------------------------------------------------------- Events */

function handleSubmit(event) {
  event.preventDefault();

  // Dieselbe Prüfung wie beim Import – siehe validation.js.
  const result = validateRun({
    distanceKm: el.distance.value,
    date: el.date.value,
    timeOfDay: el.time.value,
    durationMinutes: el.duration.value,
    paceMinPerKm: el.pace.value,
  });

  if (!result.ok) return showError(firstErrorMessage(result));

  clearError();
  const date = result.run.date;

  if (editingId !== null) {
    runs = updateRun(runs, editingId, result.run);
    stopEditing();
  } else {
    runs = addRun(runs, result.run);
    el.form.reset();
    el.date.value = date; // Datum für den nächsten Eintrag beibehalten
    el.distance.focus();
  }

  // Nach dem Zurücksetzen des Formulars: sonst räumte reset() den Hinweis
  // gleich wieder weg, den er erklären soll.
  showWarnings(result.warnings);

  render({ announceUnlocks: true });
}

/** Auffälligkeiten, die den Lauf nicht ungültig machen – siehe validateRun. */
function showWarnings(warnings) {
  const text = (warnings ?? []).join(' ');

  el.formWarning.textContent = text;
  el.formWarning.hidden = text === '';
}

function handleListClick(event) {
  const detailButton = event.target.closest('[data-detail-id]');
  if (detailButton) return toggleDetail(detailButton.dataset.detailId);

  const editButton = event.target.closest('[data-edit-id]');
  if (editButton) return startEditing(editButton.dataset.editId);

  const askButton = event.target.closest('[data-ask-delete-id]');
  if (askButton) {
    pendingDeleteId = askButton.dataset.askDeleteId;
    return renderRuns();
  }

  const cancelButton = event.target.closest('[data-cancel-delete]');
  if (cancelButton) {
    pendingDeleteId = null;
    return renderRuns();
  }

  const confirmButton = event.target.closest('[data-confirm-delete-id]');
  if (!confirmButton) return;

  const id = confirmButton.dataset.confirmDeleteId;
  pendingDeleteId = null;
  if (editingId === id) stopEditing();
  if (detailId === id) detailId = null;

  runs = removeRun(runs, id);
  render({ announceUnlocks: false });
}

/* ------------------------------------------------------------ Detailansicht */

function toggleDetail(id) {
  detailId = detailId === id ? null : id;
  renderDetail();
  renderRuns();

  if (detailId !== null) {
    el.detailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function closeDetail() {
  detailId = null;
  renderDetail();
  renderRuns();
}

function renderDetail() {
  const run = detailId === null ? null : runs.find((entry) => entry.id === detailId);

  // Der Lauf kann zwischenzeitlich gelöscht oder ersetzt worden sein.
  if (!run) {
    detailId = null;
    el.detailCard.hidden = true;
    return;
  }

  el.detailCard.hidden = false;
  el.detailFacts.replaceChildren(...buildDetailFacts(run));
  el.routeContainer.replaceChildren(createRouteView(run));
}

function buildDetailFacts(run) {
  const facts = [
    ['Distanz', `${numberFormat.format(run.distanceKm)} km`],
    ['Datum', formatDate(run.date)],
  ];

  if (run.timeOfDay) facts.push(['Startzeit', `${run.timeOfDay} Uhr`]);
  if (run.durationMinutes) {
    facts.push(['Dauer', `${numberFormat.format(run.durationMinutes)} min`]);
  }

  // Auch ohne Dauer: eine von Hand eingetragene Pace steht für sich.
  const pace = runPaceMinPerKm(run);
  if (pace !== null) facts.push(['Pace', `${formatPace(pace)} min/km`]);

  facts.push(['Erfasst', run.source === 'gps' ? 'GPS-Aufzeichnung' : 'von Hand']);
  facts.push(['Verdient', `${numberFormat.format(xpForDistance(run.distanceKm))} XP`]);

  return facts.map(([label, value]) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'stat';

    const term = document.createElement('dt');
    term.textContent = label;

    const definition = document.createElement('dd');
    definition.textContent = value;

    wrapper.append(term, definition);
    return wrapper;
  });
}

/** Zeichnet die Route – oder sagt, dass es keine gibt. */
function createRouteView(run) {
  if (!hasDrawableRoute(run.track)) {
    const hint = document.createElement('p');
    hint.className = 'muted route-empty';
    hint.textContent = 'Keine GPS-Daten für diesen Lauf.';
    return hint;
  }

  const wrapper = document.createElement('div');
  wrapper.append(createRouteSvg(run.track), createRouteLegend(run.track.length));
  return wrapper;
}

function createRouteSvg(track) {
  const { width, height } = DEFAULT_VIEWPORT;
  const projection = projectTrack(track, { width, height, padding: 14 });

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // Die Breite kommt aus dem CSS; das Seitenverhältnis hält das viewBox fest,
  // damit die Strecke auch auf schmalen Schirmen nicht verzerrt.
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', 'route-svg');
  svg.setAttribute('role', 'img');

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = `Aufgezeichnete Strecke mit ${projection.pointCount} Messpunkten`;
  svg.append(title);

  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('class', 'route-line');
  line.setAttribute('points', projection.points.map((p) => `${r1(p.x)},${r1(p.y)}`).join(' '));
  svg.append(line);

  svg.append(
    createRouteMarker(projection.start, 'route-start'),
    createRouteMarker(projection.end, 'route-end')
  );

  return svg;
}

function createRouteMarker(point, className) {
  const marker = document.createElementNS(SVG_NS, 'circle');
  marker.setAttribute('class', className);
  marker.setAttribute('cx', r1(point.x));
  marker.setAttribute('cy', r1(point.y));
  marker.setAttribute('r', '5');
  return marker;
}

function createRouteLegend(pointCount) {
  const legend = document.createElement('p');
  legend.className = 'muted route-legend';

  const start = document.createElement('span');
  start.className = 'route-key start';
  start.textContent = 'Start';

  const end = document.createElement('span');
  end.className = 'route-key end';
  end.textContent = 'Ziel';

  const count = document.createElement('span');
  count.textContent = `${pointCount} Messpunkte`;

  legend.append(start, end, count);
  return legend;
}

/* ------------------------------------------------------------ Bearbeiten */

function startEditing(id) {
  const run = runs.find((entry) => entry.id === id);
  if (!run) return;

  editingId = id;
  pendingDeleteId = null;

  // Die Liste steht im Profil, das Formular im Start-Bereich. Ohne den
  // Wechsel scrollte die Seite zu einer Karte, die gerade gar nicht da ist.
  setView('start');

  el.distance.value = run.distanceKm;
  el.date.value = run.date;
  el.time.value = run.timeOfDay ?? '';
  el.duration.value = run.durationMinutes ?? '';
  // Nur die selbst eingetragene Pace zurück ins Feld. Stünde dort die
  // gerechnete, würde sie beim Speichern zur Angabe – und bliebe stehen,
  // wenn die Distanz sich ändert.
  el.pace.value = run.paceMinPerKm === undefined ? '' : formatPace(run.paceMinPerKm);

  clearError();
  renderFormMode();
  renderRuns();

  el.formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  el.distance.focus();
}

function stopEditing() {
  editingId = null;

  el.form.reset();
  el.date.value = todayIso();

  clearError();
  renderFormMode();
  renderRuns();
}

function renderFormMode() {
  const editing = editingId !== null;

  el.formTitle.textContent = editing ? 'Lauf bearbeiten' : 'Lauf von Hand eintragen';
  el.formSubmit.textContent = editing ? 'Änderungen speichern' : 'Lauf speichern';
  el.formCancel.hidden = !editing;
  el.formCard.classList.toggle('editing', editing);
}

/* --------------------------------------------------------------- Sichern */

/**
 * Erinnert an die Sicherung, wenn die letzte zu lange her ist.
 *
 * Ob erinnert wird, entscheidet transfer.js – hier steht nur, wie es aussieht.
 * Der Hinweis lässt sich nicht wegklicken: er verschwindet, sobald exportiert
 * wurde, und das ist der einzige Zustand, in dem er nichts mehr zu sagen hat.
 */
function renderExportReminder() {
  const stand = exportReminder({ lastExport, runCount: runs.length, todayIso: todayIso() });

  el.exportReminder.hidden = !stand.due;
  el.exportReminder.classList.toggle('never', stand.never);

  if (!stand.due) return;

  el.exportReminder.textContent = stand.never
    ? `Noch nie gesichert. Deine ${runs.length} ${runs.length === 1 ? 'Lauf liegt' : 'Läufe liegen'} nur in diesem Browser – ein geleerter Speicher nimmt alles mit.`
    : `Die letzte Sicherung ist ${stand.daysSince} Tage her. Empfohlen ist alle ${EXPORT_REMINDER_DAYS} Tage.`;
}

/** Hält den Tag der letzten Sicherung fest und zeichnet den Hinweis neu. */
function rememberExport() {
  lastExport = saveLastExport(todayIso()) ?? lastExport;
  renderExportReminder();
}

function handleExport() {
  clearDataMessages();

  if (runs.length === 0) {
    return showDataError('Es gibt noch keine Läufe zum Exportieren.');
  }

  const blob = new Blob(
    [serializeExport(runs, { exerciseLog, sessions, exercisePlan, profile })],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName();
  link.click();

  URL.revokeObjectURL(url);
  rememberExport();
  showDataStatus(`${runs.length} ${runs.length === 1 ? 'Lauf' : 'Läufe'} exportiert.`);
}

async function handleImportFile(event) {
  const file = event.target.files?.[0];
  el.importInput.value = ''; // dieselbe Datei soll erneut wählbar sein
  if (!file) return;

  clearDataMessages();

  let text;
  try {
    text = await file.text();
  } catch {
    return showDataError('Die Datei konnte nicht gelesen werden.');
  }

  const result = parseImport(text);
  if (!result.ok) return showDataError(result.error);

  // Import ersetzt den Bestand, deshalb erst nachfragen.
  pendingImport = result;
  el.importSummary.textContent = buildImportSummary(result);
  el.importConfirm.hidden = false;
}

function buildImportSummary(result) {
  const uebungen = result.exerciseLog?.length ?? 0;
  const einheiten = result.sessions?.length ?? 0;
  const vorhaben = result.exercisePlan?.length ?? 0;

  const anhang = [
    uebungen > 0 ? `${uebungen} erledigte Übungen` : null,
    einheiten > 0 ? `${einheiten} geplante ${einheiten === 1 ? 'Einheit' : 'Einheiten'}` : null,
    vorhaben > 0 ? `${vorhaben} vorgemerkte ${vorhaben === 1 ? 'Übung' : 'Übungen'}` : null,
    result.profile?.name ? `der Name ${result.profile.name}` : null,
    result.profile?.weeklyGoal ? `ein Wochenziel von ${result.profile.weeklyGoal}` : null,
  ].filter(Boolean);

  const mitAnhang = anhang.length > 0 ? ` und ${anhang.join(', ')}` : '';
  const found = `${result.runs.length} ${result.runs.length === 1 ? 'Lauf' : 'Läufe'}${mitAnhang} gefunden`;
  const skipped =
    result.skipped.length > 0
      ? `, ${result.skipped.length} unlesbare übersprungen`
      : '';
  const replaced =
    runs.length > 0
      ? `Ersetzt die aktuellen ${runs.length} ${runs.length === 1 ? 'Lauf' : 'Läufe'}.`
      : 'Aktuell sind keine Läufe gespeichert.';

  return `${found}${skipped}. ${replaced}`;
}

function handleImportApply() {
  if (!pendingImport) return;

  const imported = pendingImport.runs;
  const importierteUebungen = pendingImport.exerciseLog ?? [];
  const importierterPlan = pendingImport.sessions ?? [];
  const importierteVorhaben = pendingImport.exercisePlan ?? [];
  const importiertesProfil = pendingImport.profile ?? { name: '', weeklyGoal: 0 };
  cancelImport();
  stopEditing();
  resetSessionForm();
  editingExerciseId = null;
  planningExerciseId = null;

  runs = replaceRuns(imported);
  exerciseLog = replaceExerciseLog(importierteUebungen);
  sessions = replaceSessions(importierterPlan);
  exercisePlan = saveExercisePlan(importierteVorhaben);

  // Das Profil wird mit ersetzt, auch durch ein leeres: der Import bildet die
  // Datei ab, und ein stehengebliebener Name wäre der des alten Geräts.
  profile = saveProfile(importiertesProfil);
  fillProfileForm();

  // Ein Import zählt als Sicherung: in diesem Moment existiert nachweislich
  // eine Datei mit genau diesen Daten. Nicht das Datum aus der Datei nehmen –
  // wer eine halbjährige Sicherung einliest, bekäme sonst sofort die
  // Erinnerung, obwohl er gerade eben das Richtige getan hat.
  rememberExport();

  // Ohne Freischalt-Meldung: nach einem Import wäre sie eine Aufzählung
  // sämtlicher Achievements statt einer Neuigkeit.
  render({ announceUnlocks: false });

  showDataStatus(`${imported.length} ${imported.length === 1 ? 'Lauf' : 'Läufe'} importiert.`);
}

function cancelImport() {
  pendingImport = null;
  el.importConfirm.hidden = true;
  el.importSummary.textContent = '';
}

function showDataStatus(message) {
  el.dataStatus.textContent = message;
  el.dataStatus.hidden = false;
}

function showDataError(message) {
  el.dataError.textContent = message;
  el.dataError.hidden = false;
}

function clearDataMessages() {
  el.dataStatus.hidden = true;
  el.dataStatus.textContent = '';
  el.dataError.hidden = true;
  el.dataError.textContent = '';
}

/* -------------------------------------------------------------- Tracking */

/**
 * Wählt die Aufzeichnungsart.
 *
 * Erst hier – also aus einer Berührung heraus – kann überhaupt eine
 * Standortabfrage entstehen; abgefragt wird sie trotzdem erst beim Start.
 * Während einer laufenden Aufzeichnung ist die Wahl gesperrt: mitten im Lauf
 * die Art zu wechseln hiesse, die bisherige Messung wegzuwerfen.
 */
function setTrackGps(an, { merken = true } = {}) {
  if (isRecording()) return;

  // Ohne Standortdienst oder ohne HTTPS bleibt nur die Uhr.
  const moeglich = tracker.isSupported() && window.isSecureContext;
  trackGps = an && moeglich;

  if (merken) saveGpsPreference(trackGps);

  el.trackGpsOn.className = trackGps ? 'chip active' : 'chip';
  el.trackGpsOff.className = trackGps ? 'chip' : 'chip active';
  el.trackGpsOn.setAttribute('aria-pressed', String(trackGps));
  el.trackGpsOff.setAttribute('aria-pressed', String(!trackGps));

  clearTrackError();
  el.trackStatus.textContent = trackGpsHint(an, moeglich);
  renderTracking(recorder().getState());
}

function trackGpsHint(gewuenscht, moeglich) {
  if (gewuenscht && !moeglich) {
    return tracker.isSupported()
      ? 'Standortzugriff braucht HTTPS oder localhost – hier läuft nur die Uhr.'
      : 'Dieser Browser kann den Standort nicht bestimmen – hier läuft nur die Uhr.';
  }

  return trackGps
    ? 'Bereit. Der Browser fragt beim Start nach der Standortfreigabe.'
    : 'Bereit. Ohne GPS läuft nur die Uhr – die Distanz trägst du danach nach.';
}

function handleTrackStart() {
  clearTrackError();
  recorder().start();
}

function handleTrackPause() {
  const { status } = recorder().getState();
  if (status === 'tracking') recorder().pause();
  else if (status === 'paused') recorder().resume();
}

function handleTrackStop() {
  const mitGps = trackGps;
  const summary = recorder().stop();
  if (!summary) return;

  // Ohne GPS gibt es nur die Zeit. Statt sie zu verlieren, steht sie unten im
  // Formular schon vorbereitet – es fehlt nur die Distanz.
  if (!mitGps) {
    clearTrackError();
    prefillManualRun(summary.startedAt, summary.durationMinutes);
    el.trackStatus.textContent =
      `Zeit gestoppt: ${numberFormat.format(summary.durationMinutes)} min. ` +
      'Trag unten die Distanz nach, dann ist der Lauf gespeichert.';
    return;
  }

  if (summary.distanceKm <= 0) {
    return showTrackError(
      'Keine verwertbare Strecke aufgezeichnet – der Lauf wurde nicht gespeichert.'
    );
  }

  clearTrackError();
  runs = addRun(runs, {
    distanceKm: summary.distanceKm,
    date: toIsoDate(summary.startedAt),
    timeOfDay: toTimeOfDay(summary.startedAt),
    durationMinutes: summary.durationMinutes,
    source: 'gps',
    // Ausgedünnt gespeichert: der localStorage ist knapp, und für die kleine
    // Vorschau reicht ein Punkt alle paar Meter.
    track: toStorageTrack(summary.track),
  });

  el.trackStatus.textContent =
    `Gespeichert: ${numberFormat.format(summary.distanceKm)} km in ` +
    `${numberFormat.format(summary.durationMinutes)} min.`;

  render({ announceUnlocks: true });
}

function handleTrackDiscard() {
  recorder().discard();
  clearTrackError();
  el.trackStatus.textContent = 'Aufzeichnung verworfen.';
}

/* --------------------------------------------------------- Tastensperre */

function setLocked(value) {
  locked = value;
  cancelUnlockHold();
  renderTracking(recorder().getState());
}

/**
 * Entsperren durch Halten. Eine Berührung in der Hosentasche wandert und
 * dauert Millisekunden – zwei Sekunden am selben Punkt schafft sie nicht.
 */
function bindUnlockHold() {
  el.trackUnlock.addEventListener('pointerdown', (event) => {
    event.preventDefault();

    // Der Zeiger soll am Knopf kleben, auch wenn der Finger leicht verrutscht.
    // Schlägt das fehl, darf das Entsperren trotzdem nicht blockiert sein.
    try {
      el.trackUnlock.setPointerCapture?.(event.pointerId);
    } catch {
      /* ohne Fang geht es auch */
    }

    startUnlockHold();
  });

  el.trackUnlock.addEventListener('pointerup', releaseUnlockHold);
  el.trackUnlock.addEventListener('pointercancel', cancelUnlockHold);
  el.trackUnlock.addEventListener('pointerleave', cancelUnlockHold);

  // Mit der Tastatur: Leertaste oder Enter gedrückt halten.
  el.trackUnlock.addEventListener('keydown', (event) => {
    if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
    event.preventDefault();
    startUnlockHold();
  });
  el.trackUnlock.addEventListener('keyup', releaseUnlockHold);
  el.trackUnlock.addEventListener('blur', cancelUnlockHold);
}

/**
 * Getaktet statt über requestAnimationFrame: rAF steht still, sobald die
 * Seite nicht gezeichnet wird. Beim Entsperren wäre das fatal – der Knopf
 * würde sich nicht mehr füllen und die Sperre bliebe zu.
 */
const UNLOCK_TICK_MS = 40;

function startUnlockHold() {
  if (!locked || unlockStartedAt !== null) return;

  unlockStartedAt = performance.now();
  unlockFrame = setInterval(pollUnlockHold, UNLOCK_TICK_MS);
  pollUnlockHold();
}

function pollUnlockHold() {
  if (unlockStartedAt === null) return;

  const now = performance.now();
  el.unlockFill.style.width = `${holdProgress(unlockStartedAt, now) * 100}%`;

  if (isHoldComplete(unlockStartedAt, now)) finishUnlock();
}

/**
 * Loslassen. Falls der Takt zwischenzeitlich gedrosselt wurde, zählt hier
 * noch die tatsächlich verstrichene Zeit – sonst hätte jemand lange genug
 * gehalten und bliebe trotzdem gesperrt.
 */
function releaseUnlockHold() {
  if (unlockStartedAt === null) return;

  if (isHoldComplete(unlockStartedAt, performance.now())) finishUnlock();
  else cancelUnlockHold();
}

function finishUnlock() {
  setLocked(false);
  el.trackStatus.textContent = 'Entsperrt.';
}

function cancelUnlockHold() {
  unlockStartedAt = null;

  if (unlockFrame !== null) {
    clearInterval(unlockFrame);
    unlockFrame = null;
  }

  el.unlockFill.style.width = '0%';
}

/**
 * Sperrt den Rest der Seite mit weg. Eine Tastensperre, unter der man noch
 * Läufe löschen kann, wäre keine.
 */
function setRestInert(inert) {
  // Zwei Ebenen: die Bereiche selbst und die Karten im Start-Bereich. Die
  // Tracking-Karte liegt inzwischen im Start-Bereich – würde man den pauschal
  // sperren, wäre die Karte darin mitgesperrt und die Sperre nicht mehr zu
  // öffnen.
  const ziele = [
    ...document.querySelectorAll('.app > *'),
    ...document.querySelectorAll('#view-start > *'),
  ];

  for (const bereich of ziele) {
    if (bereich === el.trackingCard || bereich.contains(el.trackingCard)) continue;
    bereich.inert = inert;
  }
}

/* --------------------------------------------------------------- Anzeige */

function render({ announceUnlocks }) {
  const achievements = evaluateAchievements(runs, exerciseLog);
  const runXp = totalXpFromRuns(runs);
  const uebungsXp = exerciseXp(exerciseLog);
  const bonusXp = achievementXp(achievements);
  const planBonusXp = planXp(sessions, runs, { today: todayIso() });
  const zielXp = currentGoalXp();
  const progress = getProgress(runXp + uebungsXp + bonusXp + planBonusXp + zielXp);

  renderGreeting();
  renderProgress(progress, runXp, uebungsXp, bonusXp, planBonusXp, zielXp);
  renderToday();
  renderAchievements(achievements, announceUnlocks);
  renderDetail();
  renderRuns();
  renderExportReminder();

  // Der sichtbare Nebenbereich muss mitziehen; die verborgenen werden beim
  // Umschalten ohnehin neu gebaut.
  if (activeView === 'trophies') renderTrophies();
  if (activeView === 'profile') renderProfile();
  if (activeView === 'exercises') renderExercises();
  if (activeView === 'training') renderTraining();
}

/* ------------------------------------------------------------- Statistik */

function setStatsPeriod(period) {
  statsPeriod = period;
  renderPeriodStats();
}

/**
 * Kennzahlen des laufenden Zeitraums plus das Balkendiagramm. Beide hängen am
 * selben Umschalter: eine Wochenzahl neben Monatsbalken hätte niemand
 * zusammengebracht.
 */
function renderPeriodStats() {
  const weekly = statsPeriod === 'week';

  el.periodWeek.className = weekly ? 'small' : 'small secondary';
  el.periodMonth.className = weekly ? 'small secondary' : 'small';
  el.periodWeek.setAttribute('aria-pressed', String(weekly));
  el.periodMonth.setAttribute('aria-pressed', String(!weekly));
  el.periodCaption.textContent = weekly ? 'Diese Woche (Mo–So)' : 'Dieser Monat';

  const imZeitraum = runsInPeriod(runs, { period: statsPeriod, todayIso: todayIso() });
  const stats = buildStats(imZeitraum, { todayIso: todayIso() });

  el.periodEmpty.hidden = stats.runCount > 0;
  el.periodEmpty.textContent = weekly
    ? 'In dieser Woche noch kein Lauf.'
    : 'In diesem Monat noch kein Lauf.';
  el.periodStats.hidden = stats.runCount === 0;

  if (stats.runCount > 0) {
    el.periodStats.replaceChildren(
      ...buildStatBlocks([
        ['Distanz', `${numberFormat.format(round(stats.totalDistanceKm))} km`],
        ['Läufe', String(stats.runCount)],
        ['Ø pro Lauf', `${numberFormat.format(round(stats.averageDistanceKm))} km`],
        ['Ø Pace', formatAveragePace(stats.averagePaceMinPerKm)],
        ['Längster Lauf', `${numberFormat.format(stats.longestRun.distanceKm)} km`],
      ])
    );
  }

  renderChart();
}

function renderChart() {
  const weekly = statsPeriod === 'week';

  // Ohne einen einzigen Lauf bliebe eine Überschrift über einer leeren Liste
  // stehen – dann lieber gar kein Diagramm.
  el.chartTitle.hidden = runs.length === 0;

  const buckets = weekly
    ? distanceByWeek(runs, { limit: 12 })
    : distanceByMonth(runs, { limit: 12 });

  // Bezugsgröße für die Balkenbreite; ohne sie wären alle Balken gleich lang.
  const maximum = Math.max(...buckets.map((bucket) => bucket.distanceKm), 0);

  el.chartList.replaceChildren(
    ...buckets.map((bucket) =>
      createChartRow(
        weekly ? `KW ${bucket.isoWeek}` : formatMonth(bucket.month),
        bucket,
        maximum
      )
    )
  );
}

function createChartRow(label, bucket, maximum) {
  const item = document.createElement('li');
  item.className = bucket.distanceKm > 0 ? 'chart-row' : 'chart-row empty';

  const name = document.createElement('span');
  name.className = 'chart-label';
  name.textContent = label;

  const track = document.createElement('span');
  track.className = 'chart-track';

  const bar = document.createElement('span');
  bar.className = 'chart-bar';
  // Bei nur einem Balken sieht 100% seltsam aus, ist aber ehrlich.
  bar.style.width = maximum > 0 ? `${(bucket.distanceKm / maximum) * 100}%` : '0';
  track.append(bar);

  const value = document.createElement('span');
  value.className = 'chart-value';
  value.textContent = `${numberFormat.format(round(bucket.distanceKm))} km`;

  item.append(name, track, value);
  item.setAttribute(
    'aria-label',
    `${label}: ${numberFormat.format(round(bucket.distanceKm))} km aus ` +
      `${bucket.runCount} ${bucket.runCount === 1 ? 'Lauf' : 'Läufen'}`
  );

  return item;
}

/**
 * Live-Anzeige der Aufzeichnung.
 * Die Statuszeile wird nur während tracking/paused gesetzt – im Ruhezustand
 * gehört sie den Handlern ("Gespeichert…", "Verworfen…") bzw. init().
 */
function renderTracking(state) {
  const running = state.status !== 'idle';

  // Endet die Aufzeichnung von aussen, muss die Sperre mit fallen.
  if (shouldReleaseLock({ status: state.status, locked })) {
    locked = false;
    cancelUnlockHold();
  }

  // Ohne GPS wird nichts gemessen, was in diesen beiden Feldern stehen könnte
  // – eine 0,00 wäre keine Angabe, sondern eine falsche.
  el.trackDistance.textContent = state.gps ? distanceFormat.format(state.distanceKm) : '–';
  el.trackDuration.textContent = formatDuration(state.elapsedMs);
  el.trackPace.textContent = state.gps
    ? formatPace(paceMinPerKm(state.distanceKm, state.elapsedMs))
    : '–';

  // Mitten in der Aufzeichnung die Art zu wechseln, würfe die Messung weg.
  for (const chip of [el.trackGpsOn, el.trackGpsOff]) {
    chip.disabled = running;
  }

  el.trackStart.hidden = running;
  el.trackPause.hidden = !running;
  el.trackStop.hidden = !running;
  el.trackDiscard.hidden = !running;
  el.trackPause.textContent = state.status === 'paused' ? 'Fortsetzen' : 'Pause';

  // Gesperrt bleiben die Knöpfe sichtbar, reagieren aber nicht. Ausblenden
  // würde den Zustand verschleiern.
  const bedienbar = controlsEnabled({ status: state.status, locked });
  el.trackPause.disabled = !bedienbar;
  el.trackStop.disabled = !bedienbar;
  el.trackDiscard.disabled = !bedienbar;

  el.trackLock.hidden = !canLock({ status: state.status, locked });
  el.lockPanel.hidden = !locked;
  el.trackingCard.classList.toggle('locked', locked);
  setRestInert(locked);

  document.getElementById('tracking-readout').classList.toggle('active', running);

  // Ein zurückgestellter Aktualisierungshinweis darf nach dem Lauf erscheinen.
  maybeShowUpdateHint();

  // Die Statuszeile läuft auch gesperrt weiter – eine eingefrorene Anzeige
  // sähe aus, als hinge die App.
  if (state.status === 'paused') {
    el.trackStatus.textContent = state.gps
      ? 'Pausiert – die Strecke zählt erst ab dem Fortsetzen weiter.'
      : 'Pausiert – die Uhr zählt erst ab dem Fortsetzen weiter.';
    return;
  }

  if (state.status === 'tracking') {
    if (!state.gps) {
      el.trackStatus.textContent = 'Ohne GPS – es läuft nur die Uhr.';
      return;
    }

    if (state.lastAccuracyM === null) {
      el.trackStatus.textContent = 'Warte auf das erste GPS-Signal …';
      return;
    }

    // Ein brauchbarer Fix erledigt eine vorherige "kein Signal"-Meldung.
    if (state.pointCount > 0) clearTrackError();

    const quality = `GPS auf ±${Math.round(state.lastAccuracyM)} m genau`;
    const points = `${state.pointCount} ${state.pointCount === 1 ? 'Messpunkt' : 'Messpunkte'}`;
    // stillCount ist Normalbetrieb und wird nicht angezeigt; nur echte
    // Qualitätsprobleme (ungenau, Ausreißer) sind eine Meldung wert.
    const dropped =
      state.rejectedCount > 0 ? ` · ${state.rejectedCount} unbrauchbar` : '';

    el.trackStatus.textContent = `${quality} · ${points}${dropped}`;
  }
}

function showTrackError(message) {
  el.trackError.textContent = message;
  el.trackError.hidden = false;
}

function clearTrackError() {
  el.trackError.textContent = '';
  el.trackError.hidden = true;
}

/** Bonus-XP aus den erreichten Wochen, gegen das aktuell gesetzte Ziel. */
function currentGoalXp() {
  return goalXp(runs, { ...profile, todayIso: todayIso() });
}

function renderProgress(progress, runXp, uebungsXp, bonusXp, planBonusXp, zielXp) {
  const percent = Math.min(100, Math.max(0, progress.progressPercent));
  const upcoming = nextTitle(progress.level);

  el.level.textContent = progress.level;
  el.title.textContent = titleForLevel(progress.level);
  el.titleBadgeIcon.src = badgeSrc(badgeForLevel(progress.level));
  el.totalXp.textContent = numberFormat.format(progress.totalXp);

  el.progressFill.style.width = `${percent}%`;
  el.progressBar.setAttribute('aria-valuenow', Math.round(percent));

  el.xpIntoLevel.textContent = numberFormat.format(progress.xpIntoLevel);
  el.xpForLevel.textContent = numberFormat.format(progress.xpForLevel);
  el.xpToNext.textContent = numberFormat.format(progress.xpToNextLevel);
  el.nextLevel.textContent = progress.level + 1;

  el.runXp.textContent = numberFormat.format(runXp);
  el.exerciseXp.textContent = numberFormat.format(uebungsXp);
  el.bonusXp.textContent = numberFormat.format(bonusXp);
  el.planXpTotal.textContent = numberFormat.format(planBonusXp);
  el.goalXpTotal.textContent = numberFormat.format(zielXp);
  el.nextTitle.textContent = upcoming.title;
  el.nextTitleLevel.textContent = upcoming.level;
}

/**
 * Die Achievements selbst stehen im Trophäen-Tab. Hier bleibt nur die
 * Freischalt-Meldung: sie gehört zur gerade gespeicherten Sache und muss dort
 * erscheinen, wo gespeichert wurde – nicht in einem Tab, den man erst
 * aufsuchen müsste.
 */
function renderAchievements(achievements, announceUnlocks) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const currentIds = new Set(unlocked.map((a) => a.id));

  // Die Meldung gehört zur letzten Speicheraktion. Bei Löschen, Import oder
  // Neuladen wäre sie veraltet – dann lieber weg damit.
  showUnlockNotice(announceUnlocks ? unlocked.filter((a) => !unlockedIds.has(a.id)) : []);

  unlockedIds = currentIds;
}

function showUnlockNotice(fresh) {
  if (fresh.length === 0) {
    el.unlockNotice.hidden = true;
    el.unlockNotice.textContent = '';
    return;
  }

  const names = fresh.map((a) => a.name).join(', ');
  const bonus = fresh.reduce((sum, a) => sum + a.xp, 0);
  el.unlockNotice.textContent = `Freigeschaltet: ${names} (+${numberFormat.format(bonus)} XP)`;
  el.unlockNotice.hidden = false;
}

function renderRuns() {
  el.runCount.textContent = runs.length;
  el.runsEmpty.hidden = runs.length > 0;

  // Eine Rückfrage zu einem inzwischen verschwundenen Lauf wäre eine Leiche.
  if (pendingDeleteId !== null && !runs.some((run) => run.id === pendingDeleteId)) {
    pendingDeleteId = null;
  }

  el.runsList.replaceChildren(...runs.map(createRunItem));
}

function createRunItem(run) {
  const item = document.createElement('li');
  item.className = 'run';
  if (run.id === editingId) item.classList.add('editing');
  if (run.id === detailId) item.classList.add('open');

  if (run.id === pendingDeleteId) return fillDeleteConfirm(item, run);

  // Der linke Teil öffnet die Detailansicht – als Knopf, damit er auch mit
  // der Tastatur erreichbar ist.
  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'run-open';
  info.dataset.detailId = run.id;
  info.setAttribute('aria-expanded', String(run.id === detailId));

  const distance = document.createElement('span');
  distance.className = 'run-distance';
  distance.textContent = `${numberFormat.format(run.distanceKm)} km`;

  const date = document.createElement('span');
  date.className = 'run-date muted';
  date.textContent = formatRunMeta(run);

  info.append(distance, date);

  const xp = document.createElement('span');
  xp.className = 'run-xp';
  xp.textContent = `+${numberFormat.format(xpForDistance(run.distanceKm))} XP`;

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'icon-button';
  edit.dataset.editId = run.id;
  edit.textContent = '✎';
  edit.setAttribute('aria-label', `Lauf vom ${formatDate(run.date)} bearbeiten`);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-button';
  remove.dataset.askDeleteId = run.id;
  remove.textContent = '×';
  remove.setAttribute('aria-label', `Lauf vom ${formatDate(run.date)} löschen`);

  item.append(info, xp, edit, remove);
  return item;
}

/** Zeile im Rückfrage-Zustand: erst hier wird tatsächlich gelöscht. */
function fillDeleteConfirm(item, run) {
  item.classList.add('confirming');

  const question = document.createElement('span');
  question.className = 'run-question';
  question.textContent =
    `${numberFormat.format(run.distanceKm)} km vom ${formatDate(run.date)} wirklich löschen?`;

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'danger small';
  confirm.dataset.confirmDeleteId = run.id;
  confirm.textContent = 'Löschen';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'secondary small';
  cancel.dataset.cancelDelete = 'true';
  cancel.textContent = 'Abbrechen';

  item.append(question, confirm, cancel);
  return item;
}

/** "14.08.2026 · 06:30 Uhr · 28 min · GPS" – optionale Teile nur wenn vorhanden. */
function formatRunMeta(run) {
  const parts = [formatDate(run.date)];
  if (run.timeOfDay) parts.push(`${run.timeOfDay} Uhr`);
  if (run.durationMinutes) parts.push(`${numberFormat.format(run.durationMinutes)} min`);

  const pace = runPaceMinPerKm(run);
  if (pace !== null) parts.push(`${formatPace(pace)} min/km`);

  if (run.source === 'gps') parts.push('GPS');
  return parts.join(' · ');
}

function showError(message) {
  el.formError.textContent = message;
  el.formError.hidden = false;
}

function clearError() {
  el.formError.textContent = '';
  el.formError.hidden = true;

  // Der Hinweis gehört zur letzten Eingabe. Wird neu getippt oder ein anderer
  // Lauf bearbeitet, wäre er von gestern.
  showWarnings([]);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;

  // Übernimmt ein neuer Service Worker die Seite, läuft hier noch der alte
  // Code. Genau dann darf die Seite nicht heimlich veraltet weiterlaufen.
  navigator.serviceWorker.addEventListener('controllerchange', markUpdateReady);

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const neuer = registration.installing;
          if (!neuer || !navigator.serviceWorker.controller) return;

          neuer.addEventListener('statechange', () => {
            if (neuer.state === 'installed') markUpdateReady();
          });
        });
      })
      .catch((err) => console.warn('Service Worker nicht registriert:', err));
  });
}

function markUpdateReady() {
  updateReady = true;
  maybeShowUpdateHint();
}

/**
 * Der Hinweis wartet, solange aufgezeichnet wird. Ein Neuladen mitten im Lauf
 * wäre der teuerste Moment – lieber eine veraltete Oberfläche als eine
 * verlorene Strecke.
 */
function maybeShowUpdateHint() {
  el.updateHint.hidden = !(updateReady && !isRecording());
}
