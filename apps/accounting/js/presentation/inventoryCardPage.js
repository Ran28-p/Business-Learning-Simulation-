/**
 * Presentation Layer – Kartu Persediaan (Stock Ledger)
 * ============================================================
 * Dua mode:
 *  - "Kunci Jawaban": tabel Masuk/Keluar/Saldo lengkap, dibangun murni
 *    dari `tx.inventoryMovement` (lihat catatan di bawah) — TIDAK
 *    menyentuh engine.js / validationEngine.js sama sekali.
 *  - "Latihan": data Masuk ditampilkan apa adanya (fakta, bukan soal),
 *    tapi untuk setiap transaksi Keluar/Retur siswa harus MENGHITUNG
 *    SENDIRI berapa HPP-nya (sesuai FIFO/rata-rata perusahaan itu) dan
 *    mengetik jawabannya. Kolom Saldo disembunyikan total di mode ini —
 *    kalau ditampilkan, siswa bisa mundur-hitung (reverse-engineer)
 *    jawaban Keluar dari selisih saldo, jadi latihannya percuma.
 *
 * `tx.inventoryMovement` disematkan oleh js/generators/transactionGenerator.js
 * pada transaksi Level 2 (Dagang): PURCHASE_CREDIT (masuk), SALE_CASH/
 * SALE_CREDIT (keluar), PURCHASE_RETURN (retur/keluar). Field ini murni
 * metadata tambahan pada objek transaksi yang sudah ada — tidak
 * mempengaruhi jurnal/skor jurnal sama sekali.
 */
import { getLoadedTransactions, getLoadedAdjustments } from '../accounting/transactions.js';
import { formatNumber } from '../utils/formatters.js';
import { isExamActive } from '../business/modeManager.js';
import { rewardInventoryCardSuccess, getScoreSummary } from '../business/gamification.js';
import { updateNavbarStats, updateScoreDisplay, renderBadges } from './components.js';

const BELUM_ADA_MSG =
  'Kartu Persediaan hanya berlaku untuk <b>Perusahaan Dagang (Level 2)</b> atau ' +
  '<b>Perusahaan Manufaktur (Level 3)</b> yang metode costing-nya sudah dimuat. Buka ' +
  '<b>Kasus Latihan</b> (atau ganti level perusahaan) untuk memuat data transaksi terlebih dahulu.';

const UJIAN_MSG =
  'Mode Latihan Kartu Persediaan dinonaktifkan selama <b>Mode Ujian</b> berlangsung. ' +
  'Ini hanya menampilkan kunci jawaban untuk referensi.';

// Mode & track aktif disimpan di module-level state (bukan localStorage) —
// sengaja reset tiap reload halaman, supaya siswa selalu mulai dari
// referensi dulu, bukan nyangkut di tengah sesi latihan lama.
let currentMode = 'jawaban'; // 'jawaban' | 'latihan' | 'bandingkan'
// Track = satu lini persediaan yang di-costing sendiri: nama produk
// (Level 2, bisa >1 lini) atau 'Bahan Baku'/'Barang Jadi' (Level 3 — dua
// tahap costing terpisah). null = belum dipilih, dipilih otomatis ke
// track pertama begitu data dimuat.
let currentTrack = null;

/** Kelompokkan transaksi ber-inventoryMovement berdasarkan track-nya,
 * dengan urutan MUNCUL PERTAMA KALI (bukan alfabetis) — supaya untuk
 * Level 3, "Bahan Baku" selalu di tab pertama (dibeli sebelum barang
 * jadi ada), dan untuk Level 2, urutan tab mengikuti urutan cerita. */
function groupByTrack(movements) {
  const order = [];
  const byTrack = {};
  movements.forEach(tx => {
    const name = tx.inventoryMovement.track || tx.inventoryMovement.productName;
    if (!byTrack[name]) { byTrack[name] = []; order.push(name); }
    byTrack[name].push(tx);
  });
  return { order, byTrack };
}

