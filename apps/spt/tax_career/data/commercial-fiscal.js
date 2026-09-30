/**
 * Commercial & Fiscal Tax Accounting — data edukasi.
 * Angka bersifat dataset pembelajaran, bukan nasihat pajak aktual.
 * Koreksi bergantung pada konteks; contoh diberi alasan edukatif.
 */
window.CF_MODULES = [
  { id: "concept", title: "Komersial vs Fiskal", icon: "📘" },
  { id: "classify", title: "Identifikasi Perbedaan", icon: "🔎" },
  { id: "positive", title: "Koreksi Positif", icon: "⬆️" },
  { id: "negative", title: "Koreksi Negatif", icon: "⬇️" },
  { id: "perm-temp", title: "Permanent vs Temporary", icon: "⏱️" },
  { id: "recon", title: "Rekonsiliasi Fiskal", icon: "🧮" },
  { id: "find-error", title: "Find the Error", icon: "🕵️" },
  { id: "spt-link", title: "Hubungan ke SPT 1771", icon: "📄" }
];

window.CF_CONCEPT = {
  commercial: {
    title: "Laporan Keuangan Komersial",
    body: "Digunakan untuk tujuan akuntansi (SAK). Menggambarkan kinerja dan posisi keuangan menurut prinsip akuntansi yang berlaku. Laba komersial = hasil pembukuan perusahaan."
  },
  fiscal: {
    title: "Laporan / Dasar Fiskal",
    body: "Digunakan sebagai dasar perhitungan pajak mengikuti ketentuan perpajakan. Tidak semua pengakuan komersial otomatis sama dengan pengakuan fiskal."
  },
  key: "Laba Komersial ≠ selalu Laba Fiskal, karena ada perbedaan perlakuan biaya/penghasilan antara akuntansi dan pajak.",
  formula: "Laba Fiskal = Laba Komersial + Koreksi Positif − Koreksi Negatif",
  flow: [
    "Transaksi",
    "Pembukuan Komersial",
    "Laba Rugi Komersial",
    "Identifikasi Perbedaan",
    "Koreksi Fiskal (+/−)",
    "Rekonsiliasi",
    "Laba Fiskal",
    "PPh Badan",
    "SPT 1771"
  ]
};

/** Klasifikasi transaksi — correctionType: none | positive | negative */
window.CF_CLASSIFY = [
  {
    id: "CF-C01",
    title: "Biaya gaji karyawan tetap",
    amount: 120000000,
    commercialTreatment: "Beban operasional (mengurangi laba komersial)",
    fiscalTreatment: "Umumnya dapat dikurangkan jika terkait mendapatkan/menagih/memelihara penghasilan dan didukung dokumen",
    correctionType: "none",
    difference: "permanent", // n/a when none — not used
    explanation: "Gaji rutin yang wajar dan terdokumentasi biasanya tidak menimbulkan koreksi fiskal. Dataset edukasi: tidak ada koreksi."
  },
  {
    id: "CF-C02",
    title: "Denda/sanksi administrasi pajak",
    amount: 5000000,
    commercialTreatment: "Dibebankan sebagai beban di laba rugi",
    fiscalTreatment: "Pada umumnya tidak dapat dikurangkan untuk menghitung PKP",
    correctionType: "positive",
    difference: "permanent",
    explanation: "Beban yang tidak boleh dikurangkan secara fiskal → koreksi positif (menambah laba fiskal)."
  },
  {
    id: "CF-C03",
    title: "Biaya entertainment tanpa daftar nominatif memadai",
    amount: 15000000,
    commercialTreatment: "Beban penjualan/umum",
    fiscalTreatment: "Tanpa kelengkapan formal yang dipersyaratkan, berisiko tidak dapat dikurangkan",
    correctionType: "positive",
    difference: "permanent",
    explanation: "Contoh edukasi: biaya entertainment yang tidak memenuhi syarat dokumentasi dikoreksi positif."
  },
  {
    id: "CF-C04",
    title: "Penghasilan sewa yang sudah dikenai PPh final 4(2) (bruto masuk pendapatan)",
    amount: 20000000,
    commercialTreatment: "Pendapatan di laba rugi komersial",
    fiscalTreatment: "Penghasilan final umumnya dikeluarkan dari perhitungan PKP tarif umum",
    correctionType: "negative",
    difference: "permanent",
    explanation: "Penghasilan final yang sudah masuk laba komersial sering dikoreksi negatif agar tidak dihitung lagi di PKP non-final (konteks edukasi)."
  },
  {
    id: "CF-C05",
    title: "Sumbangan di luar ketentuan yang diperbolehkan",
    amount: 8000000,
    commercialTreatment: "Beban lain-lain",
    fiscalTreatment: "Tidak memenuhi kriteria deductible → tidak boleh dikurangkan",
    correctionType: "positive",
    difference: "permanent",
    explanation: "Sumbangan non-qualifying → koreksi positif."
  },
  {
    id: "CF-C06",
    title: "Biaya sewa kantor (objek PPh final di sisi pemilik; di sisi penyewa sebagai beban)",
    amount: 60000000,
    commercialTreatment: "Beban sewa",
    fiscalTreatment: "Sebagai beban usaha penyewa, pada umumnya dapat dikurangkan jika substansi dan dokumen memadai",
    correctionType: "none",
    difference: "permanent",
    explanation: "Dataset edukasi: beban sewa usaha yang wajar → tidak ada koreksi di sisi penyewa."
  },
  {
    id: "CF-C07",
    title: "Selisih penyusutan komersial vs fiskal (tahun ini komersial lebih besar)",
    amount: 12000000,
    commercialTreatment: "Beban penyusutan sesuai kebijakan akuntansi",
    fiscalTreatment: "Penyusutan mengikuti ketentuan fiskal (metode/masa manfaat fiskal)",
    correctionType: "positive",
    difference: "temporary",
    explanation: "Jika beban penyusutan komersial > fiskal, selisihnya dikoreksi positif. Ini contoh temporary difference (dapat berbalik di periode lain)."
  },
  {
    id: "CF-C08",
    title: "Biaya perjalanan dinas dengan bukti lengkap",
    amount: 9000000,
    commercialTreatment: "Beban operasional",
    fiscalTreatment: "Dapat dikurangkan jika terkait kegiatan usaha dan terdokumentasi",
    correctionType: "none",
    difference: "permanent",
    explanation: "Contoh tanpa koreksi: perjalanan dinas wajar + bukti lengkap."
  },
  {
    id: "CF-C09",
    title: "Biaya kendaraan untuk kepentingan pribadi pemegang saham (bukan operasional)",
    amount: 7000000,
    commercialTreatment: "Tercatat sebagai beban",
    fiscalTreatment: "Beban personal/non-business berisiko tidak dapat dikurangkan",
    correctionType: "positive",
    difference: "permanent",
    explanation: "Beban non-usaha → koreksi positif (edukasi)."
  },
  {
    id: "CF-C10",
    title: "Pendapatan bunga yang sudah dipotong PPh final (masuk pendapatan komersial)",
    amount: 3000000,
    commercialTreatment: "Pendapatan bunga",
    fiscalTreatment: "Jika bersifat final, dikeluarkan dari PKP tarif umum",
    correctionType: "negative",
    difference: "permanent",
    explanation: "Penghasilan final di laba komersial → koreksi negatif pada rekonsiliasi PKP non-final (konteks belajar)."
  }
];

