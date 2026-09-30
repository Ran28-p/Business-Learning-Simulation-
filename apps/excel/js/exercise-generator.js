/**
 * exercise-generator.js
 * ---------------------------------------------------------------------------
 * ENGINE #2 dari refactor "2 engine terpisah" (Dataset Generator vs Exercise
 * Generator — lihat js/dataset-generator.js untuk engine #1).
 *
 * Tanggung jawab file ini SEMATA-MATA: mengubah (Level, Materi) menjadi satu
 * "ExerciseSpec" — objek data murni (tanpa ExcelJS, tanpa DOM) yang berisi
 * SELURUH isi 4 sheet yang wajib ada pada workbook latihan:
 *
 *   Lembar latihan | dataset | kunci jawaban | Penjelasan Rumus
 *
 * Layout (posisi judul, baris nomor fungsi, baris header, baris "Contoh",
 * baris "Soal:", dst.) MENGIKUTI pola contoh_Profesional.xlsx dan
 * contoh_expert.xlsx yang diberikan sebagai acuan wajib — lihat konstanta
 * ROW_* dan js/export/exercise-workbook-writer.js (yang menerjemahkan objek
 * ini menjadi file .xlsx sungguhan).
 *
 * Alur data WAJIB satu arah (lihat spesifikasi Bagian 12 — RANDOMIZATION):
 *
 *   dataset (sheet 'dataset', sumber tunggal)
 *        -> kolom "given" di 'Lembar latihan' & 'kunci jawaban' = LINK
 *           formula ke sheet 'dataset' (bukan angka/teks yang di-hardcode
 *           ulang)
 *        -> kolom jawaban di 'kunci jawaban' = formula Excel asli yang
 *           merujuk ke kolom given PADA BARIS & SHEET YANG SAMA
 *        -> 'Penjelasan Rumus' = deskripsi dari formula yang BENAR-BENAR
 *           dipakai pada baris data pertama
 *
 * sehingga tidak mungkin terjadi "dataset A, soal pakai dataset B, kunci
 * pakai dataset C".
 * ---------------------------------------------------------------------------
 */

import { EXERCISE_MATERI_GENERATORS, mulberry32, hashSeed, pick } from './dataset-generator.js';

// --- posisi baris tetap, meniru pola file contoh -----------------------
export const ROW_TITLE = 2;
export const ROW_NUMBERING = 6;
export const ROW_HEADER = 7;
export const ROW_CONTOH = 8;
export const ROW_DATA_START = 10;

export const DATASET_ROW_HEADER = 6;
export const DATASET_ROW_DATA_START = 7;

const LEVEL_LABELS = { beginner: 'BEGINNER', professional: 'PROFESIONAL', expert: 'EXPERT' };
const MATERI_LABELS = {
  sales: 'SALES', inventori: 'INVENTORI', karyawan: 'KARYAWAN',
  akuntansi: 'AKUNTANSI & PAJAK KORPORAT', 'admin-pajak': 'ADMINISTRASI PERPAJAKAN',
  'financial-modeling': 'FINANCIAL MODELING & PROYEKSI BISNIS',
};

export const LEVELS = ['beginner', 'professional', 'expert'];
export const MATERI_LIST = ['sales', 'inventori', 'karyawan', 'akuntansi', 'admin-pajak', 'financial-modeling'];

/**
 * Pilih `count` item ACAK (tanpa duplikat, urutan diacak) dari `pool` —
 * dipakai supaya "kolom ekstra" mana yang tampil di Lembar latihan BEDA
 * setiap kali di-generate (lihat permintaan produk: "supaya setiap generate
 * kita dapet isi yang berbeda"), tapi tetap REPRODUCIBLE untuk seed yang
 * sama (Fisher-Yates pakai rng yang di-seed, bukan Math.random()).
 */
