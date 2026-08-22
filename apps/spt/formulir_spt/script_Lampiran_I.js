// --- FITUR FORMAT ANGKA ---
function formatNumber(num) {
    if(num === 0) return "0";
    if(num < 0) return "(" + Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ")";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(str) {
    if (!str) return 0;
    if (str.includes('(') && str.includes(')')) {
        let cleanStr = str.replace(/[().]/g, '');
        return -parseInt(cleanStr, 10) || 0;
    }
    return parseInt(str.toString().replace(/\./g, ''), 10) || 0;
}

// --- FUNGSI KALKULASI LAMPIRAN I ---
function hitungLampiranI() {
    // Ambil input
    let L1a = parseNumber(document.getElementById('L1a').value); // Omzet
    let L1b = parseNumber(document.getElementById('L1b').value); // HPP
    let L1c = parseNumber(document.getElementById('L1c').value); // Biaya Usaha
    
    // Hitung Penghasilan Neto Usaha (1d = 1a - 1b - 1c)
    let L1d = L1a - L1b - L1c;
    document.getElementById('L1d').value = formatNumber(L1d);

    // Ambil input Luar Usaha
    let L1e = parseNumber(document.getElementById('L1e').value); // Penghasilan Luar
    let L1f = parseNumber(document.getElementById('L1f').value); // Biaya Luar
    
    // Hitung Penghasilan Neto Luar Usaha (1g = 1e - 1f)
    let L1g = L1e - L1f;
    document.getElementById('L1g').value = formatNumber(L1g);

    // Jumlah Neto Komersial Dalam Negeri (1h = 1d + 1g)
    let L1h = L1d + L1g;
    document.getElementById('L1h').value = formatNumber(L1h);

    // Hitung Total Keseluruhan (3 = 1h + 2)
    let L2 = parseNumber(document.getElementById('L2').value); // Luar Negeri
    let L3 = L1h + L2;
    document.getElementById('L3').value = formatNumber(L3);

    // --- AUTO-SAVE DRAFT ---
    let drafL1 = {};
    inputsLampiran.forEach(id => {
        let el = document.getElementById(id);
        if (el) drafL1[id] = el.value;
    });
    localStorage.setItem('draft_lampiran_I', JSON.stringify(drafL1));
}

// Terapkan event listener
const inputsLampiran = ['L1a', 'L1b', 'L1c', 'L1e', 'L1f', 'L2'];

inputsLampiran.forEach(id => {
    let el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', function(e) {
            let rawValue = this.value.replace(/[^0-9]/g, ''); 
            this.value = rawValue ? formatNumber(parseInt(rawValue)) : '';
            hitungLampiranI();
        });
        el.addEventListener('focus', function() {
            if (this.value === "0") this.value = "";
        });
        el.addEventListener('blur', function() {
            if (this.value === "") this.value = "0";
        });
    }
});

// Aksi Tombol
document.getElementById('btnSalin').addEventListener('click', function() {
    let nilaiAkhir = document.getElementById('L3').value;
    
    // Simpan nilai ke LocalStorage browser
    localStorage.setItem('nilai_lampiran_I', nilaiAkhir);
    
    alert(`Penghasilan Neto Komersial sebesar ${nilaiAkhir} berhasil disimpan!\n\nAnda akan diarahkan kembali ke Form Induk.`);
    
    // Otomatis pindah halaman kembali ke Form Induk
    window.location.href = '1771_induk.html';
});
// --- FITUR AMBIL DATA DARI STORAGE (IDENTITAS, DRAF SENDIRI, & LAMPIRAN II) ---
window.addEventListener('DOMContentLoaded', function() {
    // 1. Ambil Identitas dari Induk
    let savedNama = localStorage.getItem('spt_nama_wp');
    let savedNPWP = localStorage.getItem('spt_npwp');
    if (savedNama) document.getElementById('nama_wp_lampiran').value = savedNama;
    if (savedNPWP) {
        let formattedNPWP = savedNPWP.replace(/^(\d{2})(\d{3})(\d{3})(\d{1})(\d{3})(\d{3})$/, "$1.$2.$3.$4-$5.$6");
        document.getElementById('npwp_lampiran').value = formattedNPWP || savedNPWP;
    }

    // 2. Pulihkan draf angka Lampiran I ini sendiri (sebelum halaman di-refresh/ditutup)
    let savedDraft = localStorage.getItem('draft_lampiran_I');
    if (savedDraft) {
        try {
            let drafL1 = JSON.parse(savedDraft);
            Object.keys(drafL1).forEach(id => {
                let el = document.getElementById(id);
                if (el) el.value = drafL1[id];
            });
        } catch (e) {
            console.warn('Draf Lampiran I korup, dilewati:', e);
        }
    }

    // 3. Ambil Data Rincian Biaya BARU dari Lampiran II (Jika Ada) -- menimpa draf lama
    let hppDariL2 = localStorage.getItem('L2_total_hpp');
    let bsDariL2 = localStorage.getItem('L2_total_bs');
    let blDariL2 = localStorage.getItem('L2_total_bl');

    // Jika ada data HPP dari Lampiran II, masukkan ke baris 1b
    if (hppDariL2) { 
        document.getElementById('L1b').value = hppDariL2; 
        localStorage.removeItem('L2_total_hpp'); 
    }
    
    // Jika ada data Biaya Usaha dari Lampiran II, masukkan ke baris 1c
    if (bsDariL2) { 
        document.getElementById('L1c').value = bsDariL2; 
        localStorage.removeItem('L2_total_bs'); 
    }
    
    // Jika ada data Biaya Luar Usaha dari Lampiran II, masukkan ke baris 1f
    if (blDariL2) { 
        document.getElementById('L1f').value = blDariL2; 
        localStorage.removeItem('L2_total_bl'); 
    }
    
    // Selalu hitung ulang setelah restore, baik dari draf sendiri maupun kiriman Lampiran II
    hitungLampiranI();

    // Tombol reset: bersihkan draf Lampiran I ini saja
    const btnResetL1 = document.getElementById('btnResetL1');
    if (btnResetL1) {
        btnResetL1.addEventListener('click', function() {
            if (confirm('Kosongkan semua isian di Lampiran I ini? Draf yang tersimpan akan dihapus.')) {
                localStorage.removeItem('draft_lampiran_I');
                window.location.reload();
            }
        });
    }
});