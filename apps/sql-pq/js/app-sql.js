/**
 * app-sql.js — simulator SQL (kategori, pohon database, editor, petunjuk, penjelasan)
 * (dipecah dari app.js; perilaku identik)
 * Classic script: dimuat BERURUTAN sesudah app.js (lihat HTML); berbagi fungsi lewat window.__SqlPqApp.
 */
(function () {
  "use strict";
  const TC = window.__SqlPqApp;
  const { App, UI, $, Progress, renderSidebarProgress } = TC;
  // ======================================================= SQL SIMULATOR =
  async function ensureCategoryLoaded(category, opts) {
    opts = opts || {};
    const meta = window.SQLPQ_DatasetGenerator.GENERATORS[category];
    if (!meta) return;
    const tableName = window.SQLPQ_Questions.ROLE_MAP[category].table;
    await window.SQLPQ_Engine.ensureLoaded();
    const alreadyLoaded = window.SQLPQ_Engine.listTables().includes(tableName);
    const isDirtyLoaded = App.categoryDirtyState[category];
    if (alreadyLoaded && !(opts.forceDirty && !isDirtyLoaded)) return;
    const dataset = window.SQLPQ_DatasetGenerator.generate({ category, rows: 200, dirty: !!opts.forceDirty });
    App.datasetRegistry[dataset.name] = dataset;
    App.categoryDirtyState[category] = !!opts.forceDirty;
    if (!App.currentDataset) App.currentDataset = dataset;
    await window.SQLPQ_Engine.loadDataset(dataset);
    TC.refreshPqSourceOptions();
    if (opts.forceDirty) UI.toast(`Dataset "${dataset.label}" dimuat ulang dengan data kotor untuk latihan level ini.`);
  }
  async function ensureRelationalLoaded() {
    await window.SQLPQ_Engine.ensureLoaded();
    const tables = window.SQLPQ_Engine.listTables();
    if (["customers", "products", "orders", "employees"].every((t) => tables.includes(t))) { App.relationalLoaded = true; return; }
    const rel = window.SQLPQ_RelationalDataset.generateRelationalDB("medium");
    await window.SQLPQ_Engine.loadMultiple(rel);
    Object.values(rel).forEach((t) => { App.datasetRegistry[t.name] = t; });
    App.relationalLoaded = true;
  }

  function renderDbTree() {
    const tree = $("#dbTree"); tree.innerHTML = "";
    const tables = window.SQLPQ_Engine.isReady ? window.SQLPQ_Engine.listTables() : [];
    if (!tables.length) { tree.innerHTML = '<div class="empty-state" style="padding:10px"><small>Belum ada tabel dimuat.</small></div>'; return; }
    tables.forEach((t) => {
      const item = UI.el("div", "db-tree-item" + (t === App.selectedTable ? " active" : ""), t);
      item.onclick = () => selectTable(t);
      tree.appendChild(item);
    });
  }

  function selectTable(t) {
    App.selectedTable = t;
    renderDbTree();
    const schema = window.SQLPQ_Engine.tableSchema(t);
    const box = $("#schemaMini");
    box.innerHTML = schema.map((c) => `<div>${UI.escapeHtml(c.name)} <small>(${c.type})</small></div>`).join("");
    if (!$("#sqlEditor").value.trim()) {
      $("#sqlEditor").value = `SELECT *\nFROM "${t}"\nLIMIT 10;`;
    }
  }

  function renderResult(res) {
    App.lastResult = res;
    UI.renderResultTable($("#resultTable"), res.columns, res.values, 200);
  }

  function setResultStatus(kind, text) {
    const box = $("#resultStatus");
    box.innerHTML = `<div class="result-status ${kind}">${kind === "ok" ? "✓" : kind === "wrong" ? "✕" : "⚠"} ${UI.escapeHtml(text)}</div>`;
  }

  async function newQuestion(levelArg) {
    const level = parseInt(levelArg || $("#simLevelSelect").value, 10);
    if (level === 3 || level === 4) await ensureRelationalLoaded();
    else await ensureCategoryLoaded(App.currentCategory || "sales", { forceDirty: level === 5 });
    renderDbTree();
    const q = window.SQLPQ_Questions.generateQuestion(level, App.currentCategory);
    App.currentQuestion = q; App.hintsShown = 0;
    $("#questionBox").style.display = "";
    $("#qLevelBadge").className = "diff-badge diff-" + q.level;
    $("#qLevelBadge").textContent = "Level " + q.level;
    $("#qConceptTag").textContent = q.conceptLabel;
    $("#qPromptText").textContent = q.prompt;
    $("#hintArea").innerHTML = "";
    $("#explainArea").innerHTML = "";
    $("#simLevelSelect").value = String(level);
    setResultStatus("", "");
    $("#resultStatus").innerHTML = "";
    $("#resultTable").innerHTML = "";
    $("#planBox").innerHTML = "";
  }

  function showHint() {
    if (!App.currentQuestion) { UI.toast("Belum ada soal aktif. Klik \"Soal Baru\" dulu.", "err"); return; }
    if (App.hintsShown >= 3) {
      $("#hintArea").innerHTML += `<div class="hint-box"><h4>Solusi Lengkap</h4><div class="lesson-syntax">${UI.escapeHtml(App.currentQuestion.solutionSql)}</div></div>`;
      UI.toast("Solusi lengkap ditampilkan.");
      return;
    }
    Progress.recordHintUsed(App.currentQuestion.id);
    App.hintsShown += 1;
    const hint = App.currentQuestion.hints[App.hintsShown - 1];
    $("#hintArea").innerHTML += `<div class="hint-box"><strong>Hint ${App.hintsShown}:</strong> ${UI.escapeHtml(hint)}</div>`;
  }

  function showExplanation(question, solved) {
    // Pembahasan berlapis (js/sql-pembahasan.js); jawaban baku hanya ditampilkan setelah soal terjawab benar.
    if (window.SQLPQ_Pembahasan) {
      $("#explainArea").innerHTML = window.SQLPQ_Pembahasan.html(question, { solved: !!solved });
      return;
    }
    $("#explainArea").innerHTML = `<div class="explain-box"><h4>Penjelasan</h4><p>${UI.escapeHtml(question.explanation)}</p><p><small>Konsep: ${UI.escapeHtml(question.conceptLabel)}</small></p></div>`;
  }

  function toggleFullscreenEditor(force) {
    const col = $("#editorCol");
    const on = force !== undefined ? force : !col.classList.contains("is-fullscreen");
    col.classList.toggle("is-fullscreen", on);
    $("#btnFullscreenEditor").textContent = on ? "✕ Tutup Fullscreen (Esc)" : "⛶ Fullscreen Editor";
    document.body.style.overflow = on ? "hidden" : "";
  }

  function initSqlSimulator() {
    $("#simLevelSelect").addEventListener("change", () => newQuestion());
    $("#btnNewQuestion").addEventListener("click", () => newQuestion());
    $("#btnHint").addEventListener("click", showHint);
    $("#btnExplain").addEventListener("click", () => {
      if (App.currentQuestion) showExplanation(App.currentQuestion);
      else UI.toast("Belum ada soal aktif untuk dijelaskan.", "err");
    });

    $("#sqlEditor").addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) $("#btnSubmitAnswer").click();
        else $("#btnRunQuery").click();
      } else if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.target;
        const start = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + "  " + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
      } else if (e.key === "Escape" && $("#editorCol").classList.contains("is-fullscreen")) {
        toggleFullscreenEditor(false);
      }
    });

    $("#btnFullscreenEditor").addEventListener("click", () => toggleFullscreenEditor());

    $("#btnRunQuery").addEventListener("click", () => {
      const sql = $("#sqlEditor").value.trim();
      if (!sql) { UI.toast("Tulis query terlebih dahulu.", "err"); return; }
      try {
        const res = window.SQLPQ_Engine.runMulti(sql);
        renderResult(res);
        setResultStatus("ok", `Query berhasil dijalankan — ${res.values.length} baris, ${res.columns.length} kolom.`);
      } catch (e) {
        $("#resultTable").innerHTML = "";
        setResultStatus("err", "Error: " + e.message);
      }
      $("#planBox").innerHTML = "";
      if ($("#chkExplainPlan").checked) {
        try {
          const plan = window.SQLPQ_Engine.explainPlan(sql);
          $("#planBox").innerHTML = `<h4 style="margin-top:10px">Execution Plan</h4><div class="lesson-syntax">${plan.map(UI.escapeHtml).join("\n")}</div>`;
        } catch (e) { /* ignore */ }
      }
    });

    $("#btnSubmitAnswer").addEventListener("click", () => {
      if (!App.currentQuestion) { UI.toast("Klik \"Soal Baru\" dulu sebelum submit.", "err"); return; }
      const sql = $("#sqlEditor").value;
      const verdict = window.SQLPQ_Grading.gradeQuery(sql, App.currentQuestion);
      if (verdict.userResult) renderResult(verdict.userResult);
      if (verdict.correct) {
        setResultStatus("ok", "Correct! Jawaban Anda sesuai.");
        const xp = Progress.recordAnswer(App.currentQuestion, true, App.hintsShown);
        renderSidebarProgress();
        UI.toast(`Benar! +${xp} XP`, "ok");
        showExplanation(App.currentQuestion, true);
      } else {
        Progress.recordAnswer(App.currentQuestion, false, App.hintsShown);
        renderSidebarProgress();
        setResultStatus(verdict.error ? "err" : "wrong", verdict.error || ("Belum tepat — " + verdict.detail));
        const box = $("#explainArea");
        const pembahasan = window.SQLPQ_Pembahasan
          ? window.SQLPQ_Pembahasan.html(App.currentQuestion, { verdict, userSql: sql, solved: false })
          : "";
        if ((verdict.missingExamples && verdict.missingExamples.length) || (verdict.extraExamples && verdict.extraExamples.length)) {
          let html = `<div class="explain-box"><h4>Detail Perbedaan</h4>`;
          if (verdict.missingExamples && verdict.missingExamples.length) {
            html += `<p><strong>Baris yang seharusnya ADA tapi tidak ditemukan di hasil Anda:</strong></p><div id="missingRowsPreview"></div>`;
          }
          if (verdict.extraExamples && verdict.extraExamples.length) {
            html += `<p><strong>Baris di hasil Anda yang seharusnya TIDAK ADA:</strong></p><div id="extraRowsPreview"></div>`;
          }
          html += `</div>`;
          box.innerHTML = html;
          if (verdict.missingExamples && verdict.missingExamples.length) UI.renderResultTable($("#missingRowsPreview"), verdict.expectedResult.columns, verdict.missingExamples);
          if (verdict.extraExamples && verdict.extraExamples.length) UI.renderResultTable($("#extraRowsPreview"), verdict.userResult.columns, verdict.extraExamples);
        } else if (verdict.expectedResult) {
          box.innerHTML = `<div class="explain-box"><h4>Hasil yang Diharapkan (contoh)</h4><div id="expectedPreview"></div></div>`;
          UI.renderResultTable($("#expectedPreview"), verdict.expectedResult.columns, verdict.expectedResult.values, 8);
        } else {
          box.innerHTML = "";
        }
        box.insertAdjacentHTML("beforeend", pembahasan);
      }
    });

    $("#btnFormatSql").addEventListener("click", () => { $("#sqlEditor").value = UI.formatSql($("#sqlEditor").value); });
    $("#btnResetEditor").addEventListener("click", () => {
      $("#sqlEditor").value = App.selectedTable ? `SELECT *\nFROM "${App.selectedTable}"\nLIMIT 10;` : "";
    });
    $("#btnClearEditor").addEventListener("click", () => { $("#sqlEditor").value = ""; });
    $("#btnCopySql").addEventListener("click", () => UI.copyToClipboard($("#sqlEditor").value));
    $("#btnDownloadResult").addEventListener("click", () => {
      if (!App.lastResult || !App.lastResult.columns.length) { UI.toast("Belum ada hasil query untuk diunduh.", "err"); return; }
      UI.downloadResultAsCsv("query-result.csv", App.lastResult.columns, App.lastResult.values);
    });
  }

  Object.assign(TC, { newQuestion, renderDbTree, ensureCategoryLoaded, ensureRelationalLoaded, initSqlSimulator });
})();
