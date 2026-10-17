/**
 * cloud-sync-core.js — Inti sinkron progres ke cloud (Portal Belajar). MURNI & bisa diuji di Node:
 * tanpa DOM, tanpa Firebase, tanpa jaringan. Penyimpanan lokal dan "remote" disuntikkan.
 *
 * Yang disinkronkan (satu "unit" = satu dokumen di cloud): accounting, excel, sqlpq.
 * SPT TIDAK termasuk: Simulator SPT sudah punya sinkron cloud sendiri di users/$uid (skema & aturan berbeda).
 *
 * KEBIJAKAN MERGE — tiga arah (lokal ↔ cloud ↔ "base" = keadaan saat sinkron terakhir):
 *   • hanya lokal yang berubah  → PUSH   (termasuk reset yang disengaja: nilai lebih rendah tetap dikirim)
 *   • hanya cloud yang berubah  → PULL
 *   • dua-duanya berubah        → KONFLIK: yang lebih maju menang (XP, lalu jumlah aktivitas); seri → lokal
 *   • ganti akun di perangkat yang sama (askBeforePush) dan data lokal ada → BUTUH PILIHAN walau cloud akun baru kosong
 *   • belum pernah tersambung (base kosong) dan dua sisi punya KEMAJUAN NYATA yang berbeda → BUTUH PILIHAN pengguna
 *     (gabungkan / pakai cloud / pakai perangkat ini); tidak ada yang disentuh sebelum dipilih.
 *     Alasan: perangkat bersama atau ganti akun — data lokal bisa milik orang lain.
 * State "bawaan" (XP 0 & 0 aktivitas) yang ditulis modul saat dimuat tidak dihitung sebagai kemajuan: tidak memicu
 * pertanyaan, tidak diunggah ke cloud kosong, dan dikalahkan progres nyata di sisi lain.
 * Kenapa tiga arah, bukan "yang lebih maju selalu menang": reset progres di satu perangkat akan "dihidupkan
 * kembali" dari cloud pada sinkron berikutnya.
 *
 * KEAMANAN: dokumen cloud = input tak tepercaya. Kunci harus ada di allowlist unit, nilai berupa teks
 * ber-batas, bentuk JSON diperiksa (PortalProgress.JSON_SHAPES / inspectImport). Hash dari cloud tidak
 * dipercaya — dihitung ulang dari data.
 */
