/**
 * spreadsheet/refshift.js — penyesuaian referensi sel saat rumus disalin (adjustFormulaRefs)
 * (dipecah dari ../spreadsheet-engine.js; perilaku identik)
 */
import { colLetterToIndex, indexToColLetter } from './refs.js';

// ============================================================================
// Penyesuaian referensi rumus (dipakai Fill Handle: menyalin rumus ke sel
// lain sambil menggeser referensi relatif, persis seperti Excel asli)
// ============================================================================

// Cocokkan satu referensi sel TUNGGAL, mis. "A1", "$A1", "A$1", "$A$1".
const SINGLE_REF_TOKEN_RE = /(\$?)([A-Za-z]{1,3})(\$?)(\d+)/g;

/**
 * Geser SATU token referensi sel ("A1", "$A1", dst.) sejumlah rowOffset/colOffset,
 * menghormati tanda '$' (bagian yang diberi '$' tidak digeser — persis seperti
 * referensi absolut/campuran Excel saat rumus disalin ke sel lain).
 * Baris & kolom hasil geser di-clamp ke minimum 1/A agar tidak menghasilkan
 * referensi negatif yang tidak valid jika geseran melebihi batas atas grid.
 */
function shiftSingleRefToken(colDollar, colLetters, rowDollar, rowDigits, rowOffset, colOffset) {
  let colIdx = colLetterToIndex(colLetters);
  let rowNum = parseInt(rowDigits, 10);
  if (colDollar !== '$') colIdx = Math.max(0, colIdx + colOffset);
  if (rowDollar !== '$') rowNum = Math.max(1, rowNum + rowOffset);
  return `${colDollar}${indexToColLetter(colIdx)}${rowDollar}${rowNum}`;
}

/**
 * Jalankan `transform(segment)` HANYA pada bagian rumus di LUAR literal string
 * ("..."), supaya token yang kebetulan terlihat seperti referensi sel di dalam
 * kutip (mis. kriteria SUMIF `"B2"`) tidak ikut digeser.
 */
function mapOutsideQuotes(str, transform) {
  let result = '';
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') {
      if (!inQuotes) {
        result += transform(current);
        current = '';
      }
      inQuotes = !inQuotes;
      result += ch;
      continue;
    }
    if (inQuotes) {
      result += ch;
    } else {
      current += ch;
    }
  }
  result += transform(current);
  return result;
}

/**
 * Geser SELURUH referensi sel/rentang di dalam sebuah rumus sejumlah
 * rowOffset/colOffset (dipakai Fill Handle). Referensi absolut ($A$1) atau
 * campuran ($A1 / A$1) menghormati tanda '$' per-komponen. Literal string
 * ("...") tidak disentuh. Bukan rumus (tidak diawali '=') dikembalikan apa
 * adanya tanpa perubahan.
 * @param {string} formulaStr
 * @param {number} rowOffset jumlah baris yang digeser (boleh negatif)
 * @param {number} colOffset jumlah kolom yang digeser (boleh negatif)
 * @returns {string} rumus baru dengan referensi yang sudah disesuaikan
 */
export function adjustFormulaRefs(formulaStr, rowOffset, colOffset) {
  if (typeof formulaStr !== 'string' || !formulaStr.trim().startsWith('=')) return formulaStr;
  if (rowOffset === 0 && colOffset === 0) return formulaStr;
  return mapOutsideQuotes(formulaStr, (segment) => segment.replace(
    SINGLE_REF_TOKEN_RE,
    (match, colDollar, colLetters, rowDollar, rowDigits) =>
      shiftSingleRefToken(colDollar, colLetters, rowDollar, rowDigits, rowOffset, colOffset),
  ));
}
