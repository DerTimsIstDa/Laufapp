/**
 * Titel-System.
 *
 * Feste Stufen bis Level 30, danach endlos alle 50 Level ein neuer Titel:
 *   Level  1  Neuling
 *   Level  5  Läufer
 *   Level 15  Ausdauerläufer
 *   Level 30  Veteran
 *   Level 80  Elite
 *   Level 130 Legende I, Level 180 Legende II, ...
 *
 * Weitere feste Stufe ergänzen: Eintrag in BASE_TITLES (aufsteigend) und
 * ggf. ENDLESS_START_LEVEL anpassen.
 *
 * Zu jedem Titel gehört ein Abzeichen. Die Zuordnung steht nur hier – wer ein
 * anderes Bild will, ändert einen Namen und nicht jede Anzeigestelle.
 */

export const BASE_TITLES = [
  { level: 1, title: 'Neuling', badge: 'neuling' },
  { level: 5, title: 'Läufer', badge: 'laeufer' },
  { level: 15, title: 'Ausdauerläufer', badge: 'ausdauerlaeufer' },
  { level: 30, title: 'Veteran', badge: 'veteran' },
];

/** Ab hier kommt alle ENDLESS_STEP Level ein neuer Titel. */
export const ENDLESS_START_LEVEL = 80;
export const ENDLESS_STEP = 50;

export const ELITE_BADGE = 'elite';

/**
 * Alle Legenden-Stufen teilen sich ein Abzeichen – es gibt nur sechs Bilder,
 * die Stufen sind endlos. Die römische Ziffer steht daneben im Text.
 */
export const LEGEND_BADGE = 'legende';

const BADGE_ORDNER = 'icons/badges/';

/** Titel zum aktuellen Level. */
export function titleForLevel(level) {
  if (level >= ENDLESS_START_LEVEL) {
    const index = Math.floor((level - ENDLESS_START_LEVEL) / ENDLESS_STEP);
    return index === 0 ? 'Elite' : `Legende ${toRoman(index)}`;
  }

  let title = BASE_TITLES[0].title;
  for (const tier of BASE_TITLES) {
    if (level >= tier.level) title = tier.title;
  }
  return title;
}

/** Abzeichen zum aktuellen Level, als Kurzname (siehe BASE_TITLES). */
export function badgeForLevel(level) {
  if (level >= ENDLESS_START_LEVEL) {
    const index = Math.floor((level - ENDLESS_START_LEVEL) / ENDLESS_STEP);
    return index === 0 ? ELITE_BADGE : LEGEND_BADGE;
  }

  let badge = BASE_TITLES[0].badge;
  for (const tier of BASE_TITLES) {
    if (level >= tier.level) badge = tier.badge;
  }
  return badge;
}

/** Pfad zur Bilddatei eines Abzeichens. */
export function badgeSrc(badge) {
  return `${BADGE_ORDNER}badge-${badge}.png`;
}

/**
 * Nächster Titel und ab welchem Level es ihn gibt.
 * @returns {{ level: number, title: string }}
 */
export function nextTitle(level) {
  // Nur Level und Titel, nicht das ganze Stufenobjekt: der endlose Zweig
  // unten hat kein BASE_TITLES-Gegenstueck, und beide muessen dieselbe Form
  // liefern. Ein Spread haette hier das Abzeichen mitgeschleppt und dort nicht.
  const nextBase = BASE_TITLES.find((tier) => tier.level > level);
  if (nextBase) return { level: nextBase.level, title: nextBase.title };

  const nextLevel =
    level < ENDLESS_START_LEVEL
      ? ENDLESS_START_LEVEL
      : ENDLESS_START_LEVEL +
        (Math.floor((level - ENDLESS_START_LEVEL) / ENDLESS_STEP) + 1) * ENDLESS_STEP;

  return { level: nextLevel, title: titleForLevel(nextLevel) };
}

/* ----------------------------------------------------------------- Intern */

const ROMAN_NUMERALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/** Römische Zahl; jenseits von 3999 (Level 200.030+) einfach die Ziffer. */
function toRoman(value) {
  if (value > 3999) return String(value);

  let rest = value;
  let out = '';
  for (const [amount, symbol] of ROMAN_NUMERALS) {
    while (rest >= amount) {
      out += symbol;
      rest -= amount;
    }
  }
  return out;
}
