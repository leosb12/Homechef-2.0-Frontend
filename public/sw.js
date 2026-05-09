const CACHE_NAME = 'homechef-shell-v2'
const RUNTIME_CACHE = 'homechef-runtime-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/offline.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isValidResponse(response)) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() => appShellFallback()),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (isValidResponse(response)) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached || offlineResponse())

      return cached || network
    }),
  )
})

function isValidResponse(response) {
  return response instanceof Response && response.ok && response.type !== 'opaque'
}

function appShellFallback() {
  return caches.match('/index.html')
    .then((cachedIndex) => cachedIndex || caches.match('/offline.html'))
    .then((fallback) => fallback || offlineResponse())
}

function offlineResponse() {
  return new Response('HomeChef no esta disponible sin conexion.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
