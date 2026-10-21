/**
 * Accounting Engine – Core Orchestrator
 * ============================================================
 * Single entry-point for the complete accounting cycle.
 *
 * Pipeline:
 *   loadTransactions → journal → postToLedger → trialBalance
 *        → applyAdjustments → adjustedTrialBalance → worksheet
 *        → financialStatements → closingEntries → postClosingTB
 *
 * ALL numbers are derived from transaction / adjustment data.
 * NO hardcoded financial figures anywhere in the engine.
 *
 * Struktur: engine/state.js (objek state bersama), engine/core.js (init, transaksi, jurnal, buku besar,
 * neraca saldo, penyesuaian, sesi), engine/statements.js (kertas kerja, laporan keuangan, penutupan).
 * File ini = fasad + runFullCycle; daftar export tidak berubah.
 */

import { initEngine, loadRandomTransactions, loadAdjustments, buildJournal, submitUserJournal, postToLedger, generateTrialBalance, buildAdjustmentJournal, submitUserAdjustmentJournal, getEngineSnapshot } from './engine/core.js';
import { generateAdjustedTrialBalance, generateWorksheet, generateFinancialStatements, generateClosingEntries, generatePostClosingTrialBalance } from './engine/statements.js';

// API publik lama tetap diekspor dari sini (isi dipindah ke ./engine/).
export { initEngine, loadRandomTransactions, loadAdjustments, analyzeTransaction, analyzeAllTransactions, buildJournal, validateUserJournal, getExpectedJournal, submitUserJournal, hasUserJournal, getUserJournal, postToLedger, getLedgerArray, getAccountBalance, generateTrialBalance, buildAdjustmentJournal, submitUserAdjustmentJournal, hasUserAdjustmentJournal, getUserAdjustmentJournal, getEngineSnapshot, getCurrentLevel, exportSessionState, importSessionState, getAccounts, getLoadedTransactions, getLoadedAdjustments } from './engine/core.js';
export { generateAdjustedTrialBalance, generateWorksheet, generateFinancialStatements, generateClosingEntries, generatePostClosingTrialBalance } from './engine/statements.js';

/**
 * Run the FULL accounting cycle in one call (for demo / auto-complete).
 * Explicitly submits the answer key as the "working" journal & adjustments
 * (as if a student had entered the correct answers), then runs the whole
 * pipeline from that submitted data — so this stays consistent with the
 * normal student-driven flow instead of bypassing it.
 * @returns {object} complete cycle output
 */
export function runFullCycle(level = 1, transactionCount = 6) {
  initEngine(level);
  loadRandomTransactions(transactionCount);
  loadAdjustments();
  const journal = buildJournal();
  submitUserJournal(journal.lines);
  postToLedger();
  const trialBalance = generateTrialBalance();
  const adjustmentJournal = buildAdjustmentJournal();
  submitUserAdjustmentJournal(adjustmentJournal);
  const adjustedTB = generateAdjustedTrialBalance();
  const worksheet = generateWorksheet();
  const statements = generateFinancialStatements();
  const closing = generateClosingEntries();
  const postClosingTB = generatePostClosingTrialBalance();

  return {
    snapshot: getEngineSnapshot(),
    journal,
    trialBalance,
    adjustedTB,
    worksheet,
    statements,
    closing,
    postClosingTB
  };
}
