#!/usr/bin/env node
// Pemeriksa Firebase Realtime Database Rules (database.rules.json) — tanpa dependency,
// tanpa emulator, tanpa akun Firebase. Jalan di CI (job "lint") dan lokal:
//
//     node scripts/check-firebase-rules.mjs
//
// Yang diperiksa:
//   A. STATIS   — tidak ada .read/.write publik; data pengguna dikunci ke uid pemiliknya;
//                 field yang DITULIS aplikasi (apps/spt/js/app-main.js) semuanya punya aturan,
//                 sehingga menambah field baru tanpa memperbarui rules akan langsung gagal di CI
//                 (kalau tidak, sinkron cloud akan ditolak diam-diam di produksi).
//   B. PERILAKU — rules dijalankan terhadap payload nyata lewat simulator kecil: pemilik boleh
//                 menulis progres normal; orang lain/anonim-lain/tanpa-login ditolak; data di
//                 luar skema atau di luar batas ditolak.
//
// CATATAN JUJUR: simulator ini PENDEKATAN (mengevaluasi ekspresi rules sebagai JavaScript
// terhadap mock `newData`), bukan pengganti Firebase Emulator / Rules Playground. Ia menangkap
// kesalahan logika & regresi skema; uji akhir sebelum deploy tetap lewat Rules Playground
// (Firebase Console → Realtime Database → Rules → Rules Playground, gratis). Lihat SECURITY.md.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, passed = 0;
const check = (cond, label) => { if (cond) passed++; else { failed++; console.log(`::error::${label}`); } };
const section = (t) => console.log('\n== ' + t + ' ==');

const rules = JSON.parse(readFileSync(join(ROOT, 'database.rules.json'), 'utf8')).rules;
const firebaseJson = JSON.parse(readFileSync(join(ROOT, 'firebase.json'), 'utf8'));

// ---------------------------------------------------------------- A. STATIS --
section('A. Pemeriksaan statis');
check(firebaseJson.database && firebaseJson.database.rules === 'database.rules.json', 'firebase.json harus menunjuk ke database.rules.json');
check(rules['.read'] === false && rules['.write'] === false, 'root: .read/.write harus false (default tolak semua)');

// Tidak boleh ada .read/.write "true" atau ekspresi tanpa pengecekan auth di MANA PUN.
(function scan(node, path) {
  if (typeof node !== 'object' || node === null) return;
  for (const [k, v] of Object.entries(node)) {
    if (k === '.read' || k === '.write') {
      // Kuis Langsung (liveRooms): kode ruang 6 karakter acak = rahasia ruang. .read boleh 'auth != null' PERSIS (data ruang tanpa kunci);
      // .write/.read lain tetap wajib terikat uid (pemilik/guru/siswa itu sendiri). Perilakunya diuji di bagian D.
      const liveRead = k === '.read' && path.startsWith('/liveRooms/$code/') && v === 'auth != null';
      const ok = v === false || liveRead || (typeof v === 'string' && /auth\s*!=\s*null/.test(v) && /auth\.uid\s*(===|!==)\s*\$\w+|===\s*auth\.uid/.test(v));
      check(ok, `${path}/${k} harus false atau dikunci ke pemilik (auth != null && auth.uid === $uid) — ditemukan: ${JSON.stringify(v)}`);
    } else scan(v, path + '/' + k);
  }
})(rules, '');

const userNode = rules.users && rules.users.$uid;
check(!!userNode, 'users/$uid harus ada');
check(rules.users && Object.keys(rules.users).filter((k) => !k.startsWith('.')).join() === '$uid', 'users hanya boleh punya wildcard $uid');
check(userNode && userNode.$other && userNode.$other['.validate'] === false, 'users/$uid harus menolak field di luar skema ($other: false)');
check(userNode && userNode.history && userNode.history.$index && userNode.history.$index.$other, 'history/$index harus menolak field di luar skema');

