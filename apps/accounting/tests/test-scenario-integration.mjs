// Test integrasi end-to-end untuk fitur persediaan FIFO/Rata-rata Tertimbang
// (js/accounting/inventoryCosting.js + companyGenerator.js + transactionGenerator.js
// + scenarioGenerator.js + inventoryCardPage.js).
//
// Beda dengan test-inventory-costing.mjs (yang menguji inventoryCosting.js
// SENDIRIAN dengan skenario buatan tangan), file ini menguji jalur PENUH
// lewat generator acak sungguhan — supaya kombinasi company/scenario/
// transaction generator yang sebenarnya dipakai aplikasi ikut ter-cover,
// bukan cuma modul costing-nya secara terisolasi.
//
// Jalankan: node tests/test-scenario-integration.mjs

import { runFullCycle } from '../js/accounting/engine.js';
import { generateCompany } from '../js/generators/companyGenerator.js';
import { generateScenario } from '../js/generators/scenarioGenerator.js';
import { generateTransactions } from '../js/generators/transactionGenerator.js';
import { generateAdjustments } from '../js/generators/adjustmentGenerator.js';
import { consumeFIFO, consumeWeightedAverage } from '../js/accounting/inventoryCosting.js';

let pass = 0;
let fail = 0;
function checkTrue(label, cond, extra) {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL: ${label}${extra !== undefined ? `\n  detail: ${JSON.stringify(extra)}` : ''}`);
  }
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ============================================================================
// 1. Stress test lewat runFullCycle(): banyak kombinasi count, tidak boleh
//    ada exception (mis. dari assertSufficientStock di inventoryCosting.js
//    kalau ada skenario yang lolos tapi ternyata menjual lebih dari stok).
// ============================================================================
section('runFullCycle(2, ...) — stress test, tidak boleh throw');
{
  const COUNTS = [4, 6, 8, 10, 12, 14];
  const RUNS_PER_COUNT = 150;
  let errors = 0;
  let firstError = null;

  for (const count of COUNTS) {
    for (let i = 0; i < RUNS_PER_COUNT; i++) {
      try {
        runFullCycle(2, count);
      } catch (e) {
        errors++;
        if (!firstError) firstError = { count, i, message: e.message };
      }
    }
  }
  checkTrue(
    `0 error dari ${COUNTS.length * RUNS_PER_COUNT} kali runFullCycle(2, ...)`,
    errors === 0,
    firstError
  );
}

// ============================================================================
// 2. Sweep generator langsung (company → scenario → transactions): setiap
//    transaksi yang dihasilkan harus tetap balans (debit = kredit), dan
//    kumpulkan statistik untuk pengecekan di bagian 3 & 4.
// ============================================================================
section('Sweep generator langsung — semua transaksi harus balans');

const RUNS = 600;
const stats = {
  imbalanced: 0,
  totalTransactions: 0,
  purchaseCountDist: {}, // jumlah PURCHASE_CREDIT per skenario -> berapa kali muncul
  methodDist: { FIFO: 0, AVG: 0 },
  totalSaleTx: 0,
  multiBatchSaleTx: 0,
  stockCardChecks: [], // { totalCogsFromJournal, cogsFromStockCard } per run
  salesReturnCount: 0,
  salesReturnZeroHpp: 0,
  openingCount: 0,
  openingFirstBatchSales: 0 // penjualan yang mengambil dari batch saldo awal
};

for (let i = 0; i < RUNS; i++) {
  const company = generateCompany(2);
  const scenario = generateScenario(company, 8);
  const txs = generateTransactions(scenario);

  if (company.inventoryMethod === 'FIFO') stats.methodDist.FIFO++;
  if (company.inventoryMethod === 'AVG') stats.methodDist.AVG++;

  const purchaseCount = txs.filter(t => t.inventoryMovement?.type === 'IN').length;
  stats.purchaseCountDist[purchaseCount] = (stats.purchaseCountDist[purchaseCount] || 0) + 1;
  if (company.productNames.length > 1) stats.twoProductCount = (stats.twoProductCount || 0) + 1;

  // Dikelompokkan PER TRACK (per lini produk) — dengan >1 produk per
  // perusahaan sekarang mungkin, identitas kuantitas/nilai HARUS dihitung
  // terpisah per track, bukan digabung lintas produk (produk A yang masuk
  // tidak boleh menutupi produk B yang keluar).
  const byTrack = {};
  function trackAcc(name) {
    if (!byTrack[name]) {
      byTrack[name] = {
        purchase: 0, ret: 0, opening: 0, salesReturnIn: 0, cogsJournal: 0, lastLayers: [],
        qtyIn: 0, qtyOut: 0, qtyReturnOut: 0, qtySalesReturnIn: 0, qtyOpening: 0
      };
    }
    return byTrack[name];
  }

  for (const tx of txs) {
    stats.totalTransactions++;
    const d = tx.entries.reduce((s, e) => s + e.debit, 0);
    const k = tx.entries.reduce((s, e) => s + e.credit, 0);
    if (d !== k) stats.imbalanced++;

    const m = tx.inventoryMovement;
    if (!m) continue;
    const acc = trackAcc(m.track || m.productName);
    acc.lastLayers = m.layersAfter;

    if (m.type === 'IN') {
      acc.purchase += m.amount;
      acc.qtyIn += m.qty;
    } else if (m.type === 'OPENING_IN') {
      acc.opening += m.amount;
      acc.qtyOpening += m.qty;
      stats.openingCount++;
      // Jurnal pembukaan: debit Persediaan Barang Dagang = nilai kartu.
      const persDebit = tx.entries.find(e => e.account === 'Persediaan Barang Dagang');
      const modal = tx.entries.find(e => e.account === 'Modal Pemilik');
      const totalDebit = tx.entries.reduce((sum, e) => sum + e.debit, 0);
      checkTrue(
        `run#${i}: saldo awal — debit Persediaan (${persDebit?.debit}) = kartu (${m.amount}), modal (${modal?.credit}) = total debit (${totalDebit})`,
        persDebit && persDebit.debit === m.amount && modal && modal.credit === totalDebit
      );
      checkTrue(`run#${i}: saldo awal adalah movement PERTAMA di kartu`, tx === txs.find(t => t.inventoryMovement));
    } else if (m.type === 'SALES_RETURN_IN') {
      acc.salesReturnIn += m.amount;
      acc.qtySalesReturnIn += m.qty;
      stats.salesReturnCount++;
      // Regresi perbaikan "HPP Rp 0": retur harus selalu punya HPP > 0.
      if (!(m.amount > 0)) stats.salesReturnZeroHpp++;
      // Jurnal (kredit HPP & debit Persediaan) harus PERSIS sama dgn kartu.
      const hppCredit = tx.entries.find(e => e.account === 'Harga Pokok Penjualan');
      const persDebit = tx.entries.find(e => e.account === 'Persediaan Barang Dagang');
      checkTrue(
        `run#${i}: retur jual — kredit HPP (${hppCredit?.credit}) & debit Persediaan (${persDebit?.debit}) = kartu (${m.amount})`,
        hppCredit && persDebit && hppCredit.credit === m.amount && persDebit.debit === m.amount
      );
    } else if (m.type === 'OUT') {
      acc.qtyOut += m.qty;
      acc.cogsJournal += m.cogs;
      stats.totalSaleTx++;
      if (m.breakdown.length > 1) stats.multiBatchSaleTx++;
      if (m.breakdown.some(b => b.date === 'Saldo awal')) stats.openingFirstBatchSales++;
      // Silang-cek: HPP di baris jurnal harus PERSIS sama dengan m.cogs
      // yang dipakai untuk kartu persediaan — ini memverifikasi metadata
      // inventoryMovement tidak "menyimpang" dari angka yang sungguhan
      // masuk ke jurnal jawaban.
      const hppLine = tx.entries.find(e => e.account === 'Harga Pokok Penjualan');
      checkTrue(
        `run#${i}: baris jurnal HPP (${hppLine?.debit}) = inventoryMovement.cogs (${m.cogs})`,
        hppLine && hppLine.debit === m.cogs
      );
    } else if (m.type === 'RETURN_OUT') {
      acc.ret += m.amount;
      acc.qtyReturnOut += m.qty;
    }
  }

  // Sinkron KUANTITAS & NILAI per track: stok akhir = awal + masuk - keluar
  // - retur beli + retur jual.
  for (const name in byTrack) {
    const acc = byTrack[name];
    const endingQty = acc.lastLayers.reduce((sum, l) => sum + l.qty, 0);
    checkTrue(
      `run#${i} track=${name}: stok akhir kartu (${endingQty}) = awal ${acc.qtyOpening} + masuk ${acc.qtyIn} - keluar ${acc.qtyOut} - retur beli ${acc.qtyReturnOut} + retur jual ${acc.qtySalesReturnIn}`,
      endingQty === acc.qtyOpening + acc.qtyIn - acc.qtyOut - acc.qtyReturnOut + acc.qtySalesReturnIn
    );
    if (acc.purchase + acc.opening > 0) {
      const endingValue = acc.lastLayers.reduce((sum, l) => sum + l.qty * l.unitCost, 0);
      const cogsFromStockCard = acc.opening + acc.purchase - acc.ret + acc.salesReturnIn - endingValue;
      stats.stockCardChecks.push({ totalCogsFromJournal: acc.cogsJournal, cogsFromStockCard, method: company.inventoryMethod });
    }
  }
}

