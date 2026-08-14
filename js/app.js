/**
 * Anzeige und Interaktion.
 *
 * Diese Datei kennt das DOM, rechnet aber nichts selbst aus:
 *   xp.js           XP und Level
 *   achievements.js Achievements und deren Bonus-XP
 *   titles.js       Titel zum Level
 *   geo.js          Streckenberechnung und Formatierung
 *   tracker.js      Live-Aufzeichnung über die Geolocation-API
 *   validation.js   Prüfung der Eingaben
 *   transfer.js     Export-/Importformat
 *   storage.js      Persistenz
 */

import { getProgress, totalXpFromRuns, xpForDistance } from './xp.js';
import { evaluateAchievements, achievementXp } from './achievements.js';
import { titleForLevel, nextTitle } from './titles.js';
import { paceMinPerKm, formatDuration, formatPace } from './geo.js';
import { createTracker } from './tracker.js';
import { validateRun, firstErrorMessage } from './validation.js';
import { serializeExport, exportFileName, parseImport } from './transfer.js';
import { loadRuns, addRun, updateRun, removeRun, replaceRuns } from './storage.js';

/** @type {import('./storage.js').Run[]} */
let runs = [];

/** IDs der zuletzt gerenderten Achievements – für die Freischalt-Meldung. */
let unlockedIds = new Set();

/** id des Laufs, der gerade im Formular bearbeitet wird; null = neuer Lauf. */
let editingId = null;

/** id des Laufs, für den die Löschrückfrage offen ist. */
let pendingDeleteId = null;

/** Geprüftes Importergebnis, das auf die Bestätigung wartet. */
let pendingImport = null;

const el = {
  level: document.getElementById('level'),
  title: document.getElementById('title'),
  totalXp: document.getElementById('total-xp'),
  progressBar: document.getElementById('progress-bar'),
  progressFill: document.getElementById('progress-fill'),
  xpIntoLevel: document.getElementById('xp-into-level'),
  xpForLevel: document.getElementById('xp-for-level'),
  xpToNext: document.getElementById('xp-to-next'),
  nextLevel: document.getElementById('next-level'),
  runXp: document.getElementById('run-xp'),
  bonusXp: document.getElementById('bonus-xp'),
  nextTitle: document.getElementById('next-title'),
  nextTitleLevel: document.getElementById('next-title-level'),

  trackDistance: document.getElementById('track-distance'),
  trackDuration: document.getElementById('track-duration'),
  trackPace: document.getElementById('track-pace'),
  trackStatus: document.getElementById('track-status'),
  trackError: document.getElementById('track-error'),
  trackStart: document.getElementById('track-start'),
  trackPause: document.getElementById('track-pause'),
  trackStop: document.getElementById('track-stop'),
  trackDiscard: document.getElementById('track-discard'),

  formCard: document.getElementById('form-card'),
  formTitle: document.getElementById('form-title'),
  form: document.getElementById('run-form'),
  formSubmit: document.getElementById('form-submit'),
  formCancel: document.getElementById('form-cancel'),
  distance: document.getElementById('distance'),
  date: document.getElementById('date'),
  time: document.getElementById('time'),
  duration: document.getElementById('duration'),
  formError: document.getElementById('form-error'),
  unlockNotice: document.getElementById('unlock-notice'),

  exportButton: document.getElementById('export-button'),
  importButton: document.getElementById('import-button'),
  importInput: document.getElementById('import-input'),
  importConfirm: document.getElementById('import-confirm'),
  importSummary: document.getElementById('import-summary'),
  importApply: document.getElementById('import-apply'),
  importCancel: document.getElementById('import-cancel'),
  dataStatus: document.getElementById('data-status'),
  dataError: document.getElementById('data-error'),

  achievementCount: document.getElementById('achievement-count'),
  achievementLists: {
    meilenstein: document.getElementById('achievements-meilenstein'),
    herausforderung: document.getElementById('achievements-herausforderung'),
  },

  runCount: document.getElementById('run-count'),
  runsEmpty: document.getElementById('runs-empty'),
  runsList: document.getElementById('runs-list'),
};

const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const distanceFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const tracker = createTracker({
  onUpdate: renderTracking,
  onError: showTrackError,
});

init();