window.CF_PERM_TEMP = [
  {
    id: "CF-PT01",
    title: "Sanksi pajak dibebankan di laba rugi",
    answer: "permanent",
    explanation: "Tidak berbalik di periode berikutnya sebagai pengurang fiskal — permanent difference."
  },
  {
    id: "CF-PT02",
    title: "Beda metode/masa manfaat penyusutan komersial vs fiskal",
    answer: "temporary",
    explanation: "Perbedaan waktu pengakuan; total sepanjang umur aset dapat berbalik — temporary difference."
  },
  {
    id: "CF-PT03",
    title: "Sumbangan non-deductible",
    answer: "permanent",
    explanation: "Tidak menimbulkan pembalikan sistematis di periode depan."
  },
  {
    id: "CF-PT04",
    title: "Penyisihan piutang (contoh beda waktu pengakuan beban)",
    answer: "temporary",
    explanation: "Sering menjadi contoh temporary bila pengakuan beban berbeda waktu dengan saat diakui fiskal."
  }
];

/**
 * Skenario rekonsiliasi.
 * lines: { account, commercial, hintType: none|positive|negative, amount? }
 * User chooses correction type; for intermediate+ they may enter amount.
 */
window.CF_RECON_CASES = [
  {
    id: "CF-R-BASIC",
    level: "basic",
    title: "Rekonsiliasi Dasar",
    labaKomersial: 500000000,
    lines: [
      { id: "gaji", account: "Beban gaji", commercial: 200000000, correctType: "none", correctAmount: 0 },
      { id: "sewa", account: "Beban sewa kantor", commercial: 60000000, correctType: "none", correctAmount: 0 },
      { id: "ent", account: "Beban entertainment (dokumen tidak memadai)", commercial: 20000000, correctType: "positive", correctAmount: 20000000 },
      { id: "denda", account: "Denda pajak", commercial: 5000000, correctType: "positive", correctAmount: 5000000 },
      { id: "sewa_ph", account: "Pendapatan sewa final (sudah di pendapatan)", commercial: 10000000, correctType: "negative", correctAmount: 10000000 }
    ],
    explanation: "Koreksi + = entertainment 20jt + denda 5jt. Koreksi − = penghasilan final 10jt. Laba fiskal = 500 + 25 − 10 = 515 juta."
  },
  {
    id: "CF-R-INTER",
    level: "intermediate",
    title: "Rekonsiliasi Menengah",
    labaKomersial: 420000000,
    lines: [
      { id: "promosi", account: "Beban promosi (terkait usaha, bukti lengkap)", commercial: 25000000, correctType: "none", correctAmount: 0 },
      { id: "sumbang", account: "Sumbangan non-qualifying", commercial: 8000000, correctType: "positive", correctAmount: 8000000 },
      { id: "susut", account: "Selisih penyusutan (komersial > fiskal)", commercial: 12000000, correctType: "positive", correctAmount: 12000000 },
      { id: "bunga_final", account: "Pendapatan bunga final di laba", commercial: 4000000, correctType: "negative", correctAmount: 4000000 },
      { id: "admin", account: "Beban administrasi umum", commercial: 30000000, correctType: "none", correctAmount: 0 }
    ],
    explanation: "Positif 8+12=20jt; negatif 4jt. Laba fiskal = 420 + 20 − 4 = 436 juta."
  },
  {
    id: "CF-R-ADV",
    level: "advanced",
    title: "Rekonsiliasi Lanjutan",
    labaKomersial: 680000000,
    lines: [
      { id: "hpp", account: "HPP (normal, terdokumentasi)", commercial: 0, correctType: "none", correctAmount: 0, note: "Sudah tertanam di laba; tidak dikoreksi terpisah" },
      { id: "gaji", account: "Beban gaji & tunjangan", commercial: 150000000, correctType: "none", correctAmount: 0 },
      { id: "kendaraan", account: "Beban kendaraan pribadi pemegang saham", commercial: 9000000, correctType: "positive", correctAmount: 9000000 },
      { id: "ent", account: "Entertainment tanpa nominatif", commercial: 14000000, correctType: "positive", correctAmount: 14000000 },
      { id: "denda", account: "Sanksi pajak", commercial: 3000000, correctType: "positive", correctAmount: 3000000 },
      { id: "final_sewa", account: "Penghasilan sewa final di pendapatan", commercial: 25000000, correctType: "negative", correctAmount: 25000000 },
      { id: "susut", account: "Selisih penyusutan sementara", commercial: 10000000, correctType: "positive", correctAmount: 10000000 }
    ],
    explanation: "Positif 9+14+3+10=36jt; negatif 25jt. Laba fiskal = 680 + 36 − 25 = 691 juta."
  }
];

