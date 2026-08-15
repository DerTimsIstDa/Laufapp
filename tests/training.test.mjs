import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateSession,
  normalizeSessions,
  sessionDistanceKm,
  sessionDurationMinutes,
  describeSession,
  plannedInAdvance,
  matchPlan,
  planXp,
  buildPlanStats,
  typeLabel,
  isRestType,
  XP_PER_SESSION,
  FULFILL_RATIO,
  MAX_SEGMENTS,
  MAX_REPEATS,
  MAX_NOTE_LENGTH,
} from '../js/training.js';
import { day, makeRun } from './helpers.mjs';

/** Geplante Einheit mit Vorlaufzeit – so bringt sie XP. */
function makeSession(dayOffset, extra = {}) {
  return {
    id: `session-${dayOffset}-${extra.type ?? 'easy'}`,
    date: day(dayOffset),
    type: 'easy',
    segments: [],
    createdAt: `${day(dayOffset - 3)}T09:00:00.000Z`,
    ...extra,
  };
}

describe('validateSession', () => {
  test('nimmt eine einfache Einheit ohne Abschnitte an', () => {
    const result = validateSession({ date: '2026-08-20', type: 'easy' });

    assert.equal(result.ok, true);
    assert.deepEqual(result.session, { date: '2026-08-20', type: 'easy', segments: [] });
  });

  test('meldet fehlendes Datum und unbekannte Art', () => {
    const result = validateSession({ date: '', type: 'schwimmen' });

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.errors.map((e) => e.field).sort(),
      ['date', 'type']
    );
  });

  test('weist ein unmögliches Datum zurück', () => {
    const result = validateSession({ date: '2026-02-30', type: 'easy' });
    assert.equal(result.ok, false);
  });

  test('rechnet Abschnitte um und ergänzt repeats mit 1', () => {
    const result = validateSession({
      date: '2026-08-20',
      type: 'interval',
      segments: [
        { kind: 'warmup', distanceKm: '2' },
        { kind: 'main', repeats: '6', distanceKm: '0,4' },
      ],
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.session.segments, [
      { kind: 'warmup', repeats: 1, distanceKm: 2 },
      { kind: 'main', repeats: 6, distanceKm: 0.4 },
    ]);
  });

  test('ein Abschnitt braucht Distanz oder Dauer', () => {
    const result = validateSession({
      date: '2026-08-20',
      type: 'easy',
      segments: [{ kind: 'main' }],
    });

    assert.equal(result.ok, false);
    assert.match(result.errors[0].message, /Distanz oder eine Dauer/);
  });

  test('eine Dauer allein reicht', () => {
    const result = validateSession({
      date: '2026-08-20',
      type: 'easy',
      segments: [{ kind: 'main', durationMinutes: '45' }],
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.session.segments, [{ kind: 'main', repeats: 1, durationMinutes: 45 }]);
  });

  test('der Ruhetag wirft Abschnitte weg statt sie zu prüfen', () => {
    const result = validateSession({
      date: '2026-08-20',
      type: 'rest',
      segments: [{ kind: 'main' }], // wäre für sich genommen ungültig
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.session.segments, []);
  });

  test('halbe Wiederholungen und Ausreisser fliegen raus', () => {
    for (const repeats of ['2,5', '0', String(MAX_REPEATS + 1)]) {
      const result = validateSession({
        date: '2026-08-20',
        type: 'interval',
        segments: [{ kind: 'main', repeats, distanceKm: '0.4' }],
      });
      assert.equal(result.ok, false, `repeats=${repeats} hätte auffallen müssen`);
    }
  });

  test('zu viele Abschnitte werden gemeldet', () => {
    const segments = Array.from({ length: MAX_SEGMENTS + 1 }, () => ({
      kind: 'main',
      distanceKm: '1',
    }));

    const result = validateSession({ date: '2026-08-20', type: 'easy', segments });
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].field, 'segments');
  });

  test('eine zu lange Notiz wird gemeldet, eine normale übernommen', () => {
    const zuLang = validateSession({
      date: '2026-08-20',
      type: 'easy',
      note: 'x'.repeat(MAX_NOTE_LENGTH + 1),
    });
    assert.equal(zuLang.ok, false);

    const gut = validateSession({ date: '2026-08-20', type: 'easy', note: '  Feldweg  ' });
    assert.equal(gut.ok, true);
    assert.equal(gut.session.note, 'Feldweg');
  });

  test('unbekannte Felder fallen weg, createdAt bleibt', () => {
    const result = validateSession({
      date: '2026-08-20',
      type: 'easy',
      createdAt: '2026-08-17T10:00:00.000Z',
      xp: 9999,
      id: 'geschmuggelt',
    });

    assert.equal(result.ok, true);
    assert.deepEqual(Object.keys(result.session).sort(), ['createdAt', 'date', 'segments', 'type']);
  });
});

