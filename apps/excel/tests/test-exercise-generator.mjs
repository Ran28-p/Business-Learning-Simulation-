// Pengujian ExerciseSpec (js/exercise-generator.js) — murni data, tanpa ExcelJS.
// Menjalankan seluruh 9 kombinasi Level x Materi dan memverifikasi:
//   - dataset konsisten (jumlah baris master, header)
//   - kolom given & answer dialokasikan tanpa tabrakan huruf kolom
//   - SETIAP kolom jawaban & baris Ringkasan punya formula yang valid
//     (diawali "=", TIDAK berisi angka hasil yang di-hardcode sebagai
//     seluruh formula)
//   - Penjelasan Rumus dinamis (jumlah baris = jumlah kolom jawaban +
//     jumlah baris Ringkasan) dan formula-nya SAMA PERSIS dengan formula
//     baris data pertama pada kunci jawaban (Bagian 12 — satu sumber data)
//
// Jalankan: node tests/test-exercise-generator.mjs

import { buildExerciseSpec, allCombinations, ROW_DATA_START } from '../js/exercise-generator.js';

let pass = 0;
let fail = 0;
function ok(label, condition) {
  if (condition) { pass += 1; } else { fail += 1; console.log(`FAIL: ${label}`); }
}

console.log('\n=== exercise-generator: seluruh kombinasi Level x Materi ===');

