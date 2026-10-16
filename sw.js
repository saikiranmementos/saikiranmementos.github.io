const C = 'sk-app-v2';
const ROOT = self.registration.scope;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll([ROOT, 'manifest.webmanifest', 'assets/icon-192.png'])).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== C) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(ROOT, cp)); return res; }).catch(() => caches.match(ROOT)));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
