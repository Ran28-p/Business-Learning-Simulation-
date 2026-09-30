/**
 * Scoring Engine – Professional Assessment System
 * ============================================================
 * Weighted scoring across accounting competencies:
 *   Analisis transaksi  20%
 *   Pemilihan akun      25%
 *   Debit / Kredit      25%
 *   Nominal             15%
 *   Tanggal              5%
 *   Posting              5%
 *   Laporan              5%
 *
 * Also tracks: Accuracy, Error Rate, Time Bonus,
 * Hint Penalty, Retry Penalty → persisted in User Progress.
 */

import { saveAppState, loadAppState } from '../storage/localStorage.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { showToast } from '../presentation/modals.js';

/* ═══════════════════════════════════════════════════════════
   WEIGHTS & CONSTANTS
   ═══════════════════════════════════════════════════════════ */

export const SCORE_WEIGHTS = {
  analysis: 0.20,   // Analisis transaksi
  account:  0.25,   // Pemilihan akun
  side:     0.25,   // Debit / Kredit
  amount:   0.15,   // Nominal
  date:     0.05,   // Tanggal
  posting:  0.05,   // Posting buku besar
  report:   0.05    // Laporan keuangan
};

const GRADE_TABLE = [
  { min: 90, grade: 'A',  label: 'Sempurna',   color: '#10b981' },
  { min: 80, grade: 'B+', label: 'Sangat Baik', color: '#34d399' },
  { min: 70, grade: 'B',  label: 'Baik',        color: '#3b82f6' },
  { min: 60, grade: 'C+', label: 'Cukup Baik',  color: '#60a5fa' },
  { min: 50, grade: 'C',  label: 'Cukup',       color: '#f59e0b' },
  { min: 40, grade: 'D',  label: 'Kurang',      color: '#f97316' },
  { min: 0,  grade: 'E',  label: 'Perlu Latihan', color: '#ef4444' }
];

const XP_PER_SCORE_POINT = 2;       // 100 score → 200 XP base
const TIME_BONUS_MAX = 15;          // max +15 points for speed
const TIME_BONUS_THRESHOLD_SEC = 120; // under 2 min = full bonus
const HINT_PENALTY = 3;             // −3 per hint used
const RETRY_PENALTY = 2;            // −2 per retry after first attempt
const MAX_HINT_PENALTY = 15;
const MAX_RETRY_PENALTY = 20;

/* ═══════════════════════════════════════════════════════════
   USER PROGRESS STATE
   ═══════════════════════════════════════════════════════════ */

const PROGRESS_KEY = 'ACT_MASTER_PROGRESS';

/** @type {UserProgress} */
let progress = _defaultProgress();

/**
 * @typedef {object} UserProgress
 * @property {number} totalScore        – cumulative weighted scores
 * @property {number} attemptCount
 * @property {number} correctCount
 * @property {number} errorCount
 * @property {number} totalHintsUsed
 * @property {number} totalRetries
 * @property {number} totalTimeSec
 * @property {number} xp
 * @property {number} level
 * @property {number} bestScore
 * @property {string} bestGrade
 * @property {Array}  history           – recent attempt records
 * @property {object} componentScores   – running averages per component
 * @property {number} sessionStartTs
 * @property {number} attemptStartTs
 * @property {number} currentHints
 * @property {number} currentRetries
 */

function _defaultProgress() {
  return {
    totalScore: 0,
    attemptCount: 0,
    correctCount: 0,
    errorCount: 0,
    totalHintsUsed: 0,
    totalRetries: 0,
    totalTimeSec: 0,
    xp: 0,
    level: 1,
    bestScore: 0,
    bestGrade: 'E',
    history: [],
    componentScores: {
      analysis: [], account: [], side: [], amount: [],
      date: [], posting: [], report: []
    },
    sessionStartTs: Date.now(),
    attemptStartTs: Date.now(),
    currentHints: 0,
    currentRetries: 0
  };
}

/* ═══════════════════════════════════════════════════════════
   LIFECYCLE
   ═══════════════════════════════════════════════════════════ */

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      progress = { ..._defaultProgress(), ...saved };
      // Reset session-scoped counters
      progress.sessionStartTs = Date.now();
      progress.attemptStartTs = Date.now();
      progress.currentHints = 0;
      progress.currentRetries = 0;
    }
  } catch (_) { /* ignore */ }
  return getProgress();
}

