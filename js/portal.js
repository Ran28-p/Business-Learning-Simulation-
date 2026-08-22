/**
 * Portal UI: login gate + module hub.
 */
(function () {
  const $ = (sel) => document.querySelector(sel);

  const screens = {
    boot: $("#screen-boot"),
    auth: $("#screen-auth"),
    hub: $("#screen-hub")
  };

  // Friendly labels for the "resume last module" banner — keep in sync with
  // the data-module paths on the module cards below.
  const MODULE_LABELS = {
    "./apps/spt/index.html": "Simulator SPT Pajak",
    "./apps/accounting/index.html": "Simulator Akuntansi",
    "./apps/excel/index.html": "Excel Formula Practice Generator",
    "./apps/sql-pq/index.html": "SQL & Power Query Simulator"
  };

  function showScreen(name) {
    Object.keys(screens).forEach((k) => {
      screens[k].classList.toggle("active", k === name);
    });
  }

  function setFeedback(el, type, message) {
    if (!el) return;
    el.className = "feedback show " + type;
    el.textContent = message;
  }

  function clearFeedback(el) {
    if (!el) return;
    el.className = "feedback";
    el.textContent = "";
  }

  function renderUser(user) {
    const nameEl = $("#hub-user-name");
    const emailEl = $("#hub-user-email");
    const avatarEl = $("#hub-user-avatar");
    if (!user) return;
    const label = user.displayName || user.email || "Pengguna";
    nameEl.textContent = label + (user.isGuest ? " (Tamu)" : "");
    emailEl.textContent = user.isGuest ? "Mode tanpa akun — data hanya di perangkat ini" : (user.email || "");
    avatarEl.textContent = PortalAuth.initials(label);
  }

  function openModule(path) {
    // Remember which module was opened (optional analytics / resume)
    try {
      sessionStorage.setItem("unified_last_module", path);
      // Let the child app greet the user by name without needing its own
      // login — same-origin sessionStorage survives this in-tab navigation.
      const label = (PortalAuth.user && (PortalAuth.user.displayName || PortalAuth.user.email)) || "";
      if (label) sessionStorage.setItem("portal_user_name", label);
    } catch (_) { /* ignore */ }
    window.location.href = path;
  }

  function renderResumeBanner() {
    const banner = $("#resumeBanner");
    if (!banner) return;
    let lastPath = null;
    try { lastPath = sessionStorage.getItem("unified_last_module"); } catch (_) { /* ignore */ }
    if (!lastPath || !MODULE_LABELS[lastPath]) { banner.classList.remove("show"); return; }
    $("#resumeBannerLabel").textContent = MODULE_LABELS[lastPath];
    $("#resumeBannerBtn").onclick = () => openModule(lastPath);
    banner.classList.add("show");
  }

  function bindAuthForm() {
    const form = $("#auth-form");
    const feedback = $("#auth-feedback");
    const submitBtn = $("#auth-submit");
    const guestBtn = $("#btn-guest");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFeedback(feedback);
      const email = $("#auth-email").value;
      const name = $("#auth-name").value;
      submitBtn.disabled = true;
      submitBtn.textContent = "Mengirim…";
      try {
        const sentTo = await PortalAuth.sendLoginLink(email, name);
        setFeedback(
          feedback,
          "ok",
          "Link login sudah dikirim ke " + sentTo + ". Buka email Anda, lalu klik link tersebut (boleh di perangkat manapun)."
        );
      } catch (err) {
        setFeedback(feedback, "err", err.message || "Gagal mengirim link login.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim Link Login";
      }
    });

    guestBtn.addEventListener("click", () => {
      PortalAuth.continueAsGuest();
    });
  }

  function bindHub() {
    document.querySelectorAll("[data-module]").forEach((card) => {
      card.addEventListener("click", () => openModule(card.getAttribute("data-module")));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModule(card.getAttribute("data-module"));
        }
      });
    });

    $("#btn-logout").addEventListener("click", async () => {
      await PortalAuth.logout();
    });
  }

  function onAuthChange(user) {
    if (user) {
      renderUser(user);
      renderResumeBanner();
      showScreen("hub");
    } else {
      showScreen("auth");
    }
  }

  function boot() {
    bindAuthForm();
    bindHub();
    PortalAuth.onChange = onAuthChange;
    PortalAuth.init();

    // If Firebase is slow / offline, still show something after a short wait
    setTimeout(() => {
      if (screens.boot.classList.contains("active")) {
        if (PortalAuth.user) {
          renderUser(PortalAuth.user);
          renderResumeBanner();
          showScreen("hub");
        } else {
          showScreen("auth");
        }
      }
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
