/**
 * csv-utils.js — util CSV bersama (murni, tanpa DOM). Dipindah dari js/shared/cohort-engine.js dan
 * apps/game-hub/js/live-app.js (isi fungsi identik) supaya tidak terduplikasi.
 *
 * API: CsvUtils.csvCell(v) → sel CSV berkutip; sel berawalan = + - @ tab CR diberi apostrof di depannya
 * (menetralkan CSV injection).
 * WAJIB: dimuat SEBELUM js/shared/cohort-engine.js dan apps/game-hub/js/live-app.js.
 */
(function (global) {
  'use strict';
  if (global.CsvUtils) return;

  /** Netralkan injeksi rumus (CSV injection): sel berawalan = + - @ tab CR diberi apostrof di depannya. */
  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  global.CsvUtils = { csvCell: csvCell };
})(typeof window !== 'undefined' ? window : globalThis);
