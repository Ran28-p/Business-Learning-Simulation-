# Portal Belajar — Business Learning Simulator

Portal statis untuk latihan bisnis, pajak, akuntansi, Excel, SQL, dan Power Query. Aplikasi menggunakan HTML, CSS, dan JavaScript murni; tidak ada proses build atau backend API aplikasi.

| Modul | Folder | Deskripsi singkat |
|---|---|---|
| **Simulator SPT Pajak** | `apps/spt/` | SPT Tahunan Badan 1771, lampiran, modul pajak, kuis, dan Tax Career |
| **Accounting Simulator** | `apps/accounting/` | Siklus akuntansi, invoice, dan PPN |
| **Excel Formula Practice** | `apps/excel/` | Latihan rumus Excel berbasis dataset penjualan |
| **SQL & Power Query Simulator** | `apps/sql-pq/` | SQLite/WASM di browser, dataset generator, dan simulasi transformasi Power Query |
| **Kuis Langsung** | `apps/game-hub/` | Kuis real-time untuk guru dan siswa; Firebase atau mode lokal pada satu perangkat |
| **Ruang Pengajar** | `apps/pengajar/` | Analisis file rekap peserta secara lokal di browser, tanpa mengunggah data |

## Requirement

### Untuk menjalankan aplikasi

- Browser modern terbaru: Chrome, Edge, Firefox, atau Safari.
- Salah satu static HTTP server (pilih satu):
  - **Python 3.8+**, atau
  - **Node.js 20+** untuk menjalankan server lokal dengan `npx`.

> Jangan membuka HTML dengan `file://`. Service worker, ES module, `fetch`, dan WASM memerlukan origin HTTP/HTTPS.

### Untuk pengujian dan validasi kode

- **Node.js 20+** dan npm.
- Aplikasi tidak membutuhkan `npm install` atau build step. Dependensi npm hanya dipakai oleh pengujian.

## Menjalankan secara lokal

Jalankan perintah dari root repository ini:

```bash
# Opsi 1 — Python (Windows: gunakan py bila python tidak tersedia)
python -m http.server 8000
# atau
py -m http.server 8000

# Opsi 2 — Node.js; tidak mengubah package.json root
npx serve .
```

Buka `http://localhost:8000` pada browser. Untuk mengakses modul secara langsung, gunakan misalnya:

- `http://localhost:8000/apps/sql-pq/`
- `http://localhost:8000/apps/excel/`
- `http://localhost:8000/apps/accounting/`
- `http://localhost:8000/apps/spt/`
- `http://localhost:8000/apps/game-hub/`
- `http://localhost:8000/apps/pengajar/`

### Alur pengguna

1. Buka portal melalui HTTP server.
2. Masuk dengan magic link Firebase, atau pilih **Lanjutkan sebagai Tamu**.
3. Pilih simulator dari portal. Modul juga dapat dibuka langsung melalui URL.
4. Gunakan tombol **← Portal** di setiap modul untuk kembali ke hub.
5. Lihat ringkasan belajar semua modul di panel **Progres Saya**. Dari panel itu Anda dapat **Ekspor Progres** (satu file JSON untuk semua modul, untuk cadangan atau pindah perangkat), **Impor Progres** (mode Gabungkan atau Timpa; cadangan lengkap Simulator SPT juga diterima), dan **Unduh Rekap (PDF)**. Rekap PDF bukan sertifikat: datanya berasal dari browser peserta dan tidak diverifikasi.

## Test dan pemeriksaan kualitas

```bash
# Dari root: cek syntax JavaScript, validitas JSON, dan link lokal statis
node scripts/ci-lint.mjs

# Dari root: periksa Firebase Rules (tidak ada akses publik, skema sinkron dengan app)
node scripts/check-firebase-rules.mjs

# Dari root: install dependensi test yang dikunci, lalu jalankan seluruh test Excel
npm ci --prefix apps/excel
npm test --prefix apps/excel

# Modul lain tidak butuh npm install — cukup Node bawaan
npm test --prefix apps/accounting
npm test --prefix apps/sql-pq
npm test --prefix apps/spt

# Tes portal, kuis langsung, sinkronisasi, analitik, dan materi lintas modul
node tests/test-portal-progress.mjs
node tests/test-livequiz.mjs
node tests/test-gamehub-audio.mjs
node tests/test-cloudsync.mjs
node tests/test-analytics.mjs
node tests/test-payroll-ter.mjs
node tests/test-knowledge-schema.mjs
node tests/test-modul-pajak.mjs
node tests/test-tax-career-pembahasan.mjs
node tests/test-form-pembahasan.mjs
node tests/test-pembahasan-angka.mjs
node tests/test-regulasi.mjs
node scripts/check-staleness.mjs
node scripts/check-knowledge.mjs

# Tes UI Kuis Langsung (memerlukan jsdom)
npm install --no-save jsdom
node tests/test-livequiz-ui.mjs

# Tes browser E2E (Playwright)
cd e2e
npm install
npx playwright install chromium
npm test
```

