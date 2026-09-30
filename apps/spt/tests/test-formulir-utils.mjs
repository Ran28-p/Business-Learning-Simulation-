// Pengujian logika otomatis (Node.js) untuk js/shared/formulir-utils.js — dipakai
// bersama oleh script_formulir.js & keempat script_Lampiran_*.js di formulir_spt.
// Sebelum disatukan, salinan di Lampiran III/IV tidak menangani angka negatif
// (baik format maupun parse) — test ini secara khusus mengunci perilaku itu
// supaya tidak diam-diam regresi lagi di masa depan.
//
// Jalankan: node tests/test-formulir-utils.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = fs.readFileSync(path.join(__dirname, '../js/shared/formulir-utils.js'), 'utf-8');
new Function(src + '\nglobalThis.formatNumber = formatNumber; globalThis.parseNumber = parseNumber;')();
const { formatNumber, parseNumber } = globalThis;

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

// --- formatNumber ---
check('nol -> "0"', formatNumber(0), '0');
check('ribuan -> pemisah titik', formatNumber(1000), '1.000');
check('jutaan -> pemisah titik tiap 3 digit', formatNumber(1234567), '1.234.567');
check('negatif -> ditulis dalam kurung (gaya akuntansi)', formatNumber(-500000), '(500.000)');
check('negatif kecil -> tetap berkurung', formatNumber(-1), '(1)');

// --- parseNumber ---
check('parse angka biasa dengan titik ribuan', parseNumber('1.234.567'), 1234567);
check('parse angka berkurung -> jadi negatif', parseNumber('(500.000)'), -500000);
check('parse string kosong -> 0', parseNumber(''), 0);
check('parse null/undefined -> 0', parseNumber(null), 0);

// --- round-trip: format lalu parse balik harus menghasilkan angka yang sama ---
[0, 1000, -1000, 1234567, -1234567].forEach(n => {
  check(`round-trip formatNumber -> parseNumber untuk ${n}`, parseNumber(formatNumber(n)), n);
});

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
