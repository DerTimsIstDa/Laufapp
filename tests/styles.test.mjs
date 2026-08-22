import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ACTIVITY_WEEKS } from '../js/stats.js';
import { WEATHERS, FEELINGS } from '../js/validation.js';
import { quelltextDerModule, lies } from './helpers.mjs';

/**
 * Der Quelltext aller Module hintereinander.
 *
 * Diese Tests suchen nach Regeln im Code, nicht nach Verhalten – in welcher
 * Datei die Zeile steht, ist fuer sie ohne Belang. Bis B1 stand hier
 * `js/app.js`, weil das dieselbe Datei war wie "die App". Seit die Ansichten
 * unter `js/views/` liegen, ist es das nicht mehr.
 */
const app = quelltextDerModule();

/**
 * CSS-Regeln, die sich in Node nicht am Verhalten prüfen lassen, aber halten
 * müssen. Diese Tests lesen die Quelle – grob, aber besser als nichts.
 */
const css = lies(new URL('../css/style.css', import.meta.url));
const html = lies(new URL('../index.html', import.meta.url));

/**
 * Die Kästchen-Reihen im Formular gegen ihre Datenquelle.
 *
 * Die Auswahl steht zweimal da: als Liste in `validation.js` (die prüft und
 * beschriftet) und als Markup in `index.html` (das man antippt). Läuft eines
 * dem anderen davon, gibt es keinen Fehler – es fehlt nur ein Kästchen, oder
 * ein Symbol bleibt leer. Beides sieht man erst im Browser, und ein leeres
 * <use> sieht man dort nicht einmal, weil an der Stelle einfach nichts steht.
 */
describe('Auswahlreihen im Formular decken sich mit den Daten', () => {
  test('zu jedem Wetter gibt es ein Radiofeld', () => {
    for (const { value } of WEATHERS) {
      assert.ok(
        html.includes(`name="weather" value="${value}"`),
        `kein Radiofeld für '${value}'`
      );
    }
  });

  test('kein Radiofeld ohne Wetter dahinter', () => {
    const werte = [...html.matchAll(/name="weather" value="([^"]+)"/g)].map((m) => m[1]);

    assert.equal(werte.length, WEATHERS.length, 'Markup und Liste sind verschieden lang');
    assert.deepEqual(werte.sort(), WEATHERS.map((w) => w.value).sort());
  });

  test('jedes genannte Symbol ist auch definiert', () => {
    // Ein <use> auf eine id, die es nicht gibt, zeichnet nichts. Kein Fehler,
    // keine Meldung – an der Stelle ist einfach Luft.
    for (const { icon } of WEATHERS) {
      assert.ok(html.includes(`<g id="${icon}">`), `${icon} steht nicht im Symbolvorrat`);
      assert.ok(html.includes(`href="#${icon}"`), `${icon} wird nirgends geholt`);
    }
  });

  test('zu jeder Stufe der Gefühlsskala gibt es ein Radiofeld', () => {
    const werte = [...html.matchAll(/name="feeling" value="([^"]+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(werte, FEELINGS.map((f) => f.value));
  });

  test('beide Reihen teilen sich dieselbe Bauart', () => {
    // Zwei Fragen, die dasselbe tun, sollen sich nicht verschieden anfühlen.
    assert.ok(css.includes('.choice-scale label'), 'die gemeinsame Regel fehlt');
    assert.equal(css.includes('.feeling-scale'), false, 'alte Einzelregel noch da');
  });
});

/**
 * Farben gehören in die Token-Blöcke, nirgendwo sonst.
 *
 * Das ist die Bedingung, unter der es zwei Farbschemata überhaupt geben kann.
 * Eine Farbe mitten im Regelwerk lässt sich nicht umschalten – sie bleibt im
 * hellen Schema stehen, wo sie hingehörte, als alles dunkel war. Ein weisses
 * `rgba(255,255,255,0.07)` als aufgesetzte Fläche ist auf Weiss schlicht
 * unsichtbar, und niemand bemerkt es, solange niemand umschaltet.
 *
 * Vor C10 standen 23 solche Werte im Stylesheet – während die Roadmap
 * behauptete, „alle Werte hängen schon an Custom Properties". Dieser Test
 * sorgt dafür, dass die Behauptung ab jetzt stimmt.
 */
describe('Farben stehen nur in den Token-Blöcken', () => {
  const ANFAENGE = [':root {', ":root:not([data-theme='dark']) {", ":root[data-theme='light'] {"];

  /** Der Inhalt eines Blocks ab seinem Anfang bis zur schliessenden Klammer. */
  const block = (anfang) => {
    const von = css.indexOf(anfang);
    if (von < 0) return '';

    const bis = css.indexOf('}', von + anfang.length);
    return css.slice(von, bis + 1);
  };

  const tokenBloecke = () => ANFAENGE.map(block).filter((b) => b !== '');

  /** Das Stylesheet ohne die Token-Blöcke. */
  const ohneToken = () => {
    let rest = css;
    for (const b of tokenBloecke()) rest = rest.replace(b, '');
    return rest;
  };

  const farbenIn = (text) => [...new Set(text.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/g) ?? [])];

  test('die Token-Blöcke werden wirklich gefunden', () => {
    // Ohne diese Prüfung wäre der Test unten auch dann grün, wenn die
    // Blockerkennung nichts findet und deshalb alles als "Token" durchgeht.
    const bloecke = tokenBloecke();

    assert.equal(bloecke.length, ANFAENGE.length, 'ein Token-Block fehlt');
    assert.ok(
      bloecke.every((b) => b.includes('--bg:')),
      'ein erkannter Block enthält kein --bg – die Erkennung greift daneben'
    );
  });

  test('ausserhalb steht kein einziger Farbwert', () => {
    const gefunden = farbenIn(ohneToken());

    assert.deepEqual(
      gefunden,
      [],
      `Diese Farben gehören in den Token-Block, sonst lassen sie sich nicht ` +
        `umschalten: ${gefunden.join(', ')}`
    );
  });

  test('in den Token-Blöcken stehen sie sehr wohl', () => {
    // Der Gegenbeweis zum Test darüber: Fände die Suche generell keine
    // Farben, wäre er aus dem falschen Grund grün.
    for (const b of tokenBloecke()) {
      assert.ok(farbenIn(b).length > 10, 'ein Token-Block ohne nennenswerte Farben');
    }
  });
});

