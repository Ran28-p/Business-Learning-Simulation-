/**
 * spreadsheet/compare.js — operator perbandingan, pencarian operator top-level, dan pencocokan kriteria
 * (dipecah dari ../spreadsheet-engine.js; perilaku identik)
 */

const COMPARISON_OPERATORS = ['<>', '>=', '<=', '=', '>', '<']; // urutan penting: 2 karakter dicek lebih dulu

/** Cari operator perbandingan di kedalaman tanda kurung 0 (di luar tanda kutip). */
export function findTopLevelOperator(str) {
  let depth = 0;
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (inQuotes) continue;
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }
    if (depth !== 0) continue;
    for (const op of COMPARISON_OPERATORS) {
      if (str.startsWith(op, i)) return { operator: op, index: i };
    }
  }
  return null;
}

export function compareValues(a, b, operator) {
  if (typeof a === 'number' && typeof b === 'number') {
    switch (operator) {
      case '=': return a === b;
      case '<>': return a !== b;
      case '>': return a > b;
      case '<': return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      default: return false;
    }
  }
  const as = String(a ?? '').toLowerCase();
  const bs = String(b ?? '').toLowerCase();
  switch (operator) {
    case '=': return as === bs;
    case '<>': return as !== bs;
    case '>': return as > bs;
    case '<': return as < bs;
    case '>=': return as >= bs;
    case '<=': return as <= bs;
    default: return false;
  }
}

export function matchCriteria(cellValue, criteria) {
  if (criteria.isNumeric && typeof cellValue === 'number') {
    switch (criteria.operator) {
      case '=': return cellValue === criteria.value;
      case '<>': return cellValue !== criteria.value;
      case '>': return cellValue > criteria.value;
      case '<': return cellValue < criteria.value;
      case '>=': return cellValue >= criteria.value;
      case '<=': return cellValue <= criteria.value;
      default: return false;
    }
  }
  const a = String(cellValue ?? '').toLowerCase();
  const b = String(criteria.value ?? '').toLowerCase();
  return criteria.operator === '<>' ? a !== b : a === b;
}
