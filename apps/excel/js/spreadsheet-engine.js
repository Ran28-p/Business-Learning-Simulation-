/**
 * spreadsheet-engine.js
 * ---------------------------------------------------------------------------
 * Model data spreadsheet + evaluator rumus. TIDAK menyentuh DOM sama sekali —
 * supaya bisa dipakai ulang oleh formula-validator.js (untuk memeriksa
 * jawaban) maupun app.js (untuk menampilkan grid). Ini menghindari duplikasi
 * logika parsing rumus di dua tempat berbeda.
 *
 * Tahap 1 mendukung fungsi agregasi Level 1: SUM, AVERAGE, MIN, MAX, COUNT.
 * Tahap 2 menambahkan:
 *   - Logika: IF, AND, OR, NOT, IFERROR
 *   - Agregasi bersyarat: COUNTIF, SUMIF
 *   - Teks: LEFT, RIGHT, MID, LEN, TRIM, LOWER, UPPER, PROPER, CONCAT, FIND, SEARCH, SUBSTITUTE
 *   - Tanggal: TODAY, DATE, YEAR, MONTH, DAY, WEEKDAY, DATEDIF, EOMONTH
 * Fungsi Level 1 (agregasi atas rentang) TIDAK diubah sama sekali agar
 * jawaban yang sudah benar pada Tahap 1 tetap benar.
 * ---------------------------------------------------------------------------
 *
 * Struktur: spreadsheet/refs.js (alamat sel & rentang), dates.js (serial tanggal, DATEDIF), syntax.js (parsing sintaks rumus),
 * compare.js (operator & kriteria perbandingan), refshift.js (geser referensi). Evaluator rekursif tetap di file ini;
 * daftar export tidak berubah.
 */

import { parseRange, cellAddress, parseCellAddress } from './spreadsheet/refs.js';
import { isQuotedString, unquote, isNumericLiteral, isFunctionCallSyntax, FUNCTION_CALL_SYNTAX_RE, splitArgs, FORMULA_CALL_RE } from './spreadsheet/syntax.js';
import { findTopLevelOperator, compareValues, matchCriteria } from './spreadsheet/compare.js';
import { dateToSerial, serialToDate, computeDatedif } from './spreadsheet/dates.js';

// API publik lama tetap diekspor dari sini (isi dipindah ke ./spreadsheet/).
export { indexToColLetter, colLetterToIndex, parseCellAddress, parseRange, cellAddress } from './spreadsheet/refs.js';
export { dateToSerial, serialToDate } from './spreadsheet/dates.js';
export { adjustFormulaRefs } from './spreadsheet/refshift.js';

// ============================================================================
// Model grid
// ============================================================================

/**
 * Membuat grid kosong berukuran rowCount x colCount.
 * Setiap sel disimpan sebagai objek { raw, readonly } di dalam Map beralamat "A1".
 */
export function createGrid(rowCount, colCount) {
  return {
    rowCount,
    colCount,
    cells: new Map(), // key: "A1" -> { raw: string|number, readonly?: boolean }
  };
}

/** Set nilai mentah (raw) sebuah sel. raw berupa string (termasuk untuk rumus, harus diawali '='). */
export function setCellRaw(grid, addr, raw, opts = {}) {
  const existing = grid.cells.get(addr);
  if (existing && existing.readonly && !opts.force) return false;
  grid.cells.set(addr, { raw, readonly: !!opts.readonly });
  return true;
}

/**
 * Tumpukan alamat sel yang SEDANG dievaluasi (module-level, disengaja bukan
 * per-panggilan) — dipakai getCellValue() untuk mendeteksi RUMUS BERANTAI
 * MELINGKAR (mis. A1="=SUM(B1)" dan B1="=SUM(A1)"). Tahap Interaktivitas
 * Excel Nyata mengizinkan rumus di sel mana pun saling merujuk (lewat fill
 * handle & pengetikan bebas), jadi kemungkinan siklus jadi nyata dan harus
 * dicegah agar tidak menyebabkan rekursi tak berhingga / browser hang.
 * Aman dipakai module-level (bukan diteruskan sebagai parameter ke semua
 * fungsi evaluator) karena JS di sini selalu sinkron & single-threaded —
 * tidak ada evaluasi paralel yang bisa saling mengotori stack ini.
 */
const evaluatingCells = new Set();

/**
 * Ambil NILAI TERHITUNG sebuah sel (string/number biasa apa adanya,
 * atau hasil evaluasi rumus jika raw diawali '=').
 * Rekursif terhadap rumus di sel lain (rumus boleh merujuk sel lain yang
 * juga berisi rumus), dengan penjagaan referensi melingkar: jika sebuah
 * alamat sel ditemui lagi selagi masih dalam proses evaluasinya sendiri,
 * fungsi ini langsung mengembalikan null alih-alih memanggil ulang
 * evaluateFormula (yang akan menyebabkan rekursi tak berhingga).
 */
export function getCellValue(grid, addr) {
  const cell = grid.cells.get(addr);
  if (!cell || cell.raw === '' || cell.raw === undefined || cell.raw === null) return null;
  if (typeof cell.raw === 'string' && cell.raw.trim().startsWith('=')) {
    if (evaluatingCells.has(addr)) return null; // referensi melingkar terdeteksi — hentikan rekursi
    evaluatingCells.add(addr);
    try {
      const result = evaluateFormula(cell.raw, grid);
      return result.error ? null : result.value;
    } finally {
      evaluatingCells.delete(addr);
    }
  }
  return cell.raw;
}

