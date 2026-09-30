/**
 * Tax Career & Practice — Learn → Practice → Review → Result
 * + Commercial & Fiscal Tax Accounting (fondasi Tax Accountant)
 * Progress: localStorage spt_tax_career_progress
 */
(function () {
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
        openCfHub();
        return;
      }
      if (action === "aud") {
        openAudHub();
        return;
      }
      const id = btn.getAttribute("data-track");
      if (action === "learn") openLearn(id);
      else openPractice(id);
    };
    const openCf = $("#tcOpenCf");
    if (openCf) openCf.onclick = () => openCfHub();
    const openAud = $("#tcOpenAud");
    if (openAud) openAud.onclick = () => openAudHub();

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
    if (toCf) toCf.onclick = () => openCfHub();
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
    fb.innerHTML = correct
      ? `<strong>Benar.</strong> ${escapeHtml(q.explanation || "")}`
      : `<strong>Belum tepat.</strong> Jawaban yang benar: <em>${escapeHtml(q.answer)}</em><br>${escapeHtml(q.explanation || "")}`;
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

  /* ========== COMMERCIAL & FISCAL ========== */
  function openCfHub() {
    const root = $("#tcCfHub");
    const mods = window.CF_MODULES || [];
    root.innerHTML = `
      <div class="tc-nav-row">
        <button type="button" class="btn btn-ghost" id="tcCfBackHub">← Tax Career</button>
        <span class="tc-step">Commercial &amp; Fiscal · <strong>Tax Accountant Foundation</strong></span>
      </div>
      <div class="tc-panel" style="margin-bottom:14px">
        <h2>Commercial &amp; Fiscal Tax Accounting</h2>
        <p style="color:var(--tc-muted);margin:0 0 10px;font-size:0.92rem">
          Accounting → Laba Komersial → Identifikasi Perbedaan → Koreksi Fiskal → Rekonsiliasi → Laba Fiskal → PPh Badan → SPT 1771
        </p>
        <div class="cf-flow">
          ${(window.CF_CONCEPT && window.CF_CONCEPT.flow ? window.CF_CONCEPT.flow : [])
            .map((s) => `<span class="cf-flow__step">${escapeHtml(s)}</span>`)
            .join("<span class=\"cf-flow__arrow\">→</span>")}
        </div>
      </div>
      <div class="tc-grid">
        ${mods
          .map(
            (m) => `
          <article class="tc-card">
            <div class="tc-card__icon">${m.icon}</div>
            <h2>${escapeHtml(m.title)}</h2>
            <div class="tc-card__actions">
              <button type="button" class="btn btn-primary" data-cf="${m.id}">Buka</button>
            </div>
          </article>`
          )
          .join("")}
      </div>`;
    $("#tcCfBackHub").onclick = () => renderHub();
    root.onclick = (e) => {
      const btn = e.target.closest("[data-cf]");
      if (!btn) return;
      openCfModule(btn.getAttribute("data-cf"));
    };
    showScreen("cf-hub");
  }

  function openCfModule(id) {
    state.cf.module = id;
    const map = {
      concept: renderCfConcept,
      classify: () => {
        state.cf.classifyIndex = 0;
        state.cf.classifyAnswers = [];
        renderCfClassify();
      },
      positive: () => renderCfCorrection("positive"),
      negative: () => renderCfCorrection("negative"),
      "perm-temp": () => {
        state.cf.permIndex = 0;
        state.cf.permAnswers = [];
        renderCfPermTemp();
      },
      recon: renderCfReconPicker,
      "find-error": () => {
        state.cf.errorIndex = 0;
        renderCfFindError();
      },
      "spt-link": renderCfSptLink
    };
    (map[id] || openCfHub)();
  }

  function cfWorkShell(title, bodyHtml) {
    const panel = $("#tcCfWork");
    panel.innerHTML = `
      <div class="tc-nav-row">
        <button type="button" class="btn btn-ghost" id="tcCfWorkBack">← Commercial &amp; Fiscal</button>
        <span class="tc-step">${title}</span>
      </div>
      ${bodyHtml}`;
    $("#tcCfWorkBack").onclick = () => openCfHub();
    showScreen("cf-work");
  }

  function renderCfConcept() {
    const c = window.CF_CONCEPT;
    cfWorkShell(
      "Komersial vs Fiskal",
      `
      <h2>📘 Konsep Komersial vs Fiskal</h2>
      <div class="cf-two">
        <div class="cf-box">
          <h3>${escapeHtml(c.commercial.title)}</h3>
          <p>${escapeHtml(c.commercial.body)}</p>
        </div>
        <div class="cf-box">
          <h3>${escapeHtml(c.fiscal.title)}</h3>
          <p>${escapeHtml(c.fiscal.body)}</p>
        </div>
      </div>
      <div class="tc-scenario" style="margin-top:14px"><strong>Kunci:</strong> ${escapeHtml(c.key)}</div>
      <div class="cf-formula">${escapeHtml(c.formula)}</div>
      <p style="font-size:0.88rem;color:var(--tc-muted)">Contoh edukasi: Laba komersial 500jt, koreksi +20jt (beban non-deductible), koreksi −10jt (penghasilan final) → laba fiskal 510jt. Angka hanya ilustrasi.</p>
      <div class="tc-linkbox">
        <div>Setelah paham konsep, lanjutkan ke identifikasi transaksi dan simulator rekonsiliasi, lalu praktik di Lampiran I 1771.</div>
        <div style="margin-top:8px"><a href="../formulir_spt/1771_Lampiran_I.html">Buka Formulir 1771 Lampiran I →</a></div>
      </div>`
    );
  }

  function renderCfCorrection(kind) {
    const isPos = kind === "positive";
    cfWorkShell(
      isPos ? "Koreksi Fiskal Positif" : "Koreksi Fiskal Negatif",
      isPos
        ? `
      <h2>⬆️ Koreksi Fiskal Positif</h2>
      <p>Koreksi positif <strong>menambah</strong> laba fiskal relatif terhadap laba komersial, biasanya karena ada beban/pengurang komersial yang <em>tidak atau belum</em> dapat diperhitungkan sebagai pengurang fiskal sesuai ketentuan (konteks kasus).</p>
      <div class="cf-calc-demo">
        <div>Laba Komersial <strong>Rp 500.000.000</strong></div>
        <div class="cf-calc-op">+</div>
        <div>Koreksi Positif (contoh beban non-deductible) <strong>Rp 20.000.000</strong></div>
        <div class="cf-calc-op">=</div>
        <div>Laba Fiskal (sebelum koreksi negatif lain) <strong>Rp 520.000.000</strong></div>
      </div>
      <p style="font-size:0.88rem;color:var(--tc-muted)">Ini contoh konsep, bukan aturan universal untuk semua jenis biaya. Selalu lihat substansi, dokumen, dan ketentuan tahun pajak terkait.</p>
      <div class="tc-actions"><button type="button" class="btn btn-primary" id="tcGoClassify">Latihan klasifikasi transaksi</button></div>`
        : `
      <h2>⬇️ Koreksi Fiskal Negatif</h2>
      <p>Koreksi negatif <strong>mengurangi</strong> laba fiskal relatif terhadap laba komersial, misalnya mengeluarkan penghasilan yang sudah bersifat final dari perhitungan PKP tarif umum (konteks edukasi rekonsiliasi).</p>
      <div class="cf-calc-demo">
        <div>Laba Komersial <strong>Rp 500.000.000</strong></div>
        <div class="cf-calc-op">−</div>
        <div>Koreksi Negatif (contoh penghasilan final di laba) <strong>Rp 10.000.000</strong></div>
        <div class="cf-calc-op">=</div>
        <div>Laba Fiskal (ilustrasi) <strong>Rp 490.000.000</strong></div>
      </div>
      <p style="font-size:0.88rem;color:var(--tc-muted)">Arah koreksi bergantung pada fakta dan ketentuan. Modul ini melatih kerangka pikir, bukan menggantikan analisis kasus nyata.</p>
      <div class="tc-actions"><button type="button" class="btn btn-primary" id="tcGoClassify">Latihan klasifikasi transaksi</button></div>`
    );
    const btn = $("#tcGoClassify");
    if (btn)
      btn.onclick = () => {
        state.cf.classifyIndex = 0;
        state.cf.classifyAnswers = [];
        renderCfClassify();
      };
  }

  function renderCfClassify() {
    const list = window.CF_CLASSIFY || [];
    const i = state.cf.classifyIndex;
    if (i >= list.length) {
      finishCfClassify();
      return;
    }
    const item = list[i];
    cfWorkShell(
      `Identifikasi · ${i + 1}/${list.length}`,
      `
      <h2>🔎 ${escapeHtml(item.title)}</h2>
      <div class="tc-meta"><span class="tc-tag">${escapeHtml(item.id)}</span><span class="tc-tag">${formatRp(item.amount)}</span></div>
      <div class="tc-scenario">
        <div><strong>Komersial:</strong> ${escapeHtml(item.commercialTreatment)}</div>
        <div style="margin-top:6px"><strong>Fiskal (konteks edukasi):</strong> ${escapeHtml(item.fiscalTreatment)}</div>
      </div>
      <p class="tc-q">Klasifikasikan koreksi fiskal untuk transaksi ini:</p>
      <div class="cf-classify-btns" id="cfClassBtns">
        <button type="button" class="btn btn-outline" data-type="none">Tidak ada koreksi</button>
        <button type="button" class="btn btn-outline" data-type="positive">Koreksi Fiskal Positif</button>
        <button type="button" class="btn btn-outline" data-type="negative">Koreksi Fiskal Negatif</button>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions">
        <button type="button" class="btn btn-outline" id="tcCfNext" disabled>Lanjut →</button>
      </div>`
    );
    let locked = false;
    $("#cfClassBtns").onclick = (e) => {
      const b = e.target.closest("[data-type]");
      if (!b || locked) return;
      locked = true;
      const type = b.getAttribute("data-type");
      const ok = type === item.correctionType;
      state.cf.classifyAnswers.push({ id: item.id, ok, type });
      $$("#cfClassBtns [data-type]").forEach((x) => {
        x.disabled = true;
        if (x.getAttribute("data-type") === item.correctionType) x.classList.add("btn-primary");
      });
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (ok ? "ok" : "bad");
      fb.innerHTML = (ok ? "<strong>Benar.</strong> " : "<strong>Belum tepat.</strong> ") + escapeHtml(item.explanation);
      $("#tcCfNext").disabled = false;
    };
    $("#tcCfNext").onclick = () => {
      state.cf.classifyIndex += 1;
      renderCfClassify();
    };
  }

  function finishCfClassify() {
    const ans = state.cf.classifyAnswers;
    const ok = ans.filter((a) => a.ok).length;
    const score = ans.length ? Math.round((ok / ans.length) * 100) : 0;
    const progress = loadProgress();
    saveProgress({ cfClassify: { score, ok, total: ans.length, at: Date.now() }, byTrack: progress.byTrack || {} });
    cfWorkShell(
      "Hasil klasifikasi",
      `
      <div class="tc-score"><div class="big">${score}/100</div><div class="sub">Klasifikasi Komersial–Fiskal</div></div>
      <div class="tc-result-grid">
        <div class="tc-stat"><strong>${ok}</strong><span>Benar</span></div>
        <div class="tc-stat"><strong>${ans.length - ok}</strong><span>Salah</span></div>
      </div>
      <div class="tc-actions">
        <button type="button" class="btn btn-outline" id="tcCfRetryClass">Ulangi</button>
        <button type="button" class="btn btn-primary" id="tcCfToRecon">Ke Rekonsiliasi</button>
      </div>`
    );
    $("#tcCfRetryClass").onclick = () => {
      state.cf.classifyIndex = 0;
      state.cf.classifyAnswers = [];
      renderCfClassify();
    };
    $("#tcCfToRecon").onclick = () => renderCfReconPicker();
  }

  function renderCfPermTemp() {
    const list = window.CF_PERM_TEMP || [];
    const i = state.cf.permIndex;
    if (i >= list.length) {
      const ok = state.cf.permAnswers.filter((a) => a.ok).length;
      const score = list.length ? Math.round((ok / list.length) * 100) : 0;
      cfWorkShell(
        "Hasil Permanent vs Temporary",
        `<div class="tc-score"><div class="big">${score}/100</div></div>
         <div class="tc-actions"><button type="button" class="btn btn-primary" id="tcCfBackMod">Kembali</button></div>`
      );
      $("#tcCfBackMod").onclick = () => openCfHub();
      return;
    }
    const item = list[i];
    cfWorkShell(
      `Permanent vs Temporary · ${i + 1}/${list.length}`,
      `
      <h2>${escapeHtml(item.title)}</h2>
      <p class="tc-q">Jenis perbedaan?</p>
      <div class="cf-classify-btns" id="cfPtBtns">
        <button type="button" class="btn btn-outline" data-v="permanent">Permanent Difference</button>
        <button type="button" class="btn btn-outline" data-v="temporary">Temporary Difference</button>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions"><button type="button" class="btn btn-outline" id="tcCfNext" disabled>Lanjut →</button></div>`
    );
    let locked = false;
    $("#cfPtBtns").onclick = (e) => {
      const b = e.target.closest("[data-v]");
      if (!b || locked) return;
      locked = true;
      const v = b.getAttribute("data-v");
      const ok = v === item.answer;
      state.cf.permAnswers.push({ ok });
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (ok ? "ok" : "bad");
      fb.innerHTML = (ok ? "<strong>Benar.</strong> " : "<strong>Belum tepat.</strong> ") + escapeHtml(item.explanation);
      $("#tcCfNext").disabled = false;
    };
    $("#tcCfNext").onclick = () => {
      state.cf.permIndex += 1;
      renderCfPermTemp();
    };
  }

  function renderCfReconPicker() {
    const cases = window.CF_RECON_CASES || [];
    cfWorkShell(
      "Pilih level rekonsiliasi",
      `
      <h2>🧮 Fiscal Reconciliation Simulator</h2>
      <p style="color:var(--tc-muted);font-size:0.92rem">Tentukan jenis koreksi per baris. Sistem menghitung laba fiskal otomatis. Bandingkan dengan kunci setelah submit.</p>
      <div class="tc-grid">
        ${cases
          .map(
            (c) => `
          <article class="tc-card">
            <h2>${escapeHtml(c.title)}</h2>
            <p>Level: ${escapeHtml(c.level)} · Laba komersial ${formatRp(c.labaKomersial)}</p>
            <div class="tc-card__actions">
              <button type="button" class="btn btn-primary" data-recon="${c.id}">Mulai</button>
            </div>
          </article>`
          )
          .join("")}
      </div>`
    );
    $("#tcCfWork").onclick = (e) => {
      const b = e.target.closest("[data-recon]");
      if (!b) return;
      openCfRecon(b.getAttribute("data-recon"));
    };
  }

  function openCfRecon(caseId) {
    const c = (window.CF_RECON_CASES || []).find((x) => x.id === caseId);
    if (!c) return;
    state.cf.reconId = caseId;
    state.cf.reconChoices = {};
    c.lines.forEach((l) => {
      state.cf.reconChoices[l.id] = "none";
    });
    renderCfRecon(c);
  }

  function sumRecon(c, choices) {
    let pos = 0;
    let neg = 0;
    c.lines.forEach((l) => {
      const t = choices[l.id] || "none";
      if (t === "positive") pos += l.correctAmount || 0;
      if (t === "negative") neg += l.correctAmount || 0;
    });
    // For user preview we use correctAmount when they pick type — educational: amount known from line
    return {
      pos,
      neg,
      fiscal: c.labaKomersial + pos - neg
    };
  }

  function correctReconTotals(c) {
    let pos = 0;
    let neg = 0;
    c.lines.forEach((l) => {
      if (l.correctType === "positive") pos += l.correctAmount || 0;
      if (l.correctType === "negative") neg += l.correctAmount || 0;
    });
    return { pos, neg, fiscal: c.labaKomersial + pos - neg };
  }

  function renderCfRecon(c) {
    const live = sumRecon(c, state.cf.reconChoices);
    const rows = c.lines
      .map((l) => {
        const sel = state.cf.reconChoices[l.id] || "none";
        return `<tr>
          <td>${escapeHtml(l.account)}${l.note ? `<div class="cf-note">${escapeHtml(l.note)}</div>` : ""}</td>
          <td class="cf-num">${l.commercial ? formatRp(l.commercial) : "—"}</td>
          <td>
            <select class="cf-select" data-line="${l.id}">
              <option value="none"${sel === "none" ? " selected" : ""}>Tidak ada</option>
              <option value="positive"${sel === "positive" ? " selected" : ""}>Positif (+)</option>
              <option value="negative"${sel === "negative" ? " selected" : ""}>Negatif (−)</option>
            </select>
          </td>
          <td class="cf-num">${sel === "positive" ? formatRp(l.correctAmount) : sel === "negative" ? formatRp(l.correctAmount) : "—"}</td>
        </tr>`;
      })
      .join("");

    cfWorkShell(
      escapeHtml(c.title),
      `
      <h2>🧮 ${escapeHtml(c.title)}</h2>
      <div class="tc-meta"><span class="tc-tag">${escapeHtml(c.level)}</span><span class="tc-tag">Laba komersial ${formatRp(c.labaKomersial)}</span></div>
      <div class="cf-table-wrap">
        <table class="cf-table">
          <thead>
            <tr><th>Akun / Item</th><th>Komersial</th><th>Jenis Koreksi</th><th>Nilai koreksi*</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="cf-note">*Pada mode edukasi ini, nilai koreksi mengikuti nominal item saat Anda memilih jenis koreksi. Di praktik nyata, nilai dihitung dari selisih perlakuan.</p>
      <div class="cf-calc-demo">
        <div>Laba Komersial <strong>${formatRp(c.labaKomersial)}</strong></div>
        <div class="cf-calc-op">+</div>
        <div>Koreksi Positif <strong id="cfLivePos">${formatRp(live.pos)}</strong></div>
        <div class="cf-calc-op">−</div>
        <div>Koreksi Negatif <strong id="cfLiveNeg">${formatRp(live.neg)}</strong></div>
        <div class="cf-calc-op">=</div>
        <div>Laba Fiskal (live) <strong id="cfLiveFiscal">${formatRp(live.fiscal)}</strong></div>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions">
        <button type="button" class="btn btn-primary" id="tcCfSubmitRecon">Cek Rekonsiliasi</button>
        <button type="button" class="btn btn-outline" id="tcCfOtherRecon">Pilih level lain</button>
      </div>`
    );

    const work = $("#tcCfWork");
    if (work) work.onclick = null;

    $$(".cf-select").forEach((sel) => {
      sel.onchange = () => {
        const lineId = sel.getAttribute("data-line");
        state.cf.reconChoices[lineId] = sel.value;
        const line = c.lines.find((l) => l.id === lineId);
        const row = sel.closest("tr");
        if (row && line) {
          const amountCell = row.querySelectorAll("td")[3];
          if (amountCell) {
            const t = sel.value;
            amountCell.textContent =
              t === "positive" || t === "negative" ? formatRp(line.correctAmount) : "—";
          }
        }
        const live2 = sumRecon(c, state.cf.reconChoices);
        const pos = $("#cfLivePos");
        const neg = $("#cfLiveNeg");
        const fis = $("#cfLiveFiscal");
        if (pos) pos.textContent = formatRp(live2.pos);
        if (neg) neg.textContent = formatRp(live2.neg);
        if (fis) fis.textContent = formatRp(live2.fiscal);
      };
    });

    $("#tcCfSubmitRecon").onclick = () => {
      const key = correctReconTotals(c);
      let lineOk = 0;
      c.lines.forEach((l) => {
        if ((state.cf.reconChoices[l.id] || "none") === l.correctType) lineOk += 1;
      });
      const user = sumRecon(c, state.cf.reconChoices);
      const fiscalOk = user.fiscal === key.fiscal;
      const score = Math.round((lineOk / c.lines.length) * 80 + (fiscalOk ? 20 : 0));
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (score >= 70 ? "ok" : "bad");
      fb.innerHTML = `
        <strong>Skor: ${score}/100</strong> · Baris benar ${lineOk}/${c.lines.length}.<br>
        Kunci: Positif ${formatRp(key.pos)}, Negatif ${formatRp(key.neg)}, Laba fiskal ${formatRp(key.fiscal)}.<br>
        ${escapeHtml(c.explanation)}
        <div style="margin-top:8px"><a href="../formulir_spt/1771_Lampiran_I.html">Lanjutkan praktik di 1771 Lampiran I →</a></div>`;
      const progress = loadProgress();
      const cfRecon = Object.assign({}, progress.cfRecon || {});
      cfRecon[c.id] = { score, at: Date.now() };
      saveProgress({ cfRecon, byTrack: progress.byTrack || {} });
    };
    $("#tcCfOtherRecon").onclick = () => renderCfReconPicker();
  }

  function renderCfFindError() {
    const list = window.CF_FIND_ERROR || [];
    const i = state.cf.errorIndex;
    if (i >= list.length) {
      cfWorkShell(
        "Selesai Find the Error",
        `<p>Anda telah meninjau semua kasus review.</p>
         <div class="tc-actions"><button type="button" class="btn btn-primary" id="tcCfBackMod">Kembali</button></div>`
      );
      $("#tcCfBackMod").onclick = () => openCfHub();
      return;
    }
    const item = list[i];
    const g = item.given;
    let body = `
      <h2>🕵️ ${escapeHtml(item.title)}</h2>
      <div class="tc-meta"><span class="tc-tag">${escapeHtml(item.level)}</span><span class="tc-tag">${escapeHtml(item.id)}</span></div>
      <div class="tc-scenario">
        <div>Laba Komersial: <strong>${formatRp(g.labaKomersial)}</strong></div>`;
    if (g.koreksiPositif != null) {
      body += `<div>Koreksi Positif (klaim): <strong>${formatRp(g.koreksiPositif)}</strong></div>
               <div>Koreksi Negatif (klaim): <strong>${formatRp(g.koreksiNegatif)}</strong></div>
               <div>Laba Fiskal (klaim staf): <strong>${formatRp(g.labaFiskalClaimed)}</strong></div>`;
    }
    if (g.items) {
      body += `<ul style="margin:8px 0 0;padding-left:18px">${g.items
        .map((it) => `<li>${escapeHtml(it.label)} — staf menandai: <em>${escapeHtml(it.staffType)}</em></li>`)
        .join("")}</ul>
        <div style="margin-top:6px">Laba Fiskal klaim: <strong>${formatRp(g.labaFiskalClaimed)}</strong></div>`;
    }
    body += `</div>
      <p class="tc-q">Apakah rekonsiliasi staf dapat diterima?</p>
      <div class="cf-classify-btns" id="cfErrBtns">
        <button type="button" class="btn btn-outline" data-v="reject">Tidak — ada kesalahan</button>
        <button type="button" class="btn btn-outline" data-v="accept">Ya — dapat diterima</button>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions"><button type="button" class="btn btn-outline" id="tcCfNext" disabled>Kasus berikutnya →</button></div>`;

    cfWorkShell(`Find the Error · ${i + 1}/${list.length}`, body);

    let locked = false;
    $("#cfErrBtns").onclick = (e) => {
      const b = e.target.closest("[data-v]");
      if (!b || locked) return;
      locked = true;
      // all planted cases have errors
      const ok = b.getAttribute("data-v") === "reject";
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (ok ? "ok" : "bad");
      fb.innerHTML = `
        ${ok ? "<strong>Benar — ada kesalahan.</strong>" : "<strong>Perlu lebih teliti.</strong> Kasus ini mengandung error."}<br>
        <strong>Kesalahan:</strong> ${escapeHtml(item.errorSummary)}<br>
        <strong>Laba fiskal yang benar:</strong> ${formatRp(item.correctLabaFiskal)}<br>
        ${escapeHtml(item.explanation)}`;
      $("#tcCfNext").disabled = false;
    };
    $("#tcCfNext").onclick = () => {
      state.cf.errorIndex += 1;
      renderCfFindError();
    };
  }

  function renderCfSptLink() {
    cfWorkShell(
      "Hubungan ke SPT 1771",
      `
      <h2>📄 Dari Laba Fiskal ke SPT Tahunan 1771</h2>
      <p>Angka di SPT bukan muncul dari kekosongan. Alur edukasi:</p>
      <ol style="padding-left:18px;color:var(--tc-muted);font-size:0.92rem">
        <li>Pembukuan menghasilkan <strong>laba komersial</strong></li>
        <li>Identifikasi beda perlakuan → <strong>koreksi fiskal</strong></li>
        <li><strong>Rekonsiliasi</strong> menghasilkan <strong>laba fiskal</strong></li>
        <li>Laba fiskal menjadi dasar hitung <strong>PPh Badan</strong> (perhatikan tarif/fasilitas tahun pajak terkait)</li>
        <li>Angka tersebut mengalir ke <strong>SPT 1771</strong> (Induk + lampiran, terutama rekonsiliasi di Lampiran I)</li>
      </ol>
      <div class="cf-formula">${escapeHtml((window.CF_CONCEPT && window.CF_CONCEPT.formula) || "")}</div>
      <p style="font-size:0.88rem;color:var(--tc-muted)">${escapeHtml(window.CF_PPH_NOTE || "")}</p>
      <div class="tc-linkbox">
        <div><strong>Praktik di simulator yang sudah ada (jangan buat formulir baru):</strong></div>
        <div style="margin-top:8px"><a href="../formulir_spt/1771_Lampiran_I.html">1771 Lampiran I — Rekonsiliasi Fiskal →</a></div>
        <div style="margin-top:6px"><a href="../formulir_spt/1771_induk.html">1771 Induk →</a></div>
        <div style="margin-top:6px"><a href="../index.html">Dashboard SIM-SPT →</a></div>
      </div>
      <div class="tc-actions">
        <button type="button" class="btn btn-outline" id="tcCfToRecon2">Latihan Rekonsiliasi dulu</button>
      </div>`
    );
    $("#tcCfToRecon2").onclick = () => renderCfReconPicker();
  }


  /* ========== TAX AUDITOR / REVIEWER LAB ========== */
  function openAudHub() {
    const root = $("#tcAudHub");
    const mods = window.AUD_MODULES || [];
    root.innerHTML = `
      <div class="tc-nav-row">
        <button type="button" class="btn btn-ghost" id="tcAudBackHub">← Tax Career</button>
        <span class="tc-step">Tax Auditor / Reviewer · <strong>Lab</strong></span>
      </div>
      <div class="tc-panel" style="margin-bottom:14px">
        <h2>🕵️ Tax Auditor / Reviewer Lab</h2>
        <p style="color:var(--tc-muted);margin:0;font-size:0.92rem">
          Data perusahaan → review transaksi → komersial/fiskal → koreksi → hitung pajak → SPT → temuan → risiko → rekomendasi.
          Dataset edukasi (bukan audit nyata / bukan koneksi DJP).
        </p>
        <div class="tc-meta" style="margin-top:10px">
          <span class="tc-tag">Accountant prepare → Auditor review</span>
          <span class="tc-tag">Compliance submit → Auditor check</span>
          <span class="tc-tag">Auditor findings → Manager decide</span>
        </div>
      </div>
      <div class="tc-grid">
        ${mods.map((m) => `
          <article class="tc-card">
            <div class="tc-card__icon">${m.icon}</div>
            <h2>${escapeHtml(m.title)}</h2>
            <div class="tc-card__actions">
              <button type="button" class="btn btn-primary" data-aud="${m.id}">Buka</button>
            </div>
          </article>`).join("")}
      </div>`;
    $("#tcAudBackHub").onclick = () => renderHub();
    root.onclick = (e) => {
      const b = e.target.closest("[data-aud]");
      if (!b) return;
      openAudModule(b.getAttribute("data-aud"));
    };
    showScreen("aud-hub");
  }

  function audShell(title, html) {
    const panel = $("#tcAudWork");
    panel.innerHTML = `
      <div class="tc-nav-row">
        <button type="button" class="btn btn-ghost" id="tcAudWorkBack">← Auditor Lab</button>
        <span class="tc-step">${title}</span>
      </div>
      ${html}`;
    $("#tcAudWorkBack").onclick = () => openAudHub();
    showScreen("aud-work");
  }

  function openAudModule(id) {
    const map = {
      fundamentals: renderAudFundamentals,
      transaction: renderAudTransaction,
      compliance: renderAudCompliance,
      fiscal: renderAudFiscal,
      correction: renderAudCorrection,
      calculation: renderAudCalc,
      spt: renderAudSpt,
      "cross-check": renderAudCrossCheck,
      "find-error": renderAudTransaction,
      risk: renderAudRisk,
      final: renderAudFinal
    };
    (map[id] || openAudHub)();
  }

  function renderAudFundamentals() {
    const items = window.AUD_FUNDAMENTALS || [];
    audShell(
      "Auditor Fundamentals",
      `<h2>📚 Auditor Fundamentals</h2>
      ${items.map((it) => `
        <div class="tc-learn-block">
          <h3>${escapeHtml(it.heading)}</h3>
          <p>${escapeHtml(it.body)}</p>
          <div class="tc-scenario" style="margin-top:8px">${escapeHtml(it.example)}</div>
        </div>`).join("")}
      <div class="tc-actions">
        <button type="button" class="btn btn-primary" id="tcAudGoTx">Lanjut Transaction Review</button>
      </div>`
    );
    $("#tcAudGoTx").onclick = () => renderAudTransaction();
  }

  function renderAudTransaction() {
    const c = window.AUD_TX_CASE;
    if (!c) return;
    const selected = new Set();
    audShell(
      "Transaction / Find the Error",
      `
      <h2>🧾 ${escapeHtml(c.company.name)}</h2>
      <div class="tc-meta">
        <span class="tc-tag">${escapeHtml(c.level)}</span>
        <span class="tc-tag">${escapeHtml(c.company.period)}</span>
        <span class="tc-tag">${escapeHtml(c.id)}</span>
      </div>
      <p style="font-size:0.92rem;color:var(--tc-muted)">${escapeHtml(c.brief)}</p>
      <p class="tc-q">Klik baris yang Anda anggap bermasalah (boleh lebih dari satu), lalu submit review.</p>
      <div class="cf-table-wrap">
        <table class="cf-table aud-tx-table" id="audTxTable">
          <thead>
            <tr>
              <th></th><th>Tanggal</th><th>Transaksi</th><th>Nilai</th><th>Catatan pajak</th><th>Dokumen</th>
            </tr>
          </thead>
          <tbody>
            ${c.transactions.map((t) => `
              <tr data-tx="${t.id}" class="aud-tx-row">
                <td><input type="checkbox" data-tx-check="${t.id}" /></td>
                <td>${escapeHtml(t.date)}</td>
                <td>${escapeHtml(t.desc)}</td>
                <td class="cf-num">${formatRp(t.amount)}</td>
                <td>${escapeHtml(t.taxNote)}</td>
                <td>${escapeHtml(t.document)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div id="audFindingsBox"></div>
      <div class="tc-actions">
        <button type="button" class="btn btn-primary" id="audSubmitTx">Selesai Review — Tampilkan Temuan</button>
      </div>`
    );

    $$(".aud-tx-row").forEach((row) => {
      row.onclick = (e) => {
        if (e.target.tagName === "INPUT") return;
        const id = row.getAttribute("data-tx");
        const cb = row.querySelector("input");
        cb.checked = !cb.checked;
        row.classList.toggle("is-flagged", cb.checked);
      };
    });
    $$("[data-tx-check]").forEach((cb) => {
      cb.onchange = () => {
        const row = cb.closest("tr");
        if (row) row.classList.toggle("is-flagged", cb.checked);
      };
    });

    $("#audSubmitTx").onclick = () => {
      const chosen = $$("[data-tx-check]:checked").map((x) => x.getAttribute("data-tx-check"));
      const expected = c.transactions.filter((t) => t.issue).map((t) => t.id);
      const truePos = chosen.filter((id) => expected.indexOf(id) !== -1);
      const falsePos = chosen.filter((id) => expected.indexOf(id) === -1);
      const missed = expected.filter((id) => chosen.indexOf(id) === -1);
      const accuracy = expected.length ? Math.round((truePos.length / expected.length) * 100) : 0;
      const penalty = Math.min(40, falsePos.length * 10);
      const score = Math.max(0, accuracy - penalty);

      const findingsHtml = c.transactions
        .filter((t) => t.issue)
        .map((t) => {
          const found = truePos.indexOf(t.id) !== -1;
          return `
          <div class="aud-finding ${found ? "found" : "missed"}">
            <div class="aud-finding__title">${found ? "✓ Ditemukan" : "✗ Terlewat"} — ${escapeHtml(t.desc)}</div>
            <div><strong>Issue:</strong> ${escapeHtml(t.issueType)}</div>
            <div><strong>Category:</strong> ${escapeHtml(t.category)}</div>
            <div><strong>Impact:</strong> ${escapeHtml(t.impact)}</div>
            <div><strong>Risk:</strong> ${escapeHtml(t.risk)}</div>
            <div><strong>Recommendation:</strong> ${escapeHtml(t.recommendation)}</div>
          </div>`;
        })
        .join("");

      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (score >= 60 ? "ok" : "bad");
      fb.innerHTML = `
        <strong>Tax Review Score (findings): ${score}/100</strong><br>
        You found: ${truePos.length}/${expected.length}
        · False flags: ${falsePos.length}
        · Missed: ${missed.length}`;
      $("#audFindingsBox").innerHTML = `
        <h3 style="margin:14px 0 8px;font-size:1rem">What you found / missed</h3>
        ${findingsHtml}
        <div class="tc-improve" style="margin-top:12px">
          <strong>Improve:</strong> Latihan ulang Transaction Review & Fiscal Correction bila banyak yang terlewat.
        </div>`;
      $("#audSubmitTx").disabled = true;
      $$("[data-tx-check]").forEach((cb) => (cb.disabled = true));

      const progress = loadProgress();
      saveProgress({
        byTrack: progress.byTrack || {},
        audTx: { score, found: truePos.length, expected: expected.length, at: Date.now() }
      });
    };
  }

  function renderAudCompliance() {
    const c = window.AUD_COMPLIANCE;
    const statuses = ["Compliant", "Potential Issue", "Non-Compliant", "Not Applicable"];
    audShell(
      "Compliance Review",
      `
      <h2>📋 Tax Compliance Review</h2>
      <p style="font-size:0.9rem;color:var(--tc-muted)">${escapeHtml(c.period)}</p>
      <div class="cf-table-wrap">
        <table class="cf-table">
          <thead>
            <tr><th>Pajak</th><th>Due / Status data</th><th>Penilaian Anda</th></tr>
          </thead>
          <tbody>
            ${c.items.map((it) => `
              <tr>
                <td>
                  <strong>${escapeHtml(it.tax)}</strong>
                  <div class="cf-note">Bayar: ${escapeHtml(it.payment)} · Lapor: ${escapeHtml(it.reporting)}</div>
                  <div class="cf-note">Dok: ${escapeHtml(it.docs)}</div>
                </td>
                <td>${escapeHtml(it.due)}</td>
                <td>
                  <select class="cf-select aud-comp-sel" data-id="${it.id}">
                    <option value="">— pilih —</option>
                    ${statuses.map((s) => `<option value="${s}">${s}</option>`).join("")}
                  </select>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions">
        <button type="button" class="btn btn-primary" id="audCompSubmit">Cek Penilaian</button>
      </div>`
    );
    $("#audCompSubmit").onclick = () => {
      let ok = 0;
      const details = [];
      c.items.forEach((it) => {
        const sel = $(`.aud-comp-sel[data-id="${it.id}"]`);
        const v = sel ? sel.value : "";
        const match = v === it.correctStatus;
        if (match) ok += 1;
        details.push(`<li><strong>${escapeHtml(it.tax)}</strong>: Anda=${escapeHtml(v || "—")} · Kunci=${escapeHtml(it.correctStatus)} — ${escapeHtml(it.reason)}</li>`);
      });
      const score = Math.round((ok / c.items.length) * 100);
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (score >= 70 ? "ok" : "bad");
      fb.innerHTML = `<strong>Score ${score}/100</strong> (${ok}/${c.items.length})<ul style="margin:8px 0 0;padding-left:18px">${details.join("")}</ul>`;
    };
  }

  function renderAudFiscal() {
    const c = window.AUD_FISCAL_REVIEW;
    audShell(
      "Commercial vs Fiscal Review",
      `
      <h2>⚖️ Review angka staf</h2>
      <div class="tc-scenario">
        <div>Laba Komersial: <strong>${formatRp(c.labaKomersial)}</strong></div>
        <div>Koreksi + (staf): <strong>${formatRp(c.staff.positive)}</strong></div>
        <div>Koreksi − (staf): <strong>${formatRp(c.staff.negative)}</strong></div>
        <div>Laba Fiskal klaim: <strong>${formatRp(c.staff.labaFiskal)}</strong></div>
      </div>
      <p class="tc-q">Apakah perhitungan laba fiskal staf dapat diterima?</p>
      <div class="cf-classify-btns" id="audFisBtns">
        <button type="button" class="btn btn-outline" data-v="no">Tidak — hitung ulang</button>
        <button type="button" class="btn btn-outline" data-v="yes">Ya — diterima</button>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-linkbox" style="margin-top:12px">
        Latihan rekon lebih dalam ada di modul Commercial–Fiscal.
        <div style="margin-top:8px"><button type="button" class="btn btn-outline" id="audToCf">Buka Commercial–Fiscal</button></div>
      </div>`
    );
    let locked = false;
    $("#audFisBtns").onclick = (e) => {
      const b = e.target.closest("[data-v]");
      if (!b || locked) return;
      locked = true;
      const ok = b.getAttribute("data-v") === "no";
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (ok ? "ok" : "bad");
      let engineLine = "";
      if (window.CrossCheckEngine) {
        const fr = window.CrossCheckEngine.checkFiscalFormula({
          commercial: c.labaKomersial,
          positive: c.staff.positive,
          negative: c.staff.negative,
          claimedFiscal: c.staff.labaFiskal
        });
        engineLine = `<div class="cc-block" style="margin-top:8px">Engine: computed ${formatRp(fr.computedFiscal)} · claimed ${formatRp(fr.claimedFiscal)} · ${fr.ok ? "OK" : "FINDING"}</div>`;
      }
      fb.innerHTML = `
        ${ok ? "<strong>Benar — angka staf tidak konsisten.</strong>" : "<strong>Perlu hitung ulang.</strong>"}
        <br>Company: ${formatRp(c.staff.labaFiskal)}
        <br>Correct: ${formatRp(c.truth.labaFiskal)}
        <br>Difference: ${formatRp(Math.abs(c.staff.labaFiskal - c.truth.labaFiskal))}
        <br>${c.notes.map((n) => escapeHtml(n)).join("<br>")}
        ${engineLine}`;
    };
    $("#audToCf").onclick = () => openCfHub();
  }

  function renderAudCorrection() {
    const c = window.AUD_CORRECTION_REVIEW;
    audShell(
      "Fiscal Correction Review",
      `
      <h2>🔧 Review Fiscal Adjustment</h2>
      <p style="font-size:0.9rem;color:var(--tc-muted)">Periksa koreksi staf. Pilih jenis yang menurut Anda benar (konteks dataset edukasi).</p>
      <div class="cf-table-wrap">
        <table class="cf-table">
          <thead><tr><th>Akun</th><th>Nominal</th><th>Koreksi staf</th><th>Review Anda</th></tr></thead>
          <tbody>
            ${c.accounts.map((a) => `
              <tr>
                <td>${escapeHtml(a.account)}</td>
                <td class="cf-num">${formatRp(a.amount)}</td>
                <td>${escapeHtml(a.staffType)}</td>
                <td>
                  <select class="cf-select aud-cor-sel" data-id="${a.id}">
                    <option value="none">none</option>
                    <option value="positive">positive</option>
                    <option value="negative">negative</option>
                  </select>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions"><button type="button" class="btn btn-primary" id="audCorSubmit">Cek Review</button></div>`
    );
    // preselect staff answers as starting point? leave none default for reviewer independence
    $("#audCorSubmit").onclick = () => {
      let ok = 0;
      const lines = [];
      c.accounts.forEach((a) => {
        const v = ($(`.aud-cor-sel[data-id="${a.id}"]`) || {}).value;
        const match = v === a.correctType;
        if (match) ok += 1;
        lines.push(`<li>${escapeHtml(a.account)}: Anda=${v} · Kunci=${a.correctType} — ${escapeHtml(a.reason)}${a.staffType !== a.correctType ? " <em>(staf berbeda)</em>" : ""}</li>`);
      });
      const score = Math.round((ok / c.accounts.length) * 100);
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (score >= 70 ? "ok" : "bad");
      fb.innerHTML = `<strong>Score ${score}/100</strong><ul style="margin:8px 0 0;padding-left:18px">${lines.join("")}</ul>`;
    };
  }

  function renderAudCalc() {
    const c = window.AUD_CALC;
    audShell(
      "Tax Calculation Review",
      `
      <h2>🔢 Recalculate</h2>
      <div class="tc-scenario">
        <div><strong>Company calculation</strong></div>
        <div>Taxable income: ${formatRp(c.taxableIncomeStaff)}</div>
        <div>Rate (klaim): ${(c.rateStaff * 100).toFixed(0)}%</div>
        <div>Tax: ${formatRp(c.taxStaff)}</div>
      </div>
      <p class="tc-q">Hitung ulang PPh (ilustrasi edukasi: PKP × tarif). Masukkan tax yang Anda hitung (tanpa pemisah ribuan):</p>
      <input type="number" id="audTaxInput" class="cf-select" style="max-width:100%;width:100%;padding:12px;font-size:16px" placeholder="Contoh: 107800000" />
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-actions"><button type="button" class="btn btn-primary" id="audCalcSubmit">Bandingkan</button></div>
      <p class="cf-note">${escapeHtml(c.explanation)}</p>`
    );
    $("#audCalcSubmit").onclick = () => {
      const raw = Number(($('#audTaxInput') || {}).value);
      const correct = c.taxCorrect;
      const diff = Math.abs((raw || 0) - correct);
      const companyDiff = Math.abs(c.taxStaff - correct);
      const ok = diff < 1;
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (ok ? "ok" : "bad");
      fb.innerHTML = `
        <div><strong>Your calculation:</strong> ${formatRp(raw || 0)}</div>
        <div><strong>Correct calculation:</strong> ${formatRp(correct)}</div>
        <div><strong>Difference (you):</strong> ${formatRp(diff)}</div>
        <div><strong>Company vs correct:</strong> ${formatRp(companyDiff)}</div>
        <div style="margin-top:6px">${escapeHtml(c.explanation)}</div>`;
    };
  }

  function renderAudSpt() {
    const c = window.AUD_SPT_REVIEW;
    const engine = window.CrossCheckEngine;
    let autoHtml = "";
    if (engine && c) {
      const auto = engine.checkWorkingVsSpt([
        { field: "Laba Fiskal", working: c.fiscalProfitWorking, spt: c.fiscalProfitOnSpt, code: "SPT_FISCAL_PROFIT" },
        { field: "PPh Terutang", working: c.taxPayableWorking, spt: c.taxPayableOnSpt, code: "SPT_TAX_PAYABLE" }
      ]);
      autoHtml = `<div id="audSptAuto" class="cc-panel">${engine.renderFindingsHtml({ findings: auto.findings, summary: { total: auto.findings.length, high: auto.findings.filter((f) => f.severity === "high").length, medium: auto.findings.filter((f) => f.severity === "medium").length, low: auto.findings.filter((f) => f.severity === "low").length, score: Math.max(0, 100 - auto.findings.length * 25) }, parts: {} }, escapeHtml)}</div>`;
    }
    audShell(
      "SPT Review",
      `
      <h2>📄 SPT Cross-Check (edukasi)</h2>
      <p style="font-size:0.9rem;color:var(--tc-muted)">Jangan membuat SPT baru — bandingkan working paper vs angka yang “terisi di SPT”. Engine otomatis menandai inkonsistensi numerik.</p>
      <div class="cf-two">
        <div class="cf-box">
          <h3>Working paper</h3>
          <p>Laba fiskal: <strong>${formatRp(c.fiscalProfitWorking)}</strong></p>
          <p>PPh terutang: <strong>${formatRp(c.taxPayableWorking)}</strong></p>
        </div>
        <div class="cf-box">
          <h3>Angka di SPT (klaim)</h3>
          <p>Laba fiskal: <strong>${formatRp(c.fiscalProfitOnSpt)}</strong></p>
          <p>PPh terutang: <strong>${formatRp(c.taxPayableOnSpt)}</strong></p>
        </div>
      </div>
      ${autoHtml}
      <p class="tc-q">Apakah ada potential inconsistency? (konfirmasi pemahaman Anda)</p>
      <div class="cf-classify-btns" id="audSptBtns">
        <button type="button" class="btn btn-outline" data-v="yes">Ya — ada inkonsistensi</button>
        <button type="button" class="btn btn-outline" data-v="no">Tidak — sudah selaras</button>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>
      <div class="tc-linkbox" style="margin-top:12px">
        Praktik formulir: <a href="../formulir_spt/1771_Lampiran_I.html">1771 Lampiran I</a> ·
        <a href="../formulir_spt/1771_induk.html">1771 Induk</a>
      </div>`
    );
    let locked = false;
    $("#audSptBtns").onclick = (e) => {
      const b = e.target.closest("[data-v]");
      if (!b || locked) return;
      locked = true;
      const hasIssue = c.fiscalProfitOnSpt !== c.fiscalProfitWorking || c.taxPayableOnSpt !== c.taxPayableWorking;
      const ok = (b.getAttribute("data-v") === "yes") === hasIssue;
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show " + (ok ? "ok" : "bad");
      fb.innerHTML = `
        ${ok ? "<strong>Penilaian Anda sesuai hasil engine.</strong>" : "<strong>Bandingkan lagi dengan hasil Cross-Check Engine di atas.</strong>"}
        <br>${escapeHtml(c.notes || "")}`;
    };
  }

  function renderAudCrossCheck() {
    const engine = window.CrossCheckEngine;
    if (!engine) {
      audShell("Cross-Check Engine", "<p>Engine belum dimuat. Pastikan js/cross-check-engine.js ter-load.</p>");
      return;
    }
    const result = engine.runFromGlobals();
    const txFindings = (result.parts && result.parts.transactionFindings) || [];
    audShell(
      "Cross-Check Engine",
      `
      <h2>🔗 Automatic Cross-Check</h2>
      <p style="font-size:0.9rem;color:var(--tc-muted);margin:0 0 12px">
        Engine membandingkan rumus laba fiskal, hitungan PPh, dan pasangan working paper vs SPT dari dataset Auditor Lab.
        Sederhana, lokal, tanpa backend.
      </p>
      <div class="cc-panel">${engine.renderFindingsHtml(result, escapeHtml)}</div>
      ${
        txFindings.length
          ? `<div class="cc-block" style="margin-top:12px">
              <div class="cc-block__title">Expected transaction issues (kunci dataset)</div>
              <p class="cf-note">Dipakai untuk kunci Transaction Review — bukan pengganti review manual.</p>
              <ul style="margin:6px 0 0;padding-left:18px;font-size:0.88rem">
                ${txFindings.map((f) => `<li><strong>${escapeHtml(f.field)}</strong> — ${escapeHtml(f.title)} (${escapeHtml(f.severity)})</li>`).join("")}
              </ul>
            </div>`
          : ""
      }
      <div class="tc-actions" style="margin-top:14px">
        <button type="button" class="btn btn-outline" id="ccToSpt">Buka SPT Review</button>
        <button type="button" class="btn btn-outline" id="ccToFis">Buka Fiscal Review</button>
        <button type="button" class="btn btn-primary" id="ccRerun">Jalankan ulang</button>
      </div>`
    );
    const progress = loadProgress();
    saveProgress({
      byTrack: progress.byTrack || {},
      audCrossCheck: { score: result.summary.score, findings: result.summary.total, at: Date.now() }
    });
    $("#ccToSpt").onclick = () => renderAudSpt();
    $("#ccToFis").onclick = () => renderAudFiscal();
    $("#ccRerun").onclick = () => renderAudCrossCheck();
  }

  function renderAudRisk() {
    const list = window.AUD_RISK_DRILL || [];
    let idx = 0;
    const answers = [];
    function draw() {
      if (idx >= list.length) {
        const ok = answers.filter((a) => a).length;
        audShell(
          "Risk result",
          `<div class="tc-score"><div class="big">${Math.round((ok / list.length) * 100)}/100</div>
           <div class="sub">Risk assessment drill</div></div>
           <div class="tc-actions"><button type="button" class="btn btn-primary" id="audRiskBack">Kembali</button></div>`
        );
        $("#audRiskBack").onclick = () => openAudHub();
        return;
      }
      const item = list[idx];
      audShell(
        `Risk · ${idx + 1}/${list.length}`,
        `
        <h2>⚠️ ${escapeHtml(item.scenario)}</h2>
        <p class="tc-q">Risk level?</p>
        <div class="cf-classify-btns" id="audRiskBtns">
          <button type="button" class="btn btn-outline" data-v="Low">LOW</button>
          <button type="button" class="btn btn-outline" data-v="Medium">MEDIUM</button>
          <button type="button" class="btn btn-outline" data-v="High">HIGH</button>
        </div>
        <div class="tc-feedback" id="tcFeedback"></div>
        <div class="tc-actions"><button type="button" class="btn btn-outline" id="audRiskNext" disabled>Lanjut</button></div>`
      );
      let locked = false;
      $("#audRiskBtns").onclick = (e) => {
        const b = e.target.closest("[data-v]");
        if (!b || locked) return;
        locked = true;
        const ok = b.getAttribute("data-v") === item.answer;
        answers.push(ok);
        const fb = $("#tcFeedback");
        fb.className = "tc-feedback show " + (ok ? "ok" : "bad");
        fb.innerHTML = (ok ? "<strong>Sesuai.</strong> " : `<strong>Kunci: ${item.answer}.</strong> `) + escapeHtml(item.why);
        $("#audRiskNext").disabled = false;
      };
      $("#audRiskNext").onclick = () => {
        idx += 1;
        draw();
      };
    }
    draw();
  }

  function renderAudFinal() {
    const f = window.AUD_FINAL;
    const c = window.AUD_TX_CASE;
    audShell(
      "Final Review",
      `
      <h2>🏁 ${escapeHtml(f.title)}</h2>
      <p style="font-size:0.92rem;color:var(--tc-muted)">${escapeHtml(f.briefing)}</p>
      <ol style="padding-left:18px;font-size:0.9rem;color:var(--tc-muted)">
        ${f.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ol>
      <div class="tc-actions" style="flex-direction:column">
        <button type="button" class="btn btn-primary" id="audFinalTx">Step 1–2: Transaction Review</button>
        <button type="button" class="btn btn-outline" id="audFinalFis">Step 3–4: Fiscal + Calculation</button>
        <button type="button" class="btn btn-outline" id="audFinalSpt">Step 5: SPT Review</button>
        <button type="button" class="btn btn-outline" id="audFinalScore">Step 6–8: Ringkas skor lab</button>
      </div>
      <div class="tc-feedback" id="tcFeedback"></div>`
    );
    $("#audFinalTx").onclick = () => renderAudTransaction();
    $("#audFinalFis").onclick = () => renderAudFiscal();
    $("#audFinalSpt").onclick = () => renderAudSpt();
    $("#audFinalScore").onclick = () => {
      const p = loadProgress();
      const tx = p.audTx || {};
      const cc = window.CrossCheckEngine ? window.CrossCheckEngine.runFromGlobals() : null;
      const fb = $("#tcFeedback");
      fb.className = "tc-feedback show ok";
      const ccScore = cc && cc.summary ? cc.summary.score : "—";
      const ccFind = cc && cc.summary ? cc.summary.total : "—";
      fb.innerHTML = `
        <strong>Final Tax Review Score (komposit sederhana)</strong><br>
        Finding accuracy (Transaction Review terakhir): ${tx.score != null ? tx.score : "—"}/100<br>
        Findings found: ${tx.found != null ? tx.found + " / " + tx.expected : "—"}<br>
        Cross-Check Engine score: ${ccScore}/100 · auto findings: ${ccFind}<br>
        <span class="cf-note">Bobot edukasi: Findings 40%, Calculation 20%, Fiscal 15%, SPT 15%, Risk 10%. Engine menambah deteksi inkonsistensi numerik otomatis.</span>
        ${cc ? `<div class="cc-panel" style="margin-top:10px">${window.CrossCheckEngine.renderFindingsHtml(cc, escapeHtml)}</div>` : ""}
        <div style="margin-top:8px"><a href="../formulir_spt/1771_induk.html">Lanjut praktik SPT 1771 →</a></div>`;
    };
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

  function init() {
    if (!tracks().length || !(window.TAX_CAREER_QUESTIONS || []).length) {
      const hub = $("#tcHubGrid");
      if (hub) hub.innerHTML = "<p>Data modul gagal dimuat.</p>";
      return;
    }
    renderHub();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