function pickPoolItems(rng, pool, count) {
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Sambung kolom baru (given ATAU answer) setelah kolom terakhir yang sudah ada. */
function appendColumns(existing, newDefs) {
  const afterCol = existing.length ? existing[existing.length - 1].colIndex : 1;
  return [...existing, ...assignColumns(newDefs, afterCol)];
}

/**
 * Bangun formula LET yang BENAR secara OOXML. Percobaan pertama LET di
 * versi sebelumnya ditolak Excel asli ("we found a problem...") karena
 * hanya nama FUNGSI-nya (LET) yang diberi awalan _xlfn., padahal setiap
 * nama VARIABEL di dalam LET (baik saat dideklarasikan maupun dipakai)
 * JUGA WAJIB diberi awalan _xlpm. — detail OOXML yang gampang kelewat
 * karena tidak muncul sama sekali kalau cuma dites di LibreOffice (yang
 * bahkan tidak mengenal LET sama sekali, jadi tidak pernah bisa
 * mengonfirmasi detail ini). Lihat _xlfn.LET(_xlpm.SALES,...) di
 * https://groups.google.com/g/openpyxl-users/c/O746AjGV9EY untuk kasus
 * serupa yang sudah dikonfirmasi.
 *
 * @param {Array<[string, string]>} pairs - pasangan [namaVariabel, templateEkspresi].
 *   templateEkspresi boleh mereferensikan variabel yang dideklarasikan
 *   SEBELUMNYA lewat placeholder {{namaVariabel}}.
 * @param {string} finalExprTemplate - ekspresi akhir, juga boleh pakai {{namaVariabel}}.
 * @returns {string} teks formula LENGKAP dengan "=" di depan, TANPA awalan
 *   _xlfn. (itu ditambahkan otomatis oleh applyCompatPrefixes di writer).
 */
function buildLetFormula(pairs, finalExprTemplate) {
  const declared = [];
  const applyPrefixes = (template) => {
    let out = template;
    declared.forEach((n) => { out = out.split(`{{${n}}}`).join(`_xlpm.${n}`); });
    return out;
  };
  const args = [];
  pairs.forEach(([name, exprTemplate]) => {
    args.push(`_xlpm.${name}`, applyPrefixes(exprTemplate));
    declared.push(name);
  });
  args.push(applyPrefixes(finalExprTemplate));
  return `=LET(${args.join(',')})`;
}

/** Ubah index kolom 1-based (1=A, 2=B, ...) menjadi huruf kolom Excel. */
export function colLetter(index) {
  let n = index;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const CUR = '_-[$Rp-3809]* #,##0_-;\\-[$Rp-3809]* #,##0_-;_-[$Rp-3809]* "-"??_-;_-@_-';
const ACC = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
const NUM = '#,##0';
const DATE = 'yyyy-mm-dd';

/**
 * Alokasikan huruf kolom berurutan untuk daftar definisi kolom.
 * @param {Array} defs
 * @param {number} [afterColIndex] - jika diisi, mulai SETELAH kolom index ini
 *   (dipakai untuk menyambung kolom "answer" persis setelah kolom "given"
 *   terakhir, supaya tidak pernah tabrakan huruf kolom). Default: mulai dari B.
 */
function assignColumns(defs, afterColIndex) {
  let col = afterColIndex ? afterColIndex + 1 : 2; // B secara default
  return defs.map((d) => {
    const out = { ...d, colIndex: col, letter: colLetter(col) };
    col += 1;
    return out;
  });
}

// ---------------------------------------------------------------------------
// Konfigurasi per Materi. Setiap materi menghasilkan (via buildXxxDataset)
// sheet 'dataset' + kolom "given"/"answer" untuk 'Lembar latihan' & 'kunci
// jawaban', dipisah per Level (beginner/professional/expert) sesuai daftar
// fungsi wajib di spesifikasi (Bagian 7/8/9).
// ---------------------------------------------------------------------------

// ============================= SALES ========================================

function buildSalesDataset(rowCount, level, seed) {
  const gen = EXERCISE_MATERI_GENERATORS.sales.generate({ count: rowCount, seed });
  const masterProduk = gen.meta.masterTable;

  if (level === 'beginner') {
    // Beginner: TIDAK boleh pakai lookup — dataset sudah "diratakan" (nama
    // produk, kategori & harga satuan disalin langsung ke baris transaksi)
    // supaya soal Beginner hanya perlu fungsi teks/aritmatika dasar.
    // Dicari lewat NAMA header (bukan posisi index) supaya tahan terhadap
    // penambahan kolom baru di masa depan pada generateSalesRelationalDataset().
    //
    // SELURUH kolom mentah lain (Metode Pembayaran, Channel Penjualan,
    // Wilayah, dst.) ikut disalin apa adanya di bagian akhir — WAJIB,
    // supaya kolom pool Beginner (lihat salesColumns) yang butuh salah
    // satu field itu sebagai "given" selalu ketemu lewat
    // dataset.headers.indexOf(). Kalau field baru ditambah ke
    // generateSalesRelationalDataset(), otomatis ikut ke sini juga.
    const idx = new Map(masterProduk.rows.map((r) => [r[0], r]));
    const iNo = gen.headers.indexOf('No');
    const iKode = gen.headers.indexOf('Kode Produk');
    const iQty = gen.headers.indexOf('Kuantitas');
    const curatedHeaders = ['No', 'Kode Produk', 'Nama Produk (mentah)', 'Kategori', 'Harga Satuan', 'Kuantitas'];
    const curatedTypes = ['number', 'text', 'text', 'text', 'number', 'number'];
    const passthroughHeaders = gen.headers.filter((h) => !curatedHeaders.includes(h));
    const passthroughTypes = passthroughHeaders.map((h) => gen.columnTypes[gen.headers.indexOf(h)]);
    const headers = [...curatedHeaders, ...passthroughHeaders];
    const columnTypes = [...curatedTypes, ...passthroughTypes];
    const rows = gen.rows.map((r) => {
      const kodeProduk = r[iKode];
      const master = idx.get(kodeProduk) || ['', 'Produk', 'Lainnya', 0];
      const kasarNama = messyCase(master[1]);
      const passthroughValues = passthroughHeaders.map((h) => r[gen.headers.indexOf(h)]);
      return [r[iNo], kodeProduk, kasarNama, master[2], master[3], r[iQty], ...passthroughValues];
    });
    return { headers, columnTypes, rows, masterTables: [] };
  }

  // Professional & Expert: dataset RELASIONAL — Nama Produk/Kategori/Harga
  // sengaja TIDAK ada di baris transaksi, wajib VLOOKUP/XLOOKUP ke Master
  // Produk di sheet 'dataset'.
  const headers = ['No', 'ID Transaksi', 'No Faktur', 'Tanggal', 'Kode Produk', 'Nama Sales', 'Kuantitas', 'Metode Pembayaran', 'Channel Penjualan', 'Wilayah', 'Tipe Konsumen', 'Penjualan Periode Lalu'];
  const columnTypes = ['number', 'text', 'text', 'date', 'text', 'text', 'number', 'text', 'text', 'text', 'text', 'number'];
  const rows = gen.rows;
  return {
    headers,
    columnTypes,
    rows,
    masterTables: [
      {
        title: 'Master Produk',
        headers: masterProduk.headers,
        columnTypes: masterProduk.columnTypes,
        rows: masterProduk.rows,
      },
      {
        title: 'Target Penjualan per Wilayah',
        headers: gen.meta.wilayahTargetTable.headers,
        columnTypes: gen.meta.wilayahTargetTable.columnTypes,
        rows: gen.meta.wilayahTargetTable.rows,
      },
    ],
  };
}

function messyCase(text) {
  // Sengaja dibuat "kotor" (huruf besar/kecil acak + spasi berlebih) supaya
  // TRIM/PROPER punya alasan nyata untuk dipakai (Level Beginner).
  const spaced = `  ${text}  `.replace(/\s+/g, '   ');
  return spaced.split('').map((ch, i) => (i % 3 === 0 ? ch.toUpperCase() : ch.toLowerCase())).join('');
}

function salesColumns(level, rng) {
  if (level === 'beginner') {
    const coreGivenDefs = [
      { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
      { key: 'kode', header: 'Kode Produk', numFmt: 'General', type: 'text', datasetHeader: 'Kode Produk' },
      { key: 'namaMentah', header: 'Nama Produk (mentah)', numFmt: 'General', type: 'text', datasetHeader: 'Nama Produk (mentah)' },
      { key: 'harga', header: 'Harga Satuan', numFmt: ACC, type: 'number', datasetHeader: 'Harga Satuan' },
      { key: 'qty', header: 'Kuantitas', numFmt: NUM, type: 'number', datasetHeader: 'Kuantitas' },
    ];
    const coreAnswerDefs = [
      {
        key: 'kategoriAwalan', header: 'Kode Awalan (3 huruf)', numFmt: 'General', type: 'text',
        fungsi: 'LEFT', penjelasan: 'Mengambil 3 karakter pertama dari Kode Produk sebagai kode kategori singkat.',
        formula: (c) => `=LEFT(${c.given('kode')},3)`,
      },
      {
        key: 'namaRapi', header: 'Nama Produk (Rapi)', numFmt: 'General', type: 'text',
        fungsi: 'PROPER + TRIM', penjelasan: 'Merapikan Nama Produk (mentah) — menghapus spasi berlebih dengan TRIM lalu mengubah menjadi Huruf-Awal-Besar dengan PROPER.',
        formula: (c) => `=PROPER(TRIM(${c.given('namaMentah')}))`,
      },
      {
        key: 'subtotal', header: 'Subtotal', numFmt: ACC, type: 'number',
        fungsi: 'ROUND', penjelasan: 'Harga Satuan dikalikan Kuantitas, dibulatkan ke rupiah penuh dengan ROUND.',
        formula: (c) => `=ROUND(${c.given('harga')}*${c.given('qty')},0)`,
      },
      {
        key: 'status', header: 'Status Order', numFmt: 'General', type: 'text',
        fungsi: 'IF', penjelasan: 'Jika Kuantitas >= 5 maka "Grosir", selain itu "Eceran".',
        formula: (c) => `=IF(${c.given('qty')}>=5,"Grosir","Eceran")`,
      },
    ];

    // --- Kolom ekstra (acak, beda tiap generate) — lihat pickPoolItems ---
    const pool = [
      {
        id: 'ppn', given: [],
        answer: [{
          key: 'ppn', header: 'PPN (11%)', numFmt: ACC, type: 'number',
          fungsi: 'ROUND', penjelasan: 'PPN 11% dari Subtotal, dibulatkan ke rupiah penuh.',
          formula: (c) => `=ROUND(${c.answer('subtotal')}*11%,0)`,
        }],
      },
      {
        id: 'metode', given: [{ key: 'metode', header: 'Metode Pembayaran', numFmt: 'General', type: 'text', datasetHeader: 'Metode Pembayaran' }],
        answer: [{
          key: 'metodeBesar', header: 'Metode (Huruf Besar)', numFmt: 'General', type: 'text',
          fungsi: 'UPPER', penjelasan: 'Metode Pembayaran diubah menjadi huruf besar semua.',
          formula: (c) => `=UPPER(${c.given('metode')})`,
        }],
      },
      {
        id: 'channel', given: [{ key: 'channel', header: 'Channel Penjualan', numFmt: 'General', type: 'text', datasetHeader: 'Channel Penjualan' }],
        answer: [{
          key: 'jenisChannel', header: 'Jenis Channel', numFmt: 'General', type: 'text',
          fungsi: 'IF', penjelasan: 'Jika Channel Penjualan = "Online (Website)" maka "Digital", selain itu "Konvensional".',
          formula: (c) => `=IF(${c.given('channel')}="Online (Website)","Digital","Konvensional")`,
        }],
      },
      {
        id: 'wilayah', given: [{ key: 'wilayah', header: 'Wilayah', numFmt: 'General', type: 'text', datasetHeader: 'Wilayah' }],
        answer: [{
          key: 'panjangWilayah', header: 'Panjang Nama Wilayah', numFmt: NUM, type: 'number',
          fungsi: 'LEN', penjelasan: 'Jumlah karakter pada nama Wilayah.',
          formula: (c) => `=LEN(${c.given('wilayah')})`,
        }],
      },
      {
        id: 'noFaktur',
        given: [{ key: 'noFaktur', header: 'No Faktur', numFmt: 'General', type: 'text', datasetHeader: 'No Faktur' }],
        answer: [{
          key: 'tahunFaktur', header: 'Tahun (dari No Faktur)', numFmt: 'General', type: 'text',
          fungsi: 'MID', penjelasan: 'Mengambil 4 karakter mulai posisi ke-5 dari No Faktur (format INV/TAHUN/nomor) sebagai tahun.',
          formula: (c) => `=MID(${c.given('noFaktur')},5,4)`,
        }],
      },
      {
        id: 'kuantitasGanjilGenap', given: [],
        answer: [{
          key: 'labelKuantitas', header: 'Ganjil/Genap', numFmt: 'General', type: 'text',
          fungsi: 'MOD + IF', penjelasan: 'Sisa bagi Kuantitas dengan 2 (MOD): jika 0 maka "Genap", selain itu "Ganjil".',
          formula: (c) => `=IF(MOD(${c.given('qty')},2)=0,"Genap","Ganjil")`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 3);
    const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);

    const ringkasan = [
      { label: 'Total Semua Subtotal', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('subtotal')})`, numFmt: ACC },
      { label: 'Rata-rata Harga Satuan', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.givenRange('harga')})`, numFmt: ACC },
      { label: 'Harga Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.givenRange('harga')})`, numFmt: ACC },
      { label: 'Harga Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.givenRange('harga')})`, numFmt: ACC },
      { label: 'Jumlah Data', fungsi: 'COUNTA', formula: (c) => `=COUNTA(${c.givenRange('kode')})`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Kode Awalan (3 huruf) dengan mengambil 3 karakter pertama dari Kode Produk.',
      '2. Isi kolom Nama Produk (Rapi) dengan merapikan Nama Produk (mentah): buang spasi berlebih lalu ubah ke Huruf-Awal-Besar.',
      '3. Isi kolom Subtotal dari Harga Satuan dikali Kuantitas (dibulatkan).',
      '4. Isi kolom Status Order: "Grosir" jika Kuantitas >= 5, jika tidak "Eceran".',
      '5. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula).',
      '6. Isi Ringkasan di bawah tabel: total, rata-rata, tertinggi, terendah, dan jumlah data.',
    ];
    return { given, answer, ringkasan, soal };
  }

  // Professional & Expert berbagi kolom given inti yang sama (dataset relasional)
  const coreGivenDefs = [
    { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
    { key: 'kode', header: 'Kode Produk', numFmt: 'General', type: 'text', datasetHeader: 'Kode Produk' },
    { key: 'sales', header: 'Nama Sales', numFmt: 'General', type: 'text', datasetHeader: 'Nama Sales' },
    { key: 'qty', header: 'Kuantitas', numFmt: NUM, type: 'number', datasetHeader: 'Kuantitas' },
  ];

  if (level === 'professional') {
    const coreAnswerDefs = [
      {
        key: 'nama', header: 'Nama Produk', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Nama Produk pada Master Produk (sheet dataset) berdasarkan Kode Produk.',
        formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 4)},2,0)`,
      },
      {
        key: 'kategori', header: 'Kategori', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Kategori produk pada Master Produk berdasarkan Kode Produk.',
        formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 4)},3,0)`,
      },
      {
        key: 'harga', header: 'Harga Satuan', numFmt: ACC, type: 'number',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Harga Satuan pada Master Produk berdasarkan Kode Produk.',
        formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 4)},4,0)`,
      },
      {
        key: 'total', header: 'Total Harga', numFmt: CUR, type: 'number',
        fungsi: 'Perkalian', penjelasan: 'Harga Satuan dikalikan Kuantitas.',
        formula: (c) => `=${c.answer('harga')}*${c.given('qty')}`,
      },
      {
        key: 'diskon', header: 'Diskon', numFmt: CUR, type: 'number',
        fungsi: 'IF bertingkat', penjelasan: 'Diskon bertingkat berdasarkan Total Harga: >=5.000.000 = 15%, >=2.000.000 = 10%, >=1.000.000 = 5%, selain itu 0%.',
        formula: (c) => `=IF(${c.answer('total')}>=5000000,15%*${c.answer('total')},IF(${c.answer('total')}>=2000000,10%*${c.answer('total')},IF(${c.answer('total')}>=1000000,5%*${c.answer('total')},0)))`,
      },
      {
        key: 'bayar', header: 'Total Bayar', numFmt: CUR, type: 'number',
        fungsi: 'Pengurangan', penjelasan: 'Total Harga dikurangi Diskon.',
        formula: (c) => `=${c.answer('total')}-${c.answer('diskon')}`,
      },
    ];

    const pool = [
      {
        id: 'tanggal',
        given: [{ key: 'tanggal', header: 'Tanggal Transaksi', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal' }],
        answer: [
          {
            key: 'bulanTrx', header: 'Bulan Transaksi', numFmt: NUM, type: 'number',
            fungsi: 'MONTH', penjelasan: 'Mengambil angka bulan dari Tanggal Transaksi.',
            formula: (c) => `=MONTH(${c.given('tanggal')})`,
          },
          {
            key: 'tahunTrx', header: 'Tahun Transaksi', numFmt: NUM, type: 'number',
            fungsi: 'YEAR', penjelasan: 'Mengambil angka tahun dari Tanggal Transaksi.',
            formula: (c) => `=YEAR(${c.given('tanggal')})`,
          },
        ],
      },
      {
        id: 'pencapaian',
        given: [{ key: 'wilayah', header: 'Wilayah', numFmt: 'General', type: 'text', datasetHeader: 'Wilayah' }],
        answer: [
          {
            key: 'targetWilayah', header: 'Target Wilayah', numFmt: CUR, type: 'number',
            fungsi: 'VLOOKUP', penjelasan: 'Mencari Target Penjualan Bulanan pada tabel Target per Wilayah (sheet dataset) berdasarkan Wilayah.',
            formula: (c) => `=VLOOKUP(${c.given('wilayah')},${c.master(1, 1, 2)},2,0)`,
          },
          {
            key: 'pencapaian', header: 'Pencapaian (%)', numFmt: '0.0%', type: 'number',
            fungsi: 'Pembagian', penjelasan: 'Total Bayar dibagi Target Wilayah — persentase pencapaian target bulanan.',
            formula: (c) => `=${c.answer('bayar')}/${c.answer('targetWilayah')}`,
          },
        ],
      },
      {
        id: 'growth',
        given: [{ key: 'penjualanLalu', header: 'Penjualan Periode Lalu', numFmt: ACC, type: 'number', datasetHeader: 'Penjualan Periode Lalu' }],
        answer: [{
          key: 'growth', header: 'Growth (%)', numFmt: '0.0%', type: 'number',
          fungsi: 'Pembagian', penjelasan: 'Selisih Total Bayar dengan Penjualan Periode Lalu, dibagi Penjualan Periode Lalu — persentase pertumbuhan.',
          formula: (c) => `=(${c.answer('bayar')}-${c.given('penjualanLalu')})/${c.given('penjualanLalu')}`,
        }],
      },
      {
        id: 'tipeKonsumen',
        given: [{ key: 'tipeKonsumen', header: 'Tipe Konsumen', numFmt: 'General', type: 'text', datasetHeader: 'Tipe Konsumen' }],
        answer: [{
          key: 'diskonTambahan', header: 'Diskon Tambahan Grosir', numFmt: CUR, type: 'number',
          fungsi: 'IF', penjelasan: 'Diskon tambahan 5% dari Total Bayar khusus Tipe Konsumen "Grosir", selain itu 0.',
          formula: (c) => `=IF(${c.given('tipeKonsumen')}="Grosir",5%*${c.answer('bayar')},0)`,
        }],
      },
      {
        id: 'ppn', given: [],
        answer: [{
          key: 'ppn', header: 'PPN (11%)', numFmt: CUR, type: 'number',
          fungsi: 'ROUND', penjelasan: 'PPN 11% dari Total Bayar, dibulatkan ke rupiah penuh.',
          formula: (c) => `=ROUND(${c.answer('bayar')}*11%,0)`,
        }],
      },
      {
        id: 'noFaktur',
        given: [{ key: 'noFaktur', header: 'No Faktur', numFmt: 'General', type: 'text', datasetHeader: 'No Faktur' }],
        answer: [{
          key: 'kodeAwalFaktur', header: 'Kode Awal Faktur', numFmt: 'General', type: 'text',
          fungsi: 'LEFT', penjelasan: 'Mengambil 3 karakter pertama dari No Faktur.',
          formula: (c) => `=LEFT(${c.given('noFaktur')},3)`,
        }],
      },
      {
        id: 'bundle', given: [],
        answer: [{
          key: 'jumlahBundle', header: 'Jumlah Bundle (isi 5)', numFmt: NUM, type: 'number',
          fungsi: 'ROUNDUP', penjelasan: 'Kuantitas dibagi 5 lalu dibulatkan ke atas — berapa "bundle" (kemasan isi 5) dibutuhkan untuk memenuhi kuantitas ini.',
          formula: (c) => `=ROUNDUP(${c.given('qty')}/5,0)`,
        }],
      },
      {
        id: 'textjoin',
        given: [],
        answer: [{
          key: 'ringkasanTransaksi', header: 'Ringkasan Transaksi', numFmt: 'General', type: 'text',
          fungsi: 'TEXTJOIN', penjelasan: 'Menggabungkan Nama Sales, Kode Produk, dan Total Bayar (diformat rapi lewat TEXT) jadi satu teks, dipisah " | ", mengabaikan sel kosong.',
          formula: (c) => `=TEXTJOIN(" | ",TRUE,${c.given('sales')},${c.given('kode')},TEXT(${c.answer('bayar')},"#,##0"))`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 4);
    const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);

    const ringkasan = [
      { label: 'Total Seluruh Nilai', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('bayar')})`, numFmt: CUR },
      { label: 'Nilai Terbesar', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('bayar')})`, numFmt: CUR },
      { label: 'Nilai Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.answerRange('bayar')})`, numFmt: CUR },
      { label: 'Rata-rata Nilai', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.answerRange('bayar')})`, numFmt: CUR },
      { label: 'Jumlah Transaksi', fungsi: 'COUNT', formula: (c) => `=COUNT(${c.answerRange('bayar')})`, numFmt: NUM },
      {
        label: 'Total "Elektronik" (SUMIF)', fungsi: 'SUMIF',
        formula: (c) => `=SUMIF(${c.answerRange('kategori')},"Elektronik",${c.answerRange('bayar')})`, numFmt: CUR,
      },
      {
        label: 'Jml Transaksi "Elektronik" (COUNTIF)', fungsi: 'COUNTIF',
        formula: (c) => `=COUNTIF(${c.answerRange('kategori')},"Elektronik")`, numFmt: NUM,
      },
      {
        label: 'Rata-rata Harga Tertimbang Kuantitas (SUMPRODUCT)', fungsi: 'SUMPRODUCT',
        formula: (c) => `=SUMPRODUCT(${c.answerRange('harga')},${c.givenRange('qty')})/SUM(${c.givenRange('qty')})`, numFmt: ACC,
      },
    ];
    const soal = [
      '1. Isi kolom Nama Produk dengan VLOOKUP ke Master Produk (sheet dataset) berdasarkan Kode Produk.',
      '2. Isi kolom Kategori dengan VLOOKUP ke Master Produk berdasarkan Kode Produk.',
      '3. Isi kolom Harga Satuan dengan VLOOKUP ke Master Produk berdasarkan Kode Produk.',
      '4. Isi kolom Total Harga = Harga Satuan x Kuantitas.',
      '5. Isi kolom Diskon secara bertingkat berdasarkan Total Harga (lihat Penjelasan Rumus).',
      '6. Isi kolom Total Bayar = Total Harga - Diskon.',
      '7. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula).',
      '8. Isi Ringkasan di bawah tabel, termasuk SUMIF/COUNTIF untuk kategori "Elektronik".',
    ];
    return { given, answer, ringkasan, soal };
  }

  // expert
  const coreAnswerDefs = [
    {
      key: 'nama', header: 'Nama Produk', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Nama Produk pada Master Produk memakai XLOOKUP, dibungkus IFERROR agar menampilkan "-" jika Kode Produk tidak ditemukan.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 2)}),"-")`,
    },
    {
      key: 'kategori', header: 'Kategori', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Kategori produk memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 3)}),"-")`,
    },
    {
      key: 'harga', header: 'Harga Satuan', numFmt: ACC, type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Harga Satuan memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 4)}),0)`,
    },
    {
      key: 'total', header: 'Total Harga', numFmt: CUR, type: 'number',
      fungsi: 'Perkalian', penjelasan: 'Harga Satuan dikalikan Kuantitas.',
      formula: (c) => `=${c.answer('harga')}*${c.given('qty')}`,
    },
    {
      key: 'diskon', header: 'Diskon', numFmt: CUR, type: 'number',
      fungsi: 'IF bertingkat (5 tingkat)',
      penjelasan: 'Diskon bertingkat berdasarkan Total Harga: >=10.000.000 = 20%, >=5.000.000 = 15%, >=2.000.000 = 10%, >=1.000.000 = 5%, >=500.000 = 2%, selain itu 0%.',
      formula: (c) => `=IF(${c.answer('total')}>=10000000,20%*${c.answer('total')},IF(${c.answer('total')}>=5000000,15%*${c.answer('total')},IF(${c.answer('total')}>=2000000,10%*${c.answer('total')},IF(${c.answer('total')}>=1000000,5%*${c.answer('total')},IF(${c.answer('total')}>=500000,2%*${c.answer('total')},0)))))`,
    },
    {
      key: 'bayar', header: 'Total Bayar', numFmt: CUR, type: 'number',
      fungsi: 'Pengurangan', penjelasan: 'Total Harga dikurangi Diskon.',
      formula: (c) => `=${c.answer('total')}-${c.answer('diskon')}`,
    },
  ];

  const pool = [
    {
      // Kombinasi Pencapaian + Growth diringkas jadi satu Skor Performa lewat
      // LET (memecah formula panjang jadi langkah-langkah bernama, dihitung
      // sekali lalu dipakai berulang — bukan copy-paste sub-ekspresi yang
      // sama berkali-kali), lalu grade 5-tingkat dari skor itu.
      id: 'performa',
      given: [
        { key: 'wilayah', header: 'Wilayah', numFmt: 'General', type: 'text', datasetHeader: 'Wilayah' },
        { key: 'penjualanLalu', header: 'Penjualan Periode Lalu', numFmt: ACC, type: 'number', datasetHeader: 'Penjualan Periode Lalu' },
      ],
      answer: [
        {
          key: 'targetWilayah', header: 'Target Wilayah', numFmt: CUR, type: 'number',
          fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Target Penjualan Bulanan pada tabel Target per Wilayah berdasarkan Wilayah, dibungkus IFERROR.',
          formula: (c) => `=IFERROR(XLOOKUP(${c.given('wilayah')},${c.masterCol(1, 1)},${c.masterCol(1, 2)}),1)`,
        },
        {
          key: 'skorPerforma', header: 'Skor Performa', numFmt: '0.0', type: 'number',
          fungsi: 'LET',
          penjelasan: 'LET menghitung dua variabel bernama: "pencapaian" (Total Bayar dibagi Target Wilayah) dan "growth" (pertumbuhan terhadap Penjualan Periode Lalu), lalu menggabungkan keduanya jadi Skor Performa (70% bobot pencapaian + 30% bobot pertumbuhan) x100. CATATAN TEKNIS: nama variabel LET (mis. "pencapaian") ditulis di Excel dengan awalan tersembunyi _xlpm. — itu normal, bukan kesalahan.',
          formula: (c) => buildLetFormula(
            [
              ['pencapaian', `${c.answer('bayar')}/${c.answer('targetWilayah')}`],
              ['growth', `(${c.answer('bayar')}-${c.given('penjualanLalu')})/${c.given('penjualanLalu')}`],
            ],
            'ROUND(({{pencapaian}}*0.7+(1+{{growth}})*0.3)*100,1)',
          ),
        },
        {
          key: 'gradePerforma', header: 'Grade Performa', numFmt: 'General', type: 'text',
          fungsi: 'IF bertingkat (5 tingkat)',
          penjelasan: 'Grade dari Skor Performa: >=110 "A+", >=100 "A", >=85 "B", >=70 "C", selain itu "D".',
          formula: (c) => `=IF(${c.answer('skorPerforma')}>=110,"A+",IF(${c.answer('skorPerforma')}>=100,"A",IF(${c.answer('skorPerforma')}>=85,"B",IF(${c.answer('skorPerforma')}>=70,"C","D"))))`,
        },
      ],
    },
    {
      // INDEX+MATCH "band lookup": mencocokkan Total Bayar terhadap tabel
      // ambang batas (array konstanta, match approximate mode 1 = "cari
      // yang <= nilai, urutan menaik") lalu INDEX mengambil label tier-nya.
      // Ini pola INDEX+MATCH yang lebih kompleks dari sekadar "cari 1 nilai
      // persis" — dipakai untuk band/tier classification.
      id: 'tier', given: [],
      answer: [{
        key: 'tierPenjualan', header: 'Tier Penjualan', numFmt: 'General', type: 'text',
        fungsi: 'INDEX + MATCH (band lookup)',
        penjelasan: 'MATCH mode approximate (argumen ke-3 = 1) mencari posisi ambang batas TERBESAR yang masih <= Total Bayar di larik {0;1000000;5000000;15000000}, lalu INDEX mengambil label tier di posisi yang sama dari larik {"Bronze";"Silver";"Gold";"Platinum"}.',
        formula: (c) => `=INDEX({"Bronze";"Silver";"Gold";"Platinum"},MATCH(${c.answer('bayar')},{0;1000000;5000000;15000000},1))`,
      }],
    },
    {
      id: 'kuartal',
      given: [{ key: 'tanggal', header: 'Tanggal Transaksi', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal' }],
      answer: [{
        key: 'kuartal', header: 'Kuartal', numFmt: 'General', type: 'text',
        fungsi: 'ROUNDUP + MONTH',
        penjelasan: 'Bulan dari Tanggal Transaksi dibagi 3 lalu dibulatkan ke atas (ROUNDUP) menghasilkan angka kuartal (1-4), digabung dengan teks "Q".',
        formula: (c) => `="Q"&ROUNDUP(MONTH(${c.given('tanggal')})/3,0)`,
      }],
    },
    {
      // CHOOSE + MATCH: cara LAIN membuat band lookup selain INDEX+MATCH —
      // MATCH tetap mencari posisi ambang batas, tapi CHOOSE yang mengambil
      // labelnya (bukan INDEX). Hasil akhirnya sama dengan pool 'tier',
      // tekniknya beda — supaya siswa lihat 2 pendekatan berbeda.
      id: 'chooseTier', given: [],
      answer: [{
        key: 'kategoriChoose', header: 'Kategori Nilai (CHOOSE)', numFmt: 'General', type: 'text',
        fungsi: 'CHOOSE + MATCH (band lookup)',
        penjelasan: 'MATCH approximate mencari posisi ambang batas Total Bayar tertinggi yang masih terlampaui pada larik {0;1000000;5000000;15000000} (hasil 1-4), lalu CHOOSE mengambil teks sesuai posisi itu — pendekatan lain dari band lookup selain INDEX+MATCH.',
        formula: (c) => `=CHOOSE(MATCH(${c.answer('bayar')},{0;1000000;5000000;15000000},1),"Standar","Perak","Emas","Berlian")`,
      }],
    },
    {
      id: 'textjoinExpert', given: [],
      answer: [{
        key: 'labelLengkap', header: 'Label Lengkap Transaksi', numFmt: 'General', type: 'text',
        fungsi: 'TEXTJOIN + IF',
        penjelasan: 'Menggabungkan Kode Produk, Nama Sales, dan status "DISKON"/"NORMAL" (IF berdasarkan apakah Diskon > 0) jadi satu teks dipisah " - ".',
        formula: (c) => `=TEXTJOIN(" - ",TRUE,${c.given('kode')},${c.given('sales')},IF(${c.answer('diskon')}>0,"DISKON","NORMAL"))`,
      }],
    },
  ];
  const chosen = pickPoolItems(rng, pool, 3);
  const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
  const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);

  const ringkasan = [
    { label: 'Total Seluruh Nilai', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('bayar')})`, numFmt: CUR },
    { label: 'Nilai Terbesar', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('bayar')})`, numFmt: CUR },
    { label: 'Nilai Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.answerRange('bayar')})`, numFmt: CUR },
    {
      label: 'Total "Elektronik" (SUMIFS)', fungsi: 'SUMIFS',
      formula: (c) => `=SUMIFS(${c.answerRange('bayar')},${c.answerRange('kategori')},"Elektronik",${c.givenRange('qty')},">=1")`, numFmt: CUR,
    },
    {
      label: 'Jml Transaksi "Elektronik" (COUNTIFS)', fungsi: 'COUNTIFS',
      formula: (c) => `=COUNTIFS(${c.answerRange('kategori')},"Elektronik",${c.givenRange('qty')},">=1")`, numFmt: NUM,
    },
    {
      label: 'Sales dgn Total Bayar Tertinggi', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.givenRange('sales')},MATCH(MAX(${c.answerRange('bayar')}),${c.answerRange('bayar')},0))`, numFmt: 'General',
    },
    {
      label: 'Sales dgn Total Bayar Terendah', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.givenRange('sales')},MATCH(MIN(${c.answerRange('bayar')}),${c.answerRange('bayar')},0))`, numFmt: 'General',
    },
    {
      label: 'Rata-rata Harga Tertimbang Kuantitas (SUMPRODUCT)', fungsi: 'SUMPRODUCT',
      formula: (c) => `=SUMPRODUCT(${c.answerRange('harga')},${c.givenRange('qty')})/SUM(${c.givenRange('qty')})`, numFmt: ACC,
    },
  ];
  const soal = [
    '1. Isi kolom Nama Produk dengan XLOOKUP ke Master Produk, dibungkus IFERROR.',
    '2. Isi kolom Kategori dengan XLOOKUP ke Master Produk, dibungkus IFERROR.',
    '3. Isi kolom Harga Satuan dengan XLOOKUP ke Master Produk, dibungkus IFERROR.',
    '4. Isi kolom Total Harga = Harga Satuan x Kuantitas.',
    '5. Isi kolom Diskon secara bertingkat (5 tingkat) berdasarkan Total Harga.',
    '6. Isi kolom Total Bayar = Total Harga - Diskon.',
    '7. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula, termasuk LET dan INDEX+MATCH band lookup).',
    '8. Isi Ringkasan: SUMIFS & COUNTIFS untuk kategori "Elektronik", dan INDEX+MATCH untuk sales dengan Total Bayar tertinggi/terendah.',
  ];
  return { given, answer, ringkasan, soal };
}

