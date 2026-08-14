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

describe('Bereiche und Umschaltung', () => {
  const views = ['view-start', 'view-trophies', 'view-profile'];

  test('zu jedem Tab gibt es einen Bereich', () => {
    for (const id of views) {
      assert.ok(html.includes(`id="${id}"`), `${id} fehlt im Markup`);
      assert.ok(html.includes(`aria-controls="${id}"`), `kein Tab steuert ${id}`);
    }
  });

  test('nur der Startbereich ist beim Laden offen', () => {
    // Die beiden anderen tragen hidden – zusammen mit der Regel oben heisst
    // das: wirklich weg, nicht nur ausgezeichnet.
    assert.match(html, /id="view-start"[^>]*>/);
    assert.doesNotMatch(html, /id="view-start"[^>]*\shidden/);
    assert.match(html, /id="view-trophies"[^>]*\shidden/);
    assert.match(html, /id="view-profile"[^>]*\shidden/);
  });

  test('genau ein Tab ist vorausgewählt', () => {
    const ausgewaehlt = [...html.matchAll(/aria-selected="true"/g)];
    assert.equal(ausgewaehlt.length, 1);
  });
});
