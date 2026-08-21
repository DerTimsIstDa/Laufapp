/**
 * Achievement-System.
 *
 * Wie die XP werden auch die Achievements NICHT gespeichert, sondern bei
 * jedem Render aus der Lauf-Liste neu abgeleitet. Dadurch stimmt der Stand
 * immer – auch wenn ein Lauf nachträglich gelöscht wird.
 *
 * Neues Achievement ergänzen: einen Eintrag in ACHIEVEMENTS hinzufügen.
 * Reicht die vorhandene Statistik nicht aus, in buildRunStats() ein Feld
 * ergänzen. Sonst muss nichts angefasst werden.
 */

import { buildExerciseStats } from './exercise-log.js';
import { weekStart } from './stats.js';
import { runPaceMinPerKm } from './geo.js';

/** Distanzen, auf denen persönliche Rekorde gezählt werden (km). */
const PR_DISTANCES_KM = [5, 10];

/** Toleranz, mit der ein Lauf einer PR-Distanz zugeordnet wird (km). */
const PR_TOLERANCE_KM = 0.5;

/**
 * Ab dieser Distanz zählt ein Lauf für die Pace-Trophäen. Auf 500 m ist eine
 * schnelle Pace kein Ausdauerbeleg, sondern ein Sprint.
 */
const PACE_MIN_DISTANCE_KM = 3;

/**
 * Die drei Pace-Stufen. 6:00 ist der Einstieg, 5:00 das obere Ende dessen,
 * was im Alltag vorkommt – dazwischen liegt die Spanne, in der die meisten
 * Läufe tatsächlich landen.
 */
const PACE_STEADY_MIN_PER_KM = 6;
const PACE_BRISK_MIN_PER_KM = 5.5;
const PACE_FAST_MIN_PER_KM = 5;

/** Um so viele Minuten muss sich die Bestpace verbessern. */
const PACE_IMPROVEMENT_MIN = 0.5;

/**
 * Um diesen Faktor muss der längste Lauf übertroffen werden. Steht hier,
 * weil ihn zwei Stellen brauchen: die Bedingung in buildRunStats und die
 * Ziellinie, die der Trophäe angezeigt wird. Zwei Zahlen, die auseinander
 * laufen können, wären ein Balken, der lügt.
 */
const LONG_RUN_FACTOR = 1.2;

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} name
 * @property {string} description  Bedingung in einem Satz
 * @property {number} xp           Bonus-XP beim Freischalten
 * @property {'meilenstein'|'herausforderung'|'uebung'} category
 * @property {(stats: RunStats) => boolean} check
 * @property {(stats: RunStats) => {current: number, target: number, unit: string}} [progress]
 * @property {(stats: RunStats) => {label: string, current: number|null, target: number|null, kind: 'pace'|'distance'}} [standing]
 */

/*
 * progress oder standing – und warum es beides gibt.
 *
 * `progress` ist der Balken: ein Zähler, der von null zum Ziel hochläuft. Er
 * setzt voraus, dass "mehr" auch "näher dran" heißt.
 *
 * Für einen Teil der Herausforderungen stimmt das nicht:
 *
 * - Eine Pace läuft nach unten. Ein Balken "5,8 von 6" sähe aus wie fast
 *   geschafft, wäre aber längst erfüllt.
 * - Beim langen Atem wächst das Ziel mit dem Stand mit (120 % des bisher
 *   längsten Laufs). Der Balken stünde für immer bei 83 % und bewegte sich
 *   nie – einer, der sich nicht bewegt, sagt nichts.
 *
 * Für diese Fälle gibt es `standing`: zwei Zahlen als Zeile, ohne Balken.
 * "Beste Pace: 6:12 · nötig: unter 6:00 min/km" ist wahr, und man sieht,
 * wie weit es noch ist.
 *
 * Ohne beides bleiben nur `neue-bestzeit` und `comeback`. Bei der Bestzeit
 * gibt es nichts zu zählen – sie fällt in dem Moment, in dem sie fällt. Und
 * beim Comeback wäre ein Fortschritt die Aufforderung, länger nicht zu
 * laufen. Diese zwei bleiben bewusst leer.
 *
 * `current: null` heißt "noch nichts gemessen" und ist etwas anderes als
 * eine Null: wer keinen Lauf mit Dauer hat, steht nicht bei 0:00 min/km.
 *
 * `target: null` gibt es nur dort, wo das Ziel vom Stand abhängt: ohne
 * ersten Lauf gibt es keine Ziellinie für den langen Atem. "nötig: ab
 * 0,00 km" wäre eine Zahl, die niemandem etwas sagt.
 */

