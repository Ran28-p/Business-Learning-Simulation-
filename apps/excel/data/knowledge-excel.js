/**
 * Konten Modul Pengetahuan — Excel: Panduan Lengkap Rumus Excel
 * Dipakai lewat: KnowledgeBase.open(window.KNOWLEDGE_CONTENT_EXCEL)
 * Halaman utama apps/excel/index.html
 */
window.KNOWLEDGE_CONTENT_EXCEL = {
  title: 'Modul Pengetahuan — Microsoft Excel',
  subtitle: 'Panduan lengkap rumus Excel dari dasar hingga mahir — agregasi, logika, teks, tanggal & lookup',
  appAccent: '#1D6F42',
  chapters: [
    {
      id: 'dasar-rumus',
      title: '1. Dasar Rumus Excel',
      sections: [
        {
          id: 'cara-menulis-rumus',
          heading: '1.1 Cara Menulis Rumus & Referensi Sel',
          body: `
<p class="kb-lead">Semua rumus Excel diawali tanda <strong>=</strong> (sama dengan). Excel menghitung ekspresi setelah tanda tersebut dan menampilkan hasilnya di sel — bukan teks rumusnya.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Komponen</th><th>Contoh</th><th>Keterangan</th></tr></thead>
<tbody>
<tr><td>Referensi sel</td><td><code>A2</code>, <code>H2:H26</code></td><td>Kolom + baris; rentang pakai titik dua.</td></tr>
<tr><td>Operator</td><td><code>+  -  *  /  ^  &amp;</code></td><td>Tambah, kurang, kali, bagi, pangkat, gabung teks.</td></tr>
<tr><td>Operator perbandingan</td><td><code>=  &lt;&gt;  &gt;  &lt;  &gt;=  &lt;=</code></td><td>Untuk kondisi IF/COUNTIF/SUMIF.</td></tr>
<tr><td>Referensi absolut</td><td><code>$A$1</code>, <code>$H2</code>, <code>H$2</code></td><td>Tanda $ mengunci kolom/baris saat di-copy.</td></tr>
</tbody></table></div>
<div class="kb-tip"><span class="kb-callout-title">💡 Tips</span>Tekan <strong>F4</strong> saat kursor di alamat sel untuk siklus <code>A1 → $A$1 → A$1 → $A1</code>. Di latihan aplikasi ini, gunakan <strong>Rentang H2:H26</strong> (bukan H2:H100) agar hasil cocok dengan kunci jawaban.</div>
<div class="kb-formula">Urutan hitung: ( ) → ^ → * / → + - → &amp; → perbandingan</div>`
        },
        {
          id: 'kesalahan-umum-rumus',
          heading: '1.2 Kesalahan Umum & Cara Membaca Error',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Error</th><th>Arti</th><th>Solusi cepat</th></tr></thead>
<tbody>
<tr><td><code>#DIV/0!</code></td><td>Pembagi nol</td><td>Cek penyebut; bungkus dengan <code>=IFERROR(A1/B1,0)</code></td></tr>
<tr><td><code>#VALUE!</code></td><td>Tipe data salah</td><td>Pastikan rentang berisi angka saat pakai SUM/AVERAGE</td></tr>
<tr><td><code>#REF!</code></td><td>Referensi hilang</td><td>Jangan hapus baris/kolom yang dirujuk rumus</td></tr>
<tr><td><code>#NAME?</code></td><td>Nama fungsi salah</td><td>Periksa ejaan; pakai huruf kapital lebih aman</td></tr>
<tr><td><code>#N/A</code></td><td>Lookup tidak ketemu</td><td>Pastikan VLOOKUP/MATCH pakai <code>FALSE/0</code> untuk exact match</td></tr>
</tbody></table></div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Jangan copy-paste buta</span>Rumus yang di-copy dari web sering mengandung karakter kutip “curly” (<code>“ ”</code>) bukan <code>" "</code> lurus — Excel akan menganggapnya teks biasa dan menghasilkan <code>#NAME?</code>. Ketik manual di formula bar.</div>`
        }
      ]
    },
    {
      id: 'agregasi-dasar',
      title: '2. Fungsi Matematika & Agregasi Dasar',
      sections: [
        {
          id: 'sum',
          heading: '2.1 SUM — Menjumlahkan',
          body: `
<p class="kb-lead">Menjumlahkan seluruh nilai numerik pada satu atau beberapa rentang sel. Teks dan sel kosong otomatis diabaikan.</p>
<div class="kb-formula">SUM(rentang1, [rentang2], ...)</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Parameter</th><th>Wajib</th><th>Keterangan</th></tr></thead>
<tbody>
<tr><td><code>rentang1</code></td><td>Ya</td><td>Rentang pertama yang dijumlahkan.</td></tr>
<tr><td><code>rentang2, ...</code></td><td>Tidak</td><td>Rentang tambahan (opsional).</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=SUM(H2:H26)</code> — total semua nilai di kolom H baris 2–26.<br><code>=SUM(H2:H10, M2:M10)</code> — jumlah dua rentang sekaligus.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Kesalahan umum</span>Rentang tidak mencakup seluruh baris data sehingga hasil kekecilan. Selalu cek <code>H2:H26</code> (bukan <code>H2:H10</code>) bila dataset 25 baris.</div>`
        },
        {
          id: 'average',
          heading: '2.2 AVERAGE — Rata-rata',
          body: `
<p class="kb-lead">Menghitung rata-rata (mean) dari nilai numerik. Sel kosong otomatis diabaikan — tidak dihitung sebagai nol.</p>
<div class="kb-formula">AVERAGE(rentang1, [rentang2], ...)</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=AVERAGE(I2:I26)</code> — rata-rata kolom I.<br><code>=AVERAGE(H2:H26, M2:M26)</code> — rata-rata gabungan dua rentang.</div>
<div class="kb-tip"><span class="kb-callout-title">💡 Bedakan dengan Manual</span>Jika menghitung <code>=SUM(H2:H26)/COUNT(H2:H26)</code> hasilnya sama dengan <code>=AVERAGE(H2:H26)</code>, tapi AVERAGE lebih singkat dan otomatis menangani sel kosong dengan benar.</div>`
        },
        {
          id: 'min-max',
          heading: '2.3 MIN & MAX — Nilai Terkecil & Terbesar',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Sintaks</th><th>Kegunaan</th></tr></thead>
<tbody>
<tr><td><strong>MIN</strong></td><td><code>=MIN(M2:M26)</code></td><td>Mengambil nilai terkecil dari rentang numerik.</td></tr>
<tr><td><strong>MAX</strong></td><td><code>=MAX(M2:M26)</code></td><td>Mengambil nilai terbesar dari rentang numerik.</td></tr>
</tbody></table></div>
<div class="kb-formula">MIN(rentang) &nbsp;|&nbsp; MAX(rentang)</div>
<div class="kb-tip"><span class="kb-callout-title">💡 Kombinasi praktis</span><code>=MAX(H2:H26)-MIN(H2:H26)</code> untuk melihat rentang (range) data — selisih tertinggi dan terendah.</div>`
        },
        {
          id: 'count',
          heading: '2.4 COUNT — Menghitung Sel Angka',
          body: `
<p class="kb-lead">Menghitung jumlah sel yang berisi nilai numerik. Sel teks dan kosong tidak dihitung.</p>
<div class="kb-formula">COUNT(rentang1, [rentang2], ...)</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=COUNT(H2:H26)</code> — berapa sel angka di kolom H.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ COUNT vs COUNTA</span><code>COUNT</code> hanya menghitung angka. Untuk menghitung sel berisi teks (mis. Nama Pelanggan), pakai <code>COUNTA</code>. Jika memakai <code>COUNT</code> di kolom teks hasilnya akan <code>0</code>.</div>`
        }
      ]
    },
    {
      id: 'logika',
      title: '3. Fungsi Logika',
      sections: [
        {
          id: 'if',
          heading: '3.1 IF — Percabangan Kondisi',
          body: `
<p class="kb-lead">Mengembalikan salah satu dari dua nilai tergantung apakah kondisi bernilai benar atau salah.</p>
<div class="kb-formula">IF(kondisi, nilai_jika_benar, [nilai_jika_salah])</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Parameter</th><th>Keterangan</th></tr></thead>
<tbody>
<tr><td><code>kondisi</code></td><td>Ekspresi perbandingan: <code>H2&gt;5</code>, <code>F2="Jawa Barat"</code></td></tr>
<tr><td><code>nilai_jika_benar</code></td><td>Nilai/teks jika kondisi benar (teks wajib pakai tanda kutip).</td></tr>
<tr><td><code>nilai_jika_salah</code></td><td>Opsional; jika kosong Excel menampilkan FALSE.</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=IF(M2&gt;=1000000,"Penjualan Besar","Penjualan Kecil")</code><br><code>=IF(H2&gt;10,"Stok Aman","Restok")</code></div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Lupa kutip</span>Nilai teks wajib pakai tanda kutip lurus: <code>"Penjualan Besar"</code>. Tanpa kutip Excel mengira itu nama range dan error.</div>`
        },
        {
          id: 'and-or-not',
          heading: '3.2 AND, OR, NOT — Kombinasi Kondisi',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Sintaks</th><th>Hasil BENAR jika…</th></tr></thead>
<tbody>
<tr><td><strong>AND</strong></td><td><code>AND(kondisi1, kondisi2, ...)</code></td><td>SEMUA kondisi benar.</td></tr>
<tr><td><strong>OR</strong></td><td><code>OR(kondisi1, kondisi2, ...)</code></td><td>SALAH SATU kondisi benar.</td></tr>
<tr><td><strong>NOT</strong></td><td><code>NOT(kondisi)</code></td><td>Membalik: benar→salah, salah→benar.</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=IF(AND(H2&gt;5, I2&gt;100000),"Ya","Tidak")</code><br><code>=IF(OR(G2="Bali", G2="DKI Jakarta"),"Prioritas","Biasa")</code><br><code>=IF(NOT(H2&gt;5),"Sedikit","Banyak")</code></div>
<div class="kb-tip"><span class="kb-callout-title">💡 AND/OR tidak berdiri sendiri</span><code>AND</code>/<code>OR</code> menghasilkan TRUE/FALSE. Agar menampilkan teks, bungkus dengan <code>IF</code>: <code>=IF(AND(...),"Ya","Tidak")</code>.</div>`
        },
        {
          id: 'iferror',
          heading: '3.3 IFERROR — Menangani Error dengan Elegan',
          body: `
<p class="kb-lead">Jika rumus menghasilkan error, tampilkan nilai pengganti yang ramah — bukan kode error mentah.</p>
<div class="kb-formula">IFERROR(nilai, nilai_jika_error)</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=IFERROR(A2/B2, 0)</code> — jika B2 nol → tampil 0, bukan <code>#DIV/0!</code>.<br><code>=IFERROR(FIND("X",D2),"Tidak ditemukan")</code> — jika teks tidak ada → tampil pesan.</div>
<div class="kb-tip"><span class="kb-callout-title">💡 Kapan pakai?</span>Saat membagi, lookup (VLOOKUP), atau FIND/SEARCH yang mungkin gagal. Lebih bersih daripada membiarkan <code>#DIV/0!</code> atau <code>#VALUE!</code> muncul di laporan.</div>`
        }
      ]
    },
    {
      id: 'agregasi-bersyarat',
      title: '4. Agregasi Bersyarat',
      sections: [
        {
          id: 'countif',
          heading: '4.1 COUNTIF — Menghitung dengan Satu Kriteria',
          body: `
<p class="kb-lead">Menghitung jumlah sel pada rentang yang memenuhi satu kriteria tertentu.</p>
<div class="kb-formula">COUNTIF(rentang, kriteria)</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=COUNTIF(G2:G26,"Jawa Barat")</code> — hitung baris dengan wilayah Jawa Barat.<br><code>=COUNTIF(H2:H26,"&gt;5")</code> — hitung baris dengan nilai &gt; 5.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Kutip kriteria</span>Kriteria teks atau ber-operator wajib pakai kutip: <code>"Jawa Barat"</code>, <code>"&gt;5"</code>, <code>"&lt;&gt;0"</code>. Tanpa kutip hasilnya salah.</div>`
        },
        {
          id: 'sumif',
          heading: '4.2 SUMIF — Menjumlahkan dengan Satu Kriteria',
          body: `
<p class="kb-lead">Menjumlahkan nilai pada <code>rentang_jumlah</code> untuk baris yang memenuhi kriteria.</p>
<div class="kb-formula">SUMIF(rentang, kriteria, [rentang_jumlah])</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=SUMIF(F2:F26,"Elektronik",M2:M26)</code> — total penjualan kategori Elektronik.<br><code>=SUMIF(G2:G26,"Jawa Barat",M2:M26)</code> — total penjualan Jawa Barat.</div>
<div class="kb-tip"><span class="kb-callout-title">💡 Jika rentang_jumlah kosong</span>Excel menjumlahkan rentang kriteria itu sendiri. Jadi <code>=SUMIF(H2:H26,"&gt;5")</code> menjumlahkan nilai H yang &gt;5.</div>`
        },
        {
          id: 'sumifs-countifs',
          heading: '4.3 SUMIFS & COUNTIFS — Multi-Kriteria',
          body: `
<p class="kb-lead">Versi multi-kriteria dari SUMIF/COUNTIF. Semua kriteria harus terpenuhi (logika AND).</p>
<div class="kb-formula">SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2, ...])</div>
<div class="kb-formula">COUNTIFS(criteria_range1, criteria1, [criteria_range2, criteria2, ...])</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=SUMIFS(M2:M100, F2:F100,"Elektronik", G2:G100,"&gt;=2026-01-01")</code><br>Jumlah penjualan Elektronik sejak 1 Jan 2026.<br><code>=COUNTIFS(F2:F26,"Elektronik", H2:H26,"&gt;5")</code> — hitung baris yang keduanya benar.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Ukuran harus sama</span>Semua rentang (sum_range &amp; criteria_range) harus punya jumlah baris yang sama. Jika tidak, hasil <code>#VALUE!</code>.</div>`
        }
      ]
    },
    {
      id: 'fungsi-teks',
      title: '5. Fungsi Teks',
      sections: [
        {
          id: 'left-right-mid',
          heading: '5.1 LEFT, RIGHT, MID — Mengambil Bagian Teks',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Sintaks</th><th>Kegunaan</th></tr></thead>
<tbody>
<tr><td><strong>LEFT</strong></td><td><code>LEFT(teks, [jml])</code></td><td>Ambil karakter dari sisi kiri.</td></tr>
<tr><td><strong>RIGHT</strong></td><td><code>RIGHT(teks, [jml])</code></td><td>Ambil karakter dari sisi kanan.</td></tr>
<tr><td><strong>MID</strong></td><td><code>MID(teks, mulai, jml)</code></td><td>Ambil dari tengah, mulai posisi tertentu.</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=LEFT(D2,3)</code> → 3 huruf pertama.<br><code>=RIGHT(D2,3)</code> → 3 huruf terakhir.<br><code>=MID(D2,5,3)</code> → 3 huruf mulai posisi ke-5.</div>`
        },
        {
          id: 'len-trim',
          heading: '5.2 LEN & TRIM — Panjang dan Merapikan Teks',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Sintaks</th><th>Kegunaan</th></tr></thead>
<tbody>
<tr><td><strong>LEN</strong></td><td><code>LEN(teks)</code></td><td>Hitung jumlah karakter (termasuk spasi).</td></tr>
<tr><td><strong>TRIM</strong></td><td><code>TRIM(teks)</code></td><td>Hapus spasi berlebih di awal/akhir &amp; antar kata.</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=LEN(C2)</code> — panjang nama pelanggan.<br><code>=TRIM("  Halo   Dunia  ")</code> → <code>"Halo Dunia"</code></div>`
        },
        {
          id: 'case-text',
          heading: '5.3 LOWER, UPPER, PROPER — Ubah Kapitalisasi',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Hasil</th><th>Contoh</th></tr></thead>
<tbody>
<tr><td><strong>LOWER</strong></td><td>huruf kecil semua</td><td><code>=LOWER("Jakarta")</code> → <code>jakarta</code></td></tr>
<tr><td><strong>UPPER</strong></td><td>HURUF KAPITAL semua</td><td><code>=UPPER("jakarta")</code> → <code>JAKARTA</code></td></tr>
<tr><td><strong>PROPER</strong></td><td>Huruf Awal Kapital</td><td><code>=PROPER("budi santoso")</code> → <code>Budi Santoso</code></td></tr>
</tbody></table></div>
<div class="kb-tip"><span class="kb-callout-title">💡 Kapan pakai?</span>Untuk merapikan data nama/wilayah yang campur kapitalisasi sebelum dianalisis atau sebelum VLOOKUP agar pencocokan konsisten.</div>`
        },
        {
          id: 'concat-find-search',
          heading: '5.4 CONCAT, FIND, SEARCH, SUBSTITUTE',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Sintaks</th><th>Kegunaan</th></tr></thead>
<tbody>
<tr><td><strong>CONCAT</strong></td><td><code>CONCAT(teks1, teks2, ...)</code></td><td>Gabung beberapa teks (pengganti CONCATENATE).</td></tr>
<tr><td><strong>FIND</strong></td><td><code>FIND(cari, dalam, [mulai])</code></td><td>Posisi teks — <em>peka</em> huruf besar/kecil.</td></tr>
<tr><td><strong>SEARCH</strong></td><td><code>SEARCH(cari, dalam, [mulai])</code></td><td>Posisi teks — <em>tidak peka</em> huruf.</td></tr>
<tr><td><strong>SUBSTITUTE</strong></td><td><code>SUBSTITUTE(teks, lama, baru, [ke])</code></td><td>Ganti teks lama dengan baru.</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=CONCAT(D2,"-",G2)</code> — gabung nama-wilayah.<br><code>=FIND("Sap",C2)</code> vs <code>=SEARCH("sap",C2)</code> — beda sensitivitas huruf.<br><code>=SUBSTITUTE(C2,"e","3")</code> — ganti huruf e jadi 3.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ FIND case-sensitive</span><code>FIND("A", "apple")</code> menghasilkan error, sedangkan <code>SEARCH("A","apple")</code> berhasil (posisi 1). Pilih sesuai kebutuhan.</div>`
        }
      ]
    },
    {
      id: 'fungsi-tanggal',
      title: '6. Fungsi Tanggal & Waktu',
      sections: [
        {
          id: 'today-date',
          heading: '6.1 TODAY & DATE — Membuat dan Mengambil Tanggal',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Sintaks</th><th>Kegunaan</th></tr></thead>
<tbody>
<tr><td><strong>TODAY</strong></td><td><code>TODAY()</code></td><td>Tanggal hari ini (tanpa argumen).</td></tr>
<tr><td><strong>DATE</strong></td><td><code>DATE(tahun, bulan, tanggal)</code></td><td>Membentuk tanggal dari komponen.</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=TODAY()</code> → 17/05/2026 (sesuai jam perangkat).<br><code>=DATE(2026,5,17)</code> → 17 Mei 2026.<br><code>=DATE(2026,13,1)</code> → otomatis jadi 01/01/2027 (bulan 13 = Jan tahun depan).</div>
<div class="kb-tip"><span class="kb-callout-title">💡 TODAY dinamis</span><code>TODAY()</code> otomatis berubah tiap hari — cocok untuk menghitung umur laporan atau selisih hari tanpa ganti manual.</div>`
        },
        {
          id: 'year-month-day',
          heading: '6.2 YEAR, MONTH, DAY — Memecah Tanggal',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Hasil</th><th>Contoh (jika B2 = 17/05/2026)</th></tr></thead>
<tbody>
<tr><td><strong>YEAR</strong></td><td>Tahun</td><td><code>=YEAR(B2)</code> → <code>2026</code></td></tr>
<tr><td><strong>MONTH</strong></td><td>Bulan 1–12</td><td><code>=MONTH(B2)</code> → <code>5</code></td></tr>
<tr><td><strong>DAY</strong></td><td>Hari 1–31</td><td><code>=DAY(B2)</code> → <code>17</code></td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Kombinasi</span><code>=YEAR(B2)&amp;"-"&amp;MONTH(B2)</code> → <code>2026-5</code> (untuk label periode).<br>Gunakan Pivot Table grouping untuk ringkasan per bulan yang lebih rapi.</div>`
        },
        {
          id: 'datedif-eomonth-weekday',
          heading: '6.3 DATEDIF, EOMONTH, WEEKDAY',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Fungsi</th><th>Sintaks</th><th>Kegunaan</th></tr></thead>
<tbody>
<tr><td><strong>DATEDIF</strong></td><td><code>DATEDIF(mulai, akhir, "D"/"M"/"Y")</code></td><td>Selisih dua tanggal dalam hari/bulan/tahun.</td></tr>
<tr><td><strong>EOMONTH</strong></td><td><code>EOMONTH(tgl, jml_bulan)</code></td><td>Tanggal akhir bulan berjarak N bulan dari tgl.</td></tr>
<tr><td><strong>WEEKDAY</strong></td><td><code>WEEKDAY(tanggal)</code></td><td>Hari dalam seminggu (1=Minggu … 7=Sabtu).</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=DATEDIF(B2, TODAY(), "D")</code> — umur dalam hari.<br><code>=EOMONTH(B2,0)</code> — akhir bulan yang sama; <code>=EOMONTH(B2,1)</code> — akhir bulan depan.<br><code>=WEEKDAY(B2)</code> → 1–7 untuk filter hari kerja/libur.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ DATEDIF tidak didokumentasikan resmi</span>Fungsi ini tetap bekerja di semua versi Excel, tapi tidak muncul di autocomplete. Ketik manual dan pastikan urutan tanggal benar: <code>mulai</code> harus lebih awal dari <code>akhir</code>.</div>`
        }
      ]
    },
    {
      id: 'lookup',
      title: '7. Fungsi Lookup & Referensi',
      sections: [
        {
          id: 'vlookup',
          heading: '7.1 VLOOKUP — Cari Vertikal',
          body: `
<p class="kb-lead">Mencari nilai pada kolom pertama sebuah tabel dan mengembalikan nilai dari kolom yang ditentukan di baris yang sama.</p>
<div class="kb-formula">VLOOKUP(lookup_value, table_array, col_index, [range_lookup])</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Parameter</th><th>Wajib</th><th>Keterangan</th></tr></thead>
<tbody>
<tr><td><code>lookup_value</code></td><td>Ya</td><td>Nilai yang dicari di kolom pertama tabel.</td></tr>
<tr><td><code>table_array</code></td><td>Ya</td><td>Rentang tabel tempat pencarian.</td></tr>
<tr><td><code>col_index</code></td><td>Ya</td><td>Nomor kolom (1-based) yang dikembalikan.</td></tr>
<tr><td><code>range_lookup</code></td><td>Tidak</td><td>FALSE = exact, TRUE = approximate (default TRUE!).</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=VLOOKUP(A2, A10:D20, 3, FALSE)</code> — cari A2 di kolom A tabel A10:D20, ambil kolom ke-3.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Selalu pakai FALSE</span>Jika <code>range_lookup</code> dikosongkan, Excel pakai <code>TRUE</code> (approximate) dan bisa mengembalikan baris yang salah tanpa error. Untuk pencocokan tepat, selalu tulis <code>FALSE</code>.</div>`
        },
        {
          id: 'match',
          heading: '7.2 MATCH — Cari Posisi',
          body: `
<p class="kb-lead">Mengembalikan posisi relatif (1-based) dari nilai yang dicari di dalam rentang satu dimensi.</p>
<div class="kb-formula">MATCH(lookup_value, lookup_array, [match_type])</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>match_type</th><th>Arti</th></tr></thead>
<tbody>
<tr><td><code>0</code></td><td>Exact match (paling sering dipakai).</td></tr>
<tr><td><code>1</code></td><td>Less than or equal (array harus urut naik).</td></tr>
<tr><td><code>-1</code></td><td>Greater than or equal (array harus urut turun).</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=MATCH("Apple", A2:A10, 0)</code> → posisi baris Apple di A2:A10.<br><code>=MATCH(100, B2:B10, 0)</code> → posisi nilai 100.</div>`
        },
        {
          id: 'index',
          heading: '7.3 INDEX — Ambil Nilai by Posisi',
          body: `
<p class="kb-lead">Mengembalikan nilai dari array berdasarkan nomor baris dan kolom yang diberikan.</p>
<div class="kb-formula">INDEX(array, row_num, [col_num])</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span><code>=INDEX(B2:D10, 3, 2)</code> — baris ke-3, kolom ke-2 dari B2:D10.<br><code>=INDEX(A2:A10, 5)</code> — baris ke-5 dari A2:A10 (satu kolom).</div>
<div class="kb-tip"><span class="kb-callout-title">💡 Kombinasi INDEX + MATCH</span>Duo ini lebih fleksibel dari VLOOKUP — bisa lookup ke kiri, tidak peduli posisi kolom:<br><code>=INDEX(D2:D10, MATCH("Apple", A2:A10, 0))</code> — cari Apple di A, ambil nilai dari D baris yang sama. Inilah pengganti VLOOKUP yang direkomendasikan.</div>`
        }
      ]
    },
    {
      id: 'pivot-dashboard',
      title: '8. Pivot Table & Dashboard',
      sections: [
        {
          id: 'apa-itu-pivot',
          heading: '8.1 Apa Itu Pivot Table dan Kapan Memakainya',
          body: `
<p class="kb-lead">Pivot Table adalah fitur Excel untuk meringkas, mengelompokkan, dan menganalisis data mentah dalam jumlah besar menjadi tabel ringkas yang mudah dibaca — tanpa perlu menulis satu pun rumus manual.</p>
<p>Bayangkan 1.000 baris data transaksi (tanggal, wilayah, produk, jumlah). Untuk tahu "total per wilayah" manual butuh SUMIF per wilayah. Pivot Table melakukan ini otomatis — cukup <em>drag-and-drop</em> field ke area Baris, Kolom, atau Nilai.</p>
<div class="kb-tip"><span class="kb-callout-title">💡 Kapan Memakai Pivot Table</span>Gunakan saat: (1) data banyak baris, (2) perlu ringkasan per kategori, (3) ingin cepat ganti sudut pandang tanpa tulis ulang rumus.</div>
<div class="kb-example"><span class="kb-callout-title">🎯 Latihan</span>Buka latihan <strong>Pivot Table &amp; Dashboard</strong> di tombol header. Lihat data mentah di tab "1. Data Sumber" — tiap baris adalah satu transaksi.</div>`
        },
        {
          id: 'cara-membuat-pivot',
          heading: '8.2 Cara Membuat Pivot Table',
          body: `
<ol>
<li>Pastikan data punya <strong>header di baris pertama</strong> tanpa baris/kolom kosong di tengah.</li>
<li>Klik sel di dalam data → <strong>Insert → PivotTable</strong>.</li>
<li>Konfirmasi rentang, pilih lokasi output (worksheet baru direkomendasikan).</li>
<li>Di panel <strong>PivotTable Fields</strong>, drag field ke 4 area:
<ul>
<li><strong>Rows</strong> — kategori baris (mis. Wilayah).</li>
<li><strong>Columns</strong> — kategori kolom (mis. Kategori Produk).</li>
<li><strong>Values</strong> — angka yang diringkas (mis. Total), default SUM.</li>
<li><strong>Filters</strong> — saring seluruh tabel.</li>
</ul></li>
<li>Pivot terisi otomatis saat field di-drag.</li>
</ol>
<div class="kb-formula">Konsep: tiap sel Pivot = SUMIFS(kolom_nilai, kolom_baris, "kategori_baris", kolom_kolom, "kategori_kolom")</div>`
        },
        {
          id: 'dashboard-prinsip',
          heading: '8.3 Prinsip Dashboard yang Baik',
          body: `
<ul>
<li><strong>Utamakan KPI yang benar-benar penting.</strong> Pilih 4–6 angka paling menjawab pertanyaan bisnis.</li>
<li><strong>Susun umum → detail.</strong> KPI di atas, grafik di bawahnya, tabel detail paling bawah.</li>
<li><strong>Konsisten warna &amp; skala.</strong> Palet sama untuk kategori sama di semua chart.</li>
<li><strong>Sediakan slicer.</strong> Satu klik filter semua chart tanpa ubah rumus.</li>
<li><strong>Hindari chart junk.</strong> Tanpa 3D/terlalu banyak warna/grid berlebihan.</li>
</ul>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Jenis Data</th><th>Chart Cocok</th><th>Alasan</th></tr></thead>
<tbody>
<tr><td>Perbandingan kategori</td><td>Bar / Column Chart</td><td>Mudah bandingkan batang sejajar.</td></tr>
<tr><td>Tren waktu</td><td>Line Chart</td><td>Menonjolkan naik/turun &amp; musiman.</td></tr>
<tr><td>Proporsi</td><td>Pie/Donut (maks 5–6 kat.)</td><td>Bagian dari keseluruhan.</td></tr>
<tr><td>Angka tunggal penting</td><td>KPI Card</td><td>Angka besar + label, tanpa visual.</td></tr>
</tbody></table></div>`
        }
      ]
    },
    {
      id: 'tips-best-practice',
      title: '9. Tips Cepat & Best Practice',
      sections: [
        {
          id: 'shortcut-penting',
          heading: '9.1 Shortcut Penting',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Shortcut</th><th>Fungsi</th></tr></thead>
<tbody>
<tr><td><code>Ctrl + C / V</code></td><td>Copy / Paste</td></tr>
<tr><td><code>Ctrl + Z / Y</code></td><td>Undo / Redo</td></tr>
<tr><td><code>Ctrl + Panah</code></td><td>Lompat ke ujung data</td></tr>
<tr><td><code>Ctrl + Shift + Panah</code></td><td>Seleksi sampai ujung data</td></tr>
<tr><td><code>Ctrl + T</code></td><td>Buat Excel Table</td></tr>
<tr><td><code>F4</code></td><td>Siklus referensi absolut ($)</td></tr>
<tr><td><code>F2</code></td><td>Edit sel (lihat rumus)</td></tr>
<tr><td><code>Ctrl + &#96;</code> (backtick)</td><td>Tampilkan semua rumus</td></tr>
<tr><td><code>Alt + Enter</code></td><td>Baris baru dalam sel</td></tr>
</tbody></table></div>`
        },
        {
          id: 'best-practice-rumus',
          heading: '9.2 Best Practice Menulis Rumus',
          body: `
<ul>
<li><strong>Gunakan Excel Table (Ctrl+T)</strong> — rentang otomatis meluas saat tambah baris, Pivot/chart cukup Refresh.</li>
<li><strong>Hindari hard-code angka</strong> di KPI — selalu rujuk sel hasil rumus/Pivot.</li>
<li><strong>Bungkus rumus rawan error dengan IFERROR</strong> agar laporan tetap bersih.</li>
<li><strong>Beri nama range</strong> (Formulas → Name Manager) untuk rumus yang sering dipakai — lebih mudah dibaca daripada <code>H2:H26</code> berulang.</li>
<li><strong>Dokumentasikan rumus kompleks</strong> dengan komentar (Review → New Comment) atau sel keterangan di sebelahnya.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Alur belajar disarankan</span>Dasar Rumus → Agregasi Dasar → Logika → Agregasi Bersyarat → Teks → Tanggal → Lookup → Pivot &amp; Dashboard. Kerjakan latihan per level di aplikasi ini secara berurutan.</div>
<p class="kb-legal">Modul ini mencakup semua rumus yang tersedia di aplikasi latihan (Level 1–3). Rumus tambahan akan ditambahkan seiring pengembangan level selanjutnya.</p>`
        }
      ]
    }
  ]
};
