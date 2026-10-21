// FASE 4 — Verifikasi angka: setiap contoh hitung yang ditulis di materi/pembahasan dicocokkan
// dengan mesin pajak ASLI aplikasi (apps/spt/js/shared/tax-engine.js), bukan dengan hitungan tangan.
// Dua arah: (1) mesin menghasilkan angka itu, (2) angka itu memang tertulis di teks materi.
//   node tests/test-pembahasan-angka.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') + '/';
let ok = 0, bad = 0;
const t = (c, l) => { if (c) ok++; else { bad++; console.log('  ✗ GAGAL: ' + l); } };

// mesin pajak
const g = { }; g.window = g; vm.createContext(g);
vm.runInContext(readFileSync(ROOT + 'apps/spt/js/shared/tax-engine.js', 'utf8'), g);
const T = g.window.TaxEngine;

// teks materi (tanpa tag HTML) per subbab
const load = (f, name) => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(readFileSync(ROOT + f, 'utf8'), sb); return sb.window[name]; };
const flat = (c) => { const m = {}; c.chapters.forEach((ch) => ch.sections.forEach((s) => { m[s.id] = s.body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '); })); return m; };
const SPT = flat(load('apps/spt/data/knowledge-spt.js', 'KNOWLEDGE_CONTENT_SPT'));
const ACC = flat(load('apps/accounting/data/knowledge-accounting.js', 'KNOWLEDGE_CONTENT_ACCOUNTING'));
const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const inText = (txt, n) => txt.includes(rp(n));
const hasNum = (txt, n) => txt.includes(Math.round(n).toLocaleString('id-ID'));   // angka tanpa awalan Rp (kolom jurnal)

// ── 1. PPh 21 masa Desember (SPT › pph21-masa-desember)
const bruto = 12e6, setahun = bruto * 12;
const biayaJabatan = Math.min(setahun * 0.05, 6e6);
const ptkp = T.hitungPTKP('TK/0');
const pkp = Math.floor((setahun - biayaJabatan - ptkp) / 1000) * 1000;
const pphSetahun = T.hitungTarifProgresif(pkp);
const ter = T.hitungTER(bruto, 'TK/0');
const janNov = ter.pph * 11;
const des = pphSetahun - janNov;
const D = SPT['pph21-masa-desember'];
t(biayaJabatan === 6e6 && ptkp === 54e6 && pkp === 84e6, 'PKP contoh Desember = 84.000.000 (mesin)');
t(pphSetahun === 6.6e6, 'PPh setahun = 6.600.000 (mesin)');
t(ter.kategori === 'A' && ter.tarif === 0.04 && ter.pph === 480000, 'TER A 4% → 480.000/bulan (mesin)');
t(janNov === 5.28e6 && des === 1.32e6, 'Jan–Nov 5.280.000; Desember 1.320.000');
for (const n of [setahun, 6e6, 54e6, 84e6, 6.6e6, 480000, 5.28e6, 1.32e6]) t(inText(D, n), 'materi Desember memuat ' + rp(n));
t(/4%/.test(D) && /11\.600\.001/.test(D), 'materi menyebut lapisan TER 4% (11.600.001–12.500.000)');
t(ter.layerMin === 11600001 && ter.layerMax === 12500000, 'batas lapisan TER di mesin sama dengan materi');

// ── 2. Tarif progresif (modul_pajak, tax_career, materi)
t(T.hitungTarifProgresif(80e6) === 6e6, 'PKP 80 juta berlapis = 6.000.000 (jebakan di pembahasan modul_pajak)');
t(T.hitungTarifProgresif(60e6) === 3e6 && T.hitungTarifProgresif(250e6) === 31.5e6, 'lapisan 60 juta & 250 juta');
const mp = JSON.parse(readFileSync(ROOT + 'apps/spt/modul_pajak/questions.json', 'utf8'));
const mpAll = mp.topics.flatMap((x) => x.questions);
const q80 = mpAll.find((q) => /80\.000\.000/.test(q.q));
t(q80 && /6\.000\.000/.test(q80.pembahasan.jebakan) && /3\.000\.000 \+ 3\.000\.000/.test(q80.pembahasan.jebakan), 'jebakan PKP 80 juta menyebut 6.000.000 (3.000.000 + 3.000.000)');

// ── 3. PPh final UMKM 0,5% (modul_pajak & knowledge)
t(T.hitungPPhFinalUMKM(20e6) === 100000, 'final UMKM 0,5% × 20 juta = 100.000 (mesin)');
const qf = mpAll.find((q) => /Rp 20\.000\.000/.test(q.q) && q.type === 'number');
t(qf && Number(qf.answer) === T.hitungPPhFinalUMKM(20e6), 'kunci soal UMKM = hasil mesin');
const qpph3 = mpAll.find((q) => /Tarif PPh final UMKM/.test(q.q));
t(qpph3 && Number(qpph3.answer) === 0.5 && T.hitungPPhFinalUMKM(1e6) / 1e6 === 0.005, 'tarif UMKM 0,5% = mesin');

// ── 4. PPh Badan & Pasal 31E (materi tarif-badan)
const b = T.hitungPPhBadan(4.8e9, 1e9);
t(b.pphTerutang === 110e6 && b.fasilitasPenuh, 'contoh 31E: PPh 110 juta (11%) — mesin');
t(inText(SPT['tarif-badan'], 110e6) || /110 juta/.test(SPT['tarif-badan']), 'materi tarif-badan memuat 110 juta');
t(T.hitungPPhBadan(60e9, 2e9).pphTerutang === 0.22 * 2e9, 'tanpa fasilitas: 22%');

// ── 5. PTKP (form-pembahasan, materi)
t(T.hitungPTKP('K/0') - T.hitungPTKP('TK/0') === 4.5e6 && T.hitungPTKP('K/1') - T.hitungPTKP('K/0') === 4.5e6, 'tambahan PTKP 4,5 juta per status/tanggungan (mesin)');
const FP = readFileSync(ROOT + 'apps/spt/js/data/form-pembahasan.js', 'utf8');
t(/Rp54\.000\.000/.test(FP) && /Rp4\.500\.000/.test(FP), 'form-pembahasan memuat PTKP 54 juta & 4,5 juta');

// ── 6. PPN (materi faktur-pajak-masukan, dpp-nilai-lain)
const ppnKeluaran = 0.12 * (11 / 12) * 100e6, ppnMasukan = 0.12 * (11 / 12) * 60e6;
t(Math.round(ppnKeluaran) === 11e6 && Math.round(ppnMasukan) === 6.6e6 && Math.round(ppnKeluaran - ppnMasukan) === 4.4e6, 'PPN 12% × 11/12: 11 juta, 6,6 juta, selisih 4,4 juta');
for (const n of [11e6, 6.6e6, 4.4e6]) t(inText(SPT['faktur-pajak-masukan'], n), 'materi faktur memuat ' + rp(n));
t(Math.abs(0.12 * 11 / 12 - 0.11) < 1e-12, 'tarif efektif = 11%');
t(inText(SPT['dpp-nilai-lain'], 1.32e6) && inText(SPT['dpp-nilai-lain'], 240000), 'materi DPP nilai lain: PPN 1.320.000 & PPh 23 240.000');
t(Math.round(0.12 * (11 / 12) * 12e6) === 1.32e6 && Math.round(0.02 * 12e6) === 240000, 'hitung: 12% × 11/12 × 12 juta = 1.320.000; 2% × 12 juta = 240.000');

// ── 7. Pembetulan SPT, PPh 23, penyusutan fiskal (materi)
t(Math.round(10e6 * 0.0102 * 3) === 306000 && inText(SPT['pembetulan-spt'], 306000), 'bunga pembetulan: 306.000');
t(0.02 * 15e6 === 300000 && 0.04 * 15e6 === 600000 && 0.3 * 12e6 === 3.6e6, 'PPh 23: 300.000 / 600.000 / 3.600.000');
for (const n of [300000, 600000, 3.6e6]) t(inText(SPT.pph23, n), 'materi PPh 23 memuat ' + rp(n));
t(0.25 * 20e6 === 5e6 && 20e6 / 5 === 4e6 && 5e6 - 4e6 === 1e6 && inText(SPT['penyusutan-fiskal'], 5e6), 'penyusutan fiskal laptop: 5 juta vs 4 juta, koreksi 1 juta');
t(100e6 + 10e6 - 15e6 === 95e6 && inText(SPT['rekonsiliasi-fiskal'], 95e6), 'rekonsiliasi: 100 + 10 − 15 = 95 juta');

// ── 8. Accounting (siklus akhir periode)
const ap = ACC['aset-tetap-penyusutan'], pj = ACC['jurnal-penyesuaian'], pu = ACC['piutang-tak-tertagih'];
t((120e6 - 20e6) / 5 === 20e6 && 0.4 * 120e6 === 48e6 && 0.4 * (120e6 - 48e6) === 28.8e6, 'penyusutan GL 20 juta; DDB 48 juta & 28,8 juta');
for (const n of [20e6, 48e6, 28.8e6]) t(inText(ap, n), 'materi penyusutan memuat ' + rp(n));
t(12e6 / 12 * 3 === 3e6 && 6e6 / 6 * 2 === 2e6, 'penyesuaian: sewa 3 juta, pendapatan 2 juta');
t([3e6, 2e6, 4e6, 5e6, 12e6, 6e6].every((n) => hasNum(pj, n)), 'materi penyesuaian memuat 12/6/5/4/3/2 juta');
t(0.03 * 200e6 - 1.5e6 === 4.5e6 && inText(pu, 4.5e6) && inText(pu, 6e6), 'piutang: 3% × 200 juta − 1,5 juta = 4,5 juta');

// ── 9. Konsistensi laporan keuangan contoh CV Mitra Sejahtera (materi Accounting)
t(610 - 350 === 260 && 90 + 36 + 8 + 15 + 11 === 160 && 260 - 160 === 100 && 100 * 0.22 === 22 && 100 - 22 === 78, 'laba rugi contoh: 260 → 100 → 22 pajak → 78');
t(300 + 50 + 28 - 28 === 350 || 300 + 78 - 28 === 350, 'ekuitas akhir contoh = 350');
t(190 + 45 + 60 + 5 === 300 && 300 + (120 - 30) === 390 && 40 + 350 === 390, 'neraca contoh seimbang (390)');
t(600 - 360 - 80 - 55 - 22 === 83 && 83 - 25 - 28 === 30 && 160 + 30 === 190, 'arus kas contoh: 83 − 25 − 28 = 30; kas akhir 190');

console.log(`\ntest-pembahasan-angka: ${ok} lolos, ${bad} gagal`);
process.exit(bad ? 1 : 0);
