/**
 * gamehub-engine.js — Mesin Game Hub (Portal Belajar). MURNI: tanpa DOM, tanpa localStorage, tanpa jaringan.
 *
 * Prinsip: TIDAK ADA data karangan. Semua kemajuan berasal dari progres NYATA modul, yang dibaca
 * lewat PortalProgress.summarize() (js/shared/progress-aggregator.js). Game Hub hanya menambah:
 *   • misi harian  — dihitung dari SELISIH progres modul sejak Game Hub dibuka hari itu ("baseline"),
 *   • misi mingguan, streak, level, dan lencana (achievement) — turunan dari klaim misi + progres,
 *   • bonus XP — hanya dari klaim misi; disimpan di state Game Hub (bukan di modul).
 * XP gabungan = jumlah XP semua modul (nyata) + bonus XP klaim. Level dihitung dari XP gabungan.
 *
 * Fungsi utama (semua mengembalikan objek baru; tidak memodifikasi argumen):
 *   sanitizeState(raw)                 → state valid (raw = apa pun dari localStorage; TIDAK dipercaya)
 *   evaluate(state, summary, now)      → { state, view }   (rollover hari, baseline, progres misi, lencana)
 *   claim(state, view, missionId, now) → { state, gained } (klaim sekali; update streak & log)
 *   levelInfo(totalXp)                 → { level, title, into, span, pct, nextAt }
 * Deterministik: misi hari yang sama selalu sama untuk semua pengguna (seed = tanggal lokal).
 */