/** True jika nilai sel adalah angka murni (dipakai fungsi agregasi seperti Excel asli). */
function isNumericValue(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Kumpulkan seluruh nilai numerik dari daftar argumen referensi (rentang/sel). */
function collectNumericValues(grid, argRefs) {
  const values = [];
  const invalidRefs = [];
  for (const ref of argRefs) {
    const cells = parseRange(ref);
    if (!cells) {
      invalidRefs.push(ref);
      continue;
    }
    for (const { col, row } of cells) {
      const addr = cellAddress(col, row);
      const val = getCellValue(grid, addr);
      if (isNumericValue(val)) values.push(val);
    }
  }
  return { values, invalidRefs };
}

/** Kumpulkan seluruh sel TERISI (angka maupun teks) dari daftar argumen referensi — dipakai COUNTA. */
function collectAnyValues(grid, argRefs) {
  const values = [];
  const invalidRefs = [];
  for (const ref of argRefs) {
    const cells = parseRange(ref);
    if (!cells) {
      invalidRefs.push(ref);
      continue;
    }
    for (const { col, row } of cells) {
      const addr = cellAddress(col, row);
      const val = getCellValue(grid, addr);
      if (val !== null && val !== undefined && val !== '') values.push(val);
    }
  }
  return { values, invalidRefs };
}

/**
 * Definisi fungsi agregasi Level 1. Menambah fungsi agregasi baru cukup
 * menambah entri baru di objek ini (compute menerima array angka valid).
 */
export const FORMULA_FUNCTIONS = {
  SUM: {
    minArgs: 1,
    compute: (values) => values.reduce((a, b) => a + b, 0),
  },
  AVERAGE: {
    minArgs: 1,
    compute: (values) => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length),
  },
  MIN: {
    minArgs: 1,
    compute: (values) => (values.length === 0 ? 0 : Math.min(...values)),
  },
  MAX: {
    minArgs: 1,
    compute: (values) => (values.length === 0 ? 0 : Math.max(...values)),
  },
  COUNT: {
    minArgs: 1,
    compute: (values) => values.length,
  },
};

const AGGREGATE_FUNCTION_NAMES = new Set(Object.keys(FORMULA_FUNCTIONS));

// Fungsi agregasi "apa saja terisi" — berbeda dari AGGREGATE_FUNCTION_NAMES karena tidak
// memfilter hanya nilai numerik (COUNTA menghitung teks juga).
const ANY_VALUE_AGGREGATE_FUNCTION_NAMES = new Set(['COUNTA']);

const CONDITIONAL_AGGREGATE_FUNCTION_NAMES = new Set(['COUNTIF', 'SUMIF', 'COUNTIFS', 'SUMIFS', 'AVERAGEIF', 'AVERAGEIFS']);

const SCALAR_FUNCTION_NAMES = new Set([
  'IF', 'IFS', 'AND', 'OR', 'NOT', 'IFERROR', 'ROUND',
  'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'LOWER', 'UPPER', 'PROPER', 'CONCAT', 'FIND', 'SEARCH', 'SUBSTITUTE',
  'TODAY', 'DATE', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'DATEDIF', 'EOMONTH',
  'MATCH', 'INDEX', 'VLOOKUP', 'HLOOKUP', 'XLOOKUP'
]);

// ----------------------------------------------------------------------------
// Mesin ekspresi (dipakai oleh fungsi Tahap 2: IF/AND/OR/NOT, argumen fungsi
// teks & tanggal). Terpisah dari collectNumericValues() di atas karena
// argumen di sini bisa berupa literal teks/angka, referensi sel TUNGGAL,
// pemanggilan fungsi bersarang, atau ekspresi perbandingan (H2>5) — bukan
// sekadar rentang angka untuk dijumlahkan/dirata-rata.
// ----------------------------------------------------------------------------

/**
 * Selesaikan satu ekspresi menjadi NILAI SKALAR (angka atau teks).
 * Menangani: literal string "...", literal angka, pemanggilan fungsi
 * bersarang (mis. LEFT(D2,3)), atau referensi satu sel.
 * @returns {{value: number|string|null, error: string|null}}
 */
export function evaluateExpression(exprStr, grid) {
  const s = (exprStr ?? '').trim();
  if (s === '') return { value: null, error: null };

  if (isQuotedString(s)) return { value: unquote(s), error: null };
  if (isNumericLiteral(s)) return { value: Number(s), error: null };

  if (isFunctionCallSyntax(s)) {
    const m = FUNCTION_CALL_SYNTAX_RE.exec(s);
    const fnName = m[1].toUpperCase();
    const args = splitArgs(m[2]);
    if (fnName === 'AND' || fnName === 'OR' || fnName === 'NOT') {
      // AND/OR/NOT menghasilkan boolean; jika dipakai sebagai NILAI (bukan kondisi),
      // wakili sebagai teks "BENAR"/"SALAH" seperti tampilan asli Excel.
      const r = evaluateLogicalCall(fnName, args, grid);
      if (r.error) return { value: null, error: r.error };
      return { value: r.value ? 'BENAR' : 'SALAH', error: null };
    }
    return evaluateCall(fnName, args, grid);
  }

  const parsedAddr = parseCellAddress(s);
  if (parsedAddr) {
    const val = getCellValue(grid, cellAddress(parsedAddr.col, parsedAddr.row));
    return { value: val, error: null };
  }

  return { value: null, error: `Tidak dapat menafsirkan argumen "${exprStr}".` };
}

/** Ambil `.value` dari evaluateExpression, mengabaikan error (dipakai argumen sekunder seperti panjang karakter). */
function resolveArgValue(argStr, grid) {
  if (argStr === undefined) return undefined;
  return evaluateExpression(argStr, grid).value;
}

