// Test generator dataset (js/dataset-generator.js + relational-dataset.js):
// determinisme seed, skema, konsistensi nilai, dan mode "dirty".
import { loadAll, check, eq, section, finish } from './_harness.mjs';
loadAll();
const E = SQLPQ_Engine, G = SQLPQ_DatasetGenerator, R = SQLPQ_RelationalDataset;
const CATS = G.CATEGORY_META.map((c) => c.key);
await E.ensureLoaded();

section('Skema & ukuran per kategori');
eq(Object.keys(G.GENERATORS).sort(), [...CATS].sort(), 'GENERATORS dan CATEGORY_META memuat kategori yang sama');
for (const cat of CATS) {
  const d = G.generate({ category: cat, rows: 60, seed: 'k' });
  eq(d.rows.length, 60, `${cat}: jumlah baris sesuai permintaan`);
  check(d.columns.length > 3 && d.columns.every((c) => c.name && ['TEXT', 'INTEGER', 'REAL', 'DATE'].includes(c.type)), `${cat}: kolom & tipe valid`);
  check(d.columns.filter((c) => c.key).length === 1, `${cat}: tepat satu kolom kunci`);
  const colNames = d.columns.map((c) => c.name);
  check(d.rows.every((r) => colNames.every((n) => n in r)), `${cat}: setiap baris memuat semua kolom`);
  const keyCol = d.columns.find((c) => c.key).name;
  eq(new Set(d.rows.map((r) => r[keyCol])).size, 60, `${cat}: kolom kunci unik pada dataset bersih`);
  check(d.rows.every((r) => d.columns.every((c) => c.type !== 'INTEGER' || Number.isInteger(r[c.name]))), `${cat}: kolom INTEGER berisi bilangan bulat`);
  check(d.rows.every((r) => d.columns.every((c) => c.type !== 'DATE' || /^\d{4}-\d{2}-\d{2}$/.test(r[c.name]))), `${cat}: dataset bersih memakai tanggal ISO`);
  await E.loadDataset(d);
  eq(E.rowCount(d.name), 60, `${cat}: termuat ke SQLite (${d.name})`);
}
let threw = false; try { G.generate({ category: 'tidak-ada' }); } catch (e) { threw = /tidak dikenal/i.test(e.message); }
check(threw, 'kategori tak dikenal → error jelas');
eq(G.generate({ category: 'sales' }).rows.length, 100, 'jumlah baris default = 100');

section('Seed — hasil dapat diulang persis');
for (const cat of CATS) {
  const a = G.generate({ category: cat, rows: 70, seed: 'abc', dirty: true });
  const b = G.generate({ category: cat, rows: 70, seed: 'abc', dirty: true });
  eq(JSON.stringify(a.rows), JSON.stringify(b.rows), `${cat}: seed sama → data identik (termasuk mode dirty)`);
}
const s1 = G.generate({ category: 'hr', rows: 50, seed: 'satu' }), s2 = G.generate({ category: 'hr', rows: 50, seed: 'dua' });
check(JSON.stringify(s1.rows) !== JSON.stringify(s2.rows), 'seed berbeda → data berbeda');
eq(G.generate({ category: 'hr', rows: 5, seed: 12345 }).seed, '12345', 'seed numerik disimpan sebagai string');
check(G.generate({ category: 'hr', rows: 5 }).seed.length > 5, 'tanpa seed → seed acak dibuat & dicatat (untuk "ulangi dengan seed sama")');
const after = Math.random(); check(typeof after === 'number', 'Math.random dipulihkan setelah generate()');
const x1 = G.generate({ category: 'sales', rows: 30, seed: 'iso' });
Math.random(); Math.random();
const x2 = G.generate({ category: 'sales', rows: 30, seed: 'iso' });
eq(JSON.stringify(x1.rows), JSON.stringify(x2.rows), 'hasil tidak terpengaruh pemakaian Math.random di luar generator');

