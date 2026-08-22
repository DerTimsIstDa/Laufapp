/**
 * Trainingsplan: das Formular fuer eine Einheit und die Liste der Einheiten.
 *
 * Herausgeloest aus `app.js` (B1). Die Rechnung steht weiterhin in
 * `../training.js` – diese Datei zeigt nur an und nimmt entgegen.
 *
 * Den gemeinsamen Zustand (die Laeufe, die Einheiten, das zentrale Neuzeichnen)
 * besitzt weiterhin `app.js`. Er wird nicht importiert, sondern einmal beim
 * Start uebergeben: ein Import waere eine Kopie des Wertes zum Ladezeitpunkt,
 * und die Einheiten aendern sich danach noch. Ueber die Zugriffsfunktionen
 * sieht diese Datei immer den aktuellen Stand.
 */

import { el, createIcon } from './dom.js';
import { numberFormat, formatDate, todayIso, round } from '../format.js';
import { firstErrorMessage } from '../validation.js';
import { addSession, updateSession, removeSession } from '../storage.js';
import {
  SESSION_TYPES,
  SEGMENT_KINDS,
  XP_PER_SESSION,
  MAX_SEGMENTS,
  validateSession,
  matchPlan,
  buildPlanStats,
  describeSession,
  intervalTotalSeconds,
  clock,
  typeLabel,
  isRestType,
  isIntervalType,
  validateInterval,
  plannedInAdvance,
  DEFAULT_INTERVAL,
} from '../training.js';

/**
 * Beschriftung der Plan-Zustaende aus matchPlan().
 *
 * Steht hier und nicht in `../training.js`: das ist Anzeigetext, und
 * `training.js` weiss nichts davon, wie seine Zustaende heissen sollen.
 * Der Start-Bereich in `app.js` braucht sie ebenfalls und holt sie von hier.
 */
export const STATUS_TEXT = {
  geplant: 'Geplant',
  erfuellt: 'Eingehalten',
  teilweise: 'Angefangen',
  verpasst: 'Verpasst',
};

/**
 * Die Verbindung zu `app.js`. Wird in init() gesetzt, bevor irgendetwas
 * gezeichnet wird – vorher aufgerufen zu werden ist ein Programmierfehler
 * und soll dann auch laut scheitern, statt still nichts zu tun.
 * @type {{ getRuns: () => any[], getSessions: () => any[], setSessions: (neue: any[]) => void, render: (optionen: { announceUnlocks: boolean }) => void }}
 */
let app = null;

/** Einmal beim Start: den gemeinsamen Zustand hereinreichen. */
export function connectTrainingView(verdrahtung) {
  app = verdrahtung;
}

/** id der Einheit, die gerade im Formular liegt – null heißt "neu anlegen". */
let editingSessionId = null;

/**
 * Abschnitte im Formular, noch ungeprüft und als Rohtext.
 * Eigener Zustand, weil sie erst beim Speichern eine Einheit ergeben.
 */
let sessionDraft = [];

/** id der Einheit, für die gerade die Löschrückfrage offen ist. */
let pendingSessionDeleteId = null;

export function setupSessionForm() {
  el.sessionXpHint.textContent = XP_PER_SESSION;

  el.sessionType.replaceChildren(
    ...SESSION_TYPES.map((type) => {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = type.label;
      return option;
    })
  );

  el.sessionForm.addEventListener('submit', handleSessionSubmit);
  el.sessionCancel.addEventListener('click', stopEditingSession);
  el.sessionAddSegment.addEventListener('click', () => addDraftSegment());
  el.sessionType.addEventListener('change', renderSessionTypeHint);
  for (const feld of [el.sessionWork, el.sessionRest, el.sessionRepeats]) {
    feld.addEventListener('input', renderIntervalTotal);
  }
  el.sessionSegments.addEventListener('click', handleSegmentClick);
  el.planList.addEventListener('click', handlePlanClick);

  resetSessionForm();
}

/** Formular auf "neue Einheit" zurücksetzen. */
export function resetSessionForm() {
  editingSessionId = null;
  sessionDraft = [];

  el.sessionForm.reset();
  el.sessionDate.value = todayIso();
  el.sessionType.value = SESSION_TYPES[0].id;
  el.sessionSubmit.textContent = 'Einheit speichern';
  el.sessionCancel.hidden = true;
  el.sessionError.hidden = true;

  fillIntervalForm();
  renderSessionTypeHint();
  renderDraftSegments();
}

function stopEditingSession() {
  resetSessionForm();
  renderTraining();
}

