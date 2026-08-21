import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadRuns, addRun, updateRun, removeRun, replaceRuns, saveRuns,
  loadSessions, addSession, updateSession, removeSession, replaceSessions,
  loadGpsPreference, saveGpsPreference,
  loadVoicePreference, saveVoicePreference,
  loadLastExport, saveLastExport,
  saveExerciseLog, saveSessions, saveExercisePlan, saveProfile,
  setStorageErrorHandler,
} from '../js/storage.js';
import { getProgress, totalXpFromRuns } from '../js/xp.js';
import { evaluateAchievements, achievementXp } from '../js/achievements.js';
import { titleForLevel } from '../js/titles.js';
import { validateRun } from '../js/validation.js';
import { installFakeLocalStorage } from './helpers.mjs';

let store;

beforeEach(() => {
  store = installFakeLocalStorage();
});

afterEach(() => {
  store.restore();
});

/** Der komplette abgeleitete Zustand – genau das, was die Anzeige zeigt. */
function derive(runs) {
  const achievements = evaluateAchievements(runs);
  const totalXp = totalXpFromRuns(runs) + achievementXp(achievements);
  const progress = getProgress(totalXp);

  return {
    totalXp,
    level: progress.level,
    title: titleForLevel(progress.level),
    unlocked: achievements.filter((a) => a.unlocked).map((a) => a.id).sort(),
  };
}

describe('addRun', () => {
  test('legt an, vergibt eine id und schreibt in den Speicher', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });

    assert.equal(runs.length, 1);
    assert.ok(runs[0].id.length > 0);
    assert.deepEqual(store.read(), runs);
  });

  test('optionale Felder nur, wenn gefüllt', () => {
    const [ohne] = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.deepEqual(Object.keys(ohne).sort(), ['date', 'distanceKm', 'id']);

    const [mit] = addRun([], {
      distanceKm: 5,
      date: '2026-08-14',
      timeOfDay: '06:30',
      durationMinutes: 28,
      source: 'gps',
    });
    assert.equal(mit.timeOfDay, '06:30');
    assert.equal(mit.durationMinutes, 28);
    assert.equal(mit.source, 'gps');
  });

  test('sortiert neueste zuerst', () => {
    let runs = addRun([], { distanceKm: 5, date: '2026-08-10' });
    runs = addRun(runs, { distanceKm: 6, date: '2026-08-14' });
    runs = addRun(runs, { distanceKm: 7, date: '2026-08-12' });

    assert.deepEqual(runs.map((r) => r.date), ['2026-08-14', '2026-08-12', '2026-08-10']);
  });
});

