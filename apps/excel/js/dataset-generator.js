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
export function mulberry32(seed) {
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
export function hashSeed(input) {
  const str = String(input);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/** Ambil elemen acak dari array menggunakan fungsi random() yang diberikan. */
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Ambil integer acak inklusif [min, max]. */
export function randInt(rng, min, max) {
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
  { kode: 'ELK-005', nama: 'Monitor LG 24 Inch Full HD', kategori: 'Elektronik', hargaDasar: 1650000 },
  { kode: 'ELK-006', nama: 'Earphone Bluetooth TWS', kategori: 'Elektronik', hargaDasar: 195000 },
  { kode: 'ELK-007', nama: 'Smart TV 43 Inch Android', kategori: 'Elektronik', hargaDasar: 3450000 },
  { kode: 'FSH-001', nama: 'Kemeja Batik Pria Lengan Panjang', kategori: 'Fashion', hargaDasar: 175000 },
  { kode: 'FSH-002', nama: 'Tas Ransel Kulit Sintetis', kategori: 'Fashion', hargaDasar: 320000 },
  { kode: 'FSH-003', nama: 'Sepatu Sneakers Casual', kategori: 'Fashion', hargaDasar: 450000 },
  { kode: 'FSH-004', nama: 'Jaket Hoodie Unisex', kategori: 'Fashion', hargaDasar: 210000 },
  { kode: 'FSH-005', nama: 'Jam Tangan Analog Kulit', kategori: 'Fashion', hargaDasar: 385000 },
  { kode: 'MKN-001', nama: 'Kopi Arabika Gayo 1kg', kategori: 'Makanan & Minuman', hargaDasar: 145000 },
  { kode: 'MKN-002', nama: 'Paket Snack Kantor', kategori: 'Makanan & Minuman', hargaDasar: 85000 },
  { kode: 'MKN-003', nama: 'Madu Hutan Asli 500ml', kategori: 'Makanan & Minuman', hargaDasar: 120000 },
  { kode: 'MKN-004', nama: 'Teh Celup Premium 100 sachet', kategori: 'Makanan & Minuman', hargaDasar: 68000 },
  { kode: 'ATK-001', nama: 'Kertas HVS A4 80gsm 1 Rim', kategori: 'Alat Tulis Kantor', hargaDasar: 55000 },
  { kode: 'ATK-002', nama: 'Tinta Printer Refill 100ml', kategori: 'Alat Tulis Kantor', hargaDasar: 65000 },
  { kode: 'ATK-003', nama: 'Buku Agenda Kerja 2026', kategori: 'Alat Tulis Kantor', hargaDasar: 48000 },
  { kode: 'FUR-001', nama: 'Kursi Kantor Ergonomis', kategori: 'Furnitur', hargaDasar: 950000 },
  { kode: 'FUR-002', nama: 'Meja Kerja Minimalis 120cm', kategori: 'Furnitur', hargaDasar: 1250000 },
  { kode: 'FUR-003', nama: 'Rak Buku 5 Susun', kategori: 'Furnitur', hargaDasar: 675000 },
  { kode: 'OLR-001', nama: 'Matras Yoga Anti-Slip', kategori: 'Olahraga', hargaDasar: 135000 },
  { kode: 'OLR-002', nama: 'Sepeda Lipat 16 Inch', kategori: 'Olahraga', hargaDasar: 2100000 },
  { kode: 'OLR-003', nama: 'Dumbbell Set 10kg', kategori: 'Olahraga', hargaDasar: 310000 },
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

const METODE_PEMBAYARAN = ['Transfer Bank', 'Kartu Kredit', 'QRIS', 'Tunai', 'COD'];
const CHANNEL_PENJUALAN = ['Toko Fisik', 'Online (Website)', 'Marketplace', 'Reseller'];
const TIPE_KONSUMEN = ['Retail', 'Grosir', 'Korporat'];
// Target bulanan per wilayah (dipakai untuk soal Pencapaian/Growth — lookup
// via Wilayah, BUKAN kolom yang ikut disalin ke tabel transaksi).
const WILAYAH_TARGET = WILAYAH_LIST.map((w, i) => ({ wilayah: w, target: 8000000 + (i % 5) * 1500000 }));

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
 * Menghasilkan dataset Penjualan RELASIONAL — beda dari generateSalesDataset()
 * di atas: tabel TRANSAKSI di sini SENGAJA tidak menyimpan Nama Produk/
 * Kategori/Harga Satuan sendiri (kolom-kolom itu cuma ada di tabel referensi
 * Master Produk terpisah). Siswa WAJIB melakukan lookup sungguhan lintas
 * tabel, bukan lookup di dalam tabel yang sama seperti generateSalesDataset().
 * Lihat docs/STATUS-TAHAP-6.md untuk alasan desainnya (kenapa blok kolom
 * terpisah pada sheet yang sama, bukan sheet Excel terpisah).
 *
 * Master Produk memakai katalog PRODUK_MASTER yang SAMA dengan dataset
 * 'sales' (13 produk) — supaya konsisten, dan karena katalog itu memang
 * ditujukan sebagai master data produk sejak awal.
 *
 * @param {Object} options
 * @param {number} options.count - jumlah baris transaksi
 * @param {number|string} [options.seed]
 * @param {number} [options.tahun]
 * @returns {{headers: string[], columnTypes: string[], rows: any[][], meta: object}}
 */
export function generateSalesRelationalDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const tahun = options.tahun || 2026;

  const headers = [
    'No', 'ID Transaksi', 'No Faktur', 'Tanggal', 'Kode Produk', 'Nama Sales', 'Kuantitas',
    'Metode Pembayaran', 'Channel Penjualan', 'Wilayah', 'Tipe Konsumen', 'Penjualan Periode Lalu',
  ];
  const columnTypes = [
    'number', 'text', 'text', 'date', 'text', 'text', 'number',
    'text', 'text', 'text', 'text', 'number',
  ];

  const idPad = String(count).length + 3;
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const produk = pick(rng, PRODUK_MASTER);
    const kuantitas = randInt(rng, 1, 10);
    const bulan = randInt(rng, 1, 6);
    const hariMax = new Date(tahun, bulan, 0).getDate();
    const hari = randInt(rng, 1, hariMax);
    const tanggal = new Date(tahun, bulan - 1, hari);
    const totalPeriodeIni = kuantitas * produk.hargaDasar;
    // baseline periode lalu diacak di sekitar transaksi periode ini, supaya
    // Growth kadang positif kadang negatif (realistis, tidak selalu naik)
    const penjualanPeriodeLalu = Math.round(totalPeriodeIni * (0.7 + rng() * 0.6));

    rows.push([
      i,
      `TRX-${String(i).padStart(idPad, '0')}`,
      `INV/${tahun}/${String(i).padStart(idPad, '0')}`,
      dateToSerial(tanggal),
      produk.kode,
      pick(rng, SALES_TEAM),
      kuantitas,
      pick(rng, METODE_PEMBAYARAN),
      pick(rng, CHANNEL_PENJUALAN),
      pick(rng, WILAYAH_LIST),
      pick(rng, TIPE_KONSUMEN),
      penjualanPeriodeLalu,
    ]);
  }

  // Master Produk: katalog LENGKAP (bukan sampel) — konsisten dengan sifat
  // tabel referensi sungguhan (selalu memuat semua produk, bukan hanya
  // produk yang kebetulan muncul di transaksi).
  const masterHeaders = ['Kode Produk', 'Nama Produk', 'Kategori', 'Harga Satuan'];
  const masterColumnTypes = ['text', 'text', 'text', 'number'];
  const masterRows = PRODUK_MASTER.map((p) => [p.kode, p.nama, p.kategori, p.hargaDasar]);

  const wilayahTargetHeaders = ['Wilayah', 'Target Penjualan Bulanan'];
  const wilayahTargetColumnTypes = ['text', 'number'];
  const wilayahTargetRows = WILAYAH_TARGET.map((w) => [w.wilayah, w.target]);

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'sales-relational',
      datasetLabel: 'Penjualan (Relasional — Master Produk)',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
      masterTable: {
        name: 'MASTER_PRODUK',
        label: 'Master Produk',
        headers: masterHeaders,
        columnTypes: masterColumnTypes,
        rows: masterRows,
      },
      wilayahTargetTable: {
        name: 'WILAYAH_TARGET',
        label: 'Target Penjualan per Wilayah',
        headers: wilayahTargetHeaders,
        columnTypes: wilayahTargetColumnTypes,
        rows: wilayahTargetRows,
      },
    },
  };
}

