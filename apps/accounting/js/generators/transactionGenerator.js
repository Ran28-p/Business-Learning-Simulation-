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
import {
  addPurchaseLayer, consumeFIFO, consumeWeightedAverage,
  consumePurchaseReturn, getTotalStock
} from '../accounting/inventoryCosting.js';

/** Nama metode kebalikan — dipakai untuk jalur costing PARALEL (lihat
 * track.layersAlt di bawah), supaya siswa bisa membandingkan
 * FIFO vs rata-rata tertimbang atas TRANSAKSI YANG SAMA PERSIS. */
function altMethodOf(method) {
  return method === 'AVG' ? 'FIFO' : 'AVG';
}

function consumeByMethod(method, layers, qty) {
  return method === 'AVG' ? consumeWeightedAverage(layers, qty) : consumeFIFO(layers, qty);
}

/**
 * Satu "track" = satu lini persediaan yang di-costing sendiri-sendiri:
 * satu produk dagang (Level 2), atau Bahan Baku / Barang Jadi (Level 3).
 * `layers` = jalur resmi (dipakai jurnal jawaban), `layersAlt` = jalur
 * PARALEL metode kebalikan (murni untuk tampilan "Bandingkan Metode").
 */
function pickTrack(tracks) {
  return randChoice(tracks);
}

/** Pilih track yang MASIH ADA STOKNYA (buat dijual/dikonsumsi/diretur).
 * Null kalau tidak ada satu pun track yang punya stok — pemanggil harus
 * skip transaksi (return null), sama seperti pola defensif rule lain. */
