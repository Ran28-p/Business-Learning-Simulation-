/**
 * Knowledge Base — engine e-book bersama (Accounting, SPT, Excel, SQL & PQ).
 * Upgrade: accordion navigasi (subtopik tersembunyi sampai TOPIK diklik) + pencarian.
 *
 * Pakai:
 *   KnowledgeBase.open(window.KNOWLEDGE_CONTENT_SPT)
 * Format konten: { title, subtitle?, appAccent?, chapters: [{ id, title, sections: [{ id, heading, body }] }] }
 */
(function () {
  'use strict';
  if (window.KnowledgeBase) return;

  const STATE = { content: null, overlay: null, pdfBusy: false };

  // Catatan: dulu file ini punya loader html2pdf sendiri (ensureHtml2Pdf +
  // resolveBase) yang terpisah dari js/shared/pdf-export.js -- itu sumber
  // duplikasi implementasi PDF yang menyebabkan bug (lihat downloadPdf()).
  // Sekarang seluruhnya memakai window.PDFExport (engine terpusat yang sama
  // dipakai Accounting/SPT/Excel/SQL-PQ), jadi loader lokal ini dihapus.

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function slug(str, fallback) {
    return (str || fallback || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || fallback;
  }

  function buildOverlay(content) {
    const overlay = document.createElement('div');
    overlay.className = 'kb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', content.title || 'Modul Pengetahuan');
    if (content.appAccent) overlay.style.setProperty('--kb-primary', content.appAccent);

    let navHtml = '';
    let contentHtml = '';
    (content.chapters || []).forEach((chapter, ci) => {
      const chapterId = chapter.id || slug(chapter.title, 'bab-' + (ci + 1));
      const hasSub = chapter.sections && chapter.sections.length;
      // Accordion: sublist collapsed by default (hidden until chapter toggled)
      navHtml += `<li class="kb-nav-chapter" data-kb-chapter="${escapeAttr(chapterId)}">`;
      navHtml += `<button type="button" class="kb-nav-toggle" aria-expanded="false" aria-controls="kb-sub-${escapeAttr(chapterId)}" data-kb-toggle="${escapeAttr(chapterId)}">`;
      navHtml += `<span class="kb-chevron" aria-hidden="true">▸</span>`;
      navHtml += `<span class="kb-nav-toggle-label">${escapeHtml(chapter.title)}</span>`;
      navHtml += `</button>`;
      if (hasSub) {
        navHtml += `<ul class="kb-nav-sublist" id="kb-sub-${escapeAttr(chapterId)}" hidden>`;
        chapter.sections.forEach((section, si) => {
          const sectionId = section.id || slug(section.heading, chapterId + '-' + (si + 1));
          // Heading tampil tanpa nomor 1.1 jika user prefer — tetap pakai heading dari data
          navHtml += `<li><a href="#${escapeAttr(sectionId)}" class="kb-nav-link" data-kb-target="${escapeAttr(sectionId)}">${escapeHtml(section.heading)}</a></li>`;
        });
        navHtml += `</ul>`;
      }
      navHtml += `</li>`;

      contentHtml += `<section class="kb-chapter" id="${escapeAttr(chapterId)}"><h2 class="kb-chapter-title">${escapeHtml(chapter.title)}</h2>`;
      (chapter.sections || []).forEach((section, si) => {
        const sectionId = section.id || slug(section.heading, chapterId + '-' + (si + 1));
        contentHtml += `<article class="kb-section" id="${escapeAttr(sectionId)}" data-kb-chapter-parent="${escapeAttr(chapterId)}">`;
        contentHtml += `<h3 class="kb-section-title">${escapeHtml(section.heading)}</h3>`;
        contentHtml += `<div class="kb-section-body">${section.body || ''}</div></article>`;
      });
      contentHtml += `</section>`;
    });

    overlay.innerHTML = `
      <div class="kb-panel">
        <header class="kb-header">
          <div class="kb-header-titles">
            <div class="kb-header-eyebrow">📘 Tax Knowledge Center</div>
            <h1 class="kb-header-title">${escapeHtml(content.title || '')}</h1>
            ${content.subtitle ? `<div class="kb-header-subtitle">${escapeHtml(content.subtitle)}</div>` : ''}
          </div>
          <div class="kb-header-actions">
            <button type="button" class="kb-btn kb-btn--primary" data-kb-action="download">⬇️ Unduh PDF</button>
            <button type="button" class="kb-btn kb-btn--ghost" data-kb-action="print">🖨️ Cetak</button>
            <button type="button" class="kb-btn kb-btn--close" data-kb-action="close" aria-label="Tutup">✕</button>
          </div>
        </header>
        <div class="kb-body">
          <nav class="kb-sidebar" aria-label="Daftar isi">
            <div class="kb-sidebar-label">Daftar Isi</div>
            <div class="kb-search-wrap">
              <input type="search" class="kb-search" id="kbSearchInput" placeholder="Cari topik / kata kunci…" autocomplete="off" aria-label="Cari dalam modul pengetahuan">
              <div class="kb-search-meta" id="kbSearchMeta" hidden></div>
            </div>
            <ul class="kb-nav-list">${navHtml}</ul>
          </nav>
          <main class="kb-content" id="kbContentScroll">
            <div class="kb-content-inner" id="kbPrintArea">
              <div class="kb-titlepage">
                <div class="kb-titlepage-eyebrow">Portal Belajar · SPT</div>
                <h1>${escapeHtml(content.title || '')}</h1>
                ${content.subtitle ? `<p>${escapeHtml(content.subtitle)}</p>` : ''}
              </div>
              ${contentHtml}
            </div>
          </main>
        </div>
        <div class="kb-status" id="kbStatus" hidden></div>
      </div>
    `;
    return overlay;
  }

  function setChapterExpanded(overlay, chapterId, expanded) {
    const btn = overlay.querySelector(`[data-kb-toggle="${CSS.escape(chapterId)}"]`);
    const sub = overlay.querySelector(`#kb-sub-${CSS.escape(chapterId)}`);
    if (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.classList.toggle('kb-nav-toggle--open', !!expanded);
    }
    if (sub) sub.hidden = !expanded;
  }

  function wireInteractions(overlay, content) {
    const scrollArea = overlay.querySelector('#kbContentScroll');
    const navLinks = () => Array.from(overlay.querySelectorAll('.kb-nav-link'));
    const statusEl = overlay.querySelector('#kbStatus');
    const searchInput = overlay.querySelector('#kbSearchInput');
    const searchMeta = overlay.querySelector('#kbSearchMeta');

    function setStatus(msg, isError) {
      if (!msg) { statusEl.hidden = true; statusEl.textContent = ''; return; }
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.classList.toggle('kb-status--error', !!isError);
    }

    // Accordion toggle
    overlay.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-kb-toggle]');
      if (toggle) {
        e.preventDefault();
        const id = toggle.getAttribute('data-kb-toggle');
        const open = toggle.getAttribute('aria-expanded') === 'true';
        setChapterExpanded(overlay, id, !open);
        // Scroll ke chapter saat dibuka
        if (!open) {
          const targetEl = overlay.querySelector('#' + CSS.escape(id));
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      const actionEl = e.target.closest('[data-kb-action]');
      if (actionEl) {
        const action = actionEl.getAttribute('data-kb-action');
        if (action === 'close') close();
        if (action === 'print') window.print();
        if (action === 'download') downloadPdf(content, setStatus);
        return;
      }

      const link = e.target.closest('.kb-nav-link');
      if (link) {
        e.preventDefault();
        const targetId = link.getAttribute('data-kb-target');
        const targetEl = overlay.querySelector('#' + CSS.escape(targetId));
        if (targetEl) {
          // Pastikan parent chapter terbuka
          const parent = targetEl.getAttribute('data-kb-chapter-parent');
          if (parent) setChapterExpanded(overlay, parent, true);
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      if (e.target === overlay) close();
    });

    // Keyboard: Escape + Enter/Space on toggle
    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeydown);

    // Search
    function clearHighlights() {
      overlay.querySelectorAll('.kb-search-hit').forEach((el) => {
        el.classList.remove('kb-search-hit');
      });
      overlay.querySelectorAll('.kb-nav-chapter').forEach((li) => { li.hidden = false; });
      overlay.querySelectorAll('.kb-nav-sublist li').forEach((li) => { li.hidden = false; });
      overlay.querySelectorAll('.kb-section').forEach((s) => { s.hidden = false; });
      overlay.querySelectorAll('.kb-chapter').forEach((c) => { c.hidden = false; });
    }

    function performSearch(q) {
      const query = (q || '').trim().toLowerCase();
      clearHighlights();
      if (!query) {
        searchMeta.hidden = true;
        searchMeta.textContent = '';
        return;
      }
      let hits = 0;
      const chapters = content.chapters || [];
      chapters.forEach((chapter, ci) => {
        const chapterId = chapter.id || slug(chapter.title, 'bab-' + (ci + 1));
        let chapterHit = (chapter.title || '').toLowerCase().includes(query);
        const sectionHits = [];
        (chapter.sections || []).forEach((section, si) => {
          const sectionId = section.id || slug(section.heading, chapterId + '-' + (si + 1));
          const text = ((section.heading || '') + ' ' + (section.body || '').replace(/<[^>]+>/g, ' ')).toLowerCase();
          const ok = text.includes(query);
          const navLi = overlay.querySelector(`.kb-nav-link[data-kb-target="${CSS.escape(sectionId)}"]`);
          if (navLi && navLi.parentElement) navLi.parentElement.hidden = !ok;
          const art = overlay.querySelector('#' + CSS.escape(sectionId));
          if (art) {
            art.hidden = !ok;
            if (ok) {
              art.classList.add('kb-search-hit');
              hits++;
              sectionHits.push(sectionId);
              chapterHit = true;
            }
          }
        });
        const chapterLi = overlay.querySelector(`.kb-nav-chapter[data-kb-chapter="${CSS.escape(chapterId)}"]`);
        if (chapterLi) chapterLi.hidden = !chapterHit;
        const chapterEl = overlay.querySelector('#' + CSS.escape(chapterId));
        if (chapterEl) chapterEl.hidden = !chapterHit;
        if (chapterHit) setChapterExpanded(overlay, chapterId, true);
      });
      searchMeta.hidden = false;
      searchMeta.textContent = hits ? (hits + ' bagian cocok') : 'Tidak ada hasil';
    }

    let searchTimer = null;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => performSearch(searchInput.value), 180);
      });
    }

    // Scrollspy
    const sections = Array.from(overlay.querySelectorAll('.kb-chapter, .kb-section'));
    function onScroll() {
      let currentId = null;
      const areaTop = scrollArea.getBoundingClientRect().top;
      for (const sec of sections) {
        if (sec.hidden) continue;
        const rect = sec.getBoundingClientRect();
        if (rect.top - areaTop <= 96) currentId = sec.id;
      }
      navLinks().forEach((a) => {
        a.classList.toggle('kb-nav-link--active', a.getAttribute('data-kb-target') === currentId);
      });
    }
    scrollArea.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    overlay.__kbCleanup = () => {
      document.removeEventListener('keydown', onKeydown);
      clearTimeout(searchTimer);
    };
  }

  function downloadPdf(content, setStatus) {
    if (STATE.pdfBusy) return;
    STATE.pdfBusy = true;
    setStatus('Menyiapkan PDF…');

    var chapters = (content && content.chapters) || [];
    if (!chapters.length) {
      setStatus('Konten modul kosong.', true);
      STATE.pdfBusy = false;
      return;
    }

    function buildBodyHtml() {
      var html = '';
      html += '<div class="kbpdf-cover">';
      html += '<div class="kbpdf-cover-eyebrow">Portal Belajar</div>';
      html += '<div class="kbpdf-cover-title">' + escapeHtml(content.title || 'Modul Pengetahuan') + '</div>';
      if (content.subtitle) {
        html += '<div class="kbpdf-cover-sub">' + escapeHtml(content.subtitle) + '</div>';
      }
      html += '</div>';
      for (var ci = 0; ci < chapters.length; ci++) {
        var chapter = chapters[ci];
        html += '<div class="kbpdf-chapter">';
        html += '<h1 class="kbpdf-h1">' + escapeHtml(chapter.title || '') + '</h1>';
        var sections = chapter.sections || [];
        for (var si = 0; si < sections.length; si++) {
          var section = sections[si];
          html += '<div class="kbpdf-section">';
          html += '<h2 class="kbpdf-h2">' + escapeHtml(section.heading || '') + '</h2>';
          html += '<div class="kbpdf-body">' + (section.body || '') + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }
      return html;
    }

    var pdfCss = [
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}',
      '.kbpdf-root{background:#fff;color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:13.5px;line-height:1.6;padding:20px 24px;width:794px;--kb-primary:#2563eb;--kb-primary-dark:#1d4ed8;--kb-ink:#0f172a;--kb-muted:#55627a;--kb-border:#e2e8f0;--kb-surface:#ffffff;--kb-canvas:#f4f6fb;--kb-tip-bg:#ecfdf5;--kb-tip-border:#10b981;--kb-warn-bg:#fffbeb;--kb-warn-border:#f59e0b;--kb-example-bg:#eff6ff;--kb-example-border:#93c5fd;}',
      '.kbpdf-cover{text-align:center;margin:0 0 18px;padding:0 0 14px;border-bottom:3px solid #1e3a5f;}',
      '.kbpdf-cover-eyebrow{font-size:11px;font-weight:800;color:#1e3a5f;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px;}',
      '.kbpdf-cover-title{font-size:22px;font-weight:800;color:#0f172a;margin:0 0 6px;line-height:1.25;}',
      '.kbpdf-cover-sub{font-size:13px;color:#334155;margin:0;line-height:1.45;}',
      '.kbpdf-chapter{margin:0 0 18px;page-break-before:always;}',
      '.kbpdf-chapter:first-child{page-break-before:auto;}',
      '.kbpdf-h1{font-size:17px;font-weight:800;color:#0f172a;margin:0 0 10px;padding:0 0 6px;border-bottom:2px solid #1e3a5f;}',
      '.kbpdf-h2{font-size:14px;font-weight:700;color:#1e3a5f;margin:12px 0 6px;}',
      '.kbpdf-section{margin:0 0 12px;page-break-inside:avoid;}',
      '.kbpdf-body,.kbpdf-body p,.kb-lead{color:#0f172a!important;font-size:13px;line-height:1.65;margin:0 0 8px;}',
      '.kbpdf-body li{color:#0f172a;margin-bottom:3px;}',
      '.kbpdf-body ul,.kbpdf-body ol{margin:0 0 8px;padding-left:20px;}',
      '.kbpdf-body strong{color:#0f172a;font-weight:700;}',
      '.kb-legal{font-size:11.5px;color:#475569;font-style:italic;}',
      '.kb-callout-title{display:block;font-weight:800;margin-bottom:4px;}',
      'table.kb-table td.kb-num,table.kb-table th.kb-num{text-align:right;font-variant-numeric:tabular-nums;}',
      'table.kb-table tr.kb-total-row td{font-weight:800;border-top:2px solid #0f172a;}',
      'table.kb-table tr.kb-subtotal-row td{font-weight:700;background:#fafbfd;}',
      '.kb-journal{margin:12px 0 18px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;page-break-inside:avoid;}',
      '.kb-journal-caption{background:#f4f6fb;font-size:12.5px;font-weight:700;padding:8px 12px;border-bottom:1px solid #e2e8f0;}',
      'table.kb-journal-table{width:100%;border-collapse:collapse;font-size:12.5px;font-family:Consolas,"SFMono-Regular",Menlo,monospace;table-layout:auto;}',
      'table.kb-journal-table td{padding:6px 12px;border-bottom:1px solid #f1f5f9;}',
      'table.kb-journal-table td.kb-jr-desc-d{padding-left:12px;}',
      'table.kb-journal-table td.kb-jr-desc-k{padding-left:36px;color:#55627a;}',
      'table.kb-journal-table td.kb-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}',
      '.kb-tip{background:#fef9c3;border:1px solid #a16207;border-left:4px solid #ca8a04;border-radius:6px;padding:10px 12px;margin:8px 0;color:#713f12;font-size:12.5px;}',
      '.kb-warning{background:#fee2e2;border:1px solid #b91c1c;border-left:4px solid #dc2626;border-radius:6px;padding:10px 12px;margin:8px 0;color:#7f1d1d;font-size:12.5px;}',
      '.kb-example{background:#e0f2fe;border:1px solid #0369a1;border-left:4px solid #0284c7;border-radius:6px;padding:10px 12px;margin:8px 0;color:#0c4a6e;font-size:12.5px;}',
      '.kb-formula{background:#f1f5f9;border:1px solid #64748b;border-radius:6px;padding:10px 12px;margin:8px 0;text-align:center;font-family:ui-monospace,Consolas,monospace;font-weight:700;color:#0f172a;}',
      '.kb-quickfact{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;}',
      '.kb-quickfact-item{flex:1 1 120px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px;text-align:center;}',
      '.qf-label{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;}',
      '.qf-value{font-size:13px;font-weight:800;color:#0f172a;margin-top:2px;}',
      'table{width:100%;border-collapse:collapse;font-size:11.5px;table-layout:fixed;margin:6px 0 10px;}',
      'th{background:#1e3a5f;color:#fff;padding:6px 8px;border:1px solid #1e3a5f;text-align:left;font-weight:700;}',
      'td{padding:6px 8px;border:1px solid #94a3b8;vertical-align:top;color:#0f172a;word-break:break-word;}'
    ].join('');

    var fileName = slug(content.title, 'modul-pengetahuan') + '.pdf';

    if (!window.PDFExport) {
      setStatus('Mesin PDF tidak tersedia. Coba muat ulang halaman.', true);
      STATE.pdfBusy = false;
      return;
    }

    // Dulu bagian ini punya pipeline html2canvas sendiri (position:absolute
    // + onclone manual) yang terbukti rapuh -- hasil unduhan kadang jadi
    // halaman kosong. Sekarang memakai window.PDFExport.exportHTMLToPDF(),
    // engine terpusat yang sama dan sudah terbukti bekerja di modul
    // Accounting/SPT/Excel/SQL-PQ (position:fixed + overlay "Membuat PDF...",
    // bukan absolute+z-index yang gampang salah ukur oleh html2canvas).
    var html = '<div class="kbpdf-root">' + buildBodyHtml() + '</div>';

    window.PDFExport.exportHTMLToPDF(html, {
      filename: fileName,
      widthPx: 794,
      scale: 2,
      extraCss: pdfCss,
      margin: [10, 12, 12, 12]
    })
      .then(function () {
        setStatus('PDF berhasil diunduh.');
        setTimeout(function () { setStatus(''); }, 2500);
      })
      .catch(function (err) {
        console.error('[knowledge-base] PDF error:', err);
        setStatus(err && err.message ? err.message : 'Gagal membuat PDF. Silakan coba lagi.', true);
      })
      .then(function () {
        STATE.pdfBusy = false;
      });
  }

  function open(content) {
    if (!content || !content.chapters || !content.chapters.length) {
      console.error('[knowledge-base] Konten kosong atau tidak valid.');
      return;
    }
    close();
    STATE.content = content;
    const overlay = buildOverlay(content);
    document.body.appendChild(overlay);
    document.body.classList.add('kb-scroll-lock');
    STATE.overlay = overlay;
    wireInteractions(overlay, content);
    const raf = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };
    raf(() => overlay.classList.add('kb-overlay--visible'));
  }

  function close() {
    if (!STATE.overlay) return;
    if (STATE.overlay.__kbCleanup) STATE.overlay.__kbCleanup();
    STATE.overlay.remove();
    STATE.overlay = null;
    document.body.classList.remove('kb-scroll-lock');
  }

  window.KnowledgeBase = { open, close };
})();
