/**
 * learning-analytics.js — Analitik belajar dari data NYATA di perangkat. MURNI: tanpa DOM, tanpa jaringan.
 *
 * Membaca riwayat yang SUDAH dicatat tiap modul (tanpa mengubah modul):
 *   • Excel       efpg:progress.rumusDipelajari  { FUNGSI: {dikerjakan, benar} }        → akurasi per fungsi
 *   • SQL & PQ    sqlpq_progress_v1.wrongAttempts { konsep: jumlahSalah }               → konsep yang sering salah
 *   • Accounting  ACT_MASTER_PROGRESS.componentScores { komponen: [skor 0-100] }        → komponen jurnal yang lemah
 *   • SPT         spt_simulator_data.history [{module, score}] + spt_tax_career_progress.byTrack → simulasi dengan skor rendah
 * Hasilnya: topik yang perlu diulang (dengan alasan berupa angka nyata + saran tindakan + tautan modul),
 * kekuatan, dan rekap ringkas yang bisa diunduh peserta untuk pengajar (hanya agregat; tanpa data mentah).
 *
 * Prinsip: tidak ada angka karangan; data terlalu sedikit → ditandai "tentatif" atau tidak ditampilkan.
 *
 * API: LearningAnalytics.analyze(read) · buildRecap(opts) · RECAP_FORMAT · RECAP_VERSION
 *      read(key) → string|null  (mis. k => localStorage.getItem(k))
 */
