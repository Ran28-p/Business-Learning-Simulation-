# Status Tahap Dataset Relasional (Multi-Tabel) — Master Produk

Permintaan tahap ini: pekerjaan besar terakhir yang tersisa dari `docs/STATUS-TAHAP-4.md`/`STATUS-TAHAP-5.md` — dataset multi-tabel relasional sungguhan (`TRANSAKSI` + `MASTER_PRODUK` terpisah), sesuai spesifikasi produk Bagian 9, 13, 18.

## 1. Keputusan Desain Paling Penting: Blok Kolom, Bukan Sheet Excel Terpisah

Sebelum menulis kode, dilakukan audit terhadap arsitektur grid interaktif yang sudah ada (`js/app.js`, `js/spreadsheet-engine.js`), dan ditemukan fakta krusial:

- **`spreadsheet-engine.js` adalah model satu-grid-satu-sheet di seluruh file** — `createGrid()`, `getCellValue()`, `setCellRaw()`, `cellAddress()`, `evaluateFormula()` semuanya mengasumsikan SATU grid 2D, tanpa dimensi "nama sheet" sama sekali.
- **UI tab "Sheet 1 / Sheet 2" yang sudah ada TERNYATA tidak menyimpan banyak grid sekaligus** — `rebuildDataSheetGrid()` (Sheet 1) dan `buildPracticeSheetGrid()` (Sheet 2) sama-sama **MENGGANTI `state.grid` sepenuhnya** setiap kali dipanggil. Tidak ada mekanisme "grid A dan grid B hidup bersamaan lalu formula di A merujuk ke B".

Membangun dukungan multi-sheet sungguhan (referensi lintas-sheet di evaluator, PLUS `formula-interactivity.js` — 740 baris logika klik-geser mouse — bisa membiarkan siswa klik sel di sheet lain saat menyusun formula) adalah pembongkaran arsitektur besar yang menyentuh HAMPIR SEMUA file inti aplikasi, dengan risiko tinggi merusak fitur interaktif yang jadi nilai jual utama aplikasi ini (dan yang saat ini 0 bug, 1069 test lulus).

**Keputusan:** Master Produk diletakkan sebagai **blok kolom terpisah pada SHEET/GRID YANG SAMA** (bukan tab Excel terpisah), dengan jarak visual yang jelas dari tabel Transaksi dan area coretan siswa. Ini:
- **Tidak mengubah `spreadsheet-engine.js` sama sekali** — VLOOKUP/XLOOKUP yang sudah ada dan teruji (Tahap 4) sudah bisa mencari di rentang kolom mana pun dalam satu grid, termasuk blok kolom terpisah ini, tanpa perubahan apa pun.
- **Tidak mengubah `formula-interactivity.js` sama sekali** — klik sel di blok Master Produk berperilaku identik dengan klik sel mana pun, karena secara teknis memang satu grid yang sama.
- **Tetap memberi pengalaman lookup lintas-tabel yang sungguhan secara pedagogis**: tabel Transaksi TIDAK punya kolom Nama Produk/Kategori/Harga Satuan sama sekali — siswa WAJIB melakukan VLOOKUP/XLOOKUP ke blok lain, persis tujuan Bagian 9 & 13 spesifikasi.

Trade-off yang disadari: ini bukan "tab sheet Excel terpisah" seperti mockup `TRANSAKSI`/`MASTER_PRODUK` di spesifikasi asli. Kalau ke depannya benar-benar dibutuhkan sheet Excel terpisah yang genuinely interaktif (bisa diklik lintas-tab saat menyusun formula), itu tetap pekerjaan arsitektur besar tersendiri — lihat bagian 5.

## 2. Yang Dikerjakan