checkTrue(
  `0 transaksi tidak balans dari ${stats.totalTransactions} transaksi (${RUNS} skenario)`,
  stats.imbalanced === 0,
  { imbalanced: stats.imbalanced, totalTransactions: stats.totalTransactions }
);

// ============================================================================
// 3. Distribusi: metode FIFO & AVG dua-duanya harus kepakai (bukan cuma
//    salah satu — kalau ini gagal, kemungkinan randChoice(['FIFO','AVG'])
//    di companyGenerator.js rusak/berubah), dan pembelian 1x/2x/3x per
//    skenario semua harus muncul (regresi terhadap perbaikan
//    scenarioGenerator.js — kalau ini gagal berarti PURCHASE_CREDIT balik
//    lagi cuma bisa muncul sekali, dan fitur FIFO/AVG jadi mubazir lagi).
// ============================================================================
section('Distribusi metode & jumlah pembelian per skenario');

checkTrue(
  `metode FIFO kepakai (${stats.methodDist.FIFO}x dari ${RUNS} skenario)`,
  stats.methodDist.FIFO > RUNS * 0.3,
  stats.methodDist
);
checkTrue(
  `metode AVG kepakai (${stats.methodDist.AVG}x dari ${RUNS} skenario)`,
  stats.methodDist.AVG > RUNS * 0.3,
  stats.methodDist
);
checkTrue(
  `skenario dengan >=2x PURCHASE_CREDIT muncul (regresi thd perbaikan scenarioGenerator.js)`,
  (stats.purchaseCountDist[2] || 0) + (stats.purchaseCountDist[3] || 0) > RUNS * 0.4,
  stats.purchaseCountDist
);
checkTrue(
  `skenario dengan 3x PURCHASE_CREDIT muncul`,
  (stats.purchaseCountDist[3] || 0) > 0,
  stats.purchaseCountDist
);
checkTrue(
  `sebagian perusahaan punya >1 lini produk (${stats.twoProductCount || 0}x dari ${RUNS})`,
  (stats.twoProductCount || 0) > 0,
  { twoProductCount: stats.twoProductCount }
);