describe('Das helle Schema überschreibt nur, was es schon gibt', () => {
  const namenIn = (text) => [...text.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]);

  const bis = (anfang) => {
    const von = css.indexOf(anfang);
    return css.slice(von, css.indexOf('}', von + anfang.length));
  };

  const dunkel = () => namenIn(bis(':root {'));
  const hell = () => namenIn(bis(":root[data-theme='light'] {"));

  test('keine Farbe hat ihre einzige Definition im hellen Block', () => {
    // Sonst fehlte im dunklen Schema ein Wert, den niemand vermisst, bis er
    // gebraucht wird.
    const nurHell = hell().filter((name) => !dunkel().includes(name));

    assert.deepEqual(nurHell, [], `nur im hellen Schema definiert: ${nurHell.join(', ')}`);
  });

  test('das helle Schema fasst Abstände und Formen nicht an', () => {
    // Ein Farbschema ändert Farben. Wandert eine Grösse mit, hat die App zwei
    // Layouts statt zwei Paletten – und nur eines davon wird je geprüft.
    const groessen = hell().filter((n) => /^--(space|radius|field|label|share|font|ease)/.test(n));

    assert.deepEqual(groessen, [], `Grössen im hellen Schema: ${groessen.join(', ')}`);
  });

  test('das helle Schema deckt die Farben des dunklen ab', () => {
    // Eine Farbe, die oben steht und unten fehlt, bleibt im hellen Schema
    // dunkel stehen – der Fehler, den man erst beim Umschalten sieht.
    const FARBTOKEN = /^--(bg|sunken|surface|line|text|body|muted|dim|accent|danger|fill|bar|shadow|heat|unlock)/;
    const fehlend = dunkel().filter((n) => FARBTOKEN.test(n) && !hell().includes(n));

    assert.deepEqual(fehlend, [], `im hellen Schema nicht überschrieben: ${fehlend.join(', ')}`);
  });

  test('beide Schemata setzen color-scheme', () => {
    // Ohne das bleiben Bildlaufleisten, Datums- und Auswahlfelder in der
    // Farbe des jeweils anderen Schemas stehen.
    assert.ok(bis(':root {').includes('color-scheme: dark'), 'das dunkle setzt es nicht');
    assert.ok(bis(":root[data-theme='light'] {").includes('color-scheme: light'), 'das helle nicht');
  });
});

describe('[hidden] sticht jede eigene display-Regel', () => {
  test('die Rücksetzregel steht im Stylesheet', () => {
    // Das eingebaute [hidden] des Browsers ist nur `display: none` mit
    // niedrigster Priorität. Ohne diese Regel gewinnt jedes eigene
    // `display: flex` – das Element trägt hidden und steht trotzdem da.
    assert.match(
      css,
      /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/,
      'ohne diese Regel bleiben versteckte Bereiche sichtbar'
    );
  });

  test('keine andere Regel setzt display mit !important dagegen', () => {
    // Auf die Reihenfolge kommt es nicht an – !important gewinnt ohnehin.
    // Gefährlich wäre nur ein zweites !important auf display.
    const konkurrenz = [...css.matchAll(/display:\s*[^;]*!important/g)];
    assert.equal(konkurrenz.length, 1, 'es gibt mehr als eine display-!important-Regel');
  });
});

describe('Eingabefelder sind zentral bemasst', () => {
  test('die Masse stehen als Token, nicht in den Regeln', () => {
    for (const token of [
      '--field-height',
      '--field-pad-x',
      '--field-pad-y',
      '--label-gap',
      '--field-gap',
      '--field-gap-x',
    ]) {
      assert.match(css, new RegExp(`${token}:\\s*[^;]+;`), `${token} fehlt`);
    }
  });

  test('Text, Auswahl und Datum teilen sich eine Grundregel', () => {
    // Ohne gemeinsame Regel wird ein Datumsfeld anders hoch als ein Dropdown,
    // weil beide eigene Innenteile mitbringen.
    const regel = /input,\s*select,\s*textarea\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, 'input/select/textarea haben keine gemeinsame Regel');
    assert.match(regel[1], /min-height:\s*var\(--field-height\)/);
    assert.match(regel[1], /padding:\s*var\(--field-pad-y\)\s+var\(--field-pad-x\)/);
  });

  test('einzeilige Felder haben eine feste Höhe, die Textfläche nicht', () => {
    // min-height allein reicht nicht: Datum, Uhrzeit und Auswahl werden in
    // WebKit sonst höher als ein Textfeld daneben.
    const regel = /input,\s*select\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, 'input/select haben keine gemeinsame Höhenregel');
    assert.match(regel[1], /height:\s*var\(--field-height\)/);
  });

  test('Datum und Uhrzeit werden auf das Aussehen der Textfelder gebracht', () => {
    // WebKit stellt den Wert sonst mittig dar und bringt eigene Abstände mit.
    assert.match(css, /input\[type="date"\][^{]*\{[^}]*appearance:\s*none/);
    assert.match(css, /::-webkit-date-and-time-value\s*\{[^}]*text-align:\s*left/);
  });

  test('nebeneinander stehende Felder bekommen mehr Luft als übereinander', () => {
    const regel = /\.fields\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, '.fields fehlt');
    assert.match(regel[1], /row-gap:\s*var\(--field-gap\)/);
    assert.match(regel[1], /column-gap:\s*var\(--field-gap-x\)/);
  });

  test('kein Formular bemasst seine Felder selbst', () => {
    // Erlaubt ist nur, die Token neu zu setzen (macht .segment). Eine eigene
    // padding- oder height-Angabe an einem Feld läuft mit der Zeit auseinander.
    const eigenmass = [...css.matchAll(/#[a-z-]+ (input|select)[^{]*\{([^}]*)\}/g)].filter(
      ([, , block]) => /(^|;)\s*(padding|height|min-height):/.test(block)
    );
    assert.deepEqual(eigenmass.map((m) => m[0].split('{')[0].trim()), []);
  });

  test('Felder einer Reihe teilen sich die Beschriftungszeile', () => {
    // Sonst genügt eine Beschriftung, die umbricht, um das Feld daneben um
    // eine Zeilenhöhe tiefer zu setzen – so standen "Dein Name" und "Läufe
    // pro Woche" im Profil versetzt.
    const regel = /\n\.field \{([^}]*)\}/.exec(css);
    assert.ok(regel, '.field fehlt');
    assert.match(regel[1], /grid-template-rows:\s*subgrid/);
    assert.match(regel[1], /grid-row:\s*span 2/);
  });

  test('ohne subgrid rutscht das Feld ans untere Ende', () => {
    // Auch dann stehen die Eingabefelder einer Reihe auf einer Höhe.
    const fallback = /@supports not \(grid-template-rows: subgrid\)\s*\{([\s\S]*?)\n\}/.exec(css);
    assert.ok(fallback, 'der Rückfallweg fehlt');
    assert.match(fallback[1], /\.field > :last-child\s*\{[^}]*margin-top:\s*auto/);
  });

  test('Beschriftung und Feld hängen am selben Abstand', () => {
    assert.match(css, /\.field\s*\{[^}]*gap:\s*var\(--label-gap\)/);
    assert.match(css, /\.count-label\s*\{[^}]*margin-bottom:\s*var\(--label-gap\)/);
  });
});