const JABATAN_MASTER = [
  { kode: 'JAB-01', nama: 'Staff Administrasi', gajiPokok: 4500000, bonus: 300000, tunjangan: 500000 },
  { kode: 'JAB-02', nama: 'Staff Keuangan', gajiPokok: 5200000, bonus: 400000, tunjangan: 600000 },
  { kode: 'JAB-03', nama: 'Staff Pajak', gajiPokok: 5500000, bonus: 450000, tunjangan: 600000 },
  { kode: 'JAB-04', nama: 'Analyst', gajiPokok: 6800000, bonus: 700000, tunjangan: 800000 },
  { kode: 'JAB-05', nama: 'Supervisor', gajiPokok: 7500000, bonus: 900000, tunjangan: 1000000 },
  { kode: 'JAB-06', nama: 'Team Leader', gajiPokok: 8200000, bonus: 1100000, tunjangan: 1200000 },
  { kode: 'JAB-07', nama: 'Manager', gajiPokok: 12000000, bonus: 2000000, tunjangan: 2500000 },
  { kode: 'JAB-08', nama: 'Senior Manager', gajiPokok: 16500000, bonus: 3000000, tunjangan: 3500000 },
  { kode: 'JAB-09', nama: 'Staff IT', gajiPokok: 6000000, bonus: 500000, tunjangan: 700000 },
  { kode: 'JAB-10', nama: 'Staff HR', gajiPokok: 5000000, bonus: 350000, tunjangan: 550000 },
  { kode: 'JAB-11', nama: 'Staff Marketing', gajiPokok: 5400000, bonus: 500000, tunjangan: 600000 },
  { kode: 'JAB-12', nama: 'Junior Analyst', gajiPokok: 5000000, bonus: 400000, tunjangan: 550000 },
  { kode: 'JAB-13', nama: 'Assistant Manager', gajiPokok: 9500000, bonus: 1300000, tunjangan: 1500000 },
  { kode: 'JAB-14', nama: 'General Manager', gajiPokok: 22000000, bonus: 4500000, tunjangan: 5000000 },
];

