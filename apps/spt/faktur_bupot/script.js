/* ==========================================================================
   Modul Pembuatan Faktur Pajak & Bukti Potong Pajak — SIM-SPT
   Simulator edukasi. Format nomor & sebagian tarif disederhanakan untuk
   pembelajaran; bukan pengganti sistem Coretax DJP resmi.
   Dasar hukum utama: UU PPN (UU HPP), PMK 131/2024, PER-11/PJ/2025,
   PER-03/PJ/2022, PER-24/PJ/2021, PP 58/2023 & PMK 168/2023.
   ========================================================================== */

/* ---------- util ---------- */
function fmtRupiah(n) {
  const x = Math.round(Number(n) || 0);
  const neg = x < 0;
  const s = Math.abs(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-Rp ' : 'Rp ') + s;
}
function fmtNum(n) {
  const x = Math.round(Number(n) || 0);
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function pad(n, len) { return String(n).padStart(len, '0'); }
function randDigits(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtTanggal(iso) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------- tab switching ---------- */
function switchTab(tab) {
  document.getElementById('view-faktur').classList.toggle('active', tab === 'faktur');
  document.getElementById('view-bupot').classList.toggle('active', tab === 'bupot');
  document.getElementById('tabBtnFaktur').classList.toggle('active', tab === 'faktur');
  document.getElementById('tabBtnBupot').classList.toggle('active', tab === 'bupot');
}

/* ==========================================================================
   FAKTUR PAJAK
   ========================================================================== */
const KODE_TRANSAKSI = {
  '01': 'Penyerahan BKP/JKP yang PPN/PPnBM-nya dipungut oleh PKP yang menyerahkan.',
  '02': 'Penyerahan BKP/JKP kepada pemungut PPN Instansi Pemerintah.',
  '03': 'Penyerahan BKP/JKP kepada pemungut PPN lainnya (selain instansi pemerintah).',
  '04': 'Penyerahan dengan DPP Nilai Lain sesuai Pasal 8A ayat (1) UU PPN.',
  '05': 'Penyerahan dengan PPN besaran tertentu sesuai Pasal 9A ayat (1) UU PPN.',
  '06': 'Penyerahan BKP kepada turis asing (skema VAT Refund).',
  '07': 'Penyerahan yang PPN/PPnBM-nya mendapat fasilitas Tidak Dipungut / DTP.',
  '08': 'Penyerahan yang mendapat fasilitas Dibebaskan dari pengenaan PPN/PPnBM.',
  '09': 'Penyerahan aktiva tetap yang semula bukan untuk diperjualbelikan (Pasal 16D UU PPN).',
  '10': 'Penyerahan lainnya yang PPN-nya dipungut oleh PKP yang menyerahkan.'
};

let fakturItems = [{ nama: '', qty: 1, harga: 0 }];

function addFakturItem() {
  fakturItems.push({ nama: '', qty: 1, harga: 0 });
  renderFakturItemsTable();
  renderFaktur();
}
function removeFakturItem(idx) {
  fakturItems.splice(idx, 1);
  if (fakturItems.length === 0) fakturItems.push({ nama: '', qty: 1, harga: 0 });
  renderFakturItemsTable();
  renderFaktur();
}
function updateFakturItem(idx, field, val) {
  fakturItems[idx][field] = field === 'nama' ? val : (Number(val) || 0);
  renderFakturItemsTable(true);
  renderFaktur();
}
function renderFakturItemsTable(skipInputs) {
  const body = document.getElementById('fk-items-body');
  body.innerHTML = fakturItems.map((it, idx) => {
    const subtotal = (Number(it.qty) || 0) * (Number(it.harga) || 0);
    return `<tr>
      <td><input type="text" value="${esc(it.nama)}" placeholder="Nama barang/jasa" data-idx="${idx}" data-field="nama"></td>
      <td><input type="number" min="0" value="${it.qty}" data-idx="${idx}" data-field="qty"></td>
      <td><input type="number" min="0" value="${it.harga}" data-idx="${idx}" data-field="harga"></td>
      <td style="white-space:nowrap;padding-top:12px">${fmtRupiah(subtotal)}</td>
      <td><button class="item-del" type="button" title="Hapus baris" data-remove-idx="${idx}">✕</button></td>
    </tr>`;
  }).join('');
}

function generateNSFP(kode, status, formatVersion) {
  const tahun = pad(new Date().getFullYear() % 100, 2);
  if (formatVersion === 'lama') {
    // PER-03/PJ/2022 — 16 digit: 2 digit kode transaksi + 1 digit status (0 normal/1 pengganti) + 13 digit nomor seri (2 digit tahun + 11 digit nomor urut dari DJP)
    const statusDigit = status === 'pengganti' ? '1' : '0';
    const urut = randDigits(11);
    return `${kode}.${statusDigit}${tahun}.${urut.slice(0,3)}${urut.slice(3)}`;
  }
  // PER-11/PJ/2025 (Coretax) — 17 digit: 2 digit kode transaksi + 2 digit kode status + 13 digit nomor seri (2 digit tahun + 11 digit nomor urut dari DJP)
  const statusDigit = status === 'pengganti' ? '01' : '00';
  const urut = randDigits(11);
  return `${kode}.${statusDigit}-${tahun}.${urut}`;
}

function computeFaktur() {
  const subtotal = fakturItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.harga) || 0), 0);
  const potongan = Number(document.getElementById('fk-potongan').value) || 0;
  const uangmuka = Number(document.getElementById('fk-uangmuka').value) || 0;
  const kode = document.getElementById('fk-kode-transaksi').value;
  const barangMewah = document.getElementById('fk-barang-mewah').checked;
  const ppnbmRate = Number(document.getElementById('fk-ppnbm-rate').value) || 0;
  const ekspor = document.getElementById('fk-ekspor').checked;

  const dpp = Math.max(0, subtotal - potongan - uangmuka);

  let ppn = 0, ppnbm = 0, catatan = '';
  if (kode === '07' || kode === '08') {
    ppn = 0;
    catatan = kode === '07'
      ? 'PPN Rp0 — fasilitas Tidak Dipungut / Ditanggung Pemerintah (DTP).'
      : 'PPN Rp0 — fasilitas Dibebaskan dari pengenaan PPN.';
  } else if (ekspor) {
    ppn = 0;
    catatan = 'Tarif PPN 0% untuk ekspor BKP/JKP.';
  } else if (barangMewah) {
    ppn = dpp * 0.12;
    ppnbm = dpp * (ppnbmRate / 100);
    catatan = 'Barang/Jasa Mewah: tarif PPN penuh 12% + PPnBM ' + ppnbmRate + '% (Pasal 8 UU PPN & PPnBM).';
  } else {
    // DPP Nilai Lain: PPN = DPP x 12% x 11/12 = tarif efektif 11% (PMK 131/2024)
    ppn = dpp * 12 * 11 / 12 / 100;
    catatan = 'DPP Nilai Lain (PMK 131/2024): PPN = DPP × 12% × 11/12 = tarif efektif 11%.';
  }

  return { subtotal, potongan, uangmuka, dpp, ppn, ppnbm, total: dpp + ppn + ppnbm, catatan };
}