// ============================================================================
// 4. Nilai pedagogis inti: sebagian penjualan HARUS menyentuh >1 batch,
//    supaya siswa benar-benar melihat FIFO "pindah batch" / rata-rata
//    "menghitung ulang". Ambang batas 15% jauh di bawah hasil observasi
//    (~33%) supaya test ini tidak flaky, tapi tetap cukup ketat untuk
//    menangkap regresi total (mis. kalau scenarioGenerator.js fix hilang,
//    ini akan jatuh ke ~0%).
// ============================================================================
section('Nilai pedagogis inti — penjualan yang menyentuh >1 batch');

const multiBatchPct = stats.totalSaleTx > 0 ? (stats.multiBatchSaleTx / stats.totalSaleTx) * 100 : 0;
checkTrue(
  `>=15% penjualan menyentuh >1 batch (aktual: ${multiBatchPct.toFixed(1)}%, ${stats.multiBatchSaleTx}/${stats.totalSaleTx})`,
  multiBatchPct >= 15,
  { multiBatchSaleTx: stats.multiBatchSaleTx, totalSaleTx: stats.totalSaleTx }
);

// ============================================================================
// 5. Kartu persediaan vs jurnal: untuk tiap skenario yang punya pembelian,
//    total HPP di jurnal jawaban harus sinkron dengan
//    (total pembelian - total retur - nilai persediaan akhir) yang
//    dihitung dari kartu persediaan. Toleransi kecil untuk AVG (lihat
//    catatan pembulatan di test-inventory-costing.mjs); FIFO harus PERSIS
//    sinkron (tidak ada pembulatan kuantitas yang terlibat).
// ============================================================================
section('Kartu persediaan vs jurnal — sinkron di seluruh 600 skenario');

