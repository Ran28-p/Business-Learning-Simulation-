// Service Worker — Simulator Akuntansi
// Tujuan: modul ini bisa dibuka lagi tanpa koneksi setelah kunjungan pertama.
// Strategi: precache halaman utama, lalu cache-as-you-go untuk file lokal
// lain yang diminta (css/js/data) — jadi tidak perlu daftar file manual yang
// gampang basi tiap kali ada file baru ditambahkan.

const CACHE_NAME = 'sim-accounting-shell-v2-pdf'; // bumped: index.html no longer loads html2pdf from CDN

const APP_SHELL_LOCAL = [
    './',
    './index.html'
];

// CDN eksternal yang MASIH dipakai modul ini untuk fitur non-kritis
// (confetti, intro.js onboarding tour) — TIDAK di-cache/di-intercept oleh
// SW ini, biarkan browser yang urus (browser HTTP cache biasa). Fitur
// kritis (PDF/export) TIDAK lagi bergantung pada CDN: html2pdf sekarang
// dimuat dari js/shared/pdf-export.js -> vendor/html2pdf/ (same-origin),
// jadi otomatis ikut ter-cache oleh strategi cache-as-you-go di bawah.
const noTouchHosts = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

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
