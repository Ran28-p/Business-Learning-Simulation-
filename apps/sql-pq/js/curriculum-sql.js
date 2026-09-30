/**
 * curriculum-sql.js — Materi SQL Level 1-5 (syntax, contoh, penjelasan singkat)
 */
(function (global) {
  "use strict";
  function L(id, title, syntax, example, explain) { return { id, title, syntax, example, explain }; }

  const LEVEL1 = [
    L("db-table", "Database & Table", "Database berisi banyak table; table berisi kolom (field) & baris (record).", "-- tidak ada query, ini konsep struktur data", "Satu database bisa berisi banyak tabel yang saling berelasi, seperti \"sales\", \"customers\", \"products\"."),
    L("select", "SELECT", "SELECT kolom1, kolom2 FROM tabel;", "SELECT Customer_Name, Total_Sales FROM sales;", "SELECT menentukan kolom apa saja yang ingin ditampilkan. Gunakan * untuk semua kolom."),
    L("from", "FROM", "SELECT * FROM tabel;", "SELECT * FROM sales;", "FROM menentukan tabel sumber data yang akan dibaca."),
    L("where", "WHERE", "SELECT * FROM tabel WHERE kondisi;", "SELECT * FROM sales WHERE Region = 'Jawa Barat';", "WHERE menyaring baris berdasarkan kondisi — hanya baris yang kondisinya TRUE yang ditampilkan."),
    L("distinct", "DISTINCT", "SELECT DISTINCT kolom FROM tabel;", "SELECT DISTINCT Category FROM sales;", "Menghapus nilai duplikat dari hasil, menyisakan hanya nilai unik."),
    L("orderby", "ORDER BY", "SELECT * FROM tabel ORDER BY kolom ASC|DESC;", "SELECT * FROM sales ORDER BY Total_Sales DESC;", "Mengurutkan hasil. ASC (default) = kecil ke besar, DESC = besar ke kecil."),
    L("limit", "LIMIT / TOP", "SELECT * FROM tabel LIMIT n;", "SELECT * FROM sales ORDER BY Total_Sales DESC LIMIT 10;", "Membatasi jumlah baris hasil. Di SQL Server dipakai TOP n, di SQLite/MySQL/Postgres dipakai LIMIT n."),
    L("alias", "Alias (AS)", "SELECT kolom AS nama_baru FROM tabel;", "SELECT SUM(Total_Sales) AS total_penjualan FROM sales;", "Alias memberi nama sementara pada kolom/tabel agar hasil lebih mudah dibaca."),
    L("math-op", "Operator Matematika", "+  -  *  /  %", "SELECT Quantity * Unit_Price AS subtotal FROM sales;", "Operator matematika bisa dipakai langsung di dalam SELECT untuk membuat kolom hasil hitungan."),
    L("compare-op", "Operator Perbandingan", "=  !=  <>  >  <  >=  <=", "SELECT * FROM sales WHERE Quantity >= 5;", "Membandingkan nilai kolom dengan nilai lain; hasilnya TRUE/FALSE dipakai WHERE atau HAVING."),
    L("and-or-not", "AND / OR / NOT", "WHERE kondisi1 AND kondisi2\nWHERE kondisi1 OR kondisi2\nWHERE NOT kondisi", "SELECT * FROM sales WHERE Region = 'Bali' AND Quantity > 3;", "Menggabungkan beberapa kondisi. AND = semua harus benar, OR = salah satu benar, NOT = membalik kondisi."),
    L("in", "IN", "WHERE kolom IN (nilai1, nilai2, ...)", "SELECT * FROM sales WHERE Region IN ('Bali','DKI Jakarta');", "Cara ringkas menulis banyak kondisi OR yang membandingkan kolom yang sama."),
    L("between", "BETWEEN", "WHERE kolom BETWEEN nilai1 AND nilai2", "SELECT * FROM sales WHERE Quantity BETWEEN 3 AND 8;", "Menyaring nilai dalam suatu rentang (inklusif — nilai batas ikut termasuk)."),
    L("like", "LIKE", "WHERE kolom LIKE 'pola%'", "SELECT * FROM sales WHERE Product LIKE 'Laptop%';", "Mencocokkan pola teks. % = sembarang karakter (0 atau lebih), _ = tepat satu karakter."),
    L("is-null", "IS NULL", "WHERE kolom IS NULL", "SELECT * FROM sales WHERE Customer_Name IS NULL;", "NULL berarti data kosong/tidak ada nilai — tidak bisa dibandingkan dengan '=', harus pakai IS NULL."),
    L("is-not-null", "IS NOT NULL", "WHERE kolom IS NOT NULL", "SELECT * FROM sales WHERE Customer_Name IS NOT NULL;", "Kebalikan dari IS NULL — menyaring baris yang datanya terisi.")
  ];

  const LEVEL2 = [
    L("count", "COUNT", "SELECT COUNT(*) FROM tabel;", "SELECT COUNT(*) FROM sales WHERE Region = 'Bali';", "Menghitung jumlah baris. COUNT(kolom) mengabaikan NULL, COUNT(*) menghitung semua baris."),
    L("sum", "SUM", "SELECT SUM(kolom) FROM tabel;", "SELECT SUM(Total_Sales) FROM sales;", "Menjumlahkan seluruh nilai numerik pada kolom tersebut."),
    L("avg", "AVG", "SELECT AVG(kolom) FROM tabel;", "SELECT AVG(Salary) FROM hr;", "Menghitung rata-rata nilai kolom numerik."),
    L("minmax", "MIN / MAX", "SELECT MIN(kolom), MAX(kolom) FROM tabel;", "SELECT MIN(Total_Sales), MAX(Total_Sales) FROM sales;", "Mengambil nilai terkecil / terbesar dari suatu kolom."),
    L("groupby", "GROUP BY", "SELECT kolom, AGG(kolom2) FROM tabel GROUP BY kolom;", "SELECT Category, SUM(Total_Sales) FROM sales GROUP BY Category;", "Mengelompokkan baris dengan nilai sama pada suatu kolom, lalu fungsi agregat dihitung per kelompok."),
    L("having", "HAVING", "... GROUP BY kolom HAVING kondisi_agregat", "SELECT Category, SUM(Total_Sales) as total FROM sales GROUP BY Category HAVING SUM(Total_Sales) > 5000000;", "Menyaring HASIL agregasi (setelah GROUP BY) — beda dengan WHERE yang menyaring baris sebelum dikelompokkan."),
    L("case-when", "CASE WHEN", "CASE WHEN kondisi THEN nilai ... ELSE default END", "SELECT Name, CASE WHEN Performance_Score >= 85 THEN 'Baik' ELSE 'Perlu Ditingkatkan' END as Kategori FROM hr;", "Logika kondisional di dalam SQL — seperti IF berlapis, sangat umum dipakai untuk membuat kategori/label."),
    L("coalesce", "COALESCE", "COALESCE(kolom, nilai_pengganti)", "SELECT Customer_Name, COALESCE(Discount, 0) as Diskon FROM sales;", "Mengembalikan nilai pertama yang tidak NULL dari daftar argumen — umum dipakai memberi nilai default."),
    L("null-handling", "NULL Handling", "IS NULL, COALESCE, IFNULL/NVL (tergantung engine)", "SELECT COUNT(*) FROM sales WHERE Discount IS NULL;", "Menangani data kosong dengan sengaja, bukan diabaikan — penting untuk laporan yang akurat."),
    L("string-fn", "String Functions", "UPPER(), LOWER(), TRIM(), LENGTH(), SUBSTR()", "SELECT UPPER(TRIM(Customer_Name)) FROM sales;", "Fungsi untuk membersihkan & memanipulasi teks — dasar dari data cleaning berbasis SQL."),
    L("date-fn", "Date Functions", "DATE(), STRFTIME(), julianday() (SQLite)", "SELECT STRFTIME('%Y-%m', Date) as bulan FROM sales;", "Mengekstrak bagian tanggal (tahun, bulan, hari) atau menghitung selisih waktu."),
    L("numeric-fn", "Numeric Functions", "ROUND(), ABS(), CEIL(), FLOOR()", "SELECT ROUND(AVG(Total_Sales), 2) FROM sales;", "Fungsi untuk pembulatan dan manipulasi angka pada hasil query.")
  ];

  const LEVEL3 = [
    L("inner-join", "INNER JOIN", "SELECT ... FROM a JOIN b ON a.id = b.id", "SELECT o.order_id, c.customer_name FROM orders o JOIN customers c ON o.customer_id = c.customer_id;", "Hanya menampilkan baris yang punya pasangan cocok di KEDUA tabel."),
    L("left-join", "LEFT JOIN", "SELECT ... FROM a LEFT JOIN b ON a.id = b.id", "SELECT c.customer_name, o.order_id FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id;", "Semua baris tabel kiri tetap tampil walau tidak ada pasangan di tabel kanan (NULL jika tidak ada)."),
    L("right-join", "RIGHT JOIN", "SELECT ... FROM a RIGHT JOIN b ON a.id = b.id", "SELECT o.order_id, e.employee_name FROM orders o RIGHT JOIN employees e ON o.employee_id = e.employee_id;", "Kebalikan LEFT JOIN: semua baris tabel KANAN tetap tampil. Didukung langsung oleh SQL engine simulator ini (SQLite versi terbaru); pada database lama/engine lain yang belum mendukungnya, biasa disiasati dengan menukar urutan tabel + LEFT JOIN."),
    L("full-outer", "FULL OUTER JOIN", "SELECT ... FROM a FULL OUTER JOIN b ON a.id = b.id", "SELECT c.customer_name, o.order_id FROM customers c FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;", "Menampilkan semua baris dari KEDUA tabel, cocok maupun tidak cocok — kolom yang tidak match berisi NULL. Didukung langsung di simulator ini; pada engine yang belum mendukungnya bisa disiasati dengan LEFT JOIN UNION RIGHT JOIN."),
    L("cross-join", "CROSS JOIN", "SELECT ... FROM a CROSS JOIN b", "SELECT p.product_name, r.region_name FROM products p CROSS JOIN regions r;", "Menghasilkan seluruh kombinasi baris (cartesian product) — dipakai untuk membuat kombinasi lengkap, misalnya semua produk × semua region."),
    L("self-join", "Self JOIN", "SELECT ... FROM tabel a JOIN tabel b ON a.atasan_id = b.id", "SELECT e.employee_name, m.employee_name as manager FROM employees e JOIN employees m ON e.manager_id = m.employee_id;", "Sebuah tabel di-JOIN dengan dirinya sendiri — umum untuk data hierarkis seperti struktur atasan-bawahan."),
    L("multi-join", "Multiple JOIN", "FROM a JOIN b ON... JOIN c ON...", "SELECT c.customer_name, p.product_name, o.quantity FROM orders o JOIN customers c ON o.customer_id=c.customer_id JOIN products p ON o.product_id=p.product_id;", "Menggabungkan lebih dari dua tabel sekaligus dalam satu query."),
    L("join-complex", "JOIN dengan Kondisi Kompleks", "... ON a.id = b.id AND a.tanggal <= b.tanggal", "SELECT * FROM orders o JOIN employees e ON o.employee_id = e.employee_id AND e.region = 'Jawa Barat';", "Kondisi ON boleh lebih dari satu perbandingan, digabung dengan AND/OR seperti WHERE.")
  ];

  const LEVEL4 = [
    L("subquery", "Subquery", "SELECT * FROM tabel WHERE kolom = (SELECT ...)", "SELECT * FROM sales WHERE Total_Sales > (SELECT AVG(Total_Sales) FROM sales);", "Query di dalam query. Subquery dievaluasi dulu, hasilnya dipakai oleh query utama."),
    L("correlated-subquery", "Correlated Subquery", "SELECT * FROM a WHERE kolom > (SELECT ... FROM b WHERE b.id = a.id)", "SELECT * FROM employees e WHERE Salary > (SELECT AVG(Salary) FROM employees e2 WHERE e2.Department = e.Department);", "Subquery yang merujuk ke tabel di query luar — dijalankan ulang untuk tiap baris query utama, sehingga lebih lambat tapi sangat fleksibel."),
    L("cte", "CTE (Common Table Expression)", "WITH nama AS (SELECT ...) SELECT * FROM nama;", "WITH ringkasan AS (SELECT Category, SUM(Total_Sales) as total FROM sales GROUP BY Category) SELECT * FROM ringkasan WHERE total > 1000000;", "Mendefinisikan 'tabel sementara' bernama agar query kompleks lebih mudah dibaca & dipecah bertahap."),
    L("union", "UNION", "SELECT ... UNION SELECT ...", "SELECT Customer_Name FROM sales UNION SELECT Name FROM customers;", "Menggabungkan hasil dua query menjadi satu, otomatis membuang baris duplikat."),
    L("union-all", "UNION ALL", "SELECT ... UNION ALL SELECT ...", "SELECT Region FROM sales UNION ALL SELECT Province FROM customers;", "Sama seperti UNION tapi TIDAK membuang duplikat — lebih cepat karena tidak perlu pengecekan duplikat."),
    L("intersect", "INTERSECT", "SELECT ... INTERSECT SELECT ...", "SELECT Customer_ID FROM sales INTERSECT SELECT Customer_ID FROM customers;", "Hanya menampilkan baris yang muncul di KEDUA hasil query."),
    L("except", "EXCEPT", "SELECT ... EXCEPT SELECT ...", "SELECT Customer_ID FROM customers EXCEPT SELECT Customer_ID FROM sales;", "Menampilkan baris dari query pertama yang TIDAK muncul di query kedua (di SQL Server disebut MINUS di beberapa engine lain)."),
    L("exists", "EXISTS", "WHERE EXISTS (SELECT 1 FROM ... WHERE ...)", "SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);", "Mengecek apakah subquery menghasilkan minimal satu baris — lebih efisien dibanding IN untuk data besar."),
    L("not-exists", "NOT EXISTS", "WHERE NOT EXISTS (SELECT 1 FROM ... WHERE ...)", "SELECT * FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);", "Kebalikan EXISTS — mencari baris yang TIDAK punya pasangan pada subquery, misalnya pelanggan yang belum pernah order."),
    L("window-intro", "Window Functions", "FUNGSI() OVER (PARTITION BY ... ORDER BY ...)", "SELECT *, SUM(Total_Sales) OVER (PARTITION BY Region) as total_region FROM sales;", "Menghitung nilai berbasis 'jendela' baris terkait TANPA meringkas baris seperti GROUP BY — jumlah baris hasil tetap sama."),
    L("row-number", "ROW_NUMBER", "ROW_NUMBER() OVER (ORDER BY kolom)", "SELECT *, ROW_NUMBER() OVER (ORDER BY Total_Sales DESC) as no FROM sales;", "Memberi nomor urut unik 1,2,3,... pada tiap baris sesuai urutan yang ditentukan."),
    L("rank", "RANK", "RANK() OVER (ORDER BY kolom DESC)", "SELECT *, RANK() OVER (ORDER BY Total_Sales DESC) as ranking FROM sales;", "Memberi ranking; jika ada nilai yang sama (seri), ranking berikutnya akan 'melompat' (mis. 1,2,2,4)."),
    L("dense-rank", "DENSE_RANK", "DENSE_RANK() OVER (ORDER BY kolom DESC)", "SELECT *, DENSE_RANK() OVER (ORDER BY Total_Sales DESC) as ranking FROM sales;", "Sama seperti RANK, tapi TIDAK melompat setelah nilai seri (mis. 1,2,2,3)."),
    L("lag", "LAG", "LAG(kolom, n) OVER (ORDER BY kolom_urut)", "SELECT Date, Total_Sales, LAG(Total_Sales,1) OVER (ORDER BY Date) as sales_sebelumnya FROM sales;", "Mengambil nilai dari N baris SEBELUMNYA — sangat berguna untuk membandingkan periode (mis. penjualan bulan lalu)."),
    L("lead", "LEAD", "LEAD(kolom, n) OVER (ORDER BY kolom_urut)", "SELECT Date, Total_Sales, LEAD(Total_Sales,1) OVER (ORDER BY Date) as sales_berikutnya FROM sales;", "Kebalikan LAG — mengambil nilai dari N baris SETELAHNYA."),
    L("partition-by", "PARTITION BY", "FUNGSI() OVER (PARTITION BY kolom_grup ORDER BY ...)", "SELECT *, RANK() OVER (PARTITION BY Region ORDER BY Total_Sales DESC) as ranking_region FROM sales;", "Membagi data menjadi kelompok-kelompok sebelum window function dihitung ulang dari awal di tiap kelompok.")
  ];

  const LEVEL5 = [
    L("query-optim", "Query Optimization", "Konsep, bukan sintaks tunggal", "-- pilih kolom yang perlu saja, hindari SELECT * pada tabel besar", "Menulis query yang secepat & seefisien mungkin — memilih kolom seperlunya, memfilter sedini mungkin, dan menghindari operasi yang tidak perlu."),
    L("index-concept", "Index Concept", "CREATE INDEX nama_index ON tabel(kolom);", "CREATE INDEX idx_region ON sales(Region);", "Index adalah struktur data tambahan yang mempercepat pencarian pada kolom tertentu, mirip daftar isi buku — dengan trade-off: mempercepat SELECT tapi memperlambat INSERT/UPDATE."),
    L("execution-plan", "Execution Plan Concept", "EXPLAIN QUERY PLAN SELECT ...", "EXPLAIN QUERY PLAN SELECT * FROM sales WHERE Region = 'Bali';", "Menunjukkan BAGAIMANA database engine akan menjalankan query (scan tabel penuh vs pakai index) — berguna untuk mendiagnosis query yang lambat."),
    L("nested-optim", "Nested Query Optimization", "Ganti subquery bersarang dengan JOIN/CTE bila memungkinkan", "-- WITH ringkasan AS (...) SELECT ... FROM ringkasan  (lebih terbaca daripada subquery bersarang 3 tingkat)", "Subquery yang bersarang terlalu dalam sering lebih lambat & sulit dibaca — CTE atau JOIN biasanya jadi alternatif yang lebih baik."),
    L("complex-agg", "Complex Aggregation", "Kombinasi GROUP BY, HAVING, subquery, window function", "SELECT Region, Category, SUM(Total_Sales) FROM sales GROUP BY Region, Category;", "Laporan dunia nyata sering butuh agregasi multi-level (per region DAN per kategori sekaligus)."),
    L("data-cleaning-sql", "Data Cleaning dengan SQL", "TRIM(), UPPER(), REPLACE(), CASE WHEN untuk menstandarkan data", "UPDATE sales SET Customer_Name = TRIM(Customer_Name);", "SQL bisa dipakai langsung untuk membersihkan data yang tidak konsisten sebelum dianalisis."),
    L("data-validation", "Data Validation", "Query untuk memeriksa aturan bisnis (mis. angka tidak boleh negatif)", "SELECT * FROM sales WHERE Total_Sales < 0 OR Quantity <= 0;", "Memastikan data sesuai aturan bisnis yang berlaku — langkah wajib sebelum data dipakai pengambilan keputusan."),
    L("dup-detect", "Duplicate Detection", "GROUP BY kolom_kunci HAVING COUNT(*) > 1", "SELECT Transaction_ID, COUNT(*) FROM sales GROUP BY Transaction_ID HAVING COUNT(*) > 1;", "Menemukan baris yang seharusnya unik tapi tercatat lebih dari sekali."),
    L("anomaly-detect", "Anomaly Detection", "Bandingkan nilai terhadap AVG/MIN/MAX atau rentang wajar", "SELECT * FROM sales WHERE Total_Sales > (SELECT AVG(Total_Sales)*10 FROM sales);", "Mencari nilai yang jauh di luar kewajaran — kandidat kesalahan input atau kejadian tidak biasa yang perlu diperiksa."),
    L("reporting-query", "Reporting Query", "SELECT ringkasan yang siap dipakai laporan / dashboard", "SELECT STRFTIME('%Y-%m', Date) as bulan, SUM(Total_Sales) FROM sales GROUP BY bulan ORDER BY bulan;", "Query yang dirancang khusus agar hasilnya langsung bisa dipakai sebagai tabel laporan atau sumber dashboard."),
    L("financial-analysis", "Financial Analysis Query", "Agregasi Debit/Credit per akun & periode", "SELECT Account_Name, SUM(Debit)-SUM(Credit) as saldo FROM accounting GROUP BY Account_Name;", "Menghitung saldo, laba/rugi, atau rasio keuangan langsung dari data jurnal transaksi."),
    L("sales-analysis", "Sales Analysis", "Agregasi & ranking penjualan per produk/region/waktu", "SELECT Product, SUM(Total_Sales) FROM sales GROUP BY Product ORDER BY SUM(Total_Sales) DESC;", "Menjawab pertanyaan bisnis seperti produk/region terlaris, tren penjualan, dan rata-rata nilai transaksi."),
    L("hr-analysis", "HR Analysis", "Agregasi gaji, performa, turnover per departemen", "SELECT Department, AVG(Salary), AVG(Performance_Score) FROM hr GROUP BY Department;", "Menganalisis data kepegawaian untuk mendukung keputusan SDM (kompensasi, retensi, performa)."),
    L("accounting-analysis", "Accounting Analysis", "Rekonsiliasi & pengecekan keseimbangan debit=kredit", "SELECT SUM(Debit) as total_debit, SUM(Credit) as total_kredit FROM accounting;", "Memastikan total debit sama dengan total kredit (prinsip dasar akuntansi berpasangan) dan menganalisis pergerakan tiap akun.")
  ];

  global.SQLPQ_CurriculumSQL = {
    levels: [
      { level: 1, title: "Level 1 — Basic", topics: LEVEL1 },
      { level: 2, title: "Level 2 — Intermediate", topics: LEVEL2 },
      { level: 3, title: "Level 3 — JOIN", topics: LEVEL3 },
      { level: 4, title: "Level 4 — Advanced", topics: LEVEL4 },
      { level: 5, title: "Level 5 — Professional", topics: LEVEL5 }
    ]
  };
})(window);
