/**
 * dataset-generator.js
 * Menghasilkan dataset realistis (Sales, Accounting, HR, Inventory, Customer)
 * dengan opsi jumlah baris dan "dirty data" (NULL, duplikat, typo, format
 * tanggal berbeda, nilai ekstrem, data tidak konsisten) untuk latihan SQL &
 * Power Query — termasuk data cleaning.
 */
(function (global) {
  "use strict";

  // Swappable RNG source: defaults to Math.random, but generate() can swap
  // this for a seeded PRNG so a dataset can be reproduced exactly later
  // ("Regenerate dengan seed yang sama" in the Dataset Generator screen).
  let currentRandomFn = Math.random;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  function rnd(min, max) { return Math.floor(currentRandomFn() * (max - min + 1)) + min; }
  function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
  function pad(n, len) { return String(n).padStart(len, "0"); }
  function round2(n) { return Math.round(n * 100) / 100; }

  function randomDateISO(startYear, endYear) {
    const y = rnd(startYear, endYear);
    const m = rnd(1, 12);
    const d = rnd(1, 28);
    return `${y}-${pad(m, 2)}-${pad(d, 2)}`;
  }

  // Reformat an ISO date into a random "messy" format (for dirty datasets)
  function messyDateFormat(isoDate) {
    const [y, m, d] = isoDate.split("-");
    const style = pick(["iso", "dmy-slash", "dmy-dash", "mdy-slash", "long-id"]);
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    switch (style) {
      case "dmy-slash": return `${d}/${m}/${y}`;
      case "dmy-dash": return `${d}-${m}-${y}`;
      case "mdy-slash": return `${m}/${d}/${y}`;
      case "long-id": return `${parseInt(d, 10)} ${bulan[parseInt(m, 10) - 1]} ${y}`;
      default: return isoDate;
    }
  }

  function typo(str) {
    if (str.length < 4) return str + " ";
    const i = rnd(1, str.length - 2);
    const chars = str.split("");
    const t = pick(["swap", "double-space", "trailing-space", "lowercase"]);
    if (t === "swap") { const tmp = chars[i]; chars[i] = chars[i + 1]; chars[i + 1] = tmp; return chars.join(""); }
    if (t === "double-space") return str.slice(0, i) + "  " + str.slice(i);
    if (t === "lowercase") return str.toLowerCase();
    return str + "   ";
  }

  // Injects NULLs, duplicate rows, typos, extreme values, inconsistent
  // formatting into an already-generated {columns, rows} dataset.
  function makeDirty(dataset, opts) {
    opts = opts || {};
    const nullRate = opts.nullRate != null ? opts.nullRate : 0.04;
    const dupRate = opts.dupRate != null ? opts.dupRate : 0.03;
    const typoRate = opts.typoRate != null ? opts.typoRate : 0.05;
    const extremeRate = opts.extremeRate != null ? opts.extremeRate : 0.015;

    const nullableCols = dataset.columns.filter((c) => !c.key).map((c) => c.name);
    const textCols = dataset.columns.filter((c) => c.type === "TEXT" && !c.key).map((c) => c.name);
    const numCols = dataset.columns.filter((c) => c.type === "REAL" || c.type === "INTEGER").filter((c) => !c.key).map((c) => c.name);
    const dateCols = dataset.columns.filter((c) => c.type === "DATE").map((c) => c.name);

    dataset.rows.forEach((row) => {
      if (nullableCols.length && currentRandomFn() < nullRate) {
        row[pick(nullableCols)] = null;
      }
      if (textCols.length && currentRandomFn() < typoRate) {
        const col = pick(textCols);
        if (row[col] != null) row[col] = typo(String(row[col]));
      }
      if (numCols.length && currentRandomFn() < extremeRate) {
        const col = pick(numCols);
        if (typeof row[col] === "number") row[col] = row[col] * pick([50, 100, -1]);
      }
      dateCols.forEach((col) => {
        if (row[col] && currentRandomFn() < 0.35) row[col] = messyDateFormat(row[col]);
      });
    });

    // Duplicate a percentage of rows (append clones, sometimes with the key
    // column repeated too, which is exactly the kind of duplicate that
    // real-world data cleaning exercises look for).
    const dupCount = Math.max(0, Math.round(dataset.rows.length * dupRate));
    for (let i = 0; i < dupCount; i++) {
      const src = pick(dataset.rows);
      dataset.rows.push(Object.assign({}, src));
    }

    dataset.isDirty = true;
    return dataset;
  }

  // ---------------------------------------------------------------- SALES --
  const SALES_PRODUCTS = [
    ["Laptop Pro 14", "Elektronik", 12500000], ["Mouse Wireless", "Elektronik", 145000],
    ["Meja Kantor", "Furnitur", 1750000], ["Kursi Ergonomis", "Furnitur", 2100000],
    ["Kertas A4 (rim)", "ATK", 52000], ["Printer Inkjet", "Elektronik", 1650000],
    ["Lemari Arsip", "Furnitur", 2350000], ["Spidol Whiteboard", "ATK", 12000],
    ["Monitor 24 inch", "Elektronik", 1950000], ["Rak Buku", "Furnitur", 890000],
    ["Stapler Besar", "ATK", 65000], ["Proyektor Mini", "Elektronik", 3200000]
  ];
  const REGIONS = ["Jawa Barat", "Jawa Timur", "Jawa Tengah", "DKI Jakarta", "Sumatera Utara", "Bali", "Kalimantan Timur", "Sulawesi Selatan"];
  const NAMES = ["Andi Saputra", "Budi Santoso", "Citra Dewi", "Dewi Lestari", "Eka Pratama", "Farhan Hakim",
    "Gita Permata", "Hendra Wijaya", "Indah Puspita", "Joko Susilo", "Kartika Sari", "Lukman Hakim",
    "Maya Anggraini", "Nur Aini", "Oscar Ramadhan", "Putri Amelia", "Rudi Hartono", "Siti Rahma",
    "Taufik Hidayat", "Umi Kalsum", "Vino Bastian", "Wulan Sari", "Yusuf Ardiansyah", "Zahra Aulia"];

  function generateSales(n) {
    const columns = [
      { name: "Transaction_ID", type: "TEXT", key: true },
      { name: "Date", type: "DATE" },
      { name: "Customer_ID", type: "TEXT" },
      { name: "Customer_Name", type: "TEXT" },
      { name: "Product", type: "TEXT" },
      { name: "Category", type: "TEXT" },
      { name: "Region", type: "TEXT" },
      { name: "Quantity", type: "INTEGER" },
      { name: "Unit_Price", type: "REAL" },
      { name: "Discount", type: "REAL" },
      { name: "Tax", type: "REAL" },
      { name: "Total_Sales", type: "REAL" }
    ];
    const rows = [];
    for (let i = 1; i <= n; i++) {
      const [product, category, basePrice] = pick(SALES_PRODUCTS);
      const qty = rnd(1, 12);
      const unitPrice = basePrice;
      const discount = pick([0, 0, 0, 0.05, 0.1, 0.15]);
      const subtotal = qty * unitPrice * (1 - discount);
      const tax = round2(subtotal * 0.11);
      rows.push({
        Transaction_ID: "TRX" + pad(i, 6),
        Date: randomDateISO(2024, 2026),
        Customer_ID: "CUST" + pad(rnd(1, Math.max(20, Math.round(n / 3))), 4),
        Customer_Name: pick(NAMES),
        Product: product,
        Category: category,
        Region: pick(REGIONS),
        Quantity: qty,
        Unit_Price: unitPrice,
        Discount: discount,
        Tax: tax,
        Total_Sales: round2(subtotal + tax)
      });
    }
    return { name: "sales", label: "Sales (Penjualan)", columns, rows };
  }

  // ------------------------------------------------------------ ACCOUNTING --
  const ACCOUNTS = [
    ["1101", "Kas"], ["1102", "Bank"], ["1201", "Piutang Usaha"], ["1301", "Persediaan"],
    ["2101", "Utang Usaha"], ["2201", "Utang Bank"], ["3101", "Modal"], ["4101", "Pendapatan Jasa"],
    ["4102", "Pendapatan Penjualan"], ["5101", "Beban Gaji"], ["5102", "Beban Sewa"],
    ["5103", "Beban Listrik & Air"], ["5104", "Beban Perlengkapan"], ["5105", "Beban Penyusutan"]
  ];
  const DEPARTMENTS = ["Keuangan", "Operasional", "Pemasaran", "SDM", "Produksi", "Umum"];

  function generateAccounting(n) {
    const columns = [
      { name: "Transaction_ID", type: "TEXT", key: true },
      { name: "Date", type: "DATE" },
      { name: "Account_Code", type: "TEXT" },
      { name: "Account_Name", type: "TEXT" },
      { name: "Description", type: "TEXT" },
      { name: "Debit", type: "REAL" },
      { name: "Credit", type: "REAL" },
      { name: "Balance", type: "REAL" },
      { name: "Department", type: "TEXT" }
    ];
    const rows = [];
    let runningBalance = 0;
    for (let i = 1; i <= n; i++) {
      const [code, name] = pick(ACCOUNTS);
      const isDebit = currentRandomFn() < 0.5;
      const amount = round2(rnd(50, 4500) * 1000 * (currentRandomFn() * 0.5 + 0.5));
      const debit = isDebit ? amount : 0;
      const credit = isDebit ? 0 : amount;
      runningBalance = round2(runningBalance + debit - credit);
      rows.push({
        Transaction_ID: "JRN" + pad(i, 6),
        Date: randomDateISO(2024, 2026),
        Account_Code: code,
        Account_Name: name,
        Description: pick(["Pembayaran vendor", "Penerimaan kas", "Pembelian perlengkapan", "Pembayaran gaji", "Setoran modal", "Pelunasan piutang", "Pembayaran sewa", "Beban operasional"]),
        Debit: debit,
        Credit: credit,
        Balance: runningBalance,
        Department: pick(DEPARTMENTS)
      });
    }
    return { name: "accounting", label: "Accounting (Akuntansi)", columns, rows };
  }

  // -------------------------------------------------------------------- HR --
  const POSITIONS = ["Staff Admin", "Staff Keuangan", "Supervisor", "Manager", "Analis Pajak", "HR Officer", "Staff Produksi", "IT Support"];
  const HR_DEPTS = ["Keuangan", "Operasional", "Pemasaran", "SDM", "Produksi", "IT"];

  function generateHR(n) {
    const columns = [
      { name: "Employee_ID", type: "TEXT", key: true },
      { name: "Name", type: "TEXT" },
      { name: "Gender", type: "TEXT" },
      { name: "Department", type: "TEXT" },
      { name: "Position", type: "TEXT" },
      { name: "Join_Date", type: "DATE" },
      { name: "Salary", type: "REAL" },
      { name: "Status", type: "TEXT" },
      { name: "Performance_Score", type: "INTEGER" }
    ];
    const rows = [];
    for (let i = 1; i <= n; i++) {
      rows.push({
        Employee_ID: "EMP" + pad(i, 4),
        Name: pick(NAMES),
        Gender: pick(["Laki-laki", "Perempuan"]),
        Department: pick(HR_DEPTS),
        Position: pick(POSITIONS),
        Join_Date: randomDateISO(2016, 2025),
        Salary: round2(rnd(4500, 18000) * 1000),
        Status: pick(["Aktif", "Aktif", "Aktif", "Cuti", "Resign"]),
        Performance_Score: rnd(60, 100)
      });
    }
    return { name: "hr", label: "HR (Kepegawaian)", columns, rows };
  }

  // ------------------------------------------------------------- INVENTORY --
  const SUPPLIERS = ["CV Sumber Makmur", "PT Cipta Sejahtera", "UD Berkah Jaya", "PT Nusantara Prima", "CV Mitra Abadi", "PT Sinar Jaya"];

  function generateInventory(n) {
    const columns = [
      { name: "Product_ID", type: "TEXT", key: true },
      { name: "Product_Name", type: "TEXT" },
      { name: "Category", type: "TEXT" },
      { name: "Supplier", type: "TEXT" },
      { name: "Stock", type: "INTEGER" },
      { name: "Minimum_Stock", type: "INTEGER" },
      { name: "Purchase_Price", type: "REAL" },
      { name: "Selling_Price", type: "REAL" }
    ];
    const rows = [];
    for (let i = 1; i <= n; i++) {
      const [product, category, basePrice] = pick(SALES_PRODUCTS);
      const purchase = round2(basePrice * 0.7);
      rows.push({
        Product_ID: "PRD" + pad(i, 4),
        Product_Name: product + " #" + i,
        Category: category,
        Supplier: pick(SUPPLIERS),
        Stock: rnd(0, 500),
        Minimum_Stock: rnd(10, 50),
        Purchase_Price: purchase,
        Selling_Price: round2(purchase * (1 + rnd(15, 40) / 100))
      });
    }
    return { name: "inventory", label: "Inventory (Persediaan)", columns, rows };
  }

  // -------------------------------------------------------------- CUSTOMER --
  const CITIES = [["Bandung", "Jawa Barat"], ["Surabaya", "Jawa Timur"], ["Semarang", "Jawa Tengah"],
    ["Jakarta", "DKI Jakarta"], ["Medan", "Sumatera Utara"], ["Denpasar", "Bali"],
    ["Balikpapan", "Kalimantan Timur"], ["Makassar", "Sulawesi Selatan"], ["Tasikmalaya", "Jawa Barat"], ["Malang", "Jawa Timur"]];

  function generateCustomer(n) {
    const columns = [
      { name: "Customer_ID", type: "TEXT", key: true },
      { name: "Name", type: "TEXT" },
      { name: "Gender", type: "TEXT" },
      { name: "Age", type: "INTEGER" },
      { name: "City", type: "TEXT" },
      { name: "Province", type: "TEXT" },
      { name: "Registration_Date", type: "DATE" },
      { name: "Customer_Type", type: "TEXT" },
      { name: "Total_Purchase", type: "REAL" }
    ];
    const rows = [];
    for (let i = 1; i <= n; i++) {
      const [city, province] = pick(CITIES);
      rows.push({
        Customer_ID: "CUST" + pad(i, 4),
        Name: pick(NAMES),
        Gender: pick(["Laki-laki", "Perempuan"]),
        Age: rnd(19, 60),
        City: city,
        Province: province,
        Registration_Date: randomDateISO(2019, 2026),
        Customer_Type: pick(["Retail", "Retail", "Corporate", "VIP"]),
        Total_Purchase: round2(rnd(200, 25000) * 1000)
      });
    }
    // Named "customer_data" (not "customers") to avoid colliding with the
    // "customers" table used by the relational sample DB (see relational-dataset.js).
    return { name: "customer_data", label: "Customer (Pelanggan)", columns, rows };
  }

  const GENERATORS = {
    sales: generateSales,
    accounting: generateAccounting,
    hr: generateHR,
    inventory: generateInventory,
    customers: generateCustomer
  };

  const CATEGORY_META = [
    { key: "sales", label: "Sales", icon: "🛒", desc: "Transaksi penjualan produk lintas region." },
    { key: "accounting", label: "Accounting", icon: "📒", desc: "Jurnal transaksi debit/kredit multi-departemen." },
    { key: "hr", label: "HR", icon: "🧑\u200d💼", desc: "Data kepegawaian & performa karyawan." },
    { key: "inventory", label: "Inventory", icon: "📦", desc: "Stok produk, supplier, dan harga." },
    { key: "customers", label: "Customer", icon: "👤", desc: "Profil & histori pembelian pelanggan." }
  ];

  const ROW_SIZE_OPTIONS = [20, 50, 100, 500, 1000, 10000];

  /**
   * Generate a dataset. opts: { category, rows, dirty, seed }
   * Passing the same `seed` string always reproduces the exact same dataset
   * (rows, dirty-data placement, everything) — used by the "Regenerate
   * dengan seed yang sama" button in the Dataset Generator screen.
   */
  function generate(opts) {
    const gen = GENERATORS[opts.category];
    if (!gen) throw new Error("Kategori dataset tidak dikenal: " + opts.category);
    const usedSeed = opts.seed != null && opts.seed !== "" ? String(opts.seed) : (Date.now().toString(36) + Math.random().toString(36).slice(2));
    currentRandomFn = mulberry32(hashSeed(usedSeed));
    const dataset = gen(opts.rows || 100);
    if (opts.dirty) makeDirty(dataset, opts.dirtyOptions);
    currentRandomFn = Math.random; // restore default so anything outside generate() is unaffected
    dataset.seed = usedSeed;
    dataset.generatedAt = Date.now();
    return dataset;
  }

  global.SQLPQ_DatasetGenerator = {
    generate,
    GENERATORS,
    CATEGORY_META,
    ROW_SIZE_OPTIONS,
    makeDirty,
    _helpers: { rnd, pick, randomDateISO, messyDateFormat, typo }
  };
})(window);
