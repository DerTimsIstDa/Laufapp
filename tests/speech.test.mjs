import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  nextAnnouncement,
  announcementText,
  ANNOUNCE_STEP_KM,
  isVoiceSupported,
  isVoiceOn,
  setVoiceOn,
  unlockVoice,
  speak,
  cancelSpeech,
} from '../js/speech.js';

/**
 * Ansagen während des Laufs.
 *
 * Die Rechnung – *was* gesagt wird – ist pur und wird hier an ihren Grenzen
 * geprüft: der erste Kilometer, ein Sprung über zwei, eine stummgeschaltete
 * Strecke dazwischen. Gezählt wird dabei nicht hier: welcher Kilometer voll
 * ist, sagt die Split-Liste des Trackers. Das *Sprechen* läuft gegen eine
 * Attrappe; geprüft wird, was an den Browser gegangen wäre.
 *
 * Was hier **nicht** geprüft werden kann: ob die Ansage auf einem Telefon
 * neben Musik zu hören ist und ob sie bei gesperrtem Bildschirm noch kommt.
 * Das entscheidet das Betriebssystem, und dafür gibt es keine Attrappe.
 */

/** Die Ansage liest die Split-Liste des Trackers: Sekunden je vollem km. */
const nachAnsage = (km) => ({ km, elapsedMs: null, text: '' });

const minuten = (m) => m * 60_000;

describe('nextAnnouncement – wann eine Ansage fällig ist', () => {
  test('vor dem ersten vollen Kilometer schweigt sie', () => {
    assert.equal(nextAnnouncement([]), null);
  });

  test('der erste volle Kilometer wird angesagt', () => {
    const ansage = nextAnnouncement([302]);

    assert.equal(ansage.km, 1);
    assert.equal(ansage.text, 'Ein Kilometer. 5 Minuten 2.');
  });

  test('derselbe Kilometer wird nicht zweimal angesagt', () => {
    assert.equal(nextAnnouncement([302], nachAnsage(1)), null);
  });

  test('der nächste Kilometer wird wieder angesagt', () => {
    const zweite = nextAnnouncement([302, 318], nachAnsage(1));

    assert.equal(zweite.km, 2);
    assert.equal(zweite.text, '2 Kilometer. 5 Minuten 18.');
  });

  test('ein Sprung wird zu einer Ansage zusammengefasst', () => {
    // Nach einem Tunnel trägt der Tracker die übersprungenen Kilometer mit
    // dem Schnitt nach. Zwei Ansagen im selben Atemzug wären Lärm.
    const sprung = nextAnnouncement([302, 360, 360], nachAnsage(1));

    assert.equal(sprung.km, 3);
    assert.equal(sprung.text, '3 Kilometer. 6 Minuten.');
  });

  test('stummgeschaltete Kilometer gehen in den Schnitt ein', () => {
    // Wer mitten im Lauf ausschaltet und später wieder ein: die erste Ansage
    // danach nennt den Schnitt über alles seit der letzten gehörten. Eine
    // Zeit für einen Kilometer, dessen Beginn niemand angesagt hat, wäre
    // erfunden.
    const wieder = nextAnnouncement([300, 300, 300, 360], nachAnsage(1));

    assert.equal(wieder.km, 4);
    assert.equal(wieder.text, '4 Kilometer. 5 Minuten 20.');
  });

  test('eine kürzer gewordene Liste sagt nichts an', () => {
    assert.equal(nextAnnouncement([302], nachAnsage(3)), null);
  });

  test('Unsinn als Eingabe schweigt, statt zu raten', () => {
    for (const eingabe of [null, undefined, {}, 'drei', 5]) {
      assert.equal(nextAnnouncement(eingabe), null, `${JSON.stringify(eingabe)} hat angesagt`);
    }

    assert.equal(nextAnnouncement([NaN]), null, 'NaN kam durch');
  });

  test('die Schrittweite ist ein Kilometer', () => {
    assert.equal(ANNOUNCE_STEP_KM, 1);
  });
});

