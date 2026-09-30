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

// Dipakai sebagai "track" persediaan di transactionGenerator.js — nama
// produk dagang (Level 2, bisa >1) dan nama bahan baku/barang jadi
// (Level 3, dua tahap: bahan baku diolah jadi barang jadi).
const TRADE_GOODS = [
  'Kemeja Pria', 'Sepatu Olahraga', 'Peralatan Dapur', 'Sparepart Motor',
  'Bahan Bangunan', 'Elektronik Rumah Tangga', 'Mainan Anak',
  'Produk Kecantikan', 'Aksesoris Handphone', 'Alat Tulis Kantor'
];
const RAW_MATERIALS = ['Kayu Jati', 'Kain Katun', 'Biji Plastik', 'Pelat Baja', 'Tepung Terigu'];
const FINISHED_GOODS = ['Meja Kayu', 'Kemeja Jadi', 'Mainan Plastik', 'Rangka Baja', 'Roti Kemasan'];

function pickDistinct(pool, n) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Generate a full company profile.
 * @param {number} [level=1]
 * @returns {object}
 */
export function generateCompany(level = 1) {
  const lv = Number(level) || 1;
  const month = randInt(1, 12);
  // Tahun periode = tahun berjalan saat perusahaan digenerate, bukan angka
  // tetap — sebelumnya hardcode ke 2026 (kadaluarsa begitu tahun berganti;
  // pengguna akan mengerjakan "perusahaan tahun 2026" terus-menerus).
  const year = new Date().getFullYear();

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
    // Metode kalkulasi persediaan — Level 2 (Dagang) & Level 3 (Manufaktur,
    // dipakai untuk Bahan Baku & Barang Jadi — lihat catatan scoping di
    // transactionGenerator.js), dipilih acak per perusahaan (bukan
    // dropdown), konsisten dengan pola random lain di generator ini.
    inventoryMethod: (lv === 2 || lv === 3) ? randChoice(['FIFO', 'AVG']) : null,
    // Level 2: 1 atau 2 lini produk (kadang lebih dari satu, supaya siswa
    // juga belajar memisahkan kartu persediaan per produk — bukan cuma
    // satu produk selamanya).
    productNames: lv === 2 ? pickDistinct(TRADE_GOODS, randChoice([1, 1, 2])) : null,
    // Persediaan awal (saldo awal) — hanya Level 2, sekitar separuh
    // perusahaan, selalu untuk produk PERTAMA (kalau ada 2). Disetor
    // pemilik bersama modal (lihat OPENING_CAPITAL) dan menjadi batch
    // pertama di kartu persediaan produk itu. qty kelipatan 5 supaya angka
    // kartu rapi, harga per unit kelipatan Rp500.
    openingInventory: lv === 2 && Math.random() > 0.5
      ? { qty: randInt(10, 60) * 5, unitCost: randomAmount(20000, 150000, 500) }
      : null,
    // Level 3: nama bahan baku & barang jadi, dan rasio konversi (berapa
    // unit barang jadi dihasilkan dari 1 unit bahan baku yang dipakai ke
    // produksi) — konstanta per perusahaan, dipakai transactionGenerator.js
    // untuk menurunkan qty Barang Dalam Proses dari qty bahan baku.
    rawMaterialName: lv === 3 ? randChoice(RAW_MATERIALS) : null,
    finishedGoodName: lv === 3 ? randChoice(FINISHED_GOODS) : null,
    unitsPerRawUnit: lv === 3 ? randInt(2, 5) : null,
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