// ============================ INVENTORI =====================================

function buildInventoriDataset(rowCount, level, seed) {
  const gen = EXERCISE_MATERI_GENERATORS.inventori.generate({ count: rowCount, seed });
  const masterBarang = gen.meta.masterTable;
  const supplierTable = gen.meta.supplierTable;

  if (level === 'beginner') {
    // SELURUH kolom mentah lain (Lokasi/Rak, Tanggal Kadaluarsa, dst.) ikut
    // disalin apa adanya di bagian akhir — WAJIB, supaya kolom pool
    // Beginner (lihat inventoriColumns) yang butuh salah satu field itu
    // sebagai "given" selalu ketemu lewat dataset.headers.indexOf().
    const idx = new Map(masterBarang.rows.map((r) => [r[0], r]));
    const iNo = gen.headers.indexOf('No');
    const iKode = gen.headers.indexOf('Kode Barang');
    const iMasuk = gen.headers.indexOf('Masuk');
    const iKeluar = gen.headers.indexOf('Keluar');
    const curatedHeaders = ['No', 'Kode Barang', 'Nama Barang', 'Stok Awal', 'Masuk', 'Keluar'];
    const curatedTypes = ['number', 'text', 'text', 'number', 'number', 'number'];
    const passthroughHeaders = gen.headers.filter((h) => !curatedHeaders.includes(h));
    const passthroughTypes = passthroughHeaders.map((h) => gen.columnTypes[gen.headers.indexOf(h)]);
    const headers = [...curatedHeaders, ...passthroughHeaders];
    const columnTypes = [...curatedTypes, ...passthroughTypes];
    const rows = gen.rows.map((r) => {
      const kode = r[iKode];
      const master = idx.get(kode) || ['', 'Barang', 'Lainnya', 0, 0];
      const passthroughValues = passthroughHeaders.map((h) => r[gen.headers.indexOf(h)]);
      return [r[iNo], kode, master[1], master[3], r[iMasuk], r[iKeluar], ...passthroughValues];
    });
    return { headers, columnTypes, rows, masterTables: [] };
  }

  const masterTables = [{
    title: 'Master Barang', headers: masterBarang.headers, columnTypes: masterBarang.columnTypes, rows: masterBarang.rows,
  }];
  if (level === 'expert') {
    masterTables.push({
      title: 'Kategori → Supplier', headers: supplierTable.headers, columnTypes: supplierTable.columnTypes, rows: supplierTable.rows,
    });
  }
  return { headers: gen.headers, columnTypes: gen.columnTypes, rows: gen.rows, masterTables };
}

function inventoriColumns(level, rng) {
  if (level === 'beginner') {
    const coreGivenDefs = [
      { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
      { key: 'kode', header: 'Kode Barang', numFmt: 'General', type: 'text', datasetHeader: 'Kode Barang' },
      { key: 'nama', header: 'Nama Barang', numFmt: 'General', type: 'text', datasetHeader: 'Nama Barang' },
      { key: 'stokAwal', header: 'Stok Awal', numFmt: NUM, type: 'number', datasetHeader: 'Stok Awal' },
      { key: 'masuk', header: 'Masuk', numFmt: NUM, type: 'number', datasetHeader: 'Masuk' },
      { key: 'keluar', header: 'Keluar', numFmt: NUM, type: 'number', datasetHeader: 'Keluar' },
    ];
    const coreAnswerDefs = [
      {
        key: 'stokAkhir', header: 'Stok Akhir', numFmt: NUM, type: 'number',
        fungsi: 'Penjumlahan/Pengurangan', penjelasan: 'Stok Awal ditambah Masuk lalu dikurangi Keluar.',
        formula: (c) => `=${c.given('stokAwal')}+${c.given('masuk')}-${c.given('keluar')}`,
      },
      {
        key: 'status', header: 'Status Stok', numFmt: 'General', type: 'text',
        fungsi: 'IF', penjelasan: 'Jika Stok Akhir kurang dari 30 maka "Perlu Restock", selain itu "Aman".',
        formula: (c) => `=IF(${c.answer('stokAkhir')}<30,"Perlu Restock","Aman")`,
      },
      {
        key: 'kodeRapi', header: 'Kode (Rapi)', numFmt: 'General', type: 'text',
        fungsi: 'UPPER + TRIM', penjelasan: 'Kode Barang dirapikan: buang spasi berlebih (TRIM) lalu diseragamkan huruf besar (UPPER).',
        formula: (c) => `=UPPER(TRIM(${c.given('kode')}))`,
      },
    ];
    const pool = [
      {
        id: 'lokasi',
        given: [{ key: 'lokasi', header: 'Lokasi/Rak', numFmt: 'General', type: 'text', datasetHeader: 'Lokasi/Rak' }],
        answer: [{
          key: 'lokasiRingkas', header: 'Kode Lokasi Ringkas', numFmt: 'General', type: 'text',
          fungsi: 'LEFT', penjelasan: 'Mengambil 4 karakter pertama dari Lokasi/Rak.',
          formula: (c) => `=LEFT(${c.given('lokasi')},4)`,
        }],
      },
      {
        id: 'kadaluarsa',
        given: [{ key: 'kadaluarsa', header: 'Tanggal Kadaluarsa', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal Kadaluarsa' }],
        answer: [{
          key: 'statusKadaluarsa', header: 'Punya Tanggal Kadaluarsa?', numFmt: 'General', type: 'text',
          fungsi: 'IF', penjelasan: 'Jika sel Tanggal Kadaluarsa kosong maka "Tidak Ada", selain itu "Ada".',
          formula: (c) => `=IF(${c.given('kadaluarsa')}="","Tidak Ada","Ada")`,
        }],
      },
      {
        id: 'selisihMutasi', given: [],
        answer: [{
          key: 'selisihMasukKeluar', header: 'Selisih Masuk-Keluar', numFmt: NUM, type: 'number',
          fungsi: 'ABS', penjelasan: 'Nilai absolut (selalu positif) dari selisih Masuk dikurangi Keluar.',
          formula: (c) => `=ABS(${c.given('masuk')}-${c.given('keluar')})`,
        }],
      },
      {
        id: 'panjangNama', given: [],
        answer: [{
          key: 'panjangNamaBarang', header: 'Panjang Nama Barang', numFmt: NUM, type: 'number',
          fungsi: 'LEN', penjelasan: 'Jumlah karakter pada Nama Barang.',
          formula: (c) => `=LEN(${c.given('nama')})`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 2);
    const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Masuk', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('masuk')})`, numFmt: NUM },
      { label: 'Total Keluar', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('keluar')})`, numFmt: NUM },
      { label: 'Rata-rata Stok Akhir', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.answerRange('stokAkhir')})`, numFmt: NUM },
      { label: 'Stok Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('stokAkhir')})`, numFmt: NUM },
      { label: 'Stok Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.answerRange('stokAkhir')})`, numFmt: NUM },
      { label: 'Jumlah Barang', fungsi: 'COUNTA', formula: (c) => `=COUNTA(${c.givenRange('kode')})`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Stok Akhir = Stok Awal + Masuk - Keluar.',
      '2. Isi kolom Status Stok: "Perlu Restock" jika Stok Akhir < 30, jika tidak "Aman".',
      '3. Isi kolom Kode (Rapi) dengan merapikan Kode Barang (TRIM lalu UPPER).',
      '4. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula).',
      '5. Isi Ringkasan di bawah tabel.',
    ];
    return { given, answer, ringkasan, soal };
  }

  const coreGivenDefs = [
    { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
    { key: 'kode', header: 'Kode Barang', numFmt: 'General', type: 'text', datasetHeader: 'Kode Barang' },
    { key: 'masuk', header: 'Masuk', numFmt: NUM, type: 'number', datasetHeader: 'Masuk' },
    { key: 'keluar', header: 'Keluar', numFmt: NUM, type: 'number', datasetHeader: 'Keluar' },
  ];

  if (level === 'professional') {
    const coreAnswerDefs = [
      {
        key: 'nama', header: 'Nama Barang', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Nama Barang pada Master Barang (sheet dataset) berdasarkan Kode Barang.',
        formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 5)},2,0)`,
      },
      {
        key: 'kategori', header: 'Kategori', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Kategori pada Master Barang berdasarkan Kode Barang.',
        formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 5)},3,0)`,
      },
      {
        key: 'stokAwal', header: 'Stok Awal', numFmt: NUM, type: 'number',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Stok Awal pada Master Barang berdasarkan Kode Barang.',
        formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 5)},4,0)`,
      },
      {
        key: 'harga', header: 'Harga Beli', numFmt: ACC, type: 'number',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Harga Beli pada Master Barang berdasarkan Kode Barang.',
        formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 5)},5,0)`,
      },
      {
        key: 'stokAkhir', header: 'Stok Akhir', numFmt: NUM, type: 'number',
        fungsi: 'Penjumlahan/Pengurangan', penjelasan: 'Stok Awal ditambah Masuk lalu dikurangi Keluar.',
        formula: (c) => `=${c.answer('stokAwal')}+${c.given('masuk')}-${c.given('keluar')}`,
      },
      {
        key: 'nilai', header: 'Nilai Persediaan', numFmt: CUR, type: 'number',
        fungsi: 'Perkalian', penjelasan: 'Stok Akhir dikalikan Harga Beli.',
        formula: (c) => `=${c.answer('stokAkhir')}*${c.answer('harga')}`,
      },
      {
        key: 'status', header: 'Status Stok', numFmt: 'General', type: 'text',
        fungsi: 'IF bertingkat', penjelasan: 'Status berdasarkan Stok Akhir: <20 "Kritis", <50 "Rendah", <100 "Normal", selain itu "Tinggi".',
        formula: (c) => `=IF(${c.answer('stokAkhir')}<20,"Kritis",IF(${c.answer('stokAkhir')}<50,"Rendah",IF(${c.answer('stokAkhir')}<100,"Normal","Tinggi")))`,
      },
    ];
    const pool = [
      {
        id: 'lokasi',
        given: [{ key: 'lokasi', header: 'Lokasi/Rak', numFmt: 'General', type: 'text', datasetHeader: 'Lokasi/Rak' }],
        answer: [],
      },
      {
        id: 'stokMin',
        given: [],
        answer: [
          {
            key: 'stokMinimum', header: 'Stok Minimum', numFmt: NUM, type: 'number',
            fungsi: 'VLOOKUP', penjelasan: 'Mencari Stok Minimum pada Master Barang berdasarkan Kode Barang.',
            formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 6)},6,0)`,
          },
          {
            key: 'statusVsMinimum', header: 'Vs Stok Minimum', numFmt: 'General', type: 'text',
            fungsi: 'IF', penjelasan: 'Jika Stok Akhir kurang dari Stok Minimum maka "Di Bawah Minimum", selain itu "Cukup".',
            formula: (c) => `=IF(${c.answer('stokAkhir')}<${c.answer('stokMinimum')},"Di Bawah Minimum","Cukup")`,
          },
        ],
      },
      {
        id: 'leadTime',
        given: [],
        answer: [{
          key: 'leadTime', header: 'Lead Time (hari)', numFmt: NUM, type: 'number',
          fungsi: 'VLOOKUP', penjelasan: 'Mencari Lead Time (hari) pada Master Barang berdasarkan Kode Barang.',
          formula: (c) => `=VLOOKUP(${c.given('kode')},${c.master(0, 1, 7)},7,0)`,
        }],
      },
      {
        id: 'kadaluarsa',
        given: [{ key: 'kadaluarsa', header: 'Tanggal Kadaluarsa', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal Kadaluarsa' }],
        answer: [{
          key: 'sisaHari', header: 'Sisa Hari Kadaluarsa', numFmt: NUM, type: 'number',
          fungsi: 'IF', penjelasan: 'Jika Tanggal Kadaluarsa kosong maka "-", selain itu selisih hari (Tanggal Kadaluarsa dikurangi TODAY()).',
          formula: (c) => `=IF(${c.given('kadaluarsa')}="","-",${c.given('kadaluarsa')}-TODAY())`,
        }],
      },
      {
        id: 'labelStok', given: [],
        answer: [{
          key: 'labelBundleStok', header: 'Label Bundle Stok', numFmt: 'General', type: 'text',
          fungsi: 'TEXTJOIN', penjelasan: 'Menggabungkan Nama Barang dan Kategori jadi satu teks, dipisah " - ".',
          formula: (c) => `=TEXTJOIN(" - ",TRUE,${c.answer('nama')},${c.answer('kategori')})`,
        }],
      },
      {
        id: 'persenTerpakai', given: [],
        answer: [{
          key: 'persenTerpakai', header: 'Persen Terpakai', numFmt: '0.0%', type: 'number',
          fungsi: 'IFERROR', penjelasan: 'Keluar dibagi (Stok Awal + Masuk) — persentase stok yang sudah keluar dari total yang tersedia, dibungkus IFERROR (0%) untuk mencegah error dibagi nol.',
          formula: (c) => `=IFERROR(${c.given('keluar')}/(${c.answer('stokAwal')}+${c.given('masuk')}),0)`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 4);
    const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Nilai Persediaan', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('nilai')})`, numFmt: CUR },
      { label: 'Nilai Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('nilai')})`, numFmt: CUR },
      { label: 'Nilai Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.answerRange('nilai')})`, numFmt: CUR },
      { label: 'Rata-rata Nilai', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.answerRange('nilai')})`, numFmt: CUR },
      { label: 'Jumlah Barang', fungsi: 'COUNT', formula: (c) => `=COUNT(${c.answerRange('nilai')})`, numFmt: NUM },
      { label: 'Nilai Kategori "Elektronik" (SUMIF)', fungsi: 'SUMIF', formula: (c) => `=SUMIF(${c.answerRange('kategori')},"Elektronik",${c.answerRange('nilai')})`, numFmt: CUR },
      { label: 'Jml Barang Status "Kritis" (COUNTIF)', fungsi: 'COUNTIF', formula: (c) => `=COUNTIF(${c.answerRange('status')},"Kritis")`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Nama Barang dan Kategori dengan VLOOKUP ke Master Barang berdasarkan Kode Barang.',
      '2. Isi kolom Stok Awal dan Harga Beli dengan VLOOKUP ke Master Barang.',
      '3. Isi kolom Stok Akhir = Stok Awal + Masuk - Keluar.',
      '4. Isi kolom Nilai Persediaan = Stok Akhir x Harga Beli.',
      '5. Isi kolom Status Stok secara bertingkat berdasarkan Stok Akhir (lihat Penjelasan Rumus).',
      '6. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula).',
      '7. Isi Ringkasan, termasuk SUMIF kategori "Elektronik" dan COUNTIF status "Kritis".',
    ];
    return { given, answer, ringkasan, soal };
  }

  // expert
  const coreAnswerDefs = [
    {
      key: 'nama', header: 'Nama Barang', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Nama Barang pada Master Barang memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 2)}),"-")`,
    },
    {
      key: 'kategori', header: 'Kategori', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Kategori memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 3)}),"-")`,
    },
    {
      key: 'stokAwal', header: 'Stok Awal', numFmt: NUM, type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Stok Awal memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 4)}),0)`,
    },
    {
      key: 'harga', header: 'Harga Beli', numFmt: ACC, type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Harga Beli memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 5)}),0)`,
    },
    {
      key: 'supplier', header: 'Supplier', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Supplier pada tabel Kategori→Supplier berdasarkan Kategori, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.answer('kategori')},${c.masterCol(1, 1)},${c.masterCol(1, 2)}),"-")`,
    },
    {
      key: 'stokAkhir', header: 'Stok Akhir', numFmt: NUM, type: 'number',
      fungsi: 'Penjumlahan/Pengurangan', penjelasan: 'Stok Awal ditambah Masuk lalu dikurangi Keluar.',
      formula: (c) => `=${c.answer('stokAwal')}+${c.given('masuk')}-${c.given('keluar')}`,
    },
    {
      key: 'nilai', header: 'Nilai Persediaan', numFmt: CUR, type: 'number',
      fungsi: 'Perkalian', penjelasan: 'Stok Akhir dikalikan Harga Beli.',
      formula: (c) => `=${c.answer('stokAkhir')}*${c.answer('harga')}`,
    },
    {
      key: 'status', header: 'Status Stok', numFmt: 'General', type: 'text',
      fungsi: 'IF bertingkat (5 tingkat)',
      penjelasan: 'Status berdasarkan Stok Akhir: <=0 "Habis", <20 "Kritis", <50 "Rendah", <100 "Normal", selain itu "Tinggi".',
      formula: (c) => `=IF(${c.answer('stokAkhir')}<=0,"Habis",IF(${c.answer('stokAkhir')}<20,"Kritis",IF(${c.answer('stokAkhir')}<50,"Rendah",IF(${c.answer('stokAkhir')}<100,"Normal","Tinggi"))))`,
    },
  ];
  const pool = [
    {
      // Skor Risiko Stok via LET: menggabungkan "hari cukup stok berjalan"
      // (Stok Akhir dibagi rata-rata Keluar) dengan "buffer lead time yang
      // dibutuhkan" (Lead Time x 1.5) jadi satu skor — dipecah lewat LET
      // supaya kedua variabel dihitung sekali lalu dipakai berulang.
      id: 'risiko', given: [],
      answer: [
        {
          key: 'stokMinimum', header: 'Stok Minimum', numFmt: NUM, type: 'number',
          fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Stok Minimum memakai XLOOKUP, dibungkus IFERROR.',
          formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 6)}),0)`,
        },
        {
          key: 'leadTime', header: 'Lead Time (hari)', numFmt: NUM, type: 'number',
          fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Lead Time (hari) memakai XLOOKUP, dibungkus IFERROR.',
          formula: (c) => `=IFERROR(XLOOKUP(${c.given('kode')},${c.masterCol(0, 1)},${c.masterCol(0, 7)}),1)`,
        },
        {
          key: 'skorRisiko', header: 'Skor Risiko Stok', numFmt: '0.0', type: 'number',
          fungsi: 'LET',
          penjelasan: 'LET menghitung "hariCukup" (Stok Akhir dibagi Keluar, minimal 1 supaya tidak dibagi nol) dan "targetHari" (Lead Time dikali 1,5 sebagai buffer aman), lalu Skor Risiko = (hariCukup dibagi targetHari) x 100. Skor >=100 berarti stok cukup untuk menutupi lead time pemasok + buffer.',
          formula: (c) => buildLetFormula(
            [
              ['hariCukup', `${c.answer('stokAkhir')}/MAX(${c.given('keluar')},1)`],
              ['targetHari', `${c.answer('leadTime')}*1.5`],
            ],
            'ROUND({{hariCukup}}/{{targetHari}}*100,1)',
          ),
        },
        {
          key: 'statusRisiko', header: 'Status Risiko', numFmt: 'General', type: 'text',
          fungsi: 'IF bertingkat (4 tingkat)', penjelasan: 'Berdasarkan Skor Risiko Stok: <50 "Kritis", <80 "Waspada", <120 "Aman", selain itu "Overstock".',
          formula: (c) => `=IF(${c.answer('skorRisiko')}<50,"Kritis",IF(${c.answer('skorRisiko')}<80,"Waspada",IF(${c.answer('skorRisiko')}<120,"Aman","Overstock")))`,
        },
      ],
    },
    {
      // Klasifikasi ABC (teknik manajemen persediaan nyata) via INDEX+MATCH
      // band lookup terhadap Nilai Persediaan.
      id: 'abc', given: [],
      answer: [{
        key: 'kelasAbc', header: 'Kelas ABC', numFmt: 'General', type: 'text',
        fungsi: 'INDEX + MATCH (band lookup)',
        penjelasan: 'Klasifikasi ABC persediaan: MATCH approximate mencari ambang batas Nilai Persediaan tertinggi yang masih terlampaui, lalu INDEX mengambil label kelas dari larik {"C";"B";"A"} sesuai posisi ambang {0;1000000;5000000}.',
        formula: (c) => `=INDEX({"C";"B";"A"},MATCH(${c.answer('nilai')},{0;1000000;5000000},1))`,
      }],
    },
    {
      id: 'kadaluarsa',
      given: [{ key: 'kadaluarsa', header: 'Tanggal Kadaluarsa', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal Kadaluarsa' }],
      answer: [{
        key: 'urgensiKadaluarsa', header: 'Urgensi Kadaluarsa', numFmt: 'General', type: 'text',
        fungsi: 'IF bertingkat (3 tingkat)',
        penjelasan: 'Jika Tanggal Kadaluarsa kosong maka "N/A". Jika sisa hari (Tanggal Kadaluarsa - TODAY()) < 30 maka "Segera Retur/Diskon", < 90 maka "Pantau", selain itu "Aman".',
        formula: (c) => `=IF(${c.given('kadaluarsa')}="","N/A",IF(${c.given('kadaluarsa')}-TODAY()<30,"Segera Retur/Diskon",IF(${c.given('kadaluarsa')}-TODAY()<90,"Pantau","Aman")))`,
      }],
    },
    {
      // LET: turnover rate (metrik inventori nyata) + label kondisi dalam
      // satu formula, 2 variabel bernama (turnover, status).
      id: 'turnover', given: [],
      answer: [{
        key: 'indeksPerputaran', header: 'Indeks Perputaran Stok', numFmt: 'General', type: 'text',
        fungsi: 'LET + IF bertingkat',
        penjelasan: 'LET menghitung "turnover" (Keluar dibagi Stok Awal, minimal 1 — rasio perputaran stok/inventory turnover) dan "status" (klasifikasi: >=70% "Cepat", >=30% "Sedang", selain itu "Lambat"), lalu digabung jadi satu label berformat persen.',
        formula: (c) => buildLetFormula(
          [
            ['turnover', `${c.given('keluar')}/MAX(${c.answer('stokAwal')},1)`],
            ['status', 'IF({{turnover}}>=0.7,"Cepat",IF({{turnover}}>=0.3,"Sedang","Lambat"))'],
          ],
          '{{status}}&" ("&TEXT({{turnover}},"0%")&")"',
        ),
      }],
    },
    {
      id: 'chooseStatus', given: [],
      answer: [{
        key: 'kategoriChoose', header: 'Kategori Stok (CHOOSE)', numFmt: 'General', type: 'text',
        fungsi: 'CHOOSE + MATCH (band lookup)',
        penjelasan: 'Pendekatan lain dari band lookup: MATCH approximate mencari posisi ambang batas Stok Akhir tertinggi yang masih terlampaui pada larik {0;20;50;100} (hasil 1-4), CHOOSE mengambil teks sesuai posisi.',
        formula: (c) => `=CHOOSE(MATCH(${c.answer('stokAkhir')},{0;20;50;100},1),"Habis/Kritis","Rendah","Normal","Berlebih")`,
      }],
    },
  ];
  const chosen = pickPoolItems(rng, pool, 3);
  const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
  const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
  const ringkasan = [
    { label: 'Total Nilai Persediaan', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('nilai')})`, numFmt: CUR },
    {
      label: 'Nilai "Elektronik" (SUMIFS)', fungsi: 'SUMIFS',
      formula: (c) => `=SUMIFS(${c.answerRange('nilai')},${c.answerRange('kategori')},"Elektronik",${c.answerRange('status')},"<>Kritis")`, numFmt: CUR,
    },
    {
      label: 'Jml Status "Kritis" (COUNTIFS)', fungsi: 'COUNTIFS',
      formula: (c) => `=COUNTIFS(${c.answerRange('status')},"Kritis",${c.answerRange('kategori')},"<>")`, numFmt: NUM,
    },
    {
      label: 'Barang dgn Nilai Tertinggi', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.answerRange('nama')},MATCH(MAX(${c.answerRange('nilai')}),${c.answerRange('nilai')},0))`, numFmt: 'General',
    },
    {
      label: 'Barang dgn Nilai Terendah', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.answerRange('nama')},MATCH(MIN(${c.answerRange('nilai')}),${c.answerRange('nilai')},0))`, numFmt: 'General',
    },
  ];
  const soal = [
    '1. Isi kolom Nama Barang, Kategori, Stok Awal, dan Harga Beli dengan XLOOKUP ke Master Barang, dibungkus IFERROR.',
    '2. Isi kolom Supplier dengan XLOOKUP ke tabel Kategori→Supplier berdasarkan Kategori.',
    '3. Isi kolom Stok Akhir = Stok Awal + Masuk - Keluar.',
    '4. Isi kolom Nilai Persediaan = Stok Akhir x Harga Beli.',
    '5. Isi kolom Status Stok secara bertingkat (5 tingkat) berdasarkan Stok Akhir.',
    '6. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula, termasuk LET dan INDEX+MATCH band lookup).',
    '7. Isi Ringkasan: SUMIFS & COUNTIFS, dan INDEX+MATCH barang dengan nilai persediaan tertinggi/terendah.',
  ];
  return { given, answer, ringkasan, soal };
}

