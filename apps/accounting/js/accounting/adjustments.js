/**
 * Accounting – Adjustment helpers (delegates to Engine)
 */
import {
  buildAdjustmentJournal,
  getLoadedAdjustments,
  validateUserJournal,
  submitUserAdjustmentJournal,
  hasUserAdjustmentJournal,
  getUserAdjustmentJournal
} from './engine.js';
import { readJournalRows } from './journal.js';
import { parseAmount } from '../utils/formatters.js';

export function validateAdjustments(entries) {
  const normalised = entries.map(e => ({
    account: e.account,
    debit: parseAmount(e.debit),
    credit: parseAmount(e.credit)
  }));
  const result = validateUserJournal(normalised);
  if (!result.valid && result.error === 'Nominal jurnal tidak boleh kosong atau nol.') {
    return { ...result, error: 'Jurnal penyesuaian masih kosong.' };
  }
  if (!result.valid && result.error === 'Jurnal Tidak Balans') {
    return { ...result, error: 'Jurnal Penyesuaian Tidak Balans' };
  }
  return result;
}

export function readAdjustmentRows(tbody) {
  return readJournalRows(tbody);
}

export {
  buildAdjustmentJournal,
  getLoadedAdjustments,
  submitUserAdjustmentJournal,
  hasUserAdjustmentJournal,
  getUserAdjustmentJournal
};
