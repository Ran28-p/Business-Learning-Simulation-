/* Kuis Langsung (Game Hub) — lapisan RUANG: transport data (memori / localStorage / Firebase RTDB) + pengontrol Host (guru) & Player (siswa).
   Tanpa DOM → Host/Player diuji penuh di tests/test-livequiz.mjs lewat LiveDb.memory (beberapa "perangkat" berbagi satu inti data).
   Model data (Firebase: liveRooms/<KODE>/…), aturan keamanan: database.rules.json:
     meta{host,status,qIndex,qCount,timer,theme,title,createdAt} · questions/<i>{q,o[]} (TANPA kunci) · key/<i> (hanya guru) ·
     starts/<i> (waktu server mulai soal) · answers/<i>/<uid>{c,t} (tulis-sekali, t = waktu server) · reveal/<i>{a,e} ·
     players/<uid>{name,joinedAt} · scores/<uid>{total,correct,ms} (hanya guru yang menulis; skor dihitung di sisi guru). */
(function (root) {
  'use strict';
  var LQ = root.LiveQuiz;
  var base = function (code) { return 'liveRooms/' + code; };

  /* ---------- helper path pada objek bersarang ---------- */
  function parts(p) { return String(p).split('/').filter(Boolean); }
  function getPath(obj, p) { var cur = obj, ks = parts(p); for (var i = 0; i < ks.length; i++) { if (cur == null || typeof cur !== 'object') return null; cur = cur[ks[i]]; } return cur === undefined ? null : cur; }
  function clone(v) { return v == null ? null : JSON.parse(JSON.stringify(v)); }
  function prune(o) { if (o && typeof o === 'object') { Object.keys(o).forEach(function (k) { var v = prune(o[k]); if (v === null || v === undefined || (typeof v === 'object' && !Object.keys(v).length)) delete o[k]; }); } return o; }
  function setPath(obj, p, val) {
    var ks = parts(p), cur = obj;
    for (var i = 0; i < ks.length - 1; i++) { if (cur[ks[i]] == null || typeof cur[ks[i]] !== 'object') cur[ks[i]] = {}; cur = cur[ks[i]]; }
    if (val === null || val === undefined) delete cur[ks[ks.length - 1]]; else cur[ks[ks.length - 1]] = clone(val);
    prune(obj);
  }

  /* ---------- transport: inti memori (+ penyimpanan opsional) ---------- */
  function makeCore(opts) { return { data: {}, subs: [], clock: (opts && opts.clock) || Date.now, persist: opts && opts.persist, load: opts && opts.load }; }
  function memoryDb(core, uid) {
    function notify() {
      core.subs.slice().forEach(function (s) {
        var v = getPath(core.data, s.path), j = JSON.stringify(v);
        if (j !== s.last) { s.last = j; s.cb(clone(v)); }
      });
    }
    function commit() { if (core.persist) core.persist(core.data); notify(); }
    function refresh() { if (core.load) { core.data = core.load() || {}; notify(); } }
    return {
      kind: 'local', uid: uid,
      ready: function () { return Promise.resolve(uid); },
      now: function () { return core.clock(); },
      ts: function () { return core.clock(); },
      get: function (p) { refresh(); return Promise.resolve(clone(getPath(core.data, p))); },
      set: function (p, v) { refresh(); setPath(core.data, p, v); commit(); return Promise.resolve(); },
      update: function (p, obj) { refresh(); Object.keys(obj).forEach(function (k) { setPath(core.data, p + '/' + k, obj[k]); }); commit(); return Promise.resolve(); },
      remove: function (p) { refresh(); setPath(core.data, p, null); commit(); return Promise.resolve(); },
      on: function (p, cb) { var s = { path: p, cb: cb, last: undefined }; core.subs.push(s); var v = getPath(core.data, p); s.last = JSON.stringify(v); cb(clone(v)); return function () { var i = core.subs.indexOf(s); if (i >= 0) core.subs.splice(i, 1); }; },
      _refresh: refresh
    };
  }
  // Mode lokal di browser: satu perangkat, beberapa tab (data di localStorage, sinkron lewat event 'storage'). Tidak aman/tidak lintas perangkat.
  function browserLocal() {
    var KEY = 'livequiz_local_db_v1', uid;
    try { uid = sessionStorage.getItem('livequiz_local_uid'); if (!uid) { uid = 'L' + Math.random().toString(36).slice(2, 12); sessionStorage.setItem('livequiz_local_uid', uid); } } catch (e) { uid = 'L' + Math.random().toString(36).slice(2, 12); }
    var core = makeCore({
      load: function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } },
      persist: function (d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* penuh */ } }
    });
    var db = memoryDb(core, uid);
    root.addEventListener('storage', function (e) { if (e.key === KEY) db._refresh(); });
    core.data = core.load();
    return db;
  }

  /* ---------- transport: Firebase Realtime Database (paket compat, Spark gratis) ---------- */
  var SDK = 'https://www.gstatic.com/firebasejs/9.6.1/';
  function loadScript(url) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = function () { rej(new Error('Gagal memuat ' + url)); }; document.head.appendChild(s); }); }
  function firebaseDb() {
    var cfg = root.PORTAL_FIREBASE_CONFIG;
    if (!cfg || !cfg.databaseURL) return Promise.reject(new Error('Konfigurasi Firebase tidak ditemukan.'));
    var chain = Promise.resolve();
    [['firebase', 'firebase-app-compat.js'], ['auth', 'firebase-auth-compat.js'], ['database', 'firebase-database-compat.js']].forEach(function (p) {
      chain = chain.then(function () { return (root.firebase && root.firebase[p[0]]) ? null : loadScript(SDK + p[1]); });
    });
    return chain.then(function () {
      var fb = root.firebase, app = fb.apps && fb.apps.length ? fb.app() : fb.initializeApp(cfg), auth = fb.auth(), dbase = fb.database(), offset = 0;
      dbase.ref('.info/serverTimeOffset').on('value', function (s) { offset = Number(s.val()) || 0; });
      return new Promise(function (res, rej) {
        var done = false, off = auth.onAuthStateChanged(function (u) {
          if (done) return;
          if (u) { done = true; off(); res(u); }
          else auth.signInAnonymously().catch(function (e) { done = true; rej(new Error(e && e.code === 'auth/operation-not-allowed' || e && e.code === 'auth/admin-restricted-operation' ? 'Login Anonim belum diaktifkan di Firebase Console (Authentication → Sign-in method → Anonymous).' : ((e && e.message) || 'Gagal masuk ke Firebase.'))); });
        });
      }).then(function (user) {
        var ref = function (p) { return dbase.ref(p); };
        return {
          kind: 'firebase', uid: user.uid,
          ready: function () { return Promise.resolve(user.uid); },
          now: function () { return Date.now() + offset; },
          ts: function () { return fb.database.ServerValue.TIMESTAMP; },
          get: function (p) { return ref(p).once('value').then(function (s) { return s.val(); }); },
          set: function (p, v) { return ref(p).set(v); },
          update: function (p, o) { return ref(p).update(o); },
          remove: function (p) { return ref(p).remove(); },
          on: function (p, cb) { var r = ref(p), h = function (s) { cb(s.val()); }; r.on('value', h, function () { /* izin ditolak → abaikan */ }); return function () { r.off('value', h); }; }
        };
      });
    });
  }

  /* ---------- Host (guru) ---------- */
  function Host(db, opts) {
    this.db = db; this.theme = opts.theme; this.title = String(opts.title || '').slice(0, 100); this.timer = LQ.clampTimer(opts.timer);
    this.code = null; this.meta = null; this.quiz = []; this.players = {}; this.answers = {}; this.starts = {}; this.keyMap = {}; this.scores = {};
    this._offs = []; this._cbs = []; this._written = {}; this._busy = false;
  }
  Host.prototype.onChange = function (fn) { this._cbs.push(fn); };
  Host.prototype._emit = function () { var v = this.view(); this._cbs.forEach(function (f) { try { f(v); } catch (e) { /* UI */ } }); };
  Host.prototype.create = function () {
    var self = this, db = this.db;
    return db.ready().then(function () {
      var tries = 0;
      function attempt() {
        if (tries++ > 10) throw new Error('Gagal membuat kode ruang unik.');
        var code = LQ.makeCode();
        return db.get(base(code) + '/meta').then(function (m) {
          if (m) return attempt();
          var meta = { host: db.uid, status: 'lobby', qIndex: -1, qCount: 0, timer: self.timer, theme: self.theme, title: self.title, createdAt: db.ts() };
          return db.set(base(code) + '/meta', meta).then(function () { self.code = code; return code; });
        });
      }
      return attempt();
    }).then(function (code) { self._listen(); return code; });
  };
  Host.prototype.resume = function (code, quiz) {
    var self = this, db = this.db;
    return db.ready().then(function () { return db.get(base(code) + '/meta'); }).then(function (m) {
      if (!m || m.host !== db.uid) throw new Error('Ruang tidak ditemukan atau bukan milik Anda.');
      self.code = code; self.meta = m; self.quiz = quiz || []; self.timer = m.timer; self.theme = m.theme; self.title = m.title || '';
      self.quiz.forEach(function (q, i) { self.keyMap[i] = q.a; });
      self._listen(); return code;
    });
  };
  Host.prototype._listen = function () {
    var self = this, P = base(this.code);
    this._offs.push(this.db.on(P + '/meta', function (v) { self.meta = v; self._emit(); }));
    this._offs.push(this.db.on(P + '/players', function (v) { self.players = v || {}; self._emit(); }));
    this._offs.push(this.db.on(P + '/starts', function (v) { self.starts = v || {}; self._rescore(); }));
    this._offs.push(this.db.on(P + '/answers', function (v) { self.answers = v || {}; self._rescore(); }));
  };
  Host.prototype._rescore = function () {
    var self = this, sc = LQ.scoreAll(this.keyMap, this.answers, this.starts, this.timer);
    this.scores = sc;
    Object.keys(sc).forEach(function (uid) {
      var s = sc[uid], j = JSON.stringify([s.total, s.correct, s.ms]);
      if (self._written[uid] !== j) { self._written[uid] = j; self.db.set(base(self.code) + '/scores/' + uid, { total: s.total, correct: s.correct, ms: Math.round(s.ms) }); }
    });
    this._emit();
  };
  Host.prototype.setConfig = function (cfg) { // di lobi: ubah timer/judul/tema sebelum mulai
    if (cfg.timer != null) this.timer = LQ.clampTimer(cfg.timer);
    if (cfg.title != null) this.title = String(cfg.title).slice(0, 100);
    if (cfg.theme != null) this.theme = cfg.theme;
    return this.db.update(base(this.code) + '/meta', { timer: this.timer, title: this.title, theme: this.theme });
  };
  Host.prototype.start = function (quiz) {
    var self = this, P = base(this.code), errs = LQ.validateQuiz(quiz);
    if (errs.length) return Promise.reject(new Error(errs[0]));
    if (this.meta && this.meta.status !== 'lobby') return Promise.reject(new Error('Kuis sudah dimulai.'));
    this.quiz = quiz.map(function (q) { return { q: q.q, o: q.o.slice(), a: q.a, e: q.e || '', t: q.t || '' }; });
    var pub = {}, key = {}; this.quiz.forEach(function (q, i) { pub[i] = { q: q.q, o: q.o }; key[i] = q.a; self.keyMap[i] = q.a; });
    var db = this.db;
    return db.set(P + '/questions', pub).then(function () { return db.set(P + '/key', key); })
      .then(function () { return db.set(P + '/starts/0', db.ts()); })
      .then(function () { return db.update(P + '/meta', { status: 'question', qIndex: 0, qCount: self.quiz.length, timer: self.timer }); });
  };
  Host.prototype.reveal = function () {
    var m = this.meta; if (!m || m.status !== 'question' || this._busy) return Promise.resolve(false);
    var self = this, i = m.qIndex, q = this.quiz[i], P = base(this.code), db = this.db; this._busy = true;
    return db.set(P + '/reveal/' + i, { a: q.a, e: q.e || '' }).then(function () { return db.update(P + '/meta', { status: 'reveal' }); })
      .then(function () { self._busy = false; return true; }, function (e) { self._busy = false; throw e; });
  };
  Host.prototype.next = function () {
    var m = this.meta; if (!m || m.status !== 'reveal' || this._busy) return Promise.resolve(false);
    var P = base(this.code), db = this.db, n = m.qIndex + 1;
    if (n >= m.qCount) return db.update(P + '/meta', { status: 'finished' }).then(function () { return true; });
    return db.set(P + '/starts/' + n, db.ts()).then(function () { return db.update(P + '/meta', { status: 'question', qIndex: n }); }).then(function () { return true; });
  };
  Host.prototype.finish = function () { return this.db.update(base(this.code) + '/meta', { status: 'finished' }); };
  Host.prototype.tick = function () { // dipanggil UI tiap ~250 ms: reveal otomatis saat waktu habis / semua sudah menjawab
    var m = this.meta; if (!m || m.status !== 'question') return Promise.resolve(false);
    var st = Number(this.starts[m.qIndex]); if (!isFinite(st)) return Promise.resolve(false);
    var answered = Object.keys((this.answers && this.answers[m.qIndex]) || {}).length, total = Object.keys(this.players).length;
    if (this.db.now() >= st + this.timer * 1000 || (total > 0 && answered >= total)) return this.reveal();
    return Promise.resolve(false);
  };
  Host.prototype.remainingMs = function () { var m = this.meta; if (!m || m.status !== 'question') return 0; var st = Number(this.starts[m.qIndex]); return isFinite(st) ? Math.max(0, st + this.timer * 1000 - this.db.now()) : this.timer * 1000; };
  Host.prototype.close = function () { var db = this.db, P = base(this.code); this._offs.forEach(function (f) { f(); }); this._offs = []; return Promise.all(['meta', 'questions', 'key', 'starts', 'reveal', 'scores', 'players', 'answers'].map(function (k) { return db.remove(P + '/' + k); })); };
  Host.prototype.detach = function () { this._offs.forEach(function (f) { f(); }); this._offs = []; };
  Host.prototype.view = function () {
    var m = this.meta || {}, qi = m.qIndex, ans = (this.answers && this.answers[qi]) || {};
    return { code: this.code, meta: m, status: m.status || 'lobby', qIndex: qi, qCount: m.qCount || 0, timer: this.timer, players: Object.keys(this.players).map(function (u) { return { uid: u, name: this.players[u].name }; }, this),
      answered: Object.keys(ans).length, board: LQ.leaderboard(this.scores, this.players), question: this.quiz[qi] || null, remainingMs: this.remainingMs() };
  };

  /* ---------- Player (siswa) ---------- */
  function Player(db) { this.db = db; this.code = null; this.meta = null; this.questions = null; this.reveal = {}; this.scores = {}; this.players = {}; this.starts = {}; this.mine = {}; this._offs = []; this._cbs = []; this._qOff = null; this._qIdx = null; }
  Player.prototype.onChange = function (fn) { this._cbs.push(fn); };
  Player.prototype._emit = function () { var v = this.view(); this._cbs.forEach(function (f) { try { f(v); } catch (e) { /* UI */ } }); };
  Player.prototype.join = function (code, name) {
    var self = this, db = this.db; code = LQ.normCode(code); name = LQ.cleanName(name);
    if (!LQ.validCode(code)) return Promise.reject(new Error('Kode ruang harus 6 karakter.'));
    if (!name) return Promise.reject(new Error('Isi nama panggilan.'));
    return db.ready().then(function () { return db.get(base(code) + '/meta'); }).then(function (m) {
      if (!m) throw new Error('Ruang tidak ditemukan. Periksa kode dari guru.');
      if (m.status === 'finished') throw new Error('Kuis di ruang ini sudah selesai.');
      return db.set(base(code) + '/players/' + db.uid, { name: name, joinedAt: db.ts() }).then(function () { self.code = code; self.name = name; self._listen(); return code; });
    });
  };
  Player.prototype._listen = function () {
    var self = this, P = base(this.code), db = this.db;
    this._offs.push(db.on(P + '/meta', function (v) { self.meta = v; self._watchMine(); self._emit(); }));
    this._offs.push(db.on(P + '/questions', function (v) { self.questions = v; self._emit(); }));
    this._offs.push(db.on(P + '/reveal', function (v) { self.reveal = v || {}; self._emit(); }));
    this._offs.push(db.on(P + '/scores', function (v) { self.scores = v || {}; self._emit(); }));
    this._offs.push(db.on(P + '/players', function (v) { self.players = v || {}; self._emit(); }));
    this._offs.push(db.on(P + '/starts', function (v) { self.starts = v || {}; self._emit(); }));
  };
  Player.prototype._watchMine = function () { // jawaban saya pada soal aktif (juga memulihkan saat reload)
    var i = this.meta && this.meta.qIndex, self = this;
    if (i === this._qIdx || i == null || i < 0) return;
    if (this._qOff) this._qOff(); this._qIdx = i;
    this._qOff = this.db.on(base(this.code) + '/answers/' + i + '/' + this.db.uid, function (v) { if (v) self.mine[i] = v; self._emit(); });
  };
  Player.prototype.remainingMs = function () { var m = this.meta; if (!m || m.status !== 'question') return 0; var st = Number(this.starts[m.qIndex]); return isFinite(st) ? Math.max(0, st + m.timer * 1000 - this.db.now()) : m.timer * 1000; };
  Player.prototype.submit = function (choice) {
    var m = this.meta, i = m && m.qIndex;
    if (!m || m.status !== 'question') return Promise.resolve({ ok: false, why: 'bukan waktu menjawab' });
    if (this.mine[i]) return Promise.resolve({ ok: false, why: 'sudah menjawab' });
    var q = this.questions && this.questions[i];
    if (!q || !Number.isInteger(choice) || choice < 0 || choice >= q.o.length) return Promise.resolve({ ok: false, why: 'pilihan tidak valid' });
    if (this.remainingMs() <= -LQ.GRACE_MS) return Promise.resolve({ ok: false, why: 'waktu habis' });
    this.mine[i] = { c: choice, t: this.db.now() }; this._emit();
    return this.db.set(base(this.code) + '/answers/' + i + '/' + this.db.uid, { c: choice, t: this.db.ts() }).then(function () { return { ok: true }; }, function (e) { delete this.mine[i]; throw e; }.bind(this));
  };
  Player.prototype.leave = function () { this._offs.forEach(function (f) { f(); }); this._offs = []; if (this._qOff) this._qOff(); this._qOff = null; };
  Player.prototype.view = function () {
    var m = this.meta || {}, i = m.qIndex, q = this.questions && this.questions[i] || null, my = this.mine[i] || null, rv = this.reveal[i] || null, uid = this.db.uid;
    var board = LQ.leaderboard(this.scores, this.players), me = board.filter(function (x) { return x.uid === uid; })[0] || null;
    var gained = null, st = Number(this.starts[i]);
    if (rv && my && isFinite(st)) gained = LQ.points(my.c === rv.a, Number(my.t) - st, (m.timer || 20) * 1000);
    return { code: this.code, status: m.status || 'lobby', title: m.title || '', qIndex: i, qCount: m.qCount || 0, timer: m.timer || 0, question: q, myChoice: my ? my.c : null, reveal: rv,
      correct: rv && my ? my.c === rv.a : null, gained: gained, me: me, board: board, playerCount: Object.keys(this.players).length, remainingMs: this.remainingMs() };
  };

  root.LiveDb = { makeCore: makeCore, memory: memoryDb, browserLocal: browserLocal, firebase: firebaseDb };
  root.LiveRoom = { Host: Host, Player: Player, base: base };
})(typeof window !== 'undefined' ? window : globalThis);
