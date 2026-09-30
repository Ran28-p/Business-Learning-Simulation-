// Pengujian integritas dataset relasional (js/dataset-generator.js) — MURNI
// struktur & integritas referensial, TANPA bergantung pada sistem latihan
// interaktif lama (question-engine/question-bank/table-fill-builder, sudah
// dihapus). Menggantikan tests/test-relational-dataset.mjs dan
// tests/test-hr-relational-dataset.mjs yang lama, yang isinya sebagian besar
// menguji sistem yang sudah dihapus itu.
//
// Mencakup 3 generator yang benar-benar dipakai Exercise Generator sekarang
// (lihat EXERCISE_MATERI_GENERATORS di js/dataset-generator.js):
//   - generateSalesRelationalDataset  -> Master Produk
//   - generateInventoryRelationalDataset -> Master Barang + Kategori->Supplier
//   - generateHrRelationalDataset -> Referensi Jabatan
//
// Jalankan: node tests/test-dataset-integrity.mjs

import {
  generateSalesRelationalDataset,
  generateInventoryRelationalDataset,
  generateHrRelationalDataset,
  EXERCISE_MATERI_GENERATORS,
} from '../js/dataset-generator.js';

let pass = 0;
let fail = 0;
function ok(label, condition) {
  if (condition) { pass += 1; } else { fail += 1; console.log(`FAIL: ${label}`); }
}
function section(t) { console.log(`\n=== ${t} ===`); }

section('EXERCISE_MATERI_GENERATORS: satu generator relasional per materi');
ok('sales terdaftar', typeof EXERCISE_MATERI_GENERATORS.sales?.generate === 'function');
ok('inventori terdaftar', typeof EXERCISE_MATERI_GENERATORS.inventori?.generate === 'function');
ok('karyawan terdaftar', typeof EXERCISE_MATERI_GENERATORS.karyawan?.generate === 'function');

section('generateSalesRelationalDataset(): struktur & integritas referensial');
for (let i = 0; i < 15; i++) {
  const ds = generateSalesRelationalDataset({ count: 20 + i, seed: `sales-rel-${i}` });
  ok(`[${i}] TRANSAKSI tidak memuat "Nama Produk"/"Kategori"/"Harga Satuan"`, !ds.headers.includes('Nama Produk') && !ds.headers.includes('Kategori') && !ds.headers.includes('Harga Satuan'));
  ok(`[${i}] TRANSAKSI memuat "Kode Produk" (FK)`, ds.headers.includes('Kode Produk'));
  ok(`[${i}] jumlah baris sesuai permintaan`, ds.rows.length === 20 + i);
  ok(`[${i}] Master Produk tersedia & tidak kosong`, !!ds.meta.masterTable && ds.meta.masterTable.rows.length > 0);
  const kodeCol = ds.headers.indexOf('Kode Produk');
  const mKodeCol = ds.meta.masterTable.headers.indexOf('Kode Produk');
  const masterKodes = new Set(ds.meta.masterTable.rows.map((r) => r[mKodeCol]));
  ok(`[${i}] semua Kode Produk transaksi ada di Master Produk`, ds.rows.every((r) => masterKodes.has(r[kodeCol])));
}
{
  const a = generateSalesRelationalDataset({ count: 30, seed: 'repro-sales' });
  const b = generateSalesRelationalDataset({ count: 30, seed: 'repro-sales' });
  ok('seed sama -> baris transaksi identik', JSON.stringify(a.rows) === JSON.stringify(b.rows));
}

