/**
 * exercise/penggajian.js — Materi PENGGAJIAN & PPh 21 (TER)
 * (dipecah dari ../exercise-generator.js tanpa perubahan perilaku)
 */
import { EXERCISE_MATERI_GENERATORS } from '../dataset-generator.js';
import { ACC, NUM, pickPoolItems, assignColumns } from './common.js';

// ---------------------------------------------------------------------------
// PENGGAJIAN & PPh 21 (TER) — dasar hukum & angka acuan: data/payroll-ter.js (dibangkitkan dari mesin pajak SPT).
//   Beginner     : penghasilan bruto bulanan (termasuk premi dibayar perusahaan) + PTKP + kategori TER.
//   Profesional  : tarif TER (SUMIFS ke tabel resmi), PPh 21 bulanan (ROUNDDOWN), penerimaan bersih.
//   Expert       : masa pajak terakhir (Desember): biaya jabatan, neto, PKP (dibulatkan ke bawah ribuan),
//                  tarif Pasal 17 progresif (SUMPRODUCT selisih tarif), PPh Desember = setahun − Jan–Nov.
// Nilai dijaga tests/test-payroll-ter.mjs: rumus dievaluasi HyperFormula dan dibandingkan dengan mesin pajak SPT.
// ---------------------------------------------------------------------------

function pickColumns(gen, names) {
  const idx = names.map((n) => gen.headers.indexOf(n));
  return {
    headers: names.slice(), columnTypes: idx.map((i) => gen.columnTypes[i]),
    rows: gen.rows.map((r) => idx.map((i) => r[i])),
  };
}

export function buildPenggajianDataset(rowCount, level, seed) {
  const gen = EXERCISE_MATERI_GENERATORS.penggajian.generate({ count: rowCount, seed });
  const [refPtkp, refTer, refPasal17] = gen.meta.masterTables;
  const asMaster = (t) => ({ title: t.title, headers: t.headers, columnTypes: t.columnTypes, rows: t.rows });
  if (level === 'beginner') {
    const d = pickColumns(gen, ['No', 'ID Karyawan', 'Nama', 'Status PTKP', 'Gaji Pokok', 'Tunjangan Tetap', 'Tunjangan Tidak Tetap', 'Premi Asuransi Dibayar Perusahaan']);
    return { ...d, masterTables: [] };   // Beginner = datar (kontrak kurikulum: tanpa lookup & tanpa tabel master)
  }
  if (level === 'professional') {
    const d = pickColumns(gen, ['No', 'ID Karyawan', 'Nama', 'Status PTKP', 'Gaji Pokok', 'Tunjangan Tetap', 'Tunjangan Tidak Tetap', 'Premi Asuransi Dibayar Perusahaan', 'Iuran JHT+JP Karyawan']);
    return { ...d, masterTables: [asMaster(refPtkp), asMaster(refTer)] };
  }
  const d = pickColumns(gen, ['No', 'ID Karyawan', 'Nama', 'Status PTKP', 'Gaji Pokok', 'Tunjangan Tetap', 'Premi Asuransi Dibayar Perusahaan', 'Iuran JHT+JP Karyawan', 'Bonus/THR Desember']);
  return { ...d, masterTables: [asMaster(refPtkp), asMaster(refTer), asMaster(refPasal17)] };
}

const PCT2 = '0.00%';

