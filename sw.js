// Service Worker — Portal Belajar (root hub)
// Tujuan: hub (login + pemilihan modul) tetap bisa dibuka offline setelah
// kunjungan pertama. Mengikuti pola yang sama dengan apps/spt/sw.js.
//
// SENGAJA TIDAK disentuh:
// 1. Firebase Auth (identitytoolkit/googleapis) & SDK di gstatic.com →
//    harus selalu real-time supaya login email-link tidak gagal.
// 2. Apapun di bawah ./apps/ → tiap modul punya service worker sendiri
//    dengan scope masing-masing; root SW ini hanya menjaga shell hub.

const CACHE_NAME = 'portal-shell-v14-gamehub-quiz'; // bumped: csv-utils.js baru (tag <script> baru di game-hub & pengajar); folder game-hub/live dihapus

const APP_SHELL_LOCAL = [
    './',
    './index.html',
    './css/design-system.css',
    './css/portal.css',
    './css/knowledge-base.css',
    './css/responsive-foundation.css',
    './js/shared/firebase-config.js',
    './js/shared/theme.js',
    './js/shared/cloud-sync-core.js',
    './js/shared/cloud-sync.js',
    './js/shared/learning-analytics.js',
    './js/portal-analytics.js',
    './js/auth.js',
    './js/portal.js',
    './js/back-to-portal.js',
    './js/portal-progress.js',
    './js/shared/progress-aggregator.js',
    './js/shared/paper-config.js',
    './js/shared/pdf-export.js',
    './js/knowledge-base.js',
    './apps/spt/icons/favicon-32.png'
];

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

    // Host yang tidak boleh di-intercept sama sekali.
    const noTouchHosts = ['firebaseio.com', 'firebasedatabase.app', 'googleapis.com', 'gstatic.com'];
    if (noTouchHosts.some((h) => url.hostname.includes(h))) {
        return;
    }

    // Biarkan tiap modul di apps/* diurus oleh service worker-nya sendiri.
    if (url.pathname.includes('/apps/')) {
        return;
    }

    const isOwnOrigin = url.origin === self.location.origin;
    if (event.request.method !== 'GET' || !isOwnOrigin) {
        return;
    }

    // Cache-first + stale-while-revalidate, khusus shell hub.
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
