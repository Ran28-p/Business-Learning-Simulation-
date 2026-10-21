// Test pembahasan per titik cek (mode Isi Formulir SPT). Tanpa dependency:
//   node tests/test-form-pembahasan.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const R = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'spt') + '/';
let ok = 0, bad = 0; const t = (c, l) => { if (c) ok++; else { bad++; console.log('  ✗ GAGAL: ' + l); } };

const sb = { window: {} }; vm.createContext(sb);
vm.runInContext(readFileSync(R + 'js/shared/html-utils.js', 'utf8'), sb); // escapeHTML dipakai esc()
vm.runInContext(readFileSync(R + 'js/data/form-pembahasan.js', 'utf8'), sb);
const FP = sb.window.FormPembahasan;

// 1. Semua label titik cek di app-*.js (app-main.js dipecah per tanggung jawab) punya aturan pembahasan
const src = readdirSync(R + 'js').filter((f) => /^app-.*\.js$/.test(f)).sort().map((f) => readFileSync(R + 'js/' + f, 'utf8')).join('\n');
const labels = [...src.matchAll(/\{ label: '([^']+)', ok:/g)].map((m) => m[1]);
t(labels.length >= 50, 'ditemukan ≥ 50 label titik cek, dapat ' + labels.length);
const uncovered = [...new Set(labels)].filter((l) => !FP.lookup(l));
t(uncovered.length === 0, 'semua label punya pembahasan; belum: ' + uncovered.join(' | '));
// 2. Aturan lengkap
for (const r of FP.rules) t(r.rumus.length >= 40 && r.dasar.length >= 8 && r.jebakan.length >= 20, 'aturan lengkap ' + r.re);
// 3. Urutan: label spesifik 1771 tidak tertangkap aturan 1770
t(/22%/.test(FP.lookup('PPh Kurang/Lebih Bayar (hasil akhir Induk)').rumus), 'KB/LB 1771 memakai aturan badan');
t(/Pasal 17 ayat \(1\) huruf a/.test(FP.lookup('PPh Kurang/Lebih Bayar — Angka 12 (hasil akhir Induk)').dasar), 'KB/LB 1770 memakai aturan OP');
t(FP.lookup('Penghasilan Neto dari Pekerjaan — 1.a (Lampiran II-A)').rumus.includes('biaya jabatan'), 'neto pekerjaan');
// 4. Render
const checks = [{ label: 'Status PTKP — Angka 7 (Induk)', ok: false, correctVal: 'K/1' }, { label: 'Total PPh Final (Lampiran III-A)', ok: true, correctVal: 'Rp0' }, { label: 'Label tidak dikenal', ok: false, correctVal: 'x' }];
const h = FP.render(checks);
t(/2 titik cek perlu diperbaiki/.test(h), 'ringkasan jumlah salah');
t(/<details class="fp-detail" open>/.test(h) && /Lihat rumus/.test(h), 'yang salah terbuka, yang benar tertutup');
t(/seharusnya: <strong>K\/1<\/strong>/.test(h), 'menampilkan nilai seharusnya');
t((h.match(/<details/g) || []).length === 2, 'label tak dikenal tanpa detail');
t(!/perlu diperbaiki/.test(FP.render([{ label: 'Total Harta (Lampiran IV)', ok: true, correctVal: 'Rp1' }])), 'semua benar → tanpa catatan');
const evil = FP.render([{ label: '<img src=x onerror=alert(1)>', ok: false, correctVal: '<script>x</script>' }]);
t(!/<img|<script/.test(evil), 'XSS di-escape');
// 5. Fakta kunci
t(/Rp54\.000\.000/.test(FP.lookup('Status PTKP — Angka 4').rumus) && /Rp4\.500\.000/.test(FP.lookup('Status PTKP — Angka 4').rumus), 'PTKP 54 juta + 4,5 juta');
t(/Rp6\.000\.000/.test(FP.lookup('Pengurang (Biaya Jabatan, maks. Rp 500.000/bulan) — Angka 2').rumus), 'biaya jabatan maks Rp6 juta');
console.log(`\ntest-form-pembahasan: ${labels.length} label — ${ok} lolos, ${bad} gagal`);
process.exit(bad ? 1 : 0);