let fifoMismatches = 0;
let avgMismatches = 0;
let worstAvgDiff = 0;

for (const chk of stats.stockCardChecks) {
  const diff = Math.abs(chk.totalCogsFromJournal - chk.cogsFromStockCard);
  if (chk.method === 'FIFO') {
    if (diff > 1) fifoMismatches++;
  } else {
    // AVG: toleransi 0.5% dari total HPP skenario itu (drift pembulatan
    // qty proporsional per-layer, lihat catatan di inventoryCosting.js)
    const tolerance = Math.max(50, chk.totalCogsFromJournal * 0.005);
    if (diff > tolerance) avgMismatches++;
    worstAvgDiff = Math.max(worstAvgDiff, diff);
  }
}

checkTrue(
  `FIFO: 0 skenario mismatch (dari ${stats.stockCardChecks.filter(c => c.method === 'FIFO').length} skenario ber-pembelian)`,
  fifoMismatches === 0,
  { fifoMismatches }
);
checkTrue(
  `AVG: 0 skenario di luar toleransi pembulatan wajar (dari ${stats.stockCardChecks.filter(c => c.method === 'AVG').length} skenario ber-pembelian)`,
  avgMismatches === 0,
  { avgMismatches, worstAvgDiff }
);

// ============================================================================
// 6. Retur penjualan (SALES_RETURN): barang benar-benar kembali ke stok, dan
//    HPP-nya tidak pernah lagi jatuh ke Rp 0 (bug lama: pembulatan ke 100rb).
// ============================================================================
section('Retur penjualan — restock layer & HPP tidak nol');

checkTrue(
  `jalur SALES_RETURN benar-benar terjalankan (${stats.salesReturnCount}x dari ${RUNS} skenario)`,
  stats.salesReturnCount > 0,
  { salesReturnCount: stats.salesReturnCount }
);
checkTrue(
  `0 retur penjualan dengan HPP Rp 0 (dari ${stats.salesReturnCount} retur)`,
  stats.salesReturnZeroHpp === 0,
  { salesReturnZeroHpp: stats.salesReturnZeroHpp }
);

// ============================================================================
// 7. Persediaan awal: sebagian perusahaan Level 2 mulai dengan stok, dan
//    batch itu benar-benar ikut dikonsumsi penjualan (bukan hiasan).
// ============================================================================
section('Persediaan awal — muncul dan ikut dikonsumsi');

const openingPct = (stats.openingCount / RUNS) * 100;
checkTrue(
  `sekitar separuh perusahaan punya persediaan awal (aktual ${openingPct.toFixed(1)}%, ${stats.openingCount}/${RUNS})`,
  openingPct > 35 && openingPct < 65,
  { openingCount: stats.openingCount }
);
checkTrue(
  `penjualan benar-benar mengambil dari batch "Saldo awal" (${stats.openingFirstBatchSales}x)`,
  stats.openingFirstBatchSales > 0,
  { openingFirstBatchSales: stats.openingFirstBatchSales }
);

// ============================================================================
// 8. Stock opname (jurnal penyesuaian Level 2): selisih hasil hitung fisik vs
//    kartu persediaan. Nilai selisih dihitung ULANG secara independen dari
//    layer akhir kartu, dan arah jurnalnya harus sesuai jenis selisih.
// ============================================================================
section('Stock opname — penyesuaian selisih persediaan');

const opname = { total: 0, kurang: 0, lebih: 0, methods: { FIFO: 0, AVG: 0 } };
const OPNAME_RUNS = 600;