(function (global) {
  'use strict';
  if (global.CloudSyncCore) return;

  var SYNC_UNIT_IDS = ['accounting', 'excel', 'sqlpq'];
  var MAX_METRIC = 100000000;

  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function clampInt(n) { n = Math.floor(Number(n)); return isFinite(n) && n > 0 ? Math.min(n, MAX_METRIC) : 0; }

  /** Nama kunci aman untuk Firebase RTDB (tanpa . $ # [ ] /). Aturan database memeriksa pola hasilnya. */
  function encodeKey(k) { return encodeURIComponent(k).replace(/\./g, '%2E'); }
  function decodeKey(k) { try { return decodeURIComponent(k); } catch (_) { return null; } }

  /** Hash 53-bit (cyrb53) → string heksa. Deterministik; bukan kriptografis (hanya deteksi perubahan). */
  function hashStr(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    var n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return n.toString(16);
  }
  function hashData(data) {
    var keys = Object.keys(data).sort(), s = '';
    keys.forEach(function (k) { s += k.length + ':' + k + '=' + data[k].length + ':' + data[k] + ';'; });
    return hashStr(s);
  }

  function readerOf(storage) { return function (k) { try { return storage.getItem(k); } catch (_) { return null; } }; }

  /** Definisi unit dari PortalProgress (daftar kunci = sumber kebenaran yang sudah dijaga test). */
  function buildUnits(PP) {
    var units = [];
    ['accounting', 'excel', 'sqlpq'].forEach(function (id) {
      var m = PP.MODULES.filter(function (x) { return x.id === id; })[0];
      if (m) units.push({ id: id, label: m.label, keys: m.keys.slice(), kind: 'module' });
    });
    return units;
  }

  function create(deps) {
    var PP = deps.PP, storage = deps.storage;
    var now = deps.now || function () { return Date.now(); };
    var units = buildUnits(PP);
    var LIM = PP.LIMITS;

    function metricOf(unit, data) {
      var sum = PP.summarizeWith(function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; });
      var m = sum.modules.filter(function (x) { return x.id === unit.id; })[0];
      return m ? { xp: clampInt(m.xp), act: clampInt(m.activities) } : { xp: 0, act: 0 };
    }

    /** Keadaan lokal sebuah unit. */
    function readLocal(unit) {
      var read = readerOf(storage), data = {};
      unit.keys.forEach(function (k) { var v = read(k); if (typeof v === 'string') data[k] = v; });
      var mt = metricOf(unit, data);
      return { data: data, empty: Object.keys(data).length === 0, pristine: mt.xp === 0 && mt.act === 0, hash: hashData(data), xp: mt.xp, act: mt.act };
    }

    /** Validasi dokumen cloud (tak tepercaya). Kembalikan {ok, doc?|error}. */
    function validateRemote(unit, raw) {
      if (raw === null || raw === undefined) return { ok: true, doc: null };
      if (!isObj(raw)) return { ok: false, error: 'dokumen cloud bukan objek' };
      var rev = Number(raw.rev);
      if (!isFinite(rev) || rev < 0 || Math.floor(rev) !== rev) return { ok: false, error: 'rev tidak valid' };
      var rawData = raw.data === undefined || raw.data === null ? {} : raw.data;
      if (!isObj(rawData)) return { ok: false, error: 'data bukan objek' };
      var data = {}, total = 0;
      var keys = Object.keys(rawData);
      for (var i = 0; i < keys.length; i++) {
        var k = decodeKey(keys[i]);
        if (k === null || unit.keys.indexOf(k) === -1) return { ok: false, error: 'kunci tidak diizinkan: ' + keys[i] };
        var v = rawData[keys[i]];
        if (typeof v !== 'string') return { ok: false, error: 'nilai bukan teks: ' + k };
        if (v.length > LIM.perKeyChars) return { ok: false, error: 'nilai terlalu besar: ' + k };
        total += v.length;
        if (total > LIM.totalChars) return { ok: false, error: 'total data terlalu besar' };
        var shape = PP.JSON_SHAPES[k];
        if (shape) {
          var parsed; try { parsed = JSON.parse(v); } catch (_) { return { ok: false, error: 'bukan JSON valid: ' + k }; }
          if (shape === 'array' && !Array.isArray(parsed)) return { ok: false, error: 'bentuk data salah: ' + k };
          if (shape === 'object' && !isObj(parsed)) return { ok: false, error: 'bentuk data salah: ' + k };
        }
        data[k] = v;
      }
      var mt = metricOf(unit, data);
      return { ok: true, doc: { rev: rev, updatedAt: clampInt(raw.updatedAt), device: typeof raw.device === 'string' ? raw.device.slice(0, 64) : '',
        data: data, hash: hashData(data), xp: mt.xp, act: mt.act, pristine: mt.xp === 0 && mt.act === 0 } };   // hash & metrik dihitung ULANG
    }

    function advanced(a, b) { // true bila a lebih maju daripada b
      if (a.xp !== b.xp) return a.xp > b.xp;
      return a.act > b.act;
    }

    /**
     * Putuskan tindakan untuk satu unit.
     * local = readLocal(); remote = doc tervalidasi|null; base = {localHash, remoteHash}|null; choice = 'merge'|'cloud'|'local'|null
     * Hasil: { action: 'noop'|'push'|'pull'|'needs-choice', conflict?: bool, link?: bool }
     */
    function plan(local, remote, base, choice, askBeforePush) {
      // "Bawaan" (pristine) = belum ada kemajuan nyata (XP 0 dan 0 aktivitas). Modul menulis state bawaan sendiri
      // saat dimuat (mis. SQL: streak + tanggal hari ini; Accounting: data perusahaan contoh), jadi data semacam
      // itu TIDAK boleh memicu pertanyaan, TIDAK diunggah ke cloud yang kosong, dan selalu kalah dari progres nyata.
      if (!remote) {
        if (local.empty || local.pristine) return { action: 'noop' };
        // Ganti akun di perangkat yang sama: data lokal mungkin milik orang lain → jangan unggah diam-diam.
        if (askBeforePush && !choice) return { action: 'needs-choice' };
        if (askBeforePush && choice === 'cloud') return { action: 'pull-empty' };   // "pakai cloud" padahal kosong = mulai kosong
        return { action: 'push' };
      }
      if (!base) {
        if (local.empty) return { action: 'pull', link: true };
        if (local.hash === remote.hash) return { action: 'noop', link: true };
        if (local.pristine && remote.pristine) return { action: 'noop', link: true };
        if (local.pristine) return { action: 'pull', link: true };                 // perangkat baru yang sudah menulis state bawaan
        if (remote.pristine) return { action: 'push', link: true };                // cloud hanya berisi state bawaan
        if (!choice) return { action: 'needs-choice' };
        if (choice === 'cloud') return { action: 'pull', link: true };
        if (choice === 'local') return { action: 'push', link: true };
        return { action: advanced(remote, local) ? 'pull' : 'push', link: true, conflict: true };
      }
      var lc = local.hash !== base.localHash, rc = remote.hash !== base.remoteHash;
      if (!lc && !rc) return { action: 'noop' };
      if (lc && !rc) return { action: 'push' };
      if (!lc && rc) return { action: 'pull' };
      if (local.hash === remote.hash) return { action: 'noop' };            // dua sisi berubah tetapi hasilnya sama
      return { action: advanced(remote, local) ? 'pull' : 'push', conflict: true };
    }

    /** Dokumen yang dikirim ke cloud. */
    function buildRemote(unit, local, prevRev, device) {
      var data = {};
      Object.keys(local.data).forEach(function (k) { data[encodeKey(k)] = local.data[k]; });
      var doc = { rev: (prevRev || 0) + 1, updatedAt: now(), device: String(device || '').slice(0, 64), hash: local.hash, xp: local.xp, act: local.act };
      if (Object.keys(data).length) doc.data = data;
      return doc;
    }

    /** Tulis data cloud (tervalidasi) ke penyimpanan lokal secara atomik: gagal di tengah → dikembalikan. */
    function writeLocal(unit, remote) {
      var data = remote.data;
      // pemeriksaan ulang lewat jalur impor yang sudah teruji (allowlist, ukuran, bentuk)
      var probe = { version: PP.VERSION, data: data }; probe[PP.FORMAT] = true;
      var insp = PP.inspectImport(probe);
      if (Object.keys(data).length && (!insp.ok || (insp.rejectedKeys && insp.rejectedKeys.length))) {
        return { ok: false, error: 'data cloud ditolak pemeriksaan impor' };
      }
      var previous = {};
      try {
        unit.keys.forEach(function (k) {
          var old = storage.getItem(k); previous[k] = old === undefined ? null : old;
          if (Object.prototype.hasOwnProperty.call(data, k)) storage.setItem(k, data[k]); else storage.removeItem(k);
        });
      } catch (e) {
        Object.keys(previous).forEach(function (k) { try { if (previous[k] === null) storage.removeItem(k); else storage.setItem(k, previous[k]); } catch (_) { /* best effort */ } });
        return { ok: false, error: 'penyimpanan browser penuh atau tidak tersedia', rolledBack: true };
      }
      return { ok: true };
    }

    /**
     * Sinkronkan satu unit.
     * api = { get(unitId) → Promise<raw|null>, push(unitId, doc, expectedRev|null) → Promise<{ok}|{ok:false,race:true}> }
     * state = { units: { id: {localHash, remoteHash, rev} } }  (dimutasi: hanya entri unit ini)
     */
    function syncUnit(unit, api, state, opts) {
      opts = opts || {};
      var device = opts.device || '';
      var attempts = 0;
      function attempt() {
        attempts++;
        return api.get(unit.id).then(function (raw) {
          var v = validateRemote(unit, raw);
          if (!v.ok) return { id: unit.id, action: 'error', error: 'Data cloud tidak valid (' + v.error + ') — tidak diubah.', code: 'invalid-remote' };
          var remote = v.doc, local = readLocal(unit), base = state.units[unit.id] || null;
          var p = plan(local, remote, base, opts.choice || null, !!opts.askBeforePush && !base);
          var res = { id: unit.id, action: p.action, conflict: !!p.conflict };

          if (p.action === 'needs-choice') {
            res.local = { xp: local.xp, act: local.act };
            res.remote = remote ? { xp: remote.xp, act: remote.act, updatedAt: remote.updatedAt } : { xp: 0, act: 0, updatedAt: 0 };
            return res;
          }
          if (p.action === 'pull-empty') {
            var we = writeLocal(unit, { data: {} });
            if (!we.ok) return { id: unit.id, action: 'error', error: 'Gagal mengosongkan data perangkat: ' + we.error, code: 'local-write' };
            state.units[unit.id] = { localHash: readLocal(unit).hash, remoteHash: hashData({}), rev: 0 };
            return { id: unit.id, action: 'pull', conflict: false };
          }
          if (p.action === 'noop') {
            if (remote) state.units[unit.id] = { localHash: local.hash, remoteHash: remote.hash, rev: remote.rev };
            return res;
          }
          if (p.action === 'pull') {
            var w = writeLocal(unit, remote);
            if (!w.ok) return { id: unit.id, action: 'error', error: 'Gagal menerapkan data cloud: ' + w.error, code: 'local-write' };
            var after = readLocal(unit);
            state.units[unit.id] = { localHash: after.hash, remoteHash: remote.hash, rev: remote.rev };
            return res;
          }
          // push
          var doc = buildRemote(unit, local, remote ? remote.rev : 0, device);
          return api.push(unit.id, doc, remote ? remote.rev : null).then(function (r) {
            if (r && r.ok) { state.units[unit.id] = { localHash: local.hash, remoteHash: local.hash, rev: doc.rev }; return res; }
            if (r && r.race && attempts < 3) return attempt();   // perangkat lain menulis duluan → nilai ulang dari awal
            return { id: unit.id, action: 'error', error: 'Perangkat lain sedang menulis; coba lagi sebentar.', code: 'race' };
          });
        });
      }
      return attempt();
    }

    return { units: units, readLocal: readLocal, validateRemote: validateRemote, plan: plan, buildRemote: buildRemote, writeLocal: writeLocal, syncUnit: syncUnit };
  }

  global.CloudSyncCore = {
    SYNC_UNIT_IDS: SYNC_UNIT_IDS,
    encodeKey: encodeKey, decodeKey: decodeKey, hashStr: hashStr, hashData: hashData, create: create
  };
})(typeof window !== 'undefined' ? window : globalThis);
