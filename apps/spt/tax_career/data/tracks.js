/**
 * Tax Career & Practice — definisi jalur karier + materi Learn singkat.
 * Dipakai oleh tax_career/app.js. Tidak bergantung pada framework.
 */
window.TAX_CAREER_TRACKS = [
  {
    id: "tax-compliance",
    title: "Tax Compliance",
    subtitle: "Kepatuhan administratif & pelaporan rutin",
    icon: "📋",
    color: "#004b87",
    linkSpt: {
      label: "Lanjut ke Simulator SPT / Modul Pajak",
      href: "../modul_pajak/index.html",
      note: "Setelah paham kewajiban masa & tahunan, praktikkan pengisian di simulator SPT."
    },
    learn: [
      {
        heading: "Peran Tax Compliance",
        body: "Tax Compliance memastikan kewajiban pajak terpenuhi tepat waktu: hitung, potong/pungut, setor, lapor, dan simpan dokumentasi. Fokusnya operasional harian, bukan perencanaan agresif."
      },
      {
        heading: "Kalender Pajak",
        body: "Setiap jenis pajak punya masa pajak, batas setor, dan batas lapor. Contoh umum: PPh 21/23/4(2) setor & lapor mengikuti ketentuan masa; PPN masa bulanan; SPT Tahunan mengikuti tahun pajak. Lewat jatuh tempo = risiko sanksi."
      },
      {
        heading: "Subjek, Objek, dan Jenis Pajak",
        body: "Subjek = siapa yang dikenai/berkewajiban. Objek = apa yang dikenai pajak (penghasilan, penyerahan BKP/JKP, dll.). Jenis pajak menentukan tarif, cara potong/pungut, dan formulir (SPT Masa vs Tahunan)."
      },
      {
        heading: "SPT Masa vs SPT Tahunan",
        body: "SPT Masa melaporkan kewajiban per masa (mis. PPh 21, PPh 23, PPN). SPT Tahunan merekapitulasi penghasilan setahun (OP/Badan). SPT 1771 adalah formulir SPT Tahunan Badan — praktiknya ada di simulator formulir 1771."
      },
      {
        heading: "Dokumentasi Minimum",
        body: "Simpan bukti potong, faktur pajak, SSP/kode billing, kontrak, daftar gaji, dan rekap transaksi. Tanpa dokumen, perhitungan benar sekalipun sulit dibuktikan saat pemeriksaan."
      }
    ]
  },
  {
    id: "tax-accountant",
    title: "Tax Accountant",
    subtitle: "Akuntansi → rekonsiliasi fiskal → pajak",
    icon: "🧮",
    color: "#2e7d32",
    linkSpt: {
      label: "Praktik Rekonsiliasi di Formulir 1771 Lampiran I",
      href: "../formulir_spt/1771_Lampiran_I.html",
      note: "Hasil rekonsiliasi fiskal mengalir ke Induk SPT 1771."
    },
    foundationModule: "commercial-fiscal",
    foundationLabel: "Fondasi: Commercial & Fiscal Tax Accounting",
    learn: [
      {
        heading: "Dari Laba Komersial ke Laba Fiskal",
        body: "Laporan keuangan komersial mengikuti SAK. Untuk pajak, angka tersebut dikoreksi menjadi laba fiskal sesuai ketentuan perpajakan. Selisih disebut koreksi fiskal."
      },
      {
        heading: "Koreksi Positif & Negatif",
        body: "Koreksi positif menambah penghasilan kena pajak (mis. biaya tidak boleh dikurangkan). Koreksi negatif mengurangi PKP (mis. penghasilan yang sudah final/dikecualikan)."
      },
      {
        heading: "Permanent vs Temporary Difference",
        body: "Permanent: tidak pernah bolak-balik (mis. biaya sumbangan non-deductible). Temporary: perbedaan waktu pengakuan (mis. penyusutan) yang akan berbalik di periode lain."
      },
      {
        heading: "Biaya Deductible vs Non-deductible",
        body: "Umumnya biaya untuk mendapatkan, menagih, dan memelihara penghasilan boleh dikurangkan jika memenuhi syarat. Hiburan berlebihan, sanksi pajak, dan biaya personal biasanya tidak boleh."
      },
      {
        heading: "Hubungan ke SPT 1771",
        body: "Rekonsiliasi fiskal adalah inti Lampiran I SPT 1771. Tax Accountant memastikan angka di SPT selaras dengan pembukuan setelah koreksi."
      }
    ]
  },
  {
    id: "tax-consultant",
    title: "Tax Consultant",
    subtitle: "Analisis kasus klien & rekomendasi",
    icon: "💼",
    color: "#6a1b9a",
    linkSpt: {
      label: "Kembali ke SIM-SPT untuk uji kasus formulir",
      href: "../index.html",
      note: "Rekomendasi konsultan sering berujung pada pembetulan/pelaporan di SPT."
    },
    learn: [
      {
        heading: "Peran Konsultan",
        body: "Menganalisis fakta klien, memetakan isu pajak, menilai risiko, dan memberi rekomendasi yang dapat dipertanggungjawabkan — bukan sekadar menebak tarif."
      },
      {
        heading: "Kerangka Analisis Kasus",
        body: "1) Pahami fakta & dokumen. 2) Identifikasi isu (jenis pajak, subjek, objek). 3) Bandingkan dengan konsep/aturan relevan. 4) Nilai risiko. 5) Usulkan opsi + dokumen pendukung."
      },
      {
        heading: "Risiko Komunikasi",
        body: "Sampaikan ketidakpastian dengan jujur. Bedakan antara posisi agresif (risiko tinggi) dan posisi konservatif. Dokumentasikan asumsi dan sumber."
      },
      {
        heading: "Tingkat Kompetensi",
        body: "Junior: identifikasi isu dasar & dokumen. Intermediate: analisis multi-pajak. Advanced: struktur transaksi, konflik ketentuan, dan mitigasi risiko."
      }
    ]
  },
  {
    id: "tax-planner",
    title: "Tax Planner",
    subtitle: "Perencanaan pajak legal & efisiensi",
    icon: "🧭",
    color: "#e65100",
    linkSpt: {
      label: "Cek dampak perencanaan ke SPT Tahunan",
      href: "../formulir_spt/1771_induk.html",
      note: "Perencanaan yang baik harus tetap bisa dilaporkan dengan benar di SPT."
    },
    learn: [
      {
        heading: "Tax Planning vs Evasion",
        body: "Tax planning memanfaatkan pilihan legal (timing, struktur, fasilitas). Tax evasion = menyembunyikan/memalsukan — ilegal. Modul ini hanya membahas perencanaan legal."
      },
      {
        heading: "Tax Avoidance yang Legal",
        body: "Memilih alternatif transaksi yang sah dengan beban pajak lebih efisien, tanpa menyembunyikan fakta. Selalu bandingkan saving vs risiko sengketa."
      },
      {
        heading: "Timing & Karakter Biaya",
        body: "Kapan mengakui penghasilan/biaya, dan apakah biaya deductible, mempengaruhi PKP tahun berjalan. Perencanaan timing harus selaras dengan substansi ekonomi."
      },
      {
        heading: "Tax Risk",
        body: "Efisiensi tinggi dengan argumen lemah = risiko koreksi, sanksi, dan biaya sengketa. Pilih opsi yang saving-nya masuk akal dan dokumentasinya kuat."
      }
    ]
  },
  {
    id: "tax-auditor",
    title: "Tax Auditor / Reviewer",
    subtitle: "Find the Error — temukan salah hitung & risiko",
    icon: "🔍",
    color: "#c62828",
    linkSpt: {
      label: "Review angka di Formulir 1771",
      href: "../formulir_spt/1771_induk.html",
      note: "Reviewer sering memverifikasi lampiran rekonsiliasi dan induk SPT sebelum pelaporan."
    },
    learn: [
      {
        heading: "Mindset Reviewer",
        body: "Bukan mengisi formulir, melainkan menguji: apakah tarif, dasar, periode, klasifikasi, dan dokumen sudah benar? Cari inkonsistensi."
      },
      {
        heading: "Kesalahan Umum",
        body: "Salah tarif, salah objek, salah periode masa pajak, dokumen tidak lengkap, klasifikasi jasa vs sewa keliru, PM/PK tidak balance, koreksi fiskal terlewat."
      },
      {
        heading: "Find the Error",
        body: "Dari data transaksi/rekap, tandai temuan, jelaskan mengapa salah, risiko (kurang bayar/salah lapor), cara perbaiki, dan dokumen yang harus dicek."
      },
      {
        heading: "Level Review",
        body: "Basic: satu jenis pajak, satu kesalahan jelas. Intermediate: beberapa temuan. Advanced: rantai dampak ke SPT Tahunan/rekonsiliasi."
      }
    ]
  },
  {
    id: "tax-manager",
    title: "Tax Manager / Supervisor",
    subtitle: "Prioritas, review staf, dan manajemen risiko",
    icon: "👔",
    color: "#00695c",
    linkSpt: {
      label: "Pantau alur kepatuhan di SIM-SPT",
      href: "../index.html",
      note: "Manager memastikan staf menyelesaikan masa & tahunan sebelum deadline."
    },
    learn: [
      {
        heading: "Peran Tax Manager",
        body: "Mengawasi kepatuhan, membagi kerja, mereview output staf, mengelola deadline, dan memutuskan prioritas saat sumber daya terbatas."
      },
      {
        heading: "Compliance Monitoring",
        body: "Pantau kalender setor/lapor, status SPT, bukti potong, dan open item dari review sebelumnya. Escalation jika mendekati jatuh tempo."
      },
      {
        heading: "Risk-Based Priority",
        body: "Utamakan pekerjaan dengan dampak sanksi/denda tinggi, nilai material, atau tenggat terdekat. Pekerjaan rendah risiko bisa didelegasikan."
      },
      {
        heading: "Menghadapi Pemeriksaan",
        body: "Siapkan folder dokumen, rekap jawaban, dan penanggung jawab per isu. Review staf sebelum data diserahkan ke pemeriksa."
      }
    ]
  }
];
