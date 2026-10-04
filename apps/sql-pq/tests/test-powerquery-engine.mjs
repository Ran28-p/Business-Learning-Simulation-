// Test mesin Power Query (js/powerquery-engine.js): tiap langkah transformasi,
// sifat immutable, parser rumus yang aman (tanpa eval), dan pembuat M code.
import { loadAll, check, eq, section, finish } from './_harness.mjs';
loadAll();
const PQ = SQLPQ_PowerQuery;

const base = () => ({
  columns: [{ name: 'ID', type: 'INTEGER' }, { name: 'Nama', type: 'TEXT' }, { name: 'Qty', type: 'INTEGER' }, { name: 'Harga', type: 'REAL' }],
  rows: [
    { ID: 1, Nama: '  Andi   Saputra ', Qty: 2, Harga: 100 },
    { ID: 2, Nama: 'Budi', Qty: 0, Harga: 50.5 },
    { ID: 2, Nama: 'Budi', Qty: 0, Harga: 50.5 },
    { ID: 3, Nama: null, Qty: null, Harga: 10 }
  ]
});
const step = (type, params) => ({ type, params });
const run = (t, type, params) => PQ.applyStep(t, step(type, params));
const col = (t, name) => t.rows.map((r) => r[name]);

section('Immutability — tabel asli tidak boleh berubah');
{
  const t = base(); const snap = JSON.stringify(t);
  const types = [['trim', { column: 'Nama' }], ['removeDuplicates'], ['sort', { column: 'Qty', direction: 'desc' }],
    ['filter', { column: 'Qty', operator: '>', value: '0' }], ['renameColumn', { from: 'Nama', to: 'N' }],
    ['removeColumns', { columns: ['Nama'] }], ['changeType', { column: 'Qty', newType: 'TEXT' }],
    ['customColumn', { newName: 'T', formula: '[Qty] * [Harga]' }], ['reverseRows'], ['fillDown', { column: 'Nama' }]];
  types.forEach(([ty, p]) => { run(t, ty, p); });
  eq(JSON.stringify(t), snap, 'menjalankan 10 jenis langkah tidak mengubah tabel sumber');
}

section('Langkah dasar');
{
  const t = base();
  eq(col(run(t, 'trim', { column: 'Nama' }), 'Nama')[0], 'Andi Saputra', 'trim: spasi tepi & ganda dirapikan');
  eq(col(run(t, 'trim', { column: 'Nama' }), 'Nama')[3], null, 'trim: null tetap null');
  eq(run(t, 'removeDuplicates').rows.length, 3, 'removeDuplicates: 4 → 3 baris');
  eq(run(t, 'keepTopRows', { n: 2 }).rows.length, 2, 'keepTopRows');
  eq(run(t, 'removeTopRows', { n: 3 }).rows.length, 1, 'removeTopRows');
  eq(col(run(t, 'reverseRows'), 'ID'), [3, 2, 2, 1], 'reverseRows');
  const rn = run(t, 'renameColumn', { from: 'Nama', to: 'Customer' });
  check(rn.columns.some((c) => c.name === 'Customer') && !rn.columns.some((c) => c.name === 'Nama'), 'renameColumn: skema berubah');
  check(rn.rows[0].Customer !== undefined && !('Nama' in rn.rows[0]), 'renameColumn: data ikut berpindah');
  const rc = run(t, 'removeColumns', { columns: ['Nama', 'Qty'] });
  eq(rc.columns.map((c) => c.name), ['ID', 'Harga'], 'removeColumns: skema');
  check(!('Nama' in rc.rows[0]) && !('Qty' in rc.rows[0]), 'removeColumns: data ikut terhapus');
  const dc = run(t, 'duplicateColumn', { from: 'Harga', to: 'Harga2' });
  check(dc.columns.find((c) => c.name === 'Harga2').type === 'REAL' && dc.rows[0].Harga2 === 100, 'duplicateColumn: tipe & nilai ikut');
}

