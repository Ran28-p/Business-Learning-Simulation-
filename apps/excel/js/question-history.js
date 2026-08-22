/**
 * question-history.js
 * Anti-repetition engine: session + global fingerprint history.
 * Fingerprint identifies a unique question by level, template, formula, criteria, etc.
 */

const STORAGE_KEY = 'excel_question_history';
const MAX_GLOBAL = 800;
const MAX_SESSION = 200;

/** @type {Set<string>} */
let sessionFingerprints = new Set();

/** @type {string[]} ordered, most recent last */
let globalFingerprints = [];

let loaded = false;

function loadGlobal() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        globalFingerprints = parsed.slice(-MAX_GLOBAL);
      }
    }
  } catch {
    globalFingerprints = [];
  }
}

function saveGlobal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalFingerprints.slice(-MAX_GLOBAL)));
  } catch {
    // quota or private mode — ignore
  }
}

/**
 * Build a stable fingerprint string for a question.
 * Two questions with the same fingerprint are considered duplicates.
 */
export function buildFingerprint(parts) {
  const {
    datasetType = '',
    level = 0,
    templateId = '',
    formula = '',
    targetColumn = '',
    criteria = '',
    criteriaValues = '',
    targetRow = '',
    scenario = '',
    parameters = '',
  } = parts;

  const norm = (v) => String(v ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return [
    norm(datasetType),
    level,
    norm(templateId),
    norm(formula),
    norm(targetColumn),
    norm(criteria),
    norm(criteriaValues),
    norm(targetRow),
    norm(scenario),
    norm(parameters),
  ].join('|');
}

/**
 * Normalize instruction text for soft-duplicate detection
 * (e.g. "Hitung total penjualan wilayah Jawa Barat" vs "Berapa total penjualan Jawa Barat?")
 */
export function normalizeInstruction(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\sà-ÿ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDuplicate(fingerprint) {
  loadGlobal();
  if (sessionFingerprints.has(fingerprint)) return true;
  if (globalFingerprints.includes(fingerprint)) return true;
  return false;
}

export function isSessionDuplicate(fingerprint) {
  return sessionFingerprints.has(fingerprint);
}

export function recordQuestion(fingerprint) {
  loadGlobal();
  sessionFingerprints.add(fingerprint);
  if (sessionFingerprints.size > MAX_SESSION) {
    // trim oldest — convert to array, drop head
    const arr = Array.from(sessionFingerprints);
    sessionFingerprints = new Set(arr.slice(-MAX_SESSION));
  }
  if (!globalFingerprints.includes(fingerprint)) {
    globalFingerprints.push(fingerprint);
    if (globalFingerprints.length > MAX_GLOBAL) {
      globalFingerprints = globalFingerprints.slice(-MAX_GLOBAL);
    }
    saveGlobal();
  }
}

export function clearSessionHistory() {
  sessionFingerprints = new Set();
}

export function clearGlobalHistory() {
  loadGlobal();
  globalFingerprints = [];
  saveGlobal();
}

export function clearAllHistory() {
  clearSessionHistory();
  clearGlobalHistory();
}

export function getHistoryStats() {
  loadGlobal();
  return {
    sessionCount: sessionFingerprints.size,
    globalCount: globalFingerprints.length,
  };
}

/** For debug */
export function getSessionFingerprints() {
  return Array.from(sessionFingerprints);
}

export function getGlobalFingerprints() {
  loadGlobal();
  return [...globalFingerprints];
}
