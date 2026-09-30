/**
 * projects-data.js — 10 project brief (Real-World Project) + konfigurasi
 * Final Challenge (skema bobot skor sesuai spesifikasi).
 */
(function (global) {
  "use strict";
  function P(id, title, category, tool, desc, tasks) { return { id, title, category, tool, desc, tasks }; }

  const PROJECTS = [
    P("p1", "Sales Dashboard Dataset", "sales", "SQL", "Bangun query-query dasar untuk menyiapkan sumber data dashboard penjualan.",
      ["Muat dataset Sales (≥500 baris) dari Dataset Generator", "Hitung total penjualan per Region & per Category", "Tampilkan 10 transaksi dengan Total_Sales tertinggi", "Hitung rata-rata nilai transaksi (average order value)", "Buat 1 query ringkasan bulanan (per bulan) untuk tren penjualan"]),
    P("p2", "Accounting Data Cleaning", "accounting", "SQL + Power Query", "Bersihkan data jurnal akuntansi yang \"kotor\" sebelum dipakai rekonsiliasi.",
      ["Muat dataset Accounting dengan opsi Dirty Data aktif", "Temukan baris dengan Debit & Credit yang sama-sama nol / NULL", "Deteksi Transaction_ID duplikat", "Standarkan format tanggal dengan Power Query (Format Date)", "Verifikasi: total Debit harus sama dengan total Credit setelah dibersihkan"]),
    P("p3", "HR Employee Analytics", "hr", "SQL", "Analisis data kepegawaian untuk mendukung keputusan SDM.",
      ["Muat dataset HR", "Hitung rata-rata Salary & Performance_Score per Department", "Cari karyawan dengan Performance_Score di atas rata-rata perusahaan", "Hitung jumlah karyawan per Status (Aktif/Cuti/Resign)", "Tampilkan 5 karyawan dengan gaji tertinggi per Department memakai window function"]),
    P("p4", "Inventory Analysis", "inventory", "SQL", "Pantau kesehatan stok & mendeteksi produk yang perlu segera di-restock.",
      ["Muat dataset Inventory", "Cari produk dengan Stock di bawah Minimum_Stock", "Hitung margin (Selling_Price - Purchase_Price) per produk", "Kelompokkan total nilai stok (Stock × Purchase_Price) per Supplier", "Urutkan produk dari margin % terbesar ke terkecil"]),
    P("p5", "Customer Segmentation", "customers", "SQL", "Segmentasi pelanggan berdasarkan histori pembelian & profil demografis.",
      ["Muat dataset Customer", "Kelompokkan pelanggan berdasarkan Customer_Type & hitung Total_Purchase rata-rata", "Cari pelanggan VIP dengan Total_Purchase di atas rata-rata seluruh pelanggan", "Hitung distribusi jumlah pelanggan per Province", "Buat kategori umur (mis. <25, 25-40, >40) menggunakan CASE WHEN"]),
    P("p6", "Financial Transaction Analysis", "accounting", "SQL", "Menganalisis pergerakan akun & mendeteksi transaksi tidak biasa.",
      ["Muat dataset Accounting", "Hitung saldo akhir per Account_Name (SUM Debit - SUM Credit)", "Cari transaksi dengan nominal jauh di atas rata-rata (kandidat anomali)", "Rangkum total transaksi per Department per bulan", "Buat CTE untuk ringkasan lalu filter akun dengan saldo negatif"]),
    P("p7", "Data Cleaning ETL", "sales", "Power Query", "Praktik ETL end-to-end memakai Power Query Simulator.",
      ["Muat dataset (kategori bebas) dengan Dirty Data aktif ke PQ Simulator", "Terapkan Trim pada seluruh kolom teks", "Hapus baris duplikat (Remove Duplicates)", "Standarkan kolom tanggal (Format Date)", "Tambahkan kolom kustom hasil perhitungan, lalu ekspor hasil bersih ke CSV"]),
    P("p8", "SQL Data Analyst Challenge", "sales", "SQL", "Simulasikan tugas harian seorang Data/Business Analyst.",
      ["Muat dataset Sales", "Buat laporan penjualan per Region per Category", "Cari 3 produk terlaris berdasarkan Quantity", "Gunakan window function untuk ranking penjualan per Region", "Susun satu query akhir yang menjawab: \"Region mana yang perlu diperkuat marketing-nya?\""]),
    P("p9", "Power Query ETL Challenge", "customers", "Power Query", "Transformasi data pelanggan mentah menjadi tabel siap-analisis.",
      ["Muat dataset Customer dengan Dirty Data aktif ke PQ Simulator", "Split kolom gabungan (jika ada) menjadi beberapa kolom", "Buat Conditional Column untuk kategori pelanggan baru", "Group By Province untuk ringkasan jumlah pelanggan", "Salin kode M yang dihasilkan sebagai dokumentasi proses"]),
    P("p10", "SQL + Power Query Final Project", "sales", "SQL + Power Query", "Proyek gabungan: bersihkan dengan Power Query, analisis dengan SQL.",
      ["Bersihkan dataset Sales kotor di PQ Simulator (duplikat, null, format tanggal)", "Ekspor hasil bersih (CSV/JSON)", "Import ulang hasil bersih ke SQL Simulator sebagai dataset kustom", "Jawab minimal 3 pertanyaan bisnis dengan query SQL (total, ranking, tren)", "Tulis ringkasan temuan (2-3 kalimat) berdasarkan hasil query"])
  ];

  // Bobot skor Final Challenge, sesuai spesifikasi.
  const CHALLENGE_WEIGHTS = {
    sql: 30, cleaning: 20, joinAgg: 15, advancedSql: 15, powerQuery: 15, problemSolving: 5
  };

  const CHALLENGE_BANDS = [
    { min: 0, max: 39, label: "Beginner" },
    { min: 40, max: 64, label: "Intermediate" },
    { min: 65, max: 84, label: "Advanced" },
    { min: 85, max: 100, label: "Job Ready" }
  ];

  global.SQLPQ_Projects = { PROJECTS, CHALLENGE_WEIGHTS, CHALLENGE_BANDS };
})(window);