function renderTrackTabs(order, active) {
  if (order.length <= 1) return '';
  const tabs = order.map(name => {
    const isActive = name === active;
    const style = isActive
      ? 'border-bottom:2px solid var(--accent-color); color:var(--accent-color); font-weight:600;'
      : 'border-bottom:2px solid transparent; color:var(--text-secondary);';
    return `<button type="button" data-inv-track="${name}"
              style="padding:8px 4px; margin-right:20px; background:none; border:none; border-bottom-width:2px; cursor:pointer; font-size:14px; ${style}">
              ${name}
            </button>`;
  }).join('');
  return `<div style="display:flex; border-bottom:1px solid var(--border-color); margin-bottom:16px;">${tabs}</div>`;
}

function methodLabel(method) {
  if (method === 'AVG') return 'Rata-rata Tertimbang (Perpetual)';
  if (method === 'FIFO') return 'FIFO (First-In-First-Out)';
  return '–';
}

/** Pergerakan yang MENAMBAH stok: pembelian ('IN'), saldo awal
 * ('OPENING_IN') & retur penjualan ('SALES_RETURN_IN' — barang kembali dari pelanggan). Keduanya fakta yang
 * diketahui, bukan soal hitungan, jadi diperlakukan sama di semua mode. */
function isInbound(type) {
  return type === 'IN' || type === 'SALES_RETURN_IN' || type === 'OPENING_IN';
}

function movementBadge(type) {
  if (type === 'OPENING_IN') return { label: 'Saldo Awal', cls: 'badge-status-lunas' };
  if (type === 'SALES_RETURN_IN') return { label: 'Retur Jual', cls: 'badge-status-sebagian' };
  if (type === 'IN') return { label: 'Masuk', cls: 'badge-status-lunas' };
  if (type === 'RETURN_OUT') return { label: 'Retur', cls: 'badge-status-sebagian' };
  return { label: 'Keluar', cls: 'badge-status-belum' };
}

/** Nilai kunci jawaban untuk satu movement Keluar/Retur (dalam Rupiah). */
function correctValueOf(m) {
  return m.type === 'RETURN_OUT' ? m.amount : m.cogs;
}

/**
 * Toleransi penilaian. FIFO & retur pembelian bisa dihitung PERSIS
 * (tidak ada pembulatan sistem yang terlibat), jadi toleransinya cuma
 * untuk memaafkan typo/pembulatan tangan kecil. Rata-rata tertimbang
 * butuh toleransi lebih longgar karena pembagian desimal — siswa yang
 * membulatkan harga rata-rata per unit ke rupiah penuh di tengah
 * perhitungan (wajar dilakukan manual) bisa berbeda tipis dari kunci
 * jawaban sistem.
 */
function toleranceFor(correctVal, method) {
  if (method === 'AVG') return Math.max(500, Math.round(correctVal * 0.01));
  return 500;
}

function parseRupiahInput(raw) {
  if (raw == null) return NaN;
  const cleaned = String(raw).replace(/[^\d-]/g, '');
  if (cleaned === '' || cleaned === '-') return NaN;
  return parseInt(cleaned, 10);
}

/**
 * Ringkasan singkat batch mana saja yang tersentuh oleh satu transaksi
 * keluar (penjualan/retur) — hanya ditampilkan kalau lebih dari 1 batch
 * tersentuh, supaya kelihatan jelas kapan FIFO "pindah batch" atau kapan
 * rata-rata dihitung dari campuran beberapa batch.
 */
function renderBreakdownNote(breakdown) {
  if (!breakdown || breakdown.length <= 1) return '';
  const parts = breakdown
    .map(b => `${b.date}: ${formatNumber(b.qtyTaken)} unit @ Rp ${formatNumber(Math.round(b.unitCost))}`)
    .join(', ');
  return `<div style="font-size:12px; color:var(--text-light); margin-top:4px;">Diambil dari ${breakdown.length} batch — ${parts}</div>`;
}

