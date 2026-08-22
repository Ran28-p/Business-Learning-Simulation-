# Excel Formula Practice Generator

Aplikasi latihan rumus Microsoft Excel berbasis dataset realistis, berjalan sepenuhnya di browser (HTML/CSS/JavaScript murni), tanpa backend, tanpa API key, dan gratis.

> **Status:** Tahap Interaktivitas Excel Nyata ditambahkan — mode point-klik, highlight referensi berwarna, fill handle, dan autocomplete fungsi kini aktif pada spreadsheet interaktif. Lihat [`docs/STATUS-TAHAP-3.md`](./docs/STATUS-TAHAP-3.md) untuk laporan terbaru. Riwayat sebelumnya: [`docs/STATUS-TAHAP-2.md`](./docs/STATUS-TAHAP-2.md), [`docs/STATUS-TAHAP-1.md`](./docs/STATUS-TAHAP-1.md).

## Menjalankan Secara Lokal

Karena aplikasi memuat `data/formula-catalog.json` menggunakan `fetch()`, aplikasi **harus** dijalankan lewat server HTTP sederhana — membuka `index.html` langsung lewat `file://` akan diblokir kebijakan CORS browser untuk fetch file lokal.

Pilih salah satu cara berikut dari dalam folder proyek:

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
├── package.json               # HANYA untuk menjalankan tests/ (npm install jsdom) — aplikasi sendiri tidak butuh npm
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js                    # orkestrator UI & state aplikasi
│   ├── formula-interactivity.js  # mode point-klik, highlight referensi, fill handle, autocomplete (Tahap 3)
│   ├── dataset-generator.js      # generator dataset Penjualan (seeded)
│   ├── spreadsheet-engine.js     # model grid + evaluator rumus (murni, tanpa DOM)
│   ├── formula-validator.js      # pemeriksa jawaban (hasil + struktur, bukan teks)
│   ├── question-generator.js     # pembuat soal Level 1-3
│   ├── progress-manager.js       # XP, statistik, badge (di atas storage-manager.js)
│   ├── storage-manager.js        # satu-satunya modul yang menyentuh localStorage
│   └── formula-library.js        # pembaca data/formula-catalog.json
├── data/
│   └── formula-catalog.json   # katalog rumus
├── tests/                     # pengujian otomatis Node.js (lihat bagian "Pengujian Otomatis")
└── docs/
    ├── STATUS-TAHAP-1.md
    ├── STATUS-TAHAP-2.md
    └── STATUS-TAHAP-3.md
```

## Pengujian Otomatis

Sebagian besar logika (evaluator rumus, penyesuaian referensi fill handle, analisis pewarnaan) diuji lewat Node.js **tanpa dependensi apa pun**:

```bash
node tests/test-engine-additions.mjs
node tests/test-formula-interactivity.mjs
```

Satu file pengujian tambahan mensimulasikan interaksi mouse/keyboard sungguhan (klik-geser, fill handle, autocomplete) memakai [jsdom](https://github.com/jsdom/jsdom) — ini **opsional**, hanya untuk pengembangan, dan butuh instalasi sekali pakai:

```bash
npm install jsdom --no-save
node tests/test-formula-interactivity.dom.mjs
```

Aplikasi itu sendiri **tidak pernah** membutuhkan `npm install` atau proses build — `package.json` di root hanya menyediakan skrip `npm test` sebagai jalan pintas menjalankan ketiga file di atas.

## Materi & Level

Level 1 (Pemula) dan Level 2 (Dasar) sudah aktif penuh. Materi dan level lain (dataset Akuntansi/HR/Persediaan, Level 3-6) sudah **ditampilkan** di navigasi tetapi ditandai "Segera" dan sengaja **dinonaktifkan** — sesuai prinsip proyek ini: tidak ada tombol tanpa fungsi nyata. Ini akan dikembangkan bertahap pada tahap-tahap berikutnya.
