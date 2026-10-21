// Test Kuis Langsung (Game Hub): js/shared/livequiz-engine.js + js/shared/livequiz-room.js
//   A. KODE & UTIL   — kode ruang tanpa karakter ambigu, normalisasi, timer terbatas, nama dibersihkan.
//   B. PEMBUAT SOAL  — ≥20 soal valid & unik per tema, variatif antar seed, jawaban generator DIHITUNG ULANG independen.
//   C. SKOR          — ketepatan + kecepatan, batas waktu, jawaban salah = 0, urutan papan peringkat.
//   D. ALUR RUANG    — guru + siswa lewat transport memori: lobi → soal → reveal → selesai, skor real-time, reveal otomatis,
//                      tulis-sekali, jawaban terlambat, kunci TIDAK ikut ke data publik, pulih setelah reload guru.
// Tanpa dependency; jalankan:  node tests/test-livequiz.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const eq = (a, b, l) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) console.log(`   diharapkan ${JSON.stringify(b)} · didapat ${JSON.stringify(a)}`); check(ok, l); };
const section = (t) => console.log('\n=== ' + t + ' ===');
globalThis.window = globalThis;
for (const f of ['js/shared/livequiz-engine.js', 'js/shared/livequiz-room.js']) vm.runInThisContext(readFileSync(join(ROOT, f), 'utf8'), { filename: f });
const LQ = globalThis.LiveQuiz, DB = globalThis.LiveDb, { Host, Player } = globalThis.LiveRoom;
const rpNum = (s) => Number(String(s).replace(/[^\d]/g, ''));

/* ============ A ============ */
section('A. Kode & util');
{
  for (let i = 0; i < 500; i++) { const c = LQ.makeCode(); check(/^[A-HJ-NP-Z2-9]{6}$/.test(c) && LQ.validCode(c), 'kode valid & tanpa 0/O/1/I: ' + c); }
  eq(LQ.normCode(' ab-c2 d9x '), 'ABC2D9', 'normCode huruf besar, buang simbol, potong 6');
  check(!LQ.validCode('ABC10O') && !LQ.validCode('ABC'), 'kode ambigu/pendek ditolak');
  eq([LQ.clampTimer(1), LQ.clampTimer(9999), LQ.clampTimer('30'), LQ.clampTimer('x')], [5, 300, 30, 20], 'timer dibatasi 5–300 detik');
  eq(LQ.cleanName('  <b>Budi</b>\n  Santoso   '), 'bBudi/b Santoso', 'nama dibersihkan dari tag & spasi ganda');
  check(LQ.cleanName('x'.repeat(100)).length === 24, 'nama dipotong 24');
}