const STATUS_KEPEGAWAIAN = ['PKWTT', 'PKWT', 'Magang', 'Probation'];
const PTKP_STATUS = ['TK/0', 'TK/1', 'K/0', 'K/1', 'K/2', 'K/3'];
const BANK_LIST = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga'];

/**
 * Menghasilkan dataset Karyawan/HR RELASIONAL — beda dari generateHrDataset()
 * di atas: tabel KARYAWAN di sini SENGAJA tidak menyimpan nama jabatan/gaji
 * pokok/bonus sendiri (kolom-kolom itu cuma ada di tabel referensi
 * "Referensi Jabatan" terpisah, dicari lewat Kode Jabatan). Juga menyertakan
 * Tanggal Lahir (selain Tanggal Masuk) supaya soal umur & masa kerja
 * (DATEDIF) bisa dibuat — persis skenario Expert/Payroll di spesifikasi
 * produk (Nama, Asal, Tanggal Lahir, Tanggal Masuk, Jabatan→Gaji Pokok→
 * Bonus, umur, masa kerja, total gaji).
 *
 * KONSTRAIN TANGGAL (lihat spesifikasi Bagian 16 — "random tapi terkontrol"):
 *   - tanggal lahir < tanggal masuk (SELALU, by construction)
 *   - umur SAAT masuk kerja >= 20 tahun (bukan karyawan di bawah umur)
 *   - tanggal masuk <= hari ini (tidak ada karyawan yang "belum lahir tapi
 *     sudah masuk kerja" / masuk kerja di masa depan)
 */
export function generateHrRelationalDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const today = new Date();

  const headers = [
    'No', 'ID Karyawan', 'NIK KTP', 'Nama', 'Asal', 'Tanggal Lahir', 'Tanggal Masuk', 'Kode Jabatan',
    'Status Kepegawaian', 'Akhir Kontrak', 'PTKP', 'Cuti Terpakai', 'Detail Rekening',
  ];
  const columnTypes = [
    'number', 'text', 'text', 'text', 'text', 'date', 'date', 'text',
    'text', 'date', 'text', 'number', 'text',
  ];

  const idPad = String(count).length + 2;
  const rows = [];
  for (let i = 1; i <= count; i++) {
    // Umur SAAT INI antara 23-58 tahun (rentang usia kerja wajar), lalu masa
    // kerja (tenure) 1 tahun s.d. (umur-20) tahun -> umur saat masuk otomatis
    // >= 20 tahun, dan tanggal masuk otomatis <= hari ini.
    const umurSaatIni = randInt(rng, 23, 58);
    const bulanLahir = randInt(rng, 1, 12);
    const hariLahirMax = new Date(today.getFullYear() - umurSaatIni, bulanLahir, 0).getDate();
    const hariLahir = randInt(rng, 1, hariLahirMax);
    const tanggalLahir = new Date(today.getFullYear() - umurSaatIni, bulanLahir - 1, hariLahir);

    const masaKerjaMax = Math.max(1, umurSaatIni - 20);
    const masaKerjaTahun = randInt(rng, 1, masaKerjaMax);
    let tanggalMasuk = new Date(today.getFullYear() - masaKerjaTahun, randInt(rng, 1, 12) - 1, randInt(rng, 1, 28));
    // Jaga-jaga pembulatan: tanggal masuk tidak boleh sebelum tanggal lahir+20th atau setelah hari ini
    const batasAwal = new Date(tanggalLahir.getFullYear() + 20, tanggalLahir.getMonth(), tanggalLahir.getDate());
    if (tanggalMasuk < batasAwal) tanggalMasuk = batasAwal;
    if (tanggalMasuk > today) tanggalMasuk = today;

    const status = pick(rng, STATUS_KEPEGAWAIAN);
    // PKWTT (karyawan tetap) tidak punya tanggal akhir kontrak -> kosong.
    // Yang lain (PKWT/Magang/Probation) punya akhir kontrak 1-12 bulan ke depan.
    let akhirKontrak = null;
    if (status !== 'PKWTT') {
      const bulanKontrak = randInt(rng, 1, 12);
      const tgl = new Date(today);
      tgl.setMonth(tgl.getMonth() + bulanKontrak);
      akhirKontrak = dateToSerial(tgl);
    }

    // NIK KTP 16 digit: kode wilayah 6 digit (dari WILAYAH_LIST index) + tgl
    // lahir DDMMYY + 4 digit urut acak — pola nyata NIK Indonesia.
    const wilayah = pick(rng, WILAYAH_LIST);
    const kodeWilayah = String(3100 + WILAYAH_LIST.indexOf(wilayah) * 11).padStart(6, '0');
    const nik = `${kodeWilayah}${String(hariLahir).padStart(2, '0')}${String(bulanLahir).padStart(2, '0')}${String((today.getFullYear() - umurSaatIni) % 100).padStart(2, '0')}${String(randInt(rng, 0, 9999)).padStart(4, '0')}`;

    rows.push([
      i,
      `EMP-${String(i).padStart(idPad, '0')}`,
      nik,
      `${pick(rng, NAMA_DEPAN)} ${pick(rng, NAMA_BELAKANG)}`,
      wilayah,
      dateToSerial(tanggalLahir),
      dateToSerial(tanggalMasuk),
      pick(rng, JABATAN_MASTER).kode,
      status,
      akhirKontrak,
      pick(rng, PTKP_STATUS),
      randInt(rng, 0, 12),
      `${pick(rng, BANK_LIST)} - ${randInt(rng, 1000000000, 9999999999)}`,
    ]);
  }

  // Kolom "Total Gaji" DIHITUNG DI SINI (gajiPokok+bonus), bukan digabung
  // lewat dua VLOOKUP dijumlahkan di dalam sel Excel — spreadsheet-engine.js
  // (mesin evaluasi milik alat latihan interaktif) hanya mendukung SATU
  // pemanggilan fungsi per formula di level teratas (mis. IF(DATEDIF(...))
  // berhasil karena DATEDIF ada DI DALAM argumen IF, tapi
  // "VLOOKUP(...)+VLOOKUP(...)" atau "SUM(VLOOKUP(...),VLOOKUP(...))" GAGAL
  // dievaluasi — argumen SUM/operator + tidak menerima ekspresi fungsi
  // bersarang). Kolom ini disediakan sebagai referensi siap pakai; engine
  // Exercise Generator (js/exercise-generator.js) sendiri TIDAK terikat
  // batasan itu (formula ditulis langsung ke .xlsx, dihitung Excel asli).
  const masterHeaders = ['Kode Jabatan', 'Jabatan', 'Gaji Pokok', 'Bonus', 'Tunjangan', 'Total Gaji'];
  const masterColumnTypes = ['text', 'text', 'number', 'number', 'number', 'number'];
  const masterRows = JABATAN_MASTER.map((j) => [j.kode, j.nama, j.gajiPokok, j.bonus, j.tunjangan, j.gajiPokok + j.bonus + j.tunjangan]);

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'hr-relational',
      datasetLabel: 'HR / Payroll (Relasional — Referensi Jabatan)',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
      referenceDate: dateToSerial(today),
      masterTable: {
        name: 'REFERENSI_JABATAN',
        label: 'Referensi Jabatan',
        headers: masterHeaders,
        columnTypes: masterColumnTypes,
        rows: masterRows,
      },
    },
  };
}

