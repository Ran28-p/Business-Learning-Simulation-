/* portal-analytics.js — panel "Analitik belajar" + unduh "Rekap untuk pengajar" di dashboard portal.
   Logika: js/shared/learning-analytics.js (murni, diuji). File ini hanya membaca data perangkat dan merender.
   Semua teks dirender dengan textContent. Tidak ada jaringan: rekap dibuat di browser dan diunduh sebagai berkas. */
(function () {
  "use strict";
  var LA = window.LearningAnalytics, PP = window.PortalProgress;
  var panel = document.getElementById("analyticsPanel");
  if (!panel || !LA || !PP) return;
  var $ = function (id) { return document.getElementById(id); };
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var read = function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } };

  function session() { try { var s = JSON.parse(read("unified_portal_session") || "null"); return s && !s.isGuest ? s : null; } catch (_) { return null; } }
  function renderRec(r) {
    var li = h("li", "rec-item ds-mod-" + r.moduleId);
    var top = h("div", "rec-item__top");
    top.appendChild(h("span", "rec-chip", r.moduleLabel));
    if (r.tentative) top.appendChild(h("span", "rec-tag", "Data masih sedikit"));
    li.appendChild(top);
    li.appendChild(h("h3", "", r.label));
    li.appendChild(h("p", "rec-item__detail", r.detail));
    li.appendChild(h("p", "rec-item__advice", r.advice));
    var a = h("a", "rec-item__go", "Buka " + r.moduleLabel + " →"); a.href = r.href; li.appendChild(a);
    return li;
  }

  function renderModules(analysis) {
    var box = $("analyticsModules"); box.textContent = "";
    var any = false;
    LA.MODULE_IDS.forEach(function (id) {
      var m = analysis.modules[id], card = h("div", "rec-mod ds-mod-" + id);
      card.appendChild(h("h4", "", m.label));
      if (!m.weak.length && !m.strong.length) { card.appendChild(h("p", "rec-mod__none", "Belum ada data yang cukup untuk dinilai.")); }
      else {
        any = true;
        if (m.weak.length) { card.appendChild(h("p", "rec-mod__sub", "Perlu diulang")); var u = h("ul"); m.weak.slice(0, 6).forEach(function (w) { u.appendChild(h("li", "", w.label + " — " + w.detail + (w.tentative ? " (data masih sedikit)" : ""))); }); card.appendChild(u); }
        if (m.strong.length) { card.appendChild(h("p", "rec-mod__sub", "Sudah kuat")); var u2 = h("ul"); m.strong.forEach(function (w) { u2.appendChild(h("li", "", w.label + " — " + w.detail)); }); card.appendChild(u2); }
      }
      box.appendChild(card);
    });
    $("recMore").hidden = !any;
  }

  var lastAnalysis = null;
  function render() {
    var analysis = LA.analyze(read); lastAnalysis = analysis;
    $("analyticsEmpty").hidden = analysis.hasData;
    var list = $("recList"); list.textContent = "";
    analysis.recommendations.forEach(function (r) { list.appendChild(renderRec(r)); });
    if (analysis.hasData && !analysis.recommendations.length) list.appendChild(h("li", "analytics-empty", "Tidak ada topik yang perlu diulang saat ini. Lanjutkan berlatih."));
    renderModules(analysis);
    updateRecap();
  }

  /* ───────── rekap untuk pengajar ───────── */
  function buildRecap() {
    var sum = PP.summarize(localStorage);
    var em = $("recapEmail");
    return LA.buildRecap({ summary: sum, analysis: lastAnalysis || LA.analyze(read), hub: null, name: $("recapName").value,
      email: session() && session().email, includeEmail: em.checked && !em.disabled, now: new Date() });
  }
  function updateRecap() {
    var s = session(), em = $("recapEmail");
    em.disabled = !s || !s.email;
    if (em.disabled) em.checked = false;
    $("recapEmailShow").textContent = s && s.email ? s.email : "masuk dulu untuk memilih";
    var name = $("recapName");
    if (!name.value && !name.dataset.touched && s && s.displayName) name.value = s.displayName;
    $("recapPreview").textContent = JSON.stringify(buildRecap(), null, 2);
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "peserta"; }

  $("recapName").addEventListener("input", function () { this.dataset.touched = "1"; $("recapError").hidden = true; updateRecap(); });
  $("recapEmail").addEventListener("change", updateRecap);
  $("btnRecap").addEventListener("click", function () {
    var name = $("recapName").value.trim(), err = $("recapError");
    if (!name) { err.textContent = "Isi nama Anda terlebih dahulu agar pengajar dapat mengenali rekap ini."; err.hidden = false; $("recapName").focus(); return; }
    err.hidden = true;
    var rec = buildRecap();
    var blob = new Blob([JSON.stringify(rec, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "rekap-belajar-" + slug(name) + "-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  // Data bisa berubah: kembali ke tab, data modul berubah di tab lain, atau data cloud baru diterapkan.
  window.addEventListener("portal-auth-change", function () { var n = $("recapName"); if (!n.dataset.touched) n.value = ""; updateRecap(); });   // login/logout selesai → nama & email ikut
  window.addEventListener("pageshow", render);
  window.addEventListener("focus", render);
  window.addEventListener("storage", render);
  window.addEventListener("portal-cloudsync", function (e) { if (e.detail && e.detail.pulled && e.detail.pulled.length) render(); });
  render();
})();
