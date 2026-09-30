        // ==========================================
        // TaxEngine kini ada di js/shared/tax-engine.js (dimuat sebelum file ini
        // di index.html) supaya tidak terduplikasi ke modul lain (mis. faktur_bupot).
        // Variabel global `TaxEngine` / `window.TaxEngine` tetap sama seperti sebelumnya.
        // ==========================================


        // ==========================================
        // 1B. GENERATOR KASUS DINAMIS (pakai TaxEngine)
        // Membuat objek kasus baru saat runtime (bentuknya persis sama dengan
        // item di databaseKasus) supaya renderForm()/checkAnswers()/submitSimulation()
        // tidak perlu diubah sama sekali. Baru mendukung modul yang formulanya
        // sudah tercakup TaxEngine: 1770SS dan 1770S.
        // ==========================================
        const CaseGenerator = {
            namaPool: ['Budi', 'Sinta', 'Rina', 'Andi', 'Dewi', 'Nadia', 'Fajar', 'Wulan', 'Rizky', 'Putri', 'Agus', 'Maya', 'Yoga', 'Citra', 'Doni'],
            perusahaanPool: ['PT Nusantara Jaya', 'PT Harapan Sejahtera', 'PT Abadi Makmur', 'PT Sentosa Karya', 'PT Mutiara Indah', 'PT Cipta Mandiri'],

            randomItem: function(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
            randomInt: function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
            roundRibuan: function(n) { return Math.round(n / 1000) * 1000; }, // bulatkan ke ribuan biar rapi
            fmt: function(n) { return n.toLocaleString('id-ID'); },

            generate1770SS: function() {
                const nama = this.randomItem(this.namaPool);
                const perusahaan = this.randomItem(this.perusahaanPool);
                const jabatan = this.randomItem(['staf', 'admin', 'customer service']);
                const ptkpStatus = this.randomItem(['TK/0', 'K/0', 'K/1']);
                const bruto = this.roundRibuan(this.randomInt(20000000, 59000000));

                const ptkpValue = TaxEngine.hitungPTKP(ptkpStatus);
                const pkp = Math.max(0, bruto - ptkpValue); // tanpa biaya jabatan, sama seperti asumsi kasus tetap
                const pphTerutang = TaxEngine.hitungTarifProgresif(pkp);

                const hartaJenis = this.randomItem(['motor senilai', 'tabungan sebesar', 'laptop kerja senilai']);
                const harta = this.roundRibuan(this.randomInt(5000000, 30000000));
                const adaUtang = Math.random() < 0.4;
                const utang = adaUtang ? this.roundRibuan(this.randomInt(2000000, Math.min(harta, 15000000))) : 0;

                const statusPajak = pphTerutang > 0
                    ? `terdapat indikasi PPh Kurang Bayar sekitar Rp ${this.fmt(pphTerutang)} (di luar cakupan pertanyaan formulir ini)`
                    : 'berstatus Nihil';

                return {
                    id: 'gen-ss-' + Date.now(),
                    title: `${nama} (Kasus Acak, ${ptkpStatus})`,
                    difficulty: 'Mudah',
                    scenario: `${nama} bekerja sebagai ${jabatan} di ${perusahaan}. Selama tahun berjalan, total penghasilan bruto ${nama} adalah Rp ${this.fmt(bruto)}. Status PTKP ${nama} adalah ${ptkpStatus}. ${nama} memiliki ${hartaJenis} Rp ${this.fmt(harta)}${adaUtang ? ` dan memiliki utang/cicilan sebesar Rp ${this.fmt(utang)}` : ' dan tidak memiliki utang'}.`,
                    questions: [
                        { id: 'q_bruto', label: 'Penghasilan Bruto Dalam Negeri (Rp)', type: 'number', correct: bruto, hint: 'Isi dengan total gaji setahun.' },
                        { id: 'q_ptkp', label: 'Status PTKP', type: 'select', options: ['TK/0', 'K/0', 'K/1'], correct: ptkpStatus, hint: `PTKP mengikuti status pernikahan dan tanggungan ${nama} pada soal.` },
                        { id: 'q_harta', label: 'Total Harta (Rp)', type: 'number', correct: harta, hint: 'Sesuai nilai aset yang disebutkan pada soal.' },
                        { id: 'q_utang', label: 'Total Utang (Rp)', type: 'number', correct: utang, hint: adaUtang ? 'Sesuai cicilan yang disebutkan pada soal.' : 'Tidak ada utang pada soal ini.' }
                    ],
                    explanation: `PTKP untuk ${ptkpStatus} adalah Rp ${this.fmt(ptkpValue)}. Form 1770 SS tepat digunakan karena bruto (Rp ${this.fmt(bruto)}) di bawah Rp 60 Juta dan berasal dari 1 pemberi kerja. Berdasarkan perhitungan otomatis, kasus ini ${statusPajak}.`
                };
            },

            generate1770S: function() {
                const nama = this.randomItem(this.namaPool);
                const perusahaan = this.randomItem(this.perusahaanPool);
                const jabatan = this.randomItem(['manajer', 'supervisor', 'staf keuangan', 'kepala divisi', 'asisten manajer']);
                const ptkpStatus = this.randomItem(['TK/0', 'K/0', 'K/1', 'K/2', 'K/3']);
                const bruto = this.roundRibuan(this.randomInt(61000000, 300000000));

                const ptkpValue = TaxEngine.hitungPTKP(ptkpStatus);
                const pkp = Math.max(0, bruto - ptkpValue); // asumsi tanpa biaya jabatan, sama seperti kasus tetap
                const pphTerutang = TaxEngine.hitungTarifProgresif(pkp);

                // Variasi status pemotongan: ~60% pas (Nihil), ~20% kurang bayar, ~20% lebih bayar
                const roll = Math.random();
                let dipotong;
                if (roll < 0.6) {
                    dipotong = pphTerutang;
                } else if (roll < 0.8) {
                    dipotong = this.roundRibuan(pphTerutang * (0.5 + Math.random() * 0.3));
                } else {
                    dipotong = this.roundRibuan(pphTerutang * (1.05 + Math.random() * 0.2));
                }

                const selisih = pphTerutang - dipotong;
                let statusTeks;
                if (Math.abs(selisih) < 1000) statusTeks = 'NIHIL (pemotongan sudah tepat)';
                else if (selisih > 0) statusTeks = `KURANG BAYAR sebesar Rp ${this.fmt(selisih)}`;
                else statusTeks = `LEBIH BAYAR sebesar Rp ${this.fmt(Math.abs(selisih))}`;

                return {
                    id: 'gen-s-' + Date.now(),
                    title: `${nama} (Kasus Acak, ${ptkpStatus})`,
                    difficulty: 'Sedang',
                    scenario: `${nama} bekerja sebagai ${jabatan} di ${perusahaan}. Gaji bruto setahun Rp ${this.fmt(bruto)}. Status PTKP ${nama} adalah ${ptkpStatus}. Bukti Potong 1721-A1 menunjukkan PPh 21 telah dipotong perusahaan sebesar Rp ${this.fmt(dipotong)}.`,
                    questions: [
                        { id: 'q_bruto', label: 'Penghasilan Bruto (Rp)', type: 'number', correct: bruto, hint: 'Total dari 1721-A1.' },
                        { id: 'q_ptkp_val', label: `Nilai PTKP untuk ${ptkpStatus} (Rp)`, type: 'number', correct: ptkpValue, hint: 'Diri + status kawin + jumlah tanggungan (maks. 3).' },
                        { id: 'q_pkp', label: 'Penghasilan Kena Pajak / PKP (Rp)', type: 'number', correct: pkp, hint: 'Bruto - PTKP (Asumsi tanpa biaya jabatan untuk penyederhanaan di soal ini).' },
                        { id: 'q_kredit', label: 'Kredit Pajak / PPh Dipotong (Rp)', type: 'number', correct: dipotong, hint: 'Sesuai bukti potong 1721-A1 pada soal.' }
                    ],
                    explanation: `PTKP ${ptkpStatus} = Rp ${this.fmt(ptkpValue)}. PPh Terutang (tarif progresif Pasal 17) = Rp ${this.fmt(pphTerutang)}. Karena PPh 21 yang dipotong perusahaan Rp ${this.fmt(dipotong)}, maka status SPT ${statusTeks}.`
                };
            },

            generatePPh21: function() {
                const nama = this.randomItem(this.namaPool);
                const perusahaan = this.randomItem(this.perusahaanPool);
                const isKaryawan = Math.random() < 0.6; // 60% pegawai tetap (TER), 40% bukan pegawai/honorarium (Psl 17 x 50% DPP)

                if (isKaryawan) {
                    // PEGAWAI TETAP: PPh 21 = Bruto x Tarif TER Bulanan (PP 58/2023) — TER hanya berlaku untuk ini.
                    const ptkpStatus = this.randomItem(['TK/0', 'TK/1', 'K/0', 'TK/2', 'K/1', 'TK/3', 'K/2', 'K/3']);
                    const ptkpValue = TaxEngine.hitungPTKP(ptkpStatus);
                    const bruto = this.roundRibuan(this.randomInt(6000000, 60000000));
                    const hasilTER = TaxEngine.hitungTER(bruto, ptkpStatus);
                    const jabatan = this.randomItem(['staf', 'admin', 'supervisor', 'manajer', 'customer service']);

                    return {
                        id: 'gen-pph21-' + Date.now(),
                        title: `${nama} - Pegawai Tetap (Kasus Acak, TER ${hasilTER.kategori})`,
                        difficulty: 'Sedang',
                        scenario: `${nama} bekerja sebagai ${jabatan} di ${perusahaan}. Gaji bulan ini Rp ${this.fmt(bruto)}. Status PTKP ${nama} adalah ${ptkpStatus}. Hitung potongan PPh 21 bulan ini berdasarkan skema Tarif Efektif Rata-rata (TER) sesuai PP 58/2023 (khusus pegawai tetap, bukan Masa Pajak Terakhir Desember).`,
                        questions: [
                            { id: 'q_gaji', label: 'Penghasilan Bruto Sebulan (Rp)', type: 'number', correct: bruto, hint: 'Sesuai nominal yang disebutkan pada soal.' },
                            { id: 'q_kategori', label: `Kategori TER PTKP ${ptkpStatus}`, type: 'select', options: ['Kategori A', 'Kategori B', 'Kategori C'], correct: 'Kategori ' + hasilTER.kategori, hint: `PTKP ${ptkpStatus} = Rp ${this.fmt(ptkpValue)}. Kategori A s.d. Rp58,5 juta, Kategori B s.d. Rp67,5 juta, sisanya Kategori C.` },
                            { id: 'q_potong', label: 'PPh 21 Dipotong Bulan Ini (Rp)', type: 'number', correct: hasilTER.pph, hint: `Bruto dikalikan tarif TER Kategori ${hasilTER.kategori} sesuai lapisan penghasilan pada Lampiran PP 58/2023.` }
                        ],
                        explanation: `PTKP ${ptkpStatus} = Rp ${this.fmt(ptkpValue)}, masuk TER Kategori ${hasilTER.kategori}. Sesuai Lampiran PP 58/2023, bruto Rp ${this.fmt(bruto)} dikenakan tarif efektif ${(hasilTER.tarif * 100).toFixed(2)}%, sehingga PPh 21 dipotong bulan ini = Rp ${this.fmt(hasilTER.pph)}. Skema TER ini KHUSUS pegawai tetap/pensiunan — bukan pegawai (honorarium, tenaga ahli, dst.) pakai mekanisme yang berbeda (lihat kasus jenis lain di modul ini).`
                    };
                }

                // BUKAN PEGAWAI (honorarium/tenaga ahli): PMK 168/2023 Pasal 12(3) & 16(3) —
                // DPP = 50% x Bruto (per masa pajak, tidak kumulatif), PPh 21 = Tarif Pasal 17 x DPP.
                // TER TIDAK berlaku untuk kelompok ini.
                const jenisJasa = this.randomItem(['konsultan pajak', 'notaris', 'tenaga ahli IT', 'arsitek', 'pengacara', 'dokter praktik mandiri']);
                const bruto = this.roundRibuan(this.randomInt(2000000, 150000000));
                const dpp = Math.round(bruto * 0.5);
                const pphTerutang = Math.round(TaxEngine.hitungTarifProgresif(dpp));

                return {
                    id: 'gen-pph21np-' + Date.now(),
                    title: `${nama} - Bukan Pegawai (Kasus Acak)`,
                    difficulty: 'Sedang',
                    scenario: `${nama} berprofesi sebagai ${jenisJasa} dan menerima honorarium sebesar Rp ${this.fmt(bruto)} dari ${perusahaan} bulan ini (berNPWP, tidak dihitung kumulatif dengan masa sebelumnya sesuai PMK 168/2023). Hitung PPh 21 yang harus dipotong.`,
                    questions: [
                        { id: 'q_bruto', label: 'Honorarium Bruto (Rp)', type: 'number', correct: bruto, hint: 'Sesuai nominal yang disebutkan pada soal.' },
                        { id: 'q_dpp', label: 'Dasar Pengenaan Pajak / DPP (Rp)', type: 'number', correct: dpp, hint: 'DPP bukan pegawai = 50% x penghasilan bruto (PMK 168/2023 Psl 12 ayat 3), per masa pajak, tidak kumulatif.' },
                        { id: 'q_potong', label: 'PPh 21 Dipotong (Rp)', type: 'number', correct: pphTerutang, hint: 'Tarif Pasal 17 (progresif) dikalikan langsung ke DPP di atas — BUKAN tarif TER, karena TER hanya untuk pegawai tetap.' }
                    ],
                    explanation: `Untuk bukan pegawai, DPP = 50% x Rp ${this.fmt(bruto)} = Rp ${this.fmt(dpp)} (PMK 168/2023 Pasal 12 ayat 3). PPh 21 dihitung dengan tarif Pasal 17 (progresif) dikalikan langsung ke DPP tersebut per masa pajak, tanpa akumulasi dengan masa sebelumnya (Pasal 16 ayat 3) = Rp ${this.fmt(pphTerutang)}. Skema ini berbeda dari TER yang hanya berlaku untuk pegawai tetap/pensiunan.`
                };
            },

            // Generator untuk mode ISI FORMULIR (bukan Q&A) — dipakai oleh tombol
            // "Kasus Acak" di pemilih kasus SPT 1770 SS dan 1770 S. Mengembalikan
            // objek kasus lengkap (id/title/difficulty/narrative/input) yang langsung
            // kompatibel dengan openForm1770SS()/openForm1770S().
            generateForm1770SS: function() {
                const nama = this.randomItem(this.namaPool);
                const perusahaan = this.randomItem(this.perusahaanPool);
                const jabatan = this.randomItem(['staf administrasi', 'admin gudang', 'customer service', 'resepsionis']);
                const ptkpStatus = this.randomItem(['TK/0', 'TK/1', 'K/0', 'K/1']);
                const ptkpValue = TaxEngine.hitungPTKP(ptkpStatus);
                // Batasi bruto agar penghasilan neto (setelah biaya jabatan) pasti < PTKP,
                // supaya narasi "PPh 21 tidak dipotong karena di bawah PTKP" selalu benar.
                const brutoMax = Math.min(ptkpValue - 1000000, 59000000);
                const bruto = this.roundRibuan(this.randomInt(20000000, Math.max(brutoMax, 21000000)));
                const biayaJabatan = Math.min(Math.round(bruto * 0.05), 6000000);
                const hartaJenis = this.randomItem(['motor', 'tabungan', 'laptop kerja']);
                const totalHarta = this.roundRibuan(this.randomInt(5000000, 30000000));
                const adaUtang = Math.random() < 0.4;
                const totalUtang = adaUtang ? this.roundRibuan(this.randomInt(2000000, Math.min(totalHarta, 15000000))) : 0;

                return {
                    id: 'gen-ss-' + Date.now(),
                    title: nama + ' — Kasus Acak (' + jabatan + ')',
                    difficulty: 'Mudah',
                    narrative: nama + ' bekerja sebagai ' + jabatan + ' di ' + perusahaan + '. Penghasilan bruto setahun (sesuai Bukti Potong 1721-A1) Rp ' + this.fmt(bruto) + '. Status PTKP ' + ptkpStatus + '. Perusahaan tidak memotong PPh 21 karena penghasilan neto ' + nama + ' masih di bawah PTKP. ' + nama + ' memiliki ' + hartaJenis + ' senilai Rp ' + this.fmt(totalHarta) + (adaUtang ? (' dan memiliki cicilan sebesar Rp ' + this.fmt(totalUtang) + '.') : ' dan tidak memiliki utang.'),
                    input: { bruto: bruto, biayaJabatan: biayaJabatan, ptkpStatus: ptkpStatus, pphDipotong: 0, totalHarta: totalHarta, totalUtang: totalUtang }
                };
            },

            generateForm1770S: function() {
                const nama = this.randomItem(this.namaPool);
                const perusahaan = this.randomItem(this.perusahaanPool);
                const jabatan = this.randomItem(['manajer', 'supervisor', 'staf senior', 'asisten manajer']);
                const ptkpStatus = this.randomItem(['TK/0', 'K/0', 'K/1', 'K/2']);
                const bruto = this.roundRibuan(this.randomInt(65000000, 250000000));
                const biayaJabatan = Math.min(Math.round(bruto * 0.05), 6000000);
                const netoPekerjaan = bruto - biayaJabatan;
                const ptkpValue = TaxEngine.hitungPTKP(ptkpStatus);
                const pkpKasar = Math.max(0, netoPekerjaan - ptkpValue);
                const pphTerutangKasar = TaxEngine.hitungTarifProgresif(pkpKasar);
                const pph21Dipotong = Math.round(pphTerutangKasar / 12) * 12; // asumsi dipotong tepat sepanjang tahun

                const adaDNLainnya = Math.random() < 0.5;
                const dnJenis = this.randomItem(['Honor Pembicara Seminar', 'Royalti (non-final)', 'Sewa Peralatan (non-final)']);
                const dnJumlah = adaDNLainnya ? this.roundRibuan(this.randomInt(2000000, 10000000)) : 0;

                const zakat = Math.random() < 0.5 ? this.roundRibuan(this.randomInt(1000000, 3000000)) : 0;

                const hartaJenis = this.randomItem(['rumah', 'motor', 'mobil', 'tabungan']);
                const totalHarta = this.roundRibuan(this.randomInt(20000000, 400000000));
                const adaUtang = Math.random() < 0.4;
                const totalUtang = adaUtang ? this.roundRibuan(this.randomInt(5000000, Math.min(totalHarta, 100000000))) : 0;

                const jumlahAnak = parseInt(ptkpStatus.split('/')[1]) || 0;
                const susunanKeluarga = [{ nama: nama, hubungan: 'Kepala Keluarga', pekerjaan: jabatan }];
                if (ptkpStatus.startsWith('K')) susunanKeluarga.push({ nama: 'Pasangan ' + nama + ' (sesuai KK)', hubungan: 'Suami/Istri', pekerjaan: '-' });
                for (let i = 0; i < jumlahAnak; i++) susunanKeluarga.push({ nama: 'Anak Kandung ke-' + (i + 1), hubungan: 'Anak Kandung', pekerjaan: 'Pelajar' });

                let narrative = nama + ' bekerja sebagai ' + jabatan + ' di ' + perusahaan + '. Penghasilan bruto setahun Rp ' + this.fmt(bruto) + ', dengan Bukti Potong 1721-A1 menunjukkan penghasilan neto Rp ' + this.fmt(netoPekerjaan) + ' dan PPh 21 telah dipotong Rp ' + this.fmt(pph21Dipotong) + '. Status PTKP ' + ptkpStatus + '.';
                if (adaDNLainnya) narrative += ' ' + nama + ' juga menerima ' + dnJenis + ' sebesar Rp ' + this.fmt(dnJumlah) + ' (penghasilan DN lainnya, bukan final).';
                if (zakat > 0) narrative += ' ' + nama + ' membayar zakat wajib Rp ' + this.fmt(zakat) + '.';
                narrative += ' ' + nama + ' memiliki ' + hartaJenis + ' senilai Rp ' + this.fmt(totalHarta) + (adaUtang ? (' dan cicilan sebesar Rp ' + this.fmt(totalUtang) + '.') : ' dan tidak memiliki utang.');

                return {
                    id: 'gen-s-' + Date.now(),
                    title: nama + ' — Kasus Acak (' + jabatan + ')',
                    difficulty: 'Sedang',
                    narrative: narrative,
                    input: {
                        pekerjaan: [{ pemberiKerja: perusahaan, npwp: '', noBukti: '', netoPekerjaan: netoPekerjaan, pph21Dipotong: pph21Dipotong }],
                        dnLainnya: adaDNLainnya ? [{ jenis: dnJenis, jumlah: dnJumlah }] : [],
                        penghasilanFinal: [], penghasilanBukanObjek: [],
                        zakat: zakat, netoLN: 0, ptkpStatus: ptkpStatus,
                        harta: [{ jenis: hartaJenis.charAt(0).toUpperCase() + hartaJenis.slice(1), tahun: '', nilai: totalHarta }],
                        utang: adaUtang ? [{ jenis: 'Cicilan', nilai: totalUtang }] : [],
                        susunanKeluarga: susunanKeluarga
                    }
                };
            },

            // Modul lain (1771 Badan, PPN, dst.) belum didukung — return null artinya
            // startSimulation() akan otomatis jatuh balik ke bank soal tetap (databaseKasus).
            generate: function(moduleKey) {
                if (moduleKey === '1770SS') return this.generate1770SS();
                if (moduleKey === '1770S') return this.generate1770S();
                if (moduleKey === 'PPh21') return this.generatePPh21();
                return null;
            }
        };

        // ==========================================
        // 2. DATABASE KASUS (Mini-DB)
        // ==========================================
        const databaseKasus = {
            'PajakProgresif': [
                {
                    id: 'progresif_1',
                    title: 'Hitung PPh Progresif OP (UU HPP)',
                    difficulty: 'Sulit',
                    scenario: 'Bapak Andi memiliki Penghasilan Kena Pajak (PKP) setahun sebesar Rp 100.000.000. Berdasarkan UU HPP, tarif PPh OP bersifat progresif (berlapis). Hitung total PPh terutang yang harus dibayar Bapak Andi.',
                    questions: [
                        { id: 'q_lapis1', label: 'PPh Lapis 1 (5% x Batas Rp 60.000.000)', type: 'number', correct: 3000000, hint: 'Tarif lapis pertama 5% dikalikan maksimal penghasilan Rp 60.000.000.' },
                        { id: 'q_sisa_pkp', label: 'Sisa PKP masuk ke Lapis 2 (Rp)', type: 'number', correct: 40000000, hint: 'Total PKP (100 juta) dikurangi batas lapis pertama (60 juta).' },
                        { id: 'q_lapis2', label: 'PPh Lapis 2 (15% x Sisa PKP)', type: 'number', correct: 6000000, hint: 'Sisa PKP (Rp 40.000.000) dikalikan tarif lapis kedua (15%).' },
                        { id: 'q_total', label: 'Total PPh Terutang (Rp)', type: 'number', correct: 9000000, hint: 'Jumlahkan hasil pemotongan Lapis 1 dan Lapis 2.' }
                    ],
                    explanation: 'Berdasarkan UU HPP, perhitungan PPh Orang Pribadi menggunakan tarif progresif. Jika PKP lebih dari 60 juta, maka 60 juta pertama dikenakan 5%, lalu sisanya (hingga 250 juta) dikenakan 15%. Cara ini membuat beban pajak lebih adil.'
                },
                {
                    id: 'progresif_2',
                    title: 'Pajak Progresif Kendaraan Bermotor (PKB)',
                    difficulty: 'Sedang',
                    scenario: 'Ibu Siska berdomisili di Jakarta dan membeli mobil kedua atas namanya. Nilai Jual Kendaraan Bermotor (NJKB) mobil tersebut adalah Rp 200.000.000. Berdasarkan Perda setempat, tarif PKB progresif mobil pertama adalah 2%, dan mobil kedua adalah 2,5%. Hitung pokok pajak kendaraannya.',
                    questions: [
                        { id: 'q_njkb', label: 'Nilai Jual Kendaraan / DPP (Rp)', type: 'number', correct: 200000000, hint: 'Dasar Pengenaan Pajak (DPP) adalah nilai kendaraan.' },
                        { id: 'q_tarif_kendaraan', label: 'Tarif Progresif Mobil Ke-2 (%)', type: 'number', correct: 2.5, hint: 'Isi dengan persentase tarif untuk mobil kedua (tanpa tanda %).' },
                        { id: 'q_pkb', label: 'Pajak Kendaraan Terutang (Rp)', type: 'number', correct: 5000000, hint: 'NJKB (Rp 200.000.000) dikalikan tarif mobil ke-2 (2.5%).' }
                    ],
                    explanation: 'Pajak progresif di tingkat daerah diterapkan pada Pajak Kendaraan Bermotor (PKB). Jika seseorang atau satu keluarga dalam satu Kartu Keluarga memiliki lebih dari satu kendaraan, kendaraan kedua dan seterusnya akan dikenakan persentase tarif yang lebih tinggi.'
                }
            ],
            'PPhFinal': [
                {
                    id: 'final1',
                    title: 'CV Karya (UMKM PP 55/2022)',
                    difficulty: 'Mudah',
                    scenario: 'CV Karya adalah UMKM. Omset bulan Maret 2025 adalah Rp 100.000.000. Hitung PPh Final (Pasal 4 Ayat 2) yang harus disetor mandiri.',
                    questions: [
                        { id: 'q_dpp', label: 'Dasar Pengenaan Pajak / Omset (Rp)', type: 'number', correct: 100000000, hint: 'Total omset bulan tersebut.' },
                        { id: 'q_tarif', label: 'Tarif PPh Final UMKM (%)', type: 'number', correct: 0.5, hint: 'Sesuai PP 55 Tahun 2022 (pengganti PP 23/2018).' },
                        { id: 'q_pph', label: 'PPh Final Terutang (Rp)', type: 'number', correct: 500000, hint: 'Omset x 0.5%' }
                    ],
                    explanation: 'Berdasarkan PP 55 Tahun 2022, WP Badan UMKM berbentuk CV dikenakan PPh Final 0,5% dari peredaran bruto. Batas bebas omset Rp 500 Juta HANYA berlaku untuk Orang Pribadi UMKM, bukan untuk Badan/CV.'
                },
                {
                    id: 'final2',
                    title: 'Sewa Bangunan Bulanan',
                    difficulty: 'Mudah',
                    scenario: 'Sebuah perusahaan menyewakan gedung dan menerima uang sewa bulanan Rp 50.000.000. Hitung PPh Final atas sewa bangunan yang terutang.',
                    questions: [
                        { id: 'q_dpp', label: 'Nilai Sewa Bulanan (Rp)', type: 'number', correct: 50000000, hint: 'Jumlah pembayaran sewa.' },
                        { id: 'q_tarif', label: 'Tarif PPh Final Sewa Bangunan (%)', type: 'number', correct: 10, hint: 'Tarif umum untuk sewa bangunan.' },
                        { id: 'q_pph', label: 'PPh Final Terutang (Rp)', type: 'number', correct: 5000000, hint: 'Nilai sewa x tarif.' }
                    ],
                    explanation: 'PPh Final atas sewa bangunan dikenakan tarif 10% dari jumlah bruto sewa, sehingga pemotongan dilakukan langsung dari pembayaran sewa.'
                },
                {
                    id: 'final3',
                    title: 'Toko Online UMKM',
                    difficulty: 'Mudah',
                    scenario: 'Seorang pelaku UMKM memiliki omzet bulanan Rp 250.000.000 dari penjualan online. Hitung PPh Final yang terutang berdasarkan tarif PP 55/2022.',
                    questions: [
                        { id: 'q_dpp', label: 'Omset Bulanan (Rp)', type: 'number', correct: 250000000, hint: 'Total omzet penjualan sebelum pajak.' },
                        { id: 'q_tarif', label: 'Tarif PPh Final UMKM (%)', type: 'number', correct: 0.5, hint: 'Tarif final untuk UMKM sesuai PP 55/2022.' },
                        { id: 'q_pph', label: 'PPh Final Terutang (Rp)', type: 'number', correct: 1250000, hint: 'Omset x 0.5%.' }
                    ],
                    explanation: 'Kasus ini membantu memahami cara menghitung PPh Final untuk UMKM yang menggunakan skema tarif 0,5% dari peredaran bruto.'
                }
            ],
            'PPh21': [
                {
                    id: 'pph21_1',
                    title: 'Hitung PPh 21 Karyawan Tetap',
                    difficulty: 'Sedang',
                    scenario: 'Bapak Rian bekerja di PT Maju Jaya. Gaji bulan ini Rp 10.000.000. Status belum menikah (TK/0). Hitung potongan PPh 21 berdasarkan tarif efektif bulanan (TER) Kategori A (misal asumsi TER = 2%).',
                    questions: [
                        { id: 'q_gaji', label: 'Penghasilan Bruto Sebulan (Rp)', type: 'number', correct: 10000000, hint: 'Total gaji kotor bulan tersebut.' },
                        { id: 'q_kategori', label: 'Kategori TER PTKP TK/0', type: 'select', options: ['Kategori A', 'Kategori B', 'Kategori C'], correct: 'Kategori A', hint: 'TK/0 masuk ke TER Kategori A sesuai PP 58/2023.' },
                        { id: 'q_potong', label: 'PPh 21 Dipotong Bulan Ini (Rp)', type: 'number', correct: 200000, hint: 'Rp 10.000.000 x 2% (Contoh tarif TER A)' }
                    ],
                    explanation: 'Mulai tahun 2024, pemotongan PPh 21 bulanan menggunakan skema Tarif Efektif Rata-Rata (TER) sesuai PP 58/2023. TK/0 masuk Kategori A. PPh 21 bulanan dihitung langsung dari: Penghasilan Bruto x Tarif TER.'
                },
                {
                    id: 'pph21_2',
                    title: 'PPh 21 Honorarium Non-Karyawan',
                    difficulty: 'Sedang',
                    scenario: 'Ibu Mira menerima honorarium sebesar Rp 4.000.000 dari satu pihak pemberi kerja. Status PTKP TK/0. Hitung potongan PPh 21 berdasarkan tarif TER Kategori A.',
                    questions: [
                        { id: 'q_gaji', label: 'Honorarium Bruto (Rp)', type: 'number', correct: 4000000, hint: 'Jumlah honorarium sebelum dipotong.' },
                        { id: 'q_kategori', label: 'Kategori TER PTKP TK/0', type: 'select', options: ['Kategori A', 'Kategori B', 'Kategori C'], correct: 'Kategori A', hint: 'Pemotongan menggunakan kategori yang sama.' },
                        { id: 'q_potong', label: 'PPh 21 Dipotong (Rp)', type: 'number', correct: 80000, hint: 'Honorarium x 2%.' }
                    ],
                    explanation: 'Pemotongan PPh 21 juga berlaku untuk honorarium dan imbalan sejenis yang diterima non-karyawan, selama ada pemberi kerja dan dasar pengenaan pajak yang jelas.'
                }
            ],
            '1771': [
                {
                    id: 'badan1',
                    title: 'PT Sukses Makmur (Koreksi Fiskal)',
                    difficulty: 'Sangat Sulit',
                    scenario: 'PT Sukses Makmur memiliki Laba Bersih Komersial sebesar Rp 2.000.000.000. Dalam laporan laba rugi, terdapat biaya sumbangan ke panti asuhan sebesar Rp 50.000.000 dan biaya sanksi pajak Rp 10.000.000.',
                    questions: [
                        { id: 'q_laba', label: 'Laba Komersial (Rp)', type: 'number', correct: 2000000000, hint: 'Laba bersih sebelum pajak sesuai akuntansi.' },
                        { id: 'q_koreksi_sumbangan', label: 'Koreksi Positif Sumbangan (Rp)', type: 'number', correct: 50000000, hint: 'Sumbangan biasa tidak boleh dibiayakan.' },
                        { id: 'q_koreksi_pajak', label: 'Koreksi Positif Sanksi Pajak (Rp)', type: 'number', correct: 10000000, hint: 'Sanksi pajak tidak boleh mengurangi laba.' },
                        { id: 'q_fiskal', label: 'Laba Fiskal / PKP (Rp)', type: 'number', correct: 2060000000, hint: 'Laba Komersial + Total Koreksi Positif' }
                    ],
                    explanation: 'Sesuai UU PPh Pasal 9, biaya sumbangan (selain yang diizinkan spesifik) dan sanksi administrasi perpajakan tidak dapat dikurangkan dari penghasilan bruto (Non-Deductible Expense). Sehingga harus dilakukan Koreksi Fiskal Positif yang akan menambah laba kena pajak.'
                },
                {
                    id: 'badan2',
                    title: 'PT Sejahtera (Biaya Entertainment)',
                    difficulty: 'Sangat Sulit',
                    scenario: 'PT Sejahtera memiliki laba komersial Rp 1.800.000.000. Terdapat biaya entertainment Rp 75.000.000 dan biaya hadiah promosi Rp 20.000.000 yang tidak dapat dikurangkan penuh untuk fiskal.',
                    questions: [
                        { id: 'q_laba', label: 'Laba Komersial (Rp)', type: 'number', correct: 1800000000, hint: 'Laba sebelum pajak.' },
                        { id: 'q_koreksi_sumbangan', label: 'Koreksi Positif Entertainment (Rp)', type: 'number', correct: 75000000, hint: 'Biaya entertainment tidak sepenuhnya boleh dikurangkan.' },
                        { id: 'q_koreksi_pajak', label: 'Koreksi Positif Hadiah Promosi (Rp)', type: 'number', correct: 20000000, hint: 'Hadiah promosi perlu ditambahkan kembali untuk fiskal.' },
                        { id: 'q_fiskal', label: 'Laba Fiskal / PKP (Rp)', type: 'number', correct: 1870000000, hint: 'Laba komersial ditambah koreksi positif.' }
                    ],
                    explanation: 'Dalam rekonsiliasi fiscal, beberapa biaya yang secara komersial dibebankan tetap perlu ditambah kembali untuk menghitung laba fiskal yang benar.'
                }
            ],
            'PPN': [
                {
                    id: 'ppn1',
                    title: 'PT Retail (Hitung Kurang Bayar PPN)',
                    difficulty: 'Sulit',
                    scenario: 'Pada Masa Pajak Mei 2025, PT Retail (PKP) menjual barang senilai Rp 500.000.000 (belum PPN). Di bulan yang sama, perusahaan membeli persediaan senilai Rp 300.000.000 (belum PPN). Tarif PPN adalah 11%.',
                    questions: [
                        { id: 'q_out', label: 'PPN Keluaran / Output Tax (Rp)', type: 'number', correct: 55000000, hint: '11% x Rp 500 Juta' },
                        { id: 'q_in', label: 'PPN Masukan / Input Tax (Rp)', type: 'number', correct: 33000000, hint: '11% x Rp 300 Juta' },
                        { id: 'q_bayar', label: 'PPN Kurang Bayar (Rp)', type: 'number', correct: 22000000, hint: 'PPN Keluaran dikurangi PPN Masukan' }
                    ],
                    explanation: 'Mekanisme PPN menggunakan sistem Pengkreditan Pajak (Indirect Subtraction Method). PPN yang dipungut dari pembeli (Keluaran) dikurangi dengan PPN yang dibayar saat kulakan (Masukan). Selisihnya jika positif harus disetor ke Kas Negara.'
                },
                {
                    id: 'ppn2',
                    title: 'PT Elektronik (PPN Lebih Bayar)',
                    difficulty: 'Sulit',
                    scenario: 'PT Elektronik menjual barang senilai Rp 300.000.000 pada bulan Juni. PPN Masukan dari pembelian bahan baku sebesar Rp 44.000.000, sementara PPN Keluaran sebesar Rp 33.000.000.',
                    questions: [
                        { id: 'q_out', label: 'PPN Keluaran / Output Tax (Rp)', type: 'number', correct: 33000000, hint: 'PPN atas penjualan.' },
                        { id: 'q_in', label: 'PPN Masukan / Input Tax (Rp)', type: 'number', correct: 44000000, hint: 'PPN atas pembelian bahan baku.' },
                        { id: 'q_bayar', label: 'PPN Lebih Bayar (Rp)', type: 'number', correct: -11000000, hint: 'Selisih negatif berarti ada lebih bayar.' }
                    ],
                    explanation: 'Jika PPN Masukan lebih besar dibanding PPN Keluaran, maka selisihnya menghasilkan kelebihan pajak yang dapat direstitusikan atau dikompensasikan pada masa berikutnya.'
                }
            ],
        };
        // ==========================================
        // 3. DATASOURCE: TABLOID LINK RESMI & LIVE RSS
        // ==========================================
        const tabloidLinks = [
            { label: 'Situs Resmi DJP', url: 'https://www.pajak.go.id/' },
            { label: 'Peraturan Pajak Terbaru', url: 'https://www.pajak.go.id/id/peraturan' },
            { label: 'Berita dan Pengumuman', url: 'https://www.pajak.go.id/id/berita' },
            { label: 'e-Filing / DJP Online', url: 'https://djponline.pajak.go.id/' }
        ];

        function renderTabloidLinks() {
            const container = document.getElementById('tabloid-links-container');
            if(!container) return;
            container.innerHTML = tabloidLinks.map(link => {
                return `<a class="btn btn-outline" href="${link.url}" target="_blank" rel="noopener">${link.label}</a>`;
            }).join('');
        }
        
        // FIX: escapeHTML + validasi skema link — supaya konten dari API berita eksternal
        // (title/link) tidak bisa disuntikkan sebagai HTML/atribut mentah ke dalam innerHTML.
        function escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/[&<>'"]/g, function(match) {
                const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
                return escapeMap[match];
            });
        }
        function safeUrl(url) {
            try {
                const u = new URL(url, window.location.href);
                return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '#';
            } catch(e) {
                return '#';
            }
        }

        async function fetchRegulationUpdates(forceRefresh = false) {
            const status = document.getElementById('tabloid-status');
            const last = document.getElementById('tabloid-last-updated');
            const feedContainer = document.getElementById('tabloid-feed');
            
            if(!feedContainer) return;

            if(status) {
                status.style.display = "block";
                status.innerHTML = 'Mengambil update peraturan pajak terbaru dari internet... ⏳';
            }
            feedContainer.style.opacity = 0.5;

            try {
                const urlBerita = encodeURIComponent(`https://news.google.com/rss/search?q=pajak+indonesia&hl=id&gl=ID&ceid=ID:id`);
                const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${urlBerita}`;

                const res = await fetch(apiUrl);
                if(!res.ok) throw new Error('Gagal mengambil data dari internet');
                
                const data = await res.json();
                
                if(data.status === 'ok' && data.items.length > 0) {
                    feedContainer.innerHTML = "";
                    if(status) status.style.display = "none";

                    const items = data.items.slice(0, 3);

                    items.forEach(berita => {
                        const div = document.createElement("div");
                        div.className = "card";
                        div.style.cssText = "padding: 18px; background: rgba(255,255,255,0.95); border: 1px solid rgba(0, 75, 135, 0.12);";
                        
                        const cleanTitle = escapeHTML(berita.title.split(" - ")[0]);
                        const safeLink = safeUrl(berita.link);
                        const tglBerita = new Date(berita.pubDate).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                        });

                        div.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:start; gap:10px; flex-wrap:wrap;">
                                <div style="flex: 1;">
                                    <strong style="display:block; margin-bottom: 6px; color: var(--primary); font-size: 1.05rem;">
                                        📰 ${cleanTitle}
                                    </strong>
                                    <span style="color: var(--text-muted); font-size: 0.9rem; display: block; margin-bottom: 8px;">
                                        📆 Terbit: ${tglBerita}
                                    </span>
                                </div>
                                <a href="${safeLink}" target="_blank" rel="noopener" class="btn btn-outline" style="padding: 8px 14px;">Buka Sumber</a>
                            </div>
                        `;
                        feedContainer.appendChild(div);
                    });

                    feedContainer.style.opacity = 1;
                } else {
                    throw new Error("Format data RSS tidak valid atau kosong");
                }
            } catch (err) {
                console.warn("API gagal, beralih ke data cadangan (Fallback):", err);
                
                const fallbackData = [
                    { title: "DJP Akan Segera Luncurkan Sistem CoreTax Secara Nasional", date: "Hari ini", url: "https://www.pajak.go.id" },
                    { title: "Penerapan Tarif Efektif Rata-Rata (TER) PPh 21 Telah Berlaku", date: "Baru saja", url: "https://www.pajak.go.id" },
                    { title: "Integrasi NIK menjadi NPWP untuk Wajib Pajak Orang Pribadi", date: "Bulan ini", url: "https://www.pajak.go.id" }
                ];
                
                feedContainer.innerHTML = "";
                if(status) {
                    status.style.display = "block";
                    status.innerHTML = '<span style="color: var(--warning);">Koneksi live terkendala. Menampilkan berita statis.</span>';
                }

                fallbackData.forEach(item => {
                    feedContainer.innerHTML += `
                        <div class="card" style="padding: 18px; background: rgba(255,255,255,0.95); border: 1px solid rgba(0, 75, 135, 0.12);">
                            <div style="display:flex; justify-content:space-between; align-items:start; gap:10px; flex-wrap:wrap;">
                                <div style="flex: 1;">
                                    <strong style="display:block; margin-bottom: 6px; color: var(--primary); font-size: 1.05rem;">📰 ${item.title}</strong>
                                    <span style="color: var(--text-muted); font-size: 0.9rem; display: block; margin-bottom: 8px;">📆 Update: ${item.date}</span>
                                </div>
                                <a href="${item.url}" target="_blank" rel="noopener" class="btn btn-outline" style="padding: 8px 14px;">Situs Resmi</a>
                            </div>
                        </div>
                    `;
                });
                feedContainer.style.opacity = 1;
            }

            if(last) {
                const hariIni = new Date().toLocaleDateString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                last.innerHTML = `<em>Terakhir ditarik: ${hariIni} WIB</em>`;
            }
        }
        // ==========================================
        // 4. STATE MANAGEMENT
        // ==========================================
        let appState = {
            currentModule: null,
            currentMode: null, 
            currentCase: null,
            useGenerator: false, // true = pakai CaseGenerator (kasus acak), false = pakai databaseKasus (bank soal tetap)
            user: { xp: 0, level: 1, history: [], email: '', displayName: '' }
        };

        function loadData() {
            // FIX: JSON.parse dibungkus try/catch — data localStorage yang korup/rusak
            // tidak lagi bikin seluruh window.onload berhenti (dashboard blank tanpa pesan).
            // Ini SELALU jadi sumber data pertama yang dipakai (jalan penuh walau offline/
            // Firebase belum siap). Kalau nanti Firebase siap & online, data akan
            // disinkron/ditimpa hanya kalau memang lebih baru (lihat onAuthStateChanged).
            try {
                const saved = localStorage.getItem('spt_simulator_data');
                if(saved) {
                    const parsed = JSON.parse(saved);
                    appState.user = { xp: 0, level: 1, history: [], email: '', displayName: '', updatedAt: 0, ...parsed };
                }
            } catch(e) {
                console.warn('Data lokal korup, direset ke default:', e);
                localStorage.removeItem('spt_simulator_data');
                appState.user = { xp: 0, level: 1, history: [], email: '', displayName: '', updatedAt: 0 };
            }

            updateProfileUI();
            
            const savedTheme = localStorage.getItem('bls-theme') || localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);

            try {
                const portalName = sessionStorage.getItem('portal_user_name');
                const portalEmail = sessionStorage.getItem('portal_user_email');
                if (portalName && (!appState.user.displayName || appState.user.displayName === 'Tamu')) {
                    appState.user.displayName = portalName;
                    if (portalEmail) appState.user.email = portalEmail;
                    updateProfileUI();
                }
            } catch (_) {}
        }

        // CATATAN: fungsi saveData() versi localStorage yang lama sudah dihapus dari sini —
        // sebelumnya ada 2 definisi saveData() dan yang ini selalu ketimpa oleh versi
        // berbasis Firebase di bawah (dekat baris "DEKLARASI FIREBASE"), jadi dead code.

        function updateProfileUI() {
            const xpText = document.getElementById('ui-xp-text');
            if (xpText) xpText.innerText = `XP: ${appState.user.xp} / 1000`;
            
            appState.user.level = Math.floor(appState.user.xp / 200) + 1;
            
            let title = "Wajib Pajak Baru";
            if(appState.user.level > 2) title = "Brevet A";
            if(appState.user.level > 5) title = "Brevet B";
            if(appState.user.level > 10) title = "Konsultan Pajak";

            const levelEl = document.getElementById('ui-level');
            if (levelEl) levelEl.innerText = `Level ${appState.user.level}: ${title}`;

            const profileName = document.getElementById('profile-name');
            if(profileName) profileName.innerText = appState.user.displayName || 'Tamu';

            const profileRole = document.getElementById('profile-role');
            if(profileRole) profileRole.innerText = appState.user.email ? appState.user.email : 'Pelajar Pajak';

        }
