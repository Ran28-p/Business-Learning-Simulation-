# Design System — Business Learning Simulation

Dokumen ini menjelaskan sistem visual portal dan seluruh aplikasi: simulator, Kuis Langsung, serta Ruang Pengajar.
Sumber kebenaran implementasi adalah `css/design-system.css` dan `css/ds-modules.css`.
Contoh dan palet pada bagian 1–8 mendokumentasikan fondasi awal; gunakan token `--ds-*` untuk pekerjaan baru.

Prinsip utama:
- Antarmuka mengutamakan keterbacaan, konsistensi, dan aksesibilitas.
- Light dan dark mode memakai token CSS dan atribut `data-theme`.
- Warna baru memakai token sistem atau aksen modul yang sudah ditentukan.
- Komponen baru menggunakan primitif `.ds-*` bila sesuai; gaya lama dipertahankan lewat bridge.

---

## 1. Palet Awal (Referensi Legacy)

Nilai pada bagian ini mendokumentasikan palet desain awal. Jangan menyalinnya
sebagai token baru; gunakan `--ds-*` dan aksen modul dari `css/design-system.css`.

### 1.1 Light Mode — Palet awal

```css
:root {
  /* Brand */
  --primary:          #0b5cab;   /* biru utama */
  --primary-dark:     #084480;   /* hover / pressed */
  --primary-soft:     #e8f1fb;   /* background soft / chip */
  --primary-light:    #dbeafe;   /* accent light */

  /* Accent (opsional, untuk highlight / success secondary) */
  --accent:           #0d9488;   /* teal */
  --accent-soft:      #ccfbf1;

  /* Surface & Background */
  --bg:               #f4f7fb;   /* page background */
  --surface:          #ffffff;   /* card, modal, input */
  --surface-elevated: #ffffff;

  /* Text */
  --text:             #0f172a;   /* primary text */
  --muted:            #64748b;   /* secondary text */
  --text-inverse:     #ffffff;

  /* Border & Divider */
  --border:           #d7e3f0;
  --border-strong:    #b6c9de;

  /* Semantic */
  --success:          #10b981;
  --success-soft:     #ecfdf5;
  --warning:          #f59e0b;
  --warning-soft:     #fffbeb;
  --danger:           #dc2626;
  --danger-soft:      #fef2f2;
  --info:             #0b5cab;
  --info-soft:        #e8f1fb;

  /* Shadow */
  --shadow:           0 10px 30px rgba(15, 23, 42, 0.08);
  --shadow-sm:        0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-lg:        0 20px 50px rgba(15, 23, 42, 0.12);

  /* Radius */
  --radius-sm:        6px;
  --radius-md:        10px;
  --radius-lg:        16px;
  --radius-xl:        20px;
  --radius:           var(--radius-lg);

  /* Font */
  --font:             "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-mono:        "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

### 1.2 Dark Mode — Palet awal

```css
[data-theme="dark"] {
  --primary:          #3b82f6;
  --primary-dark:     #60a5fa;
  --primary-soft:     #1e3a8a;
  --primary-light:    #1e3a8a;

  --accent:           #2dd4bf;
  --accent-soft:      #134e4a;

  --bg:               #0f172a;
  --surface:          #1e293b;
  --surface-elevated: #1e293b;

  --text:             #f8fafc;
  --muted:            #94a3b8;
  --text-inverse:     #0f172a;

  --border:           #334155;
  --border-strong:    #475569;

  --success:          #34d399;
  --success-soft:     #064e3b;
  --warning:          #fbbf24;
  --warning-soft:     #78350f;
  --danger:           #f87171;
  --danger-soft:      #7f1d1d;
  --info:             #60a5fa;
  --info-soft:        #1e3a8a;

  --shadow:           0 10px 30px rgba(0, 0, 0, 0.45);
  --shadow-sm:        0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-lg:        0 20px 50px rgba(0, 0, 0, 0.55);
}
```

> **Catatan implementasi**: Attribute `data-theme="dark"` diletakkan di `<html>`. Preferensi disimpan di `localStorage` (key: `bls-theme` atau yang sudah dipakai modul).

---

## 2. Theme Switcher (wajib dipertahankan)

### 2.1 Integrasi tema saat ini

| Modul        | Elemen UI              | Atribut / Class          | Persistensi          |
|--------------|------------------------|--------------------------|----------------------|
| Portal       | Tombol tema            | `PortalTheme` + `data-theme` | `localStorage`   |
| Accounting   | Tombol tema bawaan     | `data-theme`              | `localStorage`       |
| SPT          | Toggle tema bawaan     | `data-theme` di `<html>` dan `<body>` | `localStorage` |
| Excel        | Tombol tema app shell  | `data-theme`              | `localStorage`       |
| SQL & Power Query | Tombol tema bawaan | `data-theme`              | `localStorage`       |
| Kuis Langsung / Ruang Pengajar | App shell tema | `data-theme` | `localStorage` |

`js/shared/theme.js` menyelaraskan kunci tema lama (`theme`, `portal_theme`, `sqlpq_theme`),
memantau perubahan tema, dan menyinkronkan pilihan antar-tab. Muat skrip ini di `<head>`
sebelum skrip modul agar tema diterapkan sebelum halaman dirender.

### 2.2 API tema bersama

Gunakan `PortalTheme.get()`, `PortalTheme.set('dark')` atau `PortalTheme.set('light')`,
atau `PortalTheme.toggle()` untuk perubahan tema yang dipicu kode. Toggle bawaan modul
tetap didukung dan disinkronkan melalui perubahan atribut `data-theme`.

### 2.3 Markup tombol (contoh)

Markup kontrol tema berbeda antar-modul. Pertahankan tombol bawaan dan aksesibilitasnya;
jangan menambahkan tombol kedua jika app shell sudah menyediakan kontrol tema.

```html
<button type="button" class="theme-toggle" id="themeBtn" aria-label="Toggle dark mode">
  🌙
