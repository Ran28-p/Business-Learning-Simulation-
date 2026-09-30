/* ==============================================================================
   Backup/Restore utils — cadangkan & pulihkan SEMUA progres SIM-SPT dalam satu
   file JSON: XP/level dashboard, riwayat modul Faktur & Bukti Potong, progres
   Tax Career, draft & nilai formulir 1771 (induk + 4 lampiran).

   SEBELUMNYA fitur "Backup Data" di dashboard (exportData/importData di
   js/app-main.js) hanya mencadangkan `spt_simulator_data` (XP/level saja) —
   riwayat modul lain hilang permanen kalau localStorage browser dibersihkan.
   Sekarang satu file backup mencakup seluruh key di bawah.

   WAJIB: <script> file ini dimuat sebelum modul yang memanggil BackupUtils.*.
   ============================================================================== */
(function (global) {
  // Key localStorage yang dianggap "progres pengguna" dan layak dicadangkan.
  // Sengaja TIDAK termasuk: 'theme' (preferensi tampilan, bukan progres) dan
  // 'spt_pending_email'/'spt_pending_name' (state sementara proses login).
  const BACKUP_KEYS = [
    'spt_simulator_data',        // XP/level/riwayat dashboard (sinkron Firebase)
    'spt_tax_career_progress',   // progres modul Tax Career & Practice
    'simspt_faktur_history_v1',  // riwayat modul Faktur Pajak
    'simspt_bupot_history_v1',   // riwayat modul Bukti Potong
    'spt_npwp', 'spt_nama_wp',   // identitas WP yang diisi di formulir_spt
    'spt_1771_induk_kasus_id',
    'draft_spt_1771_induk',
    'draft_lampiran_I', 'nilai_lampiran_I',
    'draft_lampiran_II', 'L2_total_hpp', 'L2_total_bs', 'L2_total_bl',
    'draft_lampiran_III', 'L3_total_kredit_pajak',
    'draft_lampiran_IV', 'L4_total_non_objek'
  ];

  function collectBackup() {
    const data = {};
    BACKUP_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val !== null) data[key] = val;
    });
    return {
      __simspt_backup: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  function downloadBackup(filename) {
    const payload = collectBackup();
    const dataStr = JSON.stringify(payload, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const a = document.createElement('a');
    a.setAttribute('href', dataUri);
    a.setAttribute('download', filename || 'backup-sim-spt-lengkap.json');
    a.click();
    return payload;
  }

  // Menerima dua bentuk file: backup lengkap (__simspt_backup: true, punya `data`)
  // MAUPUN file backup lama (sebelum fitur ini ada) yang isinya langsung objek
  // appState.user (dikenali dari adanya field `xp`) — supaya file backup lama
  // milik pengguna tetap bisa dipulihkan.
  function restoreBackup(parsed) {
    const restored = [];
    if (parsed && parsed.__simspt_backup && parsed.data) {
      Object.keys(parsed.data).forEach(key => {
        if (BACKUP_KEYS.includes(key)) {
          localStorage.setItem(key, parsed.data[key]);
          restored.push(key);
        }
      });
      return { ok: restored.length > 0, restored, legacy: false };
    }
    if (parsed && parsed.xp !== undefined) {
      localStorage.setItem('spt_simulator_data', JSON.stringify(parsed));
      return { ok: true, restored: ['spt_simulator_data'], legacy: true };
    }
    return { ok: false, restored: [], legacy: false };
  }

  function readAndRestoreFile(file, onDone) {
    const reader = new FileReader();
    reader.onload = function (e) {
      let parsed;
      try {
        parsed = JSON.parse(e.target.result);
      } catch (err) {
        onDone({ ok: false, error: 'File bukan JSON yang valid.' });
        return;
      }
      const result = restoreBackup(parsed);
      onDone(result.ok ? result : { ok: false, error: 'Format file backup tidak dikenali.' });
    };
    reader.onerror = function () { onDone({ ok: false, error: 'Gagal membaca file.' }); };
    reader.readAsText(file);
  }

  global.BackupUtils = { BACKUP_KEYS, collectBackup, downloadBackup, restoreBackup, readAndRestoreFile };
})(window);
