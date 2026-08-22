// --- FITUR UX & AUTO-SAVE IDENTITAS ---
// Disimpan real-time setiap kali diketik (bukan cuma saat klik tombol ke Lampiran I),
// supaya identitas tidak hilang kalau halaman di-refresh atau pindah lewat link lain.
const npwpInputs = document.querySelectorAll('.npwp-inputs input');
npwpInputs.forEach((input, index) => {
    input.addEventListener('input', function() {
        if (this.value.length === this.maxLength) {
            if (index < npwpInputs.length - 1) npwpInputs[index + 1].focus();
        }
        let npwpLengkap = "";
        npwpInputs.forEach(box => npwpLengkap += box.value);
        localStorage.setItem('spt_npwp', npwpLengkap);
    });
});

const namaWpInput = document.getElementById('nama_wp');
if (namaWpInput) {
    namaWpInput.addEventListener('input', function() {
        localStorage.setItem('spt_nama_wp', this.value);
    });
}

// --- MODE KASUS: bank kasus + kunci jawaban untuk Formulir Induk 1771 ---
// Field yang dinilai: a1,a2,a4,a5,a6,a7,b9,b11,b12,c14,c15,d18a,d18b,f20,f21
// (field lain seperti a3/a8/b10/b13/c16/c17/d18c/d19 dihitung otomatis oleh hitungSemua()
// dari field-field di atas, jadi otomatis ikut benar kalau field sumbernya benar).
const KasusInduk1771 = [
    {
        id: 'induk-1',
        title: 'PT Makmur Sentosa — Dagang (Fasilitas Pasal 31E Penuh)',
        narrative: `PT Makmur Sentosa bergerak di bidang dagang. Selama tahun pajak berjalan:

USAHA:
- Peredaran Usaha: Rp 3.500.000.000
- Harga Pokok Penjualan: Rp 2.000.000.000
- Biaya Usaha Lainnya: Rp 800.000.000

LUAR USAHA:
- Penghasilan dari jasa konsultasi tambahan: Rp 25.000.000, dengan biaya terkait Rp 5.000.000

KOREKSI FISKAL:
- Sumbangan ke yayasan pribadi pemilik, tidak memenuhi syarat sumbangan yang boleh dikurangkan (koreksi positif): Rp 30.000.000
- Sanksi administrasi (STP) pajak yang turut dibebankan sebagai biaya (koreksi positif): Rp 8.000.000
- Tidak ada koreksi fiskal negatif maupun kompensasi kerugian dari tahun sebelumnya.

KREDIT PAJAK:
- Dipungut PPh Pasal 22 oleh bendaharawan pemerintah atas penjualan: Rp 15.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 5.000.000/bulan sepanjang tahun: Rp 60.000.000

Tidak ada penghasilan final/bukan objek pajak, PPh DTP, maupun STP PPh 25.

Petunjuk: peredaran usaha di bawah Rp4,8 miliar → seluruh PKP dapat fasilitas Pasal 31E (tarif efektif 11%).`,
        jawaban: { a1: 720000000, a2: 0, a4: 0, a5: 38000000, a6: 0, a7: 0, b9: 0, b11: 83380000, b12: 0, c14: 0, c15: 15000000, d18a: 60000000, d18b: 0, f20: 758000000, f21: 5698000 }
    },
    {
        id: 'induk-2',
        title: 'PT Sejahtera Abadi — Manufaktur (Fasilitas Sebagian + Kompensasi Kerugian)',
        narrative: `PT Sejahtera Abadi adalah perusahaan manufaktur menengah. Selama tahun pajak berjalan:

USAHA:
- Peredaran Usaha: Rp 12.000.000.000
- Harga Pokok Penjualan: Rp 7.500.000.000
- Biaya Usaha Lainnya: Rp 2.600.000.000

LUAR USAHA:
- Penghasilan dari jasa manajemen ke anak usaha: Rp 50.000.000, dengan biaya terkait Rp 10.000.000

KOREKSI FISKAL:
- Biaya entertainment tanpa daftar nominatif (koreksi positif): Rp 45.000.000
- Beban Pajak Penghasilan yang salah dibebankan sebagai biaya (koreksi positif): Rp 20.000.000
- Memiliki sisa kompensasi kerugian fiskal dari Tahun Pajak 2023 (Lampiran Khusus 2A): Rp 200.000.000

KREDIT PAJAK:
- Dipotong/dipungut PPh Pasal 22/23 oleh pihak lain: Rp 85.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 15.000.000/bulan sepanjang tahun: Rp 180.000.000

Tidak ada penghasilan final/bukan objek pajak, PPh DTP, maupun STP PPh 25.

Petunjuk: peredaran usaha di antara Rp4,8 miliar - Rp50 miliar → PKP terbagi proporsional antara yang dapat fasilitas (tarif 11%) dan yang tidak (tarif 22%), sesuai Pasal 31E ayat (1).`,
        jawaban: { a1: 1940000000, a2: 0, a4: 0, a5: 65000000, a6: 0, a7: 0, b9: 200000000, b11: 317680000, b12: 0, c14: 0, c15: 85000000, d18a: 180000000, d18b: 0, f20: 2005000000, f21: 22323000 }
    },
    {
        id: 'induk-3',
        title: 'PT Nusantara Perkasa — Perusahaan Besar (Tanpa Fasilitas + Kredit Pajak Luar Negeri)',
        narrative: `PT Nusantara Perkasa adalah perusahaan besar. Selama tahun pajak berjalan:

USAHA:
- Peredaran Usaha: Rp 85.000.000.000
- Harga Pokok Penjualan: Rp 55.000.000.000
- Biaya Usaha Lainnya: Rp 18.000.000.000

LUAR USAHA:
- Laba penjualan aset tetap (bersifat insidental, bukan penghasilan teratur usaha): Rp 300.000.000, dengan biaya terkait Rp 50.000.000

LUAR NEGERI:
- Memiliki cabang di Singapura dengan Penghasilan Neto Komersial Luar Negeri: Rp 1.750.000.000
- Kredit pajak luar negeri Pasal 24 yang dapat diperhitungkan: Rp 297.500.000

KOREKSI FISKAL:
- Sanksi administrasi pajak (koreksi positif): Rp 120.000.000
- Sumbangan tidak resmi (koreksi positif): Rp 80.000.000
- Tidak ada kompensasi kerugian fiskal.

KREDIT PAJAK:
- Dipotong/dipungut PPh dalam negeri oleh pihak lain: Rp 250.000.000
- Kredit pajak luar negeri Pasal 24 (lihat di atas): Rp 297.500.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 200.000.000/bulan sepanjang tahun: Rp 2.400.000.000

Petunjuk PENTING: peredaran usaha di atas Rp50 miliar → TIDAK dapat fasilitas Pasal 31E, tarif flat 22%. Dasar penghitungan Angsuran PPh 25 tahun depan (Angka 20) HARUS mengeluarkan penghasilan tidak teratur/insidental (laba penjualan aset tetap), dan kredit yang diperhitungkan di Angka 20/21 hanya kredit DALAM NEGERI (bukan PPh 24 luar negeri, bukan angsuran PPh 25 sendiri).`,
        jawaban: { a1: 12250000000, a2: 1750000000, a4: 0, a5: 200000000, a6: 0, a7: 0, b9: 0, b11: 3124000000, b12: 0, c14: 0, c15: 547500000, d18a: 2400000000, d18b: 0, f20: 13950000000, f21: 234916000 }
    },
    {
        id: 'induk-4',
        title: 'CV Anugerah — Dagang Kecil (Fasilitas Penuh + Koreksi Fiskal Sederhana)',
        narrative: `CV Anugerah adalah perusahaan dagang kecil. Selama tahun pajak berjalan:

USAHA:
- Peredaran Usaha: Rp 2.400.000.000
- Harga Pokok Penjualan: Rp 1.200.000.000
- Biaya Usaha Lainnya: Rp 500.000.000

LUAR USAHA:
- Penghasilan luar usaha: Rp 15.000.000, dengan biaya terkait Rp 3.000.000

KOREKSI FISKAL:
- Biaya entertainment tanpa daftar nominatif (koreksi positif): Rp 20.000.000
- Sumbangan tidak resmi (koreksi positif): Rp 10.000.000
- Tidak ada koreksi fiskal negatif maupun kompensasi kerugian fiskal.

KREDIT PAJAK:
- Dipungut PPh Pasal 22 oleh bendaharawan: Rp 8.000.000
- PPh Pasal 25 (angsuran bulanan) yang sudah disetor sendiri, Rp 2.000.000/bulan sepanjang tahun: Rp 24.000.000

Petunjuk: peredaran usaha di bawah Rp4,8 miliar → seluruh PKP dapat fasilitas Pasal 31E (tarif efektif 11%). Kasus ini cocok untuk pemula.`,
        jawaban: { a1: 712000000, a2: 0, a4: 0, a5: 30000000, a6: 0, a7: 0, b9: 0, b11: 81620000, b12: 0, c14: 0, c15: 8000000, d18a: 24000000, d18b: 0, f20: 742000000, f21: 6135000 }
    }
];

