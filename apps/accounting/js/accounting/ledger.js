/**
 * Accounting – Ledger helpers (delegates to Engine)
 */
import { postToLedger, getLedgerArray, getAccountBalance, hasUserJournal } from './engine.js';
import { formatNumber } from '../utils/formatters.js';

export function buildLedgers() {
  postToLedger();
  return getLedgerArray();
}

export function renderTAccountHTML(ledger) {
  const debitLines = (ledger.debits || [])
    .map(v => `<div>Rp ${formatNumber(v)}</div>`)
    .join('');
  const creditLines = (ledger.credits || [])
    .map(v => `<div>Rp ${formatNumber(v)}</div>`)
    .join('');

  return `
    <div class="t-account">
      <div class="t-account-header">${ledger.code} - ${ledger.name}</div>
      <div class="t-account-body">
        <div class="t-account-side">
          <strong>Debit</strong>
          ${debitLines}
        </div>
        <div class="t-account-side">
          <strong>Kredit</strong>
          ${creditLines}
        </div>
      </div>
      <div style="padding: 8px; text-align: center; background: var(--bg-primary); border-top: 1px solid var(--border-color); font-weight: bold;">
        Saldo Akhir: Rp ${formatNumber(ledger.balance)} (${ledger.side})
      </div>
    </div>
  `;
}

export { postToLedger, getLedgerArray, getAccountBalance, hasUserJournal };
