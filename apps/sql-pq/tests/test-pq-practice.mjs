// Test tugas latihan Power Query (js/pq-practice-data.js): setiap tugas harus
//   (a) TIDAK lulus sebelum dikerjakan (kalau lulus, latihannya kosong), dan
//   (b) SELALU bisa diselesaikan dengan mengikuti instruksi sesuai urutan tertulis.
import { loadAll, check, eq, section, finish } from './_harness.mjs';
loadAll();
const G = SQLPQ_DatasetGenerator, P = SQLPQ_PQPractice, PQ = SQLPQ_PowerQuery;
const s = (type, params) => ({ type, params });
const SOLUSI = {
  'clean-sales': [s('removeDuplicates'), s('trim', { column: 'Customer_Name' }), s('filter', { column: 'Quantity', operator: 'notnull' }), s('filter', { column: 'Quantity', operator: '>', value: '0' }), s('changeType', { column: 'Total_Sales', newType: 'REAL' })],
  'clean-accounting': [s('removeDuplicates'), s('filter', { column: 'Department', operator: 'notnull' }), s('trim', { column: 'Account_Name' }), s('changeType', { column: 'Debit', newType: 'REAL' }), s('changeType', { column: 'Credit', newType: 'REAL' })],
  'clean-hr': [s('removeDuplicates'), s('trim', { column: 'Name' }), s('filter', { column: 'Salary', operator: 'notnull' }), s('changeType', { column: 'Performance_Score', newType: 'INTEGER' })],
  'clean-customer': [s('removeDuplicates'), s('trim', { column: 'Name' }), s('filter', { column: 'Customer_ID', operator: 'notnull' }), s('changeType', { column: 'Total_Purchase', newType: 'REAL' })],
  'clean-inventory': [s('removeDuplicates'), s('filter', { column: 'Stock', operator: 'notnull' }), s('filter', { column: 'Stock', operator: '>=', value: '0' }), s('trim', { column: 'Product_Name' }), s('changeType', { column: 'Purchase_Price', newType: 'REAL' })]
};
const SEEDS = 150;
const cats = G.CATEGORY_META.map((c) => c.key);

section('Struktur tugas');
eq(P.TASKS.map((t) => t.category).sort(), [...cats].sort(), 'ada satu tugas untuk setiap kategori dataset');
eq(new Set(P.TASKS.map((t) => t.id)).size, P.TASKS.length, 'id tugas unik');
P.TASKS.forEach((t) => {
  check(t.title && t.instructions.length >= 3 && t.validators.length >= 3, `${t.id}: judul, instruksi, validator terisi`);
  check(t.validators.every((v) => v.label && typeof v.check === 'function'), `${t.id}: setiap validator punya label & fungsi check`);
  check(!!SOLUSI[t.id], `${t.id}: test ini punya solusi acuan`);
});

section('Helper validator');
const T = (rows, cols) => ({ columns: cols || [{ name: 'A', type: 'TEXT' }], rows });
eq(P.hasDuplicateRows(T([{ A: 1 }, { A: 1 }])), true, 'hasDuplicateRows: ada duplikat');
eq(P.hasDuplicateRows(T([{ A: 1 }, { A: 2 }])), false, 'hasDuplicateRows: tidak ada');
eq(P.columnIsTrimmed(T([{ A: ' x' }]), 'A'), false, 'columnIsTrimmed: spasi depan terdeteksi');
eq(P.columnIsTrimmed(T([{ A: 'a  b' }]), 'A'), false, 'columnIsTrimmed: spasi ganda di tengah terdeteksi');
eq(P.columnIsTrimmed(T([{ A: 'a b' }, { A: null }]), 'A'), true, 'columnIsTrimmed: rapi & null diabaikan');
eq(P.noNullIn(T([{ A: 'x' }, { A: '' }]), 'A'), false, 'noNullIn: string kosong dihitung kosong');
eq(P.noNullIn(T([{ A: 0 }]), 'A'), true, 'noNullIn: angka 0 BUKAN kosong');
eq(P.noNegativeOrZero(T([{ A: 1 }, { A: 0 }]), 'A'), false, 'noNegativeOrZero: 0 ditolak');
eq(P.columnTypeIs(T([], [{ name: 'A', type: 'REAL' }]), 'A', 'REAL'), true, 'columnTypeIs');
eq(P.columnTypeIs(T([]), 'Z', 'REAL'), false, 'columnTypeIs: kolom tak ada → false');

