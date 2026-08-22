/**
 * Transaction Generator – Rule-Based
 * ============================================================
 * Converts a scenario blueprint into concrete transactions,
 * each carrying a correct double-entry answer key.
 *
 * NO static bank. Every amount, date, name is randomised.
 * Rules encode Indonesian PSAK double-entry logic.
 */

import {
  randomDates, randomAmount, randomCustomer, randomVendor,
  randomAsset, randomExpense, randomRevenueType, randomSupplyItem,
  randomRevenueAmount, randInt, randChoice
} from './randomUtils.js';

/**
 * Generate transactions from a scenario.
 * @param {object} scenario  – from scenarioGenerator
 * @returns {Array<{ id, tanggal, deskripsi, entries }>}
 */
export function generateTransactions(scenario) {
  const { company, events } = scenario;
  const dates = randomDates(events.length, company.month, company.year);
  const ctx = {
    company,
    // Running state used by dependent rules
    receivableOpen: 0,
    receivableCustomer: null,
    payableOpen: 0,
    payableVendor: null,
    equipmentCost: 0,
    suppliesPurchased: 0,
    unearnedAmount: 0,
    prepaidRentTotal: 0,
    prepaidInsuranceTotal: 0,
    wipAmount: 0,
    fgAmount: 0,
    rawPurchased: 0
  };

  const transactions = [];
  let dateIdx = 0;

  for (const eventType of events) {
    const date = dates[dateIdx] || dates[dates.length - 1];
    dateIdx++;
    const rule = RULES[eventType];
    if (!rule) continue;
    const tx = rule(date, ctx);
    if (tx) {
      tx.id = `gen-${eventType.toLowerCase()}-${date.day}`;
      transactions.push(tx);
    }
  }

  return transactions;
}

/* ═══════════════════════════════════════════════════════════
   RULE ENGINE – each function returns { tanggal, deskripsi, entries }
   or null if it cannot fire given current context.
   ═══════════════════════════════════════════════════════════ */

