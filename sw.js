// オフラインでも起動できるようにアプリ本体をキャッシュする。
// キャッシュ優先で即起動し、裏でネットから最新版を取得して次回起動時に反映する
// （体育館などで電波が弱くても待たされない）。
const CACHE = 'judo-scorecam-v7';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const cached = await c.match(e.request, {ignoreSearch: true}) ||
      (e.request.mode === 'navigate' ? await c.match('./index.html') : undefined);
    const fresh = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (cached) { e.waitUntil(fresh.catch(() => {})); return cached; }
    return fresh;
  }));
});