</button>
```

CSS tombol (ringan):

```css
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  transition: background 0.2s, border-color 0.2s;
}
.theme-toggle:hover {
  background: var(--primary-soft);
  border-color: var(--primary);
}
```

---

## 3. Typography

| Token        | Value                                      | Penggunaan              |
|--------------|--------------------------------------------|-------------------------|
| `--font`     | `"Segoe UI", system-ui, -apple-system, sans-serif` | UI umum                |
| `--font-mono`| `"JetBrains Mono", ui-monospace, ...`      | Kode, SQL, formula     |

Skala ukuran yang disarankan:

- Display / judul besar: `1.75–2rem`
- Heading 1: `1.35–1.5rem`
- Heading 2: `1.15–1.25rem`
- Body: `0.95–1rem`
- Caption / label: `0.82–0.875rem`
- Kode: `0.875rem` mono

---

## 4. Spacing & Layout

Gunakan kelipatan **4px** / **8px**:

```
4  · 8  · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64
```

Card padding standar: `20–28px`  
Gap antar card: `16–24px`  
Radius card: `var(--radius-lg)` (16px)

---

## 5. Komponen Inti (ringkas)

### Button

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  transition: filter 0.15s, transform 0.1s;
}
.btn-primary {
  background: var(--primary);
  color: var(--text-inverse);
}
.btn-primary:hover { background: var(--primary-dark); }
.btn-ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
}
.btn-ghost:hover { background: var(--primary-soft); }
```

