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

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function touchStreak() {
    const today = todayStr();
    if (state.lastActiveDate === today) return state.streak;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
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
    if (typeof incoming !== "object" || incoming === null || typeof incoming.xp !== "number") {
      throw new Error("File ini bukan file progress SQL & Power Query Simulator yang valid.");
    }
    incoming = Object.assign(defaultState(), incoming);

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

  function getState() { return state; }

  global.SQLPQ_Progress = {
    load, persist, addXp, recordAnswer, recordHintUsed, recordLessonComplete, isLessonComplete,
    recordChallengeResult, accuracy, weakConcepts, reset, exportJson, importJson, getState,
    getLevel, getLevelProgress, touchStreak, XP_PER_LEVEL
  };
})(window);
