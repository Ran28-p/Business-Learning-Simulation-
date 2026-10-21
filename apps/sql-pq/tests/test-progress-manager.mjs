// Test progress manager (js/progress-manager.js): XP, level, streak, akurasi,
// penyimpanan localStorage, ekspor/impor (replace & merge), ketahanan data rusak.
import { loadAll, reloadScript, check, eq, section, finish, makeLocalStorage } from './_harness.mjs';
loadAll();
const P = SQLPQ_Progress;
const KEY = 'sqlpq_progress_v1';
const stored = () => JSON.parse(localStorage.getItem(KEY));
const q = (over) => Object.assign({ id: 'q1', concept: 'where', level: 1, conceptLabel: 'WHERE' }, over);

section('Keadaan awal & XP');
P.reset();
eq(P.getState().xp, 0, 'xp awal 0');
eq(P.getLevel(), 1, 'level awal 1');
eq(P.accuracy(), 0, 'akurasi tanpa jawaban = 0 (bukan NaN)');
P.addXp(40); eq(P.getState().xp, 40, 'addXp menambah');
P.addXp(-100); eq(P.getState().xp, 0, 'xp tidak pernah negatif');
P.addXp(P.XP_PER_LEVEL); eq(P.getLevel(), 2, 'XP satu level penuh → level 2');
eq(P.getLevelProgress(), { current: 0, needed: P.XP_PER_LEVEL, pct: 0 }, 'progres level tepat di awal level');
P.addXp(75); eq(P.getLevelProgress().pct, 50, 'progres level 50%');
eq(stored().xp, P.getState().xp, 'XP tersimpan ke localStorage');

section('recordAnswer — XP, akurasi, konsep lemah');
P.reset();
eq(P.recordAnswer(q({ level: 1 }), true, 0), 14, 'benar level 1, tanpa hint → +14 XP');
eq(P.recordAnswer(q({ id: 'q2', level: 5 }), true, 0), 30, 'benar level 5 → +30 XP (soal sulit lebih berharga)');
eq(P.recordAnswer(q({ id: 'q3', level: 1 }), true, 2), 8, 'hint mengurangi XP (14 − 2×3)');
eq(P.recordAnswer(q({ id: 'q4', level: 1 }), true, 99), 2, 'XP benar tidak pernah di bawah minimum 2');
eq(P.recordAnswer(q({ id: 'q5', concept: 'join' }), false, 0), 0, 'jawaban salah → 0 XP');
P.recordAnswer(q({ id: 'q6', concept: 'join' }), false, 0);
P.recordAnswer(q({ id: 'q7', concept: 'cte' }), false, 0);
const s = P.getState();
eq([s.totalAnswered, s.totalCorrect], [7, 4], 'hitungan jawaban & benar');
eq(P.accuracy(), 57, 'akurasi 4/7 = 57%');
eq(P.weakConcepts(2), [{ concept: 'join', count: 2 }, { concept: 'cte', count: 1 }], 'konsep lemah diurutkan dari kesalahan terbanyak');
check(s.completedQuestions.q1 && !s.completedQuestions.q5, 'hanya soal yang dijawab benar ditandai selesai');
eq(s.history[0].correct, false, 'riwayat: entri terbaru di depan');
for (let i = 0; i < 250; i++) P.recordAnswer(q({ id: 'h' + i }), true, 0);
eq(P.getState().history.length, 200, 'riwayat dibatasi 200 entri');

section('Lesson, hint, challenge');
P.reset();
eq(P.recordLessonComplete('sql:select', 'SELECT'), 3, 'pelajaran selesai pertama kali → +3 XP');
eq(P.recordLessonComplete('sql:select', 'SELECT'), 0, 'pelajaran yang sama tidak memberi XP dua kali');
eq(P.isLessonComplete('sql:select'), true, 'isLessonComplete');
eq(P.isLessonComplete('sql:lain'), false, 'isLessonComplete: belum selesai');
P.recordHintUsed('qx'); P.recordHintUsed('qx'); eq(P.getState().hintUsage.qx, 2, 'hintUsage dihitung');
const xp0 = P.getState().xp;
P.recordChallengeResult(80, 'Mahir');
eq(P.getState().xp - xp0, 40, 'challenge 80% → +40 XP');
eq(P.getState().challengeAttempts[0], Object.assign({ ts: P.getState().challengeAttempts[0].ts }, { score: 80, band: 'Mahir' }), 'percobaan challenge tercatat');
for (let i = 0; i < 30; i++) P.recordChallengeResult(50, 'x');
eq(P.getState().challengeAttempts.length, 20, 'percobaan challenge dibatasi 20');

section('Streak');
P.reset();
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
P.getState().lastActiveDate = today; P.getState().streak = 4;
eq(P.touchStreak(), 4, 'aktif lagi di hari yang sama → streak tetap');
P.getState().lastActiveDate = daysAgo(1); P.getState().streak = 4;
eq(P.touchStreak(), 5, 'aktif kemarin lalu hari ini → streak +1');
P.getState().lastActiveDate = daysAgo(3); P.getState().streak = 9;
eq(P.touchStreak(), 1, 'bolos ≥ 2 hari → streak mulai lagi dari 1');
eq(P.getState().lastActiveDate, today, 'lastActiveDate diperbarui');

