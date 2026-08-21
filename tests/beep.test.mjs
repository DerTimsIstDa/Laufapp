import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Signaltöne der Intervall-Stoppuhr.
 *
 * beep.js hält seinen AudioContext in einer Modulvariablen – er wird genau
 * einmal erzeugt und danach wiederverwendet. Ein Test, der einen anderen
 * Ausgangszustand braucht (kein Audio, gesperrtes Audio), muss das Modul
 * deshalb frisch laden; das erledigt `ladeBeep()` über eine eindeutige
 * Import-Adresse.
 */

let zaehler = 0;
const vorher = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');

afterEach(() => {
  if (vorher) Object.defineProperty(globalThis, 'AudioContext', vorher);
  else delete globalThis.AudioContext;
});

/**
 * Web-Audio-Attrappe. Aufgeschrieben wird, was tatsächlich geklungen hätte:
 * je Ton die Frequenz, wann er beginnt und wann er endet.
 */
function fakeAudio({ state = 'running', konstruktorWirft = false } = {}) {
  const kontexte = [];
  const toene = [];
  const rampen = [];

  class FakeAudioContext {
    constructor() {
      if (konstruktorWirft) throw new Error('kein Audio auf diesem Gerät');

      this.state = state;
      this.currentTime = 100; // nicht 0 – sonst fiele ein fehlender Versatz nicht auf
      this.destination = { name: 'destination' };
      this.resumeAufrufe = 0;
      kontexte.push(this);
    }

    resume() {
      this.resumeAufrufe += 1;
      this.state = 'running';
      return Promise.resolve();
    }

    createOscillator() {
      const ton = { frequency: null, start: null, stop: null };
      toene.push(ton);

      return {
        set type(v) { ton.type = v; },
        frequency: { set value(v) { ton.frequency = v; } },
        connect: (ziel) => ziel,
        start: (zeit) => { ton.start = zeit; },
        stop: (zeit) => { ton.stop = zeit; },
      };
    }

    createGain() {
      return {
        gain: {
          setValueAtTime: (wert, zeit) => rampen.push(['set', wert, zeit]),
          exponentialRampToValueAtTime: (wert, zeit) => rampen.push(['ramp', wert, zeit]),
        },
        connect: (ziel) => ziel,
      };
    }
  }

  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    writable: true,
    value: FakeAudioContext,
  });

  return { kontexte, toene, rampen };
}

/** Lädt beep.js mit leerem Modulzustand. */
async function ladeBeep(optionen) {
  const audio = fakeAudio(optionen);
  const beep = await import(`../js/beep.js?frisch=${zaehler++}`);

  return { ...audio, beep };
}

describe('Ton an oder aus', () => {
  test('der Ton ist von Haus aus an', async () => {
    const { beep } = await ladeBeep();

    assert.equal(beep.isSoundOn(), true);
  });

  test('ausschalten und wieder einschalten', async () => {
    const { beep } = await ladeBeep();

    assert.equal(beep.setSoundOn(false), false);
    assert.equal(beep.isSoundOn(), false);

    assert.equal(beep.setSoundOn(true), true);
    assert.equal(beep.isSoundOn(), true);
  });

  test('alles, was nicht wahr ist, schaltet aus', async () => {
    // Der Wert kommt aus einer Checkbox oder aus dem Speicher und ist nicht
    // zwingend ein Boolean.
    const { beep } = await ladeBeep();

    for (const wert of [0, '', null, undefined]) {
      assert.equal(beep.setSoundOn(wert), false, String(wert));
    }
    assert.equal(beep.setSoundOn('ja'), true, 'ein nicht leerer Text zählt als an');
  });

  test('ausgeschaltet klingt nichts', async () => {
    const { beep, toene } = await ladeBeep();

    beep.setSoundOn(false);
    beep.beepWork();
    beep.beepRest();
    beep.beepFinish();

    assert.equal(toene.length, 0);
  });
});

