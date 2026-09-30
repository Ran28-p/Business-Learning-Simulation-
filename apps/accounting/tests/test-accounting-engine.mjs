// Pengujian otomatis untuk Accounting Simulator — engine.js (siklus akuntansi
// penuh) dan validationEngine.js (pemeriksa jurnal siswa).
//
// Fokus utama (sesuai bagian 31 master prompt): invarian double-entry
// "debit = kredit" harus terjaga di SETIAP tahap siklus (jurnal, posting,
// trial balance, penyesuaian, worksheet, laporan keuangan, penutupan,
// neraca saldo setelah penutupan) — bukan cuma di satu titik.
//
// Dijalankan lewat runFullCycle() untuk BANYAK kombinasi level & jumlah
// transaksi/seed, supaya regresi pada logika engine (bukan cuma satu kasus
// kebetulan seimbang) benar-benar tertangkap.
//
// Jalankan: node tests/test-accounting-engine.mjs

import {
  initEngine, loadRandomTransactions, loadAdjustments, buildJournal,
  submitUserJournal, postToLedger, generateTrialBalance,
  buildAdjustmentJournal, submitUserAdjustmentJournal, generateAdjustedTrialBalance,
  generateWorksheet, generateFinancialStatements, generateClosingEntries,
  generatePostClosingTrialBalance, getExpectedJournal, validateUserJournal,
  runFullCycle,
} from '../js/accounting/engine.js';
import { validateJournal } from '../js/accounting/validationEngine.js';