describe('updateRun', () => {
  test('ändert Distanz und Datum und speichert', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    const id = runs[0].id;

    const next = updateRun(runs, id, { distanceKm: 12, date: '2026-08-01' });

    assert.equal(next[0].id, id, 'die id bleibt');
    assert.equal(next[0].distanceKm, 12);
    assert.equal(next[0].date, '2026-08-01');
    assert.deepEqual(store.read(), next);
  });

  test('geleerte Felder verschwinden wirklich', () => {
    const runs = addRun([], {
      distanceKm: 5,
      date: '2026-08-14',
      timeOfDay: '06:30',
      durationMinutes: 28,
      note: 'Regen',
      feeling: 2,
    });

    const next = updateRun(runs, runs[0].id, { distanceKm: 5, date: '2026-08-14' });

    assert.equal('timeOfDay' in next[0], false);
    assert.equal('durationMinutes' in next[0], false);
    assert.equal('note' in next[0], false);
    assert.equal('feeling' in next[0], false);
  });

  test('Notiz und Gefühl überleben das Bearbeiten', () => {
    // updateRun zählt die Felder einzeln auf, statt den Lauf zu übernehmen.
    // Ein vergessenes Feld wäre nach dem ersten Bearbeiten stillschweigend
    // weg – der Fehler, den man erst bemerkt, wenn die Notiz fehlt.
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14', note: 'Regen', feeling: 2 });

    const next = updateRun(runs, runs[0].id, {
      distanceKm: 6,
      date: '2026-08-14',
      note: 'Doch trocken geblieben',
      feeling: 4,
    });

    assert.equal(next[0].note, 'Doch trocken geblieben');
    assert.equal(next[0].feeling, 4);
    assert.deepEqual(store.read(), next);
  });

  test('ein aufgezeichneter Lauf bleibt als GPS-Lauf erkennbar', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14', source: 'gps' });
    const next = updateRun(runs, runs[0].id, { distanceKm: 5.2, date: '2026-08-14' });

    assert.equal(next[0].source, 'gps');
  });

  test('die aufgezeichnete Route überlebt das Bearbeiten', () => {
    // Das Formular kennt die Route nicht – sie darf trotzdem nicht verloren
    // gehen, nur weil jemand die Distanz korrigiert.
    const track = [[52.5, 13.4], [52.51, 13.41]];
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14', source: 'gps', track });

    const next = updateRun(runs, runs[0].id, { distanceKm: 5.2, date: '2026-08-10' });

    assert.deepEqual(next[0].track, track);
  });

  test('sortiert nach einer Datumsänderung neu', () => {
    let runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    runs = addRun(runs, { distanceKm: 6, date: '2026-08-10' });

    const aeltester = runs[1].id;
    const next = updateRun(runs, aeltester, { distanceKm: 6, date: '2026-08-20' });

    assert.equal(next[0].id, aeltester, 'der bearbeitete Lauf steht jetzt vorn');
  });

  test('unbekannte id lässt alles unverändert', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.equal(updateRun(runs, 'gibt-es-nicht', { distanceKm: 9, date: '2026-01-01' }), runs);
  });
});

/**
 * Der Weg vom Formular in den Speicher, an seiner schmalsten Stelle.
 *
 * `addRun` und `updateRun` zählen die Felder einzeln auf, statt den geprüften
 * Lauf zu übernehmen – aus gutem Grund: nur so verschwindet ein geleertes
 * Feld auch wirklich. Der Preis ist, dass ein neues Feld an drei Stellen
 * gepflegt werden muss und beim Vergessen **stillschweigend** verlorengeht:
 * kein Fehler, keine Meldung, der Lauf wird gespeichert – nur eben ohne.
 *
 * Genau das ist bei C2 passiert. `validateRun` und `updateRun` kannten die
 * Notiz, `addRun` nicht; die Tests waren grün, weil keiner den ganzen Weg
 * geprüft hat. Gefunden hat es erst der Browser.
 *
 * Diese zwei Tests kennen keine Feldliste – sie fragen `validateRun`, was ein
 * Lauf haben darf, und wachsen damit von allein mit.
 */
describe('Kein Feld geht auf dem Weg in den Speicher verloren', () => {
  /** Ein Lauf mit jedem optionalen Feld, das validateRun kennt. */
  const vollstaendig = () => {
    const geprueft = validateRun({
      distanceKm: 8.4,
      date: '2026-08-20',
      timeOfDay: '06:30',
      durationMinutes: 52,
      paceMinPerKm: '6:12',
      note: 'Gegenwind auf dem Rückweg',
      feeling: 4,
      weather: 'wolken',
      source: 'manual',
    });

    assert.equal(geprueft.ok, true, 'die Vorlage selbst muss gültig sein');
    // Wäre hier nur das Pflichtfeld übrig, prüften die Tests unten nichts.
    assert.ok(Object.keys(geprueft.run).length >= 9, 'die Vorlage deckt zu wenige Felder ab');
    return geprueft.run;
  };

  test('addRun speichert jedes Feld, das validateRun durchlässt', () => {
    const geprueft = vollstaendig();
    const [gespeichert] = addRun([], geprueft);

    for (const feld of Object.keys(geprueft)) {
      assert.deepEqual(gespeichert[feld], geprueft[feld], `${feld} ging beim Anlegen verloren`);
    }
  });

  test('updateRun behält jedes Feld, das validateRun durchlässt', () => {
    const geprueft = vollstaendig();
    const runs = addRun([], { distanceKm: 1, date: '2026-08-20' });
    const [gespeichert] = updateRun(runs, runs[0].id, geprueft);

    for (const feld of Object.keys(geprueft)) {
      if (feld === 'source') continue; // die stammt vom bestehenden Lauf, nicht vom Formular
      assert.deepEqual(gespeichert[feld], geprueft[feld], `${feld} ging beim Bearbeiten verloren`);
    }
  });
});

