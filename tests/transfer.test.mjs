import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExport,
  serializeExport,
  exportFileName,
  parseImport,
  EXPORT_FORMAT,
  EXPORT_VERSION,
} from '../js/transfer.js';

const sampleRuns = [
  { id: 'a', distanceKm: 5, date: '2026-08-14', timeOfDay: '06:30', durationMinutes: 28 },
  { id: 'b', distanceKm: 10.5, date: '2026-08-10', source: 'gps' },
];

/** Export -> Text -> Import, wie beim Sichern und Zurückspielen. */
const roundtrip = (runs) => parseImport(serializeExport(runs));

describe('Export', () => {
  test('enthält Kennung, Version und die Läufe', () => {
    const payload = buildExport(sampleRuns, { exportedAt: new Date('2026-08-14T09:00:00Z') });

    assert.equal(payload.format, EXPORT_FORMAT);
    assert.equal(payload.version, EXPORT_VERSION);
    assert.equal(payload.exportedAt, '2026-08-14T09:00:00.000Z');
    assert.equal(payload.runCount, 2);
    assert.deepEqual(payload.runs, sampleRuns);
  });

  test('ist lesbar eingerückt', () => {
    assert.ok(serializeExport(sampleRuns).includes('\n  '));
  });

  test('Dateiname trägt das lokale Datum', () => {
    assert.equal(exportFileName(new Date(2026, 7, 14)), 'laufapp-2026-08-14.json');
    assert.equal(exportFileName(new Date(2026, 0, 5)), 'laufapp-2026-01-05.json');
  });
});

describe('Roundtrip', () => {
  test('exportierte Läufe kommen unverändert zurück', () => {
    const result = roundtrip(sampleRuns);

    assert.equal(result.ok, true);
    assert.deepEqual(result.runs, sampleRuns);
    assert.deepEqual(result.skipped, []);
  });

  test('auch ein einzelner Lauf ohne Zusatzfelder', () => {
    const runs = [{ id: 'x', distanceKm: 3, date: '2026-01-01' }];
    assert.deepEqual(roundtrip(runs).runs, runs);
  });

  test('die aufgezeichnete Route übersteht Export und Import', () => {
    const runs = [
      {
        id: 'g',
        distanceKm: 5,
        date: '2026-08-14',
        source: 'gps',
        track: [[52.5, 13.4], [52.505, 13.405], [52.51, 13.41]],
      },
    ];

    assert.deepEqual(roundtrip(runs).runs, runs);
  });
});

describe('Import – kaputte Dateien', () => {
  const cases = [
    ['leerer Text', '', /leer/i],
    ['nur Leerzeichen', '   \n  ', /leer/i],
    ['kein JSON', 'das ist keine Datei', /JSON/i],
    ['abgeschnittenes JSON', '{"runs": [{"distanceKm": 5', /JSON/i],
    ['JSON-Text statt Objekt', '"nur ein String"', /Format/i],
    ['Zahl statt Objekt', '42', /Format/i],
    ['fremdes Format', '{"format":"strava-export","runs":[]}', /nicht aus der Laufapp/i],
    ['keine Lauf-Liste', '{"format":"laufapp-export"}', /keine Liste/i],
    ['runs ist kein Array', '{"runs": {"a": 1}}', /keine Liste/i],
    ['leere Liste', '{"runs": []}', /keine Läufe/i],
  ];

  for (const [label, text, pattern] of cases) {
    test(label, () => {
      const result = parseImport(text);
      assert.equal(result.ok, false);
      assert.match(result.error, pattern);
      assert.equal(result.runs, undefined, 'kein halbgares Ergebnis');
    });
  }

  test('nichts davon wirft eine Ausnahme', () => {
    for (const [, text] of cases) {
      assert.doesNotThrow(() => parseImport(text));
    }
  });

  test('auch abwegige Eingaben werfen nicht', () => {
    for (const value of [null, undefined, 42, {}, [], true]) {
      assert.doesNotThrow(() => parseImport(value));
      assert.equal(parseImport(value).ok, false);
    }
  });

  test('neuere Dateiversion wird abgelehnt statt falsch gelesen', () => {
    const text = JSON.stringify({ format: EXPORT_FORMAT, version: 99, runs: sampleRuns });
    const result = parseImport(text);

    assert.equal(result.ok, false);
    assert.match(result.error, /neueren Version/i);
  });
});

