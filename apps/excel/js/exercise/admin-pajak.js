/**
 * exercise/admin-pajak.js — Materi ADMINISTRASI PERPAJAKAN
 * (dipecah dari ../exercise-generator.js tanpa perubahan perilaku)
 */
import { EXERCISE_MATERI_GENERATORS } from '../dataset-generator.js';
import { ACC, NUM, DATE, pickPoolItems, assignColumns, buildLetFormula } from './common.js';

// ============================= ADMINISTRASI PERPAJAKAN =====================

export function buildAdminPajakDataset(rowCount, level, seed) {
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

export function adminPajakColumns(level, rng) {
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
