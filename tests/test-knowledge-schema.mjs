// Test skema materi Knowledge Base + renderer blok "Sumber & rujukan".
// Tanpa dependency; jalankan:  node tests/test-knowledge-schema.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { validateContent, SOURCE_TYPES } from '../scripts/lib/kb-validate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const section = (t) => console.log('\n=== ' + t + ' ===');
const NOW = new Date(Date.UTC(2026, 9, 1)); // Okt 2026

// Muat renderer asli dengan window/document minimal (helper murni, tanpa DOM).
const sandbox = { window: {}, document: {}, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, 'js/knowledge-base.js'), 'utf8'), sandbox);
const H = sandbox.window.KnowledgeBase.helpers;

const base = () => ({
  title: 'T',
  chapters: [{ id: 'b1', title: 'Bab', sections: [{ id: 's1', heading: 'H', body: '<p>x</p>' }] }],
});
const withSec = (extra) => { const c = base(); Object.assign(c.chapters[0].sections[0], extra); return c; };
const v = (c) => validateContent(c, { now: NOW });

section('Validator — kompatibel mundur');
check(v(base()).errors.length === 0, 'konten lama tanpa sources/reviewed tetap valid');
check(v(base()).stats.withSources === 0, 'statistik: 0 bersumber');

section('Validator — sources & reviewed');
const good = { sources: [{ type: 'uu', ref: 'UU 7/2021 (HPP) Pasal 4', url: 'https://peraturan.go.id/x', note: 'catatan' }], reviewed: '2026-09' };
check(v(withSec(good)).errors.length === 0, 'sources + reviewed valid lolos');
check(v(withSec(good)).stats.withSourcesAndReviewed === 1, 'statistik: sources+reviewed terhitung');
check(v(withSec({ sources: [] })).errors.length === 1, 'sources kosong ditolak');
check(v(withSec({ sources: [{ type: 'xx', ref: 'UU 1' }] })).errors.some((e) => /type "xx"/.test(e)), 'type tak dikenal ditolak');
check(v(withSec({ sources: [{ type: 'uu', ref: '' }] })).errors.some((e) => /ref wajib/.test(e)), 'ref kosong ditolak');
check(v(withSec({ sources: [{ type: 'uu', ref: 'UU 7/2021', url: 'javascript:alert(1)' }] })).errors.some((e) => /url/.test(e)), 'url javascript: ditolak');
check(v(withSec({ sources: [{ type: 'uu', ref: 'UU 7/2021', url: 'http://x.go.id' }] })).errors.some((e) => /url/.test(e)), 'url http (non-https) ditolak');
check(v(withSec({ reviewed: '2026-09' })).errors.some((e) => /tanpa sources/.test(e)), 'reviewed tanpa sources ditolak');
check(v(withSec({ ...good, reviewed: '2026-13' })).errors.some((e) => /YYYY-MM/.test(e)), 'bulan 13 ditolak');
check(v(withSec({ ...good, reviewed: '2027-01' })).errors.some((e) => /masa depan/.test(e)), 'tanggal tinjau di masa depan ditolak');
check(SOURCE_TYPES.every((t) => H.SOURCE_TYPES.includes(t)) && H.SOURCE_TYPES.length === SOURCE_TYPES.length, 'daftar type validator == renderer');

section('Validator — noSourceNeeded');
check(v(withSec({ noSourceNeeded: 'Konvensi pencatatan; bukan regulasi' })).errors.length === 0, 'pengecualian beralasan lolos');
check(v(withSec({ noSourceNeeded: 'Konvensi pencatatan; bukan regulasi' })).stats.exempt === 1, 'statistik: dikecualikan terhitung');
check(v(withSec({ noSourceNeeded: 'pendek' })).errors.some((e) => /noSourceNeeded/.test(e)), 'alasan terlalu pendek ditolak');
check(v(withSec({ noSourceNeeded: 'Konvensi pencatatan; bukan regulasi', sources: good.sources })).errors.some((e) => /tidak boleh digabung/.test(e)), 'tidak boleh digabung dengan sources');