### Card / Surface

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 24px;
}
```

### Input

```css
.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: 0.98rem;
  outline: none;
}
.field input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}
```

---

## 6. Aturan Penggunaan

1. Untuk komponen baru, gunakan token `--ds-*` dan primitif `.ds-*` dari design system.
2. Aksen khusus modul harus memakai token aksen yang sudah disediakan; jangan menambahkan warna tanpa kebutuhan.
3. Uji tampilan light dan dark setiap kali mengubah komponen.
4. `js/shared/theme.js` menyelaraskan preferensi dan kunci tema lama antarhalaman.
5. CSS lama dapat memakai alias kompatibilitas; jangan menghapus bridge sebelum selector lama dimigrasikan.

---

## 7. Checklist implementasi per modul

| Halaman | Design system | Tema gelap | Kontrol tema |
|---|---|---|---|
| Portal | `css/design-system.css` | Ya | Portal |
| Accounting | Design system + bridge modul | Ya | Bawaan modul |
| SPT | Design system + bridge modul | Ya | Bawaan modul |
| Excel | Design system + bridge modul | Ya | App shell |
| SQL & Power Query | Design system + bridge modul | Ya | Bawaan modul |
| Kuis Langsung | Design system + tema kuis | Ya | App shell |
| Ruang Pengajar | Design system | Ya | App shell |

---

## 8. Referensi cepat warna (swatch)

**Light**
- Primary `#0b5cab` · Soft `#e8f1fb` · BG `#f4f7fb` · Surface `#ffffff` · Text `#0f172a`

**Dark**
- Primary `#3b82f6` · Soft `#1e3a8a` · BG `#0f172a` · Surface `#1e293b` · Text `#f8fafc`

---

*Dokumen ini dibuat untuk menjaga konsistensi visual sambil tetap menghormati fitur dark-mode switcher yang sudah ada di codebase.*

---

## 10. Design System v2 (Redesain UI/UX, Okt 2026)

Redesain ini **hanya mengubah tampilan** — rute, autentikasi, Firebase, perhitungan, generator, ekspor, dan penyimpanan progres tidak disentuh.

### 10.1 Berkas
| Berkas | Peran |
|---|---|
| `css/design-system.css` | Token (`--ds-*`), aksen modul, *bridge* ke variabel lama tiap modul, primitif `.ds-*` (tombol, kartu, chip, progress, tabel, dialog), fokus & reduced-motion. **Dimuat portal + semua modul.** |
| `css/ds-modules.css` | Penyempurnaan workspace per modul, dibatasi `html[data-app="…"]` (tanpa blur, tanpa overflow, modal tidak melebihi layar, target sentuh 44px). |
| `css/portal.css` | Hanya dashboard portal. Satu sumber gaya (lapisan "polish" lama yang saling menimpa sudah dihapus). |

Tiap halaman utama modul memakai `<html data-app="spt|accounting|excel|sqlpq">`. Atribut itu memilih aksen modul dan mengaktifkan *bridge* (mis. `--sp-primary`, `--accent-color`, `--sqlpq-blue-*`) tanpa mengubah selector komponen modul. Urutan `<link>` tidak berpengaruh (spesifisitas bridge lebih tinggi).

### 10.2 Palet
- **Identitas:** navy `--ds-navy-900 #0a1f3d` (header/sidebar), biru `--ds-primary #1d4ed8`.
- **Netral:** `--ds-bg #f3f6fa`, `--ds-surface #fff`, `--ds-border #dbe3ee`, `--ds-text #0f1b2d`, `--ds-muted #55657d`.
- **Aksen modul:** SPT biru `#2563eb` · Accounting teal `#0f766e` · Excel hijau `#15803d` · SQL & Power Query ungu `#6d28d9`. Dark mode memakai varian lebih terang (lihat berkas).
- **Semantik:** success / warning / danger / info, masing-masing punya pasangan `-soft`.
- Semua pasangan teks/latar utama diperiksa ≥ 4.5:1 (WCAG AA) untuk light dan dark.

### 10.3 Aturan
- Tipografi satu keluarga (`--ds-font`), skala `--ds-fs-xs … 2xl`; spasi kelipatan 4px (`--ds-sp-*`); radius 6/8/12px; bayangan halus.
- Tidak ada glassmorphism/blur, gradien dekoratif, atau animasi berlebih; transisi 140ms; `prefers-reduced-motion` dihormati.
- Fokus keyboard selalu terlihat (`:focus-visible`); layar sentuh (`pointer: coarse`) → kontrol minimal 44px.
- Tabel: bungkus dengan `.ds-table-wrap`/`.table-responsive` supaya hanya tabel yang scroll horizontal, bukan halaman.
- Dark mode tetap lewat `data-theme="dark"` (di `<html>`; di `<body>` untuk Simulator SPT). Portal kini punya tombol tema sendiri (kunci `portal_theme`); tiap modul tetap memakai kunci temanya sendiri.

