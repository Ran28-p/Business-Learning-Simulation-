/* Ruang Pengajar — tampilan. Validasi, agregasi, dan CSV ada di js/shared/cohort-engine.js (murni, diuji).
   Berkas dibaca lokal lewat File API; tidak ada jaringan, tidak ada penyimpanan (data hanya di memori halaman ini).
   Semua teks dari berkas dirender dengan textContent (bukan innerHTML). */
(function () {
  'use strict';
  var CE = window.CohortEngine;
  var MAX_FILES = 300;
  var $ = function (id) { return document.getElementById(id); };
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var fmt = function (n) { return Number(n).toLocaleString('id-ID'); };
  var fmtDate = function (ms) { return ms === null ? '—' : new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };

  var recaps = [];            // rekap tervalidasi (setelah dedupe)
  var view = { filter: 'all', q: '', sort: 'name', dir: 1 };
  var agg = null;

  /* ───────── muat berkas ───────── */
  function readFile(file) {
    return new Promise(function (resolve) {
      if (file.size > CE.MAX_BYTES) { resolve({ name: file.name, error: 'berkas terlalu besar (maksimal 100 KB)' }); return; }
      var fr = new FileReader();
      fr.onload = function () { var r = CE.parseRecap(String(fr.result), new Date()); resolve(r.ok ? { name: file.name, recap: r.recap } : { name: file.name, error: r.error }); };
      fr.onerror = function () { resolve({ name: file.name, error: 'berkas tidak dapat dibaca' }); };
      fr.readAsText(file);
    });
  }

  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var over = files.length > MAX_FILES; files = files.slice(0, MAX_FILES);
    Promise.all(files.map(readFile)).then(function (results) {
      var okList = [], rejected = [];
      results.forEach(function (r) { if (r.recap) okList.push(r.recap); else rejected.push(r); });
      var merged = CE.dedupe(recaps.concat(okList));
      recaps = merged.list;
      var st = $('tr-status'), notes = [];
      notes.push(okList.length + ' berkas rekap diterima');
      if (merged.replaced) notes.push(merged.replaced + ' rekap lama digantikan yang lebih baru');
      if (rejected.length) notes.push(rejected.length + ' berkas ditolak');
      if (over) notes.push('hanya ' + MAX_FILES + ' berkas pertama yang dibaca');
      st.textContent = notes.join(' · ') + '. Total ' + recaps.length + ' peserta.';
      st.className = 'tr-status ' + (rejected.length || over ? 'is-warn' : 'is-ok');
      var rl = $('tr-rejected'); rl.textContent = '';
      rejected.forEach(function (r) { rl.appendChild(h('li', '', r.name + ' — ' + r.error)); });
      refresh();
    });
  }

  /* ───────── tampilan ───────── */
  function stat(value, label, cls) { var d = h('div', 'tr-stat' + (cls ? ' ' + cls : '')); d.appendChild(h('strong', '', value)); d.appendChild(h('span', '', label)); return d; }

  function refresh() {
    $('tr-results').hidden = !recaps.length;
    if (!recaps.length) return;
    agg = CE.aggregate(recaps, new Date());
    var c = agg.cohort, cards = $('tr-cards'); cards.textContent = '';
    cards.appendChild(stat(fmt(c.count), 'peserta'));
    cards.appendChild(stat(fmt(c.avgXp), 'rata-rata XP (median ' + fmt(c.medianXp) + ')'));
    cards.appendChild(stat(c.avgScore === null ? '—' : c.avgScore + '%', 'rata-rata skor (peserta yang sudah berlatih)'));
    cards.appendChild(stat(fmt(c.active), 'aktif dalam 7 hari'));
    cards.appendChild(stat(fmt(c.inactive), 'tidak aktif', c.inactive ? 'tr-stat--warn' : ''));
    cards.appendChild(stat(fmt(c.struggling), 'perlu perhatian', c.struggling ? 'tr-stat--bad' : ''));

    var w = $('tr-weak'); w.textContent = '';
    if (!agg.topWeak.length) w.appendChild(h('li', 'tr-weak__none', 'Belum ada topik lemah yang tercatat di rekap.'));
    agg.topWeak.forEach(function (t) {
      var li = h('li'); li.appendChild(h('span', '', t.label)); li.appendChild(h('span', 'tr-weak__mod', t.moduleLabel));
      var n = h('span', 'tr-weak__n', t.people + ' peserta'); n.appendChild(h('small', '', 'prioritas ' + t.avgPriority)); li.appendChild(n); w.appendChild(li);
    });

    var tb = $('tr-modules').querySelector('tbody'); tb.textContent = '';
    Object.keys(agg.perModule).forEach(function (id) {
      var m = agg.perModule[id], tr = h('tr');
      tr.appendChild(h('td', '', m.label)); tr.appendChild(h('td', 'num', m.started + ' / ' + c.count));
      tr.appendChild(h('td', 'num', m.avgScore === null ? '—' : m.avgScore + '%')); tr.appendChild(h('td', 'num', fmt(m.avgXp)));
      tb.appendChild(tr);
    });
    renderTable();
  }

  var SORTERS = {
    name: function (a, b) { return a.name.localeCompare(b.name, 'id'); },
    totalXp: function (a, b) { return a.totalXp - b.totalXp; },
    startedModules: function (a, b) { return a.startedModules - b.startedModules; },
    activities: function (a, b) { return a.activities - b.activities; },
    avgScore: function (a, b) { return (a.avgScore === null ? -1 : a.avgScore) - (b.avgScore === null ? -1 : b.avgScore); },
    lastActive: function (a, b) { return (a.lastActive === null ? -1 : a.lastActive) - (b.lastActive === null ? -1 : b.lastActive); }
  };

  function visibleRows() {
    var q = view.q.trim().toLowerCase();
    var rows = agg.rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.email.toLowerCase().indexOf(q) === -1) return false;
      if (view.filter === 'active') return !r.inactive;
      if (view.filter === 'inactive') return r.inactive;
      if (view.filter === 'struggling') return r.struggling;
      return true;
    });
    var f = SORTERS[view.sort] || SORTERS.name;
    return rows.sort(function (a, b) { return f(a, b) * view.dir || SORTERS.name(a, b); });
  }

  function renderTable() {
    var body = $('tr-body'); body.textContent = '';
    var rows = visibleRows();
    if (!rows.length) { var tr0 = h('tr'), td0 = h('td', 'tr-empty', 'Tidak ada peserta yang cocok dengan filter.'); td0.colSpan = 8; tr0.appendChild(td0); body.appendChild(tr0); }
    rows.forEach(function (r) {
      var tr = h('tr');
      var nm = h('td', 'tr-name', r.name); if (r.email) nm.appendChild(h('small', '', r.email)); tr.appendChild(nm);
      tr.appendChild(h('td', 'num', fmt(r.totalXp))); tr.appendChild(h('td', 'num', r.startedModules + ' / 4'));
      tr.appendChild(h('td', 'num', fmt(r.activities))); tr.appendChild(h('td', 'num', r.avgScore === null ? '—' : r.avgScore + '%'));
      tr.appendChild(h('td', '', fmtDate(r.lastActive) + (r.daysInactive !== null && r.daysInactive > CE.INACTIVE_DAYS ? ' (' + r.daysInactive + ' hari lalu)' : '')));
      var st = h('td'); st.appendChild(r.struggling ? h('span', 'tr-pill tr-pill--bad', 'Perlu perhatian') : r.inactive ? h('span', 'tr-pill tr-pill--off', 'Tidak aktif') : h('span', 'tr-pill tr-pill--ok', 'Aktif')); tr.appendChild(st);
      tr.appendChild(h('td', '', r.weakest || '—'));
      body.appendChild(tr);
    });
    document.querySelectorAll('#tr-table th').forEach(function (th) { th.removeAttribute('aria-sort'); });
    var active = document.querySelector('.tr-sort[data-sort="' + view.sort + '"]');
    if (active) { var th = active.closest('th'); th.setAttribute('aria-sort', view.dir === 1 ? 'ascending' : 'descending'); active.setAttribute('data-arrow', view.dir === 1 ? '▲' : '▼'); }
  }

  /* ───────── interaksi ───────── */
  $('tr-file').addEventListener('change', function () { handleFiles(this.files); this.value = ''; });
  var drop = $('tr-drop');
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { handleFiles(e.dataTransfer && e.dataTransfer.files); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); }); window.addEventListener('drop', function (e) { e.preventDefault(); });

  $('tr-search').addEventListener('input', function () { view.q = this.value; if (agg) renderTable(); });
  $('tr-filter').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-filter]'); if (!b) return;
    view.filter = b.getAttribute('data-filter');
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    if (agg) renderTable();
  });
  document.querySelectorAll('.tr-sort').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-sort');
      if (view.sort === k) view.dir = -view.dir; else { view.sort = k; view.dir = k === 'name' ? 1 : -1; }
      if (agg) renderTable();
    });
  });

  $('tr-csv').addEventListener('click', function () {
    if (!agg) return;
    var blob = new Blob([CE.toCsv(visibleRows())], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'rekap-kelompok-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  $('tr-clear').addEventListener('click', function () {
    recaps = []; agg = null; $('tr-status').textContent = ''; $('tr-status').className = 'tr-status'; $('tr-rejected').textContent = ''; refresh();
  });
})();
