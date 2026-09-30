# Status Tahap Audit & Perluasan Fungsi Rumus

Permintaan tahap ini: audit menyeluruh `apps/excel` terhadap spesifikasi "Excel Practice Simulator 3 Level" (Beginner/Professional/Expert, workbook nyata, jawaban ganda valid, anti-hardcode, dsb — 60 bagian), lalu kerjakan perbaikan yang diperlukan tanpa merusak fitur lama ("extend, don't destroy").

## 1. Ringkasan Audit

Temuan paling penting: **aplikasi ini jauh lebih matang dari yang didokumentasikan.** README sebelumnya menyatakan Level 3-6 dan dataset Akuntansi/HR/Persediaan "ditampilkan tapi sengaja dinonaktifkan" — pada kenyataannya, di kode (`app.js`, `dataset-generator.js`, `question-bank.js`) semuanya **sudah `available: true` dan aktif**. Dokumentasinya yang basi, bukan fiturnya yang belum ada.

Arsitektur yang sudah ada sudah memenuhi banyak prinsip inti yang diminta spesifikasi:
- Soal dengan **banyak jawaban valid** (`acceptedFunctions: [...]`, bukan `formula === expected`) — sudah ada sejak awal.
- **Anti-hardcode detection** (`formula-validator.js`) — jawaban `=25500000` ditolak walau hasilnya benar, harus pakai rumus.
- **Seeded RNG** (mulberry32) untuk dataset reproducible.
- **Fingerprint anti-duplikat** lintas soal & sesi.
- **Export `.xlsx` sungguhan** (ExcelJS, bukan library web/paid) dengan sheet Instructions/Practice/Dataset/Answer-Key tersembunyi/Panduan Fungsi — dan `tests/test-workbook-export.mjs` benar-benar me-render lalu MEMBACA ULANG buffer-nya, bukan cuma percaya kode tidak error.

Bug nyata yang ditemukan: template Level 3 (`L3_VLOOKUP_KATEGORI`, dll.) mendaftarkan `XLOOKUP` sebagai jawaban alternatif yang "diterima", tapi evaluator (`spreadsheet-engine.js`) **tidak benar-benar mengimplementasikan `XLOOKUP`** — siswa yang menjawab pakai XLOOKUP (walau valid secara logika) akan ditolak sistem. `HLOOKUP` punya masalah serupa (terdaftar di metadata Level 3 tanpa implementasi nyata). Sudah diperbaiki di tahap ini.

Gap struktural terbesar (BELUM dikerjakan, di luar cakupan tahap ini): dataset saat ini semuanya **tabel tunggal datar**. Lookup di Level 3 mencari nilai di DALAM tabel yang sama, bukan lintas sheet `MASTER_PRODUK`/`MASTER_CUSTOMER` terpisah seperti spesifikasi asli. Ini pekerjaan arsitektur besar yang menyentuh dataset-generator.js, spreadsheet-engine.js (referensi lintas sheet), question-bank.js, dan workbook-blueprint.js sekaligus — sengaja tidak disentuh di tahap ini karena risikonya tinggi untuk dikerjakan tanpa desain matang & konfirmasi terpisah.

## 2. File yang Dibuat / Diubah

| File | Perubahan |
|---|---|
| `js/spreadsheet-engine.js` | Implementasi penuh 7 fungsi baru: `ROUND`, `COUNTA`, `IFS`, `XLOOKUP`, `HLOOKUP` (baru — sebelumnya "terdaftar tapi tidak berfungsi"), `AVERAGEIF`, `AVERAGEIFS` (memperluas `evaluateConditionalAggregate`/`evaluateMultiConditionalAggregate` yang sudah ada, bukan menulis ulang — perilaku `SUMIF`/`SUMIFS`/`COUNTIF`/`COUNTIFS` lama terverifikasi tidak berubah lewat regresi). Juga menambah dukungan literal boolean telanjang (`TRUE`/`FALSE`) di `evaluateCondition()` — dibutuhkan `IFS` sebagai kondisi "catch-all" terakhir, persis gaya Excel asli. |
| `js/question-bank.js` | 5 template soal baru: `L1_ROUND`, `L1_COUNTA` (Level 1/Pemula), `L2_AVERAGEIF_TEXT` (Level 2/Dasar), `L4_AVERAGEIFS_2CRIT`, `L4_IFS_STATUS` (Level 4/Mahir). `LEVEL_CONFIG.allowedFunctions` diperbarui untuk Level 1, 2, dan 4 agar mencerminkan fungsi baru. |
| `data/formula-catalog.json` | 7 entri baru (skema identik dengan entri lama — sintaks, parameter, contoh, kesalahan umum) untuk ketujuh fungsi di atas. Otomatis muncul di autocomplete & sheet "Panduan Fungsi" pada workbook export karena keduanya membaca katalog ini sebagai satu-satunya sumber. |
| `tests/test-new-functions.mjs` | **Baru.** Dua lapis: (1) unit murni terhadap `evaluateFormula()` untuk ketujuh fungsi baru dengan grid buatan tangan; (2) integrasi ujung-ke-ujung — bangkitkan dataset sungguhan, panggil `template.build()` langsung (bukan gambling lewat rotasi acak `generateQuestion()`), lalu jalankan `expectedFormula` milik soal itu lewat `validateAnswer()` yang **persis sama** dengan jalur yang dipakai saat siswa mengetik jawaban di UI. |
| `package.json` | `npm test` diperluas dari 5 jadi 7 file — menambahkan `test-answer-checking.mjs` (sudah ada sebelumnya tapi **tidak pernah ikut jalan di `npm test`/CI** — celah nyata yang diperbaiki) dan `test-new-functions.mjs`. Skrip pintas baru: `test:answers`, `test:new-functions`. |
| `README.md` | Struktur proyek, bagian "Pengujian Otomatis", dan bagian "Materi & Level" diperbarui agar sesuai isi repo yang sebenarnya (lihat bagian 1 di atas). |