section('Validator — struktur');
const dup = base(); dup.chapters[0].sections.push({ id: 's1', heading: 'H2', body: '<p>y</p>' });
check(v(dup).errors.some((e) => /duplikat/.test(e)), 'id duplikat ditolak');
check(v(withSec({ body: '' })).errors.some((e) => /body kosong/.test(e)), 'body kosong ditolak');
check(v(withSec({ body: '<div><p>x</p>' })).warnings.length === 1, 'tag tidak seimbang → peringatan');
check(v({ ...base(), disclaimer: '' }).errors.length === 1, 'disclaimer kosong ditolak');
check(v({ ...base(), disclaimer: 'Bukan nasihat pajak.' }).errors.length === 0, 'disclaimer valid lolos');

section('Renderer — buildSourcesHtml');
check(H.buildSourcesHtml({ heading: 'x', body: 'y' }, false) === '', 'tanpa field → string kosong (render lama tidak berubah)');
const html = H.buildSourcesHtml(good, false);
check(/kb-sources/.test(html) && /Sumber &amp; rujukan/.test(html), 'blok sumber muncul');
check(/<span class="kb-src-type">UU<\/span>/.test(html), 'label tipe UU');
check(/<a href="https:\/\/peraturan\.go\.id\/x" target="_blank" rel="noopener noreferrer">/.test(html), 'tautan aman (https, noopener)');
check(/Ditinjau: Sep 2026/.test(html), 'lencana tinjau diformat bahasa Indonesia');
check(!/<a /.test(H.buildSourcesHtml(good, true)), 'versi cetak tanpa tautan');
const xss = H.buildSourcesHtml({ sources: [{ type: 'uu', ref: '<img src=x onerror=alert(1)>', note: '"><script>', url: 'javascript:alert(1)' }] }, false);
check(!/<img|<script|javascript:/i.test(xss), 'XSS di ref/note/url di-escape / dibuang');
check(H.formatReviewed('2026-10') === 'Okt 2026' && H.formatReviewed('bad') === '', 'formatReviewed');
check(H.safeUrl('https://a.go.id/b') !== '' && H.safeUrl('ftp://a') === '' && H.safeUrl('https://a b') === '', 'safeUrl');

section('Konten nyata semua modul lolos skema');
let excelContent = null;
for (const [f, g] of [
  ['apps/spt/data/knowledge-spt.js', 'KNOWLEDGE_CONTENT_SPT'],
  ['apps/accounting/data/knowledge-accounting.js', 'KNOWLEDGE_CONTENT_ACCOUNTING'],
  ['apps/excel/data/knowledge-excel.js', 'KNOWLEDGE_CONTENT_EXCEL'],
  ['apps/sql-pq/data/knowledge-sqlpq.js', 'KNOWLEDGE_CONTENT_SQLPQ'],
]) {
  const sb = { window: {}, console }; vm.createContext(sb);
  vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), sb);
  const r = v(sb.window[g]);
  check(r.errors.length === 0, `${g} lolos skema${r.errors.length ? ': ' + r.errors[0] : ''}`);
  if (g === 'KNOWLEDGE_CONTENT_EXCEL') excelContent = sb.window[g];
}
const vbaChapter = excelContent && excelContent.chapters.find((chapter) => chapter.id === 'vba-excel');
const vbaCodeExamples = vbaChapter
  ? (vbaChapter.sections.map((item) => item.body.match(/class="kb-code"/g) || []).flat().length)
  : 0;
check(Boolean(vbaChapter), 'bab VBA tersedia di Modul Pengetahuan Excel');
check(vbaCodeExamples >= 24, `bab VBA memuat minimal 24 contoh kode (ditemukan ${vbaCodeExamples})`);
check(vbaChapter && vbaChapter.sections.every((item) => item.sources && item.sources.length), 'setiap subbab VBA memiliki sumber');

console.log(`\n${passed} lolos, ${failed} gagal`);
process.exit(failed ? 1 : 0);
