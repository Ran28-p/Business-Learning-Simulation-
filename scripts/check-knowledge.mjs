#!/usr/bin/env node
// Cek kualitas & kepercayaan materi Knowledge Base semua modul (tanpa dependency, hanya Node bawaan).
//
//  1. SKEMA   — struktur bab/subbab, id unik, `sources`/`reviewed` valid (scripts/lib/kb-validate.mjs). Pelanggaran = GAGAL.
//  2. RATCHET — cakupan sumber tidak boleh turun dari scripts/knowledge-baseline.json, dan subbab BARU
//               wajib bersumber. Jadi materi lama boleh dilengkapi bertahap, tapi tidak boleh makin buruk.
//  3. LAPORAN — cakupan sumber/tinjau per modul + pembahasan soal (informasi, tidak menggagalkan).
//
// Opsi:  --update-baseline  tulis ulang baseline dari kondisi sekarang (jalankan setelah menambah sumber)
//        --strict           gagal bila ada subbab TANPA sumber (target akhir Fase 1–2)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { validateContent } from './lib/kb-validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'scripts', 'knowledge-baseline.json');
const args = new Set(process.argv.slice(2));

const MODULES = [
  { key: 'spt', file: 'apps/spt/data/knowledge-spt.js', global: 'KNOWLEDGE_CONTENT_SPT' },
  { key: 'accounting', file: 'apps/accounting/data/knowledge-accounting.js', global: 'KNOWLEDGE_CONTENT_ACCOUNTING' },
  { key: 'excel', file: 'apps/excel/data/knowledge-excel.js', global: 'KNOWLEDGE_CONTENT_EXCEL' },
  { key: 'excel-pivot', file: 'apps/excel/data/knowledge-excel-pivot-dashboard.js', global: 'KNOWLEDGE_CONTENT_EXCEL_PIVOT_DASHBOARD' },
  { key: 'sql-pq', file: 'apps/sql-pq/data/knowledge-sqlpq.js', global: 'KNOWLEDGE_CONTENT_SQLPQ' },
];

let failed = 0;
const fail = (m) => { failed++; console.log(`::error::${m}`); };
const warn = (m) => console.log(`::warning::${m}`);

function loadGlobal(file, name) {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return sandbox.window[name];
}

const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
const current = {};

console.log('== Materi Knowledge Base ==');
for (const m of MODULES) {
  let content;
  try { content = loadGlobal(m.file, m.global); } catch (e) { fail(`${m.file}: gagal dimuat — ${e.message}`); continue; }
  const { errors, warnings, stats } = validateContent(content);
  errors.forEach((e) => fail(`[${m.key}] ${e}`));
  warnings.forEach((w) => warn(`[${m.key}] ${w}`));
  const without = stats.sections - stats.withSources - stats.exempt;
  current[m.key] = { sections: stats.sections, withSources: stats.withSources, exempt: stats.exempt, withoutSources: without, withReviewed: stats.withReviewed };
  const pct = stats.sections ? Math.round((stats.withSources / stats.sections) * 100) : 0;
  console.log(`  ${m.key.padEnd(12)} bab=${String(stats.chapters).padStart(2)}  subbab=${String(stats.sections).padStart(3)}  bersumber=${String(stats.withSources).padStart(3)} (${pct}%)  dikecualikan=${stats.exempt}  ditinjau=${stats.withReviewed}  rujukan-lama(kb-legal)=${stats.legacyLegalOnly}`);
  if (args.has('--strict') && without > 0) fail(`[${m.key}] ${without} subbab belum punya sources (mode --strict)`);

  const b = baseline && baseline[m.key];
  if (b && !args.has('--update-baseline')) {
    if (stats.exempt > (b.exempt || 0)) warn(`[${m.key}] pengecualian bertambah (${stats.exempt} > ${b.exempt || 0}) — pastikan alasannya sah`);
    if (stats.withSources < b.withSources) fail(`[${m.key}] cakupan sumber turun: ${stats.withSources} < baseline ${b.withSources}`);
    if (without > b.withoutSources) fail(`[${m.key}] subbab tanpa sumber bertambah: ${without} > baseline ${b.withoutSources} — subbab baru wajib punya sources`);
  } else if (!b && !args.has('--update-baseline')) {
    warn(`[${m.key}] belum ada baseline — jalankan: node scripts/check-knowledge.mjs --update-baseline`);
  }
}

