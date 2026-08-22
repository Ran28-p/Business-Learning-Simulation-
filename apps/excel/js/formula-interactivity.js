/**
 * formula-interactivity.js
 * ---------------------------------------------------------------------------
 * Tahap "Interaktivitas Excel Nyata": modul DOM terpisah dari app.js, KHUSUS
 * menangani pengalaman mengetik & mengisi rumus supaya terasa seperti Excel
 * sungguhan:
 *
 *   1. Mode Point-Klik  — selagi mengetik rumus, klik (atau klik-geser) sel
 *      di grid akan MENYISIPKAN referensinya ke titik kursor, bukan
 *      memindahkan sel aktif.
 *   2. Highlight Referensi Berwarna — setiap referensi sel/rentang pada
 *      rumus yang sedang diketik diberi warna berbeda di formula bar, dan
 *      sel yang dirujuk di grid diberi kotak warna yang sama (persis Excel).
 *   3. Fill Handle — kotak kecil di pojok kanan-bawah sel aktif; diseret
 *      untuk menyalin rumus/nilai ke sel lain, referensi relatif otomatis
 *      digeser (referensi absolut $A$1 tidak digeser).
 *   4. Autocomplete Fungsi + Petunjuk Argumen — mengetik "=SU" menampilkan
 *      daftar fungsi yang cocok dari data/formula-catalog.json; berada di
 *      dalam tanda kurung fungsi menampilkan sintaks dengan argumen aktif
 *      ditebalkan.
 *
 * Modul ini sengaja dipisah dari app.js (bukan menambah app.js yang sudah
 * ~900 baris) karena isinya murni interaksi DOM level-rendah (mouse drag,
 * seleksi kursor teks, overlay mengambang) yang berbeda sifat dari
 * orkestrasi halaman utama. app.js tetap satu-satunya pemilik STATE
 * aplikasi (dataset, grid, soal) — modul ini hanya diberi akses lewat
 * beberapa fungsi kecil (lihat `ctx` pada initFormulaInteractivity) dan
 * TIDAK PERNAH memodifikasi grid secara langsung; semua perubahan sel
 * tetap lewat ctx.commitCell(), sama seperti pengetikan manual.
 * ---------------------------------------------------------------------------
 */

import { loadFormulaCatalog } from './formula-library.js';

// ============================================================================
// Warna referensi (siklus, sama pola dengan Excel asli)
// ============================================================================

const REF_COLORS = [
  '#4472C4', // biru
  '#ED7D31', // oranye
  '#548235', // hijau
  '#7030A0', // ungu
  '#C00000', // merah
  '#2E75B6', // biru muda
  '#BF8F00', // kuning tua
  '#3B7D6B', // teal
];

function colorForIndex(i) {
  return REF_COLORS[i % REF_COLORS.length];
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Pisahkan string jadi segmen {text, quoted}, memasangkan tiap sepasang tanda kutip ganda. */
export function splitOutsideQuotes(str) {
  const segments = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') {
      if (!inQuotes) {
        if (current) segments.push({ text: current, quoted: false });
        current = ch;
        inQuotes = true;
      } else {
        current += ch;
        segments.push({ text: current, quoted: true });
        current = '';
        inQuotes = false;
      }
      continue;
    }
    current += ch;
  }
  if (current) segments.push({ text: current, quoted: inQuotes });
  return segments;
}

const REF_TOKEN_RE = /\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?/g;

/**
 * Analisis satu string rumus: hasilkan HTML dengan span berwarna untuk tiap
 * referensi sel/rentang (referensi yang sama -> warna yang sama, dan warna
 * ditentukan berdasarkan URUTAN KEMUNCULAN PERTAMA, persis Excel), plus peta
 * token->warna untuk dipakai menyorot sel yang sesuai di grid.
 * Bekerja juga untuk teks BUKAN rumus (dikembalikan apa adanya, di-escape,
 * tanpa pewarnaan) supaya overlay formula bar selalu 1:1 dengan isi input.
 */
