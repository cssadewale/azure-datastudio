/* Azure DataStudio Stimulator — Enterprise Service Worker
   Cache-first strategy for the app shell so it loads instantly
   and works fully offline after first visit.
*/
const CACHE = 'ads-ent-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/enterprise.css',
  './scripts/enterprise.js',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cache-first for our shell + same-origin assets
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Stale-while-revalidate for CDN libs (sql.js, papaparse, fonts)
  if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(req).then(hit => {
          const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(()=>hit);
          return hit || net;
        })
      )
    );
  }
});
