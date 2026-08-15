import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isStandalone,
  wasInstallHintDismissed,
  rememberInstallHintDismissed,
  shouldShowInstallHint,
  ownCacheNames,
  ownRegistrations,
  INSTALL_HINT_KEY,
  CACHE_PREFIX,
  LEGACY_CACHE_PREFIXES,
} from '../js/pwa.js';

/** window-Attrappe: `modes` sind die Anzeigemodi, die als zutreffend gelten. */
const fakeWindow = (modes = [], navigatorProps = {}) => ({
  matchMedia: (query) => ({ matches: modes.some((m) => query.includes(m)) }),
  navigator: navigatorProps,
});

/** localStorage-Attrappe; `broken` wirft bei jedem Zugriff. */
const fakeStorage = ({ initial = {}, broken = false } = {}) => {
  const data = { ...initial };
  return {
    getItem(key) {
      if (broken) throw new Error('Speicher gesperrt');
      return key in data ? data[key] : null;
    },
    setItem(key, value) {
      if (broken) throw new Error('Speicher gesperrt');
      data[key] = String(value);
    },
    inhalt: () => data,
  };
};

describe('isStandalone', () => {
  test('im Browser-Tab: nein', () => {
    assert.equal(isStandalone(fakeWindow([])), false);
  });

  test('als installierte App: ja', () => {
    assert.equal(isStandalone(fakeWindow(['standalone'])), true);
  });

  test('auch Vollbild und minimal-ui gelten als installiert', () => {
    assert.equal(isStandalone(fakeWindow(['fullscreen'])), true);
    assert.equal(isStandalone(fakeWindow(['minimal-ui'])), true);
  });

  test('iOS meldet es über navigator.standalone', () => {
    assert.equal(isStandalone(fakeWindow([], { standalone: true })), true);
    assert.equal(isStandalone(fakeWindow([], { standalone: false })), false);
  });

  test('fehlendes oder unvollständiges window kippt nicht', () => {
    assert.equal(isStandalone(undefined), false);
    assert.equal(isStandalone({}), false);
    assert.equal(isStandalone({ navigator: {} }), false);
  });
});

describe('Hinweis merken', () => {
  test('frischer Speicher: noch nicht weggeklickt', () => {
    assert.equal(wasInstallHintDismissed(fakeStorage()), false);
  });

  test('nach dem Merken bleibt es gemerkt', () => {
    const storage = fakeStorage();

    assert.equal(rememberInstallHintDismissed(storage), true);
    assert.equal(storage.inhalt()[INSTALL_HINT_KEY], '1');
    assert.equal(wasInstallHintDismissed(storage), true);
  });

  test('gesperrter Speicher wirft nicht, meldet aber ehrlich', () => {
    const storage = fakeStorage({ broken: true });

    assert.doesNotThrow(() => wasInstallHintDismissed(storage));
    assert.equal(wasInstallHintDismissed(storage), false);
    assert.equal(rememberInstallHintDismissed(storage), false, 'gemerkt wurde nichts');
  });

  test('ohne Speicher überhaupt', () => {
    assert.equal(wasInstallHintDismissed(null), false);
    assert.equal(rememberInstallHintDismissed(null), true, 'nichts zu tun, kein Fehler');
  });

  test('andere Werte im Speicher zählen nicht als weggeklickt', () => {
    assert.equal(wasInstallHintDismissed(fakeStorage({ initial: { [INSTALL_HINT_KEY]: '0' } })), false);
    assert.equal(wasInstallHintDismissed(fakeStorage({ initial: { [INSTALL_HINT_KEY]: 'ja' } })), false);
  });
});

describe('shouldShowInstallHint', () => {
  test('nur im Browser-Tab und nur einmal', () => {
    assert.equal(shouldShowInstallHint({ standalone: false, dismissed: false }), true);
    assert.equal(shouldShowInstallHint({ standalone: false, dismissed: true }), false);
    assert.equal(shouldShowInstallHint({ standalone: true, dismissed: false }), false);
    assert.equal(shouldShowInstallHint({ standalone: true, dismissed: true }), false);
  });
});