section('Sort');
{
  const t = base();
  eq(col(run(t, 'sort', { column: 'Harga', direction: 'asc' }), 'Harga'), [10, 50.5, 50.5, 100], 'sort ascending');
  eq(col(run(t, 'sort', { column: 'Harga', direction: 'desc' }), 'Harga'), [100, 50.5, 50.5, 10], 'sort descending');
  eq(col(run(t, 'sort', { column: 'Qty', direction: 'asc' }), 'Qty').pop(), null, 'sort: null ditaruh di akhir (asc)');
}

section('Filter');
{
  const t = base();
  const f = (column, operator, value) => run(t, 'filter', { column, operator, value }).rows.length;
  eq(f('Qty', '>', '0'), 1, 'filter > 0 (null tidak lolos)');
  eq(f('Qty', 'notnull'), 3, 'filter notnull');
  eq(f('Qty', 'isnull'), 1, 'filter isnull');
  eq(f('Nama', '=', 'Budi'), 2, 'filter = teks');
  eq(f('Nama', '!=', 'Budi'), 2, 'filter != teks');
  eq(f('Nama', 'contains', 'BUD'), 2, 'filter contains tidak peka huruf besar/kecil');
  eq(f('Harga', '>=', '50.5'), 3, 'filter >= desimal');
  eq(run(t, 'filterTextContains', { column: 'Nama', value: 'andi' }).rows.length, 1, 'filterTextContains');
}

section('changeType');
{
  const t = { columns: [{ name: 'A', type: 'TEXT' }], rows: [{ A: '12' }, { A: '3.7' }, { A: null }] };
  const toInt = run(t, 'changeType', { column: 'A', newType: 'INTEGER' });
  eq(col(toInt, 'A'), [12, 3, null], 'INTEGER: "3.7" → 3, null dipertahankan');
  eq(toInt.columns[0].type, 'INTEGER', 'metadata tipe kolom ikut berubah');
  eq(col(run(t, 'changeType', { column: 'A', newType: 'REAL' }), 'A'), [12, 3.7, null], 'REAL: desimal dipertahankan');
  eq(col(run({ columns: [{ name: 'A', type: 'INTEGER' }], rows: [{ A: 5 }] }, 'changeType', { column: 'A', newType: 'TEXT' }), 'A'), ['5'], 'TEXT');
}

section('fillDown / fillUp / replaceValues / changeCase / roundNumber / extractDatePart');
{
  const t = { columns: [{ name: 'K', type: 'TEXT' }], rows: [{ K: null }, { K: 'a' }, { K: '' }, { K: null }, { K: 'b' }, { K: null }] };
  eq(col(run(t, 'fillDown', { column: 'K' }), 'K'), [null, 'a', 'a', 'a', 'b', 'b'], 'fillDown (baris awal tanpa nilai tetap null)');
  eq(col(run(t, 'fillUp', { column: 'K' }), 'K'), ['a', 'a', 'b', 'b', 'b', null], 'fillUp');
  eq(col(run(base(), 'replaceValues', { column: 'Nama', oldVal: 'Budi', newVal: 'Budiman' }), 'Nama').filter((x) => x === 'Budiman').length, 2, 'replaceValues');
  eq(col(run(base(), 'changeCase', { column: 'Nama', case: 'lower' }), 'Nama')[1], 'budi', 'changeCase lower');
  eq(col(run(base(), 'changeCase', { column: 'Nama', case: 'upper' }), 'Nama')[1], 'BUDI', 'changeCase upper');
  eq(col(run({ columns: [{ name: 'X', type: 'REAL' }], rows: [{ X: 3.14159 }, { X: 2.5 }] }, 'roundNumber', { column: 'X', digits: 2 }), 'X'), [3.14, 2.5], 'roundNumber 2 digit');
  const d = { columns: [{ name: 'D', type: 'DATE' }], rows: [{ D: '2025-03-09' }] };
  eq(col(run(d, 'extractDatePart', { column: 'D', part: 'Year' }), 'D'), [2025], 'extractDatePart Year');
  eq(col(run(d, 'extractDatePart', { column: 'D', part: 'Month' }), 'D'), [3], 'extractDatePart Month');
  eq(col(run(d, 'extractDatePart', { column: 'D', part: 'Day' }), 'D'), [9], 'extractDatePart Day');
}