let _scoreSaveFailWarned = false; // biar peringatan cuma sekali per sesi

export function saveProgress() {
  try {
    const toSave = { ...progress };
    // Don't persist session timers as stale
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(toSave));
  } catch (_) {
    // Data safety (bagian 30): ini menyimpan XP/skor/akurasi tiap kali siswa
    // menjawab — sebelumnya kegagalan simpan di sini sepenuhnya senyap.
    if (!_scoreSaveFailWarned) {
      _scoreSaveFailWarned = true;
      showToast('⚠️ Penyimpanan skor gagal (penyimpanan browser penuh atau mode privat). Progres skor mungkin tidak tersimpan.');
    }
  }
}

export function getProgress() {
  return {
    ...progress,
    accuracy: calcAccuracy(),
    errorRate: calcErrorRate(),
    grade: scoreToGrade(calcAverageScore()).grade,
    gradeLabel: scoreToGrade(calcAverageScore()).label,
    averageScore: calcAverageScore()
  };
}

export function resetProgress() {
  progress = _defaultProgress();
  saveProgress();
  return getProgress();
}

/* ─── Session timers / counters ─── */

export function startAttempt() {
  progress.attemptStartTs = Date.now();
  progress.currentHints = 0;
  // retries accumulate per attempt cycle; reset only on new scenario
}

export function recordHint() {
  progress.currentHints += 1;
  progress.totalHintsUsed += 1;
  saveProgress();
}

export function recordRetry() {
  progress.currentRetries += 1;
  progress.totalRetries += 1;
  saveProgress();
}

export function newScenario() {
  progress.currentRetries = 0;
  progress.currentHints = 0;
  progress.attemptStartTs = Date.now();
  saveProgress();
}

/* ═══════════════════════════════════════════════════════════
   CORE SCORING
   ═══════════════════════════════════════════════════════════ */

/**
 * Build a component-score breakdown from Validation Engine items.
 *
 * Maps validation fields → scoring components:
 *   completeness / analysis-related → analysis
 *   account                         → account
 *   debit_credit / side             → side
 *   amount / balance                → amount
 *   date                            → date
 *   ledger / trial_balance / posting→ posting
 *   worksheet / income_statement /
 *   financial_position / equity /
 *   cash_flow / report / closing    → report
 *
 * @param {Array} validationItems  – from validationEngine result.items
 * @param {boolean} overallValid
 * @returns {object} component scores 0-100 each
 */
export function extractComponentScores(validationItems = [], overallValid = false) {
  const buckets = {
    analysis: { hit: 0, miss: 0 },
    account:  { hit: 0, miss: 0 },
    side:     { hit: 0, miss: 0 },
    amount:   { hit: 0, miss: 0 },
    date:     { hit: 0, miss: 0 },
    posting:  { hit: 0, miss: 0 },
    report:   { hit: 0, miss: 0 }
  };

  const fieldMap = {
    completeness: 'analysis',
    overall: 'analysis',
    balance: 'amount',
    account: 'account',
    debit_credit: 'side',
    amount: 'amount',
    date: 'date',
    order: 'analysis',
    ledger: 'posting',
    trial_balance: 'posting',
    posting: 'posting',
    worksheet: 'report',
    income_statement: 'report',
    financial_position: 'report',
    equity: 'report',
    cash_flow: 'report',
    closing: 'report',
    report: 'report'
  };

  validationItems.forEach(item => {
    const component = fieldMap[item.field] || 'analysis';
    if (item.severity === 'success') {
      buckets[component].hit += 1;
    } else if (item.severity === 'error') {
      buckets[component].miss += 1;
    }
    // warnings count as half-miss
    else if (item.severity === 'warning') {
      buckets[component].miss += 0.5;
      buckets[component].hit += 0.5;
    }
  });

  const scores = {};
  Object.keys(buckets).forEach(key => {
    const { hit, miss } = buckets[key];
    const total = hit + miss;
    if (total === 0) {
      // No data for this component → neutral 70 if overall valid, else 50
      scores[key] = overallValid ? 70 : 50;
    } else {
      scores[key] = Math.round((hit / total) * 100);
    }
  });

  return scores;
}

/**
 * Compute weighted final score (0-100) from component scores.
 * @param {object} components  – { analysis, account, side, amount, date, posting, report }
 * @returns {number}
 */