describe('announcementText – was gesprochen wird', () => {
  test('der erste Kilometer heisst ausgeschrieben, nicht als Ziffer', () => {
    // Eine Sprachausgabe liest die Ziffer als "eins Kilometer".
    assert.equal(announcementText(1, minuten(5)), 'Ein Kilometer. 5 Minuten.');
    assert.equal(announcementText(2, minuten(5)), '2 Kilometer. 5 Minuten.');
  });

  test('Minuten und Sekunden statt einer Uhrzeit', () => {
    // Ein Doppelpunkt läse die Sprachausgabe als Uhrzeit vor.
    assert.equal(announcementText(1, 342_000), 'Ein Kilometer. 5 Minuten 42.');
    assert.equal(announcementText(4, 308_000), '4 Kilometer. 5 Minuten 8.');
  });

  test('volle Minuten sagen keine Null', () => {
    assert.equal(announcementText(3, minuten(6)), '3 Kilometer. 6 Minuten.');
  });

  test('gerundet wird auf ganze Sekunden', () => {
    assert.equal(announcementText(1, 341_600), 'Ein Kilometer. 5 Minuten 42.');
    assert.equal(announcementText(1, 342_400), 'Ein Kilometer. 5 Minuten 42.');
  });

  test('ohne brauchbare Zeit bleibt es bei der Strecke', () => {
    for (const zeit of [0, -1, NaN, Infinity, null]) {
      assert.equal(announcementText(2, zeit), '2 Kilometer.', `${zeit} kam durch`);
    }
  });

  test('unter einer Minute je Kilometer wird nichts behauptet', () => {
    // Das wäre ein GPS-Sprung, kein Tempo. Eine Zahl, die auf dem Bildschirm
    // niemand geglaubt hätte, soll auch niemand gesagt bekommen.
    assert.equal(announcementText(2, 30_000), '2 Kilometer.');
  });
});

describe('Die Sprachausgabe des Browsers', () => {
  const vorherSynth = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
  const vorherUtter = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');

  afterEach(() => {
    if (vorherSynth) Object.defineProperty(globalThis, 'speechSynthesis', vorherSynth);
    else delete globalThis.speechSynthesis;

    if (vorherUtter) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', vorherUtter);
    else delete globalThis.SpeechSynthesisUtterance;

    setVoiceOn(true);
  });

  /** Attrappe. Aufgeschrieben wird, was tatsächlich gesprochen worden wäre. */
  function fakeSpeech({ speakWirft = false } = {}) {
    const gesprochen = [];
    let abbrueche = 0;

    class FakeUtterance {
      constructor(text) {
        this.text = text;
        this.lang = '';
        this.rate = 1;
        this.volume = 1;
      }
    }

    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });

    Object.defineProperty(globalThis, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        speak(satz) {
          if (speakWirft) throw new Error('keine Stimme');
          gesprochen.push(satz);
        },
        cancel() {
          abbrueche += 1;
        },
      },
    });

    return { gesprochen, abbrueche: () => abbrueche };
  }

  test('ohne Sprachausgabe im Browser wird nichts versprochen', () => {
    delete globalThis.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;

    assert.equal(isVoiceSupported(), false);
    assert.equal(speak('Ein Kilometer.'), false);
    assert.equal(unlockVoice(), false);
    assert.doesNotThrow(() => cancelSpeech());
  });

  test('gesprochen wird auf Deutsch und etwas langsamer', () => {
    const synth = fakeSpeech();

    assert.equal(speak('Ein Kilometer. 5 Minuten 42.'), true);
    assert.equal(synth.gesprochen.length, 1);
    assert.equal(synth.gesprochen[0].text, 'Ein Kilometer. 5 Minuten 42.');
    assert.equal(synth.gesprochen[0].lang, 'de-DE');
    assert.ok(synth.gesprochen[0].rate < 1, 'die Voreinstellung ist zu schnell');
  });

  test('eine neue Ansage bricht die alte ab', () => {
    // Beim Laufen zählt die neue Zahl, nicht die von vor zwei Minuten, die
    // noch in der Warteschlange hängt.
    const synth = fakeSpeech();

    speak('Ein Kilometer.');
    speak('2 Kilometer.');

    assert.equal(synth.abbrueche(), 2);
    assert.equal(synth.gesprochen.length, 2);
  });

  test('ausgeschaltet wird nichts gesprochen', () => {
    const synth = fakeSpeech();

    setVoiceOn(false);

    assert.equal(isVoiceOn(), false);
    assert.equal(speak('Ein Kilometer.'), false);
    assert.deepEqual(synth.gesprochen, []);
  });

  test('Ausschalten bricht eine laufende Ansage ab', () => {
    const synth = fakeSpeech();

    speak('Ein Kilometer.');
    const vorher = synth.abbrueche();
    setVoiceOn(false);

    assert.ok(synth.abbrueche() > vorher, 'die laufende Ansage lief weiter');
  });

  test('leerer Text wird nicht gesprochen', () => {
    const synth = fakeSpeech();

    assert.equal(speak(''), false);
    assert.equal(speak(null), false);
    assert.deepEqual(synth.gesprochen, []);
  });

  test('das Wecken spricht lautlos', () => {
    // Nur so erteilt iOS die Erlaubnis. Gehört werden soll dabei nichts.
    const synth = fakeSpeech();

    assert.equal(unlockVoice(), true);
    assert.equal(synth.gesprochen.length, 1);
    assert.equal(synth.gesprochen[0].volume, 0);
  });

  test('ein Browser, der beim Sprechen wirft, reisst nichts mit', () => {
    fakeSpeech({ speakWirft: true });

    assert.equal(speak('Ein Kilometer.'), false);
    assert.equal(unlockVoice(), false);
  });
});
