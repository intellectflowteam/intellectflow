// Minimal service worker: exists mainly to satisfy PWA installability
// requirements. Deliberately does NOT cache HTML pages, API responses, or
// Supabase calls (this app is highly dynamic/auth-dependent — caching those
// would risk showing stale or wrong data). Only caches hashed, versioned
// static build assets, which are safe to cache indefinitely since their
// filenames change whenever their content changes.

const CACHE_NAME = "intellectflow-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only ever handle same-origin, content-hashed static assets. Everything
  // else (navigations, API, Supabase, external) passes straight through to
  // the network untouched.
  const isStaticAsset = url.origin === self.location.origin && /^\/assets\//.test(url.pathname);
  if (!isStaticAsset || event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    }),
  );
});
