# Business Learning Simulation — Struktur Arsitektur

> **Struktur kode:** Modul SPT dipisah menjadi shell HTML, CSS, dan JavaScript modular.
> - `apps/spt/index.html` hanya shell HTML (~1k baris, sebelumnya ~5.8k).
> - CSS dipindah ke `apps/spt/css/styles.css`.
> - Logika JS dipisah: `js/firebase-config.js`, `js/app-main.js`, `js/calculators.js`, `js/knowledge-init.js`, `js/sw-register.js`.
>
> **Status (Oktober 2026):** Portal mencakup empat simulator, Kuis Langsung, dan Ruang Pengajar.
> Firebase Rules mencakup progres SPT, sinkronisasi tiga modul, dan ruang kuis. CI menjalankan tes aplikasi,
> browser E2E, pemeriksaan materi, serta validasi rules.

Dokumen ini menggambarkan struktur dan batasan yang diterapkan di repository saat ini.
Proyek mengutamakan hosting statis, penyimpanan lokal, serta layanan gratis.

## Ringkasan masalah pada struktur awal

| # | Masalah di diagram awal | Perbaikan |
|---|---|---|
| 1 | **CDN** muncul dua kali (Infrastructure & Performance) | Satu entri saja, di Infrastructure. Performance hanya *memakai*-nya. |
| 2 | **Cloud Compute** & **Scaling** di Infrastructure | Aplikasi tidak memiliki server atau API yang dikelola sendiri. Layanan Firebase eksternal menangani autentikasi dan data cloud. |
| 3 | **WAF** di Security Layer | WAF bukan komponen yang dikonfigurasi di repository. Akses Firebase dikendalikan oleh Security Rules; GitHub Pages menyajikan aset statis melalui HTTPS. |
| 4 | **Rate Limiting** sebagai layer generik | Tidak ada API custom untuk di-*rate-limit*. Diganti: Firebase Auth built-in abuse protection (otomatis, gratis, tidak perlu dikonfigurasi manual). |
| 5 | **RBAC** di Identity Layer | Tidak ada peran pengajar berbasis akun. Ruang Pengajar memproses file lokal; akses Firebase dibatasi rules per uid dan peran host/peserta kuis. |
| 6 | **IndexedDB** & **Cloud Storage** di Data Layer | Dicek ke source code: **tidak dipakai sama sekali** saat ini. Ditandai "planned/optional", bukan komponen aktif — supaya diagram tidak menyatakan sesuatu yang belum ada. |
| 7 | Observability & DevOps digambar sebagai layer "sudah ada" | CI/CD sudah berjalan melalui GitHub Actions; pemantauan terpusat dan pelacakan error belum diterapkan. |

## Struktur yang sudah diperbaiki

