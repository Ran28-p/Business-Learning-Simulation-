# Business Learning Simulator — Audit & Fix Report

Tanggal: 19 Agustus 2026

## 1. Masalah utama yang ditemukan dari video

Video menunjukkan tombol **Unduh PDF** pada Tax Knowledge Center menghasilkan file PDF yang terbuka sebagai halaman kosong/putih di Chrome.

Akar masalah yang diperkuat oleh source code:
- elemen sumber PDF sebelumnya dibuat `position: fixed`;
- elemen dibatasi `max-height: 100vh` dan `overflow: auto`;
- proses menggunakan `.save()` langsung dari html2pdf;
- tidak ada validasi terhadap Blob PDF hasil render.

## 2. Perbaikan PDF

`js/knowledge-base.js` diperbaiki dengan:
- source PDF menggunakan `position:absolute` dan tidak dibatasi tinggi viewport;
- `overflow:visible`, `visibility:visible`, dan `opacity:1`;
- konfigurasi `html2canvas` mempertahankan background putih dan viewport 794px;
- `onclone` memaksa cloned PDF host tetap visible dan tidak terpotong;
- hasil PDF dibuat sebagai Blob melalui `outputPdf('blob')`;
- Blob divalidasi sebelum download;
- download menggunakan object URL + anchor `download`;
- object URL dibersihkan setelah download;
- fallback Cetak → Save as PDF tetap tersedia bila renderer gagal.

## 3. Audit source dan integritas project

CI/static lint:
- 115 file `.js/.mjs` berhasil dicek syntax.
- 5 file JSON berhasil divalidasi.
- 14 HTML diperiksa.
- 102 link lokal diverifikasi.
- Hasil: **PASS**.

## 4. Excel engine

Tes yang dapat dijalankan tanpa DOM dependency:
- question engine: **162 assertion PASS, 0 FAIL**
- engine additions: **20 PASS, 0 FAIL**
- formula interactivity core: **21 PASS, 0 FAIL**

Tes DOM/workbook export membutuhkan dependency `jsdom` yang tidak tersedia pada environment audit ini. Source project tetap mempertahankan dependency tersebut di package manifest/lockfile. Ini adalah keterbatasan environment audit, bukan perubahan pada production code.

## 5. Responsive SPT

Source sudah memiliki hardening responsive untuk:
- sidebar mobile;
- form 1770;
- tabel horizontal scroll;
- tab horizontal scroll;
- input nominal;
- tombol aksi;
- header/hero;
- safe-area dan dynamic viewport height.

Tidak dilakukan perubahan agresif pada struktur tabel formulir resmi agar layout formulir tidak rusak; tabel besar diarahkan ke horizontal scroll pada layar kecil.

## 6. Catatan keamanan

Konfigurasi Firebase web yang ada di client bukan password/secret server. Namun Firebase Realtime Database/Storage tetap harus dilindungi dengan Security Rules yang ketat pada project Firebase. File konfigurasi client tidak cukup untuk menjamin keamanan data.

## 7. Catatan regulasi

Audit materi pajak harus tetap mengacu pada sumber resmi DJP/peraturan yang berlaku. Untuk PPh 21, PMK 168/2023 menetapkan bahwa Bukan Pegawai menggunakan dasar pengenaan 50% dari bruto dan tarif Pasal 17; bukan TER bulanan pegawai tetap. Sumber resmi: DJP.

## 8. Kesimpulan

Project final ini mempertahankan seluruh source aplikasi asli tanpa `.git` history, memperbaiki bug PDF yang terlihat pada video, dan lolos static integrity check. Pengujian yang membutuhkan `jsdom` belum dapat dieksekusi penuh karena dependency runtime tersebut tidak tersedia pada environment audit.