function renderFaktur() {
  document.getElementById('fk-kode-desc').textContent = KODE_TRANSAKSI[document.getElementById('fk-kode-transaksi').value] || '';
  document.getElementById('fk-ppnbm-wrap').style.display = document.getElementById('fk-barang-mewah').checked ? '' : 'none';

  const c = computeFaktur();
  const kode = document.getElementById('fk-kode-transaksi').value;
  const status = document.getElementById('fk-status').value;
  const formatVersion = document.getElementById('fk-format-nsfp').value;
  const nsfp = generateNSFP(kode, status, formatVersion);

  const penjualNama = document.getElementById('fk-penjual-nama').value || '(nama PKP penjual)';
  const penjualNpwp = document.getElementById('fk-penjual-npwp').value || '(NPWP penjual)';
  const pembeliNama = document.getElementById('fk-pembeli-nama').value || '(nama pembeli)';
  const pembeliNpwp = document.getElementById('fk-pembeli-npwp').value || '(NPWP/NIK pembeli)';
  const tanggal = document.getElementById('fk-tanggal').value || todayISO();

  const rows = fakturItems.map((it, i) => {
    const subtotal = (Number(it.qty) || 0) * (Number(it.harga) || 0);
    return `<tr><td>${i + 1}</td><td>${esc(it.nama) || '-'}</td><td class="num">${fmtNum(it.qty)}</td><td class="num">${fmtNum(it.harga)}</td><td class="num">${fmtNum(subtotal)}</td></tr>`;
  }).join('');

  document.getElementById('fk-preview').innerHTML = `
    <div class="paper">
      <div class="doc-title">FAKTUR PAJAK</div>
      <div class="doc-sub">Kode Transaksi ${kode} — ${document.getElementById('fk-status').selectedOptions[0].text}</div>
      <div class="nsfp-box"><div class="lbl">Kode dan Nomor Seri Faktur Pajak</div><div class="val">${nsfp}</div></div>
      <div class="party-grid">
        <div class="party"><div class="h">Pengusaha Kena Pajak (Penjual)</div>
          <div><strong>${esc(penjualNama)}</strong></div>
          <div>NPWP: ${esc(penjualNpwp)}</div>
        </div>
        <div class="party"><div class="h">Pembeli BKP / Penerima JKP</div>
          <div><strong>${esc(pembeliNama)}</strong></div>
          <div>NPWP/NIK: ${esc(pembeliNpwp)}</div>
        </div>
      </div>
      <div style="margin-bottom:8px;font-size:11.5px">Tanggal Faktur: <strong>${fmtTanggal(tanggal)}</strong></div>
      <table class="doc-table">
        <thead><tr><th style="width:6%">No</th><th>Nama Barang Kena Pajak / Jasa Kena Pajak</th><th style="width:12%">Kuantitas</th><th style="width:18%">Harga Satuan (Rp)</th><th style="width:18%">Harga Jual/Penggantian (Rp)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="doc-totals">
        <div><span>Harga Jual / Penggantian</span><span class="num">${fmtNum(c.subtotal)}</span></div>
        <div><span>Potongan Harga</span><span class="num">${fmtNum(c.potongan)}</span></div>
        <div><span>Uang Muka Diterima</span><span class="num">${fmtNum(c.uangmuka)}</span></div>
        <div><span>Dasar Pengenaan Pajak (DPP)</span><span class="num">${fmtNum(c.dpp)}</span></div>
        <div><span>PPN</span><span class="num">${fmtNum(c.ppn)}</span></div>
        ${c.ppnbm > 0 ? `<div><span>PPnBM</span><span class="num">${fmtNum(c.ppnbm)}</span></div>` : ''}
        <div class="grand"><span>Jumlah Yang Harus Dibayar</span><span class="num">${fmtNum(c.total)}</span></div>
      </div>
      <div class="sig"><div class="box">${esc(penjualNama)}<div class="line">Tanda tangan elektronik</div></div></div>
      <div class="note">${esc(c.catatan)} — Nomor faktur di atas adalah simulasi/ilustrasi format, bukan nomor terbitan resmi Coretax DJP.</div>
    </div>`;
}

