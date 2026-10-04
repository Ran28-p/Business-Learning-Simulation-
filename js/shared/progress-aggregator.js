/**
 * progress-aggregator.js — Progres belajar lintas modul (Portal Belajar).
 *
 * Tugas file ini (TANPA menyentuh engine modul mana pun, hanya MEMBACA/menulis
 * key localStorage yang memang sudah dipakai tiap modul):
 *   1. summarize()      — ringkasan XP/level/aktivitas/akurasi per modul untuk dashboard portal.
 *   2. buildExport()    — satu file JSON berisi progres SEMUA modul (cadangan/pindah perangkat).
 *   3. inspectImport()  — validasi file sebelum menyentuh apa pun (allowlist key, tipe, ukuran).
 *   4. applyImport()    — pulihkan progres: mode "merge" (jangan timpa yang lebih maju) atau
 *                         "replace"; atomik (gagal di tengah → dikembalikan seperti semula).
 *   5. buildRecapHtml() — HTML rekap untuk PDF (dirender oleh js/shared/pdf-export.js).
 *
 * KEAMANAN IMPOR: file cadangan = input tak tepercaya. Hanya key di ALLOWLIST (daftar di
 * MODULES di bawah) yang pernah ditulis; nilai harus string, dibatasi ukurannya, dan key inti
 * harus JSON dengan bentuk yang benar. Key sesi login, tema, dll. TIDAK ada di allowlist.
 *
 * SINKRON DENGAN MODUL: daftar key di sini harus sama dengan yang dipakai modulnya. Test
 * tests/test-portal-progress.mjs membandingkan langsung dengan kode sumber tiap modul, jadi
 * kalau sebuah modul mengganti key-nya, CI gagal sampai file ini diperbarui.
 *
 * Tidak ada dependency; bekerja dengan objek storage apa pun yang punya getItem/setItem/removeItem.
 */
