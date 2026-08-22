/**
 * Mode Latihan — case studies for the invoicing/PPN simulator.
 * Each case describes a scenario in Indonesian and the expected figures
 * a correctly-built invoice should produce, used by js/tax/latihanEngine.js
 * to score the student's work.
 */
export const TAX_CASE_STUDIES = [
  {
    id: 'case-1',
    title: 'Penjualan Kredit kepada Pelanggan PKP',
    narrative: `
      <p><strong>PT Nusantara Digital</strong> merupakan perusahaan <strong>PKP</strong>.</p>
      <p>Pada tanggal <strong>10 Agustus 2026</strong>, perusahaan menjual <strong>10 unit Produk A</strong>
      dengan harga per unit <strong>Rp2.000.000</strong> kepada <strong>PT Maju Bersama</strong> (status pelanggan: PKP),
      secara kredit, tanpa diskon.</p>
      <p>Buat invoice dan lakukan pencatatan transaksi secara benar.</p>
    `,
    setup: { companyTaxStatus: 'PKP' },
    expected: {
      dppTotal: 20000000,
      vatTotal: 2400000,
      grandTotal: 22400000,
      taxTreatment: 'PPN_DIKENAKAN',
      pajakKeluaranTercatat: true
    }
  },
  {
    id: 'case-2',
    title: 'Penjualan Tunai kepada Pelanggan Non-PKP (Perusahaan Tetap PKP)',
    narrative: `
      <p><strong>PT Nusantara Digital (PKP)</strong> menjual secara <strong>tunai</strong> pada
      <strong>15 Agustus 2026</strong> berupa <strong>5 unit Produk B</strong> seharga <strong>Rp1.500.000</strong> per unit
      kepada pelanggan perorangan, <strong>Budi Santoso</strong> (status: Non-PKP), tanpa diskon.</p>
      <p>Ingat: status Non-PKP pembeli tidak membebaskan transaksi dari PPN — perlakuan PPN mengikuti status penjual.</p>
    `,
    setup: { companyTaxStatus: 'PKP' },
    expected: {
      dppTotal: 7500000,
      vatTotal: 900000,
      grandTotal: 8400000,
      taxTreatment: 'PPN_DIKENAKAN',
      pajakKeluaranTercatat: true
    }
  },
  {
    id: 'case-3',
    title: 'Penjualan oleh Perusahaan Non-PKP',
    narrative: `
      <p><strong>UD Sumber Rejeki</strong> berstatus <strong>Non-PKP</strong>.</p>
      <p>Pada <strong>20 Agustus 2026</strong>, UD Sumber Rejeki menjual <strong>8 unit Produk C</strong>
      seharga <strong>Rp500.000</strong> per unit secara kredit kepada <strong>Toko Makmur</strong>.</p>
      <p>Karena perusahaan Non-PKP, PPN tidak boleh dihitung dan Pajak Keluaran tidak boleh dibuat —
      transaksi tetap dicatat sebagai penjualan biasa.</p>
    `,
    setup: { companyTaxStatus: 'NON_PKP' },
    expected: {
      dppTotal: 4000000,
      vatTotal: 0,
      grandTotal: 4000000,
      taxTreatment: 'NON_PPN',
      pajakKeluaranTercatat: false
    }
  },
  {
    id: 'case-4',
    title: 'Penjualan dengan Diskon 10%',
    narrative: `
      <p><strong>PT Nusantara Digital (PKP)</strong> menjual <strong>4 unit Produk D</strong> seharga
      <strong>Rp3.000.000</strong> per unit kepada <strong>CV Sejahtera</strong> (PKP) secara kredit pada
      <strong>25 Agustus 2026</strong>, dengan diskon <strong>10%</strong> dari nilai penjualan.</p>
    `,
    setup: { companyTaxStatus: 'PKP' },
    expected: {
      dppTotal: 10800000,
      vatTotal: 1296000,
      grandTotal: 12096000,
      taxTreatment: 'PPN_DIKENAKAN',
      pajakKeluaranTercatat: true
    }
  }
];

export function getCaseStudyById(id) {
  return TAX_CASE_STUDIES.find(c => c.id === id) || null;
}
