# Status Tahap 2 — Level 2 (Logika, COUNTIF/SUMIF, Teks, Tanggal)

Tahap 2 memperdalam mesin rumus di atas fondasi Tahap 1 (lihat `STATUS-TAHAP-1.md`) dan mengaktifkan **Level 2 — Dasar** secara penuh: IF, AND, OR, NOT, IFERROR, COUNTIF, SUMIF, 12 fungsi teks, dan 8 fungsi tanggal — semuanya benar-benar dihitung di browser, bukan tempelan/hardcode.

## 1. File yang Dibuat / Diubah

| File | Perubahan |
|---|---|
| `js/spreadsheet-engine.js` | **Perluasan besar.** Menambah mesin ekspresi baru (`evaluateExpression`, `evaluateCondition`, `evaluateCall`) untuk fungsi logika/teks/tanggal, plus agregasi bersyarat (`COUNTIF`/`SUMIF`). `splitArgs` diperbarui agar sadar kedalaman tanda kurung (mendukung fungsi bersarang seperti `IF(AND(...),...)`). Menambah util tanggal (`dateToSerial`/`serialToDate`/`formatSerialAsDate`). **Fungsi Level 1 (SUM/AVERAGE/MIN/MAX/COUNT) tidak diubah sama sekali** — sudah diverifikasi lewat uji regresi. |
| `js/dataset-generator.js` | Kolom Tanggal kini disimpan sebagai *serial number* bergaya Excel (bukan string "DD/MM/YYYY"), agar fungsi tanggal bisa menghitungnya seperti Excel asli. |
| `js/question-generator.js` | Menambah `generateLevel2Question()` dengan 6 tipe soal: IF, COUNTIF, SUMIF, LEFT, MONTH, DATEDIF. |
| `js/formula-validator.js` | Perbandingan hasil kini **sadar-tipe** (angka vs teks). Menambah mode pemeriksaan referensi PERSIS (`question.requiredRefs`) untuk soal per-baris (IF/LEFT/MONTH/DATEDIF), selain mode "menyentuh kolom" yang sudah ada untuk soal agregat. |
| `js/progress-manager.js` | Menambah badge **Formula Explorer** dan **Logic Expert**; badge **SUM Master** diperketat agar benar-benar menghitung jawaban benar dari fungsi agregasi Level 1 saja (bukan sembarang 5 jawaban benar, karena sekarang ada Level 2 juga). |
| `js/app.js` | Level 2 diaktifkan di navigasi. `startNewQuestion()` memilih generator soal sesuai level aktif. Tampilan sel & panel hasil kini sadar-tipe (menampilkan teks apa adanya, bukan memaksa format angka) dan kolom Tanggal ditampilkan sebagai DD/MM/YYYY meski tersimpan sebagai angka. Berpindah level otomatis membersihkan soal yang sedang berjalan. |
| `data/formula-catalog.json` | Menambah 27 entri rumus Tahap 2 (Logika, Matematika-Agregasi bersyarat, Teks, Tanggal) — **diverifikasi otomatis** bahwa setiap nama fungsi di katalog benar-benar dikenali mesin, tidak ada klaim rumus yang sebenarnya belum didukung. |
| `index.html` | Chip level pada panel soal diberi `id` agar bisa diperbarui dinamis (Level 1/Level 2) oleh `app.js`. |

## 2. Fitur yang Sudah Berfungsi (Bisa Diuji Langsung)

