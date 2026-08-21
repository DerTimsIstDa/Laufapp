import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createWakeLock } from '../js/wake-lock.js';

/**
 * Bildschirm wach halten.
 *
 * Das Modul fasst zwei Browser-Dinge an, die es in Node nicht gibt:
 * `navigator.wakeLock` und `document`. Beide werden hier durch Attrappen
 * ersetzt. Geprüft wird vor allem das, was auf dem Gerät schiefgeht –
 * fehlende Unterstützung, ein abgelehnter Lock, die Rückkehr in den Tab.
 */

const vorherNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const vorherDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

afterEach(() => {
  setzeZurueck('navigator', vorherNavigator);
  setzeZurueck('document', vorherDocument);
});

function setzeZurueck(name, beschreibung) {
  if (beschreibung) Object.defineProperty(globalThis, name, beschreibung);
  else delete globalThis[name];
}

function setze(name, wert) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: wert });
}

/**
 * navigator.wakeLock-Attrappe.
 *
 * @param {{ ablehnen?: boolean, releaseWirft?: boolean }} [optionen]
 */
function fakeNavigator({ ablehnen = false, releaseWirft = false } = {}) {
  const angefordert = [];
  const freigegeben = [];

  setze('navigator', {
    wakeLock: {
      request(typ) {
        angefordert.push(typ);
        if (ablehnen) return Promise.reject(new Error('Akkusparmodus'));

        const lock = {
          nummer: angefordert.length,
          release() {
            freigegeben.push(lock.nummer);
            return releaseWirft ? Promise.reject(new Error('schon weg')) : Promise.resolve();
          },
        };
        return Promise.resolve(lock);
      },
    },
  });

  return { angefordert, freigegeben };
}

/** document-Attrappe, die den visibilitychange auslösen kann. */
function fakeDocument() {
  const hoerer = [];

  setze('document', {
    visibilityState: 'visible',
    addEventListener: (typ, fn) => hoerer.push([typ, fn]),
  });

  return {
    /** Löst den Wechsel aus und wartet die offenen Zusagen ab. */
    async wechsleZu(zustand) {
      globalThis.document.visibilityState = zustand;
      for (const [typ, fn] of hoerer) if (typ === 'visibilitychange') fn();
      await Promise.resolve();
      await Promise.resolve();
    },
    hoererTypen: () => hoerer.map(([typ]) => typ),
  };
}

describe('Anfordern und Freigeben', () => {
  test('fordert einen Bildschirm-Lock an', async () => {
    const nav = fakeNavigator();
    fakeDocument();

    const lock = createWakeLock(() => true);
    await lock.request();

    assert.deepEqual(nav.angefordert, ['screen']);
  });

  test('gibt ihn wieder frei', async () => {
    const nav = fakeNavigator();
    fakeDocument();

    const lock = createWakeLock(() => true);
    await lock.request();
    lock.release();

    assert.deepEqual(nav.freigegeben, [1]);
  });

  test('zweimal freigeben gibt nur einmal frei', async () => {
    // Nach dem ersten Mal ist nichts mehr da – ein zweiter Aufruf darf nicht
    // auf einem alten Lock landen.
    const nav = fakeNavigator();
    fakeDocument();

    const lock = createWakeLock(() => true);
    await lock.request();
    lock.release();
    lock.release();

    assert.deepEqual(nav.freigegeben, [1]);
  });

  test('freigeben ohne Anfordern tut nichts', async () => {
    const nav = fakeNavigator();
    fakeDocument();

    const lock = createWakeLock(() => true);

    assert.doesNotThrow(() => lock.release());
    assert.deepEqual(nav.freigegeben, []);
  });
});

describe('Was auf echten Geräten schiefgeht', () => {
  test('ohne Unterstützung passiert nichts, aber es fliegt auch nichts', async () => {
    // Das ist der Normalfall auf dem Desktop-Safari und in jedem älteren
    // Browser: die Aufzeichnung muss trotzdem laufen.
    setze('navigator', {});
    fakeDocument();

    const lock = createWakeLock(() => true);

    await assert.doesNotReject(() => lock.request());
    assert.doesNotThrow(() => lock.release());
  });

  test('ganz ohne navigator läuft es auch', async () => {
    setzeZurueck('navigator', undefined);
    fakeDocument();

    const lock = createWakeLock(() => true);

    await assert.doesNotReject(() => lock.request());
  });

  test('ein abgelehnter Lock reisst niemanden mit', async () => {
    // Im Akkusparmodus gibt das Betriebssystem den Lock schlicht nicht her.
    fakeNavigator({ ablehnen: true });
    fakeDocument();

    const lock = createWakeLock(() => true);

    await assert.doesNotReject(() => lock.request());
    assert.doesNotThrow(() => lock.release(), 'und danach ist nichts freizugeben');
  });

  test('ein Fehler beim Freigeben bleibt liegen, wo er hingehört', async () => {
    // Der Lock ist ohnehin weg; ein unbehandelter Reject wäre das Einzige,
    // was daraus noch Schaden anrichten könnte.
    fakeNavigator({ releaseWirft: true });
    fakeDocument();

    const lock = createWakeLock(() => true);
    await lock.request();

    assert.doesNotThrow(() => lock.release());
    await Promise.resolve();
  });

  test('ohne document wird kein Hörer angemeldet', async () => {
    // Node hat keins – und der Server-Import darf daran nicht scheitern.
    fakeNavigator();
    setzeZurueck('document', undefined);

    assert.doesNotThrow(() => createWakeLock(() => true));
  });
});

describe('Rückkehr in den Tab', () => {
  test('meldet sich beim Sichtbarkeitswechsel an', () => {
    fakeNavigator();
    const doc = fakeDocument();

    createWakeLock(() => true);

    assert.deepEqual(doc.hoererTypen(), ['visibilitychange']);
  });

  test('holt den Lock zurück, wenn noch aufgezeichnet wird', async () => {
    // Beim Wegschalten nimmt der Browser den Lock weg; ohne dieses Nachfassen
    // ginge der Bildschirm mitten im Lauf wieder aus.
    const nav = fakeNavigator();
    const doc = fakeDocument();

    createWakeLock(() => true);
    await doc.wechsleZu('hidden');
    await doc.wechsleZu('visible');

    assert.deepEqual(nav.angefordert, ['screen']);
  });

  test('holt ihn nicht zurück, wenn die Aufzeichnung vorbei ist', async () => {
    const nav = fakeNavigator();
    const doc = fakeDocument();

    createWakeLock(() => false);
    await doc.wechsleZu('visible');

    assert.deepEqual(nav.angefordert, []);
  });

  test('das Wegschalten selbst fordert nichts an', async () => {
    const nav = fakeNavigator();
    const doc = fakeDocument();

    createWakeLock(() => true);
    await doc.wechsleZu('hidden');

    assert.deepEqual(nav.angefordert, []);
  });
});
