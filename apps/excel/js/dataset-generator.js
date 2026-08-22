/**
 * dataset-generator.js
 * ---------------------------------------------------------------------------
 * Bertugas MEMBUAT DATA saja (tidak tahu apa-apa tentang UI atau spreadsheet).
 * Tahap 1: hanya dataset "Penjualan" yang diimplementasikan penuh.
 * Dataset lain (Akuntansi, Karyawan/HR, Persediaan) akan menyusul di tahap
 * berikutnya dan akan ditambahkan sebagai fungsi generate*() baru di file ini
 * tanpa mengubah kontrak (headers + rows + meta) yang sudah ada.
 *
 * Tahap 2: kolom Tanggal kini disimpan sebagai SERIAL NUMBER bergaya Excel
 * (lihat dateToSerial di spreadsheet-engine.js), bukan string "DD/MM/YYYY" —
 * supaya fungsi tanggal (YEAR/MONTH/DAY/DATEDIF/dst.) bisa menghitungnya
 * persis seperti Excel asli. Tampilan "DD/MM/YYYY" murni urusan app.js.
 * ---------------------------------------------------------------------------
 */

import { dateToSerial } from './spreadsheet-engine.js';

/**
 * PRNG sederhana (mulberry32) agar dataset dapat dibuat ulang persis sama
 * jika diberi seed yang sama. Ini BUKAN untuk keperluan kriptografi,
 * hanya untuk keperluan reproducibility latihan.
 * @param {number} seed
 * @returns {() => number} fungsi yang menghasilkan angka acak [0, 1)
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mengubah string seed menjadi angka 32-bit (hash sederhana).
 * Supaya pengguna bisa memasukkan seed berupa teks maupun angka.
 * @param {string|number} input
 * @returns {number}
 */
