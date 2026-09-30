# Portal Belajar — Business Learning Simulator

Portal statis untuk latihan bisnis, pajak, akuntansi, Excel, SQL, dan Power Query. Aplikasi menggunakan HTML, CSS, dan JavaScript murni; tidak ada proses build atau backend API aplikasi.

| Modul | Folder | Deskripsi singkat |
|---|---|---|
| **Simulator SPT Pajak** | `apps/spt/` | SPT Tahunan Badan 1771, lampiran, modul pajak, kuis, dan Tax Career |
| **Accounting Simulator** | `apps/accounting/` | Siklus akuntansi, invoice, dan PPN |
| **Excel Formula Practice** | `apps/excel/` | Latihan rumus Excel berbasis dataset penjualan |
| **SQL & Power Query Simulator** | `apps/sql-pq/` | SQLite/WASM di browser, dataset generator, dan simulasi transformasi Power Query |

## Requirement

### Untuk menjalankan aplikasi

- Browser modern terbaru: Chrome, Edge, Firefox, atau Safari.
- Salah satu static HTTP server (pilih satu):
  - **Python 3.8+**, atau
  - **Node.js 20+** untuk menjalankan server lokal dengan `npx`.

> Jangan membuka HTML dengan `file://`. Service worker, ES module, `fetch`, dan WASM memerlukan origin HTTP/HTTPS.

### Untuk pengujian dan validasi kode

- **Node.js 20+** dan npm.
- Dependensi test hanya berada di `apps/excel/`; aplikasi yang dipakai pengguna tetap tidak membutuhkan `npm install` atau build step.

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

### Alur pengguna

1. Buka portal melalui HTTP server.
2. Masuk dengan magic link Firebase, atau pilih **Lanjutkan sebagai Tamu**.
3. Pilih simulator dari portal. Modul juga dapat dibuka langsung melalui URL.
4. Gunakan tombol **← Portal** di setiap modul untuk kembali ke hub.

## Test dan pemeriksaan kualitas

```bash
# Dari root: cek syntax JavaScript, validitas JSON, dan link lokal statis
node scripts/ci-lint.mjs

# Dari root: install dependensi test yang dikunci, lalu jalankan seluruh test Excel
npm ci --prefix apps/excel
npm test --prefix apps/excel
```

CI GitHub Actions di `.github/workflows/ci-deploy.yml` menjalankan kedua pemeriksaan tersebut pada push dan pull request. Deploy GitHub Pages hanya dilakukan setelah test dan lint lulus.

## Arsitektur ringkas

```text
.
├── index.html                 # Portal login dan hub aplikasi
├── sw.js                      # Service worker portal
├── css/                       # Style bersama
├── js/                        # Auth, portal, dan komponen bersama
├── scripts/ci-lint.mjs        # Validasi repo tanpa build step
├── vendor/                    # Library browser yang divendor
├── apps/
│   ├── accounting/            # Engine, generator, UI, dan tax workspace
│   ├── excel/                 # Spreadsheet engine, latihan, export, dan tests
│   ├── sql-pq/                # SQL/WASM, Power Query engine, kurikulum
│   └── spt/                   # Shell SPT, form, modul pajak, dan Tax Career
├── SECURITY.md                # Model ancaman dan konfigurasi Firebase
├── ARCHITECTURE.md            # Detail desain teknis
└── .github/workflows/         # CI dan deploy GitHub Pages
```

Setiap aplikasi memiliki service worker sendiri sehingga shell aplikasi dapat digunakan offline setelah kunjungan pertama. Fitur yang membutuhkan jaringan—misalnya magic-link authentication dan aset CDN yang belum divendor—tetap memerlukan koneksi.

## Data, backend, dan keamanan

- Proyek ini adalah **static/PWA**. Tidak ada backend API atau database server untuk aplikasi inti.
- Progres dan data latihan disimpan lokal di browser menggunakan `localStorage`. SQL Simulator memakai SQLite yang berjalan dalam WebAssembly dan bersifat in-memory per sesi.
- Firebase hanya digunakan untuk authentication portal serta fungsi terbatas pada modul SPT. Firebase Web config di client bukan secret; keamanan data Firebase wajib ditegakkan dengan Firebase Security Rules dan authorized domains.
- Input Power Query tidak dieksekusi sebagai JavaScript dinamis: modul memakai parser ekspresi terbatas. Penilaian SQL membatasi query menjadi satu query baca agar dataset latihan tidak diubah.
- Tidak ada sistem yang dapat dijamin “tidak bisa dibobol”. Untuk deployment production, ikuti checklist dan batasan yang dijelaskan dalam [`SECURITY.md`](SECURITY.md), gunakan HTTPS, aktifkan Firebase App Check bila sesuai, dan jangan pernah menaruh private key, service-account JSON, atau secret server di repository/browser.

## Pengembangan

- Jangan commit `node_modules/`, file log, artefak coverage, atau credential; semuanya harus tetap di-ignore.
- Ikuti token desain di [`design.md`](design.md) dan struktur modul yang ada.
- Tambahkan test untuk logika baru yang dapat diuji dengan Node.
- Jika menambah modul baru: buat folder di `apps/`, daftarkan dari portal, sediakan navigasi kembali ke portal, service worker, dan masukkan aset lokalnya dalam strategi offline.
- Sebelum mengirim perubahan, jalankan lint dan test di atas.