const BARANG_MASTER = [
  { kode: 'BR-01', nama: 'Kertas HVS A4', kategori: 'ATK', hargaBeli: 45000, stokMin: 30, leadTime: 3, kadaluarsa: false },
  { kode: 'BR-02', nama: 'Tinta Printer Refill', kategori: 'ATK', hargaBeli: 65000, stokMin: 20, leadTime: 5, kadaluarsa: true },
  { kode: 'BR-03', nama: 'Map Plastik', kategori: 'ATK', hargaBeli: 5000, stokMin: 50, leadTime: 2, kadaluarsa: false },
  { kode: 'BR-04', nama: 'Keyboard USB', kategori: 'Elektronik', hargaBeli: 95000, stokMin: 15, leadTime: 7, kadaluarsa: false },
  { kode: 'BR-05', nama: 'Mouse Wireless', kategori: 'Elektronik', hargaBeli: 75000, stokMin: 15, leadTime: 7, kadaluarsa: false },
  { kode: 'BR-06', nama: 'Flashdisk 32GB', kategori: 'Elektronik', hargaBeli: 60000, stokMin: 20, leadTime: 5, kadaluarsa: false },
  { kode: 'BR-07', nama: 'Kursi Lipat', kategori: 'Perlengkapan', hargaBeli: 210000, stokMin: 10, leadTime: 14, kadaluarsa: false },
  { kode: 'BR-08', nama: 'Rak Arsip', kategori: 'Perlengkapan', hargaBeli: 350000, stokMin: 5, leadTime: 14, kadaluarsa: false },
  { kode: 'BR-09', nama: 'Lampu LED', kategori: 'Perlengkapan', hargaBeli: 40000, stokMin: 25, leadTime: 4, kadaluarsa: false },
  { kode: 'BR-10', nama: 'Dispenser Air', kategori: 'Perlengkapan', hargaBeli: 275000, stokMin: 8, leadTime: 10, kadaluarsa: false },
  { kode: 'BR-11', nama: 'Binder Clip Besar', kategori: 'ATK', hargaBeli: 12000, stokMin: 40, leadTime: 3, kadaluarsa: false },
  { kode: 'BR-12', nama: 'Spidol Whiteboard', kategori: 'ATK', hargaBeli: 8000, stokMin: 35, leadTime: 2, kadaluarsa: true },
  { kode: 'BR-13', nama: 'Webcam HD', kategori: 'Elektronik', hargaBeli: 185000, stokMin: 10, leadTime: 9, kadaluarsa: false },
  { kode: 'BR-14', nama: 'UPS 650VA', kategori: 'Elektronik', hargaBeli: 420000, stokMin: 8, leadTime: 12, kadaluarsa: false },
  { kode: 'BR-15', nama: 'Lemari Arsip Besi', kategori: 'Perlengkapan', hargaBeli: 890000, stokMin: 4, leadTime: 18, kadaluarsa: false },
  { kode: 'BR-16', nama: 'Sabun Cuci Tangan 5L', kategori: 'Kebersihan', hargaBeli: 95000, stokMin: 15, leadTime: 4, kadaluarsa: true },
  { kode: 'BR-17', nama: 'Tisu Gulung (isi 12)', kategori: 'Kebersihan', hargaBeli: 78000, stokMin: 25, leadTime: 3, kadaluarsa: false },
  { kode: 'BR-18', nama: 'Cairan Pel Lantai 1L', kategori: 'Kebersihan', hargaBeli: 32000, stokMin: 20, leadTime: 3, kadaluarsa: true },
];

