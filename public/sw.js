const CACHE_NAME = 'nxxt-futures-v2';

// Only cache the bare minimum static shell.
// DO NOT cache '/app' — it's a protected route that redirects unauthenticated
// users to /login. cache.addAll() requires all URLs to return 200; a redirect
// response throws "Failed to execute 'addAll' on 'Cache': Request failed" and
// breaks the entire service worker install.
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install — cache static shell only
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clear old caches (including v1 which had the broken /app entry)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache for navigation
self.addEventListener('fetch', event => {
  const { request } = event;
  // Skip non-GET and API calls
  if (request.method !== 'GET') return;
  if (request.url.includes('supabase.co')) return;
  if (request.url.includes('anthropic.com')) return;
  if (request.url.includes('fonts.googleapis.com')) return;

  // Navigation requests → network first, cache fallback to root only
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') )
    );
    return;
  }

  // Static assets → stale while revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