describe('removeRun und replaceRuns', () => {
  test('Löschen entfernt genau einen Lauf', () => {
    let runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    runs = addRun(runs, { distanceKm: 6, date: '2026-08-10' });

    const next = removeRun(runs, runs[0].id);

    assert.equal(next.length, 1);
    assert.deepEqual(store.read(), next);
  });

  test('replaceRuns überschreibt den Bestand und sortiert', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    const importiert = [
      { id: 'i1', distanceKm: 3, date: '2026-01-01' },
      { id: 'i2', distanceKm: 4, date: '2026-06-01' },
    ];

    const next = replaceRuns(importiert);

    assert.equal(next.length, 2);
    assert.deepEqual(next.map((r) => r.id), ['i2', 'i1']);
    assert.equal(next.some((r) => r.id === runs[0].id), false, 'alter Bestand ist weg');
    assert.deepEqual(store.read(), next);
  });
});

describe('loadRuns', () => {
  test('leerer Speicher ergibt eine leere Liste', () => {
    assert.deepEqual(loadRuns(), []);
  });

  test('liest Gespeichertes zurück', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.deepEqual(loadRuns(), runs);
  });

  test('kaputter Inhalt führt nicht zum Absturz', () => {
    localStorage.setItem('laufapp.runs.v1', '{kein json');
    assert.deepEqual(loadRuns(), []);

    localStorage.setItem('laufapp.runs.v1', '{"nicht":"array"}');
    assert.deepEqual(loadRuns(), []);
  });

  test('unbrauchbare Einträge werden aussortiert', () => {
    localStorage.setItem(
      'laufapp.runs.v1',
      JSON.stringify([
        { id: 'gut', distanceKm: 5, date: '2026-08-14' },
        { id: 'negativ', distanceKm: -1, date: '2026-08-13' },
        null,
      ])
    );

    assert.deepEqual(loadRuns().map((r) => r.id), ['gut']);
  });
});