section('split / merge / index / removeEmptyRows / promoteHeaders / keepDuplicates');
{
  const t = { columns: [{ name: 'Full', type: 'TEXT' }], rows: [{ Full: 'Andi - Bandung' }, { Full: 'Budi' }] };
  const sp = run(t, 'splitColumn', { column: 'Full', delimiter: ' - ', newNames: ['Nama', 'Kota'] });
  eq(sp.columns.map((c) => c.name), ['Nama', 'Kota'], 'splitColumn: kolom baru');
  eq(sp.rows[0], { Nama: 'Andi', Kota: 'Bandung' }, 'splitColumn: baris 1');
  eq(sp.rows[1].Kota, null, 'splitColumn: bagian yang tidak ada → null');
  const mg = run(base(), 'mergeColumn', { columns: ['ID', 'Nama'], newName: 'Gab', delimiter: '|' });
  eq(mg.rows[3].Gab, '3|', 'mergeColumn: null diperlakukan sebagai string kosong');
  eq(col(run(base(), 'indexColumn', { newName: 'No', start: 5 }), 'No'), [5, 6, 7, 8], 'indexColumn mulai dari 5');
  eq(col(run(base(), 'indexColumn', { newName: 'No' }), 'No')[0], 1, 'indexColumn default mulai dari 1');
  const er = { columns: [{ name: 'A', type: 'TEXT' }, { name: 'B', type: 'TEXT' }], rows: [{ A: null, B: '  ' }, { A: 'x', B: null }, { A: '', B: '' }] };
  eq(run(er, 'removeEmptyRows').rows.length, 1, 'removeEmptyRows: null/kosong/spasi saja dibuang');
  const ph = run({ columns: [{ name: 'c1', type: 'TEXT' }, { name: 'c2', type: 'TEXT' }], rows: [{ c1: 'Nama', c2: 'Umur' }, { c1: 'A', c2: '1' }] }, 'promoteHeaders', {});
  eq(ph.columns.map((c) => c.name), ['Nama', 'Umur'], 'promoteHeaders: baris pertama jadi header');
  eq(ph.rows.length, 1, 'promoteHeaders: baris header dibuang dari data');
  eq(run({ columns: [{ name: 'c1', type: 'TEXT' }], rows: [] }, 'promoteHeaders', {}).rows.length, 0, 'promoteHeaders pada tabel kosong tidak error');
  eq(run(base(), 'keepDuplicates', { columns: ['ID'] }).rows.length, 1, 'keepDuplicates: hanya kemunculan kedua dst.');
}

