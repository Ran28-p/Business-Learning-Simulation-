/**
 * pdf-export.js — Centralized PDF export / print engine (Portal Belajar).
 *
 * Dipakai oleh: Accounting Simulator, SPT Simulator, Excel/SQL/PQ (future),
 * dan Knowledge Base bisa migrasi ke sini di iterasi berikutnya.
 *
 * Kenapa file ini ada:
 *   - Sebelumnya setiap modul punya implementasi PDF sendiri-sendiri
 *     (duplikasi), sebagian memakai pola berbahaya
 *     (`position:fixed;left:-10000px;opacity:0`) yang bisa membuat
 *     html2canvas gagal me-render elemen dengan benar di sebagian
 *     browser, dan sebagian tidak memvalidasi hasil Blob sama sekali
 *     (PDF 0 byte / gagal tetap dianggap "berhasil" oleh user).
 *   - File ini menyediakan SATU pipeline PDF yang robust + tervalidasi,
 *     dan SATU util print/download yang bisa dipakai semua modul.
 *
 * API publik (window.PDFExport):
 *   ensureLib()                         -> Promise<void>
 *   exportElementToPDF(element, opts)   -> Promise<Blob>
 *   exportHTMLToPDF(html, opts)         -> Promise<Blob>
 *   printElement(element, opts)         -> void (browser print dialog)
 *   downloadBlob(blob, filename)        -> void
 *   validateBlob(blob, expectedMime)    -> Promise<void> (throws jika invalid)
 *
 * Semua fungsi TIDAK PERNAH membiarkan kegagalan diam-diam: setiap
 * error dilempar sebagai Promise rejection dengan pesan Bahasa
 * Indonesia yang jelas, supaya kode pemanggil bisa menampilkan pesan
 * ke user dan menawarkan fallback "Cetak → Simpan sebagai PDF".
 */
