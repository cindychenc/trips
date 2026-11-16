// Keeps the app itself on the device so it opens offline. Trip data is stored separately by the page.
const CACHE = 'trip-app-v17';
const PHOTOS = 'trip-photos-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './fonts/inter-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== PHOTOS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // Header photos: keep a copy once seen so they show offline. Everything else (the sheet feed) goes straight to the network.
    if (req.destination === 'image') {
      e.respondWith(caches.open(PHOTOS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
        if (r.ok || r.type === 'opaque') c.put(req, r.clone());
        return r;
      }))));
    }
    return;
  }
  // Network first for the page (so updates arrive), cache as fallback offline; cache first for everything else.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
