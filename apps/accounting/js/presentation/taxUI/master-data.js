/**
 * taxUI/master-data.js — master data partner dan produk
 * (dipecah dari ../taxUI.js; perilaku identik)
 */
import { renderPartnerTable, renderPartnerHistoryHTML, fillPartnerSelect, renderProductTable, fillProductSelectOptions } from '../taxPages.js';
import { getPartners, updatePartner, addPartner, nextPartnerId, deletePartner, getProducts, updateProduct, nextProductId, addProduct, deleteProduct } from '../../tax/taxState.js';
import { validatePartnerForm, renderErrorListHTML } from '../../tax/validation.js';
import { showModal, showToast } from '../modals.js';
import { parseAmount } from '../../utils/formatters.js';

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

export function refreshPartnerTable() {
  renderPartnerTable(_partnerFilters());
}

export function handleTogglePartnerForm() {
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

export function handleEditPartner(id) {
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

export function handleSavePartner() {
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

export function handleDeletePartner(id) {
  if (!confirm('Hapus data pelanggan/pemasok ini? Riwayat invoice/pembelian yang sudah ada tidak akan terhapus.')) return;
  deletePartner(id);
  refreshPartnerTable();
  _refreshAllPartnerSelects();
}

export function handleHistoryPartner(id) {
  const p = getPartners().find(x => x.id === id);
  if (!p) return;
  showModal(`Riwayat Transaksi — ${p.name}`, renderPartnerHistoryHTML(id));
}

export function _refreshAllPartnerSelects() {
  fillPartnerSelect(document.getElementById('invCustomer'), 'PELANGGAN');
  fillPartnerSelect(document.getElementById('pchSupplier'), 'PEMASOK');
}

/* ══════════════════════════════════════════════════════════════════
   MASTER PRODUK & JASA
   ══════════════════════════════════════════════════════════════════ */

export function refreshProductTable() {
  renderProductTable({ search: document.getElementById('productSearch')?.value || '' });
}

export function handleToggleProductForm() {
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

export function handleEditProduct(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;
  document.getElementById('productFormPanel').style.display = 'block';
  document.getElementById('prfEditId').value = p.id;
  document.getElementById('prfName').value = p.name;
  document.getElementById('prfUnit').value = p.unit;
  document.getElementById('prfPrice').value = p.price;
  document.getElementById('prfActive').value = String(!!p.active);
}

export function handleSaveProduct() {
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

export function handleDeleteProduct(id) {
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
