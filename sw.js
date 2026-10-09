/* Dans la Lucarne : service worker (installation, ouverture sans réseau, mises à jour)
   Changer VERSION à chaque mise en ligne pour que les téléphones prennent la nouvelle version. */
const VERSION = 'lucarne-2026-10-09-v1.3';
const SHELL = ['./', './index.html', './config.js', './cards.js', './core.js', './screens.js', './recap.js', './people.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './fonts/barlow-400.woff2', './fonts/barlow-500.woff2', './fonts/barlow-600.woff2', './fonts/barlow-700.woff2', './fonts/barlow-condensed-600.woff2', './fonts/barlow-condensed-700.woff2', './fonts/barlow-condensed-800.woff2', './fonts/barlow-condensed-900.woff2', './fonts/barlow-semi-condensed-600.woff2', './fonts/barlow-semi-condensed-700.woff2', './fonts/barlow-semi-condensed-800.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'paulfut-polices').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('paulfut-polices').then(c => c.match(req).then(hit => hit ||
      fetch(req).then(r => { c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return; /* le script Google n'est jamais mis en cache */
  /* config.js : réseau d'abord (pour prendre tout de suite une nouvelle adresse de serveur) */
  if (url.pathname.endsWith('/config.js')) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })
      .catch(() => caches.match(req)));
    return;
  }
  /* le reste : copie gardée d'abord (ouverture instantanée) ; une nouvelle VERSION ci-dessus installe la mise à jour */
  e.respondWith(caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit ||
    fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })
      .catch(() => req.mode === 'navigate' ? c.match('./index.html') : undefined))));
});