// Field yang ditulis aplikasi harus punya aturan. Sumber kebenaran: appState.user di app-*.js (app-main.js dipecah per tanggung jawab).
const sptJsDir = join(ROOT, 'apps/spt/js');
const src = readdirSync(sptJsDir).filter((f) => /^app-.*\.js$/.test(f)).sort().map((f) => readFileSync(join(sptJsDir, f), 'utf8')).join('\n');
const written = new Set();
for (const m of src.matchAll(/appState\.user\.([A-Za-z_]\w*)\s*(?:=(?!=)|\.push\()/g)) written.add(m[1]);
for (const m of src.matchAll(/appState\.user\s*=\s*\{([^}]*)\}/g)) for (const k of m[1].matchAll(/(?:^|,)\s*([A-Za-z_]\w*)\s*:/g)) written.add(k[1]);
console.log('  Field yang ditulis app ke users/$uid:', [...written].sort().join(', '));
check(written.size >= 5, 'pemindai harus menemukan field appState.user (kalau 0, pola kode berubah — perbarui pemindai ini)');
for (const f of written) check(userNode && userNode[f], `field "${f}" ditulis app tetapi TIDAK punya aturan di database.rules.json (sinkron cloud akan ditolak)`);
// Sebaliknya: aturan untuk field yang sudah tidak dipakai app = kemungkinan sisa lama.
for (const f of Object.keys(userNode || {}).filter((k) => !k.startsWith('.') && !k.startsWith('$')))
  check(written.has(f), `aturan "${f}" tidak ada penulisnya di apps/spt/js/app-*.js (sisa lama? hapus atau perbarui pemindai)`);

// ------------------------------------------------------------ B. PERILAKU --
section('B. Simulasi rules terhadap payload nyata');
String.prototype.matches = function (re) { return re.test(String(this)); }; // sama seperti String.matches() di Rules

const isObj = (v) => v !== null && typeof v === 'object';
function snap(value) {
  return {
    val: () => value,
    exists: () => value !== null && value !== undefined,
    isNumber: () => typeof value === 'number',
    isString: () => typeof value === 'string',
    isBoolean: () => typeof value === 'boolean',
    hasChildren: (keys) => isObj(value) && (!keys || keys.every((k) => value[k] !== undefined && value[k] !== null)),
    hasChild: (k) => isObj(value) && value[k] !== undefined && value[k] !== null
  };
}
function evalExpr(expr, vars, extra) {
  if (typeof expr === 'boolean') return expr;
  const names = Object.keys(vars);
  // eslint-disable-next-line no-new-func
  return !!new Function('newData', 'auth', 'now', ...names, `return (${expr});`)(extra.newData, extra.auth, Date.now(), ...names.map((n) => vars[n]));
}
// RTDB menyimpan array sebagai objek ber-kunci indeks, dan membuang null/undefined/array kosong.
function normalize(v) {
  if (Array.isArray(v)) { const o = {}; v.forEach((x, i) => { const n = normalize(x); if (n !== null) o[String(i)] = n; }); return Object.keys(o).length ? o : null; }
  if (isObj(v)) { const o = {}; for (const [k, x] of Object.entries(v)) { const n = normalize(x); if (n !== null && n !== undefined) o[k] = n; } return Object.keys(o).length ? o : null; }
  return v === undefined ? null : v;
}
function validateTree(ruleNode, value, vars, auth) {
  if (value === null) return true;
  if (ruleNode['.validate'] !== undefined && !evalExpr(ruleNode['.validate'], vars, { newData: snap(value), auth })) return false;
  if (isObj(value)) {
    for (const key of Object.keys(value)) {
      let child = ruleNode[key], v = vars;
      if (!child) { const wc = Object.keys(ruleNode).find((k) => k.startsWith('$')); if (wc) { child = ruleNode[wc]; v = Object.assign({}, vars, { [wc]: key }); } }
      if (child && !validateTree(child, value[key], v, auth)) return false;
    }
  }
  return true;
}
// Simulasi: auth mencoba `set('users/<uid>', payload)`.
function canWrite(auth, uid, payload) {
  if (!evalExpr(userNode['.write'], { $uid: uid }, { newData: snap(payload), auth })) return false;
  return validateTree(userNode, normalize(payload), { $uid: uid }, auth);
}
function canRead(auth, uid) { return evalExpr(userNode['.read'], { $uid: uid }, { newData: snap(null), auth }); }

const ME = { uid: 'user-aaa' }, OTHER = { uid: 'user-bbb' }, NOBODY = null;
const base = () => ({ xp: 120, level: 1, history: [], email: '', displayName: '', updatedAt: Date.now() });
const entry = (over) => Object.assign({ date: '30/9/2026', module: '1770 SS', mode: 'form', score: 85 }, over);

// Akses
check(canRead(ME, 'user-aaa'), 'pemilik boleh membaca datanya');
check(!canRead(OTHER, 'user-aaa'), 'pengguna lain TIDAK boleh membaca data orang lain');
check(!canRead(NOBODY, 'user-aaa'), 'tanpa login TIDAK boleh membaca');
check(canWrite(ME, 'user-aaa', base()), 'pemilik boleh menulis');
check(!canWrite(OTHER, 'user-aaa', base()), 'pengguna lain TIDAK boleh menulis ke data orang lain');
check(!canWrite(NOBODY, 'user-aaa', base()), 'tanpa login TIDAK boleh menulis');

