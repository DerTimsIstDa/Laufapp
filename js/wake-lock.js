/**
 * Bildschirm wach halten, solange eine Aufzeichnung läuft.
 *
 * Beide Aufzeichnungsarten brauchen dasselbe: beim GPS-Tracking schläft sonst
 * die Ortung mit dem Bildschirm ein, bei der reinen Stoppuhr verliert man die
 * Zeit aus dem Blick. Deshalb liegt es hier und nicht zweimal daneben.
 *
 * Fehlschläge sind kein Grund abzubrechen – im Akkusparmodus gibt das
 * Betriebssystem den Lock einfach nicht her.
 */

/**
 * @param {() => boolean} isActive sagt, ob gerade aufgezeichnet wird
 * @returns {{ request: () => void, release: () => void }}
 */
export function createWakeLock(isActive) {
  let lock = null;

  async function request() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {
      lock = null;
    }
  }

  function release() {
    lock?.release().catch(() => {});
    lock = null;
  }

  // Nach dem Zurückschalten in den Tab ist der Lock weg.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isActive()) request();
    });
  }

  return { request, release };
}