(function (global) {
  'use strict';
  if (global.PortalProgress) return; // idempotent guard

  var FORMAT = '__portal_progress_backup';
  var SPT_FORMAT = '__simspt_backup';
  var VERSION = 1;
  var LIMITS = { perKeyChars: 2000000, totalChars: 4000000 };

  // Key milik SPT = SAMA PERSIS dengan BACKUP_KEYS di apps/spt/js/shared/backup-utils.js,
  // supaya file cadangan SPT lama bisa dipulihkan lewat portal dan sebaliknya.
  var SPT_KEYS = [
    'spt_simulator_data', 'spt_tax_career_progress', 'simspt_faktur_history_v1', 'simspt_bupot_history_v1',
    'spt_npwp', 'spt_nama_wp', 'spt_1771_induk_kasus_id', 'draft_spt_1771_induk',
    'draft_lampiran_I', 'nilai_lampiran_I', 'draft_lampiran_II', 'L2_total_hpp', 'L2_total_bs', 'L2_total_bl',
    'draft_lampiran_III', 'L3_total_kredit_pajak', 'draft_lampiran_IV', 'L4_total_non_objek'
  ];

  // Key yang HARUS berupa JSON dengan bentuk tertentu ('object' | 'array').
  var JSON_SHAPES = {
    spt_simulator_data: 'object', spt_tax_career_progress: 'object',
    simspt_faktur_history_v1: 'array', simspt_bupot_history_v1: 'array',
    ACT_MASTER_STATE: 'object', ACT_MASTER_PROGRESS: 'object', ACT_MASTER_TAX_STATE: 'object',
    'efpg:progress': 'object',
    sqlpq_progress_v1: 'object', sqlpq_dataset_history_v1: 'array'
  };

  /* ─────────────── util ─────────────── */
  function readJson(read, key) {
    try {
      var raw = read(key);
      if (raw === null || raw === undefined) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function num(v, fallback) { return typeof v === 'number' && isFinite(v) ? v : (fallback === undefined ? 0 : fallback); }
  function clampInt(v) { return Math.max(0, Math.floor(num(v))); }
  function pct(part, whole) { return whole > 0 ? Math.round((part / whole) * 100) : null; }
  function toMs(v) {
    if (typeof v === 'number' && isFinite(v) && v > 0) return v;
    if (typeof v === 'string' && v) { var t = Date.parse(v); return isNaN(t) ? null : t; }
    return null;
  }
  function maxMs(list) {
    var best = null;
    list.forEach(function (v) { var t = toMs(v); if (t !== null && (best === null || t > best)) best = t; });
    return best;
  }
  function plural(n, one) { return n + ' ' + one; }

  /* ─────────────── ringkasan per modul ─────────────── */
  // Setiap summarize(read) menerima read(key) -> string|null dan mengembalikan objek ringkasan.
  // "started" = ada progres nyata (bukan sekadar default). Field wajib: xp, level, activities.
  function base(extra) {
    var s = { xp: 0, level: 1, levelLabel: 'Level', activities: 0, scorePct: null, scoreLabel: 'Akurasi', lastActive: null, highlights: [], started: false };
    for (var k in extra) s[k] = extra[k];
    return s;
  }

  function summarizeSpt(read) {
    var user = readJson(read, 'spt_simulator_data');
    var career = readJson(read, 'spt_tax_career_progress');
    var faktur = readJson(read, 'simspt_faktur_history_v1');
    var bupot = readJson(read, 'simspt_bupot_history_v1');
    var s = base({ scoreLabel: 'Skor rata-rata' });
    var history = isObj(user) && Array.isArray(user.history) ? user.history : [];
    if (isObj(user)) {
      s.xp = clampInt(user.xp);
      s.level = Math.max(1, clampInt(user.level) || Math.floor(s.xp / 200) + 1);
    }
    s.activities = history.length;
    var scores = history.map(function (h) { return isObj(h) ? h.score : null; }).filter(function (x) { return typeof x === 'number' && isFinite(x); });
    if (scores.length) s.scorePct = Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length);
    var tracks = isObj(career) && isObj(career.byTrack) ? Object.keys(career.byTrack).map(function (k) { return career.byTrack[k]; }).filter(isObj) : [];
    var trackScores = tracks.map(function (t) { return t.score; }).filter(function (x) { return typeof x === 'number' && isFinite(x); });
    var fakturN = Array.isArray(faktur) ? faktur.length : 0;
    var bupotN = Array.isArray(bupot) ? bupot.length : 0;
    if (history.length) s.highlights.push(plural(history.length, 'simulasi formulir/kuis selesai'));
    if (tracks.length) s.highlights.push('Tax Career: ' + tracks.length + ' jalur dikerjakan' + (trackScores.length ? ' (rata-rata ' + Math.round(trackScores.reduce(function (a, b) { return a + b; }, 0) / trackScores.length) + ')' : ''));
    if (fakturN) s.highlights.push(plural(fakturN, 'faktur pajak tersimpan'));
    if (bupotN) s.highlights.push(plural(bupotN, 'bukti potong tersimpan'));
    // "activities" yang dipakai untuk membandingkan kemajuan juga memuat aktivitas di luar riwayat dashboard.
    s.activities = history.length + tracks.length + fakturN + bupotN;
    s.lastActive = maxMs([isObj(user) ? user.updatedAt : null, isObj(career) ? career.updatedAt : null]);
    s.started = s.xp > 0 || s.activities > 0;
    return s;
  }

  function summarizeAccounting(read) {
    var st = readJson(read, 'ACT_MASTER_STATE');
    var pr = readJson(read, 'ACT_MASTER_PROGRESS');
    var s = base();
    if (isObj(st)) { s.xp = clampInt(st.xp); s.level = Math.max(1, clampInt(st.userLevel) || Math.floor(s.xp / 100) + 1); }
    var badges = isObj(st) && Array.isArray(st.badges) ? st.badges.filter(function (b) { return isObj(b) && b.unlocked; }).length : 0;
    if (isObj(pr)) {
      var attempts = clampInt(pr.attemptCount), correct = clampInt(pr.correctCount);
      s.activities = attempts;
      s.scorePct = pct(correct, attempts);
      if (attempts) s.highlights.push(attempts + ' percobaan latihan (' + correct + ' benar)');
      if (typeof pr.bestGrade === 'string' && attempts) s.highlights.push('Nilai terbaik: ' + pr.bestGrade.slice(0, 2) + (num(pr.bestScore) ? ' (' + Math.round(pr.bestScore) + ')' : ''));
      s.lastActive = Array.isArray(pr.history) && pr.history[0] ? toMs(pr.history[0].ts) : null;
    }
    if (badges) s.highlights.push(plural(badges, 'badge terbuka'));
    s.started = s.xp > 0 || s.activities > 0;
    return s;
  }

  function summarizeExcel(read) {
    var p = readJson(read, 'efpg:progress');
    var s = base({ levelLabel: 'Level soal' });
    if (!isObj(p)) return s;
    var done = clampInt(p.soalDikerjakan), ok = clampInt(p.jawabanBenar);
    s.xp = clampInt(p.xp);
    s.level = Math.max(1, clampInt(p.levelAktif) || 1);
    s.activities = done;
    s.scorePct = pct(ok, done);
    if (done) s.highlights.push(done + ' soal dikerjakan (' + ok + ' benar)');
    var fn = isObj(p.rumusDipelajari) ? Object.keys(p.rumusDipelajari).filter(function (k) { return isObj(p.rumusDipelajari[k]) && num(p.rumusDipelajari[k].benar) >= 1; }) : [];
    if (fn.length) s.highlights.push(plural(fn.length, 'fungsi rumus dikuasai'));
    if (Array.isArray(p.badges) && p.badges.length) s.highlights.push(plural(p.badges.length, 'badge'));
    // Riwayat Excel diurutkan terbaru-dulu (unshift), tapi jangan bergantung pada urutan: ambil yang paling baru.
    s.lastActive = Array.isArray(p.riwayat) ? maxMs(p.riwayat.map(function (r) { return isObj(r) ? r.waktu : null; })) : null;
    s.started = s.xp > 0 || done > 0;
    return s;
  }

  function summarizeSql(read) {
    var p = readJson(read, 'sqlpq_progress_v1');
    var s = base();
    if (!isObj(p)) return s;
    var answered = clampInt(p.totalAnswered), correct = clampInt(p.totalCorrect);
    s.xp = clampInt(p.xp);
    s.level = Math.floor(s.xp / 150) + 1; // = XP_PER_LEVEL di apps/sql-pq/js/progress-manager.js (dijaga test)
    s.activities = answered;
    s.scorePct = pct(correct, answered);
    if (answered) s.highlights.push(answered + ' soal dijawab (' + correct + ' benar)');
    var lessons = isObj(p.completedLessons) ? Object.keys(p.completedLessons).length : 0;
    if (lessons) s.highlights.push(plural(lessons, 'pelajaran selesai'));
    var streak = clampInt(p.streak);
    if (streak > 1) s.highlights.push('Streak ' + streak + ' hari');
    var attempts = Array.isArray(p.challengeAttempts) ? p.challengeAttempts.length : 0;
    if (attempts) s.highlights.push(plural(attempts, 'percobaan challenge'));
    s.lastActive = maxMs([Array.isArray(p.history) && p.history[0] ? p.history[0].ts : null, p.lastActiveDate]);
    s.started = s.xp > 0 || answered > 0 || lessons > 0;
    return s;
  }

  var MODULES = [
    { id: 'spt', label: 'Simulator SPT Pajak', icon: '🧾', href: './apps/spt/index.html', keys: SPT_KEYS, summarize: summarizeSpt },
    { id: 'accounting', label: 'Accounting Simulator', icon: '📊', href: './apps/accounting/index.html', keys: ['ACT_MASTER_STATE', 'ACT_MASTER_PROGRESS', 'ACT_MASTER_TAX_STATE'], summarize: summarizeAccounting },
    { id: 'excel', label: 'Excel Formula Practice', icon: '📈', href: './apps/excel/index.html', keys: ['efpg:progress'], summarize: summarizeExcel },
    { id: 'sqlpq', label: 'SQL & Power Query', icon: '🗄️', href: './apps/sql-pq/index.html', keys: ['sqlpq_progress_v1', 'sqlpq_dataset_history_v1'], summarize: summarizeSql }
  ];
  var OWNER = {};
  MODULES.forEach(function (m) { m.keys.forEach(function (k) { OWNER[k] = m.id; }); });

  function readerOf(storage) { return function (key) { try { return storage.getItem(key); } catch (e) { return null; } }; }
  function readerOfMap(map) { return function (key) { return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null; }; }

  function summarizeWith(read) {
    var modules = MODULES.map(function (m) {
      var s = m.summarize(read);
      s.id = m.id; s.label = m.label; s.icon = m.icon; s.href = m.href;
      return s;
    });
    return {
      modules: modules,
      totals: {
        xp: modules.reduce(function (a, m) { return a + m.xp; }, 0),
        activities: modules.reduce(function (a, m) { return a + m.activities; }, 0),
        startedModules: modules.filter(function (m) { return m.started; }).length,
        moduleCount: modules.length
      }
    };
  }
  function summarize(storage) { return summarizeWith(readerOf(storage)); }

  /* ─────────────── ekspor ─────────────── */
  function buildExport(storage, meta) {
    var read = readerOf(storage), data = {};
    MODULES.forEach(function (m) {
      m.keys.forEach(function (k) { var v = read(k); if (typeof v === 'string') data[k] = v; });
    });
    var sum = summarizeWith(readerOf(storage));
    var out = { exportedAt: new Date().toISOString(), version: VERSION, app: 'Portal Belajar' };
    out[FORMAT] = true;
    var name = meta && typeof meta.name === 'string' ? meta.name.slice(0, 100) : '';
    if (name) out.user = { displayName: name };
    // Ringkasan hanya informasi untuk orang yang membuka file — TIDAK PERNAH dipercaya saat impor.
    out.summary = { totalXp: sum.totals.xp, modules: sum.modules.map(function (m) { return { id: m.id, xp: m.xp, level: m.level, activities: m.activities }; }) };
    out.data = data;
    return out;
  }

  /* ─────────────── impor: inspeksi ─────────────── */
  function fail(error) { return { ok: false, error: error, modules: [], rejectedKeys: [] }; }

  function checkValue(key, value) {
    if (typeof value !== 'string') return 'nilai bukan teks';
    if (value.length > LIMITS.perKeyChars) return 'terlalu besar';
    var shape = JSON_SHAPES[key];
    if (shape) {
      var parsed;
      try { parsed = JSON.parse(value); } catch (e) { return 'bukan JSON yang valid'; }
      if (shape === 'array' && !Array.isArray(parsed)) return 'bentuk data tidak sesuai';
      if (shape === 'object' && !isObj(parsed)) return 'bentuk data tidak sesuai';
    }
    return null;
  }

  function inspectImport(input) {
    var parsed = input;
    if (typeof input === 'string') {
      try { parsed = JSON.parse(input); } catch (e) { return fail('Berkas bukan JSON yang valid. Pilih file cadangan yang diunduh dari Portal Belajar atau Simulator SPT.'); }
    }
    if (!isObj(parsed)) return fail('Isi berkas tidak dikenali sebagai cadangan progres.');
    var kind = parsed[FORMAT] === true ? 'portal' : parsed[SPT_FORMAT] === true ? 'spt' : null;
    if (!kind) return fail('Format berkas tidak dikenali. Gunakan file cadangan dari Portal Belajar ("Ekspor Progres") atau cadangan lengkap dari Simulator SPT.');
    if (!isObj(parsed.data)) return fail('Berkas cadangan tidak memuat data progres.');
    if (typeof parsed.version === 'number' && parsed.version > VERSION) return fail('Berkas dibuat oleh versi portal yang lebih baru (v' + parsed.version + '). Perbarui portal terlebih dahulu.');

    var rejected = [], bad = {}, perModule = {}, total = 0;
    Object.keys(parsed.data).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(OWNER, key)) { rejected.push({ key: key, reason: 'bukan data progres yang dikenal' }); return; }
      var problem = checkValue(key, parsed.data[key]);
      var mod = OWNER[key];
      if (problem) { rejected.push({ key: key, reason: problem }); bad[mod] = true; return; }
      total += parsed.data[key].length;
      (perModule[mod] = perModule[mod] || {})[key] = parsed.data[key];
    });
    if (total > LIMITS.totalChars) return fail('Berkas terlalu besar untuk dipulihkan ke penyimpanan browser.');

    var modules = [];
    MODULES.forEach(function (m) {
      if (bad[m.id]) { return; } // modul dengan satu key rusak dilewati seluruhnya (tetap konsisten)
      if (!perModule[m.id]) return;
      var s = m.summarize(readerOfMap(perModule[m.id]));
      s.id = m.id; s.label = m.label; s.icon = m.icon;
      s.keys = Object.keys(perModule[m.id]);
      s.data = perModule[m.id];
      modules.push(s);
    });
    var skipped = MODULES.filter(function (m) { return bad[m.id]; }).map(function (m) { return m.id; });
    if (!modules.length) {
      return { ok: false, error: skipped.length ? 'Semua data modul di berkas ini rusak atau tidak valid, tidak ada yang bisa dipulihkan.' : 'Berkas tidak berisi progres modul yang dikenal.', modules: [], rejectedKeys: rejected, skippedModules: skipped, kind: kind };
    }
    return { ok: true, kind: kind, exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null, modules: modules, rejectedKeys: rejected, skippedModules: skipped };
  }

  /* ─────────────── impor: terapkan ─────────────── */
  // Tolok ukur "lebih maju": XP dulu, lalu jumlah aktivitas. Dipakai hanya di mode merge.
  function isMoreAdvanced(incoming, local) {
    if (incoming.xp !== local.xp) return incoming.xp > local.xp;
    return incoming.activities > local.activities;
  }

  function applyImport(storage, input, options) {
    var mode = options && options.mode === 'replace' ? 'replace' : 'merge';
    var insp = inspectImport(input);
    if (!insp.ok) return { ok: false, error: insp.error, report: [], written: [], rejectedKeys: insp.rejectedKeys || [] };

    var localSummary = summarize(storage);
    var local = {}; localSummary.modules.forEach(function (m) { local[m.id] = m; });
    var report = [], plan = [];
    insp.modules.forEach(function (inc) {
      var loc = local[inc.id];
      if (mode === 'merge' && loc.started && !isMoreAdvanced(inc, loc)) {
        report.push({ id: inc.id, label: inc.label, action: 'kept-local', reason: 'Progres di perangkat ini sudah sama atau lebih maju.', incomingXp: inc.xp, localXp: loc.xp });
      } else {
        plan.push(inc);
        report.push({ id: inc.id, label: inc.label, action: 'imported', reason: mode === 'replace' ? 'Ditimpa sesuai berkas.' : (loc.started ? 'Berkas lebih maju dari progres di perangkat ini.' : 'Belum ada progres di perangkat ini.'), incomingXp: inc.xp, localXp: loc.xp });
      }
    });

    // Tulis atomik: catat nilai lama, kalau ada kegagalan (mis. penyimpanan penuh) kembalikan semuanya.
    var previous = {}, written = [];
    try {
      plan.forEach(function (inc) {
        inc.keys.forEach(function (key) {
          var value = inc.data[key];
          if (key === 'spt_simulator_data') {
            // Sama seperti restore bawaan SPT (yang memanggil saveData()): tandai sebagai yang terbaru
            // supaya tidak langsung ditimpa data cloud lama saat login.
            var o = JSON.parse(value); o.updatedAt = Date.now(); value = JSON.stringify(o);
          }
          var old = storage.getItem(key);
          if (!(key in previous)) previous[key] = old === undefined ? null : old;
          storage.setItem(key, value);
          written.push(key);
        });
      });
    } catch (e) {
      Object.keys(previous).forEach(function (key) {
        try { if (previous[key] === null) storage.removeItem(key); else storage.setItem(key, previous[key]); } catch (e2) { /* best effort */ }
      });
      return { ok: false, error: 'Penyimpanan browser penuh atau tidak tersedia. Tidak ada progres yang diubah.', report: [], written: [], rolledBack: true, rejectedKeys: insp.rejectedKeys };
    }
    return { ok: true, mode: mode, report: report, written: written, rejectedKeys: insp.rejectedKeys, skippedModules: insp.skippedModules, kind: insp.kind };
  }

  /* ─────────────── rekap (HTML untuk PDF) ─────────────── */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(ms) {
    if (ms === null || ms === undefined) return '—';
    try { return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return '—'; }
  }
  function fmtScore(m) { return m.scorePct === null ? '—' : m.scorePct + '%'; }

  function buildRecapHtml(sum, opts) {
    opts = opts || {};
    var name = opts.name ? esc(String(opts.name).slice(0, 100)) : 'Peserta (Tamu)';
    var when = opts.generatedAt !== undefined ? opts.generatedAt : Date.now();
    var th = 'text-align:left;padding:8px 10px;border-bottom:2px solid #0b5cab;font-size:11px;color:#0b5cab;text-transform:uppercase;letter-spacing:.04em';
    var td = 'padding:9px 10px;border-bottom:1px solid #e2e8f0;font-size:12.5px;vertical-align:top';
    var rows = sum.modules.map(function (m) {
      var hl = m.highlights.length ? '<div style="margin-top:4px;font-size:11px;color:#475569;line-height:1.5">' + m.highlights.map(esc).join(' · ') + '</div>' : '';
      var status = m.started ? '' : '<div style="margin-top:4px;font-size:11px;color:#94a3b8">Belum dimulai</div>';
      return '<tr><td style="' + td + '"><strong>' + esc(m.icon + ' ' + m.label) + '</strong>' + hl + status + '</td>' +
        '<td style="' + td + ';text-align:right">' + m.xp + '</td>' +
        '<td style="' + td + ';text-align:center">' + esc(m.levelLabel) + ' ' + m.level + '</td>' +
        '<td style="' + td + ';text-align:right">' + m.activities + '</td>' +
        '<td style="' + td + ';text-align:right" title="' + esc(m.scoreLabel) + '">' + esc(fmtScore(m)) + '<div style="font-size:10px;color:#94a3b8">' + esc(m.scoreLabel) + '</div></td>' +
        '<td style="' + td + ';text-align:right">' + esc(fmtDate(m.lastActive)) + '</td></tr>';
    }).join('');
    return '<div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;width:714px;padding:8px 4px">' +
      '<div style="border-bottom:3px solid #0b5cab;padding-bottom:10px;margin-bottom:16px">' +
      '<div style="font-size:11px;color:#64748b;letter-spacing:.06em;text-transform:uppercase">Portal Belajar</div>' +
      '<h1 style="margin:2px 0 0;font-size:22px">Rekap Progres Belajar</h1></div>' +
      '<table style="border-collapse:collapse;margin-bottom:16px;font-size:12.5px"><tr><td style="padding:2px 14px 2px 0;color:#64748b">Nama</td><td><strong>' + name + '</strong></td></tr>' +
      '<tr><td style="padding:2px 14px 2px 0;color:#64748b">Tanggal rekap</td><td>' + esc(fmtDate(when)) + '</td></tr>' +
      '<tr><td style="padding:2px 14px 2px 0;color:#64748b">Modul dimulai</td><td>' + sum.totals.startedModules + ' dari ' + sum.totals.moduleCount + '</td></tr>' +
      '<tr><td style="padding:2px 14px 2px 0;color:#64748b">Total XP</td><td><strong>' + sum.totals.xp + '</strong> (jumlah XP seluruh modul)</td></tr></table>' +
      '<table style="width:100%;border-collapse:collapse"><thead><tr>' +
      '<th style="' + th + '">Modul</th><th style="' + th + ';text-align:right">XP</th><th style="' + th + ';text-align:center">Level</th><th style="' + th + ';text-align:right">Aktivitas</th><th style="' + th + ';text-align:right">Skor</th><th style="' + th + ';text-align:right">Terakhir aktif</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p style="margin-top:18px;font-size:10.5px;color:#64748b;line-height:1.55;border-top:1px solid #e2e8f0;padding-top:10px">' +
      'Rekap ini dibuat otomatis dari data yang tersimpan di browser peserta pada perangkat ini. Data tidak diverifikasi pihak ketiga sehingga <strong>bukan sertifikat</strong> atau penilaian resmi. ' +
      'Skema XP dan level berbeda di tiap modul, sehingga total XP hanya gambaran umum aktivitas belajar.</p></div>';
  }

  global.PortalProgress = {
    FORMAT: FORMAT, VERSION: VERSION, LIMITS: LIMITS, MODULES: MODULES,
    ALL_KEYS: Object.keys(OWNER), OWNER: OWNER, JSON_SHAPES: JSON_SHAPES,
    summarize: summarize, summarizeWith: summarizeWith,
    buildExport: buildExport, inspectImport: inspectImport, applyImport: applyImport,
    buildRecapHtml: buildRecapHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
