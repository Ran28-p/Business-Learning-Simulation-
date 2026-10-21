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
                    explanation: 'Untuk masa pajak 2025, berdasarkan PP 55 Tahun 2022 dan ketentuan peralihan PP 20/2026 (berlaku s.d. akhir Tahun Pajak 2026), CV UMKM masih dikenakan PPh Final 0,5% dari peredaran bruto. Batas bebas omset Rp 500 Juta HANYA berlaku untuk Orang Pribadi UMKM, bukan untuk Badan/CV. Catatan: setelah masa peralihan, subjek final UMKM hanya Orang Pribadi, PT Perorangan, dan Koperasi; CV biasa memakai tarif umum / Pasal 31E.'
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
            
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                applySptTheme(savedTheme === 'dark');
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                applySptTheme(true);
            }

            const themeToggle = document.getElementById('theme-toggle');
            if(themeToggle) {
                themeToggle.checked = document.body.getAttribute('data-theme') === 'dark';
                themeToggle.addEventListener('change', toggleTheme);
            }
        }

        // CATATAN: fungsi saveData() versi localStorage yang lama sudah dihapus dari sini —
        // sebelumnya ada 2 definisi saveData() dan yang ini selalu ketimpa oleh versi
        // berbasis Firebase di bawah (dekat baris "DEKLARASI FIREBASE"), jadi dead code.

        // Identitas pengguna (nama/email) HANYA berasal dari login Portal — sama seperti modul lain.
        // Sesi ditulis js/auth.js ke localStorage "unified_portal_session" (origin sama dengan modul).
        // Progres/XP tetap milik SPT; yang disinkronkan dari portal hanya nama & email.
        function getPortalIdentity() {
            try {
                const s = JSON.parse(localStorage.getItem('unified_portal_session') || 'null');
                if (s && (s.email || s.isGuest)) {
                    const email = s.email || '';
                    return { email: email, displayName: s.displayName || (email ? email.split('@')[0] : '') };
                }
            } catch (_) { /* sesi rusak → anggap belum login */ }
            return { email: '', displayName: '' };
        }

        function applyPortalIdentity() {
            const id = getPortalIdentity();
            appState.user.email = id.email;
            appState.user.displayName = id.displayName;
        }

        // Login/logout di tab portal → profil di SPT ikut berubah tanpa reload.
        window.addEventListener('storage', function (e) {
            if (e.key === 'unified_portal_session') updateProfileUI();
        });
        window.addEventListener('focus', function () { updateProfileUI(); });

        // Grafik "Perkembangan Progres": jumlah latihan per minggu dari riwayat NYATA (appState.user.history).
        // Entri riwayat hanya menyimpan tanggal (format id-ID "d/M/yyyy"). Tidak ada data → batang kosong.
        function renderProgressChart() {
            const box = document.getElementById('progress-chart-bars');
            if (!box) return;
            const DAY = 86400000;
            const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
            const counts = [0, 0, 0, 0, 0]; // indeks 4 = 7 hari terakhir (minggu ini), 0 = 4 minggu sebelumnya
            (appState.user.history || []).forEach(function (h) {
                const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(h && h.date || ''));
                if (!m) return;
                const d = new Date(+m[3], +m[2] - 1, +m[1]);
                const daysAgo = Math.floor((startOfToday.getTime() - d.getTime()) / DAY);
                if (daysAgo < 0 || daysAgo > 34) return;
                counts[4 - Math.floor(daysAgo / 7)]++;
            });
            const max = Math.max.apply(null, counts);
            box.querySelectorAll('.chart-bar').forEach(function (bar, i) {
                const rect = bar.querySelector('.chart-rect');
                rect.style.height = (max ? Math.round(counts[i] / max * 100) : 0) + '%';
                rect.title = counts[i] + ' latihan';
            });
            box.setAttribute('aria-label', 'Jumlah latihan per minggu, 5 minggu terakhir: ' + counts.join(', '));
            const cap = document.getElementById('progress-chart-caption');
            if (cap) cap.textContent = max ? 'Latihan per minggu · 5 minggu terakhir' : 'Belum ada latihan tercatat';
        }

        function updateProfileUI() {
            applyPortalIdentity();
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

            renderProgressChart();

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
            // Identitas (nama/email) ditampilkan dari sesi Portal — lihat getPortalIdentity().
            // Firebase di sini hanya dipakai untuk sinkron progres (sesi Firebase dibagi dengan portal).
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

// --- LOGIN: hanya di Portal ---
// Link login lama (email) yang masih mengarah ke halaman SPT dialihkan ke Portal dengan query yang
// sama, supaya Portal yang menyelesaikan sign-in (satu-satunya tempat login).
function completeEmailLinkSignIn() {
    if (!auth || !auth.isSignInWithEmailLink(window.location.href)) return;
    window.location.replace('../../index.html' + window.location.search);
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

// CATATAN: initFirebaseServices() SENGAJA dipanggil dari window.onload (setelah loadData()),
// bukan di sini langsung -- supaya appState.user sudah terisi data lokal (termasuk updatedAt)
// lebih dulu, sebelum listener auth Firebase mencoba membandingkan/menggabungkan data cloud.