describe('normalizeSessions', () => {
  test('wirft weg, was keine Einheit ist', () => {
    const sauber = normalizeSessions([
      makeSession(0),
      null,
      { id: '', date: day(1), type: 'easy' },
      { id: 'x', date: 'übermorgen', type: 'easy' },
      { id: 'y', date: day(2), type: 'schwimmen' },
      'text',
    ]);

    assert.equal(sauber.length, 1);
  });

  test('macht aus fehlenden Abschnitten eine leere Liste', () => {
    const [session] = normalizeSessions([{ id: 'a', date: day(0), type: 'easy' }]);
    assert.deepEqual(session.segments, []);
  });

  test('verträgt alles ausser einer Liste', () => {
    assert.deepEqual(normalizeSessions(undefined), []);
    assert.deepEqual(normalizeSessions('nichts'), []);
  });
});

describe('Umfang einer Einheit', () => {
  const intervall = makeSession(0, {
    type: 'interval',
    segments: [
      { kind: 'warmup', repeats: 1, distanceKm: 2 },
      { kind: 'main', repeats: 6, distanceKm: 0.4 },
      { kind: 'recovery', repeats: 6, distanceKm: 0.2 },
      { kind: 'cooldown', repeats: 1, distanceKm: 2 },
    ],
  });

  test('Wiederholungen zählen mit', () => {
    // 2 + 6*0,4 + 6*0,2 + 2 = 7,6
    assert.equal(Math.round(sessionDistanceKm(intervall) * 100) / 100, 7.6);
  });

  test('ohne Abschnitte gibt es kein Ziel', () => {
    assert.equal(sessionDistanceKm(makeSession(0)), 0);
    assert.equal(sessionDurationMinutes(makeSession(0)), 0);
  });

  test('der Ruhetag hat keinen Umfang, auch mit Abschnitten', () => {
    const ruhetag = makeSession(0, { type: 'rest', segments: [{ kind: 'main', distanceKm: 10 }] });
    assert.equal(sessionDistanceKm(ruhetag), 0);
    assert.equal(isRestType(ruhetag.type), true);
  });

  test('Dauer summiert sich getrennt von der Distanz', () => {
    const session = makeSession(0, {
      segments: [
        { kind: 'main', repeats: 4, durationMinutes: 3 },
        { kind: 'recovery', repeats: 4, durationMinutes: 2 },
      ],
    });

    assert.equal(sessionDurationMinutes(session), 20);
    assert.equal(sessionDistanceKm(session), 0);
  });
});

describe('describeSession', () => {
  test('fasst Abschnitte lesbar zusammen', () => {
    const text = describeSession(
      makeSession(0, {
        type: 'interval',
        segments: [
          { kind: 'warmup', repeats: 1, distanceKm: 2 },
          { kind: 'main', repeats: 6, distanceKm: 0.4 },
        ],
      })
    );

    assert.equal(text, '2 km Einlaufen · 6× 0,4 km Belastung');
  });

  test('nennt Einheiten ohne Abschnitte beim Namen', () => {
    assert.equal(describeSession(makeSession(0)), 'Ohne festes Ziel');
    assert.equal(describeSession(makeSession(0, { type: 'rest' })), 'Kein Lauf geplant');
  });

  test('zeigt Dauer-Abschnitte in Minuten', () => {
    const text = describeSession(
      makeSession(0, { segments: [{ kind: 'main', repeats: 1, durationMinutes: 45 }] })
    );
    assert.equal(text, '45 min Belastung');
  });
});

