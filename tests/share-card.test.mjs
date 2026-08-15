import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  drawShareCard,
  inhaltsHoehe,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_COLORS,
} from '../js/share-card.js';

/**
 * Canvas-Attrappe. Node hat keins, und für die Aufteilung genügt es
 * mitzuschreiben, was gezeichnet werden sollte.
 */
function fakeCanvas() {
  const aufrufe = [];

  const ctx = {
    set fillStyle(v) { aufrufe.push(['fillStyle', v]); },
    set strokeStyle(v) { aufrufe.push(['strokeStyle', v]); },
    set font(v) { aufrufe.push(['font', v]); },
    set textAlign(v) { aufrufe.push(['textAlign', v]); },
    set textBaseline(v) {},
    set lineWidth(v) {},
    fillRect: (...a) => aufrufe.push(['fillRect', ...a]),
    fillText: (text, x, y) => aufrufe.push(['fillText', text, x, y]),
    drawImage: (...a) => aufrufe.push(['drawImage', ...a]),
    // Eine Breite je Zeichen reicht, um das Kürzen zu prüfen.
    measureText: (text) => ({ width: text.length * 10 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    beginPath() {}, moveTo() {}, arcTo() {}, closePath() {},
    fill: () => aufrufe.push(['fill']),
    stroke: () => aufrufe.push(['stroke']),
  };

  return {
    canvas: { width: 0, height: 0, getContext: () => ctx },
    aufrufe,
    texte: () => aufrufe.filter((a) => a[0] === 'fillText').map((a) => a[1]),
    yVon: (text) => aufrufe.find((a) => a[0] === 'fillText' && a[1] === text)?.[3],
  };
}

const basis = {
  name: 'Tim',
  title: 'Läufer',
  percent: 60,
  badge: null,
  heading: 'Diese Woche',
  subheading: 'Stand 15.08.2026',
  stats: [
    { label: 'Distanz', value: '18 km' },
    { label: 'Läufe', value: '3' },
  ],
};

describe('drawShareCard', () => {
  test('setzt die Bildgrösse', () => {
    const { canvas } = fakeCanvas();
    drawShareCard(canvas, basis);

    assert.equal(canvas.width, CARD_WIDTH);
    assert.equal(canvas.height, CARD_HEIGHT);
  });

  test('zeichnet Name, Titel, Überschrift und Werte', () => {
    const f = fakeCanvas();
    drawShareCard(f.canvas, basis);

    for (const text of ['Tim', 'Läufer', 'Diese Woche', 'Stand 15.08.2026', '18 km', '3']) {
      assert.ok(f.texte().includes(text), `${text} fehlt auf der Karte`);
    }
  });

  test('die Beschriftungen der Kacheln stehen in Grossbuchstaben', () => {
    const f = fakeCanvas();
    drawShareCard(f.canvas, basis);

    assert.ok(f.texte().includes('DISTANZ'));
  });

  test('trägt die Marke, damit man die Herkunft sieht', () => {
    const f = fakeCanvas();
    drawShareCard(f.canvas, basis);

    assert.ok(f.texte().includes('FunRun'));
  });

  test('ohne Namen bleibt die Zeile weg', () => {
    const f = fakeCanvas();
    drawShareCard(f.canvas, { ...basis, name: '' });

    assert.equal(f.texte().includes('Tim'), false);
    assert.ok(f.texte().includes('Läufer'), 'der Titel bleibt');
  });

  test('kein XP-Text auf der Karte', () => {
    // Der Balken bleibt, die Zahlen darunter nicht – auf einer Karte für
    // andere ist "noch 53 XP bis Level 6" ohne Bedeutung.
    const f = fakeCanvas();
    drawShareCard(f.canvas, basis);

    for (const text of f.texte()) {
      assert.doesNotMatch(text, /\bXP\b/, `"${text}" gehört nicht auf die Karte`);
    }
  });

  test('das Abzeichen wird gezeichnet, wenn es eines gibt', () => {
    const ohne = fakeCanvas();
    drawShareCard(ohne.canvas, basis);
    assert.equal(ohne.aufrufe.some((a) => a[0] === 'drawImage'), false);

    const mit = fakeCanvas();
    drawShareCard(mit.canvas, { ...basis, badge: {} });
    assert.ok(mit.aufrufe.some((a) => a[0] === 'drawImage'));
  });

  test('der Balken erscheint auch bei 0 Prozent als Spur', () => {
    const leer = fakeCanvas();
    drawShareCard(leer.canvas, { ...basis, percent: 0 });

    const spuren = leer.aufrufe.filter(([art, wert]) => art === 'fillStyle' && wert === CARD_COLORS.track);
    assert.equal(spuren.length, 1, 'die Spur wird gezeichnet');

    const gefuellt = leer.aufrufe.filter(([art, wert]) => art === 'fillStyle' && wert === CARD_COLORS.accent);
    // Titel und Fussmarke sind ebenfalls im Akzent – der Balken kommt nicht dazu.
    assert.equal(gefuellt.length, 2, 'bei 0 % wird nichts gefüllt');
  });

  test('zu langer Text wird gekürzt statt über den Rand zu laufen', () => {
    const f = fakeCanvas();
    drawShareCard(f.canvas, { ...basis, name: 'x'.repeat(300) });

    const name = f.texte().find((t) => t.startsWith('xxx'));
    assert.ok(name.endsWith('…'), 'gekürzt');
    assert.ok(name.length < 300);
  });

  test('alles bleibt im Bild', () => {
    const f = fakeCanvas();
    drawShareCard(f.canvas, {
      ...basis,
      badge: {},
      stats: Array.from({ length: 6 }, (_, i) => ({ label: `L${i}`, value: `${i}` })),
    });

    for (const [, text, x, y] of f.aufrufe.filter((a) => a[0] === 'fillText')) {
      assert.ok(y >= 0 && y < CARD_HEIGHT, `"${text}" liegt bei y=${y}`);
      assert.ok(x >= 0 && x <= CARD_WIDTH, `"${text}" liegt bei x=${x}`);
    }
  });
});

describe('inhaltsHoehe', () => {
  test('wächst mit jeder Kachelzeile', () => {
    const zwei = inhaltsHoehe(basis);
    const vier = inhaltsHoehe({ ...basis, stats: [...basis.stats, ...basis.stats] });

    assert.ok(vier > zwei);
  });

  test('zwei Kacheln nebeneinander sind eine Zeile', () => {
    const eine = inhaltsHoehe({ ...basis, stats: basis.stats.slice(0, 1) });
    assert.equal(inhaltsHoehe(basis), eine, 'die zweite Kachel steht daneben');
  });

  test('Name, Abzeichen und Unterzeile schlagen zu Buche', () => {
    const knapp = inhaltsHoehe({ ...basis, name: '', subheading: null });
    assert.ok(inhaltsHoehe(basis) > knapp);
    assert.ok(inhaltsHoehe({ ...basis, badge: {} }) > inhaltsHoehe(basis));
  });

  test('passt in die Karte', () => {
    const voll = inhaltsHoehe({
      ...basis,
      badge: {},
      stats: Array.from({ length: 6 }, (_, i) => ({ label: `L${i}`, value: `${i}` })),
    });

    assert.ok(voll < CARD_HEIGHT, 'sonst liefe der Inhalt unten heraus');
  });
});
