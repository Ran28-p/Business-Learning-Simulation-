// Test pembahasan berlapis Simulator SQL (js/sql-pembahasan.js) terhadap mesin SQLite SUNGGUHAN.
// Memastikan: (1) semua konsep soal punya catatan, (2) diagnosis cocok dengan pesan error SQLite
// yang nyata, (3) klaim perilaku SQLite di catatan benar, (4) HTML aman dari XSS.
import { loadAll, loadScript, check, eq, section, finish } from './_harness.mjs';
loadAll(); loadScript('js/sql-pembahasan.js');
const E = SQLPQ_Engine, P = SQLPQ_Pembahasan, Q = SQLPQ_Questions, G = SQLPQ_DatasetGenerator, GR = SQLPQ_Grading;
await E.ensureLoaded();

section('Cakupan konsep');
// semua konsep yang dipakai bank soal harus punya catatan
const src = (await import('node:fs')).readFileSync(new URL('../js/question-bank.js', import.meta.url), 'utf8');
const m = src.match(/const CONCEPTS = \{([\s\S]*?)\n  \};/);
const concepts = [...m[1].matchAll(/^    (\w+): \{\n      label:/gm)].map((x) => x[1]);
check(concepts.length >= 25, 'ditemukan ≥25 konsep, dapat ' + concepts.length);
for (const c of concepts) {
  const n = P.NOTES[c];
  check(n && n.langkah.length > 30 && n.jebakan.length > 30 && n.ingat.length > 8, 'catatan lengkap: ' + c);
}
check(Object.keys(P.NOTES).every((k) => concepts.includes(k)), 'tidak ada catatan yatim');

section('Diagnosis vs pesan error SQLite nyata');
const errOf = (sql) => { try { E.run(sql); return null; } catch (e) { return e.message; } };
const hasTitle = (msg, re) => P.errorHints(msg).some((h) => re.test(h.judul));
await E.ensureLoaded();
const tbl = E.listTables ? E.listTables()[0] : null;
check(hasTitle(errOf('SELECT foo_tidak_ada FROM sqlite_master'), /kolom tidak ditemukan/i), 'no such column');
check(hasTitle(errOf('SELECT * FROM tabel_tidak_ada'), /tabel tidak ditemukan/i), 'no such table');
check(hasTitle(errOf('SELECT FROM sqlite_master'), /sintaks/i), 'syntax error');
check(hasTitle(errOf('SELECT * FROM sqlite_master WHERE count(*) > 1'), /Agregat salah tempat/i), 'misuse of aggregate');
check(hasTitle(errOf("SELECT 'belum ditutup FROM sqlite_master"), /sintaks|belum lengkap/i), 'kutip tak tertutup');
check(P.errorHints('pesan asing yang tidak dikenal').length === 0, 'pesan asing → tanpa petunjuk palsu');

section('Perilaku SQLite yang diklaim di catatan (diuji langsung)');
const v = (sql) => E.run(sql).values;
eq(v("SELECT 'Budi'='budi'")[0][0], 0, '= membedakan huruf besar/kecil');
eq(v("SELECT 'Budi' LIKE 'budi'")[0][0], 1, 'LIKE tidak membedakan huruf besar/kecil');
eq(v('SELECT 7/2, 7/2.0')[0], [3, 3.5], 'pembagian bilangan bulat');
eq(v('SELECT substr(\'abc\',1,1)')[0][0], 'a', 'SUBSTR mulai dari 1');
eq(v("SELECT '' IS NULL")[0][0], 0, "'' bukan NULL");
eq(v('SELECT NULL = NULL')[0][0], null, 'NULL = NULL → NULL');
E.run('CREATE TABLE IF NOT EXISTS sp_t(a INTEGER, b INTEGER)'); E.run('DELETE FROM sp_t'); E.run('INSERT INTO sp_t VALUES (1,10),(1,20),(2,30)');
check(E.run('SELECT b, COUNT(*) FROM sp_t GROUP BY a').values.length === 2, 'kolom non-agregat tanpa GROUP BY diterima SQLite');
eq(v('SELECT COUNT(*) FROM sp_t WHERE b BETWEEN 10 AND 30')[0][0], 3, 'BETWEEN inklusif');
eq(v('SELECT COUNT(*) FROM (SELECT a FROM sp_t UNION SELECT a FROM sp_t)')[0][0], 2, 'UNION menghapus duplikat');
eq(v('SELECT COUNT(*) FROM (SELECT a FROM sp_t UNION ALL SELECT a FROM sp_t)')[0][0], 6, 'UNION ALL mempertahankan duplikat');
eq(v('SELECT a, RANK() OVER (ORDER BY a), ROW_NUMBER() OVER (ORDER BY a) FROM sp_t').map((r) => r.slice(1)), [[1, 1], [1, 2], [3, 3]], 'RANK seri vs ROW_NUMBER unik');
eq(v('SELECT COUNT(*) FROM sp_t x JOIN sp_t y')[0][0], 9, 'JOIN tanpa ON = perkalian silang');
E.run('DROP TABLE IF EXISTS sp_t');

section('diagnose() pada soal sungguhan');
const R = SQLPQ_RelationalDataset;
let nQ = 0, nDiag = 0;
const seenConcepts = new Set();
const runBatch = (genFn, levels) => {
  for (let i = 0; i < 60; i++) {
    const level = levels[i % levels.length]; let qq; try { qq = genFn(level); } catch (e) { continue; } if (!qq || !qq.expectedSql) continue; nQ++; seenConcepts.add(qq.concept);
    const bad = 'SELECT 1';
    const verdict = GR.gradeQuery(bad, qq);
    const d = P.diagnose(bad, qq.expectedSql, verdict);
    if (d.length) nDiag++;
    const h = P.html(qq, { verdict, userSql: bad });
    check(/sp-box/.test(h) && !/undefined|\[object/.test(h), 'html salah-jawab bersih: ' + qq.concept);
    const hs = P.html(qq, { solved: true });
    check(/Query pembanding/.test(hs) && /Urutan eksekusi/.test(hs) && /Mengapa jawabanmu benar/.test(hs), 'html benar-jawab lengkap: ' + qq.concept);
    check(!/Query pembanding/.test(h), 'jawaban baku TIDAK bocor saat salah: ' + qq.concept);
    check(GR.gradeQuery(qq.expectedSql, qq).correct, 'kunci tetap benar: ' + qq.concept);
  }
};
for (const cat of G.CATEGORY_META.map((c) => c.key).slice(0, 3)) {
  E.resetDb(); await E.loadDataset(G.generate({ category: cat, rows: 100, dirty: true, seed: 'sp-' + cat }));
  runBatch((lv) => Q.generateQuestion(lv, cat), [1, 2, 5]);   // level 1/2/5 = tabel datar
}
E.resetDb(); await E.loadMultiple(R.generateRelationalDB('small'));
runBatch((lv) => Q.generateQuestion(lv), [3, 4]);            // level 3/4 = skema relasional
check(seenConcepts.size >= 15, 'banyak konsep berbeda teruji: ' + seenConcepts.size);
for (const c of seenConcepts) check(!!P.NOTES[c], 'konsep terpakai punya catatan: ' + c);
check(nQ >= 150, 'cukup soal teruji: ' + nQ);
check(nDiag >= nQ * 0.8, 'sebagian besar jawaban salah mendapat petunjuk: ' + nDiag + '/' + nQ);

section('Diagnosis berbasis struktur');
const d1 = P.diagnose('SELECT a FROM t', 'SELECT DISTINCT a FROM t', { correct: false, reason: 'row_count' });
check(d1.some((x) => /DISTINCT/.test(x.judul)), 'DISTINCT yang kurang terdeteksi');
const d2 = P.diagnose('SELECT * FROM a JOIN b ON a.id=b.id', 'SELECT * FROM a LEFT JOIN b ON a.id=b.id', { correct: false, reason: 'row_count' });
check(d2.some((x) => /LEFT JOIN/.test(x.judul)), 'LEFT JOIN yang kurang terdeteksi');
const d3 = P.diagnose("SELECT 'DISTINCT' FROM t", 'SELECT DISTINCT a FROM t', { correct: false, reason: 'row_count' });
check(d3.some((x) => /DISTINCT/.test(x.judul)), "kata DISTINCT di dalam string tidak dihitung");
check(P.diagnose('SELECT a FROM t', 'SELECT a FROM t', { correct: false, reason: 'value_mismatch' }).length === 1, 'kata kunci sama → hanya petunjuk umum');

section('Keamanan HTML');
const evil = P.html({ concept: 'where', conceptLabel: '<img src=x onerror=alert(1)>', explanation: '<script>x</script>', solutionSql: "SELECT '<b>'" }, { solved: true });
check(!/<img|<script|<b>/.test(evil), 'XSS di-escape');
check(P.html({ concept: 'tak_dikenal', explanation: 'x' }, {}).includes('sp-box'), 'konsep tak dikenal tidak error');
finish('test-sql-pembahasan');
