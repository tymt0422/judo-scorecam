// オフラインでも起動できるようにアプリ本体をキャッシュする。
// ページ本体（index.html）はネット優先：つながっていれば常に最新版を表示し、
// 電波がない・3秒以内に応答がないときだけ保存しておいた版で起動する（体育館などでも待たされない）。
// アイコンなどその他のファイルはキャッシュ優先で、裏で最新版に更新する。
const CACHE = 'judo-scorecam-v41';
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
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const isPage = req.mode === 'navigate' || /\/(index\.html)?(\?.*)?$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(CACHE).then(async c => {
    if (isPage) {
      const net = fetch(req, {cache: 'no-store'}).then(r => { if (r.ok) c.put('./index.html', r.clone()); return r; });
      const timeout = new Promise(res => setTimeout(res, 3000));
      const r = await Promise.race([net.catch(() => null), timeout]);
      if (r) return r;
      const cached = await c.match('./index.html');
      if (cached) { e.waitUntil(net.catch(() => {})); return cached; }
      return net;
    }
    const cached = await c.match(req, {ignoreSearch: true});
    const fresh = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
    if (cached) { e.waitUntil(fresh.catch(() => {})); return cached; }
    return fresh;
  }));
});
