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

// Tarif PPN yang dipakai sebagai nilai kalkulasi (dpp × rate/100) di seluruh mesin
// PPN aplikasi ini. Sejak PMK 131/2024, tarif nominal PPN adalah 12%, TAPI untuk
// barang/jasa non-mewah dasar pengenaan pajaknya memakai "DPP Nilai Lain"
// (DPP x 11/12 x 12%), yang membuat tarif EFEKTIF-nya tetap 11% — itulah angka
// yang benar-benar dikalikan dalam praktik sehari-hari, jadi itu yang dipakai di
// sini (bukan 12% nominal). Barang/jasa tergolong mewah (kena PPnBM) memakai
// tarif 12% penuh — kasus ini belum punya jalur terpisah di UI invoice modul ini.
// Lihat juga seed vatRates di taxState.js untuk representasi historisnya (11%
// sejak 2022, lalu 11% efektif via DPP Nilai Lain sejak 2025).
export const DEFAULT_VAT_RATE_PERCENT = 11;

export const EDUCATIONAL_NOTE_NONPKP_BUYER =
  'Status PKP atau Non-PKP pelanggan tidak secara otomatis menentukan apakah penjualan dikenai PPN. ' +
  'Perlakuan PPN mengikuti status penjual (perusahaan) dan jenis transaksi.';

export const EDUCATIONAL_NOTE_COMPANY_NONPKP =
  'Perusahaan berstatus Non-PKP: Pajak Keluaran tidak dapat dibuat dan Pajak Masukan tidak dapat dikreditkan. ' +
  'Transaksi tetap dapat dicatat sebagai penjualan atau pembelian biasa.';

export const EDUCATIONAL_NOTE_CREDIT =
  'Pengkreditan Pajak Masukan bergantung pada ketentuan perpajakan yang berlaku dan karakter transaksi — ' +
  'tidak seluruh Pajak Masukan otomatis dapat dikreditkan.';
