self.addEventListener("install", e => {
  console.log("Service Worker: Installed");
  e.waitUntil(
    caches.open("rzr-cache").then(cache => {
      return cache.addAll(["./", "./index.html"]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});