/**
 * exercise/financial-modeling.js — Materi FINANCIAL MODELING & PROYEKSI BISNIS
 * (dipecah dari ../exercise-generator.js tanpa perubahan perilaku)
 */
import { EXERCISE_MATERI_GENERATORS } from '../dataset-generator.js';
import { ACC, NUM, DATE, pickPoolItems, assignColumns, buildLetFormula } from './common.js';

// ============================= FINANCIAL MODELING & PROYEKSI BISNIS ========

export function buildFinancialModelingDataset(rowCount, level, seed) {
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

export function financialModelingColumns(level, rng) {
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
