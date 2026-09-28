/* sw.js — offline-first cache for E.English.
   Strategy: precache the app shell + content on install, then serve
   cache-first with a background refresh (stale-while-revalidate) so
   edits to Files/*.md show up on the next visit. Bump CACHE_VERSION to
   force a clean re-download of everything. */
const CACHE_VERSION = 'e-english-v5';
const SHELL = [
  './', 'index.html', 'app.json', 'manifest.webmanifest',
  'CSS/root.css', 'CSS/responsive.css', 'CSS/animations.css', 'CSS/settings.css',
  'JavaScript/icons.js', 'JavaScript/ux.js', 'JavaScript/ui.js', 'JavaScript/settings.js',
  'Ui/Logo.png', 'Ui/Font.ttf'
];

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(SHELL);
    // Content files are listed in app.json — cache them too.
    try {
      const cfg = await (await fetch('app.json', { cache: 'no-store' })).json();
      await cache.addAll((cfg.files || []).map(function (f) { return 'Files/' + f; }));
    } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async function () {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(function (res) {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function () { return null; });
    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    return res || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  })());
});
