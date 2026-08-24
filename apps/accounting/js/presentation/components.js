/**
 * Presentation Layer – Reusable UI components
 * Journal row creation, badge rendering, theme toggle, etc.
 */

import { getBadges } from '../business/appState.js';
import { getAccounts } from '../accounting/engine.js';
import { saveTheme, loadTheme } from '../storage/localStorage.js';
import { showToast } from './modals.js';

/**
 * Appends a new editable journal row to the given table.
 * @param {string} tableId  – e.g. 'journalTable', 'adjTable', 'closingTable'
 */
export function addJournalRow(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const tbody = table.querySelector('tbody');
  const accounts = getAccounts();
  const options = accounts
    .map(acc => `<option value="${acc.name}">${acc.code} - ${acc.name}</option>`)
    .join('');

  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="date" value="2026-01-31"></td>
    <td><select>${options}</select></td>
    <td><input type="number" class="debit-input" value="0" min="0"></td>
    <td><input type="number" class="kredit-input" value="0" min="0"></td>
    <td><button class="btn btn-danger btn-sm" data-action="remove-row">🗑️</button></td>
  `;

  // Attach remove handler
  row.querySelector('[data-action="remove-row"]').addEventListener('click', () => {
    row.remove();
  });

  tbody.appendChild(row);
}

/**
 * Clears all rows of a journal table and adds one empty row.
 * @param {string} tableId
 */
export function resetJournal(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  table.querySelector('tbody').innerHTML = '';
  addJournalRow(tableId);
}

/**
 * Renders the badge grid on the dashboard.
 */
export function renderBadges() {
  const container = document.getElementById('badgeContainer');
  if (!container) return;

  const badges = getBadges();
  container.innerHTML = badges
    .map(
      b => `
      <div class="badge-card ${b.unlocked ? 'unlocked' : ''}">
        <div style="font-size: 1.8rem;">🏆</div>
        <strong>${b.name}</strong>
        <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 4px;">${b.desc}</div>
      </div>`
    )
    .join('');
}

/**
 * Updates the XP / Level / Mode badges in the navbar.
 * @param {{ xp?: number, userLevel?: number, mode?: string }} data
 */
export function updateNavbarStats({ xp, userLevel, mode } = {}) {
  if (xp !== undefined) {
    const el = document.getElementById('userXP');
    if (el) el.innerText = xp;
  }
  if (userLevel !== undefined) {
    const el = document.getElementById('userLevel');
    if (el) el.innerText = userLevel;
  }
  if (mode !== undefined) {
    const el = document.getElementById('gameMode');
    if (el) el.innerText = mode;
  }
}

/**
 * Updates the evaluation score display.
 * @param {{ score: number, grade: string }} summary
 */
export function updateScoreDisplay({ score, grade }) {
  const scoreEl = document.getElementById('finalScore');
  const gradeEl = document.getElementById('scoreGrade');
  if (scoreEl) scoreEl.innerText = score;
  if (gradeEl) gradeEl.innerText = `Grade: ${grade}`;
}

/**
 * Toggles light / dark theme and persists preference.
 */
export function toggleTheme() {
  const htmlEl = document.documentElement;
  const themeBtn = document.getElementById('themeBtn');

  if (htmlEl.getAttribute('data-theme') === 'dark') {
    htmlEl.removeAttribute('data-theme');
    if (themeBtn) themeBtn.innerText = '🌙';
    saveTheme('light');
  } else {
    htmlEl.setAttribute('data-theme', 'dark');
    if (themeBtn) themeBtn.innerText = '☀️';
    saveTheme('dark');
  }
}

/**
 * Applies the saved theme on page load.
 */
export function applySavedTheme() {
  if (loadTheme() === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.innerText = '☀️';
  }
}

/**
 * Exports journal data as a downloadable CSV file.
 * @param {Array<{ a: string, d: number, k: number }>} journalData
 */
export function exportJournalCSV(journalData) {
  let csv = 'data:text/csv;charset=utf-8,Nama Akun,Debit,Kredit\n';
  journalData.forEach(row => {
    csv += `${row.a},${row.d},${row.k}\n`;
  });
  const encoded = encodeURI(csv);
  const link = document.createElement('a');
  link.setAttribute('href', encoded);
  link.setAttribute('download', 'Jurnal_Umum_Accounting_Master.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports the financial report container to PDF via the shared
 * PDFExport engine (js/shared/pdf-export.js). Uses an on-screen
 * isolated render container + Blob validation, so a failed export
 * is never mistaken for a successful one.
 */
export function exportToPDF() {
  const element = document.getElementById('financialReportContainer');
  if (!element) {
    showToast('❌ Area laporan keuangan tidak ditemukan.');
    return;
  }
  if (!window.PDFExport) {
    showToast('❌ Mesin PDF tidak tersedia. Coba muat ulang halaman.');
    return;
  }

  showToast('⏳ Membuat PDF laporan keuangan…');

  var sel = document.getElementById('laporanPaperSize');
  var paperFmt = (sel && sel.value === 'f4') ? [210, 330] : 'a4';
  window.PDFExport.exportElementToPDF(element, {
    filename: 'Laporan_Keuangan_ActMaster.pdf',
    scale: 2,
    widthPx: 794,
    margin: [12, 14, 14, 14],
    format: paperFmt,
    extraCss: [
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}',
      'body{margin:0;padding:0;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:12px;color:#0f172a;background:#fff;}',
      'h1,h2,h3,h4{font-weight:800;color:#0f172a;margin:0 0 8px;}',
      'h2{font-size:16px;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:12px;}',
      'table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0 14px;}',
      'th{background:#0f172a;color:#fff;padding:7px 10px;text-align:left;font-weight:700;border:1px solid #0f172a;}',
      'td{padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;}',
      'tr:nth-child(even) td{background:#f8fafc;}',
      '.section-title{font-size:14px;font-weight:800;color:#0f172a;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;}'
    ].join(''),
    onClone: (clone) => {
      clone.querySelectorAll('[style]').forEach((el) => {
        el.style.color = '#0f172a';
      });
      clone.querySelectorAll('table').forEach((t) => {
        t.style.width = '100%';
        t.style.borderCollapse = 'collapse';
      });
      clone.querySelectorAll('th, td').forEach((c) => {
        c.style.border = '1px solid #e2e8f0';
        c.style.padding = '6px 10px';
        c.style.fontSize = '11px';
      });
      clone.querySelectorAll('th').forEach((c) => {
        c.style.background = '#0f172a';
        c.style.color = '#fff';
        c.style.fontWeight = '700';
      });
    }
  }).then(() => {
    showToast('✅ PDF laporan keuangan berhasil diunduh.');
  }).catch((err) => {
    console.error('[exportToPDF]', err);
    showToast(`❌ ${err.message || 'Gagal membuat PDF laporan keuangan.'}`);
  });
}