export function computeWeightedScore(components) {
  let total = 0;
  Object.keys(SCORE_WEIGHTS).forEach(key => {
    const c = Number(components[key]) || 0;
    total += c * SCORE_WEIGHTS[key];
  });
  return Math.round(Math.min(100, Math.max(0, total)));
}

/**
 * Apply time bonus, hint penalty, retry penalty.
 * @param {number} baseScore
 * @param {object} [opts]
 * @returns {{ finalScore, timeBonus, hintPenalty, retryPenalty, elapsedSec }}
 */
export function applyModifiers(baseScore, opts = {}) {
  const elapsedSec = opts.elapsedSec ?? getElapsedSec();
  const hints = opts.hints ?? progress.currentHints;
  const retries = opts.retries ?? progress.currentRetries;

  // Time bonus: full if under threshold, linear decay to 0 at 2× threshold
  let timeBonus = 0;
  if (elapsedSec <= TIME_BONUS_THRESHOLD_SEC) {
    timeBonus = TIME_BONUS_MAX;
  } else if (elapsedSec < TIME_BONUS_THRESHOLD_SEC * 2) {
    const ratio = 1 - (elapsedSec - TIME_BONUS_THRESHOLD_SEC) / TIME_BONUS_THRESHOLD_SEC;
    timeBonus = Math.round(TIME_BONUS_MAX * ratio);
  }

  const hintPenalty = Math.min(hints * HINT_PENALTY, MAX_HINT_PENALTY);
  const retryPenalty = Math.min(retries * RETRY_PENALTY, MAX_RETRY_PENALTY);

  const finalScore = Math.round(
    Math.min(100, Math.max(0, baseScore + timeBonus - hintPenalty - retryPenalty))
  );

  return { finalScore, timeBonus, hintPenalty, retryPenalty, elapsedSec };
}

/**
 * Full assessment pipeline.
 * Call after validation engine returns a result.
 *
 * @param {object} validationResult  – { valid, score, items, … }
 * @param {string} [phase='journal'] – journal | adjustment | posting | worksheet | report | closing
 * @returns {AssessmentResult}
 */
export function assess(validationResult, phase = 'journal') {
  const components = extractComponentScores(
    validationResult.items || [],
    validationResult.valid
  );

  // Boost phase-specific component from validation engine's own score
  if (phase === 'posting') {
    components.posting = validationResult.score ?? components.posting;
  } else if (phase === 'worksheet' || phase === 'report' || phase === 'closing') {
    components.report = validationResult.score ?? components.report;
  } else if (phase === 'journal' || phase === 'adjustment') {
    // Blend VE score into analysis/account/side/amount
    const veScore = validationResult.score ?? 50;
    components.analysis = Math.round((components.analysis + veScore) / 2);
  }

  const baseScore = computeWeightedScore(components);
  const modifiers = applyModifiers(baseScore);
  const finalScore = modifiers.finalScore;
  const gradeInfo = scoreToGrade(finalScore);
  const xpGained = calcXP(finalScore, validationResult.valid);
  const isCorrect = validationResult.valid === true;

  // Update progress
  progress.attemptCount += 1;
  if (isCorrect) progress.correctCount += 1;
  else progress.errorCount += 1;
  progress.totalScore += finalScore;
  progress.totalTimeSec += modifiers.elapsedSec;
  progress.xp += xpGained;
  progress.level = calcLevel(progress.xp);
  if (finalScore > progress.bestScore) {
    progress.bestScore = finalScore;
    progress.bestGrade = gradeInfo.grade;
  }

  // Component running history
  Object.keys(components).forEach(key => {
    if (!progress.componentScores[key]) progress.componentScores[key] = [];
    progress.componentScores[key].push(components[key]);
    // Keep last 50
    if (progress.componentScores[key].length > 50) {
      progress.componentScores[key].shift();
    }
  });

  // History record
  const record = {
    ts: Date.now(),
    phase,
    baseScore,
    finalScore,
    grade: gradeInfo.grade,
    gradeLabel: gradeInfo.label,
    components,
    timeBonus: modifiers.timeBonus,
    hintPenalty: modifiers.hintPenalty,
    retryPenalty: modifiers.retryPenalty,
    elapsedSec: modifiers.elapsedSec,
    xpGained,
    valid: isCorrect
  };
  progress.history.unshift(record);
  if (progress.history.length > 30) progress.history.pop();

  // Reset attempt timer for next action
  progress.attemptStartTs = Date.now();
  progress.currentHints = 0;
  // Don't reset retries here – they accumulate until newScenario()

  saveProgress();

  return {
    ...record,
    xp: progress.xp,
    level: progress.level,
    accuracy: calcAccuracy(),
    errorRate: calcErrorRate(),
    averageScore: calcAverageScore(),
    progress: getProgress()
  };
}

