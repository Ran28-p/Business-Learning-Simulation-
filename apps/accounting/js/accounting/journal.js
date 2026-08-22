/**
 * Accounting – Journal helpers (delegates to Engine)
 */
import {
  buildJournal,
  validateUserJournal,
  getExpectedJournal,
  submitUserJournal,
  hasUserJournal,
  getUserJournal,
  exportSessionState,
  importSessionState,
  getCurrentLevel
} from './engine.js';
import { parseAmount } from '../utils/formatters.js';

export function readJournalRows(tbody) {
  const rows = tbody.querySelectorAll('tr');
  const entries = [];
  rows.forEach(r => {
    const select = r.querySelector('select');
    const debitInput = r.querySelector('.debit-input');
    const creditInput = r.querySelector('.kredit-input');
    if (!select) return;
    entries.push({
      account: select.value,
      debit: debitInput ? debitInput.value : 0,
      credit: creditInput ? creditInput.value : 0
    });
  });
  return entries;
}

export function validateJournal(entries) {
  const normalised = entries.map(e => ({
    account: e.account,
    debit: parseAmount(e.debit),
    credit: parseAmount(e.credit)
  }));
  return validateUserJournal(normalised);
}

export {
  buildJournal,
  getExpectedJournal,
  submitUserJournal,
  hasUserJournal,
  getUserJournal,
  exportSessionState,
  importSessionState,
  getCurrentLevel
};
