/**
 * taxUI/invoice-list.js — daftar faktur, detail, cetak/PDF, tautan faktur pajak, duplikat, batalkan
 * (dipecah dari ../taxUI.js; perilaku identik)
 */
import { renderInvoiceListTable, renderInvoicePrintHTML, renderDashboardKPIs, renderPajakKeluaranPage, renderJournalTransaksiPage } from '../taxPages.js';
import { getInvoices, getCompany, updateInvoice } from '../../tax/taxState.js';
import { showToast } from '../modals.js';
import { cancelInvoiceJournal } from '../../tax/journalEngine.js';
import { handleResetInvoiceForm, handleInvoiceCustomerChange, addInvoiceItemRow, recalcInvoiceTotals } from './invoice-form.js';

let _currentInvoiceViewId = null;

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

export function refreshInvoiceListTable() {
  renderInvoiceListTable(_invoiceListFilters());
}

export function handleViewInvoice(id) {
  const inv = getInvoices().find(i => i.id === id);
  if (!inv) return;
  _currentInvoiceViewId = id;
  document.getElementById('invoicePrintArea').innerHTML = renderInvoicePrintHTML(inv);
  document.getElementById('invoiceViewModal').classList.add('active');
}

export function handleCloseInvoiceModal() {
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

export function handlePrintInvoice() {
  // Use isolated iframe print — reliable regardless of @media print chrome hiding
  var source = document.getElementById('invoicePrintArea');
  if (!source || !source.innerHTML.trim()) {
    showToast('❌ Belum ada invoice untuk dicetak. Buka invoice terlebih dahulu.');
    return;
  }
  if (window.PDFExport && window.PDFExport.printElement) {
    var paper = _resolvePaperSize();
    window.PDFExport.printElement(source, {
      title: 'Invoice — Accounting',
      extraCss: '@page{size:' + paper.css + ';margin:10mm 12mm;} body{font-size:12px;color:#0f172a;background:#fff;} table{width:100%;border-collapse:collapse;font-size:11px;} th{background:#0f172a;color:#fff;padding:7px 10px;border:1px solid #0f172a;text-align:left;} td{padding:6px 10px;border:1px solid #e2e8f0;}'
    });
    return;
  }
  // Fallback: native print with @media print doing the targeting
  window.print();
}

export function handlePrintReport() {
  var source = document.getElementById('financialReportContainer');
  if (!source || !source.innerHTML.trim()) {
    showToast('❌ Belum ada laporan untuk dicetak. Buat transaksi dan coba lagi.');
    return;
  }
  if (window.PDFExport && window.PDFExport.printElement) {
    var paper = _resolvePaperSize();
    window.PDFExport.printElement(source, {
      title: 'Laporan Keuangan — Accounting',
      extraCss: '@page{size:' + paper.css + ';margin:10mm 12mm;} body{font-size:12px;color:#0f172a;background:#fff;} h2{font-size:16px;font-weight:800;color:#0f172a;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:12px;} table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0 14px;} th{background:#0f172a;color:#fff;padding:7px 10px;text-align:left;font-weight:700;border:1px solid #0f172a;} td{padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;}'
    });
    return;
  }
  window.print();
}

export function handlePrintInvoicePDF() {
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

export function handleCreateFakturPajakLink() {
  const inv = getInvoices().find(i => i.id === _currentInvoiceViewId);
  if (!inv) return;
  const company = getCompany();

  // Membuka modul Faktur Pajak di SIM-SPT (apps/spt/faktur_bupot) di tab baru
  // dengan data invoice ini sudah terisi lewat query string — lihat
  // applyPrefillFromURL() di apps/spt/faktur_bupot/script.js untuk sisi baca-nya.
  // Rincian per-baris barang/jasa TIDAK dikirim (bisa berbeda struktur/panjang
  // query string) — dikirim sebagai satu baris ringkasan senilai total DPP
  // invoice, cukup untuk mendemonstrasikan dokumennya; item detail tetap bisa
  // diedit manual di modul faktur kalau perlu.
  const params = new URLSearchParams({
    seller_name: company.name || '',
    seller_npwp: company.npwp || '',
    buyer_name: inv.customer?.name || '',
    buyer_npwp: inv.customer?.npwp || '',
    date: inv.invoiceDate || '',
    dpp: String(inv.dppTotal || 0),
    ref: inv.invoiceNumber || ''
  });
  window.open(`../spt/faktur_bupot/index.html?${params.toString()}`, '_blank');
}

export function handleDuplicateInvoice() {
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

export function handleCancelInvoice() {
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
