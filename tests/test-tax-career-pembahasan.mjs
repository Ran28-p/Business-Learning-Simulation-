// Test pembahasan berlapis Tax Career (29 soal) + renderer. Tanpa dependency:
//   node tests/test-tax-career-pembahasan.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'spt', 'tax_career') + '/';
let ok = 0, bad = 0;
const t = (c, l) => { if (c) ok++; else { bad++; console.log('  ✗ GAGAL: ' + l); } };

const sb = { window: {} }; vm.createContext(sb);
vm.runInContext(readFileSync(R + 'data/questions.js', 'utf8'), sb);
vm.runInContext(readFileSync(R + 'data/questions-pembahasan.js', 'utf8'), sb);
const Q = sb.window.TAX_CAREER_QUESTIONS;
t(Q.length === 29, 'jumlah soal 29, ditemukan ' + Q.length);

const ids = new Set();
for (const q of Q) {
  t(!ids.has(q.id), 'id unik ' + q.id); ids.add(q.id);
  const pb = q.pembahasan;
  t(pb && typeof pb.konsep === 'string' && pb.konsep.length >= 40, q.id + ': konsep ≥ 40 karakter');
  t(pb && pb.dasar && pb.dasar.length >= 10, q.id + ': dasar terisi');
  t(pb && pb.jebakan && pb.ingat, q.id + ': jebakan & ingat terisi');
  if (q.type === 'mcq') {
    const wrong = q.options.filter((o) => o !== q.answer);
    t(q.options.includes(q.answer), q.id + ': kunci ada di opsi');
    t(pb && pb.salah && wrong.length === 3 && wrong.every((o) => pb.salah[o] && pb.salah[o].length >= 15), q.id + ': semua opsi salah dijelaskan');
    t(pb && pb.salah && Object.keys(pb.salah).length === wrong.length, q.id + ': tidak ada alasan kelebihan');
  }
}
// soal berhitung harus punya langkah dengan angka yang benar
for (const id of ['TC-002','TC-004','TC-005','TA-001','TA-003','TA-004','TCO-001','TCO-002','TCO-005','TAD-001','TAD-002','TP-003']) t((Q.find((q) => q.id === id).pembahasan.langkah || []).length >= 1, id + ': langkah hitung ada');
const L = (id) => (Q.find((q) => q.id === id).pembahasan.langkah || []).join(' | ');
t(/2\.000\.000/.test(L('TC-002')), 'TC-002 hasil 2.000.000');
t(/20\.000\.000/.test(L('TC-005')), 'TC-005 hasil 20.000.000');
t(/520\.000\.000/.test(L('TA-001')), 'TA-001 hasil 520.000.000');
t(/420\.000\.000/.test(L('TA-004')), 'TA-004 hasil 420.000.000');
t(/220\.000/.test(L('TAD-001')), 'TAD-001 lebih potong 220.000');
t(/20\.000\.000/.test(L('TCO-001')) && /4\.000\.000/.test(L('TCO-001')) && /16\.000\.000/.test(L('TCO-001')), 'TCO-001 selisih 16 juta');
// konsistensi aritmetika contoh
t(2 * 100e6 / 100 === 2e6 && 0.02 * 111e6 - 0.02 * 100e6 === 220000 && 0.1 * 200e6 - 0.02 * 200e6 === 16e6, 'aritmetika pembahasan');
t((240e6 - 60e6) / 12 === 15e6, 'aritmetika TC-004');
t(Math.round(100e6 * 0.0102 * 3) === 3060000, 'aritmetika TCO-005');
// jawaban benar tidak boleh bocor pada urutan: kunci bukan opsi pertama untuk semua soal
t(Q.filter((q) => q.options[0] === q.answer).length < Q.length / 2, 'kunci tidak selalu opsi pertama');

// renderer (diambil dari app.js)
const src = readFileSync(R + 'app.js', 'utf8');
const grab = (name) => { const i = src.indexOf('function ' + name + '('); let d = 0; const j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } };
const rsb = {}; vm.createContext(rsb);
vm.runInContext(grab('escapeHtml') + '\n' + grab('pembahasanHtml') + ';this.f={pembahasanHtml};', rsb);
const { pembahasanHtml } = rsb.f;
t(pembahasanHtml({}) === '', 'tanpa pembahasan → string kosong');
const h = pembahasanHtml(Q[0]);
t(/tcpb/.test(h) && /Mengapa jawabannya begitu/.test(h) && /Jebakan umum/.test(h) && /Cara mengingat/.test(h), 'blok berlapis dirender');
t(/Mengapa opsi lain kurang tepat/.test(h) && (h.match(/<li>/g) || []).length >= 3, 'alasan opsi salah dirender');
t(/Langkah hitung/.test(pembahasanHtml(Q.find((q) => q.id === 'TC-002'))), 'langkah hitung dirender');
const evil = pembahasanHtml({ pembahasan: { konsep: '<img src=x onerror=alert(1)> konsep palsu yang cukup panjang', salah: { '<b>x</b>': '<script>y</script>' }, langkah: ['<i>z</i>'] } });
t(!/<img|<script|<b>|<i>/.test(evil), 'XSS di-escape');
console.log(`\ntest-tax-career-pembahasan: ${Q.length} soal — ${ok} lolos, ${bad} gagal`);
process.exit(bad ? 1 : 0);
