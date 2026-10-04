// Test progres lintas modul portal (js/shared/progress-aggregator.js).
// Tiga lapis:
//   A. SINKRON — key & rumus di aggregator dibandingkan LANGSUNG dengan kode sumber tiap modul
//      (kalau sebuah modul mengganti key/skema progresnya, test ini gagal).
//   B. DATA NYATA — progres dihasilkan oleh engine asli (SQL progress-manager, Excel progress-manager)
//      lalu dibaca aggregator, bukan fixture tulisan tangan.
//   C. EKSPOR/IMPOR — round-trip, merge vs replace, keamanan (allowlist, ukuran, data rusak), atomik.
// Tanpa dependency; jalankan:  node tests/test-portal-progress.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const sameVal = (x, y) => (typeof x === 'number' || typeof y === 'number') ? Object.is(x, y) : true; // JSON.stringify menyamakan NaN dengan null — jangan
const eq = (a, b, l) => { const ok = sameVal(a, b) && JSON.stringify(a) === JSON.stringify(b); if (!ok) console.log(`    diharapkan: ${JSON.stringify(b)}\n    didapat   : ${JSON.stringify(a)}`); check(ok, l); };
const section = (t) => console.log('\n=== ' + t + ' ===');
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');

function makeStorage(initial = {}, opts = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (opts.failOn && opts.failOn(k, v)) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m), has: (k) => m.has(k)
  };
}
globalThis.window = globalThis;
globalThis.localStorage = makeStorage();
vm.runInThisContext(src('js/shared/progress-aggregator.js'), { filename: 'progress-aggregator.js' });
const PP = globalThis.PortalProgress;
const byId = (sum, id) => sum.modules.find((m) => m.id === id);

