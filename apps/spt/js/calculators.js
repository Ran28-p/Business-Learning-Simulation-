  /* Simulasi TER + Analisis THR — INLINE (tidak perlu folder apps/spt/js/) */
  function initCalcTabs() {
    document.querySelectorAll('.calc-tab').forEach(function(tab) {
      if (tab.__bound) return;
      tab.__bound = true;
      tab.addEventListener('click', function() {
        var id = tab.getAttribute('data-calc');
        document.querySelectorAll('.calc-tab').forEach(function(t) { t.classList.toggle('active', t === tab); });
        document.querySelectorAll('[data-calc-panel]').forEach(function(p) {
          var show = p.getAttribute('data-calc-panel') === id;
          p.hidden = !show;
          p.classList.toggle('active', show);
        });
      });
    });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function fmt(n) {
    return (typeof TaxEngine !== 'undefined' && TaxEngine.fmt) ? TaxEngine.fmt(n) : String(Math.round(n||0));
  }
  function pct(x) { return (Number(x) * 100).toFixed(2) + '%'; }
  function layerRange(res) {
    var min = res.layerMin != null ? 'Rp ' + fmt(res.layerMin) : '—';
    var max = res.layerMax != null ? 'Rp ' + fmt(res.layerMax) : 'ke atas';
    return min + ' – ' + max;
  }
  function runSimulasiTER() {
    if (typeof TaxEngine === 'undefined') return;
    var ptkp = document.getElementById('ter-ptkp').value;
    var b0 = Number(document.getElementById('ter-bruto0').value) || 0;
    var b1 = Number(document.getElementById('ter-bruto1').value) || 0;
    var r0 = TaxEngine.hitungTER(b0, ptkp);
    var r1 = TaxEngine.hitungTER(b1, ptkp);
    var dBruto = b1 - b0, dPph = r1.pph - r0.pph;
    var eff = dBruto !== 0 ? dPph / dBruto : 0;
    var th0 = b0 - r0.pph, th1 = b1 - r1.pph;
    var jumped = r0.layerIndex !== r1.layerIndex;
    var tetangga = TaxEngine.tetanggaLapisanTER(ptkp, b1, 2);
    var html = '<h5>Hasil simulasi TER — kategori ' + esc(r0.kategori) + '</h5>';
    html += '<div class="calc-formula">PPh 21 (TER) = Bruto bulanan × Tarif efektif lapisan</div>';
    if (jumped) {
      html += '<div class="layer-jump">⚠️ <strong>Pindah lapisan TER</strong> &nbsp;'
        + '<span class="layer-pill">Lap. ' + (r0.layerIndex + 1) + ' · ' + pct(r0.tarif) + '</span> → '
        + '<span class="layer-pill">Lap. ' + (r1.layerIndex + 1) + ' · ' + pct(r1.tarif) + '</span>'
        + '<br><span style="margin-top:6px;display:inline-block;">Tarif naik dari <strong>' + pct(r0.tarif) + '</strong> ke <strong>' + pct(r1.tarif) + '</strong>. Seluruh bruto bulan ini dikenai tarif baru.</span></div>';
    } else {
      html += '<div class="layer-jump same">✓ Tetap di lapisan yang sama (lap. ' + (r0.layerIndex + 1) + ' · ' + pct(r0.tarif) + ').</div>';
    }
    html += '<div class="impact-cards">';
    html += '<div class="impact-card neutral"><div class="lbl">PPh lama</div><div class="val">Rp ' + fmt(r0.pph) + '</div></div>';
    html += '<div class="impact-card neutral"><div class="lbl">PPh baru</div><div class="val">Rp ' + fmt(r1.pph) + '</div></div>';
    html += '<div class="impact-card ' + (dPph > 0 ? 'up' : dPph < 0 ? 'down' : 'neutral') + '"><div class="lbl">Δ PPh</div><div class="val">Rp ' + fmt(dPph) + '</div></div>';
    html += '<div class="impact-card ' + (eff > r0.tarif + 0.001 ? 'up' : 'neutral') + '"><div class="lbl">Pajak efektif atas Δ bruto</div><div class="val">' + (dBruto ? (eff * 100).toFixed(1) + '%' : '—') + '</div></div>';
    html += '<div class="impact-card down"><div class="lbl">Take-home lama</div><div class="val">Rp ' + fmt(th0) + '</div></div>';
    html += '<div class="impact-card ' + (th1 >= th0 ? 'down' : 'up') + '"><div class="lbl">Take-home baru</div><div class="val">Rp ' + fmt(th1) + '</div></div></div>';
    html += '<ul class="calc-steps">';
    html += '<li><span class="step-label">Bruto</span><span class="step-val">Rp ' + fmt(b0) + ' → Rp ' + fmt(b1) + '</span></li>';
    html += '<li><span class="step-label">Lapisan lama</span><span class="step-val">' + esc(layerRange(r0)) + ' @ ' + pct(r0.tarif) + '</span></li>';
    html += '<li><span class="step-label">Lapisan baru</span><span class="step-val">' + esc(layerRange(r1)) + ' @ ' + pct(r1.tarif) + '</span></li>';
    html += '<li><span class="step-label">Δ Take-home</span><span class="step-val">Rp ' + fmt(th1 - th0) + '</span></li></ul>';
    html += '<p style="font-weight:700;margin:12px 0 6px;">Lapisan TER sekitar bruto baru (' + esc(tetangga.kategori) + ')</p>';
    html += '<table class="bracket-table"><thead><tr><th>Lapisan</th><th>Bruto s.d.</th><th>Tarif</th></tr></thead><tbody>';
    tetangga.rows.forEach(function(row) {
      var batas = row.max == null || row.max === Infinity ? 'ke atas' : 'Rp ' + fmt(row.max);
      html += '<tr class="' + (row.active ? 'hl' : '') + '"><td>#' + (row.index + 1) + (row.active ? ' ← aktif' : '') + '</td><td class="num">' + batas + '</td><td class="num">' + pct(row.rate) + '</td></tr>';
    });
    html += '</tbody></table><div class="essay-answer"><h4>Inti dampak TER</h4><ul>';
    html += '<li>TER = tarif tunggal atas <strong>seluruh bruto bulan itu</strong>. Loncat lapisan → tarif baru berlaku ke seluruh gaji bulan tersebut.</li>';
    html += '<li>Berlaku Jan–Nov. Desember memakai progresif tahunan + koreksi selisih.</li></ul></div>';
    var el = document.getElementById('result-ter'); el.innerHTML = html; el.hidden = false;
  }
  function runAnalisisTHR() {
    if (typeof TaxEngine === 'undefined') return;
    var ptkp = document.getElementById('thr-ptkp').value;
    var gaji = Number(document.getElementById('thr-gaji').value) || 0;
    var thr = Number(document.getElementById('thr-nominal').value) || 0;
    var lain = Number(document.getElementById('thr-lain').value) || 0;
    var brutoNormal = gaji, brutoThr = gaji + thr + lain;
    var rN = TaxEngine.hitungTER(brutoNormal, ptkp);
    var rT = TaxEngine.hitungTER(brutoThr, ptkp);
    var jumped = rN.layerIndex !== rT.layerIndex;
    var pphAtasThr = rT.pph - rN.pph;
    var effThr = thr > 0 ? pphAtasThr / thr : 0;
    var thrNet = thr - pphAtasThr;
    var pphHipotetik = Math.round(thr * rN.tarif);
    var ekstra = pphAtasThr - pphHipotetik;
    var html = '<h5>Dampak THR pada PPh 21 bulan berjalan</h5>';
    html += '<div class="calc-formula">Bruto bulan THR = Gaji + THR + lain → × Tarif TER</div>';
    if (jumped) {
      html += '<div class="layer-jump">⚠️ THR membuat <strong>pindah lapisan TER</strong>: '
        + '<span class="layer-pill">' + pct(rN.tarif) + '</span> → <span class="layer-pill">' + pct(rT.tarif) + '</span>'
        + '<br><span style="margin-top:6px;display:inline-block;">Tarif baru dikenakan ke <strong>seluruh</strong> bruto (gaji + THR).</span></div>';
    } else {
      html += '<div class="layer-jump same">✓ Belum pindah lapisan. Tarif tetap ' + pct(rN.tarif) + '.</div>';
    }
    html += '<div class="impact-cards">';
    html += '<div class="impact-card neutral"><div class="lbl">PPh bulan biasa</div><div class="val">Rp ' + fmt(rN.pph) + '</div></div>';
    html += '<div class="impact-card neutral"><div class="lbl">PPh bulan THR</div><div class="val">Rp ' + fmt(rT.pph) + '</div></div>';
    html += '<div class="impact-card up"><div class="lbl">PPh tambahan</div><div class="val">Rp ' + fmt(pphAtasThr) + '</div></div>';
    html += '<div class="impact-card ' + (effThr > rN.tarif + 0.005 ? 'up' : 'neutral') + '"><div class="lbl">Tarif efektif atas THR</div><div class="val">' + (thr ? (effThr*100).toFixed(1) + '%' : '—') + '</div></div>';
    html += '<div class="impact-card down"><div class="lbl">THR neto</div><div class="val">Rp ' + fmt(thrNet) + '</div></div>';
    html += '<div class="impact-card neutral"><div class="lbl">Tarif TER bulan THR</div><div class="val">' + pct(rT.tarif) + '</div></div></div>';
    html += '<ul class="calc-steps">';
    html += '<li><span class="step-label">Gaji / THR / Bruto bulan THR</span><span class="step-val">Rp ' + fmt(gaji) + ' / Rp ' + fmt(thr) + ' / Rp ' + fmt(brutoThr) + '</span></li>';
    html += '<li><span class="step-label">Lapisan biasa → THR</span><span class="step-val">#' + (rN.layerIndex+1) + ' (' + pct(rN.tarif) + ') → #' + (rT.layerIndex+1) + ' (' + pct(rT.tarif) + ')</span></li>';
    if (jumped) {
      html += '<li><span class="step-label">PPh tambahan jika tarif tetap</span><span class="step-val">Rp ' + fmt(pphHipotetik) + '</span></li>';
      html += '<li><span class="step-label">Ekstra karena loncatan lapisan</span><span class="step-val">Rp ' + fmt(ekstra) + '</span></li>';
    }
    html += '</ul><table class="bracket-table"><thead><tr><th>Komponen</th><th class="num">Bulan biasa</th><th class="num">Bulan THR</th></tr></thead><tbody>';
    html += '<tr><td>Bruto</td><td class="num">Rp ' + fmt(brutoNormal) + '</td><td class="num">Rp ' + fmt(brutoThr) + '</td></tr>';
    html += '<tr><td>Tarif TER</td><td class="num">' + pct(rN.tarif) + '</td><td class="num">' + pct(rT.tarif) + '</td></tr>';
    html += '<tr class="hl"><td>PPh 21</td><td class="num">Rp ' + fmt(rN.pph) + '</td><td class="num">Rp ' + fmt(rT.pph) + '</td></tr>';
    html += '<tr><td>Take-home</td><td class="num">Rp ' + fmt(brutoNormal - rN.pph) + '</td><td class="num">Rp ' + fmt(brutoThr - rT.pph) + '</td></tr></tbody></table>';
    html += '<div class="essay-answer"><h4>Mengapa THR sering lebih dipotong?</h4><ul>';
    html += '<li>THR masuk bruto bulan dibayarkan; TER memakai total bruto bulan itu.</li>';
    html += '<li>THR ≈ 1× gaji mudah mendorong ke lapisan tarif lebih tinggi.</li>';
    if (jumped) html += '<li>Ekstra vs tarif lama ≈ <strong>Rp ' + fmt(ekstra) + '</strong> karena tarif baru kena ke gaji+THR.</li>';
    html += '<li>Akhir tahun dihitung ulang dengan progresif Pasal 17.</li></ul></div>';
    var el = document.getElementById('result-thr'); el.innerHTML = html; el.hidden = false;
  }
  function runBandingTERvsProgresif() {
    if (typeof TaxEngine === 'undefined') return;
    var ptkp = document.getElementById('bd-ptkp').value;
    var bruto = Number(document.getElementById('bd-bruto').value) || 0;
    var thr = Number(document.getElementById('bd-thr').value) || 0;
    var rNormal = TaxEngine.hitungTER(bruto, ptkp);
    var rThr = TaxEngine.hitungTER(bruto + thr, ptkp);
    var pphTerSetahun = rNormal.pph * 11 + rThr.pph;
    var brutoTahun = bruto * 12 + thr;
    var biayaJabatan = Math.min(brutoTahun * 0.05, 6000000);
    var ptkpVal = TaxEngine.hitungPTKP(ptkp);
    var pkp = Math.max(0, brutoTahun - biayaJabatan - ptkpVal);
    var prog = TaxEngine.breakdownProgresif(pkp);
    var selisih = prog.total - pphTerSetahun;
    var html = '<h5>Akumulasi TER vs progresif tahunan (estimasi)</h5>';
    html += '<div class="calc-formula">Σ TER (11× biasa + 1× THR) vs progresif Pasal 17</div>';
    html += '<div class="impact-cards">';
    html += '<div class="impact-card neutral"><div class="lbl">Σ PPh via TER</div><div class="val">Rp ' + fmt(pphTerSetahun) + '</div></div>';
    html += '<div class="impact-card neutral"><div class="lbl">PPh progresif</div><div class="val">Rp ' + fmt(prog.total) + '</div></div>';
    html += '<div class="impact-card ' + (selisih > 0 ? 'up' : selisih < 0 ? 'down' : 'neutral') + '"><div class="lbl">Selisih</div><div class="val">Rp ' + fmt(selisih) + '</div></div></div>';
    html += '<ul class="calc-steps">';
    html += '<li><span class="step-label">PPh biasa × 11 + bulan THR</span><span class="step-val">Rp ' + fmt(rNormal.pph * 11) + ' + Rp ' + fmt(rThr.pph) + '</span></li>';
    html += '<li><span class="step-label">Bruto setahun / PKP</span><span class="step-val">Rp ' + fmt(brutoTahun) + ' / Rp ' + fmt(pkp) + '</span></li></ul>';
    if (prog.rows.length) {
      html += '<table class="bracket-table"><thead><tr><th>Lapisan</th><th class="num">Dasar</th><th class="num">PPh</th></tr></thead><tbody>';
      prog.rows.forEach(function(row) {
        html += '<tr><td>' + esc(row.label) + '</td><td class="num">Rp ' + fmt(row.dpp) + '</td><td class="num">Rp ' + fmt(row.pph) + '</td></tr>';
      });
      html += '</tbody></table>';
    }
    html += '<div class="essay-answer"><h4>Cara baca</h4><ul>';
    if (selisih > 1000) html += '<li>Progresif &gt; TER → potensi kurang bayar (± Rp ' + fmt(selisih) + ').</li>';
    else if (selisih < -1000) html += '<li>TER &gt; progresif → potensi lebih bayar (± Rp ' + fmt(Math.abs(selisih)) + ').</li>';
    else html += '<li>Nyari sama — koreksi kecil.</li>';
    html += '</ul></div>';
    var el = document.getElementById('result-banding'); el.innerHTML = html; el.hidden = false;
  }
