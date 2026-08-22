           // ==========================================
        // 1. ENGINE: TAX CALCULATOR (UU HPP / KUP)
        // CATATAN: engine ini belum dipanggil di alur manapun — penilaian jawaban saat ini
        // 100% pakai nilai `correct` yang di-hardcode di databaseKasus, bukan hasil hitung
        // otomatis dari sini. Dibiarkan (tidak dihapus) kalau memang rencananya mau dipakai
        // untuk generate kasus dinamis ke depannya.
        // ==========================================
        const TaxEngine = {
            hitungPTKP: function(status) {
                const base = 54000000;
                const tanggungan_rate = 4500000;
                if (!status) return base; // FIX: jaga-jaga status kosong/null sekarang engine ini benar-benar dipanggil
                const parts = status.toUpperCase().split('/'); 
                if(parts.length !== 2) return base;
                
                let total = base;
                if(parts[0] === 'K') total += 4500000; 
                
                let tanggungan = parseInt(parts[1]);
                if(tanggungan > 3) tanggungan = 3; 
                total += (tanggungan * tanggungan_rate);
                
                return total;
            },

            hitungTarifProgresif: function(pkp) {
                if (pkp <= 0) return 0;
                let pajak = 0;
                
                if (pkp > 5000000000) {
                    pajak += (pkp - 5000000000) * 0.35;
                    pkp = 5000000000;
                }
                if (pkp > 500000000) {
                    pajak += (pkp - 500000000) * 0.30;
                    pkp = 500000000;
                }
                if (pkp > 250000000) {
                    pajak += (pkp - 250000000) * 0.25;
                    pkp = 250000000;
                }
                if (pkp > 60000000) {
                    pajak += (pkp - 60000000) * 0.15;
                    pkp = 60000000;
                }
                if (pkp > 0) {
                    pajak += pkp * 0.05;
                }
                return pajak;
            },

            // Tabel TER (Tarif Efektif Rata-rata) bulanan PPh 21 sesuai Lampiran PP 58/2023.
            // Kategori A = TK/0 (PTKP 54jt), TK/1 & K/0 (58,5jt) — 44 lapisan
            // Kategori B = TK/2 & K/1 (63jt), TK/3 & K/2 (67,5jt) — 40 lapisan
            // Kategori C = K/3 (72jt) — 41 lapisan
            TER_TABLE: {
            A: [
                { max: 5400000, rate: 0.0 },
                { max: 5650000, rate: 0.0025 },
                { max: 5950000, rate: 0.005 },
                { max: 6300000, rate: 0.0075 },
                { max: 6750000, rate: 0.01 },
                { max: 7500000, rate: 0.0125 },
                { max: 8550000, rate: 0.015 },
                { max: 9650000, rate: 0.0175 },
                { max: 10050000, rate: 0.02 },
                { max: 10350000, rate: 0.0225 },
                { max: 10700000, rate: 0.025 },
                { max: 11050000, rate: 0.03 },
                { max: 11600000, rate: 0.035 },
                { max: 12500000, rate: 0.04 },
                { max: 13750000, rate: 0.05 },
                { max: 15100000, rate: 0.06 },
                { max: 16950000, rate: 0.07 },
                { max: 19750000, rate: 0.08 },
                { max: 24150000, rate: 0.09 },
                { max: 26450000, rate: 0.1 },
                { max: 28000000, rate: 0.11 },
                { max: 30050000, rate: 0.12 },
                { max: 32400000, rate: 0.13 },
                { max: 35400000, rate: 0.14 },
                { max: 39100000, rate: 0.15 },
                { max: 43850000, rate: 0.16 },
                { max: 47800000, rate: 0.17 },
                { max: 51400000, rate: 0.18 },
                { max: 56300000, rate: 0.19 },
                { max: 62200000, rate: 0.2 },
                { max: 68600000, rate: 0.21 },
                { max: 77500000, rate: 0.22 },
                { max: 89000000, rate: 0.23 },
                { max: 103000000, rate: 0.24 },
                { max: 125000000, rate: 0.25 },
                { max: 157000000, rate: 0.26 },
                { max: 206000000, rate: 0.27 },
                { max: 337000000, rate: 0.28 },
                { max: 454000000, rate: 0.29 },
                { max: 550000000, rate: 0.3 },
                { max: 695000000, rate: 0.31 },
                { max: 910000000, rate: 0.32 },
                { max: 1400000000, rate: 0.33 },
                { max: Infinity, rate: 0.34 },
            ],
            B: [
                { max: 6200000, rate: 0.0 },
                { max: 6500000, rate: 0.0025 },
                { max: 6850000, rate: 0.005 },
                { max: 7300000, rate: 0.0075 },
                { max: 9200000, rate: 0.01 },
                { max: 10750000, rate: 0.015 },
                { max: 11250000, rate: 0.02 },
                { max: 11600000, rate: 0.025 },
                { max: 12600000, rate: 0.03 },
                { max: 13600000, rate: 0.04 },
                { max: 14950000, rate: 0.05 },
                { max: 16400000, rate: 0.06 },
                { max: 18450000, rate: 0.07 },
                { max: 21850000, rate: 0.08 },
                { max: 26000000, rate: 0.09 },
                { max: 27700000, rate: 0.1 },
                { max: 29350000, rate: 0.11 },
                { max: 31450000, rate: 0.12 },
                { max: 33950000, rate: 0.13 },
                { max: 37100000, rate: 0.14 },
                { max: 41100000, rate: 0.15 },
                { max: 45800000, rate: 0.16 },
                { max: 49500000, rate: 0.17 },
                { max: 53800000, rate: 0.18 },
                { max: 58500000, rate: 0.19 },
                { max: 64000000, rate: 0.2 },
                { max: 71000000, rate: 0.21 },
                { max: 80000000, rate: 0.22 },
                { max: 93000000, rate: 0.23 },
                { max: 109000000, rate: 0.24 },
                { max: 129000000, rate: 0.25 },
                { max: 163000000, rate: 0.26 },
                { max: 211000000, rate: 0.27 },
                { max: 374000000, rate: 0.28 },
                { max: 459000000, rate: 0.29 },
                { max: 555000000, rate: 0.3 },
                { max: 704000000, rate: 0.31 },
                { max: 957000000, rate: 0.32 },
                { max: 1405000000, rate: 0.33 },
                { max: Infinity, rate: 0.34 },
            ],
            C: [
                { max: 6600000, rate: 0.0 },
                { max: 6950000, rate: 0.0025 },
                { max: 7350000, rate: 0.005 },
                { max: 7800000, rate: 0.0075 },
                { max: 8850000, rate: 0.01 },
                { max: 9800000, rate: 0.0125 },
                { max: 10950000, rate: 0.015 },
                { max: 11200000, rate: 0.0175 },
                { max: 12050000, rate: 0.02 },
                { max: 12950000, rate: 0.03 },
                { max: 14150000, rate: 0.04 },
                { max: 15550000, rate: 0.05 },
                { max: 17050000, rate: 0.06 },
                { max: 19500000, rate: 0.07 },
                { max: 22700000, rate: 0.08 },
                { max: 26600000, rate: 0.09 },
                { max: 28100000, rate: 0.1 },
                { max: 30100000, rate: 0.11 },
                { max: 32600000, rate: 0.12 },
                { max: 35400000, rate: 0.13 },
                { max: 38900000, rate: 0.14 },
                { max: 43000000, rate: 0.15 },
                { max: 47400000, rate: 0.16 },
                { max: 51200000, rate: 0.17 },
                { max: 55800000, rate: 0.18 },
                { max: 60400000, rate: 0.19 },
                { max: 66700000, rate: 0.2 },
                { max: 74500000, rate: 0.21 },
                { max: 83200000, rate: 0.22 },
                { max: 95600000, rate: 0.23 },
                { max: 110000000, rate: 0.24 },
                { max: 134000000, rate: 0.25 },
                { max: 169000000, rate: 0.26 },
                { max: 221000000, rate: 0.27 },
                { max: 390000000, rate: 0.28 },
                { max: 463000000, rate: 0.29 },
                { max: 561000000, rate: 0.3 },
                { max: 709000000, rate: 0.31 },
                { max: 965000000, rate: 0.32 },
                { max: 1419000000, rate: 0.33 },
                { max: Infinity, rate: 0.34 },
            ],
            },

            // Kategori TER ditentukan dari nilai PTKP (bukan dari string status langsung), supaya
            // konsisten dengan hitungPTKP(): TK/0=54jt & TK/1/K/0=58,5jt -> A; TK/2,K/1=63jt &
            // TK/3,K/2=67,5jt -> B; K/3=72jt -> C.
            hitungKategoriTER: function(ptkpValue) {
                if (ptkpValue <= 58500000) return 'A';
                if (ptkpValue <= 67500000) return 'B';
                return 'C';
            },

            // Hitung PPh 21 bulanan (Masa Jan-Nov) pakai skema TER — PP 58/2023 & PMK 168/2023.
            // Bukan untuk Masa Pajak Terakhir (Desember), yang tetap pakai tarif progresif Pasal 17.
            hitungTER: function(brutoBulanan, ptkpStatus) {
                const ptkpValue = this.hitungPTKP(ptkpStatus);
                const kategori = this.hitungKategoriTER(ptkpValue);
                const table = this.TER_TABLE[kategori];
                let prevMax = 0;
                for (let i = 0; i < table.length; i++) {
                    const row = table[i];
                    if (brutoBulanan <= row.max) {
                        return {
                            kategori: kategori, tarif: row.rate,
                            pph: Math.round(brutoBulanan * row.rate),
                            layerIndex: i,
                            layerMin: prevMax + (i === 0 ? 0 : 1),
                            layerMax: row.max === Infinity ? null : row.max,
                            ptkpValue: ptkpValue
                        };
                    }
                    prevMax = row.max;
                }
                const last = table[table.length - 1];
                return {
                    kategori: kategori, tarif: last.rate,
                    pph: Math.round(brutoBulanan * last.rate),
                    layerIndex: table.length - 1, layerMin: prevMax, layerMax: null, ptkpValue: ptkpValue
                };
            },
            fmt: function(n) {
                const x = Math.round(Number(n) || 0);
                const neg = x < 0;
                const s = Math.abs(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                return (neg ? '-' : '') + s;
            },
            breakdownProgresif: function(pkp) {
                const layers = [
                    { max: 60000000, rate: 0.05, label: 's.d. Rp60 jt (5%)' },
                    { max: 250000000, rate: 0.15, label: '>60–250 jt (15%)' },
                    { max: 500000000, rate: 0.25, label: '>250–500 jt (25%)' },
                    { max: 5000000000, rate: 0.30, label: '>500 jt–5 M (30%)' },
                    { max: Infinity, rate: 0.35, label: '>5 M (35%)' }
                ];
                let sisa = Math.max(0, Number(pkp) || 0), prev = 0, rows = [], total = 0;
                for (const L of layers) {
                    if (sisa <= 0) break;
                    const span = (L.max === Infinity) ? sisa : Math.min(sisa, L.max - prev);
                    if (span > 0) {
                        const pph = span * L.rate;
                        rows.push({ label: L.label, dpp: span, rate: L.rate, pph: pph });
                        total += pph; sisa -= span;
                    }
                    prev = L.max;
                }
                return { rows: rows, total: total };
            },
            tetanggaLapisanTER: function(ptkpStatus, bruto, radius) {
                const ptkpValue = this.hitungPTKP(ptkpStatus);
                const kategori = this.hitungKategoriTER(ptkpValue);
                const table = this.TER_TABLE[kategori];
                let idx = table.length - 1;
                for (let i = 0; i < table.length; i++) {
                    if (bruto <= table[i].max) { idx = i; break; }
                }
                const r = radius == null ? 2 : radius;
                const from = Math.max(0, idx - r);
                const to = Math.min(table.length - 1, idx + r);
                const rows = [];
                let prev = from === 0 ? 0 : table[from - 1].max;
                for (let i = from; i <= to; i++) {
                    rows.push({ index: i, min: prev + (i === 0 ? 0 : 1), max: table[i].max, rate: table[i].rate, active: i === idx });
                    prev = table[i].max;
                }
                return { kategori: kategori, rows: rows, activeIndex: idx };
            },


            // PPh Badan dengan fasilitas Pasal 31E UU PPh — wajib (bukan pilihan) untuk badan
            // dengan peredaran bruto setahun <= Rp50 miliar. Tarif normal 2026 = 22% (UU HPP,
            // tidak berubah dari 2022). Fasilitas: diskon 50% dari tarif normal untuk bagian PKP
            // yang proporsional terhadap Rp4,8 miliar pertama dari peredaran bruto.
            hitungPPhBadan: function(peredaranBruto, pkp) {
                const TARIF_NORMAL = 0.22;
                const BATAS_FASILITAS = 4800000000;
                const BATAS_MAX_31E = 50000000000;
                let pkpFasilitas, pkpNonFasilitas, dapatFasilitas;

                if (pkp <= 0) {
                    return { pkpFasilitas: 0, pkpNonFasilitas: 0, pphTerutang: 0, dapatFasilitas: peredaranBruto <= BATAS_MAX_31E, fasilitasPenuh: true };
                }

                if (peredaranBruto <= BATAS_FASILITAS) {
                    pkpFasilitas = pkp;
                    pkpNonFasilitas = 0;
                    dapatFasilitas = true;
                } else if (peredaranBruto <= BATAS_MAX_31E) {
                    pkpFasilitas = (BATAS_FASILITAS / peredaranBruto) * pkp;
                    pkpNonFasilitas = pkp - pkpFasilitas;
                    dapatFasilitas = true;
                } else {
                    pkpFasilitas = 0;
                    pkpNonFasilitas = pkp;
                    dapatFasilitas = false;
                }

                const pphTerutang = pkpFasilitas * (0.5 * TARIF_NORMAL) + pkpNonFasilitas * TARIF_NORMAL;
                return {
                    pkpFasilitas: pkpFasilitas,
                    pkpNonFasilitas: pkpNonFasilitas,
                    pphTerutang: pphTerutang,
                    dapatFasilitas: dapatFasilitas,
                    fasilitasPenuh: dapatFasilitas && pkpNonFasilitas === 0
                };
            },

            // PPh Final UMKM sesuai PP 55/2022 (dulu PP 23/2018) — 0,5% x peredaran bruto,
            // untuk badan dengan peredaran bruto setahun tidak melebihi Rp4,8 miliar (opsional,
            // berlaku maks. 3 tahun pajak untuk PT sejak terdaftar/berlaku ketentuan transisi).
            hitungPPhFinalUMKM: function(peredaranBruto) {
                return peredaranBruto * 0.005;
            }
        };
        // Expose for calculators.js and other modules
        window.TaxEngine = TaxEngine;

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
            '1770SS': [
                {
                    id: 'ss1',
                    title: 'Budi (Karyawan Single)',
                    difficulty: 'Mudah',
                    scenario: 'Budi bekerja sebagai staf di PT Nusantara. Selama tahun 2025, total penghasilan bruto Budi adalah Rp 50.000.000. Budi belum menikah (TK/0). Perusahaan tidak memotong PPh 21 karena di bawah PTKP. Budi memiliki sepeda motor senilai Rp 15.000.000 dan tidak memiliki utang.',
                    questions: [
                        { id: 'q_bruto', label: '1. Penghasilan Bruto Dalam Negeri (Rp)', type: 'number', correct: 50000000, hint: 'Isi dengan total gaji setahun' },
                        { id: 'q_ptkp', label: '2. Status PTKP', type: 'select', options: ['TK/0', 'K/0', 'K/1'], correct: 'TK/0', hint: 'Budi belum menikah dan tidak ada tanggungan.' },
                        { id: 'q_harta', label: '3. Total Harta (Rp)', type: 'number', correct: 15000000, hint: 'Nilai motor yang dimiliki.' },
                        { id: 'q_utang', label: '4. Total Utang (Rp)', type: 'number', correct: 0, hint: 'Tidak ada utang.' }
                    ],
                    explanation: 'Berdasarkan UU HPP, PTKP untuk TK/0 adalah Rp 54.000.000. Karena Penghasilan Bruto (Rp 50 Juta) lebih kecil dari PTKP, maka Budi tidak memiliki Penghasilan Kena Pajak (Nihil). Form 1770 SS sangat tepat digunakan karena bruto < Rp 60 Juta dan berasal dari 1 pemberi kerja.'
                },
                {
                    id: 'ss2',
                    title: 'Sinta (Karyawan Tetap, Nihil)',
                    difficulty: 'Mudah',
                    scenario: 'Sinta bekerja sebagai admin di PT Harapan. Penghasilan bruto setahun Rp 58.000.000. Status PTKP TK/0. Perusahaan tidak memotong PPh 21 karena masih di bawah PTKP. Sinta memiliki tabungan Rp 12.000.000 dan tidak memiliki utang.',
                    questions: [
                        { id: 'q_bruto', label: 'Penghasilan Bruto Dalam Negeri (Rp)', type: 'number', correct: 58000000, hint: 'Total gaji setahun.' },
                        { id: 'q_ptkp', label: 'Status PTKP', type: 'select', options: ['TK/0', 'K/0', 'K/1'], correct: 'TK/0', hint: 'Sinta belum menikah.' },
                        { id: 'q_harta', label: 'Total Harta (Rp)', type: 'number', correct: 12000000, hint: 'Nilai tabungan yang dimiliki.' },
                        { id: 'q_utang', label: 'Total Utang (Rp)', type: 'number', correct: 0, hint: 'Tidak ada utang.' }
                    ],
                    explanation: 'Kasus ini juga sesuai 1770 SS karena penghasilan bruto di bawah Rp 60 juta dan berasal dari satu pemberi kerja. Karena PTKP lebih besar dari penghasilan bruto, SPT tetap disampaikan dengan status Nihil.'
                },
                {
                    id: 'ss3',
                    title: 'Rina (Karyawan Tetap, K/1)',
                    difficulty: 'Mudah',
                    scenario: 'Rina bekerja sebagai customer service di PT Sejahtera. Penghasilan bruto setahun Rp 58.000.000. Status PTKP K/1. Perusahaan tidak memotong PPh 21 karena penghasilannya masih berada di bawah PTKP. Rina memiliki mobil senilai Rp 20.000.000 dan cicilan kendaraan Rp 8.000.000.',
                    questions: [
                        { id: 'q_bruto', label: 'Penghasilan Bruto Dalam Negeri (Rp)', type: 'number', correct: 58000000, hint: 'Jumlah penghasilan setahun.' },
                        { id: 'q_ptkp', label: 'Status PTKP', type: 'select', options: ['TK/0', 'K/0', 'K/1'], correct: 'K/1', hint: 'Rina menikah dan memiliki satu anak.' },
                        { id: 'q_harta', label: 'Total Harta (Rp)', type: 'number', correct: 20000000, hint: 'Nilai mobil yang dimiliki.' },
                        { id: 'q_utang', label: 'Total Utang (Rp)', type: 'number', correct: 8000000, hint: 'Total cicilan kendaraan.' }
                    ],
                    explanation: 'Kasus ini melatih pemahaman bahwa 1770 SS tetap dapat digunakan untuk karyawan dengan status PTKP yang lebih tinggi, selama penghasilan bruto dari satu pemberi kerja masih di bawah batas formulir.'
                }
            ],
            '1770S': [
                {
                    id: 's1',
                    title: 'Andi (Manajer, K/1)',
                    difficulty: 'Sedang',
                    scenario: 'Andi adalah manajer di PT Abadi. Gaji bruto setahun Rp 120.000.000. Andi sudah menikah dan memiliki 1 anak (K/1). Bukti Potong 1721-A1 menunjukkan PPh 21 telah dipotong perusahaan sebesar Rp 2.550.000.',
                    questions: [
                        { id: 'q_bruto', label: 'Penghasilan Bruto (Rp)', type: 'number', correct: 120000000, hint: 'Total dari 1721-A1' },
                        { id: 'q_ptkp_val', label: 'Nilai PTKP untuk K/1 (Rp)', type: 'number', correct: 63000000, hint: '54jt (Diri) + 4.5jt (Kawin) + 4.5jt (1 Anak)' },
                        { id: 'q_pkp', label: 'Penghasilan Kena Pajak / PKP (Rp)', type: 'number', correct: 57000000, hint: 'Bruto - PTKP (Asumsi tanpa biaya jabatan untuk penyederhanaan di soal ini)' },
                        { id: 'q_kredit', label: 'Kredit Pajak / PPh Dipotong (Rp)', type: 'number', correct: 2550000, hint: 'Pajak yang sudah dipotong perusahaan.' }
                    ],
                    explanation: 'PTKP K/1 = Rp 63.000.000 (Sesuai PMK 101/PMK.010/2016 jo UU HPP). PPh Terutang dihitung menggunakan tarif progresif Pasal 17. Karena telah dipotong perusahaan secara tepat, status SPT adalah NIHIL.'
                },
                {
                    id: 's2',
                    title: 'Dewi (K/1, Gaji Rp 95 Juta)',
                    difficulty: 'Sedang',
                    scenario: 'Dewi bekerja sebagai supervisor di PT Sentosa. Penghasilan bruto setahun Rp 95.000.000 dan status K/1. Perusahaan telah memotong PPh 21 sebesar Rp 1.900.000 selama tahun berjalan.',
                    questions: [
                        { id: 'q_bruto', label: 'Penghasilan Bruto (Rp)', type: 'number', correct: 95000000, hint: 'Jumlah gaji yang diterima setahun.' },
                        { id: 'q_ptkp_val', label: 'Nilai PTKP untuk K/1 (Rp)', type: 'number', correct: 63000000, hint: 'Diri + status kawin + 1 anak.' },
                        { id: 'q_pkp', label: 'Penghasilan Kena Pajak / PKP (Rp)', type: 'number', correct: 32000000, hint: 'Bruto dikurangi PTKP.' },
                        { id: 'q_kredit', label: 'Kredit Pajak / PPh Dipotong (Rp)', type: 'number', correct: 1900000, hint: 'Potongan pajak yang sudah dilakukan.' }
                    ],
                    explanation: 'Kasus ini menunjukkan bahwa untuk pegawai tetap dengan penghasilan di atas Rp 60 juta, SPT 1770 S tetap relevan. PTKP K/1 mengurangi penghasilan bruto sehingga muncul PKP.'
                },
                {
                    id: 's3',
                    title: 'Nadia (K/2, Gaji Rp 85 Juta)',
                    difficulty: 'Sedang',
                    scenario: 'Nadia bekerja sebagai staff keuangan di PT Mutiara. Penghasilan bruto setahun Rp 85.000.000 dan status PTKP K/2. Perusahaan telah memotong PPh 21 sebesar Rp 1.700.000 selama tahun berjalan.',
                    questions: [
                        { id: 'q_bruto', label: 'Penghasilan Bruto (Rp)', type: 'number', correct: 85000000, hint: 'Jumlah gaji yang diterima setahun.' },
                        { id: 'q_ptkp_val', label: 'Nilai PTKP untuk K/2 (Rp)', type: 'number', correct: 67500000, hint: 'Diri + status kawin + 2 anak.' },
                        { id: 'q_pkp', label: 'Penghasilan Kena Pajak / PKP (Rp)', type: 'number', correct: 17500000, hint: 'Bruto dikurangi PTKP.' },
                        { id: 'q_kredit', label: 'Kredit Pajak / PPh Dipotong (Rp)', type: 'number', correct: 1700000, hint: 'Potongan pajak yang sudah dilakukan.' }
                    ],
                    explanation: 'Kasus ini memperjelas cara menghitung PKP untuk pegawai tetap dengan status PTKP yang lebih tinggi karena tanggungan keluarga.'
                }
            ],
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
            '1770': [
                {
                    id: 'op1',
                    title: 'dr. Tirta (Dokter - Pekerjaan Bebas)',
                    difficulty: 'Sulit',
                    scenario: 'Dr. Tirta membuka praktik klinik sendiri (K/2). Penerimaan bruto selama setahun adalah Rp 800.000.000. Beliau menggunakan Norma Penghitungan Penghasilan Neto (NPPN) sebesar 50%.',
                    questions: [
                        { id: 'q_bruto', label: 'Peredaran Bruto / Omset (Rp)', type: 'number', correct: 800000000, hint: 'Total penerimaan dari praktik.' },
                        { id: 'q_neto', label: 'Penghasilan Neto (Rp)', type: 'number', correct: 400000000, hint: 'Omset x 50% (NPPN)' },
                        { id: 'q_ptkp', label: 'PTKP untuk K/2 (Rp)', type: 'number', correct: 67500000, hint: 'Diri (54jt) + Kawin (4.5jt) + 2 Anak (9jt)' },
                        { id: 'q_pkp', label: 'Penghasilan Kena Pajak (Rp)', type: 'number', correct: 332500000, hint: 'Penghasilan Neto dikurangi PTKP.' }
                    ],
                    explanation: 'Untuk Wajib Pajak Orang Pribadi yang melakukan Pekerjaan Bebas (seperti Dokter, Pengacara, Konsultan) dengan omset di bawah 4,8 Miliar, diperbolehkan menggunakan NPPN (Norma) untuk mencari Penghasilan Neto, lalu dikurangi PTKP untuk mencari PKP.'
                },
                {
                    id: 'op2',
                    title: 'Nina (Desainer Freelance, K/0)',
                    difficulty: 'Sulit',
                    scenario: 'Nina adalah desainer freelance dengan omset setahun Rp 300.000.000. Ia menggunakan norma penghitungan 50% dan status PTKP K/0. Penghasilannya berasal dari pekerjaan bebas tanpa pemberi kerja tetap.',
                    questions: [
                        { id: 'q_bruto', label: 'Peredaran Bruto / Omset (Rp)', type: 'number', correct: 300000000, hint: 'Total omzet selama setahun.' },
                        { id: 'q_neto', label: 'Penghasilan Neto (Rp)', type: 'number', correct: 150000000, hint: 'Omset x 50%.' },
                        { id: 'q_ptkp', label: 'PTKP untuk K/0 (Rp)', type: 'number', correct: 54000000, hint: 'PTKP untuk diri sendiri saja.' },
                        { id: 'q_pkp', label: 'Penghasilan Kena Pajak (Rp)', type: 'number', correct: 96000000, hint: 'Neto dikurangi PTKP.' }
                    ],
                    explanation: 'Kasus ini mencerminkan pelaku usaha kecil yang menggunakan Norma Penghitungan Penghasilan Neto untuk menghitung penghasilan kena pajak dalam SPT 1770.'
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
            'SPT_LENGKAP': [
                {
                    id: 'lengkap1',
                    title: 'Hendra Wijaya (Karyawan, Dua Pemberi Kerja, K/2)',
                    difficulty: 'Sedang',
                    scenario: 'Hendra Wijaya adalah Manajer Operasional di PT Cahaya Abadi. Ia menikah dan memiliki 2 anak yang menjadi tanggungan. Selama Tahun Pajak 2025, Bukti Potong 1721-A1 dari PT Cahaya Abadi menunjukkan penghasilan neto Rp 195.000.000 dengan PPh 21 telah dipotong Rp 12.300.000. Hendra juga menjadi dosen tamu paruh waktu di sebuah universitas dengan penghasilan neto Rp 30.000.000 dan PPh 21 dipotong Rp 1.500.000 (Bukti Potong terpisah). Sepanjang tahun, Hendra membayar zakat wajib melalui BAZNAS sebesar Rp 4.000.000 (ada bukti setor resmi). Pada akhir tahun, Hendra memiliki harta berupa rumah (Rp 850.000.000), mobil (Rp 320.000.000), tabungan & deposito (Rp 75.000.000), dan saham (Rp 40.000.000). Utangnya adalah sisa KPR rumah Rp 380.000.000 dan sisa kredit mobil Rp 60.000.000. Hendra hanya menerima penghasilan teratur dari pekerjaan.',
                    questions: [
                        { id: 'q_ptkp_status', label: 'Bagian A.7 (implisit) — Status PTKP Hendra', type: 'select', options: ['TK/0', 'K/0', 'K/1', 'K/2', 'K/3'], correct: 'K/2', hint: 'Menikah (K) + 2 anak tanggungan = K/2.' },
                        { id: 'q_1a', label: 'Induk Bagian B Angka 1.a — Penghasilan Neto Dalam Negeri dari Pekerjaan (Rp)', type: 'text', correct: 225000000, hint: 'Jumlahkan penghasilan neto dari kedua Bukti Potong (Lampiran 1 Bagian D): Rp195.000.000 + Rp30.000.000.' },
                        { id: 'q_2', label: 'Induk Bagian B Angka 2 — Jumlah Penghasilan Neto (Rp)', type: 'text', correct: 225000000, hint: 'Karena tidak ada penghasilan usaha, dalam negeri lainnya, atau luar negeri, jumlahnya sama dengan Angka 1.a.' },
                        { id: 'q_4', label: 'Induk Bagian C Angka 4 — Penghasilan Neto Setelah Pengurang (Rp)', type: 'text', correct: 221000000, hint: 'Angka 2 dikurangi zakat wajib (Angka 3): Rp225.000.000 - Rp4.000.000.' },
                        { id: 'q_5_ptkp', label: 'Induk Bagian C Angka 5 — Penghasilan Tidak Kena Pajak / PTKP (Rp)', type: 'text', correct: 67500000, hint: 'PTKP K/2 = Rp54.000.000 (diri) + Rp4.500.000 (kawin) + (2 x Rp4.500.000) (tanggungan), sesuai PMK 101/PMK.010/2016 jo. UU HPP.' },
                        { id: 'q_6_pkp', label: 'Induk Bagian C Angka 6 — Penghasilan Kena Pajak / PKP (Rp)', type: 'text', correct: 153500000, hint: 'Angka 4 dikurangi Angka 5: Rp221.000.000 - Rp67.500.000.' },
                        { id: 'q_7_terutang', label: 'Induk Bagian C Angka 7 — PPh Terutang (Rp)', type: 'text', correct: 17025000, hint: 'Tarif Pasal 17 progresif: (5% x Rp60.000.000) + (15% x Rp93.500.000) = Rp3.000.000 + Rp14.025.000.' },
                        { id: 'q_10a', label: 'Induk Bagian D Angka 10.a — PPh Dipotong/Dipungut Pihak Lain (Rp)', type: 'text', correct: 13800000, hint: 'Jumlahkan PPh 21 dari kedua Bukti Potong: Rp12.300.000 + Rp1.500.000 (Lampiran 1 Bagian E).' },
                        { id: 'q_11a', label: 'Induk Bagian E Angka 11.a — PPh Kurang/(Lebih) Bayar (Rp)', type: 'text', correct: 3225000, hint: 'Angka 9 dikurangi Angka 10.a: Rp17.025.000 - Rp13.800.000 (10.b, 10.c, 10.d = 0).' },
                        { id: 'q_13a_status', label: 'Induk Bagian H Angka 13.a — Hanya Menerima Penghasilan Teratur?', type: 'select', options: ['Ya', 'Tidak'], correct: 'Ya', hint: 'Hendra hanya karyawan dengan penghasilan teratur dari dua pemberi kerja, jadi jawab "Ya".' },
                        { id: 'q_13a_nilai', label: 'Induk Bagian H Angka 13.a — Angsuran PPh 25 Tahun Pajak Berikutnya (Rp)', type: 'text', correct: 268750, hint: 'Formula: 1/12 x (Angka 9 - Angka 10.a) = 1/12 x Rp3.225.000.' },
                        { id: 'q_14a_harta', label: 'Induk Bagian I Angka 14.a — Total Harta pada Akhir Tahun Pajak (Rp)', type: 'text', correct: 1285000000, hint: 'Jumlahkan seluruh harta: rumah + mobil + tabungan/deposito + saham.' },
                        { id: 'q_14b_utang', label: 'Induk Bagian I Angka 14.b — Total Utang pada Akhir Tahun Pajak (Rp)', type: 'text', correct: 440000000, hint: 'Jumlahkan sisa KPR + sisa kredit mobil.' }
                    ],
                    explanation: 'Kasus ini melatih alur LENGKAP Induk SPT 1770 untuk karyawan dengan lebih dari satu pemberi kerja: mulai dari penentuan status PTKP (PMK 101/PMK.010/2016 jo. UU HPP), penjumlahan penghasilan neto dari Lampiran 1 Bagian D, pengurang penghasilan neto berupa zakat resmi (Lampiran 5 Bagian A), penghitungan PKP dan PPh terutang dengan tarif progresif Pasal 17 UU PPh, kredit pajak dari Lampiran 1 Bagian E, hingga status kurang bayar dan kewajiban angsuran PPh Pasal 25 tahun berikutnya karena hanya berpenghasilan teratur. Harta dan utang dilaporkan di Lampiran 1 Bagian A dan B.'
                },
                {
                    id: 'lengkap2',
                    title: 'Ratna Kusuma (Notaris/PPAT, Pekerjaan Bebas dengan NPPN)',
                    difficulty: 'Sulit',
                    scenario: 'Ratna Kusuma menjalankan praktik Notaris/PPAT secara mandiri (pekerjaan bebas), berstatus menikah tanpa anak (K/0). Ia berhak dan memilih menggunakan Norma Penghitungan Penghasilan Neto (NPPN) sebesar 50% untuk jasa profesi hukum. Penerimaan bruto praktiknya selama Tahun Pajak 2025 adalah Rp 480.000.000. Ratna rutin membayar zakat wajib Rp 6.000.000 melalui lembaga resmi. Karena berstatus pekerja bebas, ia membayar sendiri angsuran PPh Pasal 25 setiap bulan sebesar Rp 1.500.000 (total setahun) dan tidak ada penghasilan yang dipotong pihak lain. Pada akhir tahun, hartanya terdiri dari ruko kantor (Rp 650.000.000), mobil dinas (Rp 280.000.000), tabungan (Rp 95.000.000), dan perhiasan (Rp 25.000.000). Ia masih memiliki sisa pinjaman bank untuk ruko sebesar Rp 150.000.000.',
                    questions: [
                        { id: 'q_ptkp_status', label: 'Status PTKP Ratna', type: 'select', options: ['TK/0', 'K/0', 'K/1'], correct: 'K/0', hint: 'Menikah tanpa anak tanggungan = K/0.' },
                        { id: 'q_neto_usaha', label: 'Lampiran 3B Bagian C — Penghasilan Neto dari Pekerjaan Bebas (NPPN) (Rp)', type: 'text', correct: 240000000, hint: 'Peredaran bruto x Norma: Rp480.000.000 x 50%.' },
                        { id: 'q_1b', label: 'Induk Bagian B Angka 1.b.5) — Penghasilan Neto dari Usaha/Pekerjaan Bebas Setahun (Rp)', type: 'text', correct: 240000000, hint: 'Nilai ini sama dengan hasil perhitungan NPPN sebelumnya.' },
                        { id: 'q_2', label: 'Induk Bagian B Angka 2 — Jumlah Penghasilan Neto (Rp)', type: 'text', correct: 240000000, hint: 'Tidak ada penghasilan dari pekerjaan sebagai karyawan, sehingga sama dengan Angka 1.b.' },
                        { id: 'q_4', label: 'Induk Bagian C Angka 4 — Penghasilan Neto Setelah Pengurang (Rp)', type: 'text', correct: 234000000, hint: 'Rp240.000.000 dikurangi zakat wajib Rp6.000.000.' },
                        { id: 'q_5_ptkp', label: 'Induk Bagian C Angka 5 — PTKP (Rp)', type: 'text', correct: 58500000, hint: 'PTKP K/0 = Rp54.000.000 + Rp4.500.000 (status kawin).' },
                        { id: 'q_6_pkp', label: 'Induk Bagian C Angka 6 — PKP (Rp)', type: 'text', correct: 175500000, hint: 'Rp234.000.000 - Rp58.500.000.' },
                        { id: 'q_7_terutang', label: 'Induk Bagian C Angka 7 — PPh Terutang (Rp)', type: 'text', correct: 20325000, hint: '(5% x Rp60.000.000) + (15% x Rp115.500.000) = Rp3.000.000 + Rp17.325.000.' },
                        { id: 'q_10b', label: 'Induk Bagian D Angka 10.b — Angsuran PPh Pasal 25 Dibayar Sendiri (Rp)', type: 'text', correct: 18000000, hint: 'Rp1.500.000 x 12 bulan.' },
                        { id: 'q_11a', label: 'Induk Bagian E Angka 11.a — PPh Kurang/(Lebih) Bayar (Rp)', type: 'text', correct: 2325000, hint: 'Angka 9 dikurangi Angka 10.b (tidak ada 10.a karena tidak dipotong pihak lain): Rp20.325.000 - Rp18.000.000.' },
                        { id: 'q_13a_status', label: 'Induk Bagian H Angka 13.a — Hanya Menerima Penghasilan Teratur?', type: 'select', options: ['Ya', 'Tidak'], correct: 'Tidak', hint: 'Sebagai pekerja bebas, penghasilan Ratna dianggap tidak teratur seperti karyawan, sehingga ia harus menyusun sendiri angsuran melalui Lampiran 4 Bagian A.' },
                        { id: 'q_13b_nilai', label: 'Lampiran 4 Bagian A — Angsuran PPh 25 Tahun Pajak Berikutnya (Rp)', type: 'text', correct: 1693750, hint: 'Formula umum: 1/12 x (PPh Terutang - PPh dipotong pihak lain) = 1/12 x (Rp20.325.000 - Rp0). Perhatikan: angsuran yang DIBAYAR SENDIRI (10.b) tidak mengurangi dasar perhitungan ini.' },
                        { id: 'q_14a_harta', label: 'Induk Bagian I Angka 14.a — Total Harta (Rp)', type: 'text', correct: 1050000000, hint: 'Ruko + mobil dinas + tabungan + perhiasan.' },
                        { id: 'q_14b_utang', label: 'Induk Bagian I Angka 14.b — Total Utang (Rp)', type: 'text', correct: 150000000, hint: 'Sisa pinjaman bank untuk ruko.' }
                    ],
                    explanation: 'Kasus pekerja bebas menunjukkan dua perbedaan penting dari kasus karyawan: (1) penghasilan neto dihitung dengan NPPN sesuai Lampiran 3B Bagian C, dan (2) kredit pajak berasal dari angsuran PPh 25 yang dibayar SENDIRI (10.b), bukan dipotong pihak lain (10.a). Karena statusnya bukan "penghasilan teratur", angsuran PPh 25 tahun berikutnya wajib dihitung sendiri melalui Lampiran 4 Bagian A, dengan dasar PPh Terutang penuh dikurangi hanya kredit pajak yang dipotong pihak lain — bukan angsuran yang sudah dibayar sendiri tahun berjalan.'
                },
                {
                    id: 'lengkap3',
                    title: 'Yusuf Pratama (Karyawan + Usaha Dagang, Penghasilan Campuran K/3)',
                    difficulty: 'Sangat Sulit',
                    scenario: 'Yusuf Pratama menjabat sebagai Direktur di PT Sinar Abadi dan berstatus menikah dengan 3 anak tanggungan (K/3). Bukti Potong 1721-A1 menunjukkan penghasilan neto Rp 420.000.000 dengan PPh 21 dipotong Rp 45.000.000. Di luar pekerjaannya, Yusuf memiliki usaha dagang bahan bangunan yang menyelenggarakan pembukuan stelsel akrual (Lampiran 3A-1). Laporan Laba Rugi usahanya menunjukkan Laba Komersial sebelum pajak Rp 180.000.000, dengan koreksi fiskal positif berupa biaya sumbangan tidak resmi Rp 15.000.000 dan PPh Final yang salah dibebankan sebagai biaya Rp 5.000.000. Yusuf membayar zakat wajib Rp 10.000.000 melalui lembaga resmi. Sepanjang tahun, ia membayar sendiri angsuran PPh Pasal 25 atas usahanya sebesar Rp 3.000.000 per bulan. Pada akhir tahun, hartanya meliputi rumah (Rp 1.200.000.000), ruko usaha (Rp 650.000.000), mobil pribadi (Rp 350.000.000), mobil operasional toko (Rp 220.000.000), dan tabungan/deposito (Rp 180.000.000). Utangnya adalah sisa KPR rumah Rp 500.000.000 dan sisa kredit modal usaha Rp 300.000.000.',
                    questions: [
                        { id: 'q_ptkp_status', label: 'Status PTKP Yusuf', type: 'select', options: ['K/1', 'K/2', 'K/3'], correct: 'K/3', hint: 'Menikah + 3 anak tanggungan = K/3 (batas maksimal tanggungan yang diakui adalah 3).' },
                        { id: 'q_laba_komersial', label: 'Lampiran 3A-1 — Laba (Rugi) Komersial Usaha Dagang (Rp)', type: 'text', correct: 180000000, hint: 'Sesuai Laporan Laba Rugi komersial usaha.' },
                        { id: 'q_koreksi_positif', label: 'Lampiran 3A-1 — Total Koreksi Fiskal Positif (Rp)', type: 'text', correct: 20000000, hint: 'Sumbangan tidak resmi (Rp15.000.000) + PPh Final yang salah dibiayakan (Rp5.000.000) tidak boleh menjadi pengurang penghasilan bruto (Pasal 9 UU PPh).' },
                        { id: 'q_laba_fiskal', label: 'Lampiran 3A-1 — Laba (Rugi) Fiskal Usaha Dagang (Rp)', type: 'text', correct: 200000000, hint: 'Laba Komersial ditambah Total Koreksi Fiskal Positif: Rp180.000.000 + Rp20.000.000.' },
                        { id: 'q_1a', label: 'Induk Bagian B Angka 1.a — Penghasilan Neto dari Pekerjaan (Rp)', type: 'text', correct: 420000000, hint: 'Sesuai Bukti Potong 1721-A1 dari PT Sinar Abadi.' },
                        { id: 'q_1b', label: 'Induk Bagian B Angka 1.b.5) — Penghasilan Neto dari Usaha (Rp)', type: 'text', correct: 200000000, hint: 'Nilai Laba Fiskal usaha dagang yang telah direkonsiliasi.' },
                        { id: 'q_2', label: 'Induk Bagian B Angka 2 — Jumlah Penghasilan Neto (Rp)', type: 'text', correct: 620000000, hint: 'Angka 1.a + Angka 1.b: Rp420.000.000 + Rp200.000.000.' },
                        { id: 'q_4', label: 'Induk Bagian C Angka 4 — Penghasilan Neto Setelah Pengurang (Rp)', type: 'text', correct: 610000000, hint: 'Rp620.000.000 dikurangi zakat wajib Rp10.000.000.' },
                        { id: 'q_5_ptkp', label: 'Induk Bagian C Angka 5 — PTKP (Rp)', type: 'text', correct: 72000000, hint: 'PTKP K/3 = Rp54.000.000 + Rp4.500.000 (kawin) + (3 x Rp4.500.000) (tanggungan maksimal).' },
                        { id: 'q_6_pkp', label: 'Induk Bagian C Angka 6 — PKP (Rp)', type: 'text', correct: 538000000, hint: 'Rp610.000.000 - Rp72.000.000.' },
                        { id: 'q_7_terutang', label: 'Induk Bagian C Angka 7 — PPh Terutang (Rp)', type: 'text', correct: 105400000, hint: 'Tarif progresif: (5% x 60jt) + (15% x 190jt) + (25% x 250jt) + (30% x 38jt) = 3jt + 28,5jt + 62,5jt + 11,4jt.' },
                        { id: 'q_10a', label: 'Induk Bagian D Angka 10.a — PPh Dipotong/Dipungut Pihak Lain (Rp)', type: 'text', correct: 45000000, hint: 'PPh 21 dari Bukti Potong 1721-A1 PT Sinar Abadi.' },
                        { id: 'q_10b', label: 'Induk Bagian D Angka 10.b — Angsuran PPh 25 Dibayar Sendiri (Rp)', type: 'text', correct: 36000000, hint: 'Rp3.000.000 x 12 bulan, angsuran atas usaha dagang.' },
                        { id: 'q_11a', label: 'Induk Bagian E Angka 11.a — PPh Kurang/(Lebih) Bayar (Rp)', type: 'text', correct: 24400000, hint: 'Angka 9 - 10.a - 10.b: Rp105.400.000 - Rp45.000.000 - Rp36.000.000.' },
                        { id: 'q_13a_status', label: 'Induk Bagian H Angka 13.a — Hanya Menerima Penghasilan Teratur?', type: 'select', options: ['Ya', 'Tidak'], correct: 'Tidak', hint: 'Yusuf memiliki penghasilan campuran (gaji + usaha), bukan hanya penghasilan teratur, sehingga wajib mengisi Lampiran 4 Bagian A.' },
                        { id: 'q_13b_nilai', label: 'Lampiran 4 Bagian A — Angsuran PPh 25 Tahun Pajak Berikutnya (Rp, dibulatkan ke bawah dalam ribuan rupiah)', type: 'text', correct: 5033000, hint: '1/12 x (Angka 9 - Angka 10.a saja, TANPA mengurangi 10.b) = 1/12 x (Rp105.400.000 - Rp45.000.000) = Rp5.033.333, dibulatkan ke bawah menjadi Rp5.033.000.' },
                        { id: 'q_14a_harta', label: 'Induk Bagian I Angka 14.a — Total Harta (Rp)', type: 'text', correct: 2600000000, hint: 'Jumlahkan rumah, ruko usaha, 2 unit mobil, dan tabungan/deposito.' },
                        { id: 'q_14b_utang', label: 'Induk Bagian I Angka 14.b — Total Utang (Rp)', type: 'text', correct: 800000000, hint: 'Sisa KPR rumah + sisa kredit modal usaha.' }
                    ],
                    explanation: 'Ini adalah kasus SPT 1770 paling kompleks: Wajib Pajak dengan penghasilan CAMPURAN dari pekerjaan (karyawan) dan usaha (pembukuan). Penghasilan usaha harus melalui rekonsiliasi fiskal terlebih dahulu (Lampiran 3A-1) sebelum digabungkan dengan penghasilan pekerjaan di Induk Angka 2. Kredit pajak berasal dari DUA sumber sekaligus: dipotong pihak lain (10.a, dari gaji) dan dibayar sendiri (10.b, dari usaha). Karena berpenghasilan campuran, Yusuf tidak bisa menggunakan jalur cepat 13.a dan wajib menyusun sendiri angsuran PPh 25 tahun berikutnya via Lampiran 4 Bagian A — dengan catatan penting bahwa dasar perhitungannya hanya mengurangi kredit yang dipotong pihak lain (10.a), bukan yang sudah dibayar sendiri (10.b), agar tidak terjadi pengurangan ganda.'
                },
                {
                    id: 'lengkap4',
                    title: 'Lina Marlina (Karyawan Tetap, K/1, Zakat Wajib)',
                    difficulty: 'Sedang',
                    scenario: 'Lina Marlina bekerja sebagai staf administrasi di PT Bintang Makmur. Ia menikah dan memiliki 1 anak (K/1). Bukti Potong 1721-A1 pada Tahun Pajak 2025 menunjukkan penghasilan neto Rp 180.000.000 dan PPh 21 dipotong Rp 9.000.000. Lina juga membayar zakat wajib Rp 3.000.000 melalui lembaga resmi. Pada akhir tahun, ia memiliki rumah Rp 600.000.000, tabungan Rp 40.000.000, perhiasan Rp 25.000.000, serta utang KPR rumah Rp 250.000.000.',
                    questions: [
                        { id: 'q_ptkp_status', label: 'Status PTKP Lina', type: 'select', options: ['TK/0', 'K/0', 'K/1', 'K/2'], correct: 'K/1', hint: 'Menikah dan memiliki 1 anak tanggungan.' },
                        { id: 'q_1a', label: 'Induk Bagian B Angka 1.a — Penghasilan Neto Dalam Negeri dari Pekerjaan (Rp)', type: 'text', correct: 180000000, hint: 'Sesuai Bukti Potong 1721-A1.' },
                        { id: 'q_2', label: 'Induk Bagian B Angka 2 — Jumlah Penghasilan Neto (Rp)', type: 'text', correct: 180000000, hint: 'Tidak ada penghasilan lain yang dilaporkan.' },
                        { id: 'q_4', label: 'Induk Bagian C Angka 4 — Penghasilan Neto Setelah Pengurang (Rp)', type: 'text', correct: 177000000, hint: 'Angka 2 dikurangi zakat wajib Rp3.000.000.' },
                        { id: 'q_5_ptkp', label: 'Induk Bagian C Angka 5 — PTKP (Rp)', type: 'text', correct: 63000000, hint: 'PTKP K/1 = Rp54.000.000 + Rp4.500.000 (kawin) + Rp4.500.000 (1 anak).' },
                        { id: 'q_6_pkp', label: 'Induk Bagian C Angka 6 — PKP (Rp)', type: 'text', correct: 114000000, hint: 'Angka 4 dikurangi Angka 5.' },
                        { id: 'q_7_terutang', label: 'Induk Bagian C Angka 7 — PPh Terutang (Rp)', type: 'text', correct: 11100000, hint: 'Tarif progresif: 5% x Rp60.000.000 + 15% x Rp54.000.000.' },
                        { id: 'q_10a', label: 'Induk Bagian D Angka 10.a — PPh Dipotong/Dipungut Pihak Lain (Rp)', type: 'text', correct: 9000000, hint: 'PPh 21 yang telah dipotong perusahaan.' },
                        { id: 'q_11a', label: 'Induk Bagian E Angka 11.a — PPh Kurang/(Lebih) Bayar (Rp)', type: 'text', correct: 2100000, hint: 'Angka 9 dikurangi Angka 10.a.' },
                        { id: 'q_13a_status', label: 'Induk Bagian H Angka 13.a — Hanya Menerima Penghasilan Teratur?', type: 'select', options: ['Ya', 'Tidak'], correct: 'Ya', hint: 'Lina hanya menerima penghasilan teratur dari satu pemberi kerja.' },
                        { id: 'q_13a_nilai', label: 'Induk Bagian H Angka 13.a — Angsuran PPh 25 Tahun Pajak Berikutnya (Rp)', type: 'text', correct: 175000, hint: '1/12 x (Angka 9 - Angka 10.a).' },
                        { id: 'q_14a_harta', label: 'Induk Bagian I Angka 14.a — Total Harta (Rp)', type: 'text', correct: 665000000, hint: 'Jumlahkan rumah, tabungan, dan perhiasan.' },
                        { id: 'q_14b_utang', label: 'Induk Bagian I Angka 14.b — Total Utang (Rp)', type: 'text', correct: 250000000, hint: 'Sisa utang KPR rumah.' }
                    ],
                    explanation: 'Kasus ini mengulang alur SPT 1770 untuk karyawan tetap, tetapi menambahkan unsur zakat wajib dan pelaporan harta serta utang pada bagian lampiran. Fokus utamanya adalah menghitung PKP, PPh terutang, dan kredit pajak yang tersedia atas penghasilan teratur.'
                }
            ]
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
            
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                if (savedTheme === 'dark') document.body.setAttribute('data-theme', 'dark');
                else document.body.removeAttribute('data-theme');
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.setAttribute('data-theme', 'dark');
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

            // Login UI hanya ada di Portal. Di SPT: tampilkan tombol "Login di Portal" jika masih tamu.
            const portalHint = document.getElementById('auth-portal-hint');
            if (portalHint) {
                if (appState.user.email) {
                    portalHint.style.display = 'none';
                } else {
                    portalHint.style.display = 'inline-flex';
                    portalHint.textContent = 'Login di Portal';
                }
            }
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

        function toggleTheme() {
            const body = document.body;
            if(body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }
            const themeToggle = document.getElementById('theme-toggle');
            if(themeToggle) themeToggle.checked = document.body.getAttribute('data-theme') === 'dark';
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if(!sidebar) return;
            const backdrop = document.getElementById('sidebar-backdrop');
            const isMobile = window.matchMedia('(max-width: 768px)').matches;

            // FIX: di mobile, tombol ini buka/tutup drawer (mobile-open + backdrop gelap).
            // Di desktop, tombol ini tetap perilaku lama: mengecilkan sidebar jadi ikon saja (collapsed).
            let isOpenNow;
            if (isMobile) {
                sidebar.classList.toggle('mobile-open');
                isOpenNow = sidebar.classList.contains('mobile-open');
                if (backdrop) backdrop.classList.toggle('active', isOpenNow);
            } else {
                sidebar.classList.toggle('collapsed');
                isOpenNow = !sidebar.classList.contains('collapsed');
            }

            const toggleBtn = document.getElementById('sidebar-toggle');
            if(toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', String(isOpenNow));
                toggleBtn.setAttribute('title', isOpenNow ? 'Sembunyikan menu' : 'Buka menu');
            }
        }

        // FIX: tutup drawer mobile otomatis begitu backdrop di-tap, atau salah satu menu navigasi dipilih —
        // supaya user tidak perlu tap ☰ dua kali (buka menu -> pilih menu -> harus tutup manual lagi).
        function closeMobileSidebar() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (backdrop) backdrop.classList.remove('active');
        }
        document.addEventListener('DOMContentLoaded', function() {
            const backdrop = document.getElementById('sidebar-backdrop');
            if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);

            document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (window.matchMedia('(max-width: 768px)').matches) closeMobileSidebar();
                });
            });

            // Reset state kalau layar di-rotate/resize dari mobile ke desktop supaya tidak nyangkut terbuka
            window.addEventListener('resize', function() {
                if (!window.matchMedia('(max-width: 768px)').matches) closeMobileSidebar();
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
            if(databaseKasus[moduleKey] && databaseKasus[moduleKey][0]) {
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
            const generatorTersedia = (moduleType === '1770SS' || moduleType === '1770S' || moduleType === 'PPh21');
            genBox.style.display = generatorTersedia ? 'flex' : 'none';
            genChk.checked = false;

            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.getElementById('view-modeselect').classList.add('active');
            document.getElementById('page-title').innerText = `Persiapan Modul: ${moduleType}`;
            document.getElementById('page-subtitle').innerText = "Pilih mode pengerjaan.";
        }

        // ==========================================
        // MODE ISI FORMULIR SPT 1770 (bukan Q&A) — data kasus, kalkulasi live, grading
        // Struktur lengkap: Lampiran I (usaha), Lampiran II (bukti potong), Lampiran III
        // (final & bukan objek pajak), Lampiran IV (harta, utang, susunan keluarga), Induk.
        // ==========================================
        const Form1770Cases = [
            {
                id: 'f1770-1',
                title: 'Herman Wijaya — Toko Bangunan "Sumber Rejeki"',
                narrative: `Herman Wijaya (status PTKP TK/0, belum menikah, tidak ada tanggungan) adalah pemilik Toko Bangunan "Sumber Rejeki" di Surabaya, yang menyelenggarakan pembukuan. Selama tahun pajak berjalan:

USAHA (Lampiran I):
- Peredaran bruto usaha: Rp 1.850.000.000
- Harga Pokok Penjualan (HPP): Rp 1.240.000.000
- Biaya usaha lainnya (gaji karyawan, listrik, sewa toko, dll): Rp 320.000.000

BUKTI POTONG DARI PIHAK LAIN (Lampiran II):
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
                    peredaranBruto: 1850000000, hpp: 1240000000, biayaUsaha: 320000000,
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
                narrative: `Sari Puspita (status PTKP K/2, menikah dengan 2 anak yang menjadi tanggungan) adalah pemilik Salon Kecantikan "Sari Ayu" di Bandung, yang menyelenggarakan pembukuan. Selama tahun pajak berjalan:

USAHA (Lampiran I):
- Peredaran bruto usaha: Rp 420.000.000
- Harga Pokok Penjualan / bahan-bahan salon (HPP): Rp 95.000.000
- Biaya usaha lainnya (gaji karyawan, sewa tempat, listrik, dll): Rp 180.000.000

BUKTI POTONG DARI PIHAK LAIN (Lampiran II):
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
                    peredaranBruto: 420000000, hpp: 95000000, biayaUsaha: 180000000,
                    buktiPotong: [
                        { namaPemotong: 'Salon Partner Kosmetik Indah', npwp: '02.345.678.9-424.000', jenisPajak: 'PPh 23', noBukti: '00789/PPh23/VIII/2026', jumlah: 8000000 }
                    ],
                    penghasilanFinal: [
                        { jenis: 'Bunga Deposito/Tabungan', dpp: 2000000, tarif: 20, pphFinal: 400000 }
                    ],
                    penghasilanBukanObjek: [],
                    netoDNLainnya: 0, zakat: 0, kompensasiKerugian: 0,
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
            }
        ];

        let form1770State = { case: null, hartaCounter: 0, utangCounter: 0, bpCounter: 0, finalCounter: 0, bukanObjekCounter: 0, keluargaCounter: 0 };

        function openForm1770() {
            const kasus = Form1770Cases[Math.floor(Math.random() * Form1770Cases.length)];
            form1770State = { case: kasus, hartaCounter: 0, utangCounter: 0, bpCounter: 0, finalCounter: 0, bukanObjekCounter: 0, keluargaCounter: 0 };

            document.getElementById('f1770-title').innerText = kasus.title;
            document.getElementById('f1770-narrative').innerText = kasus.narrative;

            ['peredaranBruto','hpp','biayaUsaha','netoDNLainnya','zakat','kompensasiKerugian'].forEach(function(id) {
                const el = document.getElementById('f1770-' + id);
                if (el) el.value = '';
            });
            document.getElementById('f1770-ptkpStatus').value = '';
            document.getElementById('f1770-harta-rows').innerHTML = '';
            document.getElementById('f1770-utang-rows').innerHTML = '';
            document.getElementById('f1770-buktipotong-rows').innerHTML = '';
            document.getElementById('f1770-final-rows').innerHTML = '';
            document.getElementById('f1770-bukanobjek-rows').innerHTML = '';
            document.getElementById('f1770-keluarga-rows').innerHTML = '';

            switchForm1770Tab(1);
            recalcForm1770();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-form1770').classList.add('active');
            document.getElementById('page-title').innerText = 'Isi Formulir SPT 1770';
            document.getElementById('page-subtitle').innerText = 'Isi seperti formulir asli — baca kasus, lalu isi tiap lampiran.';
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

        // ---- Lampiran II: Bukti Potong ----
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

        function recalcForm1770() {
            const peredaranBruto = cleanNumber(document.getElementById('f1770-peredaranBruto').value);
            const hpp = cleanNumber(document.getElementById('f1770-hpp').value);
            const biayaUsaha = cleanNumber(document.getElementById('f1770-biayaUsaha').value);
            const netoUsaha = peredaranBruto - hpp - biayaUsaha;
            document.getElementById('f1770-netoUsaha').innerText = fmtRpForm1770(netoUsaha);
            document.getElementById('f1770-netoUsaha-2').innerText = fmtRpForm1770(netoUsaha);

            let totalKreditPajak = 0;
            document.querySelectorAll('#f1770-buktipotong-rows .f1770-nilai').forEach(function(el) { totalKreditPajak += cleanNumber(el.value); });
            document.getElementById('f1770-totalKreditPajak').innerText = fmtRpForm1770(totalKreditPajak);
            document.getElementById('f1770-kreditPajak').innerText = fmtRpForm1770(totalKreditPajak);

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

            const netoDNLainnya = cleanNumber(document.getElementById('f1770-netoDNLainnya').value);
            const zakat = cleanNumber(document.getElementById('f1770-zakat').value);
            const jumlahNeto = netoUsaha + netoDNLainnya - zakat;
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

            const kblb = pphTerutang - totalKreditPajak;
            const kblbLabel = kblb > 0 ? ' (Kurang Bayar)' : (kblb < 0 ? ' (Lebih Bayar)' : ' (Nihil)');
            document.getElementById('f1770-kblb').innerText = fmtRpForm1770(kblb) + kblbLabel;

            let totalHarta = 0;
            document.querySelectorAll('#f1770-harta-rows .f1770-nilai').forEach(function(el) { totalHarta += cleanNumber(el.value); });
            document.getElementById('f1770-totalHarta').innerText = fmtRpForm1770(totalHarta);

            let totalUtang = 0;
            document.querySelectorAll('#f1770-utang-rows .f1770-nilai').forEach(function(el) { totalUtang += cleanNumber(el.value); });
            document.getElementById('f1770-totalUtang').innerText = fmtRpForm1770(totalUtang);

            const jumlahKeluarga = document.querySelectorAll('#f1770-keluarga-rows .form1770-dynrow').length;
            document.getElementById('f1770-jumlahKeluarga').innerText = String(jumlahKeluarga);
        }

        function checkForm1770Answers() {
            const kasus = form1770State.case;
            const correct = kasus.input;

            const userVals = {
                peredaranBruto: cleanNumber(document.getElementById('f1770-peredaranBruto').value),
                hpp: cleanNumber(document.getElementById('f1770-hpp').value),
                biayaUsaha: cleanNumber(document.getElementById('f1770-biayaUsaha').value),
                netoDNLainnya: cleanNumber(document.getElementById('f1770-netoDNLainnya').value),
                zakat: cleanNumber(document.getElementById('f1770-zakat').value),
                kompensasiKerugian: cleanNumber(document.getElementById('f1770-kompensasiKerugian').value),
                ptkpStatus: document.getElementById('f1770-ptkpStatus').value
            };

            let totalKreditPajak = 0;
            document.querySelectorAll('#f1770-buktipotong-rows .f1770-nilai').forEach(function(el) { totalKreditPajak += cleanNumber(el.value); });

            let totalPphFinal = 0;
            document.querySelectorAll('#f1770-final-rows .form1770-dynrow').forEach(function(row) {
                const dpp = cleanNumber(row.querySelector('.f1770-dpp').value);
                const tarif = cleanNumber(row.querySelector('.f1770-tarif').value);
                totalPphFinal += dpp * (tarif / 100);
            });

            let totalBukanObjek = 0;
            document.querySelectorAll('#f1770-bukanobjek-rows .f1770-nilai').forEach(function(el) { totalBukanObjek += cleanNumber(el.value); });

            let totalHarta = 0;
            document.querySelectorAll('#f1770-harta-rows .f1770-nilai').forEach(function(el) { totalHarta += cleanNumber(el.value); });
            let totalUtang = 0;
            document.querySelectorAll('#f1770-utang-rows .f1770-nilai').forEach(function(el) { totalUtang += cleanNumber(el.value); });
            const jumlahKeluarga = document.querySelectorAll('#f1770-keluarga-rows .form1770-dynrow').length;

            const correctTotalKreditPajak = correct.buktiPotong.reduce(function(a, b) { return a + b.jumlah; }, 0);
            const correctTotalPphFinal = correct.penghasilanFinal.reduce(function(a, f) { return a + f.pphFinal; }, 0);
            const correctTotalBukanObjek = correct.penghasilanBukanObjek.reduce(function(a, b) { return a + b.jumlah; }, 0);
            const correctTotalHarta = correct.harta.reduce(function(a, h) { return a + h.nilai; }, 0);
            const correctTotalUtang = correct.utang.reduce(function(a, u) { return a + u.nilai; }, 0);
            const correctJumlahKeluarga = correct.susunanKeluarga.length;

            const netoUsahaUser = userVals.peredaranBruto - userVals.hpp - userVals.biayaUsaha;
            const jumlahNetoUser = netoUsahaUser + userVals.netoDNLainnya - userVals.zakat;
            const netoSetelahKompensasiUser = jumlahNetoUser - userVals.kompensasiKerugian;
            const ptkpValueUser = userVals.ptkpStatus ? TaxEngine.hitungPTKP(userVals.ptkpStatus) : 0;
            const pkpUser = Math.max(0, Math.floor((netoSetelahKompensasiUser - ptkpValueUser) / 1000) * 1000);
            const pphTerutangUser = TaxEngine.hitungTarifProgresif(pkpUser);
            const kblbUser = pphTerutangUser - totalKreditPajak;

            const netoUsahaCorrect = correct.peredaranBruto - correct.hpp - correct.biayaUsaha;
            const jumlahNetoCorrect = netoUsahaCorrect + correct.netoDNLainnya - correct.zakat;
            const netoSetelahKompensasiCorrect = jumlahNetoCorrect - correct.kompensasiKerugian;
            const ptkpValueCorrect = TaxEngine.hitungPTKP(correct.ptkpStatus);
            const pkpCorrect = Math.max(0, Math.floor((netoSetelahKompensasiCorrect - ptkpValueCorrect) / 1000) * 1000);
            const pphTerutangCorrect = TaxEngine.hitungTarifProgresif(pkpCorrect);
            const kblbCorrect = pphTerutangCorrect - correctTotalKreditPajak;

            const checks = [
                { label: 'Peredaran Bruto Usaha (Lampiran I)', ok: userVals.peredaranBruto === correct.peredaranBruto, correctVal: fmtRpForm1770(correct.peredaranBruto) },
                { label: 'HPP (Lampiran I)', ok: userVals.hpp === correct.hpp, correctVal: fmtRpForm1770(correct.hpp) },
                { label: 'Biaya Usaha Lainnya (Lampiran I)', ok: userVals.biayaUsaha === correct.biayaUsaha, correctVal: fmtRpForm1770(correct.biayaUsaha) },
                { label: 'Total Kredit Pajak (Lampiran II)', ok: totalKreditPajak === correctTotalKreditPajak, correctVal: fmtRpForm1770(correctTotalKreditPajak) },
                { label: 'Total PPh Final (Lampiran III-A)', ok: totalPphFinal === correctTotalPphFinal, correctVal: fmtRpForm1770(correctTotalPphFinal) },
                { label: 'Total Bukan Objek Pajak (Lampiran III-B)', ok: totalBukanObjek === correctTotalBukanObjek, correctVal: fmtRpForm1770(correctTotalBukanObjek) },
                { label: 'Penghasilan Neto DN Lainnya (Induk)', ok: userVals.netoDNLainnya === correct.netoDNLainnya, correctVal: fmtRpForm1770(correct.netoDNLainnya) },
                { label: 'Zakat/Sumbangan Wajib Keagamaan (Induk)', ok: userVals.zakat === correct.zakat, correctVal: fmtRpForm1770(correct.zakat) },
                { label: 'Kompensasi Kerugian (Induk)', ok: userVals.kompensasiKerugian === correct.kompensasiKerugian, correctVal: fmtRpForm1770(correct.kompensasiKerugian) },
                { label: 'Status PTKP (Induk)', ok: userVals.ptkpStatus === correct.ptkpStatus, correctVal: correct.ptkpStatus },
                { label: 'Total Harta (Lampiran IV)', ok: totalHarta === correctTotalHarta, correctVal: fmtRpForm1770(correctTotalHarta) },
                { label: 'Total Utang (Lampiran IV)', ok: totalUtang === correctTotalUtang, correctVal: fmtRpForm1770(correctTotalUtang) },
                { label: 'Jumlah Anggota Keluarga (Lampiran IV)', ok: jumlahKeluarga === correctJumlahKeluarga, correctVal: String(correctJumlahKeluarga) + ' orang' },
                { label: 'PPh Kurang/Lebih Bayar (hasil akhir Induk)', ok: kblbUser === kblbCorrect, correctVal: fmtRpForm1770(kblbCorrect) }
            ];

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
                module: '1770 (Form Lengkap)',
                mode: 'form',
                score: score
            });
            saveData();
            updateProfileUI();

            document.querySelectorAll('.view').forEach(function(el) { el.classList.remove('active'); });
            document.getElementById('view-result').classList.add('active');
            document.getElementById('page-title').innerText = "Laporan Simulasi";
            document.getElementById('page-subtitle').innerText = "Evaluasi hasil pengisian formulir SPT 1770 Anda.";
        }

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
        // FITUR EXPORT / IMPORT DATA (BACKUP)
        // ==========================================
        function exportData() {
            const dataStr = JSON.stringify(appState.user);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', 'backup-simulator-spt.json');
            linkElement.click();
        }

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if(parsed.xp !== undefined) {
                        appState.user = parsed;
                        saveData();
                        updateProfileUI();
                        
                        if(document.getElementById('view-history').classList.contains('active')){
                            renderHistory();
                        }
                        alert('✅ Data progress Anda berhasil dimuat!');
                    } else {
                        alert('❌ File tidak valid!');
                    }
                } catch (err) {
                    alert('❌ Terjadi kesalahan saat membaca file!');
                }
            };
            reader.readAsText(file);
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
