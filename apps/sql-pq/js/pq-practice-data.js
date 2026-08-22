/**
 * pq-practice-data.js — "Practice Mode": tugas data cleaning terpandu untuk
 * Power Query Simulator. Setiap tugas punya instruksi bertahap dan sejumlah
 * validator yang memeriksa TABEL HASIL AKHIR (bukan urutan langkah persis) —
 * jadi pengguna bebas memilih urutan/step apa pun, yang penting hasilnya benar.
 */
(function (global) {
  "use strict";

  function hasDuplicateRows(table) {
    const seen = new Set();
    for (const row of table.rows) {
      const key = table.columns.map((c) => row[c.name]).join("\u0001");
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }
  function columnIsTrimmed(table, col) {
    return table.rows.every((r) => {
      const v = r[col];
      if (typeof v !== "string") return true;
      return v === v.trim().replace(/\s+/g, " ");
    });
  }
  function noNullIn(table, col) {
    return table.rows.every((r) => r[col] !== null && r[col] !== undefined && r[col] !== "");
  }
  function noNegativeOrZero(table, col) {
    return table.rows.every((r) => r[col] == null || Number(r[col]) > 0);
  }
  function columnTypeIs(table, col, type) {
    const c = table.columns.find((cc) => cc.name === col);
    return !!c && c.type === type;
  }
  function hasColumn(table, col) { return table.columns.some((c) => c.name === col); }

  const TASKS = [
    {
      id: "clean-sales",
      title: "Bersihkan Dataset Sales",
      category: "sales",
      instructions: [
        "Hapus baris duplikat (Remove Duplicates)",
        "Hilangkan spasi berlebih pada kolom Customer_Name (Trim)",
        "Hapus baris dengan Quantity kosong (NULL) ATAU bernilai ≤ 0 (gunakan Filter Rows, boleh dua langkah)",
        "Ubah tipe kolom Total_Sales menjadi Decimal (Change Type)"
      ],
      validators: [
        { label: "Tidak ada baris duplikat", check: (t) => !hasDuplicateRows(t) },
        { label: "Customer_Name sudah di-trim (tidak ada spasi berlebih)", check: (t) => columnIsTrimmed(t, "Customer_Name") },
        { label: "Tidak ada Quantity kosong/≤0", check: (t) => t.rows.every((r) => r.Quantity != null && Number(r.Quantity) > 0) },
        { label: "Total_Sales bertipe Decimal", check: (t) => columnTypeIs(t, "Total_Sales", "REAL") }
      ]
    },
    {
      id: "clean-accounting",
      title: "Bersihkan Dataset Accounting",
      category: "accounting",
      instructions: [
        "Hapus baris duplikat",
        "Hapus baris yang Department-nya kosong (NULL) — gunakan Filter Rows",
        "Hilangkan spasi berlebih pada kolom Account_Name (Trim)",
        "Ubah tipe kolom Debit dan Credit menjadi Decimal (dua langkah Change Type)"
      ],
      validators: [
        { label: "Tidak ada baris duplikat", check: (t) => !hasDuplicateRows(t) },
        { label: "Tidak ada Department kosong", check: (t) => noNullIn(t, "Department") },
        { label: "Account_Name sudah di-trim", check: (t) => columnIsTrimmed(t, "Account_Name") },
        { label: "Debit bertipe Decimal", check: (t) => columnTypeIs(t, "Debit", "REAL") },
        { label: "Credit bertipe Decimal", check: (t) => columnTypeIs(t, "Credit", "REAL") }
      ]
    },
    {
      id: "clean-hr",
      title: "Bersihkan Dataset HR",
      category: "hr",
      instructions: [
        "Hapus baris duplikat",
        "Hilangkan spasi berlebih pada kolom Name (Trim)",
        "Hapus baris dengan Salary kosong (NULL) — gunakan Filter Rows",
        "Ubah tipe kolom Performance_Score menjadi Whole Number"
      ],
      validators: [
        { label: "Tidak ada baris duplikat", check: (t) => !hasDuplicateRows(t) },
        { label: "Name sudah di-trim", check: (t) => columnIsTrimmed(t, "Name") },
        { label: "Tidak ada Salary kosong", check: (t) => noNullIn(t, "Salary") },
        { label: "Performance_Score bertipe Whole Number", check: (t) => columnTypeIs(t, "Performance_Score", "INTEGER") }
      ]
    },
    {
      id: "clean-customer",
      title: "Bersihkan Dataset Customer",
      category: "customers",
      instructions: [
        "Hapus baris duplikat",
        "Hilangkan spasi berlebih pada kolom Name (Trim)",
        "Hapus baris dengan Customer_ID kosong (NULL) — gunakan Filter Rows",
        "Ubah tipe kolom Total_Purchase menjadi Decimal"
      ],
      validators: [
        { label: "Tidak ada baris duplikat", check: (t) => !hasDuplicateRows(t) },
        { label: "Name sudah di-trim", check: (t) => columnIsTrimmed(t, "Name") },
        { label: "Tidak ada Customer_ID kosong", check: (t) => noNullIn(t, "Customer_ID") },
        { label: "Total_Purchase bertipe Decimal", check: (t) => columnTypeIs(t, "Total_Purchase", "REAL") }
      ]
    },
    {
      id: "clean-inventory",
      title: "Bersihkan Dataset Inventory",
      category: "inventory",
      instructions: [
        "Hapus baris duplikat",
        "Hapus baris dengan Stock kosong (NULL) ATAU negatif (gunakan Filter Rows, boleh dua langkah)",
        "Hilangkan spasi berlebih pada kolom Product_Name (Trim)",
        "Ubah tipe kolom Purchase_Price menjadi Decimal"
      ],
      validators: [
        { label: "Tidak ada baris duplikat", check: (t) => !hasDuplicateRows(t) },
        { label: "Tidak ada Stock kosong/negatif", check: (t) => t.rows.every((r) => r.Stock != null && Number(r.Stock) >= 0) },
        { label: "Product_Name sudah di-trim", check: (t) => columnIsTrimmed(t, "Product_Name") },
        { label: "Purchase_Price bertipe Decimal", check: (t) => columnTypeIs(t, "Purchase_Price", "REAL") }
      ]
    }
  ];

  global.SQLPQ_PQPractice = { TASKS, hasDuplicateRows, columnIsTrimmed, noNullIn, noNegativeOrZero, columnTypeIs, hasColumn };
})(window);
