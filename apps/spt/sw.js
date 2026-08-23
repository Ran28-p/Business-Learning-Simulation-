// Service Worker — Simulator Latihan SPT Pajak Indonesia
// Tujuan: bikin app bisa di-"Install" (PWA) dan tetap bisa dibuka (app shell) walau koneksi lemot/putus.
//
// PENTING — apa yang SENGAJA TIDAK disentuh service worker ini:
// 1. API Realtime Database Firebase (data XP/skor/riwayat) → harus selalu real-time dari jaringan.
// 2. Firebase Auth API (googleapis / identitytoolkit) → harus real-time.
// 3. SDK Firebase di gstatic.com (firebase-app / auth / database-compat.js) → TIDAK di-cache /
//    TIDAK di-intercept. Browser memuat script langsung dari CDN supaya `typeof firebase`
//    stabil "object" dan login email tidak bolak-balik gagal.
// 4. Feed berita eksternal (rss2json, dll.).
//
// Hanya app shell lokal (HTML, manifest, ikon) yang di-cache untuk PWA / offline shell.

const CACHE_NAME = 'sim-spt-shell-v6-pdf'; // bumped: fix knowledge-base.js PDF (blank-page bug, migrated to js/shared/pdf-export.js)

// File dari domain sendiri — wajib berhasil di-cache saat install.
const APP_SHELL_LOCAL = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-512-maskable.png'
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

    // Host yang TIDAK BOLEH di-intercept sama sekali (biarkan browser → network).
    // Termasuk seluruh gstatic.com agar SDK Firebase selalu load normal (bukan lewat SW).
    const noTouchHosts = [
        'firebaseio.com',
        'firebasedatabase.app',
        'googleapis.com',
        'gstatic.com',
        'rss2json.com'
    ];
    if (noTouchHosts.some((h) => url.hostname.includes(h))) {
        return;
    }

    // Hanya tangani GET untuk resource same-origin (app shell).
    const isOwnOrigin = url.origin === self.location.origin;
    if (event.request.method !== 'GET' || !isOwnOrigin) {
        return;
    }

    // JS/CSS shared (knowledge-base, dll.): SELALU network-first agar update PDF engine tidak tertahan cache.
    const isScriptOrStyle =
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.includes('/js/') ||
        url.pathname.includes('/css/');

    if (isScriptOrStyle) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // App shell lain: cache-first + stale-while-revalidate.
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
