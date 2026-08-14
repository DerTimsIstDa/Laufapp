/**
 * Umrechnung einer GPS-Strecke in Zeichenflächen-Koordinaten.
 *
 * Pur und ohne DOM. Das Zeichnen selbst (SVG) macht app.js.
 *
 * Es gibt keinen Kartenhintergrund, also braucht es auch keine echte
 * Kartenprojektion – nur eine, die die Strecke unverzerrt zeigt. Dafür reicht
 * eine flache Projektion mit Längengrad-Korrektur: ein Längengrad ist auf
 * unserer Breite deutlich kürzer als ein Breitengrad, und ohne Korrektur
 * würde eine Ost-West-Runde in die Breite gezogen.
 */

/** Unter zwei Punkten gibt es keine Linie zu zeichnen. */
export const MIN_POINTS = 2;

/** Voreinstellung der Zeichenfläche in Pixeln. */
export const DEFAULT_VIEWPORT = { width: 320, height: 200, padding: 12 };

/**
 * @typedef {{ lat: number, lon: number }} TrackPoint
 * @typedef {{ x: number, y: number }} PixelPoint
 */

/**
 * Nimmt eine Strecke in beliebiger Form entgegen und gibt saubere Punkte
 * zurück. Akzeptiert `[[lat, lon], …]` und `[{lat, lon}, …]`; alles
 * Unbrauchbare fällt weg, statt später NaN in die Anzeige zu tragen.
 *
 * @returns {TrackPoint[]}
 */
export function normalizeTrack(track) {
  if (!Array.isArray(track)) return [];

  const points = [];
  for (const entry of track) {
    const lat = Array.isArray(entry) ? entry[0] : entry?.lat;
    const lon = Array.isArray(entry) ? entry[1] : entry?.lon;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    points.push({ lat, lon });
  }

  return points;
}

/** Reicht die Strecke für einen Linienzug? */
export function hasDrawableRoute(track) {
  return normalizeTrack(track).length >= MIN_POINTS;
}

/**
 * Rechnet die Strecke auf die Zeichenfläche um.
 *
 * Beide Achsen teilen sich eine Skala, damit das Seitenverhältnis erhalten
 * bleibt; der Rest wird zentriert. Liegen alle Punkte auf einer Geraden, hat
 * eine Achse keine Ausdehnung – dann bestimmt allein die andere die Skala.
 *
 * @param {unknown} track
 * @param {{width?: number, height?: number, padding?: number}} [viewport]
 * @returns {?{
 *   points: PixelPoint[],
 *   start: PixelPoint,
 *   end: PixelPoint,
 *   width: number,
 *   height: number,
 *   scale: number,
 *   pointCount: number
 * }} null, wenn kein einziger brauchbarer Punkt dabei ist
 */
export function projectTrack(track, viewport = {}) {
  const { width, height, padding } = { ...DEFAULT_VIEWPORT, ...viewport };
  const points = normalizeTrack(track);
  if (points.length === 0) return null;

  // Längengrade zusammenstauchen, damit Ost-West nicht gedehnt wirkt.
  const meanLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lonScale = Math.cos((meanLat * Math.PI) / 180);

  // y wird negiert: Norden gehört nach oben, Bildschirmkoordinaten wachsen
  // nach unten.
  const flat = points.map((p) => ({ x: p.lon * lonScale, y: -p.lat }));

  const minX = Math.min(...flat.map((p) => p.x));
  const maxX = Math.max(...flat.map((p) => p.x));
  const minY = Math.min(...flat.map((p) => p.y));
  const maxY = Math.max(...flat.map((p) => p.y));

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const availableWidth = Math.max(0, width - 2 * padding);
  const availableHeight = Math.max(0, height - 2 * padding);

  const scale = fitScale(spanX, spanY, availableWidth, availableHeight);

  const offsetX = padding + (availableWidth - spanX * scale) / 2;
  const offsetY = padding + (availableHeight - spanY * scale) / 2;

  const projected = flat.map((p) => ({
    x: offsetX + (p.x - minX) * scale,
    y: offsetY + (p.y - minY) * scale,
  }));

  return {
    points: projected,
    start: projected[0],
    end: projected.at(-1),
    width,
    height,
    scale,
    pointCount: projected.length,
  };
}

/**
 * Dünnt eine Strecke auf höchstens `maxPoints` aus, Anfang und Ende bleiben
 * erhalten.
 *
 * Gebraucht beim Speichern: eine Stunde Aufzeichnung sind schnell ein paar
 * tausend Punkte, und der localStorage ist auf wenige Megabyte begrenzt. Für
 * eine kleine Vorschau macht ein Punkt alle paar Meter keinen Unterschied.
 */
export function thinTrack(track, maxPoints = 500) {
  const points = normalizeTrack(track);
  if (maxPoints < MIN_POINTS) return points.length > 0 ? [points[0]] : [];
  if (points.length <= maxPoints) return points;

  const step = (points.length - 1) / (maxPoints - 1);
  const thinned = [];

  for (let i = 0; i < maxPoints; i++) {
    thinned.push(points[Math.round(i * step)]);
  }

  return thinned;
}

/**
 * Kompakte Form zum Speichern: `[[lat, lon], …]` mit fünf Nachkommastellen.
 * Das entspricht gut einem Meter und halbiert den Platzbedarf gegenüber
 * Objekten mit vollen Nachkommastellen.
 */
export function toStorageTrack(track, maxPoints = 500) {
  return thinTrack(track, maxPoints).map((point) => [
    round5(point.lat),
    round5(point.lon),
  ]);
}

/* ----------------------------------------------------------------- Intern */

/** Gemeinsame Skala für beide Achsen; 0, wenn die Strecke ein Punkt ist. */
function fitScale(spanX, spanY, availableWidth, availableHeight) {
  const byWidth = spanX > 0 ? availableWidth / spanX : Infinity;
  const byHeight = spanY > 0 ? availableHeight / spanY : Infinity;

  const scale = Math.min(byWidth, byHeight);
  return Number.isFinite(scale) ? scale : 0;
}

function round5(value) {
  return Math.round(value * 100_000) / 100_000;
}
