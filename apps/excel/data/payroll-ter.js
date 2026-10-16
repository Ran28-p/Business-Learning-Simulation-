/**
 * payroll-ter.js — Data acuan latihan "Penggajian & PPh 21 (TER)". DIBANGKITKAN oleh scripts/gen-excel-payroll-data.mjs
 * dari apps/spt/js/shared/tax-engine.js (sumber tunggal tabel TER). JANGAN diedit manual; tests/test-payroll-ter.mjs
 * memastikan isinya identik dengan mesin SPT dan cocok dengan titik-titik acuan dari sumber publik.
 *
 * Dasar hukum (diverifikasi terhadap ringkasan resmi/pakar publik pada 12 Okt 2026):
 *   • PP 58/2023 dan PMK 168/2023 — pemotongan PPh 21 dengan Tarif Efektif Rata-rata (TER) bulanan; Desember
 *     (masa pajak terakhir) dihitung dengan tarif Pasal 17 atas penghasilan setahun, dikurangi PPh Jan–Nov.
 *   • UU HPP (tarif Pasal 17 ayat (1) huruf a) — lima lapisan 5% / 15% / 25% / 30% / 35%.
 *   • PMK 101/2016 — PTKP (TK/0 Rp54.000.000; +Rp4.500.000 untuk status kawin dan tiap tanggungan, maksimal 3).
 *     CATATAN: per 11 Okt 2026 pemerintah baru MEMBICARAKAN penyesuaian PTKP (rencana 2027, besaran belum ditetapkan).
 *     Bila aturan baru terbit, ubah PTKP di tax-engine.js lalu jalankan ulang scripts/gen-excel-payroll-data.mjs.
 *   • Biaya jabatan 5% dari penghasilan bruto, maksimal Rp500.000/bulan (Rp6.000.000/tahun) — PMK 168/2023.
 *   • PKP dibulatkan ke bawah hingga ribuan rupiah penuh; jumlah PPh dibulatkan ke bawah ke rupiah penuh.
 */

/** Lapisan terakhir tabel TER bersifat "tanpa batas": diganti angka sangat besar agar bisa dipakai di rumus Excel. */
export const BATAS_TERBUKA = 999999999999;

/** Kategori TER menurut PTKP: A = TK/0, TK/1, K/0 · B = TK/2, TK/3, K/1, K/2 · C = K/3. */
export const KATEGORI_TER = { 'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A', 'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B', 'K/3': 'C' };

/** PTKP setahun per status (PMK 101/2016). */
export const PTKP_SETAHUN = { 'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000, 'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000 };

/** Tarif Pasal 17 ayat (1) huruf a UU PPh (UU HPP): [batas atas PKP setahun, tarif]. */
export const PASAL17 = [[60000000, 0.05], [250000000, 0.15], [500000000, 0.25], [5000000000, 0.30], [999999999999, 0.35]];

/** Biaya jabatan: 5% dari bruto, maksimal Rp6.000.000 setahun (Rp500.000 sebulan). */
export const BIAYA_JABATAN = { tarif: 0.05, maksSetahun: 6000000 };

/** Tabel TER bulanan — tiap baris: [batas atas penghasilan bruto sebulan, tarif]. Batas bawah = batas atas baris sebelumnya + 1. */
export const TER_TABEL = {
  A: [
    [5400000, 0], [5650000, 0.0025], [5950000, 0.005], [6300000, 0.0075],
    [6750000, 0.01], [7500000, 0.0125], [8550000, 0.015], [9650000, 0.0175],
    [10050000, 0.02], [10350000, 0.0225], [10700000, 0.025], [11050000, 0.03],
    [11600000, 0.035], [12500000, 0.04], [13750000, 0.05], [15100000, 0.06],
    [16950000, 0.07], [19750000, 0.08], [24150000, 0.09], [26450000, 0.1],
    [28000000, 0.11], [30050000, 0.12], [32400000, 0.13], [35400000, 0.14],
    [39100000, 0.15], [43850000, 0.16], [47800000, 0.17], [51400000, 0.18],
    [56300000, 0.19], [62200000, 0.2], [68600000, 0.21], [77500000, 0.22],
    [89000000, 0.23], [103000000, 0.24], [125000000, 0.25], [157000000, 0.26],
    [206000000, 0.27], [337000000, 0.28], [454000000, 0.29], [550000000, 0.3],
    [695000000, 0.31], [910000000, 0.32], [1400000000, 0.33], [999999999999, 0.34]
  ],
  B: [
    [6200000, 0], [6500000, 0.0025], [6850000, 0.005], [7300000, 0.0075],
    [9200000, 0.01], [10750000, 0.015], [11250000, 0.02], [11600000, 0.025],
    [12600000, 0.03], [13600000, 0.04], [14950000, 0.05], [16400000, 0.06],
    [18450000, 0.07], [21850000, 0.08], [26000000, 0.09], [27700000, 0.1],
    [29350000, 0.11], [31450000, 0.12], [33950000, 0.13], [37100000, 0.14],
    [41100000, 0.15], [45800000, 0.16], [49500000, 0.17], [53800000, 0.18],
    [58500000, 0.19], [64000000, 0.2], [71000000, 0.21], [80000000, 0.22],
    [93000000, 0.23], [109000000, 0.24], [129000000, 0.25], [163000000, 0.26],
    [211000000, 0.27], [374000000, 0.28], [459000000, 0.29], [555000000, 0.3],
    [704000000, 0.31], [957000000, 0.32], [1405000000, 0.33], [999999999999, 0.34]
  ],
  C: [
    [6600000, 0], [6950000, 0.0025], [7350000, 0.005], [7800000, 0.0075],
    [8850000, 0.01], [9800000, 0.0125], [10950000, 0.015], [11200000, 0.0175],
    [12050000, 0.02], [12950000, 0.03], [14150000, 0.04], [15550000, 0.05],
    [17050000, 0.06], [19500000, 0.07], [22700000, 0.08], [26600000, 0.09],
    [28100000, 0.1], [30100000, 0.11], [32600000, 0.12], [35400000, 0.13],
    [38900000, 0.14], [43000000, 0.15], [47400000, 0.16], [51200000, 0.17],
    [55800000, 0.18], [60400000, 0.19], [66700000, 0.2], [74500000, 0.21],
    [83200000, 0.22], [95600000, 0.23], [110000000, 0.24], [134000000, 0.25],
    [169000000, 0.26], [221000000, 0.27], [390000000, 0.28], [463000000, 0.29],
    [561000000, 0.3], [709000000, 0.31], [965000000, 0.32], [1419000000, 0.33],
    [999999999999, 0.34]
  ],
};
