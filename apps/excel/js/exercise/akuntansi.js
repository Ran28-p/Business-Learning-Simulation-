/**
 * exercise/akuntansi.js — Materi AKUNTANSI & PAJAK KORPORAT
 * (dipecah dari ../exercise-generator.js tanpa perubahan perilaku)
 */
import { EXERCISE_MATERI_GENERATORS } from '../dataset-generator.js';
import { ACC, NUM, DATE, pickPoolItems, assignColumns, buildLetFormula } from './common.js';

// ============================= AKUNTANSI & PAJAK KORPORAT ==================
// CATATAN PENTING SOAL AKURASI PAJAK: formula PPh Badan di level Expert
// SENGAJA disederhanakan (tarif umum 22% langsung, tanpa fasilitas
// pengurangan tarif Pasal 31E) untuk keperluan LATIHAN RUMUS EXCEL semata.
// Ini BUKAN pengganti perhitungan SPT Tahunan Badan sungguhan, yang perlu
// rekonsiliasi fiskal penuh satu tahun pajak + fasilitas Pasal 31E untuk
// WP dengan peredaran bruto tertentu. Penjelasan ini juga muncul di sheet
// "Penjelasan Rumus" pada kolom yang bersangkutan.

export function buildAkuntansiDataset(rowCount, level, seed) {
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

export function akuntansiColumns(level, rng) {
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
