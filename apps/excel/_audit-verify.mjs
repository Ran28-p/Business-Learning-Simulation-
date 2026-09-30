import * as eng from './js/spreadsheet-engine.js';

const grid = eng.createGrid();
const data = [
  ['Kode', 'Kategori', 'Wilayah', 'Total'],
  ['ELK-001', 'Elektronik', 'Jawa Barat', 1000000],
  ['ELK-002', 'Elektronik', 'Jawa Barat', 3000000],
  ['FSH-001', 'Fashion', 'Jawa Barat', 500000],
];
data.forEach((row, r) => row.forEach((v, c) => {
  if (r > 0) eng.setCellRaw(grid, r + 1, c + 1, String(v));
}));

const f1 = '=SUMIFS(D2:D4,B2:B4,"Elektronik",C2:C4,"Jawa Barat")/COUNTIFS(B2:B4,"Elektronik",C2:C4,"Jawa Barat")';
console.log('division formula ->', JSON.stringify(eng.evaluateFormula(f1, grid)));
const f2 = '=SUMIFS(D2:D4,B2:B4,"Elektronik",C2:C4,"Jawa Barat")';
console.log('plain SUMIFS     ->', JSON.stringify(eng.evaluateFormula(f2, grid)));
const f3 = '=COUNTIFS(B2:B4,"Elektronik",C2:C4,"Jawa Barat")';
console.log('plain COUNTIFS   ->', JSON.stringify(eng.evaluateFormula(f3, grid)));
