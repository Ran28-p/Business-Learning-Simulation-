/**
 * Konten Modul Pengetahuan — Accounting (ActMaster Pro).
 * Dipakai oleh js/knowledge-base.js lewat: KnowledgeBase.open(window.KNOWLEDGE_CONTENT_ACCOUNTING)
 *
 * Semua contoh laporan keuangan pada bab 2 memakai SATU perusahaan fiktif yang sama
 * (CV Mitra Sejahtera, usaha dagang, tahun buku 2025) dengan angka yang sengaja dibuat
 * saling terhubung dan balance antar keempat laporan — supaya pembaca bisa melihat
 * langsung bagaimana laba bersih mengalir ke ekuitas, ekuitas mengalir ke neraca, dan
 * kas akhir di laporan arus kas cocok dengan akun Kas di neraca.
 */
window.KNOWLEDGE_CONTENT_ACCOUNTING = {
  title: 'Dasar Akuntansi & Laporan Keuangan',
  subtitle: 'Modul Pengetahuan — ActMaster Pro',
  appAccent: '#2563eb',
  disclaimer: 'Materi ini untuk pembelajaran dasar dengan contoh yang disederhanakan. Penyusunan laporan keuangan entitas nyata mengikuti SAK yang berlaku bagi entitas tersebut (SAK Umum/PSAK, SAK EP, atau SAK EMKM). Nomor PSAK memakai penomoran baru yang efektif sejak 1 Januari 2024.',
  chapters: [
    {
      id: 'dasar-akuntansi',
      title: '1. Dasar-Dasar Akuntansi',
      sections: [
        {
          id: 'persamaan-dasar',
          heading: '1.1 Persamaan Dasar Akuntansi',
          body: `
<p class="kb-lead">Persamaan dasar akuntansi adalah fondasi dari seluruh sistem pencatatan akuntansi berpasangan (<em>double-entry bookkeeping</em>). Semua transaksi keuangan, sekompleks apa pun, pada akhirnya akan selalu menjaga persamaan ini tetap seimbang.</p>
<div class="kb-formula">ASET = KEWAJIBAN + EKUITAS</div>
<p>Dalam bahasa Inggris ditulis sebagai <strong>Assets = Liabilities + Equity</strong>. Artinya, seluruh sumber daya (aset) yang dimiliki perusahaan selalu dibiayai oleh dua sumber: dari pihak luar (kewajiban/utang kepada kreditur) atau dari pemilik sendiri (ekuitas/modal).</p>
<p>Karena aktivitas usaha menghasilkan pendapatan, beban, dan pengambilan pribadi (prive), persamaan ini bisa diperluas menjadi:</p>
<div class="kb-formula">ASET = KEWAJIBAN + MODAL PEMILIK + (PENDAPATAN − BEBAN − PRIVE)</div>
<p>Bentuk perluasan ini menjelaskan mengapa <strong>laba (pendapatan dikurangi beban)</strong> akan menambah ekuitas, sedangkan <strong>prive</strong> akan menguranginya.</p>
<div class="kb-example"><span class="kb-callout-title">Contoh Sederhana</span>
Bu Sari mendirikan usaha jasa laundry dengan modal awal tunai Rp20.000.000. Pada hari pertama:<br>
Aset (Kas Rp20.000.000) = Kewajiban (Rp0) + Ekuitas (Modal Pemilik Rp20.000.000).<br><br>
Seminggu kemudian ia membeli mesin cuci Rp15.000.000 secara kredit (belum dibayar). Transaksi ini menambah aset (Peralatan) sekaligus kewajiban (Utang Usaha) dengan jumlah sama, sehingga persamaan tetap seimbang:<br>
Aset (Kas Rp20.000.000 + Peralatan Rp15.000.000 = Rp35.000.000) = Kewajiban (Utang Usaha Rp15.000.000) + Ekuitas (Rp20.000.000).</div>
<p>Inilah sebabnya setiap transaksi akuntansi selalu dicatat dengan <strong>minimal dua sisi (debit dan kredit) yang jumlahnya sama besar</strong> — supaya persamaan dasar akuntansi tidak pernah "pincang".</p>`,
          sources: [
            { type: 'standar', ref: 'Kerangka Konseptual Pelaporan Keuangan (SAK Indonesia)', note: 'definisi unsur laporan keuangan; di materi ini disederhanakan untuk pembelajaran' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'istilah-penting',
          heading: '1.2 Istilah-Istilah Penting',
          body: `
<p class="kb-lead">Kenali dulu istilah-istilah kunci yang akan terus muncul di seluruh modul dan aplikasi simulasi ini.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th style="width:26%">Istilah</th><th>Penjelasan</th></tr></thead>
<tbody>
<tr><td><strong>Aset (Assets)</strong></td><td>Sumber daya yang dimiliki dan dikuasai perusahaan yang memberi manfaat ekonomi di masa depan. Contoh: kas, piutang, persediaan, peralatan.</td></tr>
<tr><td><strong>Kewajiban (Liabilities)</strong></td><td>Utang perusahaan kepada pihak lain yang harus diselesaikan di masa depan. Contoh: utang usaha, utang bank, utang gaji. Dalam PSAK istilah bakunya <em>liabilitas</em>.</td></tr>
<tr><td><strong>Ekuitas (Equity) / Modal</strong></td><td>Hak residual pemilik atas aset perusahaan setelah dikurangi seluruh kewajiban — bagian aset yang benar-benar "milik" pemilik.</td></tr>
<tr><td><strong>Pendapatan (Revenue)</strong></td><td>Kenaikan manfaat ekonomi selama periode akibat aktivitas normal usaha (penjualan barang/jasa), menambah ekuitas.</td></tr>
<tr><td><strong>Beban (Expense)</strong></td><td>Penurunan manfaat ekonomi selama periode akibat pemakaian sumber daya untuk menjalankan usaha, mengurangi ekuitas.</td></tr>
<tr><td><strong>Prive (Drawing)</strong></td><td>Pengambilan uang/aset perusahaan oleh pemilik untuk kepentingan pribadi, di luar gaji. Mengurangi ekuitas, tapi bukan beban usaha.</td></tr>
<tr><td><strong>Debit &amp; Kredit</strong></td><td>Dua sisi pencatatan dalam sistem akuntansi berpasangan. Debit selalu di sisi kiri, kredit di sisi kanan; total keduanya harus selalu sama.</td></tr>
<tr><td><strong>Jurnal (Journal)</strong></td><td>Catatan kronologis pertama atas setiap transaksi, memuat akun yang didebit dan dikredit beserta jumlahnya.</td></tr>
<tr><td><strong>Buku Besar (Ledger)</strong></td><td>Kumpulan seluruh akun perusahaan; tiap akun punya "buku" sendiri yang merangkum semua mutasi debit/kredit dari jurnal.</td></tr>
<tr><td><strong>Neraca Saldo (Trial Balance)</strong></td><td>Daftar seluruh saldo akun buku besar pada satu tanggal, untuk memastikan total debit = total kredit sebelum menyusun laporan keuangan.</td></tr>
<tr><td><strong>Ayat Jurnal Penyesuaian</strong></td><td>Jurnal di akhir periode untuk mengakui pendapatan/beban yang belum tercatat (misalnya penyusutan, perlengkapan terpakai, gaji terutang).</td></tr>
<tr><td><strong>Akrual vs Kas Basis</strong></td><td>Basis akrual mengakui pendapatan/beban saat terjadi (bukan saat kas berpindah tangan); basis kas hanya mengakui saat kas diterima/dibayar. PSAK 201 mewajibkan penyusunan laporan keuangan (selain laporan arus kas) dengan dasar akrual.</td></tr>
<tr><td><strong>Penyusutan (Depreciation)</strong></td><td>Alokasi sistematis biaya perolehan aset tetap menjadi beban selama masa manfaatnya.</td></tr>
<tr><td><strong>Piutang Usaha</strong></td><td>Hak tagih perusahaan atas penjualan barang/jasa yang belum dibayar pelanggan.</td></tr>
<tr><td><strong>Utang Usaha</strong></td><td>Kewajiban perusahaan atas pembelian barang/jasa secara kredit yang belum dibayar ke pemasok.</td></tr>
<tr><td><strong>Persediaan (Inventory)</strong></td><td>Barang dagang yang dimiliki perusahaan untuk dijual kembali dalam kegiatan usaha normal.</td></tr>
</tbody>
</table></div>`,
          sources: [
            { type: 'standar', ref: 'Kerangka Konseptual Pelaporan Keuangan (SAK Indonesia)', note: 'definisi unsur laporan keuangan; di materi ini disederhanakan untuk pembelajaran' },
            { type: 'psak', ref: 'PSAK 201 Penyajian Laporan Keuangan (dahulu PSAK 1; penomoran baru efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/PSAK-Umum/7' },
            { type: 'standar', ref: 'PSAK 201 — dasar akrual (istilah baku "liabilitas")', note: 'nomor paragraf dasar akrual dari pengetahuan umum (IAS 1 paragraf 27); cocokkan dengan teks IAI' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'akun-akun',
          heading: '1.3 Akun-Akun dalam Akuntansi',
          body: `
<p class="kb-lead">Setiap transaksi pada akhirnya dicatat ke salah satu dari lima kategori akun berikut. Memahami kelima kategori ini adalah kunci untuk bisa "membaca" jurnal, buku besar, dan laporan keuangan apa pun.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Kategori</th><th>Termasuk dalam Laporan</th><th>Contoh Akun</th></tr></thead>
<tbody>
<tr><td><strong>1. Aset (Assets)</strong></td><td>Neraca</td><td>Kas, Piutang Usaha, Persediaan Barang Dagang, Perlengkapan, Peralatan, Kendaraan, Akumulasi Penyusutan (kontra-aset)</td></tr>
<tr><td><strong>2. Kewajiban (Liabilities)</strong></td><td>Neraca</td><td>Utang Usaha, Utang Gaji, Utang Bank, Pendapatan Diterima Dimuka</td></tr>
<tr><td><strong>3. Ekuitas (Equity)</strong></td><td>Neraca &amp; Laporan Perubahan Ekuitas</td><td>Modal Pemilik, Prive, Laba Ditahan (untuk PT)</td></tr>
<tr><td><strong>4. Pendapatan (Revenue)</strong></td><td>Laporan Laba Rugi</td><td>Penjualan, Pendapatan Jasa, Pendapatan Bunga</td></tr>
<tr><td><strong>5. Beban (Expense)</strong></td><td>Laporan Laba Rugi</td><td>Harga Pokok Penjualan, Beban Gaji, Beban Sewa, Beban Penyusutan, Beban Utilitas</td></tr>
</tbody>
</table></div>
<p>Aset dan Kewajiban umumnya dipecah lagi menjadi <strong>lancar</strong> — diharapkan cair/jatuh tempo dalam 12 bulan setelah akhir periode pelaporan (atau dalam siklus operasi normal) — dan <strong>tidak lancar/jangka panjang</strong>.</p>
<ul>
<li><strong>Aset Lancar:</strong> Kas, Piutang Usaha, Persediaan, Perlengkapan, Beban Dibayar Dimuka.</li>
<li><strong>Aset Tetap (Tidak Lancar):</strong> Peralatan, Kendaraan, Bangunan, Tanah — dilaporkan setelah dikurangi Akumulasi Penyusutan.</li>
<li><strong>Kewajiban Lancar:</strong> Utang Usaha, Utang Gaji, Utang Pajak, bagian utang bank yang jatuh tempo tahun ini.</li>
<li><strong>Kewajiban Jangka Panjang:</strong> Utang Bank/Obligasi yang jatuh tempo lebih dari satu tahun.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Tips Mengingat</span>Akun kontra (misalnya "Akumulasi Penyusutan") saldo normalnya berlawanan dari induknya — meski sama-sama masuk kelompok Aset, saldo normal akun ini kredit (mengurangi nilai aset), bukan debit.</div>`,
          sources: [
            { type: 'psak', ref: 'PSAK 201 Penyajian Laporan Keuangan (dahulu PSAK 1; penomoran baru efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/PSAK-Umum/7' },
            { type: 'standar', ref: 'PSAK 201 — klasifikasi lancar/tidak lancar (12 bulan atau siklus operasi normal)' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'debit-kredit',
          heading: '1.4 Aturan Debit dan Kredit',
          noSourceNeeded: 'Konvensi pencatatan berpasangan (saldo normal); bukan ketentuan regulasi',
          body: `
<p class="kb-lead">Inilah tabel paling penting yang wajib dihafal luar kepala oleh siapa pun yang belajar akuntansi:</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Kategori Akun</th><th>Saldo Normal</th><th>Bertambah (+)</th><th>Berkurang (−)</th></tr></thead>
<tbody>
<tr><td>Aset</td><td>Debit</td><td>Debit</td><td>Kredit</td></tr>
<tr><td>Beban</td><td>Debit</td><td>Debit</td><td>Kredit</td></tr>
<tr><td>Prive</td><td>Debit</td><td>Debit</td><td>Kredit</td></tr>
<tr><td>Kewajiban</td><td>Kredit</td><td>Kredit</td><td>Debit</td></tr>
<tr><td>Ekuitas / Modal Pemilik</td><td>Kredit</td><td>Kredit</td><td>Debit</td></tr>
<tr><td>Pendapatan</td><td>Kredit</td><td>Kredit</td><td>Debit</td></tr>
</tbody>
</table></div>
<div class="kb-tip"><span class="kb-callout-title">💡 Mnemonic "ADE + KEP"</span>Saldo normal Debit: <strong>A</strong>set, <strong>D</strong>rawing/prive, <strong>E</strong>xpense/beban. Saldo normal Kredit: <strong>K</strong>ewajiban, <strong>E</strong>kuitas, <strong>P</strong>endapatan.</div>
<p>Berikut penerapannya pada tiga transaksi umum:</p>
<div class="kb-journal"><div class="kb-journal-caption">Contoh 1 — Membeli perlengkapan kantor Rp2.000.000 tunai</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Perlengkapan</td><td class="kb-num">Rp2.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Kas</td><td></td><td class="kb-num">Rp2.000.000</td></tr>
</table></div>
<p style="margin-top:-8px;color:var(--kb-muted);font-size:13px;">Perlengkapan (Aset) bertambah → didebit. Kas (Aset) berkurang → dikredit.</p>
<div class="kb-journal"><div class="kb-journal-caption">Contoh 2 — Menerima pendapatan jasa tunai Rp5.000.000</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Kas</td><td class="kb-num">Rp5.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Pendapatan Jasa</td><td></td><td class="kb-num">Rp5.000.000</td></tr>
</table></div>
<p style="margin-top:-8px;color:var(--kb-muted);font-size:13px;">Kas (Aset) bertambah → didebit. Pendapatan Jasa bertambah → dikredit (sesuai saldo normalnya).</p>
<div class="kb-journal"><div class="kb-journal-caption">Contoh 3 — Membayar utang usaha Rp3.000.000</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Utang Usaha</td><td class="kb-num">Rp3.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Kas</td><td></td><td class="kb-num">Rp3.000.000</td></tr>
</table></div>
<p style="margin-top:-8px;color:var(--kb-muted);font-size:13px;">Utang Usaha (Kewajiban) berkurang → didebit (berlawanan dari saldo normal). Kas berkurang → dikredit.</p>`
        }
      ]
    },
    {
      id: 'laporan-keuangan',
      title: '2. Laporan Keuangan',
      sections: [
        {
          id: 'empat-laporan',
          heading: '2.1 Mengenal Empat Laporan Keuangan Utama',
          body: `
<p class="kb-lead">Ada empat laporan keuangan utama yang disusun di akhir periode akuntansi. Keempatnya saling terhubung membentuk satu cerita utuh tentang kesehatan keuangan perusahaan.</p>
<div class="kb-tip"><span class="kb-callout-title">💡 Kelengkapan menurut standar</span>PSAK 201 mensyaratkan satu set laporan keuangan lengkap: laporan posisi keuangan, laporan laba rugi dan penghasilan komprehensif lain, laporan perubahan ekuitas, laporan arus kas, <strong>dan Catatan atas Laporan Keuangan (CaLK)</strong>. SAK EMKM lebih ringkas (laporan posisi keuangan, laporan laba rugi, dan CaLK).</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Laporan</th><th>Nama Inggris</th><th>Menjawab Pertanyaan</th><th>Periode</th></tr></thead>
<tbody>
<tr><td>1. Laporan Laba Rugi</td><td>Statement of Profit or Loss</td><td>Apakah perusahaan untung atau rugi?</td><td>Untuk suatu periode (mis. 1 Jan – 31 Des 2025)</td></tr>
<tr><td>2. Laporan Perubahan Ekuitas</td><td>Statement of Changes in Equity</td><td>Mengapa modal pemilik berubah dari awal ke akhir periode?</td><td>Untuk suatu periode</td></tr>
<tr><td>3. Laporan Posisi Keuangan (Neraca)</td><td>Statement of Financial Position</td><td>Apa saja yang dimiliki &amp; diutangi perusahaan pada satu titik waktu?</td><td>Per tanggal tertentu (mis. 31 Des 2025)</td></tr>
<tr><td>4. Laporan Arus Kas</td><td>Statement of Cash Flows</td><td>Dari mana kas masuk dan ke mana kas keluar?</td><td>Untuk suatu periode</td></tr>
</tbody>
</table></div>
<p>Keempatnya saling terhubung (disebut <em>articulation</em> laporan keuangan):</p>
<ul>
<li><strong>Laba bersih</strong> dari Laporan Laba Rugi mengalir menjadi komponen penambah di <strong>Laporan Perubahan Ekuitas</strong>.</li>
<li><strong>Modal akhir</strong> dari Laporan Perubahan Ekuitas menjadi angka Ekuitas di <strong>Neraca</strong>.</li>
<li><strong>Saldo kas akhir</strong> di Laporan Arus Kas harus sama persis dengan akun <strong>Kas</strong> di Neraca.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Studi Kasus Berkelanjutan</span>Untuk memudahkan pemahaman, keempat laporan pada bab ini memakai <strong>satu contoh perusahaan yang sama</strong> — CV Mitra Sejahtera, usaha dagang, tahun buku 2025 — sehingga kamu bisa melihat langsung bagaimana angka-angkanya saling terhubung antar laporan.</div>`,
          sources: [
            { type: 'psak', ref: 'PSAK 201 Penyajian Laporan Keuangan (dahulu PSAK 1; penomoran baru efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/PSAK-Umum/7' },
            { type: 'standar', ref: 'SAK EMKM (IAI) — komponen laporan keuangan', note: 'dirujuk lewat sumber sekunder; cek teks SAK EMKM' },
            { type: 'standar', ref: 'IAI — Perubahan Penomoran PSAK dan ISAK dalam SAK Indonesia (efektif 1 Jan 2024)', note: 'hanya penomoran, substansi tidak berubah', url: 'https://web.iaiglobal.or.id/assets/files/file_publikasi/Komparasi%20Perubahan%20Penomoran%20PSAK%20ISAK%20SAK%20Indonesia_FINAL.pdf' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'laba-rugi',
          heading: '2.2 Laporan Laba Rugi (Statement of Profit or Loss)',
          body: `
<p class="kb-lead">Laporan Laba Rugi meringkas seluruh pendapatan dan beban perusahaan selama satu periode untuk menghasilkan angka laba (atau rugi) bersih.</p>
<div class="kb-formula">LABA BERSIH = PENDAPATAN − BEBAN</div>
<p><strong>Contoh jurnal terkait</strong> (mewakili pola transaksi yang berulang sepanjang tahun):</p>
<div class="kb-journal"><div class="kb-journal-caption">Penjualan barang dagang tunai Rp50.000.000, HPP Rp30.000.000 (metode perpetual)</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Kas</td><td class="kb-num">Rp50.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Penjualan</td><td></td><td class="kb-num">Rp50.000.000</td></tr>
<tr><td class="kb-jr-desc-d">(D) Harga Pokok Penjualan</td><td class="kb-num">Rp30.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Persediaan Barang Dagang</td><td></td><td class="kb-num">Rp30.000.000</td></tr>
</table></div>
<div class="kb-journal"><div class="kb-journal-caption">Membayar beban gaji karyawan tunai Rp7.500.000</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Beban Gaji</td><td class="kb-num">Rp7.500.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Kas</td><td></td><td class="kb-num">Rp7.500.000</td></tr>
</table></div>
<p>Setelah dikumpulkan sepanjang tahun dan disesuaikan, berikut Laporan Laba Rugi lengkap CV Mitra Sejahtera:</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th colspan="2">CV MITRA SEJAHTERA<br>Laporan Laba Rugi<br>Untuk Periode yang Berakhir 31 Desember 2025</th></tr></thead>
<tbody>
<tr><td>Penjualan</td><td class="kb-num">Rp610.000.000</td></tr>
<tr><td>Harga Pokok Penjualan</td><td class="kb-num">(Rp350.000.000)</td></tr>
<tr class="kb-subtotal-row"><td>Laba Kotor</td><td class="kb-num">Rp260.000.000</td></tr>
<tr><td style="padding-top:10px;"><strong>Beban Operasional:</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Beban Gaji</td><td class="kb-num">Rp90.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Beban Sewa</td><td class="kb-num">Rp36.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Beban Perlengkapan</td><td class="kb-num">Rp8.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Beban Penyusutan</td><td class="kb-num">Rp15.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Beban Utilitas</td><td class="kb-num">Rp11.000.000</td></tr>
<tr class="kb-subtotal-row"><td>Total Beban Operasional</td><td class="kb-num">(Rp160.000.000)</td></tr>
<tr class="kb-subtotal-row"><td>Laba Usaha (Sebelum Pajak)</td><td class="kb-num">Rp100.000.000</td></tr>
<tr><td>Beban Pajak Penghasilan (22%)</td><td class="kb-num">(Rp22.000.000)</td></tr>
<tr class="kb-total-row"><td>LABA BERSIH</td><td class="kb-num">Rp78.000.000</td></tr>
</tbody>
</table></div>
<p><strong>Penjelasan tiap pos:</strong></p>
<ul>
<li><strong>Penjualan</strong> — total nilai barang dagang yang terjual selama 2025, dicatat sebesar harga jual (bukan HPP-nya).</li>
<li><strong>Harga Pokok Penjualan (HPP)</strong> — nilai perolehan/beli dari barang yang terjual (bukan yang masih ada di gudang).</li>
<li><strong>Laba Kotor</strong> — selisih Penjualan dan HPP; margin dasar dari aktivitas jual-beli sebelum biaya operasional.</li>
<li><strong>Beban Operasional</strong> — seluruh biaya menjalankan usaha sehari-hari yang tidak berhubungan langsung dengan pembelian barang dagang.</li>
<li><strong>Beban Penyusutan</strong> — alokasi biaya pemakaian peralatan tahun ini; tidak melibatkan kas keluar tahun ini, tapi tetap diakui sebagai beban (basis akrual).</li>
<li><strong>Laba Usaha</strong> — hasil murni dari kegiatan operasional inti, sebelum pajak.</li>
<li><strong>Beban Pajak Penghasilan</strong> — kewajiban PPh Badan atas laba usaha (diilustrasikan dengan tarif umum PPh Badan 22% sesuai UU HPP; tarif efektif riil bisa berbeda tergantung fasilitas/insentif yang berlaku). Penyederhanaan: pada praktik, beban pajak menurut PSAK 212 terdiri dari pajak kini (dihitung dari laba fiskal setelah koreksi fiskal) dan pajak tangguhan, sehingga tidak selalu sama dengan 22% × laba akuntansi.</li>
<li><strong>Laba Bersih</strong> — hasil akhir yang akan menambah ekuitas pemilik lewat Laporan Perubahan Ekuitas.</li>
</ul>`,
          sources: [
            { type: 'psak', ref: 'PSAK 201 Penyajian Laporan Keuangan (dahulu PSAK 1; penomoran baru efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/PSAK-Umum/7' },
            { type: 'psak', ref: 'PSAK 212 Pajak Penghasilan (dahulu PSAK 46)', note: 'pajak kini + pajak tangguhan' },
            { type: 'uu', ref: 'UU 7/1983 (PPh) s.t.d.t.d. UU 7/2021 Pasal 17 ayat (1) huruf b (tarif PPh Badan 22%)' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'perubahan-ekuitas',
          heading: '2.3 Laporan Perubahan Ekuitas (Statement of Changes in Equity)',
          body: `
<p class="kb-lead">Laporan ini menjelaskan pergerakan modal pemilik dari awal sampai akhir periode — apa saja yang membuatnya bertambah atau berkurang.</p>
<div class="kb-formula">MODAL AKHIR = MODAL AWAL + LABA BERSIH − PRIVE</div>
<div class="kb-journal"><div class="kb-journal-caption">Contoh — Pemilik mengambil prive tunai Rp5.000.000 untuk kebutuhan pribadi</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Prive</td><td class="kb-num">Rp5.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Kas</td><td></td><td class="kb-num">Rp5.000.000</td></tr>
</table></div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th colspan="2">CV MITRA SEJAHTERA<br>Laporan Perubahan Ekuitas<br>Untuk Periode yang Berakhir 31 Desember 2025</th></tr></thead>
<tbody>
<tr><td>Modal Pemilik, 1 Januari 2025</td><td class="kb-num">Rp300.000.000</td></tr>
<tr><td>Tambah: Laba Bersih Tahun Berjalan</td><td class="kb-num">Rp78.000.000</td></tr>
<tr><td>Kurang: Prive Pemilik</td><td class="kb-num">(Rp28.000.000)</td></tr>
<tr class="kb-total-row"><td>Modal Pemilik, 31 Desember 2025</td><td class="kb-num">Rp350.000.000</td></tr>
</tbody>
</table></div>
<p><strong>Penjelasan tiap pos:</strong></p>
<ul>
<li><strong>Modal Pemilik, 1 Januari</strong> — saldo ekuitas dari akhir periode sebelumnya, menjadi saldo awal periode ini.</li>
<li><strong>Laba Bersih Tahun Berjalan</strong> — diambil langsung dari baris terakhir Laporan Laba Rugi.</li>
<li><strong>Prive Pemilik</strong> — total pengambilan pribadi sepanjang tahun; mengurangi ekuitas karena bukan biaya usaha, melainkan pembagian kekayaan ke pemilik.</li>
<li><strong>Modal Pemilik, 31 Desember</strong> — saldo akhir yang akan muncul di sisi Ekuitas pada Neraca.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Catatan</span>Untuk Perseroan Terbatas (PT), pos "Modal Pemilik" dan "Prive" pada laporan ini biasanya digantikan "Saldo Laba (Laba Ditahan)" dan "Dividen", dengan logika penambahan/pengurangan yang sama.</div>`,
          sources: [
            { type: 'psak', ref: 'PSAK 201 Penyajian Laporan Keuangan (dahulu PSAK 1; penomoran baru efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/PSAK-Umum/7' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'neraca',
          heading: '2.4 Laporan Posisi Keuangan / Neraca (Statement of Financial Position)',
          body: `
<p class="kb-lead">Neraca adalah "foto" kondisi keuangan perusahaan pada satu titik waktu — memuat seluruh aset, kewajiban, dan ekuitas per tanggal tertentu.</p>
<div class="kb-formula">ASET = KEWAJIBAN + EKUITAS</div>
<div class="kb-journal"><div class="kb-journal-caption">Contoh — Membeli peralatan kantor tunai Rp25.000.000</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Peralatan</td><td class="kb-num">Rp25.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Kas</td><td></td><td class="kb-num">Rp25.000.000</td></tr>
</table></div>
<div class="kb-journal"><div class="kb-journal-caption">Ayat jurnal penyesuaian — penyusutan peralatan akhir tahun Rp15.000.000</div>
<table class="kb-journal-table">
<tr><td class="kb-jr-desc-d">(D) Beban Penyusutan</td><td class="kb-num">Rp15.000.000</td><td></td></tr>
<tr><td class="kb-jr-desc-k">(K) &nbsp;&nbsp;Akumulasi Penyusutan Peralatan</td><td></td><td class="kb-num">Rp15.000.000</td></tr>
</table></div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th colspan="2">CV MITRA SEJAHTERA<br>Laporan Posisi Keuangan (Neraca)<br>Per 31 Desember 2025</th></tr></thead>
<tbody>
<tr><td style="padding-top:10px;"><strong>ASET LANCAR</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Kas</td><td class="kb-num">Rp190.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Piutang Usaha</td><td class="kb-num">Rp45.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Persediaan Barang Dagang</td><td class="kb-num">Rp60.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Perlengkapan</td><td class="kb-num">Rp5.000.000</td></tr>
<tr class="kb-subtotal-row"><td>Total Aset Lancar</td><td class="kb-num">Rp300.000.000</td></tr>
<tr><td style="padding-top:10px;"><strong>ASET TETAP</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Peralatan</td><td class="kb-num">Rp120.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Akumulasi Penyusutan Peralatan</td><td class="kb-num">(Rp30.000.000)</td></tr>
<tr class="kb-subtotal-row"><td>Total Aset Tetap</td><td class="kb-num">Rp90.000.000</td></tr>
<tr class="kb-total-row"><td>TOTAL ASET</td><td class="kb-num">Rp390.000.000</td></tr>
<tr><td style="padding-top:14px;"><strong>KEWAJIBAN LANCAR</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Utang Usaha</td><td class="kb-num">Rp30.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Utang Gaji</td><td class="kb-num">Rp10.000.000</td></tr>
<tr class="kb-subtotal-row"><td>Total Kewajiban</td><td class="kb-num">Rp40.000.000</td></tr>
<tr><td style="padding-top:10px;"><strong>EKUITAS</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Modal Pemilik (per Laporan Perubahan Ekuitas)</td><td class="kb-num">Rp350.000.000</td></tr>
<tr class="kb-total-row"><td>TOTAL KEWAJIBAN + EKUITAS</td><td class="kb-num">Rp390.000.000</td></tr>
</tbody>
</table></div>
<div class="kb-tip"><span class="kb-callout-title">✅ Selalu Periksa</span>Total Aset (Rp390.000.000) persis sama dengan Total Kewajiban + Ekuitas (Rp390.000.000), dan Modal Pemilik (Rp350.000.000) persis sama dengan "Modal Pemilik, 31 Desember 2025" pada Laporan Perubahan Ekuitas. Kalau neraca tidak <em>balance</em>, pasti ada transaksi yang salah dicatat.</div>
<p><strong>Penjelasan tiap pos:</strong></p>
<ul>
<li><strong>Aset Lancar</strong> — aset yang diperkirakan menjadi kas atau habis terpakai dalam waktu satu tahun.</li>
<li><strong>Aset Tetap</strong> — aset berwujud untuk operasi jangka panjang, dilaporkan sebesar nilai tercatat (harga perolehan dikurangi akumulasi penyusutan dan akumulasi rugi penurunan nilai bila ada).</li>
<li><strong>Akumulasi Penyusutan</strong> — akun kontra-aset yang mengurangi nilai Peralatan sebesar total penyusutan yang diakui sejak awal dipakai.</li>
<li><strong>Kewajiban Lancar</strong> — utang yang jatuh tempo dalam satu tahun ke depan.</li>
<li><strong>Ekuitas</strong> — diambil langsung dari baris terakhir Laporan Perubahan Ekuitas.</li>
</ul>`,
          sources: [
            { type: 'psak', ref: 'PSAK 201 Penyajian Laporan Keuangan (dahulu PSAK 1; penomoran baru efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/PSAK-Umum/7' },
            { type: 'psak', ref: 'PSAK 216 Aset Tetap (dahulu PSAK 16) — nilai tercatat', note: 'dicocokkan dengan penomoran IAI; isi pasal dari pengetahuan umum' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'arus-kas',
          heading: '2.5 Laporan Arus Kas (Statement of Cash Flows)',
          body: `
<p class="kb-lead">Laporan Arus Kas menjelaskan dari mana kas benar-benar masuk dan ke mana kas benar-benar keluar sepanjang periode — dipecah menjadi tiga aktivitas: <strong>Operasi, Investasi, dan Pendanaan</strong>.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Aktivitas</th><th>Contoh Arus Kas Masuk</th><th>Contoh Arus Kas Keluar</th></tr></thead>
<tbody>
<tr><td><strong>Operasi</strong></td><td>Penerimaan dari pelanggan</td><td>Pembayaran ke pemasok, gaji, pajak</td></tr>
<tr><td><strong>Investasi</strong></td><td>Penjualan aset tetap</td><td>Pembelian peralatan/aset tetap</td></tr>
<tr><td><strong>Pendanaan</strong></td><td>Penerimaan pinjaman bank / setoran modal</td><td>Pembayaran pokok pinjaman, prive/dividen</td></tr>
</tbody>
</table></div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th colspan="2">CV MITRA SEJAHTERA<br>Laporan Arus Kas<br>Untuk Periode yang Berakhir 31 Desember 2025</th></tr></thead>
<tbody>
<tr><td style="padding-top:10px;"><strong>ARUS KAS DARI AKTIVITAS OPERASI</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Penerimaan dari Pelanggan</td><td class="kb-num">Rp600.000.000</td></tr>
<tr><td>&nbsp;&nbsp;Pembayaran kepada Pemasok</td><td class="kb-num">(Rp360.000.000)</td></tr>
<tr><td>&nbsp;&nbsp;Pembayaran Gaji Karyawan</td><td class="kb-num">(Rp80.000.000)</td></tr>
<tr><td>&nbsp;&nbsp;Pembayaran Beban Operasional Lainnya</td><td class="kb-num">(Rp55.000.000)</td></tr>
<tr><td>&nbsp;&nbsp;Pembayaran Pajak Penghasilan</td><td class="kb-num">(Rp22.000.000)</td></tr>
<tr class="kb-subtotal-row"><td>Kas Bersih dari Aktivitas Operasi</td><td class="kb-num">Rp83.000.000</td></tr>
<tr><td style="padding-top:10px;"><strong>ARUS KAS DARI AKTIVITAS INVESTASI</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Pembelian Peralatan</td><td class="kb-num">(Rp25.000.000)</td></tr>
<tr class="kb-subtotal-row"><td>Kas Bersih untuk Aktivitas Investasi</td><td class="kb-num">(Rp25.000.000)</td></tr>
<tr><td style="padding-top:10px;"><strong>ARUS KAS DARI AKTIVITAS PENDANAAN</strong></td><td></td></tr>
<tr><td>&nbsp;&nbsp;Prive Pemilik</td><td class="kb-num">(Rp28.000.000)</td></tr>
<tr class="kb-subtotal-row"><td>Kas Bersih untuk Aktivitas Pendanaan</td><td class="kb-num">(Rp28.000.000)</td></tr>
<tr class="kb-subtotal-row"><td>Kenaikan Bersih Kas</td><td class="kb-num">Rp30.000.000</td></tr>
<tr><td>Kas Awal, 1 Januari 2025</td><td class="kb-num">Rp160.000.000</td></tr>
<tr class="kb-total-row"><td>Kas Akhir, 31 Desember 2025</td><td class="kb-num">Rp190.000.000</td></tr>
</tbody>
</table></div>
<div class="kb-tip"><span class="kb-callout-title">✅ Selalu Periksa</span>"Kas Akhir, 31 Desember 2025" (Rp190.000.000) harus persis sama dengan akun Kas di Neraca. Ini pemeriksaan silang terakhir yang membuktikan keempat laporan benar-benar terhubung.</div>
<p><strong>Penjelasan tiap pos:</strong></p>
<ul>
<li><strong>Kas Bersih dari Aktivitas Operasi</strong> — mencerminkan kemampuan usaha inti menghasilkan kas; idealnya positif dan cukup besar pada perusahaan yang sehat.</li>
<li><strong>Kas Bersih untuk Aktivitas Investasi</strong> — biasanya negatif pada perusahaan yang sedang bertumbuh (banyak membeli aset tetap baru).</li>
<li><strong>Kas Bersih untuk Aktivitas Pendanaan</strong> — mencerminkan hubungan finansial dengan pemilik/kreditur.</li>
<li><strong>Kas Awal &amp; Kas Akhir</strong> — kas awal diambil dari saldo akhir tahun sebelumnya; kas akhir harus sama dengan akun Kas di Neraca tahun berjalan.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Metode penyajian</span>Contoh di atas memakai <strong>metode langsung</strong> (penerimaan dan pembayaran kas utama disebut satu per satu). PSAK 207 juga membolehkan <strong>metode tidak langsung</strong>, yang dimulai dari laba dan menyesuaikannya dengan pos non-kas dan perubahan modal kerja; hasil kas operasinya sama.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Perhatikan</span>Laba bersih (Rp78.000.000) <strong>tidak sama</strong> dengan kenaikan kas bersih (Rp30.000.000) — dan itu wajar. Laba dihitung dengan basis akrual (termasuk transaksi non-kas seperti penyusutan Rp15.000.000, serta penjualan/pembelian yang belum tuntas dibayar), sedangkan Laporan Arus Kas murni mencatat pergerakan kas fisik.</div>`,
          sources: [
            { type: 'psak', ref: 'PSAK 207 Laporan Arus Kas (dahulu PSAK 2) — aktivitas operasi/investasi/pendanaan; metode langsung & tidak langsung' },
            { type: 'standar', ref: 'IAI — Perubahan Penomoran PSAK dan ISAK dalam SAK Indonesia (efektif 1 Jan 2024)', note: 'hanya penomoran, substansi tidak berubah', url: 'https://web.iaiglobal.or.id/assets/files/file_publikasi/Komparasi%20Perubahan%20Penomoran%20PSAK%20ISAK%20SAK%20Indonesia_FINAL.pdf' }
          ],
          reviewed: '2026-10'
        }
      ]
    },
    {
      id: 'siklus-akhir-periode',
      title: '3. Siklus Akhir Periode',
      sections: [
        {
          id: 'jurnal-penyesuaian',
          heading: '3.1 Jurnal Penyesuaian Akhir Periode',
          body: `
<p class="kb-lead">Karena memakai <strong>basis akrual</strong>, pendapatan dan beban diakui pada periode terjadinya, bukan saat kas bergerak. Jurnal penyesuaian di akhir periode memastikan itu tercapai.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Jenis</th><th>Kasus (tutup buku 31 Des)</th><th>Jurnal penyesuaian</th></tr></thead>
<tbody>
<tr><td><strong>Beban dibayar dimuka</strong></td><td>Sewa Rp12.000.000 dibayar 1 Okt untuk 12 bulan; yang sudah terpakai 3 bulan</td><td>Dr Beban Sewa 3.000.000<br>Cr Sewa Dibayar Dimuka 3.000.000</td></tr>
<tr><td><strong>Pendapatan diterima dimuka</strong></td><td>Terima Rp6.000.000 pada 1 Nov untuk jasa 6 bulan; yang sudah menjadi hak 2 bulan</td><td>Dr Pendapatan Diterima Dimuka 2.000.000<br>Cr Pendapatan Jasa 2.000.000</td></tr>
<tr><td><strong>Beban yang masih harus dibayar</strong></td><td>Gaji Desember Rp4.000.000 belum dibayar</td><td>Dr Beban Gaji 4.000.000<br>Cr Utang Gaji 4.000.000</td></tr>
<tr><td><strong>Pendapatan yang masih harus diterima</strong></td><td>Jasa Rp5.000.000 sudah selesai tetapi belum ditagih</td><td>Dr Piutang Usaha 5.000.000<br>Cr Pendapatan Jasa 5.000.000</td></tr>
</tbody></table></div>
<ul>
  <li>Penyusutan aset tetap juga merupakan jurnal penyesuaian (lihat 3.2).</li>
  <li>Setiap jurnal penyesuaian menyentuh <strong>satu akun laporan posisi keuangan</strong> dan <strong>satu akun laba rugi</strong>; tidak pernah kas.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Cara cepat</span>Tanya dua hal: <em>apakah kas sudah bergerak?</em> dan <em>apakah haknya/kewajibannya sudah terjadi?</em> Selisih keduanya yang dijurnal.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Pajak</span>Pendapatan yang diakui secara akrual belum tentu sama waktunya dengan pengakuan secara fiskal; perbedaannya diselesaikan lewat rekonsiliasi fiskal (lihat modul SPT).</div>`,
          sources: [
            { type: 'standar', ref: 'Kerangka Konseptual Pelaporan Keuangan (SAK Indonesia) — dasar akrual' },
            { type: 'psak', ref: 'PSAK 201 Penyajian Laporan Keuangan (dahulu PSAK 1)', url: 'https://web.iaiglobal.or.id/PSAK-Umum/7' },
            { type: 'psak', ref: 'PSAK 115 Pendapatan dari Kontrak dengan Pelanggan (dahulu PSAK 72)', note: 'pendapatan diakui saat kewajiban pelaksanaan dipenuhi; penomoran dicocokkan dengan IAI' }
          ]
        },
        {
          id: 'aset-tetap-penyusutan',
          heading: '3.2 Aset Tetap & Penyusutan',
          body: `
<p class="kb-lead">Aset tetap dicatat sebesar biaya perolehan, lalu biaya perolehan dikurangi nilai residu <strong>dialokasikan</strong> sebagai beban penyusutan selama umur manfaatnya. Penyusutan dimulai saat aset siap digunakan.</p>
<div class="kb-formula">Garis lurus = (Biaya perolehan − Nilai residu) ÷ Umur manfaat<br>Saldo menurun = Tarif × Nilai tercatat awal tahun</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span>
Peralatan Rp120.000.000, nilai residu Rp20.000.000, umur 5 tahun.<br>
<strong>Garis lurus:</strong> (120 − 20) ÷ 5 = Rp20.000.000 per tahun.<br>
<strong>Saldo menurun ganda</strong> (tarif 2 × 20% = 40%): tahun 1 = 40% × 120.000.000 = Rp48.000.000; tahun 2 = 40% × (120.000.000 − 48.000.000) = Rp28.800.000.
</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Tahun</th><th>Garis lurus</th><th>Nilai tercatat akhir (GL)</th><th>Saldo menurun ganda</th></tr></thead>
<tbody>
<tr><td>1</td><td>20.000.000</td><td>100.000.000</td><td>48.000.000</td></tr>
<tr><td>2</td><td>20.000.000</td><td>80.000.000</td><td>28.800.000</td></tr>
</tbody></table></div>
<ul>
  <li>Jurnal: Dr Beban Penyusutan, Cr Akumulasi Penyusutan. Akumulasi penyusutan adalah akun pengurang aset di neraca.</li>
  <li>PSAK 216 membolehkan beberapa metode (garis lurus, saldo menurun, unit produksi); pilih yang paling mencerminkan pola pemakaian manfaat dan terapkan konsisten.</li>
  <li>Tanah umumnya tidak disusutkan.</li>
</ul>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Akuntansi ≠ pajak</span>Pajak memakai kelompok masa manfaat fiskal (Pasal 11 UU PPh), misalnya laptop Kelompok 1 dengan garis lurus 25%. Selisihnya menjadi koreksi fiskal; lihat modul SPT, "Penyusutan fiskal".</div>`,
          sources: [
            { type: 'psak', ref: 'PSAK 216 Aset Tetap (dahulu PSAK 16)', note: 'metode penyusutan, mulai saat siap digunakan; isi paragraf dari pengetahuan umum (IAS 16), penomoran dicocokkan dengan IAI' },
            { type: 'standar', ref: 'IAI — Perubahan Penomoran PSAK dan ISAK dalam SAK Indonesia (efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/assets/files/file_publikasi/Komparasi%20Perubahan%20Penomoran%20PSAK%20ISAK%20SAK%20Indonesia_FINAL.pdf' }
          ]
        },
        {
          id: 'piutang-tak-tertagih',
          heading: '3.3 Piutang Tak Tertagih',
          body: `
<p class="kb-lead">Tidak semua piutang usaha akan tertagih. Agar piutang tidak tersaji terlalu tinggi, perusahaan mengestimasi bagian yang tidak tertagih lewat <strong>penyisihan</strong>.</p>
<ul>
  <li><strong>Penyisihan</strong> (estimasi): Dr Beban Kerugian Piutang, Cr Penyisihan Piutang Tak Tertagih (akun pengurang piutang).</li>
  <li><strong>Penghapusan</strong> (saat pasti tak tertagih): Dr Penyisihan Piutang Tak Tertagih, Cr Piutang Usaha. Piutang neto tidak berubah.</li>
</ul>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh (metode umur piutang)</span>
Piutang usaha akhir tahun Rp200.000.000; estimasi tak tertagih 3% = Rp6.000.000.<br>
Saldo penyisihan sebelum penyesuaian (kredit) = Rp1.500.000.<br>
Beban tahun ini = 6.000.000 − 1.500.000 = <strong>Rp4.500.000</strong>.<br>
Dr Beban Kerugian Piutang 4.500.000 · Cr Penyisihan Piutang Tak Tertagih 4.500.000.
</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Catatan standar</span>Entitas yang menerapkan PSAK 109 (dahulu PSAK 71) memakai model kerugian kredit ekspektasian (ECL). Materi ini memakai pendekatan sederhana (persentase/umur piutang) untuk pembelajaran.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Pajak</span>Penyisihan piutang pada umumnya tidak otomatis menjadi biaya fiskal; yang diakui adalah piutang yang nyata-nyata tidak dapat ditagih dan memenuhi syarat (Pasal 6 ayat (1) huruf h UU PPh dan peraturan pelaksananya). Selisihnya menjadi koreksi fiskal.</div>`,
          sources: [
            { type: 'psak', ref: 'PSAK 109 Instrumen Keuangan (dahulu PSAK 71) — kerugian kredit ekspektasian', note: 'penomoran dicocokkan dengan IAI' },
            { type: 'uu', ref: 'UU 7/1983 (PPh) Pasal 6 ayat (1) huruf h', note: 'dari pengetahuan umum; cek juga PMK 105/PMK.03/2009 tentang piutang tak tertagih' },
            { type: 'standar', ref: 'IAI — Perubahan Penomoran PSAK dan ISAK dalam SAK Indonesia (efektif 1 Jan 2024)', url: 'https://web.iaiglobal.or.id/assets/files/file_publikasi/Komparasi%20Perubahan%20Penomoran%20PSAK%20ISAK%20SAK%20Indonesia_FINAL.pdf' }
          ]
        }
      ]
    }
  ]
};