section(`Tidak lulus sebelum dikerjakan & selalu bisa diselesaikan (${SEEDS} dataset per tugas)`);
for (const task of P.TASKS) {
  let lulusTanpaKerja = 0, gagalSetelahSolusi = 0, contoh = '';
  for (let i = 0; i < SEEDS; i++) {
    const ds = G.generate({ category: task.category, rows: 60, dirty: true, seed: 'pq' + i });
    if (task.prepare) task.prepare(ds); // sama seperti yang dilakukan app.js saat tugas dimulai
    const awal = { columns: ds.columns, rows: ds.rows };
    if (task.validators.every((v) => v.check(awal))) lulusTanpaKerja++;
    const akhir = PQ.runPipeline(awal, SOLUSI[task.id]);
    const gagal = task.validators.filter((v) => !v.check(akhir)).map((v) => v.label);
    if (gagal.length) { gagalSetelahSolusi++; contoh = gagal.join(', '); }
  }
  eq(lulusTanpaKerja, 0, `${task.id}: tidak ada dataset yang sudah lulus sebelum dikerjakan`);
  eq(gagalSetelahSolusi, 0, `${task.id}: solusi sesuai instruksi lulus di semua dataset` + (contoh ? ' — gagal: ' + contoh : ''));
}

section('Langkah Change Type bermakna (kolom target awalnya TEKS)');
for (const task of P.TASKS) {
  check(typeof task.prepare === 'function', `${task.id}: punya prepare() untuk menyiapkan data latihan`);
  const ds = task.prepare(G.generate({ category: task.category, rows: 40, dirty: true, seed: 'tipe' }));
  const tipeValidators = task.validators.filter((v) => /bertipe/.test(v.label));
  check(tipeValidators.length >= 1, `${task.id}: ada validator tipe kolom`);
  check(tipeValidators.every((v) => !v.check({ columns: ds.columns, rows: ds.rows })), `${task.id}: validator tipe TIDAK lulus sebelum Change Type dikerjakan`);
  const targets = ds.columns.filter((c) => c.type === 'TEXT' && ds.rows.some((r) => typeof r[c.name] === 'string' && r[c.name] !== '' && !isNaN(Number(r[c.name]))));
  check(targets.length >= 1 && ds.rows.every((r) => targets.every((c) => r[c.name] === null || typeof r[c.name] === 'string')), `${task.id}: nilai kolom target berupa string`);
}
const orig = G.generate({ category: 'sales', rows: 10, seed: 'imm' });
const snapshot = JSON.stringify(orig.columns.map((c) => [c.name, c.type]));
P.textColumns(['Zzz'])(G.generate({ category: 'sales', rows: 10, seed: 'imm' }));
eq(JSON.stringify(orig.columns.map((c) => [c.name, c.type])), snapshot, 'textColumns hanya menyentuh kolom yang disebut (nama tak ada → tak ada efek)');

section('Validator benar-benar memeriksa (solusi sebagian tidak lulus)');
for (const task of P.TASKS) {
  const ds = G.generate({ category: task.category, rows: 60, dirty: true, seed: 'pq-partial' });
  if (task.prepare) task.prepare(ds);
  const awal = { columns: ds.columns, rows: ds.rows };
  const sebagian = PQ.runPipeline(awal, SOLUSI[task.id].slice(0, -1)); // tanpa langkah terakhir (change type)
  check(!task.validators.every((v) => v.check(sebagian)), `${task.id}: melewatkan satu langkah → tidak lulus`);
}

finish('test-pq-practice');