window.CF_FIND_ERROR = [
  {
    id: "CF-E01",
    title: "Salah hitung laba fiskal",
    level: "basic",
    given: {
      labaKomersial: 500000000,
      koreksiPositif: 20000000,
      koreksiNegatif: 30000000,
      labaFiskalClaimed: 550000000
    },
    correctLabaFiskal: 490000000,
    errorSummary: "Rumus terbalik/salah: 500 + 20 − 30 = 490, bukan 550.",
    explanation: "Laba Fiskal = Laba Komersial + Positif − Negatif. Klaim 550jt tidak konsisten dengan komponen yang diberikan."
  },
  {
    id: "CF-E02",
    title: "Koreksi hilang untuk denda pajak",
    level: "intermediate",
    given: {
      labaKomersial: 300000000,
      items: [
        { label: "Denda pajak 5jt (dibebankan komersial)", staffType: "none", correctType: "positive", amount: 5000000 },
        { label: "Gaji 80jt", staffType: "none", correctType: "none", amount: 0 }
      ],
      labaFiskalClaimed: 300000000
    },
    correctLabaFiskal: 305000000,
    errorSummary: "Denda pajak seharusnya koreksi positif 5jt, sehingga laba fiskal 305jt.",
    explanation: "Reviewer harus menangkap koreksi yang hilang pada beban non-deductible."
  },
  {
    id: "CF-E03",
    title: "Salah arah koreksi penghasilan final",
    level: "advanced",
    given: {
      labaKomersial: 400000000,
      items: [
        { label: "Penghasilan final 15jt sudah masuk pendapatan", staffType: "positive", correctType: "negative", amount: 15000000 }
      ],
      labaFiskalClaimed: 415000000
    },
    correctLabaFiskal: 385000000,
    errorSummary: "Penghasilan final seharusnya koreksi negatif, bukan positif. 400 − 15 = 385jt.",
    explanation: "Salah klasifikasi arah koreksi mengubah PKP secara material."
  }
];

/** Contoh PPh Badan edukasi — tarif hanya ilustrasi pembelajaran; cek ketentuan tahun pajak aktual. */
window.CF_PPH_NOTE =
  "Perhitungan PPh Badan di modul ini bersifat edukasi. Tarif dan fasilitas (mis. tarif umum, diskon UMKM, dll.) mengikuti ketentuan tahun pajak yang berlaku — selalu verifikasi regulasi terkini sebelum praktik nyata.";
