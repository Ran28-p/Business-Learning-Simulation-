/**
 * app.js
 * ---------------------------------------------------------------------------
 * Orkestrator aplikasi: menyatukan dataset-generator, spreadsheet-engine,
 * formula-validator, question-generator, progress-manager, dan me-render
 * semuanya ke DOM. Ini satu-satunya file yang boleh menyentuh DOM secara
 * langsung untuk logika halaman utama.
 * ---------------------------------------------------------------------------
 */

import { DATASET_GENERATORS } from './dataset-generator.js';
import {
  createGrid, setCellRaw, getCellRaw, evaluateFormula,
  indexToColLetter, colLetterToIndex, cellAddress, parseCellAddress, parseRange,
  formatSerialAsDate, adjustFormulaRefs,
} from './spreadsheet-engine.js';
import { generateQuestionForLevel, generateQuestionBatch, clearSessionHistory } from './question-generator.js';
import { validateAnswer } from './formula-validator.js';
import { getStats, recordAttempt, getBadgeDefinitions, resetProgress, successRate } from './progress-manager.js';
import { initFormulaInteractivity } from './formula-interactivity.js';
import { debugQuestionEngine } from './question-engine.js';
import { loadFormulaCatalog } from './formula-library.js';

// ============================================================================
// State aplikasi terpusat
// ============================================================================

const state = {
  datasetType: 'sales',
  level: 1,
  dataset: null,       // hasil generateSalesDataset(): {headers, columnTypes, rows, meta}
  grid: null,           // grid spreadsheet-engine untuk sheet aktif
  datasetGrid: null,    // grid spreadsheet-engine untuk sheet dataset yang diekspor
  colCount: 0,
  rowCount: 0,
  dataStartRowIndex: 1, // baris (0-based) tempat data pertama dimulai di grid
  targetRowIndex: null, // baris (0-based) tempat sel jawaban berada
  activeCell: 'A1',
  activeSheet: 'data',
  currentQuestion: null,
  practiceQuestions: [],
  activeQuestionIndex: -1,
  hintsRevealed: 0,
  answered: false,      // true jika soal berjalan sudah pernah "Periksa Jawaban" dengan hasil BENAR
};

// Dikembalikan oleh initFormulaInteractivity() saat init() — modul terpisah yang
// menangani mode point-klik, highlight referensi berwarna, fill handle, dan
// autocomplete fungsi (lihat js/formula-interactivity.js). app.js memanggil
// method-nya di 3 titik integrasi: setelah sel aktif berpindah, setelah sebuah
// sel ditulis, dan setelah tabel dirender ulang.
let formulaInteractivity = null;

const EXTRA_SCRATCH_COLS = 2; // kolom kosong tambahan (mis. O, P) untuk coretan siswa
const GAP_ROWS_BEFORE_TARGET = 1;
const SCRATCH_ROWS_AFTER_TARGET = 2;

const LEVEL_LABELS = [
  { level: 1, name: 'Level 1 — Pemula', available: true },
  { level: 2, name: 'Level 2 — Dasar', available: true },
  { level: 3, name: 'Level 3 — Menengah', available: true },
  { level: 4, name: 'Level 4 — Mahir', available: true },
  { level: 5, name: 'Level 5 — Ahli', available: true },
  { level: 6, name: 'Level 6 — Profesional', available: true },
];

// ============================================================================
// Referensi DOM
// ============================================================================

const els = {};
function cacheDom() {
  const ids = [
    'datasetNav', 'levelPath', 'statXp', 'statSoal', 'statBenar', 'statPersen', 'badgeRow',
    'btnResetProgress', 'btnDownloadProgressPdf', 'jumlahDataSelect', 'jumlahDataCustom', 'seedInput', 'btnRandomSeed',
    'btnGenerateDataset', 'setupSelectionNote', 'datasetStatusPill', 'workspacePanel',
    'datasetLabelText', 'datasetMetaText', 'btnResetSheet', 'btnRegenerateDataset',
    'nameBox', 'formulaBarInput', 'spreadsheetScroll', 'spreadsheetTable',
    'questionTitle', 'questionInstruction', 'btnJumpToTarget', 'questionLevelChip',
    'btnStartPractice', 'btnHint', 'btnCheckAnswer', 'btnExplain', 'btnNextQuestion',
    'resultPanel', 'resultStatus', 'resultMessage', 'resultValues',
    'hintPanel', 'hintList', 'explanationPanel', 'explanationText',
    'questionQueuePanel', 'questionQueueList', 'questionQueueMeta', 'sheetTabs',
  ];
  ids.forEach((id) => { els[id] = document.getElementById(id); });
}

// ============================================================================
// Sidebar: navigasi dataset & level
// ============================================================================

function renderDatasetNav() {
  els.datasetNav.innerHTML = '';
  Object.entries(DATASET_GENERATORS).forEach(([key, def]) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dataset-nav__item';
    btn.dataset.active = String(key === state.datasetType);
    btn.disabled = !def.available;
    btn.innerHTML = `<span>${def.label}</span>` + (!def.available ? '<span class="item-tag">Segera</span>' : '');
    btn.title = def.description;
    if (def.available) {
      btn.addEventListener('click', () => {
        state.datasetType = key;
        renderDatasetNav();
        updateSelectionNote();
      });
    }
    li.appendChild(btn);
    els.datasetNav.appendChild(li);
  });
}

