# Excel Formula Practice Generator

Generator workbook latihan rumus Microsoft Excel (.xlsx) dari dataset realistis, berjalan sepenuhnya di browser (HTML/CSS/JavaScript murni), tanpa backend, tanpa API key, dan gratis.

> **Status:** Sistem latihan interaktif di browser (spreadsheet grid, pemeriksaan jawaban otomatis, XP) sudah **dihapus total**. Satu-satunya cara latihan sekarang: panel "Generator Workbook Latihan (.xlsx)" di `index.html` — pilih Level (Beginner/Profesional/Expert) & Materi (Sales/Inventori/Karyawan/Akuntansi & Pajak Korporat/Administrasi Perpajakan/Financial Modeling & Proyeksi Bisnis), lalu unduh workbook 4-sheet (`Lembar latihan` / `dataset` / `kunci jawaban` / `Penjelasan Rumus`) yang layout-nya mengikuti file contoh, dan dikerjakan langsung di Excel. SEMUA 6 materi sekarang punya kolom soal yang dipilih ACAK dari pool tiap kali di-generate (lihat `pickPoolItems` di `js/exercise-generator.js`) — pool sudah diperluas di semua level, dan katalog data (produk/barang/jabatan/akun/jenis transaksi) juga diperluas supaya isi dataset lebih beragam antar generate. `LET` (Excel 365/2021) DIPAKAI LAGI di level Expert setelah bug sebelumnya ditemukan: nama VARIABEL di dalam LET juga wajib diberi awalan tersembunyi `_xlpm.` (bukan cuma nama fungsinya `_xlfn.LET`) — lihat `buildLetFormula()` di `js/exercise-generator.js` dan referensi https://groups.google.com/g/openpyxl-users/c/O746AjGV9EY. LibreOffice versi lama di lingkungan pengembangan tetap tidak bisa merekalkulasi `LET`/`XLOOKUP` (jadi tidak bisa diverifikasi otomatis di sana untuk fungsi itu spesifik) — sudah ditelusuri manual dan divalidasi tidak ada error BARU di luar keterbatasan itu (1440 spec + 108 workbook nyata direkalkulasi, nol error di luar sel yang memang bergantung LET/XLOOKUP). Formula lain yang ditambahkan: `SUMPRODUCT` (rata-rata tertimbang), `CHOOSE` (alternatif band-lookup selain INDEX+MATCH), `TEXTJOIN`, `MID`/`MOD`/`ABS`/`FIND`/`LOWER`. Kolom pajak (PPh 21, PPh Badan, PPh 23, sanksi keterlambatan) DISEDERHANAKAN untuk keperluan latihan rumus — bukan pengganti perhitungan SPT sungguhan; catatan penyederhanaan ada di sheet "Penjelasan Rumus" masing-masing workbook. Lihat `js/exercise-generator.js` (spesifikasi soal per level) dan `js/export/exercise-workbook-writer.js` (render .xlsx). Riwayat pengembangan sebelum penyederhanaan ini ada di [`docs/STATUS-TAHAP-6.md`](./docs/STATUS-TAHAP-6.md), [`docs/STATUS-TAHAP-5.md`](./docs/STATUS-TAHAP-5.md), [`docs/STATUS-TAHAP-4.md`](./docs/STATUS-TAHAP-4.md), [`docs/STATUS-TAHAP-3.md`](./docs/STATUS-TAHAP-3.md), [`docs/STATUS-TAHAP-2.md`](./docs/STATUS-TAHAP-2.md), [`docs/STATUS-TAHAP-1.md`](./docs/STATUS-TAHAP-1.md) — dokumen itu mendeskripsikan sistem lama yang sudah tidak ada di kode saat ini.

## Menjalankan Secara Lokal

Sekarang cukup buka `index.html` langsung di browser (lewat `file://`) — sudah tidak ada lagi pemanggilan `fetch()` ke file data lokal yang butuh server HTTP. Kalau tetap ingin lewat server (mis. supaya path relatif ke modul portal `../../js/...` konsisten dengan deployment), pilih salah satu:

**Python 3 (biasanya sudah terpasang di macOS/Linux):**
```bash
python3 -m http.server 8000
```
Lalu buka http://localhost:8000 di browser.

**Node.js (tanpa instalasi global, pakai npx):**
```bash
npx serve .
```

**VS Code:**
Gunakan ekstensi "Live Server", klik kanan `index.html` → "Open with Live Server".

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub (atau gunakan repository yang sudah ada).
2. Push seluruh isi folder `excel-formula-practice-generator/` ke branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Excel Formula Practice Generator - Tahap 1"
   git branch -M main
   git remote add origin https://github.com/<username>/<nama-repo>.git
   git push -u origin main
   ```
3. Di repository GitHub: **Settings → Pages → Build and deployment → Source**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Simpan. Setelah beberapa menit, aplikasi akan tersedia di:
   `https://<username>.github.io/<nama-repo>/`

