# Tax Career & Practice

Modul latihan pekerjaan nyata di bidang perpajakan, terintegrasi ke SIM-SPT tanpa mengubah simulator 1771.

## Jalur
- Tax Compliance
- Tax Accountant
- Tax Consultant
- Tax Planner
- Tax Auditor / Reviewer
- Tax Manager / Supervisor

## Alur
Learn → Practice → Review → Result

Progress disimpan di `localStorage` key `spt_tax_career_progress`.

## File
- `index.html` — shell UI
- `style.css` — gaya mengikuti token SPT
- `app.js` — logika latihan & skor
- `data/tracks.js` — materi Learn + tautan ke 1771 / modul pajak
- `data/questions.js` — bank kasus

## Buka
Dari dashboard SIM-SPT → kartu **Tax Career & Practice**, atau langsung `tax_career/index.html`.

## Commercial & Fiscal Tax Accounting
Fondasi Tax Accountant di dalam modul yang sama (`tax_career/`).

Submodul:
- Komersial vs Fiskal
- Identifikasi Perbedaan (klasifikasi none / + / −)
- Koreksi Positif & Negatif
- Permanent vs Temporary
- Fiscal Reconciliation Simulator (basic / intermediate / advanced)
- Find the Error (review)
- Hubungan ke SPT 1771 (tautan Lampiran I & Induk)

Data: `data/commercial-fiscal.js`

## Tax Auditor / Reviewer Lab
Submenu di hub Tax Career (`data/tax-auditor.js`):
Fundamentals, Transaction/Find the Error, Compliance checklist, Fiscal review,
Correction review, Recalculate, SPT cross-check, Risk drill, Final case.
Tidak mengubah simulator 1771 — hanya tautan cross-check edukasi.

## Cross-Check Engine
File: `js/cross-check-engine.js` (global `CrossCheckEngine`)

Fungsi utama:
- `checkFiscalFormula` — Komersial + Positif − Negatif vs klaim
- `checkTaxCalc` — PKP × tarif vs PPh klaim
- `checkWorkingVsSpt` — pasangan working vs SPT
- `checkTransactions` — daftar isu expected dari dataset
- `run` / `runFromGlobals` — paket pemeriksaan

UI: submenu **Cross-Check Engine** di Auditor Lab; juga dipakai di SPT Review, Fiscal Review, Final Review.