// ============================= KARYAWAN =====================================

function buildKaryawanDataset(rowCount, level, seed) {
  const gen = EXERCISE_MATERI_GENERATORS.karyawan.generate({ count: rowCount, seed });
  const masterJabatan = gen.meta.masterTable;

  if (level === 'beginner') {
    // SELURUH kolom mentah lain (NIK KTP, ID Karyawan, dst.) ikut disalin
    // apa adanya di bagian akhir — WAJIB, supaya kolom pool Beginner
    // (lihat karyawanColumns) yang butuh salah satu field itu sebagai
    // "given" selalu ketemu lewat dataset.headers.indexOf().
    const idx = new Map(masterJabatan.rows.map((r) => [r[0], r]));
    const iNo = gen.headers.indexOf('No');
    const iNama = gen.headers.indexOf('Nama');
    const iAsal = gen.headers.indexOf('Asal');
    const iKodeJabatan = gen.headers.indexOf('Kode Jabatan');
    const curatedHeaders = ['No', 'Nama', 'Asal', 'Jabatan', 'Gaji Pokok'];
    const curatedTypes = ['number', 'text', 'text', 'text', 'number'];
    const passthroughHeaders = gen.headers.filter((h) => !curatedHeaders.includes(h));
    const passthroughTypes = passthroughHeaders.map((h) => gen.columnTypes[gen.headers.indexOf(h)]);
    const headers = [...curatedHeaders, ...passthroughHeaders];
    const columnTypes = [...curatedTypes, ...passthroughTypes];
    const rows = gen.rows.map((r) => {
      const kodeJabatan = r[iKodeJabatan];
      const master = idx.get(kodeJabatan) || ['', 'Staff', 0, 0, 0];
      const passthroughValues = passthroughHeaders.map((h) => r[gen.headers.indexOf(h)]);
      return [r[iNo], r[iNama], r[iAsal], master[1], master[2], ...passthroughValues];
    });
    return { headers, columnTypes, rows, masterTables: [] };
  }

  return {
    headers: gen.headers,
    columnTypes: gen.columnTypes,
    rows: gen.rows,
    masterTables: [{
      title: 'Referensi Jabatan', headers: masterJabatan.headers, columnTypes: masterJabatan.columnTypes, rows: masterJabatan.rows,
    }],
  };
}

