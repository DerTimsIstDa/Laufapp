/**
 * Ablauf eines Intervall-Trainings.
 *
 * Pur und ohne DOM: Aus der Vorgabe und der verstrichenen Zeit ergibt sich,
 * welche Phase gerade läuft, wie lange sie noch dauert und was danach kommt.
 * Kein Timer, kein Zustand – wer die Uhr stellt, ist app.js.
 *
 * Der Ablauf ist Belastung, Pause, Belastung, Pause … und endet nach der
 * letzten Pause. Die zählt mit: die Gesamtdauer eines Trainings ist die Summe
 * aller Phasen, und wer acht Runden plant, hat acht Pausen eingeplant.
 */

/** @typedef {import('./training.js').Interval} Interval */

export const WORK = 'work';
export const REST = 'rest';

/** Beschriftungen der Phasen – dieselben Wörter wie im Referenzbild. */
export const PHASE_LABEL = {
  [WORK]: 'Intervall',
  [REST]: 'Pause',
};

/**
 * @typedef {Object} PhaseState
 * @property {'work'|'rest'} kind        laufende Phase
 * @property {number} repeat             laufende Wiederholung, ab 1
 * @property {number} repeats            Wiederholungen insgesamt
 * @property {number} phaseSeconds       Dauer der laufenden Phase
 * @property {number} remainingSeconds   Rest der laufenden Phase, aufgerundet
 * @property {number} phaseProgress      0..1, Anteil der Phase, der um ist
 * @property {?('work'|'rest')} nextKind null, wenn nichts mehr kommt
 * @property {number} nextSeconds        0, wenn nichts mehr kommt
 * @property {boolean} done              die Vorgabe ist abgearbeitet
 * @property {number} completedRepeats   vollständig durchlaufene Runden
 *
 * @param {Interval} interval
 * @param {number} elapsedMs verstrichene Zeit seit dem Start, ohne Pausen
 * @returns {PhaseState}
 */
export function phaseAt(interval, elapsedMs) {
  const { workSeconds, restSeconds, repeats } = interval;
  const zyklus = workSeconds + restSeconds;
  const gesamt = zyklus * repeats;

  const verstrichen = Math.min(Math.max(0, elapsedMs / 1000), gesamt);

  if (verstrichen >= gesamt) {
    return {
      kind: REST,
      repeat: repeats,
      repeats,
      phaseSeconds: restSeconds,
      remainingSeconds: 0,
      phaseProgress: 1,
      nextKind: null,
      nextSeconds: 0,
      done: true,
      completedRepeats: repeats,
    };
  }

  const runde = Math.floor(verstrichen / zyklus);
  const imZyklus = verstrichen - runde * zyklus;
  const inBelastung = imZyklus < workSeconds;

  const phaseSeconds = inBelastung ? workSeconds : restSeconds;
  const imPhase = inBelastung ? imZyklus : imZyklus - workSeconds;
  const letzteRunde = runde + 1 >= repeats;

  return {
    kind: inBelastung ? WORK : REST,
    repeat: runde + 1,
    repeats,
    phaseSeconds,
    // Aufgerundet: solange auch nur eine Zehntelsekunde übrig ist, steht dort
    // noch eine 1 und nicht schon die 0.
    remainingSeconds: Math.ceil(phaseSeconds - imPhase),
    phaseProgress: phaseSeconds === 0 ? 1 : imPhase / phaseSeconds,
    nextKind: inBelastung ? REST : letzteRunde ? null : WORK,
    nextSeconds: inBelastung ? restSeconds : letzteRunde ? 0 : workSeconds,
    done: false,
    completedRepeats: runde,
  };
}

/**
 * Zusammenfassung nach dem Ende oder nach einem Abbruch.
 *
 * Angebrochene Runden zählen nicht mit: wer bei Runde sechs von acht aufhört,
 * hat fünf geschafft und nicht sechs. Die Zeit dagegen zählt so, wie sie
 * gelaufen wurde.
 *
 * @param {Interval} interval
 * @param {number} elapsedMs
 * @returns {{ completedRepeats: number, elapsedSeconds: number, finished: boolean }}
 */
export function summarize(interval, elapsedMs) {
  const stand = phaseAt(interval, elapsedMs);
  const gesamt = (interval.workSeconds + interval.restSeconds) * interval.repeats;

  return {
    completedRepeats: stand.completedRepeats,
    elapsedSeconds: Math.min(Math.max(0, Math.round(elapsedMs / 1000)), gesamt),
    finished: stand.done,
  };
}
