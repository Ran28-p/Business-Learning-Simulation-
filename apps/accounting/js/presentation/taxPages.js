/**
 * Presentation Layer – Tax / Invoicing module page rendering.
 * Pure DOM rendering functions; state mutation happens in taxUI.js.
 */
import {
  getCompany, getVatRates, getPartners, getProducts, getInvoices, getPurchases,
  getJournalEntries, getMode
} from '../tax/taxState.js';
import { getActiveVatRatePercent } from '../tax/vatEngine.js';
import { buildTaxLedgers, summarizePajakKeluaran, summarizePajakMasukan, computeRekonsiliasi } from '../tax/journalEngine.js';
import { TAX_STATUS, VAT_TREATMENT_LABEL, PAYMENT_STATUS_LABEL, CREDIT_STATUS_LABEL, TAX_MODE, EDUCATIONAL_NOTE_COMPANY_NONPKP, EDUCATIONAL_NOTE_NONPKP_BUYER, EDUCATIONAL_NOTE_CREDIT } from '../tax/taxConstants.js';
import { TAX_CASE_STUDIES } from '../../data/taxCaseStudies.js';
import { formatRupiah } from '../utils/formatters.js';

/* ─── Small shared helpers ─── */

export function taxBadge(status) {
  return status === TAX_STATUS.PKP
    ? '<span class="badge-pill badge-pkp">PKP</span>'
    : '<span class="badge-pill badge-nonpkp">NON-PKP</span>';
}

function paymentStatusBadge(status) {
  const cls = {
    LUNAS: 'badge-status-lunas',
    BELUM_DIBAYAR: 'badge-status-belum',
    DIBAYAR_SEBAGIAN: 'badge-status-sebagian',
    DRAFT: 'badge-status-draft',
    DIBATALKAN: 'badge-status-batal'
  }[status] || 'badge-status-draft';
  return `<span class="badge-pill ${cls}">${PAYMENT_STATUS_LABEL[status] || status}</span>`;
}

function creditStatusBadge(status) {
  const cls = {
    DAPAT_DIKREDITKAN: 'badge-credit-yes',
    TIDAK_DAPAT_DIKREDITKAN: 'badge-credit-no',
    BELUM_DIVERIFIKASI: 'badge-credit-pending'
  }[status] || 'badge-credit-pending';
  return `<span class="badge-pill ${cls}">${CREDIT_STATUS_LABEL[status] || status}</span>`;
}

/* ─── Dashboard KPIs ─── */

export function renderDashboardKPIs() {
  const invoices = getInvoices().filter(i => i.paymentStatus !== 'DIBATALKAN');
  const purchases = getPurchases().filter(p => !p.cancelled);
  const company = getCompany();

  const totalPenjualan = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPembelian = purchases.reduce((s, p) => s + p.dpp + (p.vatAmount || 0), 0);
  const totalPiutang = invoices
    .filter(i => i.paymentMethod === 'KREDIT' && i.paymentStatus !== 'LUNAS')
    .reduce((s, i) => s + i.grandTotal, 0);
  const totalUtang = purchases
    .filter(p => p.paymentMethod === 'KREDIT')
    .reduce((s, p) => s + p.dpp + (p.vatAmount || 0), 0);
  const pajakKeluaran = invoices.reduce((s, i) => s + i.vatTotal, 0);
  const pajakMasukan = purchases
    .filter(p => p.creditStatus === 'DAPAT_DIKREDITKAN')
    .reduce((s, p) => s + (p.vatAmount || 0), 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set('kpiTotalPenjualan', formatRupiah(totalPenjualan));
  set('kpiTotalPembelian', formatRupiah(totalPembelian));
  set('kpiPiutang', formatRupiah(totalPiutang));
  set('kpiUtang', formatRupiah(totalUtang));
  set('kpiPajakKeluaran', formatRupiah(pajakKeluaran));
  set('kpiPajakMasukan', formatRupiah(pajakMasukan));
  set('kpiPpnNeto', formatRupiah(pajakKeluaran - pajakMasukan));
  set('kpiJumlahInvoice', String(invoices.length));

  const statusEl = document.getElementById('kpiCompanyStatus');
  if (statusEl) {
    statusEl.innerHTML = company.name
      ? `${company.name} — ${taxBadge(company.taxStatus)}`
      : '<span style="color:var(--text-light);">Profil perusahaan belum diatur</span>';
  }
}

/* ─── Pengaturan Perusahaan & Pajak ─── */

export function renderCompanySettingsPage() {
  const c = getCompany();
  const map = {
    cpName: c.name, cpNpwp: c.npwp, cpAddress: c.address, cpNik: c.nik,
    cpTaxStatus: c.taxStatus, cpPkpDate: c.pkpDate, cpTaxId: c.taxId,
    cpDefaultVat: c.defaultVatRatePercent, cpVatBasis: c.vatBasis
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  });
  renderCompanyStatusNote();
  renderVatRateTable();
}