function renderModeToggle(activeMode, disabled) {
  const btn = (mode, label) => {
    const isActive = activeMode === mode;
    const style = isActive
      ? 'background:var(--accent-color); color:#fff;'
      : 'background:transparent; color:var(--text-secondary); border:1px solid var(--border-color);';
    return `<button type="button" data-inv-mode="${mode}" ${disabled && mode === 'latihan' ? 'disabled' : ''}
              style="padding:6px 14px; border-radius:var(--radius-sm); border:none; cursor:${disabled && mode === 'latihan' ? 'not-allowed' : 'pointer'}; font-size:13px; ${style}">
              ${label}
            </button>`;
  };
  return `
    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      ${btn('jawaban', '📖 Kunci Jawaban')}
      ${btn('latihan', '✏️ Latihan')}
      ${btn('bandingkan', '🔀 Bandingkan Metode')}
    </div>`;
}

function renderHeaderInfo(first) {
  return `
    <div style="margin-bottom:12px; display:flex; gap:24px; flex-wrap:wrap; color:var(--text-secondary); font-size:14px;">
      <div><strong>Produk:</strong> ${first.productName}</div>
      <div><strong>Metode Costing:</strong> ${methodLabel(first.method)}</div>
    </div>`;
}

/* ───────────────────────── Mode: Kunci Jawaban ───────────────────────── */

function renderAnswerRow(tx) {
  const m = tx.inventoryMovement;
  const totalQty = m.layersAfter.reduce((s, l) => s + l.qty, 0);
  const totalValue = m.layersAfter.reduce((s, l) => s + l.qty * l.unitCost, 0);
  const avgUnit = totalQty > 0 ? Math.round(totalValue / totalQty) : 0;
  const badge = movementBadge(m.type);

  let masukUnit = '', masukHarga = '', masukJumlah = '';
  let keluarUnit = '', keluarHarga = '', keluarJumlah = '';
  let note = '';

  if (isInbound(m.type)) {
    masukUnit = formatNumber(m.qty);
    masukHarga = formatNumber(Math.round(m.unitCost));
    masukJumlah = formatNumber(m.amount);
  } else if (m.type === 'OUT') {
    keluarUnit = formatNumber(m.qty);
    keluarHarga = formatNumber(Math.round(m.cogs / m.qty));
    keluarJumlah = formatNumber(m.cogs);
    note = renderBreakdownNote(m.breakdown);
  } else if (m.type === 'RETURN_OUT') {
    keluarUnit = formatNumber(m.qty);
    keluarHarga = formatNumber(Math.round(m.amount / m.qty));
    keluarJumlah = formatNumber(m.amount);
    note = renderBreakdownNote(m.breakdown);
  }

  return `
    <tr>
      <td style="white-space:nowrap;">${tx.tanggal}</td>
      <td>
        <span class="badge-pill ${badge.cls}" style="margin-right:8px;">${badge.label}</span>
        ${tx.deskripsi}
        ${note}
      </td>
      <td style="text-align:right;">${masukUnit}</td>
      <td style="text-align:right;">${masukHarga}</td>
      <td style="text-align:right;">${masukJumlah}</td>
      <td style="text-align:right;">${keluarUnit}</td>
      <td style="text-align:right;">${keluarHarga}</td>
      <td style="text-align:right;">${keluarJumlah}</td>
      <td style="text-align:right; font-weight:600;">${formatNumber(totalQty)}</td>
      <td style="text-align:right;">${totalQty > 0 ? formatNumber(avgUnit) : '-'}</td>
      <td style="text-align:right; font-weight:600;">${formatNumber(totalValue)}</td>
    </tr>`;
}

function renderClosingBatchDetail(method, closingLayers) {
  if (method !== 'FIFO' || !closingLayers || closingLayers.length <= 1) return '';
  const items = closingLayers
    .map(b => `<li>${b.date}: ${formatNumber(b.qty)} unit @ Rp ${formatNumber(b.unitCost)} = Rp ${formatNumber(b.qty * b.unitCost)}</li>`)
    .join('');
  return `
    <div style="margin-top:20px; padding:16px; background:var(--bg-primary); border-radius:var(--radius-sm);">
      <h4 style="margin-top:0; margin-bottom:8px;">Rincian Batch Persediaan Akhir (FIFO)</h4>
      <p style="margin:0 0 8px; color:var(--text-light); font-size:13px;">
        Karena metode FIFO, sisa persediaan bisa terdiri dari beberapa batch dengan harga beli berbeda.
        Kolom "Harga/Unit" pada Saldo di tabel di atas menunjukkan harga rata-rata gabungan; rincian per batch:
      </p>
      <ul style="margin:0; padding-left:20px;">${items}</ul>
    </div>`;
}

