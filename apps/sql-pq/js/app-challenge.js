/**
 * app-challenge.js — proyek, tantangan, cheatsheet, dan bootstrap (boot)
 * (dipecah dari app.js; perilaku identik)
 * Classic script: dimuat BERURUTAN sesudah app.js (lihat HTML); berbagi fungsi lewat window.__SqlPqApp.
 */
(function () {
  "use strict";
  const TC = window.__SqlPqApp;
  const { $, UI, Progress, renderSidebarProgress, App, goto, ensureCategoryLoaded, ensureRelationalLoaded, initTheme, initNav, initProgressButtons, initDatasetGenerator, initSqlSimulator, initPqSimulator, initPqPracticeMode, renderDashboard } = TC;
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


  /** Generate an actual Power Query M challenge question (not SQL). */
  function generatePqChallengeQuestion() {
    const scenarios = [
      {
        prompt: "Tulis pipeline Power Query M untuk membersihkan data: mulai dari Source, hapus duplikat, filter baris Quantity yang lebih besar dari 0, lalu ubah tipe Total_Sales menjadi number.",
        requiredTerms: ["let", "in", "table.distinct", "table.selectrows", "table.transformcolumntypes"],
        solutionM: "let\n    Source = Excel.CurrentWorkbook(){[Name=\"Sales\"]}[Content],\n    RemovedDuplicates = Table.Distinct(Source),\n    FilteredRows = Table.SelectRows(RemovedDuplicates, each [Quantity] > 0),\n    ChangedTypes = Table.TransformColumnTypes(FilteredRows, {{\"Total_Sales\", type number}})\nin\n    ChangedTypes"
      },
      {
        prompt: "Tulis pipeline Power Query M untuk Source data pelanggan: trim kolom Name, filter nilai Customer_ID yang null, lalu tambahkan kolom Segment dengan Conditional Column / Table.AddColumn.",
        requiredTerms: ["let", "in", "text.trim", "table.selectrows", "table.addcolumn"],
        solutionM: "let\n    Source = Excel.CurrentWorkbook(){[Name=\"Customers\"]}[Content],\n    TrimmedName = Table.TransformColumns(Source, {{\"Name\", Text.Trim, type text}}),\n    FilteredRows = Table.SelectRows(TrimmedName, each [Customer_ID] <> null),\n    AddedSegment = Table.AddColumn(FilteredRows, \"Segment\", each if [Total_Purchase] >= 10000000 then \"High\" else \"Regular\")\nin\n    AddedSegment"
      }
    ];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    return Object.assign({
      id: "pq-concept-" + Date.now(), concept: "pipeline", conceptLabel: "Power Query Pipeline", level: 1,
      hints: ["Gunakan struktur let ... in.", "Setiap Applied Step menerima hasil dari step sebelumnya.", "Fungsi M dan nama kolom bersifat case-sensitive."],
      solutionSql: "", orderMatters: false
    }, scenario);
  }

  async function startChallenge() {
    await ensureCategoryLoaded(App.currentCategory || "sales", { forceDirty: true });
    await ensureRelationalLoaded();
    const components = [
      { key: "sql", label: "SQL Dasar", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.sql, question: window.SQLPQ_Questions.generateQuestion(1, App.currentCategory) },
      { key: "cleaning", label: "Data Cleaning", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.cleaning, question: window.SQLPQ_Questions.generateQuestion(5, App.currentCategory) },
      { key: "joinAgg", label: "JOIN & Aggregation", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.joinAgg, question: window.SQLPQ_Questions.generateQuestion(3, App.currentCategory) },
      { key: "advancedSql", label: "Advanced SQL", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.advancedSql, question: window.SQLPQ_Questions.generateQuestion(4, App.currentCategory) },
      { key: "powerQuery", label: "Power Query (konsep)", weight: window.SQLPQ_Projects.CHALLENGE_WEIGHTS.powerQuery, question: generatePqChallengeQuestion() },
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
      ta.placeholder = comp.key === "powerQuery" ? "Tulis M code di sini (let ... in)" : "Tulis query SQL di sini";
      ta.setAttribute("aria-label", comp.key === "powerQuery" ? "Editor kode Power Query M" : "Editor query SQL");
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
      let verdict;
      if (comp.key === "powerQuery") {
        // M is not executable in this browser simulator. Validate the required
        // M-language structure and transformations instead of treating any long
        // free text as correct.
        const normalizedM = String(sql || "").toLowerCase().replace(/\s+/g, " ");
        const requiredTerms = comp.question.requiredTerms || ["let", "in"];
        const missingTerms = requiredTerms.filter((term) => !normalizedM.includes(term));
        const validLetIn = /\blet\b[\s\S]*\bin\b/.test(normalizedM);
        verdict = {
          correct: validLetIn && missingTerms.length === 0,
          error: missingTerms.length ? "Kode M belum memuat: " + missingTerms.join(", ") : ""
        };
      } else {
        verdict = window.SQLPQ_Grading.gradeQuery(sql, comp.question);
      }
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

  Object.assign(TC, { renderProjects, renderChallengeIntro, renderCheatsheet });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
