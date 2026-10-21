/**
 * engine/statements.js — neraca saldo penyesuaian, kertas kerja, laporan keuangan, jurnal penutup
 * (dipecah dari ../engine.js; perilaku identik)
 */
import { findAccountByName } from '../../../data/accounts.js';
import { engine } from './state.js';
import { buildJournal, buildAdjustmentJournal, postToLedger, generateTrialBalance } from './core.js';

/**
 * Build a standalone ledger Map from an arbitrary list of journal lines,
 * without touching the real (student-facing) ledger. Used to compute the
 * "answer key" adjusted trial balance for scoring reference, independent
 * of whatever the student has actually posted so far.
 */
function _buildLedgerMapFromLines(lines) {
  const map = new Map();
  engine.accounts.forEach(acc => {
    map.set(acc.name, {
      code: acc.code, name: acc.name, type: acc.type, normal: acc.normal,
      category: acc.category, debits: [], credits: []
    });
  });
  lines.forEach(line => {
    let slot = map.get(line.account);
    if (!slot) {
      const meta = findAccountByName(engine.accounts, line.account);
      slot = {
        code: meta?.code || '???', name: line.account, type: meta?.type || 'Unknown',
        normal: meta?.normal || 'D', category: meta?.category || 'unknown',
        debits: [], credits: []
      };
      map.set(line.account, slot);
    }
    if (line.debit > 0) slot.debits.push(line.debit);
    if (line.credit > 0) slot.credits.push(line.credit);
  });
  return map;
}

/**
 * Apply adjustments on top of the ledger and recompute.
 * Creates an "adjusted ledger" snapshot without destroying original.
 *
 * By default this reflects the STUDENT'S OWN work (their posted journal +
 * their submitted adjustments) — exactly what they should see on the
 * Worksheet / Laporan Keuangan pages. Pass { useAnswerKey: true } to
 * instead compute the correct reference values (used internally for
 * scoring feedback), regardless of the student's progress.
 *
 * @param {{ useAnswerKey?: boolean }} [opts]
 * @returns {{ rows, totalDebit, totalCredit, balanced }}
 */
export function generateAdjustedTrialBalance(opts = {}) {
  const { useAnswerKey = false } = opts;
  let working;
  let adjLines;

  if (useAnswerKey) {
    if (!engine.journal.length) buildJournal();
    if (!engine.adjustmentJournal.length) buildAdjustmentJournal();
    working = _buildLedgerMapFromLines(engine.journal);
    adjLines = engine.adjustmentJournal;
  } else {
    // Always re-post from the latest submitted user journal first.
    postToLedger();
    working = new Map();
    engine.ledger.forEach((slot, name) => {
      working.set(name, {
        code: slot.code,
        name: slot.name,
        type: slot.type,
        normal: slot.normal,
        category: slot.category,
        debits: [...slot.debits],
        credits: [...slot.credits]
      });
    });
    adjLines = engine.userAdjustmentJournal;
  }

  // Post adjustment lines
  adjLines.forEach(line => {
    let slot = working.get(line.account);
    if (!slot) {
      const meta = findAccountByName(engine.accounts, line.account);
      slot = {
        code: meta?.code || '???',
        name: line.account,
        type: meta?.type || 'Unknown',
        normal: meta?.normal || 'D',
        category: meta?.category || 'unknown',
        debits: [],
        credits: []
      };
      working.set(line.account, slot);
    }
    if (line.debit > 0) slot.debits.push(line.debit);
    if (line.credit > 0) slot.credits.push(line.credit);
  });

  // Compute adjusted balances
  const rows = [];
  let totalDebit = 0;
  let totalCredit = 0;

  working.forEach(slot => {
    const totalD = slot.debits.reduce((s, v) => s + v, 0);
    const totalK = slot.credits.reduce((s, v) => s + v, 0);
    let balance, side;
    if (slot.normal === 'D') {
      const raw = totalD - totalK;
      balance = Math.abs(raw);
      side = raw >= 0 ? 'D' : 'K';
    } else {
      const raw = totalK - totalD;
      balance = Math.abs(raw);
      side = raw >= 0 ? 'K' : 'D';
    }
    if (balance === 0) return;
    const debit = side === 'D' ? balance : 0;
    const credit = side === 'K' ? balance : 0;
    rows.push({
      code: slot.code,
      name: slot.name,
      type: slot.type,
      category: slot.category,
      normal: slot.normal,
      debit,
      credit,
      // keep raw totals for worksheet
      totalDebitRaw: totalD,
      totalCreditRaw: totalK
    });
    totalDebit += debit;
    totalCredit += credit;
  });

  rows.sort((a, b) => a.code.localeCompare(b.code));
  engine.phase = 'adjusted';

  // Store working map for worksheet / statements
  engine._adjustedWorking = working;

  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}