/* ============ B ============ */
section('B. Pembuat soal');
{
  for (const theme of ['pajak', 'akuntansi', 'excel', 'sqlpq', 'campuran']) {
    const q = LQ.buildQuiz({ theme, count: 25, seed: 11 });
    eq(q.length, 25, theme + ': 25 soal');
    eq(LQ.validateQuiz(q), [], theme + ': semua valid');
    eq(new Set(q.map((x) => x.q)).size, 25, theme + ': tanpa soal kembar');
    check(q.every((x) => x.o.length === 4 && x.e), theme + ': 4 pilihan + pembahasan');
    if (theme === 'sqlpq') check(q.filter((x) => x.g).every((x) => !/\bkat\b|\bwil\b|\bjml\b|\bpid\b|\bberurutan\b|COUNT\(v\)|Tabel n\(v\)/i.test(x.q)), 'SQL: nama kolom dan tabel ditulis lengkap');
  }
  const a = LQ.buildQuiz({ theme: 'pajak', count: 20, seed: 1 }).map((x) => x.q).join('|'), b = LQ.buildQuiz({ theme: 'pajak', count: 20, seed: 2 }).map((x) => x.q).join('|');
  check(a !== b, 'seed berbeda → set soal berbeda (generate ulang variatif)');
  eq(LQ.buildQuiz({ theme: 'pajak', count: 20, seed: 1 }).map((x) => x.q), LQ.buildQuiz({ theme: 'pajak', count: 20, seed: 1 }).map((x) => x.q), 'seed sama → deterministik');
  let bad = 0; for (let s = 1; s <= 300; s++) for (const t of ['pajak', 'akuntansi', 'excel', 'sqlpq', 'campuran']) { const q = LQ.buildQuiz({ theme: t, count: 30, seed: s }); if (q.length < 30 || LQ.validateQuiz(q).length) bad++; }
  eq(bad, 0, '1.500 kuis acak (30 soal, 5 tema) selalu valid & penuh');
  // Statis bank diterima & dicampur
  const src = { pajak: LQ.fromModulPajak(JSON.parse(readFileSync(join(ROOT, 'apps/spt/modul_pajak/questions.json'), 'utf8'))) };
  check(src.pajak.length >= 15, 'modul_pajak: ≥15 soal pilihan ganda terbaca (' + src.pajak.length + ')');
  vm.runInThisContext(readFileSync(join(ROOT, 'apps/spt/tax_career/data/questions.js'), 'utf8'));
  const tc = LQ.fromTaxCareer(globalThis.TAX_CAREER_QUESTIONS); check(tc.length >= 25, 'tax_career: ≥25 soal pilihan ganda terbaca (' + tc.length + ')');
  src.pajak = src.pajak.concat(tc);
  const mixed = LQ.buildQuiz({ theme: 'pajak', count: 20, seed: 5, sources: src });
  check(mixed.some((x) => !x.g) && mixed.some((x) => x.g), 'bank statis + generator tercampur');
  check(src.pajak.every((x) => x.o[x.a] != null), 'kunci bank statis menunjuk opsi yang ada');
  // Pengganti satu soal
  const ex = LQ.buildQuiz({ theme: 'akuntansi', count: 20, seed: 9 }), nq = LQ.regenerateOne({ theme: 'akuntansi', seed: 77, existing: ex });
  check(nq && !ex.some((x) => x.q === nq.q) && LQ.validateQuestion(nq).length === 0, 'regenerateOne → soal baru, valid, bukan duplikat');
  // Validasi
  check(LQ.validateQuestion({ q: 'a?', o: ['x', 'x'], a: 0 }).length > 0, 'pilihan kembar ditolak');
  check(LQ.validateQuestion({ q: 'a?', o: ['x', 'y'], a: 2 }).length > 0, 'kunci di luar rentang ditolak');
  check(LQ.validateQuestion({ q: '', o: ['x', 'y'], a: 0 }).length > 0, 'pertanyaan kosong ditolak');
  check(LQ.validateQuestion({ q: 'a?', o: ['x', 'y', 'z', 'w', 'v'], a: 0 }).length > 0, '5 pilihan ditolak');
  check(LQ.sanitizeQuestion({ q: '  a?  ', o: ['x ', ' y'], a: 1 }).q === 'a?', 'sanitasi merapikan teks');
  check(LQ.sanitizeQuestion({ q: 'a?', o: ['x'], a: 0 }) === null, 'sanitasi menolak soal rusak');
}
section('B2. Jawaban generator dihitung ulang secara independen');
{
  let n = 0;
  for (let s = 1; s <= 200; s++) {
    for (const x of LQ.buildQuiz({ theme: 'pajak', count: 30, seed: s })) {
      const cor = rpNum(x.o[x.a]); let m;
      if ((m = x.q.match(/PKP\) seorang WP orang pribadi dalam setahun (Rp[\d.]+)/))) { const pkp = rpNum(m[1]); let t = 0, left = pkp; for (const [w, r] of [[60e6, .05], [190e6, .15], [250e6, .25], [4500e6, .3], [Infinity, .35]]) { const p = Math.min(left, w); if (p > 0) t += p * r; left -= p; } eq(cor, Math.round(t), 'PPh pasal 17 ' + pkp); n++; }
      else if ((m = x.q.match(/jasa teknik (Rp[\d.]+) \(belum/))) { eq(cor, rpNum(m[1]) * 0.02, 'PPh 23 2%'); n++; }
      else if ((m = x.q.match(/Omzet bulanan WP UMKM yang memilih PPh Final (Rp[\d.]+)/))) { eq(cor, Math.round(rpNum(m[1]) * 0.005), 'UMKM 0,5%'); n++; }
      else if ((m = x.q.match(/PKP sebuah PT \(WP badan, tarif umum\) tahun ini (Rp[\d.]+)/))) { eq(cor, Math.round(rpNum(m[1]) * 0.22), 'PPh badan 22%'); n++; }
      else if ((m = x.q.match(/neto setahun seorang pegawai (Rp[\d.]+), status ([A-Z/0-9]+) \(PTKP (Rp[\d.]+)\)/))) { eq(cor, rpNum(m[1]) - rpNum(m[3]), 'PKP = neto − PTKP'); n++; }
      else if ((m = x.q.match(/harga jual (Rp[\d.]+) di luar PPN/))) { eq(cor, Math.round(rpNum(m[1]) * 0.11), 'PPN efektif 11%'); n++; }
      else if ((m = x.q.match(/PPN Keluaran (Rp[\d.]+) dan PPN Masukan yang dapat dikreditkan (Rp[\d.]+)/))) { eq(cor, rpNum(m[1]) - rpNum(m[2]), 'PPN kurang bayar'); n++; }
    }
  }
  check(n > 500, 'cukup banyak soal pajak diverifikasi (' + n + ')');
  n = 0;
  for (let s = 1; s <= 200; s++) {
    for (const x of LQ.buildQuiz({ theme: 'akuntansi', count: 30, seed: s })) {
      let m; const cor = x.o[x.a];
      if ((m = x.q.match(/Total aset perusahaan (Rp[\d.]+) dan total liabilitas (Rp[\d.]+)/))) { eq(rpNum(cor), rpNum(m[1]) - rpNum(m[2]), 'ekuitas'); n++; }
      else if ((m = x.q.match(/Mesin dibeli (Rp[\d.]+), umur manfaat (\d+) tahun, nilai residu (Rp[\d.]+)/))) { eq(rpNum(cor), Math.round((rpNum(m[1]) - rpNum(m[3])) / Number(m[2])), 'penyusutan'); n++; }
      else if ((m = x.q.match(/Pendapatan periode ini (Rp[\d.]+) dan total beban (Rp[\d.]+)/))) { eq(rpNum(cor), rpNum(m[1]) - rpNum(m[2]), 'laba bersih'); n++; }
      else if ((m = x.q.match(/Persediaan awal (Rp[\d.]+), pembelian bersih (Rp[\d.]+), persediaan akhir (Rp[\d.]+)/))) { eq(rpNum(cor), rpNum(m[1]) + rpNum(m[2]) - rpNum(m[3]), 'HPP'); n++; }
      else if ((m = x.q.match(/Pembelian 1: (\d+) unit @(Rp[\d.]+); pembelian 2: (\d+) unit @(Rp[\d.]+)\. Terjual (\d+) unit/))) { const [u1, p1, u2, p2, sold] = [+m[1], rpNum(m[2]), +m[3], rpNum(m[4]), +m[5]]; eq(rpNum(cor), u1 * p1 + (sold - u1) * p2, 'FIFO'); check(sold > u1 && sold - u1 <= u2, 'FIFO: terjual melewati lapisan 1 tapi tidak melebihi stok'); n++; }
      else if ((m = x.q.match(/Aset lancar (Rp[\d.]+) dan liabilitas lancar (Rp[\d.]+)/))) { eq(Number(cor.replace(' kali', '').replace(',', '.')), Math.round(rpNum(m[1]) / rpNum(m[2]) * 100) / 100, 'rasio lancar'); n++; }
      else if ((m = x.q.match(/Penjualan bersih (Rp[\d.]+) dan laba kotor (Rp[\d.]+)/))) { eq(Number(cor.replace('%', '').replace(',', '.')), Math.round(rpNum(m[2]) / rpNum(m[1]) * 10000) / 100, 'margin'); n++; }
    }
  }
  check(n > 500, 'cukup banyak soal akuntansi diverifikasi (' + n + ')');
}


