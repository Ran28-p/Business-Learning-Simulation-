/**
 * Validation Engine — Tax / Invoicing module.
 * Each function returns { valid: boolean, errors: string[] } with clear,
 * friendly Indonesian messages (never bare "Error"/"Invalid").
 */
import { TAX_STATUS } from './taxConstants.js';

export function validateInvoiceForm({ customer, invoiceDate, items, companyTaxStatus }) {
  const errors = [];

  if (!customer) {
    errors.push('Pelanggan wajib dipilih sebelum invoice dapat disimpan.');
  } else if (customer.taxStatus === TAX_STATUS.PKP && !customer.npwp) {
    errors.push('NPWP pelanggan wajib diisi karena pelanggan berstatus PKP.');
  }

  if (!invoiceDate) {
    errors.push('Tanggal invoice wajib diisi.');
  }

  if (!items || items.length === 0) {
    errors.push('Invoice belum dapat disimpan karena belum terdapat barang atau jasa.');
  } else {
    items.forEach((it, idx) => {
      const no = idx + 1;
      if (!it.name) errors.push(`Baris ${no}: nama barang/jasa wajib diisi.`);
      if (!(Number(it.quantity) > 0)) errors.push(`Baris ${no}: kuantitas harus lebih dari nol.`);
      if (Number(it.unitPrice) < 0) errors.push(`Baris ${no}: harga satuan tidak boleh negatif.`);
    });
  }

  if (companyTaxStatus === TAX_STATUS.NON_PKP) {
    const anyVat = (items || []).some(it => it.vatApplies);
    if (anyVat) errors.push('PPN tidak boleh dihitung karena status perusahaan Non-PKP.');
  }

  return { valid: errors.length === 0, errors };
}

export function validatePurchaseForm({ supplier, documentDate, documentNumber, dpp }) {
  const errors = [];

  if (!supplier) errors.push('Pemasok wajib dipilih sebelum data pembelian dapat disimpan.');
  else if (supplier.taxStatus === TAX_STATUS.PKP && !supplier.npwp) {
    errors.push('NPWP pemasok wajib diisi karena pemasok berstatus PKP.');
  }

  if (!documentDate) errors.push('Tanggal dokumen pembelian wajib diisi.');
  if (!documentNumber) errors.push('Nomor dokumen pembelian wajib diisi.');
  if (!(Number(dpp) > 0)) errors.push('Dasar Pengenaan Pajak (DPP) harus lebih dari nol.');

  return { valid: errors.length === 0, errors };
}

export function validatePartnerForm({ name, type, taxStatus, npwp }) {
  const errors = [];
  if (!name) errors.push('Nama pelanggan/pemasok wajib diisi.');
  if (!type) errors.push('Jenis (Pelanggan/Pemasok) wajib dipilih.');
  if (taxStatus === TAX_STATUS.PKP && !npwp) {
    errors.push('NPWP wajib diisi karena data ini berstatus PKP.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateInvoiceNumberUnique(invoiceNumber, existingInvoices) {
  const dup = existingInvoices.some(i => i.invoiceNumber === invoiceNumber);
  if (dup) return { valid: false, errors: ['Nomor invoice tidak boleh duplikat.'] };
  return { valid: true, errors: [] };
}

export function renderErrorListHTML(errors) {
  return `<ul style="margin:0; padding-left:20px; color:var(--danger);">${errors.map(e => `<li style="margin-bottom:6px;">${e}</li>`).join('')}</ul>`;
}