function init() {
  runs = loadRuns();
  el.date.value = todayIso();

  el.form.addEventListener('submit', handleSubmit);
  el.formCancel.addEventListener('click', stopEditing);
  el.runsList.addEventListener('click', handleListClick);

  el.exportButton.addEventListener('click', handleExport);
  el.importButton.addEventListener('click', () => el.importInput.click());
  el.importInput.addEventListener('change', handleImportFile);
  el.importApply.addEventListener('click', handleImportApply);
  el.importCancel.addEventListener('click', cancelImport);

  el.trackStart.addEventListener('click', handleTrackStart);
  el.trackPause.addEventListener('click', handleTrackPause);
  el.trackStop.addEventListener('click', handleTrackStop);
  el.trackDiscard.addEventListener('click', handleTrackDiscard);

  if (!tracker.isSupported()) {
    el.trackStart.disabled = true;
    el.trackStatus.textContent =
      'Dieser Browser kann den Standort nicht bestimmen – trag Läufe von Hand ein.';
  } else if (!window.isSecureContext) {
    el.trackStart.disabled = true;
    el.trackStatus.textContent =
      'Standortzugriff braucht HTTPS oder localhost. Über diese Adresse geht kein Tracking.';
  }

  render({ announceUnlocks: false });
  registerServiceWorker();
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

  render({ announceUnlocks: true });
}

function handleListClick(event) {
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

  runs = removeRun(runs, id);
  render({ announceUnlocks: false });
}

/* ------------------------------------------------------------ Bearbeiten */

