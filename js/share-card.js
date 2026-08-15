/**
 * Zeichnet die Teilen-Karte auf ein Canvas.
 *
 * Kein DOM ausser dem Canvas selbst: was gezeichnet wird, kommt als fertige
 * Daten herein. Damit lässt sich die Aufteilung prüfen, ohne einen Browser zu
 * starten – gerechnet wird hier nichts.
 *
 * Die Karte übernimmt den Profil-Kopf, wie er in der App aussieht: Name,
 * Abzeichen, Titel und den Fortschrittsbalken. Der XP-Text darunter bleibt
 * weg. Auf einer Karte, die an Freunde geht, ist "noch 53 XP bis Level 6"
 * eine Zahl ohne Bedeutung – der Balken zeigt dasselbe und braucht keine
 * Erklärung.
 */

/** Hochformat, wie es Messenger und Stories erwarten. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/** Dieselben Farben wie im Stylesheet – die Karte soll wiedererkennbar sein. */
export const CARD_COLORS = {
  bg: '#0d0f12',
  surface: '#15181d',
  line: '#242932',
  text: '#ffffff',
  body: '#b8c0c9',
  muted: '#8b939d',
  accent: '#c4f000',
  track: 'rgba(255, 255, 255, 0.08)',
};

const FONT =
  'system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", Roboto, ' +
  '"Helvetica Neue", Arial, sans-serif';

const RAND = 80;

/* Masse des Aufbaus – von inhaltsHoehe() und den Zeichenfunktionen geteilt. */
const NAME_HOEHE = 78;
const BADGE_GROESSE = 200;
const BADGE_HOEHE = BADGE_GROESSE + 24;
const TITEL_HOEHE = 100;
const BALKEN_HOEHE = 26;
const UEBERSCHRIFT_HOEHE = 60;
const UNTERZEILE_HOEHE = 52;
const KACHEL_HOEHE = 150;
const KACHEL_LUECKE = 24;

/** Platz, den die Fussmarke unten für sich beansprucht. */
const FUSS_HOEHE = 160;

/**
 * @typedef {{ label: string, value: string }} CardStat
 *
 * @typedef {Object} CardData
 * @property {string} name        leer, wenn keiner hinterlegt ist
 * @property {string} title       "Läufer"
 * @property {number} percent     Füllstand des Balkens, 0..100
 * @property {string} heading     Überschrift des unteren Blocks
 * @property {?string} subheading z.B. das Datum eines Laufs
 * @property {CardStat[]} stats   zwei Spalten, von oben nach unten
 * @property {?CanvasImageSource} badge
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CardData} data
 */
export function drawShareCard(canvas, data) {
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  flaeche(ctx);

  // Der Block sitzt mittig zwischen oberem Rand und Fussmarke. Je nach
  // Auswahl sind es vier oder fünf Kacheln – fest gesetzt bliebe unten mal
  // ein Loch und mal würde es eng.
  const frei = CARD_HEIGHT - FUSS_HOEHE - RAND;
  let y = Math.max(RAND, RAND + (frei - RAND - inhaltsHoehe(data)) / 2);

  y = kopf(ctx, data, y);
  y = balken(ctx, data.percent, y + 40);
  werte(ctx, data, y + 70);

  fussmarke(ctx);

  return canvas;
}

/**
 * Höhe des Inhalts, ohne ihn zu zeichnen.
 *
 * Muss mit den Schritten in drawShareCard zusammenpassen – die Masse stehen
 * deshalb hier als Konstanten und nicht verstreut in den Zeichenfunktionen.
 */
export function inhaltsHoehe({ name, badge, subheading, stats }) {
  const zeilen = Math.ceil(stats.length / 2);

  return (
    (name === '' ? 0 : NAME_HOEHE) +
    (badge ? BADGE_HOEHE : 0) +
    TITEL_HOEHE +
    40 +
    BALKEN_HOEHE +
    70 +
    UEBERSCHRIFT_HOEHE +
    (subheading ? UNTERZEILE_HOEHE : 0) +
    20 +
    zeilen * (KACHEL_HOEHE + KACHEL_LUECKE) -
    KACHEL_LUECKE
  );
}

/* ----------------------------------------------------------------- Intern */