describe('Die drei Signale', () => {
  test('der Start der Belastung sind zwei helle Töne', async () => {
    const { beep, toene } = await ladeBeep();

    beep.beepWork();

    assert.equal(toene.length, 2);
    assert.ok(toene[1].frequency > toene[0].frequency, 'der zweite Ton liegt höher');
    assert.ok(toene[1].start > toene[0].start, 'und kommt später');
  });

  test('die Pause ist ein einzelner tiefer Ton', async () => {
    const { beep, toene } = await ladeBeep();

    beep.beepRest();

    assert.equal(toene.length, 1);
    assert.ok(toene[0].frequency < 880, 'tiefer als der Belastungston');
  });

  test('das Ende sind drei aufsteigende Töne', async () => {
    const { beep, toene } = await ladeBeep();

    beep.beepFinish();

    assert.equal(toene.length, 3);
    const frequenzen = toene.map((t) => t.frequency);
    assert.deepEqual(frequenzen, [...frequenzen].sort((a, b) => a - b));
  });

  test('die Belastung klingt anders als die Pause', async () => {
    // Wer im Laufen nicht hinsieht, unterscheidet die Phasen nur am Klang.
    const { beep, toene } = await ladeBeep();

    beep.beepWork();
    const belastung = toene.map((t) => t.frequency);

    toene.length = 0;
    beep.beepRest();

    assert.ok(!belastung.includes(toene[0].frequency));
  });

  test('jeder Ton beginnt bei der aktuellen Zeit des Kontexts, nicht bei null', async () => {
    // Ein Start in der Vergangenheit spielt sofort und verschluckt den Versatz.
    const { beep, toene, kontexte } = await ladeBeep();

    beep.beepFinish();

    assert.ok(toene.every((t) => t.start >= kontexte[0].currentTime));
    assert.ok(toene.every((t) => t.stop > t.start), 'jeder Ton endet nach seinem Beginn');
  });
});

describe('Ein- und Ausblenden', () => {
  test('die Lautstärke ist nie exakt null', async () => {
    // exponentialRampToValueAtTime wirft im Browser bei 0 – die Rampe muss
    // deshalb an einem winzigen Wert beginnen und enden, nicht an der Null.
    const { beep, rampen } = await ladeBeep();

    beep.beepWork();

    assert.ok(rampen.length > 0);
    assert.ok(rampen.every(([, wert]) => wert > 0), 'kein Wert ist 0');
  });

  test('jeder Ton wird ein- und wieder ausgeblendet', async () => {
    const { beep, rampen } = await ladeBeep();

    beep.beepRest();

    // Ein Ton: Startwert setzen, hochrampen, wieder herunterrampen.
    assert.deepEqual(rampen.map(([art]) => art), ['set', 'ramp', 'ramp']);
    assert.ok(rampen[1][1] > rampen[0][1], 'erst lauter');
    assert.ok(rampen[2][1] < rampen[1][1], 'dann wieder leise');
  });
});

describe('unlock', () => {
  test('ein laufender Kontext gilt als frei', async () => {
    const { beep } = await ladeBeep({ state: 'running' });

    assert.equal(beep.unlock(), true);
  });

  test('ein gesperrter Kontext wird aufgeweckt', async () => {
    // Das ist der iOS-Fall: der Kontext startet suspendiert und darf nur aus
    // einer Nutzeraktion heraus aufwachen.
    const { beep, kontexte } = await ladeBeep({ state: 'suspended' });

    beep.unlock();

    assert.equal(kontexte[0].resumeAufrufe, 1);
  });

  test('ohne Web Audio meldet unlock ein ehrliches false', async () => {
    const { beep } = await ladeBeep();
    delete globalThis.AudioContext;

    assert.equal(beep.unlock(), false);
  });

  test('der Kontext wird nur ein einziges Mal erzeugt', async () => {
    // Jeder Aufruf ein neuer AudioContext wäre auf iOS nach ein paar Runden
    // das Ende jeder Tonausgabe – die Zahl ist begrenzt.
    const { beep, kontexte } = await ladeBeep();

    beep.unlock();
    beep.beepWork();
    beep.beepRest();
    beep.unlock();

    assert.equal(kontexte.length, 1);
  });
});

describe('Wenn kein Ton möglich ist', () => {
  test('ohne Web Audio passiert nichts, aber es fliegt auch nichts', async () => {
    const { beep, toene } = await ladeBeep();
    delete globalThis.AudioContext;

    assert.doesNotThrow(() => beep.beepWork());
    assert.equal(toene.length, 0);
  });

  test('ein Konstruktor, der wirft, legt die App nicht lahm', async () => {
    // Manche Browser werfen, wenn zu viele Kontexte offen sind.
    const { beep, toene } = await ladeBeep({ konstruktorWirft: true });

    assert.doesNotThrow(() => beep.beepFinish());
    assert.equal(beep.unlock(), false);
    assert.equal(toene.length, 0);
  });

  test('ein gesperrter Kontext spielt nicht ins Leere', async () => {
    // Suspendiert heisst: es käme ohnehin nichts an. Dann lieber gar nicht
    // erst Oszillatoren erzeugen.
    const { beep, toene } = await ladeBeep({ state: 'suspended' });

    beep.beepWork();

    assert.equal(toene.length, 0);
  });

  test('nach dem Aufwecken klingt es wieder', async () => {
    const { beep, toene } = await ladeBeep({ state: 'suspended' });

    beep.unlock();
    beep.beepRest();

    assert.equal(toene.length, 1);
  });
});
