// Test materi "Penggajian & PPh 21 (TER)" di generator Excel — dibuktikan terhadap sumber RESMI, bukan ingatan.
//   A. DATA        — tabel TER A/B/C (125 baris), Pasal 17, PTKP, kategori di data/payroll-ter.js identik dengan:
//                    (1) tabel resmi DJP (slide PMK 168/2023, pajak.go.id — ditranskripsi di bawah) dan (2) mesin pajak SPT.
//   B. CONTOH RESMI — contoh hitung di dokumen yang sama dijalankan melalui RUMUS EXCEL yang dibangkitkan (dievaluasi
//                    HyperFormula): simulasi 9 baris (PPh Jan–Nov, Desember, setahun — termasuk hasil negatif), Tuan A
//                    (premi JKK/JKM masuk bruto), Tuan R, F, H, B, D, P.
//   C. PROPERTI    — banyak seed × level: tanpa error rumus, hanya fungsi yang didukung Excel/HyperFormula, dan hasil sama
//                    dengan implementasi referensi independen (TaxEngine SPT + aturan pembulatan resmi).
//   D. REGISTRASI & TEMPORAL — materi terdaftar & muncul di UI; catatan PTKP (rencana perubahan 2027) terdokumentasi.
// Jalankan:  node tests/test-payroll-ter.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const eq = (a, b, l) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) console.log(`   diharapkan ${JSON.stringify(b)} · didapat ${JSON.stringify(a)}`); check(ok, l); };
const section = (t) => console.log('\n=== ' + t + ' ===');

const data = await import(join(ROOT, 'apps/excel/data/payroll-ter.js'));
const gen = await import(join(ROOT, 'apps/excel/js/exercise-generator.js'));
const dgen = await import(join(ROOT, 'apps/excel/js/dataset-generator.js'));
const { HyperFormula } = require(join(ROOT, 'vendor/hyperformula/hyperformula.full.js'));

const ctx = { console, document: {}, localStorage: { getItem() { return null; } } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'apps/spt/js/shared/tax-engine.js'), 'utf8'), ctx);
const TE = ctx.TaxEngine;