### 10.4 Dashboard portal
Header navy + profil → ringkasan (XP, modul dimulai, aktivitas) → sesi terakhir → 4 modul beraksen → Aktivitas terbaru & Pencapaian → Progres Saya (ekspor/impor/PDF). **Semua angka berasal dari `PortalProgress.summarize()`** (data localStorage nyata); modul yang belum dimulai tampil "Belum dimulai", tidak ada angka karangan.

### 10.5 Keputusan penting & batasan
- **Game Hub tersedia sebagai Kuis Langsung** di `apps/game-hub/`. Aplikasi mendukung peran guru dan siswa, generator soal, timer, ruang kuis, dan papan peringkat. Fitur lama berupa misi, XP gabungan, level, streak, serta lencana Game Hub tidak lagi tersedia; progres pembelajaran per modul tetap ditampilkan pada panel Pencapaian portal.
- **Tahap 2 (workspace per modul)** — sudah dikerjakan lewat `css/ds-modules.css`, tanpa mengubah markup/logika:
  - *SPT*: umpan balik validasi (`.feedback.success/.error`) memakai token semantik + ikon ✓/⚠ (tidak hanya warna); sub-halaman `faktur_bupot`, `modul_pajak`, `tax_career` kini memakai `data-app="spt"` + design system.
  - *Accounting*: `.alert-warning/.alert-danger` memakai token (ikut dark mode) + ikon ⚠; tabel laporan tetap di dalam `.table-responsive` dengan header lengket.
  - *Excel* (≥1025px): kolom spreadsheet diberi porsi 2fr, tinggi sheet adaptif (`clamp(420px, 66dvh, 760px)`), dan panel samping (instruksi, input rumus, pengecekan, penjelasan) *sticky* dengan scroll sendiri.
  - *SQL & Power Query* (≥901px): Database Explorer (sumber data) *sticky*, editor lebih tinggi adaptif, panel hasil berlabel "Hasil", kotak soal beraksen ungu.
- **Sengaja tidak diubah:** `formulir_spt/*.html` (replika formulir resmi 1771 + lampiran) tetap dengan gaya aslinya agar kemiripan dengan formulir asli terjaga. Perombakan lebih jauh (mis. memindah panel di dalam file HTML SPT ±100 KB) tetap butuh pemeriksaan visual di browser.
- **Tema:** `js/shared/theme.js` menyelaraskan `portal_theme`, `theme`, dan `sqlpq_theme`; Excel dan seluruh halaman utama mendukung dark mode.

### 10.6 Login & profil pengguna
- **Login hanya di Portal** (`js/auth.js`, link email). Sesi disimpan di `localStorage["unified_portal_session"]`; logout juga hanya di portal.
- **Semua modul menampilkan profil dari sesi itu**: Accounting, Excel (+ Pivot & Dashboard), dan SQL & Power Query memakai `js/shared/user-chip.js` (chip avatar + nama + email, `.ds-profile-chip`); Simulator SPT memakai `getPortalIdentity()` di `app-main.js` untuk chip `.profile-chip` miliknya. Belum login → "Tamu".
- SPT tidak punya alur login sendiri lagi. Link email lama yang masih menuju halaman SPT dialihkan ke portal (query dipertahankan) agar portal yang menyelesaikan sign-in. Progres/XP SPT tetap milik SPT; yang berasal dari portal hanya nama & email. Sinkron cloud SPT tetap memakai sesi Firebase yang sama dengan portal (origin sama).
- Tema gelap SPT dipasang di `<html>` dan `<body>` (`applySptTheme`) agar alias warna di `:root` ikut berubah.