function karyawanColumns(level, rng) {
  if (level === 'beginner') {
    const coreGivenDefs = [
      { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
      { key: 'nama', header: 'Nama', numFmt: 'General', type: 'text', datasetHeader: 'Nama' },
      { key: 'asal', header: 'Asal', numFmt: 'General', type: 'text', datasetHeader: 'Asal' },
      { key: 'jabatan', header: 'Jabatan', numFmt: 'General', type: 'text', datasetHeader: 'Jabatan' },
      { key: 'gaji', header: 'Gaji Pokok', numFmt: ACC, type: 'number', datasetHeader: 'Gaji Pokok' },
    ];
    const coreAnswerDefs = [
      {
        key: 'namaBesar', header: 'Nama (Huruf Besar)', numFmt: 'General', type: 'text',
        fungsi: 'UPPER', penjelasan: 'Mengubah Nama menjadi huruf besar semua.',
        formula: (c) => `=UPPER(${c.given('nama')})`,
      },
      {
        key: 'panjang', header: 'Panjang Nama', numFmt: NUM, type: 'number',
        fungsi: 'LEN', penjelasan: 'Menghitung jumlah karakter pada Nama.',
        formula: (c) => `=LEN(${c.given('nama')})`,
      },
      {
        key: 'inisial', header: 'Inisial', numFmt: 'General', type: 'text',
        fungsi: 'LEFT', penjelasan: 'Mengambil 1 huruf pertama dari Nama sebagai inisial.',
        formula: (c) => `=LEFT(${c.given('nama')},1)`,
      },
      {
        key: 'kategoriGaji', header: 'Kategori Gaji', numFmt: 'General', type: 'text',
        fungsi: 'IF', penjelasan: 'Jika Gaji Pokok >= 8.000.000 maka "Tinggi", selain itu "Standar".',
        formula: (c) => `=IF(${c.given('gaji')}>=8000000,"Tinggi","Standar")`,
      },
    ];
    const pool = [
      {
        id: 'nik',
        given: [{ key: 'nik', header: 'NIK KTP', numFmt: '@', type: 'text', datasetHeader: 'NIK KTP' }],
        answer: [{
          key: 'validasiNik', header: 'Validasi NIK', numFmt: 'General', type: 'text',
          fungsi: 'LEN + IF', penjelasan: 'Jika panjang NIK KTP = 16 karakter maka "Valid", selain itu "Tidak Valid".',
          formula: (c) => `=IF(LEN(${c.given('nik')})=16,"Valid","Tidak Valid")`,
        }],
      },
      {
        id: 'idKaryawan',
        given: [{ key: 'idKaryawan', header: 'ID Karyawan', numFmt: 'General', type: 'text', datasetHeader: 'ID Karyawan' }],
        answer: [{
          key: 'kodeDivisiAwalan', header: 'Kode Awalan', numFmt: 'General', type: 'text',
          fungsi: 'LEFT', penjelasan: 'Mengambil 3 karakter pertama dari ID Karyawan.',
          formula: (c) => `=LEFT(${c.given('idKaryawan')},3)`,
        }],
      },
      {
        id: 'namaLower', given: [],
        answer: [{
          key: 'namaKecil', header: 'Nama (Huruf Kecil)', numFmt: 'General', type: 'text',
          fungsi: 'LOWER', penjelasan: 'Nama diubah menjadi huruf kecil semua.',
          formula: (c) => `=LOWER(${c.given('nama')})`,
        }],
      },
      {
        id: 'asalPanjang', given: [],
        answer: [{
          key: 'panjangAsal', header: 'Panjang Nama Asal', numFmt: NUM, type: 'number',
          fungsi: 'LEN', penjelasan: 'Jumlah karakter pada Asal.',
          formula: (c) => `=LEN(${c.given('asal')})`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 2);
    const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Gaji Pokok', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('gaji')})`, numFmt: ACC },
      { label: 'Rata-rata Gaji Pokok', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.givenRange('gaji')})`, numFmt: ACC },
      { label: 'Gaji Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.givenRange('gaji')})`, numFmt: ACC },
      { label: 'Gaji Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.givenRange('gaji')})`, numFmt: ACC },
      { label: 'Jumlah Karyawan', fungsi: 'COUNTA', formula: (c) => `=COUNTA(${c.givenRange('nama')})`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Nama (Huruf Besar) dengan UPPER dari Nama.',
      '2. Isi kolom Panjang Nama dengan LEN dari Nama.',
      '3. Isi kolom Inisial dengan LEFT 1 huruf dari Nama.',
      '4. Isi kolom Kategori Gaji: "Tinggi" jika Gaji Pokok >= 8.000.000, jika tidak "Standar".',
      '5. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula).',
      '6. Isi Ringkasan di bawah tabel.',
    ];
    return { given, answer, ringkasan, soal };
  }

  const coreGivenDefs = [
    { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
    { key: 'nama', header: 'Nama', numFmt: 'General', type: 'text', datasetHeader: 'Nama' },
    { key: 'asal', header: 'Asal', numFmt: 'General', type: 'text', datasetHeader: 'Asal' },
    { key: 'tglLahir', header: 'Tanggal Lahir', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal Lahir' },
    { key: 'tglMasuk', header: 'Tanggal Masuk', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal Masuk' },
    { key: 'kodeJabatan', header: 'Kode Jabatan', numFmt: 'General', type: 'text', datasetHeader: 'Kode Jabatan' },
  ];

  if (level === 'professional') {
    const coreAnswerDefs = [
      {
        key: 'jabatan', header: 'Jabatan', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari nama Jabatan pada Referensi Jabatan (sheet dataset) berdasarkan Kode Jabatan.',
        formula: (c) => `=VLOOKUP(${c.given('kodeJabatan')},${c.master(0, 1, 5)},2,0)`,
      },
      {
        key: 'gajiPokok', header: 'Gaji Pokok', numFmt: ACC, type: 'number',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Gaji Pokok pada Referensi Jabatan berdasarkan Kode Jabatan.',
        formula: (c) => `=VLOOKUP(${c.given('kodeJabatan')},${c.master(0, 1, 5)},3,0)`,
      },
      {
        key: 'bonus', header: 'Bonus', numFmt: ACC, type: 'number',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Bonus pada Referensi Jabatan berdasarkan Kode Jabatan.',
        formula: (c) => `=VLOOKUP(${c.given('kodeJabatan')},${c.master(0, 1, 5)},4,0)`,
      },
      {
        key: 'totalGaji', header: 'Total Gaji', numFmt: ACC, type: 'number',
        fungsi: 'Penjumlahan', penjelasan: 'Gaji Pokok ditambah Bonus.',
        formula: (c) => `=${c.answer('gajiPokok')}+${c.answer('bonus')}`,
      },
      {
        key: 'tahunLahir', header: 'Tahun Lahir', numFmt: NUM, type: 'number',
        fungsi: 'YEAR', penjelasan: 'Mengambil tahun dari Tanggal Lahir.',
        formula: (c) => `=YEAR(${c.given('tglLahir')})`,
      },
      {
        key: 'tahunMasuk', header: 'Tahun Masuk', numFmt: NUM, type: 'number',
        fungsi: 'YEAR', penjelasan: 'Mengambil tahun dari Tanggal Masuk.',
        formula: (c) => `=YEAR(${c.given('tglMasuk')})`,
      },
    ];
    const pool = [
      {
        id: 'tunjangan', given: [],
        answer: [
          {
            key: 'tunjangan', header: 'Tunjangan', numFmt: ACC, type: 'number',
            fungsi: 'VLOOKUP', penjelasan: 'Mencari Tunjangan pada Referensi Jabatan berdasarkan Kode Jabatan.',
            formula: (c) => `=VLOOKUP(${c.given('kodeJabatan')},${c.master(0, 1, 6)},5,0)`,
          },
          {
            key: 'totalGajiLengkap', header: 'Total Gaji + Tunjangan', numFmt: ACC, type: 'number',
            fungsi: 'Penjumlahan', penjelasan: 'Total Gaji ditambah Tunjangan.',
            formula: (c) => `=${c.answer('totalGaji')}+${c.answer('tunjangan')}`,
          },
        ],
      },
      {
        id: 'statusKepegawaian',
        given: [{ key: 'status', header: 'Status Kepegawaian', numFmt: 'General', type: 'text', datasetHeader: 'Status Kepegawaian' }],
        answer: [{
          key: 'kategoriKontrak', header: 'Kategori Kontrak', numFmt: 'General', type: 'text',
          fungsi: 'IF', penjelasan: 'Jika Status Kepegawaian = "PKWTT" maka "Tetap", selain itu "Kontrak".',
          formula: (c) => `=IF(${c.given('status')}="PKWTT","Tetap","Kontrak")`,
        }],
      },
      {
        id: 'cuti',
        given: [{ key: 'cuti', header: 'Cuti Terpakai', numFmt: NUM, type: 'number', datasetHeader: 'Cuti Terpakai' }],
        answer: [{
          key: 'sisaCuti', header: 'Sisa Cuti Tahunan', numFmt: NUM, type: 'number',
          fungsi: 'Pengurangan', penjelasan: 'Jatah cuti tahunan (12 hari) dikurangi Cuti Terpakai.',
          formula: (c) => `=12-${c.given('cuti')}`,
        }],
      },
      {
        id: 'akhirKontrak',
        given: [{ key: 'akhirKontrak', header: 'Akhir Kontrak', numFmt: DATE, type: 'date', datasetHeader: 'Akhir Kontrak' }],
        answer: [{
          key: 'statusKontrak', header: 'Status Kontrak', numFmt: 'General', type: 'text',
          fungsi: 'IF bertingkat', penjelasan: 'Jika Akhir Kontrak kosong maka "Tidak Berlaku (PKWTT)". Jika sudah lewat dari hari ini maka "Sudah Berakhir", selain itu "Aktif".',
          formula: (c) => `=IF(${c.given('akhirKontrak')}="","Tidak Berlaku (PKWTT)",IF(${c.given('akhirKontrak')}<TODAY(),"Sudah Berakhir","Aktif"))`,
        }],
      },
      {
        id: 'nikValidasi',
        given: [{ key: 'nik', header: 'NIK KTP', numFmt: '@', type: 'text', datasetHeader: 'NIK KTP' }],
        answer: [{
          key: 'validasiNik', header: 'Validasi NIK', numFmt: 'General', type: 'text',
          fungsi: 'IF + LEN', penjelasan: 'Jika panjang NIK KTP = 16 karakter maka "Valid", selain itu "Tidak Valid".',
          formula: (c) => `=IF(LEN(${c.given('nik')})=16,"Valid","Tidak Valid")`,
        }],
      },
      {
        id: 'rekening',
        given: [{ key: 'rekening', header: 'Detail Rekening', numFmt: 'General', type: 'text', datasetHeader: 'Detail Rekening' }],
        answer: [{
          key: 'namaBank', header: 'Nama Bank', numFmt: 'General', type: 'text',
          fungsi: 'LEFT + FIND', penjelasan: 'Mengambil teks sebelum tanda " - " pada Detail Rekening (nama bank) memakai LEFT dikombinasikan FIND untuk menemukan posisi tanda " - ".',
          formula: (c) => `=LEFT(${c.given('rekening')},FIND(" - ",${c.given('rekening')})-1)`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 4);
    const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Gaji Keseluruhan', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('totalGaji')})`, numFmt: ACC },
      { label: 'Rata-rata Total Gaji', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.answerRange('totalGaji')})`, numFmt: ACC },
      { label: 'Total Gaji Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('totalGaji')})`, numFmt: ACC },
      { label: 'Total Gaji Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.answerRange('totalGaji')})`, numFmt: ACC },
      { label: 'Jumlah Karyawan', fungsi: 'COUNT', formula: (c) => `=COUNT(${c.answerRange('totalGaji')})`, numFmt: NUM },
      {
        label: 'Rata2 Gaji Jabatan Baris-1', fungsi: 'AVERAGEIF',
        formula: (c) => `=AVERAGEIF(${c.answerRange('jabatan')},${c.answer('jabatan', ROW_DATA_START)},${c.answerRange('totalGaji')})`, numFmt: ACC,
      },
    ];
    const soal = [
      '1. Isi kolom Jabatan, Gaji Pokok, dan Bonus dengan VLOOKUP ke Referensi Jabatan berdasarkan Kode Jabatan.',
      '2. Isi kolom Total Gaji = Gaji Pokok + Bonus.',
      '3. Isi kolom Tahun Lahir dan Tahun Masuk dengan fungsi YEAR.',
      '4. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula).',
      '5. Isi Ringkasan, termasuk AVERAGEIF rata-rata gaji untuk jabatan pada baris pertama.',
    ];
    return { given, answer, ringkasan, soal };
  }

  // expert
  const coreAnswerDefs = [
    {
      key: 'jabatan', header: 'Jabatan', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari nama Jabatan pada Referensi Jabatan memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeJabatan')},${c.masterCol(0, 1)},${c.masterCol(0, 2)}),"-")`,
    },
    {
      key: 'gajiPokok', header: 'Gaji Pokok', numFmt: ACC, type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Gaji Pokok memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeJabatan')},${c.masterCol(0, 1)},${c.masterCol(0, 3)}),0)`,
    },
    {
      key: 'bonus', header: 'Bonus', numFmt: ACC, type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Bonus memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeJabatan')},${c.masterCol(0, 1)},${c.masterCol(0, 4)}),0)`,
    },
    {
      key: 'tunjangan', header: 'Tunjangan', numFmt: ACC, type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Tunjangan memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeJabatan')},${c.masterCol(0, 1)},${c.masterCol(0, 5)}),0)`,
    },
    {
      key: 'totalGaji', header: 'Total Gaji', numFmt: ACC, type: 'number',
      fungsi: 'Penjumlahan', penjelasan: 'Gaji Pokok ditambah Bonus ditambah Tunjangan.',
      formula: (c) => `=${c.answer('gajiPokok')}+${c.answer('bonus')}+${c.answer('tunjangan')}`,
    },
    {
      key: 'umur', header: 'Umur (Tahun)', numFmt: NUM, type: 'number',
      fungsi: 'DATEDIF', penjelasan: 'Selisih tahun antara Tanggal Lahir dan hari ini (TODAY()).',
      formula: (c) => `=DATEDIF(${c.given('tglLahir')},TODAY(),"Y")`,
    },
    {
      key: 'masaKerja', header: 'Masa Kerja (Tahun)', numFmt: NUM, type: 'number',
      fungsi: 'DATEDIF', penjelasan: 'Selisih tahun antara Tanggal Masuk dan hari ini (TODAY()).',
      formula: (c) => `=DATEDIF(${c.given('tglMasuk')},TODAY(),"Y")`,
    },
    {
      key: 'loyalitas', header: 'Status Loyalitas', numFmt: 'General', type: 'text',
      fungsi: 'IF bertingkat (4 tingkat)',
      penjelasan: 'Berdasarkan Masa Kerja: >=15 tahun "Platinum", >=10 tahun "Gold", >=5 tahun "Silver", selain itu "Bronze".',
      formula: (c) => `=IF(${c.answer('masaKerja')}>=15,"Platinum",IF(${c.answer('masaKerja')}>=10,"Gold",IF(${c.answer('masaKerja')}>=5,"Silver","Bronze")))`,
    },
  ];
  const pool = [
    {
      // PPh 21 bulanan yang DISEDERHANAKAN untuk keperluan latihan — BUKAN
      // metode TER (Tarif Efektif Rata-rata) resmi PMK 168/2023 yang
      // sebenarnya berlaku sejak Januari 2024 (yang tabelnya jauh lebih
      // rinci per kategori PTKP & puluhan lapisan penghasilan). Disederhanakan
      // supaya bisa jadi satu formula yang bisa dipelajari, BUKAN pengganti
      // tabel TER asli untuk keperluan penghitungan pajak sungguhan.
      id: 'pph21',
      given: [{ key: 'ptkp', header: 'PTKP', numFmt: 'General', type: 'text', datasetHeader: 'PTKP' }],
      answer: [
        {
          key: 'biayaJabatan', header: 'Biaya Jabatan', numFmt: ACC, type: 'number',
          fungsi: 'MIN', penjelasan: 'Biaya jabatan = 5% dari (Gaji Pokok+Bonus+Tunjangan), dibatasi maksimal Rp500.000/bulan sesuai ketentuan.',
          formula: (c) => `=MIN(5%*(${c.answer('gajiPokok')}+${c.answer('bonus')}+${c.answer('tunjangan')}),500000)`,
        },
        {
          key: 'pkp', header: 'PKP Bulanan (Estimasi)', numFmt: ACC, type: 'number',
          fungsi: 'MAX + INDEX + MATCH',
          penjelasan: 'Penghasilan Kena Pajak = (Gaji Pokok+Bonus+Tunjangan) dikurangi Biaya Jabatan dikurangi PTKP tahunan/12 (PTKP tahunan dicari dari kategori PTKP lewat INDEX+MATCH terhadap larik konstanta), dibatasi minimal 0 dengan MAX.',
          formula: (c) => `=MAX((${c.answer('gajiPokok')}+${c.answer('bonus')}+${c.answer('tunjangan')})-${c.answer('biayaJabatan')}-INDEX({54000000;58500000;58500000;63000000;67500000;72000000},MATCH(${c.given('ptkp')},{"TK/0";"TK/1";"K/0";"K/1";"K/2";"K/3"},0))/12,0)`,
        },
        {
          key: 'pph21', header: 'PPh 21 Bulanan (Estimasi)', numFmt: ACC, type: 'number',
          fungsi: 'IF bertingkat (3 tingkat)',
          penjelasan: 'Tarif bertingkat diterapkan ke PKP Bulanan: <=5.000.000 = 5%, <=20.000.000 = 15%, selain itu 25%. CATATAN: ini estimasi yang DISEDERHANAKAN untuk latihan rumus, BUKAN metode TER (Tarif Efektif Rata-rata) resmi PMK 168/2023 yang berlaku sejak Januari 2024.',
          formula: (c) => `=IF(${c.answer('pkp')}<=5000000,5%*${c.answer('pkp')},IF(${c.answer('pkp')}<=20000000,15%*${c.answer('pkp')},25%*${c.answer('pkp')}))`,
        },
      ],
    },
    {
      id: 'statusKontrak',
      given: [
        { key: 'status', header: 'Status Kepegawaian', numFmt: 'General', type: 'text', datasetHeader: 'Status Kepegawaian' },
        { key: 'akhirKontrak', header: 'Akhir Kontrak', numFmt: DATE, type: 'date', datasetHeader: 'Akhir Kontrak' },
      ],
      answer: [{
        key: 'statusKontrakDetail', header: 'Status Kontrak (Detail)', numFmt: 'General', type: 'text',
        fungsi: 'IF bertingkat (4 tingkat)',
        penjelasan: 'Jika Status Kepegawaian = "PKWTT" maka "Tetap - Tanpa Batas Kontrak". Jika tidak: kontrak sudah lewat dari hari ini -> "Kontrak Berakhir"; sisa <= 30 hari -> "Akan Berakhir - Perlu Tindak Lanjut"; selain itu -> "Kontrak Aktif".',
        formula: (c) => `=IF(${c.given('status')}="PKWTT","Tetap - Tanpa Batas Kontrak",IF(${c.given('akhirKontrak')}<TODAY(),"Kontrak Berakhir",IF(${c.given('akhirKontrak')}-TODAY()<=30,"Akan Berakhir - Perlu Tindak Lanjut","Kontrak Aktif")))`,
      }],
    },
    {
      // INDEX+MATCH band lookup terhadap Masa Kerja (kolom inti, selalu ada)
      id: 'senioritas', given: [],
      answer: [{
        key: 'golonganSenioritas', header: 'Golongan Senioritas', numFmt: 'General', type: 'text',
        fungsi: 'INDEX + MATCH (band lookup)',
        penjelasan: 'MATCH approximate mencari ambang batas Masa Kerja tertinggi yang masih terlampaui pada larik {0;3;7;15}, lalu INDEX mengambil label golongan dari larik {"Junior";"Menengah";"Senior";"Expert"}.',
        formula: (c) => `=INDEX({"Junior";"Menengah";"Senior";"Expert"},MATCH(${c.answer('masaKerja')},{0;3;7;15},1))`,
      }],
    },
    {
      // LET: gaji tahunan disesuaikan faktor retensi dari Status Loyalitas —
      // 2 variabel bernama (gajiTahunan, faktorLoyalitas) digabung jadi 1 metrik.
      id: 'retensi', given: [],
      answer: [{
        key: 'indeksRetensi', header: 'Indeks Kompensasi Tahunan (Disesuaikan)', numFmt: ACC, type: 'number',
        fungsi: 'LET + IF bertingkat',
        penjelasan: 'LET menghitung "gajiTahunan" (Total Gaji x 12) dan "faktorLoyalitas" (pengali retensi dari Status Loyalitas: Platinum x1,2, Gold x1,1, Silver x1,05, Bronze x1), lalu mengalikan keduanya jadi indeks kompensasi tahunan yang disesuaikan.',
        formula: (c) => buildLetFormula(
          [
            ['gajiTahunan', `${c.answer('totalGaji')}*12`],
            ['faktorLoyalitas', `IF(${c.answer('loyalitas')}="Platinum",1.2,IF(${c.answer('loyalitas')}="Gold",1.1,IF(${c.answer('loyalitas')}="Silver",1.05,1)))`],
          ],
          'ROUND({{gajiTahunan}}*{{faktorLoyalitas}},0)',
        ),
      }],
    },
    {
      id: 'chooseTunjangan',
      given: [{ key: 'status', header: 'Status Kepegawaian', numFmt: 'General', type: 'text', datasetHeader: 'Status Kepegawaian' }],
      answer: [{
        key: 'kategoriHak', header: 'Kategori Hak (CHOOSE)', numFmt: 'General', type: 'text',
        fungsi: 'CHOOSE + MATCH', penjelasan: 'MATCH exact mencari posisi Status Kepegawaian pada larik {"PKWTT";"PKWT";"Magang";"Probation"} (hasil 1-4), CHOOSE mengambil deskripsi hak sesuai posisi itu.',
        formula: (c) => `=CHOOSE(MATCH(${c.given('status')},{"PKWTT";"PKWT";"Magang";"Probation"},0),"Hak Penuh","Hak Kontrak","Hak Terbatas","Hak Percobaan")`,
      }],
    },
  ];
  const chosen = pickPoolItems(rng, pool, 3);
  const given = assignColumns([...coreGivenDefs, ...chosen.flatMap((it) => it.given)]);
  const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
  const ringkasan = [
    { label: 'Total Gaji Keseluruhan', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('totalGaji')})`, numFmt: ACC },
    {
      label: 'Jml Karyawan "Gold" (COUNTIFS)', fungsi: 'COUNTIFS',
      formula: (c) => `=COUNTIFS(${c.answerRange('loyalitas')},"Gold",${c.answerRange('jabatan')},"<>")`, numFmt: NUM,
    },
    {
      label: 'Total Gaji "Gold" (SUMIFS)', fungsi: 'SUMIFS',
      formula: (c) => `=SUMIFS(${c.answerRange('totalGaji')},${c.answerRange('loyalitas')},"Gold")`, numFmt: ACC,
    },
    {
      label: 'Karyawan dgn Masa Kerja Terlama', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.givenRange('nama')},MATCH(MAX(${c.answerRange('masaKerja')}),${c.answerRange('masaKerja')},0))`, numFmt: 'General',
    },
    {
      label: 'Karyawan dgn Masa Kerja Tersingkat', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.givenRange('nama')},MATCH(MIN(${c.answerRange('masaKerja')}),${c.answerRange('masaKerja')},0))`, numFmt: 'General',
    },
  ];
  const soal = [
    '1. Isi kolom Jabatan, Gaji Pokok, Bonus, dan Tunjangan dengan XLOOKUP ke Referensi Jabatan, dibungkus IFERROR.',
    '2. Isi kolom Total Gaji = Gaji Pokok + Bonus + Tunjangan.',
    '3. Isi kolom Umur (Tahun) dan Masa Kerja (Tahun) dengan DATEDIF terhadap TODAY().',
    '4. Isi kolom Status Loyalitas secara bertingkat (4 tingkat) berdasarkan Masa Kerja.',
    '5. Isi kolom tambahan sesuai header masing-masing (lihat Penjelasan Rumus untuk detail formula, termasuk LET dan INDEX+MATCH band lookup).',
    '6. Isi Ringkasan: COUNTIFS & SUMIFS untuk status "Gold", dan INDEX+MATCH karyawan dengan masa kerja terlama/tersingkat.',
  ];
  return { given, answer, ringkasan, soal };
}

// ---------------------------------------------------------------------------
// Perakit generik: menggabungkan dataset + kolom (given/answer/ringkasan/soal)
// menjadi satu ExerciseSpec siap-render.
// ---------------------------------------------------------------------------

// ============================= AKUNTANSI & PAJAK KORPORAT ==================
// CATATAN PENTING SOAL AKURASI PAJAK: formula PPh Badan di level Expert
// SENGAJA disederhanakan (tarif umum 22% langsung, tanpa fasilitas
// pengurangan tarif Pasal 31E) untuk keperluan LATIHAN RUMUS EXCEL semata.
// Ini BUKAN pengganti perhitungan SPT Tahunan Badan sungguhan, yang perlu
// rekonsiliasi fiskal penuh satu tahun pajak + fasilitas Pasal 31E untuk
// WP dengan peredaran bruto tertentu. Penjelasan ini juga muncul di sheet
// "Penjelasan Rumus" pada kolom yang bersangkutan.

function buildAkuntansiDataset(rowCount, level, seed) {
  const gen = EXERCISE_MATERI_GENERATORS.akuntansi.generate({ count: rowCount, seed });
  const masterAkun = gen.meta.masterTable;

  if (level === 'beginner') {
    const idx = new Map(masterAkun.rows.map((r) => [r[0], r]));
    const iNo = gen.headers.indexOf('No');
    const iNoBukti = gen.headers.indexOf('No Bukti');
    const iKodeAkun = gen.headers.indexOf('Kode Akun');
    const iDebit = gen.headers.indexOf('Debit');
    const iKredit = gen.headers.indexOf('Kredit');
    const headers = ['No', 'No Bukti', 'Kode Akun', 'Nama Akun', 'Jenis Akun', 'Debit', 'Kredit'];
    const columnTypes = ['number', 'text', 'text', 'text', 'text', 'number', 'number'];
    const rows = gen.rows.map((r) => {
      const kodeAkun = r[iKodeAkun];
      const master = idx.get(kodeAkun) || ['', 'Akun', 'Lainnya'];
      return [r[iNo], r[iNoBukti], kodeAkun, master[1], master[2], r[iDebit], r[iKredit]];
    });
    return { headers, columnTypes, rows, masterTables: [] };
  }

  return {
    headers: gen.headers,
    columnTypes: gen.columnTypes,
    rows: gen.rows,
    masterTables: [{
      title: 'Chart of Accounts', headers: masterAkun.headers, columnTypes: masterAkun.columnTypes, rows: masterAkun.rows,
    }],
  };
}

function akuntansiColumns(level, rng) {
  if (level === 'beginner') {
    const given = assignColumns([
      { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
      { key: 'noBukti', header: 'No Bukti', numFmt: 'General', type: 'text', datasetHeader: 'No Bukti' },
      { key: 'kodeAkun', header: 'Kode Akun', numFmt: 'General', type: 'text', datasetHeader: 'Kode Akun' },
      { key: 'namaAkun', header: 'Nama Akun', numFmt: 'General', type: 'text', datasetHeader: 'Nama Akun' },
      { key: 'jenisAkun', header: 'Jenis Akun', numFmt: 'General', type: 'text', datasetHeader: 'Jenis Akun' },
      { key: 'debit', header: 'Debit', numFmt: ACC, type: 'number', datasetHeader: 'Debit' },
      { key: 'kredit', header: 'Kredit', numFmt: ACC, type: 'number', datasetHeader: 'Kredit' },
    ]);
    const coreAnswerDefs = [
      {
        key: 'nilaiTransaksi', header: 'Nilai Transaksi', numFmt: ACC, type: 'number',
        fungsi: 'Penjumlahan', penjelasan: 'Debit ditambah Kredit (hanya salah satu yang terisi per baris jurnal).',
        formula: (c) => `=${c.given('debit')}+${c.given('kredit')}`,
      },
      {
        key: 'jenisRingkas', header: 'Jenis (3 huruf)', numFmt: 'General', type: 'text',
        fungsi: 'LEFT', penjelasan: 'Mengambil 3 karakter pertama dari Jenis Akun.',
        formula: (c) => `=LEFT(${c.given('jenisAkun')},3)`,
      },
      {
        key: 'statusEntry', header: 'Posisi Entry', numFmt: 'General', type: 'text',
        fungsi: 'IF', penjelasan: 'Jika Debit > 0 maka "Debit", selain itu "Kredit".',
        formula: (c) => `=IF(${c.given('debit')}>0,"Debit","Kredit")`,
      },
    ];
    const pool = [
      {
        id: 'noBuktiUpper', answer: [{
          key: 'noBuktiBesar', header: 'No Bukti (Huruf Besar)', numFmt: 'General', type: 'text',
          fungsi: 'UPPER', penjelasan: 'No Bukti diubah menjadi huruf besar semua.',
          formula: (c) => `=UPPER(${c.given('noBukti')})`,
        }],
      },
      {
        id: 'panjangNamaAkun', answer: [{
          key: 'panjangNamaAkun', header: 'Panjang Nama Akun', numFmt: NUM, type: 'number',
          fungsi: 'LEN', penjelasan: 'Jumlah karakter pada Nama Akun.',
          formula: (c) => `=LEN(${c.given('namaAkun')})`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Debit', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('debit')})`, numFmt: ACC },
      { label: 'Total Kredit', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('kredit')})`, numFmt: ACC },
      { label: 'Selisih Debit-Kredit (Uji Keseimbangan)', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('debit')})-SUM(${c.givenRange('kredit')})`, numFmt: ACC },
      { label: 'Jumlah Entry Jurnal', fungsi: 'COUNTA', formula: (c) => `=COUNTA(${c.givenRange('noBukti')})`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Nilai Transaksi = Debit + Kredit.',
      '2. Isi kolom Jenis (3 huruf) dengan 3 karakter pertama dari Jenis Akun.',
      '3. Isi kolom Posisi Entry: "Debit" jika Debit > 0, jika tidak "Kredit".',
      '4. Isi Ringkasan di bawah tabel — Selisih Debit-Kredit pada SAMPEL data ini TIDAK harus nol (hanya buku besar LENGKAP satu periode yang wajib seimbang); di sini sekadar latihan SUM.',
    ];
    return { given, answer, ringkasan, soal };
  }

  const given = assignColumns([
    { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
    { key: 'noBukti', header: 'No Bukti', numFmt: 'General', type: 'text', datasetHeader: 'No Bukti' },
    { key: 'tanggal', header: 'Tanggal', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal' },
    { key: 'kodeAkun', header: 'Kode Akun', numFmt: 'General', type: 'text', datasetHeader: 'Kode Akun' },
    { key: 'debit', header: 'Debit', numFmt: ACC, type: 'number', datasetHeader: 'Debit' },
    { key: 'kredit', header: 'Kredit', numFmt: ACC, type: 'number', datasetHeader: 'Kredit' },
  ]);
  const lastGiven = given[given.length - 1].colIndex;

  if (level === 'professional') {
    const coreAnswerDefs = [
      {
        key: 'namaAkun', header: 'Nama Akun', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Nama Akun pada Chart of Accounts (sheet dataset) berdasarkan Kode Akun.',
        formula: (c) => `=VLOOKUP(${c.given('kodeAkun')},${c.master(0, 1, 4)},2,0)`,
      },
      {
        key: 'jenisAkun', header: 'Jenis Akun', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Jenis Akun pada Chart of Accounts berdasarkan Kode Akun.',
        formula: (c) => `=VLOOKUP(${c.given('kodeAkun')},${c.master(0, 1, 4)},3,0)`,
      },
      {
        key: 'statusFiskal', header: 'Dapat Dikurangkan (Fiskal)', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari status "Dapat Dikurangkan (Fiskal)" pada Chart of Accounts (hanya relevan utk akun Beban).',
        formula: (c) => `=VLOOKUP(${c.given('kodeAkun')},${c.master(0, 1, 4)},4,0)`,
      },
      {
        key: 'nilaiTransaksi', header: 'Nilai Transaksi', numFmt: ACC, type: 'number',
        fungsi: 'Penjumlahan', penjelasan: 'Debit ditambah Kredit.',
        formula: (c) => `=${c.given('debit')}+${c.given('kredit')}`,
      },
      {
        key: 'bulanTransaksi', header: 'Bulan Transaksi', numFmt: NUM, type: 'number',
        fungsi: 'MONTH', penjelasan: 'Mengambil angka bulan dari Tanggal.',
        formula: (c) => `=MONTH(${c.given('tanggal')})`,
      },
    ];
    const pool = [
      {
        id: 'kuartal', answer: [{
          key: 'kuartalTrx', header: 'Kuartal', numFmt: 'General', type: 'text',
          fungsi: 'ROUNDUP + MONTH', penjelasan: 'Bulan dari Tanggal dibagi 3 lalu dibulatkan ke atas menghasilkan angka kuartal (1-4).',
          formula: (c) => `="Q"&ROUNDUP(MONTH(${c.given('tanggal')})/3,0)`,
        }],
      },
      {
        id: 'nilaiBesar', answer: [{
          key: 'kategoriNilai', header: 'Kategori Nilai', numFmt: 'General', type: 'text',
          fungsi: 'IF', penjelasan: 'Jika Nilai Transaksi >= 10.000.000 maka "Besar", selain itu "Kecil".',
          formula: (c) => `=IF(${c.answer('nilaiTransaksi')}>=10000000,"Besar","Kecil")`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], lastGiven);
    const ringkasan = [
      { label: 'Total Debit', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('debit')})`, numFmt: ACC },
      { label: 'Total Kredit', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('kredit')})`, numFmt: ACC },
      { label: 'Total Pendapatan (SUMIF)', fungsi: 'SUMIF', formula: (c) => `=SUMIF(${c.answerRange('jenisAkun')},"Pendapatan",${c.answerRange('nilaiTransaksi')})`, numFmt: ACC },
      { label: 'Total Beban (SUMIF)', fungsi: 'SUMIF', formula: (c) => `=SUMIF(${c.answerRange('jenisAkun')},"Beban",${c.answerRange('nilaiTransaksi')})`, numFmt: ACC },
      { label: 'Jml Beban Non-Deductible (COUNTIF)', fungsi: 'COUNTIF', formula: (c) => `=COUNTIF(${c.answerRange('statusFiskal')},"Tidak")`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Nama Akun, Jenis Akun, dan Dapat Dikurangkan (Fiskal) dengan VLOOKUP ke Chart of Accounts berdasarkan Kode Akun.',
      '2. Isi kolom Nilai Transaksi = Debit + Kredit.',
      '3. Isi kolom Bulan Transaksi dengan fungsi MONTH.',
      '4. Isi Ringkasan, termasuk SUMIF Pendapatan/Beban dan COUNTIF beban non-deductible.',
    ];
    return { given, answer, ringkasan, soal };
  }

  // expert
  const coreAnswerDefs = [
    {
      key: 'namaAkun', header: 'Nama Akun', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Nama Akun memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeAkun')},${c.masterCol(0, 1)},${c.masterCol(0, 2)}),"-")`,
    },
    {
      key: 'jenisAkun', header: 'Jenis Akun', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Jenis Akun memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeAkun')},${c.masterCol(0, 1)},${c.masterCol(0, 3)}),"-")`,
    },
    {
      key: 'statusFiskal', header: 'Dapat Dikurangkan (Fiskal)', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari status Dapat Dikurangkan (Fiskal) memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeAkun')},${c.masterCol(0, 1)},${c.masterCol(0, 4)}),"-")`,
    },
    {
      key: 'nilaiTransaksi', header: 'Nilai Transaksi', numFmt: ACC, type: 'number',
      fungsi: 'Penjumlahan', penjelasan: 'Debit ditambah Kredit.',
      formula: (c) => `=${c.given('debit')}+${c.given('kredit')}`,
    },
    {
      key: 'nilaiFiskal', header: 'Nilai Fiskal (Koreksi)', numFmt: ACC, type: 'number',
      fungsi: 'IF + AND', penjelasan: 'Koreksi fiskal: jika akun berjenis Beban DAN berstatus tidak dapat dikurangkan, nilai fiskalnya dianggap 0 (tidak mengurangi laba kena pajak); selain itu memakai Nilai Transaksi apa adanya.',
      formula: (c) => `=IF(AND(${c.answer('jenisAkun')}="Beban",${c.answer('statusFiskal')}="Tidak"),0,${c.answer('nilaiTransaksi')})`,
    },
    {
      key: 'estimasiPphBadan', header: 'Estimasi PPh Badan (22%)', numFmt: ACC, type: 'number',
      fungsi: 'LET',
      penjelasan: 'LET menyimpan Nilai Fiskal sebagai variabel "dasarPengenaan", lalu mengalikannya dengan tarif PPh Badan umum 22%. DISEDERHANAKAN untuk latihan — perhitungan PPh Badan sungguhan memakai laba fiskal SATU TAHUN PAJAK PENUH (bukan per transaksi) dan bisa mendapat fasilitas pengurangan tarif 50% (Pasal 31E) untuk WP dengan peredaran bruto tertentu, yang TIDAK dimodelkan di sini.',
      formula: (c) => buildLetFormula(
        [['dasarPengenaan', c.answer('nilaiFiskal')]],
        'ROUND({{dasarPengenaan}}*22%,0)',
      ),
    },
    {
      key: 'statusMaterialitas', header: 'Status Materialitas', numFmt: 'General', type: 'text',
      fungsi: 'INDEX + MATCH (band lookup)',
      penjelasan: 'Klasifikasi materialitas transaksi (konsep audit): MATCH approximate mencari ambang batas Nilai Transaksi tertinggi yang masih terlampaui pada larik {0;1000000;10000000;50000000}, INDEX mengambil label dari larik {"Kecil";"Sedang";"Besar";"Material"}.',
      formula: (c) => `=INDEX({"Kecil";"Sedang";"Besar";"Material"},MATCH(${c.answer('nilaiTransaksi')},{0;1000000;10000000;50000000},1))`,
    },
  ];
  const pool = [
    {
      id: 'kuartal', answer: [{
        key: 'kuartal', header: 'Kuartal', numFmt: 'General', type: 'text',
        fungsi: 'ROUNDUP + MONTH', penjelasan: 'Bulan dari Tanggal dibagi 3 lalu dibulatkan ke atas menghasilkan angka kuartal (1-4).',
        formula: (c) => `="Q"&ROUNDUP(MONTH(${c.given('tanggal')})/3,0)`,
      }],
    },
    {
      id: 'chooseJenis', answer: [{
        key: 'kelompokChoose', header: 'Kelompok Akun (CHOOSE)', numFmt: 'General', type: 'text',
        fungsi: 'CHOOSE + MATCH', penjelasan: 'MATCH exact mencari posisi Jenis Akun pada larik {"Aset";"Liabilitas";"Modal";"Pendapatan";"Beban"} (hasil 1-5), CHOOSE mengambil label kelompok neraca/laba-rugi sesuai posisi itu.',
        formula: (c) => `=CHOOSE(MATCH(${c.answer('jenisAkun')},{"Aset";"Liabilitas";"Modal";"Pendapatan";"Beban"},0),"Neraca","Neraca","Neraca","Laba Rugi","Laba Rugi")`,
      }],
    },
  ];
  const chosen = pickPoolItems(rng, pool, 1);
  const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], lastGiven);
  const ringkasan = [
    { label: 'Total Nilai Fiskal (Estimasi Laba Kena Pajak)', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('nilaiFiskal')})`, numFmt: ACC },
    { label: 'Total Estimasi PPh Badan', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('estimasiPphBadan')})`, numFmt: ACC },
    {
      label: 'Total Beban Non-Deductible (SUMIFS)', fungsi: 'SUMIFS',
      formula: (c) => `=SUMIFS(${c.answerRange('nilaiTransaksi')},${c.answerRange('jenisAkun')},"Beban",${c.answerRange('statusFiskal')},"Tidak")`, numFmt: ACC,
    },
    {
      label: 'Jml Transaksi "Material" (COUNTIFS)', fungsi: 'COUNTIFS',
      formula: (c) => `=COUNTIFS(${c.answerRange('statusMaterialitas')},"Material",${c.answerRange('jenisAkun')},"<>")`, numFmt: NUM,
    },
    {
      label: 'Akun dgn Nilai Transaksi Tertinggi', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.answerRange('namaAkun')},MATCH(MAX(${c.answerRange('nilaiTransaksi')}),${c.answerRange('nilaiTransaksi')},0))`, numFmt: 'General',
    },
  ];
  const soal = [
    '1. Isi kolom Nama Akun, Jenis Akun, dan Dapat Dikurangkan (Fiskal) dengan XLOOKUP ke Chart of Accounts, dibungkus IFERROR.',
    '2. Isi kolom Nilai Transaksi = Debit + Kredit.',
    '3. Isi kolom Nilai Fiskal (Koreksi): 0 jika Beban non-deductible, selain itu = Nilai Transaksi.',
    '4. Isi kolom Estimasi PPh Badan (22%) dengan LET (lihat Penjelasan Rumus untuk catatan penyederhanaan).',
    '5. Isi kolom Status Materialitas dengan INDEX+MATCH band lookup.',
    '6. Isi kolom Kuartal dari Tanggal.',
    '7. Isi Ringkasan di bawah tabel.',
  ];
  return { given, answer, ringkasan, soal };
}

// ============================= ADMINISTRASI PERPAJAKAN =====================

function buildAdminPajakDataset(rowCount, level, seed) {
  const gen = EXERCISE_MATERI_GENERATORS['admin-pajak'].generate({ count: rowCount, seed });
  const masterTarif = gen.meta.masterTable;

  if (level === 'beginner') {
    const headers = ['No', 'No Bukti Potong', 'NPWP Lawan Transaksi', 'Nama Lawan Transaksi', 'Jenis Transaksi', 'DPP', 'Status Lapor SPT Masa'];
    const columnTypes = ['number', 'text', 'text', 'text', 'text', 'number', 'text'];
    const iNo = gen.headers.indexOf('No');
    const iNoBukti = gen.headers.indexOf('No Bukti Potong');
    const iNpwp = gen.headers.indexOf('NPWP Lawan Transaksi');
    const iNama = gen.headers.indexOf('Nama Lawan Transaksi');
    const iJenis = gen.headers.indexOf('Jenis Transaksi');
    const iDpp = gen.headers.indexOf('DPP');
    const iStatus = gen.headers.indexOf('Status Lapor SPT Masa');
    const rows = gen.rows.map((r) => [r[iNo], r[iNoBukti], r[iNpwp], r[iNama], r[iJenis], r[iDpp], r[iStatus]]);
    return { headers, columnTypes, rows, masterTables: [] };
  }

  return {
    headers: gen.headers,
    columnTypes: gen.columnTypes,
    rows: gen.rows,
    masterTables: [{
      title: 'Tarif PPh Pasal 23/26', headers: masterTarif.headers, columnTypes: masterTarif.columnTypes, rows: masterTarif.rows,
    }],
  };
}

function adminPajakColumns(level, rng) {
  if (level === 'beginner') {
    const given = assignColumns([
      { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
      { key: 'noBukti', header: 'No Bukti Potong', numFmt: 'General', type: 'text', datasetHeader: 'No Bukti Potong' },
      { key: 'npwp', header: 'NPWP Lawan Transaksi', numFmt: 'General', type: 'text', datasetHeader: 'NPWP Lawan Transaksi' },
      { key: 'nama', header: 'Nama Lawan Transaksi', numFmt: 'General', type: 'text', datasetHeader: 'Nama Lawan Transaksi' },
      { key: 'jenis', header: 'Jenis Transaksi', numFmt: 'General', type: 'text', datasetHeader: 'Jenis Transaksi' },
      { key: 'dpp', header: 'DPP', numFmt: ACC, type: 'number', datasetHeader: 'DPP' },
      { key: 'statusLapor', header: 'Status Lapor SPT Masa', numFmt: 'General', type: 'text', datasetHeader: 'Status Lapor SPT Masa' },
    ]);
    const coreAnswerDefs = [
      {
        key: 'panjangNpwp', header: 'Panjang NPWP', numFmt: NUM, type: 'number',
        fungsi: 'LEN', penjelasan: 'Jumlah karakter pada NPWP Lawan Transaksi (termasuk tanda titik dan strip).',
        formula: (c) => `=LEN(${c.given('npwp')})`,
      },
      {
        key: 'namaBesar', header: 'Nama (Huruf Besar)', numFmt: 'General', type: 'text',
        fungsi: 'UPPER', penjelasan: 'Nama Lawan Transaksi diubah menjadi huruf besar semua.',
        formula: (c) => `=UPPER(${c.given('nama')})`,
      },
      {
        key: 'ppnDasar', header: 'PPN (11%)', numFmt: ACC, type: 'number',
        fungsi: 'ROUND', penjelasan: 'PPN 11% dari DPP, dibulatkan ke rupiah penuh.',
        formula: (c) => `=ROUND(${c.given('dpp')}*11%,0)`,
      },
      {
        key: 'statusLaporRingkas', header: 'Status Ringkas', numFmt: 'General', type: 'text',
        fungsi: 'IF', penjelasan: 'Jika Status Lapor SPT Masa = "Sudah Lapor" maka "OK", selain itu "Perlu Tindak Lanjut".',
        formula: (c) => `=IF(${c.given('statusLapor')}="Sudah Lapor","OK","Perlu Tindak Lanjut")`,
      },
    ];
    const pool = [
      {
        id: 'jenisLower', answer: [{
          key: 'jenisKecil', header: 'Jenis Transaksi (huruf kecil)', numFmt: 'General', type: 'text',
          fungsi: 'LOWER', penjelasan: 'Jenis Transaksi diubah menjadi huruf kecil semua.',
          formula: (c) => `=LOWER(${c.given('jenis')})`,
        }],
      },
      {
        id: 'kodeAwalBukti', answer: [{
          key: 'kodeAwalBukti', header: 'Kode Awal Bukti', numFmt: 'General', type: 'text',
          fungsi: 'LEFT', penjelasan: 'Mengambil 6 karakter pertama dari No Bukti Potong.',
          formula: (c) => `=LEFT(${c.given('noBukti')},6)`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total DPP', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('dpp')})`, numFmt: ACC },
      { label: 'Rata-rata DPP', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.givenRange('dpp')})`, numFmt: ACC },
      { label: 'DPP Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.givenRange('dpp')})`, numFmt: ACC },
      { label: 'DPP Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.givenRange('dpp')})`, numFmt: ACC },
      { label: 'Jumlah Bukti Potong', fungsi: 'COUNTA', formula: (c) => `=COUNTA(${c.givenRange('noBukti')})`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Panjang NPWP dengan LEN dari NPWP Lawan Transaksi.',
      '2. Isi kolom Nama (Huruf Besar) dengan UPPER dari Nama Lawan Transaksi.',
      '3. Isi kolom PPN (11%) = ROUND(DPP x 11%, 0).',
      '4. Isi kolom Status Ringkas: "OK" jika sudah lapor, jika tidak "Perlu Tindak Lanjut".',
      '5. Isi Ringkasan di bawah tabel.',
    ];
    return { given, answer, ringkasan, soal };
  }

  const given = assignColumns([
    { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
    { key: 'noBukti', header: 'No Bukti Potong', numFmt: 'General', type: 'text', datasetHeader: 'No Bukti Potong' },
    { key: 'tanggal', header: 'Tanggal', numFmt: DATE, type: 'date', datasetHeader: 'Tanggal' },
    { key: 'nama', header: 'Nama Lawan Transaksi', numFmt: 'General', type: 'text', datasetHeader: 'Nama Lawan Transaksi' },
    { key: 'jenis', header: 'Jenis Transaksi', numFmt: 'General', type: 'text', datasetHeader: 'Jenis Transaksi' },
    { key: 'dpp', header: 'DPP', numFmt: ACC, type: 'number', datasetHeader: 'DPP' },
    { key: 'statusLapor', header: 'Status Lapor SPT Masa', numFmt: 'General', type: 'text', datasetHeader: 'Status Lapor SPT Masa' },
  ]);
  const lastGiven = given[given.length - 1].colIndex;

  if (level === 'professional') {
    const coreAnswerDefs = [
      {
        key: 'tarifPph', header: 'Tarif PPh 23/26', numFmt: '0.0%', type: 'number',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Tarif PPh Pasal 23/26 pada tabel referensi (sheet dataset) berdasarkan Jenis Transaksi.',
        formula: (c) => `=VLOOKUP(${c.given('jenis')},${c.master(0, 1, 2)},2,0)`,
      },
      {
        key: 'pph23', header: 'PPh 23/26 Terutang', numFmt: ACC, type: 'number',
        fungsi: 'ROUND', penjelasan: 'DPP dikalikan Tarif PPh 23/26, dibulatkan ke rupiah penuh.',
        formula: (c) => `=ROUND(${c.given('dpp')}*${c.answer('tarifPph')},0)`,
      },
      {
        key: 'ppn', header: 'PPN Keluaran (11%)', numFmt: ACC, type: 'number',
        fungsi: 'ROUND', penjelasan: 'PPN 11% dari DPP, dibulatkan ke rupiah penuh.',
        formula: (c) => `=ROUND(${c.given('dpp')}*11%,0)`,
      },
      {
        key: 'totalSetor', header: 'Total Setor', numFmt: ACC, type: 'number',
        fungsi: 'Penjumlahan', penjelasan: 'PPh 23/26 Terutang ditambah PPN Keluaran.',
        formula: (c) => `=${c.answer('pph23')}+${c.answer('ppn')}`,
      },
      {
        key: 'bulanLapor', header: 'Bulan', numFmt: NUM, type: 'number',
        fungsi: 'MONTH', penjelasan: 'Mengambil angka bulan dari Tanggal.',
        formula: (c) => `=MONTH(${c.given('tanggal')})`,
      },
    ];
    const pool = [
      {
        id: 'npwpKembali',
        given: [{ key: 'npwp', header: 'NPWP Lawan Transaksi', numFmt: 'General', type: 'text', datasetHeader: 'NPWP Lawan Transaksi' }],
        answer: [{
          key: 'formatNpwpValid', header: 'Format NPWP Valid?', numFmt: 'General', type: 'text',
          fungsi: 'IF + LEN', penjelasan: 'Jika panjang teks NPWP = 20 karakter (format lengkap dgn titik & strip) maka "Ya", selain itu "Tidak".',
          formula: (c) => `=IF(LEN(${c.given('npwp')})=20,"Ya","Tidak")`,
        }],
      },
      {
        id: 'statusBesarKecil', given: [],
        answer: [{
          key: 'kategoriTransaksi', header: 'Kategori Transaksi', numFmt: 'General', type: 'text',
          fungsi: 'IF', penjelasan: 'Jika DPP >= 20.000.000 maka "Besar", selain itu "Kecil".',
          formula: (c) => `=IF(${c.given('dpp')}>=20000000,"Besar","Kecil")`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const given2 = assignColumns([...given.map(({ colIndex, letter, ...d }) => d), ...chosen.flatMap((it) => it.given || [])]);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given2[given2.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total PPh 23/26', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('pph23')})`, numFmt: ACC },
      { label: 'Total PPN', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('ppn')})`, numFmt: ACC },
      { label: 'Total DPP', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('dpp')})`, numFmt: ACC },
      { label: 'Jml Belum Lapor (COUNTIF)', fungsi: 'COUNTIF', formula: (c) => `=COUNTIF(${c.givenRange('statusLapor')},"Belum Lapor")`, numFmt: NUM },
      { label: 'DPP Belum Lapor (SUMIF)', fungsi: 'SUMIF', formula: (c) => `=SUMIF(${c.givenRange('statusLapor')},"Belum Lapor",${c.givenRange('dpp')})`, numFmt: ACC },
    ];
    const soal = [
      '1. Isi kolom Tarif PPh 23/26 dengan VLOOKUP ke tabel referensi berdasarkan Jenis Transaksi.',
      '2. Isi kolom PPh 23/26 Terutang = ROUND(DPP x Tarif, 0).',
      '3. Isi kolom PPN Keluaran (11%) = ROUND(DPP x 11%, 0).',
      '4. Isi kolom Total Setor = PPh 23/26 Terutang + PPN Keluaran.',
      '5. Isi kolom Bulan dari Tanggal.',
      '6. Isi Ringkasan, termasuk COUNTIF/SUMIF untuk yang belum lapor.',
    ];
    return { given: given2, answer, ringkasan, soal };
  }

  // expert
  const answer = assignColumns([
    {
      key: 'tarifPph', header: 'Tarif PPh 23/26', numFmt: '0.0%', type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Tarif PPh Pasal 23/26 memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('jenis')},${c.masterCol(0, 1)},${c.masterCol(0, 2)}),0)`,
    },
    {
      key: 'pph23', header: 'PPh 23/26 Terutang', numFmt: ACC, type: 'number',
      fungsi: 'ROUND', penjelasan: 'DPP dikalikan Tarif PPh 23/26, dibulatkan ke rupiah penuh.',
      formula: (c) => `=ROUND(${c.given('dpp')}*${c.answer('tarifPph')},0)`,
    },
    {
      key: 'ppn', header: 'PPN Keluaran (11%)', numFmt: ACC, type: 'number',
      fungsi: 'ROUND', penjelasan: 'PPN 11% dari DPP, dibulatkan ke rupiah penuh.',
      formula: (c) => `=ROUND(${c.given('dpp')}*11%,0)`,
    },
    {
      key: 'sanksiPotensial', header: 'Sanksi Potensial (Estimasi)', numFmt: ACC, type: 'number',
      fungsi: 'IF',
      penjelasan: 'Estimasi sanksi bunga keterlambatan (mengacu pola 2% per bulan Pasal 9 ayat 2a UU KUP, DISEDERHANAKAN jadi satu kali 2% bukan berjenjang per bulan tunggakan): 2% dari (PPh 23/26 + PPN) jika Status Lapor = "Belum Lapor", selain itu 0.',
      formula: (c) => `=IF(${c.given('statusLapor')}="Belum Lapor",2%*(${c.answer('pph23')}+${c.answer('ppn')}),0)`,
    },
    {
      key: 'totalSetor', header: 'Total Setor (+ Sanksi)', numFmt: ACC, type: 'number',
      fungsi: 'Penjumlahan', penjelasan: 'PPh 23/26 Terutang ditambah PPN Keluaran ditambah Sanksi Potensial.',
      formula: (c) => `=${c.answer('pph23')}+${c.answer('ppn')}+${c.answer('sanksiPotensial')}`,
    },
    {
      key: 'statusRisikoLapor', header: 'Status Risiko Lapor', numFmt: 'General', type: 'text',
      fungsi: 'IF bertingkat (4 tingkat)',
      penjelasan: 'Jika Status Lapor = "Sudah Lapor" maka "Selesai". Jika belum: selisih hari (TODAY() - Tanggal) > 60 -> "Risiko Tinggi - Lewat Jatuh Tempo"; > 30 -> "Perlu Segera Lapor"; selain itu -> "Dalam Batas Waktu".',
      formula: (c) => `=IF(${c.given('statusLapor')}="Sudah Lapor","Selesai",IF(TODAY()-${c.given('tanggal')}>60,"Risiko Tinggi - Lewat Jatuh Tempo",IF(TODAY()-${c.given('tanggal')}>30,"Perlu Segera Lapor","Dalam Batas Waktu")))`,
    },
    {
      key: 'kategoriNilai', header: 'Kategori Nilai (DPP)', numFmt: 'General', type: 'text',
      fungsi: 'LET + INDEX + MATCH + TEXT',
      penjelasan: 'LET menyimpan DPP sebagai variabel "dpp" (dipakai 2x tanpa menulis ulang referensi selnya), lalu "kategori" dicari lewat INDEX+MATCH band terhadap larik ambang batas {0;10000000;50000000} -> label {"Kecil";"Sedang";"Besar"}, hasil akhirnya digabung jadi satu teks berformat.',
      formula: (c) => buildLetFormula(
        [
          ['dpp', c.given('dpp')],
          ['kategori', 'INDEX({"Kecil";"Sedang";"Besar"},MATCH({{dpp}},{0;10000000;50000000},1))'],
        ],
        '{{kategori}}&" (Rp"&TEXT({{dpp}},"#,##0")&")"',
      ),
    },
  ], lastGiven);
  const ringkasan = [
    { label: 'Total PPh 23/26', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('pph23')})`, numFmt: ACC },
    { label: 'Total PPN', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('ppn')})`, numFmt: ACC },
    { label: 'Total Sanksi Potensial', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('sanksiPotensial')})`, numFmt: ACC },
    { label: 'Jml Belum Lapor (COUNTIF)', fungsi: 'COUNTIF', formula: (c) => `=COUNTIF(${c.givenRange('statusLapor')},"Belum Lapor")`, numFmt: NUM },
    {
      label: 'Total Setor Jenis "Royalti" (SUMIFS)', fungsi: 'SUMIFS',
      formula: (c) => `=SUMIFS(${c.answerRange('totalSetor')},${c.givenRange('jenis')},"Royalti")`, numFmt: ACC,
    },
  ];
  const soal = [
    '1. Isi kolom Tarif PPh 23/26 dengan XLOOKUP ke tabel referensi, dibungkus IFERROR.',
    '2. Isi kolom PPh 23/26 Terutang dan PPN Keluaran.',
    '3. Isi kolom Sanksi Potensial (Estimasi) dan Total Setor (+ Sanksi).',
    '4. Isi kolom Status Risiko Lapor secara bertingkat berdasarkan Status Lapor dan selisih hari dari Tanggal.',
    '5. Isi kolom Kategori Nilai (DPP) dengan LET + INDEX + MATCH.',
    '6. Isi Ringkasan di bawah tabel.',
  ];
  return { given, answer, ringkasan, soal };
}

