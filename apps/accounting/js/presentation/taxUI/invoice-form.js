/**
 * taxUI/invoice-form.js — form pembuatan faktur: baris item, hitung total, simpan draft, terbitkan
 * (dipecah dari ../taxUI.js; perilaku identik)
 */
import { fillProductSelectOptions, applyInvoiceVatOptions, renderInvoiceListTable, renderDashboardKPIs, renderPajakKeluaranPage, renderJournalTransaksiPage } from '../taxPages.js';
import { getProducts, getCompany, getPartners, nextInvoiceNumber, addInvoice, updateInvoice, getMode, getLatihanState, setLatihanResult } from '../../tax/taxState.js';
import { TAX_STATUS, TAX_MODE } from '../../tax/taxConstants.js';
import { getActiveVatRatePercent, computeLineItem, computeDocumentTotals } from '../../tax/vatEngine.js';
import { parseAmount, formatRupiah } from '../../utils/formatters.js';
import { showToast, showModal } from '../modals.js';
import { validateInvoiceForm, renderErrorListHTML } from '../../tax/validation.js';
import { postInvoiceJournal } from '../../tax/journalEngine.js';
import { scoreLatihanInvoice, renderLatihanResultHTML } from '../../tax/latihanEngine.js';

/* ══════════════════════════════════════════════════════════════════
   BUAT INVOICE
   ══════════════════════════════════════════════════════════════════ */

let _invoiceItemSeq = 0;

