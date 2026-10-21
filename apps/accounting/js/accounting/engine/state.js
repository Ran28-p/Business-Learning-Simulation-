/**
 * engine/state.js — objek state internal engine (satu instance, dimutasi lewat properti)
 * (dipecah dari ../engine.js; perilaku identik)
 */

/* ═══════════════════════════════════════════════════════════
   INTERNAL STATE (private to the engine)
   ═══════════════════════════════════════════════════════════ */

export const engine = {
  level: 1,
  companyName: 'JAYA FAST',
  periodLabel: '31 Maret 2026',
  accounts: [],          // chart of accounts for current level
  transactions: [],      // selected practice transactions (with entries) — ANSWER KEY source
  adjustments: [],       // selected adjustment cases (with entries) — ANSWER KEY source
  journal: [],           // ANSWER KEY: flat list of correct journal lines, built from transactions
  adjustmentJournal: [], // ANSWER KEY: flat list of correct adjustment lines
  userJournal: [],       // STUDENT WORK: journal lines actually submitted via "Check & Submit Jurnal"
  userAdjustmentJournal: [], // STUDENT WORK: adjustment lines actually submitted via "Verifikasi Penyesuaian"
  closingJournal: [],    // generated closing entries
  ledger: new Map(),     // accountName → { debits[], credits[], balance, side } — posted from userJournal
  phase: 'idle'          // idle | journaled | posted | adjusted | closed
};
