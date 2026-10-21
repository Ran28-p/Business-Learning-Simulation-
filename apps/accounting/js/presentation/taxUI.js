/**
 * Presentation Layer – Tax / Invoicing module event handlers.
 * Connects DOM events to js/tax/* business logic and js/presentation/taxPages.js renderers.
 *
 * Struktur: taxUI/settings.js (profil, tarif PPN, backup, mode & latihan), master-data.js (partner & produk),
 * invoice-form.js (form faktur), invoice-list.js (daftar, detail, cetak, duplikat, batal), purchases.js (pembelian).
 * File ini = filter, onShow*, bindTaxUIEvents, initTaxModule; daftar export tidak berubah.
 */

import { renderPajakKeluaranPage, renderRekonsiliasiPage, renderCompanySettingsPage, applyInvoiceVatOptions, fillPartnerSelect, renderPurchaseTable, renderJournalTransaksiPage, renderCompanyStatusNote, renderLatihanCaseSelect, renderLatihanNarrative, renderDashboardKPIs } from './taxPages.js';
import { ensureDemoData, getCompany } from '../tax/taxState.js';
import { TAX_CASE_STUDIES } from '../../data/taxCaseStudies.js';
import { getActiveVatRatePercent } from '../tax/vatEngine.js';
import { refreshPartnerTable, refreshProductTable, _refreshAllPartnerSelects, handleTogglePartnerForm, handleSavePartner, handleEditPartner, handleDeletePartner, handleHistoryPartner, handleToggleProductForm, handleSaveProduct, handleEditProduct, handleDeleteProduct } from './taxUI/master-data.js';
import { handleResetInvoiceForm, recalcInvoiceTotals, addInvoiceItemRow, handleSaveInvoiceDraft, handlePublishInvoice, handleInvoiceCustomerChange } from './taxUI/invoice-form.js';
import { refreshInvoiceListTable, handleViewInvoice, handleCloseInvoiceModal, handlePrintReport, handlePrintInvoice, handlePrintInvoicePDF, handleDuplicateInvoice, handleCancelInvoice, handleCreateFakturPajakLink } from './taxUI/invoice-list.js';
import { handleSaveCompanyProfile, handleAddVatRate, handleDeleteVatRate, handleBackupExport, handleTriggerImport, handleResetAllData, handleSetTaxMode, handleLatihanCaseChange, handleImportFile } from './taxUI/settings.js';
import { handleSavePurchase, handleCancelPurchase, handlePurchaseSupplierChange, _recalcPurchaseVat } from './taxUI/purchases.js';

/* ══════════════════════════════════════════════════════════════════
   PAJAK KELUARAN / REKONSILIASI FILTERS
   ══════════════════════════════════════════════════════════════════ */

function handleApplyPkFilter() {
  renderPajakKeluaranPage({
    from: document.getElementById('pkFrom')?.value || '',
    to: document.getElementById('pkTo')?.value || ''
  });
}

function handleApplyRekonsiliasiFilter() {
  renderRekonsiliasiPage({
    from: document.getElementById('rekFrom')?.value || '',
    to: document.getElementById('rekTo')?.value || ''
  });
}

/* ══════════════════════════════════════════════════════════════════
   PAGE-SHOW HOOKS (called from pages.js router)
   ══════════════════════════════════════════════════════════════════ */

export function onShowPengaturanPajak() { renderCompanySettingsPage(); }

export function onShowMasterPartner() { refreshPartnerTable(); }

export function onShowMasterProduk() { refreshProductTable(); }

export function onShowBuatInvoice() {
  // Pastikan ada data demo jika partner/produk kosong (juga untuk state lama)
  ensureDemoData({ persist: true });
  _refreshAllPartnerSelects();
  applyInvoiceVatOptions();
  if (document.getElementById('invoiceItemsBody')?.children.length === 0) {
    handleResetInvoiceForm({ silent: true });
  }
  const dateEl = document.getElementById('invDate');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0, 10);
  // Pastikan input form tidak terkunci
  ['invDate', 'invDueDate', 'invCustomer', 'invRef', 'invPaymentMethod', 'invPaymentStatus', 'invNotes'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.disabled = false; el.readOnly = (id === 'invNumber' || id === 'invCurrency' || id === 'invCustomerStatus' || id === 'invCustomerNpwp' || id === 'invCustomerAddress'); }
  });
  const vatSel = document.getElementById('invVatTreatment');
  const company = getCompany();
  if (vatSel && company.taxStatus === 'PKP') {
    vatSel.disabled = false;
  }
  recalcInvoiceTotals();
}

export function onShowDaftarInvoice() { refreshInvoiceListTable(); }

export function onShowInputPembelian() {
  fillPartnerSelect(document.getElementById('pchSupplier'), 'PEMASOK');
  renderPurchaseTable();
}

