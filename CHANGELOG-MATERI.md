# Changelog Pengembangan Materi (Fase 0–2)

Ringkasan gabungan perubahan dari Fase 0 sampai Fase 3 terhadap ZIP asli `..._updated_125`.
Tanggal tinjau: Oktober 2026. Fase 3 selesai untuk SPT (modul_pajak, tax_career, Isi Formulir), Accounting, Excel, dan SQL. Fase 4 (verifikasi angka) dan Fase 5 (pemeliharaan) selesai.

## Fase 0 — Fondasi kepercayaan
- `js/knowledge-base.js`, `css/knowledge-base.css`: blok "Sumber & rujukan", lencana "Ditinjau: bulan-tahun", `disclaimer` per modul; juga tampil di cetak/PDF dan ikut pencarian.
- Skema opsional per subbab: `sources: [{type, ref, note?, url?}]`, `reviewed: 'YYYY-MM'`, atau `noSourceNeeded: 'alasan'` (tidak boleh digabung dengan sources/reviewed).
- `scripts/lib/kb-validate.mjs`, `scripts/check-knowledge.mjs`, `scripts/knowledge-baseline.json`, `tests/test-knowledge-schema.mjs`; dipasang di job `lint` pada `.github/workflows/ci-deploy.yml`.
  - Ratchet: cakupan sumber tidak boleh turun, subbab baru wajib bersumber. `--strict` gagal bila ada subbab tanpa sumber. Setelah menambah sumber: `node scripts/check-knowledge.mjs --update-baseline`.
  - Penjaga sinkron: salinan soal di `apps/spt/modul_pajak/index.html` harus sama dengan `questions.json`.
- Dihapus: `apps/spt/js/knowledge-spt.js` (salinan identik yang tidak dimuat).
- Semua `CACHE_NAME` service worker dinaikkan.

## Fase 1 — Akurasi
- **SPT:** PP 20/2026 (final UMKM: subjek OP, PT Perorangan, Koperasi; PT/CV biasa peralihan s.d. TP 2026); PPN 12% dengan DPP nilai lain 11/12 (PMK 131/2024), barang mewah 12% penuh, 11/12 hanya untuk PPN; sanksi KUP (denda Pasal 7, bunga acuan+uplift); PMK 111/2025 (SP2DK, tanggapan 14+7 hari); keberatan/banding (Pasal 25–27); biaya jabatan.
- Salinan soal `modul_pajak/index.html` yang basi (51 soal) disinkronkan menjadi 61 soal; 5 soal UMKM diperbarui.
- **Accounting:** penomoran PSAK baru (201, 207, 212, 216, 115, 109) di `aiTutor.js` dan `validationEngine.js`; kelengkapan laporan keuangan menurut PSAK 201/SAK EMKM.
- **SQL:** peringatan "alias di WHERE" diperbaiki (SQLite menerimanya; diuji pada sql.js 1.14.1 / SQLite 3.49.1).

## Fase 2 — Perluasan materi
- **SPT:** PPh 21 masa Desember; PPh 23; PPh final 4(2) & Pasal 26; Faktur Pajak & Pajak Masukan; pembetulan SPT; penyusutan fiskal; rekonsiliasi fiskal.
- **Accounting:** bab 3 Siklus Akhir Periode (jurnal penyesuaian, penyusutan, piutang tak tertagih).
- **Excel:** XLOOKUP + ketersediaan versi; tabel error ditambah #SPILL!, #NUM!, #####.
- **SQL:** NULL & logika tiga nilai; catatan dialek SQLite; RIGHT/FULL JOIN sejak SQLite 3.39.0.

## Fase 3 (sebagian) — Pembahasan berlapis `modul_pajak`
- Setiap soal (61) punya objek `pembahasan`: `konsep` (mengapa jawabannya begitu), `dasar`, `langkah` (soal hitung), `salah` (alasan tiap opsi salah, soal pilihan ganda), `jebakan`, `ingat`. Soal isian punya `accept` (jawaban alternatif).
- UI (`apps/spt/modul_pajak/script.js`, `style.css`) menampilkan blok pembahasan bertingkat; semua teks di-escape. Bug lama diperbaiki: rujukan (`ref`) tidak pernah tampil karena tidak diteruskan ke tampilan hasil.
- Penilaian: angka gaya Indonesia kini terbaca benar ("4.000.000", "Rp 4.000.000", "0,5" — sebelumnya "4.000.000" terbaca 4 dan "0,5" terbaca 5); jawaban teks toleran terhadap huruf besar/kecil, tanda baca, dan jawaban alternatif.
- Koreksi isi soal: topik `pbb_p3` dan `pbb_p2` tertukar/keliru (P3 = perkebunan, perhutanan, pertambangan, pajak pusat; P2 = perdesaan & perkotaan, pajak daerah, subjek orang pribadi maupun badan); soal "fungsi bea meterai" yang menyatakan meterai menjamin keabsahan dokumen diganti (dokumen tanpa meterai tetap sah perdata); soal PPh progresif diberi catatan penyederhanaan tarif tunggal; beberapa `ref` diperbaiki.
- `tests/test-modul-pajak.mjs` (257 pengecekan) dan lint pembahasan di `scripts/check-knowledge.mjs` (wajib lengkap per soal); keduanya di CI.