export function renderCompanyStatusNote() {
  const el = document.getElementById('companyStatusNote');
  if (!el) return;
  const c = getCompany();
  if (c.taxStatus === TAX_STATUS.NON_PKP) {
    el.className = 'alert-box alert-warning';
    el.innerText = EDUCATIONAL_NOTE_COMPANY_NONPKP;
  } else {
    el.className = 'alert-box alert-info';
    el.innerText = 'Perusahaan berstatus PKP: PPN dapat diaktifkan, penjualan dapat menghasilkan Pajak Keluaran, dan pembelian tertentu dapat menghasilkan Pajak Masukan.';
  }
}

export function renderVatRateTable() {
  const tbody = document.querySelector('#vatRateTable tbody');
  if (!tbody) return;
  const rates = [...getVatRates()].sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
  tbody.innerHTML = rates.map(r => `
    <tr data-rate-id="${r.id}">
      <td>${r.label || '-'}</td>
      <td>${r.ratePercent}%</td>
      <td>${r.basis}</td>
      <td>${r.effectiveDate}</td>
      <td>${r.status === 'AKTIF' ? '<span class="badge-pill badge-pkp">Aktif</span>' : '<span class="badge-pill badge-nonpkp">Tidak Aktif</span>'}</td>
      <td><button class="btn btn-danger btn-sm" data-action="delete-vat-rate" data-id="${r.id}">🗑️</button></td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center; color:var(--text-light);">Belum ada tarif PPN.</td></tr>';
}

/* ─── Master Pelanggan & Pemasok ─── */

export function renderPartnerTable(filters = {}) {
  const tbody = document.querySelector('#partnerTable tbody');
  if (!tbody) return;
  const search = (filters.search || '').toLowerCase();
  const type = filters.type || 'ALL';
  const tax = filters.tax || 'ALL';

  const rows = getPartners().filter(p => {
    if (type !== 'ALL' && p.type !== type && p.type !== 'KEDUANYA') return false;
    if (tax !== 'ALL' && p.taxStatus !== tax) return false;
    if (search && !(`${p.name} ${p.npwp || ''} ${p.city || ''}`.toLowerCase().includes(search))) return false;
    return true;
  });

  tbody.innerHTML = rows.map(p => `
    <tr data-id="${p.id}">
      <td>${p.type === 'KEDUANYA' ? 'Pelanggan & Pemasok' : (p.type === 'PELANGGAN' ? 'Pelanggan' : 'Pemasok')}</td>
      <td>${p.name}</td>
      <td>${taxBadge(p.taxStatus)}</td>
      <td>${p.npwp || '-'}</td>
      <td>${p.city || '-'}</td>
      <td>${p.phone || '-'}</td>
      <td>${p.active ? '<span class="badge-pill badge-pkp">Aktif</span>' : '<span class="badge-pill badge-nonpkp">Nonaktif</span>'}</td>
      <td>
        <button class="btn btn-sm" data-action="edit-partner" data-id="${p.id}">✏️</button>
        <button class="btn btn-sm btn-secondary" data-action="history-partner" data-id="${p.id}">🕘</button>
        <button class="btn btn-sm btn-danger" data-action="delete-partner" data-id="${p.id}">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center; color:var(--text-light); padding:20px;">Belum ada data pelanggan/pemasok.</td></tr>';
}

export function fillPartnerSelect(selectEl, wantedType) {
  if (!selectEl) return;
  const current = selectEl.value;
  const options = getPartners()
    .filter(p => p.active && (p.type === wantedType || p.type === 'KEDUANYA'))
    .map(p => `<option value="${p.id}">${p.name}${p.taxStatus === TAX_STATUS.PKP ? ' (PKP)' : ''}</option>`)
    .join('');
  const placeholder = wantedType === 'PELANGGAN' ? '— Pilih Pelanggan —' : '— Pilih Pemasok —';
  selectEl.innerHTML = `<option value="">${placeholder}</option>${options}`;
  if (current) selectEl.value = current;
}

/* ─── Master Produk & Jasa ─── */

export function renderProductTable(filters = {}) {
  const tbody = document.querySelector('#productTable tbody');
  if (!tbody) return;
  const search = (filters.search || '').toLowerCase();
  const rows = getProducts().filter(p => !search || `${p.code} ${p.name}`.toLowerCase().includes(search));
  tbody.innerHTML = rows.map(p => `
    <tr data-id="${p.id}">
      <td>${p.code}</td>
      <td>${p.name}</td>
      <td>${p.unit}</td>
      <td>${formatRupiah(p.price)}</td>
      <td>${p.active ? '<span class="badge-pill badge-pkp">Aktif</span>' : '<span class="badge-pill badge-nonpkp">Nonaktif</span>'}</td>
      <td>
        <button class="btn btn-sm" data-action="edit-product" data-id="${p.id}">✏️</button>
        <button class="btn btn-sm btn-danger" data-action="delete-product" data-id="${p.id}">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center; color:var(--text-light); padding:20px;">Belum ada produk/jasa.</td></tr>';
}

export function fillProductSelectOptions(selectEl) {
  if (!selectEl) return;
  const options = getProducts()
    .filter(p => p.active)
    .map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`)
    .join('');
  selectEl.innerHTML = `<option value="">— Manual —</option>${options}`;
}

/* ─── Mode Latihan ─── */

export function renderLatihanCaseSelect() {
  const sel = document.getElementById('latihanCaseSelect');
  if (!sel) return;
  sel.innerHTML = TAX_CASE_STUDIES.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
}

export function renderLatihanNarrative(caseDef) {
  const el = document.getElementById('latihanNarrative');
  if (!el || !caseDef) return;
  el.innerHTML = caseDef.narrative;
}

/* ─── Invoice VAT treatment note & options ─── */

export function applyInvoiceVatOptions() {
  const company = getCompany();
  const sel = document.getElementById('invVatTreatment');
  const note = document.getElementById('invoiceVatNote');
  if (!sel) return;

  if (company.taxStatus === TAX_STATUS.NON_PKP) {
    sel.value = 'NON_PPN';
    sel.disabled = true;
    if (note) { note.className = 'alert-box alert-warning'; note.innerText = EDUCATIONAL_NOTE_COMPANY_NONPKP; }
  } else {
    sel.disabled = false;
    if (!sel.value) sel.value = 'PPN_DIKENAKAN';
    if (note) { note.className = 'alert-box alert-info'; note.innerText = EDUCATIONAL_NOTE_NONPKP_BUYER; }
  }
}

/* ─── Daftar Invoice ─── */

export function renderInvoiceListTable(filters = {}) {
  const tbody = document.querySelector('#invoiceListTable tbody');
  if (!tbody) return;
  const search = (filters.search || '').toLowerCase();
  const status = filters.status || 'ALL';

  const rows = getInvoices()
    .slice()
    .sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1))
    .filter(inv => {
      if (status !== 'ALL' && inv.paymentStatus !== status) return false;
      if (filters.from && inv.invoiceDate < filters.from) return false;
      if (filters.to && inv.invoiceDate > filters.to) return false;
      if (search && !(`${inv.invoiceNumber} ${inv.customer.name}`.toLowerCase().includes(search))) return false;
      return true;
    });

  tbody.innerHTML = rows.map(inv => `
    <tr data-id="${inv.id}">
      <td>${inv.invoiceNumber}</td>
      <td>${inv.invoiceDate}</td>
      <td>${inv.customer.name}</td>
      <td>${taxBadge(inv.customer.taxStatus)}</td>
      <td>${formatRupiah(inv.dppTotal)}</td>
      <td>${formatRupiah(inv.vatTotal)}</td>
      <td>${formatRupiah(inv.grandTotal)}</td>
      <td>${paymentStatusBadge(inv.paymentStatus)}</td>
      <td><button class="btn btn-sm" data-action="view-invoice" data-id="${inv.id}">👁️ Lihat/Cetak</button></td>
    </tr>`).join('') || '<tr><td colspan="9" style="text-align:center; color:var(--text-light); padding:20px;">Belum ada invoice.</td></tr>';
}

