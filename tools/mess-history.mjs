/**
 * Wie teuer ist das Durchspielen der Historie? (Roadmap-Punkt B4)
 *
 * Aufruf aus dem Projektordner:  node tools/mess-history.mjs
 *
 * **Warum dieses Skript im Baum liegt.** Die Antwort auf B4 hängt an der Zahl
 * der Läufe, und die wächst. Eine Messung, die einmal gemacht und nur
 * aufgeschrieben wurde, ist ab dem nächsten Jahr eine Behauptung. Hier steht
 * sie so, dass sie sich wiederholen lässt.
 *
 * **Warum es nicht unter `js/` liegt.** Es ist kein Teil der App: es wird nie
 * geladen, gehört deshalb nicht in `APP_SHELL` und hat keine Testdatei. Ein
 * Test für eine Messung würde nichts messen – die Zahlen sind das Ergebnis,
 * nicht eine Zusicherung. Die Regel „neues Modul → Test und APP_SHELL" meint
 * die Module der App, nicht das Werkzeug daneben.
 *
 * Kein Zufall im Spiel: dieselbe Eingabe ergibt dieselben Läufe. Zwei
 * Messungen auf demselben Rechner sind damit vergleichbar.
 */

import { achievementUnlockDates, replayHistory } from '../js/history.js';
import { evaluateAchievements, ACHIEVEMENTS } from '../js/achievements.js';

const tag = (offset) => new Date(Date.UTC(2020, 0, 1 + offset)).toISOString().slice(0, 10);

/** n Läufe über die Jahre verteilt, mit Dauer, Uhrzeit und Erfassungsart. */
const laeufe = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    date: tag(Math.floor(i * 2.2)),
    distanceKm: 4 + ((i * 7) % 14),
    durationMinutes: 25 + ((i * 5) % 60),
    timeOfDay: ['06:30', '12:00', '18:15', '21:30'][i % 4],
    source: i % 3 === 0 ? 'gps' : 'manual',
  }));

const UEBUNGS_IDS = [
  'warmup-hampelmann',
  'kraft-plank',
  'drills-skippings',
  'mobility-huefte',
  'regeneration-dehnen',
];

/** m Übungs-Einträge, drei pro Tag, reihum durch fünf Kategorien. */
const uebungen = (m) =>
  Array.from({ length: m }, (_, i) => ({
    id: `u${i}`,
    exerciseId: UEBUNGS_IDS[i % UEBUNGS_IDS.length],
    date: tag(Math.floor(i / 3)),
    at: i,
  }));

/** Median mehrerer Durchläufe; der erste zählt als Aufwärmen für den JIT. */
function miss(fn, durchlaeufe = 3) {
  fn();
  const zeiten = [];

  for (let i = 0; i < durchlaeufe; i++) {
    const start = process.hrtime.bigint();
    fn();
    zeiten.push(Number(process.hrtime.bigint() - start) / 1e6);
  }

  zeiten.sort((a, b) => a - b);
  return zeiten[Math.floor(zeiten.length / 2)];
}

console.log(`Node ${process.version} · ${process.platform} ${process.arch}`);
console.log('Ein Telefon rechnet drei- bis zehnmal langsamer als ein Rechner.\n');

console.log('achievementUnlockDates() – nur Läufe');
console.log('     n         ms   ms/Lauf   gegen die halbe Größe');
let vorher = null;
for (const n of [100, 200, 500, 1000, 2000]) {
  const runs = laeufe(n);
  const ms = miss(() => achievementUnlockDates(runs, []), n > 1000 ? 3 : 7);
  console.log(
    `  ${String(n).padStart(4)}  ${ms.toFixed(1).padStart(9)}  ${(ms / n).toFixed(3).padStart(8)}` +
      `   ${vorher === null ? '–' : (ms / vorher).toFixed(2) + '\u00d7'}`
  );
  vorher = ms;
}

console.log('\nachievementUnlockDates() – Läufe und Übungen, drei pro Tag');
console.log('   Läufe   Übungen         ms');
for (const [n, m] of [
  [200, 600],
  [500, 1500],
  [1000, 3000],
]) {
  const runs = laeufe(n);
  const log = uebungen(m);
  const ms = miss(() => achievementUnlockDates(runs, log), 2);
  console.log(`  ${String(n).padStart(6)}  ${String(m).padStart(8)}  ${ms.toFixed(0).padStart(9)}`);
}

console.log('\nZum Vergleich: evaluateAchievements() – der Jetzt-Zustand, einmal');
for (const n of [200, 1000, 2000]) {
  const runs = laeufe(n);
  console.log(`  ${String(n).padStart(4)} Läufe: ${miss(() => evaluateAchievements(runs, []), 15).toFixed(3)} ms`);
}

// Ein früher Abbruch wäre die billigste Abhilfe – aber nur, wenn wirklich
// jede Trophäe irgendwann fällt. Sonst tritt die Abbruchbedingung nie ein.
console.log('\nTaugt ein früher Abbruch? (nur wenn am Ende ALLE freigeschaltet sind)');
for (const [n, m] of [
  [500, 1500],
  [2000, 0],
]) {
  const schritte = replayHistory(laeufe(n), uebungen(m));
  const gesehen = new Set();
  let letzter = -1;

  schritte.forEach((schritt, i) => {
    for (const id of schritt.unlocked) {
      if (!gesehen.has(id)) {
        gesehen.add(id);
        letzter = i;
      }
    }
  });

  console.log(
    `  ${n} Läufe + ${m} Übungen: ${gesehen.size} von ${ACHIEVEMENTS.length} freigeschaltet` +
      ` – letzte bei Schritt ${letzter + 1} von ${schritte.length}`
  );
}