/* ═══════════════════════════════════════════════════════════
   METRICS
   ═══════════════════════════════════════════════════════════ */

export function calcAccuracy() {
  if (progress.attemptCount === 0) return 0;
  return Math.round((progress.correctCount / progress.attemptCount) * 100);
}

export function calcErrorRate() {
  if (progress.attemptCount === 0) return 0;
  return Math.round((progress.errorCount / progress.attemptCount) * 100);
}

export function calcAverageScore() {
  if (progress.attemptCount === 0) return 0;
  return Math.round(progress.totalScore / progress.attemptCount);
}

export function calcXP(score, isCorrect) {
  let xp = Math.round(score * XP_PER_SCORE_POINT / 10); // 100 → 20 XP base
  if (isCorrect) xp += 10; // completion bonus
  if (score >= 90) xp += 15; // excellence bonus
  else if (score >= 80) xp += 8;
  return Math.max(1, xp);
}

export function calcLevel(xp) {
  // Level thresholds: 0, 50, 150, 300, 500, 750, 1050, …
  // cumulative: 50 * n*(n+1)/2 roughly
  let level = 1;
  let needed = 50;
  let remaining = xp;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = 50 * level;
  }
  return level;
}

export function scoreToGrade(score) {
  for (const row of GRADE_TABLE) {
    if (score >= row.min) return row;
  }
  return GRADE_TABLE[GRADE_TABLE.length - 1];
}

export function getElapsedSec() {
  return Math.round((Date.now() - progress.attemptStartTs) / 1000);
}

/**
 * Average score per component (for radar / progress UI).
 */
export function getComponentAverages() {
  const avgs = {};
  Object.keys(SCORE_WEIGHTS).forEach(key => {
    const arr = progress.componentScores[key] || [];
    if (arr.length === 0) {
      avgs[key] = 0;
    } else {
      avgs[key] = Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
    }
  });
  return avgs;
}

/* ═══════════════════════════════════════════════════════════
   HTML RENDERER
   ═══════════════════════════════════════════════════════════ */

const COMPONENT_LABELS = {
  analysis: 'Analisis Transaksi (20%)',
  account:  'Pemilihan Akun (25%)',
  side:     'Debit / Kredit (25%)',
  amount:   'Nominal (15%)',
  date:     'Tanggal (5%)',
  posting:  'Posting (5%)',
  report:   'Laporan (5%)'
};

/**
 * Render a full assessment card as HTML.
 * @param {object} assessment – return value of assess()
 * @returns {string}
 */
export function renderAssessmentHTML(assessment) {
  const a = assessment;
  const gradeColor = scoreToGrade(a.finalScore).color;

  let componentBars = '';
  Object.keys(SCORE_WEIGHTS).forEach(key => {
    const val = a.components[key] ?? 0;
    const weight = Math.round(SCORE_WEIGHTS[key] * 100);
    componentBars += `
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;">
          <span>${COMPONENT_LABELS[key]}</span>
          <span style="font-weight:600;">${val}/100</span>
        </div>
        <div style="background:var(--bg-primary); border-radius:4px; height:8px; overflow:hidden;">
          <div style="height:100%; width:${val}%; background:var(--accent-color); border-radius:4px;"></div>
        </div>
      </div>`;
  });

  return `
    <div style="margin-bottom:16px; text-align:center;">
      <div style="font-size:2.5rem; font-weight:800; color:${gradeColor};">${a.finalScore}</div>
      <div style="font-size:1.2rem; font-weight:700; color:${gradeColor};">Grade ${a.grade} — ${a.gradeLabel}</div>
      <div style="font-size:0.85rem; color:var(--text-light); margin-top:4px;">
        Base ${a.baseScore}
        ${a.timeBonus ? ` + Time ${a.timeBonus}` : ''}
        ${a.hintPenalty ? ` − Hint ${a.hintPenalty}` : ''}
        ${a.retryPenalty ? ` − Retry ${a.retryPenalty}` : ''}
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; font-size:0.85rem;">
      <div style="background:var(--bg-primary); padding:10px; border-radius:8px; text-align:center;">
        <div style="font-weight:700; font-size:1.1rem;">${a.xpGained}</div>
        <div style="color:var(--text-light);">XP Didapat</div>
      </div>
      <div style="background:var(--bg-primary); padding:10px; border-radius:8px; text-align:center;">
        <div style="font-weight:700; font-size:1.1rem;">Lv.${a.level}</div>
        <div style="color:var(--text-light);">Level (Total XP: ${a.xp})</div>
      </div>
      <div style="background:var(--bg-primary); padding:10px; border-radius:8px; text-align:center;">
        <div style="font-weight:700; font-size:1.1rem;">${a.accuracy}%</div>
        <div style="color:var(--text-light);">Accuracy</div>
      </div>
      <div style="background:var(--bg-primary); padding:10px; border-radius:8px; text-align:center;">
        <div style="font-weight:700; font-size:1.1rem;">${a.errorRate}%</div>
        <div style="color:var(--text-light);">Error Rate</div>
      </div>
    </div>

    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:8px;">
      ⏱ Waktu: ${a.elapsedSec}s
      ${a.timeBonus > 0 ? `(bonus +${a.timeBonus})` : '(tanpa time bonus)'}
      ${a.hintPenalty > 0 ? ` | 💡 Hint penalty −${a.hintPenalty}` : ''}
      ${a.retryPenalty > 0 ? ` | 🔄 Retry penalty −${a.retryPenalty}` : ''}
    </div>

    <details style="margin-top:12px;">
      <summary style="cursor:pointer; font-weight:600; font-size:0.9rem;">📊 Rincian Komponen</summary>
      <div style="margin-top:10px;">${componentBars}</div>
    </details>
  `;
}