/* ============ A. SINKRON dengan kode sumber modul ============ */
section('A. Key & skema sinkron dengan kode sumber modul');
{
  // SPT: daftar key = BACKUP_KEYS di backup-utils.js
  const spt = src('apps/spt/js/shared/backup-utils.js');
  const block = spt.match(/const BACKUP_KEYS = \[([\s\S]*?)\];/)[1];
  const sptKeys = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  eq([...PP.MODULES.find((m) => m.id === 'spt').keys].sort(), [...sptKeys].sort(), 'key SPT di aggregator = BACKUP_KEYS di apps/spt/js/shared/backup-utils.js');
  check(src('apps/spt/tax_career/app.js').includes('const STORAGE_KEY = "spt_tax_career_progress"'), 'key Tax Career sama dengan di tax_career/app.js');
  check(src('apps/spt/faktur_bupot/script.js').includes("FK_HISTORY_KEY = 'simspt_faktur_history_v1'") && src('apps/spt/faktur_bupot/script.js').includes("BP_HISTORY_KEY = 'simspt_bupot_history_v1'"), 'key riwayat Faktur/Bupot sama dengan di faktur_bupot/script.js');
  check(/localStorage\.setItem\('spt_simulator_data'/.test(src('apps/spt/js/app-main.js')) && /updatedAt/.test(src('apps/spt/js/app-main.js')), 'SPT masih menyimpan spt_simulator_data dengan updatedAt');
  // Accounting
  const c = src('apps/accounting/js/utils/constants.js');
  check(c.includes("APP_STATE: 'ACT_MASTER_STATE'") && c.includes("TAX_STATE: 'ACT_MASTER_TAX_STATE'"), 'key ACT_MASTER_STATE & ACT_MASTER_TAX_STATE sama dengan constants.js');
  check(src('apps/accounting/js/business/scoringEngine.js').includes("PROGRESS_KEY = 'ACT_MASTER_PROGRESS'"), 'key ACT_MASTER_PROGRESS sama dengan scoringEngine.js');
  const ls = src('apps/accounting/js/storage/localStorage.js');
  check(/xp: data\.xp/.test(ls) && /userLevel: data\.userLevel/.test(ls) && /badges: data\.badges/.test(ls), 'skema ACT_MASTER_STATE (xp/userLevel/badges) sama dengan saveAppState');
  const sp = src('apps/accounting/js/business/scoringEngine.js');
  check(['attemptCount', 'correctCount', 'bestGrade', 'bestScore', 'history'].every((f) => sp.includes(f + ':')), 'field ACT_MASTER_PROGRESS yang dibaca aggregator masih ada di scoringEngine.js');
  check(/Math\.floor\(state\.xp \/ 100\) \+ 1/.test(src('apps/accounting/js/business/appState.js')), 'level Accounting = floor(xp/100)+1 (dipakai sebagai fallback)');
  // Excel
  check(src('apps/excel/js/storage-manager.js').includes("const NAMESPACE = 'efpg'") && src('apps/excel/js/progress-manager.js').includes("const PROGRESS_KEY = 'progress'"), "key Excel 'efpg:progress' sama dengan storage-manager/progress-manager");
  // SQL
  const spm = src('apps/sql-pq/js/progress-manager.js');
  check(spm.includes("'sqlpq_progress_v1'") || spm.includes('"sqlpq_progress_v1"'), 'key SQL progress sama dengan progress-manager.js');
  check(src('apps/sql-pq/js/app.js').includes('"sqlpq_dataset_history_v1"'), 'key riwayat dataset SQL sama dengan app.js');
  // Allowlist TIDAK boleh memuat sesi login / tema / state sementara
  const forbidden = ['unified_portal_session', 'portal_display_name', 'theme', 'sqlpq_theme', 'spt_pending_name', 'spt_pending_email', 'ACT_MASTER_SESSION', 'hasVisited_ActMasterPro', 'preferredPaperSize'];
  check(forbidden.every((k) => !PP.ALL_KEYS.includes(k)), 'allowlist tidak memuat sesi login, tema, atau state sementara');
  eq(new Set(PP.ALL_KEYS).size, PP.ALL_KEYS.length, 'tidak ada key yang dimiliki dua modul');
  check(Object.keys(PP.JSON_SHAPES).every((k) => PP.ALL_KEYS.includes(k)), 'setiap key di peta bentuk JSON (JSON_SHAPES) ada di allowlist — tidak ada typo yang diam-diam menonaktifkan validasi');
  const coreKeys = ['spt_simulator_data', 'spt_tax_career_progress', 'simspt_faktur_history_v1', 'simspt_bupot_history_v1', 'ACT_MASTER_STATE', 'ACT_MASTER_PROGRESS', 'ACT_MASTER_TAX_STATE', 'efpg:progress', 'sqlpq_progress_v1', 'sqlpq_dataset_history_v1'];
  eq(Object.keys(PP.JSON_SHAPES).sort(), [...coreKeys].sort(), 'semua key inti punya validasi bentuk JSON');
}

/* ============ B. DATA NYATA dari engine modul ============ */
section('B. Ringkasan dari data yang dihasilkan engine asli');
{
  // --- SQL: pakai progress-manager.js asli ---
  globalThis.localStorage = makeStorage();
  globalThis.document = { createElement: () => ({}), addEventListener() {} };
  vm.runInThisContext(src('apps/sql-pq/js/progress-manager.js'), { filename: 'sql-progress-manager.js' });
  const SQ = globalThis.SQLPQ_Progress;
  SQ.reset();
  const q = (id, concept) => ({ id, concept, level: 1, conceptLabel: concept });
  SQ.recordAnswer(q('a', 'where'), true, 0); SQ.recordAnswer(q('b', 'join'), true, 0); SQ.recordAnswer(q('c', 'join'), false, 0);
  SQ.recordLessonComplete('sql:select', 'SELECT'); SQ.touchStreak();
  SQ.addXp(200);
  const sqlSum = byId(PP.summarize(globalThis.localStorage), 'sqlpq');
  eq(sqlSum.xp, SQ.getState().xp, 'SQL: XP sama dengan state engine');
  eq(sqlSum.level, SQ.getLevel(), 'SQL: level hitungan aggregator = SQLPQ_Progress.getLevel()');
  eq(sqlSum.activities, 3, 'SQL: 3 soal dijawab');
  eq(sqlSum.scorePct, SQ.accuracy(), 'SQL: akurasi sama dengan SQLPQ_Progress.accuracy()');
  check(sqlSum.started && sqlSum.highlights.some((h) => /pelajaran/.test(h)), 'SQL: started + sorotan pelajaran');
  check(sqlSum.lastActive && Math.abs(sqlSum.lastActive - Date.now()) < 5 * 60 * 1000, 'SQL: lastActive ≈ sekarang');
  // level di berbagai XP (menjaga rumus tetap sama dengan engine)
  for (const xp of [0, 149, 150, 299, 300, 5000]) {
    SQ.reset(); SQ.addXp(xp);
    eq(byId(PP.summarize(globalThis.localStorage), 'sqlpq').level, SQ.getLevel(), `SQL: level konsisten pada XP ${xp}`);
  }

  // --- Excel: pakai progress-manager.js asli (ES module) ---
  const mem = new Map();
  globalThis.localStorage = globalThis.window.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
  const ex = await import(pathToFileURL(join(ROOT, 'apps/excel/js/progress-manager.js')).href);
  eq(byId(PP.summarize(globalThis.localStorage), 'excel').started, false, 'Excel: tanpa data → belum dimulai');
  const Q = (title, fn, points) => ({ title, acceptedFunctions: [fn], points });
  ex.recordAttempt({ question: Q('Total penjualan', 'SUM', 10), status: 'correct' });
  ex.recordAttempt({ question: Q('Rata-rata', 'AVERAGE', 10), status: 'correct', hintsUsed: 1 });
  ex.recordAttempt({ question: Q('Cek IF', 'IF', 20), status: 'wrong' });
  ex.recordAttempt({ question: Q('Hitung COUNT', 'COUNT', 10), status: 'correct' });
  const real = ex.getStats();
  const exSum = byId(PP.summarize(globalThis.localStorage), 'excel');
  eq([exSum.xp, exSum.level, exSum.activities], [real.xp, real.levelAktif, real.soalDikerjakan], 'Excel: XP/level soal/aktivitas sama dengan getStats() engine asli');
  eq(exSum.scorePct, ex.successRate(real), 'Excel: akurasi sama dengan successRate() engine asli');
  eq(exSum.activities, 4, 'Excel: 4 soal dikerjakan');
  check(exSum.highlights.some((h) => /3 fungsi rumus dikuasai/.test(h)), 'Excel: SUM, AVERAGE, COUNT dikuasai; IF (salah) tidak dihitung');
  check(Date.now() - exSum.lastActive < 5 * 60 * 1000 && exSum.lastActive <= Date.now() + 1000, 'Excel: lastActive ≈ sekarang (riwayat engine berurutan terbaru-dulu)');
  // urutan riwayat tidak boleh memengaruhi hasil
  const raw = JSON.parse(globalThis.localStorage.getItem('efpg:progress'));
  raw.riwayat = [{ waktu: '2026-01-01T00:00:00Z' }, { waktu: '2026-09-25T08:00:00Z' }, { waktu: '2026-05-05T00:00:00Z' }];
  globalThis.localStorage.setItem('efpg:progress', JSON.stringify(raw));
  eq(byId(PP.summarize(globalThis.localStorage), 'excel').lastActive, Date.parse('2026-09-25T08:00:00Z'), 'Excel: lastActive = yang terbaru walau urutan riwayat acak');
  globalThis.localStorage = globalThis.window.localStorage = makeStorage();
}

section('B2. Bentuk data modul lain (sesuai skema di kode sumber)');
{
  const st = makeStorage({
    spt_simulator_data: JSON.stringify({ xp: 450, level: 3, email: 'a@b.id', displayName: 'Ran', updatedAt: 1790000000000, history: [{ date: '1/9/2026', module: '1770 SS', mode: 'form', score: 80 }, { date: '2/9/2026', module: '1771', mode: 'kasus', score: 60 }] }),
    spt_tax_career_progress: JSON.stringify({ byTrack: { a: { score: 90, total: 100, correct: 9, incorrect: 1, at: 1790000100000 }, b: { score: 70, at: 1 } }, updatedAt: 1790000200000 }),
    simspt_faktur_history_v1: JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]),
    simspt_bupot_history_v1: JSON.stringify([{ id: 1 }]),
    ACT_MASTER_STATE: JSON.stringify({ xp: 250, userLevel: 3, badges: [{ id: 'a', unlocked: true }, { id: 'b', unlocked: false }] }),
    ACT_MASTER_PROGRESS: JSON.stringify({ attemptCount: 8, correctCount: 6, bestGrade: 'A', bestScore: 94.6, history: [{ ts: 1790000300000 }, { ts: 1 }] })
  });
  const sum = PP.summarize(st);
  const spt = byId(sum, 'spt'), acc = byId(sum, 'accounting');
  eq([spt.xp, spt.level, spt.scorePct], [450, 3, 70], 'SPT: XP, level tersimpan, skor rata-rata (80+60)/2');
  eq(spt.activities, 2 + 2 + 3 + 1, 'SPT: aktivitas = riwayat dashboard + jalur Tax Career + faktur + bupot');
  eq(spt.lastActive, 1790000200000, 'SPT: lastActive = yang terbaru dari dashboard/Tax Career');
  check(spt.highlights.some((h) => /Tax Career: 2 jalur dikerjakan \(rata-rata 80\)/.test(h)), 'SPT: sorotan Tax Career');
  eq([acc.xp, acc.level, acc.activities, acc.scorePct, acc.lastActive], [250, 3, 8, 75, 1790000300000], 'Accounting: XP/level dari ACT_MASTER_STATE; percobaan & akurasi dari ACT_MASTER_PROGRESS');
  check(acc.highlights.includes('1 badge terbuka') && acc.highlights.some((h) => /Nilai terbaik: A \(95\)/.test(h)), 'Accounting: badge terbuka & nilai terbaik');
  eq(sum.totals.xp, 450 + 250, 'total XP = jumlah XP modul');
  eq(sum.totals.startedModules, 2, 'modul dimulai = 2');
  eq(byId(sum, 'excel').started, false, 'Excel belum dimulai');
  eq(byId(sum, 'sqlpq').started, false, 'SQL belum dimulai');
}