| File | Perubahan |
|---|---|
| `js/dataset-generator.js` | `generateSalesRelationalDataset()` baru — tabel TRANSAKSI (`No, ID Transaksi, Tanggal, Kode Produk, Nama Sales, Kuantitas`, TANPA data produk) + `meta.masterTable` (katalog LENGKAP 13 produk, dipakai ulang dari `PRODUK_MASTER` yang sudah ada — sama dengan yang dipakai dataset `sales` biasa, supaya konsisten). Terdaftar sebagai dataset baru `'sales-relational'` di `DATASET_GENERATORS` — otomatis muncul di sidebar karena `renderDatasetNav()` di `app.js` sudah men-generate UI dari `Object.entries(DATASET_GENERATORS)` tanpa perlu diubah. |
| `js/question-bank.js` | 3 template Level 3 baru: `L3_MASTER_VLOOKUP_NAMA`, `L3_MASTER_VLOOKUP_HARGA` (VLOOKUP gaya table_array+col_index), `L3_MASTER_XLOOKUP_KATEGORI` (XLOOKUP gaya lookup_array+return_array terpisah — lebih representatif dari pemakaian XLOOKUP sungguhan). Ketiganya `return null` kalau dataset aktif bukan `'sales-relational'` atau `ctx.masterBlock` tidak ada — jadi 4 dataset lama sama sekali tidak terpengaruh. |
| `js/question-engine.js` | `generateQuestion()` dan `generateQuestionBatch()` menerima parameter opsional baru `masterBlock` (default `null`), diteruskan ke `ctx.masterBlock` untuk dibaca template. |
| `js/question-generator.js` | `generateQuestionForLevel()` (lapisan kompatibilitas) juga meneruskan `masterBlock` — untuk konsistensi API, walau `app.js` saat ini memakai `generateQuestionBatch()`. |
| `js/app.js` | `rebuildDataSheetGrid()` diperluas: kalau `state.dataset.meta.masterTable` ada, blok Master Produk digambar di kolom jauh setelah area coretan siswa (jarak aman, dihitung dari `EXTRA_SCRATCH_COLS`), dengan judul bagian, baris header, dan baris data — semua `readonly`. Posisi persisnya disimpan di `state.masterBlockLayout` dan dialirkan ke `generateQuestionBatch()` sebagai `ctx.masterBlock` lewat `preparePracticeQuestions()`. |
| `js/export/workbook-blueprint.js` | `buildWorkbookBlueprint()` membaca `dataset.meta.masterTable` (kalau ada) dan menambahkannya ke `datasetBlock.masterTable` (headers, semantik kolom, baris) — dibaca langsung dari `dataset.meta`, TIDAK butuh parameter baru dari pemanggil. |
| `js/export/workbook-renderer.js` | `renderDatasetSheet()` merender blok Master Produk di BAWAH tabel utama pada sheet "Dataset" yang sama (bukan tab terpisah — lihat catatan penting di bagian 3), dengan judul, header, dan baris data yang diformat memakai `format-engine.js` yang sudah ada (currency/lebar kolom otomatis, dll — tidak menulis ulang logika format). |
| `tests/test-relational-dataset.mjs` | **Baru.** 4 lapis: (1) struktur dataset & **integritas referensial** — setiap Kode Produk di transaksi dijamin ada di Master Produk (dicek eksplisit, bukan diasumsikan); (2) `generateQuestionBatch()` sukses untuk SEMUA 6 level (bukan cuma Level 3 — soal ini yang paling penting karena template lama untuk L1/L2/L4/L5/L6 tidak dirancang untuk dataset dengan kolom minim seperti ini); (3) integrasi ujung-ke-ujung template `L3_MASTER_*` — bangun grid nyata dengan blok Master Produk ditempatkan PERSIS seperti `app.js`, lalu `validateAnswer()` sungguhan, PLUS pengecekan eksplisit bahwa `requiredRefs` menunjuk ke tabel Transaksi dan `expectedFormula` benar-benar menyeberang ke kolom blok Master Produk (bukti nyata ini lookup lintas-tabel, bukan kebetulan); (4) export — render `.xlsx` sungguhan, baca ulang, pastikan blok Master Produk benar-benar terlihat di sheet "Dataset", plus regresi bahwa dataset biasa (tanpa `masterTable`) tetap merender bersih. |
| `package.json` | `npm test` diperluas dari 8 jadi 9 file. Skrip pintas baru: `test:relational`. |

## 3. Catatan Penting: Kunci Jawaban Ekspor ≠ Koordinat Literal Sheet Dataset (Temuan Pre-Existing, Bukan Bug Baru)

Selama audit ditemukan: sheet **"Kunci Jawaban"** pada file `.xlsx` hasil ekspor menyimpan `expectedFormula` sebagai **TEKS BIASA** (`cell.value = "=VLOOKUP(...)"` sebagai string), BUKAN sebagai formula ExcelJS yang benar-benar dievaluasi (`{formula: ...}`). Ini berarti Kunci Jawaban SELALU bersifat referensi konseptual/dokumentasi ("kira-kira begini bentuk rumus yang benar"), bukan rumus yang bisa disalin-tempel literal dan langsung berfungsi — karena koordinat sel yang dipakai `expectedFormula` (dihitung dari tata letak alat latihan di browser) tidak selalu identik dengan baris/kolom sheet "Dataset" pada file yang diekspor (sheet Dataset punya judul & subjudul di atas tabel, alat latihan browser tidak).

