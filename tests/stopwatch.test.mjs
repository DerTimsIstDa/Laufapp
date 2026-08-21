import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createStopwatch } from '../js/stopwatch.js';

let stopwatch;
let updates;

beforeEach(() => {
  updates = [];
  stopwatch = createStopwatch({ onUpdate: (state) => updates.push(state) });
});

afterEach(() => {
  stopwatch.discard(); // stoppt den Takt, sonst hängt der Testlauf
});

/** Wartet echte Millisekunden – die Uhr liest Date.now(). */
function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Aufzeichnung ohne GPS', () => {
  test('fragt nie nach dem Standort', () => {
    // Kein navigator im Test: würde die Stoppuhr die Geolocation anfassen,
    // flöge hier ein ReferenceError.
    assert.equal(typeof globalThis.navigator?.geolocation, 'undefined');

    stopwatch.start();

    assert.equal(stopwatch.getState().status, 'tracking');
  });

  test('läuft immer – anders als das Tracking gibt es nichts, was fehlen kann', () => {
    assert.equal(stopwatch.isSupported(), true);
  });

  test('meldet sich als Aufzeichnung ohne GPS', () => {
    assert.equal(stopwatch.getState().gps, false);
  });

  test('Strecke bleibt bei null, die Zeit läuft', async () => {
    stopwatch.start();
    await warte(30);

    const state = stopwatch.getState();
    assert.equal(state.distanceKm, 0);
    assert.equal(state.pointCount, 0);
    assert.ok(state.elapsedMs >= 25, `Zeit lief nicht: ${state.elapsedMs}`);
  });

  test('zweimal Start ändert nichts', () => {
    stopwatch.start();
    const ersterBeginn = stopwatch.getState().startedAt;

    stopwatch.start();

    assert.equal(stopwatch.getState().startedAt, ersterBeginn);
  });
});

describe('Pause', () => {
  test('die Zeit steht still und läuft danach weiter', async () => {
    stopwatch.start();
    await warte(30);

    stopwatch.pause();
    const beiPause = stopwatch.getState().elapsedMs;
    assert.equal(stopwatch.getState().status, 'paused');

    await warte(30);
    assert.equal(stopwatch.getState().elapsedMs, beiPause, 'Pause hat mitgezählt');

    stopwatch.resume();
    await warte(30);

    assert.equal(stopwatch.getState().status, 'tracking');
    assert.ok(stopwatch.getState().elapsedMs > beiPause);
  });

  test('Pause im Leerlauf tut nichts', () => {
    stopwatch.pause();
    assert.equal(stopwatch.getState().status, 'idle');
  });

  test('zweimal Pause zählt die Zeit nicht doppelt', async () => {
    // Ein zweiter Druck auf denselben Knopf – der Abschnitt darf nicht ein
    // zweites Mal aufaddiert werden.
    stopwatch.start();
    await warte(30);

    stopwatch.pause();
    const erste = stopwatch.getState().elapsedMs;

    await warte(30);
    stopwatch.pause();

    assert.equal(stopwatch.getState().elapsedMs, erste);
    assert.equal(updates.filter((s) => s.status === 'paused').length, 1, 'nur eine Meldung');
  });

  test('Fortsetzen im Leerlauf tut nichts', () => {
    stopwatch.resume();

    assert.equal(stopwatch.getState().status, 'idle');
    assert.equal(stopwatch.getState().elapsedMs, 0);
    assert.deepEqual(updates, []);
  });

  test('Fortsetzen während der Aufzeichnung wirft die Zeit nicht weg', async () => {
    // Ein versehentliches resume() setzte sonst den Beginn des laufenden
    // Abschnitts neu – die bis dahin gelaufene Zeit wäre weg.
    stopwatch.start();
    await warte(40);

    const vorher = stopwatch.getState().elapsedMs;
    stopwatch.resume();

    assert.ok(stopwatch.getState().elapsedMs >= vorher);
  });
});

describe('Beenden', () => {
  test('liefert Zeit und Startzeitpunkt, aber keine Strecke', async () => {
    stopwatch.start();
    await warte(30);

    const summary = stopwatch.stop();

    assert.equal(summary.distanceKm, 0);
    assert.deepEqual(summary.track, []);
    assert.equal(summary.pointCount, 0);
    assert.ok(summary.startedAt instanceof Date);
    assert.ok(summary.durationMinutes >= 0);
    assert.equal(stopwatch.getState().status, 'idle');
  });

  test('die Dauer kommt auf eine Zehntelminute gerundet', async () => {
    // Das Formular danach erwartet Minuten mit einer Nachkommastelle; eine
    // krumme Zahl wie 0.4833333 stünde sonst im Feld.
    stopwatch.start();
    await warte(30);

    const summary = stopwatch.stop();

    assert.equal(summary.durationMinutes, Math.round(summary.durationMinutes * 10) / 10);
  });

  test('die pausierte Zeit zählt beim Beenden nicht mit', async () => {
    stopwatch.start();
    await warte(30);
    stopwatch.pause();

    const beiPause = stopwatch.getState().elapsedMs;
    await warte(60);
    const summary = stopwatch.stop();

    // Beendet wird aus der Pause heraus – die 60 ms Wartezeit dürfen nicht in
    // der Bilanz landen.
    assert.ok(summary.durationMinutes <= (beiPause + 5) / 60_000);
  });

  test('Beenden im Leerlauf liefert nichts', () => {
    assert.equal(stopwatch.stop(), null);
  });

  test('Verwerfen setzt zurück, ohne ein Ergebnis zu liefern', async () => {
    stopwatch.start();
    await warte(20);

    stopwatch.discard();

    assert.equal(stopwatch.getState().status, 'idle');
    assert.equal(stopwatch.getState().elapsedMs, 0);
  });

  test('jeder Zustandswechsel meldet sich', () => {
    stopwatch.start();
    stopwatch.pause();
    stopwatch.resume();
    stopwatch.stop();

    assert.deepEqual(
      updates.map((state) => state.status),
      ['tracking', 'paused', 'tracking', 'idle']
    );
  });
});

describe('Dieselbe Form wie das Tracking', () => {
  test('beide bieten dieselben Befehle an', async () => {
    const { createTracker } = await import('../js/tracker.js');
    const tracker = createTracker({});

    assert.deepEqual(Object.keys(stopwatch).sort(), Object.keys(tracker).sort());
  });

  test('der Zustand hat dieselben Felder', async () => {
    const { createTracker } = await import('../js/tracker.js');
    const tracker = createTracker({});

    // Nur so kann renderTracking() beide ohne Sonderfälle anzeigen.
    assert.deepEqual(
      Object.keys(stopwatch.getState()).sort(),
      Object.keys(tracker.getState()).sort()
    );
  });
});