```
BUSINESS LEARNING SIMULATION
│
├── 01 Presentation Layer
│   └── Frontend — vanilla HTML/CSS/JS, tanpa framework, tanpa build step
│       (index.html + css/portal.css + js/portal.js sebagai hub/login;
│        js/portal-progress.js + js/shared/progress-aggregator.js = dashboard "Progres Saya":
│        ringkasan lintas modul, ekspor/impor progres, rekap PDF, sinkronisasi cloud,
│        dan analitik belajar)
│
├── 02 Application Layer
│   ├── Simulator Engines      → apps/spt, apps/accounting, apps/excel, apps/sql-pq
│   ├── Live Quiz              → apps/game-hub + js/shared/livequiz-engine.js/livequiz-room.js
│   ├── Ruang Pengajar          → apps/pengajar + js/shared/cohort-engine.js
│   ├── Knowledge & assessment → materi dan mesin penilaian di setiap simulator
│   └── Learning analytics     → js/shared/learning-analytics.js
│
├── 03 Data Layer
│   ├── localStorage       [AKTIF]  — progres dan preferensi lokal, key terpisah per aplikasi
│   ├── SQLite/WASM        [AKTIF]  — sql.js di apps/sql-pq, data latihan in-memory per sesi
│   ├── Firebase RTDB      [AKTIF]  — progres SPT, sinkronisasi accounting/excel/sqlpq, ruang kuis
│   └── Teacher reports    [LOKAL]  — file JSON dipilih dan diproses di browser, tanpa unggah
│
├── 04 Identity Layer
│   ├── Authentication → Firebase email-link di Portal; login anonim untuk Kuis Langsung
│   └── Authorization  → Firebase Rules membatasi akses berdasarkan uid dan peran host/peserta
│
├── 05 Infrastructure Layer
│   ├── Hosting → GitHub Pages (gratis, tanpa kartu kredit)
│   └── Assets  → file lokal dan pustaka eksternal terbatas
│
├── 06 Security Layer
│   ├── HTTPS               → otomatis dari GitHub Pages
│   ├── Firebase Security Rules → [ADA] `database.rules.json` (+ `firebase.json`): default tolak semua; memvalidasi `users`, `portalSync`, dan `liveRooms`; diperiksa CI oleh `scripts/check-firebase-rules.mjs` (lihat SECURITY.md). Rules baru berlaku setelah di-deploy
│   ├── Authorized Domains  → whitelist domain resmi di Firebase Console
│   └── Security Headers    → meta tags (CSP dasar) — GitHub Pages tidak bisa set header server, jadi ini scope-nya terbatas by design
│
├── 07 Performance Layer
│   ├── Cache          → [AKTIF] Service Worker portal dan tiap simulator; cakupan cache berbeda per aplikasi
│   ├── Compression     → gzip/brotli otomatis dari GitHub Pages
│   └── Lazy Loading    → load modul apps/* on-demand dari hub, bukan sekaligus
│
├── 08 Observability Layer  [BELUM DIBANGUN]
│   ├── Error Tracking → opsi paling free-first: console log + tombol "Kirim Laporan" (mailto:), TANPA pihak ketiga
│   ├── Logging         → localStorage log ring-buffer lokal (opsional)
│   └── Monitoring      → opsional, free-tier uptime checker (mis. UptimeRobot) — bukan wajib
│
├── 09 Reliability Layer
│   ├── Availability → bergantung SLA GitHub Pages (gratis, cukup andal)
│   ├── Backup (kode)  → Git history / GitHub (redundant dengan DevOps layer, memang sengaja karena sumbernya sama)
│   ├── Backup (data)  → export/import JSON progres per modul (SUDAH ADA)
│   └── Recovery/Rollback → git revert + import JSON backup pengguna
│
└── 10 DevOps Layer  [ADA]
    ├── Git    → ADA
    ├── GitHub → ADA
    ├── CI     → ADA — `.github/workflows/ci-deploy.yml`: tes empat simulator, portal, E2E, serta lint
    └── CD     → ADA — auto-deploy ke GitHub Pages saat push ke main, hanya jika semua job CI lulus
```

## Dukungan offline

Portal dan empat simulator mendaftarkan service worker untuk menyimpan aset lokal
sesuai kebijakan cache masing-masing. Kunjungan pertama tetap memerlukan koneksi.
Fitur Firebase, font atau pustaka CDN yang belum tersimpan, dan sinkronisasi cloud
memerlukan jaringan. Manifest PWA saat ini hanya tersedia untuk `apps/spt`; service
worker pada halaman lain menyediakan cache offline, bukan jaminan instalasi PWA.

## CI/CD — SUDAH ADA

`.github/workflows/ci-deploy.yml` menjalankan tujuh job pada setiap push dan
pull request ke `main`:

| Job | Isi |
|---|---|
| `test-excel` | test suite `apps/excel` |
| `test-spt` | mesin pajak, utilitas, formulir, dan pembahasan SPT |
| `test-accounting` | mesin akuntansi, pajak, persediaan, dan integrasi skenario |
| `test-sql-pq` | SQL, Power Query, generator, latihan, dan progres; query diuji di SQLite/WASM |
| `test-portal` | progres, kuis langsung dan audio, sinkronisasi cloud, analitik/pengajar, serta PPh 21 TER |
| `e2e` | alur browser Playwright untuk portal dan simulator pada beberapa ukuran layar dan tema |
| `lint` | syntax, JSON, link lokal, Firebase Rules, skema materi, pembahasan, rujukan, dan angka pajak |

Job `deploy` menerbitkan situs ke GitHub Pages hanya setelah semua job wajib lulus.

## Penerapan kebijakan FREE-FIRST

- **Poin 13** ("kalau kuota habis, tidak boleh otomatis menimbulkan biaya")
  hanya benar-benar aman selama proyek Firebase tetap di **paket Spark
  (gratis)**. Paket ini secara teknis *tidak bisa* menagih — begitu kuota
  habis, tulis/baca akan diblokir, bukan ditagih. Ini otomatis terpenuhi
  **asal tidak pernah upgrade ke paket Blaze** (pay-as-you-go). Ini
  guardrail konkret yang dicatat di `SECURITY.md`, bukan cuma niat baik.
- **Poin 14** (harus bisa jalan offline/lokal) → portal dan empat simulator
  menyediakan cache service worker. Fitur yang memerlukan Firebase atau aset
  eksternal tetap membutuhkan jaringan; manifest PWA hanya tersedia di SPT.

Hosting statis, tanpa build step, serta penyimpanan progres lokal menjadi dasar
arsitektur. Sinkronisasi cloud bersifat opsional dan memerlukan akun Firebase.
