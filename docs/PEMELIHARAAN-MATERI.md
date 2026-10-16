# Pemeliharaan Materi

Panduan menjaga materi Portal Belajar tetap akurat dan tepercaya setelah Fase 0–4.
Materi pajak paling cepat usang, jadi proses ini sengaja dibuat ringan dan otomatis.

## Alat yang sudah ada

| Alat | Fungsi | Dijalankan |
|---|---|---|
| `scripts/check-knowledge.mjs` | Skema materi, ratchet cakupan sumber, kelengkapan pembahasan soal | CI tiap push |
| `scripts/check-staleness.mjs` | Daftar regulasi valid, setiap regulasi yang dirujuk **terdaftar**, laporan umur verifikasi | CI tiap push (tanpa gagal karena umur) dan bulanan (gagal bila kedaluwarsa) |
| `tests/test-pembahasan-angka.mjs` | Contoh hitung di materi dicocokkan dengan mesin pajak | CI tiap push |
| `.github/workflows/materi-review.yml` | Pengingat terjadwal tanggal 1 tiap bulan | GitHub Actions |

## Daftar regulasi (`scripts/regulasi-terpantau.json`)

Setiap peraturan yang disebut di materi, soal, atau pembahasan harus ada di sini. Isi tiap entri:

- `id` — contoh `PMK 131/2024` (alias bentuk lain di `alias`)
- `status` — `berlaku`, `diubah`, `historis` (sudah diganti; wajib `digantiOleh`), atau `dicabut`
- `verifikasi` — `teks-resmi`, `sumber-sekunder`, atau `pengetahuan-umum`
- `terakhirDicek` — `YYYY-MM`
- `topik` — modul yang memakainya; `catatan` — hal yang perlu dicek manual

Menambah regulasi baru di materi tanpa mendaftarkannya akan **menggagalkan CI**.

## Alur tinjau berkala (saran: tiap 6 bulan, atau saat ada PMK/PP baru)

1. Jalankan `node scripts/check-staleness.mjs`. Lihat bagian "Umur verifikasi" dan "prioritas".
2. Untuk tiap regulasi kedaluwarsa atau berprioritas: buka teks resmi (peraturan.go.id, jdih.kemenkeu.go.id, pajak.go.id).
3. Bila ada perubahan: perbaiki materi/soal/pembahasan, perbarui entri (`status`, `digantiOleh`, `catatan`).
4. Naikkan `verifikasi` menjadi `teks-resmi` bila sudah dibaca dari teks aslinya, lalu isi `terakhirDicek`.
5. Perbarui `reviewed` pada subbab materi yang terdampak, dan `sources` bila perlu.
6. Jalankan `node tests/test-pembahasan-angka.mjs` bila ada tarif, PTKP, atau angka contoh yang berubah; sesuaikan mesin `apps/spt/js/shared/tax-engine.js` lebih dulu, baru materinya.
7. Jalankan `node scripts/check-knowledge.mjs --update-baseline` bila cakupan sumber bertambah.
8. Naikkan `CACHE_NAME` di `sw.js` aplikasi yang terdampak, dan catat di `CHANGELOG-MATERI.md`.

## Prioritas verifikasi ke teks resmi saat ini

Belum ada regulasi yang diverifikasi dari teks resminya (semua lewat sumber sekunder atau pengetahuan umum). Urutan yang disarankan:

1. **PP 20/2026**: batas waktu OP dan PT Perorangan, serta Pasal II peralihan.
2. **PMK 131/2024**: Pasal 2, 3, 5 (DPP nilai lain).
3. **PMK 111/2025**: tenggat tanggapan SP2DK.
4. **PMK 168/2023** dan **PMK 81/2024**: TER, biaya jabatan, Coretax.
5. Sisanya yang bertanda `pengetahuan-umum` di daftar.

## Hal yang berubah tiap bulan (jangan di-hardcode)

- Tarif bunga sanksi administrasi (KMK bulanan) — contoh di materi hanya ilustrasi bertanggal.
- Kurs, suku bunga acuan, dan insentif sementara.

## Aturan menulis materi baru

- Setiap subbab memuat `sources` (tipe, rujukan, catatan, tautan https) dan `reviewed` hanya bila klaim benar-benar diverifikasi; atau `noSourceNeeded` dengan alasan.
- Contoh hitung ditulis dengan angka yang bisa dihitung ulang oleh mesin, lalu ditambahkan ke `tests/test-pembahasan-angka.mjs`.
- Soal baru wajib punya `pembahasan` lengkap (lihat lint di `check-knowledge.mjs`).
