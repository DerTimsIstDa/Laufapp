import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  holdProgress,
  isHoldComplete,
  canLock,
  controlsEnabled,
  shouldReleaseLock,
  UNLOCK_HOLD_MS,
} from '../js/lock.js';

describe('holdProgress', () => {
  test('wächst gleichmässig von 0 auf 1', () => {
    assert.equal(holdProgress(1000, 1000), 0);
    assert.equal(holdProgress(1000, 1500), 0.25);
    assert.equal(holdProgress(1000, 2000), 0.5);
    assert.equal(holdProgress(1000, 3000), 1);
  });

  test('bleibt bei 1 stehen, auch wenn länger gehalten wird', () => {
    assert.equal(holdProgress(1000, 99_999), 1);
  });

  test('ohne Halten ist der Fortschritt 0', () => {
    assert.equal(holdProgress(null, 5000), 0);
    assert.equal(holdProgress(undefined, 5000), 0);
  });

  test('eine rückwärts laufende Uhr ergibt keinen negativen Fortschritt', () => {
    assert.equal(holdProgress(5000, 1000), 0);
  });

  test('unbrauchbare Zeitwerte kippen nicht', () => {
    assert.equal(holdProgress(NaN, 1000), 0);
    assert.equal(holdProgress(1000, NaN), 0);
    assert.equal(holdProgress(Infinity, 1000), 0);
  });

  test('eigene Haltedauer', () => {
    assert.equal(holdProgress(0, 250, 500), 0.5);
    assert.equal(holdProgress(0, 0, 0), 1, 'Dauer 0 ist sofort fertig');
    assert.equal(holdProgress(0, 0, -5), 1);
  });
});

describe('isHoldComplete', () => {
  test('erst nach der vollen Haltedauer', () => {
    assert.equal(isHoldComplete(0, UNLOCK_HOLD_MS - 1), false);
    assert.equal(isHoldComplete(0, UNLOCK_HOLD_MS), true);
    assert.equal(isHoldComplete(0, UNLOCK_HOLD_MS + 500), true);
  });

  test('zwei Sekunden sind die Vorgabe', () => {
    assert.equal(UNLOCK_HOLD_MS, 2000);
  });

  test('ein kurzer Tipper reicht nicht – genau darum geht es', () => {
    // Eine Taschenberührung dauert typischerweise Millisekunden.
    assert.equal(isHoldComplete(0, 40), false);
    assert.equal(isHoldComplete(0, 300), false);
  });

  test('ohne Halten nie fertig', () => {
    assert.equal(isHoldComplete(null, 10_000), false);
  });
});

describe('canLock', () => {
  test('nur während einer laufenden oder pausierten Aufzeichnung', () => {
    assert.equal(canLock({ status: 'tracking', locked: false }), true);
    assert.equal(canLock({ status: 'paused', locked: false }), true);
    assert.equal(canLock({ status: 'idle', locked: false }), false);
  });

  test('doppelt sperren geht nicht', () => {
    assert.equal(canLock({ status: 'tracking', locked: true }), false);
  });
});

describe('controlsEnabled', () => {
  test('gesperrt heisst: keine Bedienung', () => {
    assert.equal(controlsEnabled({ status: 'tracking', locked: true }), false);
    assert.equal(controlsEnabled({ status: 'paused', locked: true }), false);
  });

  test('entsperrt und laufend heisst: Bedienung frei', () => {
    assert.equal(controlsEnabled({ status: 'tracking', locked: false }), true);
    assert.equal(controlsEnabled({ status: 'paused', locked: false }), true);
  });

  test('im Ruhezustand gibt es nichts zu bedienen', () => {
    assert.equal(controlsEnabled({ status: 'idle', locked: false }), false);
  });
});

describe('shouldReleaseLock', () => {
  test('endet die Aufzeichnung, fällt die Sperre', () => {
    // Sonst bliebe die Bedienung tot, etwa nach entzogener Standortfreigabe.
    assert.equal(shouldReleaseLock({ status: 'idle', locked: true }), true);
  });

  test('während der Aufzeichnung bleibt sie bestehen', () => {
    assert.equal(shouldReleaseLock({ status: 'tracking', locked: true }), false);
    assert.equal(shouldReleaseLock({ status: 'paused', locked: true }), false);
  });

  test('ohne Sperre nichts zu lösen', () => {
    assert.equal(shouldReleaseLock({ status: 'idle', locked: false }), false);
  });
});

describe('Zusammenspiel: ein gesperrter Lauf', () => {
  test('gesperrt läuft weiter, lässt sich aber nicht bedienen', () => {
    const zustand = { status: 'tracking', locked: true };

    assert.equal(controlsEnabled(zustand), false, 'Bedienung blockiert');
    assert.equal(canLock(zustand), false, 'schon gesperrt');
    assert.equal(shouldReleaseLock(zustand), false, 'Sperre bleibt');
  });

  test('ein halber Haltevorgang entsperrt nicht', () => {
    const start = 10_000;
    for (const vergangen of [0, 100, 999, 1500, 1999]) {
      assert.equal(isHoldComplete(start, start + vergangen), false, `${vergangen} ms`);
    }
    assert.equal(isHoldComplete(start, start + 2000), true);
  });
});
