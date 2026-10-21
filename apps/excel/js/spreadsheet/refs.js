/**
 * spreadsheet/refs.js — alamat sel & rentang (A1, B2:B10, $A$1)
 * (dipecah dari ../spreadsheet-engine.js; perilaku identik)
 */

// ============================================================================
// Referensi sel & rentang (A1, B2:B10, $A$1, dst.)
// ============================================================================

/** Ubah indeks kolom (0-based) menjadi huruf kolom gaya Excel (0 -> A, 26 -> AA). */
export function indexToColLetter(index) {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Ubah huruf kolom gaya Excel menjadi indeks kolom (0-based). */
export function colLetterToIndex(letters) {
  let n = 0;
  const clean = letters.toUpperCase();
  for (let i = 0; i < clean.length; i++) {
    n = n * 26 + (clean.charCodeAt(i) - 64);
  }
  return n - 1;
}

const CELL_REF_RE = /^\$?([A-Za-z]+)\$?(\d+)$/;

/**
 * Uraikan alamat sel tunggal, mendukung referensi absolut/campuran ($A$1, A$1, $A1).
 * Tanda '$' diterima secara sintaksis (agar mode praktik yang menuntut penulisan
 * referensi absolut tetap valid) namun tidak mempengaruhi hasil perhitungan,
 * karena mesin ini tidak melakukan copy-paste rumus antar sel pada Tahap 1.
 */
export function parseCellAddress(addr) {
  const match = CELL_REF_RE.exec(addr.trim());
  if (!match) return null;
  return {
    col: colLetterToIndex(match[1]),
    row: parseInt(match[2], 10) - 1, // 0-based, baris 1 = header
    colLetter: match[1].toUpperCase(),
    rowNumber: parseInt(match[2], 10),
  };
}

/**
 * Uraikan referensi rentang "A2:A26" atau sel tunggal "A2" menjadi daftar alamat {col,row}.
 * Mengembalikan null jika bukan referensi sel/rentang yang valid.
 */
export function parseRange(ref) {
  const clean = ref.trim();
  if (clean.includes(':')) {
    const [startRaw, endRaw] = clean.split(':');
    const start = parseCellAddress(startRaw);
    const end = parseCellAddress(endRaw);
    if (!start || !end) return null;
    const colFrom = Math.min(start.col, end.col);
    const colTo = Math.max(start.col, end.col);
    const rowFrom = Math.min(start.row, end.row);
    const rowTo = Math.max(start.row, end.row);
    const cells = [];
    for (let r = rowFrom; r <= rowTo; r++) {
      for (let c = colFrom; c <= colTo; c++) {
        cells.push({ col: c, row: r });
      }
    }
    return cells;
  }
  const single = parseCellAddress(clean);
  if (!single) return null;
  return [{ col: single.col, row: single.row }];
}

/** Bentuk alamat sel "A1" dari indeks 0-based. */
export function cellAddress(col, row) {
  return `${indexToColLetter(col)}${row + 1}`;
}