console.log('\n== Pembahasan soal (informasi) ==');
try {
  const j = JSON.parse(readFileSync(join(ROOT, 'apps/spt/modul_pajak/questions.json'), 'utf8'));
  // index.html menyematkan salinan questions.json dan dipakai lebih dulu oleh script.js → harus identik.
  const html = readFileSync(join(ROOT, 'apps/spt/modul_pajak/index.html'), 'utf8');
  const em = /<script id="questions-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!em) fail('modul_pajak/index.html: blok questions-data tidak ditemukan');
  else if (JSON.stringify(JSON.parse(em[1])) !== JSON.stringify(j)) fail('modul_pajak: salinan soal di index.html TIDAK sama dengan questions.json (soal baru tidak akan tampil). Sinkronkan: salin isi questions.json ke <script id="questions-data">.');
  else console.log('  modul_pajak  salinan tertanam di index.html == questions.json');
  const qs = j.topics.flatMap((t) => t.questions);
  const avg = Math.round(qs.reduce((a, q) => a + (q.explanation || '').length, 0) / qs.length);
  console.log(`  modul_pajak  soal=${qs.length}  rata-rata pembahasan=${avg} karakter  tanpa-explanation=${qs.filter((q) => !q.explanation).length}`);
  // Pembahasan berlapis (Fase 3): setiap soal modul_pajak wajib lengkap.
  let pbhBad = 0;
  for (const tp of j.topics) tp.questions.forEach((q, i) => {
    const w = `modul_pajak ${tp.key}[${i}]`; const pb = q.pembahasan;
    if (!pb || typeof pb.konsep !== 'string' || pb.konsep.length < 40) { fail(`${w}: pembahasan.konsep wajib (≥40 karakter)`); pbhBad++; return; }
    if (q.type === 'mcq') {
      const wrong = (q.options || []).filter((o) => o !== q.answer);
      if (!pb.salah || wrong.some((o) => !pb.salah[o])) { fail(`${w}: pembahasan.salah harus menjelaskan setiap opsi yang salah`); pbhBad++; }
    }
    if (q.type === 'number' && !(Array.isArray(pb.langkah) && pb.langkah.length)) { fail(`${w}: soal hitung wajib punya pembahasan.langkah`); pbhBad++; }
    if (q.type === 'text' && !(Array.isArray(q.accept) && q.accept.length)) { fail(`${w}: soal isian wajib punya accept (jawaban alternatif)`); pbhBad++; }
  });
  console.log(`  modul_pajak  pembahasan berlapis: ${qs.length - pbhBad}/${qs.length} lengkap`);
} catch (e) { warn(`modul_pajak: ${e.message}`); }
try {
  const sandbox = { window: {} }; vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(ROOT, 'apps/spt/tax_career/data/questions.js'), 'utf8'), sandbox);
  const qs = sandbox.window.TAX_CAREER_QUESTIONS || [];
  const avg = Math.round(qs.reduce((a, q) => a + (q.explanation || '').length, 0) / qs.length);
  console.log(`  tax_career   soal=${qs.length}  rata-rata pembahasan=${avg} karakter  tanpa-explanation=${qs.filter((q) => !q.explanation).length}`);
  vm.runInContext(readFileSync(join(ROOT, 'apps/spt/tax_career/data/questions-pembahasan.js'), 'utf8'), sandbox);
  let tcBad = 0;
  for (const q of sandbox.window.TAX_CAREER_QUESTIONS) {
    const pb = q.pembahasan; const w = `tax_career ${q.id}`;
    if (!pb || typeof pb.konsep !== 'string' || pb.konsep.length < 40) { fail(`${w}: pembahasan.konsep wajib (≥40 karakter)`); tcBad++; continue; }
    if (q.type === 'mcq') {
      const wrong = (q.options || []).filter((o) => o !== q.answer);
      if (!pb.salah || wrong.some((o) => !pb.salah[o])) { fail(`${w}: pembahasan.salah harus menjelaskan setiap opsi yang salah`); tcBad++; }
    }
  }
  console.log(`  tax_career   pembahasan berlapis: ${qs.length - tcBad}/${qs.length} lengkap`);
} catch (e) { warn(`tax_career: ${e.message}`); }

if (args.has('--update-baseline')) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
  console.log(`\nBaseline ditulis ulang: ${BASELINE_PATH}`);
}
if (failed) { console.log(`\n${failed} masalah — cek gagal.`); process.exit(1); }
console.log('\nSemua cek materi lolos.');
