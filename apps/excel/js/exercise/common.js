/**
 * exercise/common.js
 * ---------------------------------------------------------------------------
 * Konstanta layout & helper yang dipakai bersama oleh semua materi pada
 * ../exercise-generator.js (dipecah dari file tsb tanpa perubahan perilaku).
 * ---------------------------------------------------------------------------
 */

// --- posisi baris tetap, meniru pola file contoh -----------------------
export const ROW_TITLE = 2;
export const ROW_NUMBERING = 6;
export const ROW_HEADER = 7;
export const ROW_CONTOH = 8;
export const ROW_DATA_START = 10;

export const DATASET_ROW_HEADER = 6;
export const DATASET_ROW_DATA_START = 7;

/**
 * Pilih `count` item ACAK (tanpa duplikat, urutan diacak) dari `pool` —
 * dipakai supaya "kolom ekstra" mana yang tampil di Lembar latihan BEDA
 * setiap kali di-generate (lihat permintaan produk: "supaya setiap generate
 * kita dapet isi yang berbeda"), tapi tetap REPRODUCIBLE untuk seed yang
 * sama (Fisher-Yates pakai rng yang di-seed, bukan Math.random()).
 */
export function pickPoolItems(rng, pool, count) {
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Bangun formula LET yang BENAR secara OOXML. Percobaan pertama LET di
 * versi sebelumnya ditolak Excel asli ("we found a problem...") karena
 * hanya nama FUNGSI-nya (LET) yang diberi awalan _xlfn., padahal setiap
 * nama VARIABEL di dalam LET (baik saat dideklarasikan maupun dipakai)
 * JUGA WAJIB diberi awalan _xlpm. — detail OOXML yang gampang kelewat
 * karena tidak muncul sama sekali kalau cuma dites di LibreOffice (yang
 * bahkan tidak mengenal LET sama sekali, jadi tidak pernah bisa
 * mengonfirmasi detail ini). Lihat _xlfn.LET(_xlpm.SALES,...) di
 * https://groups.google.com/g/openpyxl-users/c/O746AjGV9EY untuk kasus
 * serupa yang sudah dikonfirmasi.
 *
 * @param {Array<[string, string]>} pairs - pasangan [namaVariabel, templateEkspresi].
 *   templateEkspresi boleh mereferensikan variabel yang dideklarasikan
 *   SEBELUMNYA lewat placeholder {{namaVariabel}}.
 * @param {string} finalExprTemplate - ekspresi akhir, juga boleh pakai {{namaVariabel}}.
 * @returns {string} teks formula LENGKAP dengan "=" di depan, TANPA awalan
 *   _xlfn. (itu ditambahkan otomatis oleh applyCompatPrefixes di writer).
 */
export function buildLetFormula(pairs, finalExprTemplate) {
  const declared = [];
  const applyPrefixes = (template) => {
    let out = template;
    declared.forEach((n) => { out = out.split(`{{${n}}}`).join(`_xlpm.${n}`); });
    return out;
  };
  const args = [];
  pairs.forEach(([name, exprTemplate]) => {
    args.push(`_xlpm.${name}`, applyPrefixes(exprTemplate));
    declared.push(name);
  });
  args.push(applyPrefixes(finalExprTemplate));
  return `=LET(${args.join(',')})`;
}

/** Ubah index kolom 1-based (1=A, 2=B, ...) menjadi huruf kolom Excel. */
export function colLetter(index) {
  let n = index;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const CUR = '_-[$Rp-3809]* #,##0_-;\\-[$Rp-3809]* #,##0_-;_-[$Rp-3809]* "-"??_-;_-@_-';
export const ACC = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
export const NUM = '#,##0';
export const DATE = 'yyyy-mm-dd';

/**
 * Alokasikan huruf kolom berurutan untuk daftar definisi kolom.
 * @param {Array} defs
 * @param {number} [afterColIndex] - jika diisi, mulai SETELAH kolom index ini
 *   (dipakai untuk menyambung kolom "answer" persis setelah kolom "given"
 *   terakhir, supaya tidak pernah tabrakan huruf kolom). Default: mulai dari B.
 */
export function assignColumns(defs, afterColIndex) {
  let col = afterColIndex ? afterColIndex + 1 : 2; // B secara default
  return defs.map((d) => {
    const out = { ...d, colIndex: col, letter: colLetter(col) };
    col += 1;
    return out;
  });
}