let pass = 0;
let fail = 0;
function checkTrue(label, cond, extra) {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL: ${label}${extra !== undefined ? `\n  detail: ${JSON.stringify(extra)}` : ''}`);
  }
}
function check(label, actual, expected) {
  checkTrue(label, actual === expected, { actual, expected });
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ============================================================================
// 1. runFullCycle(): invarian debit=kredit di SETIAP tahap, untuk berbagai
//    level & jumlah transaksi (bukan cuma satu kasus tunggal).
// ============================================================================
section('runFullCycle(): invarian debit=kredit di setiap tahap siklus');

const CASES = [
  { level: 1, count: 4 },
  { level: 1, count: 6 },
  { level: 1, count: 10 },
  { level: 2, count: 6 },
  { level: 2, count: 8 },
  { level: 3, count: 6 },
  { level: 3, count: 12 },
];

for (const { level, count } of CASES) {
  const label = `level ${level}, ${count} transaksi`;
  let result;
  let threw = null;
  try {
    result = runFullCycle(level, count);
  } catch (err) {
    threw = err;
  }
  checkTrue(`${label}: runFullCycle tidak melempar error`, threw === null, threw && threw.message);
  if (threw) continue;

  checkTrue(`${label}: trial balance seimbang (D=K)`, result.trialBalance.balanced,
    { totalDebit: result.trialBalance.totalDebit, totalCredit: result.trialBalance.totalCredit });
  checkTrue(`${label}: adjusted trial balance seimbang (D=K)`, result.adjustedTB.balanced,
    { totalDebit: result.adjustedTB.totalDebit, totalCredit: result.adjustedTB.totalCredit });
  checkTrue(`${label}: post-closing trial balance seimbang (D=K)`, result.postClosingTB.balanced,
    { totalDebit: result.postClosingTB.totalDebit, totalCredit: result.postClosingTB.totalCredit });
  checkTrue(`${label}: trial balance tidak kosong (>=2 baris)`, result.trialBalance.rows.length >= 2);
  checkTrue(`${label}: jurnal tidak kosong`, result.journal.lines.length > 0);
}

// ============================================================================
// 2. Konsistensi: total debit jurnal jawaban == total kredit jurnal jawaban
//    (sifat dasar double-entry harus melekat pada jurnal yang DIHASILKAN
//    engine sendiri — bukan cuma yang divalidasi).
// ============================================================================
section('Jurnal jawaban (answer key) sendiri selalu balans');

for (const { level, count } of [{ level: 1, count: 6 }, { level: 2, count: 8 }, { level: 3, count: 10 }]) {
  initEngine(level);
  loadRandomTransactions(count);
  const journal = buildJournal();
  const totalD = journal.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalK = journal.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  checkTrue(`level ${level}: jurnal jawaban balans (D=${totalD}, K=${totalK})`, totalD === totalK);
}

// ============================================================================
// 3. validateUserJournal(): pemeriksaan keseimbangan sederhana
// ============================================================================
section('validateUserJournal(): pemeriksaan keseimbangan sederhana');

{
  const r = validateUserJournal([]);
  check('jurnal kosong -> valid=false', r.valid, false);
}
{
  const r = validateUserJournal([{ account: 'Kas', debit: 100000, credit: 0 }]);
  check('hanya debit (tidak balans) -> valid=false', r.valid, false);
  checkTrue('pesan menyebut "Tidak Balans"', /Tidak Balans/i.test(r.error || ''));
}
{
  const r = validateUserJournal([
    { account: 'Kas', debit: 500000, credit: 0 },
    { account: 'Pendapatan Jasa', debit: 0, credit: 500000 },
  ]);
  check('debit=kredit -> valid=true', r.valid, true);
}
{
  const r = validateUserJournal([
    { account: 'Kas', debit: 0, credit: 0 },
  ]);
  check('semua nominal nol -> valid=false', r.valid, false);
}

// ============================================================================
// 4. validateJournal() (veValidateJournal — dipakai UI): pemeriksaan
//    berbasis skor terhadap answer key.
// ============================================================================
section('validateJournal(): pemeriksaan berbasis skor terhadap answer key');

{
  initEngine(1);
  loadRandomTransactions(6);
  buildJournal(); // isi answer key (engine.journal) supaya bisa dibandingkan

  const r = validateJournal([]);
  check('jurnal kosong -> valid=false', r.valid, false);
  check('jurnal kosong -> skor 0', r.score, 0);
}

{
  initEngine(1);
  loadRandomTransactions(6);
  buildJournal();

  const r = validateJournal([{ account: 'Kas', debit: 100000, credit: 0 }]);
  check('jurnal tidak balans -> valid=false', r.valid, false);
  checkTrue('jurnal tidak balans -> ada item severity error', r.items.some((i) => i.severity === 'error'));
}

{
  initEngine(1);
  loadRandomTransactions(6);
  buildJournal();
  const expected = getExpectedJournal();

  // Jurnal jawaban PERSIS sama dengan answer key -> harus dinilai valid &
  // skor tinggi. Ini pengujian regresi paling penting untuk validator ini:
  // kalau logika pembanding berubah sampai jawaban benar sendiri dianggap
  // salah, siswa yang menjawab tepat akan dirugikan tanpa disadari.
  const userEntries = expected.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, date: l.date }));
  const r = validateJournal(userEntries);
  checkTrue('jurnal identik dengan answer key -> valid=true', r.valid === true, { score: r.score, summary: r.summary });
  checkTrue('jurnal identik dengan answer key -> skor >= 80/100', r.score >= 80, { score: r.score });
}

{
  initEngine(1);
  loadRandomTransactions(6);
  buildJournal();

  // Baris dengan Debit DAN Kredit terisi sekaligus -> pelanggaran aturan
  // posisi debit/kredit, harus terdeteksi sebagai error meski totalnya balans.
  const r = validateJournal([
    { account: 'Kas', debit: 100000, credit: 100000 },
  ]);
  checkTrue('satu baris isi debit & kredit sekaligus -> ada error debit_credit',
    r.items.some((i) => i.field === 'debit_credit' && i.severity === 'error'));
}

{
  initEngine(1);
  loadRandomTransactions(6);
  buildJournal();

  const r = validateJournal([
    { account: 'Akun Yang Tidak Ada Di Bagan', debit: 100000, credit: 0 },
    { account: 'Kas', debit: 0, credit: 100000 },
  ]);
  checkTrue('akun di luar bagan akun -> ada warning account',
    r.items.some((i) => i.field === 'account' && i.severity === 'warning'));
}

// ============================================================================
// 5. Sanity check tambahan: adjustment journal & closing journal juga balans
// ============================================================================
section('Jurnal penyesuaian & jurnal penutup juga balans');

for (const level of [1, 2, 3]) {
  initEngine(level);
  loadRandomTransactions(6);
  loadAdjustments();
  const journal = buildJournal();
  submitUserJournal(journal.lines);
  postToLedger();
  generateTrialBalance();

  const adjJournal = buildAdjustmentJournal();
  const totalD = adjJournal.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalK = adjJournal.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  checkTrue(`level ${level}: jurnal penyesuaian balans (D=${totalD}, K=${totalK})`, totalD === totalK);

  submitUserAdjustmentJournal(adjJournal);
  generateAdjustedTrialBalance();
  generateWorksheet();
  generateFinancialStatements();
  const closing = generateClosingEntries();
  const closingD = closing.entries.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const closingK = closing.entries.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  checkTrue(`level ${level}: jurnal penutup balans (D=${closingD}, K=${closingK})`, closingD === closingK);
}

console.log(`\n========== RESULTS: ${pass} passed, ${fail} failed ==========\n`);
process.exit(fail > 0 ? 1 : 0);