describe('plannedInAdvance', () => {
  test('rechtzeitig geplant, wenn createdAt vor dem Termin liegt', () => {
    assert.equal(plannedInAdvance(makeSession(5)), true);
  });

  test('am Tag selbst geplant zählt noch als rechtzeitig', () => {
    const session = makeSession(5, { createdAt: `${day(5)}T06:00:00.000Z` });
    assert.equal(plannedInAdvance(session), true);
  });

  test('nachträglich eingetragen zählt nicht', () => {
    const session = makeSession(5, { createdAt: `${day(6)}T06:00:00.000Z` });
    assert.equal(plannedInAdvance(session), false);
  });

  test('ohne createdAt – etwa aus einer alten Sicherung – gilt als rechtzeitig', () => {
    const { createdAt, ...ohne } = makeSession(5);
    assert.equal(plannedInAdvance(ohne), true);
  });
});

describe('matchPlan', () => {
  const heute = day(10);

  test('ein Lauf am geplanten Tag erfüllt die Einheit', () => {
    const [eintrag] = matchPlan([makeSession(5)], [makeRun(5, 8)], { today: heute });

    assert.equal(eintrag.status, 'erfuellt');
    assert.equal(eintrag.run.distanceKm, 8);
    assert.equal(eintrag.xp, XP_PER_SESSION);
  });

  test('ohne Lauf ist ein vergangener Tag verpasst', () => {
    const [eintrag] = matchPlan([makeSession(5)], [], { today: heute });

    assert.equal(eintrag.status, 'verpasst');
    assert.equal(eintrag.run, null);
    assert.equal(eintrag.xp, 0);
  });

  test('was noch kommt, bleibt geplant', () => {
    const [eintrag] = matchPlan([makeSession(20)], [], { today: heute });
    assert.equal(eintrag.status, 'geplant');
  });

  test('der heutige Tag zählt noch nicht als verpasst', () => {
    const [eintrag] = matchPlan([makeSession(10)], [], { today: heute });
    assert.equal(eintrag.status, 'geplant');
  });

  test('ein zu kurzer Lauf erfüllt das Distanzziel nicht', () => {
    const session = makeSession(5, { segments: [{ kind: 'main', repeats: 1, distanceKm: 10 }] });
    const [eintrag] = matchPlan([session], [makeRun(5, 5)], { today: heute });

    assert.equal(eintrag.status, 'teilweise');
    assert.equal(eintrag.xp, 0);
  });

  test('knapp unter dem Ziel reicht – die Toleranz greift', () => {
    const session = makeSession(5, { segments: [{ kind: 'main', repeats: 1, distanceKm: 10 }] });
    const [eintrag] = matchPlan([session], [makeRun(5, 10 * FULFILL_RATIO)], { today: heute });

    assert.equal(eintrag.status, 'erfuellt');
  });

  test('ohne Distanzziel erfüllt jeder Lauf des Tages', () => {
    const [eintrag] = matchPlan([makeSession(5)], [makeRun(5, 0.5)], { today: heute });
    assert.equal(eintrag.status, 'erfuellt');
  });

  test('ein Lauf erfüllt höchstens eine Einheit', () => {
    const einheiten = [
      makeSession(5, { id: 'a' }),
      makeSession(5, { id: 'b' }),
      makeSession(5, { id: 'c' }),
    ];

    const eintraege = matchPlan(einheiten, [makeRun(5, 8)], { today: heute });

    assert.equal(eintraege.filter((e) => e.status === 'erfuellt').length, 1);
    assert.equal(eintraege.filter((e) => e.status === 'verpasst').length, 2);
    assert.equal(planXp(einheiten, [makeRun(5, 8)], { today: heute }), XP_PER_SESSION);
  });

  test('am selben Tag bekommt die anspruchsvollste Einheit den längsten Lauf', () => {
    const lang = makeSession(5, {
      id: 'lang',
      type: 'long',
      segments: [{ kind: 'main', repeats: 1, distanceKm: 15 }],
    });
    const locker = makeSession(5, {
      id: 'locker',
      segments: [{ kind: 'main', repeats: 1, distanceKm: 5 }],
    });

    const eintraege = matchPlan([locker, lang], [makeRun(5, 5.2), makeRun(5, 16)], {
      today: heute,
    });

    const nachId = new Map(eintraege.map((e) => [e.session.id, e]));
    assert.equal(nachId.get('lang').run.distanceKm, 16);
    assert.equal(nachId.get('locker').run.distanceKm, 5.2);
    assert.equal(nachId.get('lang').status, 'erfuellt');
    assert.equal(nachId.get('locker').status, 'erfuellt');
  });

  test('nachträglich erfundene Einheiten gelten als erfüllt, bringen aber keine XP', () => {
    const nachtraeglich = makeSession(5, { createdAt: `${day(9)}T20:00:00.000Z` });
    const [eintrag] = matchPlan([nachtraeglich], [makeRun(5, 8)], { today: heute });

    assert.equal(eintrag.status, 'erfuellt');
    assert.equal(eintrag.xp, 0);
  });

  test('ein Ruhetag ohne Lauf ist eingehalten – ohne XP', () => {
    const ruhetag = makeSession(5, { type: 'rest' });
    const [eintrag] = matchPlan([ruhetag], [makeRun(6, 8)], { today: heute });

    assert.equal(eintrag.status, 'erfuellt');
    assert.equal(eintrag.xp, 0);
  });

  test('wer am Ruhetag läuft, hat ihn verpasst', () => {
    const ruhetag = makeSession(5, { type: 'rest' });
    const [eintrag] = matchPlan([ruhetag], [makeRun(5, 8)], { today: heute });

    assert.equal(eintrag.status, 'verpasst');
  });

  test('der Ruhetag von heute ist noch offen', () => {
    const [eintrag] = matchPlan([makeSession(10, { type: 'rest' })], [], { today: heute });
    assert.equal(eintrag.status, 'geplant');
  });

  test('ein Ruhetag verbraucht keinen Lauf für die Einheit daneben', () => {
    const einheiten = [
      makeSession(5, { id: 'ruhe', type: 'rest' }),
      makeSession(5, { id: 'lauf' }),
    ];

    const nachId = new Map(
      matchPlan(einheiten, [makeRun(5, 8)], { today: heute }).map((e) => [e.session.id, e])
    );

    assert.equal(nachId.get('lauf').status, 'erfuellt');
    assert.equal(nachId.get('ruhe').status, 'verpasst');
  });

  test('behält die Reihenfolge der übergebenen Einheiten', () => {
    const einheiten = [makeSession(8, { id: 'spaet' }), makeSession(2, { id: 'frueh' })];
    const eintraege = matchPlan(einheiten, [], { today: heute });

    assert.deepEqual(eintraege.map((e) => e.session.id), ['spaet', 'frueh']);
  });

  test('Läufe ohne brauchbares Datum oder Distanz zählen nicht', () => {
    const kaputt = [
      { id: 'a', date: 'irgendwann', distanceKm: 8 },
      { id: 'b', date: day(5), distanceKm: 0 },
      null,
    ];

    const [eintrag] = matchPlan([makeSession(5)], kaputt, { today: heute });
    assert.equal(eintrag.status, 'verpasst');
  });
});

