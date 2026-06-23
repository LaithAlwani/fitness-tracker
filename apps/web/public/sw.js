// Liftify service worker — enables install + fast loads.
// Liftify is online-first (auth + Convex realtime), so this only caches the app
// shell and immutable static assets. Everything else passes straight through.
const CACHE = "liftify-v4";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // App navigations: network-first, fall back to the cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match("/")) || Response.error()),
    );
    return;
  }

  // Cache-first ONLY for immutable static assets. Everything else (RSC, data,
  // dynamic routes) is left untouched so we never break a live request.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpe?g|svg|webp|avif|ico|webmanifest)$/.test(
      url.pathname,
    );
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
    }),
  );
});

// ---- Web Push ----
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* non-JSON payload */
  }
  const title = data.title || "Liftify";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If the app is open and on-screen, the in-app alert already covers it.
        const focused = clients.some(
          (c) => c.focused || c.visibilityState === "visible",
        );
        if (focused) return;
        return self.registration.showNotification(title, {
          body: data.body || "",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          data: { url: data.url || "/" },
        });
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
