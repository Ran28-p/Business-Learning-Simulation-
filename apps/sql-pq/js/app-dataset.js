/**
 * app-dataset.js — generator dataset latihan (riwayat, pratinjau)
 * (dipecah dari app.js; perilaku identik)
 * Classic script: dimuat BERURUTAN sesudah app.js (lihat HTML); berbagi fungsi lewat window.__SqlPqApp.
 */
(function () {
  "use strict";
  const TC = window.__SqlPqApp;
  const { $, UI, App, goto } = TC;
  // =================================================== DATASET GENERATOR ==
  const DG_HISTORY_KEY = "sqlpq_dataset_history_v1";
  function loadDgHistory() {
    try { return JSON.parse(localStorage.getItem(DG_HISTORY_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveDgHistoryEntry(entry) {
    const hist = loadDgHistory();
    hist.unshift(entry);
    if (hist.length > 10) hist.length = 10;
    try { localStorage.setItem(DG_HISTORY_KEY, JSON.stringify(hist)); } catch (e) { /* storage full — ignore */ }
    renderDgHistory();
  }
  function renderDgHistory() {
    const hist = loadDgHistory();
    const card = $("#dgHistoryCard");
    if (!hist.length) { card.style.display = "none"; return; }
    card.style.display = "";
    const list = $("#dgHistoryList"); list.innerHTML = "";
    hist.forEach((h) => {
      const meta = window.SQLPQ_DatasetGenerator.CATEGORY_META.find((c) => c.key === h.category);
      const row = UI.el("div", "applied-step");
      row.style.fontFamily = "var(--font-ui)";
      const when = new Date(h.timestamp).toLocaleString("id-ID");
      row.innerHTML = `<span>${meta ? meta.icon : "🗄️"} <strong>${UI.escapeHtml(meta ? meta.label : h.category)}</strong> — ${h.rows.toLocaleString("id-ID")} baris${h.dirty ? ", dirty" : ""} <small>(${when})</small></span>`;
      const btn = UI.el("button", "btn btn-sm btn-ghost", "↻ Muat Ulang (seed sama)");
      btn.style.color = "var(--sqlpq-blue-600)";
      btn.onclick = () => runDatasetGeneration(h.category, h.rows, h.dirty, h.seed, true);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  async function runDatasetGeneration(category, rows, dirty, seed, isReplay) {
    const btn = $("#btnGenerateDataset");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = rows >= 2000 ? "⏳ Membuat dataset besar…" : "⏳ Membuat dataset…";
    try {
      // Yield one frame so the disabled/spinner state actually paints before
      // the (synchronous, CPU-bound) generation work runs.
      await new Promise((r) => setTimeout(r, 20));
      const dataset = window.SQLPQ_DatasetGenerator.generate({ category, rows, dirty, seed });
      App.currentDataset = dataset;
      App.currentCategory = category;
      App.datasetRegistry[dataset.name] = dataset;
      showDatasetPreview(dataset);
      TC.refreshPqSourceOptions();
      if (!isReplay) saveDgHistoryEntry({ category, rows, dirty, seed: dataset.seed, timestamp: Date.now() });
      UI.toast(`Dataset "${dataset.label}" (${rows.toLocaleString("id-ID")} baris${dirty ? ", dirty data aktif" : ""}) berhasil dibuat${isReplay ? " ulang (identik dengan sebelumnya)" : ""}.`, "ok");
    } catch (e) {
      UI.toast("Gagal membuat dataset: " + e.message, "err");
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  function initDatasetGenerator() {
    const catSel = $("#dgCategory");
    window.SQLPQ_DatasetGenerator.CATEGORY_META.forEach((c) => {
      const o = document.createElement("option"); o.value = c.key; o.textContent = `${c.icon} ${c.label} — ${c.desc}`;
      catSel.appendChild(o);
    });
    const rowsSel = $("#dgRows");
    window.SQLPQ_DatasetGenerator.ROW_SIZE_OPTIONS.forEach((n) => {
      const o = document.createElement("option"); o.value = n; o.textContent = n.toLocaleString("id-ID") + " baris";
      rowsSel.appendChild(o);
    });
    rowsSel.value = 100;
    renderDgHistory();

    $("#btnGenerateDataset").addEventListener("click", () => {
      runDatasetGeneration(catSel.value, parseInt(rowsSel.value, 10), $("#dgDirty").checked, $("#dgSeed").value.trim());
    });

    $("#btnLoadRelational").addEventListener("click", async () => {
      UI.toast("Memuat sample relational DB…");
      const rel = window.SQLPQ_RelationalDataset.generateRelationalDB("medium");
      try {
        await window.SQLPQ_Engine.loadMultiple(rel);
        App.relationalLoaded = true;
        Object.values(rel).forEach((t) => { App.datasetRegistry[t.name] = t; });
        TC.refreshPqSourceOptions();
        TC.renderDbTree();
        goto("sql-sim");
        UI.toast("Sample relational DB (customers, products, orders, employees) siap dipakai untuk JOIN.", "ok");
      } catch (e) {
        UI.toast("Gagal memuat SQL engine: " + e.message, "err");
      }
    });

    $("#btnImportCsv").addEventListener("click", () => $("#csvFileInput").click());
    $("#csvFileInput").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataset = UI.csvToDataset(reader.result, file.name.replace(/\.csv$/i, ""));
          App.currentDataset = dataset;
          App.datasetRegistry[dataset.name] = dataset;
          showDatasetPreview(dataset);
          TC.refreshPqSourceOptions();
          UI.toast(`CSV "${file.name}" berhasil diimport (${dataset.rows.length} baris).`, "ok");
        } catch (err) { UI.toast("Gagal membaca CSV: " + err.message, "err"); }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    $("#btnImportExcel").addEventListener("click", () => $("#excelFileInput").click());
    $("#excelFileInput").addEventListener("change", async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        UI.toast("Membaca file Excel…");
        const dataset = await UI.excelFileToDataset(file, file.name.replace(/\.(xlsx|xls)$/i, ""));
        App.currentDataset = dataset;
        App.datasetRegistry[dataset.name] = dataset;
        showDatasetPreview(dataset);
        TC.refreshPqSourceOptions();
        UI.toast(`Excel "${file.name}" berhasil diimport (${dataset.rows.length} baris, sheet pertama).`, "ok");
      } catch (err) { UI.toast("Gagal membaca file Excel: " + err.message, "err"); }
      e.target.value = "";
    });

    $("#btnDgUseInSql").addEventListener("click", async () => {
      if (!App.currentDataset) return;
      try {
        await window.SQLPQ_Engine.loadDataset(App.currentDataset);
        if (App.currentCategory) App.categoryDirtyState[App.currentCategory] = !!App.currentDataset.isDirty;
        TC.renderDbTree();
        goto("sql-sim");
        UI.toast(`Dataset "${App.currentDataset.label}" dimuat ke SQL Simulator.`, "ok");
      } catch (e) { UI.toast("Gagal memuat dataset: " + e.message, "err"); }
    });
    $("#btnDgUseInPq").addEventListener("click", () => {
      if (!App.currentDataset) return;
      TC.setPqSource(App.currentDataset.name);
      goto("pq-sim");
    });
    $("#btnDgExportCsv").addEventListener("click", () => {
      if (!App.currentDataset) return;
      UI.downloadText(App.currentDataset.name + ".csv", UI.datasetToCsv(App.currentDataset), "text/csv");
    });
    $("#btnDgExportExcel").addEventListener("click", async () => {
      if (!App.currentDataset) return;
      try { UI.toast("Membuat file Excel…"); await UI.downloadDatasetAsExcel(App.currentDataset); }
      catch (e) { UI.toast("Gagal membuat file Excel: " + e.message, "err"); }
    });
    $("#btnDgExportJson").addEventListener("click", () => {
      if (!App.currentDataset) return;
      UI.downloadText(App.currentDataset.name + ".json", JSON.stringify(App.currentDataset.rows, null, 2), "application/json");
    });
    $("#btnDgExportSql").addEventListener("click", () => {
      if (!App.currentDataset) return;
      UI.downloadText(App.currentDataset.name + ".sql", UI.datasetToSqlInsert(App.currentDataset), "text/plain");
    });
  }

  function showDatasetPreview(dataset) {
    $("#dgPreviewCard").style.display = "";
    $("#dgPreviewTitle").textContent = `Preview — ${dataset.label} (${dataset.rows.length} baris${dataset.isDirty ? ", dirty data" : ""})`;
    UI.renderObjectRowsTable($("#dgPreviewTable"), dataset, 25);
  }

  Object.assign(TC, { initDatasetGenerator });
})();