/**
 * Selesaikan satu ekspresi menjadi BOOLEAN — dipakai untuk kondisi IF dan argumen AND/OR/NOT.
 * Menangani ekspresi perbandingan (H2>5, F2="Jawa Barat") dan pemanggilan AND/OR/NOT bersarang.
 * @returns {{value: boolean|null, error: string|null}}
 */
export function evaluateCondition(exprStr, grid) {
  const s = (exprStr ?? '').trim();

  // Literal boolean murni (dipakai mis. sebagai kondisi "catch-all" terakhir pada IFS).
  const upperLiteral = s.toUpperCase();
  if (upperLiteral === 'TRUE') return { value: true, error: null };
  if (upperLiteral === 'FALSE') return { value: false, error: null };

  if (isFunctionCallSyntax(s)) {
    const m = FUNCTION_CALL_SYNTAX_RE.exec(s);
    const fnName = m[1].toUpperCase();
    if (fnName === 'AND' || fnName === 'OR' || fnName === 'NOT') {
      const args = splitArgs(m[2]);
      return evaluateLogicalCall(fnName, args, grid);
    }
    // bukan AND/OR/NOT (mis. fungsi teks di sisi kiri perbandingan) -> lanjut ke pencarian operator di bawah
  }

  const found = findTopLevelOperator(s);
  if (found) {
    const left = evaluateExpression(s.slice(0, found.index), grid);
    if (left.error) return { value: null, error: left.error };
    const right = evaluateExpression(s.slice(found.index + found.operator.length), grid);
    if (right.error) return { value: null, error: right.error };
    return { value: compareValues(left.value, right.value, found.operator), error: null };
  }

  // Tidak ada operator perbandingan -> anggap sebagai nilai lalu uji "kebenarannya" (truthy)
  const resolved = evaluateExpression(s, grid);
  if (resolved.error) return { value: null, error: resolved.error };
  const truthy = typeof resolved.value === 'number' ? resolved.value !== 0 : !!resolved.value;
  return { value: truthy, error: null };
}

function evaluateLogicalCall(fnName, args, grid) {
  if (fnName === 'NOT') {
    if (args.length < 1) return { value: null, error: 'NOT membutuhkan 1 argumen.' };
    const r = evaluateCondition(args[0], grid);
    if (r.error) return r;
    return { value: !r.value, error: null };
  }
  const results = [];
  for (const a of args) {
    const r = evaluateCondition(a, grid);
    if (r.error) return r;
    results.push(r.value);
  }
  if (fnName === 'AND') return { value: results.length > 0 && results.every(Boolean), error: null };
  return { value: results.some(Boolean), error: null }; // OR
}

/**
 * Dispatcher untuk fungsi SKALAR (logika, teks, tanggal). Dipanggil dari
 * evaluateFormula() di level atas maupun secara rekursif dari evaluateExpression()
 * untuk pemanggilan fungsi bersarang.
 * @returns {{value: number|string|null, error: string|null}}
 */