### Fase 3 — `tax_career` (29 soal)
- `apps/spt/tax_career/data/questions-pembahasan.js` (baru, dimuat setelah `questions.js`): menempelkan `pembahasan` (konsep, dasar, langkah hitung, alasan tiap opsi salah, jebakan, cara mengingat) ke tiap soal berdasarkan `id`. `app.js` menampilkannya di bawah umpan balik; `style.css` memuat gaya `.tcpb`. Semua teks di-escape.
- Koreksi: skenario TC-004 (dasar angsuran PPh 25 adalah PPh terutang setelah kredit pajak, bukan "kurang bayar"); penjelasan TCO-005 (rujukan "Pasal 8 ayat (4)" dan "SPHP" dihapus karena tidak dapat diverifikasi; kini merujuk Pasal 8 secara umum).
- `tests/test-tax-career-pembahasan.mjs` (231 pengecekan, termasuk aritmetika contoh) dan lint di `scripts/check-knowledge.mjs`; keduanya di CI.

### Fase 3 — sisa modul
- **SPT, mode Isi Formulir** (`apps/spt/js/data/form-pembahasan.js`, baru): tiap titik cek hasil penilaian (58 label di 1770, 1770 SS, 1770 S, 1771) punya rumus, dasar, dan jebakan umum; yang salah terbuka otomatis, yang benar bisa dibuka. Menggantikan daftar ✅/❌ polos di dua tempat `app-main.js`. `tests/test-form-pembahasan.mjs` memastikan setiap label di kode punya aturan.
- **Accounting, AI Tutor**: 7 pelajaran kesalahan klasik baru yang sadar-konteks (prive vs beban, penyusutan ke akumulasi, uang muka pelanggan, sewa dibayar dimuka, utang gaji, PPN masukan/keluaran terpisah). Hanya muncul bila answer key memuat akun tertentu DAN siswa memakai akun "tetangga" yang keliru, sehingga tidak salah tuduh. `detectClassicMistakes` kini menerima answer key; `tests/test-aitutor-classic.mjs` (17 pengecekan).
- **Excel**: bab 10 "Pembahasan Fungsi pada Latihan": tabel ketersediaan versi (XLOOKUP, LET, TEXTJOIN; dicocokkan dengan Microsoft Support) dan kesalahan umum per fungsi.
- **SQL** (`apps/sql-pq/js/sql-pembahasan.js`, baru): setelah menjawab, pembahasan berlapis. Benar: penjelasan, cara berpikir, jebakan, urutan eksekusi, query pembanding. Salah: diagnosis terarah dari pesan error SQLite nyata dan perbandingan struktur dengan jawaban baku (kata kunci yang kurang atau berlebih); jawaban baku TIDAK ditampilkan. 26 konsep punya catatan. `tests/test-sql-pembahasan.mjs` (1040 pengecekan) menguji pada mesin SQLite sungguhan, termasuk klaim perilaku (= vs LIKE, BETWEEN inklusif, UNION, RANK, kolom non-agregat).
- Tes baru terdaftar di `npm test` tiap app dan di CI.

## Fase 4 — Verifikasi angka terhadap mesin
- `tests/test-pembahasan-angka.mjs` (50 pengecekan, di CI): contoh hitung di materi/pembahasan dicocokkan dengan `apps/spt/js/shared/tax-engine.js` yang dipakai aplikasi, dan dicek benar-benar tertulis di teks materi (PPh 21 masa Desember, tarif progresif, final UMKM, Pasal 31E, PTKP, PPN 12% × 11/12, PPh 23, pembetulan SPT, penyusutan fiskal, rekonsiliasi, serta contoh penyusutan/piutang/jurnal penyesuaian dan laporan keuangan CV Mitra Sejahtera di Accounting).
- Temuan: contoh PPh 21 masa Desember memakai Jan–Nov "ilustrasi" Rp5.940.000. Mesin TER menunjukkan tarif kategori A untuk bruto Rp12.000.000 adalah 4% (Rp480.000/bulan), sehingga Jan–Nov = Rp5.280.000 dan PPh Desember = Rp1.320.000 (bukan Rp660.000). Materi sudah diganti dengan angka dari mesin.