/** @type {Achievement[]} */
export const ACHIEVEMENTS = [
  // --- Meilensteine (kumulativ) -------------------------------------------
  {
    id: 'erste-meile',
    name: 'Erste Meile',
    description: 'Trage deinen ersten Lauf ein.',
    xp: 15,
    category: 'meilenstein',
    check: (s) => s.runCount >= 1,
    progress: (s) => ({ current: s.runCount, target: 1, unit: 'Läufe' }),
  },
  {
    id: 'aufgewaermt',
    name: 'Aufgewärmt',
    description: '5 Läufe eingetragen.',
    xp: 30,
    category: 'meilenstein',
    check: (s) => s.runCount >= 5,
    progress: (s) => ({ current: s.runCount, target: 5, unit: 'Läufe' }),
  },
  {
    id: 'eingelaufen',
    name: 'Eingelaufen',
    description: '10 Läufe eingetragen.',
    xp: 50,
    category: 'meilenstein',
    check: (s) => s.runCount >= 10,
    progress: (s) => ({ current: s.runCount, target: 10, unit: 'Läufe' }),
  },
  {
    id: 'auf-kurs',
    name: 'Auf Kurs',
    description: '25 Läufe eingetragen.',
    xp: 80,
    category: 'meilenstein',
    check: (s) => s.runCount >= 25,
    progress: (s) => ({ current: s.runCount, target: 25, unit: 'Läufe' }),
  },
  {
    id: 'stammlaeufer',
    name: 'Stammläufer',
    description: '50 Läufe eingetragen.',
    xp: 150,
    category: 'meilenstein',
    check: (s) => s.runCount >= 50,
    progress: (s) => ({ current: s.runCount, target: 50, unit: 'Läufe' }),
  },
  {
    id: 'alter-hase',
    name: 'Alter Hase',
    description: '100 Läufe eingetragen.',
    xp: 250,
    category: 'meilenstein',
    check: (s) => s.runCount >= 100,
    progress: (s) => ({ current: s.runCount, target: 100, unit: 'Läufe' }),
  },
  {
    id: 'unermuedlich',
    name: 'Unermüdlich',
    description: '250 Läufe eingetragen.',
    xp: 500,
    category: 'meilenstein',
    check: (s) => s.runCount >= 250,
    progress: (s) => ({ current: s.runCount, target: 250, unit: 'Läufe' }),
  },
  {
    id: 'club-10-km',
    name: '10-km-Club',
    description: '10 km Gesamtdistanz erreicht.',
    xp: 20,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 10,
    progress: (s) => ({ current: s.totalDistanceKm, target: 10, unit: 'km' }),
  },
  {
    id: 'club-25-km',
    name: '25-km-Club',
    description: '25 km Gesamtdistanz erreicht.',
    xp: 35,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 25,
    progress: (s) => ({ current: s.totalDistanceKm, target: 25, unit: 'km' }),
  },
  {
    id: 'club-50-km',
    name: '50-km-Club',
    description: '50 km Gesamtdistanz erreicht.',
    xp: 50,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 50,
    progress: (s) => ({ current: s.totalDistanceKm, target: 50, unit: 'km' }),
  },
  {
    id: 'club-100-km',
    name: '100-km-Club',
    description: '100 km Gesamtdistanz erreicht.',
    xp: 90,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 100,
    progress: (s) => ({ current: s.totalDistanceKm, target: 100, unit: 'km' }),
  },
  {
    id: 'club-250-km',
    name: '250-km-Club',
    description: '250 km Gesamtdistanz erreicht.',
    xp: 180,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 250,
    progress: (s) => ({ current: s.totalDistanceKm, target: 250, unit: 'km' }),
  },
  {
    id: 'club-500-km',
    name: '500-km-Club',
    description: '500 km Gesamtdistanz erreicht.',
    xp: 300,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 500,
    progress: (s) => ({ current: s.totalDistanceKm, target: 500, unit: 'km' }),
  },
  {
    id: 'club-1000-km',
    name: '1000-km-Club',
    description: '1000 km Gesamtdistanz erreicht.',
    xp: 600,
    category: 'meilenstein',
    check: (s) => s.totalDistanceKm >= 1000,
    progress: (s) => ({ current: s.totalDistanceKm, target: 1000, unit: 'km' }),
  },
  {
    id: 'drei-am-stueck',
    name: 'Drei am Stück',
    description: 'An 3 Tagen in Folge gelaufen.',
    xp: 20,
    category: 'meilenstein',
    check: (s) => s.longestDailyStreak >= 3,
    progress: (s) => ({ current: s.longestDailyStreak, target: 3, unit: 'Tage' }),
  },
  {
    id: 'serientaeter',
    name: 'Serientäter',
    description: 'An 7 Tagen in Folge gelaufen.',
    xp: 35,
    category: 'meilenstein',
    check: (s) => s.longestDailyStreak >= 7,
    progress: (s) => ({ current: s.longestDailyStreak, target: 7, unit: 'Tage' }),
  },
  {
    id: 'eiserner-wille',
    name: 'Eiserner Wille',
    description: '30 Tage am Stück dabeigeblieben, ohne Pause über 7 Tage.',
    xp: 120,
    category: 'meilenstein',
    check: (s) => s.longestWeeklyStreakDays >= 30,
    progress: (s) => ({
      current: s.longestWeeklyStreakDays,
      target: 30,
      unit: 'Tage',
    }),
  },

  {
    id: 'vier-wochen-serie',
    name: 'Vier Wochen am Stück',
    description: 'In 4 aufeinanderfolgenden Wochen gelaufen.',
    xp: 45,
    category: 'meilenstein',
    check: (s) => s.longestWeekStreak >= 4,
    progress: (s) => ({ current: s.longestWeekStreak, target: 4, unit: 'Wochen' }),
  },
  {
    id: 'zehn-wochen-serie',
    name: 'Zehn Wochen am Stück',
    description: 'In 10 aufeinanderfolgenden Wochen gelaufen.',
    xp: 110,
    category: 'meilenstein',
    check: (s) => s.longestWeekStreak >= 10,
    progress: (s) => ({ current: s.longestWeekStreak, target: 10, unit: 'Wochen' }),
  },
  {
    id: 'vier-wochen-aktiv',
    name: 'Erster Monat',
    description: 'In 4 verschiedenen Wochen gelaufen – Pausen erlaubt.',
    xp: 30,
    category: 'meilenstein',
    check: (s) => s.activeWeeks >= 4,
    progress: (s) => ({ current: s.activeWeeks, target: 4, unit: 'Wochen' }),
  },
  {
    id: 'zwoelf-wochen-aktiv',
    name: 'Durchgehalten',
    description: 'In 12 verschiedenen Wochen gelaufen.',
    xp: 70,
    category: 'meilenstein',
    check: (s) => s.activeWeeks >= 12,
    progress: (s) => ({ current: s.activeWeeks, target: 12, unit: 'Wochen' }),
  },
  {
    id: 'halbes-jahr',
    name: 'Halbes Jahr',
    description: 'In 26 verschiedenen Wochen gelaufen.',
    xp: 160,
    category: 'meilenstein',
    check: (s) => s.activeWeeks >= 26,
    progress: (s) => ({ current: s.activeWeeks, target: 26, unit: 'Wochen' }),
  },
  {
    id: 'drei-monate',
    name: 'Über die Monate',
    description: 'In 3 verschiedenen Kalendermonaten gelaufen.',
    xp: 30,
    category: 'meilenstein',
    check: (s) => s.activeMonths >= 3,
    progress: (s) => ({ current: s.activeMonths, target: 3, unit: 'Monate' }),
  },
  {
    id: 'fuenfmal-flott',
    name: 'Fünfmal flott',
    description: '5 Läufe schneller als 6:00 min/km.',
    xp: 50,
    category: 'meilenstein',
    check: (s) => s.steadyPaceRunCount >= 5,
    progress: (s) => ({ current: s.steadyPaceRunCount, target: 5, unit: 'Läufe' }),
  },
  {
    id: 'regelmaessig-flott',
    name: 'Regelmäßig flott',
    description: '15 Läufe schneller als 6:00 min/km.',
    xp: 110,
    category: 'meilenstein',
    check: (s) => s.steadyPaceRunCount >= 15,
    progress: (s) => ({ current: s.steadyPaceRunCount, target: 15, unit: 'Läufe' }),
  },
  {
    id: 'schneller-geworden',
    name: 'Schneller geworden',
    description: 'Die eigene Bestpace um 30 Sekunden je Kilometer verbessert.',
    xp: 60,
    category: 'meilenstein',
    check: (s) => s.paceImprovementMin >= PACE_IMPROVEMENT_MIN,
    progress: (s) => ({
      // In Sekunden, weil "0,3 von 0,5 Minuten" niemand im Kopf umrechnet.
      current: Math.round(s.paceImprovementMin * 60),
      target: Math.round(PACE_IMPROVEMENT_MIN * 60),
      unit: 'Sekunden',
    }),
  },
  {
    id: 'intervall-einsteiger',
    name: 'Intervall-Einsteiger',
    description: '3 Intervall-Trainings vollständig durchgezogen.',
    xp: 40,
    category: 'meilenstein',
    check: (s) => s.intervalSessions >= 3,
    progress: (s) => ({ current: s.intervalSessions, target: 3, unit: 'Trainings' }),
  },
  {
    id: 'intervall-routine',
    name: 'Intervall-Routine',
    description: '10 Intervall-Trainings vollständig durchgezogen.',
    xp: 90,
    category: 'meilenstein',
    check: (s) => s.intervalSessions >= 10,
    progress: (s) => ({ current: s.intervalSessions, target: 10, unit: 'Trainings' }),
  },
  {
    id: 'hundert-runden',
    name: 'Hundert Runden',
    description: '100 Intervall-Wiederholungen insgesamt geschafft.',
    xp: 120,
    category: 'meilenstein',
    check: (s) => s.intervalRepeatsTotal >= 100,
    progress: (s) => ({ current: s.intervalRepeatsTotal, target: 100, unit: 'Runden' }),
  },
  {
    id: 'fuenf-stunden',
    name: 'Fünf Stunden unterwegs',
    description: '5 Stunden Laufzeit gesammelt (Dauer eintragen).',
    xp: 45,
    category: 'meilenstein',
    check: (s) => s.totalDurationMinutes >= 300,
    progress: (s) => ({ current: s.totalDurationMinutes / 60, target: 5, unit: 'Stunden' }),
  },

  // --- Herausforderungen (situativ) ---------------------------------------
  {
    id: 'fruehaufsteher',
    name: 'Frühaufsteher',
    description: 'Ein Lauf vor 7:00 Uhr (Uhrzeit eintragen).',
    xp: 15,
    category: 'herausforderung',
    check: (s) => s.earlyRunCount >= 1,
    progress: (s) => ({ current: s.earlyRunCount, target: 1, unit: 'Läufe' }),
  },
  {
    id: 'morgenroutine',
    name: 'Morgenroutine',
    description: '5 Läufe vor 7:00 Uhr.',
    xp: 40,
    category: 'herausforderung',
    check: (s) => s.earlyRunCount >= 5,
    progress: (s) => ({ current: s.earlyRunCount, target: 5, unit: 'Läufe' }),
  },
  {
    id: 'morgenmensch',
    name: 'Morgenmensch',
    description: '15 Läufe vor 7:00 Uhr.',
    xp: 90,
    category: 'herausforderung',
    check: (s) => s.earlyRunCount >= 15,
    progress: (s) => ({ current: s.earlyRunCount, target: 15, unit: 'Läufe' }),
  },
  {
    id: 'nachteule',
    name: 'Nachteule',
    description: 'Ein Lauf ab 21:00 Uhr (Uhrzeit eintragen).',
    xp: 15,
    category: 'herausforderung',
    check: (s) => s.lateRunCount >= 1,
    progress: (s) => ({ current: s.lateRunCount, target: 1, unit: 'Läufe' }),
  },
  {
    id: 'abendrunde',
    name: 'Abendrunde',
    description: '5 Läufe ab 21:00 Uhr.',
    xp: 40,
    category: 'herausforderung',
    check: (s) => s.lateRunCount >= 5,
    progress: (s) => ({ current: s.lateRunCount, target: 5, unit: 'Läufe' }),
  },
  {
    id: 'nachtschicht',
    name: 'Nachtschicht',
    description: '15 Läufe ab 21:00 Uhr.',
    xp: 90,
    category: 'herausforderung',
    check: (s) => s.lateRunCount >= 15,
    progress: (s) => ({ current: s.lateRunCount, target: 15, unit: 'Läufe' }),
  },
  {
    id: 'die-zehn',
    name: 'Die Zehn',
    description: 'Ein einzelner Lauf über 10 km.',
    xp: 30,
    category: 'herausforderung',
    check: (s) => s.maxDistanceKm >= 10,
    progress: (s) => ({ current: s.maxDistanceKm, target: 10, unit: 'km' }),
  },
  {
    id: 'die-fuenfzehn',
    name: 'Die Fünfzehn',
    description: 'Ein einzelner Lauf über 15 km.',
    xp: 55,
    category: 'herausforderung',
    check: (s) => s.maxDistanceKm >= 15,
    progress: (s) => ({ current: s.maxDistanceKm, target: 15, unit: 'km' }),
  },
  {
    id: 'flott-unterwegs',
    name: 'Flott unterwegs',
    description: `Ein Lauf ab ${PACE_MIN_DISTANCE_KM} km schneller als 6:00 min/km.`,
    xp: 35,
    category: 'herausforderung',
    check: (s) => underPace(s, PACE_STEADY_MIN_PER_KM),
    standing: (s) => paceStanding(s.bestPaceMinPerKm, PACE_STEADY_MIN_PER_KM),
  },
  {
    id: 'zuegig',
    name: 'Zügig',
    description: `Ein Lauf ab ${PACE_MIN_DISTANCE_KM} km schneller als 5:30 min/km.`,
    xp: 55,
    category: 'herausforderung',
    check: (s) => underPace(s, PACE_BRISK_MIN_PER_KM),
    standing: (s) => paceStanding(s.bestPaceMinPerKm, PACE_BRISK_MIN_PER_KM),
  },
  {
    id: 'unter-fuenf',
    name: 'Unter fünf',
    description: `Ein Lauf ab ${PACE_MIN_DISTANCE_KM} km schneller als 5:00 min/km.`,
    xp: 90,
    category: 'herausforderung',
    check: (s) => underPace(s, PACE_FAST_MIN_PER_KM),
    standing: (s) => paceStanding(s.bestPaceMinPerKm, PACE_FAST_MIN_PER_KM),
  },
  {
    id: 'doppelschicht',
    name: 'Doppelschicht',
    description: 'Zwei Läufe an einem Tag.',
    xp: 25,
    category: 'herausforderung',
    check: (s) => s.maxRunsPerDay >= 2,
    progress: (s) => ({ current: s.maxRunsPerDay, target: 2, unit: 'Läufe' }),
  },
  {
    id: 'volle-woche',
    name: 'Volle Woche',
    description: '3 Läufe in einer Kalenderwoche.',
    xp: 30,
    category: 'herausforderung',
    check: (s) => s.maxRunsPerWeek >= 3,
    progress: (s) => ({ current: s.maxRunsPerWeek, target: 3, unit: 'Läufe' }),
  },
  {
    id: 'zehn-am-stueck',
    name: 'Zehn am Stück',
    description: 'Ein Intervall-Training mit 10 Wiederholungen geschafft.',
    xp: 45,
    category: 'herausforderung',
    check: (s) => s.maxIntervalRepeats >= 10,
    progress: (s) => ({ current: s.maxIntervalRepeats, target: 10, unit: 'Runden' }),
  },
  {
    id: 'tempo-im-intervall',
    name: 'Tempo im Intervall',
    description: 'Belastungsphasen schneller als 5:00 min/km (mit GPS aufgezeichnet).',
    xp: 60,
    category: 'herausforderung',
    // Gemessen wird nur die Belastung, nicht das Training: die Gehpausen
    // gehören nicht in eine Pace, die etwas über das Tempo aussagen soll.
    check: (s) =>
      s.bestIntervalWorkPace !== null && s.bestIntervalWorkPace < PACE_FAST_MIN_PER_KM,
    standing: (s) =>
      paceStanding(s.bestIntervalWorkPace, PACE_FAST_MIN_PER_KM, 'Beste Belastungs-Pace'),
  },
  {
    id: 'neue-bestzeit',
    name: 'Neue Bestzeit',
    description: 'Persönlicher Rekord auf 5 oder 10 km (Dauer eintragen).',
    xp: 25,
    category: 'herausforderung',
    check: (s) => s.hasPersonalBest,
  },
  {
    id: 'comeback',
    name: 'Comeback',
    description: 'Wieder gelaufen nach mindestens 14 Tagen Pause.',
    xp: 10,
    category: 'herausforderung',
    check: (s) => s.hasComeback,
  },
  {
    id: 'langer-atem',
    name: 'Der lange Atem',
    description: 'Den bisher längsten Lauf um mindestens 20 % übertroffen.',
    xp: 60,
    category: 'herausforderung',
    check: (s) => s.hasLongRunBreakthrough,
    // Das Ziel wandert mit: jeder längere Lauf hebt die Latte für den
    // nächsten. Genau deshalb steht hier eine Zeile und kein Balken.
    standing: (s) => ({
      label: 'Längster Lauf',
      current: s.maxDistanceKm > 0 ? s.maxDistanceKm : null,
      target: s.maxDistanceKm > 0 ? s.maxDistanceKm * LONG_RUN_FACTOR : null,
      kind: 'distance',
    }),
  },

  // --- Übungen ------------------------------------------------------------
  {
    id: 'erste-uebung',
    name: 'Erste Übung',
    description: 'Eine Übung als erledigt abgehakt.',
    xp: 10,
    category: 'uebung',
    check: (s) => s.exerciseCompletions >= 1,
    progress: (s) => ({ current: s.exerciseCompletions, target: 1, unit: 'Übungen' }),
  },
  {
    id: 'dranbleiber',
    name: 'Dranbleiber',
    description: '10 Übungen insgesamt erledigt.',
    xp: 30,
    category: 'uebung',
    check: (s) => s.exerciseCompletions >= 10,
    progress: (s) => ({ current: s.exerciseCompletions, target: 10, unit: 'Übungen' }),
  },
  {
    id: 'uebungsroutine',
    name: 'Übungsroutine',
    description: '50 Übungen insgesamt erledigt.',
    xp: 100,
    category: 'uebung',
    check: (s) => s.exerciseCompletions >= 50,
    progress: (s) => ({ current: s.exerciseCompletions, target: 50, unit: 'Übungen' }),
  },
  {
    id: 'hundertfach',
    name: 'Hundertfach',
    description: '100 Übungen insgesamt erledigt.',
    xp: 150,
    category: 'uebung',
    check: (s) => s.exerciseCompletions >= 100,
    progress: (s) => ({ current: s.exerciseCompletions, target: 100, unit: 'Übungen' }),
  },

  // Tage statt Erledigungen: fünf Übungen an einem Nachmittag sind kein
  // Training, fünf Tage mit einer Übung schon.
  {
    id: 'fuenf-uebungstage',
    name: 'Fünf Übungstage',
    description: 'An 5 verschiedenen Tagen geübt.',
    xp: 20,
    category: 'uebung',
    check: (s) => s.exerciseDays >= 5,
    progress: (s) => ({ current: s.exerciseDays, target: 5, unit: 'Tage' }),
  },
  {
    id: 'zwanzig-uebungstage',
    name: 'Zwanzig Übungstage',
    description: 'An 20 verschiedenen Tagen geübt.',
    xp: 55,
    category: 'uebung',
    check: (s) => s.exerciseDays >= 20,
    progress: (s) => ({ current: s.exerciseDays, target: 20, unit: 'Tage' }),
  },
  {
    id: 'uebungsserie-3',
    name: 'Drei Tage am Stück',
    description: 'An 3 Tagen in Folge geübt.',
    xp: 25,
    category: 'uebung',
    check: (s) => s.longestExerciseDayStreak >= 3,
    progress: (s) => ({ current: s.longestExerciseDayStreak, target: 3, unit: 'Tage' }),
  },
  {
    id: 'uebungsserie-7',
    name: 'Eine Woche am Stück',
    description: 'An 7 Tagen in Folge geübt.',
    xp: 60,
    category: 'uebung',
    check: (s) => s.longestExerciseDayStreak >= 7,
    progress: (s) => ({ current: s.longestExerciseDayStreak, target: 7, unit: 'Tage' }),
  },
  {
    id: 'fuenf-verschiedene',
    name: 'Neugierig',
    description: '5 verschiedene Übungen ausprobiert.',
    xp: 20,
    category: 'uebung',
    check: (s) => s.distinctExercises >= 5,
    progress: (s) => ({ current: s.distinctExercises, target: 5, unit: 'Übungen' }),
  },
  {
    id: 'zehn-verschiedene',
    name: 'Entdecker',
    description: '10 verschiedene Übungen ausprobiert.',
    xp: 40,
    category: 'uebung',
    check: (s) => s.distinctExercises >= 10,
    progress: (s) => ({ current: s.distinctExercises, target: 10, unit: 'Übungen' }),
  },
  {
    id: 'zwanzig-verschiedene',
    name: 'Kenner',
    description: '20 verschiedene Übungen ausprobiert.',
    xp: 80,
    category: 'uebung',
    check: (s) => s.distinctExercises >= 20,
    progress: (s) => ({ current: s.distinctExercises, target: 20, unit: 'Übungen' }),
  },
  {
    id: 'vielseitig',
    name: 'Vielseitig',
    description: 'Aus jeder der fünf Kategorien mindestens eine Übung gemacht.',
    xp: 50,
    category: 'uebung',
    check: (s) => s.exerciseCategoriesDone >= s.exerciseCategoryTotal,
    progress: (s) => ({
      current: s.exerciseCategoriesDone,
      target: s.exerciseCategoryTotal,
      unit: 'Kategorien',
    }),
  },
  {
    id: 'volle-reihe',
    name: 'Volle Reihe',
    description: 'Alle Übungen einer Kategorie mindestens einmal gemacht.',
    xp: 40,
    category: 'uebung',
    check: (s) => s.completeExerciseCategories >= 1,
    progress: (s) => ({ current: s.completeExerciseCategories, target: 1, unit: 'Kategorien' }),
  },
  {
    id: 'zwei-volle-reihen',
    name: 'Zwei volle Reihen',
    description: 'Zwei Kategorien komplett durchgemacht.',
    xp: 80,
    category: 'uebung',
    check: (s) => s.completeExerciseCategories >= 2,
    progress: (s) => ({ current: s.completeExerciseCategories, target: 2, unit: 'Kategorien' }),
  },
];

