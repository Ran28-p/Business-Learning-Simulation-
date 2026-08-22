/**
 * storage-manager.js
 * ---------------------------------------------------------------------------
 * Satu-satunya modul yang boleh menyentuh window.localStorage secara langsung.
 * Modul lain (progress-manager.js, dll.) wajib lewat sini agar penanganan
 * error (localStorage penuh/disabled) terpusat di satu tempat.
 * ---------------------------------------------------------------------------
 */

const NAMESPACE = 'efpg'; // Excel Formula Practice Generator

function nsKey(key) {
  return `${NAMESPACE}:${key}`;
}

/** Cek apakah localStorage tersedia & bisa ditulis (mode privat browser tertentu bisa memblokirnya). */
export function isStorageAvailable() {
  try {
    const testKey = nsKey('__test__');
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Ambil nilai tersimpan (otomatis di-parse dari JSON).
 * @param {string} key
 * @param {*} fallback - nilai default jika key tidak ada / gagal parse
 */
export function loadJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(nsKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[storage-manager] Gagal membaca "${key}":`, err);
    return fallback;
  }
}

/**
 * Simpan nilai (otomatis di-serialize ke JSON).
 * @returns {boolean} true jika berhasil disimpan
 */
export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(nsKey(key), JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[storage-manager] Gagal menyimpan "${key}":`, err);
    return false;
  }
}

/** Hapus satu key tersimpan. */
export function removeKey(key) {
  try {
    window.localStorage.removeItem(nsKey(key));
    return true;
  } catch (err) {
    console.error(`[storage-manager] Gagal menghapus "${key}":`, err);
    return false;
  }
}

/** Hapus SEMUA data aplikasi ini (dipakai tombol reset progres). */
export function clearAllAppData() {
  try {
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(`${NAMESPACE}:`)) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
    return true;
  } catch (err) {
    console.error('[storage-manager] Gagal membersihkan data aplikasi:', err);
    return false;
  }
}