/* ============ A. DATA vs TABEL RESMI ============ */
section('A. Data acuan = tabel resmi DJP (PMK 168/2023) = mesin SPT');
// Transkripsi dari slide resmi DJP "PMK 168 Tahun 2023 tentang PPh Pasal 21 TER" (pajak.go.id, diakses 12 Okt 2026).
// Format: [batas atas dalam juta Rupiah, tarif dalam persen]; lapisan terakhir ("lebih dari") = 34%.
const OFFICIAL = {
  A: [[5.4,0],[5.65,.25],[5.95,.5],[6.3,.75],[6.75,1],[7.5,1.25],[8.55,1.5],[9.65,1.75],[10.05,2],[10.35,2.25],[10.7,2.5],[11.05,3],[11.6,3.5],[12.5,4],[13.75,5],[15.1,6],[16.95,7],[19.75,8],[24.15,9],[26.45,10],[28,11],[30.05,12],[32.4,13],[35.4,14],[39.1,15],[43.85,16],[47.8,17],[51.4,18],[56.3,19],[62.2,20],[68.6,21],[77.5,22],[89,23],[103,24],[125,25],[157,26],[206,27],[337,28],[454,29],[550,30],[695,31],[910,32],[1400,33]],
  B: [[6.2,0],[6.5,.25],[6.85,.5],[7.3,.75],[9.2,1],[10.75,1.5],[11.25,2],[11.6,2.5],[12.6,3],[13.6,4],[14.95,5],[16.4,6],[18.45,7],[21.85,8],[26,9],[27.7,10],[29.35,11],[31.45,12],[33.95,13],[37.1,14],[41.1,15],[45.8,16],[49.5,17],[53.8,18],[58.5,19],[64,20],[71,21],[80,22],[93,23],[109,24],[129,25],[163,26],[211,27],[374,28],[459,29],[555,30],[704,31],[957,32],[1405,33]],
  C: [[6.6,0],[6.95,.25],[7.35,.5],[7.8,.75],[8.85,1],[9.8,1.25],[10.95,1.5],[11.2,1.75],[12.05,2],[12.95,3],[14.15,4],[15.55,5],[17.05,6],[19.5,7],[22.7,8],[26.6,9],[28.1,10],[30.1,11],[32.6,12],[35.4,13],[38.9,14],[43,15],[47.4,16],[51.2,17],[55.8,18],[60.4,19],[66.7,20],[74.5,21],[83.2,22],[95.6,23],[110,24],[134,25],[169,26],[221,27],[390,28],[463,29],[561,30],[709,31],[965,32],[1419,33]],
};
for (const k of ['A', 'B', 'C']) {
  const off = OFFICIAL[k].map(([m, r]) => [Math.round(m * 1e6), Math.round(r * 100) / 10000]);
  off.push([data.BATAS_TERBUKA, 0.34]);
  eq(data.TER_TABEL[k].length, { A: 44, B: 40, C: 41 }[k], `TER ${k}: jumlah lapisan sesuai dokumen resmi`);
  eq(data.TER_TABEL[k].map(([m, r]) => [m, Math.round(r * 1e4) / 1e4]), off, `TER ${k}: SEMUA lapisan (batas atas & tarif) identik dengan tabel resmi DJP`);
  eq(TE.TER_TABLE[k].map((r) => [r.max === Infinity ? data.BATAS_TERBUKA : r.max, Math.round(r.rate * 1e4) / 1e4]), off, `TER ${k}: mesin pajak SPT juga identik dengan tabel resmi`);
}
eq(data.TER_TABEL.A.length + data.TER_TABEL.B.length + data.TER_TABEL.C.length, 125, 'total 125 lapisan TER');
eq(data.PASAL17, [[60e6, .05], [250e6, .15], [500e6, .25], [5e9, .30], [data.BATAS_TERBUKA, .35]], 'Pasal 17 ayat (1) huruf a: 5/15/25/30/35% (slide resmi DJP)');
eq(data.PTKP_SETAHUN, { 'TK/0': 54e6, 'TK/1': 58.5e6, 'TK/2': 63e6, 'TK/3': 67.5e6, 'K/0': 58.5e6, 'K/1': 63e6, 'K/2': 67.5e6, 'K/3': 72e6 }, 'PTKP per status (54/58,5/63/67,5/72 juta — slide resmi DJP)');
eq(data.KATEGORI_TER, { 'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A', 'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B', 'K/3': 'C' }, 'kategori TER: A = TK/0,TK/1,K/0 · B = TK/2,TK/3,K/1,K/2 · C = K/3 (slide resmi DJP)');
for (const st of Object.keys(data.KATEGORI_TER)) eq([TE.hitungPTKP(st), TE.hitungTER(10e6, st).kategori], [data.PTKP_SETAHUN[st], data.KATEGORI_TER[st]], `mesin SPT sepakat untuk status ${st}`);
eq(data.BIAYA_JABATAN, { tarif: 0.05, maksSetahun: 6000000 }, 'biaya jabatan 5%, maks Rp6.000.000/tahun (Rp500.000/bulan)');
// lapisan tidak tumpang tindih & menaik
for (const k of ['A', 'B', 'C']) check(data.TER_TABEL[k].every(([m, r], i, a) => i === 0 || (m > a[i - 1][0] && r > a[i - 1][1])), `TER ${k}: batas atas dan tarif naik tegas`);

/* ============ harness evaluasi rumus (HyperFormula) ============ */
const colIdx = (L) => L.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const matrixFrom = (cells) => { const maxR = Math.max(...cells.map((c) => c.r)) + 1, maxC = Math.max(...cells.map((c) => c.c)) + 1; const m = Array.from({ length: maxR }, () => Array(maxC).fill(null)); cells.forEach((c) => { m[c.r][c.c] = c.v; }); return m; };