// --- DEKLARASI FIREBASE (aman kalau SDK gagal dimuat, misal saat offline) ---
let auth = null;
let db = null;
let currentUid = null;
let pendingSync = false; // true = ada perubahan lokal yang belum berhasil disinkron ke cloud

const FIREBASE_SDK_URLS = [
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js'
];

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
        const el = document.createElement('script');
        el.src = src;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error('Gagal memuat ' + src));
        document.head.appendChild(el);
    });
}

// Kalau tag <script> SDK Firebase gagal dimuat waktu halaman pertama kali dibuka (offline),
// "firebase" tidak akan pernah terdefinisi dengan sendirinya walau koneksi sudah kembali --
// jadi di sini kita coba muat ulang file SDK-nya secara manual satu per satu secara berurutan.
async function ensureFirebaseSdkLoaded() {
    if (typeof firebase !== 'undefined') return true;
    try {
        for (const src of FIREBASE_SDK_URLS) {
            await loadScriptOnce(src);
        }
        return typeof firebase !== 'undefined';
    } catch (e) {
        console.warn('SDK Firebase masih belum bisa dimuat (kemungkinan masih offline):', e);
        return false;
    }
}

async function initFirebaseServices() {
    if (auth && db) return true; // sudah siap dari sebelumnya, tidak perlu diulang

    const sdkLoaded = await ensureFirebaseSdkLoaded();
    if (!sdkLoaded) return false;

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.firebaseReady = true;
        auth = firebase.auth();
        db = firebase.database();
        registerAuthListener();
        completeEmailLinkSignIn();
        return true;
    } catch (e) {
        console.warn('Gagal menyiapkan layanan Firebase, app tetap jalan dengan localStorage:', e);
        return false;
    }
}

