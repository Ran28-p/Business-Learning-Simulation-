/**
 * Portal UI: login gate + module hub.
 */
(function () {
  const $ = (sel) => document.querySelector(sel);

  const screens = {
    boot: $("#screen-boot"),
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
    const btnLogin = $("#btn-login");
    const btnLogout = $("#btn-logout");
    if (!user) return;
    const label = user.displayName || user.email || "Pengguna";
    nameEl.textContent = label + (user.isGuest ? " (Tamu)" : "");
    emailEl.textContent = user.isGuest ? "Mode tanpa akun — data hanya di perangkat ini" : (user.email || "");
    avatarEl.textContent = PortalAuth.initials(label);

    // Toggle Masuk / Keluar buttons based on guest state
    if (btnLogin) btnLogin.style.display = user.isGuest ? "inline-flex" : "none";
    if (btnLogout) btnLogout.style.display = user.isGuest ? "none" : "inline-flex";
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

    const loginModal = $("#loginModal");
    const loginEmail = $("#login-email");
    const loginName = $("#login-name");
    const loginFeedback = $("#login-feedback");
    const sendLinkButton = $("#btn-send-link");

    function closeLoginModal() {
      if (!loginModal) return;
      loginModal.classList.remove("show");
      clearFeedback(loginFeedback);
    }

    $("#btn-login").addEventListener("click", () => {
      if (!loginModal) return;
      loginModal.classList.add("show");
      clearFeedback(loginFeedback);
      window.setTimeout(() => loginEmail && loginEmail.focus(), 0);
    });

    $("#btn-cancel-login").addEventListener("click", closeLoginModal);
    $("#loginBackdrop").addEventListener("click", closeLoginModal);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeLoginModal();
    });

    sendLinkButton.addEventListener("click", async () => {
      const email = loginEmail.value.trim();
      const name = loginName.value.trim();
      clearFeedback(loginFeedback);
      sendLinkButton.disabled = true;
      sendLinkButton.textContent = "Mengirim…";
      try {
        await PortalAuth.sendLoginLink(email, name);
        setFeedback(loginFeedback, "ok", "Link login sudah dikirim. Periksa inbox email Anda.");
      } catch (error) {
        setFeedback(loginFeedback, "err", error.message || "Gagal mengirim link login. Coba lagi.");
      } finally {
        sendLinkButton.disabled = false;
        sendLinkButton.textContent = "Kirim Link Login";
      }
    });

    $("#btn-logout").addEventListener("click", async () => {
      await PortalAuth.logout();
      PortalAuth.continueAsGuest();
    });
  }

  function onAuthChange(user) {
    const activeUser = user || {
      uid: "guest",
      email: "",
      displayName: "Tamu",
      isGuest: true
    };
    renderUser(activeUser);
    renderResumeBanner();
    showScreen("hub");
  }

  function boot() {
    // The hub is always accessible; authentication is no longer a gate.
    bindHub();
    PortalAuth.onChange = onAuthChange;
    PortalAuth.continueAsGuest();
    PortalAuth.init();
    onAuthChange(PortalAuth.user);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
