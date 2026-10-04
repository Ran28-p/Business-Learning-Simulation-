/**
 * Presentation Layer – Event binding & user-action handlers
 * Connects DOM events to business / accounting logic.
 */

import { showPage, renderTransactionList, renderCurrentTransactionList, renderAdjustmentData, renderCurrentAdjustmentData, renderLedgersPage, renderEvaluasiPage, reinitEngineForLevel } from './pages.js';
import {
  addJournalRow,
  resetJournal,
  renderBadges,
  updateNavbarStats,
  updateScoreDisplay,
  toggleTheme,
  applySavedTheme,
  exportJournalCSV,
  exportToPDF
} from './components.js';
import { showModal, closeModal, showToast } from './modals.js';
import {
  validateJournal,
  readJournalRows,
  submitUserJournal,
  getExpectedJournal,
  exportSessionState,
  importSessionState,
  getCurrentLevel,
  hasUserJournal
} from '../accounting/journal.js';
import {
  validateAdjustments,
  readAdjustmentRows,
  submitUserAdjustmentJournal,
  hasUserAdjustmentJournal
} from '../accounting/adjustments.js';
import { validateClosing, readClosingRows } from '../accounting/closing.js';
import {
  rewardJournalSuccess,
  rewardLedgerPost,
  rewardAdjustmentVerify,
  getScoreSummary
} from '../business/gamification.js';
import {
  changeLevel, changeMode, isExamMode, isLearningMode,
  isExamActive, canUseHint, canShowCorrection,
  startExam, finishExam, cancelExam, submitExamAnswer,
  getExamState, renderExamReportHTML
} from '../business/modeManager.js';
import { getJournalData, setJournalData, getXP, getUserLevel, getMode, resetAppState } from '../business/appState.js';
import { formatNumber } from '../utils/formatters.js';
import {
  validateJournal as veValidateJournal,
  validateAdjustmentJournal,
  validateClosingJournal,
  validateLedgerPosting,
  validateWorksheet,
  validateFinancialStatements,
  renderValidationHTML
} from '../accounting/validationEngine.js';
import {
  assess,
  recordHint,
  recordRetry,
  startAttempt,
  newScenario,
  loadProgress,
  getProgress,
  resetProgress,
  renderAssessmentHTML,
  renderProgressSummaryHTML
} from '../business/scoringEngine.js';
import { generateTutorLessons, renderTutorHTML } from '../business/aiTutor.js';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  saveSidebarCollapsed,
  loadSidebarCollapsed,
  saveSession
} from '../storage/localStorage.js';

/* ─── Journal actions ─── */

function handleCheckJournal() {
  const tbody = document.querySelector('#journalTable tbody');
  if (!tbody) return;

  const entries = readJournalRows(tbody);
  // Also capture dates if present
  const rows = tbody.querySelectorAll('tr');
  entries.forEach((e, i) => {
    const dateInput = rows[i]?.querySelector('input[type="date"]');
    if (dateInput) e.date = dateInput.value;
  });

  const result = veValidateJournal(entries);
  const html = renderValidationHTML(result);

  // Post the STUDENT'S OWN entries to the engine — this is what actually
  // flows into Buku Besar / Neraca Saldo from here on, whether or not it's
  // fully correct (mirrors real practice: you post what you wrote).
  submitUserJournal(entries);
  setJournalData(entries);
  saveFullSession();

  if (result.valid) {
    const stats = rewardJournalSuccess();
    updateNavbarStats({ xp: stats.xp, userLevel: stats.userLevel });
    updateScoreDisplay(getScoreSummary());
    renderBadges();
  }

  // Exam Mode: silent submit, no feedback
  if (isExamActive()) {
    submitExamAnswer('journal', entries, result);
    showModal('Jawaban Tersimpan', 'Jawaban jurnal Anda telah dikumpulkan. Koreksi dan nilai akan ditampilkan setelah ujian selesai.');
    return;
  }

  // Learning Mode: full correction + tutor + score
  if (!result.valid) recordRetry();
  const assessment = assess(result, 'journal');
  const scoreHTML = renderAssessmentHTML(assessment);
  let tutorHTML = '';
  if (!result.valid) {
    const tutor = generateTutorLessons(result, entries);
    tutorHTML = '<hr style="margin:16px 0; border-color:var(--border-color);">' + renderTutorHTML(tutor);
  }
  showModal(
    result.valid ? 'Jurnal Valid!' : 'Hasil Validasi Jurnal',
    html + '<hr style="margin:16px 0; border-color:var(--border-color);">' + scoreHTML + tutorHTML
  );
  updateNavbarStats({ xp: assessment.xp, userLevel: assessment.level });
  updateScoreDisplay({ score: assessment.finalScore, grade: assessment.grade + ' (' + assessment.gradeLabel + ')' });
}