for (let i = 0; i < OPNAME_RUNS; i++) {
  const company = generateCompany(2);
  const txs = generateTransactions(generateScenario(company, 8));
  const adjs = generateAdjustments(company, txs);
  const adj = adjs.find(a => a.inventoryOpname);
  if (!adj) continue;

  const o = adj.inventoryOpname;
  opname.total++;
  opname[o.kind === 'KURANG' ? 'kurang' : 'lebih']++;
  opname.methods[o.method]++;

  // Layer akhir menurut kartu = layersAfter dari movement TERAKHIR pada
  // TRACK yang sama dengan yang di-opname (bukan cuma "movement terakhir
  // apa saja" — kalau perusahaan punya >1 produk, movement terakhir bisa
  // saja produk yang lain).
  const lastMove = [...txs].reverse()
    .find(t => t.inventoryMovement && (t.inventoryMovement.track || t.inventoryMovement.productName) === o.track)
    ?.inventoryMovement;
  const endLayers = lastMove.layersAfter;
  const endQty = endLayers.reduce((sum, l) => sum + l.qty, 0);
  const endValue = endLayers.reduce((sum, l) => sum + l.qty * l.unitCost, 0);

  checkTrue(`opname#${i}: metode di opname = metode perusahaan`, o.method === company.inventoryMethod, { o: o.method, c: company.inventoryMethod });
  checkTrue(`opname#${i}: qty buku (${o.bookQty}) = stok akhir kartu (${endQty})`, o.bookQty === endQty);
  checkTrue(
    `opname#${i}: fisik = buku ${o.kind === 'KURANG' ? '-' : '+'} selisih`,
    o.physicalQty === (o.kind === 'KURANG' ? o.bookQty - o.diffQty : o.bookQty + o.diffQty)
  );
  checkTrue(`opname#${i}: selisih > 0 dan kurang dari stok buku`, o.diffQty > 0 && (o.kind === 'LEBIH' || o.diffQty < o.bookQty));

  // Nilai dihitung ulang independen
  let expected;
  if (o.kind === 'KURANG') {
    expected = (o.method === 'AVG' ? consumeWeightedAverage : consumeFIFO)(endLayers, o.diffQty).cogs;
  } else {
    const unit = o.method === 'AVG' ? endValue / endQty : endLayers[endLayers.length - 1].unitCost;
    expected = Math.round(unit * o.diffQty);
  }
  checkTrue(`opname#${i}: nilai selisih (${o.value}) = hitung ulang independen (${expected})`, o.value === expected);

  // Jurnal: balans dan arah sesuai jenis selisih
  const dr = adj.entries.reduce((sum, e) => sum + e.debit, 0);
  const cr = adj.entries.reduce((sum, e) => sum + e.credit, 0);
  const hpp = adj.entries.find(e => e.account === 'Harga Pokok Penjualan');
  const pers = adj.entries.find(e => e.account === 'Persediaan Barang Dagang');
  checkTrue(`opname#${i}: jurnal balans (${dr} = ${cr} = ${o.value})`, dr === cr && dr === o.value);
  checkTrue(
    `opname#${i}: arah jurnal sesuai selisih ${o.kind}`,
    o.kind === 'KURANG' ? (hpp.debit === o.value && pers.credit === o.value) : (pers.debit === o.value && hpp.credit === o.value)
  );
  checkTrue(`opname#${i}: deskripsi menyebut qty buku, fisik, dan nilai`,
    adj.deskripsi.includes(o.bookQty.toLocaleString('id-ID')) &&
    adj.deskripsi.includes(o.physicalQty.toLocaleString('id-ID')) &&
    adj.deskripsi.includes(o.value.toLocaleString('id-ID')));
}

const opnamePct = (opname.total / OPNAME_RUNS) * 100;
checkTrue(`opname muncul di sebagian skenario (aktual ${opnamePct.toFixed(1)}%)`, opnamePct > 25 && opnamePct < 75, opname);
checkTrue(`kedua jenis selisih muncul (kurang ${opname.kurang}x, lebih ${opname.lebih}x)`, opname.kurang > 0 && opname.lebih > 0, opname);
checkTrue(`kedua metode costing ikut terwakili (FIFO ${opname.methods.FIFO}x, AVG ${opname.methods.AVG}x)`, opname.methods.FIFO > 0 && opname.methods.AVG > 0, opname);

