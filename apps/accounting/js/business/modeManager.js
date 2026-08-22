/**
 * Mode Manager – Learning Mode vs Exam Mode
 * Learning: immediate correction, hints, revise
 * Exam: no hints, no correction, timer, results after finish
 */
import { setLevel, setMode, getLevel, getMode } from './appState.js';
import { MODES } from '../utils/constants.js';
import { assess, newScenario, startAttempt, getProgress } from './scoringEngine.js';

const DEFAULT_EXAM_MINUTES = 30;

const exam = {
  active: false,
  durationSec: DEFAULT_EXAM_MINUTES * 60,
  remainingSec: DEFAULT_EXAM_MINUTES * 60,
  startedAt: null,
  timerId: null,
  submissions: [],
  finished: false,
  result: null
};

let onTickCallback = null;
let onFinishCallback = null;

export function changeLevel(level) {
  setLevel(level);
  return getLevel();
}

export function changeMode(mode) {
  if (exam.active && mode !== MODES.UJIAN) {
    cancelExam();
  }
  const valid = Object.values(MODES).includes(mode) ? mode : MODES.BELAJAR;
  setMode(valid);
  return getMode();
}

export function isExamMode() {
  return getMode() === MODES.UJIAN;
}

export function isLearningMode() {
  return getMode() === MODES.BELAJAR;
}

export function isExamActive() {
  return exam.active && !exam.finished;
}

export function isExamFinished() {
  return exam.finished;
}

export function canUseHint() {
  return isLearningMode() && !isExamActive();
}

export function canShowCorrection() {
  return isLearningMode() && !isExamActive();
}

export function canRevise() {
  if (isExamActive()) return true;
  return isLearningMode();
}

export function startExam(minutes = DEFAULT_EXAM_MINUTES, hooks = {}) {
  if (exam.active) return getExamState();

  setMode(MODES.UJIAN);
  exam.active = true;
  exam.finished = false;
  exam.result = null;
  exam.submissions = [];
  exam.durationSec = Math.max(1, minutes) * 60;
  exam.remainingSec = exam.durationSec;
  exam.startedAt = Date.now();
  onTickCallback = hooks.onTick || null;
  onFinishCallback = hooks.onFinish || null;

  newScenario();
  startAttempt();

  if (exam.timerId) clearInterval(exam.timerId);
  exam.timerId = setInterval(_tick, 1000);
  return getExamState();
}

function _tick() {
  if (!exam.active || exam.finished) return;
  exam.remainingSec = Math.max(0, exam.remainingSec - 1);
  if (onTickCallback) onTickCallback(getExamState());
  if (exam.remainingSec <= 0) {
    finishExam();
  }
}

export function submitExamAnswer(phase, entries, validationResult = null) {
  if (!isExamActive()) return;
  exam.submissions = exam.submissions.filter(s => s.phase !== phase);
  exam.submissions.push({
    phase,
    entries: JSON.parse(JSON.stringify(entries || [])),
    validationResult: validationResult
      ? JSON.parse(JSON.stringify(validationResult))
      : null,
    ts: Date.now()
  });
}

export function finishExam() {
  if (!exam.active && !exam.finished) return null;
  if (exam.timerId) {
    clearInterval(exam.timerId);
    exam.timerId = null;
  }
  exam.active = false;
  exam.finished = true;

  const phaseScores = [];
  let totalScore = 0;
  let count = 0;

  exam.submissions.forEach(sub => {
    if (sub.validationResult) {
      const assessment = assess(sub.validationResult, sub.phase);
      phaseScores.push({
        phase: sub.phase,
        score: assessment.finalScore,
        grade: assessment.grade,
        valid: assessment.valid,
        xpGained: assessment.xpGained
      });
      totalScore += assessment.finalScore;
      count += 1;
    }
  });

  const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
  const elapsedSec = exam.durationSec - exam.remainingSec;
  const progress = getProgress();

  exam.result = {
    averageScore: avgScore,
    phaseScores,
    submissionCount: exam.submissions.length,
    elapsedSec,
    durationSec: exam.durationSec,
    timedOut: exam.remainingSec <= 0,
    progress: {
      xp: progress.xp,
      level: progress.level,
      accuracy: progress.accuracy,
      errorRate: progress.errorRate,
      grade: progress.grade,
      gradeLabel: progress.gradeLabel
    },
    finishedAt: Date.now()
  };

  if (onFinishCallback) onFinishCallback(exam.result);
  return exam.result;
}

