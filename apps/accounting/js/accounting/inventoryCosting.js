/**
 * inventoryCosting.js
 *
 * Modul murni untuk kalkulasi HPP (Harga Pokok Penjualan) berbasis
 * metode persediaan: FIFO (First-In-First-Out) dan Rata-rata Tertimbang
 * Perpetual (Weighted Average, dihitung ulang setiap ada pembelian baru).
 *
 * TIDAK ADA dependency ke DOM / localStorage / apa pun di luar modul ini.
 * Semua fungsi murni: menerima state (layers) dan mengembalikan state baru,
 * tidak pernah memutasi array/objek yang di-passing masuk.
 *
 * Bentuk satu "layer" (batch persediaan):
 *   {
 *     id: string,        // id unik batch, dipakai untuk breakdown & tracing
 *     qty: number,        // sisa kuantitas di batch ini
 *     unitCost: number,   // harga per unit historis batch ini (rupiah)
 *     date: string,       // tanggal pembelian (ISO atau format apa pun,
 *                          // hanya dipakai untuk urutan FIFO & tampilan)
 *   }
 *
 * Catatan desain rata-rata tertimbang (WEIGHTED AVERAGE PERPETUAL):
 * Harga rata-rata TIDAK disimpan sebagai satu angka terpisah — ia selalu
 * dihitung ulang on-the-fly dari layers yang masih tersisa (totalValue /
 * totalQty). Ini otomatis "recompute setiap ada pembelian baru" karena
 * addPurchaseLayer() menambah layer baru sebelum konsumsi berikutnya
 * dihitung. Saat sebuah penjualan mengonsumsi persediaan, qty dikurangi
 * dari SETIAP layer secara proporsional (bukan FIFO-order) sehingga
 * invarian "total value tersisa = qty tersisa x avgCost" tetap terjaga
 * untuk perhitungan rata-rata berikutnya. Ini penting: kalau qty dikurangi
 * FIFO-order tapi HPP dihitung pakai avgCost, nilai persediaan akan drift
 * dan rata-rata berikutnya jadi salah.
 */

/** Toleransi pembulatan rupiah (dibulatkan ke rupiah penuh). */
function roundRupiah(n) {
  return Math.round(n);
}

/**
 * Menambahkan satu batch pembelian baru ke layers.
 * Method-agnostic: dipakai sama untuk perusahaan FIFO maupun AVG,
 * karena bedanya cuma ada di fungsi consume-nya, bukan di cara
 * pembelian dicatat.
 *
 * @param {Array} layers - layers persediaan saat ini (tidak dimutasi)
 * @param {{qty: number, unitCost: number, date: string, id?: string}} purchase
 * @returns {Array} layers baru (layers lama + 1 layer baru di akhir)
 */
function addPurchaseLayer(layers, { qty, unitCost, date, id }) {
  if (!(qty > 0)) {
    throw new Error(`addPurchaseLayer: qty harus > 0, diterima ${qty}`);
  }
  if (!(unitCost >= 0)) {
    throw new Error(`addPurchaseLayer: unitCost harus >= 0, diterima ${unitCost}`);
  }
  const newLayer = {
    id: id || `layer-${date || ''}-${layers.length}-${Math.random().toString(36).slice(2, 8)}`,
    qty,
    unitCost,
    date,
  };
  return [...layers, newLayer];
}

/** Total kuantitas tersisa di seluruh layers. */
function getTotalStock(layers) {
  return layers.reduce((sum, l) => sum + l.qty, 0);
}

/** Total nilai (rupiah) persediaan tersisa di seluruh layers. */
function getInventoryValue(layers) {
  return layers.reduce((sum, l) => sum + l.qty * l.unitCost, 0);
}

/**
 * Guard bersama: menolak penjualan yang melebihi stok tersedia.
 * Dipanggil di awal consumeFIFO/consumeWeightedAverage supaya generator
 * transaksi tidak pernah bisa menghasilkan skenario mustahil (jual lebih
 * banyak dari stok yang ada).
 *
 * @throws {Error} kalau qtySold <= 0 atau qtySold > stok tersedia
 */
function assertSufficientStock(layers, qtySold) {
  if (!(qtySold > 0)) {
    throw new Error(`qtySold harus > 0, diterima ${qtySold}`);
  }
  const totalStock = getTotalStock(layers);
  if (qtySold > totalStock) {
    throw new Error(
      `Stok tidak cukup: mencoba menjual ${qtySold} unit, stok tersedia hanya ${totalStock} unit.`
    );
  }
}