section('B3. Tema Excel & SQL/Power Query — jawaban dicocokkan ke mesin NYATA di repo');
{
  // Oracle 1: spreadsheet-engine.js (mesin Excel aplikasi). Oracle 2: SQLite/WASM asli (sql.js vendor) yang dipakai modul SQL & Power Query.
  const XL = await import(pathToFileURL(join(ROOT, 'apps/excel/js/spreadsheet-engine.js')).href);
  const sqlFile = join(ROOT, 'apps/sql-pq/vendor/sql-js/sql-wasm.js'), sqlMod = { exports: {} };
  vm.compileFunction(readFileSync(sqlFile, 'utf8'), ['exports', 'require', 'module', '__filename', '__dirname'], { filename: sqlFile })(sqlMod.exports, createRequire(sqlFile), sqlMod, sqlFile, dirname(sqlFile));
  const SQLJS = await sqlMod.exports({ locateFile: (f) => join(dirname(sqlFile), f) });
  const stat = { excel: 0, excelref: 0, sql: 0 }, kinds = new Set();
  for (let seed = 1; seed <= 250; seed++) {
    for (const theme of ['excel', 'sqlpq']) {
      const quiz = LQ.buildQuiz({ theme, count: 30, seed, verify: true });
      for (const x of quiz) {
        if (!x.v) continue;
        const v = x.v, label = `${v.k} ${v.formula || v.sql} [seed ${seed}]`; kinds.add(x.t);
        check(x.o[x.a] === v.answer, 'opsi benar = jawaban terverifikasi: ' + label);
        check(new Set(x.o).size === x.o.length, 'pilihan unik: ' + label);
        if (v.k === 'excel') {
          const g = XL.createGrid(30, 8); for (const [a, val] of Object.entries(v.cells)) XL.setCellRaw(g, a, val);
          const ev = XL.evaluateFormula(v.formula, g);
          check(!ev.error && String(ev.value) === v.answer, `Excel: ${v.formula} → mesin Excel memberi ${ev.error || ev.value}, soal menjawab ${v.answer} (seed ${seed})`); stat.excel++;
        } else if (v.k === 'excelref') {
          eq(XL.adjustFormulaRefs(v.formula, v.dr, v.dc), v.answer, 'salin rumus ' + v.formula + ' (' + v.dr + ',' + v.dc + ')'); stat.excelref++;
        } else if (v.k === 'sql') {
          const db = new SQLJS.Database(); let got;
          try { v.setup.forEach((q) => db.run(q)); got = db.exec(v.sql)[0].values[0][0]; } catch (e) { got = 'GALAT ' + e.message; } finally { db.close(); }
          check(String(got) === v.answer || (typeof got === 'number' && Number(v.answer) === got), `SQL: ${v.sql} → SQLite memberi ${got}, soal menjawab ${v.answer} (seed ${seed})`); stat.sql++;
        }
      }
    }
  }
  check(stat.excel > 1500 && stat.excelref > 100 && stat.sql > 1500, `volume verifikasi (Excel ${stat.excel}, salin-rumus ${stat.excelref}, SQL ${stat.sql})`);
  check(kinds.size >= 14, 'variasi jenis soal terverifikasi: ' + [...kinds].join(', '));
  for (const th of ['excel', 'sqlpq']) check(LQ.STATIC[th].length >= 24 && LQ.STATIC[th].every((x) => LQ.validateQuestion(x).length === 0 && x.a === 0 && x.o.length === 4), th + ': ≥24 soal konsep statis valid');
  check(LQ.THEMES.map((t) => t.id).join() === 'pajak,akuntansi,excel,sqlpq,campuran', 'daftar tema: pajak, akuntansi, excel, sqlpq, campuran');
  const camp = LQ.buildQuiz({ theme: 'campuran', count: 40, seed: 3 }).map((x) => x.t).join('|');
  check(/SUM|IF|VLOOKUP|Referensi/.test(camp) && /SELECT|JOIN|GROUP|NULL|Power Query/.test(camp) && /PPh|PPN|HPP|Persamaan/.test(camp), 'tema campuran memuat keempat bidang');
}