describe('Neuberechnung nach dem Bearbeiten', () => {
  test('mehr Distanz hebt XP, Level und Titel', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    const vorher = derive(runs);

    const next = updateRun(runs, runs[0].id, { distanceKm: 300, date: '2026-08-14' });
    const nachher = derive(next);

    assert.equal(vorher.totalXp, 65, '50 aus dem Lauf plus 15 für Erste Meile');
    assert.equal(
      nachher.totalXp,
      3475,
      '3000 aus dem Lauf, 15 Erste Meile, 375 aus den Clubs bis 250 km, ' +
        '85 aus Die Zehn und Die Fünfzehn'
    );
    assert.ok(nachher.level > vorher.level);
    assert.ok(nachher.unlocked.includes('club-50-km'));
    assert.ok(nachher.unlocked.includes('club-250-km'));
    assert.equal(nachher.unlocked.includes('club-500-km'), false, '300 km reichen dafür nicht');
  });

  test('weniger Distanz sperrt ein Achievement wieder und senkt das Level', () => {
    const runs = addRun([], { distanceKm: 60, date: '2026-08-14' });
    assert.ok(derive(runs).unlocked.includes('club-50-km'));

    const next = updateRun(runs, runs[0].id, { distanceKm: 10, date: '2026-08-14' });
    const nachher = derive(next);

    assert.equal(nachher.unlocked.includes('club-50-km'), false);
    assert.equal(
      nachher.totalXp,
      165,
      '100 aus dem Lauf, 15 Erste Meile, 20 der 10-km-Club, 30 Die Zehn'
    );
  });

  test('ein geändertes Datum kann eine Serie zerreißen', () => {
    let runs = [];
    for (let i = 0; i < 7; i++) {
      runs = addRun(runs, { distanceKm: 3, date: `2026-03-0${i + 1}` });
    }
    assert.ok(derive(runs).unlocked.includes('serientaeter'), '7 Tage in Folge');

    const mittlerer = runs.find((run) => run.date === '2026-03-04');
    const next = updateRun(runs, mittlerer.id, { distanceKm: 3, date: '2026-09-01' });

    assert.equal(derive(next).unlocked.includes('serientaeter'), false, 'Lücke bricht die Serie');
  });

  test('eine Uhrzeit nachtragen schaltet Frühaufsteher frei', () => {
    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });
    assert.equal(derive(runs).unlocked.includes('fruehaufsteher'), false);

    const next = updateRun(runs, runs[0].id, {
      distanceKm: 5,
      date: '2026-08-14',
      timeOfDay: '05:45',
    });

    assert.ok(derive(next).unlocked.includes('fruehaufsteher'));
  });

  test('nach dem Import gilt allein der importierte Bestand', () => {
    let runs = addRun([], { distanceKm: 500, date: '2026-08-14' });
    assert.ok(derive(runs).unlocked.includes('club-500-km'));

    runs = replaceRuns([{ id: 'i1', distanceKm: 2, date: '2026-01-01' }]);
    const nachher = derive(runs);

    assert.deepEqual(nachher.unlocked, ['erste-meile']);
    assert.equal(nachher.totalXp, 35, '20 aus dem Lauf plus 15 für Erste Meile');
    assert.equal(nachher.level, 1);
  });
});

describe('Trainingsplan im Speicher', () => {
  test('legt eine Einheit an, vergibt id und createdAt', () => {
    const sessions = addSession([], { date: '2026-08-20', type: 'easy', segments: [] });

    assert.equal(sessions.length, 1);
    assert.ok(sessions[0].id);
    assert.ok(sessions[0].createdAt, 'ohne createdAt liesse sich Plantreue nicht prüfen');
    assert.deepEqual(store.read('laufapp.training.v1'), sessions);
  });

  test('sortiert vorwärts – der nächste Termin steht oben', () => {
    let sessions = addSession([], { date: '2026-08-25', type: 'easy', segments: [] });
    sessions = addSession(sessions, { date: '2026-08-20', type: 'long', segments: [] });

    assert.deepEqual(sessions.map((s) => s.date), ['2026-08-20', '2026-08-25']);
  });

  test('liest den Bestand zurück und wirft Unbrauchbares weg', () => {
    addSession([], { date: '2026-08-20', type: 'easy', segments: [] });
    assert.equal(loadSessions().length, 1);

    localStorage.setItem(
      'laufapp.training.v1',
      JSON.stringify([{ id: 'a', date: '2026-08-20', type: 'easy' }, null, { date: 'x' }])
    );

    assert.equal(loadSessions().length, 1);
  });

  test('Bearbeiten behält id und createdAt', () => {
    const sessions = addSession([], { date: '2026-08-20', type: 'easy', segments: [] });
    const { id, createdAt } = sessions[0];

    const next = updateSession(sessions, id, {
      date: '2026-08-21',
      type: 'tempo',
      segments: [{ kind: 'main', repeats: 1, distanceKm: 8 }],
    });

    assert.equal(next[0].id, id);
    assert.equal(next[0].createdAt, createdAt, 'sonst würde Bearbeiten Plantreue erschleichen');
    assert.equal(next[0].type, 'tempo');
  });

  test('Bearbeiten einer unbekannten id ändert nichts', () => {
    const sessions = addSession([], { date: '2026-08-20', type: 'easy', segments: [] });
    const next = updateSession(sessions, 'gibt-es-nicht', { date: '2026-09-01', type: 'long' });

    assert.equal(next, sessions);
  });

  test('Löschen entfernt nur die gewählte Einheit', () => {
    let sessions = addSession([], { date: '2026-08-20', type: 'easy', segments: [] });
    sessions = addSession(sessions, { date: '2026-08-22', type: 'long', segments: [] });

    const next = removeSession(sessions, sessions[0].id);

    assert.equal(next.length, 1);
    assert.equal(next[0].date, '2026-08-22');
    assert.deepEqual(store.read('laufapp.training.v1'), next);
  });

  test('der Import ersetzt den ganzen Plan', () => {
    addSession([], { date: '2026-08-20', type: 'easy', segments: [] });

    const next = replaceSessions([{ id: 'i1', date: '2026-09-01', type: 'long', segments: [] }]);

    assert.deepEqual(next.map((s) => s.id), ['i1']);
    assert.deepEqual(store.read('laufapp.training.v1'), next);
  });
});