export function evaluateCall(fnName, args, grid) {
  switch (fnName) {
    case 'IF': {
      if (args.length < 2) return { value: null, error: 'IF membutuhkan minimal 2 argumen (kondisi, nilai jika benar).' };
      const cond = evaluateCondition(args[0], grid);
      if (cond.error) return { value: null, error: cond.error };
      const branchArg = cond.value ? args[1] : args[2];
      if (branchArg === undefined) return { value: '', error: null };
      return evaluateExpression(branchArg, grid);
    }
    case 'AND':
    case 'OR':
    case 'NOT': {
      const r = evaluateLogicalCall(fnName, args, grid);
      if (r.error) return r;
      return { value: r.value ? 'BENAR' : 'SALAH', error: null };
    }
    case 'IFERROR': {
      if (args.length < 2) return { value: null, error: 'IFERROR membutuhkan 2 argumen.' };
      const primary = evaluateExpression(args[0], grid);
      return primary.error ? evaluateExpression(args[1], grid) : primary;
    }

    // --- Teks ---
    case 'LEFT': {
      const text = String(resolveArgValue(args[0], grid) ?? '');
      const n = args[1] !== undefined ? Number(resolveArgValue(args[1], grid)) : 1;
      return { value: text.slice(0, n), error: null };
    }
    case 'RIGHT': {
      const text = String(resolveArgValue(args[0], grid) ?? '');
      const n = args[1] !== undefined ? Number(resolveArgValue(args[1], grid)) : 1;
      return { value: text.slice(Math.max(0, text.length - n)), error: null };
    }
    case 'MID': {
      if (args.length < 3) return { value: null, error: 'MID membutuhkan 3 argumen (teks, mulai, jumlah_karakter).' };
      const text = String(resolveArgValue(args[0], grid) ?? '');
      const start = Number(resolveArgValue(args[1], grid));
      const len = Number(resolveArgValue(args[2], grid));
      return { value: text.slice(start - 1, start - 1 + len), error: null };
    }
    case 'LEN':
      return { value: String(resolveArgValue(args[0], grid) ?? '').length, error: null };
    case 'TRIM':
      return { value: String(resolveArgValue(args[0], grid) ?? '').replace(/\s+/g, ' ').trim(), error: null };
    case 'LOWER':
      return { value: String(resolveArgValue(args[0], grid) ?? '').toLowerCase(), error: null };
    case 'UPPER':
      return { value: String(resolveArgValue(args[0], grid) ?? '').toUpperCase(), error: null };
    case 'PROPER':
      return {
        value: String(resolveArgValue(args[0], grid) ?? '').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
        error: null,
      };
    case 'CONCAT':
      return { value: args.map((a) => String(resolveArgValue(a, grid) ?? '')).join(''), error: null };
    case 'FIND': {
      if (args.length < 2) return { value: null, error: 'FIND membutuhkan minimal 2 argumen.' };
      const findText = String(resolveArgValue(args[0], grid) ?? '');
      const withinText = String(resolveArgValue(args[1], grid) ?? '');
      const start = args[2] !== undefined ? Number(resolveArgValue(args[2], grid)) : 1;
      const idx = withinText.indexOf(findText, Math.max(0, start - 1));
      if (idx === -1) return { value: null, error: `FIND: teks "${findText}" tidak ditemukan.` };
      return { value: idx + 1, error: null };
    }
    case 'SEARCH': {
      if (args.length < 2) return { value: null, error: 'SEARCH membutuhkan minimal 2 argumen.' };
      const findText = String(resolveArgValue(args[0], grid) ?? '').toLowerCase();
      const withinText = String(resolveArgValue(args[1], grid) ?? '').toLowerCase();
      const start = args[2] !== undefined ? Number(resolveArgValue(args[2], grid)) : 1;
      const idx = withinText.indexOf(findText, Math.max(0, start - 1));
      if (idx === -1) return { value: null, error: `SEARCH: teks "${findText}" tidak ditemukan.` };
      return { value: idx + 1, error: null };
    }
    case 'SUBSTITUTE': {
      if (args.length < 3) return { value: null, error: 'SUBSTITUTE membutuhkan minimal 3 argumen.' };
      const text = String(resolveArgValue(args[0], grid) ?? '');
      const oldText = String(resolveArgValue(args[1], grid) ?? '');
      const newText = String(resolveArgValue(args[2], grid) ?? '');
      if (!oldText) return { value: text, error: null };
      if (args[3] !== undefined) {
        const instance = Number(resolveArgValue(args[3], grid));
        let count = 0;
        let result = '';
        let i = 0;
        while (i < text.length) {
          if (text.startsWith(oldText, i)) {
            count++;
            if (count === instance) {
              result += newText;
              i += oldText.length;
              continue;
            }
          }
          result += text[i];
          i++;
        }
        return { value: result, error: null };
      }
      return { value: text.split(oldText).join(newText), error: null };
    }

    // --- Tanggal ---
    case 'TODAY':
      return { value: dateToSerial(new Date()), error: null };
    case 'DATE': {
      if (args.length < 3) return { value: null, error: 'DATE membutuhkan 3 argumen (tahun, bulan, tanggal).' };
      const y = Number(resolveArgValue(args[0], grid));
      const mo = Number(resolveArgValue(args[1], grid));
      const d = Number(resolveArgValue(args[2], grid));
      return { value: dateToSerial(new Date(Date.UTC(y, mo - 1, d))), error: null };
    }
    case 'YEAR':
    case 'MONTH':
    case 'DAY':
    case 'WEEKDAY': {
      if (args.length < 1) return { value: null, error: `${fnName} membutuhkan 1 argumen tanggal.` };
      const serial = Number(resolveArgValue(args[0], grid));
      if (!Number.isFinite(serial)) return { value: null, error: `${fnName}: nilai tanggal tidak valid.` };
      const d = serialToDate(serial);
      if (fnName === 'YEAR') return { value: d.getUTCFullYear(), error: null };
      if (fnName === 'MONTH') return { value: d.getUTCMonth() + 1, error: null };
      if (fnName === 'DAY') return { value: d.getUTCDate(), error: null };
      return { value: d.getUTCDay() + 1, error: null }; // WEEKDAY tipe 1: 1=Minggu ... 7=Sabtu
    }
    case 'DATEDIF': {
      if (args.length < 3) return { value: null, error: 'DATEDIF membutuhkan 3 argumen (tanggal_mulai, tanggal_akhir, "Y"/"M"/"D").' };
      const startSerial = Number(resolveArgValue(args[0], grid));
      const endSerial = Number(resolveArgValue(args[1], grid));
      const unitRaw = resolveArgValue(args[2], grid);
      const unit = String(unitRaw ?? '').toUpperCase();
      if (!['Y', 'M', 'D'].includes(unit)) return { value: null, error: 'DATEDIF: satuan harus "Y", "M", atau "D".' };
      if (endSerial < startSerial) return { value: null, error: 'DATEDIF: tanggal akhir tidak boleh sebelum tanggal mulai.' };
      return { value: computeDatedif(startSerial, endSerial, unit), error: null };
    }
    case 'EOMONTH': {
      if (args.length < 2) return { value: null, error: 'EOMONTH membutuhkan 2 argumen (tanggal_mulai, jumlah_bulan).' };
      const startSerial = Number(resolveArgValue(args[0], grid));
      const monthsOffset = Number(resolveArgValue(args[1], grid));
      const d = serialToDate(startSerial);
      const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthsOffset + 1, 0));
      return { value: dateToSerial(target), error: null };
    }
    
    // --- Lookup & Indexing (Level 3) ---
    case 'MATCH': {
      if (args.length < 2) return { value: null, error: 'MATCH membutuhkan minimal 2 argumen (lookup_value, lookup_array).' };
      const lookup = evaluateExpression(args[0], grid);
      if (lookup.error) return { value: null, error: lookup.error };
      const cells = parseRange(args[1]);
      if (!cells) return { value: null, error: `Referensi rentang tidak valid: ${args[1]}` };
      const matchType = args[2] !== undefined ? Number(resolveArgValue(args[2], grid)) : 0;
      // Exact match (0)
      if (matchType === 0) {
        for (let i = 0; i < cells.length; i++) {
          const val = getCellValue(grid, cellAddress(cells[i].col, cells[i].row));
          if (compareValues(val, lookup.value, '=')) return { value: i + 1, error: null };
        }
        return { value: null, error: 'MATCH: tidak ditemukan.' };
      }
      // Approximate match: only meaningful for numeric lookup, implement simple behavior
      if (matchType === 1) {
        let bestIdx = -1; let bestVal = -Infinity;
        for (let i = 0; i < cells.length; i++) {
          const val = getCellValue(grid, cellAddress(cells[i].col, cells[i].row));
          if (typeof val === 'number' && val <= lookup.value && val > bestVal) { bestVal = val; bestIdx = i; }
        }
        if (bestIdx >= 0) return { value: bestIdx + 1, error: null };
        return { value: null, error: 'MATCH: tidak ditemukan (approximate).' };
      }
      if (matchType === -1) {
        let bestIdx = -1; let bestVal = Infinity;
        for (let i = 0; i < cells.length; i++) {
          const val = getCellValue(grid, cellAddress(cells[i].col, cells[i].row));
          if (typeof val === 'number' && val >= lookup.value && val < bestVal) { bestVal = val; bestIdx = i; }
        }
        if (bestIdx >= 0) return { value: bestIdx + 1, error: null };
        return { value: null, error: 'MATCH: tidak ditemukan (approximate).' };
      }
      return { value: null, error: 'MATCH: match_type harus 1,0,atau -1.' };
    }

    case 'INDEX': {
      if (args.length < 2) return { value: null, error: 'INDEX membutuhkan minimal 2 argumen (array, row_num, [col_num]).' };
      const arrRef = args[0];
      const arrCells = parseRange(arrRef);
      if (!arrCells) return { value: null, error: `Referensi rentang tidak valid: ${arrRef}` };
      // determine rectangle bounds
      let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
      for (const cell of arrCells) {
        minR = Math.min(minR, cell.row);
        maxR = Math.max(maxR, cell.row);
        minC = Math.min(minC, cell.col);
        maxC = Math.max(maxC, cell.col);
      }
      const rows = maxR - minR + 1;
      const cols = maxC - minC + 1;
      const rowNum = Number(resolveArgValue(args[1], grid));
      const colNum = args[2] !== undefined ? Number(resolveArgValue(args[2], grid)) : 1;
      if (!Number.isFinite(rowNum) || rowNum < 1 || rowNum > rows) return { value: null, error: 'INDEX: row_num out of bounds.' };
      if (!Number.isFinite(colNum) || colNum < 1 || colNum > cols) return { value: null, error: 'INDEX: col_num out of bounds.' };
      const targetRow = minR + (rowNum - 1);
      const targetCol = minC + (colNum - 1);
      return { value: getCellValue(grid, cellAddress(targetCol, targetRow)), error: null };
    }

    case 'VLOOKUP': {
      if (args.length < 3) return { value: null, error: 'VLOOKUP membutuhkan minimal 3 argumen (lookup_value, table_array, col_index, [range_lookup]).' };
      const lookup = evaluateExpression(args[0], grid);
      if (lookup.error) return { value: null, error: lookup.error };
      const tableRef = args[1];
      const table = parseRange(tableRef);
      if (!table) return { value: null, error: `Referensi tabel tidak valid: ${tableRef}` };
      // compute bounds
      let minR2 = Infinity, maxR2 = -Infinity, minC2 = Infinity, maxC2 = -Infinity;
      for (const cell of table) {
        minR2 = Math.min(minR2, cell.row);
        maxR2 = Math.max(maxR2, cell.row);
        minC2 = Math.min(minC2, cell.col);
        maxC2 = Math.max(maxC2, cell.col);
      }
      const tableRows = maxR2 - minR2 + 1;
      const tableCols = maxC2 - minC2 + 1;
      const colIndex = Number(resolveArgValue(args[2], grid));
      if (!Number.isFinite(colIndex) || colIndex < 1 || colIndex > tableCols) return { value: null, error: 'VLOOKUP: col_index out of bounds.' };
      const rangeLookupRaw = args[3] !== undefined ? resolveArgValue(args[3], grid) : true;
      const exactOnly = rangeLookupRaw === false || String(rangeLookupRaw).toUpperCase() === 'FALSE' || Number(rangeLookupRaw) === 0;
      // iterate rows, find match in first column of table
      let foundRow = -1;
      for (let r = 0; r < tableRows; r++) {
        const cellAddr = cellAddress(minC2, minR2 + r);
        const val = getCellValue(grid, cellAddr);
        if (exactOnly) {
          if (compareValues(val, lookup.value, '=')) { foundRow = r; break; }
        } else {
          // approximate: numeric only, find largest value <= lookup
          if (typeof val === 'number' && typeof lookup.value === 'number') {
            if (foundRow === -1) { if (val <= lookup.value) foundRow = r; }
            else {
              const current = getCellValue(grid, cellAddress(minC2, minR2 + foundRow));
              if (val <= lookup.value && val > current) foundRow = r;
            }
          } else if (compareValues(val, lookup.value, '=')) { foundRow = r; break; }
        }
      }
      if (foundRow === -1) return { value: null, error: 'VLOOKUP: tidak ditemukan.' };
      const targetAddr = cellAddress(minC2 + (colIndex - 1), minR2 + foundRow);
      return { value: getCellValue(grid, targetAddr), error: null };
    }

    case 'HLOOKUP': {
      // Padanan horizontal dari VLOOKUP: kunci dicari pada BARIS PERTAMA tabel,
      // nilai hasil diambil dari baris ke-`row_index` pada kolom yang sama.
      if (args.length < 3) return { value: null, error: 'HLOOKUP membutuhkan minimal 3 argumen (lookup_value, table_array, row_index, [range_lookup]).' };
      const lookup = evaluateExpression(args[0], grid);
      if (lookup.error) return { value: null, error: lookup.error };
      const tableRef = args[1];
      const table = parseRange(tableRef);
      if (!table) return { value: null, error: `Referensi tabel tidak valid: ${tableRef}` };
      let minR3 = Infinity, maxR3 = -Infinity, minC3 = Infinity, maxC3 = -Infinity;
      for (const cell of table) {
        minR3 = Math.min(minR3, cell.row);
        maxR3 = Math.max(maxR3, cell.row);
        minC3 = Math.min(minC3, cell.col);
        maxC3 = Math.max(maxC3, cell.col);
      }
      const tableRows = maxR3 - minR3 + 1;
      const tableCols = maxC3 - minC3 + 1;
      const rowIndex = Number(resolveArgValue(args[2], grid));
      if (!Number.isFinite(rowIndex) || rowIndex < 1 || rowIndex > tableRows) return { value: null, error: 'HLOOKUP: row_index out of bounds.' };
      const rangeLookupRaw3 = args[3] !== undefined ? resolveArgValue(args[3], grid) : true;
      const exactOnly3 = rangeLookupRaw3 === false || String(rangeLookupRaw3).toUpperCase() === 'FALSE' || Number(rangeLookupRaw3) === 0;
      let foundCol = -1;
      for (let c = 0; c < tableCols; c++) {
        const cellAddr = cellAddress(minC3 + c, minR3);
        const val = getCellValue(grid, cellAddr);
        if (exactOnly3) {
          if (compareValues(val, lookup.value, '=')) { foundCol = c; break; }
        } else {
          if (typeof val === 'number' && typeof lookup.value === 'number') {
            if (foundCol === -1) { if (val <= lookup.value) foundCol = c; }
            else {
              const current = getCellValue(grid, cellAddress(minC3 + foundCol, minR3));
              if (val <= lookup.value && val > current) foundCol = c;
            }
          } else if (compareValues(val, lookup.value, '=')) { foundCol = c; break; }
        }
      }
      if (foundCol === -1) return { value: null, error: 'HLOOKUP: tidak ditemukan.' };
      const targetAddr3 = cellAddress(minC3 + foundCol, minR3 + (rowIndex - 1));
      return { value: getCellValue(grid, targetAddr3), error: null };
    }

    case 'XLOOKUP': {
      // XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found]) — exact match.
      if (args.length < 3) return { value: null, error: 'XLOOKUP membutuhkan minimal 3 argumen (lookup_value, lookup_array, return_array, [if_not_found]).' };
      const lookup = evaluateExpression(args[0], grid);
      if (lookup.error) return { value: null, error: lookup.error };
      const lookupCells = parseRange(args[1]);
      if (!lookupCells) return { value: null, error: `Referensi lookup_array tidak valid: ${args[1]}` };
      const returnCells = parseRange(args[2]);
      if (!returnCells) return { value: null, error: `Referensi return_array tidak valid: ${args[2]}` };
      if (lookupCells.length !== returnCells.length) return { value: null, error: 'XLOOKUP: lookup_array dan return_array harus berukuran sama.' };
      let foundIdx = -1;
      for (let i = 0; i < lookupCells.length; i++) {
        const val = getCellValue(grid, cellAddress(lookupCells[i].col, lookupCells[i].row));
        if (compareValues(val, lookup.value, '=')) { foundIdx = i; break; }
      }
      if (foundIdx === -1) {
        if (args[3] !== undefined) return evaluateExpression(args[3], grid);
        return { value: null, error: 'XLOOKUP: tidak ditemukan.' };
      }
      const targetAddr4 = cellAddress(returnCells[foundIdx].col, returnCells[foundIdx].row);
      return { value: getCellValue(grid, targetAddr4), error: null };
    }

    case 'ROUND': {
      if (args.length < 2) return { value: null, error: 'ROUND membutuhkan 2 argumen (angka, jumlah_digit).' };
      const numResult = evaluateExpression(args[0], grid);
      if (numResult.error) return { value: null, error: numResult.error };
      const digitsResult = evaluateExpression(args[1], grid);
      if (digitsResult.error) return { value: null, error: digitsResult.error };
      const num = Number(numResult.value);
      const digits = Number(digitsResult.value);
      if (!Number.isFinite(num) || !Number.isFinite(digits)) return { value: null, error: 'ROUND: argumen harus berupa angka.' };
      const factor = Math.pow(10, digits);
      return { value: Math.round(num * factor) / factor, error: null };
    }

    case 'IFS': {
      // IFS(kondisi1, nilai1, [kondisi2, nilai2, ...]) — pasangan, jumlah argumen harus genap.
      if (args.length < 2 || args.length % 2 !== 0) {
        return { value: null, error: 'IFS membutuhkan pasangan (kondisi, nilai) — jumlah argumen genap.' };
      }
      for (let i = 0; i < args.length; i += 2) {
        const cond = evaluateCondition(args[i], grid);
        if (cond.error) return { value: null, error: cond.error };
        if (cond.value) return evaluateExpression(args[i + 1], grid);
      }
      return { value: null, error: 'IFS: tidak ada kondisi yang terpenuhi (semua FALSE).' };
    }

    default:
      return { value: null, error: `Fungsi "${fnName}" belum didukung pada tahap latihan ini.` };
  }
}