/* ============ C ============ */
section('B4. Bank esai & penilaian rubrik');
{
  const essays = {};
  for (const theme of ['pajak', 'akuntansi', 'excel', 'sqlpq', 'campuran']) {
    essays[theme] = LQ.buildEssayQuiz({ theme, count: 100, seed: 17 });
    eq(essays[theme].length, theme === 'campuran' ? 20 : 5, theme + ': jumlah sesuai bank esai');
    eq(LQ.validateQuiz(essays[theme]), [], theme + ': seluruh soal esai valid');
    check(essays[theme].every((q) => q.type === 'essay' && q.o === undefined && q.a === undefined && LQ.scoreEssay(q, q.answer).complete), theme + ': kunci jawaban memenuhi rubrik tanpa opsi');
  }
  check(LQ.validateQuiz([essays.pajak[0], LQ.buildQuiz({ theme: 'pajak', count: 1, seed: 3 })[0]]).some((x) => /mode soal/.test(x)), 'mode esai dan pilihan ganda tidak dapat dicampur');
  const scored = LQ.scoreEssay({ rubric: [{ label: 'A', keywords: ['aset bertambah'] }, { label: 'B', keywords: ['liabilitas meningkat'] }, { label: 'C', keywords: ['ekuitas tetap'] }] }, 'Aset bertambah; liabilitas meningkat.');
  eq([scored.matched, scored.total, scored.points, scored.complete], [2, 3, 667, false], 'skor parsial dibagi merata menurut kriteria');
  eq(LQ.scoreEssay({ rubric: [{ label: 'A', keywords: ['aset'] }] }, 'asetnya bertambah').points, 0, 'kata kunci harus cocok sebagai frasa utuh');
  eq(LQ.scoreEssay(essays.pajak[0], '').points, 0, 'jawaban kosong mendapat nol');
  eq(LQ.scoreEssayAll(essays.pajak, { 0: { siswa: { text: essays.pajak[0].answer } } }).siswa.total, 1000, 'skor esai dihitung dari semua jawaban tersimpan');
  check(LQ.sanitizeQuestion({ type: 'essay', q: 'Apa?', answer: '', rubric: [] }) === null, 'sanitasi menolak kunci atau rubrik esai yang rusak');
}

