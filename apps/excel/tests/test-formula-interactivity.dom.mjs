// Pengujian DOM (via jsdom) untuk formula-interactivity.js — melengkapi
// test-formula-interactivity.mjs (yang hanya menguji fungsi murni tanpa DOM).
// Ini men-simulasikan interaksi mouse/keyboard SUNGGUHAN pada fixture DOM
// minimal yang meniru struktur nyata buildCellElement()/index.html, memakai
// spreadsheet-engine.js yang ASLI (bukan tiruan) supaya alur rumus->grid
// benar-benar diuji end-to-end.
//
// Catatan: jsdom TIDAK mengimplementasikan layout sungguhan, jadi
// document.elementFromPoint() di-stub manual berdasarkan koordinat yang kita
// tentukan sendiri saat dispatch event mousemove (lihat coordToAddr di bawah).
// Ini satu-satunya bagian yang "dipalsukan"; sisanya (penyisipan referensi,
// penyesuaian rumus, commit ke grid) memakai kode produksi apa adanya.
//
// Jalankan (setelah `npm install jsdom --no-save` di folder apps/excel):
//   node tests/test-formula-interactivity.dom.mjs

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelDir = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass += 1; } else {
    fail += 1;
    console.log(`FAIL: ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// --- Siapkan DOM global sebelum mengimpor modul (modul tidak menyentuh DOM
// di level atas, tapi kita tetap pasang dulu supaya aman) ---
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.Event = dom.window.Event;

// Mock fetch supaya loadFormulaCatalog() membaca file KATALOG ASLI dari disk
// (bukan lewat jaringan) -- membuat pengujian autocomplete sungguh-sungguh nyata.
global.fetch = async (url) => {
  const rel = String(url).replace(/^\.\//, '');
  const filePath = path.join(excelDir, rel);
  const text = fs.readFileSync(filePath, 'utf-8');
  return { ok: true, json: async () => JSON.parse(text) };
};

const { initFormulaInteractivity } = await import('../js/formula-interactivity.js');
const engine = await import('../js/spreadsheet-engine.js');

// --- Bangun fixture DOM minimal, meniru struktur nyata index.html/buildCellElement ---
function buildFixture() {
  document.body.innerHTML = `
    <div class="formula-bar">
      <div class="formula-bar__namebox" id="nameBox">A1</div>
      <div class="formula-bar__fx">fx</div>
      <input class="formula-bar__input" id="formulaBarInput" />
    </div>
    <div class="spreadsheet-scroll" id="spreadsheetScroll">
      <table class="spreadsheet-table" id="spreadsheetTable"><tbody id="tbody"></tbody></table>
    </div>
  `;
  return {
    formulaBarInput: document.getElementById('formulaBarInput'),
    spreadsheetScroll: document.getElementById('spreadsheetScroll'),
    spreadsheetTable: document.getElementById('spreadsheetTable'),
  };
}

// Dataset dummy: kolom A-C baris 1-4 readonly (data), kolom D editable (jawaban/coretan), 6 baris total.
function buildGridAndDom(els) {
  const grid = engine.createGrid(6, 4);
  const data = [
    ['Produk', 'Kategori', 'Qty'],
    ['Meja', 'Furnitur', 5],
    ['Kursi', 'Furnitur', 12],
    ['Laptop', 'Elektronik', 3],
  ];
  data.forEach((row, r) => {
    row.forEach((v, c) => {
      engine.setCellRaw(grid, engine.cellAddress(c, r), v, { readonly: true });
    });
  });
  const tbody = document.getElementById('tbody');
  for (let r = 0; r < 6; r += 1) {
    const tr = document.createElement('tr');
    for (let c = 0; c < 4; c += 1) {
      const addr = engine.cellAddress(c, r);
      const cellData = engine.getCellRaw(grid, addr);
      const td = document.createElement('td');
      td.className = 'cell';
      td.dataset.addr = addr;
      const input = document.createElement('input');
      input.className = 'cell-input';
      input.dataset.addr = addr;
      input.readOnly = !!(cellData && cellData.readonly);
      input.value = cellData ? String(cellData.raw) : '';
      td.appendChild(input);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  return grid;
}

function makeCtx(els, grid, commitLog) {
  let activeCell = 'D1';
  return {
    els,
    engine: {
      getCellRaw: engine.getCellRaw,
      setCellRaw: engine.setCellRaw,
      cellAddress: engine.cellAddress,
      parseCellAddress: engine.parseCellAddress,
      indexToColLetter: engine.indexToColLetter,
      colLetterToIndex: engine.colLetterToIndex,
      adjustFormulaRefs: engine.adjustFormulaRefs,
      parseRange: engine.parseRange,
    },
    getGrid: () => grid,
    isReadonly: (addr) => {
      const c = engine.getCellRaw(grid, addr);
      return !!(c && c.readonly);
    },
    commitCell: (addr, rawValue) => {
      const cellData = engine.getCellRaw(grid, addr);
      if (cellData && cellData.readonly) return;
      const trimmed = rawValue.trim();
      const numeric = trimmed !== '' && !trimmed.startsWith('=') && !Number.isNaN(Number(trimmed)) ? Number(trimmed) : trimmed;
      engine.setCellRaw(grid, addr, numeric === '' ? '' : numeric);
      commitLog.push({ addr, raw: numeric });
      const input = els.spreadsheetTable.querySelector(`.cell-input[data-addr="${addr}"]`);
      if (input) input.value = String(numeric);
    },
    computeDisplayValue: (addr) => {
      const c = engine.getCellRaw(grid, addr);
      if (!c) return '';
      if (typeof c.raw === 'string' && c.raw.trim().startsWith('=')) {
        const result = engine.evaluateFormula(c.raw, grid);
        return result.error ? '#ERR' : String(result.value);
      }
      return String(c.raw);
    },
    getActiveCell: () => activeCell,
    setActiveCellForTest: (addr) => { activeCell = addr; }, // helper pengujian saja
    showToast: () => {},
  };
}

function dispatchInput(el) {
  el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}
function dispatchMouseDown(el, extra = {}) {
  const ev = new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true, ...extra });
  el.dispatchEvent(ev);
  return ev;
}
function dispatchMouseUp(target = document.body) {
  const ev = new dom.window.MouseEvent('mouseup', { bubbles: true, cancelable: true });
  (target || document).dispatchEvent(ev);
}
function dispatchMouseMove(clientX, clientY) {
  const ev = new dom.window.MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX, clientY });
  document.dispatchEvent(ev);
}

// ============================================================================
// Skenario 1: Highlight referensi berwarna pada formula bar + grid
// ============================================================================
{
  const els = buildFixture();
  const grid = buildGridAndDom(els);
  const commitLog = [];
  const ctx = makeCtx(els, grid, commitLog);
  initFormulaInteractivity(ctx);

  els.formulaBarInput.focus();
  els.formulaBarInput.value = '=SUM(C2:C4)';
  dispatchInput(els.formulaBarInput);

  const overlay = document.querySelector('.fx-editor-overlay');
  check('overlay formula bar berisi span berwarna untuk referensi', overlay.innerHTML.includes('fx-hl-ref'), true);

  const c2 = els.spreadsheetTable.querySelector('.cell-input[data-addr="C2"]').closest('td');
  const c4 = els.spreadsheetTable.querySelector('.cell-input[data-addr="C4"]').closest('td');
  check('sel C2 (awal rentang) mendapat kelas highlight', c2.classList.contains('fx-hl-cell'), true);
  check('sel C4 (akhir rentang) mendapat kelas highlight', c4.classList.contains('fx-hl-cell'), true);
}

// ============================================================================
// Skenario 2: Mode point-klik — klik sel lain saat mengetik rumus menyisipkan referensi
// ============================================================================
{
  const els = buildFixture();
  const grid = buildGridAndDom(els);
  const commitLog = [];
  const ctx = makeCtx(els, grid, commitLog);
  initFormulaInteractivity(ctx);

  els.formulaBarInput.focus();
  els.formulaBarInput.value = '=SUM(';
  els.formulaBarInput.setSelectionRange(5, 5);
  dispatchInput(els.formulaBarInput);

  const targetInput = els.spreadsheetTable.querySelector('.cell-input[data-addr="C3"]');
  const ev = dispatchMouseDown(targetInput);
  check('mousedown pada sel lain di-preventDefault (fokus tetap di formula bar)', ev.defaultPrevented, true);
  check('fokus TIDAK berpindah ke sel yang diklik', document.activeElement === els.formulaBarInput, true);
  check('referensi C3 tersisip ke formula bar', els.formulaBarInput.value, '=SUM(C3');
  dispatchMouseUp();
}

// ============================================================================
// Skenario 3: Mode point-klik dengan drag -> menghasilkan rentang "C2:C4"
// ============================================================================
{
  const els = buildFixture();
  const grid = buildGridAndDom(els);
  const commitLog = [];
  const ctx = makeCtx(els, grid, commitLog);
  initFormulaInteractivity(ctx);

  els.formulaBarInput.focus();
  els.formulaBarInput.value = '=SUM(';
  els.formulaBarInput.setSelectionRange(5, 5);
  dispatchInput(els.formulaBarInput);

  const c2 = els.spreadsheetTable.querySelector('.cell-input[data-addr="C2"]');
  const c4 = els.spreadsheetTable.querySelector('.cell-input[data-addr="C4"]');

  // Stub elementFromPoint: koordinat (0, y) -> sel C4 (mensimulasikan drag ke bawah)
  document.elementFromPoint = (x, y) => (y === 999 ? c4 : c2);

  dispatchMouseDown(c2, { clientX: 0, clientY: 200 });
  dispatchMouseMove(0, 999); // seret ke C4
  check('drag point-mode menghasilkan rentang C2:C4', els.formulaBarInput.value, '=SUM(C2:C4');
  dispatchMouseUp();
}

// ============================================================================
// Skenario 4: Fill handle — menyalin rumus ke bawah dengan referensi relatif bergeser
// ============================================================================
{
  const els = buildFixture();
  const grid = buildGridAndDom(els);
  const commitLog = [];
  const ctx = makeCtx(els, grid, commitLog);
  initFormulaInteractivity(ctx);

  // D1 diisi rumus terlebih dahulu (via commitCell langsung, seperti mengetik manual)
  ctx.commitCell('D1', '=SUM(A1:C1)');
  ctx.setActiveCellForTest('D1');
  commitLog.length = 0; // reset log: hanya minat pada commit YANG DIHASILKAN FILL HANDLE

  const fillHandle = document.querySelector('.fill-handle');
  check('fill handle ada di DOM', !!fillHandle, true);

  const d1 = els.spreadsheetTable.querySelector('.cell-input[data-addr="D1"]');
  const d3 = els.spreadsheetTable.querySelector('.cell-input[data-addr="D3"]');
  document.elementFromPoint = (x, y) => (y === 500 ? d3 : d1);

  dispatchMouseDown(fillHandle, { clientX: 0, clientY: 100 });
  dispatchMouseMove(0, 500); // seret ke D3 (2 baris ke bawah)
  dispatchMouseUp();

  const committedAddrs = commitLog.map((c) => c.addr);
  check('fill handle menulis ke D2 dan D3', committedAddrs, ['D2', 'D3']);
  const d2Raw = engine.getCellRaw(grid, 'D2').raw;
  const d3Raw = engine.getCellRaw(grid, 'D3').raw;
  check('rumus D2 hasil fill = referensi bergeser 1 baris', d2Raw, '=SUM(A2:C2)');
  check('rumus D3 hasil fill = referensi bergeser 2 baris', d3Raw, '=SUM(A3:C3)');
}

// ============================================================================
// Skenario 5: Fill handle berhenti sebelum sel terkunci (readonly)
// ============================================================================
{
  const els = buildFixture();
  const grid = buildGridAndDom(els);
  const commitLog = [];
  const ctx = makeCtx(els, grid, commitLog);
  initFormulaInteractivity(ctx);

  // Buat A5 & seterusnya editable tapi B5 readonly (mensimulasikan batas area jawaban)
  ctx.commitCell('D4', '5');
  ctx.setActiveCellForTest('D4');
  commitLog.length = 0;
  // Kunci D5 secara manual untuk menguji penghentian dini
  engine.setCellRaw(grid, 'D5', '', { readonly: true });

  const fillHandle = document.querySelector('.fill-handle');
  const d4 = els.spreadsheetTable.querySelector('.cell-input[data-addr="D4"]');
  const d5 = els.spreadsheetTable.querySelector('.cell-input[data-addr="D5"]');
  document.elementFromPoint = () => d5;

  dispatchMouseDown(fillHandle, { clientX: 0, clientY: 100 });
  dispatchMouseMove(0, 999);
  dispatchMouseUp();

  check('fill handle TIDAK menulis ke sel terkunci D5', commitLog.some((c) => c.addr === 'D5'), false);
}

// ============================================================================
// Skenario 6: Autocomplete fungsi muncul & bisa dikonfirmasi dengan Enter
// ============================================================================
{
  const els = buildFixture();
  const grid = buildGridAndDom(els);
  const commitLog = [];
  const ctx = makeCtx(els, grid, commitLog);
  initFormulaInteractivity(ctx);

  els.formulaBarInput.focus();
  els.formulaBarInput.value = '=SU';
  els.formulaBarInput.setSelectionRange(3, 3);
  dispatchInput(els.formulaBarInput);

  // Autocomplete di-render secara async (menunggu loadFormulaCatalog) -> beri jeda
  await new Promise((resolve) => setTimeout(resolve, 50));

  const popup = document.querySelector('.fx-popup');
  check('popup autocomplete muncul (tidak hidden)', popup.hidden, false);
  check('popup berisi saran SUM', popup.innerHTML.includes('SUM'), true);

  const enterEv = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  els.formulaBarInput.dispatchEvent(enterEv);
  check('Enter pada autocomplete DI-CEGAH dari mencapai handler commit bawaan', enterEv.defaultPrevented, true);
  check('nama fungsi + kurung buka tersisip setelah konfirmasi', els.formulaBarInput.value.startsWith('=SUM('), true);
}

// ============================================================================
// Skenario 7: Referensi melingkar tidak membuat browser hang saat dipakai lewat fill
// ============================================================================
{
  const els = buildFixture();
  const grid = buildGridAndDom(els);
  const commitLog = [];
  const ctx = makeCtx(els, grid, commitLog);
  initFormulaInteractivity(ctx);

  ctx.commitCell('D1', '=SUM(D2)');
  ctx.commitCell('D2', '=SUM(D1)');
  const start = Date.now();
  const display = ctx.computeDisplayValue('D1');
  const elapsed = Date.now() - start;
  check('rumus melingkar dihitung nyaris instan (tidak hang)', elapsed < 500, true);
  check('hasil tetap berupa string (bukan crash)', typeof display, 'string');
}

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
