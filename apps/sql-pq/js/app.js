/**
 * app.js — Orkestrasi seluruh layar SQL & Power Query Learning Simulator.
 */
(function () {
  "use strict";
  const TC = (window.__SqlPqApp = window.__SqlPqApp || {});
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
    if (tab === "projects" && !$("#projectsGrid").childElementCount) TC.renderProjects();
    if (tab === "challenge" && !App.challenge) TC.renderChallengeIntro();
    if (tab === "cheatsheet" && !$("#cheatGrid").childElementCount) TC.renderCheatsheet();
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
      tryBtn.onclick = () => { $("#simLevelSelect").value = String(lvl.level); goto("sql-sim"); TC.newQuestion(lvl.level); };
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

  Object.assign(TC, { $, UI, App, goto, Progress, renderSidebarProgress, initTheme, initNav, initProgressButtons, renderDashboard });
})();