function handleCheckAdjustment() {
  const tbody = document.querySelector('#adjTable tbody');
  if (!tbody) return;

  const entries = readAdjustmentRows(tbody);
  const result = validateAdjustmentJournal(entries);
  const html = renderValidationHTML(result);

  // Post the student's own adjustment entries — flows into the adjusted
  // trial balance / worksheet / laporan from here on.
  submitUserAdjustmentJournal(entries);
  saveFullSession();

  if (result.valid) {
    const stats = rewardAdjustmentVerify();
    updateNavbarStats({ xp: stats.xp, userLevel: stats.userLevel });
    updateScoreDisplay(getScoreSummary());
  }

  if (isExamActive()) {
    submitExamAnswer('adjustment', entries, result);
    showModal('Jawaban Tersimpan', 'Jawaban penyesuaian telah dikumpulkan. Hasil keluar setelah ujian selesai.');
    return;
  }

  if (!result.valid) recordRetry();
  const assessment = assess(result, 'adjustment');
  const scoreHTML = renderAssessmentHTML(assessment);
  let tutorHTML = '';
  if (!result.valid) {
    const tutor = generateTutorLessons(result, entries);
    tutorHTML = '<hr style="margin:16px 0; border-color:var(--border-color);">' + renderTutorHTML(tutor);
  }
  showModal(
    result.valid ? 'Penyesuaian Valid!' : 'Hasil Validasi Penyesuaian',
    html + '<hr style="margin:16px 0; border-color:var(--border-color);">' + scoreHTML + tutorHTML
  );
  updateNavbarStats({ xp: assessment.xp, userLevel: assessment.level });
  updateScoreDisplay({ score: assessment.finalScore, grade: assessment.grade + ' (' + assessment.gradeLabel + ')' });
}

function handleCheckClosing() {
  const tbody = document.querySelector('#closingTable tbody');
  if (!tbody) return;

  const entries = readClosingRows(tbody);
  const result = validateClosingJournal(entries);
  const html = renderValidationHTML(result);

  if (isExamActive()) {
    submitExamAnswer('closing', entries, result);
    showModal('Jawaban Tersimpan', 'Jawaban penutup telah dikumpulkan. Hasil keluar setelah ujian selesai.');
    return;
  }

  if (!result.valid) recordRetry();
  const assessment = assess(result, 'closing');
  const scoreHTML = renderAssessmentHTML(assessment);
  let tutorHTML = '';
  if (!result.valid) {
    const tutor = generateTutorLessons(result, entries);
    tutorHTML = '<hr style="margin:16px 0; border-color:var(--border-color);">' + renderTutorHTML(tutor);
  }
  showModal(
    result.valid ? 'Jurnal Penutup Valid!' : 'Hasil Validasi Penutup',
    html + '<hr style="margin:16px 0; border-color:var(--border-color);">' + scoreHTML + tutorHTML
  );
  updateNavbarStats({ xp: assessment.xp, userLevel: assessment.level });
  updateScoreDisplay({ score: assessment.finalScore, grade: assessment.grade + ' (' + assessment.gradeLabel + ')' });
}

