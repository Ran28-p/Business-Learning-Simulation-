/**
 * Knowledge Base — engine e-book bersama (Accounting, SPT, Excel, SQL & PQ).
 *
 * ARSITEKTUR (3 layer):
 *   A. SCREEN UI      → modal, sidebar, search, accordion (buildOverlay)
 *   B. DOCUMENT MODEL → struktur print murni, lepas dari modal (buildPrintDocument)
 *   C. OUTPUT         → Browser Print (iframe) ATAU PDF Export (html2pdf)
 *
 * Print & PDF memakai DOCUMENT MODEL + CSS yang SAMA, hanya beda output.
 * Ukuran kertas (A4/F4) adalah konfigurasi dokumen (PaperConfig), BUKAN
 * dropdown yang berdiri sendiri — dipilih lewat dialog konfigurasi saat
 * user menekan "Cetak" atau "Unduh PDF".
 *
 * Pakai:
 *   KnowledgeBase.open(window.KNOWLEDGE_CONTENT_SPT)
 * Format konten: { title, subtitle?, appAccent?, chapters: [{ id, title, sections: [{ id, heading, body }] }] }
 */
(function () {
  'use strict';
  if (window.KnowledgeBase) return;

  const STATE = { content: null, overlay: null, pdfBusy: false };

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
  function paper(id) {
    return window.PaperConfig ? window.PaperConfig.getPaper(id) : null;
  }

  /* ════════════════════════════════════════════════════════════════
     LAYER B — PRINT DOCUMENT MODEL
     Struktur DOM murni untuk print/PDF. TIDAK membawa UI interaktif:
     tanpa sidebar, tombol, search, dropdown, overlay, background app.
     Satu-satunya sumber styling adalah DOC_BASE_CSS (di bawah) —
     dipakai identik oleh Browser Print dan PDF Export.
     ════════════════════════════════════════════════════════════════ */

  function buildPrintDocument(content) {
    var doc = document.createElement('div');
    doc.className = 'kb-print-doc';

    // ── Document header (bukan header modal) ──
    var header = document.createElement('header');
    header.className = 'print-doc-header';
    header.innerHTML =
      '<div class="print-doc-eyebrow">Portal Belajar &middot; Tax Knowledge Center</div>' +
      '<h1 class="print-doc-title">' + escapeHtml(content.title || 'Modul Pengetahuan') + '</h1>' +
      (content.subtitle ? '<div class="print-doc-sub">' + escapeHtml(content.subtitle) + '</div>' : '');
    doc.appendChild(header);

    // ── Chapters: tiap topik = unit pagination (mulai halaman baru,
    //    tapi boleh memanjang beberapa halaman bila kontennya panjang) ──
    var chapters = content.chapters || [];
    for (var ci = 0; ci < chapters.length; ci++) {
      var chapter = chapters[ci];
      var ch = document.createElement('section');
      ch.className = 'print-chapter';

      var chTitle = document.createElement('h2');
      chTitle.className = 'print-chapter-title';
      chTitle.textContent = chapter.title || '';
      ch.appendChild(chTitle);

      var sections = chapter.sections || [];
      for (var si = 0; si < sections.length; si++) {
        var section = sections[si];
        var art = document.createElement('article');
        art.className = 'print-section';

        var h3 = document.createElement('h3');
        h3.className = 'print-section-title';
        h3.textContent = section.heading || '';
        art.appendChild(h3);

        var body = document.createElement('div');
        body.className = 'print-body';
        body.innerHTML = section.body || '';
        art.appendChild(body);

        ch.appendChild(art);
      }
      doc.appendChild(ch);
    }
    return doc;
  }

  /**
   * CSS dokumen bersama — SATU sumber kebenaran untuk Print & PDF.
   * Memakai satuan fisik (pt) + aturan pagination eksplisit:
   *   - chapter  → break-before: page (kecuali pertama)
   *   - heading  → break-after: avoid (heading tidak pernah sendirian)
   *   - callout/formula/journal/row → break-inside: avoid (atomic)
   *   - thead    → table-header-group (header tabel berulang saat print)
   *   - orphans/widows → paragraf tidak menyisakan 1 baris yatim
   */
  var DOC_BASE_CSS = [
    /* === Global === */
    '.kb-print-doc{color:#0f172a;font-family:"Times New Roman",Times,serif;font-size:12pt;line-height:1.6;}',
    '.kb-print-doc *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}',

    /* Document header — centered, professional */
    '.print-doc-header{text-align:center;padding-bottom:10pt;margin-bottom:14pt;border-bottom:2pt solid #0f172a;}',
    '.print-doc-eyebrow{font-family:Arial,Helvetica,sans-serif;font-size:9pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-bottom:5pt;}',
    '.print-doc-title{font-family:Arial,Helvetica,sans-serif;font-size:20pt;font-weight:800;line-height:1.25;margin:0 0 4pt;color:#0f172a;}',
    '.print-doc-sub{font-family:Arial,Helvetica,sans-serif;font-size:15pt;color:#475569;line-height:1.45;}',

    /* Chapters — pagination unit */
    '.print-chapter{break-before:page;}',
    '.print-chapter:first-of-type{break-before:auto;}',

    /* Chapter title — Arial 15pt, always stick with first content */
    '.print-chapter-title{font-family:Arial,Helvetica,sans-serif;font-size:15pt;font-weight:800;margin:0 0 10pt;padding-bottom:5pt;border-bottom:1.5pt solid #0f172a;break-after:avoid;}',

    /* Section title — Arial 12pt, stick with next content */
    '.print-section{margin:0 0 14pt;}',
    '.print-section-title{font-family:Arial,Helvetica,sans-serif;font-size:12pt;font-weight:700;color:#1e293b;margin:14pt 0 5pt;break-after:avoid;}',

    /* Body typography — Times New Roman 12pt */
    '.print-body{font-family:"Times New Roman",Times,serif;font-size:12pt;line-height:1.6;color:#0f172a;}',
    '.print-body p,.print-body .kb-lead{margin:0 0 8pt;orphans:3;widows:3;}',
    '.print-body .kb-lead{font-size:12pt;color:#334155;}',
    '.print-body ul,.print-body ol{margin:0 0 8pt;padding-left:18pt;orphans:3;widows:3;}',
    '.print-body li{margin-bottom:3pt;}',
    '.print-body strong{color:#0f172a;font-weight:700;}',
    '.print-body code{font-family:ui-monospace,Consolas,"SFMono-Regular",Menlo,monospace;font-size:10pt;background:#f1f5f9;padding:0.5pt 3pt;border-radius:2pt;}',
    '.print-body .kb-legal{font-size:9pt;color:#64748b;font-style:italic;}',
    '.print-body .kb-callout-title{display:block;font-weight:700;margin-bottom:3pt;}',

    /* Tables — unit atomic, header repeats, must not overflow */
    '.print-body .kb-table-wrap{overflow:visible;margin:8pt 0 10pt;break-inside:avoid;}',
    '.print-body table{width:100%;border-collapse:collapse;font-size:11pt;margin:6pt 0 8pt;}',
    '.print-body thead{display:table-header-group;}',
    '.print-body tr{break-inside:avoid;}',
    '.print-body th,.print-body td{border:0.75pt solid #cbd5e1;padding:5pt 6pt;text-align:left;vertical-align:top;word-wrap:break-word;}',
    '.print-body th{background:#0f172a;color:#fff;font-weight:700;}',
    '.print-body table.kb-table th{background:#0f172a;color:#fff;font-weight:700;}',
    '.print-body td.kb-num,.print-body th.kb-num{text-align:right;font-variant-numeric:tabular-nums;}',
    '.print-body tr.kb-total-row td{font-weight:800;border-top:1.5pt solid #0f172a;}',
    '.print-body tr.kb-subtotal-row td{font-weight:700;background:#f8fafc;}',

    /* Journal (jurnal umum) */
    '.print-body .kb-journal{margin:8pt 0 10pt;border:0.75pt solid #cbd5e1;border-radius:4pt;overflow:hidden;break-inside:avoid;}',
    '.print-body .kb-journal-caption{background:#f8fafc;font-size:10pt;font-weight:700;padding:5pt 8pt;border-bottom:0.75pt solid #cbd5e1;color:#334155;}',
    '.print-body table.kb-journal-table{font-family:ui-monospace,Consolas,monospace;font-size:9.5pt;margin:0;}',
    '.print-body table.kb-journal-table td{border:0;border-bottom:0.5pt solid #f1f5f9;padding:4pt 8pt;}',
    '.print-body table.kb-journal-table td.kb-jr-desc-d{padding-left:8pt;}',
    '.print-body table.kb-journal-table td.kb-jr-desc-k{padding-left:24pt;color:#64748b;}',

    /* Callouts — atomic, never cut */
    '.print-body .kb-tip,.print-body .kb-warning,.print-body .kb-example{border-radius:4pt;padding:8pt 10pt;margin:8pt 0;font-size:11pt;break-inside:avoid;}',
    '.print-body .kb-tip{background:#f0fdf4;border:0.75pt solid #86efac;color:#065f46;}',
    '.print-body .kb-warning{background:#fef2f2;border:0.75pt solid #fca5a5;color:#991b1b;}',
    '.print-body .kb-example{background:#eff6ff;border:0.75pt solid #93c5fd;color:#1e40af;}',

    /* Formula — atomic */
    '.print-body .kb-formula{background:#f8fafc;border:0.75pt solid #cbd5e1;border-radius:4pt;padding:8pt 10pt;margin:8pt 0;text-align:center;font-family:ui-monospace,Consolas,monospace;font-weight:700;font-size:10.5pt;color:#0f172a;break-inside:avoid;}',

    /* Quick facts */
    '.print-body .kb-quickfact{display:flex;flex-wrap:wrap;gap:6pt;margin:8pt 0;break-inside:avoid;}',
    '.print-body .kb-quickfact-item{flex:1 1 90pt;background:#f8fafc;border:0.75pt solid #cbd5e1;border-radius:4pt;padding:6pt 8pt;text-align:center;}',
    '.print-body .qf-label{font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;}',
    '.print-body .qf-value{font-family:"Times New Roman",Times,serif;font-size:11pt;font-weight:800;margin-top:2pt;}',

    /* Footer berjalan */
    '.print-running-footer{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-between;gap:12pt;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#94a3b8;border-top:0.5pt solid #e2e8f0;padding-top:3pt;}',
    '.kb-print-doc{padding-bottom:26pt;}'
  ].join('');

  function docCss(paperId) {
    var pageCss = window.PaperConfig ? window.PaperConfig.getPageCss(paperId) : '@page{size:A4;margin:15mm 14mm;}';
    return pageCss + DOC_BASE_CSS;
  }

  /* ════════════════════════════════════════════════════════════════
     LAYER C — OUTPUT (Browser Print / PDF Export)
     Keduanya menerima paperId ('a4'|'f4') + document model yang sama.
     ════════════════════════════════════════════════════════════════ */

  function printDocument(paperId) {
    var content = STATE.content;
    var docTitle = content.title || 'Modul Pengetahuan';

    // Build print document
    var holder = document.createElement('div');
    holder.id = 'kb-print-fallback';
    holder.appendChild(buildPrintDocument(content));
    var footer = document.createElement('div');
    footer.className = 'print-running-footer';
    footer.innerHTML = '<span>' + escapeHtml(docTitle) + '</span><span>Portal Belajar &middot; DJP</span>';
    holder.appendChild(footer);
    document.body.appendChild(holder);

    // Inject print CSS: @page for paper size + DOC_BASE_CSS + hide everything except holder
    var styleId = 'kb-print-fallback-style';
    var old = document.getElementById(styleId);
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = styleId;
    // @page size via PaperConfig (A4/F4). Browser native print dialog will honor this as default.
    var pageCss = window.PaperConfig ? window.PaperConfig.getPageCss(paperId) : '@page{size:F4;margin:15mm 14mm;}';
    st.textContent =
      pageCss +
      DOC_BASE_CSS +
      '@media print{body>*:not(#kb-print-fallback){display:none!important;}' +
      '#kb-print-fallback{display:block!important;}}';
    document.head.appendChild(st);

    // Native print dialog → user chooses paper size (A4/F4), color, pages/sheet, etc.
    var cleanup = function () {
      setTimeout(function () {
        holder.remove();
        var s = document.getElementById(styleId);
        if (s) s.remove();
        window.removeEventListener('afterprint', cleanup);
      }, 400);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    cleanup();
  }

  function downloadDocument(paperId, setStatus) {
    if (STATE.pdfBusy) return;
    var content = STATE.content;
    var chapters = (content && content.chapters) || [];
    if (!chapters.length) {
      setStatus('Konten modul kosong.', true);
      return;
    }
    if (!window.PDFExport || !window.PDFExport.exportElementToPDF) {
      setStatus('Mesin PDF tidak tersedia. Gunakan tombol Cetak sebagai alternatif.', true);
      return;
    }

    STATE.pdfBusy = true;
    setStatus('Menyiapkan PDF…');

    var p = paper(paperId);
    var docTitle = content.title || 'Modul Pengetahuan';
    var fileName = slug(docTitle, 'modul-pengetahuan') + '.pdf';

    var docEl = buildPrintDocument(content);

    window.PDFExport.exportElementToPDF(docEl, {
      filename: fileName,
      widthPx: p ? p.pxWidthAt96dpi : 794,
      scale: 2,
      format: p ? [p.widthMm, p.heightMm] : 'a4',
      margin: window.PaperConfig ? window.PaperConfig.getMarginArray(paperId) : [15, 14, 15, 14],
      extraCss: docCss(paperId),
      footer: {
        text: docTitle,
        pageNumbers: true,
        fontSize: 8,
        color: [148, 163, 184],
        marginMm: 14
      },
      // Chapter break ditangani oleh CSS `break-before:page` pada
      // `.print-chapter` (mode 'css'). Tidak pakai opsi `before` legacy
      // untuk menghindari double-break → halaman kosong. Opsi `avoid`
      // mencegah elemen atomik terpotong.
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['tr', '.kb-tip', '.kb-warning', '.kb-example', '.kb-formula', '.kb-journal', '.kb-quickfact-item', '.print-chapter-title', '.print-section-title']
      }
    })
      .then(function () {
        setStatus('PDF berhasil diunduh.');
        setTimeout(function () { setStatus(''); }, 2500);
      })
      .catch(function (err) {
        console.error('[knowledge-base] PDF error:', err);
        setStatus((err && err.message ? err.message : 'Gagal membuat PDF.') + ' Silakan coba lagi atau gunakan Cetak → Simpan sebagai PDF.', true);
      })
      .then(function () {
        STATE.pdfBusy = false;
      });
  }

  /* ════════════════════════════════════════════════════════════════
     OUTPUT CONFIG DIALOG — A4/F4 sebagai bagian dari fungsi Cetak/Unduh
     (bukan dropdown yang berdiri sendiri di header).
     Accessible: role=dialog, ESC menutup, radio berlabel, focus trap.
     Tidak pernah ikut tercetak (hanya ada di screen layer).
     ════════════════════════════════════════════════════════════════ */

  /* ════════════════════════════════════════════════════════════════
     LAYER A — SCREEN / INTERACTIVE UI (modal)
     ════════════════════════════════════════════════════════════════ */

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
      navHtml += `<li class="kb-nav-chapter" data-kb-chapter="${escapeAttr(chapterId)}">`;
      navHtml += `<button type="button" class="kb-nav-toggle" aria-expanded="false" aria-controls="kb-sub-${escapeAttr(chapterId)}" data-kb-toggle="${escapeAttr(chapterId)}">`;
      navHtml += `<span class="kb-chevron" aria-hidden="true">▸</span>`;
      navHtml += `<span class="kb-nav-toggle-label">${escapeHtml(chapter.title)}</span>`;
      navHtml += `</button>`;
      if (hasSub) {
        navHtml += `<ul class="kb-nav-sublist" id="kb-sub-${escapeAttr(chapterId)}" hidden>`;
        chapter.sections.forEach((section, si) => {
          const sectionId = section.id || slug(section.heading, chapterId + '-' + (si + 1));
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
        if (action === 'print') printDocument('f4');
        if (action === 'download') downloadDocument('f4', setStatus);
        return;
      }

      const link = e.target.closest('.kb-nav-link');
      if (link) {
        e.preventDefault();
        const targetId = link.getAttribute('data-kb-target');
        const targetEl = overlay.querySelector('#' + CSS.escape(targetId));
        if (targetEl) {
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
      if (e.key === 'Escape') {
        close();
      }
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

  function open(content) {
    if (!content || !content.chapters || !content.chapters.length) {
      console.error('[knowledge-base] Konten kosong atau tidak valid.');
      return;
    }
    close();
    STATE.content = content;
    STATE.pdfBusy = false;
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