import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  numberFormat,
  distanceFormat,
  todayIso,
  toIsoDate,
  toTimeOfDay,
  formatDate,
  formatDays,
  formatMonth,
  formatAveragePace,
  splitUnit,
  round,
  r1,
} from '../js/format.js';

/**
 * Diese Funktionen standen bis B1 in `app.js` und waren damit ungeprueft –
 * nicht weil sie schwer zu pruefen waeren, sondern weil sie in einer Datei
 * lagen, die das DOM anfasst und in Node nicht laedt.
 *
 * Die Datums-Funktionen rechnen bewusst in lokaler Zeit, nicht in UTC. Die
 * Tests bauen ihre Daten deshalb mit `new Date(jahr, monat, tag)` – das ist
 * lokale Zeit – und nie aus einer ISO-Zeichenkette mit `Z`, sonst haenge das
 * Ergebnis an der Zeitzone des Rechners, auf dem sie laufen.
 */

describe('round', () => {
  test('schneidet das Fliesskomma-Rauschen ab', () => {
    // Der Grund, warum es diese Funktion gibt: 17.999999999 statt 18.
    assert.equal(round(5.1 * 3.529411764705882), 18);
  });

  test('rundet auf zwei Nachkommastellen', () => {
    assert.equal(round(1.004), 1);
    assert.equal(round(12.3456), 12.35);
    assert.equal(round(2.675), 2.68);
  });

  test('genau die Haelfte entscheidet die Binaerdarstellung, nicht die Regel', () => {
    // 1.005 liegt als Gleitkommazahl knapp unter der Haelfte: 1.005 * 100
    // ergibt 100.49999999999999, und daraus wird 1 statt 1,01. Das ist keine
    // Absicht, sondern der Preis dafuer, mit Gleitkomma zu rechnen – hier
    // festgehalten, damit es niemand fuer einen Fehler haelt und "beheben"
    // will. Fuer Kilometer und XP ist der Unterschied bedeutungslos.
    assert.equal(round(1.005), 1);
  });

  test('laesst ganze Zahlen und die Null unveraendert', () => {
    assert.equal(round(0), 0);
    assert.equal(round(42), 42);
  });

  test('rundet auch negative Werte', () => {
    assert.equal(round(-1.239), -1.24);
  });
});

describe('r1', () => {
  test('eine Nachkommastelle', () => {
    assert.equal(r1(12.34), 12.3);
    assert.equal(r1(12.35), 12.4);
  });

  test('haelt Koordinaten im Markup kurz', () => {
    // Der Zweck: aus 118.66666666666667 wird 118.7 statt siebzehn Stellen.
    assert.equal(r1(118.66666666666667), 118.7);
  });
});

describe('toIsoDate', () => {
  test('nimmt den lokalen Tag, nicht den UTC-Tag', () => {
    // 1. Maerz, kurz nach Mitternacht lokal. In einer Zeitzone oestlich von
    // Greenwich waere das UTC noch der 29. Februar – der Lauf gehoert aber
    // auf den Tag, an dem der Mensch ihn gelaufen ist.
    assert.equal(toIsoDate(new Date(2026, 2, 1, 0, 30)), '2026-03-01');
  });

  test('auch kurz vor Mitternacht', () => {
    assert.equal(toIsoDate(new Date(2026, 1, 28, 23, 30)), '2026-02-28');
  });

  test('fuellt Monat und Tag auf zwei Stellen', () => {
    assert.equal(toIsoDate(new Date(2026, 0, 5, 12)), '2026-01-05');
  });
});

