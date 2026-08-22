function formatNumber(num) {
    if(num === 0) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/\./g, ''), 10) || 0;
}

function hitungL4() {
    let totBruto = 0, totPph = 0, totNon = 0;

    // Hitung Bagian A
    for(let i=1; i<=5; i++) {
        totBruto += parseNumber(document.getElementById(`f${i}_bruto`).value);
        totPph += parseNumber(document.getElementById(`f${i}_pph`).value);
    }
    document.getElementById('total_f_bruto').value = formatNumber(totBruto);
    document.getElementById('total_f_pph').value = formatNumber(totPph);

    // Hitung Bagian B
    for(let i=1; i<=3; i++) {
        totNon += parseNumber(document.getElementById(`non${i}`).value);
    }
    document.getElementById('total_non_objek').value = formatNumber(totNon);

    // --- AUTO-SAVE DRAFT ---
    let drafL4 = {};
    for (let i = 1; i <= 5; i++) {
        drafL4[`f${i}_bruto`] = document.getElementById(`f${i}_bruto`).value;
        drafL4[`f${i}_pph`] = document.getElementById(`f${i}_pph`).value;
    }
    for (let i = 1; i <= 3; i++) {
        drafL4[`non${i}`] = document.getElementById(`non${i}`).value;
    }
    localStorage.setItem('draft_lampiran_IV', JSON.stringify(drafL4));
}

document.querySelectorAll('.input-num').forEach(el => {
    el.addEventListener('input', function() {
        let raw = this.value.replace(/[^0-9]/g, '');
        this.value = raw ? formatNumber(parseInt(raw)) : '';
        hitungL4();
    });
    el.addEventListener('focus', function() { if(this.value === "0") this.value=""; });
    el.addEventListener('blur', function() { if(this.value === "") this.value="0"; });
});

window.addEventListener('DOMContentLoaded', () => {
    let savedNama = localStorage.getItem('spt_nama_wp');
    let savedNPWP = localStorage.getItem('spt_npwp');
    if (savedNama) document.getElementById('nama_wp_lampiran').value = savedNama;
    if (savedNPWP) {
        let fmt = savedNPWP.replace(/^(\d{2})(\d{3})(\d{3})(\d{1})(\d{3})(\d{3})$/, "$1.$2.$3.$4-$5.$6");
        document.getElementById('npwp_lampiran').value = fmt || savedNPWP;
    }

    let savedDraft = localStorage.getItem('draft_lampiran_IV');
    if (savedDraft) {
        try {
            let drafL4 = JSON.parse(savedDraft);
            Object.keys(drafL4).forEach(id => {
                let el = document.getElementById(id);
                if (el) el.value = drafL4[id];
            });
        } catch (e) {
            console.warn('Draf Lampiran IV korup, dilewati:', e);
        }
    }

    hitungL4();

    const btnResetL4 = document.getElementById('btnResetL4');
    if (btnResetL4) {
        btnResetL4.addEventListener('click', function() {
            if (confirm('Kosongkan semua isian di Lampiran IV ini? Draf yang tersimpan akan dihapus.')) {
                localStorage.removeItem('draft_lampiran_IV');
                window.location.reload();
            }
        });
    }
});

document.getElementById('btnSalinL4').addEventListener('click', () => {
    let totalNonObjek = document.getElementById('total_non_objek').value;
    localStorage.setItem('L4_total_non_objek', totalNonObjek);
    alert("Jumlah Penghasilan Tidak Termasuk Objek Pajak berhasil disalin ke Formulir Induk Angka 4!");
    window.location.href = '1771_induk.html';
});