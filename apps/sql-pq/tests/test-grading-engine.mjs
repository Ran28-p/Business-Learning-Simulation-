// Test penilaian SQL (js/grading-engine.js) — jantung simulator SQL.
// Query dieksekusi sungguhan di SQLite/WASM (sql.js vendor), bukan di-mock.
import { loadAll, check, eq, section, finish } from './_harness.mjs';
loadAll();
const E = SQLPQ_Engine, GR = SQLPQ_Grading, G = SQLPQ_DatasetGenerator;

await E.ensureLoaded();
E.resetDb();
await E.loadDataset(G.generate({ category: 'sales', rows: 80, seed: 'grading' }));
const Q = (over) => Object.assign({ expectedSql: 'SELECT 1', orderMatters: false }, over);

section('normalizeCell');
eq(GR.normalizeCell(null), '␀NULL␀', 'null → penanda khusus');
eq(GR.normalizeCell(undefined), '␀NULL␀', 'undefined diperlakukan sama seperti null');
check(GR.normalizeCell(0.1 + 0.2) === GR.normalizeCell(0.3), '0.1+0.2 dianggap sama dengan 0.3 (toleransi floating point)');
check(GR.normalizeCell('  Bali ') === GR.normalizeCell('bali'), 'teks: abaikan spasi tepi & huruf besar/kecil');
check(GR.normalizeCell(5) !== GR.normalizeCell('5'), 'angka 5 ≠ teks "5" (tipe dibedakan)');
check(GR.normalizeCell(null) !== GR.normalizeCell('null'), 'NULL sungguhan ≠ teks "null"');

section('compareResultSets');
const R = (columns, values) => ({ columns, values });
eq(GR.compareResultSets(R(['a'], [[1]]), R(['a'], [[1]])).correct, true, 'hasil identik → benar');
eq(GR.compareResultSets(R(['a', 'b'], [[1, 2]]), R(['a'], [[1]])).reason, 'column_count', 'jumlah kolom beda terdeteksi');
eq(GR.compareResultSets(R(['a'], [[1], [2]]), R(['a'], [[1]])).reason, 'row_count', 'jumlah baris beda terdeteksi');
eq(GR.compareResultSets(R(['a'], [[1], [2]]), R(['a'], [[2], [1]])).correct, true, 'urutan diabaikan bila orderMatters=false');
const strict = GR.compareResultSets(R(['a'], [[1], [2]]), R(['a'], [[2], [1]]), { orderMatters: true });
eq(strict.correct, false, 'urutan dipentingkan bila orderMatters=true');
eq(strict.mismatchLocation, { row: 1, column: 'a' }, 'lokasi ketidakcocokan dilaporkan (baris 1, kolom a)');
const dupDiff = GR.compareResultSets(R(['a'], [[1], [1], [2]]), R(['a'], [[1], [2], [2]]));
eq(dupDiff.correct, false, 'multiset: jumlah duplikat berbeda → salah walau himpunan nilai sama');
check(dupDiff.missingExamples.length === 1 && dupDiff.extraExamples.length === 1, 'contoh baris kurang/lebih disertakan untuk umpan balik');
eq(GR.compareResultSets(R(['a'], [[null]]), R(['a'], [[null]])).correct, true, 'NULL vs NULL dianggap sama');
eq(GR.compareResultSets(R(['a'], [[null]]), R(['a'], [[0]])).correct, false, 'NULL ≠ 0');
eq(GR.compareResultSets(R(['a'], []), R(['a'], [])).correct, true, 'dua hasil kosong dianggap sama');

