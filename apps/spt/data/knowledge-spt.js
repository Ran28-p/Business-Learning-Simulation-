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
  disclaimer: 'Materi ini untuk keperluan pembelajaran dan bukan nasihat pajak. Ketentuan perpajakan dapat berubah; sebelum diterapkan pada kasus nyata, pastikan merujuk peraturan terbaru pada sumber resmi (peraturan.go.id, pajak.go.id).',
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
<div class="kb-tip"><span class="kb-callout-title">💡 Tips compliance</span>Kesalahan paling sering: menganggap “belum ditagih = belum wajib”. Dalam self-assessment, kewajiban lahir dari UU, bukan dari surat tagihan.</div>`,
          sources: [
            { type: 'uu', ref: 'UU KUP Pasal 2 (NPWP), Pasal 3 ayat (1) (SPT benar, lengkap, jelas), Pasal 12 ayat (1) (pajak terutang dibayar tanpa menunggu surat ketetapan)', note: 'nomor pasal dari pengetahuan umum; cocokkan dengan teks UU di peraturan.go.id' }
          ],
          reviewed: '2026-10'
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
<div class="kb-warning"><span class="kb-callout-title">⚠️ Hubungan antaraturan</span>Satu transaksi bisa memicu beberapa pajak sekaligus (mis. jual jasa: PPN + PPh 23).</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) s.t.d.t.d. UU 7/2021 — Pasal 4 ayat (2), 17, 21, 23, 26' },
            { type: 'uu', ref: 'UU 8/1983 (PPN) s.t.d.t.d. UU 7/2021 — Pasal 4 (objek PPN)', note: 'ringkasan peta; rincian ada di bab terkait' }
          ],
          reviewed: '2026-10'
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
<div class="kb-formula">PKP ≈ Penghasilan neto setahun − PTKP</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) Pasal 7 ayat (1)' },
            { type: 'pmk', ref: 'PMK 101/PMK.010/2016 tentang Penyesuaian Besarnya PTKP', note: 'nominal masih berlaku untuk Tahun Pajak 2026 (belum ada PMK pengganti menurut rujukan yang ditinjau)' }
          ],
          reviewed: '2026-10'
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
</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) s.t.d.t.d. UU 7/2021 (HPP) Pasal 17 ayat (1) huruf a' }
          ],
          reviewed: '2026-10'
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
<div class="kb-warning"><span class="kb-callout-title">⚠️ THR / bonus</span>THR menambah bruto bulan dibayar → sering loncat lapisan TER. Akhir tahun dikoreksi progresif Pasal 17.</div>`,
          sources: [
            { type: 'pp', ref: 'PP 58/2023 tentang Tarif PPh Pasal 21 atas Penghasilan sehubungan dengan Pekerjaan, Jasa, atau Kegiatan WP OP' },
            { type: 'pmk', ref: 'PMK 168/2023 tentang Pelaksanaan PP 58/2023 (tabel TER kategori A/B/C)' },
            { type: 'se', ref: 'SE-02/PJ/2024 tentang Petunjuk Teknis Pemotongan PPh 21 metode TER' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'biaya-jabatan',
          heading: 'Biaya jabatan & pengurang karyawan',
          body: `
<ul>
  <li><strong>Biaya jabatan</strong>: 5% dari penghasilan bruto, paling banyak Rp 500.000 / bulan atau Rp 6.000.000 / tahun; berlaku untuk pegawai tetap.</li>
  <li><strong>Iuran pensiun / iuran THT / JHT</strong> yang dibayar pegawai dapat dikurangkan sesuai ketentuan (cocokkan jenis iurannya dengan PMK 168/2023 — tidak semua iuran BPJS otomatis menjadi pengurang).</li>
</ul>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Pada metode TER</span>Pemotongan bulanan (Januari–November) memakai tarif TER atas bruto, karena tabel TER sudah memperhitungkan pengurang. Biaya jabatan dan iuran pensiun dihitung eksplisit pada masa pajak terakhir (Desember / saat berhenti bekerja).</div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Cicilan KPR atau biaya hidup pribadi tidak otomatis jadi pengurang PPh 21. Pengurang bersifat limitatif.</div>`,
          sources: [
            { type: 'pmk', ref: 'PMK 168/2023 Pasal 10 ayat (2) (biaya jabatan 5%, maks. Rp500.000/bulan atau Rp6.000.000/tahun)' },
            { type: 'pmk', ref: 'PMK 250/PMK.03/2008 (biaya jabatan 5%, maks. Rp6.000.000/tahun atau Rp500.000/bulan)', url: 'https://jdih.kemenkeu.go.id/api/download/fulltext/2008/250~PMK.03~2008Per.htm' },
            { type: 'lain', ref: 'Ortax — "Menentukan Biaya Jabatan dan Biaya Pensiun dalam Menghitung PPh Pasal 21"', note: 'pengurang dihitung pada masa pajak terakhir sejak PMK 168/2023; jenis iuran yang boleh dikurangkan perlu dicek di PMK', url: 'https://ortax.org/menentukan-biaya-jabatan-dan-biaya-pensiun-dalam-menghitung-pph-pasal-21' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'pph21-masa-desember',
          heading: 'PPh 21 masa Desember (penyesuaian tahunan)',
          body: `
<p class="kb-lead">Pada metode TER, Januari–November dipotong dengan tarif TER atas bruto. Di <strong>masa pajak terakhir</strong> (Desember, atau bulan pegawai berhenti bekerja), PPh setahun dihitung ulang dengan tarif <strong>Pasal 17</strong> dan selisihnya dipotong.</p>
<div class="kb-formula">PPh Desember = PPh setahun (tarif Pasal 17 × PKP) − PPh yang sudah dipotong Januari–November</div>
<div class="kb-formula">PKP = Bruto setahun − Biaya jabatan − Iuran pensiun/THT/JHT (bila ada) − PTKP</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh (TK/0)</span>
Gaji Rp12.000.000/bulan × 12 = Rp144.000.000.<br>
Biaya jabatan: 5% × 144 juta = 7,2 juta → dibatasi <strong>Rp6.000.000</strong>.<br>
PTKP TK/0 = Rp54.000.000 → PKP = 144.000.000 − 6.000.000 − 54.000.000 = <strong>Rp84.000.000</strong>.<br>
PPh setahun = 5% × 60.000.000 + 15% × 24.000.000 = 3.000.000 + 3.600.000 = <strong>Rp6.600.000</strong>.<br>
Januari–November dipotong dengan TER kategori A: bruto Rp12.000.000 masuk lapisan 11.600.001–12.500.000 dengan tarif <strong>4%</strong> → 4% × 12.000.000 = Rp480.000 per bulan, 11 bulan = <strong>Rp5.280.000</strong>.<br>
PPh Desember = 6.600.000 − 5.280.000 = <strong>Rp1.320.000</strong>.
</div>
<ul>
  <li>Bila hasilnya <strong>negatif</strong> (potongan Januari–November lebih besar dari PPh setahun), selisihnya menjadi kelebihan potong yang dikembalikan/dikompensasikan sesuai ketentuan.</li>
  <li>Penghasilan setahun mencakup THR, bonus, dan tunjangan lain yang diterima sepanjang tahun, bukan hanya gaji pokok.</li>
</ul>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Contoh ini menyederhanakan</span>Gaji dianggap tetap Rp12.000.000 setiap bulan tanpa THR, bonus, atau iuran pensiun. Bila ada, penghasilan setahun dan lapisan TER tiap bulan ikut berubah.</div>`,
          sources: [
            { type: 'pmk', ref: 'PMK 168/2023 (pelaksanaan PPh 21 TER; biaya jabatan)' },
            { type: 'pp', ref: 'PP 58/2023 tentang Tarif PPh Pasal 21 atas Penghasilan sehubungan dengan Pekerjaan, Jasa, atau Kegiatan WP OP' },
            { type: 'lain', ref: 'Ortax — "Menentukan Biaya Jabatan dan Biaya Pensiun dalam Menghitung PPh Pasal 21"', note: 'pengurang dihitung pada masa pajak terakhir', url: 'https://ortax.org/menentukan-biaya-jabatan-dan-biaya-pensiun-dalam-menghitung-pph-pasal-21' }
          ],
          reviewed: '2026-10'
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
</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) s.t.d.t.d. UU 7/2021 (HPP) Pasal 17 ayat (1) huruf b (tarif 22%) dan Pasal 31E (fasilitas 50%)' },
            { type: 'lain', ref: 'DJP — ringkasan sejarah tarif PPh Badan & Pasal 31E (pajak.go.id, 5 Jun 2026)', url: 'https://pajak.go.id/en/node/119971' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'pph-final-umkm',
          heading: 'PPh Final UMKM 0,5%',
          body: `
<div class="kb-formula">PPh Final UMKM = 0,5% × Peredaran bruto</div>
<p>Tarif <strong>0,5%</strong> tidak berubah. Yang berubah lewat <strong>PP 20/2026</strong> (22 April 2026) adalah <em>siapa</em> yang boleh memakainya.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Subjek</th><th>Status setelah PP 20/2026</th></tr></thead>
<tbody>
<tr><td><strong>Orang Pribadi</strong></td><td>Boleh memakai final 0,5% selama peredaran bruto ≤ Rp 4,8 M. Peredaran s.d. Rp 500 juta/tahun tidak dikenai (khusus OP). Menurut penjelasan DJP, tanpa batas jangka waktu.</td></tr>
<tr><td><strong>PT Perorangan</strong></td><td>Boleh memakai final 0,5% selama syarat terpenuhi (menurut penjelasan DJP, tanpa batas jangka waktu).</td></tr>
<tr><td><strong>Koperasi</strong></td><td>Boleh, paling lama 4 Tahun Pajak sejak terdaftar.</td></tr>
<tr><td><strong>PT, CV, Firma, Yayasan, dll.</strong></td><td>Tidak lagi menjadi subjek skema final; kembali ke tarif umum 22% / Pasal 31E. Ada ketentuan peralihan (Pasal II) sampai akhir Tahun Pajak 2026 bagi yang sebelumnya memakai PP 55/2022.</td></tr>
</tbody></table></div>
<ul>
  <li><strong>Pekerjaan bebas</strong> (profesi, termasuk kreator konten/influencer) tidak termasuk penghasilan yang boleh dikenai final UMKM.</li>
  <li><strong>Batas Rp 4,8 M digabung</strong> untuk suami-istri dan penghasilan anak yang belum dewasa dalam kondisi tertentu; bila gabungannya melebihi batas, hak final hilang pada tahun berikutnya.</li>
  <li>Dasarnya <strong>peredaran bruto</strong>, bukan laba: usaha rugi tetap membayar.</li>
  <li>Dulu (PP 23/2018, dipertahankan PP 55/2022): batas waktu OP 7 tahun, CV/Firma/Koperasi 4 tahun, PT 3 tahun sejak terdaftar.</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Rincian pasal peralihan (termasuk contoh kasus Tahun Pajak 2025–2026) ada di lampiran PP 20/2026 — cocokkan dengan teks resmi sebelum dipakai untuk kasus nyata.</div>`,
          sources: [
            { type: 'pp', ref: 'PP 20/2026 (ditetapkan 22 April 2026) — Perubahan atas PP 55/2022 tentang Penyesuaian Pengaturan di Bidang PPh', url: 'https://peraturan.bpk.go.id/Details/349415/pp-no-20-tahun-2026' },
            { type: 'pp', ref: 'PP 55/2022 tentang Penyesuaian Pengaturan di Bidang PPh', note: 'Pasal 56 (PPh final 0,5%) sebagaimana diubah PP 20/2026' },
            { type: 'lain', ref: 'DJP — "Badan Usaha Justru Tidak Terbebani dengan PP 20/2026" (pajak.go.id, 5 Jun 2026)', note: 'artikel pegawai DJP (opini penulis); dipakai untuk ringkasan subjek & jangka waktu', url: 'https://pajak.go.id/en/node/119971' },
            { type: 'lain', ref: 'DJP — "PP 20/2026: Buat UMKM Bersukacita…" (pajak.go.id)', note: 'batas peredaran Rp500 juta bebas PPh final tetap untuk WP OP', url: 'https://www.pajak.go.id/en/node/119951' }
          ],
          reviewed: '2026-10'
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
<tr><td><strong>Pasal 7 ayat (1)</strong></td><td>Denda keterlambatan SPT: Rp500.000 (SPT Masa PPN), Rp100.000 (SPT Masa lain), Rp1.000.000 (SPT Tahunan Badan), Rp100.000 (SPT Tahunan OP).</td></tr>
<tr><td><strong>Pasal 8</strong></td><td>Pembetulan SPT atas kemauan sendiri (sebelum pemeriksaan).</td></tr>
<tr><td><strong>Pasal 9</strong></td><td>Pembayaran/penyetoran pajak; ayat (2a): sanksi bunga atas keterlambatan pembayaran.</td></tr>
<tr><td><strong>Pasal 13–15</strong></td><td>Penerbitan ketetapan oleh DJP: SKPKB (Pasal 13), STP (Pasal 14), SKPKBT (Pasal 15).</td></tr>
<tr><td><strong>Pasal 19</strong></td><td>Sanksi bunga atas kekurangan pembayaran (tarif mengikuti suku bunga acuan + uplift, ditetapkan KMK bulanan).</td></tr>
<tr><td><strong>Pasal 25–27</strong></td><td>Keberatan (Pasal 25: 3 bulan sejak surat ketetapan dikirim), keputusan keberatan (Pasal 26: 12 bulan), banding (Pasal 27: 3 bulan sejak Surat Keputusan Keberatan diterima).</td></tr>
<tr><td><strong>Pasal 29</strong></td><td>Kewenangan DJP melakukan pemeriksaan pajak.</td></tr>
<tr><td><strong>Pasal 35A</strong></td><td>Instansi/lembaga wajib memberi data ke DJP.</td></tr>
</tbody></table></div>`,
          sources: [
            { type: 'uu', ref: 'UU 6/1983 (KUP) s.t.d.t.d. UU 7/2021 (HPP)' },
            { type: 'lain', ref: 'DJP — Keberatan (pajak.go.id)', note: 'Pasal 25–26', url: 'https://pajak.go.id/en/node/34971' },
            { type: 'lain', ref: 'DJP — Pengenaan Sanksi Pajak Secara Otomatis (pajak.go.id)', note: 'nominal denda Pasal 7 ayat (1)', url: 'https://pajak.go.id/en/node/94652' }
          ],
          reviewed: '2026-10'
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
</tbody></table></div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) s.t.d.t.d. UU 7/2021 (HPP) — Pasal 4, 6, 7, 17, 21, 23, 25, 26, 31E', note: 'tabel ringkas; angka PTKP dan tarif dicocokkan pada bab terkait' }
          ],
          reviewed: '2026-10'
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
</tbody></table></div>`,
          sources: [
            { type: 'uu', ref: 'UU 8/1983 (PPN) s.t.d.t.d. UU 7/2021 (HPP) — Pasal 1, 4, 7, 8A, 9, 13' },
            { type: 'pmk', ref: 'PMK 131/2024 (DPP nilai lain)', url: 'https://jdih.kemenkeu.go.id/api/download/ad276b82-94bd-4197-b409-af33e2842cd6/2024pmkeuangan131.pdf' }
          ],
          reviewed: '2026-10'
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
</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) s.t.d.t.d. UU 7/2021 (HPP) Pasal 17 ayat (1) huruf a; PTKP: PMK 101/PMK.010/2016' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'cara-hitung-badan-umkm',
          heading: 'Cara hitung PPh Badan & UMKM',
          body: `
<p><strong>PPh Badan umum:</strong></p>
<div class="kb-formula">PPh Badan = PKP × 22%</div>
<p>Fasilitas Pasal 31E: badan peredaran ≤ Rp50 miliar → tarif efektif 11% atas bagian PKP yang proporsional dengan Rp4,8 miliar pertama.</p>
<p><strong>PPh Final UMKM 0,5%:</strong> (peredaran bruto ≤ Rp4,8 miliar; subjek: OP, PT Perorangan, koperasi — lihat bab <em>PPh Final UMKM</em>)</p>
<div class="kb-formula">WP OP: PPh Final = (Peredaran bruto kumulatif − Rp500 juta) × 0,5%<br/>PT Perorangan / Koperasi: PPh Final = Peredaran bruto × 0,5%<br/>Rp500 juta dikurangkan <em>khusus WP Orang Pribadi</em>, tidak berlaku untuk badan</div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>PT dan CV biasa tidak lagi memakai final 0,5% setelah PP 20/2026 (peralihan s.d. Tahun Pajak 2026): hitung dengan PKP × 22% atau fasilitas Pasal 31E.</div>`,
          sources: [
            { type: 'pp', ref: 'PP 20/2026 (ditetapkan 22 April 2026) — Perubahan atas PP 55/2022 tentang Penyesuaian Pengaturan di Bidang PPh', url: 'https://peraturan.bpk.go.id/Details/349415/pp-no-20-tahun-2026' },
            { type: 'lain', ref: 'DJP — "Badan Usaha Justru Tidak Terbebani dengan PP 20/2026" (pajak.go.id, 5 Jun 2026)', note: 'artikel pegawai DJP (opini penulis); dipakai untuk ringkasan subjek & jangka waktu', url: 'https://pajak.go.id/en/node/119971' },
            { type: 'lain', ref: 'DJP — "PP 20/2026: Buat UMKM Bersukacita…" (pajak.go.id)', note: 'batas peredaran Rp500 juta bebas PPh final tetap untuk WP OP', url: 'https://www.pajak.go.id/en/node/119951' }
          ],
          reviewed: '2026-10'
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
<p class="kb-legal">Barang mewah (PPnBM) dapat dikenai 12% penuh; ikuti daftar resmi.</p>`,
          sources: [
            { type: 'pmk', ref: 'PMK 131/2024 Pasal 2 (barang mewah), Pasal 3 (selain barang mewah), Pasal 5 (transisi Januari 2025)', url: 'https://jdih.kemenkeu.go.id/api/download/ad276b82-94bd-4197-b409-af33e2842cd6/2024pmkeuangan131.pdf' },
            { type: 'uu', ref: 'UU 8/1983 (PPN) s.t.d.t.d. UU 7/2021 (HPP) Pasal 7 ayat (1)', note: 'tarif 11% (1 Apr 2022) dan 12% (paling lambat 1 Jan 2025)' }
          ],
          reviewed: '2026-10'
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
</ul>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Barang mewah</span>Barang yang dikenai PPnBM dikenai PPN 12% atas harga jual/nilai impor penuh (efektif <strong>12%</strong>), bukan 11%.</div>`,
          sources: [
            { type: 'uu', ref: 'UU 8/1983 (PPN) s.t.d.t.d. UU 7/2021 (HPP) Pasal 7 ayat (1)', note: 'tarif 11% (1 Apr 2022) dan 12% (paling lambat 1 Jan 2025)' },
            { type: 'pmk', ref: 'PMK 131/2024 Pasal 2 (barang mewah), Pasal 3 (selain barang mewah), Pasal 5 (transisi Januari 2025)', url: 'https://jdih.kemenkeu.go.id/api/download/ad276b82-94bd-4197-b409-af33e2842cd6/2024pmkeuangan131.pdf' },
            { type: 'lain', ref: 'DJP — "PMK 131/2024: Tarif PPN Sebelas-Dua Belas" (pajak.go.id)', url: 'https://www.pajak.go.id/en/node/113453' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'dpp-nilai-lain',
          heading: 'DPP Nilai Lain',
          body: `
<p class="kb-lead">Sejak <strong>1 Januari 2025</strong>, PPN atas penyerahan BKP/JKP <em>selain barang mewah</em> dihitung dari <strong>DPP Nilai Lain = 11/12 × harga jual / penggantian / nilai impor</strong>, lalu dikalikan tarif 12%.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Jenis penyerahan</th><th>DPP</th><th>PPN</th><th>Efektif</th></tr></thead>
<tbody>
<tr><td>BKP/JKP selain barang mewah</td><td>11/12 × harga</td><td>12% × DPP</td><td><strong>11%</strong></td></tr>
<tr><td>Barang mewah (objek PPnBM)</td><td>Harga jual / nilai impor</td><td>12% × DPP</td><td><strong>12%</strong></td></tr>
</tbody></table></div>
<ul>
  <li><strong>Masa transisi 1–31 Januari 2025:</strong> barang mewah pun memakai DPP nilai lain 11/12; mulai <strong>1 Februari 2025</strong> barang mewah memakai harga jual/nilai impor penuh.</li>
  <li>Penyerahan yang <em>sudah</em> memakai DPP nilai lain dengan besaran tertentu menurut peraturan lain tetap memakai ketentuan masing-masing.</li>
</ul>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Hanya untuk PPN</span>DPP nilai lain 11/12 tidak berlaku untuk PPh. Contoh: jasa Rp12.000.000 → PPN = 12% × Rp11.000.000 = Rp1.320.000, tetapi PPh 23 (2%) tetap dihitung dari bruto Rp12.000.000 = Rp240.000.</div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Jangan mengarang DPP sendiri — hanya jenis yang ditunjuk peraturan yang boleh memakai DPP nilai lain.</div>`,
          sources: [
            { type: 'pmk', ref: 'PMK 131/2024 Pasal 2 (barang mewah), Pasal 3 (selain barang mewah), Pasal 5 (transisi Januari 2025)', url: 'https://jdih.kemenkeu.go.id/api/download/ad276b82-94bd-4197-b409-af33e2842cd6/2024pmkeuangan131.pdf' },
            { type: 'lain', ref: 'DJP — "PMK 131/2024: Tarif PPN Sebelas-Dua Belas" (pajak.go.id)', url: 'https://www.pajak.go.id/en/node/113453' },
            { type: 'lain', ref: 'Ortax — "PPN Pakai DPP Nilai Lain, Bagaimana DPP PPh?" (mengutip penjelasan DJP)', note: 'contoh PPh 23 tetap dari bruto', url: 'https://ortax.org/ppn-pakai-dpp-nilai-lain-bagaimana-dpp-pph' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'faktur-pajak-masukan',
          heading: 'Faktur Pajak & mengkreditkan Pajak Masukan',
          body: `
<div class="kb-formula">PPN kurang/(lebih) bayar = Pajak Keluaran − Pajak Masukan yang dapat dikreditkan</div>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh (barang non-mewah)</span>
Penjualan Rp100.000.000 → DPP nilai lain 11/12 × 100 juta, PPN 12% = <strong>Pajak Keluaran Rp11.000.000</strong>.<br>
Pembelian Rp60.000.000 → <strong>Pajak Masukan Rp6.600.000</strong>.<br>
PPN kurang bayar = 11.000.000 − 6.600.000 = <strong>Rp4.400.000</strong>.
</div>
<h4>Kapan Pajak Masukan dikreditkan</h4>
<ul>
  <li><strong>Masa yang sama</strong> dengan masa faktur pajak dibuat (Pasal 9 ayat (2)).</li>
  <li>Bila belum dikreditkan, boleh pada masa berikutnya paling lama <strong>3 masa pajak</strong> setelah berakhirnya masa faktur dibuat, <em>sepanjang belum dibebankan sebagai biaya atau dikapitalisasi ke harga perolehan dan belum dilakukan pemeriksaan</em> (Pasal 9 ayat (9)).</li>
  <li>Pengkreditan dilakukan lewat penyampaian atau pembetulan SPT Masa PPN. DJP menyatakan Coretax telah diperbarui agar pengkreditan hingga 3 masa pajak dapat dilakukan (KT-08/2025).</li>
</ul>
<h4>Syarat formal Faktur Pajak</h4>
<ul>
  <li>Identitas penjual BKP/JKP dan pembeli.</li>
  <li>PPN yang dipungut dan DPP.</li>
  <li>Kode, nomor seri, dan tanggal pembuatan faktur pajak.</li>
  <li>Nama dan tanda tangan (tanda tangan elektronik pada e-Faktur) pihak yang berhak.</li>
</ul>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Pajak Masukan yang tidak dapat dikreditkan</span>Antara lain pajak masukan atas perolehan BKP/JKP yang <strong>tidak berhubungan langsung dengan kegiatan usaha</strong> dan yang <strong>faktur pajaknya tidak memenuhi ketentuan</strong>. Daftar lengkapnya ada di Pasal 9 ayat (8) UU PPN dan peraturan pelaksanaannya.</div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Pajak Masukan yang sudah dibebankan sebagai biaya tidak boleh juga dikreditkan: pilih salah satu perlakuan.</div>`,
          sources: [
            { type: 'uu', ref: 'UU 8/1983 (PPN) s.t.d.t.d. UU 7/2021 Pasal 9 ayat (2), (8), (9)' },
            { type: 'pmk', ref: 'PMK 18/PMK.03/2021 Pasal 62–63 dan PMK 81/2024 Pasal 375–376 (pengkreditan pajak masukan)', note: 'nomor pasal dari artikel IKPI', url: 'https://ikpi.or.id/en/aturan-baru-pengkreditan-pajak-masukan-pada-coretax/' },
            { type: 'lain', ref: 'DDTC — "Pengkreditan Pajak Masukan pada Masa Pajak Lain Bisa Lewat Coretax"', note: 'kutipan Pasal 9 ayat (9) dan pernyataan DJP', url: 'https://news.ddtc.co.id/berita/nasional/1808948/pengkreditan-pajak-masukan-pada-masa-pajak-lain-bisa-lewat-coretax' },
            { type: 'lain', ref: 'Ortax — "Ini Syarat Pengkreditan Pajak Masukan"', note: 'syarat formal dan Pasal 9 ayat (8)', url: 'https://ortax.org/ini-syarat-pengkreditan-pajak-masukan' }
          ],
          reviewed: '2026-10'
        }
      ]
    },

    {
      id: 'pemotongan-lain',
      title: 'PPh Pemotongan: Pasal 23, 4(2) & 26',
      sections: [
        {
          id: 'pph23',
          heading: 'PPh Pasal 23 — jasa, sewa harta, royalti',
          body: `
<p class="kb-lead">PPh Pasal 23 dipotong oleh <strong>pemberi penghasilan</strong> saat membayar penghasilan tertentu kepada Wajib Pajak dalam negeri. Dasar pemotongan adalah <strong>jumlah bruto, tidak termasuk PPN</strong>.</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Objek</th><th>Tarif normal</th><th>Penerima tanpa NPWP</th></tr></thead>
<tbody>
<tr><td>Dividen*, bunga, royalti, hadiah/penghargaan/bonus tertentu</td><td><strong>15%</strong></td><td>30%</td></tr>
<tr><td>Sewa dan penghasilan lain atas penggunaan harta (selain tanah/bangunan)</td><td><strong>2%</strong></td><td>4%</td></tr>
<tr><td>Imbalan jasa tertentu (teknik, manajemen, konsultan, dan jasa lain sesuai PMK 141/PMK.03/2015)</td><td><strong>2%</strong></td><td>4%</td></tr>
</tbody></table></div>
<p>*Dividen yang diterima WP badan dalam negeri dapat dikecualikan dari objek PPh bila memenuhi syarat Pasal 4 ayat (3) huruf f; cek syaratnya sebelum memotong.</p>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span>
Jasa konsultan Rp15.000.000 (belum termasuk PPN), konsultan ber-NPWP: PPh 23 = 2% × 15.000.000 = <strong>Rp300.000</strong>.<br>
Bila konsultan tidak ber-NPWP: 4% × 15.000.000 = <strong>Rp600.000</strong>.<br>
Royalti Rp12.000.000 kepada penerima tanpa NPWP: 30% × 12.000.000 = <strong>Rp3.600.000</strong>.
</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Yang sering salah potong</span>
<ul>
<li><strong>Sewa tanah/bangunan</strong> bukan PPh 23, melainkan PPh final Pasal 4 ayat (2) 10%.</li>
<li><strong>Honorarium orang pribadi</strong> (pekerjaan bebas) umumnya PPh 21, bukan PPh 23.</li>
<li>Rekanan yang punya Surat Keterangan PP 23/2018 (final UMKM) yang masih berlaku tidak dipotong PPh 23.</li>
<li>Dasar pemotongan adalah nilai sebelum PPN; PPN tidak ikut dipotong.</li>
</ul></div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) Pasal 23 (tarif 15% dan 2%; tarif 100% lebih tinggi bagi penerima tanpa NPWP); sewa harta: Pasal 23 ayat (1) huruf c angka 1' },
            { type: 'pmk', ref: 'PMK 141/PMK.03/2015 (jenis jasa lain objek PPh 23)' },
            { type: 'lain', ref: 'Online Pajak — "PPh 23: Objek, Tarif, dan Cara Menghitungnya"', note: 'tarif dan contoh perhitungan dicocokkan dengan beberapa rujukan sekunder', url: 'https://www.online-pajak.com/e-bupot/pph-pajak-penghasilan-pasal-23/' },
            { type: 'lain', ref: 'Online Pajak — "Tarif PPh Sewa Harta Selain Tanah/Bangunan"', url: 'https://www.online-pajak.com/pajak/pph-sewa/' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'pph-final-4-2-dan-26',
          heading: 'PPh final Pasal 4 ayat (2) & PPh Pasal 26',
          body: `
<ul>
  <li><strong>Sewa tanah dan/atau bangunan:</strong> PPh final <strong>10%</strong> dari jumlah bruto sewa (Pasal 4 ayat (2), PP 34/2017). Dipotong oleh penyewa tertentu atau disetor sendiri oleh pemilik; sifatnya final sehingga tidak digabung ke penghasilan lain.</li>
  <li><strong>PPh final UMKM 0,5%</strong> juga termasuk penghasilan yang dikenai pajak final (lihat bab PPh Final UMKM).</li>
  <li><strong>PPh Pasal 26:</strong> dipotong atas penghasilan yang dibayarkan kepada Wajib Pajak luar negeri, umumnya <strong>20%</strong> dari jumlah bruto; dapat lebih rendah bila ada P3B dan penerima menyerahkan SKD (Surat Keterangan Domisili) yang sah.</li>
</ul>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Situasi</th><th>Pasal</th></tr></thead>
<tbody>
<tr><td>Perusahaan menyewa gudang dari PT lain</td><td>Pasal 4 ayat (2) — 10% final</td></tr>
<tr><td>Perusahaan menyewa mesin produksi</td><td>Pasal 23 — 2%</td></tr>
<tr><td>Perusahaan membayar royalti ke perusahaan di luar negeri</td><td>Pasal 26 — 20% (atau tarif P3B)</td></tr>
</tbody></table></div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Pertanyaan pertama saat memotong: <em>penerimanya siapa</em> (dalam/luar negeri, ber-NPWP atau tidak) dan <em>objeknya apa</em> (jasa, sewa tanah/bangunan, sewa harta lain, royalti)? Dua jawaban itu menentukan pasalnya.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Catatan verifikasi</span>Tarif 20% dan mekanisme P3B/SKD pada Pasal 26 berasal dari pengetahuan umum; cocokkan dengan teks UU PPh dan P3B yang berlaku sebelum dipakai pada kasus nyata.</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) Pasal 4 ayat (2) dan Pasal 26' },
            { type: 'pp', ref: 'PP 34/2017 (PPh final atas penghasilan dari pengalihan dan sewa tanah/bangunan)' },
            { type: 'lain', ref: 'Online Pajak — "Tarif PPh Sewa Harta Selain Tanah/Bangunan"', note: 'pembedaan sewa tanah/bangunan (10% final) vs sewa harta lain (2%)', url: 'https://www.online-pajak.com/pajak/pph-sewa/' }
          ]
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
<thead><tr><th>Jenis</th><th>Kapan (umum)</th><th>Besaran</th></tr></thead>
<tbody>
<tr><td>Denda SPT Masa PPN</td><td>Terlambat lapor (setelah tanggal 20 bulan berikutnya)</td><td>Rp500.000 per SPT (Pasal 7 ayat (1))</td></tr>
<tr><td>Denda SPT Masa lain</td><td>Terlambat lapor</td><td>Rp100.000 per SPT</td></tr>
<tr><td>Denda SPT Tahunan Badan</td><td>Terlambat lapor (setelah 30 April)</td><td>Rp1.000.000 per SPT</td></tr>
<tr><td>Denda SPT Tahunan OP</td><td>Terlambat lapor (setelah 31 Maret)</td><td>Rp100.000 per SPT</td></tr>
<tr><td>Bunga / sanksi bunga</td><td>Kurang bayar, terlambat setor</td><td>(Suku bunga acuan + uplift) ÷ 12 per bulan; tarif ditetapkan KMK tiap bulan</td></tr>
<tr><td>Sanksi kenaikan / bunga pada ketetapan</td><td>Pada SKPKB/SKPKBT dan pembetulan (Pasal 8, 13, 15)</td><td>Tergantung pasal dan jenis pelanggaran</td></tr>
</tbody></table></div>
<div class="kb-warning"><span class="kb-callout-title">⚠️</span>Sejak UU HPP, bunga tidak lagi flat 2% per bulan, tetapi mengikuti suku bunga acuan yang berubah — cek tarif bulan berjalan di pajak.go.id, jangan pakai angka usang. Denda Pasal 7 bersifat nominal tetap, bukan persentase.</div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Pengecualian denda (mis. WP OP meninggal tanpa warisan, kegagalan sistem administrasi, keadaan memaksa) diatur dalam PMK 81/2024.</div>`,
          sources: [
            { type: 'uu', ref: 'UU 6/1983 (KUP) s.t.d.t.d. UU 7/2021 (HPP)' },
            { type: 'pmk', ref: 'PMK 81/2024 Pasal 179 ayat (3) (pengecualian denda keterlambatan SPT)', url: 'https://news.ddtc.co.id/berita/nasional/1808428/sederet-kondisi-yang-bikin-wp-tidak-kena-denda-telat-lapor-spt-masa' },
            { type: 'lain', ref: 'DJP — Pengenaan Sanksi Pajak Secara Otomatis (pajak.go.id)', url: 'https://pajak.go.id/en/node/94652' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'tips-hindari-sanksi',
          heading: 'Tips menekan risiko sanksi',
          noSourceNeeded: 'Saran praktik kepatuhan, bukan ketentuan regulasi',
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
<ul>
  <li><strong>Dasar hukum:</strong> PMK 111/2025 tentang Pengawasan Kepatuhan Wajib Pajak, berlaku efektif <strong>1 Januari 2026</strong>. Sebelumnya SP2DK hanya berdasar surat edaran internal (SE-05/PJ/2022).</li>
  <li>Dapat diterbitkan untuk Wajib Pajak <strong>terdaftar</strong> maupun <strong>belum terdaftar</strong>, berdasarkan penelitian data/informasi yang dimiliki DJP.</li>
  <li>Di dalam PMK 111/2025 pengawasan dibagi tiga: WP terdaftar, WP belum terdaftar, dan pengawasan wilayah.</li>
</ul>`,
          sources: [
            { type: 'pmk', ref: 'PMK 111/2025 tentang Pengawasan Kepatuhan Wajib Pajak', note: 'ditinjau lewat pemberitaan DDTC/Pajak.com; Pasal 15 untuk WP belum terdaftar', url: 'https://news.ddtc.co.id/berita/nasional/1816384/awasi-kepatuhan-wajib-pajak-purbaya-rilis-aturan-baru' },
            { type: 'se', ref: 'SE-05/PJ/2022 (landasan SP2DK sebelum PMK 111/2025)' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'jenis-sp2dk',
          heading: 'Pola indikasi penyebab SP2DK',
          noSourceNeeded: 'Pola indikasi dari praktik pengawasan; bukan daftar yang diatur peraturan',
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
  <li>Baca teliti — data diminta, tahun pajak, batas waktu. Tanggapan diberikan dalam <strong>14 hari</strong> sejak SP2DK diterbitkan; dapat diperpanjang <strong>7 hari</strong> dengan pemberitahuan tertulis ke KPP (total 21 hari).</li>
  <li>Rekonsiliasi internal (buku, SPT, faktur, bukti potong).</li>
  <li>Penjelasan tertulis + lampiran bukti.</li>
  <li>Jika kurang bayar — pertimbangkan pembetulan + setor.</li>
  <li>Simpan bukti pengiriman respons.</li>
</ol>
<div class="kb-warning"><span class="kb-callout-title">⚠️</span>Mengabaikan SP2DK memperbesar risiko eskalasi.</div>`,
          sources: [
            { type: 'pmk', ref: 'PMK 111/2025 (jangka waktu tanggapan SP2DK)', note: '14 hari + perpanjangan 7 hari menurut Pajak.com dan DDTC; cek pasal rincinya di teks resmi', url: 'https://www.pajak.com/pajak/anggota-purbaya-bisa-kirim-sp2dk-ke-wajib-pajak-yang-belum-terdaftar-begini-penjelasan-pmk-111-2025/' }
          ],
          reviewed: '2026-10'
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
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Upaya hukum</th><th>Batas waktu</th><th>Dasar</th></tr></thead>
<tbody>
<tr><td><strong>Keberatan</strong> (ke DJP) atas SKPKB, SKPKBT, SKPN, SKPLB, atau pemotongan/pemungutan pihak ketiga</td><td>3 bulan sejak tanggal surat ketetapan <em>dikirim</em> (atau sejak tanggal pemotongan/pemungutan)</td><td>Pasal 25 ayat (3)</td></tr>
<tr><td>Keputusan DJP atas keberatan</td><td>Paling lama 12 bulan sejak surat keberatan diterima</td><td>Pasal 26 ayat (1)</td></tr>
<tr><td><strong>Banding</strong> (ke Pengadilan Pajak)</td><td>3 bulan sejak Surat Keputusan Keberatan <em>diterima</em></td><td>Pasal 27 ayat (3)</td></tr>
</tbody></table></div>
<ul>
  <li>Satu surat keberatan untuk satu surat ketetapan.</li>
  <li>Syarat keberatan antara lain: pajak yang disetujui dalam pembahasan akhir hasil pemeriksaan harus sudah dilunasi sebelum surat keberatan disampaikan.</li>
  <li>Jatuh tempo pembayaran atas jumlah yang belum dibayar tertangguh sampai 1 bulan sejak Surat Keputusan Keberatan terbit (Pasal 25 ayat (7)).</li>
</ul>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Hitung batas waktu dari tanggal surat ketetapan <strong>dikirim</strong> (keberatan) dan tanggal Surat Keputusan Keberatan <strong>diterima</strong> (banding), bukan dari tanggal ketetapan diterbitkan.</div>`,
          sources: [
            { type: 'uu', ref: 'UU 6/1983 (KUP) s.t.d.t.d. UU 7/2021 (HPP)' },
            { type: 'lain', ref: 'DJP — Keberatan (pajak.go.id)', note: 'Pasal 25 dan 26', url: 'https://pajak.go.id/en/node/34971' },
            { type: 'uu', ref: 'UU KUP Pasal 27 ayat (3) (banding, 3 bulan sejak SK Keberatan diterima)', note: 'dicocokkan dengan kutipan pasal pada rujukan sekunder (gosriconsulting.com)' }
          ],
          reviewed: '2026-10'
        }
      ]
    },

    {
      id: 'pembetulan-rekonsiliasi',
      title: 'Pembetulan SPT & Rekonsiliasi Fiskal',
      sections: [
        {
          id: 'pembetulan-spt',
          heading: 'Pembetulan SPT & sanksi bunganya',
          body: `
<p class="kb-lead">Wajib Pajak berhak membetulkan SPT atas kemauan sendiri dengan pernyataan tertulis, <strong>sepanjang DJP belum melakukan tindakan pemeriksaan</strong> (Pasal 8 ayat (1)).</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Situasi</th><th>Sanksi bunga</th></tr></thead>
<tbody>
<tr><td>Pembetulan membuat <strong>kurang bayar bertambah</strong> — SPT Tahunan (Pasal 8 ayat (2))</td><td>Bunga per bulan atas kurang bayar, dihitung sejak batas penyampaian SPT berakhir sampai tanggal pembayaran</td></tr>
<tr><td>Pembetulan membuat <strong>kurang bayar bertambah</strong> — SPT Masa (Pasal 8 ayat (2a))</td><td>Bunga per bulan, dihitung sejak jatuh tempo pembayaran sampai tanggal pembayaran</td></tr>
<tr><td>Pembetulan hanya mengubah data administratif / hasilnya nihil</td><td>Tidak ada bunga</td></tr>
<tr><td>Pengungkapan ketidakbenaran pengisian SPT (Pasal 8 ayat (5))</td><td>Bunga dengan uplift 10% (lebih berat)</td></tr>
</tbody></table></div>
<ul>
  <li>Bunga dikenakan <strong>paling lama 24 bulan</strong>, dan bagian bulan dihitung penuh 1 bulan.</li>
  <li>Tarif bunga per bulan = (suku bunga acuan + 5%) ÷ 12 untuk Pasal 8 ayat (2) dan (2a); ditetapkan Menteri Keuangan lewat KMK <strong>setiap bulan</strong> (Pasal 8 ayat (2b)).</li>
  <li>Pembetulan tidak mengubah status SPT asli: bila SPT normal sudah tepat waktu, pembetulan sesudah batas lapor tidak menambah denda keterlambatan.</li>
</ul>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh (angka ilustrasi)</span>
Pembetulan SPT Masa menimbulkan kurang bayar Rp10.000.000 dan dibayar 3 bulan setelah jatuh tempo. Dengan tarif bunga bulan itu 1,02% (tarif KMK September 2026 menurut KlikPajak): bunga = 10.000.000 × 1,02% × 3 = <strong>Rp306.000</strong>.
</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Jangan hafal angka tarifnya</span>Tarif 1,02% di contoh berlaku untuk satu bulan tertentu dan berubah tiap bulan. Pakai KMK tarif bunga bulan berjalan di pajak.go.id.</div>`,
          sources: [
            { type: 'uu', ref: 'UU KUP Pasal 8 ayat (1), (2), (2a), (2b), (3a), (5) s.t.d.t.d. UU 7/2021', note: 'kutipan ayat pada rujukan sekunder (gosriconsulting.com)', url: 'https://www.gosriconsulting.com/pasal-8-uu-ketentuan-umum-dan-tata-cara-perpajakan-kup-mengenai-pembetulan' },
            { type: 'lain', ref: 'DJP — "Salah Input SPT? Tenang, Masih Bisa Diperbaiki" (pajak.go.id)', note: 'pemeriksaan dimulai saat surat pemberitahuan pemeriksaan diterima; pembetulan nihil tanpa bunga', url: 'https://www.pajak.go.id/en/node/119907' },
            { type: 'lain', ref: 'KlikPajak — "Tarif Bunga Sanksi Administrasi Pajak Terbaru" (September 2026)', note: 'contoh tarif bulanan; berubah tiap bulan', url: 'https://klikpajak.id/blog/tarif-bunga-sanksi-administrasi-pajak-terbaru/' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'penyusutan-fiskal',
          heading: 'Penyusutan fiskal (Pasal 11 UU PPh)',
          body: `
<p class="kb-lead">Pengeluaran untuk harta berwujud bermasa manfaat lebih dari 1 tahun tidak dibiayakan sekaligus, tetapi disusutkan menurut <strong>kelompok masa manfaat fiskal</strong>. Aturan ini bisa berbeda dari penyusutan akuntansi (PSAK 216).</p>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Kelompok</th><th>Masa manfaat</th><th>Garis lurus</th><th>Saldo menurun</th></tr></thead>
<tbody>
<tr><td>Bukan bangunan — Kelompok 1</td><td>4 tahun</td><td>25%</td><td>50%</td></tr>
<tr><td>Kelompok 2</td><td>8 tahun</td><td>12,5%</td><td>25%</td></tr>
<tr><td>Kelompok 3</td><td>16 tahun</td><td>6,25%</td><td>12,5%</td></tr>
<tr><td>Kelompok 4</td><td>20 tahun</td><td>5%</td><td>10%</td></tr>
<tr><td>Bangunan permanen</td><td>20 tahun</td><td>5%</td><td>tidak boleh</td></tr>
<tr><td>Bangunan tidak permanen</td><td>10 tahun</td><td>10%</td><td>tidak boleh</td></tr>
</tbody></table></div>
<ul>
  <li><strong>Bangunan hanya boleh</strong> memakai garis lurus; harta bukan bangunan boleh garis lurus atau saldo menurun.</li>
  <li>Penentuan harta ke dalam kelompok mengikuti PMK 96/PMK.03/2009 (diperbarui PMK 72/2023). Contoh: laptop termasuk Kelompok 1.</li>
  <li>Bangunan permanen yang masa manfaatnya melebihi 20 tahun dapat disusutkan sesuai masa manfaat sebenarnya (ketentuan sejak Tahun Pajak 2022).</li>
</ul>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh</span>
Laptop Rp20.000.000, garis lurus fiskal Kelompok 1 = 25% × 20.000.000 = <strong>Rp5.000.000/tahun</strong>. Bila akuntansi menyusutkan 5 tahun (Rp4.000.000/tahun), tahun pertama ada <strong>koreksi fiskal negatif Rp1.000.000</strong> (penyusutan fiskal lebih besar dari komersial).
</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) Pasal 11 ayat (1) dan (2)', note: 'metode garis lurus/saldo menurun; bangunan hanya garis lurus' },
            { type: 'pmk', ref: 'PMK 96/PMK.03/2009 (pengelompokan harta bukan bangunan; diperbarui PMK 72/2023)' },
            { type: 'lain', ref: 'DJP — Penyusutan dan Amortisasi (pajak.go.id)', note: 'tabel kelompok dan bangunan permanen >20 tahun', url: 'https://pajak.go.id/en/node/34293' },
            { type: 'lain', ref: 'Kledo — "Mengenal Jenis Aset & Tarif Kelompok Penyusutan Fiskal"', note: 'contoh laptop Kelompok 1', url: 'https://kledo.com/blog/kelompok-penyusutan-fiskal/' }
          ],
          reviewed: '2026-10'
        },
        {
          id: 'rekonsiliasi-fiskal',
          heading: 'Rekonsiliasi fiskal: dari laba akuntansi ke PKP',
          body: `
<div class="kb-formula">Laba akuntansi ± Koreksi fiskal = Penghasilan neto fiskal → (kompensasi kerugian) → PKP</div>
<div class="kb-table-wrap"><table class="kb-table">
<thead><tr><th>Koreksi</th><th>Artinya</th><th>Contoh</th></tr></thead>
<tbody>
<tr><td><strong>Positif</strong> (menambah laba)</td><td>Biaya akuntansi yang tidak boleh/ tidak seluruhnya boleh dikurangkan secara fiskal</td><td>Biaya pribadi pemilik, sanksi pajak (denda/bunga), PPh badan itu sendiri, sumbangan di luar fasilitas</td></tr>
<tr><td><strong>Negatif</strong> (mengurangi laba)</td><td>Penghasilan akuntansi yang bukan objek / sudah dikenai final, atau beban fiskal lebih besar</td><td>Penghasilan yang sudah dikenai PPh final, penyusutan fiskal lebih besar dari komersial</td></tr>
</tbody></table></div>
<ul>
  <li><strong>Beda tetap</strong> (permanen): tidak berbalik di tahun-tahun berikutnya, misalnya biaya yang memang tidak boleh dikurangkan.</li>
  <li><strong>Beda waktu</strong> (temporer): hanya beda saat pengakuan dan akan berbalik, misalnya penyusutan komersial vs fiskal. Efeknya menjadi pajak tangguhan dalam akuntansi (PSAK 212).</li>
  <li>Kerugian fiskal dapat dikompensasikan ke tahun-tahun berikutnya paling lama 5 tahun.</li>
</ul>
<div class="kb-example"><span class="kb-callout-title">📊 Contoh ringkas</span>
Laba akuntansi Rp100.000.000. Koreksi positif: biaya pribadi pemilik Rp8.000.000 dan denda pajak Rp2.000.000 = Rp10.000.000. Koreksi negatif: pendapatan yang sudah dikenai PPh final Rp15.000.000.<br>
Penghasilan neto fiskal = 100.000.000 + 10.000.000 − 15.000.000 = <strong>Rp95.000.000</strong>.
</div>
<div class="kb-tip"><span class="kb-callout-title">💡</span>Itulah sebabnya beban pajak di laporan laba rugi (PSAK 212) tidak selalu sama dengan tarif × laba akuntansi. Lihat juga materi Penyusutan fiskal.</div>
<div class="kb-warning"><span class="kb-callout-title">⚠️ Catatan verifikasi</span>Daftar biaya yang tidak boleh dikurangkan ada di Pasal 9 ayat (1) UU PPh dan kompensasi kerugian di Pasal 6 ayat (2); rujukan ini berasal dari pengetahuan umum, cocokkan dengan teks UU.</div>`,
          sources: [
            { type: 'uu', ref: 'UU 7/1983 (PPh) Pasal 6 ayat (1) dan (2), Pasal 9 ayat (1)' },
            { type: 'psak', ref: 'PSAK 212 Pajak Penghasilan (dahulu PSAK 46) — pajak tangguhan atas beda waktu' }
          ]
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
          noSourceNeeded: 'Daftar periksa praktik; bukan ketentuan regulasi',
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
          noSourceNeeded: 'Pengamatan praktik umum; bukan ketentuan regulasi',
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
          noSourceNeeded: 'Panduan navigasi belajar; tidak memuat klaim regulasi',
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
