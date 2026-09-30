/* sw.js — offline-first cache for E.English, version-aware.

   The cache name comes from JavaScript/version.js (the single source of
   truth for the model version), so this file never hard-codes a version.
   Ship a new model version by editing version.js only — going forward
   (6 → 7) or backward (7 → 6) works the same way, because the browser
   also re-checks scripts pulled in with importScripts and installs a new
   worker whenever version.js changes.

   Scope: this worker only ever touches Cache Storage entries whose name
   starts with EE_CACHE_PREFIX. It never touches localStorage / IndexedDB,
   so user learning data is out of its reach by construction. */
importScripts('JavaScript/version.js');

const CACHE_NAME = self.EE_CACHE_NAME;       // e.g. "e-english-v6"
const CACHE_PREFIX = self.EE_CACHE_PREFIX;   // "e-english-"

const SHELL = [
  './', 'index.html', 'app.json', 'README.md', 'manifest.webmanifest',
  'CSS/root.css', 'CSS/responsive.css', 'CSS/animations.css', 'CSS/settings.css',
  'JavaScript/version.js', 'JavaScript/icons.js', 'JavaScript/ux.js', 'JavaScript/ui.js', 'JavaScript/settings.js', 'JavaScript/readme.js',
  'Ui/Logo.png', 'Ui/Font.ttf'
];

// Precache with cache:'reload' so the new version's cache is filled from the
// network, never from the browser's HTTP cache (which could still hold the
// previous version's files).
function fresh(url) { return new Request(url, { cache: 'reload' }); }

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL.map(fresh));
    // Content files are listed in app.json — cache them too.
    try {
      const cfg = await (await fetch(fresh('app.json'))).json();
      await cache.addAll((cfg.files || []).map(function (f) { return fresh('Files/' + f); }));
    } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    // Only OUR caches, and only the ones that belong to another version.
    const stale = keys.filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME; });
    await Promise.all(stale.map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
    // A real version transition happened: tell open pages so they can
    // reload onto the new files (pages decide when — never mid-quiz).
    if (stale.length) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(function (c) {
        c.postMessage({ type: 'EE_CACHE_ACTIVATED', version: self.EE_MODEL_VERSION, cache: CACHE_NAME });
      });
    }
  })());
});

// Stale-while-revalidate inside the CURRENT version's cache only.
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async function () {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function () { return null; });
    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    return res || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  })());
});
