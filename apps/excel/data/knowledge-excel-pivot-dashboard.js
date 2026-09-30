/**
 * Konten Modul Pengetahuan — Excel: Pivot Table & Dashboard.
 * Dipakai lewat: KnowledgeBase.open(window.KNOWLEDGE_CONTENT_EXCEL_PIVOT_DASHBOARD)
 * Latihan interaktifnya sendiri (bukan cuma teori) ada di apps/excel/pivot-dashboard/,
 * dibangun dengan engine HyperFormula — modul ini adalah bacaan pendampingnya.
 */
window.KNOWLEDGE_CONTENT_EXCEL_PIVOT_DASHBOARD = {
  title: 'Pivot Table & Dashboard',
  subtitle: 'Modul Pengetahuan — Excel Formula Practice Generator',
  appAccent: '#1D6F42',
  chapters: [
    {
      id: 'pivot-table',
      title: '1. Pivot Table',
      sections: [
        {
          id: 'apa-itu-pivot',
          heading: '1.1 Apa Itu Pivot Table dan Kapan Memakainya',
          body: `
<p class="kb-lead">Pivot Table adalah fitur Excel untuk meringkas, mengelompokkan, dan menganalisis data mentah dalam jumlah besar menjadi tabel ringkas yang mudah dibaca — tanpa perlu menulis satu pun rumus manual.</p>
<p>Bayangkan kamu punya 1.000 baris data transaksi penjualan (tanggal, wilayah, produk, jumlah). Untuk tahu "total penjualan per wilayah" secara manual, kamu perlu menulis SUMIF untuk tiap wilayah satu per satu. Pivot Table melakukan ini otomatis — cukup <em>drag-and-drop</em> nama field ke area Baris, Kolom, atau Nilai.</p>
<div class="kb-tip"><span class="kb-callout-title">💡 Kapan Memakai Pivot Table</span>Gunakan Pivot Table ketika: (1) data mentah berjumlah banyak baris, (2) kamu perlu meringkas berdasarkan kategori (wilayah, produk, bulan, dll), dan (3) kamu ingin bisa cepat mengubah sudut pandang ringkasan tanpa menulis ulang rumus.</div>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Buka menu <strong>"2. Pivot Table"</strong> pada latihan interaktif Pivot Table &amp; Dashboard di aplikasi ini. Lihat tabel data mentahnya di tab "1. Data Sumber" — perhatikan setiap barisnya adalah satu transaksi, persis seperti contoh 1.000 baris di atas (bedanya di sini datanya 180-an baris supaya ringan dipraktikkan).</div>`
        },
        {
          id: 'cara-membuat-pivot',
          heading: '1.2 Cara Membuat Pivot Table dari Data Mentah',
          body: `
<p class="kb-lead">Di Excel asli, langkah-langkahnya adalah:</p>
<ol>
<li>Pastikan data mentah punya <strong>header di baris pertama</strong> dan tidak ada baris/kolom kosong di tengah tabel.</li>
<li>Klik salah satu sel di dalam data, lalu buka menu <strong>Insert → PivotTable</strong>.</li>
<li>Excel otomatis mendeteksi rentang data — konfirmasi rentangnya sudah benar, lalu pilih lokasi output (worksheet baru direkomendasikan untuk pemula).</li>
<li>Di panel <strong>"PivotTable Fields"</strong> yang muncul di sisi kanan, kamu akan melihat daftar semua nama kolom sebagai field yang bisa di-drag.</li>
<li><strong>Drag field ke salah satu dari 4 area:</strong>
  <ul>
    <li><strong>Rows (Baris)</strong> — kategori yang jadi baris tabel ringkasan (mis. Wilayah).</li>
    <li><strong>Columns (Kolom)</strong> — kategori yang jadi kolom tabel ringkasan (mis. Kategori Produk).</li>
    <li><strong>Values (Nilai)</strong> — angka yang dihitung/diringkas (mis. Total Penjualan), defaultnya di-Sum.</li>
    <li><strong>Filters (Filter)</strong> — kategori tambahan untuk menyaring seluruh tabel (mis. hanya tampilkan Bulan tertentu).</li>
  </ul>
</li>
<li>Pivot Table langsung terisi otomatis begitu field di-drag — tidak perlu klik "Generate" atau semacamnya.</li>
</ol>
<div class="kb-formula">Konsep di baliknya: setiap sel Pivot Table = SUMIFS(kolom_nilai, kolom_baris, "kategori_baris", kolom_kolom, "kategori_kolom")</div>
<p>Memahami rumus konseptual di atas sangat membantu — Pivot Table sebenarnya "hanya" menjalankan banyak SUMIFS otomatis di belakang layar untuk setiap kombinasi baris × kolom.</p>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Di latihan interaktif, dropdown "Baris", "Kolom", dan "Nilai" pada tab "2. Pivot Table" persis meniru drag-and-drop field di Excel asli. Coba atur Baris = Wilayah, Kolom = Kategori Produk, Nilai = Total, lalu klik "Buat/Perbarui Pivot" — dan lihat kotak pratinjau formula di bawahnya untuk melihat formula SUMIFS sungguhan yang dijalankan oleh engine HyperFormula.</div>`
        },
        {
          id: 'grouping-filtering',
          heading: '1.3 Grouping, Filtering, dan Calculated Fields',
          body: `
<p class="kb-lead"><strong>Grouping</strong> — mengelompokkan nilai mentah menjadi kategori yang lebih besar. Contoh paling umum: mengelompokkan tanggal transaksi menjadi Bulan atau Kuartal (klik kanan pada sel tanggal di area Rows → <em>Group</em> → pilih "Months"/"Quarters"). Ini menghindari Pivot Table menampilkan ratusan baris tanggal individual yang tidak informatif.</p>
<p><strong>Filtering</strong> — ada dua cara: (1) drag field ke area <em>Filters</em> untuk menyaring seluruh Pivot Table, atau (2) klik ikon dropdown pada header Rows/Columns untuk menyaring nilai tertentu saja (mis. hanya tampilkan 3 wilayah tertentu, sembunyikan sisanya) tanpa menghapus data aslinya.</p>
<p><strong>Calculated Field</strong> — kolom hasil hitungan baru yang dibuat di dalam Pivot Table itu sendiri (menu <em>PivotTable Analyze → Fields, Items & Sets → Calculated Field</em>), misalnya menghitung "Margin %" dari Laba dibagi Penjualan, padahal kolom "Margin %" tidak ada di data mentah aslinya.</p>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Hati-Hati dengan Calculated Field</span>Calculated Field menghitung berdasarkan <em>total hasil agregasi</em>, bukan baris per baris — untuk rasio seperti margin %, ini biasanya benar. Tapi untuk perhitungan yang butuh urutan operasi berbeda (misalnya rata-rata dari rata-rata), hasilnya bisa menyesatkan. Kalau ragu, lebih aman menghitung kolom tambahan di data mentah sebelum masuk ke Pivot Table.</div>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Pada latihan interaktif, coba ganti Agregasi menjadi "Count" — ini adalah bentuk sederhana dari mengubah cara Pivot Table meringkas data, mirip konsep di balik grouping/filtering: kamu mengontrol <em>bagaimana</em> data diringkas, bukan hanya <em>apa</em> yang diringkas.</div>`
        },
        {
          id: 'multiple-values-layout',
          heading: '1.4 Multiple Value Fields dan Layout Pivot Table',
          body: `
<p class="kb-lead">Pivot Table tidak dibatasi hanya satu kolom Values — kamu bisa drag beberapa field sekaligus ke area Values, misalnya "Total Penjualan" (Sum) <em>dan</em> "Jumlah Transaksi" (Count) dalam satu Pivot Table yang sama. Excel otomatis menambah level kolom baru untuk menampung tiap value field.</p>
<p>Untuk value field yang sama, kamu juga bisa mengubah cara agregasinya lewat <em>Value Field Settings</em>: Sum, Count, Average, Max, Min, Product, dst. Bahkan bisa menampilkan nilai sebagai <strong>"% of Grand Total"</strong> atau <strong>"% of Column Total"</strong> lewat opsi "Show Values As" — sangat berguna untuk melihat kontribusi proporsional tiap kategori.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Layout</th><th>Kapan Dipakai</th></tr></thead>
<tbody>
<tr><td><strong>Compact Form</strong> (default)</td><td>Hemat tempat, cocok untuk laporan ringkas dengan banyak level field.</td></tr>
<tr><td><strong>Outline Form</strong></td><td>Menampilkan tiap field di kolom terpisah — cocok untuk analisis mendetail per level.</td></tr>
<tr><td><strong>Tabular Form</strong></td><td>Mirip tabel data biasa, paling mudah dibaca ulang sebagai data mentah baru (bisa di-copy ke sumber lain).</td></tr>
</tbody>
</table></div>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Latihan interaktif di aplikasi ini sengaja disederhanakan menjadi satu Value field agar konsepnya jelas dulu. Setelah nyaman dengan itu, coba praktikkan multiple value fields langsung di Excel/Google Sheets sungguhan menggunakan dataset serupa (bisa dicontek dari tab "1. Data Sumber").</div>`
        }
      ]
    },
    {
      id: 'dashboard',
      title: '2. Membuat Dashboard',
      sections: [
        {
          id: 'prinsip-dashboard',
          heading: '2.1 Prinsip Dashboard yang Baik',
          body: `
<p class="kb-lead">Dashboard adalah satu halaman ringkas yang menampilkan metrik-metrik terpenting agar bisa dipahami dalam hitungan detik — bukan sekadar kumpulan chart yang dipasang berdampingan.</p>
<ul>
<li><strong>Utamakan metrik yang benar-benar penting (KPI).</strong> Jangan menampilkan semua yang bisa dihitung — pilih 4-6 angka yang paling menjawab pertanyaan bisnis utama.</li>
<li><strong>Susun dari umum ke detail.</strong> KPI ringkas di bagian atas, grafik pendukung di bawahnya, tabel detail (jika perlu) paling bawah atau di sheet terpisah.</li>
<li><strong>Konsisten dalam warna dan skala.</strong> Gunakan palet warna yang sama untuk kategori yang sama di semua chart, dan skala sumbu yang wajar (jangan dipotong secara menyesatkan).</li>
<li><strong>Sediakan cara memfilter (slicer).</strong> Dashboard yang baik memungkinkan pengguna mempersempit sudut pandang (per wilayah, per periode) tanpa harus mengubah rumus apa pun.</li>
<li><strong>Hindari <em>chart junk</em>.</strong> Efek 3D, terlalu banyak warna, atau grid line berlebihan justru mengaburkan pesan data — semakin sederhana, semakin cepat dipahami.</li>
</ul>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Buka tab "3. Dashboard" pada latihan interaktif. Perhatikan susunannya: KPI card di baris paling atas (ringkas), lalu dua chart pendukung di bawahnya — ini contoh langsung dari prinsip "umum ke detail" di atas.</div>`
        },
        {
          id: 'tutorial-dashboard',
          heading: '2.2 Tutorial Step-by-Step Membuat Dashboard dari Data Penjualan',
          body: `
<p class="kb-lead">Berikut alur umum membuat dashboard penjualan sederhana di Excel, dari data mentah sampai jadi:</p>
<ol>
<li><strong>Siapkan data mentah yang rapi</strong> — satu baris per transaksi, header jelas, tanpa sel gabungan (merged cells) yang bisa merusak proses agregasi.</li>
<li><strong>Buat satu atau lebih Pivot Table sebagai "mesin hitung" di sheet terpisah</strong> (mis. sheet "Data Pivot" yang disembunyikan) — satu Pivot Table untuk tiap ringkasan yang dibutuhkan chart/KPI.</li>
<li><strong>Hitung angka-angka KPI</strong> memakai rumus langsung (SUM, AVERAGE, COUNTA) atau ambil dari hasil Pivot Table, lalu tampilkan besar dan jelas di sel-sel khusus yang diformat sebagai "kartu" (font besar, warna latar berbeda, border tebal).</li>
<li><strong>Buat chart dari hasil Pivot Table</strong> (bukan langsung dari data mentah) — pilih rentang hasil ringkasan, lalu Insert → Chart, pilih jenis yang sesuai jenis datanya (lihat 2.3).</li>
<li><strong>Tempatkan semua elemen di satu sheet dashboard</strong>, rapikan tata letak grid, sembunyikan gridline sheet (View → uncheck Gridlines) agar tampilan lebih bersih seperti dashboard sungguhan.</li>
<li><strong>Tambahkan slicer</strong> (Insert → Slicer, hanya tersedia jika sumbernya Pivot Table/Pivot Chart) dan hubungkan ke seluruh Pivot Table terkait lewat "Report Connections" agar satu klik slicer memfilter semua chart sekaligus.</li>
<li><strong>Uji dengan mengubah slicer</strong> — pastikan semua KPI dan chart ikut berubah, tidak ada yang "diam" karena lupa dihubungkan.</li>
</ol>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Latihan interaktif di aplikasi ini sudah menjalankan seluruh alur di atas secara otomatis (Pivot Table tersembunyi di balik layar dihitung HyperFormula, lalu KPI card dan chart dibangun dari hasilnya) — cukup ubah slicer Wilayah di tab Dashboard dan amati bagaimana semuanya ikut berubah bersamaan, persis seperti tujuan langkah nomor 6 dan 7 di atas.</div>`
        },
        {
          id: 'chart-kpi-slicer',
          heading: '2.3 Menghubungkan Data ke Chart, KPI Card, dan Slicer',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Jenis Data</th><th>Chart yang Cocok</th><th>Alasan</th></tr></thead>
<tbody>
<tr><td>Perbandingan antar kategori (mis. per wilayah)</td><td>Bar Chart / Column Chart</td><td>Mudah membandingkan tinggi/panjang batang antar kategori sejajar.</td></tr>
<tr><td>Tren dari waktu ke waktu (mis. per bulan)</td><td>Line Chart</td><td>Menonjolkan arah naik/turun dan pola musiman sepanjang waktu.</td></tr>
<tr><td>Proporsi/komposisi dari keseluruhan</td><td>Pie/Donut Chart (maksimal 5-6 kategori)</td><td>Menunjukkan bagian dari keseluruhan; jadi membingungkan jika kategorinya terlalu banyak.</td></tr>
<tr><td>Angka tunggal paling penting</td><td>KPI Card (bukan chart, hanya angka besar + label)</td><td>Untuk metrik yang perlu langsung terbaca tanpa perlu ditafsirkan secara visual.</td></tr>
</tbody>
</table></div>
<p><strong>KPI Card di Excel</strong> biasanya bukan fitur bawaan khusus, melainkan sel biasa yang diformat: font besar (28-40pt), warna latar kontras, kadang ditambah ikon panah naik/turun dengan Conditional Formatting untuk menunjukkan tren dibanding periode sebelumnya.</p>
<p><strong>Slicer</strong> adalah tombol filter visual yang terhubung ke satu atau lebih Pivot Table/Pivot Chart. Satu klik pada slicer akan memfilter semua elemen dashboard yang terhubung dengannya secara bersamaan — inilah yang membuat dashboard terasa "interaktif" dibanding sekumpulan chart statis.</p>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Bandingkan dua chart di tab Dashboard: "Total Penjualan per Wilayah" pakai Bar Chart karena membandingkan kategori sejajar, sedangkan "Total Penjualan per Bulan" juga pakai bentuk serupa di sini — coba pikirkan, kalau datanya mencakup 2-3 tahun sekaligus, jenis chart mana yang lebih tepat dipakai untuk tren bulanannya, Bar atau Line?</div>`
        },
        {
          id: 'update-dinamis',
          heading: '2.4 Cara Mengisi / Meng-update Dashboard Secara Dinamis',
          body: `
<p class="kb-lead">Dashboard yang baik seharusnya tidak perlu dibangun ulang setiap ada data baru. Beberapa teknik supaya dashboard ter-update otomatis:</p>
<ul>
<li><strong>Gunakan Excel Table (Insert → Table), bukan range biasa</strong> — begitu baris data baru ditambahkan di bagian bawah tabel, Excel Table otomatis memperluas rentangnya, dan Pivot Table/chart yang bersumber darinya cukup di-<em>refresh</em> (klik kanan → Refresh, atau Data → Refresh All) untuk ikut ter-update.</li>
<li><strong>Refresh otomatis saat file dibuka</strong> — di PivotTable Options, aktifkan "Refresh data when opening the file" supaya dashboard selalu menampilkan angka terbaru tanpa perlu klik manual.</li>
<li><strong>Hindari hard-code angka</strong> di KPI card — selalu rujuk ke sel hasil rumus/Pivot Table, bukan angka yang diketik langsung, supaya konsisten ter-update.</li>
<li><strong>Untuk sumber data eksternal</strong> (database, file terpisah, hasil query Power Query), atur jadwal refresh otomatis lewat Data → Queries & Connections → Properties → "Refresh every N minutes" atau "Refresh data when opening the file".</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Kaitan dengan Modul SQL & Power Query</span>Kalau sumber datamu berasal dari sistem lain (bukan input manual), Power Query (dibahas di modul pengetahuan SQL & Power Query) adalah cara paling tepat untuk menarik dan membersihkan data secara otomatis sebelum masuk ke Pivot Table/dashboard — sehingga seluruh proses dari data mentah sampai dashboard bisa di-refresh dengan satu klik.</div>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Latihan interaktif ini membuat ulang seluruh dataset setiap kali halaman dibuka (dengan seed tetap agar hasilnya konsisten) — cobalah pikirkan: kalau ini adalah dashboard sungguhan di kantor, bagian mana dari alur "refresh otomatis" di atas yang paling relevan diterapkan untuk data yang kamu tangani sehari-hari?</div>`
        }
      ]
    }
  ]
};
