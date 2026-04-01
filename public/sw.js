const CACHE_NAME = 'eduportal-pwa-v4';
const STATIC_ASSETS_CACHE = 'eduportal-static-v4';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// ─── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== STATIC_ASSETS_CACHE)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Helper: guaranteed safe Response ──────────────────────────────────────────
function offlineResponse(status = 503) {
  return new Response('Service Unavailable', {
    status,
    statusText: 'Service Unavailable',
    headers: new Headers({ 'Content-Type': 'text/plain' }),
  });
}

// ─── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Only intercept GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 2. Never intercept API routes
  if (url.pathname.startsWith('/api/')) return;

  // 3. Bypass ALL third-party / cross-origin requests.
  //    This catches Spotify SDK (sdk.scdn.co, *.spotify.com), Tawk.to,
  //    Google Fonts loaded from JS, analytics, and any browser-extension
  //    injections — none of them should be routed through our PWA cache.
  if (url.origin !== self.location.origin) return;

  // ── Strategy 1: Cache-First for fingerprinted static assets ──────────────
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        try {
          const cached = await caches.match(request);
          if (cached) return cached;

          const networkRes = await fetch(request);
          // Only cache successful, non-opaque responses
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(STATIC_ASSETS_CACHE).then((c) => c.put(request, clone));
          }
          return networkRes;
        } catch {
          return offlineResponse();
        }
      })()
    );
    return;
  }

  // ── Strategy 2: Stale-While-Revalidate for navigation / HTML ─────────────
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request);

        const fetchPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes.ok) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return networkRes;
          })
          .catch(() => offlineResponse());

        // Return cache immediately if available, otherwise await network
        return cached || (await fetchPromise);
      } catch {
        return offlineResponse();
      }
    })()
  );
});

// ─── Global safety net: catch any unhandled promise rejections ─────────────────
// Prevents "Uncaught (in promise) TypeError: Failed to convert value to 'Response'"
self.addEventListener('unhandledrejection', (event) => {
  console.warn('[SW] Swallowed unhandled rejection:', event.reason);
  event.preventDefault();
});