// Pengujian logika otomatis (Node.js, ES modules asli) untuk js/tax/* — mesin
// PPN (vatEngine.js), generator jurnal invoice/pembelian (journalEngine.js),
// dan skor Mode Latihan (latihanEngine.js). Sebelum file ini dibuat, seluruh
// folder js/tax/ (~2.000 baris) tidak punya test sama sekali — hanya siklus
// akuntansi inti (js/accounting/*) yang ditest di test-accounting-engine.mjs.
//
// js/tax/taxState.js menyimpan progres lewat localStorage (browser API) dan
// menampilkan toast lewat document (DOM API) kalau penyimpanan gagal — dua-
// duanya tidak ada di Node, jadi kita sediakan localStorage tiruan minimal
// SEBELUM meng-import supaya persistTaxState() berhasil "menyimpan" (ke
// tiruan itu) dan tidak pernah masuk ke jalur gagal-simpan yang memanggil
// showToast()/document.
//
// Jalankan: node tests/test-tax-module.mjs

function makeFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
}
globalThis.localStorage = makeFakeLocalStorage();

const { computeLineItem, computeDocumentTotals, getActiveVatRatePercent } = await import('../js/tax/vatEngine.js');
const { postInvoiceJournal, postPurchaseJournal } = await import('../js/tax/journalEngine.js');
const { scoreLatihanInvoice } = await import('../js/tax/latihanEngine.js');
const { getJournalEntries, addVatRate, getVatRates, deleteVatRate } = await import('../js/tax/taxState.js');
const { PAYMENT_METHOD } = await import('../js/tax/taxConstants.js');
const { TAX_CASE_STUDIES } = await import('../data/taxCaseStudies.js');

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL: ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function near(label, actual, expected, eps = 1) {
  const ok = Math.abs(actual - expected) <= eps;
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`FAIL: ${label}\n  expected ~ ${expected}\n  actual     ${actual}`);
  }
}

console.log('\n=== vatEngine: computeLineItem ===');
{
  const item = computeLineItem({ quantity: 10, unitPrice: 2000000, vatRatePercent: 12, vatApplies: true });
  check('10 x Rp2.000.000 -> gross', item.gross, 20000000);
  check('tanpa diskon -> DPP = gross', item.dpp, 20000000);
  near('PPN 12% dari DPP 20jt', item.vatAmount, 2400000);
  near('total = DPP + PPN', item.total, 22400000);
}
{
  const item = computeLineItem({ quantity: 5, unitPrice: 1000000, discountPercent: 10, vatRatePercent: 12, vatApplies: true });
  check('diskon 10% dari gross 5jt', item.discount, 500000);
  check('DPP setelah diskon', item.dpp, 4500000);
}
{
  const item = computeLineItem({ quantity: 1, unitPrice: 1000000, vatRatePercent: 12, vatApplies: false });
  check('vatApplies=false -> PPN 0 walau ada tarif', item.vatAmount, 0);
}
{
  const item = computeLineItem({ quantity: 2, unitPrice: 100000, discountAmount: 999999999, vatRatePercent: 12, vatApplies: true });
  check('diskon tidak boleh melebihi gross -> DPP minimal 0', item.dpp, 0);
}

console.log('\n=== vatEngine: computeDocumentTotals ===');
{
  const items = [
    computeLineItem({ quantity: 10, unitPrice: 2000000, vatRatePercent: 12, vatApplies: true }),
    computeLineItem({ quantity: 5, unitPrice: 1500000, vatRatePercent: 12, vatApplies: true })
  ];
  const totals = computeDocumentTotals(items);
  check('subtotal gabungan 2 baris', totals.subtotal, 27500000);
  near('PPN gabungan 2 baris', totals.vatTotal, 3300000);
  near('grand total gabungan', totals.grandTotal, 30800000);
}

console.log('\n=== vatEngine: getActiveVatRatePercent (jadwal tarif berdasarkan tanggal) ===');
{
  // Kunci perilaku default aplikasi apa adanya (taxState.js defaultState()):
  // PPN 11% berlaku 2022-04-01, lalu tarif EFEKTIF 11% (via DPP Nilai Lain,
  // PMK 131/2024) berlaku 2025-01-01 — bukan 12% nominal. Lihat komentar di
  // taxConstants.js/taxState.js untuk alasannya.
  near('default aplikasi: transaksi 2023 -> 11%', getActiveVatRatePercent('2023-06-15'), 11);
  near('default aplikasi: transaksi 2025 -> tetap 11% (tarif efektif, bukan 12% nominal)', getActiveVatRatePercent('2025-03-01'), 11);
}

console.log('\n=== journalEngine: postInvoiceJournal ===');
{
  const invoice = {
    id: 'INV-TEST-1', invoiceNumber: 'INV-202601-0001', invoiceDate: '2026-01-10',
    paymentMethod: PAYMENT_METHOD.TUNAI, grandTotal: 22400000, dppTotal: 20000000, vatTotal: 2400000,
    customer: { name: 'PT Maju Bersama' }
  };
  const entry = postInvoiceJournal(invoice);
  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
  check('jurnal invoice selalu balans (debit = kredit)', totalDebit, totalCredit);
  check('invoice tunai -> debit ke akun Kas', entry.lines[0].account, 'Kas');
  check('invoice tercatat di getJournalEntries()', getJournalEntries().some(e => e.id === entry.id), true);

  const invoiceKredit = { ...invoice, id: 'INV-TEST-2', paymentMethod: PAYMENT_METHOD.KREDIT };
  const entryKredit = postInvoiceJournal(invoiceKredit);
  check('invoice kredit -> debit ke akun Piutang Usaha (bukan Kas)', entryKredit.lines[0].account, 'Piutang Usaha');
}

