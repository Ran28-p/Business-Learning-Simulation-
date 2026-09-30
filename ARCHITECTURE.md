# Business Learning Simulation — Struktur Arsitektur

> **Update struktur kode (2026-08):** Modul SPT sudah dipisah secara profesional.
> - `apps/spt/index.html` hanya shell HTML (~1k baris, sebelumnya ~5.8k).
> - CSS dipindah ke `apps/spt/css/styles.css`.
> - Logika JS dipisah: `js/firebase-config.js`, `js/app-main.js`, `js/calculators.js`, `js/knowledge-init.js`, `js/sw-register.js`.
> - `node_modules` dan `.git` tidak lagi disertakan dalam paket rilis.
> - Accounting, Excel, dan SQL-PQ tetap modular seperti sebelumnya.

Struktur di bawah adalah versi perbaikan dari diagram 10-layer yang diajukan,
dicocokkan langsung dengan isi `Business-Learning-Simulation-v3.zip` (5 file
root + 4 modul di `apps/`) dan diuji terhadap **FREE-FIRST POLICY**. Setiap
perubahan diberi alasan — tidak ada layer yang dihapus tanpa pengganti.

## Ringkasan masalah pada struktur awal

| # | Masalah di diagram awal | Perbaikan |
|---|---|---|
| 1 | **CDN** muncul dua kali (Infrastructure & Performance) | Satu entri saja, di Infrastructure. Performance hanya *memakai*-nya. |
| 2 | **Cloud Compute** & **Scaling** di Infrastructure | Tidak relevan — proyek 100% static (tanpa server/backend). Diganti "N/A — static hosting only". |
| 3 | **WAF** di Security Layer | WAF terkelola = layanan berbayar (Cloudflare Enterprise/AWS WAF). Untuk static site tanpa server, permukaan serangannya beda — diganti Firebase Security Rules + Authorized Domains (sudah ada di `SECURITY.md`, gratis). |
| 4 | **Rate Limiting** sebagai layer generik | Tidak ada API custom untuk di-*rate-limit*. Diganti: Firebase Auth built-in abuse protection (otomatis, gratis, tidak perlu dikonfigurasi manual). |
| 5 | **RBAC** di Identity Layer | Tidak ada sistem role/admin di aplikasi ini — semua user setara (login atau tamu). Dihapus, ditandai sebagai *future option* jika suatu saat perlu dashboard progres untuk trainer. |
| 6 | **IndexedDB** & **Cloud Storage** di Data Layer | Dicek ke source code: **tidak dipakai sama sekali** saat ini. Ditandai "planned/optional", bukan komponen aktif — supaya diagram tidak menyatakan sesuatu yang belum ada. |
| 7 | Observability & DevOps digambar sebagai layer "sudah ada" | Faktanya: **tidak ada** file CI/CD, tidak ada error tracking/monitoring di repo. Ditandai sebagai gap, bukan status implemented. |

## Struktur yang sudah diperbaiki

