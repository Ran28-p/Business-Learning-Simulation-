/**
 * Bank soal Tax Career & Practice.
 * type: mcq | multi | order | case-choice
 * grading: exact | partial (untuk multi)
 */
window.TAX_CAREER_QUESTIONS = [
  /* ========== TAX COMPLIANCE ========== */
  {
    id: "TC-001",
    category: "tax-compliance",
    level: "basic",
    type: "mcq",
    skill: "PPh 21",
    title: "PPh 21 — Objek potongan gaji",
    scenario: "PT Nusa mempekerjakan karyawan tetap dengan gaji bulanan Rp12.000.000 (sudah di atas PTKP proporsional). Perusahaan wajib memotong PPh Pasal 21.",
    question: "Apa yang paling tepat sebagai langkah kepatuhan rutin perusahaan?",
    options: [
      "Hanya mencatat gaji di jurnal; pajak diurus karyawan sendiri di SPT Tahunan saja",
      "Hitung PPh 21, potong dari gaji, setor ke kas negara, laporkan SPT Masa PPh 21, dan berikan bukti potong",
      "Tunda pemotongan sampai akhir tahun agar lebih praktis",
      "Laporkan sebagai PPh 23 karena ada unsur jasa"
    ],
    answer: "Hitung PPh 21, potong dari gaji, setor ke kas negara, laporkan SPT Masa PPh 21, dan berikan bukti potong",
    explanation: "PPh 21 atas gaji karyawan tetap: hitung–potong–setor–lapor (SPT Masa) + dokumentasi bukti potong. Bukan digeser ke PPh 23."
  },
  {
    id: "TC-002",
    category: "tax-compliance",
    level: "basic",
    type: "mcq",
    skill: "PPh 23",
    title: "PPh 23 — Jasa teknik",
    scenario: "PT Abadi membayar jasa teknik Rp100.000.000 kepada CV Mitra (WP dalam negeri). Tidak ada fasilitas pembebasan yang berlaku.",
    question: "Perlakuan kepatuhan yang benar?",
    options: [
      "Tidak dipotong; CV Mitra cukup lapor di SPT Tahunan",
      "Dipotong PPh 23 atas jasa, setor, laporkan SPT Masa PPh 23, serahkan bukti potong",
      "Dipotong PPh 21 seperti karyawan",
      "Hanya diterbitkan faktur PPN tanpa pemotongan PPh"
    ],
    answer: "Dipotong PPh 23 atas jasa, setor, laporkan SPT Masa PPh 23, serahkan bukti potong",
    explanation: "Pembayaran jasa kepada WP DN pada umumnya menjadi objek PPh 23 (tarif sesuai ketentuan yang berlaku). Pemotong wajib potong, setor, lapor, dan berikan bukti potong."
  },
  {
    id: "TC-003",
    category: "tax-compliance",
    level: "basic",
    type: "mcq",
    skill: "PPh 4(2)",
    title: "PPh 4(2) — Sewa tanah/bangunan",
    scenario: "Perusahaan menyewa gedung kantor dari pemilik orang pribadi. Atas sewa bangunan berlaku PPh bersifat final (Pasal 4 ayat (2)).",
    question: "Manakah pernyataan yang benar?",
    options: [
      "Sewa bangunan selalu non-final dan dikreditkan di SPT Tahunan penyewa",
      "Pemotongan PPh 4(2) final memotong kewajiban penerima sewa atas penghasilan tersebut secara final (sesuai ketentuan), dan pemotong tetap wajib administrasi potong-setor-lapor",
      "Tidak perlu bukti potong karena final",
      "Dilaporkan hanya di SPT Masa PPN"
    ],
    answer: "Pemotongan PPh 4(2) final memotong kewajiban penerima sewa atas penghasilan tersebut secara final (sesuai ketentuan), dan pemotong tetap wajib administrasi potong-setor-lapor",
    explanation: "PPh final tetap membutuhkan proses kepatuhan pemotong (hitung, potong, setor, lapor, bukti potong). Sifat final berkaitan dengan perlakuan di sisi penerima, bukan menghilangkan administrasi pemotong."
  },
  {
    id: "TC-004",
    category: "tax-compliance",
    level: "intermediate",
    type: "mcq",
    skill: "PPh 25",
    title: "PPh 25 — Angsuran",
    scenario: "PT Maju memiliki SPT Tahunan tahun lalu dengan PPh kurang bayar yang menjadi dasar angsuran PPh 25 tahun berjalan.",
    question: "Fungsi utama angsuran PPh 25 dalam kepatuhan?",
    options: [
      "Menggantikan seluruh SPT Masa PPh 21/23",
      "Membayar cicilan PPh badan tahun berjalan agar tidak menumpuk di akhir tahun",
      "Hanya formalitas tanpa kaitan ke SPT Tahunan",
      "Sama dengan PPh 4(2) final atas dividen"
    ],
    answer: "Membayar cicilan PPh badan tahun berjalan agar tidak menumpuk di akhir tahun",
    explanation: "PPh 25 adalah angsuran PPh tahun berjalan. Di SPT Tahunan, angsuran yang sudah dibayar dikreditkan terhadap PPh terutang setahun."
  },
  {
    id: "TC-005",
    category: "tax-compliance",
    level: "intermediate",
    type: "mcq",
    skill: "PPN",
    title: "PPN — PM, PK, dan posisi",
    scenario: "PKP menjual BKP (Pajak Keluaran) Rp50.000.000 PPN dan membeli BKP perolehan (Pajak Masukan) Rp30.000.000 PPN pada masa yang sama. PM memenuhi syarat dikreditkan.",
    question: "Posisi PPN masa tersebut?",
    options: [
      "Lebih bayar Rp20.000.000",
      "Kurang bayar Rp20.000.000",
      "Nihil karena jual-beli saling batal",
      "Hanya lapor PK tanpa memperhitungkan PM"
    ],
    answer: "Kurang bayar Rp20.000.000",
    explanation: "PPN kurang bayar ≈ Pajak Keluaran − Pajak Masukan yang dapat dikreditkan = 50jt − 30jt = 20jt (sederhana, mengabaikan retur/fasilitas lain)."
  },
  {
    id: "TC-006",
    category: "tax-compliance",
    level: "basic",
    type: "mcq",
    skill: "SPT Tahunan",
    title: "SPT Tahunan Badan & 1771",
    scenario: "Perusahaan sudah memotong PPh masa sepanjang tahun dan ingin menutup kewajiban tahunan.",
    question: "Hubungan yang paling tepat dengan simulator yang ada di aplikasi ini?",
    options: [
      "SPT 1771 diganti sepenuhnya oleh SPT Masa PPN",
      "SPT 1771 adalah formulir SPT Tahunan Badan; rekonsiliasi & induknya dilatih di simulator 1771, terpisah dari SPT Masa",
      "SPT Tahunan tidak perlu jika semua masa sudah dilaporkan",
      "Lampiran 1771 hanya untuk PPh 21 karyawan"
    ],
    answer: "SPT 1771 adalah formulir SPT Tahunan Badan; rekonsiliasi & induknya dilatih di simulator 1771, terpisah dari SPT Masa",
    explanation: "Kepatuhan masa (21/23/PPN/dll.) berjalan sepanjang tahun. SPT 1771 menutup kewajiban tahunan badan, termasuk rekonsiliasi fiskal — gunakan simulator formulir 1771 yang sudah ada."
  },

  /* ========== TAX ACCOUNTANT ========== */
  {
    id: "TA-001",
    category: "tax-accountant",
    level: "basic",
    type: "mcq",
    skill: "Fiscal Reconciliation",
    title: "Koreksi fiskal — hiburan berlebihan",
    scenario: "Laba komersial Rp500.000.000. Dalam beban ada biaya entertainment tanpa daftar nominatif memadai Rp20.000.000 yang menurut kebijakan fiskal tidak boleh dikurangkan.",
    question: "Perlakuan rekonsiliasi yang benar?",
    options: [
      "Koreksi negatif Rp20.000.000 sehingga laba fiskal Rp480.000.000",
      "Koreksi positif Rp20.000.000 sehingga laba fiskal Rp520.000.000",
      "Tidak dikoreksi karena sudah dibukukan",
      "Langsung mengurangi PPh 25 saja"
    ],
    answer: "Koreksi positif Rp20.000.000 sehingga laba fiskal Rp520.000.000",
    explanation: "Biaya yang tidak boleh dikurangkan menambah PKP → koreksi positif. 500jt + 20jt = 520jt."
  },
  {
    id: "TA-002",
    category: "tax-accountant",
    level: "basic",
    type: "mcq",
    skill: "Permanent Difference",
    title: "Permanent vs temporary",
    scenario: "Sanksi administrasi pajak dibebankan di laba rugi komersial.",
    question: "Jenis perbedaan yang paling tepat?",
    options: [
      "Temporary difference karena akan balik di tahun depan",
      "Permanent difference — sanksi pajak umumnya tidak boleh dikurangkan dan tidak berbalik otomatis",
      "Bukan perbedaan; sanksi selalu deductible",
      "Hanya beda klasifikasi PPN"
    ],
    answer: "Permanent difference — sanksi pajak umumnya tidak boleh dikurangkan dan tidak berbalik otomatis",
    explanation: "Sanksi pajak tipikal permanent non-deductible difference: dikoreksi positif dan tidak 'balik' seperti beda waktu penyusutan."
  },
  {
    id: "TA-003",
    category: "tax-accountant",
    level: "intermediate",
    type: "mcq",
    skill: "Fiscal Reconciliation",
    title: "Penghasilan final di laba komersial",
    scenario: "Laba komersial mencakup penghasilan sewa yang sudah dikenai PPh final 4(2) sebesar Rp10.000.000 (penghasilan bruto sewa sudah masuk pendapatan).",
    question: "Arah koreksi yang umum untuk penghasilan final tersebut dalam rekonsiliasi menuju PKP non-final?",
    options: [
      "Koreksi positif (menambah PKP lagi)",
      "Koreksi negatif (mengeluarkan dari PKP biasa karena sudah final) — sesuai konteks rekonsiliasi non-final",
      "Tidak perlu koreksi apa pun",
      "Dipindahkan ke PPN Keluaran"
    ],
    answer: "Koreksi negatif (mengeluarkan dari PKP biasa karena sudah final) — sesuai konteks rekonsiliasi non-final",
    explanation: "Penghasilan yang sudah final biasanya dikeluarkan dari perhitungan PKP tarif umum lewat koreksi negatif (bersama penyesuaian biaya terkait sesuai ketentuan)."
  },
  {
    id: "TA-004",
    category: "tax-accountant",
    level: "intermediate",
    type: "mcq",
    skill: "Laba Fiskal",
    title: "Hitung laba fiskal sederhana",
    scenario: "Laba komersial Rp400.000.000. Koreksi positif Rp50.000.000. Koreksi negatif Rp30.000.000.",
    question: "Laba fiskal?",
    options: [
      "Rp380.000.000",
      "Rp420.000.000",
      "Rp480.000.000",
      "Rp320.000.000"
    ],
    answer: "Rp420.000.000",
    explanation: "400 + 50 − 30 = 420 (juta)."
  },
  {
    id: "TA-005",
    category: "tax-accountant",
    level: "basic",
    type: "mcq",
    skill: "SPT 1771",
    title: "Hubungan ke Lampiran I 1771",
    scenario: "Tax accountant selesai menyusun rekonsiliasi fiskal badan.",
    question: "Di simulator aplikasi ini, hasil rekonsiliasi paling relevan dipraktikkan di mana?",
    options: [
      "Hanya di Modul PPN faktur",
      "Formulir 1771 Lampiran I (rekonsiliasi) yang mengalir ke Induk 1771",
      "Hanya di SPT Masa PPh 21",
      "Tidak berhubungan dengan 1771"
    ],
    answer: "Formulir 1771 Lampiran I (rekonsiliasi) yang mengalir ke Induk 1771",
    explanation: "Lampiran I 1771 adalah tempat latihan rekonsiliasi fiskal; jangan membuat simulator 1771 kedua."
  },

  /* ========== TAX CONSULTANT ========== */
  {
    id: "TCO-001",
    category: "tax-consultant",
    level: "junior",
    type: "mcq",
    skill: "Case Analysis",
    title: "Klien: sewa vs jasa",
    scenario: "Klien membayar Rp200.000.000 kepada pemilik ruko. Kontrak berjudul 'jasa pengelolaan lokasi', tetapi substansi adalah hak pakai ruangan tanpa jasa lain yang material.",
    question: "Isu utama yang harus dianalisis konsultan?",
    options: [
      "Langsung anggap PPh 21 karena ada kata jasa",
      "Menguji substansi: apakah objek lebih dekat ke sewa (berpotensi PPh 4(2)) atau jasa (PPh 23), lalu sesuaikan pemotongan & dokumentasi",
      "Abaikan kontrak tertulis",
      "Selalu pilih tarif terendah tanpa analisis"
    ],
    answer: "Menguji substansi: apakah objek lebih dekat ke sewa (berpotensi PPh 4(2)) atau jasa (PPh 23), lalu sesuaikan pemotongan & dokumentasi",
    explanation: "Konsultan mengutamakan substansi transaksi, bukan sekadar judul kontrak. Salah klasifikasi = risiko kurang potong/salah lapor."
  },
  {
    id: "TCO-002",
    category: "tax-consultant",
    level: "intermediate",
    type: "mcq",
    skill: "Risk",
    title: "Rekomendasi & risiko",
    scenario: "Klien ingin tidak memotong PPh atas jasa kepada lawan transaksi yang tidak memberikan NPWP, agar 'tidak ribet'.",
    question: "Rekomendasi yang paling tepat?",
    options: [
      "Setujui permintaan klien agar hubungan bisnis lancar",
      "Jelaskan kewajiban pemotongan, konsekuensi sanksi, dan opsi kepatuhan (termasuk tarif yang berlaku bila tanpa NPWP sesuai ketentuan) + siapkan bukti potong",
      "Ubah seluruh transaksi menjadi hibah",
      "Tunda semua pembayaran hingga tahun depan tanpa analisis"
    ],
    answer: "Jelaskan kewajiban pemotongan, konsekuensi sanksi, dan opsi kepatuhan (termasuk tarif yang berlaku bila tanpa NPWP sesuai ketentuan) + siapkan bukti potong",
    explanation: "Konsultan tidak ikut meniadakan kewajiban. Ia menjelaskan risiko dan cara patuh."
  },
  {
    id: "TCO-003",
    category: "tax-consultant",
    level: "intermediate",
    type: "mcq",
    skill: "Documentation",
    title: "Dokumen yang diminta",
    scenario: "Klien menerima SP2DK terkait selisih omzet vs laporan keuangan.",
    question: "Langkah awal yang paling masuk akal?",
    options: [
      "Mengabaikan surat karena belum SKP",
      "Petakan isu, kumpulkan rekap penjualan, rekening koran, SPT, dan rekonsiliasi internal sebelum menjawab",
      "Langsung bayar seluruh dugaan tanpa cek",
      "Hapus data pembukuan yang tidak cocok"
    ],
    answer: "Petakan isu, kumpulkan rekap penjualan, rekening koran, SPT, dan rekonsiliasi internal sebelum menjawab",
    explanation: "Analisis berbasis dokumen. Diam atau menghapus data memperburuk risiko."
  },
  {
    id: "TCO-004",
    category: "tax-consultant",
    level: "advanced",
    type: "mcq",
    skill: "Recommendation",
    title: "Multi-pajak",
    scenario: "Klien PKP menjual software (debat: BKP atau JKP) dan membayar komisi agen DN.",
    question: "Pendekatan konsultan yang baik?",
    options: [
      "Hanya fokus PPN; PPh komisi diabaikan",
      "Analisis klasifikasi PPN (karakter produk) dan PPh atas komisi secara terpisah, dengan posisi + risiko + dokumen masing-masing",
      "Gabungkan semua jadi PPh 21 karyawan",
      "Tunda sampai ada pemeriksaan"
    ],
    answer: "Analisis klasifikasi PPN (karakter produk) dan PPh atas komisi secara terpisah, dengan posisi + risiko + dokumen masing-masing",
    explanation: "Kasus multi-pajak membutuhkan isu-per-isu, bukan satu jawaban generik."
  },

  /* ========== TAX PLANNER ========== */
  {
    id: "TP-001",
    category: "tax-planner",
    level: "basic",
    type: "mcq",
    skill: "Legal vs Illegal",
    title: "Bedakan planning dan evasion",
    scenario: "Manajemen meminta cara 'menghilangkan' penjualan tunai dari pembukuan agar PPh turun.",
    question: "Penilaian yang benar?",
    options: [
      "Ini tax planning yang efisien",
      "Ini arah tax evasion (penyembunyian) — tidak boleh direkomendasikan",
      "Sah jika nilai di bawah 10 juta",
      "Boleh jika tidak ada faktur PPN"
    ],
    answer: "Ini arah tax evasion (penyembunyian) — tidak boleh direkomendasikan",
    explanation: "Menyembunyikan transaksi adalah ilegal. Planning legal tidak menyembunyikan fakta."
  },
  {
    id: "TP-002",
    category: "tax-planner",
    level: "intermediate",
    type: "mcq",
    skill: "Alternatives",
    title: "Pilih alternatif legal",
    scenario: "Perusahaan membutuhkan aset. Opsi A: beli tunai tahun ini (penyusutan dimulai sesuai ketentuan). Opsi B: sewa operasi dengan biaya sewa deductible. Opsi C: catat fiktif sebagai biaya research tanpa kegiatan.",
    question: "Opsi mana yang tidak boleh dipilih?",
    options: [
      "Opsi A",
      "Opsi B",
      "Opsi C — dokumentasi/substansi fiktif",
      "A dan B sama-sama ilegal"
    ],
    answer: "Opsi C — dokumentasi/substansi fiktif",
    explanation: "A dan B bisa dibandingkan secara legal (capex vs opex/sewa). C adalah penyamaran transaksi."
  },
  {
    id: "TP-003",
    category: "tax-planner",
    level: "intermediate",
    type: "mcq",
    skill: "Tax Saving vs Risk",
    title: "Saving vs risiko",
    scenario: "Opsi 1: saving pajak Rp50.000.000 dengan argumen agresif dan dokumen lemah. Opsi 2: saving Rp20.000.000 dengan dasar jelas dan dokumen lengkap.",
    question: "Pilihan planner yang lebih bijak untuk klien jangka panjang?",
    options: [
      "Opsi 1 karena saving maksimal",
      "Opsi 2 — efisiensi wajar dengan risiko lebih rendah",
      "Tidak usah planning sama sekali",
      "Gabungkan keduanya dengan double claim"
    ],
    answer: "Opsi 2 — efisiensi wajar dengan risiko lebih rendah",
    explanation: "Planning menilai saving dan risiko. Argumen lemah berpotensi koreksi + sanksi yang menghapus saving."
  },
  {
    id: "TP-004",
    category: "tax-planner",
    level: "basic",
    type: "mcq",
    skill: "Timing",
    title: "Timing biaya deductible",
    scenario: "Perusahaan ingin menunda pengakuan biaya promosi yang sah ke tahun depan hanya di SPT, sementara secara komersial dan substansi biaya sudah terjadi tahun ini, tanpa dasar penundaan yang valid.",
    question: "Penilaian?",
    options: [
      "Sah sebagai timing strategy",
      "Berisiko — pelaporan harus selaras substansi; menunda semena-mena di SPT berpotensi salah periode",
      "Wajib dilakukan setiap akhir tahun",
      "Hanya relevan untuk PPN"
    ],
    answer: "Berisiko — pelaporan harus selaras substansi; menunda semena-mena di SPT berpotensi salah periode",
    explanation: "Timing legal tetap membutuhkan dasar pengakuan yang benar, bukan menggeser angka semena-mena."
  },

  /* ========== TAX AUDITOR ========== */
  {
    id: "TAD-001",
    category: "tax-auditor",
    level: "basic",
    type: "mcq",
    skill: "Find the Error",
    title: "Salah tarif PPh 23",
    scenario: "Staf memotong PPh 23 atas jasa teknik 2% dari Rp100.000.000 = Rp2.000.000. Setelah dicek, tarif yang seharusnya untuk transaksi itu 2% sudah benar, tetapi dasar yang dipakai adalah nilai termasuk PPN, padahal seharusnya DPP saja (asumsi kasus: DPP Rp100.000.000, PPN Rp11.000.000 terpisah, staf memotong dari 111.000.000).",
    question: "Temuan utama reviewer?",
    options: [
      "Tidak ada temuan",
      "Dasar pemotongan keliru (ikut PPN) sehingga PPh 23 lebih potong",
      "Harus dilapor sebagai PPh 21",
      "PPN tidak boleh dipungut"
    ],
    answer: "Dasar pemotongan keliru (ikut PPN) sehingga PPh 23 lebih potong",
    explanation: "Reviewer cek dasar pengenaan. Memotong dari nilai termasuk PPN saat seharusnya DPP menyebabkan salah hitung."
  },
  {
    id: "TAD-002",
    category: "tax-auditor",
    level: "basic",
    type: "mcq",
    skill: "Periode",
    title: "Salah masa pajak",
    scenario: "Faktur dan pembayaran jasa terjadi 5 Maret. Staf melaporkan pemotongan PPh 23 pada SPT Masa April karena 'terlambat input'.",
    question: "Risiko utama?",
    options: [
      "Tidak ada, asalkan dilapor",
      "Salah periode pelaporan — berpotensi dianggap terlambat/tidak sesuai masa",
      "Otomatis final",
      "Hanya masalah PPN"
    ],
    answer: "Salah periode pelaporan — berpotensi dianggap terlambat/tidak sesuai masa",
    explanation: "Kepatuhan masa sensitif terhadap periode. Salah masa = temuan klasik auditor internal/reviewer."
  },
  {
    id: "TAD-003",
    category: "tax-auditor",
    level: "intermediate",
    type: "mcq",
    skill: "Dokumentasi",
    title: "Dokumen tidak lengkap",
    scenario: "Rekap PPh 21 rapi, tetapi tidak ada bukti potong yang diserahkan ke karyawan dan daftar gaji tidak ditandatangani.",
    question: "Tindakan reviewer?",
    options: [
      "Loloskan karena angkanya cocok",
      "Temukan kelemahan dokumentasi; minta terbitkan/serahkan bukti potong dan lengkapi supporting",
      "Hapus seluruh PPh 21",
      "Pindahkan ke PPh 25"
    ],
    answer: "Temukan kelemahan dokumentasi; minta terbitkan/serahkan bukti potong dan lengkapi supporting",
    explanation: "Angka benar tanpa dokumen tetap berisiko saat pengujian formal."
  },
  {
    id: "TAD-004",
    category: "tax-auditor",
    level: "advanced",
    type: "mcq",
    skill: "Rekonsiliasi",
    title: "Review ke SPT 1771",
    scenario: "Laba komersial vs PKP di draf Lampiran I berbeda Rp100.000.000 tanpa daftar koreksi.",
    question: "Langkah reviewer?",
    options: [
      "Abaikan; yang penting Induk terisi",
      "Minta breakdown koreksi fiskal dan cocokkan ke supporting sebelum Induk 1771 difinalkan",
      "Paksa samakan angka dengan mengubah omzet tanpa jejak",
      "Hapus Lampiran I"
    ],
    answer: "Minta breakdown koreksi fiskal dan cocokkan ke supporting sebelum Induk 1771 difinalkan",
    explanation: "Auditor/reviewer menghubungkan temuan ke rekonsiliasi dan SPT 1771, bukan menutup selisih tanpa jejak."
  },

  /* ========== TAX MANAGER ========== */
  {
    id: "TM-001",
    category: "tax-manager",
    level: "basic",
    type: "mcq",
    skill: "Priority",
    title: "Prioritas deadline",
    scenario: "Hari ini Rabu. (1) SPT Masa PPh 21 jatuh tempo besok, belum direview. (2) Update template SOP internal, tenggat 3 minggu. (3) Riset fasilitas pajak untuk tahun depan.",
    question: "Prioritas tertinggi?",
    options: [
      "SOP internal",
      "SPT Masa PPh 21 yang jatuh tempo besok",
      "Riset fasilitas tahun depan",
      "Ketiganya sama rata"
    ],
    answer: "SPT Masa PPh 21 yang jatuh tempo besok",
    explanation: "Manager memprioritaskan kepatuhan bertenggat dekat dan berisiko sanksi."
  },
  {
    id: "TM-002",
    category: "tax-manager",
    level: "intermediate",
    type: "mcq",
    skill: "Delegation",
    title: "Delegasi vs review",
    scenario: "Staf junior menyusun rekap PPh 23 rutin. Transaksi material baru (nilai besar, klasifikasi abu-abu) muncul minggu ini.",
    question: "Tindakan manager?",
    options: [
      "Delegasikan semua tanpa review",
      "Biarkan junior selesaikan rekap rutin; review sendiri/mengarahkan analisis transaksi material",
      "Kerjakan semua sendirian termasuk entry harian",
      "Tunda transaksi material tanpa komunikasi"
    ],
    answer: "Biarkan junior selesaikan rekap rutin; review sendiri/mengarahkan analisis transaksi material",
    explanation: "Delegasi pekerjaan rutin; supervision ketat pada area berisiko tinggi."
  },
  {
    id: "TM-003",
    category: "tax-manager",
    level: "intermediate",
    type: "mcq",
    skill: "Risk Management",
    title: "10 pekerjaan",
    scenario: "Backlog: 3 SPT masa mendekati jatuh tempo, 1 draf tanggapan SP2DK, 2 arsip lama, 4 permintaan data non-urgent dari unit lain.",
    question: "Urutan fokus yang paling masuk akal?",
    options: [
      "Arsip lama dulu agar rapi",
      "SPT masa jatuh tempo → SP2DK → baru permintaan non-urgent/arsip",
      "Permintaan unit lain dulu demi politik internal",
      "Acak sesuai mood tim"
    ],
    answer: "SPT masa jatuh tempo → SP2DK → baru permintaan non-urgent/arsip",
    explanation: "Risk-based: sanksi keterlambatan dan respons resmi ke otoritas didahulukan."
  },
  {
    id: "TM-004",
    category: "tax-manager",
    level: "basic",
    type: "mcq",
    skill: "Supervision",
    title: "Review pekerjaan staf",
    scenario: "Sebelum pelaporan SPT 1771, staf menyerahkan Induk tanpa lampiran rekonsiliasi yang sudah di-review.",
    question: "Respons manager?",
    options: [
      "Laporkan saja agar tidak terlambat",
      "Tahan pelaporan internal sampai Lampiran I/rekon direview dan angka cocok",
      "Tandatangani tanpa membaca",
      "Hapus semua koreksi agar cepat"
    ],
    answer: "Tahan pelaporan internal sampai Lampiran I/rekon direview dan angka cocok",
    explanation: "Quality gate sebelum submit. Keterkaitan Induk–Lampiran adalah tanggung jawab supervisori."
  }
];