section('groupBy / unpivot / pivot / merge / append');
{
  const t = { columns: [{ name: 'R', type: 'TEXT' }, { name: 'V', type: 'REAL' }], rows: [{ R: 'a', V: 10 }, { R: 'a', V: 5 }, { R: 'b', V: 7 }] };
  const g = (aggFunc) => run(t, 'groupBy', { groupCols: ['R'], aggCol: 'V', aggFunc, newName: 'Hasil' });
  eq(g('sum').rows, [{ R: 'a', Hasil: 15 }, { R: 'b', Hasil: 7 }], 'groupBy sum');
  eq(g('avg').rows[0].Hasil, 7.5, 'groupBy avg');
  eq(g('count').rows[0].Hasil, 2, 'groupBy count');
  eq(g('min').rows[0].Hasil, 5, 'groupBy min');
  eq(g('max').rows[0].Hasil, 10, 'groupBy max');
  eq(g('sum').columns.map((c) => c.name), ['R', 'Hasil'], 'groupBy: skema hasil');

  const wide = { columns: [{ name: 'Produk', type: 'TEXT' }, { name: 'Jan', type: 'REAL' }, { name: 'Feb', type: 'REAL' }], rows: [{ Produk: 'X', Jan: 1, Feb: 2 }, { Produk: 'Y', Jan: 3, Feb: 4 }] };
  const up = run(wide, 'unpivot', { columns: ['Jan', 'Feb'], attrName: 'Bulan', valueName: 'Nilai' });
  eq(up.rows.length, 4, 'unpivot: 2 baris × 2 kolom = 4 baris');
  eq(up.rows[0], { Produk: 'X', Bulan: 'Jan', Nilai: 1 }, 'unpivot: baris pertama');
  const back = run(up, 'pivot', { pivotCol: 'Bulan', valueCol: 'Nilai' });
  eq(back.rows, [{ Produk: 'X', Jan: 1, Feb: 2 }, { Produk: 'Y', Jan: 3, Feb: 4 }], 'unpivot lalu pivot → kembali ke bentuk semula');

  const other = { columns: [{ name: 'Kode', type: 'INTEGER' }, { name: 'Kota', type: 'TEXT' }], rows: [{ Kode: 1, Kota: 'Bandung' }] };
  const mq = run(base(), 'mergeQueries', { key: 'ID', otherKey: 'Kode', otherTable: other, otherLabel: 'Kota', bringColumns: ['Kota'], prefix: 'k_' });
  eq(col(mq, 'k_Kota'), ['Bandung', null, null, null], 'mergeQueries: left join — yang tak cocok jadi null');
  const ap = run(base(), 'appendQueries', { otherTable: { columns: [], rows: [{ ID: 9, Nama: 'Z' }] }, otherLabel: 'T2' });
  eq(ap.rows.length, 5, 'appendQueries: baris bertambah');
  eq(ap.rows[4], { ID: 9, Nama: 'Z', Qty: null, Harga: null }, 'appendQueries: kolom yang hilang diisi null');
}

section('Kolom kustom & parser rumus (tanpa eval)');
{
  const t = base();
  eq(col(run(t, 'customColumn', { newName: 'Total', formula: '[Qty] * [Harga]' }), 'Total'), [200, 0, 0, 0], 'rumus perkalian (null dianggap 0)');
  eq(PQ.evalFormula('1 + 2 * 3', {}), 7, 'prioritas operator: * sebelum +');
  eq(PQ.evalFormula('(1 + 2) * 3', {}), 9, 'kurung mengubah prioritas');
  eq(PQ.evalFormula('-[A] + 10', { A: 4 }), 6, 'unary minus');
  eq(PQ.evalFormula('10 / 4', {}), 2.5, 'pembagian');
  eq(PQ.evalFormula('[A] / 0', { A: 5 }), null, 'bagi nol → null (bukan Infinity)');
  eq(PQ.evalFormula('[A] + 1', { A: '' }), 1, 'string kosong dianggap 0');
  for (const bad of ['[A', '1 +', '(1 + 2', '1 2', '"abc', '1 $ 2', '', 'alert(1)', '[A].constructor', 'constructor', '1..2', '`x`', '1; 2'])
    { let threw = false; try { PQ.evalFormula(bad, { A: 1 }); } catch (e) { threw = true; } check(threw, 'rumus tidak valid ditolak: ' + JSON.stringify(bad)); }
  let msg = ''; try { PQ.evalFormula('[A] + "x"', { A: 1 }); } catch (e) { msg = e.message; }
  check(/bukan angka/.test(msg), 'teks non-angka dalam aritmetika → pesan jelas');
  msg = ''; try { run(t, 'customColumn', { newName: 'X', formula: '[Tidak_Ada] * 2' }); } catch (e) { msg = e.message; }
  check(/Kolom tidak ditemukan/.test(msg), 'kolom yang tidak ada ditolak saat langkah dibuat (bukan diam-diam null)');
  msg = ''; try { run(t, 'customColumn', { newName: 'X', formula: '[Qty] *' }); } catch (e) { msg = e.message; }
  check(msg.length > 0, 'rumus tak lengkap melempar error langkah');
  // Pastikan prototype tidak bisa dijangkau lewat nama kolom
  let reached = false; try { PQ.evalFormula('[constructor]', {}); reached = true; } catch (e) { /* diharapkan error */ }
  check(!reached, '[constructor] tidak mengembalikan fungsi bawaan JS (hanya kolom milik baris yang dikenali)');
  eq(PQ.collectColumnRefs(PQ.parseFormula('[A] * ([B] + 2) - [A]')), ['A', 'B', 'A'], 'collectColumnRefs');
}