```
BUSINESS LEARNING SIMULATION
│
├── 01 Presentation Layer
│   └── Frontend — vanilla HTML/CSS/JS, tanpa framework, tanpa build step
│       (index.html + css/portal.css + js/portal.js sebagai hub/login)
│
├── 02 Application Layer
│   ├── Simulator Engines      → apps/spt, apps/accounting, apps/excel, apps/sql-pq
│   ├── Quiz Engine            → modul_pajak (spt), question-engine.js (excel), soal dinamis (sql-pq)
│   ├── Gamification           → XP/progress tracking per modul (localStorage)
│   └── (Business Logic digabung ke masing-masing Simulator Engine — tidak perlu node terpisah)
│
├── 03 Data Layer
│   ├── Local Storage      [AKTIF]  — state utama semua modul, key terpisah per app
│   ├── SQLite/WASM        [AKTIF]  — sql.js di apps/sql-pq, in-memory per sesi
│   ├── Firebase Database  [AKTIF, TERBATAS] — hanya dipakai apps/spt untuk sinkron XP; 3 modul lain murni local
│   ├── IndexedDB          [BELUM ADA] — kandidat untuk persist database SQL antar sesi (saat ini hilang tiap refresh)
│   └── Cloud Storage      [TIDAK DIPAKAI] — tidak ada upload file biner; hapus dari arsitektur aktif
│
├── 04 Identity Layer
│   ├── Authentication → Firebase email-link (opsional, ada mode Tamu sebagai fallback lokal)
│   └── Authorization  → sekadar gate login/tamu, bukan permission granular (RBAC tidak diperlukan saat ini)
│
├── 05 Infrastructure Layer
│   ├── Hosting → GitHub Pages (gratis, tanpa kartu kredit)
│   └── CDN     → bawaan GitHub Pages / jsDelivr untuk vendor libs
│
├── 06 Security Layer
│   ├── HTTPS               → otomatis dari GitHub Pages
│   ├── Firebase Security Rules → wajib `auth != null` + scoped ke uid sendiri (lihat SECURITY.md)
│   ├── Authorized Domains  → whitelist domain resmi di Firebase Console
│   └── Security Headers    → meta tags (CSP dasar) — GitHub Pages tidak bisa set header server, jadi ini scope-nya terbatas by design
│
├── 07 Performance Layer
│   ├── Cache          → Service Worker (BARU DIREKOMENDASIKAN — lihat gap di bawah)
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
└── 10 DevOps Layer  [SEBAGIAN BELUM ADA]
    ├── Git    → ADA
    ├── GitHub → ADA
    ├── CI     → BELUM ADA (rekomendasi: GitHub Actions gratis untuk repo publik, jalankan tests/ di apps/excel)
    └── CD     → BELUM ADA (rekomendasi: GitHub Actions auto-deploy ke GitHub Pages saat push ke main)
```

## Gap offline vs kenyataan — SUDAH DIPERBAIKI (v4)

`README.md` bilang *"App shell tetap bisa dipakai"* secara offline, dan
Free-First Policy poin 14 mewajibkan simulator inti bisa jalan lokal/offline.
Sebelumnya hanya `apps/spt/` yang punya `manifest.json` + `sw.js`. Sudah
ditambahkan `sw.js` (cache-first, cache-as-you-go, tanpa menyentuh host
Firebase/CDN font) + registrasi di `index.html` untuk: root portal, dan
tiga modul lain (`accounting`, `excel`, `sql-pq`). Lihat
`Business-Learning-Simulation-v4.zip`.

Catatan: modul `accounting` masih memuat 4 library dari CDN eksternal
(html2pdf, canvas-confetti, intro.js) yang belum divendor lokal — service
worker-nya sengaja tidak menyentuh host itu, jadi shell-nya tetap tampil
offline tapi fitur yang bergantung pada library itu (mis. tur intro, export
PDF) baru berfungsi penuh offline kalau library-nya divendor lokal seperti
di `apps/excel` dan `apps/sql-pq`. Ini gap kecil yang tersisa, bukan blocker.

## CI/CD — SUDAH DIPERBAIKI (v4)

Ditambahkan `.github/workflows/ci-deploy.yml`: job `test` menjalankan
`npm test` di `apps/excel` pada tiap push/PR (gratis, GitHub Actions untuk
repo publik), lalu job `deploy` auto-publish ke GitHub Pages saat push ke
`main` — hanya jalan kalau `test` lolos.

## Cek kepatuhan terhadap FREE-FIRST POLICY

Semua 14 poin sudah terpenuhi oleh struktur di atas, dengan satu catatan
operasional yang perlu dijaga secara sadar:

- **Poin 13** ("kalau kuota habis, tidak boleh otomatis menimbulkan biaya")
  hanya benar-benar aman selama proyek Firebase tetap di **paket Spark
  (gratis)**. Paket ini secara teknis *tidak bisa* menagih — begitu kuota
  habis, tulis/baca akan diblokir, bukan ditagih. Ini otomatis terpenuhi
  **asal tidak pernah upgrade ke paket Blaze** (pay-as-you-go). Ini
  guardrail konkret yang layak dicatat di `SECURITY.md`, bukan cuma niat baik.
- **Poin 14** (harus bisa jalan offline/lokal) → lihat gap service worker
  di atas; saat ini baru terpenuhi untuk 1 dari 4 modul.

Poin 1–12 sudah terpenuhi oleh pilihan yang memang sudah diambil di kode:
static hosting, tanpa build step, tanpa dependency API berbayar, tanpa
kartu kredit, dan localStorage-first di 3 dari 4 modul.
