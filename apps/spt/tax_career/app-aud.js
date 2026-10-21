/**
 * app-aud.js — modul Auditor Pajak + bootstrap (init)
 * (dipecah dari app.js; perilaku identik)
 * Classic script: dimuat BERURUTAN sesudah app.js (lihat HTML); berbagi fungsi lewat window.__TaxCareerApp.
 */
(function () {
  const TC = window.__TaxCareerApp;
  const { $, escapeHtml, renderHub, showScreen, formatRp, $$, loadProgress, saveProgress, openCfHub, tracks } = TC;
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

  function init() {
    if (!tracks().length || !(window.TAX_CAREER_QUESTIONS || []).length) {
      const hub = $("#tcHubGrid");
      if (hub) hub.innerHTML = "<p>Data modul gagal dimuat.</p>";
      return;
    }
    renderHub();
  }

  Object.assign(TC, { openAudHub });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