/** Uraikan argumen kriteria COUNTIF/SUMIF (mis. ">1000000", "<>0", atau nilai kesetaraan biasa). */
function resolveCriteria(argStr, grid) {
  const resolved = evaluateExpression(argStr, grid);
  const raw = resolved.value;
  if (typeof raw === 'string') {
    const m = /^(<>|>=|<=|=|>|<)(.*)$/.exec(raw.trim());
    if (m) {
      const rest = m[2].trim();
      const numeric = isNumericLiteral(rest) ? Number(rest) : null;
      return { operator: m[1], value: numeric !== null ? numeric : rest, isNumeric: numeric !== null };
    }
    return { operator: '=', value: raw, isNumeric: false };
  }
  return { operator: '=', value: raw, isNumeric: typeof raw === 'number' };
}

/** Evaluasi COUNTIF(rentang, kriteria) atau SUMIF(rentang, kriteria, [rentang_jumlah]). */
function evaluateConditionalAggregate(fnName, args, grid) {
  if (args.length < 2) {
    return { value: null, error: `${fnName} membutuhkan minimal 2 argumen (rentang, kriteria).`, functionName: fnName, refs: args };
  }
  const criteriaCells = parseRange(args[0]);
  if (!criteriaCells) {
    return { value: null, error: `Referensi rentang tidak valid: ${args[0]}`, functionName: fnName, refs: args };
  }
  const criteria = resolveCriteria(args[1], grid);

  if (fnName === 'COUNTIF') {
    let count = 0;
    for (const { col, row } of criteriaCells) {
      if (matchCriteria(getCellValue(grid, cellAddress(col, row)), criteria)) count++;
    }
    return { value: count, error: null, functionName: fnName, refs: args };
  }

  // SUMIF / AVERAGEIF (struktur argumen sama: rentang kriteria, kriteria, [rentang nilai])
  const isAverage = fnName === 'AVERAGEIF';
  const valueCells = args[2] !== undefined ? parseRange(args[2]) : criteriaCells;
  if (!valueCells) {
    return {
      value: null,
      error: `Referensi rentang ${isAverage ? 'rata-rata' : 'jumlah'} tidak valid: ${args[2]}`,
      functionName: fnName,
      refs: args,
    };
  }
  if (valueCells.length !== criteriaCells.length) {
    return {
      value: null,
      error: `Rentang kriteria dan rentang ${isAverage ? 'rata-rata' : 'jumlah'} pada ${fnName} harus berukuran sama.`,
      functionName: fnName,
      refs: args,
    };
  }
  let total = 0;
  let matchCount = 0;
  for (let i = 0; i < criteriaCells.length; i++) {
    if (matchCriteria(getCellValue(grid, cellAddress(criteriaCells[i].col, criteriaCells[i].row)), criteria)) {
      const vVal = getCellValue(grid, cellAddress(valueCells[i].col, valueCells[i].row));
      if (typeof vVal === 'number') { total += vVal; matchCount++; }
    }
  }
  if (isAverage) {
    return {
      value: matchCount === 0 ? null : total / matchCount,
      error: matchCount === 0 ? 'AVERAGEIF: tidak ada data yang memenuhi kriteria (pembagian oleh nol).' : null,
      functionName: fnName,
      refs: args,
    };
  }
  return { value: total, error: null, functionName: fnName, refs: args };
}