describe('Intervall-Vorgabe im Speicher', () => {
  const vorgabe = { workSeconds: 90, restSeconds: 45, repeats: 6 };

  test('bleibt beim Anlegen erhalten', () => {
    const [einheit] = addSession([], {
      date: '2026-08-19',
      type: 'interval',
      segments: [],
      interval: vorgabe,
    });

    assert.deepEqual(einheit.interval, vorgabe);
  });

  test('bleibt beim Ändern erhalten', () => {
    let einheiten = addSession([], { date: '2026-08-19', type: 'interval', segments: [], interval: vorgabe });
    const geaendert = { ...vorgabe, repeats: 10 };

    einheiten = updateSession(einheiten, einheiten[0].id, {
      date: '2026-08-20',
      type: 'interval',
      segments: [],
      interval: geaendert,
    });

    assert.deepEqual(einheiten[0].interval, geaendert);
  });

  test('ohne Vorgabe steht das Feld nicht im Datensatz', () => {
    const [einheit] = addSession([], { date: '2026-08-19', type: 'easy', segments: [] });
    assert.equal('interval' in einheit, false);
  });
});

describe('Gemerkte Aufzeichnungsart', () => {
  test('beim allerersten Mal ohne GPS', () => {
    // Wichtig auf jedem Gerät: ein voreingestelltes "mit GPS" liesse das
    // Betriebssystem schon beim Aufmachen nach dem Standort fragen.
    assert.equal(loadGpsPreference(), false);
  });

  test('die letzte Wahl kommt zurück', () => {
    saveGpsPreference(true);
    assert.equal(loadGpsPreference(), true);

    saveGpsPreference(false);
    assert.equal(loadGpsPreference(), false);
  });

  test('kaputter Eintrag gilt als "ohne GPS"', () => {
    localStorage.setItem('laufapp.recording.v1', '{kein json');
    assert.equal(loadGpsPreference(), false);
  });

  test('nur ein echtes true zählt', () => {
    localStorage.setItem('laufapp.recording.v1', JSON.stringify({ gps: 'ja' }));
    assert.equal(loadGpsPreference(), false);
  });
});

/**
 * Was passiert, wenn der Speicher nicht mehr mitspielt.
 *
 * Der Fall ist nicht theoretisch: eine Stunde GPS sind ein paar tausend Punkte,
 * gespeichert werden bis zu 500 je Lauf, und der localStorage fasst nur wenige
 * Megabyte. Irgendwann ist Schluss – und dann darf der gerade beendete Lauf
 * nicht stillschweigend verschwinden.
 */
