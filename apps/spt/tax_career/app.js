/**
 * Tax Career & Practice — Learn → Practice → Review → Result
 * + Commercial & Fiscal Tax Accounting (fondasi Tax Accountant)
 * Progress: localStorage spt_tax_career_progress
 */
(function () {
  const TC = (window.__TaxCareerApp = window.__TaxCareerApp || {});
  const STORAGE_KEY = "spt_tax_career_progress";

  const state = {
    view: "hub",
    trackId: null,
    queueIndex: 0,
    answers: [],
    locked: false,
    cf: {
      module: null,
      classifyIndex: 0,
      classifyAnswers: [],
      reconId: null,
      reconChoices: {},
      permIndex: 0,
      permAnswers: [],
      errorIndex: 0
    }
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  let _careerSaveFailWarned = false; // biar peringatan cuma sekali per sesi
  function saveProgress(patch) {
    const cur = loadProgress();
    const next = Object.assign({}, cur, patch, { updatedAt: Date.now() });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Gagal simpan progress Tax Career:", e);
      // Data safety (bagian 30): sebelumnya kegagalan ini sepenuhnya senyap —
      // hasil simulasi karier (skor/kasus selesai) bisa hilang tanpa peringatan.
      if (!_careerSaveFailWarned) {
        _careerSaveFailWarned = true;
        alert('⚠️ Penyimpanan progres Tax Career gagal (penyimpanan browser penuh atau mode privat). Progres mungkin tidak tersimpan.');
      }
    }
    return next;
  }

  function tracks() {
    return window.TAX_CAREER_TRACKS || [];
  }
  function questionsFor(trackId) {
    return (window.TAX_CAREER_QUESTIONS || []).filter((q) => q.category === trackId);
  }
  function getTrack(id) {
    return tracks().find((t) => t.id === id);
  }

  function showScreen(name) {
    state.view = name;
    $$(".tc-screen").forEach((el) => {
      el.classList.toggle("active", el.dataset.screen === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatRp(n) {
    const x = Number(n) || 0;
    return "Rp " + x.toLocaleString("id-ID");
  }

  /* ========== HUB ========== */
  function renderHub() {
    const grid = $("#tcHubGrid");
    if (!grid) return;
    const progress = loadProgress();
    const byTrack = progress.byTrack || {};

    const cfCard = `
      <article class="tc-card" style="border-top: 4px solid #2e7d32;">
        <div class="tc-card__icon" style="background:#2e7d3222">🧮</div>
        <h2>Commercial &amp; Fiscal Tax Accounting</h2>
        <p>Fondasi Tax Accountant: komersial vs fiskal, koreksi +/−, rekonsiliasi, laba fiskal, hingga tautan SPT 1771.</p>
        <div class="tc-card__actions">
          <button type="button" class="btn btn-primary" id="tcOpenCf">Buka Modul Commercial–Fiscal</button>
        </div>
      </article>
      <article class="tc-card" style="border-top: 4px solid #c62828;">
        <div class="tc-card__icon" style="background:#c6282822">🕵️</div>
        <h2>Tax Auditor / Reviewer Lab</h2>
        <p>Review transaksi, kepatuhan, koreksi fiskal, hitung ulang, cross-check SPT, temuan, risiko, dan final review — learning by doing.</p>
        <div class="tc-card__actions">
          <button type="button" class="btn btn-primary" id="tcOpenAud">Buka Tax Auditor Lab</button>
        </div>
      </article>`;

    grid.innerHTML =
      cfCard +
      tracks()
        .map((t) => {
          const p = byTrack[t.id];
          const badge = p
            ? `<span class="tc-progress-pill" style="align-self:flex-start">Skor terakhir: ${p.score}/${p.total}</span>`
            : `<span class="tc-tag">Belum dilatih</span>`;
          const extra =
            t.id === "tax-accountant"
              ? `<button type="button" class="btn btn-outline" data-action="cf">Fondasi Komersial–Fiskal</button>`
              : t.id === "tax-auditor"
              ? `<button type="button" class="btn btn-outline" data-action="aud">Buka Auditor Lab</button>`
              : "";
          return `
        <article class="tc-card" style="border-top: 4px solid ${t.color}">
          <div class="tc-card__icon" style="background:${t.color}22">${t.icon}</div>
          <h2>${escapeHtml(t.title)}</h2>
          <p>${escapeHtml(t.subtitle)}</p>
          ${badge}
          <div class="tc-card__actions">
            <button type="button" class="btn btn-outline" data-action="learn" data-track="${t.id}">Pelajari</button>
            <button type="button" class="btn btn-primary" data-action="practice" data-track="${t.id}">Latihan</button>
            ${extra}
          </div>
        </article>`;
        })
        .join("");

    grid.onclick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "cf") {
        TC.openCfHub();
        return;
      }
      if (action === "aud") {
        TC.openAudHub();
        return;
      }
      const id = btn.getAttribute("data-track");
      if (action === "learn") openLearn(id);
      else openPractice(id);
    };
    const openCf = $("#tcOpenCf");
    if (openCf) openCf.onclick = () => TC.openCfHub();
    const openAud = $("#tcOpenAud");
    if (openAud) openAud.onclick = () => TC.openAudHub();

    showScreen("hub");
  }

  function openLearn(trackId) {
    const track = getTrack(trackId);
    if (!track) return;
    state.trackId = trackId;
    const panel = $("#tcLearnPanel");
    const foundation =
      track.foundationModule === "commercial-fiscal"
        ? `<div class="tc-linkbox">
            <div><strong>${escapeHtml(track.foundationLabel || "Fondasi Commercial–Fiscal")}</strong></div>
            <div style="margin-top:8px">Pahami dulu dari mana angka fiskal berasal sebelum mengisi SPT.</div>
            <div style="margin-top:8px"><button type="button" class="btn btn-primary" id="tcLearnToCf">Buka Commercial &amp; Fiscal</button></div>
          </div>`
        : "";

    panel.innerHTML = `
      <div class="tc-nav-row">
        <button type="button" class="btn btn-ghost" id="tcLearnBack">← Kembali</button>
        <span class="tc-step">Learn · <strong>${escapeHtml(track.title)}</strong></span>
      </div>
      <div class="tc-meta">
        <span class="tc-tag">${escapeHtml(track.subtitle)}</span>
      </div>
      <h2>${track.icon} ${escapeHtml(track.title)}</h2>
      ${track.learn
        .map(
          (b) => `
        <div class="tc-learn-block">
          <h3>${escapeHtml(b.heading)}</h3>
          <p>${escapeHtml(b.body)}</p>
        </div>`
        )
        .join("")}
      ${foundation}
      ${
        track.linkSpt
          ? `<div class="tc-linkbox">
              <div>${escapeHtml(track.linkSpt.note)}</div>
              <div style="margin-top:8px"><a href="${track.linkSpt.href}">${escapeHtml(track.linkSpt.label)} →</a></div>
            </div>`
          : ""
      }
      <div class="tc-actions">
        <button type="button" class="btn btn-primary" id="tcStartPractice">Mulai Latihan</button>
      </div>`;

    $("#tcLearnBack").onclick = () => renderHub();
    $("#tcStartPractice").onclick = () => openPractice(trackId);
    const toCf = $("#tcLearnToCf");
    if (toCf) toCf.onclick = () => TC.openCfHub();
    showScreen("learn");
  }

  function openPractice(trackId) {
    const track = getTrack(trackId);
    const list = questionsFor(trackId);
    if (!track || !list.length) {
      alert("Belum ada soal untuk modul ini.");
      return;
    }
    state.trackId = trackId;
    state.queueIndex = 0;
    state.answers = [];
    state.locked = false;
    renderQuestion();
    showScreen("practice");
  }

  function currentQuestion() {
    return questionsFor(state.trackId)[state.queueIndex];
  }

  function renderQuestion() {
    const track = getTrack(state.trackId);
    const list = questionsFor(state.trackId);
    const q = currentQuestion();
    const panel = $("#tcPracticePanel");
    if (!q) {
      finishPractice();
      return;
    }
    state.locked = false;
    panel.innerHTML = `
      <div class="tc-nav-row">
        <button type="button" class="btn btn-ghost" id="tcPracticeBack">← Hub</button>
        <span class="tc-step">Practice · <strong>${state.queueIndex + 1}/${list.length}</strong> · ${escapeHtml(track.title)}</span>
      </div>
      <div class="tc-meta">
        <span class="tc-tag">${escapeHtml(q.level || "basic")}</span>
        <span class="tc-tag tc-tag--skill">${escapeHtml(q.skill || "")}</span>
        <span class="tc-tag">${escapeHtml(q.id)}</span>
      </div>
      <h2 style="font-size:1.05rem;margin:0 0 10px">${escapeHtml(q.title)}</h2>
      <div class="tc-scenario">${escapeHtml(q.scenario)}</div>
      <div class="tc-q">${escapeHtml(q.question)}</div>
      <div class="tc-options" id="tcOptions">
        ${(q.options || [])
          .map(
            (opt) => `
          <label class="tc-option">
            <input type="radio" name="tcAns" value="${escapeAttr(opt)}" />
            <span>${escapeHtml(opt)}</span>
          </label>`
          )
          .join("")}
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions">
        <button type="button" class="btn btn-primary" id="tcCheck">Cek Jawaban</button>
        <button type="button" class="btn btn-outline" id="tcNext" disabled>Lanjut →</button>
      </div>`;

    $("#tcPracticeBack").onclick = () => renderHub();
    const optionsRoot = $("#tcOptions");
    optionsRoot.addEventListener("change", (e) => {
      if (state.locked) return;
      $$(".tc-option", optionsRoot).forEach((el) => el.classList.remove("is-selected"));
      const lab = e.target.closest(".tc-option");
      if (lab) lab.classList.add("is-selected");
    });
    $("#tcCheck").onclick = () => checkAnswer(q);
    $("#tcNext").onclick = () => {
      state.queueIndex += 1;
      if (state.queueIndex >= list.length) finishPractice();
      else renderQuestion();
    };
  }

  // Pembahasan berlapis (Fase 3): semua teks di-escape; blok kosong tidak dirender.
  function pembahasanHtml(q) {
    var pb = q && q.pembahasan;
    if (!pb || !pb.konsep) return "";
    var row = function (label, body, cls) {
      return body ? '<div class="tcpb-row ' + (cls || "") + '"><span class="tcpb-label">' + label + "</span>" + body + "</div>" : "";
    };
    var h = '<div class="tcpb">';
    h += row("Mengapa jawabannya begitu", "<p>" + escapeHtml(pb.konsep) + "</p>");
    if (pb.dasar) h += row("Dasar", "<p>" + escapeHtml(pb.dasar) + "</p>");
    if (Array.isArray(pb.langkah) && pb.langkah.length) {
      h += row("Langkah hitung", "<ol>" + pb.langkah.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ol>");
    }
    var keys = pb.salah ? Object.keys(pb.salah) : [];
    if (keys.length) {
      h += row("Mengapa opsi lain kurang tepat", "<ul>" + keys.map(function (k) { return "<li><strong>" + escapeHtml(k) + "</strong> — " + escapeHtml(pb.salah[k]) + "</li>"; }).join("") + "</ul>");
    }
    if (pb.jebakan) h += row("Jebakan umum", "<p>" + escapeHtml(pb.jebakan) + "</p>", "tcpb-warn");
    if (pb.ingat) h += row("Cara mengingat", "<p>" + escapeHtml(pb.ingat) + "</p>", "tcpb-tip");
    return h + "</div>";
  }

  function checkAnswer(q) {
    if (state.locked) return;
    const selected = ($('input[name="tcAns"]:checked') || {}).value;
    if (!selected) {
      alert("Pilih salah satu jawaban terlebih dahulu.");
      return;
    }
    state.locked = true;
    const correct = selected === q.answer;
    state.answers.push({ id: q.id, skill: q.skill, selected, correct, explanation: q.explanation });
    $$(".tc-option").forEach((lab) => {
      const input = lab.querySelector("input");
      if (!input) return;
      input.disabled = true;
      if (input.value === q.answer) lab.classList.add("is-correct");
      else if (input.checked && !correct) lab.classList.add("is-wrong");
    });
    const fb = $("#tcFeedback");
    fb.className = "tc-feedback show " + (correct ? "ok" : "bad");
    fb.innerHTML = (correct
      ? `<strong>Benar.</strong> ${escapeHtml(q.explanation || "")}`
      : `<strong>Belum tepat.</strong> Jawaban yang benar: <em>${escapeHtml(q.answer)}</em><br>${escapeHtml(q.explanation || "")}`) + pembahasanHtml(q);
    $("#tcCheck").disabled = true;
    $("#tcNext").disabled = false;
  }

  function finishPractice() {
    const total = state.answers.length;
    const correctCount = state.answers.filter((a) => a.correct).length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    const wrongSkills = [];
    state.answers.forEach((a) => {
      if (!a.correct && a.skill && wrongSkills.indexOf(a.skill) === -1) wrongSkills.push(a.skill);
    });
    const progress = loadProgress();
    const byTrack = Object.assign({}, progress.byTrack || {});
    byTrack[state.trackId] = { score, total: 100, correct: correctCount, incorrect: total - correctCount, at: Date.now() };
    saveProgress({ byTrack });

    const track = getTrack(state.trackId);
    const panel = $("#tcResultPanel");
    panel.innerHTML = `
      <div class="tc-nav-row"><span class="tc-step">Result · <strong>${escapeHtml(track.title)}</strong></span></div>
      <div class="tc-score"><div class="big">${score}/100</div><div class="sub">Skor latihan ${escapeHtml(track.title)}</div></div>
      <div class="tc-result-grid">
        <div class="tc-stat"><strong>${correctCount}</strong><span>Benar</span></div>
        <div class="tc-stat"><strong>${total - correctCount}</strong><span>Salah</span></div>
        <div class="tc-stat"><strong>${total}</strong><span>Soal</span></div>
      </div>
      ${
        wrongSkills.length
          ? `<div class="tc-improve"><strong>Yang perlu diperbaiki:</strong><ul>${wrongSkills.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>`
          : `<div class="tc-feedback show ok">Semua jawaban benar.</div>`
      }
      ${
        track.linkSpt
          ? `<div class="tc-linkbox" style="margin-top:14px"><div>${escapeHtml(track.linkSpt.note)}</div>
              <div style="margin-top:8px"><a href="${track.linkSpt.href}">${escapeHtml(track.linkSpt.label)} →</a></div></div>`
          : ""
      }
      <div class="tc-actions">
        <button type="button" class="btn btn-outline" id="tcRetry">Ulangi Latihan</button>
        <button type="button" class="btn btn-primary" id="tcToHub">Kembali ke Tax Career</button>
      </div>`;
    $("#tcRetry").onclick = () => openPractice(state.trackId);
    $("#tcToHub").onclick = () => renderHub();
    showScreen("result");
  }


    function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  Object.assign(TC, { $, escapeHtml, renderHub, showScreen, state, formatRp, $$, loadProgress, saveProgress, tracks });
})();