describe('Zahlenfelder nehmen ein Komma an', () => {
  /** Ohne das stolpert die Prüfung über den Kommentar, der die Regel erklärt. */
  const ohneKommentare = html.replace(/<!--[\s\S]*?-->/g, '');

  test('kein Feld ist type="number"', () => {
    // type="number" verwirft "0,4" schon beim Tippen – auf einer deutschen
    // Tastatur ist das die normale Schreibweise. Geprüft wird in
    // validation.js bzw. training.js, nicht vom Browser.
    assert.doesNotMatch(ohneKommentare, /type="number"/);
    assert.doesNotMatch(app, /\.type = 'number'/);
  });

  test('die Zifferntastatur kommt trotzdem', () => {
    // Ohne inputmode bekäme man auf dem Handy die Buchstabentastatur.
    const felder = [...ohneKommentare.matchAll(/<input\b[^>]*type="text"[^>]*>/gs)];
    assert.ok(felder.length > 0, 'kein Textfeld im Markup gefunden');

    for (const [tag] of felder) {
      if (/id="(distance|duration)"/.test(tag)) {
        assert.match(tag, /inputmode="decimal"/, `inputmode fehlt: ${tag}`);
      }
    }
  });
});

describe('Bereiche und Umschaltung', () => {
  /** Aus dem Markup gelesen statt fest verdrahtet – wächst mit. */
  const views = [...html.matchAll(/<div class="view" id="(view-[a-z]+)"/g)].map((m) => m[1]);

  test('es gibt die fünf erwarteten Bereiche', () => {
    assert.deepEqual(views.sort(), [
      'view-exercises',
      'view-profile',
      'view-start',
      'view-training',
      'view-trophies',
    ]);
  });

  test('jeder Bereich hat einen Tab, der ihn steuert', () => {
    for (const id of views) {
      assert.ok(html.includes(`aria-controls="${id}"`), `kein Tab steuert ${id}`);
    }
  });

  test('so viele Tabs wie Bereiche', () => {
    const tabs = [...html.matchAll(/role="tab"/g)];
    assert.equal(tabs.length, views.length);
  });

  test('nur der Startbereich ist beim Laden offen', () => {
    // Die anderen tragen hidden – zusammen mit der Regel oben heisst das:
    // wirklich weg, nicht nur ausgezeichnet.
    assert.doesNotMatch(html, /id="view-start"[^>]*\shidden/);

    for (const id of views.filter((v) => v !== 'view-start')) {
      assert.match(html, new RegExp(`id="${id}"[^>]*\\shidden`), `${id} ist nicht versteckt`);
    }
  });

  test('genau ein Tab ist vorausgewählt', () => {
    const ausgewaehlt = [...html.matchAll(/aria-selected="true"/g)];
    assert.equal(ausgewaehlt.length, 1);
  });
});

describe('Titelzeile im Profil', () => {
  test('der Titel steht auf der Mittelachse, nicht neben dem Knopf', () => {
    // Als Flex-Zeile war das Paar aus Titel und Knopf mittig – der Titel
    // selbst damit um die halbe Knopfbreite links vom Abzeichen darüber.
    const regel = /\.profile-rank-row\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, '.profile-rank-row fehlt');
    assert.match(regel[1], /display:\s*grid/);
    assert.match(regel[1], /grid-template-columns:[\s\S]*1fr[\s\S]*auto[\s\S]*1fr/);
    assert.match(regel[1], /align-items:\s*center/);
  });

  test('der Knopf sitzt in der Spalte rechts daneben', () => {
    assert.match(css, /\.profile-rank-row \.share-button\s*\{[^}]*grid-column:\s*3/);
    assert.match(css, /\.profile-rank-row \.share-button\s*\{[^}]*justify-self:\s*start/);
  });

  test('Titel und Knopf tragen keinen eigenen oberen Abstand mehr', () => {
    // Zwei verschiedene margin-top in einer zentrierten Zeile hiessen: beide
    // stehen unterschiedlich hoch.
    assert.match(css, /\.profile-rank\s*\{[^}]*margin:\s*0;/);
    assert.doesNotMatch(css, /\.share-button\s*\{[^}]*margin-top/);
  });

  test('der Knopf passt immer neben den längsten Titel', () => {
    // Die Aussenspalten haben mindestens Knopfbreite; wird es eng, bricht
    // lieber der Titel um, als dass der Knopf aus der Karte läuft.
    assert.match(css, /--share-button-size:/);
    assert.match(css, /\.profile-rank-row\s*\{[^}]*minmax\(var\(--share-button-size\), 1fr\)/);
    assert.match(css, /\.profile-rank-row \.profile-rank\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });
});

describe('Aktivitätsraster im Profil', () => {
  test('es steht im Profil, nicht im Statistik-Bereich mit dem Umschalter', () => {
    // Der Statistik-Bereich schaltet zwischen Woche und Monat um; ein Raster
    // über ein Vierteljahr hätte über einer Wochenansicht nichts zu suchen.
    assert.match(html, /id="activity-title"/);
    assert.doesNotMatch(
      /<section class="card" aria-labelledby="period-title">[\s\S]*?<\/section>/.exec(html)[0],
      /heatmap/
    );
  });

  test('Wochen als Spalten, Wochentage als Zeilen', () => {
    const regel = /\.heatmap-grid\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, '.heatmap-grid fehlt');
    assert.match(regel[1], /grid-template-rows:\s*repeat\(7,/);
    // Spaltenweise gefüllt – nur so landet jede Woche in einer Spalte, ohne
    // dass beim Erzeugen gerechnet werden muss.
    assert.match(regel[1], /grid-auto-flow:\s*column/);
  });

  test('CSS und Rechnung meinen dieselbe Zahl Wochen', () => {
    const ausCss = /--heatmap-weeks:\s*(\d+)/.exec(css);
    assert.ok(ausCss, '--heatmap-weeks fehlt');
    assert.equal(Number(ausCss[1]), ACTIVITY_WEEKS);
  });

  test('fünf Stufen, nur die oberste voll gesättigt', () => {
    for (const stufe of [1, 2, 3, 4]) {
      assert.match(css, new RegExp(`--heatmap-${stufe}:`), `Stufe ${stufe} fehlt`);
    }
    // "Kein Lauf" ist die tiefste Fläche, keine schwache Akzentfarbe – sonst
    // sähe ein Ruhetag aus wie ein kurzer Lauf.
    assert.match(css, /--heatmap-0:\s*var\(--sunken\)/);
    assert.match(css, /--heatmap-4:\s*var\(--accent\)/);
  });
});

describe('Pace-Verlauf im Profil', () => {
  test('steht direkt unter der Aktivität', () => {
    const profil = /<div class="view" id="view-profile"[\s\S]*?\n    <\/div>/.exec(html);
    const reihe = [...profil[0].matchAll(/aria-labelledby="([a-z-]+)"/g)].map((m) => m[1]);

    assert.equal(reihe[reihe.indexOf('activity-title') + 1], 'pace-trend-title');
  });

  test('gezeichnet wird selbst, ohne nachgeladene Bibliothek', () => {
    // Kein <script src> ausser dem eigenen Modul.
    const skripte = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(skripte, ['js/app.js']);
    assert.match(app, /createPaceChart/);
  });

  test('die Achse steht auf dem Kopf, damit besser oben ist', () => {
    // Kleinere Pace ist die schnellere: der Wert wächst nach unten, also
    // steigt die Linie, wenn jemand schneller wird.
    assert.match(app, /padTop \+ \(\(pace - skala\.min\) \/ \(skala\.max - skala\.min\)\) \* innenHoehe/);
  });

  test('zu wenige Punkte ergeben einen Hinweis statt eines leeren Diagramms', () => {
    assert.match(html, /id="pace-trend-empty"[\s\S]{0,120}nicht genug Läufe/);
    assert.match(app, /points\.length >= PACE_TREND_MIN_POINTS/);
  });

  test('Linie und Punkte tragen die Akzentfarbe', () => {
    assert.match(css, /\.pace-line\s*\{[^}]*stroke:\s*var\(--accent\)/);
    assert.match(css, /\.pace-point\s*\{[^}]*fill:\s*var\(--accent\)/);
    assert.match(css, /\.pace-grid\s*\{[^}]*stroke:\s*var\(--line\)/);
  });
});

