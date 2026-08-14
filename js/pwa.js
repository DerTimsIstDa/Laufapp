/**
 * Hülle rund um die App: Installationshinweis und Aktualisierung.
 *
 * Pur und ohne DOM. Alles, was der Browser beisteuert – matchMedia, Speicher,
 * Cache-Namen, Service-Worker-Registrierungen – kommt als Parameter herein.
 * Dadurch lässt sich hier alles mit Attrappen prüfen.
 */

export const INSTALL_HINT_KEY = 'laufapp.installHint.dismissed';
export const CACHE_PREFIX = 'laufapp-';

/** Anzeigemodi, die eine installierte App bedeuten. */
const INSTALLED_MODES = ['standalone', 'fullscreen', 'minimal-ui'];

/**
 * Läuft die App vom Startbildschirm statt in einem Browser-Tab?
 *
 * @param {{ matchMedia?: Function, navigator?: object }} win window-artiges Objekt
 */
export function isStandalone(win) {
  if (!win) return false;

  for (const mode of INSTALLED_MODES) {
    if (win.matchMedia?.(`(display-mode: ${mode})`)?.matches) return true;
  }

  // Safari auf iOS meldet den Anzeigemodus nicht zuverlässig, kennt dafür
  // dieses alte Flag.
  return win.navigator?.standalone === true;
}

/** Wurde der Hinweis schon weggeklickt? Ein gesperrter Speicher zählt als nein. */
export function wasInstallHintDismissed(storage) {
  try {
    return storage?.getItem(INSTALL_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** @returns {boolean} ob das Merken geklappt hat */
export function rememberInstallHintDismissed(storage) {
  try {
    storage?.setItem(INSTALL_HINT_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function shouldShowInstallHint({ standalone, dismissed }) {
  return !standalone && !dismissed;
}

/**
 * Filtert die eigenen Caches heraus.
 *
 * Wichtig auf github.io: dort teilen sich alle Projekte eines Kontos denselben
 * Origin. Ein pauschales Leeren würde fremden Seiten den Cache wegräumen.
 */
export function ownCacheNames(names) {
  return (names ?? []).filter(
    (name) => typeof name === 'string' && name.startsWith(CACHE_PREFIX)
  );
}

/**
 * Filtert die Service-Worker-Registrierungen des eigenen Verzeichnisses.
 * Gleicher Grund wie oben – ein Nachbarprojekt darf nicht mit abgemeldet
 * werden.
 */
export function ownRegistrations(registrations, baseUrl) {
  if (typeof baseUrl !== 'string' || baseUrl === '') return [];

  return (registrations ?? []).filter(
    (registration) =>
      typeof registration?.scope === 'string' && registration.scope.startsWith(baseUrl)
  );
}
