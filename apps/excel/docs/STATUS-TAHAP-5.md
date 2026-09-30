# Status Tahap Pemetaan Tier Beginner / Professional / Expert

Permintaan tahap ini: dari dua pekerjaan besar yang diusulkan di akhir `docs/STATUS-TAHAP-4.md` (dataset multi-tabel relasional, ATAU pemetaan Level 1-6 ke framing Beginner/Professional/Expert), dikerjakan yang **lebih aman dan lebih langsung memenuhi permintaan spesifikasi asli** (Bagian 4: "Gunakan ID internal: beginner, professional, expert"). Pekerjaan dataset multi-tabel relasional TETAP belum dikerjakan — itu tetap gap struktural terbesar yang tersisa, sengaja ditunda karena risikonya jauh lebih tinggi (menyentuh referensi lintas-sheet di evaluator, dataset generator, DAN workbook blueprint sekaligus).

## 1. Dasar Keputusan Desain

Spesifikasi asli mendefinisikan cakupan fungsi tiap tier secara eksplisit (Bagian 5, 8, 12):
- **Beginner** (Bagian 5): HANYA `SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/ROUND` + aritmetika. Tidak ada IF, tidak ada kondisi sama sekali.
- **Professional** (Bagian 8): Logika (`IF/IFS/AND/OR/IFERROR`), agregasi bersyarat (`SUMIF/SUMIFS/COUNTIF/COUNTIFS/AVERAGEIF/AVERAGEIFS`), lookup (`VLOOKUP/HLOOKUP/XLOOKUP/INDEX/MATCH`), tanggal, teks.
- **Expert** (Bagian 12): kombinasi semuanya + studi kasus bisnis multi-tabel.

Dibandingkan dengan `LEVEL_CONFIG` yang sudah ada di `question-bank.js` (lihat kolom `minConditions`/`maxConditions`/`minNestedDepth`/`businessScenario`), pemetaan yang **paling jujur secara isi** (bukan dibagi rata 2-2-2 secara sembarangan) adalah:

| Tier | Level | Alasan |
|---|---|---|
| `beginner` | 1 saja | Satu-satunya level dengan `minConditions:0, maxConditions:0` — satu fungsi, tanpa kondisi. Persis definisi Beginner di spesifikasi. |
| `professional` | 2, 3, 4 | IF tunggal (L2) → lookup (L3) → multi-kriteria SUMIFS/IFS (L4). Semuanya cocok dengan daftar fungsi Professional di spesifikasi, dan masih satu tabel datar (belum ada `businessScenario`). |
| `expert` | 5, 6 | `minNestedDepth: 1` mulai muncul di L5; L6 sudah eksplisit `businessScenario: true` sejak sebelum pemetaan ini dibuat. |

Konsekuensinya pembagian TIDAK rata (1/3/2), bukan 2/2/2 seperti mungkin terlihat "rapi" — ini keputusan sadar, bukan kealpaan, supaya framing tier benar-benar mencerminkan isi materinya.

**Catatan penamaan:** Level 6 punya nama Indonesia "Profesional" (lihat `LEVEL_CONFIG[6].name`) tapi masuk tier **Expert**, bukan tier **Professional** — ini SENGAJA (nama Indonesia level 6 adalah urutan kesulitan ke-6, bukan penanda tier). Supaya tidak membingungkan pengguna, UI menampilkan keduanya berdampingan apa adanya: header tier "🧠 Expert" di sidebar, dengan item "Level 6 — Profesional" di bawahnya — bukan mengganti nama level 6 (itu akan jadi perubahan konten yang tidak diminta dan berisiko membingungkan pengguna lama yang sudah familiar dengan penamaan Pemula-Profesional).

## 2. Yang Dikerjakan

Ini murni **lapisan pengelompokan presentasi di atas mesin yang sudah ada** — pembuatan soal, validasi jawaban, scoring, dan seluruh `question-bank.js`/`question-engine.js`/`formula-validator.js` **tidak disentuh logikanya sama sekali**, hanya ditambah metadata.

