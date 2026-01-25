/**
 * Service Worker (PWA) – minimalist & stable.
 *
 * ✅ Does:
 * - Pre-cache the app shell (`/index.html`) + offline fallback (`/offline.html`) + manifest.
 * - Runtime cache for built static assets (JS/CSS/fonts/images), using stale-while-revalidate.
 * - Navigation handling: network-first, fallback to cached app shell, then offline page.
 *
 * ❌ Intentionally does NOT:
 * - Use `localStorage` (not available in SW environments reliably).
 * - Run AI/Ollama or any heavy logic in the background (D-012, D-061).
 * - Implement background sync / offline queues (keep SW predictable).
 * - Cache `/api/*` responses (backend is optional; avoid masking failures).
 */

const SW_VERSION = '2026-01-24-1';
const PRECACHE_NAME = `flexgrafik-precache-${SW_VERSION}`;
const RUNTIME_CACHE_NAME = `flexgrafik-runtime-${SW_VERSION}`;

const OFFLINE_URL = '/offline.html';
const APP_SHELL_URL = '/index.html';

const PRECACHE_URLS = ['/', APP_SHELL_URL, OFFLINE_URL, '/manifest.json'];

const ASSET_EXT_RE = /\.(js|css|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|ico)$/i;

// ============================================================================
// INSTALL – Pre-cache critical assets
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

// ============================================================================
// ACTIVATE – Clean old caches & take control
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PRECACHE_NAME, RUNTIME_CACHE_NAME]);
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => (keep.has(key) ? undefined : caches.delete(key))));
      await self.clients.claim();
    })()
  );
});

// ============================================================================
// FETCH – App shell + assets caching; leave `/api/*` alone
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Do not cache API requests (backend optional)
  if (url.pathname.startsWith('/api/')) return;

  // Navigation / HTML requests (SPA shell)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Static built assets (Vite) + common extensions
  if (url.pathname.startsWith('/assets/') || ASSET_EXT_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: network with cache fallback (minimal)
  event.respondWith(networkWithCacheFallback(request));
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    // Keep app shell fresh (cache under a stable key)
    const cache = await caches.open(PRECACHE_NAME);
    cache.put(APP_SHELL_URL, response.clone());
    return response;
  } catch (_) {
    const cache = await caches.open(PRECACHE_NAME);
    return (await cache.match(APP_SHELL_URL)) || (await cache.match(OFFLINE_URL));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      // Cache only successful, basic (same-origin) responses
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || fetchPromise || cached;
}

async function networkWithCacheFallback(request) {
  try {
    return await fetch(request);
  } catch (_) {
    const cached = await caches.match(request);
    return cached || (await caches.match(OFFLINE_URL));
  }
}

// ============================================================================
// MESSAGE – used by index.html to activate new SW
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
});