function resetFaktur() {
  fakturItems = [{ nama: '', qty: 1, harga: 0 }];
  document.getElementById('fk-penjual-nama').value = '';
  document.getElementById('fk-penjual-npwp').value = '';
  document.getElementById('fk-pembeli-nama').value = '';
  document.getElementById('fk-pembeli-npwp').value = '';
  document.getElementById('fk-tanggal').value = '';
  document.getElementById('fk-potongan').value = 0;
  document.getElementById('fk-uangmuka').value = 0;
  document.getElementById('fk-barang-mewah').checked = false;
  document.getElementById('fk-ppnbm-rate').value = 0;
  document.getElementById('fk-ekspor').checked = false;
  renderFakturItemsTable();
  renderFaktur();
}

/* ---- riwayat faktur ---- */
const FK_HISTORY_KEY = 'simspt_faktur_history_v1';
function loadFakturHistory() { try { return JSON.parse(localStorage.getItem(FK_HISTORY_KEY)) || []; } catch (e) { return []; } }
function saveFakturHistory() {
  const c = computeFaktur();
  const list = loadFakturHistory();
  list.unshift({
    id: Date.now(),
    penjual: document.getElementById('fk-penjual-nama').value || '-',
    pembeli: document.getElementById('fk-pembeli-nama').value || '-',
    tanggal: document.getElementById('fk-tanggal').value || todayISO(),
    kode: document.getElementById('fk-kode-transaksi').value,
    total: c.total
  });
  localStorage.setItem(FK_HISTORY_KEY, JSON.stringify(list.slice(0, 30)));
  renderFakturHistory();
}
function deleteFakturHistory(id) {
  localStorage.setItem(FK_HISTORY_KEY, JSON.stringify(loadFakturHistory().filter(h => h.id !== id)));
  renderFakturHistory();
}
function renderFakturHistory() {
  const list = loadFakturHistory();
  const el = document.getElementById('fk-history-list');
  if (!list.length) { el.innerHTML = '<div class="empty-state">Belum ada faktur tersimpan.</div>'; return; }
  el.innerHTML = list.map(h => `
    <div class="history-item">
      <div><strong>${esc(h.penjual)} → ${esc(h.pembeli)}</strong><div class="meta">Kode ${h.kode} · ${fmtTanggal(h.tanggal)} · ${fmtRupiah(h.total)}</div></div>
      <button type="button" title="Hapus" data-delete-faktur-id="${h.id}">✕</button>
    </div>`).join('');
}

/* ==========================================================================
   BUKTI POTONG / PUNGUT PPh UNIFIKASI
   ========================================================================== */

// Tabel TER, PTKP, dan tarif progresif PPh OP TIDAK didefinisikan di sini lagi —
// sebelumnya ada salinan manual di file ini yang berisiko lepas sinkron dari
// js/shared/tax-engine.js. Sekarang keduanya sama-sama memanggil window.TaxEngine
// (dimuat via <script src="../js/shared/tax-engine.js"> sebelum script.js ini).
function hitungTER(bruto, ptkpStatus) {
  if (typeof TaxEngine === 'undefined') return { kategori: '-', tarif: 0, pph: 0 };
  return TaxEngine.hitungTER(bruto, ptkpStatus);
}
function hitungProgresif(pkp) {
  if (typeof TaxEngine === 'undefined') return 0;
  return Math.round(TaxEngine.hitungTarifProgresif(pkp));
}

