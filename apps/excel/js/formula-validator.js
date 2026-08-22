/**
 * formula-validator.js
 * ---------------------------------------------------------------------------
 * Memeriksa jawaban siswa. Prinsip utama (sesuai spesifikasi):
 *   1. TIDAK hanya membandingkan teks rumus.
 *   2. Rumus berbeda tapi hasil & logikanya benar tetap diterima.
 *   3. Terima pemisah argumen ',' atau ';' (sudah ditangani spreadsheet-engine.js).
 *   4. Nama fungsi tidak case-sensitive (sudah ditangani spreadsheet-engine.js).
 *   5. Beri toleransi pembulatan untuk angka desimal.
 *   6. Beri alasan spesifik saat jawaban tidak valid.
 *
 * Tahap 2: hasil rumus kini bisa berupa TEKS (mis. IF/LEFT), bukan cuma angka —
 * perbandingan akhir jadi sadar-tipe. Soal per-baris (IF/LEFT/MONTH/DATEDIF)
 * memakai pemeriksaan referensi PERSIS (question.requiredRefs) alih-alih
 * pemeriksaan "menyentuh kolom" yang dipakai soal agregat Level 1/COUNTIF/SUMIF.
 * ---------------------------------------------------------------------------
 */

import { evaluateFormula, extractFunctionNames, extractReferences, parseRange, parseCellAddress } from './spreadsheet-engine.js';

const NUMERIC_TOLERANCE = 0.5; // toleransi pembulatan rupiah (hasil dibulatkan saat generate dataset)

/**
 * @param {Object} params
 * @param {string} params.rawInput - isi mentah sel jawaban siswa (harus diawali '=')
 * @param {Object} params.grid - grid spreadsheet aktif (dari spreadsheet-engine.js)
 * @param {Object} params.question - objek soal (lihat question-generator.js)
 * @returns {{
 *   status: 'correct'|'incorrect',
 *   message: string,
 *   userValue: number|string|null,
 *   expectedValue: number|string,
 *   usedFunctions: string[],
 * }}
 */
export function validateAnswer({ rawInput, grid, question }) {
  const input = (rawInput || '').trim();

  if (input === '') {
    return {
      status: 'incorrect',
      message: 'Sel jawaban masih kosong. Tulis rumus pada sel jawaban, diawali dengan tanda "=".',
      userValue: null,
      expectedValue: question.expectedValue,
      usedFunctions: [],
    };
  }

  if (!input.startsWith('=')) {
    return {
      status: 'incorrect',
      message: 'Jawaban harus berupa RUMUS, bukan angka/teks biasa. Mulai dengan tanda "=", misalnya =SUM(...).',
      userValue: null,
      expectedValue: question.expectedValue,
      usedFunctions: [],
    };
  }

  const usedFunctions = extractFunctionNames(input);
  const references = extractReferences(input);

  if (references.length === 0) {
    return {
      status: 'incorrect',
      message: 'Rumus belum mengacu ke sel/rentang data mana pun. Gunakan referensi sel seperti H2:H26, bukan nilai yang diketik manual.',
      userValue: null,
      expectedValue: question.expectedValue,
      usedFunctions,
    };
  }

  const acceptedSet = new Set((question.acceptedFunctions || []).map((f) => f.toUpperCase()));
  const usesAcceptedFunction = usedFunctions.some((f) => acceptedSet.has(f));
  if (!usesAcceptedFunction) {
    return {
      status: 'incorrect',
      message: `Fungsi yang dipakai (${usedFunctions.join(', ') || 'tidak dikenali'}) belum sesuai untuk soal ini. Fungsi yang diharapkan salah satunya: ${question.acceptedFunctions.join(', ')}.`,
      userValue: null,
      expectedValue: question.expectedValue,
      usedFunctions,
    };
  }

  const result = evaluateFormula(input, grid);
  if (result.error) {
    return {
      status: 'incorrect',
      message: `Rumus tidak dapat dihitung: ${result.error}`,
      userValue: null,
      expectedValue: question.expectedValue,
      usedFunctions,
    };
  }

  // Periksa apakah referensi yang dipakai benar-benar mengacu ke sel/kolom yang relevan
  // dengan soal (mencegah kebetulan hasil cocok padahal referensi salah total).
  if (Array.isArray(question.requiredRefs) && question.requiredRefs.length > 0) {
    const missing = question.requiredRefs.filter((addr) => !referencesIncludeCell(references, addr));
    if (missing.length > 0) {
      return {
        status: 'incorrect',
        message: `Rumus belum mengacu ke sel yang tepat (${missing.join(', ')}) sesuai soal. Periksa kembali referensi sel yang digunakan.`,
        userValue: result.value,
        expectedValue: question.expectedValue,
        usedFunctions,
      };
    }
  } else if (question.expectedColIndex !== undefined) {
    const touchesExpectedColumn = referencesTouchColumn(references, question.expectedColIndex);
    if (!touchesExpectedColumn) {
      return {
        status: 'incorrect',
        message: `Rumus dihitung dari kolom yang tampaknya bukan "${question.expectedColumnLabel}". Periksa kembali rentang sel yang dirujuk.`,
        userValue: result.value,
        expectedValue: question.expectedValue,
        usedFunctions,
      };
    }
  }

  const userValue = result.value;
  const isTextComparison = typeof question.expectedValue === 'string' || typeof userValue === 'string';

  const isMatch = isTextComparison
    ? String(userValue ?? '').trim().toLowerCase() === String(question.expectedValue ?? '').trim().toLowerCase()
    : Number.isFinite(Math.abs((userValue ?? NaN) - question.expectedValue)) &&
      Math.abs((userValue ?? NaN) - question.expectedValue) <= NUMERIC_TOLERANCE;

  if (isMatch) {
    return {
      status: 'correct',
      message: 'Jawaban benar! Hasil dan penggunaan rumus sudah tepat.',
      userValue,
      expectedValue: question.expectedValue,
      usedFunctions,
    };
  }

  return {
    status: 'incorrect',
    message: `Fungsi dan referensi sudah pada arah yang benar, tetapi hasilnya (${formatAny(userValue)}) belum sama dengan yang diharapkan (${formatAny(question.expectedValue)}). Periksa kembali logika/rentang rumus.`,
    userValue,
    expectedValue: question.expectedValue,
    usedFunctions,
  };
}

/** True jika salah satu referensi yang dipakai mencakup kolom target soal. */
function referencesTouchColumn(references, expectedColIndex) {
  for (const ref of references) {
    const cells = parseRange(ref);
    if (!cells) continue;
    if (cells.some((c) => c.col === expectedColIndex)) return true;
  }
  return false;
}

/** True jika salah satu referensi (sel tunggal atau rentang) yang dipakai mencakup alamat sel tertentu. */
function referencesIncludeCell(references, targetAddr) {
  const target = parseCellAddress(targetAddr);
  if (!target) return false;
  for (const ref of references) {
    const cells = parseRange(ref);
    if (!cells) continue;
    if (cells.some((c) => c.col === target.col && c.row === target.row)) return true;
  }
  return false;
}

function formatAny(v) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '-';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v);
  }
  return String(v);
}
