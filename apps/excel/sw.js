// Service Worker — Excel Formula Practice Generator
// Sama seperti apps/accounting/sw.js: precache halaman utama, lalu
// cache-as-you-go untuk file lokal (js/css/data/vendor, termasuk yang
// diambil dari pivot-dashboard/ dan dari ../../vendor/hyperformula di root
// portal — keduanya tetap same-origin jadi otomatis tercakup).

const CACHE_NAME = 'sim-excel-shell-v3-pdf'; // bumped: fix knowledge-base.js PDF (blank-page bug) + pivot-dashboard now loads js/shared/pdf-export.js

const APP_SHELL_LOCAL = [
    './',
    './index.html'
];

// Google Fonts — biarkan browser yang urus (bukan blocker fungsional kalau
// gagal load offline, cuma font fallback ke system font).
const noTouchHosts = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_LOCAL))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (noTouchHosts.some((h) => url.hostname.includes(h))) {
        return;
    }

    const isOwnOrigin = url.origin === self.location.origin;
    if (event.request.method !== 'GET' || !isOwnOrigin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
