/**
 * Die Statistik im Profil: Kennzahlen, Aktivitaetsraster, Pace-Verlauf,
 * Bestzeiten und die Trophaeen-Uebersicht.
 *
 * Herausgeloest aus `app.js` (B1). Gerechnet wird weiterhin in
 * `../stats.js` – diese Datei macht aus den Zahlen Elemente.
 *
 * Anders als `views/training.js` bekommt diese Datei keinen Zugriff auf den
 * Zustand von `app.js`, sondern die Laeufe als Parameter: sie liest nur und
 * schreibt nichts, und ihr einziger Klick-Handler (das Aktivitaetsraster)
 * kommt ohne die Laeufe aus. Ein Umweg ueber Zugriffsfunktionen waere hier
 * Aufwand ohne Gegenwert.
 */

import { el, SVG_NS, createSvg } from './dom.js';
import {
  numberFormat,
  distanceFormat,
  shortMonthFormat,
  weekdayFormat,
  todayIso,
  formatDate,
  formatDays,
  formatMonth,
  formatAveragePace,
  round,
  r1,
} from '../format.js';
import { formatDuration, formatPace } from '../geo.js';
import { achievementsByCategory } from '../achievements.js';
import {
  buildStats,
  bestTimes,
  activityCalendar,
  paceTrend,
  ACTIVITY_WEEKS,
  PACE_TREND_MIN_POINTS,
} from '../stats.js';

/** Kompakte Übersicht: wie viele Achievements je Gruppe. */
export function renderTrophySummary(achievements) {
  el.profileTrophySummary.replaceChildren(
    ...achievementsByCategory(achievements).map(({ label, unlocked, total }) => {
      const zeile = document.createElement('li');
      zeile.className = unlocked === total ? 'category-row complete' : 'category-row';

      const name = document.createElement('span');
      name.className = 'category-name';
      name.textContent = label;

      const zahl = document.createElement('span');
      zahl.className = 'category-count';
      zahl.textContent = `${unlocked}/${total}`;

      const spur = document.createElement('span');
      spur.className = 'category-track';

      const balken = document.createElement('span');
      balken.className = 'category-bar';
      balken.style.width = total > 0 ? `${(unlocked / total) * 100}%` : '0';
      spur.append(balken);

      zeile.append(name, zahl, spur);
      zeile.setAttribute('aria-label', `${label}: ${unlocked} von ${total} freigeschaltet`);
      return zeile;
    })
  );
}

export function renderProfileStats(runs) {
  const stats = buildStats(runs);

  el.profileStatsEmpty.hidden = stats.runCount > 0;
  el.profileStats.hidden = stats.runCount === 0;
  if (stats.runCount === 0) return;

  el.profileStats.replaceChildren(
    ...buildStatBlocks([
      ['Gesamtdistanz', `${numberFormat.format(round(stats.totalDistanceKm))} km`],
      ['Läufe', String(stats.runCount)],
      ['Ø pro Lauf', `${numberFormat.format(round(stats.averageDistanceKm))} km`],
      ['Ø Pace', formatAveragePace(stats.averagePaceMinPerKm)],
      ['Längster Lauf', `${numberFormat.format(stats.longestRun.distanceKm)} km`],
      ['Aktive Tage', String(stats.activeDays)],
      ['Aktuelle Serie', formatDays(stats.currentDayStreak)],
      ['Längste Serie', formatDays(stats.longestDayStreak)],
    ])
  );
}

/**
 * Aktivität der letzten Wochen als Raster.
 *
 * Wochen als Spalten, Wochentage als Zeilen. Die Tage kommen chronologisch
 * herein und werden vom CSS spaltenweise verteilt – hier ist deshalb keine
 * Rechnung nötig, nur eine Schleife.
 */
export function renderActivity(runs) {
  const tage = activityCalendar(runs, { todayIso: todayIso() });

  el.heatmap.style.setProperty('--heatmap-weeks', String(ACTIVITY_WEEKS));
  el.heatmapMonths.replaceChildren(...buildHeatmapMonths(tage));
  el.heatmapGrid.replaceChildren(...tage.map(buildHeatmapCell));

  // Ein Hinweis zu einem Tag, den es nach dem Neuzeichnen nicht mehr gibt,
  // wäre eine Aussage über nichts.
  el.heatmapDetail.textContent = '';
}

/**
 * Monatsnamen über den Spalten.
 *
 * Beschriftet wird die Spalte, in der ein neuer Monat beginnt – also die
 * erste Woche, deren Montag in einem anderen Monat liegt als die davor. Die
 * erste Spalte bleibt frei: dort steht meist ein angebrochener Monat, dessen
 * Name mehr behauptet, als die Spalte zeigt.
 */
