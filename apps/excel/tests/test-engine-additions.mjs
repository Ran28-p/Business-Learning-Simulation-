// Pengujian logika otomatis (Node.js, tanpa browser) untuk penambahan pada
// spreadsheet-engine.js di Tahap Interaktivitas Excel Nyata:
//   1. adjustFormulaRefs() — penggeseran referensi untuk fill handle
//   2. Penjagaan referensi melingkar pada getCellValue()
//   3. Regresi: rumus Level 1-3 yang sudah ada tetap menghasilkan nilai yang sama
//
// Jalankan: node tests/test-engine-additions.mjs

import {
  createGrid, setCellRaw, getCellValue, evaluateFormula, adjustFormulaRefs,
} from '../js/spreadsheet-engine.js';

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

// --- 1. adjustFormulaRefs ---
check('geser rentang SUM turun 2 baris', adjustFormulaRefs('=SUM(A2:A10)', 2, 0), '=SUM(A4:A12)');
check('geser rentang SUM kanan 1 kolom', adjustFormulaRefs('=SUM(A2:A10)', 0, 1), '=SUM(B2:B10)');
check('referensi absolut penuh ($A$2) tidak digeser', adjustFormulaRefs('=SUM($A$2:$A$10)', 5, 5), '=SUM($A$2:$A$10)');
check('absolut kolom saja ($A2): kolom tetap, baris +3', adjustFormulaRefs('=SUM($A2:$A10)', 3, 0), '=SUM($A5:$A13)');
check('absolut baris saja (A$2): baris tetap, kolom +2', adjustFormulaRefs('=SUM(A$2:A$10)', 0, 2), '=SUM(C$2:C$10)');
check('literal string ("B2") di dalam SUMIF tidak ikut digeser', adjustFormulaRefs('=SUMIF(F2:F26,"B2",H2:H26)', 1, 0), '=SUMIF(F3:F27,"B2",H3:H27)');
check('rumus IF/AND bersarang, kedua referensi ikut digeser', adjustFormulaRefs('=IF(AND(H2>5,I2>1000),"Besar","Kecil")', 1, 0), '=IF(AND(H3>5,I3>1000),"Besar","Kecil")');
check('di-clamp ke baris 1 jika geseran melebihi batas atas', adjustFormulaRefs('=SUM(A2)', -5, 0), '=SUM(A1)');
check('bukan rumus (tanpa "=") dikembalikan apa adanya', adjustFormulaRefs('12345', 2, 2), '12345');
check('geseran nol -> tidak berubah', adjustFormulaRefs('=SUM(A2:A10)', 0, 0), '=SUM(A2:A10)');
check('kolom multi-huruf (AA -> AB)', adjustFormulaRefs('=SUM(AA2:AA10)', 0, 1), '=SUM(AB2:AB10)');

// --- 2. Penjagaan referensi melingkar (tidak boleh hang) ---
const gridCirc = createGrid(20, 10);
setCellRaw(gridCirc, 'A1', '=SUM(B1)');
setCellRaw(gridCirc, 'B1', '=SUM(A1)');
const circResult = evaluateFormula('=SUM(B1)', gridCirc);
check('rumus melingkar A1<->B1 tidak hang, tetap menghasilkan angka', typeof circResult.value, 'number');

const gridSelf = createGrid(20, 10);
setCellRaw(gridSelf, 'A1', '=SUM(A1)');
check('rumus merujuk diri sendiri tidak hang', typeof getCellValue(gridSelf, 'A1'), 'number');

// --- 3. Regresi: rantai TIDAK melingkar & fungsi lintas level tetap benar ---
const gridChain = createGrid(30, 5);
setCellRaw(gridChain, 'A1', 1);
for (let i = 2; i <= 10; i += 1) {
  setCellRaw(gridChain, `A${i}`, `=SUM(A${i - 1})`);
}
check('rantai 10 tingkat non-melingkar tetap resolve ke nilai awal', getCellValue(gridChain, 'A10'), 1);

const grid = createGrid(30, 12);
const rows = [
  ['A001', 'Jawa Barat', 'Elektronik', 5, 1000000],
  ['A002', 'Jawa Barat', 'Fashion', 2, 200000],
  ['A003', 'Jawa Timur', 'Elektronik', 9, 1500000],
];
rows.forEach((row, i) => {
  row.forEach((v, c) => setCellRaw(grid, String.fromCharCode(65 + c) + (i + 2), v, { readonly: true }));
});
check('regresi SUM', evaluateFormula('=SUM(D2:D4)', grid).value, 16);
check('regresi AVERAGE', evaluateFormula('=AVERAGE(D2:D4)', grid).value, 16 / 3);
check('regresi COUNTIF', evaluateFormula('=COUNTIF(B2:B4,"Jawa Barat")', grid).value, 2);
check('regresi SUMIF', evaluateFormula('=SUMIF(C2:C4,"Elektronik",E2:E4)', grid).value, 2500000);
check('regresi IF(AND(...))', evaluateFormula('=IF(AND(D2>3,E2>500000),"Besar","Kecil")', grid).value, 'Besar');
check('regresi VLOOKUP', evaluateFormula('=VLOOKUP("A003",A2:E4,3,FALSE)', grid).value, 'Elektronik');

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