console.log('\n=== journalEngine: postPurchaseJournal ===');
{
  const purchase = {
    id: 'PUR-TEST-1', paymentMethod: PAYMENT_METHOD.KREDIT, dpp: 10000000, vatAmount: 1200000,
    supplier: { name: 'PT Pemasok Andalan' }
  };
  const entry = postPurchaseJournal(purchase);
  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
  check('jurnal pembelian selalu balans', totalDebit, totalCredit);
  check('pembelian dengan PPN Masukan -> muncul di baris jurnal', entry.lines.some(l => l.account === 'PPN Masukan'), true);
}

console.log('\n=== latihanEngine: scoreLatihanInvoice (memakai data/taxCaseStudies.js asli) ===');
{
  const caseDef = TAX_CASE_STUDIES.find(c => c.id === 'case-1');
  if (!caseDef) {
    console.log('FAIL: case-1 tidak ditemukan di data/taxCaseStudies.js — cek apakah id berubah');
    fail += 1;
  } else {
    // Invoice yang PERSIS sesuai jawaban -> harus dapat 100 (jurnal balans disertakan).
    const invoiceBenar = { ...caseDef.expected };
    const journalBalans = { lines: [{ debit: invoiceBenar.grandTotal, credit: 0 }, { debit: 0, credit: invoiceBenar.grandTotal }] };
    const hasil = scoreLatihanInvoice('case-1', invoiceBenar, journalBalans);
    check('invoice & jurnal benar semua -> skor 100', hasil.score, 100);

    // Invoice dengan DPP salah -> kehilangan poin kriteria "Ketepatan DPP".
    const invoiceSalahDpp = { ...caseDef.expected, dppTotal: caseDef.expected.dppTotal + 1000000 };
    const hasilSalah = scoreLatihanInvoice('case-1', invoiceSalahDpp, journalBalans);
    check('DPP salah -> skor turun (bukan 100)', hasilSalah.score < 100, true);
    const dppCriterion = hasilSalah.breakdown.find(b => b.label === 'Ketepatan DPP');
    check('kriteria "Ketepatan DPP" ditandai salah', dppCriterion.correct, false);

    // caseId yang tidak ada -> harus null, bukan melempar error.
    check('caseId tidak dikenal -> null (bukan exception)', scoreLatihanInvoice('case-tidak-ada', invoiceBenar, journalBalans), null);
  }
}

console.log('\n=== Sinkronisasi end-to-end: tarif aktif aplikasi harus menghasilkan angka yang SAMA dengan expected di taxCaseStudies.js ===');
{
  // Regresi kunci: kalau tarif default aplikasi berubah lagi di masa depan tanpa
  // taxCaseStudies.js ikut diperbarui (atau sebaliknya), assertion ini akan gagal
  // duluan di CI, bukan diam-diam membuat siswa yang mengerjakan dengan benar
  // malah dinilai salah oleh Mode Latihan.
  [
    { id: 'case-1', date: '2026-08-10', qty: 10, unitPrice: 2000000 },
    { id: 'case-2', date: '2026-08-15', qty: 5, unitPrice: 1500000 },
    { id: 'case-4', date: '2026-08-25', qty: 4, unitPrice: 3000000, discountPercent: 10 }
  ].forEach(({ id, date, qty, unitPrice, discountPercent }) => {
    const caseDef = TAX_CASE_STUDIES.find(c => c.id === id);
    const ratePercent = getActiveVatRatePercent(date);
    const item = computeLineItem({ quantity: qty, unitPrice, discountPercent, vatRatePercent: ratePercent, vatApplies: true });
    near(`${id}: DPP hasil mesin PPN aktual == expected di taxCaseStudies.js`, item.dpp, caseDef.expected.dppTotal);
    near(`${id}: PPN hasil mesin PPN aktual == expected di taxCaseStudies.js`, item.vatAmount, caseDef.expected.vatTotal);
    near(`${id}: total hasil mesin PPN aktual == expected di taxCaseStudies.js`, item.total, caseDef.expected.grandTotal);
  });
}

console.log('\n=== vatEngine: getActiveVatRatePercent — uji mekanisme resolusi tanggal (terisolasi) ===');
{
  // Dijalankan PALING AKHIR dan sengaja mengosongkan+mengganti vatRates dengan
  // jadwal rekaan, supaya tidak mengganggu blok "Sinkronisasi end-to-end" di atas
  // yang masih perlu data default aplikasi yang asli.
  getVatRates().slice().forEach(r => deleteVatRate(r.id));
  addVatRate({ id: 'skenario-a', ratePercent: 10, effectiveDate: '2000-01-01', status: 'AKTIF', label: 'Skenario A' });
  addVatRate({ id: 'skenario-b', ratePercent: 20, effectiveDate: '2030-01-01', status: 'AKTIF', label: 'Skenario B' });

  near('mekanisme: tanggal di antara dua tarif -> ambil yang lebih lama berlaku', getActiveVatRatePercent('2015-01-01'), 10);
  near('mekanisme: tanggal setelah tarif kedua berlaku -> ambil yang terbaru', getActiveVatRatePercent('2031-01-01'), 20);
  near('mekanisme: tepat di tanggal efektif tarif kedua -> sudah pakai yang baru', getActiveVatRatePercent('2030-01-01'), 20);
  near('mekanisme: sehari sebelum tarif kedua berlaku -> masih pakai yang lama', getActiveVatRatePercent('2029-12-31'), 10);
}

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail > 0 ? 1 : 0);