/**
 * Render compact progress summary for Evaluasi page.
 */
export function renderProgressSummaryHTML() {
  const p = getProgress();
  const avgs = getComponentAverages();
  const gradeInfo = scoreToGrade(p.averageScore);

  let bars = '';
  Object.keys(SCORE_WEIGHTS).forEach(key => {
    const val = avgs[key] || 0;
    bars += `
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
          <span>${COMPONENT_LABELS[key]}</span><span>${val}</span>
        </div>
        <div style="background:var(--bg-primary); border-radius:4px; height:6px;">
          <div style="height:100%; width:${val}%; background:var(--accent-color); border-radius:4px;"></div>
        </div>
      </div>`;
  });

  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:12px; margin-bottom:20px;">
      <div class="stat-badge" style="flex-direction:column; text-align:center; padding:16px;">
        <div style="font-size:1.8rem; font-weight:800; color:${gradeInfo.color};">${p.averageScore}</div>
        <div style="font-size:0.75rem;">Rata-rata Skor</div>
      </div>
      <div class="stat-badge" style="flex-direction:column; text-align:center; padding:16px;">
        <div style="font-size:1.8rem; font-weight:800; color:${gradeInfo.color};">${p.grade}</div>
        <div style="font-size:0.75rem;">${p.gradeLabel}</div>
      </div>
      <div class="stat-badge" style="flex-direction:column; text-align:center; padding:16px;">
        <div style="font-size:1.8rem; font-weight:800;">${p.xp}</div>
        <div style="font-size:0.75rem;">Total XP</div>
      </div>
      <div class="stat-badge" style="flex-direction:column; text-align:center; padding:16px;">
        <div style="font-size:1.8rem; font-weight:800;">Lv.${p.level}</div>
        <div style="font-size:0.75rem;">Level</div>
      </div>
      <div class="stat-badge" style="flex-direction:column; text-align:center; padding:16px;">
        <div style="font-size:1.8rem; font-weight:800;">${p.accuracy}%</div>
        <div style="font-size:0.75rem;">Accuracy</div>
      </div>
      <div class="stat-badge" style="flex-direction:column; text-align:center; padding:16px;">
        <div style="font-size:1.8rem; font-weight:800;">${p.errorRate}%</div>
        <div style="font-size:0.75rem;">Error Rate</div>
      </div>
    </div>
    <div style="margin-bottom:12px; font-size:0.85rem; color:var(--text-secondary);">
      Percobaan: ${p.attemptCount} | Benar: ${p.correctCount} | Salah: ${p.errorCount} |
      Hint: ${p.totalHintsUsed} | Retry: ${p.totalRetries} |
      Best: ${p.bestScore} (${p.bestGrade})
    </div>
    <h4 style="margin-bottom:8px;">Kompetensi per Komponen</h4>
    ${bars}
  `;
}
