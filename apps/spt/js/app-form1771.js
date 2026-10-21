// app-form1771.js — bagian dari app-main.js yang dipecah per tanggung jawab (perilaku identik).
// Formulir SPT 1771 (Badan): state, baris dinamis, hitung, cek jawaban.
// Classic script: dimuat BERURUTAN setelah app-main.js (lihat index.html); semua nama tetap global yang sama.

        // Form1771Cases dipindah ke js/data/kasus-spt.js (dimuat sebelum file ini di index.html) —
        // lihat komentar di file tersebut. Variabel global `Form1771Cases` tetap sama seperti sebelumnya.

                let form1771State = { case: null, kpCounter: 0, posCounter: 0, negCounter: 0, finalCounter: 0, bukanObjekCounter: 0, sahamCounter: 0, pengurusCounter: 0, hppCounter: 0, biayaCounter: 0, cabangCounter: 0 };

        function openForm1771() {
            const kasus = Form1771Cases[Math.floor(Math.random() * Form1771Cases.length)];
            form1771State = { case: kasus, kpCounter: 0, posCounter: 0, negCounter: 0, finalCounter: 0, bukanObjekCounter: 0, sahamCounter: 0, pengurusCounter: 0, hppCounter: 0, biayaCounter: 0, cabangCounter: 0 };

            document.getElementById('f1771-title').innerText = kasus.title
                + (kasus.tahunPajak ? ' — Tahun Pajak ' + kasus.tahunPajak : '');
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
            let adaKreditTidakSesuaiSkema = false;
            document.querySelectorAll('#f1771-kreditpajak-rows .form1770-dynrow').forEach(function(row) {
                const sel = row.querySelector('select');
                const jenis = sel ? sel.value : '';
                const nilai = cleanNumber(row.querySelector('.f1770-nilai').value);
                if (TaxEngine.isKreditPajak1771Dikreditkan(jenis, isUmkm ? 'umkm' : 'normal')) {
                    totalKreditPajak += nilai;
                } else if (jenis || nilai !== 0) {
                    adaKreditTidakSesuaiSkema = true;
                }
            });
            document.getElementById('f1771-totalKreditPajak').innerText = fmtRpForm1770(totalKreditPajak);
            document.getElementById('f1771-kreditPajak').innerText = fmtRpForm1770(totalKreditPajak);
            const kreditWarning = document.getElementById('f1771-kredit-warning');
            kreditWarning.hidden = !adaKreditTidakSesuaiSkema;
            kreditWarning.innerText = isUmkm
                ? 'Skema Final UMKM hanya menerima setoran PPh Final UMKM; kredit pajak lain tidak mengurangi PPh Final.'
                : 'Setoran PPh Final UMKM tidak dapat menjadi kredit pajak pada skema normal.';

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

                // 14.e: kredit pajak selain PPh 25 dan setoran PPh Final UMKM.
                let kreditDalamNegeriUntukAngsuran = 0;
                document.querySelectorAll('#f1771-kreditpajak-rows .form1770-dynrow').forEach(function(row) {
                    const sel = row.querySelector('select');
                    const jenis = sel ? sel.value : '';
                    const nilai = cleanNumber(row.querySelector('.f1770-nilai').value);
                    if (TaxEngine.isKreditPajak1771PengurangAngsuran(jenis)) kreditDalamNegeriUntukAngsuran += nilai;
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
            document.querySelectorAll('#f1771-kreditpajak-rows .form1770-dynrow').forEach(function(row) {
                const sel = row.querySelector('select');
                const jenis = sel ? sel.value : '';
                if (TaxEngine.isKreditPajak1771Dikreditkan(jenis, isUmkm ? 'umkm' : 'normal')) {
                    totalKreditPajak += cleanNumber(row.querySelector('.f1770-nilai').value);
                }
            });
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
            const correctTotalKreditPajak = correct.kreditPajak
                .filter(function(k) { return TaxEngine.isKreditPajak1771Dikreditkan(k.jenisPajak, isUmkm ? 'umkm' : 'normal'); })
                .reduce(function(a, b) { return a + b.jumlah; }, 0);
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

                // 14.e: kredit pajak selain PPh 25 dan setoran PPh Final UMKM.
                let userKreditDalamNegeri = 0;
                document.querySelectorAll('#f1771-kreditpajak-rows .form1770-dynrow').forEach(function(row) {
                    const sel = row.querySelector('select');
                    const jenis = sel ? sel.value : '';
                    const nilai = cleanNumber(row.querySelector('.f1770-nilai').value);
                    if (TaxEngine.isKreditPajak1771PengurangAngsuran(jenis)) userKreditDalamNegeri += nilai;
                });
                const correctKreditDalamNegeri = correct.kreditPajak
                    .filter(function(k) { return TaxEngine.isKreditPajak1771PengurangAngsuran(k.jenisPajak); })
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

            // Pembahasan per titik cek (rumus, dasar, jebakan) — js/data/form-pembahasan.js
            document.getElementById('result-explanation').innerHTML = FormPembahasan.render(checks);

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
