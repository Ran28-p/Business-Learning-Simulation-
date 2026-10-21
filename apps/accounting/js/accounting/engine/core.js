/**
 * engine/core.js — inisialisasi, transaksi, jurnal, buku besar, neraca saldo, jurnal penyesuaian, sesi
 * (dipecah dari ../engine.js; perilaku identik)
 */
import { getAccountsByLevel } from '../../../data/accounts.js';
import { generateSimulation } from '../../generators/index.js';
import { engine } from './state.js';

/* ═══════════════════════════════════════════════════════════
   1. INITIALISATION
   ═══════════════════════════════════════════════════════════ */

/**
 * Initialise / reset the engine for a company level.
 * @param {number|string} level
 * @param {object} [opts]
 */
export function initEngine(level = 1, opts = {}) {
  engine.level = Number(level);
  engine.companyName = opts.companyName || 'JAYA FAST';
  engine.periodLabel = opts.periodLabel || defaultPeriod(engine.level);
  engine.accounts = getAccountsByLevel(engine.level);
  engine.transactions = [];
  engine.adjustments = [];
  engine.journal = [];
  engine.adjustmentJournal = [];
  engine.userJournal = [];
  engine.userAdjustmentJournal = [];
  engine.closingJournal = [];
  engine.ledger = new Map();
  engine.phase = 'idle';
  engine._simulation = null;

  // Seed empty ledger slots for every account
  engine.accounts.forEach(acc => {
    engine.ledger.set(acc.name, {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normal: acc.normal,
      category: acc.category,
      debits: [],
      credits: [],
      balance: 0,
      side: acc.normal
    });
  });

  return getEngineSnapshot();
}

function defaultPeriod(level) {
  if (level === 2) return '30 April 2026';
  if (level === 3) return '31 Mei 2026';
  return '31 Maret 2026';
}

/* ═══════════════════════════════════════════════════════════
   2. TRANSACTION LOADING & ANALYSIS
   ═══════════════════════════════════════════════════════════ */

/**
 * Load a randomised set of practice transactions for the current level.
 * Each transaction already carries its correct double-entry lines.
 * @param {number} [count=6]
 * @returns {Array}
 */
export function loadRandomTransactions(count = 6) {
  // Use rule-based generator – no static bank
  const sim = generateSimulation(engine.level, count);
  engine.transactions = sim.transactions;
  engine.companyName = sim.company.name;
  engine.periodLabel = sim.periodLabel;
  // Store full simulation for adjustments & answer keys
  engine._simulation = sim;
  return engine.transactions.map(t => ({
    id: t.id,
    tanggal: t.tanggal,
    deskripsi: t.deskripsi
  }));
}

/**
 * Load ALL adjustment cases for the current level.
 * @returns {Array}
 */
export function loadAdjustments() {
  // Prefer adjustments from the current simulation package
  if (engine._simulation && engine._simulation.adjustments) {
    engine.adjustments = engine._simulation.adjustments;
  } else {
    // Regenerate if needed
    const sim = generateSimulation(engine.level, engine.transactions.length || 6);
    engine.adjustments = sim.adjustments;
    if (!engine.transactions.length) {
      engine.transactions = sim.transactions;
      engine.companyName = sim.company.name;
      engine.periodLabel = sim.periodLabel;
      engine._simulation = sim;
    }
  }
  return engine.adjustments.map(a => ({
    id: a.id,
    tanggal: a.tanggal,
    deskripsi: a.deskripsi
  }));
}

/**
 * Analyse a single transaction – return involved accounts, debits, credits.
 * @param {string} transactionId
 * @returns {{ accounts: string[], debits: object[], credits: object[], balanced: boolean }|null}
 */