function handleAutoPostLedger() {
  if (isExamActive()) {
    showModal('Tidak Tersedia', 'Auto-Post tidak tersedia selama Mode Ujian berlangsung. Kerjakan Jurnal Umum secara manual.');
    return;
  }

  const confirmed = confirm(
    'Auto-Post akan mengisi Jurnal Umum dengan jawaban yang benar dan langsung memposting ke Buku Besar sebagai contoh belajar. Pekerjaan Anda saat ini di Jurnal Umum akan tertimpa. Lanjutkan?'
  );
  if (!confirmed) return;

  const expected = getExpectedJournal();

  // Reflect the answer key directly in the Jurnal Umum table too, so this
  // is a visible, explicit action — not a silent shortcut.
  const tbody = document.querySelector('#journalTable tbody');
  if (tbody) {
    tbody.innerHTML = '';
    expected.forEach(line => {
      addJournalRow('journalTable');
      const lastRow = tbody.lastElementChild;
      if (!lastRow) return;
      const select = lastRow.querySelector('select');
      const debitInput = lastRow.querySelector('.debit-input');
      const creditInput = lastRow.querySelector('.kredit-input');
      if (select) select.value = line.account;
      if (debitInput) debitInput.value = line.debit || 0;
      if (creditInput) creditInput.value = line.credit || 0;
    });
  }

  submitUserJournal(expected);
  saveFullSession();
  renderLedgersPage();
  const result = validateLedgerPosting();
  const html = renderValidationHTML(result);

  if (result.valid) {
    const stats = rewardLedgerPost();
    updateNavbarStats({ xp: stats.xp, userLevel: stats.userLevel });
    updateScoreDisplay(getScoreSummary());
    renderBadges();
  }

  const assessment = assess(result, 'posting');
  const scoreHTML = renderAssessmentHTML(assessment);
  showModal(
    'Auto-Post Selesai (Contoh Jawaban)',
    html + '<hr style="margin:16px 0; border-color:var(--border-color);">' + scoreHTML
  );
  updateNavbarStats({ xp: assessment.xp, userLevel: assessment.level });
  updateScoreDisplay({ score: assessment.finalScore, grade: assessment.grade + ' (' + assessment.gradeLabel + ')' });
}

function handleShowHint() {
  if (!canUseHint()) {
    showModal('Hint Tidak Tersedia', 'Mode Ujian tidak memperbolehkan hint. Kerjakan berdasarkan pengetahuan Anda.');
    return;
  }
  recordHint();
  showModal(
    'Petunjuk Akuntansi',
    `<b>Rumus Persamaan Dasar Akuntansi:</b><br>Aset = Kewajiban + Ekuitas<br><br>` +
      `<b>Aturan Saldo Normal:</b><br>` +
      `• Aset & Beban: Bertambah di Debit, Berkurang di Kredit.<br>` +
      `• Kewajiban, Ekuitas, Pendapatan: Bertambah di Kredit, Berkurang di Debit.`
  );
}

function handleLevelChange(value) {
  const previousLevel = getCurrentLevel();
  if (String(previousLevel) === String(value)) return;

  if (hasUserJournal() || hasUserAdjustmentJournal()) {
    const confirmed = confirm(
      'Mengubah Level Perusahaan akan menghapus pekerjaan Jurnal Umum & Penyesuaian yang sedang berjalan untuk kasus saat ini. Lanjutkan?'
    );
    if (!confirmed) {
      const selectLevel = document.getElementById('selectLevel');
      if (selectLevel) selectLevel.value = String(previousLevel);
      return;
    }
  }

  changeLevel(value);
  reinitEngineForLevel(value);
  resetJournal('journalTable');
  resetJournal('adjTable');
  resetJournal('closingTable');
  saveFullSession();
  alert('Level Perusahaan diubah! Kasus latihan dan data penyesuaian telah diperbarui.');
}

function handleRandomizeCase() {
  if (isExamActive()) {
    showModal('Tidak Tersedia', 'Tidak bisa mengganti soal saat Mode Ujian sedang berlangsung.');
    return;
  }

  if (hasUserJournal() || hasUserAdjustmentJournal()) {
    const confirmed = confirm(
      'Mengganti ke soal baru akan menghapus pekerjaan Jurnal Umum & Penyesuaian yang sedang berjalan untuk kasus ini. Lanjutkan?'
    );
    if (!confirmed) return;
  }

  const currentLevel = document.getElementById('selectLevel')?.value || getCurrentLevel();
  newScenario();
  reinitEngineForLevel(currentLevel);
  resetJournal('journalTable');
  resetJournal('adjTable');
  resetJournal('closingTable');
  saveFullSession();
}