(function (global) {
  'use strict';
  if (global.PDFExport) return; // idempotent guard

  var CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  var HOST_ID = 'pdfExportHost';
  var OVERLAY_ID = 'pdfExportOverlay';

  /* ────────────────────────────────────────────────────────────────
     0. Resolve portal base path (bekerja dari app manapun, sama
        seperti trik yang sudah dipakai knowledge-base.js)
     ──────────────────────────────────────────────────────────────── */
  function resolvePortalBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('/js/shared/pdf-export.js') !== -1) {
        return src.replace(/\/js\/shared\/pdf-export\.js(?:\?.*)?$/, '/');
      }
    }
    // Fallback kasar: asumsikan dipanggil dari apps/<app>/
    return '../../';
  }
  var PORTAL_BASE = resolvePortalBase();

  /* ────────────────────────────────────────────────────────────────
     1. Load html2pdf: vendor lokal dulu, CDN hanya sebagai fallback
        (bukan sebaliknya) — supaya fitur kritis (PDF) tetap bisa
        dipakai offline/lokal.
     ──────────────────────────────────────────────────────────────── */
  var _libPromise = null;
  function ensureLib() {
    if (typeof global.html2pdf !== 'undefined') return Promise.resolve();
    if (_libPromise) return _libPromise;
    _libPromise = new Promise(function (resolve, reject) {
      var local = document.createElement('script');
      local.src = PORTAL_BASE + 'vendor/html2pdf/html2pdf.bundle.min.js';
      local.onload = function () { resolve(); };
      local.onerror = function () {
        console.warn('[pdf-export] Vendor lokal html2pdf tidak ditemukan, mencoba CDN sebagai fallback…');
        var cdn = document.createElement('script');
        cdn.src = CDN_URL;
        cdn.onload = function () { resolve(); };
        cdn.onerror = function () {
          reject(new Error('Library PDF (html2pdf) gagal dimuat, baik dari vendor lokal maupun CDN. Periksa koneksi atau gunakan opsi "Cetak → Simpan sebagai PDF".'));
        };
        document.head.appendChild(cdn);
      };
      document.head.appendChild(local);
    });
    return _libPromise;
  }

  /* ────────────────────────────────────────────────────────────────
     2. Validasi Blob — jangan pernah biarkan file 0 byte / rusak
        dianggap sukses.
     ──────────────────────────────────────────────────────────────── */
  function validateBlob(blob, expectedMime) {
    return Promise.resolve().then(function () {
      if (!(blob instanceof Blob)) {
        throw new Error('Gagal membuat file: hasil bukan Blob yang valid.');
      }
      if (blob.size === 0) {
        throw new Error('Gagal membuat file: hasil kosong (0 byte).');
      }
      if (expectedMime && blob.type && blob.type.indexOf(expectedMime) === -1) {
        // Beberapa browser tidak selalu mengisi blob.type dengan benar,
        // jadi ini peringatan, bukan penyebab gagal mutlak — validasi
        // header di bawah yang menentukan untuk PDF.
        console.warn('[pdf-export] MIME type tidak sesuai harapan:', blob.type, 'vs', expectedMime);
      }
      if (expectedMime === 'application/pdf') {
        return blob.slice(0, 5).arrayBuffer().then(function (buf) {
          var header = String.fromCharCode.apply(null, new Uint8Array(buf));
          if (header !== '%PDF-') {
            throw new Error('Gagal membuat file: konten bukan PDF yang valid (header tidak sesuai).');
          }
        });
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────
     3. Download Blob apapun (PDF, CSV, JSON, XLSX, ...)
     ──────────────────────────────────────────────────────────────── */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  /* ────────────────────────────────────────────────────────────────
     4. Container isolasi ON-SCREEN untuk render sumber PDF.
        TIDAK memakai left:-10000px / opacity:0 / visibility:hidden
        pada elemen sumber, karena pola itu bisa membuat sebagian
        browser gagal melakukan layout/paint sebelum html2canvas
        mengambil snapshot. Sebagai gantinya, elemen dirender di
        posisi normal (fixed, di dalam viewport) tapi DITUTUP oleh
        overlay loading opaque di atasnya, sehingga user tetap tidak
        melihat kontennya "mentah".
     ──────────────────────────────────────────────────────────────── */
  function buildIsolatedHost(widthPx) {
    removeIsolatedHost();

    var host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('style', [
      'position:fixed', 'top:0', 'left:0',
      'width:' + widthPx + 'px', 'min-height:10px',
      'background:#ffffff', 'color:#0f172a',
      'overflow:visible', 'visibility:visible', 'opacity:1',
      'z-index:2147483000'
    ].join(';'));

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('style', [
      'position:fixed', 'inset:0', 'width:100%', 'height:100%',
      'background:rgba(15,23,42,0.92)', 'color:#fff',
      'display:flex', 'align-items:center', 'justify-content:center',
      'flex-direction:column', 'gap:10px',
      'font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif',
      'font-size:14px', 'z-index:2147483647'
    ].join(';'));
    overlay.innerHTML = '<div style="font-size:28px">📄</div><div>Membuat PDF…</div>';

    document.body.appendChild(host);
    document.body.appendChild(overlay);
    return host;
  }

  function removeIsolatedHost() {
    var h = document.getElementById(HOST_ID);
    if (h && h.parentNode) h.parentNode.removeChild(h);
    var o = document.getElementById(OVERLAY_ID);
    if (o && o.parentNode) o.parentNode.removeChild(o);
  }

  function waitForPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setTimeout(resolve, 80);
        });
      });
    });
  }

  /* ────────────────────────────────────────────────────────────────
     5. Bersihkan clone dari elemen interaktif (tombol, input,
        elemen bertanda .no-print / [data-pdf-exclude]) sebelum
        dirender ke PDF.
     ──────────────────────────────────────────────────────────────── */
  function stripInteractiveUI(clone, excludeSelector) {
    var sel = excludeSelector || '.no-print, [data-pdf-exclude], button, input[type="button"], input[type="submit"]';
    clone.querySelectorAll(sel).forEach(function (el) {
      // Jangan hapus <input type="text/number"> yang membawa data (jarang
      // dipakai di area laporan), hanya hapus tombol/aksi murni.
      if (el.matches('.no-print, [data-pdf-exclude], button, input[type="button"], input[type="submit"]')) {
        el.remove();
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────
     6. exportElementToPDF — pipeline utama.
     ──────────────────────────────────────────────────────────────── */
  function exportElementToPDF(element, options) {
    options = options || {};
    if (!element) {
      return Promise.reject(new Error('Elemen sumber PDF tidak ditemukan.'));
    }
    var filename = options.filename || 'Dokumen.pdf';
    var widthPx = options.widthPx || 794; // ~ A4 @ 96dpi
    var excludeSelector = options.excludeSelector;
    var extraCss = options.extraCss || '';
    var margin = options.margin || [10, 12, 12, 12];
    var scale = options.scale || 2;

    return ensureLib().then(function () {
      var host = buildIsolatedHost(widthPx);
      var clone = element.cloneNode(true);
      stripInteractiveUI(clone, excludeSelector);
      if (typeof options.onClone === 'function') {
        try { options.onClone(clone); } catch (e) { console.warn('[pdf-export] onClone error:', e); }
      }
      if (extraCss) {
        var styleTag = document.createElement('style');
        styleTag.textContent = extraCss;
        host.appendChild(styleTag);
      }
      host.appendChild(clone);

      return waitForPaint().then(function () {
        return global.html2pdf()
          .set({
            margin: margin,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: scale,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              logging: false,
              width: widthPx,
              windowWidth: widthPx
            },
            jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait' },
            pagebreak: options.pagebreak || { mode: ['css', 'legacy'], avoid: ['tr', 'table'] }
          })
          .from(clone)
          .outputPdf('blob')
          .then(function (blob) {
            return validateBlob(blob, 'application/pdf').then(function () { return blob; });
          });
      });
    }).then(function (blob) {
      downloadBlob(blob, filename);
      removeIsolatedHost();
      return blob;
    }).catch(function (err) {
      removeIsolatedHost();
      // Selalu lempar ulang dengan pesan yang jelas + arahan fallback,
      // supaya kode pemanggil tidak pernah menganggap ini "berhasil".
      var msg = (err && err.message) ? err.message : 'Gagal membuat PDF.';
      throw new Error(msg + ' Silakan gunakan opsi "Cetak → Simpan sebagai PDF" sebagai alternatif.');
    });
  }

  /* ────────────────────────────────────────────────────────────────
     7. exportHTMLToPDF — sama seperti di atas, tapi sumbernya string
        HTML mentah (dibungkus <div> sementara).
     ──────────────────────────────────────────────────────────────── */
  function exportHTMLToPDF(html, options) {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return exportElementToPDF(wrapper, options);
  }

  /* ────────────────────────────────────────────────────────────────
     8. printElement — cetak HANYA elemen tertentu lewat iframe
        tersembunyi, tanpa perlu setiap halaman punya @media print
        custom. Aman dipakai di modul manapun tanpa risiko merusak
        CSS print yang sudah ada di modul lain (mis. accounting).
     ──────────────────────────────────────────────────────────────── */
  function printElement(element, options) {
    options = options || {};
    if (!element) {
      console.error('[pdf-export] printElement: elemen tidak ditemukan.');
      return;
    }
    var clone = element.cloneNode(true);
    stripInteractiveUI(clone, options.excludeSelector);

    var iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
    document.body.appendChild(iframe);

    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      (options.title || document.title) + '</title>');
    // Salin stylesheet <link> dari halaman induk supaya style tetap konsisten.
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
      doc.write('<link rel="stylesheet" href="' + link.href + '">');
    });
    doc.write('<style>body{margin:0;padding:16px;background:#fff;color:#0f172a;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;} ' +
      (options.extraCss || '') + '</style></head><body></body></html>');
    doc.close();
    doc.body.appendChild(clone);

    function cleanup() {
      setTimeout(function () {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 500);
    }

    // Tunggu stylesheet ter-load sebelum memicu dialog print.
    setTimeout(function () {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('[pdf-export] printElement gagal:', e);
      } finally {
        cleanup();
      }
    }, 350);
  }

  global.PDFExport = {
    ensureLib: ensureLib,
    exportElementToPDF: exportElementToPDF,
    exportHTMLToPDF: exportHTMLToPDF,
    printElement: printElement,
    downloadBlob: downloadBlob,
    validateBlob: validateBlob
  };
})(window);
