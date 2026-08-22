/**
 * Structured Transaction Bank
 * Every transaction includes its correct double-entry lines.
 * Accounting Engine uses these as the source of truth.
 */

export const bankSoalLengkap = {
  '1': [
    {
      id: 'j1-01', tanggal: '01 Mar',
      deskripsi: 'Pemilik menyetorkan uang tunai Rp 100.000.000 dan Kendaraan senilai Rp 50.000.000 sebagai modal usaha.',
      entries: [
        { account: 'Kas', debit: 100000000, credit: 0 },
        { account: 'Kendaraan', debit: 50000000, credit: 0 },
        { account: 'Modal Pemilik', debit: 0, credit: 150000000 }
      ]
    },
    {
      id: 'j1-02', tanggal: '04 Mar',
      deskripsi: 'Dibeli perlengkapan kantor senilai Rp 5.000.000 secara tunai.',
      entries: [
        { account: 'Perlengkapan', debit: 5000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 5000000 }
      ]
    },
    {
      id: 'j1-03', tanggal: '07 Mar',
      deskripsi: 'Dibayar sewa ruang kantor untuk 1 tahun ke depan sebesar Rp 12.000.000.',
      entries: [
        { account: 'Sewa Dibayar Dimuka', debit: 12000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 12000000 }
      ]
    },
    {
      id: 'j1-04', tanggal: '08 Mar',
      deskripsi: 'Diselesaikan jasa desain untuk pelanggan dan diterima pembayaran tunai Rp 8.500.000.',
      entries: [
        { account: 'Kas', debit: 8500000, credit: 0 },
        { account: 'Pendapatan Jasa', debit: 0, credit: 8500000 }
      ]
    },
    {
      id: 'j1-05', tanggal: '12 Mar',
      deskripsi: 'Dibeli peralatan kantor dari Toko Abadi seharga Rp 15.000.000. Dibayar tunai Rp 5.000.000, sisanya kredit.',
      entries: [
        { account: 'Peralatan', debit: 15000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 5000000 },
        { account: 'Utang Usaha', debit: 0, credit: 10000000 }
      ]
    },
    {
      id: 'j1-06', tanggal: '15 Mar',
      deskripsi: 'Diselesaikan jasa konsultasi senilai Rp 12.000.000, pelanggan berjanji akan membayar bulan depan.',
      entries: [
        { account: 'Piutang Usaha', debit: 12000000, credit: 0 },
        { account: 'Pendapatan Jasa', debit: 0, credit: 12000000 }
      ]
    },
    {
      id: 'j1-07', tanggal: '18 Mar',
      deskripsi: 'Dibayar tagihan listrik, air, dan internet sebesar Rp 1.500.000.',
      entries: [
        { account: 'Beban Utilitas', debit: 1500000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 1500000 }
      ]
    },
    {
      id: 'j1-08', tanggal: '20 Mar',
      deskripsi: 'Diterima uang muka dari klien sebesar Rp 5.000.000 untuk jasa yang akan dikerjakan bulan depan (Pendapatan Diterima di Muka).',
      entries: [
        { account: 'Kas', debit: 5000000, credit: 0 },
        { account: 'Pendapatan Diterima Dimuka', debit: 0, credit: 5000000 }
      ]
    },
    {
      id: 'j1-09', tanggal: '22 Mar',
      deskripsi: 'Diterima pelunasan piutang dari pelanggan atas transaksi tanggal 15 Maret sebesar Rp 10.000.000.',
      entries: [
        { account: 'Kas', debit: 10000000, credit: 0 },
        { account: 'Piutang Usaha', debit: 0, credit: 10000000 }
      ]
    },
    {
      id: 'j1-10', tanggal: '25 Mar',
      deskripsi: 'Pemilik mengambil uang perusahaan untuk keperluan pribadi (Prive) sebesar Rp 2.500.000.',
      entries: [
        { account: 'Prive', debit: 2500000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 2500000 }
      ]
    },
    {
      id: 'j1-11', tanggal: '28 Mar',
      deskripsi: 'Dibayar sebagian angsuran utang kepada Toko Abadi sebesar Rp 4.000.000.',
      entries: [
        { account: 'Utang Usaha', debit: 4000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 4000000 }
      ]
    },
    {
      id: 'j1-12', tanggal: '30 Mar',
      deskripsi: 'Dibayar gaji karyawan untuk bulan ini sebesar Rp 7.000.000.',
      entries: [
        { account: 'Beban Gaji', debit: 7000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 7000000 }
      ]
    }
  ],

  '2': [
    {
      id: 'd2-01', tanggal: '02 Apr',
      deskripsi: 'Membeli barang dagangan dari PT Maju senilai Rp 20.000.000 dengan syarat 2/10, n/30.',
      entries: [
        { account: 'Pembelian', debit: 20000000, credit: 0 },
        { account: 'Utang Usaha', debit: 0, credit: 20000000 }
      ]
    },
    {
      id: 'd2-02', tanggal: '05 Apr',
      deskripsi: 'Menjual barang dagangan secara tunai seharga Rp 15.000.000 (Harga Pokok Penjualan Rp 10.000.000).',
      entries: [
        { account: 'Kas', debit: 15000000, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: 15000000 },
        { account: 'Harga Pokok Penjualan', debit: 10000000, credit: 0 },
        { account: 'Persediaan Barang Dagang', debit: 0, credit: 10000000 }
      ]
    },
    {
      id: 'd2-03', tanggal: '07 Apr',
      deskripsi: 'Mengembalikan barang yang rusak kepada PT Maju senilai Rp 2.000.000.',
      entries: [
        { account: 'Utang Usaha', debit: 2000000, credit: 0 },
        { account: 'Retur Pembelian', debit: 0, credit: 2000000 }
      ]
    },
    {
      id: 'd2-04', tanggal: '10 Apr',
      deskripsi: 'Melunasi sisa utang kepada PT Maju dan mendapatkan potongan pembelian.',
      entries: [
        { account: 'Utang Usaha', debit: 18000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 17640000 },
        { account: 'Potongan Pembelian', debit: 0, credit: 360000 }
      ]
    },
    {
      id: 'd2-05', tanggal: '12 Apr',
      deskripsi: 'Menjual barang dagangan secara kredit kepada Toko Laris senilai Rp 25.000.000 dengan syarat 2/10, n/30 (HPP Rp 18.000.000).',
      entries: [
        { account: 'Piutang Usaha', debit: 25000000, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: 25000000 },
        { account: 'Harga Pokok Penjualan', debit: 18000000, credit: 0 },
        { account: 'Persediaan Barang Dagang', debit: 0, credit: 18000000 }
      ]
    },
    {
      id: 'd2-06', tanggal: '14 Apr',
      deskripsi: 'Menerima retur barang dari Toko Laris karena cacat senilai Rp 1.000.000 (HPP Rp 700.000).',
      entries: [
        { account: 'Retur Penjualan', debit: 1000000, credit: 0 },
        { account: 'Piutang Usaha', debit: 0, credit: 1000000 },
        { account: 'Persediaan Barang Dagang', debit: 700000, credit: 0 },
        { account: 'Harga Pokok Penjualan', debit: 0, credit: 700000 }
      ]
    },
    {
      id: 'd2-07', tanggal: '18 Apr',
      deskripsi: 'Membayar ongkos kirim (FOB Shipping Point) pembelian barang dagangan Rp 500.000.',
      entries: [
        { account: 'Ongkos Angkut Pembelian', debit: 500000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 500000 }
      ]
    },
    {
      id: 'd2-08', tanggal: '21 Apr',
      deskripsi: 'Menerima pelunasan dari Toko Laris dalam masa potongan.',
      entries: [
        { account: 'Kas', debit: 23520000, credit: 0 },
        { account: 'Potongan Penjualan', debit: 480000, credit: 0 },
        { account: 'Piutang Usaha', debit: 0, credit: 24000000 }
      ]
    },
    {
      id: 'd2-09', tanggal: '24 Apr',
      deskripsi: 'Membayar premi asuransi kebakaran toko untuk 6 bulan sebesar Rp 3.000.000.',
      entries: [
        { account: 'Asuransi Dibayar Dimuka', debit: 3000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 3000000 }
      ]
    },
    {
      id: 'd2-10', tanggal: '26 Apr',
      deskripsi: 'Membeli perlengkapan toko (plastik, lakban, kardus) secara tunai sebesar Rp 3.000.000.',
      entries: [
        { account: 'Perlengkapan', debit: 3000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 3000000 }
      ]
    }
  ],

  '3': [
    {
      id: 'm3-01', tanggal: '01 Mei',
      deskripsi: 'Membeli bahan baku (Raw Material) secara kredit senilai Rp 50.000.000.',
      entries: [
        { account: 'Persediaan Bahan Baku', debit: 50000000, credit: 0 },
        { account: 'Utang Usaha', debit: 0, credit: 50000000 }
      ]
    },
    {
      id: 'm3-02', tanggal: '05 Mei',
      deskripsi: 'Memasukkan bahan baku senilai Rp 30.000.000 ke dalam proses produksi (Barang Dalam Proses).',
      entries: [
        { account: 'Persediaan Barang Dalam Proses', debit: 30000000, credit: 0 },
        { account: 'Persediaan Bahan Baku', debit: 0, credit: 30000000 }
      ]
    },
    {
      id: 'm3-03', tanggal: '10 Mei',
      deskripsi: 'Membayar upah buruh pabrik (Tenaga Kerja Langsung) sebesar Rp 15.000.000.',
      entries: [
        { account: 'Persediaan Barang Dalam Proses', debit: 15000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 15000000 }
      ]
    },
    {
      id: 'm3-04', tanggal: '15 Mei',
      deskripsi: 'Mencatat biaya Overhead Pabrik (Listrik pabrik, Penyusutan mesin, Asuransi) sebesar Rp 10.000.000.',
      entries: [
        { account: 'Persediaan Barang Dalam Proses', debit: 10000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 10000000 }
      ]
    },
    {
      id: 'm3-05', tanggal: '20 Mei',
      deskripsi: 'Produk selesai diproses dan ditransfer ke gudang Barang Jadi senilai Rp 55.000.000.',
      entries: [
        { account: 'Persediaan Barang Jadi', debit: 55000000, credit: 0 },
        { account: 'Persediaan Barang Dalam Proses', debit: 0, credit: 55000000 }
      ]
    },
    {
      id: 'm3-06', tanggal: '25 Mei',
      deskripsi: 'Menjual Barang Jadi senilai Rp 80.000.000 secara kredit (HPP Rp 50.000.000).',
      entries: [
        { account: 'Piutang Usaha', debit: 80000000, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: 80000000 },
        { account: 'Harga Pokok Penjualan', debit: 50000000, credit: 0 },
        { account: 'Persediaan Barang Jadi', debit: 0, credit: 50000000 }
      ]
    },
    {
      id: 'm3-07', tanggal: '28 Mei',
      deskripsi: 'Membayar komisi staf bagian penjualan (Beban Pemasaran) sebesar Rp 3.000.000.',
      entries: [
        { account: 'Beban Pemasaran', debit: 3000000, credit: 0 },
        { account: 'Kas', debit: 0, credit: 3000000 }
      ]
    }
  ]
};