export function penggajianColumns(level, rng) {
  const g = (key, header, type, numFmt) => ({ key, header, numFmt: numFmt || 'General', type, datasetHeader: header });
  const NOTE_BRUTO = 'Penghasilan bruto bulanan = gaji pokok + tunjangan + premi asuransi yang dibayar perusahaan. Premi JKK, JKM, dan kesehatan yang ditanggung pemberi kerja TERMASUK penghasilan bruto (PMK 168/2023 Pasal 5); iuran JHT/JP bagian perusahaan bukan objek PPh 21.';

  if (level === 'beginner') {
    const given = assignColumns([
      g('no', 'No', 'number'), g('id', 'ID Karyawan', 'text'), g('nama', 'Nama', 'text'), g('status', 'Status PTKP', 'text'),
      g('gaji', 'Gaji Pokok', 'number', ACC), g('tunjTetap', 'Tunjangan Tetap', 'number', ACC), g('tunjTidak', 'Tunjangan Tidak Tetap', 'number', ACC),
      g('premi', 'Premi Asuransi Dibayar Perusahaan', 'number', ACC),
    ]);
    const core = [
      { key: 'bruto', header: 'Penghasilan Bruto Bulanan', numFmt: ACC, type: 'number', fungsi: 'SUM', penjelasan: NOTE_BRUTO,
        formula: (c) => `=SUM(${c.given('gaji')}:${c.given('premi')})` },
      { key: 'kategori', header: 'Kategori TER', numFmt: 'General', type: 'text', fungsi: 'IF',
        penjelasan: 'Kategori TER (A/B/C) ditentukan dari status PTKP: A = TK/0, TK/1, K/0; B = TK/2, TK/3, K/1, K/2; C = K/3. Dibuat dengan IF bertingkat dan OR.',
        formula: (c) => `=IF(OR(${c.given('status')}="TK/0",${c.given('status')}="TK/1",${c.given('status')}="K/0"),"A",IF(OR(${c.given('status')}="TK/2",${c.given('status')}="TK/3",${c.given('status')}="K/1",${c.given('status')}="K/2"),"B","C"))` },
      { key: 'ptkp', header: 'PTKP Setahun', numFmt: ACC, type: 'number', fungsi: 'VALUE',
        penjelasan: 'PTKP = Rp54.000.000 (diri sendiri) + Rp4.500.000 bila status K (kawin) + Rp4.500.000 × jumlah tanggungan (angka di belakang tanda "/", maksimal 3). LEFT mengambil huruf pertama, RIGHT mengambil digit tanggungan, VALUE mengubahnya jadi angka (PMK 101/2016).',
        formula: (c) => `=54000000+IF(LEFT(${c.given('status')},1)="K",4500000,0)+VALUE(RIGHT(${c.given('status')},1))*4500000` },
      { key: 'tunai', header: 'Penghasilan Tunai Bulanan', numFmt: ACC, type: 'number', fungsi: 'SUM',
        penjelasan: 'Yang benar-benar diterima tunai = gaji pokok + tunjangan tetap + tunjangan tidak tetap. Premi yang dibayar perusahaan tidak diterima tunai, tetapi tetap menambah penghasilan bruto untuk pajak.',
        formula: (c) => `=SUM(${c.given('gaji')}:${c.given('tunjTidak')})` },
    ];
    const pool = [
      { id: 'band', answer: [{ key: 'band', header: 'Golongan Gaji', numFmt: 'General', type: 'text', fungsi: 'IF',
        penjelasan: 'Gaji pokok ≥ Rp20.000.000 = "Tinggi"; ≥ Rp10.000.000 = "Menengah"; selain itu "Dasar" (IF bertingkat).',
        formula: (c) => `=IF(${c.given('gaji')}>=20000000,"Tinggi",IF(${c.given('gaji')}>=10000000,"Menengah","Dasar"))` }] },
      { id: 'ptkpBulan', answer: [{ key: 'ptkpBulan', header: 'PTKP per Bulan', numFmt: ACC, type: 'number', fungsi: 'ROUND',
        penjelasan: 'PTKP setahun dibagi 12, dibulatkan ke rupiah penuh. Hanya untuk perbandingan: pada bulan Jan–Nov PTKP tidak dikurangkan karena sudah tercermin dalam tarif TER.',
        formula: (c) => `=ROUND(${c.answer('ptkp')}/12,0)` }] },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const answer = assignColumns([...core, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Bruto Bulanan', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('bruto')})`, numFmt: ACC },
      { label: 'Rata-rata Bruto', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.answerRange('bruto')})`, numFmt: ACC },
      { label: 'Bruto Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('bruto')})`, numFmt: ACC },
      { label: 'Jumlah Karyawan Kategori A', fungsi: 'COUNTIF', formula: (c) => `=COUNTIF(${c.answerRange('kategori')},"A")`, numFmt: NUM },
      { label: 'Jumlah Karyawan', fungsi: 'COUNTA', formula: (c) => `=COUNTA(${c.givenRange('nama')})`, numFmt: NUM },
    ];
    const soal = [
      '1. Isi Penghasilan Bruto Bulanan = gaji pokok + semua tunjangan + premi asuransi yang dibayar perusahaan (gunakan SUM).',
      '2. Isi Kategori TER dari status PTKP memakai IF dan OR (A = TK/0, TK/1, K/0; B = TK/2, TK/3, K/1, K/2; C = K/3).',
      '3. Isi PTKP Setahun = 54.000.000 + 4.500.000 bila kawin (K) + 4.500.000 × tanggungan (gunakan LEFT, RIGHT, VALUE).',
      '4. Isi Penghasilan Tunai Bulanan (tanpa premi yang dibayar perusahaan).',
      '5. Isi kolom tambahan yang diminta, lalu lengkapi Ringkasan di bawah tabel.',
    ];
    return { given, answer, ringkasan, soal };
  }

  if (level === 'professional') {
    const given = assignColumns([
      g('no', 'No', 'number'), g('id', 'ID Karyawan', 'text'), g('nama', 'Nama', 'text'), g('status', 'Status PTKP', 'text'),
      g('gaji', 'Gaji Pokok', 'number', ACC), g('tunjTetap', 'Tunjangan Tetap', 'number', ACC), g('tunjTidak', 'Tunjangan Tidak Tetap', 'number', ACC),
      g('premi', 'Premi Asuransi Dibayar Perusahaan', 'number', ACC), g('iuran', 'Iuran JHT+JP Karyawan', 'number', ACC),
    ]);
    const core = [
      { key: 'bruto', header: 'Penghasilan Bruto Bulanan', numFmt: ACC, type: 'number', fungsi: 'SUM', penjelasan: NOTE_BRUTO,
        formula: (c) => `=SUM(${c.given('gaji')}:${c.given('premi')})` },
      { key: 'kategori', header: 'Kategori TER', numFmt: 'General', type: 'text', fungsi: 'VLOOKUP',
        penjelasan: 'Kategori TER dari status PTKP: VLOOKUP pencocokan persis (0/FALSE) ke tabel Referensi PTKP; kategori ada di kolom ke-3.',
        formula: (c) => `=VLOOKUP(${c.given('status')},${c.master(0, 1, 3)},3,0)` },
      { key: 'tarif', header: 'Tarif TER', numFmt: PCT2, type: 'number', fungsi: 'SUMIFS',
        penjelasan: 'Mencari tarif pada tabel TER resmi: baris yang kategorinya sama dan bruto berada di antara Batas Bawah dan Batas Atas. Karena rentang tiap kategori tidak tumpang tindih, hanya satu baris yang cocok sehingga SUMIFS menghasilkan tarifnya.',
        formula: (c) => `=SUMIFS(${c.masterCol(1, 4)},${c.masterCol(1, 1)},${c.answer('kategori')},${c.masterCol(1, 2)},"<="&${c.answer('bruto')},${c.masterCol(1, 3)},">="&${c.answer('bruto')})` },
      { key: 'pph21', header: 'PPh 21 TER Bulanan', numFmt: ACC, type: 'number', fungsi: 'ROUNDDOWN',
        penjelasan: 'PPh 21 bulan Januari–November = penghasilan bruto × tarif TER, dibulatkan ke bawah ke rupiah penuh (SE-22/PJ.24/1990). Pengurang (biaya jabatan, iuran JHT/JP) dan PTKP TIDAK dikurangkan di bulan-bulan ini — sudah tercermin dalam tarif TER.',
        formula: (c) => `=ROUNDDOWN(${c.answer('bruto')}*${c.answer('tarif')},0)` },
      { key: 'bersih', header: 'Penerimaan Bersih', numFmt: ACC, type: 'number', fungsi: 'SUM',
        penjelasan: 'Penerimaan bersih = penghasilan tunai (gaji + tunjangan) dikurangi iuran JHT+JP karyawan dan PPh 21 yang dipotong. Premi yang dibayar perusahaan tidak diterima tunai. (Iuran BPJS Kesehatan 1% karyawan tidak dimodelkan dalam latihan ini.)',
        formula: (c) => `=SUM(${c.given('gaji')}:${c.given('tunjTidak')},-${c.given('iuran')},-${c.answer('pph21')})` },
      { key: 'statusPotong', header: 'Status Pemotongan', numFmt: 'General', type: 'text', fungsi: 'IF',
        penjelasan: 'Jika PPh 21 = 0 maka "Tidak ada potongan" (bruto masih di lapisan TER 0%), selain itu "Dipotong PPh 21".',
        formula: (c) => `=IF(${c.answer('pph21')}=0,"Tidak ada potongan","Dipotong PPh 21")` },
    ];
    const pool = [
      { id: 'rasio', answer: [{ key: 'rasio', header: 'Beban Pajak / Bruto', numFmt: PCT2, type: 'number', fungsi: 'ROUND',
        penjelasan: 'PPh 21 dibagi penghasilan bruto, dibulatkan 4 desimal (= tarif efektif yang benar-benar dipotong, bisa sedikit di bawah tarif TER karena pembulatan ke bawah).',
        formula: (c) => `=ROUND(${c.answer('pph21')}/${c.answer('bruto')},4)` }] },
      { id: 'tahunan', answer: [{ key: 'brutoTahun', header: 'Bruto Setahun (Estimasi)', numFmt: ACC, type: 'number', fungsi: 'Perkalian',
        penjelasan: 'Bruto bulanan × 12 — gambaran penghasilan setahun bila gaji tetap sepanjang tahun (dipakai pada perhitungan Desember di level Expert).',
        formula: (c) => `=${c.answer('bruto')}*12` }] },
    ];
    const chosen = pickPoolItems(rng, pool, 1);
    const answer = assignColumns([...core, ...chosen.flatMap((it) => it.answer)], given[given.length - 1].colIndex);
    const ringkasan = [
      { label: 'Total Bruto', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('bruto')})`, numFmt: ACC },
      { label: 'Total PPh 21 Bulanan', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('pph21')})`, numFmt: ACC },
      { label: 'Rata-rata Tarif TER', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.answerRange('tarif')})`, numFmt: PCT2 },
      { label: 'Jml Karyawan Dipotong (COUNTIF)', fungsi: 'COUNTIF', formula: (c) => `=COUNTIF(${c.answerRange('statusPotong')},"Dipotong PPh 21")`, numFmt: NUM },
      { label: 'PPh 21 Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('pph21')})`, numFmt: ACC },
      { label: 'Total Penerimaan Bersih', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('bersih')})`, numFmt: ACC },
    ];
    const soal = [
      '1. Isi Penghasilan Bruto Bulanan (SUM; termasuk premi yang dibayar perusahaan).',
      '2. Isi Kategori TER dengan VLOOKUP, lalu Tarif TER dengan SUMIFS ke tabel TER (kategori + rentang bruto).',
      '3. Isi PPh 21 TER Bulanan = ROUNDDOWN(bruto × tarif, 0).',
      '4. Isi Penerimaan Bersih = gaji + tunjangan − iuran JHT+JP − PPh 21.',
      '5. Isi Status Pemotongan (IF), kolom tambahan, dan Ringkasan.',
    ];
    return { given, answer, ringkasan, soal };
  }

  // expert — masa pajak terakhir (Desember)
  const given = assignColumns([
    g('no', 'No', 'number'), g('id', 'ID Karyawan', 'text'), g('nama', 'Nama', 'text'), g('status', 'Status PTKP', 'text'),
    g('gaji', 'Gaji Pokok', 'number', ACC), g('tunjTetap', 'Tunjangan Tetap', 'number', ACC), g('premi', 'Premi Asuransi Dibayar Perusahaan', 'number', ACC),
    g('iuran', 'Iuran JHT+JP Karyawan', 'number', ACC), g('bonus', 'Bonus/THR Desember', 'number', ACC),
  ]);
  const answer = assignColumns([
    { key: 'bruto', header: 'Bruto Bulanan', numFmt: ACC, type: 'number', fungsi: 'SUM',
      penjelasan: NOTE_BRUTO + ' Latihan ini mengasumsikan gaji dan tunjangan tetap sama dari Januari sampai Desember.',
      formula: (c) => `=SUM(${c.given('gaji')}:${c.given('premi')})` },
    { key: 'kategori', header: 'Kategori TER', numFmt: 'General', type: 'text', fungsi: 'XLOOKUP', penjelasan: 'Kategori TER dari status PTKP.',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('status')},${c.masterCol(0, 1)},${c.masterCol(0, 3)}),"-")` },
    { key: 'tarif', header: 'Tarif TER', numFmt: PCT2, type: 'number', fungsi: 'SUMIFS',
      penjelasan: 'Tarif TER bulanan dari tabel resmi (kategori + rentang bruto) — dipakai untuk bulan Januari–November.',
      formula: (c) => `=SUMIFS(${c.masterCol(1, 4)},${c.masterCol(1, 1)},${c.answer('kategori')},${c.masterCol(1, 2)},"<="&${c.answer('bruto')},${c.masterCol(1, 3)},">="&${c.answer('bruto')})` },
    { key: 'pphJanNov', header: 'PPh 21 Dipotong Jan–Nov', numFmt: ACC, type: 'number', fungsi: 'ROUNDDOWN',
      penjelasan: 'PPh 21 bulanan = bruto × tarif TER, dibulatkan ke bawah ke rupiah penuh, lalu dikalikan 11 bulan (Januari–November).',
      formula: (c) => `=ROUNDDOWN(${c.answer('bruto')}*${c.answer('tarif')},0)*11` },
    { key: 'brutoSetahun', header: 'Penghasilan Bruto Setahun', numFmt: ACC, type: 'number', fungsi: 'SUM',
      penjelasan: 'Bruto bulanan × 12 ditambah Bonus/THR Desember (penghasilan tidak teratur yang diterima di Desember).',
      formula: (c) => `=SUM(${c.answer('bruto')}*12,${c.given('bonus')})` },
    { key: 'biayaJabatan', header: 'Biaya Jabatan', numFmt: ACC, type: 'number', fungsi: 'MIN',
      penjelasan: 'Biaya jabatan = 5% dari penghasilan bruto setahun, paling banyak Rp6.000.000 setahun (Rp500.000 sebulan).',
      formula: (c) => `=MIN(5%*${c.answer('brutoSetahun')},6000000)` },
    { key: 'neto', header: 'Penghasilan Neto Setahun', numFmt: ACC, type: 'number', fungsi: 'SUM',
      penjelasan: 'Neto = bruto setahun − biaya jabatan − iuran JHT+JP yang dibayar karyawan (12 bulan). Iuran JHT/JP bagian karyawan menjadi pengurang; bagian perusahaan bukan objek pajak.',
      formula: (c) => `=SUM(${c.answer('brutoSetahun')},-${c.answer('biayaJabatan')},-${c.given('iuran')}*12)` },
    { key: 'ptkp', header: 'PTKP Setahun', numFmt: ACC, type: 'number', fungsi: 'XLOOKUP', penjelasan: 'PTKP setahun menurut status (PMK 101/2016).',
      formula: (c) => `=IFERROR(XLOOKUP(${c.given('status')},${c.masterCol(0, 1)},${c.masterCol(0, 2)}),0)` },
    { key: 'pkp', header: 'PKP Setahun', numFmt: ACC, type: 'number', fungsi: 'ROUNDDOWN',
      penjelasan: 'PKP = neto − PTKP, tidak boleh negatif (MAX dengan 0), dibulatkan ke bawah hingga ribuan rupiah penuh (ROUNDDOWN dengan angka −3).',
      formula: (c) => `=MAX(0,ROUNDDOWN(${c.answer('neto')}-${c.answer('ptkp')},-3))` },
    { key: 'pphSetahun', header: 'PPh 21 Setahun (Pasal 17)', numFmt: ACC, type: 'number', fungsi: 'SUMPRODUCT',
      penjelasan: 'Tarif progresif Pasal 17: tiap lapisan menambah tarifnya hanya pada bagian PKP di atas batas bawah lapisan. Dengan kolom "Selisih Tarif" (tarif lapisan − tarif lapisan sebelumnya), pajak = Σ [PKP > batas bawah] × (PKP − batas bawah) × selisih tarif; dibulatkan ke bawah ke rupiah penuh.',
      formula: (c) => `=ROUNDDOWN(SUMPRODUCT((${c.answer('pkp')}>${c.masterCol(2, 2)})*(${c.answer('pkp')}-${c.masterCol(2, 2)})*${c.masterCol(2, 5)}),0)` },
    { key: 'pphDesember', header: 'PPh 21 Desember (Kurang/Lebih Bayar)', numFmt: ACC, type: 'number', fungsi: 'SUM',
      penjelasan: 'PPh 21 masa pajak terakhir = PPh 21 setahun − PPh 21 yang sudah dipotong Januari–November. Hasil positif = kurang bayar yang dipotong di Desember; hasil negatif berarti pemotongan Jan–Nov melebihi PPh setahun (kelebihan potong; penanganannya mengikuti ketentuan yang berlaku dan di luar cakupan latihan).',
      formula: (c) => `=SUM(${c.answer('pphSetahun')},-${c.answer('pphJanNov')})` },
  ], given[given.length - 1].colIndex);
  const ringkasan = [
    { label: 'Total PPh 21 Jan–Nov', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('pphJanNov')})`, numFmt: ACC },
    { label: 'Total PPh 21 Setahun', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('pphSetahun')})`, numFmt: ACC },
    { label: 'Total PPh 21 Desember', fungsi: 'SUM', formula: (c) => `=SUM(${c.answerRange('pphDesember')})`, numFmt: ACC },
    { label: 'Jml Karyawan Kurang Bayar Desember (COUNTIF)', fungsi: 'COUNTIF', formula: (c) => `=COUNTIF(${c.answerRange('pphDesember')},">0")`, numFmt: NUM },
    { label: 'PKP Tertinggi', fungsi: 'MAX', formula: (c) => `=MAX(${c.answerRange('pkp')})`, numFmt: ACC },
    { label: 'Rata-rata PKP', fungsi: 'AVERAGE', formula: (c) => `=AVERAGE(${c.answerRange('pkp')})`, numFmt: ACC },
  ];
  const soal = [
    '1. Isi Bruto Bulanan, Kategori TER, dan Tarif TER (bulan Januari–November).',
    '2. Isi PPh 21 Dipotong Jan–Nov = ROUNDDOWN(bruto × tarif, 0) × 11.',
    '3. Isi Penghasilan Bruto Setahun (12 × bruto bulanan + Bonus/THR Desember).',
    '4. Isi Biaya Jabatan (5%, maksimal Rp6.000.000) dan Penghasilan Neto Setahun.',
    '5. Isi PTKP dan PKP Setahun (dibulatkan ke bawah hingga ribuan, tidak boleh negatif).',
    '6. Isi PPh 21 Setahun dengan tarif Pasal 17 (SUMPRODUCT + kolom Selisih Tarif).',
    '7. Isi PPh 21 Desember = PPh setahun − PPh Jan–Nov, lalu Ringkasan.',
  ];
  return { given, answer, ringkasan, soal };
}