describe('Bestzeiten stehen zwischen Gesamtstatistik und Lauf-Liste', () => {
  /** Reihenfolge der Karten im Profil-Bereich. */
  const profil = /<div class="view" id="view-profile"[\s\S]*?\n    <\/div>/.exec(html);

  test('die Sektion existiert und hat eine Liste', () => {
    assert.match(html, /id="best-times-title"/);
    assert.match(html, /<ul class="best-times" id="best-times">/);
  });

  test('sie steht hinter der Gesamtstatistik und vor den Läufen', () => {
    assert.ok(profil, 'der Profil-Bereich wurde nicht gefunden');

    const reihe = [...profil[0].matchAll(/aria-labelledby="([a-z-]+)"/g)].map((m) => m[1]);
    const gesamt = reihe.indexOf('profile-stats-title');
    const best = reihe.indexOf('best-times-title');
    const laeufe = reihe.indexOf('runs-title');

    assert.ok(gesamt !== -1 && best !== -1 && laeufe !== -1, `gefunden: ${reihe}`);
    assert.ok(gesamt < best, 'Bestzeiten stehen vor der Gesamtstatistik');
    assert.ok(best < laeufe, 'Bestzeiten stehen hinter der Lauf-Liste');
  });

  test('alle Zeilen teilen sich dieselben Spalten', () => {
    // Sonst steht jede Zeile für sich und die Zeiten fluchten nicht.
    const regel = /\.best-time\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, '.best-time fehlt');
    assert.match(regel[1], /grid-template-columns:\s*4\.5rem/);
    assert.match(css, /\.best-time-value\s*\{[^}]*text-align:\s*right/);
  });
});

describe('Die Intervall-Stoppuhr ist ein eigener Vollbild-Schirm', () => {
  test('die Sperre lässt die Stoppuhr selbst aus', () => {
    // Der Schirm liegt in `.app` und wurde von setAppInert() mitgesperrt.
    // Damit stand er zwar da, nahm aber keine Berührung an: Knöpfe tot,
    // Tippen und Scrollen gingen durch ihn hindurch in den Start-Hub.
    const regel = /function setAppInert\(inert\)\s*\{([\s\S]*?)\n\}/.exec(app);
    assert.ok(regel, 'setAppInert() fehlt');
    assert.match(regel[1], /bereich === el\.intervalScreen/);
  });

  test('beim Start wird die Seite dahinter festgestellt', () => {
    assert.match(app, /setBodyScrollLocked\(true\)/);
    assert.match(app, /setBodyScrollLocked\(false\)/);
    assert.match(css, /body\.scroll-locked\s*\{[^}]*position:\s*fixed/);
  });

  test('der Schirm deckt den ganzen sichtbaren Bereich ab', () => {
    const regel = /\.interval-screen\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, '.interval-screen fehlt');
    assert.match(regel[1], /position:\s*fixed/);
    assert.match(regel[1], /inset:\s*0/);
    // Ohne dvh bleibt unter der wandernden Adressleiste ein Streifen frei.
    assert.match(regel[1], /height:\s*100dvh/);
    // Sonst scheint unter Notch und Statusleiste die Seite darunter durch.
    assert.match(regel[1], /padding-top:[^;]*env\(safe-area-inset-top/);
    assert.match(regel[1], /overscroll-behavior:\s*contain/);
  });

  test('zentriert wird nur, solange der Inhalt passt', () => {
    // Sonst schneidet ein überlanger Inhalt oben ab und ist nicht erreichbar.
    assert.match(css, /\.interval-screen\s*\{[^}]*justify-content:\s*safe center/);
  });
});

/**
 * app.js greift die Oberfläche ausschliesslich über getElementById ab. Eine ID,
 * die es im Markup nicht gibt, liefert `null` – und der Fehler fällt erst
 * beim ersten Zugriff auf, oft in einem Zweig, den man beim Ausprobieren nicht
 * durchläuft.
 *
 * Node kann die Seite nicht bauen, aber diesen Abgleich schafft es.
 */
describe('Markup und die Module kennen dieselben Elemente', () => {
  const angefragt = [
    ...new Set([...app.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1])),
  ];

  test('es wird überhaupt über IDs zugegriffen', () => {
    // Fällt der Zugriffsweg irgendwann weg, prüft der Test unten nur noch die
    // leere Menge und sagt trotzdem "grün".
    assert.ok(angefragt.length > 50, `nur ${angefragt.length} IDs gefunden – Zugriffsweg geändert?`);
  });

  test('jede angefragte ID steht im Markup', () => {
    const fehlend = angefragt.filter((id) => !html.includes(`id="${id}"`));
    assert.deepEqual(fehlend, [], `diese IDs gibt es im Markup nicht: ${fehlend.join(', ')}`);
  });
});

describe('Speicher-Warnung', () => {
  test('der Hinweis steht im Markup und meldet sich als Alarm', () => {
    // role="alert" statt "status": Hilfsmittel sollen das sofort vorlesen und
    // nicht erst beim nächsten Innehalten. Ein verlorener Lauf kann warten.
    assert.match(
      html,
      /id="storage-hint"[^>]*role="alert"|role="alert"[^>]*id="storage-hint"/,
      'die Speicher-Warnung fehlt oder trägt kein role="alert"'
    );
  });

  test('sie hebt sich von den übrigen Hinweisen ab', () => {
    // Alle anderen Hinweise sind neongrün. Dieser meldet einen Verlust und
    // darf nicht wie eine Erfolgsmeldung aussehen.
    const regel = /\.storage-hint\s*\{([^}]*)\}/.exec(css);
    assert.ok(regel, '.storage-hint fehlt im Stylesheet');
    assert.match(regel[1], /var\(--danger/);
  });

  test('app.js trägt sich bei storage.js als Meldestelle ein', () => {
    // Ohne diesen Aufruf bleibt die Warnung für immer versteckt, und der
    // ganze Weg darunter ist tot.
    assert.match(app, /setStorageErrorHandler\(showStorageError\)/);
  });
});

