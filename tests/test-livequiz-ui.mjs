// Uji asap UI Kuis Langsung (apps/game-hub) di jsdom: DUA "browser" (guru & siswa) berbagi satu localStorage (mode lokal),
// dari pilih peran → pilih tema (soal otomatis ≥20) → edit/ganti soal → siswa masuk lewat kode → mulai → jawab → reveal → hasil akhir + CSV.
// Butuh jsdom:  npm install --no-save jsdom && node tests/test-livequiz-ui.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch { try { ({ JSDOM } = createRequire(join(process.cwd(), 'x.js'))('jsdom')); } catch { console.log('jsdom tidak terpasang — lewati (npm install --no-save jsdom)'); process.exit(0); } }
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, ms = 6000) { const t0 = Date.now(); for (;;) { let v; try { v = fn(); } catch { v = false; } if (v) return v; if (Date.now() - t0 > ms) { check(false, 'timeout: ' + label); throw new Error('timeout ' + label); } await sleep(25); } }

const store = new Map(), wins = [];
function sharedStorage() { return { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem(k, v) { store.set(k, String(v)); wins.forEach((w) => { try { w.dispatchEvent(new w.StorageEvent('storage', { key: k })); } catch {} }); }, removeItem: (k) => store.delete(k) }; }
async function open(name, search = '') {
  const url = pathToFileURL(join(ROOT, 'apps/game-hub/index.html')).href + search;
  const dom = await JSDOM.fromFile(join(ROOT, 'apps/game-hub/index.html'), { url, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w, 'localStorage', { value: sharedStorage() }); w.fetch = () => Promise.reject(new Error('offline')); w.confirm = () => true; w.scrollTo = () => {}; w.__chromaFrame = new Uint8ClampedArray([0, 220, 0, 255, 22, 12, 21, 255]); Object.defineProperty(w.HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get() { return 2; } }); Object.defineProperty(w.HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get() { return 1; } }); Object.defineProperty(w.HTMLMediaElement.prototype, 'readyState', { configurable: true, get() { return 2; } }); w.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {}, getImageData() { return { data: w.__chromaFrame }; }, putImageData() {} }); w.HTMLMediaElement.prototype.play = () => Promise.resolve(); wins.push(w); w.__name = name; w.URL.createObjectURL = () => 'blob:x'; } });
  await until(() => dom.window.document.readyState === 'complete' && dom.window.LiveQuiz && dom.window.document.getElementById('btn-role-teacher'), name + ' siap');
  await sleep(50); return dom.window;
}
const $ = (w, id) => w.document.getElementById(id);
const click = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true }));
const type = (el, val) => { el.value = val; el.dispatchEvent(new el.ownerDocument.defaultView.Event('input', { bubbles: true })); el.dispatchEvent(new el.ownerDocument.defaultView.Event('change', { bubbles: true })); };
const visible = (w, id) => !$(w, id).hidden;

const T = await open('guru'); const S = await open('siswa');
console.log('\n=== UI: guru membuat ruang ===');
$(T, 'chk-local').checked = true; click($(T, 'btn-role-teacher'));
await until(() => visible(T, 'v-setup'), 'layar atur kuis');
const code = $(T, 'lq-roomcode').textContent; check(/^[A-HJ-NP-Z2-9]{6}$/.test(code), 'kode ruang tampil: ' + code);
check($(T, 'btn-start').disabled, 'tombol mulai nonaktif sebelum soal ada');
check(T.document.querySelectorAll('.lq-theme').length === 5, '5 kartu tema (Pajak, Akuntansi, Excel, SQL & Power Query, Campuran)');

console.log('=== UI: siswa masuk SELAMA guru mengatur ===');
$(S, 'chk-local').checked = true; click($(S, 'btn-role-student')); type($(S, 'in-code'), code.toLowerCase()); type($(S, 'in-name'), 'Ani');
check($(S, 'in-code').value === code, 'kode siswa dinormalisasi huruf besar');
click($(S, 'btn-join')); await until(() => visible(S, 'v-play') && /menunggu guru/i.test($(S, 'v-play').textContent), 'siswa di lobi');
await until(() => $(T, 'lq-count').textContent === '1', 'guru melihat 1 siswa'); check(/Ani/.test($(T, 'lq-lobby').textContent), 'nama siswa tampil di lobi guru');

console.log('=== UI: pilih tema → soal otomatis, edit, ganti ===');
await sleep(20); click(T.document.querySelector('[data-theme-id="akuntansi"]'));
await until(() => T.document.querySelectorAll('#lq-editor .lq-q').length >= 20, '≥20 soal dibuat otomatis');
check(T.document.querySelectorAll('#lq-editor .lq-q').length === 20, 'default 20 soal'); check(!$(T, 'btn-start').disabled, 'tombol mulai aktif');
check(/valid/.test($(T, 'lq-errors').textContent), 'validasi: semua valid');
const firstQ = T.document.querySelector('#lq-editor .lq-q textarea');
type(firstQ, 'Soal hasil edit guru?'); check(/Soal hasil edit/.test(T.document.querySelector('#lq-editor .lq-q textarea').value), 'edit pertanyaan');
click(T.document.querySelectorAll('#lq-editor .lq-q .lq-btn')[0]); await sleep(30);
check(T.document.querySelector('#lq-editor .lq-q textarea').value !== 'Soal hasil edit guru?', 'tombol "Ganti soal" membuat soal baru');
for (const id of ['excel', 'sqlpq', 'pajak']) { click(T.document.querySelector(`[data-theme-id="${id}"]`)); await until(() => T.document.querySelectorAll('#lq-editor .lq-q').length === 20 && T.document.querySelector(`[data-theme-id="${id}"]`).getAttribute('aria-checked') === 'true', 'tema ' + id + ' → 20 soal otomatis'); }
check(/[A-Za-z]/.test(T.document.querySelector('#lq-editor .lq-q textarea').value), 'soal tema pajak terisi');
click(T.document.querySelector('[data-theme-id="akuntansi"]')); await until(() => T.document.querySelectorAll('#lq-editor .lq-q').length === 20, 'kembali ke akuntansi');
type($(T, 'in-count'), '30'); click($(T, 'btn-regen-all')); await until(() => T.document.querySelectorAll('#lq-editor .lq-q').length === 30, 'generate ulang 30 soal');
type($(T, 'in-timer'), '1'); $(T, 'in-unit').value = 'm'; $(T, 'in-unit').dispatchEvent(new T.Event('change', { bubbles: true }));
check(/1 menit/.test($(T, 'lq-timer-note').textContent), 'timer 1 menit terbaca');
type($(T, 'in-count'), '5'); click($(T, 'btn-regen-all')); await until(() => T.document.querySelectorAll('#lq-editor .lq-q').length === 5, 'jadi 5 soal');
type(T.document.querySelectorAll('#lq-editor .lq-q input:not([type=radio])')[0], ''); check($(T, 'btn-start').disabled && /kosong/.test($(T, 'lq-errors').textContent), 'pilihan kosong → mulai dinonaktifkan');
click($(T, 'btn-regen-all')); await until(() => !$(T, 'btn-start').disabled, 'valid lagi');

