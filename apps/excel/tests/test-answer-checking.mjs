// Pengujian otomatis untuk alur "Periksa Jawaban" (formula-validator.js +
// progress-manager.js) yang sebelumnya TIDAK tersambung ke UI sama sekali
// (lihat catatan di app.js: checkCurrentAnswer()). File ini memverifikasi:
//   1. validateAnswer() — semua jalur (kosong, bukan rumus, tanpa referensi,
//      fungsi salah, kolom salah, referensi wajib hilang, toleransi angka,
//      jawaban benar) memakai grid & question buatan tangan yang terkontrol
//      (bukan hasil generateQuestion() acak) supaya hasil yang diharapkan
//      pasti benar dan tidak bergantung pada detail template soal.
//   2. recordAttempt() (progress-manager.js, lewat storage-manager.js +
//      jsdom localStorage) — XP bertambah saat benar, tidak bertambah saat
//      salah, dan hasil tersimpan/terbaca kembali dengan benar.
//
// Jalankan: node tests/test-answer-checking.mjs

import { JSDOM } from 'jsdom';

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL: ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function checkTrue(label, cond) {
  if (cond) { pass += 1; } else {
    fail += 1;
    console.log(`FAIL: ${label} (expected truthy, got falsy)`);
  }
}

// --- DOM global untuk progress-manager.js -> storage-manager.js (window.localStorage) ---
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;

const { createGrid, setCellRaw, cellAddress } = await import('../js/spreadsheet-engine.js');
const { validateAnswer } = await import('../js/formula-validator.js');
const { recordAttempt, resetProgress, getStats } = await import('../js/progress-manager.js');

// ============================================================================
// 1. Grid & question terkontrol (bukan dari generateQuestion() acak)
// ============================================================================
// Header di baris 1 (row index 0), data di baris 2-4 (row index 1-3):
//   A: Produk   B: Wilayah   C: Jumlah
//   A2: A       B2: Jawa     C2: 10
//   A3: B       B3: Jawa     C3: 20
//   A4: C       B4: Sumatra  C4: 30
// Target jawaban di D6.
function buildGrid() {
  const grid = createGrid(10, 5);
  setCellRaw(grid, cellAddress(0, 0), 'Produk');
  setCellRaw(grid, cellAddress(1, 0), 'Wilayah');
  setCellRaw(grid, cellAddress(2, 0), 'Jumlah');
  const rows = [['A', 'Jawa', 10], ['B', 'Jawa', 20], ['C', 'Sumatra', 30]];
  rows.forEach((row, r) => {
    row.forEach((val, c) => setCellRaw(grid, cellAddress(c, r + 1), val));
  });
  return grid;
}

const sumQuestion = {
  title: 'Total Jumlah',
  targetCell: 'D6',
  expectedValue: 60,
  acceptedFunctions: ['SUM'],
  expectedColIndex: 2,
  expectedColumnLabel: 'Jumlah',
  points: 10,
};

// ============================================================================
// 2. validateAnswer() — semua jalur
// ============================================================================
console.log('\n=== validateAnswer(): jalur validasi ===');

{
  const grid = buildGrid();
  const r = validateAnswer({ rawInput: '', grid, question: sumQuestion });
  check('input kosong -> incorrect', r.status, 'incorrect');
  checkTrue('input kosong -> pesan menyebut "kosong"', /kosong/i.test(r.message));
}

{
  const grid = buildGrid();
  const r = validateAnswer({ rawInput: '60', grid, question: sumQuestion });
  check('bukan rumus (tanpa "=") -> incorrect', r.status, 'incorrect');
  checkTrue('bukan rumus -> pesan menyebut "RUMUS"', /RUMUS/.test(r.message));
}

{
  const grid = buildGrid();
  const r = validateAnswer({ rawInput: '=100+50', grid, question: sumQuestion });
  check('rumus tanpa referensi sel -> incorrect', r.status, 'incorrect');
  checkTrue('tanpa referensi -> pesan menyebut "referensi"', /referensi/i.test(r.message));
}

{
  const grid = buildGrid();
  const r = validateAnswer({ rawInput: '=AVERAGE(C2:C4)', grid, question: sumQuestion });
  check('fungsi tidak sesuai acceptedFunctions -> incorrect', r.status, 'incorrect');
  checkTrue('fungsi salah -> pesan menyebut fungsi yang dipakai', r.message.includes('AVERAGE'));
}

{
  const grid = buildGrid();
  // SUM dipakai (lolos cek fungsi), tapi merujuk ke kolom A (Produk) bukan
  // kolom C (Jumlah) yang diharapkan soal -- harus tetap ditolak walau
  // fungsinya benar, supaya kebetulan tidak lolos sebagai jawaban benar.
  const r = validateAnswer({ rawInput: '=SUM(A2:A4)', grid, question: sumQuestion });
  check('SUM tapi kolom salah -> incorrect', r.status, 'incorrect');
}

