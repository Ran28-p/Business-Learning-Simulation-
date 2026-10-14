// Test mesin Game Hub (js/shared/gamehub-engine.js).
// Lapisan:
//   A. LEVEL & UTIL     — kurva level, kunci hari/minggu (ISO), seed deterministik.
//   B. MISI HARIAN      — deterministik per tanggal, baseline, selisih progres NYATA (dibaca lewat
//                         PortalProgress.summarize dari data bentuk asli modul), rollover, reset/impor (progres turun).
//   C. KLAIM & STREAK   — klaim sekali, bonus XP, streak berturut-turut / putus, misi mingguan.
//   D. LENCANA          — terbuka dari kondisi nyata dan permanen.
//   E. KEAMANAN         — state dari localStorage/impor = tak tepercaya (tipe, batas, prototype pollution).
// Tanpa dependency; jalankan:  node tests/test-gamehub.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const eq = (a, b, l) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) console.log(`   diharapkan ${JSON.stringify(b)} · didapat ${JSON.stringify(a)}`); check(ok, l); };
const section = (t) => console.log('\n=== ' + t + ' ===');
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');

function makeStorage(initial = {}) { const m = new Map(Object.entries(initial)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }
globalThis.window = globalThis;
vm.runInThisContext(src('js/shared/progress-aggregator.js'), { filename: 'progress-aggregator.js' });
vm.runInThisContext(src('js/shared/gamehub-engine.js'), { filename: 'gamehub-engine.js' });
const PP = globalThis.PortalProgress, GH = globalThis.GameHubEngine;

// Progres modul bentuk ASLI (kunci & skema sama dengan yang ditulis modul; sinkronnya dijaga test-portal-progress).
const sqlProgress = (xp, answered) => JSON.stringify({ xp, totalAnswered: answered, totalCorrect: Math.floor(answered * 0.8), completedLessons: {}, history: [] });
const excelProgress = (xp, n) => JSON.stringify({ xp, soalDikerjakan: n, jawabanBenar: Math.floor(n * 0.7), levelAktif: 1, riwayat: [] });
const sptData = (xp, hist) => JSON.stringify({ xp, level: 1, history: Array.from({ length: hist }, (_, i) => ({ date: '1/1/2026', module: 'x', mode: 'form', score: 80 })) });
const summaryOf = (store) => PP.summarize(store);
const D = (y, m, d, h = 9) => new Date(y, m - 1, d, h, 0, 0);

/* ============ A. LEVEL & UTIL ============ */
section('A. Level, kunci hari/minggu, deterministik');
{
  eq(GH.levelInfo(0).level, 1, 'XP 0 → level 1');
  eq(GH.levelInfo(99).level, 1, 'XP 99 → masih level 1');
  eq(GH.levelInfo(100).level, 2, 'XP 100 → level 2');
  eq(GH.levelInfo(299).level, 2, 'XP 299 → level 2');
  eq(GH.levelInfo(300).level, 3, 'XP 300 → level 3');
  eq(GH.levelInfo(1000).level, 5, 'XP 1000 → level 5');
  eq(GH.levelInfo(1000).into, 0, 'tepat di batas level: into = 0');
  let prev = 0, mono = true;
  for (let xp = 0; xp < 20000; xp += 37) { const l = GH.levelInfo(xp).level; if (l < prev) mono = false; prev = l; }
  check(mono, 'level tidak pernah turun saat XP naik');
  const li = GH.levelInfo(450); check(li.pct >= 0 && li.pct <= 100 && li.into + 0 <= li.span, 'pct & into/span dalam batas');
  eq(GH.levelInfo(-5).level, 1, 'XP negatif diperlakukan 0');
  eq(GH.levelInfo(NaN).level, 1, 'XP NaN diperlakukan 0');
  check(GH.levelInfo(1e15).level <= 99, 'level dibatasi 99');
  eq(GH.dayKey(D(2026, 1, 5)), '2026-01-05', 'dayKey zero-padded (lokal)');
  eq(GH.weekKey(D(2026, 10, 5)), GH.weekKey(D(2026, 10, 11)), 'Senin–Minggu satu minggu ISO');
  check(GH.weekKey(D(2026, 10, 11)) !== GH.weekKey(D(2026, 10, 12)), 'Senin berikutnya minggu baru');
  eq(GH.weekKey(D(2026, 1, 1)), '2026-W01', 'ISO: 1 Jan 2026 (Kamis) = W01');
  eq(GH.weekKey(D(2024, 12, 30)), '2025-W01', 'ISO: 30 Des 2024 masuk W01 tahun 2025');
}

/* ============ B. MISI HARIAN ============ */
section('B. Misi harian dari progres nyata');
{
  const s0 = summaryOf(makeStorage());
  const d1 = GH.missionDefs('2026-10-10', s0), d2 = GH.missionDefs('2026-10-10', s0);
  eq(d1, d2, 'misi hari yang sama identik (deterministik)');
  eq(d1.length, 3, 'tiga misi per hari');
  check(d1.every((m) => m.target > 0 && m.reward > 0), 'target & reward positif');
  check(GH.MODULE_IDS.includes(d1[0].moduleId), 'misi fokus menunjuk modul yang valid');
  const modsSeen = new Set(); for (let i = 1; i <= 28; i++) modsSeen.add(GH.missionDefs('2026-11-' + String(i).padStart(2, '0'), s0)[0].moduleId);
  check(modsSeen.size === 4, 'dalam sebulan, misi fokus berputar ke keempat modul');
  const counts = {}; for (let i = 0; i < 400; i++) { const d = new Date(2026, 0, 1 + i); const id = GH.missionDefs(GH.dayKey(d), s0)[0].moduleId; counts[id] = (counts[id] || 0) + 1; }
  check(Object.values(counts).every((n) => n > 70 && n < 130), 'rotasi modul merata (400 hari: tiap modul ≈100×) — ' + JSON.stringify(counts));

  const now = D(2026, 10, 10);
  // Hari pertama: baseline diambil dari progres saat ini → semua misi mulai dari 0
  const store = makeStorage({ sqlpq_progress_v1: sqlProgress(300, 20), 'efpg:progress': excelProgress(90, 6) });
  let r = GH.evaluate(null, summaryOf(store), now);
  eq(r.view.missions.map((m) => m.current), [0, 0, 0], 'progres lama sebelum hub dibuka TIDAK dihitung');
  eq(r.view.moduleXp, 390, 'XP gabungan memuat XP modul nyata (300 + 90)');
  check(r.changed === true, 'state baru ditandai berubah (perlu disimpan)');

  // Pengguna berlatih: SQL +4 soal (+60 XP), Excel +1 (+10 XP)
  store.setItem('sqlpq_progress_v1', sqlProgress(360, 24));
  store.setItem('efpg:progress', excelProgress(100, 7));
  const defs = GH.missionDefs(GH.dayKey(now), summaryOf(store));
  r = GH.evaluate(r.state, summaryOf(store), now);
  const focus = r.view.missions.find((m) => m.id === 'focus'), xp = r.view.missions.find((m) => m.id === 'xp'), ex = r.view.missions.find((m) => m.id === 'explore');
  const fa = { sqlpq: 4, excel: 1, spt: 0, accounting: 0 }[defs[0].moduleId];
  eq(focus.current, Math.min(fa, defs[0].target), 'misi fokus = selisih aktivitas modul sasaran');
  eq(xp.current, Math.min(70, defs[1].target), 'misi XP = total selisih XP semua modul (60 + 10)');
  eq(ex.current, 2, 'misi jelajah = jumlah modul yang bertambah (SQL & Excel = 2)');
  check(ex.done === true, 'misi jelajah selesai bila dua modul berlatih');
  eq(r.changed, false, 'tidak ada perubahan state bila hanya progres yang bertambah');

  // Selisih tidak melebihi target di tampilan (current dipotong ke target)
  store.setItem('sqlpq_progress_v1', sqlProgress(5000, 500));
  r = GH.evaluate(r.state, summaryOf(store), now);
  check(r.view.missions.every((m) => m.current <= m.target), 'current tidak pernah melebihi target');

  // Progres TURUN (reset modul / impor cadangan lama) → tidak negatif, baseline bergeser
  store.setItem('sqlpq_progress_v1', sqlProgress(10, 1));
  r = GH.evaluate(r.state, summaryOf(store), now);
  check(r.view.missions.every((m) => m.current >= 0), 'progres turun → tidak ada nilai negatif');
  eq(r.state.baseline.sqlpq.act, 1, 'baseline bergeser turun mengikuti progres baru');
  store.setItem('sqlpq_progress_v1', sqlProgress(40, 3));
  r = GH.evaluate(r.state, summaryOf(store), now);
  check(r.view.missions.find((m) => m.id === 'xp').current === Math.min(30 + 10, GH.missionDefs(GH.dayKey(now), summaryOf(store))[1].target), 'setelah reset, selisih dihitung dari titik baru (30 XP SQL + 10 Excel)');

  // Rollover hari: baseline baru, klaim kemarin dibuang
  const next = D(2026, 10, 11);
  const prevState = { ...r.state, claimed: { [GH.dayKey(now) + ':xp']: true } };
  const r2 = GH.evaluate(prevState, summaryOf(store), next);
  eq(r2.state.day, '2026-10-11', 'hari baru → state.day berganti');
  eq(r2.view.missions.map((m) => m.current), [0, 0, 0], 'hari baru → semua misi mulai dari 0');
  eq(r2.state.claimed, {}, 'klaim hari lalu dibuang');
  eq(r2.state.baseline.sqlpq.xp, 40, 'baseline hari baru = progres saat ini');
}

/* ============ C. KLAIM & STREAK ============ */
section('C. Klaim, bonus XP, streak, misi mingguan');
{
  const store = makeStorage();
  const now = D(2026, 10, 12); // Senin
  let r = GH.evaluate(null, summaryOf(store), now);
  let c = GH.claim(r.state, r.view, 'xp', now);
  eq(c.gained, 0, 'belum selesai → tidak bisa klaim');
  check(!!c.error, 'klaim gagal membawa pesan error');

  // buat misi XP selesai
  const tgt = r.view.missions.find((m) => m.id === 'xp').target;
  store.setItem('sqlpq_progress_v1', sqlProgress(tgt + 5, 5));
  r = GH.evaluate(r.state, summaryOf(store), now);
  const m = r.view.missions.find((x) => x.id === 'xp');
  check(m.done && !m.claimed, 'misi XP selesai & belum diklaim');
  c = GH.claim(r.state, r.view, 'xp', now);
  eq(c.gained, m.reward, 'klaim memberi reward misi');
  eq(c.state.bonusXp, m.reward, 'bonus XP tersimpan di state');
  eq(c.state.streak.count, 1, 'streak = 1 pada klaim pertama');
  eq(c.state.totalClaims, 1, 'totalClaims = 1');
  const c2 = GH.claim(c.state, GH.evaluate(c.state, summaryOf(store), now).view, 'xp', now);
  eq(c2.gained, 0, 'klaim kedua pada misi yang sama ditolak (tidak ada XP ganda)');
  eq(c2.state.bonusXp, m.reward, 'bonus XP tidak bertambah saat klaim ganda');
  r = GH.evaluate(c.state, summaryOf(store), now);
  eq(r.view.totalXp, tgt + 5 + m.reward, 'XP gabungan = XP modul + bonus klaim');
  eq(r.view.missions.find((x) => x.id === 'xp').claimed, true, 'view menandai misi diklaim');
  eq(GH.claim(r.state, r.view, 'tidak-ada', now).gained, 0, 'id misi tak dikenal ditolak');

  // klaim pada hari yang berbeda dari state.day ditolak (hari berganti saat tab terbuka)
  eq(GH.claim(r.state, r.view, 'explore', D(2026, 10, 13)).gained, 0, 'klaim setelah hari berganti ditolak sampai di-evaluate ulang');

  // Streak berturut-turut: Sen, Sel, Rab → 3 ; lompat Jum → 1
  const days = [D(2026, 10, 12), D(2026, 10, 13), D(2026, 10, 14)];
  let st = null; let prevXp = 0;
  const sto = makeStorage();
  days.forEach((d, i) => {
    let ev = GH.evaluate(st, summaryOf(sto), d);
    const t = ev.view.missions.find((x) => x.id === 'xp').target;
    prevXp += t + 1; sto.setItem('sqlpq_progress_v1', sqlProgress(prevXp, i + 1));
    ev = GH.evaluate(ev.state, summaryOf(sto), d);
    st = GH.claim(ev.state, ev.view, 'xp', d).state;
  });
  eq(st.streak.count, 3, 'klaim 3 hari berturut-turut → streak 3');
  eq(GH.evaluate(st, summaryOf(sto), D(2026, 10, 15)).view.streak, 3, 'streak tetap tampil 3 sehari setelah klaim terakhir');
  eq(GH.evaluate(st, summaryOf(sto), D(2026, 10, 16)).view.streak, 0, 'dua hari tanpa klaim → streak tampil 0 (putus)');
  let ev = GH.evaluate(st, summaryOf(sto), D(2026, 10, 17));
  const t2 = ev.view.missions.find((x) => x.id === 'xp').target; prevXp += t2 + 1; sto.setItem('sqlpq_progress_v1', sqlProgress(prevXp, 9));
  ev = GH.evaluate(ev.state, summaryOf(sto), D(2026, 10, 17));
  const after = GH.claim(ev.state, ev.view, 'xp', D(2026, 10, 17)).state;
  eq(after.streak.count, 1, 'klaim setelah jeda → streak mulai lagi dari 1');
  eq(after.streak.best, 3, 'rekor streak terbaik tetap tersimpan');

  // Misi mingguan: 5 klaim dalam satu minggu ISO → bisa diklaim sekali
  let wst = null; const wsto = makeStorage(); let xpv = 0;
  [12, 13, 14, 15, 16].forEach((day, i) => {
    const d = D(2026, 10, day);
    let e = GH.evaluate(wst, summaryOf(wsto), d);
    const tt = e.view.missions.find((x) => x.id === 'xp').target; xpv += tt + 1; wsto.setItem('sqlpq_progress_v1', sqlProgress(xpv, i + 1));
    e = GH.evaluate(e.state, summaryOf(wsto), d);
    wst = GH.claim(e.state, e.view, 'xp', d).state;
  });
  let we = GH.evaluate(wst, summaryOf(wsto), D(2026, 10, 16));
  eq(we.view.weekly.current, 5, 'misi mingguan menghitung 5 klaim minggu ini');
  check(we.view.weekly.done && !we.view.weekly.claimed, 'misi mingguan selesai & belum diklaim');
  const bonusBefore = wst.bonusXp;
  const wc = GH.claim(we.state, we.view, 'weekly', D(2026, 10, 16));
  eq(wc.gained, 100, 'klaim mingguan = 100 XP');
  eq(wc.state.bonusXp, bonusBefore + 100, 'bonus XP bertambah 100');
  const wc2 = GH.claim(wc.state, GH.evaluate(wc.state, summaryOf(wsto), D(2026, 10, 16)).view, 'weekly', D(2026, 10, 16));
  eq(wc2.gained, 0, 'misi mingguan tidak bisa diklaim dua kali');
  const nextWeek = GH.evaluate(wc.state, summaryOf(wsto), D(2026, 10, 19));
  eq(nextWeek.view.weekly.current, 0, 'minggu baru → hitungan mingguan kembali 0');
  eq(nextWeek.view.weekly.claimed, false, 'minggu baru → bisa diklaim lagi nanti');
}

/* ============ D. LENCANA ============ */
section('D. Lencana (achievement)');
{
  const now = D(2026, 10, 12);
  let r = GH.evaluate(null, summaryOf(makeStorage()), now);
  eq(r.view.achievements.filter((a) => a.unlocked).length, 0, 'pengguna baru: tidak ada lencana palsu');
  const store = makeStorage({ spt_simulator_data: sptData(40, 2), sqlpq_progress_v1: sqlProgress(100, 5), 'efpg:progress': excelProgress(30, 3), ACT_MASTER_STATE: JSON.stringify({ xp: 20, level: 1, history: [{ t: 1 }] }) });
  r = GH.evaluate(r.state, summaryOf(store), now);
  const un = (id) => r.view.achievements.find((a) => a.id === id).unlocked;
  check(un('first_step'), 'aktivitas nyata → "Langkah Pertama" terbuka');
  const started = summaryOf(store).totals.startedModules;
  eq(un('explorer'), started >= 4, '"Penjelajah" hanya bila keempat modul benar-benar dimulai');
  check(!un('mission_1') && !un('level_5'), 'lencana yang belum memenuhi syarat tetap terkunci');
  // permanen: terbuka lalu progres direset → tetap terbuka
  const kept = GH.evaluate(r.state, summaryOf(makeStorage()), now);
  check(kept.view.achievements.find((a) => a.id === 'first_step').unlocked, 'lencana tetap terbuka setelah progres direset');
  // level 5 butuh 1000 XP gabungan
  const big = makeStorage({ sqlpq_progress_v1: sqlProgress(1200, 80) });
  const lv = GH.evaluate(r.state, summaryOf(big), now);
  check(lv.view.achievements.find((a) => a.id === 'level_5').unlocked, '1.200 XP → "Level 5" terbuka');
}

/* ============ E. KEAMANAN & KETAHANAN ============ */
section('E. State tak tepercaya');
{
  const evil = JSON.parse('{"v":99,"day":"bukan-tanggal","baseline":{"spt":{"xp":"9e99","act":-5},"__proto__":{"xp":1},"hack":{"xp":1}},"claimed":{"x":true,"2026-10-10:xp":"ya","2026-10-10:focus":true},"bonusXp":1e30,"totalClaims":"banyak","streak":{"count":-3,"last":"kemarin","best":"x"},"weekly":{"week":"2026-W99x","claimed":"ya"},"log":[{"day":"2026-10-10","id":"xp","xp":1e12},{"day":"x","id":"<script>","xp":5},7,null],"unlocked":{"ok_id":"2026-10-10","<img>":"2026-10-10","bad":"nanti"}}');
  const s = GH.sanitizeState(evil);
  eq(s.day, null, 'tanggal tidak valid dibuang');
  eq(s.baseline.hack, undefined, 'modul tak dikenal dibuang dari baseline');
  eq(({}).xp, undefined, 'prototype Object tidak tercemar');
  check(s.baseline.spt && s.baseline.spt.xp === 100000000 && s.baseline.spt.act === 0, 'angka raksasa dibatasi ke batas atas; negatif → 0');
  eq(Object.keys(s.claimed), ['2026-10-10:focus'], 'hanya klaim berformat valid dengan nilai true yang lolos');
  check(s.bonusXp <= 100000000, 'bonusXp dibatasi');
  eq(s.totalClaims, 0, 'totalClaims non-angka → 0');
  eq(s.streak, { count: 0, last: null, best: 0 }, 'streak rusak → default');
  eq(s.weekly, { week: null, claimed: false }, 'weekly rusak → default');
  eq(s.log.length, 1, 'log hanya memuat entri valid');
  check(s.log[0].xp <= 100000, 'xp log dibatasi');
  eq(Object.keys(s.unlocked), ['ok_id'], 'lencana: id & tanggal harus valid');
  for (const bad of [null, undefined, 5, 'x', [], true]) eq(GH.sanitizeState(bad).v, 1, 'input bukan objek → state kosong (' + JSON.stringify(bad) + ')');
  // evaluate tahan terhadap summary kosong / rusak
  for (const sum of [null, undefined, {}, { modules: null }, { modules: [{ id: 'spt', xp: 'a', activities: NaN }] }]) {
    let ok = true; try { const r = GH.evaluate({}, sum, D(2026, 10, 12)); ok = r.view.missions.length === 3 && r.view.player.level >= 1; } catch (e) { ok = false; }
    check(ok, 'evaluate tahan terhadap summary rusak: ' + JSON.stringify(sum));
  }
  // idempotensi: evaluate dua kali pada waktu yang sama tidak mengubah state
  const a = GH.evaluate(null, summaryOf(makeStorage()), D(2026, 10, 12));
  const b = GH.evaluate(a.state, summaryOf(makeStorage()), D(2026, 10, 12));
  eq(b.state, a.state, 'evaluate idempoten pada hari yang sama');
  eq(b.changed, false, 'evaluate ulang tidak menandai perubahan');
  // tidak memodifikasi argumen
  const frozen = JSON.parse(JSON.stringify(a.state)); GH.evaluate(frozen, summaryOf(makeStorage({ sqlpq_progress_v1: sqlProgress(500, 40) })), D(2026, 10, 12));
  eq(frozen, a.state, 'evaluate tidak memodifikasi state masukan');
}

console.log(`\n========== test-gamehub: ${passed} lolos, ${failed} gagal ==========`);
process.exit(failed ? 1 : 0);