section('isReadOnlyQuery');
const ro = GR.isReadOnlyQuery;
eq(ro('SELECT * FROM sales'), true, 'SELECT diizinkan');
eq(ro('  select 1;  '), true, 'huruf kecil + titik koma penutup diizinkan');
eq(ro('WITH x AS (SELECT 1) SELECT * FROM x'), true, 'WITH ... SELECT diizinkan');
eq(ro('EXPLAIN QUERY PLAN SELECT 1'), true, 'EXPLAIN QUERY PLAN SELECT diizinkan');
for (const bad of ['DELETE FROM sales', 'DROP TABLE sales', 'UPDATE sales SET Quantity=0', 'INSERT INTO sales VALUES (1)',
  'SELECT 1; DROP TABLE sales', 'SELECT 1; SELECT 2', '', '   ', '-- hanya komentar', '/* x */', null, undefined,
  '/* SELECT */ DELETE FROM sales', '-- SELECT\nDELETE FROM sales', 'PRAGMA table_info(sales)', 'CREATE TABLE x(a)', 'ATTACH DATABASE \'x\' AS y']) {
  eq(ro(bad), false, 'ditolak: ' + JSON.stringify(bad));
}

section('gradeQuery — integrasi dengan SQLite sungguhan');
const before = E.rowCount('sales');
let r = GR.gradeQuery('', Q());
check(r.correct === false && /kosong/i.test(r.error), 'query kosong → pesan "kosong"');
r = GR.gradeQuery('DELETE FROM sales', Q());
check(r.correct === false && /tepat satu query baca/i.test(r.error), 'DELETE ditolak dengan pesan edukatif');
eq(E.rowCount('sales'), before, 'dataset TIDAK berubah setelah percobaan DELETE');
r = GR.gradeQuery('SELECT 1; DROP TABLE sales', Q());
check(r.correct === false, 'multi-statement ditolak');
check(E.listTables().includes('sales'), 'tabel sales masih ada setelah percobaan DROP');
r = GR.gradeQuery('SELEC * FRO sales', Q());
check(r.correct === false && /tepat satu query baca/i.test(r.error), 'kata kunci salah ketik di awal → ditolak filter read-only (tanpa exception)');
r = GR.gradeQuery('SELECT FROM WHERE sales', Q());
check(r.correct === false && /error/i.test(r.error), 'syntax error di dalam SELECT → pesan error, tidak melempar exception');
r = GR.gradeQuery('SELECT * FROM tabel_tidak_ada', Q());
check(r.correct === false && /error/i.test(r.error), 'tabel tidak ada → pesan error');
r = GR.gradeQuery('SELECT 1', Q({ expectedSql: 'SELECT * FROM tabel_tidak_ada' }));
check(r.correct === false && /internal/i.test(r.error), 'expectedSql rusak dilaporkan sebagai masalah internal (bukan salah siswa)');

const q = Q({ expectedSql: 'SELECT Region, SUM(Total_Sales) AS t FROM sales GROUP BY Region' });
eq(GR.gradeQuery(q.expectedSql, q).correct, true, 'jawaban identik dengan kunci → benar');
eq(GR.gradeQuery('select region as r, sum(total_sales) from sales group by region order by 1 desc', q).correct, true,
  'query BERBEDA dengan hasil sama (alias, urutan, huruf kecil) → tetap benar');
r = GR.gradeQuery('SELECT Region, SUM(Total_Sales) AS t FROM sales WHERE Quantity > 3 GROUP BY Region', q);
check(r.correct === false && r.reason, 'filter tambahan yang mengubah hasil → salah dengan alasan');
r = GR.gradeQuery('SELECT Region FROM sales GROUP BY Region', q);
eq(r.reason, 'column_count', 'kolom kurang → alasan column_count');
check(r.userResult && r.expectedResult, 'hasil user & kunci ikut dikembalikan untuk ditampilkan UI');

const ordered = Q({ expectedSql: 'SELECT Customer_Name, Total_Sales FROM sales ORDER BY Total_Sales DESC, Customer_Name LIMIT 5', orderMatters: true });
eq(GR.gradeQuery(ordered.expectedSql, ordered).correct, true, 'ORDER BY + LIMIT: jawaban benar lolos');
r = GR.gradeQuery('SELECT Customer_Name, Total_Sales FROM sales ORDER BY Total_Sales ASC, Customer_Name LIMIT 5', ordered);
eq(r.correct, false, 'urutan terbalik pada soal orderMatters → salah');

finish('test-grading-engine');
