/**
 * Portal Belajar — tema terang/gelap TERPUSAT (portal + semua modul).
 *
 * Sebelumnya tiap modul menyimpan tema di kunci sendiri ("theme" untuk SPT & Accounting,
 * "sqlpq_theme" untuk SQL, tidak ada untuk Excel) sehingga pilihan bisa saling bertentangan.
 * Modul ini membuat SATU preferensi tanpa mengubah tombol/logika bawaan tiap modul:
 *   • saat dimuat (harus dimuat DI <head>, sebelum skrip modul): menyamakan semua kunci lama
 *     ke satu nilai lalu memasang data-theme — sehingga init tiap modul membaca nilai yang sama;
 *   • memantau atribut data-theme di <html>/<body>: toggle bawaan modul mana pun otomatis
 *     disalin ke semua kunci;
 *   • mendengarkan event "storage": ganti tema di satu tab → tab/modul lain ikut berubah.
 * API: PortalTheme.get() / set("dark"|"light") / toggle(); event window "portal-theme-change".
 */
(function () {
  'use strict';
  if (window.PortalTheme) return;

  var KEYS = ['theme', 'portal_theme', 'sqlpq_theme']; // "theme" jadi acuan (dipakai bersama SPT & Accounting)
  var html = document.documentElement;
  var syncing = false;

  function valid(v) { return v === 'dark' || v === 'light' ? v : null; }
  function readStored() {
    try {
      for (var i = 0; i < KEYS.length; i++) { var v = valid(localStorage.getItem(KEYS[i])); if (v) return v; }
    } catch (_) { /* penyimpanan diblokir */ }
    return null;
  }
  function writeAll(mode) {
    try { KEYS.forEach(function (k) { if (localStorage.getItem(k) !== mode) localStorage.setItem(k, mode); }); } catch (_) { /* abaikan */ }
  }
  function current() { return html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function apply(mode) {
    syncing = true;
    var els = [html];
    // Simulator SPT membaca [data-theme] di <body> untuk aturan lamanya; pasang di keduanya.
    if (html.getAttribute('data-app') === 'spt' && document.body) els.push(document.body);
    els.forEach(function (el) { if (mode === 'dark') el.setAttribute('data-theme', 'dark'); else el.removeAttribute('data-theme'); });
    syncing = false;
    try { window.dispatchEvent(new CustomEvent('portal-theme-change', { detail: { mode: mode } })); } catch (_) { /* browser lama */ }
  }

  function set(mode) { mode = valid(mode) || 'light'; apply(mode); writeAll(mode); }

  window.PortalTheme = { get: current, set: set, toggle: function () { set(current() === 'dark' ? 'light' : 'dark'); } };

  // 1) normalisasi saat dimuat
  var stored = readStored();
  if (stored) { writeAll(stored); apply(stored); }

  // 2) toggle bawaan modul (yang hanya mengubah atribut + kunci sendiri) → salin ke semua kunci
  function isDarkNow() {
    return html.getAttribute('data-theme') === 'dark' || (document.body && document.body.getAttribute('data-theme') === 'dark');
  }
  function observe(el) {
    new MutationObserver(function () { if (!syncing) writeAll(isDarkNow() ? 'dark' : 'light'); })
      .observe(el, { attributes: true, attributeFilter: ['data-theme'] });
  }
  observe(html);
  document.addEventListener('DOMContentLoaded', function () {
    if (document.body) observe(document.body);
    if (stored && html.getAttribute('data-app') === 'spt') apply(stored); // body belum ada saat <head>
  });

  // 3) tab lain mengganti tema
  window.addEventListener('storage', function (e) {
    if (e.key && KEYS.indexOf(e.key) !== -1 && valid(e.newValue) && valid(e.newValue) !== current()) apply(valid(e.newValue));
  });
})();
