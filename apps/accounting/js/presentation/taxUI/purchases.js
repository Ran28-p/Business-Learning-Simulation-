/**
 * taxUI/purchases.js — input pembelian dan batalkan pembelian
 * (dipecah dari ../taxUI.js; perilaku identik)
 */
import { getPartners, nextPurchaseSeq, addPurchase, getPurchases, updatePurchase } from '../../tax/taxState.js';
import { TAX_STATUS, CREDIT_STATUS } from '../../tax/taxConstants.js';
import { parseAmount } from '../../utils/formatters.js';
import { validatePurchaseForm, renderErrorListHTML } from '../../tax/validation.js';
import { showModal, showToast } from '../modals.js';
import { postPurchaseJournal, cancelPurchaseJournal } from '../../tax/journalEngine.js';
import { renderPurchaseTable, renderDashboardKPIs, renderJournalTransaksiPage } from '../taxPages.js';
import { getActiveVatRatePercent } from '../../tax/vatEngine.js';

/* ══════════════════════════════════════════════════════════════════
   INPUT PEMBELIAN & PAJAK MASUKAN
   ══════════════════════════════════════════════════════════════════ */

export function handlePurchaseSupplierChange() {
  const sel = document.getElementById('pchSupplier');
  const supplier = getPartners().find(p => p.id === sel.value);
  document.getElementById('pchSupplierStatus').value = supplier ? (supplier.taxStatus === TAX_STATUS.PKP ? 'PKP' : 'Non-PKP') : '';
  document.getElementById('pchSupplierNpwp').value = supplier?.npwp || '';
  _applyCreditStatusConstraint(supplier);
}

function _applyCreditStatusConstraint(supplier) {
  const sel = document.getElementById('pchCreditStatus');
  const note = document.getElementById('purchaseVatNote');
  const creditOption = sel.querySelector('option[value="DAPAT_DIKREDITKAN"]');
  if (supplier && supplier.taxStatus === TAX_STATUS.NON_PKP) {
    creditOption.disabled = true;
    if (sel.value === 'DAPAT_DIKREDITKAN') sel.value = 'TIDAK_DAPAT_DIKREDITKAN';
    note.className = 'alert-box alert-warning';
    note.innerText = 'Pemasok berstatus Non-PKP — sistem tidak akan otomatis membuat Pajak Masukan yang dapat dikreditkan.';
  } else {
    creditOption.disabled = false;
    note.className = 'alert-box alert-info';
    note.innerText = 'Pengkreditan Pajak Masukan bergantung pada ketentuan perpajakan yang berlaku dan karakter transaksi — tidak seluruh Pajak Masukan otomatis dapat dikreditkan.';
  }
}

export function _recalcPurchaseVat() {
  const dpp = parseAmount(document.getElementById('pchDpp').value);
  const rate = parseAmount(document.getElementById('pchVatRate').value);
  document.getElementById('pchVatAmount').value = Math.round(dpp * (rate / 100));
}

export function handleSavePurchase() {
  const supplierId = document.getElementById('pchSupplier').value;
  const supplier = getPartners().find(p => p.id === supplierId);
  const documentDate = document.getElementById('pchDate').value;
  const documentNumber = document.getElementById('pchDocNumber').value.trim();
  const dpp = parseAmount(document.getElementById('pchDpp').value);
  const vatAmount = parseAmount(document.getElementById('pchVatAmount').value);
  const creditStatus = document.getElementById('pchCreditStatus').value;

  const validation = validatePurchaseForm({ supplier, documentDate, documentNumber, dpp });
  if (!validation.valid) {
    showModal('Data Belum Lengkap', renderErrorListHTML(validation.errors));
    return;
  }

  if (supplier.taxStatus === TAX_STATUS.NON_PKP && vatAmount > 0) {
    const proceed = confirm(
      'Pemasok berstatus Non-PKP namun Anda memasukkan nilai PPN. Transaksi Non-PKP umumnya tidak menerbitkan PPN. Lanjutkan menyimpan transaksi ini?'
    );
    if (!proceed) return;
  }

  const finalCreditStatus = (supplier.taxStatus === TAX_STATUS.NON_PKP && creditStatus === CREDIT_STATUS.DAPAT_DIKREDITKAN)
    ? CREDIT_STATUS.TIDAK_DAPAT_DIKREDITKAN
    : creditStatus;

  const purchase = {
    id: `PCHID-${Date.now()}`,
    seq: nextPurchaseSeq(),
    documentNumber,
    documentDate,
    supplier: { id: supplier.id, name: supplier.name, taxStatus: supplier.taxStatus, npwp: supplier.npwp },
    itemDescription: document.getElementById('pchItemDesc').value.trim(),
    paymentMethod: document.getElementById('pchPaymentMethod').value,
    dpp,
    vatRatePercent: parseAmount(document.getElementById('pchVatRate').value),
    vatAmount,
    taxInvoiceNumber: document.getElementById('pchTaxInvoiceNumber').value.trim(),
    creditStatus: finalCreditStatus,
    notes: document.getElementById('pchNotes').value.trim(),
    cancelled: false,
    createdAt: new Date().toISOString()
  };

  addPurchase(purchase);
  postPurchaseJournal(purchase);

  showToast(`✅ Pembelian dari ${supplier.name} tersimpan dan jurnal dibuat.`);
  renderPurchaseTable();
  renderDashboardKPIs();
  renderJournalTransaksiPage();
  _resetPurchaseForm();
}

function _resetPurchaseForm() {
  document.getElementById('pchSupplier').value = '';
  document.getElementById('pchSupplierStatus').value = '';
  document.getElementById('pchSupplierNpwp').value = '';
  document.getElementById('pchDocNumber').value = '';
  document.getElementById('pchDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('pchPaymentMethod').value = 'KREDIT';
  document.getElementById('pchItemDesc').value = '';
  document.getElementById('pchDpp').value = '0';
  document.getElementById('pchVatRate').value = getActiveVatRatePercent(new Date().toISOString().slice(0, 10));
  document.getElementById('pchVatAmount').value = '0';
  document.getElementById('pchTaxInvoiceNumber').value = '';
  document.getElementById('pchCreditStatus').value = 'BELUM_DIVERIFIKASI';
  document.getElementById('pchNotes').value = '';
}

export function handleCancelPurchase(id) {
  const p = getPurchases().find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Batalkan transaksi pembelian ${p.documentNumber}?`)) return;
  updatePurchase(id, { cancelled: true });
  cancelPurchaseJournal(id);
  renderPurchaseTable();
  renderDashboardKPIs();
  renderJournalTransaksiPage();
  showToast('🚫 Pembelian dibatalkan.');
}
