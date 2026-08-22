/**
 * workbook-theme.js
 * ---------------------------------------------------------------------------
 * Tema visual terpusat untuk workbook .xlsx yang diekspor (Bagian 23 dari
 * spesifikasi redesign). Semua sheet memakai palet & tipografi yang sama
 * supaya workbook terasa dirancang, bukan tempelan warna acak per-fungsi.
 *
 * Ditulis sebagai objek ExcelJS style siap-pakai (font/fill/border/alignment)
 * supaya renderer tinggal men-spread-kan ke `cell.font = THEME.xxx.font`, dst.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const PALETTE = {
    green900: 'FF0F3D26',
    green700: 'FF1D6F42', // sama dengan --efpg-green-700 di css/style.css
    green600: 'FF23874F',
    green100: 'FFE4F4EA',
    green50: 'FFF2FAF5',
    ink900: 'FF16211C',
    ink700: 'FF33443B',
    ink500: 'FF5C6D63',
    paper: 'FFFFFFFF',
    canvas: 'FFF5F7F5',
    line: 'FFDCE6DF',
    lineStrong: 'FFC2D0C6',
    amber700: 'FF8A5A0B',
    amber100: 'FFFCEFD7',
    inputBg: 'FFFFFDF0',
    inputBorder: 'FFE0B33D',
    white: 'FFFFFFFF',
  };

  const FONT_FAMILY = 'Calibri';

  const border = (style, color) => ({ style, color: { argb: color || PALETTE.line } });
  const thinAll = (color) => ({
    top: border('thin', color), left: border('thin', color),
    bottom: border('thin', color), right: border('thin', color),
  });

  const THEME = {
    palette: PALETTE,

    workbookTitle: {
      font: { name: FONT_FAMILY, size: 20, bold: true, color: { argb: PALETTE.white } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.green700 } },
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: false },
    },
    workbookSubtitle: {
      font: { name: FONT_FAMILY, size: 12, bold: false, italic: true, color: { argb: PALETTE.green100 } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.green700 } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    },
    sectionHeading: {
      font: { name: FONT_FAMILY, size: 12.5, bold: true, color: { argb: PALETTE.white } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.green600 } },
      alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
    },
    bodyText: {
      font: { name: FONT_FAMILY, size: 11, color: { argb: PALETTE.ink700 } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    },
    metaLabel: {
      font: { name: FONT_FAMILY, size: 10, bold: true, color: { argb: PALETTE.ink500 } },
      alignment: { horizontal: 'left', vertical: 'top' },
    },
    questionNumber: {
      font: { name: FONT_FAMILY, size: 13, bold: true, color: { argb: PALETTE.white } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.green700 } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinAll(PALETTE.green700),
    },
    questionTitle: {
      font: { name: FONT_FAMILY, size: 12.5, bold: true, color: { argb: PALETTE.ink900 } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.green50 } },
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 },
      border: thinAll(PALETTE.lineStrong),
    },
    questionBody: {
      font: { name: FONT_FAMILY, size: 11, color: { argb: PALETTE.ink700 } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
      border: { left: border('thin', PALETTE.lineStrong), right: border('thin', PALETTE.lineStrong), bottom: border('thin', PALETTE.lineStrong) },
    },
    fieldLabel: {
      font: { name: FONT_FAMILY, size: 10, bold: true, italic: true, color: { argb: PALETTE.ink500 } },
      alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
      border: { left: border('thin', PALETTE.lineStrong), right: border('thin', PALETTE.lineStrong) },
    },
    inputCell: {
      font: { name: FONT_FAMILY, size: 11, color: { argb: PALETTE.ink900 }, italic: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.inputBg } },
      alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
      border: thinAll(PALETTE.inputBorder),
    },
    hintText: {
      font: { name: FONT_FAMILY, size: 10, italic: true, color: { argb: PALETTE.amber700 } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.amber100 } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
      border: { left: border('thin', PALETTE.lineStrong), right: border('thin', PALETTE.lineStrong), bottom: border('thin', PALETTE.lineStrong) },
    },
    tableHeader: {
      font: { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: PALETTE.white } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.green700 } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: thinAll(PALETTE.green900),
    },
    tableCellText: {
      font: { name: FONT_FAMILY, size: 10.5, color: { argb: PALETTE.ink700 } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinAll(PALETTE.line),
    },
    tableCellNumber: {
      font: { name: FONT_FAMILY, size: 10.5, color: { argb: PALETTE.ink700 } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: thinAll(PALETTE.line),
    },
    tableCellCenter: {
      font: { name: FONT_FAMILY, size: 10.5, color: { argb: PALETTE.ink700 } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinAll(PALETTE.line),
    },
    tableCellAlt: {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.canvas } },
    },
    guideFunctionName: {
      font: { name: 'Consolas', size: 12, bold: true, color: { argb: PALETTE.green700 } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.green50 } },
      alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
      border: thinAll(PALETTE.lineStrong),
    },
    guideSyntax: {
      font: { name: 'Consolas', size: 10.5, color: { argb: PALETTE.ink900 } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.canvas } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
      border: { left: border('thin', PALETTE.lineStrong), right: border('thin', PALETTE.lineStrong) },
    },
    guideBody: {
      font: { name: FONT_FAMILY, size: 10.5, color: { argb: PALETTE.ink700 } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
      border: { left: border('thin', PALETTE.lineStrong), right: border('thin', PALETTE.lineStrong), bottom: border('thin', PALETTE.lineStrong) },
    },
    warningText: {
      font: { name: FONT_FAMILY, size: 10, color: { argb: 'FF9E2A22' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBE2DF' } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
    },
    helperLabel: {
      font: { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: PALETTE.ink500 } },
    },
    helperValue: {
      font: { name: 'Consolas', size: 9.5, color: { argb: PALETTE.ink700 } },
    },
  };

  window.WorkbookExport = window.WorkbookExport || {};
  window.WorkbookExport.THEME = THEME;
})();
