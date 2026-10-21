// Harness bersama untuk test apps/sql-pq.
//
// Modul-modul di js/ ditulis sebagai script browser biasa ("(function(global){...})(window)"),
// bukan ES module. Supaya bisa diuji di Node TANPA mengubah satu baris pun kode aplikasi,
// harness ini: (1) menyediakan `window`/`localStorage`/`document` minimal, (2) memuat
// file-file aslinya lewat `vm` dengan urutan yang sama seperti di index.html, dan
// (3) memakai sql.js ASLI (SQLite/WASM hasil vendor) — jadi query benar-benar dieksekusi.
//
// Tidak ada dependency npm: hanya built-in Node + file yang sudah ada di repo.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

export const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- Browser stubs --------------------------------------------------------
export function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] ?? null,
    _dump: () => Object.fromEntries(store)
  };
}

globalThis.window = globalThis;
globalThis.localStorage = makeLocalStorage();
globalThis.document = globalThis.document || {
  createElement: () => ({}), head: { appendChild() {} }, addEventListener() {}
};

// sql.js asli dari vendor. Engine aplikasi memakai `initSqlJs` global kalau sudah ada,
// jadi kita sediakan dengan locateFile ABSOLUT ke file .wasm di repo.
// Dimuat lewat vm (bukan require) supaya tidak bergantung pada ada/tidaknya "type":"module"
// di package.json — file UMD ini harus diperlakukan sebagai CommonJS apa pun konfigurasinya.
const sqlJsFile = join(APP_DIR, 'vendor/sql-js/sql-wasm.js');
const sqlJsModule = { exports: {} };
vm.compileFunction(readFileSync(sqlJsFile, 'utf8'), ['exports', 'require', 'module', '__filename', '__dirname'], { filename: sqlJsFile })
  (sqlJsModule.exports, createRequire(sqlJsFile), sqlJsModule, sqlJsFile, dirname(sqlJsFile));
const realInit = sqlJsModule.exports;
globalThis.initSqlJs = (opts) => realInit(Object.assign({}, opts, {
  locateFile: (f) => join(APP_DIR, 'vendor/sql-js', f)
}));

// ---- Loader ---------------------------------------------------------------
const loaded = new Set();
export function loadScript(rel) {
  if (loaded.has(rel)) return;
  const file = join(APP_DIR, rel);
  vm.runInThisContext(readFileSync(file, 'utf8'), { filename: file });
  loaded.add(rel);
}
// Muat ulang paksa (mis. untuk menguji load() terhadap localStorage yang sudah diubah).
export function reloadScript(rel) { loaded.delete(rel); loadScript(rel); }
export const CORE_SCRIPTS = [
  'js/dataset-generator.js', 'js/relational-dataset.js', 'js/sql-engine.js',
  'js/grading-engine.js', 'js/question-bank.js', 'js/powerquery-engine.js',
  'js/pq-practice-data.js', 'js/progress-manager.js'
];
export function loadAll() { CORE_SCRIPTS.forEach(loadScript); return globalThis; }

// ---- Mini assertion runner (gaya sama dengan test lain di repo) -----------
let passed = 0, failed = 0;
export function check(cond, label) {
  if (cond) { passed++; } else { failed++; console.log('  ✗ GAGAL: ' + label); }
}
export function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) console.log(`    diharapkan: ${JSON.stringify(expected)}\n    didapat   : ${JSON.stringify(actual)}`);
  check(ok, label);
}
export function section(title) { console.log('\n=== ' + title + ' ==='); }
export function finish(name) {
  console.log(`\n========== ${name}: ${passed} lulus, ${failed} gagal ==========`);
  if (failed > 0) process.exit(1);
}