(function (global) {
  'use strict';
  if (global.LearningAnalytics) return;

  var RECAP_FORMAT = 'portal-belajar-rekap';
  var RECAP_VERSION = 1;
  var MODULE_IDS = ['spt', 'accounting', 'excel', 'sqlpq'];
  var MODULE_LABEL = { spt: 'Simulator SPT Pajak', accounting: 'Accounting Simulator', excel: 'Excel Formula Practice', sqlpq: 'SQL & Power Query' };
  var MODULE_HREF = { spt: './apps/spt/index.html', accounting: './apps/accounting/index.html', excel: './apps/excel/index.html', sqlpq: './apps/sql-pq/index.html' };
  var WEAK_BELOW = 0.7;      // akurasi di bawah 70% = perlu diulang
  var STRONG_AT = 0.85;      // 85%+ dengan cukup percobaan = kuat

  // Label konsep SQL — dijaga test terhadap apps/sql-pq/js/question-bank.js (CONCEPTS).
  var SQL_CONCEPTS = {
    where: 'WHERE — filter baris', orderLimit: 'ORDER BY + LIMIT', distinct: 'DISTINCT — nilai unik', like: 'LIKE — pencocokan pola teks',
    between: 'BETWEEN — rentang nilai', inList: 'IN — daftar nilai', multiCond: 'AND / OR — kondisi majemuk', groupAgg: 'GROUP BY + fungsi agregat',
    having: 'HAVING — filter hasil agregasi', caseWhen: 'CASE WHEN — logika kondisional', coalesce: 'COALESCE — nilai pengganti NULL',
    stringFn: 'String Functions', dateFn: 'Date Functions', join: 'INNER JOIN', leftJoin: 'LEFT JOIN', selfJoin: 'Self JOIN',
    joinComplex: 'JOIN dengan Kondisi Kompleks', subquery: 'Subquery', unionAll: 'UNION ALL', exists: 'EXISTS',
    window: 'Window Function (RANK / ROW_NUMBER)', cte: 'CTE (WITH) + Subquery', duplicate: 'Deteksi Duplikat', nullcheck: 'Menemukan NULL',
    outlier: 'Deteksi Nilai Ekstrem (Outlier)', dataValidation: 'Data Validation', dateFormatCheck: 'Konsistensi Format Tanggal',
    pipeline: 'Power Query Pipeline'
  };
  // Komponen skor jurnal Accounting — bobot dari apps/accounting/js/business/scoringEngine.js (SCORE_WEIGHTS), dijaga test.
  var ACC_COMPONENTS = {
    analysis: { label: 'Analisis transaksi', weight: 0.20, advice: 'Latih membaca transaksi: tentukan dulu akun apa saja yang terpengaruh sebelum mengisi jurnal.' },
    account: { label: 'Pemilihan akun', weight: 0.25, advice: 'Ulangi pemilihan akun: cek kelompoknya (aset, kewajiban, ekuitas, pendapatan, beban).' },
    side: { label: 'Sisi debit/kredit', weight: 0.25, advice: 'Ulangi aturan debit dan kredit untuk tiap kelompok akun.' },
    amount: { label: 'Nominal', weight: 0.15, advice: 'Periksa nominal: pastikan total debit sama dengan total kredit.' },
    date: { label: 'Tanggal', weight: 0.05, advice: 'Perhatikan tanggal transaksi saat mencatat jurnal.' },
    posting: { label: 'Posting ke buku besar', weight: 0.05, advice: 'Ulangi langkah posting jurnal ke buku besar.' },
    report: { label: 'Laporan keuangan', weight: 0.05, advice: 'Latih menyusun laporan keuangan dari neraca saldo.' }
  };

  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function int(v) { return Math.max(0, Math.floor(num(v))); }
  function readJson(read, key) { try { var r = read(key); return r === null || r === undefined ? null : JSON.parse(r); } catch (_) { return null; } }
  function clip(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n); }
  function pct(x) { return Math.round(x * 100); }

  function item(moduleId, o) {
    return { moduleId: moduleId, moduleLabel: MODULE_LABEL[moduleId], href: MODULE_HREF[moduleId],
      key: o.key, label: o.label, detail: o.detail, advice: o.advice, priority: Math.max(0, Math.min(100, Math.round(o.priority))), tentative: !!o.tentative };
  }

  /* ───────── per modul ───────── */
  function analyzeExcel(read) {
    var p = readJson(read, 'efpg:progress'), weak = [], strong = [];
    var f = isObj(p) && isObj(p.rumusDipelajari) ? p.rumusDipelajari : {};
    Object.keys(f).slice(0, 80).forEach(function (fn) {
      var r = f[fn]; if (!isObj(r)) return;
      var attempts = int(r.dikerjakan), ok = Math.min(int(r.benar), attempts), wrong = attempts - ok;
      if (!attempts) return;
      var acc = ok / attempts, name = clip(fn, 30);
      var detail = ok + ' dari ' + attempts + ' soal benar (' + pct(acc) + '%)';
      if (acc < WEAK_BELOW) {
        weak.push(item('excel', { key: 'fn:' + name, label: 'Fungsi ' + name, detail: detail, tentative: attempts < 2,
          advice: 'Kerjakan ulang soal yang memakai ' + name + ' (mulai dari level yang sama); baca contohnya di Modul Pengetahuan Excel.',
          priority: (1 - acc) * 100 + Math.min(wrong, 5) * 3 }));
      } else if (attempts >= 3 && acc >= STRONG_AT) strong.push({ moduleId: 'excel', label: 'Fungsi ' + name, detail: detail });
    });
    return { weak: weak, strong: strong };
  }

  function analyzeSql(read) {
    var p = readJson(read, 'sqlpq_progress_v1'), weak = [];
    var w = isObj(p) && isObj(p.wrongAttempts) ? p.wrongAttempts : {};
    Object.keys(w).slice(0, 80).forEach(function (k) {
      var n = int(w[k]); if (!n) return;
      var label = SQL_CONCEPTS[k] || clip(k, 40);
      weak.push(item('sqlpq', { key: 'concept:' + clip(k, 40), label: label, tentative: n < 2,
        detail: n + ' kali salah pada konsep ini',
        advice: 'Kerjakan lagi soal konsep ' + label + ' di SQL Simulator; buka hint bila macet, lalu baca penjelasannya.',
        priority: 40 + Math.min(n, 5) * 12 }));
    });
    return { weak: weak, strong: [] };
  }

  function analyzeAccounting(read) {
    var p = readJson(read, 'ACT_MASTER_PROGRESS'), weak = [], strong = [];
    var cs = isObj(p) && isObj(p.componentScores) ? p.componentScores : {};
    Object.keys(ACC_COMPONENTS).forEach(function (key) {
      var arr = Array.isArray(cs[key]) ? cs[key].filter(function (x) { return typeof x === 'number' && isFinite(x); }).slice(-10) : [];
      if (arr.length < 3) return;   // kurang dari 3 percobaan = belum cukup untuk menilai
      var avg = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length, c = ACC_COMPONENTS[key];
      var detail = 'Rata-rata skor ' + Math.round(avg) + ' dari 100 (' + arr.length + ' percobaan terakhir)';
      if (avg < WEAK_BELOW * 100) weak.push(item('accounting', { key: 'comp:' + key, label: c.label, detail: detail, advice: c.advice, tentative: false,
        priority: (100 - avg) * (0.5 + c.weight * 2) }));   // komponen berbobot besar (akun, debit/kredit) lebih diprioritaskan
      else if (avg >= STRONG_AT * 100) strong.push({ moduleId: 'accounting', label: c.label, detail: detail });
    });
    return { weak: weak, strong: strong };
  }

  function analyzeSpt(read) {
    var user = readJson(read, 'spt_simulator_data'), career = readJson(read, 'spt_tax_career_progress'), weak = [], strong = [];
    var by = {};
    (isObj(user) && Array.isArray(user.history) ? user.history : []).slice(-200).forEach(function (h) {
      if (!isObj(h) || typeof h.score !== 'number' || !isFinite(h.score)) return;
      var k = clip(h.module, 60) || 'Simulasi'; (by[k] = by[k] || []).push(h.score);
    });
    Object.keys(by).forEach(function (k) {
      var arr = by[k], avg = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
      var detail = 'Skor rata-rata ' + Math.round(avg) + ' dari ' + arr.length + ' simulasi';
      if (arr.length >= 2 && avg < WEAK_BELOW * 100) weak.push(item('spt', { key: 'sim:' + k, label: k, detail: detail, tentative: false,
        advice: 'Ulangi simulasi ' + k + ' dan cocokkan isian dengan pembahasannya; rujuk Modul Pengetahuan SPT dan panduan Coretax.', priority: 100 - avg }));
      else if (arr.length >= 3 && avg >= STRONG_AT * 100) strong.push({ moduleId: 'spt', label: k, detail: detail });
    });
    var tr = isObj(career) && isObj(career.byTrack) ? career.byTrack : {};
    Object.keys(tr).slice(0, 20).forEach(function (k) {
      var t = tr[k]; if (!isObj(t) || typeof t.score !== 'number' || !isFinite(t.score)) return;
      if (t.score < WEAK_BELOW * 100) weak.push(item('spt', { key: 'track:' + clip(k, 40), label: 'Tax Career: ' + clip(k, 40), tentative: false,
        detail: 'Skor ' + Math.round(t.score) + ' dari 100',
        advice: 'Ulangi jalur ini di Tax Career dan baca pembahasan tiap soal.', priority: 100 - t.score }));
    });
    return { weak: weak, strong: strong };
  }

  var ANALYZERS = { spt: analyzeSpt, accounting: analyzeAccounting, excel: analyzeExcel, sqlpq: analyzeSql };

  /** Analisis seluruh modul + rekomendasi gabungan. */
  function analyze(read) {
    var modules = {}, all = [];
    MODULE_IDS.forEach(function (id) {
      var r; try { r = ANALYZERS[id](read); } catch (_) { r = { weak: [], strong: [] }; }
      r.weak.sort(function (a, b) { return (a.tentative - b.tentative) || (b.priority - a.priority); });
      modules[id] = { id: id, label: MODULE_LABEL[id], weak: r.weak, strong: r.strong.slice(0, 5) };
      r.weak.slice(0, 2).forEach(function (w) { all.push(w); });   // maksimal 2 per modul agar rekomendasi beragam
    });
    all.sort(function (a, b) { return (a.tentative - b.tentative) || (b.priority - a.priority); });
    var any = MODULE_IDS.some(function (id) { return modules[id].weak.length || modules[id].strong.length; });
    return { modules: modules, recommendations: all.slice(0, 5), hasData: any };
  }

  /* ───────── rekap untuk pengajar ───────── */
  function cleanName(s) { return clip(String(s == null ? '' : s).replace(/\s+/g, ' '), 60); }
  function validEmail(s) { s = clip(s, 100); return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(s) ? s : ''; }
  function iso(ms) { return typeof ms === 'number' && isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null; }

  /**
   * Rekap AGREGAT yang dibuat & diunduh peserta sendiri. TIDAK memuat data mentah (jawaban, data perusahaan, NPWP, dsb).
   * opts: { summary (PortalProgress.summarize), analysis (analyze()), hub: {level,totalXp,streak}|null,
   *         name, email, includeEmail, now: Date }
   */
  function buildRecap(opts) {
    var sum = opts.summary || { modules: [] }, an = opts.analysis || { modules: {} };
    var now = opts.now instanceof Date ? opts.now : new Date();
    var rec = { format: RECAP_FORMAT, version: RECAP_VERSION, createdAt: now.toISOString(),
      participant: { name: cleanName(opts.name) || 'Peserta' }, modules: [], weak: [], hub: null,
      note: 'Rekap ini dibuat sendiri oleh peserta dari data di perangkatnya; isinya dapat diubah dan bukan bukti penilaian resmi.' };
    if (opts.includeEmail) { var em = validEmail(opts.email); if (em) rec.participant.email = em; }
    (sum.modules || []).forEach(function (m) {
      if (MODULE_IDS.indexOf(m.id) === -1) return;
      rec.modules.push({ id: m.id, label: MODULE_LABEL[m.id], xp: int(m.xp), level: Math.max(1, int(m.level)), levelLabel: clip(m.levelLabel, 20),
        activities: int(m.activities), scorePct: typeof m.scorePct === 'number' && isFinite(m.scorePct) ? Math.max(0, Math.min(100, Math.round(m.scorePct))) : null,
        started: !!m.started, lastActive: iso(m.lastActive) });
    });
    MODULE_IDS.forEach(function (id) {
      ((an.modules[id] && an.modules[id].weak) || []).filter(function (w) { return !w.tentative; }).slice(0, 3).forEach(function (w) {
        rec.weak.push({ moduleId: id, label: clip(w.label, 80), detail: clip(w.detail, 120), priority: w.priority });
      });
    });
    rec.weak.sort(function (a, b) { return b.priority - a.priority; });
    rec.weak = rec.weak.slice(0, 10);
    if (opts.hub && isObj(opts.hub)) rec.hub = { level: Math.max(1, int(opts.hub.level)), totalXp: int(opts.hub.totalXp), streak: int(opts.hub.streak) };
    return rec;
  }

  global.LearningAnalytics = {
    RECAP_FORMAT: RECAP_FORMAT, RECAP_VERSION: RECAP_VERSION, MODULE_IDS: MODULE_IDS, MODULE_LABEL: MODULE_LABEL,
    SQL_CONCEPTS: SQL_CONCEPTS, ACC_COMPONENTS: ACC_COMPONENTS, WEAK_BELOW: WEAK_BELOW,
    analyze: analyze, buildRecap: buildRecap
  };
})(typeof window !== 'undefined' ? window : globalThis);