function handleModeChange(value) {
  const mode = changeMode(value);
  updateNavbarStats({ mode });
  _applyModeUI(mode);
}

function _applyModeUI(mode) {
  const examControls = document.getElementById('examControls');
  const modeDesc = document.getElementById('modeDesc');
  const hintBtn = document.querySelector('[data-action="show-hint"]');
  const timerBadge = document.getElementById('examTimerBadge');

  if (mode === 'Ujian') {
    if (examControls) examControls.style.display = 'block';
    if (modeDesc) modeDesc.textContent = 'Mode Ujian: tidak ada hint, tidak ada koreksi langsung, timer aktif. Hasil keluar setelah selesai.';
    if (hintBtn) hintBtn.style.display = 'none';
  } else {
    if (examControls) examControls.style.display = 'none';
    if (modeDesc) modeDesc.textContent = 'Mode Belajar: jawaban dikoreksi langsung, hint tersedia, boleh revisi.';
    if (hintBtn) hintBtn.style.display = '';
    if (timerBadge) timerBadge.style.display = 'none';
    // Cancel exam if switching away
    if (isExamActive()) cancelExam();
  }
}

function handleStartExam() {
  const mins = parseInt(document.getElementById('examMinutes')?.value || '30', 10);
  startExam(mins, {
    onTick: (state) => {
      const el = document.getElementById('examTimer');
      const badge = document.getElementById('examTimerBadge');
      if (el) el.textContent = state.display;
      if (badge) {
        badge.style.display = 'flex';
        // Turn red when < 5 min
        if (state.remainingSec <= 300) {
          badge.style.background = '#fef2f2';
          badge.style.color = '#ef4444';
        }
      }
    },
    onFinish: (result) => {
      _showExamResult(result);
    }
  });
  const btnFinish = document.getElementById('btnFinishExam');
  if (btnFinish) btnFinish.style.display = 'inline-flex';
  const badge = document.getElementById('examTimerBadge');
  if (badge) badge.style.display = 'flex';
  updateNavbarStats({ mode: 'Ujian' });
  showModal('Ujian Dimulai', 'Timer aktif. Kerjakan jurnal, penyesuaian, posting, dan penutup. Tidak ada hint dan koreksi sampai Anda menyerahkan ujian atau waktu habis.');
}

function handleFinishExam() {
  if (!isExamActive()) {
    showModal('Info', 'Tidak ada ujian yang sedang berlangsung.');
    return;
  }
  if (!confirm('Serahkan ujian sekarang? Jawaban akan dinilai otomatis.')) return;
  const result = finishExam();
  _showExamResult(result);
}

function _showExamResult(result) {
  const badge = document.getElementById('examTimerBadge');
  if (badge) badge.style.display = 'none';
  const btnFinish = document.getElementById('btnFinishExam');
  if (btnFinish) btnFinish.style.display = 'none';

  if (!result) {
    showModal('Hasil Ujian', 'Tidak ada data ujian.');
    return;
  }
  const html = renderExamReportHTML(result);
  showModal('Hasil Ujian — Laporan Otomatis', html);
  updateNavbarStats({ xp: result.progress.xp, userLevel: result.progress.level });
  updateScoreDisplay({ score: result.averageScore, grade: result.progress.grade + ' (' + result.progress.gradeLabel + ')' });
}

/* ─── Onboarding (intro.js) ─── */

function runOnboarding() {
  if (hasCompletedOnboarding()) return;
  if (typeof introJs === 'undefined') return;

  setTimeout(() => {
    introJs()
      .setOptions({
        steps: [
          {
            title: 'Selamat Datang! 👋',
            intro: 'Ini adalah ActMaster Pro, simulator siklus akuntansi interaktif Anda.'
          },
          {
            element: document.querySelector('.sidebar'),
            intro:
              'Ini adalah Modul Siklus Akuntansi. Anda harus mengerjakannya berurutan dari Jurnal Umum hingga Laporan Keuangan.',
            position: 'right'
          },
          {
            element: document.getElementById('themeBtn'),
            intro: 'Klik di sini jika mata Anda lelah untuk beralih ke Mode Gelap!',
            position: 'left'
          }
        ],
        nextLabel: 'Lanjut',
        prevLabel: 'Kembali',
        doneLabel: 'Mulai Belajar!',
        showProgress: true
      })
      .start();
    markOnboardingComplete();
  }, 500);
}