### 10.7 Uji browser (E2E)
- Folder `e2e/` (Playwright, gratis/open-source), job CI `e2e`; jalankan lokal: `cd e2e && npm install && npx playwright install chromium && npm test`.
- Cakupan: tiap halaman × desktop/tablet/mobile × terang/gelap (tanpa error JS, tanpa 404 lokal, tanpa scroll horizontal); tema gelap benar-benar berlaku (termasuk toggle SPT); kontras banner SPT; empat kartu modul; dialog login muat di mobile; target sentuh ≥ 44px; profil dari login portal di semua modul; grafik SPT dari riwayat nyata.
- Tes dibuktikan "bisa gagal": mengembalikan bug tema SPT (atribut hanya di `<body>`) membuat dua tes gagal.
- Screenshot dilampirkan ke laporan (belum dibandingkan terhadap baseline gambar — baseline piksel bergantung OS/font; aktifkan bila perlu dengan `toHaveScreenshot` di CI yang sama).

### 10.8 App shell & tema terpusat (poin 2)
- **`js/shared/theme.js`** (dimuat di `<head>`, sebelum skrip modul): satu preferensi tema untuk portal + semua modul. Menyamakan kunci lama (`theme`, `portal_theme`, `sqlpq_theme`) saat dimuat, memantau `data-theme` sehingga toggle bawaan tiap modul otomatis tersalin ke semua kunci, dan menyinkronkan antar-tab lewat event `storage`. API: `PortalTheme.get/set/toggle`, event `portal-theme-change`.
- **`js/shared/app-shell.js`** (menggantikan `user-chip.js`): di header tiap modul memasang (1) tautan **← Portal**, (2) tombol tema bila modul belum punya (Excel), (3) chip profil dari login portal. Tombol melayang `back-to-portal.js` dilepas dari modul yang punya header (masih dipakai `spt/tax_career`).
- **Excel kini punya mode gelap** (remap token `--efpg-*` di `design-system.css` + override teks hijau di `ds-modules.css`), termasuk Pivot & Dashboard.
- **Perbaikan bug lama:** overlay Modul Pengetahuan (`css/knowledge-base.css`) tidak pernah ikut mode gelap dan judulnya mewarisi warna teks halaman (terang) di atas panel putih → judul hilang di semua modul pada mode gelap. Kini overlay mengikuti `data-theme` di `<html>`/`<body>`.
- Dicakup E2E: tautan Portal di tiap modul, sinkron tema (kunci bertentangan, toggle tiap modul, antar-tab, dari portal), Excel gelap, kontras overlay pengetahuan di 4 modul × 2 tema. Tes overlay terbukti gagal bila CSS lama dikembalikan.

### 10.9 Game Hub — kini Kuis Langsung saja
Game Hub **tidak lagi** memuat misi harian/mingguan, XP gabungan, level, streak, lencana, riwayat klaim, maupun "pilih arena". Seluruh halaman `apps/game-hub/` adalah **Kuis Langsung** (lihat 10.13). Mesin `gamehub-engine.js`, `tests/test-gamehub.mjs`, unit sinkron `gamehub` (cloud-sync-core, rules `portalSync`), dan statistik Game Hub di banner/rekap portal ikut dihapus. Banner Game Hub di dashboard portal tetap ada sebagai tautan ke Kuis Langsung. Data lama `gamehub_state_v1` di perangkat/cloud tidak dipakai lagi (tidak berbahaya; rules menolak penulisan unit `gamehub` yang baru).

### 10.10 Sinkron cloud lintas modul (poin 4)
`js/shared/cloud-sync-core.js` (murni, diuji) + `cloud-sync.js` (adapter Firebase RTDB) + panel **Sinkron cloud** di *Progres Saya* portal + bilah "Muat ulang" di modul + lencana ☁ di kartu profil. Detail model data, aturan, dan batasan: lihat `SECURITY.md` (bagian *Sinkron cloud lintas modul*).
- **Tidak mengubah modul**: sinkron membaca/menulis `localStorage` modul lewat allowlist `progress-aggregator.js` Ringan untuk tamu: tanpa login tidak ada Firebase SDK maupun jaringan. SPT tidak ikut (sinkron sendiri).
- **Cabang rules baru `portalSync/$uid/$unit`**, terpisah dari `users/$uid`. Perlu **deploy rules** (langkah di `SECURITY.md`); sebelum itu UI menampilkan "Aturan Firebase belum diperbarui" dan progres tetap aman lokal.
- **Merge tiga arah**, reset ikut merambat, konflik → yang lebih maju menang, tautan pertama/ganti akun → pengguna memilih. Modul menyimpan state di memori, jadi setelah data cloud diterapkan modul menampilkan "Muat ulang" (portal & Game Hub merender ulang sendiri).
- **Ujinya:** `tests/test-cloudsync.mjs` (110 pemeriksaan: matriks keputusan, dokumen cloud jahat, dua perangkat, reset, konflik, balapan tulis, jaringan gagal, penyimpanan penuh, Game Hub, ganti akun, state bawaan), `scripts/check-firebase-rules.mjs` (kini 133 pemeriksaan, termasuk payload nyata dari `buildRemote`), dan `e2e/cloudsync.spec.mjs` (12 skenario di browser nyata dengan Firebase tiruan bersama untuk beberapa "perangkat").

