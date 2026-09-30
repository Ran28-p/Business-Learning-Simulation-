/**
 * Register Service Worker for offline / PWA support.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (err) {
      console.warn('Service worker gagal didaftarkan (app tetap jalan normal seperti web biasa):', err);
    });
  });
}
