/**
 * Tax Auditor / Tax Reviewer — dataset edukasi (dummy).
 * Bukan audit nyata / bukan koneksi DJP.
 */
window.AUD_MODULES = [
  { id: "fundamentals", title: "Auditor Fundamentals", icon: "📚" },
  { id: "transaction", title: "Transaction Review", icon: "🧾" },
  { id: "compliance", title: "Tax Compliance Review", icon: "📋" },
  { id: "fiscal", title: "Commercial vs Fiscal Review", icon: "⚖️" },
  { id: "correction", title: "Fiscal Correction Review", icon: "🔧" },
  { id: "calculation", title: "Tax Calculation Review", icon: "🔢" },
  { id: "spt", title: "SPT Review", icon: "📄" },
  { id: "cross-check", title: "Cross-Check Engine", icon: "🔗" },
  { id: "find-error", title: "Find the Error", icon: "🕵️" },
  { id: "risk", title: "Risk Assessment", icon: "⚠️" },
  { id: "final", title: "Final Review Case", icon: "🏁" }
];

window.AUD_FUNDAMENTALS = [
  {
    heading: "Tujuan Tax Review",
    body: "Memastikan angka, klasifikasi, dokumen, dan pelaporan konsisten sebelum SPT dikirim. Reviewer bukan mengisi ulang seluruh formulir, melainkan menguji dan menantang hasil kerja staf.",
    example: "Contoh: staf menyerahkan rekap PPh 23 — reviewer mencocokkan kontrak, bukti potong, dan masa pajak."
  },
  {
    heading: "Audit Trail & Bukti",
    body: "Setiap angka harus tertelusur ke dokumen sumber (invoice, kontrak, bukti potong, faktur pajak, SSP). Tanpa jejak, temuan menjadi spekulasi.",
    example: "Invoice jasa Rp100jt tanpa kontrak & tanpa bukti potong = risiko dokumentasi + kepatuhan."
  },
  {
    heading: "Materiality & Sampling (sederhana)",
    body: "Fokus dulu pada nilai besar, transaksi tidak rutin, dan area berisiko (jasa, pihak berelasi, koreksi fiskal). Sampling membantu saat volume tinggi.",
    example: "Dari 200 baris, review 100% item > Rp50jt + sampel acak item kecil."
  },
  {
    heading: "Finding vs Calculation",
    body: "Calculation = hitung ulang. Finding = isu + bukti + dampak + risiko + rekomendasi. Auditor yang baik menulis temuan yang bisa ditindaklanjuti.",
    example: "Bukan hanya 'salah tarif', tapi 'tarif X dipakai pada objek Y; bukti Z; dampak kurang potong; rekomendasi koreksi & SPT pembetulan jika perlu'."
  },
  {
    heading: "Tax Risk",
    body: "Risiko naik jika nilai material, dokumen lemah, pola berulang, mendekati deadline, atau angka tidak cross-check ke SPT.",
    example: "Selisih PKP vs SPT 1771 tanpa penjelasan = High risk sampai direkonsiliasi."
  }
];

