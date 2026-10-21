/**
 * exercise/inventori.js — Materi INVENTORI
 * (dipecah dari ../exercise-generator.js tanpa perubahan perilaku)
 */
import { EXERCISE_MATERI_GENERATORS } from '../dataset-generator.js';
import { ACC, NUM, CUR, DATE, pickPoolItems, assignColumns, buildLetFormula } from './common.js';

// ============================ INVENTORI =====================================

export function buildInventoriDataset(rowCount, level, seed) {
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

export function inventoriColumns(level, rng) {
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
