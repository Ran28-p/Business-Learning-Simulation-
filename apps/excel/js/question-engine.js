/**
 * question-engine.js
 * Main question generation engine.
 * Selects templates, validates against dataset, enforces anti-repetition,
 * difficulty rules, and produces fully computed question objects.
 */

import {
  LEVEL_CONFIG,
  getTemplatesForLevel,
  getLevelConfig,
} from './question-bank.js';
import {
  buildFingerprint,
  isDuplicate,
  isSessionDuplicate,
  recordQuestion,
  clearSessionHistory,
  getHistoryStats,
} from './question-history.js';

const MAX_ATTEMPTS = 40;
const MAX_CANDIDATES = 60;

/**
 * Detect dataset capabilities from headers/rows.
 */
export function detectDatasetCapabilities(headers, rows, columnTypes = []) {
  const has = (name) => headers.includes(name);
  const numericCols = headers.filter((h, i) => rows.some((r) => typeof r[i] === 'number'));
  const textCols = headers.filter((h, i) => rows.some((r) => typeof r[i] === 'string' && r[i]));
  return {
    hasNumeric: numericCols.length > 0,
    hasText: textCols.length > 0,
    hasDate: columnTypes.includes('date') || has('Tanggal'),
    hasKategori: has('Kategori'),
    hasWilayah: has('Wilayah'),
    hasTotalPenjualan: has('Total Penjualan'),
    hasKodeProduk: has('Kode Produk'),
    hasNamaProduk: has('Nama Produk'),
    hasDiskon: has('Diskon (%)'),
    hasSales: has('Nama Sales'),
    hasStok: has('Stok Awal') || has('Stok Akhir'),
    hasNilaiPersediaan: has('Nilai Persediaan'),
    numericColumns: numericCols,
    textColumns: textCols,
    rowCount: rows.length,
  };
}

/**
 * Validate that a generated question matches the intended level complexity.
 */