| Fitur | Detail |
|---|---|
| Level 2 aktif di navigasi | Tidak lagi berlabel "Segera"; bisa dipilih dan langsung menghasilkan soal |
| Soal IF | Soal per-baris nyata (bukan agregat): "baris data ke-N... IF menghasilkan teks X atau Y" |
| Soal COUNTIF | Menghitung transaksi berdasarkan Wilayah (nilai kriteria diambil dari data asli, bukan hardcode) |
| Soal SUMIF | Menjumlahkan Total Penjualan berdasarkan Kategori |
| Soal LEFT | Mengambil prefix Kode Produk pada baris tertentu |
| Soal MONTH | Mengambil bulan dari tanggal transaksi baris tertentu |
| Soal DATEDIF | Menghitung selisih hari antar dua tanggal transaksi |
| Rumus bersarang | `=IF(AND(H2>5,I2>1000),"Besar","Kecil")` dihitung dengan benar (diuji) |
| Kriteria tidak case-sensitive | `"jawa barat"` dan `"Jawa Barat"` dianggap sama pada COUNTIF/SUMIF/IF |
| Toleransi rumus alternatif | Logika terbalik yang hasilnya identik tetap diterima (mis. `IF(x<batas,...)` vs `IF(x>=batas,...)` dengan cabang ditukar) |
| Penolakan fungsi salah | Memakai `MID` pada soal LEFT ditolak dengan pesan spesifik, meski hasilnya kebetulan sama |
| Penolakan referensi salah | Merujuk baris yang salah pada soal IF/LEFT/MONTH/DATEDIF ditolak dengan pesan yang menyebutkan sel mana yang seharusnya dipakai |
| Tampilan tanggal | Kolom Tanggal tetap tampil "DD/MM/YYYY" di grid meski tersimpan sebagai serial number secara internal |
| Hasil rumus berupa teks | Panel evaluasi & sel menampilkan teks apa adanya (bukan dipaksa jadi angka/NaN) |
| Badge baru | **Formula Explorer** (5 fungsi berbeda dikuasai) dan **Logic Expert** (5 jawaban benar dari IF/AND/OR/NOT/COUNTIF/SUMIF) |
| Berpindah level | Otomatis membersihkan soal & sel jawaban yang sedang berjalan, tidak ada state nyangkut |

## 3. Cara Menguji

1. Jalankan lewat server lokal seperti biasa (lihat `README.md`).
2. Buat dataset Penjualan (seperti Tahap 1).
3. Di sidebar, klik **Level 2 — Dasar**. Klik **Mulai Latihan** — perhatikan chip level di panel soal berubah jadi "Level 2".
4. Coba tiap jenis soal (klik **Soal Berikutnya** berkali-kali untuk memutar ke jenis lain — IF, COUNTIF, SUMIF, LEFT, MONTH, DATEDIF akan muncul bergantian):
   - **IF**: ketik rumus IF sesuai instruksi (referensi sel dan ambang batas sudah ditampilkan di teks soal), tekan Enter, klik **Periksa Jawaban**.
   - **COUNTIF/SUMIF**: perhatikan rentang kolom yang relevan (Wilayah/Kategori) dari header, tulis rentang & kriteria sesuai instruksi.
   - **LEFT**: sel sumber (Kode Produk) sudah ditunjuk dalam instruksi soal — coba juga jawab pakai `MID` untuk memastikan ditolak dengan pesan yang jelas.
   - **MONTH/DATEDIF**: perhatikan kolom Tanggal di grid sudah tampil format DD/MM/YYYY.
5. Coba sengaja menjawab dengan rumus yang merujuk baris berbeda dari yang diminta — pastikan pesan penolakan menyebutkan sel yang benar.
6. Kumpulkan beberapa jawaban benar dari fungsi berbeda-beda (SUM, COUNTIF, LEFT, dst.) dan pastikan badge **Formula Explorer** muncul setelah 5 fungsi berbeda; kumpulkan 5 jawaban benar dari IF/COUNTIF/SUMIF untuk memicu **Logic Expert**.
7. Berpindah antara Level 1 ↔ Level 2 di sidebar saat sedang mengerjakan soal — pastikan soal lama hilang bersih, bukan nyangkut.

