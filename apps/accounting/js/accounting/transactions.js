/**
 * Accounting – Transaction helpers (delegates to Engine)
 */
import {
  loadRandomTransactions,
  loadAdjustments,
  analyzeTransaction,
  analyzeAllTransactions,
  getLoadedTransactions,
  getLoadedAdjustments
} from './engine.js';

export function generateTransactions(count = 6) {
  return loadRandomTransactions(count);
}

export function generateAdjustments() {
  return loadAdjustments();
}

export { analyzeTransaction, analyzeAllTransactions, getLoadedTransactions, getLoadedAdjustments };
