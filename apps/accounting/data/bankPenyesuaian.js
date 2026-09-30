/**
 * Structured Adjustment Bank
 * Each adjustment includes its correct double-entry lines.
 */

export const bankSoalPenyesuaian = {
  '1': [
    {
      id: 'adj1-01', tanggal: '31 Mar',
      deskripsi: 'Berdasarkan perhitungan fisik, sisa Perlengkapan Kantor di gudang bernilai Rp 1.500.000. (Pembelian Rp 5.000.000 → terpakai Rp 3.500.000)',
      entries: [
        { account: 'Beban Perlengkapan', debit: 3500000, credit: 0 },
        { account: 'Perlengkapan', debit: 0, credit: 3500000 }
      ]
    },
    {
      id: 'adj1-02', tanggal: '31 Mar',
      deskripsi: 'Peralatan Kantor disusutkan sebesar 1% per bulan dari harga perolehan (Rp 15.000.000).',
      entries: [
        { account: 'Beban Penyusutan', debit: 150000, credit: 0 },
        { account: 'Akumulasi Penyusutan Peralatan', debit: 0, credit: 150000 }
      ]
    },
    {
      id: 'adj1-03', tanggal: '31 Mar',
      deskripsi: 'Sewa dibayar di muka sebesar Rp 12.000.000 (dibayar 7 Mar untuk 1 tahun) telah terpakai untuk 1 bulan.',
      entries: [
        { account: 'Beban Sewa', debit: 1000000, credit: 0 },
        { account: 'Sewa Dibayar Dimuka', debit: 0, credit: 1000000 }
      ]
    },
    {
      id: 'adj1-04', tanggal: '31 Mar',
      deskripsi: 'Terdapat gaji karyawan yang masih harus dibayar (belum dicatat) sebesar Rp 2.000.000.',
      entries: [
        { account: 'Beban Gaji', debit: 2000000, credit: 0 },
        { account: 'Utang Gaji', debit: 0, credit: 2000000 }
      ]
    },
    {
      id: 'adj1-05', tanggal: '31 Mar',
      deskripsi: 'Jasa desain senilai Rp 1.000.000 dari Uang Muka Klien (tgl 20 Mar) telah diselesaikan.',
      entries: [
        { account: 'Pendapatan Diterima Dimuka', debit: 1000000, credit: 0 },
        { account: 'Pendapatan Jasa', debit: 0, credit: 1000000 }
      ]
    }
  ],

  '2': [
    {
      id: 'adj2-01', tanggal: '30 Apr',
      deskripsi: 'Asuransi dibayar di muka (tgl 24 Apr sebesar Rp 3.000.000 untuk 6 bln) telah menjadi beban selama 1 bulan.',
      entries: [
        { account: 'Beban Asuransi', debit: 500000, credit: 0 },
        { account: 'Asuransi Dibayar Dimuka', debit: 0, credit: 500000 }
      ]
    },
    {
      id: 'adj2-02', tanggal: '30 Apr',
      deskripsi: 'Perlengkapan toko yang terpakai selama bulan ini adalah Rp 2.200.000.',
      entries: [
        { account: 'Beban Perlengkapan', debit: 2200000, credit: 0 },
        { account: 'Perlengkapan', debit: 0, credit: 2200000 }
      ]
    }
  ],

  '3': [
    {
      id: 'adj3-01', tanggal: '31 Mei',
      deskripsi: 'Penyusutan Mesin Pabrik ditetapkan sebesar Rp 2.500.000.',
      entries: [
        { account: 'Beban Penyusutan Mesin', debit: 2500000, credit: 0 },
        { account: 'Akumulasi Penyusutan Mesin', debit: 0, credit: 2500000 }
      ]
    },
    {
      id: 'adj3-02', tanggal: '31 Mei',
      deskripsi: 'Penyusutan Gedung Pabrik ditetapkan sebesar Rp 1.500.000.',
      entries: [
        { account: 'Beban Penyusutan Gedung', debit: 1500000, credit: 0 },
        { account: 'Akumulasi Penyusutan Gedung', debit: 0, credit: 1500000 }
      ]
    },
    {
      id: 'adj3-03', tanggal: '31 Mei',
      deskripsi: 'Bahan penolong (Overhead) yang terpakai bulan ini terhitung sebesar Rp 1.200.000.',
      entries: [
        { account: 'Beban Overhead Pabrik', debit: 1200000, credit: 0 },
        { account: 'Perlengkapan', debit: 0, credit: 1200000 }
      ]
    },
    {
      id: 'adj3-04', tanggal: '31 Mei',
      deskripsi: 'Utang upah buruh pabrik yang belum dibayarkan sebesar Rp 4.000.000.',
      entries: [
        { account: 'Beban Tenaga Kerja Langsung', debit: 4000000, credit: 0 },
        { account: 'Utang Upah', debit: 0, credit: 4000000 }
      ]
    }
  ]
};
