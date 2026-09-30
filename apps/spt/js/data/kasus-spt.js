// ==============================================================================
// Bank kasus (data statis) untuk mode "Isi Formulir" SIM-SPT — 1770, 1770 SS,
// 1770 S, dan 1771 (Badan). Dipindah dari js/app-main.js (sebelumnya ~2.334
// baris data kasus bercampur dengan ~1.400 baris logika UI/routing di file
// yang sama) supaya app-main.js lebih fokus ke logika, dan data kasus mudah
// ditinjau/ditambah tanpa perlu menggulir ribuan baris kode fungsi.
//
// Variabel di sini (Form1770Cases, Form1770SSCases, Form1770SCases,
// Form1771Cases) dipakai langsung sebagai global oleh js/app-main.js, persis
// seperti sebelum dipindah — tidak ada perubahan bentuk data maupun isi.
//
// WAJIB: <script> file ini dimuat sebelum js/app-main.js.
// ==============================================================================

        // ==========================================
        // MODE ISI FORMULIR SPT 1770 (bukan Q&A) — data kasus, kalkulasi live, grading
        // Struktur lengkap: Lampiran I (usaha/pekerjaan bebas — pembukuan/NPPN/rekonsiliasi
        // fiskal), Lampiran II (bukti potong pekerjaan 1721-A1 + bukti potong usaha),
        // Lampiran III (final & bukan objek pajak), Lampiran IV (harta, utang, susunan
        // keluarga), Induk (mengikuti alur resmi Angka 1a/1b s.d. 13a — angsuran PPh 25).
        // ==========================================
        const Form1770Cases = [
            {
                id: 'f1770-1',
                title: 'Herman Wijaya — Toko Bangunan "Sumber Rejeki"',
                difficulty: 'Sedang',
                narrative: `Herman Wijaya (status PTKP TK/0, belum menikah, tidak ada tanggungan) adalah pemilik Toko Bangunan "Sumber Rejeki" di Surabaya, yang menyelenggarakan pembukuan. Selama tahun pajak berjalan:

USAHA (Lampiran I — Pembukuan):
- Peredaran bruto usaha: Rp 1.850.000.000
- Harga Pokok Penjualan (HPP): Rp 1.240.000.000
- Biaya usaha lainnya (gaji karyawan, listrik, sewa toko, dll): Rp 320.000.000

BUKTI POTONG DARI PIHAK LAIN (Lampiran II-B):
- Dipotong PPh 23 oleh PT Mitra Konstruksi Indonesia (NPWP 01.234.567.8-091.000), No. Bukti Potong 00123/PPh23/VI/2026: Rp 7.500.000
- Dipungut PPh 22 oleh Dinas Pekerjaan Umum Kota Surabaya (NPWP 00.567.891.2-091.000), No. Bukti Potong 00456/PPh22/IX/2026: Rp 5.000.000

PENGHASILAN LAIN (Lampiran III & Induk):
- Menerima komisi keagenan produk cat dari luar usaha utama (bukan final, dilaporkan sebagai penghasilan neto dalam negeri lainnya di Induk): Rp 18.000.000
- Menyewakan 1 unit gudang ke PT Logistik Nusantara senilai Rp 25.000.000/tahun — ingat, sewa tanah/bangunan dikenakan PPh Final 10% (PP 34/2017), BUKAN digabung ke penghasilan neto biasa
- Menerima warisan dari orang tua sebesar Rp 50.000.000 (bukan objek pajak, tidak dikenakan pajak sama sekali)
- Membayar zakat resmi ke Baznas: Rp 9.000.000
- Memiliki sisa kompensasi kerugian dari SPT tahun sebelumnya: Rp 15.000.000

HARTA & UTANG (Lampiran IV):
- Harta akhir tahun: Rumah tinggal (2015) Rp 950.000.000; Toko/ruko usaha (2018) Rp 1.200.000.000; Mobil (2022) Rp 350.000.000; Tabungan & kas Rp 210.000.000
- Utang akhir tahun: Sisa KPR Bank Mandiri Rp 380.000.000; Utang modal usaha Bank BRI Rp 150.000.000
- Susunan keluarga: Herman belum menikah, tinggal sendiri (sesuai status TK/0)`,
                input: {
                    usahaMode: 'pembukuan',
                    peredaranBruto: 1850000000, hpp: 1240000000, biayaUsaha: 320000000,
                    nppnBruto: 0, nppnPersen: 0,
                    labaKomersial: 0, koreksiPositif: [],
                    pekerjaan: [],
                    buktiPotong: [
                        { namaPemotong: 'PT Mitra Konstruksi Indonesia', npwp: '01.234.567.8-091.000', jenisPajak: 'PPh 23', noBukti: '00123/PPh23/VI/2026', jumlah: 7500000 },
                        { namaPemotong: 'Dinas Pekerjaan Umum Kota Surabaya', npwp: '00.567.891.2-091.000', jenisPajak: 'PPh 22', noBukti: '00456/PPh22/IX/2026', jumlah: 5000000 }
                    ],
                    penghasilanFinal: [
                        { jenis: 'Sewa Tanah/Bangunan', dpp: 25000000, tarif: 10, pphFinal: 2500000 }
                    ],
                    penghasilanBukanObjek: [
                        { jenis: 'Warisan', jumlah: 50000000 }
                    ],
                    netoDNLainnya: 18000000, zakat: 9000000, kompensasiKerugian: 15000000,
                    angsuranSendiri: 0, hanyaTeratur: 'Tidak',
                    ptkpStatus: 'TK/0',
                    harta: [
                        { jenis: 'Rumah tinggal', tahun: 2015, nilai: 950000000 },
                        { jenis: 'Toko/ruko usaha', tahun: 2018, nilai: 1200000000 },
                        { jenis: 'Mobil', tahun: 2022, nilai: 350000000 },
                        { jenis: 'Tabungan & kas', tahun: '', nilai: 210000000 }
                    ],
                    utang: [
                        { jenis: 'Sisa KPR Bank Mandiri', nilai: 380000000 },
                        { jenis: 'Utang modal usaha Bank BRI', nilai: 150000000 }
                    ],
                    susunanKeluarga: [
                        { nama: 'Herman Wijaya', hubungan: 'Kepala Keluarga', pekerjaan: 'Pedagang' }
                    ]
                }
            },
            {
                id: 'f1770-2',
                title: 'Sari Puspita — Salon Kecantikan "Sari Ayu"',
                difficulty: 'Sedang',
                narrative: `Sari Puspita (status PTKP K/2, menikah dengan 2 anak yang menjadi tanggungan) adalah pemilik Salon Kecantikan "Sari Ayu" di Bandung, yang menyelenggarakan pembukuan. Selama tahun pajak berjalan:

USAHA (Lampiran I — Pembukuan):
- Peredaran bruto usaha: Rp 420.000.000
- Harga Pokok Penjualan / bahan-bahan salon (HPP): Rp 95.000.000
- Biaya usaha lainnya (gaji karyawan, sewa tempat, listrik, dll): Rp 180.000.000

BUKTI POTONG DARI PIHAK LAIN (Lampiran II-B):
- Dipotong PPh 23 oleh Salon Partner Kosmetik Indah (NPWP 02.345.678.9-424.000) atas jasa perawatan, No. Bukti Potong 00789/PPh23/VIII/2026: Rp 8.000.000

PENGHASILAN LAIN (Lampiran III & Induk):
- Tidak ada penghasilan neto dalam negeri lainnya, tidak ada zakat, dan tidak ada sisa kompensasi kerugian tahun sebelumnya.
- Memiliki tabungan deposito kecil, menerima bunga deposito sebesar Rp 2.000.000 setahun — bunga deposito dikenakan PPh Final 20%, bukan digabung ke penghasilan neto biasa
- Tidak ada penghasilan yang termasuk kategori bukan objek pajak tahun ini.

HARTA & UTANG (Lampiran IV):
- Harta akhir tahun: Rumah (2020) Rp 600.000.000; Peralatan salon Rp 45.000.000; Motor (2021) Rp 25.000.000; Tabungan Rp 60.000.000
- Utang akhir tahun: Cicilan peralatan ke perusahaan leasing Rp 20.000.000
- Susunan keluarga: suami bernama Budi Santoso (karyawan swasta), dan 2 anak bernama Nadia Puspita dan Raka Puspita (keduanya masih pelajar, jadi tanggungan)`,
                input: {
                    usahaMode: 'pembukuan',
                    peredaranBruto: 420000000, hpp: 95000000, biayaUsaha: 180000000,
                    nppnBruto: 0, nppnPersen: 0,
                    labaKomersial: 0, koreksiPositif: [],
                    pekerjaan: [],
                    buktiPotong: [
                        { namaPemotong: 'Salon Partner Kosmetik Indah', npwp: '02.345.678.9-424.000', jenisPajak: 'PPh 23', noBukti: '00789/PPh23/VIII/2026', jumlah: 8000000 }
                    ],
                    penghasilanFinal: [
                        { jenis: 'Bunga Deposito/Tabungan', dpp: 2000000, tarif: 20, pphFinal: 400000 }
                    ],
                    penghasilanBukanObjek: [],
                    netoDNLainnya: 0, zakat: 0, kompensasiKerugian: 0,
                    angsuranSendiri: 0, hanyaTeratur: 'Tidak',
                    ptkpStatus: 'K/2',
                    harta: [
                        { jenis: 'Rumah', tahun: 2020, nilai: 600000000 },
                        { jenis: 'Peralatan salon', tahun: '', nilai: 45000000 },
                        { jenis: 'Motor', tahun: 2021, nilai: 25000000 },
                        { jenis: 'Tabungan', tahun: '', nilai: 60000000 }
                    ],
                    utang: [
                        { jenis: 'Cicilan peralatan (leasing)', nilai: 20000000 }
                    ],
                    susunanKeluarga: [
                        { nama: 'Sari Puspita', hubungan: 'Kepala Keluarga', pekerjaan: 'Pengusaha Salon' },
                        { nama: 'Budi Santoso', hubungan: 'Suami/Istri', pekerjaan: 'Karyawan Swasta' },
                        { nama: 'Nadia Puspita', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' },
                        { nama: 'Raka Puspita', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' }
                    ]
                }
            },
            {
                id: 'f1770-3',
                title: 'Hendra Wijaya — Dua Pemberi Kerja (K/2)',
                difficulty: 'Sedang',
                narrative: `Hendra Wijaya adalah Manajer Operasional di PT Cahaya Abadi. Ia menikah dan memiliki 2 anak yang menjadi tanggungan (K/2). Selama Tahun Pajak berjalan, Bukti Potong 1721-A1 dari PT Cahaya Abadi menunjukkan penghasilan neto Rp 195.000.000 dengan PPh 21 telah dipotong Rp 12.300.000. Hendra juga menjadi dosen tamu paruh waktu di sebuah universitas dengan penghasilan neto Rp 30.000.000 dan PPh 21 dipotong Rp 1.500.000 (Bukti Potong 1721-A1 terpisah). Hendra TIDAK memiliki usaha/pekerjaan bebas.

Sepanjang tahun, Hendra membayar zakat wajib melalui BAZNAS sebesar Rp 4.000.000 (ada bukti setor resmi). Karena hanya berpenghasilan teratur dari pekerjaan (dua pemberi kerja), angsuran PPh 25 tahun berikutnya dihitung otomatis di Induk (Angka 13.a).

HARTA & UTANG (Lampiran IV):
- Harta akhir tahun: rumah (Rp 850.000.000), mobil (Rp 320.000.000), tabungan & deposito (Rp 75.000.000), dan saham (Rp 40.000.000)
- Utang akhir tahun: sisa KPR rumah Rp 380.000.000 dan sisa kredit mobil Rp 60.000.000
- Susunan keluarga: Hendra (kepala keluarga), istri, dan 2 anak tanggungan`,
                input: {
                    usahaMode: 'none',
                    peredaranBruto: 0, hpp: 0, biayaUsaha: 0, nppnBruto: 0, nppnPersen: 0,
                    labaKomersial: 0, koreksiPositif: [],
                    pekerjaan: [
                        { pemberiKerja: 'PT Cahaya Abadi', npwp: '', noBukti: '', netoPekerjaan: 195000000, pph21Dipotong: 12300000 },
                        { pemberiKerja: 'Universitas (Dosen Tamu Paruh Waktu)', npwp: '', noBukti: '', netoPekerjaan: 30000000, pph21Dipotong: 1500000 }
                    ],
                    buktiPotong: [],
                    penghasilanFinal: [], penghasilanBukanObjek: [],
                    netoDNLainnya: 0, zakat: 4000000, kompensasiKerugian: 0,
                    angsuranSendiri: 0, hanyaTeratur: 'Ya',
                    ptkpStatus: 'K/2',
                    harta: [
                        { jenis: 'Rumah', tahun: '', nilai: 850000000 },
                        { jenis: 'Mobil', tahun: '', nilai: 320000000 },
                        { jenis: 'Tabungan & Deposito', tahun: '', nilai: 75000000 },
                        { jenis: 'Saham', tahun: '', nilai: 40000000 }
                    ],
                    utang: [
                        { jenis: 'Sisa KPR Rumah', nilai: 380000000 },
                        { jenis: 'Sisa Kredit Mobil', nilai: 60000000 }
                    ],
                    susunanKeluarga: [
                        { nama: 'Hendra Wijaya', hubungan: 'Kepala Keluarga', pekerjaan: 'Manajer Operasional' },
                        { nama: 'Istri Hendra (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' },
                        { nama: 'Anak Kandung ke-1', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' },
                        { nama: 'Anak Kandung ke-2', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' }
                    ]
                }
            },
            {
                id: 'f1770-4',
                title: 'Ratna Kusuma — Notaris/PPAT (NPPN, K/0)',
                difficulty: 'Sulit',
                narrative: `Ratna Kusuma menjalankan praktik Notaris/PPAT secara mandiri (pekerjaan bebas), berstatus menikah tanpa anak (K/0). Ia berhak dan memilih menggunakan Norma Penghitungan Penghasilan Neto (NPPN) sebesar 50% untuk jasa profesi hukum (Lampiran I — NPPN). Penerimaan bruto praktiknya selama tahun pajak berjalan adalah Rp 480.000.000.

Ratna rutin membayar zakat wajib Rp 6.000.000 melalui lembaga resmi. Karena berstatus pekerja bebas, ia membayar sendiri angsuran PPh Pasal 25 setiap bulan sebesar Rp 1.500.000 (Angka 10.b di Induk) dan tidak ada penghasilan yang dipotong pihak lain. Sebagai pekerja bebas, penghasilan Ratna tidak dianggap sebagai "penghasilan teratur" dari pekerjaan, sehingga angsuran PPh 25 tahun berikutnya wajib dihitung sendiri (Angka 13.a, formula tetap 1/12 x (PPh Terutang − 10.a); perhatikan bahwa 10.b yang sudah dibayar sendiri TIDAK mengurangi dasar perhitungan angsuran tahun depan).

HARTA & UTANG (Lampiran IV):
- Harta akhir tahun: ruko kantor (Rp 650.000.000), mobil dinas (Rp 280.000.000), tabungan (Rp 95.000.000), dan perhiasan (Rp 25.000.000)
- Utang akhir tahun: sisa pinjaman bank untuk ruko sebesar Rp 150.000.000
- Susunan keluarga: Ratna dan suami (K/0, tanpa anak tanggungan)`,
                input: {
                    usahaMode: 'nppn',
                    peredaranBruto: 0, hpp: 0, biayaUsaha: 0,
                    nppnBruto: 480000000, nppnPersen: 50,
                    labaKomersial: 0, koreksiPositif: [],
                    pekerjaan: [],
                    buktiPotong: [],
                    penghasilanFinal: [], penghasilanBukanObjek: [],
                    netoDNLainnya: 0, zakat: 6000000, kompensasiKerugian: 0,
                    angsuranSendiri: 18000000, hanyaTeratur: 'Tidak',
                    ptkpStatus: 'K/0',
                    harta: [
                        { jenis: 'Ruko Kantor', tahun: '', nilai: 650000000 },
                        { jenis: 'Mobil Dinas', tahun: '', nilai: 280000000 },
                        { jenis: 'Tabungan', tahun: '', nilai: 95000000 },
                        { jenis: 'Perhiasan', tahun: '', nilai: 25000000 }
                    ],
                    utang: [
                        { jenis: 'Pinjaman Bank untuk Ruko', nilai: 150000000 }
                    ],
                    susunanKeluarga: [
                        { nama: 'Ratna Kusuma', hubungan: 'Kepala Keluarga', pekerjaan: 'Notaris/PPAT' },
                        { nama: 'Suami Ratna (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' }
                    ]
                }
            },
            {
                id: 'f1770-5',
                title: 'Yusuf Pratama — Karyawan + Usaha Dagang (K/3)',
                difficulty: 'Sangat Sulit',
                narrative: `Yusuf Pratama menjabat sebagai Direktur di PT Sinar Abadi dan berstatus menikah dengan 3 anak tanggungan (K/3). Bukti Potong 1721-A1 menunjukkan penghasilan neto Rp 420.000.000 dengan PPh 21 dipotong Rp 45.000.000.

Di luar pekerjaannya, Yusuf memiliki usaha dagang bahan bangunan yang menyelenggarakan pembukuan stelsel akrual (Lampiran I — Pembukuan dengan Koreksi Fiskal). Laporan Laba Rugi usahanya menunjukkan Laba Komersial sebelum pajak Rp 180.000.000, dengan koreksi fiskal positif berupa biaya sumbangan tidak resmi Rp 15.000.000 dan PPh Final yang salah dibebankan sebagai biaya Rp 5.000.000 (keduanya TIDAK boleh menjadi pengurang secara fiskal, sesuai Pasal 9 UU PPh, sehingga harus dikoreksi positif kembali).

Yusuf membayar zakat wajib Rp 10.000.000 melalui lembaga resmi. Sepanjang tahun, ia membayar sendiri angsuran PPh Pasal 25 atas usahanya sebesar Rp 3.000.000 per bulan (Angka 10.b). Karena berpenghasilan CAMPURAN (gaji + usaha), Yusuf bukan "hanya menerima penghasilan teratur" sehingga wajib menghitung sendiri angsuran PPh 25 tahun berikutnya (Angka 13.a) — dengan catatan penting bahwa dasar perhitungannya hanya mengurangi kredit yang dipotong pihak lain (10.a dari gaji), BUKAN yang sudah dibayar sendiri (10.b), agar tidak terjadi pengurangan ganda.

HARTA & UTANG (Lampiran IV):
- Harta akhir tahun: rumah (Rp 1.200.000.000), ruko usaha (Rp 650.000.000), mobil pribadi (Rp 350.000.000), mobil operasional toko (Rp 220.000.000), dan tabungan/deposito (Rp 180.000.000)
- Utang akhir tahun: sisa KPR rumah Rp 500.000.000 dan sisa kredit modal usaha Rp 300.000.000
- Susunan keluarga: Yusuf, istri, dan 3 anak tanggungan (K/3)`,
                input: {
                    usahaMode: 'rekonsiliasi',
                    peredaranBruto: 0, hpp: 0, biayaUsaha: 0, nppnBruto: 0, nppnPersen: 0,
                    labaKomersial: 180000000,
                    koreksiPositif: [
                        { jenis: 'Sumbangan Tidak Resmi (tidak dapat dikurangkan)', jumlah: 15000000 },
                        { jenis: 'PPh Final yang Salah Dibebankan sebagai Biaya', jumlah: 5000000 }
                    ],
                    pekerjaan: [
                        { pemberiKerja: 'PT Sinar Abadi (Direktur)', npwp: '', noBukti: '', netoPekerjaan: 420000000, pph21Dipotong: 45000000 }
                    ],
                    buktiPotong: [],
                    penghasilanFinal: [], penghasilanBukanObjek: [],
                    netoDNLainnya: 0, zakat: 10000000, kompensasiKerugian: 0,
                    angsuranSendiri: 36000000, hanyaTeratur: 'Tidak',
                    ptkpStatus: 'K/3',
                    harta: [
                        { jenis: 'Rumah', tahun: '', nilai: 1200000000 },
                        { jenis: 'Ruko Usaha', tahun: '', nilai: 650000000 },
                        { jenis: 'Mobil Pribadi', tahun: '', nilai: 350000000 },
                        { jenis: 'Mobil Operasional Toko', tahun: '', nilai: 220000000 },
                        { jenis: 'Tabungan/Deposito', tahun: '', nilai: 180000000 }
                    ],
                    utang: [
                        { jenis: 'Sisa KPR Rumah', nilai: 500000000 },
                        { jenis: 'Sisa Kredit Modal Usaha', nilai: 300000000 }
                    ],
                    susunanKeluarga: [
                        { nama: 'Yusuf Pratama', hubungan: 'Kepala Keluarga', pekerjaan: 'Direktur / Pedagang' },
                        { nama: 'Istri Yusuf (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' },
                        { nama: 'Anak Kandung ke-1', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' },
                        { nama: 'Anak Kandung ke-2', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' },
                        { nama: 'Anak Kandung ke-3', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' }
                    ]
                }
            },
            {
                id: 'f1770-6',
                title: 'Lina Marlina — Karyawan Tetap, Zakat Wajib (K/1)',
                difficulty: 'Sedang',
                narrative: `Lina Marlina bekerja sebagai staf administrasi di PT Bintang Makmur. Ia menikah dan memiliki 1 anak (K/1). Bukti Potong 1721-A1 menunjukkan penghasilan neto Rp 180.000.000 dan PPh 21 dipotong Rp 9.000.000. Lina TIDAK memiliki usaha/pekerjaan bebas.

Lina juga membayar zakat wajib Rp 3.000.000 melalui lembaga resmi. Karena hanya berpenghasilan teratur, angsuran PPh 25 tahun berikutnya dihitung otomatis di Induk (Angka 13.a).

HARTA & UTANG (Lampiran IV):
- Harta akhir tahun: rumah Rp 600.000.000, tabungan Rp 40.000.000, perhiasan Rp 25.000.000
- Utang akhir tahun: utang KPR rumah Rp 250.000.000
- Susunan keluarga: Lina, pasangan, dan 1 anak tanggungan (K/1)`,
                input: {
                    usahaMode: 'none',
                    peredaranBruto: 0, hpp: 0, biayaUsaha: 0, nppnBruto: 0, nppnPersen: 0,
                    labaKomersial: 0, koreksiPositif: [],
                    pekerjaan: [
                        { pemberiKerja: 'PT Bintang Makmur', npwp: '', noBukti: '', netoPekerjaan: 180000000, pph21Dipotong: 9000000 }
                    ],
                    buktiPotong: [],
                    penghasilanFinal: [], penghasilanBukanObjek: [],
                    netoDNLainnya: 0, zakat: 3000000, kompensasiKerugian: 0,
                    angsuranSendiri: 0, hanyaTeratur: 'Ya',
                    ptkpStatus: 'K/1',
                    harta: [
                        { jenis: 'Rumah', tahun: '', nilai: 600000000 },
                        { jenis: 'Tabungan', tahun: '', nilai: 40000000 },
                        { jenis: 'Perhiasan', tahun: '', nilai: 25000000 }
                    ],
                    utang: [
                        { jenis: 'Utang KPR Rumah', nilai: 250000000 }
                    ],
                    susunanKeluarga: [
                        { nama: 'Lina Marlina', hubungan: 'Kepala Keluarga', pekerjaan: 'Staf Administrasi' },
                        { nama: 'Pasangan Lina (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' },
                        { nama: 'Anak Kandung', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' }
                    ]
                }
            }
        ];

        // ==========================================
        // MODE ISI FORMULIR SPT 1770 SS — formulir sederhana 1 halaman, mengikuti
        // struktur asli: Penghasilan Bruto -> Pengurang -> Neto -> PTKP -> PKP ->
        // PPh Terutang -> PPh Dipotong Pemberi Kerja -> Kurang/Lebih Bayar -> Harta/Utang.
        // ==========================================
        const Form1770SSCases = [
            {
                id: 'f1770ss-1',
                title: 'Budi — Karyawan Single (TK/0)',
                difficulty: 'Mudah',
                narrative: 'Budi bekerja sebagai staf di PT Nusantara. Selama tahun pajak berjalan, total penghasilan bruto Budi (sesuai Bukti Potong 1721-A1) adalah Rp 50.000.000. Budi belum menikah (TK/0). Perusahaan tidak memotong PPh 21 karena penghasilan neto Budi masih di bawah PTKP. Budi memiliki sepeda motor senilai Rp 15.000.000 dan tidak memiliki utang.',
                input: { bruto: 50000000, biayaJabatan: 2500000, ptkpStatus: 'TK/0', pphDipotong: 0, totalHarta: 15000000, totalUtang: 0 }
            },
            {
                id: 'f1770ss-2',
                title: 'Sinta — Karyawan Tetap, Nihil (TK/0)',
                difficulty: 'Mudah',
                narrative: 'Sinta bekerja sebagai admin di PT Harapan. Penghasilan bruto setahun (sesuai Bukti Potong 1721-A1) Rp 52.000.000. Status PTKP TK/0. Perusahaan tidak memotong PPh 21 karena penghasilan neto Sinta masih di bawah PTKP. Sinta memiliki tabungan Rp 12.000.000 dan tidak memiliki utang.',
                input: { bruto: 52000000, biayaJabatan: 2600000, ptkpStatus: 'TK/0', pphDipotong: 0, totalHarta: 12000000, totalUtang: 0 }
            },
            {
                id: 'f1770ss-3',
                title: 'Rina — Karyawan Tetap (K/1)',
                difficulty: 'Mudah',
                narrative: 'Rina bekerja sebagai customer service di PT Sejahtera. Penghasilan bruto setahun (sesuai Bukti Potong 1721-A1) Rp 58.000.000. Status PTKP K/1. Perusahaan tidak memotong PPh 21 karena penghasilan neto Rina masih di bawah PTKP. Rina memiliki mobil senilai Rp 20.000.000 dan cicilan kendaraan Rp 8.000.000.',
                input: { bruto: 58000000, biayaJabatan: 2900000, ptkpStatus: 'K/1', pphDipotong: 0, totalHarta: 20000000, totalUtang: 8000000 }
            }
        ];

        // ==========================================
        // MODE ISI FORMULIR SPT 1770 S — karyawan bruto > Rp 60 Juta, bisa lebih dari
        // 1 pemberi kerja, dengan penghasilan DN lainnya. Struktur: Lampiran I-A (Bukti
        // Potong 1721-A1), Lampiran I-B/C (DN Lainnya + Final/Bukan Objek), Lampiran II
        // (Harta/Utang/Keluarga), Induk.
        // ==========================================
        const Form1770SCases = [
            {
                id: 'f1770s-1',
                title: 'Andi — Manajer (K/1)',
                difficulty: 'Sedang',
                narrative: 'Andi adalah manajer di PT Abadi. Gaji bruto setahun Rp 120.000.000. Bukti Potong 1721-A1 menunjukkan penghasilan neto Rp 114.000.000 dengan PPh 21 telah dipotong perusahaan sebesar Rp 2.550.000. Andi sudah menikah dan memiliki 1 anak (K/1). Tidak ada penghasilan DN lainnya maupun penghasilan final. Andi memiliki tabungan Rp 30.000.000 dan tidak memiliki utang. Susunan keluarga: Andi, istri, dan 1 anak.',
                input: {
                    pekerjaan: [{ pemberiKerja: 'PT Abadi', npwp: '', noBukti: '', netoPekerjaan: 114000000, pph21Dipotong: 2550000 }],
                    dnLainnya: [], penghasilanFinal: [], penghasilanBukanObjek: [],
                    zakat: 0, netoLN: 0, ptkpStatus: 'K/1',
                    harta: [{ jenis: 'Tabungan', tahun: '', nilai: 30000000 }],
                    utang: [],
                    susunanKeluarga: [
                        { nama: 'Andi', hubungan: 'Kepala Keluarga', pekerjaan: 'Manajer' },
                        { nama: 'Istri Andi (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' },
                        { nama: 'Anak Kandung', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' }
                    ]
                }
            },
            {
                id: 'f1770s-2',
                title: 'Dewi — Supervisor, Ada Sewa Non-Final (K/1)',
                difficulty: 'Sedang',
                narrative: 'Dewi bekerja sebagai supervisor di PT Sentosa. Bukti Potong 1721-A1 menunjukkan penghasilan neto Rp 90.250.000 (dari penghasilan bruto Rp 95.000.000) dengan PPh 21 telah dipotong Rp 1.900.000. Status PTKP K/1. Dewi juga menerima honor sebagai pembicara seminar (penghasilan DN lainnya, bukan final) sebesar Rp 5.000.000. Dewi membayar zakat wajib Rp 1.500.000. Ia memiliki motor senilai Rp 18.000.000 dan cicilan motor Rp 5.000.000. Susunan keluarga: Dewi, suami, dan 1 anak.',
                input: {
                    pekerjaan: [{ pemberiKerja: 'PT Sentosa', npwp: '', noBukti: '', netoPekerjaan: 90250000, pph21Dipotong: 1900000 }],
                    dnLainnya: [{ jenis: 'Honor Pembicara Seminar', jumlah: 5000000 }],
                    penghasilanFinal: [], penghasilanBukanObjek: [],
                    zakat: 1500000, netoLN: 0, ptkpStatus: 'K/1',
                    harta: [{ jenis: 'Motor', tahun: '', nilai: 18000000 }],
                    utang: [{ jenis: 'Cicilan Motor', nilai: 5000000 }],
                    susunanKeluarga: [
                        { nama: 'Dewi', hubungan: 'Kepala Keluarga', pekerjaan: 'Supervisor' },
                        { nama: 'Suami Dewi (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' },
                        { nama: 'Anak Kandung', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' }
                    ]
                }
            },
            {
                id: 'f1770s-3',
                title: 'Nadia — Dua Pemberi Kerja + Bunga Deposito (K/2)',
                difficulty: 'Sulit',
                narrative: 'Nadia bekerja sebagai staf keuangan di PT Mutiara dengan penghasilan neto (1721-A1) Rp 80.750.000 dari bruto Rp 85.000.000, PPh 21 dipotong Rp 1.700.000. Ia juga menjadi bendahara paruh waktu sebuah yayasan dengan penghasilan neto (1721-A1 kedua) Rp 17.100.000, PPh 21 dipotong Rp 300.000. Status PTKP K/2. Nadia memiliki deposito yang memberikan bunga Rp 3.000.000 setahun — dikenakan PPh Final 20% (BUKAN digabung ke penghasilan neto). Ia menerima hadiah dari kantor senilai Rp 2.000.000 yang termasuk bukan objek pajak (natura yang dikecualikan). Tidak ada zakat. Harta: rumah Rp 500.000.000, tabungan Rp 40.000.000. Tidak ada utang. Susunan keluarga: Nadia, suami, dan 2 anak.',
                input: {
                    pekerjaan: [
                        { pemberiKerja: 'PT Mutiara', npwp: '', noBukti: '', netoPekerjaan: 80750000, pph21Dipotong: 1700000 },
                        { pemberiKerja: 'Yayasan (Bendahara Paruh Waktu)', npwp: '', noBukti: '', netoPekerjaan: 17100000, pph21Dipotong: 300000 }
                    ],
                    dnLainnya: [], 
                    penghasilanFinal: [{ jenis: 'Bunga Deposito/Tabungan', dpp: 3000000, tarif: 20, pphFinal: 600000 }],
                    penghasilanBukanObjek: [{ jenis: 'Natura/Kenikmatan yang Dikecualikan', jumlah: 2000000 }],
                    zakat: 0, netoLN: 0, ptkpStatus: 'K/2',
                    harta: [{ jenis: 'Rumah', tahun: '', nilai: 500000000 }, { jenis: 'Tabungan', tahun: '', nilai: 40000000 }],
                    utang: [],
                    susunanKeluarga: [
                        { nama: 'Nadia', hubungan: 'Kepala Keluarga', pekerjaan: 'Staf Keuangan' },
                        { nama: 'Suami Nadia (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' },
                        { nama: 'Anak Kandung ke-1', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' },
                        { nama: 'Anak Kandung ke-2', hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' }
                    ]
                }
            }
        ];

        // ==========================================
        // MODE ISI FORMULIR SPT 1771 (BADAN) — Lampiran I (rekonsiliasi fiskal), III (kredit
        // pajak), IV (final & bukan objek), V (pemegang saham & pengurus), Induk (fasilitas 31E).
        // ==========================================
        const Form1771Cases = [
            {
                id: 'f1771-1',
                title: 'PT Karya Abadi Sentosa — Percetakan',
                narrative: `PT Karya Abadi Sentosa adalah perusahaan percetakan di Semarang yang menyelenggarakan pembukuan (skema normal, bukan UMKM Final). Selama tahun pajak berjalan:

USAHA (Lampiran I & II):
- Peredaran usaha: Rp 3.200.000.000
- Rincian HPP: Pembelian Bahan Baku Kertas & Tinta Rp 1.400.000.000; Upah Buruh Produksi Langsung Rp 400.000.000 (Total HPP Rp 1.800.000.000)
- Rincian Biaya Usaha: Gaji & Tunjangan Non-Produksi Rp 550.000.000; Sewa Gedung & Mesin Rp 180.000.000; Penyusutan Aset Tetap Rp 120.000.000; Listrik/Air/Telepon Rp 60.000.000; Biaya Pemasaran Rp 40.000.000 (Total Biaya Usaha Rp 950.000.000)

KOREKSI FISKAL:
- Sumbangan ke yayasan yang tidak memenuhi syarat pengurang (koreksi positif): Rp 15.000.000
- Sanksi administrasi keterlambatan pelaporan pajak tahun lalu (koreksi positif): Rp 5.000.000
- Tidak ada koreksi fiskal negatif tahun ini.

KREDIT PAJAK (Lampiran III):
- Dipotong PPh 23 oleh klien atas jasa cetak, No. Bukti 00321/PPh23/V/2026: Rp 12.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri sepanjang tahun: Rp 30.000.000

PENGHASILAN LAIN (Lampiran IV):
- Bunga deposito perusahaan Rp 8.000.000, dikenakan PPh Final 20%
- Tidak ada penghasilan bukan objek pajak tahun ini.

Tidak ada sisa kompensasi kerugian dari tahun sebelumnya. Perusahaan tidak memiliki cabang.

PEMEGANG SAHAM & PENGURUS (Lampiran V & VI):
- Pemegang saham: Bapak Karya Sentosa (60%), Ibu Abadi Wijaya (40%)
- Pengurus: Bapak Karya Sentosa sebagai Direktur, Ibu Abadi Wijaya sebagai Komisaris
- Tidak ada cabang.`,
                input: {
                    skema: 'normal',
                    peredaranUsaha: 3200000000, hpp: 1800000000, biayaUsaha: 950000000,
                    luarUsahaBruto: 0, biayaLuarUsaha: 0, penghasilanNetoLuarNegeri: 0, penghasilanTidakTeratur: 0,
                    hppRincian: [
                        { jenis: 'Pembelian Bahan Baku Kertas & Tinta', jumlah: 1400000000 },
                        { jenis: 'Upah Buruh Produksi Langsung', jumlah: 400000000 }
                    ],
                    biayaRincian: [
                        { jenis: 'Gaji & Tunjangan Non-Produksi', jumlah: 550000000 },
                        { jenis: 'Sewa Gedung & Mesin', jumlah: 180000000 },
                        { jenis: 'Penyusutan Aset Tetap', jumlah: 120000000 },
                        { jenis: 'Listrik/Air/Telepon', jumlah: 60000000 },
                        { jenis: 'Biaya Pemasaran', jumlah: 40000000 }
                    ],
                    koreksiPositif: [
                        { jenis: 'Sumbangan Tidak Dapat Dikurangkan', jumlah: 15000000 },
                        { jenis: 'Sanksi Administrasi Perpajakan', jumlah: 5000000 }
                    ],
                    koreksiNegatif: [],
                    kompensasiKerugian: 0,
                    kreditPajak: [
                        { namaPemotong: 'Klien Jasa Cetak', npwp: '', jenisPajak: 'PPh 23', noBukti: '00321/PPh23/V/2026', jumlah: 12000000 },
                        { namaPemotong: 'Setor Sendiri (Angsuran PPh 25)', npwp: '', jenisPajak: 'PPh 25', noBukti: '-', jumlah: 30000000 }
                    ],
                    penghasilanFinal: [
                        { jenis: 'Bunga Deposito/Tabungan', dpp: 8000000, tarif: 20, pphFinal: 1600000 }
                    ],
                    penghasilanBukanObjek: [],
                    pemegangSaham: [
                        { nama: 'Karya Sentosa', npwp: '', persen: 60 },
                        { nama: 'Abadi Wijaya', npwp: '', persen: 40 }
                    ],
                    pengurus: [
                        { nama: 'Karya Sentosa', jabatan: 'Direktur' },
                        { nama: 'Abadi Wijaya', jabatan: 'Komisaris' }
                    ],
                    cabang: []
                }
            },
            {
                id: 'f1771-2',
                title: 'PT Sinar Teknologi Nusantara — Jasa IT',
                narrative: `PT Sinar Teknologi Nusantara adalah perusahaan jasa teknologi informasi di Jakarta yang menyelenggarakan pembukuan (skema normal, bukan UMKM Final). Selama tahun pajak berjalan:

USAHA (Lampiran I & II):
- Peredaran usaha: Rp 18.000.000.000
- Rincian HPP: Beban Langsung Proyek (Fee Tenaga Ahli Kontrak) Rp 6.500.000.000; Lisensi Software & Cloud Infrastructure Rp 3.000.000.000 (Total HPP Rp 9.500.000.000)
- Rincian Biaya Usaha: Gaji & Tunjangan Karyawan Tetap Rp 4.200.000.000; Sewa Kantor Rp 800.000.000; Penyusutan & Amortisasi Rp 450.000.000; Biaya Pemasaran & Business Development Rp 500.000.000; Bunga Pinjaman Bank Rp 250.000.000 (Total Biaya Usaha Rp 6.200.000.000)

KOREKSI FISKAL:
- Biaya entertainment tanpa daftar nominatif (koreksi positif): Rp 45.000.000
- PPh yang ditanggung perusahaan atas natura tertentu, tidak dapat dikurangkan (koreksi positif): Rp 25.000.000
- Penghasilan bunga deposito yang sudah dikenakan PPh final, dikeluarkan dari penghasilan neto komersial (koreksi negatif): Rp 40.000.000

KREDIT PAJAK (Lampiran III):
- Dipotong PPh 23 oleh klien atas jasa, No. Bukti 00552/PPh23/VII/2026: Rp 85.000.000
- Dipungut PPh 22 atas impor peralatan, No. Bukti 00098/PPh22/III/2026: Rp 15.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri sepanjang tahun: Rp 250.000.000

PENGHASILAN LAIN (Lampiran IV):
- Bunga deposito Rp 40.000.000, dikenakan PPh Final 20%
- Menerima hibah dari perusahaan induk (kepemilikan di atas 25%), bukan objek pajak: Rp 500.000.000

Memiliki sisa kompensasi kerugian fiskal dari 2 tahun sebelumnya: Rp 200.000.000. Perusahaan memiliki 2 cabang.

PEMEGANG SAHAM & PENGURUS (Lampiran V & VI):
- Pemegang saham: PT Global Investama (70%), Bapak Sinar Nusantara (30%)
- Pengurus: Bapak Sinar Nusantara sebagai Direktur Utama, Ibu Teknologi Wardhani sebagai Direktur, Bapak Komisaris Handoko sebagai Komisaris Independen
- Cabang: Cabang Surabaya, Cabang Bandung`,
                input: {
                    skema: 'normal',
                    peredaranUsaha: 18000000000, hpp: 9500000000, biayaUsaha: 6200000000,
                    luarUsahaBruto: 0, biayaLuarUsaha: 0, penghasilanNetoLuarNegeri: 0, penghasilanTidakTeratur: 0,
                    hppRincian: [
                        { jenis: 'Beban Langsung Proyek (Fee Tenaga Ahli Kontrak)', jumlah: 6500000000 },
                        { jenis: 'Lisensi Software & Cloud Infrastructure', jumlah: 3000000000 }
                    ],
                    biayaRincian: [
                        { jenis: 'Gaji & Tunjangan Karyawan Tetap', jumlah: 4200000000 },
                        { jenis: 'Sewa Kantor', jumlah: 800000000 },
                        { jenis: 'Penyusutan & Amortisasi', jumlah: 450000000 },
                        { jenis: 'Biaya Pemasaran & Business Development', jumlah: 500000000 },
                        { jenis: 'Bunga Pinjaman Bank', jumlah: 250000000 }
                    ],
                    koreksiPositif: [
                        { jenis: 'Biaya Entertainment Tanpa Daftar Nominatif', jumlah: 45000000 },
                        { jenis: 'PPh Ditanggung Perusahaan', jumlah: 25000000 }
                    ],
                    koreksiNegatif: [
                        { jenis: 'Penghasilan Sudah Dikenakan PPh Final', jumlah: 40000000 }
                    ],
                    kompensasiKerugian: 200000000,
                    kreditPajak: [
                        { namaPemotong: 'Klien Jasa IT', npwp: '', jenisPajak: 'PPh 23', noBukti: '00552/PPh23/VII/2026', jumlah: 85000000 },
                        { namaPemotong: 'Bea Cukai (Impor Peralatan)', npwp: '', jenisPajak: 'PPh 22', noBukti: '00098/PPh22/III/2026', jumlah: 15000000 },
                        { namaPemotong: 'Setor Sendiri (Angsuran PPh 25)', npwp: '', jenisPajak: 'PPh 25', noBukti: '-', jumlah: 250000000 }
                    ],
                    penghasilanFinal: [
                        { jenis: 'Bunga Deposito/Tabungan', dpp: 40000000, tarif: 20, pphFinal: 8000000 }
                    ],
                    penghasilanBukanObjek: [
                        { jenis: 'Hibah Antar Badan (Kepemilikan >25%)', jumlah: 500000000 }
                    ],
                    pemegangSaham: [
                        { nama: 'PT Global Investama', npwp: '', persen: 70 },
                        { nama: 'Sinar Nusantara', npwp: '', persen: 30 }
                    ],
                    pengurus: [
                        { nama: 'Sinar Nusantara', jabatan: 'Direktur Utama' },
                        { nama: 'Teknologi Wardhani', jabatan: 'Direktur' },
                        { nama: 'Komisaris Handoko', jabatan: 'Komisaris Independen' }
                    ],
                    cabang: [
                        { nama: 'Cabang Surabaya', alamat: 'Surabaya, Jawa Timur' },
                        { nama: 'Cabang Bandung', alamat: 'Bandung, Jawa Barat' }
                    ]
                }
            },
            {
                id: 'f1771-3',
                title: 'CV Berkah Mandiri Sejahtera — Perdagangan (Skema UMKM Final)',
                narrative: `CV Berkah Mandiri Sejahtera adalah usaha dagang kecil di Yogyakarta yang memilih memakai skema PPh Final UMKM (PP 55/2022), karena peredaran bruto masih jauh di bawah Rp4,8 miliar. Selama tahun pajak berjalan:

- Peredaran usaha bruto setahun: Rp 1.200.000.000
- Karena memakai skema UMKM Final, TIDAK ADA rekonsiliasi fiskal, HPP/biaya rinci, koreksi fiskal, kompensasi kerugian, atau fasilitas Pasal 31E — PPh dihitung langsung 0,5% dari peredaran bruto.
- Sudah menyetor sendiri PPh Final setiap bulan sepanjang tahun sebesar total Rp 5.500.000 (telat setor bulan terakhir, jadi ada kekurangan).
- Tidak ada penghasilan final lain maupun penghasilan bukan objek pajak.
- Tidak memiliki cabang.

PEMEGANG SAHAM & PENGURUS (Lampiran V & VI):
- Pemilik modal: Bapak Berkah Santoso (100%)
- Pengurus: Bapak Berkah Santoso sebagai Direktur`,
                input: {
                    skema: 'umkm',
                    peredaranUsaha: 1200000000,
                    hpp: 0, biayaUsaha: 0,
                    hppRincian: [], biayaRincian: [],
                    koreksiPositif: [], koreksiNegatif: [],
                    kompensasiKerugian: 0,
                    kreditPajak: [
                        { namaPemotong: 'Setor Sendiri (PPh Final UMKM Bulanan)', npwp: '', jenisPajak: 'PPh Final UMKM', noBukti: '-', jumlah: 5500000 }
                    ],
                    penghasilanFinal: [],
                    penghasilanBukanObjek: [],
                    pemegangSaham: [
                        { nama: 'Berkah Santoso', npwp: '', persen: 100 }
                    ],
                    pengurus: [
                        { nama: 'Berkah Santoso', jabatan: 'Direktur' }
                    ],
                    cabang: []
                }
            },
            {
                id: 'f1771-4',
                title: 'PT Makmur Sentosa — Dagang (Fasilitas Pasal 31E Penuh)',
                narrative: `PT Makmur Sentosa bergerak di bidang dagang (skema normal, bukan UMKM Final). Selama tahun pajak berjalan:

USAHA (Lampiran I & II):
- Peredaran Usaha: Rp 3.500.000.000
- Harga Pokok Penjualan: Rp 2.000.000.000
- Biaya Usaha Lainnya: Rp 800.000.000

PENGHASILAN LUAR USAHA:
- Penghasilan dari jasa konsultasi tambahan: Rp 25.000.000, dengan biaya terkait Rp 5.000.000

KOREKSI FISKAL:
- Sumbangan ke yayasan pribadi pemilik, tidak memenuhi syarat sumbangan yang boleh dikurangkan (koreksi positif): Rp 30.000.000
- Sanksi administrasi (STP) pajak yang turut dibebankan sebagai biaya (koreksi positif): Rp 8.000.000
- Tidak ada koreksi fiskal negatif maupun kompensasi kerugian dari tahun sebelumnya.

KREDIT PAJAK (Lampiran III):
- Dipungut PPh Pasal 22 oleh bendaharawan pemerintah atas penjualan: Rp 15.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 5.000.000/bulan sepanjang tahun: Rp 60.000.000

PENGHASILAN LAIN (Lampiran IV):
- Tidak ada penghasilan final maupun bukan objek pajak tahun ini. Perusahaan tidak memiliki cabang.

PEMEGANG SAHAM & PENGURUS (Lampiran V & VI):
- Pemegang saham: Bapak Makmur Wijaya (100%)
- Pengurus: Bapak Makmur Wijaya sebagai Direktur`,
                input: {
                    skema: 'normal',
                    peredaranUsaha: 3500000000, hpp: 2000000000, biayaUsaha: 800000000,
                    luarUsahaBruto: 25000000, biayaLuarUsaha: 5000000, penghasilanNetoLuarNegeri: 0, penghasilanTidakTeratur: 0,
                    hppRincian: [
                        { jenis: 'Harga Pokok Penjualan', jumlah: 2000000000 }
                    ],
                    biayaRincian: [
                        { jenis: 'Biaya Usaha Lainnya', jumlah: 800000000 }
                    ],
                    koreksiPositif: [
                        { jenis: 'Sumbangan ke Yayasan Pribadi Pemilik (Tidak Memenuhi Syarat)', jumlah: 30000000 },
                        { jenis: 'Sanksi Administrasi (STP) Pajak', jumlah: 8000000 }
                    ],
                    koreksiNegatif: [],
                    kompensasiKerugian: 0,
                    kreditPajak: [
                        { namaPemotong: 'Bendaharawan Pemerintah', npwp: '', jenisPajak: 'PPh 22', noBukti: '-', jumlah: 15000000 },
                        { namaPemotong: 'Setor Sendiri (Angsuran PPh 25)', npwp: '', jenisPajak: 'PPh 25', noBukti: '-', jumlah: 60000000 }
                    ],
                    penghasilanFinal: [],
                    penghasilanBukanObjek: [],
                    pemegangSaham: [
                        { nama: 'Makmur Wijaya', npwp: '', persen: 100 }
                    ],
                    pengurus: [
                        { nama: 'Makmur Wijaya', jabatan: 'Direktur' }
                    ],
                    cabang: []
                }
            },
            {
                id: 'f1771-5',
                title: 'PT Sejahtera Abadi — Manufaktur (Fasilitas Sebagian + Kompensasi Kerugian)',
                narrative: `PT Sejahtera Abadi adalah perusahaan manufaktur menengah (skema normal, bukan UMKM Final). Selama tahun pajak berjalan:

USAHA (Lampiran I & II):
- Peredaran Usaha: Rp 12.000.000.000
- Harga Pokok Penjualan: Rp 7.500.000.000
- Biaya Usaha Lainnya: Rp 2.600.000.000

PENGHASILAN LUAR USAHA:
- Penghasilan dari jasa manajemen ke anak usaha: Rp 50.000.000, dengan biaya terkait Rp 10.000.000

KOREKSI FISKAL:
- Biaya entertainment tanpa daftar nominatif (koreksi positif): Rp 45.000.000
- Beban Pajak Penghasilan yang salah dibebankan sebagai biaya (koreksi positif): Rp 20.000.000
- Memiliki sisa kompensasi kerugian fiskal dari Tahun Pajak 2023 (Lampiran Khusus 2A) yang belum habis masa kompensasinya: Rp 200.000.000

KREDIT PAJAK (Lampiran III):
- Dipotong/dipungut PPh Pasal 22/23 oleh pihak lain: Rp 85.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 15.000.000/bulan sepanjang tahun: Rp 180.000.000

PENGHASILAN LAIN (Lampiran IV):
- Tidak ada penghasilan final maupun bukan objek pajak tahun ini. Perusahaan tidak memiliki cabang.

PEMEGANG SAHAM & PENGURUS (Lampiran V & VI):
- Pemegang saham: Bapak Sejahtera Halim (65%), Bapak Abadi Kurniawan (35%)
- Pengurus: Bapak Sejahtera Halim sebagai Direktur Utama, Bapak Abadi Kurniawan sebagai Komisaris`,
                input: {
                    skema: 'normal',
                    peredaranUsaha: 12000000000, hpp: 7500000000, biayaUsaha: 2600000000,
                    luarUsahaBruto: 50000000, biayaLuarUsaha: 10000000, penghasilanNetoLuarNegeri: 0, penghasilanTidakTeratur: 0,
                    hppRincian: [
                        { jenis: 'Harga Pokok Penjualan', jumlah: 7500000000 }
                    ],
                    biayaRincian: [
                        { jenis: 'Biaya Usaha Lainnya', jumlah: 2600000000 }
                    ],
                    koreksiPositif: [
                        { jenis: 'Biaya Entertainment Tanpa Daftar Nominatif', jumlah: 45000000 },
                        { jenis: 'Beban PPh yang Salah Dibebankan sebagai Biaya', jumlah: 20000000 }
                    ],
                    koreksiNegatif: [],
                    kompensasiKerugian: 200000000,
                    kreditPajak: [
                        { namaPemotong: 'Pihak Lain (PPh 22/23)', npwp: '', jenisPajak: 'PPh 23', noBukti: '-', jumlah: 85000000 },
                        { namaPemotong: 'Setor Sendiri (Angsuran PPh 25)', npwp: '', jenisPajak: 'PPh 25', noBukti: '-', jumlah: 180000000 }
                    ],
                    penghasilanFinal: [],
                    penghasilanBukanObjek: [],
                    pemegangSaham: [
                        { nama: 'Sejahtera Halim', npwp: '', persen: 65 },
                        { nama: 'Abadi Kurniawan', npwp: '', persen: 35 }
                    ],
                    pengurus: [
                        { nama: 'Sejahtera Halim', jabatan: 'Direktur Utama' },
                        { nama: 'Abadi Kurniawan', jabatan: 'Komisaris' }
                    ],
                    cabang: []
                }
            },
            {
                id: 'f1771-6',
                title: 'PT Nusantara Perkasa — Perusahaan Besar (Tanpa Fasilitas + Kredit Pajak Luar Negeri)',
                narrative: `PT Nusantara Perkasa adalah perusahaan besar (skema normal, bukan UMKM Final). Selama tahun pajak berjalan:

USAHA (Lampiran I & II):
- Peredaran Usaha: Rp 85.000.000.000
- Harga Pokok Penjualan: Rp 55.000.000.000
- Biaya Usaha Lainnya: Rp 18.000.000.000

PENGHASILAN LUAR USAHA:
- Laba penjualan aset tetap (bersifat insidental, bukan penghasilan teratur usaha): Rp 300.000.000, dengan biaya terkait Rp 50.000.000

PENGHASILAN LUAR NEGERI (Lampiran Khusus 7A):
- Memiliki cabang di Singapura dengan Penghasilan Neto Komersial Luar Negeri: Rp 1.750.000.000. Atas penghasilan ini telah dibayar pajak di Singapura, dengan kredit pajak luar negeri yang dapat diperhitungkan menurut metode ordinary credit per country basis sesuai Pasal 24 sebesar Rp 297.500.000.

KOREKSI FISKAL:
- Sanksi administrasi pajak (koreksi positif): Rp 120.000.000
- Sumbangan tidak resmi (koreksi positif): Rp 80.000.000
- Tidak ada kompensasi kerugian fiskal.

KREDIT PAJAK (Lampiran III):
- Dipotong/dipungut PPh dalam negeri oleh pihak lain: Rp 250.000.000
- Kredit pajak luar negeri Pasal 24 (dari Lampiran Khusus 7A): Rp 297.500.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 200.000.000/bulan sepanjang tahun: Rp 2.400.000.000

PENGHASILAN LAIN (Lampiran IV):
- Tidak ada penghasilan final maupun bukan objek pajak tahun ini selain yang sudah disebutkan.

PEMEGANG SAHAM & PENGURUS (Lampiran V & VI):
- Pemegang saham: Bapak Perkasa Wijaya (70%), PT Nusantara Capital (30%)
- Pengurus: Bapak Perkasa Wijaya sebagai Direktur Utama, Bapak Nusantara Hartono sebagai Direktur
- Cabang: Cabang Singapura

CATATAN PENTING: dasar penghitungan Angsuran PPh 25 tahun depan (Angka 14.a) HARUS mengeluarkan penghasilan yang bersifat tidak teratur/insidental (laba penjualan aset tetap Rp300.000.000 dikurangi biaya terkait Rp50.000.000 = Rp250.000.000), karena angsuran hanya dihitung dari penghasilan yang bersifat teratur.`,
                input: {
                    skema: 'normal',
                    peredaranUsaha: 85000000000, hpp: 55000000000, biayaUsaha: 18000000000,
                    luarUsahaBruto: 300000000, biayaLuarUsaha: 50000000, penghasilanNetoLuarNegeri: 1750000000, penghasilanTidakTeratur: 250000000,
                    hppRincian: [
                        { jenis: 'Harga Pokok Penjualan', jumlah: 55000000000 }
                    ],
                    biayaRincian: [
                        { jenis: 'Biaya Usaha Lainnya', jumlah: 18000000000 }
                    ],
                    koreksiPositif: [
                        { jenis: 'Sanksi Administrasi Pajak', jumlah: 120000000 },
                        { jenis: 'Sumbangan Tidak Resmi', jumlah: 80000000 }
                    ],
                    koreksiNegatif: [],
                    kompensasiKerugian: 0,
                    kreditPajak: [
                        { namaPemotong: 'Pihak Lain (Dalam Negeri)', npwp: '', jenisPajak: 'PPh 23', noBukti: '-', jumlah: 250000000 },
                        { namaPemotong: 'Kredit Pajak Luar Negeri (Lampiran Khusus 7A)', npwp: '', jenisPajak: 'PPh 24', noBukti: '-', jumlah: 297500000 },
                        { namaPemotong: 'Setor Sendiri (Angsuran PPh 25)', npwp: '', jenisPajak: 'PPh 25', noBukti: '-', jumlah: 2400000000 }
                    ],
                    penghasilanFinal: [],
                    penghasilanBukanObjek: [],
                    pemegangSaham: [
                        { nama: 'Perkasa Wijaya', npwp: '', persen: 70 },
                        { nama: 'Nusantara Capital', npwp: '', persen: 30 }
                    ],
                    pengurus: [
                        { nama: 'Perkasa Wijaya', jabatan: 'Direktur Utama' },
                        { nama: 'Nusantara Hartono', jabatan: 'Direktur' }
                    ],
                    cabang: [
                        { nama: 'Cabang Singapura', alamat: 'Singapura' }
                    ]
                }
            },
            {
                id: 'f1771-7',
                title: 'CV Anugerah — Dagang Kecil (Fasilitas Penuh + Koreksi Fiskal Sederhana)',
                narrative: `CV Anugerah adalah perusahaan dagang kecil (skema normal, bukan UMKM Final). Selama tahun pajak berjalan:

USAHA (Lampiran I & II):
- Peredaran Usaha: Rp 2.400.000.000
- Harga Pokok Penjualan: Rp 1.200.000.000
- Biaya Usaha Lainnya: Rp 500.000.000

PENGHASILAN LUAR USAHA:
- Penghasilan luar usaha: Rp 15.000.000, dengan biaya terkait Rp 3.000.000

KOREKSI FISKAL:
- Biaya entertainment tanpa daftar nominatif (koreksi positif): Rp 20.000.000
- Sumbangan tidak resmi (koreksi positif): Rp 10.000.000
- Tidak ada koreksi fiskal negatif maupun kompensasi kerugian fiskal.

KREDIT PAJAK (Lampiran III):
- Dipungut PPh Pasal 22 oleh bendaharawan: Rp 8.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 2.000.000/bulan sepanjang tahun: Rp 24.000.000

PENGHASILAN LAIN (Lampiran IV):
- Tidak ada penghasilan final maupun bukan objek pajak tahun ini. Tidak memiliki cabang.

PEMEGANG SAHAM & PENGURUS (Lampiran V & VI):
- Pemilik modal: Bapak Anugerah Setiawan (100%)
- Pengurus: Bapak Anugerah Setiawan sebagai Direktur`,
                input: {
                    skema: 'normal',
                    peredaranUsaha: 2400000000, hpp: 1200000000, biayaUsaha: 500000000,
                    luarUsahaBruto: 15000000, biayaLuarUsaha: 3000000, penghasilanNetoLuarNegeri: 0, penghasilanTidakTeratur: 0,
                    hppRincian: [
                        { jenis: 'Harga Pokok Penjualan', jumlah: 1200000000 }
                    ],
                    biayaRincian: [
                        { jenis: 'Biaya Usaha Lainnya', jumlah: 500000000 }
                    ],
                    koreksiPositif: [
                        { jenis: 'Biaya Entertainment Tanpa Daftar Nominatif', jumlah: 20000000 },
                        { jenis: 'Sumbangan Tidak Resmi', jumlah: 10000000 }
                    ],
                    koreksiNegatif: [],
                    kompensasiKerugian: 0,
                    kreditPajak: [
                        { namaPemotong: 'Bendaharawan', npwp: '', jenisPajak: 'PPh 22', noBukti: '-', jumlah: 8000000 },
                        { namaPemotong: 'Setor Sendiri (Angsuran PPh 25)', npwp: '', jenisPajak: 'PPh 25', noBukti: '-', jumlah: 24000000 }
                    ],
                    penghasilanFinal: [],
                    penghasilanBukanObjek: [],
                    pemegangSaham: [
                        { nama: 'Anugerah Setiawan', npwp: '', persen: 100 }
                    ],
                    pengurus: [
                        { nama: 'Anugerah Setiawan', jabatan: 'Direktur' }
                    ],
                    cabang: []
                }
            }
        ];
