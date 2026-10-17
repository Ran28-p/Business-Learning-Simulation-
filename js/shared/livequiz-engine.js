/* Kuis Langsung (Game Hub) — mesin MURNI: kode ruang, pembuat soal (bank statis + generator berangka acak),
   validasi/sanitasi, skor (ketepatan + kecepatan), papan peringkat. Tanpa DOM/jaringan → diuji di tests/test-livequiz.mjs. */
(function (root) {
  'use strict';
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa 0/O/1/I agar tak salah baca
  var LIM = { q: 400, opt: 150, exp: 600, name: 24, title: 100, maxQ: 100, minTimer: 5, maxTimer: 300 };
  var THEMES = [
    { id: 'pajak', label: 'Pajak', icon: '🧾', desc: 'PPh, PPN, PTKP, tarif, pemotongan & pelaporan' },
    { id: 'akuntansi', label: 'Akuntansi', icon: '📒', desc: 'Persamaan akuntansi, jurnal, persediaan, penyusutan, rasio' },
    { id: 'excel', label: 'Excel', icon: '📊', desc: 'Rumus, referensi sel, VLOOKUP, IF, teks, pivot, kode galat' },
    { id: 'sqlpq', label: 'SQL & Power Query', icon: '🗄️', desc: 'SELECT, JOIN, GROUP BY, NULL; Merge, Append, Unpivot di Power Query' },
    { id: 'campuran', label: 'Campuran', icon: '🎲', desc: 'Gabungan Pajak + Akuntansi + Excel + SQL & Power Query' }
  ];

  function rng(seed) { // mulberry32
    var a = (seed >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function int(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function shuffle(r, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function makeCode(r) { r = r || Math.random; var s = ''; for (var i = 0; i < 6; i++) s += ALPHABET.charAt(Math.floor(r() * ALPHABET.length)); return s; }
  function normCode(s) { return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
  function validCode(s) { return /^[A-HJ-NP-Z2-9]{6}$/.test(String(s)); }
  function clampTimer(n) { n = Math.round(Number(n)); if (!isFinite(n)) n = 20; return Math.max(LIM.minTimer, Math.min(LIM.maxTimer, n)); }
  function cleanName(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, LIM.name); }

  /* ---------- format ---------- */
  function rp(n) { n = Math.round(n); var neg = n < 0; var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (neg ? '-' : '') + 'Rp' + s; }
  function pct(n) { return String(Math.round(n * 100) / 100).replace('.', ',') + '%'; }

  /* ---------- validasi soal ---------- */
  function validateQuestion(x) {
    var errs = [];
    if (!x || typeof x !== 'object') return ['bukan objek'];
    if (typeof x.q !== 'string' || !x.q.trim()) errs.push('pertanyaan kosong');
    else if (x.q.length > LIM.q) errs.push('pertanyaan terlalu panjang');
    if (!Array.isArray(x.o) || x.o.length < 2 || x.o.length > 4) errs.push('butuh 2–4 pilihan');
    else {
      var seen = {};
      x.o.forEach(function (o) {
        if (typeof o !== 'string' || !o.trim()) errs.push('ada pilihan kosong');
        else if (o.length > LIM.opt) errs.push('pilihan terlalu panjang');
        var k = String(o).trim().toLowerCase(); if (seen[k]) errs.push('pilihan kembar'); seen[k] = 1;
      });
      if (!(Number.isInteger(x.a) && x.a >= 0 && x.a < x.o.length)) errs.push('kunci jawaban tidak valid');
    }
    if (x.e != null && (typeof x.e !== 'string' || x.e.length > LIM.exp)) errs.push('pembahasan terlalu panjang');
    return errs;
  }
  function sanitizeQuestion(x) {
    if (!x || typeof x !== 'object') return null;
    var o = Array.isArray(x.o) ? x.o.slice(0, 4).map(function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, LIM.opt); }) : [];
    var out = { q: String(x.q == null ? '' : x.q).replace(/\s+/g, ' ').trim().slice(0, LIM.q), o: o, a: Number(x.a), e: String(x.e == null ? '' : x.e).trim().slice(0, LIM.exp), t: String(x.t || '').slice(0, 40) };
    return validateQuestion(out).length ? null : out;
  }
  function validateQuiz(qs) {
    if (!Array.isArray(qs) || !qs.length) return ['belum ada soal'];
    if (qs.length > LIM.maxQ) return ['maksimal ' + LIM.maxQ + ' soal'];
    var errs = [];
    qs.forEach(function (x, i) { validateQuestion(x).forEach(function (e) { errs.push('Soal ' + (i + 1) + ': ' + e); }); });
    return errs;
  }

  /* ---------- sumber statis ---------- */
  function normStatic(q, topic, expl) {
    if (!q || !Array.isArray(q.options) || q.options.length < 2) return null;
    var opts = q.options.map(String), ai = opts.indexOf(String(q.answer));
    if (ai < 0) return null;
    var text = (q.scenario ? q.scenario + ' ' : '') + (q.q || q.question || '');
    var item = { q: text.trim(), o: opts.slice(0, 4), a: ai, e: String(expl || q.explanation || '').slice(0, LIM.exp), t: topic };
    if (item.a >= item.o.length) return null;
    return validateQuestion(item).length ? null : item;
  }
  function fromModulPajak(json) {
    var out = [];
    ((json && json.topics) || []).forEach(function (t) { (t.questions || []).forEach(function (q) { if (q.type === 'mcq') { var n = normStatic(q, t.title || t.key); if (n) out.push(n); } }); });
    return out;
  }
  function fromTaxCareer(arr) {
    var out = [];
    (arr || []).forEach(function (q) { if (q.type === 'mcq') { var n = normStatic(q, q.skill || q.category); if (n) out.push(n); } });
    return out;
  }

  /* ---------- generator berangka (jawaban selalu dihitung, bukan karangan) ---------- */
  function numOpts(r, correct, wrongs, fmt) {
    var vals = [correct], i;
    for (i = 0; i < wrongs.length && vals.length < 4; i++) { var w = Math.round(wrongs[i]); if (vals.indexOf(w) < 0 && w >= 0) vals.push(w); }
    var guard = 0;
    while (vals.length < 4 && guard++ < 50) { var d = Math.round(correct * (1 + (int(r, 1, 6) * (r() < 0.5 ? -1 : 1)) / 10)); if (vals.indexOf(d) < 0 && d >= 0) vals.push(d); }
    var sh = shuffle(r, vals);
    return { o: sh.map(fmt), a: sh.indexOf(correct) };
  }
  function pph17(pkp) {
    var layers = [[60e6, 0.05], [190e6, 0.15], [250e6, 0.25], [4500e6, 0.30], [Infinity, 0.35]], left = pkp, tax = 0;
    for (var i = 0; i < layers.length && left > 0; i++) { var part = Math.min(left, layers[i][0]); tax += part * layers[i][1]; left -= part; }
    return Math.round(tax);
  }
  var NAMES = ['PT Nusa', 'CV Mitra', 'PT Abadi', 'UD Sejahtera', 'PT Maju Jaya', 'CV Harapan', 'PT Lestari', 'PT Cakrawala'];
  var GEN = {
    pajak: [
      function (r) { var pkp = int(r, 8, 60) * 10e6 + int(r, 0, 9) * 1e6; var c = pph17(pkp);
        var o = numOpts(r, c, [pkp * 0.05, pkp * 0.15, pkp * 0.25, pkp * 0.22], rp);
        return { q: 'Penghasilan Kena Pajak (PKP) seorang WP orang pribadi dalam setahun ' + rp(pkp) + '. Berapa PPh terutang menurut tarif Pasal 17 (5% s.d. Rp60 juta; 15% s.d. Rp250 juta; 25% s.d. Rp500 juta; 30% s.d. Rp5 miliar; 35% di atasnya)?', o: o.o, a: o.a, e: 'Tarif progresif dikenakan per lapisan, bukan satu tarif untuk seluruh PKP. Hasil hitung: ' + rp(c) + '.', t: 'PPh OP progresif' }; },
      function (r) { var n = pick(r, NAMES), v = int(r, 5, 400) * 1e6, c = v * 0.02;
        var o = numOpts(r, c, [v * 0.015, v * 0.1, v * 0.15, v * 0.005], rp);
        return { q: n + ' membayar jasa teknik ' + rp(v) + ' (belum termasuk PPN) kepada WP badan dalam negeri. Berapa PPh Pasal 23 yang dipotong (tarif 2% atas jumlah bruto)?', o: o.o, a: o.a, e: 'PPh 23 jasa = 2% × jumlah bruto tanpa PPN = ' + rp(c) + '.', t: 'PPh 23' }; },
      function (r) { var om = int(r, 10, 400) * 1e6, c = om * 0.005;
        var o = numOpts(r, c, [om * 0.01, om * 0.05, om * 0.022, om * 0.0025], rp);
        return { q: 'Omzet bulanan WP UMKM yang memilih PPh Final ' + rp(om) + '. Berapa PPh Final yang disetor bulan itu (tarif 0,5% dari peredaran bruto, PP 55/2022)?', o: o.o, a: o.a, e: 'PPh final UMKM = 0,5% × peredaran bruto = ' + rp(c) + '.', t: 'PPh Final UMKM' }; },
      function (r) { var pkp = int(r, 5, 900) * 10e6, c = pkp * 0.22;
        var o = numOpts(r, c, [pkp * 0.25, pkp * 0.2, pkp * 0.11, pkp * 0.3], rp);
        return { q: 'PKP sebuah PT (WP badan, tarif umum) tahun ini ' + rp(pkp) + '. Berapa PPh Badan terutang dengan tarif 22%?', o: o.o, a: o.a, e: 'PPh Badan = 22% × PKP = ' + rp(c) + '.', t: 'PPh Badan' }; },
      function (r) { var neto = int(r, 70, 400) * 1e6, st = pick(r, [['TK/0', 54e6], ['K/0', 58.5e6], ['K/1', 63e6], ['K/2', 67.5e6]]), pkp = neto - st[1];
        var o = numOpts(r, pkp, [neto - 54e6, neto - 4.5e6, neto, neto - st[1] - 4.5e6], rp);
        return { q: 'Penghasilan neto setahun seorang pegawai ' + rp(neto) + ', status ' + st[0] + ' (PTKP ' + rp(st[1]) + '). Berapa PKP-nya?', o: o.o, a: o.a, e: 'PKP = penghasilan neto − PTKP = ' + rp(neto) + ' − ' + rp(st[1]) + ' = ' + rp(pkp) + '.', t: 'PTKP & PKP' }; },
      function (r) { var dpp = int(r, 5, 500) * 1e6, c = dpp * 0.11;
        var o = numOpts(r, c, [dpp * 0.12, dpp * 0.1, dpp * 0.02, dpp * 0.011], rp);
        return { q: 'Pengusaha Kena Pajak menjual barang (bukan barang mewah) dengan harga jual ' + rp(dpp) + ' di luar PPN. Berapa PPN keluaran dengan tarif efektif 11% (PPN 12% × DPP Nilai Lain 11/12)?', o: o.o, a: o.a, e: 'Tarif 12% atas DPP nilai lain 11/12 × harga jual = efektif 11% → ' + rp(c) + '.', t: 'PPN' }; },
      function (r) { var out = int(r, 20, 300) * 1e6, inn = Math.round(out * (int(r, 20, 80) / 100) / 1e6) * 1e6, c = out - inn;
        var o = numOpts(r, c, [out, inn, out + inn, Math.abs(inn - out) + 1e6], rp);
        return { q: 'Dalam satu masa pajak PPN Keluaran ' + rp(out) + ' dan PPN Masukan yang dapat dikreditkan ' + rp(inn) + '. Berapa PPN yang kurang bayar?', o: o.o, a: o.a, e: 'PPN kurang bayar = PPN keluaran − PPN masukan = ' + rp(c) + '.', t: 'PPN' }; }
    ],
    akuntansi: [
      function (r) { var A = int(r, 50, 900) * 1e6, L = Math.round(A * int(r, 20, 70) / 100 / 1e6) * 1e6, E = A - L;
        var o = numOpts(r, E, [A + L, L, A, E + 5e6], rp);
        return { q: 'Total aset perusahaan ' + rp(A) + ' dan total liabilitas ' + rp(L) + '. Berapa ekuitas pemilik menurut persamaan akuntansi?', o: o.o, a: o.a, e: 'Aset = Liabilitas + Ekuitas → Ekuitas = ' + rp(A) + ' − ' + rp(L) + ' = ' + rp(E) + '.', t: 'Persamaan akuntansi' }; },
      function (r) { var cost = int(r, 20, 400) * 1e6, yrs = pick(r, [4, 5, 8, 10]), res = Math.round(cost * pick(r, [0, 0.05, 0.1]) / 1e6) * 1e6, d = Math.round((cost - res) / yrs);
        var o = numOpts(r, d, [cost / yrs, (cost + res) / yrs, (cost - res) / (yrs + 1), (cost - res) / (yrs - 1)], rp);
        return { q: 'Mesin dibeli ' + rp(cost) + ', umur manfaat ' + yrs + ' tahun, nilai residu ' + rp(res) + '. Berapa beban penyusutan per tahun (garis lurus)?', o: o.o, a: o.a, e: '(Harga perolehan − residu) ÷ umur = (' + rp(cost) + ' − ' + rp(res) + ') ÷ ' + yrs + ' = ' + rp(d) + '.', t: 'Penyusutan' }; },
      function (r) { var rev = int(r, 100, 900) * 1e6, ex = Math.round(rev * int(r, 40, 90) / 100 / 1e6) * 1e6, ni = rev - ex;
        var o = numOpts(r, ni, [rev + ex, ex, rev, ni + 10e6], rp);
        return { q: 'Pendapatan periode ini ' + rp(rev) + ' dan total beban ' + rp(ex) + '. Berapa laba bersih?', o: o.o, a: o.a, e: 'Laba bersih = pendapatan − beban = ' + rp(ni) + '.', t: 'Laba rugi' }; },
      function (r) { var beg = int(r, 10, 80) * 1e6, buy = int(r, 50, 400) * 1e6, end = int(r, 10, 90) * 1e6, c = beg + buy - end;
        var o = numOpts(r, c, [beg + buy + end, buy - end, beg + buy, beg - buy + end], rp);
        return { q: 'Persediaan awal ' + rp(beg) + ', pembelian bersih ' + rp(buy) + ', persediaan akhir ' + rp(end) + '. Berapa Harga Pokok Penjualan (HPP)?', o: o.o, a: o.a, e: 'HPP = persediaan awal + pembelian − persediaan akhir = ' + rp(c) + '.', t: 'HPP' }; },
      function (r) { var u1 = int(r, 10, 40) * 10, p1 = int(r, 10, 50) * 1000, u2 = int(r, 10, 40) * 10, p2 = p1 + int(r, 1, 9) * 1000, sold = u1 + int(r, 1, u2 / 10 - 1) * 5, fifo = u1 * p1 + (sold - u1) * p2, avg = Math.round(sold * (u1 * p1 + u2 * p2) / (u1 + u2));
        if (fifo === avg) fifo += 0; var o = numOpts(r, fifo, [avg, sold * p2, sold * p1, fifo + 50000], rp);
        return { q: 'Pembelian 1: ' + u1 + ' unit @' + rp(p1) + '; pembelian 2: ' + u2 + ' unit @' + rp(p2) + '. Terjual ' + sold + ' unit. Berapa HPP metode FIFO?', o: o.o, a: o.a, e: 'FIFO memakai lapisan tertua dulu: ' + u1 + ' × ' + rp(p1) + ' + ' + (sold - u1) + ' × ' + rp(p2) + ' = ' + rp(fifo) + '.', t: 'Persediaan FIFO' }; },
      function (r) { var ca = int(r, 100, 900) * 1e6, cl = int(r, 40, 400) * 1e6, cr = Math.round(ca / cl * 100) / 100;
        var s = function (v) { return String(v).replace('.', ',') + ' kali'; };
        var wr = [Math.round(cl / ca * 100) / 100, Math.round((ca - cl) / cl * 100) / 100, Math.round((ca + cl) / cl * 100) / 100], vals = [cr];
        wr.forEach(function (w) { if (vals.indexOf(w) < 0) vals.push(w); });
        var g = 0; while (vals.length < 4 && g++ < 30) { var x = Math.round((cr + int(r, 1, 9) / 10) * 100) / 100; if (vals.indexOf(x) < 0) vals.push(x); }
        var sh = shuffle(r, vals);
        return { q: 'Aset lancar ' + rp(ca) + ' dan liabilitas lancar ' + rp(cl) + '. Berapa rasio lancar (current ratio)?', o: sh.map(s), a: sh.indexOf(cr), e: 'Rasio lancar = aset lancar ÷ liabilitas lancar = ' + s(cr) + '.', t: 'Rasio keuangan' }; },
      function (r) { var sales = int(r, 100, 900) * 1e6, gp = Math.round(sales * int(r, 20, 60) / 100 / 1e6) * 1e6, m = Math.round(gp / sales * 10000) / 100;
        var vals = [m], c = 0; [m + 5, m - 5, m + 10, Math.round(gp / (sales - gp) * 10000) / 100].forEach(function (v) { if (v > 0 && vals.indexOf(v) < 0 && vals.length < 4) vals.push(v); });
        while (vals.length < 4 && c++ < 30) { var x = Math.round((m + int(r, 1, 15)) * 100) / 100; if (vals.indexOf(x) < 0) vals.push(x); }
        var sh = shuffle(r, vals);
        return { q: 'Penjualan bersih ' + rp(sales) + ' dan laba kotor ' + rp(gp) + '. Berapa margin laba kotor?', o: sh.map(pct), a: sh.indexOf(m), e: 'Margin laba kotor = laba kotor ÷ penjualan × 100% = ' + pct(m) + '.', t: 'Rasio keuangan' }; },
      function (r) { var T = [['Membayar sewa kantor secara tunai', 'Beban Sewa', 'Kas'], ['Menjual jasa secara kredit', 'Piutang Usaha', 'Pendapatan Jasa'], ['Membeli perlengkapan secara tunai', 'Perlengkapan', 'Kas'], ['Menerima pelunasan piutang dari pelanggan', 'Kas', 'Piutang Usaha'], ['Pemilik menyetor modal tunai', 'Kas', 'Modal Pemilik'], ['Membayar utang usaha secara tunai', 'Utang Usaha', 'Kas'], ['Membeli peralatan secara kredit', 'Peralatan', 'Utang Usaha'], ['Membayar gaji karyawan secara tunai', 'Beban Gaji', 'Kas']], t = pick(r, T);
        var pool = ['Kas', 'Piutang Usaha', 'Utang Usaha', 'Pendapatan Jasa', 'Modal Pemilik', 'Beban Gaji', 'Perlengkapan', 'Peralatan', 'Beban Sewa'].filter(function (x) { return x !== t[1]; });
        var o = shuffle(r, [t[1]].concat(shuffle(r, pool).slice(0, 3)));
        return { q: 'Transaksi: "' + t[0] + '". Akun mana yang DIDEBIT?', o: o, a: o.indexOf(t[1]), e: 'Jurnal: Debit ' + t[1] + ' / Kredit ' + t[2] + '.', t: 'Jurnal' }; }
    ]
  };

  /* ---------- soal akuntansi statis (konsep) ---------- */
  function S(q, o, e, t) { return { q: q, o: o.slice(), a: 0, e: e, t: t || 'Konsep akuntansi' }; } // jawaban benar = o[0], lalu diacak saat dipakai
  var ACC_STATIC = [
    S('Persamaan dasar akuntansi adalah…', ['Aset = Liabilitas + Ekuitas', 'Aset = Liabilitas − Ekuitas', 'Ekuitas = Aset + Liabilitas', 'Liabilitas = Aset + Ekuitas'], 'Seluruh sumber daya (aset) dibiayai oleh kreditur (liabilitas) dan pemilik (ekuitas).'),
    S('Saldo normal akun Kas adalah…', ['Debit', 'Kredit', 'Debit dan kredit sama', 'Tidak punya saldo normal'], 'Aset bertambah di sisi debit, jadi saldo normalnya debit.'),
    S('Saldo normal akun Pendapatan adalah…', ['Kredit', 'Debit', 'Nol', 'Bergantung jenis usaha'], 'Pendapatan menambah ekuitas, bertambah di sisi kredit.'),
    S('Saldo normal akun Beban adalah…', ['Debit', 'Kredit', 'Kredit pada akhir periode', 'Tidak ada'], 'Beban mengurangi ekuitas sehingga bertambah di sisi debit.'),
    S('Tahap yang BENAR dalam siklus akuntansi adalah…', ['Jurnal → buku besar → neraca saldo → laporan keuangan', 'Laporan keuangan → jurnal → buku besar', 'Buku besar → jurnal → laporan keuangan', 'Neraca saldo → jurnal → buku besar'], 'Transaksi dijurnal, diposting ke buku besar, dibuat neraca saldo, lalu laporan keuangan.', 'Siklus akuntansi'),
    S('Tujuan neraca saldo (trial balance) adalah…', ['Memeriksa kesamaan total debit dan kredit', 'Menghitung laba perusahaan', 'Menggantikan buku besar', 'Menentukan pajak terutang'], 'Neraca saldo mengecek keseimbangan total debit dan kredit, bukan menjamin tidak ada kesalahan lain.', 'Siklus akuntansi'),
    S('Jurnal penyesuaian dibuat pada akhir periode terutama untuk…', ['Menerapkan basis akrual (pengakuan pendapatan & beban pada periode yang tepat)', 'Menghapus transaksi lama', 'Menghitung pajak', 'Mengganti jurnal umum'], 'Penyesuaian memastikan pendapatan dan beban diakui pada periode terjadinya.', 'Penyesuaian'),
    S('Beban dibayar di muka (misalnya sewa 1 tahun dibayar tunai) pada saat pembayaran dicatat sebagai…', ['Aset (Sewa Dibayar di Muka)', 'Liabilitas', 'Pendapatan', 'Ekuitas'], 'Manfaatnya belum dinikmati sehingga dicatat sebagai aset lalu dibebankan bertahap.', 'Penyesuaian'),
    S('Metode FIFO mengasumsikan barang yang dijual lebih dulu adalah…', ['Barang yang dibeli paling awal', 'Barang yang dibeli paling akhir', 'Barang dengan harga tertinggi', 'Rata-rata semua pembelian'], 'First-In, First-Out: lapisan pembelian tertua keluar lebih dulu.', 'Persediaan'),
    S('Saat harga beli naik terus, laba kotor metode FIFO umumnya dibanding rata-rata…', ['Lebih tinggi', 'Lebih rendah', 'Sama persis', 'Selalu nol'], 'FIFO membebankan harga lama yang lebih murah ke HPP sehingga laba kotor lebih tinggi.', 'Persediaan'),
    S('Retur pembelian mengakibatkan…', ['Persediaan dan utang usaha berkurang', 'Persediaan bertambah', 'Pendapatan bertambah', 'Kas bertambah selalu'], 'Barang dikembalikan ke pemasok, sehingga nilai persediaan dan kewajiban kepada pemasok turun.', 'Persediaan'),
    S('Akun berikut yang termasuk akun nominal (sementara) adalah…', ['Beban Gaji', 'Kas', 'Utang Usaha', 'Modal Pemilik'], 'Akun nominal (pendapatan & beban) ditutup pada akhir periode; akun riil (aset, liabilitas, ekuitas) tidak.', 'Penutupan'),
    S('Jurnal penutup memindahkan saldo Ikhtisar Laba Rugi ke…', ['Modal/Laba ditahan', 'Kas', 'Piutang', 'Utang Usaha'], 'Laba atau rugi bersih akhirnya masuk ke ekuitas.', 'Penutupan'),
    S('Akumulasi penyusutan adalah akun…', ['Kontra aset (mengurangi nilai buku aset)', 'Beban', 'Pendapatan', 'Liabilitas'], 'Akumulasi penyusutan bersaldo kredit dan menjadi pengurang aset tetap di neraca.', 'Penyusutan'),
    S('Nilai buku aset tetap dihitung dari…', ['Harga perolehan − akumulasi penyusutan', 'Harga perolehan + akumulasi penyusutan', 'Harga pasar saja', 'Nilai residu saja'], 'Nilai buku = harga perolehan dikurangi akumulasi penyusutan.', 'Penyusutan'),
    S('Laporan yang menunjukkan posisi keuangan pada suatu tanggal tertentu adalah…', ['Laporan posisi keuangan (neraca)', 'Laporan laba rugi', 'Laporan arus kas', 'Laporan perubahan ekuitas'], 'Neraca = potret aset, liabilitas, dan ekuitas pada satu tanggal.', 'Laporan keuangan'),
    S('Laporan laba rugi melaporkan…', ['Kinerja (pendapatan dan beban) selama suatu periode', 'Posisi aset pada satu tanggal', 'Hanya arus kas', 'Hanya modal pemilik'], 'Laba rugi mencakup periode waktu, berbeda dengan neraca yang satu tanggal.', 'Laporan keuangan'),
    S('Prinsip pengakuan pendapatan pada basis akrual adalah pendapatan diakui saat…', ['Diperoleh/jasa diserahkan, meski kas belum diterima', 'Kas diterima saja', 'Faktur dipesan', 'Akhir tahun saja'], 'Basis akrual mengakui pendapatan ketika diperoleh, bukan ketika kas masuk.', 'Basis akrual'),
    S('Piutang tak tertagih (kerugian piutang) dicatat sebagai…', ['Beban kerugian piutang', 'Pendapatan lain', 'Pengurang kas', 'Modal'], 'Estimasi piutang yang tak tertagih adalah beban periode berjalan (dengan cadangan kerugian piutang).', 'Piutang'),
    S('Akun Utang Gaji pada akhir periode muncul karena…', ['Gaji sudah menjadi beban tapi belum dibayar (beban yang masih harus dibayar)', 'Gaji dibayar di muka', 'Gaji dibayar dua kali', 'Salah pencatatan kas'], 'Beban yang masih harus dibayar diakui lewat jurnal penyesuaian: Dr Beban Gaji / Cr Utang Gaji.', 'Penyesuaian'),
    S('Perusahaan dagang memperoleh laba kotor dari…', ['Penjualan bersih − HPP', 'Penjualan − beban operasional', 'Pembelian − penjualan', 'Aset − liabilitas'], 'Laba kotor sebelum beban operasional = penjualan bersih dikurangi HPP.', 'Perusahaan dagang'),
    S('Dalam sistem perpetual, setiap penjualan barang dagang langsung dicatat…', ['HPP dan pengurangan persediaan', 'Hanya kas', 'Hanya utang', 'Hanya modal'], 'Perpetual memperbarui persediaan dan HPP setiap transaksi (Dr HPP / Cr Persediaan).', 'Persediaan'),
    S('Jurnal koreksi kesalahan yang sudah diposting sebaiknya dibuat dengan…', ['Jurnal koreksi baru yang menjelaskan perbaikan', 'Menghapus jurnal lama tanpa jejak', 'Mengubah angka di buku besar saja', 'Membiarkannya'], 'Jejak audit harus terjaga; koreksi dicatat melalui jurnal koreksi yang jelas.', 'Pengendalian')
  ];


  /* ---------- Excel: generator (dicocokkan ke spreadsheet-engine.js asli di tes) ---------- */
  var COLS = 'ABCDEF';
  function rangeCells(col, from, vals) { var c = {}; vals.forEach(function (v, i) { c[col + (from + i)] = v; }); return c; }
  function strOpts(r, correct, wrongs) {
    var vals = [correct]; wrongs.forEach(function (w) { w = String(w); if (vals.indexOf(w) < 0 && vals.length < 4) vals.push(w); });
    if (isFinite(Number(correct)) && String(correct).trim() !== '') { // pelengkap angka agar selalu 4 pilihan
      var base = Number(correct), steps = [1, -1, 2, -2, 5, -5, 10, -10, 20, 50], k = 0, dec = String(correct).indexOf('.') >= 0;
      while (vals.length < 4 && k < steps.length) { var cand = String(Math.round((base + steps[k++]) * 1000) / 1000); if (vals.indexOf(cand) < 0 && (dec || Number(cand) >= 0)) vals.push(cand); }
    }
    if (vals.length < 2) return null; var sh = shuffle(r, vals); return { o: sh, a: sh.indexOf(correct) };
  }
  function ints(r, n, lo, hi) { var a = []; for (var i = 0; i < n; i++) a.push(int(r, lo, hi)); return a; }
  function xl(q, opts, e, t, v) { return { q: q, o: opts.o, a: opts.a, e: e, t: t, v: v }; }
  function listTxt(vals) { return vals.join('; '); }
  function adjustRef(f, dr, dc) { // geser referensi relatif; $ mengunci (cocok dengan Excel)
    return f.replace(/(\$?)([A-Z]{1,2})(\$?)(\d+)/g, function (m, ca, col, ra, row) {
      var ci = col.split('').reduce(function (a, ch) { return a * 26 + ch.charCodeAt(0) - 64; }, 0), nr = Number(row);
      if (!ca) ci += dc; if (!ra) nr += dr;
      var L = ''; for (var x = ci; x > 0; x = Math.floor((x - 1) / 26)) L = String.fromCharCode(65 + (x - 1) % 26) + L;
      return ca + L + ra + nr;
    });
  }
  var FRUITS = ['Apel', 'Jeruk', 'Mangga', 'Pisang', 'Salak', 'Durian', 'Anggur'], CODES = ['K01', 'K02', 'K03', 'K04', 'K05', 'K06'];
  GEN.excel = [
    function (r) { var a = ints(r, 5, 5, 60), f = '=SUM(A1:A5)', c = a.reduce(function (x, y) { return x + y; }, 0);
      var o = numOpts(r, c, [c - a[0], c + a[4], Math.round(c / 5), c - 10], String);
      return xl('Sel A1:A5 berisi ' + listTxt(a) + '. Berapa hasil ' + f + '?', o, 'SUM menjumlahkan semua angka pada rentang: ' + a.join(' + ') + ' = ' + c + '.', 'SUM', { k: 'excel', cells: rangeCells('A', 1, a), formula: f, answer: String(c) }); },
    function (r) { var m = int(r, 20, 80), a = ints(r, 4, 10, 90), last = 5 * m - a.reduce(function (x, y) { return x + y; }, 0); if (last < 1 || last > 100) return null; a.push(last);
      var f = '=AVERAGE(B2:B6)', o = numOpts(r, m, [m + 5, m - 5, 5 * m, m + 10], String);
      return xl('Sel B2:B6 berisi ' + listTxt(a) + '. Berapa hasil ' + f + '?', o, 'AVERAGE = jumlah ÷ banyak angka = ' + (5 * m) + ' ÷ 5 = ' + m + '.', 'AVERAGE', { k: 'excel', cells: rangeCells('B', 2, a), formula: f, answer: String(m) }); },
    function (r) { var a = ints(r, 6, 10, 99), fn = pick(r, ['MAX', 'MIN']), f = '=' + fn + '(C1:C6)', c = fn === 'MAX' ? Math.max.apply(null, a) : Math.min.apply(null, a), others = a.filter(function (x) { return x !== c; });
      var o = strOpts(r, String(c), others.slice(0, 3)); if (!o) return null;
      return xl('Sel C1:C6 berisi ' + listTxt(a) + '. Berapa hasil ' + f + '?', o, fn + ' mengambil nilai ' + (fn === 'MAX' ? 'terbesar' : 'terkecil') + ' pada rentang: ' + c + '.', fn, { k: 'excel', cells: rangeCells('C', 1, a), formula: f, answer: String(c) }); },
    function (r) { var nums = ints(r, 4, 5, 90), cells = { A1: nums[0], A2: nums[1], A3: 'n/a', A4: nums[2], A6: nums[3] }, f = '=COUNT(A1:A6)', o = numOpts(r, 4, [6, 5, 3, 2], String);
      return xl('Sel A1:A6 berisi: ' + nums[0] + '; ' + nums[1] + '; teks "n/a"; ' + nums[2] + '; (A5 kosong); ' + nums[3] + '. Berapa hasil ' + f + '?', o, 'COUNT hanya menghitung sel berisi ANGKA. Teks dan sel kosong tidak dihitung → 4.', 'COUNT', { k: 'excel', cells: cells, formula: f, answer: '4' }); },
    function (r) { var sc = int(r, 55, 95), th = pick(r, [60, 70, 75, 80]), f = '=IF(B2>=' + th + ',"Lulus","Remedial")', c = sc >= th ? 'Lulus' : 'Remedial', o = strOpts(r, c, ['Lulus', 'Remedial', String(sc), 'BENAR']);
      return xl('Sel B2 berisi ' + sc + '. Apa hasil ' + f + '?', o, 'Kondisi B2>=' + th + ' bernilai ' + (sc >= th ? 'benar' : 'salah') + ', sehingga hasilnya "' + c + '".', 'IF', { k: 'excel', cells: { B2: sc }, formula: f, answer: c }); },
    function (r) { var code = pick(r, ['INV', 'PO', 'FKT']) + '-' + int(r, 2020, 2029) + '-' + ('00' + int(r, 1, 999)).slice(-3), kind = pick(r, ['LEFT', 'RIGHT', 'MID', 'LEN']), f, c, why;
      if (kind === 'LEFT') { f = '=LEFT(A1,3)'; c = code.slice(0, 3); why = '3 karakter pertama'; } else if (kind === 'RIGHT') { f = '=RIGHT(A1,3)'; c = code.slice(-3); why = '3 karakter terakhir'; }
      else if (kind === 'MID') { var st = code.indexOf('-') + 2; f = '=MID(A1,' + st + ',4)'; c = code.substr(st - 1, 4); why = '4 karakter mulai dari posisi ke-' + st; } else { f = '=LEN(A1)'; c = String(code.length); why = 'jumlah semua karakter (termasuk tanda hubung)'; }
      var wr = [code.slice(0, 2), code.slice(-2), code.slice(-4), String(code.length + 1), String(code.length - 1), code.slice(1, 5), code.slice(0, 4)];
      var o = strOpts(r, c, wr.filter(function (x) { return x !== c; })); if (!o) return null;
      return xl('Sel A1 berisi "' + code + '". Apa hasil ' + f + '?', o, kind + ' menghasilkan ' + why + ': ' + c + '.', 'Fungsi teks', { k: 'excel', cells: { A1: code }, formula: f, answer: c }); },
    function (r) { var codes = shuffle(r, CODES).slice(0, 4), prices = ints(r, 4, 5, 90).map(function (x) { return x * 1000; }); if (new Set(prices).size < 4) return null;
      var i = int(r, 0, 3), f = '=VLOOKUP("' + codes[i] + '",A2:B5,2,FALSE)', cells = {}; codes.forEach(function (c, k) { cells['A' + (2 + k)] = c; cells['B' + (2 + k)] = prices[k]; });
      var o = numOpts(r, prices[i], prices.filter(function (_, k) { return k !== i; }), String);
      return xl('A2:B5 berisi kode dan harga: ' + codes.map(function (c, k) { return c + '=' + prices[k]; }).join('; ') + '. Berapa hasil ' + f + '?', o, 'VLOOKUP mencari "' + codes[i] + '" di kolom pertama (pencocokan persis karena FALSE) lalu mengambil kolom ke-2: ' + prices[i] + '.', 'VLOOKUP', { k: 'excel', cells: cells, formula: f, answer: String(prices[i]) }); },
    function (r) { var xi = int(r, 1000000, 9999999), x = xi / 1000, xs = x.toFixed(3), dg = pick(r, [2, 1, 0, -1, -2]), unit = Math.pow(10, 3 - dg); if (xi % unit === unit / 2) return null; // hindari kasus "tepat setengah" (rawan selisih pembulatan float)
      var f = '=ROUND(' + xs + ',' + dg + ')', c = Math.round(xi / unit) * unit / 1000, wr = [Math.floor(xi / unit) * unit / 1000, Math.ceil(xi / unit) * unit / 1000, Math.round(x), Math.trunc(x)];
      var o = strOpts(r, String(c), wr.map(String)); if (!o) return null;
      return xl('Berapa hasil ' + f + '?', o, 'ROUND membulatkan ke ' + (dg >= 0 ? dg + ' angka desimal' : 'kelipatan ' + Math.pow(10, -dg)) + ': ' + c + '.', 'ROUND', { k: 'excel', cells: {}, formula: f, answer: String(c) }); },
    function (r) { var names = shuffle(r, FRUITS).slice(0, 5), vals = ints(r, 5, 3, 90); if (new Set(vals).size < 5) return null;
      var i = int(r, 0, 4), f = '=INDEX(B2:B6,MATCH("' + names[i] + '",A2:A6,0))', cells = {}; names.forEach(function (n, k) { cells['A' + (2 + k)] = n; cells['B' + (2 + k)] = vals[k]; });
      var o = numOpts(r, vals[i], vals.filter(function (_, k) { return k !== i; }), String);
      return xl('A2:A6 berisi buah: ' + names.join(', ') + '; B2:B6 berisi stok: ' + vals.join(', ') + '. Berapa hasil ' + f + '?', o, 'MATCH mencari "' + names[i] + '" → posisi ' + (i + 1) + '; INDEX mengambil isi sel ke-' + (i + 1) + ' dari B2:B6: ' + vals[i] + '.', 'INDEX-MATCH', { k: 'excel', cells: cells, formula: f, answer: String(vals[i]) }); },
    function (r) { var base = pick(r, ['=B2*$E$1', '=B2*E$1', '=$B2*E1', '=B2/$D$1', '=$B2+C$1']), mv = pick(r, [[2, 0], [0, 1], [3, 1], [1, 2]]), c = adjustRef(base, mv[0], mv[1]);
      var allRel = adjustRef(base.replace(/\$/g, ''), mv[0], mv[1]), allAbs = base, rowOnly = adjustRef(base.replace(/\$/g, ''), mv[0], 0), colOnly = adjustRef(base.replace(/\$/g, ''), 0, mv[1]);
      var o = strOpts(r, c, [allRel, allAbs, rowOnly, colOnly]); if (!o) return null;
      var dest = COLS.charAt(2 + mv[1]) + (2 + mv[0]);
      return xl('Rumus di C2: ' + base + '. Jika disalin ke ' + dest + ', rumus berubah menjadi…', o, 'Tanda $ mengunci kolom/baris; referensi tanpa $ bergeser mengikuti arah salin (' + mv[0] + ' baris, ' + mv[1] + ' kolom). Hasil: ' + c + '.', 'Referensi sel', { k: 'excelref', formula: base, dr: mv[0], dc: mv[1], answer: c }); },
    function (r) { var cats = ['A', 'B', 'C'], a = ints(r, 6, 10, 80), ks = []; for (var i = 0; i < 6; i++) ks.push(pick(r, cats)); var key = pick(r, cats), isSum = r() < 0.5;
      var f = isSum ? '=SUMIF(A1:A6,"' + key + '",B1:B6)' : '=COUNTIF(A1:A6,"' + key + '")', c = 0; ks.forEach(function (k, i) { if (k === key) c += isSum ? a[i] : 1; });
      var o = numOpts(r, c, isSum ? [c + a[0], Math.max(0, c - 10), a.reduce(function (x, y) { return x + y; }, 0)] : [c + 1, Math.max(0, c - 1), 6], String); if (c === 0) return null;
      var cells = {}; ks.forEach(function (k, i) { cells['A' + (1 + i)] = k; cells['B' + (1 + i)] = a[i]; });
      return xl('A1:A6 berisi kategori: ' + ks.join(', ') + '; B1:B6 berisi nilai: ' + a.join(', ') + '. Berapa hasil ' + f + '?', o, (isSum ? 'SUMIF menjumlahkan nilai B yang kategorinya "' + key + '"' : 'COUNTIF menghitung banyaknya sel bernilai "' + key + '"') + ' = ' + c + '.', isSum ? 'SUMIF' : 'COUNTIF', { k: 'excel', cells: cells, formula: f, answer: String(c) }); }
  ];

  /* ---------- SQL: generator (dicocokkan ke SQLite asli — sql.js — di tes) ---------- */
  var KATS = ['Alat', 'Buku', 'Cat', 'Dus'], WILS = ['Jawa', 'Bali', 'Riau'], NAMA = ['Ani', 'Budi', 'Cici', 'Dedi'];
  function jualRows(r, n) { var rows = []; for (var i = 0; i < n; i++) rows.push([pick(r, KATS.slice(0, 3)), pick(r, WILS), int(r, 1, 9) * 10]); return rows; }
  function jualTxt(rows) { return 'jual(kat, wil, jml): ' + rows.map(function (x) { return '(' + x[0] + ', ' + x[1] + ', ' + x[2] + ')'; }).join(' '); }
  function jualSetup(rows) { return ['CREATE TABLE jual(kat TEXT, wil TEXT, jml INTEGER)'].concat(rows.map(function (x) { return "INSERT INTO jual VALUES ('" + x[0] + "','" + x[1] + "'," + x[2] + ')'; })); }
  function sq(q, opts, e, t, setup, sql, ans) { return { q: q, o: opts.o, a: opts.a, e: e, t: t, v: { k: 'sql', setup: setup, sql: sql, answer: String(ans) } }; }
  GEN.sqlpq = [
    function (r) { var rows = jualRows(r, 6), kat = pick(r, KATS.slice(0, 3)), th = pick(r, [20, 30, 40, 50]), sql = "SELECT COUNT(*) FROM jual WHERE kat = '" + kat + "' AND jml > " + th, c = rows.filter(function (x) { return x[0] === kat && x[2] > th; }).length;
      var o = numOpts(r, c, [c + 1, c + 2, Math.max(0, c - 1), rows.filter(function (x) { return x[0] === kat; }).length], String);
      return sq('Tabel ' + jualTxt(rows) + '. Hasil query: ' + sql + ' ?', o, 'WHERE menyaring baris kat=' + kat + ' dan jml>' + th + ', COUNT(*) menghitung baris lolos = ' + c + '.', 'SELECT & COUNT', jualSetup(rows), sql, c); },
    function (r) { var rows = jualRows(r, 6), wil = pick(r, WILS), sql = "SELECT SUM(jml) FROM jual WHERE wil = '" + wil + "'", c = rows.filter(function (x) { return x[1] === wil; }).reduce(function (a, x) { return a + x[2]; }, 0); if (c === 0) return null;
      var o = numOpts(r, c, [c + 10, c - 10, rows.reduce(function (a, x) { return a + x[2]; }, 0), c + 20], String);
      return sq('Tabel ' + jualTxt(rows) + '. Hasil query: ' + sql + ' ?', o, 'Hanya baris wil=' + wil + ' yang dijumlahkan: ' + c + '.', 'SUM & WHERE', jualSetup(rows), sql, c); },
    function (r) { var rows = jualRows(r, 6), tot = rows.reduce(function (a, x) { return a + x[2]; }, 0), adj = (6 - tot / 10 % 6) % 6; rows[5][2] += adj * 10; if (rows[5][2] > 150) return null; tot += adj * 10; var c = tot / 6, sql = 'SELECT AVG(jml) FROM jual';
      var o = numOpts(r, c, [c + 10, c - 10, tot, c + 5], String);
      return sq('Tabel ' + jualTxt(rows) + '. Hasil query: ' + sql + ' ?', o, 'AVG = jumlah ÷ banyak baris = ' + tot + ' ÷ 6 = ' + c + '.', 'AVG', jualSetup(rows), sql, c); },
    function (r) { var rows = jualRows(r, 6), th = pick(r, [40, 60, 80, 100]), sums = {}; rows.forEach(function (x) { sums[x[0]] = (sums[x[0]] || 0) + x[2]; });
      var c = Object.keys(sums).filter(function (k) { return sums[k] > th; }).length, sql = 'SELECT COUNT(*) FROM (SELECT kat FROM jual GROUP BY kat HAVING SUM(jml) > ' + th + ')';
      var o = numOpts(r, c, [c + 1, c + 2, Math.max(0, c - 1), Object.keys(sums).length], String);
      return sq('Tabel ' + jualTxt(rows) + '. Hasil query: ' + sql + ' ?', o, 'GROUP BY membentuk grup per kat, HAVING menyaring GRUP yang totalnya > ' + th + '. Jumlah grup lolos = ' + c + '.', 'GROUP BY & HAVING', jualSetup(rows), sql, c); },
    function (r) { var rows = jualRows(r, 6), sums = {}; rows.forEach(function (x) { sums[x[0]] = (sums[x[0]] || 0) + x[2]; });
      var ks = Object.keys(sums).sort(function (a, b) { return sums[b] - sums[a]; }); if (ks.length < 2 || sums[ks[0]] === sums[ks[1]]) return null;
      var sql = 'SELECT kat FROM jual GROUP BY kat ORDER BY SUM(jml) DESC LIMIT 1', o = strOpts(r, ks[0], KATS.filter(function (k) { return k !== ks[0]; })); if (!o) return null;
      return sq('Tabel ' + jualTxt(rows) + '. Hasil query: ' + sql + ' ?', o, 'Total per kat: ' + ks.map(function (k) { return k + '=' + sums[k]; }).join(', ') + '. ORDER BY ... DESC LIMIT 1 mengambil yang terbesar: ' + ks[0] + '.', 'ORDER BY & LIMIT', jualSetup(rows), sql, ks[0]); },
    function (r) { var rows = jualRows(r, 6), th = pick(r, [20, 30, 40]), sql = 'SELECT COUNT(DISTINCT wil) FROM jual WHERE jml >= ' + th, c = new Set(rows.filter(function (x) { return x[2] >= th; }).map(function (x) { return x[1]; })).size; if (c === 0) return null;
      var o = numOpts(r, c, [c + 1, c + 2, rows.filter(function (x) { return x[2] >= th; }).length, 0], String);
      return sq('Tabel ' + jualTxt(rows) + '. Hasil query: ' + sql + ' ?', o, 'DISTINCT menghitung nilai wil yang berbeda di antara baris dengan jml>=' + th + ': ' + c + '.', 'DISTINCT', jualSetup(rows), sql, c); },
    function (r) { var pids = []; for (var i = 0; i < 6; i++) pids.push(int(r, 1, 5)); var left = r() < 0.5, nm = NAMA.slice(0, 4);
      var cnt = {}; pids.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
      var c = left ? nm.reduce(function (a, _, i) { return a + Math.max(1, cnt[i + 1] || 0); }, 0) : pids.filter(function (x) { return x <= 4; }).length;
      var sql = left ? 'SELECT COUNT(*) FROM p LEFT JOIN o ON o.pid = p.id' : 'SELECT COUNT(*) FROM o JOIN p ON o.pid = p.id';
      var setup = ['CREATE TABLE p(id INTEGER, nama TEXT)', 'CREATE TABLE o(id INTEGER, pid INTEGER)'].concat(nm.map(function (n, i) { return "INSERT INTO p VALUES (" + (i + 1) + ",'" + n + "')"; })).concat(pids.map(function (x, i) { return 'INSERT INTO o VALUES (' + (i + 1) + ',' + x + ')'; }));
      var o = numOpts(r, c, [c + 1, c - 1, 6, 4], String);
      return sq('Tabel p(id): 1..4 (Ani, Budi, Cici, Dedi). Tabel o(pid, berurutan): ' + pids.join(', ') + ' (pid 5 tidak ada di p). Hasil: ' + sql + ' ?', o, left ? 'LEFT JOIN menjaga SEMUA baris p; p tanpa pesanan tetap muncul 1 kali (NULL di sisi o).' : 'JOIN (INNER) hanya baris o yang pid-nya ada di p; pid 5 tidak cocok sehingga dibuang.', left ? 'LEFT JOIN' : 'INNER JOIN', setup, sql, c); },
    function (r) { var vals = []; for (var i = 0; i < 5; i++) vals.push(r() < 0.4 ? null : int(r, 1, 9) * 10); var c = vals.filter(function (x) { return x !== null; }).length; if (c === 5 || c === 0) return null;
      var star = r() < 0.5, sql = star ? 'SELECT COUNT(*) FROM n' : 'SELECT COUNT(v) FROM n', ans = star ? 5 : c;
      var setup = ['CREATE TABLE n(v INTEGER)'].concat(vals.map(function (x) { return 'INSERT INTO n VALUES (' + (x === null ? 'NULL' : x) + ')'; }));
      var o = numOpts(r, ans, [5, c, ans + 1, Math.max(0, ans - 1)], String);
      return sq('Tabel n(v) berisi: ' + vals.map(function (x) { return x === null ? 'NULL' : x; }).join(', ') + '. Hasil query: ' + sql + ' ?', o, star ? 'COUNT(*) menghitung SEMUA baris, termasuk yang berisi NULL = 5.' : 'COUNT(v) hanya menghitung nilai yang BUKAN NULL = ' + c + '.', 'NULL', setup, sql, ans); }
  ];

  var EXCEL_STATIC = [
    S('Pintasan keyboard di Excel (Windows) untuk beralih antara referensi relatif dan absolut ($) saat mengetik rumus adalah…', ['F4', 'F2', 'Ctrl+D', 'F9'], 'F4 memutar jenis referensi: A1 → $A$1 → A$1 → $A1.', 'Referensi sel'),
    S('Galat #DIV/0! muncul karena…', ['Pembagian dengan nol atau sel kosong', 'Nama fungsi salah ketik', 'Referensi sel terhapus', 'Nilai tidak ditemukan oleh VLOOKUP'], 'Pembagi bernilai nol atau kosong menyebabkan #DIV/0!.', 'Kode galat'),
    S('Galat #N/A pada VLOOKUP pencocokan persis umumnya berarti…', ['Nilai yang dicari tidak ditemukan di kolom pertama tabel', 'Pembagian dengan nol', 'Ada referensi melingkar', 'Rumus ditulis tanpa tanda sama dengan'], '#N/A = nilai yang dicari tidak tersedia.', 'Kode galat'),
    S('Galat #REF! muncul ketika…', ['Rumus merujuk sel yang sudah dihapus atau tidak valid', 'Rumus membagi dengan nol', 'Tipe data teks dijumlahkan', 'Kolom terlalu sempit'], 'Menghapus sel/kolom yang dirujuk membuat referensi rusak (#REF!).', 'Kode galat'),
    S('Galat #NAME? biasanya disebabkan oleh…', ['Nama fungsi atau nama rentang tidak dikenali (mis. salah ketik)', 'Pembagian dengan nol', 'Sel yang dirujuk dihapus', 'Hasil terlalu panjang'], 'Contoh: =SUMM(A1:A5) menghasilkan #NAME? karena SUMM bukan fungsi.', 'Kode galat'),
    S('Argumen ke-4 FALSE pada VLOOKUP berarti…', ['Pencarian harus cocok persis', 'Hasil dibalik', 'Pencarian dari bawah ke atas', 'Hasil dibulatkan'], 'FALSE (0) = exact match; TRUE (1) = perkiraan terdekat pada data terurut.', 'VLOOKUP'),
    S('Keterbatasan VLOOKUP dibanding XLOOKUP adalah VLOOKUP…', ['Hanya mencari di kolom paling kiri tabel', 'Tidak bisa mengambil angka', 'Hanya bekerja di satu lembar kerja', 'Tidak bisa dipakai bersama IF'], 'VLOOKUP selalu mencari di kolom pertama rentang; XLOOKUP bisa mencari ke arah mana saja.', 'VLOOKUP'),
    S('Perbedaan SUMIFS dengan SUMIF adalah SUMIFS…', ['Dapat memakai lebih dari satu kriteria', 'Hanya untuk teks', 'Menjumlahkan seluruh lembar kerja', 'Mengabaikan semua kriteria'], 'SUMIFS menerima beberapa pasangan rentang-kriteria sekaligus.', 'Fungsi bersyarat'),
    S('COUNTA berbeda dari COUNT karena COUNTA menghitung…', ['Semua sel yang tidak kosong (angka maupun teks)', 'Hanya sel berisi angka', 'Hanya sel kosong', 'Hanya sel berisi rumus'], 'COUNT hanya angka; COUNTA semua sel terisi.', 'Fungsi hitung'),
    S('Fungsi utama PivotTable adalah…', ['Meringkas dan mengelompokkan data tanpa menulis banyak rumus', 'Mengubah format huruf', 'Mengunci sel agar tak bisa diedit', 'Menggabungkan beberapa file'], 'PivotTable merangkum data dengan menarik kolom ke baris, kolom, nilai, dan filter.', 'Pivot'),
    S('Setelah data sumber PivotTable berubah, agar PivotTable ikut diperbarui perlu…', ['Refresh PivotTable', 'Menutup Excel', 'Menyalin ulang rumus', 'Mengunci lembar kerja'], 'PivotTable tidak otomatis ikut berubah; gunakan Refresh (Data → Refresh All).', 'Pivot'),
    S('Pintasan untuk mengaktifkan/menonaktifkan filter pada data (Windows) adalah…', ['Ctrl+Shift+L', 'Ctrl+Alt+F', 'Ctrl+Q', 'Shift+F9'], 'Ctrl+Shift+L menyalakan atau mematikan AutoFilter.', 'Produktivitas'),
    S('Mengubah rentang data menjadi Tabel Excel (Ctrl+T) memberi keuntungan…', ['Rumus dan rentang otomatis mengikuti saat baris ditambah', 'Data otomatis terenkripsi', 'Semua rumus berhenti dihitung', 'Ukuran file pasti mengecil'], 'Tabel memperluas rentang secara otomatis dan mendukung referensi terstruktur.', 'Tabel'),
    S('Freeze Panes dipakai untuk…', ['Mempertahankan baris/kolom judul tetap terlihat saat menggulir', 'Mengunci rumus agar tak dapat diubah', 'Menyembunyikan lembar kerja', 'Menghapus baris kosong'], 'Judul tetap tampak sehingga data panjang mudah dibaca.', 'Tampilan'),
    S('Data Validation (daftar pilihan) berguna untuk…', ['Membatasi isian sel hanya pada nilai yang diizinkan', 'Mempercepat penghitungan rumus', 'Mencetak banyak salinan', 'Mengurutkan data otomatis'], 'Misalnya dropdown hanya berisi "Lulus" dan "Remedial".', 'Kualitas data'),
    S('Conditional Formatting dipakai untuk…', ['Mengubah tampilan sel secara otomatis berdasarkan aturan nilai', 'Mengubah nilai sel permanen', 'Menghapus data duplikat', 'Menggabungkan sel'], 'Format (warna, ikon) berubah sesuai kondisi, nilai sel tetap.', 'Format'),
    S('Rumus =A1&B1 menghasilkan…', ['Gabungan teks isi A1 dan B1', 'Penjumlahan A1 dan B1', 'Perkalian A1 dan B1', 'Perbandingan A1 dan B1'], 'Operator & menyambung teks (concatenate).', 'Teks'),
    S('IFERROR(rumus, "-") berguna untuk…', ['Menampilkan "-" bila rumus menghasilkan galat', 'Mencari galat dan memperbaikinya otomatis', 'Menghapus rumus', 'Mengunci sel'], 'Jika argumen pertama galat, IFERROR mengembalikan nilai alternatif.', 'Penanganan galat'),
    S('Fitur Remove Duplicates pada Excel akan…', ['Menyisakan kemunculan pertama dari tiap baris duplikat', 'Menyisakan kemunculan terakhir', 'Menghapus semua baris tanpa kecuali', 'Mengurutkan data menurun'], 'Baris pertama dipertahankan, baris berikutnya yang sama dihapus.', 'Kualitas data'),
    S('Pada XLOOKUP, jika argumen mode pencocokan tidak diisi, pencarian bersifat…', ['Cocok persis (exact match)', 'Perkiraan terdekat', 'Selalu terbesar', 'Acak'], 'Default XLOOKUP adalah exact match.', 'XLOOKUP'),
    S('Mengubah format sel menjadi "Currency/Rupiah" akan…', ['Hanya mengubah tampilan, nilai sebenarnya tetap', 'Mengubah nilai sel jadi teks', 'Membulatkan nilai permanen', 'Mengunci sel'], 'Format memengaruhi tampilan; nilai aslinya tetap dipakai oleh rumus.', 'Format'),
    S('Rumus =SUM(A1:A5) terhadap sel berisi teks di dalam rentang akan…', ['Mengabaikan sel teks tersebut', 'Menghasilkan #VALUE! selalu', 'Menganggap teks bernilai 1', 'Menghapus teks itu'], 'SUM hanya menjumlahkan angka pada rentang; teks pada rentang diabaikan.', 'Fungsi dasar'),
    S('Manfaat memberi nama pada rentang (Named Range) adalah…', ['Rumus lebih mudah dibaca, mis. =SUM(Penjualan)', 'File menjadi lebih kecil', 'Rumus lebih cepat 10 kali', 'Sel otomatis terkunci'], 'Nama bermakna membuat rumus lebih jelas dan mudah dipelihara.', 'Produktivitas'),
    S('Text to Columns dipakai untuk…', ['Memecah isi satu kolom menjadi beberapa kolom berdasarkan pemisah', 'Menggabungkan kolom', 'Mengubah angka jadi huruf', 'Mengunci kolom'], 'Mis. memecah "Budi;Jakarta" menjadi dua kolom dengan pemisah titik koma.', 'Data'),
    S('Referensi $A$1 saat rumus disalin ke sel lain akan…', ['Tetap menunjuk A1', 'Bergeser ke sel yang sama arah salin', 'Berubah jadi #REF!', 'Berubah jadi teks'], 'Tanda $ pada kolom dan baris mengunci referensi.', 'Referensi sel')
  ];
  var SQLPQ_STATIC = [
    S('Perbedaan WHERE dan HAVING adalah…', ['WHERE menyaring baris sebelum pengelompokan; HAVING menyaring grup setelah agregasi', 'WHERE untuk grup; HAVING untuk baris', 'Keduanya sama persis', 'HAVING hanya untuk teks'], 'WHERE bekerja pada baris; HAVING pada hasil agregat per grup.', 'SQL dasar'),
    S('INNER JOIN menghasilkan…', ['Hanya baris yang cocok di kedua tabel', 'Semua baris tabel kiri', 'Semua baris kedua tabel', 'Hanya baris tak cocok'], 'Baris tanpa pasangan di salah satu tabel tidak ikut.', 'JOIN'),
    S('LEFT JOIN menghasilkan…', ['Semua baris tabel kiri, dengan NULL bila tak ada pasangan di kanan', 'Hanya baris cocok', 'Semua baris tabel kanan', 'Hanya baris tak cocok'], 'Tabel kiri selalu lengkap; sisi kanan NULL jika tak cocok.', 'JOIN'),
    S('PRIMARY KEY pada sebuah tabel bersifat…', ['Unik dan tidak boleh NULL', 'Boleh duplikat', 'Boleh NULL', 'Hanya untuk teks'], 'Kunci utama mengidentifikasi baris secara unik.', 'Desain tabel'),
    S('COUNT(*) berbeda dari COUNT(kolom) karena COUNT(kolom)…', ['Tidak menghitung baris yang kolomnya NULL', 'Menghitung dua kali', 'Hanya menghitung teks', 'Mengabaikan WHERE'], 'COUNT(*) menghitung semua baris; COUNT(kolom) hanya nilai non-NULL.', 'Agregasi'),
    S('Untuk mencari baris yang kolomnya kosong (NULL) harus memakai…', ['kolom IS NULL', 'kolom = NULL', 'kolom == NULL', 'kolom LIKE NULL'], 'Perbandingan dengan NULL memakai = tidak pernah benar; gunakan IS NULL.', 'NULL'),
    S('Perbedaan UNION dan UNION ALL adalah UNION…', ['Menghapus baris duplikat, UNION ALL mempertahankannya', 'Hanya untuk angka', 'Lebih cepat selalu', 'Menggabungkan kolom, bukan baris'], 'UNION ALL tidak melakukan deduplikasi.', 'Set operasi'),
    S('ORDER BY tanpa kata ASC/DESC mengurutkan secara…', ['Naik (ascending)', 'Turun (descending)', 'Acak', 'Sesuai abjad terbalik'], 'Default ORDER BY adalah ASC.', 'SQL dasar'),
    S('SELECT DISTINCT berfungsi untuk…', ['Menghilangkan baris duplikat pada hasil', 'Mengurutkan hasil', 'Mengunci tabel', 'Menghitung baris'], 'DISTINCT mengembalikan baris unik saja.', 'SQL dasar'),
    S('Operator BETWEEN 10 AND 20 pada SQL bersifat…', ['Inklusif: 10 dan 20 ikut termasuk', 'Eksklusif kedua ujung', 'Hanya 10 yang termasuk', 'Hanya 20 yang termasuk'], 'BETWEEN a AND b setara dengan >= a AND <= b.', 'SQL dasar'),
    S("Pola LIKE 'A%' cocok dengan nilai yang…", ['Diawali huruf A', 'Diakhiri huruf A', 'Mengandung A di tengah saja', 'Persis berisi A'], '% mewakili nol atau lebih karakter apa pun.', 'SQL dasar'),
    S('DELETE FROM tabel; (tanpa WHERE) akan…', ['Menghapus semua baris tetapi struktur tabel tetap ada', 'Menghapus tabel beserta strukturnya', 'Tidak melakukan apa-apa', 'Menghapus satu baris pertama'], 'DROP TABLE-lah yang menghapus tabelnya.', 'DML'),
    S('COALESCE(a, b, c) mengembalikan…', ['Nilai pertama yang bukan NULL', 'Nilai terbesar', 'Gabungan teks a, b, c', 'Selalu a'], 'Berguna untuk mengganti NULL dengan nilai cadangan.', 'NULL'),
    S('Urutan eksekusi logis query yang BENAR adalah…', ['FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY', 'SELECT → FROM → WHERE → GROUP BY', 'WHERE → FROM → SELECT → HAVING', 'ORDER BY → SELECT → FROM'], 'Karena itu alias di SELECT belum dikenal di WHERE.', 'SQL dasar'),
    S('Operator IN (1, 2, 3) bernilai benar bila nilai kolom…', ['Sama dengan salah satu dari daftar', 'Sama dengan semua daftar', 'Lebih besar dari daftar', 'Tidak ada dalam daftar'], 'IN setara dengan beberapa OR kesetaraan.', 'SQL dasar'),
    S('FOREIGN KEY berfungsi untuk…', ['Menjaga relasi: nilai harus ada sebagai kunci di tabel induk', 'Mengurutkan tabel', 'Mempercepat semua query', 'Menghapus duplikat'], 'Menjaga integritas referensial antartabel.', 'Desain tabel'),
    S('Query Power Query disimpan sebagai…', ['Daftar langkah (Applied Steps) yang diputar ulang saat Refresh', 'Hasil tetap yang tak bisa diperbarui', 'Makro VBA', 'Rumus sel biasa'], 'Setiap transformasi tercatat sebagai langkah dalam bahasa M.', 'Power Query'),
    S('Merge Queries di Power Query setara dengan…', ['JOIN pada SQL (menggabungkan kolom berdasarkan kunci)', 'UNION ALL (menumpuk baris)', 'GROUP BY', 'ORDER BY'], 'Merge mencocokkan baris berdasarkan kolom kunci.', 'Power Query'),
    S('Append Queries di Power Query setara dengan…', ['UNION ALL (menumpuk baris dari beberapa tabel)', 'INNER JOIN', 'LEFT JOIN', 'HAVING'], 'Append menambahkan baris tabel kedua di bawah tabel pertama.', 'Power Query'),
    S('Unpivot Columns di Power Query dipakai untuk…', ['Mengubah kolom (mis. Jan, Feb, Mar) menjadi baris atribut–nilai', 'Mengubah baris menjadi kolom', 'Menghapus kolom kosong', 'Mengurutkan kolom'], 'Membuat format tabel panjang yang siap dianalisis.', 'Power Query'),
    S('Bahasa rumus Power Query (M) bersifat…', ['Peka huruf besar/kecil (case-sensitive)', 'Tidak peka huruf besar/kecil', 'Sama dengan rumus sel Excel', 'Sama dengan SQL'], 'Contoh: Table.SelectRows benar, table.selectrows galat.', 'Power Query'),
    S('Remove Duplicates pada Power Query mempertahankan…', ['Baris pertama dari tiap kelompok duplikat', 'Baris terakhir', 'Tidak ada satu pun', 'Baris dengan nilai terbesar'], 'Baris duplikat berikutnya dibuang.', 'Power Query'),
    S('Fill Down pada Power Query dipakai untuk…', ['Mengisi sel kosong (null) dengan nilai terakhir di atasnya', 'Menghapus baris kosong', 'Mengurutkan turun', 'Menyalin kolom ke bawah tabel lain'], 'Berguna untuk data berkelompok yang hanya menulis label sekali.', 'Power Query'),
    S('Langkah "Changed Type" yang benar penting karena…', ['Perhitungan dan pengurutan bergantung pada tipe data yang tepat', 'Hanya mengubah warna kolom', 'Mempercepat internet', 'Menghapus galat otomatis'], 'Angka bertipe teks, misalnya, akan terurut dan terhitung secara salah.', 'Power Query'),
    S('Menu Group By pada Power Query serupa dengan…', ['GROUP BY pada SQL beserta fungsi agregat', 'WHERE', 'ORDER BY', 'LIMIT'], 'Mengelompokkan baris dan menghitung agregat per kelompok.', 'Power Query'),
    S('"Close & Load" pada Power Query berfungsi untuk…', ['Memuat hasil query ke lembar kerja atau Data Model', 'Menutup Excel tanpa menyimpan', 'Menghapus query', 'Mengekspor ke PDF'], 'Hasil transformasi dimuat agar bisa dianalisis atau dibuat PivotTable.', 'Power Query')
  ];

  function uniqTexts(list) { var s = {}; return list.filter(function (x) { var k = x.q.toLowerCase(); if (s[k]) return false; s[k] = 1; return true; }); }
  function finalize(r, item) { // acak posisi jawaban, jaga pembahasan
    var correct = item.o[item.a], opts = shuffle(r, item.o);
    return { q: item.q, o: opts, a: opts.indexOf(correct), e: item.e || '', t: item.t || '' };
  }
  var ALL_PARTS = ['pajak', 'akuntansi', 'excel', 'sqlpq'];
  function themeParts(theme) { return theme === 'campuran' ? ALL_PARTS.slice() : [ALL_PARTS.indexOf(theme) >= 0 ? theme : 'pajak']; }
  var STATIC_BY = { akuntansi: ACC_STATIC, excel: EXCEL_STATIC, sqlpq: SQLPQ_STATIC };
  function staticPool(theme, sources) {
    var pool = [];
    themeParts(theme).forEach(function (p) {
      if (p === 'pajak') pool = pool.concat((sources && sources.pajak) || []);
      else pool = pool.concat(STATIC_BY[p].map(function (x) { return Object.assign({}, x); }));
    });
    return pool;
  }
  function generated(theme, r, n, avoid, keepMeta) {
    var gens = []; themeParts(theme).forEach(function (p) { gens = gens.concat(GEN[p]); });
    var out = [], seen = Object.assign({}, avoid || {}), tries = 0, k = Math.floor(r() * gens.length);
    while (out.length < n && tries++ < n * 40) {
      var it; try { it = gens[k % gens.length](r); } catch (e) { it = null; } k++;
      if (!it || validateQuestion(it).length) continue;
      var key = it.q.toLowerCase(); if (seen[key]) continue; seen[key] = 1; it.g = 1; if (!keepMeta) delete it.v; out.push(it);
    }
    return out;
  }
  /* buildQuiz: campur soal statis (≈40%) + generator berangka; hasil dijamin valid & tanpa soal kembar. */
  function buildQuiz(opts) {
    var theme = THEMES.some(function (t) { return t.id === opts.theme; }) ? opts.theme : 'pajak';
    var count = Math.max(1, Math.min(LIM.maxQ, Math.round(opts.count || 20)));
    var r = rng(opts.seed == null ? Date.now() : opts.seed);
    var st = shuffle(r, uniqTexts(staticPool(theme, opts.sources))).slice(0, Math.round(count * 0.4)).map(function (x) { return finalize(r, x); });
    var seen = {}; st.forEach(function (x) { seen[x.q.toLowerCase()] = 1; });
    var gen = generated(theme, r, count - st.length, seen, opts.verify);
    var all = st.concat(gen);
    if (all.length < count) { // generator habis variasi → isi dari sisa statis
      var more = shuffle(r, uniqTexts(staticPool(theme, opts.sources))).filter(function (x) { return !seen[x.q.toLowerCase()] && !gen.some(function (g) { return g.q === x.q; }); });
      more.slice(0, count - all.length).forEach(function (x) { all.push(finalize(r, x)); });
    }
    return shuffle(r, all);
  }
  function regenerateOne(opts) { // soal pengganti baru yang belum ada di `existing`
    var r = rng(opts.seed == null ? Date.now() : opts.seed), avoid = {};
    (opts.existing || []).forEach(function (x) { avoid[String(x.q).toLowerCase()] = 1; });
    var g = generated(opts.theme, r, 1, avoid);
    if (g.length) return g[0];
    var pool = shuffle(r, uniqTexts(staticPool(opts.theme, opts.sources))).filter(function (x) { return !avoid[x.q.toLowerCase()]; });
    return pool.length ? finalize(r, pool[0]) : null;
  }

  /* ---------- skor & papan peringkat ---------- */
  var GRACE_MS = 1500; // toleransi jaringan
  function points(correct, elapsedMs, limitMs) {
    if (!correct || !(limitMs > 0) || !(elapsedMs >= 0) || elapsedMs > limitMs + GRACE_MS) return 0;
    var frac = Math.max(0, 1 - Math.min(elapsedMs, limitMs) / limitMs);
    return Math.round(500 + 500 * frac);
  }
  // key {i:idx}, answers {i:{uid:{c,t}}}, starts {i:ts} → {uid:{total,correct,ms,pts:{i:p}}}
  function scoreAll(key, answers, starts, timerSec) {
    var out = {}, limit = clampTimer(timerSec) * 1000;
    Object.keys(answers || {}).forEach(function (i) {
      var st = Number(starts && starts[i]); if (!isFinite(st) || key == null || key[i] == null) return;
      var byUid = answers[i] || {};
      Object.keys(byUid).forEach(function (uid) {
        var a = byUid[uid]; if (!a || !Number.isInteger(a.c)) return;
        var el = Number(a.t) - st, ok = a.c === Number(key[i]), p = points(ok, el, limit);
        var s = out[uid] || (out[uid] = { total: 0, correct: 0, ms: 0 });
        s.total += p; if (p > 0) { s.correct++; s.ms += Math.max(0, Math.min(el, limit)); }
      });
    });
    return out;
  }
  function leaderboard(scores, players) {
    var rows = Object.keys(players || {}).map(function (uid) { var s = (scores && scores[uid]) || {}; return { uid: uid, name: (players[uid] && players[uid].name) || '?', total: s.total || 0, correct: s.correct || 0, ms: s.ms || 0 }; });
    rows.sort(function (a, b) { return b.total - a.total || a.ms - b.ms || a.name.localeCompare(b.name); });
    rows.forEach(function (x, i) { x.rank = i + 1; });
    return rows;
  }

  root.LiveQuiz = { ALPHABET: ALPHABET, LIM: LIM, THEMES: THEMES, rng: rng, makeCode: makeCode, normCode: normCode, validCode: validCode, clampTimer: clampTimer, cleanName: cleanName, rp: rp, pph17: pph17,
    validateQuestion: validateQuestion, sanitizeQuestion: sanitizeQuestion, validateQuiz: validateQuiz, fromModulPajak: fromModulPajak, fromTaxCareer: fromTaxCareer,
    buildQuiz: buildQuiz, regenerateOne: regenerateOne, points: points, scoreAll: scoreAll, leaderboard: leaderboard, GRACE_MS: GRACE_MS, GENERATORS: GEN, STATIC: STATIC_BY };
})(typeof window !== 'undefined' ? window : globalThis);
