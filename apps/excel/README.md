# Excel Formula Practice Generator

Generator workbook latihan Microsoft Excel (.xlsx) dari dataset realistis, berjalan sepenuhnya di browser (HTML/CSS/JavaScript murni), tanpa backend dan tanpa API key.

> **Modul belajar VBA:** [`interactive/index.html`](./interactive/index.html) adalah kursus terpisah untuk belajar dasar VBA melalui empat latihan bertahap dan contoh lembar kerja. Koreksi memeriksa pola kode terbatas lalu menampilkan simulasi hasil; kode pengguna tidak dijalankan. Modul ini tidak mengimpor atau menggunakan generator workbook.

> **Generator Workbook Latihan (.xlsx):** panel di `index.html` tetap menjadi modul tersendiri untuk membuat workbook latihan. Kode generator dan lembar kerja hasil ekspor tidak menjadi bagian dari kursus VBA.

Bagian berikutnya menjelaskan Generator Workbook Latihan dan implementasi ekspor `.xlsx`; beberapa catatan lama di bawah merujuk riwayat pengembangan modul tersebut, bukan fitur kursus VBA.

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
apps/excel/
├── index.html                 # Generator Workbook Latihan (.xlsx)
├── sw.js                      # service worker (precache index.html, cache-as-you-go)
├── package.json               # HANYA untuk tests/ — aplikasi tidak butuh npm
├── css/                       # style.css, responsive.css
├── js/
│   ├── generator-ui.js           # UI: pilih Level & Materi, Generate, unduh .xlsx
│   ├── dataset-generator.js      # generator dataset (seeded, mulberry32)
│   ├── exercise-generator.js     # bank soal + penyusun spesifikasi latihan per Level x Materi
│   ├── spreadsheet-engine.js     # model grid + evaluator rumus (murni, tanpa DOM)
│   └── export/exercise-workbook-writer.js  # render workbook .xlsx via ExcelJS
├── data/                      # knowledge-excel.js, payroll-ter.js
├── interactive/               # kursus VBA terpisah (tidak memakai generator)
├── vendor/exceljs/            # ExcelJS lokal
├── tests/                     # pengujian Node.js
└── docs/                      # STATUS-TAHAP-1..6.md
```

Modul **Pivot Table & Dashboard** sudah dihapus. Engine HyperFormula tetap tersimpan di `vendor/hyperformula/` (root portal) untuk modul lain di kemudian hari; saat ini dipakai `tests/test-payroll-ter.mjs` di root.

## Pengujian Otomatis

```bash
npm install jsdom exceljs --no-save   # sekali saja
npm test
```

`npm test` menjalankan berurutan:

| File | Yang diuji |
|---|---|
| `tests/test-engine-additions.mjs` | Evaluator rumus: referensi fill handle, referensi melingkar, regresi fungsi dasar |
| `tests/test-dataset-integrity.mjs` | Dataset Penjualan / Persediaan / HR: struktur & integritas referensial |
| `tests/test-exercise-generator.mjs` | Seluruh kombinasi Level x Materi, randomisasi per seed |
| `tests/test-exercise-workbook.mjs` | Render `.xlsx` sungguhan via ExcelJS, workbook dataset-only |

`tests/test-engine.html` adalah harness manual di browser (tidak ikut `npm test`).
