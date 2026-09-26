import { tools } from "@/tools/registry";

// Generated once at build time: the page list and version are baked in, so a new
// deploy produces a new service worker and installed apps pick up new helpers.
export const dynamic = "force-static";

const config = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  pages: ["/", ...tools.map((t) => `/tools/${t.slug}`)],
  assets: ["/manifest.webmanifest", "/favicon.ico", "/icon.svg", "/apple-icon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"],
};

/**
 * Service worker (plain JS, runs in the browser):
 * - install:  download every page plus the JS/CSS it references, so all tools work offline
 * - activate: drop caches of older versions and tell open tabs a new version is live
 * - fetch:    pages network-first (fresh when online, cached when offline),
 *             hashed build assets cache-first, everything else stale-while-revalidate
 */
const source = /* js */ `
const CONFIG = ${JSON.stringify(config)};
const CACHE = "lial-" + CONFIG.version;
const ASSET_PATTERN = /\\/_next\\/static\\/[^"'\\s)\\\\]+/g;
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = new Set(CONFIG.assets);
      for (const page of CONFIG.pages) {
        const response = await fetch(page, { cache: "no-cache" });
        if (!response.ok) throw new Error("Could not precache " + page);
        const html = await response.clone().text();
        for (const match of html.matchAll(ASSET_PATTERN)) assets.add(match[0]);
        await cache.put(page, response);
      }
      await Promise.all(
        [...assets].map(async (url) => {
          try {
            const response = await fetch(url, { cache: "no-cache" });
            if (response.ok) await cache.put(url, response);
          } catch {}
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("lial-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.postMessage({ type: "activated", version: CONFIG.version });
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "get-version") {
    event.source && event.source.postMessage({ type: "version", version: CONFIG.version });
  }
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

const pageKey = (url) => (url.pathname !== "/" ? url.pathname.replace(/\\/$/, "") : "/");

async function networkFirstPage(request, url) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(pageKey(url), response.clone());
    return response;
  } catch {
    return (await cache.match(pageKey(url))) || (await cache.match("/")) || Response.error();
  }
}

// Client-side navigations fetch React Server Component payloads. When offline and
// the payload is not cached, answer with the cached HTML: Next.js then falls back
// to a full page load, which is served from the cache as well.
async function networkFirstRsc(request, url) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(pageKey(url))) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.headers.get("RSC")) {
    event.respondWith(networkFirstRsc(request, url));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
`;

export function GET() {
  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
