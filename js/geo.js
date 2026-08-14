/**
 * Geo-Mathematik und Filterung roher GPS-Punkte.
 *
 * Pur und ohne Browser-API – der Zugriff auf navigator.geolocation liegt in
 * tracker.js. Dadurch lässt sich die Streckenberechnung mit erfundenen
 * Punkten testen.
 *
 * @typedef {{ lat: number, lon: number, accuracy: number, timestamp: number }} GeoPoint
 */

/** Mittlerer Erdradius (WGS-84) in km. */
export const EARTH_RADIUS_KM = 6371.0088;

/**
 * Grenzwerte gegen typischen GPS-Müll:
 *   maxAccuracyM  Punkte mit schlechterer Genauigkeit werden verworfen
 *   minSegmentM   kürzere Strecken gelten als Jitter im Stand
 *   maxSpeedMs    schnellere Sprünge sind Messfehler (10 m/s = 36 km/h)
 */
export const DEFAULT_FILTER = {
  maxAccuracyM: 30,
  minSegmentM: 5,
  maxSpeedMs: 10,
};

/** Luftlinie zwischen zwei Punkten in km (Haversine). */
export function haversineKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Prüft einen neuen Punkt gegen den zuletzt akzeptierten.
 *
 * `previous === null` bedeutet: erster Punkt der Strecke – dann zählt nur die
 * Genauigkeit, und die Distanz ist 0.
 *
 * @param {?GeoPoint} previous
 * @param {GeoPoint} next
 * @param {typeof DEFAULT_FILTER} [filter]
 * @returns {{ accepted: boolean, reason: ?string, distanceKm: number }}
 */
export function evaluateSegment(previous, next, filter = DEFAULT_FILTER) {
  if (!Number.isFinite(next.accuracy) || next.accuracy > filter.maxAccuracyM) {
    return { accepted: false, reason: 'ungenau', distanceKm: 0 };
  }

  if (previous === null) {
    return { accepted: true, reason: null, distanceKm: 0 };
  }

  const distanceKm = haversineKm(previous, next);
  const distanceM = distanceKm * 1000;

  if (distanceM < filter.minSegmentM) {
    return { accepted: false, reason: 'jitter', distanceKm: 0 };
  }

  const seconds = (next.timestamp - previous.timestamp) / 1000;
  if (!(seconds > 0)) {
    return { accepted: false, reason: 'zeitsprung', distanceKm: 0 };
  }

  if (distanceM / seconds > filter.maxSpeedMs) {
    return { accepted: false, reason: 'sprung', distanceKm: 0 };
  }

  return { accepted: true, reason: null, distanceKm };
}

/**
 * Rechnet eine komplette Punktfolge durch – für Tests und spätere
 * Nachbearbeitung einer aufgezeichneten Strecke.
 *
 * @param {GeoPoint[]} points
 * @param {typeof DEFAULT_FILTER} [filter]
 * @returns {{ distanceKm: number, accepted: GeoPoint[], rejected: {point: GeoPoint, reason: string}[] }}
 */
export function reduceTrack(points, filter = DEFAULT_FILTER) {
  let distanceKm = 0;
  let previous = null;
  const accepted = [];
  const rejected = [];

  for (const point of points) {
    const result = evaluateSegment(previous, point, filter);
    if (result.accepted) {
      distanceKm += result.distanceKm;
      accepted.push(point);
      previous = point;
    } else {
      rejected.push({ point, reason: result.reason });
    }
  }

  return { distanceKm, accepted, rejected };
}

/** Pace in Minuten pro km; null, wenn noch keine sinnvolle Strecke da ist. */
export function paceMinPerKm(distanceKm, elapsedMs) {
  if (distanceKm <= 0 || elapsedMs <= 0) return null;
  return elapsedMs / 60_000 / distanceKm;
}

/** Sekunden -> "M:SS" bzw. "H:MM:SS". */
export function formatDuration(totalMs) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Pace als "5:30" (Minuten:Sekunden pro km); "–" wenn unbekannt. */
export function formatPace(minPerKm) {
  if (minPerKm === null || !Number.isFinite(minPerKm)) return '–';
  return formatDuration(minPerKm * 60_000);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