export function analyzeTransaction(transactionId) {
  const tx = engine.transactions.find(t => t.id === transactionId);
  if (!tx) return null;

  const debits = tx.entries.filter(e => e.debit > 0).map(e => ({ account: e.account, amount: e.debit }));
  const credits = tx.entries.filter(e => e.credit > 0).map(e => ({ account: e.account, amount: e.credit }));
  const totalD = debits.reduce((s, e) => s + e.amount, 0);
  const totalK = credits.reduce((s, e) => s + e.amount, 0);

  return {
    id: tx.id,
    tanggal: tx.tanggal,
    deskripsi: tx.deskripsi,
    accounts: [...new Set(tx.entries.map(e => e.account))],
    debits,
    credits,
    totalDebit: totalD,
    totalCredit: totalK,
    balanced: totalD === totalK
  };
}

/**
 * Analyse all loaded transactions.
 */
export function analyzeAllTransactions() {
  return engine.transactions.map(t => analyzeTransaction(t.id));
}

/* ═══════════════════════════════════════════════════════════
   3. JOURNAL
   ═══════════════════════════════════════════════════════════ */

/**
 * Build the general journal from all loaded transactions.
 * Validates double-entry balance per transaction.
 * @returns {{ lines: Array, totalDebit: number, totalCredit: number, balanced: boolean, errors: string[] }}
 */
export function buildJournal() {
  const lines = [];
  const errors = [];
  let totalDebit = 0;
  let totalCredit = 0;

  engine.transactions.forEach(tx => {
    let txD = 0;
    let txK = 0;
    tx.entries.forEach(e => {
      lines.push({
        date: tx.tanggal,
        account: e.account,
        debit: e.debit,
        credit: e.credit,
        source: tx.id,
        type: 'general'
      });
      txD += e.debit;
      txK += e.credit;
      totalDebit += e.debit;
      totalCredit += e.credit;
    });
    if (txD !== txK) {
      errors.push(`Transaksi ${tx.id} tidak seimbang: D=${txD} K=${txK}`);
    }
  });

  engine.journal = lines;
  engine.phase = 'journaled';

  return {
    lines,
    totalDebit,
    totalCredit,
    balanced: totalDebit === totalCredit && errors.length === 0,
    errors
  };
}

/**
 * Validate user-submitted journal entries against double-entry rules
 * (and optionally against the engine's expected entries).
 * @param {Array<{ account: string, debit: number, credit: number }>} userEntries
 * @returns {{ valid: boolean, totalDebit: number, totalCredit: number, error?: string }}
 */
export function validateUserJournal(userEntries) {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const e of userEntries) {
    const d = Number(e.debit) || 0;
    const k = Number(e.credit) || 0;
    totalDebit += d;
    totalCredit += k;
  }

  if (totalDebit === 0 && totalCredit === 0) {
    return { valid: false, totalDebit, totalCredit, error: 'Nominal jurnal tidak boleh kosong atau nol.' };
  }
  if (totalDebit !== totalCredit) {
    return { valid: false, totalDebit, totalCredit, error: 'Jurnal Tidak Balans' };
  }
  return { valid: true, totalDebit, totalCredit };
}

/**
 * Get the expected (correct) journal lines for comparison / auto-fill.
 */
export function getExpectedJournal() {
  if (!engine.journal.length) buildJournal();
  return engine.journal;
}

/**
 * Submit the student's OWN journal entries (from the Jurnal Umum form) as
 * the real, working journal for this session. This is what actually gets
 * posted to the Buku Besar — NOT the internal answer key. Call this when
 * the student clicks "Check & Submit Jurnal".
 * @param {Array<{ account: string, debit: number, credit: number, date?: string }>} entries
 * @returns {Array} the normalised, stored user journal lines
 */
export function submitUserJournal(entries) {
  engine.userJournal = (entries || [])
    .filter(e => e.account && (Number(e.debit) > 0 || Number(e.credit) > 0))
    .map(e => ({
      date: e.date || engine.periodLabel,
      account: e.account,
      debit: Number(e.debit) || 0,
      credit: Number(e.credit) || 0,
      source: 'user',
      type: 'general'
    }));
  return engine.userJournal;
}

