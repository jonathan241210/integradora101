// Subir CACHE_VERSION en cada release para que el service worker use un nombre de caché nuevo
// y borre los anteriores al activarse (pwa-012 CA-07).
const CACHE_VERSION = 'v2';
const CACHE_PREFIX = 'arca-pwa-shell-';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest'];
const NEVER_CACHE_PREFIXES = ['/storage', '/api', '/sanctum'];

/** Rutas dinámicas o con datos sensibles que nunca se guardan en caché (CA-05). */
function isCacheablePath(pathname) {
  return !NEVER_CACHE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/** Solo se guardan respuestas correctas 2xx (CA-06). */
function isCacheableResponse(response) {
  return Boolean(response) && response.ok === true;
}

/** Cachés del shell que no son la versión actual (CA-07). */
function staleCacheKeys(keys, current) {
  return keys.filter((key) => key !== current);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(staleCacheKeys(keys, CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!isCacheablePath(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (isCacheableResponse(response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached)),
    );
  }
});