console.log('=== UI: mulai kuis, siswa menjawab ===');
click($(T, 'btn-start')); await until(() => visible(T, 'v-host'), 'layar kuis guru');
check(!T.document.querySelector('#v-host .lq-celebration'), 'animasi tidak tampil saat kuis berjalan');
await until(() => S.document.querySelectorAll('.lq-ans').length === 4 || S.document.querySelectorAll('.lq-ans').length === 2 || S.document.querySelectorAll('.lq-ans').length === 3, 'soal tampil di siswa');
check(!/Benar/.test($(S, 'v-play').textContent), 'siswa belum melihat kunci saat soal berjalan');
check(/Soal 1 \/ 5/.test($(S, 'v-play').textContent), 'penomoran soal');
click(S.document.querySelector('.lq-ans[data-i="0"]'));
await until(() => /terkirim/i.test($(S, 'v-play').textContent), 'jawaban terkirim');
await until(() => /1 \/ 1 sudah menjawab/.test($(T, 'v-host').textContent) || /Ani/.test($(T, 'v-host').textContent), 'guru melihat jawaban masuk');
await until(() => $(S, 'v-play').querySelector('.lq-result.is-ok, .lq-result.is-no'), 'reveal otomatis (semua sudah menjawab)');
check(/Papan peringkat/.test($(S, 'v-play').textContent) && /Anda/.test($(S, 'v-play').textContent), 'siswa melihat papan peringkat & posisinya');
check(!!$(T, 'v-host').querySelector('.lq-ans.is-right'), 'guru melihat kunci setelah reveal');

console.log('=== UI: sampai selesai ===');
for (let i = 1; i < 5; i++) {
  await until(() => [...T.document.querySelectorAll('#v-host .lq-btn--primary')].find((b) => /berikutnya|hasil akhir/i.test(b.textContent)), 'tombol lanjut ' + i);
  click([...T.document.querySelectorAll('#v-host .lq-btn--primary')].find((b) => /berikutnya|hasil akhir/i.test(b.textContent)));
  await until(() => new RegExp('Soal ' + (i + 1) + ' / 5').test($(S, 'v-play').textContent), 'soal ' + (i + 1));
  click(S.document.querySelector('.lq-ans[data-i="1"]')); await until(() => $(S, 'v-play').querySelector('.lq-result.is-ok, .lq-result.is-no'), 'reveal ' + (i + 1));
}
click([...T.document.querySelectorAll('#v-host .lq-btn--primary')].find((b) => /hasil akhir/i.test(b.textContent)));
await until(() => /Hasil akhir/.test($(T, 'v-host').textContent), 'hasil akhir guru'); await until(() => /Kuis selesai/.test($(S, 'v-play').textContent), 'hasil akhir siswa');
check(/Ani/.test($(T, 'v-host').textContent) && /poin/.test($(T, 'v-host').textContent), 'papan akhir memuat nama & poin');
for (const w of [T, S]) { const cat = w.document.querySelector('.lq-celebration'); const source = w.document.querySelector('.lq-celebration-source'); check(!!cat && !!source && source.autoplay && source.loop && !source.muted && source.playsInline && /\/apps\/game-hub\/assets\/clapping-cat\.mp4$/.test(source.src), 'animasi hasil akhir besar dan bersuara'); check(!!w.document.querySelector('.lq-celebration-wrap .lq-btn'), 'tombol memutar animasi tersedia bila autoplay diblokir'); source.dispatchEvent(new w.Event('loadeddata')); check(w.__chromaFrame[3] === 0 && w.__chromaFrame[7] === 255 && w.__chromaFrame[1] === 18, 'latar hijau dihapus dan gambar kucing dipertahankan'); }
check(/Peringkat #1/.test($(S, 'v-play').textContent), 'siswa tunggal = peringkat #1');
let blobText = ''; T.Blob = class { constructor(p) { blobText = p.join(''); } }; click([...T.document.querySelectorAll('#v-host .lq-btn')].find((b) => /CSV/.test(b.textContent)));
check(/Peringkat/.test(blobText) && /"Ani"/.test(blobText), 'CSV berisi hasil');
check(!T.document.querySelector('.lq-banner').textContent || T.document.querySelector('.lq-banner').hidden, 'tanpa pesan galat');

console.log(`\n${failed ? '✗' : '✓'} test-livequiz-ui: ${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