/* ═══════════════════════════════════════════════════════════
   7. WORKSHEET (10 Kolom)
   ═══════════════════════════════════════════════════════════ */

/**
 * Generate the full 10-column worksheet.
 * Columns: Account | NS D/K | Adj D/K | NS Adj D/K | L/R D/K | Neraca D/K
 * @returns {{ rows: Array, totals: object, netIncome: number }}
 */
export function generateWorksheet() {
  const tb = generateTrialBalance();
  const adjLines = engine.userAdjustmentJournal;

  // Index unadjusted TB
  const tbMap = new Map();
  tb.rows.forEach(r => tbMap.set(r.name, r));

  // Index adjustments per account
  const adjMap = new Map(); // name → { debit, credit }
  adjLines.forEach(line => {
    if (!adjMap.has(line.account)) adjMap.set(line.account, { debit: 0, credit: 0 });
    const a = adjMap.get(line.account);
    a.debit += line.debit;
    a.credit += line.credit;
  });

  // Collect all account names involved
  const allNames = new Set([
    ...tbMap.keys(),
    ...adjMap.keys()
  ]);

  // Ensure every chart account that might appear is considered
  engine.accounts.forEach(a => allNames.add(a.name));

  const rows = [];
  let tot = {
    nsD: 0, nsK: 0,
    adjD: 0, adjK: 0,
    adjNsD: 0, adjNsK: 0,
    lrD: 0, lrK: 0,
    neracaD: 0, neracaK: 0
  };

  // Sort by code
  const sorted = [...allNames].sort((a, b) => {
    const ca = findAccountByName(engine.accounts, a)?.code || '999';
    const cb = findAccountByName(engine.accounts, b)?.code || '999';
    return ca.localeCompare(cb);
  });

  sorted.forEach(name => {
    const meta = findAccountByName(engine.accounts, name) || {
      code: '???', name, type: 'Unknown', normal: 'D', category: 'unknown'
    };
    const tbRow = tbMap.get(name);
    const adj = adjMap.get(name) || { debit: 0, credit: 0 };

    const nsD = tbRow ? tbRow.debit : 0;
    const nsK = tbRow ? tbRow.credit : 0;
    const adjD = adj.debit;
    const adjK = adj.credit;

    // Skip fully empty rows
    if (nsD === 0 && nsK === 0 && adjD === 0 && adjK === 0) return;

    // Adjusted NS
    let adjNsD = 0;
    let adjNsK = 0;
    if (meta.normal === 'D') {
      const raw = (nsD + adjD) - (nsK + adjK);
      if (raw >= 0) adjNsD = raw; else adjNsK = Math.abs(raw);
    } else {
      const raw = (nsK + adjK) - (nsD + adjD);
      if (raw >= 0) adjNsK = raw; else adjNsD = Math.abs(raw);
    }

    // Classify into Income Statement or Balance Sheet
    let lrD = 0, lrK = 0, neracaD = 0, neracaK = 0;
    const isNominal = ['Pendapatan', 'Beban', 'Kontra-Pendapatan', 'Kontra-Beban'].includes(meta.type)
      || meta.category === 'revenue' || meta.category === 'expense' || meta.category === 'cogs' || meta.category === 'purchase';

    if (isNominal) {
      lrD = adjNsD;
      lrK = adjNsK;
    } else {
      neracaD = adjNsD;
      neracaK = adjNsK;
    }

    rows.push({
      code: meta.code,
      name,
      type: meta.type,
      category: meta.category,
      nsD, nsK,
      adjD, adjK,
      adjNsD, adjNsK,
      lrD, lrK,
      neracaD, neracaK
    });

    tot.nsD += nsD; tot.nsK += nsK;
    tot.adjD += adjD; tot.adjK += adjK;
    tot.adjNsD += adjNsD; tot.adjNsK += adjNsK;
    tot.lrD += lrD; tot.lrK += lrK;
    tot.neracaD += neracaD; tot.neracaK += neracaK;
  });

  // Net income (or loss)
  const netIncome = tot.lrK - tot.lrD; // credit side of IS = revenue; debit = expense

  // Balance the IS and BS columns with net income / loss
  if (netIncome >= 0) {
    // Profit → debit IS (to balance), credit BS (add to equity)
    tot.lrD += netIncome;
    tot.neracaK += netIncome;
  } else {
    const loss = Math.abs(netIncome);
    tot.lrK += loss;
    tot.neracaD += loss;
  }

  return { rows, totals: tot, netIncome };
}

