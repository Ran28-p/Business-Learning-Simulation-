# Status Tahap 1 — Fondasi Aplikasi

Tahap 1 mencakup: fondasi aplikasi, generator dataset Penjualan, spreadsheet interaktif, formula bar, pemilihan level, dan satu alur latihan dasar (Level 1) dari awal sampai pemeriksaan jawaban.

## 1. File yang Dibuat

Seluruh file di bawah ini baru (belum ada tahap sebelumnya, karena ini tahap pertama):

- `index.html`
- `css/style.css`
- `css/responsive.css`
- `js/app.js`
- `js/dataset-generator.js`
- `js/spreadsheet-engine.js`
- `js/formula-validator.js`
- `js/question-generator.js`
- `js/progress-manager.js`
- `js/storage-manager.js`
- `js/formula-library.js`
- `data/formula-catalog.json`
- `README.md`
- `docs/STATUS-TAHAP-1.md` (file ini)

## 2. Fitur yang Sudah Berfungsi (Bisa Diuji Langsung)

| Fitur | Detail |
|---|---|
| Generator dataset Penjualan | 14 kolom sesuai spesifikasi (ID Transaksi s/d Nama Sales), nilai DPP/PPN/Total dihitung otomatis dan konsisten, data acak tapi realistis (produk, wilayah, nama pelanggan/sales Indonesia) |
| Seed dataset | Seed yang sama menghasilkan dataset yang **persis sama** (diverifikasi lewat pengujian otomatis); tombol 🎲 mengacak seed baru |
| Pilihan jumlah data | 10 / 25 / 50 / 100 / 500 / 1.000 / jumlah khusus (1–5000), dengan validasi input |
| Spreadsheet interaktif | Grid bergaya Excel: header kolom A, B, C…, nomor baris, sel aktif ter-highlight, header kolom & baris ikut ter-highlight |
| Formula bar | Menampilkan alamat sel aktif (name box), sinkron dua arah dengan isi sel |
| Navigasi keyboard | Panah atas/bawah/kiri/kanan dan Enter berpindah sel; Escape membatalkan pengeditan |
| Referensi rentang | Rentang seperti `H2:H26` didukung penuh oleh evaluator rumus |
| Rumus Level 1 | `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT` — dihitung sungguhan di browser, bukan hasil tempelan |
| Generator soal Level 1 | Soal dibuat otomatis dari dataset aktif (kolom & nilai nyata, bukan hardcode) |
| Pemeriksaan jawaban | Membandingkan **hasil perhitungan**, bukan teks rumus — rumus berbeda dengan hasil sama tetap diterima (lihat pengujian di bawah) |
| Toleransi format | Pemisah argumen `,` **dan** `;` diterima; nama fungsi tidak case-sensitive; toleransi pembulatan 0,5 |
| Validasi struktural | Menolak jawaban berupa angka biasa (bukan rumus) dan rumus yang menunjuk ke kolom yang salah, dengan alasan spesifik |
| Bantuan 3 tingkat | Petunjuk konsep → nama fungsi → kerangka sintaks, terbuka satu per satu |
| Pembahasan | Baru bisa dibuka setelah jawaban benar (tidak membocorkan jawaban di awal) |
| Alur tombol | Mulai Latihan → Periksa Jawaban → (Coba Lagi / Petunjuk) → Lihat Pembahasan → Soal Berikutnya — semua tombol yang tampil benar-benar berfungsi |
| Progres & XP | Tersimpan di localStorage; XP penuh tanpa bantuan, berkurang jika pakai petunjuk; statistik soal dikerjakan/benar/persentase |
| Badge | "Excel Beginner" (1 jawaban benar) dan "SUM Master" (5 jawaban benar) — **hanya dua badge yang dipasang**, karena hanya itu yang benar-benar bisa dicapai pengguna dengan fitur Level 1 yang sudah ada (badge lain di spesifikasi menunggu Level 2+) |
| Reset progres | Tombol di sidebar, dengan konfirmasi, menghapus seluruh data localStorage aplikasi |
| Reset sel | Mengembalikan lembar kerja ke kondisi dataset semula tanpa membuat dataset baru |
| Generate ulang | Membuat dataset Penjualan baru dengan seed acak baru |
| Responsif | Layout menyesuaikan di lebar tablet (≤1024px) dan mobile (≤720px) |

## 3. Cara Menguji

1. Jalankan lewat server lokal (lihat `README.md` — **wajib** server, tidak bisa `file://` langsung karena `fetch()` katalog JSON).
2. Di panel "Atur Latihan": pilih jumlah data (coba 25), biarkan seed kosong, klik **Buat Dataset**.
3. Spreadsheet akan muncul berisi data penjualan acak. Coba klik-klik sel dan gunakan panah keyboard — perhatikan formula bar & name box ikut berubah.
4. Klik **Mulai Latihan** — soal Level 1 muncul (mis. "Hitung TOTAL Total Penjualan…"), dan sel jawaban di-highlight kuning di baris paling bawah data.
5. Klik **Lompat ke Sel Jawaban** (link biru di panel soal) untuk memastikan navigasi ke sel yang benar.
6. Ketik rumus di sel (atau di formula bar), misalnya `=SUM(M2:M26)` (sesuaikan kolom & rentang dengan soal yang muncul), tekan Enter, lalu klik **Periksa Jawaban**.
7. Coba juga: jawaban salah kolom, jawaban dengan huruf kecil (`=sum(...)`), jawaban dengan pemisah `;`, dan rumus yang dipecah dua rentang (`=SUM(M2:M15,M16:M26)`) — semua kombinasi yang benar secara hasil akan diterima (sudah diverifikasi lewat pengujian logika otomatis, lihat catatan di bawah).
8. Klik **Petunjuk** berulang kali — pastikan tiga tingkat petunjuk terbuka satu per satu dan tombol berhenti aktif setelah tingkat ketiga.
9. Setelah jawaban benar, cek panel sidebar kiri: XP, jumlah soal, persentase, dan badge "Excel Beginner" harus muncul.
10. Klik **Soal Berikutnya** beberapa kali, kumpulkan 5 jawaban benar, cek badge "SUM Master" muncul.
11. Refresh halaman (F5) — progres XP/badge harus tetap ada (localStorage).
12. Klik **Reset Progres** di sidebar — konfirmasi — pastikan statistik kembali ke 0.

