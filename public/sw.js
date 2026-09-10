/**
 * sw.js — caches the app shell only. Never touches the engine API.
 *
 * The non-negotiable from the brief: "never cache API responses in a way
 * that could show stale positions as current." The simplest way to guarantee
 * that isn't a caching *policy* that might be gotten wrong later — it's to
 * never let this worker see those requests at all. The engine lives at a
 * different origin than wherever this app is hosted (a LAN IP today, a VPS
 * domain later), so any request whose origin isn't this app's own is passed
 * straight through untouched, uncached, unintercepted. Same-origin requests
 * are the shell: the HTML, the built JS/CSS, the icons — exactly what an
 * offline "Add to Home Screen" app needs to still open when the phone has no
 * signal.
 */

const CACHE_VERSION = "signal-desk-shell-v1";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Individual failures (a file that doesn't exist yet, a dev-server
      // quirk) shouldn't fail the whole install.
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // The engine's API + SSE stream, and anything else off-origin. Untouched.
    return;
  }

  if (request.mode === "navigate") {
    // Network-first for the document itself, so a deploy is picked up on the
    // next launch with a network connection; cached shell is the offline
    // fallback, not the default.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html").then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  // Vite content-hashes its built assets, so anything under /assets/ never
  // changes meaning for a given URL — safe to serve straight from cache and
  // only hit the network the first time.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
    return;
  }

  // Everything else same-origin (icons, splash images, the manifest):
  // stale-while-revalidate — instant from cache, refreshed in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