/**
 * Alle Kennzahlen, die die Achievements oben brauchen – in einem Durchlauf.
 *
 * @typedef {Object} RunStats
 * @property {number} runCount
 * @property {number} totalDistanceKm
 * @property {number} longestDailyStreak        Tage in Folge mit Lauf
 * @property {number} longestWeeklyStreakDays   längste Spanne ohne Pause > 7 Tage
 * @property {number} earlyRunCount             Läufe vor 7:00 Uhr
 * @property {number} lateRunCount              Läufe ab 21:00 Uhr
 * @property {number} activeDays                Tage mit mindestens einem Lauf
 * @property {number} activeWeeks               Wochen mit mindestens einem Lauf
 * @property {number} activeMonths              Kalendermonate mit Lauf
 * @property {number} longestWeekStreak         Wochen in Folge mit Lauf
 * @property {number} maxDistanceKm             längster einzelner Lauf
 * @property {number} totalDurationMinutes      nur Läufe mit eingetragener Dauer
 * @property {number} maxRunsPerDay
 * @property {number} maxRunsPerWeek
 * @property {number} intervalSessions          zu Ende gebrachte Intervall-Trainings
 * @property {number} intervalRepeatsTotal      geschaffte Wiederholungen insgesamt
 * @property {number} maxIntervalRepeats        meiste Wiederholungen in einem Training
 * @property {?number} bestIntervalWorkPace     beste Pace in den Belastungsphasen
 * @property {?number} bestPaceMinPerKm         beste Pace ab PACE_MIN_DISTANCE_KM
 * @property {?number} firstPaceMinPerKm        Pace des ersten gewerteten Laufs
 * @property {number} paceImprovementMin        um wie viel die Bestpace sank
 * @property {number} steadyPaceRunCount        Läufe schneller als 6:00
 * @property {number} briskPaceRunCount         Läufe schneller als 5:30
 * @property {number} fastPaceRunCount          Läufe schneller als 5:00
 * @property {boolean} hasPersonalBest
 * @property {boolean} hasComeback
 * @property {boolean} hasLongRunBreakthrough
 *
 * @param {import('./storage.js').Run[]} runs
 * @returns {RunStats}
 */