export function addInvoiceItemRow() {
  const tbody = document.getElementById('invoiceItemsBody');
  if (!tbody) return;
  _invoiceItemSeq += 1;
  const rowId = `item-${_invoiceItemSeq}`;

  const row = document.createElement('tr');
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <td class="row-no">${tbody.children.length + 1}</td>
    <td><select class="item-product-select"></select></td>
    <td><input type="text" class="item-name" placeholder="Nama barang/jasa"></td>
    <td><input type="number" class="item-qty" value="1" min="0" step="1"></td>
    <td><input type="text" class="item-unit" value="Unit"></td>
    <td><input type="number" class="item-price" value="0" min="0"></td>
    <td><input type="number" class="item-disc-pct" value="0" min="0" max="100"></td>
    <td><input type="number" class="item-disc-amt" value="0" min="0"></td>
    <td><span class="item-dpp">Rp 0</span></td>
    <td><span class="item-vat">Rp 0</span></td>
    <td><span class="item-total">Rp 0</span></td>
    <td><button class="btn btn-danger btn-sm" data-action="remove-invoice-item">🗑️</button></td>
  `;
  tbody.appendChild(row);
  fillProductSelectOptions(row.querySelector('.item-product-select'));

  row.querySelector('.item-product-select').addEventListener('change', (e) => {
    const productId = e.target.value;
    const product = getProducts().find(p => p.id === productId);
    if (product) {
      row.querySelector('.item-name').value = product.name;
      row.querySelector('.item-unit').value = product.unit;
      row.querySelector('.item-price').value = product.price;
    }
    recalcInvoiceTotals();
  });

  row.querySelector('[data-action="remove-invoice-item"]').addEventListener('click', () => {
    row.remove();
    _renumberInvoiceRows();
    recalcInvoiceTotals();
  });

  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', recalcInvoiceTotals);
  });
}

function _renumberInvoiceRows() {
  document.querySelectorAll('#invoiceItemsBody tr').forEach((row, idx) => {
    row.querySelector('.row-no').innerText = idx + 1;
  });
}

function _vatAppliesNow() {
  const company = getCompany();
  const treatment = document.getElementById('invVatTreatment')?.value;
  return company.taxStatus === TAX_STATUS.PKP && treatment === 'PPN_DIKENAKAN';
}

function _readInvoiceItems() {
  const date = document.getElementById('invDate')?.value || new Date().toISOString().slice(0, 10);
  const vatRatePercent = getActiveVatRatePercent(date);
  const vatApplies = _vatAppliesNow();

  return Array.from(document.querySelectorAll('#invoiceItemsBody tr')).map(row => {
    const raw = {
      productId: row.querySelector('.item-product-select').value || null,
      name: row.querySelector('.item-name').value.trim(),
      quantity: parseAmount(row.querySelector('.item-qty').value),
      unit: row.querySelector('.item-unit').value.trim() || 'Unit',
      unitPrice: parseAmount(row.querySelector('.item-price').value),
      discountPercent: parseAmount(row.querySelector('.item-disc-pct').value),
      discountAmount: parseAmount(row.querySelector('.item-disc-amt').value),
      vatRatePercent,
      vatApplies
    };
    const computed = computeLineItem(raw);
    return { ...raw, ...computed, row };
  });
}

export function recalcInvoiceTotals() {
  const items = _readInvoiceItems();
  items.forEach(it => {
    it.row.querySelector('.item-dpp').innerText = formatRupiah(it.dpp);
    it.row.querySelector('.item-vat').innerText = formatRupiah(it.vatAmount);
    it.row.querySelector('.item-total').innerText = formatRupiah(it.total);
  });
  const totals = computeDocumentTotals(items);
  document.getElementById('invSubtotal').innerText = formatRupiah(totals.subtotal);
  document.getElementById('invDiscountTotal').innerText = formatRupiah(totals.discountTotal);
  document.getElementById('invDppTotal').innerText = formatRupiah(totals.dppTotal);
  document.getElementById('invVatTotalDisplay').innerText = formatRupiah(totals.vatTotal);
  document.getElementById('invGrandTotal').innerText = formatRupiah(totals.grandTotal);
  return totals;
}

export function handleInvoiceCustomerChange() {
  const sel = document.getElementById('invCustomer');
  const customer = getPartners().find(p => p.id === sel.value);
  document.getElementById('invCustomerStatus').value = customer ? (customer.taxStatus === TAX_STATUS.PKP ? 'PKP' : 'Non-PKP') : '';
  document.getElementById('invCustomerNpwp').value = customer?.npwp || '';
  document.getElementById('invCustomerAddress').value = customer?.address || '';
}

export function handleResetInvoiceForm(opts = {}) {
  document.getElementById('invNumber').value = '';
  document.getElementById('invDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('invDueDate').value = '';
  document.getElementById('invCustomer').value = '';
  document.getElementById('invCustomerStatus').value = '';
  document.getElementById('invCustomerNpwp').value = '';
  document.getElementById('invCustomerAddress').value = '';
  document.getElementById('invRef').value = '';
  document.getElementById('invPaymentMethod').value = 'KREDIT';
  document.getElementById('invPaymentStatus').value = 'BELUM_DIBAYAR';
  document.getElementById('invNotes').value = '';
  applyInvoiceVatOptions();
  document.getElementById('invoiceItemsBody').innerHTML = '';
  addInvoiceItemRow();
  recalcInvoiceTotals();
  if (!opts.silent) showToast('Formulir invoice direset.');
}

function _buildInvoiceFromForm(items, totals) {
  const dateStr = document.getElementById('invDate').value;
  const customerId = document.getElementById('invCustomer').value;
  const customer = getPartners().find(p => p.id === customerId);
  return {
    dateStr,
    customer,
    items,
    totals,
    dueDate: document.getElementById('invDueDate').value,
    ref: document.getElementById('invRef').value.trim(),
    paymentMethod: document.getElementById('invPaymentMethod').value,
    paymentStatus: document.getElementById('invPaymentStatus').value,
    taxTreatment: document.getElementById('invVatTreatment').value,
    notes: document.getElementById('invNotes').value.trim()
  };
}

function _saveInvoice(status) {
  const totals = recalcInvoiceTotals();
  const items = _readInvoiceItems();
  const form = _buildInvoiceFromForm(items, totals);
  const company = getCompany();

  const validation = validateInvoiceForm({
    customer: form.customer,
    invoiceDate: form.dateStr,
    items: form.items,
    companyTaxStatus: company.taxStatus
  });
  if (!validation.valid) {
    showModal('Invoice Belum Dapat Disimpan', renderErrorListHTML(validation.errors));
    return null;
  }

  const invoiceNumber = nextInvoiceNumber(form.dateStr);
  const invoice = {
    id: `INVID-${Date.now()}`,
    invoiceNumber,
    invoiceDate: form.dateStr,
    dueDate: form.dueDate,
    customer: { id: form.customer.id, name: form.customer.name, taxStatus: form.customer.taxStatus, npwp: form.customer.npwp, address: form.customer.address },
    companyTaxStatus: company.taxStatus,
    taxTreatment: form.taxTreatment,
    orderRef: form.ref,
    paymentMethod: form.paymentMethod,
    items: form.items.map(it => ({
      productId: it.productId, name: it.name, quantity: it.quantity, unit: it.unit,
      unitPrice: it.unitPrice, discount: it.discount, dpp: it.dpp, vatRate: it.vatRatePercent / 100,
      vatAmount: it.vatAmount, total: it.total
    })),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    dppTotal: totals.dppTotal,
    vatTotal: totals.vatTotal,
    grandTotal: totals.grandTotal,
    paymentStatus: status === 'DRAFT' ? 'DRAFT' : form.paymentStatus,
    notes: form.notes,
    journalCreated: false,
    createdAt: new Date().toISOString()
  };

  addInvoice(invoice);

  let journalEntry = null;
  if (status !== 'DRAFT') {
    journalEntry = postInvoiceJournal(invoice);
    updateInvoice(invoice.id, { journalCreated: true });
  }

  return { invoice, journalEntry };
}

export function handleSaveInvoiceDraft() {
  const result = _saveInvoice('DRAFT');
  if (!result) return;
  showToast(`📝 Invoice ${result.invoice.invoiceNumber} disimpan sebagai draft.`);
  renderInvoiceListTable();
  renderDashboardKPIs();
  handleResetInvoiceForm({ silent: true });
}

export function handlePublishInvoice() {
  const result = _saveInvoice('PUBLISH');
  if (!result) return;
  showToast(`✅ Invoice ${result.invoice.invoiceNumber} diterbitkan dan jurnal dibuat.`);
  renderInvoiceListTable();
  renderDashboardKPIs();
  renderPajakKeluaranPage();
  renderJournalTransaksiPage();

  if (getMode() === TAX_MODE.LATIHAN) {
    const latihan = getLatihanState();
    if (latihan.currentCaseId) {
      const scoreResult = scoreLatihanInvoice(latihan.currentCaseId, result.invoice, result.journalEntry);
      setLatihanResult(scoreResult);
      const area = document.getElementById('latihanResultArea');
      if (area) area.innerHTML = renderLatihanResultHTML(scoreResult);
    }
  }

  handleResetInvoiceForm({ silent: true });
}
