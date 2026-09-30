// Pengujian render workbook .xlsx SUNGGUHAN (ExcelJS) untuk engine Exercise
// Generator & Dataset Generator: js/export/exercise-workbook-writer.js.
// Memuat file sebagai <script> biasa (bukan ES module) ke window jsdom,
// persis pola yang sudah dipakai tests/test-workbook-export.mjs untuk
// engine export yang lama.
//
// Jalankan: node tests/test-exercise-workbook.mjs

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelDir = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;
function ok(label, condition) {
  if (condition) { pass += 1; } else { fail += 1; console.log(`FAIL: ${label}`); }
}

/**
 * ExcelJS TIDAK mengembalikan calcProperties saat membaca ulang buffer
 * (keterbatasan reader-nya) walau sudah menuliskannya dengan benar ke XML —
 * jadi untuk memverifikasi fullCalcOnLoad, baca file mentahnya langsung
 * dari xl/workbook.xml di dalam .xlsx (yang notabene adalah file ZIP).
 */
function readWorkbookXml(buffer) {
  const tmpFile = path.join(os.tmpdir(), `check-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
  fs.writeFileSync(tmpFile, Buffer.from(buffer));
  try {
    return execFileSync('unzip', ['-p', tmpFile, 'xl/workbook.xml'], { encoding: 'utf8' });
  } finally {
    fs.unlinkSync(tmpFile);
  }
}


const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'dangerously' });
const { window } = dom;

async function main() {
  const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
  window.ExcelJS = ExcelJS;
  window.eval(fs.readFileSync(path.join(excelDir, 'js/export/exercise-workbook-writer.js'), 'utf8'));
  const { renderExerciseWorkbook, renderDatasetOnlyWorkbook } = window.ExerciseWorkbookExport;

  const { buildExerciseSpec, allCombinations } = await import(path.join(excelDir, 'js/exercise-generator.js'));
  const { EXERCISE_MATERI_GENERATORS } = await import(path.join(excelDir, 'js/dataset-generator.js'));

  console.log('\n=== exercise-workbook-writer: render seluruh kombinasi Level x Materi ===');

  for (const { level, materi } of allCombinations()) {
    const spec = buildExerciseSpec({ materi, level, rowCount: 12, seed: `${materi}-${level}-wb` });
    const buffer = await renderExerciseWorkbook(spec);
    const tag = `${materi}/${level}`;

    ok(`${tag}: buffer tidak kosong`, buffer && buffer.byteLength > 1000);

    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(buffer);

    const names = wb2.worksheets.map((ws) => ws.name);
    ok(`${tag}: tepat 4 sheet`, names.length === 4);
    ok(`${tag}: nama & urutan sheet benar`, JSON.stringify(names) === JSON.stringify(['Lembar latihan', 'dataset', 'kunci jawaban', 'Penjelasan Rumus']));

    wb2.worksheets.forEach((ws) => {
      const hasFreeze = (ws.views || []).some((v) => v.state === 'frozen');
      ok(`${tag}/${ws.name}: tidak ada Freeze Panes`, !hasFreeze);
    });

    const wsLatihan = wb2.getWorksheet('Lembar latihan');
    const wsKunci = wb2.getWorksheet('kunci jawaban');

    // WAJIB: fullCalcOnLoad diset, kalau tidak sel formula bisa tampil
    // kosong/0 di Excel sampai pengguna memaksa recalculate manual.
    // (ExcelJS tidak mengembalikan calcProperties dari reader-nya, jadi
    // cek langsung XML mentahnya.)
    const workbookXml = readWorkbookXml(buffer);
    ok(`${tag}: fullCalcOnLoad="1" ada di xl/workbook.xml (supaya Excel tidak menampilkan sel kosong)`, /fullCalcOnLoad="1"/.test(workbookXml));

    // WAJIB: setiap sel tabel (header, Contoh, data) punya border 4 sisi —
    // tanpa ini tabel terlihat "mengambang" tanpa garis (lihat file contoh).
    const headerCell = wsLatihan.getCell(`${spec.given[0].letter}7`);
    ok(`${tag}: sel header punya border 4 sisi`, !!(headerCell.border && headerCell.border.top && headerCell.border.bottom && headerCell.border.left && headerCell.border.right));
    const dataCell = wsLatihan.getCell(`${spec.given[0].letter}${spec.practiceRows[0].rowNum}`);
    ok(`${tag}: sel data punya border 4 sisi`, !!(dataCell.border && dataCell.border.top && dataCell.border.bottom && dataCell.border.left && dataCell.border.right));
    const contohCell = wsLatihan.getCell(`${spec.given[0].letter}8`);
    ok(`${tag}: sel Contoh punya border 4 sisi`, !!(contohCell.border && contohCell.border.top && contohCell.border.bottom && contohCell.border.left && contohCell.border.right));

    // Ringkasan HARUS di bawah tabel data (bukan di samping header) —
    // supaya tidak tabrakan dengan blok "Soal:" yang juga di bawah tabel.
    if (spec.ringkasanRows.length) {
      const lastDataRow = spec.practiceRows[spec.practiceRows.length - 1].rowNum;
      ok(`${tag}: baris Ringkasan pertama ada di bawah baris data terakhir`, spec.ringkasanRows[0].row > lastDataRow);
    }

    // Kolom jawaban di "Lembar latihan" WAJIB kosong (siswa yang mengisi)
    let anyAnswerFilledInLatihan = false;
    spec.answer.forEach((col) => {
      const cell = wsLatihan.getCell(`${col.letter}${spec.practiceRows[0].rowNum}`);
      if (cell.value !== null && cell.value !== undefined) anyAnswerFilledInLatihan = true;
    });
    ok(`${tag}: sel jawaban di Lembar latihan kosong`, !anyAnswerFilledInLatihan);

    // Kolom jawaban di "kunci jawaban" WAJIB berisi formula (bukan angka statis)
    let allAnswerHaveFormula = true;
    spec.answer.forEach((col) => {
      const cell = wsKunci.getCell(`${col.letter}${spec.practiceRows[0].rowNum}`);
      const isFormula = cell.value && typeof cell.value === 'object' && 'formula' in cell.value;
      if (!isFormula) allAnswerHaveFormula = false;
    });
    ok(`${tag}: sel jawaban di kunci jawaban berisi formula Excel asli`, allAnswerHaveFormula);

    // Kolom "given" di kedua sheet WAJIB berupa formula link ke sheet dataset
    const givenCellLatihan = wsLatihan.getCell(`${spec.given[1].letter}${spec.practiceRows[0].rowNum}`);
    const isLinkFormula = givenCellLatihan.value && typeof givenCellLatihan.value === 'object'
      && typeof givenCellLatihan.value.formula === 'string' && givenCellLatihan.value.formula.includes('dataset');
    ok(`${tag}: kolom given adalah link formula ke sheet dataset`, isLinkFormula);

    // dataset sheet: jumlah baris data harus sama dengan rowCount
    const wsDataset = wb2.getWorksheet('dataset');
    ok(`${tag}: sheet dataset ada`, !!wsDataset);

    // Penjelasan Rumus: header row benar & jumlah baris = penjelasan.length
    const wsPenjelasan = wb2.getWorksheet('Penjelasan Rumus');
    const headerRow = [2, 3, 4, 5].map((c) => wsPenjelasan.getRow(2).getCell(c).value);
    ok(`${tag}: header Penjelasan Rumus = No/Fungsi/Formula/Penjelasan`, JSON.stringify(headerRow) === JSON.stringify(['No', 'Fungsi/Rumus', 'Formula', 'Penjelasan']));
  }

  console.log('\n=== dataset-generator engine: workbook dataset-only, 3 materi x 25/50/100 ===');
  for (const materiKey of Object.keys(EXERCISE_MATERI_GENERATORS)) {
    for (const count of [25, 50, 100]) {
      const gen = EXERCISE_MATERI_GENERATORS[materiKey].generate({ count, seed: `${materiKey}-${count}` });
      const buffer = await renderDatasetOnlyWorkbook(gen, EXERCISE_MATERI_GENERATORS[materiKey].label);
      const wb2 = new ExcelJS.Workbook();
      await wb2.xlsx.load(buffer);
      const tag = `${materiKey}/${count}`;
      ok(`${tag}: 1 sheet "dataset"`, wb2.worksheets.length === 1 && wb2.worksheets[0].name === 'dataset');
      const ws = wb2.worksheets[0];
      // hitung baris terisi pada kolom B mulai baris 7 sampai ditemukan baris kosong
      let n = 0;
      while (ws.getCell(`B${7 + n}`).value !== null && ws.getCell(`B${7 + n}`).value !== undefined) n += 1;
      ok(`${tag}: jumlah baris dataset = ${count}`, n === count);
      const hasFreeze = (ws.views || []).some((v) => v.state === 'frozen');
      ok(`${tag}: tidak ada Freeze Panes`, !hasFreeze);
    }
  }

  console.log(`\nHasil: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