/**
 * Evaluasi COUNTIFS / SUMIFS.
 * - COUNTIFS(range1, crit1, [range2, crit2, ...])
 * - SUMIFS(sum_range, criteria_range1, crit1, [criteria_range2, crit2, ...])
 */
function evaluateMultiConditionalAggregate(fnName, args, grid) {
  if (fnName === 'COUNTIFS') {
    if (args.length < 2 || args.length % 2 !== 0) {
      return { value: null, error: 'COUNTIFS membutuhkan pasangan rentang + kriteria (jumlah argumen genap).', functionName: fnName, refs: args };
    }
    const pairs = [];
    for (let i = 0; i < args.length; i += 2) {
      const rng = parseRange(args[i]);
      if (!rng) return { value: null, error: `Referensi rentang tidak valid: ${args[i]}`, functionName: fnName, refs: args };
      pairs.push({ cells: rng, criteria: resolveCriteria(args[i + 1], grid) });
    }
    let count = 0;
    for (let i = 0; i < pairs[0].cells.length; i++) {
      let ok = true;
      for (const p of pairs) {
        const cell = p.cells[i];
        if (!cell) { ok = false; break; }
        const val = getCellValue(grid, cellAddress(cell.col, cell.row));
        if (!matchCriteria(val, p.criteria)) { ok = false; break; }
      }
      if (ok) count++;
    }
    return { value: count, error: null, functionName: fnName, refs: args };
  }

  // SUMIFS / AVERAGEIFS (struktur argumen sama: rentang nilai, lalu pasangan rentang+kriteria)
  if (fnName === 'SUMIFS' || fnName === 'AVERAGEIFS') {
    const isAverage = fnName === 'AVERAGEIFS';
    if (args.length < 3 || (args.length - 1) % 2 !== 0) {
      return {
        value: null,
        error: `${fnName} membutuhkan rentang ${isAverage ? 'rata-rata' : 'jumlah'} diikuti oleh pasangan rentang+kriteria.`,
        functionName: fnName,
        refs: args,
      };
    }
    const valueRangeCells = parseRange(args[0]);
    if (!valueRangeCells) {
      return {
        value: null,
        error: `Referensi rentang ${isAverage ? 'rata-rata' : 'jumlah'} tidak valid: ${args[0]}`,
        functionName: fnName,
        refs: args,
      };
    }
    const pairs = [];
    for (let i = 1; i < args.length; i += 2) {
      const rng = parseRange(args[i]);
      if (!rng) return { value: null, error: `Referensi rentang tidak valid: ${args[i]}`, functionName: fnName, refs: args };
      pairs.push({ cells: rng, criteria: resolveCriteria(args[i + 1], grid) });
    }
    // semua rentang kriteria harus sama panjang dengan valueRange
    if (pairs.some((p) => p.cells.length !== valueRangeCells.length)) {
      return {
        value: null,
        error: `Rentang kriteria dan rentang ${isAverage ? 'rata-rata' : 'jumlah'} pada ${fnName} harus berukuran sama.`,
        functionName: fnName,
        refs: args,
      };
    }
    let total = 0;
    let matchCount = 0;
    for (let i = 0; i < valueRangeCells.length; i++) {
      let ok = true;
      for (const p of pairs) {
        const cell = p.cells[i];
        const val = getCellValue(grid, cellAddress(cell.col, cell.row));
        if (!matchCriteria(val, p.criteria)) { ok = false; break; }
      }
      if (ok) {
        const vVal = getCellValue(grid, cellAddress(valueRangeCells[i].col, valueRangeCells[i].row));
        if (typeof vVal === 'number') { total += vVal; matchCount++; }
      }
    }
    if (isAverage) {
      return {
        value: matchCount === 0 ? null : total / matchCount,
        error: matchCount === 0 ? 'AVERAGEIFS: tidak ada data yang memenuhi kriteria (pembagian oleh nol).' : null,
        functionName: fnName,
        refs: args,
      };
    }
    return { value: total, error: null, functionName: fnName, refs: args };
  }
  return { value: null, error: `Fungsi ${fnName} tidak dikenali oleh evaluator multi-kriteria.` };
}