/**
 * Whether the student has submitted any journal lines yet this session.
 */
export function hasUserJournal() {
  return engine.userJournal.length > 0;
}

/**
 * The student's currently submitted journal lines (posted into the ledger).
 */
export function getUserJournal() {
  return engine.userJournal;
}

/* ═══════════════════════════════════════════════════════════
   4. LEDGER (Buku Besar) – Posting
   ═══════════════════════════════════════════════════════════ */

/**
 * Post the STUDENT'S OWN submitted journal lines into the ledger (T-accounts).
 * Resets ledger first. If the student hasn't submitted a journal yet
 * (userJournal is empty), the ledger simply comes out empty — it no longer
 * silently falls back to the answer key.
 * @returns {Map}
 */
export function postToLedger() {
  // Reset balances
  engine.ledger.forEach(slot => {
    slot.debits = [];
    slot.credits = [];
    slot.balance = 0;
    slot.side = slot.normal;
  });

  engine.userJournal.forEach(line => {
    _postLine(line.account, line.debit, line.credit);
  });

  _recomputeBalances();
  engine.phase = engine.userJournal.length ? 'posted' : 'idle';
  return engine.ledger;
}

function _postLine(accountName, debit, credit) {
  let slot = engine.ledger.get(accountName);
  if (!slot) {
    // Dynamic account (should not happen if chart is complete)
    slot = {
      code: '???', name: accountName, type: 'Unknown', normal: 'D',
      category: 'unknown', debits: [], credits: [], balance: 0, side: 'D'
    };
    engine.ledger.set(accountName, slot);
  }
  if (debit > 0) slot.debits.push(debit);
  if (credit > 0) slot.credits.push(credit);
}

function _recomputeBalances() {
  engine.ledger.forEach(slot => {
    const totalD = slot.debits.reduce((s, v) => s + v, 0);
    const totalK = slot.credits.reduce((s, v) => s + v, 0);
    if (slot.normal === 'D') {
      const raw = totalD - totalK;
      slot.balance = Math.abs(raw);
      slot.side = raw >= 0 ? 'D' : 'K';
    } else {
      const raw = totalK - totalD;
      slot.balance = Math.abs(raw);
      slot.side = raw >= 0 ? 'K' : 'D';
    }
  });
}

/**
 * Get ledger as a plain array (for rendering).
 */
export function getLedgerArray() {
  return Array.from(engine.ledger.values());
}

/**
 * Get balance for a single account.
 */
export function getAccountBalance(accountName) {
  const slot = engine.ledger.get(accountName);
  if (!slot) return { balance: 0, side: 'D' };
  return { balance: slot.balance, side: slot.side };
}

/* ═══════════════════════════════════════════════════════════
   5. TRIAL BALANCE
   ═══════════════════════════════════════════════════════════ */

/**
 * Generate Trial Balance from current ledger balances.
 * @returns {{ rows: Array, totalDebit: number, totalCredit: number, balanced: boolean }}
 */
export function generateTrialBalance() {
  // Always re-post from the latest submitted user journal so this never
  // shows stale or answer-key data.
  postToLedger();

  const rows = [];
  let totalDebit = 0;
  let totalCredit = 0;

  engine.ledger.forEach(slot => {
    if (slot.balance === 0) return;
    const debit = slot.side === 'D' ? slot.balance : 0;
    const credit = slot.side === 'K' ? slot.balance : 0;
    rows.push({
      code: slot.code,
      name: slot.name,
      type: slot.type,
      category: slot.category,
      debit,
      credit
    });
    totalDebit += debit;
    totalCredit += credit;
  });

  // Sort by account code
  rows.sort((a, b) => a.code.localeCompare(b.code));

  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}

/* ═══════════════════════════════════════════════════════════
   6. ADJUSTMENTS → ADJUSTED TRIAL BALANCE
   ═══════════════════════════════════════════════════════════ */

