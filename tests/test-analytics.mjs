// Test analitik belajar (js/shared/learning-analytics.js) dan mesin Ruang Pengajar (js/shared/cohort-engine.js).
//   A. TOPIK LEMAH      — dari data bentuk ASLI tiap modul; ambang; "tentatif"; data rusak; kesesuaian dengan sumber kebenaran modul
//   B. REKAP PESERTA    — hanya agregat, tanpa data mentah/PII yang tidak dipilih
//   C. VALIDASI REKAP   — berkas tak tepercaya (format, tipe, rentang, injeksi, prototype pollution)
//   D. RINGKASAN KELOMPOK — rata-rata, median, tertimbang, ambang tidak aktif/perlu perhatian, dedupe, topik tersulit
//   E. CSV              — kutipan benar + netralisasi injeksi rumus
// Jalankan:  node tests/test-analytics.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const eq = (a, b, l) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) console.log(`   diharapkan ${JSON.stringify(b)} · didapat ${JSON.stringify(a)}`); check(ok, l); };
const section = (t) => console.log('\n=== ' + t + ' ===');
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');

globalThis.window = globalThis;
for (const f of ['js/shared/progress-aggregator.js', 'js/shared/learning-analytics.js', 'js/shared/csv-utils.js', 'js/shared/cohort-engine.js']) vm.runInThisContext(src(f), { filename: f });
const PP = globalThis.PortalProgress, LA = globalThis.LearningAnalytics, CE = globalThis.CohortEngine;
const reader = (obj) => (k) => (Object.prototype.hasOwnProperty.call(obj, k) ? (typeof obj[k] === 'string' ? obj[k] : JSON.stringify(obj[k])) : null);
const NOW = new Date('2026-10-12T09:00:00.000Z');
const day = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

