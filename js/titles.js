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
 */

export const BASE_TITLES = [
  { level: 1, title: 'Neuling' },
  { level: 5, title: 'Läufer' },
  { level: 15, title: 'Ausdauerläufer' },
  { level: 30, title: 'Veteran' },
];

/** Ab hier kommt alle ENDLESS_STEP Level ein neuer Titel. */
export const ENDLESS_START_LEVEL = 80;
export const ENDLESS_STEP = 50;

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

/**
 * Nächster Titel und ab welchem Level es ihn gibt.
 * @returns {{ level: number, title: string }}
 */
export function nextTitle(level) {
  const nextBase = BASE_TITLES.find((tier) => tier.level > level);
  if (nextBase) return { ...nextBase };

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
