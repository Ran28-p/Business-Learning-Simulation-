#!/usr/bin/env node
// Lint generik untuk SEMUA modul (apps/*), bukan cuma apps/excel.
// Tidak butuh dependency apapun (cuma built-in Node) supaya job ini cepat
// dan tidak perlu npm install. Tiga pengecekan:
//   1. Syntax semua file .js/.mjs   (node --check)
//   2. Validitas semua file .json   (JSON.parse)
//   3. Link src="…"/href="…" statis di HTML yang menunjuk ke file lokal
//      tapi filenya tidak ada (skip URL eksternal, dan skip apapun di
//      dalam <script>…</script> karena itu template literal JS, bukan
//      markup statis)
//
// Exit code != 0 kalau ada error → job "lint" gagal → job "deploy" di-skip.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules']);

let errorCount = 0;
const log = (msg) => console.log(msg);
const fail = (msg) => { errorCount++; console.log(`::error::${msg}`); };

function walk(dir, onFile) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, onFile);
    else onFile(full);
  }
}

// ---------- 1. Syntax JS/MJS ----------
log('== Cek syntax .js / .mjs ==');
let jsChecked = 0;
walk(ROOT, (file) => {
  if (!/\.(js|mjs)$/.test(file)) return;
  jsChecked++;
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    fail(`Syntax error di ${relative(ROOT, file)}:\n${err.stderr?.toString() || err.message}`);
  }
});
log(`  ${jsChecked} file .js/.mjs dicek.`);

// ---------- 2. Validitas JSON ----------
log('== Cek validitas .json ==');
let jsonChecked = 0;
walk(ROOT, (file) => {
  if (!/\.json$/.test(file)) return;
  jsonChecked++;
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`JSON tidak valid di ${relative(ROOT, file)}: ${err.message}`);
  }
});
log(`  ${jsonChecked} file .json dicek.`);

// ---------- 3. Link src/href statis di HTML ----------
log('== Cek link src=/href= statis di .html ==');
const REF_RE = /\b(?:src|href)\s*=\s*(["'])([^"']+)\1/gi;
let htmlChecked = 0;
let refsChecked = 0;
walk(ROOT, (file) => {
  if (!/\.html?$/.test(file)) return;
  htmlChecked++;
  let content = readFileSync(file, 'utf8');
  // Buang ISI <script>…</script> (tapi simpan tag pembuka/tutupnya supaya
  // atribut src="" di tag <script src="…"> sendiri tetap ikut dicek),
  // supaya template literal JS (mis. `${item.url}`) tidak ikut ke-scan.
  content = content.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, '$1$3');

  const base = dirname(file);
  let m;
  while ((m = REF_RE.exec(content)) !== null) {
    const ref = m[2];
    if (/^(https?:)?\/\//.test(ref)) continue;      // eksternal / protocol-relative
    if (/^(data|mailto|tel|javascript):/.test(ref)) continue;
    if (ref.startsWith('#')) continue;               // anchor di halaman sama
    if (ref.includes('${') || ref.includes('{{')) continue; // template literal lolos filter script — jaga-jaga
    const cleanRef = ref.split('?')[0].split('#')[0];
    if (!cleanRef) continue;
    refsChecked++;
    const target = join(base, cleanRef);
    if (!existsSync(target)) {
      fail(`Link patah di ${relative(ROOT, file)} -> "${ref}" (file tidak ditemukan: ${relative(ROOT, target)})`);
    }
  }
});
log(`  ${htmlChecked} file .html dicek, ${refsChecked} link lokal diverifikasi.`);

// ---------- 4. Konsistensi tarif PPN lintas-app ----------
// apps/spt (classic script) dan apps/accounting (ES module) TIDAK bisa saling
// import file konstanta yang sama (beda sistem modul), jadi tarif PPN yang
// "sama-sama harusnya 11% efektif (DPP Nilai Lain, PMK 131/2024)" berisiko
// diam-diam ngaco satu sama lain kalau salah satu diubah tanpa yang lain ikut
// diperbarui. Cek ini membandingkan angkanya lewat regex, bukan lewat import
// runtime — cukup untuk menangkap drift tanpa perlu menyatukan sistem modul
// kedua app tersebut.
log('== Cek konsistensi tarif PPN lintas-app (apps/spt vs apps/accounting) ==');
{
  const sptFile = join(ROOT, 'apps/spt/faktur_bupot/script.js');
  const accFile = join(ROOT, 'apps/accounting/js/tax/taxConstants.js');

  const sptSrc = existsSync(sptFile) ? readFileSync(sptFile, 'utf8') : null;
  const accSrc = existsSync(accFile) ? readFileSync(accFile, 'utf8') : null;

  if (!sptSrc) {
    fail(`Tidak menemukan ${relative(ROOT, sptFile)} — cek konsistensi tarif PPN dilewati/gagal.`);
  } else if (!accSrc) {
    fail(`Tidak menemukan ${relative(ROOT, accFile)} — cek konsistensi tarif PPN dilewati/gagal.`);
  } else {
    // apps/spt: rumus DPP Nilai Lain "ppn = dpp * <nominal> * <pembilang> / <penyebut> / 100"
    const sptMatch = sptSrc.match(/ppn\s*=\s*dpp\s*\*\s*(\d+)\s*\*\s*(\d+)\s*\/\s*(\d+)\s*\/\s*100/);
    // apps/accounting: "export const DEFAULT_VAT_RATE_PERCENT = <angka>;"
    const accMatch = accSrc.match(/export\s+const\s+DEFAULT_VAT_RATE_PERCENT\s*=\s*(\d+(?:\.\d+)?)\s*;/);

    if (!sptMatch) {
      fail(`Rumus DPP Nilai Lain tidak ditemukan/berubah bentuk di ${relative(ROOT, sptFile)} — perbarui regex cek ini kalau rumusnya memang sengaja diubah.`);
    } else if (!accMatch) {
      fail(`DEFAULT_VAT_RATE_PERCENT tidak ditemukan/berubah bentuk di ${relative(ROOT, accFile)} — perbarui regex cek ini kalau memang sengaja diubah.`);
    } else {
      const sptEffectiveRate = (Number(sptMatch[1]) * Number(sptMatch[2])) / Number(sptMatch[3]);
      const accRate = Number(accMatch[1]);
      if (Math.abs(sptEffectiveRate - accRate) > 0.001) {
        fail(
          `Tarif PPN efektif tidak sinkron: apps/spt/faktur_bupot (DPP Nilai Lain) = ${sptEffectiveRate}%, ` +
          `apps/accounting DEFAULT_VAT_RATE_PERCENT = ${accRate}%. Kalau salah satu memang sengaja diubah ` +
          `(mis. tarif PPN resmi berubah lagi), perbarui yang satunya juga supaya kedua app tetap mengajarkan ` +
          `angka yang sama.`
        );
      } else {
        log(`  Sinkron: kedua app memakai tarif PPN efektif ${accRate}%.`);
      }
    }
  }
}

// ---------- Ringkasan ----------
log('');
if (errorCount > 0) {
  console.log(`❌ Lint gagal: ${errorCount} error ditemukan.`);
  process.exit(1);
} else {
  console.log('✅ Lint lulus: semua file .js/.mjs valid, semua .json valid, tidak ada link lokal yang patah.');
}
