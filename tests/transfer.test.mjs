import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExport,
  serializeExport,
  exportFileName,
  parseImport,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  LEGACY_EXPORT_FORMATS,
  exportReminder,
  EXPORT_REMINDER_DAYS,
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
    assert.equal(exportFileName(new Date(2026, 7, 14)), 'funrun-2026-08-14.json');
    assert.equal(exportFileName(new Date(2026, 0, 5)), 'funrun-2026-01-05.json');
  });
});

describe('Sicherungen aus der Zeit als Laufapp', () => {
  test('werden weiterhin angenommen', () => {
    // Wer vor der Umbenennung exportiert hat, muss die Datei zurückspielen
    // können – sonst wäre die einzige Sicherung wertlos.
    const alt = JSON.stringify({
      format: 'laufapp-export',
      version: 1,
      runs: sampleRuns,
    });

    const result = parseImport(alt);
    assert.equal(result.ok, true);
    assert.deepEqual(result.runs, sampleRuns);
  });

  test('das alte Format steht als Konstante da, nicht als Zufallstext', () => {
    assert.ok(LEGACY_EXPORT_FORMATS.includes('laufapp-export'));
    assert.equal(EXPORT_FORMAT, 'funrun-export');
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

  test('Notiz und Gefühl überstehen Export und Import', () => {
    // Regel aus der Roadmap: bei jedem neuen gespeicherten Feld muss die
    // Sicherung mitziehen. Sonst ist es genau dann weg, wenn jemand seine
    // Daten wiederherstellt – und dann merkt es niemand mehr rechtzeitig.
    const runs = [
      {
        id: 'n',
        distanceKm: 8,
        date: '2026-08-14',
        note: 'Gegenwind auf dem Rückweg',
        feeling: 4,
      },
    ];

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

describe('Erledigte Übungen in der Sicherung', () => {
  const log = [
    { id: 'u1', exerciseId: 'kraft-plank', date: '2026-08-14', at: '2026-08-14T07:00:00.000Z' },
    { id: 'u2', exerciseId: 'mob-wadendehnung', date: '2026-08-15' },
  ];

  test('werden mit exportiert', () => {
    const payload = buildExport(sampleRuns, { exerciseLog: log });
    assert.deepEqual(payload.exerciseLog, log);
  });

  test('überstehen Export und Import unverändert', () => {
    const text = serializeExport(sampleRuns, { exerciseLog: log });
    assert.deepEqual(parseImport(text).exerciseLog, log);
  });

  test('eine Sicherung ohne Übungen ist kein Fehler', () => {
    // Dateien von vor diesem Feature haben das Feld nicht.
    const result = parseImport(JSON.stringify({ format: EXPORT_FORMAT, runs: sampleRuns }));

    assert.equal(result.ok, true);
    assert.deepEqual(result.exerciseLog, []);
  });

  test('kaputte Einträge fallen raus, der Rest bleibt', () => {
    const text = JSON.stringify({
      runs: sampleRuns,
      exerciseLog: [
        { id: 'gut', exerciseId: 'kraft-plank', date: '2026-08-14' },
        null,
        'text',
        { exerciseId: '', date: '2026-08-14' },
        { exerciseId: 'x', date: '14.08.2026' },
        { exerciseId: 'y' },
      ],
    });

    assert.deepEqual(parseImport(text).exerciseLog.map((e) => e.exerciseId), ['kraft-plank']);
  });

  test('fehlende und doppelte Ids werden aufgelöst', () => {
    const text = JSON.stringify({
      runs: sampleRuns,
      exerciseLog: [
        { exerciseId: 'kraft-plank', date: '2026-08-14' },
        { id: 'gleich', exerciseId: 'kraft-plank', date: '2026-08-15' },
        { id: 'gleich', exerciseId: 'kraft-plank', date: '2026-08-16' },
      ],
    });

    const ids = parseImport(text).exerciseLog.map((e) => e.id);
    assert.equal(new Set(ids).size, 3, `nicht eindeutig: ${ids.join(', ')}`);
  });

  test('unbekannte Übungs-Ids bleiben erhalten', () => {
    // Sonst verlöre man den Zähler, nur weil die Bibliothek sich geändert hat.
    const text = JSON.stringify({
      runs: sampleRuns,
      exerciseLog: [{ id: 'a', exerciseId: 'aus-einer-alten-fassung', date: '2026-08-14' }],
    });

    assert.equal(parseImport(text).exerciseLog.length, 1);
  });

  test('ein kaputtes Übungsfeld kippt nicht die ganze Datei', () => {
    const text = JSON.stringify({ runs: sampleRuns, exerciseLog: 'quatsch' });
    const result = parseImport(text);

    assert.equal(result.ok, true, 'die Läufe müssen trotzdem ankommen');
    assert.deepEqual(result.exerciseLog, []);
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
    ['fremdes Format', '{"format":"strava-export","runs":[]}', /nicht aus FunRun/i],
    ['keine Lauf-Liste', '{"format":"funrun-export"}', /keine Liste/i],
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

describe('Trainingsplan in der Sicherung', () => {
  const lauf = { id: 'r1', distanceKm: 5, date: '2026-08-14' };
  const einheit = {
    id: 's1',
    date: '2026-08-20',
    type: 'interval',
    segments: [{ kind: 'main', repeats: 6, distanceKm: 0.4 }],
    createdAt: '2026-08-15T09:00:00.000Z',
  };

  test('der Export nimmt geplante Einheiten mit', () => {
    const daten = buildExport([lauf], { sessions: [einheit] });
    assert.deepEqual(daten.sessions, [einheit]);
  });

  test('ohne Plan steht eine leere Liste in der Datei', () => {
    assert.deepEqual(buildExport([lauf]).sessions, []);
  });

  test('Rundlauf: was exportiert wurde, kommt unverändert zurück', () => {
    const text = serializeExport([lauf], { sessions: [einheit] });
    const result = parseImport(text);

    assert.equal(result.ok, true);
    assert.deepEqual(result.sessions, [einheit]);
  });

  test('eine Sicherung von vor dem Feature ergibt einen leeren Plan', () => {
    const result = parseImport(JSON.stringify({ runs: [lauf] }));

    assert.equal(result.ok, true);
    assert.deepEqual(result.sessions, []);
  });

  test('kaputte Einheiten werden still übersprungen, die Läufe bleiben', () => {
    const text = JSON.stringify({
      runs: [lauf],
      sessions: [einheit, { id: 's2', date: 'irgendwann', type: 'easy' }, null],
    });

    const result = parseImport(text);

    assert.equal(result.ok, true);
    assert.equal(result.runs.length, 1);
    assert.deepEqual(result.sessions.map((s) => s.id), ['s1']);
  });

  test('doppelte Einheiten-Ids werden entzerrt', () => {
    const text = JSON.stringify({
      runs: [lauf],
      sessions: [einheit, { ...einheit, date: '2026-08-22' }],
    });

    const ids = parseImport(text).sessions.map((s) => s.id);
    assert.equal(new Set(ids).size, 2);
  });

  test('geschmuggelte Felder überstehen den Import nicht', () => {
    const text = JSON.stringify({
      runs: [lauf],
      sessions: [{ ...einheit, xp: 9999, status: 'erfuellt' }],
    });

    const [importiert] = parseImport(text).sessions;

    assert.equal(importiert.xp, undefined);
    assert.equal(importiert.status, undefined);
  });
});

describe('Übungsplan und Profil in der Sicherung', () => {
  const lauf = { id: 'a', distanceKm: 5, date: '2026-08-14' };
  const vorhaben = { id: 'p1', exerciseId: 'warm-traben', date: '2026-08-20' };
  const profil = { name: 'Tim', weeklyGoal: 3, goalSince: '2026-08-10' };
  const leeresProfil = { name: '', weeklyGoal: 0, goalSince: '' };

  test('beide landen im Export', () => {
    const payload = buildExport([lauf], { exercisePlan: [vorhaben], profile: profil });

    assert.deepEqual(payload.exercisePlan, [vorhaben]);
    assert.deepEqual(payload.profile, profil);
  });

  test('Roundtrip hält beides', () => {
    const text = serializeExport([lauf], { exercisePlan: [vorhaben], profile: profil });
    const ergebnis = parseImport(text);

    assert.deepEqual(ergebnis.exercisePlan, [vorhaben]);
    assert.deepEqual(ergebnis.profile, profil);
  });

  test('alte Sicherungen ohne die Felder sind kein Fehler', () => {
    const ergebnis = parseImport(JSON.stringify({ runs: [lauf] }));

    assert.equal(ergebnis.ok, true);
    assert.deepEqual(ergebnis.exercisePlan, []);
    assert.deepEqual(ergebnis.profile, leeresProfil);
  });

  test('die erste Schreibweise mit profileName wird weiter gelesen', () => {
    // Sicherungen aus der Fassung, in der es nur einen Namen gab.
    const text = JSON.stringify({ runs: [lauf], profileName: 'Tim' });
    assert.deepEqual(parseImport(text).profile, { ...leeresProfil, name: 'Tim' });
  });

  test('ein Stichtag ohne Ziel wird verworfen', () => {
    // Sonst zaehlte ein spaeter gesetztes Ziel ab einem Datum aus der Datei.
    const text = JSON.stringify({ runs: [lauf], profile: { goalSince: '2020-01-06' } });
    assert.equal(parseImport(text).profile.goalSince, '');
  });

  test('unbrauchbare Stichtage fallen weg', () => {
    for (const value of ['gestern', 42, null, '10.08.2026', '2026-02-30']) {
      const text = JSON.stringify({ runs: [lauf], profile: { weeklyGoal: 3, goalSince: value } });
      assert.equal(parseImport(text).profile.goalSince, '', `${JSON.stringify(value)}`);
    }
  });

  test('der Name wird beim Einlesen aufgeräumt', () => {
    const text = JSON.stringify({ runs: [lauf], profile: { name: '   Tim   Berger  ' } });
    assert.equal(parseImport(text).profile.name, 'Tim Berger');
  });

  test('unbrauchbare Namen ergeben keinen', () => {
    for (const value of [42, null, { name: 'Tim' }, '   ']) {
      const text = JSON.stringify({ runs: [lauf], profile: { name: value } });
      assert.equal(parseImport(text).profile.name, '');
    }
  });

  test('unbrauchbare Wochenziele ergeben keines', () => {
    for (const value of ['viel', -1, 99, null, 2.7, {}]) {
      const text = JSON.stringify({ runs: [lauf], profile: { weeklyGoal: value } });
      const ziel = parseImport(text).profile.weeklyGoal;
      // 2,7 wird auf 2 gestutzt – eine Zahl ist es ja.
      assert.equal(ziel, value === 2.7 ? 2 : 0, `${JSON.stringify(value)}`);
    }
  });

  test('ein kaputtes Profil-Feld wirft nicht', () => {
    for (const value of ['text', 42, null, []]) {
      const text = JSON.stringify({ runs: [lauf], profile: value });
      assert.doesNotThrow(() => parseImport(text));
      assert.deepEqual(parseImport(text).profile, leeresProfil);
    }
  });

  test('Vorhaben zu unbekannten Übungen fallen weg', () => {
    const text = JSON.stringify({
      runs: [lauf],
      exercisePlan: [vorhaben, { id: 'p2', exerciseId: 'gibt-es-nicht', date: '2026-08-20' }],
    });

    assert.deepEqual(parseImport(text).exercisePlan.map((e) => e.exerciseId), ['warm-traben']);
  });

  test('doppelte IDs werden auseinandergezogen', () => {
    const text = JSON.stringify({
      runs: [lauf],
      exercisePlan: [vorhaben, { ...vorhaben, date: '2026-08-21' }],
    });

    const ids = parseImport(text).exercisePlan.map((e) => e.id);
    assert.equal(new Set(ids).size, 2);
  });

  test('geschmuggelte Felder überstehen den Import nicht', () => {
    const text = JSON.stringify({
      runs: [lauf],
      exercisePlan: [{ ...vorhaben, xp: 9999 }],
    });

    assert.equal(parseImport(text).exercisePlan[0].xp, undefined);
  });
});

describe('Erinnerung an die Sicherung', () => {
  const HEUTE = '2026-08-21';

  /** Kurz: erinnert die App heute, wenn zuletzt an diesem Tag gesichert wurde? */
  const stand = (lastExport, runCount = 5) =>
    exportReminder({ lastExport, runCount, todayIso: HEUTE });

  test('dreissig Tage sind die Grenze', () => {
    assert.equal(EXPORT_REMINDER_DAYS, 30);
  });

  test('genau an der Grenze wird erinnert, einen Tag davor nicht', () => {
    // 29 Tage: 2026-07-23 -> 2026-08-21
    assert.equal(stand('2026-07-23').daysSince, 29);
    assert.equal(stand('2026-07-23').due, false, '29 Tage sind noch in Ordnung');

    assert.equal(stand('2026-07-22').daysSince, 30);
    assert.equal(stand('2026-07-22').due, true, 'am dreissigsten Tag ist es fällig');

    assert.equal(stand('2026-07-21').due, true);
  });

  test('am selben Tag gesichert heisst null Tage', () => {
    assert.deepEqual(stand(HEUTE), { due: false, never: false, daysSince: 0 });
  });

  test('noch nie gesichert ist sofort fällig', () => {
    assert.deepEqual(stand(null), { due: true, never: true, daysSince: null });
  });

  test('ohne Läufe wird nicht erinnert', () => {
    // Ein Hinweis, der zum Sichern von nichts auffordert, ist der schnellste
    // Weg, dass der Hinweis künftig übersehen wird.
    assert.equal(exportReminder({ lastExport: null, runCount: 0, todayIso: HEUTE }).due, false);
    assert.equal(
      exportReminder({ lastExport: '2020-01-01', runCount: 0, todayIso: HEUTE }).due,
      false
    );
  });

  test('eine Sicherung in der Zukunft zaehlt als heute', () => {
    // Verstellte Uhr oder Zeitzonenwechsel. Eine negative Zahl Tage wäre kein
    // Zustand, sondern ein Rechenfehler auf dem Schirm.
    const zukunft = stand('2026-12-24');
    assert.equal(zukunft.daysSince, 0);
    assert.equal(zukunft.due, false);
  });

  test('ueber einen Zeitumstellungstermin hinweg stimmt die Zahl', () => {
    // Ende Oktober wird in Europa zurückgestellt. Mit lokalen Daten gerechnet
    // läge die Differenz hier um eine Stunde daneben und rutschte beim Runden
    // auf einen Tag zu wenig.
    const ueberDieUmstellung = exportReminder({
      lastExport: '2026-10-01',
      runCount: 3,
      todayIso: '2026-11-01',
    });

    assert.equal(ueberDieUmstellung.daysSince, 31);
    assert.equal(ueberDieUmstellung.due, true);
  });

  test('ueber einen Jahreswechsel hinweg auch', () => {
    assert.equal(
      exportReminder({ lastExport: '2025-12-20', runCount: 3, todayIso: '2026-01-05' }).daysSince,
      16
    );
  });

  test('ein Schaltjahr wird mitgezaehlt', () => {
    // 2028 ist eins: der 29. Februar existiert und zählt mit.
    assert.equal(
      exportReminder({ lastExport: '2028-02-01', runCount: 3, todayIso: '2028-03-01' }).daysSince,
      29
    );
  });

  test('unbrauchbare Angaben gelten als nie gesichert', () => {
    for (const wert of [undefined, '', 'gestern', '2026-13-01', '2026-02-30', 42, {}]) {
      assert.equal(stand(wert).never, true, `${JSON.stringify(wert)} sollte als "nie" gelten`);
      assert.equal(stand(wert).due, true);
    }
  });

  test('ein unbrauchbares Heute erinnert nicht', () => {
    // Lieber schweigen als eine erfundene Zahl Tage behaupten.
    assert.equal(
      exportReminder({ lastExport: '2026-01-01', runCount: 3, todayIso: 'heute' }).due,
      false
    );
  });

  test('ganz ohne Angaben stuerzt nichts ab', () => {
    assert.doesNotThrow(() => exportReminder());
    assert.equal(exportReminder().due, false);
  });
});
