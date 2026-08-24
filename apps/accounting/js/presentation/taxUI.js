/**
 * Presentation Layer – Tax / Invoicing module event handlers.
 * Connects DOM events to js/tax/* business logic and js/presentation/taxPages.js renderers.
 */
import {
  getCompany, updateCompany, getVatRates, addVatRate, deleteVatRate,
  getPartners, addPartner, updatePartner, deletePartner, nextPartnerId,
  getProducts, addProduct, updateProduct, deleteProduct, nextProductId,
  getInvoices, addInvoice, updateInvoice, nextInvoiceNumber,
  getPurchases, addPurchase, updatePurchase, nextPurchaseSeq,
  getMode, setMode, getLatihanState, setLatihanCase, setLatihanResult,
  ensureDemoData
} from '../tax/taxState.js';
import { getActiveVatRatePercent, computeLineItem, computeDocumentTotals } from '../tax/vatEngine.js';
import { postInvoiceJournal, postPurchaseJournal, cancelInvoiceJournal, cancelPurchaseJournal } from '../tax/journalEngine.js';
import { validateInvoiceForm, validatePurchaseForm, validatePartnerForm, renderErrorListHTML } from '../tax/validation.js';
import { scoreLatihanInvoice, renderLatihanResultHTML } from '../tax/latihanEngine.js';
import { getCaseStudyById, TAX_CASE_STUDIES } from '../../data/taxCaseStudies.js';
import { TAX_STATUS, PAYMENT_METHOD, CREDIT_STATUS, TAX_MODE } from '../tax/taxConstants.js';
import { formatRupiah, parseAmount } from '../utils/formatters.js';
import { showModal, closeModal, showToast } from './modals.js';
import {
  renderDashboardKPIs, renderCompanySettingsPage, renderCompanyStatusNote, renderVatRateTable,
  renderPartnerTable, fillPartnerSelect, renderProductTable, fillProductSelectOptions,
  renderLatihanCaseSelect, renderLatihanNarrative, applyInvoiceVatOptions,
  renderInvoiceListTable, renderInvoicePrintHTML, renderPurchaseTable,
  renderPajakKeluaranPage, renderRekonsiliasiPage, renderJournalTransaksiPage,
  renderPartnerHistoryHTML, taxBadge
} from './taxPages.js';

let _currentInvoiceViewId = null;

/* ══════════════════════════════════════════════════════════════════
   PENGATURAN PERUSAHAAN & PAJAK
   ══════════════════════════════════════════════════════════════════ */

function handleSaveCompanyProfile() {
  updateCompany({
    name: document.getElementById('cpName').value.trim(),
    npwp: document.getElementById('cpNpwp').value.trim(),
    address: document.getElementById('cpAddress').value.trim(),
    nik: document.getElementById('cpNik').value.trim(),
    taxStatus: document.getElementById('cpTaxStatus').value,
    pkpDate: document.getElementById('cpPkpDate').value,
    taxId: document.getElementById('cpTaxId').value.trim(),
    defaultVatRatePercent: parseAmount(document.getElementById('cpDefaultVat').value),
    vatBasis: document.getElementById('cpVatBasis').value
  });
  renderCompanyStatusNote();
  applyInvoiceVatOptions();
  renderDashboardKPIs();
  showToast('✅ Profil perusahaan tersimpan.');
}

function handleAddVatRate() {
  const rate = {
    id: `rate-${Date.now()}`,
    label: document.getElementById('vrLabel').value.trim() || 'Tanpa Label',
    ratePercent: parseAmount(document.getElementById('vrRate').value),
    basis: document.getElementById('vrBasis').value,
    effectiveDate: document.getElementById('vrEffectiveDate').value || new Date().toISOString().slice(0, 10),
    status: document.getElementById('vrStatus').value
  };
  addVatRate(rate);
  renderVatRateTable();
  showToast('✅ Tarif PPN baru ditambahkan.');
}