/**
 * Was zur Art der Einheit passt, wird gezeigt – der Rest verschwindet.
 *
 * Ein Ruhetag hat weder Abschnitte noch Intervalle. Intervalle haben ihre
 * eigenen drei Werte statt der generischen Abschnitte: beides nebeneinander
 * hiesse, dieselbe Einheit zweimal zu beschreiben.
 */
function renderSessionTypeHint() {
  const gewaehlt = el.sessionType.value;
  const type = SESSION_TYPES.find((entry) => entry.id === gewaehlt);

  el.sessionTypeHint.textContent = type?.hint ?? '';
  el.sessionIntervalBox.hidden = !isIntervalType(gewaehlt);
  el.sessionSegmentsBox.hidden = isRestType(gewaehlt) || isIntervalType(gewaehlt);

  renderIntervalTotal();
}

/** Was die Vorgabe insgesamt dauert – direkt beim Tippen. */
function renderIntervalTotal() {
  if (el.sessionIntervalBox.hidden) return;

  const geprueft = validateInterval(readIntervalForm());

  el.sessionIntervalTotal.textContent = geprueft.ok
    ? `Macht ${clock(intervalTotalSeconds(geprueft.interval))} insgesamt.`
    : 'Belastung, Pause und Wiederholungen ausfüllen.';
}

function readIntervalForm() {
  return {
    workSeconds: el.sessionWork.value,
    restSeconds: el.sessionRest.value,
    repeats: el.sessionRepeats.value,
  };
}

function fillIntervalForm(interval = DEFAULT_INTERVAL) {
  el.sessionWork.value = clock(interval.workSeconds);
  el.sessionRest.value = clock(interval.restSeconds);
  el.sessionRepeats.value = String(interval.repeats);
}

function addDraftSegment(segment = { kind: 'main', repeats: '1', distanceKm: '', durationMinutes: '' }) {
  if (sessionDraft.length >= MAX_SEGMENTS) {
    return showSessionError(`Mehr als ${MAX_SEGMENTS} Abschnitte sind zu viel für eine Einheit.`);
  }

  sessionDraft.push({ ...segment });
  renderDraftSegments();
}

function handleSegmentClick(event) {
  const remove = event.target.closest('[data-remove-segment]');
  if (!remove) return;

  sessionDraft.splice(Number(remove.dataset.removeSegment), 1);
  renderDraftSegments();
}

function renderDraftSegments() {
  el.sessionSegmentsEmpty.hidden = sessionDraft.length > 0;
  el.sessionSegments.replaceChildren(...sessionDraft.map(createSegmentRow));
}

/**
 * Eine Zeile im Abschnitts-Editor.
 *
 * Die Eingaben schreiben direkt in `sessionDraft` zurück, statt die Liste beim
 * Tippen neu aufzubauen – sonst verlöre das Feld bei jedem Zeichen den Fokus.
 */
function createSegmentRow(segment, index) {
  const zeile = document.createElement('li');
  zeile.className = 'segment';

  const art = document.createElement('select');
  art.className = 'segment-kind';
  art.setAttribute('aria-label', `Abschnitt ${index + 1}: Art`);
  art.replaceChildren(
    ...SEGMENT_KINDS.map((kind) => {
      const option = document.createElement('option');
      option.value = kind.id;
      option.textContent = kind.label;
      return option;
    })
  );
  art.value = segment.kind;
  art.addEventListener('change', () => {
    segment.kind = art.value;
  });

  const wiederholungen = createSegmentInput(segment, 'repeats', {
    label: `Abschnitt ${index + 1}: Wiederholungen`,
    area: 'repeats',
    placeholder: '1',
    suffix: '×',
  });

  const distanz = createSegmentInput(segment, 'distanceKm', {
    label: `Abschnitt ${index + 1}: Distanz in Kilometern`,
    area: 'distance',
    placeholder: '0,4',
    suffix: 'km',
  });

  const dauer = createSegmentInput(segment, 'durationMinutes', {
    label: `Abschnitt ${index + 1}: Dauer in Minuten`,
    area: 'duration',
    placeholder: '3',
    suffix: 'min',
  });

  const entfernen = document.createElement('button');
  entfernen.type = 'button';
  entfernen.className = 'icon-button segment-remove';
  entfernen.dataset.removeSegment = index;
  entfernen.textContent = '×';
  entfernen.setAttribute('aria-label', `Abschnitt ${index + 1} entfernen`);

  zeile.append(art, wiederholungen, distanz, dauer, entfernen);
  return zeile;
}

