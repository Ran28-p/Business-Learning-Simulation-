/**
 * Accounting – Financial Reports (delegates to Engine)
 * ALL figures computed from transaction data – zero hardcoding.
 */
import { generateFinancialStatements } from './engine.js';
import { formatNumber } from '../utils/formatters.js';

function money(n) {
  const abs = Math.abs(n);
  const formatted = formatNumber(abs);
  return n < 0 ? `(Rp ${formatted})` : `Rp ${formatted}`;
}

export function renderIncomeStatementHTML() {
  const { incomeStatement: is } = generateFinancialStatements();
  const revenueRows = is.revenues
    .map(r => `<tr><td>${r.name}</td><td style="text-align:right;">${money(r.amount)}</td></tr>`)
    .join('');
  const expenseRows = is.expenses
    .map(e => `<tr><td>${e.name}</td><td style="text-align:right;">${money(-e.amount)}</td></tr>`)
    .join('');

  return `
    <div class="card" style="margin-bottom:20px;">
      <h3 style="text-align:center;">${is.companyName}</h3>
      <h4 style="text-align:center;">${is.title}</h4>
      <p style="text-align:center; color: var(--text-light);">${is.period}</p>
      <br>
      <table style="width:100%;">
        <tr><td colspan="2"><strong>Pendapatan:</strong></td></tr>
        ${revenueRows}
        <tr style="font-weight:bold;"><td>Total Pendapatan</td><td style="text-align:right;">${money(is.totalRevenue)}</td></tr>
        <tr><td colspan="2"><strong>Beban:</strong></td></tr>
        ${expenseRows}
        <tr style="font-weight:bold;"><td>Total Beban</td><td style="text-align:right;">${money(-is.totalExpense)}</td></tr>
        <tr style="font-weight:bold; border-top:2px solid var(--border-color);">
          <td>${is.netIncome >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}</td>
          <td style="text-align:right; color: ${is.netIncome >= 0 ? 'var(--success)' : 'var(--danger)'};">
            ${money(is.netIncome)}
          </td>
        </tr>
      </table>
    </div>`;
}

export function renderChangesInEquityHTML() {
  const { changesInEquity: eq } = generateFinancialStatements();
  return `
    <div class="card" style="margin-bottom:20px;">
      <h3 style="text-align:center;">${eq.companyName}</h3>
      <h4 style="text-align:center;">${eq.title}</h4>
      <p style="text-align:center; color: var(--text-light);">${eq.period}</p>
      <br>
      <table style="width:100%;">
        <tr><td>Modal Awal</td><td style="text-align:right;">${money(eq.beginningCapital)}</td></tr>
        <tr><td>Laba / (Rugi) Bersih</td><td style="text-align:right;">${money(eq.netIncome)}</td></tr>
        <tr><td>Prive</td><td style="text-align:right;">${money(-eq.prive)}</td></tr>
        <tr style="font-weight:bold; border-top:2px solid var(--border-color);">
          <td>Modal Akhir</td>
          <td style="text-align:right;">${money(eq.endingCapital)}</td>
        </tr>
      </table>
    </div>`;
}

