/**
 * Accounting – Adjustment helpers (delegates to Engine)
 */
import {
  buildAdjustmentJournal,
  getLoadedAdjustments,
  submitUserAdjustmentJournal,
  hasUserAdjustmentJournal,
  getUserAdjustmentJournal
} from './engine.js';
import { readJournalRows } from './journal.js';

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