// ============================================================================
// 9. Level 3 (Manufaktur) — Bahan Baku & Barang Jadi di-costing FIFO/rata-
//    rata sungguhan, dengan struktur invarian yang SAMA seperti Level 2:
//    identitas kuantitas/nilai per track, HPP jurnal = kartu, multi-batch
//    beneran terjadi. WIP/BOP/tenaga kerja TETAP saldo rupiah biasa —
//    itu keputusan scoping yang disengaja (lihat catatan di
//    transactionGenerator.js), bukan sesuatu yang diuji di sini.
// ============================================================================
section('Level 3 (Manufaktur) — Bahan Baku & Barang Jadi');

const l3 = {
  imbalanced: 0,
  totalTransactions: 0,
  methodDist: { FIFO: 0, AVG: 0 },
  rawMultiBatch: 0, rawTotal: 0,
  fgMultiBatch: 0, fgTotal: 0,
  rawPurchaseCountDist: {},
  fgTransferCountDist: {},
  stockCardChecks: []
};
const L3_RUNS = 500;

for (let i = 0; i < L3_RUNS; i++) {
  const company = generateCompany(3);
  const txs = generateTransactions(generateScenario(company, 10));

  if (company.inventoryMethod === 'FIFO') l3.methodDist.FIFO++;
  if (company.inventoryMethod === 'AVG') l3.methodDist.AVG++;

  const rawPurchases = txs.filter(t => t.inventoryMovement?.track === company.rawMaterialName && t.inventoryMovement.type === 'IN').length;
  l3.rawPurchaseCountDist[rawPurchases] = (l3.rawPurchaseCountDist[rawPurchases] || 0) + 1;
  const fgTransfers = txs.filter(t => t.inventoryMovement?.track === company.finishedGoodName && t.inventoryMovement.type === 'IN').length;
  l3.fgTransferCountDist[fgTransfers] = (l3.fgTransferCountDist[fgTransfers] || 0) + 1;

  const byTrack = {}; // { [track]: { purchase, cogsJournal, lastLayers, qtyIn, qtyOut } }
  function acc(name) {
    if (!byTrack[name]) byTrack[name] = { purchase: 0, cogsJournal: 0, lastLayers: [], qtyIn: 0, qtyOut: 0 };
    return byTrack[name];
  }

  for (const tx of txs) {
    l3.totalTransactions++;
    const d = tx.entries.reduce((s, e) => s + e.debit, 0);
    const k = tx.entries.reduce((s, e) => s + e.credit, 0);
    if (d !== k) l3.imbalanced++;

    const m = tx.inventoryMovement;
    if (!m) continue;
    const a = acc(m.track);
    a.lastLayers = m.layersAfter;

    if (m.type === 'IN') {
      a.purchase += m.amount;
      a.qtyIn += m.qty;
    } else if (m.type === 'OUT') {
      a.qtyOut += m.qty;
      a.cogsJournal += m.cogs;
      const isRaw = m.track === company.rawMaterialName;
      if (isRaw) { l3.rawTotal++; if (m.breakdown.length > 1) l3.rawMultiBatch++; }
      else { l3.fgTotal++; if (m.breakdown.length > 1) l3.fgMultiBatch++; }

      // ISSUE_RAW_TO_WIP mendebit Persediaan Barang Dalam Proses (bukan
      // HPP — itu baru muncul saat Barang Jadi terjual); SALE_FG_CREDIT
      // mendebit HPP seperti biasa. Keduanya harus PERSIS sama dgn m.cogs.
      if (isRaw) {
        const wipLine = tx.entries.find(e => e.account === 'Persediaan Barang Dalam Proses');
        checkTrue(`L3 run#${i}: baris jurnal WIP (${wipLine?.debit}) = inventoryMovement.cogs (${m.cogs})`, wipLine && wipLine.debit === m.cogs);
      } else {
        const hppLine = tx.entries.find(e => e.account === 'Harga Pokok Penjualan');
        checkTrue(`L3 run#${i}: baris jurnal HPP (${hppLine?.debit}) = inventoryMovement.cogs (${m.cogs})`, hppLine && hppLine.debit === m.cogs);
      }
    }
  }

  // TRANSFER_TO_FG mendebit Persediaan Barang Jadi = amount di kartu.
  txs.forEach(tx => {
    const m = tx.inventoryMovement;
    if (m && m.track === company.finishedGoodName && m.type === 'IN') {
      const fgDebit = tx.entries.find(e => e.account === 'Persediaan Barang Jadi');
      checkTrue(`L3 run#${i}: transfer ke FG — debit Persediaan Barang Jadi (${fgDebit?.debit}) = kartu (${m.amount})`, fgDebit && fgDebit.debit === m.amount);
    }
  });

  for (const name in byTrack) {
    const a = byTrack[name];
    const endingQty = a.lastLayers.reduce((sum, l) => sum + l.qty, 0);
    checkTrue(`L3 run#${i} track=${name}: stok akhir (${endingQty}) = masuk ${a.qtyIn} - keluar ${a.qtyOut}`, endingQty === a.qtyIn - a.qtyOut);
    if (a.purchase > 0) {
      const endingValue = a.lastLayers.reduce((sum, l) => sum + l.qty * l.unitCost, 0);
      const cogsFromStockCard = a.purchase - endingValue;
      l3.stockCardChecks.push({ totalCogsFromJournal: a.cogsJournal, cogsFromStockCard, method: company.inventoryMethod });
    }
  }
}