function handleDeleteVatRate(id) {
  if (getVatRates().length <= 1) {
    showModal('Tidak Dapat Dihapus', 'Minimal harus ada satu tarif PPN yang tersimpan.');
    return;
  }
  if (!confirm('Hapus tarif PPN ini?')) return;
  deleteVatRate(id);
  renderVatRateTable();
}

/* ══════════════════════════════════════════════════════════════════
   BACKUP / IMPORT / EXPORT / RESET (whole app)
   ══════════════════════════════════════════════════════════════════ */

async function handleBackupExport() {
  const { exportAllData } = await import('../storage/localStorage.js');
  const bundle = exportAllData();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ActMasterPro_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('💾 Backup data berhasil diunduh.');
}

function handleTriggerImport() {
  const input = document.getElementById('importDataInput');
  if (input) input.click();
}

async function handleImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const bundle = JSON.parse(text);
    const { importAllData } = await import('../storage/localStorage.js');
    importAllData(bundle);
    showModal('Import Berhasil', 'Data berhasil dipulihkan. Halaman akan dimuat ulang untuk menerapkan perubahan.');
    setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    showModal('Import Gagal', 'Berkas backup tidak valid atau rusak. Pastikan Anda memilih berkas JSON hasil export dari aplikasi ini.');
  } finally {
    e.target.value = '';
  }
}

async function handleResetAllData() {
  const confirmed = confirm(
    'Reset akan menghapus SELURUH data aplikasi (progres latihan, master data, invoice, pembelian, jurnal, dan pengaturan). Tindakan ini tidak dapat dibatalkan. Lanjutkan?'
  );
  if (!confirmed) return;
  const { resetAllData } = await import('../storage/localStorage.js');
  resetAllData();
  window.location.reload();
}

/* ══════════════════════════════════════════════════════════════════
   MASTER PELANGGAN & PEMASOK
   ══════════════════════════════════════════════════════════════════ */

function _partnerFilters() {
  return {
    search: document.getElementById('partnerSearch')?.value || '',
    type: document.getElementById('partnerFilterType')?.value || 'ALL',
    tax: document.getElementById('partnerFilterTax')?.value || 'ALL'
  };
}

function refreshPartnerTable() {
  renderPartnerTable(_partnerFilters());
}

function handleTogglePartnerForm() {
  const panel = document.getElementById('partnerFormPanel');
  if (!panel) return;
  const willShow = panel.style.display === 'none';
  panel.style.display = willShow ? 'block' : 'none';
  if (willShow) _clearPartnerForm();
}

function _clearPartnerForm() {
  document.getElementById('partnerEditId').value = '';
  document.getElementById('pfType').value = 'PELANGGAN';
  document.getElementById('pfName').value = '';
  document.getElementById('pfTaxStatus').value = 'NON_PKP';
  document.getElementById('pfNpwp').value = '';
  document.getElementById('pfNik').value = '';
  document.getElementById('pfCity').value = '';
  document.getElementById('pfAddress').value = '';
  document.getElementById('pfPhone').value = '';
  document.getElementById('pfEmail').value = '';
  document.getElementById('pfActive').value = 'true';
  document.getElementById('pfNotes').value = '';
}

