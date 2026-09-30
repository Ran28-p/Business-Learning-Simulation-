// tests/test-inventory-costing.mjs
// Pure-function test suite untuk js/accounting/inventoryCosting.js.
// Tidak butuh shim DOM/localStorage apa pun — modul yang ditest murni.

import {
  addPurchaseLayer,
  consumeFIFO,
  consumeWeightedAverage,
  consumePurchaseReturn,
  getTotalStock,
  getInventoryValue,
} from '../js/accounting/inventoryCosting.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  assert(
    actual === expected,
    `${message} (expected ${expected}, got ${actual})`
  );
}

function assertClose(actual, expected, message, tolerance = 1) {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${message} (expected ~${expected}, got ${actual})`
  );
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

// ============================================================
// 1. FIFO: beli 3 batch harga beda-beda, jual sebagian, HPP dari batch tertua
// ============================================================
section('FIFO — konsumsi dari batch tertua dulu');
{
  let layers = [];
  layers = addPurchaseLayer(layers, { qty: 100, unitCost: 1000, date: '2026-01-01' });
  layers = addPurchaseLayer(layers, { qty: 50, unitCost: 1200, date: '2026-01-10' });
  layers = addPurchaseLayer(layers, { qty: 80, unitCost: 1500, date: '2026-01-20' });

  // Jual 120 unit: harus ambil 100 dari batch1 (1000) + 20 dari batch2 (1200)
  const result = consumeFIFO(layers, 120);
  const expectedCogs = 100 * 1000 + 20 * 1200; // 124.000
  assertEqual(result.cogs, expectedCogs, 'HPP FIFO 120 unit harus 100@1000 + 20@1200');
  assertEqual(result.breakdown.length, 2, 'breakdown harus menyentuh 2 batch');
  assertEqual(result.breakdown[0].qtyTaken, 100, 'batch pertama diambil penuh 100 unit');
  assertEqual(result.breakdown[0].unitCost, 1000, 'batch pertama pakai harga historisnya sendiri (1000)');
  assertEqual(result.breakdown[1].qtyTaken, 20, 'batch kedua diambil sisa 20 unit');
  assertEqual(result.breakdown[1].unitCost, 1200, 'batch kedua pakai harga historisnya sendiri (1200)');

  // Sisa layer harus benar: batch1 habis (hilang dari array), batch2 sisa 30, batch3 utuh 80
  assertEqual(result.updatedLayers.length, 2, 'batch1 harus hilang karena habis, sisa 2 layer');
  assertEqual(result.updatedLayers[0].qty, 30, 'batch2 harus sisa 30 unit (50-20)');
  assertEqual(result.updatedLayers[0].unitCost, 1200, 'batch2 sisa tetap di harga historisnya 1200');
  assertEqual(result.updatedLayers[1].qty, 80, 'batch3 tidak tersentuh, tetap 80 unit');
  assertEqual(result.updatedLayers[1].unitCost, 1500, 'batch3 tetap di harga historisnya 1500');
}

// ============================================================
// 2. Rata-rata tertimbang: avg harus re-hitung tiap ada pembelian baru
// ============================================================
section('Rata-rata tertimbang — recompute setiap ada pembelian baru (perpetual, bukan periodik)');
{
  let layers = [];
  // Pembelian 1: 100 unit @ 1000 → avg = 1000
  layers = addPurchaseLayer(layers, { qty: 100, unitCost: 1000, date: '2026-01-01' });

  // Jual 40 unit di avg 1000 → cogs = 40.000
  let r1 = consumeWeightedAverage(layers, 40);
  assertEqual(r1.cogs, 40000, 'penjualan pertama pakai avg awal 1000 (belum ada pembelian baru)');
  assertClose(r1.avgCost, 1000, 'avgCost sebelum pembelian baru harus 1000');
  layers = r1.updatedLayers; // sisa 60 unit @1000

  // Pembelian 2: 60 unit @ 1600 → avg harus re-hitung:
  // (60*1000 + 60*1600) / 120 = (60000+96000)/120 = 1300
  layers = addPurchaseLayer(layers, { qty: 60, unitCost: 1600, date: '2026-01-15' });
  assertEqual(getTotalStock(layers), 120, 'total stok setelah pembelian kedua harus 120');
  assertEqual(getInventoryValue(layers), 156000, 'total nilai persediaan setelah pembelian kedua harus 156.000');

  // Jual 50 unit sekarang harus pakai avg BARU (1300), bukan avg lama (1000)
  const r2 = consumeWeightedAverage(layers, 50);
  assertClose(r2.avgCost, 1300, 'avg harus re-hitung ulang jadi 1300 setelah pembelian kedua (bukan tetap 1000)');
  assertEqual(r2.cogs, 65000, 'HPP penjualan kedua = 50 x 1300 = 65.000');

  // Invarian: nilai persediaan tersisa harus konsisten dgn qty tersisa x avg
  const sisaQty = getTotalStock(r2.updatedLayers);
  const sisaValue = getInventoryValue(r2.updatedLayers);
  assertEqual(sisaQty, 70, 'sisa qty setelah kedua penjualan harus 120-50=70');
  assertClose(sisaValue, sisaQty * 1300, 'nilai persediaan tersisa harus konsisten dgn avg terakhir (invarian proporsional)', 5);
}

// ============================================================
// 3. Retur pembelian mengurangi layer yang benar (LIFO-retur: batch terbaru dulu)
// ============================================================
section('Retur pembelian — mengurangi batch yang PALING BARU dibeli dulu');
{
  let layers = [];
  layers = addPurchaseLayer(layers, { qty: 100, unitCost: 1000, date: '2026-01-01', id: 'batch-A' });
  layers = addPurchaseLayer(layers, { qty: 50, unitCost: 1200, date: '2026-01-10', id: 'batch-B' });

  // Retur 30 unit → harus ambil dari batch-B (paling baru), bukan batch-A
  const result = consumePurchaseReturn(layers, 30);
  assertEqual(result.breakdown.length, 1, 'retur 30 unit cukup diambil dari 1 batch (batch terbaru)');
  assertEqual(result.breakdown[0].layerId, 'batch-B', 'retur harus mengurangi batch-B (terbaru) dulu, bukan batch-A');
  assertEqual(result.returnValue, 30 * 1200, 'nilai retur harus pakai harga batch-B (1200)');

  const batchB = result.updatedLayers.find((l) => l.id === 'batch-B');
  const batchA = result.updatedLayers.find((l) => l.id === 'batch-A');
  assertEqual(batchB.qty, 20, 'batch-B harus sisa 20 unit (50-30)');
  assertEqual(batchA.qty, 100, 'batch-A tidak boleh tersentuh sama sekali');

  // Retur yang melebihi 1 batch harus lanjut ke batch sebelumnya
  const result2 = consumePurchaseReturn(layers, 120); // 50 dari batch-B + 70 dari batch-A
  assertEqual(result2.breakdown.length, 2, 'retur 120 unit harus menyentuh 2 batch');
  assertEqual(result2.breakdown[0].layerId, 'batch-B', 'batch-B tetap diambil duluan (LIFO-retur)');
  assertEqual(result2.breakdown[0].qtyTaken, 50, 'batch-B diambil habis 50 unit');
  assertEqual(result2.breakdown[1].layerId, 'batch-A', 'lanjut ke batch-A setelah batch-B habis');
  assertEqual(result2.breakdown[1].qtyTaken, 70, 'sisa 70 unit diambil dari batch-A');
}

// ============================================================
// 4. Kasus tepi
// ============================================================
section('Kasus tepi — jual persis sisa stok terakhir & jual melebihi stok');
{
  // 4a. Jual persis sisa stok terakhir (FIFO)
  let layers = [];
  layers = addPurchaseLayer(layers, { qty: 50, unitCost: 900, date: '2026-01-01' });
  layers = addPurchaseLayer(layers, { qty: 30, unitCost: 950, date: '2026-01-05' });
  const totalStock = getTotalStock(layers); // 80
  const rExact = consumeFIFO(layers, totalStock);
  assertEqual(rExact.updatedLayers.length, 0, 'jual persis semua stok harus menyisakan 0 layer');
  assertEqual(getTotalStock(rExact.updatedLayers), 0, 'stok tersisa harus 0 setelah jual semua');
  assertEqual(rExact.cogs, 50 * 900 + 30 * 950, 'HPP jual semua stok harus jumlah seluruh nilai persediaan');

  // 4b. Jual persis sisa stok terakhir (weighted average)
  let layers2 = [];
  layers2 = addPurchaseLayer(layers2, { qty: 40, unitCost: 700, date: '2026-01-01' });
  const rExactAvg = consumeWeightedAverage(layers2, 40);
  assertEqual(rExactAvg.updatedLayers.length, 0, 'AVG: jual persis semua stok harus menyisakan 0 layer');
  assertEqual(rExactAvg.cogs, 40 * 700, 'AVG: HPP jual semua stok (1 batch) harus qty x unitCost batch itu');

  // 4c. Jual melebihi stok → harus DITOLAK (throw), bukan menghasilkan HPP negatif/aneh
  let threwFIFO = false;
  try {
    consumeFIFO(layers, 999);
  } catch (e) {
    threwFIFO = true;
  }
  assert(threwFIFO, 'consumeFIFO harus throw kalau qtySold > stok tersedia');

  let threwAVG = false;
  try {
    consumeWeightedAverage(layers2, 999);
  } catch (e) {
    threwAVG = true;
  }
  assert(threwAVG, 'consumeWeightedAverage harus throw kalau qtySold > stok tersedia');

  let threwReturn = false;
  try {
    consumePurchaseReturn(layers, 999);
  } catch (e) {
    threwReturn = true;
  }
  assert(threwReturn, 'consumePurchaseReturn harus throw kalau qtyReturned > stok tersedia');

  // 4d. qtySold <= 0 juga harus ditolak
  let threwZero = false;
  try {
    consumeFIFO(layers, 0);
  } catch (e) {
    threwZero = true;
  }
  assert(threwZero, 'consumeFIFO harus throw kalau qtySold = 0');
}

// ============================================================
// 5. End-to-end: generate transaksi utk 1 "perusahaan" penuh,
//    jumlahkan semua HPP, cocokkan dgn kartu persediaan
// ============================================================
section('End-to-end — total HPP di jurnal harus sinkron dgn kartu persediaan (FIFO & AVG)');

function runEndToEnd(method) {
  const consumeFn = method === 'FIFO' ? consumeFIFO : consumeWeightedAverage;

  let layers = [];
  let totalCogsFromJournal = 0;

  // Simulasikan urutan transaksi seperti yang akan dihasilkan transactionGenerator:
  // beli, beli, jual, beli, jual, jual, beli, jual
  const script = [
    { type: 'BUY', qty: 200, unitCost: 1000 },
    { type: 'BUY', qty: 100, unitCost: 1100 },
    { type: 'SELL', qty: 150 },
    { type: 'BUY', qty: 80, unitCost: 1300 },
    { type: 'SELL', qty: 90 },
    { type: 'SELL', qty: 60 },
    { type: 'BUY', qty: 120, unitCost: 1250 },
    { type: 'SELL', qty: 100 },
  ];

  for (const step of script) {
    if (step.type === 'BUY') {
      layers = addPurchaseLayer(layers, {
        qty: step.qty,
        unitCost: step.unitCost,
        date: '2026-02-01',
      });
    } else {
      const result = consumeFn(layers, step.qty);
      totalCogsFromJournal += result.cogs;
      layers = result.updatedLayers;
    }
  }

  // "Kartu persediaan" cross-check: totalPembelian - totalRetur - nilaiSisaAkhir
  // harus sama dengan total HPP yang tercatat di jurnal.
  const totalPurchaseValue = script
    .filter((s) => s.type === 'BUY')
    .reduce((sum, s) => sum + s.qty * s.unitCost, 0);
  const endingInventoryValue = getInventoryValue(layers);
  const cogsFromStockCard = totalPurchaseValue - endingInventoryValue;

  return { totalCogsFromJournal, cogsFromStockCard, endingInventoryValue };
}

{
  const fifoResult = runEndToEnd('FIFO');
  assertClose(
    fifoResult.totalCogsFromJournal,
    fifoResult.cogsFromStockCard,
    `FIFO: total HPP jurnal (${fifoResult.totalCogsFromJournal}) harus sinkron dgn kartu persediaan (${fifoResult.cogsFromStockCard})`,
    1
  );

  // Catatan toleransi: rata-rata tertimbang butuh qty per-layer tetap
  // bilangan bulat (largest remainder method dipakai untuk meminimalkan
  // drift), sementara cogs dihitung dari avgCost kontinu (avgCost*qtySold).
  // Setelah beberapa transaksi berantai, selisih pembulatan kecil bisa
  // terakumulasi — ini NORMAL dan sama seperti "selisih pembulatan" yang
  // lumrah di sistem rata-rata tertimbang perpetual sungguhan. Toleransi
  // di sini (0.1% dari total HPP) memverifikasi bahwa drift tetap kecil,
  // bukan bahwa drift-nya nol mutlak.
  const avgResult = runEndToEnd('AVG');
  const avgTolerance = Math.max(50, avgResult.totalCogsFromJournal * 0.001);
  assertClose(
    avgResult.totalCogsFromJournal,
    avgResult.cogsFromStockCard,
    `AVG: total HPP jurnal (${avgResult.totalCogsFromJournal}) harus sinkron dgn kartu persediaan (${avgResult.cogsFromStockCard}) dlm toleransi pembulatan wajar`,
    avgTolerance
  );

  // Sanity check tambahan: HPP FIFO dan AVG boleh beda, tapi keduanya harus
  // menghasilkan nilai persediaan akhir yang masuk akal (tidak negatif)
  assert(fifoResult.endingInventoryValue >= 0, 'FIFO: nilai persediaan akhir tidak boleh negatif');
  assert(avgResult.endingInventoryValue >= 0, 'AVG: nilai persediaan akhir tidak boleh negatif');
}

// ============================================================
// Ringkasan
// ============================================================
console.log(`\n=== Hasil: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log('\nDaftar kegagalan:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('Semua assertion inventoryCosting.js lolos.');
  process.exit(0);
}