let modeKasusAktif = false;
let kasusAktif = null;
const LABEL_FIELD = {
    a1: '1. Penghasilan Neto Komersial Dalam Negeri', a2: '2. Penghasilan Neto Komersial Luar Negeri',
    a4: '4. Penghasilan Final & Bukan Objek Pajak', a5: '5. Penyesuaian Fiskal Positif', a6: '6. Penyesuaian Fiskal Negatif',
    a7: '7. Fasilitas Penanaman Modal', b9: '9. Kompensasi Kerugian Fiskal', b11: '11. Pajak Penghasilan Terutang',
    b12: '12. Pengembalian/Pengurangan PPh Ps. 24', c14: '14. PPh Ditanggung Pemerintah', c15: '15. Kredit Pajak DN & LN',
    d18a: '18a. PPh Pasal 25 Bulanan', d18b: '18b. STP PPh Pasal 25', f20: '20. Dasar Penghitungan Angsuran', f21: '21. Angsuran PPh 25 Tahun Depan'
};

// --- FITUR PERHITUNGAN FORMULIR ---
function formatNumber(num) {
    if(num === 0) return "0";
    // Jika minus, beri tanda kurung (standar pajak/akuntansi)
    if(num < 0) return "(" + Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ")";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(str) {
    if (!str) return 0;
    // Mengubah format (1.000) menjadi angka minus -1000 saat dihitung ulang
    if (str.includes('(') && str.includes(')')) {
        let cleanStr = str.replace(/[().]/g, '');
        return -parseInt(cleanStr, 10) || 0;
    }
    return parseInt(str.toString().replace(/\./g, ''), 10) || 0;
}

function hitungSemua() {
    // ---- Hitung Bagian A ----
    let a1 = parseNumber(document.getElementById('a1').value);
    let a2 = parseNumber(document.getElementById('a2').value);
    let a4 = parseNumber(document.getElementById('a4').value);
    let a5 = parseNumber(document.getElementById('a5').value);
    let a6 = parseNumber(document.getElementById('a6').value);
    let a7 = parseNumber(document.getElementById('a7').value);

    let a3 = a1 + a2;
    document.getElementById('a3').value = formatNumber(a3);

    let a8 = a3 - a4 + a5 - a6 - a7;
    document.getElementById('a8').value = formatNumber(a8);

    // ---- Hitung Bagian B ----
    let b9 = parseNumber(document.getElementById('b9').value);
    
    let b10 = a8 - b9;
    if (b10 < 0) b10 = 0; 
    document.getElementById('b10').value = formatNumber(b10);

    let b11 = parseNumber(document.getElementById('b11').value);
    let b12 = parseNumber(document.getElementById('b12').value);

    let b13 = b11 + b12;
    document.getElementById('b13').value = formatNumber(b13);

    // ---- Hitung Bagian C ----
    let c14 = parseNumber(document.getElementById('c14').value);
    let c15 = parseNumber(document.getElementById('c15').value);

    let c16 = c14 + c15;
    document.getElementById('c16').value = formatNumber(c16);

    // 17 = 13 (Terutang) - 16 (Kredit)
    let c17 = b13 - c16;
    document.getElementById('c17').value = formatNumber(c17);

    // ---- Hitung Bagian D ----
    let d18a = parseNumber(document.getElementById('d18a').value);
    let d18b = parseNumber(document.getElementById('d18b').value);

    let d18c = d18a + d18b;
    document.getElementById('d18c').value = formatNumber(d18c);

    // 19 = 17 - 18c
    let d19 = c17 - d18c;
    document.getElementById('d19').value = formatNumber(d19);

    // --- AUTO-SAVE DRAFT ---
    // Simpan seluruh input mentah (bukan hasil hitungan) supaya kalau halaman
    // di-refresh, semua angka yang sudah diketik tidak hilang.
    let drafInduk = {};
    semuaInputAngka.forEach(id => {
        let el = document.getElementById(id);
        if (el) drafInduk[id] = el.value;
    });
    localStorage.setItem('draft_spt_1771_induk', JSON.stringify(drafInduk));
}
// Ganti array lama dengan yang ini
const semuaInputAngka = [
    'a1', 'a2', 'a4', 'a5', 'a6', 'a7', 
    'b9', 'b11', 'b12', 
    'c14', 'c15', 
    'd18a', 'd18b',
    'f20', 'f21' // Tambahan untuk Bagian F
];

semuaInputAngka.forEach(id => {
    let el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', function(e) {
            let rawValue = this.value.replace(/[^0-9]/g, ''); 
            this.value = rawValue ? formatNumber(parseInt(rawValue)) : '';
            hitungSemua();
        });
        
        el.addEventListener('focus', function() {
            if (this.value === "0") this.value = "";
        });

        el.addEventListener('blur', function() {
            if (this.value === "") this.value = "0";
        });
    }
});