section('C. Skor & papan peringkat');
{
  eq(LQ.points(true, 0, 20000), 1000, 'tercepat = 1000');
  eq(LQ.points(true, 20000, 20000), 500, 'di batas waktu = 500');
  eq(LQ.points(true, 10000, 20000), 750, 'setengah waktu = 750');
  eq(LQ.points(false, 0, 20000), 0, 'salah = 0');
  eq(LQ.points(true, 20000 + LQ.GRACE_MS + 1, 20000), 0, 'lewat batas + toleransi = 0');
  check(LQ.points(true, 20000 + 1000, 20000) === 500, 'dalam toleransi jaringan tetap dihitung (500)');
  check(LQ.points(true, 2000, 20000) > LQ.points(true, 9000, 20000), 'lebih cepat → lebih tinggi');
  const sc = LQ.scoreAll({ 0: 1, 1: 2 }, { 0: { a: { c: 1, t: 1500 }, b: { c: 0, t: 1100 } }, 1: { a: { c: 2, t: 5100 }, b: { c: 2, t: 5400 } } }, { 0: 1000, 1: 5000 }, 10);
  eq(sc.a.correct, 2, 'a benar 2'); eq(sc.b.correct, 1, 'b benar 1'); check(sc.a.total > sc.b.total, 'a > b');
  const board = LQ.leaderboard({ x: { total: 900, ms: 500, correct: 1 }, y: { total: 900, ms: 300, correct: 1 }, z: { total: 1200, ms: 900, correct: 2 } }, { x: { name: 'X' }, y: { name: 'Y' }, z: { name: 'Z' }, w: { name: 'W' } });
  eq(board.map((r) => r.uid + r.rank), ['z1', 'y2', 'x3', 'w4'], 'urut: skor ↓, lalu waktu ↑; pemain tanpa skor tetap tampil');
}

