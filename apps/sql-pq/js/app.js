/**
 * app.js — Orkestrasi seluruh layar SQL & Power Query Learning Simulator.
 */
(function () {
  "use strict";
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const UI = window.SQLPQ_UI;
  const Progress = window.SQLPQ_Progress;

  const App = {
    tab: "dashboard",
    datasetRegistry: {},      // key -> dataset {name,label,columns,rows}
    currentDataset: null,     // last generated/imported dataset (preview)
    currentCategory: "sales", // category key used for level 1/2/5 question generation
    relationalLoaded: false,
    categoryDirtyState: {}, // category -> bool (whether currently-loaded table has dirty data)
    selectedTable: null,
    currentQuestion: null,
    hintsShown: 0,
    lastResult: null,
    pq: { sourceKey: null, baseTable: null, steps: [], activeForm: null, activeTask: null },
    challenge: null
  };

  // ============================================================ THEME ====
  function initTheme() {
    const saved = localStorage.getItem("sqlpq_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    $("#btnThemeToggle").textContent = saved === "dark" ? "☀️" : "🌙";
    $("#btnThemeToggle").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", cur);
      localStorage.setItem("sqlpq_theme", cur);
      $("#btnThemeToggle").textContent = cur === "dark" ? "☀️" : "🌙";
    });
  }

  // ======================================================== NAVIGATION ===
  function goto(tab) {
    App.tab = tab;
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + tab));
    $$(".nav-item[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    $("#sidebar").classList.remove("open");
    $("#sidebarScrim").classList.remove("open");
    if (tab === "dashboard") renderDashboard();
    if (tab === "projects" && !$("#projectsGrid").childElementCount) renderProjects();
    if (tab === "challenge" && !App.challenge) renderChallengeIntro();
    if (tab === "cheatsheet" && !$("#cheatGrid").childElementCount) renderCheatsheet();
    if (tab === "sql-path" && !$("#sqlPathLevels").childElementCount) renderSqlPath();
    if (tab === "pq-path" && !$("#pqPathGroups").childElementCount) renderPqPath();
  }

  function initNav() {
    $$(".nav-item[data-tab]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.tab)));
    $$("[data-goto]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.goto)));
    $("#btnMobileNav").addEventListener("click", () => {
      $("#sidebar").classList.add("open"); $("#sidebarScrim").classList.add("open");
    });
    $("#sidebarScrim").addEventListener("click", () => {
      $("#sidebar").classList.remove("open"); $("#sidebarScrim").classList.remove("open");
    });
  }

  // ========================================================= SIDEBAR =====
  function renderSidebarProgress() {
    const s = Progress.getState();
    $("#sbXp").textContent = s.xp;
    $("#sbLevel").textContent = Progress.getLevel();
    $("#sbStreak").textContent = s.streak;
    $("#sbLevelBar").style.width = Progress.getLevelProgress().pct + "%";
  }

  function initProgressButtons() {
    $("#btnResetProgress").addEventListener("click", () => {
      UI.confirmModal("Reset Progress", "Seluruh XP, level, streak, dan riwayat latihan akan dihapus permanen. Lanjutkan?", () => {
        Progress.reset();
        renderSidebarProgress();
        if (App.tab === "dashboard") renderDashboard();
        UI.toast("Progress berhasil direset.", "ok");
      }, "Ya, Reset");
    });
    $("#btnExportProgress").addEventListener("click", () => {
      UI.downloadText("progress-sqlpq.json", Progress.exportJson(), "application/json");
      UI.toast("Progress diexport ke file JSON. Simpan file ini untuk dipindahkan/di-import di perangkat lain.", "ok");
    });
    $("#btnExportProgressPdf").addEventListener("click", downloadProgressReportPDF);

    $("#btnImportProgress").addEventListener("click", () => $("#progressFileInput").click());
    $("#progressFileInput").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        showImportChoiceModal(reader.result);
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  /**
   * "Export Progress PDF" (bagian 12/26 master prompt). Sama seperti modul
   * Excel: tidak ada satu elemen DOM untuk laporan lengkap, jadi HTML
   * dibangun langsung dari data Progress lalu dikirim ke engine PDF
   * terpusat (js/shared/pdf-export.js).
   */
  function downloadProgressReportPDF() {
    if (!window.PDFExport) {
      UI.toast("Mesin PDF tidak tersedia. Coba muat ulang halaman.", "err");
      return;
    }
    const s = Progress.getState();
    const now = new Date();
    const tanggal = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const weak = Progress.weakConcepts(8);

    const weakRows = weak.map((w) => `<tr><td>${w.concept}</td><td>${w.count}</td></tr>`).join("")
      || '<tr><td colspan="2" style="text-align:center;color:#64748b;">Belum ada kesalahan tercatat — kerja bagus!</td></tr>';

    const historyRows = s.history.slice(0, 15).map((h) => {
      const waktu = new Date(h.ts).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      const statusLabel = h.correct ? "✅ Benar" : "❌ Salah";
      return `<tr><td>${waktu}</td><td>${h.label || "-"}</td><td>${h.type}</td><td>${statusLabel}</td><td>${h.xpDelta >= 0 ? "+" : ""}${h.xpDelta}</td></tr>`;
    }).join("") || '<tr><td colspan="5" style="text-align:center;color:#64748b;">Belum ada riwayat.</td></tr>';

    const challengeRows = (s.challengeAttempts || []).slice(0, 5).map((c) => {
      const waktu = new Date(c.ts).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      return `<tr><td>${waktu}</td><td>${c.score}%</td><td>${c.band || "-"}</td></tr>`;
    }).join("") || '<tr><td colspan="3" style="text-align:center;color:#64748b;">Belum ada percobaan Final Challenge.</td></tr>';

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;padding:6px;">
        <h1 style="font-size:18px;margin:0 0 2px;">SQL &amp; Power Query Simulator — Laporan Progres</h1>
        <p style="margin:0 0 16px;color:#64748b;font-size:11px;">Digenerate: ${tanggal}</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${s.xp}</div><div style="font-size:10px;color:#64748b;">Total XP</div></td>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${Progress.getLevel()}</div><div style="font-size:10px;color:#64748b;">Level</div></td>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${s.streak}</div><div style="font-size:10px;color:#64748b;">Streak (hari)</div></td>
            <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;"><div style="font-size:20px;font-weight:700;">${Progress.accuracy()}%</div><div style="font-size:10px;color:#64748b;">Akurasi</div></td>
          </tr>
        </table>

        <h2 style="font-size:13px;border-bottom:2px solid #1e3a5f;padding-bottom:4px;">Area yang Perlu Diperkuat</h2>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px;">
          <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:5px;border:1px solid #cbd5e1;text-align:left;">Konsep</th><th style="padding:5px;border:1px solid #cbd5e1;">Jumlah Salah</th></tr></thead>
          <tbody>${weakRows}</tbody>
        </table>

        <h2 style="font-size:13px;border-bottom:2px solid #1e3a5f;padding-bottom:4px;">Riwayat Final Challenge</h2>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px;">
          <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:5px;border:1px solid #cbd5e1;">Tanggal</th><th style="padding:5px;border:1px solid #cbd5e1;">Skor</th><th style="padding:5px;border:1px solid #cbd5e1;">Band</th></tr></thead>
          <tbody>${challengeRows}</tbody>
        </table>

        <h2 style="font-size:13px;border-bottom:2px solid #1e3a5f;padding-bottom:4px;">Riwayat Terakhir (maks. 15)</h2>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
          <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:5px;border:1px solid #cbd5e1;">Waktu</th><th style="padding:5px;border:1px solid #cbd5e1;text-align:left;">Label</th><th style="padding:5px;border:1px solid #cbd5e1;">Tipe</th><th style="padding:5px;border:1px solid #cbd5e1;">Status</th><th style="padding:5px;border:1px solid #cbd5e1;">XP</th></tr></thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>`;

    UI.toast("Membuat PDF laporan progres…", "ok");
    window.PDFExport.exportHTMLToPDF(html, {
      filename: `Laporan_Progres_SQL_PQ_${now.toISOString().slice(0, 10)}.pdf`,
      widthPx: 720,
      scale: 2.2
    }).then(() => {
      UI.toast("PDF laporan progres berhasil diunduh.", "ok");
    }).catch((err) => {
      console.error("[downloadProgressReportPDF]", err);
      UI.toast(err.message || "Gagal membuat PDF laporan progres.", "err");
    });
  }

  function showImportChoiceModal(jsonText) {
    let scrim = $("#importChoiceScrim");
    if (!scrim) {
      scrim = UI.el("div", "modal-scrim");
      scrim.id = "importChoiceScrim";
      document.body.appendChild(scrim);
    }
    scrim.innerHTML = "";
    const box = UI.el("div", "modal-box");
    box.innerHTML = `<h3>Import Progress</h3>
      <p>Pilih cara mengimpor file ini:</p>
      <p><strong>Ganti</strong> — timpa seluruh progress di perangkat ini dengan isi file (dipakai untuk pindah perangkat).</p>
      <p><strong>Gabungkan</strong> — jumlahkan XP/statistik file dengan yang sudah ada di sini. Jangan pakai ini untuk file yang sama dua kali (akan dobel hitung).</p>`;
    const row = UI.el("div", "btn-row");
    const cancelBtn = UI.el("button", "btn btn-ghost", "Batal");
    const mergeBtn = UI.el("button", "btn btn-secondary", "Gabungkan");
    const replaceBtn = UI.el("button", "btn btn-red", "Ganti");
    cancelBtn.onclick = () => scrim.classList.remove("open");
    function doImport(mode) {
      try {
        Progress.importJson(jsonText, mode);
        renderSidebarProgress();
        if (App.tab === "dashboard") renderDashboard();
        UI.toast(mode === "replace" ? "Progress berhasil diganti dari file import." : "Progress berhasil digabungkan.", "ok");
      } catch (e) { UI.toast("Gagal import: " + e.message, "err"); }
      scrim.classList.remove("open");
    }
    mergeBtn.onclick = () => doImport("merge");
    replaceBtn.onclick = () => doImport("replace");
    row.appendChild(cancelBtn); row.appendChild(mergeBtn); row.appendChild(replaceBtn);
    box.appendChild(row);
    scrim.appendChild(box);
    scrim.classList.add("open");
    scrim.onclick = (e) => { if (e.target === scrim) scrim.classList.remove("open"); };
  }

  // ======================================================= DASHBOARD =====
  function totalTopicsCount() {
    let n = 0;
    window.SQLPQ_CurriculumSQL.levels.forEach((l) => (n += l.topics.length));
    window.SQLPQ_CurriculumPQ.groups.forEach((g) => (n += g.topics.length));
    return n;
  }

  function renderDashboard() {
    const s = Progress.getState();
    const stats = [
      { icon: "⭐", value: s.xp, label: "Total XP" },
      { icon: "🎯", value: Progress.getLevel(), label: "Level Pengguna" },
      { icon: "🔥", value: s.streak, label: "Streak Belajar (hari)" },
      { icon: "✅", value: Progress.accuracy() + "%", label: "Akurasi Jawaban" },
      { icon: "📝", value: Object.keys(s.completedQuestions).length, label: "Total Soal Selesai" },
      { icon: "📚", value: Object.keys(s.completedLessons).length + " / " + totalTopicsCount(), label: "Materi Dipelajari" },
      { icon: "🏆", value: s.challengeAttempts.length, label: "Percobaan Final Challenge" },
      { icon: "💡", value: Object.values(s.hintUsage).reduce((a, b) => a + b, 0), label: "Hint Digunakan" }
    ];
    const grid = $("#dashStats"); grid.innerHTML = "";
    stats.forEach((st) => {
      const c = UI.el("div", "stat-card");
      c.innerHTML = `<div class="stat-icon">${st.icon}</div><div class="stat-value">${st.value}</div><div class="stat-label">${st.label}</div>`;
      grid.appendChild(c);
    });

    const mastery = $("#dashMastery"); mastery.innerHTML = "";
    const total = totalTopicsCount(), done = Object.keys(s.completedLessons).length;
    mastery.appendChild(UI.el("p", null, `${done} dari ${total} materi ditandai selesai.`));
    const bar = UI.el("div", "bar-track"); const fill = UI.el("div", "bar-fill");
    fill.style.width = (total ? Math.round((done / total) * 100) : 0) + "%";
    bar.appendChild(fill); mastery.appendChild(bar);
    const weak = Progress.weakConcepts(5);
    if (weak.length) {
      const h = UI.el("h4", null, "Konsep yang Perlu Diperkuat");
      h.style.marginTop = "12px";
      mastery.appendChild(h);
      const ul = UI.el("ul");
      weak.forEach((w) => {
        const concept = window.SQLPQ_Questions.CONCEPTS[w.concept];
        const li = UI.el("li", null, `<span class="tag tag-amber">${concept ? UI.escapeHtml(concept.label) : UI.escapeHtml(w.concept)}</span> <small>${w.count}x salah</small>`);
        li.style.marginBottom = "6px";
        ul.appendChild(li);
      });
      mastery.appendChild(ul);
    } else {
      mastery.appendChild(UI.el("p", null, "<small>Belum ada data konsep yang lemah — kerjakan beberapa soal dulu di SQL Simulator.</small>"));
    }

    const hist = $("#dashHistory"); hist.innerHTML = "";
    if (!s.history.length) {
      hist.appendChild(UI.el("div", "empty-state", `<div class="ic">🕓</div>Belum ada riwayat latihan.`));
    } else {
      const ul = UI.el("ul");
      s.history.slice(0, 8).forEach((h) => {
        const icon = h.type === "lesson" ? "📘" : h.type === "challenge" ? "🏆" : (h.correct ? "✅" : "❌");
        const li = UI.el("li", null, `${icon} <strong>${UI.escapeHtml(h.label || h.type)}</strong> <small>${h.xpDelta >= 0 ? "+" : ""}${h.xpDelta} XP · ${new Date(h.ts).toLocaleDateString("id-ID")}</small>`);
        li.style.padding = "6px 0"; li.style.borderBottom = "1px solid var(--sqlpq-line)";
        ul.appendChild(li);
      });
      hist.appendChild(ul);
    }
  }

  // ===================================================== LEARNING PATHS ===
  function lessonItemHtml(topic, lessonKey) {
    const done = Progress.isLessonComplete(lessonKey);
    const item = UI.el("div", "lesson-item" + (done ? " done" : ""));
    const head = UI.el("div", "lesson-item__head");
    head.innerHTML = `<span class="lesson-item__title">${UI.escapeHtml(topic.title)}</span><span class="tag">${done ? "Selesai" : "Belum"}</span>`;
    const body = UI.el("div", "lesson-item__body");
    body.innerHTML = `
      <h4>Syntax</h4><div class="lesson-syntax">${UI.escapeHtml(topic.syntax || "")}</div>
      <h4>Contoh</h4><div class="lesson-syntax">${UI.escapeHtml(topic.example || "")}</div>
      <p>${UI.escapeHtml(topic.explain || "")}</p>
    `;
    const btnRow = UI.el("div", "btn-row");
    const btnDone = UI.el("button", "btn btn-sm btn-secondary", done ? "✓ Ditandai Selesai" : "Tandai Selesai");
    btnDone.onclick = (e) => {
      e.stopPropagation();
      const xp = Progress.recordLessonComplete(lessonKey, topic.title);
      if (xp) { UI.toast("Materi ditandai selesai (+" + xp + " XP).", "ok"); item.classList.add("done"); btnDone.textContent = "✓ Ditandai Selesai"; renderSidebarProgress(); }
    };
    btnRow.appendChild(btnDone);
    body.appendChild(btnRow);
    item.appendChild(head); item.appendChild(body);
    head.addEventListener("click", () => item.classList.toggle("open"));
    return item;
  }

  function renderSqlPath() {
    const wrap = $("#sqlPathLevels"); wrap.innerHTML = "";
    window.SQLPQ_CurriculumSQL.levels.forEach((lvl) => {
      const card = UI.el("div", "card"); card.style.marginBottom = "14px";
      const head = UI.el("div", "view-head"); head.style.marginBottom = "10px";
      head.innerHTML = `<h3><span class="diff-badge diff-${lvl.level}">${UI.escapeHtml(lvl.title)}</span></h3>`;
      const tryBtn = UI.el("button", "btn btn-sm btn-primary", "Coba Soal Level Ini →");
      tryBtn.onclick = () => { $("#simLevelSelect").value = String(lvl.level); goto("sql-sim"); newQuestion(lvl.level); };
      head.appendChild(tryBtn);
      card.appendChild(head);
      lvl.topics.forEach((t) => card.appendChild(lessonItemHtml(t, "sql:" + t.id)));
      wrap.appendChild(card);
    });
  }

  function renderPqPath() {
    const wrap = $("#pqPathGroups"); wrap.innerHTML = "";
    window.SQLPQ_CurriculumPQ.groups.forEach((g) => {
      const card = UI.el("div", "card"); card.style.marginBottom = "14px";
      card.appendChild(UI.el("h3", null, UI.escapeHtml(g.title)));
      g.topics.forEach((t) => card.appendChild(lessonItemHtml(t, "pq:" + t.id)));
      wrap.appendChild(card);
    });
  }

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
      refreshPqSourceOptions();
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
        refreshPqSourceOptions();
        renderDbTree();
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
          refreshPqSourceOptions();
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
        refreshPqSourceOptions();
        UI.toast(`Excel "${file.name}" berhasil diimport (${dataset.rows.length} baris, sheet pertama).`, "ok");
      } catch (err) { UI.toast("Gagal membaca file Excel: " + err.message, "err"); }
      e.target.value = "";
    });

    $("#btnDgUseInSql").addEventListener("click", async () => {
      if (!App.currentDataset) return;
      try {
        await window.SQLPQ_Engine.loadDataset(App.currentDataset);
        if (App.currentCategory) App.categoryDirtyState[App.currentCategory] = !!App.currentDataset.isDirty;
        renderDbTree();
        goto("sql-sim");
        UI.toast(`Dataset "${App.currentDataset.label}" dimuat ke SQL Simulator.`, "ok");
      } catch (e) { UI.toast("Gagal memuat dataset: " + e.message, "err"); }
    });
    $("#btnDgUseInPq").addEventListener("click", () => {
      if (!App.currentDataset) return;
      setPqSource(App.currentDataset.name);
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
    refreshPqSourceOptions();
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

  function showExplanation(question) {
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
        showExplanation(App.currentQuestion);
      } else {
        Progress.recordAnswer(App.currentQuestion, false, App.hintsShown);
        renderSidebarProgress();
        setResultStatus(verdict.error ? "err" : "wrong", verdict.error || ("Belum tepat — " + verdict.detail));
        const box = $("#explainArea");
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
        }
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

  // ============================================================ PROJECTS =
  function renderProjects() {
    const grid = $("#projectsGrid"); grid.innerHTML = "";
    window.SQLPQ_Projects.PROJECTS.forEach((p) => {
      const card = UI.el("div", "card project-card");
      card.innerHTML = `<div class="tags" style="margin-bottom:6px"><span class="tag">${UI.escapeHtml(p.tool)}</span></div>
        <h3>${UI.escapeHtml(p.title)}</h3><p>${UI.escapeHtml(p.desc)}</p>`;
      const checklist = UI.el("div", "project-checklist");
      const key = "project:" + p.id;
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { saved = {}; }
      p.tasks.forEach((task, i) => {
        const label = document.createElement("label");
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!saved[i];
        cb.onchange = () => {
          saved[i] = cb.checked;
          localStorage.setItem(key, JSON.stringify(saved));
          const allDone = p.tasks.every((_, idx) => saved[idx]);
          if (allDone) {
            const xp = Progress.recordLessonComplete("project:" + p.id, p.title);
            if (xp) { UI.toast(`Project "${p.title}" selesai! +${xp} XP`, "ok"); renderSidebarProgress(); }
          }
        };
        label.appendChild(cb);
        label.appendChild(document.createTextNode(" " + task));
        checklist.appendChild(label);
      });
      card.appendChild(checklist);
      const goBtn = UI.el("button", "btn btn-sm btn-secondary", "Buka SQL Simulator →");
      goBtn.style.marginTop = "10px";
      goBtn.onclick = () => { App.currentCategory = p.category; goto("sql-sim"); };
      card.appendChild(goBtn);
      grid.appendChild(card);
    });
  }

  // ===================================================== FINAL CHALLENGE =
  function renderChallengeIntro() {
    App.challenge = { started: false };
    const area = $("#challengeArea"); area.innerHTML = "";
    const card = UI.el("div", "card");
    const w = window.SQLPQ_Projects.CHALLENGE_WEIGHTS;
    card.innerHTML = `
      <h3>Skema Penilaian</h3>
      <div class="grid grid-3" style="margin:10px 0">
        <div class="tag tag-green">SQL Dasar ${w.sql}%</div>
        <div class="tag tag-green">Data Cleaning ${w.cleaning}%</div>
        <div class="tag tag-green">JOIN &amp; Aggregation ${w.joinAgg}%</div>
        <div class="tag tag-amber">Advanced SQL ${w.advancedSql}%</div>
        <div class="tag tag-amber">Power Query ${w.powerQuery}%</div>
        <div class="tag tag-amber">Problem Solving ${w.problemSolving}%</div>
      </div>
      <p>Anda akan mengerjakan 6 soal (mewakili tiap komponen di atas) berbasis dataset yang sedang dimuat. Setiap soal dinilai otomatis dari HASIL query, bukan teks query.</p>
      <button class="btn btn-primary" id="btnStartChallenge">🏁 Mulai Final Challenge</button>
    `;
    area.appendChild(card);
    $("#btnStartChallenge").addEventListener("click", startChallenge);
  }

  async function startChallenge() {
    await ensureCategoryLoaded(App.currentCategory || "sales", { forceDirty: true });
    await ensureRelationalLoaded();
    const components = [
      { key: "sql", label: "SQL Dasar", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.sql, question: window.SQLPQ_Questions.generateQuestion(1, App.currentCategory) },
      { key: "cleaning", label: "Data Cleaning", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.cleaning, question: window.SQLPQ_Questions.generateQuestion(5, App.currentCategory) },
      { key: "joinAgg", label: "JOIN & Aggregation", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.joinAgg, question: window.SQLPQ_Questions.generateQuestion(3, App.currentCategory) },
      { key: "advancedSql", label: "Advanced SQL", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.advancedSql, question: window.SQLPQ_Questions.generateQuestion(4, App.currentCategory) },
      { key: "powerQuery", label: "Power Query (konsep)", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.powerQuery, question: window.SQLPQ_Questions.generateQuestion(2, App.currentCategory) },
      { key: "problemSolving", label: "Problem Solving", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.problemSolving, question: window.SQLPQ_Questions.generateQuestion(2, App.currentCategory) }
    ];
    App.challenge = { started: true, components, answers: {} };
    renderChallengeForm();
  }

  function renderChallengeForm() {
    const area = $("#challengeArea"); area.innerHTML = "";
    App.challenge.components.forEach((comp, idx) => {
      const card = UI.el("div", "card"); card.style.marginBottom = "12px";
      card.innerHTML = `<div class="question-box__level"><span class="diff-badge diff-${comp.question.level}">${UI.escapeHtml(comp.label)} · ${comp.weight}%</span></div>
        <p><strong>${UI.escapeHtml(comp.question.prompt)}</strong></p>`;
      const ta = document.createElement("textarea");
      ta.className = "sql-editor"; ta.style.minHeight = "90px";
      ta.id = "challengeInput_" + idx;
      card.appendChild(ta);
      area.appendChild(card);
    });
    const submitBtn = UI.el("button", "btn btn-primary", "✅ Selesaikan &amp; Nilai Challenge");
    submitBtn.onclick = gradeChallenge;
    area.appendChild(submitBtn);
  }

  function gradeChallenge() {
    let scoreSum = 0;
    const weakAreas = [];
    App.challenge.components.forEach((comp, idx) => {
      const sql = $("#challengeInput_" + idx).value;
      const verdict = window.SQLPQ_Grading.gradeQuery(sql, comp.question);
      comp.correct = !!verdict.correct;
      if (verdict.correct) scoreSum += comp.weight;
      else weakAreas.push(comp.label);
    });
    const scorePct = Math.round(scoreSum);
    const band = window.SQLPQ_Projects.CHALLENGE_BANDS.find((b) => scorePct >= b.min && scorePct <= b.max) || window.SQLPQ_Projects.CHALLENGE_BANDS[0];
    Progress.recordChallengeResult(scorePct, band.label);
    renderSidebarProgress();

    const area = $("#challengeArea"); area.innerHTML = "";
    const card = UI.el("div", "card");
    card.innerHTML = `
      <div class="score-ring" style="--pct:${scorePct}"><div class="score-ring__inner"><b>${scorePct}%</b><small>SKOR</small></div></div>
      <h2 style="text-align:center">${UI.escapeHtml(band.label)}</h2>
      <p style="text-align:center">Hasil disimpan ke riwayat progres Anda.</p>
    `;
    if (weakAreas.length) {
      card.innerHTML += `<h4>Rekomendasi Materi yang Perlu Diperkuat</h4><div class="btn-row">${weakAreas.map((w) => `<span class="tag tag-red">${UI.escapeHtml(w)}</span>`).join(" ")}</div>`;
    }
    const retryBtn = UI.el("button", "btn btn-secondary", "Coba Lagi"); retryBtn.style.marginTop = "14px";
    retryBtn.onclick = renderChallengeIntro;
    card.appendChild(retryBtn);
    area.appendChild(card);
  }

  // ========================================================= CHEATSHEET ==
  function renderCheatsheet() {
    const grid = $("#cheatGrid"); grid.innerHTML = "";
    window.SQLPQ_Cheatsheet.CHEATS.forEach((c) => {
      const card = UI.el("div", "card cheat-card");
      card.innerHTML = `<h4>${UI.escapeHtml(c.title)}</h4>
        <div class="lesson-syntax">${UI.escapeHtml(c.syntax)}</div>
        <p><strong>Contoh:</strong></p><div class="lesson-syntax">${UI.escapeHtml(c.example)}</div>
        <p><small>${UI.escapeHtml(c.note)}</small></p>`;
      grid.appendChild(card);
    });
  }

  // =============================================================== BOOT ===
  async function bootSqlEngine() {
    const pill = $("#engineStatusPill");
    window.SQLPQ_Engine.setStatusCallback((msg) => { pill.textContent = msg; });
    try {
      await window.SQLPQ_Engine.ensureLoaded();
      pill.textContent = "SQL Engine: siap ✓";
      pill.classList.remove("engine-status--err");
      pill.classList.add("engine-status--ready");
    } catch (e) {
      pill.textContent = "SQL Engine: gagal dimuat — klik untuk coba lagi";
      pill.classList.add("engine-status--err");
      pill.style.cursor = "pointer";
      pill.onclick = () => { pill.onclick = null; pill.classList.remove("engine-status--err"); bootSqlEngine(); };
      UI.toast("Gagal memuat SQL engine (lokal maupun CDN). Periksa koneksi internet Anda, atau klik status di kanan atas untuk coba lagi.", "err");
    }
  }

  function boot() {
    initTheme();
    initNav();
    initProgressButtons();
    initDatasetGenerator();
    initSqlSimulator();
    initPqSimulator();
    initPqPracticeMode();
    renderSidebarProgress();
    renderDashboard();
    Progress.touchStreak();
    renderSidebarProgress();
    bootSqlEngine();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
