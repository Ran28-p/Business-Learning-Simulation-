// Membangkitkan apps/excel/data/payroll-ter.js dari mesin pajak SPT (apps/spt/js/shared/tax-engine.js)
// agar tabel TER di latihan Excel TIDAK diketik ulang (sumber tunggal). tests/test-payroll-ter.mjs menjaga
// keduanya tetap identik; jalankan skrip ini lagi bila tabel TER di tax-engine.js diperbarui:
//     node scripts/gen-excel-payroll-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, document: {}, localStorage: { getItem() { return null; } } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'apps/spt/js/shared/tax-engine.js'), 'utf8'), ctx);
const T = ctx.TaxEngine;

const OPEN = 999999999999; // batas atas lapisan terakhir ("tanpa batas") — cukup besar untuk gaji bulanan mana pun
const layers = (k) => T.TER_TABLE[k].map((r) => `[${r.max === Infinity ? OPEN : r.max}, ${r.rate}]`);
const chunk = (arr, n) => arr.reduce((a, x, i) => { (a[Math.floor(i / n)] ||= []).push(x); return a; }, []).map((c) => '    ' + c.join(', ')).join(',\n');

const out = `/**
 * payroll-ter.js — Data acuan latihan "Penggajian & PPh 21 (TER)". DIBANGKITKAN oleh scripts/gen-excel-payroll-data.mjs
 * dari apps/spt/js/shared/tax-engine.js (sumber tunggal tabel TER). JANGAN diedit manual; tests/test-payroll-ter.mjs
 * memastikan isinya identik dengan mesin SPT dan cocok dengan titik-titik acuan dari sumber publik.
 *
 * Dasar hukum (diverifikasi terhadap ringkasan resmi/pakar publik pada 12 Okt 2026):
 *   • PP 58/2023 dan PMK 168/2023 — pemotongan PPh 21 dengan Tarif Efektif Rata-rata (TER) bulanan; Desember
 *     (masa pajak terakhir) dihitung dengan tarif Pasal 17 atas penghasilan setahun, dikurangi PPh Jan–Nov.
 *   • UU HPP (tarif Pasal 17 ayat (1) huruf a) — lima lapisan 5% / 15% / 25% / 30% / 35%.
 *   • PMK 101/2016 — PTKP (TK/0 Rp54.000.000; +Rp4.500.000 untuk status kawin dan tiap tanggungan, maksimal 3).
 *     CATATAN: per 11 Okt 2026 pemerintah baru MEMBICARAKAN penyesuaian PTKP (rencana 2027, besaran belum ditetapkan).
 *     Bila aturan baru terbit, ubah PTKP di tax-engine.js lalu jalankan ulang scripts/gen-excel-payroll-data.mjs.
 *   • Biaya jabatan 5% dari penghasilan bruto, maksimal Rp500.000/bulan (Rp6.000.000/tahun) — PMK 168/2023.
 *   • PKP dibulatkan ke bawah hingga ribuan rupiah penuh; jumlah PPh dibulatkan ke bawah ke rupiah penuh.
 */

/** Lapisan terakhir tabel TER bersifat "tanpa batas": diganti angka sangat besar agar bisa dipakai di rumus Excel. */
export const BATAS_TERBUKA = ${OPEN};

/** Kategori TER menurut PTKP: A = TK/0, TK/1, K/0 · B = TK/2, TK/3, K/1, K/2 · C = K/3. */
export const KATEGORI_TER = { 'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A', 'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B', 'K/3': 'C' };

/** PTKP setahun per status (PMK 101/2016). */
export const PTKP_SETAHUN = { 'TK/0': ${T.hitungPTKP('TK/0')}, 'TK/1': ${T.hitungPTKP('TK/1')}, 'TK/2': ${T.hitungPTKP('TK/2')}, 'TK/3': ${T.hitungPTKP('TK/3')}, 'K/0': ${T.hitungPTKP('K/0')}, 'K/1': ${T.hitungPTKP('K/1')}, 'K/2': ${T.hitungPTKP('K/2')}, 'K/3': ${T.hitungPTKP('K/3')} };

/** Tarif Pasal 17 ayat (1) huruf a UU PPh (UU HPP): [batas atas PKP setahun, tarif]. */
export const PASAL17 = [[60000000, 0.05], [250000000, 0.15], [500000000, 0.25], [5000000000, 0.30], [${OPEN}, 0.35]];

/** Biaya jabatan: 5% dari bruto, maksimal Rp6.000.000 setahun (Rp500.000 sebulan). */
export const BIAYA_JABATAN = { tarif: 0.05, maksSetahun: 6000000 };

/** Tabel TER bulanan — tiap baris: [batas atas penghasilan bruto sebulan, tarif]. Batas bawah = batas atas baris sebelumnya + 1. */
export const TER_TABEL = {
  A: [
${chunk(layers('A'), 4)}
  ],
  B: [
${chunk(layers('B'), 4)}
  ],
  C: [
${chunk(layers('C'), 4)}
  ],
};
`;
writeFileSync(join(ROOT, 'apps/excel/data/payroll-ter.js'), out);
console.log('ditulis apps/excel/data/payroll-ter.js —', ['A', 'B', 'C'].map((k) => k + ':' + T.TER_TABLE[k].length).join(' '), 'lapisan');
