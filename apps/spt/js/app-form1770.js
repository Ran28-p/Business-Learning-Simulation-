// app-form1770.js — bagian dari app-main.js yang dipecah per tanggung jawab (perilaku identik).
// Formulir SPT 1770 (OP usaha/pekerjaan bebas): state, baris dinamis, hitung, cek jawaban, hasil.
// Classic script: dimuat BERURUTAN setelah app-main.js (lihat index.html); semua nama tetap global yang sama.

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

            // Pembahasan per titik cek (rumus, dasar, jebakan) — js/data/form-pembahasan.js
            document.getElementById('result-explanation').innerHTML = FormPembahasan.render(checks);

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
