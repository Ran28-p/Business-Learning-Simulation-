# Status Tahap Interaktivitas Excel Nyata

Permintaan tahap ini: *"kembangkan lagi, terutama pada apps excel, buat seperti excel yang nyata, yang interaktif ketika kita mengisi rumus."* Tahap ini tidak menambah level/soal baru — fokusnya membuat **pengalaman mengetik & mengisi rumus di spreadsheet interaktif terasa seperti Microsoft Excel sungguhan**, di atas mesin rumus & alur soal yang sudah ada (Level 1-3).

## 1. File yang Dibuat / Diubah

| File | Perubahan |
|---|---|
| `js/formula-interactivity.js` | **Baru.** Modul terpisah (~740 baris) khusus interaksi pengeditan rumus — lihat detail fitur di bagian 2. Dipisah dari `app.js` (bukan ditambahkan ke sana) karena isinya murni interaksi DOM level-rendah (drag mouse, posisi kursor teks, overlay mengambang) yang berbeda sifat dari orkestrasi state aplikasi. Modul ini **tidak pernah** mengubah grid langsung — semua penulisan sel tetap lewat `commitCell()` milik `app.js`, persis seperti mengetik manual, supaya validator jawaban & pelacakan progres tidak perlu tahu apa-apa soal fitur baru ini. |
| `js/spreadsheet-engine.js` | Menambah penjagaan **referensi melingkar** pada `getCellValue()` (mis. `A1="=SUM(B1)"` dan `B1="=SUM(A1)"`) — sebelum tahap ini rumus hanya boleh ada di sel jawaban tunggal sehingga siklus nyaris mustahil; sekarang rumus boleh ada di sel mana pun (lewat pengetikan bebas atau fill handle) sehingga siklus jadi mungkin dan **wajib** dicegah agar tidak nge-hang browser. Menambah `adjustFormulaRefs()` — fungsi murni yang menggeser referensi sel sebuah rumus secara relatif, menghormati `$` absolut/campuran, dipakai fill handle. Fungsi Level 1-3 yang sudah ada **tidak diubah**, diverifikasi lewat uji regresi (lihat bagian 3). |
| `js/app.js` | 3 titik integrasi kecil ditambahkan: import + panggilan `initFormulaInteractivity()` di `init()`, dan satu baris pemanggilan hook (`onActiveCellChanged`/`onCellCommitted`/`onGridRendered`) di masing-masing `setActiveCell()`, `commitCell()`, dan `renderSpreadsheetTable()`. Tidak ada logika lain yang diubah. |
| `css/style.css` | Ditambah ~100 baris gaya baru: overlay formula bar berwarna, kotak highlight referensi pada sel grid, fill handle, pratinjau saat drag (point-mode & fill), dan popup autocomplete/petunjuk argumen. `.spreadsheet-scroll` diberi `position: relative` (jangkar untuk elemen yang mengambang di atas grid). |
| `tests/test-engine-additions.mjs` | **Baru.** Pengujian Node.js murni untuk `adjustFormulaRefs()`, penjagaan referensi melingkar, dan regresi fungsi Level 1-3. |
| `tests/test-formula-interactivity.mjs` | **Baru.** Pengujian Node.js murni (tanpa DOM) untuk analisis pewarnaan referensi, pemisahan literal string, dan logika petunjuk argumen/autocomplete. |
| `tests/test-formula-interactivity.dom.mjs` | **Baru.** Pengujian lewat [jsdom](https://github.com/jsdom/jsdom) yang men-simulasikan klik/drag/keydown SUNGGUHAN pada fixture DOM — lihat bagian 3 untuk cara menjalankan (opsional, hanya untuk pengembangan). |
| `package.json` | **Baru.** Hanya untuk menjalankan `tests/` (`npm test`, atau `npm install jsdom --no-save` untuk tes DOM). Aplikasinya sendiri **tidak butuh** `npm install` sama sekali — tetap murni HTML/CSS/JS, tanpa build process, sesuai batasan proyek dari awal. |
| `README.md` | Struktur proyek & bagian "Pengujian Otomatis" diperbarui agar sesuai isi repo saat ini. |

## 2. Fitur yang Sudah Berfungsi (Bisa Diuji Langsung)

| Fitur | Detail |
|---|---|
| **Mode point-klik** | Sedang mengetik rumus (di formula bar ATAU langsung di sel) → klik sel lain di grid **menyisipkan referensinya** ke titik kursor, bukan memindahkan sel aktif. Klik-**geser** menghasilkan rentang (`A2:A10`), sama seperti drag-select Excel asli. |
| **Highlight referensi berwarna** | Setiap referensi berbeda pada rumus yang sedang diketik diberi warna berbeda di formula bar (biru, oranye, hijau, ungu, dst., mengulang), dan sel yang dirujuk di grid diberi kotak warna yang sama. Referensi yang sama munculnya berkali-kali (mis. `IF(A2>5,A2,B2)`) tetap memakai satu warna yang sama. Literal string (`"Elektronik"`) tidak ikut dianggap referensi meski terlihat mirip. |
| **Fill handle** | Kotak kecil hijau di pojok kanan-bawah sel aktif (hanya muncul untuk sel yang bisa diedit). Diseret ke bawah/atas/kanan/kiri untuk menyalin isi sel ke sel-sel yang dilewati — kalau isinya rumus, referensi relatif otomatis bergeser (`=SUM(A2:C2)` di baris 1 menjadi `=SUM(A3:C3)` di baris 2), referensi yang diberi `$` (absolut/campuran) **tidak** ikut bergeser. Berhenti otomatis begitu mengenai sel terkunci (data/header), tidak menimpanya. |
| **Autocomplete fungsi** | Mengetik `=SU` menampilkan daftar fungsi yang cocok dari `data/formula-catalog.json` (nama + sintaks singkat), dinavigasi dengan panah atas/bawah, dikonfirmasi dengan Enter/Tab/klik, dibatalkan dengan Escape. |
| **Petunjuk argumen** | Berada di dalam tanda kurung sebuah fungsi (mis. sudah mengetik `=SUMIF(C2:C4,` dan menunggu argumen ke-2) menampilkan sintaks lengkap fungsi tersebut dengan argumen yang sedang diisi **ditebalkan**, plus deskripsi singkat dari katalog. |
| **Referensi melingkar aman** | Rumus yang saling merujuk (baik sengaja diketik maupun tidak sengaja lewat fill handle) tidak lagi membuat tab browser hang — dihitung sebagai nilai kosong, bukan rekursi tak berhingga. |
| **Sel yang bergantung ikut ter-refresh** | Kalau sel B berisi rumus yang merujuk sel A, dan A diubah (lewat ketik manual atau fill), tampilan B ikut diperbarui otomatis tanpa perlu klik ulang — dilacak lewat set alamat sel berumus, jadi tetap ringan walau datasetnya besar. |

## 3. Cara Menguji

**Di browser** (jalankan lewat server lokal seperti biasa, lihat `README.md`):
1. Buat dataset apa pun, mulai latihan seperti biasa agar grid terisi.
2. Klik sel kosong yang bisa diedit, ketik `=SUM(` — **jangan** tekan Enter dulu — lalu klik salah satu sel data. Referensinya harus tersisip otomatis ke formula bar & ke dalam sel, dan sel yang diklik harus mendapat kotak warna.
3. Ulangi tapi kali ini klik-**geser** dari satu sel data ke sel lain sedikit di bawahnya — harus menghasilkan rentang seperti `A2:A5`, bukan referensi tunggal.
4. Selesaikan rumus, tekan Enter. Klik kembali sel itu (jadi sel aktif) — perhatikan kotak kecil hijau di pojok kanan-bawah sel. Seret ke bawah 2-3 baris, lepas — sel-sel di bawahnya harus terisi hasil salinan rumus dengan referensi baris yang sudah bergeser (cek isinya di formula bar satu per satu).
5. Ketik `=SU` di sel kosong lain — daftar saran fungsi harus muncul di bawah sel; coba panah bawah lalu Enter untuk memastikan salah satu tersisip dengan benar (`SUM(`).
6. Ketik rumus dengan beberapa argumen (mis. `=SUMIF(A2:A5,`) dan perhatikan muncul petunjuk sintaks dengan argumen yang sedang diisi ditebalkan.
7. **Uji keamanan referensi melingkar (opsional, agak teknis):** di dua sel kosong yang bertetangga, ketik `=SUM(` lalu arahkan salah satunya ke sel yang lain sehingga saling merujuk — pastikan browser **tidak macet/hang**.

**Pengujian logika otomatis** (Node.js, tanpa browser) yang sudah dijalankan dan lulus — **59/59 pengujian**:
- `node tests/test-engine-additions.mjs` — **20/20 lulus**: penyesuaian referensi fill handle (termasuk `$` absolut/campuran, literal string yang tidak ikut tergeser, kolom multi-huruf, clamp di batas atas grid), penjagaan referensi melingkar (langsung & rantai-tidak-melingkar 10 tingkat tetap benar), plus regresi SUM/AVERAGE/COUNTIF/SUMIF/IF(AND(...))/VLOOKUP.
- `node tests/test-formula-interactivity.mjs` — **21/21 lulus**: pemisahan literal string, analisis pewarnaan referensi (termasuk referensi berulang memakai warna yang sama, literal string tidak dianggap referensi), pencarian fungsi yang mengurung posisi kursor (termasuk fungsi bersarang & koma di dalam literal string), pemisahan sintaks argumen.
- `node tests/test-formula-interactivity.dom.mjs` (butuh `npm install jsdom --no-save` sekali) — **18/18 lulus**: simulasi mouse/keyboard SUNGGUHAN — highlight referensi di grid nyata, mode point-klik (klik tunggal & drag-range), fill handle end-to-end (termasuk berhenti di sel terkunci), autocomplete + konfirmasi Enter, dan referensi melingkar lewat fill tidak hang (< 500ms).
- Ditemukan & diperbaiki lewat pengujian ini (bukan cuma lolos di percobaan pertama): bug urutan event (listener keydown untuk autocomplete awalnya terpasang di elemen yang salah sehingga bisa kalah cepat dengan handler navigasi sel bawaan — diperbaiki dengan memasangnya di `document` pada tahap capture), dan overlay formula bar yang tidak ikut bergeser saat rumus panjang di-scroll secara internal oleh browser (diperbaiki dengan sinkronisasi `scrollLeft`).

## 4. Bug / Keterbatasan yang Diketahui

- **Highlight referensi melingkar tidak menampilkan pesan `#SIRK!` yang eksplisit** — sel yang terlibat siklus akan tampil kosong/0 tergantung fungsinya, BUKAN pesan khusus. Yang terpenting (browser tidak hang) sudah terjamin; pesan error yang lebih ramah bisa ditambah di tahap berikutnya kalau dibutuhkan.
- **Highlight warna di dalam sel kecil di grid tidak ada** (hanya kotak warna di sekeliling sel, bukan teks berwarna seperti di formula bar) — teks rumus berwarna hanya diterapkan pada formula bar. Ini keputusan sengaja demi kesederhanaan & performa (menyinkronkan overlay berwarna pada puluhan/ratusan sel kecil yang terus berubah ukuran akan jauh lebih rumit & rawan glitch visual dibanding satu formula bar yang ukurannya tetap).
- **Rentang referensi sangat besar** (lebih dari ~300 sel, mis. `=SUM(A2:A5000)` pada dataset raksasa) hanya disorot pada sel pertama & terakhir, bukan seluruhnya — supaya tidak melakukan ratusan/ribuan query DOM setiap ketikan. Rumusnya tetap dihitung benar, ini murni soal tampilan highlight.
- **Fill handle hanya menyalin nilai apa adanya untuk sel bukan-rumus** (tidak ada deteksi pola deret seperti "Januari, Februari, ..." atau "1, 2, 3, ..." ala Excel asli yang butuh 2 sel sumber terpilih). Untuk rumus, penggeseran referensi relatif sudah bekerja penuh.
- **Autocomplete & petunjuk argumen memakai pencocokan awalan sederhana** (`SU` cocok dengan semua fungsi yang diawali "SU"), bukan pencocokan cerdas/typo-tolerant.
- Sama seperti tahap-tahap sebelumnya: **belum diuji pada browser sungguhan** (lingkungan pengembangan ini tidak memiliki browser nyata). Kali ini verifikasi jauh lebih dalam dari sebelumnya — memakai jsdom untuk mensimulasikan DOM & event mouse/keyboard sungguhan (bukan cuma logika murni) — tapi jsdom tetap bukan browser asli (tidak ada rendering visual sungguhan, `elementFromPoint` di-stub manual dalam tes karena jsdom tidak melakukan layout). **Mohon dicoba langsung di browser** sebelum dipakai siswa, terutama alur klik-geser (point-mode & fill handle) yang paling bergantung pada koordinat mouse sungguhan.

## 5. Rencana Tahap Berikutnya (usulan, menunggu konfirmasi Anda)

- Pesan error `#SIRK!` (atau serupa) yang eksplisit untuk sel yang terlibat referensi melingkar, bukan sekadar tampil kosong.
- Copy-paste (Ctrl+C/Ctrl+V) dengan penyesuaian referensi relatif, mengikuti pola yang sama dengan fill handle.
- Deteksi pola deret sederhana pada fill handle (angka berurutan, nama bulan/hari) ketika 2+ sel sumber dipilih.
- Toolbar format angka dasar (mata uang, persen, jumlah desimal) — di luar cakupan "interaktivitas rumus" tapi sering diminta berdampingan.
