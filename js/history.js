/**
 * Zeitpunkte statt nur Zustände: wann wurde ein Achievement freigeschaltet.
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
import { exerciseXp, normalizeEntries } from './exercise-log.js';

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
export function replayHistory(runs, exerciseLog = []) {
  const laeufe = Array.isArray(runs) ? runs : [];
  const uebungen = normalizeEntries(exerciseLog);
  if (laeufe.length === 0 && uebungen.length === 0) return [];

  // Beide Ereignisarten in eine Zeitachse. Am selben Tag kommen Läufe zuerst –
  // die Reihenfolge innerhalb eines Tages ändert nur, welcher Eintrag als
  // Auslöser gilt, nicht ob etwas freigeschaltet wird.
  const ereignisse = [
    ...laeufe.map((run) => ({ date: run.date, kind: 'run', item: run })),
    ...uebungen.map((entry) => ({ date: entry.date, kind: 'exercise', item: entry })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === b.kind ? 0 : a.kind === 'run' ? -1 : 1));

  const laufeBisher = [];
  const uebungenBisher = [];
  const steps = [];

  for (const ereignis of ereignisse) {
    if (ereignis.kind === 'run') laufeBisher.push(ereignis.item);
    else uebungenBisher.push(ereignis.item);

    const achievements = evaluateAchievements(laufeBisher, uebungenBisher);
    const totalXp =
      totalXpFromRuns(laufeBisher) + exerciseXp(uebungenBisher) + achievementXp(achievements);

    steps.push({
      date: ereignis.date,
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
export function achievementUnlockDates(runs, exerciseLog = []) {
  const daten = new Map();

  for (const step of replayHistory(runs, exerciseLog)) {
    for (const id of step.unlocked) {
      if (!daten.has(id)) daten.set(id, step.date);
    }
  }

  return daten;
}