/** Evaluasi satu spesifikasi latihan; hasil per baris latihan: { key: nilai }. rowsOverride mengganti baris dataset (untuk vektor uji resmi). */
function evaluate(spec, rowsOverride) {
  // useArrayArithmetic: Excel menghitung (a>rentang)*(…) di dalam SUMPRODUCT secara larik secara bawaan; HyperFormula perlu opsi ini.
  const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3', useArrayArithmetic: true });
  hf.addSheet('dataset'); hf.addSheet('practice');
  const cells = [];
  spec.dataset.headers.forEach((h, i) => cells.push({ r: gen.DATASET_ROW_HEADER - 1, c: 1 + i, v: h }));
  (rowsOverride || spec.dataset.rows).forEach((row, r) => row.forEach((v, i) => cells.push({ r: gen.DATASET_ROW_DATA_START - 1 + r, c: 1 + i, v })));
  spec.datasetMasterRanges.forEach((m) => {
    m.table.headers.forEach((h, i) => cells.push({ r: m.headerRow - 1, c: m.startCol - 1 + i, v: h }));
    m.table.rows.forEach((row, r) => row.forEach((v, i) => cells.push({ r: m.dataStartRow - 1 + r, c: m.startCol - 1 + i, v })));
  });
  hf.setSheetContent(hf.getSheetId('dataset'), matrixFrom(cells));
  const pcells = [];
  spec.practiceRows.forEach((pr) => { [...pr.given, ...pr.answer].forEach((x) => pcells.push({ r: pr.rowNum - 1, c: colIdx(x.letter), v: x.formula })); });
  spec.ringkasanRows.forEach((rr) => pcells.push({ r: rr.row - 1, c: colIdx(rr.valueCol), v: rr.formula }));
  hf.setSheetContent(hf.getSheetId('practice'), matrixFrom(pcells));
  const sid = hf.getSheetId('practice');
  const rows = spec.practiceRows.map((pr) => {
    const o = {};
    for (const a of spec.answer) o[a.key] = hf.getCellValue({ sheet: sid, col: colIdx(a.letter), row: pr.rowNum - 1 });
    for (const g of spec.given) o['_' + g.key] = hf.getCellValue({ sheet: sid, col: colIdx(g.letter), row: pr.rowNum - 1 });
    return o;
  });
  const sum = spec.ringkasanRows.map((rr) => ({ label: rr.label, value: hf.getCellValue({ sheet: sid, col: colIdx(rr.valueCol), row: rr.row - 1 }) }));
  const errors = [];
  rows.forEach((o, i) => Object.entries(o).forEach(([k, v]) => { if (v && typeof v === 'object' && 'type' in v) errors.push(`baris ${i + 1} ${k}: ${v.type}`); }));
  sum.forEach((s) => { if (s.value && typeof s.value === 'object') errors.push(`ringkasan ${s.label}: ${s.value.type}`); });
  return { rows, sum, errors };
}

/** Spesifikasi dengan baris dataset diganti vektor uji. vec = {status, gaji, tunjTetap, tunjTidak, premi, iuran, bonus}. */
function runVectors(level, vectors) {
  const spec = gen.buildExerciseSpec({ materi: 'penggajian', level, seed: 'vektor-resmi', rowCount: Math.max(5, vectors.length) });
  const H = spec.dataset.headers, idx = (n) => H.indexOf(n);
  const rows = spec.dataset.rows.map((r) => r.slice());
  vectors.forEach((v, i) => {
    const r = rows[i];
    const set = (h, val) => { if (idx(h) >= 0) r[idx(h)] = val; };
    set('Status PTKP', v.status); set('Gaji Pokok', v.gaji); set('Tunjangan Tetap', v.tunjTetap || 0); set('Tunjangan Tidak Tetap', v.tunjTidak || 0);
    set('Premi Asuransi Dibayar Perusahaan', v.premi || 0); set('Iuran JHT+JP Karyawan', v.iuran || 0); set('Bonus/THR Desember', v.bonus || 0);
  });
  const out = evaluate(spec, rows);
  return { spec, out, rows: out.rows.slice(0, vectors.length) };
}

