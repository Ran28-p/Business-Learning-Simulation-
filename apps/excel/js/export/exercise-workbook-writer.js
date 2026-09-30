/**
 * exercise-workbook-writer.js
 * ---------------------------------------------------------------------------
 * Menerjemahkan ExerciseSpec (js/exercise-generator.js) menjadi file .xlsx
 * SUNGGUHAN lewat ExcelJS. Ini satu-satunya file yang menyentuh ExcelJS
 * untuk engine "Exercise Generator" baru — supaya exercise-generator.js
 * tetap murni data dan gampang diuji tanpa ExcelJS (lihat
 * tests/test-exercise-generator.mjs).
 *
 * WAJIB menghasilkan TEPAT 4 sheet, dalam urutan ini:
 *   Lembar latihan | dataset | kunci jawaban | Penjelasan Rumus
 * TIDAK ADA freeze panes, TIDAK ADA sheet tambahan, TIDAK ADA blok Tujuan
 * Pembelajaran/Petunjuk Pengerjaan/Ringkasan pembuka/dashboard/card UI —
 * lihat spesifikasi Bagian 1-2. Style (warna header, format angka, posisi
 * judul, baris "Contoh", dst.) meniru contoh_Profesional.xlsx dan
 * contoh_expert.xlsx yang diberikan sebagai acuan wajib.
 *
 * Dipakai dari browser sebagai script global (window.ExerciseWorkbookExport,
 * lihat index.html) dan dari Node (tests/test-exercise-workbook.mjs) dengan
 * window.ExcelJS di-set manual dari paket npm `exceljs` — pola yang sama
 * persis dipakai oleh engine export lama (sudah dihapus bersama sistem
 * latihan interaktif di browser).
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const TEAL = 'FF0A9085';
  const TEAL_LIGHT = 'FFE3F2F0';
  const HEADER_GREY = 'FFF2F2F2';
  const WHITE = 'FFFFFFFF';
  const FONT = 'Calibri';

  function colLetter(index) {
    let n = index;
    let s = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  const THIN = { style: 'thin', color: { argb: 'FF000000' } };
  /** Border penuh 4 sisi — SEMUA sel tabel (nomor, header, Contoh, data) di
   * file contoh punya border ini; tanpa ini tabel terlihat "mengambang"
   * tanpa garis, itulah sumber kesan "acak-acakan" pada versi sebelumnya. */
  function gridBorder(cell) {
    cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  }

  function titleStyle(cell) {
    cell.font = { name: FONT, size: 14, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  function numberingStyle(cell) {
    cell.font = { name: FONT, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.numFmt = '#,##0;\\(#,##0\\);\\-';
    gridBorder(cell);
  }
  function headerStyle(cell) {
    cell.font = { name: FONT, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_GREY } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    gridBorder(cell);
  }
  function contohLabelStyle(cell) {
    cell.font = { name: FONT, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    gridBorder(cell);
  }
  function contohValueStyle(cell) {
    cell.font = { name: FONT, italic: true, color: { argb: 'FF7F7F7F' } };
    gridBorder(cell);
  }
  function dataCellStyle(cell) {
    cell.font = { name: FONT };
    gridBorder(cell);
  }
  function ringkasanLabelStyle(cell) {
    cell.font = { name: FONT, bold: true };
    gridBorder(cell);
  }
  function ringkasanValueStyle(cell) {
    cell.font = { name: FONT, bold: true, color: { argb: 'FF0A6E67' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
    gridBorder(cell);
  }
  function penjelasanHeaderStyle(cell) {
    cell.font = { name: FONT, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    gridBorder(cell);
  }

  /** Menulis sheet "Lembar latihan" ATAU "kunci jawaban" (struktur identik; `withAnswers` membedakan isi kolom jawaban). */
  function writePracticeSheet(ws, spec, withAnswers) {
    const lastCol = Math.max(
      spec.given[spec.given.length - 1].colIndex,
      spec.answer.length ? spec.answer[spec.answer.length - 1].colIndex : 0,
      spec.ringkasanRows.length ? colToIndex(spec.ringkasanValueCol) : 0,
    );

    // Judul
    ws.mergeCells(`B${2}:${colLetter(lastCol)}${2}`);
    const titleCell = ws.getCell(`B2`);
    titleCell.value = spec.title;
    titleStyle(titleCell);
    ws.getRow(2).height = 24;

    // Baris nomor urut (di atas kolom JAWABAN saja, meniru file contoh)
    spec.answer.forEach((col, i) => {
      const cell = ws.getCell(`${col.letter}${6}`);
      cell.value = i + 1;
      numberingStyle(cell);
    });

    // Header
    spec.given.forEach((col) => {
      const cell = ws.getCell(`${col.letter}7`);
      cell.value = col.header;
      headerStyle(cell);
    });
    spec.answer.forEach((col) => {
      const cell = ws.getCell(`${col.letter}7`);
      cell.value = col.header;
      headerStyle(cell);
    });

    // Baris "Contoh"
    const labelContoh = ws.getCell('B8');
    labelContoh.value = 'Contoh';
    contohLabelStyle(labelContoh);
    spec.exampleGiven.forEach((c) => {
      const cell = ws.getCell(`${c.letter}8`);
      cell.value = { formula: toFormula(c.formula) };
      if (c.numFmt && c.numFmt !== 'General') cell.numFmt = c.numFmt;
      contohValueStyle(cell);
    });
    spec.exampleAnswer.forEach((c) => {
      const cell = ws.getCell(`${c.letter}8`);
      cell.value = { formula: toFormula(c.formula) };
      if (c.numFmt && c.numFmt !== 'General') cell.numFmt = c.numFmt;
      contohValueStyle(cell);
    });

    // Baris data (No mulai dari 1, given = link formula ke dataset, jawaban = formula atau kosong)
    spec.practiceRows.forEach((row, i) => {
      const noCell = ws.getCell(`B${row.rowNum}`);
      noCell.value = i + 1;
      dataCellStyle(noCell);
      noCell.alignment = { horizontal: 'center' };

      row.given.forEach((g) => {
        if (g.letter === 'B') return; // kolom No sudah ditulis di atas
        const cell = ws.getCell(`${g.letter}${row.rowNum}`);
        cell.value = { formula: toFormula(g.formula) };
        if (g.numFmt && g.numFmt !== 'General') cell.numFmt = g.numFmt;
        dataCellStyle(cell);
      });

      row.answer.forEach((a) => {
        const cell = ws.getCell(`${a.letter}${row.rowNum}`);
        if (withAnswers) {
          cell.value = { formula: toFormula(a.formula) };
          if (a.numFmt && a.numFmt !== 'General') cell.numFmt = a.numFmt;
        } else {
          cell.value = null; // WAJIB kosong — inilah yang harus dikerjakan siswa
        }
        dataCellStyle(cell);
      });
    });

    // Ringkasan (blok KPI DI BAWAH tabel data — lihat exercise-generator.js)
    if (spec.ringkasanRows.length) {
      const ringkasanLabelRow = spec.ringkasanRows[0].row - 1;
      const ringkasanTitle = ws.getCell(`B${ringkasanLabelRow}`);
      ringkasanTitle.value = 'Ringkasan:';
      ringkasanTitle.font = { name: FONT, bold: true };
      spec.ringkasanRows.forEach((r) => {
        const labelCell = ws.getCell(`${r.labelCol}${r.row}`);
        labelCell.value = r.label;
        ringkasanLabelStyle(labelCell);
        const valueCell = ws.getCell(`${r.valueCol}${r.row}`);
        if (withAnswers) {
          valueCell.value = { formula: toFormula(r.formula) };
          if (r.numFmt && r.numFmt !== 'General') valueCell.numFmt = r.numFmt;
        } else {
          valueCell.value = null;
        }
        ringkasanValueStyle(valueCell);
      });
    }

    // "Soal:" + daftar soal, DI BAWAH blok Ringkasan (supaya tidak tabrakan)
    const lastRingkasanRow = spec.ringkasanRows.length
      ? spec.ringkasanRows[spec.ringkasanRows.length - 1].row
      : spec.practiceRows[spec.practiceRows.length - 1].rowNum;
    const soalLabelRow = lastRingkasanRow + 2;
    const soalLabel = ws.getCell(`B${soalLabelRow}`);
    soalLabel.value = 'Soal:';
    soalLabel.font = { name: FONT, bold: true };
    spec.soal.forEach((line, i) => {
      const r = soalLabelRow + 1 + i;
      ws.mergeCells(`B${r}:${colLetter(lastCol)}${r}`);
      const cell = ws.getCell(`B${r}`);
      cell.value = line;
      cell.font = { name: FONT };
      cell.alignment = { horizontal: 'left', wrapText: true };
    });

    // Lebar kolom — meniru proporsi file contoh (kolom teks lebih lebar dari angka)
    ws.getColumn(1).width = 3;
    ws.getColumn(2).width = 7;
    [...spec.given.slice(1), ...spec.answer].forEach((col) => {
      const idx = col.colIndex;
      const wide = col.type === 'text';
      ws.getColumn(idx).width = wide ? 19 : 13;
    });
    if (spec.ringkasanRows.length) {
      ws.getColumn(colToIndex(spec.ringkasanLabelCol)).width = 26;
      ws.getColumn(colToIndex(spec.ringkasanValueCol)).width = 16;
    }

    // WAJIB: tidak ada Freeze Panes.
    ws.views = [];
  }

  /**
   * Fungsi yang diperkenalkan setelah Excel 2007 (mis. XLOOKUP) WAJIB
   * ditulis dengan awalan "_xlfn." pada teks formula mentah di dalam file
   * .xlsx — ini aturan format OOXML itu sendiri, bukan sekadar preferensi
   * gaya penulisan: tanpa awalan ini, Excel & pembaca lain akan
   * memperlakukan nama fungsi sebagai referensi nama tak dikenal dan
   * menampilkan #NAME?. ExcelJS TIDAK menambahkan awalan ini secara
   * otomatis, jadi harus ditambahkan manual di sini — satu tempat saja,
   * supaya exercise-generator.js tetap menulis formula yang mudah dibaca
   * manusia (dipakai apa adanya di sheet "Penjelasan Rumus").
   */
  function applyCompatPrefixes(formula) {
    return formula
      .replace(/(?<!_xlfn\.)\bXLOOKUP\(/g, '_xlfn.XLOOKUP(')
      .replace(/(?<!_xlfn\.)\bLET\(/g, '_xlfn.LET(')
      .replace(/(?<!_xlfn\.)\bTEXTJOIN\(/g, '_xlfn.TEXTJOIN(');
  }

  /** Ambil teks formula (tanpa '=' di depan) siap ditulis ke cell.value.formula. */
  function toFormula(excelFormulaWithEquals) {
    return applyCompatPrefixes(excelFormulaWithEquals.slice(1));
  }

  function colToIndex(letter) {
    let n = 0;
    for (let i = 0; i < letter.length; i++) n = n * 26 + (letter.charCodeAt(i) - 64);
    return n;
  }

  function writeDatasetSheet(ws, spec) {
    const { dataset, datasetMasterRanges } = spec;
    const lastMainCol = 1 + dataset.headers.length;
    const lastCol = datasetMasterRanges.length
      ? datasetMasterRanges[datasetMasterRanges.length - 1].startCol + datasetMasterRanges[datasetMasterRanges.length - 1].table.headers.length - 1
      : lastMainCol;

    ws.mergeCells(`B2:${colLetter(lastCol)}2`);
    const titleCell = ws.getCell('B2');
    titleCell.value = spec.title;
    titleStyle(titleCell);
    ws.getRow(2).height = 24;

    // Blok utama
    dataset.headers.forEach((h, i) => {
      const cell = ws.getCell(`${colLetter(2 + i)}6`);
      cell.value = h;
      headerStyle(cell);
    });
    dataset.rows.forEach((row, r) => {
      row.forEach((val, i) => {
        const cell = ws.getCell(`${colLetter(2 + i)}${7 + r}`);
        cell.value = val;
        const colType = dataset.columnTypes[i];
        if (colType === 'date') cell.numFmt = 'yyyy-mm-dd';
        dataCellStyle(cell);
      });
    });

    // Blok master/referensi
    datasetMasterRanges.forEach((m) => {
      m.table.headers.forEach((h, i) => {
        const cell = ws.getCell(`${colLetter(m.startCol + i)}${m.headerRow}`);
        cell.value = h;
        headerStyle(cell);
      });
      m.table.rows.forEach((row, r) => {
        row.forEach((val, i) => {
          const cell = ws.getCell(`${colLetter(m.startCol + i)}${m.dataStartRow + r}`);
          cell.value = val;
          dataCellStyle(cell);
        });
      });
    });

    ws.getColumn(1).width = 3;
    for (let i = 2; i <= lastCol; i++) {
      ws.getColumn(i).width = 16;
    }
    ws.views = [];
  }

  function writePenjelasanSheet(ws, spec) {
    const headers = ['No', 'Fungsi/Rumus', 'Formula', 'Penjelasan'];
    headers.forEach((h, i) => {
      const cell = ws.getCell(`${colLetter(2 + i)}2`);
      cell.value = h;
      penjelasanHeaderStyle(cell);
    });
    spec.explanations.forEach((e, r) => {
      const rowNum = 3 + r;
      ws.getCell(`B${rowNum}`).value = e.no;
      ws.getCell(`C${rowNum}`).value = e.fungsi;
      ws.getCell(`D${rowNum}`).value = e.formula;
      ws.getCell(`E${rowNum}`).value = e.penjelasan;
      ['B', 'C', 'D', 'E'].forEach((col) => {
        const cell = ws.getCell(`${col}${rowNum}`);
        cell.font = { name: FONT };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });
    ws.getColumn(1).width = 3;
    ws.getColumn(2).width = 6;
    ws.getColumn(3).width = 22;
    ws.getColumn(4).width = 46;
    ws.getColumn(5).width = 60;
    ws.views = [];
  }

  /**
   * @param {Object} spec - ExerciseSpec dari exercise-generator.js
   * @returns {Promise<ArrayBuffer>}
   */
  async function renderExerciseWorkbook(spec) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Business Learning Simulation — Exercise Generator';
    wb.created = new Date();
    // KRITIS: tanpa ini, sel formula bisa tampil kosong/0 di Excel sampai
    // pengguna memaksa recalculate manual (Ctrl+Alt+F9) — ExcelJS tidak
    // menuliskan nilai cache, dan tanpa fullCalcOnLoad Excel tidak selalu
    // menghitung ulang otomatis saat file dibuka.
    wb.calcProperties = { fullCalcOnLoad: true };

    const wsLatihan = wb.addWorksheet('Lembar latihan');
    writePracticeSheet(wsLatihan, spec, false);

    const wsDataset = wb.addWorksheet('dataset');
    writeDatasetSheet(wsDataset, spec);

    const wsKunci = wb.addWorksheet('kunci jawaban');
    writePracticeSheet(wsKunci, spec, true);

    const wsPenjelasan = wb.addWorksheet('Penjelasan Rumus');
    writePenjelasanSheet(wsPenjelasan, spec);

    const buffer = await wb.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Engine "Dataset Generator" (Bagian 6) — workbook HANYA berisi dataset
   * (tidak ada soal/kunci/penjelasan). Satu sheet "dataset", sama persis
   * strukturnya dengan blok dataset pada Exercise Generator supaya bisa
   * dipakai ulang.
   * @param {{headers:string[], columnTypes:string[], rows:any[][], meta:object}} dataset
   * @param {string} materiLabel
   */
  async function renderDatasetOnlyWorkbook(dataset, materiLabel) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Business Learning Simulation — Dataset Generator';
    wb.created = new Date();
    wb.calcProperties = { fullCalcOnLoad: true };
    const ws = wb.addWorksheet('dataset');

    const mainLastCol = 1 + dataset.headers.length;
    const extraTables = [];
    if (dataset.meta && dataset.meta.masterTable) extraTables.push(dataset.meta.masterTable);
    if (dataset.meta && dataset.meta.supplierTable) extraTables.push(dataset.meta.supplierTable);

    let cursorCol = mainLastCol + 3;
    const ranges = extraTables.map((t) => {
      const startCol = cursorCol;
      cursorCol = startCol + t.headers.length + 2;
      return { startCol, table: t };
    });
    const lastCol = ranges.length ? ranges[ranges.length - 1].startCol + ranges[ranges.length - 1].table.headers.length - 1 : mainLastCol;

    ws.mergeCells(`B2:${colLetter(lastCol)}2`);
    const titleCell = ws.getCell('B2');
    titleCell.value = `dataset ( ${materiLabel} )`;
    titleStyle(titleCell);
    ws.getRow(2).height = 24;

    dataset.headers.forEach((h, i) => {
      const cell = ws.getCell(`${colLetter(2 + i)}6`);
      cell.value = h;
      headerStyle(cell);
    });
    dataset.rows.forEach((row, r) => {
      row.forEach((val, i) => {
        const cell = ws.getCell(`${colLetter(2 + i)}${7 + r}`);
        cell.value = val;
        if (dataset.columnTypes[i] === 'date') cell.numFmt = 'yyyy-mm-dd';
        dataCellStyle(cell);
      });
    });
    ranges.forEach((rg) => {
      rg.table.headers.forEach((h, i) => {
        const cell = ws.getCell(`${colLetter(rg.startCol + i)}6`);
        cell.value = h;
        headerStyle(cell);
      });
      rg.table.rows.forEach((row, r) => {
        row.forEach((val, i) => {
          const cell = ws.getCell(`${colLetter(rg.startCol + i)}${7 + r}`);
          cell.value = val;
          dataCellStyle(cell);
        });
      });
    });

    ws.getColumn(1).width = 3;
    for (let i = 2; i <= lastCol; i++) ws.getColumn(i).width = 16;
    ws.views = [];

    const buffer = await wb.xlsx.writeBuffer();
    return buffer;
  }

  window.ExerciseWorkbookExport = {
    renderExerciseWorkbook,
    renderDatasetOnlyWorkbook,
  };
})();