/** Find-the-error / transaction review case */
window.AUD_TX_CASE = {
  id: "AUD-TX-001",
  level: "intermediate",
  company: { name: "PT Nusantara Edukasi", period: "Masa Maret 2026 (dataset edukasi)" },
  brief: "Anda menerima daftar transaksi bulan berjalan. Tandai semua baris yang berpotensi bermasalah. Jangan terburu-buru — selesaikan review dulu, baru cek hasil.",
  transactions: [
    {
      id: "T1",
      date: "2026-03-05",
      desc: "Pembayaran gaji karyawan tetap",
      amount: 180000000,
      taxNote: "PPh 21 dipotong & dilapor",
      document: "Daftar gaji + bukti potong",
      issue: false
    },
    {
      id: "T2",
      date: "2026-03-08",
      desc: "Jasa konsultasi Vendor A",
      amount: 100000000,
      taxNote: "Tidak dipotong PPh",
      document: "Invoice saja (tanpa kontrak)",
      issue: true,
      category: "Tax Compliance",
      issueType: "Pajak tidak dihitung / dokumen lemah",
      impact: "Berpotensi kurang potong PPh 23 dan dokumentasi tidak lengkap",
      risk: "High",
      recommendation: "Hitung & potong PPh sesuai ketentuan, lengkapi kontrak, terbitkan bukti potong, review SPT Masa"
    },
    {
      id: "T3",
      date: "2026-03-10",
      desc: "Sewa gudang dari OP",
      amount: 50000000,
      taxNote: "Dipotong PPh 23 2%",
      document: "Kontrak sewa + bukti potong 23",
      issue: true,
      category: "Tax Classification",
      issueType: "Klasifikasi/tarif tidak selaras substansi sewa",
      impact: "Salah jenis potongan dapat membuat kepatuhan tidak sesuai objek",
      risk: "Medium",
      recommendation: "Uji substansi sewa vs jasa; sesuaikan jenis potongan & bukti; koreksi administrasi bila perlu"
    },
    {
      id: "T4",
      date: "2026-03-12",
      desc: "Pembelian ATK",
      amount: 3500000,
      taxNote: "Tidak relevan PPh potong",
      document: "Nota",
      issue: false
    },
    {
      id: "T5",
      date: "2026-03-15",
      desc: "Jasa teknik CV Mitra",
      amount: 80000000,
      taxNote: "PPh 23 dihitung dari nilai termasuk PPN",
      document: "Invoice + Faktur Pajak",
      issue: true,
      category: "Tax Calculation",
      issueType: "Dasar pengenaan keliru (ikut PPN)",
      impact: "PPh 23 lebih potong/salah hitung",
      risk: "Medium",
      recommendation: "Hitung ulang dari DPP; sesuaikan bukti potong & SPT Masa"
    },
    {
      id: "T6",
      date: "2026-03-18",
      desc: "Pembayaran jasa (faktur 5 Maret) dilaporkan di SPT Masa April",
      amount: 25000000,
      taxNote: "PPh 23 dilaporkan April",
      document: "Invoice 5 Mar + bukti potong",
      issue: true,
      category: "Timing",
      issueType: "Salah periode pelaporan",
      impact: "Risiko keterlambatan/ketidaksesuaian masa",
      risk: "Medium",
      recommendation: "Sesuaikan masa pelaporan; evaluasi sanksi administrasi bila ada"
    },
    {
      id: "T7",
      date: "2026-03-20",
      desc: "Promosi digital",
      amount: 12000000,
      taxNote: "Beban usaha",
      document: "Invoice + bukti transfer",
      issue: false
    },
    {
      id: "T8",
      date: "2026-03-22",
      desc: "Entry ganda pembayaran Vendor A",
      amount: 100000000,
      taxNote: "Sama dengan T2, masuk jurnal dua kali",
      document: "Jurnal ganda",
      issue: true,
      category: "Accounting",
      issueType: "Transaksi tercatat dua kali",
      impact: "Beban/utang dan dasar pajak bisa salah",
      risk: "High",
      recommendation: "Hapus entry ganda; rekonsiliasi bank & utang; review dampak pajak"
    }
  ]
};

window.AUD_COMPLIANCE = {
  id: "AUD-COMP-001",
  period: "Dataset edukasi — tahun/masa contoh 2026",
  items: [
    {
      id: "C1",
      tax: "PPh 21",
      due: "SPT Masa sesuai ketentuan masa",
      payment: "Sebagian sudah setor",
      reporting: "Draf belum final review",
      docs: "Bukti potong belum lengkap untuk 3 karyawan baru",
      correctStatus: "Potential Issue",
      reason: "Dokumentasi bukti potong belum lengkap meski perhitungan berjalan"
    },
    {
      id: "C2",
      tax: "PPh 23",
      due: "Mendekati jatuh tempo masa",
      payment: "Belum setor untuk Vendor A",
      reporting: "Belum",
      docs: "Invoice tanpa kontrak",
      correctStatus: "Non-Compliant",
      reason: "Ada objek berisiko belum dipotong/dilapor"
    },
    {
      id: "C3",
      tax: "PPh 4(2)",
      due: "Sesuai masa",
      payment: "Sudah",
      reporting: "Sudah",
      docs: "Bukti potong sewa ada",
      correctStatus: "Compliant",
      reason: "Administrasi sewa final terdokumentasi pada dataset"
    },
    {
      id: "C4",
      tax: "PPh 25",
      due: "Angsuran bulan berjalan",
      payment: "Sudah",
      reporting: "N/A (bukan SPT Masa objek ini)",
      docs: "Kode billing",
      correctStatus: "Compliant",
      reason: "Angsuran tercatat pada dataset"
    },
    {
      id: "C5",
      tax: "PPN",
      due: "SPT Masa PPN",
      payment: "Kurang bayar dihitung",
      reporting: "Siap lapor",
      docs: "Faktur lengkap",
      correctStatus: "Compliant",
      reason: "Tidak ada isu material pada dataset PPN contoh"
    },
    {
      id: "C6",
      tax: "SPT Tahunan 1771",
      due: "Setelah tahun pajak berakhir",
      payment: "Belum tahap tahunan",
      reporting: "Belum",
      docs: "Rekon fiskal masih draf",
      correctStatus: "Not Applicable",
      reason: "Untuk masa berjalan, fokus review masa; 1771 relevan di siklus tahunan"
    }
  ]
};

