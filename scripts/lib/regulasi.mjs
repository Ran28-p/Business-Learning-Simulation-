// Fungsi murni untuk pemeliharaan materi (Fase 5): ekstraksi rujukan regulasi, validasi daftar,
// dan perhitungan umur. Dipakai scripts/check-staleness.mjs dan tests/test-regulasi.mjs.

export const STATUS = ['berlaku', 'diubah', 'historis', 'dicabut'];
export const VERIFIKASI = ['teks-resmi', 'sumber-sekunder', 'pengetahuan-umum'];
const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

// Pola rujukan yang dikenali di teks materi/soal.
const PATTERNS = [
  /PMK[ -]?\d{1,3}\/PMK\.\d+\/\d{4}/g,
  /PMK[ -]?\d{1,3}\/\d{4}/g,
  /PP[ ]?\d{1,3}\/\d{4}/g,
  /UU[ ]\d{1,2}\/\d{4}/g,
  /SE-\d+\/PJ(?:\.\d+)?\/\d{4}/g,
  /PSAK[ ]\d{1,3}/g,
];

export function normalize(ref) {
  return String(ref).replace(/^PMK-/, 'PMK ').replace(/\s+/g, ' ').trim();
}

/** Ambil semua rujukan regulasi unik dari teks (urutan kemunculan). */
export function extractRefs(text) {
  const found = new Set();
  const t = String(text || '');
  for (const re of PATTERNS) for (const m of t.matchAll(new RegExp(re.source, 'g'))) found.add(normalize(m[0]));
  return [...found];
}

/** Buat indeks id/alias -> entri. */
export function buildIndex(registry) {
  const idx = new Map();
  for (const e of registry) {
    idx.set(normalize(e.id), e);
    for (const a of e.alias || []) idx.set(normalize(a), e);
  }
  return idx;
}

export function ymToMonths(ym) {
  const m = YM.exec(String(ym || ''));
  return m ? +m[1] * 12 + (+m[2] - 1) : null;
}
export function nowMonths(now = new Date()) { return now.getUTCFullYear() * 12 + now.getUTCMonth(); }
export function ageMonths(ym, now = new Date()) { const v = ymToMonths(ym); return v === null ? null : nowMonths(now) - v; }

/** Validasi struktur daftar regulasi. Mengembalikan {errors, warnings}. */
export function validateRegistry(registry, now = new Date()) {
  const errors = [], warnings = [], ids = new Set();
  if (!Array.isArray(registry) || !registry.length) return { errors: ['regulasi kosong'], warnings };
  for (const e of registry) {
    const w = `regulasi "${e && e.id}"`;
    if (!e || !e.id || typeof e.id !== 'string') { errors.push('entri tanpa id'); continue; }
    const key = normalize(e.id);
    if (ids.has(key)) errors.push(`${w}: id duplikat`); ids.add(key);
    if (!e.judul || e.judul.length < 8) errors.push(`${w}: judul wajib`);
    if (!STATUS.includes(e.status)) errors.push(`${w}: status harus salah satu ${STATUS.join('/')}`);
    if (!VERIFIKASI.includes(e.verifikasi)) errors.push(`${w}: verifikasi harus salah satu ${VERIFIKASI.join('/')}`);
    if (!Array.isArray(e.topik) || !e.topik.length) errors.push(`${w}: topik wajib (modul yang memakainya)`);
    const age = ageMonths(e.terakhirDicek, now);
    if (age === null) errors.push(`${w}: terakhirDicek harus 'YYYY-MM'`);
    else if (age < 0) errors.push(`${w}: terakhirDicek di masa depan`);
    if ((e.status === 'historis' || e.status === 'dicabut') && !e.digantiOleh) warnings.push(`${w}: status ${e.status} sebaiknya punya digantiOleh`);
    if (e.url !== undefined && !/^https:\/\/[^\s"'<>]+$/i.test(e.url)) errors.push(`${w}: url harus https://`);
    if (e.alias !== undefined && !Array.isArray(e.alias)) errors.push(`${w}: alias harus array`);
  }
  for (const e of registry) if (e.digantiOleh && !ids.has(normalize(e.digantiOleh))) errors.push(`regulasi "${e.id}": digantiOleh "${e.digantiOleh}" tidak ada di daftar`);
  return { errors, warnings };
}