/* ═══════════════════════════════════════════════════════════
   8. FINANCIAL STATEMENTS
   ═══════════════════════════════════════════════════════════ */

/**
 * Generate all four financial statements from adjusted data.
 * @returns {{ incomeStatement, changesInEquity, financialPosition, cashFlow }}
 */
export function generateFinancialStatements() {
  const ws = generateWorksheet();
  const adjTB = generateAdjustedTrialBalance();

  return {
    incomeStatement: _buildIncomeStatement(ws, adjTB),
    changesInEquity: _buildChangesInEquity(ws, adjTB),
    financialPosition: _buildFinancialPosition(ws, adjTB),
    cashFlow: _buildCashFlow()
  };
}

function _buildIncomeStatement(ws, adjTB) {
  const revenues = [];
  const expenses = [];
  let totalRevenue = 0;
  let totalExpense = 0;

  adjTB.rows.forEach(r => {
    if (r.category === 'revenue' || r.type === 'Pendapatan') {
      // Revenue has credit balance
      const amt = r.credit > 0 ? r.credit : -r.debit;
      if (amt !== 0) {
        revenues.push({ name: r.name, amount: amt });
        totalRevenue += amt;
      }
    } else if (r.type === 'Kontra-Pendapatan') {
      const amt = r.debit > 0 ? r.debit : -r.credit;
      if (amt !== 0) {
        revenues.push({ name: r.name, amount: -amt });
        totalRevenue -= amt;
      }
    } else if (
      r.category === 'expense' || r.category === 'cogs' || r.category === 'purchase' ||
      r.type === 'Beban'
    ) {
      const amt = r.debit > 0 ? r.debit : -r.credit;
      if (amt !== 0) {
        expenses.push({ name: r.name, amount: amt });
        totalExpense += amt;
      }
    } else if (r.type === 'Kontra-Beban') {
      const amt = r.credit > 0 ? r.credit : -r.debit;
      if (amt !== 0) {
        expenses.push({ name: r.name, amount: -amt });
        totalExpense -= amt;
      }
    }
  });

  const netIncome = totalRevenue - totalExpense;

  return {
    companyName: engine.companyName,
    title: 'LAPORAN LABA RUGI',
    period: `Untuk Periode yang Berakhir ${engine.periodLabel}`,
    revenues,
    totalRevenue,
    expenses,
    totalExpense,
    netIncome
  };
}

