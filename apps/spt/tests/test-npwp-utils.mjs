// Pengujian logika otomatis (Node.js, tanpa browser) untuk js/shared/npwp-utils.js.
// Sama seperti test-tax-engine.mjs: file sumbernya adalah script klasik (bukan ES
// module) supaya bisa dimuat langsung lewat <script src>, jadi di sini kita jalankan
// isinya via `new Function` dengan `window` minimal, lalu ambil hasil dari window.NPWPUtils.
//
// Jalankan: node tests/test-npwp-utils.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

globalThis.window = globalThis;
const src = fs.readFileSync(path.join(__dirname, '../js/shared/npwp-utils.js'), 'utf-8');
new Function(src)();
const NPWPUtils = globalThis.NPWPUtils;

if (!NPWPUtils) {
  console.log('FATAL: window.NPWPUtils tidak terdefinisi setelah memuat npwp-utils.js');
  process.exit(1);
}

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

// --- validateNPWP ---
check('kosong -> tidak valid', NPWPUtils.validateNPWP('').valid, false);
check('16 digit polos -> valid, format 16', NPWPUtils.validateNPWP('1234567890123456').format, '16');
check('16 digit dengan spasi/titik -> tetap valid (dinormalisasi)', NPWPUtils.validateNPWP('1234 5678 9012 3456').valid, true);
check('15 digit (format lama) -> valid, format 15', NPWPUtils.validateNPWP('123456789012345').format, '15');
check('15 digit dengan format lama bertitik/strip -> tetap valid', NPWPUtils.validateNPWP('12.345.678.9-012.345').valid, true);
check('14 digit -> tidak valid (kurang)', NPWPUtils.validateNPWP('12345678901234').valid, false);
check('17 digit -> tidak valid (kelebihan)', NPWPUtils.validateNPWP('123456789012345678').valid, false);
check('mengandung huruf -> huruf diabaikan, dihitung dari digit saja', NPWPUtils.validateNPWP('AB1234567890123456').digits, '1234567890123456');

// --- formatNPWP ---
check('format 16 digit -> berkelompok 4-4-4-4', NPWPUtils.formatNPWP('1234567890123456'), '1234 5678 9012 3456');
check('format 15 digit -> pola XX.XXX.XXX.X-XXX.XXX', NPWPUtils.formatNPWP('123456789012345'), '12.345.678.9-012.345');
check('input tidak valid -> dikembalikan apa adanya', NPWPUtils.formatNPWP('123'), '123');

// --- onlyDigits ---
check('onlyDigits membuang semua karakter non-angka', NPWPUtils.onlyDigits('AB-12.34 56'), '123456');

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
