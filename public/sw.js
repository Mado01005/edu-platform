const CACHE_NAME = 'eduportal-pwa-v2';
const STATIC_ASSETS_CACHE = 'eduportal-static-v2';

// Assets that never change should be cached immediately
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/sw.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_ASSETS_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests and API calls (let them hit network)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Bypass service worker for third-party SDK requests (Spotify SDK, etc.)
  // This prevents TypeError when third-party WebSocket or fetch requests fail
  if (
    url.hostname === 'sdk.scdn.co' ||
    url.hostname === 'accounts.spotify.com' ||
    url.hostname === 'api.spotify.com' ||
    url.hostname.endsWith('.spotify.com')
  ) {
    return;
  }

  // Strategy 1: Cache-First for static assets (images, fonts, Next.js static chunks)
  // These assets are fingerprinted and won't change, so checking cache first is fastest.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|woff2|woff|ttf)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_ASSETS_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // Return a proper 503 Response instead of undefined to prevent TypeError
          return new Response('Service Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          });
        });
      })
    );
    return;
  }

  // Strategy 2: Stale-While-Revalidate for HTML pages and dynamic content
  // Serve from cache immediately, then fetch in background to update cache for next time.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Return a proper 503 Response instead of undefined to prevent TypeError
        return new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      });

      return cachedResponse || fetchPromise;
    })
  );
});