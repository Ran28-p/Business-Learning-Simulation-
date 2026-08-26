/**
 * grading-engine.js
 * Penilaian otomatis SQL: query pengguna dieksekusi sungguhan lalu HASILNYA
 * (bukan teks query) dibandingkan dengan hasil query jawaban. Pengguna boleh
 * menulis query berbeda selama hasil akhirnya identik.
 */
(function (global) {
  "use strict";

  function normalizeCell(v) {
    if (v === null || v === undefined) return "␀NULL␀";
    if (typeof v === "number") {
      // Toleransi pembulatan angka desimal (mis. hasil AVG/SUM)
      return "n:" + (Math.round(v * 1e6) / 1e6);
    }
    return "s:" + String(v).trim().toLowerCase();
  }

  function formatCellForDisplay(v) {
    if (v === null || v === undefined) return "NULL";
    return String(v);
  }
  function formatRow(columns, row) {
    return "(" + columns.map((c, i) => `${c}: ${formatCellForDisplay(row[i])}`).join(", ") + ")";
  }

  function buildMultiset(values, normValues) {
    const map = new Map();
    normValues.forEach((nrow, idx) => {
      const key = JSON.stringify(nrow);
      if (!map.has(key)) map.set(key, { count: 0, sample: values[idx] });
      map.get(key).count++;
    });
    return map;
  }

  function compareResultSets(userRes, expectedRes, opts) {
    opts = opts || {};
    const orderMatters = !!opts.orderMatters;

    if (userRes.columns.length !== expectedRes.columns.length) {
      return {
        correct: false, reason: "column_count",
        detail: `Jumlah kolom hasil Anda (${userRes.columns.length}: ${userRes.columns.join(", ") || "-"}) tidak sama dengan yang diharapkan (${expectedRes.columns.length}: ${expectedRes.columns.join(", ")}).`
      };
    }
    if (userRes.values.length !== expectedRes.values.length) {
      return {
        correct: false, reason: "row_count",
        detail: `Jumlah baris hasil Anda (${userRes.values.length}) tidak sama dengan yang diharapkan (${expectedRes.values.length}).`
      };
    }

    const userNormRows = userRes.values.map((r) => r.map(normalizeCell));
    const expNormRows = expectedRes.values.map((r) => r.map(normalizeCell));

    if (orderMatters) {
      for (let i = 0; i < userNormRows.length; i++) {
        for (let colIdx = 0; colIdx < userNormRows[i].length; colIdx++) {
          if (userNormRows[i][colIdx] !== expNormRows[i][colIdx]) {
            return {
              correct: false, reason: "value_mismatch",
              mismatchLocation: { row: i + 1, column: expectedRes.columns[colIdx] },
              detail: `Baris ke-${i + 1}, kolom "${expectedRes.columns[colIdx]}" tidak sesuai — nilai Anda: ${formatCellForDisplay(userRes.values[i][colIdx])}, seharusnya: ${formatCellForDisplay(expectedRes.values[i][colIdx])}. (Soal ini juga meminta urutan hasil tertentu — periksa ORDER BY Anda.)`
            };
          }
        }
      }
      return { correct: true };
    }

    // Order doesn't matter → compare as multisets and, if they differ, point
    // to concrete example rows that are missing / shouldn't be there, since
    // "row 3" isn't a meaningful location once we ignore ordering.
    const userSorted = userNormRows.map((r) => JSON.stringify(r)).sort();
    const expSorted = expNormRows.map((r) => JSON.stringify(r)).sort();
    let identical = true;
    for (let i = 0; i < userSorted.length; i++) { if (userSorted[i] !== expSorted[i]) { identical = false; break; } }
    if (identical) return { correct: true };

    const userMap = buildMultiset(userRes.values, userNormRows);
    const expMap = buildMultiset(expectedRes.values, expNormRows);
    const missingExamples = [];
    const extraExamples = [];
    expMap.forEach((entry, key) => {
      const userCount = userMap.has(key) ? userMap.get(key).count : 0;
      if (userCount < entry.count && missingExamples.length < 3) missingExamples.push(entry.sample);
    });
    userMap.forEach((entry, key) => {
      const expCount = expMap.has(key) ? expMap.get(key).count : 0;
      if (entry.count > expCount && extraExamples.length < 3) extraExamples.push(entry.sample);
    });

    const parts = [];
    if (missingExamples.length) parts.push(`baris yang SEHARUSNYA ADA tapi tidak ditemukan di hasil Anda, contoh: ${missingExamples.map((r) => formatRow(expectedRes.columns, r)).join("; ")}`);
    if (extraExamples.length) parts.push(`baris di hasil Anda yang SEHARUSNYA TIDAK ADA, contoh: ${extraExamples.map((r) => formatRow(userRes.columns, r)).join("; ")}`);
    return {
      correct: false, reason: "value_mismatch",
      missingExamples, extraExamples,
      detail: parts.length ? `Ada ${parts.join("; dan ")}.` : `Ada baris yang isinya tidak sesuai dengan hasil yang diharapkan. Periksa kembali filter, agregasi, atau join Anda.`
    };
  }

  /**
   * Grades a user's SQL string against a question object:
   *  { expectedSql, orderMatters }
   * Returns { correct, error?, reason?, detail?, userResult?, expectedResult? }
   */
  function isReadOnlyQuery(sql) {
    // Grading must never alter the shared in-browser practice database. SQL
    // comments are removed first so keyword checks cannot be bypassed there.
    const stripped = String(sql || "")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--[^\r\n]*/g, " ")
      .trim();
    if (!stripped) return false;
    const statements = stripped.split(";").map((s) => s.trim()).filter(Boolean);
    if (statements.length !== 1) return false;
    return /^(SELECT|WITH\b|EXPLAIN\s+(QUERY\s+PLAN\s+)?SELECT\b)/i.test(statements[0]);
  }

  function gradeQuery(userSql, question) {
    if (!userSql || !userSql.trim()) {
      return { correct: false, error: "Query masih kosong. Tulis query SQL Anda terlebih dahulu." };
    }
    if (!isReadOnlyQuery(userSql)) {
      return { correct: false, error: "Untuk penilaian, gunakan tepat satu query baca saja (SELECT atau WITH ... SELECT). Statement seperti INSERT, UPDATE, DELETE, DROP, dan multi-statement tidak diizinkan agar dataset latihan tetap aman." };
    }
    let userResult;
    try {
      userResult = global.SQLPQ_Engine.run(userSql);
    } catch (e) {
      return { correct: false, error: "Query Anda menghasilkan error: " + e.message };
    }
    let expectedResult;
    try {
      expectedResult = global.SQLPQ_Engine.run(question.expectedSql);
    } catch (e) {
      return { correct: false, error: "Terjadi masalah internal saat menyiapkan jawaban (" + e.message + "). Coba muat ulang dataset." };
    }
    const verdict = compareResultSets(userResult, expectedResult, { orderMatters: question.orderMatters });
    return Object.assign({ userResult, expectedResult }, verdict);
  }

  global.SQLPQ_Grading = { gradeQuery, compareResultSets, normalizeCell, isReadOnlyQuery };
})(window);