function startEditing(id) {
  const run = runs.find((entry) => entry.id === id);
  if (!run) return;

  editingId = id;
  pendingDeleteId = null;

  el.distance.value = run.distanceKm;
  el.date.value = run.date;
  el.time.value = run.timeOfDay ?? '';
  el.duration.value = run.durationMinutes ?? '';

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

function handleExport() {
  clearDataMessages();

  if (runs.length === 0) {
    return showDataError('Es gibt noch keine Läufe zum Exportieren.');
  }

  const blob = new Blob([serializeExport(runs)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName();
  link.click();

  URL.revokeObjectURL(url);
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
  const found = `${result.runs.length} ${result.runs.length === 1 ? 'Lauf' : 'Läufe'} gefunden`;
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
  cancelImport();
  stopEditing();

  runs = replaceRuns(imported);

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

function handleTrackStart() {
  clearTrackError();
  tracker.start();
}

function handleTrackPause() {
  const { status } = tracker.getState();
  if (status === 'tracking') tracker.pause();
  else if (status === 'paused') tracker.resume();
}

function handleTrackStop() {
  const summary = tracker.stop();
  if (!summary) return;

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
  });

  el.trackStatus.textContent =
    `Gespeichert: ${numberFormat.format(summary.distanceKm)} km in ` +
    `${numberFormat.format(summary.durationMinutes)} min.`;

  render({ announceUnlocks: true });
}

function handleTrackDiscard() {
  tracker.discard();
  clearTrackError();
  el.trackStatus.textContent = 'Aufzeichnung verworfen.';
}

/* --------------------------------------------------------------- Anzeige */

function render({ announceUnlocks }) {
  const achievements = evaluateAchievements(runs);
  const runXp = totalXpFromRuns(runs);
  const bonusXp = achievementXp(achievements);
  const progress = getProgress(runXp + bonusXp);

  renderProgress(progress, runXp, bonusXp);
  renderAchievements(achievements, announceUnlocks);
  renderRuns();
}

/**
 * Live-Anzeige der Aufzeichnung.
 * Die Statuszeile wird nur während tracking/paused gesetzt – im Ruhezustand
 * gehört sie den Handlern ("Gespeichert…", "Verworfen…") bzw. init().
 */
function renderTracking(state) {
  const running = state.status !== 'idle';

  el.trackDistance.textContent = distanceFormat.format(state.distanceKm);
  el.trackDuration.textContent = formatDuration(state.elapsedMs);
  el.trackPace.textContent = formatPace(
    paceMinPerKm(state.distanceKm, state.elapsedMs)
  );

  el.trackStart.hidden = running;
  el.trackPause.hidden = !running;
  el.trackStop.hidden = !running;
  el.trackDiscard.hidden = !running;
  el.trackPause.textContent = state.status === 'paused' ? 'Fortsetzen' : 'Pause';

  document.getElementById('tracking-readout').classList.toggle('active', running);

  if (state.status === 'paused') {
    el.trackStatus.textContent = 'Pausiert – die Strecke zählt erst ab dem Fortsetzen weiter.';
    return;
  }

  if (state.status === 'tracking') {
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

function renderProgress(progress, runXp, bonusXp) {
  const percent = Math.min(100, Math.max(0, progress.progressPercent));
  const upcoming = nextTitle(progress.level);

  el.level.textContent = progress.level;
  el.title.textContent = titleForLevel(progress.level);
  el.totalXp.textContent = numberFormat.format(progress.totalXp);

  el.progressFill.style.width = `${percent}%`;
  el.progressBar.setAttribute('aria-valuenow', Math.round(percent));

  el.xpIntoLevel.textContent = numberFormat.format(progress.xpIntoLevel);
  el.xpForLevel.textContent = numberFormat.format(progress.xpForLevel);
  el.xpToNext.textContent = numberFormat.format(progress.xpToNextLevel);
  el.nextLevel.textContent = progress.level + 1;

  el.runXp.textContent = numberFormat.format(runXp);
  el.bonusXp.textContent = numberFormat.format(bonusXp);
  el.nextTitle.textContent = upcoming.title;
  el.nextTitleLevel.textContent = upcoming.level;
}

function renderAchievements(achievements, announceUnlocks) {
  const unlocked = achievements.filter((a) => a.unlocked);
  el.achievementCount.textContent = `${unlocked.length}/${achievements.length}`;

  for (const [category, list] of Object.entries(el.achievementLists)) {
    const items = achievements
      .filter((a) => a.category === category)
      .map(createAchievementItem);
    list.replaceChildren(...items);
  }

  const currentIds = new Set(unlocked.map((a) => a.id));

  // Die Meldung gehört zur letzten Speicheraktion. Bei Löschen, Import oder
  // Neuladen wäre sie veraltet – dann lieber weg damit.
  showUnlockNotice(announceUnlocks ? unlocked.filter((a) => !unlockedIds.has(a.id)) : []);

  unlockedIds = currentIds;
}

function createAchievementItem(achievement) {
  const item = document.createElement('li');
  item.className = achievement.unlocked ? 'achievement unlocked' : 'achievement';

  const mark = document.createElement('span');
  mark.className = 'achievement-mark';
  mark.textContent = achievement.unlocked ? '✓' : '○';
  mark.setAttribute('aria-hidden', 'true');

  const info = document.createElement('div');
  info.className = 'achievement-info';

  const name = document.createElement('span');
  name.className = 'achievement-name';
  name.textContent = achievement.name;

  const description = document.createElement('span');
  description.className = 'achievement-description muted';
  description.textContent = achievement.unlocked
    ? achievement.description
    : `${achievement.description}${formatProgress(achievement.progress)}`;

  info.append(name, description);

  const xp = document.createElement('span');
  xp.className = 'achievement-xp';
  xp.textContent = `${achievement.unlocked ? '+' : ''}${achievement.xp} XP`;

  item.append(mark, info, xp);
  item.setAttribute(
    'aria-label',
    `${achievement.name}: ${achievement.unlocked ? 'freigeschaltet' : 'offen'}`
  );

  return item;
}

/** " (3 / 5 Läufe)" für noch offene Achievements mit Zähler. */
function formatProgress(progress) {
  if (!progress) return '';
  const current = numberFormat.format(Math.min(progress.current, progress.target));
  return ` (${current} / ${numberFormat.format(progress.target)} ${progress.unit})`;
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

  if (run.id === pendingDeleteId) return fillDeleteConfirm(item, run);

  const info = document.createElement('div');

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
}

/* ----------------------------------------------------------------- Utils */

function todayIso() {
  return toIsoDate(new Date());
}

/** Date -> "YYYY-MM-DD" in lokaler Zeit (nicht UTC). */
function toIsoDate(date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Date -> "HH:MM" in lokaler Zeit. */
function toTimeOfDay(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return dateFormat.format(new Date(year, month - 1, day));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .catch((err) => console.warn('Service Worker nicht registriert:', err));
  });
}
