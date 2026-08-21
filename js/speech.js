/**
 * Ansagen während des Laufs: „Ein Kilometer. 5 Minuten 42."
 *
 * Über `speechSynthesis`, das jeder Browser mitbringt – keine Audiodatei, die
 * mitgeliefert und gecacht werden müsste, und keine Abhängigkeit. Damit passt
 * es zu `beep.js`, das aus demselben Grund einen Sinuston erzeugt, statt eine
 * Datei zu laden.
 *
 * Das Modul hat zwei Hälften, und die Trennung ist Absicht:
 *
 * - **Was gesagt wird** (`nextAnnouncement`, `announcementText`) ist pure
 *   Rechnung ohne Browser. Genau dort sitzen die Grenzfälle – 0,99 gegen
 *   1,00 km, ein GPS-Sprung über zwei Kilometer, eine Pause mittendrin – und
 *   genau die lassen sich so einzeln prüfen.
 * - **Dass es gesagt wird** (`speak` und der Rest) fasst den Browser an und
 *   ist bewusst dünn gehalten.
 *
 * Der Zusammenhang mit iOS ist derselbe wie bei den Tönen: Die Sprachausgabe
 * bleibt stumm, bis sie einmal aus einer Nutzeraktion heraus geweckt wurde.
 * Dafür gibt es `unlockVoice()`, aufgerufen aus dem Start-Klick heraus.
 *
 * **Was dieses Modul nicht kann:** Bei gesperrtem Bildschirm entscheidet das
 * Betriebssystem, ob es uns noch Rechenzeit gibt. Dagegen ist von hier aus
 * nichts auszurichten – derselbe Vorbehalt wie beim Ton.
 */

/** Alle wie viel Kilometer angesagt wird. */
export const ANNOUNCE_STEP_KM = 1;

/**
 * @typedef {Object} Announcement
 * @property {number} km        der erreichte volle Kilometer
 * @property {?number} elapsedMs seit die Splits vom Tracker kommen ungenutzt
 * @property {string} text      was gesprochen wird
 */

/**
 * Ist eine Ansage fällig? `null`, wenn nicht.
 *
 * **Gezählt wird nicht hier.** Welcher Kilometer voll ist und wie lange er
 * gedauert hat, weiss der Tracker – er führt die Liste `splits` mit einer
 * Zahl je vollem Kilometer. Diese Funktion liest sie nur. Zwei Stellen, die
 * unabhängig voneinander Kilometer zählen, wären zwei Stellen, die sich
 * irgendwann widersprechen; angesagt würde dann etwas anderes, als hinterher
 * in der Detailansicht steht.
 *
 * `previous` ist die zuletzt gemachte Ansage oder `null` vor der ersten.
 *
 * **Ein Sprung wird zusammengefasst.** Kommt die Strecke nach einem Tunnel
 * von 1,2 auf 3,4 km, wird einmal „3 Kilometer" gesagt und nicht zweimal
 * hintereinander: Zwei Ansagen im selben Atemzug sind Lärm. Gesagt wird der
 * Schnitt über die Kilometer, die seit der letzten Ansage dazukamen.
 *
 * @param {number[]} splits  Sekunden je vollem Kilometer, in Reihenfolge
 * @param {?Announcement} previous
 * @returns {?Announcement}
 */
export function nextAnnouncement(splits, previous = null) {
  if (!Array.isArray(splits)) return null;

  const km = splits.length;
  const vorigeKm = previous?.km ?? 0;
  if (km <= vorigeKm || km < ANNOUNCE_STEP_KM) return null;

  // Der Schnitt über alles seit der letzten Ansage – bei einem Sprung über
  // mehrere Kilometer, bei stummgeschalteter Ansage über die verpassten.
  const neue = splits.slice(vorigeKm, km);
  const summe = neue.reduce((a, b) => a + Number(b), 0);
  if (!Number.isFinite(summe)) return null;

  const proKmMs = (summe * 1000) / neue.length;

  return { km, elapsedMs: null, text: announcementText(km, proKmMs) };
}

/**
 * Der gesprochene Satz.
 *
 * Ausgeschrieben statt als „1" und „5:42": Eine Sprachausgabe liest die „1"
 * als „eins Kilometer" und die „5:42" als Uhrzeit. Was hier steht, wird so
 * gesprochen, wie es gemeint ist.
 *
 * @param {number} km
 * @param {number} proKmMs  Zeit je Kilometer seit der letzten Ansage
 */
export function announcementText(km, proKmMs) {
  const strecke = km === 1 ? 'Ein Kilometer' : `${km} Kilometer`;

  if (!Number.isFinite(proKmMs) || proKmMs <= 0) return `${strecke}.`;

  const sekunden = Math.round(proKmMs / 1000);
  const minuten = Math.floor(sekunden / 60);
  const rest = sekunden % 60;

  // Unter einer Minute je Kilometer läuft niemand; das wäre ein GPS-Sprung.
  // Dann lieber nur die Strecke ansagen als eine Zahl, die niemand geglaubt
  // hätte, wenn sie auf dem Bildschirm stünde.
  if (minuten < 1) return `${strecke}.`;

  const tempo = rest === 0 ? `${minuten} Minuten` : `${minuten} Minuten ${rest}`;
  return `${strecke}. ${tempo}.`;
}

/* ------------------------------------------------------------- Der Browser */

let erlaubt = true;

/** Kennt dieser Browser eine Sprachausgabe? */
export function isVoiceSupported() {
  return typeof globalThis.speechSynthesis !== 'undefined' &&
    typeof globalThis.SpeechSynthesisUtterance === 'function';
}

/** Sind Ansagen eingeschaltet? */
export function isVoiceOn() {
  return erlaubt;
}

export function setVoiceOn(value) {
  erlaubt = Boolean(value);
  if (!erlaubt) cancelSpeech();
  return erlaubt;
}

/**
 * Weckt die Sprachausgabe.
 *
 * Muss aus einer Nutzeraktion heraus laufen, sonst bleibt sie auf iOS stumm
 * und jede spätere Ansage fällt lautlos aus. Gesprochen wird dabei ein leerer
 * Satz – gehört wird nichts, aber die Erlaubnis ist erteilt.
 */
export function unlockVoice() {
  if (!isVoiceSupported()) return false;

  try {
    const stumm = new globalThis.SpeechSynthesisUtterance('');
    stumm.volume = 0;
    globalThis.speechSynthesis.speak(stumm);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sagt einen Satz an.
 *
 * Läuft noch eine Ansage, wird sie abgebrochen: Beim Laufen zählt die neue
 * Zahl, nicht die von vor zwei Minuten, die noch in der Warteschlange hängt.
 *
 * @returns {boolean} ob die Ansage abgeschickt wurde
 */
export function speak(text) {
  if (!erlaubt || !text || !isVoiceSupported()) return false;

  try {
    globalThis.speechSynthesis.cancel();

    const satz = new globalThis.SpeechSynthesisUtterance(text);
    satz.lang = 'de-DE';
    // Etwas langsamer als die Voreinstellung: im Laufrhythmus, mit Wind und
    // Atem, geht eine schnell gesprochene Zahl unter.
    satz.rate = 0.95;

    globalThis.speechSynthesis.speak(satz);
    return true;
  } catch {
    return false;
  }
}

/** Bricht eine laufende Ansage ab – beim Beenden oder Verwerfen. */
export function cancelSpeech() {
  if (!isVoiceSupported()) return;

  try {
    globalThis.speechSynthesis.cancel();
  } catch {
    // Ein Browser, der beim Abbrechen wirft, ist kein Grund, den Lauf zu
    // verlieren.
  }
}
