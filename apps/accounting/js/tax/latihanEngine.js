/**
 * Mode Latihan scoring — independent of business/scoringEngine.js (which is
 * tightly coupled to the case-exercise journal format). Compares a
 * student-built invoice against a case study's expected figures.
 */
import { getCaseStudyById } from '../../data/taxCaseStudies.js';

const CRITERIA = [
  { key: 'dppTotal', label: 'Ketepatan DPP', weight: 20, type: 'amount' },
  { key: 'vatTotal', label: 'Ketepatan PPN', weight: 20, type: 'amount' },
  { key: 'grandTotal', label: 'Ketepatan Total Invoice', weight: 20, type: 'amount' },
  { key: 'taxTreatment', label: 'Ketepatan Status Pajak', weight: 20, type: 'exact' },
  { key: 'pajakKeluaranTercatat', label: 'Ketepatan Pajak Keluaran', weight: 10, type: 'bool' },
  { key: 'journal', label: 'Ketepatan Jurnal', weight: 10, type: 'journal' }
];

export function scoreLatihanInvoice(caseId, invoice, journalEntry) {
  const caseDef = getCaseStudyById(caseId);
  if (!caseDef) return null;
  const exp = caseDef.expected;

  const breakdown = CRITERIA.map(c => {
    let correct = false;
    if (c.type === 'amount') {
      correct = Math.abs((invoice[c.key] || 0) - exp[c.key]) < 1;
    } else if (c.type === 'exact') {
      correct = invoice[c.key] === exp[c.key];
    } else if (c.type === 'bool') {
      const actual = (invoice.vatTotal || 0) > 0;
      correct = actual === exp.pajakKeluaranTercatat;
    } else if (c.type === 'journal') {
      correct = !!journalEntry && isJournalBalanced(journalEntry);
    }
    return { label: c.label, correct, weight: c.weight };
  });

  const score = breakdown.reduce((s, b) => s + (b.correct ? b.weight : 0), 0);
  return { caseId, caseTitle: caseDef.title, score, breakdown };
}

function isJournalBalanced(entry) {
  const totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);
  return Math.abs(totalDebit - totalCredit) < 1;
}

export function renderLatihanResultHTML(result) {
  if (!result) return '';
  const rows = result.breakdown.map(b => `
    <li style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--border-color);">
      <span>${b.label}</span>
      <span style="font-weight:700; color:${b.correct ? 'var(--success)' : 'var(--danger)'};">${b.correct ? 'Benar' : 'Perlu Perbaikan'}</span>
    </li>`).join('');
  return `
    <div>
      <div style="font-size:2.2rem; font-weight:800; color:var(--accent-color);">Nilai: ${result.score}/100</div>
      <p style="color:var(--text-secondary); margin-bottom:10px;">${result.caseTitle}</p>
      <ul style="list-style:none; padding:0; margin:0;">${rows}</ul>
    </div>`;
}
