/**
 * progress-manager.js
 * ---------------------------------------------------------------------------
 * Mengelola statistik belajar (XP, jumlah soal, badge, riwayat) di atas
 * storage-manager.js. Tahap 1 hanya mendaftarkan badge yang benar-benar
 * bisa dicapai dengan fitur yang sudah ada (Level 1 / dataset Penjualan),
 * supaya tidak ada badge "palsu" yang tidak pernah bisa didapat pengguna.
 * Badge untuk Level 2-6 akan ditambahkan begitu level tersebut aktif.
 * ---------------------------------------------------------------------------
 */

import { loadJSON, saveJSON, clearAllAppData } from './storage-manager.js';

const PROGRESS_KEY = 'progress';

const AGGREGATE_FUNCTIONS_FOR_BADGE = new Set(['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT']);
const LOGIC_FUNCTIONS = new Set(['IF', 'AND', 'OR', 'NOT', 'COUNTIF', 'SUMIF']);

const BADGE_DEFINITIONS = [
  {
    id: 'excel_beginner',
    name: 'Excel Beginner',
    description: 'Menyelesaikan soal pertama dengan benar.',
    check: (stats) => stats.jawabanBenar >= 1,
  },
  {
    id: 'sum_master',
    name: 'SUM Master',
    description: 'Menjawab benar 5 soal yang menggunakan fungsi agregasi dasar (SUM/AVERAGE/MIN/MAX/COUNT).',
    check: (stats) =>
      Object.entries(stats.rumusDipelajari)
        .filter(([fn]) => AGGREGATE_FUNCTIONS_FOR_BADGE.has(fn))
        .reduce((sum, [, f]) => sum + f.benar, 0) >= 5,
  },
  {
    id: 'formula_explorer',
    name: 'Formula Explorer',
    description: 'Menjawab benar minimal satu soal pada 5 fungsi rumus yang berbeda.',
    check: (stats) => Object.values(stats.rumusDipelajari).filter((f) => f.benar >= 1).length >= 5,
  },
  {
    id: 'logic_expert',
    name: 'Logic Expert',
    description: 'Menjawab benar 5 soal yang menggunakan IF, AND, OR, NOT, COUNTIF, atau SUMIF.',
    check: (stats) =>
      Object.entries(stats.rumusDipelajari)
        .filter(([fn]) => LOGIC_FUNCTIONS.has(fn))
        .reduce((sum, [, f]) => sum + f.benar, 0) >= 5,
  },
];

function defaultStats() {
  return {
    soalDikerjakan: 0,
    jawabanBenar: 0,
    jawabanSalah: 0,
    xp: 0,
    levelAktif: 1,
    badges: [], // array id badge yang sudah didapat
    rumusDipelajari: {}, // { SUM: {dikerjakan, benar}, ... }
    riwayat: [], // { waktu, soalTitle, fungsi, status, xp }
  };
}

/** Muat statistik progres dari penyimpanan (atau buat baru jika belum ada). */
export function getStats() {
  return loadJSON(PROGRESS_KEY, defaultStats());
}

function persist(stats) {
  return saveJSON(PROGRESS_KEY, stats);
}

/**
 * Catat satu percobaan menjawab soal, hitung XP, perbarui statistik per-fungsi,
 * dan cek apakah ada badge baru yang terbuka.
 * @param {Object} params
 * @param {Object} params.question - soal yang dijawab
 * @param {'correct'|'incorrect'} params.status
 * @param {number} params.hintsUsed - jumlah tingkat petunjuk yang dibuka (0-3)
 * @returns {{stats: Object, xpGained: number, newBadges: Object[]}}
 */
export function recordAttempt({ question, status, hintsUsed = 0 }) {
  const stats = getStats();
  stats.soalDikerjakan += 1;

  let xpGained = 0;
  const fnName = (question.acceptedFunctions && question.acceptedFunctions[0]) || 'UNKNOWN';
  if (!stats.rumusDipelajari[fnName]) {
    stats.rumusDipelajari[fnName] = { dikerjakan: 0, benar: 0 };
  }
  stats.rumusDipelajari[fnName].dikerjakan += 1;

  if (status === 'correct') {
    stats.jawabanBenar += 1;
    stats.rumusDipelajari[fnName].benar += 1;
    // XP penuh tanpa bantuan, berkurang 30% per tingkat petunjuk yang dipakai
    const basePoints = question.points || 10;
    const penalty = Math.min(hintsUsed, 3) * 0.3;
    xpGained = Math.round(basePoints * Math.max(0.1, 1 - penalty));
    stats.xp += xpGained;
  } else {
    stats.jawabanSalah += 1;
  }

  stats.riwayat.unshift({
    waktu: new Date().toISOString(),
    soalTitle: question.title,
    fungsi: fnName,
    status,
    xp: xpGained,
  });
  stats.riwayat = stats.riwayat.slice(0, 50); // batasi riwayat agar localStorage tidak membengkak

  const newBadges = [];
  for (const badge of BADGE_DEFINITIONS) {
    if (!stats.badges.includes(badge.id) && badge.check(stats)) {
      stats.badges.push(badge.id);
      newBadges.push(badge);
    }
  }

  const saved = persist(stats);
  return { stats, xpGained, newBadges, saved };
}

/** Daftar definisi badge (untuk ditampilkan di dashboard, termasuk yang belum didapat). */
export function getBadgeDefinitions() {
  return BADGE_DEFINITIONS;
}

/** Reset seluruh progres (dipakai tombol "Reset Progres" di dashboard). */
export function resetProgress() {
  clearAllAppData();
  return defaultStats();
}

/** Hitung persentase keberhasilan (0-100), aman terhadap pembagian 0. */
export function successRate(stats) {
  if (stats.soalDikerjakan === 0) return 0;
  return Math.round((stats.jawabanBenar / stats.soalDikerjakan) * 100);
}
