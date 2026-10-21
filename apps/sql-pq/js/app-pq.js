/**
 * app-pq.js — simulator Power Query dan mode latihan PQ
 * (dipecah dari app.js; perilaku identik)
 * Classic script: dimuat BERURUTAN sesudah app.js (lihat HTML); berbagi fungsi lewat window.__SqlPqApp.
 */
(function () {
  "use strict";
  const TC = window.__SqlPqApp;
  const { $, App, UI, Progress, renderSidebarProgress } = TC;
  // ================================================== POWER QUERY SIM =====
  const TOOLBAR_STEPS = [
    { type: "filter", label: "Filter Rows", icon: "🔎", fields: [{ key: "column", kind: "single", source: "all" }, { key: "operator", kind: "select", options: [["=", "="], ["!=", "≠"], [">", ">"], ["<", "<"], [">=", ">="], ["<=", "<="], ["contains", "mengandung"], ["notnull", "tidak NULL"], ["isnull", "NULL"]] }, { key: "value", kind: "text" }] },
    { type: "sort", label: "Sort", icon: "↕️", fields: [{ key: "column", kind: "single", source: "all" }, { key: "direction", kind: "select", options: [["asc", "Ascending"], ["desc", "Descending"]] }] },
    { type: "removeColumns", label: "Remove Columns", icon: "🗑️", fields: [{ key: "columns", kind: "multi", source: "all" }] },
    { type: "changeType", label: "Change Type", icon: "🔡", fields: [{ key: "column", kind: "single", source: "all" }, { key: "newType", kind: "select", options: [["TEXT", "Text"], ["INTEGER", "Whole Number"], ["REAL", "Decimal"]] }] },
    { type: "replaceValues", label: "Replace Values", icon: "✏️", fields: [{ key: "column", kind: "single", source: "all" }, { key: "oldVal", kind: "text" }, { key: "newVal", kind: "text" }] },
    { type: "renameColumn", label: "Rename Column", icon: "🏷️", fields: [{ key: "from", kind: "single", source: "all" }, { key: "to", kind: "text" }] },
    { type: "trim", label: "Trim", icon: "✂️", fields: [{ key: "column", kind: "single", source: "text" }] },
    { type: "removeDuplicates", label: "Remove Duplicates", icon: "🧹", fields: [] },
    { type: "fillDown", label: "Fill Down", icon: "⬇️", fields: [{ key: "column", kind: "single", source: "all" }] },
    { type: "fillUp", label: "Fill Up", icon: "⬆️", fields: [{ key: "column", kind: "single", source: "all" }] },
    { type: "splitColumn", label: "Split Column", icon: "🔀", fields: [{ key: "column", kind: "single", source: "text" }, { key: "delimiter", kind: "text", default: "," }, { key: "newNames", kind: "text", placeholder: "nama1,nama2" }] },
    { type: "mergeColumn", label: "Merge Columns", icon: "🔗", fields: [{ key: "columns", kind: "multi", source: "all" }, { key: "delimiter", kind: "text", default: " " }, { key: "newName", kind: "text" }] },
    { type: "indexColumn", label: "Index Column", icon: "#️⃣", fields: [{ key: "newName", kind: "text", default: "Index" }, { key: "start", kind: "number", default: 1 }] },
    { type: "customColumn", label: "Custom Column", icon: "🧮", fields: [{ key: "newName", kind: "text" }, { key: "formula", kind: "text", placeholder: "[Quantity] * [Unit_Price]" }] },
    { type: "conditionalColumn", label: "Conditional Column", icon: "🧭", fields: [{ key: "column", kind: "single", source: "all" }, { key: "operator", kind: "select", options: [[">", ">"], ["<", "<"], [">=", ">="], ["<=", "<="], ["=", "="]] }, { key: "value", kind: "text" }, { key: "thenVal", kind: "text" }, { key: "elseVal", kind: "text" }, { key: "newName", kind: "text" }] },
    { type: "groupBy", label: "Group By", icon: "📊", fields: [{ key: "groupCols", kind: "multi", source: "all" }, { key: "aggCol", kind: "single", source: "numeric" }, { key: "aggFunc", kind: "select", options: [["sum", "Sum"], ["avg", "Average"], ["count", "Count"], ["min", "Min"], ["max", "Max"]] }, { key: "newName", kind: "text", default: "Hasil" }] },
    { type: "pivot", label: "Pivot Column", icon: "🔃", fields: [{ key: "pivotCol", kind: "single", source: "all" }, { key: "valueCol", kind: "single", source: "numeric" }] },
    { type: "unpivot", label: "Unpivot Columns", icon: "🔄", fields: [{ key: "columns", kind: "multi", source: "all" }, { key: "attrName", kind: "text", default: "Attribute" }, { key: "valueName", kind: "text", default: "Value" }] },
    { type: "keepTopRows", label: "Keep Top Rows", icon: "⬆️", fields: [{ key: "n", kind: "number", default: 10 }] },
    { type: "removeTopRows", label: "Remove Top Rows", icon: "⬇️", fields: [{ key: "n", kind: "number", default: 1 }] },
    { type: "mergeQueries", label: "Merge Queries", icon: "🔗", fields: [{ key: "dataset", kind: "datasetPicker" }, { key: "key", kind: "single", source: "all" }, { key: "otherKey", kind: "text", placeholder: "kolom kunci di dataset lain" }, { key: "bringColumns", kind: "text", placeholder: "kolom yang dibawa, pisah koma" }] },
    { type: "appendQueries", label: "Append Queries", icon: "➕", fields: [{ key: "dataset", kind: "datasetPicker" }] }
  ];

  function refreshPqSourceOptions() {
    const sel = $("#pqSourceSelect");
    const cur = sel.value;
    sel.innerHTML = '<option value="">— pilih dataset —</option>';
    Object.keys(App.datasetRegistry).forEach((key) => {
      const o = document.createElement("option"); o.value = key; o.textContent = App.datasetRegistry[key].label || key;
      sel.appendChild(o);
    });
    if (App.datasetRegistry[cur]) sel.value = cur;
  }

  function setPqSource(key) {
    const dataset = App.datasetRegistry[key];
    if (!dataset) return;
    App.pq.sourceKey = key;
    App.pq.baseTable = window.SQLPQ_PowerQuery.cloneTable(dataset);
    App.pq.steps = [];
    $("#pqSourceSelect").value = key;
    renderPqPipeline();
  }

  function currentPqTable() {
    if (!App.pq.baseTable) return null;
    return window.SQLPQ_PowerQuery.runPipeline(App.pq.baseTable, App.pq.steps);
  }

  function renderPqPipeline() {
    const table = currentPqTable();
    if (!table) {
      $("#pqPreviewTable").innerHTML = '<div class="empty-state"><div class="ic">🗄️</div>Pilih dataset sumber terlebih dahulu (dari Dataset Generator).</div>';
      $("#mCodeBox").textContent = "";
      $("#appliedStepsList").innerHTML = '<div class="empty-state" style="padding:16px 8px"><div class="ic">🪄</div>Belum ada langkah</div>';
      return;
    }
    UI.renderObjectRowsTable($("#pqPreviewTable"), table, 25);
    const sourceLabel = JSON.stringify(App.datasetRegistry[App.pq.sourceKey] ? App.datasetRegistry[App.pq.sourceKey].label : "Source");
    $("#mCodeBox").textContent = window.SQLPQ_PowerQuery.buildMCode(sourceLabel, App.pq.steps);

    const list = $("#appliedStepsList"); list.innerHTML = "";
    list.appendChild(UI.el("div", "applied-step", `<span class="num">0.</span> Source`));
    App.pq.steps.forEach((step, i) => {
      const row = UI.el("div", "applied-step");
      row.innerHTML = `<span><span class="num">${i + 1}.</span> ${UI.escapeHtml(window.SQLPQ_PowerQuery.stepLabel(step))}</span>`;
      const rm = document.createElement("button"); rm.textContent = "✕"; rm.title = "Hapus langkah ini";
      rm.onclick = () => { App.pq.steps.splice(i, 1); renderPqPipeline(); };
      row.appendChild(rm);
      list.appendChild(row);
    });
  }

  function pqColumnOptions(kindFilter) {
    const table = currentPqTable();
    if (!table) return [];
    return table.columns.filter((c) => {
      if (kindFilter === "numeric") return c.type === "INTEGER" || c.type === "REAL";
      if (kindFilter === "text") return c.type === "TEXT" || c.type === "DATE";
      return true;
    }).map((c) => c.name);
  }

  function renderStepForm(stepDef) {
    const container = $("#pqToolbar");
    let form = $("#pqStepForm");
    if (form) form.remove();
    form = UI.el("div", "card", "");
    form.id = "pqStepForm";
    form.style.width = "100%"; form.style.marginTop = "8px";
    form.appendChild(UI.el("h4", null, stepDef.icon + " " + stepDef.label));
    const fieldRow = UI.el("div", "field-row");
    const inputs = {};
    stepDef.fields.forEach((f) => {
      const wrap = UI.el("div", "field");
      wrap.appendChild(UI.el("label", null, f.key));
      let input;
      if (f.kind === "single" || f.kind === "select" || f.kind === "datasetPicker") {
        input = document.createElement("select");
        let opts = [];
        if (f.kind === "select") opts = f.options;
        else if (f.kind === "datasetPicker") opts = Object.keys(App.datasetRegistry).filter((k) => k !== App.pq.sourceKey).map((k) => [k, App.datasetRegistry[k].label || k]);
        else opts = pqColumnOptions(f.source === "numeric" ? "numeric" : f.source === "text" ? "text" : "all").map((c) => [c, c]);
        opts.forEach(([val, label]) => { const o = document.createElement("option"); o.value = val; o.textContent = label; input.appendChild(o); });
      } else if (f.kind === "multi") {
        input = document.createElement("select"); input.multiple = true; input.size = Math.min(6, Math.max(3, pqColumnOptions("all").length));
        pqColumnOptions("all").forEach((c) => { const o = document.createElement("option"); o.value = c; o.textContent = c; input.appendChild(o); });
      } else if (f.kind === "number") {
        input = document.createElement("input"); input.type = "number"; input.value = f.default != null ? f.default : "";
      } else {
        input = document.createElement("input"); input.type = "text";
        if (f.default) input.value = f.default;
        if (f.placeholder) input.placeholder = f.placeholder;
      }
      wrap.appendChild(input);
      fieldRow.appendChild(wrap);
      inputs[f.key] = input;
    });
    form.appendChild(fieldRow);
    const btnRow = UI.el("div", "btn-row");
    const applyBtn = UI.el("button", "btn btn-sm btn-primary", "Terapkan Langkah");
    const cancelBtn = UI.el("button", "btn btn-sm btn-ghost", "Batal");
    cancelBtn.onclick = () => form.remove();
    applyBtn.onclick = () => {
      try {
        const params = {};
        stepDef.fields.forEach((f) => {
          const el = inputs[f.key];
          if (f.kind === "multi") params[f.key] = Array.from(el.selectedOptions).map((o) => o.value);
          else params[f.key] = el.value;
        });
        if (stepDef.type === "splitColumn") params.newNames = params.newNames.split(",").map((s) => s.trim()).filter(Boolean);
        if (stepDef.type === "mergeColumn") params.newName = params.newName || (params.columns.join("_") + "_gabungan");
        if (stepDef.type === "mergeQueries") {
          const other = App.datasetRegistry[params.dataset];
          if (!other) throw new Error("Pilih dataset lain terlebih dahulu.");
          params.otherTable = window.SQLPQ_PowerQuery.cloneTable(other);
          params.otherLabel = other.label || other.name;
          params.bringColumns = params.bringColumns.split(",").map((s) => s.trim()).filter(Boolean);
          params.prefix = "";
          delete params.dataset;
        }
        if (stepDef.type === "appendQueries") {
          const other = App.datasetRegistry[params.dataset];
          if (!other) throw new Error("Pilih dataset lain terlebih dahulu.");
          params.otherTable = window.SQLPQ_PowerQuery.cloneTable(other);
          params.otherLabel = other.label || other.name;
          delete params.dataset;
        }
        // sanity-check by attempting the transform before committing
        window.SQLPQ_PowerQuery.applyStep(currentPqTable(), { type: stepDef.type, params });
        App.pq.steps.push({ type: stepDef.type, params });
        form.remove();
        renderPqPipeline();
        UI.toast("Langkah diterapkan: " + stepDef.label, "ok");
      } catch (e) {
        UI.toast("Gagal menerapkan langkah: " + e.message, "err");
      }
    };
    btnRow.appendChild(applyBtn); btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);
    container.parentNode.insertBefore(form, container.nextSibling);
  }

  function initPqSimulator() {
    const toolbar = $("#pqToolbar");
    TOOLBAR_STEPS.forEach((stepDef) => {
      const btn = UI.el("button", "btn btn-sm btn-secondary", stepDef.icon + " " + stepDef.label);
      btn.onclick = () => {
        if (!App.pq.baseTable) { UI.toast("Pilih dataset sumber dulu.", "err"); return; }
        if (stepDef.type === "removeDuplicates") {
          App.pq.steps.push({ type: "removeDuplicates", params: {} });
          renderPqPipeline();
          return;
        }
        renderStepForm(stepDef);
      };
      toolbar.appendChild(btn);
    });

    $("#pqSourceSelect").addEventListener("change", (e) => { if (e.target.value) setPqSource(e.target.value); });
    $("#btnCopyMCode").addEventListener("click", () => UI.copyToClipboard($("#mCodeBox").textContent));
    $("#btnExportPqCsv").addEventListener("click", () => {
      const t = currentPqTable(); if (!t) return;
      UI.downloadText("pq-result.csv", UI.datasetToCsv(Object.assign({ name: "result" }, t)), "text/csv");
    });
    $("#btnExportPqJson").addEventListener("click", () => {
      const t = currentPqTable(); if (!t) return;
      UI.downloadText("pq-result.json", JSON.stringify(t.rows, null, 2), "application/json");
    });
    renderPqPipeline();
  }

  // ------------------------------------------------------- PQ PRACTICE ---
  function renderPqPracticeList() {
    const list = $("#pqPracticeTaskList"); list.innerHTML = "";
    window.SQLPQ_PQPractice.TASKS.forEach((task) => {
      const card = UI.el("div", "card");
      card.style.padding = "12px";
      const meta = window.SQLPQ_DatasetGenerator.CATEGORY_META.find((c) => c.key === task.category);
      const done = Progress.isLessonComplete("pq-practice:" + task.id);
      card.innerHTML = `<div><span class="tag${done ? " tag-green" : ""}">${meta ? meta.icon : "🗄️"} ${done ? "✓ Selesai" : "Belum"}</span></div><h4 style="margin-top:6px">${UI.escapeHtml(task.title)}</h4><p><small>${task.instructions.length} langkah instruksi</small></p>`;
      const btn = UI.el("button", "btn btn-sm btn-primary", "Mulai Tugas →");
      btn.onclick = () => startPqPracticeTask(task);
      card.appendChild(btn);
      list.appendChild(card);
    });
  }

  function startPqPracticeTask(task) {
    App.pq.activeTask = task;
    const dataset = window.SQLPQ_DatasetGenerator.generate({ category: task.category, rows: 60, dirty: true });
    const key = "practice_" + task.id + "_" + Date.now();
    dataset.label = task.title + " (data latihan)";
    if (typeof task.prepare === "function") task.prepare(dataset);
    App.datasetRegistry[key] = dataset;
    refreshPqSourceOptions();
    setPqSource(key);

    $("#pqPracticeTaskList").style.display = "none";
    $("#pqPracticeActive").style.display = "";
    $("#pqPracticeTitle").textContent = task.title;
    $("#pqPracticeInstructions").innerHTML = task.instructions.map((ins) => `<li>${UI.escapeHtml(ins)}</li>`).join("");
    $("#pqPracticeResult").innerHTML = "";
  }

  function exitPqPracticeTask() {
    App.pq.activeTask = null;
    $("#pqPracticeTaskList").style.display = "";
    $("#pqPracticeActive").style.display = "none";
    renderPqPracticeList();
  }

  function checkPqSolution() {
    const task = App.pq.activeTask;
    if (!task) return;
    const table = currentPqTable();
    if (!table) { UI.toast("Belum ada data untuk diperiksa.", "err"); return; }
    const results = task.validators.map((v) => ({ label: v.label, passed: !!v.check(table) }));
    const allPassed = results.every((r) => r.passed);
    const box = $("#pqPracticeResult");
    box.innerHTML = `<div class="explain-box" style="background:${allPassed ? "var(--sqlpq-green-100)" : "var(--sqlpq-amber-100)"};border-color:${allPassed ? "var(--sqlpq-green-500)" : "var(--sqlpq-amber-500)"}">
      <h4 style="color:${allPassed ? "var(--sqlpq-green-700)" : "var(--sqlpq-amber-700)"}">${allPassed ? "✓ Semua kriteria terpenuhi!" : "Belum semua kriteria terpenuhi"}</h4>
      <ul>${results.map((r) => `<li>${r.passed ? "✅" : "❌"} ${UI.escapeHtml(r.label)}</li>`).join("")}</ul>
    </div>`;
    if (allPassed) {
      const xp = Progress.recordLessonComplete("pq-practice:" + task.id, task.title);
      if (xp) { UI.toast(`Tugas "${task.title}" selesai! +${xp} XP`, "ok"); renderSidebarProgress(); }
      else UI.toast(`Tugas "${task.title}" sudah benar (sudah pernah diselesaikan sebelumnya).`, "ok");
    }
  }

  function initPqPracticeMode() {
    renderPqPracticeList();
    $("#btnTogglePqPractice").addEventListener("click", () => {
      const list = $("#pqPracticeTaskList");
      const active = $("#pqPracticeActive");
      const hidden = list.style.display === "none" && active.style.display === "none";
      if (hidden) { list.style.display = App.pq.activeTask ? "none" : ""; active.style.display = App.pq.activeTask ? "" : "none"; $("#btnTogglePqPractice").textContent = "Sembunyikan"; }
      else { list.style.display = "none"; active.style.display = "none"; $("#btnTogglePqPractice").textContent = "Tampilkan"; }
    });
    $("#btnCheckPqSolution").addEventListener("click", checkPqSolution);
    $("#btnExitPqPractice").addEventListener("click", exitPqPracticeTask);
  }

  Object.assign(TC, { refreshPqSourceOptions, setPqSource, initPqSimulator, initPqPracticeMode });
})();
