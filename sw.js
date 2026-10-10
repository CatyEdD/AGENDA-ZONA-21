/* Modo sin conexión: guarda la aplicación en la tablet y la actualiza en segundo plano. */
const VERSION = 'z21-v1.0.0';
const BASE = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'portada.jpg', 'icon-192.png', 'icon-512.png',
  'js/enlaces.js', 'js/core.js', 'js/ink.js', 'js/views.js', 'js/views2.js', 'js/main.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const red = fetch(r).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit || caches.match('index.html'));
    return hit || red;
  }));
});
