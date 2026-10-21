/* Game Hub — tampilan. Logika ada di js/shared/gamehub-engine.js (murni, diuji di tests/test-gamehub.mjs).
   File ini hanya: membaca progres nyata (PortalProgress), menyimpan state Game Hub, dan merender. */
(function () {
  'use strict';
  var KEY = 'gamehub_state_v1';
  var GH = window.GameHubEngine, PP = window.PortalProgress;
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return Number(n).toLocaleString('id-ID'); };
  var hrefOf = function (m) { return String(m.href || '').replace('./apps/', '../'); };

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function loadState() {
    try { return GH.sanitizeState(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (_) { return GH.sanitizeState(null); }
  }
  function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* penyimpanan penuh/diblokir */ } }

  var state = loadState();
  var view = null;

  function refresh() {
    var summary;
    try { summary = PP.summarize(localStorage); } catch (_) { summary = { modules: [] }; }
    var r = GH.evaluate(state, summary, new Date());
    state = r.state;
    if (r.changed) saveState(state);
    view = r.view;
    render();
  }

  function toast(msg) {
    var t = $('gh-toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 3500);
  }

  function onClaim(id) {
    // Ambil state terbaru dari penyimpanan: tab Game Hub lain mungkin sudah mengklaim → cegah XP ganda lintas tab.
    state = loadState();
    refresh();
    var before = view.player.level;
    var res = GH.claim(state, view, id, new Date());
    if (!res.gained) { toast('Misi ini belum bisa diklaim.'); refresh(); return; }
    state = res.state; saveState(state);
    refresh();
    toast('+' + res.gained + ' XP diklaim' + (view.player.level > before ? ' · Naik ke Level ' + view.player.level + '!' : ''));
  }

  function missionCard(m) {
    var card = h('article', 'gh-mission ds-mod-' + (m.moduleId || 'gamehub') + (m.done ? ' is-done' : '') + (m.claimed ? ' is-claimed' : ''));
    card.setAttribute('data-mission', m.id);
    var top = h('div', 'gh-mission__top');
    top.appendChild(h('span', 'gh-chip', '+' + m.reward + ' XP'));
    top.appendChild(h('span', 'gh-state', m.claimed ? 'Diklaim' : m.done ? 'Selesai' : m.current + ' / ' + m.target));
    card.appendChild(top);
    card.appendChild(h('h3', '', m.title));
    card.appendChild(h('p', 'gh-mission__desc', m.desc));
    var bar = h('div', 'gh-progress');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Progres misi ' + m.title);
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(m.target)); bar.setAttribute('aria-valuenow', String(m.current));
    var fill = h('span'); fill.style.width = Math.round(m.current / m.target * 100) + '%';
    bar.appendChild(fill); card.appendChild(bar);

    var act;
    if (m.claimed) { act = h('button', 'gh-btn gh-btn--ghost', 'Sudah diklaim ✓'); act.disabled = true; }
    else if (m.done) { act = h('button', 'gh-btn gh-btn--claim gh-claim', 'Klaim +' + m.reward + ' XP'); act.type = 'button'; act.addEventListener('click', function () { onClaim(m.id); }); }
    else {
      var target = m.moduleId && view.modules.filter(function (x) { return x.id === m.moduleId; })[0];
      if (target) { act = h('a', 'gh-btn gh-btn--go', 'Mulai di ' + target.label + ' →'); act.href = hrefOf(target); }
      else { act = h('a', 'gh-btn gh-btn--go', 'Pilih arena ↓'); act.href = '#gh-arena'; }
    }
    card.appendChild(act);
    return card;
  }

  function render() {
    var p = view.player;
    $('gh-level-num').textContent = p.level;
    $('gh-level-label').textContent = p.level;
    $('gh-level-title').textContent = p.title;
    $('gh-xpbar-fill').style.width = p.pct + '%';
    $('gh-xpbar').setAttribute('aria-valuenow', String(p.pct));
    $('gh-xpnote').textContent = fmt(p.into) + ' / ' + fmt(p.span) + ' XP menuju Level ' + (p.level + 1) + ' (total ' + fmt(view.totalXp) + ' XP)';
    $('gh-xp-total').textContent = fmt(view.totalXp);
    $('gh-xp-module').textContent = fmt(view.moduleXp);
    $('gh-xp-bonus').textContent = fmt(view.bonusXp);
    $('gh-streak').textContent = view.streak + ' hari';

    var box = $('gh-missions'); box.textContent = '';
    view.missions.forEach(function (m) { box.appendChild(missionCard(m)); });

    var w = view.weekly, wk = $('gh-weekly'); wk.textContent = '';
    wk.className = 'gh-weekly' + (w.claimed ? ' is-claimed' : w.done ? ' is-done' : '');
    var left = h('div', 'gh-weekly__text');
    left.appendChild(h('p', 'gh-eyebrow', 'Misi mingguan'));
    left.appendChild(h('h3', '', w.title + ' · +' + w.reward + ' XP'));
    left.appendChild(h('p', 'gh-mission__desc', w.desc + ' (' + w.current + ' / ' + w.target + ')'));
    var bar = h('div', 'gh-progress');
    bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Progres misi mingguan');
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(w.target)); bar.setAttribute('aria-valuenow', String(w.current));
    var f = h('span'); f.style.width = Math.round(w.current / w.target * 100) + '%'; bar.appendChild(f); left.appendChild(bar);
    wk.appendChild(left);
    var wa;
    if (w.claimed) { wa = h('button', 'gh-btn gh-btn--ghost', 'Sudah diklaim ✓'); wa.disabled = true; }
    else if (w.done) { wa = h('button', 'gh-btn gh-btn--claim gh-claim', 'Klaim +' + w.reward + ' XP'); wa.type = 'button'; wa.addEventListener('click', function () { onClaim('weekly'); }); }
    else { wa = h('span', 'gh-state', (w.target - w.current) + ' klaim lagi'); }
    wk.appendChild(wa);

    var arena = $('gh-modules'); arena.textContent = '';
    view.modules.forEach(function (m) {
      var a = h('a', 'gh-tile ds-mod-' + m.id); a.href = hrefOf(m);
      var head = h('div', 'gh-tile__head'); head.appendChild(h('span', 'gh-tile__icon', m.icon)); head.appendChild(h('span', 'gh-state', m.started ? m.levelLabel + ' ' + m.level : 'Belum dimulai'));
      a.appendChild(head); a.appendChild(h('h3', '', m.label));
      a.appendChild(h('p', 'gh-tile__meta', fmt(m.xp) + ' XP · ' + fmt(m.activities) + ' aktivitas'));
      a.appendChild(h('span', 'gh-tile__go', 'Masuk arena →'));
      arena.appendChild(a);
    });

    var list = $('gh-achievements'); list.textContent = '';
    var got = 0;
    view.achievements.forEach(function (a) {
      if (a.unlocked) got++;
      var li = h('li', 'gh-badge' + (a.unlocked ? ' is-on' : ''));
      li.setAttribute('data-achievement', a.id);
      li.appendChild(h('span', 'gh-badge__icon', a.unlocked ? a.icon : '🔒'));
      var t = h('div', 'gh-badge__text'); t.appendChild(h('strong', '', a.title)); t.appendChild(h('span', '', a.desc)); li.appendChild(t);
      li.setAttribute('aria-label', a.title + (a.unlocked ? ' (terbuka)' : ' (terkunci)') + ': ' + a.desc);
      list.appendChild(li);
    });
    $('gh-ach-count').textContent = got + ' dari ' + view.achievements.length + ' terbuka';

    var log = $('gh-log'); log.textContent = '';
    if (!view.log.length) log.appendChild(h('li', 'gh-log__empty', 'Belum ada klaim. Selesaikan misi lalu klaim XP-nya.'));
    view.log.forEach(function (e) {
      var label = e.id === 'weekly' ? 'Misi mingguan' : ({ focus: 'Misi fokus', xp: 'Misi XP', explore: 'Misi jelajah' })[e.id] || e.id;
      var li = h('li'); li.appendChild(h('span', '', e.day)); li.appendChild(h('span', '', label)); li.appendChild(h('strong', '', '+' + e.xp + ' XP')); log.appendChild(li);
    });
  }

  // Muat ulang saat kembali ke tab (setelah berlatih di modul), saat data modul berubah di tab lain, dan agar pergantian hari terdeteksi.
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) state = loadState(); refresh(); });
  // data Game Hub / progres modul bisa berubah karena sinkron cloud → muat ulang state & render
  window.addEventListener('portal-cloudsync', function (e) { if (e.detail && e.detail.pulled && e.detail.pulled.length) { state = loadState(); refresh(); } });
  setInterval(refresh, 60000);

  refresh();
})();
