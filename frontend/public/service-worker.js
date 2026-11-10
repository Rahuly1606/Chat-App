const CACHE_NAME = 'chat-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/speak.png',
  '/install.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET'
    || url.origin !== self.location.origin
    || url.pathname.startsWith('/api')
    || url.pathname.startsWith('/socket.io')
  ) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  if (!urlsToCache.includes(url.pathname)) return;
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