function createSegmentInput(segment, field, { label, area, placeholder, suffix }) {
  const huelle = document.createElement('span');
  huelle.className = `segment-input segment-${area}`;

  const feld = document.createElement('input');
  // type="text" wie im Lauf-Formular: type="number" verwirft "0,4" beim Tippen.
  // Die Prüfung macht validateSession(), nicht der Browser.
  feld.type = 'text';
  feld.inputMode = 'decimal';
  feld.placeholder = placeholder;
  feld.autocomplete = 'off';
  feld.value = segment[field] ?? '';
  feld.setAttribute('aria-label', label);
  feld.addEventListener('input', () => {
    segment[field] = feld.value;
  });

  const einheit = document.createElement('span');
  einheit.className = 'segment-unit muted';
  einheit.textContent = suffix;

  huelle.append(feld, einheit);
  return huelle;
}

function handleSessionSubmit(event) {
  event.preventDefault();

  const art = el.sessionType.value;
  const eingabe = {
    date: el.sessionDate.value,
    type: art,
    segments: isRestType(art) || isIntervalType(art) ? [] : sessionDraft,
    note: el.sessionNote.value,
  };

  // Im Formular ist die Vorgabe Pflicht – eine Intervall-Einheit ohne Werte
  // liesse sich später nicht starten. Beim Import bleibt sie freiwillig,
  // damit ältere Sicherungen nichts verlieren.
  if (isIntervalType(art)) {
    const vorgabe = validateInterval(readIntervalForm());
    if (!vorgabe.ok) return showSessionError(firstErrorMessage(vorgabe));
    eingabe.interval = vorgabe.interval;
  }

  const geprueft = validateSession(eingabe);
  if (!geprueft.ok) return showSessionError(firstErrorMessage(geprueft));

  if (editingSessionId === null) {
    app.setSessions(addSession(app.getSessions(), geprueft.session));
  } else {
    app.setSessions(updateSession(app.getSessions(), editingSessionId, geprueft.session));
  }

  resetSessionForm();
  app.render({ announceUnlocks: true });
}

