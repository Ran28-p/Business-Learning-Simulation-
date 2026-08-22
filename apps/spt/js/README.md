# SPT Module — JavaScript

Struktur modular (dipisah dari monolitik `index.html`):

| File | Peran |
|------|--------|
| `firebase-config.js` | Konfigurasi & init Firebase (graceful offline) |
| `app-main.js` | Engine pajak (TaxEngine), generator kasus, state, UI flow, sync |
| `calculators.js` | Widget simulasi TER / analisis THR / banding progresif |
| `knowledge-init.js` | Tombol buka modul pengetahuan (e-book) |
| `sw-register.js` | Registrasi Service Worker |

`window.TaxEngine` diekspos dari `app-main.js` agar `calculators.js` bisa memakai engine yang sama.