/**
 * Konsumsi persediaan dengan metode FIFO: batch tertua (indeks pertama
 * di array layers) diambil lebih dulu.
 *
 * @param {Array} layers - layers persediaan saat ini (tidak dimutasi)
 * @param {number} qtySold - kuantitas yang dijual
 * @returns {{cogs: number, updatedLayers: Array, breakdown: Array}}
 *   breakdown: daftar {layerId, date, qtyTaken, unitCost, subtotal} —
 *   dari batch mana saja HPP ini diambil, urut dari batch tertua.
 */
function consumeFIFO(layers, qtySold) {
  assertSufficientStock(layers, qtySold);

  let remaining = qtySold;
  let cogs = 0;
  const breakdown = [];
  const updatedLayers = [];

  for (const layer of layers) {
    if (remaining <= 0) {
      // Sudah cukup, sisa layer tidak tersentuh.
      updatedLayers.push({ ...layer });
      continue;
    }
    const qtyTaken = Math.min(layer.qty, remaining);
    const subtotal = qtyTaken * layer.unitCost;
    cogs += subtotal;
    remaining -= qtyTaken;

    if (qtyTaken > 0) {
      breakdown.push({
        layerId: layer.id,
        date: layer.date,
        qtyTaken,
        unitCost: layer.unitCost,
        subtotal,
      });
    }

    const sisaQty = layer.qty - qtyTaken;
    if (sisaQty > 0) {
      updatedLayers.push({ ...layer, qty: sisaQty });
    }
    // Kalau sisaQty === 0, layer habis dan tidak dimasukkan ke updatedLayers.
  }

  return {
    cogs: roundRupiah(cogs),
    updatedLayers,
    breakdown,
    method: 'FIFO',
  };
}

/**
 * Konsumsi persediaan dengan metode Rata-rata Tertimbang Perpetual.
 * Harga rata-rata dihitung dari SEMUA layers yang tersisa saat ini
 * (totalValue / totalQty), lalu qty dikurangi dari setiap layer secara
 * PROPORSIONAL (bukan FIFO-order) supaya nilai persediaan tersisa tetap
 * konsisten dengan avgCost untuk perhitungan rata-rata berikutnya.
 *
 * @param {Array} layers - layers persediaan saat ini (tidak dimutasi)
 * @param {number} qtySold - kuantitas yang dijual
 * @returns {{cogs: number, updatedLayers: Array, breakdown: Array, avgCost: number}}
 */
