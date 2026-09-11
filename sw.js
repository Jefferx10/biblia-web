// Lámpara: funciona sin conexión.
// index.html, preguntas.json, versiones.json y remoto.json se buscan primero en
// internet, así los cambios que subas a GitHub se ven al recargar. La Biblia y las
// imágenes se sirven desde la caché. Nunca se guarda una página HTML en lugar de
// un archivo de datos (Cloudflare responde index.html cuando un archivo no existe).
const VERSION = "lampara-v4";
const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "datos/versiones.json", "datos/biblia-rv1909.json", "datos/preguntas.json",
  "icons/icon-192.png", "icons/icon-512.png"
];
const FRESH = [/\/$/, /\.html$/, /preguntas\.json$/, /versiones\.json$/, /remoto\.json$/, /manifest\.webmanifest$/];

const isPage = path => /\/$|\.html$/.test(path);
const valid = (res, path) => res && res.ok &&
  (isPage(path) || !(res.headers.get("content-type") || "").includes("text/html"));

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(cache => Promise.all(CORE.map(async file => {
    try {
      const res = await fetch(file, { cache: "reload" });
      if (valid(res, new URL(file, self.location).pathname)) await cache.put(file, res);
    } catch (err) { /* se guardará cuando se use */ }
  }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const path = url.pathname;
  const key = url.origin + path;                       // sin ?parámetros
  const save = res => {
    if (valid(res, path)) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
    return res;
  };
  const network = () => fetch(e.request).then(save);
  const cached = () => caches.match(key).then(hit => (valid(hit, path) ? hit : undefined));

  if (e.request.mode === "navigate" || FRESH.some(r => r.test(path)) || url.searchParams.has("fresco")) {
    e.respondWith(network().catch(() => cached().then(hit => hit || caches.match("index.html"))));
  } else {
    e.respondWith(cached().then(hit => hit || network()));
  }
});
