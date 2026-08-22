/**
 * Hülle rund um die App: Installationshinweis und Aktualisierung.
 *
 * Pur und ohne DOM. Alles, was der Browser beisteuert – matchMedia, Speicher,
 * Cache-Namen, Service-Worker-Registrierungen – kommt als Parameter herein.
 * Dadurch lässt sich hier alles mit Attrappen prüfen.
 */

/**
 * Bleibt beim alten Namen. Der Schlüssel steht schon im localStorage der
 * installierten App – umbenannt käme der Installationshinweis noch einmal.
 */
export const INSTALL_HINT_KEY = 'laufapp.installHint.dismissed';

export const CACHE_PREFIX = 'funrun-';

/**
 * Die App hiess bis Version 25 "Laufapp". Ohne dieses Präfix bliebe der alte
 * Cache nach der Umbenennung für immer liegen: das Aufräumen erkennt nur, was
 * es als eigenes erkennt.
 */
export const LEGACY_CACHE_PREFIXES = ['laufapp-'];

const OWN_PREFIXES = [CACHE_PREFIX, ...LEGACY_CACHE_PREFIXES];

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

/**
 * Ob der Installationshinweis gezeigt wird.
 *
 * Vier Bedingungen, und drei davon kamen mit D2 dazu:
 *
 * - `standalone` – in der installierten App waere der Hinweis sinnlos.
 * - `dismissed` – einmal weggeklickt bleibt weggeklickt.
 * - `updateReady` – **der Update-Hinweis sticht.** Beide zusammen sind
 *   160 px auf einem 844-px-Schirm, und sie standen ueber allen fuenf Tabs.
 *   Wenn einer weichen muss, dann dieser: der andere ist der einzige Weg,
 *   eine haengende alte Fassung loszuwerden, waehrend dieser hier nur ein
 *   Vorschlag ist, der morgen genauso gilt.
 * - `view` – nur im Start-Tab. Ein Vorschlag zur Installation gehoert an den
 *   Anfang, nicht ueber die Trophaeenliste, die man gerade durchsieht.
 *
 * @param {{ standalone: boolean, dismissed: boolean, updateReady?: boolean, view?: string }} zustand
 */
export function shouldShowInstallHint({ standalone, dismissed, updateReady = false, view = INSTALL_HINT_VIEW }) {
  return !standalone && !dismissed && !updateReady && view === INSTALL_HINT_VIEW;
}

/** Der einzige Bereich, in dem der Installationshinweis erscheint. */
export const INSTALL_HINT_VIEW = 'start';

/**
 * Filtert die eigenen Caches heraus.
 *
 * Wichtig auf github.io: dort teilen sich alle Projekte eines Kontos denselben
 * Origin. Ein pauschales Leeren würde fremden Seiten den Cache wegräumen.
 */
export function ownCacheNames(names) {
  return (names ?? []).filter(
    (name) =>
      typeof name === 'string' && OWN_PREFIXES.some((prefix) => name.startsWith(prefix))
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