describe('Erinnerung an die Sicherung', () => {
  /** Der Text zwischen zwei Marken, ohne regulaeren Ausdruck. */
  const zwischen = (quelle, von, bis) => {
    const start = quelle.indexOf(von);
    assert.notEqual(start, -1, `nicht gefunden: ${von}`);
    const ende = quelle.indexOf(bis, start);
    assert.notEqual(ende, -1, `kein Ende nach ${von}`);
    return quelle.slice(start, ende);
  };

  test('steht bei den Sicherungs-Knoepfen, nicht im Profil', () => {
    // Ein Hinweis, dessen Abhilfe einen Tab weiter liegt, wird weggeklickt
    // statt befolgt - deshalb in derselben Karte wie der Export-Knopf.
    const karte = zwischen(html, '<h2 id="data-title">', '</section>');

    assert.ok(karte.includes('id="export-reminder"'), 'die Erinnerung steht nicht in der Karte');
    assert.ok(karte.includes('id="export-button"'), 'der Export-Knopf steht nicht in der Karte');
  });

  test('sie startet versteckt', () => {
    // Ohne hidden staende sie beim ersten Laden kurz da, bevor render() sie
    // wieder wegnimmt.
    const tag = zwischen(html, '<p class="export-reminder"', '>');
    assert.ok(tag.includes(' hidden'), `hidden fehlt: ${tag}`);
  });

  test('sie sieht nicht aus wie die Speicher-Warnung', () => {
    // Die eine meldet einen Verlust, die andere eine Empfehlung. Wer beides
    // gleich laut macht, entwertet die Warnung.
    const regel = zwischen(css, '.export-reminder {', '}');

    assert.ok(!regel.includes('--danger'), 'die Erinnerung traegt das Warnrot');
    assert.ok(regel.includes('var(--accent-line)'), 'die Akzentkante fehlt');
  });

  test('ob erinnert wird, entscheidet das pure Modul', () => {
    // In app.js steht keine eigene Rechnung mit Tagen - sonst gaebe es zwei
    // Wahrheiten darueber, wann eine Sicherung faellig ist.
    assert.ok(
      app.includes('exportReminder({ lastExport, runCount: runs.length'),
      'app.js fragt nicht das pure Modul'
    );
    assert.ok(
      !app.includes('EXPORT_REMINDER_DAYS >') && !app.includes('EXPORT_REMINDER_DAYS <'),
      'app.js rechnet die Faelligkeit selbst nach'
    );
  });

  test('Export und Import halten den Tag fest', () => {
    // Ein Import zaehlt mit: in dem Moment existiert nachweislich eine Datei
    // mit genau diesen Daten.
    const aufrufe = app.split('rememberExport()').length - 1;
    assert.equal(aufrufe, 3, 'erwartet: Definition, Aufruf nach Export, Aufruf nach Import');
  });
});

/**
 * Der Akzent bleibt die Ausnahme (D1).
 *
 * Der Kopfkommentar von style.css reserviert Neongruen fuer vier Dinge. Die
 * Regel stand dort seit jeher und wurde trotzdem an drei Stellen gebrochen –
 * eine Regel im Kommentar haelt nur so lange, wie jemand sie liest. Diese
 * Tests lesen sie bei jedem Lauf.
 */
describe('Neongruen bleibt die Ausnahme', () => {
  /** Der Rumpf einer Regel, ueber ihren Selektor gefunden. */
  const regel = (selektor) => {
    const von = css.indexOf(selektor + ' {');
    if (von < 0) return null;
    return css.slice(von, css.indexOf('}', von));
  };

  test('eine freigeschaltete Trophaee faerbt ihre Flaeche nicht', () => {
    const block = regel('.trophy.unlocked');

    assert.ok(block, '.trophy.unlocked fehlt');
    assert.ok(
      !block.includes('background'),
      'Bei 40 von 62 freigeschalteten Trophaeen ist die Toenung der Normalfall ' +
        'und traegt keine Information mehr – der Rahmen genuegt'
    );
    assert.ok(block.includes('border-color: var(--accent-line)'), 'der Rahmen fehlt');
  });

  test('der Unterschied haengt trotzdem an mehr als einer Eigenschaft', () => {
    // Gegenprobe zum Test darueber: ohne Flaeche muss der Rest umso sicherer
    // stehen, sonst ist "freigeschaltet" gar nicht mehr zu sehen.
    assert.ok(css.includes('.trophy.unlocked .trophy-mark {'), 'die gefuellte Marke fehlt');
    assert.ok(css.includes('.trophy.unlocked .trophy-name {'), 'der hellere Name fehlt');
  });

  test('nur der laufende Zeitraum bekommt einen gruenen Balken', () => {
    const grund = regel('.chart-bar');

    assert.ok(grund, '.chart-bar fehlt');
    assert.ok(
      !grund.includes('background: var(--accent)'),
      'alle Balken gruen heisst: keiner sticht heraus'
    );
    assert.ok(grund.includes('background: var(--dim)'), 'der Grundbalken ist nicht grau');
    assert.ok(
      css.includes('.chart-row.current .chart-bar {\n  background: var(--accent);'),
      'der laufende Zeitraum bekommt kein Gruen'
    );
  });

  test('welcher Zeitraum der laufende ist, entscheidet das pure Modul', () => {
    // Nicht "der letzte Balken": ein auf morgen datierter Lauf schiebt einen
    // weiteren dahinter. stats.js fuehrt die Markierung deshalb selbst mit.
    assert.ok(app.includes('bucket.isCurrent'), 'die Anzeige fragt isCurrent nicht ab');
    assert.ok(
      app.includes('isCurrent: index === laufend'),
      'stats.js markiert den laufenden Zeitraum nicht mehr selbst'
    );
  });

  test('es gibt einen Akzentknopf ohne Flaeche', () => {
    const block = regel('button.outline');

    assert.ok(block, 'button.outline fehlt');
    assert.ok(block.includes('background: transparent'), 'der Knopf ist gefuellt');
    assert.ok(
      block.includes('color: var(--accent-text)'),
      'die Schrift traegt nicht den Akzent'
    );
  });

  test('der Erledigt-Knopf ist einer davon', () => {
    assert.ok(
      app.includes("heuteErledigt ? 'secondary small' : 'outline small'"),
      '27 Uebungskarten haetten 27 vollflaechige Akzentknoepfe'
    );
  });

  test('der Akzent als Schrift steht als eigenes Token', () => {
    // Im hellen Schema reisst --accent auf --sunken die 4,5:1. Gleiche
    // Begruendung wie bei --danger-text, nur in die andere Richtung.
    assert.ok(css.includes('--accent-text:'), '--accent-text fehlt');
    assert.equal(
      css.split('--accent-text:').length - 1,
      3,
      'jedes der drei Schemata braucht seinen eigenen Wert'
    );
  });
});

/**
 * Die zwei Hinweise ueber der Tab-Ebene (D2).
 *
 * Sie stehen im Markup vor den Bereichen und haengen damit ueber allen fuenf.
 * Mit je drei Zeilen Fliesstext waren das 160 px, bevor der erste Inhalt
 * anfing. Diese Tests halten die kompakte Form fest.
 */