| File | Perubahan |
|---|---|
| `js/question-bank.js` | `TIER_CONFIG` baru (3 entri: `beginner`/`professional`/`expert`, masing-masing dengan `id`, `label`, `icon`, `description`, `levels`), plus helper `getTierForLevel(level)` dan `getLevelsForTier(tierId)`. |
| `js/app.js` | Import `TIER_CONFIG`/`getTierForLevel`. Sidebar level (`renderLevelPath()`) sekarang menampilkan header tier (🌱/💼/🧠) di atas kelompok level terkait. Catatan pilihan (`updateSelectionNote()`) dan chip level pada soal aktif kini menyertakan label tier. Pemanggilan export (`downloadWorkbookAsXlsx()`) mengirim `tier`/`tierLabel` ke `buildWorkbookBlueprint()`. |
| `js/export/workbook-blueprint.js` | `buildWorkbookBlueprint()` menerima 2 parameter baru opsional: `tier`, `tierLabel` — disimpan di `meta.tier`/`meta.tierLabel`. Default `null` kalau tidak dikirim (backward compatible dengan pemanggil lama, termasuk `tests/test-workbook-export.mjs` yang tidak diubah). |
| `js/export/workbook-renderer.js` | Baris subtitle sheet "Latihan" kini menyertakan `tierLabel` (kalau ada) sebelum `levelLabel`, mis. `"Penjualan — 💼 Professional · Level 3 — Menengah"`. |
| `css/style.css` | Style baru `.level-path__tier-label` untuk header tier di sidebar. |
| `index.html` | Teks statis awal `setupSelectionNote` (sebelum JS jalan) disamakan dengan hasil `updateSelectionNote()` untuk Level 1 default. |
| `tests/test-tier-mapping.mjs` | **Baru.** 3 lapis: (1) struktur `TIER_CONFIG` — 3 tier, ID sesuai spesifikasi, keenam level tercakup tepat sekali (tidak ada yang hilang/dobel); (2) `tier`/`tierLabel` mengalir dengan benar ke `meta` blueprint, termasuk kasus tanpa tier (backward compat); (3) ujung-ke-ujung — render `.xlsx` sungguhan, baca ulang, pastikan label tier BENAR-BENAR terlihat di sel subtitle, bukan cuma tersimpan di objek JS yang tidak pernah dipakai. |
| `package.json` | `npm test` diperluas dari 7 jadi 8 file. Skrip pintas baru: `test:tiers`. |
| `README.md` | Bagian "Materi & Level" diperluas dengan tabel pemetaan tier. |

## 3. Verifikasi

- **Baseline sebelum perubahan:** 556/556 test lulus (7 file, hasil Tahap 4).
- **`tests/test-tier-mapping.mjs` (baru):** 53/53 lulus — termasuk verifikasi ujung-ke-ujung bahwa label tier benar-benar muncul di file `.xlsx` yang di-render ulang lewat ExcelJS, dan bahwa workbook TANPA tier (pemanggil lama) tetap merender bersih tanpa teks `"null"`/`"undefined"` yang nyasar.
- **Setelah seluruh perubahan:** `npm test` penuh (8 file) → **609/609 lulus, nol regresi**. `scripts/ci-lint.mjs` (syntax seluruh repo + validitas JSON + link HTML) → lulus.
- Diff terhadap kondisi sebelum tahap ini dibatasi HANYA pada 8 file di atas — `apps/spt`, `apps/accounting`, `apps/sql-pq`, dan seluruh file root tidak tersentuh.

## 4. Keterbatasan yang Diketahui

- `app.js` sendiri (orkestrator UI) tidak punya test otomatis khusus di codebase ini — baik sebelum maupun sesudah tahap ini (bukan regresi baru, ini gap pre-existing). Perubahan di `app.js` pada tahap ini divalidasi lewat `node --check` (syntax) + review manual + fakta bahwa satu-satunya import baru (`TIER_CONFIG`, `getTierForLevel`) sudah diverifikasi benar lewat 53 test di atas. Menyiapkan test DOM penuh untuk `app.js` (memuat `index.html` asli via jsdom dengan module resolution) adalah pekerjaan tersendiri yang cukup besar dan di luar cakupan tahap ini.
- Belum ada perubahan pada `apps/excel/pivot-dashboard/` (sub-halaman terpisah) — tier hanya diterapkan di halaman utama Excel Practice.

## 5. Sisa Pekerjaan Besar (belum dikerjakan)

Tetap sama seperti di `docs/STATUS-TAHAP-4.md`: **dataset multi-tabel relasional** (`TRANSAKSI` + `MASTER_PRODUK`/`MASTER_CUSTOMER` sebagai sheet terpisah dengan referensi lintas-sheet di evaluator) adalah gap struktural terbesar yang tersisa relatif terhadap spesifikasi produk asli. Ini butuh desain terpisah sebelum dikerjakan karena menyentuh `spreadsheet-engine.js` (referensi lintas-sheet saat ini tidak didukung sama sekali — semua referensi diasumsikan satu grid), `dataset-generator.js`, `question-bank.js`, dan `workbook-blueprint.js` sekaligus.
