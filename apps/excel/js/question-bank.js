/**
 * question-bank.js
 * Modular question templates per level.
 * Each template is a builder function that receives context and returns
 * a partial question object or null if not applicable to the current dataset.
 *
 * Target: rich variation — parameters drawn from actual dataset values.
 */

import { indexToColLetter, cellAddress, serialToDate } from './spreadsheet-engine.js';

// ---------------------------------------------------------------------------
// Helpers shared by templates
// ---------------------------------------------------------------------------

export function fmtRp(n) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
}

export function fmtNum(n) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
}

export function pick(arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uniqueValues(rows, colIndex) {
  const set = new Set();
  for (const r of rows) {
    const v = r[colIndex];
    if (v !== null && v !== undefined && v !== '') set.add(v);
  }
  return Array.from(set);
}

export function colIndexOf(headers, name) {
  return headers.indexOf(name);
}

export function findNumericColumns(headers, rows, preferred = []) {
  const preferredFound = preferred
    .map((h) => ({ header: h, index: headers.indexOf(h) }))
    .filter((c) => c.index !== -1 && rows.some((r) => typeof r[c.index] === 'number'));
  if (preferredFound.length) return preferredFound;

  return headers
    .map((header, index) => ({ header, index }))
    .filter(({ index }) => rows.some((row) => typeof row[index] === 'number'));
}

export function findTextColumns(headers, rows, preferred = []) {
  const preferredFound = preferred
    .map((h) => ({ header: h, index: headers.indexOf(h) }))
    .filter((c) => c.index !== -1 && rows.some((r) => typeof r[c.index] === 'string'));
  if (preferredFound.length) return preferredFound;

  return headers
    .map((header, index) => ({ header, index }))
    .filter(({ index }) => rows.some((row) => typeof row[index] === 'string' && row[index].length > 0));
}

export function dataRange(colLetter, dataStartRowIndex, rowCount) {
  const first = dataStartRowIndex + 1;
  const last = dataStartRowIndex + rowCount;
  return `${colLetter}${first}:${colLetter}${last}`;
}

export function rangeRef(colIndex, dataStartRowIndex, rowCount) {
  return dataRange(indexToColLetter(colIndex), dataStartRowIndex, rowCount);
}

/** Allocate a varied target cell on the answer row; prefer columns away from data when possible */
export function allocateTargetCell(headers, targetRowIndex, preferredColIndex = null, usedTargets = new Set()) {
  const candidates = [];
  // Prefer preferred column first, then nearby, then others
  if (preferredColIndex != null && preferredColIndex >= 0) {
    candidates.push(preferredColIndex);
  }
  for (let i = 0; i < Math.max(headers.length, 8); i++) {
    if (!candidates.includes(i)) candidates.push(i);
  }
  // also allow columns beyond dataset (scratch)
  for (let i = headers.length; i < headers.length + 4; i++) {
    if (!candidates.includes(i)) candidates.push(i);
  }

  for (const col of candidates) {
    const addr = cellAddress(col, targetRowIndex);
    if (!usedTargets.has(addr)) {
      usedTargets.add(addr);
      return { targetCell: addr, targetColIndex: col };
    }
  }
  // fallback: always return something
  const addr = cellAddress(preferredColIndex ?? 0, targetRowIndex);
  usedTargets.add(addr);
  return { targetCell: addr, targetColIndex: preferredColIndex ?? 0 };
}

export function baseQuestion(partial) {
  return {
    id: `q_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    alternativeFormulas: [],
    requiredRefs: [],
    functionCount: 1,
    conditionCount: 0,
    nestedDepth: 0,
    businessScenario: false,
    parameters: {},
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// LEVEL 1 — Aggregation (SUM, AVERAGE, MIN, MAX, COUNT)
// ---------------------------------------------------------------------------

const LEVEL1_NUMERIC_LABELS = {
  'Jumlah': 'jumlah unit yang terjual',
  'Harga Satuan': 'harga satuan produk',
  'Diskon (%)': 'persentase diskon',
  'DPP': 'Dasar Pengenaan Pajak (DPP)',
  'Pajak (PPN 11%)': 'nilai PPN',
  'Total Penjualan': 'Total Penjualan',
  'Stok Awal': 'Stok Awal',
  'Masuk': 'barang masuk',
  'Keluar': 'barang keluar',
  'Stok Akhir': 'Stok Akhir',
  'Harga Beli': 'harga beli',
  'Nilai Persediaan': 'Nilai Persediaan',
  'Debit': 'nilai Debit',
  'Kredit': 'nilai Kredit',
  'Gaji Pokok': 'gaji pokok',
  'Tunjangan': 'tunjangan',
  'Potongan': 'potongan',
  'Gaji Bersih': 'gaji bersih',
};

function articleFor(header) {
  return LEVEL1_NUMERIC_LABELS[header] || header;
}

export const LEVEL1_TEMPLATES = [
  {
    id: 'L1_SUM',
    fn: 'SUM',
    category: 'aggregation',
    build: (ctx) => {
      const cols = findNumericColumns(ctx.headers, ctx.rows, Object.keys(LEVEL1_NUMERIC_LABELS));
      if (!cols.length) return null;
      const col = pick(cols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      if (!values.length) return null;
      const expectedValue = Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
      const range = rangeRef(col.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      const art = articleFor(col.header);
      return baseQuestion({
        level: 1,
        templateId: 'L1_SUM',
        category: 'aggregation',
        title: `Total ${col.header}`,
        instruction: pick([
          `Hitung TOTAL ${art} dari seluruh baris data.`,
          `Berapa total ${art} pada dataset ini?`,
          `Jumlahkan seluruh nilai ${col.header} yang tercatat.`,
          `Hitung total ${art} untuk semua transaksi/baris.`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: col.index,
        expectedColumnLabel: col.header,
        acceptedFunctions: ['SUM'],
        expectedFormula: `=SUM(${range})`,
        hints: [
          'Anda perlu menjumlahkan seluruh nilai pada satu kolom numerik.',
          'Fungsi yang relevan: SUM.',
          `Struktur: =SUM(${range})`,
        ],
        explanation: `Kolom "${col.header}" (${indexToColLetter(col.index)}) berisi ${values.length} nilai numerik. =SUM(${range}) menghasilkan ${fmtNum(expectedValue)}.`,
        points: 10,
        difficulty: 1,
        functionCount: 1,
        conditionCount: 0,
        nestedDepth: 0,
        parameters: { column: col.header, formula: 'SUM' },
        fingerprintParts: {
          templateId: 'L1_SUM',
          formula: 'SUM',
          targetColumn: col.header,
        },
      });
    },
  },
  {
    id: 'L1_AVERAGE',
    fn: 'AVERAGE',
    category: 'aggregation',
    build: (ctx) => {
      const cols = findNumericColumns(ctx.headers, ctx.rows, Object.keys(LEVEL1_NUMERIC_LABELS));
      if (!cols.length) return null;
      const col = pick(cols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      if (!values.length) return null;
      const expectedValue = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      const range = rangeRef(col.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      const art = articleFor(col.header);
      return baseQuestion({
        level: 1,
        templateId: 'L1_AVERAGE',
        category: 'aggregation',
        title: `Rata-rata ${col.header}`,
        instruction: pick([
          `Hitung rata-rata ${art} dari seluruh baris data.`,
          `Berapa nilai rata-rata ${col.header}?`,
          `Tentukan mean dari kolom ${col.header}.`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: col.index,
        expectedColumnLabel: col.header,
        acceptedFunctions: ['AVERAGE'],
        expectedFormula: `=AVERAGE(${range})`,
        hints: [
          'Anda perlu menghitung rata-rata (mean) sekumpulan angka.',
          'Fungsi yang relevan: AVERAGE.',
          `Struktur: =AVERAGE(${range})`,
        ],
        explanation: `Rata-rata ${values.length} nilai pada kolom "${col.header}" adalah ${fmtNum(expectedValue)}.`,
        points: 10,
        difficulty: 1,
        parameters: { column: col.header, formula: 'AVERAGE' },
        fingerprintParts: { templateId: 'L1_AVERAGE', formula: 'AVERAGE', targetColumn: col.header },
      });
    },
  },
  {
    id: 'L1_MIN',
    fn: 'MIN',
    category: 'aggregation',
    build: (ctx) => {
      const cols = findNumericColumns(ctx.headers, ctx.rows, Object.keys(LEVEL1_NUMERIC_LABELS));
      if (!cols.length) return null;
      const col = pick(cols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      if (!values.length) return null;
      const expectedValue = Math.min(...values);
      const range = rangeRef(col.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 1,
        templateId: 'L1_MIN',
        category: 'aggregation',
        title: `${col.header} Terendah`,
        instruction: pick([
          `Tentukan nilai ${articleFor(col.header)} yang PALING RENDAH.`,
          `Berapa nilai minimum pada kolom ${col.header}?`,
          `Cari ${col.header} terkecil di seluruh data.`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: col.index,
        expectedColumnLabel: col.header,
        acceptedFunctions: ['MIN'],
        expectedFormula: `=MIN(${range})`,
        hints: [
          'Anda perlu mencari nilai terkecil pada satu rentang.',
          'Fungsi yang relevan: MIN.',
          `Struktur: =MIN(${range})`,
        ],
        explanation: `Nilai terkecil pada kolom "${col.header}" adalah ${fmtNum(expectedValue)}.`,
        points: 10,
        difficulty: 1,
        parameters: { column: col.header, formula: 'MIN' },
        fingerprintParts: { templateId: 'L1_MIN', formula: 'MIN', targetColumn: col.header },
      });
    },
  },
  {
    id: 'L1_MAX',
    fn: 'MAX',
    category: 'aggregation',
    build: (ctx) => {
      const cols = findNumericColumns(ctx.headers, ctx.rows, Object.keys(LEVEL1_NUMERIC_LABELS));
      if (!cols.length) return null;
      const col = pick(cols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      if (!values.length) return null;
      const expectedValue = Math.max(...values);
      const range = rangeRef(col.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 1,
        templateId: 'L1_MAX',
        category: 'aggregation',
        title: `${col.header} Tertinggi`,
        instruction: pick([
          `Tentukan nilai ${articleFor(col.header)} yang PALING TINGGI.`,
          `Berapa nilai maksimum pada kolom ${col.header}?`,
          `Cari ${col.header} terbesar di seluruh data.`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: col.index,
        expectedColumnLabel: col.header,
        acceptedFunctions: ['MAX'],
        expectedFormula: `=MAX(${range})`,
        hints: [
          'Anda perlu mencari nilai terbesar pada satu rentang.',
          'Fungsi yang relevan: MAX.',
          `Struktur: =MAX(${range})`,
        ],
        explanation: `Nilai terbesar pada kolom "${col.header}" adalah ${fmtNum(expectedValue)}.`,
        points: 10,
        difficulty: 1,
        parameters: { column: col.header, formula: 'MAX' },
        fingerprintParts: { templateId: 'L1_MAX', formula: 'MAX', targetColumn: col.header },
      });
    },
  },
  {
    id: 'L1_COUNT',
    fn: 'COUNT',
    category: 'aggregation',
    build: (ctx) => {
      const cols = findNumericColumns(ctx.headers, ctx.rows, Object.keys(LEVEL1_NUMERIC_LABELS));
      if (!cols.length) return null;
      const col = pick(cols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      const expectedValue = values.length;
      const range = rangeRef(col.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 1,
        templateId: 'L1_COUNT',
        category: 'aggregation',
        title: 'Jumlah Baris Numerik',
        instruction: pick([
          `Hitung berapa banyak sel berisi ANGKA pada kolom ${col.header}.`,
          `Berapa jumlah baris data yang memiliki nilai numerik di kolom ${col.header}?`,
          `Gunakan COUNT untuk menghitung banyaknya angka di kolom ${col.header}.`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: col.index,
        expectedColumnLabel: col.header,
        acceptedFunctions: ['COUNT'],
        expectedFormula: `=COUNT(${range})`,
        hints: [
          'COUNT menghitung sel yang berisi angka (bukan teks kosong).',
          'Fungsi yang relevan: COUNT.',
          `Struktur: =COUNT(${range})`,
        ],
        explanation: `Terdapat ${expectedValue} nilai numerik pada kolom "${col.header}".`,
        points: 10,
        difficulty: 1,
        parameters: { column: col.header, formula: 'COUNT' },
        fingerprintParts: { templateId: 'L1_COUNT', formula: 'COUNT', targetColumn: col.header },
      });
    },
  },
];

// Expand Level 1 with more title/instruction variants by cloning builders with different preferred columns
// (already handled by random column pick)

// ---------------------------------------------------------------------------
// LEVEL 2 — Single condition / text / date
// ---------------------------------------------------------------------------

export const LEVEL2_TEMPLATES = [
  {
    id: 'L2_COUNTIF_TEXT',
    category: 'conditional_count',
    build: (ctx) => {
      const textCols = findTextColumns(ctx.headers, ctx.rows, ['Wilayah', 'Kategori', 'Nama Sales', 'Satuan', 'Departemen', 'Status']);
      if (!textCols.length) return null;
      const col = pick(textCols);
      const values = uniqueValues(ctx.rows, col.index);
      if (values.length < 2) return null;
      const criterion = pick(values);
      const expectedValue = ctx.rows.filter((r) => r[col.index] === criterion).length;
      const range = rangeRef(col.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_COUNTIF_TEXT',
        category: 'conditional_count',
        title: `Jumlah "${criterion}" — ${col.header}`,
        instruction: pick([
          `Hitung berapa banyak baris yang memiliki ${col.header} = "${criterion}".`,
          `Berapa jumlah transaksi/data dengan ${col.header} "${criterion}"?`,
          `Gunakan kriteria "${criterion}" pada kolom ${col.header} untuk menghitung banyaknya baris.`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: col.index,
        expectedColumnLabel: col.header,
        acceptedFunctions: ['COUNTIF'],
        expectedFormula: `=COUNTIF(${range},"${criterion}")`,
        hints: [
          'Anda perlu menghitung baris yang memenuhi SATU kriteria teks.',
          'Fungsi yang relevan: COUNTIF.',
          `Struktur: =COUNTIF(${range},"${criterion}")`,
        ],
        explanation: `Terdapat ${expectedValue} baris dengan ${col.header} = "${criterion}".`,
        points: 15,
        difficulty: 2,
        conditionCount: 1,
        parameters: { column: col.header, criterion, formula: 'COUNTIF' },
        fingerprintParts: {
          templateId: 'L2_COUNTIF_TEXT',
          formula: 'COUNTIF',
          targetColumn: col.header,
          criteria: col.header,
          criteriaValues: String(criterion),
        },
      });
    },
  },
  {
    id: 'L2_SUMIF_TEXT',
    category: 'conditional_sum',
    build: (ctx) => {
      const criteriaCols = findTextColumns(ctx.headers, ctx.rows, ['Kategori', 'Wilayah', 'Nama Sales', 'Departemen']);
      const sumCols = findNumericColumns(ctx.headers, ctx.rows, ['Total Penjualan', 'DPP', 'Nilai Persediaan', 'Gaji Bersih', 'Debit', 'Kredit']);
      if (!criteriaCols.length || !sumCols.length) return null;
      const cCol = pick(criteriaCols);
      const sCol = pick(sumCols);
      const values = uniqueValues(ctx.rows, cCol.index);
      if (!values.length) return null;
      const criterion = pick(values);
      const expectedValue = ctx.rows.reduce((sum, r) => (r[cCol.index] === criterion ? sum + (Number(r[sCol.index]) || 0) : sum), 0);
      const critRange = rangeRef(cCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sCol.index, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_SUMIF_TEXT',
        category: 'conditional_sum',
        title: `Total ${sCol.header} — ${cCol.header} "${criterion}"`,
        instruction: pick([
          `Hitung total ${sCol.header} hanya untuk baris dengan ${cCol.header} = "${criterion}".`,
          `Berapa jumlah ${sCol.header} pada ${cCol.header} "${criterion}"?`,
          `Jumlahkan ${sCol.header} dengan kriteria ${cCol.header} "${criterion}".`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: sCol.index,
        expectedColumnLabel: sCol.header,
        acceptedFunctions: ['SUMIF'],
        expectedFormula: `=SUMIF(${critRange},"${criterion}",${sumRange})`,
        hints: [
          'Anda perlu menjumlahkan nilai berdasarkan SATU kriteria pada kolom lain.',
          'Fungsi yang relevan: SUMIF.',
          `Struktur: =SUMIF(${critRange},"${criterion}",${sumRange})`,
        ],
        explanation: `Total ${sCol.header} untuk ${cCol.header} "${criterion}" adalah ${fmtNum(expectedValue)}.`,
        points: 15,
        difficulty: 2,
        conditionCount: 1,
        parameters: { sumColumn: sCol.header, criteriaColumn: cCol.header, criterion, formula: 'SUMIF' },
        fingerprintParts: {
          templateId: 'L2_SUMIF_TEXT',
          formula: 'SUMIF',
          targetColumn: sCol.header,
          criteria: cCol.header,
          criteriaValues: String(criterion),
        },
      });
    },
  },
  {
    id: 'L2_IF_THRESHOLD',
    category: 'conditional_logic',
    build: (ctx) => {
      const numCols = findNumericColumns(ctx.headers, ctx.rows, ['Total Penjualan', 'Stok Akhir', 'Gaji Bersih', 'Nilai Persediaan', 'DPP']);
      if (!numCols.length) return null;
      const col = pick(numCols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      if (!values.length) return null;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const threshold = Math.round(avg / 100000) * 100000 || Math.round(avg);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const gridRow = ctx.dataStartRowIndex + rowIdx;
      const addr = cellAddress(col.index, gridRow);
      const value = ctx.rows[rowIdx][col.index];
      if (typeof value !== 'number') return null;
      const labelHigh = 'Besar';
      const labelLow = 'Kecil';
      const expectedValue = value >= threshold ? labelHigh : labelLow;
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_IF_THRESHOLD',
        category: 'conditional_logic',
        title: `Status ${col.header} (IF)`,
        instruction: `Pada baris data ke-${rowIdx + 1} (sel ${addr}), nilai ${col.header} = ${fmtNum(value)}. Tulis rumus IF yang menampilkan "${labelHigh}" jika nilai >= ${fmtNum(threshold)}, atau "${labelLow}" jika tidak.`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['IF'],
        expectedFormula: `=IF(${addr}>=${threshold},"${labelHigh}","${labelLow}")`,
        hints: [
          'Anda perlu memilih salah satu dari dua hasil berdasarkan sebuah syarat.',
          'Fungsi yang relevan: IF.',
          `Struktur: =IF(${addr}>=${threshold},"${labelHigh}","${labelLow}")`,
        ],
        explanation: `Nilai ${fmtNum(value)} ${value >= threshold ? '≥' : '<'} ambang ${fmtNum(threshold)}, sehingga hasilnya "${expectedValue}".`,
        points: 15,
        difficulty: 2,
        conditionCount: 1,
        parameters: { column: col.header, threshold, row: rowIdx + 1, formula: 'IF' },
        fingerprintParts: {
          templateId: 'L2_IF_THRESHOLD',
          formula: 'IF',
          targetColumn: col.header,
          criteriaValues: String(threshold),
          targetRow: String(rowIdx),
        },
      });
    },
  },
  {
    id: 'L2_LEFT',
    category: 'text',
    build: (ctx) => {
      const textCols = findTextColumns(ctx.headers, ctx.rows, ['Kode Produk', 'ID Transaksi', 'ID Barang', 'Kode Akun']);
      if (!textCols.length) return null;
      const col = pick(textCols);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const value = String(ctx.rows[rowIdx][col.index] ?? '');
      if (value.length < 3) return null;
      const n = Math.min(3, value.length);
      const gridRow = ctx.dataStartRowIndex + rowIdx;
      const addr = cellAddress(col.index, gridRow);
      const expectedValue = value.slice(0, n);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_LEFT',
        category: 'text',
        title: `Prefix ${col.header} (LEFT)`,
        instruction: `Ambil ${n} karakter PALING KIRI dari ${col.header} pada baris ke-${rowIdx + 1} (sel ${addr}).`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['LEFT'],
        expectedFormula: `=LEFT(${addr},${n})`,
        hints: [
          'Ambil sejumlah karakter dari sisi kiri sebuah teks.',
          'Fungsi yang relevan: LEFT.',
          `Struktur: =LEFT(${addr},${n})`,
        ],
        explanation: `Nilai "${value}" → ${n} karakter kiri = "${expectedValue}".`,
        points: 12,
        difficulty: 2,
        parameters: { column: col.header, n, row: rowIdx + 1, formula: 'LEFT' },
        fingerprintParts: {
          templateId: 'L2_LEFT',
          formula: 'LEFT',
          targetColumn: col.header,
          targetRow: String(rowIdx),
          parameters: String(n),
        },
      });
    },
  },
  {
    id: 'L2_MONTH',
    category: 'date',
    build: (ctx) => {
      const dateIdx = ctx.headers.findIndex((h, i) => ctx.columnTypes?.[i] === 'date' || h === 'Tanggal');
      if (dateIdx === -1) return null;
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const serial = ctx.rows[rowIdx][dateIdx];
      if (typeof serial !== 'number') return null;
      const expectedValue = serialToDate(serial).getUTCMonth() + 1;
      const gridRow = ctx.dataStartRowIndex + rowIdx;
      const addr = cellAddress(dateIdx, gridRow);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, dateIdx, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_MONTH',
        category: 'date',
        title: 'Bulan dari Tanggal (MONTH)',
        instruction: `Tentukan BULAN (1–12) dari tanggal pada baris ke-${rowIdx + 1} (sel ${addr}).`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['MONTH'],
        expectedFormula: `=MONTH(${addr})`,
        hints: [
          'Ambil bagian bulan dari sebuah tanggal serial Excel.',
          'Fungsi yang relevan: MONTH.',
          `Struktur: =MONTH(${addr})`,
        ],
        explanation: `Tanggal pada ${addr} berada di bulan ${expectedValue}.`,
        points: 12,
        difficulty: 2,
        parameters: { row: rowIdx + 1, formula: 'MONTH' },
        fingerprintParts: {
          templateId: 'L2_MONTH',
          formula: 'MONTH',
          targetColumn: ctx.headers[dateIdx],
          targetRow: String(rowIdx),
        },
      });
    },
  },
  {
    id: 'L2_DATEDIF',
    category: 'date',
    build: (ctx) => {
      const dateIdx = ctx.headers.findIndex((h, i) => ctx.columnTypes?.[i] === 'date' || h === 'Tanggal');
      if (dateIdx === -1 || ctx.rows.length < 2) return null;
      let idxA = Math.floor(Math.random() * ctx.rows.length);
      let idxB = Math.floor(Math.random() * ctx.rows.length);
      let attempts = 0;
      while (idxA === idxB && attempts < 20) {
        idxB = Math.floor(Math.random() * ctx.rows.length);
        attempts++;
      }
      if (idxA === idxB) return null;
      let serialA = ctx.rows[idxA][dateIdx];
      let serialB = ctx.rows[idxB][dateIdx];
      if (typeof serialA !== 'number' || typeof serialB !== 'number') return null;
      if (serialA > serialB) {
        [idxA, idxB] = [idxB, idxA];
        [serialA, serialB] = [serialB, serialA];
      }
      const addrA = cellAddress(dateIdx, ctx.dataStartRowIndex + idxA);
      const addrB = cellAddress(dateIdx, ctx.dataStartRowIndex + idxB);
      const expectedValue = serialB - serialA;
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, dateIdx, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_DATEDIF',
        category: 'date',
        title: 'Selisih Hari (DATEDIF)',
        instruction: `Hitung selisih HARI antara tanggal baris ke-${idxA + 1} (${addrA}) dan baris ke-${idxB + 1} (${addrB}).`,
        targetCell,
        expectedValue,
        requiredRefs: [addrA, addrB],
        acceptedFunctions: ['DATEDIF'],
        expectedFormula: `=DATEDIF(${addrA},${addrB},"D")`,
        hints: [
          'Hitung selisih antara dua tanggal dalam satuan hari.',
          'Fungsi yang relevan: DATEDIF dengan unit "D".',
          `Struktur: =DATEDIF(${addrA},${addrB},"D")`,
        ],
        explanation: `Selisih ${addrA} dan ${addrB} adalah ${expectedValue} hari.`,
        points: 15,
        difficulty: 2,
        conditionCount: 0,
        parameters: { formula: 'DATEDIF' },
        fingerprintParts: {
          templateId: 'L2_DATEDIF',
          formula: 'DATEDIF',
          targetRow: `${idxA}-${idxB}`,
        },
      });
    },
  },
  {
    id: 'L2_RIGHT',
    category: 'text',
    build: (ctx) => {
      const textCols = findTextColumns(ctx.headers, ctx.rows, ['Kode Produk', 'ID Transaksi', 'ID Barang']);
      if (!textCols.length) return null;
      const col = pick(textCols);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const value = String(ctx.rows[rowIdx][col.index] ?? '');
      if (value.length < 3) return null;
      const n = Math.min(3, value.length);
      const gridRow = ctx.dataStartRowIndex + rowIdx;
      const addr = cellAddress(col.index, gridRow);
      const expectedValue = value.slice(-n);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_RIGHT',
        category: 'text',
        title: `Suffix ${col.header} (RIGHT)`,
        instruction: `Ambil ${n} karakter PALING KANAN dari ${col.header} pada baris ke-${rowIdx + 1} (sel ${addr}).`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['RIGHT'],
        expectedFormula: `=RIGHT(${addr},${n})`,
        hints: [
          'Ambil sejumlah karakter dari sisi kanan sebuah teks.',
          'Fungsi yang relevan: RIGHT.',
          `Struktur: =RIGHT(${addr},${n})`,
        ],
        explanation: `Nilai "${value}" → ${n} karakter kanan = "${expectedValue}".`,
        points: 12,
        difficulty: 2,
        parameters: { column: col.header, n, formula: 'RIGHT' },
        fingerprintParts: {
          templateId: 'L2_RIGHT',
          formula: 'RIGHT',
          targetColumn: col.header,
          targetRow: String(rowIdx),
        },
      });
    },
  },
  {
    id: 'L2_LEN',
    category: 'text',
    build: (ctx) => {
      const textCols = findTextColumns(ctx.headers, ctx.rows, ['Nama Produk', 'Nama Pelanggan', 'Nama Barang', 'Nama']);
      if (!textCols.length) return null;
      const col = pick(textCols);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const value = String(ctx.rows[rowIdx][col.index] ?? '');
      if (!value) return null;
      const gridRow = ctx.dataStartRowIndex + rowIdx;
      const addr = cellAddress(col.index, gridRow);
      const expectedValue = value.length;
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 2,
        templateId: 'L2_LEN',
        category: 'text',
        title: `Panjang Teks ${col.header} (LEN)`,
        instruction: `Hitung panjang (jumlah karakter) dari ${col.header} pada baris ke-${rowIdx + 1} (sel ${addr}).`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['LEN'],
        expectedFormula: `=LEN(${addr})`,
        hints: [
          'Hitung jumlah karakter dalam sebuah teks.',
          'Fungsi yang relevan: LEN.',
          `Struktur: =LEN(${addr})`,
        ],
        explanation: `"${value}" memiliki ${expectedValue} karakter.`,
        points: 12,
        difficulty: 2,
        parameters: { column: col.header, formula: 'LEN' },
        fingerprintParts: {
          templateId: 'L2_LEN',
          formula: 'LEN',
          targetColumn: col.header,
          targetRow: String(rowIdx),
        },
      });
    },
  },
];

// ---------------------------------------------------------------------------
// LEVEL 3 — Lookup
// ---------------------------------------------------------------------------

export const LEVEL3_TEMPLATES = [
  {
    id: 'L3_VLOOKUP_KATEGORI',
    category: 'lookup',
    build: (ctx) => {
      const kodeCol = colIndexOf(ctx.headers, 'Kode Produk');
      const katCol = colIndexOf(ctx.headers, 'Kategori');
      if (kodeCol === -1 || katCol === -1) return null;
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const lookupCode = ctx.rows[rowIdx][kodeCol];
      const lookupAddr = cellAddress(kodeCol, ctx.dataStartRowIndex + rowIdx);
      const expectedValue = ctx.rows[rowIdx][katCol];
      const tableStart = cellAddress(kodeCol, ctx.dataStartRowIndex + 1);
      // VLOOKUP needs lookup col leftmost; if kode is left of kategori, col_index works
      const colOffset = katCol - kodeCol + 1;
      if (colOffset < 1) return null;
      const tableEnd = cellAddress(Math.max(kodeCol, katCol), ctx.dataStartRowIndex + ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, katCol, ctx.usedTargets);
      return baseQuestion({
        level: 3,
        templateId: 'L3_VLOOKUP_KATEGORI',
        category: 'lookup',
        title: `Lookup Kategori — ${lookupCode}`,
        instruction: `Gunakan Kode Produk pada sel ${lookupAddr} untuk mencari Kategori produk yang sesuai dari tabel data.`,
        targetCell,
        expectedValue,
        requiredRefs: [lookupAddr],
        acceptedFunctions: ['VLOOKUP', 'XLOOKUP', 'INDEX', 'MATCH'],
        expectedFormula: `=VLOOKUP(${lookupAddr},${tableStart}:${tableEnd},${colOffset},FALSE)`,
        hints: [
          'Anda perlu mencari data berdasarkan nilai kunci (kode).',
          'Fungsi yang relevan: VLOOKUP, atau INDEX + MATCH.',
          'VLOOKUP membutuhkan kolom kunci di sisi kiri rentang tabel.',
        ],
        explanation: `Kode ${lookupCode} cocok dengan kategori "${expectedValue}".`,
        points: 20,
        difficulty: 3,
        functionCount: 1,
        parameters: { lookupCode, formula: 'VLOOKUP' },
        fingerprintParts: {
          templateId: 'L3_VLOOKUP_KATEGORI',
          formula: 'VLOOKUP',
          criteriaValues: String(lookupCode),
          targetRow: String(rowIdx),
        },
      });
    },
  },
  {
    id: 'L3_INDEX_MATCH_NAMA',
    category: 'lookup',
    build: (ctx) => {
      const kodeCol = colIndexOf(ctx.headers, 'Kode Produk');
      const namaCol = colIndexOf(ctx.headers, 'Nama Produk');
      if (kodeCol === -1 || namaCol === -1) {
        // try inventory
        const idCol = colIndexOf(ctx.headers, 'ID Barang');
        const namaB = colIndexOf(ctx.headers, 'Nama Barang');
        if (idCol === -1 || namaB === -1) return null;
        return buildIndexMatch(ctx, idCol, namaB, 'ID Barang', 'Nama Barang');
      }
      return buildIndexMatch(ctx, kodeCol, namaCol, 'Kode Produk', 'Nama Produk');
    },
  },
  {
    id: 'L3_VLOOKUP_NAMA',
    category: 'lookup',
    build: (ctx) => {
      const kodeCol = colIndexOf(ctx.headers, 'Kode Produk');
      const namaCol = colIndexOf(ctx.headers, 'Nama Produk');
      if (kodeCol === -1 || namaCol === -1) return null;
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const lookupCode = ctx.rows[rowIdx][kodeCol];
      const lookupAddr = cellAddress(kodeCol, ctx.dataStartRowIndex + rowIdx);
      const expectedValue = ctx.rows[rowIdx][namaCol];
      const colOffset = namaCol - kodeCol + 1;
      if (colOffset < 1) return null;
      const tableStart = cellAddress(kodeCol, ctx.dataStartRowIndex + 1);
      const tableEnd = cellAddress(Math.max(kodeCol, namaCol), ctx.dataStartRowIndex + ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, namaCol, ctx.usedTargets);
      return baseQuestion({
        level: 3,
        templateId: 'L3_VLOOKUP_NAMA',
        category: 'lookup',
        title: `Lookup Nama Produk — ${lookupCode}`,
        instruction: `Dari Kode Produk di sel ${lookupAddr}, ambil Nama Produk yang sesuai.`,
        targetCell,
        expectedValue,
        requiredRefs: [lookupAddr],
        acceptedFunctions: ['VLOOKUP', 'INDEX', 'MATCH', 'XLOOKUP'],
        expectedFormula: `=VLOOKUP(${lookupAddr},${tableStart}:${tableEnd},${colOffset},FALSE)`,
        hints: [
          'Cari nama berdasarkan kode produk.',
          'Fungsi: VLOOKUP atau INDEX+MATCH.',
        ],
        explanation: `Kode ${lookupCode} → "${expectedValue}".`,
        points: 20,
        difficulty: 3,
        parameters: { lookupCode, formula: 'VLOOKUP' },
        fingerprintParts: {
          templateId: 'L3_VLOOKUP_NAMA',
          formula: 'VLOOKUP',
          criteriaValues: String(lookupCode),
          targetRow: String(rowIdx),
        },
      });
    },
  },
  {
    id: 'L3_IFERROR_VLOOKUP',
    category: 'lookup',
    build: (ctx) => {
      const kodeCol = colIndexOf(ctx.headers, 'Kode Produk');
      const katCol = colIndexOf(ctx.headers, 'Kategori');
      if (kodeCol === -1 || katCol === -1) return null;
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const lookupAddr = cellAddress(kodeCol, ctx.dataStartRowIndex + rowIdx);
      const expectedValue = ctx.rows[rowIdx][katCol];
      const colOffset = katCol - kodeCol + 1;
      if (colOffset < 1) return null;
      const tableStart = cellAddress(kodeCol, ctx.dataStartRowIndex + 1);
      const tableEnd = cellAddress(Math.max(kodeCol, katCol), ctx.dataStartRowIndex + ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, katCol, ctx.usedTargets);
      const vlookupInner = `VLOOKUP(${lookupAddr},${tableStart}:${tableEnd},${colOffset},FALSE)`;
      return baseQuestion({
        level: 3,
        templateId: 'L3_IFERROR_VLOOKUP',
        category: 'lookup',
        title: 'Lookup Aman (IFERROR + VLOOKUP)',
        instruction: `Cari Kategori untuk Kode Produk di ${lookupAddr}. Jika tidak ditemukan, tampilkan "Tidak Ada". Gunakan IFERROR.`,
        targetCell,
        expectedValue,
        requiredRefs: [lookupAddr],
        acceptedFunctions: ['IFERROR', 'VLOOKUP', 'INDEX', 'MATCH'],
        expectedFormula: `=IFERROR(${vlookupInner},"Tidak Ada")`,
        hints: [
          'Lindungi hasil lookup agar error diganti teks default.',
          'Kombinasi: IFERROR + VLOOKUP.',
        ],
        explanation: `Kode ditemukan, kategori = "${expectedValue}".`,
        points: 22,
        difficulty: 3,
        functionCount: 2,
        nestedDepth: 1,
        parameters: { formula: 'IFERROR+VLOOKUP' },
        fingerprintParts: {
          templateId: 'L3_IFERROR_VLOOKUP',
          formula: 'IFERROR+VLOOKUP',
          targetRow: String(rowIdx),
        },
      });
    },
  },
];

function buildIndexMatch(ctx, keyCol, valCol, keyLabel, valLabel) {
  const rowIdx = Math.floor(Math.random() * ctx.rows.length);
  const lookupCode = ctx.rows[rowIdx][keyCol];
  const lookupAddr = cellAddress(keyCol, ctx.dataStartRowIndex + rowIdx);
  const expectedValue = ctx.rows[rowIdx][valCol];
  const keyRange = rangeRef(keyCol, ctx.dataStartRowIndex, ctx.rows.length);
  const valRange = rangeRef(valCol, ctx.dataStartRowIndex, ctx.rows.length);
  const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, valCol, ctx.usedTargets);
  return baseQuestion({
    level: 3,
    templateId: 'L3_INDEX_MATCH_NAMA',
    category: 'lookup',
    title: `INDEX+MATCH ${valLabel} — ${lookupCode}`,
    instruction: `Dari ${keyLabel} di sel ${lookupAddr}, ambil ${valLabel} yang sesuai menggunakan INDEX dan MATCH.`,
    targetCell,
    expectedValue,
    requiredRefs: [lookupAddr],
    acceptedFunctions: ['INDEX', 'MATCH', 'VLOOKUP', 'XLOOKUP'],
    expectedFormula: `=INDEX(${valRange},MATCH(${lookupAddr},${keyRange},0))`,
    hints: [
      'MATCH mencari posisi, INDEX mengambil nilai di posisi tersebut.',
      'Fungsi: INDEX + MATCH.',
    ],
    explanation: `${keyLabel} ${lookupCode} → ${valLabel} "${expectedValue}".`,
    points: 20,
    difficulty: 3,
    functionCount: 2,
    nestedDepth: 1,
    parameters: { lookupCode, formula: 'INDEX+MATCH' },
    fingerprintParts: {
      templateId: 'L3_INDEX_MATCH_NAMA',
      formula: 'INDEX+MATCH',
      criteriaValues: String(lookupCode),
      targetRow: String(rowIdx),
    },
  });
}

// ---------------------------------------------------------------------------
// LEVEL 4 — Multi-criteria (SUMIFS, COUNTIFS, IF+AND/OR)
// ---------------------------------------------------------------------------

export const LEVEL4_TEMPLATES = [
  {
    id: 'L4_SUMIFS_2CRIT',
    category: 'multi_criteria',
    build: (ctx) => {
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if (catCol === -1 || wilCol === -1 || sumCol === -1) return null;
      const cats = uniqueValues(ctx.rows, catCol);
      const wils = uniqueValues(ctx.rows, wilCol);
      if (!cats.length || !wils.length) return null;
      // find a pair that actually has data
      let kategori, wilayah, expectedValue, attempts = 0;
      do {
        kategori = pick(cats);
        wilayah = pick(wils);
        expectedValue = ctx.rows.reduce((s, r) => (
          r[catCol] === kategori && r[wilCol] === wilayah ? s + (Number(r[sumCol]) || 0) : s
        ), 0);
        attempts++;
      } while (expectedValue === 0 && attempts < 30);
      if (expectedValue === 0 && attempts >= 30) {
        // allow zero but prefer non-zero; still valid
      }
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const wilRange = rangeRef(wilCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_SUMIFS_2CRIT',
        category: 'multi_criteria',
        title: `Total ${kategori} — ${wilayah}`,
        instruction: pick([
          `Hitung total penjualan untuk kategori "${kategori}" di wilayah "${wilayah}".`,
          `Manajer ingin mengetahui Total Penjualan kategori ${kategori} yang berasal dari ${wilayah}.`,
          `Jumlahkan Total Penjualan dengan dua kriteria: Kategori="${kategori}" dan Wilayah="${wilayah}".`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: sumCol,
        expectedColumnLabel: 'Total Penjualan',
        acceptedFunctions: ['SUMIFS'],
        expectedFormula: `=SUMIFS(${sumRange},${catRange},"${kategori}",${wilRange},"${wilayah}")`,
        hints: [
          'Anda perlu menjumlahkan nilai berdasarkan DUA kriteria sekaligus.',
          'Fungsi yang relevan: SUMIFS.',
          `Struktur: =SUMIFS(sum_range, criteria_range1, criteria1, criteria_range2, criteria2)`,
        ],
        explanation: `Total Penjualan kategori "${kategori}" di "${wilayah}" = ${fmtRp(expectedValue)}.`,
        points: 25,
        difficulty: 4,
        functionCount: 1,
        conditionCount: 2,
        parameters: { kategori, wilayah, formula: 'SUMIFS' },
        fingerprintParts: {
          templateId: 'L4_SUMIFS_2CRIT',
          formula: 'SUMIFS',
          targetColumn: 'Total Penjualan',
          criteria: 'Kategori+Wilayah',
          criteriaValues: `${kategori}|${wilayah}`,
        },
      });
    },
  },
  {
    id: 'L4_COUNTIFS_2CRIT',
    category: 'multi_criteria',
    build: (ctx) => {
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      if (catCol === -1 || wilCol === -1) return null;
      const cats = uniqueValues(ctx.rows, catCol);
      const wils = uniqueValues(ctx.rows, wilCol);
      const kategori = pick(cats);
      const wilayah = pick(wils);
      const expectedValue = ctx.rows.filter((r) => r[catCol] === kategori && r[wilCol] === wilayah).length;
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const wilRange = rangeRef(wilCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, catCol, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_COUNTIFS_2CRIT',
        category: 'multi_criteria',
        title: `Jumlah ${kategori} di ${wilayah}`,
        instruction: `Hitung jumlah transaksi kategori "${kategori}" di wilayah "${wilayah}".`,
        targetCell,
        expectedValue,
        acceptedFunctions: ['COUNTIFS'],
        expectedFormula: `=COUNTIFS(${catRange},"${kategori}",${wilRange},"${wilayah}")`,
        hints: [
          'Hitung baris yang memenuhi dua kriteria sekaligus.',
          'Fungsi: COUNTIFS.',
          'Struktur: =COUNTIFS(range1, crit1, range2, crit2)',
        ],
        explanation: `Ada ${expectedValue} transaksi kategori "${kategori}" di "${wilayah}".`,
        points: 25,
        difficulty: 4,
        conditionCount: 2,
        parameters: { kategori, wilayah, formula: 'COUNTIFS' },
        fingerprintParts: {
          templateId: 'L4_COUNTIFS_2CRIT',
          formula: 'COUNTIFS',
          criteria: 'Kategori+Wilayah',
          criteriaValues: `${kategori}|${wilayah}`,
        },
      });
    },
  },
  {
    id: 'L4_COUNTIFS_NUM',
    category: 'multi_criteria',
    build: (ctx) => {
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const totCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if (catCol === -1 || totCol === -1) return null;
      const cats = uniqueValues(ctx.rows, catCol);
      const kategori = pick(cats);
      const values = ctx.rows.map((r) => r[totCol]).filter((v) => typeof v === 'number');
      const threshold = Math.round((values.reduce((a, b) => a + b, 0) / values.length) / 100000) * 100000 || 5000000;
      const expectedValue = ctx.rows.filter((r) => r[catCol] === kategori && Number(r[totCol]) > threshold).length;
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const totRange = rangeRef(totCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, totCol, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_COUNTIFS_NUM',
        category: 'multi_criteria',
        title: `${kategori} di atas Rp${fmtRp(threshold)}`,
        instruction: `Hitung jumlah transaksi kategori "${kategori}" dengan Total Penjualan di atas Rp${fmtRp(threshold)}.`,
        targetCell,
        expectedValue,
        acceptedFunctions: ['COUNTIFS'],
        expectedFormula: `=COUNTIFS(${catRange},"${kategori}",${totRange},">${threshold}")`,
        hints: [
          'Gabungkan kriteria teks dan kriteria numerik (operator >).',
          'Fungsi: COUNTIFS.',
        ],
        explanation: `Ada ${expectedValue} transaksi ${kategori} dengan Total Penjualan > ${fmtRp(threshold)}.`,
        points: 25,
        difficulty: 4,
        conditionCount: 2,
        parameters: { kategori, threshold, formula: 'COUNTIFS' },
        fingerprintParts: {
          templateId: 'L4_COUNTIFS_NUM',
          formula: 'COUNTIFS',
          criteriaValues: `${kategori}|>${threshold}`,
        },
      });
    },
  },
  {
    id: 'L4_SUMIFS_SALES',
    category: 'multi_criteria',
    build: (ctx) => {
      const salesCol = colIndexOf(ctx.headers, 'Nama Sales');
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if (salesCol === -1 || catCol === -1 || sumCol === -1) return null;
      const sales = uniqueValues(ctx.rows, salesCol);
      const cats = uniqueValues(ctx.rows, catCol);
      const salesName = pick(sales);
      const kategori = pick(cats);
      const expectedValue = ctx.rows.reduce((s, r) => (
        r[salesCol] === salesName && r[catCol] === kategori ? s + (Number(r[sumCol]) || 0) : s
      ), 0);
      const salesRange = rangeRef(salesCol, ctx.dataStartRowIndex, ctx.rows.length);
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_SUMIFS_SALES',
        category: 'multi_criteria',
        title: `Total ${kategori} oleh ${salesName}`,
        instruction: `Hitung total penjualan kategori "${kategori}" yang ditangani oleh sales "${salesName}".`,
        targetCell,
        expectedValue,
        expectedColIndex: sumCol,
        expectedColumnLabel: 'Total Penjualan',
        acceptedFunctions: ['SUMIFS'],
        expectedFormula: `=SUMIFS(${sumRange},${catRange},"${kategori}",${salesRange},"${salesName}")`,
        hints: [
          'Dua kriteria: kategori produk dan nama sales.',
          'Fungsi: SUMIFS.',
        ],
        explanation: `Total ${kategori} oleh ${salesName} = ${fmtRp(expectedValue)}.`,
        points: 25,
        difficulty: 4,
        conditionCount: 2,
        parameters: { kategori, salesName, formula: 'SUMIFS' },
        fingerprintParts: {
          templateId: 'L4_SUMIFS_SALES',
          formula: 'SUMIFS',
          criteriaValues: `${kategori}|${salesName}`,
        },
      });
    },
  },
  {
    id: 'L4_IF_AND',
    category: 'multi_criteria',
    build: (ctx) => {
      const totCol = colIndexOf(ctx.headers, 'Total Penjualan');
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      if (totCol === -1 || wilCol === -1) return null;
      const values = ctx.rows.map((r) => r[totCol]).filter((v) => typeof v === 'number');
      const threshold = Math.round((values.reduce((a, b) => a + b, 0) / values.length) / 100000) * 100000 || 5000000;
      const wils = uniqueValues(ctx.rows, wilCol);
      const wilayah = pick(wils);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const totAddr = cellAddress(totCol, ctx.dataStartRowIndex + rowIdx);
      const wilAddr = cellAddress(wilCol, ctx.dataStartRowIndex + rowIdx);
      const totVal = ctx.rows[rowIdx][totCol];
      const wilVal = ctx.rows[rowIdx][wilCol];
      const expectedValue = (Number(totVal) >= threshold && wilVal === wilayah) ? 'Ya' : 'Tidak';
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, totCol, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_IF_AND',
        category: 'multi_criteria',
        title: `Cek Prioritas Baris ${rowIdx + 1}`,
        instruction: `Pada baris ke-${rowIdx + 1}, tampilkan "Ya" jika Total Penjualan (${totAddr}) >= ${fmtRp(threshold)} DAN Wilayah (${wilAddr}) = "${wilayah}", selain itu "Tidak".`,
        targetCell,
        expectedValue,
        requiredRefs: [totAddr, wilAddr],
        acceptedFunctions: ['IF', 'AND'],
        expectedFormula: `=IF(AND(${totAddr}>=${threshold},${wilAddr}="${wilayah}"),"Ya","Tidak")`,
        hints: [
          'Gabungkan dua kondisi dengan AND di dalam IF.',
          'Fungsi: IF + AND.',
        ],
        explanation: `Total=${fmtNum(totVal)}, Wilayah="${wilVal}" → "${expectedValue}".`,
        points: 25,
        difficulty: 4,
        functionCount: 2,
        conditionCount: 2,
        nestedDepth: 1,
        parameters: { threshold, wilayah, formula: 'IF+AND' },
        fingerprintParts: {
          templateId: 'L4_IF_AND',
          formula: 'IF+AND',
          criteriaValues: `${threshold}|${wilayah}`,
          targetRow: String(rowIdx),
        },
      });
    },
  },
  {
    id: 'L4_SUMIFS_DISKON',
    category: 'multi_criteria',
    build: (ctx) => {
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const diskCol = colIndexOf(ctx.headers, 'Diskon (%)');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if (catCol === -1 || diskCol === -1 || sumCol === -1) return null;
      const cats = uniqueValues(ctx.rows, catCol);
      const kategori = pick(cats);
      const minDiskon = 5;
      const expectedValue = ctx.rows.reduce((s, r) => (
        r[catCol] === kategori && Number(r[diskCol]) >= minDiskon ? s + (Number(r[sumCol]) || 0) : s
      ), 0);
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const diskRange = rangeRef(diskCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_SUMIFS_DISKON',
        category: 'multi_criteria',
        title: `${kategori} dengan Diskon ≥ ${minDiskon}%`,
        instruction: `Hitung total penjualan kategori "${kategori}" yang mendapat diskon minimal ${minDiskon}%.`,
        targetCell,
        expectedValue,
        expectedColIndex: sumCol,
        expectedColumnLabel: 'Total Penjualan',
        acceptedFunctions: ['SUMIFS'],
        expectedFormula: `=SUMIFS(${sumRange},${catRange},"${kategori}",${diskRange},">=${minDiskon}")`,
        hints: [
          'Kriteria teks + kriteria numerik dengan operator >=.',
          'Fungsi: SUMIFS.',
        ],
        explanation: `Total ${kategori} dengan diskon ≥ ${minDiskon}% = ${fmtRp(expectedValue)}.`,
        points: 25,
        difficulty: 4,
        conditionCount: 2,
        parameters: { kategori, minDiskon, formula: 'SUMIFS' },
        fingerprintParts: {
          templateId: 'L4_SUMIFS_DISKON',
          formula: 'SUMIFS',
          criteriaValues: `${kategori}|>=${minDiskon}`,
        },
      });
    },
  },
  {
    id: 'L4_INVENTORY_SUMIFS',
    category: 'multi_criteria',
    build: (ctx) => {
      const katCol = colIndexOf(ctx.headers, 'Kategori');
      const satCol = colIndexOf(ctx.headers, 'Satuan');
      const sumCol = colIndexOf(ctx.headers, 'Nilai Persediaan');
      if (katCol === -1 || satCol === -1 || sumCol === -1) return null;
      const cats = uniqueValues(ctx.rows, katCol);
      const sats = uniqueValues(ctx.rows, satCol);
      const kategori = pick(cats);
      const satuan = pick(sats);
      const expectedValue = ctx.rows.reduce((s, r) => (
        r[katCol] === kategori && r[satCol] === satuan ? s + (Number(r[sumCol]) || 0) : s
      ), 0);
      const katRange = rangeRef(katCol, ctx.dataStartRowIndex, ctx.rows.length);
      const satRange = rangeRef(satCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_INVENTORY_SUMIFS',
        category: 'multi_criteria',
        title: `Nilai Persediaan ${kategori} — ${satuan}`,
        instruction: `Hitung total Nilai Persediaan untuk kategori "${kategori}" dengan satuan "${satuan}".`,
        targetCell,
        expectedValue,
        expectedColIndex: sumCol,
        expectedColumnLabel: 'Nilai Persediaan',
        acceptedFunctions: ['SUMIFS'],
        expectedFormula: `=SUMIFS(${sumRange},${katRange},"${kategori}",${satRange},"${satuan}")`,
        hints: [
          'Dua kriteria pada data persediaan.',
          'Fungsi: SUMIFS.',
        ],
        explanation: `Nilai Persediaan ${kategori}/${satuan} = ${fmtRp(expectedValue)}.`,
        points: 25,
        difficulty: 4,
        conditionCount: 2,
        parameters: { kategori, satuan, formula: 'SUMIFS' },
        fingerprintParts: {
          templateId: 'L4_INVENTORY_SUMIFS',
          formula: 'SUMIFS',
          criteriaValues: `${kategori}|${satuan}`,
        },
      });
    },
  },
];

// ---------------------------------------------------------------------------
// LEVEL 5 — Nested / analytical
// ---------------------------------------------------------------------------

export const LEVEL5_TEMPLATES = [
  {
    id: 'L5_NESTED_IF_STATUS',
    category: 'nested_logic',
    build: (ctx) => {
      const totCol = colIndexOf(ctx.headers, 'Total Penjualan');
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      if (totCol === -1 || wilCol === -1) return null;
      const values = ctx.rows.map((r) => r[totCol]).filter((v) => typeof v === 'number');
      const high = Math.round((Math.max(...values) * 0.7) / 100000) * 100000 || 10000000;
      const mid = Math.round(high / 2);
      const priorityWils = ['Jawa Barat', 'DKI Jakarta', 'Banten'].filter((w) =>
        ctx.rows.some((r) => r[wilCol] === w)
      );
      if (!priorityWils.length) priorityWils.push(uniqueValues(ctx.rows, wilCol)[0]);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const totAddr = cellAddress(totCol, ctx.dataStartRowIndex + rowIdx);
      const wilAddr = cellAddress(wilCol, ctx.dataStartRowIndex + rowIdx);
      const totVal = Number(ctx.rows[rowIdx][totCol]);
      const wilVal = ctx.rows[rowIdx][wilCol];
      let expectedValue = 'Biasa';
      if (totVal >= high && priorityWils.includes(wilVal)) expectedValue = 'Prioritas';
      else if (totVal >= mid) expectedValue = 'Normal';
      const orParts = priorityWils.map((w) => `${wilAddr}="${w}"`).join(',');
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, totCol, ctx.usedTargets);
      const formula = `=IF(AND(${totAddr}>=${high},OR(${orParts})),"Prioritas",IF(${totAddr}>=${mid},"Normal","Biasa"))`;
      return baseQuestion({
        level: 5,
        templateId: 'L5_NESTED_IF_STATUS',
        category: 'nested_logic',
        title: `Status Prioritas Baris ${rowIdx + 1}`,
        instruction: `Tentukan status transaksi baris ke-${rowIdx + 1}:
• "Prioritas" jika Total Penjualan (${totAddr}) >= ${fmtRp(high)} DAN wilayah (${wilAddr}) salah satu dari: ${priorityWils.join(', ')}
• "Normal" jika Total Penjualan >= ${fmtRp(mid)}
• "Biasa" jika di bawahnya.`,
        targetCell,
        expectedValue,
        requiredRefs: [totAddr, wilAddr],
        acceptedFunctions: ['IF', 'AND', 'OR'],
        expectedFormula: formula,
        hints: [
          'Anda membangun logika bertingkat dengan beberapa kondisi.',
          'Kombinasi: IF + AND + OR (nested IF).',
          'Struktur: =IF(AND(...), "Prioritas", IF(..., "Normal", "Biasa"))',
        ],
        explanation: `Total=${fmtRp(totVal)}, Wilayah="${wilVal}" → status "${expectedValue}".`,
        points: 30,
        difficulty: 5,
        functionCount: 3,
        conditionCount: 3,
        nestedDepth: 2,
        parameters: { high, mid, priorityWils, formula: 'nested-IF' },
        fingerprintParts: {
          templateId: 'L5_NESTED_IF_STATUS',
          formula: 'IF+AND+OR',
          targetRow: String(rowIdx),
          criteriaValues: `${high}|${mid}`,
        },
      });
    },
  },
  {
    id: 'L5_SUMIFS_3CRIT',
    category: 'multi_criteria',
    build: (ctx) => {
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      const diskCol = colIndexOf(ctx.headers, 'Diskon (%)');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if ([catCol, wilCol, diskCol, sumCol].some((c) => c === -1)) return null;
      const kategori = pick(uniqueValues(ctx.rows, catCol));
      const wilayah = pick(uniqueValues(ctx.rows, wilCol));
      const minDiskon = 5;
      const expectedValue = ctx.rows.reduce((s, r) => (
        r[catCol] === kategori && r[wilCol] === wilayah && Number(r[diskCol]) >= minDiskon
          ? s + (Number(r[sumCol]) || 0) : s
      ), 0);
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const wilRange = rangeRef(wilCol, ctx.dataStartRowIndex, ctx.rows.length);
      const diskRange = rangeRef(diskCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      return baseQuestion({
        level: 5,
        templateId: 'L5_SUMIFS_3CRIT',
        category: 'multi_criteria',
        title: `${kategori} · ${wilayah} · Diskon≥${minDiskon}%`,
        instruction: `Hitung total penjualan kategori "${kategori}" di wilayah "${wilayah}" yang memiliki diskon minimal ${minDiskon}%.`,
        targetCell,
        expectedValue,
        expectedColIndex: sumCol,
        expectedColumnLabel: 'Total Penjualan',
        acceptedFunctions: ['SUMIFS'],
        expectedFormula: `=SUMIFS(${sumRange},${catRange},"${kategori}",${wilRange},"${wilayah}",${diskRange},">=${minDiskon}")`,
        hints: [
          'Tiga kriteria sekaligus: kategori, wilayah, dan diskon.',
          'Fungsi: SUMIFS dengan 3 pasangan kriteria.',
        ],
        explanation: `Hasil = ${fmtRp(expectedValue)}.`,
        points: 30,
        difficulty: 5,
        conditionCount: 3,
        parameters: { kategori, wilayah, minDiskon, formula: 'SUMIFS' },
        fingerprintParts: {
          templateId: 'L5_SUMIFS_3CRIT',
          formula: 'SUMIFS',
          criteriaValues: `${kategori}|${wilayah}|>=${minDiskon}`,
        },
      });
    },
  },
  {
    id: 'L5_IFERROR_INDEX_MATCH',
    category: 'lookup_safe',
    build: (ctx) => {
      const kodeCol = colIndexOf(ctx.headers, 'Kode Produk');
      const namaCol = colIndexOf(ctx.headers, 'Nama Produk');
      if (kodeCol === -1 || namaCol === -1) return null;
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const lookupAddr = cellAddress(kodeCol, ctx.dataStartRowIndex + rowIdx);
      const expectedValue = ctx.rows[rowIdx][namaCol];
      const keyRange = rangeRef(kodeCol, ctx.dataStartRowIndex, ctx.rows.length);
      const valRange = rangeRef(namaCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, namaCol, ctx.usedTargets);
      const inner = `INDEX(${valRange},MATCH(${lookupAddr},${keyRange},0))`;
      return baseQuestion({
        level: 5,
        templateId: 'L5_IFERROR_INDEX_MATCH',
        category: 'lookup_safe',
        title: 'Lookup Aman INDEX+MATCH',
        instruction: `Ambil Nama Produk dari Kode Produk di ${lookupAddr}. Jika gagal, tampilkan "N/A". Gunakan IFERROR + INDEX + MATCH.`,
        targetCell,
        expectedValue,
        requiredRefs: [lookupAddr],
        acceptedFunctions: ['IFERROR', 'INDEX', 'MATCH'],
        expectedFormula: `=IFERROR(${inner},"N/A")`,
        hints: [
          'Lindungi INDEX+MATCH dengan IFERROR.',
          'Fungsi: IFERROR, INDEX, MATCH.',
        ],
        explanation: `Hasil lookup: "${expectedValue}".`,
        points: 30,
        difficulty: 5,
        functionCount: 3,
        nestedDepth: 2,
        parameters: { formula: 'IFERROR+INDEX+MATCH' },
        fingerprintParts: {
          templateId: 'L5_IFERROR_INDEX_MATCH',
          formula: 'IFERROR+INDEX+MATCH',
          targetRow: String(rowIdx),
        },
      });
    },
  },
  {
    id: 'L5_IF_OR_THRESHOLD',
    category: 'nested_logic',
    build: (ctx) => {
      const totCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if (totCol === -1) return null;
      const values = ctx.rows.map((r) => r[totCol]).filter((v) => typeof v === 'number');
      const t1 = Math.round((Math.max(...values) * 0.8) / 100000) * 100000 || 15000000;
      const t2 = Math.round(t1 / 3);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const addr = cellAddress(totCol, ctx.dataStartRowIndex + rowIdx);
      const val = Number(ctx.rows[rowIdx][totCol]);
      const expectedValue = val >= t1 ? 'Premium' : (val >= t2 ? 'Standar' : 'Dasar');
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, totCol, ctx.usedTargets);
      return baseQuestion({
        level: 5,
        templateId: 'L5_IF_OR_THRESHOLD',
        category: 'nested_logic',
        title: `Klasifikasi Nilai Baris ${rowIdx + 1}`,
        instruction: `Klasifikasikan Total Penjualan di ${addr}: "Premium" jika >= ${fmtRp(t1)}, "Standar" jika >= ${fmtRp(t2)}, selain itu "Dasar".`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['IF'],
        expectedFormula: `=IF(${addr}>=${t1},"Premium",IF(${addr}>=${t2},"Standar","Dasar"))`,
        hints: [
          'Nested IF untuk tiga tingkat klasifikasi.',
          'Fungsi: IF bersarang.',
        ],
        explanation: `Nilai ${fmtRp(val)} → "${expectedValue}".`,
        points: 28,
        difficulty: 5,
        functionCount: 2,
        nestedDepth: 2,
        conditionCount: 2,
        parameters: { t1, t2, formula: 'nested-IF' },
        fingerprintParts: {
          templateId: 'L5_IF_OR_THRESHOLD',
          formula: 'nested-IF',
          targetRow: String(rowIdx),
          criteriaValues: `${t1}|${t2}`,
        },
      });
    },
  },
];

// ---------------------------------------------------------------------------
// LEVEL 6 — Business scenarios
// ---------------------------------------------------------------------------

export const LEVEL6_TEMPLATES = [
  {
    id: 'L6_TARGET_STATUS',
    category: 'business_case',
    build: (ctx) => {
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if ([catCol, wilCol, sumCol].some((c) => c === -1)) return null;
      const kategori = pick(uniqueValues(ctx.rows, catCol));
      const wilayah = pick(uniqueValues(ctx.rows, wilCol));
      const total = ctx.rows.reduce((s, r) => (
        r[catCol] === kategori && r[wilCol] === wilayah ? s + (Number(r[sumCol]) || 0) : s
      ), 0);
      const targetHigh = Math.max(100000000, Math.round(total * 1.2 / 1000000) * 1000000);
      const targetMid = Math.round(targetHigh * 0.75);
      let status = 'Belum Tercapai';
      if (total >= targetHigh) status = 'Target Tercapai';
      else if (total >= targetMid) status = 'Hampir Tercapai';
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const wilRange = rangeRef(wilCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      // expected formula is the IF wrapping SUMIFS
      const sumifs = `SUMIFS(${sumRange},${catRange},"${kategori}",${wilRange},"${wilayah}")`;
      const formula = `=IF(${sumifs}>=${targetHigh},"Target Tercapai",IF(${sumifs}>=${targetMid},"Hampir Tercapai","Belum Tercapai"))`;
      return baseQuestion({
        level: 6,
        templateId: 'L6_TARGET_STATUS',
        category: 'business_case',
        businessScenario: true,
        title: `Status Target ${kategori} — ${wilayah}`,
        instruction: `Manajemen ingin mengetahui pencapaian penjualan kategori "${kategori}" di wilayah "${wilayah}".
Hitung total penjualannya, lalu tampilkan status:
• "Target Tercapai" jika total >= Rp${fmtRp(targetHigh)}
• "Hampir Tercapai" jika total >= Rp${fmtRp(targetMid)}
• "Belum Tercapai" selain itu.
Gunakan formula yang sesuai (disarankan kombinasi agregasi multi-kriteria + logika).`,
        targetCell,
        expectedValue: status,
        acceptedFunctions: ['SUMIFS', 'IF'],
        expectedFormula: formula,
        hints: [
          'Ini adalah kasus bisnis: agregasi multi-kriteria lalu klasifikasi hasilnya.',
          'Pertimbangkan SUMIFS untuk total, lalu bungkus dengan IF bersarang.',
          'Struktur: =IF(SUMIFS(...)>=target1, "Target Tercapai", IF(SUMIFS(...)>=target2, "Hampir Tercapai", "Belum Tercapai"))',
        ],
        explanation: `Total ${kategori}/${wilayah} = ${fmtRp(total)} → status "${status}" (target tinggi ${fmtRp(targetHigh)}, menengah ${fmtRp(targetMid)}).`,
        points: 40,
        difficulty: 6,
        functionCount: 3,
        conditionCount: 4,
        nestedDepth: 2,
        parameters: { kategori, wilayah, targetHigh, targetMid, total, formula: 'SUMIFS+IF' },
        fingerprintParts: {
          templateId: 'L6_TARGET_STATUS',
          formula: 'SUMIFS+IF',
          criteriaValues: `${kategori}|${wilayah}|${targetHigh}`,
          scenario: 'target-status',
        },
      });
    },
  },
  {
    id: 'L6_AVG_FILTERED',
    category: 'business_case',
    build: (ctx) => {
      // Average of Total Penjualan for category + region using SUMIFS/COUNTIFS pattern
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if ([catCol, wilCol, sumCol].some((c) => c === -1)) return null;
      const kategori = pick(uniqueValues(ctx.rows, catCol));
      const wilayah = pick(uniqueValues(ctx.rows, wilCol));
      const filtered = ctx.rows.filter((r) => r[catCol] === kategori && r[wilCol] === wilayah);
      if (!filtered.length) return null;
      const total = filtered.reduce((s, r) => s + (Number(r[sumCol]) || 0), 0);
      const expectedValue = Math.round((total / filtered.length) * 100) / 100;
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const wilRange = rangeRef(wilCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      // Without AVERAGEIFS, use SUMIFS/COUNTIFS
      const formula = `=SUMIFS(${sumRange},${catRange},"${kategori}",${wilRange},"${wilayah}")/COUNTIFS(${catRange},"${kategori}",${wilRange},"${wilayah}")`;
      return baseQuestion({
        level: 6,
        templateId: 'L6_AVG_FILTERED',
        category: 'business_case',
        businessScenario: true,
        title: `Rata-rata ${kategori} di ${wilayah}`,
        instruction: `Sales Analyst membutuhkan rata-rata Total Penjualan untuk transaksi kategori "${kategori}" di wilayah "${wilayah}".
Hitung dengan formula yang memfilter kedua kriteria tersebut.`,
        targetCell,
        expectedValue,
        expectedColIndex: sumCol,
        expectedColumnLabel: 'Total Penjualan',
        acceptedFunctions: ['SUMIFS', 'COUNTIFS', 'AVERAGE'],
        expectedFormula: formula,
        hints: [
          'Rata-rata bersyarat = total bersyarat ÷ jumlah baris bersyarat.',
          'Kombinasi: SUMIFS / COUNTIFS.',
        ],
        explanation: `Rata-rata dari ${filtered.length} transaksi = ${fmtNum(expectedValue)}.`,
        points: 40,
        difficulty: 6,
        functionCount: 2,
        conditionCount: 2,
        nestedDepth: 0,
        parameters: { kategori, wilayah, formula: 'SUMIFS/COUNTIFS' },
        fingerprintParts: {
          templateId: 'L6_AVG_FILTERED',
          formula: 'SUMIFS/COUNTIFS',
          criteriaValues: `${kategori}|${wilayah}`,
          scenario: 'avg-filtered',
        },
      });
    },
  },
  {
    id: 'L6_DISKON_ANALYSIS',
    category: 'business_case',
    build: (ctx) => {
      const catCol = colIndexOf(ctx.headers, 'Kategori');
      const diskCol = colIndexOf(ctx.headers, 'Diskon (%)');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if ([catCol, diskCol, sumCol].some((c) => c === -1)) return null;
      const kategori = pick(uniqueValues(ctx.rows, catCol));
      const minDiskon = 5;
      const total = ctx.rows.reduce((s, r) => (
        r[catCol] === kategori && Number(r[diskCol]) >= minDiskon ? s + (Number(r[sumCol]) || 0) : s
      ), 0);
      const threshold = Math.max(50000000, Math.round(total * 0.9 / 1000000) * 1000000);
      const status = total >= threshold ? 'Promosi Efektif' : 'Perlu Evaluasi';
      const catRange = rangeRef(catCol, ctx.dataStartRowIndex, ctx.rows.length);
      const diskRange = rangeRef(diskCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      const sumifs = `SUMIFS(${sumRange},${catRange},"${kategori}",${diskRange},">=${minDiskon}")`;
      const formula = `=IF(${sumifs}>=${threshold},"Promosi Efektif","Perlu Evaluasi")`;
      return baseQuestion({
        level: 6,
        templateId: 'L6_DISKON_ANALYSIS',
        category: 'business_case',
        businessScenario: true,
        title: `Evaluasi Promosi ${kategori}`,
        instruction: `Tim Marketing ingin mengevaluasi efektivitas diskon pada kategori "${kategori}".
Hitung total penjualan yang mendapat diskon minimal ${minDiskon}%, lalu:
• "Promosi Efektif" jika total >= Rp${fmtRp(threshold)}
• "Perlu Evaluasi" jika di bawahnya.`,
        targetCell,
        expectedValue: status,
        acceptedFunctions: ['SUMIFS', 'IF'],
        expectedFormula: formula,
        hints: [
          'Agregasi bersyarat lalu klasifikasi hasil bisnis.',
          'SUMIFS + IF.',
        ],
        explanation: `Total dengan diskon ≥${minDiskon}% = ${fmtRp(total)} → "${status}".`,
        points: 40,
        difficulty: 6,
        functionCount: 2,
        conditionCount: 3,
        nestedDepth: 1,
        businessScenario: true,
        parameters: { kategori, minDiskon, threshold, formula: 'SUMIFS+IF' },
        fingerprintParts: {
          templateId: 'L6_DISKON_ANALYSIS',
          formula: 'SUMIFS+IF',
          criteriaValues: `${kategori}|>=${minDiskon}|${threshold}`,
          scenario: 'diskon-eval',
        },
      });
    },
  },
  {
    id: 'L6_INVENTORY_STATUS',
    category: 'business_case',
    build: (ctx) => {
      const stokCol = colIndexOf(ctx.headers, 'Stok Akhir');
      if (stokCol === -1) return null;
      const values = ctx.rows.map((r) => r[stokCol]).filter((v) => typeof v === 'number');
      if (!values.length) return null;
      const low = Math.round(Math.min(...values) + (Math.max(...values) - Math.min(...values)) * 0.25);
      const high = Math.round(Math.min(...values) + (Math.max(...values) - Math.min(...values)) * 0.75);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const addr = cellAddress(stokCol, ctx.dataStartRowIndex + rowIdx);
      const val = Number(ctx.rows[rowIdx][stokCol]);
      let expectedValue = 'Aman';
      if (val < low) expectedValue = 'Kritis';
      else if (val > high) expectedValue = 'Berlebih';
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, stokCol, ctx.usedTargets);
      return baseQuestion({
        level: 6,
        templateId: 'L6_INVENTORY_STATUS',
        category: 'business_case',
        businessScenario: true,
        title: `Status Stok Baris ${rowIdx + 1}`,
        instruction: `Inventory Analyst menilai status stok akhir di ${addr}:
• "Kritis" jika Stok Akhir < ${low}
• "Berlebih" jika Stok Akhir > ${high}
• "Aman" selain itu.
Tulis formula nested IF yang sesuai.`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['IF'],
        expectedFormula: `=IF(${addr}<${low},"Kritis",IF(${addr}>${high},"Berlebih","Aman"))`,
        hints: [
          'Klasifikasi stok untuk keputusan restock.',
          'Nested IF dengan dua ambang batas.',
        ],
        explanation: `Stok=${val} → "${expectedValue}" (kritis<${low}, berlebih>${high}).`,
        points: 35,
        difficulty: 6,
        functionCount: 2,
        nestedDepth: 2,
        conditionCount: 2,
        businessScenario: true,
        parameters: { low, high, formula: 'nested-IF' },
        fingerprintParts: {
          templateId: 'L6_INVENTORY_STATUS',
          formula: 'nested-IF',
          targetRow: String(rowIdx),
          criteriaValues: `${low}|${high}`,
          scenario: 'stok-status',
        },
      });
    },
  },
  {
    id: 'L6_SALES_REGION_PERFORMANCE',
    category: 'business_case',
    build: (ctx) => {
      const wilCol = colIndexOf(ctx.headers, 'Wilayah');
      const sumCol = colIndexOf(ctx.headers, 'Total Penjualan');
      if (wilCol === -1 || sumCol === -1) return null;
      const wilayah = pick(uniqueValues(ctx.rows, wilCol));
      const total = ctx.rows.reduce((s, r) => (r[wilCol] === wilayah ? s + (Number(r[sumCol]) || 0) : s), 0);
      const allTotal = ctx.rows.reduce((s, r) => s + (Number(r[sumCol]) || 0), 0);
      const share = allTotal > 0 ? total / allTotal : 0;
      const expectedValue = share >= 0.15 ? 'Kontributor Utama' : (share >= 0.08 ? 'Kontributor Sedang' : 'Kontributor Kecil');
      const wilRange = rangeRef(wilCol, ctx.dataStartRowIndex, ctx.rows.length);
      const sumRange = rangeRef(sumCol, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sumCol, ctx.usedTargets);
      // Formula: IF(SUMIF/SUM >= 0.15, ...)
      const formula = `=IF(SUMIF(${wilRange},"${wilayah}",${sumRange})/SUM(${sumRange})>=0.15,"Kontributor Utama",IF(SUMIF(${wilRange},"${wilayah}",${sumRange})/SUM(${sumRange})>=0.08,"Kontributor Sedang","Kontributor Kecil"))`;
      return baseQuestion({
        level: 6,
        templateId: 'L6_SALES_REGION_PERFORMANCE',
        category: 'business_case',
        businessScenario: true,
        title: `Performa Wilayah ${wilayah}`,
        instruction: `Management meminta klasifikasi kontribusi wilayah "${wilayah}" terhadap total penjualan nasional:
• "Kontributor Utama" jika pangsa >= 15%
• "Kontributor Sedang" jika pangsa >= 8%
• "Kontributor Kecil" selain itu.
Hitung pangsa (total wilayah ÷ total keseluruhan) lalu klasifikasikan.`,
        targetCell,
        expectedValue,
        acceptedFunctions: ['SUMIF', 'SUM', 'IF'],
        expectedFormula: formula,
        hints: [
          'Pangsa = SUMIF(wilayah) / SUM(total).',
          'Lalu bungkus dengan nested IF untuk klasifikasi.',
        ],
        explanation: `Pangsa ${wilayah} = ${(share * 100).toFixed(1)}% → "${expectedValue}".`,
        points: 45,
        difficulty: 6,
        functionCount: 4,
        conditionCount: 2,
        nestedDepth: 2,
        businessScenario: true,
        parameters: { wilayah, share, formula: 'SUMIF/SUM+IF' },
        fingerprintParts: {
          templateId: 'L6_SALES_REGION_PERFORMANCE',
          formula: 'SUMIF/SUM+IF',
          criteriaValues: wilayah,
          scenario: 'region-share',
        },
      });
    },
  },
];

// ---------------------------------------------------------------------------
// GENERIC templates — work for accounting / HR / inventory / any dataset
// with at least 1 text column + 1 numeric column
// ---------------------------------------------------------------------------

/** Pick two distinct text columns with enough unique values */
function pickTwoTextCols(headers, rows, preferredPairs = []) {
  for (const [a, b] of preferredPairs) {
    const ia = headers.indexOf(a);
    const ib = headers.indexOf(b);
    if (ia !== -1 && ib !== -1) {
      const va = uniqueValues(rows, ia);
      const vb = uniqueValues(rows, ib);
      if (va.length >= 1 && vb.length >= 1) {
        return [
          { header: a, index: ia, values: va },
          { header: b, index: ib, values: vb },
        ];
      }
    }
  }
  const textCols = findTextColumns(headers, rows, []);
  if (textCols.length < 2) return null;
  // prefer columns with 2+ unique values
  const rich = textCols.filter((c) => uniqueValues(rows, c.index).length >= 2);
  const pool = rich.length >= 2 ? rich : textCols;
  if (pool.length < 2) return null;
  const c1 = pick(pool);
  const c2 = pick(pool.filter((c) => c.index !== c1.index));
  if (!c2) return null;
  return [
    { header: c1.header, index: c1.index, values: uniqueValues(rows, c1.index) },
    { header: c2.header, index: c2.index, values: uniqueValues(rows, c2.index) },
  ];
}

const GENERIC_L3 = [
  {
    id: 'L3_GENERIC_INDEX_MATCH',
    category: 'lookup',
    build: (ctx) => {
      // Find ID-like + name-like columns
      const pairs = [
        ['ID Jurnal', 'Akun'],
        ['ID Karyawan', 'Nama'],
        ['ID Barang', 'Nama Barang'],
        ['Kode Produk', 'Nama Produk'],
        ['ID Transaksi', 'Nama Pelanggan'],
      ];
      for (const [keyH, valH] of pairs) {
        const keyCol = colIndexOf(ctx.headers, keyH);
        const valCol = colIndexOf(ctx.headers, valH);
        if (keyCol === -1 || valCol === -1) continue;
        const rowIdx = Math.floor(Math.random() * ctx.rows.length);
        const lookupAddr = cellAddress(keyCol, ctx.dataStartRowIndex + rowIdx);
        const expectedValue = ctx.rows[rowIdx][valCol];
        const keyRange = rangeRef(keyCol, ctx.dataStartRowIndex, ctx.rows.length);
        const valRange = rangeRef(valCol, ctx.dataStartRowIndex, ctx.rows.length);
        const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, valCol, ctx.usedTargets);
        return baseQuestion({
          level: 3,
          templateId: 'L3_GENERIC_INDEX_MATCH',
          category: 'lookup',
          title: `Lookup ${valH} dari ${keyH}`,
          instruction: `Dari ${keyH} di sel ${lookupAddr}, ambil ${valH} yang sesuai menggunakan INDEX + MATCH.`,
          targetCell,
          expectedValue,
          requiredRefs: [lookupAddr],
          acceptedFunctions: ['INDEX', 'MATCH', 'VLOOKUP', 'XLOOKUP'],
          expectedFormula: `=INDEX(${valRange},MATCH(${lookupAddr},${keyRange},0))`,
          hints: [
            'MATCH mencari posisi kunci, INDEX mengambil nilai di posisi yang sama.',
            'Fungsi: INDEX + MATCH.',
          ],
          explanation: `${keyH} "${ctx.rows[rowIdx][keyCol]}" → ${valH} "${expectedValue}".`,
          points: 20,
          difficulty: 3,
          functionCount: 2,
          nestedDepth: 1,
          parameters: { formula: 'INDEX+MATCH' },
          fingerprintParts: {
            templateId: 'L3_GENERIC_INDEX_MATCH',
            formula: 'INDEX+MATCH',
            targetColumn: valH,
            targetRow: String(rowIdx),
          },
        });
      }
      return null;
    },
  },
];

const GENERIC_L4 = [
  {
    id: 'L4_GENERIC_SUMIFS',
    category: 'multi_criteria',
    build: (ctx) => {
      const pair = pickTwoTextCols(ctx.headers, ctx.rows, [
        ['Akun', 'Jenis'],
        ['Jenis', 'Akun'],
        ['Divisi', 'Status'],
        ['Divisi', 'Lokasi'],
        ['Jabatan', 'Divisi'],
        ['Kategori', 'Satuan'],
        ['Status', 'Lokasi'],
      ]);
      const sumCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Tunjangan', 'Potongan', 'Nilai Persediaan',
        'Stok Akhir', 'Total Penjualan', 'DPP',
      ]);
      if (!pair || !sumCols.length) return null;
      const [c1, c2] = pair;
      const sCol = pick(sumCols);
      const v1 = pick(c1.values);
      const v2 = pick(c2.values);
      const expectedValue = ctx.rows.reduce((s, r) => (
        r[c1.index] === v1 && r[c2.index] === v2 ? s + (Number(r[sCol.index]) || 0) : s
      ), 0);
      const r1 = rangeRef(c1.index, ctx.dataStartRowIndex, ctx.rows.length);
      const r2 = rangeRef(c2.index, ctx.dataStartRowIndex, ctx.rows.length);
      const sr = rangeRef(sCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sCol.index, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_GENERIC_SUMIFS',
        category: 'multi_criteria',
        title: `Total ${sCol.header} — ${c1.header}="${v1}", ${c2.header}="${v2}"`,
        instruction: pick([
          `Hitung total ${sCol.header} untuk ${c1.header}="${v1}" dan ${c2.header}="${v2}".`,
          `Jumlahkan ${sCol.header} dengan dua kriteria: ${c1.header}="${v1}" dan ${c2.header}="${v2}".`,
        ]),
        targetCell,
        expectedValue,
        expectedColIndex: sCol.index,
        expectedColumnLabel: sCol.header,
        acceptedFunctions: ['SUMIFS'],
        expectedFormula: `=SUMIFS(${sr},${r1},"${v1}",${r2},"${v2}")`,
        hints: [
          'Anda perlu menjumlahkan berdasarkan DUA kriteria.',
          'Fungsi: SUMIFS.',
          'Struktur: =SUMIFS(sum_range, range1, crit1, range2, crit2)',
        ],
        explanation: `Total ${sCol.header} untuk ${c1.header}="${v1}" & ${c2.header}="${v2}" = ${fmtNum(expectedValue)}.`,
        points: 25,
        difficulty: 4,
        conditionCount: 2,
        parameters: { formula: 'SUMIFS', c1: c1.header, c2: c2.header, v1, v2 },
        fingerprintParts: {
          templateId: 'L4_GENERIC_SUMIFS',
          formula: 'SUMIFS',
          targetColumn: sCol.header,
          criteria: `${c1.header}+${c2.header}`,
          criteriaValues: `${v1}|${v2}`,
        },
      });
    },
  },
  {
    id: 'L4_GENERIC_COUNTIFS',
    category: 'multi_criteria',
    build: (ctx) => {
      const pair = pickTwoTextCols(ctx.headers, ctx.rows, [
        ['Akun', 'Jenis'],
        ['Divisi', 'Status'],
        ['Divisi', 'Jabatan'],
        ['Kategori', 'Satuan'],
        ['Status', 'Lokasi'],
      ]);
      if (!pair) return null;
      const [c1, c2] = pair;
      const v1 = pick(c1.values);
      const v2 = pick(c2.values);
      const expectedValue = ctx.rows.filter((r) => r[c1.index] === v1 && r[c2.index] === v2).length;
      const r1 = rangeRef(c1.index, ctx.dataStartRowIndex, ctx.rows.length);
      const r2 = rangeRef(c2.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, c1.index, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_GENERIC_COUNTIFS',
        category: 'multi_criteria',
        title: `Jumlah ${c1.header}="${v1}" & ${c2.header}="${v2}"`,
        instruction: `Hitung berapa baris dengan ${c1.header}="${v1}" dan ${c2.header}="${v2}".`,
        targetCell,
        expectedValue,
        acceptedFunctions: ['COUNTIFS'],
        expectedFormula: `=COUNTIFS(${r1},"${v1}",${r2},"${v2}")`,
        hints: [
          'Hitung baris yang memenuhi dua kriteria.',
          'Fungsi: COUNTIFS.',
        ],
        explanation: `Terdapat ${expectedValue} baris yang memenuhi kedua kriteria.`,
        points: 25,
        difficulty: 4,
        conditionCount: 2,
        parameters: { formula: 'COUNTIFS', v1, v2 },
        fingerprintParts: {
          templateId: 'L4_GENERIC_COUNTIFS',
          formula: 'COUNTIFS',
          criteriaValues: `${v1}|${v2}`,
        },
      });
    },
  },
  {
    id: 'L4_GENERIC_IF_AND',
    category: 'multi_criteria',
    build: (ctx) => {
      const numCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Tunjangan', 'Stok Akhir', 'Nilai Persediaan', 'Total Penjualan',
      ]);
      const textCols = findTextColumns(ctx.headers, ctx.rows, [
        'Akun', 'Jenis', 'Divisi', 'Status', 'Kategori', 'Lokasi', 'Wilayah',
      ]);
      if (!numCols.length || !textCols.length) return null;
      const nCol = pick(numCols);
      const tCol = pick(textCols);
      const values = ctx.rows.map((r) => r[nCol.index]).filter((v) => typeof v === 'number');
      if (!values.length) return null;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const threshold = Math.round(avg / 10000) * 10000 || Math.round(avg);
      const textVals = uniqueValues(ctx.rows, tCol.index);
      const tVal = pick(textVals);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const nAddr = cellAddress(nCol.index, ctx.dataStartRowIndex + rowIdx);
      const tAddr = cellAddress(tCol.index, ctx.dataStartRowIndex + rowIdx);
      const nVal = ctx.rows[rowIdx][nCol.index];
      const tActual = ctx.rows[rowIdx][tCol.index];
      const expectedValue = (Number(nVal) >= threshold && tActual === tVal) ? 'Ya' : 'Tidak';
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, nCol.index, ctx.usedTargets);
      return baseQuestion({
        level: 4,
        templateId: 'L4_GENERIC_IF_AND',
        category: 'multi_criteria',
        title: `Cek Kondisi Baris ${rowIdx + 1}`,
        instruction: `Pada baris ke-${rowIdx + 1}, tampilkan "Ya" jika ${nCol.header} (${nAddr}) >= ${fmtNum(threshold)} DAN ${tCol.header} (${tAddr}) = "${tVal}", selain itu "Tidak".`,
        targetCell,
        expectedValue,
        requiredRefs: [nAddr, tAddr],
        acceptedFunctions: ['IF', 'AND'],
        expectedFormula: `=IF(AND(${nAddr}>=${threshold},${tAddr}="${tVal}"),"Ya","Tidak")`,
        hints: [
          'Gabungkan dua kondisi dengan AND di dalam IF.',
          'Fungsi: IF + AND.',
        ],
        explanation: `${nCol.header}=${fmtNum(nVal)}, ${tCol.header}="${tActual}" → "${expectedValue}".`,
        points: 25,
        difficulty: 4,
        functionCount: 2,
        conditionCount: 2,
        nestedDepth: 1,
        parameters: { threshold, tVal, formula: 'IF+AND' },
        fingerprintParts: {
          templateId: 'L4_GENERIC_IF_AND',
          formula: 'IF+AND',
          criteriaValues: `${threshold}|${tVal}`,
          targetRow: String(rowIdx),
        },
      });
    },
  },
];

const GENERIC_L5 = [
  {
    id: 'L5_GENERIC_NESTED_IF',
    category: 'nested_logic',
    build: (ctx) => {
      const numCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Tunjangan', 'Stok Akhir', 'Nilai Persediaan',
        'Total Penjualan', 'DPP', 'Harga Beli',
      ]);
      if (!numCols.length) return null;
      const col = pick(numCols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      if (values.length < 3) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const high = sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1];
      const mid = sorted[Math.floor(sorted.length * 0.4)] || sorted[0];
      const highR = Math.round(high / 1000) * 1000 || Math.round(high);
      const midR = Math.round(mid / 1000) * 1000 || Math.round(mid);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const addr = cellAddress(col.index, ctx.dataStartRowIndex + rowIdx);
      const val = Number(ctx.rows[rowIdx][col.index]);
      if (!Number.isFinite(val)) return null;
      let expectedValue = 'Rendah';
      if (val >= highR) expectedValue = 'Tinggi';
      else if (val >= midR) expectedValue = 'Sedang';
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 5,
        templateId: 'L5_GENERIC_NESTED_IF',
        category: 'nested_logic',
        title: `Klasifikasi ${col.header} Baris ${rowIdx + 1}`,
        instruction: `Klasifikasikan ${col.header} di sel ${addr}:
• "Tinggi" jika >= ${fmtNum(highR)}
• "Sedang" jika >= ${fmtNum(midR)}
• "Rendah" jika di bawahnya.
Gunakan nested IF.`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['IF'],
        expectedFormula: `=IF(${addr}>=${highR},"Tinggi",IF(${addr}>=${midR},"Sedang","Rendah"))`,
        hints: [
          'Nested IF untuk tiga tingkat klasifikasi.',
          'Fungsi: IF bersarang.',
          `Struktur: =IF(${addr}>=ambang1,"Tinggi",IF(${addr}>=ambang2,"Sedang","Rendah"))`,
        ],
        explanation: `Nilai ${fmtNum(val)} → "${expectedValue}".`,
        points: 30,
        difficulty: 5,
        functionCount: 2,
        nestedDepth: 2,
        conditionCount: 2,
        parameters: { highR, midR, formula: 'nested-IF' },
        fingerprintParts: {
          templateId: 'L5_GENERIC_NESTED_IF',
          formula: 'nested-IF',
          targetColumn: col.header,
          targetRow: String(rowIdx),
          criteriaValues: `${highR}|${midR}`,
        },
      });
    },
  },
  {
    id: 'L5_GENERIC_SUMIFS_2',
    category: 'multi_criteria',
    build: (ctx) => {
      const pair = pickTwoTextCols(ctx.headers, ctx.rows, [
        ['Akun', 'Jenis'],
        ['Divisi', 'Status'],
        ['Divisi', 'Lokasi'],
        ['Kategori', 'Satuan'],
        ['Jabatan', 'Divisi'],
      ]);
      const sumCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Tunjangan', 'Nilai Persediaan', 'Stok Akhir',
      ]);
      if (!pair || !sumCols.length) return null;
      const [c1, c2] = pair;
      const sCol = pick(sumCols);
      const v1 = pick(c1.values);
      const v2 = pick(c2.values);
      const expectedValue = ctx.rows.reduce((s, r) => (
        r[c1.index] === v1 && r[c2.index] === v2 ? s + (Number(r[sCol.index]) || 0) : s
      ), 0);
      const r1 = rangeRef(c1.index, ctx.dataStartRowIndex, ctx.rows.length);
      const r2 = rangeRef(c2.index, ctx.dataStartRowIndex, ctx.rows.length);
      const sr = rangeRef(sCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sCol.index, ctx.usedTargets);
      return baseQuestion({
        level: 5,
        templateId: 'L5_GENERIC_SUMIFS_2',
        category: 'multi_criteria',
        title: `Analisis ${sCol.header}: ${v1} × ${v2}`,
        instruction: `Hitung total ${sCol.header} untuk kombinasi ${c1.header}="${v1}" dan ${c2.header}="${v2}". Ini membutuhkan agregasi multi-kriteria.`,
        targetCell,
        expectedValue,
        expectedColIndex: sCol.index,
        expectedColumnLabel: sCol.header,
        acceptedFunctions: ['SUMIFS'],
        expectedFormula: `=SUMIFS(${sr},${r1},"${v1}",${r2},"${v2}")`,
        hints: [
          'Agregasi dengan dua kriteria dari kolom berbeda.',
          'Fungsi: SUMIFS.',
        ],
        explanation: `Hasil = ${fmtNum(expectedValue)}.`,
        points: 30,
        difficulty: 5,
        conditionCount: 2,
        functionCount: 1,
        nestedDepth: 0,
        // Soften: L5 allows SUMIFS multi-criteria as analytical
        parameters: { formula: 'SUMIFS' },
        fingerprintParts: {
          templateId: 'L5_GENERIC_SUMIFS_2',
          formula: 'SUMIFS',
          criteriaValues: `${v1}|${v2}`,
          targetColumn: sCol.header,
        },
      });
    },
  },
  {
    id: 'L5_GENERIC_IF_AND_OR',
    category: 'nested_logic',
    build: (ctx) => {
      const numCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Stok Akhir', 'Nilai Persediaan', 'Total Penjualan',
      ]);
      const textCols = findTextColumns(ctx.headers, ctx.rows, [
        'Akun', 'Jenis', 'Divisi', 'Status', 'Kategori', 'Lokasi',
      ]);
      if (!numCols.length || textCols.length < 1) return null;
      const nCol = pick(numCols);
      const tCol = pick(textCols);
      const values = ctx.rows.map((r) => r[nCol.index]).filter((v) => typeof v === 'number');
      const high = Math.round((Math.max(...values) * 0.6) / 1000) * 1000 || 1000000;
      const mid = Math.round(high / 2);
      const tVals = uniqueValues(ctx.rows, tCol.index);
      const priorityTexts = tVals.slice(0, Math.min(2, tVals.length));
      if (!priorityTexts.length) return null;
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const nAddr = cellAddress(nCol.index, ctx.dataStartRowIndex + rowIdx);
      const tAddr = cellAddress(tCol.index, ctx.dataStartRowIndex + rowIdx);
      const nVal = Number(ctx.rows[rowIdx][nCol.index]);
      const tVal = ctx.rows[rowIdx][tCol.index];
      let expectedValue = 'Biasa';
      if (nVal >= high && priorityTexts.includes(tVal)) expectedValue = 'Prioritas';
      else if (nVal >= mid) expectedValue = 'Normal';
      const orParts = priorityTexts.map((t) => `${tAddr}="${t}"`).join(',');
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, nCol.index, ctx.usedTargets);
      const formula = `=IF(AND(${nAddr}>=${high},OR(${orParts})),"Prioritas",IF(${nAddr}>=${mid},"Normal","Biasa"))`;
      return baseQuestion({
        level: 5,
        templateId: 'L5_GENERIC_IF_AND_OR',
        category: 'nested_logic',
        title: `Status Prioritas Baris ${rowIdx + 1}`,
        instruction: `Tentukan status baris ke-${rowIdx + 1}:
• "Prioritas" jika ${nCol.header} (${nAddr}) >= ${fmtNum(high)} DAN ${tCol.header} (${tAddr}) salah satu dari: ${priorityTexts.join(', ')}
• "Normal" jika ${nCol.header} >= ${fmtNum(mid)}
• "Biasa" selain itu.`,
        targetCell,
        expectedValue,
        requiredRefs: [nAddr, tAddr],
        acceptedFunctions: ['IF', 'AND', 'OR'],
        expectedFormula: formula,
        hints: [
          'Logika bertingkat: AND + OR di dalam nested IF.',
          'Fungsi: IF, AND, OR.',
        ],
        explanation: `${nCol.header}=${fmtNum(nVal)}, ${tCol.header}="${tVal}" → "${expectedValue}".`,
        points: 30,
        difficulty: 5,
        functionCount: 3,
        conditionCount: 3,
        nestedDepth: 2,
        parameters: { high, mid, formula: 'IF+AND+OR' },
        fingerprintParts: {
          templateId: 'L5_GENERIC_IF_AND_OR',
          formula: 'IF+AND+OR',
          targetRow: String(rowIdx),
          criteriaValues: `${high}|${mid}`,
        },
      });
    },
  },
];

const GENERIC_L6 = [
  {
    id: 'L6_GENERIC_TARGET_STATUS',
    category: 'business_case',
    build: (ctx) => {
      const textCols = findTextColumns(ctx.headers, ctx.rows, [
        'Akun', 'Divisi', 'Kategori', 'Jenis', 'Status',
      ]);
      const sumCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Nilai Persediaan', 'Total Penjualan', 'Tunjangan',
      ]);
      if (!textCols.length || !sumCols.length) return null;
      const tCol = pick(textCols);
      const sCol = pick(sumCols);
      const tVals = uniqueValues(ctx.rows, tCol.index);
      const tVal = pick(tVals);
      const total = ctx.rows.reduce((s, r) => (
        r[tCol.index] === tVal ? s + (Number(r[sCol.index]) || 0) : s
      ), 0);
      const targetHigh = Math.max(Math.round(total * 1.15 / 100000) * 100000, Math.round(total / 100000) * 100000 + 100000) || 1000000;
      const targetMid = Math.round(targetHigh * 0.7);
      let status = 'Belum Tercapai';
      if (total >= targetHigh) status = 'Target Tercapai';
      else if (total >= targetMid) status = 'Hampir Tercapai';
      const tRange = rangeRef(tCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const sRange = rangeRef(sCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sCol.index, ctx.usedTargets);
      const sumif = `SUMIF(${tRange},"${tVal}",${sRange})`;
      const formula = `=IF(${sumif}>=${targetHigh},"Target Tercapai",IF(${sumif}>=${targetMid},"Hampir Tercapai","Belum Tercapai"))`;
      return baseQuestion({
        level: 6,
        templateId: 'L6_GENERIC_TARGET_STATUS',
        category: 'business_case',
        businessScenario: true,
        title: `Status Target ${tCol.header} "${tVal}"`,
        instruction: `Manajemen ingin menilai pencapaian ${sCol.header} untuk ${tCol.header}="${tVal}".
Hitung totalnya, lalu tampilkan:
• "Target Tercapai" jika >= ${fmtNum(targetHigh)}
• "Hampir Tercapai" jika >= ${fmtNum(targetMid)}
• "Belum Tercapai" selain itu.`,
        targetCell,
        expectedValue: status,
        acceptedFunctions: ['SUMIF', 'IF'],
        expectedFormula: formula,
        hints: [
          'Agregasi bersyarat lalu klasifikasi hasil bisnis.',
          'SUMIF + nested IF.',
        ],
        explanation: `Total ${sCol.header} untuk "${tVal}" = ${fmtNum(total)} → "${status}".`,
        points: 40,
        difficulty: 6,
        functionCount: 3,
        conditionCount: 3,
        nestedDepth: 2,
        businessScenario: true,
        parameters: { tVal, targetHigh, targetMid, formula: 'SUMIF+IF' },
        fingerprintParts: {
          templateId: 'L6_GENERIC_TARGET_STATUS',
          formula: 'SUMIF+IF',
          criteriaValues: `${tVal}|${targetHigh}`,
          scenario: 'target-status',
        },
      });
    },
  },
  {
    id: 'L6_GENERIC_AVG_GROUP',
    category: 'business_case',
    build: (ctx) => {
      const textCols = findTextColumns(ctx.headers, ctx.rows, [
        'Akun', 'Divisi', 'Kategori', 'Jenis', 'Jabatan', 'Lokasi',
      ]);
      const sumCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Tunjangan', 'Nilai Persediaan', 'Stok Akhir',
      ]);
      if (!textCols.length || !sumCols.length) return null;
      const tCol = pick(textCols);
      const sCol = pick(sumCols);
      const tVal = pick(uniqueValues(ctx.rows, tCol.index));
      const filtered = ctx.rows.filter((r) => r[tCol.index] === tVal);
      if (!filtered.length) return null;
      const total = filtered.reduce((s, r) => s + (Number(r[sCol.index]) || 0), 0);
      const expectedValue = Math.round((total / filtered.length) * 100) / 100;
      const tRange = rangeRef(tCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const sRange = rangeRef(sCol.index, ctx.dataStartRowIndex, ctx.rows.length);
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, sCol.index, ctx.usedTargets);
      const formula = `=SUMIF(${tRange},"${tVal}",${sRange})/COUNTIF(${tRange},"${tVal}")`;
      return baseQuestion({
        level: 6,
        templateId: 'L6_GENERIC_AVG_GROUP',
        category: 'business_case',
        businessScenario: true,
        title: `Rata-rata ${sCol.header} — ${tCol.header} "${tVal}"`,
        instruction: `Analyst membutuhkan rata-rata ${sCol.header} khusus untuk ${tCol.header}="${tVal}".
Hitung dengan membagi total bersyarat dengan jumlah baris bersyarat.`,
        targetCell,
        expectedValue,
        expectedColIndex: sCol.index,
        expectedColumnLabel: sCol.header,
        acceptedFunctions: ['SUMIF', 'COUNTIF', 'AVERAGE'],
        expectedFormula: formula,
        hints: [
          'Rata-rata bersyarat = SUMIF ÷ COUNTIF.',
          'Fungsi: SUMIF dan COUNTIF.',
        ],
        explanation: `Rata-rata dari ${filtered.length} baris = ${fmtNum(expectedValue)}.`,
        points: 40,
        difficulty: 6,
        functionCount: 2,
        conditionCount: 1,
        nestedDepth: 0,
        businessScenario: true,
        parameters: { tVal, formula: 'SUMIF/COUNTIF' },
        fingerprintParts: {
          templateId: 'L6_GENERIC_AVG_GROUP',
          formula: 'SUMIF/COUNTIF',
          criteriaValues: tVal,
          targetColumn: sCol.header,
          scenario: 'avg-group',
        },
      });
    },
  },
  {
    id: 'L6_GENERIC_CLASSIFY',
    category: 'business_case',
    build: (ctx) => {
      const numCols = findNumericColumns(ctx.headers, ctx.rows, [
        'Debit', 'Kredit', 'Gaji Pokok', 'Stok Akhir', 'Nilai Persediaan', 'Tunjangan',
      ]);
      if (!numCols.length) return null;
      const col = pick(numCols);
      const values = ctx.rows.map((r) => r[col.index]).filter((v) => typeof v === 'number');
      if (values.length < 3) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const low = sorted[Math.floor(sorted.length * 0.25)] || sorted[0];
      const high = sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1];
      const lowR = Math.round(low / 1000) * 1000 || Math.round(low);
      const highR = Math.round(high / 1000) * 1000 || Math.round(high);
      const rowIdx = Math.floor(Math.random() * ctx.rows.length);
      const addr = cellAddress(col.index, ctx.dataStartRowIndex + rowIdx);
      const val = Number(ctx.rows[rowIdx][col.index]);
      let expectedValue = 'Normal';
      if (val < lowR) expectedValue = 'Perlu Perhatian';
      else if (val > highR) expectedValue = 'Di Atas Standar';
      const { targetCell } = allocateTargetCell(ctx.headers, ctx.targetRowIndex, col.index, ctx.usedTargets);
      return baseQuestion({
        level: 6,
        templateId: 'L6_GENERIC_CLASSIFY',
        category: 'business_case',
        businessScenario: true,
        title: `Evaluasi ${col.header} Baris ${rowIdx + 1}`,
        instruction: `Sebagai analist, klasifikasikan ${col.header} di ${addr} untuk keputusan operasional:
• "Perlu Perhatian" jika < ${fmtNum(lowR)}
• "Di Atas Standar" jika > ${fmtNum(highR)}
• "Normal" selain itu.`,
        targetCell,
        expectedValue,
        requiredRefs: [addr],
        acceptedFunctions: ['IF'],
        expectedFormula: `=IF(${addr}<${lowR},"Perlu Perhatian",IF(${addr}>${highR},"Di Atas Standar","Normal"))`,
        hints: [
          'Klasifikasi nilai untuk keputusan bisnis.',
          'Nested IF dengan dua ambang.',
        ],
        explanation: `Nilai ${fmtNum(val)} → "${expectedValue}".`,
        points: 35,
        difficulty: 6,
        functionCount: 2,
        nestedDepth: 2,
        conditionCount: 2,
        businessScenario: true,
        parameters: { lowR, highR, formula: 'nested-IF' },
        fingerprintParts: {
          templateId: 'L6_GENERIC_CLASSIFY',
          formula: 'nested-IF',
          targetRow: String(rowIdx),
          criteriaValues: `${lowR}|${highR}`,
          scenario: 'classify',
        },
      });
    },
  },
];

// Merge generic templates into level arrays
LEVEL3_TEMPLATES.push(...GENERIC_L3);
LEVEL4_TEMPLATES.push(...GENERIC_L4);
LEVEL5_TEMPLATES.push(...GENERIC_L5);
LEVEL6_TEMPLATES.push(...GENERIC_L6);

// ---------------------------------------------------------------------------
// Level config
// ---------------------------------------------------------------------------

export const LEVEL_CONFIG = {
  1: {
    name: 'Pemula',
    templates: LEVEL1_TEMPLATES,
    allowedFunctions: ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'],
    minConditions: 0,
    maxConditions: 0,
    minFunctionCount: 1,
    maxFunctionCount: 1,
    minNestedDepth: 0,
    maxNestedDepth: 0,
    businessScenario: false,
    pointsBase: 10,
  },
  2: {
    name: 'Dasar',
    templates: LEVEL2_TEMPLATES,
    allowedFunctions: ['IF', 'COUNTIF', 'SUMIF', 'LEFT', 'RIGHT', 'MID', 'LEN', 'MONTH', 'YEAR', 'DAY', 'DATEDIF'],
    minConditions: 0,
    maxConditions: 1,
    minFunctionCount: 1,
    maxFunctionCount: 1,
    businessScenario: false,
    pointsBase: 15,
  },
  3: {
    name: 'Menengah',
    templates: LEVEL3_TEMPLATES,
    allowedFunctions: ['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'IFERROR', 'XLOOKUP'],
    minConditions: 0,
    maxConditions: 1,
    minFunctionCount: 1,
    maxFunctionCount: 3,
    businessScenario: false,
    pointsBase: 20,
  },
  4: {
    name: 'Mahir',
    templates: LEVEL4_TEMPLATES,
    allowedFunctions: ['SUMIFS', 'COUNTIFS', 'IF', 'AND', 'OR'],
    minConditions: 2,
    maxConditions: 3,
    minFunctionCount: 1,
    maxFunctionCount: 3,
    businessScenario: false,
    pointsBase: 25,
  },
  5: {
    name: 'Ahli',
    templates: LEVEL5_TEMPLATES,
    allowedFunctions: ['IF', 'AND', 'OR', 'IFERROR', 'INDEX', 'MATCH', 'SUMIFS', 'COUNTIFS'],
    minConditions: 2,
    maxConditions: 4,
    minFunctionCount: 2,
    maxFunctionCount: 4,
    minNestedDepth: 1,
    businessScenario: false,
    pointsBase: 30,
  },
  6: {
    name: 'Profesional',
    templates: LEVEL6_TEMPLATES,
    allowedFunctions: ['SUMIFS', 'COUNTIFS', 'SUMIF', 'SUM', 'IF', 'AND', 'OR', 'INDEX', 'MATCH'],
    minConditions: 2,
    maxConditions: 5,
    minFunctionCount: 2,
    maxFunctionCount: 6,
    minNestedDepth: 1,
    businessScenario: true,
    pointsBase: 40,
  },
};

export function getTemplatesForLevel(level) {
  return LEVEL_CONFIG[level]?.templates || [];
}

export function getLevelConfig(level) {
  return LEVEL_CONFIG[level] || null;
}