### 10.11 Analitik belajar & Ruang Pengajar (poin 5)
**Peserta — panel "Analitik belajar" di portal** (`js/shared/learning-analytics.js`, murni & diuji). Membaca riwayat yang SUDAH dicatat tiap modul tanpa mengubah modul: akurasi per fungsi (Excel), jumlah salah per konsep (SQL & PQ), skor per komponen jurnal (Accounting), skor per simulasi + jalur Tax Career (SPT). Ambang: <70% = perlu diulang, ≥85% dengan ≥3 percobaan = kuat; data terlalu sedikit ditandai "tentatif" (tidak masuk rekap) atau tidak dinilai (Accounting butuh ≥3 percobaan; SPT ≥2 simulasi). Prioritas memberi bobot lebih ke komponen berbobot besar (akun, debit/kredit). Maksimal 5 saran, ≤2 per modul, masing-masing dengan alasan berupa angka nyata, saran tindakan, dan tautan ke modul. Tabel label konsep SQL dan bobot Accounting dijaga test terhadap sumbernya (`question-bank.js`, `scoringEngine.js`).

**Pengajar — tanpa server, tanpa peran akses.** Rancangan sengaja memindahkan keputusan privasi ke peserta:
- Peserta mengunduh **rekap agregat** (`rekap-belajar-*.json`) dari portal setelah mengisi nama (wajib) dan memilih sendiri apakah email ikut (default tidak). Ada pratinjau persis isi berkas. Tidak memuat jawaban, data perusahaan, NPWP, maupun data SPT; topik tentatif tidak ikut.
- Pengajar membuka **Ruang Pengajar** (`apps/pengajar/`) dan memuat banyak berkas dari komputernya. Semua diproses di browser: tanpa unggah, tanpa penyimpanan (hilang saat halaman ditutup), tanpa permintaan jaringan (dicek E2E). Hasil: ringkasan kelompok, topik tersulit (dihitung per orang), statistik per modul, tabel peserta (urut/filter/cari), ekspor CSV.
- **Berkas rekap = input tak tepercaya** (`js/shared/cohort-engine.js`): format & versi wajib, angka dipaksa ke rentang, teks dibatasi, field asing dibuang, ≤100 KB, ≤300 berkas, tanggal masuk akal. Teks dirender dengan `textContent`; CSV menetralkan sel berawalan `= + - @` (CSV injection).
- Definisi: *aktif* = ada aktivitas ≤7 hari; *perlu perhatian* = skor rata-rata (tertimbang aktivitas) <60% dengan ≥5 aktivitas. Peserta yang sama (nama+email) dihitung sekali, rekap terbaru menang.
- **Batasan jujur:** rekap dibuat peserta dan dapat diubah, jadi **bukan bukti penilaian resmi**; pengajar tidak melihat progres peserta secara langsung/real-time. Pendekatan berbasis akun/cloud untuk pengajar sengaja tidak dibangun: butuh model peran, persetujuan peserta, dan aturan Firebase yang harus dirancang dan diuji dengan Firebase asli.
- Uji: `tests/test-analytics.mjs` (130 pemeriksaan) + `e2e/analytics.spec.mjs` (12 skenario, termasuk alur unduh→muat dan serangan nama/CSV).