// Payload yang memang dihasilkan app
check(canWrite(ME, 'user-aaa', { xp: 0, level: 1, history: [], email: '', displayName: '', updatedAt: 0 }), 'state awal (default app) diterima');
check(canWrite(ME, 'user-aaa', { xp: 0, level: 1, email: '', displayName: '' }), 'state tanpa updatedAt & history diterima (field opsional)');
check(canWrite(ME, 'user-aaa', Object.assign(base(), { xp: 1234.5, level: 7, email: 'siswa@contoh.id', displayName: 'Siswa Pajak', history: [entry(), entry({ mode: 'kasus', score: 0 }), entry({ module: '1771 (Form Lengkap)', score: 100 })] })), 'progres lengkap dengan riwayat diterima');
check(canWrite(ME, 'user-aaa', base().history && Object.assign(base(), { history: Array.from({ length: 500 }, () => entry()) })), 'riwayat 500 entri diterima');
check(canWrite(ME, 'user-aaa', Object.assign(base(), { history: [{ date: '1/1/2026', score: 50 }] })), 'entri riwayat tanpa module/mode diterima');

// Data di luar skema / di luar batas
const bad = (label, payload) => check(!canWrite(ME, 'user-aaa', payload), 'ditolak: ' + label);
bad('xp negatif', Object.assign(base(), { xp: -1 }));
bad('xp di atas batas', Object.assign(base(), { xp: 1e9 }));
bad('xp berupa teks', Object.assign(base(), { xp: '100' }));
bad('level 0', Object.assign(base(), { level: 0 }));
bad('updatedAt berupa teks', Object.assign(base(), { updatedAt: 'kemarin' }));
bad('field tak dikenal (isAdmin)', Object.assign(base(), { isAdmin: true }));
bad('field tak dikenal bersarang', Object.assign(base(), { extra: { a: 1 } }));
bad('email > 254 karakter', Object.assign(base(), { email: 'a'.repeat(255) }));
bad('displayName > 100 karakter', Object.assign(base(), { displayName: 'x'.repeat(101) }));
bad('displayName bukan teks', Object.assign(base(), { displayName: 42 }));
bad('tanpa xp', { level: 1, email: '', displayName: '' });
bad('tanpa level', { xp: 1, email: '', displayName: '' });
bad('riwayat: entri tanpa score', Object.assign(base(), { history: [{ date: 'x', module: 'm' }] }));
bad('riwayat: score berupa teks', Object.assign(base(), { history: [entry({ score: '90' })] }));
bad('riwayat: score > 1000', Object.assign(base(), { history: [entry({ score: 5000 })] }));
bad('riwayat: field tak dikenal', Object.assign(base(), { history: [entry({ hack: 'x' })] }));
bad('riwayat: module terlalu panjang', Object.assign(base(), { history: [entry({ module: 'm'.repeat(101) })] }));
bad('riwayat: kunci bukan angka', Object.assign(base(), { history: { abc: entry() } }));
bad('riwayat: indeks ≥ 10.000 (batas anti-penuhi kuota)', Object.assign(base(), { history: { 12345: entry() } }));
check(canWrite(ME, 'user-aaa', Object.assign(base(), { history: { 9999: entry() } })), 'riwayat: indeks 9999 (batas atas) masih diterima');

// ============================================================ C. portalSync ==
// Cabang sinkron cloud lintas modul (js/shared/cloud-sync*.js). SENGAJA terpisah dari users/$uid
// (skema SPT yang menolak field asing) supaya sinkron SPT yang sudah berjalan tidak terganggu.
section('C. portalSync (sinkron cloud Accounting, Excel, SQL & Power Query)');
import vm from 'node:vm';
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8');
globalThis.window = globalThis;
for (const f of ['js/shared/progress-aggregator.js', 'js/shared/cloud-sync-core.js']) vm.runInThisContext(rd(f), { filename: f });
const PPx = globalThis.PortalProgress, CSx = globalThis.CloudSyncCore;

