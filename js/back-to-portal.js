/**
 * Floating "Kembali ke Portal" button injected into each module app.
 * Place this script near the end of <body> in every app index.html.
 */
(function () {
  if (window.__portalBackInjected) return;
  window.__portalBackInjected = true;

  // Resolve portal root relative to this script's location (/js/back-to-portal.js)
  function portalHome() {
    try {
      const scripts = document.getElementsByTagName("script");
      for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || "";
        if (src.indexOf("back-to-portal.js") !== -1) {
          // .../unified-portal/js/back-to-portal.js → .../unified-portal/
          return src.replace(/\/js\/back-to-portal\.js(?:\?.*)?$/, "/");
        }
      }
    } catch (_) { /* ignore */ }
    // Fallback: assume apps live under /apps/<name>/
    return "../../";
  }

  const home = portalHome();

  // Styling lives in css/responsive-foundation.css (.bls-back-to-portal), which
  // every app now links. That keeps this button on the right side (away from
  // the left-hand sidebars in Accounting/SPT/SQL-PQ so it stops covering menu
  // items), respects safe-area insets, and shrinks itself on small phones —
  // things a hardcoded inline style string can't do via media queries.
  const btn = document.createElement("a");
  btn.href = home + "index.html";
  btn.className = "bls-back-to-portal";
  btn.setAttribute("aria-label", "Kembali ke Portal Belajar");
  btn.textContent = "← Portal";

  // Fade the button out while the page is actively scrolling, so it never sits
  // on top of a chart/table/CTA the user is currently looking at. It reappears
  // as soon as scrolling stops, the user scrolls back up, or it's within ~120px
  // of the top/bottom of the page (where there's usually nothing under it).
  var hideTimer = null;
  var lastScrollY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    var scrollingDown = y > lastScrollY + 2;
    var nearTop = y < 120;
    var nearBottom = (window.innerHeight + y) > (document.documentElement.scrollHeight - 120);
    lastScrollY = y;

    if (scrollingDown && !nearTop && !nearBottom) {
      btn.classList.add("bls-back-to-portal--hidden");
    } else {
      btn.classList.remove("bls-back-to-portal--hidden");
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      btn.classList.remove("bls-back-to-portal--hidden");
    }, 600);
  }

  function mount() {
    if (document.body) document.body.appendChild(btn);
    else document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(btn);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  mount();
})();