describe('ownCacheNames', () => {
  test('nimmt nur die eigenen Caches', () => {
    const alle = ['funrun-v26', 'funrun-v25', 'andere-app-v1', 'workbox-precache'];
    assert.deepEqual(ownCacheNames(alle), ['funrun-v26', 'funrun-v25']);
  });

  test('Caches aus der Zeit als Laufapp gelten weiter als eigene', () => {
    // Sonst bliebe der alte Cache nach der Umbenennung für immer liegen.
    assert.deepEqual(ownCacheNames(['funrun-v26', 'laufapp-v25']), [
      'funrun-v26',
      'laufapp-v25',
    ]);
  });

  test('fremde Projekte auf demselben Origin bleiben unangetastet', () => {
    // Auf github.io teilen sich alle Projekte eines Kontos die Domain.
    assert.deepEqual(ownCacheNames(['portfolio-v2', 'blog-assets']), []);
  });

  test('Präfix stimmt mit dem Service Worker überein', () => {
    assert.equal(CACHE_PREFIX, 'funrun-');
  });

  test('leere und kaputte Eingaben', () => {
    assert.deepEqual(ownCacheNames([]), []);
    assert.deepEqual(ownCacheNames(null), []);
    assert.deepEqual(ownCacheNames([null, 42, undefined, 'funrun-v1']), ['funrun-v1']);
  });
});

/**
 * Der Service Worker kann CACHE_PREFIX nicht importieren, ohne ein
 * Modul-Worker zu werden. Diese Tests wachen deshalb über die Quelle – die
 * Regel lässt sich in Node nicht am Verhalten prüfen, sie muss aber halten.
 */
describe('Service Worker hält sich an dasselbe Präfix', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  test('benutzt dieselbe Konstante', () => {
    const treffer = /const CACHE_PREFIX = '([^']+)'/.exec(sw);
    assert.ok(treffer, 'CACHE_PREFIX steht nicht in sw.js');
    assert.equal(treffer[1], CACHE_PREFIX, 'Präfix läuft mit js/pwa.js auseinander');
  });

  test('die Cache-Version trägt das Präfix', () => {
    const treffer = /const CACHE_VERSION = `\$\{CACHE_PREFIX\}([^`]+)`/.exec(sw);
    assert.ok(treffer, 'CACHE_VERSION wird nicht aus dem Präfix gebildet');
    assert.match(treffer[1], /^v\d+$/, `unerwartete Version: ${treffer?.[1]}`);
  });

  test('räumt beim Aktivieren nur eigene Caches weg', () => {
    // Ohne diese Prüfung löscht der Service Worker auf einem geteilten Origin
    // fremden Projekten den Cache.
    assert.match(
      sw,
      /OWN_PREFIXES\.some\(\(prefix\) => key\.startsWith\(prefix\)\)\s*&&\s*key !== CACHE_VERSION/,
      'die Aufräumregel im activate-Handler filtert nicht nach Präfix'
    );
  });

  test('kennt dieselben Altpräfixe wie js/pwa.js', () => {
    // Läuft das auseinander, bleibt der Laufapp-Cache auf dem Gerät liegen.
    const treffer = /const LEGACY_CACHE_PREFIXES = \[([^\]]*)\]/.exec(sw);
    assert.ok(treffer, 'LEGACY_CACHE_PREFIXES steht nicht in sw.js');

    const imSw = [...treffer[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(imSw, LEGACY_CACHE_PREFIXES);
  });
});

describe('ownRegistrations', () => {
  const basis = 'https://dertimsistda.github.io/Laufapp/';

  test('nimmt nur Registrierungen im eigenen Verzeichnis', () => {
    const regs = [
      { scope: 'https://dertimsistda.github.io/Laufapp/' },
      { scope: 'https://dertimsistda.github.io/anderes-projekt/' },
      { scope: 'https://dertimsistda.github.io/' },
    ];

    assert.deepEqual(ownRegistrations(regs, basis), [regs[0]]);
  });

  test('Unterverzeichnisse zählen dazu', () => {
    const regs = [{ scope: 'https://dertimsistda.github.io/Laufapp/unterordner/' }];
    assert.equal(ownRegistrations(regs, basis).length, 1);
  });

  test('ohne Basis lieber nichts abmelden', () => {
    assert.deepEqual(ownRegistrations([{ scope: basis }], ''), []);
    assert.deepEqual(ownRegistrations([{ scope: basis }], undefined), []);
  });

  test('leere und kaputte Eingaben', () => {
    assert.deepEqual(ownRegistrations(null, basis), []);
    assert.deepEqual(ownRegistrations([null, {}, { scope: 42 }], basis), []);
  });
});