Semua path pada `index.html` (CSS, JS, JSON) menggunakan path relatif (`./css/...`, `./js/...`, `./data/...`) sehingga kompatibel langsung dengan struktur subfolder GitHub Pages.

## Struktur Proyek

```
excel-formula-practice-generator/
├── index.html
├── package.json               # HANYA untuk menjalankan tests/ (npm install jsdom exceljs) — aplikasi sendiri tidak butuh npm
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js                    # orkestrator UI & state aplikasi
│   ├── formula-interactivity.js  # mode point-klik, highlight referensi, fill handle, autocomplete
│   ├── dataset-generator.js      # generator dataset Penjualan/Akuntansi/HR/Persediaan + Penjualan Relasional (seeded, mulberry32)
│   ├── spreadsheet-engine.js     # model grid + evaluator rumus (murni, tanpa DOM)
│   ├── formula-validator.js      # pemeriksa jawaban (hasil + struktur, anti-hardcode, bukan cuma cocok teks)
│   ├── question-bank.js          # bank template soal Level 1-6 + TIER_CONFIG (pemetaan Beginner/Professional/Expert)
│   ├── question-engine.js        # mesin generate soal: pilih template, validasi struktur & kesulitan, anti-duplikat
│   ├── question-generator.js     # lapisan kompatibilitas lama — mendelegasikan ke question-engine.js
│   ├── question-history.js       # fingerprint anti-duplikat (sesi & riwayat lokal)
│   ├── progress-manager.js       # XP, statistik, badge (di atas storage-manager.js)
│   ├── storage-manager.js        # satu-satunya modul yang menyentuh localStorage
│   ├── formula-library.js        # pembaca data/formula-catalog.json
│   └── export/                   # generator file .xlsx sungguhan (ExcelJS)
│       ├── workbook-blueprint.js # susunan sheet (Instructions/Practice/Dataset/AnswerKey tersembunyi/Panduan Fungsi)
│       ├── workbook-renderer.js  # render blueprint -> buffer .xlsx via ExcelJS
│       ├── workbook-theme.js     # warna, font, style sheet
│       └── format-engine.js      # format angka/kolom (mata uang, persen, lebar kolom otomatis)
├── data/
│   └── formula-catalog.json   # katalog rumus (dipakai autocomplete & sheet Panduan Fungsi di export)
├── tests/                     # pengujian otomatis Node.js (lihat bagian "Pengujian Otomatis")
└── docs/
    ├── STATUS-TAHAP-1.md
    ├── STATUS-TAHAP-2.md
    ├── STATUS-TAHAP-3.md
    ├── STATUS-TAHAP-4.md
    ├── STATUS-TAHAP-5.md
    └── STATUS-TAHAP-6.md
```

## Pengujian Otomatis

Seluruh logika inti (evaluator rumus, mesin soal, validator jawaban, ekspor `.xlsx`, penyesuaian referensi fill handle) diuji lewat Node.js. Jalankan semuanya sekaligus:

```bash
npm install jsdom exceljs --no-save   # sekali saja — dua test file butuh jsdom, tiga butuh exceljs (sudah didaftarkan di devDependencies)
npm test
```

`npm test` menjalankan ketujuh file berikut secara berurutan (lihat `package.json`):

| File | Yang diuji | Butuh jsdom? |
|---|---|---|
| `tests/test-question-engine.mjs` | Bank soal Level 1-6, validasi kesulitan, anti-duplikat, seed dataset reproducible | Tidak |
| `tests/test-engine-additions.mjs` | Penyesuaian referensi fill handle, referensi melingkar, regresi fungsi dasar | Tidak |
| `tests/test-formula-interactivity.mjs` | Pewarnaan referensi, autocomplete, petunjuk argumen (logika murni) | Tidak |
| `tests/test-formula-interactivity.dom.mjs` | Simulasi klik/drag/keydown sungguhan (mode point-klik, fill handle) | Ya |
| `tests/test-workbook-export.mjs` | Struktur workbook, render `.xlsx` sungguhan via ExcelJS lalu dibaca ulang | Ya (untuk sebagian) |
| `tests/test-answer-checking.mjs` | Alur "Periksa Jawaban" ujung-ke-ujung (`validateAnswer()` + `recordAttempt()`) | Ya |
| `tests/test-new-functions.mjs` | Fungsi Tahap 4 (`ROUND`/`COUNTA`/`AVERAGEIF`/`AVERAGEIFS`/`IFS`/`XLOOKUP`/`HLOOKUP`) — unit + ujung-ke-ujung lewat `validateAnswer()` sungguhan | Tidak |
| `tests/test-tier-mapping.mjs` | Pemetaan tier Beginner/Professional/Expert (Tahap 5) — kelengkapan pemetaan 6 level, dan tier benar-benar terlihat di subtitle file `.xlsx` sungguhan | Ya (untuk bagian render) |
| `tests/test-relational-dataset.mjs` | Dataset relasional `sales-relational` (Tahap 6) — integritas referensial, soal sukses di 6 level, lookup lintas-tabel Level 3 ujung-ke-ujung lewat `validateAnswer()`, dan blok Master Produk terlihat di sheet Dataset hasil export | Ya (untuk bagian export) |