/* ============ D ============ */
section('D. Alur ruang (guru + siswa)');
const tick = () => new Promise((r) => setTimeout(r, 0));
async function run() {
  let clock = 1_000_000;
  const core = DB.makeCore({ clock: () => clock });
  const teacher = DB.memory(core, 'T1'), s1 = DB.memory(core, 'S1'), s2 = DB.memory(core, 'S2'), s3 = DB.memory(core, 'S3');
  const quiz = LQ.buildQuiz({ theme: 'campuran', count: 3, seed: 4 });
  const host = new Host(teacher, { theme: 'campuran', title: 'Uji', timer: 20 });
  const code = await host.create();
  check(LQ.validCode(code), 'kode ruang dibuat: ' + code);
  eq(core.data.liveRooms[code].meta.host, 'T1', 'meta.host = uid guru');
  eq(core.data.liveRooms[code].meta.status, 'lobby', 'status awal lobi');
  // siswa masuk SELAMA guru mengatur
  const p1 = new Player(s1), p2 = new Player(s2), p3 = new Player(s3);
  await p1.join(code.toLowerCase(), '  Ani '); await p2.join(code, 'Budi'); await p3.join(code, 'Cici');
  eq(Object.keys(core.data.liveRooms[code].players).length, 3, '3 siswa di lobi');
  eq(host.view().players.length, 3, 'guru melihat 3 pemain real-time');
  let err = null; try { await new Player(DB.memory(core, 'X')).join('ZZZZZZ', 'x'); } catch (e) { err = e.message; } check(/tidak ditemukan/.test(err), 'kode salah ditolak');
  err = null; try { await new Player(DB.memory(core, 'X')).join(code, '   '); } catch (e) { err = e.message; } check(/nama/i.test(err), 'nama kosong ditolak');
  await host.setConfig({ timer: 30 }); eq(core.data.liveRooms[code].meta.timer, 30, 'guru mengubah timer di lobi');
  // mulai
  await host.start(quiz);
  const pub = JSON.stringify(core.data.liveRooms[code].questions);
  check(!/"a":/.test(pub) && !/"e":/.test(pub), 'data soal publik TIDAK memuat kunci/pembahasan');
  eq(core.data.liveRooms[code].key[0], quiz[0].a, 'kunci disimpan terpisah (hanya-guru di rules)');
  let v = p1.view(); eq([v.status, v.qIndex, v.question.q], ['question', 0, quiz[0].q], 'siswa melihat soal 0');
  check(v.question.a === undefined, 'siswa tidak menerima kunci');
  // jawab: Ani benar cepat, Budi benar lambat, Cici salah
  const right = quiz[0].a, wrong = (right + 1) % 4;
  clock += 2000; let r1 = await p1.submit(right);
  clock += 10000; let r2 = await p2.submit(right);
  clock += 1000; let r3 = await p3.submit(wrong);
  check(r1.ok && r2.ok && r3.ok, 'ketiganya terkirim');
  eq((await p1.submit(wrong)).ok, false, 'jawab dua kali ditolak (tulis-sekali)');
  await tick();
  eq(host.view().answered, 3, 'guru melihat 3 jawaban masuk');
  let board = host.view().board;
  eq(board.map((x) => x.name), ['Ani', 'Budi', 'Cici'], 'papan peringkat real-time: Ani > Budi > Cici');
  check(board[0].total > board[1].total && board[2].total === 0, 'skor: cepat > lambat > salah=0');
  eq(core.data.liveRooms[code].scores.S1.total, LQ.points(true, 2000, 30000), 'skor Ani tertulis di DB (dihitung guru)');
  // semua menjawab → reveal otomatis
  await host.tick(); await tick();
  eq(core.data.liveRooms[code].meta.status, 'reveal', 'semua sudah menjawab → reveal otomatis');
  v = p1.view(); eq([v.correct, v.gained], [true, LQ.points(true, 2000, 30000)], 'siswa melihat benar + poin');
  eq(p3.view().correct, false, 'Cici melihat salah'); check(v.reveal && v.reveal.a === right, 'reveal memuat kunci setelah soal selesai');
  check(p1.view().me.rank === 1 && p3.view().me.rank === 3, 'peringkat siswa benar');
  // soal 2: tak ada yang menjawab → waktu habis
  await host.next(); await tick();
  eq([host.view().qIndex, p2.view().status], [1, 'question'], 'soal 1 dimulai');
  clock += 29_000; check((await host.tick()) === false, 'sebelum waktu habis tidak reveal');
  clock += 2_000; await host.tick(); await tick();
  eq(core.data.liveRooms[code].meta.status, 'reveal', 'waktu habis → reveal otomatis');
  // jawaban terlambat (setelah waktu+toleransi) tidak menambah skor, bahkan dikirim langsung ke DB
  const before = JSON.stringify(core.data.liveRooms[code].scores.S2);
  clock += 5000; const rl = await p2.submit(0); check(rl.ok === false, 'klien menolak jawab di luar fase soal');
  await s2.set('liveRooms/' + code + '/answers/1/S2', { c: quiz[1].a, t: clock }); await tick();
  eq(JSON.stringify(core.data.liveRooms[code].scores.S2), before, 'jawaban terlambat (curang) bernilai 0');
  // sampai selesai
  await host.next(); await tick(); await host.reveal(); await host.next(); await tick();
  eq(core.data.liveRooms[code].meta.status, 'finished', 'soal habis → status selesai');
  eq(p1.view().board.length, 3, 'papan akhir 3 pemain'); eq(await host.next(), false, 'next setelah selesai = no-op');
  // pulih setelah guru reload
  host.detach();
  const host2 = new Host(DB.memory(core, 'T1'), { theme: 'campuran', timer: 20 });
  await host2.resume(code, quiz); await tick();
  eq(host2.view().board.length, 3, 'resume: papan dihitung ulang dari jawaban (3 pemain)');
  eq(host2.view().board[0].total, p1.view().board[0].total, 'resume: skor tetap sama setelah reload guru');
  err = null; try { await new Host(DB.memory(core, 'INTRUDER'), { timer: 20 }).resume(code, quiz); } catch (e) { err = e.message; } check(/bukan milik/.test(err), 'bukan pemilik tidak bisa resume ruang');
  // tutup ruang
  await host2.close(); check(!core.data.liveRooms, 'ruang dihapus bersih');
  // kuis kosong/rusak ditolak
  const h3 = new Host(DB.memory(core, 'T2'), { theme: 'pajak', timer: 20 }); await h3.create();
  err = null; try { await h3.start([]); } catch (e) { err = e.message; } check(!!err, 'mulai tanpa soal ditolak');
  err = null; try { await h3.start([{ q: 'x', o: ['a', 'a'], a: 0 }]); } catch (e) { err = e.message; } check(!!err, 'mulai dengan soal rusak ditolak');
}
await run();

