/**
 * Application-wide constants
 */
export const STORAGE_KEYS = {
  APP_STATE: 'ACT_MASTER_STATE',
  THEME: 'theme',
  ONBOARDING: 'hasVisited_ActMasterPro',
  SIDEBAR_COLLAPSED: 'ACT_MASTER_SIDEBAR_COLLAPSED',
  SESSION: 'ACT_MASTER_SESSION',
  TAX_STATE: 'ACT_MASTER_TAX_STATE'
};

export const XP_REWARDS = {
  JOURNAL_SUCCESS: 100,
  LEDGER_POST: 50,
  ADJUSTMENT_VERIFY: 50
};

export const BADGE_IDS = {
  JOURNAL_MASTER: 'j1',
  LEDGER_EXPERT: 'l1',
  WORKSHEET_KING: 'w1',
  FINANCIAL_PRO: 'f1'
};

export const DEFAULT_BADGES = [
  { id: 'j1', name: 'Journal Master', desc: 'Selesaikan Jurnal Umum sempurna', unlocked: false },
  { id: 'l1', name: 'Ledger Expert', desc: 'Posting Buku Besar Akurat', unlocked: false },
  { id: 'w1', name: 'Worksheet King', desc: '10 Kolom Balans Sempurna', unlocked: false },
  { id: 'f1', name: 'Financial Pro', desc: 'Menyusun Laporan Keuangan', unlocked: false }
];

export const MODES = {
  BELAJAR: 'Belajar',
  UJIAN: 'Ujian'
};

export const COMPANY_LEVELS = {
  JASA: 1,
  DAGANG: 2,
  MANUFAKTUR: 3
};
