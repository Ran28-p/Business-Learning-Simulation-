/**
 * exercise/karyawan.js — Materi KARYAWAN
 * (dipecah dari ../exercise-generator.js tanpa perubahan perilaku)
 */
import { EXERCISE_MATERI_GENERATORS } from '../dataset-generator.js';
import { ACC, NUM, DATE, ROW_DATA_START, pickPoolItems, assignColumns, buildLetFormula } from './common.js';

// ============================= KARYAWAN =====================================

export function buildKaryawanDataset(rowCount, level, seed) {
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

export function karyawanColumns(level, rng) {
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
