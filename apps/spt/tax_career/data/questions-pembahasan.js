/**
 * Pembahasan berlapis untuk Bank soal Tax Career (Fase 3).
 * Dimuat setelah questions.js; menempelkan `pembahasan` ke tiap soal berdasarkan id.
 * Bidang: konsep, dasar, langkah[], salah[] (alasan untuk opsi salah, urut sesuai opsi asli tanpa kunci),
 * jebakan, ingat.
 */
(function () {
  var P = {
  "TC-001": {
    "konsep": "PPh 21 atas gaji pegawai tetap dijalankan sebagai satu alur kepatuhan: hitung (TER Jan–Nov, progresif di masa terakhir), potong dari gaji, setor ke kas negara, lapor SPT Masa, dan serahkan bukti potong ke pegawai.",
    "dasar": "UU 7/1983 (PPh) Pasal 21; PP 58/2023; PMK 168/2023; batas setor tanggal 10 dan lapor tanggal 20 bulan berikutnya (PMK 242/PMK.03/2014, dari pengetahuan umum)",
    "salah": [
      "Yang wajib memotong adalah pemberi kerja. Karyawan hanya menerima bukti potong untuk dipakai di SPT Tahunan.",
      "PPh 21 dipotong tiap masa pajak; menunda sampai akhir tahun melanggar kewajiban dan berisiko sanksi.",
      "Hubungan kerja (gaji) adalah PPh 21. PPh 23 untuk jasa yang dibayar kepada pihak lain, bukan pegawai."
    ],
    "jebakan": "Menganggap pajak gaji urusan karyawan atau menggeser ke PPh 23 karena melihat ada \"jasa\".",
    "ingat": "Hitung–Potong–Setor–Lapor–Bukti potong."
  },
  "TC-002": {
    "konsep": "Jasa teknik yang dibayar kepada WP dalam negeri adalah objek PPh 23 dengan tarif 2% dari jumlah bruto (tidak termasuk PPN). Pemotong wajib potong, setor, lapor, dan menyerahkan bukti potong.",
    "dasar": "UU 7/1983 (PPh) Pasal 23; PMK 141/PMK.03/2015 (jenis jasa)",
    "langkah": [
      "Dasar pemotongan = Rp100.000.000 (di luar PPN)",
      "PPh 23 = 2% × 100.000.000 = Rp2.000.000"
    ],
    "salah": [
      "PPh 23 dipotong oleh pembayar saat pembayaran; penerima tinggal mengkreditkannya di SPT Tahunan.",
      "PPh 21 untuk penghasilan hubungan kerja/orang pribadi; CV adalah badan penerima jasa.",
      "PPN dan PPh 23 adalah kewajiban terpisah dan dapat berlaku sekaligus pada satu transaksi."
    ],
    "jebakan": "Mengira faktur PPN menggantikan pemotongan PPh.",
    "ingat": "Jasa ke badan = PPh 23 (2%), PPN tetap terpisah."
  },
  "TC-003": {
    "konsep": "Sewa tanah/bangunan dikenai PPh final Pasal 4 ayat (2) sebesar 10% dari bruto. Final berarti sisi penerima sewa selesai atas penghasilan itu, tetapi pemotong tetap wajib memotong, menyetor, melapor, dan menerbitkan bukti potong.",
    "dasar": "UU 7/1983 (PPh) Pasal 4 ayat (2); PP 34/2017",
    "salah": [
      "Sewa tanah/bangunan bersifat final, bukan dikreditkan di SPT Tahunan penyewa.",
      "Bukti potong tetap diterbitkan; final tidak menghapus administrasi pemotong.",
      "PPh dilaporkan di SPT Masa PPh, bukan SPT Masa PPN. PPN atas sewa (bila ada) terpisah."
    ],
    "jebakan": "\"Final\" bukan berarti bebas administrasi.",
    "ingat": "Final = beban penerima selesai; pemotong tetap potong–setor–lapor–bukti potong."
  },
  "TC-004": {
    "konsep": "PPh 25 adalah angsuran bulanan PPh tahun berjalan, dihitung dari PPh terutang pada SPT Tahunan tahun lalu setelah dikurangi kredit pajak, dibagi 12. Angsuran yang sudah dibayar dikreditkan di SPT Tahunan.",
    "dasar": "UU 7/1983 (PPh) Pasal 25",
    "langkah": [
      "Angsuran = (PPh terutang tahun lalu − kredit pajak) ÷ 12",
      "Contoh ilustrasi: (240.000.000 − 60.000.000) ÷ 12 = Rp15.000.000 per bulan"
    ],
    "salah": [
      "PPh 21 dan 23 adalah SPT Masa tersendiri; PPh 25 tidak menggantikannya.",
      "Angsuran dikreditkan di SPT Tahunan, jadi terkait langsung.",
      "PPh 4(2) final tidak dikreditkan, sedangkan PPh 25 dikreditkan."
    ],
    "jebakan": "Menyamakan PPh 25 dengan pajak final.",
    "ingat": "25 = angsuran (dikreditkan), 4(2) = final (tidak)."
  },
  "TC-005": {
    "konsep": "PPN yang harus disetor adalah Pajak Keluaran dikurangi Pajak Masukan yang dapat dikreditkan. Hasil positif berarti kurang bayar.",
    "dasar": "UU 8/1983 (PPN) Pasal 9 ayat (1)",
    "langkah": [
      "Pajak Keluaran 50.000.000 − Pajak Masukan 30.000.000",
      "= Rp20.000.000 kurang bayar"
    ],
    "salah": [
      "Terbalik: lebih bayar terjadi bila Pajak Masukan lebih besar dari Pajak Keluaran.",
      "Jual dan beli tidak saling batal; yang dihitung adalah selisih keduanya.",
      "Pajak Masukan dikreditkan lewat SPT Masa PPN bila syaratnya terpenuhi, sehingga ikut diperhitungkan."
    ],
    "jebakan": "Pajak Masukan hanya bisa dikreditkan bila memenuhi syarat (faktur sah, berhubungan dengan usaha).",
    "ingat": "Setor = Keluaran − Masukan."
  },
  "TC-006": {
    "konsep": "Kepatuhan masa (PPh 21/23, PPN, dan lain-lain) berjalan sepanjang tahun, sedangkan SPT Tahunan PPh Badan (formulir 1771) menutup kewajiban setahun, termasuk rekonsiliasi fiskal. Keduanya terpisah dan sama-sama wajib.",
    "dasar": "UU 6/1983 (KUP) Pasal 3 (kewajiban menyampaikan SPT Masa dan SPT Tahunan)",
    "salah": [
      "SPT Masa PPN dan SPT Tahunan PPh Badan adalah jenis SPT berbeda.",
      "SPT Tahunan tetap wajib meski semua masa sudah dilaporkan.",
      "Lampiran 1771 untuk PPh Badan, bukan PPh 21 karyawan."
    ],
    "jebakan": "Mengira pelaporan masa menggantikan SPT Tahunan.",
    "ingat": "Masa = periodik; Tahunan = menutup tahun (badan: batas 30 April untuk tahun kalender)."
  },
  "TA-001": {
    "konsep": "Biaya entertainment tanpa daftar nominatif yang memadai tidak boleh dikurangkan secara fiskal, sehingga laba fiskal bertambah: koreksi fiskal positif.",
    "dasar": "UU 7/1983 (PPh) Pasal 6 ayat (1) huruf a; ketentuan daftar nominatif (PMK-02/PMK.03/2010, dari pengetahuan umum)",
    "langkah": [
      "Laba komersial 500.000.000",
      "Koreksi positif +20.000.000",
      "Laba fiskal = Rp520.000.000"
    ],
    "salah": [
      "Koreksi negatif mengurangi laba; arahnya terbalik untuk biaya non-deductible.",
      "Pembukuan komersial tidak otomatis diterima secara fiskal; perlu dikoreksi.",
      "PPh 25 adalah angsuran, bukan alat mengoreksi laba fiskal."
    ],
    "jebakan": "Menukar arah koreksi: biaya yang ditolak fiskal menambah laba (positif).",
    "ingat": "Biaya ditolak = positif (+)."
  },
  "TA-002": {
    "konsep": "Sanksi administrasi pajak (bunga, denda, kenaikan) tidak boleh dikurangkan dan tidak berbalik di tahun lain, sehingga merupakan beda tetap (permanen) dengan koreksi positif.",
    "dasar": "UU 7/1983 (PPh) Pasal 9 ayat (1); PSAK 212 (beda temporer vs permanen)",
    "salah": [
      "Beda temporer berbalik di tahun lain (mis. penyusutan); sanksi pajak tidak berbalik.",
      "Sanksi pajak umumnya non-deductible, bukan deductible.",
      "Ini perbedaan pengakuan biaya PPh, bukan klasifikasi PPN."
    ],
    "jebakan": "Mencampur beda waktu dan beda tetap.",
    "ingat": "Permanen tidak pernah diakui fiskal; temporer berbalik."
  },
  "TA-003": {
    "konsep": "Penghasilan yang sudah dikenai PPh final dikeluarkan dari perhitungan PKP tarif umum lewat koreksi negatif, agar tidak dikenai pajak dua kali.",
    "dasar": "UU 7/1983 (PPh) Pasal 4 ayat (2)",
    "langkah": [
      "Laba komersial memuat sewa final Rp10.000.000",
      "Koreksi negatif −10.000.000 agar tidak ikut PKP tarif umum"
    ],
    "salah": [
      "Koreksi positif akan menambah penghasilan, bukan mengeluarkannya.",
      "Tanpa koreksi, penghasilan yang sudah final ikut dikenai tarif umum lagi.",
      "Ini PPh, bukan PPN Keluaran."
    ],
    "jebakan": "Biaya yang terkait penghasilan final umumnya tidak boleh dikurangkan, sehingga dikoreksi positif.",
    "ingat": "Penghasilan final keluar (−); biayanya masuk (+)."
  },
  "TA-004": {
    "konsep": "Laba fiskal = laba komersial + koreksi positif − koreksi negatif.",
    "dasar": "Struktur rekonsiliasi fiskal (UU PPh Pasal 6 dan 9)",
    "langkah": [
      "400 + 50 − 30",
      "= Rp420.000.000"
    ],
    "salah": [
      "380 = 400 − 50 + 30; arah kedua koreksi terbalik.",
      "480 = 400 + 50 + 30; koreksi negatif ikut ditambahkan.",
      "320 = 400 − 50 − 30; koreksi positif justru dikurangkan."
    ],
    "jebakan": "Menjumlahkan semua koreksi tanpa memperhatikan tandanya.",
    "ingat": "Positif tambah, negatif kurang."
  },
  "TA-005": {
    "konsep": "Hasil rekonsiliasi fiskal dilaporkan pada Lampiran I SPT Tahunan PPh Badan (1771) dan mengalir ke Induk 1771.",
    "dasar": "Struktur SPT Tahunan PPh Badan (1771)",
    "salah": [
      "Modul PPN faktur untuk PPN, bukan rekonsiliasi PPh.",
      "SPT Masa PPh 21 untuk pemotongan gaji.",
      "Rekonsiliasi justru bagian inti SPT 1771."
    ],
    "jebakan": "Menyimpan rekonsiliasi sebagai berkas terpisah tanpa menghubungkan ke Induk.",
    "ingat": "Rekonsiliasi = Lampiran I 1771 → Induk."
  },
  "TCO-001": {
    "konsep": "Konsultan menguji substansi transaksi, bukan judul kontrak. Hak pakai ruangan tanpa jasa lain yang material lebih dekat ke sewa (PPh 4(2) final 10%) daripada jasa (PPh 23 2%).",
    "dasar": "UU PPh Pasal 4 ayat (2) dan Pasal 23; PP 34/2017",
    "langkah": [
      "Sebagai sewa: 10% × 200.000.000 = Rp20.000.000",
      "Sebagai jasa: 2% × 200.000.000 = Rp4.000.000",
      "Selisih Rp16.000.000 bila salah klasifikasi"
    ],
    "salah": [
      "PPh 21 untuk hubungan kerja; kata \"jasa\" saja tidak membuatnya PPh 21.",
      "Kontrak adalah bukti awal tetapi substansi tetap diuji.",
      "Memilih tarif terendah tanpa analisis menimbulkan risiko kurang potong."
    ],
    "jebakan": "Terkecoh judul kontrak. Selain PPh, nilai juga perlu dicek implikasi PPN atas persewaan.",
    "ingat": "Substansi > judul."
  },
  "TCO-002": {
    "konsep": "Konsultan tidak menghapus kewajiban pemotongan. Ia menjelaskan risiko dan cara patuh, termasuk bahwa penerima tanpa NPWP dikenai tarif 100% lebih tinggi.",
    "dasar": "UU 7/1983 (PPh) Pasal 23 (tarif 100% lebih tinggi tanpa NPWP); UU KUP (sanksi)",
    "langkah": [
      "Contoh jasa Rp50.000.000: tarif 2% → Rp1.000.000",
      "Tanpa NPWP: 4% → Rp2.000.000"
    ],
    "salah": [
      "Menyetujui pengabaian kewajiban berarti ikut menanggung risiko kepatuhan.",
      "Mengubah jasa menjadi hibah adalah penyamaran transaksi (arah evasi).",
      "Menunda tanpa analisis tidak menghapus kewajiban dan dapat menambah sanksi."
    ],
    "jebakan": "Menganggap \"tidak ribet\" lebih penting daripada kepatuhan.",
    "ingat": "Tanpa NPWP: tarif × 2."
  },
  "TCO-003": {
    "konsep": "SP2DK adalah permintaan penjelasan atas data/keterangan; belum berupa ketetapan, tetapi harus dijawab. Langkah awal yang baik: petakan isu dan kumpulkan dokumen pendukung sebelum menjawab.",
    "dasar": "PMK 111/2025 (pengawasan kepatuhan; tanggapan 14 hari, dapat diperpanjang 7 hari, menurut pemberitaan)",
    "salah": [
      "SP2DK bukan ketetapan, namun mengabaikannya membuka jalan ke tindak lanjut yang lebih berat.",
      "Membayar semua dugaan tanpa menguji bisa mengakui hal yang belum tentu benar.",
      "Menghapus data membuat posisi jauh lebih buruk dan berpotensi masalah hukum."
    ],
    "jebakan": "Mengira \"belum SKP\" berarti boleh diabaikan.",
    "ingat": "Pahami → kumpulkan dokumen → jawab tepat waktu."
  },
  "TCO-004": {
    "konsep": "Satu transaksi dapat menimbulkan beberapa pajak. PPN (klasifikasi produk) dan PPh atas komisi dianalisis terpisah, masing-masing dengan posisi, risiko, dan dokumen.",
    "dasar": "UU PPN dan UU PPh; PMK 141/PMK.03/2015 (jasa tertentu objek PPh 23)",
    "salah": [
      "PPh atas komisi adalah kewajiban terpisah yang tidak boleh diabaikan.",
      "Agen bukan karyawan; PPh 21 gaji tidak otomatis berlaku.",
      "Menunda sampai pemeriksaan memperbesar risiko."
    ],
    "jebakan": "Memberi satu jawaban generik untuk kasus multi-pajak.",
    "ingat": "Satu transaksi, beberapa pajak: bahas satu per satu."
  },
  "TCO-005": {
    "konsep": "WP boleh membetulkan SPT atas kemauan sendiri selama DJP belum memulai pemeriksaan. Jika pembetulan menambah pajak, kurang bayar dikenai sanksi bunga, tetapi jauh lebih ringan daripada ditemukan DJP.",
    "dasar": "UU 6/1983 (KUP) Pasal 8 s.t.d.t.d. UU 7/2021",
    "langkah": [
      "Contoh ilustrasi: kurang bayar 100.000.000, 3 bulan, tarif bunga 1,02% per bulan",
      "Bunga = 100.000.000 × 1,02% × 3 = Rp3.060.000 (tarif berubah tiap bulan; cek KMK)"
    ],
    "salah": [
      "Menunggu berarti risiko ditemukan DJP dan sanksi yang lebih berat.",
      "Setelah pemeriksaan dimulai (SP2 diterima), hak pembetulan atas kemauan sendiri hilang.",
      "Pembetulan harus dengan pernyataan tertulis; penyampaian lisan tidak cukup."
    ],
    "jebakan": "Menunda berharap tidak terdeteksi.",
    "ingat": "Lebih awal, lebih murah."
  },
  "TCO-006": {
    "konsep": "DJP berwenang menguji kewajaran dan kelaziman usaha (arm's length) pada transaksi hubungan istimewa. Harga beli jauh di atas harga pasar dapat dikoreksi ke harga wajar sehingga laba kena pajak naik.",
    "dasar": "UU 7/1983 (PPh) Pasal 18 ayat (3)",
    "salah": [
      "Kontrak tertulis tidak menghilangkan pengujian kewajaran harga.",
      "Transaksi antar grup tidak otomatis bebas pajak.",
      "Risiko justru lazim pada transaksi lintas negara, tetapi juga dapat muncul pada transaksi dalam negeri."
    ],
    "jebakan": "Menganggap kontrak cukup sebagai pembenaran harga.",
    "ingat": "Hubungan istimewa → uji arm's length; siapkan dokumentasi transfer pricing."
  },
  "TP-001": {
    "konsep": "Menghilangkan penjualan dari pembukuan adalah penyembunyian penghasilan (tax evasion), tindakan ilegal. Perencanaan pajak yang sah memakai pilihan legal tanpa menyembunyikan fakta.",
    "dasar": "Prinsip tax planning vs evasion; UU KUP (ketentuan pidana)",
    "salah": [
      "Menyembunyikan transaksi bukan efisiensi, melainkan pelanggaran.",
      "Tidak ada batas nilai yang membuat penyembunyian menjadi sah.",
      "Ketiadaan faktur PPN tidak membuat penghilangan penghasilan menjadi boleh."
    ],
    "jebakan": "Menyebut penghilangan transaksi sebagai \"strategi\".",
    "ingat": "Legal = efisiensi; ilegal = menyembunyikan."
  },
  "TP-002": {
    "konsep": "Beli tunai (aset, disusutkan) dan sewa operasi (biaya sewa) adalah alternatif legal yang dapat dibandingkan. Mencatat biaya riset fiktif tanpa kegiatan adalah penyamaran transaksi.",
    "dasar": "Prinsip substansi di atas bentuk; UU PPh Pasal 6 (biaya harus nyata untuk menagih, mendapatkan, memelihara penghasilan)",
    "salah": [
      "Opsi A (beli tunai) adalah alternatif legal.",
      "Opsi B (sewa operasi) adalah alternatif legal.",
      "A dan B legal; justru C yang bermasalah."
    ],
    "jebakan": "Menganggap semua opsi sama selama ada pencatatan.",
    "ingat": "Biaya harus nyata dan berdokumen."
  },
  "TP-003": {
    "konsep": "Perencanaan yang baik menilai penghematan dan risiko sekaligus. Penghematan Rp20 juta dengan dasar kuat lebih bijak daripada Rp50 juta dengan dokumen lemah yang berpotensi dikoreksi plus sanksi.",
    "dasar": "Praktik profesional; bukan ketentuan perundang-undangan",
    "langkah": [
      "Opsi 1: 50.000.000 dikurangi risiko koreksi + sanksi",
      "Opsi 2: 20.000.000 dengan risiko rendah"
    ],
    "salah": [
      "Penghematan besar tidak berarti jika dikoreksi dan dikenai sanksi.",
      "Tidak berencana juga bukan pilihan bijak; yang dicari efisiensi wajar.",
      "Klaim ganda justru meningkatkan risiko."
    ],
    "jebakan": "Mengejar angka saving tanpa menilai risiko.",
    "ingat": "Saving × kepastian posisi."
  },
  "TP-004": {
    "konsep": "Pengakuan biaya harus selaras dengan substansi dan periode terjadinya. Menggeser biaya ke tahun lain tanpa dasar valid berisiko salah periode.",
    "dasar": "UU 6/1983 (KUP) Pasal 28 (pembukuan); konsistensi pengakuan",
    "salah": [
      "Tanpa dasar pengakuan yang valid, penundaan bukan strategi yang sah.",
      "Tidak ada kewajiban menunda biaya tiap akhir tahun.",
      "Pengakuan biaya terkait PPh, bukan hanya PPN."
    ],
    "jebakan": "Memperlakukan angka SPT seperti bisa digeser sesuka hati.",
    "ingat": "Timing sah hanya bila ada dasar pengakuan."
  },
  "TAD-001": {
    "konsep": "Dasar pemotongan PPh 23 adalah DPP (jumlah bruto tanpa PPN). Memotong dari nilai termasuk PPN membuat PPh lebih potong.",
    "dasar": "UU 7/1983 (PPh) Pasal 23; dasar pemotongan di luar PPN",
    "langkah": [
      "Seharusnya: 2% × 100.000.000 = Rp2.000.000",
      "Dipotong: 2% × 111.000.000 = Rp2.220.000",
      "Lebih potong Rp220.000"
    ],
    "salah": [
      "Ada temuan pada dasar pemotongan yang ikut PPN.",
      "Jasa teknik objek PPh 23, bukan PPh 21.",
      "PPN tetap dipungut; ia tidak ikut menjadi dasar PPh."
    ],
    "jebakan": "Menghitung PPh dari nilai tagihan termasuk PPN.",
    "ingat": "PPh dari DPP, bukan dari total tagihan."
  },
  "TAD-002": {
    "konsep": "Masa pajak PPh 23 mengikuti saat pembayaran/terutang (Maret). Melaporkannya di masa April adalah salah periode dan berpotensi terlambat.",
    "dasar": "UU KUP Pasal 7 ayat (1); batas setor tanggal 10 dan lapor tanggal 20 bulan berikutnya (PMK 242/PMK.03/2014, dari pengetahuan umum)",
    "langkah": [
      "Pemotongan Maret → setor paling lambat 10 April, lapor paling lambat 20 April",
      "Dilaporkan di masa April → terlambat; denda SPT Masa Rp100.000 per SPT"
    ],
    "salah": [
      "Dilapor saja tidak cukup; masa pajaknya harus benar.",
      "Pemotongan PPh 23 tidak otomatis final.",
      "Masalahnya PPh 23, bukan hanya PPN."
    ],
    "jebakan": "Menunda input lalu memasukkannya ke masa berikutnya.",
    "ingat": "Masa pajak mengikuti kapan terjadi, bukan kapan diinput."
  },
  "TAD-003": {
    "konsep": "Angka yang cocok tidak cukup. Pemotong wajib menyerahkan bukti potong kepada penerima penghasilan dan menyimpan dokumen pendukung yang lengkap.",
    "dasar": "UU 7/1983 (PPh) Pasal 21; UU 6/1983 (KUP) Pasal 28 (pembukuan dan dokumen)",
    "salah": [
      "Tanpa bukti potong dan dokumen, angka benar tetap lemah saat diuji.",
      "Menghapus PPh 21 menghilangkan kewajiban yang nyata.",
      "PPh 25 adalah angsuran, bukan pengganti PPh 21."
    ],
    "jebakan": "Menilai kepatuhan hanya dari angka.",
    "ingat": "Angka + dokumen = bukti."
  },
  "TAD-004": {
    "konsep": "Selisih laba komersial dan PKP harus dijelaskan oleh daftar koreksi fiskal yang bersumber dari dokumen pendukung sebelum Induk 1771 difinalkan.",
    "dasar": "Struktur SPT Tahunan PPh Badan; prinsip jejak audit",
    "salah": [
      "Induk dan Lampiran I harus konsisten.",
      "Mengubah omzet tanpa jejak menyembunyikan masalah.",
      "Lampiran I tempat rekonsiliasi; tidak boleh dihapus."
    ],
    "jebakan": "Menutup selisih tanpa jejak.",
    "ingat": "Selisih harus punya penjelasan."
  },
  "TM-001": {
    "konsep": "Manager memprioritaskan kewajiban bertenggat paling dekat dan berisiko sanksi: SPT Masa PPh 21 yang jatuh tempo besok didahulukan daripada pekerjaan internal atau riset.",
    "dasar": "Praktik profesional; bukan ketentuan perundang-undangan; denda keterlambatan SPT Masa (UU KUP Pasal 7)",
    "salah": [
      "SOP internal memiliki tenggat 3 minggu dan tidak berisiko sanksi.",
      "Riset fasilitas tahun depan tidak mendesak.",
      "Ketiganya tidak sama; tenggat dan risikonya berbeda."
    ],
    "jebakan": "Menyamakan semua pekerjaan.",
    "ingat": "Tenggat dekat + sanksi = paling atas."
  },
  "TM-002": {
    "konsep": "Pekerjaan rutin didelegasikan, sedangkan transaksi material yang klasifikasinya abu-abu perlu review atau arahan manager.",
    "dasar": "Praktik profesional; bukan ketentuan perundang-undangan",
    "salah": [
      "Delegasi tanpa review menaikkan risiko pada transaksi material.",
      "Mengerjakan semua sendiri tidak efisien dan tidak mengembangkan tim.",
      "Menunda tanpa komunikasi memperbesar risiko dan membingungkan tim."
    ],
    "jebakan": "Delegasi penuh atau kontrol penuh.",
    "ingat": "Rutin → delegasi; material → supervisi."
  },
  "TM-003": {
    "konsep": "Pendekatan berbasis risiko: SPT masa yang mendekati jatuh tempo dan tanggapan resmi SP2DK didahulukan; permintaan non-urgent dan arsip menyusul.",
    "dasar": "Praktik profesional; bukan ketentuan perundang-undangan; PMK 111/2025 (tenggat tanggapan SP2DK)",
    "salah": [
      "Arsip lama tidak berisiko sanksi.",
      "Permintaan non-urgent dari unit lain tidak mengalahkan tenggat resmi.",
      "Urutan acak mengabaikan risiko."
    ],
    "jebakan": "Mengurutkan berdasarkan kenyamanan, bukan risiko.",
    "ingat": "Sanksi dan otoritas dulu."
  },
  "TM-004": {
    "konsep": "Sebelum pelaporan, manager menahan submit sampai Lampiran I/rekonsiliasi direview dan angka cocok dengan Induk (quality gate).",
    "dasar": "Praktik profesional; bukan ketentuan perundang-undangan",
    "salah": [
      "Melapor tanpa review berisiko salah dan harus dibetulkan.",
      "Menandatangani tanpa membaca tidak memenuhi tanggung jawab supervisi.",
      "Menghapus koreksi membuat laporan tidak mencerminkan fakta."
    ],
    "jebakan": "Mengejar kecepatan melapor, mengorbankan ketepatan.",
    "ingat": "Tahan sampai terreview dan cocok."
  }
};
  (window.TAX_CAREER_QUESTIONS || []).forEach(function (q) {
    var p = P[q.id];
    if (!p) return;
    if (Array.isArray(p.salah)) {
      var wrong = (q.options || []).filter(function (o) { return o !== q.answer; });
      var m = {};
      wrong.forEach(function (o, i) { if (p.salah[i]) m[o] = p.salah[i]; });
      p = Object.assign({}, p, { salah: m });
    }
    q.pembahasan = p;
  });
})();
