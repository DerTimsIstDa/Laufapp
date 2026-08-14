/**
 * Minimaler Service Worker für das PWA-Grundgerüst.
 * App-Shell wird beim Install gecacht und danach cache-first ausgeliefert.
 *
 * Beim Ändern der App-Dateien CACHE_VERSION hochzählen, sonst bleibt der
 * alte Stand im Cache.
 */

/**
 * Muss mit CACHE_PREFIX in js/pwa.js übereinstimmen – ein Test wacht darüber.
 * Der Service Worker kann die Konstante nicht importieren, ohne ein
 * Modul-Worker zu werden.
 */
const CACHE_PREFIX = 'laufapp-';

const CACHE_VERSION = `${CACHE_PREFIX}v21`;

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/xp.js',
  './js/achievements.js',
  './js/titles.js',
  './js/geo.js',
  './js/tracker.js',
  './js/validation.js',
  './js/transfer.js',
  './js/stats.js',
  './js/route.js',
  './js/pwa.js',
  './js/lock.js',
  './js/history.js',
  './js/storage.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        // `cache: 'reload'` geht am HTTP-Cache des Browsers vorbei. Ohne das
        // liefert GitHub Pages mit seinem max-age=600 bis zu zehn Minuten alte
        // Dateien, und im selben Cache landen frisches HTML neben altem
        // JavaScript – die Oberfläche ist dann neu, der Code dahinter nicht.
        cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Nur eigene Altlasten wegräumen. Auf github.io teilen sich alle
            // Projekte eines Kontos denselben Origin – ohne die Präfixprüfung
            // löscht dieser Service Worker dem Nachbarprojekt den Cache.
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).catch(
        () => caches.match('./index.html') // Offline-Fallback für Navigationen
      );
    })
  );
});
