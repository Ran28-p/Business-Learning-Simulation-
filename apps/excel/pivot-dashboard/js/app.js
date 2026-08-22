(function () {
  'use strict';

  const FIELDS = {
    bulan: { label: 'Bulan', col: 'C', type: 'dim' },
    wilayah: { label: 'Wilayah', col: 'D', type: 'dim' },
    salesRep: { label: 'Sales Rep', col: 'E', type: 'dim' },
    kategori: { label: 'Kategori Produk', col: 'F', type: 'dim' },
    produk: { label: 'Produk', col: 'G', type: 'dim' },
    qty: { label: 'Qty', col: 'H', type: 'val' },
    total: { label: 'Total (Rp)', col: 'J', type: 'val' },
  };
  const DIM_FIELDS = Object.keys(FIELDS).filter((k) => FIELDS[k].type === 'dim');
  const VAL_FIELDS = Object.keys(FIELDS).filter((k) => FIELDS[k].type === 'val');

  let hf = null;
  let dataSheetId = null;
  let dataset = [];
  let dataRowCount = 0;

  function fmtRp(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 'Rp0';
    return 'Rp' + Math.round(n).toLocaleString('id-ID');
  }
  // Compact form used ONLY for the bar-chart value labels (e.g. "Rp71,9jt" instead
  // of "Rp71.943.397"). This is what actually makes the label fit its column on
  // narrow screens instead of forcing the chart wider than the viewport; the full
  // precise value is still shown via the column's title tooltip. KPI cards, the
  // pivot table, and the raw data table are untouched and keep full precision.
  function fmtRpCompact(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 'Rp0';
    const abs = Math.abs(n);
    if (abs >= 1000000) return 'Rp' + (n / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'jt';
    if (abs >= 1000) return 'Rp' + (n / 1000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'rb';
    return fmtRp(n);
  }
  function esc(v) { return String(v).replace(/"/g, '""'); }
  function range(fieldKey) {
    const col = FIELDS[fieldKey].col;
    return `Data!${col}2:${col}${dataRowCount + 1}`;
  }
  function uniqueValues(fieldKey) {
    if (fieldKey === 'bulan') {
      return window.PivotDashboardData.BULAN_NAMA.filter((b) => dataset.some((r) => r.bulan === b));
    }
    const set = new Set(dataset.map((r) => r[fieldKey]));
    return Array.from(set).sort();
  }

  // ---------- Setup engine & data ----------
  function initEngine() {
    dataset = window.PivotDashboardData.generateSalesDataset(20250601);
    dataRowCount = dataset.length;
    const header = ['No', 'Tanggal', 'Bulan', 'Wilayah', 'Sales Rep', 'Kategori', 'Produk', 'Qty', 'Harga', 'Total'];
    const rows = dataset.map((r) => [r.no, r.tanggal, r.bulan, r.wilayah, r.salesRep, r.kategori, r.produk, r.qty, r.harga, r.total]);
    hf = window.HyperFormula.buildFromSheets({ Data: [header, ...rows] }, { licenseKey: 'gpl-v3' });
    dataSheetId = hf.getSheetId('Data');
  }

  function renderRawTable() {
    const table = document.getElementById('pdRawTable');
    const header = ['No', 'Tanggal', 'Bulan', 'Wilayah', 'Sales Rep', 'Kategori', 'Produk', 'Qty', 'Harga', 'Total'];
    let html = '<thead><tr>' + header.map((h) => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    // Tampilkan 40 baris pertama saja supaya ringan; catatan jumlah total ditampilkan di bawah.
    dataset.slice(0, 40).forEach((r) => {
      html += `<tr><td>${r.no}</td><td>${r.tanggal}</td><td>${r.bulan}</td><td>${r.wilayah}</td><td>${r.salesRep}</td><td>${r.kategori}</td><td>${r.produk}</td><td class="pd-num">${r.qty}</td><td class="pd-num">${fmtRp(r.harga)}</td><td class="pd-num">${fmtRp(r.total)}</td></tr>`;
    });
    html += '</tbody>';
    table.innerHTML = html;
    const note = document.createElement('p');
    note.style.cssText = 'font-size:12px;color:var(--efpg-ink-500);margin-top:8px;';
    note.textContent = `Menampilkan 40 dari ${dataset.length} baris data. Seluruh baris tetap dipakai penuh saat menghitung Pivot Table & Dashboard.`;
    table.closest('.pd-card').appendChild(note);
  }

  function populateFieldDropdowns() {
    const rowSel = document.getElementById('pdRowField');
    const colSel = document.getElementById('pdColField');
    const valSel = document.getElementById('pdValueField');
    const slicerSel = document.getElementById('pdSlicerWilayah');

    rowSel.innerHTML = DIM_FIELDS.map((k) => `<option value="${k}">${FIELDS[k].label}</option>`).join('');
    colSel.innerHTML = '<option value="">(Tidak ada)</option>' + DIM_FIELDS.map((k) => `<option value="${k}">${FIELDS[k].label}</option>`).join('');
    valSel.innerHTML = VAL_FIELDS.map((k) => `<option value="${k}">${FIELDS[k].label}</option>`).join('');
    rowSel.value = 'wilayah';
    colSel.value = 'kategori';
    valSel.value = 'total';

    uniqueValues('wilayah').forEach((w) => {
      const opt = document.createElement('option');
      opt.value = w; opt.textContent = w;
      slicerSel.appendChild(opt);
    });
  }

  // ---------- Pivot engine (SUMIFS/AVERAGEIFS/COUNTIFS via HyperFormula) ----------
  function aggFormula(aggFn, valueField, conditions) {
    if (aggFn === 'COUNT') {
      if (!conditions.length) return `=COUNTA(Data!A2:A${dataRowCount + 1})`;
      const parts = conditions.map((c) => `${range(c.field)},"${esc(c.value)}"`).join(',');
      return `=COUNTIFS(${parts})`;
    }
    if (aggFn === 'AVERAGE') {
      if (!conditions.length) return `=AVERAGE(${range(valueField)})`;
      // HyperFormula tidak menyediakan AVERAGEIFS (hanya AVERAGEIF satu-kriteria),
      // jadi rata-rata bersyarat dihitung manual: SUMIFS dibagi COUNTIFS.
      // IFERROR membungkus kasus COUNTIFS=0 (kombinasi tanpa data) supaya menghasilkan
      // 0 yang rapi, bukan error #DIV/0! yang membingungkan di tampilan.
      const parts = conditions.map((c) => `${range(c.field)},"${esc(c.value)}"`).join(',');
      return `=IFERROR(SUMIFS(${range(valueField)},${parts})/COUNTIFS(${parts}),0)`;
    }
    // SUM
    if (!conditions.length) return `=SUM(${range(valueField)})`;
    const parts = conditions.map((c) => `${range(c.field)},"${esc(c.value)}"`).join(',');
    return `=SUMIFS(${range(valueField)},${parts})`;
  }

  function buildPivot() {
    const rowField = document.getElementById('pdRowField').value;
    const colField = document.getElementById('pdColField').value;
    const valueField = document.getElementById('pdValueField').value;
    const aggFn = document.getElementById('pdAggFn').value;

    const rowVals = uniqueValues(rowField);
    const colVals = colField ? uniqueValues(colField) : ['__TOTAL__'];

    if (hf.getSheetId('Pivot') !== undefined) hf.removeSheet(hf.getSheetId('Pivot'));
    hf.addSheet('Pivot');
    const pivotId = hf.getSheetId('Pivot');

    // Tulis formula ke sheet 'Pivot': baris 0 kosong (header ditulis manual di HTML),
    // sel (r, c) menampung hasil agregasi untuk kombinasi rowVals[r] x colVals[c].
    const formulaGrid = [];
    const previewLines = [];
    rowVals.forEach((rv, r) => {
      const rowOut = [];
      colVals.forEach((cv, c) => {
        const conditions = [{ field: rowField, value: rv }];
        if (colField) conditions.push({ field: colField, value: cv });
        const f = aggFormula(aggFn, valueField, conditions);
        rowOut.push(f);
        if (r < 2 && c < 2) previewLines.push(f);
      });
      // Total baris (semua kolom untuk rowVals[r])
      rowOut.push(aggFormula(aggFn, valueField, [{ field: rowField, value: rv }]));
      formulaGrid.push(rowOut);
    });
    // Total kolom (semua baris untuk colVals[c]) + grand total
    const totalRow = colVals.map((cv) => (colField ? aggFormula(aggFn, valueField, [{ field: colField, value: cv }]) : aggFormula(aggFn, valueField, [])));
    totalRow.push(aggFormula(aggFn, valueField, []));
    formulaGrid.push(totalRow);

    hf.setCellContents({ sheet: pivotId, row: 0, col: 0 }, formulaGrid);

    // Baca hasil dan render tabel HTML.
    const table = document.getElementById('pdPivotTable');
    let html = '<thead><tr><th>' + FIELDS[rowField].label + ' \\ ' + (colField ? FIELDS[colField].label : 'Nilai') + '</th>';
    colVals.forEach((cv) => { html += `<th>${cv === '__TOTAL__' ? FIELDS[valueField].label : cv}</th>`; });
    html += '<th class="pd-total">Total Baris</th></tr></thead><tbody>';
    rowVals.forEach((rv, r) => {
      html += `<tr><th>${rv}</th>`;
      colVals.forEach((cv, c) => {
        const val = hf.getCellValue({ sheet: pivotId, row: r, col: c });
        html += `<td class="pd-num">${formatAggValue(val, aggFn, valueField)}</td>`;
      });
      const rowTotal = hf.getCellValue({ sheet: pivotId, row: r, col: colVals.length });
      html += `<td class="pd-num pd-total">${formatAggValue(rowTotal, aggFn, valueField)}</td></tr>`;
    });
    html += '<tr><th class="pd-total">Total Kolom</th>';
    colVals.forEach((cv, c) => {
      const val = hf.getCellValue({ sheet: pivotId, row: rowVals.length, col: c });
      html += `<td class="pd-num pd-total">${formatAggValue(val, aggFn, valueField)}</td>`;
    });
    const grand = hf.getCellValue({ sheet: pivotId, row: rowVals.length, col: colVals.length });
    html += `<td class="pd-num pd-total">${formatAggValue(grand, aggFn, valueField)}</td></tr>`;
    html += '</tbody>';
    table.innerHTML = html;

    document.getElementById('pdFormulaPreview').innerHTML =
      '<strong>Contoh formula yang dipakai di balik layar (dihitung HyperFormula):</strong><br>' +
      previewLines.slice(0, 3).map((f) => f.replace(/</g, '&lt;')).join('<br>');
  }

  function formatAggValue(val, aggFn, valueField) {
    if (typeof val !== 'number') return '–';
    if (aggFn === 'COUNT') return val.toLocaleString('id-ID');
    if (valueField === 'total') return fmtRp(val);
    return val.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  }

  function safeInt(n) {
    return (typeof n === 'number' && isFinite(n)) ? n.toLocaleString('id-ID') : '0';
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const wilayahFilter = document.getElementById('pdSlicerWilayah').value;
    const cond = wilayahFilter ? [{ field: 'wilayah', value: wilayahFilter }] : [];

    if (hf.getSheetId('DashKpi') !== undefined) hf.removeSheet(hf.getSheetId('DashKpi'));
    hf.addSheet('DashKpi');
    const kpiId = hf.getSheetId('DashKpi');
    hf.setCellContents({ sheet: kpiId, row: 0, col: 0 }, [[
      aggFormula('SUM', 'total', cond),
      aggFormula('SUM', 'qty', cond),
      aggFormula('COUNT', 'total', cond),
      aggFormula('AVERAGE', 'total', cond),
    ]]);
    const totalPenjualan = hf.getCellValue({ sheet: kpiId, row: 0, col: 0 });
    const totalQty = hf.getCellValue({ sheet: kpiId, row: 0, col: 1 });
    const jumlahTransaksi = hf.getCellValue({ sheet: kpiId, row: 0, col: 2 });
    const rataRata = hf.getCellValue({ sheet: kpiId, row: 0, col: 3 });

    document.getElementById('pdKpiRow').innerHTML = `
      <div class="pd-kpi-card"><div class="pd-kpi-label">Total Penjualan</div><div class="pd-kpi-value">${fmtRp(totalPenjualan)}</div></div>
      <div class="pd-kpi-card"><div class="pd-kpi-label">Total Qty Terjual</div><div class="pd-kpi-value">${safeInt(totalQty)}</div></div>
      <div class="pd-kpi-card"><div class="pd-kpi-label">Jumlah Transaksi</div><div class="pd-kpi-value">${safeInt(jumlahTransaksi)}</div></div>
      <div class="pd-kpi-card"><div class="pd-kpi-label">Rata-rata / Transaksi</div><div class="pd-kpi-value">${fmtRp(rataRata)}</div></div>
    `;

    renderBarChart('pdChartWilayah', 'wilayah', window.PivotDashboardData.WILAYAH, cond);
    renderBarChart('pdChartBulan', 'bulan', window.PivotDashboardData.BULAN_NAMA, cond);
  }

  function renderBarChart(containerId, fieldKey, categories, extraCond) {
    if (hf.getSheetId('DashChart') !== undefined) hf.removeSheet(hf.getSheetId('DashChart'));
    hf.addSheet('DashChart');
    const chartId = hf.getSheetId('DashChart');
    const conds = extraCond.filter((c) => c.field !== fieldKey);
    const formulas = categories.map((cat) => aggFormula('SUM', 'total', conds.concat([{ field: fieldKey, value: cat }])));
    hf.setCellContents({ sheet: chartId, row: 0, col: 0 }, [formulas]);
    const values = categories.map((cat, i) => hf.getCellValue({ sheet: chartId, row: 0, col: i }));
    const max = Math.max(1, ...values);
    const el = document.getElementById(containerId);
    el.innerHTML = categories.map((cat, i) => {
      const h = Math.max(2, Math.round((values[i] / max) * 160));
      return `<div class="pd-bar-col" title="${cat}: ${fmtRp(values[i])}"><div class="pd-bar-value">${fmtRpCompact(values[i])}</div><div class="pd-bar" style="height:${h}px"></div><div class="pd-bar-label">${cat}</div></div>`;
    }).join('');
  }

  // ---------- Latihan (non-graded prompts) ----------
  function renderExercises() {
    const pivotEx = [
      'Ubah Baris menjadi "Sales Rep" dan Kolom menjadi "Bulan" — sales rep mana yang penjualannya paling stabil tiap bulan?',
      'Ganti Nilai menjadi "Qty" dengan Agregasi "Average" — kategori produk mana yang rata-rata quantity per transaksinya paling besar?',
      'Coba Agregasi "Count" dengan Baris "Kategori Produk" — kategori mana yang paling sering muncul sebagai transaksi (bukan paling besar nilainya)?',
    ];
    const dashEx = [
      'Gunakan slicer Wilayah untuk fokus ke satu wilayah saja — perhatikan bagaimana KPI dan kedua chart ikut berubah otomatis.',
      'Bandingkan wilayah dengan Total Penjualan tertinggi vs Total Qty tertinggi — apakah wilayah yang sama, atau berbeda? Apa artinya bagi strategi harga?',
      'Perhatikan pola Total Penjualan per Bulan — bulan mana yang paling tinggi, dan coba pikirkan kemungkinan penyebabnya (musiman, promo, dll).',
    ];
    document.getElementById('pdExerciseList').innerHTML = pivotEx.map((t) => `<li>${t}</li>`).join('');
    document.getElementById('pdDashExerciseList').innerHTML = dashEx.map((t) => `<li>${t}</li>`).join('');
  }

  // ---------- Tabs ----------
  function wireTabs() {
    document.querySelectorAll('.pd-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pd-tab').forEach((b) => b.classList.remove('pd-tab--active'));
        document.querySelectorAll('.pd-panel').forEach((p) => p.classList.remove('pd-panel--active'));
        btn.classList.add('pd-tab--active');
        document.querySelector(`.pd-panel[data-pd-panel="${btn.dataset.pdTab}"]`).classList.add('pd-panel--active');
      });
    });
  }

  function wireKnowledgeButton() {
    const btn = document.getElementById('btnOpenKnowledgeExcel');
    if (btn) btn.addEventListener('click', () => {
      window.KnowledgeBase.open(window.KNOWLEDGE_CONTENT_EXCEL_PIVOT_DASHBOARD);
    });
  }

  function init() {
    try {
      initEngine();
      renderRawTable();
      populateFieldDropdowns();
      renderExercises();
      wireTabs();
      wireKnowledgeButton();
      document.getElementById('btnBuildPivot').addEventListener('click', buildPivot);
      document.getElementById('pdSlicerWilayah').addEventListener('change', renderDashboard);
      buildPivot();
      renderDashboard();
      const status = document.getElementById('pdEngineStatus');
      status.textContent = '✅ HyperFormula siap (' + dataRowCount + ' baris data)';
      status.classList.add('pd-engine-status--ready');
    } catch (err) {
      console.error(err);
      const status = document.getElementById('pdEngineStatus');
      status.textContent = '⚠️ Gagal memuat engine: ' + err.message;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