(function (global) {
  'use strict';
  if (global.GameHubEngine) return;

  var STATE_VERSION = 1;
  var MAX_LOG = 60;
  var MAX_XP = 100000000;
  var DAY_MS = 86400000;
  var MODULE_IDS = ['spt', 'accounting', 'excel', 'sqlpq'];
  var TITLES = ['Pemula', 'Magang', 'Staf', 'Analis', 'Senior', 'Supervisor', 'Manajer', 'Direktur', 'Konsultan', 'Legenda'];

  /* ───────────── util ───────────── */
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function clampInt(n, max) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    return Math.min(n, max || MAX_XP);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /** Kunci hari lokal "YYYY-MM-DD". */
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDay(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  /** Kunci minggu ISO (Senin = awal minggu): "YYYY-Www". */
  function weekKey(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dow = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dow);
    var yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
    var week = Math.ceil(((t - yearStart) / DAY_MS + 1) / 7);
    return t.getUTCFullYear() + '-W' + pad(week);
  }
  /** FNV-1a 32-bit — seed deterministik dari string. */
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    // finalizer (murmur3 fmix32): bit bawah FNV lemah → tanpa ini "hash % 4" bias untuk string mirip (tanggal berurutan)
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
    return h >>> 0;
  }
  function pick(arr, seed) { return arr[seed % arr.length]; }

  /* ───────────── level ───────────── */
  // Batas XP kumulatif untuk mencapai level L: 50 * (L-1) * L  → L2=100, L3=300, L4=600, L5=1000 …
  function xpAt(level) { return 50 * (level - 1) * level; }
  function levelInfo(totalXp) {
    var xp = clampInt(totalXp);
    var level = 1;
    while (level < 99 && xp >= xpAt(level + 1)) level++;
    var from = xpAt(level), to = xpAt(level + 1);
    return {
      level: level,
      title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))],
      into: xp - from, span: to - from,
      pct: Math.max(0, Math.min(100, Math.round((xp - from) / (to - from) * 100))),
      nextAt: to
    };
  }

  /* ───────────── state ───────────── */
  function emptyState() {
    return { v: STATE_VERSION, day: null, baseline: {}, claimed: {}, bonusXp: 0, totalClaims: 0,
      streak: { count: 0, last: null, best: 0 }, weekly: { week: null, claimed: false }, log: [], unlocked: {} };
  }

  /** State dari localStorage/impor = tak tepercaya: paksa bentuk, tipe, dan batas. */
  function sanitizeState(raw) {
    var s = emptyState();
    if (!isObj(raw)) return s;
    if (typeof raw.day === 'string' && parseDay(raw.day)) s.day = raw.day;
    if (isObj(raw.baseline)) {
      MODULE_IDS.forEach(function (id) {
        var b = raw.baseline[id];
        if (isObj(b)) s.baseline[id] = { xp: clampInt(b.xp), act: clampInt(b.act) };
      });
    }
    if (isObj(raw.claimed)) {
      Object.keys(raw.claimed).slice(0, 20).forEach(function (k) {
        if (/^\d{4}-\d{2}-\d{2}:[a-z]{1,12}$/.test(k) && raw.claimed[k] === true) s.claimed[k] = true;
      });
    }
    s.bonusXp = clampInt(raw.bonusXp);
    s.totalClaims = clampInt(raw.totalClaims, 1000000);
    if (isObj(raw.streak)) {
      s.streak.count = clampInt(raw.streak.count, 100000);
      s.streak.best = Math.max(s.streak.count, clampInt(raw.streak.best, 100000));
      if (typeof raw.streak.last === 'string' && parseDay(raw.streak.last)) s.streak.last = raw.streak.last;
    }
    if (isObj(raw.weekly) && typeof raw.weekly.week === 'string' && /^\d{4}-W\d{2}$/.test(raw.weekly.week)) {
      s.weekly.week = raw.weekly.week; s.weekly.claimed = raw.weekly.claimed === true;
    }
    if (Array.isArray(raw.log)) {
      raw.log.slice(-MAX_LOG).forEach(function (e) {
        if (isObj(e) && typeof e.day === 'string' && parseDay(e.day) && typeof e.id === 'string' && /^[a-z]{1,12}$/.test(e.id)) {
          s.log.push({ day: e.day, id: e.id, xp: clampInt(e.xp, 100000) });
        }
      });
    }
    if (isObj(raw.unlocked)) {
      Object.keys(raw.unlocked).slice(0, 50).forEach(function (k) {
        if (/^[a-z0-9_]{1,24}$/.test(k) && typeof raw.unlocked[k] === 'string' && parseDay(raw.unlocked[k])) s.unlocked[k] = raw.unlocked[k];
      });
    }
    return s;
  }

  function clone(s) { return JSON.parse(JSON.stringify(s)); }

  /* ───────────── ringkasan modul (input dari PortalProgress.summarize) ───────────── */
  function snapshot(summary) {
    var snap = {};
    ((summary && summary.modules) || []).forEach(function (m) {
      if (MODULE_IDS.indexOf(m.id) !== -1) snap[m.id] = { xp: clampInt(m.xp), act: clampInt(m.activities) };
    });
    MODULE_IDS.forEach(function (id) { if (!snap[id]) snap[id] = { xp: 0, act: 0 }; });
    return snap;
  }

  /* ───────────── misi harian ───────────── */
  function moduleLabel(summary, id) {
    var m = ((summary && summary.modules) || []).filter(function (x) { return x.id === id; })[0];
    return m && m.label ? m.label : id;
  }

  /** Definisi misi hari itu (deterministik; belum berisi progres). */
  function missionDefs(day, summary) {
    var fid = pick(MODULE_IDS, hash(day + '|focus'));
    var fn = pick([2, 3, 4], hash(day + '|n'));
    var xt = pick([40, 60, 80], hash(day + '|x'));
    return [
      { id: 'focus', kind: 'activities', moduleId: fid, target: fn, reward: 15 * fn,
        title: 'Fokus: ' + moduleLabel(summary, fid),
        desc: 'Selesaikan ' + fn + ' aktivitas (soal, latihan, atau simulasi) di ' + moduleLabel(summary, fid) + '.' },
      { id: 'xp', kind: 'xp', moduleId: null, target: xt, reward: Math.round(xt / 2),
        title: 'Kumpulkan ' + xt + ' XP',
        desc: 'Kumpulkan ' + xt + ' XP dari modul mana pun hari ini.' },
      { id: 'explore', kind: 'modules', moduleId: null, target: 2, reward: 25,
        title: 'Jelajah dua modul',
        desc: 'Berlatih di dua modul berbeda hari ini.' }
    ];
  }

  function missionProgress(def, deltas) {
    if (def.kind === 'activities') return deltas[def.moduleId] ? deltas[def.moduleId].act : 0;
    if (def.kind === 'xp') return MODULE_IDS.reduce(function (a, id) { return a + deltas[id].xp; }, 0);
    // modules: modul berbeda dengan kemajuan nyata (aktivitas ATAU xp bertambah)
    return MODULE_IDS.filter(function (id) { return deltas[id].act > 0 || deltas[id].xp > 0; }).length;
  }

  /* ───────────── lencana ───────────── */
  var ACHIEVEMENTS = [
    { id: 'first_step', icon: '👣', title: 'Langkah Pertama', desc: 'Mengerjakan aktivitas pertama di modul mana pun.', test: function (c) { return c.totalActivities > 0; } },
    { id: 'explorer', icon: '🧭', title: 'Penjelajah', desc: 'Memulai keempat modul.', test: function (c) { return c.startedModules >= 4; } },
    { id: 'mission_1', icon: '🎯', title: 'Misi Pertama', desc: 'Mengklaim misi pertama.', test: function (c) { return c.state.totalClaims >= 1; } },
    { id: 'mission_10', icon: '🏅', title: 'Sepuluh Misi', desc: 'Mengklaim 10 misi.', test: function (c) { return c.state.totalClaims >= 10; } },
    { id: 'streak_3', icon: '🔥', title: 'Tiga Hari Beruntun', desc: 'Mengklaim misi 3 hari berturut-turut.', test: function (c) { return c.state.streak.best >= 3; } },
    { id: 'streak_7', icon: '⚡', title: 'Seminggu Penuh', desc: 'Mengklaim misi 7 hari berturut-turut.', test: function (c) { return c.state.streak.best >= 7; } },
    { id: 'weekly', icon: '🏆', title: 'Juara Mingguan', desc: 'Menuntaskan misi mingguan.', test: function (c) { return c.weeklyEverClaimed; } },
    { id: 'level_5', icon: '⭐', title: 'Level 5', desc: 'Mencapai level 5 (XP gabungan 1.000).', test: function (c) { return c.player.level >= 5; } },
    { id: 'xp_2500', icon: '💎', title: '2.500 XP', desc: 'Mengumpulkan 2.500 XP gabungan.', test: function (c) { return c.totalXp >= 2500; } }
  ];

  /* ───────────── evaluasi ───────────── */
  var WEEKLY = { id: 'weekly', target: 5, reward: 100, title: 'Misi Mingguan', desc: 'Klaim 5 misi harian dalam satu minggu.' };

  function evaluate(rawState, summary, now) {
    var s = sanitizeState(rawState);
    now = now instanceof Date ? now : new Date();
    var today = dayKey(now);
    var snap = snapshot(summary);
    var changed = false;

    // Hari baru (atau state kosong): ambil baseline dari progres saat ini, buang klaim kemarin.
    if (s.day !== today) { s.day = today; s.baseline = clone(snap); s.claimed = {}; changed = true; }
    // Baseline modul yang belum ada (mis. state lama) → ambil dari sekarang.
    MODULE_IDS.forEach(function (id) { if (!s.baseline[id]) { s.baseline[id] = clone(snap[id]); changed = true; } });

    // Selisih progres. Bila progres MENURUN (reset/impor data lama), geser baseline agar tidak negatif.
    var deltas = {};
    MODULE_IDS.forEach(function (id) {
      var b = s.baseline[id], c = snap[id];
      if (c.xp < b.xp) { b.xp = c.xp; changed = true; }
      if (c.act < b.act) { b.act = c.act; changed = true; }
      deltas[id] = { xp: c.xp - b.xp, act: c.act - b.act };
    });

    var missions = missionDefs(today, summary).map(function (def) {
      var key = today + ':' + def.id;
      var cur = missionProgress(def, deltas);
      return { id: def.id, key: key, kind: def.kind, moduleId: def.moduleId, title: def.title, desc: def.desc,
        target: def.target, current: Math.min(cur, def.target), reward: def.reward,
        done: cur >= def.target, claimed: s.claimed[key] === true };
    });

    // Misi mingguan: banyaknya klaim harian pada minggu ini (dari log yang tersimpan).
    var wk = weekKey(now);
    var weeklyCount = s.log.filter(function (e) { var d = parseDay(e.day); return d && weekKey(d) === wk && e.id !== 'weekly'; }).length;
    var weeklyClaimed = s.weekly.week === wk && s.weekly.claimed === true;
    var weekly = { id: WEEKLY.id, key: wk, title: WEEKLY.title, desc: WEEKLY.desc, target: WEEKLY.target, reward: WEEKLY.reward,
      current: Math.min(weeklyCount, WEEKLY.target), done: weeklyCount >= WEEKLY.target, claimed: weeklyClaimed };

    // Streak yang ditampilkan: putus bila klaim terakhir lebih lama dari kemarin.
    var yesterday = dayKey(addDays(now, -1));
    var streakNow = (s.streak.last === today || s.streak.last === yesterday) ? s.streak.count : 0;

    var modulesView = ((summary && summary.modules) || []).filter(function (m) { return MODULE_IDS.indexOf(m.id) !== -1; });
    var moduleXp = modulesView.reduce(function (a, m) { return a + clampInt(m.xp); }, 0);
    var totalXp = moduleXp + s.bonusXp;
    var player = levelInfo(totalXp);

    var ctx = {
      state: s, player: player, totalXp: totalXp,
      totalActivities: modulesView.reduce(function (a, m) { return a + clampInt(m.activities); }, 0),
      startedModules: modulesView.filter(function (m) { return m.started; }).length,
      weeklyEverClaimed: s.weekly.claimed === true || s.log.some(function (e) { return e.id === 'weekly'; })
    };
    ACHIEVEMENTS.forEach(function (a) { if (!s.unlocked[a.id] && a.test(ctx)) { s.unlocked[a.id] = today; changed = true; } });
    var achievements = ACHIEVEMENTS.map(function (a) { return { id: a.id, icon: a.icon, title: a.title, desc: a.desc, unlocked: !!s.unlocked[a.id], on: s.unlocked[a.id] || null }; });

    return {
      state: s, changed: changed,
      view: {
        day: today, player: player, moduleXp: moduleXp, bonusXp: s.bonusXp, totalXp: totalXp,
        streak: streakNow, bestStreak: s.streak.best, totalClaims: s.totalClaims,
        missions: missions, weekly: weekly, achievements: achievements,
        modules: modulesView, log: s.log.slice(-10).reverse()
      }
    };
  }

  /* ───────────── klaim ───────────── */
  /** Klaim satu misi (id harian atau "weekly"). Hanya berhasil bila selesai & belum diklaim. */
  function claim(rawState, view, missionId, now) {
    var s = sanitizeState(rawState);
    now = now instanceof Date ? now : new Date();
    var today = dayKey(now);
    if (s.day !== today) return { state: s, gained: 0, error: 'hari berganti' };

    if (missionId === 'weekly') {
      var w = view && view.weekly;
      if (!w || !w.done || w.claimed) return { state: s, gained: 0, error: 'belum bisa diklaim' };
      s.weekly = { week: w.key, claimed: true };
      s.bonusXp = clampInt(s.bonusXp + w.reward);
      s.totalClaims = clampInt(s.totalClaims + 1, 1000000);
      s.log.push({ day: today, id: 'weekly', xp: w.reward });
      if (s.log.length > MAX_LOG) s.log = s.log.slice(-MAX_LOG);
      return { state: s, gained: w.reward };
    }

    var m = view && view.missions && view.missions.filter(function (x) { return x.id === missionId; })[0];
    if (!m || !m.done || s.claimed[m.key]) return { state: s, gained: 0, error: 'belum bisa diklaim' };
    s.claimed[m.key] = true;
    s.bonusXp = clampInt(s.bonusXp + m.reward);
    s.totalClaims = clampInt(s.totalClaims + 1, 1000000);
    s.log.push({ day: today, id: m.id, xp: m.reward });
    if (s.log.length > MAX_LOG) s.log = s.log.slice(-MAX_LOG);

    // Streak: hari berturut-turut dengan ≥1 klaim
    var yesterday = dayKey(addDays(now, -1));
    if (s.streak.last !== today) {
      s.streak.count = s.streak.last === yesterday ? s.streak.count + 1 : 1;
      s.streak.last = today;
      s.streak.best = Math.max(s.streak.best, s.streak.count);
    }
    return { state: s, gained: m.reward };
  }

  global.GameHubEngine = {
    STATE_VERSION: STATE_VERSION, MODULE_IDS: MODULE_IDS, ACHIEVEMENTS: ACHIEVEMENTS,
    sanitizeState: sanitizeState, evaluate: evaluate, claim: claim, levelInfo: levelInfo,
    dayKey: dayKey, weekKey: weekKey, missionDefs: missionDefs, xpAt: xpAt
  };
})(typeof window !== 'undefined' ? window : globalThis);
