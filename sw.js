const CACHE_NAME = 'resto-cache-v1';
const PRECACHE = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192.svg',
  'icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;

  // Navigation requests -> serve cached index.html (app shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then(cached => cached || fetch(req).catch(() => cached))
    );
    return;
  }

  // For other requests: try cache, then network (and update cache)
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(resp => {
        // update cache for same-origin resources
        if (req.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
