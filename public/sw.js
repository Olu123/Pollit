// Pollit service worker — offline caching + background vote sync.
const CACHE = 'pollit-v1'
const PRECACHE_URLS = ['/', '/login', '/leaderboard']

// Precache the core shell pages.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {/* ignore individual failures */})
    )
  )
  self.skipWaiting()
})

// Drop old caches on activate.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return        // skip Supabase/CDN calls
  if (url.pathname.startsWith('/_next/data')) return

  // Page navigations: network-first, fall back to cached page, then cached home.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match('/')) ||
          new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        )
    )
    return
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})

// Background sync: when connectivity returns, ask open clients to flush any
// votes queued while offline (clients hold the authenticated Supabase session).
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-votes') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'FLUSH_VOTES' }))
      })
    )
  }
})
