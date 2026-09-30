/**
 * Tax Knowledge Center — SPT (Simulator SPT Pajak Indonesia)
 * KnowledgeBase.open(window.KNOWLEDGE_CONTENT_SPT)
 *
 * Struktur: TOPIK (chapter) → subtopik (sections, tersembunyi sampai TOPIK dibuka).
 * Konten SP2DK dipertahankan & dilengkapi domain pajak lain.
 */
window.KNOWLEDGE_CONTENT_SPT = {
  title: 'Tax Knowledge Center — Pajak Indonesia',
  subtitle: 'Referensi ringkas: hitung, laporkan, patuhi, hadapi SP2DK & ketetapan',
  appAccent: '#004b87',
  chapters: [

    {
      id: 'dasar-perpajakan',
      title: 'Dasar Perpajakan Indonesia',
      sections: [
        {
          id: 'asas-self-assessment',
          heading: 'Self-assessment & kewajiban WP',
          body: `
<p class="kb-lead">Sistem perpajakan Indonesia menganut <strong>self-assessment</strong>: Wajib Pajak menghitung, memperhitungkan, membayar, dan melaporkan sendiri pajak terutang.</p>
<div class="kb-quickfact">
  <div class="kb-quickfact-item"><div class="qf-label">Prinsip</div><div class="qf-value">Hitung sendiri</div></div>
  <div class="kb-quickfact-item"><div class="qf-label">Peran DJP</div><div class="qf-value">Pengawasan & penegakan</div></div>
  <div class="kb-quickfact-item"><div class="qf-label">Risiko</div><div class="qf-value">Koreksi, sanksi, SP2DK</div></div>
</div>
<ul>
  <li>Daftar NPWP bila memenuhi syarat subjektif & objektif.</li>
  <li>Menyimpan dokumen pembukuan/pencatatan sesuai ketentuan.</li>
  <li>Menyampaikan SPT benar, lengkap, jelas, dan tepat waktu.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡 Tips compliance</span>Kesalahan paling sering: menganggap “belum ditagih = belum wajib”. Dalam self-assessment, kewajiban lahir dari UU, bukan dari surat tagihan.</div>
<p class="kb-legal">Dasar: UU KUP, UU PPh, UU PPN (sebagaimana diubah UU HPP).</p>`
        },
        {
          id: 'jenis-pajak-utama',
          heading: 'Peta jenis pajak utama',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Jenis</th><th>Objek singkat</th><th>Siapa yang biasanya bayar/setor</th></tr></thead>
<tbody>
<tr><td><strong>PPh Orang Pribadi</strong></td><td>Penghasilan neto setahun</td><td>OP (karyawan via pemotong; usaha sendiri)</td></tr>
<tr><td><strong>PPh Badan</strong></td><td>PKP badan</td><td>PT, CV, koperasi, dll.</td></tr>
<tr><td><strong>PPh Pasal 21/26</strong></td><td>Penghasilan karyawan & sejenis</td><td>Pemotong (pemberi kerja)</td></tr>
<tr><td><strong>PPh Pasal 23/4(2)</strong></td><td>Jasa, sewa, bunga, dividen, dll.</td><td>Pemotong / final</td></tr>
<tr><td><strong>PPN</strong></td><td>Penyerahan BKP/JKP</td><td>PKP</td></tr>
</tbody></table></div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Hubungan antaraturan</span>Satu transaksi bisa memicu beberapa pajak sekaligus (mis. jual jasa: PPN + PPh 23).</div>`
        }
      ]
    },

    {
      id: 'ptkp-tarif-op',
      title: 'PTKP & Tarif PPh Orang Pribadi',
      sections: [
        {
          id: 'ptkp-dasar',
          heading: 'PTKP (Penghasilan Tidak Kena Pajak)',
          body: `
<p class="kb-lead">PTKP mengurangi penghasilan neto sebelum dihitung PKP.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Status</th><th>PTKP / tahun (umum)</th></tr></thead>
<tbody>
<tr><td>TK/0</td><td>Rp 54.000.000</td></tr>
<tr><td>TK/1 atau K/0</td><td>Rp 58.500.000</td></tr>
<tr><td>TK/2 atau K/1</td><td>Rp 63.000.000</td></tr>
<tr><td>TK/3 atau K/2</td><td>Rp 67.500.000</td></tr>
<tr><td>K/3</td><td>Rp 72.000.000</td></tr>
</tbody></table></div>
<div class="kb-formula">PKP ≈ Penghasilan neto setahun − PTKP</div>`
        },
        {
          id: 'tarif-progresif-17',
          heading: 'Tarif progresif Pasal 17 (OP)',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Lapisan PKP</th><th>Tarif</th></tr></thead>
<tbody>
<tr><td>s.d. Rp 60 juta</td><td>5%</td></tr>
<tr><td>&gt; Rp 60 jt – 250 jt</td><td>15%</td></tr>
<tr><td>&gt; Rp 250 jt – 500 jt</td><td>25%</td></tr>
<tr><td>&gt; Rp 500 jt – 5 miliar</td><td>30%</td></tr>
<tr><td>&gt; Rp 5 miliar</td><td>35%</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span>
PKP Rp 100 juta → (60 jt × 5%) + (40 jt × 15%) = <strong>Rp 9 juta</strong>.
</div>
<p class="kb-legal">Sesuai UU PPh sebagaimana diubah UU HPP — cocokkan dengan tahun pajak terkait.</p>`
        }
      ]
    },

    {
      id: 'pph21-ter',
      title: 'PPh Pasal 21 & Skema TER',
      sections: [
        {
          id: 'ter-konsep',
          heading: 'Apa itu TER?',
          body: `
<p class="kb-lead"><strong>Tarif Efektif Rata-rata (TER)</strong> dipakai untuk PPh 21 masa <strong>Januari–November</strong>. Desember memakai progresif (koreksi setahun).</p>
<ul>
  <li>Kategori TER (A/B/C) mengikuti PTKP karyawan.</li>
  <li>Tarif ditentukan bruto bulanan di tabel TER.</li>
  <li>Tarif berlaku ke <em>seluruh</em> bruto bulan itu.</li>
</ul>
<div class="kb-formula">PPh 21 (Jan–Nov) ≈ Bruto bulanan × Tarif TER lapisan</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ THR / bonus</span>THR menambah bruto bulan dibayar → sering loncat lapisan TER. Akhir tahun dikoreksi progresif Pasal 17.</div>
<p class="kb-legal">PP 58/2023 dan PMK terkait.</p>`
        },
        {
          id: 'biaya-jabatan',
          heading: 'Biaya jabatan & pengurang karyawan',
          body: `
<ul>
  <li><strong>Biaya jabatan</strong>: 5% dari bruto, maks. Rp 6.000.000 / tahun.</li>
  <li>Iuran pensiun / BPJS sesuai ketentuan yang boleh dikurangkan.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Cicilan KPR atau biaya hidup pribadi tidak otomatis jadi pengurang PPh 21. Pengurang bersifat limitatif.</div>`
        }
      ]
    },

    {
      id: 'pph-badan-umkm',
      title: 'PPh Badan & Fasilitas UMKM',
      sections: [
        {
          id: 'tarif-badan',
          heading: 'Tarif PPh Badan & Pasal 31E',
          body: `
<p class="kb-lead">Tarif umum PPh Badan <strong>22%</strong>. Fasilitas Pasal 31E untuk peredaran bruto tertentu.</p>
<ul>
  <li>Peredaran ≤ Rp 50 M: diskon 50% tarif atas bagian PKP proporsional Rp 4,8 M pertama peredaran.</li>
  <li>Peredaran ≤ Rp 4,8 M: fasilitas penuh (efektif 11% jika tarif 22%).</li>
</ul>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span>
Peredaran Rp 4,8 M, PKP Rp 1 M → PPh ≈ <strong>Rp 110 juta</strong> (11%).
</div>`
        },
        {
          id: 'pph-final-umkm',
          heading: 'PPh Final UMKM 0,5%',
          body: `
<div class="kb-formula">PPh Final UMKM = 0,5% × Peredaran bruto</div>
<ul>
  <li>Opsional bagi WP dengan batas peredaran & jangka waktu tertentu.</li>
  <li>Bersifat final; perhatikan masa berlaku fasilitas untuk badan.</li>
</ul>
<p class="kb-legal">PP 55/2022 dan aturan terkait.</p>`
        }
      ]
    },

    {
      id: 'pasal-cara-hitung',
      title: 'Pasal Penting & Cara Hitung',
      sections: [
        {
          id: 'pasal-kup',
          heading: 'Pasal kunci UU KUP',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Pasal</th><th>Isi pokok</th></tr></thead>
<tbody>
<tr><td><strong>Pasal 2</strong></td><td>Wajib daftar NPWP bila syarat subjektif & objektif terpenuhi (self-assessment).</td></tr>
<tr><td><strong>Pasal 3</strong></td><td>SPT harus benar, lengkap, jelas, dan tepat waktu.</td></tr>
<tr><td><strong>Pasal 7</strong></td><td>Sanksi keterlambatan SPT (Rp100rb–Rp1jt tergantung jenis).</td></tr>
<tr><td><strong>Pasal 8</strong></td><td>Pembetulan SPT atas kemauan sendiri (sebelum pemeriksaan).</td></tr>
<tr><td><strong>Pasal 9–10</strong></td><td>Pembayaran/penyetoran; bunga keterlambatan.</td></tr>
<tr><td><strong>Pasal 13–15</strong></td><td>Penerbitan SKP (ketetapan) oleh DJP.</td></tr>
<tr><td><strong>Pasal 17</strong></td><td>Pengawasan kepatuhan, termasuk SP2DK.</td></tr>
<tr><td><strong>Pasal 35A</strong></td><td>Instansi/lembaga wajib memberi data ke DJP.</td></tr>
</tbody></table></div>`
        },
        {
          id: 'pasal-pph',
          heading: 'Pasal kunci UU PPh',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Pasal</th><th>Isi pokok</th></tr></thead>
<tbody>
<tr><td><strong>Pasal 4</strong></td><td>Objek: setiap tambahan kemampuan ekonomis (penghasilan).</td></tr>
<tr><td><strong>Pasal 6</strong></td><td>Biaya yang boleh dikurangkan (untuk mendapatkan/menagih/memelihara penghasilan).</td></tr>
<tr><td><strong>Pasal 7</strong></td><td>PTKP (TK/0 = Rp54 juta/tahun).</td></tr>
<tr><td><strong>Pasal 17 (1)a</strong></td><td>Tarif progresif OP 5%–35%.</td></tr>
<tr><td><strong>Pasal 17 (1)b</strong></td><td>Tarif PPh Badan 22%.</td></tr>
<tr><td><strong>Pasal 21</strong></td><td>Pemotongan atas penghasilan dari pekerjaan/jasa/kegiatan.</td></tr>
<tr><td><strong>Pasal 23</strong></td><td>Pemotongan dividen, bunga, royalti, sewa, jasa tertentu.</td></tr>
<tr><td><strong>Pasal 25</strong></td><td>Angsuran PPh dalam tahun berjalan.</td></tr>
<tr><td><strong>Pasal 26</strong></td><td>Pemotongan atas penghasilan WP luar negeri.</td></tr>
<tr><td><strong>Pasal 31E</strong></td><td>Fasilitas 50% tarif untuk badan peredaran ≤ Rp50 M (atas PKP s.d. Rp4,8 M).</td></tr>
</tbody></table></div>`
        },
        {
          id: 'pasal-ppn',
          heading: 'Pasal kunci UU PPN',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Pasal</th><th>Isi pokok</th></tr></thead>
<tbody>
<tr><td><strong>Pasal 1</strong></td><td>Definisi BKP, JKP, PKP, DPP, dll.</td></tr>
<tr><td><strong>Pasal 4</strong></td><td>Objek PPN: penyerahan BKP/JKP, impor, ekspor, dll.</td></tr>
<tr><td><strong>Pasal 7</strong></td><td>Tarif PPN 12% (sejak 1 Jan 2025). Barang/jasa umum efektif 11% via DPP Nilai Lain 11/12.</td></tr>
<tr><td><strong>Pasal 8A</strong></td><td>DPP Nilai Lain untuk jenis transaksi tertentu.</td></tr>
<tr><td><strong>Pasal 9</strong></td><td>Pajak Masukan dapat dikreditkan (syarat berlaku).</td></tr>
<tr><td><strong>Pasal 13</strong></td><td>Kewajiban membuat Faktur Pajak.</td></tr>
</tbody></table></div>`
        },
        {
          id: 'cara-hitung-op',
          heading: 'Cara hitung PPh Orang Pribadi',
          body: `
<p class="kb-lead">Penghasilan neto − PTKP = <strong>PKP</strong>. PKP dibulatkan ke bawah ke ribuan, lalu dikenakan tarif berlapis Pasal 17.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Lapisan PKP</th><th>Tarif</th></tr></thead>
<tbody>
<tr><td>s.d. Rp60 juta</td><td>5%</td></tr>
<tr><td>&gt; Rp60 jt – 250 jt</td><td>15%</td></tr>
<tr><td>&gt; Rp250 jt – 500 jt</td><td>25%</td></tr>
<tr><td>&gt; Rp500 jt – 5 miliar</td><td>30%</td></tr>
<tr><td>&gt; Rp5 miliar</td><td>35%</td></tr>
</tbody></table></div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span>
Penghasilan neto Rp300 juta, status K/1 (PTKP Rp63 juta).<br/>
PKP = 300 − 63 = <strong>Rp237 juta</strong><br/>
• 60 jt × 5% = Rp3.000.000<br/>
• 177 jt × 15% = Rp26.550.000<br/>
• <strong>PPh terutang = Rp29.550.000</strong>
</div>`
        },
        {
          id: 'cara-hitung-badan-umkm',
          heading: 'Cara hitung PPh Badan & UMKM',
          body: `
<p><strong>PPh Badan umum:</strong></p>
<div class="kb-formula">PPh Badan = PKP × 22%</div>
<p>Fasilitas Pasal 31E: badan peredaran ≤ Rp50 miliar → tarif efektif 11% atas bagian PKP yang proporsional dengan Rp4,8 miliar pertama.</p>
<p><strong>PPh Final UMKM 0,5%:</strong> (peredaran bruto ≤ Rp4,8 miliar, opsional)</p>
<div class="kb-formula">PPh Final = (Peredaran bruto − Rp500 juta*) × 0,5%<br/>*bagian s.d. Rp500 juta setahun tidak dikenai</div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Cek PP terbaru (termasuk PP 20/2026) untuk subjek yang masih boleh memakai final 0,5%.</div>`
        },
        {
          id: 'cara-hitung-ppn',
          heading: 'Cara hitung PPN (efektif 11%)',
          body: `
<p class="kb-lead">Tarif undang-undang <strong>12%</strong>. Untuk barang/jasa umum, DPP = 11/12 × harga → PPN efektif <strong>11%</strong>.</p>
<div class="kb-formula">DPP = 11/12 × Harga transaksi<br/>PPN = 12% × DPP  (= 11% × Harga)</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span>
Harga jual Rp10.000.000 (sebelum PPN)<br/>
DPP = 11/12 × 10.000.000 = Rp9.166.667<br/>
PPN = 12% × 9.166.667 = <strong>Rp1.100.000</strong><br/>
Total termasuk PPN = Rp11.100.000
</div>
<div class="kb-formula">PPN disetor = Pajak Keluaran − Pajak Masukan (yang dapat dikreditkan)</div>
<p class="kb-legal">Barang mewah (PPnBM) dapat dikenai 12% penuh; ikuti daftar resmi.</p>`
        }
      ]
    },

    {
      id: 'ppn',
      title: 'PPN — Dasar & DPP',
      sections: [
        {
          id: 'ppn-dasar',
          heading: 'Konsep PPN & tarif',
          body: `
<div class="kb-quickfact">
  <div class="kb-quickfact-item"><div class="qf-label">Tarif UU</div><div class="qf-value">12%</div></div>
  <div class="kb-quickfact-item"><div class="qf-label">Efektif umum</div><div class="qf-value">11%</div></div>
  <div class="kb-quickfact-item"><div class="qf-label">Mekanisme</div><div class="qf-value">Keluaran − Masukan</div></div>
</div>
<div class="kb-formula">PPN efektif = 11% × Harga  (via DPP = 11/12 × Harga, tarif 12%)</div>
<ul>
  <li><strong>Pajak Keluaran</strong>: dipungut saat menyerahkan BKP/JKP.</li>
  <li><strong>Pajak Masukan</strong>: dibayar saat perolehan; dikreditkan sesuai syarat.</li>
</ul>`
        },
        {
          id: 'dpp-nilai-lain',
          heading: 'DPP Nilai Lain',
          body: `
<p>Sebagian penyerahan memakai DPP nilai lain (mengikuti PMK, termasuk mekanisme 11/12 untuk tarif efektif 11%). Jangan mengarang DPP — hanya untuk jenis yang ditunjuk peraturan.</p>`
        }
      ]
    },

    {
      id: 'sanksi',
      title: 'Sanksi Administrasi & Bunga',
      sections: [
        {
          id: 'jenis-sanksi',
          heading: 'Jenis sanksi yang sering muncul',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Jenis</th><th>Kapan (umum)</th></tr></thead>
<tbody>
<tr><td>Denda terlambat SPT</td><td>SPT setelah jatuh tempo</td></tr>
<tr><td>Bunga / sanksi bunga</td><td>Kurang bayar, terlambat setor</td></tr>
<tr><td>Sanksi kenaikan</td><td>Pada ketetapan tertentu (pasal KUP)</td></tr>
</tbody></table></div>
<div class="kb-warning"><span class="kb-callout-title">⚠️</span>Tarif bunga fluktuatif — cek pengumuman di pajak.go.id, jangan pakai angka usang.</div>`
        },
        {
          id: 'tips-hindari-sanksi',
          heading: 'Tips menekan risiko sanksi',
          body: `
<ul>
  <li>Kalender kewajiban SPT & setoran.</li>
  <li>Rekonsiliasi omzet PPh ↔ PPN.</li>
  <li>Cocokkan bukti potong / faktur dengan data pihak ketiga.</li>
  <li>Pembetulan SPT jika temukan kesalahan sendiri.</li>
</ul>`
        }
      ]
    },

    {
      id: 'mengenal-sp2dk',
      title: 'SP2DK — Mengenal & Merespons',
      sections: [
        {
          id: 'apa-itu-sp2dk',
          heading: 'Apa itu SP2DK?',
          body: `
<p class="kb-lead"><strong>SP2DK</strong> adalah Surat Permintaan Penjelasan atas Data dan/atau Keterangan dari KPP.</p>
<div class="kb-tip"><span class="kb-callout-title">💡</span>SP2DK <strong>bukan</strong> ketetapan, <strong>bukan</strong> surat pemeriksaan, <strong>bukan</strong> vonis. Ini pengawasan tahap awal.</div>
<p>Dasar hukum yang dirujuk: <strong>PMK 111 Tahun 2025</strong>.</p>`
        },
        {
          id: 'jenis-sp2dk',
          heading: 'Pola indikasi penyebab SP2DK',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Pola</th><th>Penyebab umum</th></tr></thead>
<tbody>
<tr><td>Selisih omzet PPh vs PPN</td><td>Peredaran SPT PPh ≠ penyerahan SPT PPN</td></tr>
<tr><td>Faktur masukan tidak wajar</td><td>Kredit janggal / lawan transaksi bermasalah</td></tr>
<tr><td>Harta vs penghasilan</td><td>Harta tidak sebanding penghasilan</td></tr>
<tr><td>Data pihak ketiga</td><td>Bukti potong / data lain tidak di SPT</td></tr>
<tr><td>Beban tidak wajar</td><td>Rasio beban di atas pola industri</td></tr>
<tr><td>Transaksi afiliasi</td><td>Indikasi harga tidak arm's length</td></tr>
</tbody></table></div>`
        },
        {
          id: 'cara-merespons-sp2dk',
          heading: 'Cara merespons SP2DK',
          body: `
<ol>
  <li>Baca teliti — data diminta, tahun pajak, batas waktu.</li>
  <li>Rekonsiliasi internal (buku, SPT, faktur, bukti potong).</li>
  <li>Penjelasan tertulis + lampiran bukti.</li>
  <li>Jika kurang bayar — pertimbangkan pembetulan + setor.</li>
  <li>Simpan bukti pengiriman respons.</li>
</ol>
<div class="kb-warning"><span class="kb-callout-title">⚠️</span>Mengabaikan SP2DK memperbesar risiko eskalasi.</div>`
        }
      ]
    },

    {
      id: 'surat-ketetapan',
      title: 'Surat Ketetapan Pajak',
      sections: [
        {
          id: 'jenis-ketetapan',
          heading: 'SKPKB, SKPKBT, SKPLB, SKPN',
          body: `
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Produk</th><th>Arti praktis</th></tr></thead>
<tbody>
<tr><td><strong>SKPKB</strong></td><td>Kurang bayar (+ sanksi sesuai pasal)</td></tr>
<tr><td><strong>SKPKBT</strong></td><td>Kurang bayar tambahan</td></tr>
<tr><td><strong>SKPLB</strong></td><td>Lebih bayar (restitusi/kompensasi)</td></tr>
<tr><td><strong>SKPN</strong></td><td>Nihil</td></tr>
</tbody></table></div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Perhatikan batas waktu keberatan/banding sejak tanggal surat.</div>`
        }
      ]
    },

    {
      id: 'compliance',
      title: 'Tax Compliance & Kesalahan Umum',
      sections: [
        {
          id: 'checklist-bulanan',
          heading: 'Checklist praktis',
          body: `
<ul>
  <li>Rekonsiliasi bank ↔ buku ↔ SPT Masa.</li>
  <li>Validasi faktur & bukti potong.</li>
  <li>Pisahkan biaya komersial vs fiskal.</li>
  <li>Arsip per masa pajak.</li>
</ul>`
        },
        {
          id: 'kesalahan-umum',
          heading: 'Kesalahan yang sering berulang',
          body: `
<ul>
  <li>Omzet PPh ≠ PPN tanpa penjelasan.</li>
  <li>Biaya pribadi dibebankan sebagai biaya usaha.</li>
  <li>Penghasilan final / bukti potong tidak dilaporkan.</li>
  <li>Data harta di SPT tidak selaras.</li>
  <li>Mengabaikan SP2DK atau jawab tanpa bukti.</li>
</ul>`
        }
      ]
    },

    {
      id: 'referensi',
      title: 'Cara Pakai Modul Ini',
      sections: [
        {
          id: 'alur-belajar',
          heading: 'Alur belajar yang disarankan',
          body: `
<ol>
  <li>Dasar → PTKP & tarif → jenis pajak relevan.</li>
  <li>Karyawan: PPh 21 & TER (+ kalkulator TER/THR jika ada).</li>
  <li>Usaha: PPh Badan/UMKM + PPN.</li>
  <li>SP2DK & ketetapan sebelum kasus pengawasan di simulator.</li>
  <li>Gunakan kotak pencarian di sidebar.</li>
</ol>
<div class="kb-tip"><span class="kb-callout-title">💡 Navigasi</span>Klik ▸ <strong>TOPIK</strong> untuk membuka subtopik. Subtopik disembunyikan sampai topik dibuka.</div>
<p class="kb-legal">Modul edukasi. Keputusan fiskal aktual: rujuk peraturan resmi / konsultan berizin.</p>`
        }
      ]
    }

  ]
};
