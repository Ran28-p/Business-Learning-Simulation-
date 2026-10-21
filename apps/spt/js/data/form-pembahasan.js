// ==============================================================================
// Pembahasan per titik cek untuk mode "Isi Formulir" (1770, 1770 SS, 1770 S, 1771).
// Dipakai oleh renderForm1770FamilyResult() dan hasil 1771 di js/app-main.js:
//   FormPembahasan.render(checks) -> string HTML (semua teks di-escape)
// Setiap aturan: re (cocokkan label titik cek), rumus, dasar, jebakan.
// WAJIB: dimuat sebelum js/app-main.js. Tes: tests/test-form-pembahasan.mjs
// ==============================================================================
(function () {
    var R = [
        { re: /^Penghasilan Bruto — Angka 1/, rumus: 'Total penghasilan bruto setahun yang tercantum pada bukti potong 1721-A1 (jumlahkan bila ada lebih dari satu pemberi kerja).', dasar: 'UU PPh Pasal 21; bukti potong 1721-A1', jebakan: 'Mengambil gaji satu bulan, atau melewatkan bukti potong dari pemberi kerja kedua.' },
        { re: /^Pengurang \(Biaya Jabatan/, rumus: 'Biaya jabatan = 5% × penghasilan bruto, paling banyak Rp500.000 per bulan atau Rp6.000.000 setahun.', dasar: 'PMK 168/2023; PMK 250/PMK.03/2008', jebakan: 'Memakai 5% tanpa batas atas, sehingga angkanya melebihi Rp6.000.000.' },
        { re: /^Penghasilan Neto dari Pekerjaan/, rumus: 'Neto pekerjaan = Bruto (1721-A1) − biaya jabatan − iuran pensiun/JHT yang dibayar pegawai. Angkanya diambil dari bukti potong, bukan dihitung ulang.', dasar: 'PMK 168/2023 (biaya jabatan 5%, maks. Rp500.000/bulan atau Rp6.000.000/tahun); UU PPh Pasal 21', jebakan: 'Memakai bruto tanpa mengurangi biaya jabatan, atau menjumlahkan hanya satu dari dua bukti potong.' },
        { re: /^PPh( 21)? Dipotong/, rumus: 'Jumlahkan PPh 21 setahun yang tercantum pada seluruh bukti potong 1721-A1. Ini kredit pajak dari pihak lain, bukan PPh yang dihitung sendiri.', dasar: 'UU PPh Pasal 21 (bukti potong sebagai kredit pajak)', jebakan: 'Menghitung ulang dengan TER, atau hanya mengambil PPh bulan Desember.' },
        { re: /^Penghasilan Neto dari Usaha/, rumus: 'Pembukuan: Peredaran bruto − HPP − biaya usaha, lalu koreksi fiskal. NPPN: Peredaran bruto × norma penghasilan neto (hanya bila peredaran bruto tidak lebih dari Rp4,8 miliar).', dasar: 'UU PPh Pasal 14 (NPPN) dan Pasal 6 (biaya usaha)', jebakan: 'Memakai laba komersial tanpa koreksi fiskal, atau menerapkan norma pada peredaran yang melebihi Rp4,8 miliar.' },
        { re: /^Total Kredit Pajak Bukti Potong Usaha/, rumus: 'Jumlahkan PPh 22/23 yang dipotong atau dipungut pihak lain atas penghasilan usaha, sesuai bukti potong usaha.', dasar: 'UU PPh Pasal 22 dan 23', jebakan: 'Memasukkan PPh final (mis. sewa 10%) sebagai kredit pajak. PPh final tidak dikreditkan.' },
        { re: /^Total PPh Final/, rumus: 'Jumlahkan PPh final atas seluruh penghasilan yang sudah final (mis. sewa tanah/bangunan 10%, UMKM 0,5%, bunga deposito). Penghasilan final tidak masuk PKP dan PPh-nya tidak dikreditkan.', dasar: 'UU PPh Pasal 4 ayat (2); PP 34/2017; PP 55/2022 s.t.d.d. PP 20/2026', jebakan: 'Menghitung ulang PPh final lalu mengkreditkannya di bagian lain.' },
        { re: /^Total Bukan Objek Pajak/, rumus: 'Penghasilan yang bukan objek PPh (mis. warisan, hibah tertentu, beasiswa tertentu) hanya dilaporkan nilainya; tidak dikenai pajak dan tidak masuk PKP.', dasar: 'UU PPh Pasal 4 ayat (3)', jebakan: 'Memasukkannya ke penghasilan neto sehingga PKP membengkak.' },
        { re: /^Penghasilan Neto DN Lainnya/, rumus: 'Penghasilan neto dalam negeri lainnya (di luar pekerjaan dan usaha, bukan final) = penghasilan bruto − biaya untuk mendapatkan, menagih, dan memelihara penghasilan itu.', dasar: 'UU PPh Pasal 6 ayat (1)', jebakan: 'Memasukkan penghasilan yang sudah dikenai PPh final.' },
        { re: /^Zakat/, rumus: 'Zakat atau sumbangan wajib keagamaan yang dibayar ke lembaga resmi dikurangkan dari penghasilan neto (bukan dari PKP) dan harus dibuktikan dengan bukti setor.', dasar: 'PP 60/2010; UU PPh Pasal 9', jebakan: 'Mengurangkan sumbangan sukarela atau tanpa bukti setor.' },
        { re: /^Kompensasi Kerugian/, rumus: 'Kerugian fiskal tahun-tahun sebelumnya dikurangkan dari penghasilan neto, paling lama sampai 5 tahun berikutnya; ambil hanya sisa yang masih boleh dikompensasikan.', dasar: 'UU PPh Pasal 6 ayat (2)', jebakan: 'Mengompensasikan kerugian yang sudah melewati 5 tahun.' },
        { re: /^Status PTKP/, rumus: 'PTKP ditentukan oleh keadaan pada awal tahun pajak: TK/0 Rp54.000.000; tambah Rp4.500.000 untuk status kawin dan untuk tiap tanggungan (paling banyak 3 orang).', dasar: 'UU PPh Pasal 7; PMK 101/PMK.010/2016', jebakan: 'Memakai status saat mengisi SPT (bukan awal tahun pajak), atau menghitung tanggungan lebih dari 3.' },
        { re: /^PPh Dibayar Sendiri/, rumus: 'PPh yang sudah dibayar sendiri sepanjang tahun, terutama angsuran PPh 25 dan setoran sendiri. Bukan PPh yang dipotong pihak lain.', dasar: 'UU PPh Pasal 25', jebakan: 'Mencampurkan PPh yang dipotong pihak lain ke angka ini sehingga kredit pajak terhitung dua kali.' },
        { re: /^Hanya Menerima Penghasilan Teratur/, rumus: 'Angka ini menentukan dasar angsuran PPh 25 tahun depan. Penghasilan teratur (gaji, usaha rutin) menjadi dasar angsuran; penghasilan tidak teratur dikeluarkan dari dasar angsuran.', dasar: 'UU PPh Pasal 25', jebakan: 'Menjawab "ya" padahal ada penghasilan sekali terima (mis. bonus tahunan, keuntungan jual aset).' },
        { re: /^Angsuran PPh 25/, rumus: 'Angsuran per bulan = (PPh terutang − kredit pajak yang dapat diperhitungkan, termasuk PPh 21/22/23/24) ÷ 12, dibulatkan ke bawah ribuan. Jangan mengurangkan lagi angsuran PPh 25 yang sudah dibayar sendiri.', dasar: 'UU PPh Pasal 25', jebakan: 'Mengabaikan PPh 24 yang dapat dikreditkan, mengurangi lagi dengan PPh 25 yang dibayar sendiri, atau lupa membulatkan ke bawah.' },
        { re: /^Total (Harta|Utang|Kewajiban)/, rumus: 'Harta dilaporkan menurut kondisi akhir tahun pajak beserta nilai perolehannya; utang dilaporkan sebesar sisa pokok akhir tahun. Jumlahkan semua baris yang disebut dalam kasus.', dasar: 'Petunjuk pengisian SPT Tahunan PPh OP (Daftar Harta dan Kewajiban)', jebakan: 'Memakai nilai pasar atau saldo awal tahun, bukan nilai perolehan dan saldo akhir tahun.' },
        { re: /^Jumlah (Anggota Keluarga|Pemegang Saham|Pengurus|Cabang)/, rumus: 'Bagian identitas: hitung jumlah baris yang disebut dalam kasus (anggota keluarga, pemegang saham, pengurus/komisaris, atau cabang). Bukan hasil perhitungan pajak, tetapi harus lengkap.', dasar: 'Petunjuk pengisian SPT (lampiran identitas)', jebakan: 'Ikut menghitung Wajib Pajak itu sendiri, atau melewatkan satu baris.' },
        { re: /^PPh Kurang\/Lebih Bayar \(hasil akhir Induk\)/, rumus: 'PPh terutang = tarif 22% × PKP, atau dengan Pasal 31E bila memenuhi syarat (peredaran tidak lebih dari Rp50 miliar: pengurangan tarif 50% atas bagian PKP yang sebanding dengan peredaran s.d. Rp4,8 miliar; peredaran tidak lebih dari Rp4,8 miliar seluruh PKP). KB/LB = PPh terutang − total kredit pajak. Positif = kurang bayar, negatif = lebih bayar.', dasar: 'UU PPh Pasal 17 ayat (1) huruf b dan Pasal 31E; Pasal 29', jebakan: 'Satu angka yang salah di atas merambat ke hasil akhir; telusuri dari laba komersial → koreksi fiskal → PKP → PPh terutang.' },
        { re: /^PPh Kurang\/Lebih Bayar/, rumus: 'PKP = (penghasilan neto − kompensasi) − PTKP, dibulatkan ke bawah ribuan. PPh terutang = tarif Pasal 17 × PKP. KB/LB = PPh terutang − total kredit pajak (dipotong pihak lain + dibayar sendiri). Positif = kurang bayar, negatif = lebih bayar.', dasar: 'UU PPh Pasal 17 ayat (1) huruf a dan Pasal 29; PMK 101/PMK.010/2016', jebakan: 'Satu angka yang salah di atas merambat ke hasil akhir; telusuri dari penghasilan neto → PKP → PPh terutang.' },
        { re: /^Peredaran Usaha Bruto/, rumus: 'Peredaran bruto usaha setahun menjadi dasar PPh final 0,5%, tanpa dikurangi HPP atau biaya.', dasar: 'PP 55/2022 s.t.d.d. PP 20/2026', jebakan: 'Memakai laba, bukan omzet. Kasus CV memakai ketentuan peralihan hingga akhir Tahun Pajak 2026.' },
        { re: /^Total Kredit Pajak/, rumus: 'Jumlahkan PPh 22/23/24 yang dipotong atau dipungut pihak lain, ditambah setoran sendiri (PPh 25) tahun berjalan.', dasar: 'UU PPh Pasal 22, 23, 24, 25', jebakan: 'Memasukkan PPh final sebagai kredit pajak.' },
        { re: /^Peredaran Usaha \(/, rumus: 'Peredaran bruto usaha sesuai laporan laba rugi, sebelum dikurangi HPP dan biaya.', dasar: 'UU PPh Pasal 6 ayat (1)', jebakan: 'Mengambil laba kotor atau laba bersih.' },
        { re: /^Total HPP/, rumus: 'HPP = persediaan awal + pembelian − persediaan akhir. Jumlahkan rincian HPP pada Lampiran II sesuai kasus.', dasar: 'UU PPh Pasal 6 ayat (1)', jebakan: 'Memasukkan biaya operasional ke HPP atau sebaliknya.' },
        { re: /^Total Biaya Usaha Lainnya/, rumus: 'Jumlahkan biaya usaha di luar HPP (gaji, sewa, penyusutan, listrik, dan sebagainya) sesuai laporan laba rugi komersial.', dasar: 'UU PPh Pasal 6 ayat (1)', jebakan: 'Menghitung dua kali biaya yang sudah masuk HPP.' },
        { re: /^Penghasilan Neto Luar Usaha/, rumus: 'Penghasilan neto luar usaha (bunga, sewa non-final, dan sebagainya) = bruto − biaya terkait. Penghasilan yang sudah final dikeluarkan.', dasar: 'UU PPh Pasal 6 dan Pasal 4 ayat (2)', jebakan: 'Memasukkan penghasilan final ke neto luar usaha.' },
        { re: /^Penghasilan Neto Komersial Luar Negeri/, rumus: 'Penghasilan neto dari luar negeri dilaporkan sendiri; pajak yang sudah dibayar di luar negeri diperlakukan sebagai kredit pajak luar negeri terpisah.', dasar: 'UU PPh Pasal 24', jebakan: 'Menjumlahkannya tanpa memisahkan kredit pajak luar negeri.' },
        { re: /^Total Koreksi Fiskal Positif/, rumus: 'Koreksi positif menambah laba: biaya yang tidak boleh atau tidak seluruhnya boleh dikurangkan (mis. entertainment tanpa daftar nominatif, sumbangan, sanksi pajak, biaya pribadi, hadiah tertentu).', dasar: 'UU PPh Pasal 9 ayat (1)', jebakan: 'Menukar arah koreksi: biaya yang ditolak fiskal menambah laba (positif).' },
        { re: /^Total Koreksi Fiskal Negatif/, rumus: 'Koreksi negatif mengurangi laba: penghasilan yang sudah dikenai PPh final atau bukan objek pajak, atau penyusutan fiskal lebih besar dari komersial.', dasar: 'UU PPh Pasal 4 ayat (2) dan (3); Pasal 11', jebakan: 'Lupa mengeluarkan penghasilan final dari laba komersial, sehingga dikenai pajak dua kali.' },
        { re: /^Penghasilan Tidak Teratur/, rumus: 'Penghasilan yang tidak berulang (mis. keuntungan penjualan aset) dikeluarkan dari dasar angsuran PPh 25 tahun berikutnya.', dasar: 'UU PPh Pasal 25', jebakan: 'Ikut memasukkannya ke dasar angsuran sehingga angsuran terlalu besar.' }
    ];

    function esc(s) { return escapeHTML(s); } // escapeHTML: js/shared/html-utils.js
    function lookup(label) {
        for (var i = 0; i < R.length; i++) if (R[i].re.test(String(label))) return R[i];
        return null;
    }
    function detail(rule, open) {
        return '<details class="fp-detail"' + (open ? ' open' : '') + '><summary>' + (open ? 'Pembahasan' : 'Lihat rumus') + '</summary>' +
            '<div class="fp-row"><span class="fp-label">Cara menghitung</span>' + esc(rule.rumus) + '</div>' +
            '<div class="fp-row"><span class="fp-label">Dasar</span>' + esc(rule.dasar) + '</div>' +
            '<div class="fp-row fp-warn"><span class="fp-label">Jebakan umum</span>' + esc(rule.jebakan) + '</div></details>';
    }
    function render(checks) {
        var wrong = checks.filter(function (c) { return !c.ok; }).length;
        var h = '<strong>Rincian Pengecekan Formulir (' + checks.length + ' titik cek):</strong>';
        if (wrong) h += '<div class="fp-note">' + wrong + ' titik cek perlu diperbaiki. Mulailah dari yang paling atas: kesalahan di bagian awal sering merambat ke hasil akhir.</div>';
        h += '<ul class="fp-list">';
        checks.forEach(function (c) {
            var rule = lookup(c.label);
            h += '<li>' + (c.ok ? '✅' : '❌') + ' ' + esc(c.label) + (c.ok ? '' : ' — seharusnya: <strong>' + esc(c.correctVal) + '</strong>');
            if (rule) h += detail(rule, !c.ok);
            h += '</li>';
        });
        return h + '</ul>';
    }
    window.FormPembahasan = { render: render, lookup: lookup, rules: R };
})();
