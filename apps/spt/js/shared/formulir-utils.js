/* ==============================================================================
   Utilitas format/parse angka untuk formulir_spt (gaya akuntansi Indonesia:
   pemisah ribuan titik, angka negatif ditulis dalam kurung — "(500.000)").

   SEBELUMNYA formatNumber()/parseNumber() disalin manual ke 5 file
   (script_formulir.js + script_Lampiran_I–IV.js). Salinan di
   script_Lampiran_III.js & IV.js sempat lebih sederhana dan TIDAK menangani
   angka negatif (baik saat memformat maupun mem-parse balik nilai berkurung),
   beda dari Lampiran I/II — potensi salah tampil/salah hitung kalau total di
   Lampiran III/IV pernah negatif. Sekarang seluruh formulir_spt memakai SATU
   versi (yang lengkap) dari sini, jadi perilakunya konsisten di semua halaman.

   WAJIB: <script> file ini dimuat sebelum script_formulir.js / script_Lampiran_*.js.
   ============================================================================== */
function formatNumber(num) {
    if (num === 0) return "0";
    if (num < 0) return "(" + Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ")";
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