describe('Hinweise ueber der Tab-Ebene bleiben schmal', () => {
  test('beide tragen eine Textzeile, keinen Textblock', () => {
    for (const id of ['update-hint', 'install-hint']) {
      const von = html.indexOf(`id="${id}"`);
      assert.ok(von > 0, `${id} fehlt`);
      const block = html.slice(von, html.indexOf('</aside>', von));

      assert.ok(block.includes('class="hint-line"'), `${id} nutzt nicht die schmale Zeile`);
      assert.ok(
        !block.includes('install-hint-text'),
        `${id} traegt noch die zweizeilige Textspalte`
      );
    }
  });

  test('der Speicherhinweis behaelt seine zwei Zeilen', () => {
    // Gegenprobe: er meldet einen Verlust und traegt eine wechselnde
    // Meldung - da ist die zweite Zeile keine Verschwendung.
    const von = html.indexOf('id="storage-hint"');
    const block = html.slice(von, html.indexOf('</aside>', von));

    assert.ok(block.includes('install-hint-text'), 'der Speicherhinweis wurde mitgekuerzt');
  });

  test('die schmale Zeile ist im Stylesheet definiert', () => {
    assert.ok(css.includes('.hint-line {'), '.hint-line fehlt');
  });

  test('der Installationshinweis haengt am Bereich und am Update', () => {
    // Ohne den Aufruf in setView bliebe er stehen, wo er nicht hingehoert.
    assert.ok(app.includes('view: activeView'), 'der Hinweis kennt den Bereich nicht');
    assert.ok(app.includes('updateReady,'), 'der Hinweis weicht dem Update nicht');
    assert.ok(
      app.split('maybeShowInstallHint()').length - 1 >= 4,
      'erwartet: Definition, Start, Bereichswechsel, Update'
    );
  });

  test('der Update-Hinweis steht weiterhin ueber allen Bereichen', () => {
    // Er ist der einzige Weg aus einer haengenden alten Fassung. Wuerde er
    // wie der Installationshinweis an den Start-Tab gebunden, waere genau
    // das verloren.
    const von = html.indexOf('id="update-hint"');
    const views = html.indexOf('id="view-start"');

    assert.ok(von > 0 && views > 0 && von < views, 'der Update-Hinweis steht nicht mehr davor');
    assert.ok(
      !app.includes("view: activeView,\n    updateReady"),
      'der Update-Hinweis darf nicht an einen Bereich gebunden werden'
    );
  });
});

/**
 * Symbole statt Zeichen (D3).
 *
 * An vier Knoepfen standen Zeichen: U+1F4C5 als Kalender, U+270E als Stift.
 * Das erste rendert als farbiges System-Emoji - in einer monochromen App der
 * staerkste Stilbruch pro Flaeche. Das zweite ist ein Textzeichen und rendert
 * meist einfarbig, kippt aber je nach Font und Geraet ebenfalls.
 */
describe('Knopfsymbole sind gezeichnet, nicht getippt', () => {
  test('kein Emoji und kein Zeichen-Symbol im Quelltext der Module', () => {
    // Der Bereich der Emoji-Bloecke plus die beiden Zeichen, die hier standen.
    const verdaechtig = [...app].filter((z) => {
      const c = z.codePointAt(0);
      return c === 0x270e || c === 0x1f4c5 || (c >= 0x1f300 && c <= 0x1faff);
    });

    assert.deepEqual(
      verdaechtig,
      [],
      'Symbole gehoeren als <use> in die Sammlung, nicht als Zeichen in den Code'
    );
  });

  test('die vier Knoepfe holen ihr Symbol aus der Sammlung', () => {
    assert.equal(
      app.split("createIcon('icon-pencil')").length - 1,
      3,
      'erwartet: Uebungskarte, Lauf-Liste, Trainingsplan'
    );
    assert.equal(app.split("createIcon('icon-calendar-plus')").length - 1, 1);
  });

  test('jedes benutzte Symbol ist auch definiert', () => {
    // Ein <use> auf eine unbekannte id zeichnet nichts - und ein leeres <use>
    // sieht man im Browser nicht, weil an der Stelle einfach nichts steht.
    // Zwei Schreibweisen: im Markup als href="#id", im Code als createIcon('id').
    const benutzt = new Set();
    for (const t of html.matchAll(/href="#(icon-[a-z-]+)"/g)) benutzt.add(t[1]);
    for (const t of app.matchAll(/createIcon\('(icon-[a-z-]+)'\)/g)) benutzt.add(t[1]);

    assert.ok(benutzt.size > 5, 'die Suche findet fast nichts - dann prueft sie nichts');

    for (const id of benutzt) {
      assert.ok(
        html.includes('<g id="' + id + '">'),
        id + ' wird benutzt, ist aber nicht definiert'
      );
    }

    assert.ok(benutzt.has('icon-pencil'), 'der Stift wird nicht benutzt');
    assert.ok(benutzt.has('icon-calendar-plus'), 'der Kalender wird nicht benutzt');
  });

  test('der Kalender steht einmal da, nicht zweimal', () => {
    // Der Training-Tab zeigt dieselbe Zeichnung wie der Einplanen-Knopf.
    // Zweimal dieselbe Geometrie laeuft irgendwann auseinander, und niemand
    // bemerkt es - deshalb holen beide sie aus derselben Definition.
    assert.equal(html.split('<g id="icon-calendar-plus">').length - 1, 1, 'einmal definiert');
    assert.equal(html.split('href="#icon-calendar-plus"').length - 1, 1, 'der Tab holt sie');
    assert.equal(
      app.split("createIcon('icon-calendar-plus')").length - 1,
      1,
      'der Knopf holt sie'
    );
    assert.ok(
      !html.includes('<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M8 3.5v4"/>'),
      'der Tab zeichnet den Kalender wieder selbst'
    );
  });

  test('das Symbol traegt keinen Namen, der Knopf schon', () => {
    assert.ok(app.includes("'aria-hidden': 'true'"), 'createIcon setzt kein aria-hidden');
    assert.ok(app.includes('einplanen.setAttribute(\'aria-label\''), 'der Knopf verliert seine Beschriftung');
  });

  test('die Symbole erben ihre Farbe', () => {
    const von = css.indexOf('.icon-button svg {');
    assert.ok(von > 0, '.icon-button svg fehlt');
    const block = css.slice(von, css.indexOf('}', von));

    assert.ok(block.includes('stroke: currentColor'), 'ohne currentColor folgt das Symbol keinem Schema');
    assert.ok(block.includes('fill: none'), 'die Symbole sind Striche, keine Flaechen');
  });
});

/**
 * Eine Sache, ein Name (D4).
 *
 * Auf dem Start-Tab stand "XP aus Achievements", waehrend der Tab daneben
 * "Trophaeen" heisst - eine Sache, zwei Namen, auf demselben Bildschirm.
 *
 * Der Code heisst weiter achievements.js: die Datei, ihre Exports und die
 * Bezeichner bleiben, wie sie sind. Geprueft wird ausschliesslich das, was
 * der Nutzer liest.
 */