const KATEGORI_SUPPLIER = [
  { kategori: 'ATK', supplier: 'CV Sumber Kertas' },
  { kategori: 'Elektronik', supplier: 'PT Mitra Elektronik' },
  { kategori: 'Perlengkapan', supplier: 'UD Perkakas Jaya' },
  { kategori: 'Kebersihan', supplier: 'CV Bersih Sentosa' },
];

const LOKASI_RAK = ['Rak A1', 'Rak A2', 'Rak B1', 'Rak B2', 'Rak C1', 'Rak C2', 'Rak D1', 'Gudang Utama'];

/**
 * Dataset Persediaan/Inventori RELASIONAL — tabel transaksi (kartu stok)
 * hanya menyimpan Kode Barang + mutasi (Masuk/Keluar), TIDAK menyimpan
 * Nama Barang/Kategori/Harga Beli sendiri. Kolom-kolom itu wajib dicari
 * lewat tabel referensi "Master Barang" terpisah (kode → nama, kategori,
 * stok awal, harga beli), plus tabel bantu Kategori → Supplier.
 */
export function generateInventoryRelationalDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const today = new Date();

  const headers = ['No', 'Kode Barang', 'Masuk', 'Keluar', 'Lokasi/Rak', 'Tanggal Kadaluarsa'];
  const columnTypes = ['number', 'text', 'number', 'number', 'text', 'date'];

  const rows = [];
  for (let i = 1; i <= count; i++) {
    const barang = pick(rng, BARANG_MASTER);
    let kadaluarsa = null;
    if (barang.kadaluarsa) {
      const tgl = new Date(today);
      tgl.setDate(tgl.getDate() + randInt(rng, 30, 540));
      kadaluarsa = dateToSerial(tgl);
    }
    rows.push([i, barang.kode, randInt(rng, 0, 80), randInt(rng, 0, 50), pick(rng, LOKASI_RAK), kadaluarsa]);
  }

  const masterHeaders = ['Kode Barang', 'Nama Barang', 'Kategori', 'Stok Awal', 'Harga Beli', 'Stok Minimum', 'Lead Time (hari)'];
  const masterColumnTypes = ['text', 'text', 'text', 'number', 'number', 'number', 'number'];
  const masterRows = BARANG_MASTER.map((b) => [b.kode, b.nama, b.kategori, randInt(rng, 20, 150), b.hargaBeli, b.stokMin, b.leadTime]);

  const supplierHeaders = ['Kategori', 'Supplier'];
  const supplierColumnTypes = ['text', 'text'];
  const supplierRows = KATEGORI_SUPPLIER.map((s) => [s.kategori, s.supplier]);

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'inventory-relational',
      datasetLabel: 'Persediaan (Relasional — Master Barang)',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
      masterTable: {
        name: 'MASTER_BARANG',
        label: 'Master Barang',
        headers: masterHeaders,
        columnTypes: masterColumnTypes,
        rows: masterRows,
      },
      supplierTable: {
        name: 'KATEGORI_SUPPLIER',
        label: 'Kategori → Supplier',
        headers: supplierHeaders,
        columnTypes: supplierColumnTypes,
        rows: supplierRows,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// MATERI BARU #4: Accounting & Corporate Tax (Akuntansi & Pajak Korporat)
// ---------------------------------------------------------------------------

const AKUN_MASTER = [
  { kode: '1-1100', nama: 'Kas dan Setara Kas', jenis: 'Aset' },
  { kode: '1-1200', nama: 'Piutang Usaha', jenis: 'Aset' },
  { kode: '1-1300', nama: 'Persediaan Barang Dagang', jenis: 'Aset' },
  { kode: '1-1400', nama: 'Uang Muka Pembelian', jenis: 'Aset' },
  { kode: '1-2100', nama: 'Peralatan Kantor', jenis: 'Aset' },
  { kode: '2-1100', nama: 'Utang Usaha', jenis: 'Liabilitas' },
  { kode: '2-1200', nama: 'Utang PPh Badan', jenis: 'Liabilitas' },
  { kode: '2-1300', nama: 'Utang PPN Keluaran', jenis: 'Liabilitas' },
  { kode: '3-1100', nama: 'Modal Saham', jenis: 'Modal' },
  { kode: '3-1200', nama: 'Laba Ditahan', jenis: 'Modal' },
  { kode: '4-1100', nama: 'Pendapatan Penjualan', jenis: 'Pendapatan' },
  { kode: '4-1200', nama: 'Pendapatan Jasa', jenis: 'Pendapatan' },
  { kode: '4-1300', nama: 'Pendapatan Sewa', jenis: 'Pendapatan' },
  { kode: '5-1100', nama: 'Beban Gaji', jenis: 'Beban', deductible: true },
  { kode: '5-1200', nama: 'Beban Sewa Kantor', jenis: 'Beban', deductible: true },
  { kode: '5-1300', nama: 'Beban Penyusutan', jenis: 'Beban', deductible: true },
  { kode: '5-1400', nama: 'Beban Listrik & Utilitas', jenis: 'Beban', deductible: true },
  { kode: '5-1500', nama: 'Beban Internet & Komunikasi', jenis: 'Beban', deductible: true },
  { kode: '5-1600', nama: 'Beban Alat Tulis Kantor', jenis: 'Beban', deductible: true },
  { kode: '5-1700', nama: 'Beban Perjalanan Dinas', jenis: 'Beban', deductible: true },
  { kode: '5-2100', nama: 'Beban Entertainment (Tanpa Daftar Nominatif)', jenis: 'Beban', deductible: false },
  { kode: '5-2200', nama: 'Beban Sumbangan (Non-Bencana)', jenis: 'Beban', deductible: false },
  { kode: '5-2300', nama: 'Sanksi/Denda Pajak', jenis: 'Beban', deductible: false },
  { kode: '5-2400', nama: 'Beban Pribadi Pemegang Saham', jenis: 'Beban', deductible: false },
];

const AKUN_JENIS_TARIF_UMKM = 0.005; // PPh Final UMKM 0,5% (PP 23/2018) — dipakai sbg pembanding di Expert
const TARIF_PPH_BADAN = 0.22; // tarif umum PPh Badan (UU HPP)
const BATAS_OMZET_31E = 4_800_000_000; // batas omzet setahun utk fasilitas Pasal 31E (diskon 50%)

/**
 * Dataset Akuntansi & Pajak Korporat — jurnal umum lintas akun (Aset/
 * Liabilitas/Modal/Pendapatan/Beban), TIDAK menyimpan Nama Akun/Jenis Akun
 * sendiri di baris jurnal — wajib lookup ke Chart of Accounts (Master Akun)
 * terpisah. Akun jenis Beban punya flag `deductible` di master (dipakai
 * untuk soal koreksi fiskal / rekonsiliasi laba komersial -> laba fiskal
 * -> PPh Badan terutang, termasuk fasilitas diskon tarif Pasal 31E).
 */
export function generateAccountingRelationalDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const tahun = options.tahun || 2026;

  const headers = ['No', 'No Bukti', 'Tanggal', 'Kode Akun', 'Deskripsi', 'Debit', 'Kredit'];
  const columnTypes = ['number', 'text', 'date', 'text', 'text', 'number', 'number'];

  const idPad = String(count).length + 3;
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const akun = pick(rng, AKUN_MASTER);
    const bulan = randInt(rng, 1, 12);
    const hariMax = new Date(tahun, bulan, 0).getDate();
    const tanggal = new Date(tahun, bulan - 1, randInt(rng, 1, hariMax));
    const nominal = roundToNearest(randInt(rng, 500000, 45000000), 50000);
    // Aset/Beban normal di Debit; Liabilitas/Modal/Pendapatan normal di Kredit
    const normalDebit = akun.jenis === 'Aset' || akun.jenis === 'Beban';
    rows.push([
      i,
      `JV-${tahun}-${String(i).padStart(idPad, '0')}`,
      dateToSerial(tanggal),
      akun.kode,
      `${akun.nama} - transaksi ${i}`,
      normalDebit ? nominal : 0,
      normalDebit ? 0 : nominal,
    ]);
  }

  const masterHeaders = ['Kode Akun', 'Nama Akun', 'Jenis Akun', 'Dapat Dikurangkan (Fiskal)'];
  const masterColumnTypes = ['text', 'text', 'text', 'text'];
  const masterRows = AKUN_MASTER.map((a) => [
    a.kode, a.nama, a.jenis,
    a.jenis === 'Beban' ? (a.deductible ? 'Ya' : 'Tidak') : '-',
  ]);

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'accounting-relational',
      datasetLabel: 'Akuntansi & Pajak Korporat (Relasional — Chart of Accounts)',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
      tarifPphBadan: TARIF_PPH_BADAN,
      tarifUmkm: AKUN_JENIS_TARIF_UMKM,
      batasOmzet31E: BATAS_OMZET_31E,
      masterTable: {
        name: 'CHART_OF_ACCOUNTS',
        label: 'Chart of Accounts (Master Akun)',
        headers: masterHeaders,
        columnTypes: masterColumnTypes,
        rows: masterRows,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// MATERI BARU #5: Tax Administration (Administrasi Perpajakan)
// ---------------------------------------------------------------------------

const JENIS_TRANSAKSI_PPH = [
  { jenis: 'Jasa Konsultan', tarifPph23: 0.02 },
  { jenis: 'Jasa Teknik', tarifPph23: 0.02 },
  { jenis: 'Jasa Manajemen', tarifPph23: 0.02 },
  { jenis: 'Sewa Peralatan (Selain Tanah/Bangunan)', tarifPph23: 0.02 },
  { jenis: 'Jasa Catering', tarifPph23: 0.02 },
  { jenis: 'Jasa Maintenance', tarifPph23: 0.02 },
  { jenis: 'Jasa Perancang (Desain)', tarifPph23: 0.02 },
  { jenis: 'Jasa Pengolahan Data', tarifPph23: 0.02 },
  { jenis: 'Jasa Cleaning Service', tarifPph23: 0.02 },
  { jenis: 'Jasa Keamanan (Security)', tarifPph23: 0.02 },
  { jenis: 'Royalti', tarifPph23: 0.15 },
  { jenis: 'Bunga Pinjaman', tarifPph23: 0.15 },
  { jenis: 'Hadiah dan Penghargaan', tarifPph23: 0.15 },
];

const LAWAN_TRANSAKSI_PREFIX = ['PT', 'CV'];
const STATUS_LAPOR = ['Sudah Lapor', 'Belum Lapor'];

/**
 * Dataset Administrasi Perpajakan — bukti potong PPh Pasal 23/26 & PPN
 * lintas jenis transaksi, TIDAK menyimpan tarif sendiri — wajib lookup
 * tarif PPh per Jenis Transaksi ke tabel referensi terpisah. NPWP lawan
 * transaksi disertakan (dipakai untuk soal validasi format NPWP di level
 * Beginner: panjang, format, dsb.).
 */
export function generateTaxAdminRelationalDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const tahun = options.tahun || 2026;

  const headers = ['No', 'No Bukti Potong', 'Tanggal', 'NPWP Lawan Transaksi', 'Nama Lawan Transaksi', 'Jenis Transaksi', 'DPP', 'Status Lapor SPT Masa'];
  const columnTypes = ['number', 'text', 'date', 'text', 'text', 'text', 'number', 'text'];

  const idPad = String(count).length + 3;
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const jt = pick(rng, JENIS_TRANSAKSI_PPH);
    const bulan = randInt(rng, 1, 12);
    const hariMax = new Date(tahun, bulan, 0).getDate();
    const tanggal = new Date(tahun, bulan - 1, randInt(rng, 1, hariMax));
    const npwp = `${randInt(rng, 10, 99)}.${randInt(rng, 100, 999)}.${randInt(rng, 100, 999)}.${randInt(rng, 1, 9)}-${randInt(rng, 100, 999)}.000`;
    rows.push([
      i,
      `PPH23-${tahun}-${String(i).padStart(idPad, '0')}`,
      dateToSerial(tanggal),
      npwp,
      `${pick(rng, LAWAN_TRANSAKSI_PREFIX)} ${pick(rng, PERUSAHAAN_NAMA)}`,
      jt.jenis,
      roundToNearest(randInt(rng, 2000000, 80000000), 50000),
      pick(rng, STATUS_LAPOR),
    ]);
  }

  const masterHeaders = ['Jenis Transaksi', 'Tarif PPh Pasal 23/26'];
  const masterColumnTypes = ['text', 'number'];
  const masterRows = JENIS_TRANSAKSI_PPH.map((j) => [j.jenis, j.tarifPph23]);

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'tax-admin-relational',
      datasetLabel: 'Administrasi Perpajakan (Relasional — Tarif PPh per Jenis Transaksi)',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
      tarifPpn: 0.11,
      masterTable: {
        name: 'TARIF_PPH23',
        label: 'Tarif PPh Pasal 23/26',
        headers: masterHeaders,
        columnTypes: masterColumnTypes,
        rows: masterRows,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// MATERI BARU #6: Financial Modeling & Proyeksi Bisnis
// ---------------------------------------------------------------------------

const SKENARIO_MASTER = [
  { kode: 'OPT', nama: 'Optimis', growthRate: 0.15 },
  { kode: 'MOD', nama: 'Moderat', growthRate: 0.08 },
  { kode: 'PES', nama: 'Pesimis', growthRate: 0.02 },
];

const DIVISI_LIST = ['Divisi Retail', 'Divisi Grosir', 'Divisi Ekspor', 'Divisi Online', 'Divisi Korporat', 'Divisi Waralaba'];

/**
 * Dataset Financial Modeling & Proyeksi Bisnis — data aktual bulanan per
 * divisi (pendapatan, biaya tetap, biaya variabel per unit, unit terjual),
 * TIDAK menyimpan asumsi pertumbuhan sendiri — wajib lookup Kode Skenario
 * ke tabel referensi Skenario Pertumbuhan terpisah untuk memproyeksikan
 * bulan berikutnya.
 */
export function generateFinancialModelRelationalDataset(options = {}) {
  const count = Math.max(1, Math.min(5000, Math.floor(options.count || 25)));
  const rawSeed = options.seed ?? Date.now();
  const seedNumber = typeof rawSeed === 'number' ? rawSeed >>> 0 : hashSeed(rawSeed);
  const rng = mulberry32(seedNumber);
  const tahun = options.tahun || 2026;

  const headers = ['No', 'Bulan', 'Divisi', 'Kode Skenario', 'Pendapatan Aktual', 'Biaya Tetap', 'Biaya Variabel per Unit', 'Unit Terjual'];
  const columnTypes = ['number', 'date', 'text', 'text', 'number', 'number', 'number', 'number'];

  const rows = [];
  for (let i = 1; i <= count; i++) {
    const bulanKe = randInt(rng, 1, 12);
    const tanggal = new Date(tahun, bulanKe - 1, 1);
    const pendapatan = roundToNearest(randInt(rng, 40000000, 350000000), 500000);
    rows.push([
      i,
      dateToSerial(tanggal),
      pick(rng, DIVISI_LIST),
      pick(rng, SKENARIO_MASTER).kode,
      pendapatan,
      roundToNearest(randInt(rng, 8000000, 60000000), 500000),
      roundToNearest(randInt(rng, 15000, 85000), 1000),
      randInt(rng, 200, 4000),
    ]);
  }

  const masterHeaders = ['Kode Skenario', 'Nama Skenario', 'Asumsi Pertumbuhan (%/bulan)'];
  const masterColumnTypes = ['text', 'text', 'number'];
  const masterRows = SKENARIO_MASTER.map((s) => [s.kode, s.nama, s.growthRate]);

  return {
    headers,
    columnTypes,
    rows,
    meta: {
      datasetType: 'financial-model-relational',
      datasetLabel: 'Financial Modeling & Proyeksi Bisnis (Relasional — Skenario Pertumbuhan)',
      count,
      seed: rawSeed,
      seedNumber,
      generatedAt: new Date().toISOString(),
      masterTable: {
        name: 'SKENARIO_PERTUMBUHAN',
        label: 'Skenario Pertumbuhan',
        headers: masterHeaders,
        columnTypes: masterColumnTypes,
        rows: masterRows,
      },
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
  hr: {
    label: 'HR (Karyawan)',
    description: 'Data payroll karyawan lintas divisi, lengkap dengan tunjangan dan potongan.',
    generate: generateHrDataset,
    available: true,
  },
  inventory: {
    label: 'Persediaan / Pergudangan',
    description: 'Kartu stok barang: barang masuk, keluar, dan nilai persediaan.',
    generate: generateInventoryDataset,
    available: true,
  },
};

// Generator berikut TIDAK ditampilkan di navigasi materi (dibatasi jadi 3:
// Penjualan/Persediaan-Pergudangan/HR) tapi tetap diekspor & dipakai test
// suite (lihat tests/test-relational-dataset.mjs) — dipertahankan untuk
// kemungkinan dipakai lagi nanti, bukan dihapus.
export const EXPERIMENTAL_DATASET_GENERATORS = {
  accounting: {
    label: 'Akuntansi',
    description: 'Jurnal umum lintas akun (aset, liabilitas, modal, pendapatan, beban).',
    generate: generateAccountingDataset,
    available: false,
  },
  'sales-relational': {
    label: 'Penjualan (Multi-Tabel)',
    description: 'Transaksi penjualan TANPA detail produk — wajib lookup lintas tabel ke Master Produk terpisah untuk Nama/Kategori/Harga.',
    generate: generateSalesRelationalDataset,
    available: false,
  },
  'hr-relational': {
    label: 'HR / Payroll (Multi-Tabel)',
    description: 'Data karyawan (Nama, Asal, Tanggal Lahir, Tanggal Masuk, Kode Jabatan) TANPA jabatan/gaji/bonus sendiri — wajib lookup ke Referensi Jabatan, plus DATEDIF umur & masa kerja. Skenario Expert/Payroll spesifikasi produk.',
    generate: generateHrRelationalDataset,
    available: false,
  },
  'inventory-relational': {
    label: 'Persediaan (Multi-Tabel)',
    description: 'Kartu stok (Kode Barang, Masuk, Keluar) TANPA nama/kategori/harga sendiri — wajib lookup ke Master Barang + tabel Kategori→Supplier.',
    generate: generateInventoryRelationalDataset,
    available: false,
  },
};

/**
 * Peta khusus dipakai oleh js/exercise-generator.js (engine Exercise
 * Generator baru — lihat dokumen spesifikasi "2 engine terpisah"): satu
 * generator relasional per Materi (Sales/Inventori/Karyawan), dengan kunci
 * yang SAMA persis dengan pilihan Materi di UI Exercise Generator.
 */
export const EXERCISE_MATERI_GENERATORS = {
  sales: { label: 'Sales', generate: generateSalesRelationalDataset },
  inventori: { label: 'Inventori', generate: generateInventoryRelationalDataset },
  karyawan: { label: 'Karyawan', generate: generateHrRelationalDataset },
  akuntansi: { label: 'Akuntansi & Pajak Korporat', generate: generateAccountingRelationalDataset },
  'admin-pajak': { label: 'Administrasi Perpajakan', generate: generateTaxAdminRelationalDataset },
  'financial-modeling': { label: 'Financial Modeling & Proyeksi Bisnis', generate: generateFinancialModelRelationalDataset },
};
