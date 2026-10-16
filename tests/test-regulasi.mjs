// Test fungsi pemeliharaan materi (Fase 5): ekstraksi rujukan, validasi daftar, umur.
//   node tests/test-regulasi.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { extractRefs, normalize, validateRegistry, buildIndex, ageMonths, ymToMonths } from '../scripts/lib/regulasi.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, bad = 0; const t = (c, l) => { if (c) ok++; else { bad++; console.log('  ✗ GAGAL: ' + l); } };
const NOW = new Date(Date.UTC(2026, 9, 15)); // Okt 2026

// ekstraksi
const refs = extractRefs('Sesuai PMK 131/2024, PMK-02/PMK.03/2010, PP 20/2026, UU 7/2021, SE-02/PJ/2024 dan PSAK 201 (dahulu PSAK 1).');
for (const r of ['PMK 131/2024', 'PMK 02/PMK.03/2010', 'PP 20/2026', 'UU 7/2021', 'SE-02/PJ/2024', 'PSAK 201', 'PSAK 1']) t(refs.includes(r), 'ekstraksi ' + r);
t(extractRefs('tidak ada rujukan di sini 12/2024 saja').length === 0, 'angka biasa bukan rujukan');
t(extractRefs('SE-22/PJ.24/1990 dan SE-02/PJ/2024').join() === 'SE-22/PJ.24/1990,SE-02/PJ/2024', 'SE bernomor PJ.24 (format lama) dan format baru sama-sama dikenali');
t(normalize('PMK-02/PMK.03/2010') === 'PMK 02/PMK.03/2010', 'normalisasi PMK-');
t(extractRefs('PMK 18/PMK.03/2021').includes('PMK 18/PMK.03/2021') && !extractRefs('PMK 18/PMK.03/2021').includes('PMK 18/PMK'), 'pola PMK panjang tidak terpotong');

// umur
t(ymToMonths('2026-10') - ymToMonths('2026-04') === 6, 'selisih bulan');
t(ageMonths('2026-04', NOW) === 6 && ageMonths('2026-10', NOW) === 0 && ageMonths('bad', NOW) === null, 'ageMonths');

// validasi daftar
const base = () => [{ id: 'PP 1/2020', judul: 'Judul peraturan contoh', status: 'berlaku', verifikasi: 'sumber-sekunder', topik: ['SPT'], terakhirDicek: '2026-09' }];
t(validateRegistry(base(), NOW).errors.length === 0, 'daftar valid lolos');
const mut = (f) => { const r = base(); f(r[0]); return validateRegistry(r, NOW).errors; };
t(mut((e) => { e.status = 'aneh'; }).length === 1, 'status tak dikenal ditolak');
t(mut((e) => { e.verifikasi = 'katanya'; }).length === 1, 'verifikasi tak dikenal ditolak');
t(mut((e) => { e.terakhirDicek = '2027-01'; }).some((m) => /masa depan/.test(m)), 'tanggal masa depan ditolak');
t(mut((e) => { e.terakhirDicek = '26-10'; }).length === 1, 'format tanggal salah ditolak');
t(mut((e) => { e.topik = []; }).length === 1, 'topik kosong ditolak');
t(mut((e) => { e.url = 'http://x.go.id'; }).length === 1, 'url non-https ditolak');
t(mut((e) => { e.status = 'historis'; e.digantiOleh = 'PP 9/9999'; }).some((m) => /tidak ada di daftar/.test(m)), 'digantiOleh harus ada di daftar');
t(validateRegistry([...base(), ...base()], NOW).errors.some((m) => /duplikat/.test(m)), 'id duplikat ditolak');
const idx = buildIndex([{ ...base()[0], alias: ['PP 1/20'] }]);
t(idx.has('PP 1/2020') && idx.has('PP 1/20'), 'indeks memuat alias');

// daftar nyata
const real = JSON.parse(readFileSync(join(ROOT, 'scripts/regulasi-terpantau.json'), 'utf8')).regulasi;
const rv = validateRegistry(real, NOW);
t(rv.errors.length === 0, 'daftar nyata valid: ' + rv.errors.slice(0, 2).join(' | '));
t(real.length >= 45, 'daftar nyata ≥ 45 entri');
for (const id of ['PP 20/2026', 'PMK 131/2024', 'PMK 111/2025', 'PMK 168/2023']) t(real.some((e) => e.id === id), 'terdaftar: ' + id);
t(real.filter((e) => e.status === 'historis').every((e) => e.digantiOleh), 'semua entri historis punya digantiOleh');

// skrip penuh
const run = (...a) => spawnSync('node', [join(ROOT, 'scripts/check-staleness.mjs'), ...a], { encoding: 'utf8' });
const r0 = run(); t(r0.status === 0, 'check-staleness lolos pada kondisi sekarang');
const r1 = run('--now', '2027-06', '--fail-on-stale'); t(r1.status === 1 && /terakhir dicek/.test(r1.stdout), 'kedaluwarsa terdeteksi (+8 bulan) dengan --fail-on-stale');
const r2 = run('--now', '2027-06'); t(r2.status === 0 && /terakhir dicek/.test(r2.stdout), 'tanpa --fail-on-stale hanya peringatan');
const r3 = run('--now', '2027-06', '--max-age-months', '24', '--fail-on-stale'); t(r3.status === 0, 'batas umur dapat diatur');

console.log(`\ntest-regulasi: ${ok} lolos, ${bad} gagal`);
process.exit(bad ? 1 : 0);