/* ─── Reset / Hapus Riwayat ─── */

function handleResetHistory() {
  if (isExamActive()) {
    showModal('Tidak Tersedia', 'Tidak bisa mereset saat Mode Ujian sedang berlangsung. Selesaikan atau batalkan ujian terlebih dahulu.');
    return;
  }

  const confirmed = confirm(
    'Yakin ingin menghapus SEMUA riwayat (XP, Level, Badge, riwayat nilai) dan pekerjaan yang sedang berjalan (Jurnal, Buku Besar, Penyesuaian, Penutup)? Tindakan ini tidak bisa dibatalkan.'
  );
  if (!confirmed) return;

  // Reset scoring/progress history
  resetProgress();

  // Reset XP / level / badges / captured form data
  resetAppState();

  // Reset the accounting engine's work-in-progress and load a fresh case
  const currentLevel = document.getElementById('selectLevel')?.value || 1;
  reinitEngineForLevel(currentLevel);

  // Clear on-screen journal / adjustment / closing tables back to one empty row
  resetJournal('journalTable');
  resetJournal('adjTable');
  resetJournal('closingTable');

  // Refresh navbar / score / badges / whichever page is currently shown
  updateNavbarStats({ xp: getXP(), userLevel: getUserLevel(), mode: getMode() });
  updateScoreDisplay(getScoreSummary());
  renderBadges();
  renderEvaluasiPage();
  renderLedgersPage();

  // Persist the fresh, empty session so a reload right after reset doesn't
  // resurrect anything old.
  saveFullSession();

  showModal('Berhasil Direset', 'Semua progres dan riwayat telah dihapus. Anda mulai dari awal dengan kasus baru.');
}

/* ─── Session persistence (auto-save / restore across reload) ─── */

let _autosaveTimer = null;

function _collectDraftRows(tableId) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll('tr')).map(row => {
    const dateInput = row.querySelector('input[type="date"]');
    const select = row.querySelector('select');
    const debitInput = row.querySelector('.debit-input');
    const creditInput = row.querySelector('.kredit-input');
    return {
      date: dateInput ? dateInput.value : '',
      account: select ? select.value : '',
      debit: debitInput ? debitInput.value : '0',
      credit: creditInput ? creditInput.value : '0'
    };
  });
}

function _restoreDraftTable(tableId, rows) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.innerHTML = '';
  const list = rows && rows.length ? rows : [{ date: '', account: '', debit: '0', credit: '0' }];
  list.forEach(r => {
    addJournalRow(tableId);
    const lastRow = tbody.lastElementChild;
    if (!lastRow) return;
    const dateInput = lastRow.querySelector('input[type="date"]');
    const select = lastRow.querySelector('select');
    const debitInput = lastRow.querySelector('.debit-input');
    const creditInput = lastRow.querySelector('.kredit-input');
    if (dateInput && r.date) dateInput.value = r.date;
    if (select && r.account) select.value = r.account;
    if (debitInput) debitInput.value = r.debit ?? '0';
    if (creditInput) creditInput.value = r.credit ?? '0';
  });
}

let _autosaveFailWarned = false;

/**
 * Persist the current case + the student's submitted work + whatever is
 * currently typed (but not yet submitted) in the three tables. Cheap
 * enough to call after every meaningful action; debounced for typing.
 *
 * Data safety (bagian 30): kalau localStorage penuh/private-mode dan
 * autosave gagal, siswa TIDAK boleh kehilangan pekerjaan tanpa
 * peringatan — sebelumnya kegagalan ini sepenuhnya senyap. Peringatan
 * hanya ditampilkan SEKALI per sesi (bukan setiap keystroke) supaya
 * tidak mengganggu.
 */
