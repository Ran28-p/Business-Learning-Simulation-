/**
 * Company Generator
 * Creates a randomised company profile that drives the rest of the simulation.
 */

import {
  randomCompanyName,
  randomCapitalAmount,
  randomAmount,
  randInt,
  randChoice
} from './randomUtils.js';

const INDUSTRIES = {
  1: ['Jasa Konsultasi', 'Jasa Desain', 'Jasa IT', 'Jasa Pelatihan', 'Jasa Akuntansi'],
  2: ['Perdagangan Umum', 'Retail Elektronik', 'Distributor Sembako', 'Toko Bangunan'],
  3: ['Manufaktur Mebel', 'Pabrik Makanan', 'Konveksi', 'Assemblage Elektronik']
};

const LEVEL_LABELS = {
  1: 'Perusahaan Jasa',
  2: 'Perusahaan Dagang',
  3: 'Perusahaan Manufaktur'
};

/**
 * Generate a full company profile.
 * @param {number} [level=1]
 * @returns {object}
 */
export function generateCompany(level = 1) {
  const lv = Number(level) || 1;
  const month = randInt(1, 12);
  const year = 2026;

  return {
    name: randomCompanyName(),
    level: lv,
    levelLabel: LEVEL_LABELS[lv] || LEVEL_LABELS[1],
    industry: randChoice(INDUSTRIES[lv] || INDUSTRIES[1]),
    ownerName: randChoice(['Budi Santoso', 'Siti Aminah', 'Ahmad Wijaya', 'Dewi Lestari', 'Rudi Hartono']),
    openingCapital: randomCapitalAmount(),
    // Opening may include non-cash assets
    openingVehicle: lv === 1 && Math.random() > 0.4
      ? randomAmount(40000000, 150000000, 5000000)
      : 0,
    openingEquipment: Math.random() > 0.5
      ? randomAmount(5000000, 40000000)
      : 0,
    // Period
    month,
    year,
    // Accounting policies (drive adjustment rules)
    policies: {
      rentMonthsPrepaid: randChoice([6, 12]),
      rentMonthly: randomAmount(1000000, 5000000),
      depreciationRateMonthly: randChoice([0.01, 0.015, 0.02]), // 1%, 1.5%, 2%
      insuranceMonthsPrepaid: randChoice([6, 12]),
      insuranceTotal: randomAmount(1500000, 6000000),
      suppliesBeginChance: 0.8
    }
  };
}