export function renderFinancialPositionHTML() {
  const { financialPosition: fp } = generateFinancialStatements();
  const caRows = fp.currentAssets
    .map(a => `<tr><td style="padding-left:16px;">${a.name}</td><td style="text-align:right;">${money(a.amount)}</td></tr>`)
    .join('');
  const faRows = fp.fixedAssets
    .map(a => `<tr><td style="padding-left:16px;">${a.name}</td><td style="text-align:right;">${money(a.amount)}</td></tr>`)
    .join('');
  const liabRows = fp.liabilities
    .map(l => `<tr><td style="padding-left:16px;">${l.name}</td><td style="text-align:right;">${money(l.amount)}</td></tr>`)
    .join('');

  return `
    <div class="card" style="margin-bottom:20px;">
      <h3 style="text-align:center;">${fp.companyName}</h3>
      <h4 style="text-align:center;">${fp.title}</h4>
      <p style="text-align:center; color: var(--text-light);">${fp.period}</p>
      <br>
      <table style="width:100%;">
        <tr><td colspan="2"><strong>ASET</strong></td></tr>
        <tr><td colspan="2"><em>Aset Lancar</em></td></tr>
        ${caRows}
        <tr style="font-weight:bold;"><td>Total Aset Lancar</td><td style="text-align:right;">${money(fp.totalCurrentAssets)}</td></tr>
        <tr><td colspan="2"><em>Aset Tetap</em></td></tr>
        ${faRows}
        <tr style="font-weight:bold;"><td>Total Aset Tetap (neto)</td><td style="text-align:right;">${money(fp.totalFixedAssets)}</td></tr>
        <tr style="font-weight:bold; border-top:2px solid var(--border-color);">
          <td>TOTAL ASET</td><td style="text-align:right;">${money(fp.totalAssets)}</td>
        </tr>
        <tr><td colspan="2"><br><strong>KEWAJIBAN</strong></td></tr>
        ${liabRows}
        <tr style="font-weight:bold;"><td>Total Kewajiban</td><td style="text-align:right;">${money(fp.totalLiabilities)}</td></tr>
        <tr><td colspan="2"><br><strong>EKUITAS</strong></td></tr>
        <tr><td style="padding-left:16px;">Modal Pemilik</td><td style="text-align:right;">${money(fp.equity)}</td></tr>
        <tr style="font-weight:bold; border-top:2px solid var(--border-color);">
          <td>TOTAL KEWAJIBAN &amp; EKUITAS</td>
          <td style="text-align:right;">${money(fp.totalLiabilitiesAndEquity)}</td>
        </tr>
      </table>
    </div>`;
}

export function renderCashFlowHTML() {
  const { cashFlow: cf } = generateFinancialStatements();
  const opRows = cf.operating
    .map(i => `<tr><td style="padding-left:16px; font-size:0.85rem;">${i.description}</td><td style="text-align:right;">${money(i.amount)}</td></tr>`)
    .join('');
  const invRows = cf.investing
    .map(i => `<tr><td style="padding-left:16px; font-size:0.85rem;">${i.description}</td><td style="text-align:right;">${money(i.amount)}</td></tr>`)
    .join('');
  const finRows = cf.financing
    .map(i => `<tr><td style="padding-left:16px; font-size:0.85rem;">${i.description}</td><td style="text-align:right;">${money(i.amount)}</td></tr>`)
    .join('');

  return `
    <div class="card" style="margin-bottom:20px;">
      <h3 style="text-align:center;">${cf.companyName}</h3>
      <h4 style="text-align:center;">${cf.title}</h4>
      <p style="text-align:center; color: var(--text-light);">${cf.period}</p>
      <br>
      <table style="width:100%;">
        <tr><td colspan="2"><strong>Arus Kas dari Aktivitas Operasi</strong></td></tr>
        ${opRows}
        <tr style="font-weight:bold;"><td>Kas Neto Operasi</td><td style="text-align:right;">${money(cf.netOperating)}</td></tr>
        <tr><td colspan="2"><br><strong>Arus Kas dari Aktivitas Investasi</strong></td></tr>
        ${invRows || '<tr><td colspan="2" style="padding-left:16px; color:var(--text-light);">—</td></tr>'}
        <tr style="font-weight:bold;"><td>Kas Neto Investasi</td><td style="text-align:right;">${money(cf.netInvesting)}</td></tr>
        <tr><td colspan="2"><br><strong>Arus Kas dari Aktivitas Pendanaan</strong></td></tr>
        ${finRows || '<tr><td colspan="2" style="padding-left:16px; color:var(--text-light);">—</td></tr>'}
        <tr style="font-weight:bold;"><td>Kas Neto Pendanaan</td><td style="text-align:right;">${money(cf.netFinancing)}</td></tr>
        <tr style="font-weight:bold; border-top:2px solid var(--border-color);">
          <td>Kenaikan / (Penurunan) Kas</td><td style="text-align:right;">${money(cf.netChange)}</td>
        </tr>
        <tr><td>Kas Awal Periode</td><td style="text-align:right;">${money(cf.beginningCash)}</td></tr>
        <tr style="font-weight:bold;"><td>Kas Akhir Periode</td><td style="text-align:right;">${money(cf.endingCash)}</td></tr>
      </table>
    </div>`;
}

export function renderAllStatementsHTML() {
  return (
    renderIncomeStatementHTML() +
    renderChangesInEquityHTML() +
    renderFinancialPositionHTML() +
    renderCashFlowHTML()
  );
}

export { generateFinancialStatements };