/**
 * Ringkasan hasil stock opname akhir periode (kalau ada). Hanya fakta —
 * buku vs fisik dan nilai selisih; jurnal penyesuaiannya sengaja TIDAK
 * ditulis di sini karena itu bagian yang dikerjakan siswa di halaman
 * Jurnal Penyesuaian.
 */
function renderOpnamePanel(trackName) {
  const adj = (getLoadedAdjustments() || []).find(a => a.inventoryOpname && a.inventoryOpname.track === trackName);
  if (!adj) return '';
  const o = adj.inventoryOpname;
  const kurang = o.kind === 'KURANG';
  return `
    <div style="margin-top:20px; padding:16px; border-radius:var(--radius-sm); background:var(--bg-primary); border-left:4px solid ${kurang ? 'var(--danger)' : 'var(--warning)'};">
      <h4 style="margin-top:0; margin-bottom:8px;">📦 Stock Opname Akhir Periode</h4>
      <div style="display:flex; gap:24px; flex-wrap:wrap; font-size:14px;">
        <div><strong>Menurut kartu:</strong> ${formatNumber(o.bookQty)} unit</div>
        <div><strong>Hitung fisik:</strong> ${formatNumber(o.physicalQty)} unit</div>
        <div><strong>Selisih:</strong> ${kurang ? 'kurang' : 'lebih'} ${formatNumber(o.diffQty)} unit</div>
        <div><strong>Nilai selisih (${o.method === 'AVG' ? 'rata-rata' : 'FIFO'}):</strong> Rp ${formatNumber(o.value)}</div>
      </div>
      <p style="margin:8px 0 0; color:var(--text-light); font-size:13px;">
        Selisih ini dicatat lewat jurnal penyesuaian di akhir periode — bukan bagian dari pergerakan kartu di atas.
      </p>
    </div>`;
}

function renderJawabanMode(container, movements, examLocked) {
  const first = movements[0].inventoryMovement;
  const last = movements[movements.length - 1].inventoryMovement;
  const rows = movements.map(renderAnswerRow).join('');

  container.innerHTML = `
    ${renderModeToggle('jawaban', examLocked)}
    ${examLocked ? `<p style="color:var(--text-light); font-size:13px; margin-top:-8px;">${UJIAN_MSG}</p>` : ''}
    ${renderHeaderInfo(first)}
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align:bottom;">Tanggal</th>
            <th rowspan="2" style="vertical-align:bottom;">Keterangan</th>
            <th colspan="3" style="text-align:center;">Masuk</th>
            <th colspan="3" style="text-align:center;">Keluar</th>
            <th colspan="3" style="text-align:center;">Saldo</th>
          </tr>
          <tr>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">Harga/Unit</th>
            <th style="text-align:right;">Jumlah (Rp)</th>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">Harga/Unit</th>
            <th style="text-align:right;">Jumlah (Rp)</th>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">Harga/Unit</th>
            <th style="text-align:right;">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${renderClosingBatchDetail(last.method, last.layersAfter)}
    ${renderOpnamePanel(first.track || first.productName)}
  `;

  bindToggleButtons(container, movements, examLocked);
}

/* ───────────────────────── Mode: Latihan ───────────────────────── */