describe('Eine Sache traegt einen Namen', () => {
  /** Der sichtbare Text des Markups - Tags und damit auch die ids raus. */
  const sichtbar = html.replace(/<[^>]*>/g, ' ');

  test('im Markup steht kein "Achievement"', () => {
    assert.ok(
      !sichtbar.includes('Achievement'),
      'Der Tab heisst Trophaeen - dann heisst es ueberall Trophaeen'
    );
  });

  test('"Trophaeen" steht sehr wohl da', () => {
    // Gegenprobe: fiele das Wort ganz weg, waere der Test darueber aus dem
    // falschen Grund gruen.
    assert.ok(sichtbar.includes('Trophäen'), 'das Wort ist ganz verschwunden');
  });

  test('auch keine Beschriftung aus dem Code sagt "Achievement"', () => {
    // Beschriftungen entstehen zur Laufzeit. Gesucht wird deshalb in den
    // Zeichenketten der Module, nicht in den Bezeichnern daneben.
    const texte = app.match(/'[^'\n]*'|"[^"\n]*"/g) ?? [];
    const treffer = texte.filter((t) => t.includes('Achievement'));

    assert.deepEqual(treffer, [], 'diese Zeichenketten sieht der Nutzer');
  });

  test('der Code darf weiter Achievement heissen', () => {
    // Ausdruecklich festgehalten, damit niemand beim naechsten Aufraeumen
    // die Exports mitnimmt: das waere eine Umbenennung quer durch acht
    // Dateien fuer null sichtbaren Gewinn.
    assert.ok(app.includes('evaluateAchievements'), 'der Export wurde umbenannt');
  });
});

/**
 * Keine Kachel bleibt allein stehen (D5).
 *
 * Fuenf Kacheln in zwei Spalten liessen "Laengster Lauf" allein in der
 * letzten Zeile, rechts daneben ein Loch. Die Zahl der Kacheln unterscheidet
 * sich zwischen Woche, Monat und Gesamtstand - die Regel muss rechnen und
 * darf nicht auf einer Zahl stehen.
 */
describe('Die letzte Kachel bleibt nicht allein', () => {
  test('bei zwei Spalten zieht die ungerade letzte ueber beide', () => {
    assert.ok(
      css.includes('.stat-grid > .stat:last-child:nth-child(odd)'),
      'die Regel fuer zwei Spalten fehlt'
    );
  });

  test('bei drei Spalten rechnet sie anders', () => {
    // Ab 40em sind es drei Spalten. Dort steht die letzte allein, wenn die
    // Anzahl bei Teilung durch drei den Rest 1 laesst - nicht bei ungerade.
    assert.ok(
      css.includes('.stat-grid > .stat:last-child:nth-child(3n + 1)'),
      'die Regel fuer drei Spalten fehlt'
    );
  });

  test('die Drei-Spalten-Fassung nimmt die andere zurueck', () => {
    // Ohne das zoege bei fuenf Kacheln in drei Spalten die letzte ueber
    // alles, obwohl sie dort zu zweit steht.
    const von = css.indexOf('@media (min-width: 40em)');
    assert.ok(von > 0, 'der Breakpoint fehlt');
    const breit = css.slice(von);

    assert.ok(
      breit.includes('grid-column: auto'),
      'die Zwei-Spalten-Regel gilt im Dreispaltigen weiter'
    );
    assert.ok(
      breit.indexOf('nth-child(odd)') < breit.indexOf('nth-child(3n + 1)'),
      'erst zuruecknehmen, dann neu setzen - sonst gewinnt die falsche'
    );
  });

  test('die Regel steht am Raster, nicht an einer Ansicht', () => {
    // Zeitraum und Gesamtstand teilen sich .stat-grid und haben verschieden
    // viele Kacheln. Eine Regel je Ansicht waere zweimal dieselbe Regel.
    assert.ok(
      !css.includes('#period-stats > .stat:last-child'),
      'die Regel haengt an einer einzelnen Ansicht'
    );
    assert.ok(
      !css.includes('#profile-stats > .stat:last-child'),
      'die Regel haengt an einer einzelnen Ansicht'
    );
  });
});

/**
 * Die Einheit steht kleiner als die Zahl (D6).
 *
 * Bei 390 px hat eine Kachel 134 px Platz. "10:15 min/km" in einem Grad
 * brauchte 131,4 - zwei Millimeter Luft, die auf einer Schrift mit etwas
 * breiteren Ziffern nicht mehr da sind. Getrennt gesetzt sind es 103,2 und
 * damit 23 Prozent Luft statt zwei.
 */
describe('Zahl und Einheit stehen nicht im selben Grad', () => {
  test('die Kachel setzt die Einheit als eigenen Teil', () => {
    assert.ok(app.includes("teil.className = 'stat-unit'"), 'die Einheit steht nicht eigens da');
    assert.ok(app.includes('splitUnit(wert)'), 'die Kachel trennt Zahl und Einheit nicht');
  });

  test('das Leerzeichen steht zwischen den Knoten, nicht in einem', () => {
    // Haengt es an der Zahl, nimmt es deren Groesse an - und der Abstand
    // zwischen Zahl und Einheit waere zu gross.
    assert.ok(app.includes("dd.append(' ', teil)"), 'das Leerzeichen sitzt falsch');
  });

  test('die Einheit ist wirklich kleiner und ruhiger', () => {
    // Am Zeilenanfang gesucht: seit D7 gibt es ".stat-lead .stat-unit", und
    // das endet ebenfalls auf ".stat-unit {" - eine Suche ohne Anker findet
    // die falsche Regel.
    const von = css.indexOf('\n.stat-unit {');
    assert.ok(von > 0, '.stat-unit fehlt');
    const block = css.slice(von, css.indexOf('}', von));

    const gross = Number(css.slice(css.indexOf('\n.stat dd {')).match(/font-size: ([\d.]+)rem/)[1]);
    const klein = Number(block.match(/font-size: ([\d.]+)rem/)[1]);

    assert.ok(klein < gross, `Einheit ${klein}rem ist nicht kleiner als Zahl ${gross}rem`);
    assert.ok(block.includes('var(--muted)'), 'die Einheit traegt die volle Textfarbe');
  });

  test('nur die Kacheln trennen - anderswo bleibt die Einheit dran', () => {
    // formatAveragePace() wird auch in der Lauf-Detailansicht gebraucht, und
    // dort soll "5:31 min/km" am Stueck stehen bleiben.
    assert.equal(
      app.split('splitUnit(').length - 1,
      2,
      'erwartet: die Definition in format.js und der eine Aufruf in der Kachel'
    );
  });
});

/**
 * Gesamtstatistik sieht anders aus als Statistik (D7).
 *
 * Beide trugen dieselben Beschriftungen, dieselben Kacheln, dieselbe
 * Reihenfolge - nur die Ueberschrift verriet, wo man ist. Und
 * "Gesamtdistanz 503,4 km" ist emotional die wichtigste Zahl der App und sah
 * aus wie "Aktive Tage 53" daneben.
 */
