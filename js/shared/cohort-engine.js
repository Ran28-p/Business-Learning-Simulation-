/**
 * cohort-engine.js — Mesin "Ruang Pengajar": memvalidasi berkas rekap peserta, merangkum kelompok, dan
 * membuat CSV. MURNI (tanpa DOM, tanpa jaringan). Dipakai halaman apps/pengajar/ yang berjalan SEPENUHNYA di
 * browser pengajar: berkas rekap dipilih dari komputer, tidak pernah diunggah, tidak disimpan.
 *
 * Model privasi: peserta sendiri yang memutuskan membagikan rekap (js/shared/learning-analytics.js → buildRecap).
 * Pengajar tidak mendapat akses ke akun/cloud siapa pun, jadi tidak ada peran akses di server untuk disalahgunakan.
 *
 * Berkas rekap = INPUT TAK TEPERCAYA (bisa dibuat/diubah siapa saja): format, tipe, rentang angka, dan panjang teks
 * dipaksa; field asing dibuang; nama dirender sebagai teks (bukan HTML); sel CSV dinetralkan dari injeksi rumus.
 *
 * API: CohortEngine.parseRecap(text, now) → {ok, recap|error} · dedupe(list) · aggregate(list, now) · toCsv(rows)
 */
(function (global) {
  'use strict';
  if (global.CohortEngine) return;

  var FORMAT = 'portal-belajar-rekap', VERSION = 1;
  var MODULES = ['spt', 'accounting', 'excel', 'sqlpq'];
  var LABEL = { spt: 'Simulator SPT Pajak', accounting: 'Accounting Simulator', excel: 'Excel Formula Practice', sqlpq: 'SQL & Power Query' };
  var MAX_BYTES = 100000, DAY = 86400000, INACTIVE_DAYS = 7, STRUGGLING_BELOW = 60, STRUGGLING_MIN_ACT = 5;
  var MIN_DATE = Date.UTC(2000, 0, 1);

  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function int(v, max) { var n = Math.floor(Number(v)); return isFinite(n) && n > 0 ? Math.min(n, max) : 0; }
  function text(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''; }
  function dateMs(v, now) {
    if (typeof v !== 'string') return null;
    var t = Date.parse(v);
    return isFinite(t) && t >= MIN_DATE && t <= now + DAY ? t : null;      // tanggal masa depan jauh = tidak masuk akal
  }

  /** Validasi + normalisasi satu berkas rekap. Mengembalikan objek BARU (tidak menyalin field asing). */
  function validate(obj, nowMs) {
    if (!isObj(obj)) return { ok: false, error: 'isi berkas bukan objek JSON' };
    if (obj.format !== FORMAT) return { ok: false, error: 'bukan berkas rekap Portal Belajar' };
    if (obj.version !== VERSION) return { ok: false, error: 'versi rekap tidak didukung (' + text(String(obj.version), 10) + ')' };
    var created = dateMs(obj.createdAt, nowMs);
    if (created === null) return { ok: false, error: 'tanggal pembuatan rekap tidak valid' };
    if (!isObj(obj.participant)) return { ok: false, error: 'data peserta tidak ada' };
    var name = text(obj.participant.name, 60);
    if (!name) return { ok: false, error: 'nama peserta kosong' };
    var rec = { createdAt: new Date(created).toISOString(), name: name, email: '', modules: [], weak: [], hub: null };
    var em = text(obj.participant.email, 100);
    if (em && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(em)) rec.email = em;

    if (!Array.isArray(obj.modules) || obj.modules.length > MODULES.length) return { ok: false, error: 'daftar modul tidak valid' };
    var seen = {};
    for (var i = 0; i < obj.modules.length; i++) {
      var m = obj.modules[i];
      if (!isObj(m) || MODULES.indexOf(m.id) === -1) return { ok: false, error: 'modul tidak dikenal' };
      if (seen[m.id]) return { ok: false, error: 'modul ganda: ' + m.id };
      seen[m.id] = true;
      var la = m.lastActive === null || m.lastActive === undefined ? null : dateMs(m.lastActive, nowMs);
      var sp = m.scorePct === null || m.scorePct === undefined ? null : (typeof m.scorePct === 'number' && isFinite(m.scorePct) ? Math.max(0, Math.min(100, Math.round(m.scorePct))) : null);
      rec.modules.push({ id: m.id, label: LABEL[m.id], xp: int(m.xp, 100000000), level: Math.max(1, int(m.level, 1000)), activities: int(m.activities, 10000000),
        scorePct: sp, started: m.started === true, lastActive: la });
    }
    if (obj.weak !== undefined) {
      if (!Array.isArray(obj.weak)) return { ok: false, error: 'daftar topik lemah tidak valid' };
      obj.weak.slice(0, 12).forEach(function (w) {
        if (!isObj(w) || MODULES.indexOf(w.moduleId) === -1) return;
        var label = text(w.label, 80); if (!label) return;
        rec.weak.push({ moduleId: w.moduleId, label: label, detail: text(w.detail, 120), priority: Math.max(0, Math.min(100, Math.round(Number(w.priority) || 0))) });
      });
    }
    if (isObj(obj.hub)) rec.hub = { level: Math.max(1, int(obj.hub.level, 99)), totalXp: int(obj.hub.totalXp, 100000000), streak: int(obj.hub.streak, 100000) };
    return { ok: true, recap: rec };
  }

  function parseRecap(textInput, now) {
    var nowMs = now instanceof Date ? now.getTime() : Date.now();
    if (typeof textInput !== 'string') return { ok: false, error: 'berkas tidak terbaca' };
    if (textInput.length > MAX_BYTES) return { ok: false, error: 'berkas terlalu besar (maksimal 100 KB)' };
    var obj;
    try { obj = JSON.parse(textInput.charCodeAt(0) === 0xFEFF ? textInput.slice(1) : textInput); } catch (_) { return { ok: false, error: 'bukan JSON yang valid' }; }
    return validate(obj, nowMs);
  }

  /** Satu peserta = nama + email (huruf kecil). Rekap yang lebih baru menggantikan yang lama. */
  function dedupe(list) {
    var map = {}, order = [], replaced = 0;
    list.forEach(function (r) {
      var k = r.name.toLowerCase() + '|' + r.email.toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(map, k)) { map[k] = r; order.push(k); return; }
      replaced++;
      if (Date.parse(r.createdAt) >= Date.parse(map[k].createdAt)) map[k] = r;
    });
    return { list: order.map(function (k) { return map[k]; }), replaced: replaced };
  }

  function median(arr) {
    if (!arr.length) return 0;
    var s = arr.slice().sort(function (a, b) { return a - b; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  }

  function aggregate(list, now) {
    var nowMs = now instanceof Date ? now.getTime() : Date.now();
    var rows = list.map(function (r) {
      var xpBy = { spt: 0, accounting: 0, excel: 0, sqlpq: 0 };
      var totalXp = 0, acts = 0, started = 0, wsum = 0, wact = 0, last = null;
      r.modules.forEach(function (m) {
        xpBy[m.id] = m.xp; totalXp += m.xp; acts += m.activities; if (m.started) started++;
        if (m.scorePct !== null && m.activities > 0) { wsum += m.scorePct * m.activities; wact += m.activities; }
        if (m.lastActive !== null && (last === null || m.lastActive > last)) last = m.lastActive;
      });
      var avg = wact ? Math.round(wsum / wact) : null;
      var days = last === null ? null : Math.max(0, Math.floor((nowMs - last) / DAY));
      var inactive = last === null || days > INACTIVE_DAYS;
      var struggling = avg !== null && avg < STRUGGLING_BELOW && acts >= STRUGGLING_MIN_ACT;
      return { name: r.name, email: r.email, createdAt: r.createdAt, totalXp: totalXp, xpBy: xpBy, startedModules: started, activities: acts, avgScore: avg,
        lastActive: last, daysInactive: days, hubLevel: r.hub ? r.hub.level : null, inactive: inactive, struggling: struggling,
        weakest: r.weak[0] ? r.weak[0].label + ' (' + LABEL[r.weak[0].moduleId] + ')' : '', weak: r.weak, modules: r.modules };
    });

    var perModule = {};
    MODULES.forEach(function (id) {
      var st = rows.filter(function (x) { return x.modules.some(function (m) { return m.id === id && m.started; }); });
      var ws = 0, wa = 0, xpSum = 0;
      st.forEach(function (x) { var m = x.modules.filter(function (q) { return q.id === id; })[0]; xpSum += m.xp; if (m.scorePct !== null && m.activities > 0) { ws += m.scorePct * m.activities; wa += m.activities; } });
      perModule[id] = { id: id, label: LABEL[id], started: st.length, avgScore: wa ? Math.round(ws / wa) : null, avgXp: st.length ? Math.round(xpSum / st.length) : 0 };
    });

    var wk = {};
    rows.forEach(function (x) {
      var seen = {};
      x.weak.forEach(function (w) {
        var k = w.moduleId + '|' + w.label; if (seen[k]) return; seen[k] = true;
        var e = wk[k] || (wk[k] = { moduleId: w.moduleId, moduleLabel: LABEL[w.moduleId], label: w.label, people: 0, prioritySum: 0 });
        e.people++; e.prioritySum += w.priority;
      });
    });
    var topWeak = Object.keys(wk).map(function (k) { var e = wk[k]; return { moduleId: e.moduleId, moduleLabel: e.moduleLabel, label: e.label, people: e.people, avgPriority: Math.round(e.prioritySum / e.people) }; })
      .sort(function (a, b) { return (b.people - a.people) || (b.avgPriority - a.avgPriority) || (a.label < b.label ? -1 : 1); }).slice(0, 10);

    var xps = rows.map(function (x) { return x.totalXp; });
    var scored = rows.filter(function (x) { return x.avgScore !== null; });
    return {
      rows: rows,
      cohort: {
        count: rows.length,
        avgXp: rows.length ? Math.round(xps.reduce(function (a, b) { return a + b; }, 0) / rows.length) : 0,
        medianXp: median(xps),
        avgScore: scored.length ? Math.round(scored.reduce(function (a, x) { return a + x.avgScore; }, 0) / scored.length) : null,
        active: rows.filter(function (x) { return !x.inactive; }).length,
        inactive: rows.filter(function (x) { return x.inactive; }).length,
        struggling: rows.filter(function (x) { return x.struggling; }).length
      },
      perModule: perModule, topWeak: topWeak
    };
  }

  /** Netralkan injeksi rumus (CSV injection): sel berawalan = + - @ tab CR diberi apostrof di depannya. */
  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function toCsv(rows) {
    var head = ['Nama', 'Email', 'Total XP', 'Modul dimulai', 'Aktivitas', 'Skor rata-rata (%)', 'Terakhir aktif', 'Hari tidak aktif', 'Level Game Hub', 'Status',
      'Topik terlemah', 'XP SPT', 'XP Accounting', 'XP Excel', 'XP SQL & Power Query', 'Rekap dibuat'];
    var lines = [head.map(csvCell).join(',')];
    rows.forEach(function (r) {
      var status = r.struggling ? 'Perlu perhatian' : r.inactive ? 'Tidak aktif' : 'Aktif';
      lines.push([r.name, r.email, r.totalXp, r.startedModules, r.activities, r.avgScore === null ? '' : r.avgScore,
        r.lastActive === null ? '' : new Date(r.lastActive).toISOString().slice(0, 10), r.daysInactive === null ? '' : r.daysInactive,
        r.hubLevel === null ? '' : r.hubLevel, status, r.weakest, r.xpBy.spt, r.xpBy.accounting, r.xpBy.excel, r.xpBy.sqlpq, r.createdAt.slice(0, 10)].map(csvCell).join(','));
    });
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
  }

  global.CohortEngine = { FORMAT: FORMAT, VERSION: VERSION, MAX_BYTES: MAX_BYTES, INACTIVE_DAYS: INACTIVE_DAYS, parseRecap: parseRecap, validate: validate, dedupe: dedupe, aggregate: aggregate, toCsv: toCsv, csvCell: csvCell };
})(typeof window !== 'undefined' ? window : globalThis);
