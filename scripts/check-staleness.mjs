#!/usr/bin/env node
// Pemeliharaan materi (Fase 5). Tanpa dependency.
//
//  1. DAFTAR   — scripts/regulasi-terpantau.json valid (status, verifikasi, terakhirDicek, digantiOleh).
//  2. RUJUKAN  — setiap regulasi yang disebut di materi/soal/pembahasan WAJIB terdaftar. Regulasi baru
//                tanpa entri = GAGAL, sehingga tidak ada rujukan "liar".
//  3. UMUR     — entri daftar dan tanggal `reviewed` materi yang lebih tua dari batas (bawaan 6 bulan)
//                dilaporkan sebagai KEDALUWARSA. Gagal hanya dengan --fail-on-stale
//                (dipakai workflow terjadwal bulanan .github/workflows/materi-review.yml).
//  4. LAPORAN  — ringkasan: berapa regulasi yang baru diverifikasi lewat sumber sekunder atau
//                pengetahuan umum (belum dari teks resmi), dan modul mana yang paling banyak bergantung padanya.
//
// Opsi: --max-age-months N  (bawaan 6)   --fail-on-stale   --now YYYY-MM  (untuk uji)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { validateRegistry, buildIndex, extractRefs, ageMonths, normalize } from './lib/regulasi.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const MAX = parseInt(opt('--max-age-months', '6'), 10);
let NOW = new Date();
if (opt('--now')) { const [y, m] = opt('--now').split('-').map(Number); NOW = new Date(Date.UTC(y, m - 1, 15)); }

let failed = 0;
const fail = (m) => { failed++; console.log(`::error::${m}`); };
const warn = (m) => console.log(`::warning::${m}`);

// ── muat daftar
const reg = JSON.parse(readFileSync(join(ROOT, 'scripts/regulasi-terpantau.json'), 'utf8')).regulasi;
const v = validateRegistry(reg, NOW);
v.errors.forEach(fail); v.warnings.forEach(warn);
const idx = buildIndex(reg);

// ── kumpulkan teks sumber
const SOURCES = [
  'apps/spt/data/knowledge-spt.js', 'apps/accounting/data/knowledge-accounting.js', 'apps/excel/data/knowledge-excel.js',
  'apps/sql-pq/data/knowledge-sqlpq.js',
  'apps/spt/modul_pajak/questions.json', 'apps/spt/tax_career/data/questions.js', 'apps/spt/tax_career/data/questions-pembahasan.js',
  'apps/spt/js/data/form-pembahasan.js', 'apps/spt/js/data/kasus-spt.js',
  'apps/accounting/js/business/aiTutor.js', 'apps/accounting/js/accounting/validationEngine.js',
];
console.log('== Rujukan regulasi di materi ==');
const used = new Map(); // id -> Set(file)
for (const f of SOURCES) {
  const refs = extractRefs(readFileSync(join(ROOT, f), 'utf8'));
  for (const r of refs) {
    const e = idx.get(normalize(r));
    if (!e) { fail(`${f}: rujukan "${r}" belum terdaftar di scripts/regulasi-terpantau.json`); continue; }
    if (!used.has(e.id)) used.set(e.id, new Set());
    used.get(e.id).add(f.split('/').pop());
  }
}
console.log(`  ${used.size} regulasi dirujuk dari ${SOURCES.length} berkas; ${reg.length} terdaftar`);

// ── umur entri daftar
console.log(`\n== Umur verifikasi (batas ${MAX} bulan) ==`);
let stale = 0;
for (const e of reg) {
  const a = ageMonths(e.terakhirDicek, NOW);
  if (a !== null && a > MAX && e.status !== 'historis') { stale++; (flag('--fail-on-stale') ? fail : warn)(`${e.id}: terakhir dicek ${e.terakhirDicek} (${a} bulan lalu) — verifikasi ulang`); }
}
// ── umur tanggal reviewed pada materi
for (const [f, g] of [['apps/spt/data/knowledge-spt.js', 'KNOWLEDGE_CONTENT_SPT'], ['apps/accounting/data/knowledge-accounting.js', 'KNOWLEDGE_CONTENT_ACCOUNTING'], ['apps/excel/data/knowledge-excel.js', 'KNOWLEDGE_CONTENT_EXCEL'], ['apps/sql-pq/data/knowledge-sqlpq.js', 'KNOWLEDGE_CONTENT_SQLPQ']]) {
  const sb = { window: {} }; vm.createContext(sb); vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), sb);
  const old = [];
  sb.window[g].chapters.forEach((ch) => ch.sections.forEach((s) => { const a = ageMonths(s.reviewed, NOW); if (a !== null && a > MAX) old.push(s.id); }));
  if (old.length) { stale += old.length; (flag('--fail-on-stale') ? fail : warn)(`${g}: ${old.length} subbab ditinjau > ${MAX} bulan lalu (${old.slice(0, 4).join(', ')}${old.length > 4 ? ', …' : ''})`); }
}
console.log(stale ? `  ${stale} item kedaluwarsa` : '  semua masih dalam batas');

// ── laporan
console.log('\n== Tingkat verifikasi regulasi yang dirujuk ==');
const by = { 'teks-resmi': 0, 'sumber-sekunder': 0, 'pengetahuan-umum': 0 };
for (const id of used.keys()) by[idx.get(normalize(id)).verifikasi]++;
console.log(`  teks resmi: ${by['teks-resmi']}  |  sumber sekunder: ${by['sumber-sekunder']}  |  pengetahuan umum: ${by['pengetahuan-umum']}`);
const todo = [...used.keys()].map((id) => idx.get(normalize(id))).filter((e) => e.verifikasi !== 'teks-resmi' && e.status !== 'historis');
console.log(`  ${todo.length} regulasi aktif belum diverifikasi dari teks resmi — prioritas: ${todo.filter((e) => /^(PP 20\/2026|PMK 131\/2024|PMK 111\/2025|PMK 168\/2023|PMK 81\/2024)$/.test(e.id)).map((e) => e.id).join(', ') || '-'}`);
const unused = reg.filter((e) => !used.has(e.id) && !(e.alias || []).some((a) => used.has(a)) && e.status !== 'historis');
if (unused.length) warn(`${unused.length} entri daftar tidak dirujuk materi mana pun: ${unused.map((e) => e.id).join(', ')}`);

if (failed) { console.log(`\n${failed} masalah — cek gagal.`); process.exit(1); }
console.log('\nPemeliharaan materi: lolos.');
