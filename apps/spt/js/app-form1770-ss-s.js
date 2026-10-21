// app-form1770-ss-s.js — bagian dari app-main.js yang dipecah per tanggung jawab (perilaku identik).
// Formulir SPT 1770 SS dan 1770 S: state, baris dinamis, hitung, cek jawaban, PDF.
// Classic script: dimuat BERURUTAN setelah app-main.js (lihat index.html); semua nama tetap global yang sama.

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
