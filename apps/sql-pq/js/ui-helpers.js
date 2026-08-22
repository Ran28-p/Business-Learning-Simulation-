/**
 * ui-helpers.js — util UI yang dipakai lintas layar: render tabel hasil,
 * toast notifikasi, modal konfirmasi, import/export CSV/JSON/SQL, dan
 * formatter SQL sederhana (bukan parser penuh, cukup untuk keterbacaan).
 */
(function (global) {
  "use strict";

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------------------------------------------------------------- Toast --
  let toastWrap = null;
  function toast(message, kind) {
    if (!toastWrap) {
      toastWrap = el("div", "toast-wrap");
      document.body.appendChild(toastWrap);
    }
    const t = el("div", "toast", escapeHtml(message));
    if (kind === "err") t.style.background = "var(--sqlpq-red-700)";
    if (kind === "ok") t.style.background = "var(--sqlpq-green-700)";
    toastWrap.appendChild(t);
    const raf = global.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
    raf(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 250); }, 2600);
  }

  // ---------------------------------------------------------------- Modal --
  let modalScrim = null;
  function confirmModal(title, message, onConfirm, confirmLabel) {
    if (!modalScrim) {
      modalScrim = el("div", "modal-scrim");
      document.body.appendChild(modalScrim);
    }
    modalScrim.innerHTML = "";
    const box = el("div", "modal-box");
    box.appendChild(el("h3", null, escapeHtml(title)));
    box.appendChild(el("p", null, escapeHtml(message)));
    const row = el("div", "btn-row");
    const cancelBtn = el("button", "btn btn-ghost", "Batal");
    const okBtn = el("button", "btn btn-red", confirmLabel || "Ya, Lanjutkan");
    cancelBtn.onclick = () => modalScrim.classList.remove("open");
    okBtn.onclick = () => { modalScrim.classList.remove("open"); onConfirm(); };
    row.appendChild(cancelBtn); row.appendChild(okBtn);
    box.appendChild(row);
    modalScrim.appendChild(box);
    modalScrim.classList.add("open");
    modalScrim.onclick = (e) => { if (e.target === modalScrim) modalScrim.classList.remove("open"); };
  }

  // ----------------------------------------------------------- Data table --
  function renderResultTable(container, columns, values, maxRows) {
    container.innerHTML = "";
    if (!columns.length) {
      container.appendChild(el("div", "empty-state", `<div class="ic">📭</div><div>Tidak ada hasil untuk ditampilkan.</div>`));
      return;
    }
    const wrap = el("div", "table-wrap");
    const table = el("table", "data-table");
    const thead = el("thead");
    const trh = el("tr");
    columns.forEach((c) => trh.appendChild(el("th", null, escapeHtml(c))));
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = el("tbody");
    const rows = maxRows ? values.slice(0, maxRows) : values;
    rows.forEach((row) => {
      const tr = el("tr");
      row.forEach((cell) => {
        const td = document.createElement("td");
        if (cell === null || cell === undefined) { td.textContent = "NULL"; td.className = "is-null"; }
        else td.textContent = String(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
    if (maxRows && values.length > maxRows) {
      container.appendChild(el("small", null, `Menampilkan ${maxRows} dari ${values.length} baris.`));
    }
  }

  function renderObjectRowsTable(container, dataset, maxRows) {
    const colNames = dataset.columns.map((c) => c.name);
    const values = dataset.rows.slice(0, maxRows || dataset.rows.length).map((r) => colNames.map((c) => r[c]));
    renderResultTable(container, colNames, values, maxRows);
  }

  // --------------------------------------------------------- CSV / export --
  function toCsv(columns, rows) {
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [columns.map(esc).join(",")];
    rows.forEach((r) => lines.push(r.map(esc).join(",")));
    return lines.join("\n");
  }

  function datasetToCsv(dataset) {
    const colNames = dataset.columns.map((c) => c.name);
    const rows = dataset.rows.map((r) => colNames.map((c) => r[c]));
    return toCsv(colNames, rows);
  }

  function datasetToSqlInsert(dataset) {
    const colNames = dataset.columns.map((c) => c.name);
    const colDefs = dataset.columns.map((c) => `"${c.name}" ${c.type === "INTEGER" ? "INTEGER" : c.type === "REAL" ? "REAL" : "TEXT"}`).join(", ");
    let sql = `CREATE TABLE "${dataset.name}" (${colDefs});\n\n`;
    dataset.rows.forEach((r) => {
      const vals = colNames.map((c) => {
        const v = r[c];
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "number") return v;
        return "'" + String(v).replace(/'/g, "''") + "'";
      });
      sql += `INSERT INTO "${dataset.name}" (${colNames.map((c) => `"${c}"`).join(",")}) VALUES (${vals.join(",")});\n`;
    });
    return sql;
  }

  function downloadText(filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadResultAsCsv(filename, columns, values) {
    downloadText(filename, toCsv(columns, values), "text/csv");
  }

  // -------------------------------------------------------------- CSV import
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function inferType(values) {
    let allInt = true, allNum = true;
    for (const v of values) {
      if (v === "" || v == null) continue;
      if (isNaN(v)) { allInt = false; allNum = false; break; }
      if (!Number.isInteger(Number(v))) allInt = false;
    }
    if (allNum) return allInt ? "INTEGER" : "REAL";
    return "TEXT";
  }

  function rows2dToDataset(rows2d, name) {
    if (!rows2d.length) throw new Error("File kosong / tidak ada data.");
    const header = rows2d[0];
    const dataRows = rows2d.slice(1).filter((r) => r.some((v) => v !== "" && v != null));
    const colValues = header.map((_, i) => dataRows.map((r) => r[i]));
    const columns = header.map((h, i) => ({ name: String(h == null ? "" : h).trim() || `col_${i + 1}`, type: inferType(colValues[i]) }));
    const rows = dataRows.map((r) => {
      const obj = {};
      header.forEach((h, i) => {
        const colName = columns[i].name;
        let v = r[i];
        if (v === "" || v === undefined) v = null;
        else if (columns[i].type === "INTEGER") v = parseInt(v, 10);
        else if (columns[i].type === "REAL") v = parseFloat(v);
        obj[colName] = v;
      });
      return obj;
    });
    return { name: (name || "custom_data").replace(/[^a-zA-Z0-9_]/g, "_"), label: name || "Dataset Kustom", columns, rows };
  }

  function csvToDataset(text, name) {
    return rows2dToDataset(parseCsv(text.trim()), name);
  }

  // -------------------------------------------------------- Excel import --
  const XLSX_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  let xlsxLoadingPromise = null;
  function loadXlsxLib() {
    if (global.XLSX) return Promise.resolve(global.XLSX);
    if (xlsxLoadingPromise) return xlsxLoadingPromise;
    xlsxLoadingPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = XLSX_CDN;
      s.onload = () => resolve(global.XLSX);
      s.onerror = () => reject(new Error("Gagal memuat pustaka Excel dari CDN."));
      document.head.appendChild(s);
    });
    return xlsxLoadingPromise;
  }

  async function downloadDatasetAsExcel(dataset) {
    const XLSXLib = await loadXlsxLib();
    const colNames = dataset.columns.map((c) => c.name);
    const aoa = [colNames].concat(dataset.rows.map((r) => colNames.map((c) => (r[c] === undefined ? null : r[c]))));
    const ws = XLSXLib.utils.aoa_to_sheet(aoa);
    const wb = XLSXLib.utils.book_new();
    XLSXLib.utils.book_append_sheet(wb, ws, "Data");
    XLSXLib.writeFile(wb, (dataset.name || "dataset") + ".xlsx");
  }

  async function excelFileToDataset(file, name) {
    const XLSXLib = await loadXlsxLib();
    const buffer = await file.arrayBuffer();
    const wb = XLSXLib.read(new Uint8Array(buffer), { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheetName];
    const rows2d = XLSXLib.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    return rows2dToDataset(rows2d, name);
  }

  // ----------------------------------------------------------- SQL format --
  const KEYWORDS = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "JOIN", "INNER JOIN",
    "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "CROSS JOIN", "ON", "AND", "OR", "NOT", "IN", "BETWEEN",
    "LIKE", "IS NULL", "IS NOT NULL", "LIMIT", "AS", "DISTINCT", "UNION ALL", "UNION", "WITH", "CASE",
    "WHEN", "THEN", "ELSE", "END", "OVER", "PARTITION BY", "DESC", "ASC"];

  function formatSql(sql) {
    let s = sql.trim().replace(/\s+/g, " ");
    KEYWORDS.slice().sort((a, b) => b.length - a.length).forEach((kw) => {
      const re = new RegExp("\\b" + kw.replace(/ /g, "\\s+") + "\\b", "gi");
      s = s.replace(re, kw);
    });
    const breakBefore = ["FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "JOIN", "INNER JOIN", "LEFT JOIN",
      "RIGHT JOIN", "FULL OUTER JOIN", "CROSS JOIN", "LIMIT", "UNION ALL", "UNION", "WITH"];
    breakBefore.forEach((kw) => { s = s.replace(new RegExp("\\s+" + kw + "\\b", "g"), "\n" + kw); });
    s = s.replace(/\s+AND\b/g, "\n  AND").replace(/\s+OR\b/g, "\n  OR");
    return s.trim();
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast("Disalin ke clipboard.", "ok")).catch(() => toast("Gagal menyalin.", "err"));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Disalin ke clipboard.", "ok"); } catch (e) { toast("Gagal menyalin.", "err"); }
      ta.remove();
    }
  }

  global.SQLPQ_UI = {
    el, escapeHtml, toast, confirmModal, renderResultTable, renderObjectRowsTable,
    toCsv, datasetToCsv, datasetToSqlInsert, downloadText, downloadResultAsCsv,
    parseCsv, csvToDataset, rows2dToDataset, excelFileToDataset, downloadDatasetAsExcel, loadXlsxLib, formatSql, copyToClipboard
  };
})(window);