checkTrue(`L3: 0 transaksi tidak balans (dari ${l3.totalTransactions})`, l3.imbalanced === 0, l3);
checkTrue(`L3: FIFO kepakai (${l3.methodDist.FIFO}x dari ${L3_RUNS})`, l3.methodDist.FIFO > L3_RUNS * 0.3, l3.methodDist);
checkTrue(`L3: AVG kepakai (${l3.methodDist.AVG}x dari ${L3_RUNS})`, l3.methodDist.AVG > L3_RUNS * 0.3, l3.methodDist);
checkTrue(
  `L3: sebagian skenario beli bahan baku >=2x (regresi thd perbaikan scenarioGenerator.js)`,
  Object.entries(l3.rawPurchaseCountDist).filter(([k]) => Number(k) >= 2).reduce((s, [, v]) => s + v, 0) > L3_RUNS * 0.3,
  l3.rawPurchaseCountDist
);
checkTrue(
  `L3: sebagian skenario transfer ke Barang Jadi >=2x`,
  Object.entries(l3.fgTransferCountDist).filter(([k]) => Number(k) >= 2).reduce((s, [, v]) => s + v, 0) > 0,
  l3.fgTransferCountDist
);

const rawMultiPct = l3.rawTotal > 0 ? (l3.rawMultiBatch / l3.rawTotal) * 100 : 0;
const fgMultiPct = l3.fgTotal > 0 ? (l3.fgMultiBatch / l3.fgTotal) * 100 : 0;
checkTrue(`L3: sebagian pemakaian Bahan Baku ke produksi menyentuh >1 batch (aktual ${rawMultiPct.toFixed(1)}%)`, rawMultiPct >= 10, { rawMultiBatch: l3.rawMultiBatch, rawTotal: l3.rawTotal });
checkTrue(`L3: sebagian penjualan Barang Jadi menyentuh >1 batch (aktual ${fgMultiPct.toFixed(1)}%)`, fgMultiPct >= 10, { fgMultiBatch: l3.fgMultiBatch, fgTotal: l3.fgTotal });

let l3FifoMismatch = 0, l3AvgMismatch = 0;
for (const chk of l3.stockCardChecks) {
  const diff = Math.abs(chk.totalCogsFromJournal - chk.cogsFromStockCard);
  if (chk.method === 'FIFO') { if (diff > 1) l3FifoMismatch++; }
  else { if (diff > Math.max(50, chk.totalCogsFromJournal * 0.005)) l3AvgMismatch++; }
}
checkTrue(`L3 FIFO: 0 track mismatch (dari ${l3.stockCardChecks.filter(c => c.method === 'FIFO').length})`, l3FifoMismatch === 0, { l3FifoMismatch });
checkTrue(`L3 AVG: 0 track di luar toleransi (dari ${l3.stockCardChecks.filter(c => c.method === 'AVG').length})`, l3AvgMismatch === 0, { l3AvgMismatch });

// ============================================================================
// Ringkasan
// ============================================================================
console.log(`\n========== RESULTS: ${pass} passed, ${fail} failed ==========`);
if (fail > 0) process.exit(1);
