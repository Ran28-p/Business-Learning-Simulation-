/**
 * Presentation Layer – Page rendering & navigation
 */
import { generateTransactions, generateAdjustments, getLoadedTransactions, getLoadedAdjustments } from '../accounting/transactions.js';
import { buildLedgers, renderTAccountHTML, hasUserJournal } from '../accounting/ledger.js';
import { renderTrialBalanceHTML } from '../accounting/trialBalance.js';
import { renderWorksheetHTML } from '../accounting/worksheet.js';
import { renderAllStatementsHTML } from '../accounting/financialReports.js';
import { rewardWorksheetComplete, rewardFinancialReport } from '../business/gamification.js';
import { renderBadges } from './components.js';
import {
  initEngine,
  buildJournal,
  postToLedger,
  buildAdjustmentJournal
} from '../accounting/engine.js';
import { renderProgressSummaryHTML, getProgress } from '../business/scoringEngine.js';
import {
  onShowPengaturanPajak, onShowMasterPartner, onShowMasterProduk, onShowBuatInvoice,
  onShowDaftarInvoice, onShowInputPembelian, onShowPajakKeluaran, onShowRekonsiliasi,
  onShowJurnalTransaksi
} from './taxUI.js';
import { renderDashboardKPIs } from './taxPages.js';

const BELUM_JURNAL_MSG =
  'Belum ada data untuk ditampilkan. Kerjakan <b>Jurnal Umum</b> lalu klik <b>Check & Submit Jurnal</b> terlebih dahulu ' +
  '— atau gunakan <b>⚡ Auto-Post</b> di halaman Buku Besar untuk melihat contoh jawaban.';

export function showPage(pageId) {
  document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));

  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  const activeNav = Array.from(document.querySelectorAll('.sidebar-menu a')).find(
    a => a.dataset.page === pageId
  );
  if (activeNav) activeNav.classList.add('active');

  if (pageId === 'buku-besar') renderLedgersPage();
  if (pageId === 'neraca-saldo') renderTrialBalancePage();
  if (pageId === 'worksheet') renderWorksheetPage();
  if (pageId === 'laporan') renderFinancialReportsPage();
  if (pageId === 'evaluasi') renderEvaluasiPage();
  if (pageId === 'dashboard') renderDashboardKPIs();

  if (pageId === 'pengaturan-pajak') onShowPengaturanPajak();
  if (pageId === 'master-partner') onShowMasterPartner();
  if (pageId === 'master-produk') onShowMasterProduk();
  if (pageId === 'buat-invoice') onShowBuatInvoice();
  if (pageId === 'daftar-invoice') onShowDaftarInvoice();
  if (pageId === 'input-pembelian') onShowInputPembelian();
  if (pageId === 'pajak-keluaran') onShowPajakKeluaran();
  if (pageId === 'rekonsiliasi-ppn') onShowRekonsiliasi();
  if (pageId === 'jurnal-transaksi') onShowJurnalTransaksi();
}

export function renderEvaluasiPage() {
  const card = document.querySelector('#evaluasi .card');
  if (!card) return;
  // Keep title, replace body with progress summary
  const existing = card.querySelector('.progress-summary');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'progress-summary';
  div.innerHTML = renderProgressSummaryHTML();
  // Insert after the score display area
  const scoreArea = card.querySelector('#finalScore');
  if (scoreArea && scoreArea.parentElement) {
    scoreArea.parentElement.parentElement.insertAdjacentElement('afterend', div);
  } else {
    card.appendChild(div);
  }
  // Update final score from progress
  const p = getProgress();
  if (document.getElementById('finalScore')) {
    document.getElementById('finalScore').innerText = p.averageScore;
  }
  if (document.getElementById('scoreGrade')) {
    document.getElementById('scoreGrade').innerText = 'Grade: ' + p.grade + ' (' + p.gradeLabel + ')';
  }
}


function ensurePosted() {
  buildJournal();
  postToLedger();
  buildAdjustmentJournal();
}

function _renderTransactionListHTML(cases) {
  let html = '<ul style="list-style: none; padding: 0;">';
  cases.forEach(soal => {
    html += `
      <li style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; gap: 15px; align-items: start;">
        <div style="font-weight: bold; color: var(--accent-color); min-width: 65px; background: var(--bg-primary); padding: 5px 10px; border-radius: var(--radius-sm); text-align: center;">
          ${soal.tanggal}
        </div>
        <div style="line-height: 1.5;">
          ${soal.deskripsi}
        </div>
      </li>`;
  });
  html += '</ul>';
  return html;
}