describe('Schreibfehler', () => {
  /** Sammelt, was die Meldestelle zu sehen bekommt. */
  function melderMitProtokoll() {
    const gemeldet = [];
    setStorageErrorHandler((info) => gemeldet.push(info));
    return gemeldet;
  }

  afterEach(() => {
    setStorageErrorHandler(null);
  });

  test('saveRuns meldet false statt still zu scheitern', () => {
    store.failWrites();
    assert.equal(saveRuns([{ id: 'a', distanceKm: 5, date: '2026-08-14' }]), false);
  });

  test('bei heilem Speicher meldet saveRuns true', () => {
    assert.equal(saveRuns([{ id: 'a', distanceKm: 5, date: '2026-08-14' }]), true);
  });

  test('die Meldestelle erfährt, was nicht gespeichert wurde', () => {
    const gemeldet = melderMitProtokoll();
    store.failWrites();

    saveRuns([]);

    assert.equal(gemeldet.length, 1);
    assert.equal(gemeldet[0].key, 'laufapp.runs.v1');
    assert.equal(gemeldet[0].was, 'Die Läufe');
    assert.equal(gemeldet[0].voll, true, 'ein QuotaExceededError muss als "voll" ankommen');
  });

  test('ein anderer Fehler gilt nicht als voller Speicher', () => {
    // Im Privatmodus ist der Speicher gesperrt, nicht voll. Stünde in der
    // Meldung "Speicher voll", schickte sie den Nutzer Läufe löschen – und das
    // hilft dort gar nichts.
    const gemeldet = melderMitProtokoll();
    store.failWrites(new TypeError('localStorage ist gesperrt'));

    saveRuns([]);

    assert.equal(gemeldet[0].voll, false);
  });

  test('jeder Topf meldet sich mit eigenem Namen', () => {
    const gemeldet = melderMitProtokoll();
    store.failWrites();

    saveRuns([]);
    saveExerciseLog([]);
    saveSessions([]);
    saveExercisePlan([]);
    saveGpsPreference(true);

    assert.deepEqual(
      gemeldet.map((info) => info.was),
      ['Die Läufe', 'Die erledigten Übungen', 'Der Trainingsplan', 'Der Übungsplan', 'Die Aufzeichnungsart']
    );
  });

  test('auch das Löschen des Profils meldet sich', () => {
    // saveProfile räumt den Schlüssel weg, statt eine leere Hülle abzulegen –
    // dieser Weg darf nicht am try/catch vorbeilaufen.
    const gemeldet = melderMitProtokoll();
    store.failWrites();

    saveProfile({ name: '', weeklyGoal: 0, goalSince: null });

    assert.equal(gemeldet.length, 1);
    assert.equal(gemeldet[0].was, 'Das Profil');
  });

  test('ohne Meldestelle wird trotzdem nichts geworfen', () => {
    // Der Aufrufer darf nie mitgerissen werden: ein nicht abgefangener Fehler
    // im Speichern liesse die halbe Oberfläche stehen.
    store.failWrites();
    assert.doesNotThrow(() => saveRuns([]));
  });

  test('eine kaputte Meldestelle reisst den Aufrufer nicht mit', () => {
    setStorageErrorHandler(() => {
      throw new Error('die Anzeige ist selbst kaputt');
    });
    store.failWrites();

    assert.doesNotThrow(() => saveRuns([]));
  });

  test('addRun gibt die Liste auch dann zurück, wenn nicht geschrieben wurde', () => {
    // Sonst stünde der gerade beendete Lauf nicht einmal mehr auf dem Schirm –
    // im Speicher verloren und aus der Anzeige verschwunden.
    store.failWrites();

    const runs = addRun([], { distanceKm: 5, date: '2026-08-14' });

    assert.equal(runs.length, 1);
    assert.equal(runs[0].distanceKm, 5);
  });
});