/* ============ A. TOPIK LEMAH ============ */
section('A. Topik yang perlu diulang (data nyata per modul)');
{
  const empty = LA.analyze(reader({}));
  eq([empty.hasData, empty.recommendations.length], [false, 0], 'tanpa data: tidak ada rekomendasi palsu');
  for (const id of LA.MODULE_IDS) eq(empty.modules[id].weak.length, 0, 'tanpa data: ' + id + ' tidak punya topik lemah');

  // Excel
  const ex = LA.analyze(reader({ 'efpg:progress': { rumusDipelajari: { SUM: { dikerjakan: 5, benar: 5 }, IF: { dikerjakan: 4, benar: 1 }, VLOOKUP: { dikerjakan: 1, benar: 0 }, COUNTIF: { dikerjakan: 3, benar: 2 }, MAX: { dikerjakan: 2, benar: 2 } } } })).modules.excel;
  const ifw = ex.weak.find((w) => w.key === 'fn:IF');
  check(ifw && ifw.detail === '1 dari 4 soal benar (25%)' && !ifw.tentative, 'IF: 1 dari 4 benar (25%) → lemah, bukan tentatif');
  const cif = ex.weak.find((w) => w.key === 'fn:COUNTIF');
  check(cif && cif.detail === '2 dari 3 soal benar (67%)' && !cif.tentative, 'COUNTIF 2 dari 3 (67%) < 70% → lemah');
  check(!ex.weak.some((w) => w.key === 'fn:SUM' || w.key === 'fn:MAX'), 'SUM (100%) dan MAX (100%) tidak lemah');
  eq(ex.weak.map((w) => w.key), ['fn:IF', 'fn:COUNTIF', 'fn:VLOOKUP'], 'urutan: IF (25%) → COUNTIF (67%) → VLOOKUP (tentatif)');
  check(ex.weak.find((w) => w.key === 'fn:VLOOKUP').tentative === true, 'VLOOKUP 1 percobaan salah → tentatif');
  eq(ex.weak[0].key, 'fn:IF', 'terurut: yang pasti (tidak tentatif) dan paling lemah dulu');
  check(ex.weak[ex.weak.length - 1].key === 'fn:VLOOKUP', 'yang tentatif di urutan paling akhir');
  eq(ex.strong.map((s) => s.label), ['Fungsi SUM'], 'kekuatan: SUM 5/5 (≥3 percobaan, ≥85%); MAX 2 percobaan belum cukup');
  const exBad = LA.analyze(reader({ 'efpg:progress': { rumusDipelajari: { A: { dikerjakan: 0, benar: 0 }, B: { dikerjakan: 3, benar: 99 }, C: 'x', D: null, ['E'.repeat(200)]: { dikerjakan: 4, benar: 0 } } } })).modules.excel;
  check(!exBad.weak.some((w) => w.key === 'fn:A'), 'fungsi dengan 0 percobaan diabaikan');
  check(!exBad.weak.some((w) => w.key === 'fn:B'), 'benar > dikerjakan dipotong (jadi 100%), bukan dianggap lemah');
  check(exBad.weak.every((w) => w.label.length <= 40), 'nama fungsi panjang dipotong');

  // SQL
  const sq = LA.analyze(reader({ sqlpq_progress_v1: { wrongAttempts: { where: 3, join: 1, kunciBaru: 2, groupAgg: 5, nol: 0 } } })).modules.sqlpq;
  eq(sq.weak.map((w) => w.key), ['concept:groupAgg', 'concept:where', 'concept:kunciBaru', 'concept:join'], 'SQL: urut menurut jumlah salah; yang 1× tentatif di akhir; 0 dibuang');
  eq(sq.weak[0].label, 'GROUP BY + fungsi agregat', 'label konsep dari katalog modul');
  eq(sq.weak.find((w) => w.key === 'concept:kunciBaru').label, 'kunciBaru', 'konsep tak dikenal memakai kunci apa adanya');
  check(sq.weak.find((w) => w.key === 'concept:join').tentative, 'salah 1× = tentatif');

  // Accounting
  const ac = LA.analyze(reader({ ACT_MASTER_PROGRESS: { componentScores: { analysis: [90, 95, 92], account: [40, 50, 45, 60], side: [30, 20, 40], amount: [60, 62], date: [10, 20, 30], posting: [95, 90, 99, 100], report: ['x', null, 50, 55, 60] } } })).modules.accounting;
  eq(ac.weak.map((w) => w.key), ['comp:side', 'comp:account', 'comp:date', 'comp:report'], 'Accounting: yang lemah (<70) terurut menurut keparahan×bobot (akun/debit-kredit lebih penting daripada tanggal)');
  check(!ac.weak.some((w) => w.key === 'comp:amount'), 'amount hanya 2 percobaan → belum dinilai');
  eq(ac.weak.find((w) => w.key === 'comp:report').detail, 'Rata-rata skor 55 dari 100 (3 percobaan terakhir)', 'report: nilai non-angka dibuang, tersisa 3 sampel valid (rata-rata 55)');
  eq(ac.strong.map((s) => s.label).sort(), ['Analisis transaksi', 'Posting ke buku besar'], 'kekuatan: rata-rata ≥ 85');
  const last10 = LA.analyze(reader({ ACT_MASTER_PROGRESS: { componentScores: { side: [0, 0, 0, 0, 0, 0, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] } } })).modules.accounting;
  eq(last10.weak.length, 0, 'hanya 10 percobaan terakhir yang dihitung (skor lama yang buruk tidak menghukum selamanya)');

  // SPT
  const sp = LA.analyze(reader({ spt_simulator_data: { history: [{ module: '1771', score: 40 }, { module: '1771', score: 50 }, { module: 'PPh 21', score: 95 }, { module: 'PPh 21', score: 90 }, { module: 'PPh 21', score: 100 }, { module: 'SPT Masa', score: 30 }, { module: 'bad', score: 'x' }, null] }, spt_tax_career_progress: { byTrack: { staf: { score: 55 }, manajer: { score: 90 }, rusak: 5 } } })).modules.spt;
  eq(sp.weak.map((w) => w.key).sort(), ['sim:1771', 'track:staf'], 'SPT: simulasi ≥2 percobaan rata-rata <70 dan jalur Tax Career lemah; 1 percobaan tidak dinilai');
  eq(sp.strong.map((s) => s.label), ['PPh 21'], 'SPT: kekuatan (≥3 simulasi, rata-rata ≥85)');

  // rekomendasi gabungan
  const all = LA.analyze(reader({
    'efpg:progress': { rumusDipelajari: { IF: { dikerjakan: 4, benar: 1 }, SUMIF: { dikerjakan: 3, benar: 0 }, LEN: { dikerjakan: 3, benar: 1 }, VLOOKUP: { dikerjakan: 1, benar: 0 } } },
    sqlpq_progress_v1: { wrongAttempts: { where: 3, join: 1 } },
    ACT_MASTER_PROGRESS: { componentScores: { side: [30, 20, 40] } }, spt_simulator_data: { history: [{ module: '1771', score: 40 }, { module: '1771', score: 50 }] } }));
  check(all.recommendations.length <= 5, 'rekomendasi maksimal 5');
  check(LA.MODULE_IDS.every((id) => all.recommendations.filter((r) => r.moduleId === id).length <= 2), 'maksimal 2 rekomendasi per modul (beragam)');
  check(all.recommendations.every((r) => !r.tentative) || all.recommendations.findIndex((r) => r.tentative) > all.recommendations.map((r) => r.tentative).lastIndexOf(false), 'rekomendasi pasti selalu di depan yang tentatif');
  check(all.recommendations.every((r) => r.href.startsWith('./apps/') && r.advice && r.detail && r.priority >= 0 && r.priority <= 100), 'tiap rekomendasi punya tautan, saran, alasan angka, prioritas 0–100');

  // data rusak tidak membuat crash
  for (const bad of [{ 'efpg:progress': '{rusak', sqlpq_progress_v1: '[]', ACT_MASTER_PROGRESS: 'null', spt_simulator_data: '5' }, { sqlpq_progress_v1: { wrongAttempts: [1, 2] }, 'efpg:progress': { rumusDipelajari: 7 } }, { ACT_MASTER_PROGRESS: { componentScores: { side: 'abc' } } }]) {
    let ok = true; try { LA.analyze(reader(bad)); } catch (e) { ok = false; }
    check(ok, 'analyze tahan data rusak: ' + JSON.stringify(bad).slice(0, 60));
  }
  const proto = JSON.parse('{"efpg:progress":{"rumusDipelajari":{"__proto__":{"dikerjakan":9,"benar":0}}}}');
  LA.analyze(reader(proto)); eq(({}).dikerjakan, undefined, 'tidak ada pencemaran prototype');

  // Kesesuaian dengan sumber kebenaran modul (supaya label/bobot tidak basi)
  const qb = {}; vm.runInNewContext(src('apps/sql-pq/js/question-bank.js'), Object.assign(qb, { window: qb, console }));
  const C = qb.SQLPQ_Questions.CONCEPTS;
  // Katalog question-bank.js + konsep "pipeline" yang dibuat langsung di apps/sql-pq/js/app-challenge.js (soal Power Query; dipecah dari app.js)
  eq(Object.keys(LA.SQL_CONCEPTS).sort(), [...Object.keys(C), 'pipeline'].sort(), 'daftar konsep SQL di analitik = katalog question-bank.js + "pipeline"');
  const bad = Object.keys(C).filter((k) => C[k].label !== LA.SQL_CONCEPTS[k]);
  eq(bad, [], 'label tiap konsep SQL sama dengan question-bank.js');
  check(/concept: "pipeline", conceptLabel: "Power Query Pipeline"/.test(src('apps/sql-pq/js/app-challenge.js')) && LA.SQL_CONCEPTS.pipeline === 'Power Query Pipeline', 'konsep "pipeline" & labelnya sama dengan app-challenge.js');
  const se = src('apps/accounting/js/business/scoringEngine.js');
  const weights = Object.fromEntries([...se.match(/SCORE_WEIGHTS = \{([^}]*)\}/)[1].matchAll(/(\w+):\s*([\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
  eq(Object.fromEntries(Object.entries(LA.ACC_COMPONENTS).map(([k, v]) => [k, v.weight])), weights, 'bobot komponen Accounting di analitik = scoringEngine.js');
  check(PP.MODULES.find((m) => m.id === 'excel').keys.includes('efpg:progress') && PP.MODULES.find((m) => m.id === 'sqlpq').keys.includes('sqlpq_progress_v1') && PP.MODULES.find((m) => m.id === 'accounting').keys.includes('ACT_MASTER_PROGRESS') && PP.MODULES.find((m) => m.id === 'spt').keys.includes('spt_simulator_data'), 'kunci yang dibaca analitik ada di allowlist agregator');
}

/* ============ B. REKAP PESERTA ============ */
section('B. Rekap untuk pengajar');
{
  const data = {
    'efpg:progress': { xp: 90, soalDikerjakan: 10, jawabanBenar: 6, levelAktif: 2, riwayat: [{ waktu: day(2) }], rumusDipelajari: { IF: { dikerjakan: 4, benar: 1 }, VLOOKUP: { dikerjakan: 1, benar: 0 } } },
    sqlpq_progress_v1: { xp: 300, totalAnswered: 20, totalCorrect: 16, completedLessons: {}, history: [{ ts: day(1) }], wrongAttempts: { where: 3 } },
    ACT_MASTER_TAX_STATE: { company: { name: 'PT RAHASIA ABADI', npwp: '99.999.999.9-999.999', address: 'Jl. Pribadi 1' } },
    spt_simulator_data: { xp: 10, level: 1, email: 'rahasia@contoh.id', displayName: 'Nama Asli SPT', history: [] }
  };
  const read = reader(data), summary = PP.summarizeWith(read), analysis = LA.analyze(read);
  const rec = LA.buildRecap({ summary, analysis, hub: { level: 3, totalXp: 390, streak: 2 }, name: '  Budi   Santoso \u0007 ', email: 'budi@contoh.id', includeEmail: false, now: NOW });
  eq([rec.format, rec.version, rec.createdAt], ['portal-belajar-rekap', 1, NOW.toISOString()], 'penanda format, versi, waktu');
  eq(rec.participant, { name: 'Budi Santoso' }, 'nama dirapikan (spasi ganda & karakter kontrol); email TIDAK ikut tanpa persetujuan');
  const json = JSON.stringify(rec);
  for (const secret of ['PT RAHASIA ABADI', '99.999.999.9-999.999', 'Jl. Pribadi 1', 'rahasia@contoh.id', 'Nama Asli SPT', 'budi@contoh.id']) check(!json.includes(secret), 'rekap TIDAK memuat: ' + secret);
  eq(rec.modules.map((m) => m.id).sort(), ['accounting', 'excel', 'spt', 'sqlpq'], 'ringkasan keempat modul');
  const xl = rec.modules.find((m) => m.id === 'excel'); eq([xl.xp, xl.activities, xl.scorePct, xl.started], [90, 10, 60, true], 'angka modul = ringkasan nyata agregator');
  check(rec.weak.every((w) => w.label !== 'Fungsi VLOOKUP'), 'topik tentatif (1 percobaan) tidak masuk rekap');
  check(rec.weak.some((w) => w.label === 'Fungsi IF') && rec.weak.some((w) => w.moduleId === 'sqlpq'), 'topik lemah yang pasti ikut');
  eq(rec.hub, { level: 3, totalXp: 390, streak: 2 }, 'ringkasan Game Hub ikut');
  check(json.length < 20000, 'ukuran rekap kecil (<20 KB): ' + json.length + ' B');
  const withEmail = LA.buildRecap({ summary, analysis, name: 'Budi', email: 'budi@contoh.id', includeEmail: true, now: NOW });
  eq(withEmail.participant.email, 'budi@contoh.id', 'email ikut HANYA bila dipilih');
  eq(LA.buildRecap({ summary, analysis, name: 'Budi', email: 'bukan-email', includeEmail: true, now: NOW }).participant.email, undefined, 'email tidak valid dibuang');
  eq(LA.buildRecap({ summary, analysis, name: '   ', now: NOW }).participant.name, 'Peserta', 'nama kosong → "Peserta"');
  eq(LA.buildRecap({ summary, analysis, name: 'X'.repeat(500), now: NOW }).participant.name.length, 60, 'nama dibatasi 60 karakter');
  check(CE.parseRecap(json, NOW).ok, 'rekap yang dibuat peserta lolos validasi pengajar (round-trip)');
  eq(LA.buildRecap({ summary: { modules: [] }, analysis: { modules: {} }, name: 'Kosong', now: NOW }).modules, [], 'tanpa data: modul kosong, tidak ada angka karangan');
}

/* ============ C. VALIDASI REKAP ============ */
section('C. Berkas rekap tak tepercaya');
{
  const good = () => ({ format: 'portal-belajar-rekap', version: 1, createdAt: day(1), participant: { name: 'Siti', email: 'siti@contoh.id' },
    modules: [{ id: 'excel', xp: 100, level: 2, activities: 10, scorePct: 80, started: true, lastActive: day(2) }], weak: [{ moduleId: 'excel', label: 'Fungsi IF', detail: '1 dari 4', priority: 70 }], hub: { level: 2, totalXp: 100, streak: 1 } });
  const ok = (o) => CE.parseRecap(JSON.stringify(o), NOW);
  const bad = (label, o) => { const r = typeof o === 'string' ? CE.parseRecap(o, NOW) : ok(o); check(!r.ok && typeof r.error === 'string', 'ditolak: ' + label + (r.ok ? ' (MALAH DITERIMA)' : '')); };
  const g = ok(good()); check(g.ok && g.recap.name === 'Siti' && g.recap.email === 'siti@contoh.id', 'rekap valid diterima');
  bad('bukan JSON', '{rusak'); bad('array', '[]'); bad('null', 'null'); bad('angka', '5'); bad('string kosong', '');
  bad('terlalu besar', JSON.stringify({ ...good(), pad: 'x'.repeat(100001) }));
  bad('format salah', { ...good(), format: 'lain' }); bad('versi 2', { ...good(), version: 2 }); bad('tanpa versi', (({ version, ...r }) => r)(good()));
  bad('tanggal bukan teks', { ...good(), createdAt: 12345 }); bad('tanggal rusak', { ...good(), createdAt: 'kemarin' });
  bad('tanggal masa depan jauh', { ...good(), createdAt: new Date(NOW.getTime() + 30 * 86400000).toISOString() });
  bad('tanggal sebelum 2000', { ...good(), createdAt: '1999-01-01T00:00:00Z' });
  bad('tanpa peserta', { ...good(), participant: null }); bad('nama kosong', { ...good(), participant: { name: '   ' } }); bad('nama hanya karakter kontrol', { ...good(), participant: { name: '\u0000\u0007' } }); bad('nama bukan teks', { ...good(), participant: { name: 5 } });
  bad('modul bukan array', { ...good(), modules: {} }); bad('modul tak dikenal', { ...good(), modules: [{ id: 'admin' }] }); bad('modul ganda', { ...good(), modules: [good().modules[0], good().modules[0]] });
  bad('modul lebih dari 4', { ...good(), modules: ['spt', 'accounting', 'excel', 'sqlpq', 'excel'].map((id) => ({ id })) }); bad('weak bukan array', { ...good(), weak: 'x' });
  const clamp = ok({ ...good(), modules: [{ id: 'sqlpq', xp: -50, level: 0, activities: 1e30, scorePct: 250, started: 'ya', lastActive: 'x' }] }).recap.modules[0];
  eq([clamp.xp, clamp.level, clamp.activities <= 10000000, clamp.scorePct, clamp.started, clamp.lastActive], [0, 1, true, 100, false, null], 'angka dipaksa ke rentang; tipe salah → nilai aman');
  eq(ok({ ...good(), modules: [{ id: 'sqlpq', xp: 5, scorePct: 'tinggi' }] }).recap.modules[0].scorePct, null, 'skor non-angka → null');
  const hostile = ok({ ...good(), isAdmin: true, __proto__: { admin: 1 }, participant: { name: '<img src=x onerror=alert(1)>', email: 'a@b.co', role: 'dosen' }, modules: [{ id: 'excel', xp: 5, secret: 'x' }] });
  check(hostile.ok && !('isAdmin' in hostile.recap) && !('role' in hostile.recap) && !('secret' in hostile.recap.modules[0]), 'field asing dibuang');
  eq(hostile.recap.name, '<img src=x onerror=alert(1)>', 'nama disimpan sebagai TEKS apa adanya (UI wajib merender dengan textContent)');
  eq(({}).admin, undefined, 'prototype tidak tercemar');
  eq(ok({ ...good(), participant: { name: 'A', email: '<x>@y.z' } }).recap.email, '', 'email tak valid dibuang');
  eq(ok({ ...good(), weak: [{ moduleId: 'hack', label: 'x' }, { moduleId: 'excel', label: '' }, { moduleId: 'excel', label: 'ok', priority: 9999 }, 5, null] }).recap.weak.length, 1, 'topik lemah rusak dibuang, yang valid tetap');
  eq(ok({ ...good(), weak: [{ moduleId: 'excel', label: 'ok', priority: 9999 }] }).recap.weak[0].priority, 100, 'prioritas dibatasi 100');
  eq(ok({ ...good(), weak: Array.from({ length: 50 }, (_, i) => ({ moduleId: 'excel', label: 'T' + i, priority: 1 })) }).recap.weak.length, 12, 'topik lemah dibatasi 12');
  check(CE.parseRecap('\uFEFF' + JSON.stringify(good()), NOW).ok, 'berkas ber-BOM (dari editor Windows) tetap terbaca');
  eq(ok({ ...good(), hub: 'x' }).recap.hub, null, 'hub rusak → null');
  eq(ok({ ...good(), hub: { level: 1e9, totalXp: -3, streak: 'a' } }).recap.hub, { level: 99, totalXp: 0, streak: 0 }, 'hub dipaksa ke rentang');
}

/* ============ D. RINGKASAN KELOMPOK ============ */
section('D. Ringkasan kelompok');
{
  const R = (name, mods, extra = {}) => CE.parseRecap(JSON.stringify({ format: 'portal-belajar-rekap', version: 1, createdAt: day(0), participant: { name, email: extra.email || '' }, modules: mods, weak: extra.weak || [], hub: extra.hub || null }), NOW).recap;
  const m = (id, xp, act, score, lastDays, started = true) => ({ id, xp, level: 1, activities: act, scorePct: score, started, lastActive: lastDays === null ? null : day(lastDays) });
  const list = [
    R('Ani', [m('excel', 200, 20, 90, 1), m('sqlpq', 100, 10, 70, 2)], { weak: [{ moduleId: 'excel', label: 'Fungsi IF', priority: 80 }], hub: { level: 3, totalXp: 300, streak: 1 } }),
    R('Budi', [m('excel', 50, 10, 40, 3), m('accounting', 30, 5, 50, 4)], { weak: [{ moduleId: 'excel', label: 'Fungsi IF', priority: 60 }, { moduleId: 'excel', label: 'Fungsi IF', priority: 99 }, { moduleId: 'accounting', label: 'Sisi debit/kredit', priority: 70 }] }),
    R('Citra', [m('sqlpq', 400, 40, 95, 7)]),                                  // tepat 7 hari = masih aktif
    R('Dewi', [m('spt', 20, 6, 80, 8)]),                                       // 8 hari = tidak aktif
    R('Eko', [m('excel', 0, 0, null, null, false)]),                           // belum mulai
    R('Fajar', [m('excel', 10, 4, 10, 1)]),                                   // skor buruk tetapi hanya 4 aktivitas
  ];
  const a = CE.aggregate(list, NOW), by = Object.fromEntries(a.rows.map((r) => [r.name, r]));
  eq(a.cohort.count, 6, '6 peserta');
  eq([by.Ani.totalXp, by.Budi.totalXp, by.Citra.totalXp], [300, 80, 400], 'total XP per peserta');
  eq(by.Ani.avgScore, Math.round((90 * 20 + 70 * 10) / 30), 'skor rata-rata TERTIMBANG aktivitas (bukan rata-rata biasa)');
  eq(by.Eko.avgScore, null, 'tanpa aktivitas: skor null (bukan 0)');
  eq([by.Citra.inactive, by.Citra.daysInactive], [false, 7], 'tepat 7 hari tidak aktif masih dianggap aktif');
  eq([by.Dewi.inactive, by.Dewi.daysInactive], [true, 8], '8 hari → tidak aktif');
  eq(by.Eko.inactive, true, 'tak pernah aktif → tidak aktif');
  eq([by.Budi.struggling, by.Fajar.struggling, by.Ani.struggling], [true, false, false], 'perlu perhatian: skor <60 dan ≥5 aktivitas (Fajar 4 aktivitas belum dinilai)');
  eq(by.Budi.weakest, 'Fungsi IF (Excel Formula Practice)', 'topik terlemah = item pertama rekap');
  eq(a.cohort.avgXp, Math.round((300 + 80 + 400 + 20 + 0 + 10) / 6), 'rata-rata XP');
  eq(a.cohort.medianXp, Math.round((20 + 80) / 2), 'median XP (genap = rata-rata dua tengah)');
  eq([a.cohort.active, a.cohort.inactive, a.cohort.struggling], [4, 2, 1], 'aktif (Ani, Budi, Citra, Fajar) / tidak aktif (Dewi, Eko) / perlu perhatian (Budi)');
  eq(a.perModule.excel.started, 3, 'excel: 3 peserta mulai (Ani, Budi, Fajar)');
  eq(a.perModule.excel.avgScore, Math.round((90 * 20 + 40 * 10 + 10 * 4) / 34), 'skor modul tertimbang aktivitas');
  eq(a.perModule.sqlpq.avgXp, Math.round((100 + 400) / 2), 'rata-rata XP modul');
  eq(a.topWeak[0], { moduleId: 'excel', moduleLabel: 'Excel Formula Practice', label: 'Fungsi IF', people: 2, avgPriority: Math.round((80 + 60) / 2) }, 'topik tersulit: dihitung per ORANG (Budi dua kali = 1 orang)');
  eq(a.topWeak.length, 2, 'dua topik berbeda');
  const empty = CE.aggregate([], NOW); eq([empty.cohort.count, empty.cohort.avgXp, empty.cohort.avgScore, empty.topWeak], [0, 0, null, []], 'daftar kosong aman');

  // dedupe
  const d1 = R('Ani', [m('excel', 10, 1, 50, 1)]); d1.createdAt = day(5);
  const d2 = R('ani', [m('excel', 999, 50, 99, 0)]); d2.createdAt = day(0);
  const dd = CE.dedupe([d2, d1]);
  eq([dd.list.length, dd.replaced, dd.list[0].modules[0].xp], [1, 1, 999], 'peserta yang sama (nama sama, huruf besar/kecil tak dibedakan): rekap terbaru menang, urutan masuk tidak berpengaruh');
  eq(CE.dedupe([R('Ani', [], { email: 'a@x.id' }), R('Ani', [], { email: 'b@x.id' })]).list.length, 2, 'nama sama tetapi email beda = dua orang');
}

/* ============ E. CSV ============ */
section('E. CSV aman');
{
  eq(CE.csvCell('=CMD|"/c calc"!A1'), '"\'=CMD|""/c calc""!A1"', 'rumus diawali = dinetralkan + kutip ganda di-escape');
  for (const s of ['+1+1', '-2+3', '@SUM(A1)', '\tx', '\rx']) check(CE.csvCell(s).startsWith('"\''), 'dinetralkan: ' + JSON.stringify(s));
  eq(CE.csvCell('biasa, dengan koma'), '"biasa, dengan koma"', 'koma dikutip');
  eq(CE.csvCell('baris\nbaru'), '"baris\nbaru"', 'baris baru dikutip');
  eq(CE.csvCell(null), '""', 'null → kosong'); eq(CE.csvCell(0), '"0"', 'angka 0 tetap tampil');
  const rec = CE.parseRecap(JSON.stringify({ format: 'portal-belajar-rekap', version: 1, createdAt: day(0), participant: { name: '=HYPERLINK("http://jahat","klik")', email: '' }, modules: [{ id: 'excel', xp: 5, activities: 1, scorePct: 50, started: true, lastActive: day(1) }], weak: [{ moduleId: 'excel', label: '+evil', priority: 1 }] }), NOW).recap;
  const csv = CE.toCsv(CE.aggregate([rec], NOW).rows);
  check(csv.startsWith('\uFEFF'), 'CSV ber-BOM agar Excel membaca UTF-8');
  const lines = csv.trim().split('\r\n'); eq(lines.length, 2, 'header + 1 baris');
  check(lines[1].startsWith('"\'=HYPERLINK'), 'nama berawalan = dinetralkan di CSV (tidak jadi rumus saat dibuka di Excel)');
  check(lines[1].includes('"\'+evil'), 'topik terlemah diawali + juga dinetralkan');
  eq(lines[0].split('","').length, 16, '16 kolom');
}

console.log(`\n========== test-analytics: ${passed} lolos, ${failed} gagal ==========`);
process.exit(failed ? 1 : 0);