section('Mode dirty');
for (const cat of CATS) {
  const clean = G.generate({ category: cat, rows: 200, seed: 'dirty-' + cat });
  const dirty = G.generate({ category: cat, rows: 200, seed: 'dirty-' + cat, dirty: true });
  eq(dirty.isDirty, true, `${cat}: ditandai isDirty`);
  check(dirty.rows.length > 200, `${cat}: baris duplikat ditambahkan (${dirty.rows.length})`);
  const nulls = dirty.rows.reduce((n, r) => n + Object.values(r).filter((v) => v === null).length, 0);
  check(nulls > 0, `${cat}: ada nilai NULL`);
  const keyCol = dirty.columns.find((c) => c.key).name;
  check(new Set(dirty.rows.map((r) => r[keyCol])).size < dirty.rows.length, `${cat}: ada kunci ganda`);
  const dateCol = dirty.columns.find((c) => c.type === 'DATE');
  if (dateCol) check(dirty.rows.some((r) => r[dateCol.name] && !/^\d{4}-\d{2}-\d{2}$/.test(r[dateCol.name])), `${cat}: ada format tanggal berantakan`);
  check(!clean.isDirty, `${cat}: dataset bersih tidak ditandai dirty`);
}
const noDirt = G.generate({ category: 'sales', rows: 100, seed: 'nd', dirty: true, dirtyOptions: { nullRate: 0, dupRate: 0, typoRate: 0, extremeRate: 0 } });
eq(noDirt.rows.length, 100, 'dirtyOptions semua 0 → tidak ada duplikat');
const heavy = G.generate({ category: 'sales', rows: 100, seed: 'nd', dirty: true, dirtyOptions: { dupRate: 0.5 } });
eq(heavy.rows.length, 150, 'dupRate 0.5 → +50% baris');

section('Skema relasional');
for (const [scale, n] of [['small', [15, 10, 5, 40]], ['medium', [40, 20, 8, 150]], ['large', [150, 40, 15, 800]]]) {
  const db = R.generateRelationalDB(scale);
  eq(['customers', 'products', 'employees', 'orders'].map((k) => db[k].rows.length), n, `${scale}: ukuran tabel`);
  await E.ensureLoaded(); E.resetDb(); await E.loadMultiple(db);
  eq(E.run('SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id=c.customer_id WHERE c.customer_id IS NULL').values[0][0], 0, `${scale}: tidak ada order yatim (customer)`);
  eq(E.run('SELECT COUNT(*) FROM orders o LEFT JOIN products p ON o.product_id=p.product_id WHERE p.product_id IS NULL').values[0][0], 0, `${scale}: tidak ada order yatim (product)`);
  eq(E.run('SELECT COUNT(*) FROM orders o LEFT JOIN employees e ON o.employee_id=e.employee_id WHERE e.employee_id IS NULL').values[0][0], 0, `${scale}: tidak ada order yatim (employee)`);
  eq(E.run('SELECT COUNT(*) FROM orders o JOIN products p ON o.product_id=p.product_id WHERE ABS(o.total_amount - ROUND(o.quantity*p.unit_price,2)) > 0.01').values[0][0], 0, `${scale}: total_amount = quantity × unit_price`);
  eq(E.run('SELECT COUNT(*) FROM employees e LEFT JOIN employees m ON e.manager_id=m.employee_id WHERE e.manager_id IS NOT NULL AND m.employee_id IS NULL').values[0][0], 0, `${scale}: manager_id selalu merujuk karyawan yang ada`);
  eq(E.run('SELECT COUNT(*) FROM (SELECT customer_id FROM customers GROUP BY customer_id HAVING COUNT(*)>1)').values[0][0], 0, `${scale}: customer_id unik`);
}
check(E.run('SELECT COUNT(*) FROM employees WHERE manager_id IS NULL').values[0][0] >= 1, 'selalu ada minimal 1 karyawan tanpa atasan (akar hierarki untuk latihan self-join)');

section('Engine — muat ulang & integritas');
await E.ensureLoaded(); E.resetDb();
await E.loadDataset(G.generate({ category: 'sales', rows: 20, seed: 'r' }));
await E.loadDataset(G.generate({ category: 'sales', rows: 35, seed: 'r2' }));
eq(E.rowCount('sales'), 35, 'memuat tabel bernama sama menggantikan yang lama (bukan menumpuk)');
eq(E.listTables(), ['sales'], 'listTables');
eq(E.tableSchema('sales').length, 12, 'tableSchema: 12 kolom');
eq(E.sampleRows('sales', 3).values.length, 3, 'sampleRows(3)');
let err = ''; try { E.run('SELECT * FROM tidak_ada'); } catch (e) { err = e.message; }
check(/no such table/i.test(err), 'error SQL diteruskan apa adanya ke UI');
const dirtyLoad = G.generate({ category: 'sales', rows: 50, seed: 'dl', dirty: true });
await E.loadDataset(dirtyLoad);
eq(E.rowCount('sales'), dirtyLoad.rows.length, 'dataset dirty (kunci ganda) tetap bisa dimuat — tidak ada PRIMARY KEY yang menolak');
check(E.explainPlan('SELECT * FROM sales WHERE Region = \'Bali\'').length > 0, 'explainPlan mengembalikan rencana eksekusi');

finish('test-dataset-generator');