section('generateInventoryRelationalDataset(): struktur & integritas referensial');
for (let i = 0; i < 15; i++) {
  const ds = generateInventoryRelationalDataset({ count: 20 + i, seed: `inv-rel-${i}` });
  ok(`[${i}] kartu stok tidak memuat "Nama Barang"/"Kategori"/"Harga Beli"`, !ds.headers.includes('Nama Barang') && !ds.headers.includes('Kategori') && !ds.headers.includes('Harga Beli'));
  ok(`[${i}] kartu stok memuat "Kode Barang" (FK)`, ds.headers.includes('Kode Barang'));
  ok(`[${i}] jumlah baris sesuai permintaan`, ds.rows.length === 20 + i);
  ok(`[${i}] Master Barang & Kategori->Supplier tersedia`, !!ds.meta.masterTable && !!ds.meta.supplierTable);
  const kodeCol = ds.headers.indexOf('Kode Barang');
  const mKodeCol = ds.meta.masterTable.headers.indexOf('Kode Barang');
  const masterKodes = new Set(ds.meta.masterTable.rows.map((r) => r[mKodeCol]));
  ok(`[${i}] semua Kode Barang ada di Master Barang`, ds.rows.every((r) => masterKodes.has(r[kodeCol])));
  const mKategoriCol = ds.meta.masterTable.headers.indexOf('Kategori');
  const masterKategoris = new Set(ds.meta.masterTable.rows.map((r) => r[mKategoriCol]));
  const sKategoriCol = ds.meta.supplierTable.headers.indexOf('Kategori');
  const supplierKategoris = new Set(ds.meta.supplierTable.rows.map((r) => r[sKategoriCol]));
  ok(`[${i}] setiap Kategori di Master Barang punya Supplier`, [...masterKategoris].every((k) => supplierKategoris.has(k)));
}

section('generateHrRelationalDataset(): struktur & integritas referensial');
for (let i = 0; i < 15; i++) {
  const ds = generateHrRelationalDataset({ count: 20 + i, seed: `hr-rel-${i}` });
  ok(`[${i}] data karyawan tidak memuat "Jabatan"/"Gaji Pokok"/"Bonus"`, !ds.headers.includes('Jabatan') && !ds.headers.includes('Gaji Pokok') && !ds.headers.includes('Bonus'));
  ok(`[${i}] data karyawan memuat "Kode Jabatan" (FK)`, ds.headers.includes('Kode Jabatan'));
  ok(`[${i}] jumlah baris sesuai permintaan`, ds.rows.length === 20 + i);
  ok(`[${i}] Referensi Jabatan tersedia & tidak kosong`, !!ds.meta.masterTable && ds.meta.masterTable.rows.length > 0);
  const kodeCol = ds.headers.indexOf('Kode Jabatan');
  const mKodeCol = ds.meta.masterTable.headers.indexOf('Kode Jabatan');
  const masterKodes = new Set(ds.meta.masterTable.rows.map((r) => r[mKodeCol]));
  ok(`[${i}] semua Kode Jabatan ada di Referensi Jabatan`, ds.rows.every((r) => masterKodes.has(r[kodeCol])));

  // Konstrain tanggal: Tanggal Lahir < Tanggal Masuk, umur saat masuk >= 20 th,
  // Tanggal Masuk <= hari ini (serial Excel, hari 0 = 1899-12-30)
  const lahirCol = ds.headers.indexOf('Tanggal Lahir');
  const masukCol = ds.headers.indexOf('Tanggal Masuk');
  const todaySerial = Math.floor(Date.now() / 86400000) + 25569; // epoch -> serial Excel
  ds.rows.forEach((r, idx) => {
    const lahir = r[lahirCol];
    const masuk = r[masukCol];
    ok(`[${i}][baris ${idx}] Tanggal Lahir < Tanggal Masuk`, lahir < masuk);
    ok(`[${i}][baris ${idx}] umur saat masuk >= 20 tahun`, (masuk - lahir) / 365.25 >= 20);
    ok(`[${i}][baris ${idx}] Tanggal Masuk <= hari ini`, masuk <= todaySerial);
  });
}
{
  const a = generateHrRelationalDataset({ count: 30, seed: 'repro-hr' });
  const b = generateHrRelationalDataset({ count: 30, seed: 'repro-hr' });
  ok('seed sama -> baris karyawan identik', JSON.stringify(a.rows) === JSON.stringify(b.rows));
}

console.log(`\n========== RESULTS: ${pass} passed, ${fail} failed ==========`);
if (fail > 0) process.exit(1);
