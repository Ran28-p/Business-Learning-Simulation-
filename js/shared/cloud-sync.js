/**
 * cloud-sync.js — Adapter browser untuk sinkron progres ke cloud (Firebase Realtime Database).
 * Logika keputusan ada di js/shared/cloud-sync-core.js (murni, diuji di tests/test-cloudsync.mjs).
 *
 * Dimuat di portal dan modul (Accounting, Excel, SQL & Power Query, Game Hub). Ringan untuk tamu:
 * bila TIDAK ada login portal, file ini tidak memuat apa pun (tanpa Firebase SDK, tanpa jaringan).
 * Bila ada login: memuat skrip pendukung + SDK Firebase (versi sama dengan SPT), menunggu sesi Firebase
 * (dibagi dengan portal karena origin sama), lalu menyinkronkan unit accounting/excel/sqlpq ke
 *   portalSync/<uid>/<unit>
 * SPT tidak ikut: ia punya sinkron cloud sendiri di users/<uid>.
 *
 * Kapan sinkron: saat halaman dimuat, saat kembali ke tab / online lagi, berkala bila data lokal berubah,
 * dan saat tombol "Sinkronkan sekarang" di portal. Semua kegagalan ditangkap — tidak pernah mengganggu modul.
 *
 * API: CloudSync.status() · syncNow() · resolveFirstLink('merge'|'cloud'|'local')
 * Event (window): "portal-cloudsync" dengan detail = status().
 */
