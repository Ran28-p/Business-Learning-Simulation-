/**
 * VAT (PPN) calculation engine — pure functions, no DOM/state side effects
 * except reading from taxState where explicitly noted.
 */
import { getVatRates, getCompany } from './taxState.js';
import { DEFAULT_VAT_RATE_PERCENT } from './taxConstants.js';

/**
 * Resolves the VAT rate (as a percentage, e.g. 12) that applies on a given
 * transaction date: the most recent ACTIVE rate whose effective date is on
 * or before the transaction date. Falls back to the company's default rate,
 * then to the global default.
 */
export function getActiveVatRatePercent(dateStr) {
  const rates = getVatRates().filter(r => r.status === 'AKTIF' && r.effectiveDate && r.effectiveDate <= dateStr);
  if (rates.length) {
    rates.sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
    return Number(rates[0].ratePercent);
  }
  const company = getCompany();
  return Number(company?.defaultVatRatePercent) || DEFAULT_VAT_RATE_PERCENT;
}

/**
 * Computes one invoice/purchase line item.
 * @param {{quantity:number, unitPrice:number, discountPercent?:number, discountAmount?:number, vatRatePercent:number, vatApplies:boolean}} item
 */
export function computeLineItem(item) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  const gross = qty * price;

  let discount = Number(item.discountAmount) || 0;
  const discountPct = Number(item.discountPercent) || 0;
  if (discountPct > 0) {
    discount += gross * (discountPct / 100);
  }
  discount = Math.min(discount, gross);

  const dpp = Math.max(0, gross - discount);
  const vatRate = Number(item.vatRatePercent) || 0;
  const vatAmount = item.vatApplies ? Math.round(dpp * (vatRate / 100)) : 0;
  const total = dpp + vatAmount;

  return { gross, discount, dpp, vatAmount, total };
}

/**
 * Aggregates a full items array into invoice/purchase-level totals.
 */
export function computeDocumentTotals(items) {
  return items.reduce((acc, it) => {
    acc.subtotal += it.gross;
    acc.discountTotal += it.discount;
    acc.dppTotal += it.dpp;
    acc.vatTotal += it.vatAmount;
    acc.grandTotal += it.total;
    return acc;
  }, { subtotal: 0, discountTotal: 0, dppTotal: 0, vatTotal: 0, grandTotal: 0 });
}
