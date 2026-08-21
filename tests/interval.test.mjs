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

  test('die letzte Zehntelsekunde ist noch nicht das Ende', () => {
    // Genau am Umschaltpunkt greift der Ende-Zweig; eine Wimper davor nicht.
    // Zwischen beiden liegt die Frage, ob die App den Schlusston spielt.
    const kurzDavor = phaseAt(vorgabe, s(269.9));
    assert.equal(kurzDavor.done, false);
    assert.equal(kurzDavor.remainingSeconds, 1);

    assert.equal(phaseAt(vorgabe, s(270)).done, true, 'auf die Sekunde genau ist Schluss');
  });

  test('jede Phase hat eine Beschriftung', () => {
    assert.equal(PHASE_LABEL[WORK], 'Intervall');
    assert.equal(PHASE_LABEL[REST], 'Pause');
  });
});

describe('Vorgaben, die die Prüfung nie durchlassen würde', () => {
  // validateInterval() in training.js verlangt mindestens MIN_PHASE_SECONDS je
  // Phase und mindestens eine Runde. Solche Vorgaben können also nur aus einer
  // von Hand bearbeiteten Sicherung kommen. phaseAt() rechnet trotzdem ohne
  // Division durch null – ein NaN in der Anzeige wäre schwerer zu deuten als
  // ein Ablauf, der einfach durchläuft.

  test('ohne Pause folgt Belastung auf Belastung', () => {
    const ohnePause = { workSeconds: 60, restSeconds: 0, repeats: 2 };

    const zweite = phaseAt(ohnePause, s(60));
    assert.equal(zweite.kind, WORK);
    assert.equal(zweite.repeat, 2, 'die Pause der Länge null wird übersprungen');
    assert.equal(zweite.completedRepeats, 1);
  });

  test('ohne Belastung bleibt nur die Pause', () => {
    const ohneBelastung = { workSeconds: 0, restSeconds: 30, repeats: 2 };

    assert.equal(phaseAt(ohneBelastung, 0).kind, REST);
    assert.equal(phaseAt(ohneBelastung, 0).phaseProgress, 0);
  });

  test('eine Phase der Länge null kommt nie an die Reihe', () => {
    // Das ist der Grund, warum der Fortschritt nie durch null teilt: die
    // Phase mit der Dauer 0 wird gar nicht erst betreten. Fällt dieser Satz,
    // wird phaseProgress zu NaN – deshalb steht er hier als Test und nicht
    // als Kommentar.
    const laeufe = [
      [{ workSeconds: 60, restSeconds: 0, repeats: 3 }, REST],
      [{ workSeconds: 0, restSeconds: 30, repeats: 3 }, WORK],
    ];

    for (const [vorgabe0, verboten] of laeufe) {
      const gesamt = (vorgabe0.workSeconds + vorgabe0.restSeconds) * vorgabe0.repeats;

      for (let sekunde = 0; sekunde < gesamt; sekunde += 0.5) {
        const stand = phaseAt(vorgabe0, s(sekunde));

        assert.notEqual(stand.kind, verboten, `bei ${sekunde} s`);
        assert.equal(Number.isNaN(stand.phaseProgress), false, `bei ${sekunde} s`);
      }
    }
  });

  test('null Runden sind sofort vorbei statt NaN', () => {
    const keine = { workSeconds: 60, restSeconds: 30, repeats: 0 };
    const stand = phaseAt(keine, 0);

    assert.equal(stand.done, true);
    assert.equal(stand.completedRepeats, 0);
    assert.equal(Number.isNaN(stand.phaseProgress), false);
    assert.deepEqual(summarize(keine, s(5)), {
      completedRepeats: 0,
      elapsedSeconds: 0,
      finished: true,
    });
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
