/**
 * relational-dataset.js
 * Skema mini relasional (customers, products, orders, employees) khusus
 * untuk latihan JOIN, subquery, CTE, dan window function — melengkapi
 * dataset "flat" dari dataset-generator.js. Ukurannya sengaja kecil-menengah
 * agar hasil JOIN mudah dibaca & diverifikasi manual oleh pemula.
 */
(function (global) {
  "use strict";
  const H = () => global.SQLPQ_DatasetGenerator._helpers;

  function pad(n, len) { return String(n).padStart(len, "0"); }

  function generateRelationalDB(scale) {
    const { rnd, pick, randomDateISO } = H();
    scale = scale || "medium"; // small | medium | large
    const nCustomers = { small: 15, medium: 40, large: 150 }[scale];
    const nProducts = { small: 10, medium: 20, large: 40 }[scale];
    const nEmployees = { small: 5, medium: 8, large: 15 }[scale];
    const nOrders = { small: 40, medium: 150, large: 800 }[scale];

    const cities = [["Bandung", "Jawa Barat"], ["Surabaya", "Jawa Timur"], ["Semarang", "Jawa Tengah"],
      ["Jakarta", "DKI Jakarta"], ["Medan", "Sumatera Utara"], ["Denpasar", "Bali"], ["Tasikmalaya", "Jawa Barat"]];
    const names = ["Andi Saputra", "Budi Santoso", "Citra Dewi", "Dewi Lestari", "Eka Pratama", "Farhan Hakim",
      "Gita Permata", "Hendra Wijaya", "Indah Puspita", "Joko Susilo", "Kartika Sari", "Lukman Hakim",
      "Maya Anggraini", "Nur Aini", "Oscar Ramadhan", "Putri Amelia", "Rudi Hartono", "Siti Rahma"];

    const customers = { name: "customers", label: "customers", columns: [
      { name: "customer_id", type: "INTEGER", key: true },
      { name: "customer_name", type: "TEXT" },
      { name: "city", type: "TEXT" },
      { name: "province", type: "TEXT" },
      { name: "customer_type", type: "TEXT" }
    ], rows: [] };
    for (let i = 1; i <= nCustomers; i++) {
      const [city, province] = pick(cities);
      customers.rows.push({ customer_id: i, customer_name: pick(names), city, province, customer_type: pick(["Retail", "Retail", "Corporate", "VIP"]) });
    }

    const catalog = [
      ["Laptop Pro 14", "Elektronik", 12500000], ["Mouse Wireless", "Elektronik", 145000],
      ["Meja Kantor", "Furnitur", 1750000], ["Kursi Ergonomis", "Furnitur", 2100000],
      ["Kertas A4 (rim)", "ATK", 52000], ["Printer Inkjet", "Elektronik", 1650000],
      ["Lemari Arsip", "Furnitur", 2350000], ["Spidol Whiteboard", "ATK", 12000],
      ["Monitor 24 inch", "Elektronik", 1950000], ["Rak Buku", "Furnitur", 890000],
      ["Stapler Besar", "ATK", 65000], ["Proyektor Mini", "Elektronik", 3200000],
      ["Keyboard Mekanik", "Elektronik", 620000], ["Kalkulator", "ATK", 85000]
    ];
    const products = { name: "products", label: "products", columns: [
      { name: "product_id", type: "INTEGER", key: true },
      { name: "product_name", type: "TEXT" },
      { name: "category", type: "TEXT" },
      { name: "unit_price", type: "REAL" }
    ], rows: [] };
    for (let i = 1; i <= nProducts; i++) {
      const [pn, cat, price] = catalog[(i - 1) % catalog.length];
      products.rows.push({ product_id: i, product_name: pn + (i > catalog.length ? " " + i : ""), category: cat, unit_price: price });
    }

    const employees = { name: "employees", label: "employees", columns: [
      { name: "employee_id", type: "INTEGER", key: true },
      { name: "employee_name", type: "TEXT" },
      { name: "region", type: "TEXT" },
      { name: "role", type: "TEXT" },
      { name: "manager_id", type: "INTEGER" }
    ], rows: [] };
    const regions = ["Jawa Barat", "Jawa Timur", "DKI Jakarta", "Jawa Tengah", "Sumatera Utara"];
    for (let i = 1; i <= nEmployees; i++) {
      // employee #1 is the top manager (no manager_id); everyone else
      // reports to someone with a smaller id, so the hierarchy has no cycles.
      const managerId = i === 1 ? null : rnd(1, Math.max(1, Math.floor((i - 1) / 2)));
      employees.rows.push({ employee_id: i, employee_name: pick(names), region: pick(regions), role: i === 1 ? "Sales Manager" : pick(["Sales Executive", "Account Manager", "Sales Executive"]), manager_id: managerId });
    }

    const orders = { name: "orders", label: "orders", columns: [
      { name: "order_id", type: "INTEGER", key: true },
      { name: "order_date", type: "DATE" },
      { name: "customer_id", type: "INTEGER" },
      { name: "product_id", type: "INTEGER" },
      { name: "employee_id", type: "INTEGER" },
      { name: "quantity", type: "INTEGER" },
      { name: "total_amount", type: "REAL" }
    ], rows: [] };
    for (let i = 1; i <= nOrders; i++) {
      const cust = pick(customers.rows);
      const prod = pick(products.rows);
      const emp = pick(employees.rows);
      const qty = rnd(1, 8);
      orders.rows.push({
        order_id: i,
        order_date: randomDateISO(2024, 2026),
        customer_id: cust.customer_id,
        product_id: prod.product_id,
        employee_id: emp.employee_id,
        quantity: qty,
        total_amount: Math.round(qty * prod.unit_price * 100) / 100
      });
    }

    return { customers, products, employees, orders };
  }

  global.SQLPQ_RelationalDataset = { generateRelationalDB };
})(window);
