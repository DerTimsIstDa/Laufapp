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
    for (const token of ['--field-height', '--field-pad-x', '--field-pad-y', '--label-gap']) {
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
