// Test inti sinkron cloud (js/shared/cloud-sync-core.js) — tanpa Firebase, tanpa jaringan.
// "Cloud" diganti server palsu di memori yang meniru kontrak adapter (get / push dengan expectedRev),
// dan beberapa "perangkat" = beberapa storage terpisah.
//   A. UTIL & UNIT     — hash deterministik, encode kunci, unit hanya accounting/excel/sqlpq (tanpa SPT)
//   B. PLAN            — matriks keputusan tiga arah
//   C. VALIDASI REMOTE — dokumen cloud = tak tepercaya
//   D. SKENARIO NYATA  — dua perangkat: pindah perangkat, reset, konflik, balapan tulis, pilihan tautan pertama,
//                        jaringan gagal, data cloud rusak, penyimpanan penuh, Game Hub
// Jalankan:  node tests/test-cloudsync.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const eq = (a, b, l) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) console.log(`   diharapkan ${JSON.stringify(b)} · didapat ${JSON.stringify(a)}`); check(ok, l); };
const section = (t) => console.log('\n=== ' + t + ' ===');
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');

globalThis.window = globalThis;
for (const f of ['js/shared/progress-aggregator.js', 'js/shared/cloud-sync-core.js']) vm.runInThisContext(src(f), { filename: f });
const PP = globalThis.PortalProgress, CS = globalThis.CloudSyncCore;

function makeStorage(initial = {}, opts = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (opts.failOn && opts.failOn(k, v)) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }, has: (k) => m.has(k), dump: () => Object.fromEntries(m)
  };
}
// Server palsu: menyimpan dokumen per unit; kontrak sama dengan adapter Firebase (get / push + expectedRev).
function makeCloud() {
  const docs = new Map(); let offline = false, beforePush = null;
  return {
    docs, setOffline: (v) => { offline = v; }, onBeforePush: (fn) => { beforePush = fn; },
    api: {
      get: async (id) => { if (offline) throw new Error('offline'); return docs.has(id) ? JSON.parse(docs.get(id)) : null; },
      push: async (id, doc, expectedRev) => {
        if (offline) throw new Error('offline');
        if (beforePush) { const f = beforePush; beforePush = null; f(); }
        const cur = docs.has(id) ? JSON.parse(docs.get(id)) : null;
        if ((cur ? cur.rev : null) !== expectedRev) return { ok: false, race: true };
        docs.set(id, JSON.stringify(doc)); return { ok: true };
      }
    }
  };
}
const sqlP = (xp, n) => JSON.stringify({ xp, totalAnswered: n, totalCorrect: Math.floor(n * 0.8), completedLessons: {}, history: [] });
const xlP = (xp, n) => JSON.stringify({ xp, soalDikerjakan: n, jawabanBenar: Math.floor(n * 0.7), levelAktif: 1, riwayat: [] });
let clock = 1_800_000_000_000;
function device(initial = {}, opts = {}) {
  const storage = makeStorage(initial, opts);
  const core = CS.create({ PP, storage, now: () => (clock += 1000) });
  const state = { units: {} };
  const unit = (id) => core.units.find((u) => u.id === id);
  return { storage, core, state, unit,
    sync: async (cloud, o = {}) => { const out = {}; for (const u of core.units) { try { out[u.id] = await core.syncUnit(u, cloud.api, state, { device: o.name || 'dev', choice: o.choice, askBeforePush: o.askBeforePush }); } catch (e) { out[u.id] = { action: 'exception', error: e.message }; } } return out; } };
}

