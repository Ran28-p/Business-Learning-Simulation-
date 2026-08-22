// --- FORMAT ANGKA ---
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

// --- DATA BARIS MATRIKS ---
const barisBiaya = [
    "Pembelian Bahan/Barang Dagangan",
    "Gaji, Upah, Bonus, THR, dsb",
    "Biaya Transportasi",
    "Biaya Penyusutan dan Amortisasi",
    "Biaya Sewa",
    "Biaya Bunga Pinjaman",
    "Biaya Jasa",
    "Biaya Piutang Tak Tertagih",
    "Biaya Royalti",
    "Biaya Pemasaran/Promosi",
    "Biaya Lainnya"
];

// --- RENDER MATRIKS KE HTML ---
const tbody = document.getElementById('matrixBody');
barisBiaya.forEach((nama, index) => {
    let tr = document.createElement('tr');
    let no = index + 1;
    tr.innerHTML = `
        <td style="text-align: center;">${no}.</td>
        <td>${nama}</td>
        <td><input type="text" class="input-matrix hitung-row" id="hpp_${no}" value="0"></td>
        <td><input type="text" class="input-matrix hitung-row" id="bs_${no}" value="0"></td>
        <td><input type="text" class="input-matrix hitung-row" id="bl_${no}" value="0"></td>
        <td><input type="text" class="input-matrix readonly" id="jml_${no}" value="0" readonly></td>
    `;
    tbody.appendChild(tr);
});

// --- FUNGSI PERHITUNGAN MATRIKS ---
function hitungMatriks() {
    let totalHPP = 0, totalBS = 0, totalBL = 0;

    for (let i = 1; i <= barisBiaya.length; i++) {
        let hpp = parseNumber(document.getElementById(`hpp_${i}`).value);
        let bs = parseNumber(document.getElementById(`bs_${i}`).value);
        let bl = parseNumber(document.getElementById(`bl_${i}`).value);

        // Jumlah ke Samping (Per Baris)
        let rowTotal = hpp + bs + bl;
        document.getElementById(`jml_${i}`).value = formatNumber(rowTotal);

        // Tambahkan ke Total Bawah (Per Kolom)
        totalHPP += hpp;
        totalBS += bs;
        totalBL += bl;
    }

    // Tampilkan Total Kolom
    document.getElementById('total_hpp').value = formatNumber(totalHPP);
    document.getElementById('total_biaya_usaha').value = formatNumber(totalBS);
    document.getElementById('total_biaya_luar').value = formatNumber(totalBL);

    // Total Semua Sudut Kanan Bawah
    document.getElementById('total_semua').value = formatNumber(totalHPP + totalBS + totalBL);

    // --- AUTO-SAVE DRAFT ---
    // Simpan seluruh 33 kotak matriks supaya tidak hilang kalau halaman di-refresh.
    let drafL2 = {};
    for (let i = 1; i <= barisBiaya.length; i++) {
        drafL2[`hpp_${i}`] = document.getElementById(`hpp_${i}`).value;
        drafL2[`bs_${i}`] = document.getElementById(`bs_${i}`).value;
        drafL2[`bl_${i}`] = document.getElementById(`bl_${i}`).value;
    }
    localStorage.setItem('draft_lampiran_II', JSON.stringify(drafL2));
}

// --- EVENT LISTENER UNTUK INPUT MATRIKS ---
document.querySelectorAll('.hitung-row').forEach(input => {
    input.addEventListener('input', function() {
        let rawValue = this.value.replace(/[^0-9]/g, ''); 
        this.value = rawValue ? formatNumber(parseInt(rawValue)) : '';
        hitungMatriks();
    });
    input.addEventListener('focus', function() {
        if (this.value === "0") this.value = "";
    });
    input.addEventListener('blur', function() {
        if (this.value === "") this.value = "0";
    });
});

// --- AMBIL IDENTITAS & DRAF MATRIKS SAAT LOAD ---
window.addEventListener('DOMContentLoaded', function() {
    let savedNama = localStorage.getItem('spt_nama_wp');
    let savedNPWP = localStorage.getItem('spt_npwp');
    if (savedNama) document.getElementById('nama_wp_lampiran').value = savedNama;
    if (savedNPWP) document.getElementById('npwp_lampiran').value = savedNPWP;

    // Pulihkan seluruh isi matriks biaya (33 kotak) yang sudah diketik sebelumnya
    let savedDraft = localStorage.getItem('draft_lampiran_II');
    if (savedDraft) {
        try {
            let drafL2 = JSON.parse(savedDraft);
            Object.keys(drafL2).forEach(id => {
                let el = document.getElementById(id);
                if (el) el.value = drafL2[id];
            });
        } catch (e) {
            console.warn('Draf Lampiran II korup, dilewati:', e);
        }
    }

    // Hitung ulang total baris & kolom berdasarkan draf yang baru dipulihkan
    hitungMatriks();

    // Tombol reset: bersihkan draf matriks Lampiran II ini saja
    const btnResetL2 = document.getElementById('btnResetL2');
    if (btnResetL2) {
        btnResetL2.addEventListener('click', function() {
            if (confirm('Kosongkan seluruh matriks biaya di Lampiran II ini? Draf yang tersimpan akan dihapus.')) {
                localStorage.removeItem('draft_lampiran_II');
                window.location.reload();
            }
        });
    }
});

// --- SIMPAN DAN SALIN KE LAMPIRAN I ---
document.getElementById('btnSalinL2').addEventListener('click', function() {
    // Simpan ketiga total kolom ke storage
    localStorage.setItem('L2_total_hpp', document.getElementById('total_hpp').value);
    localStorage.setItem('L2_total_bs', document.getElementById('total_biaya_usaha').value);
    localStorage.setItem('L2_total_bl', document.getElementById('total_biaya_luar').value);
    
    alert("Perincian Biaya berhasil disimpan dan akan disalin!\nAnda akan diarahkan ke Lampiran I.");
    window.location.href = '1771_Lampiran_I.html';
});