function saveFullSession() {
  const engineState = exportSessionState();
  const drafts = {
    journal: _collectDraftRows('journalTable'),
    adjustment: _collectDraftRows('adjTable'),
    closing: _collectDraftRows('closingTable')
  };
  const ok = saveSession({ ...engineState, drafts });
  if (!ok && !_autosaveFailWarned) {
    _autosaveFailWarned = true;
    showToast('⚠️ Penyimpanan otomatis gagal (penyimpanan browser penuh atau mode privat). Pekerjaan Anda mungkin tidak tersimpan — sebaiknya salin data penting secara manual.');
  }
}

function _debouncedAutosave() {
  clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(saveFullSession, 600);
}

function _bindAutosaveListeners() {
  ['journalTable', 'adjTable', 'closingTable'].forEach(id => {
    const table = document.getElementById(id);
    if (!table) return;
    table.addEventListener('input', _debouncedAutosave);
    table.addEventListener('change', _debouncedAutosave);
  });
  window.addEventListener('beforeunload', saveFullSession);
}

/**
 * Called once at boot when a saved session was found and restored into the
 * engine. Restores the on-screen tables (submitted lines take priority over
 * a stray empty draft; otherwise the draft rows are restored) and the
 * level selector, then lets the student know.
 */
function _applyRestoredSession(session) {
  const selectLevel = document.getElementById('selectLevel');
  if (selectLevel) selectLevel.value = String(getCurrentLevel());

  renderCurrentTransactionList();
  renderCurrentAdjustmentData();

  const drafts = session.drafts || {};
  _restoreDraftTable('journalTable', drafts.journal);
  _restoreDraftTable('adjTable', drafts.adjustment);
  _restoreDraftTable('closingTable', drafts.closing);

  const hasAnyWork =
    hasUserJournal() ||
    hasUserAdjustmentJournal() ||
    (drafts.journal || []).some(r => r.account) ||
    (drafts.adjustment || []).some(r => r.account) ||
    (drafts.closing || []).some(r => r.account);

  if (hasAnyWork) {
    showToast('✅ Sesi sebelumnya dipulihkan — pekerjaan Anda tidak hilang.');
  }
}

/* ─── Mobile drawer (sidebar off-canvas on <1024px) ─── */

function handleToggleMobileDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btn = document.getElementById('btnSidebarToggle');
  if (!sidebar) return;

  const open = sidebar.classList.toggle('mobile-open');
  if (overlay) overlay.classList.toggle('show', open);
  if (btn) btn.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}

function closeMobileDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const btn = document.getElementById('btnSidebarToggle');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('show');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ─── Mode Kerja (focus sidebar) ─── */

function handleToggleFocusMode() {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('focusModeBtn');
  if (!sidebar) return;

  const collapsed = sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  if (btn) btn.classList.toggle('active', collapsed);
  saveSidebarCollapsed(collapsed);
}

function _applyFocusModePreference() {
  const collapsed = loadSidebarCollapsed();
  if (!collapsed) return;
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('focusModeBtn');
  if (sidebar) sidebar.classList.add('collapsed');
  document.body.classList.add('sidebar-collapsed');
  if (btn) btn.classList.add('active');
}

/* ─── Bind all events ─── */

