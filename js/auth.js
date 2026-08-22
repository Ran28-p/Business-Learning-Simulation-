/**
 * Shared Firebase email-link auth for the Unified Learning Portal.
 * Reuses the same Firebase project as Simulator SPT so accounts remain compatible.
 */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyDFfCX8vsztmt7_B5WE8po2sxNIev-OqMU",
    authDomain: "simulator-spt-db.firebaseapp.com",
    projectId: "simulator-spt-db",
    storageBucket: "simulator-spt-db.firebasestorage.app",
    messagingSenderId: "104270461000",
    appId: "1:104270461000:web:ae700e02006544cb94807d",
    measurementId: "G-1T6RL183GP",
    databaseURL: "https://simulator-spt-db-default-rtdb.asia-southeast1.firebasedatabase.app"
  };

  const SESSION_KEY = "unified_portal_session";
  const EMAIL_KEY = "emailForSignIn";

  window.PortalAuth = {
    ready: false,
    auth: null,
    user: null,
    isGuest: false,
    onChange: null,

    init() {
      try {
        if (!window.firebase) {
          console.warn("Firebase SDK tidak tersedia. Mode lokal saja.");
          this.ready = false;
          this._restoreLocal();
          this._emit();
          return;
        }
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        this.ready = true;

        // Complete magic-link sign-in if this page was opened from email
        this._completeEmailLinkIfPresent().then(() => {
          this._emit();
        });

        this.auth.onAuthStateChanged((user) => {
          if (user) {
            this.user = {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || localStorage.getItem("portal_display_name") || (user.email || "").split("@")[0],
              isGuest: false
            };
            this.isGuest = false;
            this._persistLocal(this.user);
          } else if (!this.isGuest) {
            this.user = null;
            localStorage.removeItem(SESSION_KEY);
          }
          this._emit();
        });
      } catch (e) {
        console.warn("Auth init gagal:", e);
        this.ready = false;
        this._restoreLocal();
        this._emit();
      }
    },

    _emit() {
      if (typeof this.onChange === "function") {
        this.onChange(this.user);
      }
    },

    _persistLocal(user) {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          isGuest: !!user.isGuest,
          savedAt: Date.now()
        }));
        if (user.displayName) {
          localStorage.setItem("portal_display_name", user.displayName);
        }
      } catch (_) { /* ignore */ }
    },

    _restoreLocal() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && (data.email || data.isGuest)) {
          this.user = data;
          this.isGuest = !!data.isGuest;
        }
      } catch (_) { /* ignore */ }
    },

    async sendLoginLink(email, displayName) {
      if (!this.ready || !this.auth) {
        throw new Error("Layanan login belum siap. Periksa koneksi internet Anda.");
      }
      const cleanEmail = (email || "").trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("Alamat email tidak valid.");
      }
      if (displayName) {
        localStorage.setItem("portal_display_name", displayName.trim());
      }
      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true
      };
      await this.auth.sendSignInLinkToEmail(cleanEmail, actionCodeSettings);
      window.localStorage.setItem(EMAIL_KEY, cleanEmail);
      return cleanEmail;
    },

    async _completeEmailLinkIfPresent() {
      if (!this.auth) return;
      try {
        if (!this.auth.isSignInWithEmailLink(window.location.href)) return;
        let email = window.localStorage.getItem(EMAIL_KEY);
        if (!email) {
          email = window.prompt("Masukkan email yang Anda pakai untuk meminta link login:");
        }
        if (!email) return;
        const result = await this.auth.signInWithEmailLink(email, window.location.href);
        window.localStorage.removeItem(EMAIL_KEY);
        // Clean the URL (remove oobCode etc.)
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (result && result.user) {
          const name = localStorage.getItem("portal_display_name");
          if (name) {
            try {
              // Update di Firebase
              await result.user.updateProfile({ displayName: name });
              // Update state lokal segera agar UI langsung berubah
              if (this.user) {
                this.user.displayName = name;
                this._persistLocal(this.user);
                this._emit();
              }
            } catch (err) {
              console.warn("Gagal update profile:", err);
            }
          }
        }
      } catch (e) {
        console.error("Gagal menyelesaikan login link:", e);
        alert("Link login tidak valid atau sudah kedaluwarsa. Silakan minta link baru.");
      }
    },

    continueAsGuest() {
      this.isGuest = true;
      this.user = {
        uid: "guest",
        email: "",
        displayName: "Tamu",
        isGuest: true
      };
      this._persistLocal(this.user);
      this._emit();
    },

    async logout() {
      this.isGuest = false;
      this.user = null;
      localStorage.removeItem(SESSION_KEY);
      try {
        if (this.auth) await this.auth.signOut();
      } catch (_) { /* ignore */ }
      this._emit();
    },

    initials(nameOrEmail) {
      const s = (nameOrEmail || "?").trim();
      if (!s) return "?";
      const parts = s.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return s.slice(0, 2).toUpperCase();
    }
  };
})();