/**
 * Evaluasi string rumus (harus diawali '=') terhadap grid yang diberikan.
 * Meneruskan ke tiga kelompok penanganan:
 *   1. Fungsi agregasi Level 1 (SUM/AVERAGE/MIN/MAX/COUNT) — logika ASLI Tahap 1, tidak diubah.
 *   2. Fungsi agregasi bersyarat (COUNTIF/SUMIF).
 *   3. Fungsi skalar (logika, teks, tanggal).
 * @returns {{value:number|string|null, error:string|null, functionName:string|null, refs:string[]}}
 */
export function evaluateFormula(formulaStr, grid) {
  const trimmed = (formulaStr || '').trim();
  if (!trimmed.startsWith('=')) {
    return { value: null, error: 'Rumus harus diawali tanda "="', functionName: null, refs: [] };
  }

  const match = FORMULA_CALL_RE.exec(trimmed);
  if (!match) {
    return {
      value: null,
      error: 'Format rumus tidak dikenali. Gunakan bentuk =NAMAFUNGSI(argumen).',
      functionName: null,
      refs: [],
    };
  }

  const functionName = match[1].toUpperCase();
  const args = splitArgs(match[2]);

  // --- 1. Fungsi agregasi Level 1 (logika ASLI, tidak diubah) ---
  if (AGGREGATE_FUNCTION_NAMES.has(functionName)) {
    const fnDef = FORMULA_FUNCTIONS[functionName];
    if (args.length < fnDef.minArgs) {
      return {
        value: null,
        error: `Fungsi ${functionName} membutuhkan minimal ${fnDef.minArgs} argumen.`,
        functionName,
        refs: [],
      };
    }
    const { values, invalidRefs } = collectNumericValues(grid, args);
    if (invalidRefs.length > 0) {
      return {
        value: null,
        error: `Referensi sel tidak valid: ${invalidRefs.join(', ')}`,
        functionName,
        refs: args,
      };
    }
    return { value: fnDef.compute(values), error: null, functionName, refs: args };
  }

  // --- 1b. COUNTA (agregasi "apa saja terisi", bukan hanya angka) ---
  if (ANY_VALUE_AGGREGATE_FUNCTION_NAMES.has(functionName)) {
    if (args.length < 1) {
      return {
        value: null,
        error: `Fungsi ${functionName} membutuhkan minimal 1 argumen.`,
        functionName,
        refs: [],
      };
    }
    const { values, invalidRefs } = collectAnyValues(grid, args);
    if (invalidRefs.length > 0) {
      return {
        value: null,
        error: `Referensi sel tidak valid: ${invalidRefs.join(', ')}`,
        functionName,
        refs: args,
      };
    }
    return { value: values.length, error: null, functionName, refs: args };
  }

  // --- 2. Fungsi agregasi bersyarat ---
  if (CONDITIONAL_AGGREGATE_FUNCTION_NAMES.has(functionName)) {
    if (functionName === 'SUMIFS' || functionName === 'COUNTIFS' || functionName === 'AVERAGEIFS') {
      return evaluateMultiConditionalAggregate(functionName, args, grid);
    }
    return evaluateConditionalAggregate(functionName, args, grid);
  }

  // --- 3. Fungsi skalar (logika, teks, tanggal) ---
  if (SCALAR_FUNCTION_NAMES.has(functionName)) {
    const result = evaluateCall(functionName, args, grid);
    return { value: result.value, error: result.error, functionName, refs: args };
  }

  return {
    value: null,
    error: `Fungsi "${match[1]}" belum didukung pada tahap latihan ini.`,
    functionName,
    refs: [],
  };
}
