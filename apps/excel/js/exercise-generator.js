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
 *
 * Struktur: js/exercise/common.js (konstanta layout & helper bersama) dan
 * js/exercise/<materi>.js (dataset + kolom tiap materi). File ini = perakit +
 * API publik (daftar export tidak berubah).
 * ---------------------------------------------------------------------------
 */

import { mulberry32, hashSeed } from './dataset-generator.js';
import { ROW_DATA_START, ROW_CONTOH, DATASET_ROW_HEADER, DATASET_ROW_DATA_START, colLetter } from './exercise/common.js';
import { buildSalesDataset, salesColumns } from './exercise/sales.js';
import { buildInventoriDataset, inventoriColumns } from './exercise/inventori.js';
import { buildKaryawanDataset, karyawanColumns } from './exercise/karyawan.js';
import { buildAkuntansiDataset, akuntansiColumns } from './exercise/akuntansi.js';
import { buildAdminPajakDataset, adminPajakColumns } from './exercise/admin-pajak.js';
import { buildFinancialModelingDataset, financialModelingColumns } from './exercise/financial-modeling.js';
import { buildPenggajianDataset, penggajianColumns } from './exercise/penggajian.js';

// API publik lama tetap diekspor dari sini (konstanta layout & colLetter pindah ke exercise/common.js).
export { ROW_TITLE, ROW_NUMBERING, ROW_HEADER, ROW_CONTOH, ROW_DATA_START, DATASET_ROW_HEADER, DATASET_ROW_DATA_START, colLetter } from './exercise/common.js';

const LEVEL_LABELS = { beginner: 'BEGINNER', professional: 'PROFESIONAL', expert: 'EXPERT' };
const MATERI_LABELS = {
  sales: 'SALES', inventori: 'INVENTORI', karyawan: 'KARYAWAN',
  akuntansi: 'AKUNTANSI & PAJAK KORPORAT', 'admin-pajak': 'ADMINISTRASI PERPAJAKAN',
  'financial-modeling': 'FINANCIAL MODELING & PROYEKSI BISNIS',
  penggajian: 'PENGGAJIAN & PPh 21 (TER)',
};

export const LEVELS = ['beginner', 'professional', 'expert'];
export const MATERI_LIST = ['sales', 'inventori', 'karyawan', 'akuntansi', 'admin-pajak', 'financial-modeling', 'penggajian'];

// ---------------------------------------------------------------------------
// Konfigurasi per Materi. Setiap materi menghasilkan (via buildXxxDataset)
// sheet 'dataset' + kolom "given"/"answer" untuk 'Lembar latihan' & 'kunci
// jawaban', dipisah per Level (beginner/professional/expert) sesuai daftar
// fungsi wajib di spesifikasi (Bagian 7/8/9).
// ---------------------------------------------------------------------------

const MATERI_BUILDERS = {
  sales: { buildDataset: buildSalesDataset, buildColumns: salesColumns },
  inventori: { buildDataset: buildInventoriDataset, buildColumns: inventoriColumns },
  karyawan: { buildDataset: buildKaryawanDataset, buildColumns: karyawanColumns },
  akuntansi: { buildDataset: buildAkuntansiDataset, buildColumns: akuntansiColumns },
  'admin-pajak': { buildDataset: buildAdminPajakDataset, buildColumns: adminPajakColumns },
  'financial-modeling': { buildDataset: buildFinancialModelingDataset, buildColumns: financialModelingColumns },
  penggajian: { buildDataset: buildPenggajianDataset, buildColumns: penggajianColumns },
};

// ---------------------------------------------------------------------------
// Perakit generik: menggabungkan dataset + kolom (given/answer/ringkasan/soal)
// menjadi satu ExerciseSpec siap-render.
// ---------------------------------------------------------------------------

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