export function buildRunStats(runs) {
  const chronological = [...runs].sort(byTimeAsc);

  const stats = {
    runCount: chronological.length,
    totalDistanceKm: 0,
    longestDailyStreak: 0,
    longestWeeklyStreakDays: 0,
    earlyRunCount: 0,
    lateRunCount: 0,
    activeDays: 0,
    activeWeeks: 0,
    activeMonths: 0,
    longestWeekStreak: 0,
    maxDistanceKm: 0,
    totalDurationMinutes: 0,
    maxRunsPerDay: 0,
    maxRunsPerWeek: 0,
    intervalSessions: 0,
    intervalRepeatsTotal: 0,
    maxIntervalRepeats: 0,
    bestIntervalWorkPace: null,
    bestPaceMinPerKm: null,
    firstPaceMinPerKm: null,
    paceImprovementMin: 0,
    steadyPaceRunCount: 0,
    briskPaceRunCount: 0,
    fastPaceRunCount: 0,
    hasPersonalBest: false,
    hasComeback: false,
    hasLongRunBreakthrough: false,
  };

  /** Läufe je Tag und je Woche – daraus kommen Zähler und Serien. */
  const proTag = new Map();
  const proWoche = new Map();
  const monate = new Set();

  let longestSoFarKm = 0;
  /** @type {Map<number, number>} beste Dauer je PR-Distanz */
  const bestDurations = new Map();

  for (const run of chronological) {
    stats.totalDistanceKm += run.distanceKm;
    stats.maxDistanceKm = Math.max(stats.maxDistanceKm, run.distanceKm);

    proTag.set(run.date, (proTag.get(run.date) ?? 0) + 1);
    monate.add(run.date.slice(0, 7));

    const woche = weekStart(run.date);
    if (woche !== null) proWoche.set(woche, (proWoche.get(woche) ?? 0) + 1);

    // Dauer ist optional. Was fehlt, zählt nicht mit – geschätzt wird nichts.
    if (isPositive(run.durationMinutes)) stats.totalDurationMinutes += run.durationMinutes;

    // Die Pace kommt über runPaceMinPerKm: eine von Hand eingetragene zählt
    // genauso wie eine gerechnete. Läufe ohne beides fallen still heraus.
    const pace = runPaceMinPerKm(run);
    if (pace !== null && run.distanceKm >= PACE_MIN_DISTANCE_KM) {
      if (stats.firstPaceMinPerKm === null) stats.firstPaceMinPerKm = pace;
      if (stats.bestPaceMinPerKm === null || pace < stats.bestPaceMinPerKm) {
        stats.bestPaceMinPerKm = pace;
      }

      if (pace < PACE_STEADY_MIN_PER_KM) stats.steadyPaceRunCount++;
      if (pace < PACE_BRISK_MIN_PER_KM) stats.briskPaceRunCount++;
      if (pace < PACE_FAST_MIN_PER_KM) stats.fastPaceRunCount++;
    }

    // Tageszeit. Gezählt statt nur vermerkt: darauf bauen mehrere Stufen auf.
    // Läufe ohne Uhrzeit zählen für keine Seite – ohne Angabe ist nicht
    // entscheidbar, wann gelaufen wurde.
    const minutes = minutesOfDay(run.timeOfDay);
    if (minutes !== null) {
      if (minutes < 7 * 60) stats.earlyRunCount++;
      if (minutes >= 21 * 60) stats.lateRunCount++;
    }

    // Intervall-Training. Angebrochene Runden zählen nicht mit; ein Training
    // gilt als absolviert, wenn alle geplanten Runden durch sind. Wer
    // abbricht, behält die geschafften Runden, aber nicht das Training.
    const intervall = run.interval;
    if (intervall && intervall.completedRepeats > 0) {
      stats.intervalRepeatsTotal += intervall.completedRepeats;
      stats.maxIntervalRepeats = Math.max(stats.maxIntervalRepeats, intervall.completedRepeats);

      if (intervall.completedRepeats >= intervall.repeats) stats.intervalSessions++;

      const tempo = intervall.workPaceMinPerKm;
      if (typeof tempo === 'number' && Number.isFinite(tempo) && tempo > 0) {
        if (stats.bestIntervalWorkPace === null || tempo < stats.bestIntervalWorkPace) {
          stats.bestIntervalWorkPace = tempo;
        }
      }
    }

    // Längster Lauf um 20 % übertroffen
    if (longestSoFarKm > 0 && run.distanceKm >= longestSoFarKm * LONG_RUN_FACTOR) {
      stats.hasLongRunBreakthrough = true;
    }
    longestSoFarKm = Math.max(longestSoFarKm, run.distanceKm);

    // Persönlicher Rekord auf 5 bzw. 10 km
    const prDistance = matchPrDistance(run.distanceKm);
    if (prDistance !== null && isPositive(run.durationMinutes)) {
      const best = bestDurations.get(prDistance);
      if (best !== undefined && run.durationMinutes < best) {
        stats.hasPersonalBest = true;
      }
      if (best === undefined || run.durationMinutes < best) {
        bestDurations.set(prDistance, run.durationMinutes);
      }
    }
  }

  // Serien und Pausen über die Lauf-Tage
  const days = [...new Set(chronological.map((run) => toDayNumber(run.date)))].sort(
    (a, b) => a - b
  );

  let dailyStreak = 0;
  let weeklyStreakStart = null;

  days.forEach((day, index) => {
    const previous = index > 0 ? days[index - 1] : null;
    const gap = previous === null ? null : day - previous;

    if (gap !== null && gap >= 14) stats.hasComeback = true;

    dailyStreak = gap === 1 ? dailyStreak + 1 : 1;
    stats.longestDailyStreak = Math.max(stats.longestDailyStreak, dailyStreak);

    if (gap === null || gap > 7) weeklyStreakStart = day;
    stats.longestWeeklyStreakDays = Math.max(
      stats.longestWeeklyStreakDays,
      day - weeklyStreakStart + 1
    );
  });

  // Wie viel schneller als der erste gewertete Lauf. Wächst nur: die erste
  // Pace steht fest, die beste kann bloss sinken.
  if (stats.firstPaceMinPerKm !== null && stats.bestPaceMinPerKm !== null) {
    stats.paceImprovementMin = Math.max(0, stats.firstPaceMinPerKm - stats.bestPaceMinPerKm);
  }

  stats.activeDays = days.length;
  stats.activeMonths = monate.size;
  stats.activeWeeks = proWoche.size;
  stats.maxRunsPerDay = maxWert(proTag);
  stats.maxRunsPerWeek = maxWert(proWoche);

  // Wochen in Folge: die Montage liegen sieben Tage auseinander, deshalb
  // lässt sich dieselbe Nachbarschaftsprüfung wie bei den Tagen anwenden.
  const wochen = [...proWoche.keys()].map(toDayNumber).sort((a, b) => a - b);
  let wochenSerie = 0;

  wochen.forEach((woche, index) => {
    const vorige = index > 0 ? wochen[index - 1] : null;
    wochenSerie = vorige !== null && woche - vorige === 7 ? wochenSerie + 1 : 1;
    stats.longestWeekStreak = Math.max(stats.longestWeekStreak, wochenSerie);
  });

  return stats;
}