section('B3. Ketahanan terhadap data rusak / aneh');
{
  const junk = ['', 'null', '{rusak', '[]', '"teks"', '123', '{"xp":"banyak"}', '{"xp":-5,"level":"x"}', '{"xp":1e999}'];
  for (const raw of junk) {
    const st = makeStorage({ spt_simulator_data: raw, ACT_MASTER_STATE: raw, ACT_MASTER_PROGRESS: raw, 'efpg:progress': raw, sqlpq_progress_v1: raw, spt_tax_career_progress: raw, simspt_faktur_history_v1: raw });
    let sum, threw = false;
    try { sum = PP.summarize(st); } catch (e) { threw = true; }
    check(!threw, 'tidak crash pada data: ' + JSON.stringify(raw));
    if (sum) check(sum.modules.every((m) => Number.isFinite(m.xp) && m.xp >= 0 && Number.isFinite(m.level) && m.level >= 1), 'XP/level selalu angka valid pada data: ' + JSON.stringify(raw));
  }
  const throwing = { getItem() { throw new Error('SecurityError'); } };
  let ok = true; try { PP.summarize(throwing); } catch (e) { ok = false; }
  check(ok, 'storage yang melempar error pada getItem tidak membuat summarize crash');
  const s2 = PP.summarize(makeStorage({ ACT_MASTER_PROGRESS: JSON.stringify({ attemptCount: 0, correctCount: 0, bestGrade: 'E', history: [] }) }));
  check(byId(s2, 'accounting').scorePct === null, 'akurasi persis null (bukan NaN/0%) bila belum ada percobaan');
  const allEmpty = PP.summarize(makeStorage({ efpg_x: '1', 'efpg:progress': JSON.stringify({ soalDikerjakan: 0, jawabanBenar: 0 }), sqlpq_progress_v1: JSON.stringify({ totalAnswered: 0, totalCorrect: 0 }) }));
  check(allEmpty.modules.every((m) => m.scorePct === null || Number.isFinite(m.scorePct)), 'scorePct selalu null atau angka hingga (tidak pernah NaN/Infinity)');
}