// ============================= FINANCIAL MODELING & PROYEKSI BISNIS ========

function buildFinancialModelingDataset(rowCount, level, seed) {
  const gen = EXERCISE_MATERI_GENERATORS['financial-modeling'].generate({ count: rowCount, seed });
  const masterSkenario = gen.meta.masterTable;

  if (level === 'beginner') {
    const idx = new Map(masterSkenario.rows.map((r) => [r[0], r]));
    const iNo = gen.headers.indexOf('No');
    const iBulan = gen.headers.indexOf('Bulan');
    const iDivisi = gen.headers.indexOf('Divisi');
    const iKodeSkenario = gen.headers.indexOf('Kode Skenario');
    const iPendapatan = gen.headers.indexOf('Pendapatan Aktual');
    const iBiayaTetap = gen.headers.indexOf('Biaya Tetap');
    const headers = ['No', 'Bulan', 'Divisi', 'Skenario', 'Pendapatan Aktual', 'Biaya Tetap'];
    const columnTypes = ['number', 'date', 'text', 'text', 'number', 'number'];
    const rows = gen.rows.map((r) => {
      const master = idx.get(r[iKodeSkenario]) || ['', 'Moderat', 0.08];
      return [r[iNo], r[iBulan], r[iDivisi], master[1], r[iPendapatan], r[iBiayaTetap]];
    });
    return { headers, columnTypes, rows, masterTables: [] };
  }

  return {
    headers: gen.headers,
    columnTypes: gen.columnTypes,
    rows: gen.rows,
    masterTables: [{
      title: 'Skenario Pertumbuhan', headers: masterSkenario.headers, columnTypes: masterSkenario.columnTypes, rows: masterSkenario.rows,
    }],
  };
}

