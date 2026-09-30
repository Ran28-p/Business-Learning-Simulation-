/**
 * sql-engine.js
 * Wrapper tipis di atas sql.js (SQLite dikompilasi ke WebAssembly) sehingga
 * query benar-benar dieksekusi di browser — tanpa server/database berbayar.
 *
 * Loading strategy (paling stabil → paling rapuh):
 *   1. File lokal yang sudah di-vendor di ./vendor/sql-js/ (tidak butuh
 *      internet sama sekali setelah halaman pertama kali dimuat/di-cache).
 *   2. Kalau file lokal gagal (mis. belum ter-deploy dengan benar), coba
 *      CDN (jsDelivr) dengan beberapa kali percobaan ulang (retry).
 * Setiap percobaan dibatasi timeout supaya UI tidak menggantung selamanya
 * kalau koneksi mati di tengah jalan.
 */
(function (global) {
  "use strict";

  const SQLJS_VERSION = "1.14.1";
  const LOCAL_BASE = "./vendor/sql-js/";
  const CDN_BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;
  const LOAD_TIMEOUT_MS = 15000;
  const MAX_CDN_RETRIES = 2;

  let SQLModule = null;
  let loadingPromise = null;
  let db = null;
  const loadedTables = {}; // name -> {columns, rows}
  let onStatus = null; // optional callback(status: string) for UI feedback

  function setStatus(msg) { if (typeof onStatus === "function") onStatus(msg); }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Gagal memuat script: " + src));
      document.head.appendChild(s);
    });
  }

  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error((label || "Operasi") + " melebihi batas waktu (" + Math.round(ms / 1000) + " detik).")), ms);
      promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function ensureLoaderScript(base, label) {
    // If initSqlJs is already available (e.g. the vendored script already
    // loaded successfully, or a host page pre-supplies its own loader), reuse
    // it instead of injecting another <script> tag — the loader itself is
    // location-agnostic; only the locateFile passed to it matters.
    if (typeof global.initSqlJs === "function") return;
    await withTimeout(loadScript(base + "sql-wasm.js"), LOAD_TIMEOUT_MS, "Memuat " + label);
    if (typeof global.initSqlJs !== "function") throw new Error(label + " tidak menyediakan initSqlJs.");
  }

  async function tryInit(base, label) {
    await ensureLoaderScript(base, label);
    return withTimeout(global.initSqlJs({ locateFile: (file) => base + file }), LOAD_TIMEOUT_MS, "Inisialisasi " + label);
  }

  async function ensureLoaded() {
    if (SQLModule) return SQLModule;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      // 1) Local vendored copy first — fastest, works offline, no CDN risk.
      try {
        setStatus("Memuat SQL engine (lokal)…");
        SQLModule = await tryInit(LOCAL_BASE, "salinan lokal");
      } catch (localErr) {
        console.warn("SQL engine: file lokal gagal dimuat, mencoba CDN.", localErr);
        // 2) CDN fallback with retries.
        let lastErr = localErr;
        for (let attempt = 1; attempt <= MAX_CDN_RETRIES && !SQLModule; attempt++) {
          try {
            setStatus(`Memuat SQL engine (CDN, percobaan ${attempt}/${MAX_CDN_RETRIES})…`);
            SQLModule = await tryInit(CDN_BASE, "CDN");
          } catch (cdnErr) {
            lastErr = cdnErr;
            if (attempt < MAX_CDN_RETRIES) await sleep(600 * attempt);
          }
        }
        if (!SQLModule) {
          loadingPromise = null;
          setStatus("Gagal memuat SQL engine.");
          throw lastErr;
        }
      }
      db = new SQLModule.Database();
      // In-memory-only workload (nothing persisted to disk) — MEMORY journal
      // mode skips journal file I/O entirely, which is faster for this use case.
      try { db.run("PRAGMA journal_mode=MEMORY;"); } catch (_) { /* non-fatal */ }
      setStatus("SQL engine siap.");
      return SQLModule;
    })();
    return loadingPromise;
  }

  function typeToSqlite(t) {
    switch (t) {
      case "INTEGER": return "INTEGER";
      case "REAL": return "REAL";
      default: return "TEXT"; // DATE & TEXT both stored as TEXT (like real SQLite)
    }
  }

  async function loadDataset(dataset) {
    await ensureLoaded();
    const name = dataset.name;
    db.run(`DROP TABLE IF EXISTS "${name}"`);
    // Note: intentionally NOT declaring the key column as PRIMARY KEY —
    // "dirty" datasets deliberately contain duplicate IDs (see
    // dataset-generator.js) so learners can practice duplicate detection;
    // a PK constraint would make loading such data fail outright.
    const colDefs = dataset.columns.map((c) => `"${c.name}" ${typeToSqlite(c.type)}`).join(", ");
    db.run(`CREATE TABLE "${name}" (${colDefs})`);
    if (dataset.rows.length) {
      const colNames = dataset.columns.map((c) => c.name);
      const placeholders = colNames.map(() => "?").join(",");
      const stmt = db.prepare(`INSERT INTO "${name}" (${colNames.map((c) => `"${c}"`).join(",")}) VALUES (${placeholders})`);
      db.run("BEGIN TRANSACTION");
      try {
        dataset.rows.forEach((row) => {
          stmt.run(colNames.map((c) => (row[c] === undefined ? null : row[c])));
        });
        db.run("COMMIT");
      } catch (e) {
        db.run("ROLLBACK");
        stmt.free();
        throw e;
      }
      stmt.free();
    }
    loadedTables[name] = dataset;
    return true;
  }

  async function loadMultiple(datasetMap) {
    await ensureLoaded();
    for (const key of Object.keys(datasetMap)) {
      await loadDataset(datasetMap[key]);
    }
  }

  function requireDb() {
    if (!db) throw new Error("Database belum siap. Muat dataset terlebih dahulu.");
  }

  function run(sql) {
    requireDb();
    const res = db.exec(sql);
    if (res.length === 0) return { columns: [], values: [] };
    return { columns: res[0].columns, values: res[0].values };
  }

  function runMulti(sql) {
    // Runs a script possibly containing multiple statements; returns the
    // result of the LAST statement that produced rows (or empty).
    requireDb();
    const res = db.exec(sql);
    if (!res.length) return { columns: [], values: [] };
    const last = res[res.length - 1];
    return { columns: last.columns, values: last.values };
  }

  function explainPlan(sql) {
    requireDb();
    try {
      const res = db.exec("EXPLAIN QUERY PLAN " + sql);
      if (!res.length) return [];
      return res[0].values.map((v) => v[v.length - 1]);
    } catch (e) {
      return ["(tidak bisa membuat execution plan: " + e.message + ")"];
    }
  }

  function listTables() {
    if (!db) return [];
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    if (!res.length) return [];
    return res[0].values.map((v) => v[0]);
  }

  function tableSchema(name) {
    if (!db) return [];
    const res = db.exec(`PRAGMA table_info("${name}")`);
    if (!res.length) return [];
    return res[0].values.map((v) => ({ cid: v[0], name: v[1], type: v[2] }));
  }

  function sampleRows(name, n) {
    return run(`SELECT * FROM "${name}" LIMIT ${n || 20}`);
  }

  function rowCount(name) {
    const res = run(`SELECT COUNT(*) FROM "${name}"`);
    return res.values.length ? res.values[0][0] : 0;
  }

  function getDatasetMeta(name) {
    return loadedTables[name] || null;
  }

  function resetDb() {
    if (db) { try { db.close(); } catch (_) {} }
    db = new SQLModule.Database();
    try { db.run("PRAGMA journal_mode=MEMORY;"); } catch (_) { /* non-fatal */ }
    for (const k of Object.keys(loadedTables)) delete loadedTables[k];
  }

  function setStatusCallback(fn) { onStatus = fn; }

  global.SQLPQ_Engine = {
    ensureLoaded, loadDataset, loadMultiple, run, runMulti, explainPlan,
    listTables, tableSchema, sampleRows, rowCount, getDatasetMeta, resetDb, setStatusCallback,
    get isReady() { return !!db; }
  };
})(window);
