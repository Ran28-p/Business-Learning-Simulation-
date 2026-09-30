/**
 * Accounting – Worksheet helpers (delegates to Engine)
 */
import { generateWorksheet } from './engine.js';
import { formatNumber } from '../utils/formatters.js';

export function buildWorksheetRows() {
  const { rows } = generateWorksheet();
  return rows;
}

export function renderWorksheetHTML() {
  const { rows, totals, netIncome } = generateWorksheet();

  let html = rows.map(r => `
      <tr>
        <td>${r.name}</td>
        <td>${r.nsD ? formatNumber(r.nsD) : ''}</td>
        <td>${r.nsK ? formatNumber(r.nsK) : ''}</td>
        <td>${r.adjD ? formatNumber(r.adjD) : ''}</td>
        <td>${r.adjK ? formatNumber(r.adjK) : ''}</td>
        <td>${r.adjNsD ? formatNumber(r.adjNsD) : ''}</td>
        <td>${r.adjNsK ? formatNumber(r.adjNsK) : ''}</td>
        <td>${r.lrD ? formatNumber(r.lrD) : ''}</td>
        <td>${r.lrK ? formatNumber(r.lrK) : ''}</td>
        <td>${r.neracaD ? formatNumber(r.neracaD) : ''}</td>
        <td>${r.neracaK ? formatNumber(r.neracaK) : ''}</td>
      </tr>`).join('');

  html += `
    <tr style="font-weight: bold; background: var(--bg-primary);">
      <td>TOTAL</td>
      <td>${formatNumber(totals.nsD)}</td>
      <td>${formatNumber(totals.nsK)}</td>
      <td>${formatNumber(totals.adjD)}</td>
      <td>${formatNumber(totals.adjK)}</td>
      <td>${formatNumber(totals.adjNsD)}</td>
      <td>${formatNumber(totals.adjNsK)}</td>
      <td>${formatNumber(totals.lrD)}</td>
      <td>${formatNumber(totals.lrK)}</td>
      <td>${formatNumber(totals.neracaD)}</td>
      <td>${formatNumber(totals.neracaK)}</td>
    </tr>`;

  const label = netIncome >= 0 ? 'Laba Bersih' : 'Rugi Bersih';
  html += `
    <tr style="font-style: italic; color: var(--accent-color);">
      <td colspan="7">${label}</td>
      <td colspan="2" style="text-align:center;">Rp ${formatNumber(Math.abs(netIncome))}</td>
      <td colspan="2"></td>
    </tr>`;

  return html;
}

export { generateWorksheet };
