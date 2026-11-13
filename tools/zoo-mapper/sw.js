// ARCA-NB · Zoo Mapper — Service Worker
// Objetivo: que la herramienta abra al instante y funcione sin red en el zoológico.
// Estrategia: cache-first para el app shell; red solo cuando falta algo.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `arca-zoo-mapper-${CACHE_VERSION}`;
const OFFLINE_URL = './index.html';

// Todo lo que la app necesita para arrancar sin red.
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Precarga tolerante: si un recurso falla, el resto se conserva y el
    // Service Worker sí se activa (antes, un solo fallo tumbaba el install).
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (error) {
        console.warn('[sw] No se pudo precachear', url, error);
      }
    }));
    console.log(`[sw] ${CACHE_NAME} instalado con ${APP_SHELL.length} recursos`);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    );
    await self.clients.claim();
    console.log(`[sw] ${CACHE_NAME} activo`);
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo se gestionan lecturas del propio origen.
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 1. Caché primero: con o sin red, el shell responde igual.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // 2. Sin caché: se intenta la red y se guarda para la próxima.
    try {
      const response = await fetch(request);
      if (response && response.ok && new URL(request.url).origin === self.location.origin) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      // 3. Sin red y sin caché: si es navegación, se sirve el shell.
      if (request.mode === 'navigate') {
        const shell = await cache.match(OFFLINE_URL, { ignoreSearch: true });
        if (shell) return shell;
      }
      return new Response('Sin conexión y sin copia local de este recurso.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