window.AUD_FISCAL_REVIEW = {
  id: "AUD-FIS-001",
  company: "PT Nusantara Edukasi",
  labaKomersial: 500000000,
  staff: {
    positive: 20000000,
    negative: 30000000,
    labaFiskal: 550000000
  },
  truth: {
    positive: 20000000,
    negative: 30000000,
    labaFiskal: 490000000
  },
  notes: [
    "Staf mengklaim laba fiskal 550jt dari 500 + 20 − 30 — hitungan tidak konsisten.",
    "Rumus benar: Laba Fiskal = Komersial + Positif − Negatif = 490jt."
  ]
};

window.AUD_CORRECTION_REVIEW = {
  id: "AUD-COR-001",
  accounts: [
    { id: "A1", account: "Entertainment (tanpa nominatif memadai)", amount: 25000000, staffType: "none", correctType: "positive", reason: "Risiko non-deductible tanpa kelengkapan formal — konteks edukasi" },
    { id: "A2", account: "Donation non-qualifying", amount: 15000000, staffType: "positive", correctType: "positive", reason: "Koreksi positif staf sesuai arah edukasi" },
    { id: "A3", account: "Salary", amount: 120000000, staffType: "none", correctType: "none", reason: "Gaji rutin terdokumentasi — tidak dikoreksi pada dataset" },
    { id: "A4", account: "Depreciation difference (komersial > fiskal)", amount: 10000000, staffType: "none", correctType: "positive", reason: "Selisih sementara — koreksi positif yang terlewat staf" },
    { id: "A5", account: "Tax penalty", amount: 5000000, staffType: "negative", correctType: "positive", reason: "Sanksi pajak: arah koreksi staf salah (harusnya positif)" },
    { id: "A6", account: "Promotion (bukti lengkap, usaha)", amount: 20000000, staffType: "positive", correctType: "none", reason: "Staf salah menambahkan koreksi positif" }
  ]
};

window.AUD_CALC = {
  id: "AUD-CALC-001",
  taxableIncomeStaff: 490000000,
  rateStaff: 0.22,
  taxStaff: 100000000,
  taxableIncomeCorrect: 490000000,
  rateCorrect: 0.22,
  taxCorrect: 107800000,
  explanation: "Dataset edukasi memakai ilustrasi tarif 22%. 490jt × 22% = 107,8jt. Klaim staf 100jt tidak cocok dengan PKP × tarif (pembulatan/ilustrasi error)."
};

window.AUD_SPT_REVIEW = {
  id: "AUD-SPT-001",
  fiscalProfitWorking: 490000000,
  fiscalProfitOnSpt: 520000000,
  taxPayableWorking: 107800000,
  taxPayableOnSpt: 100000000,
  notes: "Cross-check: laba fiskal kerja ≠ SPT; PPh terutang kerja ≠ SPT. Potential inconsistency sebelum submit 1771."
};

window.AUD_RISK_DRILL = [
  {
    id: "R1",
    scenario: "Selisih kecil ATK Rp50.000 tanpa nota, satu kali.",
    answer: "Low",
    why: "Nilai tidak material dan tidak berpola."
  },
  {
    id: "R2",
    scenario: "PPh 23 jasa Rp100jt tidak dipotong, dokumen lemah, mendekati deadline SPT Masa.",
    answer: "High",
    why: "Nilai material + kepatuhan + dokumen + tenggat."
  },
  {
    id: "R3",
    scenario: "Salah masa pelaporan PPh 23 Rp25jt, terjadi dua bulan beruntun.",
    answer: "Medium",
    why: "Berulang dan salah periode, nilai menengah."
  }
];

window.AUD_FINAL = {
  id: "AUD-FINAL-001",
  title: "Final Tax Review — PT Nusantara Edukasi",
  steps: [
    "Review transactions (tandai isu)",
    "Review commercial vs fiscal numbers",
    "Review fiscal corrections",
    "Recalculate tax",
    "Review SPT cross-check",
    "Confirm findings & risk"
  ],
  expectedFindingIds: ["T2", "T3", "T5", "T6", "T8"],
  fiscalOk: false,
  sptOk: false,
  briefing: "Gabungkan kemampuan Transaction Review, Fiscal Review, dan SPT cross-check. Data mengikuti kasus edukasi yang sama di modul ini."
};
