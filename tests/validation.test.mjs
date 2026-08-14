import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRun,
  parseNumber,
  isValidIsoDate,
  isValidTimeOfDay,
  firstErrorMessage,
  MAX_DISTANCE_KM,
  MAX_DURATION_MINUTES,
} from '../js/validation.js';

/** Kurzform: gültige Basis, einzelne Felder überschreibbar. */
const input = (overrides = {}) => ({ distanceKm: 5, date: '2026-08-14', ...overrides });

/** Feldnamen der gemeldeten Fehler. */
const errorFields = (result) => (result.ok ? [] : result.errors.map((e) => e.field));

describe('parseNumber', () => {
  test('nimmt Zahlen und Zahlentexte', () => {
    assert.equal(parseNumber(5), 5);
    assert.equal(parseNumber('5'), 5);
    assert.equal(parseNumber(' 5.4 '), 5.4);
  });

  test('akzeptiert das deutsche Komma', () => {
    assert.equal(parseNumber('5,4'), 5.4);
  });

  test('weist Unbrauchbares zurück', () => {
    for (const value of ['', '   ', 'abc', '5.4.3', null, undefined, {}, [], NaN, Infinity]) {
      assert.equal(parseNumber(value), null, `${JSON.stringify(value)} sollte null ergeben`);
    }
  });
});

describe('isValidIsoDate', () => {
  test('nimmt echte Kalendertage', () => {
    assert.equal(isValidIsoDate('2026-08-14'), true);
    assert.equal(isValidIsoDate('2024-02-29'), true, 'Schaltjahr');
  });

  test('weist erfundene Tage zurück', () => {
    assert.equal(isValidIsoDate('2026-02-30'), false);
    assert.equal(isValidIsoDate('2025-02-29'), false, 'kein Schaltjahr');
    assert.equal(isValidIsoDate('2026-13-01'), false);
    assert.equal(isValidIsoDate('2026-00-10'), false);
  });

  test('weist falsche Formate zurück', () => {
    for (const value of ['14.08.2026', '2026-8-14', '2026/08/14', '', 'heute', 20260814, null]) {
      assert.equal(isValidIsoDate(value), false, `${JSON.stringify(value)}`);
    }
  });
});

describe('isValidTimeOfDay', () => {
  test('nimmt gültige Uhrzeiten inklusive Rändern', () => {
    for (const value of ['00:00', '06:59', '23:59']) {
      assert.equal(isValidTimeOfDay(value), true, value);
    }
  });

  test('weist Unmögliches zurück', () => {
    for (const value of ['24:00', '23:60', '7:30', '0730', 'abc', '', null]) {
      assert.equal(isValidTimeOfDay(value), false, `${JSON.stringify(value)}`);
    }
  });
});

describe('validateRun – Pflichtfelder', () => {
  test('gültige Eingabe wird normalisiert', () => {
    const result = validateRun(input());
    assert.equal(result.ok, true);
    assert.deepEqual(result.run, { distanceKm: 5, date: '2026-08-14' });
  });

  test('Komma-Distanz aus dem Formular', () => {
    const result = validateRun(input({ distanceKm: '5,4' }));
    assert.equal(result.run.distanceKm, 5.4);
  });

  test('Distanz muss vorhanden und positiv sein', () => {
    assert.deepEqual(errorFields(validateRun(input({ distanceKm: '' }))), ['distanceKm']);
    assert.deepEqual(errorFields(validateRun(input({ distanceKm: 0 }))), ['distanceKm']);
    assert.deepEqual(errorFields(validateRun(input({ distanceKm: -3 }))), ['distanceKm']);
    assert.deepEqual(errorFields(validateRun(input({ distanceKm: 'abc' }))), ['distanceKm']);
  });

  test('Obergrenze für die Distanz', () => {
    assert.equal(validateRun(input({ distanceKm: MAX_DISTANCE_KM })).ok, true);
    assert.equal(validateRun(input({ distanceKm: MAX_DISTANCE_KM + 0.1 })).ok, false);
  });

  test('Datum muss ein echter Tag sein', () => {
    assert.deepEqual(errorFields(validateRun(input({ date: '' }))), ['date']);
    assert.deepEqual(errorFields(validateRun(input({ date: '2026-02-30' }))), ['date']);
    assert.deepEqual(errorFields(validateRun(input({ date: '14.08.2026' }))), ['date']);
  });

  test('mehrere Fehler werden gesammelt', () => {
    const result = validateRun({ distanceKm: -1, date: 'quatsch' });
    assert.deepEqual(errorFields(result), ['distanceKm', 'date']);
  });

  test('Nicht-Objekte werden abgefangen', () => {
    for (const value of [null, undefined, 'text', 42, []]) {
      const result = validateRun(value);
      assert.equal(result.ok, false, `${JSON.stringify(value)}`);
      assert.ok(firstErrorMessage(result).length > 0);
    }
  });
});