describe('buildPlanStats', () => {
  const heute = day(10);

  test('zählt Stände und rechnet die Plantreue auf entschiedene Tage', () => {
    const einheiten = [
      makeSession(1, { id: 'a' }), // erfüllt
      makeSession(2, { id: 'b' }), // verpasst
      makeSession(3, { id: 'c' }), // erfüllt
      makeSession(20, { id: 'd' }), // noch offen
    ];
    const laeufe = [makeRun(1, 6), makeRun(3, 6)];

    const stats = buildPlanStats(einheiten, laeufe, { today: heute });

    assert.equal(stats.total, 4);
    assert.equal(stats.fulfilled, 2);
    assert.equal(stats.missed, 1);
    assert.equal(stats.open, 1);
    assert.equal(stats.decided, 3);
    assert.equal(Math.round(stats.adherencePercent), 67);
    assert.equal(stats.xp, 2 * XP_PER_SESSION);
  });

  test('ohne entschiedene Tage gibt es keine Quote statt einer Division durch null', () => {
    const stats = buildPlanStats([makeSession(20)], [], { today: heute });

    assert.equal(stats.decided, 0);
    assert.equal(stats.adherencePercent, 0);
  });

  test('ein leerer Plan bringt keine XP', () => {
    assert.equal(planXp([], [makeRun(1, 10)], { today: heute }), 0);
  });
});

describe('typeLabel', () => {
  test('übersetzt bekannte Arten', () => {
    assert.equal(typeLabel('interval'), 'Intervalle');
    assert.equal(typeLabel('rest'), 'Ruhetag');
  });

  test('gibt Unbekanntes unverändert zurück, statt leer zu bleiben', () => {
    assert.equal(typeLabel('schwimmen'), 'schwimmen');
  });
});