function _buildChangesInEquity(ws, adjTB) {
  // Beginning capital: look for Modal Pemilik credit from journal (opening)
  // For this simulator, Modal Pemilik balance before net income & prive is the starting point.
  let modalBalance = 0;
  let priveBalance = 0;

  adjTB.rows.forEach(r => {
    if (r.name === 'Modal Pemilik') {
      modalBalance = r.credit > 0 ? r.credit : -r.debit;
    }
    if (r.name === 'Prive') {
      priveBalance = r.debit > 0 ? r.debit : -r.credit;
    }
  });

  // Modal Pemilik on adj TB already includes only journal postings (capital contributions).
  // Net income and prive are separate.
  const netIncome = ws.netIncome;
  const endingCapital = modalBalance + netIncome - priveBalance;

  return {
    companyName: engine.companyName,
    title: 'LAPORAN PERUBAHAN EKUITAS',
    period: `Untuk Periode yang Berakhir ${engine.periodLabel}`,
    beginningCapital: modalBalance,
    netIncome,
    prive: priveBalance,
    endingCapital
  };
}

function _buildFinancialPosition(ws, adjTB) {
  const currentAssets = [];
  const fixedAssets = [];
  const liabilities = [];
  let totalCurrentAssets = 0;
  let totalFixedAssets = 0; // net of accum dep
  let totalLiabilities = 0;

  // Build a map of contra-asset balances
  const contraMap = new Map();
  adjTB.rows.forEach(r => {
    if (r.type === 'Kontra-Aset') {
      contraMap.set(r.name, r.credit > 0 ? r.credit : r.debit);
    }
  });

  adjTB.rows.forEach(r => {
    if (r.category === 'current_asset' && r.type === 'Aset') {
      const amt = r.debit > 0 ? r.debit : -r.credit;
      if (amt !== 0) {
        currentAssets.push({ name: r.name, amount: amt });
        totalCurrentAssets += amt;
      }
    } else if (r.category === 'current_asset' && r.type === 'Kontra-Aset') {
      // already handled via contraMap; subtract from related asset if needed
      // For piutang allowance, subtract from current assets total
      if (r.name.includes('Penyisihan') || r.name.includes('Piutang Tak Tertagih')) {
        const amt = r.credit > 0 ? r.credit : r.debit;
        totalCurrentAssets -= amt;
        currentAssets.push({ name: r.name, amount: -amt });
      }
    } else if (r.category === 'fixed_asset' && r.type === 'Aset') {
      const amt = r.debit > 0 ? r.debit : -r.credit;
      if (amt !== 0) {
        fixedAssets.push({ name: r.name, amount: amt });
        totalFixedAssets += amt;
      }
    } else if (r.category === 'fixed_asset' && r.type === 'Kontra-Aset') {
      const amt = r.credit > 0 ? r.credit : r.debit;
      fixedAssets.push({ name: r.name, amount: -amt });
      totalFixedAssets -= amt;
    } else if (r.category === 'current_liability' || r.type === 'Kewajiban') {
      const amt = r.credit > 0 ? r.credit : -r.debit;
      if (amt !== 0) {
        liabilities.push({ name: r.name, amount: amt });
        totalLiabilities += amt;
      }
    }
  });

  const equity = _buildChangesInEquity(ws, adjTB);
  const totalEquity = equity.endingCapital;
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  return {
    companyName: engine.companyName,
    title: 'LAPORAN POSISI KEUANGAN',
    period: `Per ${engine.periodLabel}`,
    currentAssets,
    totalCurrentAssets,
    fixedAssets,
    totalFixedAssets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity: totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity
  };
}

/**
 * Simplified Cash Flow (indirect-ish from Kas ledger movements).
 * Classifies Kas journal lines into operating / investing / financing
 * based on the counter-account type.
 */
