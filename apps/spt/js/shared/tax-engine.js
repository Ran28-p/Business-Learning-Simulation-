// ==============================================================================
// TaxEngine — mesin perhitungan pajak bersama untuk seluruh apps/spt
// (UU HPP / KUP: PPh OP progresif, TER PPh 21, PPh Badan 31E, PPh Final UMKM)
//
// Dipakai oleh: js/app-main.js, js/calculators.js, dan faktur_bupot/script.js.
// SEBELUMNYA tabel TER & rumus progresif ini terduplikasi manual di
// faktur_bupot/script.js — sumber duplikasi itu sudah dihapus, sekarang semua
// modul memanggil window.TaxEngine dari sini. Kalau ada revisi tarif/PTKP/TER
// di masa depan, cukup ubah SATU tempat ini.
//
// WAJIB: <script> file ini dimuat SEBELUM app-main.js / calculators.js /
// modul manapun yang memanggil TaxEngine.*.
// ==============================================================================
        // ==========================================
        // ENGINE: TAX CALCULATOR (UU HPP / KUP)
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
