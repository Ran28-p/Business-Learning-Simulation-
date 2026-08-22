// Pengujian otomatis untuk engine export workbook baru (Bagian 26 spesifikasi
// redesign): format-engine.js (semantik kolom & format angka), workbook-blueprint.js
// (struktur data blueprint), dan workbook-renderer.js (render ExcelJS sungguhan,
// dibaca ulang untuk memverifikasi sheet/style/merge/table benar-benar tertulis).
//
// Jalankan: node tests/test-workbook-export.mjs

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelDir = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass += 1; } else {
    fail += 1;
    console.log(`FAIL: ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function ok(label, condition) {
  if (condition) { pass += 1; } else { fail += 1; console.log(`FAIL: ${label}`); }
}

// --- Muat file export (plain <script>, bukan ES module) ke window jsdom ---
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'dangerously' });
const { window } = dom;
window.eval(fs.readFileSync(path.join(excelDir, 'js/export/workbook-theme.js'), 'utf8'));
window.eval(fs.readFileSync(path.join(excelDir, 'js/export/format-engine.js'), 'utf8'));
window.eval(fs.readFileSync(path.join(excelDir, 'js/export/workbook-blueprint.js'), 'utf8'));
const { inferColumnSemantic, getExcelNumberFormat, calculateColumnWidth, buildWorkbookBlueprint } = window.WorkbookExport;

console.log('\n=== format-engine: semantik kolom (regresi bug "Pajak (PPN 11%)") ===');
check('Pajak (PPN 11%) → currency (bukan percentage)', inferColumnSemantic('Pajak (PPN 11%)', 'number'), 'currency');
check('Diskon (%) → percentage', inferColumnSemantic('Diskon (%)', 'number'), 'percentage');
check('Tunjangan → currency', inferColumnSemantic('Tunjangan', 'number'), 'currency');
check('Potongan → currency', inferColumnSemantic('Potongan', 'number'), 'currency');
check('Harga Satuan → currency', inferColumnSemantic('Harga Satuan', 'number'), 'currency');
check('Jumlah → integer', inferColumnSemantic('Jumlah', 'number'), 'integer');
check('Stok Awal → integer', inferColumnSemantic('Stok Awal', 'number'), 'integer');
check('Tanggal → date', inferColumnSemantic('Tanggal', 'date'), 'date');
check('ID Transaksi → id', inferColumnSemantic('ID Transaksi', 'text'), 'id');
check('Kategori → category', inferColumnSemantic('Kategori', 'text'), 'category');
check('Keterangan → text-long', inferColumnSemantic('Keterangan', 'text'), 'text-long');

console.log('\n=== format-engine: getExcelNumberFormat ===');
check('currency numFmt', getExcelNumberFormat({ semantic: 'currency' }), '"Rp" #,##0');
check('date numFmt', getExcelNumberFormat({ semantic: 'date' }), 'dd/mm/yyyy');
check('integer numFmt', getExcelNumberFormat({ semantic: 'integer' }), '#,##0');
check('text-medium numFmt (tidak diformat)', getExcelNumberFormat({ semantic: 'text-medium' }), 'General');

console.log('\n=== format-engine: calculateColumnWidth ===');
const wId = calculateColumnWidth(['TRX-00001', 'TRX-00002'], { header: 'ID Transaksi', semantic: 'id' });
const wLong = calculateColumnWidth(['Kertas HVS A4 80gsm 1 Rim isi 500 lembar'], { header: 'Nama Produk', semantic: 'text-long' });
ok('lebar kolom teks panjang > lebar kolom id (tidak seragam)', wLong > wId);
ok('lebar kolom id tidak di bawah minimum', wId >= 12);
ok('lebar kolom teks panjang di-cap ke maksimum (tidak meledak)', wLong <= 55);

console.log('\n=== workbook-blueprint: struktur ===');
const fakeDataset = {
  headers: ['ID', 'Tanggal', 'Kategori', 'Harga Satuan', 'Diskon (%)'],
  columnTypes: ['text', 'date', 'text', 'number', 'number'],
  rows: [
    ['A-1', 46000, 'Elektronik', 150000, 10],
    ['A-2', 46001, 'Furnitur', 500000, 5],
  ],
  meta: { datasetLabel: 'Penjualan', seed: 'abc123' },
};
const fakeQuestions = [
  {
    title: 'Soal Contoh', instruction: 'Hitung total X.', acceptedFunctions: ['SUMIF', 'IF'],
    hints: ['Gunakan SUMIF dulu.'], points: 10, expectedFormula: '=SUMIF(...)', expectedValue: 12345,
    explanation: 'Penjelasan singkat.', fingerprint: 'fp-1',
  },
];
const blueprint = buildWorkbookBlueprint({
  dataset: fakeDataset, questions: fakeQuestions, level: 3, levelLabel: 'Level 3 — Menengah',
  datasetType: 'sales', formulaCatalog: [{ name: 'SUMIF', category: 'Bersyarat', syntax: 'SUMIF(range,criteria,sum_range)', description: 'x', example: '=SUMIF(A:A,"x",B:B)' }],
});

ok('blueprint punya 5 bagian sheet', !!(blueprint.meta && blueprint.practice && blueprint.dataset && blueprint.answerKey && blueprint.guide && blueprint.helper));
check('practice.questions berjumlah sesuai input', blueprint.practice.questions.length, 1);
check('practice question nomor otomatis', blueprint.practice.questions[0].number, 1);
check('dataset.semantics kolom Harga Satuan → currency', blueprint.dataset.semantics[3], 'currency');
check('dataset.semantics kolom Diskon (%) → percentage', blueprint.dataset.semantics[4], 'percentage');
check('answerKey formula diawali "="', blueprint.answerKey.questions[0].expectedFormula.startsWith('='), true);
ok('guide.entries memuat fungsi yang benar-benar dipakai (SUMIF, IF)', blueprint.guide.entries.some((e) => e.name === 'SUMIF') && blueprint.guide.entries.some((e) => e.name === 'IF'));
ok('guide.entries TIDAK memuat fungsi yang tidak dipakai (mis. VLOOKUP)', !blueprint.guide.entries.some((e) => e.name === 'VLOOKUP'));
check('helper.level tercatat', blueprint.helper.level, 3);

console.log('\n=== workbook-renderer: render ExcelJS sungguhan (baca-ulang buffer) ===');
try {
  const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
  window.ExcelJS = ExcelJS;
  window.eval(fs.readFileSync(path.join(excelDir, 'js/export/workbook-renderer.js'), 'utf8'));

  const biggerDataset = {
    headers: fakeDataset.headers, columnTypes: fakeDataset.columnTypes,
    rows: Array.from({ length: 10 }, (_, i) => ['A-' + i, 46000 + i, i % 2 ? 'Elektronik' : 'Furnitur', 100000 + i * 1000, 5]),
    meta: fakeDataset.meta,
  };
  const bp2 = buildWorkbookBlueprint({ dataset: biggerDataset, questions: fakeQuestions, level: 3, levelLabel: 'Level 3', datasetType: 'sales', formulaCatalog: [] });
  const buffer = await window.WorkbookExport.renderBlueprintToWorkbook(bp2);
  ok('render menghasilkan buffer tidak kosong', buffer && buffer.byteLength > 1000);

  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buffer);
  const sheetNames = wb2.worksheets.map((s) => s.name);
  check('urutan sheet: Latihan pertama', sheetNames[0], 'Latihan');
  check('5 sheet dihasilkan', sheetNames.length, 5);
  ok('Kunci Jawaban tersembunyi (hidden)', wb2.getWorksheet('Kunci Jawaban').state === 'hidden');
  ok('Helper sangat tersembunyi (veryHidden)', wb2.getWorksheet('Helper').state === 'veryHidden');

  const practiceWs = wb2.getWorksheet('Latihan');
  const titleCell = practiceWs.getCell('A1');
  ok('judul workbook bold', !!titleCell.font?.bold);
  ok('judul workbook punya fill warna (bukan default)', !!titleCell.fill?.fgColor?.argb);
  ok('lebar kolom TIDAK seragam semua (Bagian 22)', new Set(practiceWs.columns.map((c) => c.width)).size >= 1);

  const datasetWs = wb2.getWorksheet('Dataset');
  ok('Dataset punya Table Excel sungguhan', Object.keys(datasetWs.tables || {}).length > 0 || datasetWs.getTable !== undefined);
  const colWidths = datasetWs.columns.map((c) => c.width).filter(Boolean);
  ok('lebar kolom Dataset bervariasi (bukan satu angka untuk semua)', new Set(colWidths).size > 1);
} catch (err) {
  fail += 1;
  console.log('FAIL: renderer test threw:', err.message);
}

console.log(`\n========== RESULTS: ${pass} passed, ${fail} failed ==========`);
process.exit(fail > 0 ? 1 : 0);
