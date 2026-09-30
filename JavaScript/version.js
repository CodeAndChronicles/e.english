/* version.js — the ONE place the application model version lives.

   Loaded in two different worlds, which is why it touches no DOM and uses
   no module syntax:
     • the page   (<script src="JavaScript/version.js"> in index.html)
     • the service worker (importScripts('JavaScript/version.js') in sw.js)
   Both therefore derive the exact same cache name from the same string.

   To ship a new model version, change EE_MODEL_VERSION below and nothing
   else — sw.js, ux.js and the cache-migration logic all follow it, whether
   the change goes forward (6 → 7) or backward (7 → 6).

   IMPORTANT — what this number controls:
     ✔ the APP cache (Cache Storage: app shell + lesson content)
     ✘ NEVER user learning data (known words, reviews, quiz history,
       preferences). Those live under their own localStorage keys and are
       untouched by a version change. */
(function (root) {
  'use strict';
  root.EE_MODEL_VERSION = '7';
  // Every cache this app ever creates starts with this prefix, so cleanup
  // can be scoped to "our" caches and never touches anything else on the
  // same origin.
  root.EE_CACHE_PREFIX = 'e-english-';
  root.EE_CACHE_NAME = root.EE_CACHE_PREFIX + 'v' + root.EE_MODEL_VERSION;
})(typeof self !== 'undefined' ? self : this);