**Pengujian logika otomatis** (Node.js, tanpa browser) yang sudah dijalankan dan lulus:
- 32/32 fungsi rumus dievaluasi sesuai definisi Excel yang sebenarnya (termasuk fungsi bersarang, DATEDIF lintas bulan/tahun, SUBSTITUTE dengan instance tertentu, dll.) — lihat detail kasus uji di riwayat pengembangan.
- Verifikasi silang otomatis: seluruh 32 nama fungsi di `formula-catalog.json` dikenali oleh mesin (tidak ada rumus yang "terdaftar" tapi sebenarnya belum bisa dihitung).
- Regresi Level 1: 15/15 soal Level 1 pada engine yang sudah diperluas tetap menghasilkan "benar" — fungsi Level 1 tidak rusak oleh perluasan Tahap 2.
- End-to-end Level 2: 30/30 percobaan (kombinasi 6 jenis soal × jawaban benar & jawaban salah sengaja) menghasilkan status yang sesuai harapan.
- Regresi gabungan penuh: 60/60 percobaan campuran Level 1 + Level 2 pada 3 dataset dengan seed berbeda — seluruhnya benar.
- Kasus tepi diuji manual: logika IF terbalik (diterima), fungsi pengganti yang tidak sesuai (ditolak), referensi sel salah (ditolak dengan pesan spesifik), kriteria huruf kecil (diterima), sel jawaban kosong (pesan jelas).

## 4. Bug / Keterbatasan yang Diketahui

- **WEEKDAY hanya mendukung tipe default Excel** (tipe 1: 1=Minggu...7=Sabtu). Tipe 2/3 (mulai dari Senin) belum didukung — jarang dipakai di modul dasar, akan ditambah bila dibutuhkan.
- **Argumen sekunder yang gagal dihitung pada beberapa fungsi teks (mis. `n` pada LEFT/RIGHT) diam-diam dianggap kosong/0, bukan menampilkan error eksplisit.** Ini menyederhanakan implementasi tapi berarti kesalahan pada argumen opsional tidak selalu memunculkan pesan sejelas kesalahan pada argumen utama. Perilaku ini tidak mempengaruhi soal-soal yang dibuat otomatis (selalu memberi argumen valid), hanya relevan jika pengguna bereksperimen bebas di luar soal.
- **DATEDIF mengharuskan tanggal_akhir tidak lebih awal dari tanggal_mulai** (sesuai perilaku asli Excel yang menghasilkan error `#NUM!` pada kondisi ini) — validator kami mengembalikan pesan error yang jelas untuk kasus ini, bukan angka negatif yang menyesatkan.
- **Fungsi Level 2 belum tersedia untuk dataset selain Penjualan** (karena dataset lain memang belum dibangun — lihat Tahap 1). `generateLevel2Question()` sudah ditulis agar builder soal individual mengembalikan `null` jika kolom yang dibutuhkan tidak ada, sehingga siap diperluas ke dataset lain nanti tanpa perombakan.
- **Ambang batas soal IF dihitung otomatis dari rata-rata data** (dibulatkan ke ratusan ribu terdekat) — pada dataset yang sangat kecil (mis. hanya 2-3 baris) atau dengan nilai yang seragam, ambang batas ini berpotensi kurang variatif. Tidak menimbulkan jawaban salah, hanya soal yang kurang "menantang" secara pedagogis pada kasus ekstrem tersebut.
- **AND/OR/NOT belum diberi soal generator khusus** — mesin sudah mendukung penuh (dan bisa dipakai bersarang di dalam soal IF), tapi belum ada TIPE SOAL yang secara eksplisit meminta jawaban akhir berupa AND/OR/NOT saja. Bisa ditambah cepat pada tahap berikutnya bila diinginkan.
- Sama seperti Tahap 1: belum diuji pada browser sungguhan (lingkungan pengembangan ini tidak memiliki browser). Seluruh verifikasi dilakukan lewat simulasi logika Node.js yang ekstensif (lihat bagian 3) plus pemeriksaan aset lewat server HTTP lokal. Mohon dicoba langsung di browser, terutama alur mengetik rumus bersarang seperti `IF(AND(...))` di formula bar.

## 5. Rencana Tahap Berikutnya (usulan, menunggu konfirmasi Anda)

- Level 3: SUMIFS, COUNTIFS, IF bertingkat (nested IF), VLOOKUP, INDEX-MATCH.
- Dataset Akuntansi, Karyawan/HR, dan Persediaan.
- Panel referensi/daftar rumus berbasis `formula-library.js` (32 entri sudah siap dipakai).
- Undo/Redo, Copy Formula, Fill Handle pada spreadsheet.
- Mode Ujian, Ekspor CSV & XLSX.