### 10.12 Konten baru: "Penggajian & PPh 21 (TER)" (poin 6)
Materi ke-7 di **Generator Excel** (3 level) + **bab 11** di Modul Pengetahuan Excel. Dipilih karena PPh 21 sudah ada sebagai kalkulator/soal konseptual di SPT, tetapi latihan hitung penggajian yang akurat belum ada (materi "Karyawan" lama menyebut dirinya "disederhanakan, BUKAN metode TER resmi").
- **Level** (mengikuti kontrak kurikulum yang dijaga tes modul): *Beginner* (datar, tanpa lookup): bruto bulanan (premi JKK/JKM/kesehatan dibayar perusahaan **termasuk**), kategori TER lewat `IF/OR`, PTKP lewat `LEFT/RIGHT/VALUE` (54 jt + 4,5 jt kawin + 4,5 jt × tanggungan). *Profesional* (`VLOOKUP`): kategori, tarif TER lewat `SUMIFS` ke tabel resmi, PPh bulanan `ROUNDDOWN`, penerimaan bersih. *Expert* (`XLOOKUP`+`IFERROR`): masa pajak terakhir — bruto setahun, biaya jabatan (5%, maks 6 jt), neto, PKP (ke bawah ribuan), Pasal 17 progresif dengan `SUMPRODUCT` + kolom selisih tarif, PPh Desember = setahun − Jan–Nov (hasil negatif **tidak** dipotong; ada di simulasi resmi DJP).
- **Sumber tunggal data:** `apps/excel/data/payroll-ter.js` dibangkitkan dari `apps/spt/js/shared/tax-engine.js` oleh `scripts/gen-excel-payroll-data.mjs` (tabel TER tidak diketik ulang).
- **Pembuktian (tests/test-payroll-ter.mjs, 134 pemeriksaan):** (1) 125 lapisan TER A/B/C + Pasal 17 + PTKP + kategori dicocokkan baris demi baris dengan **slide resmi DJP "PMK 168 Tahun 2023 tentang PPh Pasal 21 TER"** (pajak.go.id) dan dengan mesin SPT; (2) **contoh hitung resmi** (simulasi 9 baris termasuk Desember negatif, Tuan R, Tuan A, F, H, B, D, P) dijalankan lewat rumus Excel yang dibangkitkan, dievaluasi **HyperFormula** (`vendor/`); (3) 120 spesifikasi acak (2.460 baris karyawan) dibandingkan dengan implementasi referensi independen; (4) kontrak level. Uji E2E: `e2e/payroll.spec.mjs` (UI → .xlsx yang diunduh → bab 11).
- **Temuan saat verifikasi:** (a) ingatan saya sendiri keliru pada 3 lapisan TER kategori C; tabel di repo ternyata benar — itu sebabnya verifikasi memakai dokumen resmi, bukan ingatan. (b) `tax-engine.js hitungTER` memakai `Math.round`, sedangkan latihan memakai pembulatan ke bawah (SE-22/PJ.24/1990): selisih Rp1 pada ±1,6% nilai uji (kasus pecahan tepat .5). **Belum diselaraskan**: aturan pembulatan TER spesifik di Coretax belum terverifikasi; keputusan ada pada pemilik materi. (c) Per 11 Okt 2026 **PTKP baru diwacanakan naik (rencana 2027, besaran belum ditetapkan)**; materi memakai nilai berlaku (PMK 101/PMK.010/2016) dan peringatan dicatat di bab 11.6 dan `scripts/regulasi-terpantau.json`.
- **Saat PTKP/TER berubah:** ubah nilai di `tax-engine.js` → `node scripts/gen-excel-payroll-data.mjs` → perbarui bab 11 dan tabel contoh resmi di `tests/test-payroll-ter.mjs` (vektor resmi sengaja dikunci ke dokumen DJP; ia akan gagal dan memaksa tinjauan).
- **Dimodelkan:** pegawai tetap, gaji tetap sepanjang tahun, TER Jan–Nov, Desember. **Tidak dicakup:** pegawai tidak tetap, pesangon, pensiunan, gross-up, pindah kerja tengah tahun, THR/bonus di bulan selain Desember, iuran BPJS Kesehatan karyawan 1% pada penerimaan bersih. Premi perusahaan dan iuran JHT+JP karyawan diberikan sebagai data (tarif/batas upah BPJS berubah-ubah).