function registerAuthListener() {
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUid = user.uid;
            // Kalau ini akun email asli (bukan anonim), pastikan status email di UI ikut update
            if (!user.isAnonymous && user.email) {
                appState.user.email = user.email;
                const pendingName = localStorage.getItem('spt_pending_name');
                if (pendingName) appState.user.displayName = pendingName;
                else if (!appState.user.displayName) appState.user.displayName = user.email.split('@')[0];
            }
            db.ref('users/' + currentUid).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        const remote = { xp: 0, level: 1, history: [], email: '', displayName: '', updatedAt: 0, ...snapshot.val() };
                        // PENTING: jangan asal timpa. Pakai data yang paling baru (updatedAt),
                        // supaya progres yang dibuat offline tidak ketiban data lama dari cloud,
                        // dan sebaliknya data cloud dari device lain tidak hilang begitu saja.
                        if (remote.updatedAt > (appState.user.updatedAt || 0)) {
                            appState.user = remote;
                        }
                    }
                    updateProfileUI();
                    saveData(); // simpan hasil "pemenang" merge ke localStorage + cloud, biar dua-duanya sinkron
                })
                .catch(err => {
                    console.warn('Tidak bisa ambil data cloud (kemungkinan offline), tetap pakai data lokal:', err);
                    updateProfileUI();
                });
        } else {
            // Jika tidak ada user login, masuk sebagai anonim (progres tetap tersimpan lokal)
            auth.signInAnonymously().catch(err => console.warn('Auth anonim gagal (kemungkinan offline):', err));
        }
    });
}

// --- LOGIN PASSWORDLESS: kirim link ke email, selesaikan sign-in saat link diklik ---
function getAuthActionUrl() {
    // Balik ke halaman app ini sendiri (tanpa query string lama), dimanapun di-hosting.
    return window.location.origin + window.location.pathname;
}

function showAuthStatus(message, type) {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.textContent = message;
    el.className = 'feedback ' + type;
    el.style.display = 'block';
}

function sendLoginLink() {
    // Form login SPT sudah dihapus. Arahkan ke Portal untuk kirim magic link.
    openAuthModal();
}


function completeEmailLinkSignIn() {
    if (!auth || !auth.isSignInWithEmailLink(window.location.href)) return;

    let email = localStorage.getItem('spt_pending_email');
    if (!email) {
        // Link dibuka di browser/perangkat berbeda dari saat "Kirim Link" ditekan.
        email = window.prompt('Masukkan kembali email yang Anda gunakan untuk login:');
    }
    if (!email) return;

    const credential = firebase.auth.EmailAuthProvider.credentialWithLink(email, window.location.href);

    const finishUp = (result) => {
        localStorage.removeItem('spt_pending_email');
        const pendingName = localStorage.getItem('spt_pending_name');
        localStorage.removeItem('spt_pending_name');

        appState.user.email = result.user.email || email;
        if (pendingName) appState.user.displayName = pendingName;

        // Bersihkan query string login dari URL biar link tidak terpakai ulang saat refresh
        history.replaceState(null, '', getAuthActionUrl());

        updateProfileUI();
        saveData();
        alert('✅ Login berhasil! Progres Anda sekarang terhubung dengan ' + appState.user.email + '.');
    };

    // Kalau saat ini masih anonim, "link"-kan akun anonim ke email ini supaya
    // progres yang sudah dibuat sebelum login tidak hilang.
    if (auth.currentUser && auth.currentUser.isAnonymous) {
        auth.currentUser.linkWithCredential(credential).then(finishUp).catch(err => {
            if (err.code === 'auth/credential-already-in-use') {
                // Email itu sudah pernah dipakai login sebelumnya -> masuk ke akun lama itu saja
                auth.signInWithCredential(err.credential).then(finishUp).catch(e2 => {
                    console.error('Gagal masuk dengan link:', e2);
                    alert('❌ Link login tidak valid atau sudah kedaluwarsa. Silakan minta link baru.');
                });
            } else {
                console.error('Gagal menghubungkan akun:', err);
                alert('❌ Link login tidak valid atau sudah kedaluwarsa. Silakan minta link baru.');
            }
        });
    } else {
        auth.signInWithCredential(credential).then(finishUp).catch(err => {
            console.error('Gagal masuk dengan link:', err);
            alert('❌ Link login tidak valid atau sudah kedaluwarsa. Silakan minta link baru.');
        });
    }
}

// --- FUNGSI UI MODAL ---
function openAuthModal() {
    // Login hanya di Portal — redirect agar tidak ada double login UI
    try {
        window.location.href = '../../index.html';
    } catch (e) {
        console.warn('Redirect ke portal gagal', e);
    }
}

function closeAuthModal() {
    // no-op: modal auth SPT sudah dihapus
}

function toggleAuth() {
    // Logout tetap di sini (bersihkan sesi Firebase + UI lokal).
    // Login diarahkan ke Portal agar tidak ada double login page.
    if(appState.user.email) {
        logoutUser();
    } else {
        openAuthModal(); // redirect ke portal
    }
}

// --- SIMPAN DATA: localStorage dulu (selalu berhasil, jalan offline), baru coba sinkron ke cloud ---
let _localSaveFailWarned = false; // pastikan peringatan cuma muncul sekali per sesi, tidak spam alert()

function saveData() {
    appState.user.updatedAt = Date.now();

    // 1. SELALU simpan ke localStorage lebih dulu. Ini yang membuat progres tidak
    //    pernah hilang walau sedang offline atau Firebase gagal/lambat merespons.
    try {
        localStorage.setItem('spt_simulator_data', JSON.stringify(appState.user));
    } catch (e) {
        console.error('Gagal simpan ke localStorage (mungkin penyimpanan penuh):', e);
        // Data safety (bagian 30): sebelumnya kegagalan ini sepenuhnya senyap —
        // siswa bisa kehilangan seluruh progres tanpa tahu apa-apa. Beri tahu
        // sekali saja per sesi supaya tidak mengganggu tapi tetap jujur.
        if (!_localSaveFailWarned) {
            _localSaveFailWarned = true;
            alert('⚠️ Penyimpanan progres gagal (penyimpanan browser penuh atau mode privat). Progres Anda mungkin TIDAK tersimpan di perangkat ini. Jika memungkinkan, login dengan email agar progres tersinkron ke cloud.');
        }
    }

    // 2. Baru coba sinkron ke Firebase kalau memang online & sudah siap. Kalau gagal,
    //    data tetap aman di localStorage dan akan dicoba lagi otomatis saat online kembali.
    syncToFirebase();
}

