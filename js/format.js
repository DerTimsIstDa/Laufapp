/**
 * Zahlen, Daten und Zeiten in die Form bringen, in der sie angezeigt werden.
 *
 * Rein: kein DOM, kein Storage. Diese Funktionen standen bis B1 verstreut in
 * `app.js` – dort waren sie die einzigen Zeilen, die rechneten statt
 * anzuzeigen, und damit die einzigen, die man hätte testen können, aber nicht
 * konnte. Hier liegen sie an einer Stelle und haben eine Testdatei.
 *
 * Sprache und Format sind fest auf de-DE: die App ist einsprachig, und ein
 * Umschalten über die Browsersprache würde Kommas und Punkte tauschen, ohne
 * dass jemand danach gefragt hätte.
 */

import { formatPace } from './geo.js';

export const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

export const distanceFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const monthFormat = new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' });

/** Ohne Jahr – über einer Spalte des Aktivitätsrasters ist dafür kein Platz. */
export const shortMonthFormat = new Intl.DateTimeFormat('de-DE', { month: 'short' });

export const weekdayFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });

export function todayIso() {
  return toIsoDate(new Date());
}

/** Date -> "YYYY-MM-DD" in lokaler Zeit (nicht UTC). */
export function toIsoDate(date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Date -> "HH:MM" in lokaler Zeit. */
export function toTimeOfDay(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return dateFormat.format(new Date(year, month - 1, day));
}

export function formatDays(count) {
  return count === 0 ? '–' : `${count} ${count === 1 ? 'Tag' : 'Tage'}`;
}

/** "2026-08" -> "Aug 2026". */
export function formatMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormat.format(new Date(year, monthNumber - 1, 1));
}

/** Zwei Nachkommastellen, ohne Fließkomma-Rauschen wie 17.999999999. */
export function round(value) {
  return Math.round(value * 100) / 100;
}

/** Eine Nachkommastelle reicht für Pixel und hält das Markup kurz. */
export function r1(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Ø-Pace als "5:30 min/km". Ohne einen einzigen Lauf mit Pace steht dort ein
 * Strich – "0:00" wäre eine Behauptung.
 */
export function formatAveragePace(minPerKm) {
  return minPerKm === null ? '–' : `${formatPace(minPerKm)} min/km`;
}

/**
 * Zerlegt einen fertigen Anzeigewert in Zahl und Einheit.
 *
 * "5:31 min/km" -> ["5:31", "min/km"] · "503,4 km" -> ["503,4", "km"] ·
 * "56" -> ["56", null] · "–" -> ["–", null]
 *
 * Warum nicht an der Quelle trennen: die Werte entstehen an dreizehn Stellen
 * in zwei Ansichten, und `formatAveragePace()` wird auch dort gebraucht, wo
 * die Einheit dranbleiben soll. Ein dritter Eintrag je Kachel haette die
 * Null-Behandlung von Pace und Tagen an jede Stelle kopiert.
 *
 * Getrennt wird am **letzten** Leerzeichen. Das traegt, weil die Zahlen aus
 * `Intl.NumberFormat('de-DE')` kommen und dort der Tausenderpunkt ein Punkt
 * ist, kein Leerzeichen - "1.234,5 km" hat genau ein Leerzeichen. Kaeme eine
 * Sprache mit Leerzeichen als Trenner dazu, waere das hier die Stelle.
 *
 * @param {string} text
 * @returns {[string, string | null]}
 */
export function splitUnit(text) {
  if (typeof text !== 'string') return ['', null];

  const letztes = text.lastIndexOf(' ');
  if (letztes <= 0) return [text, null];

  return [text.slice(0, letztes), text.slice(letztes + 1)];
}
