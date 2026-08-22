/**
 * Journal generation & aggregation for the tax/invoicing module.
 * Every posted invoice or purchase produces exactly one journal entry
 * (never re-created on reload — only on the explicit "Terbitkan
 * Invoice" / "Simpan Pembelian" action), which can later be marked
 * cancelled if the source document is cancelled.
 */
import { TAX_ACCOUNTS, PAYMENT_METHOD, CREDIT_STATUS } from './taxConstants.js';
import { addJournalEntry, cancelJournalEntriesFor, getJournalEntries } from './taxState.js';

let _seq = 0;
function nextJournalId() {
  _seq += 1;
  return `JT-${Date.now()}-${_seq}`;
}

/**
 * Builds and stores the journal for a sales invoice.
 *   Kredit (tunai)  : Debit Kas             / Kredit Pendapatan Penjualan + PPN Keluaran
 *   Kredit (kredit)  : Debit Piutang Usaha   / Kredit Pendapatan Penjualan + PPN Keluaran
 */
export function postInvoiceJournal(invoice) {
  const debitAccount = invoice.paymentMethod === PAYMENT_METHOD.TUNAI ? TAX_ACCOUNTS.KAS : TAX_ACCOUNTS.PIUTANG;
  const lines = [
    { account: debitAccount.name, debit: invoice.grandTotal, credit: 0 },
    { account: TAX_ACCOUNTS.PENJUALAN.name, debit: 0, credit: invoice.dppTotal }
  ];
  if (invoice.vatTotal > 0) {
    lines.push({ account: TAX_ACCOUNTS.PPN_KELUARAN.name, debit: 0, credit: invoice.vatTotal });
  }
  const entry = {
    id: nextJournalId(),
    date: invoice.invoiceDate,
    ref: invoice.invoiceNumber,
    sourceType: 'INVOICE',
    sourceId: invoice.id,
    description: `Penjualan kepada ${invoice.customer.name}`,
    lines,
    cancelled: false
  };
  addJournalEntry(entry);
  return entry;
}

/**
 * Builds and stores the journal for a purchase document.
 *   Debit Persediaan/Beban [+ PPN Masukan jika ada]
 *   Kredit Kas atau Utang Usaha
 */
export function postPurchaseJournal(purchase) {
  const creditAccount = purchase.paymentMethod === PAYMENT_METHOD.TUNAI ? TAX_ACCOUNTS.KAS : TAX_ACCOUNTS.UTANG;
  const lines = [
    { account: TAX_ACCOUNTS.PERSEDIAAN.name, debit: purchase.dpp, credit: 0 }
  ];
  if (purchase.vatAmount > 0) {
    lines.push({ account: TAX_ACCOUNTS.PPN_MASUKAN.name, debit: purchase.vatAmount, credit: 0 });
  }
  lines.push({ account: creditAccount.name, debit: 0, credit: purchase.dpp + (purchase.vatAmount || 0) });

  const entry = {
    id: nextJournalId(),
    date: purchase.documentDate,
    ref: purchase.documentNumber,
    sourceType: 'PURCHASE',
    sourceId: purchase.id,
    description: `Pembelian dari ${purchase.supplier.name}`,
    lines,
    cancelled: false
  };
  addJournalEntry(entry);
  return entry;
}

export function cancelInvoiceJournal(invoiceId) {
  cancelJournalEntriesFor('INVOICE', invoiceId);
}

export function cancelPurchaseJournal(purchaseId) {
  cancelJournalEntriesFor('PURCHASE', purchaseId);
}

/**
 * Builds a T-account style ledger (account name -> debit/credit line list
 * + balance) from every non-cancelled journal entry.
 */
export function buildTaxLedgers() {
  const map = new Map();
  const ensure = (name) => {
    if (!map.has(name)) map.set(name, { account: name, debits: [], credits: [] });
    return map.get(name);
  };

  getJournalEntries().filter(e => !e.cancelled).forEach(entry => {
    entry.lines.forEach(line => {
      const bucket = ensure(line.account);
      if (line.debit) bucket.debits.push({ ref: entry.ref, date: entry.date, amount: line.debit });
      if (line.credit) bucket.credits.push({ ref: entry.ref, date: entry.date, amount: line.credit });
    });
  });

  return Array.from(map.values()).map(acc => {
    const totalDebit = acc.debits.reduce((s, d) => s + d.amount, 0);
    const totalCredit = acc.credits.reduce((s, d) => s + d.amount, 0);
    return { ...acc, totalDebit, totalCredit, balance: totalDebit - totalCredit };
  });
}

/**
 * Aggregate PPN Keluaran across all non-cancelled invoices in [from, to].
 */
export function summarizePajakKeluaran(invoices, from, to) {
  const filtered = invoices.filter(inv =>
    inv.paymentStatus !== 'DIBATALKAN' &&
    (!from || inv.invoiceDate >= from) &&
    (!to || inv.invoiceDate <= to)
  );
  const totalDpp = filtered.reduce((s, i) => s + i.dppTotal, 0);
  const totalPpn = filtered.reduce((s, i) => s + i.vatTotal, 0);
  const lunas = filtered.filter(i => i.paymentStatus === 'LUNAS').length;
  const belumBayar = filtered.filter(i => i.paymentStatus === 'BELUM_DIBAYAR').length;
  return { invoices: filtered, totalDpp, totalPpn, count: filtered.length, lunas, belumBayar };
}

/**
 * Aggregate PPN Masukan across all non-cancelled purchases in [from, to].
 */
export function summarizePajakMasukan(purchases, from, to) {
  const filtered = purchases.filter(p =>
    !p.cancelled &&
    (!from || p.documentDate >= from) &&
    (!to || p.documentDate <= to)
  );
  const dapatDikreditkan = filtered.filter(p => p.creditStatus === CREDIT_STATUS.DAPAT_DIKREDITKAN);
  const tidakDapat = filtered.filter(p => p.creditStatus === CREDIT_STATUS.TIDAK_DAPAT_DIKREDITKAN);
  const totalPpn = filtered.reduce((s, p) => s + (p.vatAmount || 0), 0);
  const totalKreditkan = dapatDikreditkan.reduce((s, p) => s + (p.vatAmount || 0), 0);
  const totalTidakDapat = tidakDapat.reduce((s, p) => s + (p.vatAmount || 0), 0);
  return {
    purchases: filtered,
    totalPpn,
    totalDapatDikreditkan: totalKreditkan,
    totalTidakDapatDikreditkan: totalTidakDapat,
    count: filtered.length
  };
}

/**
 * PPN Neto = Pajak Keluaran - Pajak Masukan yang Dapat Dikreditkan.
 */
export function computeRekonsiliasi(invoices, purchases, from, to) {
  const keluaran = summarizePajakKeluaran(invoices, from, to);
  const masukan = summarizePajakMasukan(purchases, from, to);
  const neto = keluaran.totalPpn - masukan.totalDapatDikreditkan;
  let status = 'NIHIL';
  if (neto > 0) status = 'KURANG_BAYAR';
  else if (neto < 0) status = 'LEBIH_BAYAR';
  return { keluaran, masukan, neto, status };
}
