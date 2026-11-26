/* Service Worker เบา ๆ: แคชไฟล์หลักเพื่อเปิดได้แม้เน็ตอ่อน */
const CACHE = 'cmb-halabala-shell-v1';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './styles/public-layout.css',
  './styles/dashboard.css',
  './styles/flood-monitor.css',
  './scripts/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML: network-first แล้วค่อย fallback แคช
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html'))),
    );
    return;
  }

  // สินทรัพย์อื่น: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => cached);
    }),
  );
});