section('D2. Layar siswa: soal/reveal yang tiba SETELAH meta tetap memicu render');
{
  let clock = 5_000_000; const core = DB.makeCore({ clock: () => clock });
  const teacher = DB.memory(core, 'T9'), stu = DB.memory(core, 'S9'), host = new Host(teacher, { theme: 'pajak', timer: 20 }), code = await host.create();
  const p = new Player(stu); await p.join(code, 'Uji'); const keys = []; p.onChange((v) => keys.push([Player.viewKey(v), !!v.question, v.status]));
  const quiz = LQ.buildQuiz({ theme: 'pajak', count: 2, seed: 8 }), P = 'liveRooms/' + code;
  // satu commit atomik mengubah meta + questions + starts → listener meta berjalan SEBELUM listener questions (urutan pendaftaran)
  await teacher.update(P, { questions: { 0: { q: quiz[0].q, o: quiz[0].o }, 1: { q: quiz[1].q, o: quiz[1].o } }, 'starts/0': clock, 'meta/status': 'question', 'meta/qIndex': 0, 'meta/qCount': 2 });
  const withQ = keys.filter((k) => k[2] === 'question' && k[1]), noQ = keys.filter((k) => k[2] === 'question' && !k[1]);
  check(withQ.length >= 1, 'siswa akhirnya menerima soal setelah update atomik');
  if (noQ.length) check(noQ.every((k) => !withQ.some((w) => w[0] === k[0])), 'kunci render saat soal BELUM ada ≠ kunci saat soal sudah ada (kalau sama, layar macet "Memuat soal…")');
  check(Player.viewKey({ status: 'question', qIndex: 0, board: [], question: null }) !== Player.viewKey({ status: 'question', qIndex: 0, board: [], question: { q: 'x' } }), 'viewKey membedakan ada/tidaknya soal');
  check(Player.viewKey({ status: 'reveal', qIndex: 0, board: [], reveal: null }) !== Player.viewKey({ status: 'reveal', qIndex: 0, board: [], reveal: { a: 0 } }), 'viewKey membedakan ada/tidaknya reveal (termasuk jawaban 0)');
  const revealView = { status: 'reveal', qIndex: 0, myChoice: 0, question: { q: 'x' }, reveal: { a: 0 }, gained: 500, me: { total: 500, rank: 1 }, playerCount: 2, board: [{}, {}] };
  check(Player.viewKey(revealView) !== Player.viewKey({ ...revealView, me: { total: 500, rank: 2 } }), 'viewKey memicu render ulang saat peringkat siswa berubah');
}