{
  const grid = buildGrid();
  const r = validateAnswer({ rawInput: '=SUM(C2:C4)', grid, question: sumQuestion });
  check('rumus benar -> correct', r.status, 'correct');
  check('rumus benar -> userValue 60', r.userValue, 60);
  check('rumus benar -> expectedValue ikut dikembalikan', r.expectedValue, 60);
  checkTrue('rumus benar -> usedFunctions berisi SUM', r.usedFunctions.includes('SUM'));
}

{
  // Toleransi pembulatan: expectedValue 60.3, hasil rumus 60 -> masih dalam
  // toleransi 0.5 (lihat NUMERIC_TOLERANCE di formula-validator.js).
  const grid = buildGrid();
  const q = { ...sumQuestion, expectedValue: 60.3 };
  const r = validateAnswer({ rawInput: '=SUM(C2:C4)', grid, question: q });
  check('selisih kecil (0.3) dalam toleransi pembulatan -> correct', r.status, 'correct');
}

{
  // Di luar toleransi.
  const grid = buildGrid();
  const q = { ...sumQuestion, expectedValue: 65 };
  const r = validateAnswer({ rawInput: '=SUM(C2:C4)', grid, question: q });
  check('selisih besar (5) di luar toleransi -> incorrect', r.status, 'incorrect');
}

{
  // requiredRefs: soal per-baris yang menuntut referensi sel PERSIS (bukan
  // cuma "menyentuh kolom"), mis. template IF/LEFT/MONTH.
  const grid = buildGrid();
  const q = {
    title: 'Wilayah baris pertama',
    targetCell: 'D6',
    expectedValue: 'Jawa',
    acceptedFunctions: ['IF'],
    requiredRefs: ['B2'],
  };
  const wrong = validateAnswer({ rawInput: '=IF(B3="Jawa","Jawa","Lainnya")', grid, question: q });
  check('requiredRefs: rujuk sel yang salah -> incorrect', wrong.status, 'incorrect');

  const right = validateAnswer({ rawInput: '=IF(B2="Jawa","Jawa","Lainnya")', grid, question: q });
  check('requiredRefs: rujuk sel yang benar & hasil teks cocok -> correct', right.status, 'correct');
  check('perbandingan teks tidak case-sensitive-safe tapi exact di sini', right.userValue, 'Jawa');
}

// ============================================================================
// 3. recordAttempt() — integrasi dengan progress-manager.js (localStorage via jsdom)
// ============================================================================
console.log('\n=== recordAttempt(): integrasi progress-manager ===');

resetProgress();
{
  const before = getStats();
  check('progres awal: XP 0 setelah reset', before.xp, 0);
  check('progres awal: soal dikerjakan 0 setelah reset', before.soalDikerjakan, 0);
}

{
  const { stats, xpGained, saved } = recordAttempt({ question: sumQuestion, status: 'correct', hintsUsed: 0 });
  checkTrue('jawaban benar (tanpa hint) -> XP bertambah', xpGained > 0);
  check('jawaban benar -> soalDikerjakan bertambah 1', stats.soalDikerjakan, 1);
  check('jawaban benar -> jawabanBenar bertambah 1', stats.jawabanBenar, 1);
  checkTrue('recordAttempt -> saved === true (localStorage jsdom tersedia)', saved === true);
}

{
  const before = getStats();
  const { stats, xpGained } = recordAttempt({ question: sumQuestion, status: 'incorrect', hintsUsed: 0 });
  check('jawaban salah -> XP TIDAK bertambah', xpGained, 0);
  check('jawaban salah -> XP total tidak berubah', stats.xp, before.xp);
  check('jawaban salah -> soalDikerjakan tetap bertambah (attempt tercatat)', stats.soalDikerjakan, before.soalDikerjakan + 1);
  check('jawaban salah -> jawabanBenar TIDAK bertambah', stats.jawabanBenar, before.jawabanBenar);
}

{
  // Penalti hint: jawaban benar tapi sudah pakai 2 hint -> XP lebih kecil
  // dibanding jawaban benar tanpa hint sama sekali (bagian 23 master prompt:
  // "semakin banyak hint digunakan, skor maksimal dapat berkurang").
  resetProgress();
  const noHint = recordAttempt({ question: sumQuestion, status: 'correct', hintsUsed: 0 });
  resetProgress();
  const withHint = recordAttempt({ question: sumQuestion, status: 'correct', hintsUsed: 2 });
  checkTrue('XP dengan 2 hint < XP tanpa hint (penalti hint aktif)', withHint.xpGained < noHint.xpGained);
}

{
  // Data bertahan lewat window.localStorage (bukan cuma di memori) --
  // memuat ulang modul progress-manager tidak dilakukan di sini (ES module
  // di-cache), tapi kita verifikasi langsung isi localStorage-nya.
  const raw = window.localStorage.getItem('efpg:progress');
  checkTrue('progress benar-benar tersimpan ke window.localStorage', typeof raw === 'string' && raw.length > 0);
}

resetProgress();

console.log(`\n========== RESULTS: ${pass} passed, ${fail} failed ==========\n`);
process.exit(fail > 0 ? 1 : 0);