/* ============ B. CONTOH HITUNG RESMI ============ */
section('B. Contoh hitung resmi DJP dijalankan lewat rumus Excel');
{
  // Simulasi persandingan resmi (K/0 → TER A, iuran pensiun Rp100.000/bulan, gaji tetap, tanpa THR/bonus): [bruto, TER, PPh Jan–Nov/bln, Desember, setahun]
  const SIM = [[5250000, 0, 0, 7500, 7500], [5500000, .0025, 13750, -1250, 150000], [5750000, .005, 28750, -23750, 292500], [6000000, .0075, 45000, -60000, 435000],
    [6500000, .01, 65000, 5000, 720000], [7000000, .0125, 87500, 42500, 1005000], [8000000, .015, 120000, 255000, 1575000], [9000000, .0175, 157500, 412500, 2145000], [10000000, .02, 200000, 515000, 2715000]];
  const { out, rows } = runVectors('expert', SIM.map(([b]) => ({ status: 'K/0', gaji: b, iuran: 100000 })));
  check(out.errors.length === 0, 'level Expert: tidak ada error rumus pada vektor resmi' + (out.errors.length ? ' — ' + out.errors.slice(0, 3).join(' | ') : ''));
  SIM.forEach(([b, ter, janNov, des, setahun], i) => {
    const r = rows[i];
    eq(r.bruto, b, `bruto Rp${b.toLocaleString('id-ID')}`);
    eq(r.kategori, 'A', `Rp${b.toLocaleString('id-ID')}: K/0 → TER A`);
    check(Math.abs(r.tarif - ter) < 1e-12, `Rp${b.toLocaleString('id-ID')}: tarif TER ${ter * 100}% (resmi)`);
    eq(r.pphJanNov, janNov * 11, `Rp${b.toLocaleString('id-ID')}: PPh Jan–Nov = ${janNov.toLocaleString('id-ID')} × 11 (resmi)`);
    eq(r.pphSetahun, setahun, `Rp${b.toLocaleString('id-ID')}: PPh setahun Rp${setahun.toLocaleString('id-ID')} (resmi)`);
    eq(r.pphDesember, des, `Rp${b.toLocaleString('id-ID')}: PPh Desember Rp${des.toLocaleString('id-ID')} (resmi${des < 0 ? ', NEGATIF = lebih potong' : ''})`);
  });
  eq(rows[0].pkp, 150000, 'Rp5.250.000: PKP Rp150.000 (63.000.000 − 3.150.000 − 1.200.000 − 58.500.000)');
  eq(rows[8].neto, 112800000, 'Tuan R (Rp10.000.000, K/0): penghasilan neto setahun Rp112.800.000 (resmi)');
  eq([rows[8].pkp, rows[8].ptkp, rows[8].biayaJabatan], [54300000, 58500000, 6000000], 'Tuan R: PKP Rp54.300.000, PTKP Rp58.500.000, biaya jabatan Rp6.000.000 (resmi)');
  const anyNeg = rows.some((r) => r.pphDesember < 0); check(anyNeg, 'vektor resmi memuat hasil Desember negatif — latihan menanganinya (tidak dipotong MAX)');

  // Contoh resmi lain, level Professional (TER bulanan). [label, kasus, tarif, PPh resmi]
  const EX = [
    ['Tuan A Januari: gaji 10jt + tunjangan 20jt + premi JKK/JKM 80rb (K/0)', { status: 'K/0', gaji: 10e6, tunjTetap: 20e6, premi: 80000 }, 'A', .13, 30080000, 3910400],
    ['Tuan F: Rp30.000.000 (K/3)', { status: 'K/3', gaji: 30e6 }, 'C', .11, 30e6, 3300000],
    ['Tuan H: Rp6.800.000 (K/2)', { status: 'K/2', gaji: 6.5e6, tunjTidak: 300000 }, 'B', .005, 6.8e6, 34000],
    ['Tuan B: Rp15.500.000 (TK/0)', { status: 'TK/0', gaji: 15.5e6 }, 'A', .07, 15.5e6, 1085000],
    ['Tuan D: Rp17.500.000 (TK/0)', { status: 'TK/0', gaji: 17.5e6 }, 'A', .08, 17.5e6, 1400000],
    ['Tuan D (PT AB): Rp22.500.000 (TK/0)', { status: 'TK/0', gaji: 22.5e6 }, 'A', .09, 22.5e6, 2025000],
    ['Tuan P: Rp60.000.000 (TK/0)', { status: 'TK/0', gaji: 60e6 }, 'A', .20, 60e6, 12000000],
    ['Tuan N Mei: Rp8.000.000 (TK/0)', { status: 'TK/0', gaji: 8e6 }, 'A', .015, 8e6, 120000],
    ['Tuan N Oktober: Rp9.000.000 (TK/0)', { status: 'TK/0', gaji: 9e6 }, 'A', .0175, 9e6, 157500],
  ];
  const pro = runVectors('professional', EX.map((e) => e[1]));
  check(pro.out.errors.length === 0, 'level Profesional: tidak ada error rumus pada contoh resmi' + (pro.out.errors.length ? ' — ' + pro.out.errors.slice(0, 3).join(' | ') : ''));
  EX.forEach(([label, , kat, ter, bruto, pph], i) => {
    const r = pro.rows[i];
    eq([r.kategori, r.bruto], [kat, bruto], `${label}: kategori & bruto`);
    check(Math.abs(r.tarif - ter) < 1e-12, `${label}: tarif ${ter * 100}%`);
    eq(r.pph21, pph, `${label}: PPh 21 Rp${pph.toLocaleString('id-ID')} (resmi)`);
  });
  const ben = runVectors('beginner', [{ status: 'K/0', gaji: 10e6, tunjTetap: 20e6, premi: 80000 }, { status: 'K/3', gaji: 30e6 }, { status: 'TK/2', gaji: 12e6 }]).rows;
  eq([ben[0].bruto, ben[0].kategori, ben[0].ptkp, ben[0].tunai], [30080000, 'A', 58500000, 30000000], 'Beginner, Tuan A: bruto 30.080.000 (premi termasuk), tunai 30.000.000 (premi tidak tunai)');
  eq([ben[1].kategori, ben[1].ptkp, ben[2].kategori, ben[2].ptkp], ['C', 72000000, 'B', 63000000], 'Beginner: K/3 → C/72jt; TK/2 → B/63jt');
}

