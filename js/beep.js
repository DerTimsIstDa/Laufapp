/**
 * Signaltöne für den Phasenwechsel.
 *
 * Web Audio statt einer Audiodatei: ein Sinuston braucht keine Datei, die
 * geladen, gecacht und mitgeliefert werden müsste, und lässt sich in Tonhöhe
 * und Länge unterscheiden – hoch für die Belastung, tief für die Pause.
 *
 * Der Zusammenhang mit iOS: ein AudioContext startet dort gesperrt und darf
 * erst durch eine Nutzeraktion aufwachen. Deshalb `unlock()`, das beim
 * Starten des Trainings aus dem Klick heraus aufgerufen wird. Bei gesperrtem
 * Bildschirm hört das Betriebssystem irgendwann trotzdem auf, uns Zeit zu
 * geben – dagegen ist von hier aus nichts auszurichten.
 */

let context = null;
let erlaubt = true;

/** Ist der Ton eingeschaltet? */
export function isSoundOn() {
  return erlaubt;
}

export function setSoundOn(value) {
  erlaubt = Boolean(value);
  return erlaubt;
}

/**
 * Holt den AudioContext und weckt ihn auf.
 *
 * Muss aus einer Nutzeraktion heraus laufen, sonst bleibt er auf iOS
 * schlafen und jeder spätere Ton fällt lautlos aus.
 */
export function unlock() {
  const ctx = ensureContext();
  if (ctx === null) return false;

  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  return ctx.state !== 'suspended';
}

/** Kurzer Ton zum Beginn der Belastung – zwei helle Signale. */
export function beepWork() {
  tone([{ frequency: 880, duration: 0.12 }, { frequency: 1174, duration: 0.18, delay: 0.16 }]);
}

/** Zum Beginn der Pause – ein tiefer, längerer Ton. */
export function beepRest() {
  tone([{ frequency: 587, duration: 0.26 }]);
}

/** Zum Ende des Trainings – drei Töne aufwärts. */
export function beepFinish() {
  tone([
    { frequency: 659, duration: 0.16 },
    { frequency: 880, duration: 0.16, delay: 0.2 },
    { frequency: 1174, duration: 0.34, delay: 0.4 },
  ]);
}

/* ----------------------------------------------------------------- Intern */

function ensureContext() {
  if (context !== null) return context;

  const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Ctor) return null;

  try {
    context = new Ctor();
  } catch {
    context = null;
  }

  return context;
}

/**
 * Spielt eine Folge kurzer Sinustöne.
 *
 * Ein- und ausgeblendet statt hart geschaltet: ein abrupt beginnender Ton
 * knackt, und das Knacken ist lauter als der Ton.
 */
function tone(schritte) {
  if (!erlaubt) return;

  const ctx = ensureContext();
  if (ctx === null || ctx.state === 'suspended') return;

  const start = ctx.currentTime;

  for (const { frequency, duration, delay = 0 } of schritte) {
    const oszillator = ctx.createOscillator();
    const lautstaerke = ctx.createGain();

    oszillator.type = 'sine';
    oszillator.frequency.value = frequency;

    const beginn = start + delay;
    lautstaerke.gain.setValueAtTime(0.0001, beginn);
    lautstaerke.gain.exponentialRampToValueAtTime(0.35, beginn + 0.02);
    lautstaerke.gain.exponentialRampToValueAtTime(0.0001, beginn + duration);

    oszillator.connect(lautstaerke).connect(ctx.destination);
    oszillator.start(beginn);
    oszillator.stop(beginn + duration + 0.05);
  }
}