**Pengujian logika otomatis** (di luar UI, dijalankan lewat Node.js terhadap modul murni `dataset-generator.js`, `spreadsheet-engine.js`, `question-generator.js`, `formula-validator.js`, `progress-manager.js`) sudah memverifikasi:
- Reproduksibilitas dataset dengan seed yang sama.
- Rumus benar dengan huruf besar/kecil campur, pemisah `,`/`;`, dan rentang yang dipecah tetap diterima ("BENAR") selama hasil & fungsinya tepat.
- Rumus dengan fungsi salah atau kolom salah ditolak dengan pesan yang relevan.
- Jawaban berupa angka biasa (bukan rumus) ditolak.
- Perhitungan XP dan pembukaan badge sesuai aturan (penalti petunjuk, ambang badge).
- Performa generate + build grid untuk 1.000 baris (~14.000 sel) berjalan di bawah 100ms untuk logika inti (rendering DOM di browser sungguhan belum diukur langsung, lihat keterbatasan).

## 4. Bug / Keterbatasan yang Diketahui

- **Dataset & level lain belum aktif.** Akuntansi, Karyawan/HR, Persediaan, dan Level 2–6 sudah tampil di navigasi tapi sengaja dinonaktifkan (label "Segera") — akan dibangun di tahap berikutnya. Ini bukan bug, tapi cakupan Tahap 1 yang disengaja.
- **Data & header dataset dikunci (readonly).** Sel-sel berisi data hasil generate tidak bisa diedit siswa. Ini keputusan desain yang disengaja: jika data sumber bisa diubah bebas, nilai "jawaban benar" yang sudah dihitung saat generate akan menjadi tidak sinkron dengan data yang terlihat. Baris kosong, baris jawaban, dan beberapa kolom coretan tambahan tetap bisa diedit bebas.
- **Belum ada Undo/Redo, Copy Formula, dan Fill Handle.** Ketiganya ada di spesifikasi keseluruhan proyek tapi eksplisit belum diminta pada Tahap 1 — sengaja tidak dipasang tombolnya dulu (menghindari tombol tanpa fungsi), akan ditambahkan pada tahap pengembangan spreadsheet lanjutan.
- **Dataset 500–1.000 baris berpotensi terasa berat** di perangkat dengan performa rendah karena tabel dirender penuh (belum ada virtualisasi baris). Logika perhitungan sendiri sudah diuji cepat (lihat bagian 3); yang berat berpotensi adalah rendering DOM ribuan elemen `<input>` di browser.
- **Evaluator rumus Tahap 1 hanya menerima bentuk `=FUNGSI(argumen)` tunggal** (belum mendukung kombinasi aritmatika seperti `=SUM(A1:A10)+10` atau rumus bertingkat/nested). Ini sudah cukup untuk seluruh materi Level 1, dan akan diperluas saat Level 2–3 (IF, VLOOKUP, dll.) dikembangkan.
- **`formula-library.js` (pembaca katalog JSON) sudah berfungsi penuh** tapi belum ditautkan ke panel UI referensi rumus — saat ini katalog baru dipakai secara internal/tersedia untuk tahap pengembangan berikutnya (mis. panel "Daftar Rumus").
- **Export CSV/XLSX dan Mode Ujian belum ada** — sesuai urutan prioritas di spesifikasi awal, keduanya direncanakan setelah Level 1–3 dan dataset lain selesai.
- Belum diuji pada browser sungguhan (lingkungan pengembangan ini tidak memiliki browser) — pengujian dilakukan lewat simulasi logika di Node.js plus pemeriksaan bahwa seluruh path aset (CSS/JS/JSON) termuat dengan status HTTP 200 lewat server lokal, serta seluruh `id` HTML yang dirujuk `app.js` sudah dicocokkan otomatis. Mohon konfirmasi dari sisi Anda setelah mencoba di browser, terutama untuk hal-hal visual (tata letak, warna, responsivitas) yang tidak bisa diverifikasi otomatis dari sini.

## 5. Rencana Tahap Berikutnya (usulan, menunggu konfirmasi Anda)

- Dataset Akuntansi, Karyawan/HR, dan Persediaan (generator + tipe soal masing-masing).
- Level 2 (IF, COUNTIF, SUMIF, fungsi teks & tanggal dasar) dan Level 3 (SUMIFS, COUNTIFS, VLOOKUP, INDEX-MATCH).
- Panel referensi/daftar rumus berbasis `formula-library.js` yang sudah siap.
- Undo/Redo, Copy Formula, Fill Handle pada spreadsheet.
- Mode Ujian.
- Ekspor CSV & XLSX (SheetJS).