**Ini karakteristik yang SUDAH ADA sejak sebelum tahap ini, berlaku untuk SEMUA dataset** (bukan cuma yang relasional) — ditemukan saat audit, dicatat di sini supaya diketahui, TIDAK diperbaiki di tahap ini karena itu perubahan lintas-fitur yang lebih besar (di luar cakupan "dataset relasional") dan berisiko mengubah perilaku Kunci Jawaban untuk seluruh dataset yang sudah teruji.

## 4. Verifikasi

- **Baseline sebelum perubahan:** 609/609 test lulus (8 file, hasil Tahap 5).
- **`tests/test-relational-dataset.mjs` (baru):** **460/460 lulus** — termasuk verifikasi eksplisit integritas referensial (0 dari ratusan baris transaksi yang di-generate ulang across 15 seed berbeda punya Kode Produk "patah"), sukses generate soal di 6 level (bukan cuma Level 3), dan bukti konkret bahwa formula lookup benar-benar menyeberang ke blok Master Produk (bukan kebetulan cocok).
- **Pengecekan visual manual** (bukan cuma assertion otomatis): render file `.xlsx` sungguhan, baca ulang, dump seluruh isi sheet Dataset ke terminal untuk dilihat langsung — tabel Transaksi bersih tanpa data produk, blok Master Produk tampil lengkap 13 produk di bawahnya, formula `=XLOOKUP(D9,M3:M15,O3:O15)` dan `=VLOOKUP(D11,M3:P15,4,FALSE)` konsisten dengan tata letak yang sebenarnya digambar.
- **Setelah seluruh perubahan:** `npm test` penuh (9 file) → **1069/1069 lulus, nol regresi**. `scripts/ci-lint.mjs` → lulus.
- Diff terhadap kondisi sebelum tahap ini dibatasi HANYA pada file-file yang tercantum di bagian 2 — `apps/spt`, `apps/accounting`, `apps/sql-pq`, dan file root tidak tersentuh; 4 dataset lama (`sales`, `accounting`, `hr`, `inventory`) dan seluruh template soal lama juga tidak diubah logikanya.

## 5. Keterbatasan yang Diketahui / Sisa Pekerjaan

- **Ini BUKAN tab sheet Excel terpisah** (lihat bagian 1) — Master Produk adalah blok kolom pada sheet yang sama. Kalau nanti benar-benar dibutuhkan tab sheet interaktif terpisah yang bisa diklik lintas-tab saat menyusun formula di browser, itu butuh pembongkaran arsitektur `spreadsheet-engine.js` (menambah dimensi "sheet" ke seluruh model grid) DAN `formula-interactivity.js` (izinkan klik lintas-sheet saat membangun formula) sekaligus — perubahan besar, berisiko tinggi, sengaja tidak dikerjakan di tahap ini.
- Baru ADA SATU dataset relasional (`sales-relational`, Master Produk saja). Master prompt Bagian 9 & 13 juga menyebut `MASTER_CUSTOMER`/`MASTER_SALES`/`TARGET` untuk skenario Expert 2-4 tabel — pola yang sama (blok kolom terpisah) bisa dipakai berulang untuk menambah tabel referensi lain, tapi belum dikerjakan.
- Kunci Jawaban ekspor bersifat referensi konseptual, bukan formula literal siap pakai (lihat bagian 3) — berlaku untuk semua dataset, bukan gap baru dari tahap ini.
- Template `L3_MASTER_*` baru hanya menyasar Level 3 (sesuai gap yang diminta — lookup lintas-tabel). Level 4-6 untuk dataset relasional ini memakai template GENERIC yang sudah ada (`L4_GENERIC_*`, dst.) yang bekerja pada kolom `Kuantitas`/`Nama Sales` saja (tidak melibatkan Master Produk) — belum ada template Level 4+ yang mengombinasikan multi-kriteria DENGAN lookup lintas-tabel sekaligus (mis. SUMIFS yang salah satu kriterianya hasil VLOOKUP). Ini follow-up yang masuk akal untuk tahap berikutnya kalau dibutuhkan.