/**
 * War schon ein gewerteter Lauf schneller als diese Pace?
 *
 * Ohne einen einzigen Lauf mit Pace ist die Antwort nein, nicht "Fehler" –
 * eine fehlende Angabe ist kein Ergebnis.
 */
function underPace(stats, schwelle) {
  return stats.bestPaceMinPerKm !== null && stats.bestPaceMinPerKm < schwelle;
}

/**
 * Der Stand einer Pace-Trophäe: die bisher beste Pace und die, die es
 * bräuchte. `null` als Stand heißt "noch kein gewerteter Lauf" – das ist
 * etwas anderes als eine langsame Pace und wird auch anders angezeigt.
 */
function paceStanding(best, schwelle, label = 'Beste Pace') {
  return { label, current: best, target: schwelle, kind: 'pace' };
}

/** Grösster Wert einer Zähl-Map; 0 bei leerer Map. */
function maxWert(zaehler) {
  return zaehler.size === 0 ? 0 : Math.max(...zaehler.values());
}

/**
 * Wertet alle Achievements gegen Läufe und erledigte Übungen aus.
 *
 * @param {import('./storage.js').Run[]} runs
 * @param {import('./exercise-log.js').ExerciseEntry[]} [exerciseLog]
 * @returns {(Achievement & { unlocked: boolean, progress: ?{current: number, target: number, unit: string} })[]}
 */