function flaeche(ctx) {
  ctx.fillStyle = CARD_COLORS.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Ein Hauch Akzent oben links, damit die Karte nicht nur schwarz ist.
  const schimmer = ctx.createRadialGradient(140, 40, 0, 140, 40, 760);
  schimmer.addColorStop(0, 'rgba(196, 240, 0, 0.07)');
  schimmer.addColorStop(1, 'rgba(196, 240, 0, 0)');
  ctx.fillStyle = schimmer;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

/** Name, Abzeichen und Titel – mittig, wie im Profil. */
function kopf(ctx, { name, title, badge }, y) {
  const mitte = CARD_WIDTH / 2;
  ctx.textAlign = 'center';

  if (name !== '') {
    ctx.fillStyle = CARD_COLORS.text;
    ctx.font = `700 52px ${FONT}`;
    ctx.fillText(kuerzen(ctx, name, CARD_WIDTH - 2 * RAND), mitte, y);
    y += NAME_HOEHE;
  }

  if (badge) {
    ctx.drawImage(badge, mitte - BADGE_GROESSE / 2, y, BADGE_GROESSE, BADGE_GROESSE);
    y += BADGE_HOEHE;
  }

  ctx.fillStyle = CARD_COLORS.accent;
  ctx.font = `700 84px ${FONT}`;
  ctx.fillText(kuerzen(ctx, title, CARD_WIDTH - 2 * RAND), mitte, y);

  return y + TITEL_HOEHE;
}

/** Der Fortschrittsbalken – ohne den XP-Text, der in der App darunter steht. */
function balken(ctx, percent, y) {
  const breite = CARD_WIDTH - 2 * RAND;
  const anteil = Math.min(100, Math.max(0, percent)) / 100;

  pille(ctx, RAND, y, breite, BALKEN_HOEHE, CARD_COLORS.track);
  if (anteil > 0) {
    pille(ctx, RAND, y, Math.max(BALKEN_HOEHE, breite * anteil), BALKEN_HOEHE, CARD_COLORS.accent);
  }

  return y + BALKEN_HOEHE;
}

/** Überschrift und Kennzahlen in zwei Spalten. */
function werte(ctx, { heading, subheading, stats }, y) {
  ctx.textAlign = 'left';

  ctx.fillStyle = CARD_COLORS.text;
  ctx.font = `700 46px ${FONT}`;
  ctx.fillText(kuerzen(ctx, heading, CARD_WIDTH - 2 * RAND), RAND, y);
  y += UEBERSCHRIFT_HOEHE;

  if (subheading) {
    ctx.fillStyle = CARD_COLORS.muted;
    ctx.font = `500 32px ${FONT}`;
    ctx.fillText(kuerzen(ctx, subheading, CARD_WIDTH - 2 * RAND), RAND, y);
    y += UNTERZEILE_HOEHE;
  }

  y += 20;

  const spalte = (CARD_WIDTH - 2 * RAND - KACHEL_LUECKE) / 2;

  stats.forEach((stat, index) => {
    const x = RAND + (index % 2) * (spalte + KACHEL_LUECKE);
    const oben = y + Math.floor(index / 2) * (KACHEL_HOEHE + KACHEL_LUECKE);

    kachel(ctx, x, oben, spalte, KACHEL_HOEHE);

    ctx.fillStyle = CARD_COLORS.muted;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(kuerzen(ctx, stat.label.toUpperCase(), spalte - 56), x + 28, oben + 28);

    ctx.fillStyle = CARD_COLORS.text;
    ctx.font = `700 54px ${FONT}`;
    ctx.fillText(kuerzen(ctx, stat.value, spalte - 56), x + 28, oben + 70);
  });
}

/** Damit man der Karte ansieht, woher sie kommt. */
function fussmarke(ctx) {
  ctx.textAlign = 'center';
  ctx.fillStyle = CARD_COLORS.accent;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('FunRun', CARD_WIDTH / 2, CARD_HEIGHT - RAND - 40);
}

function kachel(ctx, x, y, breite, hoehe) {
  ctx.fillStyle = CARD_COLORS.surface;
  ecken(ctx, x, y, breite, hoehe, 24);
  ctx.fill();

  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function pille(ctx, x, y, breite, hoehe, farbe) {
  ctx.fillStyle = farbe;
  ecken(ctx, x, y, breite, hoehe, hoehe / 2);
  ctx.fill();
}

function ecken(ctx, x, y, breite, hoehe, radius) {
  const r = Math.min(radius, breite / 2, hoehe / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + breite, y, x + breite, y + hoehe, r);
  ctx.arcTo(x + breite, y + hoehe, x, y + hoehe, r);
  ctx.arcTo(x, y + hoehe, x, y, r);
  ctx.arcTo(x, y, x + breite, y, r);
  ctx.closePath();
}

/**
 * Kürzt Text, der nicht in die Breite passt.
 *
 * Lieber ein Auslassungszeichen als ein Name, der über den Rand hinausläuft:
 * die Karte wird verschickt und lässt sich nicht nachbessern.
 */
function kuerzen(ctx, text, maxBreite) {
  if (ctx.measureText(text).width <= maxBreite) return text;

  let kurz = text;
  while (kurz.length > 1 && ctx.measureText(`${kurz}…`).width > maxBreite) {
    kurz = kurz.slice(0, -1);
  }

  return `${kurz}…`;
}
