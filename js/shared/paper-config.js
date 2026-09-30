/**
 * paper-config.js — Unified Paper Size Configuration for PDF/Print
 * 
 * Single source of truth for A4/F4 dimensions, margins, and CSS @page rules.
 * Used by: pdf-export.js, knowledge-base.js, accounting/taxUI.js, and print CSS.
 * 
 * @module PaperConfig
 */
(function (global) {
  'use strict';

  const PAPER = {
    a4: {
      id: 'a4',
      label: 'A4',
      widthMm: 210,
      heightMm: 297,
      cssSize: 'A4',
      defaultMarginMm: { top: 15, right: 14, bottom: 15, left: 14 },
      pxWidthAt96dpi: 794,   // 210mm * 96dpi / 25.4
      pxHeightAt96dpi: 1123  // 297mm * 96dpi / 25.4
    },
    f4: {
      id: 'f4',
      label: 'F4 (Folio)',
      widthMm: 210,
      heightMm: 330,
      cssSize: '210mm 330mm',
      defaultMarginMm: { top: 15, right: 14, bottom: 15, left: 14 },
      pxWidthAt96dpi: 794,
      pxHeightAt96dpi: 1247
    }
  };

  const DEFAULT_PAPER = 'a4';
  const STORAGE_KEY = 'preferredPaperSize';

  function getPaper(id) {
    const normalized = (id || '').toLowerCase();
    return PAPER[normalized] || PAPER[DEFAULT_PAPER] || Object.values(PAPER)[0];
  }

  function getCurrentPaper() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return getPaper(saved);
    } catch (e) {
      return PAPER[DEFAULT_PAPER];
    }
  }

  function setCurrentPaper(id) {
    const paper = getPaper(id);
    try {
      localStorage.setItem(STORAGE_KEY, paper.id);
    } catch (e) { /* ignore */ }
    return paper;
  }

  function getPageCss(paper, marginOverride) {
    const p = getPaper(paper);
    const m = marginOverride || p.defaultMarginMm;
    return '@page {' +
      'size: ' + p.cssSize + ';' +
      'margin: ' + m.top + 'mm ' + m.right + 'mm ' + m.bottom + 'mm ' + m.left + 'mm;' +
    '}';
  }

  function getPageCssString(paper, marginOverride) {
    return getPageCss(paper, marginOverride);
  }

  function getMarginArray(paper, marginOverride) {
    const m = marginOverride || getPaper(paper).defaultMarginMm;
    return [m.top, m.right, m.bottom, m.left];
  }

  function getPxDimensions(paper) {
    const p = getPaper(paper);
    return { width: p.pxWidthAt96dpi, height: p.pxHeightAt96dpi };
  }

  function getAllPapers() {
    return Object.values(PAPER);
  }

  function getSelectOptions(selectedId) {
    const current = getPaper(selectedId).id;
    return getAllPapers().map(p => 
      '<option value="' + p.id + '"' + (p.id === current ? ' selected' : '') + '>' + p.label + '</option>'
    ).join('');
  }

  global.PaperConfig = {
    PAPER: PAPER,
    DEFAULT_PAPER: DEFAULT_PAPER,
    getPaper: getPaper,
    getCurrentPaper: getCurrentPaper,
    setCurrentPaper: setCurrentPaper,
    getPageCss: getPageCss,
    getPageCssString: getPageCssString,
    getMarginArray: getMarginArray,
    getPxDimensions: getPxDimensions,
    getAllPapers: getAllPapers,
    getSelectOptions: getSelectOptions
  };
})(window);