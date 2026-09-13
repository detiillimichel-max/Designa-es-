const CACHE_NAME = 'escala-reuniao-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/data/membros.js',
  './src/logic/geradorEscala.js',
  './src/ui/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
