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

  let isOpeningModule = false;

  // Cross-module storage contract. Values stay as raw strings so each app can
  // restore its own JSON format without the portal needing to understand it.
  const PORTAL_DATA_KEYS = new Set([
    'bls-theme',
    'portal_display_name',
    'ACT_MASTER_STATE',
    'ACT_MASTER_SIDEBAR_COLLAPSED',
    'ACT_MASTER_SESSION',
    'ACT_MASTER_TAX_STATE',
    'hasVisited_ActMasterPro',
    'spt_simulator_data',
    'spt_tax_career_progress',
    'simspt_faktur_history_v1',
    'simspt_bupot_history_v1',
    'spt_npwp', 'spt_nama_wp',
    'spt_1771_induk_kasus_id', 'draft_spt_1771_induk',
    'draft_lampiran_I', 'nilai_lampiran_I',
    'draft_lampiran_II', 'L2_total_hpp', 'L2_total_bs', 'L2_total_bl',
    'draft_lampiran_III', 'L3_total_kredit_pajak',
    'draft_lampiran_IV', 'L4_total_non_objek',
    'sqlpq_progress_v1'
  ]);
  const PORTAL_DATA_PREFIXES = ['efpg:'];

  function isPortalDataKey(key) {
    return PORTAL_DATA_KEYS.has(key) || PORTAL_DATA_PREFIXES.some(prefix => key.indexOf(prefix) === 0);
  }

  function collectPortalData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && isPortalDataKey(key)) data[key] = localStorage.getItem(key);
    }
    return {
      __bls_portal_backup: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  function downloadPortalBackup() {
    const payload = JSON.stringify(collectPortalData(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup-portal-belajar.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function restorePortalData(parsed) {
    if (!parsed || typeof parsed !== 'object' || !parsed.__bls_portal_backup || !parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Format backup portal tidak valid.');
    }
    let restored = 0;
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (!isPortalDataKey(key) || typeof value !== 'string') return;
      localStorage.setItem(key, value);
      restored += 1;
    });
    if (!restored) throw new Error('Backup tidak berisi data modul yang dikenali.');
    return restored;
  }

  function resetPortalData() {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && isPortalDataKey(key)) localStorage.removeItem(key);
    }
    document.documentElement.setAttribute('data-theme', 'light');
    const themeBtn = $('#portalThemeBtn');
    if (themeBtn) themeBtn.textContent = '🌙';
  }

  function bindPortalDataControls() {
    const backupBtn = $('#btn-portal-backup');
    const restoreBtn = $('#btn-portal-restore');
    const resetBtn = $('#btn-portal-reset');
    const restoreFile = $('#portal-restore-file');
    if (backupBtn) backupBtn.addEventListener('click', downloadPortalBackup);
    if (restoreBtn && restoreFile) restoreBtn.addEventListener('click', () => restoreFile.click());
    if (restoreFile) restoreFile.addEventListener('change', () => {
      const file = restoreFile.files && restoreFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const count = restorePortalData(JSON.parse(reader.result));
          alert(`Backup berhasil dipulihkan (${count} item). Halaman akan dimuat ulang.`);
          window.location.reload();
        } catch (error) {
          alert(error.message || 'Backup tidak dapat dipulihkan.');
        } finally {
          restoreFile.value = '';
        }
      };
      reader.onerror = () => { restoreFile.value = ''; alert('Gagal membaca file backup.'); };
      reader.readAsText(file);
    });
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (!window.confirm('Hapus semua progres modul dan preferensi portal dari perangkat ini? Tindakan ini tidak dapat dibatalkan.')) return;
      resetPortalData();
      alert('Data portal berhasil dihapus. Halaman akan dimuat ulang.');
      window.location.reload();
    });
  }

  function openModule(path, selectedCard) {
    if (!path || isOpeningModule) return;
    isOpeningModule = true;

    // Remember which module was opened (optional analytics / resume)
    try {
      sessionStorage.setItem("unified_last_module", path);
      // Let the child app greet the user by name without needing its own
      // login — same-origin sessionStorage survives this in-tab navigation.
      const user = PortalAuth.user;
      if (user) {
        sessionStorage.setItem("portal_user_name", user.displayName || user.email || "Tamu");
        sessionStorage.setItem("portal_user_email", user.email || "");
        sessionStorage.setItem("portal_user_is_guest", user.isGuest ? "true" : "false");
      }
    } catch (_) { /* ignore */ }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (selectedCard) {
      const cards = document.querySelectorAll("[data-module]");
      cards.forEach((card) => {
        card.disabled = true;
        card.setAttribute("aria-disabled", "true");
        card.classList.toggle("is-selected", card === selectedCard);
        card.classList.toggle("is-not-selected", card !== selectedCard);
      });
    }

    // Give a selected card a short, deliberate visual confirmation before navigation.
    window.setTimeout(() => {
      window.location.href = path;
    }, selectedCard && !reduceMotion ? 520 : 0);
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
      card.addEventListener("click", () => openModule(card.getAttribute("data-module"), card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModule(card.getAttribute("data-module"), card);
        }
      });
    });

    // Theme handling
    const THEME_KEY = 'bls-theme';
    function initTheme() {
      const saved = localStorage.getItem(THEME_KEY) || 'light';
      document.documentElement.setAttribute('data-theme', saved);
      const btn = $("#portalThemeBtn");
      if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    }

    function togglePortalTheme() {
      const cur = localStorage.getItem(THEME_KEY) === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, cur);
      document.documentElement.setAttribute('data-theme', cur);
      const btn = $("#portalThemeBtn");
      if (btn) btn.textContent = cur === 'dark' ? '☀️' : '🌙';
    }

    const portalThemeBtn = $("#portalThemeBtn");
    if (portalThemeBtn) {
      portalThemeBtn.addEventListener("click", togglePortalTheme);
    }
    initTheme();
    bindPortalDataControls();

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