function syncToFirebase() {
    if (!db || !currentUid) { pendingSync = true; return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { pendingSync = true; return; }

    db.ref('users/' + currentUid).set(appState.user)
        .then(() => { pendingSync = false; })
        .catch(err => {
            console.warn('Gagal sinkron ke Firebase (kemungkinan offline). Data tetap aman di localStorage, akan dicoba lagi saat online:', err);
            pendingSync = true;
        });
}

// Begitu koneksi internet kembali: kalau Firebase belum pernah siap (SDK gagal dimuat
// saat awal offline), coba inisialisasi lagi; lalu sinkronkan progres yang tertunda.
window.addEventListener('online', function() {
    if (!auth || !db) {
        initFirebaseServices();
    }
    if (pendingSync) {
        syncToFirebase();
    }
});

function logoutUser() {
    // Reset status login lokal (progres XP/riwayat TIDAK dihapus, tetap ada di localStorage)
    appState.user.email = '';
    appState.user.displayName = '';
    saveData();
    updateProfileUI();

    if (auth) {
        auth.signOut().catch(err => console.error('Logout error:', err));
    }
}

// CATATAN: initFirebaseServices() SENGAJA dipanggil dari window.onload (setelah loadData()),
// bukan di sini langsung -- supaya appState.user sudah terisi data lokal (termasuk updatedAt)
// lebih dulu, sebelum listener auth Firebase mencoba membandingkan/menggabungkan data cloud.

        // ==========================================
        // 4. CORE UI ROUTING & RENDERING
        // ==========================================
        function navigate(viewId) {
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.querySelector(`.nav-item[data-view="${viewId}"]`)?.classList.add('active');
            
            if(viewId === 'dashboard') {
                document.getElementById('view-dashboard').classList.add('active');
                document.getElementById('page-title').innerText = "Dashboard Pembelajaran";
                document.getElementById('page-subtitle').innerText = "Pilih jenis SPT untuk memulai simulasi pengisian.";
                animateCounters();
            } else if (viewId === 'history') {
                renderHistory();
                document.getElementById('view-history').classList.add('active');
                document.getElementById('page-title').innerText = "Riwayat Anda";
                document.getElementById('page-subtitle').innerText = "Catatan simulasi yang telah dikerjakan.";
            } else if (viewId === 'coretax') {
                document.getElementById('view-coretax').classList.add('active');
                document.getElementById('page-title').innerText = "Panduan Coretax";
                document.getElementById('page-subtitle').innerText = "Persiapan dan langkah memahami sistem Coretax secara lebih mudah.";
            } else if (viewId === 'tabloid') {
                document.getElementById('view-tabloid').classList.add('active');
                document.getElementById('page-title').innerText = "Tabloid Pajak";
                document.getElementById('page-subtitle').innerText = "Kumpulan link resmi DJP untuk peraturan pajak terbaru.";
            } else if (viewId === 'calculator') {
                document.getElementById('view-calculator').classList.add('active');
                document.getElementById('page-title').innerText = "Simulasi TER & THR";
                document.getElementById('page-subtitle').innerText = "Dampak lapisan TER dan pengaruh THR terhadap tarif PPh 21.";
                if (typeof initCalcTabs === 'function') initCalcTabs();
            }
        }

        // Download hasil simulasi sebagai PDF sungguhan (bukan sekadar
        // window.print()). Pakai mesin PDF terpusat (js/shared/pdf-export.js);
        // window.print() tetap tersedia sebagai fallback manual di tombol
        // "Cetak (Print)" sebelahnya, dan sekarang didukung stylesheet
        // @media print yang sudah diperbaiki (lihat css/styles.css).
        function downloadResultPDF() {
            const statusEl = document.getElementById('resultPdfStatus');
            const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

            const source = document.querySelector('#view-result .result-card');
            if (!source) {
                setStatus('❌ Area hasil simulasi tidak ditemukan.');
                return;
            }
            if (!window.PDFExport) {
                setStatus('❌ Mesin PDF tidak tersedia. Gunakan tombol "Cetak (Print)" sebagai gantinya.');
                return;
            }

            const category = document.getElementById('result-category')?.innerText || 'Hasil';
            const score = document.getElementById('result-score')?.innerText || '';
            const filename = `Hasil_Simulasi_SPT_${category.replace(/[^a-zA-Z0-9]+/g, '_')}_${score}.pdf`;

            setStatus('⏳ Membuat PDF…');
            window.PDFExport.exportElementToPDF(source, {
                filename,
                widthPx: 720,
                scale: 2.2,
                onClone: (clone) => {
                    clone.style.boxShadow = 'none';
                    clone.style.padding = '18px';
                }
            }).then(() => {
                setStatus('✅ PDF hasil simulasi berhasil diunduh.');
            }).catch((err) => {
                console.error('[downloadResultPDF]', err);
                setStatus(`❌ ${err.message || 'Gagal membuat PDF hasil simulasi.'}`);
            });
        }

        /**
         * downloadFormPDF — generator PDF generik untuk formulir 1770 & 1771
         * (bagian 17: "Cetak Formulir" / "Download PDF" — sebelumnya kedua
         * formulir ini TIDAK punya cara export sama sekali, hanya hasil akhir
         * simulasi yang bisa diunduh).
         *
         * Dua masalah teknis yang wajib ditangani supaya PDF tidak kosong/rusak:
         *  1. Formulir memakai tab (hanya 1 lampiran tampil lewat inline
         *     style.display) — clone standar cuma akan berisi tab yang aktif
         *     saat tombol diklik. Semua lampiran dipaksa tampil di clone.
         *  2. cloneNode() TIDAK menangkap nilai <input>/<select> yang sedang
         *     diisi user (hanya atribut HTML awal) — tanpa langkah tambahan,
         *     PDF akan menampilkan formulir kosong walau siswa sudah mengisi
         *     penuh. Setiap input/select diganti teks statis berisi nilai
         *     LIVE-nya, dicocokkan berdasarkan urutan posisi (bukan id) supaya
         *     baris dinamis (harta, bukti potong, dll., yang idnya tidak
         *     selalu unik) tetap ikut tertangani dengan benar.
         */
        function downloadFormPDF(viewId, fieldPrefix, tabCount, formLabel) {
            const source = document.getElementById(viewId);
            if (!source) {
                alert('❌ Area formulir tidak ditemukan.');
                return;
            }
            if (!window.PDFExport) {
                alert('❌ Mesin PDF tidak tersedia. Coba muat ulang halaman.');
                return;
            }

            const titleEl = document.getElementById(fieldPrefix + '-title');
            const caseName = titleEl ? titleEl.innerText.trim() : 'Kasus';
            const filename = `Formulir_${formLabel}_${caseName.replace(/[^a-zA-Z0-9]+/g, '_') || 'Kasus'}.pdf`;

            window.PDFExport.exportElementToPDF(source, {
                filename,
                widthPx: 780,
                scale: 2,
                onClone: (clone) => {
                    // 1. Tampilkan SEMUA lampiran, bukan cuma tab yang aktif.
                    for (let n = 1; n <= tabCount; n++) {
                        const sheet = clone.querySelector('#' + fieldPrefix + '-tab-' + n);
                        if (sheet) sheet.style.display = 'block';
                    }
                    // 2. Buang navigasi tab — tidak relevan begitu semua lampiran tampil.
                    clone.querySelectorAll('.form1770-tabs').forEach((el) => el.remove());

                    // 3. Ganti tiap input/select dengan teks statis berisi nilai SEKARANG.
                    const liveFields = source.querySelectorAll('input, select, textarea');
                    const cloneFields = clone.querySelectorAll('input, select, textarea');
                    liveFields.forEach((liveEl, i) => {
                        const cloneEl = cloneFields[i];
                        if (!cloneEl) return;
                        let text;
                        if (liveEl.tagName === 'SELECT') {
                            const opt = liveEl.options[liveEl.selectedIndex];
                            text = opt ? opt.textContent.trim() : '';
                        } else {
                            text = (liveEl.value || '').trim();
                        }
                        const span = document.createElement('span');
                        span.textContent = text || '—';
                        span.style.cssText = 'display:inline-block;padding:4px 6px;border-bottom:1px solid #94a3b8;min-width:60px;font-size:9.5pt;';
                        cloneEl.replaceWith(span);
                    });

                    // 4. Rapikan tampilan cetak.
                    clone.style.boxShadow = 'none';
                    clone.style.padding = '14px';
                    clone.querySelectorAll('.form1770-sheet').forEach((el) => {
                        el.style.boxShadow = 'none';
                        el.style.border = '1px solid #cbd5e1';
                        el.style.marginBottom = '14px';
                    });
                }
            }).catch((err) => {
                console.error('[downloadFormPDF:' + fieldPrefix + ']', err);
                alert('❌ ' + (err.message || 'Gagal membuat PDF formulir.'));
            });
        }

        function downloadForm1770PDF() { downloadFormPDF('view-form1770', 'f1770', 5, '1770'); }
        function downloadForm1771PDF() { downloadFormPDF('view-form1771', 'f1771', 6, '1771'); }

        function syncMobileSidebar(open) {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            const toggleBtn = document.getElementById('sidebar-toggle');
            if (!sidebar) return;
            const isOpen = Boolean(open);
            sidebar.classList.toggle('mobile-open', isOpen);
            if (backdrop) backdrop.classList.toggle('active', isOpen);
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', String(isOpen));
                toggleBtn.setAttribute('title', isOpen ? 'Tutup menu' : 'Buka menu');
            }
            document.body.style.overflow = isOpen ? 'hidden' : '';
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if(!sidebar) return;
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            if (isMobile) {
                syncMobileSidebar(!sidebar.classList.contains('mobile-open'));
            } else {
                sidebar.classList.toggle('collapsed');
                const toggleBtn = document.getElementById('sidebar-toggle');
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!sidebar.classList.contains('collapsed')));
            }
        }

        function closeMobileSidebar() { syncMobileSidebar(false); }
        document.addEventListener('DOMContentLoaded', function() {
            const backdrop = document.getElementById('sidebar-backdrop');
            if (backdrop) backdrop.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                closeMobileSidebar();
            });

            document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (window.matchMedia('(max-width: 768px)').matches) closeMobileSidebar();
                });
            });

            window.addEventListener('resize', function() {
                if (!window.matchMedia('(max-width: 768px)').matches) closeMobileSidebar();
            });
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') closeMobileSidebar();
            });
        });

        function toggleCardInfo(e, moduleKey) {
            e.stopPropagation();
            const btn = e.currentTarget;
            const card = btn.closest('.card');
            if(!card) return;
            const extra = card.querySelector('.card-extra');
            if(card.classList.contains('expanded')) {
                card.classList.remove('expanded');
                if(extra) extra.remove();
                return;
            }
            let content = 'Deskripsi modul belum tersedia.';
            const formCaseMap = { '1770': Form1770Cases, '1770SS': Form1770SSCases, '1770S': Form1770SCases };
            if (formCaseMap[moduleKey] && formCaseMap[moduleKey][0]) {
                content = formCaseMap[moduleKey][0].narrative.substring(0, 220) + '...';
            } else if(databaseKasus[moduleKey] && databaseKasus[moduleKey][0]) {
                content = databaseKasus[moduleKey][0].scenario.substring(0, 220) + '...';
            }
            const el = document.createElement('div');
            el.className = 'card-extra';
            el.innerHTML = `<strong>Contoh Kasus:</strong><div style="margin-top:6px">${content}</div>`;
            card.appendChild(el);
            card.classList.add('expanded');
        }

        function animateCounters() {
            const modulesEl = document.getElementById('stat-modules');
            const xpEl = document.getElementById('stat-xp');
            const levelEl = document.getElementById('stat-level');
            if(!modulesEl || !xpEl || !levelEl) return;

            const modulesTarget = Object.keys(databaseKasus).length;
            const xpTarget = appState.user.xp || 0;
            const levelTarget = appState.user.level || Math.floor((appState.user.xp||0)/200) + 1;

            function run(el, target, duration=600) {
                const start = +el.innerText.replace(/[^0-9]/g,'') || 0;
                const range = target - start;
                const startTime = performance.now();
                function frame(now) {
                    const progress = Math.min((now - startTime) / duration, 1);
                    el.innerText = Math.round(start + range * progress).toLocaleString('id-ID');
                    if(progress < 1) requestAnimationFrame(frame);
                }
                requestAnimationFrame(frame);
            }

            run(modulesEl, modulesTarget);
            run(xpEl, xpTarget);
            run(levelEl, levelTarget);
        }

        function openModeSelect(moduleType) {
            appState.currentModule = moduleType;
            appState.useGenerator = false; // reset tiap masuk modul baru, defaultnya bank soal tetap

            if(!databaseKasus[moduleType]) {
                alert("Modul ini sedang dalam tahap pengembangan (Coming Soon)!");
                return;
            }

            // Toggle "Kasus Acak (Generator)" cuma muncul untuk modul yang sudah didukung CaseGenerator
            const genBox = document.getElementById('generator-toggle-box');
            const genChk = document.getElementById('chk-use-generator');
            const generatorTersedia = (moduleType === 'PPh21');
            genBox.style.display = generatorTersedia ? 'flex' : 'none';
            genChk.checked = false;

            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.getElementById('view-modeselect').classList.add('active');
            document.getElementById('page-title').innerText = `Persiapan Modul: ${moduleType}`;
            document.getElementById('page-subtitle').innerText = "Pilih mode pengerjaan.";
        }

        // ==========================================
        // PEMILIH KASUS (dipakai bersama SPT 1770 / 1770 SS / 1770 S)
        // ==========================================
        function renderCaseCard(c, openerFnName) {
            const div = document.createElement('div');
            div.className = 'card';
            div.style.cursor = 'pointer';
            div.onclick = function() { window[openerFnName](c.id); };
            const teks = (c.narrative || c.scenario || '').substring(0, 170);
            div.innerHTML = '<h3>' + escapeHTML(c.title) + '</h3>' +
                (c.difficulty ? '<span class="tag">' + escapeHTML(c.difficulty) + '</span>' : '') +
                '<p style="margin-top:8px; color: var(--text-muted); font-size: 0.88rem;">' + escapeHTML(teks) + '…</p>';
            return div;
        }

        function showCasePicker(moduleLabel, cases, openerFnName, randomFnName) {
            const listEl = document.getElementById('formcaselist-items');
            listEl.innerHTML = '';
            cases.forEach(function(c) { listEl.appendChild(renderCaseCard(c, openerFnName)); });

            const randomBox = document.getElementById('formcaselist-random-box');
            const randomBtn = document.getElementById('formcaselist-random-btn');
            if (randomFnName) {
                randomBox.style.display = 'flex';
                randomBtn.onclick = function() { window[randomFnName](); };
            } else {
                randomBox.style.display = 'none';
            }

            document.getElementById('formcaselist-title').innerText = 'Pilih Kasus — ' + moduleLabel;
            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-formcaselist').classList.add('active');
            document.getElementById('page-title').innerText = 'Pilih Kasus — ' + moduleLabel;
            document.getElementById('page-subtitle').innerText = 'Pilih salah satu kasus di bawah untuk mulai mengisi formulir, atau buat kasus acak.';
        }

        function openForm1770Picker() { showCasePicker('SPT 1770', Form1770Cases, 'openForm1770', null); }
        function openForm1770SSPicker() { showCasePicker('SPT 1770 SS', Form1770SSCases, 'openForm1770SS', 'openForm1770SSRandom'); }
        function openForm1770SPicker() { showCasePicker('SPT 1770 S', Form1770SCases, 'openForm1770S', 'openForm1770SRandom'); }

        // Form1770Cases dipindah ke js/data/kasus-spt.js (dimuat sebelum file ini di index.html) —
        // lihat komentar di file tersebut. Variabel global `Form1770Cases` tetap sama seperti sebelumnya.

        let form1770State = { case: null, hartaCounter: 0, utangCounter: 0, bpCounter: 0, finalCounter: 0, bukanObjekCounter: 0, keluargaCounter: 0, pekerjaanCounter: 0, koreksiCounter: 0 };

        function openForm1770(caseId) {
            const kasus = caseId ? Form1770Cases.find(function(c) { return c.id === caseId; }) : Form1770Cases[Math.floor(Math.random() * Form1770Cases.length)];
            if (!kasus) { alert('Kasus tidak ditemukan.'); return; }
            form1770State = { case: kasus, hartaCounter: 0, utangCounter: 0, bpCounter: 0, finalCounter: 0, bukanObjekCounter: 0, keluargaCounter: 0, pekerjaanCounter: 0, koreksiCounter: 0 };

            document.getElementById('f1770-title').innerText = kasus.title;
            document.getElementById('f1770-narrative').innerText = kasus.narrative;

            ['peredaranBruto','hpp','biayaUsaha','nppnBruto','nppnPersen','labaKomersial','netoDNLainnya','zakat','kompensasiKerugian','angsuranSendiri'].forEach(function(id) {
                const el = document.getElementById('f1770-' + id);
                if (el) el.value = '';
            });
            document.getElementById('f1770-ptkpStatus').value = '';
            document.getElementById('f1770-usahaMode').value = 'none';
            document.getElementById('f1770-hanyaTeratur').value = '';
            document.getElementById('f1770-harta-rows').innerHTML = '';
            document.getElementById('f1770-utang-rows').innerHTML = '';
            document.getElementById('f1770-buktipotong-rows').innerHTML = '';
            document.getElementById('f1770-final-rows').innerHTML = '';
            document.getElementById('f1770-bukanobjek-rows').innerHTML = '';
            document.getElementById('f1770-keluarga-rows').innerHTML = '';
            document.getElementById('f1770-pekerjaan-rows').innerHTML = '';
            document.getElementById('f1770-koreksipositif-rows').innerHTML = '';

            toggleUsahaMode1770();
            switchForm1770Tab(1);
            recalcForm1770();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-form1770').classList.add('active');
            document.getElementById('page-title').innerText = 'Isi Formulir SPT 1770';
            document.getElementById('page-subtitle').innerText = 'Isi seperti formulir asli — baca kasus, lalu isi tiap lampiran.';
        }

        function toggleUsahaMode1770() {
            const mode = document.getElementById('f1770-usahaMode').value;
            document.getElementById('f1770-usaha-pembukuan').style.display = (mode === 'pembukuan') ? 'block' : 'none';
            document.getElementById('f1770-usaha-nppn').style.display = (mode === 'nppn') ? 'block' : 'none';
            document.getElementById('f1770-usaha-rekonsiliasi').style.display = (mode === 'rekonsiliasi') ? 'block' : 'none';
        }

        function switchForm1770Tab(tabNum) {
            [1, 2, 3, 4, 5].forEach(function(n) {
                document.getElementById('f1770-tab-' + n).style.display = (n === tabNum) ? 'block' : 'none';
                document.getElementById('f1770-tabbtn-' + n).classList.toggle('active', n === tabNum);
            });
        }

        function fmtRpForm1770(n) {
            const val = Number.isFinite(n) ? n : 0;
            const sign = val < 0 ? '-' : '';
            return sign + 'Rp ' + Math.abs(Math.round(val)).toLocaleString('id-ID');
        }

        // ---- Lampiran I: Koreksi Fiskal Positif ----
        function addKoreksiPositifRow1770(jenis, jumlah) {
            form1770State.koreksiCounter++;
            const rowId = 'f1770-koreksi-row-' + form1770State.koreksiCounter;
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Jenis koreksi (mis. Sumbangan tidak resmi)" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1770()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-koreksipositif-rows').appendChild(div);
            recalcForm1770();
        }

        // ---- Lampiran II-A: Bukti Potong Pekerjaan (1721-A1) ----
        function addPekerjaanRow1770(pemberiKerja, npwp, noBukti, netoPekerjaan, pph21Dipotong) {
            form1770State.pekerjaanCounter++;
            const rowId = 'f1770-pekerjaan-row-' + form1770State.pekerjaanCounter;
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama Pemberi Kerja" value="' + (pemberiKerja ? escapeHTML(pemberiKerja) : '') + '">' +
                '<input type="text" class="f1770-w-md" placeholder="NPWP Pemberi Kerja" value="' + (npwp ? escapeHTML(npwp) : '') + '">' +
                '<input type="text" class="f1770-w-md" placeholder="No. Bukti Potong 1721-A1" value="' + (noBukti ? escapeHTML(noBukti) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-neto" placeholder="Penghasilan Neto (Rp)" value="' + (netoPekerjaan !== undefined ? escapeHTML(String(netoPekerjaan)) : '') + '" oninput="recalcForm1770()">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-pph21" placeholder="PPh 21 Dipotong (Rp)" value="' + (pph21Dipotong !== undefined ? escapeHTML(String(pph21Dipotong)) : '') + '" oninput="recalcForm1770()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-pekerjaan-rows').appendChild(div);
            recalcForm1770();
        }

        // ---- Lampiran IV: Harta ----
        function addHartaRow(jenis, tahun, nilai) {
            form1770State.hartaCounter++;
            const rowId = 'f1770-harta-row-' + form1770State.hartaCounter;
            const div = document.createElement('div');
            div.className = 'form1770-harta-row';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-jenis" placeholder="Jenis harta (mis. Rumah, Mobil)" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-tahun" placeholder="Th. Peroleh" value="' + (tahun !== undefined ? escapeHTML(String(tahun)) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-nilai" placeholder="Nilai (Rp)" value="' + (nilai !== undefined ? escapeHTML(String(nilai)) : '') + '" oninput="recalcForm1770()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-harta-rows').appendChild(div);
            recalcForm1770();
        }

        // ---- Lampiran IV: Utang ----
        function addUtangRow(jenis, nilai) {
            form1770State.utangCounter++;
            const rowId = 'f1770-utang-row-' + form1770State.utangCounter;
            const div = document.createElement('div');
            div.className = 'form1770-utang-row';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-jenis" placeholder="Jenis utang (mis. KPR, Kredit Usaha)" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-nilai" placeholder="Nilai (Rp)" value="' + (nilai !== undefined ? escapeHTML(String(nilai)) : '') + '" oninput="recalcForm1770()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-utang-rows').appendChild(div);
            recalcForm1770();
        }

        // ---- Lampiran II-B: Bukti Potong (usaha) ----
        function addBuktiPotongRow(namaPemotong, npwp, jenisPajak, noBukti, jumlah) {
            form1770State.bpCounter++;
            const rowId = 'f1770-bp-row-' + form1770State.bpCounter;
            const jenisOptions = ['PPh 22', 'PPh 23', 'PPh 24', 'PPh Pasal 15', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Pajak</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenisPajak ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama Pemotong/Pemungut" value="' + (namaPemotong ? escapeHTML(namaPemotong) : '') + '">' +
                '<input type="text" class="f1770-w-md" placeholder="NPWP Pemotong" value="' + (npwp ? escapeHTML(npwp) : '') + '">' +
                '<select class="f1770-w-md">' + optionsHtml + '</select>' +
                '<input type="text" class="f1770-w-md" placeholder="No. Bukti Potong" value="' + (noBukti ? escapeHTML(noBukti) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1770()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-buktipotong-rows').appendChild(div);
            recalcForm1770();
        }

        // ---- Lampiran III-A: Penghasilan Final ----
        function addPenghasilanFinalRow(jenis, dpp, tarif) {
            form1770State.finalCounter++;
            const rowId = 'f1770-final-row-' + form1770State.finalCounter;
            const jenisOptions = ['Sewa Tanah/Bangunan', 'Bunga Deposito/Tabungan', 'Bunga/Diskonto Obligasi', 'Hadiah Undian', 'Jasa Konstruksi', 'Pengalihan Hak Tanah/Bangunan', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Penghasilan Final</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenis ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<select class="f1770-w-lg">' + optionsHtml + '</select>' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-dpp" placeholder="DPP (Rp)" value="' + (dpp !== undefined ? escapeHTML(String(dpp)) : '') + '" oninput="recalcForm1770()">' +
                '<input type="text" inputmode="numeric" class="f1770-w-sm f1770-tarif" placeholder="Tarif %" value="' + (tarif !== undefined ? escapeHTML(String(tarif)) : '') + '" oninput="recalcForm1770()">' +
                '<div class="f1770-computed-inline f1770-pphfinal-value">Rp 0</div>' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-final-rows').appendChild(div);
            recalcForm1770();
        }

        // ---- Lampiran III-B: Penghasilan Bukan Objek ----
        function addBukanObjekRow(jenis, jumlah) {
            form1770State.bukanObjekCounter++;
            const rowId = 'f1770-bo-row-' + form1770State.bukanObjekCounter;
            const jenisOptions = ['Warisan', 'Bantuan/Sumbangan/Hibah', 'Klaim Asuransi', 'Beasiswa', 'Bagian Laba Anggota (CV/Firma)', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Penghasilan</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenis ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<select class="f1770-w-lg">' + optionsHtml + '</select>' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1770()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-bukanobjek-rows').appendChild(div);
            recalcForm1770();
        }

        // ---- Lampiran IV: Susunan Anggota Keluarga ----
        function addKeluargaRow(nama, hubungan, pekerjaan) {
            form1770State.keluargaCounter++;
            const rowId = 'f1770-kel-row-' + form1770State.keluargaCounter;
            const hubunganOptions = ['Kepala Keluarga', 'Suami/Istri', 'Anak Kandung', 'Anak Angkat', 'Orang Tua', 'Mertua', 'Anggota Keluarga Lain'];
            let optionsHtml = '<option value="">Hubungan Keluarga</option>';
            hubunganOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === hubungan ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama" value="' + (nama ? escapeHTML(nama) : '') + '">' +
                '<select class="f1770-w-md">' + optionsHtml + '</select>' +
                '<input type="text" class="f1770-w-md" placeholder="Pekerjaan" value="' + (pekerjaan ? escapeHTML(pekerjaan) : '') + '">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770();">×</button>';
            document.getElementById('f1770-keluarga-rows').appendChild(div);
            recalcForm1770();
        }

        function hitungAngsuranPPh25(pphTerutang, kreditPihakLain) {
            const dasar = pphTerutang - kreditPihakLain;
            if (dasar <= 0) return 0;
            return Math.floor((dasar / 12) / 1000) * 1000;
        }

        function recalcForm1770() {
            // Lampiran I — Usaha/Pekerjaan Bebas (3 metode)
            const usahaMode = document.getElementById('f1770-usahaMode').value;
            let netoUsaha = 0;
            if (usahaMode === 'pembukuan') {
                const peredaranBruto = cleanNumber(document.getElementById('f1770-peredaranBruto').value);
                const hpp = cleanNumber(document.getElementById('f1770-hpp').value);
                const biayaUsaha = cleanNumber(document.getElementById('f1770-biayaUsaha').value);
                netoUsaha = peredaranBruto - hpp - biayaUsaha;
            } else if (usahaMode === 'nppn') {
                const nppnBruto = cleanNumber(document.getElementById('f1770-nppnBruto').value);
                const nppnPersen = cleanNumber(document.getElementById('f1770-nppnPersen').value);
                netoUsaha = nppnBruto * (nppnPersen / 100);
            } else if (usahaMode === 'rekonsiliasi') {
                const labaKomersial = cleanNumber(document.getElementById('f1770-labaKomersial').value);
                let totalKoreksi = 0;
                document.querySelectorAll('#f1770-koreksipositif-rows .f1770-nilai').forEach(function(el) { totalKoreksi += cleanNumber(el.value); });
                document.getElementById('f1770-totalKoreksiPositif').innerText = fmtRpForm1770(totalKoreksi);
                netoUsaha = labaKomersial + totalKoreksi;
            }
            document.getElementById('f1770-netoUsaha').innerText = fmtRpForm1770(netoUsaha);
            document.getElementById('f1770-netoUsaha-2').innerText = fmtRpForm1770(netoUsaha);

            // Lampiran II-A — Pekerjaan (1721-A1)
            let totalNetoPekerjaan = 0, totalPphPekerjaan = 0;
            document.querySelectorAll('#f1770-pekerjaan-rows .form1770-dynrow').forEach(function(row) {
                totalNetoPekerjaan += cleanNumber(row.querySelector('.f1770-neto').value);
                totalPphPekerjaan += cleanNumber(row.querySelector('.f1770-pph21').value);
            });
            document.getElementById('f1770-totalNetoPekerjaan').innerText = fmtRpForm1770(totalNetoPekerjaan);
            document.getElementById('f1770-totalPphPekerjaan').innerText = fmtRpForm1770(totalPphPekerjaan);
            document.getElementById('f1770-netoPekerjaan-2').innerText = fmtRpForm1770(totalNetoPekerjaan);

            // Lampiran II-B — Bukti Potong Usaha
            let totalKreditUsaha = 0;
            document.querySelectorAll('#f1770-buktipotong-rows .f1770-nilai').forEach(function(el) { totalKreditUsaha += cleanNumber(el.value); });
            document.getElementById('f1770-totalKreditPajak').innerText = fmtRpForm1770(totalKreditUsaha);

            const kreditPihakLain = totalPphPekerjaan + totalKreditUsaha;
            document.getElementById('f1770-kreditPajak').innerText = fmtRpForm1770(kreditPihakLain);

            // Lampiran III
            let totalPphFinal = 0;
            document.querySelectorAll('#f1770-final-rows .form1770-dynrow').forEach(function(row) {
                const dpp = cleanNumber(row.querySelector('.f1770-dpp').value);
                const tarif = cleanNumber(row.querySelector('.f1770-tarif').value);
                const pphFinal = dpp * (tarif / 100);
                row.querySelector('.f1770-pphfinal-value').innerText = fmtRpForm1770(pphFinal);
                totalPphFinal += pphFinal;
            });
            document.getElementById('f1770-totalPphFinal').innerText = fmtRpForm1770(totalPphFinal);

            let totalBukanObjek = 0;
            document.querySelectorAll('#f1770-bukanobjek-rows .f1770-nilai').forEach(function(el) { totalBukanObjek += cleanNumber(el.value); });
            document.getElementById('f1770-totalBukanObjek').innerText = fmtRpForm1770(totalBukanObjek);

            const infoEl = document.getElementById('f1770-infoFinal');
            if (infoEl) {
                infoEl.innerText = 'Total PPh Final: ' + fmtRpForm1770(totalPphFinal) + ' | Total Bukan Objek Pajak: ' + fmtRpForm1770(totalBukanObjek);
            }

            // Induk
            const netoDNLainnya = cleanNumber(document.getElementById('f1770-netoDNLainnya').value);
            const zakat = cleanNumber(document.getElementById('f1770-zakat').value);
            const jumlahNeto = totalNetoPekerjaan + netoUsaha + netoDNLainnya - zakat;
            document.getElementById('f1770-jumlahNeto').innerText = fmtRpForm1770(jumlahNeto);

            const kompensasiKerugian = cleanNumber(document.getElementById('f1770-kompensasiKerugian').value);
            const netoSetelahKompensasi = jumlahNeto - kompensasiKerugian;
            document.getElementById('f1770-netoSetelahKompensasi').innerText = fmtRpForm1770(netoSetelahKompensasi);

            const ptkpStatus = document.getElementById('f1770-ptkpStatus').value;
            const ptkpValue = ptkpStatus ? TaxEngine.hitungPTKP(ptkpStatus) : 0;
            document.getElementById('f1770-ptkpValue').innerText = fmtRpForm1770(ptkpValue);

            const pkp = Math.max(0, Math.floor((netoSetelahKompensasi - ptkpValue) / 1000) * 1000);
            document.getElementById('f1770-pkp').innerText = fmtRpForm1770(pkp);

            const pphTerutang = TaxEngine.hitungTarifProgresif(pkp);
            document.getElementById('f1770-pphTerutang').innerText = fmtRpForm1770(pphTerutang);

            const angsuranSendiri = cleanNumber(document.getElementById('f1770-angsuranSendiri').value);
            const jumlahKredit = kreditPihakLain + angsuranSendiri;
            document.getElementById('f1770-jumlahKredit').innerText = fmtRpForm1770(jumlahKredit);

            const kblb = pphTerutang - jumlahKredit;
            const kblbLabel = kblb > 0 ? ' (Kurang Bayar)' : (kblb < 0 ? ' (Lebih Bayar)' : ' (Nihil)');
            document.getElementById('f1770-kblb').innerText = fmtRpForm1770(kblb) + kblbLabel;

            const hanyaTeratur = document.getElementById('f1770-hanyaTeratur').value;
            const angsuranPPh25 = hitungAngsuranPPh25(pphTerutang, kreditPihakLain);
            document.getElementById('f1770-angsuranPPh25').innerText = fmtRpForm1770(angsuranPPh25);
            const noteEl = document.getElementById('f1770-angsuranNote');
            if (noteEl) {
                if (hanyaTeratur === 'Ya') noteEl.innerText = 'Karena hanya berpenghasilan teratur, angsuran ini otomatis berlaku sebagai angsuran PPh 25 tahun pajak berikutnya.';
                else if (hanyaTeratur === 'Tidak') noteEl.innerText = 'Karena bukan hanya penghasilan teratur, angsuran ini harus dihitung sendiri (mis. Lampiran perhitungan angsuran) — rumusnya tetap sama, dan Angka 10.b (dibayar sendiri) TIDAK mengurangi dasar perhitungan.';
                else noteEl.innerText = '';
            }

            let totalHarta = 0;
            document.querySelectorAll('#f1770-harta-rows .f1770-nilai').forEach(function(el) { totalHarta += cleanNumber(el.value); });
            document.getElementById('f1770-totalHarta').innerText = fmtRpForm1770(totalHarta);

            let totalUtang = 0;
            document.querySelectorAll('#f1770-utang-rows .f1770-nilai').forEach(function(el) { totalUtang += cleanNumber(el.value); });
            document.getElementById('f1770-totalUtang').innerText = fmtRpForm1770(totalUtang);

            const jumlahKeluarga = document.querySelectorAll('#f1770-keluarga-rows .form1770-dynrow').length;
            document.getElementById('f1770-jumlahKeluarga').innerText = String(jumlahKeluarga);
        }

        function netoUsahaFromInput(inp) {
            if (inp.usahaMode === 'pembukuan') return inp.peredaranBruto - inp.hpp - inp.biayaUsaha;
            if (inp.usahaMode === 'nppn') return inp.nppnBruto * (inp.nppnPersen / 100);
            if (inp.usahaMode === 'rekonsiliasi') return inp.labaKomersial + inp.koreksiPositif.reduce(function(a, b) { return a + b.jumlah; }, 0);
            return 0;
        }

        function checkForm1770Answers() {
            const kasus = form1770State.case;
            const correct = kasus.input;

            const usahaMode = document.getElementById('f1770-usahaMode').value;
            let netoUsahaUser = 0;
            if (usahaMode === 'pembukuan') {
                netoUsahaUser = cleanNumber(document.getElementById('f1770-peredaranBruto').value) - cleanNumber(document.getElementById('f1770-hpp').value) - cleanNumber(document.getElementById('f1770-biayaUsaha').value);
            } else if (usahaMode === 'nppn') {
                netoUsahaUser = cleanNumber(document.getElementById('f1770-nppnBruto').value) * (cleanNumber(document.getElementById('f1770-nppnPersen').value) / 100);
            } else if (usahaMode === 'rekonsiliasi') {
                let totalKoreksiUser = 0;
                document.querySelectorAll('#f1770-koreksipositif-rows .f1770-nilai').forEach(function(el) { totalKoreksiUser += cleanNumber(el.value); });
                netoUsahaUser = cleanNumber(document.getElementById('f1770-labaKomersial').value) + totalKoreksiUser;
            }
            const netoUsahaCorrect = netoUsahaFromInput(correct);

            let totalNetoPekerjaanUser = 0, totalPphPekerjaanUser = 0;
            document.querySelectorAll('#f1770-pekerjaan-rows .form1770-dynrow').forEach(function(row) {
                totalNetoPekerjaanUser += cleanNumber(row.querySelector('.f1770-neto').value);
                totalPphPekerjaanUser += cleanNumber(row.querySelector('.f1770-pph21').value);
            });
            const totalNetoPekerjaanCorrect = correct.pekerjaan.reduce(function(a, p) { return a + p.netoPekerjaan; }, 0);
            const totalPphPekerjaanCorrect = correct.pekerjaan.reduce(function(a, p) { return a + p.pph21Dipotong; }, 0);

            let totalKreditUsahaUser = 0;
            document.querySelectorAll('#f1770-buktipotong-rows .f1770-nilai').forEach(function(el) { totalKreditUsahaUser += cleanNumber(el.value); });
            const totalKreditUsahaCorrect = correct.buktiPotong.reduce(function(a, b) { return a + b.jumlah; }, 0);

            let totalPphFinalUser = 0;
            document.querySelectorAll('#f1770-final-rows .form1770-dynrow').forEach(function(row) {
                const dpp = cleanNumber(row.querySelector('.f1770-dpp').value);
                const tarif = cleanNumber(row.querySelector('.f1770-tarif').value);
                totalPphFinalUser += dpp * (tarif / 100);
            });
            const totalPphFinalCorrect = correct.penghasilanFinal.reduce(function(a, f) { return a + f.pphFinal; }, 0);

            let totalBukanObjekUser = 0;
            document.querySelectorAll('#f1770-bukanobjek-rows .f1770-nilai').forEach(function(el) { totalBukanObjekUser += cleanNumber(el.value); });
            const totalBukanObjekCorrect = correct.penghasilanBukanObjek.reduce(function(a, b) { return a + b.jumlah; }, 0);

            let totalHartaUser = 0;
            document.querySelectorAll('#f1770-harta-rows .f1770-nilai').forEach(function(el) { totalHartaUser += cleanNumber(el.value); });
            let totalUtangUser = 0;
            document.querySelectorAll('#f1770-utang-rows .f1770-nilai').forEach(function(el) { totalUtangUser += cleanNumber(el.value); });
            const jumlahKeluargaUser = document.querySelectorAll('#f1770-keluarga-rows .form1770-dynrow').length;

            const correctTotalHarta = correct.harta.reduce(function(a, h) { return a + h.nilai; }, 0);
            const correctTotalUtang = correct.utang.reduce(function(a, u) { return a + u.nilai; }, 0);
            const correctJumlahKeluarga = correct.susunanKeluarga.length;

            const netoDNLainnyaUser = cleanNumber(document.getElementById('f1770-netoDNLainnya').value);
            const zakatUser = cleanNumber(document.getElementById('f1770-zakat').value);
            const kompensasiUser = cleanNumber(document.getElementById('f1770-kompensasiKerugian').value);
            const angsuranSendiriUser = cleanNumber(document.getElementById('f1770-angsuranSendiri').value);
            const ptkpStatusUser = document.getElementById('f1770-ptkpStatus').value;
            const hanyaTeraturUser = document.getElementById('f1770-hanyaTeratur').value;

            const kreditPihakLainUser = totalPphPekerjaanUser + totalKreditUsahaUser;
            const jumlahNetoUser = totalNetoPekerjaanUser + netoUsahaUser + netoDNLainnyaUser - zakatUser;
            const netoSetelahKompensasiUser = jumlahNetoUser - kompensasiUser;
            const ptkpValueUser = ptkpStatusUser ? TaxEngine.hitungPTKP(ptkpStatusUser) : 0;
            const pkpUser = Math.max(0, Math.floor((netoSetelahKompensasiUser - ptkpValueUser) / 1000) * 1000);
            const pphTerutangUser = TaxEngine.hitungTarifProgresif(pkpUser);
            const jumlahKreditUser = kreditPihakLainUser + angsuranSendiriUser;
            const kblbUser = pphTerutangUser - jumlahKreditUser;
            const angsuranPPh25User = hitungAngsuranPPh25(pphTerutangUser, kreditPihakLainUser);

            const kreditPihakLainCorrect = totalPphPekerjaanCorrect + totalKreditUsahaCorrect;
            const jumlahNetoCorrect = totalNetoPekerjaanCorrect + netoUsahaCorrect + correct.netoDNLainnya - correct.zakat;
            const netoSetelahKompensasiCorrect = jumlahNetoCorrect - correct.kompensasiKerugian;
            const ptkpValueCorrect = TaxEngine.hitungPTKP(correct.ptkpStatus);
            const pkpCorrect = Math.max(0, Math.floor((netoSetelahKompensasiCorrect - ptkpValueCorrect) / 1000) * 1000);
            const pphTerutangCorrect = TaxEngine.hitungTarifProgresif(pkpCorrect);
            const jumlahKreditCorrect = kreditPihakLainCorrect + correct.angsuranSendiri;
            const kblbCorrect = pphTerutangCorrect - jumlahKreditCorrect;
            const angsuranPPh25Correct = hitungAngsuranPPh25(pphTerutangCorrect, kreditPihakLainCorrect);

            const checks = [
                { label: 'Penghasilan Neto dari Pekerjaan — 1.a (Lampiran II-A)', ok: totalNetoPekerjaanUser === totalNetoPekerjaanCorrect, correctVal: fmtRpForm1770(totalNetoPekerjaanCorrect) },
                { label: 'PPh 21 Dipotong Pemberi Kerja (Lampiran II-A)', ok: totalPphPekerjaanUser === totalPphPekerjaanCorrect, correctVal: fmtRpForm1770(totalPphPekerjaanCorrect) },
                { label: 'Penghasilan Neto dari Usaha/Pekerjaan Bebas — 1.b (Lampiran I)', ok: netoUsahaUser === netoUsahaCorrect, correctVal: fmtRpForm1770(netoUsahaCorrect) },
                { label: 'Total Kredit Pajak Bukti Potong Usaha (Lampiran II-B)', ok: totalKreditUsahaUser === totalKreditUsahaCorrect, correctVal: fmtRpForm1770(totalKreditUsahaCorrect) },
                { label: 'Total PPh Final (Lampiran III-A)', ok: totalPphFinalUser === totalPphFinalCorrect, correctVal: fmtRpForm1770(totalPphFinalCorrect) },
                { label: 'Total Bukan Objek Pajak (Lampiran III-B)', ok: totalBukanObjekUser === totalBukanObjekCorrect, correctVal: fmtRpForm1770(totalBukanObjekCorrect) },
                { label: 'Penghasilan Neto DN Lainnya — Angka 2 (Induk)', ok: netoDNLainnyaUser === correct.netoDNLainnya, correctVal: fmtRpForm1770(correct.netoDNLainnya) },
                { label: 'Zakat/Sumbangan Wajib Keagamaan — Angka 3 (Induk)', ok: zakatUser === correct.zakat, correctVal: fmtRpForm1770(correct.zakat) },
                { label: 'Kompensasi Kerugian — Angka 5 (Induk)', ok: kompensasiUser === correct.kompensasiKerugian, correctVal: fmtRpForm1770(correct.kompensasiKerugian) },
                { label: 'Status PTKP — Angka 7 (Induk)', ok: ptkpStatusUser === correct.ptkpStatus, correctVal: correct.ptkpStatus },
                { label: 'PPh Dibayar Sendiri — Angka 10.b (Induk)', ok: angsuranSendiriUser === correct.angsuranSendiri, correctVal: fmtRpForm1770(correct.angsuranSendiri) },
                { label: 'Hanya Menerima Penghasilan Teratur? — Angka 13 (Induk)', ok: hanyaTeraturUser === correct.hanyaTeratur, correctVal: correct.hanyaTeratur },
                { label: 'Angsuran PPh 25 Tahun Berikutnya — Angka 13.a (Induk)', ok: angsuranPPh25User === angsuranPPh25Correct, correctVal: fmtRpForm1770(angsuranPPh25Correct) },
                { label: 'Total Harta (Lampiran IV)', ok: totalHartaUser === correctTotalHarta, correctVal: fmtRpForm1770(correctTotalHarta) },
                { label: 'Total Utang (Lampiran IV)', ok: totalUtangUser === correctTotalUtang, correctVal: fmtRpForm1770(correctTotalUtang) },
                { label: 'Jumlah Anggota Keluarga (Lampiran IV)', ok: jumlahKeluargaUser === correctJumlahKeluarga, correctVal: String(correctJumlahKeluarga) + ' orang' },
                { label: 'PPh Kurang/Lebih Bayar — Angka 12 (hasil akhir Induk)', ok: kblbUser === kblbCorrect, correctVal: fmtRpForm1770(kblbCorrect) }
            ];

            renderForm1770FamilyResult(checks, '1770 (Isi Formulir Lengkap)', 'form');
        }

        // Fungsi hasil pengecekan bersama — dipakai oleh 1770, 1770SS, dan 1770S supaya
        // tampilan skor/kategori/XP/penjelasan konsisten di ketiga formulir.
        function renderForm1770FamilyResult(checks, moduleLabel, mode) {
            const correctCount = checks.filter(function(c) { return c.ok; }).length;
            const score = Math.round((correctCount / checks.length) * 100);

            let category = "", color = "";
            if (score >= 90) { category = "Sangat Baik"; color = "var(--success)"; }
            else if (score >= 70) { category = "Baik"; color = "var(--info)"; }
            else if (score >= 50) { category = "Cukup"; color = "var(--warning)"; }
            else { category = "Kurang"; color = "var(--danger)"; }

            const circle = document.getElementById('result-score');
            circle.innerText = score;
            circle.style.borderColor = color;
            circle.style.color = color;
            document.getElementById('result-category').innerText = category;

            const xpGain = Math.round(score * 1.5);
            document.getElementById('result-xp-gain').innerText = `+${xpGain} XP Diperoleh!`;

            let explHtml = `<strong>Rincian Pengecekan Formulir (${checks.length} titik cek):</strong><ul>`;
            checks.forEach(function(c) {
                explHtml += '<li>' + (c.ok ? '✅' : '❌') + ' ' + c.label + (c.ok ? '' : ' — seharusnya: <strong>' + c.correctVal + '</strong>') + '</li>';
            });
            explHtml += '</ul>';
            document.getElementById('result-explanation').innerHTML = explHtml;

            appState.user.xp += xpGain;
            appState.user.history.push({
                date: new Date().toLocaleDateString('id-ID'),
                module: moduleLabel,
                mode: mode,
                score: score
            });
            saveData();
            updateProfileUI();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-result').classList.add('active');
            document.getElementById('page-title').innerText = "Laporan Simulasi";
            document.getElementById('page-subtitle').innerText = "Evaluasi hasil pengisian formulir " + moduleLabel + " Anda.";
        }

        // Form1770SSCases dipindah ke js/data/kasus-spt.js (dimuat sebelum file ini di index.html) —
        // lihat komentar di file tersebut. Variabel global `Form1770SSCases` tetap sama seperti sebelumnya.

        let form1770SSState = { case: null };

        function biayaJabatanOtomatis(bruto) {
            return Math.min(Math.round(bruto * 0.05), 6000000);
        }

        function openForm1770SS(caseId) {
            const kasus = caseId ? Form1770SSCases.find(function(c) { return c.id === caseId; }) : Form1770SSCases[Math.floor(Math.random() * Form1770SSCases.length)];
            if (!kasus) { alert('Kasus tidak ditemukan.'); return; }
            form1770SSState = { case: kasus };

            document.getElementById('f1770ss-title').innerText = kasus.title;
            document.getElementById('f1770ss-narrative').innerText = kasus.narrative;

            ['bruto','biayaJabatan','pphDipotong','totalHarta','totalUtang'].forEach(function(id) {
                const el = document.getElementById('f1770ss-' + id);
                if (el) el.value = '';
            });
            document.getElementById('f1770ss-ptkpStatus').value = '';

            recalcForm1770SS();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-form1770ss').classList.add('active');
            document.getElementById('page-title').innerText = 'Isi Formulir SPT 1770 SS';
            document.getElementById('page-subtitle').innerText = 'Isi seperti formulir asli — sesuai Bukti Potong 1721-A1/A2.';
        }

        function openForm1770SSRandom() {
            const gen = CaseGenerator.generateForm1770SS();
            Form1770SSCases.push(gen);
            openForm1770SS(gen.id);
        }

        function recalcForm1770SS() {
            const bruto = cleanNumber(document.getElementById('f1770ss-bruto').value);
            const biayaJabatan = cleanNumber(document.getElementById('f1770ss-biayaJabatan').value);
            const neto = Math.max(0, bruto - biayaJabatan);
            document.getElementById('f1770ss-neto').innerText = fmtRpForm1770(neto);

            const ptkpStatus = document.getElementById('f1770ss-ptkpStatus').value;
            const ptkpValue = ptkpStatus ? TaxEngine.hitungPTKP(ptkpStatus) : 0;
            document.getElementById('f1770ss-ptkpValue').innerText = fmtRpForm1770(ptkpValue);

            const pkp = Math.max(0, Math.floor((neto - ptkpValue) / 1000) * 1000);
            document.getElementById('f1770ss-pkp').innerText = fmtRpForm1770(pkp);

            const pphTerutang = TaxEngine.hitungTarifProgresif(pkp);
            document.getElementById('f1770ss-pphTerutang').innerText = fmtRpForm1770(pphTerutang);

            const pphDipotong = cleanNumber(document.getElementById('f1770ss-pphDipotong').value);
            const kblb = pphTerutang - pphDipotong;
            const kblbLabel = kblb > 0 ? ' (Kurang Bayar)' : (kblb < 0 ? ' (Lebih Bayar)' : ' (Nihil)');
            document.getElementById('f1770ss-kblb').innerText = fmtRpForm1770(kblb) + kblbLabel;
        }

        function checkForm1770SSAnswers() {
            const kasus = form1770SSState.case;
            const correct = kasus.input;

            const brutoUser = cleanNumber(document.getElementById('f1770ss-bruto').value);
            const biayaJabatanUser = cleanNumber(document.getElementById('f1770ss-biayaJabatan').value);
            const ptkpStatusUser = document.getElementById('f1770ss-ptkpStatus').value;
            const pphDipotongUser = cleanNumber(document.getElementById('f1770ss-pphDipotong').value);
            const totalHartaUser = cleanNumber(document.getElementById('f1770ss-totalHarta').value);
            const totalUtangUser = cleanNumber(document.getElementById('f1770ss-totalUtang').value);

            const netoUser = Math.max(0, brutoUser - biayaJabatanUser);
            const ptkpValueUser = ptkpStatusUser ? TaxEngine.hitungPTKP(ptkpStatusUser) : 0;
            const pkpUser = Math.max(0, Math.floor((netoUser - ptkpValueUser) / 1000) * 1000);
            const pphTerutangUser = TaxEngine.hitungTarifProgresif(pkpUser);
            const kblbUser = pphTerutangUser - pphDipotongUser;

            const correctBiayaJabatan = biayaJabatanOtomatis(correct.bruto);
            const netoCorrect = Math.max(0, correct.bruto - correctBiayaJabatan);
            const ptkpValueCorrect = TaxEngine.hitungPTKP(correct.ptkpStatus);
            const pkpCorrect = Math.max(0, Math.floor((netoCorrect - ptkpValueCorrect) / 1000) * 1000);
            const pphTerutangCorrect = TaxEngine.hitungTarifProgresif(pkpCorrect);
            const kblbCorrect = pphTerutangCorrect - correct.pphDipotong;

            const checks = [
                { label: 'Penghasilan Bruto — Angka 1', ok: brutoUser === correct.bruto, correctVal: fmtRpForm1770(correct.bruto) },
                { label: 'Pengurang (Biaya Jabatan, maks. Rp 500.000/bulan) — Angka 2', ok: biayaJabatanUser === correctBiayaJabatan, correctVal: fmtRpForm1770(correctBiayaJabatan) },
                { label: 'Status PTKP — Angka 4', ok: ptkpStatusUser === correct.ptkpStatus, correctVal: correct.ptkpStatus },
                { label: 'PPh Dipotong Pemberi Kerja — Angka 7', ok: pphDipotongUser === correct.pphDipotong, correctVal: fmtRpForm1770(correct.pphDipotong) },
                { label: 'Total Harta — Bagian B', ok: totalHartaUser === correct.totalHarta, correctVal: fmtRpForm1770(correct.totalHarta) },
                { label: 'Total Kewajiban/Utang — Bagian B', ok: totalUtangUser === correct.totalUtang, correctVal: fmtRpForm1770(correct.totalUtang) },
                { label: 'PPh Kurang/Lebih Bayar — Angka 8 (hasil akhir)', ok: kblbUser === kblbCorrect, correctVal: fmtRpForm1770(kblbCorrect) }
            ];

            renderForm1770FamilyResult(checks, '1770 SS (Isi Formulir)', 'form');
        }

        function downloadForm1770SSPDF() {
            const source = document.getElementById('view-form1770ss');
            if (!source) { alert('❌ Area formulir tidak ditemukan.'); return; }
            if (!window.PDFExport) { alert('❌ Mesin PDF tidak tersedia. Coba muat ulang halaman.'); return; }
            const titleEl = document.getElementById('f1770ss-title');
            const caseName = titleEl ? titleEl.innerText.trim() : 'Kasus';
            const filename = `Formulir_1770SS_${caseName.replace(/[^a-zA-Z0-9]+/g, '_') || 'Kasus'}.pdf`;
            window.PDFExport.exportElementToPDF(source, {
                filename, widthPx: 780, scale: 2,
                onClone: function(clone) {
                    const liveFields = source.querySelectorAll('input, select, textarea');
                    const cloneFields = clone.querySelectorAll('input, select, textarea');
                    liveFields.forEach(function(liveEl, i) {
                        const cloneEl = cloneFields[i];
                        if (!cloneEl) return;
                        let text;
                        if (liveEl.tagName === 'SELECT') {
                            const opt = liveEl.options[liveEl.selectedIndex];
                            text = opt ? opt.textContent.trim() : '';
                        } else {
                            text = (liveEl.value || '').trim();
                        }
                        const span = document.createElement('span');
                        span.textContent = text || '—';
                        span.style.cssText = 'display:inline-block;padding:4px 6px;border-bottom:1px solid #94a3b8;min-width:60px;font-size:9.5pt;';
                        cloneEl.replaceWith(span);
                    });
                    clone.style.boxShadow = 'none';
                    clone.style.padding = '14px';
                    clone.querySelectorAll('.form1770-sheet').forEach(function(el) {
                        el.style.boxShadow = 'none';
                        el.style.border = '1px solid #cbd5e1';
                        el.style.marginBottom = '14px';
                    });
                }
            }).catch(function(err) {
                console.error('[downloadForm1770SSPDF]', err);
                alert('❌ ' + (err.message || 'Gagal membuat PDF formulir.'));
            });
        }

        // Form1770SCases dipindah ke js/data/kasus-spt.js (dimuat sebelum file ini di index.html) —
        // lihat komentar di file tersebut. Variabel global `Form1770SCases` tetap sama seperti sebelumnya.

        let form1770SState = { case: null, pekerjaanCounter: 0, dnCounter: 0, finalCounter: 0, bukanObjekCounter: 0, hartaCounter: 0, utangCounter: 0, keluargaCounter: 0 };

        function openForm1770S(caseId) {
            const kasus = caseId ? Form1770SCases.find(function(c) { return c.id === caseId; }) : Form1770SCases[Math.floor(Math.random() * Form1770SCases.length)];
            if (!kasus) { alert('Kasus tidak ditemukan.'); return; }
            form1770SState = { case: kasus, pekerjaanCounter: 0, dnCounter: 0, finalCounter: 0, bukanObjekCounter: 0, hartaCounter: 0, utangCounter: 0, keluargaCounter: 0 };

            document.getElementById('f1770s-title').innerText = kasus.title;
            document.getElementById('f1770s-narrative').innerText = kasus.narrative;

            ['zakat','netoLN'].forEach(function(id) {
                const el = document.getElementById('f1770s-' + id);
                if (el) el.value = '';
            });
            document.getElementById('f1770s-ptkpStatus').value = '';
            ['pekerjaan','dnlainnya','final','bukanobjek','harta','utang','keluarga'].forEach(function(key) {
                document.getElementById('f1770s-' + key + '-rows').innerHTML = '';
            });

            switchForm1770STab(1);
            recalcForm1770S();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-form1770s').classList.add('active');
            document.getElementById('page-title').innerText = 'Isi Formulir SPT 1770 S';
            document.getElementById('page-subtitle').innerText = 'Isi seperti formulir asli — baca kasus, lalu isi tiap lampiran.';
        }

        function openForm1770SRandom() {
            const gen = CaseGenerator.generateForm1770S();
            Form1770SCases.push(gen);
            openForm1770S(gen.id);
        }

        function switchForm1770STab(tabNum) {
            [1, 2, 3, 4].forEach(function(n) {
                document.getElementById('f1770s-tab-' + n).style.display = (n === tabNum) ? 'block' : 'none';
                document.getElementById('f1770s-tabbtn-' + n).classList.toggle('active', n === tabNum);
            });
        }

        // ---- Lampiran I-A: Bukti Potong Pekerjaan ----
        function addPekerjaanRowS(pemberiKerja, npwp, noBukti, netoPekerjaan, pph21Dipotong) {
            form1770SState.pekerjaanCounter++;
            const rowId = 'f1770s-pekerjaan-row-' + form1770SState.pekerjaanCounter;
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama Pemberi Kerja" value="' + (pemberiKerja ? escapeHTML(pemberiKerja) : '') + '">' +
                '<input type="text" class="f1770-w-md" placeholder="NPWP Pemberi Kerja" value="' + (npwp ? escapeHTML(npwp) : '') + '">' +
                '<input type="text" class="f1770-w-md" placeholder="No. Bukti Potong 1721-A1" value="' + (noBukti ? escapeHTML(noBukti) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-neto" placeholder="Penghasilan Neto (Rp)" value="' + (netoPekerjaan !== undefined ? escapeHTML(String(netoPekerjaan)) : '') + '" oninput="recalcForm1770S()">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-pph21" placeholder="PPh 21 Dipotong (Rp)" value="' + (pph21Dipotong !== undefined ? escapeHTML(String(pph21Dipotong)) : '') + '" oninput="recalcForm1770S()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770S();">×</button>';
            document.getElementById('f1770s-pekerjaan-rows').appendChild(div);
            recalcForm1770S();
        }

        // ---- Lampiran I-B: Penghasilan DN Lainnya ----
        function addDNLainnyaRowS(jenis, jumlah) {
            form1770SState.dnCounter++;
            const rowId = 'f1770s-dn-row-' + form1770SState.dnCounter;
            const jenisOptions = ['Bunga (non-final)', 'Royalti', 'Sewa (non-final)', 'Penghargaan', 'Honorarium', 'Keuntungan Pengalihan Harta', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Penghasilan</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenis ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<select class="f1770-w-lg">' + optionsHtml + '</select>' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1770S()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770S();">×</button>';
            document.getElementById('f1770s-dnlainnya-rows').appendChild(div);
            recalcForm1770S();
        }

        // ---- Lampiran I-C: Penghasilan Final ----
        function addFinalRowS(jenis, dpp, tarif) {
            form1770SState.finalCounter++;
            const rowId = 'f1770s-final-row-' + form1770SState.finalCounter;
            const jenisOptions = ['Bunga Deposito/Tabungan', 'Sewa Tanah/Bangunan', 'Bunga/Diskonto Obligasi', 'Hadiah Undian', 'Pengalihan Hak Tanah/Bangunan', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Penghasilan Final</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenis ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<select class="f1770-w-lg">' + optionsHtml + '</select>' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-dpp" placeholder="DPP (Rp)" value="' + (dpp !== undefined ? escapeHTML(String(dpp)) : '') + '" oninput="recalcForm1770S()">' +
                '<input type="text" inputmode="numeric" class="f1770-w-sm f1770-tarif" placeholder="Tarif %" value="' + (tarif !== undefined ? escapeHTML(String(tarif)) : '') + '" oninput="recalcForm1770S()">' +
                '<div class="f1770-computed-inline f1770-pphfinal-value">Rp 0</div>' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770S();">×</button>';
            document.getElementById('f1770s-final-rows').appendChild(div);
            recalcForm1770S();
        }

        // ---- Lampiran I-C: Penghasilan Bukan Objek ----
        function addBukanObjekRowS(jenis, jumlah) {
            form1770SState.bukanObjekCounter++;
            const rowId = 'f1770s-bo-row-' + form1770SState.bukanObjekCounter;
            const jenisOptions = ['Warisan', 'Bantuan/Sumbangan/Hibah', 'Klaim Asuransi', 'Beasiswa', 'Natura/Kenikmatan yang Dikecualikan', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Penghasilan</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenis ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<select class="f1770-w-lg">' + optionsHtml + '</select>' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1770S()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770S();">×</button>';
            document.getElementById('f1770s-bukanobjek-rows').appendChild(div);
            recalcForm1770S();
        }

        // ---- Lampiran II: Harta ----
        function addHartaRowS(jenis, tahun, nilai) {
            form1770SState.hartaCounter++;
            const rowId = 'f1770s-harta-row-' + form1770SState.hartaCounter;
            const div = document.createElement('div');
            div.className = 'form1770-harta-row';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-jenis" placeholder="Jenis harta (mis. Rumah, Mobil)" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-tahun" placeholder="Th. Peroleh" value="' + (tahun !== undefined ? escapeHTML(String(tahun)) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-nilai" placeholder="Nilai (Rp)" value="' + (nilai !== undefined ? escapeHTML(String(nilai)) : '') + '" oninput="recalcForm1770S()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770S();">×</button>';
            document.getElementById('f1770s-harta-rows').appendChild(div);
            recalcForm1770S();
        }

        // ---- Lampiran II: Utang ----
        function addUtangRowS(jenis, nilai) {
            form1770SState.utangCounter++;
            const rowId = 'f1770s-utang-row-' + form1770SState.utangCounter;
            const div = document.createElement('div');
            div.className = 'form1770-utang-row';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-jenis" placeholder="Jenis utang (mis. KPR, Kredit)" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-nilai" placeholder="Nilai (Rp)" value="' + (nilai !== undefined ? escapeHTML(String(nilai)) : '') + '" oninput="recalcForm1770S()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770S();">×</button>';
            document.getElementById('f1770s-utang-rows').appendChild(div);
            recalcForm1770S();
        }

        // ---- Lampiran II: Susunan Anggota Keluarga ----
        function addKeluargaRowS(nama, hubungan, pekerjaan) {
            form1770SState.keluargaCounter++;
            const rowId = 'f1770s-kel-row-' + form1770SState.keluargaCounter;
            const hubunganOptions = ['Kepala Keluarga', 'Suami/Istri', 'Anak Kandung', 'Anak Angkat', 'Orang Tua', 'Mertua', 'Anggota Keluarga Lain'];
            let optionsHtml = '<option value="">Hubungan Keluarga</option>';
            hubunganOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === hubungan ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama" value="' + (nama ? escapeHTML(nama) : '') + '">' +
                '<select class="f1770-w-md">' + optionsHtml + '</select>' +
                '<input type="text" class="f1770-w-md" placeholder="Pekerjaan" value="' + (pekerjaan ? escapeHTML(pekerjaan) : '') + '">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1770S();">×</button>';
            document.getElementById('f1770s-keluarga-rows').appendChild(div);
            recalcForm1770S();
        }

        function recalcForm1770S() {
            let totalNetoPekerjaan = 0, totalPphPekerjaan = 0;
            document.querySelectorAll('#f1770s-pekerjaan-rows .form1770-dynrow').forEach(function(row) {
                totalNetoPekerjaan += cleanNumber(row.querySelector('.f1770-neto').value);
                totalPphPekerjaan += cleanNumber(row.querySelector('.f1770-pph21').value);
            });
            document.getElementById('f1770s-totalNetoPekerjaan').innerText = fmtRpForm1770(totalNetoPekerjaan);
            document.getElementById('f1770s-totalPphPekerjaan').innerText = fmtRpForm1770(totalPphPekerjaan);
            document.getElementById('f1770s-netoPekerjaan-2').innerText = fmtRpForm1770(totalNetoPekerjaan);
            document.getElementById('f1770s-kreditPajak').innerText = fmtRpForm1770(totalPphPekerjaan);

            let totalDNLainnya = 0;
            document.querySelectorAll('#f1770s-dnlainnya-rows .f1770-nilai').forEach(function(el) { totalDNLainnya += cleanNumber(el.value); });
            document.getElementById('f1770s-totalDNLainnya').innerText = fmtRpForm1770(totalDNLainnya);
            document.getElementById('f1770s-netoDNLainnya-2').innerText = fmtRpForm1770(totalDNLainnya);

            let totalPphFinal = 0;
            document.querySelectorAll('#f1770s-final-rows .form1770-dynrow').forEach(function(row) {
                const dpp = cleanNumber(row.querySelector('.f1770-dpp').value);
                const tarif = cleanNumber(row.querySelector('.f1770-tarif').value);
                const pphFinal = dpp * (tarif / 100);
                row.querySelector('.f1770-pphfinal-value').innerText = fmtRpForm1770(pphFinal);
                totalPphFinal += pphFinal;
            });
            document.getElementById('f1770s-totalPphFinal').innerText = fmtRpForm1770(totalPphFinal);

            let totalBukanObjek = 0;
            document.querySelectorAll('#f1770s-bukanobjek-rows .f1770-nilai').forEach(function(el) { totalBukanObjek += cleanNumber(el.value); });
            document.getElementById('f1770s-totalBukanObjek').innerText = fmtRpForm1770(totalBukanObjek);

            const infoEl = document.getElementById('f1770s-infoFinal');
            if (infoEl) {
                infoEl.innerText = 'Total PPh Final: ' + fmtRpForm1770(totalPphFinal) + ' | Total Bukan Objek Pajak: ' + fmtRpForm1770(totalBukanObjek);
            }

            const netoLN = cleanNumber(document.getElementById('f1770s-netoLN').value);
            const jumlahNeto = totalNetoPekerjaan + totalDNLainnya + netoLN;
            document.getElementById('f1770s-jumlahNeto').innerText = fmtRpForm1770(jumlahNeto);

            const zakat = cleanNumber(document.getElementById('f1770s-zakat').value);
            const netoSetelahPengurang = jumlahNeto - zakat;
            document.getElementById('f1770s-netoSetelahPengurang').innerText = fmtRpForm1770(netoSetelahPengurang);

            const ptkpStatus = document.getElementById('f1770s-ptkpStatus').value;
            const ptkpValue = ptkpStatus ? TaxEngine.hitungPTKP(ptkpStatus) : 0;
            document.getElementById('f1770s-ptkpValue').innerText = fmtRpForm1770(ptkpValue);

            const pkp = Math.max(0, Math.floor((netoSetelahPengurang - ptkpValue) / 1000) * 1000);
            document.getElementById('f1770s-pkp').innerText = fmtRpForm1770(pkp);

            const pphTerutang = TaxEngine.hitungTarifProgresif(pkp);
            document.getElementById('f1770s-pphTerutang').innerText = fmtRpForm1770(pphTerutang);

            const kblb = pphTerutang - totalPphPekerjaan;
            const kblbLabel = kblb > 0 ? ' (Kurang Bayar)' : (kblb < 0 ? ' (Lebih Bayar)' : ' (Nihil)');
            document.getElementById('f1770s-kblb').innerText = fmtRpForm1770(kblb) + kblbLabel;

            document.getElementById('f1770s-angsuranPPh25').innerText = fmtRpForm1770(hitungAngsuranPPh25(pphTerutang, totalPphPekerjaan));

            let totalHarta = 0;
            document.querySelectorAll('#f1770s-harta-rows .f1770-nilai').forEach(function(el) { totalHarta += cleanNumber(el.value); });
            document.getElementById('f1770s-totalHarta').innerText = fmtRpForm1770(totalHarta);

            let totalUtang = 0;
            document.querySelectorAll('#f1770s-utang-rows .f1770-nilai').forEach(function(el) { totalUtang += cleanNumber(el.value); });
            document.getElementById('f1770s-totalUtang').innerText = fmtRpForm1770(totalUtang);

            const jumlahKeluarga = document.querySelectorAll('#f1770s-keluarga-rows .form1770-dynrow').length;
            document.getElementById('f1770s-jumlahKeluarga').innerText = String(jumlahKeluarga);
        }

        function checkForm1770SAnswers() {
            const kasus = form1770SState.case;
            const correct = kasus.input;

            let totalNetoPekerjaanUser = 0, totalPphPekerjaanUser = 0;
            document.querySelectorAll('#f1770s-pekerjaan-rows .form1770-dynrow').forEach(function(row) {
                totalNetoPekerjaanUser += cleanNumber(row.querySelector('.f1770-neto').value);
                totalPphPekerjaanUser += cleanNumber(row.querySelector('.f1770-pph21').value);
            });
            const totalNetoPekerjaanCorrect = correct.pekerjaan.reduce(function(a, p) { return a + p.netoPekerjaan; }, 0);
            const totalPphPekerjaanCorrect = correct.pekerjaan.reduce(function(a, p) { return a + p.pph21Dipotong; }, 0);

            let totalDNLainnyaUser = 0;
            document.querySelectorAll('#f1770s-dnlainnya-rows .f1770-nilai').forEach(function(el) { totalDNLainnyaUser += cleanNumber(el.value); });
            const totalDNLainnyaCorrect = correct.dnLainnya.reduce(function(a, d) { return a + d.jumlah; }, 0);

            let totalPphFinalUser = 0;
            document.querySelectorAll('#f1770s-final-rows .form1770-dynrow').forEach(function(row) {
                const dpp = cleanNumber(row.querySelector('.f1770-dpp').value);
                const tarif = cleanNumber(row.querySelector('.f1770-tarif').value);
                totalPphFinalUser += dpp * (tarif / 100);
            });
            const totalPphFinalCorrect = correct.penghasilanFinal.reduce(function(a, f) { return a + f.pphFinal; }, 0);

            let totalBukanObjekUser = 0;
            document.querySelectorAll('#f1770s-bukanobjek-rows .f1770-nilai').forEach(function(el) { totalBukanObjekUser += cleanNumber(el.value); });
            const totalBukanObjekCorrect = correct.penghasilanBukanObjek.reduce(function(a, b) { return a + b.jumlah; }, 0);

            let totalHartaUser = 0;
            document.querySelectorAll('#f1770s-harta-rows .f1770-nilai').forEach(function(el) { totalHartaUser += cleanNumber(el.value); });
            let totalUtangUser = 0;
            document.querySelectorAll('#f1770s-utang-rows .f1770-nilai').forEach(function(el) { totalUtangUser += cleanNumber(el.value); });
            const jumlahKeluargaUser = document.querySelectorAll('#f1770s-keluarga-rows .form1770-dynrow').length;

            const correctTotalHarta = correct.harta.reduce(function(a, h) { return a + h.nilai; }, 0);
            const correctTotalUtang = correct.utang.reduce(function(a, u) { return a + u.nilai; }, 0);
            const correctJumlahKeluarga = correct.susunanKeluarga.length;

            const zakatUser = cleanNumber(document.getElementById('f1770s-zakat').value);
            const netoLNUser = cleanNumber(document.getElementById('f1770s-netoLN').value);
            const ptkpStatusUser = document.getElementById('f1770s-ptkpStatus').value;

            const jumlahNetoUser = totalNetoPekerjaanUser + totalDNLainnyaUser + netoLNUser;
            const netoSetelahPengurangUser = jumlahNetoUser - zakatUser;
            const ptkpValueUser = ptkpStatusUser ? TaxEngine.hitungPTKP(ptkpStatusUser) : 0;
            const pkpUser = Math.max(0, Math.floor((netoSetelahPengurangUser - ptkpValueUser) / 1000) * 1000);
            const pphTerutangUser = TaxEngine.hitungTarifProgresif(pkpUser);
            const kblbUser = pphTerutangUser - totalPphPekerjaanUser;

            const jumlahNetoCorrect = totalNetoPekerjaanCorrect + totalDNLainnyaCorrect + correct.netoLN;
            const netoSetelahPengurangCorrect = jumlahNetoCorrect - correct.zakat;
            const ptkpValueCorrect = TaxEngine.hitungPTKP(correct.ptkpStatus);
            const pkpCorrect = Math.max(0, Math.floor((netoSetelahPengurangCorrect - ptkpValueCorrect) / 1000) * 1000);
            const pphTerutangCorrect = TaxEngine.hitungTarifProgresif(pkpCorrect);
            const kblbCorrect = pphTerutangCorrect - totalPphPekerjaanCorrect;

            const checks = [
                { label: 'Penghasilan Neto dari Pekerjaan — Angka 1 (Lampiran I-A)', ok: totalNetoPekerjaanUser === totalNetoPekerjaanCorrect, correctVal: fmtRpForm1770(totalNetoPekerjaanCorrect) },
                { label: 'PPh 21 Dipotong Pemberi Kerja (Lampiran I-A)', ok: totalPphPekerjaanUser === totalPphPekerjaanCorrect, correctVal: fmtRpForm1770(totalPphPekerjaanCorrect) },
                { label: 'Penghasilan Neto DN Lainnya — Angka 2 (Lampiran I-B)', ok: totalDNLainnyaUser === totalDNLainnyaCorrect, correctVal: fmtRpForm1770(totalDNLainnyaCorrect) },
                { label: 'Total PPh Final (Lampiran I-C)', ok: totalPphFinalUser === totalPphFinalCorrect, correctVal: fmtRpForm1770(totalPphFinalCorrect) },
                { label: 'Total Bukan Objek Pajak (Lampiran I-C)', ok: totalBukanObjekUser === totalBukanObjekCorrect, correctVal: fmtRpForm1770(totalBukanObjekCorrect) },
                { label: 'Zakat/Sumbangan Wajib Keagamaan — Angka 5 (Induk)', ok: zakatUser === correct.zakat, correctVal: fmtRpForm1770(correct.zakat) },
                { label: 'Status PTKP — Angka 7 (Induk)', ok: ptkpStatusUser === correct.ptkpStatus, correctVal: correct.ptkpStatus },
                { label: 'Total Harta (Lampiran II)', ok: totalHartaUser === correctTotalHarta, correctVal: fmtRpForm1770(correctTotalHarta) },
                { label: 'Total Utang (Lampiran II)', ok: totalUtangUser === correctTotalUtang, correctVal: fmtRpForm1770(correctTotalUtang) },
                { label: 'Jumlah Anggota Keluarga (Lampiran II)', ok: jumlahKeluargaUser === correctJumlahKeluarga, correctVal: String(correctJumlahKeluarga) + ' orang' },
                { label: 'PPh Kurang/Lebih Bayar — Angka 11 (hasil akhir Induk)', ok: kblbUser === kblbCorrect, correctVal: fmtRpForm1770(kblbCorrect) }
            ];

            renderForm1770FamilyResult(checks, '1770 S (Isi Formulir)', 'form');
        }

        function downloadForm1770SPDF() { downloadFormPDF('view-form1770s', 'f1770s', 4, '1770S'); }

        // Form1771Cases dipindah ke js/data/kasus-spt.js (dimuat sebelum file ini di index.html) —
        // lihat komentar di file tersebut. Variabel global `Form1771Cases` tetap sama seperti sebelumnya.

                let form1771State = { case: null, kpCounter: 0, posCounter: 0, negCounter: 0, finalCounter: 0, bukanObjekCounter: 0, sahamCounter: 0, pengurusCounter: 0, hppCounter: 0, biayaCounter: 0, cabangCounter: 0 };

        function openForm1771() {
            const kasus = Form1771Cases[Math.floor(Math.random() * Form1771Cases.length)];
            form1771State = { case: kasus, kpCounter: 0, posCounter: 0, negCounter: 0, finalCounter: 0, bukanObjekCounter: 0, sahamCounter: 0, pengurusCounter: 0, hppCounter: 0, biayaCounter: 0, cabangCounter: 0 };

            document.getElementById('f1771-title').innerText = kasus.title;
            document.getElementById('f1771-narrative').innerText = kasus.narrative;

            ['peredaranUsaha', 'kompensasiKerugian', 'umkmPeredaranUsaha', 'luarUsahaBruto', 'biayaLuarUsaha', 'penghasilanLN', 'penghasilanTidakTeratur'].forEach(function(id) {
                const el = document.getElementById('f1771-' + id);
                if (el) el.value = '';
            });
            ['koreksipositif-rows', 'koreksinegatif-rows', 'kreditpajak-rows', 'final-rows', 'bukanobjek-rows', 'pemegangsaham-rows', 'pengurus-rows', 'hpprincian-rows', 'biayarincian-rows', 'cabang-rows'].forEach(function(id) {
                document.getElementById('f1771-' + id).innerHTML = '';
            });

            // Toggle tampilan sesuai skema kasus (normal vs UMKM Final PP 55/2022)
            const isUmkm = kasus.input.skema === 'umkm';
            document.getElementById('f1771-scheme-badge').innerText = isUmkm
                ? 'MODE ISI FORMULIR — SPT 1771 (SKEMA UMKM FINAL PP 55/2022)'
                : 'MODE ISI FORMULIR — SPT 1771 (SKEMA NORMAL / PEMBUKUAN)';
            document.getElementById('f1771-lampiran1-normal').style.display = isUmkm ? 'none' : 'block';
            document.getElementById('f1771-lampiran1-umkm').style.display = isUmkm ? 'block' : 'none';
            document.getElementById('f1771-lampiran2-normal').style.display = isUmkm ? 'none' : 'block';
            document.getElementById('f1771-lampiran2-umkm').style.display = isUmkm ? 'block' : 'none';
            document.getElementById('f1771-induk-normal').style.display = isUmkm ? 'none' : 'block';
            document.getElementById('f1771-induk-umkm').style.display = isUmkm ? 'block' : 'none';
            document.getElementById('f1771-kreditpajak-label').innerText = isUmkm
                ? 'Setoran Sendiri PPh Final UMKM (otomatis dari total Lampiran III)'
                : 'Kredit Pajak (otomatis dari total Lampiran III)';

            switchForm1771Tab(1);
            recalcForm1771();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-form1771').classList.add('active');
            document.getElementById('page-title').innerText = 'Isi Formulir SPT 1771 (Badan)';
            document.getElementById('page-subtitle').innerText = 'Isi seperti formulir asli — baca kasus, lalu isi tiap lampiran.';
        }

        function switchForm1771Tab(tabNum) {
            [1, 2, 3, 4, 5, 6].forEach(function(n) {
                document.getElementById('f1771-tab-' + n).style.display = (n === tabNum) ? 'block' : 'none';
                document.getElementById('f1771-tabbtn-' + n).classList.toggle('active', n === tabNum);
            });
        }

        // ---- Lampiran I: Koreksi Fiskal Positif/Negatif ----
        function addKoreksiPositifRow(jenis, jumlah) {
            form1771State.posCounter++;
            const rowId = 'f1771-pos-row-' + form1771State.posCounter;
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Jenis koreksi positif" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1771()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-koreksipositif-rows').appendChild(div);
            recalcForm1771();
        }

        function addKoreksiNegatifRow(jenis, jumlah) {
            form1771State.negCounter++;
            const rowId = 'f1771-neg-row-' + form1771State.negCounter;
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Jenis koreksi negatif" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1771()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-koreksinegatif-rows').appendChild(div);
            recalcForm1771();
        }

        // ---- Lampiran III: Kredit Pajak ----
        function addKreditPajakRow1771(namaPemotong, npwp, jenisPajak, noBukti, jumlah) {
            form1771State.kpCounter++;
            const rowId = 'f1771-kp-row-' + form1771State.kpCounter;
            const jenisOptions = ['PPh 22', 'PPh 23', 'PPh 24', 'PPh 25', 'PPh Final UMKM', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Pajak</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenisPajak ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama Pemotong / Setor Sendiri" value="' + (namaPemotong ? escapeHTML(namaPemotong) : '') + '">' +
                '<select class="f1770-w-md">' + optionsHtml + '</select>' +
                '<input type="text" class="f1770-w-md" placeholder="No. Bukti Potong" value="' + (noBukti ? escapeHTML(noBukti) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1771()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-kreditpajak-rows').appendChild(div);
            recalcForm1771();
        }

        // ---- Lampiran IV: Final & Bukan Objek ----
        // ---- Lampiran II: Rincian HPP & Biaya Usaha ----
        function addHppRincianRow(jenis, jumlah) {
            form1771State.hppCounter = (form1771State.hppCounter || 0) + 1;
            const rowId = 'f1771-hpp-row-' + form1771State.hppCounter;
            const div = document.createElement('div');
            div.className = 'form1770-harta-row';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-jenis" placeholder="Komponen HPP (mis. Pembelian Bahan Baku)" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1771()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-hpprincian-rows').appendChild(div);
            recalcForm1771();
        }

        function addBiayaRincianRow(jenis, jumlah) {
            form1771State.biayaCounter = (form1771State.biayaCounter || 0) + 1;
            const rowId = 'f1771-biaya-row-' + form1771State.biayaCounter;
            const div = document.createElement('div');
            div.className = 'form1770-harta-row';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-jenis" placeholder="Komponen biaya (mis. Gaji, Sewa)" value="' + (jenis ? escapeHTML(jenis) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1771()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-biayarincian-rows').appendChild(div);
            recalcForm1771();
        }

        // ---- Lampiran VI: Daftar Cabang (digabung tampilan ke tab V) ----
        function addCabangRow(nama, alamat) {
            form1771State.cabangCounter = (form1771State.cabangCounter || 0) + 1;
            const rowId = 'f1771-cabang-row-' + form1771State.cabangCounter;
            const div = document.createElement('div');
            div.className = 'form1770-harta-row';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-jenis" placeholder="Nama Cabang" value="' + (nama ? escapeHTML(nama) : '') + '">' +
                '<input type="text" class="f1770-jenis" placeholder="Alamat/Kota" value="' + (alamat ? escapeHTML(alamat) : '') + '">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-cabang-rows').appendChild(div);
            recalcForm1771();
        }

        function addPenghasilanFinalRow1771(jenis, dpp, tarif) {
            form1771State.finalCounter++;
            const rowId = 'f1771-final-row-' + form1771State.finalCounter;
            const jenisOptions = ['Sewa Tanah/Bangunan', 'Bunga Deposito/Tabungan', 'Bunga/Diskonto Obligasi', 'Hadiah Undian', 'Jasa Konstruksi', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Penghasilan Final</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenis ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<select class="f1770-w-lg">' + optionsHtml + '</select>' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-dpp" placeholder="DPP (Rp)" value="' + (dpp !== undefined ? escapeHTML(String(dpp)) : '') + '" oninput="recalcForm1771()">' +
                '<input type="text" inputmode="numeric" class="f1770-w-sm f1770-tarif" placeholder="Tarif %" value="' + (tarif !== undefined ? escapeHTML(String(tarif)) : '') + '" oninput="recalcForm1771()">' +
                '<div class="f1770-computed-inline f1770-pphfinal-value">Rp 0</div>' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-final-rows').appendChild(div);
            recalcForm1771();
        }

        function addBukanObjekRow1771(jenis, jumlah) {
            form1771State.bukanObjekCounter++;
            const rowId = 'f1771-bo-row-' + form1771State.bukanObjekCounter;
            const jenisOptions = ['Hibah Antar Badan (Kepemilikan >25%)', 'Bantuan/Sumbangan', 'Dividen (Syarat Tertentu)', 'Lainnya'];
            let optionsHtml = '<option value="">Jenis Penghasilan</option>';
            jenisOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jenis ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<select class="f1770-w-lg">' + optionsHtml + '</select>' +
                '<input type="text" inputmode="numeric" class="f1770-w-money f1770-nilai" placeholder="Jumlah (Rp)" value="' + (jumlah !== undefined ? escapeHTML(String(jumlah)) : '') + '" oninput="recalcForm1771()">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-bukanobjek-rows').appendChild(div);
            recalcForm1771();
        }

        // ---- Lampiran V: Pemegang Saham & Pengurus ----
        function addPemegangSahamRow(nama, npwp, persen) {
            form1771State.sahamCounter++;
            const rowId = 'f1771-saham-row-' + form1771State.sahamCounter;
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama Pemegang Saham" value="' + (nama ? escapeHTML(nama) : '') + '">' +
                '<input type="text" class="f1770-w-md" placeholder="NPWP" value="' + (npwp ? escapeHTML(npwp) : '') + '">' +
                '<input type="text" inputmode="numeric" class="f1770-w-sm" placeholder="% Saham" value="' + (persen !== undefined ? escapeHTML(String(persen)) : '') + '">' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-pemegangsaham-rows').appendChild(div);
            recalcForm1771();
        }

        function addPengurusRow(nama, jabatan) {
            form1771State.pengurusCounter++;
            const rowId = 'f1771-pengurus-row-' + form1771State.pengurusCounter;
            const jabatanOptions = ['Direktur Utama', 'Direktur', 'Komisaris', 'Komisaris Independen'];
            let optionsHtml = '<option value="">Jabatan</option>';
            jabatanOptions.forEach(function(o) {
                optionsHtml += '<option value="' + o + '"' + (o === jabatan ? ' selected' : '') + '>' + o + '</option>';
            });
            const div = document.createElement('div');
            div.className = 'form1770-dynrow';
            div.id = rowId;
            div.innerHTML =
                '<input type="text" class="f1770-w-lg" placeholder="Nama" value="' + (nama ? escapeHTML(nama) : '') + '">' +
                '<select class="f1770-w-md">' + optionsHtml + '</select>' +
                '<button type="button" class="form1770-row-remove" onclick="document.getElementById(\'' + rowId + '\').remove(); recalcForm1771();">×</button>';
            document.getElementById('f1771-pengurus-rows').appendChild(div);
            recalcForm1771();
        }

        function recalcForm1771() {
            const isUmkm = form1771State.case && form1771State.case.input.skema === 'umkm';

            // Lampiran II: rincian HPP & Biaya Usaha -> total otomatis mengalir ke Lampiran I
            let totalHppRincian = 0;
            document.querySelectorAll('#f1771-hpprincian-rows .f1770-nilai').forEach(function(el) { totalHppRincian += cleanNumber(el.value); });
            document.getElementById('f1771-totalHppRincian').innerText = fmtRpForm1770(totalHppRincian);

            let totalBiayaRincian = 0;
            document.querySelectorAll('#f1771-biayarincian-rows .f1770-nilai').forEach(function(el) { totalBiayaRincian += cleanNumber(el.value); });
            document.getElementById('f1771-totalBiayaRincian').innerText = fmtRpForm1770(totalBiayaRincian);

            const jumlahCabang = document.querySelectorAll('#f1771-cabang-rows .form1770-harta-row').length;
            document.getElementById('f1771-jumlahCabang').innerText = String(jumlahCabang);

            let totalKreditPajak = 0;
            document.querySelectorAll('#f1771-kreditpajak-rows .f1770-nilai').forEach(function(el) { totalKreditPajak += cleanNumber(el.value); });
            document.getElementById('f1771-totalKreditPajak').innerText = fmtRpForm1770(totalKreditPajak);
            document.getElementById('f1771-kreditPajak').innerText = fmtRpForm1770(totalKreditPajak);

            const jumlahPemegangSaham = document.querySelectorAll('#f1771-pemegangsaham-rows .form1770-dynrow').length;
            document.getElementById('f1771-jumlahPemegangSaham').innerText = String(jumlahPemegangSaham);
            const jumlahPengurus = document.querySelectorAll('#f1771-pengurus-rows .form1770-dynrow').length;
            document.getElementById('f1771-jumlahPengurus').innerText = String(jumlahPengurus);

            let totalPphFinal = 0;
            document.querySelectorAll('#f1771-final-rows .form1770-dynrow').forEach(function(row) {
                const dpp = cleanNumber(row.querySelector('.f1770-dpp').value);
                const tarif = cleanNumber(row.querySelector('.f1770-tarif').value);
                const pphFinal = dpp * (tarif / 100);
                row.querySelector('.f1770-pphfinal-value').innerText = fmtRpForm1770(pphFinal);
                totalPphFinal += pphFinal;
            });
            document.getElementById('f1771-totalPphFinal').innerText = fmtRpForm1770(totalPphFinal);

            let totalBukanObjek = 0;
            document.querySelectorAll('#f1771-bukanobjek-rows .f1770-nilai').forEach(function(el) { totalBukanObjek += cleanNumber(el.value); });
            document.getElementById('f1771-totalBukanObjek').innerText = fmtRpForm1770(totalBukanObjek);

            let pphTerutangFinal, kblb;

            if (isUmkm) {
                // ---- SKEMA UMKM FINAL (PP 55/2022) — tidak ada rekonsiliasi fiskal sama sekali ----
                const peredaranUsahaUmkm = cleanNumber(document.getElementById('f1771-umkmPeredaranUsaha').value);
                const pphFinalUmkm = TaxEngine.hitungPPhFinalUMKM(peredaranUsahaUmkm);
                document.getElementById('f1771-umkmPphFinal').innerText = fmtRpForm1770(pphFinalUmkm);
                document.getElementById('f1771-umkmPeredaranUsaha-2').innerText = fmtRpForm1770(peredaranUsahaUmkm);
                document.getElementById('f1771-umkmPphFinal-2').innerText = fmtRpForm1770(pphFinalUmkm);
                pphTerutangFinal = pphFinalUmkm;
            } else {
                // ---- SKEMA NORMAL (pembukuan + fasilitas Pasal 31E) ----
                const peredaranUsaha = cleanNumber(document.getElementById('f1771-peredaranUsaha').value);
                document.getElementById('f1771-hpp').innerText = fmtRpForm1770(totalHppRincian);
                document.getElementById('f1771-biayaUsaha').innerText = fmtRpForm1770(totalBiayaRincian);
                const neto1d = peredaranUsaha - totalHppRincian - totalBiayaRincian;
                document.getElementById('f1771-netoKomersial').innerText = fmtRpForm1770(neto1d);
                document.getElementById('f1771-peredaranUsaha-2').innerText = fmtRpForm1770(peredaranUsaha);

                // Penghasilan Luar Usaha (opsional) -> neto luar usaha
                const luarUsahaBruto = cleanNumber(document.getElementById('f1771-luarUsahaBruto').value);
                const biayaLuarUsaha = cleanNumber(document.getElementById('f1771-biayaLuarUsaha').value);
                const netoLuarUsaha = luarUsahaBruto - biayaLuarUsaha;
                document.getElementById('f1771-netoLuarUsaha').innerText = fmtRpForm1770(netoLuarUsaha);

                // Penghasilan Neto Komersial Luar Negeri (opsional, dari Lampiran Khusus 7A)
                const penghasilanLN = cleanNumber(document.getElementById('f1771-penghasilanLN').value);
                const jumlahNetoKomersial = neto1d + netoLuarUsaha + penghasilanLN;
                document.getElementById('f1771-jumlahNetoKomersial').innerText = fmtRpForm1770(jumlahNetoKomersial);

                let totalKoreksiPositif = 0;
                document.querySelectorAll('#f1771-koreksipositif-rows .f1770-nilai').forEach(function(el) { totalKoreksiPositif += cleanNumber(el.value); });
                document.getElementById('f1771-totalKoreksiPositif').innerText = fmtRpForm1770(totalKoreksiPositif);

                let totalKoreksiNegatif = 0;
                document.querySelectorAll('#f1771-koreksinegatif-rows .f1770-nilai').forEach(function(el) { totalKoreksiNegatif += cleanNumber(el.value); });
                document.getElementById('f1771-totalKoreksiNegatif').innerText = fmtRpForm1770(totalKoreksiNegatif);

                const netoFiskal = jumlahNetoKomersial + totalKoreksiPositif - totalKoreksiNegatif;
                document.getElementById('f1771-netoFiskal').innerText = fmtRpForm1770(netoFiskal);
                document.getElementById('f1771-netoFiskal-2').innerText = fmtRpForm1770(netoFiskal);

                const kompensasiKerugian = cleanNumber(document.getElementById('f1771-kompensasiKerugian').value);
                const pkp = Math.max(0, Math.floor((netoFiskal - kompensasiKerugian) / 1000) * 1000);
                document.getElementById('f1771-pkp').innerText = fmtRpForm1770(pkp);

                const hasilBadan = TaxEngine.hitungPPhBadan(peredaranUsaha, pkp);
                let statusTeks;
                if (peredaranUsaha <= 0) {
                    statusTeks = 'Isi Peredaran Usaha dulu di Lampiran I.';
                } else if (hasilBadan.fasilitasPenuh) {
                    statusTeks = 'Peredaran usaha ≤ Rp4,8 miliar → SELURUH PKP dapat fasilitas Pasal 31E (tarif efektif 11%).';
                } else if (hasilBadan.dapatFasilitas) {
                    statusTeks = 'Peredaran usaha di antara Rp4,8 miliar – Rp50 miliar → PKP terbagi: ' + fmtRpForm1770(hasilBadan.pkpFasilitas) + ' kena tarif 11% (fasilitas), ' + fmtRpForm1770(hasilBadan.pkpNonFasilitas) + ' kena tarif 22% (normal).';
                } else {
                    statusTeks = 'Peredaran usaha > Rp50 miliar → TIDAK dapat fasilitas Pasal 31E, seluruh PKP kena tarif normal 22%.';
                }
                document.getElementById('f1771-statusFasilitas').innerText = statusTeks;
                document.getElementById('f1771-pphTerutang').innerText = fmtRpForm1770(hasilBadan.pphTerutang);
                pphTerutangFinal = hasilBadan.pphTerutang;

                // ---- Angsuran PPh 25 Tahun Depan (Angka 14) ----
                const penghasilanTidakTeratur = cleanNumber(document.getElementById('f1771-penghasilanTidakTeratur').value);
                const dasarAngsuran = Math.max(0, netoFiskal - penghasilanTidakTeratur);
                document.getElementById('f1771-angsuranDasar').innerText = fmtRpForm1770(dasarAngsuran);

                const hasilAngsuran = TaxEngine.hitungPPhBadan(peredaranUsaha, Math.floor(dasarAngsuran / 1000) * 1000);
                document.getElementById('f1771-angsuranPPhDihitung').innerText = fmtRpForm1770(hasilAngsuran.pphTerutang);

                // 14.e: hanya kredit pajak yang DIPOTONG/DIPUNGUT PIHAK LAIN dalam negeri —
                // tidak termasuk PPh 24 (luar negeri) maupun PPh 25 (angsuran disetor sendiri,
                // karena itu justru yang sedang dihitung di sini).
                let kreditDalamNegeriUntukAngsuran = 0;
                document.querySelectorAll('#f1771-kreditpajak-rows .form1770-dynrow').forEach(function(row) {
                    const sel = row.querySelector('select');
                    const jenis = sel ? sel.value : '';
                    const nilai = cleanNumber(row.querySelector('.f1770-nilai').value);
                    if (jenis !== 'PPh 24' && jenis !== 'PPh 25') kreditDalamNegeriUntukAngsuran += nilai;
                });
                document.getElementById('f1771-angsuranKreditDN').innerText = fmtRpForm1770(kreditDalamNegeriUntukAngsuran);

                const angsuranPerTahun = Math.max(0, hasilAngsuran.pphTerutang - kreditDalamNegeriUntukAngsuran);
                const angsuranPerBulan = Math.floor((angsuranPerTahun / 12) / 1000) * 1000;
                document.getElementById('f1771-angsuranPerBulan').innerText = fmtRpForm1770(angsuranPerBulan);
            }

            kblb = pphTerutangFinal - totalKreditPajak;
            const kblbLabel = kblb > 0 ? ' (Kurang Bayar)' : (kblb < 0 ? ' (Lebih Bayar)' : ' (Nihil)');
            document.getElementById('f1771-kblb').innerText = fmtRpForm1770(kblb) + kblbLabel;
        }

        function checkForm1771Answers() {
            const kasus = form1771State.case;
            const correct = kasus.input;
            const isUmkm = correct.skema === 'umkm';

            let totalHppRincian = 0;
            document.querySelectorAll('#f1771-hpprincian-rows .f1770-nilai').forEach(function(el) { totalHppRincian += cleanNumber(el.value); });
            let totalBiayaRincian = 0;
            document.querySelectorAll('#f1771-biayarincian-rows .f1770-nilai').forEach(function(el) { totalBiayaRincian += cleanNumber(el.value); });
            const jumlahCabang = document.querySelectorAll('#f1771-cabang-rows .form1770-harta-row').length;

            let totalKreditPajak = 0;
            document.querySelectorAll('#f1771-kreditpajak-rows .f1770-nilai').forEach(function(el) { totalKreditPajak += cleanNumber(el.value); });
            let totalPphFinal = 0;
            document.querySelectorAll('#f1771-final-rows .form1770-dynrow').forEach(function(row) {
                const dpp = cleanNumber(row.querySelector('.f1770-dpp').value);
                const tarif = cleanNumber(row.querySelector('.f1770-tarif').value);
                totalPphFinal += dpp * (tarif / 100);
            });
            let totalBukanObjek = 0;
            document.querySelectorAll('#f1771-bukanobjek-rows .f1770-nilai').forEach(function(el) { totalBukanObjek += cleanNumber(el.value); });
            const jumlahPemegangSaham = document.querySelectorAll('#f1771-pemegangsaham-rows .form1770-dynrow').length;
            const jumlahPengurus = document.querySelectorAll('#f1771-pengurus-rows .form1770-dynrow').length;

            const correctTotalHppRincian = correct.hppRincian.reduce(function(a, b) { return a + b.jumlah; }, 0);
            const correctTotalBiayaRincian = correct.biayaRincian.reduce(function(a, b) { return a + b.jumlah; }, 0);
            const correctJumlahCabang = correct.cabang.length;
            const correctTotalKreditPajak = correct.kreditPajak.reduce(function(a, b) { return a + b.jumlah; }, 0);
            const correctTotalPphFinal = correct.penghasilanFinal.reduce(function(a, f) { return a + f.pphFinal; }, 0);
            const correctTotalBukanObjek = correct.penghasilanBukanObjek.reduce(function(a, b) { return a + b.jumlah; }, 0);
            const correctJumlahPemegangSaham = correct.pemegangSaham.length;
            const correctJumlahPengurus = correct.pengurus.length;

            let checks;

            if (isUmkm) {
                const userPeredaranUmkm = cleanNumber(document.getElementById('f1771-umkmPeredaranUsaha').value);
                const pphFinalUmkmUser = TaxEngine.hitungPPhFinalUMKM(userPeredaranUmkm);
                const kblbUser = pphFinalUmkmUser - totalKreditPajak;

                const pphFinalUmkmCorrect = TaxEngine.hitungPPhFinalUMKM(correct.peredaranUsaha);
                const kblbCorrect = pphFinalUmkmCorrect - correctTotalKreditPajak;

                checks = [
                    { label: 'Peredaran Usaha Bruto (Lampiran I — Skema UMKM)', ok: userPeredaranUmkm === correct.peredaranUsaha, correctVal: fmtRpForm1770(correct.peredaranUsaha) },
                    { label: 'Total Kredit Pajak / Setoran Sendiri (Lampiran III)', ok: totalKreditPajak === correctTotalKreditPajak, correctVal: fmtRpForm1770(correctTotalKreditPajak) },
                    { label: 'Jumlah Pemegang Saham (Lampiran V)', ok: jumlahPemegangSaham === correctJumlahPemegangSaham, correctVal: String(correctJumlahPemegangSaham) + ' pihak' },
                    { label: 'Jumlah Pengurus/Komisaris (Lampiran V)', ok: jumlahPengurus === correctJumlahPengurus, correctVal: String(correctJumlahPengurus) + ' orang' },
                    { label: 'Jumlah Cabang (Lampiran VI)', ok: jumlahCabang === correctJumlahCabang, correctVal: String(correctJumlahCabang) + ' cabang' },
                    { label: 'PPh Kurang/Lebih Bayar (hasil akhir Induk)', ok: kblbUser === kblbCorrect, correctVal: fmtRpForm1770(kblbCorrect) }
                ];
            } else {
                const userVals = {
                    peredaranUsaha: cleanNumber(document.getElementById('f1771-peredaranUsaha').value),
                    kompensasiKerugian: cleanNumber(document.getElementById('f1771-kompensasiKerugian').value),
                    luarUsahaBruto: cleanNumber(document.getElementById('f1771-luarUsahaBruto').value),
                    biayaLuarUsaha: cleanNumber(document.getElementById('f1771-biayaLuarUsaha').value),
                    penghasilanLN: cleanNumber(document.getElementById('f1771-penghasilanLN').value),
                    penghasilanTidakTeratur: cleanNumber(document.getElementById('f1771-penghasilanTidakTeratur').value)
                };
                let totalKoreksiPositif = 0;
                document.querySelectorAll('#f1771-koreksipositif-rows .f1770-nilai').forEach(function(el) { totalKoreksiPositif += cleanNumber(el.value); });
                let totalKoreksiNegatif = 0;
                document.querySelectorAll('#f1771-koreksinegatif-rows .f1770-nilai').forEach(function(el) { totalKoreksiNegatif += cleanNumber(el.value); });

                const correctTotalKoreksiPositif = correct.koreksiPositif.reduce(function(a, b) { return a + b.jumlah; }, 0);
                const correctTotalKoreksiNegatif = correct.koreksiNegatif.reduce(function(a, b) { return a + b.jumlah; }, 0);

                // 14.e: kredit dalam negeri saja (bukan PPh 24 luar negeri, bukan PPh 25 angsuran sendiri)
                let userKreditDalamNegeri = 0;
                document.querySelectorAll('#f1771-kreditpajak-rows .form1770-dynrow').forEach(function(row) {
                    const sel = row.querySelector('select');
                    const jenis = sel ? sel.value : '';
                    const nilai = cleanNumber(row.querySelector('.f1770-nilai').value);
                    if (jenis !== 'PPh 24' && jenis !== 'PPh 25') userKreditDalamNegeri += nilai;
                });
                const correctKreditDalamNegeri = correct.kreditPajak
                    .filter(function(k) { return k.jenisPajak !== 'PPh 24' && k.jenisPajak !== 'PPh 25'; })
                    .reduce(function(a, b) { return a + b.jumlah; }, 0);

                const netoLuarUsahaUser = userVals.luarUsahaBruto - userVals.biayaLuarUsaha;
                const jumlahNetoKomersialUser = (userVals.peredaranUsaha - totalHppRincian - totalBiayaRincian) + netoLuarUsahaUser + userVals.penghasilanLN;
                const netoFiskalUser = jumlahNetoKomersialUser + totalKoreksiPositif - totalKoreksiNegatif;
                const pkpUser = Math.max(0, Math.floor((netoFiskalUser - userVals.kompensasiKerugian) / 1000) * 1000);
                const hasilBadanUser = TaxEngine.hitungPPhBadan(userVals.peredaranUsaha, pkpUser);
                const kblbUser = hasilBadanUser.pphTerutang - totalKreditPajak;
                const dasarAngsuranUser = Math.max(0, netoFiskalUser - userVals.penghasilanTidakTeratur);
                const hasilAngsuranUser = TaxEngine.hitungPPhBadan(userVals.peredaranUsaha, Math.floor(dasarAngsuranUser / 1000) * 1000);
                const angsuranBulananUser = Math.floor(Math.max(0, hasilAngsuranUser.pphTerutang - userKreditDalamNegeri) / 12 / 1000) * 1000;

                const netoLuarUsahaCorrect = (correct.luarUsahaBruto || 0) - (correct.biayaLuarUsaha || 0);
                const jumlahNetoKomersialCorrect = (correct.peredaranUsaha - correct.hpp - correct.biayaUsaha) + netoLuarUsahaCorrect + (correct.penghasilanNetoLuarNegeri || 0);
                const netoFiskalCorrect = jumlahNetoKomersialCorrect + correctTotalKoreksiPositif - correctTotalKoreksiNegatif;
                const pkpCorrect = Math.max(0, Math.floor((netoFiskalCorrect - correct.kompensasiKerugian) / 1000) * 1000);
                const hasilBadanCorrect = TaxEngine.hitungPPhBadan(correct.peredaranUsaha, pkpCorrect);
                const kblbCorrect = hasilBadanCorrect.pphTerutang - correctTotalKreditPajak;
                const dasarAngsuranCorrect = Math.max(0, netoFiskalCorrect - (correct.penghasilanTidakTeratur || 0));
                const hasilAngsuranCorrect = TaxEngine.hitungPPhBadan(correct.peredaranUsaha, Math.floor(dasarAngsuranCorrect / 1000) * 1000);
                const angsuranBulananCorrect = Math.floor(Math.max(0, hasilAngsuranCorrect.pphTerutang - correctKreditDalamNegeri) / 12 / 1000) * 1000;

                checks = [
                    { label: 'Peredaran Usaha (Lampiran I)', ok: userVals.peredaranUsaha === correct.peredaranUsaha, correctVal: fmtRpForm1770(correct.peredaranUsaha) },
                    { label: 'Total HPP (Lampiran II)', ok: totalHppRincian === correctTotalHppRincian, correctVal: fmtRpForm1770(correctTotalHppRincian) },
                    { label: 'Total Biaya Usaha Lainnya (Lampiran II)', ok: totalBiayaRincian === correctTotalBiayaRincian, correctVal: fmtRpForm1770(correctTotalBiayaRincian) },
                    { label: 'Penghasilan Neto Luar Usaha (Lampiran I)', ok: netoLuarUsahaUser === netoLuarUsahaCorrect, correctVal: fmtRpForm1770(netoLuarUsahaCorrect) },
                    { label: 'Penghasilan Neto Komersial Luar Negeri (Lampiran I)', ok: userVals.penghasilanLN === (correct.penghasilanNetoLuarNegeri || 0), correctVal: fmtRpForm1770(correct.penghasilanNetoLuarNegeri || 0) },
                    { label: 'Total Koreksi Fiskal Positif (Lampiran I)', ok: totalKoreksiPositif === correctTotalKoreksiPositif, correctVal: fmtRpForm1770(correctTotalKoreksiPositif) },
                    { label: 'Total Koreksi Fiskal Negatif (Lampiran I)', ok: totalKoreksiNegatif === correctTotalKoreksiNegatif, correctVal: fmtRpForm1770(correctTotalKoreksiNegatif) },
                    { label: 'Kompensasi Kerugian (Induk)', ok: userVals.kompensasiKerugian === correct.kompensasiKerugian, correctVal: fmtRpForm1770(correct.kompensasiKerugian) },
                    { label: 'Total Kredit Pajak (Lampiran III)', ok: totalKreditPajak === correctTotalKreditPajak, correctVal: fmtRpForm1770(correctTotalKreditPajak) },
                    { label: 'Total PPh Final (Lampiran IV-A)', ok: totalPphFinal === correctTotalPphFinal, correctVal: fmtRpForm1770(correctTotalPphFinal) },
                    { label: 'Total Bukan Objek Pajak (Lampiran IV-B)', ok: totalBukanObjek === correctTotalBukanObjek, correctVal: fmtRpForm1770(correctTotalBukanObjek) },
                    { label: 'Jumlah Pemegang Saham (Lampiran V)', ok: jumlahPemegangSaham === correctJumlahPemegangSaham, correctVal: String(correctJumlahPemegangSaham) + ' pihak' },
                    { label: 'Jumlah Pengurus/Komisaris (Lampiran V)', ok: jumlahPengurus === correctJumlahPengurus, correctVal: String(correctJumlahPengurus) + ' orang' },
                    { label: 'Jumlah Cabang (Lampiran VI)', ok: jumlahCabang === correctJumlahCabang, correctVal: String(correctJumlahCabang) + ' cabang' },
                    { label: 'Penghasilan Tidak Teratur (Induk — dasar Angsuran PPh 25)', ok: userVals.penghasilanTidakTeratur === (correct.penghasilanTidakTeratur || 0), correctVal: fmtRpForm1770(correct.penghasilanTidakTeratur || 0) },
                    { label: 'PPh Kurang/Lebih Bayar (hasil akhir Induk)', ok: kblbUser === kblbCorrect, correctVal: fmtRpForm1770(kblbCorrect) },
                    { label: 'Angsuran PPh 25 per Bulan Tahun Depan (Angka 14.g)', ok: angsuranBulananUser === angsuranBulananCorrect, correctVal: fmtRpForm1770(angsuranBulananCorrect) }
                ];
            }

            const correctCount = checks.filter(function(c) { return c.ok; }).length;
            const score = Math.round((correctCount / checks.length) * 100);

            let category = "", color = "";
            if (score >= 90) { category = "Sangat Baik"; color = "var(--success)"; }
            else if (score >= 70) { category = "Baik"; color = "var(--info)"; }
            else if (score >= 50) { category = "Cukup"; color = "var(--warning)"; }
            else { category = "Kurang"; color = "var(--danger)"; }

            const circle = document.getElementById('result-score');
            circle.innerText = score;
            circle.style.borderColor = color;
            circle.style.color = color;
            document.getElementById('result-category').innerText = category;

            const xpGain = Math.round(score * 2); // 1771 paling kompleks, dihargai paling tinggi
            document.getElementById('result-xp-gain').innerText = `+${xpGain} XP Diperoleh!`;

            let explHtml = `<strong>Rincian Pengecekan Formulir (${checks.length} titik cek):</strong><ul>`;
            checks.forEach(function(c) {
                explHtml += '<li>' + (c.ok ? '✅' : '❌') + ' ' + c.label + (c.ok ? '' : ' — seharusnya: <strong>' + c.correctVal + '</strong>') + '</li>';
            });
            explHtml += '</ul>';
            document.getElementById('result-explanation').innerHTML = explHtml;

            appState.user.xp += xpGain;
            appState.user.history.push({
                date: new Date().toLocaleDateString('id-ID'),
                module: '1771 (Form Lengkap)',
                mode: 'form',
                score: score
            });
            saveData();
            updateProfileUI();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-result').classList.add('active');
            document.getElementById('page-title').innerText = "Laporan Simulasi";
            document.getElementById('page-subtitle').innerText = "Evaluasi hasil pengisian formulir SPT 1771 Anda.";
        }

                function startSimulation(mode) {
            appState.currentMode = mode;

            // Kalau toggle generator aktif dan modul ini didukung, pakai kasus acak;
            // kalau tidak (atau modulnya belum didukung generator), pakai bank soal tetap seperti biasa.
            const generated = appState.useGenerator ? CaseGenerator.generate(appState.currentModule) : null;
            if (generated) {
                appState.currentCase = generated;
            } else {
                const cases = databaseKasus[appState.currentModule];
                appState.currentCase = cases[Math.floor(Math.random() * cases.length)];
            }

            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.getElementById('view-simulation').classList.add('active');
            
            document.getElementById('page-title').innerText = `Simulasi ${appState.currentModule}`;
            document.getElementById('page-subtitle').innerText = "Isi formulir berdasarkan data kasus di bawah.";
            
            const badge = document.getElementById('sim-badge-mode');
            if(mode === 'latihan') {
                badge.innerText = "MODE LATIHAN";
                badge.style.background = "var(--info)";
                document.getElementById('btn-cek-jawaban').style.display = 'inline-block';
            } else {
                badge.innerText = "MODE UJIAN";
                badge.style.background = "var(--danger)";
                document.getElementById('btn-cek-jawaban').style.display = 'none';
            }

            document.getElementById('case-title').innerText = appState.currentCase.title;
            document.getElementById('case-scenario').innerText = appState.currentCase.scenario;

            renderForm();
        }

        function renderForm() {
            const container = document.getElementById('dynamic-form-container');
            container.innerHTML = '';

            appState.currentCase.questions.forEach((q, index) => {
                const group = document.createElement('div');
                group.className = 'form-group';
                
                let labelHtml = `<label for="${q.id}">${q.label}`;
                if(appState.currentMode === 'latihan') {
                    labelHtml += ` <span class="tooltip-icon">?
                        <span class="tooltip-text">Petunjuk AI: ${q.hint}</span>
                    </span>`;
                }
                labelHtml += `</label>`;

                let inputHtml = '';
                if(q.type === 'select') {
                    inputHtml = `<select id="${q.id}" required>
                        <option value="">-- Pilih --</option>
                        ${q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>`;
                } else {
                    inputHtml = `<input type="text" id="${q.id}" required placeholder="Contoh: 10.000.000">`;
                }

                group.innerHTML = labelHtml + inputHtml + `<div id="feed-${q.id}" class="feedback"></div>`;
                container.appendChild(group);
            });
        }

        // ==========================================
        // 5. VALIDATION & SUBMISSION
        // ==========================================
        
        function cleanNumber(val) {
            if (!val) return 0;
            // FIX: buang dulu semua karakter selain digit/titik/koma/minus, supaya input
            // seperti "Infinity", "NaN", atau teks acak tidak ikut lolos ke parseFloat.
            // Catatan: fungsi ini mengasumsikan format angka Indonesia (titik=ribuan,
            // koma=desimal) sesuai placeholder "Contoh: 10.000.000" di form — format lain
            // (mis. "1,234,567.89" gaya US) tidak akan terbaca benar.
            let raw = val.toString().replace(/Rp|\s/gi, '').trim();
            raw = raw.replace(/[^0-9.,-]/g, '');
            if (!raw) return 0;
            let cleaned = raw.replace(/\./g, '').replace(',', '.');
            const result = parseFloat(cleaned);
            return Number.isFinite(result) ? result : 0;
        }

        function checkAnswers() {
            appState.currentCase.questions.forEach(q => {
                const val = document.getElementById(q.id).value;
                const feedbackEl = document.getElementById(`feed-${q.id}`);
                
                if(!val) {
                    feedbackEl.className = 'feedback';
                    feedbackEl.innerHTML = '';
                    return;
                }

                let isCorrect = false;
                if(q.type === 'number') {
                    isCorrect = (cleanNumber(val) === cleanNumber(q.correct));
                } else {
                    isCorrect = (val.toString().trim().toLowerCase() === q.correct.toString().trim().toLowerCase());
                }

                if(isCorrect) {
                    feedbackEl.className = 'feedback success';
                    feedbackEl.innerHTML = '✅ Benar!';
                } else {
                    feedbackEl.className = 'feedback error';
                    feedbackEl.innerHTML = `❌ Salah. (Clue: ${q.hint})`;
                }
            });
        }

        function submitSimulation() {
            let correctCount = 0;
            let totalQuestions = appState.currentCase.questions.length;

            appState.currentCase.questions.forEach(q => {
                const val = document.getElementById(q.id).value;
                if(q.type === 'number') {
                    if(cleanNumber(val) === cleanNumber(q.correct)) correctCount++;
                } else {
                    if(val.toString().trim().toLowerCase() === q.correct.toString().trim().toLowerCase()) correctCount++;
                }
            });

            const score = Math.round((correctCount / totalQuestions) * 100);
            
            let category = "";
            let color = "";
            if (score >= 90) { category = "Sangat Baik"; color = "var(--success)"; }
            else if (score >= 70) { category = "Baik"; color = "var(--info)"; }
            else if (score >= 50) { category = "Cukup"; color = "var(--warning)"; }
            else { category = "Kurang"; color = "var(--danger)"; }

            const circle = document.getElementById('result-score');
            circle.innerText = score;
            circle.style.borderColor = color;
            circle.style.color = color;
            
            document.getElementById('result-category').innerText = category;
            
            let xpGain = score; 
            if(appState.currentMode === 'ujian') xpGain = Math.round(xpGain * 1.5);
            document.getElementById('result-xp-gain').innerText = `+${xpGain} XP Diperoleh!`;

            let explHtml = `<strong>Dasar Hukum & Analisis Kasus:</strong><br><br>${appState.currentCase.explanation}<br><br>`;
            explHtml += `<strong>Kunci Jawaban:</strong><ul>`;
            appState.currentCase.questions.forEach(q => {
                explHtml += `<li>${q.label} : <strong>${q.correct}</strong></li>`;
            });
            explHtml += `</ul>`;
            document.getElementById('result-explanation').innerHTML = explHtml;

            appState.user.xp += xpGain;
            appState.user.history.push({
                date: new Date().toLocaleDateString('id-ID'),
                module: appState.currentModule,
                mode: appState.currentMode,
                score: score
            });
            
            saveData();
            updateProfileUI();

            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.getElementById('view-result').classList.add('active');
            document.getElementById('page-title').innerText = "Laporan Simulasi";
            document.getElementById('page-subtitle').innerText = "Evaluasi hasil pengisian SPT Anda.";
        }

        function renderHistory() {
            const tbody = document.getElementById('history-table-body');
            tbody.innerHTML = '';
            
            if(appState.user.history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Belum ada riwayat latihan.</td></tr>';
                return;
            }

            const reversed = [...appState.user.history].reverse();

            reversed.forEach(h => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px; border-bottom: 1px solid var(--border);">${h.date}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border);">${h.module}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border); text-transform: capitalize;">${h.mode}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border);"><strong>${h.score}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // INIT
        window.onload = function() {
            loadData(); // isi appState.user dari localStorage dulu -- app langsung bisa dipakai walau offline
            initFirebaseServices(); // baru setelah itu coba nyambung ke Firebase (login & sinkron cloud)
            renderTabloidLinks();
            
            // Perbaikan pemanggilan function agar valid
            fetchRegulationUpdates();
            
            updateProfileUI();
            animateCounters();
        };

        // ==========================================
        // FITUR EXPORT / IMPORT DATA (BACKUP) — sekarang mencadangkan SEMUA modul
        // (dashboard XP, Tax Career, Faktur & Bukti Potong, draft+nilai formulir
        // 1771) lewat js/shared/backup-utils.js, bukan cuma XP dashboard seperti
        // sebelumnya. File backup lama (XP-only) tetap bisa dipulihkan (legacy).
        // ==========================================
        function exportData() {
            if (window.BackupUtils) {
                BackupUtils.downloadBackup('backup-sim-spt-lengkap.json');
            } else {
                // fallback kalau backup-utils.js gagal dimuat: minimal tetap backup XP
                const dataStr = JSON.stringify(appState.user);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', 'backup-simulator-spt.json');
                linkElement.click();
            }
        }

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!window.BackupUtils) {
                alert('❌ Modul backup tidak termuat — coba muat ulang halaman.');
                event.target.value = '';
                return;
            }

            BackupUtils.readAndRestoreFile(file, function (result) {
                if (result.ok) {
                    // Kalau backup yang dipulihkan menyertakan data XP dashboard, sinkronkan
                    // appState di memori juga supaya UI langsung ter-update tanpa reload.
                    if (result.restored.includes('spt_simulator_data')) {
                        try {
                            appState.user = JSON.parse(localStorage.getItem('spt_simulator_data'));
                            saveData();
                            updateProfileUI();
                            if (document.getElementById('view-history').classList.contains('active')) {
                                renderHistory();
                            }
                        } catch (e) { /* biarkan, data lain tetap tersimpan */ }
                    }
                    const jumlah = result.restored.length;
                    alert(result.legacy
                        ? '✅ Data progress (format lama) berhasil dimuat!'
                        : `✅ ${jumlah} bagian data berhasil dipulihkan! Muat ulang halaman/modul terkait untuk melihat hasilnya sepenuhnya.`);
                } else {
                    alert('❌ ' + (result.error || 'File tidak valid!'));
                }
            });
            event.target.value = '';
        }

        document.getElementById('btn-hapus-riwayat').addEventListener('click', function() {
            let konfirmasi = confirm("Apakah Anda yakin ingin menghapus seluruh riwayat pembelajaran?");
            
            if (konfirmasi) {
                // BUG FIX: localStorage.removeItem hanya menerima 1 argumen, yaitu nama key
                localStorage.removeItem('spt_simulator_data'); 
                
                alert("Riwayat berhasil dihapus!");
                window.location.reload(); 
            }
        });