function _buildCashFlow() {
  const operating = [];
  const investing = [];
  const financing = [];
  let netOperating = 0;
  let netInvesting = 0;
  let netFinancing = 0;

  // Walk original transactions and classify Kas movements
  engine.transactions.forEach(tx => {
    const kasEntry = tx.entries.find(e => e.account === 'Kas');
    if (!kasEntry) return;

    const kasIn = kasEntry.debit;   // cash received
    const kasOut = kasEntry.credit; // cash paid
    const netKas = kasIn - kasOut;

    // Determine counter accounts
    const counters = tx.entries.filter(e => e.account !== 'Kas');
    let classification = 'operating'; // default

    for (const c of counters) {
      const meta = findAccountByName(engine.accounts, c.account);
      if (!meta) continue;
      if (meta.category === 'fixed_asset' || meta.type === 'Aset' && meta.category === 'fixed_asset') {
        classification = 'investing';
        break;
      }
      if (meta.name === 'Modal Pemilik' || meta.name === 'Prive' || meta.category === 'equity') {
        classification = 'financing';
        break;
      }
    }

    const item = { description: tx.deskripsi, amount: netKas };
    if (classification === 'operating') {
      operating.push(item);
      netOperating += netKas;
    } else if (classification === 'investing') {
      investing.push(item);
      netInvesting += netKas;
    } else {
      financing.push(item);
      netFinancing += netKas;
    }
  });

  const netChange = netOperating + netInvesting + netFinancing;
  const kasSlot = engine.ledger.get('Kas');
  const endingCash = kasSlot ? (kasSlot.side === 'D' ? kasSlot.balance : -kasSlot.balance) : 0;
  // Beginning cash = ending - net change (from unadjusted ledger; adjustments rarely touch Kas)
  const beginningCash = endingCash - netChange;

  return {
    companyName: engine.companyName,
    title: 'LAPORAN ARUS KAS',
    period: `Untuk Periode yang Berakhir ${engine.periodLabel}`,
    operating,
    netOperating,
    investing,
    netInvesting,
    financing,
    netFinancing,
    netChange,
    beginningCash,
    endingCash
  };
}

/* ═══════════════════════════════════════════════════════════
   9. CLOSING ENTRIES
   ═══════════════════════════════════════════════════════════ */

/**
 * Generate closing entries from adjusted balances.
 * Steps:
 *  1. Close revenue accounts → Ikhtisar Laba Rugi (debit revenue, credit ILR)
 *  2. Close expense accounts → Ikhtisar Laba Rugi (debit ILR, credit expense)
 *  3. Close Ikhtisar Laba Rugi → Modal Pemilik
 *  4. Close Prive → Modal Pemilik
 * @returns {{ entries: Array, netIncome: number }}
 */
export function generateClosingEntries() {
  const adjTB = generateAdjustedTrialBalance({ useAnswerKey: true });
  const entries = [];
  let totalRevenue = 0;
  let totalExpense = 0;

  // 1. Close revenues
  adjTB.rows.forEach(r => {
    if (r.category === 'revenue' || r.type === 'Pendapatan') {
      const amt = r.credit > 0 ? r.credit : 0;
      if (amt > 0) {
        entries.push({ account: r.name, debit: amt, credit: 0, step: 1 });
        totalRevenue += amt;
      }
    }
    if (r.type === 'Kontra-Pendapatan') {
      const amt = r.debit > 0 ? r.debit : 0;
      if (amt > 0) {
        entries.push({ account: r.name, debit: 0, credit: amt, step: 1 });
        totalRevenue -= amt;
      }
    }
  });
  if (totalRevenue !== 0) {
    if (totalRevenue > 0) {
      entries.push({ account: 'Ikhtisar Laba Rugi', debit: 0, credit: totalRevenue, step: 1 });
    } else {
      entries.push({ account: 'Ikhtisar Laba Rugi', debit: Math.abs(totalRevenue), credit: 0, step: 1 });
    }
  }

  // 2. Close expenses
  adjTB.rows.forEach(r => {
    if (r.category === 'expense' || r.category === 'cogs' || r.category === 'purchase' || r.type === 'Beban') {
      const amt = r.debit > 0 ? r.debit : 0;
      if (amt > 0) {
        entries.push({ account: r.name, debit: 0, credit: amt, step: 2 });
        totalExpense += amt;
      }
    }
    if (r.type === 'Kontra-Beban') {
      const amt = r.credit > 0 ? r.credit : 0;
      if (amt > 0) {
        entries.push({ account: r.name, debit: amt, credit: 0, step: 2 });
        totalExpense -= amt;
      }
    }
  });
  if (totalExpense !== 0) {
    if (totalExpense > 0) {
      entries.push({ account: 'Ikhtisar Laba Rugi', debit: totalExpense, credit: 0, step: 2 });
    } else {
      entries.push({ account: 'Ikhtisar Laba Rugi', debit: 0, credit: Math.abs(totalExpense), step: 2 });
    }
  }

  // 3. Close Ikhtisar Laba Rugi → Modal
  const netIncome = totalRevenue - totalExpense;
  if (netIncome > 0) {
    entries.push({ account: 'Ikhtisar Laba Rugi', debit: netIncome, credit: 0, step: 3 });
    entries.push({ account: 'Modal Pemilik', debit: 0, credit: netIncome, step: 3 });
  } else if (netIncome < 0) {
    const loss = Math.abs(netIncome);
    entries.push({ account: 'Modal Pemilik', debit: loss, credit: 0, step: 3 });
    entries.push({ account: 'Ikhtisar Laba Rugi', debit: 0, credit: loss, step: 3 });
  }

  // 4. Close Prive → Modal
  adjTB.rows.forEach(r => {
    if (r.name === 'Prive' && r.debit > 0) {
      entries.push({ account: 'Modal Pemilik', debit: r.debit, credit: 0, step: 4 });
      entries.push({ account: 'Prive', debit: 0, credit: r.debit, step: 4 });
    }
  });

  engine.closingJournal = entries;
  engine.phase = 'closed';

  return { entries, netIncome, totalRevenue, totalExpense };
}

