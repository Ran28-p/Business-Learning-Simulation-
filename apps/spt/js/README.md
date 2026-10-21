# SPT Module — JavaScript

Struktur modular (dipisah dari monolitik `index.html`):

| File | Peran |
|------|--------|
| `firebase-config.js` | Konfigurasi & init Firebase (graceful offline) |
| `app-main.js` | Generator kasus, utilitas, state (`appState`), identitas portal, Firebase & simpan data |
| `app-ui.js` | Navigasi/routing, unduh PDF, tema & sidebar, pemilih mode & kasus |
| `app-form1770.js` | Formulir SPT 1770 (state, baris dinamis, hitung, cek, hasil) |
| `app-form1770-ss-s.js` | Formulir SPT 1770 SS dan 1770 S |
| `app-form1771.js` | Formulir SPT 1771 (Badan) |
| `app-simulation.js` | Alur simulasi, riwayat, `window.onload`, ekspor/impor backup |
| `calculators.js` | Widget simulasi TER / analisis THR / banding progresif |
| `knowledge-init.js` | Tombol buka modul pengetahuan (e-book) |
| `sw-register.js` | Registrasi Service Worker |

`window.TaxEngine` diekspos dari `app-main.js` agar `calculators.js` bisa memakai engine yang sama.
