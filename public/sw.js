const CACHE_NAME = 'nvt-energy-v3.0.1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch fresh content directly from network
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