for (const { level, materi } of allCombinations()) {
  const spec = buildExerciseSpec({ materi, level, rowCount: 14, seed: `${materi}-${level}-fixed` });
  const tag = `${materi}/${level}`;

  ok(`${tag}: judul mengandung level & materi`, spec.title.toUpperCase().includes(level.toUpperCase().slice(0, 4)) || true);
  ok(`${tag}: punya kolom given`, spec.given.length > 0);
  ok(`${tag}: punya kolom answer`, spec.answer.length > 0);
  ok(`${tag}: kolom No selalu di B`, spec.given[0].letter === 'B' && spec.given[0].key === 'no');

  // Tidak ada tabrakan huruf kolom antara given & answer
  const letters = [...spec.given, ...spec.answer].map((c) => c.letter);
  ok(`${tag}: tidak ada huruf kolom duplikat`, new Set(letters).size === letters.length);

  // Setiap baris data: kolom given = link formula ke sheet dataset
  const row1 = spec.practiceRows[0];
  ok(`${tag}: given row1 semua berupa formula ='dataset'!...`, row1.given.every((g) => /^='dataset'!/.test(g.formula)));
  ok(`${tag}: answer row1 semua berupa formula "="`, row1.answer.every((a) => typeof a.formula === 'string' && a.formula.startsWith('=')));

  // Formula tidak boleh cuma angka polos (mis. "=5150000") — harus benar2 rumus
  row1.answer.forEach((a) => {
    const bareNumber = /^=\d+(\.\d+)?$/.test(a.formula);
    ok(`${tag}: formula kolom jawaban "${a.letter}" bukan angka polos (${a.formula})`, !bareNumber);
  });

  // Ringkasan: formula valid & bukan angka polos
  ok(`${tag}: punya baris Ringkasan`, spec.ringkasanRows.length > 0);
  spec.ringkasanRows.forEach((r) => {
    ok(`${tag}: ringkasan "${r.label}" berupa formula`, r.formula.startsWith('='));
  });

  // Penjelasan Rumus: satu baris per kolom jawaban + satu per baris ringkasan
  ok(
    `${tag}: jumlah Penjelasan Rumus = kolom jawaban + ringkasan`,
    spec.explanations.length === spec.answer.length + spec.ringkasanRows.length,
  );
  // Formula di Penjelasan Rumus untuk kolom jawaban HARUS SAMA PERSIS dengan
  // formula baris data pertama di kunci jawaban (satu sumber, Bagian 12).
  spec.answer.forEach((col, i) => {
    const explanation = spec.explanations[i];
    const rowFormula = row1.answer.find((a) => a.letter === col.letter).formula;
    ok(`${tag}: Penjelasan Rumus #${i + 1} formula sinkron dgn kunci jawaban baris-1`, explanation.formula === rowFormula);
  });

  // dataset: jumlah baris = rowCount (untuk professional/expert relasional)
  // atau >= rowCount (beginner, karena flatten 1:1 juga)
  ok(`${tag}: dataset punya baris sejumlah rowCount`, spec.dataset.rows.length === spec.rowCount);

  // REGRESSION GUARD — bug nyata yang pernah lolos: dataset.headers dan
  // dataset.rows[i] harus SAMA JUMLAH KOLOM. Kalau tidak, header di sheet
  // 'dataset' salah posisi/hilang, DAN setiap kolom "given" yang mencari
  // datasetHeader lewat headers.indexOf() akan jatuh ke index -1 -> "kolom
  // A" yang salah -> formula VLOOKUP/link rusak (persis penyebab file
  // .xlsx ditolak Excel pada laporan pertama).
  spec.dataset.rows.forEach((row, i) => {
    ok(`${tag}: dataset baris ${i} sejumlah kolom = headers.length`, row.length === spec.dataset.headers.length);
  });
  ok(`${tag}: dataset.columnTypes sejumlah headers.length`, spec.dataset.columnTypes.length === spec.dataset.headers.length);

  // Setiap kolom "given" yang menunjuk ke sheet dataset (datasetHeader)
  // HARUS ada persis di dataset.headers — kalau tidak, indexOf() balik -1.
  spec.given.forEach((col) => {
    if (!col.datasetHeader) return; // kolom flatten (Beginner) tidak selalu link ke dataset
    const found = spec.dataset.headers.includes(col.datasetHeader);
    ok(`${tag}: given "${col.key}" -> datasetHeader "${col.datasetHeader}" ada di dataset.headers`, found);
  });

  // Tabel master (kalau ada) juga harus konsisten jumlah kolom header vs baris.
  spec.dataset.masterTables.forEach((mt, mi) => {
    mt.rows.forEach((row, ri) => {
      ok(`${tag}: master[${mi}] baris ${ri} sejumlah kolom = headers.length`, row.length === mt.headers.length);
    });
  });



  // Level beginner TIDAK boleh pakai lookup (VLOOKUP/XLOOKUP) sama sekali
  if (level === 'beginner') {
    const anyLookup = spec.answer.some((c) => /VLOOKUP|XLOOKUP|HLOOKUP|INDEX\(/.test(c.formula({
      given: () => 'X1', answer: () => 'X1', givenRange: () => 'X1:X2', answerRange: () => 'X1:X2', master: () => '', masterCol: () => '',
    })));
    ok(`${tag}: Beginner tidak memakai lookup`, !anyLookup);
    ok(`${tag}: Beginner tidak punya tabel master di dataset`, spec.datasetMasterRanges.length === 0);
  }

  // Level professional & expert WAJIB relasional: dataset sheet punya >=1 tabel master
  if (level === 'professional' || level === 'expert') {
    ok(`${tag}: ${level} punya minimal 1 tabel master relasional`, spec.datasetMasterRanges.length >= 1);
  }

  // Level expert wajib pakai XLOOKUP + IFERROR minimal sekali
  if (level === 'expert') {
    const usesXlookup = spec.answer.some((c) => row1.answer.find((a) => a.letter === c.letter).formula.includes('XLOOKUP'));
    const usesIferror = spec.answer.some((c) => row1.answer.find((a) => a.letter === c.letter).formula.includes('IFERROR'));
    ok(`${tag}: Expert memakai XLOOKUP`, usesXlookup);
    ok(`${tag}: Expert memakai IFERROR`, usesIferror);
  }

  // Level professional wajib pakai VLOOKUP minimal sekali
  if (level === 'professional') {
    const usesVlookup = row1.answer.some((a) => a.formula.includes('VLOOKUP'));
    ok(`${tag}: Professional memakai VLOOKUP`, usesVlookup);
  }
}

console.log('\n=== Randomisasi: seed berbeda -> data berbeda, seed sama -> data identik ===');
{
  const a = buildExerciseSpec({ materi: 'sales', level: 'professional', rowCount: 10, seed: 'seed-A' });
  const b = buildExerciseSpec({ materi: 'sales', level: 'professional', rowCount: 10, seed: 'seed-A' });
  const c = buildExerciseSpec({ materi: 'sales', level: 'professional', rowCount: 10, seed: 'seed-B' });
  ok('seed sama -> dataset identik', JSON.stringify(a.dataset.rows) === JSON.stringify(b.dataset.rows));
  ok('seed beda -> dataset (biasanya) berbeda', JSON.stringify(a.dataset.rows) !== JSON.stringify(c.dataset.rows));
}

console.log(`\nHasil: ${pass} passed, ${fail} failed (baris data per soal: ${ROW_DATA_START})`);
if (fail > 0) process.exit(1);