const psRoot = rules.portalSync, psNode = psRoot && psRoot.$uid;
check(!!psNode, 'portalSync/$uid harus ada');
check(psRoot && Object.keys(psRoot).filter((k) => !k.startsWith('.')).join() === '$uid', 'portalSync hanya boleh punya wildcard $uid');
check(rules['.read'] === false && rules['.write'] === false, 'root tetap tertutup');
check(!!(psNode && psNode.$unit && psNode.$unit.$other && psNode.$unit.$other['.validate'] === false), 'portalSync/$uid/$unit harus menolak field di luar skema');
check(!!(psNode && psNode.$unit && psNode.$unit.data && psNode.$unit.data.$key), 'portalSync/.../data/$key harus punya aturan');
check(JSON.stringify(Object.keys(userNode).filter((k) => !k.startsWith('.') && !k.startsWith('$')).sort()) === JSON.stringify(['displayName', 'email', 'history', 'level', 'updatedAt', 'xp']), 'users/$uid TIDAK berubah (skema SPT utuh)');

// Field yang ditulis adapter (buildRemote) harus punya aturan — sumber kebenaran: cloud-sync-core.js
const coreSrc = rd('js/shared/cloud-sync-core.js');
const docLit = coreSrc.match(/var doc = \{([^}]*)\}/);
const docFields = docLit ? [...docLit[1].matchAll(/(?:^|,)\s*([A-Za-z_]\w*)\s*:/g)].map((m) => m[1]) : [];
console.log('  Field dokumen yang ditulis adapter:', [...docFields, 'data'].sort().join(', '));
check(docFields.length >= 6, 'pemindai harus menemukan field dokumen di buildRemote (kalau 0, pola kode berubah — perbarui pemindai)');
for (const f of [...docFields, 'data']) check(psNode && psNode.$unit && psNode.$unit[f], `field "${f}" ditulis adapter tetapi TIDAK punya aturan di portalSync`);
for (const f of Object.keys((psNode && psNode.$unit) || {}).filter((k) => !k.startsWith('.') && !k.startsWith('$') && k !== 'data'))
  check(docFields.includes(f), `aturan portalSync "${f}" tidak ada penulisnya di cloud-sync-core.js (sisa lama?)`);

// Daftar kunci per unit di aturan = daftar kunci agregator (satu sumber kebenaran). Kunci SPT tidak boleh muncul.
const keyRule = psNode && psNode.$unit && psNode.$unit.data && psNode.$unit.data.$key && psNode.$unit.data.$key['.validate'];
const unitsCore = CSx.create({ PP: PPx, storage: { getItem: () => null, setItem() {}, removeItem() {} } }).units;
for (const u of unitsCore) for (const k of u.keys) {
  const enc = CSx.encodeKey(k);
  const mentioned = typeof keyRule === 'string' && (keyRule.includes(enc) || keyRule.includes(k) ||
    (k.startsWith('ACT_MASTER_') && /ACT_MASTER_\(STATE\|PROGRESS\|TAX_STATE\)/.test(keyRule) && ['ACT_MASTER_STATE', 'ACT_MASTER_PROGRESS', 'ACT_MASTER_TAX_STATE'].includes(k)) ||
    (k.startsWith('sqlpq_') && /sqlpq_\(progress_v1\|dataset_history_v1\)/.test(keyRule)));
  check(mentioned, `kunci "${k}" (unit ${u.id}) tidak ada di aturan portalSync/data/$key`);
}
for (const k of PPx.MODULES.find((m) => m.id === 'spt').keys) check(typeof keyRule === 'string' && !keyRule.includes(k), `kunci SPT "${k}" tidak boleh ada di portalSync`);

function canWritePS(auth, uid, payload) {
  if (!evalExpr(psNode['.write'], { $uid: uid }, { newData: snap(payload), auth })) return false;
  return validateTree(psNode, normalize(payload), { $uid: uid }, auth);
}
const canReadPS = (auth, uid) => evalExpr(psNode['.read'], { $uid: uid }, { newData: snap(null), auth });

// Payload NYATA: dibuat oleh buildRemote dari data bentuk asli modul
const mem = new Map([['sqlpq_progress_v1', JSON.stringify({ xp: 320, totalAnswered: 20, totalCorrect: 16, completedLessons: {}, history: [] })],
  ['efpg:progress', JSON.stringify({ xp: 90, soalDikerjakan: 6, jawabanBenar: 4, levelAktif: 1, riwayat: [] })],
  ['ACT_MASTER_STATE', JSON.stringify({ xp: 20, level: 1, history: [{ t: 1 }] })]]);
