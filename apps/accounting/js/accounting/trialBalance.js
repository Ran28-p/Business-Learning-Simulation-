/**
 * Accounting – Trial Balance helpers (delegates to Engine)
 */
import { generateTrialBalance, generateAdjustedTrialBalance, generatePostClosingTrialBalance } from './engine.js';
import { formatNumber } from '../utils/formatters.js';

export function computeTrialBalance() {
  return generateTrialBalance();
}

export function renderTrialBalanceHTML() {
  const { rows, totalDebit, totalCredit } = generateTrialBalance();
  let html = rows.map(r => `
      <tr>
        <td>${r.code} - ${r.name}</td>
        <td>Rp ${formatNumber(r.debit)}</td>
        <td>Rp ${formatNumber(r.credit)}</td>
      </tr>`).join('');
  html += `
    <tr style="font-weight: bold; background: var(--bg-primary);">
      <td>TOTAL</td>
      <td>Rp ${formatNumber(totalDebit)}</td>
      <td>Rp ${formatNumber(totalCredit)}</td>
    </tr>`;
  return html;
}

export function renderAdjustedTrialBalanceHTML() {
  const { rows, totalDebit, totalCredit } = generateAdjustedTrialBalance();
  let html = rows.map(r => `
      <tr>
        <td>${r.code} - ${r.name}</td>
        <td>Rp ${formatNumber(r.debit)}</td>
        <td>Rp ${formatNumber(r.credit)}</td>
      </tr>`).join('');
  html += `
    <tr style="font-weight: bold; background: var(--bg-primary);">
      <td>TOTAL</td>
      <td>Rp ${formatNumber(totalDebit)}</td>
      <td>Rp ${formatNumber(totalCredit)}</td>
    </tr>`;
  return html;
}

export function renderPostClosingTrialBalanceHTML() {
  const { rows, totalDebit, totalCredit } = generatePostClosingTrialBalance();
  let html = rows.map(r => `
      <tr>
        <td>${r.code} - ${r.name}</td>
        <td>Rp ${formatNumber(r.debit)}</td>
        <td>Rp ${formatNumber(r.credit)}</td>
      </tr>`).join('');
  html += `
    <tr style="font-weight: bold; background: var(--bg-primary);">
      <td>TOTAL</td>
      <td>Rp ${formatNumber(totalDebit)}</td>
      <td>Rp ${formatNumber(totalCredit)}</td>
    </tr>`;
  return html;
}

export { generateTrialBalance, generateAdjustedTrialBalance, generatePostClosingTrialBalance };