// Aksi tombol simpan
document.getElementById('btnSimpan').addEventListener('click', function() {
    const namaWP = document.getElementById('nama_wp').value;
    const hasilAkhir = document.getElementById('d19').value;
    
    if(!namaWP) {
        alert("Mohon isi Nama Wajib Pajak terlebih dahulu!");
        return;
    }
    
    let statusPajak = "Nihil";
    let nilai = parseNumber(hasilAkhir);
    if (nilai > 0) statusPajak = "Kurang Bayar";
    if (nilai < 0) statusPajak = "Lebih Bayar";

    alert(`Data ${namaWP} berhasil disimpan!\nStatus SPT: ${statusPajak}\nNilai: ${hasilAkhir}`);
});

// --- MODE KASUS: aktifkan/nonaktifkan, muat kasus acak, cek jawaban ---
function kosongkanFieldPenilaian() {
    semuaInputAngka.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.value = '0';
    });
    hitungSemua();
}

function tampilkanKasus(kasus) {
    kasusAktif = kasus;
    document.getElementById('kasusTitle').innerText = kasus.title;
    document.getElementById('kasusNarrative').innerText = kasus.narrative;
    document.getElementById('kasusPanel').style.display = 'block';
    localStorage.setItem('spt_1771_induk_kasus_id', kasus.id);
    const hasilEl = document.getElementById('hasilPengecekan');
    hasilEl.style.display = 'none';
    hasilEl.innerHTML = '';
}