section('Streak mengikuti tanggal lokal');
const RealDate = globalThis.Date;
const jakartaOffset = 7 * 60 * 60 * 1000;
let fakeNow = Date.UTC(2026, 9, 20, 17, 10);
globalThis.Date = class JakartaDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(fakeNow);
    else if (args.length >= 2) super(Date.UTC(args[0], args[1], args[2] == null ? 1 : args[2], args[3] || 0, args[4] || 0, args[5] || 0, args[6] || 0) - jakartaOffset);
    else super(...args);
  }
  static now() { return fakeNow; }
  getFullYear() { return new RealDate(this.getTime() + jakartaOffset).getUTCFullYear(); }
  getMonth() { return new RealDate(this.getTime() + jakartaOffset).getUTCMonth(); }
  getDate() { return new RealDate(this.getTime() + jakartaOffset).getUTCDate(); }
};
try {
  P.reset();
  P.getState().lastActiveDate = '2026-10-20';
  P.getState().streak = 4;
  eq(P.touchStreak(), 5, 'aktiv setelah tengah malam lokal menaikkan streak pada hari lokal baru');
  fakeNow += 86400000;
  eq(P.touchStreak(), 6, 'aktiv pada tengah malam lokal hari berikutnya menaikkan streak lagi');
} finally {
  globalThis.Date = RealDate;
}

section('Ekspor / impor');
P.reset(); P.recordAnswer(q({ id: 'a1' }), true, 0); P.recordLessonComplete('sql:a', 'A');
const exported = P.exportJson();
check(JSON.parse(exported).xp === P.getState().xp, 'exportJson memuat XP saat ini');
P.reset();
P.importJson(exported, 'replace');
eq(P.getState().completedQuestions.a1, true, 'impor mode replace memulihkan progres');
eq(stored().xp, P.getState().xp, 'hasil impor langsung tersimpan');
const xpBefore = P.getState().xp;
P.importJson(exported, 'merge');
eq(P.getState().xp, xpBefore * 2, 'impor mode merge menjumlahkan XP (perilaku terdokumentasi: impor 2× = hitung ganda)');
eq(Object.keys(P.getState().completedLessons), ['sql:a'], 'merge: pelajaran selesai digabung sebagai himpunan (tanpa duplikat)');
for (const bad of ['bukan json', '{"abc":1}', 'null', '[]', '{"xp":"banyak"}']) {
  let msg = ''; try { P.importJson(bad, 'replace'); } catch (e) { msg = e.message; }
  check(msg.length > 0, 'impor file tidak valid ditolak: ' + bad);
}
eq(P.getState().completedQuestions.a1, true, 'impor gagal tidak merusak progres yang ada');
P.importJson(JSON.stringify({ xp: 10 }), 'replace');
check(Array.isArray(P.getState().history) && typeof P.getState().wrongAttempts === 'object', 'impor file parsial dilengkapi nilai default (tidak crash di pemakaian berikutnya)');
const stateBeforeInvalidImport = P.exportJson();
for (const malformed of [
  { xp: 10, challengeAttempts: null },
  { xp: 10, history: [null] },
  { xp: 10, completedLessons: null },
  { xp: -1 },
  { xp: 10, totalAnswered: 1, totalCorrect: 2 }
]) {
  let msg = '';
  try { P.importJson(JSON.stringify(malformed), 'replace'); } catch (e) { msg = e.message; }
  check(msg.length > 0, 'impor menolak struktur progress tidak valid: ' + JSON.stringify(malformed));
  eq(P.exportJson(), stateBeforeInvalidImport, 'impor tidak valid tidak mengubah progress');
}

section('Ketahanan penyimpanan');
globalThis.localStorage = makeLocalStorage();
localStorage.setItem(KEY, '{rusak bukan json');
reloadScript('js/progress-manager.js');
eq(SQLPQ_Progress.getState().xp, 0, 'localStorage berisi JSON rusak → mulai dari state default (tidak crash)');
globalThis.localStorage = makeLocalStorage();
localStorage.setItem(KEY, JSON.stringify({ xp: 500, streak: 3 }));
reloadScript('js/progress-manager.js');
eq([SQLPQ_Progress.getState().xp, SQLPQ_Progress.getLevel()], [500, 4], 'data tersimpan dimuat kembali (XP 500 → level 4)');
check(Array.isArray(SQLPQ_Progress.getState().history), 'data lama tanpa field baru dilengkapi default');

// Penyimpanan penuh / mode privat: setItem melempar error → harus diam-diam aman + peringatan SEKALI
const toasts = [];
globalThis.UI = { toast: (m, t) => toasts.push([m, t]) };
globalThis.localStorage = Object.assign(makeLocalStorage(), { setItem() { throw new Error('QuotaExceededError'); } });
reloadScript('js/progress-manager.js');
let threw = false;
try { SQLPQ_Progress.addXp(10); SQLPQ_Progress.addXp(10); SQLPQ_Progress.recordAnswer(q(), true, 0); } catch (e) { threw = true; }
eq(threw, false, 'penyimpanan gagal tidak melempar exception ke UI');
eq(toasts.length, 1, 'peringatan penyimpanan gagal hanya muncul sekali per sesi');
check(toasts[0] && toasts[0][1] === 'err', 'peringatan bertipe error');
eq(SQLPQ_Progress.getState().xp, 10 + 10 + 14, 'XP tetap bertambah di memori walau gagal disimpan');

finish('test-progress-manager');
