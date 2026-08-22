/**
 * formula-library.js
 * ---------------------------------------------------------------------------
 * Membaca & menyediakan akses ke data/formula-catalog.json.
 * Catatan: fetch() terhadap file lokal butuh dijalankan lewat server HTTP
 * sederhana (lihat README) — tidak bisa dibuka langsung via file:// karena
 * pembatasan CORS bawaan browser terhadap fetch file lokal.
 * ---------------------------------------------------------------------------
 */

let cachedCatalog = null;

/** Muat (dan cache) seluruh katalog rumus dari data/formula-catalog.json. */
export async function loadFormulaCatalog() {
  if (cachedCatalog) return cachedCatalog;
  try {
    const res = await fetch('./data/formula-catalog.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    cachedCatalog = json.formulas || [];
    return cachedCatalog;
  } catch (err) {
    console.error('[formula-library] Gagal memuat katalog rumus:', err);
    cachedCatalog = [];
    return cachedCatalog;
  }
}

/** Cari satu entri rumus berdasarkan id (mis. "sum"). */
export async function getFormulaById(id) {
  const catalog = await loadFormulaCatalog();
  return catalog.find((f) => f.id === id) || null;
}

/** Cari entri rumus berdasarkan nama fungsi (mis. "SUM"), tidak case-sensitive. */
export async function getFormulaByName(name) {
  const catalog = await loadFormulaCatalog();
  const upper = (name || '').toUpperCase();
  return catalog.find((f) => f.name.toUpperCase() === upper) || null;
}

/** Ambil semua rumus untuk level tertentu. */
export async function getFormulasByLevel(level) {
  const catalog = await loadFormulaCatalog();
  return catalog.filter((f) => f.level === level);
}