function renderLatihanRow(tx, idx) {
  const m = tx.inventoryMovement;
  const badge = movementBadge(m.type);
  const isGraded = !isInbound(m.type);

  let masukUnit = '', masukHarga = '', masukJumlah = '';
  let keluarUnit = '', keluarCell = '<span style="color:var(--text-light);">–</span>';

  if (isInbound(m.type)) {
    masukUnit = formatNumber(m.qty);
    masukHarga = formatNumber(Math.round(m.unitCost));
    masukJumlah = formatNumber(m.amount);
  } else {
    keluarUnit = formatNumber(m.qty);
    keluarCell = `<input type="text" inputmode="numeric" data-inv-input="${idx}"
                    placeholder="Rp ..." autocomplete="off"
                    style="width:130px; text-align:right; padding:4px 8px; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-primary); color:inherit;">`;
  }

  return `
    <tr data-inv-row="${idx}">
      <td style="white-space:nowrap;">${tx.tanggal}</td>
      <td>
        <span class="badge-pill ${badge.cls}" style="margin-right:8px;">${badge.label}</span>
        ${tx.deskripsi}
        <div data-inv-feedback="${idx}"></div>
      </td>
      <td style="text-align:right;">${masukUnit}</td>
      <td style="text-align:right;">${masukHarga}</td>
      <td style="text-align:right;">${masukJumlah}</td>
      <td style="text-align:right;">${keluarUnit}</td>
      <td style="text-align:right;">${isGraded ? keluarCell : ''}</td>
    </tr>`;
}

function renderLatihanMode(container, movements) {
  const first = movements[0].inventoryMovement;
  const gradedCount = movements.filter(tx => !isInbound(tx.inventoryMovement.type)).length;
  const rows = movements.map((tx, idx) => renderLatihanRow(tx, idx)).join('');

  container.innerHTML = `
    ${renderModeToggle('latihan', false)}
    ${renderHeaderInfo(first)}
    <div style="margin-bottom:12px; padding:12px 16px; background:var(--bg-primary); border-radius:var(--radius-sm); font-size:13px; color:var(--text-secondary);">
      Data <strong>Masuk</strong> sudah diketahui (fakta pembelian). Untuk tiap transaksi <strong>Keluar</strong>/<strong>Retur</strong>,
      hitung sendiri <strong>Harga Pokok Penjualan / nilai retur totalnya (Rp)</strong> sesuai metode
      <strong>${methodLabel(first.method)}</strong> perusahaan ini, berdasarkan batch-batch yang sudah masuk sampai saat itu.
      Kolom Saldo sengaja disembunyikan supaya tidak membocorkan jawaban.
    </div>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align:bottom;">Tanggal</th>
            <th rowspan="2" style="vertical-align:bottom;">Keterangan</th>
            <th colspan="3" style="text-align:center;">Masuk (diketahui)</th>
            <th colspan="2" style="text-align:center;">Keluar / Retur — isi HPP-nya</th>
          </tr>
          <tr>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">Harga/Unit</th>
            <th style="text-align:right;">Jumlah (Rp)</th>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div id="invCardResultBanner" style="margin-top:16px;"></div>
    <div style="margin-top:16px; display:flex; gap:8px;">
      <button type="button" class="btn btn-success" data-inv-check="1" ${gradedCount === 0 ? 'disabled' : ''}>✅ Cek Jawaban</button>
      <button type="button" class="btn btn-danger btn-sm" data-inv-reset="1">↺ Coba Lagi</button>
    </div>
  `;

  bindToggleButtons(container, movements, false);
  bindLatihanEvents(container, movements);
}