const BUPOT_OBJECTS = {
  pph2326: [
    { key: 'jasa-lain', label: 'Jasa lain (selain jasa yang telah dipotong PPh 21)', rate: 0.02, dasar: 'Pasal 23 ayat (1) huruf c UU PPh — PMK 141/2015' },
    { key: 'sewa-non-tb', label: 'Sewa harta selain tanah & bangunan', rate: 0.02, dasar: 'Pasal 23 ayat (1) huruf c UU PPh' },
    { key: 'dividen-bunga-royalti', label: 'Dividen / Bunga / Royalti (WP dalam negeri)', rate: 0.15, dasar: 'Pasal 23 ayat (1) huruf a UU PPh' },
    { key: 'hadiah-penghargaan', label: 'Hadiah & penghargaan (bukan objek PPh 21)', rate: 0.15, dasar: 'Pasal 23 ayat (1) huruf a UU PPh' },
    { key: 'pph26', label: 'Penghasilan Wajib Pajak Luar Negeri (PPh Pasal 26)', rate: 0.20, dasar: 'Pasal 26 UU PPh (tanpa fasilitas P3B/tax treaty)' }
  ],
  pph22: [
    { key: 'impor-api', label: 'Impor barang — punya Angka Pengenal Importir (API)', rate: 0.025, dasar: 'PMK 34/PMK.010/2017 jo. PMK 41/PMK.010/2022' },
    { key: 'impor-nonapi', label: 'Impor barang — tanpa API', rate: 0.075, dasar: 'PMK 34/PMK.010/2017 jo. PMK 41/PMK.010/2022' },
    { key: 'bendahara-pemerintah', label: 'Pembelian barang oleh Bendahara Pemerintah/BUMN', rate: 0.015, dasar: 'PMK 34/PMK.010/2017 jo. PMK 41/PMK.010/2022' },
    { key: 'badan-industri-tertentu', label: 'Penjualan oleh badan usaha industri tertentu (semen, kertas, baja, otomotif)', rate: 0.003, dasar: 'PMK 34/PMK.010/2017 jo. PMK 41/PMK.010/2022' },
    { key: 'penjualan-barang-mewah', label: 'Penjualan barang tergolong sangat mewah', rate: 0.05, dasar: 'PMK 92/PMK.03/2019' }
  ],
  pph4ayat2: [
    { key: 'sewa-tanah-bangunan', label: 'Sewa tanah dan/atau bangunan', rate: 0.10, dasar: 'PP 34/2017' },
    { key: 'pengalihan-tanah-bangunan', label: 'Pengalihan hak atas tanah dan/atau bangunan', rate: 0.025, dasar: 'PP 34/2016' },
    { key: 'dividen-op', label: 'Dividen diterima Wajib Pajak Orang Pribadi', rate: 0.10, dasar: 'Pasal 17 ayat (2c) UU PPh jo. UU HPP' },
    { key: 'konstruksi-pelaksana-kecil', label: 'Jasa Konstruksi — Pelaksanaan, kualifikasi kecil/usaha perseorangan (bersertifikat)', rate: 0.0175, dasar: 'PP 9/2022' },
    { key: 'konstruksi-pelaksana-menengah-besar', label: 'Jasa Konstruksi — Pelaksanaan, kualifikasi menengah/besar (bersertifikat)', rate: 0.0265, dasar: 'PP 9/2022' },
    { key: 'konstruksi-pelaksana-nonsertifikat', label: 'Jasa Konstruksi — Pelaksanaan, tanpa sertifikat/kualifikasi', rate: 0.04, dasar: 'PP 9/2022' },
    { key: 'konstruksi-perencana-pengawas-sertifikat', label: 'Jasa Konstruksi — Perencanaan/Pengawasan, bersertifikat', rate: 0.04, dasar: 'PP 9/2022' },
    { key: 'konstruksi-perencana-pengawas-nonsertifikat', label: 'Jasa Konstruksi — Perencanaan/Pengawasan, tanpa sertifikat', rate: 0.06, dasar: 'PP 9/2022' }
  ],
  pph15: [
    { key: 'pelayaran-dalam-negeri', label: 'Pelayaran Dalam Negeri', rate: 0.012, dasar: 'KMK 416/KMK.04/1996' },
    { key: 'penerbangan-dalam-negeri', label: 'Penerbangan Dalam Negeri', rate: 0.018, dasar: 'KMK 475/KMK.04/1996' },
    { key: 'pelayaran-penerbangan-luar-negeri', label: 'Pelayaran / Penerbangan Luar Negeri', rate: 0.0264, dasar: 'KMK 417/KMK.04/1996' }
  ]
};

