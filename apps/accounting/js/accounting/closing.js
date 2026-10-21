/**
 * Accounting – Closing helpers (delegates to Engine)
 */
import { generateClosingEntries, generatePostClosingTrialBalance } from './engine.js';
import { readJournalRows } from './journal.js';

export function readClosingRows(tbody) {
  return readJournalRows(tbody);
}

export { generateClosingEntries, generatePostClosingTrialBalance };