section('D3. Alur esai (jawaban teks, penilaian otomatis, reveal aman)');
{
  let clock = 7_000_000; const core = DB.makeCore({ clock: () => clock });
  const teacher = DB.memory(core, 'TE'), student = DB.memory(core, 'SE');
  const quiz = LQ.buildEssayQuiz({ theme: 'pajak', count: 1, seed: 8 });
  const host = new Host(teacher, { theme: 'pajak', timer: 30 }), code = await host.create();
  const player = new Player(student); await player.join(code, 'Siswa');
  await host.start(quiz);
  const room = core.data.liveRooms[code];
  eq(room.meta.mode, 'essay', 'mode esai dibagikan untuk label hasil');
  eq(room.questions[0], { type: 'essay', q: quiz[0].q }, 'soal publik hanya berisi tipe dan pertanyaan');
  check(!JSON.stringify(room.questions).includes(quiz[0].answer) && !JSON.stringify(room.questions).includes('keywords'), 'kunci dan rubrik tidak ikut data soal publik');
  eq(room.key[0].answer, quiz[0].answer, 'kunci lengkap tersimpan pada jalur guru');
  check(player.view().question.type === 'essay' && player.view().question.answer === undefined && player.view().reveal === null, 'siswa tidak menerima kunci sebelum reveal');
  eq((await player.submitEssay('   ')).why, 'jawaban kosong', 'jawaban esai kosong ditolak');
  eq((await player.submitEssay('x'.repeat(LQ.LIM.essay + 1))).why, 'jawaban terlalu panjang', 'jawaban melebihi batas ditolak');
  eq((await player.submit(0)).why, 'soal ini meminta jawaban esai', 'pilihan ganda ditolak pada soal esai');
  const sent = await player.submitEssay(quiz[0].answer);
  check(sent.ok && room.answers[0].SE.text === quiz[0].answer && room.answers[0].SE.c === undefined, 'jawaban dikirim satu kali sebagai teks');
  eq(player.view().mode, 'essay', 'siswa menerima mode tanpa menerima kunci');
  eq(host.view().board[0].total, 1000, 'guru memberi skor penuh untuk jawaban yang memenuhi rubrik');
  await host.reveal();
  eq(room.meta.status, 'reveal', 'reveal esai mengubah fase ruang');
  eq(player.view().reveal.answer, quiz[0].answer, 'contoh jawaban baru diterima setelah reveal');
  eq([player.view().correct, player.view().gained], [true, 1000], 'siswa melihat skor esai setelah reveal');
  eq(host.view().answers.SE.text, quiz[0].answer, 'guru dapat memeriksa jawaban teks siswa');
  await host.close();
}


console.log(`\n${failed ? '✗' : '✓'} test-livequiz: ${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