/**
 * Loads a brand new random case and renders it. Used when starting fresh
 * or when the student explicitly asks for a new case ("Acak Soal Baru").
 */
export function renderTransactionList() {
  const container = document.getElementById('transactionList');
  if (!container) return;
  const cases = generateTransactions(6);
  container.innerHTML = _renderTransactionListHTML(cases);
  buildJournal();
}

/**
 * Renders whatever case is ALREADY loaded in the engine, without
 * regenerating it. Used after restoring a saved session.
 */
export function renderCurrentTransactionList() {
  const container = document.getElementById('transactionList');
  if (!container) return;
  const cases = getLoadedTransactions().map(t => ({ tanggal: t.tanggal, deskripsi: t.deskripsi }));
  container.innerHTML = _renderTransactionListHTML(cases);
  buildJournal();
}

function _renderAdjustmentListHTML(items) {
  let html = `
    <div style="border-left: 4px solid var(--warning); padding-left: 10px;">
      <h4 style="margin-top:0; color: var(--text-primary);">Data Penyesuaian Akhir Periode:</h4>
      <ul style="list-style: none; padding: 0; margin: 0;">`;
  items.forEach(soal => {
    html += `
      <li style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); display: flex; gap: 10px;">
        <span style="font-weight: bold; color: var(--danger); min-width: 60px;">${soal.tanggal}</span>
        <span style="color: var(--text-secondary);">${soal.deskripsi}</span>
      </li>`;
  });
  html += `</ul></div>`;
  return html;
}

/**
 * Loads adjustment cases matching the current transactions and renders
 * them. Safe to call repeatedly — it reuses the same simulation package
 * as long as the underlying case hasn't changed.
 */
export function renderAdjustmentData() {
  const container = document.getElementById('adjDataList');
  if (!container) return;
  const items = generateAdjustments();
  container.innerHTML = _renderAdjustmentListHTML(items);
  buildAdjustmentJournal();
}

/**
 * Renders whatever adjustment cases are ALREADY loaded in the engine,
 * without regenerating them. Used after restoring a saved session.
 */
export function renderCurrentAdjustmentData() {
  const container = document.getElementById('adjDataList');
  if (!container) return;
  const items = getLoadedAdjustments().map(a => ({ tanggal: a.tanggal, deskripsi: a.deskripsi }));
  container.innerHTML = _renderAdjustmentListHTML(items);
  buildAdjustmentJournal();
}

export function renderLedgersPage() {
  const container = document.getElementById('ledgerContainer');
  if (!container) return;
  if (!hasUserJournal()) {
    container.innerHTML = `<p style="color:var(--text-light);">${BELUM_JURNAL_MSG}</p>`;
    return;
  }
  ensurePosted();
  const ledgers = buildLedgers();
  const active = ledgers.filter(l => l.debits.length > 0 || l.credits.length > 0);
  container.innerHTML = active.map(renderTAccountHTML).join('')
    || `<p style="color:var(--text-light);">${BELUM_JURNAL_MSG}</p>`;
}

export function renderTrialBalancePage() {
  const tbody = document.querySelector('#trialBalanceTable tbody');
  if (!tbody) return;
  if (!hasUserJournal()) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-light); padding:24px;">${BELUM_JURNAL_MSG}</td></tr>`;
    return;
  }
  ensurePosted();
  tbody.innerHTML = renderTrialBalanceHTML();
}

export function renderWorksheetPage() {
  const tbody = document.querySelector('#worksheetTable tbody');
  if (!tbody) return;
  if (!hasUserJournal()) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--text-light); padding:24px;">${BELUM_JURNAL_MSG}</td></tr>`;
    return;
  }
  ensurePosted();
  tbody.innerHTML = renderWorksheetHTML();
  rewardWorksheetComplete();
  renderBadges();
}

export function renderFinancialReportsPage() {
  const container = document.getElementById('financialReportContainer');
  if (!container) return;
  if (!hasUserJournal()) {
    container.innerHTML = `<p style="color:var(--text-light);">${BELUM_JURNAL_MSG}</p>`;
    return;
  }
  ensurePosted();
  container.innerHTML = renderAllStatementsHTML();
  rewardFinancialReport();
  renderBadges();
}

export function reinitEngineForLevel(level) {
  initEngine(level);
  renderTransactionList();
  renderAdjustmentData();
}
