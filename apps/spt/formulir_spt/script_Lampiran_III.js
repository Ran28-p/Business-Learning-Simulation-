function formatNumber(num) {
    if(num === 0) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/\./g, ''), 10) || 0;
}

const tbody = document.getElementById('tableL3Body');

function tambahBaris(nama="", npwp="", jenis="", bruto=0, pph=0, noBukti="", tgl="") {
    let rowCount = tbody.rows.length + 1;
    let tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align: center;">${rowCount}</td>
        <td><input type="text" class="input-matrix" value="${nama}" placeholder="PT Pemotong"></td>
        <td><input type="text" class="input-matrix" value="${npwp}" placeholder="01.234.567.8-901.000"></td>
        <td><input type="text" class="input-matrix" value="${jenis}" placeholder="Pasal 23 / 22"></td>
        <td><input type="text" class="input-num val-bruto" value="${formatNumber(bruto)}"></td>
        <td><input type="text" class="input-num val-pph" value="${formatNumber(pph)}"></td>
        <td><input type="text" class="input-matrix" value="${noBukti}" placeholder="BUPOT-01"></td>
        <td><input type="date" value="${tgl}" style="width:100%; border:none; background:transparent;"></td>
    `;
    tbody.appendChild(tr);
    attachEvents(tr);
    hitungTotalL3();
    simpanDraftL3();
}

function attachEvents(tr) {
    let pphInput = tr.querySelector('.val-pph');
    pphInput.addEventListener('input', function() {
        let raw = this.value.replace(/[^0-9]/g, '');
        this.value = raw ? formatNumber(parseInt(raw)) : '';
        hitungTotalL3();
    });
    pphInput.addEventListener('focus', function() { if(this.value === "0") this.value=""; });
    pphInput.addEventListener('blur', function() { if(this.value === "") this.value="0"; });
}

function hitungTotalL3() {
    let total = 0;
    document.querySelectorAll('.val-pph').forEach(el => {
        total += parseNumber(el.value);
    });
    document.getElementById('total_pph_dipotong').value = formatNumber(total);
}

// --- AUTO-SAVE DRAFT SELURUH TABEL ---
// Kolom input per baris urut: nama, npwp, jenis, bruto, pph, noBukti, tanggal.
function bacaSemuaBarisL3() {
    return Array.from(tbody.rows).map(tr => {
        let inputs = tr.querySelectorAll('input');
        return {
            nama: inputs[0].value,
            npwp: inputs[1].value,
            jenis: inputs[2].value,
            bruto: parseNumber(inputs[3].value),
            pph: parseNumber(inputs[4].value),
            noBukti: inputs[5].value,
            tgl: inputs[6].value
        };
    });
}

function simpanDraftL3() {
    localStorage.setItem('draft_lampiran_III', JSON.stringify(bacaSemuaBarisL3()));
}

// Delegasi: menangkap perubahan di kolom mana pun (termasuk nama/NPWP/tanggal yang
// sebelumnya tidak punya listener sama sekali), tanpa perlu dipasang ulang per baris.
tbody.addEventListener('input', simpanDraftL3);
tbody.addEventListener('change', simpanDraftL3);

document.getElementById('addRowBtn').addEventListener('click', () => tambahBaris());

// Load draf baris yang tersimpan sebelumnya (kalau ada)
window.addEventListener('DOMContentLoaded', () => {
    let savedNama = localStorage.getItem('spt_nama_wp');
    let savedNPWP = localStorage.getItem('spt_npwp');
    if (savedNama) document.getElementById('nama_wp_lampiran').value = savedNama;
    if (savedNPWP) {
        let fmt = savedNPWP.replace(/^(\d{2})(\d{3})(\d{3})(\d{1})(\d{3})(\d{3})$/, "$1.$2.$3.$4-$5.$6");
        document.getElementById('npwp_lampiran').value = fmt || savedNPWP;
    }

    let savedDraft = localStorage.getItem('draft_lampiran_III');
    if (savedDraft) {
        try {
            let rows = JSON.parse(savedDraft);
            rows.forEach(r => tambahBaris(r.nama, r.npwp, r.jenis, r.bruto, r.pph, r.noBukti, r.tgl));
        } catch (e) {
            console.warn('Draf Lampiran III korup, dilewati:', e);
        }
    }

    const btnResetL3 = document.getElementById('btnResetL3');
    if (btnResetL3) {
        btnResetL3.addEventListener('click', function() {
            if (confirm('Kosongkan semua baris di Lampiran III ini? Draf yang tersimpan akan dihapus.')) {
                localStorage.removeItem('draft_lampiran_III');
                window.location.reload();
            }
        });
    }
});

document.getElementById('btnSalinL3').addEventListener('click', () => {
    let totalPph = document.getElementById('total_pph_dipotong').value;
    localStorage.setItem('L3_total_kredit_pajak', totalPph);
    alert("Kredit Pajak berhasil disimpan dan akan disalin ke Formulir Induk Angka 15!");
    window.location.href = '1771_induk.html';
});