const BUPOT_JENIS_DESC = {
  'pph21-tetap': 'Pemotongan bulanan atas gaji/upah pegawai tetap memakai Tarif Efektif Rata-rata (TER), lapor via e-Bupot 21/26. Masa Desember memakai tarif progresif Pasal 17 (tidak disimulasikan di sini).',
  'pph21-bukan-pegawai': 'Pemotongan atas imbalan tenaga ahli/jasa perorangan bukan pegawai. DPP = 50% × penghasilan bruto, dikenakan tarif progresif Pasal 17. Formulir 1721-VI.',
  'pph2326': 'Bukti Pemotongan/Pemungutan Unifikasi untuk PPh 23 (dalam negeri, Formulir BPBS) atau PPh 26 (luar negeri, Formulir BPNR).',
  'pph22': 'Bukti Pemungutan Unifikasi PPh Pasal 22 atas impor, pembelian oleh bendahara pemerintah, dan transaksi tertentu lain (Formulir BPBS).',
  'pph4ayat2': 'Bukti Pemotongan Unifikasi PPh Final Pasal 4 ayat (2) — sewa tanah/bangunan, pengalihan tanah/bangunan, dividen OP, jasa konstruksi (Formulir BPBS).',
  'pph15': 'Bukti Pemotongan Unifikasi PPh Pasal 15 atas norma penghasilan neto tertentu — pelayaran, penerbangan (Formulir BPBS).'
};