describe('Import – unvollständige Einträge', () => {
  test('kaputte Einträge werden übersprungen, gute übernommen', () => {
    const text = JSON.stringify({
      runs: [
        { id: 'gut-1', distanceKm: 5, date: '2026-08-14' },
        { id: 'kaputt-1', distanceKm: -3, date: '2026-08-13' },
        { id: 'kaputt-2', distanceKm: 5, date: '2026-02-30' },
        null,
        'text statt objekt',
        { id: 'gut-2', distanceKm: 8, date: '2026-08-12' },
      ],
    });

    const result = parseImport(text);

    assert.equal(result.ok, true);
    assert.deepEqual(result.runs.map((run) => run.id), ['gut-1', 'gut-2']);
    assert.equal(result.skipped.length, 4);
    assert.deepEqual(result.skipped.map((entry) => entry.index), [1, 2, 3, 4]);
    assert.ok(result.skipped[0].reason.length > 0, 'Grund wird mitgeliefert');
  });

  test('ist kein einziger Eintrag lesbar, gilt die Datei als kaputt', () => {
    const text = JSON.stringify({ runs: [{ distanceKm: -1, date: 'x' }, null] });
    const result = parseImport(text);

    assert.equal(result.ok, false);
    assert.match(result.error, /Kein einziger Lauf/i);
  });

  test('unbekannte Zusatzfelder werden verworfen, nicht übernommen', () => {
    const text = JSON.stringify({
      runs: [{ id: 'a', distanceKm: 5, date: '2026-08-14', kaloriern: 400, notiz: 'schön' }],
    });

    assert.deepEqual(parseImport(text).runs[0], { id: 'a', distanceKm: 5, date: '2026-08-14' });
  });

  test('Zahlen als Text werden übernommen', () => {
    const text = JSON.stringify({ runs: [{ id: 'a', distanceKm: '7,5', date: '2026-08-14' }] });
    assert.equal(parseImport(text).runs[0].distanceKm, 7.5);
  });
});

describe('Import – IDs', () => {
  test('fehlende IDs werden ergänzt', () => {
    const text = JSON.stringify({ runs: [{ distanceKm: 5, date: '2026-08-14' }] });
    assert.equal(parseImport(text).runs[0].id, 'import-1');
  });

  test('doppelte IDs werden aufgelöst', () => {
    const text = JSON.stringify({
      runs: [
        { id: 'gleich', distanceKm: 5, date: '2026-08-14' },
        { id: 'gleich', distanceKm: 6, date: '2026-08-13' },
        { id: '  ', distanceKm: 7, date: '2026-08-12' },
      ],
    });

    const ids = parseImport(text).runs.map((run) => run.id);
    assert.equal(new Set(ids).size, 3, `IDs nicht eindeutig: ${ids.join(', ')}`);
  });
});

describe('Import – Nachsicht beim Format', () => {
  test('eine nackte Liste von Läufen wird akzeptiert', () => {
    const text = JSON.stringify([{ id: 'a', distanceKm: 5, date: '2026-08-14' }]);
    const result = parseImport(text);

    assert.equal(result.ok, true);
    assert.equal(result.runs.length, 1);
  });

  test('fehlende Versionsangabe ist in Ordnung', () => {
    const text = JSON.stringify({ format: EXPORT_FORMAT, runs: sampleRuns });
    assert.equal(parseImport(text).ok, true);
  });
});
