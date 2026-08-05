const CACHE_NAME = 'wayground-pwa-v9';
const STATIC_ASSETS_CACHE = 'wayground-static-v9';

const PRECACHE_ASSETS = [
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

// ─── Push Notifications ────────────────────────────────────────────────────────
function safeNotificationTarget(value) {
  try {
    const target = new URL(
      typeof value === 'string' && value.startsWith('/') ? value : '/dashboard',
      self.location.origin,
    );
    return target.origin === self.location.origin
      ? target.href
      : new URL('/dashboard', self.location.origin).href;
  } catch {
    return new URL('/dashboard', self.location.origin).href;
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { message: event.data?.text() || '' };
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim().slice(0, 120)
      : 'Way Ground update';
  const message =
    typeof payload.message === 'string'
      ? payload.message.trim().slice(0, 1000)
      : '';
  const tag =
    typeof payload.tag === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(payload.tag)
      ? payload.tag
      : 'wayground-update';
  const targetUrl = safeNotificationTarget(payload.url);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        badge: '/icon-192x192.png',
        body: message,
        data: { url: targetUrl },
        icon: '/icon-192x192.png',
        renotify: true,
        tag,
      }),
      self.clients
        .matchAll({ includeUncontrolled: true, type: 'window' })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({ type: 'WAYGROUND_NOTIFICATION' });
          });
        }),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = safeNotificationTarget(event.notification.data?.url);

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: 'window' })
      .then(async (clientList) => {
        const matchingClient = clientList.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        if (matchingClient) {
          if ('navigate' in matchingClient) await matchingClient.navigate(targetUrl);
          return matchingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      }),
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
  //    This catches Spotify SDK (sdk.scdn.co, *.spotify.com), Google Fonts
  //    loaded from JS, analytics, and any browser-extension
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

  // Never cache navigations, RSC payloads, or other application GETs. They can
  // contain account-specific learning, support, and financial data and Cache
  // Storage persists across logout and account changes.
  return;
});

// ─── Global safety net: catch any unhandled promise rejections ─────────────────
// Prevents "Uncaught (in promise) TypeError: Failed to convert value to 'Response'"
self.addEventListener('unhandledrejection', (event) => {
  console.warn('[SW] Swallowed unhandled rejection:', event.reason);
  event.preventDefault();
});