export function evaluateAchievements(runs, exerciseLog = []) {
  const stats = { ...buildRunStats(runs), ...buildExerciseStats(exerciseLog) };

  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: achievement.check(stats),
    progress: achievement.progress ? achievement.progress(stats) : null,
    standing: achievement.standing ? achievement.standing(stats) : null,
  }));
}

/** Die Gruppen, in denen Achievements angezeigt werden. */
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'meilenstein', label: 'Meilensteine' },
  { id: 'herausforderung', label: 'Herausforderungen' },
  { id: 'uebung', label: 'Übungen' },
];

/**
 * Wie viele Achievements sind je Gruppe freigeschaltet?
 *
 * @param {ReturnType<typeof evaluateAchievements>} evaluated
 * @returns {{ id: string, label: string, unlocked: number, total: number }[]}
 */
export function achievementsByCategory(evaluated) {
  return ACHIEVEMENT_CATEGORIES.map(({ id, label }) => {
    const eigene = (evaluated ?? []).filter((a) => a.category === id);

    return {
      id,
      label,
      unlocked: eigene.filter((a) => a.unlocked).length,
      total: eigene.length,
    };
  });
}

/** Summe der Bonus-XP aus allen freigeschalteten Achievements. */
export function achievementXp(evaluated) {
  return evaluated.reduce((sum, a) => (a.unlocked ? sum + a.xp : sum), 0);
}

/* ----------------------------------------------------------------- Intern */

/** Ordnet eine Distanz einer PR-Distanz zu, sonst null. */
function matchPrDistance(distanceKm) {
  for (const target of PR_DISTANCES_KM) {
    if (Math.abs(distanceKm - target) <= PR_TOLERANCE_KM) return target;
  }
  return null;
}

/** "HH:MM" -> Minuten seit Mitternacht, sonst null. */
function minutesOfDay(timeOfDay) {
  if (typeof timeOfDay !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeOfDay);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** ISO-Datum -> fortlaufende Tagesnummer, damit sich Abstände rechnen lassen. */
function toDayNumber(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Chronologisch aufsteigend; ohne Uhrzeit zählt der Lauf als Tagesbeginn. */
function byTimeAsc(a, b) {
  const keyA = `${a.date}T${a.timeOfDay ?? '00:00'}`;
  const keyB = `${b.date}T${b.timeOfDay ?? '00:00'}`;
  if (keyA === keyB) return 0;
  return keyA < keyB ? -1 : 1;
}

function isPositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
