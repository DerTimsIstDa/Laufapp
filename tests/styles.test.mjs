import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * CSS-Regeln, die sich in Node nicht am Verhalten prüfen lassen, aber halten
 * müssen. Diese Tests lesen die Quelle – grob, aber besser als nichts.
 */
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

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

  test('Beschriftung und Feld hängen am selben Abstand', () => {
    assert.match(css, /\.field\s*\{[^}]*gap:\s*var\(--label-gap\)/);
    assert.match(css, /\.count-label\s*\{[^}]*margin-bottom:\s*var\(--label-gap\)/);
  });
});

describe('Zahlenfelder nehmen ein Komma an', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

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
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

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