## Fase 5 — Pemeliharaan
- `scripts/regulasi-terpantau.json` (50 entri): daftar terpusat regulasi yang dirujuk, dengan `status` (berlaku/diubah/historis/dicabut), tingkat `verifikasi` (teks-resmi / sumber-sekunder / pengetahuan-umum), `terakhirDicek`, dan catatan. Saat ini **tidak ada** regulasi yang diverifikasi dari teks resminya.
- `scripts/check-staleness.mjs` + `scripts/lib/regulasi.mjs`: rujukan baru yang belum terdaftar menggagalkan CI; laporan umur verifikasi; `--fail-on-stale` untuk jadwal bulanan. `tests/test-regulasi.mjs` (33 pengecekan, termasuk simulasi +8 bulan).
- `.github/workflows/materi-review.yml`: pengingat terjadwal tanggal 1 tiap bulan (gagal bila ada yang > 6 bulan).
- `docs/PEMELIHARAAN-MATERI.md`: alur tinjau 8 langkah, urutan prioritas verifikasi, aturan menulis materi baru.
- Temuan saat pemindaian rujukan: ringkasan topik "PPh Final" di `modul_pajak` masih menulis UMKM menurut PP 23/2018 (maks. 7 tahun), dividen "PP 19/2009 10%", dan deposito tanpa catatan. Diperbarui: UMKM menurut PP 55/2022 s.t.d.d. PP 20/2026; dividen OP DN 10% final kecuali diinvestasikan di dalam negeri (PMK 18/2021); deposito umumnya 20% dengan tarif lebih rendah pada kondisi tertentu. Detail PP 131/2000 dan PP 9/2022 (jasa konstruksi) belum diverifikasi.

## Status cakupan sumber (per `check-knowledge.mjs`)
| Modul | Subbab | Bersumber | Dikecualikan | Ditinjau |
|---|---|---|---|---|
| SPT | 32 | 27 | 5 | 25 |
| Accounting | 12 | 11 | 1 | 8 |
| Excel | 28 | 26 | 2 | 1 |
| SQL & PQ | 11 | 10 | 1 | 4 |

## Perlu dicek manual oleh pengembang materi
- Teks resmi PP 20/2026 belum dibuka langsung; ringkasan diambil dari DJP/IKPI/DDTC (batas waktu OP & PT Perorangan, isi Pasal II peralihan).
- Nomor pasal yang berasal dari pengetahuan umum diberi catatan di field `note` (mis. UU PPh Pasal 2/3/12 KUP, PSAK 201 para 27, PPh Pasal 26 20%, Pasal 6 ayat (2) dan 9 ayat (1) UU PPh, Pasal 6 ayat (1) huruf h).
- Tenggat SP2DK 14+7 hari dari pemberitaan, bukan teks PMK 111/2025.
- Rujukan Microsoft/SQLite tanpa tautan hanya menunjuk dokumentasi resmi dan bertanda "belum ditinjau baris per baris".
- Contoh tarif bunga sanksi (1,02%, September 2026) berubah tiap bulan.
- Pembahasan Isi Formulir: nomor pasal (Pasal 14 NPPN, Pasal 29, Pasal 7 PTKP, PP 60/2010 zakat) dari pengetahuan umum; rumus Pasal 31E dari ringkasan DJP. Catatan SQL: perilaku dialek lain (PostgreSQL, SQL Server, MySQL) tidak diuji.
- Pembahasan `tax_career`: PMK-02/PMK.03/2010 (daftar nominatif), PMK 242/PMK.03/2014 (batas setor tanggal 10 dan lapor tanggal 20), Pasal 9 ayat (1) dan Pasal 18 ayat (3) UU PPh berasal dari pengetahuan umum; tenggat SP2DK 14+7 hari dari pemberitaan.
- Pembahasan pajak daerah (PBJT, reklame, hiburan, PBB-P2, BPHTB) mengikuti UU HKPD; ketentuan Perda per daerah bisa berbeda. Status penerapan pajak karbon belum diverifikasi di sesi ini.
- Pembahasan soal PBB-P3 (pusat) dan fungsi meterai diverifikasi dengan sumber sekunder (Ortax, DDTC, online-pajak, Kemenkeu) dan abstrak UU 10/2020 di JDIH BPK.
