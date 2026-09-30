/**
 * Cross-Check Engine — pemeriksaan otomatis sederhana (edukasi).
 * Reusable, tanpa dependency. Bandingkan working paper vs klaim/SPT.
 *
 * API:
 *   CrossCheckEngine.run(dataset) → { findings, summary, score }
 *   CrossCheckEngine.checkEquality(a, b, meta)
 *   CrossCheckEngine.checkFiscalFormula(input)
 *   CrossCheckEngine.checkTaxCalc(input)
 *   CrossCheckEngine.checkTransactions(list)
 */
(function (global) {
  var TOLERANCE = 0.5; // selisih pembulatan kecil diabaikan

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function nearlyEqual(a, b, tol) {
    return Math.abs(num(a) - num(b)) <= (tol == null ? TOLERANCE : tol);
  }

  function finding(partial) {
    return Object.assign(
      {
        id: partial.id || "CC-" + Math.random().toString(36).slice(2, 8),
        code: partial.code || "GENERIC",
        severity: partial.severity || "medium", // low | medium | high
        title: partial.title || "Potential inconsistency",
        message: partial.message || "",
        expected: partial.expected,
        actual: partial.actual,
        difference: partial.difference,
        field: partial.field || "",
        recommendation: partial.recommendation || "Lakukan rekonsiliasi dan koreksi working paper / SPT."
      },
      partial
    );
  }

  /** Bandingkan dua nilai numerik */
  function checkEquality(expected, actual, meta) {
    meta = meta || {};
    var exp = num(expected);
    var act = num(actual);
    var diff = act - exp;
    if (nearlyEqual(exp, act, meta.tolerance)) {
      return {
        ok: true,
        finding: null,
        expected: exp,
        actual: act,
        difference: 0
      };
    }
    var abs = Math.abs(diff);
    var severity = meta.severity;
    if (!severity) {
      if (abs >= 50000000) severity = "high";
      else if (abs >= 5000000) severity = "medium";
      else severity = "low";
    }
    return {
      ok: false,
      expected: exp,
      actual: act,
      difference: diff,
      finding: finding({
        id: meta.id,
        code: meta.code || "VALUE_MISMATCH",
        severity: severity,
        title: meta.title || "Nilai tidak selaras",
        field: meta.field || "",
        message:
          meta.message ||
          (meta.field ? meta.field + ": working/expected ≠ actual/SPT." : "Nilai expected ≠ actual."),
        expected: exp,
        actual: act,
        difference: diff,
        recommendation: meta.recommendation
      })
    };
  }

  /**
   * Laba Fiskal = Laba Komersial + Positif − Negatif
   * input: { commercial, positive, negative, claimedFiscal }
   */
  function checkFiscalFormula(input) {
    input = input || {};
    var commercial = num(input.commercial);
    var positive = num(input.positive);
    var negative = num(input.negative);
    var claimed = num(input.claimedFiscal);
    var computed = commercial + positive - negative;
    var result = checkEquality(computed, claimed, {
      id: input.id || "CC-FISCAL-FORMULA",
      code: "FISCAL_FORMULA",
      field: "Laba Fiskal",
      title: "Laba fiskal tidak mengikuti rumus rekonsiliasi",
      message:
        "Laba Fiskal klaim tidak sama dengan Laba Komersial + Koreksi Positif − Koreksi Negatif.",
      recommendation:
        "Hitung ulang: Komersial + Positif − Negatif. Perbaiki working paper sebelum mengisi SPT 1771.",
      severity: Math.abs(computed - claimed) >= 10000000 ? "high" : "medium"
    });
    return {
      ok: result.ok,
      computedFiscal: computed,
      claimedFiscal: claimed,
      commercial: commercial,
      positive: positive,
      negative: negative,
      difference: result.difference,
      findings: result.finding ? [result.finding] : []
    };
  }

  /**
   * Tax = Taxable Income × Rate (ilustrasi edukasi)
   * input: { taxableIncome, rate, claimedTax }
   */
  function checkTaxCalc(input) {
    input = input || {};
    var ti = num(input.taxableIncome);
    var rate = num(input.rate);
    var claimed = num(input.claimedTax);
    var computed = Math.round(ti * rate); // dataset edukasi
    var result = checkEquality(computed, claimed, {
      id: input.id || "CC-TAX-CALC",
      code: "TAX_CALC",
      field: "PPh Terutang",
      title: "Perhitungan PPh tidak konsisten",
      message: "PPh klaim ≠ PKP × tarif (ilustrasi edukasi).",
      recommendation: "Hitung ulang PPh dari PKP dan tarif yang dipakai dataset; cocokkan ke SPT.",
      severity: Math.abs(computed - claimed) >= 5000000 ? "high" : "medium",
      tolerance: 1
    });
    return {
      ok: result.ok,
      computedTax: computed,
      claimedTax: claimed,
      taxableIncome: ti,
      rate: rate,
      difference: result.difference,
      findings: result.finding ? [result.finding] : []
    };
  }

  /**
   * Cross-check pasangan working vs SPT
   * pairs: [{ field, working, spt, code? }]
   */
  function checkWorkingVsSpt(pairs) {
    pairs = pairs || [];
    var findings = [];
    pairs.forEach(function (p, i) {
      var r = checkEquality(p.working, p.spt, {
        id: p.id || "CC-SPT-" + i,
        code: p.code || "SPT_MISMATCH",
        field: p.field || "Field",
        title: (p.field || "Field") + " working ≠ SPT",
        message:
          "Potential inconsistency: " +
          (p.field || "nilai") +
          " pada working paper tidak sama dengan angka di SPT.",
        recommendation:
          p.recommendation ||
          "Rekonsiliasi working paper dengan draft SPT 1771 sebelum pelaporan."
      });
      if (r.finding) findings.push(r.finding);
    });
    return {
      ok: findings.length === 0,
      findings: findings,
      checked: pairs.length
    };
  }

  /**
   * Tandai transaksi bermasalah dari flag issue di dataset
   * (engine membantu auto-list expected findings; user review tetap manual)
   */
  function checkTransactions(transactions) {
    transactions = transactions || [];
    var findings = [];
    transactions.forEach(function (t) {
      if (!t || !t.issue) return;
      findings.push(
        finding({
          id: "CC-TX-" + (t.id || ""),
          code: "TX_ISSUE",
          severity: (t.risk || "medium").toLowerCase(),
          field: t.id || "",
          title: t.desc || t.issueType || "Transaction issue",
          message: t.issueType || t.impact || "Transaksi berpotensi bermasalah",
          recommendation: t.recommendation || "Review transaksi dan dokumentasi.",
          category: t.category || "Other",
          meta: { amount: t.amount, date: t.date }
        })
      );
    });
    return { ok: findings.length === 0, findings: findings, issueCount: findings.length };
  }

  /**
   * Jalankan paket pemeriksaan dari objek dataset auditor
   * dataset boleh berisi: fiscal, tax, sptPairs, transactions
   */
  function run(dataset) {
    dataset = dataset || {};
    var findings = [];
    var parts = {};

    if (dataset.fiscal) {
      parts.fiscal = checkFiscalFormula(dataset.fiscal);
      findings = findings.concat(parts.fiscal.findings || []);
    }
    if (dataset.tax) {
      parts.tax = checkTaxCalc(dataset.tax);
      findings = findings.concat(parts.tax.findings || []);
    }
    if (dataset.sptPairs) {
      parts.spt = checkWorkingVsSpt(dataset.sptPairs);
      findings = findings.concat(parts.spt.findings || []);
    }
    if (dataset.transactions) {
      parts.transactions = checkTransactions(dataset.transactions);
      // transaksi: temuan expected untuk kunci, tidak selalu digabung ke auto-fail score yang sama
      parts.transactionFindings = parts.transactions.findings;
    }

    var high = findings.filter(function (f) {
      return f.severity === "high";
    }).length;
    var medium = findings.filter(function (f) {
      return f.severity === "medium";
    }).length;
    var low = findings.filter(function (f) {
      return f.severity === "low";
    }).length;

    // Skor edukasi: mulai 100, potong per temuan
    var score = 100;
    findings.forEach(function (f) {
      if (f.severity === "high") score -= 20;
      else if (f.severity === "medium") score -= 12;
      else score -= 5;
    });
    if (score < 0) score = 0;

    return {
      ok: findings.length === 0,
      findings: findings,
      parts: parts,
      summary: {
        total: findings.length,
        high: high,
        medium: medium,
        low: low,
        score: score
      }
    };
  }

  /** Dataset default dari global AUD_* jika ada */
  function runFromGlobals() {
    var fiscal = global.AUD_FISCAL_REVIEW;
    var calc = global.AUD_CALC;
    var spt = global.AUD_SPT_REVIEW;
    var tx = global.AUD_TX_CASE;

    var dataset = {};
    if (fiscal) {
      dataset.fiscal = {
        id: "CC-FROM-AUD-FISCAL",
        commercial: fiscal.labaKomersial,
        positive: fiscal.staff.positive,
        negative: fiscal.staff.negative,
        claimedFiscal: fiscal.staff.labaFiskal
      };
    }
    if (calc) {
      dataset.tax = {
        id: "CC-FROM-AUD-CALC",
        taxableIncome: calc.taxableIncomeCorrect,
        rate: calc.rateCorrect,
        claimedTax: calc.taxStaff
      };
    }
    if (spt) {
      dataset.sptPairs = [
        {
          field: "Laba Fiskal",
          working: spt.fiscalProfitWorking,
          spt: spt.fiscalProfitOnSpt,
          code: "SPT_FISCAL_PROFIT"
        },
        {
          field: "PPh Terutang",
          working: spt.taxPayableWorking,
          spt: spt.taxPayableOnSpt,
          code: "SPT_TAX_PAYABLE"
        }
      ];
    }
    if (tx && tx.transactions) {
      dataset.transactions = tx.transactions;
    }
    return run(dataset);
  }

  function formatRp(n) {
    return "Rp " + num(n).toLocaleString("id-ID");
  }

  /** Render HTML ringkas untuk UI lab */
  function renderFindingsHtml(result, escapeHtmlFn) {
    var esc =
      escapeHtmlFn ||
      function (s) {
        return String(s == null ? "" : s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      };
    if (!result) return "";
    var sum = result.summary || {};
    var html =
      '<div class="cc-summary">' +
      "<strong>Cross-Check Engine</strong> · Temuan otomatis: " +
      (sum.total || 0) +
      " (High " +
      (sum.high || 0) +
      ", Medium " +
      (sum.medium || 0) +
      ", Low " +
      (sum.low || 0) +
      ") · Score " +
      (sum.score != null ? sum.score : "—") +
      "/100</div>";

    if (result.parts && result.parts.fiscal) {
      var f = result.parts.fiscal;
      html +=
        '<div class="cc-block"><div class="cc-block__title">Rumus laba fiskal</div>' +
        "Computed: <strong>" +
        formatRp(f.computedFiscal) +
        "</strong> · Claimed: <strong>" +
        formatRp(f.claimedFiscal) +
        "</strong> · Diff: <strong>" +
        formatRp(f.difference || 0) +
        "</strong></div>";
    }
    if (result.parts && result.parts.tax) {
      var t = result.parts.tax;
      html +=
        '<div class="cc-block"><div class="cc-block__title">Perhitungan PPh</div>' +
        "Computed: <strong>" +
        formatRp(t.computedTax) +
        "</strong> · Claimed: <strong>" +
        formatRp(t.claimedTax) +
        "</strong> · Diff: <strong>" +
        formatRp(t.difference || 0) +
        "</strong></div>";
    }

    if (!result.findings || !result.findings.length) {
      html +=
        '<div class="tc-feedback show ok">Tidak ada inkonsistensi numerik pada pasangan yang diperiksa.</div>';
      return html;
    }

    html += '<div class="cc-findings">';
    result.findings.forEach(function (fn) {
      html +=
        '<div class="aud-finding cc-sev-' +
        esc(fn.severity) +
        '">' +
        '<div class="aud-finding__title">⚠ ' +
        esc(fn.title) +
        " · " +
        esc((fn.severity || "").toUpperCase()) +
        "</div>" +
        "<div><strong>Code:</strong> " +
        esc(fn.code) +
        (fn.field ? " · <strong>Field:</strong> " + esc(fn.field) : "") +
        "</div>" +
        "<div>" +
        esc(fn.message) +
        "</div>";
      if (fn.expected != null && fn.actual != null) {
        html +=
          "<div><strong>Expected:</strong> " +
          formatRp(fn.expected) +
          " · <strong>Actual:</strong> " +
          formatRp(fn.actual) +
          " · <strong>Diff:</strong> " +
          formatRp(fn.difference) +
          "</div>";
      }
      html +=
        "<div><strong>Recommendation:</strong> " +
        esc(fn.recommendation) +
        "</div></div>";
    });
    html += "</div>";
    return html;
  }

  global.CrossCheckEngine = {
    TOLERANCE: TOLERANCE,
    checkEquality: checkEquality,
    checkFiscalFormula: checkFiscalFormula,
    checkTaxCalc: checkTaxCalc,
    checkWorkingVsSpt: checkWorkingVsSpt,
    checkTransactions: checkTransactions,
    run: run,
    runFromGlobals: runFromGlobals,
    renderFindingsHtml: renderFindingsHtml,
    formatRp: formatRp
  };
})(typeof window !== "undefined" ? window : globalThis);
