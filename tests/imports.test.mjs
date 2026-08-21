import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

/**
 * Import-Pfade und Import-Namen gegen den Dateibaum.
 *
 * Der Grund steht in der Roadmap bei B1: ohne Build-Step faellt ein vertippter
 * Import-Pfad erst im Browser auf, nicht in `node --test`. Die reinen Module
 * werden von ihren Testdateien importiert und fliegen dort auf – `app.js` und
 * alles unter `js/views/` fassen das DOM an und lassen sich in Node gar nicht
 * laden. Genau die Dateien, die beim Aufteilen entstehen, waeren also
 * ungeprueft geblieben.
 *
 * Dieser Test laedt nichts aus, er liest den Quelltext. Das ist grob – ein
 * `export * from` wuerde er nicht aufloesen –, faengt aber die beiden Fehler,
 * die beim Verschieben von Funktionen tatsaechlich passieren: ein Pfad, den es
 * nicht gibt, und ein Name, den die Gegenseite nicht herausgibt.
 */

const wurzel = new URL('../', import.meta.url);

/** Alle Module unter js/, samt Unterverzeichnissen. */
function moduleUnter(verzeichnis) {
  return readdirSync(new URL(verzeichnis, wurzel), { withFileTypes: true }).flatMap((eintrag) => {
    if (eintrag.isDirectory()) return moduleUnter(`${verzeichnis}${eintrag.name}/`);
    return eintrag.name.endsWith('.js') ? [`${verzeichnis}${eintrag.name}`] : [];
  });
}

const MODULE = moduleUnter('js/');

/**
 * Die import-Anweisungen einer Datei.
 *
 * Nur relative Pfade – etwas anderes gibt es hier nicht, und ein Paketname
 * waere ohnehin nichts, was im Dateibaum stehen muesste.
 */
function importeIn(quelle) {
  const treffer = [...quelle.matchAll(/import\s+([^;]*?)\s+from\s+'(\.[^']+)'/g)];

  return treffer.map(([, klausel, pfad]) => {
    const geschweift = /\{([^}]*)\}/.exec(klausel);
    const namen = geschweift
      ? geschweift[1]
          .split(',')
          .map((teil) => teil.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean)
      : [];
    return { pfad, namen };
  });
}

/** Die Namen, die ein Modul herausgibt. */
function exporteIn(quelle) {
  const namen = new Set();

  for (const [, name] of quelle.matchAll(
    /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/gm
  )) {
    namen.add(name);
  }

  // `export { a, b as c }` – hier zaehlt der Name nach dem `as`, denn so
  // heisst er auf der anderen Seite.
  for (const [, liste] of quelle.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const teil of liste.split(',')) {
      const stueck = teil.trim();
      if (stueck === '') continue;
      const alias = /\s+as\s+([A-Za-z0-9_$]+)$/.exec(stueck);
      namen.add(alias ? alias[1] : stueck);
    }
  }

  return namen;
}

describe('jeder Import zeigt auf eine Datei, die es gibt', () => {
  for (const modul of MODULE) {
    test(modul, () => {
      const quelle = readFileSync(new URL(modul, wurzel), 'utf8');
      const verzeichnis = new URL(modul, wurzel);

      for (const { pfad } of importeIn(quelle)) {
        assert.ok(
          existsSync(new URL(pfad, verzeichnis)),
          `${modul} importiert aus ${pfad} – diese Datei gibt es nicht`
        );
      }
    });
  }
});

describe('jeder importierte Name wird auch exportiert', () => {
  for (const modul of MODULE) {
    test(modul, () => {
      const quelle = readFileSync(new URL(modul, wurzel), 'utf8');
      const verzeichnis = new URL(modul, wurzel);

      for (const { pfad, namen } of importeIn(quelle)) {
        const ziel = new URL(pfad, verzeichnis);
        if (!existsSync(ziel)) continue; // meldet schon der Test darueber

        const exporte = exporteIn(readFileSync(ziel, 'utf8'));
        for (const name of namen) {
          assert.ok(
            exporte.has(name),
            `${modul} importiert "${name}" aus ${pfad}, das dort nicht exportiert wird`
          );
        }
      }
    });
  }
});

describe('der Test selbst greift', () => {
  test('er findet die Importe in app.js', () => {
    // Ohne diese Zusicherung wuerde ein kaputter regulaerer Ausdruck die
    // Pruefung stillschweigend auf null Importe reduzieren und immer gruen
    // bleiben – der Test waere dann schlimmer als keiner.
    const app = readFileSync(new URL('js/app.js', wurzel), 'utf8');
    assert.ok(importeIn(app).length >= 20, 'in app.js wurden kaum Importe gefunden');
  });

  test('er findet die Exporte in einem reinen Modul', () => {
    const xp = readFileSync(new URL('js/xp.js', wurzel), 'utf8');
    assert.ok(exporteIn(xp).has('xpForDistance'), 'xpForDistance wurde nicht als Export erkannt');
  });

  test('ein erfundener Name faellt auf', () => {
    const exporte = exporteIn('export function da() {}\n');
    assert.equal(exporte.has('da'), true);
    assert.equal(exporte.has('gibtEsNicht'), false);
  });

  test('js/views/ wird mitgelesen', () => {
    assert.ok(
      MODULE.some((pfad) => pfad.startsWith('js/views/')),
      'die Ansichten unter js/views/ wurden nicht gefunden'
    );
  });
});
