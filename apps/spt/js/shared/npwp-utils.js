/* ==============================================================================
   NPWP/NIK utils — satu sumber validasi & format nomor pokok wajib pajak untuk
   apps/spt. Dipakai oleh modul manapun yang punya input NPWP bebas-ketik
   (bukan widget kotak-per-digit seperti di formulir_spt/1771_*.html, yang punya
   pola input berbeda dan tidak disentuh di sini).

   Format yang didukung:
   - 16 digit — NPWP pasca PMK 112/2022 & Coretax: untuk Orang Pribadi memakai
     NIK KTP 16 digit apa adanya sebagai NPWP; untuk Badan/Instansi tetap NPWP
     16 digit terbitan DJP.
   - 15 digit — format NPWP lama (sebelum pemadanan NIK), masih valid dipakai
     s.d. masa transisi Coretax selesai, format XX.XXX.XXX.X-XXX.XXX.

   WAJIB: <script> file ini dimuat sebelum modul yang memanggil NPWPUtils.*.
   ============================================================================== */
(function (global) {
  function onlyDigits(str) {
    return String(str || '').replace(/\D/g, '');
  }

  function validateNPWP(input) {
    const digits = onlyDigits(input);
    if (digits.length === 0) {
      return { valid: false, format: null, digits: '', message: 'NPWP/NIK belum diisi.' };
    }
    if (digits.length === 16) {
      return { valid: true, format: '16', digits, message: 'Format baru (16 digit — NIK/NPWP pasca Coretax).' };
    }
    if (digits.length === 15) {
      return { valid: true, format: '15', digits, message: 'Format lama (15 digit, sebelum pemadanan NIK).' };
    }
    return {
      valid: false, format: null, digits,
      message: `Jumlah digit (${digits.length}) tidak sesuai — NPWP/NIK harus 16 digit (format baru) atau 15 digit (format lama).`
    };
  }

  function formatNPWP(input) {
    const r = validateNPWP(input);
    if (!r.valid) return input || '';
    if (r.format === '15') {
      const d = r.digits;
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d.slice(8, 9)}-${d.slice(9, 12)}.${d.slice(12, 15)}`;
    }
    // Format baru (16 digit): tampilkan berkelompok 4 digit supaya mudah dibaca,
    // tanpa menyiratkan struktur segmen resmi (beda dengan format lama yang punya arti per-segmen).
    const d = r.digits;
    return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8, 12)} ${d.slice(12, 16)}`;
  }

  // Live-binding sederhana untuk <input>: kasih elemen input NPWP + elemen <span>/<small>
  // untuk pesan status. Dipanggil ulang tiap 'input' event. Tidak memaksa format saat
  // mengetik (supaya tidak mengganggu posisi kursor) — hanya memberi umpan balik validitas.
  function bindNPWPField(inputEl, hintEl) {
    if (!inputEl) return;
    const update = () => {
      const r = validateNPWP(inputEl.value);
      inputEl.classList.toggle('npwp-invalid', inputEl.value.trim() !== '' && !r.valid);
      if (hintEl) {
        hintEl.textContent = inputEl.value.trim() === '' ? '' : r.message;
        hintEl.classList.toggle('npwp-hint-bad', inputEl.value.trim() !== '' && !r.valid);
      }
    };
    inputEl.addEventListener('input', update);
    inputEl.addEventListener('blur', () => {
      const r = validateNPWP(inputEl.value);
      if (r.valid) inputEl.value = formatNPWP(inputEl.value);
    });
    update();
  }

  global.NPWPUtils = { onlyDigits, validateNPWP, formatNPWP, bindNPWPField };
})(window);