/* ============ A. UTIL & UNIT ============ */
section('A. Util & definisi unit');
{
  eq(CS.hashData({ a: '1', b: '2' }), CS.hashData({ b: '2', a: '1' }), 'hash tidak bergantung urutan kunci');
  check(CS.hashData({ a: '1' }) !== CS.hashData({ a: '2' }), 'hash berubah bila nilai berubah');
  check(CS.hashData({ ab: 'c' }) !== CS.hashData({ a: 'bc' }), 'hash membedakan batas kunci/nilai (tanpa tabrakan sambungan)');
  check(CS.hashData({}) === CS.hashData({}), 'hash data kosong stabil');
  eq(CS.decodeKey(CS.encodeKey('efpg:progress')), 'efpg:progress', 'encode/decode kunci bolak-balik');
  check(!/[.$#\[\]\/]/.test(CS.encodeKey('a.b$c#d[e]f/g')), 'kunci ter-encode tak memuat karakter terlarang RTDB');
  const core = CS.create({ PP, storage: makeStorage() });
  eq(core.units.map((u) => u.id), ['accounting', 'excel', 'sqlpq'], 'unit sinkron = accounting, excel, sqlpq (Game Hub tidak lagi punya data yang disinkronkan)');
  check(!core.units.some((u) => u.id === 'spt'), 'SPT TIDAK disinkronkan di sini (punya sinkron sendiri)');
  const sptKeys = PP.MODULES.find((m) => m.id === 'spt').keys;
  check(core.units.every((u) => u.keys.every((k) => !sptKeys.includes(k))), 'tidak ada kunci SPT di unit mana pun');
  eq(core.units.find((u) => u.id === 'excel').keys, PP.MODULES.find((m) => m.id === 'excel').keys, 'kunci unit = kunci agregator (satu sumber kebenaran)');
  const loc = core.readLocal(core.units.find((u) => u.id === 'sqlpq'));
  check(loc.empty && loc.xp === 0 && loc.act === 0, 'lokal kosong terdeteksi');
}

/* ============ B. PLAN ============ */
section('B. Matriks keputusan');
{
  const core = CS.create({ PP, storage: makeStorage() });
  const L = (hash, xp = 0, act = 0, empty = false) => ({ hash, xp, act, empty, pristine: xp === 0 && act === 0, data: {} });
  const R = (hash, xp = 0, act = 0) => ({ hash, xp, act, pristine: xp === 0 && act === 0, rev: 1 });
  const base = { localHash: 'B', remoteHash: 'B' };
  const p = (l, r, b, c, a) => core.plan(l, r, b, c, a);
  eq(p(L('x', 5), null, null).action, 'push', 'cloud kosong + lokal berisi → push');
  eq(p(L('e', 0, 0, true), null, null).action, 'noop', 'dua sisi kosong → noop');
  eq(p(L('d', 0, 0), null, null).action, 'noop', 'lokal hanya state bawaan + cloud kosong → TIDAK diunggah');
  eq(p(L('d', 0, 0), R('r', 9, 2), null).action, 'pull', 'perangkat baru yang sudah menulis state bawaan → pull tanpa bertanya');
  eq(p(L('l', 9, 2), R('d', 0, 0), null).action, 'push', 'cloud hanya state bawaan, lokal ada kemajuan → push tanpa bertanya');
  eq(p(L('d1', 0, 0), R('d2', 0, 0), null).action, 'noop', 'dua sisi hanya state bawaan → noop');
  eq(p(L('d', 0, 0), null, null, null, true).action, 'noop', 'ganti akun tetapi lokal hanya state bawaan → tidak perlu bertanya');
  eq(p(L('e', 0, 0, true), R('r', 9), null).action, 'pull', 'perangkat baru (lokal kosong) → pull');
  eq(p(L('same'), R('same'), null).action, 'noop', 'tautan pertama, isi sama → noop');
  eq(p(L('a', 5), R('b', 9), null).action, 'needs-choice', 'tautan pertama, isi beda → BUTUH PILIHAN');
  eq(p(L('a', 5), R('b', 9), null, 'cloud').action, 'pull', 'pilihan cloud → pull');
  eq(p(L('a', 9), R('b', 5), null, 'local').action, 'push', 'pilihan perangkat → push');
  eq(p(L('a', 5), R('b', 9), null, 'merge').action, 'pull', 'gabung: cloud lebih maju → pull');
  eq(p(L('a', 9), R('b', 5), null, 'merge').action, 'push', 'gabung: lokal lebih maju → push');
  eq(p(L('B'), R('B'), base).action, 'noop', 'tak ada perubahan → noop');
  eq(p(L('new', 1), R('B'), base).action, 'push', 'hanya lokal berubah → push (termasuk nilai lebih rendah = reset)');
  eq(p(L('B'), R('new', 1), base).action, 'pull', 'hanya cloud berubah → pull');
  const c1 = p(L('l', 5, 1), R('r', 9, 1), base); eq([c1.action, c1.conflict], ['pull', true], 'konflik: cloud lebih maju (XP) → pull');
  const c2 = p(L('l', 9, 1), R('r', 5, 1), base); eq([c2.action, c2.conflict], ['push', true], 'konflik: lokal lebih maju → push');
  const c3 = p(L('l', 5, 9), R('r', 5, 2), base); eq(c3.action, 'push', 'konflik XP sama: jumlah aktivitas menentukan');
  const c4 = p(L('l', 5, 2), R('r', 5, 2), base); eq([c4.action, c4.conflict], ['push', true], 'konflik seri total → lokal menang (deterministik)');
  eq(p(L('same'), R('same'), base).action, 'noop', 'dua sisi berubah tetapi hasil sama → noop');
  eq(p(L('a', 5), null, null, null, true).action, 'needs-choice', 'ganti akun + cloud kosong + lokal berisi → BUTUH PILIHAN (tidak diunggah diam-diam)');
  eq(p(L('a', 5), null, null, 'local', true).action, 'push', 'ganti akun: pilih perangkat → push');
  eq(p(L('a', 5), null, null, 'merge', true).action, 'push', 'ganti akun: gabung → push');
  eq(p(L('a', 5), null, null, 'cloud', true).action, 'pull-empty', 'ganti akun: pilih cloud (kosong) → kosongkan perangkat');
  eq(p(L('e', 0, 0, true), null, null, null, true).action, 'noop', 'ganti akun tetapi lokal kosong → noop');
  eq(p(L('a', 5), null, null).action, 'push', 'pengguna pertama kali (bukan ganti akun) + cloud kosong → push otomatis');
}

/* ============ C. VALIDASI REMOTE ============ */
section('C. Dokumen cloud tak tepercaya');
{
  const core = CS.create({ PP, storage: makeStorage() });
  const sql = core.units.find((u) => u.id === 'sqlpq');
  const v = (u, raw) => core.validateRemote(u, raw);
  eq(v(sql, null).doc, null, 'null = belum ada dokumen');
  const good = { rev: 3, updatedAt: 5, device: 'x', hash: 'PALSU', data: { sqlpq_progress_v1: sqlP(100, 5) } };
  const g = v(sql, good);
  check(g.ok && g.doc.xp === 100 && g.doc.act === 5, 'dokumen valid diterima dan metrik dihitung dari data');
  check(g.doc.hash !== 'PALSU' && g.doc.hash === CS.hashData({ sqlpq_progress_v1: sqlP(100, 5) }), 'hash dari cloud TIDAK dipercaya (dihitung ulang)');
  const bad = (label, raw, u = sql) => check(!v(u, raw).ok, 'ditolak: ' + label);
  bad('bukan objek', 'x'); bad('array', []); bad('rev negatif', { rev: -1, data: {} }); bad('rev pecahan', { rev: 1.5, data: {} }); bad('rev teks', { rev: 'a', data: {} });
  bad('data bukan objek', { rev: 1, data: 5 });
  bad('kunci tak diizinkan', { rev: 1, data: { spt_simulator_data: '{}' } });
  bad('kunci milik unit lain', { rev: 1, data: { 'efpg:progress': '{}' } });
  bad('nilai bukan teks', { rev: 1, data: { sqlpq_progress_v1: { xp: 1 } } });
  bad('JSON rusak', { rev: 1, data: { sqlpq_progress_v1: '{rusak' } });
  bad('bentuk salah (array, diharapkan objek)', { rev: 1, data: { sqlpq_progress_v1: '[1,2]' } });
  bad('nilai terlalu besar', { rev: 1, data: { sqlpq_progress_v1: '{"a":"' + 'x'.repeat(PP.LIMITS.perKeyChars) + '"}' } });
  bad('kunci Game Hub lama (unit dihapus)', { rev: 1, data: { gamehub_state_v1: '{}' } });
  bad('kunci ter-encode palsu', { rev: 1, data: { '%E0%A4%A': '1' } });
  check(v(sql, { rev: 0 }).ok, 'tanpa data = dokumen kosong yang valid (hasil reset)');
  const proto = JSON.parse('{"rev":1,"data":{"__proto__":"x"}}'); bad('__proto__ sebagai kunci data', proto);
  eq(({}).x, undefined, 'prototype tidak tercemar');
}

/* ============ D. SKENARIO DUA PERANGKAT ============ */
section('D. Skenario nyata');
{
  // 1. pindah perangkat
  const cloud = makeCloud();
  const A = device({ sqlpq_progress_v1: sqlP(300, 20), 'efpg:progress': xlP(90, 6) });
  let r = await A.sync(cloud, { name: 'A' });
  eq([r.sqlpq.action, r.excel.action, r.accounting.action], ['push', 'push', 'noop'], 'perangkat A: push yang berisi, noop yang kosong');
  eq(cloud.docs.size, 2, 'cloud hanya menyimpan unit yang berisi');
  const B = device();
  r = await B.sync(cloud, { name: 'B' });
  eq([r.sqlpq.action, r.excel.action], ['pull', 'pull'], 'perangkat baru B: pull');
  eq(B.storage.getItem('sqlpq_progress_v1'), sqlP(300, 20), 'B menerima progres SQL persis sama');
  eq(B.storage.getItem('efpg:progress'), xlP(90, 6), 'B menerima progres Excel persis sama');
  r = await B.sync(cloud, { name: 'B' }); check(Object.values(r).every((x) => x.action === 'noop'), 'sinkron ulang = noop (idempoten)');
  r = await A.sync(cloud, { name: 'A' }); check(Object.values(r).every((x) => x.action === 'noop'), 'A juga noop setelah B');

  // 2. A maju → B menyusul
  A.storage.setItem('sqlpq_progress_v1', sqlP(450, 31));
  await A.sync(cloud, { name: 'A' });
  r = await B.sync(cloud, { name: 'B' });
  eq([r.sqlpq.action, r.excel.action], ['pull', 'noop'], 'B hanya menarik yang berubah');
  eq(B.storage.getItem('sqlpq_progress_v1'), sqlP(450, 31), 'B menyusul progres A');

  // 3. reset di A TIDAK dihidupkan kembali, merambat ke B
  A.storage.removeItem('sqlpq_progress_v1');
  r = await A.sync(cloud, { name: 'A' });
  eq(r.sqlpq.action, 'push', 'reset lokal dikirim (bukan dipulihkan dari cloud)');
  check(!A.storage.has('sqlpq_progress_v1'), 'A tetap kosong setelah sinkron');
  r = await B.sync(cloud, { name: 'B' });
  eq(r.sqlpq.action, 'pull', 'B menerima reset');
  check(!B.storage.has('sqlpq_progress_v1'), 'B ikut kosong');
  check(B.storage.has('efpg:progress'), 'unit lain tidak terdampak reset SQL');

  // 4. konflik: dua perangkat berubah offline → yang lebih maju menang
  A.storage.setItem('efpg:progress', xlP(120, 8));
  B.storage.setItem('efpg:progress', xlP(200, 14));
  await A.sync(cloud, { name: 'A' });                       // A sampai duluan (cloud = 120)
  r = await B.sync(cloud, { name: 'B' });                   // B: lokal 200 vs cloud 120, dua-duanya berubah
  eq([r.excel.action, r.excel.conflict], ['push', true], 'konflik: B (lebih maju) menang');
  r = await A.sync(cloud, { name: 'A' });
  eq(A.storage.getItem('efpg:progress'), xlP(200, 14), 'A menarik hasil yang lebih maju (tidak ada XP hilang)');
  A.storage.setItem('efpg:progress', xlP(210, 15)); B.storage.setItem('efpg:progress', xlP(205, 15));
  await B.sync(cloud, { name: 'B' }); r = await A.sync(cloud, { name: 'A' });
  eq([r.excel.action, r.excel.conflict], ['push', true], 'konflik lain: A (210) mengalahkan B (205)');
  await B.sync(cloud, { name: 'B' }); eq(B.storage.getItem('efpg:progress'), xlP(210, 15), 'B menyusul');

  // 5. balapan tulis: perangkat lain menulis TEPAT sebelum push kita
  const cloud2 = makeCloud(); const P = device({ sqlpq_progress_v1: sqlP(10, 1) }); await P.sync(cloud2, { name: 'P' });
  const Q = device(); await Q.sync(cloud2, { name: 'Q' });
  P.storage.setItem('sqlpq_progress_v1', sqlP(50, 4));
  cloud2.onBeforePush(() => { // Q menulis lebih dulu
    cloud2.docs.set('sqlpq', JSON.stringify({ rev: 2, updatedAt: 1, device: 'Q', hash: 'x', data: { sqlpq_progress_v1: sqlP(80, 7) } }));
  });
  r = await P.sync(cloud2, { name: 'P' });
  eq(r.sqlpq.conflict, true, 'balapan terdeteksi lewat expectedRev → dinilai ulang sebagai konflik');
  eq(JSON.parse(cloud2.docs.get('sqlpq')).data.sqlpq_progress_v1, sqlP(80, 7), 'tulisan Q yang lebih maju TIDAK tertimpa');
  eq(P.storage.getItem('sqlpq_progress_v1'), sqlP(80, 7), 'P menarik hasil Q');

  // 6. tautan pertama: dua sisi berisi → butuh pilihan, tidak ada yang disentuh
  const c3 = makeCloud(); const owner = device({ sqlpq_progress_v1: sqlP(500, 40) }); await owner.sync(c3, { name: 'owner' });
  const stranger = device({ sqlpq_progress_v1: sqlP(60, 5) });
  r = await stranger.sync(c3, { name: 's' });
  eq(r.sqlpq.action, 'needs-choice', 'perangkat dengan data lain → butuh pilihan');
  eq([r.sqlpq.local.xp, r.sqlpq.remote.xp], [60, 500], 'info untuk dialog pilihan: XP lokal vs cloud');
  eq(stranger.storage.getItem('sqlpq_progress_v1'), sqlP(60, 5), 'lokal TIDAK diubah sebelum dipilih');
  eq(JSON.parse(c3.docs.get('sqlpq')).rev, 1, 'cloud TIDAK diubah sebelum dipilih');
  r = await stranger.sync(c3, { name: 's', choice: 'cloud' });
  eq(stranger.storage.getItem('sqlpq_progress_v1'), sqlP(500, 40), 'pilih cloud → lokal diganti');
  const s2 = device({ sqlpq_progress_v1: sqlP(60, 5) }); await s2.sync(c3, { name: 's2', choice: 'local' });
  eq(JSON.parse(c3.docs.get('sqlpq')).data.sqlpq_progress_v1, sqlP(60, 5), 'pilih perangkat → cloud diganti');
  const s3 = device({ sqlpq_progress_v1: sqlP(900, 70) }); r = await s3.sync(c3, { name: 's3', choice: 'merge' });
  eq([r.sqlpq.action, r.sqlpq.conflict], ['push', true], 'gabung → yang lebih maju (lokal 900) menang');

  // 6a. perangkat baru yang membuka MODUL dulu (modul menulis state bawaan) → tarik progres, jangan bertanya
  const c3a = makeCloud(); const real = device({ sqlpq_progress_v1: sqlP(400, 30) }); await real.sync(c3a, { name: 'real' });
  const fresh = device({ sqlpq_progress_v1: JSON.stringify({ xp: 0, streak: 1, lastActiveDate: '2026-10-11', completedLessons: {}, totalAnswered: 0, totalCorrect: 0, history: [] }) });
  r = await fresh.sync(c3a, { name: 'fresh' });
  eq(r.sqlpq.action, 'pull', 'state bawaan + progres nyata di cloud → pull otomatis (tanpa dialog)');
  eq(fresh.storage.getItem('sqlpq_progress_v1'), sqlP(400, 30), 'progres nyata menggantikan state bawaan');
  const c3c = makeCloud(); const onlyDefault = device({ sqlpq_progress_v1: JSON.stringify({ xp: 0, streak: 1, lastActiveDate: '2026-10-11', completedLessons: {}, totalAnswered: 0, totalCorrect: 0, history: [] }) });
  r = await onlyDefault.sync(c3c, { name: 'od' });
  eq([r.sqlpq.action, c3c.docs.size], ['noop', 0], 'state bawaan saja tidak diunggah (cloud tetap bersih)');
  const c3d = makeCloud(); c3d.docs.set('sqlpq', JSON.stringify({ rev: 1, updatedAt: 1, device: 'x', hash: 'h', data: { sqlpq_progress_v1: JSON.stringify({ xp: 0, streak: 1, completedLessons: {}, totalAnswered: 0, totalCorrect: 0, history: [] }) } }));
  const earnest = device({ sqlpq_progress_v1: sqlP(90, 7) }); r = await earnest.sync(c3d, { name: 'e' });
  eq(r.sqlpq.action, 'push', 'cloud hanya berisi state bawaan → progres nyata lokal dikirim tanpa bertanya');

  // 6b. ganti akun di perangkat yang sama: data lokal akun lama TIDAK terunggah ke akun baru tanpa pilihan
  const c3b = makeCloud(); const shared = device({ sqlpq_progress_v1: sqlP(777, 50), 'efpg:progress': xlP(55, 4) });
  r = await shared.sync(c3b, { name: 'shared', askBeforePush: true });
  eq([r.sqlpq.action, r.excel.action, r.accounting.action], ['needs-choice', 'needs-choice', 'noop'], 'akun baru di perangkat bersama: butuh pilihan untuk unit yang berisi');
  eq(c3b.docs.size, 0, 'tidak ada yang terunggah ke akun baru sebelum dipilih');
  eq(shared.storage.getItem('sqlpq_progress_v1'), sqlP(777, 50), 'data lokal tidak diubah sebelum dipilih');
  r = await shared.sync(c3b, { name: 'shared', askBeforePush: true, choice: 'cloud' });
  eq([r.sqlpq.action, shared.storage.has('sqlpq_progress_v1'), shared.storage.has('efpg:progress')], ['pull', false, false], 'pilih cloud (kosong): perangkat dikosongkan untuk akun baru');
  r = await shared.sync(c3b, { name: 'shared', askBeforePush: false });
  check(Object.values(r).every((x) => x.action === 'noop'), 'sesudah dipilih: sinkron berikutnya noop');
  shared.storage.setItem('sqlpq_progress_v1', sqlP(5, 1)); r = await shared.sync(c3b, { name: 'shared' });
  eq(r.sqlpq.action, 'push', 'sesudah itu perubahan baru terunggah normal (rev berawal dari nol)');

  // 7. jaringan gagal: lokal aman, tidak crash
  const c4 = makeCloud(); const N = device({ sqlpq_progress_v1: sqlP(70, 6) }); await N.sync(c4, { name: 'N' });
  c4.setOffline(true); N.storage.setItem('sqlpq_progress_v1', sqlP(75, 7));
  r = await N.sync(c4, { name: 'N' });
  check(Object.values(r).every((x) => x.action === 'exception' || x.action === 'noop'), 'offline: tidak ada yang dianggap sukses');
  eq(N.storage.getItem('sqlpq_progress_v1'), sqlP(75, 7), 'offline: data lokal tidak disentuh');
  c4.setOffline(false); r = await N.sync(c4, { name: 'N' });
  eq(r.sqlpq.action, 'push', 'online lagi → perubahan tertunda terkirim');

  // 8. data cloud rusak/jahat → tidak menyentuh lokal
  const c5 = makeCloud(); c5.docs.set('sqlpq', JSON.stringify({ rev: 1, data: { sqlpq_progress_v1: '{rusak' } }));
  const V = device({ sqlpq_progress_v1: sqlP(33, 3) }); r = await V.sync(c5, { name: 'V' });
  eq([r.sqlpq.action, r.sqlpq.code], ['error', 'invalid-remote'], 'cloud rusak → error terkendali');
  eq(V.storage.getItem('sqlpq_progress_v1'), sqlP(33, 3), 'lokal utuh saat cloud rusak');
  c5.docs.set('excel', JSON.stringify({ rev: 1, data: { spt_simulator_data: '{"xp":999999}' } }));
  r = await V.sync(c5, { name: 'V' }); eq(r.excel.action, 'error', 'cloud mencoba menyelundupkan kunci SPT → ditolak');
  check(!V.storage.has('spt_simulator_data'), 'kunci SPT tidak pernah ditulis dari cloud');

  // 9. penyimpanan penuh saat pull → rollback
  const c6 = makeCloud(); const S = device({ sqlpq_progress_v1: sqlP(99, 9) }); await S.sync(c6, { name: 'S' });
  c6.docs.set('sqlpq', JSON.stringify({ rev: 2, updatedAt: 9, device: 'z', hash: 'x', data: { sqlpq_progress_v1: sqlP(120, 11), sqlpq_dataset_history_v1: '[1]' } }));
  const full = device({ sqlpq_progress_v1: sqlP(99, 9) }); full.state.units.sqlpq = { localHash: full.core.readLocal(full.unit('sqlpq')).hash, remoteHash: 'lama', rev: 1 };
  const failing = makeStorage({ sqlpq_progress_v1: sqlP(99, 9) }, { failOn: (k) => k === 'sqlpq_dataset_history_v1' });
  const fcore = CS.create({ PP, storage: failing, now: () => 1 }); const fstate = { units: { sqlpq: { localHash: fcore.readLocal(fcore.units[2]).hash, remoteHash: 'lama', rev: 1 } } };
  r = await fcore.syncUnit(fcore.units[2], c6.api, fstate, {});
  eq([r.action, r.code], ['error', 'local-write'], 'penyimpanan penuh → error terkendali');
  eq(failing.getItem('sqlpq_progress_v1'), sqlP(99, 9), 'rollback: nilai lama dikembalikan');
}

console.log(`\n========== test-cloudsync: ${passed} lolos, ${failed} gagal ==========`);
process.exit(failed ? 1 : 0);