function renderLevelPath() {
  els.levelPath.innerHTML = '';
  LEVEL_LABELS.forEach((lvl) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-path__item';
    btn.dataset.active = String(lvl.level === state.level);
    btn.disabled = !lvl.available;
    btn.innerHTML = `<span class="level-node">${lvl.level}</span><span>${lvl.name.replace(/^Level \d+ — /, '')}</span>` +
      (!lvl.available ? '<span class="item-tag">Segera</span>' : '');
    if (lvl.available) {
      btn.addEventListener('click', () => {
        if (lvl.level === state.level) return;
        state.level = lvl.level;
        renderLevelPath();
        updateSelectionNote();
        if (state.dataset) {
          clearTargetRowAnswerCells();
          resetQuestionUI();
          renderSpreadsheetTable();
        }
      });
    }
    li.appendChild(btn);
    els.levelPath.appendChild(li);
  });
}

function updateSelectionNote() {
  const datasetLabel = DATASET_GENERATORS[state.datasetType].label;
  const levelLabel = LEVEL_LABELS.find((l) => l.level === state.level).name;
  els.setupSelectionNote.innerHTML = `Materi aktif: <strong>${datasetLabel}</strong> · Level aktif: <strong>${levelLabel}</strong>`;
}

// ============================================================================
// Dashboard progres (sidebar)
// ============================================================================

function renderDashboard() {
  const stats = getStats();
  els.statXp.textContent = stats.xp;
  els.statSoal.textContent = stats.soalDikerjakan;
  els.statBenar.textContent = stats.jawabanBenar;
  els.statPersen.textContent = `${successRate(stats)}%`;

  els.badgeRow.innerHTML = '';
  getBadgeDefinitions().forEach((badge) => {
    const earned = stats.badges.includes(badge.id);
    const span = document.createElement('span');
    span.className = `badge-chip${earned ? '' : ' badge-chip--locked'}`;
    span.textContent = badge.name;
    span.title = badge.description;
    els.badgeRow.appendChild(span);
  });
}

/**
 * Bangun & unduh "Export Progress PDF" (bagian 11 master prompt).
 * Tidak ada satu elemen DOM yang merepresentasikan laporan lengkap,
 * jadi HTML laporan dibangun langsung dari data progress-manager lalu
 * dikirim ke PDFExport.exportHTMLToPDF() (engine terpusat yang sama
 * dipakai modul Accounting & SPT).
 */
