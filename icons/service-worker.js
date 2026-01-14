// Robust service worker using registration scope as BASE (works on GitHub Pages)
const CACHE_NAME = 'resto-cache-v1';

self.addEventListener('install', event => {
  const BASE = self.registration.scope || '/';
  const ASSETS = [
    BASE,
    BASE + 'index.html',
    BASE + 'manifest.json',
    BASE + 'icons/icon-192.svg',
    BASE + 'icons/icon-512.svg'
  ];

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const asset of ASSETS) {
      try {
        const resp = await fetch(asset);
        if (resp && resp.ok) {
          await cache.put(asset, resp.clone());
        } else {
          console.warn('Could not cache (not ok):', asset, resp && resp.status);
        }
      } catch (err) {
        console.warn('Could not cache (error):', asset, err);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const networkResponse = await fetch(event.request);
      if (networkResponse && networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    } catch (err) {
      const accept = event.request.headers.get('accept') || '';
      if (accept.includes('text/html')) {
        const BASE = self.registration.scope || '/';
        const fallback = await caches.match(BASE + 'index.html');
        if (fallback) return fallback;
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
