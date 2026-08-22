/**
 * Constants for the "Simulator Accounting & Perpajakan Interaktif" module.
 * Kept fully separate from data/accounts.js (which belongs to the
 * case-exercise engine) so the two never collide.
 */

export const TAX_ACCOUNTS = {
  KAS: { code: '1-100', name: 'Kas' },
  PIUTANG: { code: '1-110', name: 'Piutang Usaha' },
  PERSEDIAAN: { code: '1-120', name: 'Persediaan/Beban Pembelian' },
  PPN_MASUKAN: { code: '1-130', name: 'PPN Masukan' },
  UTANG: { code: '2-100', name: 'Utang Usaha' },
  PPN_KELUARAN: { code: '2-110', name: 'PPN Keluaran' },
  PENJUALAN: { code: '4-100', name: 'Pendapatan Penjualan' }
};

export const TAX_STATUS = {
  PKP: 'PKP',
  NON_PKP: 'NON_PKP'
};

export const VAT_TREATMENT = {
  DIKENAKAN: 'PPN_DIKENAKAN',
  TIDAK_DIKENAKAN: 'PPN_TIDAK_DIKENAKAN',
  NON_PPN: 'NON_PPN'
};

export const VAT_TREATMENT_LABEL = {
  [VAT_TREATMENT.DIKENAKAN]: 'PPN Dikenakan',
  [VAT_TREATMENT.TIDAK_DIKENAKAN]: 'PPN Tidak Dikenakan',
  [VAT_TREATMENT.NON_PPN]: 'Transaksi Non-PPN'
};

export const PAYMENT_METHOD = {
  TUNAI: 'TUNAI',
  KREDIT: 'KREDIT'
};

export const PAYMENT_STATUS = {
  BELUM_DIBAYAR: 'BELUM_DIBAYAR',
  DIBAYAR_SEBAGIAN: 'DIBAYAR_SEBAGIAN',
  LUNAS: 'LUNAS',
  DRAFT: 'DRAFT',
  DIBATALKAN: 'DIBATALKAN'
};

export const PAYMENT_STATUS_LABEL = {
  [PAYMENT_STATUS.BELUM_DIBAYAR]: 'Belum Dibayar',
  [PAYMENT_STATUS.DIBAYAR_SEBAGIAN]: 'Dibayar Sebagian',
  [PAYMENT_STATUS.LUNAS]: 'Lunas',
  [PAYMENT_STATUS.DRAFT]: 'Draft',
  [PAYMENT_STATUS.DIBATALKAN]: 'Dibatalkan'
};

export const CREDIT_STATUS = {
  DAPAT_DIKREDITKAN: 'DAPAT_DIKREDITKAN',
  TIDAK_DAPAT_DIKREDITKAN: 'TIDAK_DAPAT_DIKREDITKAN',
  BELUM_DIVERIFIKASI: 'BELUM_DIVERIFIKASI'
};

export const CREDIT_STATUS_LABEL = {
  [CREDIT_STATUS.DAPAT_DIKREDITKAN]: 'Dapat Dikreditkan',
  [CREDIT_STATUS.TIDAK_DAPAT_DIKREDITKAN]: 'Tidak Dapat Dikreditkan',
  [CREDIT_STATUS.BELUM_DIVERIFIKASI]: 'Belum Diverifikasi'
};

export const TAX_MODE = {
  OPERASIONAL: 'OPERASIONAL',
  LATIHAN: 'LATIHAN'
};

export const DEFAULT_VAT_RATE_PERCENT = 12;

export const EDUCATIONAL_NOTE_NONPKP_BUYER =
  'Status PKP atau Non-PKP pelanggan tidak secara otomatis menentukan apakah penjualan dikenai PPN. ' +
  'Perlakuan PPN mengikuti status penjual (perusahaan) dan jenis transaksi.';

export const EDUCATIONAL_NOTE_COMPANY_NONPKP =
  'Perusahaan berstatus Non-PKP: Pajak Keluaran tidak dapat dibuat dan Pajak Masukan tidak dapat dikreditkan. ' +
  'Transaksi tetap dapat dicatat sebagai penjualan atau pembelian biasa.';

export const EDUCATIONAL_NOTE_CREDIT =
  'Pengkreditan Pajak Masukan bergantung pada ketentuan perpajakan yang berlaku dan karakter transaksi — ' +
  'tidak seluruh Pajak Masukan otomatis dapat dikreditkan.';
