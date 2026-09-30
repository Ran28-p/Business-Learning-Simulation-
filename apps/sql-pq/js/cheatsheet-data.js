/**
 * cheatsheet-data.js — Referensi cepat sintaks SQL inti.
 */
(function (global) {
  "use strict";
  function C(title, syntax, example, note) { return { title, syntax, example, note }; }

  const CHEATS = [
    C("SELECT", "SELECT kolom1, kolom2 FROM tabel;", "SELECT Product, Total_Sales FROM sales;", "Kolom apa saja yang ditampilkan. SELECT * = semua kolom."),
    C("WHERE", "SELECT * FROM tabel WHERE kondisi;", "SELECT * FROM sales WHERE Region = 'Bali';", "Menyaring baris SEBELUM data dikelompokkan/diagregasi."),
    C("GROUP BY", "SELECT kolom, AGG(k2) FROM tabel GROUP BY kolom;", "SELECT Category, SUM(Total_Sales) FROM sales GROUP BY Category;", "Kolom non-agregat wajib ada di GROUP BY."),
    C("HAVING", "... GROUP BY kolom HAVING kondisi_agregat;", "... GROUP BY Category HAVING SUM(Total_Sales) > 1000000;", "Menyaring SETELAH agregasi — boleh pakai SUM/COUNT/AVG."),
    C("JOIN", "SELECT ... FROM a JOIN b ON a.id = b.id;", "SELECT * FROM orders o JOIN customers c ON o.customer_id = c.customer_id;", "INNER JOIN (default), LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN, CROSS JOIN."),
    C("CASE", "CASE WHEN kondisi THEN nilai ELSE default END", "CASE WHEN Score>=85 THEN 'Baik' ELSE 'Cukup' END", "Logika kondisional bertingkat di dalam SELECT."),
    C("SUBQUERY", "SELECT * FROM a WHERE kolom = (SELECT ...);", "SELECT * FROM sales WHERE Total_Sales > (SELECT AVG(Total_Sales) FROM sales);", "Query di dalam query — dievaluasi lebih dulu."),
    C("CTE", "WITH nama AS (SELECT ...) SELECT * FROM nama;", "WITH ring AS (SELECT Category, SUM(Total_Sales) t FROM sales GROUP BY Category) SELECT * FROM ring WHERE t>0;", "'Tabel sementara' bernama, membuat query kompleks lebih terbaca."),
    C("WINDOW FUNCTION", "FUNGSI() OVER (PARTITION BY ... ORDER BY ...)", "RANK() OVER (PARTITION BY Region ORDER BY Total_Sales DESC)", "Tidak meringkas baris seperti GROUP BY — jumlah baris hasil tetap sama."),
    C("UNION", "SELECT ... UNION SELECT ...;", "SELECT City FROM customers UNION SELECT Region FROM sales;", "Menggabungkan hasil dua query, otomatis buang duplikat (UNION ALL = tanpa buang duplikat).")
  ];

  global.SQLPQ_Cheatsheet = { CHEATS };
})(window);
