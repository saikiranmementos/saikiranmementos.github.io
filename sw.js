const C = 'sk-app-v9';
const ROOT = self.registration.scope;
const CORE = [ROOT, 'support.js', 'vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'manifest.webmanifest', 'assets/icon-192.png', 'assets/logo-en-sm.png', 'assets/logo-te-sm.png', 'assets/logo-splash.png'];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|lh3\.googleusercontent\.com)\//;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== C && (k.indexOf('sk-app-') === 0 || k.indexOf('memento-studio-') === 0)) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const same = u.origin === location.origin;
  if (!same && !CDN.test(r.url)) return;
  if (same && /\/(version|config)\.json$/.test(u.pathname)) return;
  if (r.mode === 'navigate') {
    const key = /\/(index\.html)?$/.test(u.pathname) ? ROOT : u.origin + u.pathname;
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(key, cp)); } return res; }).catch(() => caches.match(key).then(h => h || caches.match(ROOT))));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
