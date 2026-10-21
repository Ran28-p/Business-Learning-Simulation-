/**
 * exercise/sales.js — Materi SALES
 * (dipecah dari ../exercise-generator.js tanpa perubahan perilaku)
 */
import { EXERCISE_MATERI_GENERATORS } from '../dataset-generator.js';
import { ACC, NUM, CUR, DATE, pickPoolItems, assignColumns, buildLetFormula } from './common.js';

// ============================= SALES ========================================

export function buildSalesDataset(rowCount, level, seed) {
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

export function salesColumns(level, rng) {
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