/* ============ C. EKSPOR / IMPOR ============ */
section('C. Ekspor');
const rich = () => makeStorage({
  spt_simulator_data: JSON.stringify({ xp: 300, level: 2, email: 'x@y.id', displayName: 'Ran', updatedAt: 1000, history: [{ date: 'd', module: 'm', mode: 'form', score: 50 }] }),
  spt_npwp: '01.234.567.8-901.000',
  ACT_MASTER_STATE: JSON.stringify({ xp: 120, userLevel: 2, badges: [] }),
  ACT_MASTER_PROGRESS: JSON.stringify({ attemptCount: 3, correctCount: 2, history: [] }),
  'efpg:progress': JSON.stringify({ soalDikerjakan: 5, jawabanBenar: 4, xp: 60, levelAktif: 2, badges: [], rumusDipelajari: {}, riwayat: [] }),
  sqlpq_progress_v1: JSON.stringify({ xp: 80, totalAnswered: 6, totalCorrect: 3, completedLessons: {}, history: [] }),
  // data yang TIDAK boleh ikut diekspor:
  unified_portal_session: JSON.stringify({ uid: 'u1', email: 'rahasia@x.id' }), theme: 'dark', portal_display_name: 'Ran', spt_pending_email: 'p@q.id', ACT_MASTER_SESSION: '{"drafts":1}'
});
{
  const st = rich();
  const exp = PP.buildExport(st, { name: 'Ran Tester' });
  check(exp.__portal_progress_backup === true && exp.version === 1 && typeof exp.exportedAt === 'string', 'penanda format + versi + waktu ekspor');
  eq(exp.user, { displayName: 'Ran Tester' }, 'nama tampilan ikut (informasi)');
  eq(Object.keys(exp.data).sort(), ['ACT_MASTER_PROGRESS', 'ACT_MASTER_STATE', 'efpg:progress', 'spt_npwp', 'spt_simulator_data', 'sqlpq_progress_v1'], 'hanya key progres yang diekspor');
  check(!JSON.stringify(exp).includes('rahasia@x.id') && !JSON.stringify(exp).includes('unified_portal_session'), 'sesi login TIDAK bocor ke file ekspor');
  check(!('theme' in exp.data) && !('spt_pending_email' in exp.data) && !('ACT_MASTER_SESSION' in exp.data), 'tema/state sementara tidak ikut');
  eq(exp.summary.totalXp, 300 + 120 + 60 + 80, 'ringkasan total XP di berkas');
  eq(PP.buildExport(makeStorage(), {}).data, {}, 'storage kosong → data kosong');
  check(!('user' in PP.buildExport(st, {})), 'tanpa nama → tidak ada field user');
  check(PP.buildExport(st, { name: 'x'.repeat(500) }).user.displayName.length === 100, 'nama dipotong 100 karakter');
}

