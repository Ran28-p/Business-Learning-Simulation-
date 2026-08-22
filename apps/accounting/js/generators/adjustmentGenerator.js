/**
 * Adjustment Generator – Rule-Based
 * ============================================================
 * Produces end-of-period adjusting entries with correct answer keys.
 * Rules inspect the transaction context to compute realistic amounts.
 */

import {
  periodEndDate, randomAmount, randChoice, randInt
} from './randomUtils.js';

/**
 * Generate adjustments based on company + transaction context.
 * @param {object} company
 * @param {Array} transactions  – generated transactions (to inspect balances)
 * @returns {Array<{ id, tanggal, deskripsi, entries }>}
 */
export function generateAdjustments(company, transactions = []) {
  const endDate = periodEndDate(company.month, company.year);
  const ctx = _inspectTransactions(transactions, company);
  const adjustments = [];

  const rules = ADJUSTMENT_RULES[company.level] || ADJUSTMENT_RULES[1];

  for (const rule of rules) {
    const adj = rule(endDate, ctx, company);
    if (adj && adj.entries.some(e => e.debit > 0 || e.credit > 0)) {
      adj.id = `adj-${adj.entries[0].account.replace(/\s/g, '').toLowerCase()}-${endDate.day}`;
      adjustments.push(adj);
    }
  }

  return adjustments;
}

/* ─── Inspect transactions to derive context ─── */

function _inspectTransactions(transactions, company) {
  const ctx = {
    suppliesPurchased: 0,
    equipmentCost: 0,
    vehicleCost: 0,
    prepaidRentTotal: 0,
    prepaidInsuranceTotal: 0,
    unearnedRevenue: 0,
    salaryPaid: 0,
    perlengkapanExist: false
  };

  transactions.forEach(tx => {
    tx.entries.forEach(e => {
      if (e.account === 'Perlengkapan' && e.debit > 0) {
        ctx.suppliesPurchased += e.debit;
        ctx.perlengkapanExist = true;
      }
      if (e.account === 'Peralatan' && e.debit > 0) ctx.equipmentCost += e.debit;
      if (e.account === 'Kendaraan' && e.debit > 0) ctx.vehicleCost += e.debit;
      if (e.account === 'Sewa Dibayar Dimuka' && e.debit > 0) ctx.prepaidRentTotal += e.debit;
      if (e.account === 'Asuransi Dibayar Dimuka' && e.debit > 0) ctx.prepaidInsuranceTotal += e.debit;
      if (e.account === 'Pendapatan Diterima Dimuka' && e.credit > 0) ctx.unearnedRevenue += e.credit;
      if (e.account === 'Beban Gaji' && e.debit > 0) ctx.salaryPaid += e.debit;
    });
  });

  // Fallback from company policies if not found in tx
  if (!ctx.prepaidRentTotal && company.policies) {
    ctx.prepaidRentTotal = company.policies.rentMonthly * company.policies.rentMonthsPrepaid;
  }
  if (!ctx.prepaidInsuranceTotal && company.policies) {
    ctx.prepaidInsuranceTotal = company.policies.insuranceTotal;
  }

  return ctx;
}

/* ═══════════════════════════════════════════════════════════
   ADJUSTMENT RULES per level
   ═══════════════════════════════════════════════════════════ */