function bindLatihanEvents(container, movements) {
  const checkBtn = container.querySelector('[data-inv-check]');
  const resetBtn = container.querySelector('[data-inv-reset]');
  const banner = container.querySelector('#invCardResultBanner');

  if (checkBtn) {
    checkBtn.addEventListener('click', () => {
      let correctCount = 0;
      let gradedCount = 0;

      movements.forEach((tx, idx) => {
        const m = tx.inventoryMovement;
        if (isInbound(m.type)) return;
        gradedCount++;

        const input = container.querySelector(`[data-inv-input="${idx}"]`);
        const feedbackEl = container.querySelector(`[data-inv-feedback="${idx}"]`);
        if (!input) return;

        const userVal = parseRupiahInput(input.value);
        const correctVal = correctValueOf(m);
        const tolerance = toleranceFor(correctVal, m.method);
        const isCorrect = Number.isFinite(userVal) && Math.abs(userVal - correctVal) <= tolerance;

        if (isCorrect) correctCount++;

        input.style.borderColor = isCorrect ? 'var(--success)' : 'var(--danger)';
        input.style.borderWidth = '2px';

        if (feedbackEl) {
          if (isCorrect) {
            feedbackEl.innerHTML = `<div style="font-size:12px; color:var(--success); margin-top:4px;">✓ Benar</div>`;
          } else {
            feedbackEl.innerHTML = `
              <div style="font-size:12px; color:var(--danger); margin-top:4px;">
                ✗ Jawaban Anda: Rp ${Number.isFinite(userVal) ? formatNumber(userVal) : '(kosong)'} —
                yang benar: Rp ${formatNumber(correctVal)}
              </div>
              ${renderBreakdownNote(m.breakdown)}`;
          }
        }
      });

      const pct = gradedCount > 0 ? Math.round((correctCount / gradedCount) * 100) : 0;
      const allCorrect = gradedCount > 0 && correctCount === gradedCount;

      if (banner) {
        banner.innerHTML = `
          <div style="padding:14px 18px; border-radius:var(--radius-sm); background:${allCorrect ? 'var(--success)' : 'var(--bg-primary)'}; color:${allCorrect ? '#fff' : 'var(--text-secondary)'};">
            <strong>${allCorrect ? '🎉 Sempurna!' : 'Hasil'}</strong> — ${correctCount}/${gradedCount} benar (${pct}%)
            ${allCorrect ? ' — semua transaksi Keluar/Retur dihitung dengan tepat!' : ' — cek baris yang ditandai merah di atas.'}
          </div>`;
      }

      if (allCorrect) {
        const stats = rewardInventoryCardSuccess();
        updateNavbarStats({ xp: stats.xp, userLevel: stats.userLevel });
        updateScoreDisplay(getScoreSummary());
        renderBadges();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => renderLatihanMode(container, movements));
  }
}

/* ───────────────────────── Mode: Bandingkan Metode ───────────────────────── */

function formatDiff(diff) {
  if (diff === 0) return '<span style="color:var(--text-light);">—</span>';
  const sign = diff > 0 ? '+' : '−';
  const color = diff > 0 ? 'var(--danger)' : 'var(--success)';
  return `<span style="color:${color}; font-weight:600;">${sign} Rp ${formatNumber(Math.abs(diff))}</span>`;
}

function renderComparisonRow(tx) {
  const m = tx.inventoryMovement;
  if (isInbound(m.type)) return '';
  const badge = movementBadge(m.type);
  const primaryVal = correctValueOf(m);
  const altVal = m.type === 'RETURN_OUT' ? m.alt.amount : m.alt.cogs;
  const diff = altVal - primaryVal; // positif = metode alternatif MENCATAT LEBIH BESAR

  return `
    <tr>
      <td style="white-space:nowrap;">${tx.tanggal}</td>
      <td>
        <span class="badge-pill ${badge.cls}" style="margin-right:8px;">${badge.label}</span>
        ${tx.deskripsi}
      </td>
      <td style="text-align:right;">${formatNumber(m.qty)}</td>
      <td style="text-align:right; font-weight:600;">${formatNumber(primaryVal)}</td>
      <td style="text-align:right; font-weight:600;">${formatNumber(altVal)}</td>
      <td style="text-align:right;">${formatDiff(diff)}</td>
    </tr>`;
}

function renderComparisonMode(container, movements) {
  const first = movements[0].inventoryMovement;
  const method = first.method;
  const altMethod = first.alt.method;

  let totalCogsPrimary = 0, totalCogsAlt = 0;
  let totalReturnPrimary = 0, totalReturnAlt = 0;
  let totalSales = 0;
  let hasSales = false;

  movements.forEach(tx => {
    const m = tx.inventoryMovement;
    if (m.type === 'OUT') {
      totalCogsPrimary += m.cogs;
      totalCogsAlt += m.alt.cogs;
      // ISSUE_RAW_TO_WIP (Level 3, track Bahan Baku) juga bertipe 'OUT'
      // tapi bukan penjualan — tidak punya `sales`, jadi tidak ikut
      // dihitung ke Laba Kotor (yang cuma relevan untuk track yang
      // benar-benar menjual, mis. produk dagang atau Barang Jadi).
      if (m.sales != null) {
        totalSales += m.sales;
        hasSales = true;
      }
    } else if (m.type === 'RETURN_OUT') {
      totalReturnPrimary += m.amount;
      totalReturnAlt += m.alt.amount;
    }
  });

  const labaKotorPrimary = totalSales - totalCogsPrimary;
  const labaKotorAlt = totalSales - totalCogsAlt;
  const diffCogs = totalCogsAlt - totalCogsPrimary;
  const diffLaba = labaKotorAlt - labaKotorPrimary;
  const diffReturn = totalReturnAlt - totalReturnPrimary;

  const rows = movements.map(renderComparisonRow).join('');

  let takeaway = '';
  if (hasSales) {
    if (diffCogs === 0) {
      takeaway = `Untuk skenario ini, <strong>${methodLabel(method)}</strong> dan <strong>${methodLabel(altMethod)}</strong>
        kebetulan menghasilkan total HPP yang sama persis — biasanya terjadi kalau setiap penjualan cuma pernah menyentuh satu batch pembelian saja.`;
    } else {
      const lebih = diffCogs > 0 ? 'lebih tinggi' : 'lebih rendah';
      const lebihLaba = diffLaba > 0 ? 'lebih tinggi' : 'lebih rendah';
      takeaway = `Kalau perusahaan ini pakai <strong>${methodLabel(altMethod)}</strong> alih-alih <strong>${methodLabel(method)}</strong>
        (metode resminya), total HPP jadi <strong>Rp ${formatNumber(Math.abs(diffCogs))} ${lebih}</strong> —
        karena pendapatan penjualan tidak berubah (harga jual tidak tergantung metode pencatatan),
        Laba Kotor jadi <strong>Rp ${formatNumber(Math.abs(diffLaba))} ${lebihLaba}</strong>.`;
    }
  } else if (diffCogs !== 0) {
    // Track yang tidak pernah dijual langsung (mis. Bahan Baku — dipakai
    // ke produksi, bukan dijual) tetap dapat kesimpulan, tapi soal HPP
    // saja, tanpa menyinggung Laba Kotor (yang tidak relevan di sini).
    const lebih = diffCogs > 0 ? 'lebih tinggi' : 'lebih rendah';
    takeaway = `Kalau dipakai ke produksi dengan <strong>${methodLabel(altMethod)}</strong> alih-alih
      <strong>${methodLabel(method)}</strong>, total HPP yang masuk ke Barang Dalam Proses dari track ini
      jadi <strong>Rp ${formatNumber(Math.abs(diffCogs))} ${lebih}</strong>.`;
  }

  container.innerHTML = `
    ${renderModeToggle('bandingkan', false)}
    ${renderHeaderInfo(first)}
    <div style="margin-bottom:12px; padding:12px 16px; background:var(--bg-primary); border-radius:var(--radius-sm); font-size:13px; color:var(--text-secondary);">
      Transaksi pembelian, tanggal, dan kuantitas yang dijual <strong>persis sama</strong> di kedua kolom —
      satu-satunya yang beda adalah metode kalkulasi HPP-nya. Kolom <strong>${methodLabel(method)}</strong>
      adalah metode resmi perusahaan ini (dipakai di jurnal jawaban); kolom <strong>${methodLabel(altMethod)}</strong>
      murni untuk perbandingan "bagaimana kalau".
    </div>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Keterangan</th>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">HPP — ${method}</th>
            <th style="text-align:right;">HPP — ${altMethod}</th>
            <th style="text-align:right;">Selisih</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
      <div style="padding:14px 16px; border-radius:var(--radius-sm); background:var(--bg-primary);">
        <div style="font-size:12px; color:var(--text-light); margin-bottom:4px;">Total HPP — ${method} (resmi)</div>
        <div style="font-size:18px; font-weight:700;">Rp ${formatNumber(totalCogsPrimary)}</div>
      </div>
      <div style="padding:14px 16px; border-radius:var(--radius-sm); background:var(--bg-primary);">
        <div style="font-size:12px; color:var(--text-light); margin-bottom:4px;">Total HPP — ${altMethod}</div>
        <div style="font-size:18px; font-weight:700;">Rp ${formatNumber(totalCogsAlt)} ${diffCogs !== 0 ? `<span style="font-size:12px;">(${formatDiff(diffCogs)})</span>` : ''}</div>
      </div>
      ${hasSales ? `
      <div style="padding:14px 16px; border-radius:var(--radius-sm); background:var(--bg-primary);">
        <div style="font-size:12px; color:var(--text-light); margin-bottom:4px;">Laba Kotor — ${method} (resmi)</div>
        <div style="font-size:18px; font-weight:700;">Rp ${formatNumber(labaKotorPrimary)}</div>
      </div>
      <div style="padding:14px 16px; border-radius:var(--radius-sm); background:var(--bg-primary);">
        <div style="font-size:12px; color:var(--text-light); margin-bottom:4px;">Laba Kotor — ${altMethod}</div>
        <div style="font-size:18px; font-weight:700;">Rp ${formatNumber(labaKotorAlt)} ${diffLaba !== 0 ? `<span style="font-size:12px;">(${formatDiff(diffLaba)})</span>` : ''}</div>
      </div>` : ''}
    </div>
    ${totalReturnPrimary > 0 || totalReturnAlt > 0 ? `
    <div style="margin-top:12px; font-size:13px; color:var(--text-light);">
      Nilai retur pembelian juga sedikit beda antar-metode (komposisi batch tersisa berbeda):
      ${method} = Rp ${formatNumber(totalReturnPrimary)}, ${altMethod} = Rp ${formatNumber(totalReturnAlt)}
      ${diffReturn !== 0 ? `(${formatDiff(diffReturn)})` : ''}.
    </div>` : ''}
    ${takeaway ? `<p style="margin-top:16px; line-height:1.6;">${takeaway}</p>` : ''}
  `;

  bindToggleButtons(container, movements, false);
}

/* ───────────────────────── Shared ───────────────────────── */

function bindToggleButtons(container, movements, examLocked) {
  container.querySelectorAll('[data-inv-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.invMode;
      if (target === currentMode) return;
      if (target === 'latihan' && examLocked) return;
      currentMode = target;
      renderInventoryCardPage();
    });
  });
}