section('C2. Round-trip & mode impor');
{
  const src1 = rich();
  const file = JSON.stringify(PP.buildExport(src1, { name: 'Ran' }));
  const fresh = makeStorage();
  const r = PP.applyImport(fresh, file, { mode: 'merge' });
  check(r.ok && r.report.every((x) => x.action === 'imported'), 'impor ke perangkat kosong → semua modul dipulihkan');
  const a = PP.summarize(src1), b = PP.summarize(fresh);
  const strip = (s) => s.modules.map((m) => ({ id: m.id, xp: m.xp, level: m.level, activities: m.activities, scorePct: m.scorePct }));
  eq(strip(b), strip(a), 'round-trip: ringkasan identik dengan sumber');
  eq(fresh.getItem('ACT_MASTER_STATE'), src1.getItem('ACT_MASTER_STATE'), 'round-trip: nilai key identik byte-per-byte');
  eq(fresh.getItem('spt_npwp'), '01.234.567.8-901.000', 'key teks biasa (NPWP) ikut dipulihkan');
  check(!fresh.has('unified_portal_session') && !fresh.has('theme'), 'impor tidak menyentuh sesi/tema');
  check(JSON.parse(fresh.getItem('spt_simulator_data')).updatedAt > 1000, 'spt_simulator_data ditandai terbaru (updatedAt dinaikkan) seperti restore bawaan SPT');
  check(JSON.parse(src1.getItem('spt_simulator_data')).updatedAt === 1000, 'sumber tidak berubah');
}
{
  // merge: yang lebih maju menang PER MODUL
  const incoming = JSON.stringify(PP.buildExport(makeStorage({
    ACT_MASTER_STATE: JSON.stringify({ xp: 500, userLevel: 6, badges: [] }), 'efpg:progress': JSON.stringify({ soalDikerjakan: 2, jawabanBenar: 1, xp: 10, levelAktif: 1, badges: [], rumusDipelajari: {}, riwayat: [] })
  }), {}));
  const local = makeStorage({
    ACT_MASTER_STATE: JSON.stringify({ xp: 100, userLevel: 2, badges: [] }), 'efpg:progress': JSON.stringify({ soalDikerjakan: 20, jawabanBenar: 15, xp: 300, levelAktif: 3, badges: [], rumusDipelajari: {}, riwayat: [] })
  });
  const r = PP.applyImport(local, incoming, { mode: 'merge' });
  const act = Object.fromEntries(r.report.map((x) => [x.id, x.action]));
  eq(act, { accounting: 'imported', excel: 'kept-local' }, 'merge: Accounting (berkas lebih maju) dipulihkan; Excel (lokal lebih maju) dipertahankan');
  eq(JSON.parse(local.getItem('ACT_MASTER_STATE')).xp, 500, 'merge: Accounting benar-benar tertulis');
  eq(JSON.parse(local.getItem('efpg:progress')).xp, 300, 'merge: Excel lokal tidak tertimpa');
  eq(r.written, ['ACT_MASTER_STATE'], 'hanya key modul yang dipulihkan yang ditulis');
  // replace menimpa meski lokal lebih maju
  const r2 = PP.applyImport(local, incoming, { mode: 'replace' });
  eq(JSON.parse(local.getItem('efpg:progress')).xp, 10, 'replace: menimpa meski lokal lebih maju');
  check(r2.report.every((x) => x.action === 'imported'), 'replace: semua modul "imported"');
  // XP sama → bandingkan aktivitas; sama persis → pertahankan lokal
  const eqLocal = makeStorage({ 'efpg:progress': JSON.stringify({ soalDikerjakan: 5, jawabanBenar: 3, xp: 50, levelAktif: 1, badges: [], rumusDipelajari: {}, riwayat: [] }) });
  const mkInc = (n) => JSON.stringify(PP.buildExport(makeStorage({ 'efpg:progress': JSON.stringify({ soalDikerjakan: n, jawabanBenar: 3, xp: 50, levelAktif: 1, badges: [], rumusDipelajari: {}, riwayat: [] }) }), {}));
  eq(PP.applyImport(eqLocal, mkInc(5), { mode: 'merge' }).report[0].action, 'kept-local', 'merge: seri persis → pertahankan lokal');
  eq(PP.applyImport(eqLocal, mkInc(9), { mode: 'merge' }).report[0].action, 'imported', 'merge: XP sama tapi aktivitas lebih banyak → pulihkan');
  // modul lokal "belum dimulai" selalu dipulihkan di merge
  eq(PP.applyImport(makeStorage(), mkInc(1), { mode: 'merge' }).report[0].action, 'imported', 'merge: lokal kosong → pulihkan');
  eq(PP.applyImport(makeStorage(), mkInc(1)).mode, 'merge', 'mode default = merge');
}

