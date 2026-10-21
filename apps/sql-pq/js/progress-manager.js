/**
 * progress-manager.js
 * Menyimpan progres belajar sepenuhnya di localStorage — tanpa login/backend.
 * XP, level, streak, akurasi, riwayat latihan, dan penggunaan hint.
 */
(function (global) {
  "use strict";
  const KEY = "sqlpq_progress_v1";
  const XP_PER_LEVEL = 150;

  function defaultState() {
    return {
      xp: 0,
      streak: 0,
      lastActiveDate: null,
      completedLessons: {},       // { "sql:select": true, "pq:trim": true }
      completedQuestions: {},     // { questionKey: true }
      wrongAttempts: {},          // { conceptKey: count }
      hintUsage: {},              // { questionKey: count }
      totalAnswered: 0,
      totalCorrect: 0,
      history: [],                // [{ts, type, label, correct, xpDelta}]
      challengeAttempts: []       // [{ts, score, band}]
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  let state = load();

  let _saveFailWarned = false; // biar peringatan cuma sekali per sesi
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // Data safety (bagian 30): sebelumnya kegagalan simpan progress (XP/streak/
      // riwayat) sepenuhnya senyap — siswa bisa kehilangan progres tanpa tahu.
      if (!_saveFailWarned) {
        _saveFailWarned = true;
        if (global.UI && typeof global.UI.toast === 'function') {
          global.UI.toast('Penyimpanan progres gagal (penyimpanan browser penuh/mode privat). XP mungkin tidak tersimpan permanen.', 'err');
        }
      }
    }
  }

  function dateKey(date) {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function touchStreak() {
    const now = new Date();
    const today = dateKey(now);
    if (state.lastActiveDate === today) return state.streak;
    const yesterday = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    if (state.lastActiveDate === yesterday) state.streak += 1;
    else state.streak = 1;
    state.lastActiveDate = today;
    persist();
    return state.streak;
  }

  function getLevel() { return Math.floor(state.xp / XP_PER_LEVEL) + 1; }
  function getLevelProgress() {
    const inLevel = state.xp % XP_PER_LEVEL;
    return { current: inLevel, needed: XP_PER_LEVEL, pct: Math.round((inLevel / XP_PER_LEVEL) * 100) };
  }

  function addXp(n, label) {
    state.xp = Math.max(0, state.xp + n);
    touchStreak();
    persist();
    return state.xp;
  }

  function pushHistory(entry) {
    state.history.unshift(Object.assign({ ts: Date.now() }, entry));
    if (state.history.length > 200) state.history.length = 200;
  }

  /**
   * Records the result of answering a generated SQL/PQ question.
   * question: { id, concept, level }, hintsUsedCount: number
   */
  function recordAnswer(question, correct, hintsUsedCount) {
    state.totalAnswered += 1;
    if (correct) state.totalCorrect += 1;
    else state.wrongAttempts[question.concept] = (state.wrongAttempts[question.concept] || 0) + 1;

    let xpDelta = 0;
    if (correct) {
      xpDelta = 10 + question.level * 4;
      xpDelta = Math.max(2, xpDelta - (hintsUsedCount || 0) * 3);
      state.completedQuestions[question.id] = true;
    }
    pushHistory({ type: "question", label: question.conceptLabel || question.concept, level: question.level, correct, xpDelta });
    addXp(xpDelta);
    persist();
    return xpDelta;
  }

  function recordHintUsed(questionId) {
    state.hintUsage[questionId] = (state.hintUsage[questionId] || 0) + 1;
    persist();
  }

  function recordLessonComplete(lessonKey, label) {
    if (state.completedLessons[lessonKey]) return 0;
    state.completedLessons[lessonKey] = true;
    pushHistory({ type: "lesson", label: label || lessonKey, correct: true, xpDelta: 3 });
    addXp(3);
    return 3;
  }

  function isLessonComplete(lessonKey) { return !!state.completedLessons[lessonKey]; }

  function recordChallengeResult(scorePct, band) {
    state.challengeAttempts.unshift({ ts: Date.now(), score: scorePct, band });
    if (state.challengeAttempts.length > 20) state.challengeAttempts.length = 20;
    pushHistory({ type: "challenge", label: "Final Challenge", correct: scorePct >= 65, xpDelta: Math.round(scorePct / 2) });
    addXp(Math.round(scorePct / 2));
  }

  function accuracy() {
    if (!state.totalAnswered) return 0;
    return Math.round((state.totalCorrect / state.totalAnswered) * 100);
  }

  function weakConcepts(limit) {
    return Object.entries(state.wrongAttempts).sort((a, b) => b[1] - a[1]).slice(0, limit || 5).map(([k, v]) => ({ concept: k, count: v }));
  }

  function reset() {
    state = defaultState();
    persist();
  }

  function exportJson() {
    return JSON.stringify(state, null, 2);
  }

  /**
   * Cross-device continuity without a backend: the user exports progress as
   * JSON on device A and imports it on device B. mode: "replace" wholesale-
   * overwrites local state with the imported file; mode: "merge" combines
   * cumulative counters (xp/answers/hints) and unions dedupable sets
   * (completed lessons/questions) with what's already on this device, so
   * importing the same file twice in "merge" mode is NOT safe (it double-
   * counts) — that's why "replace" is offered as the default/simple option.
   */
  function importJson(jsonString, mode) {
    let incoming;
    try { incoming = JSON.parse(jsonString); } catch (e) { throw new Error("File bukan JSON yang valid."); }
    if (!isRecord(incoming) || typeof incoming.xp !== "number" || !Number.isFinite(incoming.xp) || incoming.xp < 0) {
      throw new Error("File ini bukan file progress SQL & Power Query Simulator yang valid.");
    }
    validateImportedState(incoming);
    const normalized = defaultState();
    Object.keys(normalized).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(incoming, key)) normalized[key] = incoming[key];
    });
    incoming = normalized;

    if (mode === "replace") {
      state = incoming;
      persist();
      return { mode: "replace" };
    }

    // merge
    state.xp = (state.xp || 0) + (incoming.xp || 0);
    state.totalAnswered = (state.totalAnswered || 0) + (incoming.totalAnswered || 0);
    state.totalCorrect = (state.totalCorrect || 0) + (incoming.totalCorrect || 0);
    Object.assign(state.completedLessons, incoming.completedLessons);
    Object.assign(state.completedQuestions, incoming.completedQuestions);
    Object.keys(incoming.wrongAttempts || {}).forEach((k) => { state.wrongAttempts[k] = (state.wrongAttempts[k] || 0) + incoming.wrongAttempts[k]; });
    Object.keys(incoming.hintUsage || {}).forEach((k) => { state.hintUsage[k] = (state.hintUsage[k] || 0) + incoming.hintUsage[k]; });
    const mergedHistory = state.history.concat(incoming.history || []).sort((a, b) => b.ts - a.ts);
    state.history = mergedHistory.slice(0, 200);
    const mergedChallenges = state.challengeAttempts.concat(incoming.challengeAttempts || []).sort((a, b) => b.ts - a.ts);
    state.challengeAttempts = mergedChallenges.slice(0, 20);
    // streak/lastActiveDate intentionally left as-is: they describe *this*
    // device's current daily-usage streak, not something meaningful to sum.
    persist();
    return { mode: "merge" };
  }

  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function validateImportedState(value) {
    const validCount = (n) => Number.isInteger(n) && Number.isFinite(n) && n >= 0;
    ["streak", "totalAnswered", "totalCorrect"].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(value, key) && !validCount(value[key])) {
        throw new Error(`Data progress tidak valid: ${key}.`);
      }
    });
    if ((value.totalCorrect || 0) > (value.totalAnswered || 0)) {
      throw new Error("Data progress tidak valid: jumlah jawaban benar melebihi total jawaban.");
    }
    if (Object.prototype.hasOwnProperty.call(value, "lastActiveDate")
      && value.lastActiveDate !== null
      && (typeof value.lastActiveDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.lastActiveDate))) {
      throw new Error("Data progress tidak valid: lastActiveDate.");
    }

    const mapFields = {
      completedLessons: (v) => typeof v === "boolean",
      completedQuestions: (v) => typeof v === "boolean",
      wrongAttempts: validCount,
      hintUsage: validCount
    };
    Object.entries(mapFields).forEach(([key, isValidValue]) => {
      if (!Object.prototype.hasOwnProperty.call(value, key)) return;
      const map = value[key];
      if (!isRecord(map) || Object.values(map).some((item) => !isValidValue(item))) {
        throw new Error(`Data progress tidak valid: ${key}.`);
      }
    });

    if (Object.prototype.hasOwnProperty.call(value, "history")) {
      if (!Array.isArray(value.history) || value.history.some((entry) =>
        !isRecord(entry) || !Number.isFinite(entry.ts) || typeof entry.type !== "string"
        || (entry.label != null && typeof entry.label !== "string")
        || (entry.correct != null && typeof entry.correct !== "boolean")
        || (entry.xpDelta != null && (!Number.isFinite(entry.xpDelta) || entry.xpDelta < 0)))) {
        throw new Error("Data progress tidak valid: history.");
      }
    }
    if (Object.prototype.hasOwnProperty.call(value, "challengeAttempts")) {
      if (!Array.isArray(value.challengeAttempts) || value.challengeAttempts.some((entry) =>
        !isRecord(entry) || !Number.isFinite(entry.ts) || !Number.isFinite(entry.score)
        || entry.score < 0 || entry.score > 100 || typeof entry.band !== "string")) {
        throw new Error("Data progress tidak valid: challengeAttempts.");
      }
    }
  }

  function getState() { return state; }

  global.SQLPQ_Progress = {
    load, persist, addXp, recordAnswer, recordHintUsed, recordLessonComplete, isLessonComplete,
    recordChallengeResult, accuracy, weakConcepts, reset, exportJson, importJson, getState,
    getLevel, getLevelProgress, touchStreak, XP_PER_LEVEL
  };
})(window);