function buildHeatmapMonths(tage) {
  const labels = [];
  let letzterMonat = null;

  for (let woche = 0; woche * 7 < tage.length; woche++) {
    const montag = tage[woche * 7].date;
    const monat = montag.slice(0, 7);

    if (monat !== letzterMonat) {
      if (letzterMonat !== null) {
        const label = document.createElement('span');
        label.style.gridColumn = String(woche + 1);
        label.textContent = kurzerMonat(montag);
        labels.push(label);
      }
      letzterMonat = monat;
    }
  }

  return labels;
}

/** "2026-08-17" -> "Aug". */
function kurzerMonat(isoDate) {
  const [year, month] = isoDate.split('-').map(Number);
  return shortMonthFormat.format(new Date(year, month - 1, 1));
}

/**
 * Ein Feld je Tag.
 *
 * Als Knopf und nicht als blosse Fläche: das Feld ist antippbar, und ohne
 * Knopf gäbe es weder Tastaturbedienung noch eine Beschriftung, die eine
 * Vorlesehilfe ausgeben könnte.
 */
function buildHeatmapCell(tag) {
  const feld = document.createElement('button');
  feld.type = 'button';
  feld.className = 'heatmap-cell';
  feld.dataset.level = String(tag.level);
  feld.dataset.date = tag.date;
  feld.setAttribute('aria-pressed', 'false');

  if (tag.future) {
    feld.dataset.future = 'true';
    feld.disabled = true;
    feld.setAttribute('aria-hidden', 'true');
    feld.tabIndex = -1;
  }

  feld.setAttribute('aria-label', describeActivityDay(tag));
  return feld;
}

/** "Mo, 17.08.2026 · 8,40 km · 1 Lauf" bzw. "… · kein Lauf". */
function describeActivityDay(tag) {
  const [year, month, day] = tag.date.split('-').map(Number);
  const wochentag = weekdayFormat.format(new Date(year, month - 1, day));
  const kopf = `${wochentag}, ${formatDate(tag.date)}`;

  if (tag.runCount === 0) return `${kopf} · kein Lauf`;

  const laeufe = `${tag.runCount} ${tag.runCount === 1 ? 'Lauf' : 'Läufe'}`;
  return `${kopf} · ${distanceFormat.format(tag.distanceKm)} km · ${laeufe}`;
}

/**
 * Ein angetipptes Feld erklärt sich in der Zeile darunter.
 *
 * Über die Liste statt an jedem Feld: hundertsechsundzwanzig eigene Handler
 * wären hundertsechsundzwanzigmal dasselbe.
 */
export function setupHeatmap() {
  el.heatmapGrid.addEventListener('click', (event) => {
    const feld = event.target.closest('.heatmap-cell');
    if (feld === null) return;

    const schonOffen = feld.getAttribute('aria-pressed') === 'true';

    for (const anderes of el.heatmapGrid.querySelectorAll('[aria-pressed="true"]')) {
      anderes.setAttribute('aria-pressed', 'false');
    }

    if (schonOffen) {
      el.heatmapDetail.textContent = '';
      return;
    }

    feld.setAttribute('aria-pressed', 'true');
    el.heatmapDetail.textContent = feld.getAttribute('aria-label');
  });
}

/* ------------------------------------------------------ Pace-Verlauf */

/** Zeichenfläche der Verlaufslinie, in Einheiten des viewBox. */
const PACE_CHART = {
  width: 320,
  height: 150,
  padTop: 10,
  padRight: 6,
  padBottom: 18,
  // Links Platz für die Pace-Beschriftung ("5:30").
  padLeft: 30,
};

/**
 * Ø-Pace im Verlauf als Linie.
 *
 * Unter drei Punkten wird nichts gezeichnet: zwei Werte sind ein Vergleich,
 * keine Entwicklung, und als Linie behaupten sie eine Richtung, die die Daten
 * nicht hergeben.
 */
export function renderPaceTrend(runs) {
  const { period, points } = paceTrend(runs);
  const genug = points.length >= PACE_TREND_MIN_POINTS;

  el.paceTrendEmpty.hidden = genug;
  el.paceTrend.hidden = !genug;
  el.paceTrendCaption.hidden = !genug;

  if (!genug) {
    el.paceTrend.replaceChildren();
    return;
  }

  el.paceTrendCaption.textContent =
    period === 'month'
      ? 'Ø-Pace je Monat. Weiter oben heisst schneller.'
      : 'Ø-Pace je Woche. Weiter oben heisst schneller.';

  el.paceTrend.replaceChildren(createPaceChart(points, period));
}

