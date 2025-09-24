// Service Worker para PWA (network-first y cache bust)
const CACHE_NAME = 'nexopos-dc-v3';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Nunca cachear llamadas a APIs externas (Cloud Functions/Run)
  const isApiCall = /us-central1-|cloudfunctions|a.run.app|gestionsimple/i.test(reqUrl.hostname + reqUrl.pathname);

  if (isApiCall) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 504, statusText: 'offline' }))
    );
    return;
  }

  // Estrategia network-first para el resto
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        return response;
      })
      .catch(() => caches.match(event.request) || new Response('', { status: 504, statusText: 'offline' }))
  );
});