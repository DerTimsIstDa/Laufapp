/**
 * Tastensperre für die laufende Aufzeichnung.
 *
 * Pur und ohne DOM: die Zeit kommt als Parameter herein, nicht aus einer Uhr.
 * Dadurch lässt sich das Halten testen, ohne zwei Sekunden zu warten.
 *
 * Warum Halten und nicht Tippen: Eine Hosentasche erzeugt kurze, wandernde
 * Berührungen. Ein Druck, der zwei Sekunden am selben Punkt bleibt, kommt
 * dabei praktisch nicht vor.
 */

/** So lange muss gehalten werden, bis entsperrt ist. */
export const UNLOCK_HOLD_MS = 2000;

/**
 * Fortschritt des Haltens von 0 bis 1.
 *
 * @param {?number} startedAt Zeitpunkt des Aufsetzens, null wenn nicht gehalten
 * @param {number} now aktueller Zeitpunkt in derselben Zeitbasis
 */
export function holdProgress(startedAt, now, holdMs = UNLOCK_HOLD_MS) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  if (!(holdMs > 0)) return 1;

  return Math.min(1, Math.max(0, (now - startedAt) / holdMs));
}

/** Lange genug gehalten? */
export function isHoldComplete(startedAt, now, holdMs = UNLOCK_HOLD_MS) {
  return holdProgress(startedAt, now, holdMs) >= 1;
}

/**
 * Darf gesperrt werden? Nur während einer laufenden oder pausierten
 * Aufzeichnung – im Ruhezustand gibt es nichts zu schützen.
 */
export function canLock({ status, locked }) {
  return !locked && (status === 'tracking' || status === 'paused');
}

/**
 * Dürfen Pause, Beenden und Verwerfen bedient werden?
 * Im gesperrten Zustand nicht – die Aufzeichnung selbst läuft weiter.
 */
export function controlsEnabled({ status, locked }) {
  return status !== 'idle' && !locked;
}

/**
 * Eine Sperre ohne laufende Aufzeichnung ergibt keinen Sinn. Endet die
 * Aufzeichnung von aussen – etwa weil die Standortfreigabe entzogen wurde –
 * muss die Sperre mit fallen, sonst bliebe die Bedienung tot.
 */
export function shouldReleaseLock({ status, locked }) {
  return locked && status === 'idle';
}