export function onShowPajakKeluaran() { renderPajakKeluaranPage(); }

export function onShowRekonsiliasi() { renderRekonsiliasiPage(); }

export function onShowJurnalTransaksi() { renderJournalTransaksiPage(); }

/* ══════════════════════════════════════════════════════════════════
   BIND EVENTS
   ══════════════════════════════════════════════════════════════════ */

export function bindTaxUIEvents() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case 'save-company-profile': handleSaveCompanyProfile(); break;
      case 'add-vat-rate': handleAddVatRate(); break;
      case 'delete-vat-rate': handleDeleteVatRate(target.dataset.id); break;
      case 'backup-export-data': handleBackupExport(); break;
      case 'trigger-import-data': handleTriggerImport(); break;
      case 'reset-all-data': handleResetAllData(); break;

      case 'toggle-partner-form': handleTogglePartnerForm(); break;
      case 'cancel-partner-form': document.getElementById('partnerFormPanel').style.display = 'none'; break;
      case 'save-partner': handleSavePartner(); break;
      case 'edit-partner': handleEditPartner(target.dataset.id); break;
      case 'delete-partner': handleDeletePartner(target.dataset.id); break;
      case 'history-partner': handleHistoryPartner(target.dataset.id); break;

      case 'toggle-product-form': handleToggleProductForm(); break;
      case 'cancel-product-form': document.getElementById('productFormPanel').style.display = 'none'; break;
      case 'save-product': handleSaveProduct(); break;
      case 'edit-product': handleEditProduct(target.dataset.id); break;
      case 'delete-product': handleDeleteProduct(target.dataset.id); break;

      case 'set-tax-mode': handleSetTaxMode(target.dataset.mode); break;

      case 'add-invoice-item': addInvoiceItemRow(); recalcInvoiceTotals(); break;
      case 'save-invoice-draft': handleSaveInvoiceDraft(); break;
      case 'publish-invoice': handlePublishInvoice(); break;
      case 'reset-invoice-form': handleResetInvoiceForm(); break;

      case 'view-invoice': handleViewInvoice(target.dataset.id); break;
      case 'close-invoice-modal': handleCloseInvoiceModal(); break;
      case 'print-report': handlePrintReport(); break;
      case 'print-invoice': handlePrintInvoice(); break;
      case 'print-invoice-pdf': handlePrintInvoicePDF(); break;
      case 'duplicate-invoice': handleDuplicateInvoice(); break;
      case 'cancel-invoice': handleCancelInvoice(); break;
      case 'create-faktur-pajak': handleCreateFakturPajakLink(); break;

      case 'save-purchase': handleSavePurchase(); break;
      case 'cancel-purchase': handleCancelPurchase(target.dataset.id); break;

      case 'apply-pk-filter': handleApplyPkFilter(); break;
      case 'apply-rekonsiliasi-filter': handleApplyRekonsiliasiFilter(); break;
      default: break;
    }
  });

  // Partner filters
  ['partnerSearch', 'partnerFilterType', 'partnerFilterTax'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', refreshPartnerTable);
    document.getElementById(id)?.addEventListener('change', refreshPartnerTable);
  });

  document.getElementById('productSearch')?.addEventListener('input', refreshProductTable);

  // Invoice list filters
  ['invListSearch', 'invListFrom', 'invListTo', 'invListStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', refreshInvoiceListTable);
    document.getElementById(id)?.addEventListener('change', refreshInvoiceListTable);
  });

  document.getElementById('invCustomer')?.addEventListener('change', handleInvoiceCustomerChange);
  document.getElementById('invVatTreatment')?.addEventListener('change', recalcInvoiceTotals);
  document.getElementById('invDate')?.addEventListener('change', recalcInvoiceTotals);

  document.getElementById('latihanCaseSelect')?.addEventListener('change', handleLatihanCaseChange);

  document.getElementById('pchSupplier')?.addEventListener('change', handlePurchaseSupplierChange);
  document.getElementById('pchDpp')?.addEventListener('input', _recalcPurchaseVat);
  document.getElementById('pchVatRate')?.addEventListener('input', _recalcPurchaseVat);

  document.getElementById('importDataInput')?.addEventListener('change', handleImportFile);

  document.getElementById('cpTaxStatus')?.addEventListener('change', () => {
    renderCompanyStatusNote();
  });
}

export function initTaxModule() {
  ensureDemoData({ persist: true });
  renderLatihanCaseSelect();
  const firstCase = TAX_CASE_STUDIES[0];
  if (firstCase) renderLatihanNarrative(firstCase);
  renderDashboardKPIs();
  document.getElementById('pchVatRate') && (document.getElementById('pchVatRate').value = getActiveVatRatePercent(new Date().toISOString().slice(0, 10)));
  _refreshAllPartnerSelects();
}