function muatKasusBaru() {
    let pilihan = KasusInduk1771[Math.floor(Math.random() * KasusInduk1771.length)];
    // Hindari kasus yang sama persis dengan yang sedang aktif kalau memungkinkan
    if (KasusInduk1771.length > 1 && kasusAktif) {
        let percobaan = 0;
        while (pilihan.id === kasusAktif.id && percobaan < 10) {
            pilihan = KasusInduk1771[Math.floor(Math.random() * KasusInduk1771.length)];
            percobaan++;
        }
    }
    tampilkanKasus(pilihan);
    kosongkanFieldPenilaian();
}

function aktifkanModeBebas() {
    modeKasusAktif = false;
    kasusAktif = null;
    localStorage.removeItem('spt_1771_induk_kasus_id');
    document.getElementById('kasusPanel').style.display = 'none';
    document.getElementById('btnKasusBaru').style.display = 'none';
    document.getElementById('btnCekJawaban').style.display = 'none';
    document.getElementById('hasilPengecekan').style.display = 'none';
    document.getElementById('btnModeBebas').classList.add('btn-save');
    document.getElementById('btnModeKasus').style.backgroundColor = '#6f42c1';
}

function aktifkanModeKasus() {
    modeKasusAktif = true;
    document.getElementById('btnKasusBaru').style.display = '';
    document.getElementById('btnCekJawaban').style.display = '';
    if (!kasusAktif) {
        muatKasusBaru();
    } else {
        tampilkanKasus(kasusAktif);
    }
}

