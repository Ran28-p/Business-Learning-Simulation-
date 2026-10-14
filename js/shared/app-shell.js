/**
 * Portal Belajar — "app shell" bersama untuk header modul (Accounting, Excel, SQL & Power Query, SPT).
 *
 * Menyeragamkan tiga hal di header tiap modul tanpa mengubah markup/logika modul:
 *   1. Tautan "← Portal"  (menggantikan tombol melayang yang menimpa konten)
 *   2. Tombol tema        (hanya jika belum punya — Excel, Game Hub, Ruang Pengajar; memakai PortalTheme)
 *   3. Chip profil        (nama + email dari login Portal; "Tamu" bila belum login)
 *
 * Login HANYA di Portal: sesi dibaca dari localStorage "unified_portal_session" (ditulis js/auth.js).
 * Tidak ada panggilan jaringan. Hanya textContent (aman dari injeksi HTML). Idempotent.
 * Gaya: .ds-portal-link / .ds-theme-btn / .ds-profile-chip di css/design-system.css.
 */
(function () {
  'use strict';

  var ROLE_BY_APP = { accounting: 'Pelajar Akuntansi', excel: 'Pelajar Excel', sqlpq: 'Pelajar SQL & Power Query', spt: 'Pelajar Pajak', gamehub: 'Pemain Game Hub', pengajar: 'Pengajar' };
  // Tempat chip dipasang di header tiap modul (dicari berurutan; yang pertama ada dipakai).
  var HOST_SELECTORS = ['.tr-header__actions', '.gh-header__actions', '.topbar-right', '.user-stats', '.app-header__actions', '.app-header__meta', '.pd-header-actions'];

  function readJson(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }

  function resolveUser() {
    var s = readJson('unified_portal_session');
    if (s && (s.email || s.isGuest)) {
      var email = s.email || '';
      return { name: s.displayName || (email ? email.split('@')[0] : 'Tamu'), email: email };
    }
    return { name: 'Tamu', email: '' };
  }

  function build(role) {
    var chip = document.createElement('div');
    chip.className = 'ds-profile-chip';
    chip.setAttribute('data-ds-user-chip', '');
    var avatar = document.createElement('div');
    avatar.className = 'ds-profile-chip__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    var text = document.createElement('div');
    text.className = 'ds-profile-chip__text';
    var name = document.createElement('div');
    name.className = 'ds-profile-chip__name';
    var sub = document.createElement('div');
    sub.className = 'ds-profile-chip__role';
    sub.setAttribute('data-default-role', role);
    text.appendChild(name);
    text.appendChild(sub);
    chip.appendChild(avatar);
    chip.appendChild(text);
    return chip;
  }

  function paint(chip) {
    var u = resolveUser();
    var role = chip.querySelector('.ds-profile-chip__role');
    chip.querySelector('.ds-profile-chip__avatar').textContent = (u.name || '?').charAt(0).toUpperCase();
    chip.querySelector('.ds-profile-chip__name').textContent = u.name;
    role.textContent = u.email || role.getAttribute('data-default-role');
    chip.title = u.email ? u.name + ' — ' + u.email : u.name;
  }

  function portalHref() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('app-shell.js') !== -1) return src.replace(/js\/shared\/app-shell\.js(?:\?.*)?$/, 'index.html');
    }
    return '../../index.html';
  }

  function buildPortalLink() {
    var a = document.createElement('a');
    a.className = 'ds-portal-link';
    a.setAttribute('data-ds-portal-link', '');
    a.href = portalHref();
    a.setAttribute('aria-label', 'Kembali ke Portal Belajar');
    var arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '\u2190';
    var text = document.createElement('span'); text.className = 'ds-portal-link__text'; text.textContent = 'Portal';
    a.appendChild(arrow); a.appendChild(text);
    return a;
  }

  function buildThemeButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ds-theme-btn';
    b.setAttribute('data-ds-theme-btn', '');
    b.setAttribute('aria-label', 'Ganti tema terang/gelap');
    function paint() {
      var dark = window.PortalTheme && window.PortalTheme.get() === 'dark';
      b.textContent = dark ? '\u2600\uFE0F' : '\uD83C\uDF19';
      b.setAttribute('aria-pressed', String(!!dark));
    }
    b.addEventListener('click', function () { if (window.PortalTheme) window.PortalTheme.toggle(); });
    window.addEventListener('portal-theme-change', paint);
    paint();
    return b;
  }

  function mount() {
    if (document.querySelector('[data-ds-portal-link]')) return;
    var app = document.documentElement.getAttribute('data-app') || '';
    var host = null;
    for (var i = 0; i < HOST_SELECTORS.length && !host; i++) host = document.querySelector(HOST_SELECTORS[i]);
    if (!host) return;

    host.insertBefore(buildPortalLink(), host.firstChild);
    // Excel & Game Hub tidak punya tombol tema sendiri; modul lain sudah (Accounting, SQL, SPT).
    if ((app === 'excel' || app === 'gamehub' || app === 'pengajar') && window.PortalTheme) host.appendChild(buildThemeButton());
    // SPT sudah punya chip profil sendiri (#profile-name), diisi dari sesi portal di app-main.js.
    if (!document.getElementById('profile-name')) {
      var chip = build(ROLE_BY_APP[app] || 'Pelajar');
      host.appendChild(chip);
      paint(chip);
      // Sinkron kalau pengguna login/logout di tab portal lain, atau kembali ke tab ini.
      window.addEventListener('storage', function (e) {
        if (!e.key || e.key === 'unified_portal_session') paint(chip);
      });
      window.addEventListener('focus', function () { paint(chip); });
      // Lencana status sinkron cloud di samping nama (☁ tersinkron, ⚠ perlu perhatian). Hanya tampil bila sedang login.
      var badge = document.createElement('span'); badge.className = 'ds-profile-chip__sync'; badge.setAttribute('aria-hidden', 'true');
      chip.querySelector('.ds-profile-chip__name').appendChild(badge);
      window.addEventListener('portal-cloudsync', function (e) {
        var st = e.detail && e.detail.state;
        badge.textContent = st === 'ok' ? '\u2601' : (st === 'needs-choice' || st === 'error' || st === 'rules') ? '\u26A0' : '';
        var base = chip.title.split(' \u2014 sinkron')[0];
        chip.title = e.detail && st !== 'off' ? base + ' \u2014 sinkron: ' + e.detail.message : base;
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