describe('todayIso', () => {
  test('gibt den heutigen lokalen Tag', () => {
    assert.equal(todayIso(), toIsoDate(new Date()));
  });

  test('hat die Form JJJJ-MM-TT', () => {
    assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('toTimeOfDay', () => {
  test('zweistellig mit Doppelpunkt', () => {
    assert.equal(toTimeOfDay(new Date(2026, 7, 21, 7, 5)), '07:05');
  });

  test('Mitternacht ist 00:00, nicht 24:00', () => {
    assert.equal(toTimeOfDay(new Date(2026, 7, 21, 0, 0)), '00:00');
  });
});

describe('formatDate', () => {
  test('ISO-Tag als deutsches Datum', () => {
    assert.equal(formatDate('2026-08-21'), '21.08.2026');
  });

  test('gibt Unbrauchbares unveraendert zurueck', () => {
    // Lieber die Rohform zeigen als ein erfundenes Datum: "Invalid Date"
    // im Markup waere schlimmer als die Zeichenkette, die hereinkam.
    assert.equal(formatDate(''), '');
    assert.equal(formatDate('kein Datum'), 'kein Datum');
    assert.equal(formatDate('2026-00-10'), '2026-00-10');
  });
});

describe('formatDays', () => {
  test('null Tage sind ein Strich, keine Null', () => {
    // "0 Tage" laese sich wie ein Messwert; der Strich sagt "gibt es nicht".
    assert.equal(formatDays(0), '–');
  });

  test('Einzahl und Mehrzahl', () => {
    assert.equal(formatDays(1), '1 Tag');
    assert.equal(formatDays(2), '2 Tage');
    assert.equal(formatDays(14), '14 Tage');
  });
});

describe('formatMonth', () => {
  test('Monatsschluessel als Name mit Jahr', () => {
    // Mit Punkt: so kuerzt de-DE einen Monatsnamen ab, sobald ein Jahr
    // danebensteht. Ohne Jahr – im Aktivitaetsraster – faellt er weg.
    assert.equal(formatMonth('2026-08'), 'Aug. 2026');
    assert.equal(formatMonth('2026-01'), 'Jan. 2026');
  });

  test('der Dezember rutscht nicht ins Folgejahr', () => {
    // Der Monat ist zwoelf, der Index elf – ein Fehler um eins waere hier
    // Januar des naechsten Jahres.
    assert.equal(formatMonth('2026-12'), 'Dez. 2026');
  });
});

describe('formatAveragePace', () => {
  test('Pace mit Einheit', () => {
    assert.equal(formatAveragePace(5.5), '5:30 min/km');
  });

  test('ohne einen einzigen Lauf mit Pace steht ein Strich', () => {
    // "0:00 min/km" waere eine Behauptung ueber eine Geschwindigkeit,
    // die nie gemessen wurde.
    assert.equal(formatAveragePace(null), '–');
  });
});

describe('die Zahlenformate', () => {
  test('numberFormat schreibt das deutsche Komma', () => {
    assert.equal(numberFormat.format(8.4), '8,4');
  });

  test('numberFormat laesst ganze Zahlen ohne Nachkommastellen', () => {
    assert.equal(numberFormat.format(8), '8');
  });

  test('distanceFormat erzwingt zwei Nachkommastellen', () => {
    // Untereinander stehende Distanzen sollen an derselben Stelle brechen.
    assert.equal(distanceFormat.format(8), '8,00');
    assert.equal(distanceFormat.format(8.4), '8,40');
  });
});

/**
 * Zahl und Einheit trennen (D6).
 *
 * Die Einheit steht kleiner als die Zahl, damit "10:15 min/km" nicht umbricht.
 * Geprueft werden die Werte, die in den Kacheln wirklich vorkommen - und die
 * laengsten realistischen, denn genau an denen ist es aufgefallen.
 */
describe('splitUnit', () => {
  test('Pace', () => {
    assert.deepEqual(splitUnit('5:31 min/km'), ['5:31', 'min/km']);
    assert.deepEqual(splitUnit('10:15 min/km'), ['10:15', 'min/km']);
  });

  test('Distanzen, auch dreistellig mit Tausenderpunkt', () => {
    assert.deepEqual(splitUnit('8,99 km'), ['8,99', 'km']);
    assert.deepEqual(splitUnit('503,4 km'), ['503,4', 'km']);
    // Der Tausendertrenner ist im Deutschen ein Punkt, kein Leerzeichen -
    // sonst traefe die Trennung am letzten Leerzeichen daneben.
    assert.deepEqual(splitUnit('1.234,5 km'), ['1.234,5', 'km']);
  });

  test('Tage, Einzahl und Mehrzahl', () => {
    assert.deepEqual(splitUnit('1 Tag'), ['1', 'Tag']);
    assert.deepEqual(splitUnit('14 Tage'), ['14', 'Tage']);
  });

  test('ohne Einheit bleibt die Zahl ganz', () => {
    assert.deepEqual(splitUnit('56'), ['56', null]);
    assert.deepEqual(splitUnit('–'), ['–', null]);
  });

  test('was die Formatierer wirklich liefern, laesst sich trennen', () => {
    // Gegenprobe ueber die echten Funktionen statt ueber abgeschriebene
    // Zeichenketten: laeuft eine davon weg, faellt es hier auf.
    assert.deepEqual(splitUnit(formatAveragePace(5.5)), ['5:30', 'min/km']);
    assert.deepEqual(splitUnit(formatAveragePace(null)), ['–', null]);
    assert.deepEqual(splitUnit(formatDays(3)), ['3', 'Tage']);
    assert.deepEqual(splitUnit(formatDays(0)), ['–', null]);
  });

  test('Randfaelle brechen nichts', () => {
    assert.deepEqual(splitUnit(''), ['', null]);
    assert.deepEqual(splitUnit(' km'), [' km', null], 'fuehrendes Leerzeichen ist keine Zahl');
    assert.deepEqual(splitUnit(null), ['', null]);
    assert.deepEqual(splitUnit(undefined), ['', null]);
  });
});
