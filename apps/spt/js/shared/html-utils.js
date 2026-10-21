// html-utils.js — escape HTML bersama untuk halaman SPT.
// Dipindah dari js/app-main.js dan modul_pajak/script.js (isi fungsi identik) supaya tidak terduplikasi.
// Classic script: mendefinisikan fungsi global escapeHTML(str).
// WAJIB: dimuat SEBELUM js/app-main.js, js/data/form-pembahasan.js, dan modul_pajak/script.js.

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, function(match) {
        const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return escapeMap[match];
    });
}
