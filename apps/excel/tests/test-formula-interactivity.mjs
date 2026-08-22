// Pengujian logika otomatis (Node.js, tanpa browser) untuk bagian formula-
// interactivity.js yang TIDAK menyentuh DOM: analisis pewarnaan referensi,
// pemisahan literal string, pencarian fungsi yang mengurung kursor
// (untuk petunjuk argumen), dan pemisahan sintaks argumen.
//
// Bagian yang BENAR-BENAR menyentuh DOM (mode point-klik, fill handle,
// posisi popup) tidak bisa diuji lewat Node — perlu pengujian manual di
// browser sungguhan (lihat docs/STATUS-TAHAP-3.md bagian "Cara Menguji").
//
// Jalankan: node tests/test-formula-interactivity.mjs

import {
  splitOutsideQuotes, analyzeFormulaRefs, findEnclosingCall, splitSyntaxArgs, buildHintHtml,
} from '../js/formula-interactivity.js';

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

// --- splitOutsideQuotes ---
check(
  'pisah segmen dengan satu literal string',
  splitOutsideQuotes('=SUMIF(C2:C4,"Elektronik",E2:E4)'),
  [
    { text: '=SUMIF(C2:C4,', quoted: false },
    { text: '"Elektronik"', quoted: true },
    { text: ',E2:E4)', quoted: false },
  ],
);
check('tanpa tanda kutip sama sekali -> satu segmen', splitOutsideQuotes('=SUM(A1:A5)'), [{ text: '=SUM(A1:A5)', quoted: false }]);

// --- analyzeFormulaRefs ---
const nonFormula = analyzeFormulaRefs('Elektronik');
check('teks biasa (bukan rumus) tidak diberi warna', nonFormula.colorMap.size, 0);
check('teks biasa tetap muncul apa adanya di HTML (di-escape)', nonFormula.html, 'Elektronik');

const single = analyzeFormulaRefs('=SUM(A2:A10)');
check('satu rentang -> satu entri warna', single.colorMap.size, 1);
check('token warna memakai huruf besar', [...single.colorMap.keys()], ['A2:A10']);

const repeated = analyzeFormulaRefs('=IF(A2>5,A2,B2)');
check('referensi yang sama (A2 dua kali) -> tetap satu warna (dipakai ulang)', repeated.colorMap.size, 2); // A2 dan B2
check('urutan warna sesuai kemunculan pertama', [...repeated.colorMap.keys()], ['A2', 'B2']);

const withQuote = analyzeFormulaRefs('=SUMIF(C2:C4,"Elektronik",E2:E4)');
check('referensi di dalam tanda kutip TIDAK dianggap sebagai referensi sel', withQuote.colorMap.size, 2); // hanya C2:C4 dan E2:E4
check('literal string dibungkus span fx-hl-string', withQuote.html.includes('fx-hl-string">"Elektronik"'), true);
check('literal string TIDAK dibungkus span fx-hl-ref', withQuote.html.includes('fx-hl-ref" style="color:#4472C4">C2:C4'), true);

// --- findEnclosingCall ---
check('kursor di argumen ke-1 SUM(', findEnclosingCall('=SUM(A2:A10', 12), { name: 'SUM', argIndex: 0 });
check('kursor di argumen ke-3 (setelah 2 koma) IF(', findEnclosingCall('=IF(A2>5,"Besar",', 18), { name: 'IF', argIndex: 2 });
check('kursor di dalam fungsi bersarang AND(...) di dalam IF(...) -> mengurung AND, bukan IF', findEnclosingCall('=IF(AND(A2>5,B2', 16), { name: 'AND', argIndex: 1 });
check('koma di dalam literal string tidak dihitung sebagai pemisah argumen', findEnclosingCall('=SUMIF(C2:C4,"A,B",', 19), { name: 'SUMIF', argIndex: 2 });
check('kursor di luar semua fungsi -> null', findEnclosingCall('=A2+B2', 6), null);

// --- splitSyntaxArgs ---
check('pisah argumen sederhana', splitSyntaxArgs('rentang1, [rentang2], ...'), ['rentang1', '[rentang2]', '...']);
check('koma di dalam tanda kurung bersarang tidak ikut memisah', splitSyntaxArgs('nilai_cari, tabel, INDEX(a, b), cocok'), ['nilai_cari', 'tabel', 'INDEX(a, b)', 'cocok']);

// --- buildHintHtml ---
const hint = buildHintHtml({ name: 'SUM', syntax: 'SUM(rentang1, [rentang2], ...)', description: 'Menjumlahkan angka' }, 1);
check('argumen ke-2 (index 1) ditebalkan', hint.includes('<strong>[rentang2]</strong>'), true);
check('nama fungsi disertakan', hint.includes('SUM'), true);
check('deskripsi disertakan', hint.includes('Menjumlahkan angka'), true);

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
