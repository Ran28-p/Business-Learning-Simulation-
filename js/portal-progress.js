/**
 * Portal UI: dashboard "Progres Saya" + ekspor/impor progres + rekap PDF.
 * Logika datanya ada di js/shared/progress-aggregator.js (diuji di tests/test-portal-progress.mjs);
 * file ini hanya urusan tampilan. Semua teks dari storage dipasang lewat textContent (bukan innerHTML).
 */
(function () {
  "use strict";
  const $ = (sel) => document.querySelector(sel);
  const PP = window.PortalProgress;
  const panel = $("#progressPanel");
  if (!PP || !panel) return;

  const MAX_FILE_BYTES = 6 * 1024 * 1024;
  const els = {
    totals: $("#progressTotals"), grid: $("#progressGrid"), status: $("#progressStatus"), sub: $("#progressSub"),
    btnPdf: $("#btnProgressPdf"), btnExport: $("#btnProgressExport"), btnImport: $("#btnProgressImport"), file: $("#progressFile"),
    modal: $("#importModal"), backdrop: $("#importBackdrop"), intro: $("#importIntro"), list: $("#importList"),
    modeBox: $("#importModeBox"), confirm: $("#btnImportConfirm"), cancel: $("#btnImportCancel")
  };

  let pending = null;      // hasil inspectImport yang menunggu konfirmasi
  let pendingRaw = null;   // isi berkas mentah untuk pending (dipakai ulang oleh applyImport)
  let lastFocus = null;

  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function fmtDate(ms) {
    if (!ms) return "—";
    try { return new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); } catch (_) { return "—"; }
  }
  function userName() {
    const u = window.PortalAuth && window.PortalAuth.user;
    if (!u || u.isGuest) return "";
    return u.displayName || u.email || "";
  }
  function stamp() { return new Date().toISOString().slice(0, 10); }

  function setStatus(type, message) {
    els.status.className = "progress-status" + (message ? " " + type : "");
    els.status.textContent = message || "";
  }
  function setDisabled(btn, disabled, reason) {
    btn.setAttribute("aria-disabled", disabled ? "true" : "false");
    btn.title = disabled ? reason : "";
  }

  /* ───────── render ───────── */
  function readSummary() {
    try { return PP.summarize(window.localStorage); } catch (_) { return null; }
  }

  function renderCard(m) {
    const card = h("div", "progress-card" + (m.started ? "" : " is-empty"));
    const top = h("div", "progress-card__top");
    top.appendChild(h("div", "progress-card__name", m.icon + " " + m.label));
    if (m.started) top.appendChild(h("span", "progress-card__level", m.levelLabel + " " + m.level));
    card.appendChild(top);
    if (!m.started) {
      const p = h("p", "progress-card__empty", "Belum dimulai. ");
      const a = h("a", "", "Mulai belajar →");
      a.href = m.href;
      a.addEventListener("click", () => { try { sessionStorage.setItem("unified_last_module", m.href); } catch (_) { /* abaikan */ } });
      p.appendChild(a);
      card.appendChild(p);
      return card;
    }
    const xp = h("div", "progress-card__xp", String(m.xp));
    xp.appendChild(h("small", "", "XP"));
    card.appendChild(xp);
    const stats = h("div", "progress-card__stats");
    const stat = (label, value) => { const s = h("span"); s.appendChild(document.createTextNode(label + " ")); s.appendChild(h("b", "", value)); stats.appendChild(s); };
    stat("Aktivitas", String(m.activities));
    stat(m.scoreLabel, m.scorePct === null ? "—" : m.scorePct + "%");
    stat("Terakhir", fmtDate(m.lastActive));
    card.appendChild(stats);
    if (m.highlights.length) {
      const ul = h("ul");
      m.highlights.forEach((t) => ul.appendChild(h("li", "", t)));
      card.appendChild(ul);
    }
    return card;
  }

  /* ───────── dashboard: status kartu, aktivitas terbaru, pencapaian ─────────
     Semua dari PP.summarize(); tidak ada angka karangan. Modul yang belum dimulai
     ditampilkan apa adanya ("Belum dimulai"). */
  // Banner Game Hub: level, XP gabungan, dan misi siap klaim — dari mesin yang sama dengan halaman Game Hub.
  // Hanya MEMBACA (tidak menyimpan state); angka nyata, bukan placeholder.
  function renderGameHubBanner(sum) {
    const el = $("#ghBannerStats");
    if (!el || !window.GameHubEngine || !sum) return;
    try {
      const GH = window.GameHubEngine;
      let state = null;
      try { state = JSON.parse(localStorage.getItem("gamehub_state_v1") || "null"); } catch (_) { /* abaikan */ }
      const v = GH.evaluate(state, sum, new Date()).view;
      const ready = v.missions.filter(function (m) { return m.done && !m.claimed; }).length + (v.weekly.done && !v.weekly.claimed ? 1 : 0);
      el.textContent = "Level " + v.player.level + " · " + v.totalXp.toLocaleString("id-ID") + " XP gabungan"
        + (v.streak > 0 ? " · streak " + v.streak + " hari" : "")
        + (ready > 0 ? " · " + ready + " misi siap diklaim" : "");
    } catch (_) { /* biarkan teks bawaan */ }
  }

  function renderDashboard(sum) {
    document.querySelectorAll("[data-progress-for]").forEach((el) => {
      const m = sum && sum.modules.find((x) => x.id === el.getAttribute("data-progress-for"));
      el.classList.toggle("is-started", !!(m && m.started));
      el.textContent = m && m.started ? m.levelLabel + " " + m.level + " · " + m.xp + " XP" : "Belum dimulai";
    });
    renderGameHubBanner(sum);
    const recent = $("#recentList");
    const ach = $("#achievementList");
    if (!recent || !ach) return;
    recent.textContent = "";
    ach.textContent = "";
    const empty = (ul, text) => ul.appendChild(h("li", "empty", text));
    const started = sum ? sum.modules.filter((m) => m.started) : [];
    if (!started.length) {
      empty(recent, "Belum ada aktivitas. Mulai dari salah satu modul di atas.");
      empty(ach, "Pencapaian akan muncul setelah Anda mengerjakan latihan.");
      return;
    }
    started.slice().sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)).forEach((m) => {
      const li = h("li");
      li.className = "ds-mod-" + m.id;
      li.appendChild(h("span", "dot"));
      const body = h("div", "body");
      body.appendChild(h("strong", "", m.label));
      body.appendChild(h("span", "", m.activities + " aktivitas · terakhir " + fmtDate(m.lastActive)));
      li.appendChild(body);
      recent.appendChild(li);
    });
    started.forEach((m) => {
      const li = h("li");
      li.className = "ds-mod-" + m.id;
      li.appendChild(h("span", "dot"));
      const body = h("div", "body");
      body.appendChild(h("strong", "", m.label + " — " + m.levelLabel + " " + m.level));
      body.appendChild(h("span", "", m.highlights.length ? m.highlights.slice(0, 3).join(" · ") : m.xp + " XP terkumpul"));
      li.appendChild(body);
      ach.appendChild(li);
    });
  }


  /* ───────── Sinkron cloud (UI) — logika di js/shared/cloud-sync*.js ───────── */
  function bindCloud() {
    const box = $("#cloudBox");
    if (!box) return;
    const st = $("#cloudStatus"), btn = $("#btnCloudSync"), choice = $("#cloudChoice"), list = $("#cloudChoiceList");
    const LABEL = { accounting: "Accounting", excel: "Excel", sqlpq: "SQL & Power Query", gamehub: "Game Hub" };
    function paint() {
      const c = window.CloudSync ? window.CloudSync.status() : { state: "off", message: "Sinkron cloud tidak tersedia." };
      box.setAttribute("data-state", c.state);
      st.textContent = c.message;
      btn.disabled = !window.CloudSync || c.state === "off" || c.state === "syncing";
      const need = c.state === "needs-choice" && Array.isArray(c.pending) && c.pending.length;
      choice.hidden = !need;
      list.textContent = "";
      if (need) c.pending.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = (LABEL[p.id] || p.id) + ": perangkat ini " + p.local.xp + " XP / " + p.local.act + " aktivitas · cloud " + p.remote.xp + " XP / " + p.remote.act + " aktivitas";
        list.appendChild(li);
      });
    }
    btn.addEventListener("click", () => { if (window.CloudSync) window.CloudSync.syncNow(); });
    [["cloudChoiceMerge", "merge"], ["cloudChoiceCloud", "cloud"], ["cloudChoiceLocal", "local"]].forEach(([id, ch]) => {
      $("#" + id).addEventListener("click", () => { if (window.CloudSync) window.CloudSync.resolveFirstLink(ch); });
    });
    window.addEventListener("portal-cloudsync", (e) => {
      paint();
      if (e.detail && e.detail.state === "ok" && e.detail.pulled && e.detail.pulled.length) render();   // data cloud baru → ringkasan ikut berubah
    });
    paint();
  }

  function render() {
    const sum = readSummary();
    renderDashboard(sum);
    els.totals.textContent = "";
    els.grid.textContent = "";
    if (!sum) {
      els.sub.textContent = "Penyimpanan browser tidak tersedia (mode privat atau diblokir), jadi progres tidak dapat ditampilkan.";
      setDisabled(els.btnExport, true, "Penyimpanan browser tidak tersedia");
      setDisabled(els.btnPdf, true, "Penyimpanan browser tidak tersedia");
      return;
    }
    const t = sum.totals;
    const item = (value, label) => { const d = h("div"); d.appendChild(h("strong", "", String(value))); d.appendChild(document.createTextNode(label)); els.totals.appendChild(d); };
    item(t.xp, "Total XP (semua modul)");
    item(t.startedModules + " / " + t.moduleCount, "Modul dimulai");
    item(t.activities, "Total aktivitas");
    sum.modules.forEach((m) => els.grid.appendChild(renderCard(m)));
    els.sub.textContent = t.startedModules
      ? "Ringkasan belajar dari semua modul di perangkat ini."
      : "Belum ada progres. Mulai dari salah satu modul di atas — ringkasannya akan muncul di sini.";
    const none = t.startedModules === 0;
    setDisabled(els.btnExport, none, "Belum ada progres untuk diekspor");
    setDisabled(els.btnPdf, none, "Belum ada progres untuk dibuat rekap");
  }

  /* ───────── ekspor ───────── */
  function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function doExport() {
    if (els.btnExport.getAttribute("aria-disabled") === "true") return;
    try {
      const payload = PP.buildExport(window.localStorage, { name: userName() });
      downloadText(JSON.stringify(payload, null, 2), "progres-portal-belajar-" + stamp() + ".json", "application/json");
      setStatus("ok", "Progres diekspor. Simpan file ini di tempat aman — isinya bisa dipulihkan lewat \"Impor Progres\".");
    } catch (e) {
      setStatus("err", "Gagal mengekspor progres: " + (e && e.message ? e.message : "kesalahan tidak diketahui"));
    }
  }

  /* ───────── rekap PDF ───────── */
  function doPdf() {
    if (els.btnPdf.getAttribute("aria-disabled") === "true") return;
    if (!window.PDFExport) { setStatus("err", "Modul PDF tidak termuat. Muat ulang halaman lalu coba lagi."); return; }
    const sum = readSummary();
    if (!sum) return;
    const original = els.btnPdf.textContent;
    els.btnPdf.textContent = "Membuat PDF…";
    els.btnPdf.disabled = true;
    setStatus("", "");
    const html = PP.buildRecapHtml(sum, { name: userName() });
    window.PDFExport.exportHTMLToPDF(html, { filename: "rekap-progres-belajar-" + stamp() + ".pdf" })
      .then(() => setStatus("ok", "Rekap PDF berhasil dibuat."))
      .catch((e) => setStatus("err", (e && e.message) || "Gagal membuat PDF."))
      .then(() => { els.btnPdf.textContent = original; els.btnPdf.disabled = false; });
  }

  /* ───────── impor ───────── */
  function trapTab(e) {
    if (e.key !== "Tab" || !els.modal.classList.contains("show")) return;
    const f = Array.from(els.modal.querySelectorAll("button, input, [href]")).filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function closeModal() {
    if (!els.modal.classList.contains("show")) return;
    els.modal.classList.remove("show");
    pending = null; pendingRaw = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openModal(insp, fileName, raw) {
    pending = insp; pendingRaw = raw;
    lastFocus = document.activeElement;
    const local = readSummary();
    const localById = {}; if (local) local.modules.forEach((m) => { localById[m.id] = m; });
    els.intro.textContent = "Berkas \"" + fileName + "\"" + (insp.exportedAt ? " (diekspor " + fmtDate(Date.parse(insp.exportedAt)) + ")" : "") + " berisi progres untuk " + insp.modules.length + " modul:";
    els.list.textContent = "";
    insp.modules.forEach((m) => {
      const loc = localById[m.id];
      const row = h("div", "import-item");
      row.appendChild(h("strong", "", m.icon + " " + m.label));
      row.appendChild(h("span", "", "Di berkas: " + m.xp + " XP, " + m.activities + " aktivitas  ·  Di perangkat ini: " + (loc && loc.started ? loc.xp + " XP, " + loc.activities + " aktivitas" : "belum ada")));
      els.list.appendChild(row);
    });
    const skipped = (insp.skippedModules || []).length;
    const ignored = (insp.rejectedKeys || []).length;
    if (skipped || ignored) {
      const parts = [];
      if (skipped) parts.push(skipped + " modul dilewati karena datanya rusak");
      if (ignored) parts.push(ignored + " item tidak dikenal/tidak valid diabaikan");
      els.list.appendChild(h("p", "import-skipped", parts.join("; ") + "."));
    }
    const merge = els.modeBox.querySelector('input[value="merge"]'); if (merge) merge.checked = true;
    els.modal.classList.add("show");
    window.setTimeout(() => els.confirm.focus(), 0);
  }

  function onFileChosen() {
    const file = els.file.files && els.file.files[0];
    els.file.value = ""; // supaya file yang sama bisa dipilih lagi
    if (!file) return;
    setStatus("", "");
    if (file.size > MAX_FILE_BYTES) { setStatus("err", "Berkas terlalu besar (maksimal 6 MB)."); return; }
    const reader = new FileReader();
    reader.onerror = () => setStatus("err", "Berkas tidak dapat dibaca.");
    reader.onload = () => {
      const raw = String(reader.result || "");
      const insp = PP.inspectImport(raw);
      if (!insp.ok) { setStatus("err", insp.error); return; }
      openModal(insp, file.name, raw);
    };
    reader.readAsText(file);
  }

  function doImport() {
    if (!pending) return;
    const modeEl = els.modeBox.querySelector('input[name="importMode"]:checked');
    const mode = modeEl ? modeEl.value : "merge";
    const raw = pendingRaw;
    closeModal();
    const res = PP.applyImport(window.localStorage, raw, { mode });
    if (!res.ok) { setStatus("err", res.error); return; }
    const imported = res.report.filter((r) => r.action === "imported").map((r) => r.label);
    const kept = res.report.filter((r) => r.action === "kept-local").map((r) => r.label);
    const parts = [];
    parts.push(imported.length ? "Dipulihkan: " + imported.join(", ") + "." : "Tidak ada modul yang diubah.");
    if (kept.length) parts.push("Dipertahankan (progres di perangkat ini lebih maju): " + kept.join(", ") + ".");
    if (imported.some((l) => /SPT/.test(l))) parts.push("Muat ulang tab SPT yang terbuka agar tampilannya ikut diperbarui.");
    setStatus("ok", parts.join(" "));
    render();
  }

  /* ───────── event ───────── */
  els.btnExport.addEventListener("click", doExport);
  els.btnPdf.addEventListener("click", doPdf);
  els.btnImport.addEventListener("click", () => { lastFocus = els.btnImport; els.file.click(); });
  els.file.addEventListener("change", onFileChosen);
  els.confirm.addEventListener("click", doImport);
  els.cancel.addEventListener("click", closeModal);
  els.backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); trapTab(e); });

  // Segarkan saat kembali dari modul (termasuk dari bfcache), saat tab difokuskan lagi, atau saat tab lain mengubah storage.
  bindCloud();
  window.addEventListener("pageshow", render);
  window.addEventListener("storage", render);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

  render();
})();