section('C3. Impor — format & kompatibilitas');
{
  // cadangan lengkap SPT (format __simspt_backup) harus bisa dipulihkan
  const sptBackup = { __simspt_backup: true, version: 1, exportedAt: '2026-09-01T00:00:00.000Z', data: { spt_simulator_data: JSON.stringify({ xp: 90, level: 1, history: [] }), spt_npwp: '123', theme: 'dark' } };
  const st = makeStorage();
  const r = PP.applyImport(st, JSON.stringify(sptBackup), { mode: 'merge' });
  check(r.ok && r.kind === 'spt', 'cadangan SPT (__simspt_backup) diterima lewat portal');
  check(st.has('spt_simulator_data') && st.getItem('spt_npwp') === '123', 'key SPT dipulihkan');
  check(!st.has('theme'), "key 'theme' di cadangan SPT diabaikan (bukan progres)");
  eq(r.rejectedKeys.map((k) => k.key), ['theme'], "'theme' dilaporkan sebagai item yang diabaikan");
  // input berupa objek, bukan teks
  check(PP.inspectImport(sptBackup).ok, 'inspectImport menerima objek maupun teks');
}

section('C4. Impor — penolakan & keamanan');
{
  const reject = (input, re, label) => { const r = PP.inspectImport(input); check(!r.ok && re.test(r.error), label + ' → ' + (r.error || '(diterima!)')); };
  reject('bukan json', /bukan JSON/, 'teks bukan JSON ditolak');
  reject('[]', /tidak dikenali/, 'array ditolak');
  reject('null', /tidak dikenali/, 'null ditolak');
  reject('{"xp":5}', /Format berkas tidak dikenali/, 'format legacy tanpa penanda ditolak dengan petunjuk');
  reject({ __portal_progress_backup: true }, /tidak memuat data/, 'tanpa data ditolak');
  reject({ __portal_progress_backup: true, data: [] }, /tidak memuat data/, 'data berupa array ditolak');
  reject({ __portal_progress_backup: true, version: 99, data: {} }, /versi portal yang lebih baru/, 'versi lebih baru ditolak');
  reject({ __portal_progress_backup: true, version: 1, data: {} }, /tidak berisi progres/, 'data kosong ditolak');
  reject({ __portal_progress_backup: 'true', data: { a: 1 } }, /tidak dikenali/, 'penanda harus boolean true');

  const mk = (data) => ({ __portal_progress_backup: true, version: 1, data });
  const goodExcel = JSON.stringify({ soalDikerjakan: 1, jawabanBenar: 1, xp: 10, levelAktif: 1 });
  // key tidak dikenal TIDAK pernah ditulis
  const st = makeStorage();
  const evil = mk({ 'efpg:progress': goodExcel, unified_portal_session: '{"uid":"hacker"}', theme: 'x', ACT_MASTER_SESSION: '{}', '__proto__': 'x', constructor: 'x', 'efpg:__test__': 'x' });
  const r = PP.applyImport(st, JSON.stringify(evil), { mode: 'replace' });
  check(r.ok, 'berkas campuran: bagian valid tetap dipulihkan');
  eq(Object.keys(st.dump()), ['efpg:progress'], 'HANYA key allowlist yang tertulis (sesi/tema/ACT_MASTER_SESSION/__proto__ diabaikan)');
  eq(r.rejectedKeys.length, 5, 'semua key asing dilaporkan (5; "__proto__" di object literal JS bukan key sungguhan)');
  check(({}).polluted === undefined && Object.prototype.hasOwnProperty.call({}, 'x') === false, 'prototype Object tidak tercemar');
  // __proto__ literal dari JSON.parse
  const protoFile = '{"__portal_progress_backup":true,"data":{"__proto__":{"polluted":"yes"},"efpg:progress":' + JSON.stringify(goodExcel) + '}}';
  const rp = PP.applyImport(makeStorage(), protoFile, { mode: 'replace' });
  check(rp.ok && ({}).polluted === undefined, 'JSON dengan "__proto__" tidak mencemari prototype');

  // nilai bukan teks / terlalu besar / bentuk salah → satu modul dilewati, modul lain tetap
  const mix = mk({ ACT_MASTER_STATE: { xp: 1 }, 'efpg:progress': goodExcel });
  const rm = PP.inspectImport(mix);
  check(rm.ok && rm.modules.length === 1 && rm.modules[0].id === 'excel' && rm.skippedModules.includes('accounting'), 'nilai objek (bukan teks) → modul Accounting dilewati, Excel lolos');
  const badShape = PP.inspectImport(mk({ ACT_MASTER_STATE: '[1,2]', 'efpg:progress': goodExcel }));
  check(badShape.skippedModules.includes('accounting'), 'bentuk JSON salah (array untuk key objek) → modul dilewati');
  const badJson = PP.inspectImport(mk({ 'efpg:progress': '{rusak' }));
  check(!badJson.ok && /rusak atau tidak valid/.test(badJson.error), 'semua modul rusak → error jelas');
  const tooBig = PP.inspectImport(mk({ spt_npwp: 'x'.repeat(PP.LIMITS.perKeyChars + 1), 'efpg:progress': goodExcel }));
  check(tooBig.ok && tooBig.modules.length === 1 && tooBig.skippedModules.includes('spt'), 'nilai melebihi batas per key → modul SPT dilewati');
  const huge = {}; ['ACT_MASTER_STATE', 'ACT_MASTER_PROGRESS', 'ACT_MASTER_TAX_STATE'].forEach((k) => { huge[k] = '{"pad":"' + 'x'.repeat(1700000) + '"}'; });
  const rh = PP.inspectImport(mk(huge));
  check(!rh.ok && /terlalu besar/.test(rh.error), 'total ukuran melebihi batas ditolak');
  // bentuk array vs objek: key riwayat harus array, key state harus objek
  const wrongArr = PP.inspectImport(mk({ simspt_faktur_history_v1: '{"a":1}', 'efpg:progress': goodExcel }));
  check(wrongArr.ok && wrongArr.skippedModules.includes('spt') && wrongArr.modules.length === 1, 'key riwayat berisi objek (seharusnya array) → modul SPT dilewati');
  const wrongObj = PP.inspectImport(mk({ sqlpq_dataset_history_v1: '[]', sqlpq_progress_v1: '[1]', 'efpg:progress': goodExcel }));
  check(wrongObj.skippedModules.includes('sqlpq'), 'sqlpq_progress_v1 berisi array (seharusnya objek) → modul SQL dilewati');
  check(PP.inspectImport(mk({ simspt_faktur_history_v1: '[]', spt_simulator_data: '{"xp":1}' })).ok, 'array kosong & objek minimal tetap valid');
  const sptMixed = PP.inspectImport(mk({ spt_simulator_data: '{"xp":1}', spt_tax_career_progress: 'bukan json' }));
  check(!sptMixed.ok || !sptMixed.modules.some((m) => m.id === 'spt'), 'satu key inti SPT rusak → seluruh modul SPT dilewati (tidak setengah-setengah)');
}

