/**
 * app-cf.js — modul Commercial-Fiscal (rekonsiliasi, klasifikasi, koreksi)
 * (dipecah dari app.js; perilaku identik)
 * Classic script: dimuat BERURUTAN sesudah app.js (lihat HTML); berbagi fungsi lewat window.__TaxCareerApp.
 */
(function () {
  const TC = window.__TaxCareerApp;
  const { $, escapeHtml, renderHub, showScreen, state, formatRp, $$, loadProgress, saveProgress } = TC;
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

  Object.assign(TC, { openCfHub });
})();