export function analyzeFormulaRefs(rawValue) {
  const text = rawValue ?? '';
  const colorMap = new Map(); // token (UPPER) -> warna
  if (typeof text !== 'string' || !text.trim().startsWith('=')) {
    return { html: escapeHtml(String(text)), colorMap };
  }
  const segments = splitOutsideQuotes(text);
  let html = '';
  segments.forEach((seg) => {
    if (seg.quoted) {
      html += `<span class="fx-hl-string">${escapeHtml(seg.text)}</span>`;
      return;
    }
    let lastIndex = 0;
    let m;
    REF_TOKEN_RE.lastIndex = 0;
    while ((m = REF_TOKEN_RE.exec(seg.text))) {
      html += escapeHtml(seg.text.slice(lastIndex, m.index));
      const token = m[0];
      const key = token.toUpperCase();
      if (!colorMap.has(key)) colorMap.set(key, colorForIndex(colorMap.size));
      html += `<span class="fx-hl-ref" style="color:${colorMap.get(key)}">${escapeHtml(token)}</span>`;
      lastIndex = m.index + token.length;
    }
    html += escapeHtml(seg.text.slice(lastIndex));
  });
  return { html, colorMap };
}

// Rentang yang lebih besar dari ini hanya disorot pada sel sudut (awal & akhir)
// agar tidak melakukan ratusan query DOM per ketikan pada dataset besar.
const MAX_INDIVIDUALLY_HIGHLIGHTED_CELLS = 300;

// ============================================================================
// Fungsi murni (tanpa DOM) untuk autocomplete & petunjuk argumen — diletakkan
// di level modul (bukan di dalam initFormulaInteractivity) supaya bisa diuji
// langsung lewat Node tanpa perlu mensimulasikan browser. Lihat
// tests/test-formula-interactivity.mjs.
// ============================================================================

/** Cari fungsi yang "mengurung" posisi kursor saat ini, dan indeks argumen aktif (0-based). */
export function findEnclosingCall(text, pos) {
  let depth = 0;
  let argIndex = 0;
  let inQuotes = false;
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (inQuotes) continue;
    if (ch === ')') { depth++; continue; }
    if (ch === '(') {
      if (depth > 0) { depth--; continue; }
      const m = /([A-Za-z]+)$/.exec(text.slice(0, i));
      if (!m) return null;
      return { name: m[1].toUpperCase(), argIndex };
    }
    if (depth === 0 && ch === ',') argIndex += 1;
  }
  return null;
}

/** Pisah isi sintaks "a, [b], ..." di level teratas (sadar `(...)`/`[...]`), untuk menebalkan argumen aktif. */
export function splitSyntaxArgs(str) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (const ch of str) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

export function buildHintHtml(f, argIndex) {
  const m = /^[A-Za-z]+\((.*)\)$/.exec(f.syntax || '');
  let argsHtml = '';
  if (m) {
    const parts = splitSyntaxArgs(m[1]);
    const idx = Math.min(argIndex, Math.max(0, parts.length - 1));
    argsHtml = parts.map((p, i) => (i === idx ? `<strong>${escapeHtml(p)}</strong>` : escapeHtml(p))).join(', ');
  }
  return `<span class="fx-hint__fn">${escapeHtml(f.name)}</span>(${argsHtml})`
    + (f.description ? `<div class="fx-hint__desc">${escapeHtml(f.description)}</div>` : '');
}

// ============================================================================
// initFormulaInteractivity — titik masuk utama
// ============================================================================

/**
 * @param {object} ctx
 * @param {object} ctx.els - { formulaBarInput, spreadsheetScroll, spreadsheetTable }
 * @param {object} ctx.engine - { getCellRaw, setCellRaw, cellAddress, parseCellAddress,
 *                                 indexToColLetter, colLetterToIndex, adjustFormulaRefs, parseRange }
 * @param {() => object} ctx.getGrid - kembalikan grid aktif saat ini
 * @param {(addr:string) => boolean} ctx.isReadonly
 * @param {(addr:string, rawValue:string) => void} ctx.commitCell - sama seperti commitCell milik app.js
 * @param {(addr:string) => string} ctx.computeDisplayValue
 * @param {() => string} ctx.getActiveCell
 * @param {(message:string) => void} ctx.showToast
 */