(function () {
  'use strict';
  if (window.CloudSync) return;

  var STATE_KEY = 'cloudsync_v1', DEVICE_KEY = 'cloudsync_device_v1', SESSION_KEY = 'unified_portal_session';
  var SDK = 'https://www.gstatic.com/firebasejs/9.6.1/';
  var OP_TIMEOUT_MS = 15000, AUTH_TIMEOUT_MS = 10000, PERIODIC_MS = 90000, FORCE_EVERY_MS = 300000, DEBOUNCE_MS = 4000;

  // Folder akar situs, diturunkan dari lokasi file ini (…/js/shared/cloud-sync.js) → dipakai memuat skrip lain.
  var ROOT = (function () {
    var s = document.currentScript && document.currentScript.src;
    if (!s) { var all = document.getElementsByTagName('script'); for (var i = all.length - 1; i >= 0; i--) if ((all[i].src || '').indexOf('cloud-sync.js') !== -1) { s = all[i].src; break; } }
    return s ? s.replace(/js\/shared\/cloud-sync\.js(?:\?.*)?$/, '') : './';
  })();

  var S = { state: 'off', message: 'Masuk di Portal untuk menyimpan progres di cloud.', lastSyncAt: null, pending: null, pulled: [], conflicts: [], error: null };
  var core = null, api = null, uid = null, readyEmail = null, bound = false, running = null, pendingChoice = null, timers = {};

  function emit() { try { window.dispatchEvent(new CustomEvent('portal-cloudsync', { detail: status() })); } catch (_) { /* browser lama */ } }
  function status() { return JSON.parse(JSON.stringify(S)); }
  function set(state, message, extra) {
    S.state = state; S.message = message;
    if (extra) for (var k in extra) S[k] = extra[k];
    emit();
  }

  /* ───────── penyimpanan state sinkron ───────── */
  function loadState() {
    try { var o = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); if (o && typeof o === 'object' && o.units && typeof o.units === 'object') return o; } catch (_) { /* rusak */ }
    return { uid: null, units: {}, lastSyncAt: null };
  }
  function saveState(st) { try { localStorage.setItem(STATE_KEY, JSON.stringify(st)); } catch (_) { /* penuh/diblokir */ } }
  function deviceId() {
    try {
      var d = localStorage.getItem(DEVICE_KEY);
      if (!d) { d = 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); localStorage.setItem(DEVICE_KEY, d); }
      return d;
    } catch (_) { return 'unknown'; }
  }
  function session() {
    try { var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return s && s.email && !s.isGuest ? s : null; } catch (_) { return null; }
  }

  /* ───────── muat skrip ───────── */
  var loaded = {};
  function loadScript(url) {
    if (loaded[url]) return loaded[url];
    loaded[url] = new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = url; el.async = false;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('gagal memuat ' + url)); };
      document.head.appendChild(el);
    });
    return loaded[url];
  }
  function ensureLocalDeps() {
    var chain = Promise.resolve();
    [['PortalProgress', 'js/shared/progress-aggregator.js'], ['CloudSyncCore', 'js/shared/cloud-sync-core.js'], ['PORTAL_FIREBASE_CONFIG', 'js/shared/firebase-config.js']].forEach(function (d) {
      chain = chain.then(function () { return window[d[0]] ? null : loadScript(ROOT + d[1]); });
    });
    return chain;
  }
  function ensureFirebase() {
    var chain = Promise.resolve();
    [['app', 'firebase-app-compat.js'], ['auth', 'firebase-auth-compat.js'], ['database', 'firebase-database-compat.js']].forEach(function (p) {
      chain = chain.then(function () {
        var have = window.firebase && (p[0] === 'app' ? true : typeof window.firebase[p[0]] === 'function');
        return have ? null : loadScript(SDK + p[1]);
      });
    });
    return chain.then(function () {
      if (!window.firebase) throw new Error('Firebase SDK tidak tersedia');
      if (!firebase.apps.length) firebase.initializeApp(window.PORTAL_FIREBASE_CONFIG);
    });
  }

  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { var e = new Error('timeout: ' + label); e.code = 'timeout'; reject(e); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function waitForUser() {
    return withTimeout(new Promise(function (resolve) {
      var off = firebase.auth().onAuthStateChanged(function (u) { off(); resolve(u); });
    }), AUTH_TIMEOUT_MS, 'auth');
  }

  /* ───────── kontrak adapter (get / push) di atas RTDB ───────── */
  function makeApi(db, userId) {
    var ref = function (unitId) { return db.ref('portalSync/' + userId + '/' + unitId); };
    return {
      get: function (unitId) {
        return withTimeout(ref(unitId).once('value'), OP_TIMEOUT_MS, 'baca ' + unitId).then(function (snap) { return snap.val(); });
      },
      push: function (unitId, doc, expectedRev) {
        // Transaksi: hanya menulis bila rev di server masih sama dengan yang kita nilai (tidak menimpa perangkat lain).
        // Panggilan pertama bisa menerima null (cache lokal kosong) → tetap kembalikan dokumen agar Firebase
        // mengulang fungsi dengan nilai server yang sebenarnya.
        return withTimeout(ref(unitId).transaction(function (cur) {
          if (cur === null || cur === undefined) return doc;
          return cur.rev === expectedRev ? doc : undefined;
        }, undefined, false), OP_TIMEOUT_MS, 'tulis ' + unitId).then(function (r) {
          return r.committed ? { ok: true } : { ok: false, race: true };
        });
      }
    };
  }

  function classify(err) {
    var code = err && (err.code || ''), msg = String(err && err.message || err || '');
    if (/permission[_ -]?denied/i.test(code + ' ' + msg)) return 'rules';
    if (code === 'timeout' || /network|offline|unavailable|disconnected|failed to fetch|gagal memuat/i.test(code + ' ' + msg) || (navigator.onLine === false)) return 'offline';
    return 'error';
  }

  /* ───────── inisialisasi ───────── */
  function ensureReady() {
    var cur = session();
    if (core && api && cur && cur.email === readyEmail) return Promise.resolve(true);
    core = null; api = null; uid = null; readyEmail = null;       // akun berganti / logout → bangun ulang
    return ensureLocalDeps().then(ensureFirebase).then(waitForUser).then(function (user) {
      var sess = session();
      if (!user || user.isAnonymous || !user.email || !sess || sess.email !== user.email) { return false; }
      uid = user.uid; readyEmail = sess.email;
      core = window.CloudSyncCore.create({ PP: window.PortalProgress, storage: window.localStorage });
      api = makeApi(firebase.database(), uid);
      return true;
    });
  }

  function summarizeResults(results) {
    var out = { pulled: [], pushed: [], conflicts: [], needs: [], errors: [] };
    Object.keys(results).forEach(function (id) {
      var r = results[id];
      if (r.action === 'pull') out.pulled.push(id);
      if (r.action === 'push') out.pushed.push(id);
      if (r.conflict) out.conflicts.push(id);
      if (r.action === 'needs-choice') out.needs.push({ id: id, local: r.local, remote: r.remote });
      if (r.action === 'error' || r.action === 'exception') out.errors.push(r);
    });
    return out;
  }

  function doSync(reason) {
    if (!session()) { set('off', 'Masuk di Portal untuk menyimpan progres di cloud.', { pending: null }); return Promise.resolve(status()); }
    set('syncing', 'Menyinkronkan…');
    return ensureReady().then(function (ok) {
      if (!ok) { set('off', 'Masuk di Portal untuk menyimpan progres di cloud.', { pending: null }); return status(); }
      var st = loadState();
      var switched = !!st.uid && st.uid !== uid;                                       // akun lain pernah dipakai di perangkat ini
      if (st.uid !== uid) { st = { uid: uid, units: {}, lastSyncAt: null }; }       // akun berbeda → tautan pertama lagi
      var choice = pendingChoice; pendingChoice = null;
      var results = {}, chain = Promise.resolve();
      core.units.forEach(function (unit) {
        chain = chain.then(function () {
          return core.syncUnit(unit, api, st, { device: deviceId(), choice: choice, askBeforePush: switched }).then(function (r) { results[unit.id] = r; },
            function (e) { results[unit.id] = { id: unit.id, action: 'exception', error: String(e && e.message || e), kind: classify(e) }; });
        });
      });
      return chain.then(function () {
        var sum = summarizeResults(results);
        var allBad = sum.errors.length && sum.errors.every(function (e) { return e.action === 'exception'; });
        if (!sum.errors.length || !allBad) { st.lastSyncAt = Date.now(); }
        saveState(st);
        if (sum.needs.length) { set('needs-choice', 'Data di perangkat ini dan di cloud berbeda — pilih cara menggabungkan.', { pending: sum.needs, pulled: sum.pulled, conflicts: sum.conflicts }); return status(); }
        if (sum.errors.length) {
          var kinds = sum.errors.map(function (e) { return e.kind || (e.code === 'invalid-remote' || e.code === 'local-write' ? 'error' : classify(e)); });
          var kind = kinds.indexOf('rules') !== -1 ? 'rules' : kinds.indexOf('offline') !== -1 ? 'offline' : 'error';
          var msg = kind === 'rules' ? 'Aturan Firebase belum diperbarui (cabang portalSync). Hubungi admin; progres tetap aman di perangkat ini.'
            : kind === 'offline' ? 'Offline — akan dicoba lagi otomatis.' : 'Sinkron sebagian gagal: ' + sum.errors[0].error;
          set(kind, msg, { error: sum.errors[0].error, pulled: sum.pulled, conflicts: sum.conflicts, pending: null });
          return status();
        }
        S.lastSyncAt = st.lastSyncAt;
        set('ok', 'Tersinkron ' + new Date(st.lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '.', { pending: null, pulled: sum.pulled, conflicts: sum.conflicts, error: null });
        if (sum.pulled.length) notifyPulled();
        return status();
      });
    }).catch(function (e) {
      var kind = classify(e);
      set(kind, kind === 'offline' ? 'Offline — akan dicoba lagi otomatis.' : 'Sinkron gagal: ' + String(e && e.message || e), { error: String(e && e.message || e), pending: null });
      return status();
    });
  }

  /** Satu sinkron pada satu waktu; permintaan yang datang saat berjalan digabung ke satu putaran lanjutan. */
  function syncNow(reason) {
    if (running) { running = running.then(function () { return doSync(reason); }); return running; }
    running = doSync(reason).then(function (r) { running = null; return r; }, function (e) { running = null; throw e; });
    return running;
  }

  /* ───────── notifikasi: data cloud diterapkan ke penyimpanan lokal ───────── */
  // Modul menyimpan state di memori; setelah pull, tampilan baru ikut berubah bila halaman dimuat ulang.
  // Portal merender ulang sendiri (mendengarkan event); modul lain menampilkan bilah kecil.
  function notifyPulled() {
    var app = document.documentElement.getAttribute('data-app') || '';
    if (!app) return;
    if (document.getElementById('ds-cloud-notice')) return;
    var bar = document.createElement('div');
    bar.id = 'ds-cloud-notice'; bar.className = 'ds-cloud-notice'; bar.setAttribute('role', 'status');
    var t = document.createElement('span'); t.textContent = 'Progres terbaru dari cloud sudah diterapkan di perangkat ini.';
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Muat ulang'; b.addEventListener('click', function () { location.reload(); });
    var x = document.createElement('button'); x.type = 'button'; x.className = 'ds-cloud-notice__close'; x.setAttribute('aria-label', 'Tutup'); x.textContent = '×'; x.addEventListener('click', function () { bar.remove(); });
    bar.appendChild(t); bar.appendChild(b); bar.appendChild(x);
    document.body.appendChild(bar);
  }

  /* ───────── pemicu ───────── */
  function localFingerprint() {
    if (!core) return null;
    return core.units.map(function (u) { return core.readLocal(u).hash; }).join('|');
  }
  var lastFingerprint = null;
  function maybeSync(force) {
    if (document.hidden && !force) return;
    if (!session()) { if (S.state !== 'off') set('off', 'Masuk di Portal untuk menyimpan progres di cloud.', { pending: null }); return; }
    var fp = localFingerprint();
    var stale = !S.lastSyncAt || Date.now() - S.lastSyncAt > FORCE_EVERY_MS;
    if (force || stale || fp !== lastFingerprint) { lastFingerprint = fp; syncNow('periodic'); }
  }
  function debounced() { clearTimeout(timers.d); timers.d = setTimeout(function () { maybeSync(true); }, DEBOUNCE_MS); }

  function bind() {
    if (bound) return; bound = true;
    document.addEventListener('visibilitychange', function () { if (!document.hidden) maybeSync(true); else if (session()) syncNow('hide'); });
    window.addEventListener('online', function () { maybeSync(true); });
    window.addEventListener('pagehide', function () { if (session() && core) syncNow('pagehide'); });
    window.addEventListener('storage', function (e) { if (e.key === SESSION_KEY) { debounced(); } else if (e.key && core && core.units.some(function (u) { return u.keys.indexOf(e.key) !== -1; })) debounced(); });
    timers.p = setInterval(function () { maybeSync(false); }, PERIODIC_MS);
  }

  function start() {
    if (!session()) { emit(); return; }                // tamu: tidak memuat apa pun, tidak ada jaringan
    bind();
    setTimeout(function () { syncNow('load').then(function () { lastFingerprint = localFingerprint(); }); }, 1200);
  }

  window.CloudSync = {
    status: status,
    syncNow: function () { return syncNow('manual'); },
    resolveFirstLink: function (choice) {
      if (choice !== 'merge' && choice !== 'cloud' && choice !== 'local') return Promise.resolve(status());
      pendingChoice = choice; return syncNow('choice');
    },
    // Dipanggil portal setelah login/logout agar status segera menyesuaikan.
    refreshSession: function () { if (session()) { bind(); return syncNow('login'); } core = null; api = null; readyEmail = null; set('off', 'Masuk di Portal untuk menyimpan progres di cloud.', { pending: null }); return Promise.resolve(status()); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