const RULES = {

  /* ─── LEVEL 1: JASA ─── */

  OPENING_CAPITAL(date, ctx) {
    const cash = ctx.company.openingCapital;
    const vehicle = ctx.company.openingVehicle || 0;
    const equipment = ctx.company.openingEquipment || 0;
    const total = cash + vehicle + equipment;

    const entries = [
      { account: 'Kas', debit: cash, credit: 0 }
    ];
    let desc = `Pemilik ${ctx.company.ownerName} menyetorkan uang tunai Rp ${fmt(cash)}`;
    if (vehicle > 0) {
      entries.push({ account: 'Kendaraan', debit: vehicle, credit: 0 });
      desc += ` dan Kendaraan senilai Rp ${fmt(vehicle)}`;
    }
    if (equipment > 0) {
      entries.push({ account: 'Peralatan', debit: equipment, credit: 0 });
      desc += ` dan Peralatan senilai Rp ${fmt(equipment)}`;
      ctx.equipmentCost += equipment;
    }
    entries.push({ account: 'Modal Pemilik', debit: 0, credit: total });
    desc += ` sebagai modal usaha.`;

    return { tanggal: date.label, deskripsi: desc, entries };
  },

  BUY_SUPPLIES_CASH(date, ctx) {
    const amount = randomAmount(1000000, 8000000);
    const item = randomSupplyItem();
    ctx.suppliesPurchased += amount;
    return {
      tanggal: date.label,
      deskripsi: `Dibeli ${item} senilai Rp ${fmt(amount)} secara tunai.`,
      entries: [
        { account: 'Perlengkapan', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  },

  PREPAID_RENT(date, ctx) {
    const months = ctx.company.policies.rentMonthsPrepaid;
    const monthly = ctx.company.policies.rentMonthly;
    const total = monthly * months;
    ctx.prepaidRentTotal = total;
    return {
      tanggal: date.label,
      deskripsi: `Dibayar sewa ruang kantor untuk ${months} bulan ke depan sebesar Rp ${fmt(total)}.`,
      entries: [
        { account: 'Sewa Dibayar Dimuka', debit: total, credit: 0 },
        { account: 'Kas', debit: 0, credit: total }
      ]
    };
  },

  REVENUE_CASH(date, ctx) {
    const amount = randomRevenueAmount();
    const svc = randomRevenueType();
    const customer = randomCustomer();
    return {
      tanggal: date.label,
      deskripsi: `Diselesaikan ${svc.name} untuk ${customer} dan diterima pembayaran tunai Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Kas', debit: amount, credit: 0 },
        { account: svc.account, debit: 0, credit: amount }
      ]
    };
  },

  BUY_EQUIPMENT_MIXED(date, ctx) {
    const asset = randomAsset();
    // Ensure we use Peralatan or Kendaraan that exists in chart
    const account = asset.account === 'Kendaraan' ? 'Kendaraan' : 'Peralatan';
    const total = asset.amount;
    const cashPart = roundDown(total * randChoice([0.2, 0.3, 0.4, 0.5]), 100000);
    const creditPart = total - cashPart;
    const vendor = randomVendor();
    ctx.payableOpen = creditPart;
    ctx.payableVendor = vendor;
    if (account === 'Peralatan') ctx.equipmentCost += total;

    return {
      tanggal: date.label,
      deskripsi: `Dibeli ${asset.name} dari ${vendor} seharga Rp ${fmt(total)}. Dibayar tunai Rp ${fmt(cashPart)}, sisanya kredit.`,
      entries: [
        { account, debit: total, credit: 0 },
        { account: 'Kas', debit: 0, credit: cashPart },
        { account: 'Utang Usaha', debit: 0, credit: creditPart }
      ]
    };
  },

  REVENUE_CREDIT(date, ctx) {
    const amount = randomRevenueAmount();
    const svc = randomRevenueType();
    const customer = randomCustomer();
    ctx.receivableOpen = amount;
    ctx.receivableCustomer = customer;
    return {
      tanggal: date.label,
      deskripsi: `Diselesaikan ${svc.name} senilai Rp ${fmt(amount)} kepada ${customer}, pelanggan berjanji akan membayar kemudian.`,
      entries: [
        { account: 'Piutang Usaha', debit: amount, credit: 0 },
        { account: svc.account, debit: 0, credit: amount }
      ]
    };
  },

  EXPENSE_UTILITIES(date, ctx) {
    const exp = randomExpense();
    // Prefer utilities-type for this slot
    const amount = exp.account === 'Beban Utilitas' ? exp.amount : randomAmount(500000, 4000000);
    return {
      tanggal: date.label,
      deskripsi: `Dibayar tagihan ${exp.name} sebesar Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Beban Utilitas', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  },

  UNEARNED_REVENUE(date, ctx) {
    const amount = randomAmount(2000000, 15000000);
    const customer = randomCustomer();
    const svc = randomRevenueType();
    ctx.unearnedAmount = amount;
    return {
      tanggal: date.label,
      deskripsi: `Diterima uang muka dari ${customer} sebesar Rp ${fmt(amount)} untuk ${svc.name} yang akan dikerjakan kemudian (Pendapatan Diterima di Muka).`,
      entries: [
        { account: 'Kas', debit: amount, credit: 0 },
        { account: 'Pendapatan Diterima Dimuka', debit: 0, credit: amount }
      ]
    };
  },

  COLLECT_RECEIVABLE(date, ctx) {
    if (ctx.receivableOpen <= 0) return null;
    // Collect partial or full
    const collect = Math.random() > 0.3
      ? ctx.receivableOpen
      : roundDown(ctx.receivableOpen * randChoice([0.5, 0.6, 0.8]), 100000);
    const customer = ctx.receivableCustomer || randomCustomer();
    ctx.receivableOpen -= collect;
    return {
      tanggal: date.label,
      deskripsi: `Diterima pelunasan piutang dari ${customer} sebesar Rp ${fmt(collect)}.`,
      entries: [
        { account: 'Kas', debit: collect, credit: 0 },
        { account: 'Piutang Usaha', debit: 0, credit: collect }
      ]
    };
  },

  OWNER_WITHDRAWAL(date, ctx) {
    const amount = randomAmount(1000000, 10000000);
    return {
      tanggal: date.label,
      deskripsi: `Pemilik mengambil uang perusahaan untuk keperluan pribadi (Prive) sebesar Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Prive', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  },

  PAY_PAYABLE(date, ctx) {
    if (ctx.payableOpen <= 0) return null;
    const pay = Math.random() > 0.4
      ? ctx.payableOpen
      : roundDown(ctx.payableOpen * randChoice([0.3, 0.5, 0.7]), 100000);
    const vendor = ctx.payableVendor || randomVendor();
    ctx.payableOpen -= pay;
    return {
      tanggal: date.label,
      deskripsi: `Dibayar sebagian/seluruh utang kepada ${vendor} sebesar Rp ${fmt(pay)}.`,
      entries: [
        { account: 'Utang Usaha', debit: pay, credit: 0 },
        { account: 'Kas', debit: 0, credit: pay }
      ]
    };
  },

  PAY_SALARY(date, ctx) {
    const amount = randomAmount(3000000, 20000000);
    return {
      tanggal: date.label,
      deskripsi: `Dibayar gaji karyawan untuk bulan ini sebesar Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Beban Gaji', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  },

  /* ─── LEVEL 2: DAGANG ─── */

  PURCHASE_CREDIT(date, ctx) {
    const amount = randomAmount(10000000, 50000000);
    const vendor = randomVendor();
    ctx.payableOpen = amount;
    ctx.payableVendor = vendor;
    ctx._purchaseAmount = amount;
    return {
      tanggal: date.label,
      deskripsi: `Membeli barang dagangan dari ${vendor} senilai Rp ${fmt(amount)} dengan syarat 2/10, n/30.`,
      entries: [
        { account: 'Pembelian', debit: amount, credit: 0 },
        { account: 'Utang Usaha', debit: 0, credit: amount }
      ]
    };
  },

  SALE_CASH(date, ctx) {
    const sales = randomAmount(8000000, 40000000);
    const cogs = roundDown(sales * randChoice([0.55, 0.6, 0.65, 0.7]), 100000);
    return {
      tanggal: date.label,
      deskripsi: `Menjual barang dagangan secara tunai seharga Rp ${fmt(sales)} (Harga Pokok Penjualan Rp ${fmt(cogs)}).`,
      entries: [
        { account: 'Kas', debit: sales, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: sales },
        { account: 'Harga Pokok Penjualan', debit: cogs, credit: 0 },
        { account: 'Persediaan Barang Dagang', debit: 0, credit: cogs }
      ]
    };
  },

  PURCHASE_RETURN(date, ctx) {
    if (!ctx._purchaseAmount) return null;
    const amount = roundDown(ctx._purchaseAmount * randChoice([0.05, 0.1, 0.15]), 100000);
    ctx.payableOpen = Math.max(0, ctx.payableOpen - amount);
    return {
      tanggal: date.label,
      deskripsi: `Mengembalikan barang yang rusak kepada ${ctx.payableVendor || randomVendor()} senilai Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Utang Usaha', debit: amount, credit: 0 },
        { account: 'Retur Pembelian', debit: 0, credit: amount }
      ]
    };
  },

  PAY_PURCHASE_DISCOUNT(date, ctx) {
    if (ctx.payableOpen <= 0) return null;
    const payable = ctx.payableOpen;
    const discount = roundDown(payable * 0.02, 1000);
    const pay = payable - discount;
    ctx.payableOpen = 0;
    return {
      tanggal: date.label,
      deskripsi: `Melunasi sisa utang kepada ${ctx.payableVendor || randomVendor()} dan mendapatkan potongan pembelian 2%.`,
      entries: [
        { account: 'Utang Usaha', debit: payable, credit: 0 },
        { account: 'Kas', debit: 0, credit: pay },
        { account: 'Potongan Pembelian', debit: 0, credit: discount }
      ]
    };
  },

  SALE_CREDIT(date, ctx) {
    const sales = randomAmount(10000000, 50000000);
    const cogs = roundDown(sales * randChoice([0.6, 0.65, 0.7]), 100000);
    const customer = randomCustomer();
    ctx.receivableOpen = sales;
    ctx.receivableCustomer = customer;
    ctx._creditSales = sales;
    ctx._creditCogs = cogs;
    return {
      tanggal: date.label,
      deskripsi: `Menjual barang dagangan secara kredit kepada ${customer} senilai Rp ${fmt(sales)} dengan syarat 2/10, n/30 (HPP Rp ${fmt(cogs)}).`,
      entries: [
        { account: 'Piutang Usaha', debit: sales, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: sales },
        { account: 'Harga Pokok Penjualan', debit: cogs, credit: 0 },
        { account: 'Persediaan Barang Dagang', debit: 0, credit: cogs }
      ]
    };
  },

  SALES_RETURN(date, ctx) {
    if (!ctx._creditSales) return null;
    const ret = roundDown(ctx._creditSales * randChoice([0.03, 0.05, 0.08]), 100000);
    const cogsRet = roundDown(ret * (ctx._creditCogs / ctx._creditSales), 100000);
    ctx.receivableOpen = Math.max(0, ctx.receivableOpen - ret);
    return {
      tanggal: date.label,
      deskripsi: `Menerima retur barang dari ${ctx.receivableCustomer || randomCustomer()} karena cacat senilai Rp ${fmt(ret)} (HPP Rp ${fmt(cogsRet)}).`,
      entries: [
        { account: 'Retur Penjualan', debit: ret, credit: 0 },
        { account: 'Piutang Usaha', debit: 0, credit: ret },
        { account: 'Persediaan Barang Dagang', debit: cogsRet, credit: 0 },
        { account: 'Harga Pokok Penjualan', debit: 0, credit: cogsRet }
      ]
    };
  },

  FREIGHT_IN(date, ctx) {
    const amount = randomAmount(200000, 2000000);
    return {
      tanggal: date.label,
      deskripsi: `Membayar ongkos kirim (FOB Shipping Point) pembelian barang dagangan Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Ongkos Angkut Pembelian', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  },

  COLLECT_SALE_DISCOUNT(date, ctx) {
    if (ctx.receivableOpen <= 0) return null;
    const receivable = ctx.receivableOpen;
    const discount = roundDown(receivable * 0.02, 1000);
    const received = receivable - discount;
    ctx.receivableOpen = 0;
    return {
      tanggal: date.label,
      deskripsi: `Menerima pelunasan dari ${ctx.receivableCustomer || randomCustomer()} dalam masa potongan.`,
      entries: [
        { account: 'Kas', debit: received, credit: 0 },
        { account: 'Potongan Penjualan', debit: discount, credit: 0 },
        { account: 'Piutang Usaha', debit: 0, credit: receivable }
      ]
    };
  },

  PREPAID_INSURANCE(date, ctx) {
    const total = ctx.company.policies.insuranceTotal;
    const months = ctx.company.policies.insuranceMonthsPrepaid;
    ctx.prepaidInsuranceTotal = total;
    return {
      tanggal: date.label,
      deskripsi: `Membayar premi asuransi kebakaran untuk ${months} bulan sebesar Rp ${fmt(total)}.`,
      entries: [
        { account: 'Asuransi Dibayar Dimuka', debit: total, credit: 0 },
        { account: 'Kas', debit: 0, credit: total }
      ]
    };
  },

  /* ─── LEVEL 3: MANUFAKTUR ─── */

  BUY_RAW_MATERIAL(date, ctx) {
    const amount = randomAmount(20000000, 100000000, 1000000);
    ctx.rawPurchased = amount;
    return {
      tanggal: date.label,
      deskripsi: `Membeli bahan baku (Raw Material) secara kredit senilai Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Persediaan Bahan Baku', debit: amount, credit: 0 },
        { account: 'Utang Usaha', debit: 0, credit: amount }
      ]
    };
  },

  ISSUE_RAW_TO_WIP(date, ctx) {
    if (!ctx.rawPurchased) return null;
    const amount = roundDown(ctx.rawPurchased * randChoice([0.5, 0.6, 0.7]), 100000);
    ctx.wipAmount += amount;
    return {
      tanggal: date.label,
      deskripsi: `Memasukkan bahan baku senilai Rp ${fmt(amount)} ke dalam proses produksi (Barang Dalam Proses).`,
      entries: [
        { account: 'Persediaan Barang Dalam Proses', debit: amount, credit: 0 },
        { account: 'Persediaan Bahan Baku', debit: 0, credit: amount }
      ]
    };
  },

  DIRECT_LABOR(date, ctx) {
    const amount = randomAmount(8000000, 30000000);
    ctx.wipAmount += amount;
    return {
      tanggal: date.label,
      deskripsi: `Membayar upah buruh pabrik (Tenaga Kerja Langsung) sebesar Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Persediaan Barang Dalam Proses', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  },

  FACTORY_OVERHEAD(date, ctx) {
    const amount = randomAmount(5000000, 20000000);
    ctx.wipAmount += amount;
    return {
      tanggal: date.label,
      deskripsi: `Mencatat biaya Overhead Pabrik (Listrik pabrik, Penyusutan mesin, Asuransi) sebesar Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Persediaan Barang Dalam Proses', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  },

  TRANSFER_TO_FG(date, ctx) {
    if (ctx.wipAmount <= 0) return null;
    const amount = ctx.wipAmount;
    ctx.fgAmount += amount;
    ctx.wipAmount = 0;
    return {
      tanggal: date.label,
      deskripsi: `Produk selesai diproses dan ditransfer ke gudang Barang Jadi senilai Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Persediaan Barang Jadi', debit: amount, credit: 0 },
        { account: 'Persediaan Barang Dalam Proses', debit: 0, credit: amount }
      ]
    };
  },

  SALE_FG_CREDIT(date, ctx) {
    if (ctx.fgAmount <= 0) return null;
    const cogs = roundDown(ctx.fgAmount * randChoice([0.7, 0.8, 0.9]), 100000);
    const sales = roundDown(cogs * randChoice([1.3, 1.4, 1.5, 1.6]), 100000);
    ctx.fgAmount -= cogs;
    return {
      tanggal: date.label,
      deskripsi: `Menjual Barang Jadi senilai Rp ${fmt(sales)} secara kredit (HPP Rp ${fmt(cogs)}).`,
      entries: [
        { account: 'Piutang Usaha', debit: sales, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: sales },
        { account: 'Harga Pokok Penjualan', debit: cogs, credit: 0 },
        { account: 'Persediaan Barang Jadi', debit: 0, credit: cogs }
      ]
    };
  },

  SELLING_EXPENSE(date, ctx) {
    const amount = randomAmount(1000000, 8000000);
    return {
      tanggal: date.label,
      deskripsi: `Membayar komisi staf bagian penjualan (Beban Pemasaran) sebesar Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Beban Pemasaran', debit: amount, credit: 0 },
        { account: 'Kas', debit: 0, credit: amount }
      ]
    };
  }
};

/* ─── helpers ─── */

function fmt(n) {
  return Number(n).toLocaleString('id-ID');
}

function roundDown(n, step) {
  return Math.floor(n / step) * step;
}
