/* --- Rüzgar Portfolio SW (network-first HTML, cache-first static) --- */
const VERSION = 'v5';                                // 🔁 deploy'da artır
const CACHE_NAME = `rzr-cache-${VERSION}`;
const SCOPE_URL = new URL(self.registration.scope);  // GH Pages alt-dizinine uyum
const U = (p) => new URL(p, SCOPE_URL).pathname;     // /kullanici/repo/... üretir

// Statik (aynı origin) dosyaları önbelleğe al
const CORE_ASSETS = [
  U('./'),                 // kök (GH Pages alt-dizini dahil)
  U('index.html'),
  U('manifest.json'),
  U('faviconn.png'),
  U('icon-192.png'),
  U('icon-512.png'),
  U('profile.png'),        // varsa
  U('resume.pdf')          // varsa
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('rzr-cache-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// HTML -> network-first, diğer same-origin GET -> cache-first (+runtime cache)
// 3rd-party (YouTube/Sketchfab vb) -> network (fail olursa varsa cache)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigasyon/HTML için network-first
  if (req.mode === 'navigate' || (sameOrigin && req.destination === 'document')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then((hit) => hit || caches.match(U('index.html')))
      )
    );
    return;
  }

  // Aynı origin statik istekler: cache-first, yoksa ağdan çek ve cache'e koy
  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Üçüncü taraf: network; offline ise varsa cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

// İsteğe bağlı: Skip Waiting mesajı
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
