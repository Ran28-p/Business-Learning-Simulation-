/**
 * Konten Modul Pengetahuan — SQL & Power Query Learning Simulator.
 * Dipakai lewat: KnowledgeBase.open(window.KNOWLEDGE_CONTENT_SQLPQ)
 */
window.KNOWLEDGE_CONTENT_SQLPQ = {
  title: 'Dasar SQL & Power Query',
  subtitle: 'Modul Pengetahuan — SQL & Power Query Learning Simulator',
  appAccent: '#2F55B5',
  chapters: [
    {
      id: 'dasar-sql',
      title: '1. Dasar SQL & Database Relasional',
      sections: [
        {
          id: 'konsep-relasional',
          heading: '1.1 Konsep Dasar Relational Database & SQL',
          body: `
<p class="kb-lead"><strong>Database relasional</strong> menyimpan data dalam bentuk tabel-tabel (baris dan kolom) yang saling terhubung lewat kunci (key) — berbeda dari satu spreadsheet besar, data dipecah menjadi tabel-tabel kecil yang saling terhubung untuk menghindari duplikasi.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Istilah</th><th>Penjelasan</th></tr></thead>
<tbody>
<tr><td><strong>Tabel (Table)</strong></td><td>Kumpulan data sejenis, tersusun dalam baris (row) dan kolom (column). Contoh: tabel <code>pelanggan</code>, tabel <code>pesanan</code>.</td></tr>
<tr><td><strong>Primary Key</strong></td><td>Kolom (atau kombinasi kolom) yang nilainya unik untuk setiap baris — identitas baris tersebut, mis. <code>id_pelanggan</code>.</td></tr>
<tr><td><strong>Foreign Key</strong></td><td>Kolom di satu tabel yang merujuk ke Primary Key tabel lain, membentuk relasi antar tabel. Mis. <code>id_pelanggan</code> di tabel <code>pesanan</code> merujuk ke tabel <code>pelanggan</code>.</td></tr>
<tr><td><strong>SQL (Structured Query Language)</strong></td><td>Bahasa standar untuk mengambil, menyaring, dan mengolah data dari database relasional.</td></tr>
<tr><td><strong>Query</strong></td><td>Satu perintah SQL yang dijalankan untuk mengambil atau mengubah data.</td></tr>
</tbody>
</table></div>
<div class="kb-tip"><span class="kb-callout-title">💡 Kenapa Dipecah Jadi Banyak Tabel?</span>Kalau data pelanggan (nama, alamat) ditulis ulang di setiap baris pesanan, satu perubahan alamat pelanggan berarti harus mengubah ratusan baris pesanan. Dengan tabel terpisah yang saling terhubung lewat key, data pelanggan cukup disimpan sekali — inilah prinsip dasar <em>normalisasi</em> database.</div>`
        },
        {
          id: 'urutan-eksekusi',
          heading: '1.2 Urutan Eksekusi Query',
          body: `
<p class="kb-lead">Salah satu sumber kebingungan paling umum bagi pemula SQL: urutan <strong>penulisan</strong> klausa SQL berbeda dari urutan <strong>eksekusi</strong> sesungguhnya oleh database engine.</p>
<div class="kb-formula">FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Urutan Eksekusi</th><th>Fungsi</th></tr></thead>
<tbody>
<tr><td>1. FROM (+ JOIN)</td><td>Menentukan tabel sumber data dan menggabungkannya jika ada JOIN.</td></tr>
<tr><td>2. WHERE</td><td>Menyaring baris <em>sebelum</em> pengelompokan — hanya baris yang lolos syarat ini yang diproses selanjutnya.</td></tr>
<tr><td>3. GROUP BY</td><td>Mengelompokkan baris yang tersisa berdasarkan kolom tertentu.</td></tr>
<tr><td>4. HAVING</td><td>Menyaring hasil <em>setelah</em> pengelompokan — biasanya dipakai untuk menyaring berdasarkan hasil agregasi (SUM, COUNT, dll).</td></tr>
<tr><td>5. SELECT</td><td>Menentukan kolom apa saja yang ditampilkan di hasil akhir.</td></tr>
<tr><td>6. ORDER BY</td><td>Mengurutkan hasil akhir.</td></tr>
</tbody>
</table></div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Ini Sebabnya WHERE Tidak Bisa Memakai Alias SELECT</span>Karena WHERE dieksekusi <strong>sebelum</strong> SELECT, kamu tidak bisa menulis <code>WHERE total_harga > 100</code> jika <code>total_harga</code> adalah alias yang baru didefinisikan di klausa SELECT (mis. <code>SELECT qty*harga AS total_harga</code>) — database belum "mengenal" alias itu di tahap WHERE. Solusinya: ulangi ekspresinya di WHERE, atau gunakan HAVING jika sudah melalui GROUP BY, atau bungkus dengan subquery.</div>
<div class="kb-example"><span class="kb-callout-title">Contoh</span>
<code>SELECT wilayah, SUM(total) AS total_penjualan<br>
FROM penjualan<br>
WHERE tahun = 2025<br>
GROUP BY wilayah<br>
HAVING SUM(total) > 50000000<br>
ORDER BY total_penjualan DESC;</code><br><br>
Urutan berpikir database: ambil tabel <code>penjualan</code> → sisakan baris tahun 2025 saja → kelompokkan per wilayah → hitung SUM per kelompok → buang kelompok dengan total ≤ 50 juta → baru susun kolom hasil akhir → urutkan dari terbesar.</div>`
        },
        {
          id: 'join-types',
          heading: '1.3 JOIN Types (INNER, LEFT, RIGHT, FULL, CROSS)',
          body: `
<p class="kb-lead">JOIN menggabungkan baris dari dua tabel atau lebih berdasarkan kolom yang berelasi (biasanya Primary Key ↔ Foreign Key).</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Jenis JOIN</th><th>Hasil</th><th>Kapan Dipakai</th></tr></thead>
<tbody>
<tr><td><strong>INNER JOIN</strong></td><td>Hanya baris yang punya pasangan cocok di KEDUA tabel.</td><td>Paling umum — saat kamu hanya butuh data yang benar-benar berelasi di kedua sisi.</td></tr>
<tr><td><strong>LEFT JOIN</strong></td><td>Semua baris tabel kiri, dipasangkan dengan tabel kanan jika ada; jika tidak ada, kolom tabel kanan diisi NULL.</td><td>Saat kamu ingin mempertahankan semua data tabel utama meski tidak semuanya punya pasangan (mis. semua pelanggan, termasuk yang belum pernah beli).</td></tr>
<tr><td><strong>RIGHT JOIN</strong></td><td>Kebalikan LEFT JOIN — semua baris tabel kanan dipertahankan.</td><td>Jarang dipakai langsung; kebanyakan orang menulis ulang sebagai LEFT JOIN dengan urutan tabel dibalik supaya lebih konsisten dibaca.</td></tr>
<tr><td><strong>FULL (OUTER) JOIN</strong></td><td>Semua baris dari kedua tabel, cocok atau tidak; yang tidak cocok diisi NULL di sisi yang kosong.</td><td>Saat kamu perlu melihat semua data dari kedua tabel sekaligus, termasuk yang tidak berelasi sama sekali — mis. audit data yang "yatim" di kedua sisi.</td></tr>
<tr><td><strong>CROSS JOIN</strong></td><td>Setiap baris tabel pertama dipasangkan dengan SETIAP baris tabel kedua (perkalian kartesian) — tanpa syarat kecocokan.</td><td>Jarang untuk laporan biasa; dipakai untuk menghasilkan semua kombinasi yang mungkin, mis. kombinasi semua produk × semua ukuran.</td></tr>
</tbody>
</table></div>
<div class="kb-tip"><span class="kb-callout-title">💡 Cara Cepat Mengingat</span>Bayangkan dua lingkaran diagram Venn. INNER = irisan tengah saja. LEFT = seluruh lingkaran kiri (termasuk irisan). RIGHT = seluruh lingkaran kanan. FULL = gabungan kedua lingkaran seluruhnya.</div>`
        },
        {
          id: 'window-functions',
          heading: '1.4 Window Functions Dasar',
          body: `
<p class="kb-lead">Window function menghitung nilai agregat (seperti ranking, total berjalan, rata-rata bergerak) <strong>tanpa</strong> meringkas baris menjadi satu — setiap baris tetap tampil, tapi mendapat kolom tambahan hasil perhitungan "melihat" ke baris-baris di sekitarnya.</p>
<div class="kb-formula">FUNGSI(...) OVER (PARTITION BY kolom ORDER BY kolom)</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Kegunaan</th></tr></thead>
<tbody>
<tr><td><strong>ROW_NUMBER()</strong></td><td>Memberi nomor urut unik pada tiap baris dalam partisi.</td></tr>
<tr><td><strong>RANK() / DENSE_RANK()</strong></td><td>Memberi peringkat; RANK melompati angka saat ada seri (mis. 1,2,2,4), DENSE_RANK tidak melompat (1,2,2,3).</td></tr>
<tr><td><strong>SUM() / AVG() OVER (...)</strong></td><td>Total atau rata-rata berjalan (running total), sering dikombinasikan dengan ORDER BY untuk akumulasi bertahap.</td></tr>
<tr><td><strong>LAG() / LEAD()</strong></td><td>Mengambil nilai dari baris sebelumnya/berikutnya dalam partisi yang sama — berguna untuk menghitung selisih antar periode.</td></tr>
</tbody>
</table></div>
<div class="kb-example"><span class="kb-callout-title">Contoh — Ranking penjualan per wilayah</span>
<code>SELECT wilayah, sales_rep, total,<br>
&nbsp;&nbsp;RANK() OVER (PARTITION BY wilayah ORDER BY total DESC) AS peringkat<br>
FROM penjualan;</code><br><br>
Query ini memberi peringkat sales rep <em>di dalam masing-masing wilayah</em> (bukan peringkat global) — <code>PARTITION BY wilayah</code> me-reset peringkat setiap kali wilayahnya berganti.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Beda dengan GROUP BY</span>GROUP BY meringkas banyak baris menjadi satu baris per grup (jumlah baris hasil berkurang). Window function TIDAK meringkas — jumlah baris hasil tetap sama seperti data aslinya, hanya menambah kolom hasil perhitungan.</div>`
        },
        {
          id: 'best-practices',
          heading: '1.5 Best Practices Menulis Query yang Efisien',
          body: `
<ul>
<li><strong>Hindari <code>SELECT *</code></strong> di query produksi — sebutkan kolom yang benar-benar dibutuhkan agar lebih cepat dan hasilnya jelas maksudnya.</li>
<li><strong>Filter sedini mungkin</strong> — taruh kondisi di WHERE (bukan menyaring belakangan di aplikasi) supaya database hanya memproses baris yang relevan.</li>
<li><strong>Pahami kapan pakai JOIN vs Subquery</strong> — keduanya sering bisa mencapai hasil sama, tapi JOIN umumnya lebih mudah dioptimalkan oleh database engine untuk data besar.</li>
<li><strong>Hati-hati JOIN tanpa syarat yang tepat</strong> — JOIN dengan kondisi yang salah/kurang lengkap bisa menghasilkan duplikasi baris tanpa disadari (mis. lupa menyertakan kolom tahun saat JOIN data multi-tahun).</li>
<li><strong>Gunakan alias tabel yang jelas</strong> (mis. <code>p</code> untuk <code>pelanggan</code>, <code>o</code> untuk <code>pesanan</code>) supaya query dengan banyak JOIN tetap mudah dibaca.</li>
<li><strong>Uji dengan LIMIT saat eksplorasi</strong> — sebelum menjalankan query ke jutaan baris, uji dulu dengan <code>LIMIT 10-100</code> untuk memastikan logikanya benar.</li>
<li><strong>Manfaatkan index pada kolom yang sering dipakai di WHERE/JOIN</strong> (di database produksi sungguhan) — di luar cakupan simulator ini, tapi penting diketahui untuk performa query di dunia nyata.</li>
</ul>`
        }
      ]
    },
    {
      id: 'power-query',
      title: '2. Power Query & Transformasi Data',
      sections: [
        {
          id: 'konsep-etl',
          heading: '2.1 Power Query: Konsep ETL',
          body: `
<p class="kb-lead">Power Query adalah alat di Excel/Power BI untuk melakukan <strong>ETL</strong> — mengambil data dari berbagai sumber, membersihkan/mengubah bentuknya, lalu memuatnya ke tempat kerja (worksheet, data model) — semuanya lewat antarmuka visual tanpa perlu menulis kode di sebagian besar kasus.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Tahap</th><th>Kepanjangan</th><th>Contoh di Power Query</th></tr></thead>
<tbody>
<tr><td><strong>E</strong></td><td>Extract (Ambil)</td><td>Menghubungkan ke sumber data: file Excel/CSV lain, database, folder, web.</td></tr>
<tr><td><strong>T</strong></td><td>Transform (Ubah)</td><td>Membersihkan data: hapus kolom tak perlu, ganti tipe data, gabungkan tabel, pivot/unpivot, filter baris.</td></tr>
<tr><td><strong>L</strong></td><td>Load (Muat)</td><td>Memasukkan hasil akhir ke worksheet, atau ke Data Model untuk dipakai PivotTable/dashboard.</td></tr>
</tbody>
</table></div>
<div class="kb-tip"><span class="kb-callout-title">💡 Kenapa Ini Penting Dipasangkan dengan Pivot Table</span>Pivot Table meringkas data, tapi kualitas ringkasannya bergantung sepenuhnya pada kerapian data mentahnya. Power Query mengurus tahap "membersihkan data mentah" ini secara berulang dan otomatis — begitu ada data baru, cukup klik Refresh, tanpa mengulang proses cleaning secara manual dari awal.</div>`
        },
        {
          id: 'langkah-transformasi',
          heading: '2.2 Langkah-Langkah Transformasi Data yang Umum',
          body: `
<p class="kb-lead">Berikut operasi transformasi yang paling sering dipakai di Power Query, biasanya lewat menu <em>Home</em>, <em>Transform</em>, atau <em>Add Column</em> di Power Query Editor:</p>
<ul>
<li><strong>Remove Columns / Choose Columns</strong> — membuang kolom yang tidak diperlukan sebelum diproses lebih lanjut.</li>
<li><strong>Change Type</strong> — memastikan tiap kolom bertipe data yang benar (angka, tanggal, teks) — banyak error transformasi berakar dari tipe data yang salah terdeteksi.</li>
<li><strong>Filter Rows</strong> — menyaring baris berdasarkan kondisi, mirip WHERE di SQL.</li>
<li><strong>Group By</strong> — meringkas data per kategori (mirip GROUP BY SQL), tersedia langsung di menu Transform.</li>
<li><strong>Merge Queries</strong> — menggabungkan dua tabel berdasarkan kolom kunci, setara dengan JOIN di SQL (Power Query bahkan menyediakan pilihan jenis join: Inner, Left Outer, Right Outer, Full Outer).</li>
<li><strong>Append Queries</strong> — menumpuk beberapa tabel dengan struktur kolom sama menjadi satu tabel panjang (setara <code>UNION ALL</code> di SQL).</li>
<li><strong>Pivot Column / Unpivot Column</strong> — mengubah data dari format "panjang" ke "lebar" (pivot) atau sebaliknya (unpivot); unpivot sangat sering dibutuhkan untuk merapikan data laporan yang tiap bulannya jadi kolom terpisah menjadi satu kolom "Bulan" yang rapi.</li>
<li><strong>Split Column</strong> — memecah satu kolom teks menjadi beberapa kolom (mis. berdasarkan delimiter seperti spasi atau koma).</li>
<li><strong>Add Custom Column</strong> — menambah kolom hasil perhitungan/formula M (lihat 2.3), setara kolom formula di Excel biasa.</li>
</ul>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan Singkat</span>Coba pikirkan dataset penjualan yang datanya disusun dengan kolom terpisah per bulan (Jan, Feb, Mar, ...) — transformasi apa yang paling tepat untuk merapikannya menjadi satu kolom "Bulan" dan satu kolom "Nilai" supaya siap dipakai Pivot Table? (Jawaban: <strong>Unpivot Column</strong>.)</div>`
        },
        {
          id: 'm-language',
          heading: '2.3 M Language Dasar',
          body: `
<p class="kb-lead">Setiap langkah yang kamu klik di Power Query Editor sebenarnya menghasilkan kode di balik layar, ditulis dalam bahasa <strong>M (Power Query Formula Language)</strong> — bisa dilihat dan diedit lewat panel "Advanced Editor".</p>
<div class="kb-formula">let<br>&nbsp;&nbsp;Sumber = Excel.CurrentWorkbook(){[Name="TabelPenjualan"]}[Content],<br>&nbsp;&nbsp;Disaring = Table.SelectRows(Sumber, each [Tahun] = 2025),<br>&nbsp;&nbsp;Dikelompokkan = Table.Group(Disaring, {"Wilayah"}, {{"Total", each List.Sum([Total]), type number}})<br>in<br>&nbsp;&nbsp;Dikelompokkan</div>
<p>Struktur dasar kode M selalu berbentuk <code>let ... in ...</code>: bagian <code>let</code> berisi daftar langkah (masing-masing menghasilkan sebuah nilai/tabel baru berdasarkan langkah sebelumnya), dan <code>in</code> menentukan langkah mana yang jadi hasil akhir.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi M Umum</th><th>Setara Konsepnya</th></tr></thead>
<tbody>
<tr><td><code>Table.SelectRows</code></td><td>Filter Rows (mirip WHERE di SQL)</td></tr>
<tr><td><code>Table.Group</code></td><td>Group By (mirip GROUP BY di SQL)</td></tr>
<tr><td><code>Table.NestedJoin</code></td><td>Merge Queries (mirip JOIN di SQL)</td></tr>
<tr><td><code>Table.AddColumn</code></td><td>Add Custom Column</td></tr>
<tr><td><code>Table.Sort</code></td><td>Sort/urutkan (mirip ORDER BY di SQL)</td></tr>
</tbody>
</table></div>
<div class="kb-tip"><span class="kb-callout-title">💡 Tidak Wajib Menulis M dari Nol</span>Kebanyakan pengguna Power Query tidak pernah menulis kode M langsung — cukup memakai antarmuka klik-klik di Editor, dan M dihasilkan otomatis. Memahami dasarnya tetap berguna untuk membaca/memperbaiki langkah transformasi yang sudah ada, atau menyesuaikan sedikit logika yang tidak tersedia lewat menu.</div>`
        },
        {
          id: 'contoh-kasus',
          heading: '2.4 Contoh Kasus Nyata Transformasi Data',
          body: `
<div class="kb-example"><span class="kb-callout-title">Kasus — Menggabungkan Data Penjualan & Master Produk</span>
Tim penjualan punya dua sumber data terpisah: (1) tabel transaksi harian (hanya berisi kode produk &amp; qty terjual) dan (2) tabel master produk (kode produk, nama produk, kategori, harga). Laporan yang diminta manajemen butuh nama produk dan kategori yang readable, bukan sekadar kode.<br><br>
<strong>Langkah Power Query:</strong>
<ol>
<li>Import kedua tabel sebagai query terpisah.</li>
<li>Pada tabel transaksi, gunakan <strong>Merge Queries</strong> dengan tabel master produk, join berdasarkan kolom "Kode Produk", jenis join <em>Left Outer</em> (supaya semua transaksi tetap muncul meski ada kode produk yang belum terdaftar di master — ini justru berguna untuk mendeteksi data kotor).</li>
<li><strong>Expand</strong> kolom hasil merge untuk menarik keluar kolom "Nama Produk" dan "Kategori" dari tabel master ke tabel transaksi.</li>
<li><strong>Change Type</strong> pastikan kolom qty dan harga bertipe angka, bukan teks (masalah umum saat data berasal dari sistem/export lama).</li>
<li><strong>Filter Rows</strong> untuk membuang baris dengan Nama Produk kosong (indikasi kode produk tidak valid) — atau justru ekspor baris ini terpisah sebagai laporan "data bermasalah" ke tim terkait.</li>
<li>Load hasil akhir ke Data Model, siap dipakai Pivot Table &amp; dashboard.</li>
</ol>
Hasilnya: setiap kali ada transaksi baru, cukup klik Refresh — seluruh proses join, pembersihan tipe data, dan validasi kode produk berjalan otomatis tanpa perlu diulang manual.</div>`
        }
      ]
    }
  ]
};
