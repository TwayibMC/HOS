// sw.js — Service Worker for offline support + version management
//
// Update flow:
//   1. User visits app → browser fetches sw.js in background
//   2. If sw.js changed → browser installs new SW in parallel (state: 'installing' → 'installed/waiting')
//   3. New SW waits because old SW still controls clients
//   4. Page sends 'SKIP_WAITING' message → new SW takes over on next navigation
//
// CACHE_VERSION strategy:
//   Bump this string EVERY TIME you deploy. This invalidates the old cache atomically.
//   Suggested format: 'hos-YYYY-MM-DD' or 'hos-v<N>'.

const CACHE_VERSION = 'hos-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // Do NOT call skipWaiting() here: we want the page to ask the user first.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && new URL(event.request.url).origin === location.origin) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
