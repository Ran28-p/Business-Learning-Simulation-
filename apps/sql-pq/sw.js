// Service Worker — SQL & Power Query Learning Simulator
// Sama seperti modul lain: precache halaman utama, lalu cache-as-you-go.
// Penting untuk modul ini: vendor/sql-js/sql-wasm.wasm (file WASM SQLite)
// ikut tercache otomatis begitu dipakai pertama kali, jadi kunjungan
// berikutnya tidak perlu network untuk mengaktifkan SQL engine-nya.

const CACHE_NAME = 'sim-sqlpq-shell-v3-pdf'; // bumped: fix knowledge-base.js PDF (blank-page bug, migrated to js/shared/pdf-export.js)

const APP_SHELL_LOCAL = [
    './',
    './index.html'
];

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
