/**
 * Minimaler Service Worker für das PWA-Grundgerüst.
 * App-Shell wird beim Install gecacht und danach cache-first ausgeliefert.
 *
 * Beim Ändern der App-Dateien CACHE_VERSION hochzählen, sonst bleibt der
 * alte Stand im Cache.
 */

const CACHE_VERSION = 'laufapp-v12';

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
      .then((cache) => cache.addAll(APP_SHELL))
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
            .filter((key) => key !== CACHE_VERSION)
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