function pickTrackWithStock(tracks) {
  const withStock = tracks.filter(t => getTotalStock(t.layers) > 0);
  return withStock.length ? randChoice(withStock) : null;
}

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
    // Jalur WIP PARALEL (metode kebalikan) — cuma beda kalau ada bahan
    // baku yang masuk (bagian tenaga kerja & BOP sama di kedua jalur,
    // karena tidak tergantung metode costing persediaan sama sekali).
    wipAmountAlt: 0,
    // Kuantitas unit dalam proses — SAMA di kedua metode (jumlah fisik unit
    // tidak berubah cuma karena beda cara menghitung harganya).
    wipUnits: 0,
    fgAmount: 0,
    rawPurchased: 0,
    // Level 2 (Dagang): satu track per lini produk (company.productNames,
    // 1 atau 2). Mulai kosong; kalau perusahaan punya
    // company.openingInventory, OPENING_CAPITAL (event pertama) mengisi
    // batch awal track PERTAMA.
    tracks: (company.productNames || []).map(name => ({ name, layers: [], layersAlt: [] })),
    // Level 3 (Manufaktur): dua track terpisah. Bahan baku dikonsumsi ke
    // produksi (ISSUE_RAW_TO_WIP) lewat FIFO/rata-rata menghasilkan HPP
    // bahan baku sungguhan; tiap TRANSFER_TO_FG membuat satu batch Barang
    // Jadi baru (qty unit & harga pokok/unit), lalu dikonsumsi lagi lewat
    // FIFO/rata-rata saat SALE_FG_CREDIT. BOP/tenaga kerja TETAP saldo
    // rupiah biasa di ctx.wipAmount (lihat catatan scoping di RULES) —
    // cuma bagian bahan baku yang di-costing riil.
    rawTrack: company.level === 3 ? { name: company.rawMaterialName, layers: [], layersAlt: [] } : null,
    fgTrack: company.level === 3 ? { name: company.finishedGoodName, layers: [], layersAlt: [] } : null
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
    // Persediaan awal (Level 2): disetor pemilik bersama modal, dan
    // langsung menjadi batch pertama di KEDUA jalur costing (resmi & alt).
    const inv = ctx.company.openingInventory;
    const invValue = inv ? inv.qty * inv.unitCost : 0;
    const total = cash + vehicle + equipment + invValue;

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
    // Saldo awal selalu untuk track PERTAMA (kalau perusahaan punya >1
    // lini produk) — menyetor persediaan awal untuk tiap-tiap lini
    // sekaligus tidak realistis, jadi cukup satu.
    const track = inv && ctx.tracks[0] ? ctx.tracks[0] : null;
    if (inv && track) {
      entries.push({ account: 'Persediaan Barang Dagang', debit: invValue, credit: 0 });
      desc += ` dan persediaan ${track.name} sebanyak ${fmt(inv.qty)} unit @ Rp ${fmt(inv.unitCost)} senilai Rp ${fmt(invValue)}`;
      const seed = { qty: inv.qty, unitCost: inv.unitCost, date: 'Saldo awal' };
      track.layers = addPurchaseLayer(track.layers, seed);
      track.layersAlt = addPurchaseLayer(track.layersAlt, seed);
    }
    entries.push({ account: 'Modal Pemilik', debit: 0, credit: total });
    desc += ` sebagai modal usaha.`;

    const tx = { tanggal: date.label, deskripsi: desc, entries };
    if (inv && track) {
      tx.inventoryMovement = {
        type: 'OPENING_IN',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty: inv.qty,
        unitCost: inv.unitCost,
        amount: invValue,
        layersAfter: track.layers,
        alt: { method: altMethodOf(ctx.company.inventoryMethod), layersAfter: track.layersAlt }
      };
    }
    return tx;
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
    // Bangun qty & harga per unit riil (bukan cuma nominal rupiah acak),
    // supaya ada sesuatu yang benar-benar bisa dikonsumsi FIFO/rata-rata
    // saat penjualan nanti. targetAmount dipertahankan supaya rentang
    // nominal transaksi tetap sama seperti sebelumnya secara kasar.
    const targetAmount = randomAmount(10000000, 50000000);
    const unitCost = randomAmount(20000, 150000, 500);
    let qty = Math.max(5, Math.round(targetAmount / unitCost / 5) * 5);
    const amount = qty * unitCost;
    const vendor = randomVendor();
    // Level 2 sekarang bisa punya >1 lini produk — pilih salah satu SECARA
    // ACAK untuk pembelian ini (kalau cuma 1 produk, ya itu-itu saja,
    // perilaku identik dengan sebelumnya).
    const track = pickTrack(ctx.tracks);

    ctx.payableOpen = amount;
    ctx.payableVendor = vendor;
    ctx._purchaseAmount = amount;
    // Dipakai PURCHASE_RETURN supaya retur mengurangi track yang BENAR
    // (bukan cuma track pertama/acak lain).
    ctx.lastPurchaseTrack = track;
    track.layers = addPurchaseLayer(track.layers, { qty, unitCost, date: date.label });
    // Pembelian identik di kedua metode (harga per unit yang dibeli tidak
    // tergantung cara menghitung HPP saat dijual nanti) — jadi cukup dorong
    // layer yang sama ke jalur alt, tanpa perlu logika terpisah.
    track.layersAlt = addPurchaseLayer(track.layersAlt, { qty, unitCost, date: date.label });

    return {
      tanggal: date.label,
      deskripsi: `Membeli ${track.name} dari ${vendor} sebanyak ${fmt(qty)} unit @ Rp ${fmt(unitCost)} (total Rp ${fmt(amount)}) dengan syarat 2/10, n/30.`,
      entries: [
        { account: 'Pembelian', debit: amount, credit: 0 },
        { account: 'Utang Usaha', debit: 0, credit: amount }
      ],
      // Metadata KHUSUS untuk Kartu Persediaan (js/presentation/) — tidak
      // dibaca oleh engine.js/validationEngine.js sama sekali, jadi aman
      // ditambahkan tanpa mempengaruhi jurnal/skor. layersAfter = snapshot
      // persediaan TEPAT setelah transaksi ini (inventoryCosting.js selalu
      // mengembalikan array baru, jadi snapshot ini aman dari mutasi
      // transaksi berikutnya).
      inventoryMovement: {
        type: 'IN',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty,
        unitCost,
        amount,
        layersAfter: track.layers,
        // Pembelian sama persis di kedua metode — tapi layersAfter TETAP
        // harus dicatat di sini (bukan cuma method), karena konsumen data
        // ini (mis. tampilan perbandingan) melacak state jalur alt dengan
        // mengambil layersAfter dari movement TERAKHIR yang dilihat, dan
        // kalau IN tidak menyertakannya, state jadi "basi" begitu ada
        // pembelian susulan setelah penjualan/retur terakhir.
        alt: { method: altMethodOf(ctx.company.inventoryMethod), layersAfter: track.layersAlt }
      }
    };
  },

  SALE_CASH(date, ctx) {
    // Tidak bisa jual kalau belum ada stok sama sekali di TRACK MANAPUN
    // (mis. event SALE_CASH kebetulan terpilih/terurut sebelum
    // PURCHASE_CREDIT di skenario acak) — skip transaksi ini, sama seperti
    // pola defensif yang sudah dipakai rule lain (mis. COLLECT_RECEIVABLE).
    const track = pickTrackWithStock(ctx.tracks);
    if (!track) return null;
    const totalStock = getTotalStock(track.layers);

    const qty = Math.max(1, Math.round(totalStock * randChoice([0.2, 0.3, 0.4, 0.5, 0.6])));
    const costResult = consumeByMethod(ctx.company.inventoryMethod, track.layers, qty);
    track.layers = costResult.updatedLayers;
    const cogs = costResult.cogs;

    // Jalur PARALEL: qty yang sama persis, dikonsumsi dengan metode
    // kebalikannya dari layer alt — murni untuk perbandingan tampilan,
    // TIDAK mempengaruhi jurnal jawaban (yang tetap pakai `cogs` di atas).
    const altMethod = altMethodOf(ctx.company.inventoryMethod);
    const altResult = consumeByMethod(altMethod, track.layersAlt, qty);
    track.layersAlt = altResult.updatedLayers;

    const markup = randChoice([1.3, 1.4, 1.5, 1.6, 1.7]);
    const sales = roundNearest(cogs * markup, 10000);

    return {
      tanggal: date.label,
      deskripsi: `Menjual ${track.name} sebanyak ${fmt(qty)} unit secara tunai seharga Rp ${fmt(sales)} (Harga Pokok Penjualan Rp ${fmt(cogs)}).`,
      entries: [
        { account: 'Kas', debit: sales, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: sales },
        { account: 'Harga Pokok Penjualan', debit: cogs, credit: 0 },
        { account: 'Persediaan Barang Dagang', debit: 0, credit: cogs }
      ],
      inventoryMovement: {
        type: 'OUT',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty,
        cogs,
        sales,
        breakdown: costResult.breakdown,
        layersAfter: track.layers,
        alt: {
          method: altMethod,
          cogs: altResult.cogs,
          breakdown: altResult.breakdown,
          layersAfter: track.layersAlt
        }
      }
    };
  },

  PURCHASE_RETURN(date, ctx) {
    // Meretur ke track PEMBELIAN TERAKHIR (bukan sembarang track) — kalau
    // track itu sudah kadung terjual habis sebelum retur ini muncul, skip.
    const track = ctx.lastPurchaseTrack;
    if (!ctx._purchaseAmount || !track) return null;
    const totalStock = getTotalStock(track.layers);
    if (totalStock <= 0) return null;

    const qtyReturned = Math.max(1, Math.round(totalStock * randChoice([0.05, 0.1, 0.15])));
    const returnResult = consumePurchaseReturn(track.layers, qtyReturned);
    track.layers = returnResult.updatedLayers;
    const amount = returnResult.returnValue;

    // Retur pembelian selalu LIFO-retur di kedua metode (keputusan desain
    // #3 — bukan bagian dari FIFO/rata-rata itu sendiri), tapi NILAI
    // returnya tetap bisa beda antar-metode, karena komposisi batch yang
    // tersisa di jalur alt sudah beda (AVG "meratakan" harga tiap kali
    // ada penjualan, FIFO tidak) — sengaja dihitung terpisah, bukan
    // disalin dari returnResult.
    const altMethod = altMethodOf(ctx.company.inventoryMethod);
    const altReturnResult = consumePurchaseReturn(track.layersAlt, qtyReturned);
    track.layersAlt = altReturnResult.updatedLayers;

    ctx.payableOpen = Math.max(0, ctx.payableOpen - amount);
    return {
      tanggal: date.label,
      deskripsi: `Mengembalikan ${track.name} yang rusak sebanyak ${fmt(qtyReturned)} unit kepada ${ctx.payableVendor || randomVendor()} senilai Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Utang Usaha', debit: amount, credit: 0 },
        { account: 'Retur Pembelian', debit: 0, credit: amount }
      ],
      inventoryMovement: {
        type: 'RETURN_OUT',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty: qtyReturned,
        amount,
        breakdown: returnResult.breakdown,
        layersAfter: track.layers,
        alt: {
          method: altMethod,
          amount: altReturnResult.returnValue,
          breakdown: altReturnResult.breakdown,
          layersAfter: track.layersAlt
        }
      }
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
    const track = pickTrackWithStock(ctx.tracks);
    if (!track) return null;
    const totalStock = getTotalStock(track.layers);

    const qty = Math.max(1, Math.round(totalStock * randChoice([0.2, 0.3, 0.4, 0.5, 0.6])));
    const costResult = consumeByMethod(ctx.company.inventoryMethod, track.layers, qty);
    track.layers = costResult.updatedLayers;
    const cogs = costResult.cogs;

    const altMethod = altMethodOf(ctx.company.inventoryMethod);
    const altResult = consumeByMethod(altMethod, track.layersAlt, qty);
    track.layersAlt = altResult.updatedLayers;

    const markup = randChoice([1.3, 1.4, 1.5, 1.6, 1.7]);
    const sales = roundNearest(cogs * markup, 10000);
    const customer = randomCustomer();
    ctx.receivableOpen = sales;
    ctx.receivableCustomer = customer;
    ctx._creditSales = sales;
    ctx._creditCogs = cogs;
    // Dipakai SALES_RETURN untuk mengembalikan barang ke TRACK & harga
    // pokok per unit yang dulu diakui penjualan ini — masing-masing
    // metode (resmi & alt) memakai HPP-nya sendiri.
    ctx._creditQty = qty;
    ctx._creditCogsAlt = altResult.cogs;
    ctx._creditTrack = track;
    return {
      tanggal: date.label,
      deskripsi: `Menjual ${track.name} sebanyak ${fmt(qty)} unit secara kredit kepada ${customer} senilai Rp ${fmt(sales)} dengan syarat 2/10, n/30 (HPP Rp ${fmt(cogs)}).`,
      entries: [
        { account: 'Piutang Usaha', debit: sales, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: sales },
        { account: 'Harga Pokok Penjualan', debit: cogs, credit: 0 },
        { account: 'Persediaan Barang Dagang', debit: 0, credit: cogs }
      ],
      inventoryMovement: {
        type: 'OUT',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty,
        cogs,
        sales,
        breakdown: costResult.breakdown,
        layersAfter: track.layers,
        alt: {
          method: altMethod,
          cogs: altResult.cogs,
          breakdown: altResult.breakdown,
          layersAfter: track.layersAlt
        }
      }
    };
  },

  SALES_RETURN(date, ctx) {
    const track = ctx._creditTrack;
    if (!ctx._creditSales || !ctx._creditQty || !track) return null;

    // Retur dihitung dari KUANTITAS yang dikembalikan (bukan persentase
    // rupiah yang dibulatkan ke 100rb seperti dulu, yang untuk retur kecil
    // sering menghasilkan "HPP Rp 0"). Nilai jual & HPP diturunkan dari
    // kuantitas itu, jadi tidak pernah nol kecuali qty-nya nol.
    const fraction = randChoice([0.03, 0.05, 0.08]);
    const qtyRet = Math.max(1, Math.round(ctx._creditQty * fraction));
    const ret = roundNearest(ctx._creditSales * (qtyRet / ctx._creditQty), 10000);
    const unitCostRet = ctx._creditCogs / ctx._creditQty;
    const cogsRet = Math.round(unitCostRet * qtyRet);
    const unitCostRetAlt = ctx._creditCogsAlt / ctx._creditQty;

    ctx.receivableOpen = Math.max(0, ctx.receivableOpen - ret);

    // Barang retur BENAR-BENAR kembali ke gudang: dorong layer baru ke
    // kedua jalur costing supaya Kartu Persediaan tetap sinkron dengan
    // "Persediaan Barang Dagang" di jurnal (dulu layer tidak bertambah,
    // jadi saldo kartu meleset sejak titik ini). Harga per unit = HPP per
    // unit yang dulu diakui penjualannya, per metode masing-masing.
    track.layers = addPurchaseLayer(track.layers, {
      qty: qtyRet, unitCost: unitCostRet, date: date.label
    });
    track.layersAlt = addPurchaseLayer(track.layersAlt, {
      qty: qtyRet, unitCost: unitCostRetAlt, date: date.label
    });

    return {
      tanggal: date.label,
      deskripsi: `Menerima retur ${track.name} sebanyak ${fmt(qtyRet)} unit dari ${ctx.receivableCustomer || randomCustomer()} karena cacat senilai Rp ${fmt(ret)} (HPP Rp ${fmt(cogsRet)}).`,
      entries: [
        { account: 'Retur Penjualan', debit: ret, credit: 0 },
        { account: 'Piutang Usaha', debit: 0, credit: ret },
        { account: 'Persediaan Barang Dagang', debit: cogsRet, credit: 0 },
        { account: 'Harga Pokok Penjualan', debit: 0, credit: cogsRet }
      ],
      // Dicatat sebagai pergerakan MASUK (barang balik ke stok), diberi
      // tipe 'SALES_RETURN_IN' terpisah dari pembelian supaya tampilan
      // bisa memberi label "Retur Penjualan", bukan "Masuk" biasa.
      inventoryMovement: {
        type: 'SALES_RETURN_IN',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty: qtyRet,
        unitCost: unitCostRet,
        amount: cogsRet,
        layersAfter: track.layers,
        alt: { method: altMethodOf(ctx.company.inventoryMethod), layersAfter: track.layersAlt }
      }
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
    const track = ctx.rawTrack;
    const targetAmount = randomAmount(20000000, 100000000, 1000000);
    const unitCost = randomAmount(15000, 80000, 500);
    const qty = Math.max(10, Math.round(targetAmount / unitCost / 10) * 10);
    const amount = qty * unitCost;
    const vendor = randomVendor();

    ctx.rawPurchased = amount;
    track.layers = addPurchaseLayer(track.layers, { qty, unitCost, date: date.label });
    track.layersAlt = addPurchaseLayer(track.layersAlt, { qty, unitCost, date: date.label });

    return {
      tanggal: date.label,
      deskripsi: `Membeli ${track.name} dari ${vendor} sebanyak ${fmt(qty)} unit @ Rp ${fmt(unitCost)} (total Rp ${fmt(amount)}) secara kredit.`,
      entries: [
        { account: 'Persediaan Bahan Baku', debit: amount, credit: 0 },
        { account: 'Utang Usaha', debit: 0, credit: amount }
      ],
      inventoryMovement: {
        type: 'IN',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty, unitCost, amount,
        layersAfter: track.layers,
        alt: { method: altMethodOf(ctx.company.inventoryMethod), layersAfter: track.layersAlt }
      }
    };
  },

  ISSUE_RAW_TO_WIP(date, ctx) {
    const track = ctx.rawTrack;
    const totalStock = getTotalStock(track.layers);
    if (totalStock <= 0) return null;

    const qty = Math.max(1, Math.round(totalStock * randChoice([0.3, 0.4, 0.5, 0.6])));
    const costResult = consumeByMethod(ctx.company.inventoryMethod, track.layers, qty);
    track.layers = costResult.updatedLayers;
    const amount = costResult.cogs; // HPP bahan baku yang masuk ke WIP

    const altMethod = altMethodOf(ctx.company.inventoryMethod);
    const altResult = consumeByMethod(altMethod, track.layersAlt, qty);
    track.layersAlt = altResult.updatedLayers;

    ctx.wipAmount += amount;
    ctx.wipAmountAlt += altResult.cogs;
    // Unit barang jadi yang BISA dihasilkan dari bahan baku ini — konstanta
    // per perusahaan (company.unitsPerRawUnit), SAMA di kedua metode
    // (jumlah fisik unit tidak tergantung cara menghitung harganya).
    ctx.wipUnits += qty * ctx.company.unitsPerRawUnit;

    return {
      tanggal: date.label,
      deskripsi: `Memasukkan ${track.name} sebanyak ${fmt(qty)} unit (HPP Rp ${fmt(amount)}) ke dalam proses produksi (Barang Dalam Proses).`,
      entries: [
        { account: 'Persediaan Barang Dalam Proses', debit: amount, credit: 0 },
        { account: 'Persediaan Bahan Baku', debit: 0, credit: amount }
      ],
      inventoryMovement: {
        type: 'OUT',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty, cogs: amount,
        breakdown: costResult.breakdown,
        layersAfter: track.layers,
        alt: { method: altMethod, cogs: altResult.cogs, breakdown: altResult.breakdown, layersAfter: track.layersAlt }
      }
    };
  },

  DIRECT_LABOR(date, ctx) {
    const amount = randomAmount(8000000, 30000000);
    // Tenaga kerja tidak tergantung metode costing persediaan — masuk ke
    // kedua jalur WIP dengan nilai yang SAMA.
    ctx.wipAmount += amount;
    ctx.wipAmountAlt += amount;
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
    ctx.wipAmountAlt += amount;
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
    if (ctx.wipAmount <= 0 || ctx.wipUnits <= 0) return null;
    const track = ctx.fgTrack;
    const qty = ctx.wipUnits;
    const unitCost = ctx.wipAmount / qty;
    const unitCostAlt = ctx.wipAmountAlt / qty;
    const amount = ctx.wipAmount;

    track.layers = addPurchaseLayer(track.layers, { qty, unitCost, date: date.label });
    track.layersAlt = addPurchaseLayer(track.layersAlt, { qty, unitCost: unitCostAlt, date: date.label });
    ctx.wipAmount = 0;
    ctx.wipAmountAlt = 0;
    ctx.wipUnits = 0;

    return {
      tanggal: date.label,
      deskripsi: `${fmt(qty)} unit ${track.name} selesai diproses (Rp ${fmt(unitCost)}/unit) dan ditransfer ke gudang Barang Jadi senilai Rp ${fmt(amount)}.`,
      entries: [
        { account: 'Persediaan Barang Jadi', debit: amount, credit: 0 },
        { account: 'Persediaan Barang Dalam Proses', debit: 0, credit: amount }
      ],
      inventoryMovement: {
        type: 'IN',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty, unitCost: Math.round(unitCost), amount,
        layersAfter: track.layers,
        alt: { method: altMethodOf(ctx.company.inventoryMethod), layersAfter: track.layersAlt }
      }
    };
  },

  SALE_FG_CREDIT(date, ctx) {
    const track = ctx.fgTrack;
    const totalStock = getTotalStock(track.layers);
    if (totalStock <= 0) return null;

    const qty = Math.max(1, Math.round(totalStock * randChoice([0.2, 0.3, 0.4, 0.5, 0.6])));
    const costResult = consumeByMethod(ctx.company.inventoryMethod, track.layers, qty);
    track.layers = costResult.updatedLayers;
    const cogs = costResult.cogs;

    const altMethod = altMethodOf(ctx.company.inventoryMethod);
    const altResult = consumeByMethod(altMethod, track.layersAlt, qty);
    track.layersAlt = altResult.updatedLayers;

    const markup = randChoice([1.3, 1.4, 1.5, 1.6]);
    const sales = roundNearest(cogs * markup, 10000);

    return {
      tanggal: date.label,
      deskripsi: `Menjual ${track.name} sebanyak ${fmt(qty)} unit senilai Rp ${fmt(sales)} secara kredit (HPP Rp ${fmt(cogs)}).`,
      entries: [
        { account: 'Piutang Usaha', debit: sales, credit: 0 },
        { account: 'Penjualan', debit: 0, credit: sales },
        { account: 'Harga Pokok Penjualan', debit: cogs, credit: 0 },
        { account: 'Persediaan Barang Jadi', debit: 0, credit: cogs }
      ],
      inventoryMovement: {
        type: 'OUT',
        productName: track.name,
        track: track.name,
        method: ctx.company.inventoryMethod,
        qty, cogs, sales,
        breakdown: costResult.breakdown,
        layersAfter: track.layers,
        alt: { method: altMethod, cogs: altResult.cogs, breakdown: altResult.breakdown, layersAfter: track.layersAlt }
      }
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

function roundNearest(n, step) {
  return Math.round(n / step) * step;
}