Setiap file juga bisa dijalankan sendiri-sendiri lewat skrip `npm run test:questions` / `test:engine` / `test:logic` / `test:dom` / `test:export` / `test:answers` / `test:new-functions` / `test:tiers` / `test:relational`.

Aplikasi itu sendiri **tidak pernah** membutuhkan `npm install` atau proses build — `package.json` di root hanya menyediakan skrip `npm test` sebagai jalan pintas menjalankan file-file di atas.

## Materi & Level

**Materi dataset dibatasi jadi 3** (lihat `DATASET_GENERATORS` di `js/dataset-generator.js`): **Penjualan**, **Persediaan / Pergudangan**, **HR (Karyawan)**. Akuntansi dan varian multi-tabel `sales-relational` dipindah ke `EXPERIMENTAL_DATASET_GENERATORS` (tidak tampil di navigasi materi, tapi generator & testnya tetap ada — bukan dihapus, tinggal didaftarkan ulang ke `DATASET_GENERATORS` kalau suatu saat mau diaktifkan lagi).

Level 1 (Pemula) sampai Level 6 (Profesional) di alat latihan interaktif **tidak berubah** (mesin bank soal, validasi kesulitan, anti-duplikat — semua sama seperti sebelumnya, diuji lewat `tests/test-question-engine.mjs`). Yang berubah adalah **file `.xlsx` hasil export**, yang sekarang murni berbasis 3 tingkatan (bukan salah satu dari 6 level individual) — tier diturunkan otomatis dari level yang sedang aktif di alat latihan lewat `getTierForLevel()` (lihat `TIER_CONFIG` di `js/question-bank.js`):

| Tier | Level internal (kumpulan template) | Kolom "isi tabel" di export | Ringkasan |
|---|---|---|---|
| 🌱 **Beginner** | Level 1 — agregasi dasar tanpa kondisi (SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/ROUND) | 0 (semua templatenya whole-dataset, tidak masuk akal "di-drag ke bawah") | 6 soal |
| 💼 **Professional** | Level 2-4 — IF, agregasi bersyarat, lookup (VLOOKUP/XLOOKUP/INDEX-MATCH), tanggal & teks, multi-kriteria | ~6 kolom | 4 soal |
| 🧠 **Expert** | Level 5-6 — formula bersarang, kondisi ganda, skenario bisnis (`businessScenario: true`) | ~5 kolom | 8 soal (paling banyak & paling kompleks, sesuai spesifikasi) |

Target jumlah kolom/ringkasan per tier ada di `TABLE_FILL_TARGETS` (`js/app.js`) — bisa disetel ulang tanpa menyentuh mesin soal itu sendiri. Untuk dataset HR/Persediaan, jumlah kolom Expert yang berhasil dibangun bisa LEBIH SEDIKIT dari target (biasanya 2, bukan 5) — sejumlah template Level 4-6 mencari nama kolom spesifik gaya Penjualan (`Kategori`/`Wilayah`/`Total Penjualan`) yang memang tidak ada di dataset lain; ini keterbatasan bank soal yang sudah ada sebelumnya, bukan regresi baru (lihat `js/table-fill-builder.js`, yang secara graceful melewati template yang gagal di-build alih-alih error).

Yang **masih menjadi keterbatasan** dan perlu diketahui sebelum dipakai untuk pelatihan skala besar:

- **`HLOOKUP` sudah didukung penuh oleh evaluator** (lihat `docs/STATUS-TAHAP-4.md`) tapi belum ada template soal yang memakainya secara spesifik — dataset yang ada disusun per-baris (row-oriented), bukan per-kolom, sehingga HLOOKUP kurang natural dipakai tanpa tabel transposisi khusus.
- Sejumlah template Level 3/4/6 mencari nama kolom spesifik gaya dataset Penjualan (lihat paragraf di atas) — belum digeneralisasi untuk mendeteksi kolom setara di dataset lain.

### Export `.xlsx` — mode "isi tabel" + KODE SOAL/KODE JAWABAN & sheet Mesin

