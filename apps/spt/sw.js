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

// Versi cache: NAIKKAN ANGKA INI (v11 → v12, dst.) setiap kali APP_SHELL_LOCAL atau
// strategi fetch di bawah berubah, supaya klien lama otomatis buang cache lama dan
// tidak nyangkut di versi basi. Riwayat singkat (bukan changelog penuh, cukup penanda):
//   v10 — cache shell dasar (index, manifest, ikon) + scrollbar transparan
//   v11 — tambah semua halaman entri sub-modul ke precache install supaya app benar-benar
//         bisa dibuka offline sejak pertama kali install, bukan baru ter-cache setelah
//         user pernah online membuka modul tersebut satu kali
const CACHE_NAME = 'sim-spt-shell-v11';

// File dari domain sendiri — wajib berhasil di-cache saat install.
const APP_SHELL_LOCAL = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-512-maskable.png',
    // Halaman entri tiap sub-modul, supaya offline-first sungguhan sejak install pertama
    // (sebelumnya baru ter-cache setelah user online membuka modul itu sekali).
    './modul_pajak/index.html',
    './tax_career/index.html',
    './faktur_bupot/index.html',
    './formulir_spt/1771_induk.html',
    './formulir_spt/1771_Lampiran_I.html',
    './formulir_spt/1771_Lampiran_II.html',
    './formulir_spt/1771_Lampiran_III.html',
    './formulir_spt/1771_Lampiran_IV.html'
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
