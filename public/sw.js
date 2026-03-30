const CACHE_NAME = 'birddex-shell-v1';
const PRECACHE_URLS = ['/', '/index.html'];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls (ebird, inaturalist, fonts): network-first, fall through on error
// - App shell (same origin): stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache API calls or cross-origin resources beyond simple passthrough
  if (
    url.origin !== self.location.origin ||
    request.method !== 'GET'
  ) {
    return; // let browser handle it
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        // Cache successful same-origin responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      // Return cached version immediately if available, but refresh in background
      return cached ?? networkFetch;
    })
  );
});