function consumeWeightedAverage(layers, qtySold) {
  assertSufficientStock(layers, qtySold);

  const totalQty = getTotalStock(layers);
  const totalValue = getInventoryValue(layers);
  const avgCost = totalValue / totalQty;

  const cogs = roundRupiah(avgCost * qtySold);

  const fraction = qtySold / totalQty;
  const breakdown = [];
  const updatedLayers = [];

  // Kurangi qty tiap layer secara proporsional. Karena qty per layer harus
  // integer, pakai METODE SISA TERBESAR (largest remainder method):
  // ambil floor(qty*fraction) dulu per layer, lalu unit-unit sisa yang
  // "hilang" akibat pembulatan ke bawah dibagikan satu-satu ke layer
  // dengan sisa desimal terbesar. Ini meminimalkan drift dibanding
  // "layer terakhir menyerap semua sisa", sehingga total nilai yang
  // dikeluarkan dari layers tetap sangat dekat dengan qtySold*avgCost
  // walau qty harus tetap bilangan bulat.
  const qtyIndices = layers.map((_, idx) => idx).filter((idx) => layers[idx].qty > 0);
  const floatTaken = qtyIndices.map((idx) => layers[idx].qty * fraction);
  const floorTaken = floatTaken.map(Math.floor);
  let deficit = qtySold - floorTaken.reduce((a, b) => a + b, 0);

  // Urutkan indeks (dalam qtyIndices) berdasarkan sisa desimal terbesar,
  // lalu bagikan +1 unit ke sebanyak `deficit` layer teratas.
  const remainderOrder = qtyIndices
    .map((_, i) => i)
    .sort((a, b) => (floatTaken[b] - floorTaken[b]) - (floatTaken[a] - floorTaken[a]));

  const qtyTakenByIdx = new Map();
  qtyIndices.forEach((idx, i) => qtyTakenByIdx.set(idx, floorTaken[i]));
  for (let i = 0; i < remainderOrder.length && deficit > 0; i++) {
    const i2 = remainderOrder[i];
    const idx = qtyIndices[i2];
    const layerQty = layers[idx].qty;
    const current = qtyTakenByIdx.get(idx);
    if (current < layerQty) {
      qtyTakenByIdx.set(idx, current + 1);
      deficit--;
    }
  }
  // Kalau masih ada deficit (kasus ekstrem: semua layer sudah maksimum),
  // sisanya dipaksakan ke layer manapun yang masih punya kapasitas.
  for (let idx of qtyIndices) {
    if (deficit <= 0) break;
    const layerQty = layers[idx].qty;
    const current = qtyTakenByIdx.get(idx);
    const extra = Math.min(deficit, layerQty - current);
    if (extra > 0) {
      qtyTakenByIdx.set(idx, current + extra);
      deficit -= extra;
    }
  }

  layers.forEach((layer, idx) => {
    const qtyTaken = qtyTakenByIdx.get(idx) || 0;

    if (qtyTaken > 0) {
      breakdown.push({
        layerId: layer.id,
        date: layer.date,
        qtyTaken,
        unitCost: roundRupiah(avgCost * 100) / 100, // avgCost dgn 2 desimal utk transparansi
        subtotal: roundRupiah(qtyTaken * avgCost),
      });
    }

    const sisaQty = layer.qty - qtyTaken;
    if (sisaQty > 0) {
      // PENTING: unitCost sisa layer di-set ke avgCost (presisi penuh,
      // TIDAK dibulatkan), bukan dipertahankan ke harga historis layer
      // itu sendiri. Ini bukan cuma soal presisi tampilan — tanpa ini,
      // largest-remainder method di atas mengoptimalkan pembulatan QTY,
      // bukan pembulatan NILAI, jadi kalau layers punya harga historis
      // yang jauh berbeda (mis. Rp20.000 vs Rp150.000), 1 unit yang
      // "salah" dialokasikan ke layer yang salah bisa bikin nilai
      // persediaan tersisa meleset ratusan ribu rupiah dari cogs yang
      // dicatat di jurnal — invarian "rata-rata tertimbang" (semua unit
      // yang tersisa dihargai SAMA di harga rata-rata saat ini,
      // berapa pun batch asalnya) jadi rusak. Dengan unitCost di-reset ke
      // avgCost di sini, nilai sisa persediaan otomatis konsisten dengan
      // cogs yang dicatat (meleset paling banter sub-rupiah dari
      // pembulatan cogs), berapa pun besar selisih harga antar-batch asli.
      updatedLayers.push({ ...layer, qty: sisaQty, unitCost: avgCost });
    }
  });

  return {
    cogs,
    updatedLayers,
    breakdown,
    avgCost,
    method: 'AVG',
  };
}

/**
 * Mengurangi layer persediaan akibat retur pembelian (barang yang baru
 * dibeli dikembalikan ke supplier). Pendekatan yang dipakai: LIFO-retur —
 * mengurangi dari batch yang PALING BARU dibeli dulu (kebalikan urutan
 * konsumsi FIFO), karena secara operasional retur biasanya terjadi tidak
 * lama setelah pembelian sehingga yang paling mungkin diretur adalah
 * batch yang baru masuk.
 *
 * @param {Array} layers - layers persediaan saat ini (tidak dimutasi)
 * @param {number} qtyReturned - kuantitas yang diretur ke supplier
 * @returns {{updatedLayers: Array, breakdown: Array, returnValue: number}}
 */
function consumePurchaseReturn(layers, qtyReturned) {
  assertSufficientStock(layers, qtyReturned);

  let remaining = qtyReturned;
  let returnValue = 0;
  const breakdown = [];
  // Iterasi dari BELAKANG (layer terbaru dulu) — kebalikan dari FIFO.
  const updatedLayers = layers.map((l) => ({ ...l }));

  for (let idx = updatedLayers.length - 1; idx >= 0 && remaining > 0; idx--) {
    const layer = updatedLayers[idx];
    if (layer.qty <= 0) continue;
    const qtyTaken = Math.min(layer.qty, remaining);
    const subtotal = qtyTaken * layer.unitCost;
    returnValue += subtotal;
    remaining -= qtyTaken;
    layer.qty -= qtyTaken;

    breakdown.push({
      layerId: layer.id,
      date: layer.date,
      qtyTaken,
      unitCost: layer.unitCost,
      subtotal,
    });
  }

  return {
    updatedLayers: updatedLayers.filter((l) => l.qty > 0),
    breakdown,
    returnValue: roundRupiah(returnValue),
  };
}

export {
  addPurchaseLayer,
  consumeFIFO,
  consumeWeightedAverage,
  consumePurchaseReturn,
  getTotalStock,
  getInventoryValue,
  assertSufficientStock,
};