section('C5. Atomik — gagal di tengah = tidak ada yang berubah');
{
  const before = {
    ACT_MASTER_STATE: JSON.stringify({ xp: 10, userLevel: 1, badges: [] }),
    'efpg:progress': JSON.stringify({ soalDikerjakan: 1, jawabanBenar: 1, xp: 5, levelAktif: 1, badges: [], rumusDipelajari: {}, riwayat: [] })
  };
  const file = JSON.stringify(PP.buildExport(makeStorage({
    ACT_MASTER_STATE: JSON.stringify({ xp: 999, userLevel: 10, badges: [] }),
    ACT_MASTER_PROGRESS: JSON.stringify({ attemptCount: 9, correctCount: 9, history: [] }),
    'efpg:progress': JSON.stringify({ soalDikerjakan: 50, jawabanBenar: 50, xp: 999, levelAktif: 4, badges: [], rumusDipelajari: {}, riwayat: [] })
  }), {}));
  // penyimpanan "penuh" saat menulis key ketiga
  let writes = 0;
  const st = makeStorage(before, { failOn: () => ++writes === 3 });
  const r = PP.applyImport(st, file, { mode: 'replace' });
  check(!r.ok && r.rolledBack === true && /Tidak ada progres yang diubah/.test(r.error), 'kegagalan tulis → ok:false + rolledBack');
  eq(st.dump(), before, 'setelah rollback, storage IDENTIK dengan sebelum impor (termasuk key yang semula tidak ada dihapus lagi)');
  check(!st.has('ACT_MASTER_PROGRESS'), 'key baru yang sempat tertulis dihapus kembali');
  // storage yang selalu gagal
  const dead = makeStorage({}, { failOn: () => true });
  const r2 = PP.applyImport(dead, file, { mode: 'replace' });
  check(!r2.ok && r2.rolledBack, 'storage yang selalu gagal → tidak crash, dilaporkan');
}

