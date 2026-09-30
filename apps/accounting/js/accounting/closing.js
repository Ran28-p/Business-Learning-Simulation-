/**
 * Accounting – Closing helpers (delegates to Engine)
 */
import { generateClosingEntries, generatePostClosingTrialBalance, validateUserJournal } from './engine.js';
import { readJournalRows } from './journal.js';
import { parseAmount, formatNumber } from '../utils/formatters.js';

export function validateClosing(entries) {
  const normalised = entries.map(e => ({
    account: e.account,
    debit: parseAmount(e.debit),
    credit: parseAmount(e.credit)
  }));
  const result = validateUserJournal(normalised);
  if (!result.valid && result.error === 'Nominal jurnal tidak boleh kosong atau nol.') {
    return { ...result, error: 'Jurnal penutup masih kosong.' };
  }
  if (!result.valid && result.error === 'Jurnal Tidak Balans') {
    return { ...result, error: 'Jurnal Penutup Tidak Balans' };
  }
  return result;
}

export function readClosingRows(tbody) {
  return readJournalRows(tbody);
}

export function renderClosingEntriesHTML() {
  const { entries, netIncome } = generateClosingEntries();
  let html = entries.map(e => `
      <tr>
        <td>${e.account}</td>
        <td>${e.debit ? 'Rp ' + formatNumber(e.debit) : ''}</td>
        <td>${e.credit ? 'Rp ' + formatNumber(e.credit) : ''}</td>
        <td style="font-size:0.75rem; color:var(--text-light);">Step ${e.step}</td>
      </tr>`).join('');
  html += `
    <tr style="font-style:italic; color:var(--accent-color);">
      <td colspan="4">Net Income / (Loss): Rp ${formatNumber(Math.abs(netIncome))} ${netIncome >= 0 ? '(Laba)' : '(Rugi)'}</td>
    </tr>`;
  return html;
}

export { generateClosingEntries, generatePostClosingTrialBalance };
