// Service Worker legacy desactivado intencionalmente.
// Objetivo: evitar bundles obsoletos en WebView/PWA híbrida.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'SW_DEPRECATED_RELOAD' });
      client.navigate(client.url);
    }
    await self.registration.unregister();
  })());
});