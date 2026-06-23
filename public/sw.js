/**
 * Service Worker para HomeChef
 *
 * Requisitos:
 * 1. App shell cache.
 * 2. Cache versionado.
 * 3. Limpieza de cachés antiguas.
 * 4. Navegación offline devuelve index.html.
 * 5. Estrategias: navigate -> Network-first (fallback index.html), assets -> Cache-first.
 * 6. API NO se cachea como asset (excluida explícitamente).
 * 7. Evitar romper desarrollo con Vite (ignora HMR y websocket).
 */

const CACHE_VERSION = 'v2.2-domain-proyecto';
const CACHE_NAME = `homechef-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `homechef-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Instalar SW y precachear App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activar SW y limpiar cachés anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Excluir llamadas a orígenes externos (como Supabase Auth)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. Ignorar desarrollo de Vite (HMR, ws, modules en desarrollo)
  if (
    url.pathname.includes('/@vite/') || 
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@id/') ||
    url.pathname.includes('/__vite_ping') ||
    request.url.includes('ws://') ||
    request.url.includes('wss://')
  ) {
    return; // Dejar que pase directamente sin SW
  }

  // 2. Excluir explícitamente peticiones de API y Sync
  if (
    url.pathname.includes('/api/') || 
    url.pathname.includes('/sync/') || 
    url.pathname.includes('/trust-admin/') ||
    url.pathname.includes('/admin/sync/') ||
    url.pathname === '/runtime-config.js'
  ) {
    return; // Peticiones dinámicas van sólo a red
  }

  // 3. Estrategia de navegación (Navigate): Network-First, fallback a index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isValidResponse(response)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => appShellFallback())
    );
    return;
  }

  // 4. Estrategia de assets estáticos: Cache-First con actualización en segundo plano
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (isValidResponse(response)) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || offlineResponse());

      return cached || network;
    })
  );
});

// Manejar mensajes para SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isValidResponse(response) {
  return response instanceof Response && response.ok && response.type !== 'opaque';
}

function appShellFallback() {
  return caches.match('/index.html')
    .then((cachedIndex) => cachedIndex || offlineResponse());
}

function offlineResponse() {
  return new Response('HomeChef no está disponible sin conexión.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