/* ─── Invoice print / detail view ─── */

export function renderInvoicePrintHTML(inv) {
  const company = getCompany();
  const itemsRows = (inv.items || []).map((it, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td>${it.name || '-'}</td>
      <td style="text-align:right;">${it.quantity}</td>
      <td>${it.unit || ''}</td>
      <td style="text-align:right;">${formatRupiah(it.unitPrice)}</td>
      <td style="text-align:right;">${formatRupiah(it.discount || 0)}</td>
      <td style="text-align:right;">${formatRupiah(it.dpp)}</td>
      <td style="text-align:right;">${formatRupiah(it.vatAmount)}</td>
      <td style="text-align:right;font-weight:600;">${formatRupiah(it.total)}</td>
    </tr>`).join('');

  return `
    <div class="inv-print-root">
      <div class="inv-doc-header">
        <div>
          <div class="inv-company-name">${company.name || 'Nama Perusahaan Belum Diatur'}</div>
          <div class="inv-muted">${company.address || ''}</div>
          <div class="inv-muted">NPWP: ${company.npwp || '-'}</div>
        </div>
        <div style="text-align:right;">
          <div class="inv-title">INVOICE</div>
          <div>No: <b>${inv.invoiceNumber}</b></div>
          <div>Tanggal: ${inv.invoiceDate}</div>
          <div>Jatuh Tempo: ${inv.dueDate || '-'}</div>
        </div>
      </div>
      <div class="inv-doc-parties">
        <div>
          <h4>Ditagihkan Kepada</h4>
          <div><b>${inv.customer?.name || '-'}</b></div>
          <div class="inv-muted">${inv.customer?.address || '-'}</div>
          <div class="inv-muted">NPWP: ${inv.customer?.npwp || '-'}</div>
          <div>${taxBadge(inv.customer?.taxStatus)}</div>
        </div>
        <div>
          <h4>Ringkasan</h4>
          <div class="inv-muted">Metode: ${inv.paymentMethod || '-'}</div>
          <div class="inv-muted">Status: ${PAYMENT_STATUS_LABEL[inv.paymentStatus] || inv.paymentStatus || '-'}</div>
          <div class="inv-muted">PPN: ${VAT_TREATMENT_LABEL[inv.taxTreatment] || inv.taxTreatment || '-'}</div>
        </div>
      </div>
      <div class="inv-table-wrap">
        <table class="inv-items-table">
          <thead>
            <tr>
              <th>No</th><th>Nama Barang/Jasa</th><th>Qty</th><th>Satuan</th>
              <th>Harga</th><th>Diskon</th><th>DPP</th><th>PPN</th><th>Total</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </div>
      <div class="invoice-totals inv-totals-print">
        <div><span>Subtotal</span><b>${formatRupiah(inv.subtotal)}</b></div>
        <div><span>Diskon</span><b>${formatRupiah(inv.discountTotal)}</b></div>
        <div><span>DPP</span><b>${formatRupiah(inv.dppTotal)}</b></div>
        <div><span>PPN</span><b>${formatRupiah(inv.vatTotal)}</b></div>
        <div class="grand"><span>TOTAL TAGIHAN</span><b>${formatRupiah(inv.grandTotal)}</b></div>
      </div>
      <div style="margin-top:16px;font-size:0.85rem;color:#475569;">
        <div><b>Catatan:</b> ${inv.notes || '-'}</div>
      </div>
    </div>
  `;
}

/* ─── Input Pembelian & Pajak Masukan ─── */

export function renderPurchaseTable() {
  const tbody = document.querySelector('#purchaseTable tbody');
  if (!tbody) return;
  const rows = getPurchases().slice().sort((a, b) => (a.documentDate < b.documentDate ? 1 : -1));
  tbody.innerHTML = rows.map(p => `
    <tr data-id="${p.id}" style="${p.cancelled ? 'opacity:0.5;' : ''}">
      <td>${p.documentDate}</td>
      <td>${p.supplier.name}</td>
      <td>${taxBadge(p.supplier.taxStatus)}</td>
      <td>${p.documentNumber}</td>
      <td>${formatRupiah(p.dpp)}</td>
      <td>${formatRupiah(p.vatAmount)}</td>
      <td>${creditStatusBadge(p.creditStatus)}</td>
      <td>${p.notes || '-'}</td>
      <td>${p.cancelled
        ? '<span class="badge-pill badge-status-batal">Dibatalkan</span>'
        : `<button class="btn btn-sm btn-danger" data-action="cancel-purchase" data-id="${p.id}">🚫 Batalkan</button>`}</td>
    </tr>`).join('') || '<tr><td colspan="9" style="text-align:center; color:var(--text-light); padding:20px;">Belum ada data pembelian.</td></tr>';
}

/* ─── Pajak Keluaran ─── */

export function renderPajakKeluaranPage(filters = {}) {
  const summary = summarizePajakKeluaran(getInvoices(), filters.from, filters.to);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set('pkTotalDpp', formatRupiah(summary.totalDpp));
  set('pkTotalPpn', formatRupiah(summary.totalPpn));
  set('pkJumlahInvoice', String(summary.count));
  set('pkBelumBayar', String(summary.belumBayar));
  set('pkLunas', String(summary.lunas));

  const tbody = document.querySelector('#pajakKeluaranTable tbody');
  if (!tbody) return;
  tbody.innerHTML = summary.invoices.filter(i => i.vatTotal > 0).map(inv => {
    const rate = inv.dppTotal > 0 ? Math.round((inv.vatTotal / inv.dppTotal) * 1000) / 10 : 0;
    return `
    <tr>
      <td>${inv.invoiceDate}</td>
      <td>${inv.invoiceNumber}</td>
      <td>${inv.customer.name}</td>
      <td>${taxBadge(inv.customer.taxStatus)}</td>
      <td>${formatRupiah(inv.dppTotal)}</td>
      <td>${rate}%</td>
      <td>${formatRupiah(inv.vatTotal)}</td>
      <td>${paymentStatusBadge(inv.paymentStatus)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center; color:var(--text-light); padding:20px;">Belum ada Pajak Keluaran pada periode ini.</td></tr>';
}

/* ─── Rekonsiliasi PPN ─── */

export function renderRekonsiliasiPage(filters = {}) {
  const result = computeRekonsiliasi(getInvoices(), getPurchases(), filters.from, filters.to);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set('rekKeluaran', formatRupiah(result.keluaran.totalPpn));
  set('rekMasukanKredit', formatRupiah(result.masukan.totalDapatDikreditkan));
  set('rekMasukanTidak', formatRupiah(result.masukan.totalTidakDapatDikreditkan));
  set('rekNeto', formatRupiah(Math.abs(result.neto)));

  const banner = document.getElementById('rekStatusBanner');
  if (!banner) return;
  const map = {
    KURANG_BAYAR: { cls: 'kurang-bayar', label: 'PPN KURANG BAYAR' },
    LEBIH_BAYAR: { cls: 'lebih-bayar', label: 'PPN LEBIH BAYAR' },
    NIHIL: { cls: 'nihil', label: 'PPN NIHIL' }
  }[result.status];
  banner.className = `rek-banner ${map.cls}`;
  banner.innerHTML = `<div style="font-size:0.85rem; opacity:0.8;">STATUS</div><div style="font-size:1.6rem;">${map.label}</div><div style="font-size:1.1rem; margin-top:6px;">${formatRupiah(Math.abs(result.neto))}</div>`;
}

/* ─── Jurnal & Buku Besar Transaksi ─── */

export function renderJournalTransaksiPage() {
  const tbody = document.querySelector('#journalTransaksiTable tbody');
  if (tbody) {
    const rows = [];
    getJournalEntries().slice().sort((a, b) => (a.date < b.date ? 1 : -1)).forEach(entry => {
      entry.lines.forEach((line, idx) => {
        rows.push(`
          <tr style="${entry.cancelled ? 'opacity:0.5;' : ''}">
            <td>${idx === 0 ? entry.date : ''}</td>
            <td>${idx === 0 ? entry.ref : ''}</td>
            <td>${idx === 0 ? entry.description : ''}</td>
            <td>${line.account}</td>
            <td>${line.debit ? formatRupiah(line.debit) : ''}</td>
            <td>${line.credit ? formatRupiah(line.credit) : ''}</td>
            <td>${idx === 0 ? (entry.cancelled ? '<span class="badge-pill badge-status-batal">Dibatalkan</span>' : '<span class="badge-pill badge-status-lunas">Aktif</span>') : ''}</td>
          </tr>`);
      });
    });
    tbody.innerHTML = rows.join('') || '<tr><td colspan="7" style="text-align:center; color:var(--text-light); padding:20px;">Belum ada jurnal transaksi.</td></tr>';
  }

  const ledgerContainer = document.getElementById('ledgerTransaksiContainer');
  if (ledgerContainer) {
    const ledgers = buildTaxLedgers();
    ledgerContainer.innerHTML = ledgers.map(acc => `
      <div class="t-account">
        <div class="t-account-header">${acc.account} <span style="font-weight:400; color:var(--text-light);">(Saldo: ${formatRupiah(Math.abs(acc.balance))} ${acc.balance >= 0 ? 'D' : 'K'})</span></div>
        <div class="t-account-body">
          <div class="t-account-side">
            <strong>Debit</strong>
            ${acc.debits.map(d => `<div style="display:flex; justify-content:space-between; font-size:0.82rem; padding:3px 0;"><span>${d.ref}</span><span>${formatRupiah(d.amount)}</span></div>`).join('') || '<div style="color:var(--text-light); font-size:0.8rem;">-</div>'}
          </div>
          <div class="t-account-side">
            <strong>Kredit</strong>
            ${acc.credits.map(d => `<div style="display:flex; justify-content:space-between; font-size:0.82rem; padding:3px 0;"><span>${d.ref}</span><span>${formatRupiah(d.amount)}</span></div>`).join('') || '<div style="color:var(--text-light); font-size:0.8rem;">-</div>'}
          </div>
        </div>
      </div>`).join('') || '<p style="color:var(--text-light);">Belum ada buku besar transaksi.</p>';
  }
}

/* ─── Partner transaction history ─── */

export function renderPartnerHistoryHTML(partnerId) {
  const invoices = getInvoices().filter(i => i.customer.id === partnerId);
  const purchases = getPurchases().filter(p => p.supplier.id === partnerId);
  let html = '';
  if (invoices.length) {
    html += '<h4 style="margin-bottom:8px;">Riwayat Invoice (Penjualan)</h4><ul style="list-style:none; padding:0; margin-bottom:16px;">';
    invoices.forEach(i => {
      html += `<li style="padding:6px 0; border-bottom:1px dashed var(--border-color); display:flex; justify-content:space-between;"><span>${i.invoiceNumber} — ${i.invoiceDate}</span><b>${formatRupiah(i.grandTotal)}</b></li>`;
    });
    html += '</ul>';
  }
  if (purchases.length) {
    html += '<h4 style="margin-bottom:8px;">Riwayat Pembelian</h4><ul style="list-style:none; padding:0;">';
    purchases.forEach(p => {
      html += `<li style="padding:6px 0; border-bottom:1px dashed var(--border-color); display:flex; justify-content:space-between;"><span>${p.documentNumber} — ${p.documentDate}</span><b>${formatRupiah(p.dpp + (p.vatAmount || 0))}</b></li>`;
    });
    html += '</ul>';
  }
  if (!invoices.length && !purchases.length) {
    html = '<p style="color:var(--text-light);">Belum ada transaksi untuk pelanggan/pemasok ini.</p>';
  }
  return html;
}
