// Pengujian logika otomatis (Node.js, tanpa browser) untuk js/shared/tax-engine.js.
//
// tax-engine.js ditulis sebagai script klasik (window.TaxEngine = ...), BUKAN
// ES module — sengaja begitu supaya bisa dimuat langsung lewat <script src>
// di browser tanpa build step apa pun (lihat CATATAN di js/shared/tax-engine.js).
// Supaya tetap bisa ditest di Node tanpa jsdom, kita sediakan `window` minimal
// (alias ke globalThis) lalu jalankan isi file apa adanya via `new Function`.
//
// Jalankan: node tests/test-tax-engine.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

globalThis.window = globalThis;
const src = fs.readFileSync(path.join(__dirname, '../js/shared/tax-engine.js'), 'utf-8');
new Function(src)();
const TaxEngine = globalThis.TaxEngine;

if (!TaxEngine) {
  console.log('FATAL: window.TaxEngine tidak terdefinisi setelah memuat tax-engine.js');
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
function near(label, actual, expected, eps = 1) {
  const ok = Math.abs(actual - expected) <= eps;
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL: ${label}\n  expected ~ ${expected}\n  actual     ${actual}`);
  }
}

// --- hitungPTKP (dasar 54jt, +4,5jt kawin, +4,5jt/tanggungan maks. 3) ---
check('PTKP TK/0', TaxEngine.hitungPTKP('TK/0'), 54000000);
check('PTKP K/0', TaxEngine.hitungPTKP('K/0'), 58500000);
check('PTKP TK/3', TaxEngine.hitungPTKP('TK/3'), 67500000);
check('PTKP K/3', TaxEngine.hitungPTKP('K/3'), 72000000);
check('PTKP K/5 (tanggungan di-cap ke 3)', TaxEngine.hitungPTKP('K/5'), 72000000);
check('PTKP status kosong -> fallback dasar', TaxEngine.hitungPTKP(''), 54000000);
check('PTKP status tidak dikenal -> fallback dasar', TaxEngine.hitungPTKP('ACAK'), 54000000);

// --- hitungTarifProgresif (Pasal 17 UU HPP: 5/15/25/30/35%, lapisan 60jt/250jt/500jt/5M) ---
check('PKP 0 -> PPh 0', TaxEngine.hitungTarifProgresif(0), 0);
check('PKP negatif -> PPh 0 (tidak minus)', TaxEngine.hitungTarifProgresif(-5000000), 0);
check('PKP di dalam lapisan pertama (50jt) -> 5% penuh', TaxEngine.hitungTarifProgresif(50000000), 2500000);
check('PKP tepat di batas lapisan 1 (60jt)', TaxEngine.hitungTarifProgresif(60000000), 3000000);
near('PKP masuk lapisan 2 (100jt)', TaxEngine.hitungTarifProgresif(100000000), 3000000 + 40000000 * 0.15);
near('PKP masuk lapisan 3 (300jt)', TaxEngine.hitungTarifProgresif(300000000), 3000000 + 190000000 * 0.15 + 50000000 * 0.25);
near('PKP di lapisan tertinggi (6 miliar)', TaxEngine.hitungTarifProgresif(6000000000),
  3000000 + 190000000 * 0.15 + 250000000 * 0.25 + 4500000000 * 0.30 + 1000000000 * 0.35);

// --- hitungKategoriTER & hitungTER (PP 58/2023 & PMK 168/2023) ---
check('Kategori TER untuk PTKP TK/0 (54jt) -> A', TaxEngine.hitungKategoriTER(54000000), 'A');
check('Kategori TER untuk PTKP K/3 (72jt) -> C', TaxEngine.hitungKategoriTER(72000000), 'C');

const terRendah = TaxEngine.hitungTER(5000000, 'TK/0');
check('TER kategori A, bruto di bawah 5,4jt -> tarif 0%', terRendah.tarif, 0);
check('TER kategori A, bruto di bawah 5,4jt -> PPh 0', terRendah.pph, 0);

const ter10jt = TaxEngine.hitungTER(10000000, 'TK/0');
check('TER kategori A untuk TK/0', ter10jt.kategori, 'A');
check('TER kategori A, bruto 10jt -> tarif 2%', ter10jt.tarif, 0.02);
check('TER kategori A, bruto 10jt -> PPh = Rp200.000', ter10jt.pph, 200000);

const terK3 = TaxEngine.hitungTER(10000000, 'K/3');
check('TER kategori C untuk K/3', terK3.kategori, 'C');

// Regresi: kategori harus konsisten naik seiring PTKP (A paling ringan, C paling berat
// untuk bruto yang sama, sejalan dengan semakin besar PTKP -> tarif TER lebih rendah
// di rentang bruto yang sama, karena kategori C punya lapisan tarif-0% lebih tinggi).
check('Bruto 6jt: kategori A sudah kena tarif, kategori C masih 0% (PTKP lebih besar)',
  TaxEngine.hitungTER(6000000, 'K/3').tarif <= TaxEngine.hitungTER(6000000, 'TK/0').tarif, true);

// --- hitungPPhBadan (Pasal 31E UU PPh: fasilitas diskon 50% s.d. Rp4,8 miliar) ---
const badanKecil = TaxEngine.hitungPPhBadan(2000000000, 500000000); // peredaran 2M, PKP 500jt, semua dapat fasilitas
near('PPh Badan — peredaran di bawah 4,8M: seluruh PKP dapat fasilitas 50%', badanKecil.pphTerutang, 500000000 * 0.11);
check('PPh Badan — peredaran di bawah 4,8M: fasilitas penuh', badanKecil.fasilitasPenuh, true);

const badanBesar = TaxEngine.hitungPPhBadan(10000000000, 1000000000); // peredaran 10M (di atas 4,8M, di bawah 50M) -> proporsional
const proporsiFasilitas = (4800000000 / 10000000000) * 1000000000;
near('PPh Badan — peredaran 10M: PKP fasilitas proporsional', badanBesar.pkpFasilitas, proporsiFasilitas);
check('PPh Badan — peredaran 10M: dapat fasilitas (belum fasilitas penuh)', badanBesar.dapatFasilitas, true);
check('PPh Badan — peredaran 10M: bukan fasilitas penuh (karena ada porsi nonfasilitas)', badanBesar.fasilitasPenuh, false);

const badanRaksasa = TaxEngine.hitungPPhBadan(60000000000, 5000000000); // di atas 50M -> tidak dapat fasilitas sama sekali
check('PPh Badan — peredaran di atas 50M: tidak dapat fasilitas 31E', badanRaksasa.dapatFasilitas, false);
near('PPh Badan — peredaran di atas 50M: tarif normal 22% penuh', badanRaksasa.pphTerutang, 5000000000 * 0.22);

check('PPh Badan — PKP nol/rugi: PPh terutang 0', TaxEngine.hitungPPhBadan(1000000000, 0).pphTerutang, 0);

// --- hitungPPhFinalUMKM (PP 55/2022 — 0,5% x peredaran bruto) ---
near('PPh Final UMKM 0,5% dari peredaran bruto 500jt', TaxEngine.hitungPPhFinalUMKM(500000000), 2500000);
check('PPh Final UMKM — peredaran 0 -> PPh 0', TaxEngine.hitungPPhFinalUMKM(0), 0);

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