export function validateQuestionDifficulty(question, level) {
  if (!question || question.level !== level) return { ok: false, reason: 'level mismatch' };
  const cfg = getLevelConfig(level);
  if (!cfg) return { ok: false, reason: 'unknown level' };

  const fnCount = question.functionCount ?? (question.acceptedFunctions?.length || 1);
  const condCount = question.conditionCount ?? 0;
  const nested = question.nestedDepth ?? 0;

  if (level === 1) {
    if (condCount > 0) return { ok: false, reason: 'L1 must have 0 conditions' };
    if (fnCount > 1) return { ok: false, reason: 'L1 single function only' };
    const banned = ['SUMIFS', 'COUNTIFS', 'VLOOKUP', 'INDEX', 'MATCH', 'AND', 'OR'];
    if ((question.acceptedFunctions || []).some((f) => banned.includes(f.toUpperCase()))) {
      return { ok: false, reason: 'L1 banned advanced function' };
    }
  }
  if (level === 2) {
    if (condCount > 1) return { ok: false, reason: 'L2 max 1 condition' };
  }
  if (level === 3) {
    const lookupFns = ['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'XLOOKUP', 'IFERROR'];
    if (!(question.acceptedFunctions || []).some((f) => lookupFns.includes(f.toUpperCase()))) {
      return { ok: false, reason: 'L3 should involve lookup' };
    }
  }
  if (level === 4) {
    if (condCount < 2 && !(question.acceptedFunctions || []).some((f) =>
      ['SUMIFS', 'COUNTIFS', 'AND', 'OR'].includes(f.toUpperCase())
    )) {
      return { ok: false, reason: 'L4 needs multi-criteria or AND/OR' };
    }
  }
  if (level === 5) {
    // Accept nested logic, multi-function, OR multi-criteria analytical formulas
    if (nested < 1 && fnCount < 2 && condCount < 2) {
      return { ok: false, reason: 'L5 needs nesting, multi-function, or multi-criteria' };
    }
  }
  if (level === 6) {
    if (!question.businessScenario && nested < 1 && fnCount < 2) {
      return { ok: false, reason: 'L6 needs business scenario or high complexity' };
    }
  }
  return { ok: true };
}

/**
 * Basic structural validation of a question object.
 */
export function validateQuestion(question, dataset) {
  if (!question) return { ok: false, reason: 'null question' };
  if (!question.instruction || !String(question.instruction).trim()) {
    return { ok: false, reason: 'empty instruction' };
  }
  if (!question.targetCell) return { ok: false, reason: 'missing targetCell' };
  if (question.expectedValue === undefined || question.expectedValue === null) {
    return { ok: false, reason: 'missing expectedValue' };
  }
  if (!question.expectedFormula || !String(question.expectedFormula).startsWith('=')) {
    return { ok: false, reason: 'invalid expectedFormula' };
  }
  if (!Array.isArray(question.acceptedFunctions) || question.acceptedFunctions.length === 0) {
    return { ok: false, reason: 'missing acceptedFunctions' };
  }
  if (!Array.isArray(question.hints) || question.hints.length < 1) {
    return { ok: false, reason: 'missing hints' };
  }
  // expectedValue NaN check
  if (typeof question.expectedValue === 'number' && !Number.isFinite(question.expectedValue)) {
    return { ok: false, reason: 'expectedValue is NaN' };
  }
  return { ok: true };
}

/**
 * Generate one question for the given level and dataset.
 */
export function generateQuestion({
  level,
  headers,
  rows,
  dataStartRowIndex,
  targetRowIndex,
  datasetType = 'sales',
  columnTypes = [],
  usedTargets = null,
  preferNewTemplate = true,
}) {
  const cfg = getLevelConfig(level);
  if (!cfg) throw new Error(`Level ${level} tidak dikenali.`);
  if (!rows || rows.length === 0) throw new Error('Dataset kosong.');

  const templates = getTemplatesForLevel(level);
  if (!templates.length) throw new Error(`Tidak ada template untuk Level ${level}.`);

  const used = usedTargets || new Set();
  const ctx = {
    headers,
    rows,
    dataStartRowIndex,
    targetRowIndex,
    datasetType,
    columnTypes,
    usedTargets: used,
  };

  // Shuffle templates for variety
  const order = templates.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const triedFingerprints = new Set();
  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const template = templates[order[attempt % order.length]];
    let question;
    try {
      question = template.build(ctx);
    } catch (err) {
      lastError = err;
      continue;
    }
    if (!question) continue;

    // Ensure level & points
    question.level = level;
    question.difficulty = level;
    question.datasetType = datasetType;
    question.points = question.points || cfg.pointsBase;
    question.templateId = question.templateId || template.id;

    // Fingerprint
    const fpParts = {
      datasetType,
      level,
      ...(question.fingerprintParts || {}),
      templateId: question.templateId,
    };
    const fingerprint = buildFingerprint(fpParts);
    question.fingerprint = fingerprint;

    if (triedFingerprints.has(fingerprint)) continue;
    triedFingerprints.add(fingerprint);

    // Anti-repetition: prefer session-unique, then global-unique
    if (isSessionDuplicate(fingerprint)) continue;
    if (isDuplicate(fingerprint) && attempt < MAX_ATTEMPTS - 5) continue;

    // Validate structure
    const struct = validateQuestion(question, { headers, rows });
    if (!struct.ok) {
      lastError = new Error(struct.reason);
      continue;
    }

    // Validate difficulty
    const diff = validateQuestionDifficulty(question, level);
    if (!diff.ok) {
      lastError = new Error(diff.reason);
      continue;
    }

    // Accept
    recordQuestion(fingerprint);
    // Clean internal fields that app doesn't need
    delete question.fingerprintParts;
    return question;
  }

  // Fallback: try every template once more without history check (still session-aware)
  for (const template of templates) {
    let question;
    try {
      question = template.build(ctx);
    } catch {
      continue;
    }
    if (!question) continue;
    question.level = level;
    question.difficulty = level;
    question.datasetType = datasetType;
    question.points = question.points || cfg.pointsBase;
    question.templateId = question.templateId || template.id;
    const fpParts = {
      datasetType,
      level,
      ...(question.fingerprintParts || {}),
      templateId: question.templateId,
    };
    question.fingerprint = buildFingerprint(fpParts);
    if (isSessionDuplicate(question.fingerprint)) continue;
    const struct = validateQuestion(question, { headers, rows });
    if (!struct.ok) continue;
    const diff = validateQuestionDifficulty(question, level);
    if (!diff.ok) continue;
    recordQuestion(question.fingerprint);
    delete question.fingerprintParts;
    return question;
  }

  throw new Error(
    `Tidak dapat membuat soal valid untuk Level ${level} pada dataset "${datasetType}". ` +
    (lastError ? `Detail: ${lastError.message}` : 'Template tidak cocok dengan struktur dataset.')
  );
}

/**
 * Generate a batch of unique questions for practice session.
 */
export function generateQuestionBatch({
  level,
  headers,
  rows,
  dataStartRowIndex,
  targetRowIndex,
  datasetType = 'sales',
  columnTypes = [],
  count = 10,
}) {
  const usedTargets = new Set();
  const questions = [];
  const seenFp = new Set();

  for (let i = 0; i < count; i++) {
    try {
      const q = generateQuestion({
        level,
        headers,
        rows,
        dataStartRowIndex,
        targetRowIndex,
        datasetType,
        columnTypes,
        usedTargets,
      });
      if (seenFp.has(q.fingerprint)) {
        // force another attempt
        continue;
      }
      seenFp.add(q.fingerprint);
      q.completed = false;
      questions.push(q);
    } catch (err) {
      if (questions.length === 0) throw err;
      break; // partial batch ok
    }
  }

  if (questions.length === 0) {
    throw new Error(`Gagal membuat paket soal Level ${level}.`);
  }
  return questions;
}

/**
 * Debug helper exposed on window.
 */
export function debugQuestionEngine(state = {}) {
  const stats = getHistoryStats();
  return {
    level: state.level,
    datasetType: state.datasetType,
    history: stats,
    levelConfig: getLevelConfig(state.level || 1),
    templateCounts: Object.fromEntries(
      Object.entries(LEVEL_CONFIG).map(([lvl, cfg]) => [lvl, cfg.templates.length])
    ),
  };
}

export { clearSessionHistory, LEVEL_CONFIG };