const coreReal = CSx.create({ PP: PPx, storage: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem() {}, removeItem() {} }, now: () => Date.now() });
const docOf = (id) => { const u = coreReal.units.find((x) => x.id === id); return coreReal.buildRemote(u, coreReal.readLocal(u), 0, 'dev1'); };
const UID = 'user-aaa';
check(canReadPS(ME, UID), 'pemilik boleh membaca portalSync miliknya');
check(!canReadPS(OTHER, UID), 'pengguna lain TIDAK boleh membaca portalSync orang lain');
check(!canReadPS(NOBODY, UID), 'tanpa login TIDAK boleh membaca portalSync');
for (const id of ['accounting', 'excel', 'sqlpq']) check(canWritePS(ME, UID, { [id]: docOf(id) }), `dokumen nyata unit ${id} diterima`);
check(canWritePS(ME, UID, { sqlpq: { rev: 2, updatedAt: Date.now(), device: 'd', hash: 'abc', xp: 0, act: 0 } }), 'dokumen kosong (hasil reset, tanpa data) diterima');
check(!canWritePS(OTHER, UID, { sqlpq: docOf('sqlpq') }), 'pengguna lain TIDAK boleh menulis ke portalSync orang lain');
check(!canWritePS(NOBODY, UID, { sqlpq: docOf('sqlpq') }), 'tanpa login TIDAK boleh menulis portalSync');
const badPS = (label, payload) => check(!canWritePS(ME, UID, payload), 'portalSync ditolak: ' + label);
const D = (over) => Object.assign({}, docOf('sqlpq'), over);
badPS('unit tak dikenal (spt)', { spt: docOf('sqlpq') });
badPS('unit tak dikenal (admin)', { admin: docOf('sqlpq') });
badPS('rev negatif', { sqlpq: D({ rev: -1 }) });
badPS('rev teks', { sqlpq: D({ rev: '1' }) });
badPS('rev di atas batas', { sqlpq: D({ rev: 1e9 }) });
badPS('tanpa rev', { sqlpq: (({ rev, ...r }) => r)(docOf('sqlpq')) });
badPS('tanpa hash', { sqlpq: (({ hash, ...r }) => r)(docOf('sqlpq')) });
badPS('tanpa updatedAt', { sqlpq: (({ updatedAt, ...r }) => r)(docOf('sqlpq')) });
badPS('hash > 32 karakter', { sqlpq: D({ hash: 'a'.repeat(33) }) });
badPS('device > 64 karakter', { sqlpq: D({ device: 'd'.repeat(65) }) });
badPS('xp negatif', { sqlpq: D({ xp: -1 }) });
badPS('xp di atas batas', { sqlpq: D({ xp: 1e10 }) });
badPS('field tak dikenal (isAdmin)', { sqlpq: D({ isAdmin: true }) });
badPS('field tak dikenal bersarang', { sqlpq: D({ extra: { a: 1 } }) });
badPS('data: kunci SPT diselundupkan', { sqlpq: D({ data: { spt_simulator_data: '{}' } }) });
badPS('data: kunci milik unit lain (Excel di unit SQL)', { sqlpq: D({ data: { 'efpg%3Aprogress': '{}' } }) });
badPS('data: kunci Game Hub lama di unit Accounting (unit gamehub sudah dihapus)', { accounting: Object.assign(docOf('accounting'), { data: { gamehub_state_v1: '{}' } }) });
badPS('unit gamehub (dihapus) ditolak', { gamehub: docOf('sqlpq') });
badPS('data: kunci tidak ter-encode (efpg:progress)', { excel: Object.assign(docOf('excel'), { data: { 'efpg:progress': '{}' } }) });
badPS('data: nilai bukan teks', { sqlpq: D({ data: { sqlpq_progress_v1: { xp: 1 } } }) });
badPS('data: nilai > 2.000.000 karakter', { sqlpq: D({ data: { sqlpq_progress_v1: 'x'.repeat(2000001) } }) });
check(canWritePS(ME, UID, { sqlpq: D({ data: { sqlpq_progress_v1: 'x'.repeat(2000000) } }) }), 'data: nilai tepat 2.000.000 karakter (batas atas) masih diterima');
// SPT tidak boleh menulis lewat jalur users/$uid dengan field portalSync
check(!canWrite(ME, 'user-aaa', Object.assign(base(), { portalSync: { sqlpq: docOf('sqlpq') } })), 'users/$uid menolak field portalSync (cabang terpisah)');


