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

  window.PDFExport.exportElementToPDF(element, {
    filename: 'Laporan_Keuangan_ActMaster.pdf',
    scale: 2.5,
    widthPx: 720,
    onClone: (clone) => {
      clone.querySelectorAll('table').forEach((t) => {
        t.style.width = '100%';
        t.style.borderCollapse = 'collapse';
        t.style.fontSize = '9pt';
      });
      clone.querySelectorAll('th, td').forEach((c) => {
        c.style.border = '1px solid #cbd5e1';
        c.style.padding = '5px 6px';
      });
    }
  }).then(() => {
    showToast('✅ PDF laporan keuangan berhasil diunduh.');
  }).catch((err) => {
    console.error('[exportToPDF]', err);
    showToast(`❌ ${err.message || 'Gagal membuat PDF laporan keuangan.'}`);
  });
}