### 10.13 Kuis Langsung (= halaman Game Hub, `apps/game-hub/`)
- **Tujuan:** kuis real-time ala Quizizz. **Guru** memilih tema (Pajak / Akuntansi / Excel / SQL & Power Query / Campuran) → 20 soal dibuat otomatis (jumlah 5–50) → dapat diedit, diganti per soal, atau digenerate ulang → atur timer (5 detik–5 menit) → bagikan **kode ruang 6 karakter** (tanpa 0/O/1/I) atau tautan `?kode=`. **Siswa** masuk dengan kode + nama panggilan saat guru masih mengatur (lobi). Setelah mulai: papan peringkat real-time dari **ketepatan + kecepatan** (benar = 500–1000 poin menurun linear terhadap waktu, salah/lewat waktu = 0).
- **Sumber soal:** bank materi nyata (`apps/spt/modul_pajak/questions.json`, `apps/spt/tax_career/data/questions.js`, hanya pilihan ganda) + 22 soal konsep akuntansi + generator berangka (Pajak: PPh Pasal 17 progresif, PPh 23, PPh final UMKM, PPh badan, PTKP/PKP, PPN; Akuntansi: persamaan akuntansi, penyusutan, laba bersih, HPP, FIFO, rasio, margin, jurnal; **Excel**: SUM/AVERAGE/MAX/MIN/COUNT, IF, LEFT/RIGHT/MID/LEN, VLOOKUP, ROUND, INDEX-MATCH, SUMIF/COUNTIF, penyalinan referensi `$`; **SQL**: COUNT/SUM/AVG, GROUP BY-HAVING, ORDER BY-LIMIT, DISTINCT, INNER/LEFT JOIN, NULL) + 24 soal konsep Excel dan 25 soal konsep SQL/Power Query (Merge, Append, Unpivot, Group By, M case-sensitive, dst.). Jawaban generator **dihitung**, lalu dicocokkan di `tests/test-livequiz.mjs` ke mesin NYATA repo: rumus Excel dievaluasi `apps/excel/js/spreadsheet-engine.js`, query SQL dijalankan di SQLite/WASM asli (`apps/sql-pq/vendor/sql-js`), pajak/akuntansi dihitung ulang terpisah (±37.000 pemeriksaan).
- **Arsitektur:** `js/shared/livequiz-engine.js` (mesin murni) · `js/shared/livequiz-room.js` (transport + `Host`/`Player`) · `apps/game-hub/` (UI). Transport: **Firebase RTDB** (Spark gratis, login anonim) atau **Mode lokal** (localStorage, beberapa tab satu perangkat — untuk uji/demo; tidak aman & tidak lintas perangkat).
- **Model keamanan (`liveRooms/<KODE>` di `database.rules.json`):** kunci jawaban di `key/` **hanya terbaca guru**; data soal publik tidak memuat kunci; jawaban siswa tulis-sekali dengan waktu **server** (tak bisa dimajukan/dipalsukan) dan hanya terbaca guru + pemiliknya; **skor dihitung & ditulis guru** (siswa tak bisa menulis skor); jawaban terlambat bernilai 0; ruang tak bisa dibaca utuh atau didaftar. Diuji 60+ kasus di `scripts/check-firebase-rules.mjs` bagian D (termasuk uji mutasi: rules dilemahkan → tes gagal).
- **Batasan jujur:** (1) guru harus tetap membuka halaman selama kuis (skor dihitung di browser guru; reload aman — dipulihkan dari jawaban di server); (2) login **Anonim** harus diaktifkan di Firebase Console (Authentication → Sign-in method) dan rules harus dipublikasikan ulang; (3) siswa yang memakai DevTools bisa mengirim jawaban otomatis tetapi tidak bisa melihat kunci; (4) ruang tidak kedaluwarsa otomatis — guru menutupnya dengan tombol "Tutup & hapus ruang".
