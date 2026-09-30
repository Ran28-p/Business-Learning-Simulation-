/**
 * Dataset Penjualan Fiktif — untuk Latihan Pivot Table & Dashboard.
 * PRNG mulberry32 dipakai supaya dataset bisa dibuat ulang persis sama (konsisten
 * dengan pola yang sudah dipakai di js/dataset-generator.js pada modul latihan Excel utama).
 */
(function () {
  'use strict';

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const WILAYAH = ['Jabodetabek', 'Jawa Barat', 'Jawa Timur', 'Sumatra', 'Kalimantan'];
  const SALES_REP = ['Dewi', 'Budi', 'Siti', 'Rian', 'Made'];
  const KATEGORI_PRODUK = {
    Elektronik: [
      { nama: 'Kabel HDMI 2m', harga: 45000 },
      { nama: 'Power Bank 10000mAh', harga: 185000 },
      { nama: 'Mouse Wireless', harga: 120000 },
      { nama: 'Speaker Bluetooth Mini', harga: 210000 },
    ],
    'Alat Tulis Kantor': [
      { nama: 'Kertas A4 (rim)', harga: 52000 },
      { nama: 'Pulpen Gel (lusin)', harga: 36000 },
      { nama: 'Map Plastik (pak)', harga: 28000 },
      { nama: 'Stapler Sedang', harga: 27000 },
    ],
    Furnitur: [
      { nama: 'Kursi Kantor Standar', harga: 650000 },
      { nama: 'Meja Lipat', harga: 420000 },
      { nama: 'Rak Arsip 3 Susun', harga: 380000 },
    ],
    'Perlengkapan Rumah': [
      { nama: 'Lampu LED 12W', harga: 32000 },
      { nama: 'Sapu Lantai', harga: 25000 },
      { nama: 'Tempat Sampah 20L', harga: 48000 },
    ],
  };
  const KATEGORI_LIST = Object.keys(KATEGORI_PRODUK);
  const BULAN_NAMA = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }

  function generateSalesDataset(seed) {
    const rng = mulberry32(seed || 20250601);
    const rows = [];
    let idNo = 1;
    for (let bulanIdx = 0; bulanIdx < BULAN_NAMA.length; bulanIdx++) {
      const rowsThisMonth = randInt(rng, 26, 34);
      for (let i = 0; i < rowsThisMonth; i++) {
        const tanggal = `2025-${String(bulanIdx + 1).padStart(2, '0')}-${String(randInt(rng, 1, 28)).padStart(2, '0')}`;
        const kategori = pick(rng, KATEGORI_LIST);
        const produk = pick(rng, KATEGORI_PRODUK[kategori]);
        const qty = randInt(rng, 1, 18);
        const hargaVariasi = Math.round(produk.harga * (0.95 + rng() * 0.1)); // sedikit variasi harga realistis
        const total = qty * hargaVariasi;
        rows.push({
          no: idNo++,
          tanggal,
          bulan: BULAN_NAMA[bulanIdx],
          wilayah: pick(rng, WILAYAH),
          salesRep: pick(rng, SALES_REP),
          kategori,
          produk: produk.nama,
          qty,
          harga: hargaVariasi,
          total,
        });
      }
    }
    return rows;
  }

  window.PivotDashboardData = {
    generateSalesDataset,
    WILAYAH,
    SALES_REP,
    KATEGORI_LIST,
    BULAN_NAMA,
  };
})();
