/* Kuis Langsung — tampilan & orkestrasi. Logika: js/shared/livequiz-engine.js (soal/skor) + livequiz-room.js (Host/Player/transport). */
(function () {
  'use strict';
  var LQ = window.LiveQuiz, LR = window.LiveRoom, LDB = window.LiveDb;
  var CAT_VIDEO_URL = new URL('../assets/clapping-cat.mp4', document.currentScript.src).href;
  var Celebration = window.GameHubCelebration;
  var GameAudio = window.GameHubAudio;
  var HOST_KEY = 'livequiz_host_v1', NAME_KEY = 'livequiz_name_v1', LETTERS = ['A', 'B', 'C', 'D'];
  var $ = function (id) { return document.getElementById(id); };
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var fmt = function (n) { return Number(n).toLocaleString('id-ID'); };
  function tableNode(name, columns, rows) {
    var table = h('table', 'lq-table'), wrap = h('div', 'lq-table-wrap'), thead = h('thead'), header = h('tr'), tbody = h('tbody');
    table.setAttribute('aria-label', 'Tabel ' + name);
    table.appendChild(h('caption', '', 'Tabel ' + name));
    columns.forEach(function (column) { header.appendChild(h('th', '', column)); });
    thead.appendChild(header); table.appendChild(thead);
    rows.forEach(function (row) {
      var tr = h('tr');
      row.forEach(function (cell) { tr.appendChild(h('td', '', cell)); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); wrap.appendChild(table);
    return wrap;
  }
  function questionNode(text) {
    var value = String(text == null ? '' : text);
    var join = /^Tabel p\(id_pelanggan,\s*nama\):\s*((?:\([^()]*\)\s*)+)\.\s*Tabel o\(id_pelanggan,\s*nomor_pesanan\):\s*((?:\([^()]*\)\s*)+)\.\s*Catatan:\s*(.*?)\.\s*Hasil:\s*(.+?)\s*\?$/i.exec(value);
    if (join) {
      function readRows(text, columnCount) {
        var out = [], pattern = /\(([^()]*)\)/g, row;
        while ((row = pattern.exec(text))) out.push(row[1].split(',').map(function (cell) { return cell.trim(); }));
        return out.length && out.every(function (cells) { return cells.length === columnCount && cells.every(Boolean); }) ? out : null;
      }
      var pRows = readRows(join[1], 2), oRows = readRows(join[2], 2);
      if (pRows && oRows) {
        var joinCard = h('div', 'lq-question');
        joinCard.appendChild(tableNode('p', ['id_pelanggan', 'nama'], pRows));
        joinCard.appendChild(tableNode('o', ['id_pelanggan', 'nomor_pesanan'], oRows));
        joinCard.appendChild(h('p', 'lq-question__followup', 'Catatan: ' + join[3] + '. Hasil: ' + join[4] + ' ?'));
        return joinCard;
      }
    }
    var match = /Tabel\s+([A-Za-z_]\w*)\(([^)]+)\):\s*((?:\([^()]*\)\s*)+)/.exec(value);
    if (!match) {
      var list = /^Tabel\s+([A-Za-z_]\w*)\(([^)]+)\)\s+berisi:\s*((?:NULL|-?\d+)(?:\s*,\s*(?:NULL|-?\d+))*)\.\s*Hasil query:/i.exec(value);
      if (!list) return h('p', 'lq-question', value);
      var listCard = h('div', 'lq-question'), listValues = list[3].split(',').map(function (cell) { return [cell.trim()]; });
      listCard.appendChild(tableNode(list[1], list[2].split(',').map(function (column) { return column.trim(); }), listValues));
      listCard.appendChild(h('p', 'lq-question__followup', 'Hasil query: ' + value.slice(list.index + list[0].length).trim()));
      return listCard;
    }
    var columns = match[2].split(',').map(function (column) { return column.trim(); });
    var rows = [], tuplePattern = /\(([^()]*)\)/g, tuple;
    while ((tuple = tuplePattern.exec(match[3]))) rows.push(tuple[1].split(',').map(function (cell) { return cell.trim(); }));
    if (!columns.length || !rows.length || rows.some(function (row) { return row.length !== columns.length || row.some(function (cell) { return !cell; }); })) return h('p', 'lq-question', value);

    var card = h('div', 'lq-question');
    var before = value.slice(0, match.index).trim(), after = value.slice(match.index + match[0].length).trim().replace(/^\.\s*/, '');
    if (before) card.appendChild(h('p', 'lq-question__text', before));
    card.appendChild(tableNode(match[1], columns, rows));
    if (after) card.appendChild(h('p', 'lq-question__followup', after));
    return card;
  }

  var VIEWS = ['v-start', 'v-join', 'v-play', 'v-setup', 'v-host'];
  function show(id) { VIEWS.forEach(function (v) { $(v).hidden = v !== id; }); $('lq-main').focus({ preventScroll: true }); window.scrollTo(0, 0); }
  function banner(msg, info) { var b = $('lq-banner'); b.textContent = msg || ''; b.hidden = !msg; b.className = 'lq-banner' + (info ? ' is-info' : ''); }

  var sources = { pajak: [] };
  function loadSources() {
    try { sources.pajak = sources.pajak.concat(LQ.fromTaxCareer(window.TAX_CAREER_QUESTIONS)); } catch (e) { /* opsional */ }
    return fetch('../spt/modul_pajak/questions.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) sources.pajak = sources.pajak.concat(LQ.fromModulPajak(j)); }).catch(function () { /* offline: generator tetap jalan */ });
  }
  var sourcesReady = loadSources(), generationRevision = 0;

  function connect() {
    if ($('chk-local').checked) return Promise.resolve(LDB.browserLocal());
    banner('Menghubungkan ke Firebase…', true);
    return LDB.firebase().then(function (db) { banner(''); return db; }, function (e) { banner((e && e.message || 'Gagal terhubung.') + ' Coba lagi, atau centang "Mode lokal" untuk uji coba di satu perangkat.'); throw e; });
  }

  var db = null, host = null, player = null, quiz = [], cfg = { theme: null, mode: 'choice', count: 20, timer: 20, title: '' }, timerId = null, saveT = null;
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }
  function mmss(ms) { var s = Math.ceil(ms / 1000); return s >= 60 ? Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) : String(s); }

  /* ================= SISWA ================= */
  $('btn-role-student').addEventListener('click', function () { banner(''); show('v-join'); $('in-name').value = localStorage.getItem(NAME_KEY) || ''; $('in-code').focus(); });
  $('btn-join-back').addEventListener('click', function () { show('v-start'); });
  $('in-code').addEventListener('input', function (e) { e.target.value = LQ.normCode(e.target.value); });
  $('btn-join').addEventListener('click', function () {
    var code = $('in-code').value, name = $('in-name').value, btn = $('btn-join');
    GameAudio.unlock();
    btn.disabled = true; banner('');
    connect().then(function (d) { db = d; player = new LR.Player(db); return player.join(code, name); }).then(function () {
      try { localStorage.setItem(NAME_KEY, LQ.cleanName(name)); } catch (e) { /* abaikan */ }
      show('v-play'); player.onChange(renderPlayer); renderPlayer(player.view()); stopTimer(); timerId = setInterval(function () { if (player) renderPlayerTimer(); }, 250);
    }).catch(function (e) { banner(e.message || 'Gagal masuk.'); }).then(function () { btn.disabled = false; });
  });
  var qs = new URLSearchParams(location.search);
  if (qs.get('kode')) { $('in-code').value = LQ.normCode(qs.get('kode')); setTimeout(function () { $('btn-role-student').click(); $('in-code').value = LQ.normCode(qs.get('kode')); }, 0); }

  var lastPKey = '';
  function boardList(rows, meUid, limit) {
    var ol = h('ol', 'lq-board');
    rows.slice(0, limit || rows.length).forEach(function (r) {
      var li = h('li', r.uid === meUid ? 'is-me' : ''); li.appendChild(h('span', 'lq-rank', '#' + r.rank)); li.appendChild(h('span', '', r.name + (r.uid === meUid ? ' (Anda)' : ''))); li.appendChild(h('span', 'lq-pts', fmt(r.total))); ol.appendChild(li);
    });
    return ol;
  }
  function renderPlayer(v) {
    if (v.status === 'reveal') {
      var answered = v.mode === 'essay' ? v.myAnswer != null : v.myChoice != null;
      GameAudio.answerResult((player.code || '') + ':' + v.qIndex, v.correct === true, answered);
    }
    var root = $('v-play'), uid = db.uid;
    var key = LR.Player.viewKey(v);
    if (key === lastPKey) return; lastPKey = key; root.textContent = '';
    var stage = h('div', 'lq-stage'); root.appendChild(stage);
    if (v.status === 'lobby') {
      var w = h('div', 'lq-card lq-wait'); w.appendChild(h('h2', '', 'Anda sudah di dalam! 🎉')); w.appendChild(h('p', '', (v.title ? v.title + ' · ' : '') + 'Menunggu guru memulai kuis…')); w.appendChild(h('p', 'gh-hint', fmt(v.playerCount) + ' peserta di ruang ' + v.code)); stage.appendChild(w); return;
    }
    if (v.status === 'finished') {
      stage.appendChild(h('h2', 'lq-title', 'Kuis selesai!'));
      stage.appendChild(Celebration.create(CAT_VIDEO_URL));
      if (v.me) { var res = h('div', 'lq-result is-ok'); res.appendChild(h('strong', '', 'Peringkat #' + v.me.rank + ' dari ' + v.board.length)); res.appendChild(h('span', '', fmt(v.me.total) + ' poin · ' + (v.mode === 'essay' ? v.me.correct + ' jawaban memenuhi semua kriteria' : v.me.correct + ' benar') + ' dari ' + v.qCount + ' soal')); stage.appendChild(res); }
      stage.appendChild(boardList(v.board, uid, 10)); return;
    }
    var q = v.question; if (!q) { stage.appendChild(h('p', 'lq-wait', 'Memuat soal…')); return; }
    var top = h('div', 'lq-top'); top.appendChild(h('span', 'lq-badge', 'Soal ' + (v.qIndex + 1) + ' / ' + v.qCount)); var tm = h('span', 'lq-timer'); tm.id = 'lq-ptimer'; top.appendChild(tm); stage.appendChild(top);
    var bar = h('div', 'lq-bar'); bar.setAttribute('aria-hidden', 'true'); var fill = h('span'); fill.id = 'lq-pbar'; bar.appendChild(fill); stage.appendChild(bar);
    stage.appendChild(questionNode(q.q));
    var revealed = v.status === 'reveal' && v.reveal;
    if (q.type === 'essay') {
      var answerBox = h('div', 'lq-essay-answer');
      var text = h('textarea', 'lq-essay-text'); text.maxLength = LQ.LIM.essay; text.rows = 5; text.placeholder = 'Tulis jawaban Anda dengan jelas…'; text.value = v.myAnswer || '';
      text.setAttribute('aria-label', 'Jawaban esai'); text.disabled = v.myAnswer != null || v.status !== 'question' || v.remainingMs <= 0;
      var send = h('button', 'lq-btn lq-btn--primary', 'Kirim jawaban'); send.type = 'button'; send.disabled = text.disabled;
      send.addEventListener('click', function () { player.submitEssay(text.value).then(function (r) { if (!r.ok) banner('Jawaban tidak terkirim: ' + r.why, true); }, function (e) { banner('Gagal mengirim jawaban: ' + (e.message || e)); }); });
      answerBox.appendChild(text); answerBox.appendChild(send); stage.appendChild(answerBox);
      if (v.status === 'question') stage.appendChild(h('p', 'lq-result is-wait', v.myAnswer != null ? 'Jawaban terkirim ✓ — menunggu soal selesai…' : 'Tulis jawaban sebelum waktu habis. Jawaban hanya dapat dikirim satu kali.'));
      if (revealed) {
        var essayRes = h('div', 'lq-result ' + (v.correct ? 'is-ok' : 'is-no'));
        essayRes.appendChild(h('strong', '', v.myAnswer == null ? 'Tidak ada jawaban · 0 poin' : fmt(v.gained || 0) + ' / 1000 poin'));
        if (v.me) essayRes.appendChild(h('span', '', 'Total ' + fmt(v.me.total) + ' poin · peringkat #' + v.me.rank));
        stage.appendChild(essayRes);
        if (v.myAnswer != null) stage.appendChild(h('p', 'lq-essay-review', 'Jawaban Anda: ' + v.myAnswer));
        stage.appendChild(h('h3', '', 'Contoh jawaban')); stage.appendChild(h('p', 'lq-essay-key', revealed.answer));
        (revealed.rubric || []).forEach(function (criterion) {
          var checked = LQ.scoreEssay({ rubric: [criterion] }, v.myAnswer || '').complete;
          stage.appendChild(h('p', 'lq-essay-criterion', (checked ? '✓ ' : '• ') + criterion.label));
        });
        if (revealed.e) stage.appendChild(h('p', 'lq-explain', 'Catatan: ' + revealed.e));
        stage.appendChild(h('h3', '', 'Papan peringkat')); stage.appendChild(boardList(v.board, uid, 5));
      }
    } else {
      var grid = h('div', 'lq-answers');
      q.o.forEach(function (txt, i) {
        var b = h('button', 'lq-ans'); b.type = 'button'; b.setAttribute('data-i', i); b.appendChild(h('b', '', LETTERS[i])); b.appendChild(h('span', '', txt));
        b.disabled = v.myChoice != null || v.status !== 'question' || v.remainingMs <= 0;
        if (v.myChoice === i) b.classList.add('is-picked');
        if (revealed) { if (revealed.a === i) b.classList.add('is-right'); else b.classList.add('is-dim'); }
        b.addEventListener('click', function () { player.submit(i).then(function (r) { if (r && !r.ok && r.why) banner('Jawaban tidak terkirim: ' + r.why, true); }, function (e) { banner('Gagal mengirim jawaban: ' + (e.message || e)); }); });
        grid.appendChild(b);
      });
      stage.appendChild(grid);
      if (v.status === 'question') stage.appendChild(h('p', 'lq-result is-wait', v.myChoice != null ? 'Jawaban terkirim ✓ — menunggu yang lain…' : 'Pilih jawaban secepat dan setepat mungkin!'));
      else if (revealed) {
        var ok = v.correct === true, res2 = h('div', 'lq-result ' + (ok ? 'is-ok' : 'is-no'));
        res2.appendChild(h('strong', '', v.myChoice == null ? 'Waktu habis' : ok ? 'Benar! +' + fmt(v.gained || 0) : 'Kurang tepat'));
        if (v.me) res2.appendChild(h('span', '', 'Total ' + fmt(v.me.total) + ' poin · peringkat #' + v.me.rank)); stage.appendChild(res2);
        if (v.reveal.e) stage.appendChild(h('p', 'lq-explain', 'Pembahasan: ' + v.reveal.e));
        stage.appendChild(h('h3', '', 'Papan peringkat')); stage.appendChild(boardList(v.board, uid, 5));
      }
    }
  }
  function renderPlayerTimer() {
    var v = player.view(), t = $('lq-ptimer'), f = $('lq-pbar'); if (!t || v.status !== 'question') { GameAudio.resetCountdown(); if (t) t.textContent = ''; if (f) f.style.width = '0%'; return; }
    t.textContent = mmss(v.remainingMs); t.classList.toggle('is-low', v.remainingMs <= 5000); f.style.width = Math.max(0, Math.min(100, v.remainingMs / (v.timer * 1000) * 100)) + '%';
    GameAudio.countdown((player.code || '') + ':' + v.qIndex, v.remainingMs, v.myChoice != null || v.myAnswer != null);
    if (v.myChoice == null && v.myAnswer == null && v.remainingMs <= 0) { lastPKey = ''; renderPlayer(v); }
  }

  /* ================= GURU ================= */
  function saved() { try { return JSON.parse(localStorage.getItem(HOST_KEY) || 'null'); } catch (e) { return null; } }
  function persist() { clearTimeout(saveT); saveT = setTimeout(function () { if (host && host.code) try { localStorage.setItem(HOST_KEY, JSON.stringify({ code: host.code, local: db.kind === 'local', cfg: cfg, quiz: quiz })); } catch (e) { /* abaikan */ } }, 300); }
  function dropSaved() { try { localStorage.removeItem(HOST_KEY); } catch (e) { /* abaikan */ } }
  (function initResume() { var s = saved(); if (s && s.code) { $('lq-resume').hidden = false; $('lq-resume-code').textContent = s.code; if (s.local) $('chk-local').checked = true; } })();
  $('btn-resume-drop').addEventListener('click', function () { dropSaved(); $('lq-resume').hidden = true; });

  function bindHost() { host.onChange(onHost); onHost(host.view()); stopTimer(); timerId = setInterval(function () { host.tick().catch(function () { /* coba lagi */ }); renderHostTimer(); }, 250); }
  $('btn-role-teacher').addEventListener('click', function () {
    banner(''); var b = $('btn-role-teacher'); b.disabled = true;
    connect().then(function (d) { db = d; host = new LR.Host(db, { theme: 'pajak', title: '', timer: 20 }); return host.create(); }).then(function () {
      cfg = { theme: null, mode: 'choice', count: 20, timer: 20, title: '' }; quiz = []; setupUI(); show('v-setup'); persist(); bindHost();
    }).catch(function (e) { banner(e.message || 'Gagal membuat ruang.'); }).then(function () { b.disabled = false; });
  });
  $('btn-resume').addEventListener('click', function () {
    var s = saved(); if (!s) return; banner('');
    connect().then(function (d) { db = d; host = new LR.Host(db, { theme: s.cfg.theme, timer: s.cfg.timer }); return host.resume(s.code, s.quiz); }).then(function () {
      cfg = s.cfg; quiz = s.quiz || []; setupUI(); bindHost(); var st = host.meta.status; show(st === 'lobby' ? 'v-setup' : 'v-host'); if (st === 'lobby') renderEditor(); onHost(host.view());
    }).catch(function (e) { dropSaved(); $('lq-resume').hidden = true; banner((e.message || 'Gagal melanjutkan.') + ' Ruang lama dilepas.'); });
  });

  function seed() { return Math.floor(Math.random() * 4294967295); }
  function essayLimit() { return LQ.buildEssayQuiz({ theme: cfg.theme || 'campuran', count: 100, seed: 1 }).length; }
  function setupUI() {
    $('lq-roomcode').textContent = host.code; $('in-title').value = cfg.title || ''; $('in-count').value = cfg.count;
    document.querySelectorAll('input[name="quiz-mode"]').forEach(function (input) { input.checked = input.value === (cfg.mode || 'choice'); });
    var secs = cfg.timer; if (secs % 60 === 0 && secs >= 60) { $('in-timer').value = secs / 60; $('in-unit').value = 'm'; } else { $('in-timer').value = secs; $('in-unit').value = 's'; }
    var box = $('lq-themes'); box.textContent = '';
    LQ.THEMES.forEach(function (t) {
      var b = h('button', 'lq-theme'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(cfg.theme === t.id)); b.setAttribute('data-theme-id', t.id);
      b.appendChild(h('span', '', t.icon)); b.appendChild(h('strong', '', t.label)); b.appendChild(h('small', '', t.desc));
      b.addEventListener('click', function () { cfg.theme = t.id; host.setConfig({ theme: t.id }); generateAfterSources(); box.querySelectorAll('.lq-theme').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); });
      box.appendChild(b);
    });
    renderEditor();
  }
  function generateAll() {
    generationRevision++;
    if (!cfg.theme) { banner('Pilih tema dulu.', true); return; }
    banner('');
    var max = cfg.mode === 'essay' ? essayLimit() : 50, min = cfg.mode === 'essay' ? 1 : 5;
    var n = Math.max(min, Math.min(max, Math.round(Number($('in-count').value) || Math.min(20, max))));
    cfg.count = n; $('in-count').value = n; $('in-count').min = min; $('in-count').max = max;
    quiz = cfg.mode === 'essay' ? LQ.buildEssayQuiz({ theme: cfg.theme, count: n, seed: seed() }) : LQ.buildQuiz({ theme: cfg.theme, count: n, seed: seed(), sources: sources });
    $('lq-mode-note').hidden = cfg.mode !== 'essay';
    $('lq-timer-note').hidden = cfg.mode === 'essay';
    renderEditor(); persist();
  }
  function generateAfterSources() {
    var revision = ++generationRevision;
    sourcesReady.then(function () { if (revision === generationRevision) generateAll(); });
  }
  document.querySelectorAll('input[name="quiz-mode"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      if (quiz.length && !confirm('Mengganti mode akan mengganti semua soal, termasuk soal yang sudah diedit. Lanjutkan?')) {
        document.querySelectorAll('input[name="quiz-mode"]').forEach(function (radio) { radio.checked = radio.value === cfg.mode; });
        return;
      }
      cfg.mode = input.value; generateAll();
    });
  });
  $('btn-regen-all').addEventListener('click', function () { if (quiz.length && !confirm('Semua soal (termasuk hasil edit Anda) akan diganti dengan soal baru. Lanjutkan?')) return; generateAfterSources(); });
  $('in-count').addEventListener('change', function () { var min = cfg.mode === 'essay' ? 1 : 5, max = cfg.mode === 'essay' ? essayLimit() : 50; cfg.count = Math.max(min, Math.min(max, Math.round(Number($('in-count').value) || min))); $('in-count').value = cfg.count; if (cfg.theme) generateAll(); persist(); });
  $('in-title').addEventListener('input', function () { cfg.title = $('in-title').value; persist(); });
  $('in-title').addEventListener('change', function () { host.setConfig({ title: cfg.title }); });
  function readTimer() { var n = Number($('in-timer').value) || 20; var sec = $('in-unit').value === 'm' ? n * 60 : n; var c = LQ.clampTimer(sec); cfg.timer = c; $('lq-timer-note').textContent = 'Waktu per soal: ' + (c >= 60 && c % 60 === 0 ? c / 60 + ' menit' : c + ' detik') + ' (batas 5 detik – 5 menit). Poin: benar = 500–1000, makin cepat makin tinggi. Salah / lewat waktu = 0.'; return c; }
  ['in-timer', 'in-unit'].forEach(function (id) { $(id).addEventListener('change', function () { readTimer(); host.setConfig({ timer: cfg.timer }); persist(); }); });
  readTimer();
  $('btn-add').addEventListener('click', function () { quiz.push(cfg.mode === 'essay' ? { type: 'essay', q: '', answer: '', rubric: [{ label: '', keywords: [''] }, { label: '', keywords: [''] }], e: '', t: 'Manual' } : { q: '', o: ['', '', '', ''], a: 0, e: '', t: 'Manual' }); renderEditor(); persist(); var ed = $('lq-editor'); if (ed.lastChild) ed.lastChild.querySelector('textarea').focus(); });
  $('btn-copy-link').addEventListener('click', function () {
    var url = location.origin + location.pathname + '?kode=' + host.code; var done = function () { banner('Tautan disalin: ' + url, true); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { banner('Salin manual: ' + url, true); }); else banner('Salin manual: ' + url, true);
  });
  $('btn-cancel-room').addEventListener('click', function () { if (!confirm('Hapus ruang ' + host.code + '? Siswa yang sudah masuk akan terputus.')) return; stopTimer(); host.close().then(function () { dropSaved(); location.href = location.pathname; }, function () { dropSaved(); location.href = location.pathname; }); });

  function validate() { var errs = LQ.validateQuiz(quiz); $('lq-errors').textContent = errs.length ? errs.slice(0, 3).join(' · ') + (errs.length > 3 ? ' · …' : '') : (quiz.length ? 'Semua soal valid ✓' : 'Pilih tema untuk membuat soal otomatis.'); $('lq-qcount').textContent = quiz.length; $('btn-start').disabled = !!errs.length || !cfg.theme && !quiz.length; return errs; }
  function renderEditor() {
    var ol = $('lq-editor'); ol.textContent = '';
    quiz.forEach(function (q, i) {
      var li = h('li', 'lq-q'); var head = h('div', 'lq-q__head'); var left = h('span'); left.appendChild(h('span', 'lq-q__no', 'Soal ' + (i + 1))); if (q.t) left.appendChild(h('span', 'lq-q__topic', ' · ' + q.t)); head.appendChild(left);
      var acts = h('div', 'lq-actions'); var rg = h('button', 'lq-btn', '🎲 Ganti soal'); rg.type = 'button'; rg.title = 'Buat soal pengganti yang berbeda'; var del = h('button', 'lq-btn lq-btn--danger', 'Hapus'); del.type = 'button'; acts.appendChild(rg); acts.appendChild(del); head.appendChild(acts); li.appendChild(head);
      var ta = h('textarea'); ta.value = q.q; ta.setAttribute('aria-label', 'Pertanyaan ' + (i + 1)); ta.maxLength = LQ.LIM.q; ta.addEventListener('input', function () { q.q = ta.value; renderPreview(); touch(); }); li.appendChild(ta);
      var preview = h('div', 'lq-q__preview'); preview.appendChild(h('p', 'lq-q__preview-label', 'Pratinjau soal')); li.appendChild(preview);
      function renderPreview() { preview.replaceChildren(questionNode(q.q)); }
      renderPreview();
      if (q.type === 'essay') {
        var model = h('textarea', 'lq-essay-key'); model.value = q.answer; model.maxLength = LQ.LIM.essayAnswer; model.placeholder = 'Contoh jawaban yang benar'; model.setAttribute('aria-label', 'Contoh jawaban soal ' + (i + 1));
        model.addEventListener('input', function () { q.answer = model.value; touch(); }); li.appendChild(model);
        var rubricBox = h('div', 'lq-essay-rubric');
        q.rubric.forEach(function (criterion, k) {
          var row = h('div', 'lq-essay-rubric__row'), label = h('input'), words = h('input');
          label.value = criterion.label; label.maxLength = 120; label.placeholder = 'Kriteria ' + (k + 1); label.setAttribute('aria-label', 'Kriteria ' + (k + 1) + ' soal ' + (i + 1));
          words.value = criterion.keywords.join('; '); words.placeholder = 'Kata kunci, pisahkan dengan titik koma'; words.setAttribute('aria-label', 'Kata kunci kriteria ' + (k + 1) + ' soal ' + (i + 1));
          label.addEventListener('input', function () { criterion.label = label.value; touch(); });
          words.addEventListener('input', function () { criterion.keywords = words.value.split(';').map(function (word) { return word.trim(); }).filter(Boolean); touch(); });
          row.appendChild(label); row.appendChild(words); rubricBox.appendChild(row);
        });
        li.appendChild(rubricBox);
      } else {
        var opts = h('div', 'lq-q__opts');
        q.o.forEach(function (txt, k) {
          var row = h('label', 'lq-opt'); var rad = h('input'); rad.type = 'radio'; rad.name = 'ans-' + i; rad.checked = q.a === k; rad.setAttribute('aria-label', 'Jawaban benar soal ' + (i + 1) + ' adalah ' + LETTERS[k]); rad.addEventListener('change', function () { q.a = k; touch(); });
          var inp = h('input'); inp.value = txt; inp.maxLength = LQ.LIM.opt; inp.setAttribute('aria-label', 'Pilihan ' + LETTERS[k] + ' soal ' + (i + 1)); inp.addEventListener('input', function () { q.o[k] = inp.value; touch(); });
          row.appendChild(rad); row.appendChild(h('b', '', LETTERS[k])); row.appendChild(inp); opts.appendChild(row);
        });
        li.appendChild(opts);
      }
      var ex = h('textarea'); ex.value = q.e || ''; ex.placeholder = 'Pembahasan (ditampilkan ke siswa setelah soal selesai)'; ex.setAttribute('aria-label', 'Pembahasan soal ' + (i + 1)); ex.maxLength = LQ.LIM.exp; ex.addEventListener('input', function () { q.e = ex.value; touch(); }); li.appendChild(ex);
      var er = h('p', 'lq-q__err'); li.appendChild(er);
      function touch() { var e = LQ.validateQuestion(q); er.textContent = e.join(' · '); li.classList.toggle('is-bad', !!e.length); validate(); persist(); }
      rg.addEventListener('click', function () { var nq = cfg.mode === 'essay' ? LQ.regenerateEssayOne({ theme: cfg.theme || 'campuran', seed: seed(), existing: quiz }) : LQ.regenerateOne({ theme: cfg.theme || 'campuran', seed: seed(), existing: quiz, sources: sources }); if (!nq) { banner('Tidak ada variasi soal lain untuk tema ini.', true); return; } quiz[i] = nq; renderEditor(); persist(); });
      del.addEventListener('click', function () { quiz.splice(i, 1); renderEditor(); persist(); });
      var e0 = LQ.validateQuestion(q); if (e0.length && (q.q || q.type === 'essay' && q.answer || q.o && q.o.some(Boolean))) { er.textContent = e0.join(' · '); li.classList.add('is-bad'); }
      ol.appendChild(li);
    });
    validate();
  }
  $('btn-start').addEventListener('click', function () {
    var errs = validate(); if (errs.length) { banner(errs[0]); return; }
    if (!host.view().players.length && !confirm('Belum ada siswa di lobi. Mulai tetap?')) return;
    var b = $('btn-start'), startQuiz = JSON.parse(JSON.stringify(quiz)); b.disabled = true; banner('');
    host.setConfig({ timer: readTimer(), title: cfg.title }).then(function () { return host.start(startQuiz); }).then(function () { show('v-host'); persist(); }).catch(function (e) { banner(e.message || 'Gagal memulai.'); b.disabled = false; });
  });

  var lastHKey = '';
  function onHost(v) {
    $('lq-count').textContent = v.players.length;
    var lob = $('lq-lobby'); if (!lob.hidden) { lob.textContent = ''; v.players.forEach(function (p) { lob.appendChild(h('li', '', p.name)); }); }
    if (v.status === 'lobby') return;
    if ($('v-host').hidden && $('v-setup').hidden === false) show('v-host');
    var key = [v.status, v.qIndex, v.answered, v.players.length, v.board.map(function (r) { return r.uid + r.total; }).join(',')].join('|'); if (key === lastHKey) return; lastHKey = key;
    renderHost(v);
  }
  function renderHost(v) {
    var root = $('v-host'); root.textContent = ''; var stage = h('div', 'lq-stage'); root.appendChild(stage);
    var q = v.question;
    if (v.status === 'finished') {
      stage.appendChild(h('h2', 'lq-title', 'Hasil akhir' + (v.meta.title ? ' — ' + v.meta.title : '')));
      stage.appendChild(Celebration.create(CAT_VIDEO_URL));
      var top3 = v.board.slice(0, 3); if (top3.length) { var pod = h('div', 'lq-podium'); [1, 0, 2].forEach(function (ix) { var r = top3[ix]; if (!r) return; var d = h('div', 'p' + (ix + 1)); d.appendChild(h('b', '', ['🥇', '🥈', '🥉'][ix])); d.appendChild(h('span', '', r.name)); d.appendChild(h('div', 'lq-pts', fmt(r.total) + ' poin')); pod.appendChild(d); }); stage.appendChild(pod); }
      stage.appendChild(boardList(v.board, null));
      var act = h('div', 'lq-actions'); var csv = h('button', 'lq-btn lq-btn--primary', '⬇ Unduh hasil (CSV)'); csv.type = 'button'; csv.addEventListener('click', function () { downloadCsv(v); }); var cl = h('button', 'lq-btn lq-btn--danger', 'Tutup & hapus ruang'); cl.type = 'button';
      cl.addEventListener('click', function () { if (!confirm('Hapus ruang dan semua datanya dari server? Unduh CSV dulu jika perlu.')) return; stopTimer(); host.close().then(function () { dropSaved(); location.href = location.pathname; }, function () { dropSaved(); location.href = location.pathname; }); });
      act.appendChild(csv); act.appendChild(cl); stage.appendChild(act); return;
    }
    var top = h('div', 'lq-top'); top.appendChild(h('span', 'lq-badge', 'Soal ' + (v.qIndex + 1) + ' / ' + v.qCount)); var tm = h('span', 'lq-timer'); tm.id = 'lq-htimer'; top.appendChild(tm);
    top.appendChild(h('span', 'lq-stat', v.answered + ' / ' + v.players.length + ' sudah menjawab')); stage.appendChild(top);
    var bar = h('div', 'lq-bar'); bar.setAttribute('aria-hidden', 'true'); var fill = h('span'); fill.id = 'lq-hbar'; bar.appendChild(fill); stage.appendChild(bar);
    if (q) {
      stage.appendChild(questionNode(q.q));
      if (q.type === 'essay') {
        if (v.status === 'reveal') {
          stage.appendChild(h('h3', '', 'Contoh jawaban')); stage.appendChild(h('p', 'lq-essay-key', q.answer));
          (q.rubric || []).forEach(function (criterion) { stage.appendChild(h('p', 'lq-essay-criterion', criterion.label + ' — ' + criterion.keywords.join(', '))); });
          if (q.e) stage.appendChild(h('p', 'lq-explain', 'Catatan: ' + q.e));
        }
        var answers = h('section', 'lq-essay-submissions'); answers.appendChild(h('h3', '', v.status === 'reveal' ? 'Jawaban dan penilaian' : 'Jawaban siswa'));
        v.players.forEach(function (student) {
          var submitted = v.answers[student.uid];
          var card = h('article', 'lq-essay-submission'); card.appendChild(h('strong', '', student.name));
          if (!submitted) card.appendChild(h('p', '', 'Belum menjawab.'));
          else {
            card.appendChild(h('p', '', submitted.text));
            if (v.status === 'reveal') {
              var score = LQ.scoreEssay(q, submitted.text); card.appendChild(h('p', 'lq-essay-score', score.matched + ' dari ' + score.total + ' kriteria · ' + score.points + ' poin'));
              score.criteria.forEach(function (criterion) { card.appendChild(h('p', 'lq-essay-criterion', (criterion.matched ? '✓ ' : '• ') + criterion.label)); });
            }
          }
          answers.appendChild(card);
        });
        stage.appendChild(answers);
      } else {
        var grid = h('div', 'lq-answers');
        q.o.forEach(function (txt, i) { var b = h('div', 'lq-ans'); b.setAttribute('data-i', i); b.appendChild(h('b', '', LETTERS[i])); b.appendChild(h('span', '', txt)); if (v.status === 'reveal') b.classList.add(i === q.a ? 'is-right' : 'is-dim'); grid.appendChild(b); });
        stage.appendChild(grid); if (v.status === 'reveal' && q.e) stage.appendChild(h('p', 'lq-explain', 'Pembahasan: ' + q.e));
      }
    }
    var acts = h('div', 'lq-actions');
    if (v.status === 'question') { var rv = h('button', 'lq-btn lq-btn--primary', 'Tampilkan jawaban'); rv.type = 'button'; rv.addEventListener('click', function () { host.reveal(); }); acts.appendChild(rv); }
    else { var nx = h('button', 'lq-btn lq-btn--primary', v.qIndex + 1 >= v.qCount ? 'Lihat hasil akhir' : 'Soal berikutnya →'); nx.type = 'button'; nx.addEventListener('click', function () { host.next(); }); acts.appendChild(nx); }
    var en = h('button', 'lq-btn lq-btn--ghost', 'Akhiri sekarang'); en.type = 'button'; en.addEventListener('click', function () { if (confirm('Akhiri kuis sekarang? Papan peringkat akhir akan ditampilkan.')) host.finish(); }); acts.appendChild(en); stage.appendChild(acts);
    stage.appendChild(h('h3', '', 'Papan peringkat (real-time)')); stage.appendChild(boardList(v.board, null, 10));
  }
  function renderHostTimer() { var t = $('lq-htimer'), f = $('lq-hbar'); if (!t || !host) return; var v = host.view(); if (v.status !== 'question') { t.textContent = ''; f.style.width = '0%'; return; } t.textContent = mmss(v.remainingMs); t.classList.toggle('is-low', v.remainingMs <= 5000); f.style.width = Math.max(0, Math.min(100, v.remainingMs / (v.timer * 1000) * 100)) + '%'; }
  function csvCell(s) { return CsvUtils.csvCell(s); } // js/shared/csv-utils.js
  function downloadCsv(v) {
    var essay = host.quiz[0] && host.quiz[0].type === 'essay';
    var lines = [[ 'Peringkat', 'Nama', 'Skor', essay ? 'Jawaban memenuhi semua kriteria' : 'Jawaban benar', 'Total soal', essay ? 'Waktu tidak dinilai' : 'Waktu jawab benar (detik)' ].map(csvCell).join(',')];
    v.board.forEach(function (r) { lines.push([r.rank, r.name, r.total, r.correct, v.qCount, essay ? '' : Math.round(r.ms / 100) / 10].map(csvCell).join(',')); });
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'hasil-kuis-' + host.code + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
})();