/* ============ C. PROPERTI: banyak seed ============ */
section('C. Seed acak: tanpa error & sama dengan implementasi referensi independen');
{
  // referensi independen: TaxEngine SPT + aturan pembulatan resmi (PPh & PKP ke bawah)
  const probe = TE.hitungTarifProgresif(54300000); const probeNum = typeof probe === 'number' ? probe : probe.total ?? probe.pajak ?? probe.pph;
  check(probeNum === 2715000, 'referensi: mesin SPT menghitung tarif progresif PKP 54,3jt = 2.715.000 (resmi) — bentuk hasil: ' + typeof probe);
  const progressive = (pkp) => { const v = TE.hitungTarifProgresif(pkp); return Math.floor(typeof v === 'number' ? v : v.total ?? v.pajak ?? v.pph); };
  const ALLOWED = new Set(['SUM', 'XLOOKUP', 'VLOOKUP', 'IFERROR', 'SUMIFS', 'ROUNDDOWN', 'IF', 'OR', 'LEFT', 'RIGHT', 'VALUE', 'ROUND', 'MIN', 'MAX', 'SUMPRODUCT', 'COUNTIF', 'COUNTA', 'AVERAGE']);
  let mismatches = 0, checked = 0, negDec = 0, zeroTer = 0, kats = { A: 0, B: 0, C: 0 }, layers = new Set(), errs = [];
  const sizes = [5, 12, 25, 40];
  for (let s = 0; s < 40; s++) for (const level of ['beginner', 'professional', 'expert']) {
    const spec = gen.buildExerciseSpec({ materi: 'penggajian', level, seed: `pg-${s}`, rowCount: sizes[s % sizes.length] });
    const fnUsed = new Set(); [...spec.practiceRows.flatMap((p) => p.answer.map((a) => a.formula)), ...spec.ringkasanRows.map((r) => r.formula)].forEach((f) => (f.match(/[A-Z][A-Z0-9.]+(?=\()/g) || []).forEach((n) => fnUsed.add(n)));
    for (const f of fnUsed) if (!ALLOWED.has(f)) errs.push(`fungsi tak terduga ${f}`);
    const { rows, errors } = evaluate(spec);
    errors.forEach((e) => errs.push(`${level} seed ${s}: ${e}`));
    rows.forEach((r, i) => {
      const d = spec.dataset.rows[i], H = spec.dataset.headers, g = (n) => d[H.indexOf(n)] || 0;
      const status = d[H.indexOf('Status PTKP')];
      const bruto = g('Gaji Pokok') + g('Tunjangan Tetap') + g('Tunjangan Tidak Tetap') + g('Premi Asuransi Dibayar Perusahaan');
      const kat = data.KATEGORI_TER[status];
      const rate = TE.hitungTER(bruto, status).tarif;
      checked++;
      const bad = (what, got, exp) => { mismatches++; if (mismatches <= 5) console.log(`   [${level} seed ${s} baris ${i + 1}] ${what}: ${got} ≠ ${exp}`); };
      if (r.bruto !== bruto) bad('bruto', r.bruto, bruto);
      if (r.kategori !== kat) bad('kategori', r.kategori, kat);
      kats[kat]++;
      if (level !== 'beginner') {
        const rateE = Math.abs(r.tarif - rate) > 1e-12; if (rateE) bad('tarif', r.tarif, rate);
        const pph = Math.floor(bruto * rate + 1e-9);
        if (level === 'professional') { if (r.pph21 !== pph) bad('pph21', r.pph21, pph); if (pph === 0) zeroTer++; }
        const bt = data.TER_TABEL[kat].findIndex(([m]) => bruto <= m); layers.add(kat + bt);
      }
      if (level === 'expert') {
        const brutoTahun = bruto * 12 + g('Bonus/THR Desember');
        const biaya = Math.min(0.05 * brutoTahun, 6000000);
        const neto = brutoTahun - biaya - g('Iuran JHT+JP Karyawan') * 12;
        const pkp = Math.max(0, Math.floor((neto - TE.hitungPTKP(status)) / 1000) * 1000);
        const setahun = progressive(pkp);
        const janNov = Math.floor(bruto * rate + 1e-9) * 11;
        if (r.pkp !== pkp) bad('pkp', r.pkp, pkp);
        if (r.pphSetahun !== setahun) bad('pphSetahun', r.pphSetahun, setahun);
        if (r.pphDesember !== setahun - janNov) bad('pphDesember', r.pphDesember, setahun - janNov);
        if (setahun - janNov < 0) negDec++;
      }
    });
  }
  check(errs.length === 0, `tidak ada error rumus (#NAME?/#VALUE!/#DIV/0!) dan hanya fungsi Excel standar di 120 spesifikasi${errs.length ? ' — ' + errs.length + ' masalah, contoh: ' + errs.slice(0, 3).join(' | ') : ''}`);
  eq(mismatches, 0, `${checked} baris karyawan: seluruh hasil rumus = implementasi referensi (TaxEngine SPT + pembulatan resmi)`);
  check(kats.A > 20 && kats.B > 20 && kats.C > 0, `dataset menjangkau kategori A/B/C (${JSON.stringify(kats)})`);
  check(layers.size >= 25, `dataset menjangkau banyak lapisan TER berbeda (${layers.size})`);
  console.log(`  info: ${negDec} hasil Desember negatif dari baris Expert (wajar; lihat penjelasan di soal), ${zeroTer} baris TER 0%`);
  // determinisme & batas
  const a = gen.buildExerciseSpec({ materi: 'penggajian', level: 'expert', seed: 'sama', rowCount: 10 }), b = gen.buildExerciseSpec({ materi: 'penggajian', level: 'expert', seed: 'sama', rowCount: 10 });
  eq(a.dataset.rows, b.dataset.rows, 'seed sama → dataset identik');
  check(JSON.stringify(a.dataset.rows) !== JSON.stringify(gen.buildExerciseSpec({ materi: 'penggajian', level: 'expert', seed: 'lain', rowCount: 10 }).dataset.rows), 'seed lain → dataset berbeda');
  check(a.dataset.rows.every((r) => r.every((v) => v !== undefined && v !== null && !Number.isNaN(v))), 'dataset tanpa nilai kosong/NaN');
  const ex = a.dataset.rows.map((r) => r[a.dataset.headers.indexOf('Gaji Pokok')]); check(ex.every((v) => v >= 4500000 && v <= 75000000 && v % 50000 === 0), 'gaji pokok wajar (Rp4,5jt–75jt, kelipatan 50rb)');
}

/* ============ D. REGISTRASI & CATATAN TEMPORAL ============ */
section('D. Registrasi materi & catatan regulasi');
{
  check(gen.MATERI_LIST.includes('penggajian'), 'materi "penggajian" ada di MATERI_LIST');
  check(Object.keys(dgen.EXERCISE_MATERI_GENERATORS).includes('penggajian'), 'generator dataset terdaftar');
  check(/value="penggajian"/.test(readFileSync(join(ROOT, 'apps/excel/index.html'), 'utf8')), 'opsi materi tampil di antarmuka Excel');
  const combos = gen.allCombinations(); check(combos.filter((c) => c.materi === 'penggajian').length === 3, 'tiga level tersedia untuk materi penggajian');
  const d = dgen.EXERCISE_MATERI_GENERATORS.penggajian.generate({ count: 5, seed: 1 });
  check(d.meta.masterTables.length === 3 && d.meta.masterTable === d.meta.masterTables[0], 'meta.masterTables (3 tabel) + masterTable (kompatibel dengan ekspor dataset lama)');
  // kontrak kurikulum per level (sama dengan apps/excel/tests/test-exercise-generator.mjs)
  const fx = (lvl) => gen.buildExerciseSpec({ materi: 'penggajian', level: lvl, seed: 'kontrak', rowCount: 6 });
  const fm = (spec) => spec.practiceRows[0].answer.map((a) => a.formula).join(' ');
  check(!/VLOOKUP|XLOOKUP|HLOOKUP|INDEX\(/.test(fm(fx('beginner'))) && fx('beginner').datasetMasterRanges.length === 0, 'Beginner: tanpa lookup dan tanpa tabel master');
  check(/VLOOKUP/.test(fm(fx('professional'))) && fx('professional').datasetMasterRanges.length >= 1, 'Profesional: VLOOKUP + tabel master');
  check(/XLOOKUP/.test(fm(fx('expert'))) && /IFERROR/.test(fm(fx('expert'))) && fx('expert').datasetMasterRanges.length === 3, 'Expert: XLOOKUP + IFERROR + tiga tabel master');
  const header = readFileSync(join(ROOT, 'apps/excel/data/payroll-ter.js'), 'utf8');
  check(/PMK 168\/2023/.test(header) && /PP 58\/2023/.test(header) && /PMK 101\/2016/.test(header) && /UU HPP/.test(header), 'file data mencantumkan dasar hukum');
  check(/penyesuaian PTKP/i.test(header) && /2027/.test(header), 'file data mencatat rencana penyesuaian PTKP (belum berlaku) agar tidak dipakai buta setelah aturan baru terbit');
  const reg = JSON.parse(readFileSync(join(ROOT, 'scripts/regulasi-terpantau.json'), 'utf8'));
  const txt = JSON.stringify(reg); check(/PMK-168|PMK 168|168\/2023/i.test(txt), 'regulasi-terpantau.json memantau PMK 168/2023');
}

console.log(`\n========== test-payroll-ter: ${passed} lolos, ${failed} gagal ==========`);
process.exit(failed ? 1 : 0);
