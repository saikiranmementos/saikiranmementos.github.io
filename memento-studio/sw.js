// Memento Studio offline cache: the whole app (libraries, bases, backdrops) is precached on install.
const CACHE = 'memento-studio-v4';
const SHELL = [
  "./",
  "./Memento%20Studio.dc.html",
  "./support.js",
  "./memento-engine.js",
  "./manifest.webmanifest",
  "./vendor/three-all.js",
  "./vendor/occt-import-js.js",
  "./vendor/occt-import-js.wasm",
  "./assets/logo.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/base_4x6.stp",
  "./assets/base_10x15_dimma.stp",
  "./assets/backdrops/bd_01.jpg",
  "./assets/backdrops/bd_02.jpg",
  "./assets/backdrops/bd_03.jpg",
  "./assets/backdrops/bd_04.jpg",
  "./assets/backdrops/bd_05.jpg",
  "./assets/backdrops/bd_06.jpg",
  "./assets/backdrops/bd_07.jpg",
  "./assets/backdrops/bd_08.jpg",
  "./assets/backdrops/bd_09.jpg",
  "./assets/backdrops/bd_11.jpg",
  "./assets/backdrops/bd_12.jpg",
  "./assets/backdrops/bd_17.jpg",
  "./assets/backdrops/bd_18.jpg",
  "./assets/backdrops/bd_19.jpg",
  "./assets/backdrops/bd_20.jpg",
  "./assets/backdrops/bd_21.jpg",
  "./assets/backdrops/bd_22.jpg",
  "./assets/backdrops/bd_23.jpg",
  "./assets/backdrops/bd_24.jpg",
  "./assets/backdrops/bd_25.jpg",
  "./assets/backdrops/bd_26.jpg",
  "./assets/backdrops/bd_27.jpg",
  "./assets/backdrops/bd_28.jpg",
  "./assets/backdrops/bd_29.jpg",
  "./assets/backdrops/bd_30.jpg",
  "./assets/backdrops/bd_31.jpg",
  "./assets/backdrops/bd_32.jpg",
  "./assets/backdrops/bd_33.jpg",
  "./assets/backdrops/th_01.jpg",
  "./assets/backdrops/th_02.jpg",
  "./assets/backdrops/th_03.jpg",
  "./assets/backdrops/th_04.jpg",
  "./assets/backdrops/th_05.jpg",
  "./assets/backdrops/th_06.jpg",
  "./assets/backdrops/th_07.jpg",
  "./assets/backdrops/th_08.jpg",
  "./assets/backdrops/th_09.jpg",
  "./assets/backdrops/th_11.jpg",
  "./assets/backdrops/th_12.jpg",
  "./assets/backdrops/th_17.jpg",
  "./assets/backdrops/th_18.jpg",
  "./assets/backdrops/th_19.jpg",
  "./assets/backdrops/th_20.jpg",
  "./assets/backdrops/th_21.jpg",
  "./assets/backdrops/th_22.jpg",
  "./assets/backdrops/th_23.jpg",
  "./assets/backdrops/th_24.jpg",
  "./assets/backdrops/th_25.jpg",
  "./assets/backdrops/th_26.jpg",
  "./assets/backdrops/th_27.jpg",
  "./assets/backdrops/th_28.jpg",
  "./assets/backdrops/th_29.jpg",
  "./assets/backdrops/th_30.jpg",
  "./assets/backdrops/th_31.jpg",
  "./assets/backdrops/th_32.jpg",
  "./assets/backdrops/th_33.jpg"
];

self.addEventListener('install', e => {
  // add one by one so a single missing file never blocks the rest
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf('memento-studio-') === 0).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !/^https?:/.test(r.url)) return;
  // network first so updates show up; fall back to cache when offline
  e.respondWith(fetch(r).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('./Memento%20Studio.dc.html') : Response.error()))));
});
