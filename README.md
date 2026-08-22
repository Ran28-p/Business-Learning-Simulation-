# Portal Belajar — Business Learning Simulator

Satu web yang menggabungkan beberapa simulator latihan bisnis & pajak:

| Modul | Folder | Deskripsi singkat |
|---|---|---|
| **Simulator SPT Pajak** | `apps/spt/` | SPT Tahunan Badan (1771), lampiran, modul pajak & kuis, Tax Career |
| **Accounting Simulator** | `apps/accounting/` | Siklus akuntansi lengkap + invoice & PPN |
| **Excel Formula Practice** | `apps/excel/` | Latihan rumus Excel Level 1–2 di atas dataset penjualan |
| **SQL & Power Query Simulator** | `apps/sql-pq/` | SQL editor (SQLite/WASM), dataset generator, Power Query Practice |

## Alur pengguna

1. Buka `index.html` (harus lewat HTTP server, bukan `file://`).
2. **Login tanpa password** — masukkan email, sistem mengirim *magic link* (Firebase Email Link Auth). Atau pilih **Lanjutkan sebagai Tamu**.
3. Setelah masuk, pilih modul di hub.
4. Di setiap modul ada tombol mengambang **← Portal** untuk kembali.

## Menjalankan lokal

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Lalu buka http://localhost:8000

## Struktur proyek (profesional)

```
.
├── index.html                 # Portal login + hub modul
├── sw.js                      # Service worker portal
├── ARCHITECTURE.md
├── design.md                  # Design system (tokens warna, tipografi)
├── SECURITY.md
├── css/
│   ├── portal.css
│   ├── knowledge-base.css
│   └── responsive-foundation.css
├── js/
│   ├── auth.js                # Firebase email-link auth (shared)
│   ├── portal.js
│   ├── back-to-portal.js
│   └── knowledge-base.js
├── scripts/
│   └── ci-lint.mjs
├── vendor/                    # Library pihak ketiga (offline-ready)
│   ├── html2pdf/
│   └── hyperformula/
├── .github/workflows/
│   └── ci-deploy.yml          # Test + deploy GitHub Pages
└── apps/
    ├── accounting/            # Modular: engine, generators, presentation, tax…
    ├── excel/                 # Modular: spreadsheet-engine, question-*, export/
    ├── sql-pq/                # Modular: sql-engine, powerquery-engine, curricula
    └── spt/
        ├── index.html         # Shell HTML (tipis, ~1k baris)
        ├── css/styles.css     # Styles modul SPT
        ├── js/
        │   ├── firebase-config.js
        │   ├── app-main.js    # Core engine, kasus, UI flow
        │   ├── calculators.js # Simulasi TER / THR / banding
        │   ├── knowledge-init.js
        │   └── sw-register.js
        ├── data/
        ├── formulir_spt/
        ├── modul_pajak/
        ├── tax_career/        # Sub-app (data terpisah di data/)
        ├── icons/
        ├── manifest.json
        └── sw.js
```

Setiap modul mendaftarkan `sw.js` sendiri → shell tetap bisa dipakai offline setelah kunjungan pertama.

## Catatan integrasi

- **Auth:** Login hanya di portal (atau mode tamu). Masing-masing app bisa dibuka langsung via URL.
- **Data:** Setiap app memakai `localStorage` dengan key berbeda — tidak saling menimpa.
- **Offline:** App shell offline-capable; fitur magic-link login butuh jaringan.
- **Testing:** `apps/excel` punya suite test (`npm test` di folder tersebut). CI menjalankan test tersebut otomatis.

## Pengembangan

- Jangan commit `node_modules/` (sudah di `.gitignore`).
- Ikuti token di `design.md` untuk warna & spacing.
- Untuk modul baru: buat folder di `apps/`, daftarkan di portal, dan sediakan `sw.js` + tombol kembali ke portal.