describe('Die Gesamtstatistik hat eine eigene Form', () => {
  test('die erste Kachel fuehrt und zieht ueber die volle Breite', () => {
    assert.ok(app.includes("bloecke[0].classList.add('stat-lead')"), 'keine Leitkachel');
    assert.ok(
      app.includes("el.profileStats.classList.add('stat-grid--lead')"),
      'das Raster weiss nichts von der Leitkachel'
    );

    const von = css.indexOf('.stat-lead {');
    assert.ok(von > 0, '.stat-lead fehlt');
    assert.ok(css.slice(von, css.indexOf('}', von)).includes('grid-column: 1 / -1'));
  });

  test('nur die Gesamtstatistik hat sie, nicht der Zeitraum', () => {
    // Sonst saehen beide wieder gleich aus, nur anders gleich.
    assert.ok(
      !app.includes("el.periodStats.classList.add('stat-grid--lead')"),
      'der Zeitraum bekommt dieselbe Form'
    );
  });

  test('die Leitkachel ist groesser, aber nicht gruen', () => {
    // D1 hat 13 gruene Flaechen auf eine reduziert. Die vierzehnte hier
    // wieder hinzuzusetzen waere derselbe Fehler eine Kachel weiter.
    const von = css.indexOf('.stat-lead dd {');
    assert.ok(von > 0, '.stat-lead dd fehlt');
    const block = css.slice(von, css.indexOf('}', von));

    assert.ok(block.includes('font-size: 2rem'), 'die Leitkachel ist nicht groesser');
    assert.ok(!block.includes('--accent'), 'die Leitkachel traegt den Akzent');

    const leadBlock = css.slice(css.indexOf('.stat-lead {'), css.indexOf('.stat-unit {'));
    assert.ok(!leadBlock.includes('var(--accent)'), 'irgendwo traegt die Leitkachel doch Akzent');
  });

  test('.stat-lead dd steht hinter .stat dd', () => {
    // Gleiche Spezifitaet - davor gesetzt bliebe die Leitkachel bei 1,25rem.
    // Genau so stand es zuerst da.
    assert.ok(css.indexOf('.stat dd {') < css.indexOf('.stat-lead dd {'), 'die Reihenfolge kippt die Regel');
  });

  test('die Leitkachel dreht die Waisen-Rechnung um', () => {
    // Sie belegt eine ganze Zeile: allein steht die letzte dann bei gerader
    // Gesamtzahl, nicht bei ungerader.
    assert.ok(css.includes('.stat-grid--lead > .stat:last-child:nth-child(even):not(.stat-lead)'));
    assert.ok(css.includes('.stat-grid--lead > .stat:last-child:nth-child(3n + 2):not(.stat-lead)'));
  });

  test('das :not(.stat-lead) steht an jeder der vier Regeln', () => {
    // Es traegt Gewicht, nicht Bedeutung: ohne es gewinnt die Ruecknahme mit
    // ihrer zusaetzlichen Klasse, und die letzte Kachel bleibt schmal.
    // Aufgefallen beim Durchmessen bei fuenf und elf Kacheln.
    const regeln = css.split('\n').filter((z) => z.includes('.stat-grid--lead > .stat:last-child'));

    assert.equal(regeln.length, 4, 'erwartet: zwei Spalten und drei Spalten, je Ruecknahme und Setzung');
    for (const r of regeln) {
      assert.ok(r.includes(':not(.stat-lead)'), 'ohne Gewicht: ' + r.trim());
    }
  });
});

/**
 * Die Filterchips brechen nicht mehr zufaellig um (D8).
 *
 * Drei Chips brauchen bei 390 px zusammen 444 px und haben 332. Zwei passten
 * nebeneinander, der dritte fiel in die naechste Zeile - das sah nach
 * umgebrochenem Flex aus, nicht nach Absicht.
 */
describe('Filterchips im Trophaeen-Tab', () => {
  test('die Leiste steht untereinander, nicht umbrechend', () => {
    assert.ok(
      html.includes('filter-row filter-row--stack'),
      'die Trophaeen-Leiste traegt die Stapel-Variante nicht'
    );

    const von = css.indexOf('.filter-row--stack {');
    assert.ok(von > 0, '.filter-row--stack fehlt');
    const block = css.slice(von, css.indexOf('}', von));

    assert.ok(block.includes('flex-direction: column'), 'die Chips stehen nicht untereinander');
    assert.ok(block.includes('flex-wrap: nowrap'), 'der Umbruch ist noch moeglich');
  });

  test('alle Chips sind gleich breit', () => {
    const von = css.indexOf('.filter-row--stack > .chip {');
    assert.ok(von > 0, 'die Chip-Regel fehlt');
    const block = css.slice(von, css.indexOf('}', von));

    assert.ok(block.includes('width: 100%'), 'die Chips sind verschieden breit');
    assert.ok(block.includes('justify-content: space-between'), 'der Stand steht nicht rechts');
  });

  test('nur diese Leiste, nicht die im Uebungen-Tab', () => {
    // Dort sind es sieben kurze Chips. Umbrechend lesen die sich als Wolke,
    // untereinander waeren sie sieben Zeilen.
    assert.equal(
      html.split('filter-row--stack').length - 1,
      1,
      'die Stapel-Variante steht an mehr als einer Leiste'
    );
  });

  test('Beschriftung und Stand stehen als eigene Teile', () => {
    assert.ok(app.includes("stand.className = 'chip-count'"), 'der Stand steht nicht eigens da');
  });

  test('der Name bleibt lesbar, obwohl es zwei Teile sind', () => {
    // Ohne Leerzeichen dazwischen hiesse der Knopf "Meilensteine21/30". Ein
    // Textknoten dazwischen waere ein drittes Flex-Element und ruinierte die
    // Ausrichtung - also traegt der Knopf den Namen selbst.
    assert.ok(
      app.includes("knopf.setAttribute('aria-label', `${label} ${unlocked}/${total}`)"),
      'der Knopf hat keinen lesbaren Namen mehr'
    );
  });

  test('der Stand tritt ueber das Gewicht zurueck, nicht ueber die Farbe', () => {
    // --dim auf dem Chip-Grund sind im hellen Schema 4,15:1 und reissen die
    // 4,5. Dieselbe Falle wie bei --accent in D1, eine Farbe weiter.
    const von = css.indexOf('.chip-count {');
    assert.ok(von > 0, '.chip-count fehlt');
    const block = css.slice(von, css.indexOf('}', von));

    assert.ok(!block.includes('var(--dim)'), '--dim reisst auf --sunken die 4,5:1');
    assert.ok(block.includes('var(--muted)'), 'der Stand traegt nicht --muted');
    assert.ok(block.includes('font-weight: 400'), 'ohne leichteres Gewicht tritt nichts zurueck');
  });

  test('der aktive Chip traegt den Akzent als Schrift richtig', () => {
    const von = css.indexOf('.chip.active {');
    const block = css.slice(von, css.indexOf('}', von));

    assert.ok(
      block.includes('color: var(--accent-text)'),
      'der aktive Chip nutzt --accent statt --accent-text'
    );
  });
});