function cekJawabanInduk() {
    if (!kasusAktif) return;
    let benar = 0;
    let rincian = [];
    semuaInputAngka.forEach(id => {
        const nilaiUser = parseNumber(document.getElementById(id).value);
        const nilaiBenar = kasusAktif.jawaban[id];
        const ok = nilaiUser === nilaiBenar;
        if (ok) benar++;
        rincian.push({ label: LABEL_FIELD[id] || id, ok, nilaiUser, nilaiBenar });
    });
    const skor = Math.round((benar / semuaInputAngka.length) * 100);

    let html = `<h4 style="margin-top:0;">Hasil: ${benar} dari ${semuaInputAngka.length} benar (Skor ${skor})</h4>`;
    html += '<table style="width:100%; border-collapse: collapse; font-size: 13px;">';
    rincian.forEach(r => {
        const warna = r.ok ? '#2e7d32' : '#c62828';
        const bg = r.ok ? 'rgba(46,125,50,0.08)' : 'rgba(198,40,40,0.08)';
        html += `<tr style="background:${bg};">
            <td style="padding:6px; border-bottom:1px solid #eee;">${r.ok ? '✅' : '❌'} ${r.label}</td>
            <td style="padding:6px; border-bottom:1px solid #eee; text-align:right; color:${warna};">${formatNumber(r.nilaiUser)}${r.ok ? '' : ' <span style="color:#555;">(seharusnya: ' + formatNumber(r.nilaiBenar) + ')</span>'}</td>
        </tr>`;
    });
    html += '</table>';

    const hasilEl = document.getElementById('hasilPengecekan');
    hasilEl.innerHTML = html;
    hasilEl.style.display = 'block';
    hasilEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('btnModeBebas').addEventListener('click', aktifkanModeBebas);
document.getElementById('btnModeKasus').addEventListener('click', aktifkanModeKasus);
document.getElementById('btnKasusBaru').addEventListener('click', muatKasusBaru);
document.getElementById('btnCekJawaban').addEventListener('click', cekJawabanInduk);

// --- FITUR LOAD DATA (IDENTITAS, DRAF, & DATA DARI LAMPIRAN) ---

window.addEventListener('DOMContentLoaded', function() {
    // 1. Pulihkan Identitas (Nama & NPWP) yang diketik sebelumnya
    let savedNama = localStorage.getItem('spt_nama_wp');
    let savedNPWP = localStorage.getItem('spt_npwp');
    if (savedNama && namaWpInput) namaWpInput.value = savedNama;
    if (savedNPWP) {
        let idx = 0;
        npwpInputs.forEach(box => {
            let len = box.maxLength;
            box.value = savedNPWP.substring(idx, idx + len);
            idx += len;
        });
    }

    // 2. Pulihkan draf angka yang sudah diketik sebelum halaman di-refresh/ditutup
    let savedDraft = localStorage.getItem('draft_spt_1771_induk');
    if (savedDraft) {
        try {
            let drafInduk = JSON.parse(savedDraft);
            Object.keys(drafInduk).forEach(id => {
                let el = document.getElementById(id);
                if (el) el.value = drafInduk[id];
            });
        } catch (e) {
            console.warn('Draf Form Induk korup, dilewati:', e);
        }
    }

    // 3. Cek apakah ada data BARU yang dikirim dari salah satu Lampiran (menimpa draf lama)
    let dataLampiranI = localStorage.getItem('nilai_lampiran_I');
    if (dataLampiranI) {
        // Masukkan data tersebut ke Bagian A Angka 1 (ID: a1)
        document.getElementById('a1').value = dataLampiranI;
        
        // Hapus data dari storage setelah disalin agar tidak terus-menerus menimpa 
        // jika pengguna ingin mengedit manual di Form Induk nantinya
        localStorage.removeItem('nilai_lampiran_I');
    }
    // Tangkap data dari Lampiran III -> Masuk ke c15 (Kredit Pajak DN)
    let kreditL3 = localStorage.getItem('L3_total_kredit_pajak');
    if (kreditL3) {
        document.getElementById('c15').value = kreditL3;
        localStorage.removeItem('L3_total_kredit_pajak');
    }

    // Tangkap data dari Lampiran IV -> Masuk ke a4 (Penghasilan Final / Non Objek)
    let nonObjekL4 = localStorage.getItem('L4_total_non_objek');
    if (nonObjekL4) {
        document.getElementById('a4').value = nonObjekL4;
        localStorage.removeItem('L4_total_non_objek');
    }

    // Panggil perhitungan otomatis setelah data dimasukkan
    hitungSemua();

    // 4. Pulihkan Mode Kasus jika sebelumnya sedang aktif (draf angka di atas TETAP dipakai,
    // tidak dikosongkan ulang, supaya pekerjaan yang sedang berjalan tidak hilang)
    let savedKasusId = localStorage.getItem('spt_1771_induk_kasus_id');
    if (savedKasusId) {
        const kasusTersimpan = KasusInduk1771.find(k => k.id === savedKasusId);
        if (kasusTersimpan) {
            modeKasusAktif = true;
            document.getElementById('btnKasusBaru').style.display = '';
            document.getElementById('btnCekJawaban').style.display = '';
            kasusAktif = kasusTersimpan;
            document.getElementById('kasusTitle').innerText = kasusTersimpan.title;
            document.getElementById('kasusNarrative').innerText = kasusTersimpan.narrative;
            document.getElementById('kasusPanel').style.display = 'block';
        }
    }

    // Tombol reset: bersihkan identitas & draf Form Induk ini saja (Lampiran tidak disentuh)
    const btnResetDraf = document.getElementById('btnResetDraf');
    if (btnResetDraf) {
        btnResetDraf.addEventListener('click', function() {
            if (confirm('Kosongkan semua isian di Formulir Induk ini? Draf yang tersimpan akan dihapus.')) {
                localStorage.removeItem('draft_spt_1771_induk');
                localStorage.removeItem('spt_nama_wp');
                localStorage.removeItem('spt_npwp');
                localStorage.removeItem('spt_1771_induk_kasus_id');
                window.location.reload();
            }
        });
    }
});
// --- FITUR TRANSFER KE LAMPIRAN I ---
// CATATAN: identitas (Nama & NPWP) tidak perlu disimpan manual di sini lagi --
// sudah otomatis tersimpan secara real-time lewat listener 'input' di atas,
// jadi ini berlaku juga walau pengguna pindah lewat link Lampiran III/IV.
const btnKeLampiran1 = document.getElementById('btnKeLampiran1');
if(btnKeLampiran1) {
    btnKeLampiran1.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = this.getAttribute('href');
    });
}