export function cancelExam() {
  if (exam.timerId) clearInterval(exam.timerId);
  exam.timerId = null;
  exam.active = false;
  exam.finished = false;
  exam.result = null;
  exam.submissions = [];
  exam.remainingSec = exam.durationSec;
  setMode(MODES.BELAJAR);
}

export function getExamState() {
  const m = Math.floor(exam.remainingSec / 60);
  const s = exam.remainingSec % 60;
  return {
    active: exam.active,
    finished: exam.finished,
    remainingSec: exam.remainingSec,
    durationSec: exam.durationSec,
    display: String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'),
    percentLeft: exam.durationSec > 0
      ? Math.round((exam.remainingSec / exam.durationSec) * 100)
      : 0,
    submissionCount: exam.submissions.length,
    phases: exam.submissions.map(s => s.phase),
    result: exam.result
  };
}

export function getExamResult() {
  return exam.result;
}

export function renderExamReportHTML(result) {
  if (!result) return '<p>Belum ada hasil ujian.</p>';

  const phaseLabels = {
    journal: 'Jurnal Umum',
    adjustment: 'Jurnal Penyesuaian',
    posting: 'Posting Buku Besar',
    closing: 'Jurnal Penutup',
    worksheet: 'Worksheet',
    report: 'Laporan Keuangan'
  };

  let phaseRows = result.phaseScores.map(p =>
    '<tr>' +
      '<td>' + (phaseLabels[p.phase] || p.phase) + '</td>' +
      '<td style="text-align:center;">' + p.score + '</td>' +
      '<td style="text-align:center;">' + p.grade + '</td>' +
      '<td style="text-align:center;">' + (p.valid ? 'OK' : 'X') + '</td>' +
      '<td style="text-align:center;">+' + p.xpGained + ' XP</td>' +
    '</tr>'
  ).join('');

  if (!phaseRows) {
    phaseRows = '<tr><td colspan="5" style="text-align:center; color:var(--text-light);">Tidak ada jawaban yang dikumpulkan</td></tr>';
  }

  const elapsedMin = Math.floor(result.elapsedSec / 60);
  const elapsedSecR = result.elapsedSec % 60;
  const statusText = result.timedOut ? 'Waktu habis' : 'Diserahkan sebelum waktu habis';

  return (
    '<div style="text-align:center; margin-bottom:20px;">' +
      '<div style="font-size:2.5rem; font-weight:800; color:var(--accent-color);">' + result.averageScore + '</div>' +
      '<div style="font-size:1.1rem; font-weight:600;">Nilai Rata-rata Ujian</div>' +
      '<div style="font-size:0.85rem; color:var(--text-light); margin-top:4px;">' +
        statusText + ' | Durasi: ' + elapsedMin + 'm ' + elapsedSecR + 's' +
      '</div>' +
    '</div>' +
    '<table style="width:100%; border-collapse:collapse; font-size:0.9rem; margin-bottom:16px;">' +
      '<thead><tr style="background:var(--bg-primary);">' +
        '<th style="padding:8px; text-align:left;">Bagian</th>' +
        '<th style="padding:8px;">Skor</th>' +
        '<th style="padding:8px;">Grade</th>' +
        '<th style="padding:8px;">Status</th>' +
        '<th style="padding:8px;">XP</th>' +
      '</tr></thead>' +
      '<tbody>' + phaseRows + '</tbody>' +
    '</table>' +
    '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem;">' +
      '<div style="background:var(--bg-primary); padding:12px; border-radius:8px; text-align:center;">' +
        '<div style="font-weight:700; font-size:1.2rem;">' + result.progress.xp + '</div>' +
        '<div style="color:var(--text-light);">Total XP</div>' +
      '</div>' +
      '<div style="background:var(--bg-primary); padding:12px; border-radius:8px; text-align:center;">' +
        '<div style="font-weight:700; font-size:1.2rem;">Lv.' + result.progress.level + '</div>' +
        '<div style="color:var(--text-light);">Level</div>' +
      '</div>' +
      '<div style="background:var(--bg-primary); padding:12px; border-radius:8px; text-align:center;">' +
        '<div style="font-weight:700; font-size:1.2rem;">' + result.progress.accuracy + '%</div>' +
        '<div style="color:var(--text-light);">Accuracy</div>' +
      '</div>' +
      '<div style="background:var(--bg-primary); padding:12px; border-radius:8px; text-align:center;">' +
        '<div style="font-weight:700; font-size:1.2rem;">' + result.submissionCount + '</div>' +
        '<div style="color:var(--text-light);">Jawaban Dikumpulkan</div>' +
      '</div>' +
    '</div>'
  );
}
