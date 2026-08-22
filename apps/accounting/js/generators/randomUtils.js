/**
 * Random Utilities – pure functions for generating randomised values.
 * Used by all higher-level generators.
 */

/* ─── PRNG helpers ─── */

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Round to nearest thousand (typical Indonesian accounting practice). */
export function roundToThousand(n) {
  return Math.round(n / 1000) * 1000;
}

/**
 * Generate a random amount within [min, max], rounded to nearest step.
 * @param {number} min
 * @param {number} max
 * @param {number} [step=100000]
 */
export function randomAmount(min, max, step = 100000) {
  const raw = randInt(Math.ceil(min / step), Math.floor(max / step));
  return raw * step;
}

/* ─── Date generator ─── */

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Generate sequential dates within a given month/year.
 * Returns array of { day, month, year, label } sorted ascending.
 * @param {number} count
 * @param {number} [month]  1-12 (random if omitted)
 * @param {number} [year=2026]
 */
export function randomDates(count, month, year = 2026) {
  const m = month || randInt(1, 12);
  const maxDay = daysInMonth(m, year);
  const days = new Set();
  while (days.size < Math.min(count, maxDay - 1)) {
    days.add(randInt(1, maxDay - 1)); // leave last day for adjustments
  }
  return [...days]
    .sort((a, b) => a - b)
    .map(d => ({
      day: d,
      month: m,
      year,
      label: `${String(d).padStart(2, '0')} ${MONTH_NAMES[m]}`
    }));
}

/**
 * Last day of month label (for adjustments / period end).
 */
export function periodEndDate(month, year = 2026) {
  const d = daysInMonth(month, year);
  return {
    day: d,
    month,
    year,
    label: `${String(d).padStart(2, '0')} ${MONTH_NAMES[month]}`
  };
}

function daysInMonth(m, y) {
  return new Date(y, m, 0).getDate();
}

export { MONTH_NAMES };

/* ─── Name pools ─── */

const CUSTOMERS = [
  'PT Maju Bersama', 'CV Sejahtera', 'Toko Laris', 'UD Berkah',
  'PT Cipta Karya', 'CV Mitra Jaya', 'Toko Abadi', 'PT Nusantara',
  'CV Sukses Mandiri', 'Toko Makmur', 'PT Indo Prima', 'UD Sentosa',
  'Budi Santoso', 'Siti Aminah', 'Ahmad Fauzi', 'Dewi Lestari',
  'PT Global Tech', 'CV Harapan Baru', 'Toko Cahaya', 'PT Sinar Mas'
];

const VENDORS = [
  'Toko Abadi', 'PT Sumber Rejeki', 'CV Alat Kantor', 'UD Makmur Jaya',
  'PT Indo Supply', 'Toko Prima', 'CV Berkah Abadi', 'PT Mega Store',
  'UD Sentosa', 'Toko Sejahtera', 'PT Distributor Utama', 'CV Mitra Dagang'
];

const COMPANY_PREFIXES = [
  'Jaya', 'Maju', 'Berkah', 'Sukses', 'Prima', 'Mitra', 'Global',
  'Nusantara', 'Cipta', 'Sinar', 'Harapan', 'Mandiri', 'Sejahtera'
];

const COMPANY_SUFFIXES = [
  'Fast', 'Consulting', 'Services', 'Digital', 'Kreatif', 'Solusi',
  'Pro', 'Utama', 'Mandiri', 'Abadi', 'Nusantara', 'Indonesia'
];

const ASSET_ITEMS = [
  { name: 'Peralatan Kantor', account: 'Peralatan', min: 5000000, max: 50000000 },
  { name: 'Komputer & Laptop', account: 'Peralatan', min: 8000000, max: 40000000 },
  { name: 'Furniture Kantor', account: 'Peralatan', min: 3000000, max: 25000000 },
  { name: 'Kendaraan Operasional', account: 'Kendaraan', min: 80000000, max: 250000000 },
  { name: 'Mesin Fotokopi', account: 'Peralatan', min: 5000000, max: 20000000 }
];

const EXPENSE_TYPES = [
  { name: 'listrik, air, dan internet', account: 'Beban Utilitas', min: 500000, max: 5000000 },
  { name: 'gaji karyawan', account: 'Beban Gaji', min: 3000000, max: 25000000 },
  { name: 'biaya transportasi', account: 'Beban Utilitas', min: 300000, max: 3000000 },
  { name: 'biaya komunikasi', account: 'Beban Utilitas', min: 200000, max: 2000000 },
  { name: 'biaya pemasaran', account: 'Beban Utilitas', min: 500000, max: 8000000 }
];

const REVENUE_TYPES = [
  { name: 'jasa desain', account: 'Pendapatan Jasa' },
  { name: 'jasa konsultasi', account: 'Pendapatan Jasa' },
  { name: 'jasa pelatihan', account: 'Pendapatan Jasa' },
  { name: 'jasa maintenance', account: 'Pendapatan Jasa' },
  { name: 'jasa pengembangan software', account: 'Pendapatan Jasa' },
  { name: 'jasa akuntansi', account: 'Pendapatan Jasa' },
  { name: 'jasa audit internal', account: 'Pendapatan Jasa' }
];

const SUPPLY_ITEMS = [
  'perlengkapan kantor', 'alat tulis', 'kertas & tinta printer',
  'perlengkapan kebersihan', 'material presentasi'
];

export function randomCustomer() {
  return randChoice(CUSTOMERS);
}

export function randomVendor() {
  return randChoice(VENDORS);
}

export function randomCompanyName() {
  return `${randChoice(COMPANY_PREFIXES)} ${randChoice(COMPANY_SUFFIXES)}`;
}

export function randomAsset() {
  const item = randChoice(ASSET_ITEMS);
  return {
    ...item,
    amount: randomAmount(item.min, item.max)
  };
}

export function randomExpense() {
  const item = randChoice(EXPENSE_TYPES);
  return {
    ...item,
    amount: randomAmount(item.min, item.max)
  };
}

export function randomRevenueType() {
  return randChoice(REVENUE_TYPES);
}

export function randomSupplyItem() {
  return randChoice(SUPPLY_ITEMS);
}

export function randomRevenueAmount() {
  return randomAmount(2000000, 30000000);
}

export function randomCapitalAmount() {
  return randomAmount(50000000, 500000000, 5000000);
}