function startEditingSession(id) {
  const session = app.getSessions().find((entry) => entry.id === id);
  if (!session) return;

  editingSessionId = id;
  pendingSessionDeleteId = null;

  el.sessionDate.value = session.date;
  el.sessionType.value = session.type;
  el.sessionNote.value = session.note ?? '';
  el.sessionError.hidden = true;
  fillIntervalForm(session.interval ?? DEFAULT_INTERVAL);

  // Zahlen als Text ins Formular: die Felder arbeiten mit Rohwerten, geprüft
  // wird erst beim Speichern.
  sessionDraft = (session.segments ?? []).map((segment) => ({
    kind: segment.kind,
    repeats: String(segment.repeats ?? 1),
    distanceKm: segment.distanceKm === undefined ? '' : String(segment.distanceKm),
    durationMinutes: segment.durationMinutes === undefined ? '' : String(segment.durationMinutes),
  }));

  el.sessionSubmit.textContent = 'Änderung speichern';
  el.sessionCancel.hidden = false;

  renderSessionTypeHint();
  renderDraftSegments();
  renderTraining();

  el.sessionForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handlePlanClick(event) {
  const edit = event.target.closest('[data-edit-session]');
  if (edit) return startEditingSession(edit.dataset.editSession);

  const ask = event.target.closest('[data-ask-delete-session]');
  if (ask) {
    pendingSessionDeleteId = ask.dataset.askDeleteSession;
    return renderTraining();
  }

  const cancel = event.target.closest('[data-cancel-delete-session]');
  if (cancel) {
    pendingSessionDeleteId = null;
    return renderTraining();
  }

  const confirm = event.target.closest('[data-confirm-delete-session]');
  if (!confirm) return;

  const id = confirm.dataset.confirmDeleteSession;
  pendingSessionDeleteId = null;
  if (editingSessionId === id) resetSessionForm();

  app.setSessions(removeSession(app.getSessions(), id));
  app.render({ announceUnlocks: false });
}

function showSessionError(message) {
  el.sessionError.textContent = message;
  el.sessionError.hidden = false;
}

export function renderTraining() {
  const eintraege = matchPlan(app.getSessions(), app.getRuns(), { today: todayIso() });
  const kennzahlen = buildPlanStats(app.getSessions(), app.getRuns(), { today: todayIso() });

  el.planEmpty.hidden = eintraege.length > 0;
  el.planBody.hidden = eintraege.length === 0;
  if (eintraege.length === 0) return;

  el.planFulfilled.textContent = kennzahlen.fulfilled;
  el.planDecided.textContent = kennzahlen.decided;
  el.planAdherence.textContent =
    kennzahlen.decided === 0 ? '–' : `${Math.round(kennzahlen.adherencePercent)} %`;
  el.planOpen.textContent = kennzahlen.open;
  el.planXp.textContent = numberFormat.format(kennzahlen.xp);

  el.planList.replaceChildren(...eintraege.map(createPlanItem));
}

function createPlanItem({ session, run, status, targetKm, xp }) {
  const item = document.createElement('li');
  item.className = `plan-item ${status}`;
  if (session.id === editingSessionId) item.classList.add('editing');

  if (session.id === pendingSessionDeleteId) return fillSessionDeleteConfirm(item, session);

  const kopf = document.createElement('div');
  kopf.className = 'plan-head';

  const datum = document.createElement('span');
  datum.className = 'plan-date';
  datum.textContent = formatDate(session.date);

  const art = document.createElement('span');
  art.className = 'plan-type';
  art.textContent = typeLabel(session.type);

  const marke = document.createElement('span');
  marke.className = 'plan-status';
  marke.textContent = STATUS_TEXT[status] ?? status;

  kopf.append(datum, art, marke);

  const beschreibung = document.createElement('p');
  beschreibung.className = 'plan-description muted';
  beschreibung.textContent = describeSession(session);

  item.append(kopf, beschreibung);

  if (session.note) {
    const notiz = document.createElement('p');
    notiz.className = 'plan-note muted';
    notiz.textContent = session.note;
    item.append(notiz);
  }

  const fuss = document.createElement('div');
  fuss.className = 'plan-foot';

  const bilanz = document.createElement('span');
  bilanz.className = 'plan-result muted';
  bilanz.textContent = planResultText({ run, status, targetKm, session, xp });
  fuss.append(bilanz);

  const bearbeiten = document.createElement('button');
  bearbeiten.type = 'button';
  bearbeiten.className = 'icon-button';
  bearbeiten.dataset.editSession = session.id;
  bearbeiten.append(createIcon('icon-pencil'));
  bearbeiten.setAttribute('aria-label', `Einheit vom ${formatDate(session.date)} bearbeiten`);

  const entfernen = document.createElement('button');
  entfernen.type = 'button';
  entfernen.className = 'icon-button';
  entfernen.dataset.askDeleteSession = session.id;
  entfernen.textContent = '×';
  entfernen.setAttribute('aria-label', `Einheit vom ${formatDate(session.date)} löschen`);

  fuss.append(bearbeiten, entfernen);
  item.append(fuss);

  return item;
}

/** Was aus der Einheit geworden ist – und warum es dafür XP gab oder nicht. */
function planResultText({ run, status, targetKm, session, xp }) {
  if (status === 'geplant') {
    return targetKm > 0 ? `Ziel: ${numberFormat.format(round(targetKm))} km` : 'Noch offen';
  }

  if (isRestType(session.type)) {
    return status === 'erfuellt' ? 'Pause eingehalten' : 'An diesem Tag wurde gelaufen';
  }

  if (status === 'verpasst') return 'Kein Lauf an diesem Tag';

  const gelaufen = `${numberFormat.format(run.distanceKm)} km gelaufen`;
  if (status === 'teilweise') {
    return `${gelaufen} – zu wenig für das Ziel von ${numberFormat.format(round(targetKm))} km`;
  }

  // Nachträglich eingetragene Einheiten erfüllen sich selbst; ohne diesen
  // Hinweis wirkt die fehlende Belohnung wie ein Fehler.
  if (xp === 0 && !plannedInAdvance(session)) {
    return `${gelaufen} – nachträglich geplant, deshalb keine Bonus-XP`;
  }

  return `${gelaufen} · +${numberFormat.format(xp)} XP`;
}

function fillSessionDeleteConfirm(item, session) {
  item.classList.add('confirming');

  const frage = document.createElement('span');
  frage.className = 'plan-question';
  frage.textContent = `${typeLabel(session.type)} am ${formatDate(session.date)} wirklich löschen?`;

  const loeschen = document.createElement('button');
  loeschen.type = 'button';
  loeschen.className = 'small danger';
  loeschen.dataset.confirmDeleteSession = session.id;
  loeschen.textContent = 'Löschen';

  const abbrechen = document.createElement('button');
  abbrechen.type = 'button';
  abbrechen.className = 'small secondary';
  abbrechen.dataset.cancelDeleteSession = '';
  abbrechen.textContent = 'Abbrechen';

  item.append(frage, loeschen, abbrechen);
  return item;
}
