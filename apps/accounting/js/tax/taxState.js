/**
 * Tax / Invoicing Module – Central State
 * Mirrors the pattern used by business/appState.js: a single in-memory
 * object, accessed only through the getters/mutators exported here, and
 * persisted to its own localStorage key so it never touches the
 * case-exercise engine's state.
 */
import { saveTaxState, loadTaxState } from '../storage/localStorage.js';
import { showToast } from '../presentation/modals.js';
import { TAX_STATUS, TAX_MODE, DEFAULT_VAT_RATE_PERCENT } from './taxConstants.js';

function defaultState() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    mode: TAX_MODE.OPERASIONAL,
    company: {
      name: '',
      address: '',
      npwp: '',
      nik: '',
      taxStatus: TAX_STATUS.NON_PKP,
      pkpDate: '',
      taxId: '',
      defaultVatRatePercent: DEFAULT_VAT_RATE_PERCENT,
      vatBasis: 'Tarif efektif'
    },
    vatRates: [
      { id: 'rate-default', ratePercent: DEFAULT_VAT_RATE_PERCENT, basis: 'Tarif efektif', effectiveDate: today, status: 'AKTIF', label: 'Tarif Standar' }
    ],
    partners: [],
    products: [],
    invoices: [],
    purchases: [],
    journalEntries: [],
    counters: { invoiceSeq: {}, partnerSeq: 0, productSeq: 0, purchaseSeq: 0 },
    latihan: { currentCaseId: null, lastResult: null }
  };
}

const state = defaultState();

/* ─── Persistence ─── */

export function hydrateTaxState() {
  const saved = loadTaxState();
  if (saved) {
    Object.assign(state, defaultState(), saved);
    state.company = { ...defaultState().company, ...(saved.company || {}) };
    state.counters = { ...defaultState().counters, ...(saved.counters || {}) };
    state.latihan = { ...defaultState().latihan, ...(saved.latihan || {}) };
    if (!Array.isArray(state.vatRates) || state.vatRates.length === 0) {
      state.vatRates = defaultState().vatRates;
    }
    if (!Array.isArray(state.partners)) state.partners = [];
    if (!Array.isArray(state.products)) state.products = [];
    if (!Array.isArray(state.invoices)) state.invoices = [];
    if (!Array.isArray(state.purchases)) state.purchases = [];
  }
  // Selalu pastikan ada data minimal agar modul invoice bisa dipakai
  ensureDemoData({ persist: !saved });
}

/**
 * Pastikan ada perusahaan + minimal 1 pelanggan & 1 produk.
 * Dipanggil saat hydrate dan saat buka halaman invoice.
 * @param {{persist?: boolean, forceCompanyPkp?: boolean}} opts
 */
export function ensureDemoData(opts = {}) {
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;

  // Perusahaan kosong → isi demo PKP
  if (!state.company?.name) {
    state.company = {
      name: 'PT Contoh Maju Bersama',
      address: 'Jl. Merdeka No. 10, Jakarta Pusat 10110',
      npwp: '01.234.567.8-901.000',
      nik: '',
      taxStatus: TAX_STATUS.PKP,
      pkpDate: today,
      taxId: 'NPPKP-DEMO-001',
      defaultVatRatePercent: DEFAULT_VAT_RATE_PERCENT,
      vatBasis: 'Tarif efektif'
    };
    changed = true;
  }
  if (opts.forceCompanyPkp && state.company.taxStatus !== TAX_STATUS.PKP) {
    state.company.taxStatus = TAX_STATUS.PKP;
    if (!state.company.pkpDate) state.company.pkpDate = today;
    changed = true;
  }

  if (!Array.isArray(state.partners)) { state.partners = []; changed = true; }
  if (!Array.isArray(state.products)) { state.products = []; changed = true; }

  const hasPelanggan = state.partners.some(p => p.active !== false && (p.type === 'PELANGGAN' || p.type === 'KEDUANYA'));
  if (!hasPelanggan) {
    state.partners.push({
      id: 'PTR-DEMO-1',
      type: 'PELANGGAN',
      name: 'CV Pelanggan Sejahtera',
      taxStatus: TAX_STATUS.PKP,
      npwp: '02.345.678.9-012.000',
      nik: '',
      city: 'Bandung',
      address: 'Jl. Asia Afrika No. 5, Bandung',
      phone: '022-1234567',
      email: 'order@pelanggansejahtera.id',
      active: true,
      notes: 'Data demo otomatis',
      createdAt: new Date().toISOString()
    });
    changed = true;
  }

  const hasPemasok = state.partners.some(p => p.active !== false && (p.type === 'PEMASOK' || p.type === 'KEDUANYA'));
  if (!hasPemasok) {
    state.partners.push({
      id: 'PTR-DEMO-2',
      type: 'PEMASOK',
      name: 'PT Pemasok Andalan',
      taxStatus: TAX_STATUS.PKP,
      npwp: '03.456.789.0-123.000',
      nik: '',
      city: 'Surabaya',
      address: 'Jl. Basuki Rahmat No. 8, Surabaya',
      phone: '031-7654321',
      email: 'sales@pemasokandalan.id',
      active: true,
      notes: 'Data demo otomatis',
      createdAt: new Date().toISOString()
    });
    changed = true;
  }

  const hasProduct = state.products.some(p => p.active !== false);
  if (!hasProduct) {
    state.products.push(
      {
        id: 'PRD-DEMO-1',
        name: 'Jasa Konsultasi Pajak',
        unit: 'Jam',
        price: 500000,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'PRD-DEMO-2',
        name: 'Paket Software Accounting',
        unit: 'Unit',
        price: 2500000,
        active: true,
        createdAt: new Date().toISOString()
      }
    );
    changed = true;
  }

  if (!Array.isArray(state.vatRates) || state.vatRates.length === 0) {
    state.vatRates = defaultState().vatRates;
    changed = true;
  }

  if (changed && opts.persist !== false) {
    persistTaxState();
  }
  return changed;
}

