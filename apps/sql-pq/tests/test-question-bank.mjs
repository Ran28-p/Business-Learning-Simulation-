// Test generator soal SQL dinamis (js/question-bank.js) terhadap dataset NYATA.
// Soal diacak (Math.random), jadi dijalankan berulang kali (fuzz) — kunci jawaban
// harus selalu bisa dieksekusi, konsisten, dan lolos penilaian dirinya sendiri.
import { loadAll, check, eq, section, finish } from './_harness.mjs';
loadAll();
const E = SQLPQ_Engine, G = SQLPQ_DatasetGenerator, Q = SQLPQ_Questions, GR = SQLPQ_Grading, R = SQLPQ_RelationalDataset;
const CATS = G.CATEGORY_META.map((c) => c.key);
const ROUNDS = 80;
await E.ensureLoaded();

const problems = [];
const seenConcepts = {};
function inspect(q, where) {
  const tag = `${where}/L${q.level}/${q.concept}`;
  seenConcepts[q.level] = seenConcepts[q.level] || new Set(); seenConcepts[q.level].add(q.concept);
  if (!q.id || !q.prompt || !q.expectedSql || !q.explanation) problems.push(tag + ': field wajib kosong');
  if (!Array.isArray(q.hints) || q.hints.length !== 3 || q.hints.some((h) => !h)) problems.push(tag + ': hints harus 3 butir & terisi');
  if (/undefined|NaN|\[object/.test(q.prompt + q.explanation + q.hints.join(' '))) problems.push(tag + ': teks memuat undefined/NaN/[object]: ' + q.prompt);
  if (q.solutionSql !== q.expectedSql) problems.push(tag + ': solutionSql ≠ expectedSql');
  let res;
  try { res = E.run(q.expectedSql); } catch (e) { problems.push(tag + ': expectedSql error: ' + e.message); return; }
  const g = GR.gradeQuery(q.expectedSql, q);
  if (!g.correct) problems.push(tag + ': kunci jawaban gagal menilai dirinya sendiri');
  if (!GR.isReadOnlyQuery(q.expectedSql)) problems.push(tag + ': expectedSql bukan query baca-saja');
  return res;
}

section('Level 1, 2, 5 — dataset flat, semua kategori (dataset kotor agar level 5 bermakna)');
let emptyFlat = 0, totalFlat = 0;
for (const cat of CATS) {
  E.resetDb();
  await E.loadDataset(G.generate({ category: cat, rows: 100, dirty: true, seed: 'qb-' + cat }));
  for (const lv of [1, 2, 5]) for (let i = 0; i < ROUNDS; i++) {
    const q = Q.generateQuestion(lv, cat);
    if (q.level !== lv) problems.push(`level soal ${q.level} ≠ diminta ${lv}`);
    const res = inspect(q, cat);
    totalFlat++;
    if (res && res.values.length === 0) emptyFlat++;
  }
}
check(problems.length === 0, 'semua soal flat valid' + (problems.length ? ' — contoh: ' + [...new Set(problems)].slice(0, 5).join(' | ') : ''));
eq(emptyFlat, 0, `tidak ada soal berkunci KOSONG pada dataset kotor (0 dari ${totalFlat})`);

section('Level 3 & 4 — skema relasional (small / medium / large)');
problems.length = 0;
for (const scale of ['small', 'medium', 'large']) {
  await E.loadMultiple(R.generateRelationalDB(scale));
  for (const lv of [3, 4]) for (let i = 0; i < ROUNDS; i++) {
    const q = Q.generateQuestion(lv);
    const res = inspect(q, 'rel-' + scale);
    if (res && res.values.length === 0) problems.push(`rel-${scale}/L${lv}/${q.concept}: kunci kosong`);
  }
}
check(problems.length === 0, 'semua soal relasional valid' + (problems.length ? ' — contoh: ' + [...new Set(problems)].slice(0, 5).join(' | ') : ''));

section('Cakupan konsep — setiap template benar-benar muncul');
const expected = { 1: ['where', 'orderLimit', 'distinct', 'like', 'between', 'inList'], 2: ['groupAgg', 'having', 'stringFn', 'coalesce', 'caseWhen', 'dateFn'],
  3: ['join', 'leftJoin', 'selfJoin', 'joinComplex'], 4: ['cte', 'window', 'subquery', 'unionAll', 'exists'], 5: ['duplicate', 'nullcheck', 'outlier', 'dataValidation', 'dateFormatCheck'] };
for (const lv of Object.keys(expected)) {
  const missing = expected[lv].filter((c) => !(seenConcepts[lv] && seenConcepts[lv].has(c)));
  eq(missing, [], `level ${lv}: semua konsep pernah keluar`);
}

section('Perilaku lain');
check(Object.keys(Q.CONCEPTS).every((k) => Q.CONCEPTS[k].label && typeof Q.CONCEPTS[k].hints === 'function' && typeof Q.CONCEPTS[k].explain === 'function'), 'setiap CONCEPT punya label/hints/explain');
E.resetDb(); await E.loadDataset(G.generate({ category: 'sales', rows: 50, seed: 'default' }));
eq(Q.generateQuestion(1).table, 'sales', 'kategori default = sales');
eq(Q.generateQuestion('abc' * 1 || 1, 'sales').level, 1, 'level tidak valid jatuh ke level 1 (tidak crash)');
const ids = new Set(Array.from({ length: 200 }, () => Q.generateQuestion(1, 'sales').id));
check(ids.size > 190, 'id soal praktis unik (' + ids.size + '/200)');
const pv = Q.pickDistinctValues('sales', 'Region', 3);
check(pv.length === 3 && new Set(pv).size === 3, 'pickDistinctValues: n nilai berbeda');
const nr = Q.numericRange('sales', 'Total_Sales');
check(nr.min <= nr.avg && nr.avg <= nr.max, 'numericRange: min ≤ avg ≤ max');
eq(Q.pickDistinctValue('sales', 'Region') != null, true, 'pickDistinctValue mengembalikan nilai');

finish('test-question-bank');
