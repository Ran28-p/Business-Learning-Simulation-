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

import { readFileSync } from 'node:fs';
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
      const ok = v === false || (typeof v === 'string' && /auth\s*!=\s*null/.test(v) && /auth\.uid\s*===\s*\$\w+/.test(v));
      check(ok, `${path}/${k} harus false atau dikunci ke pemilik (auth != null && auth.uid === $uid) — ditemukan: ${JSON.stringify(v)}`);
    } else scan(v, path + '/' + k);
  }
})(rules, '');

const userNode = rules.users && rules.users.$uid;
check(!!userNode, 'users/$uid harus ada');
check(rules.users && Object.keys(rules.users).filter((k) => !k.startsWith('.')).join() === '$uid', 'users hanya boleh punya wildcard $uid');
check(userNode && userNode.$other && userNode.$other['.validate'] === false, 'users/$uid harus menolak field di luar skema ($other: false)');
check(userNode && userNode.history && userNode.history.$index && userNode.history.$index.$other, 'history/$index harus menolak field di luar skema');

// Field yang ditulis aplikasi harus punya aturan. Sumber kebenaran: appState.user di app-main.js.
const src = readFileSync(join(ROOT, 'apps/spt/js/app-main.js'), 'utf8');
const written = new Set();
for (const m of src.matchAll(/appState\.user\.([A-Za-z_]\w*)\s*(?:=(?!=)|\.push\()/g)) written.add(m[1]);
for (const m of src.matchAll(/appState\.user\s*=\s*\{([^}]*)\}/g)) for (const k of m[1].matchAll(/(?:^|,)\s*([A-Za-z_]\w*)\s*:/g)) written.add(k[1]);
console.log('  Field yang ditulis app ke users/$uid:', [...written].sort().join(', '));
check(written.size >= 5, 'pemindai harus menemukan field appState.user (kalau 0, pola kode berubah — perbarui pemindai ini)');
for (const f of written) check(userNode && userNode[f], `field "${f}" ditulis app tetapi TIDAK punya aturan di database.rules.json (sinkron cloud akan ditolak)`);
// Sebaliknya: aturan untuk field yang sudah tidak dipakai app = kemungkinan sisa lama.
for (const f of Object.keys(userNode || {}).filter((k) => !k.startsWith('.') && !k.startsWith('$')))
  check(written.has(f), `aturan "${f}" tidak ada penulisnya di app-main.js (sisa lama? hapus atau perbarui pemindai)`);

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
section('C. portalSync (sinkron cloud Accounting, Excel, SQL, Game Hub)');
import vm from 'node:vm';
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8');
globalThis.window = globalThis;
for (const f of ['js/shared/progress-aggregator.js', 'js/shared/gamehub-engine.js', 'js/shared/cloud-sync-core.js']) vm.runInThisContext(rd(f), { filename: f });
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
const unitsCore = CSx.create({ PP: PPx, GH: globalThis.GameHubEngine, storage: { getItem: () => null, setItem() {}, removeItem() {} } }).units;
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
  ['ACT_MASTER_STATE', JSON.stringify({ xp: 20, level: 1, history: [{ t: 1 }] })],
  ['gamehub_state_v1', JSON.stringify({ v: 1, day: '2026-10-12', bonusXp: 130, totalClaims: 4 })]]);
const coreReal = CSx.create({ PP: PPx, GH: globalThis.GameHubEngine, storage: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem() {}, removeItem() {} }, now: () => Date.now() });
const docOf = (id) => { const u = coreReal.units.find((x) => x.id === id); return coreReal.buildRemote(u, coreReal.readLocal(u), 0, 'dev1'); };
const UID = 'user-aaa';
check(canReadPS(ME, UID), 'pemilik boleh membaca portalSync miliknya');
check(!canReadPS(OTHER, UID), 'pengguna lain TIDAK boleh membaca portalSync orang lain');
check(!canReadPS(NOBODY, UID), 'tanpa login TIDAK boleh membaca portalSync');
for (const id of ['accounting', 'excel', 'sqlpq', 'gamehub']) check(canWritePS(ME, UID, { [id]: docOf(id) }), `dokumen nyata unit ${id} diterima`);
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
badPS('data: kunci Game Hub di unit Accounting', { accounting: Object.assign(docOf('accounting'), { data: { gamehub_state_v1: '{}' } }) });
badPS('data: kunci tidak ter-encode (efpg:progress)', { excel: Object.assign(docOf('excel'), { data: { 'efpg:progress': '{}' } }) });
badPS('data: nilai bukan teks', { sqlpq: D({ data: { sqlpq_progress_v1: { xp: 1 } } }) });
badPS('data: nilai > 2.000.000 karakter', { sqlpq: D({ data: { sqlpq_progress_v1: 'x'.repeat(2000001) } }) });
check(canWritePS(ME, UID, { sqlpq: D({ data: { sqlpq_progress_v1: 'x'.repeat(2000000) } }) }), 'data: nilai tepat 2.000.000 karakter (batas atas) masih diterima');
// SPT tidak boleh menulis lewat jalur users/$uid dengan field portalSync
check(!canWrite(ME, 'user-aaa', Object.assign(base(), { portalSync: { sqlpq: docOf('sqlpq') } })), 'users/$uid menolak field portalSync (cabang terpisah)');

console.log(`\n${failed ? '❌' : '✅'} Rules: ${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