section('conditionalColumn');
{
  const t = base();
  const c = run(t, 'conditionalColumn', { newName: 'Kat', column: 'Harga', operator: '>', value: '50', thenVal: 'Mahal', elseVal: 'Murah' });
  eq(col(c, 'Kat'), ['Mahal', 'Mahal', 'Mahal', 'Murah'], 'conditionalColumn numerik');
  const e = run(t, 'conditionalColumn', { newName: 'Kat', column: 'Nama', operator: '=', value: 'Budi', thenVal: 'Y', elseVal: 'N' });
  eq(col(e, 'Kat'), ['N', 'Y', 'Y', 'N'], 'conditionalColumn sama-dengan teks');
}

section('removeErrors & langkah tak dikenal');
{
  const t = { columns: [{ name: 'A', type: 'TEXT' }], rows: [{ A: 1 }, { A: new Error('x') }] };
  eq(run(t, 'removeErrors', {}).rows.length, 1, 'removeErrors membuang baris ber-Error');
  let msg = ''; try { PQ.applyStep(base(), { type: 'langkahGaib', params: {} }); } catch (e) { msg = e.message; }
  check(/tidak dikenal/i.test(msg), 'tipe langkah tak dikenal → error jelas');
  eq(PQ.stepLabel({ type: 'langkahGaib' }), 'langkahGaib', 'stepLabel tipe tak dikenal tidak crash');
}

section('Pipeline, label, dan M code');
{
  const steps = [step('trim', { column: 'Nama' }), step('removeDuplicates'), step('filter', { column: 'Qty', operator: '>', value: '0' }),
    step('sort', { column: 'Harga', direction: 'desc' })];
  const out = PQ.runPipeline(base(), steps);
  eq(out.rows.length, 1, 'pipeline 4 langkah menghasilkan 1 baris');
  eq(PQ.runPipeline(base(), []).rows.length, 4, 'pipeline kosong mengembalikan tabel apa adanya');
  check(PQ.stepLabel(steps[0]).includes('Nama'), 'stepLabel memuat nama kolom');
  const m = PQ.buildMCode('Excel.CurrentWorkbook(){[Name="T"]}[Content]', steps);
  check(m.startsWith('let\n') && m.trimEnd().endsWith('in\n    Step4'), 'M code: kerangka let ... in Step4');
  check(/Step1 = Table\.TransformColumns\(Source/.test(m), 'M code: Step1 merujuk Source');
  check(/Step2 = Table\.Distinct\(Step1\)/.test(m), 'M code: Step2 merujuk Step1');
  check(/Table\.SelectRows\(Step2, each \[Qty\] > 0\)/.test(m), 'M code: filter numerik tanpa tanda kutip');
  check(/Order\.Descending/.test(m), 'M code: urutan descending');
  // Setiap tipe langkah harus punya label, apply, dan mCode (tidak ada yang setengah jadi)
  Object.keys(PQ.STEPS).forEach((k) => {
    const d = PQ.STEPS[k];
    check(typeof d.label === 'function' && typeof d.apply === 'function' && typeof d.mCode === 'function', `langkah "${k}" lengkap (label/apply/mCode)`);
  });
}

finish('test-powerquery-engine');
