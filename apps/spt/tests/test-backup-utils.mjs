// Pengujian logika otomatis (Node.js, tanpa browser) untuk js/shared/backup-utils.js.
// Hanya menguji collectBackup() & restoreBackup() (logika murni baca/tulis
// localStorage) — downloadBackup()/readAndRestoreFile() memakai API DOM
// (document.createElement, FileReader) yang sengaja tidak ditest di sini supaya
// suite ini tetap tidak butuh jsdom (lihat package.json).
//
// Jalankan: node tests/test-backup-utils.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- localStorage tiruan minimal (cukup untuk collectBackup/restoreBackup) ---
function makeFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _dump: () => Object.fromEntries(store)
  };
}
globalThis.window = globalThis;
globalThis.localStorage = makeFakeLocalStorage();

const src = fs.readFileSync(path.join(__dirname, '../js/shared/backup-utils.js'), 'utf-8');
new Function(src)();
const BackupUtils = globalThis.BackupUtils;

if (!BackupUtils) {
  console.log('FATAL: window.BackupUtils tidak terdefinisi setelah memuat backup-utils.js');
  process.exit(1);
}

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL: ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// --- collectBackup: hanya key yang ADA di localStorage yang ikut dicadangkan ---
localStorage.setItem('spt_simulator_data', JSON.stringify({ xp: 120, level: 2 }));
localStorage.setItem('simspt_faktur_history_v1', JSON.stringify([{ id: 1 }]));
localStorage.setItem('key_tidak_dikenal', 'harus diabaikan'); // bukan bagian BACKUP_KEYS

let backup = BackupUtils.collectBackup();
check('collectBackup menandai __simspt_backup', backup.__simspt_backup, true);
check('collectBackup menyertakan key yang memang ada', backup.data.spt_simulator_data, JSON.stringify({ xp: 120, level: 2 }));
check('collectBackup menyertakan riwayat faktur', backup.data.simspt_faktur_history_v1, JSON.stringify([{ id: 1 }]));
check('collectBackup TIDAK menyertakan key di luar BACKUP_KEYS', backup.data.key_tidak_dikenal, undefined);
check('collectBackup TIDAK menyertakan key yang memang belum pernah diisi (mis. tax career)', backup.data.spt_tax_career_progress, undefined);

// --- restoreBackup: format backup lengkap ---
globalThis.localStorage = makeFakeLocalStorage(); // reset, simulasikan browser/perangkat baru
const restoreResult = BackupUtils.restoreBackup(backup);
check('restoreBackup format lengkap -> ok', restoreResult.ok, true);
check('restoreBackup format lengkap -> bukan legacy', restoreResult.legacy, false);
check('restoreBackup mengembalikan spt_simulator_data ke localStorage', localStorage.getItem('spt_simulator_data'), JSON.stringify({ xp: 120, level: 2 }));
check('restoreBackup mengembalikan riwayat faktur ke localStorage', localStorage.getItem('simspt_faktur_history_v1'), JSON.stringify([{ id: 1 }]));

// --- restoreBackup: format lama (sebelum fitur ini ada — langsung objek appState.user) ---
globalThis.localStorage = makeFakeLocalStorage();
const legacyResult = BackupUtils.restoreBackup({ xp: 500, level: 4, history: [] });
check('restoreBackup format lama -> ok', legacyResult.ok, true);
check('restoreBackup format lama -> ditandai legacy', legacyResult.legacy, true);
check('restoreBackup format lama -> tersimpan sebagai spt_simulator_data', localStorage.getItem('spt_simulator_data'), JSON.stringify({ xp: 500, level: 4, history: [] }));

// --- restoreBackup: file tidak dikenali ---
const badResult = BackupUtils.restoreBackup({ foo: 'bar' });
check('restoreBackup format tidak dikenali -> ok:false', badResult.ok, false);

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