function createPaceChart(points, period) {
  const { width, height, padTop, padRight, padBottom, padLeft } = PACE_CHART;
  const innenBreite = width - padLeft - padRight;
  const innenHoehe = height - padTop - padBottom;

  const paces = points.map((p) => p.paceMinPerKm);
  const skala = paceScale(Math.min(...paces), Math.max(...paces));

  // Die Achse steht auf dem Kopf: die schnellste Pace ist der kleinste Wert
  // und gehört nach oben, sonst läse sich jede Verbesserung als Absturz.
  const y = (pace) => padTop + ((pace - skala.min) / (skala.max - skala.min)) * innenHoehe;
  const x = (index) =>
    points.length === 1
      ? padLeft + innenBreite / 2
      : padLeft + (index / (points.length - 1)) * innenBreite;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent =
    `Ø-Pace je ${period === 'month' ? 'Monat' : 'Woche'} über ${points.length} Zeiträume, ` +
    `von ${formatPace(points[0].paceMinPerKm)} auf ${formatPace(points.at(-1).paceMinPerKm)} min/km`;
  svg.append(title);

  for (const marke of skala.ticks) {
    svg.append(
      createSvg('line', {
        class: 'pace-grid',
        x1: padLeft,
        x2: width - padRight,
        y1: r1(y(marke)),
        y2: r1(y(marke)),
      }),
      createSvg('text', {
        class: 'pace-axis-label',
        x: padLeft - 5,
        y: r1(y(marke) + 3),
        'text-anchor': 'end',
      }, formatPace(marke))
    );
  }

  const stellen = points.map((punkt, index) => `${r1(x(index))},${r1(y(punkt.paceMinPerKm))}`);

  svg.append(
    createSvg('polygon', {
      class: 'pace-area',
      points: [`${r1(x(0))},${height - padBottom}`, ...stellen, `${r1(x(points.length - 1))},${height - padBottom}`].join(' '),
    }),
    createSvg('polyline', { class: 'pace-line', points: stellen.join(' ') })
  );

  points.forEach((punkt, index) => {
    svg.append(
      createSvg('circle', {
        class: 'pace-point',
        cx: r1(x(index)),
        cy: r1(y(punkt.paceMinPerKm)),
        r: 3,
      })
    );
  });

  // Nur der erste und der letzte Zeitraum werden beschriftet – dazwischen
  // stünden die Beschriftungen auf einem Handy übereinander.
  svg.append(
    createSvg('text', {
      class: 'pace-axis-label',
      x: padLeft,
      y: height - 5,
      'text-anchor': 'start',
    }, formatTrendPoint(points[0].start, period)),
    createSvg('text', {
      class: 'pace-axis-label',
      x: width - padRight,
      y: height - 5,
      'text-anchor': 'end',
    }, formatTrendPoint(points.at(-1).start, period))
  );

  return svg;
}

/**
 * Wertebereich der Achse samt Gitterlinien.
 *
 * Etwas Luft nach beiden Seiten, damit die Linie nicht am Rand klebt. Liegen
 * alle Werte gleich, bekommt die Achse trotzdem eine Spanne – sonst wäre sie
 * null breit und jede Rechnung darauf eine Division durch null.
 */
function paceScale(min, max) {
  const luft = Math.max((max - min) * 0.2, 0.25);
  const unten = Math.max(0, min - luft);
  const oben = max + luft;

  return {
    min: unten,
    max: oben,
    ticks: [unten, (unten + oben) / 2, oben],
  };
}

/** Wochenbeginn als "18.08.", Monat als "Aug 2026". */
function formatTrendPoint(isoDate, period) {
  if (period === 'month') return formatMonth(isoDate.slice(0, 7));

  const [year, month, day] = isoDate.split('-').map(Number);
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.`;
}

/**
 * Bestzeiten über die gängigen Distanzen.
 *
 * Alle Marken stehen immer da, auch die noch offenen: eine Liste, die mit
 * jedem Lauf um eine Zeile wächst, verrät nicht, was überhaupt zu holen ist.
 * Die offenen Zeilen treten dafür farblich zurück.
 */
export function renderBestTimes(runs) {
  el.bestTimes.replaceChildren(
    ...bestTimes(runs).map((eintrag) => {
      const zeile = document.createElement('li');

      const block = document.createElement('div');
      block.className = eintrag.durationMinutes === null ? 'best-time empty' : 'best-time';

      const marke = document.createElement('span');
      marke.className = 'best-time-distance';
      marke.textContent = `${numberFormat.format(eintrag.targetKm)} km`;

      const tag = document.createElement('span');
      tag.className = 'best-time-date';

      const wert = document.createElement('span');
      wert.className = 'best-time-value';

      if (eintrag.durationMinutes === null) {
        wert.textContent = 'noch keine Zeit';
      } else {
        wert.textContent = formatDuration(eintrag.durationMinutes * 60_000);
        // Die tatsächlich gelaufene Strecke gehört dazu: 5,07 km erklärt,
        // warum diese Zeit für die 5-km-Marke zählt.
        tag.textContent =
          `${formatDate(eintrag.date)} · ${numberFormat.format(eintrag.distanceKm)} km`;
      }

      block.append(marke, tag, wert);
      zeile.append(block);
      return zeile;
    })
  );
}

/** Kacheln fürs .stat-grid – dieselbe Form für Zeitraum und Gesamtstand. */
export function buildStatBlocks(werte) {
  return werte.map(([label, wert]) => {
    const block = document.createElement('div');
    block.className = 'stat';

    const dt = document.createElement('dt');
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.textContent = wert;

    block.append(dt, dd);
    return block;
  });
}
