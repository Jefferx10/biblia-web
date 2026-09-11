// Lámpara: funciona sin conexión.
// index.html y preguntas.json se buscan primero en internet, así los cambios
// que subas a GitHub se ven al recargar. La Biblia y las imágenes se sirven
// desde la caché. Cambia VERSION solo si reemplazas biblia-rv1909.json.
const VERSION = "lampara-v3";
const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "datos/versiones.json", "datos/biblia-rv1909.json", "datos/preguntas.json",
  "icons/icon-192.png", "icons/icon-512.png"
];
const FRESH = [/\/$/, /\.html$/, /preguntas\.json$/, /versiones\.json$/, /remoto\.json$/, /manifest\.webmanifest$/];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const save = res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  };
  if (e.request.mode === "navigate" || FRESH.some(r => r.test(url.pathname))) {
    e.respondWith(fetch(e.request).then(save).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match("index.html"))));
  } else {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(save)));
  }
});