/**
 * Build adjustment journal from loaded adjustment cases.
 */
export function buildAdjustmentJournal() {
  if (!engine.adjustments.length) loadAdjustments();

  const lines = [];
  engine.adjustments.forEach(adj => {
    adj.entries.forEach(e => {
      if (e.debit === 0 && e.credit === 0) return;
      lines.push({
        date: adj.tanggal,
        account: e.account,
        debit: e.debit,
        credit: e.credit,
        source: adj.id,
        type: 'adjustment'
      });
    });
  });

  engine.adjustmentJournal = lines;
  return lines;
}

/**
 * Submit the student's OWN adjustment entries (from the Jurnal Penyesuaian
 * form) as the real, working adjustment journal for this session. Call this
 * when the student clicks "Verifikasi Penyesuaian".
 * @param {Array<{ account: string, debit: number, credit: number, date?: string }>} entries
 */
export function submitUserAdjustmentJournal(entries) {
  engine.userAdjustmentJournal = (entries || [])
    .filter(e => e.account && (Number(e.debit) > 0 || Number(e.credit) > 0))
    .map(e => ({
      date: e.date || engine.periodLabel,
      account: e.account,
      debit: Number(e.debit) || 0,
      credit: Number(e.credit) || 0,
      source: 'user',
      type: 'adjustment'
    }));
  return engine.userAdjustmentJournal;
}

/**
 * Whether the student has submitted any adjustment lines yet this session.
 */
export function hasUserAdjustmentJournal() {
  return engine.userAdjustmentJournal.length > 0;
}

export function getUserAdjustmentJournal() {
  return engine.userAdjustmentJournal;
}

/* ═══════════════════════════════════════════════════════════
   SNAPSHOT / DEBUG
   ═══════════════════════════════════════════════════════════ */

export function getEngineSnapshot() {
  return {
    level: engine.level,
    companyName: engine.companyName,
    periodLabel: engine.periodLabel,
    phase: engine.phase,
    accountCount: engine.accounts.length,
    transactionCount: engine.transactions.length,
    adjustmentCount: engine.adjustments.length,
    journalLineCount: engine.journal.length
  };
}

export function getCurrentLevel() {
  return engine.level;
}

/**
 * Serialise enough state to fully restore a session later: the current
 * case (level/company/period/transactions/adjustments) plus the student's
 * own submitted work. The answer-key journal/adjustmentJournal are NOT
 * included — they're cheaply rebuilt on demand from transactions/adjustments.
 */
export function exportSessionState() {
  return {
    level: engine.level,
    companyName: engine.companyName,
    periodLabel: engine.periodLabel,
    transactions: engine.transactions,
    adjustments: engine.adjustments,
    userJournal: engine.userJournal,
    userAdjustmentJournal: engine.userAdjustmentJournal
  };
}

/**
 * Restore a previously exported session. Re-initialises the engine for the
 * saved level (so chart of accounts / ledger slots are correctly seeded),
 * then overlays the saved case + the student's own submitted work on top,
 * and re-posts the ledger from it.
 * @returns {boolean} true if a session was restored
 */
export function importSessionState(data) {
  if (!data || !Array.isArray(data.transactions) || !data.transactions.length) return false;

  initEngine(data.level || 1, {
    companyName: data.companyName,
    periodLabel: data.periodLabel
  });

  engine.transactions = data.transactions;
  engine.adjustments = Array.isArray(data.adjustments) ? data.adjustments : [];
  engine.userJournal = Array.isArray(data.userJournal) ? data.userJournal : [];
  engine.userAdjustmentJournal = Array.isArray(data.userAdjustmentJournal) ? data.userAdjustmentJournal : [];

  postToLedger();
  return true;
}

export function getAccounts() {
  return engine.accounts;
}

export function getLoadedTransactions() {
  return engine.transactions;
}

export function getLoadedAdjustments() {
  return engine.adjustments;
}
