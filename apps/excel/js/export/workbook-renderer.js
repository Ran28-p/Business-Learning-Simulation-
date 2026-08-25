/**
 * workbook-renderer.js
 * ---------------------------------------------------------------------------
 * Menerjemahkan Workbook Blueprint (workbook-blueprint.js) menjadi file
 * .xlsx sungguhan lewat ExcelJS. Ini SATU-SATUNYA file yang menyentuh
 * ExcelJS langsung — supaya blueprint tetap murni data dan gampang diuji.
 *
 * Kenapa ExcelJS, bukan SheetJS (xlsx) seperti sebelumnya:
 * SheetJS versi Community (yang dipakai sebelumnya) MENDOKUMENTASIKAN format
 * objek style (font/fill/border) tapi diam-diam TIDAK menuliskannya ke file
 * saat export — styling penuh adalah fitur SheetJS Pro (berbayar). Ini
 * terverifikasi langsung dengan membedah XML hasil ekspor: cell.s yang
 * diisi tidak pernah muncul di styles.xml. Itulah akar masalah "output
 * terlihat seperti data mentah" yang dikeluhkan. ExcelJS bersifat open
 * source penuh dan benar-benar menuliskan font/fill/border/numFmt/merge/
 * freeze pane/Table/autofilter ke file — sudah diverifikasi langsung pada
 * XML hasil ekspornya sebelum dipakai di sini.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const T = () => window.WorkbookExport.THEME;
  const fmt = () => window.WorkbookExport.getExcelNumberFormat;
  const colWidth = () => window.WorkbookExport.calculateColumnWidth;

  const PRACTICE_COLS = 10; // A..J
  const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30); // dasar serial number Excel (kompatibel leap-year bug 1900)

  function serialToJsDate(serial) {
    return new Date(EXCEL_EPOCH_MS + serial * 86400000);
  }

  function setMergedText(ws, range, text, style, rowHeight) {
    ws.mergeCells(range);
    const topLeftRef = range.split(':')[0];
    const cell = ws.getCell(topLeftRef);
    cell.value = text;
    Object.assign(cell, styleAssign(style));
    if (rowHeight) {
      const rowNum = Number(topLeftRef.match(/\d+/)[0]);
      ws.getRow(rowNum).height = rowHeight;
    }
    return cell;
  }

  // ExcelJS cells want font/fill/border/alignment set as properties, not one blob —
  // this small helper spreads a THEME entry onto a cell consistently everywhere.
  function styleAssign(style) {
    const out = {};
    if (style.font) out.font = style.font;
    if (style.fill) out.fill = style.fill;
    if (style.alignment) out.alignment = style.alignment;
    if (style.border) out.border = style.border;
    return out;
  }
  function applyStyle(cell, style) {
    Object.assign(cell, styleAssign(style));
  }

  /** Estimasi jumlah baris terbungkus (wrapText) & tinggi baris — ExcelJS tidak
   *  menghitung metrik teks otomatis, jadi kita perkirakan dari panjang teks
   *  dibanding lebar kolom gabungan, supaya teks panjang tidak pernah terpotong
   *  jadi satu baris (Bagian 13 spesifikasi). */
  function estimateWrappedLines(text, mergedWidthChars) {
    const usableCharsPerLine = Math.max(15, mergedWidthChars * 1.75);
    return Math.max(1, Math.ceil(String(text || '').length / usableCharsPerLine));
  }
  function wrappedRowHeight(text, mergedWidthChars, fontSize = 11, minHeight = 18) {
    const lines = estimateWrappedLines(text, mergedWidthChars);
    return Math.max(minHeight, lines * (fontSize * 1.55) + 8);
  }

  // ===========================================================================
  // SHEET 1 — Practice
  // ===========================================================================
  function renderPracticeSheet(wb, blueprint) {
    const ws = wb.addWorksheet('Latihan', { properties: { tabColor: { argb: T().palette.green700 } } });
    ws.columns = Array.from({ length: PRACTICE_COLS }, () => ({ width: 11.5 }));
    const mergedWidthFull = 11.5 * PRACTICE_COLS;
    let r = 1;

    setMergedText(ws, `A${r}:J${r}`, `${blueprint.meta.workbookTitle}`, T().workbookTitle, 30); r += 1;
    setMergedText(ws, `A${r}:J${r}`, `${blueprint.meta.datasetLabel} — ${blueprint.meta.levelLabel}`, T().workbookSubtitle, 20); r += 1;
    r += 1; // spacer

    setMergedText(ws, `A${r}:J${r}`, '🎯  TUJUAN PEMBELAJARAN', T().sectionHeading, 20); r += 1;
    const objHeight = wrappedRowHeight(blueprint.meta.objective, mergedWidthFull);
    setMergedText(ws, `A${r}:J${r + 1}`, blueprint.meta.objective, T().bodyText, objHeight); r += 2;
    r += 1;

    setMergedText(ws, `A${r}:J${r}`, '📋  PETUNJUK PENGERJAAN', T().sectionHeading, 20); r += 1;
    blueprint.meta.instructions.forEach((line) => {
      const h = wrappedRowHeight(`•  ${line}`, mergedWidthFull);
      setMergedText(ws, `A${r}:J${r}`, `•  ${line}`, T().bodyText, h); r += 1;
    });
    r += 1;

    blueprint.practice.questions.forEach((q) => {
      // Blueprint menetapkan alamat input sebagai kontrak. Renderer menurunkan
      // baris awal soal dari alamat itu, bukan menjadikannya hasil samping dari
      // counter layout; dengan demikian, alamat di Kunci Jawaban tidak bergeser.
      if (q.answerCell) {
        const answerRow = Number(q.answerCell.match(/\d+$/)?.[0]);
        if (!Number.isInteger(answerRow)) throw new Error(`Alamat jawaban tidak valid: ${q.answerCell}`);
        r = answerRow - 2 - (q.suggestedFunctions.length ? 1 : 0);
      }

      // Baris judul: badge nomor (A) + judul (B:J)
      ws.mergeCells(`A${r}:A${r + 1}`);
      const badge = ws.getCell(`A${r}`);
      badge.value = `SOAL\n${String(q.number).padStart(2, '0')}`;
      applyStyle(badge, T().questionNumber);
      ws.mergeCells(`B${r}:J${r}`);
      const titleCell = ws.getCell(`B${r}`);
      titleCell.value = `${q.title}  (${q.points} poin)`;
      applyStyle(titleCell, T().questionTitle);
      ws.getRow(r).height = 20;

      // Baris instruksi (B:J, digabung dengan badge di A yang sudah 2 baris)
      const instrHeight = wrappedRowHeight(q.instruction, 11.5 * (PRACTICE_COLS - 1));
      ws.mergeCells(`B${r + 1}:J${r + 1}`);
      const instrCell = ws.getCell(`B${r + 1}`);
      instrCell.value = q.instruction;
      applyStyle(instrCell, T().questionBody);
      ws.getRow(r + 1).height = Math.max(20, instrHeight);
      r += 2;

      if (q.suggestedFunctions.length) {
        setMergedText(ws, `A${r}:J${r}`, `Fungsi yang disarankan: ${q.suggestedFunctions.join(', ')}`, T().fieldLabel, 18);
        r += 1;
      }

      // Baris input formula
      setMergedText(ws, `A${r}:C${r}`, 'Formula Jawaban Anda:', T().fieldLabel, 22);
      ws.mergeCells(`D${r}:J${r}`);
      applyStyle(ws.getCell(`D${r}`), T().inputCell);
      ws.getRow(r).height = 22;
      r += 1;

      // Baris hasil (opsional diisi manual)
      setMergedText(ws, `A${r}:C${r}`, 'Hasil Akhir:', T().fieldLabel, 20);
      ws.mergeCells(`D${r}:F${r}`);
      applyStyle(ws.getCell(`D${r}`), T().inputCell);
      ws.getRow(r).height = 20;
      r += 1;

      if (q.hint) {
        const hintText = `💡 Hint: ${q.hint}`;
        const hintHeight = wrappedRowHeight(hintText, mergedWidthFull);
        setMergedText(ws, `A${r}:J${r}`, hintText, T().hintText, hintHeight);
        r += 1;
      }
      r += 1; // spacer antar soal
    });

    ws.views = [{ state: 'frozen', ySplit: 2 }];
    ws.pageSetup = { orientation: 'portrait', fitToWidth: 1, fitToPage: true };
    return ws;
  }

  // ===========================================================================
  // SHEET 2 — Dataset
  // ===========================================================================
  function renderDatasetSheet(wb, blueprint) {
    const ws = wb.addWorksheet('Dataset', { properties: { tabColor: { argb: T().palette.green600 } } });
    const { headers, columnTypes, semantics, rows } = blueprint.dataset;

    setMergedText(ws, `A1:${colLetter(headers.length)}1`, `📊  DATASET — ${blueprint.meta.datasetLabel}`, T().workbookTitle, 26);
    setMergedText(ws, `A2:${colLetter(headers.length)}2`, `${rows.length.toLocaleString('id-ID')} baris data · dibuat otomatis untuk latihan ini`, T().workbookSubtitle, 18);

    const headerRowIdx = 4;
    const tableRows = rows.map((row) => row.map((v, c) => {
      if (semantics[c] === 'date' && typeof v === 'number') return serialToJsDate(v);
      return v;
    }));

    ws.addTable({
      name: 'TabelDataset',
      ref: `A${headerRowIdx}`,
      headerRow: true,
      style: { theme: 'TableStyleMedium9', showRowStripes: true },
      columns: headers.map((h) => ({ name: h, filterButton: true })),
      rows: tableRows,
    });

    // Styling header tabel (addTable sudah membuat header, kita timpa styling-nya
    // supaya konsisten dengan tema workbook, bukan warna default TableStyleMedium9).
    for (let c = 0; c < headers.length; c += 1) {
      const headerCell = ws.getCell(headerRowIdx, c + 1);
      applyStyle(headerCell, T().tableHeader);
    }

    // Format angka & lebar kolom per-semantik (Bagian 8, 21, 22)
    for (let c = 0; c < headers.length; c += 1) {
      const semantic = semantics[c];
      const numFmt = fmt()({ semantic });
      const colValues = rows.map((r) => r[c]);
      const width = colWidth()(colValues, { header: headers[c], semantic });
      const col = ws.getColumn(c + 1);
      col.width = width;

      for (let rIdx = 0; rIdx < rows.length; rIdx += 1) {
        const cell = ws.getCell(headerRowIdx + 1 + rIdx, c + 1);
        if (numFmt !== 'General') cell.numFmt = numFmt;
        const cellStyleBase = semantic === 'currency' || semantic === 'integer' || semantic === 'decimal' || semantic === 'percentage'
          ? T().tableCellNumber
          : (semantic === 'id' || semantic === 'date' || semantic === 'category' ? T().tableCellCenter : T().tableCellText);
        applyStyle(cell, cellStyleBase);
        if (rIdx % 2 === 1) cell.fill = T().tableCellAlt.fill;
      }
    }

    ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];
    return ws;
  }

  // ===========================================================================
  // SHEET 3 — Answer Key (hidden by default)
  // ===========================================================================
  function renderAnswerKeySheet(wb, blueprint) {
    const ws = wb.addWorksheet('Kunci Jawaban', { state: 'hidden', properties: { tabColor: { argb: 'FF9E2A22' } } });
    const headers = ['No', 'Sel Jawaban', 'Soal', 'Formula yang Diharapkan', 'Hasil yang Diharapkan', 'Fungsi', 'Penjelasan'];
    const headerRowIdx = 2;

    setMergedText(ws, `A1:G1`, '🔒  KUNCI JAWABAN — Jangan dilihat sebelum mencoba sendiri!', T().workbookTitle, 22);

    headers.forEach((h, c) => {
      const cell = ws.getCell(headerRowIdx, c + 1);
      cell.value = h;
      applyStyle(cell, T().tableHeader);
    });

    blueprint.answerKey.questions.forEach((q, i) => {
      const rowIdx = headerRowIdx + 1 + i;
            const answerCell = q.answerCell || '—';
      const values = [q.number, answerCell, q.instruction, q.expectedFormula, q.expectedValue, q.acceptedFunctions, q.explanation];
      values.forEach((v, c) => {
        const cell = ws.getCell(rowIdx, c + 1);
        cell.value = v;
        const isNum = c === 0 || c === 4;
        applyStyle(cell, isNum ? T().tableCellNumber : T().tableCellText);
        cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' };
        if (c === 1 && q.answerCell) {
          cell.value = {
            text: q.answerCell,
            hyperlink: `#'Latihan'!${q.answerCell}`,
            tooltip: `Buka sel ${q.answerCell} di Sheet Latihan`,
          };
          cell.font = { ...(cell.font || {}), underline: true, color: { argb: 'FF004C87' } };
        }
      });
      ws.getRow(rowIdx).height = wrappedRowHeight(q.instruction, 40);
    });

    ws.columns = [{ width: 6 }, { width: 14 }, { width: 40 }, { width: 26 }, { width: 16 }, { width: 20 }, { width: 45 }];
    ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];
    return ws;
  }

  // ===========================================================================
  // SHEET 4 — Guide (fungsi yang dipakai paket soal ini)
  // ===========================================================================
  function renderGuideSheet(wb, blueprint) {
    const ws = wb.addWorksheet('Panduan Fungsi', { properties: { tabColor: { argb: T().palette.amber700 } } });
    ws.columns = [{ width: 4 }, { width: 96 }];
    let r = 1;
    setMergedText(ws, `A${r}:B${r}`, '📘  PANDUAN FUNGSI EXCEL PADA PAKET SOAL INI', T().workbookTitle, 26); r += 1;
    setMergedText(ws, `A${r}:B${r}`, `${blueprint.guide.entries.length} fungsi dipakai pada Level ${blueprint.meta.level} — ${blueprint.meta.levelLabel}`, T().workbookSubtitle, 18); r += 2;

    blueprint.guide.entries.forEach((entry) => {
      setMergedText(ws, `A${r}:B${r}`, entry.name, T().guideFunctionName, 22); r += 1;
      setMergedText(ws, `A${r}:B${r}`, `Sintaks: ${entry.syntax}`, T().guideSyntax, wrappedRowHeight(entry.syntax, 96, 10.5)); r += 1;
      setMergedText(ws, `A${r}:B${r}`, entry.description, T().guideBody, wrappedRowHeight(entry.description, 96, 10.5)); r += 1;
      if (entry.example) {
        setMergedText(ws, `A${r}:B${r}`, `Contoh: ${entry.example}`, T().guideSyntax, wrappedRowHeight(entry.example, 96, 10.5)); r += 1;
      }
      if (entry.commonErrors && entry.commonErrors.length) {
        const errText = 'Kesalahan umum: ' + entry.commonErrors.join(' | ');
        setMergedText(ws, `A${r}:B${r}`, errText, T().warningText, wrappedRowHeight(errText, 96, 10)); r += 1;
      }
      r += 1;
    });

    ws.views = [{ state: 'frozen', ySplit: 2 }];
    return ws;
  }

  // ===========================================================================
  // SHEET 5 — Helper (metadata teknis, veryHidden)
  // ===========================================================================
  function renderHelperSheet(wb, blueprint) {
    const ws = wb.addWorksheet('Helper', { state: 'veryHidden' });
    ws.columns = [{ width: 22 }, { width: 60 }];
    const h = blueprint.helper;
    const entries = [
      ['generatorVersion', h.generatorVersion],
      ['datasetType', h.datasetType],
      ['datasetSeed', String(h.datasetSeed)],
      ['level', h.level],
      ['questionCount', h.questionCount],
      ['generatedAt', h.generatedAt],
      ['questionFingerprints', h.questionFingerprints.join(' | ')],
    ];
    entries.forEach(([k, v], i) => {
      ws.getCell(i + 1, 1).value = k;
      applyStyle(ws.getCell(i + 1, 1), T().helperLabel);
      ws.getCell(i + 1, 2).value = v;
      applyStyle(ws.getCell(i + 1, 2), T().helperValue);
    });
    return ws;
  }

  function colLetter(n) {
    let s = '';
    let x = n;
    while (x > 0) {
      const m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - m) / 26);
    }
    return s;
  }

  /**
   * renderBlueprintToWorkbook — titik masuk utama. Mengembalikan Promise<ArrayBuffer>.
   */
  async function renderBlueprintToWorkbook(blueprint) {
    if (typeof ExcelJS === 'undefined') throw new Error('ExcelJS belum dimuat.');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Excel Formula Practice Generator';
    wb.created = blueprint.meta.generatedAt;
    wb.views = [{ activeTab: 0 }];

    renderPracticeSheet(wb, blueprint);   // sheet pertama & aktif — sesuai Bagian 26
    renderDatasetSheet(wb, blueprint);
    renderAnswerKeySheet(wb, blueprint);
    renderGuideSheet(wb, blueprint);
    renderHelperSheet(wb, blueprint);

    return wb.xlsx.writeBuffer();
  }

  window.WorkbookExport = window.WorkbookExport || {};
  window.WorkbookExport.renderBlueprintToWorkbook = renderBlueprintToWorkbook;
})();