// ------------------------------------------------------------ D. KUIS LANGSUNG --
section('D. liveRooms (Kuis Langsung): guru, siswa, kunci jawaban');
const liveRules = rules.liveRooms;
check(!!liveRules && liveRules['.read'] === false && liveRules['.write'] === false, 'liveRooms: root .read/.write false (tidak bisa daftar/menulis semua ruang)');
check(liveRules && Object.keys(liveRules).filter((k) => !k.startsWith('.')).join() === '$code', 'liveRooms hanya punya wildcard $code');
const L_ = {
  snap(value) {
    const v = value === undefined ? null : value;
    return { val: () => v, exists: () => v !== null, isNumber: () => typeof v === 'number', isString: () => typeof v === 'string', isBoolean: () => typeof v === 'boolean',
      hasChildren: (keys) => isObj(v) && (!keys || keys.every((k) => v[k] !== undefined && v[k] !== null)), hasChild: (k) => isObj(v) && v[k] != null,
      child: (p) => L_.snap(L_.get(v, p)) };
  },
  get(obj, p) { let cur = obj; for (const k of String(p).split('/').filter(Boolean)) { if (!isObj(cur)) return null; cur = cur[k]; } return cur === undefined ? null : cur; },
  set(obj, p, val) { const ks = p.split('/').filter(Boolean); let cur = obj; ks.slice(0, -1).forEach((k) => { if (!isObj(cur[k])) cur[k] = {}; cur = cur[k]; }); if (val === null) delete cur[ks[ks.length - 1]]; else cur[ks[ks.length - 1]] = JSON.parse(JSON.stringify(val)); },
  chain(path) { // [{node, vars, abs}] dari 'liveRooms' sampai node target (wildcard dipetakan)
    let node = liveRules, vars = {}, abs = 'liveRooms'; const out = [{ node, vars: { ...vars }, abs }];
    for (const seg of path.split('/').slice(1)) {
      let child = node[seg], v = vars;
      if (!child || typeof child !== 'object') { const wc = Object.keys(node).find((k) => k.startsWith('$')); if (!wc) return out.concat([{ node: null, vars, abs: abs + '/' + seg }]); child = node[wc]; v = { ...vars, [wc]: seg }; }
      node = child; vars = v; abs += '/' + seg; out.push({ node, vars: { ...vars }, abs });
    }
    return out;
  },
  ev(expr, vars, ctx) { return typeof expr === 'boolean' ? expr : !!new Function('newData', 'data', 'root', 'auth', 'now', ...Object.keys(vars), `return (${expr});`)(ctx.newData, ctx.data, ctx.root, ctx.auth, Date.now(), ...Object.values(vars)); },
  validate(node, abs, newTree, vars, auth, root, oldTree, valuePath) {
    // validasi node & turunan yang ikut ditulis (valuePath = path tertulis); node di atas jalur dievaluasi terhadap pohon gabungan
    const nd = L_.snap(L_.get(newTree, abs)), dd = L_.snap(L_.get(oldTree, abs));
    if (!nd.exists()) return true;
    if (node['.validate'] !== undefined && !L_.ev(node['.validate'], vars, { newData: nd, data: dd, root, auth })) return false;
    const onPath = valuePath === abs || valuePath.startsWith(abs + '/');
    if (valuePath === abs || !onPath) {
      const val = nd.val();
      if (isObj(val)) for (const key of Object.keys(val)) {
        let child = node[key], v = vars; if (!child || typeof child !== 'object' || key.startsWith('.')) { const wc = Object.keys(node).find((k) => k.startsWith('$')); if (!wc) continue; child = node[wc]; v = { ...vars, [wc]: key }; }
        if (!L_.validate(child, abs + '/' + key, newTree, v, auth, root, oldTree, abs + '/' + key + '#')) return false;
      }
    }
    return true;
  },
  can(op, auth, tree, path, value) {
    const ch = L_.chain(path); const root = L_.snap(tree);
    if (op === 'read') return ch.some((c) => c.node && c.node['.read'] !== undefined && L_.ev(c.node['.read'], c.vars, { newData: L_.snap(null), data: L_.snap(L_.get(tree, c.abs)), root, auth }));
    const newTree = JSON.parse(JSON.stringify(tree)); L_.set(newTree, path, value);
    const granted = ch.some((c) => c.node && c.node['.write'] !== undefined && L_.ev(c.node['.write'], c.vars, { newData: L_.snap(L_.get(newTree, c.abs)), data: L_.snap(L_.get(tree, c.abs)), root, auth }));
    if (!granted || ch.some((c) => !c.node)) return false;
    // setiap node pada jalur (dan turunan tertulis) harus lolos .validate
    for (const c of ch) { if (!c.node) return false; const nd = L_.snap(L_.get(newTree, c.abs)); if (nd.exists() && c.node['.validate'] !== undefined && c.abs !== path && !L_.ev(c.node['.validate'], c.vars, { newData: nd, data: L_.snap(L_.get(tree, c.abs)), root, auth })) return false; }
    const last = ch[ch.length - 1];
    return L_.validate(last.node, last.abs, newTree, last.vars, auth, root, tree, path);
  }
};
const CODE = 'ABC234', R = 'liveRooms/' + CODE, HOST = { uid: 'guru-1' }, S1 = { uid: 'siswa-1' };
const meta = (over) => Object.assign({ host: 'guru-1', status: 'lobby', qIndex: -1, qCount: 0, timer: 20, theme: 'pajak', title: 'Uji', createdAt: Date.now() }, over);
const room = (over) => ({ liveRooms: { [CODE]: Object.assign({ meta: meta() }, over) } });
const questions = { 0: { q: 'Berapa?', o: ['1', '2', '3', '4'] }, 1: { q: 'Lagi?', o: ['a', 'b'] } };
const live = (label, ok, got) => check(got === ok, `liveRooms: ${label}`);