## 3. Verifikasi yang Sudah Dijalankan (Bukan Klaim Kosong)

- **Baseline sebelum perubahan:** seluruh 6 file test lama dijalankan satu per satu (termasuk yang butuh jsdom) — **288/288 lulus**.
- **Setelah setiap perubahan besar** di `spreadsheet-engine.js` dan `question-bank.js`: seluruh suite lama dijalankan ulang — **tetap 288/288 lulus, nol regresi**.
- **`tests/test-new-functions.mjs` (baru):** 268/268 lulus. Bagian integrasinya membangkitkan 25 dataset acak (seed berbeda-beda) per template baru (125 iterasi total), membangun grid sungguhan, dan memvalidasi `expectedFormula` lewat `validateAnswer()` asli — **setiap satu formula diterima dan nilainya cocok**, termasuk kasus tepi seperti `ROUND(...,-3)` yang menghasilkan 0 untuk nilai kecil.
- `data/formula-catalog.json` diverifikasi tetap valid JSON dan tidak merusak `test-workbook-export.mjs` (sheet Panduan Fungsi) maupun `test-formula-interactivity.mjs` (autocomplete) setelah 7 entri baru ditambahkan.
- CI (`.github/workflows/ci-deploy.yml`) sudah menjalankan `npm install --no-save jsdom exceljs` sebelum `npm test`, sehingga penambahan file test yang butuh jsdom ke `npm test` aman untuk pipeline yang ada.

## 4. Bug / Keterbatasan yang Diketahui

- **Dataset flat, bukan multi-tabel relasional** — lihat bagian 1. Ini keterbatasan struktural terbesar yang tersisa relatif terhadap spesifikasi "Excel Practice Simulator 3 Level" yang diminta.
- **`HLOOKUP` sudah berfungsi penuh di evaluator tapi belum punya template soal sendiri** — dataset yang ada disusun per-baris (row-oriented); HLOOKUP secara pedagogis lebih pas untuk data per-kolom. Menambah dataset transposisi khusus demi satu fungsi ini sengaja tidak dikerjakan di tahap ini (di luar cakupan "perbaiki yang sudah ada dan yang jelas dibutuhkan").
- **`IFS` di `L4_IFS_STATUS` menggunakan literal `TRUE`** sebagai cabang default — ini sesuai gaya Excel asli, tapi berarti evaluator sekarang mengenali `TRUE`/`FALSE` sebagai kondisi valid di mana saja (bukan cuma di dalam IFS). Belum ditemukan efek samping (semua regresi lulus), tapi dicatat di sini karena ini perluasan perilaku `evaluateCondition()` yang sebelumnya tidak ada sama sekali.
- Level naming di internal engine masih `1-6` (Pemula/Dasar/Menengah/Mahir/Ahli/Profesional), **belum** dipetakan ke framing 3-tingkat `beginner`/`professional`/`expert` yang diminta spesifikasi asli. Pemetaan yang masuk akal (mis. L1-2=Beginner, L3-4=Professional, L5-6=Expert) memungkinkan tanpa membongkar mesin yang ada, tapi butuh perubahan UI/copy yang belum dikerjakan di tahap ini.

## 5. Rencana Tahap Berikutnya (usulan, menunggu konfirmasi Anda)

- **Prioritas tertinggi kalau ingin benar-benar memenuhi spesifikasi asli:** desain & bangun dataset multi-tabel relasional (mis. `TRANSAKSI` + `MASTER_PRODUK` sebagai sheet terpisah) untuk Level 3+, termasuk dukungan referensi lintas-sheet di `spreadsheet-engine.js` (saat ini semua referensi diasumsikan satu grid/sheet).
- Petakan Level 1-6 internal ke framing Beginner/Professional/Expert di UI (`app.js`) tanpa mengubah mesin soal itu sendiri.
- Dataset transposisi khusus (atau template soal baru) supaya `HLOOKUP` benar-benar punya jalur latihan, bukan cuma didukung evaluator.
- Pertimbangkan memisahkan unduhan `practice.xlsx` vs `practice-answer-key.xlsx` sebagai dua file terpisah (spesifikasi asli Bagian 37-38) — saat ini answer key sudah ada sebagai sheet tersembunyi dalam satu file yang sama, bukan file terpisah.