export function bindUIEvents() {
  // Sidebar navigation
  document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showPage(link.dataset.page);
      // On mobile/tablet the sidebar is an off-canvas drawer — close it after
      // picking a page so it doesn't stay covering the content.
      if (window.matchMedia('(max-width: 1023px)').matches) closeMobileDrawer();
    });
  });

  // Mobile drawer (hamburger + overlay + Escape)
  const sidebarToggleBtn = document.getElementById('btnSidebarToggle');
  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', handleToggleMobileDrawer);

  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileDrawer);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileDrawer();
  });

  // Theme
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Mode Kerja (collapse sidebar for more working room)
  const focusModeBtn = document.getElementById('focusModeBtn');
  if (focusModeBtn) focusModeBtn.addEventListener('click', handleToggleFocusMode);

  // Reset / Hapus Riwayat
  const resetHistoryBtn = document.getElementById('resetHistoryBtn');
  if (resetHistoryBtn) resetHistoryBtn.addEventListener('click', handleResetHistory);

  // Dashboard controls
  const selectLevel = document.getElementById('selectLevel');
  if (selectLevel) {
    selectLevel.addEventListener('change', () => handleLevelChange(selectLevel.value));
  }

  const selectMode = document.getElementById('selectMode');
  if (selectMode) {
    selectMode.addEventListener('change', () => handleModeChange(selectMode.value));
    _applyModeUI(selectMode.value);
  }

  const btnStartExam = document.querySelector('[data-action="start-exam"]');
  if (btnStartExam) btnStartExam.addEventListener('click', handleStartExam);

  const btnFinishExam = document.querySelector('[data-action="finish-exam"]');
  if (btnFinishExam) btnFinishExam.addEventListener('click', handleFinishExam);

  // Kasus – randomise
  const btnRandomTx = document.querySelector('[data-action="random-transactions"]');
  if (btnRandomTx) btnRandomTx.addEventListener('click', handleRandomizeCase);

  // Jurnal Umum
  const btnAddJournal = document.querySelector('[data-action="add-journal-row"]');
  if (btnAddJournal) btnAddJournal.addEventListener('click', () => addJournalRow('journalTable'));

  const btnHint = document.querySelector('[data-action="show-hint"]');
  if (btnHint) btnHint.addEventListener('click', handleShowHint);

  const btnCheckJournal = document.querySelector('[data-action="check-journal"]');
  if (btnCheckJournal) btnCheckJournal.addEventListener('click', handleCheckJournal);

  const btnResetJournal = document.querySelector('[data-action="reset-journal"]');
  if (btnResetJournal) btnResetJournal.addEventListener('click', () => resetJournal('journalTable'));

  // Buku Besar
  const btnAutoPost = document.querySelector('[data-action="auto-post-ledger"]');
  if (btnAutoPost) btnAutoPost.addEventListener('click', handleAutoPostLedger);

  // Penyesuaian
  const btnRandomAdj = document.querySelector('[data-action="random-adjustments"]');
  if (btnRandomAdj) btnRandomAdj.addEventListener('click', renderAdjustmentData);

  const btnAddAdj = document.querySelector('[data-action="add-adj-row"]');
  if (btnAddAdj) btnAddAdj.addEventListener('click', () => addJournalRow('adjTable'));

  const btnCheckAdj = document.querySelector('[data-action="check-adjustment"]');
  if (btnCheckAdj) btnCheckAdj.addEventListener('click', handleCheckAdjustment);

  // Laporan
  const btnPDF = document.querySelector('[data-action="export-pdf"]');
  if (btnPDF) btnPDF.addEventListener('click', exportToPDF);

  // Penutup
  const btnAddClosing = document.querySelector('[data-action="add-closing-row"]');
  if (btnAddClosing) btnAddClosing.addEventListener('click', () => addJournalRow('closingTable'));

  const btnCheckClosing = document.querySelector('[data-action="check-closing"]');
  if (btnCheckClosing) btnCheckClosing.addEventListener('click', handleCheckClosing);

  // Evaluasi
  const btnExportCSV = document.querySelector('[data-action="export-csv"]');
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => exportJournalCSV(getJournalData()));
  }

  // Modal close
  const btnCloseModal = document.querySelector('[data-action="close-modal"]');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
}

/**
 * Initialises the entire UI after DOM is ready.
 */
export function initUI(opts = {}) {
  const { restoredSession = null } = opts;

  applySavedTheme();
  _applyFocusModePreference();
  updateNavbarStats({
    xp: getXP(),
    userLevel: getUserLevel(),
    mode: getMode()
  });
  updateScoreDisplay(getScoreSummary());
  renderBadges();

  if (restoredSession) {
    _applyRestoredSession(restoredSession);
  } else {
    renderTransactionList();
    renderAdjustmentData();
    addJournalRow('journalTable');
    addJournalRow('adjTable');
    addJournalRow('closingTable');
  }

  bindUIEvents();
  _bindAutosaveListeners();
  runOnboarding();

  // Always leave a fresh snapshot behind so a reload right after boot
  // (before the student does anything) still has something sane to load.
  saveFullSession();
}
