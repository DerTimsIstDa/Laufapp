/**
 * Zeitpunkte statt nur Zustände: wann wurde ein Achievement freigeschaltet,
 * wann ein Titel erreicht.
 *
 * Pur und ohne DOM. Die restliche App fragt immer nur den Jetzt-Zustand ab –
 * hier wird die Historie einmal von vorn durchgespielt, Lauf für Lauf.
 *
 * Das geht, weil alle Bedingungen monoton sind: was einmal erfüllt war, bleibt
 * es beim Hinzufügen weiterer Läufe. Serien und Rekorde sind Maxima über die
 * Historie, Zähler wachsen nur. Deshalb gibt es zu jedem Achievement genau
 * einen ersten Zeitpunkt.
 */

import { evaluateAchievements, achievementXp } from './achievements.js';
import { totalXpFromRuns, levelForXp } from './xp.js';
import { titleForLevel } from './titles.js';

/**
 * Spielt die Läufe chronologisch durch und liefert nach jedem Lauf den Stand.
 *
 * Kostet O(n²) – für jeden Lauf wird die gesamte Vorgeschichte neu bewertet.
 * Bei ein paar hundert Läufen ist das ein Wimpernschlag, und die Alternative
 * wären dreizehn handgeschriebene Fortschreibungen, die mit jeder neuen Regel
 * wieder auseinanderlaufen.
 *
 * @param {import('./storage.js').Run[]} runs
 * @returns {{ date: string, unlocked: string[], level: number, totalXp: number }[]}
 */
export function replayHistory(runs) {
  if (!Array.isArray(runs) || runs.length === 0) return [];

  const chronological = [...runs].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const steps = [];

  for (let index = 0; index < chronological.length; index++) {
    const bisher = chronological.slice(0, index + 1);
    const achievements = evaluateAchievements(bisher);
    const totalXp = totalXpFromRuns(bisher) + achievementXp(achievements);

    steps.push({
      date: chronological[index].date,
      unlocked: achievements.filter((a) => a.unlocked).map((a) => a.id),
      level: levelForXp(totalXp),
      totalXp,
    });
  }

  return steps;
}

/**
 * Freischaltdatum je Achievement.
 * @returns {Map<string, string>} id -> ISO-Datum des Laufs, der es auslöste
 */
export function achievementUnlockDates(runs) {
  const daten = new Map();

  for (const step of replayHistory(runs)) {
    for (const id of step.unlocked) {
      if (!daten.has(id)) daten.set(id, step.date);
    }
  }

  return daten;
}

/**
 * Titel-Historie, älteste zuerst.
 *
 * Der erste Eintrag ist der Starttitel ohne Datum – den hat man von Anfang an,
 * dafür braucht es keinen Lauf.
 *
 * @returns {{ title: string, level: number, date: ?string }[]}
 */
export function titleHistory(runs) {
  const erreicht = [{ title: titleForLevel(1), level: 1, date: null }];
  let hoechstesLevel = 1;

  for (const step of replayHistory(runs)) {
    if (step.level <= hoechstesLevel) continue;

    // Ein einzelner Lauf kann mehrere Stufen auf einmal überspringen.
    for (let level = hoechstesLevel + 1; level <= step.level; level++) {
      const title = titleForLevel(level);
      if (title !== erreicht.at(-1).title) {
        erreicht.push({ title, level, date: step.date });
      }
    }

    hoechstesLevel = step.level;
  }

  return erreicht;
}