export function renderInventoryCardPage() {
  const container = document.getElementById('inventoryCardContainer');
  if (!container) return;

  const txs = getLoadedTransactions();
  const allMovements = (txs || []).filter(t => t.inventoryMovement);

  if (!allMovements.length) {
    currentMode = 'jawaban';
    currentTrack = null;
    container.innerHTML = `<p style="color:var(--text-light);">${BELUM_ADA_MSG}</p>`;
    return;
  }

  const { order, byTrack } = groupByTrack(allMovements);
  if (!currentTrack || !byTrack[currentTrack]) currentTrack = order[0];
  const movements = byTrack[currentTrack];

  const tabsHTML = renderTrackTabs(order, currentTrack);
  if (tabsHTML) {
    container.innerHTML = tabsHTML + '<div id="inventoryCardBody"></div>';
    container.querySelectorAll('[data-inv-track]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.invTrack === currentTrack) return;
        currentTrack = btn.dataset.invTrack;
        renderInventoryCardPage();
      });
    });
  }
  const body = tabsHTML ? container.querySelector('#inventoryCardBody') : container;

  const examLocked = isExamActive();
  if (examLocked && currentMode === 'latihan') currentMode = 'jawaban';

  if (currentMode === 'latihan') {
    renderLatihanMode(body, movements);
  } else if (currentMode === 'bandingkan') {
    renderComparisonMode(body, movements);
  } else {
    renderJawabanMode(body, movements, examLocked);
  }
}