export function initFormulaInteractivity(ctx) {
  const { els } = ctx;

  // -----------------------------------------------------------------------
  // 1. Bungkus formula bar dengan lapisan overlay berwarna
  // -----------------------------------------------------------------------
  const overlayEl = wrapEditorWithOverlay(els.formulaBarInput);

  // -----------------------------------------------------------------------
  // 2. Fill handle (elemen tunggal, mengambang di dalam area scroll)
  // -----------------------------------------------------------------------
  const fillHandleEl = document.createElement('div');
  fillHandleEl.className = 'fill-handle';
  fillHandleEl.title = 'Seret untuk mengisi (fill handle)';
  els.spreadsheetScroll.style.position = els.spreadsheetScroll.style.position || 'relative';
  els.spreadsheetScroll.appendChild(fillHandleEl);

  // -----------------------------------------------------------------------
  // 3. Popup mengambang (autocomplete fungsi & petunjuk argumen), 1 elemen dipakai bersama
  // -----------------------------------------------------------------------
  const popupEl = document.createElement('div');
  popupEl.className = 'fx-popup';
  popupEl.hidden = true;
  document.body.appendChild(popupEl);

  let popupMode = null; // 'autocomplete' | 'hint' | null
  let autocompleteState = null; // { editorEl, token, matches, selectedIndex }
  const catalogPromise = loadFormulaCatalog(); // mulai dimuat sedari awal, di-cache oleh formula-library.js sendiri

  // Set alamat sel yang saat ini berisi RUMUS (dipakai untuk me-refresh sel
  // lain yang bergantung padanya setiap ada perubahan, tanpa harus memindai
  // seluruh grid — penting untuk dataset besar/ratusan-ribuan baris).
  const formulaCellAddrs = new Set();

  // -----------------------------------------------------------------------
  // Util kecil
  // -----------------------------------------------------------------------

  function isEditableFormulaHost(el) {
    if (!el) return false;
    if (el === els.formulaBarInput) return true;
    return !!(el.classList && el.classList.contains('cell-input') && !el.readOnly);
  }

  function getActiveEditorForPointMode() {
    const el = document.activeElement;
    if (!isEditableFormulaHost(el)) return null;
    if (!el.value || !el.value.trim().startsWith('=')) return null;
    return el;
  }

  function cellAddrFromEventTarget(target) {
    const td = target.closest ? target.closest('td.cell') : null;
    return td ? td.dataset.addr : null;
  }

  // ==========================================================================
  // A. Overlay berwarna pada formula bar
  // ==========================================================================

  function wrapEditorWithOverlay(input) {
    const wrap = document.createElement('div');
    wrap.className = 'fx-editor-wrap';
    input.parentNode.insertBefore(wrap, input);
    const overlay = document.createElement('div');
    overlay.className = 'fx-editor-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    wrap.appendChild(overlay);
    wrap.appendChild(input);
    input.classList.add('fx-editor-input-transparent');
    return overlay;
  }

  function syncFormulaBarOverlay() {
    const { html } = analyzeFormulaRefs(els.formulaBarInput.value);
    overlayEl.innerHTML = html || '&nbsp;';
    // Formula panjang bisa membuat input men-scroll teksnya secara internal
    // (browser menjaga posisi kursor tetap terlihat) — overlay bukan elemen
    // yang ikut scroll otomatis, jadi posisinya digeser manual di sini supaya
    // warnanya tetap presisi menimpa teks asli, sepanjang apa pun rumusnya.
    overlayEl.style.transform = `translateX(-${els.formulaBarInput.scrollLeft}px)`;
  }

  // ==========================================================================
  // B. Highlight referensi di grid (kotak berwarna pada sel yang dirujuk)
  // ==========================================================================

  let highlightedCells = [];

  function clearGridRefHighlights() {
    highlightedCells.forEach((td) => {
      td.classList.remove('fx-hl-cell');
      td.style.removeProperty('--fx-hl-color');
    });
    highlightedCells = [];
  }

  function applyGridRefHighlights(colorMap) {
    clearGridRefHighlights();
    if (!colorMap || colorMap.size === 0) return;
    const grid = ctx.getGrid();
    if (!grid) return;
    colorMap.forEach((color, token) => {
      const cells = ctx.engine.parseRange(token);
      if (!cells || cells.length === 0) return;
      const targets = cells.length > MAX_INDIVIDUALLY_HIGHLIGHTED_CELLS
        ? [cells[0], cells[cells.length - 1]]
        : cells;
      targets.forEach(({ col, row }) => {
        const addr = ctx.engine.cellAddress(col, row);
        const td = els.spreadsheetTable.querySelector(`td.cell[data-addr="${addr}"]`);
        if (!td) return;
        td.classList.add('fx-hl-cell');
        td.style.setProperty('--fx-hl-color', color);
        highlightedCells.push(td);
      });
    });
  }

  // ==========================================================================
  // C. Mode Point-Klik (klik/klik-geser sel untuk menyisipkan referensi)
  // ==========================================================================

  let pointDrag = null; // { editorEl, insertStart, insertEnd, anchorAddr, lastHoverAddr }

  function insertTextAtCursor(editorEl, text) {
    const start = editorEl.selectionStart ?? editorEl.value.length;
    const end = editorEl.selectionEnd ?? editorEl.value.length;
    const before = editorEl.value.slice(0, start);
    const after = editorEl.value.slice(end);
    editorEl.value = before + text + after;
    const newPos = before.length + text.length;
    editorEl.setSelectionRange(newPos, newPos);
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    return { start: before.length, end: newPos };
  }

  function replaceInsertedSpan(editorEl, insertStart, insertEnd, text) {
    const before = editorEl.value.slice(0, insertStart);
    const after = editorEl.value.slice(insertEnd);
    editorEl.value = before + text + after;
    const newEnd = insertStart + text.length;
    editorEl.setSelectionRange(newEnd, newEnd);
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    return newEnd;
  }

  function clearPointPreview() {
    els.spreadsheetTable.querySelectorAll('[data-point-preview="true"]').forEach((td) => {
      td.removeAttribute('data-point-preview');
    });
  }

  function showPointPreviewRange(anchorAddr, hoverAddr) {
    clearPointPreview();
    const a = ctx.engine.parseCellAddress(anchorAddr);
    const b = ctx.engine.parseCellAddress(hoverAddr);
    if (!a || !b) return;
    const c0 = Math.min(a.col, b.col), c1 = Math.max(a.col, b.col);
    const r0 = Math.min(a.row, b.row), r1 = Math.max(a.row, b.row);
    if ((c1 - c0 + 1) * (r1 - r0 + 1) > MAX_INDIVIDUALLY_HIGHLIGHTED_CELLS) return; // rentang terlalu besar, lewati preview visual
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const addr = ctx.engine.cellAddress(c, r);
        const td = els.spreadsheetTable.querySelector(`td.cell[data-addr="${addr}"]`);
        if (td) td.dataset.pointPreview = 'true';
      }
    }
  }

  function onGridMouseDown(e) {
    const inputEl = e.target.closest ? e.target.closest('.cell-input') : null;
    if (!inputEl) return;
    const editorEl = getActiveEditorForPointMode();
    if (!editorEl) return; // tidak sedang mengetik rumus -> biarkan perilaku klik normal
    if (editorEl === inputEl) return; // klik di dalam sel yang sedang diedit sendiri -> biarkan (pindah kursor biasa)
    const addr = cellAddrFromEventTarget(e.target);
    if (!addr) return;
    e.preventDefault(); // pertahankan fokus tetap di editorEl, jangan biarkan sel ini "mencuri" fokus
    const { start, end } = insertTextAtCursor(editorEl, addr);
    pointDrag = { editorEl, insertStart: start, insertEnd: end, anchorAddr: addr, lastHoverAddr: addr };
    document.addEventListener('mousemove', onPointDragMove);
    document.addEventListener('mouseup', onPointDragEnd, { once: true });
  }

  function onPointDragMove(e) {
    if (!pointDrag) return;
    const elAtPoint = document.elementFromPoint(e.clientX, e.clientY);
    const addr = elAtPoint && cellAddrFromEventTarget(elAtPoint);
    if (!addr || addr === pointDrag.lastHoverAddr) return;
    pointDrag.lastHoverAddr = addr;
    const text = addr === pointDrag.anchorAddr ? pointDrag.anchorAddr : `${pointDrag.anchorAddr}:${addr}`;
    pointDrag.insertEnd = replaceInsertedSpan(pointDrag.editorEl, pointDrag.insertStart, pointDrag.insertEnd, text);
    showPointPreviewRange(pointDrag.anchorAddr, addr);
  }

  function onPointDragEnd() {
    document.removeEventListener('mousemove', onPointDragMove);
    clearPointPreview();
    pointDrag = null;
  }

  // ==========================================================================
  // D. Fill Handle
  // ==========================================================================

  let fillDrag = null; // { sourceAddr, lastTargetAddr }

  function repositionFillHandle() {
    const addr = ctx.getActiveCell();
    if (!addr || ctx.isReadonly(addr)) {
      fillHandleEl.classList.remove('is-visible');
      return;
    }
    const td = els.spreadsheetTable.querySelector(`td.cell[data-addr="${addr}"]`);
    if (!td) {
      fillHandleEl.classList.remove('is-visible');
      return;
    }
    const size = 8;
    fillHandleEl.style.left = `${td.offsetLeft + td.offsetWidth - size / 2 - 1}px`;
    fillHandleEl.style.top = `${td.offsetTop + td.offsetHeight - size / 2 - 1}px`;
    fillHandleEl.classList.add('is-visible');
  }

  function clearFillPreview() {
    els.spreadsheetTable.querySelectorAll('[data-fill-preview="true"]').forEach((td) => {
      td.removeAttribute('data-fill-preview');
    });
  }

  function fillRangeAddrs(sourceAddr, targetAddr) {
    const src = ctx.engine.parseCellAddress(sourceAddr);
    const tgt = ctx.engine.parseCellAddress(targetAddr);
    if (!src || !tgt) return { addrs: [], vertical: true };
    const rowDelta = tgt.row - src.row;
    const colDelta = tgt.col - src.col;
    const vertical = Math.abs(rowDelta) >= Math.abs(colDelta);
    const addrs = [];
    if (vertical && rowDelta !== 0) {
      const step = rowDelta > 0 ? 1 : -1;
      for (let r = src.row + step; step > 0 ? r <= tgt.row : r >= tgt.row; r += step) {
        addrs.push(ctx.engine.cellAddress(src.col, r));
      }
    } else if (!vertical && colDelta !== 0) {
      const step = colDelta > 0 ? 1 : -1;
      for (let c = src.col + step; step > 0 ? c <= tgt.col : c >= tgt.col; c += step) {
        addrs.push(ctx.engine.cellAddress(c, src.row));
      }
    }
    return { addrs, vertical };
  }

  function updateFillPreview(sourceAddr, targetAddr) {
    clearFillPreview();
    const { addrs } = fillRangeAddrs(sourceAddr, targetAddr);
    addrs.forEach((addr) => {
      const td = els.spreadsheetTable.querySelector(`td.cell[data-addr="${addr}"]`);
      if (td) td.dataset.fillPreview = 'true';
    });
  }

  function commitFill(sourceAddr, targetAddr) {
    const { addrs } = fillRangeAddrs(sourceAddr, targetAddr);
    if (addrs.length === 0) return;
    const grid = ctx.getGrid();
    const sourceCellData = ctx.engine.getCellRaw(grid, sourceAddr);
    const sourceRaw = sourceCellData ? sourceCellData.raw : '';
    const src = ctx.engine.parseCellAddress(sourceAddr);
    let filledCount = 0;
    let stoppedEarly = false;
    for (const addr of addrs) {
      if (ctx.isReadonly(addr)) { stoppedEarly = true; break; }
      const target = ctx.engine.parseCellAddress(addr);
      const rOffset = target.row - src.row;
      const cOffset = target.col - src.col;
      const isFormula = typeof sourceRaw === 'string' && sourceRaw.trim().startsWith('=');
      const newRaw = isFormula ? ctx.engine.adjustFormulaRefs(sourceRaw, rOffset, cOffset) : sourceRaw;
      ctx.commitCell(addr, newRaw === null || newRaw === undefined ? '' : String(newRaw));
      notifyCellCommitted(addr);
      filledCount += 1;
    }
    refreshDependentCells();
    if (filledCount > 0) {
      const suffix = stoppedEarly ? ' (berhenti sebelum sel terkunci)' : '';
      ctx.showToast(`Fill handle: ${filledCount} sel terisi${suffix}.`);
    }
  }

  function onFillHandleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const sourceAddr = ctx.getActiveCell();
    if (!sourceAddr || ctx.isReadonly(sourceAddr)) return;
    fillDrag = { sourceAddr, lastTargetAddr: sourceAddr };
    document.addEventListener('mousemove', onFillDragMove);
    document.addEventListener('mouseup', onFillDragEnd, { once: true });
  }

  function onFillDragMove(e) {
    if (!fillDrag) return;
    const elAtPoint = document.elementFromPoint(e.clientX, e.clientY);
    const addr = elAtPoint && cellAddrFromEventTarget(elAtPoint);
    if (!addr || addr === fillDrag.lastTargetAddr) return;
    fillDrag.lastTargetAddr = addr;
    updateFillPreview(fillDrag.sourceAddr, addr);
  }

  function onFillDragEnd() {
    document.removeEventListener('mousemove', onFillDragMove);
    if (fillDrag && fillDrag.lastTargetAddr !== fillDrag.sourceAddr) {
      commitFill(fillDrag.sourceAddr, fillDrag.lastTargetAddr);
    }
    clearFillPreview();
    fillDrag = null;
  }

  fillHandleEl.addEventListener('mousedown', onFillHandleMouseDown);

  // ==========================================================================
  // E. Pelacakan sel berumus & refresh sel yang bergantung (dependent cells)
  // ==========================================================================

  function notifyCellCommitted(addr) {
    const grid = ctx.getGrid();
    const cellData = ctx.engine.getCellRaw(grid, addr);
    const raw = cellData ? cellData.raw : '';
    if (typeof raw === 'string' && raw.trim().startsWith('=')) {
      formulaCellAddrs.add(addr);
    } else {
      formulaCellAddrs.delete(addr);
    }
  }

  function refreshDependentCells() {
    formulaCellAddrs.forEach((addr) => {
      const input = els.spreadsheetTable.querySelector(`.cell-input[data-addr="${addr}"]`);
      if (input && document.activeElement !== input) {
        input.value = ctx.computeDisplayValue(addr);
      }
    });
  }

  // ==========================================================================
  // F. Autocomplete fungsi & petunjuk argumen
  // ==========================================================================

  function hidePopup() {
    popupEl.hidden = true;
    popupMode = null;
    autocompleteState = null;
  }

  function positionPopupBelow(editorEl) {
    const rect = editorEl.getBoundingClientRect();
    popupEl.style.left = `${Math.round(rect.left)}px`;
    popupEl.style.top = `${Math.round(rect.bottom + 4)}px`;
    popupEl.style.minWidth = `${Math.round(Math.min(rect.width, 320))}px`;
  }

  function renderAutocompleteList() {
    const { matches, selectedIndex } = autocompleteState;
    popupEl.className = 'fx-popup';
    popupEl.innerHTML = matches.map((f, i) => `
      <div class="fx-popup__item${i === selectedIndex ? ' is-selected' : ''}" data-index="${i}">
        <span class="fx-popup__name">${escapeHtml(f.name)}</span>
        <span class="fx-popup__syntax">${escapeHtml(f.syntax || '')}</span>
      </div>
    `).join('');
    popupEl.querySelectorAll('.fx-popup__item').forEach((item) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        confirmAutocomplete(Number(item.dataset.index));
      });
    });
  }

  function confirmAutocomplete(index) {
    if (!autocompleteState) return;
    const { editorEl, token, matches } = autocompleteState;
    const f = matches[index];
    if (!f) return;
    const pos = editorEl.selectionStart;
    const before = editorEl.value.slice(0, pos - token.length);
    const after = editorEl.value.slice(pos);
    const insertText = `${f.name}(`;
    editorEl.value = before + insertText + after;
    const newPos = before.length + insertText.length;
    editorEl.setSelectionRange(newPos, newPos);
    editorEl.focus();
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    hidePopup();
  }

  function moveAutocompleteSelection(delta) {
    if (!autocompleteState) return;
    const count = autocompleteState.matches.length;
    autocompleteState.selectedIndex = (autocompleteState.selectedIndex + delta + count) % count;
    renderAutocompleteList();
  }

  async function maybeShowAutocomplete(editorEl) {
    const val = editorEl.value;
    if (!val.trim().startsWith('=')) return false;
    const pos = editorEl.selectionStart;
    const before = val.slice(0, pos);
    const m = /([A-Za-z]+)$/.exec(before);
    if (!m || m[1].length === 0) return false;
    const token = m[1];
    const catalog = await catalogPromise;
    const matches = catalog.filter((f) => f.name.startsWith(token.toUpperCase())).slice(0, 8);
    if (matches.length === 0) return false;
    autocompleteState = { editorEl, token, matches, selectedIndex: 0 };
    popupMode = 'autocomplete';
    positionPopupBelow(editorEl);
    renderAutocompleteList();
    popupEl.hidden = false;
    return true;
  }

  // findEnclosingCall, splitSyntaxArgs, dan buildHintHtml sudah didefinisikan
  // di level modul (di atas) supaya bisa diuji langsung lewat Node — lihat
  // tests/test-formula-interactivity.mjs.

  async function maybeShowArgumentHint(editorEl) {
    const val = editorEl.value;
    if (!val.trim().startsWith('=')) return false;
    const pos = editorEl.selectionStart;
    const info = findEnclosingCall(val, pos);
    if (!info) return false;
    const catalog = await catalogPromise;
    const f = catalog.find((x) => x.name === info.name);
    if (!f || !f.syntax) return false;
    popupMode = 'hint';
    popupEl.className = 'fx-popup fx-popup--hint';
    popupEl.innerHTML = buildHintHtml(f, info.argIndex);
    positionPopupBelow(editorEl);
    popupEl.hidden = false;
    return true;
  }

  async function updatePopupsForEditor(editorEl) {
    const shown = await maybeShowAutocomplete(editorEl);
    if (shown) return;
    const hintShown = await maybeShowArgumentHint(editorEl);
    if (!hintShown) hidePopup();
  }

  // ==========================================================================
  // G. Pengait event utama
  // ==========================================================================

  function onEditorInput(editorEl) {
    if (editorEl === els.formulaBarInput) syncFormulaBarOverlay();
    const { colorMap } = analyzeFormulaRefs(editorEl.value);
    applyGridRefHighlights(colorMap);
    updatePopupsForEditor(editorEl);
  }

  // Input di formula bar (mengetik langsung di sana)
  els.formulaBarInput.addEventListener('input', () => onEditorInput(els.formulaBarInput));
  // click/keyup juga bisa memindahkan posisi scroll internal input (mis. tombol End,
  // klik di ujung teks panjang) tanpa memicu event 'input' — sinkronkan overlay juga di sini.
  els.formulaBarInput.addEventListener('keyup', syncFormulaBarOverlay);
  els.formulaBarInput.addEventListener('click', syncFormulaBarOverlay);
  els.formulaBarInput.addEventListener('blur', () => {
    // beri sedikit jeda agar klik pada item popup (mousedown) sempat diproses lebih dulu
    setTimeout(() => { if (document.activeElement !== els.formulaBarInput) hidePopup(); }, 120);
  });

  // Input di dalam sel grid (delegasi — sel dibangun ulang setiap render)
  els.spreadsheetScroll.addEventListener('input', (e) => {
    if (!e.target.classList || !e.target.classList.contains('cell-input')) return;
    onEditorInput(e.target);
    // Jika sel yang diedit adalah sel aktif, app.js sudah menyinkronkan nilainya
    // ke formula bar (lihat app.js) sebelum event ini sampai di sini (delegasi
    // selalu berjalan setelah listener yang terpasang langsung pada elemen).
    if (e.target.dataset.addr === ctx.getActiveCell()) syncFormulaBarOverlay();
  }, false);

  els.spreadsheetScroll.addEventListener('focusout', (e) => {
    if (!e.target.classList || !e.target.classList.contains('cell-input')) return;
    setTimeout(() => { if (!document.activeElement || !document.activeElement.classList || !document.activeElement.classList.contains('cell-input')) hidePopup(); }, 120);
  });

  // Mode point-klik: mousedown pada grid selagi formula sedang diketik
  els.spreadsheetScroll.addEventListener('mousedown', onGridMouseDown, false);

  // Keydown popup (autocomplete) — HARUS didaftarkan pada tahap CAPTURE di sebuah
  // ANCESTOR (bukan pada elemen targetnya sendiri!), supaya pasti berjalan SEBELUM
  // listener keydown milik app.js (initFormulaBar / onCellKeydown) yang terpasang
  // langsung pada input. Jika didaftarkan pada elemen yang SAMA, urutan eksekusi
  // hanya mengikuti urutan pendaftaran (capture:true tidak membantu) — makanya
  // dipasang di `document`, ancestor paling luar, dengan pengecekan e.target.
  function handlePopupKeydownCapture(e) {
    if (popupMode !== 'autocomplete' || !autocompleteState || autocompleteState.editorEl !== e.target) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); moveAutocompleteSelection(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); moveAutocompleteSelection(-1); return; }
    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirmAutocomplete(autocompleteState.selectedIndex); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hidePopup(); }
  }
  document.addEventListener('keydown', (e) => {
    if (e.target !== els.formulaBarInput && !(e.target.classList && e.target.classList.contains('cell-input'))) return;
    handlePopupKeydownCapture(e);
  }, true);

  window.addEventListener('resize', repositionFillHandle);

  // ==========================================================================
  // API publik dipanggil dari app.js pada titik integrasi yang jelas
  // ==========================================================================

  return {
    /** Panggil setelah app.js memindahkan sel aktif (setActiveCell). */
    onActiveCellChanged() {
      syncFormulaBarOverlay();
      const { colorMap } = analyzeFormulaRefs(els.formulaBarInput.value);
      applyGridRefHighlights(colorMap);
      repositionFillHandle();
      hidePopup();
    },
    /** Panggil setiap kali app.js menulis nilai baru ke sebuah sel (commitCell). */
    onCellCommitted(addr) {
      notifyCellCommitted(addr);
      refreshDependentCells();
    },
    /** Panggil setelah app.js membangun ulang seluruh tabel (renderSpreadsheetTable). */
    onGridRendered() {
      formulaCellAddrs.clear();
      clearGridRefHighlights();
      clearFillPreview();
      clearPointPreview();
      repositionFillHandle();
    },
  };
}