Sheet **Latihan** hasil export sekarang berupa **satu tabel data bersama** (bukan lagi kotak terpisah per soal) — meniru format file latihan "Extreme Level" belajarexcel.id yang dijadikan referensi langsung: kolom bernomor (1, 2, 3, …) di atas kolom jawaban berlatar kuning, siswa mengisi SATU rumus yang sama lalu di-drag/salin ke bawah untuk SELURUH baris data (atau satu rumus array yang meluber/spill). Soal yang jawabannya SATU untuk seluruh dataset (mis. `SUM`/`SUMIFS` total — tidak masuk akal "di-drag") tetap tampil terpisah sebagai baris di bagian "Ringkasan" di bawah tabel utama, meniru soal-soal standalone pada file referensi "Data Grid".

Kolom "isi tabel" dibangun oleh `js/table-fill-builder.js`: template soal yang sama (dari `js/question-bank.js`, tidak diubah kontennya) "disapu" ke SETIAP baris dataset lewat mekanisme *seeded sweep* — `Math.random()` di-override sementara dengan PRNG ber-seed yang di-reset ke seed yang sama sebelum tiap baris, supaya pilihan non-row (kolom sumber, threshold, dst.) tetap konsisten antar baris sementara `pickRowIdx(ctx)` (lihat `js/question-bank.js`) melompat langsung ke baris yang diminta tanpa memakai `Math.random()` sama sekali. Hanya template ber-kategori "row-varying" (`lookup`/`lookup_safe`/`conditional_logic`/`text`/`date`/`nested_logic`) yang jadi kolom; kategori "whole-dataset" (`aggregation`/`multi_criteria`/`conditional_sum`/`conditional_count`/`business_case`) jadi Ringkasan.

Setiap file yang diekspor punya:

- **KODE SOAL** — kode singkat deterministik dari (dataset + tier + seed), tampil di header sheet Latihan.
- **KODE JAWABAN** — string `KODESOAL|hex;hex;...`, dihasilkan otomatis oleh sheet `Mesin` (veryHidden) dan berubah live saat siswa mengisi/mengedit jawaban. Untuk tiap KOLOM, sheet Mesin memverifikasi lewat rumus: SELURUH baris terisi; baris pertama benar-benar berupa RUMUS (`_xlfn.FORMULATEXT`, bukan ketik manual) yang memakai salah satu fungsi yang disarankan dan mengacu ke sheet `Dataset`; DAN rumus itu **konsisten di-drag ke semua baris** (panjang teks rumus sama) **atau berupa satu rumus array yang meluber** — persis semangat instruksi asli file referensi ("gunakan rumus yang sama di setiap baris, atau 1 rumus array"). Untuk tiap soal Ringkasan, verifikasinya sama seperti versi sebelumnya (satu sel). Kalau verifikasi gagal, checksum diganti **garam (salt) acak** yang di-generate ulang setiap file di-export — kode tetap tampak valid formatnya, tapi jawaban contekan/hardcode tidak akan pernah cocok dengan versi yang benar-benar dikerjakan. Sheet Mesin **tidak pernah** menyimpan jawaban yang benar sebagai teks.
- **SKOR** — "X/N soal lolos verifikasi", live, ditampilkan berdampingan dengan KODE JAWABAN di header Latihan.
- Sheet **Kunci Jawaban** hanya menampilkan status (✅/⏳) + penjelasan yang terkunci (`🔒 Selesaikan dulu...`) sampai kolom/soal itu lolos verifikasi Mesin.

**Keterbatasan yang disengaja:** proyek ini `no-backend` (lihat kebijakan FREE-FIRST) — tidak ada server yang menyimpan KODE JAWABAN "yang benar" per KODE SOAL untuk dicocokkan, beda dari belajarexcel.id yang punya website pengecek. KODE JAWABAN di sini berfungsi sebagai (1) sidik jari anti-contek/anti-salin-tempel yang otentik format-nya, dan (2) sinyal SKOR standalone yang bekerja penuh offline di dalam file itu sendiri, tanpa perlu kunjungan balik ke server mana pun.

**Perbaikan bug sekaligus (Tahap 26.1):** sebelumnya kolom `Tanggal` pada sheet Dataset hasil export tampil rusak/acak (string ISO literal seperti `"2026-02-04T00:00:00.000Z"` terpotong oleh lebar kolom) — akar masalahnya `ws.addTable({ rows })` milik ExcelJS men-serialize objek `Date` jadi teks mentah saat ditulis lewat Table API. Perbaikannya: sel tanggal sekarang selalu berupa angka serial Excel biasa + `numFmt` tanggal, tanpa konversi ke objek `Date` sama sekali.