function financialModelingColumns(level, rng) {
  if (level === 'beginner') {
    const given = assignColumns([
      { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
      { key: 'bulan', header: 'Bulan', numFmt: DATE, type: 'date', datasetHeader: 'Bulan' },
      { key: 'divisi', header: 'Divisi', numFmt: 'General', type: 'text', datasetHeader: 'Divisi' },
      { key: 'skenario', header: 'Skenario', numFmt: 'General', type: 'text', datasetHeader: 'Skenario' },
      { key: 'pendapatan', header: 'Pendapatan Aktual', numFmt: ACC, type: 'number', datasetHeader: 'Pendapatan Aktual' },
      { key: 'biayaTetap', header: 'Biaya Tetap', numFmt: ACC, type: 'number', datasetHeader: 'Biaya Tetap' },
    ]);
    const coreAnswerDefs = [
      {
        key: 'labaKotorSederhana', header: 'Laba Sederhana', numFmt: ACC, type: 'number',
        fungsi: 'Pengurangan', penjelasan: 'Pendapatan Aktual dikurangi Biaya Tetap (belum memperhitungkan biaya variabel).',
        formula: (c) => `=${c.given('pendapatan')}-${c.given('biayaTetap')}`,
      },
      {
        key: 'statusLaba', header: 'Status', numFmt: 'General', type: 'text',
        fungsi: 'IF', penjelasan: 'Jika Laba Sederhana > 0 maka "Untung", selain itu "Rugi".',
        formula: (c) => `=IF(${c.answer('labaKotorSederhana')}>0,"Untung","Rugi")`,
      },
      {
        key: 'divisiBesar', header: 'Divisi (Huruf Besar)', numFmt: 'General', type: 'text',
        fungsi: 'UPPER', penjelasan: 'Divisi diubah menjadi huruf besar semua.',
        formula: (c) => `=UPPER(${c.given('divisi')})`,
      },
    ];
    const pool = [
      {
        id: 'skenarioLen', answer: [{
          key: 'panjangSkenario', header: 'Panjang Nama Skenario', numFmt: NUM, type: 'number',
          fungsi: 'LEN', penjelasan: 'Jumlah karakter pada nama Skenario.',
          formula: (c) => `=LEN(${c.given('skenario')})`,
        }],
      },
      {
        id: 'marginKasar', answer: [{
          key: 'marginKasarPersen', header: 'Margin Kasar (%)', numFmt: '0.0"%"', type: 'number',
          fungsi: 'IF', penjelasan: 'Jika Pendapatan Aktual = 0 maka 0, selain itu Laba Sederhana dibagi Pendapatan Aktual x 100.',
          formula: (c) => `=IF(${c.given('pendapatan')}=0,0,ROUND(${c.answer('labaKotorSederhana')}/${c.given('pendapatan')}*100,1))`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Pendapatan', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('pendapatan')})`, numFmt: ACC },
      { label: 'Rata-rata Pendapatan', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.givenRange('pendapatan')})`, numFmt: ACC },
      { label: 'Pendapatan Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.givenRange('pendapatan')})`, numFmt: ACC },
      { label: 'Pendapatan Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.givenRange('pendapatan')})`, numFmt: ACC },
      { label: 'Jumlah Data', fungsi: 'COUNTA', formula: (c) => `=COUNTA(${c.givenRange('divisi')})`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi kolom Laba Sederhana = Pendapatan Aktual - Biaya Tetap.',
      '2. Isi kolom Status: "Untung" jika Laba Sederhana > 0, jika tidak "Rugi".',
      '3. Isi kolom Divisi (Huruf Besar) dengan UPPER dari Divisi.',
      '4. Isi kolom tambahan sesuai header (lihat Penjelasan Rumus).',
      '5. Isi Ringkasan di bawah tabel.',
    ];
    return { given, answer, ringkasan, soal };
  }

  const given = assignColumns([
    { key: 'no', header: 'No', numFmt: 'General', type: 'number', datasetHeader: 'No' },
    { key: 'bulan', header: 'Bulan', numFmt: DATE, type: 'date', datasetHeader: 'Bulan' },
    { key: 'divisi', header: 'Divisi', numFmt: 'General', type: 'text', datasetHeader: 'Divisi' },
    { key: 'kodeSkenario', header: 'Kode Skenario', numFmt: 'General', type: 'text', datasetHeader: 'Kode Skenario' },
    { key: 'pendapatan', header: 'Pendapatan Aktual', numFmt: ACC, type: 'number', datasetHeader: 'Pendapatan Aktual' },
    { key: 'biayaTetap', header: 'Biaya Tetap', numFmt: ACC, type: 'number', datasetHeader: 'Biaya Tetap' },
    { key: 'biayaVarUnit', header: 'Biaya Variabel per Unit', numFmt: ACC, type: 'number', datasetHeader: 'Biaya Variabel per Unit' },
    { key: 'unitTerjual', header: 'Unit Terjual', numFmt: NUM, type: 'number', datasetHeader: 'Unit Terjual' },
  ]);
  const lastGiven = given[given.length - 1].colIndex;

  if (level === 'professional') {
    const coreAnswerDefs = [
      {
        key: 'namaSkenario', header: 'Nama Skenario', numFmt: 'General', type: 'text',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Nama Skenario pada tabel referensi (sheet dataset) berdasarkan Kode Skenario.',
        formula: (c) => `=VLOOKUP(${c.given('kodeSkenario')},${c.master(0, 1, 3)},2,0)`,
      },
      {
        key: 'pertumbuhan', header: 'Asumsi Pertumbuhan', numFmt: '0.0%', type: 'number',
        fungsi: 'VLOOKUP', penjelasan: 'Mencari Asumsi Pertumbuhan (%/bulan) pada tabel referensi berdasarkan Kode Skenario.',
        formula: (c) => `=VLOOKUP(${c.given('kodeSkenario')},${c.master(0, 1, 3)},3,0)`,
      },
      {
        key: 'biayaVarTotal', header: 'Biaya Variabel Total', numFmt: ACC, type: 'number',
        fungsi: 'Perkalian', penjelasan: 'Biaya Variabel per Unit dikalikan Unit Terjual.',
        formula: (c) => `=${c.given('biayaVarUnit')}*${c.given('unitTerjual')}`,
      },
      {
        key: 'totalBiaya', header: 'Total Biaya', numFmt: ACC, type: 'number',
        fungsi: 'Penjumlahan', penjelasan: 'Biaya Tetap ditambah Biaya Variabel Total.',
        formula: (c) => `=${c.given('biayaTetap')}+${c.answer('biayaVarTotal')}`,
      },
      {
        key: 'labaBersih', header: 'Laba Bersih', numFmt: ACC, type: 'number',
        fungsi: 'Pengurangan', penjelasan: 'Pendapatan Aktual dikurangi Total Biaya.',
        formula: (c) => `=${c.given('pendapatan')}-${c.answer('totalBiaya')}`,
      },
      {
        key: 'proyeksiBulanDepan', header: 'Proyeksi Bulan Depan', numFmt: ACC, type: 'number',
        fungsi: 'Perkalian', penjelasan: 'Pendapatan Aktual dikalikan (1 + Asumsi Pertumbuhan).',
        formula: (c) => `=${c.given('pendapatan')}*(1+${c.answer('pertumbuhan')})`,
      },
    ];
    const pool = [
      {
        id: 'hargaPerUnit', answer: [{
          key: 'hargaJualPerUnit', header: 'Harga Jual per Unit', numFmt: ACC, type: 'number',
          fungsi: 'Pembagian', penjelasan: 'Pendapatan Aktual dibagi Unit Terjual (minimal 1 unit).',
          formula: (c) => `=${c.given('pendapatan')}/MAX(${c.given('unitTerjual')},1)`,
        }],
      },
      {
        id: 'labelUntung', answer: [{
          key: 'statusUntungRugi', header: 'Status Untung/Rugi', numFmt: 'General', type: 'text',
          fungsi: 'IF', penjelasan: 'Jika Laba Bersih >= 0 maka "Untung", selain itu "Rugi".',
          formula: (c) => `=IF(${c.answer('labaBersih')}>=0,"Untung","Rugi")`,
        }],
      },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const answer = assignColumns([...coreAnswerDefs, ...chosen.flatMap((it) => it.answer)], lastGiven);
    const ringkasan = [
      { label: 'Total Pendapatan', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('pendapatan')})`, numFmt: ACC },
      { label: 'Total Laba Bersih', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('labaBersih')})`, numFmt: ACC },
      { label: 'Laba Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('labaBersih')})`, numFmt: ACC },
      { label: 'Laba Terendah', fungsi: 'MIN', formula: (c) => `=MIN(${c.answerRange('labaBersih')})`, numFmt: ACC },
      {
        label: 'Total Laba "Divisi Online" (SUMIF)', fungsi: 'SUMIF',
        formula: (c) => `=SUMIF(${c.givenRange('divisi')},"Divisi Online",${c.answerRange('labaBersih')})`, numFmt: ACC,
      },
    ];
    const soal = [
      '1. Isi kolom Nama Skenario dan Asumsi Pertumbuhan dengan VLOOKUP ke tabel referensi berdasarkan Kode Skenario.',
      '2. Isi kolom Biaya Variabel Total = Biaya Variabel per Unit x Unit Terjual.',
      '3. Isi kolom Total Biaya = Biaya Tetap + Biaya Variabel Total.',
      '4. Isi kolom Laba Bersih = Pendapatan Aktual - Total Biaya.',
      '5. Isi kolom Proyeksi Bulan Depan = Pendapatan Aktual x (1 + Asumsi Pertumbuhan).',
      '6. Isi Ringkasan, termasuk SUMIF Laba untuk "Divisi Online".',
    ];
    return { given, answer, ringkasan, soal };
  }

  // expert
  const answer = assignColumns([
    {
      key: 'namaSkenario', header: 'Nama Skenario', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Nama Skenario memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeSkenario')},${c.masterCol(0, 1)},${c.masterCol(0, 2)}),"-")`,
    },
    {
      key: 'pertumbuhan', header: 'Asumsi Pertumbuhan', numFmt: '0.0%', type: 'number',
      fungsi: 'IFERROR + XLOOKUP', penjelasan: 'Mencari Asumsi Pertumbuhan memakai XLOOKUP, dibungkus IFERROR.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('kodeSkenario')},${c.masterCol(0, 1)},${c.masterCol(0, 3)}),0)`,
    },
    {
      key: 'biayaVarTotal', header: 'Biaya Variabel Total', numFmt: ACC, type: 'number',
      fungsi: 'Perkalian', penjelasan: 'Biaya Variabel per Unit dikalikan Unit Terjual.',
      formula: (c) => `=${c.given('biayaVarUnit')}*${c.given('unitTerjual')}`,
    },
    {
      key: 'totalBiaya', header: 'Total Biaya', numFmt: ACC, type: 'number',
      fungsi: 'Penjumlahan', penjelasan: 'Biaya Tetap ditambah Biaya Variabel Total.',
      formula: (c) => `=${c.given('biayaTetap')}+${c.answer('biayaVarTotal')}`,
    },
    {
      key: 'labaBersih', header: 'Laba Bersih', numFmt: ACC, type: 'number',
      fungsi: 'Pengurangan', penjelasan: 'Pendapatan Aktual dikurangi Total Biaya.',
      formula: (c) => `=${c.given('pendapatan')}-${c.answer('totalBiaya')}`,
    },
    {
      key: 'marginLaba', header: 'Margin Laba (%)', numFmt: '0.0"%"', type: 'number',
      fungsi: 'LET + IF', penjelasan: 'LET menyimpan Pendapatan dan Laba Bersih sebagai variabel, lalu menghitung margin (Laba/Pendapatan x 100) — dibungkus IF supaya tidak error saat Pendapatan = 0.',
      formula: (c) => buildLetFormula(
        [
          ['pendapatan', c.given('pendapatan')],
          ['laba', c.answer('labaBersih')],
        ],
        'IF({{pendapatan}}=0,0,ROUND({{laba}}/{{pendapatan}}*100,1))',
      ),
    },
    {
      key: 'titikImpasUnit', header: 'Titik Impas (Unit)', numFmt: NUM, type: 'number',
      fungsi: 'LET (Analisis Break-Even)',
      penjelasan: 'LET menghitung 2 langkah bernama: "hargaJualPerUnit" (Pendapatan Aktual dibagi Unit Terjual, minimal 1 unit) dan "marginKontribusi" (harga jual per unit dikurangi Biaya Variabel per Unit), lalu Titik Impas = Biaya Tetap dibagi Margin Kontribusi (analisis break-even klasik: berapa unit harus terjual supaya Biaya Tetap tertutup). Jika margin kontribusi <= 0, hasilnya "N/A" (produk dijual di bawah biaya variabel, break-even mustahil tercapai).',
      formula: (c) => buildLetFormula(
        [
          ['hargaJualPerUnit', `${c.given('pendapatan')}/MAX(${c.given('unitTerjual')},1)`],
          ['marginKontribusi', `{{hargaJualPerUnit}}-${c.given('biayaVarUnit')}`],
        ],
        `IF({{marginKontribusi}}<=0,"N/A",ROUND(${c.given('biayaTetap')}/{{marginKontribusi}},0))`,
      ),
    },
    {
      key: 'statusKesehatan', header: 'Status Kesehatan Bisnis', numFmt: 'General', type: 'text',
      fungsi: 'IFERROR + INDEX + MATCH (band lookup)',
      penjelasan: 'Klasifikasi kesehatan bisnis dari Margin Laba: MATCH approximate mencari ambang batas tertinggi yang masih terlampaui pada larik {-100;0;10;25}, INDEX mengambil label dari larik {"Merugi";"Tipis";"Sehat";"Sangat Sehat"}. Dibungkus IFERROR -> "Merugi Parah" untuk margin di bawah -100% (MATCH tidak bisa mencocokkan nilai di bawah ambang batas terendah larik).',
      formula: (c) => `=IFERROR(INDEX({"Merugi";"Tipis";"Sehat";"Sangat Sehat"},MATCH(${c.answer('marginLaba')},{-100;0;10;25},1)),"Merugi Parah")`,
    },
    {
      key: 'proyeksiBulanDepan', header: 'Proyeksi Bulan Depan', numFmt: ACC, type: 'number',
      fungsi: 'Perkalian', penjelasan: 'Pendapatan Aktual dikalikan (1 + Asumsi Pertumbuhan).',
      formula: (c) => `=${c.given('pendapatan')}*(1+${c.answer('pertumbuhan')})`,
    },
  ], lastGiven);
  const ringkasan = [
    { label: 'Total Pendapatan', fungsi: 'SUM', formula: (c) => `=SUM(${c.givenRange('pendapatan')})`, numFmt: ACC },
    { label: 'Total Laba Bersih', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('labaBersih')})`, numFmt: ACC },
    {
      label: 'Laba "Divisi Online" Skenario "Optimis" (SUMIFS)', fungsi: 'SUMIFS',
      formula: (c) => `=SUMIFS(${c.answerRange('labaBersih')},${c.givenRange('divisi')},"Divisi Online",${c.givenRange('kodeSkenario')},"OPT")`, numFmt: ACC,
    },
    {
      label: 'Jml Data Status "Sehat" (COUNTIFS)', fungsi: 'COUNTIFS',
      formula: (c) => `=COUNTIFS(${c.answerRange('statusKesehatan')},"Sehat",${c.givenRange('divisi')},"<>")`, numFmt: NUM,
    },
    {
      label: 'Divisi dgn Laba Tertinggi', fungsi: 'INDEX + MATCH',
      formula: (c) => `=INDEX(${c.givenRange('divisi')},MATCH(MAX(${c.answerRange('labaBersih')}),${c.answerRange('labaBersih')},0))`, numFmt: 'General',
    },
  ];
  const soal = [
    '1. Isi kolom Nama Skenario dan Asumsi Pertumbuhan dengan XLOOKUP ke tabel referensi, dibungkus IFERROR.',
    '2. Isi kolom Biaya Variabel Total, Total Biaya, dan Laba Bersih.',
    '3. Isi kolom Margin Laba (%) dan Titik Impas (Unit) dengan LET (analisis break-even — lihat Penjelasan Rumus).',
    '4. Isi kolom Status Kesehatan Bisnis dengan INDEX+MATCH band lookup.',
    '5. Isi kolom Proyeksi Bulan Depan.',
    '6. Isi Ringkasan di bawah tabel.',
  ];
  return { given, answer, ringkasan, soal };
}

const MATERI_BUILDERS = {
  sales: { buildDataset: buildSalesDataset, buildColumns: salesColumns },
  inventori: { buildDataset: buildInventoriDataset, buildColumns: inventoriColumns },
  karyawan: { buildDataset: buildKaryawanDataset, buildColumns: karyawanColumns },
  akuntansi: { buildDataset: buildAkuntansiDataset, buildColumns: akuntansiColumns },
  'admin-pajak': { buildDataset: buildAdminPajakDataset, buildColumns: adminPajakColumns },
  'financial-modeling': { buildDataset: buildFinancialModelingDataset, buildColumns: financialModelingColumns },
};

/** Cari kolom "given" atau "answer" berdasarkan key. */
function findCol(list, key) {
  const found = list.find((c) => c.key === key);
  if (!found) throw new Error(`Kolom dengan key "${key}" tidak ditemukan.`);
  return found;
}

/**
 * Membangun konteks formula untuk satu baris data (dipakai oleh
 * definisi `formula(ctx)` pada kolom answer & ringkasan).
 */
function makeRowContext({ given, answer, datasetMasterRanges, rowNum, dataRowCount }) {
  return {
    /** Referensi kolom "given" pada baris SAAT INI, sheet sama (mis. "C10"). */
    given(key, atRow) {
      const col = findCol(given, key);
      return `${col.letter}${atRow || rowNum}`;
    },
    /** Referensi kolom "answer" pada baris SAAT INI, sheet sama. */
    answer(key, atRow) {
      const col = findCol(answer, key);
      return `${col.letter}${atRow || rowNum}`;
    },
    /** Range penuh kolom "given" di semua baris data (untuk agregasi). */
    givenRange(key) {
      const col = findCol(given, key);
      return `${col.letter}${ROW_DATA_START}:${col.letter}${ROW_DATA_START + dataRowCount - 1}`;
    },
    /** Range penuh kolom "answer" di semua baris data (untuk agregasi). */
    answerRange(key) {
      const col = findCol(answer, key);
      return `${col.letter}${ROW_DATA_START}:${col.letter}${ROW_DATA_START + dataRowCount - 1}`;
    },
    /** Range absolut tabel master ke-`idx` di sheet 'dataset', kolom kFrom..kTo (1-based). */
    master(idx, kFrom, kTo) {
      const m = datasetMasterRanges[idx];
      const fromLetter = colLetter(m.startCol + kFrom - 1);
      const toLetter = colLetter(m.startCol + kTo - 1);
      return `'dataset'!$${fromLetter}$${m.dataStartRow}:$${toLetter}$${m.dataEndRow}`;
    },
    /** Range absolut SATU kolom (untuk XLOOKUP) dari tabel master ke-`idx`, kolom k (1-based). */
    masterCol(idx, k) {
      const m = datasetMasterRanges[idx];
      const letter = colLetter(m.startCol + k - 1);
      return `'dataset'!$${letter}$${m.dataStartRow}:$${letter}$${m.dataEndRow}`;
    },
  };
}

/**
 * @param {Object} options
 * @param {'sales'|'inventori'|'karyawan'} options.materi
 * @param {'beginner'|'professional'|'expert'} options.level
 * @param {number} [options.rowCount=15] - jumlah baris soal di 'Lembar latihan'
 * @param {number|string} [options.seed]
 * @returns {Object} ExerciseSpec
 */
export function buildExerciseSpec(options = {}) {
  const { materi, level } = options;
  if (!MATERI_BUILDERS[materi]) throw new Error(`Materi tidak dikenal: ${materi}`);
  if (!LEVELS.includes(level)) throw new Error(`Level tidak dikenal: ${level}`);

  const rowCount = Math.max(5, Math.min(40, Math.floor(options.rowCount || 15)));
  const seed = options.seed ?? `${materi}-${level}-${Date.now()}`;

  const builder = MATERI_BUILDERS[materi];
  const dataset = builder.buildDataset(rowCount, level, seed);
  // rng KHUSUS untuk memilih kolom ekstra mana yang tampil (lihat
  // pickPoolItems) — salt berbeda dari rng dataset (offset seed) supaya
  // independen dari isi baris data, tapi tetap reproducible per seed.
  const colRngSeed = typeof seed === 'number' ? (seed ^ 0x9e3779b9) >>> 0 : hashSeed(`${seed}-columns`);
  const columnRng = mulberry32(colRngSeed);
  const { given, answer, ringkasan, soal } = builder.buildColumns(level, columnRng);

  // --- posisikan tabel master di sheet 'dataset' (kalau ada) -------------
  const datasetLastCol = 1 + dataset.headers.length; // kolom terakhir blok utama (1-based, mulai dari B=2)
  let cursorCol = datasetLastCol + 3; // gap 2 kolom
  const datasetMasterRanges = dataset.masterTables.map((mt) => {
    const startCol = cursorCol;
    const range = {
      startCol,
      headerRow: DATASET_ROW_HEADER,
      dataStartRow: DATASET_ROW_DATA_START,
      dataEndRow: DATASET_ROW_DATA_START + mt.rows.length - 1,
      table: mt,
    };
    cursorCol = startCol + mt.headers.length + 2; // gap 2 kolom ke tabel berikutnya
    return range;
  });

  // Kolom blok utama di sheet 'dataset' mulai dari kolom B (index 2) untuk
  // header index 0 — lihat writeDatasetSheet()/renderer: colLetter(2 + i).
  const datasetColLetterFor = (datasetHeader) => colLetter(2 + dataset.headers.indexOf(datasetHeader));

  // --- bangun baris data untuk Lembar latihan / kunci jawaban ------------
  const practiceRows = [];
  for (let i = 0; i < rowCount; i++) {
    const rowNum = ROW_DATA_START + i;
    const datasetRow = DATASET_ROW_DATA_START + i;
    const ctx = makeRowContext({ given, answer, datasetMasterRanges, rowNum, dataRowCount: rowCount });

    const givenCells = given.map((col) => {
      const dsLetter = datasetColLetterFor(col.datasetHeader);
      return { letter: col.letter, formula: `='dataset'!${dsLetter}${datasetRow}`, numFmt: col.numFmt };
    });
    const answerCells = answer.map((col) => ({ letter: col.letter, formula: col.formula(ctx), numFmt: col.numFmt }));

    practiceRows.push({ rowNum, given: givenCells, answer: answerCells });
  }

  // --- baris "Contoh" (ilustrasi, DIHITUNG dari baris data pertama lewat
  // formula asli juga — bukan teks placeholder — supaya saat file dibuka
  // di Excel, baris Contoh menampilkan jawaban sungguhan yang benar,
  // persis seperti pada file contoh. Baris ini SENGAJA di luar semua range
  // agregasi (range dimulai dari ROW_DATA_START, bukan ROW_CONTOH).
  const exampleCtx = makeRowContext({ given, answer, datasetMasterRanges, rowNum: ROW_CONTOH, dataRowCount: rowCount });
  const exampleGiven = given.map((col) => {
    const dsLetter = datasetColLetterFor(col.datasetHeader);
    return { letter: col.letter, formula: `='dataset'!${dsLetter}${DATASET_ROW_DATA_START}`, numFmt: col.numFmt };
  });
  const exampleAnswer = answer.map((col) => ({ letter: col.letter, formula: col.formula(exampleCtx), numFmt: col.numFmt }));

  const lastAnswerCol = answer.length ? answer[answer.length - 1].colIndex : given[given.length - 1].colIndex;

  // --- Ringkasan (blok KPI DI BAWAH tabel data, meniru posisi pada file
  // contoh — bukan di samping header, supaya tidak tabrakan dengan blok
  // "Soal:" yang juga diletakkan di bawah tabel) ---------------------------
  const ringkasanStartRow = ROW_DATA_START + rowCount + 1; // 1 baris kosong setelah data terakhir
  const ringkasanLabelCol = given[given.length - 1].colIndex; // sejajar kolom given terakhir
  const ringkasanValueCol = ringkasanLabelCol + 1;
  const summaryCtx = makeRowContext({ given, answer, datasetMasterRanges, rowNum: ROW_DATA_START, dataRowCount: rowCount });
  const ringkasanRows = ringkasan.map((r, i) => ({
    row: ringkasanStartRow + i,
    labelCol: colLetter(ringkasanLabelCol),
    valueCol: colLetter(ringkasanValueCol),
    label: r.label,
    fungsi: r.fungsi,
    formula: r.formula(summaryCtx),
    numFmt: r.numFmt,
  }));

  // --- Penjelasan Rumus ----------------------------------------------------
  const rumusExampleCtx = makeRowContext({ given, answer, datasetMasterRanges, rowNum: ROW_DATA_START, dataRowCount: rowCount });
  const explanations = answer.map((col, i) => ({
    no: i + 1,
    fungsi: col.fungsi,
    formula: col.formula(rumusExampleCtx),
    penjelasan: col.penjelasan,
  }));
  ringkasan.forEach((r, i) => {
    explanations.push({
      no: answer.length + i + 1,
      fungsi: r.fungsi,
      formula: r.formula(summaryCtx),
      penjelasan: `Ringkasan "${r.label}".`,
    });
  });

  const title = `latihan excel ( ${LEVEL_LABELS[level]} ) - ( ${MATERI_LABELS[materi]} )`;

  return {
    materi,
    level,
    title,
    rowCount,
    given,
    answer,
    dataset,
    datasetMasterRanges,
    practiceRows,
    exampleGiven,
    exampleAnswer,
    ringkasanRows,
    ringkasanLabelCol: colLetter(ringkasanLabelCol),
    ringkasanValueCol: colLetter(ringkasanValueCol),
    soal,
    explanations,
    lastGivenCol: colLetter(given[given.length - 1].colIndex),
    lastAnswerCol: colLetter(lastAnswerCol),
  };
}

/** Semua 9 kombinasi Level x Materi — dipakai oleh test suite & UI. */
export function allCombinations() {
  const out = [];
  for (const level of LEVELS) {
    for (const materi of MATERI_LIST) {
      out.push({ level, materi });
    }
  }
  return out;
}