function downloadProgressReportPDF() {
  if (!window.PDFExport) {
    showToast('Mesin PDF tidak tersedia. Coba muat ulang halaman.');
    return;
  }
  const stats = getStats();
  const badges = getBadgeDefinitions();
  const now = new Date();
  const tanggal = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const rumusRows = Object.entries(stats.rumusDipelajari)
    .sort((a, b) => b[1].benar - a[1].benar)
    .map(([fn, f]) => `<tr><td>${fn}</td><td>${f.dikerjakan}</td><td>${f.benar}</td><td>${f.dikerjakan ? Math.round((f.benar / f.dikerjakan) * 100) : 0}%</td></tr>`)
    .join('') || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Belum ada data rumus.</td></tr>';

  const riwayatRows = stats.riwayat.slice(0, 15).map((r) => {
    const waktu = new Date(r.waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const statusLabel = r.status === 'correct' ? '✅ Benar' : '❌ Salah';
    return `<tr><td>${waktu}</td><td>${r.soalTitle || '-'}</td><td>${r.fungsi}</td><td>${statusLabel}</td><td>${r.xp}</td></tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:#64748b;">Belum ada riwayat.</td></tr>';

  const badgeItems = badges.map((b) => {
    const earned = stats.badges.includes(b.id);
    return `<li style="margin-bottom:4px;${earned ? '' : 'color:#94a3b8;'}">${earned ? '🏅' : '🔒'} <strong>${b.name}</strong> — ${b.description}</li>`;
  }).join('');

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;padding:6px;">
      <h1 style="font-size:18px;margin:0 0 2px;">Excel Formula Practice — Laporan Progres</h1>
      <p style="margin:0 0 16px;color:#64748b;font-size:11px;">Digenerate: ${tanggal}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${stats.xp}</div><div style="font-size:10px;color:#64748b;">Total XP</div></td>
          <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${stats.soalDikerjakan}</div><div style="font-size:10px;color:#64748b;">Soal Dikerjakan</div></td>
          <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${stats.jawabanBenar}</div><div style="font-size:10px;color:#64748b;">Jawaban Benar</div></td>
          <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${successRate(stats)}%</div><div style="font-size:10px;color:#64748b;">Akurasi</div></td>
        </tr>
      </table>

      <h2 style="font-size:13px;border-bottom:2px solid #1e3a5f;padding-bottom:4px;">Kompetensi per Fungsi</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px;">
        <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:5px;border:1px solid #cbd5e1;text-align:left;">Fungsi</th><th style="padding:5px;border:1px solid #cbd5e1;">Dikerjakan</th><th style="padding:5px;border:1px solid #cbd5e1;">Benar</th><th style="padding:5px;border:1px solid #cbd5e1;">Akurasi</th></tr></thead>
        <tbody>${rumusRows}</tbody>
      </table>

      <h2 style="font-size:13px;border-bottom:2px solid #1e3a5f;padding-bottom:4px;">Badge</h2>
      <ul style="font-size:11px;padding-left:18px;margin-bottom:16px;">${badgeItems || '<li style="color:#64748b;">Belum ada badge.</li>'}</ul>

      <h2 style="font-size:13px;border-bottom:2px solid #1e3a5f;padding-bottom:4px;">Riwayat Terakhir (maks. 15)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:5px;border:1px solid #cbd5e1;">Waktu</th><th style="padding:5px;border:1px solid #cbd5e1;text-align:left;">Soal</th><th style="padding:5px;border:1px solid #cbd5e1;">Fungsi</th><th style="padding:5px;border:1px solid #cbd5e1;">Status</th><th style="padding:5px;border:1px solid #cbd5e1;">XP</th></tr></thead>
        <tbody>${riwayatRows}</tbody>
      </table>
    </div>`;

  showToast('Membuat PDF laporan progres…');
  window.PDFExport.exportHTMLToPDF(html, {
    filename: `Laporan_Progres_Excel_${now.toISOString().slice(0, 10)}.pdf`,
    widthPx: 720,
    scale: 2.2,
    onClone: (clone) => {
      clone.querySelectorAll('td, th').forEach((c) => { c.style.wordBreak = 'break-word'; });
    }
  }).then(() => {
    showToast('PDF laporan progres berhasil diunduh.');
  }).catch((err) => {
    console.error('[downloadProgressReportPDF]', err);
    showToast(err.message || 'Gagal membuat PDF laporan progres.');
  });
}

// ============================================================================
// Panel pengaturan latihan (pilih jumlah data, seed, generate)
// ============================================================================

function initSetupPanel() {
  els.jumlahDataSelect.addEventListener('change', () => {
    const isCustom = els.jumlahDataSelect.value === 'custom';
    els.jumlahDataCustom.hidden = !isCustom;
    if (isCustom) els.jumlahDataCustom.focus();
  });

  els.btnRandomSeed.addEventListener('click', () => {
    els.seedInput.value = Math.random().toString(36).slice(2, 10);
  });

  els.btnGenerateDataset.addEventListener('click', () => {
    const count = readRequestedCount();
    if (count === null) return; // pesan error sudah ditampilkan oleh readRequestedCount
    const seedValue = els.seedInput.value.trim() || undefined;
    generateNewDataset(count, seedValue);
  });

  els.btnRegenerateDataset.addEventListener('click', () => {
    const count = state.dataset ? state.dataset.meta.count : readRequestedCount();
    generateNewDataset(count, undefined); // seed baru & acak setiap kali "Generate Ulang"
  });

  els.btnResetSheet.addEventListener('click', () => {
    if (!state.dataset) return;
    rebuildDataSheetGrid();
    renderSpreadsheetTable();
    setActiveCell('A1');
    showToast('Lembar kerja dikembalikan ke kondisi awal.');
  });

  els.btnDownloadProgressPdf.addEventListener('click', downloadProgressReportPDF);

  els.btnResetProgress.addEventListener('click', () => {
    if (!confirm('Reset seluruh progres (XP, statistik, badge, dan histori soal)? Tindakan ini tidak bisa dibatalkan.')) return;
    resetProgress();
    clearSessionHistory();
    try {
      localStorage.removeItem('excel_question_history');
    } catch { /* ignore */ }
    renderDashboard();
    showToast('Progres dan histori soal berhasil direset.');
  });
}

function readRequestedCount() {
  const selected = els.jumlahDataSelect.value;
  if (selected !== 'custom') return parseInt(selected, 10);
  const customVal = parseInt(els.jumlahDataCustom.value, 10);
  if (!Number.isFinite(customVal) || customVal < 1 || customVal > 5000) {
    alert('Masukkan jumlah data khusus antara 1 dan 5000.');
    els.jumlahDataCustom.focus();
    return null;
  }
  return customVal;
}

// ============================================================================
// Pembuatan dataset & grid
// ============================================================================

function generateNewDataset(count, seed) {
  const generatorDef = DATASET_GENERATORS[state.datasetType];
  if (!generatorDef || typeof generatorDef.generate !== 'function') {
    alert('Dataset ini belum tersedia pada tahap pengembangan saat ini.');
    return;
  }

  state.dataset = generatorDef.generate({ count, seed });
  rebuildDataSheetGrid();

  els.datasetStatusPill.textContent = `${state.dataset.meta.count} baris siap`;
  els.datasetStatusPill.dataset.state = 'ready';
  els.datasetLabelText.textContent = generatorDef.label;
  els.datasetMetaText.textContent =
    `${state.dataset.meta.count} baris data · seed "${state.dataset.meta.seed}" · dibuat ${new Date(state.dataset.meta.generatedAt).toLocaleString('id-ID')}`;

  preparePracticeQuestions();
  els.workspacePanel.hidden = false;
  renderSheetTabs();
  renderSpreadsheetTable();
  setActiveCell('A1');
  resetQuestionUI();
  els.workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function rebuildDataSheetGrid() {
  const { headers, rows } = state.dataset;
  const dataColCount = headers.length;
  state.colCount = dataColCount + EXTRA_SCRATCH_COLS;
  state.dataStartRowIndex = 1;
  const gapRowIndex = state.dataStartRowIndex + rows.length; // baris kosong setelah data
  const targetRowIndex = gapRowIndex + GAP_ROWS_BEFORE_TARGET;
  state.targetRowIndex = targetRowIndex;
  state.rowCount = targetRowIndex + 1 + SCRATCH_ROWS_AFTER_TARGET;

  const grid = createGrid(state.rowCount, state.colCount);

  // Baris header (readonly)
  headers.forEach((h, col) => {
    setCellRaw(grid, cellAddress(col, 0), h, { readonly: true });
  });

  // Baris data (readonly — dikunci agar soal & jawaban tetap konsisten dengan dataset yang di-generate)
  rows.forEach((row, r) => {
    const gridRow = state.dataStartRowIndex + r;
    row.forEach((val, col) => {
      setCellRaw(grid, cellAddress(col, gridRow), val, { readonly: true });
    });
  });

  // Label baris jawaban
  setCellRaw(grid, cellAddress(0, targetRowIndex), '➡ Jawaban:', { readonly: true, force: true });

  const practiceStartRow = targetRowIndex + 2;
  const scratchColA = state.dataset.headers.length;
  const scratchColB = scratchColA + 1;
  setCellRaw(grid, cellAddress(scratchColA, practiceStartRow), 'Soal Latihan', { readonly: true, force: true });
  setCellRaw(grid, cellAddress(scratchColB, practiceStartRow), 'Kunci Jawaban', { readonly: true, force: true });

  const practiceRows = state.practiceQuestions.length ? state.practiceQuestions : [state.currentQuestion].filter(Boolean);
  practiceRows.forEach((question, index) => {
    const rowIndex = practiceStartRow + 1 + (index * 2);
    setCellRaw(grid, cellAddress(scratchColA, rowIndex), `${index + 1}. ${question.title}`, { readonly: true, force: true });
    setCellRaw(grid, cellAddress(scratchColB, rowIndex), formatAnyValue(question.expectedValue), { readonly: true, force: true });
    setCellRaw(grid, cellAddress(scratchColA, rowIndex + 1), question.instruction, { readonly: true, force: true });
    setCellRaw(grid, cellAddress(scratchColB, rowIndex + 1), 'Lihat Sheet 2', { readonly: true, force: true });
  });

  state.activeSheet = 'data';
  state.grid = grid;
  state.datasetGrid = grid;
}

function buildPracticeSheetGrid() {
  const headers = ['No', 'Pertanyaan', 'Kunci Jawaban'];
  const rows = state.practiceQuestions.map((question, index) => [
    index + 1,
    `${question.title}\n${question.instruction}`,
    formatAnyValue(question.expectedValue),
  ]);

  const rowCount = Math.max(6, rows.length + 3);
  const grid = createGrid(rowCount, headers.length);
  headers.forEach((h, col) => setCellRaw(grid, cellAddress(col, 0), h, { readonly: true }));

  rows.forEach((row, r) => {
    row.forEach((val, col) => setCellRaw(grid, cellAddress(col, r + 1), val, { readonly: true }));
  });

  const noteRow = rows.length + 2;
  setCellRaw(grid, cellAddress(0, noteRow), 'Catatan:', { readonly: true, force: true });
  setCellRaw(grid, cellAddress(1, noteRow), 'Sheet 2 berisi daftar soal latihan dan kunci jawabannya.', { readonly: true, force: true });

  state.activeSheet = 'practice';
  state.colCount = headers.length;
  state.rowCount = rowCount;
  state.grid = grid;
}

// ============================================================================
// Render tabel spreadsheet
// ============================================================================

function renderSheetTabs() {
  if (!els.sheetTabs) return;
  els.sheetTabs.innerHTML = '';
  const sheets = [
    { key: 'data', label: 'Sheet 1 · Dataset' },
    { key: 'practice', label: 'Sheet 2 · Soal & Kunci' },
  ];

  sheets.forEach((sheet) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sheet-tab';
    if (state.activeSheet === sheet.key) btn.classList.add('is-active');
    btn.textContent = sheet.label;
    btn.addEventListener('click', () => {
      state.activeSheet = sheet.key;
      renderSheetTabs();
      renderSpreadsheetTable();
      if (sheet.key === 'data') {
        const targetAddr = state.currentQuestion ? state.currentQuestion.targetCell : 'A1';
        setActiveCell(targetAddr);
      } else {
        setActiveCell('A1');
      }
    });
    els.sheetTabs.appendChild(btn);
  });
}

function renderSpreadsheetTable() {
  const table = els.spreadsheetTable;
  table.innerHTML = '';
  if (state.activeSheet === 'practice') {
    buildPracticeSheetGrid();
  } else {
    rebuildDataSheetGrid();
  }

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.className = 'row-head row-head-header';
  headRow.appendChild(corner);
  for (let c = 0; c < state.colCount; c++) {
    const th = document.createElement('th');
    th.textContent = indexToColLetter(c);
    th.id = `col-header-${c}`;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 0; r < state.rowCount; r++) {
    const tr = document.createElement('tr');
    const rowHead = document.createElement('td');
    rowHead.className = 'row-head';
    rowHead.id = `row-head-${r}`;
    rowHead.textContent = String(r + 1);
    tr.appendChild(rowHead);

    for (let c = 0; c < state.colCount; c++) {
      tr.appendChild(buildCellElement(c, r));
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  formulaInteractivity?.onGridRendered();
}

function buildCellElement(col, row) {
  const addr = cellAddress(col, row);
  const td = document.createElement('td');
  td.className = 'cell';
  td.dataset.addr = addr;
  td.dataset.col = String(col);
  td.dataset.row = String(row);

  const cellData = getCellRaw(state.grid, addr);
  const isHeaderContentRow = row === 0; // header dataset (bukan header kolom Excel)
  if (isHeaderContentRow) td.classList.add('header-label-cell');

  const isTarget = state.currentQuestion && state.currentQuestion.targetCell === addr;
  if (isTarget) td.dataset.target = 'true';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cell-input';
  input.dataset.addr = addr;
  input.readOnly = !!(cellData && cellData.readonly);
  const colType = state.dataset && state.dataset.columnTypes[col];
  if (colType === 'number') input.dataset.type = 'number';
  input.value = computeDisplayValue(addr);

  input.addEventListener('focus', () => onCellFocus(addr));
  input.addEventListener('input', () => {
    // sinkronkan langsung ke formula bar selagi mengetik di dalam sel
    if (state.activeCell === addr) els.formulaBarInput.value = input.value;
  });
  input.addEventListener('blur', () => commitCell(addr, input.value));
  input.addEventListener('keydown', (e) => onCellKeydown(e, col, row));

  td.appendChild(input);
  return td;
}

/** Nilai yang ditampilkan saat sel TIDAK sedang difokus/diedit. */
function computeDisplayValue(addr) {
  const cellData = getCellRaw(state.grid, addr);
  if (!cellData || cellData.raw === '' || cellData.raw === undefined) return '';
  const raw = cellData.raw;
  const parsed = parseCellAddress(addr);
  const colType = state.dataset && parsed ? state.dataset.columnTypes[parsed.col] : undefined;

  if (typeof raw === 'string' && raw.trim().startsWith('=')) {
    const result = evaluateFormula(raw, state.grid);
    if (result.error) return '#ERROR';
    return formatAnyValue(result.value);
  }
  if (typeof raw === 'number') {
    // Kolom Tanggal disimpan sebagai serial number (lihat dataset-generator.js) —
    // tampilkan sebagai DD/MM/YYYY, bukan angka mentah, hanya untuk sel data asli (readonly).
    if (colType === 'date' && cellData.readonly) return formatSerialAsDate(raw);
    return cellData.readonly ? formatCellNumber(raw) : String(raw);
  }
  return String(raw);
}

/** Format nilai APA PUN (angka, teks, atau boolean) untuk ditampilkan — dipakai sel & panel hasil. */
function formatAnyValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return formatCellNumber(value);
  if (typeof value === 'boolean') return value ? 'BENAR' : 'SALAH';
  return String(value);
}

function formatCellNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
}

// ============================================================================
// Interaksi grid: seleksi sel, formula bar, navigasi keyboard
// ============================================================================

function onCellFocus(addr) {
  setActiveCell(addr);
}

function setActiveCell(addr) {
  const parsed = parseCellAddress(addr);
  if (!parsed || parsed.row >= state.rowCount || parsed.col >= state.colCount) return;

  // Bersihkan highlight sebelumnya
  const prevTd = document.querySelector('td.cell[data-active="true"]');
  if (prevTd) prevTd.removeAttribute('data-active');
  document.querySelectorAll('.is-active-line').forEach((elm) => elm.classList.remove('is-active-line'));

  state.activeCell = addr;
  els.nameBox.textContent = addr;

  const cellData = getCellRaw(state.grid, addr);
  // Sel terkunci (header/data hasil generate): tampilkan nilai yang mudah dibaca (mis. tanggal terformat).
  // Sel yang bisa diedit (jawaban/coretan): tampilkan RAW apa adanya, termasuk rumus, siap untuk diedit.
  const barValue = cellData ? (cellData.readonly ? computeDisplayValue(addr) : String(cellData.raw)) : '';
  els.formulaBarInput.value = barValue;
  els.formulaBarInput.readOnly = !!(cellData && cellData.readonly);

  const td = document.querySelector(`td.cell[data-addr="${addr}"]`);
  if (td) {
    td.dataset.active = 'true';
    const input = td.querySelector('.cell-input');
    // Saat berpindah lewat klik/navigasi (bukan lewat event focus itu sendiri), sinkronkan dengan formula bar
    if (document.activeElement !== input) input.value = barValue;
  }
  const colHeader = document.getElementById(`col-header-${parsed.col}`);
  const rowHead = document.getElementById(`row-head-${parsed.row}`);
  if (colHeader) colHeader.classList.add('is-active-line');
  if (rowHead) rowHead.classList.add('is-active-line');

  formulaInteractivity?.onActiveCellChanged();
}

/** Simpan nilai yang diketik pengguna ke grid, lalu perbarui tampilan sel (kembali ke mode "display"). */
function commitCell(addr, rawValue) {
  const cellData = getCellRaw(state.grid, addr);
  if (cellData && cellData.readonly) return; // sel terkunci, tidak disimpan

  const trimmed = rawValue.trim();
  const numeric = trimmed !== '' && !trimmed.startsWith('=') && !Number.isNaN(Number(trimmed)) ? Number(trimmed) : trimmed;
  setCellRaw(state.grid, addr, numeric === '' ? '' : numeric);

  const td = document.querySelector(`td.cell[data-addr="${addr}"]`);
  if (td) {
    const input = td.querySelector('.cell-input');
    if (document.activeElement !== input) input.value = computeDisplayValue(addr);
  }

  formulaInteractivity?.onCellCommitted(addr);
}

function onCellKeydown(e, col, row) {
  const moveMap = {
    ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Enter: [0, 1],
  };
  if (e.key === 'Escape') {
    e.target.blur();
    return;
  }
  if (!(e.key in moveMap)) return;
  e.preventDefault();
  commitCell(cellAddress(col, row), e.target.value);
  const [dc, dr] = moveMap[e.key];
  const nextCol = Math.min(Math.max(col + dc, 0), state.colCount - 1);
  const nextRow = Math.min(Math.max(row + dr, 0), state.rowCount - 1);
  focusCellAt(nextCol, nextRow);
}

function focusCellAt(col, row) {
  const addr = cellAddress(col, row);
  const td = document.querySelector(`td.cell[data-addr="${addr}"]`);
  if (td) {
    const input = td.querySelector('.cell-input');
    input.focus();
    input.select();
  }
}

function initFormulaBar() {
  els.formulaBarInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitCell(state.activeCell, els.formulaBarInput.value);
    const parsed = parseCellAddress(state.activeCell);
    const nextRow = Math.min(parsed.row + 1, state.rowCount - 1);
    focusCellAt(parsed.col, nextRow);
  });
}

// ============================================================================
// Alur latihan: mulai soal → periksa → petunjuk → pembahasan → soal berikutnya
// ============================================================================

function resetQuestionUI() {
  state.currentQuestion = null;
  state.activeQuestionIndex = -1;
  state.hintsRevealed = 0;
  state.answered = false;
  els.questionTitle.textContent = '—';
  els.questionInstruction.textContent = 'Buat dataset untuk memuat paket soal dan kunci jawaban ke dalam workbook.';
  els.btnJumpToTarget.textContent = '—';
  els.btnJumpToTarget.disabled = true;

  toggleQuestionButtons({ start: true, hint: false, check: false, explain: false, next: false });
  if (els.btnHint) {
    els.btnHint.disabled = false;
    els.btnHint.textContent = 'Petunjuk';
  }
  els.resultPanel.hidden = true;
  els.hintPanel.hidden = true;
  els.explanationPanel.hidden = true;
  els.hintList.innerHTML = '';
  renderPracticeQueue();
}

function toggleQuestionButtons(visible) {
  if (els.btnStartPractice) els.btnStartPractice.hidden = !visible.start;
  if (els.btnHint) els.btnHint.hidden = !visible.hint;
  if (els.btnCheckAnswer) els.btnCheckAnswer.hidden = !visible.check;
  if (els.btnExplain) els.btnExplain.hidden = !visible.explain;
  if (els.btnNextQuestion) els.btnNextQuestion.hidden = !visible.next;
}

function initQuestionFlow() {
  els.btnStartPractice.addEventListener('click', downloadWorkbookAsXlsx);
  els.btnNextQuestion.addEventListener('click', goToNextQuestion);
  els.btnHint.addEventListener('click', revealNextHint);
  els.btnCheckAnswer.addEventListener('click', checkCurrentAnswer);
  els.btnExplain.addEventListener('click', showExplanation);
  els.btnJumpToTarget.addEventListener('click', () => {
    if (!state.currentQuestion) return;
    focusCellAt(...cellAddrToColRow(state.currentQuestion.targetCell));
    document.querySelector(`td.cell[data-addr="${state.currentQuestion.targetCell}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  });
}

function cellAddrToColRow(addr) {
  const parsed = parseCellAddress(addr);
  return [parsed.col, parsed.row];
}

function buildQuestionForCurrentLevel() {
  return generateQuestionForLevel({
    level: state.level,
    headers: state.dataset.headers,
    rows: state.dataset.rows,
    dataStartRowIndex: state.dataStartRowIndex,
    targetRowIndex: state.targetRowIndex,
    datasetType: state.datasetType,
    columnTypes: state.dataset.columnTypes || [],
  });
}

function renderPracticeQueue() {
  if (!els.questionQueueList) return;
  els.questionQueueList.innerHTML = '';
  if (!state.practiceQuestions.length) {
    els.questionQueuePanel.hidden = true;
    els.questionQueueMeta.textContent = 'Belum ada paket soal';
    return;
  }

  els.questionQueuePanel.hidden = false;
  const completedCount = state.practiceQuestions.filter((q) => q.completed).length;
  els.questionQueueMeta.textContent = `${completedCount}/${state.practiceQuestions.length} soal selesai`;

  state.practiceQuestions.forEach((question, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'question-queue__item';
    if (index === state.activeQuestionIndex) item.classList.add('is-active');
    if (question.completed) item.classList.add('is-complete');

    item.innerHTML = `
      <span class="question-queue__number">${index + 1}</span>
      <span class="question-queue__body">
        <strong>${question.title}</strong>
        <small>${question.targetCell}</small>
      </span>
    `;

    item.addEventListener('click', () => loadPracticeQuestion(index));
    els.questionQueueList.appendChild(item);
  });
}

function preparePracticeQuestions() {
  if (!state.dataset) return;
  const levelDef = LEVEL_LABELS.find((l) => l.level === state.level);
  if (!levelDef || !levelDef.available) {
    alert('Level ini belum tersedia pada tahap pengembangan saat ini.');
    return;
  }

  const batchSize = Math.min(12, Math.max(8, Math.floor(state.dataset.rows.length / 2)));
  state.practiceQuestions = [];

  try {
    // Clear session history when starting a new practice package so the batch is fresh
    clearSessionHistory();
    state.practiceQuestions = generateQuestionBatch({
      level: state.level,
      headers: state.dataset.headers,
      rows: state.dataset.rows,
      dataStartRowIndex: state.dataStartRowIndex,
      targetRowIndex: state.targetRowIndex,
      datasetType: state.datasetType,
      columnTypes: state.dataset.columnTypes || [],
      count: batchSize,
    });
  } catch (err) {
    alert(err.message || 'Gagal membuat paket soal untuk level/dataset ini.');
    return;
  }

  clearTargetRowAnswerCells();
  state.currentQuestion = state.practiceQuestions[0] || null;
  state.activeQuestionIndex = state.currentQuestion ? 0 : -1;
  state.hintsRevealed = 0;
  state.answered = false;
  renderPracticeQueue();
}

/**
 * downloadWorkbookAsXlsx — export sekarang melalui arsitektur baru:
 *   state → buildWorkbookBlueprint() → renderBlueprintToWorkbook() → .xlsx
 * (lihat js/export/workbook-blueprint.js dan js/export/workbook-renderer.js).
 *
 * Dipindah dari SheetJS (xlsx) ke ExcelJS: SheetJS Community Edition
 * mendokumentasikan cell.s (font/fill/border) tapi diam-diam TIDAK
 * menuliskannya ke file — terverifikasi langsung lewat isi styles.xml hasil
 * ekspornya. ExcelJS menuliskan styling, Table, autofilter, freeze pane, dan
 * merge cell dengan benar (juga sudah diverifikasi), dan sepenuhnya open
 * source (tidak ada fitur "Pro" yang dikunci).
 */
async function downloadWorkbookAsXlsx() {
  if (!state.dataset || !state.practiceQuestions || !state.practiceQuestions.length) {
    alert('Buat dataset dan paket soal terlebih dahulu (klik "Buat Dataset") sebelum mengekspor.');
    return;
  }
  if (typeof ExcelJS === 'undefined' || typeof window.WorkbookExport?.renderBlueprintToWorkbook !== 'function') {
    alert('Engine export belum siap dimuat. Coba muat ulang halaman (Ctrl+Shift+R).');
    return;
  }

  showToast('Menyusun workbook .xlsx…');
  try {
    const catalog = await loadFormulaCatalog();
    const levelLabel = LEVEL_LABELS.find((l) => l.level === state.level)?.name || `Level ${state.level}`;
    const blueprint = window.WorkbookExport.buildWorkbookBlueprint({
      dataset: state.dataset,
      questions: state.practiceQuestions,
      level: state.level,
      levelLabel,
      datasetType: state.datasetType,
      formulaCatalog: catalog,
    });

    const buffer = await window.WorkbookExport.renderBlueprintToWorkbook(blueprint);
    if (!buffer || !buffer.byteLength) {
      alert('File Excel yang dibuat ternyata kosong (0 byte). Coba muat ulang halaman lalu ulangi export.');
      return;
    }

    const fileName = `excel-practice-${state.datasetType}-level-${state.level}.xlsx`;
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast(`Workbook .xlsx (${(buffer.byteLength / 1024).toFixed(0)} KB, 5 sheet) berhasil diunduh. Jika file tidak muncul, cek bar unduhan browser.`);
  } catch (err) {
    console.error(err);
    alert('Gagal membuat file Excel: ' + (err?.message || 'kesalahan tidak diketahui') + '.');
  }
}

function loadPracticeQuestion(index) {
  if (!state.practiceQuestions.length) return;
  const question = state.practiceQuestions[index];
  if (!question) return;

  state.activeQuestionIndex = index;
  clearTargetRowAnswerCells();
  state.currentQuestion = question;
  state.hintsRevealed = 0;
  state.answered = !!question.completed;

  els.questionLevelChip.textContent = `Level ${question.level}`;
  els.questionTitle.textContent = question.title;
  els.questionInstruction.textContent = question.instruction;
  els.btnJumpToTarget.textContent = question.targetCell;
  els.btnJumpToTarget.disabled = false;

  if (question.completed) {
    toggleQuestionButtons({ start: false, hint: false, check: false, explain: true, next: true });
  } else {
    toggleQuestionButtons({ start: false, hint: true, check: true, explain: false, next: false });
  }

  els.btnHint.disabled = false;
  els.btnHint.textContent = 'Petunjuk';
  els.resultPanel.hidden = true;
  els.hintPanel.hidden = true;
  els.explanationPanel.hidden = true;
  els.hintList.innerHTML = '';

  renderPracticeQueue();
  renderSheetTabs();
  renderSpreadsheetTable();
  setActiveCell(question.targetCell);
  focusCellAt(...cellAddrToColRow(question.targetCell));
}

function goToNextQuestion() {
  if (!state.practiceQuestions.length) return;
  const nextIndex = state.activeQuestionIndex + 1;
  if (nextIndex >= state.practiceQuestions.length) {
    els.questionInstruction.textContent = 'Paket soal selesai. Anda dapat mulai lagi untuk latihan baru.';
    toggleQuestionButtons({ start: true, hint: false, check: false, explain: false, next: false });
    return;
  }
  loadPracticeQuestion(nextIndex);
}

function clearTargetRowAnswerCells() {
  if (state.targetRowIndex === null || !state.dataset) return;
  for (let c = 1; c < state.dataset.headers.length; c++) {
    const addr = cellAddress(c, state.targetRowIndex);
    setCellRaw(state.grid, addr, '', { force: true });
  }
}


function revealNextHint() {
  if (!state.currentQuestion) return;
  if (state.hintsRevealed >= state.currentQuestion.hints.length) return;
  const hintText = state.currentQuestion.hints[state.hintsRevealed];
  state.hintsRevealed += 1;

  els.hintPanel.hidden = false;
  const li = document.createElement('li');
  li.textContent = hintText;
  els.hintList.appendChild(li);

  if (state.hintsRevealed >= state.currentQuestion.hints.length) {
    els.btnHint.disabled = true;
    els.btnHint.textContent = 'Semua petunjuk terbuka';
  }
}

function showExplanation() {
  if (!state.currentQuestion) return;
  els.explanationPanel.hidden = false;
  els.explanationText.textContent = state.currentQuestion.explanation;
}

let _progressSaveFailWarned = false; // supaya peringatan penyimpanan gagal cuma sekali per sesi

/**
 * checkCurrentAnswer — inti dari loop belajar in-browser: baca rumus yang
 * ditulis siswa di sel target, validasi lewat formula-validator.js, catat
 * hasilnya (XP/badge/riwayat) lewat progress-manager.js, dan tampilkan
 * hasilnya. Sebelumnya fungsi ini tidak ada sama sekali — validateAnswer()
 * dan recordAttempt() sudah lengkap tapi tidak pernah dipanggil dari UI,
 * jadi soal tidak pernah bisa benar-benar "diperiksa" di dalam browser.
 */
function checkCurrentAnswer() {
  if (!state.currentQuestion) return;

  const cellData = getCellRaw(state.grid, state.currentQuestion.targetCell);
  const rawInput = cellData ? cellData.raw : '';

  const result = validateAnswer({ rawInput, grid: state.grid, question: state.currentQuestion });

  els.resultPanel.hidden = false;
  els.resultPanel.dataset.status = result.status;
  els.resultStatus.textContent = result.status === 'correct' ? '✅ Jawaban Benar' : '❌ Belum Tepat';
  els.resultMessage.textContent = result.message;
  els.resultValues.textContent =
    `Jawaban Anda: ${formatAnyValue(result.userValue) || '-'}  |  Diharapkan: ${formatAnyValue(result.expectedValue) || '-'}`;

  const { xpGained, newBadges, saved } = recordAttempt({
    question: state.currentQuestion,
    status: result.status,
    hintsUsed: state.hintsRevealed,
  });

  if (!saved && !_progressSaveFailWarned) {
    _progressSaveFailWarned = true;
    showToast('⚠️ Progres gagal disimpan (penyimpanan browser penuh/mode privat). XP mungkin tidak tersimpan permanen.');
  }

  if (result.status === 'correct') {
    state.currentQuestion.completed = true;
    state.answered = true;
    toggleQuestionButtons({ start: false, hint: false, check: false, explain: true, next: true });
    if (xpGained > 0) showToast(`+${xpGained} XP — jawaban benar!`);
    newBadges.forEach((badge) => showToast(`🏅 Badge baru: ${badge.name}!`));
  }
  // Kalau belum tepat: tombol "Periksa Jawaban" & "Petunjuk" tetap tampil
  // supaya siswa bisa memperbaiki rumus dan mencoba lagi (retry-friendly).

  renderPracticeQueue();
  renderDashboard();
}

// ============================================================================
// Util kecil
// ============================================================================

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ============================================================================
// Inisialisasi
// ============================================================================

function init() {
  cacheDom();
  renderDatasetNav();
  renderLevelPath();
  updateSelectionNote();
  renderDashboard();
  initSetupPanel();
  initFormulaBar();
  initQuestionFlow();
  resetQuestionUI();

  formulaInteractivity = initFormulaInteractivity({
    els: {
      formulaBarInput: els.formulaBarInput,
      spreadsheetScroll: els.spreadsheetScroll,
      spreadsheetTable: els.spreadsheetTable,
    },
    engine: {
      getCellRaw, setCellRaw, cellAddress, parseCellAddress, indexToColLetter, colLetterToIndex,
      adjustFormulaRefs, parseRange,
    },
    getGrid: () => state.grid,
    isReadonly: (addr) => {
      const cellData = getCellRaw(state.grid, addr);
      return !!(cellData && cellData.readonly);
    },
    commitCell,
    computeDisplayValue,
    getActiveCell: () => state.activeCell,
    showToast,
  });

  // Development debug helper
  if (typeof window !== 'undefined') {
    window.debugQuestionEngine = () => debugQuestionEngine({
      level: state.level,
      datasetType: state.datasetType,
      currentQuestion: state.currentQuestion,
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