function handleEditPartner(id) {
  const p = getPartners().find(x => x.id === id);
  if (!p) return;
  document.getElementById('partnerFormPanel').style.display = 'block';
  document.getElementById('partnerEditId').value = p.id;
  document.getElementById('pfType').value = p.type;
  document.getElementById('pfName').value = p.name;
  document.getElementById('pfTaxStatus').value = p.taxStatus;
  document.getElementById('pfNpwp').value = p.npwp || '';
  document.getElementById('pfNik').value = p.nik || '';
  document.getElementById('pfCity').value = p.city || '';
  document.getElementById('pfAddress').value = p.address || '';
  document.getElementById('pfPhone').value = p.phone || '';
  document.getElementById('pfEmail').value = p.email || '';
  document.getElementById('pfActive').value = String(!!p.active);
  document.getElementById('pfNotes').value = p.notes || '';
  document.getElementById('partnerFormPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleSavePartner() {
  const editId = document.getElementById('partnerEditId').value;
  const data = {
    type: document.getElementById('pfType').value,
    name: document.getElementById('pfName').value.trim(),
    taxStatus: document.getElementById('pfTaxStatus').value,
    npwp: document.getElementById('pfNpwp').value.trim(),
    nik: document.getElementById('pfNik').value.trim(),
    city: document.getElementById('pfCity').value.trim(),
    address: document.getElementById('pfAddress').value.trim(),
    phone: document.getElementById('pfPhone').value.trim(),
    email: document.getElementById('pfEmail').value.trim(),
    active: document.getElementById('pfActive').value === 'true',
    notes: document.getElementById('pfNotes').value.trim()
  };

  const result = validatePartnerForm(data);
  if (!result.valid) {
    showModal('Data Belum Lengkap', renderErrorListHTML(result.errors));
    return;
  }

  if (editId) {
    updatePartner(editId, data);
    showToast('✅ Data pelanggan/pemasok diperbarui.');
  } else {
    addPartner({ id: nextPartnerId(), ...data, createdAt: new Date().toISOString() });
    showToast('✅ Data pelanggan/pemasok ditambahkan.');
  }

  document.getElementById('partnerFormPanel').style.display = 'none';
  refreshPartnerTable();
  _refreshAllPartnerSelects();
}

function handleDeletePartner(id) {
  if (!confirm('Hapus data pelanggan/pemasok ini? Riwayat invoice/pembelian yang sudah ada tidak akan terhapus.')) return;
  deletePartner(id);
  refreshPartnerTable();
  _refreshAllPartnerSelects();
}

function handleHistoryPartner(id) {
  const p = getPartners().find(x => x.id === id);
  if (!p) return;
  showModal(`Riwayat Transaksi — ${p.name}`, renderPartnerHistoryHTML(id));
}

function _refreshAllPartnerSelects() {
  fillPartnerSelect(document.getElementById('invCustomer'), 'PELANGGAN');
  fillPartnerSelect(document.getElementById('pchSupplier'), 'PEMASOK');
}

/* ══════════════════════════════════════════════════════════════════
   MASTER PRODUK & JASA
   ══════════════════════════════════════════════════════════════════ */

function refreshProductTable() {
  renderProductTable({ search: document.getElementById('productSearch')?.value || '' });
}

function handleToggleProductForm() {
  const panel = document.getElementById('productFormPanel');
  if (!panel) return;
  const willShow = panel.style.display === 'none';
  panel.style.display = willShow ? 'block' : 'none';
  if (willShow) _clearProductForm();
}

function _clearProductForm() {
  document.getElementById('prfEditId').value = '';
  document.getElementById('prfName').value = '';
  document.getElementById('prfUnit').value = 'Unit';
  document.getElementById('prfPrice').value = '0';
  document.getElementById('prfActive').value = 'true';
}

function handleEditProduct(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;
  document.getElementById('productFormPanel').style.display = 'block';
  document.getElementById('prfEditId').value = p.id;
  document.getElementById('prfName').value = p.name;
  document.getElementById('prfUnit').value = p.unit;
  document.getElementById('prfPrice').value = p.price;
  document.getElementById('prfActive').value = String(!!p.active);
}

function handleSaveProduct() {
  const editId = document.getElementById('prfEditId').value;
  const name = document.getElementById('prfName').value.trim();
  if (!name) {
    showModal('Data Belum Lengkap', renderErrorListHTML(['Nama produk/jasa wajib diisi.']));
    return;
  }
  const data = {
    name,
    unit: document.getElementById('prfUnit').value.trim() || 'Unit',
    price: parseAmount(document.getElementById('prfPrice').value),
    active: document.getElementById('prfActive').value === 'true'
  };
  if (editId) {
    updateProduct(editId, data);
    showToast('✅ Produk/jasa diperbarui.');
  } else {
    const id = nextProductId();
    addProduct({ id, code: id, ...data, createdAt: new Date().toISOString() });
    showToast('✅ Produk/jasa ditambahkan.');
  }
  document.getElementById('productFormPanel').style.display = 'none';
  refreshProductTable();
  _refreshAllProductSelectsInInvoice();
}

function handleDeleteProduct(id) {
  if (!confirm('Hapus produk/jasa ini dari master data?')) return;
  deleteProduct(id);
  refreshProductTable();
}

function _refreshAllProductSelectsInInvoice() {
  document.querySelectorAll('#invoiceItemsBody select.item-product-select').forEach(sel => {
    const current = sel.value;
    fillProductSelectOptions(sel);
    sel.value = current;
  });
}

/* ══════════════════════════════════════════════════════════════════
   MODE OPERASIONAL / LATIHAN
   ══════════════════════════════════════════════════════════════════ */

function handleSetTaxMode(mode) {
  setMode(mode);
  document.getElementById('btnModeOperasional').classList.toggle('active', mode === TAX_MODE.OPERASIONAL);
  document.getElementById('btnModeOperasional').classList.toggle('btn-secondary', mode !== TAX_MODE.OPERASIONAL);
  document.getElementById('btnModeLatihan').classList.toggle('active', mode === TAX_MODE.LATIHAN);
  document.getElementById('btnModeLatihan').classList.toggle('btn-secondary', mode !== TAX_MODE.LATIHAN);
  const panel = document.getElementById('latihanPanel');
  if (panel) panel.style.display = mode === TAX_MODE.LATIHAN ? 'block' : 'none';

  if (mode === TAX_MODE.LATIHAN) {
    const sel = document.getElementById('latihanCaseSelect');
    const caseId = sel?.value || TAX_CASE_STUDIES[0]?.id;
    if (caseId) {
      setLatihanCase(caseId);
      renderLatihanNarrative(getCaseStudyById(caseId));
    }
  }
}

function handleLatihanCaseChange() {
  const sel = document.getElementById('latihanCaseSelect');
  const caseId = sel.value;
  setLatihanCase(caseId);
  renderLatihanNarrative(getCaseStudyById(caseId));
  const resultArea = document.getElementById('latihanResultArea');
  if (resultArea) resultArea.innerHTML = '';
}

/* ══════════════════════════════════════════════════════════════════
   BUAT INVOICE
   ══════════════════════════════════════════════════════════════════ */

let _invoiceItemSeq = 0;

function addInvoiceItemRow() {
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

function recalcInvoiceTotals() {
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

function handleInvoiceCustomerChange() {
  const sel = document.getElementById('invCustomer');
  const customer = getPartners().find(p => p.id === sel.value);
  document.getElementById('invCustomerStatus').value = customer ? (customer.taxStatus === TAX_STATUS.PKP ? 'PKP' : 'Non-PKP') : '';
  document.getElementById('invCustomerNpwp').value = customer?.npwp || '';
  document.getElementById('invCustomerAddress').value = customer?.address || '';
}

function handleResetInvoiceForm(opts = {}) {
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

function handleSaveInvoiceDraft() {
  const result = _saveInvoice('DRAFT');
  if (!result) return;
  showToast(`📝 Invoice ${result.invoice.invoiceNumber} disimpan sebagai draft.`);
  renderInvoiceListTable();
  renderDashboardKPIs();
  handleResetInvoiceForm({ silent: true });
}

function handlePublishInvoice() {
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

/* ══════════════════════════════════════════════════════════════════
   DAFTAR INVOICE / VIEWER
   ══════════════════════════════════════════════════════════════════ */

function _invoiceListFilters() {
  return {
    search: document.getElementById('invListSearch')?.value || '',
    from: document.getElementById('invListFrom')?.value || '',
    to: document.getElementById('invListTo')?.value || '',
    status: document.getElementById('invListStatus')?.value || 'ALL'
  };
}

function refreshInvoiceListTable() {
  renderInvoiceListTable(_invoiceListFilters());
}

function handleViewInvoice(id) {
  const inv = getInvoices().find(i => i.id === id);
  if (!inv) return;
  _currentInvoiceViewId = id;
  document.getElementById('invoicePrintArea').innerHTML = renderInvoicePrintHTML(inv);
  document.getElementById('invoiceViewModal').classList.add('active');
}

function handleCloseInvoiceModal() {
  document.getElementById('invoiceViewModal').classList.remove('active');
  _currentInvoiceViewId = null;
}

function _resolvePaperSize() {
  var sel = document.getElementById('laporanPaperSize');
  var v = sel ? sel.value : 'a4';
  // Satu sumber kebenaran ukuran kertas: js/shared/paper-config.js
  if (window.PaperConfig) {
    var p = window.PaperConfig.getPaper(v);
    return { jsPDF: [p.widthMm, p.heightMm], css: p.cssSize, label: p.label };
  }
  if (v === 'f4') return { jsPDF: [210, 330], css: '210mm 330mm', label: 'F4' };
  return { jsPDF: 'a4', css: 'A4', label: 'A4' };
}

function handlePrintInvoice() {
  // Use isolated iframe print — reliable regardless of @media print chrome hiding
  var source = document.getElementById('invoicePrintArea');
  if (!source || !source.innerHTML.trim()) {
    showToast('❌ Belum ada invoice untuk dicetak. Buka invoice terlebih dahulu.');
    return;
  }
  if (window.PDFExport && window.PDFExport.printElement) {
    var paper = _resolvePaperSize();
    window.PDFExport.printElement(source, {
      title: 'Invoice — ActMaster Pro',
      extraCss: '@page{size:' + paper.css + ';margin:10mm 12mm;} body{font-size:12px;color:#0f172a;background:#fff;} table{width:100%;border-collapse:collapse;font-size:11px;} th{background:#0f172a;color:#fff;padding:7px 10px;border:1px solid #0f172a;text-align:left;} td{padding:6px 10px;border:1px solid #e2e8f0;}'
    });
    return;
  }
  // Fallback: native print with @media print doing the targeting
  window.print();
}

function handlePrintReport() {
  var source = document.getElementById('financialReportContainer');
  if (!source || !source.innerHTML.trim()) {
    showToast('❌ Belum ada laporan untuk dicetak. Buat transaksi dan coba lagi.');
    return;
  }
  if (window.PDFExport && window.PDFExport.printElement) {
    var paper = _resolvePaperSize();
    window.PDFExport.printElement(source, {
      title: 'Laporan Keuangan — ActMaster Pro',
      extraCss: '@page{size:' + paper.css + ';margin:10mm 12mm;} body{font-size:12px;color:#0f172a;background:#fff;} h2{font-size:16px;font-weight:800;color:#0f172a;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:12px;} table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0 14px;} th{background:#0f172a;color:#fff;padding:7px 10px;text-align:left;font-weight:700;border:1px solid #0f172a;} td{padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;}'
    });
    return;
  }
  window.print();
}

function handlePrintInvoicePDF() {
  var source = document.getElementById('invoicePrintArea');
  if (!source) {
    showToast('❌ Area invoice tidak ditemukan.');
    return;
  }
  if (!window.PDFExport) {
    showToast('❌ Mesin PDF tidak tersedia. Coba muat ulang halaman.');
    return;
  }
  const inv = getInvoices().find(i => i.id === _currentInvoiceViewId);
  const filename = `${inv ? inv.invoiceNumber : 'Invoice'}.pdf`;

  showToast('⏳ Membuat PDF invoice…');

  var paper = _resolvePaperSize();
  window.PDFExport.exportElementToPDF(source, {
    filename,
    scale: 2,
    widthPx: paper.jsPDF === 'a4' ? 794 : 794,
    margin: [12, 14, 14, 14],
    format: paper.jsPDF,
    extraCss: [
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}',
      'body{margin:0;padding:0;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:12px;color:#0f172a;background:#fff;}',
      'h1,h2,h3,h4{font-weight:800;color:#0f172a;}',
      'table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0 14px;}',
      'th{background:#0f172a;color:#fff;padding:7px 10px;text-align:left;font-weight:700;border:1px solid #0f172a;}',
      'td{padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;}'
    ].join(''),
    onClone: (clone) => {
      clone.querySelectorAll('table').forEach((t) => {
        t.style.width = '100%';
        t.style.borderCollapse = 'collapse';
        t.style.fontSize = '9pt';
        t.style.tableLayout = 'fixed';
      });
      clone.querySelectorAll('th, td').forEach((c) => {
        c.style.padding = '6px 7px';
        c.style.border = '1px solid #cbd5e1';
        c.style.wordBreak = 'break-word';
      });
      clone.querySelectorAll('th').forEach((c) => {
        c.style.background = '#1e3a5f';
        c.style.color = '#fff';
        c.style.fontWeight = '700';
      });
    },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.invoice-totals'] }
  }).then(() => {
    showToast(`✅ PDF invoice ${inv ? inv.invoiceNumber : ''} berhasil diunduh.`);
  }).catch((err) => {
    console.error('[handlePrintInvoicePDF]', err);
    showToast(`❌ ${err.message || 'Gagal membuat PDF invoice.'}`);
  });
}

function handleDuplicateInvoice() {
  const inv = getInvoices().find(i => i.id === _currentInvoiceViewId);
  if (!inv) return;
  handleCloseInvoiceModal();

  document.querySelector('.sidebar-menu a[data-page="buat-invoice"]')?.click();
  handleResetInvoiceForm({ silent: true });
  document.getElementById('invDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('invCustomer').value = inv.customer.id;
  handleInvoiceCustomerChange();
  document.getElementById('invPaymentMethod').value = inv.paymentMethod;
  document.getElementById('invVatTreatment').value = inv.taxTreatment;
  document.getElementById('invNotes').value = inv.notes || '';

  document.getElementById('invoiceItemsBody').innerHTML = '';
  inv.items.forEach(it => {
    addInvoiceItemRow();
    const row = document.getElementById('invoiceItemsBody').lastElementChild;
    row.querySelector('.item-name').value = it.name;
    row.querySelector('.item-qty').value = it.quantity;
    row.querySelector('.item-unit').value = it.unit;
    row.querySelector('.item-price').value = it.unitPrice;
  });
  recalcInvoiceTotals();
  showToast('📑 Data invoice diduplikasi ke formulir Buat Invoice — silakan tinjau lalu terbitkan.');
}

function handleCancelInvoice() {
  const inv = getInvoices().find(i => i.id === _currentInvoiceViewId);
  if (!inv) return;
  if (!confirm(`Batalkan invoice ${inv.invoiceNumber}? Jurnal terkait akan ditandai dibatalkan dan tidak lagi dihitung dalam laporan.`)) return;
  updateInvoice(inv.id, { paymentStatus: 'DIBATALKAN' });
  cancelInvoiceJournal(inv.id);
  handleCloseInvoiceModal();
  refreshInvoiceListTable();
  renderDashboardKPIs();
  renderPajakKeluaranPage();
  renderJournalTransaksiPage();
  showToast(`🚫 Invoice ${inv.invoiceNumber} dibatalkan.`);
}

/* ══════════════════════════════════════════════════════════════════
   INPUT PEMBELIAN & PAJAK MASUKAN
   ══════════════════════════════════════════════════════════════════ */

function handlePurchaseSupplierChange() {
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

function _recalcPurchaseVat() {
  const dpp = parseAmount(document.getElementById('pchDpp').value);
  const rate = parseAmount(document.getElementById('pchVatRate').value);
  document.getElementById('pchVatAmount').value = Math.round(dpp * (rate / 100));
}

function handleSavePurchase() {
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

function handleCancelPurchase(id) {
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