GitHub Actions di `.github/workflows/ci-deploy.yml` menjalankan pengujian keempat simulator,
portal, Kuis Langsung, sinkronisasi cloud, analitik, materi, lint, Firebase Rules, dan E2E.
Deploy ke GitHub Pages hanya berjalan pada push ke `main` setelah seluruh job wajib lulus.

## Arsitektur ringkas

```text
.
├── index.html                 # Portal login dan hub aplikasi
├── sw.js                      # Service worker portal
├── css/                       # Style bersama
├── js/                        # Auth, portal, dan komponen bersama
├── tests/test-portal-progress.mjs  # Test dashboard progres lintas modul
├── scripts/ci-lint.mjs        # Validasi repo tanpa build step
├── scripts/check-firebase-rules.mjs  # Pemeriksa Firebase Rules (statis + simulasi)
├── database.rules.json        # Firebase Realtime Database Rules (deploy manual, lihat SECURITY.md)
├── firebase.json              # Menunjuk ke database.rules.json untuk Firebase CLI
├── vendor/                    # Library browser yang divendor
├── apps/
│   ├── accounting/            # Engine, generator, UI, dan tax workspace
│   ├── excel/                 # Spreadsheet engine, latihan, export, dan tests
│   ├── sql-pq/                # SQL/WASM, Power Query engine, kurikulum
│   ├── spt/                   # Shell SPT, form, modul pajak, dan Tax Career
│   ├── game-hub/              # Kuis Langsung
│   └── pengajar/              # Analisis rekap peserta lokal
├── SECURITY.md                # Model ancaman dan konfigurasi Firebase
├── ARCHITECTURE.md            # Detail desain teknis
└── .github/workflows/         # CI dan deploy GitHub Pages
```

Portal dan empat simulator memiliki service worker untuk cache aset lokal setelah kunjungan pertama.
Fitur yang membutuhkan Firebase atau aset eksternal yang belum tersimpan tetap memerlukan jaringan.
Manifest PWA saat ini hanya tersedia di `apps/spt`.

## Data, backend, dan keamanan

- Proyek ini adalah **situs statis/PWA** tanpa backend API yang dikelola sendiri. Firebase menyediakan layanan eksternal untuk autentikasi dan penyimpanan cloud.
- Progres dan data latihan disimpan lokal di browser menggunakan `localStorage`. SQL Simulator memakai SQLite yang berjalan dalam WebAssembly dan bersifat in-memory per sesi.
- Firebase Authentication menyediakan email-link untuk portal dan login anonim untuk Kuis Langsung. Firebase Realtime Database menyimpan progres SPT, sinkronisasi progres Accounting/Excel/SQL & Power Query, serta ruang kuis. Firebase Web config di client bukan secret; keamanan data bergantung pada Firebase Security Rules dan authorized domains.
- Ruang Pengajar memproses file rekap di browser. File dibuat peserta, dapat diubah, dan bukan bukti penilaian resmi.
- Input Power Query tidak dieksekusi sebagai JavaScript dinamis: modul memakai parser ekspresi terbatas. Penilaian SQL membatasi query menjadi satu query baca agar dataset latihan tidak diubah.
- Tidak ada sistem yang dapat dijamin “tidak bisa dibobol”. Untuk deployment production, ikuti checklist dan batasan yang dijelaskan dalam [`SECURITY.md`](SECURITY.md), gunakan HTTPS, aktifkan Firebase App Check bila sesuai, dan jangan pernah menaruh private key, service-account JSON, atau secret server di repository/browser.

## Pengembangan

- Jangan commit `node_modules/`, file log, artefak coverage, atau credential; semuanya harus tetap di-ignore.
- Ikuti token desain di [`design.md`](design.md) dan struktur modul yang ada.
- Tambahkan test untuk logika baru yang dapat diuji dengan Node.
- Jika menambah modul baru: buat folder di `apps/`, daftarkan dari portal, sediakan navigasi kembali ke portal, service worker, dan masukkan aset lokalnya dalam strategi offline.
- Dashboard **Progres Saya** di portal membaca key `localStorage` tiap modul lewat `js/shared/progress-aggregator.js`. Kalau sebuah modul mengganti key atau skema progresnya, perbarui aggregator itu — `tests/test-portal-progress.mjs` membandingkan langsung dengan kode sumber modul dan akan gagal di CI sampai keduanya sinkron. Untuk modul baru, tambahkan entri di daftar `MODULES` aggregator.
- Sebelum mengirim perubahan, jalankan lint dan test di atas.