// Membuat ruang
live('guru membuat ruang baru (host = uid sendiri)', true, L_.can('write', HOST, {}, R, { meta: meta() }));
live('tanpa login TIDAK bisa membuat ruang', false, L_.can('write', null, {}, R, { meta: meta() }));
live('tidak bisa membuat ruang dengan host orang lain', false, L_.can('write', S1, {}, R, { meta: meta() }));
live('ruang tanpa meta ditolak', false, L_.can('write', S1, {}, R, { players: { 'siswa-1': { name: 'A', joinedAt: 1 } } }));
live('timer di luar 5–300 ditolak', false, L_.can('write', HOST, {}, R, { meta: meta({ timer: 3 }) }) || L_.can('write', HOST, {}, R, { meta: meta({ timer: 301 }) }));
live('status tak dikenal ditolak', false, L_.can('write', HOST, {}, R, { meta: meta({ status: 'hack' }) }));
live('field tak dikenal di meta ditolak', false, L_.can('write', HOST, {}, R, { meta: meta({ isAdmin: true }) }));
live('menimpa ruang yang sudah ada oleh orang lain ditolak', false, L_.can('write', S1, room(), R, { meta: meta({ host: 'siswa-1' }) }));
live('anak tak dikenal di ruang ditolak', false, L_.can('write', HOST, room(), R + '/rahasia', { a: 1 }));
// Hak guru
live('guru mengubah status meta', true, L_.can('write', HOST, room(), R + '/meta/status', 'question'));
live('siswa TIDAK bisa mengubah meta', false, L_.can('write', S1, room(), R + '/meta/status', 'finished'));
live('siswa TIDAK bisa mengganti host', false, L_.can('write', S1, room(), R + '/meta/host', 'siswa-1'));
live('guru menulis soal publik', true, L_.can('write', HOST, room(), R + '/questions', questions));
live('guru menulis kunci', true, L_.can('write', HOST, room(), R + '/key', { 0: 2, 1: 0 }));
live('guru menulis starts', true, L_.can('write', HOST, room(), R + '/starts/0', Date.now()));
live('guru menulis skor siswa', true, L_.can('write', HOST, room(), R + '/scores/siswa-1', { total: 900, correct: 1, ms: 1200 }));
live('guru menulis reveal', true, L_.can('write', HOST, room(), R + '/reveal/0', { a: 2, e: 'Karena…' }));
live('soal dengan 5 pilihan ditolak', false, L_.can('write', HOST, room(), R + '/questions', { 0: { q: 'x', o: ['1', '2', '3', '4', '5'] } }));
live('soal dengan kunci/field ekstra ditolak (kunci tak boleh bocor ke data publik)', false, L_.can('write', HOST, room(), R + '/questions', { 0: { q: 'x', o: ['1', '2'], a: 1 } }));
live('skor di atas batas ditolak', false, L_.can('write', HOST, room(), R + '/scores/siswa-1', { total: 1e9, correct: 1, ms: 1 }));
live('guru menghapus ruang', true, L_.can('write', HOST, room(), R, null));
// Siswa
const player = { name: 'Ani', joinedAt: Date.now() };
live('siswa bergabung (players/<uid sendiri>)', true, L_.can('write', S1, room(), R + '/players/siswa-1', player));
live('siswa TIDAK bisa menulis pemain lain', false, L_.can('write', S1, room(), R + '/players/siswa-2', player));
live('tanpa login TIDAK bisa bergabung', false, L_.can('write', null, room(), R + '/players/x', player));
live('nama 25 karakter ditolak', false, L_.can('write', S1, room(), R + '/players/siswa-1', { name: 'x'.repeat(25), joinedAt: 1 }));
live('nama kosong ditolak', false, L_.can('write', S1, room(), R + '/players/siswa-1', { name: '', joinedAt: 1 }));
live('field ekstra pada pemain ditolak', false, L_.can('write', S1, room(), R + '/players/siswa-1', { name: 'A', joinedAt: 1, score: 99999 }));
for (const n of ['questions', 'key', 'starts/0', 'reveal/0', 'scores/siswa-1']) live('siswa TIDAK bisa menulis ' + n, false, L_.can('write', S1, room({ starts: { 0: 1 } }), R + '/' + n, n === 'scores/siswa-1' ? { total: 99999, correct: 9, ms: 1 } : n === 'key' ? { 0: 1 } : n === 'questions' ? questions : n.startsWith('reveal') ? { a: 1 } : 5));
// Jawaban
const live1 = room({ starts: { 0: Date.now() - 3000 }, questions });
live1.liveRooms[CODE].meta.status = 'question'; live1.liveRooms[CODE].meta.qIndex = 0;
const ans = (c, t) => ({ c, t: t === undefined ? Date.now() : t });
live('siswa menjawab soal aktif', true, L_.can('write', S1, live1, R + '/answers/0/siswa-1', ans(2)));
live('siswa TIDAK bisa menjawab atas nama siswa lain', false, L_.can('write', S1, live1, R + '/answers/0/siswa-2', ans(2)));
live('jawaban tulis-sekali (tidak bisa diganti)', false, L_.can('write', S1, Object.assign(JSON.parse(JSON.stringify(live1)), {}), R + '/answers/0/siswa-1', ans(1)) && false || (() => { const t = JSON.parse(JSON.stringify(live1)); t.liveRooms[CODE].answers = { 0: { 'siswa-1': ans(2) } }; return L_.can('write', S1, t, R + '/answers/0/siswa-1', ans(1)); })());
live('menjawab soal yang belum dimulai (starts/1 belum ada) ditolak', false, L_.can('write', S1, live1, R + '/answers/1/siswa-1', ans(1)));
live('menjawab saat status lobi ditolak', false, L_.can('write', S1, room({ starts: { 0: 1 } }), R + '/answers/0/siswa-1', ans(1)));
live('pilihan di luar 0–3 ditolak', false, L_.can('write', S1, live1, R + '/answers/0/siswa-1', ans(4)));
live('waktu jawab di masa depan ditolak (tak bisa memalsukan kecepatan)', false, L_.can('write', S1, live1, R + '/answers/0/siswa-1', ans(1, Date.now() + 3600000)));
live('field ekstra pada jawaban ditolak', false, L_.can('write', S1, live1, R + '/answers/0/siswa-1', { c: 1, t: Date.now(), pts: 1000 }));
live('tanpa login TIDAK bisa menjawab', false, L_.can('write', null, live1, R + '/answers/0/x', ans(1)));
// Baca
const full = JSON.parse(JSON.stringify(live1)); full.liveRooms[CODE].key = { 0: 2 }; full.liveRooms[CODE].answers = { 0: { 'siswa-1': ans(2), 'siswa-2': ans(1) } };
live('siswa TIDAK bisa membaca kunci jawaban', false, L_.can('read', S1, full, R + '/key'));
live('siswa TIDAK bisa membaca satu kunci', false, L_.can('read', S1, full, R + '/key/0'));
live('siswa TIDAK bisa membaca seluruh ruang (kunci ikut)', false, L_.can('read', S1, full, R));
live('siswa TIDAK bisa membaca seluruh daftar ruang', false, L_.can('read', S1, full, 'liveRooms'));
live('siswa TIDAK bisa membaca semua jawaban', false, L_.can('read', S1, full, R + '/answers'));
live('siswa TIDAK bisa membaca jawaban siswa lain', false, L_.can('read', S1, full, R + '/answers/0/siswa-2'));
live('siswa membaca jawabannya sendiri', true, L_.can('read', S1, full, R + '/answers/0/siswa-1'));
for (const n of ['meta', 'questions', 'starts', 'reveal', 'players', 'scores']) live('siswa membaca ' + n, true, L_.can('read', S1, full, R + '/' + n));
live('tanpa login TIDAK bisa membaca meta', false, L_.can('read', null, full, R + '/meta'));
live('tanpa login TIDAK bisa membaca soal', false, L_.can('read', null, full, R + '/questions'));
live('guru membaca kunci', true, L_.can('read', HOST, full, R + '/key'));
live('guru membaca semua jawaban', true, L_.can('read', HOST, full, R + '/answers'));
live('guru lain TIDAK bisa membaca kunci ruang ini', false, L_.can('read', { uid: 'guru-2' }, full, R + '/key'));

console.log(`\n${failed ? '❌' : '✅'} Rules: ${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