const ADJUSTMENT_RULES = {
  1: [
    // Supplies used
    (date, ctx) => {
      if (ctx.suppliesPurchased <= 0) return null;
      const remaining = roundDown(ctx.suppliesPurchased * randChoice([0.2, 0.3, 0.4]), 100000);
      const used = ctx.suppliesPurchased - remaining;
      if (used <= 0) return null;
      return {
        tanggal: date.label,
        deskripsi: `Berdasarkan perhitungan fisik, sisa Perlengkapan di gudang bernilai Rp ${fmt(remaining)}. (Pembelian Rp ${fmt(ctx.suppliesPurchased)} → terpakai Rp ${fmt(used)})`,
        entries: [
          { account: 'Beban Perlengkapan', debit: used, credit: 0 },
          { account: 'Perlengkapan', debit: 0, credit: used }
        ]
      };
    },

    // Depreciation of equipment
    (date, ctx, company) => {
      if (ctx.equipmentCost <= 0) return null;
      const rate = company.policies?.depreciationRateMonthly || 0.01;
      const amount = roundDown(ctx.equipmentCost * rate, 1000);
      if (amount <= 0) return null;
      return {
        tanggal: date.label,
        deskripsi: `Peralatan disusutkan sebesar ${(rate * 100).toFixed(1)}% per bulan dari harga perolehan (Rp ${fmt(ctx.equipmentCost)}).`,
        entries: [
          { account: 'Beban Penyusutan', debit: amount, credit: 0 },
          { account: 'Akumulasi Penyusutan Peralatan', debit: 0, credit: amount }
        ]
      };
    },

    // Rent expired (1 month)
    (date, ctx, company) => {
      if (ctx.prepaidRentTotal <= 0) return null;
      const months = company.policies?.rentMonthsPrepaid || 12;
      const monthly = roundDown(ctx.prepaidRentTotal / months, 1000);
      if (monthly <= 0) return null;
      return {
        tanggal: date.label,
        deskripsi: `Sewa dibayar di muka sebesar Rp ${fmt(ctx.prepaidRentTotal)} (untuk ${months} bulan) telah terpakai untuk 1 bulan.`,
        entries: [
          { account: 'Beban Sewa', debit: monthly, credit: 0 },
          { account: 'Sewa Dibayar Dimuka', debit: 0, credit: monthly }
        ]
      };
    },

    // Accrued salaries
    (date) => {
      const amount = randomAmount(1000000, 5000000);
      return {
        tanggal: date.label,
        deskripsi: `Terdapat gaji karyawan yang masih harus dibayar (belum dicatat) sebesar Rp ${fmt(amount)}.`,
        entries: [
          { account: 'Beban Gaji', debit: amount, credit: 0 },
          { account: 'Utang Gaji', debit: 0, credit: amount }
        ]
      };
    },

    // Earn portion of unearned revenue
    (date, ctx) => {
      if (ctx.unearnedRevenue <= 0) return null;
      const earned = roundDown(ctx.unearnedRevenue * randChoice([0.2, 0.3, 0.4, 0.5]), 100000);
      if (earned <= 0) return null;
      return {
        tanggal: date.label,
        deskripsi: `Sebagian jasa dari Uang Muka Klien senilai Rp ${fmt(earned)} telah diselesaikan.`,
        entries: [
          { account: 'Pendapatan Diterima Dimuka', debit: earned, credit: 0 },
          { account: 'Pendapatan Jasa', debit: 0, credit: earned }
        ]
      };
    }
  ],

  2: [
    // Insurance expired
    (date, ctx, company) => {
      if (ctx.prepaidInsuranceTotal <= 0) return null;
      const months = company.policies?.insuranceMonthsPrepaid || 6;
      const monthly = roundDown(ctx.prepaidInsuranceTotal / months, 1000);
      if (monthly <= 0) return null;
      return {
        tanggal: date.label,
        deskripsi: `Asuransi dibayar di muka sebesar Rp ${fmt(ctx.prepaidInsuranceTotal)} (untuk ${months} bulan) telah menjadi beban selama 1 bulan.`,
        entries: [
          { account: 'Beban Asuransi', debit: monthly, credit: 0 },
          { account: 'Asuransi Dibayar Dimuka', debit: 0, credit: monthly }
        ]
      };
    },

    // Supplies used
    (date, ctx) => {
      if (ctx.suppliesPurchased <= 0) return null;
      const used = roundDown(ctx.suppliesPurchased * randChoice([0.5, 0.6, 0.7, 0.8]), 100000);
      if (used <= 0) return null;
      return {
        tanggal: date.label,
        deskripsi: `Perlengkapan toko yang terpakai selama bulan ini adalah Rp ${fmt(used)}.`,
        entries: [
          { account: 'Beban Perlengkapan', debit: used, credit: 0 },
          { account: 'Perlengkapan', debit: 0, credit: used }
        ]
      };
    }
  ],

  3: [
    // Machine depreciation
    (date) => {
      const amount = randomAmount(1500000, 5000000);
      return {
        tanggal: date.label,
        deskripsi: `Penyusutan Mesin Pabrik ditetapkan sebesar Rp ${fmt(amount)}.`,
        entries: [
          { account: 'Beban Penyusutan Mesin', debit: amount, credit: 0 },
          { account: 'Akumulasi Penyusutan Mesin', debit: 0, credit: amount }
        ]
      };
    },

    // Building depreciation
    (date) => {
      const amount = randomAmount(1000000, 3000000);
      return {
        tanggal: date.label,
        deskripsi: `Penyusutan Gedung Pabrik ditetapkan sebesar Rp ${fmt(amount)}.`,
        entries: [
          { account: 'Beban Penyusutan Gedung', debit: amount, credit: 0 },
          { account: 'Akumulasi Penyusutan Gedung', debit: 0, credit: amount }
        ]
      };
    },

    // Overhead supplies used
    (date) => {
      const amount = randomAmount(500000, 3000000);
      return {
        tanggal: date.label,
        deskripsi: `Bahan penolong (Overhead) yang terpakai bulan ini terhitung sebesar Rp ${fmt(amount)}.`,
        entries: [
          { account: 'Beban Overhead Pabrik', debit: amount, credit: 0 },
          { account: 'Perlengkapan', debit: 0, credit: amount }
        ]
      };
    },

    // Accrued factory wages
    (date) => {
      const amount = randomAmount(2000000, 8000000);
      return {
        tanggal: date.label,
        deskripsi: `Utang upah buruh pabrik yang belum dibayarkan sebesar Rp ${fmt(amount)}.`,
        entries: [
          { account: 'Beban Tenaga Kerja Langsung', debit: amount, credit: 0 },
          { account: 'Utang Upah', debit: 0, credit: amount }
        ]
      };
    }
  ]
};

function fmt(n) {
  return Number(n).toLocaleString('id-ID');
}

function roundDown(n, step) {
  return Math.floor(n / step) * step;
}
