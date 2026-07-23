/**
 * Minimal app-shell service worker. Scope is deliberately narrow:
 * - Only ever handles same-origin GET requests (navigations + static assets).
 * - Never touches the backend API (different origin already exempts it, but
 *   this is explicit so a future same-origin API proxy doesn't silently start
 *   caching or buffering the /analyze SSE stream, which would break it).
 * - Network-first for navigations (always fresh when online), falling back to
 *   the cached shell when offline; cache-first for hashed static assets.
 */
const CACHE = "bro-coach-shell-v2";
const SHELL_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(request)
          .then((cached) => cached || caches.match("/"))
          // Belt-and-suspenders: if the precache itself is unavailable (e.g. the
          // install step never completed, or storage was evicted), fall back to
          // a real Response instead of resolving undefined - an undefined
          // respondWith() value surfaces the browser's own offline error page,
          // which is the opposite of a controlled fallback.
          .then(
            (cached) =>
              cached ||
              new Response("You're offline and no cached page is available.", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              }),
          ),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/mascots/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