section('C6. Rekap PDF (HTML)');
{
  const st = rich();
  const sum = PP.summarize(st);
  const html = PP.buildRecapHtml(sum, { name: 'Ran <script>alert(1)</script> & "Co"', generatedAt: Date.parse('2026-10-01T00:00:00Z') });
  check(!/<script>/i.test(html) && html.includes('&lt;script&gt;') && html.includes('&amp;') && html.includes('&quot;Co&quot;'), 'nama pengguna di-escape (tidak ada HTML/skrip lolos)');
  check(html.includes('Rekap Progres Belajar') && html.includes('1 Okt 2026'), 'judul + tanggal rekap (format id-ID)');
  check(['Simulator SPT Pajak', 'Accounting Simulator', 'Excel Formula Practice', 'SQL &amp; Power Query'].every((l) => html.includes(l)), 'keempat modul ada di tabel');
  check(html.includes('<strong>560</strong>'), 'total XP tampil (300+120+60+80=560)');
  check(/bukan sertifikat/.test(html), 'pernyataan "bukan sertifikat" ada');
  check(html.includes('Belum dimulai') === false, 'semua modul dimulai → tidak ada "Belum dimulai"');
  const html0 = PP.buildRecapHtml(PP.summarize(makeStorage()), {});
  check(html0.includes('Peserta (Tamu)') && (html0.match(/Belum dimulai/g) || []).length === 4, 'tanpa data: nama default + 4 modul "Belum dimulai"');
  check(!/NaN|undefined|null/.test(html + html0), 'tidak ada NaN/undefined/null di HTML rekap');
  const evilSum = { modules: [{ id: 'x', label: '<img src=x onerror=1>', icon: '', href: '', xp: 1, level: 1, levelLabel: 'Level', activities: 0, scorePct: null, scoreLabel: 'Akurasi', lastActive: null, highlights: ['<b>x</b>'], started: true }], totals: { xp: 1, activities: 0, startedModules: 1, moduleCount: 1 } };
  const he = PP.buildRecapHtml(evilSum, {});
  check(!/<img|<b>/.test(he), 'label & sorotan modul di-escape');
}

console.log(`\n========== test-portal-progress: ${passed} lulus, ${failed} gagal ==========`);
process.exit(failed ? 1 : 0);