function onBupotJenisChange() {
  const jenis = document.getElementById('bp-jenis').value;
  document.getElementById('bp-jenis-desc').textContent = BUPOT_JENIS_DESC[jenis] || '';
  const wrap = document.getElementById('bp-fields-dynamic');
  document.getElementById('bp-nonpwp-wrap').style.display = (jenis === 'pph4ayat2') ? 'none' : '';

  if (jenis === 'pph21-tetap') {
    wrap.innerHTML = `
      <h3>3. Perhitungan PPh 21 (TER Bulanan)</h3>
      <div class="row">
        <div class="field"><label>Penghasilan Bruto Sebulan (Rp)</label><input type="number" id="bp-bruto" value="0" min="0"></div>
        <div class="field"><label>Status PTKP</label>
          <select id="bp-ptkp">
            <option>TK/0</option><option>TK/1</option><option>TK/2</option><option>TK/3</option>
            <option>K/0</option><option>K/1</option><option>K/2</option><option>K/3</option>
          </select>
        </div>
      </div>`;
  } else if (jenis === 'pph21-bukan-pegawai') {
    wrap.innerHTML = `
      <h3>3. Perhitungan PPh 21 (Bukan Pegawai)</h3>
      <div class="field"><label>Penghasilan Bruto (Rp)</label><input type="number" id="bp-bruto" value="0" min="0"></div>
      <div class="field"><span class="hint">DPP = 50% × penghasilan bruto, dikenakan tarif progresif Pasal 17 UU PPh (Pasal 21 ayat 5a jo. PER-16/PJ/2016).</span></div>`;
  } else {
    const objects = BUPOT_OBJECTS[jenis] || [];
    wrap.innerHTML = `
      <h3>3. Objek &amp; Perhitungan</h3>
      <div class="field"><label>Jenis Penghasilan / Objek Pajak</label>
        <select id="bp-objek">
          ${objects.map(o => `<option value="${o.key}">${esc(o.label)} — ${(o.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Dasar Pengenaan Pajak / Jumlah Bruto (Rp)</label><input type="number" id="bp-bruto" value="0" min="0"></div>`;
  }
  renderBupot();
}

function generateNomorBupot(jenis, formulir) {
  const now = new Date();
  const kodeJenis = { 'pph21-tetap': '21', 'pph21-bukan-pegawai': '21', pph2326: '23', pph22: '22', pph4ayat2: '42', pph15: '15' }[jenis] || '00';
  return `${pad(now.getFullYear(),4)}.${pad(now.getMonth()+1,2)}/${formulir}-${kodeJenis}/${randDigits(6)}`;
}

function renderBupot() {
  const jenis = document.getElementById('bp-jenis').value;
  const tanpaNpwp = document.getElementById('bp-tanpa-npwp').checked;
  const pemotongNama = document.getElementById('bp-pemotong-nama').value || '(nama pemotong/pemungut)';
  const pemotongNpwp = document.getElementById('bp-pemotong-npwp').value || '(NPWP pemotong)';
  const terimaNama = document.getElementById('bp-terima-nama').value || '(nama penerima penghasilan)';
  const terimaNpwp = document.getElementById('bp-terima-npwp').value || '(NPWP/NIK penerima)';
  const tanggal = document.getElementById('bp-tanggal').value || todayISO();

  let judul = '', dasarHukumHTML = '', rows = '', totalPPh = 0, formulir = 'BPBS', bruto = 0, tarifLabel = '', catatan = '';

  if (jenis === 'pph21-tetap') {
    bruto = Number(document.getElementById('bp-bruto').value) || 0;
    const ptkp = document.getElementById('bp-ptkp').value;
    const r = hitungTER(bruto, ptkp);
    totalPPh = r.pph;
    tarifLabel = 'TER Kategori ' + r.kategori + ' (' + (r.tarif * 100).toFixed(2).replace(/\.?0+$/, '') + '%)';
    judul = 'BUKTI PEMOTONGAN PPh PASAL 21 (BULANAN — TER)';
    formulir = '1721-VI';
    rows = `<tr><td>Penghasilan Bruto Sebulan</td><td class="num">${fmtNum(bruto)}</td></tr>
      <tr><td>Status PTKP</td><td class="num">${ptkp}</td></tr>
      <tr><td>Kategori &amp; Tarif TER</td><td class="num">${tarifLabel}</td></tr>`;
    catatan = 'Perhitungan Masa Pajak Januari–November memakai skema TER (PP 58/2023 & PMK 168/2023). Masa Pajak Desember wajib dihitung ulang dengan tarif progresif Pasal 17 atas setahun penuh.';
    dasarHukumHTML = 'PP 58/2023, PMK 168/2023, dan Pasal 21 UU PPh (UU HPP).';
  } else if (jenis === 'pph21-bukan-pegawai') {
    bruto = Number(document.getElementById('bp-bruto').value) || 0;
    const dpp = bruto * 0.5;
    totalPPh = hitungProgresif(dpp);
    tarifLabel = 'Tarif Progresif Pasal 17 atas 50% bruto';
    judul = 'BUKTI PEMOTONGAN PPh PASAL 21 (BUKAN PEGAWAI)';
    formulir = '1721-VI';
    rows = `<tr><td>Penghasilan Bruto</td><td class="num">${fmtNum(bruto)}</td></tr>
      <tr><td>DPP (50% × Bruto)</td><td class="num">${fmtNum(dpp)}</td></tr>
      <tr><td>Dasar Perhitungan</td><td class="num">${tarifLabel}</td></tr>`;
    dasarHukumHTML = 'Pasal 21 ayat (5a) UU PPh jo. PER-16/PJ/2016.';
  } else {
    const objects = BUPOT_OBJECTS[jenis] || [];
    const objKey = document.getElementById('bp-objek') ? document.getElementById('bp-objek').value : (objects[0] && objects[0].key);
    const obj = objects.find(o => o.key === objKey) || objects[0] || { label: '-', rate: 0, dasar: '-' };
    bruto = Number(document.getElementById('bp-bruto').value) || 0;
    let rate = obj.rate;
    const doublingApplies = (jenis === 'pph2326' && objKey !== 'pph26') || jenis === 'pph22';
    if (tanpaNpwp && doublingApplies) rate = rate * 2;
    totalPPh = Math.round(bruto * rate);
    tarifLabel = (rate * 100).toFixed(2).replace(/\.?0+$/, '') + '%' + (tanpaNpwp && doublingApplies ? ' (×2 — belum ber-NPWP)' : '');

    const isFinal = jenis === 'pph4ayat2';
    if (isFinal) judul = 'BUKTI PEMOTONGAN PPh FINAL PASAL 4 AYAT (2)';
    else if (jenis === 'pph22') judul = 'BUKTI PEMUNGUTAN PPh PASAL 22';
    else if (jenis === 'pph15') judul = 'BUKTI PEMOTONGAN PPh PASAL 15';
    else judul = (objKey === 'pph26') ? 'BUKTI PEMOTONGAN PPh PASAL 26' : 'BUKTI PEMOTONGAN PPh PASAL 23';
    formulir = (jenis === 'pph2326' && objKey === 'pph26') ? 'BPNR' : 'BPBS';

    rows = `<tr><td>Jenis Penghasilan / Objek Pajak</td><td class="num">${esc(obj.label)}</td></tr>
      <tr><td>Dasar Pengenaan Pajak</td><td class="num">${fmtNum(bruto)}</td></tr>
      <tr><td>Tarif</td><td class="num">${tarifLabel}</td></tr>`;
    dasarHukumHTML = esc(obj.dasar) + '.';
    catatan = isFinal ? 'PPh Final Pasal 4 ayat (2) — tidak dapat dikreditkan pada SPT Tahunan.' : 'PPh dapat dikreditkan sebagai pembayaran pajak dimuka pada SPT Tahunan.';
  }

  const nomor = generateNomorBupot(jenis, formulir);

  document.getElementById('bp-law-box').innerHTML = `<strong>Dasar hukum objek terpilih:</strong> ${dasarHukumHTML}<br><strong>Payung hukum tata cara:</strong> PER-24/PJ/2021 (Bukti Pemotongan/Pemungutan Unifikasi) &amp; PMK 81/2024 jo. PER-11/PJ/2025 (Coretax).`;

  document.getElementById('bp-preview').innerHTML = `
    <div class="paper">
      <div class="doc-title">${judul}</div>
      <div class="doc-sub">Formulir ${formulir} — Bukti Pemotongan/Pemungutan Unifikasi</div>
      <div class="nsfp-box"><div class="lbl">Nomor Bukti Pemotongan/Pemungutan</div><div class="val">${nomor}</div></div>
      <div class="party-grid">
        <div class="party"><div class="h">Pemotong / Pemungut Pajak</div>
          <div><strong>${esc(pemotongNama)}</strong></div>
          <div>NPWP: ${esc(pemotongNpwp)}</div>
        </div>
        <div class="party"><div class="h">Wajib Pajak yang Dipotong/Dipungut</div>
          <div><strong>${esc(terimaNama)}</strong></div>
          <div>NPWP/NIK: ${esc(terimaNpwp)}</div>
        </div>
      </div>
      <div style="margin-bottom:8px;font-size:11.5px">Tanggal Pemotongan: <strong>${fmtTanggal(tanggal)}</strong></div>
      <table class="doc-table"><tbody>${rows}</tbody></table>
      <div class="doc-totals">
        <div class="grand"><span>PPh Dipotong / Dipungut</span><span class="num">${fmtNum(totalPPh)}</span></div>
      </div>
      <div class="sig"><div class="box">${esc(pemotongNama)}<div class="line">Tanda tangan elektronik</div></div></div>
      <div class="note">${esc(catatan)} Nomor di atas adalah simulasi/ilustrasi, bukan nomor terbitan resmi Coretax DJP.</div>
    </div>`;
}

function resetBupot() {
  document.getElementById('bp-pemotong-nama').value = '';
  document.getElementById('bp-pemotong-npwp').value = '';
  document.getElementById('bp-terima-nama').value = '';
  document.getElementById('bp-terima-npwp').value = '';
  document.getElementById('bp-tanggal').value = '';
  document.getElementById('bp-tanpa-npwp').checked = false;
  document.getElementById('bp-jenis').value = 'pph21-tetap';
  onBupotJenisChange();
}

/* ---- riwayat bukti potong ---- */
const BP_HISTORY_KEY = 'simspt_bupot_history_v1';
function loadBupotHistory() { try { return JSON.parse(localStorage.getItem(BP_HISTORY_KEY)) || []; } catch (e) { return []; } }
function saveBupotHistory() {
  const jenis = document.getElementById('bp-jenis').value;
  const totalText = document.querySelector('#bp-preview .doc-totals .grand .num');
  const list = loadBupotHistory();
  list.unshift({
    id: Date.now(),
    jenis,
    pemotong: document.getElementById('bp-pemotong-nama').value || '-',
    terima: document.getElementById('bp-terima-nama').value || '-',
    tanggal: document.getElementById('bp-tanggal').value || todayISO(),
    total: totalText ? totalText.textContent : '0'
  });
  localStorage.setItem(BP_HISTORY_KEY, JSON.stringify(list.slice(0, 30)));
  renderBupotHistory();
}
function deleteBupotHistory(id) {
  localStorage.setItem(BP_HISTORY_KEY, JSON.stringify(loadBupotHistory().filter(h => h.id !== id)));
  renderBupotHistory();
}
function renderBupotHistory() {
  const list = loadBupotHistory();
  const el = document.getElementById('bp-history-list');
  if (!list.length) { el.innerHTML = '<div class="empty-state">Belum ada bukti potong tersimpan.</div>'; return; }
  el.innerHTML = list.map(h => `
    <div class="history-item">
      <div><strong>${esc(h.pemotong)} → ${esc(h.terima)}</strong><div class="meta">${esc(BUPOT_JENIS_DESC[h.jenis] ? h.jenis : h.jenis)} · ${fmtTanggal(h.tanggal)} · Rp ${esc(h.total)}</div></div>
      <button type="button" title="Hapus" data-delete-bupot-id="${h.id}">✕</button>
    </div>`).join('');
}

/* ---------- prefill dari SIM-Accounting (lintas-app) ---------- */
// Dipanggil kalau modul ini dibuka dari tombol "Buat Faktur Pajak (SIM-SPT)" di
// invoice apps/accounting (lihat handleCreateFakturPajakLink() di
// js/presentation/taxUI.js) — hanya membaca query string, tidak ada API call
// ataupun sinkronisasi otomatis, jadi tetap aman dipakai lepas dari
// apps/accounting (kalau parameter tidak ada, form kosong seperti biasa).
function applyPrefillFromURL() {
  const p = new URLSearchParams(window.location.search);
  if (![...p.keys()].length) return;

  if (p.get('seller_name')) document.getElementById('fk-penjual-nama').value = p.get('seller_name');
  if (p.get('seller_npwp')) document.getElementById('fk-penjual-npwp').value = p.get('seller_npwp');
  if (p.get('buyer_name')) document.getElementById('fk-pembeli-nama').value = p.get('buyer_name');
  if (p.get('buyer_npwp')) document.getElementById('fk-pembeli-npwp').value = p.get('buyer_npwp');
  if (p.get('date')) document.getElementById('fk-tanggal').value = p.get('date');

  const dpp = Number(p.get('dpp'));
  if (dpp > 0) {
    const ref = p.get('ref') || '';
    fakturItems = [{ nama: ref ? `Sesuai Invoice ${ref} (SIM-Accounting)` : 'Sesuai Invoice (SIM-Accounting)', qty: 1, harga: dpp }];
  }
}

/* ---------- init & pengkabelan event (tanpa atribut inline, ramah CSP) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fk-tanggal').value = todayISO();
  document.getElementById('bp-tanggal').value = todayISO();
  applyPrefillFromURL();

  // --- Tab ---
  document.getElementById('tabBtnFaktur').addEventListener('click', () => switchTab('faktur'));
  document.getElementById('tabBtnBupot').addEventListener('click', () => switchTab('bupot'));

  // --- Faktur Pajak: kontrol statis ---
  ['fk-penjual-nama', 'fk-penjual-npwp', 'fk-tanggal', 'fk-pembeli-nama', 'fk-pembeli-npwp',
   'fk-potongan', 'fk-uangmuka', 'fk-ppnbm-rate'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderFaktur);
  });
  ['fk-kode-transaksi', 'fk-status', 'fk-format-nsfp'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderFaktur);
  });
  ['fk-barang-mewah', 'fk-ekspor'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderFaktur);
  });
  document.getElementById('fk-add-item').addEventListener('click', addFakturItem);
  document.getElementById('fk-btn-print').addEventListener('click', () => window.print());
  document.getElementById('fk-btn-save').addEventListener('click', saveFakturHistory);
  document.getElementById('fk-btn-reset').addEventListener('click', resetFaktur);

  // --- Faktur Pajak: baris rincian barang/jasa (dibuat ulang tiap render -> delegasi) ---
  document.getElementById('fk-items-body').addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.idx === undefined) return;
    updateFakturItem(Number(t.dataset.idx), t.dataset.field, t.value);
  });
  document.getElementById('fk-items-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-idx]');
    if (btn) removeFakturItem(Number(btn.dataset.removeIdx));
  });

  // --- Faktur Pajak: riwayat (delegasi, karena baris dibuat ulang tiap render) ---
  document.getElementById('fk-history-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-faktur-id]');
    if (btn) deleteFakturHistory(Number(btn.dataset.deleteFakturId));
  });

  // --- Bukti Potong: kontrol statis ---
  document.getElementById('bp-jenis').addEventListener('change', onBupotJenisChange);
  ['bp-pemotong-nama', 'bp-pemotong-npwp', 'bp-terima-nama', 'bp-terima-npwp', 'bp-tanggal'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderBupot);
  });
  document.getElementById('bp-tanpa-npwp').addEventListener('change', renderBupot);
  document.getElementById('bp-btn-print').addEventListener('click', () => window.print());
  document.getElementById('bp-btn-save').addEventListener('click', saveBupotHistory);
  document.getElementById('bp-btn-reset').addEventListener('click', resetBupot);

  // --- Bukti Potong: field dinamis (bp-bruto/bp-ptkp/bp-objek dibuat ulang tiap ganti jenis -> delegasi) ---
  const bpFieldsDynamic = document.getElementById('bp-fields-dynamic');
  bpFieldsDynamic.addEventListener('input', (e) => { if (e.target.id === 'bp-bruto') renderBupot(); });
  bpFieldsDynamic.addEventListener('change', (e) => { if (e.target.id === 'bp-ptkp' || e.target.id === 'bp-objek') renderBupot(); });

  // --- Bukti Potong: riwayat (delegasi) ---
  document.getElementById('bp-history-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-bupot-id]');
    if (btn) deleteBupotHistory(Number(btn.dataset.deleteBupotId));
  });

  renderFakturItemsTable();
  renderFaktur();
  onBupotJenisChange();
  renderFakturHistory();
  renderBupotHistory();

  // Validasi & auto-format NPWP/NIK secara live (lihat js/shared/npwp-utils.js).
  if (window.NPWPUtils) {
    [
      ['fk-penjual-npwp', 'fk-penjual-npwp-hint', renderFaktur],
      ['fk-pembeli-npwp', 'fk-pembeli-npwp-hint', renderFaktur],
      ['bp-pemotong-npwp', 'bp-pemotong-npwp-hint', renderBupot],
      ['bp-terima-npwp', 'bp-terima-npwp-hint', renderBupot]
    ].forEach(([inputId, hintId, renderFn]) => {
      const el = document.getElementById(inputId);
      NPWPUtils.bindNPWPField(el, document.getElementById(hintId));
      // bindNPWPField merapikan format (spasi tiap 4 digit) saat blur lewat `.value =`,
      // yang tidak memicu event 'input' — panggil render manual supaya pratinjau ikut update.
      el.addEventListener('blur', renderFn);
    });
  }

  // ikut tema gelap/terang milik shell utama (dibaca dari localStorage yang sama)
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.setAttribute('data-theme', 'dark');
  } catch (e) {}
});