/* ═══════════════════════════════════════════════════════════
   10. POST-CLOSING TRIAL BALANCE
   ═══════════════════════════════════════════════════════════ */

/**
 * Generate Post-Closing Trial Balance.
 * Only permanent (real) accounts remain; nominal accounts are zeroed.
 * @returns {{ rows, totalDebit, totalCredit, balanced }}
 */
export function generatePostClosingTrialBalance() {
  const closing = generateClosingEntries();
  const adjTB = generateAdjustedTrialBalance();

  // Start from adjusted balances, then apply closing entries
  const working = new Map();
  adjTB.rows.forEach(r => {
    working.set(r.name, {
      code: r.code,
      name: r.name,
      type: r.type,
      category: r.category,
      normal: r.normal || (r.debit > 0 ? 'D' : 'K'),
      debit: r.debit,
      credit: r.credit
    });
  });

  // Apply closing
  closing.entries.forEach(e => {
    let slot = working.get(e.account);
    if (!slot) {
      const meta = findAccountByName(engine.accounts, e.account);
      slot = {
        code: meta?.code || '???',
        name: e.account,
        type: meta?.type || 'Ekuitas',
        category: meta?.category || 'equity',
        normal: meta?.normal || 'K',
        debit: 0,
        credit: 0
      };
      working.set(e.account, slot);
    }
    // Apply as net adjustment to the balance side
    if (e.debit > 0) {
      if (slot.credit >= e.debit) {
        slot.credit -= e.debit;
      } else {
        const remainder = e.debit - slot.credit;
        slot.credit = 0;
        slot.debit += remainder;
      }
    }
    if (e.credit > 0) {
      if (slot.debit >= e.credit) {
        slot.debit -= e.credit;
      } else {
        const remainder = e.credit - slot.debit;
        slot.debit = 0;
        slot.credit += remainder;
      }
    }
  });

  const rows = [];
  let totalDebit = 0;
  let totalCredit = 0;

  working.forEach(slot => {
    // Skip zero and nominal accounts
    const isNominal = ['Pendapatan', 'Beban', 'Kontra-Pendapatan', 'Kontra-Beban'].includes(slot.type)
      || slot.category === 'revenue' || slot.category === 'expense'
      || slot.category === 'cogs' || slot.category === 'purchase'
      || slot.name === 'Ikhtisar Laba Rugi' || slot.name === 'Prive';

    if (isNominal) return;
    if (slot.debit === 0 && slot.credit === 0) return;

    rows.push({
      code: slot.code,
      name: slot.name,
      type: slot.type,
      debit: slot.debit,
      credit: slot.credit
    });
    totalDebit += slot.debit;
    totalCredit += slot.credit;
  });

  rows.sort((a, b) => a.code.localeCompare(b.code));

  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}
