/**
 * generator-ui.js
 * ---------------------------------------------------------------------------
 * Menghubungkan panel "Generator Workbook (.xlsx)" di index.html ke 2 engine
 * terpisah:
 *   - Dataset Generator (js/dataset-generator.js, EXERCISE_MATERI_GENERATORS)
 *   - Exercise Generator (js/exercise-generator.js + js/export/exercise-workbook-writer.js)
 *
 * File ini HANYA mengurus UI (baca pilihan dropdown, panggil engine, picu
 * download .xlsx) — tidak mengandung logika dataset/soal/formula apa pun,
 * supaya kedua engine tetap 100% independen dari UI (bisa diuji dari Node
 * tanpa browser, lihat tests/test-exercise-generator.mjs).
 * ---------------------------------------------------------------------------
 */
import { EXERCISE_MATERI_GENERATORS } from './dataset-generator.js';
import { buildExerciseSpec } from './exercise-generator.js';

function downloadBuffer(buffer, fileName) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function requireWriter() {
  if (typeof ExcelJS === 'undefined' || typeof window.ExerciseWorkbookExport === 'undefined') {
    alert('Engine export belum siap dimuat. Coba muat ulang halaman (Ctrl+Shift+R).');
    return null;
  }
  return window.ExerciseWorkbookExport;
}

async function onGenerateDataset() {
  const writer = requireWriter();
  if (!writer) return;
  const materi = document.getElementById('egMateri').value;
  const entry = EXERCISE_MATERI_GENERATORS[materi];
  if (!entry) return;

  const btn = document.getElementById('btnGenerateDatasetXlsx');
  btn.disabled = true;
  try {
    const dataset = entry.generate({ count: 30 });
    const buffer = await writer.renderDatasetOnlyWorkbook(dataset, entry.label);
    downloadBuffer(buffer, `dataset-${materi}.xlsx`);
  } catch (err) {
    console.error(err);
    alert('Gagal membuat dataset: ' + (err?.message || 'kesalahan tidak diketahui'));
  } finally {
    btn.disabled = false;
  }
}

async function onGenerateExercise() {
  const writer = requireWriter();
  if (!writer) return;
  const level = document.getElementById('egLevel').value;
  const materi = document.getElementById('egMateri').value;

  const btn = document.getElementById('btnGenerateExerciseXlsx');
  btn.disabled = true;
  try {
    const spec = buildExerciseSpec({ materi, level, rowCount: 15 });
    const buffer = await writer.renderExerciseWorkbook(spec);
    downloadBuffer(buffer, `latihan-excel-${level}-${materi}.xlsx`);
  } catch (err) {
    console.error(err);
    alert('Gagal membuat workbook latihan: ' + (err?.message || 'kesalahan tidak diketahui'));
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('btnGenerateDatasetXlsx')?.addEventListener('click', onGenerateDataset);
document.getElementById('btnGenerateExerciseXlsx')?.addEventListener('click', onGenerateExercise);