let _taxSaveFailWarned = false; // biar peringatan cuma sekali per sesi, tidak spam toast di tiap aksi

export function persistTaxState() {
  const ok = saveTaxState(state);
  // Data safety (bagian 30): dipanggil dari 23+ tempat setiap invoice/transaksi/
  // partner ditambah — sebelumnya kalau localStorage penuh/mode privat, semua
  // data pajak/invoice yang baru diinput bisa hilang tanpa peringatan sama sekali.
  if (!ok && !_taxSaveFailWarned) {
    _taxSaveFailWarned = true;
    showToast('⚠️ Penyimpanan otomatis modul Pajak/Invoice gagal (penyimpanan browser penuh atau mode privat). Data terbaru mungkin tidak tersimpan.');
  }
  return ok;
}

/* ─── Getters ─── */

export function getTaxState() {
  return state;
}

export function getMode() {
  return state.mode;
}

export function getCompany() {
  return state.company;
}

export function getVatRates() {
  return state.vatRates;
}

export function getPartners() {
  return state.partners;
}

export function getProducts() {
  return state.products;
}

export function getInvoices() {
  return state.invoices;
}

export function getPurchases() {
  return state.purchases;
}

export function getJournalEntries() {
  return state.journalEntries;
}

export function getLatihanState() {
  return state.latihan;
}

/* ─── Mutators ─── */

export function setMode(mode) {
  state.mode = mode;
  persistTaxState();
}

export function updateCompany(patch) {
  state.company = { ...state.company, ...patch };
  persistTaxState();
}

export function addVatRate(rate) {
  state.vatRates.push(rate);
  persistTaxState();
}

export function updateVatRate(id, patch) {
  const r = state.vatRates.find(v => v.id === id);
  if (r) Object.assign(r, patch);
  persistTaxState();
}

export function deleteVatRate(id) {
  state.vatRates = state.vatRates.filter(v => v.id !== id);
  persistTaxState();
}

export function nextPartnerId() {
  state.counters.partnerSeq = (state.counters.partnerSeq || 0) + 1;
  return `PTR-${String(state.counters.partnerSeq).padStart(3, '0')}`;
}

export function addPartner(partner) {
  state.partners.push(partner);
  persistTaxState();
}

export function updatePartner(id, patch) {
  const p = state.partners.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  persistTaxState();
}

export function deletePartner(id) {
  state.partners = state.partners.filter(p => p.id !== id);
  persistTaxState();
}

export function nextProductId() {
  state.counters.productSeq = (state.counters.productSeq || 0) + 1;
  return `PRD-${String(state.counters.productSeq).padStart(3, '0')}`;
}

export function addProduct(product) {
  state.products.push(product);
  persistTaxState();
}

export function updateProduct(id, patch) {
  const p = state.products.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  persistTaxState();
}

export function deleteProduct(id) {
  state.products = state.products.filter(p => p.id !== id);
  persistTaxState();
}

/**
 * Generates the next sequential invoice number for a given YYYYMM period,
 * e.g. INV-202608-0001, and reserves it in the counters so it is never
 * reused even if the invoice is later cancelled.
 */
export function nextInvoiceNumber(dateStr) {
  const ym = (dateStr || new Date().toISOString().slice(0, 10)).slice(0, 7).replace('-', '');
  const seq = (state.counters.invoiceSeq[ym] || 0) + 1;
  state.counters.invoiceSeq[ym] = seq;
  persistTaxState();
  return `INV-${ym}-${String(seq).padStart(4, '0')}`;
}

export function addInvoice(invoice) {
  state.invoices.push(invoice);
  persistTaxState();
}

export function updateInvoice(id, patch) {
  const inv = state.invoices.find(i => i.id === id);
  if (inv) Object.assign(inv, patch);
  persistTaxState();
}

export function nextPurchaseSeq() {
  state.counters.purchaseSeq = (state.counters.purchaseSeq || 0) + 1;
  return state.counters.purchaseSeq;
}

export function addPurchase(purchase) {
  state.purchases.push(purchase);
  persistTaxState();
}

export function updatePurchase(id, patch) {
  const p = state.purchases.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  persistTaxState();
}

export function addJournalEntry(entry) {
  state.journalEntries.push(entry);
  persistTaxState();
}

export function cancelJournalEntriesFor(sourceType, sourceId) {
  state.journalEntries
    .filter(e => e.sourceType === sourceType && e.sourceId === sourceId)
    .forEach(e => { e.cancelled = true; });
  persistTaxState();
}

export function setLatihanCase(caseId) {
  state.latihan.currentCaseId = caseId;
  state.latihan.lastResult = null;
  persistTaxState();
}

export function setLatihanResult(result) {
  state.latihan.lastResult = result;
  persistTaxState();
}

/**
 * Wipes only the tax/invoicing module's transactional data (keeps company
 * profile & VAT rate configuration intact) — used by "Reset Data" scoped
 * to this module if the user wants a fresh operational start.
 */
export function resetTaxTransactions() {
  state.partners = [];
  state.products = [];
  state.invoices = [];
  state.purchases = [];
  state.journalEntries = [];
  state.counters = { invoiceSeq: {}, partnerSeq: 0, productSeq: 0, purchaseSeq: 0 };
  state.latihan = { currentCaseId: null, lastResult: null };
  persistTaxState();
  // Isi ulang data demo agar form invoice tetap bisa dipakai
  ensureDemoData({ persist: true });
}
