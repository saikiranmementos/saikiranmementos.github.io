const C = 'sk-app-v5';
const ROOT = self.registration.scope;
const CORE = [ROOT, 'support.js', 'vendor/react.production.min.js', 'vendor/react-dom.production.min.js', '_ds/modernist-9945018a-5161-496c-b976-2e3bf3924c50/styles.css', '_ds/modernist-9945018a-5161-496c-b976-2e3bf3924c50/_ds_bundle.js', 'manifest.webmanifest', 'assets/icon-192.png', 'assets/logo-en-sm.png', 'assets/logo-te-sm.png', 'assets/logo-splash.png'];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|lh3\.googleusercontent\.com)\//;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== C && k.indexOf('sk-app-') === 0) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const same = u.origin === location.origin;
  if (!same && !CDN.test(r.url)) return;
  if (same && (u.pathname.indexOf('/memento-studio/') >= 0 || /\/(version|config)\.json$/.test(u.pathname))) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(ROOT, cp)); return res; }).catch(() => caches.match(ROOT))); return; }
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