function hashSeed(input) {
  const str = String(input);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/** Ambil elemen acak dari array menggunakan fungsi random() yang diberikan. */
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Ambil integer acak inklusif [min, max]. */
function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Bulatkan ke kelipatan tertentu (mis. 500) supaya harga terlihat wajar. */
function roundToNearest(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

// ---------------------------------------------------------------------------
// Data referensi untuk dataset Penjualan
// ---------------------------------------------------------------------------

const PRODUK_MASTER = [
  { kode: 'ELK-001', nama: 'Laptop ASUS Vivobook 14', kategori: 'Elektronik', hargaDasar: 6500000 },
  { kode: 'ELK-002', nama: 'Smartphone Samsung Galaxy A15', kategori: 'Elektronik', hargaDasar: 2800000 },
  { kode: 'ELK-003', nama: 'Printer Canon Pixma G2010', kategori: 'Elektronik', hargaDasar: 1250000 },
  { kode: 'ELK-004', nama: 'Power Bank 20000mAh', kategori: 'Elektronik', hargaDasar: 285000 },
  { kode: 'FSH-001', nama: 'Kemeja Batik Pria Lengan Panjang', kategori: 'Fashion', hargaDasar: 175000 },
  { kode: 'FSH-002', nama: 'Tas Ransel Kulit Sintetis', kategori: 'Fashion', hargaDasar: 320000 },
  { kode: 'FSH-003', nama: 'Sepatu Sneakers Casual', kategori: 'Fashion', hargaDasar: 450000 },
  { kode: 'MKN-001', nama: 'Kopi Arabika Gayo 1kg', kategori: 'Makanan & Minuman', hargaDasar: 145000 },
  { kode: 'MKN-002', nama: 'Paket Snack Kantor', kategori: 'Makanan & Minuman', hargaDasar: 85000 },
  { kode: 'ATK-001', nama: 'Kertas HVS A4 80gsm 1 Rim', kategori: 'Alat Tulis Kantor', hargaDasar: 55000 },
  { kode: 'ATK-002', nama: 'Tinta Printer Refill 100ml', kategori: 'Alat Tulis Kantor', hargaDasar: 65000 },
  { kode: 'FUR-001', nama: 'Kursi Kantor Ergonomis', kategori: 'Furnitur', hargaDasar: 950000 },
  { kode: 'FUR-002', nama: 'Meja Kerja Minimalis 120cm', kategori: 'Furnitur', hargaDasar: 1250000 },
];

const WILAYAH_LIST = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten',
  'Sumatera Utara', 'Sumatera Selatan', 'Kalimantan Timur', 'Sulawesi Selatan', 'Bali',
];

const NAMA_DEPAN = [
  'Andi', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko',
  'Kartika', 'Lestari', 'Made', 'Nur', 'Oki', 'Putri', 'Rahmat', 'Siti', 'Taufik', 'Umi',
  'Vina', 'Wawan', 'Yanti', 'Zainal', 'Ratna', 'Sigit', 'Wulan', 'Yusuf',
];
const NAMA_BELAKANG = [
  'Saputra', 'Wijaya', 'Kusuma', 'Pratama', 'Setiawan', 'Handayani', 'Nugroho', 'Santoso',
  'Ramadhan', 'Utami', 'Hidayat', 'Permata', 'Firmansyah', 'Anggraini', 'Susanto', 'Maharani',
];
const PERUSAHAAN_PREFIX = ['PT', 'CV', 'UD'];
const PERUSAHAAN_NAMA = [
  'Sinar Abadi', 'Karya Mandiri', 'Sumber Makmur', 'Mitra Sejahtera', 'Cahaya Nusantara',
  'Bumi Perkasa', 'Tunas Jaya', 'Anugerah Sentosa', 'Berkah Utama', 'Global Sukses',
];

const SALES_TEAM = [
  'Rina Wulandari', 'Agus Salim', 'Fitri Handayani', 'Bambang Suryadi', 'Dian Puspita',
  'Hendra Kurniawan', 'Sri Mulyani', 'Doni Pratama',
];

function generateNamaPelanggan(rng) {
  // 60% pelanggan perorangan, 40% pelanggan perusahaan — mencerminkan data B2C+B2B yang realistis
  if (rng() < 0.6) {
    return `${pick(rng, NAMA_DEPAN)} ${pick(rng, NAMA_BELAKANG)}`;
  }
  return `${pick(rng, PERUSAHAAN_PREFIX)} ${pick(rng, PERUSAHAAN_NAMA)}`;
}

/**
 * Menghasilkan dataset Penjualan.
 * @param {Object} options
 * @param {number} options.count - jumlah baris transaksi yang diminta
 * @param {number|string} [options.seed] - seed agar dataset dapat dibuat ulang
 * @param {number} [options.tahun] - tahun transaksi (default 2026)
 * @returns {{headers: string[], columnTypes: string[], rows: any[][], meta: object}}
 */
export function generateSalesDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const tahun = options.tahun || 2026;

  const headers = [
    'ID Transaksi', 'Tanggal', 'Nama Pelanggan', 'Kode Produk', 'Nama Produk',
    'Kategori', 'Wilayah', 'Jumlah', 'Harga Satuan', 'Diskon (%)',
    'DPP', 'Pajak (PPN 11%)', 'Total Penjualan', 'Nama Sales',
  ];
  // 'number' | 'text' | 'date' — dipakai spreadsheet-engine.js untuk perataan & validasi tipe
  const columnTypes = [
    'text', 'date', 'text', 'text', 'text',
    'text', 'text', 'number', 'number', 'number',
    'number', 'number', 'number', 'text',
  ];

  const idPad = String(count).length + 3;
  const rows = [];

  for (let i = 1; i <= count; i++) {
    const produk = pick(rng, PRODUK_MASTER);
    const jumlah = randInt(rng, 1, 10);
    // variasi harga ±5% dari harga dasar supaya tidak semua baris identik
    const variasi = 1 + (rng() * 0.1 - 0.05);
    const hargaSatuan = roundToNearest(produk.hargaDasar * variasi, 500);

    // diskon: sebagian besar transaksi tanpa diskon, sebagian kecil dapat diskon promo
    const diskonPersenPool = [0, 0, 0, 0, 5, 5, 10, 15];
    const diskonPersen = pick(rng, diskonPersenPool);

    const subtotal = jumlah * hargaSatuan;
    const dpp = Math.round(subtotal * (1 - diskonPersen / 100));
    const pajak = Math.round(dpp * 0.11);
    const total = dpp + pajak;

    const bulan = randInt(rng, 1, 6); // Januari - Juni, tahun berjalan
    const hariMax = new Date(tahun, bulan, 0).getDate();
    const hari = randInt(rng, 1, hariMax);
    const tanggal = new Date(tahun, bulan - 1, hari);

    rows.push([
      `TRX-${String(i).padStart(idPad, '0')}`,
      dateToSerial(tanggal),
      generateNamaPelanggan(rng),
      produk.kode,
      produk.nama,
      produk.kategori,
      pick(rng, WILAYAH_LIST),
      jumlah,
      hargaSatuan,
      diskonPersen,
      dpp,
      pajak,
      total,
      pick(rng, SALES_TEAM),
    ]);
  }

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'sales',
      datasetLabel: 'Penjualan',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function generateAccountingDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const tahun = options.tahun || 2026;

  const headers = ['ID Jurnal', 'Tanggal', 'Akun', 'Jenis', 'Debit', 'Kredit', 'Keterangan'];
  const columnTypes = ['text', 'date', 'text', 'text', 'number', 'number', 'text'];
  const akunList = [
    'Kas', 'Piutang Usaha', 'Persediaan', 'Peralatan', 'Utang Usaha', 'Modal',
    'Pendapatan Jasa', 'Beban Sewa', 'Beban Gaji', 'Beban Listrik',
  ];
  const keteranganList = [
    'Penerimaan pembayaran', 'Pembelian perlengkapan', 'Pembayaran sewa', 'Pembayaran gaji',
    'Pencatatan penjualan', 'Pembayaran listrik', 'Setoran modal', 'Pencairan piutang',
  ];
  const rows = [];

  for (let i = 1; i <= count; i++) {
    const bulan = randInt(rng, 1, 6);
    const hariMax = new Date(tahun, bulan, 0).getDate();
    const hari = randInt(rng, 1, hariMax);
    const tanggal = new Date(tahun, bulan - 1, hari);
    const akun = pick(rng, akunList);
    const jenis = rng() > 0.5 ? 'Debit' : 'Kredit';
    const nominal = roundToNearest(250000 + rng() * 9500000, 5000);
    const debit = jenis === 'Debit' ? nominal : 0;
    const kredit = jenis === 'Kredit' ? nominal : 0;

    rows.push([
      `JRL-${String(i).padStart(4, '0')}`,
      dateToSerial(tanggal),
      akun,
      pick(rng, ['Operasional', 'Investasi', 'Pembiayaan']),
      debit,
      kredit,
      `${pick(rng, keteranganList)} ${i}`,
    ]);
  }

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'accounting',
      datasetLabel: 'Akuntansi',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function generateHrDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const tahun = options.tahun || 2026;

  const headers = ['ID Karyawan', 'Nama', 'Divisi', 'Jabatan', 'Tanggal Masuk', 'Gaji Pokok', 'Tunjangan', 'Potongan', 'Status', 'Lokasi'];
  const columnTypes = ['text', 'text', 'text', 'text', 'date', 'number', 'number', 'number', 'text', 'text'];
  const divisiList = ['Finance', 'HR', 'Operasional', 'IT', 'Sales'];
  const jabatanList = ['Staff', 'Supervisor', 'Manager', 'Analyst', 'Specialist'];
  const lokasiList = ['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Medan'];
  const statusList = ['Aktif', 'Cuti', 'Training', 'Resign'];
  const rows = [];

  for (let i = 1; i <= count; i++) {
    const bulan = randInt(rng, 1, 6);
    const hariMax = new Date(tahun, bulan, 0).getDate();
    const hari = randInt(rng, 1, hariMax);
    const tanggal = new Date(tahun, bulan - 1, hari);
    const gaji = roundToNearest(4500000 + rng() * 5500000, 50000);
    const tunjangan = roundToNearest(rng() * 1200000, 50000);
    const potongan = roundToNearest(rng() * 350000, 50000);

    rows.push([
      `KRY-${String(i).padStart(4, '0')}`,
      `${pick(rng, NAMA_DEPAN)} ${pick(rng, NAMA_BELAKANG)}`,
      pick(rng, divisiList),
      pick(rng, jabatanList),
      dateToSerial(tanggal),
      gaji,
      tunjangan,
      potongan,
      pick(rng, statusList),
      pick(rng, lokasiList),
    ]);
  }

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'hr',
      datasetLabel: 'Karyawan / HRS',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function generateInventoryDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);

  const headers = ['ID Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Stok Awal', 'Masuk', 'Keluar', 'Stok Akhir', 'Harga Beli', 'Nilai Persediaan'];
  const columnTypes = ['text', 'text', 'text', 'text', 'number', 'number', 'number', 'number', 'number', 'number'];
  const namaBarangList = [
    'Buku Tulis', 'Pensil', 'Kertas A4', 'Stapler', 'Map File', 'Binder', 'Mouse', 'Keyboard',
  ];
  const kategoriList = ['ATK', 'Elektronik', 'Perlengkapan'];
  const satuanList = ['Dus', 'Pcs', 'Box', 'Rim'];
  const rows = [];

  for (let i = 1; i <= count; i++) {
    const stokAwal = randInt(rng, 20, 200);
    const masuk = randInt(rng, 0, 80);
    const keluar = randInt(rng, 0, 50);
    const stokAkhir = stokAwal + masuk - keluar;
    const hargaBeli = roundToNearest(15000 + rng() * 350000, 500);
    const nilaiPersediaan = stokAkhir * hargaBeli;
    rows.push([
      `BRG-${String(i).padStart(4, '0')}`,
      `${pick(rng, namaBarangList)} ${i}`,
      pick(rng, kategoriList),
      pick(rng, satuanList),
      stokAwal,
      masuk,
      keluar,
      stokAkhir,
      hargaBeli,
      nilaiPersediaan,
    ]);
  }

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'inventory',
      datasetLabel: 'Persediaan',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Peta pusat semua generator dataset yang tersedia.
 * Tahap berikutnya tinggal menambah entri baru di sini (mis. 'accounting', 'hr', 'inventory')
 * tanpa mengubah pemanggil (app.js).
 */
export const DATASET_GENERATORS = {
  sales: {
    label: 'Penjualan',
    description: 'Transaksi penjualan produk lintas wilayah, lengkap dengan DPP, PPN, dan diskon.',
    generate: generateSalesDataset,
    available: true,
  },
  accounting: {
    label: 'Akuntansi',
    description: 'Jurnal umum lintas akun (aset, liabilitas, modal, pendapatan, beban).',
    generate: generateAccountingDataset,
    available: true,
  },
  hr: {
    label: 'Karyawan / HR',
    description: 'Data payroll karyawan lintas divisi, lengkap dengan tunjangan dan potongan.',
    generate: generateHrDataset,
    available: true,
  },
  inventory: {
    label: 'Persediaan',
    description: 'Kartu stok barang: barang masuk, keluar, dan nilai persediaan.',
    generate: generateInventoryDataset,
    available: true,
  },
};