describe('validateRun – optionale Felder', () => {
  test('leere Angaben bleiben einfach weg', () => {
    const result = validateRun(input({ timeOfDay: '', durationMinutes: '' }));
    assert.deepEqual(Object.keys(result.run).sort(), ['date', 'distanceKm']);
  });

  test('fehlende Angaben bleiben ebenfalls weg', () => {
    const result = validateRun(input({ timeOfDay: undefined, durationMinutes: null }));
    assert.equal('timeOfDay' in result.run, false);
    assert.equal('durationMinutes' in result.run, false);
  });

  test('gültige Angaben werden übernommen', () => {
    const result = validateRun(input({ timeOfDay: '06:30', durationMinutes: '28' }));
    assert.equal(result.run.timeOfDay, '06:30');
    assert.equal(result.run.durationMinutes, 28);
  });

  test('unbrauchbare Uhrzeit ist ein Fehler, kein stilles Weglassen', () => {
    assert.deepEqual(errorFields(validateRun(input({ timeOfDay: '25:00' }))), ['timeOfDay']);
  });

  test('Dauer muss positiv und plausibel sein', () => {
    assert.deepEqual(errorFields(validateRun(input({ durationMinutes: 0 }))), ['durationMinutes']);
    assert.deepEqual(errorFields(validateRun(input({ durationMinutes: -5 }))), ['durationMinutes']);
    assert.equal(validateRun(input({ durationMinutes: MAX_DURATION_MINUTES })).ok, true);
    assert.equal(validateRun(input({ durationMinutes: MAX_DURATION_MINUTES + 1 })).ok, false);
  });

  test('source wird nur anerkannt, wenn sie bekannt ist', () => {
    assert.equal(validateRun(input({ source: 'gps' })).run.source, 'gps');
    assert.equal(validateRun(input({ source: 'manual' })).run.source, 'manual');
    assert.equal('source' in validateRun(input({ source: 'strava' })).run, false);
  });

  test('unbekannte Felder werden nicht durchgereicht', () => {
    const result = validateRun(input({ herzfrequenz: 150, id: 'fremd' }));
    assert.deepEqual(Object.keys(result.run).sort(), ['date', 'distanceKm']);
  });
});

describe('validateRun – aufgezeichnete Strecke', () => {
  const track = [[52.5, 13.4], [52.51, 13.41]];

  test('wird als kompakte Paare übernommen', () => {
    assert.deepEqual(validateRun(input({ track })).run.track, track);
  });

  test('Objektform wird in Paare umgewandelt', () => {
    const objekte = [{ lat: 52.5, lon: 13.4 }, { lat: 52.51, lon: 13.41 }];
    assert.deepEqual(validateRun(input({ track: objekte })).run.track, track);
  });

  test('unter zwei Punkten gibt es nichts zu zeichnen', () => {
    assert.equal('track' in validateRun(input({ track: [[52.5, 13.4]] })).run, false);
    assert.equal('track' in validateRun(input({ track: [] })).run, false);
  });

  test('eine unbrauchbare Strecke macht den Lauf nicht ungültig', () => {
    for (const kaputt of ['text', 42, {}, [[NaN, NaN]], [[999, 999], [1, 1]]]) {
      const result = validateRun(input({ track: kaputt }));
      assert.equal(result.ok, true, `${JSON.stringify(kaputt)} sollte den Lauf nicht kippen`);
      assert.equal('track' in result.run, false);
    }
  });

  test('einzelne kaputte Punkte fallen raus, der Rest bleibt', () => {
    const result = validateRun(input({ track: [[52.5, 13.4], [NaN, 13.4], [52.51, 13.41]] }));
    assert.deepEqual(result.run.track, track);
  });
});
