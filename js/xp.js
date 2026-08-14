/**
 * Reine XP- und Level-Logik.
 *
 * Bewusst ohne DOM- und ohne Storage-Zugriff: alles hier sind pure
 * Funktionen. Achievements und Titel lassen sich später auf derselben Basis
 * ergänzen, ohne die Anzeige anzufassen.
 *
 * Regeln:
 *   - 10 XP pro Kilometer
 *   - Aufstieg von Level N auf N+1 kostet 40 + 20*N XP (linear, kein Cap)
 */

export const XP_PER_KM = 10;

/** XP für einen einzelnen Lauf. */
export function xpForDistance(distanceKm) {
  return Math.round(distanceKm * XP_PER_KM);
}

/** XP-Bedarf für den Aufstieg von `level` auf `level + 1`. */
export function xpToAdvance(level) {
  return 40 + 20 * level;
}

/**
 * Gesamt-XP, die nötig sind, um `level` zu erreichen.
 * Summe von xpToAdvance(1 .. level-1), geschlossen aufgelöst:
 *   sum = 40*(L-1) + 20*(L-1)*L/2 = (L-1) * (10L + 40)
 */
export function totalXpForLevel(level) {
  if (level <= 1) return 0;
  return (level - 1) * (10 * level + 40);
}

/**
 * Level zu einem gegebenen XP-Stand.
 * Geschlossene Umkehrung von totalXpForLevel(), plus Korrekturschritte
 * gegen Rundungsfehler der Wurzel.
 */
export function levelForXp(totalXp) {
  const xp = Math.max(0, totalXp);

  let level = Math.floor((-30 + Math.sqrt(900 + 40 * (xp + 40))) / 20);
  level = Math.max(1, level);

  while (totalXpForLevel(level + 1) <= xp) level++;
  while (level > 1 && totalXpForLevel(level) > xp) level--;

  return level;
}

/**
 * Kompletter Fortschritts-Zustand – das, was die Anzeige braucht.
 *
 * @returns {{
 *   level: number,
 *   totalXp: number,
 *   xpIntoLevel: number,
 *   xpForLevel: number,
 *   xpToNextLevel: number,
 *   progressPercent: number
 * }}
 */
export function getProgress(totalXp) {
  const xp = Math.max(0, totalXp);
  const level = levelForXp(xp);

  const xpIntoLevel = xp - totalXpForLevel(level);
  const xpForLevel = xpToAdvance(level);

  return {
    level,
    totalXp: xp,
    xpIntoLevel,
    xpForLevel,
    xpToNextLevel: xpForLevel - xpIntoLevel,
    progressPercent: (xpIntoLevel / xpForLevel) * 100,
  };
}

/** Summiert die XP einer Lauf-Liste. */
export function totalXpFromRuns(runs) {
  return runs.reduce((sum, run) => sum + xpForDistance(run.distanceKm), 0);
}
