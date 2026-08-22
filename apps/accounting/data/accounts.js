/**
 * Chart of Accounts – Single source of truth for all account metadata.
 * Types: Aset | Kontra-Aset | Kewajiban | Ekuitas | Pendapatan | Beban | Kontra-Pendapatan | Kontra-Beban
 * normal: 'D' (debit) | 'K' (credit)
 * category: financial-statement classification
 */

export const ACCOUNT_DATABASE = {
  level1: [
    { code: '101', name: 'Kas', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '102', name: 'Piutang Usaha', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '103', name: 'Perlengkapan', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '104', name: 'Sewa Dibayar Dimuka', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '105', name: 'Asuransi Dibayar Dimuka', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '121', name: 'Peralatan', type: 'Aset', normal: 'D', category: 'fixed_asset' },
    { code: '122', name: 'Akumulasi Penyusutan Peralatan', type: 'Kontra-Aset', normal: 'K', category: 'fixed_asset' },
    { code: '123', name: 'Kendaraan', type: 'Aset', normal: 'D', category: 'fixed_asset' },
    { code: '124', name: 'Akumulasi Penyusutan Kendaraan', type: 'Kontra-Aset', normal: 'K', category: 'fixed_asset' },
    { code: '201', name: 'Utang Usaha', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '202', name: 'Pendapatan Diterima Dimuka', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '203', name: 'Utang Gaji', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '301', name: 'Modal Pemilik', type: 'Ekuitas', normal: 'K', category: 'equity' },
    { code: '302', name: 'Prive', type: 'Ekuitas', normal: 'D', category: 'equity' },
    { code: '303', name: 'Ikhtisar Laba Rugi', type: 'Ekuitas', normal: 'K', category: 'equity' },
    { code: '401', name: 'Pendapatan Jasa', type: 'Pendapatan', normal: 'K', category: 'revenue' },
    { code: '501', name: 'Beban Gaji', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '502', name: 'Beban Sewa', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '503', name: 'Beban Perlengkapan', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '504', name: 'Beban Penyusutan', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '505', name: 'Beban Utilitas', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '506', name: 'Beban Asuransi', type: 'Beban', normal: 'D', category: 'expense' }
  ],

  level2: [
    { code: '101', name: 'Kas', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '102', name: 'Piutang Usaha', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '103', name: 'Persediaan Barang Dagang', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '104', name: 'Perlengkapan', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '105', name: 'Asuransi Dibayar Dimuka', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '106', name: 'Sewa Dibayar Dimuka', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '108', name: 'Penyisihan Piutang Tak Tertagih', type: 'Kontra-Aset', normal: 'K', category: 'current_asset' },
    { code: '121', name: 'Peralatan', type: 'Aset', normal: 'D', category: 'fixed_asset' },
    { code: '122', name: 'Akumulasi Penyusutan Peralatan', type: 'Kontra-Aset', normal: 'K', category: 'fixed_asset' },
    { code: '201', name: 'Utang Usaha', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '202', name: 'Pendapatan Diterima Dimuka', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '203', name: 'Utang Gaji', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '301', name: 'Modal Pemilik', type: 'Ekuitas', normal: 'K', category: 'equity' },
    { code: '302', name: 'Prive', type: 'Ekuitas', normal: 'D', category: 'equity' },
    { code: '303', name: 'Ikhtisar Laba Rugi', type: 'Ekuitas', normal: 'K', category: 'equity' },
    { code: '401', name: 'Penjualan', type: 'Pendapatan', normal: 'K', category: 'revenue' },
    { code: '402', name: 'Retur Penjualan', type: 'Kontra-Pendapatan', normal: 'D', category: 'revenue' },
    { code: '403', name: 'Potongan Penjualan', type: 'Kontra-Pendapatan', normal: 'D', category: 'revenue' },
    { code: '411', name: 'Harga Pokok Penjualan', type: 'Beban', normal: 'D', category: 'cogs' },
    { code: '501', name: 'Pembelian', type: 'Beban', normal: 'D', category: 'purchase' },
    { code: '502', name: 'Retur Pembelian', type: 'Kontra-Beban', normal: 'K', category: 'purchase' },
    { code: '503', name: 'Potongan Pembelian', type: 'Kontra-Beban', normal: 'K', category: 'purchase' },
    { code: '504', name: 'Ongkos Angkut Pembelian', type: 'Beban', normal: 'D', category: 'purchase' },
    { code: '511', name: 'Beban Gaji', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '512', name: 'Beban Sewa', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '513', name: 'Beban Perlengkapan', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '514', name: 'Beban Penyusutan', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '515', name: 'Beban Asuransi', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '516', name: 'Beban Utilitas', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '517', name: 'Beban Piutang Tak Tertagih', type: 'Beban', normal: 'D', category: 'expense' }
  ],

  level3: [
    { code: '101', name: 'Kas', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '102', name: 'Piutang Usaha', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '103', name: 'Persediaan Bahan Baku', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '104', name: 'Persediaan Barang Dalam Proses', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '105', name: 'Persediaan Barang Jadi', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '106', name: 'Perlengkapan', type: 'Aset', normal: 'D', category: 'current_asset' },
    { code: '121', name: 'Mesin Pabrik', type: 'Aset', normal: 'D', category: 'fixed_asset' },
    { code: '122', name: 'Akumulasi Penyusutan Mesin', type: 'Kontra-Aset', normal: 'K', category: 'fixed_asset' },
    { code: '123', name: 'Gedung Pabrik', type: 'Aset', normal: 'D', category: 'fixed_asset' },
    { code: '124', name: 'Akumulasi Penyusutan Gedung', type: 'Kontra-Aset', normal: 'K', category: 'fixed_asset' },
    { code: '201', name: 'Utang Usaha', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '202', name: 'Utang Upah', type: 'Kewajiban', normal: 'K', category: 'current_liability' },
    { code: '301', name: 'Modal Pemilik', type: 'Ekuitas', normal: 'K', category: 'equity' },
    { code: '302', name: 'Prive', type: 'Ekuitas', normal: 'D', category: 'equity' },
    { code: '303', name: 'Ikhtisar Laba Rugi', type: 'Ekuitas', normal: 'K', category: 'equity' },
    { code: '401', name: 'Penjualan', type: 'Pendapatan', normal: 'K', category: 'revenue' },
    { code: '411', name: 'Harga Pokok Penjualan', type: 'Beban', normal: 'D', category: 'cogs' },
    { code: '501', name: 'Beban Bahan Baku', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '502', name: 'Beban Tenaga Kerja Langsung', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '503', name: 'Beban Overhead Pabrik', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '511', name: 'Beban Pemasaran', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '512', name: 'Beban Administrasi', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '513', name: 'Beban Penyusutan Mesin', type: 'Beban', normal: 'D', category: 'expense' },
    { code: '514', name: 'Beban Penyusutan Gedung', type: 'Beban', normal: 'D', category: 'expense' }
  ]
};

export function getAccountsByLevel(level) {
  const key = `level${level}`;
  const chart = ACCOUNT_DATABASE[key];
  if (chart && chart.length) return chart.map(a => ({ ...a }));
  return ACCOUNT_DATABASE.level1.map(a => ({ ...a }));
}

export function findAccountByName(accounts, name) {
  return accounts.find(a => a.name === name) || null;
}

export function findAccountByCode(accounts, code) {
  return accounts.find(a => a.code === code) || null;
}
