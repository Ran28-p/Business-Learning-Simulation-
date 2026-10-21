/**
 * spreadsheet/dates.js — konversi serial tanggal Excel dan DATEDIF
 * (dipecah dari ../spreadsheet-engine.js; perilaku identik)
 */

// ============================================================================
// Konversi tanggal <-> "serial number" bergaya Excel
// ---------------------------------------------------------------------------
// Sama seperti Excel asli, tanggal di mesin ini disimpan sebagai ANGKA (jumlah
// hari sejak epoch), bukan string. Ini penting agar fungsi tanggal (YEAR,
// MONTH, DATEDIF, dst.) bekerja pada nilai apa pun yang ada di sel — sama
// seperti Excel asli yang tidak peduli "format tampilan" sel saat menghitung.
// Format tampilan (DD/MM/YYYY) murni urusan lapisan UI (app.js), bukan mesin ini.
// ============================================================================

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

const MS_PER_DAY = 86400000;

/** Ubah objek Date menjadi serial number bergaya Excel (berbasis UTC agar konsisten lintas zona waktu). */
export function dateToSerial(date) {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utcMidnight - EXCEL_EPOCH_MS) / MS_PER_DAY);
}

/** Ubah serial number bergaya Excel kembali menjadi objek Date (UTC). */
export function serialToDate(serial) {
  return new Date(EXCEL_EPOCH_MS + serial * MS_PER_DAY);
}

/** Selisih DATEDIF antara dua serial tanggal, unit "Y" (tahun penuh), "M" (bulan penuh), atau "D" (hari). */
export function computeDatedif(startSerial, endSerial, unit) {
  if (unit === 'D') return endSerial - startSerial;
  const start = serialToDate(startSerial);
  const end = serialToDate(endSerial);
  if (unit === 'M') {
    let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
    if (end.getUTCDate() < start.getUTCDate()) months -= 1;
    return months;
  }
  if (unit === 'Y') {
    let years = end.getUTCFullYear() - start.getUTCFullYear();
    const beforeAnniversary =
      end.getUTCMonth() < start.getUTCMonth() ||
      (end.getUTCMonth() === start.getUTCMonth() && end.getUTCDate() < start.getUTCDate());
    if (beforeAnniversary) years -= 1;
    return years;
  }
  return null;
}
