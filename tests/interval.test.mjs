import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { phaseAt, summarize, WORK, REST, PHASE_LABEL } from '../js/interval.js';

/** 3 Runden: 60 s Belastung, 30 s Pause – ein Zyklus dauert 90 s. */
const vorgabe = { workSeconds: 60, restSeconds: 30, repeats: 3 };

/** Sekunden als Millisekunden – die Maschine rechnet in ms. */
const s = (sekunden) => sekunden * 1000;

describe('phaseAt', () => {
  test('beginnt mit der Belastung', () => {
    const stand = phaseAt(vorgabe, 0);

    assert.equal(stand.kind, WORK);
    assert.equal(stand.repeat, 1);
    assert.equal(stand.repeats, 3);
    assert.equal(stand.remainingSeconds, 60);
    assert.equal(stand.phaseProgress, 0);
    assert.equal(stand.done, false);
  });

  test('der Rest zählt herunter', () => {
    assert.equal(phaseAt(vorgabe, s(1)).remainingSeconds, 59);
    assert.equal(phaseAt(vorgabe, s(59)).remainingSeconds, 1);
  });

  test('eine angebrochene Sekunde zählt noch', () => {
    // Solange etwas übrig ist, steht dort nicht schon die 0.
    assert.equal(phaseAt(vorgabe, s(59.5)).remainingSeconds, 1);
  });

  test('nach der Belastung kommt die Pause', () => {
    const stand = phaseAt(vorgabe, s(60));

    assert.equal(stand.kind, REST);
    assert.equal(stand.repeat, 1, 'noch dieselbe Runde');
    assert.equal(stand.remainingSeconds, 30);
  });

  test('nach der Pause beginnt die nächste Runde', () => {
    const stand = phaseAt(vorgabe, s(90));

    assert.equal(stand.kind, WORK);
    assert.equal(stand.repeat, 2);
  });

  test('der Fortschritt läuft je Phase von 0 nach 1', () => {
    assert.equal(phaseAt(vorgabe, s(30)).phaseProgress, 0.5);
    assert.equal(phaseAt(vorgabe, s(75)).phaseProgress, 0.5, 'auch in der Pause');
  });

  test('die Vorschau nennt die nächste Phase und ihre Dauer', () => {
    const belastung = phaseAt(vorgabe, s(10));
    assert.equal(belastung.nextKind, REST);
    assert.equal(belastung.nextSeconds, 30);

    const pause = phaseAt(vorgabe, s(70));
    assert.equal(pause.nextKind, WORK);
    assert.equal(pause.nextSeconds, 60);
  });

  test('in der letzten Pause kommt nichts mehr', () => {
    // Daraus macht die Anzeige das "Fertig".
    const letzte = phaseAt(vorgabe, s(250));

    assert.equal(letzte.kind, REST);
    assert.equal(letzte.repeat, 3);
    assert.equal(letzte.nextKind, null);
    assert.equal(letzte.nextSeconds, 0);
  });

  test('am Ende ist Schluss', () => {
    const stand = phaseAt(vorgabe, s(270));

    assert.equal(stand.done, true);
    assert.equal(stand.remainingSeconds, 0);
    assert.equal(stand.completedRepeats, 3);
  });

  test('darüber hinaus bleibt es beim Ende', () => {
    assert.equal(phaseAt(vorgabe, s(9999)).done, true);
  });

  test('negative Zeit wird wie der Start behandelt', () => {
    const stand = phaseAt(vorgabe, s(-5));

    assert.equal(stand.kind, WORK);
    assert.equal(stand.repeat, 1);
  });

  test('eine einzige Runde läuft auch', () => {
    const eine = { workSeconds: 20, restSeconds: 10, repeats: 1 };

    assert.equal(phaseAt(eine, s(5)).nextKind, REST);
    assert.equal(phaseAt(eine, s(25)).nextKind, null, 'danach kommt nichts');
    assert.equal(phaseAt(eine, s(30)).done, true);
  });

  test('jede Phase hat eine Beschriftung', () => {
    assert.equal(PHASE_LABEL[WORK], 'Intervall');
    assert.equal(PHASE_LABEL[REST], 'Pause');
  });
});

describe('summarize', () => {
  test('zählt nur vollständige Runden', () => {
    // Mitten in Runde 2 abgebrochen: eine ist geschafft, nicht zwei.
    const bilanz = summarize(vorgabe, s(100));

    assert.equal(bilanz.completedRepeats, 1);
    assert.equal(bilanz.elapsedSeconds, 100);
    assert.equal(bilanz.finished, false);
  });

  test('am Ende sind alle Runden geschafft', () => {
    const bilanz = summarize(vorgabe, s(270));

    assert.equal(bilanz.completedRepeats, 3);
    assert.equal(bilanz.elapsedSeconds, 270);
    assert.equal(bilanz.finished, true);
  });

  test('die Zeit wird auf die Gesamtdauer gedeckelt', () => {
    // Läuft der Takt einmal zu spät, soll daraus keine längere Zeit werden.
    assert.equal(summarize(vorgabe, s(400)).elapsedSeconds, 270);
  });

  test('ein sofortiger Abbruch ergibt keine Runde', () => {
    const bilanz = summarize(vorgabe, s(3));

    assert.equal(bilanz.completedRepeats, 0);
    assert.equal(bilanz.finished, false);
  });
});