describe('Ansagen ein und aus', () => {
  test('voreingestellt an – auch ohne gespeicherten Stand', () => {
    // Anders als beim GPS löst hier nichts eine Systemabfrage aus, und der
    // Schalter steht sichtbar in der Karte, bevor jemand startet.
    assert.equal(loadVoicePreference(), true);
  });

  test('aus bleibt aus, an bleibt an', () => {
    assert.equal(saveVoicePreference(false), false);
    assert.equal(loadVoicePreference(), false);

    assert.equal(saveVoicePreference(true), true);
    assert.equal(loadVoicePreference(), true);
  });

  test('zwei Schalter, ein Speicherplatz – keiner löscht den anderen', () => {
    // Beide liegen unter laufapp.recording.v1. Wer nur seinen eigenen Wert
    // hineinschreibt, wirft den anderen weg – ohne Fehler, ohne Meldung.
    saveGpsPreference(true);
    saveVoicePreference(false);

    assert.equal(loadGpsPreference(), true, 'die Aufzeichnungsart ging verloren');
    assert.equal(loadVoicePreference(), false);

    // Und in der anderen Reihenfolge.
    saveVoicePreference(true);
    saveGpsPreference(false);

    assert.equal(loadVoicePreference(), true, 'der Ansage-Schalter ging verloren');
    assert.equal(loadGpsPreference(), false);
  });

  test('beide stehen wirklich in einem Eintrag', () => {
    saveGpsPreference(true);
    saveVoicePreference(false);

    assert.deepEqual(store.read('laufapp.recording.v1'), { gps: true, voice: false });
  });

  test('kaputter Inhalt wirft nicht, sondern fällt auf die Vorgabe zurück', () => {
    for (const müll of ['kein json', '"text"', 'null', '[]', '42']) {
      localStorage.setItem('laufapp.recording.v1', müll);

      assert.equal(loadVoicePreference(), true, `${müll} hat die Vorgabe verändert`);
      assert.equal(loadGpsPreference(), false, `${müll} hat GPS eingeschaltet`);
    }
  });
});

describe('Tag der letzten Sicherung', () => {
  test('ohne Eintrag ist die Antwort null, nicht heute', () => {
    // "Heute" hiesse: eine frisch eingerichtete App behauptet, sie sei
    // gesichert. Genau der Fall, in dem die Erinnerung gebraucht wird.
    assert.equal(loadLastExport(), null);
  });

  test('schreiben und wieder lesen', () => {
    assert.equal(saveLastExport('2026-08-21'), '2026-08-21');
    assert.equal(loadLastExport(), '2026-08-21');
  });

  test('landet unter dem eigenen Schluessel', () => {
    saveLastExport('2026-08-21');
    assert.deepEqual(store.read('laufapp.export.v1'), { lastExport: '2026-08-21' });
  });

  test('ueberschreibt den vorherigen Tag', () => {
    saveLastExport('2026-01-01');
    saveLastExport('2026-08-21');
    assert.equal(loadLastExport(), '2026-08-21');
  });

  test('nimmt nur einen ISO-Tag an', () => {
    for (const wert of [undefined, null, '', '21.08.2026', '2026-8-1', 20260821, {}]) {
      assert.equal(saveLastExport(wert), null, `${JSON.stringify(wert)} durfte nicht durch`);
    }
    assert.equal(loadLastExport(), null, 'nichts davon wurde geschrieben');
  });

  test('kaputter Eintrag gilt als nie gesichert', () => {
    localStorage.setItem('laufapp.export.v1', '{kein json');
    assert.equal(loadLastExport(), null);

    localStorage.setItem('laufapp.export.v1', JSON.stringify({ lastExport: 'neulich' }));
    assert.equal(loadLastExport(), null);

    localStorage.setItem('laufapp.export.v1', JSON.stringify({ lastExport: 42 }));
    assert.equal(loadLastExport(), null);
  });

  test('ein fehlgeschlagenes Schreiben wird gemeldet', () => {
    const meldungen = [];
    setStorageErrorHandler((info) => meldungen.push(info));
    store.failWrites();

    saveLastExport('2026-08-21');

    assert.equal(meldungen.length, 1);
    assert.equal(meldungen[0].key, 'laufapp.export.v1');
    assert.equal(meldungen[0].voll, true);
    setStorageErrorHandler(null);
  });
});
