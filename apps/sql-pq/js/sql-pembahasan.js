/**
 * sql-pembahasan.js — Pembahasan berlapis untuk Simulator SQL (Fase 3).
 *   SQLPQ_Pembahasan.diagnose(userSql, expectedSql, verdict) -> [{judul, isi}]
 *   SQLPQ_Pembahasan.html(question, {verdict, userSql, solved}) -> string HTML (semua teks di-escape)
 * Perilaku SQLite yang disebut di sini diuji langsung pada mesin Simulator (sql.js / SQLite 3.49.1).
 * Tes: tests/test-sql-pembahasan.mjs
 */
(function (global) {
  "use strict";

  // Catatan per konsep: cara berpikir, jebakan umum, cara mengingat.
  var NOTES = {
    where: { langkah: "WHERE menyaring baris sebelum pengelompokan. Teks memakai kutip tunggal ('Jakarta'); nama kolom ber-spasi memakai kutip ganda (\"Nama Kolom\").", jebakan: "Perbandingan teks di SQLite membedakan huruf besar/kecil ('Budi' = 'budi' bernilai salah). Dan kondisi dengan NULL tidak pernah benar: pakai IS NULL.", ingat: "Filter baris = WHERE." },
    orderLimit: { langkah: "ORDER BY berjalan lebih dulu, baru LIMIT mengambil n baris pertama dari hasil terurut.", jebakan: "LIMIT tanpa ORDER BY mengambil baris sembarang. DESC untuk terbesar, ASC (bawaan) untuk terkecil.", ingat: "Urutkan dulu, potong kemudian." },
    distinct: { langkah: "DISTINCT menghapus baris duplikat berdasarkan seluruh kombinasi kolom di SELECT.", jebakan: "SELECT DISTINCT a, b mengecek pasangan (a, b), bukan a saja.", ingat: "DISTINCT berlaku pada seluruh baris hasil." },
    like: { langkah: "Pola LIKE: % = sembarang jumlah karakter, _ = tepat satu karakter.", jebakan: "LIKE di SQLite tidak membedakan huruf besar/kecil untuk ASCII ('Budi' LIKE 'budi' benar), sedangkan = membedakan. Database lain bisa berbeda.", ingat: "'%kata%' = mengandung kata." },
    between: { langkah: "BETWEEN a AND b bersifat inklusif: nilai a dan b ikut masuk.", jebakan: "Urutan harus kecil lalu besar. Untuk batas eksklusif, pakai > dan <.", ingat: "BETWEEN = >= dan <=." },
    inList: { langkah: "IN (a, b, c) setara dengan a OR b OR c pada kolom yang sama.", jebakan: "NOT IN dengan daftar yang berisi NULL tidak pernah benar, sehingga hasilnya kosong. Pakai NOT EXISTS atau saring NULL.", ingat: "IN = daftar nilai yang diizinkan." },
    multiCond: { langkah: "AND dievaluasi lebih dulu daripada OR. Gunakan tanda kurung untuk menegaskan maksud.", jebakan: "a OR b AND c dibaca a OR (b AND c). Tambahkan kurung bila maksudnya (a OR b) AND c.", ingat: "Ragu? Beri kurung." },
    groupAgg: { langkah: "GROUP BY membentuk kelompok, lalu fungsi agregat (COUNT, SUM, AVG, MIN, MAX) dihitung per kelompok.", jebakan: "Setiap kolom di SELECT yang bukan agregat seharusnya ada di GROUP BY. SQLite tetap menerima yang tidak ada (hasilnya diambil dari baris sembarang dalam kelompok), tetapi database lain menolaknya. COUNT(*) menghitung baris, COUNT(kolom) melewati NULL.", ingat: "Kelompokkan, lalu ringkas." },
    having: { langkah: "WHERE menyaring baris SEBELUM pengelompokan; HAVING menyaring kelompok SESUDAH agregasi.", jebakan: "Agregat tidak boleh di WHERE (SQLite: \"misuse of aggregate function\"). Pindahkan ke HAVING.", ingat: "Syarat atas agregat = HAVING." },
    caseWhen: { langkah: "CASE WHEN dievaluasi dari atas ke bawah dan berhenti di kondisi pertama yang benar.", jebakan: "Urutan kondisi menentukan hasil. Tambahkan ELSE agar baris yang tidak cocok tidak menjadi NULL.", ingat: "Cek dari kondisi paling spesifik." },
    coalesce: { langkah: "COALESCE(a, b, c) mengembalikan argumen pertama yang bukan NULL.", jebakan: "NULL berbeda dari 0 dan dari teks kosong; AVG melewati NULL, jadi mengganti NULL dengan 0 mengubah rata-ratanya.", ingat: "Cadangan untuk NULL." },
    stringFn: { langkah: "Posisi karakter pada SUBSTR dan INSTR dimulai dari 1, bukan 0.", jebakan: "Hasil fungsi teks tetap berupa teks. Bungkus dengan CAST bila perlu dihitung.", ingat: "Indeks SQL mulai dari 1." },
    dateFn: { langkah: "SQLite menyimpan tanggal sebagai teks berformat ISO (YYYY-MM-DD). Gunakan date(), strftime() untuk mengambil bagian atau menggeser tanggal.", jebakan: "Format selain ISO (mis. 17/05/2024) tidak diurutkan dan dibandingkan dengan benar sebagai teks.", ingat: "Tanggal terbaik: YYYY-MM-DD." },
    join: { langkah: "INNER JOIN hanya mengambil baris yang punya pasangan di kedua tabel; ON menentukan kecocokannya.", jebakan: "JOIN tanpa kondisi ON menghasilkan perkalian silang (setiap baris dengan setiap baris). Kolom bernama sama perlu diawali alias tabel.", ingat: "Tabel A × tabel B, difilter ON." },
    leftJoin: { langkah: "LEFT JOIN mempertahankan semua baris tabel kiri; yang tidak berpasangan mendapat NULL di kolom tabel kanan.", jebakan: "Syarat pada tabel kanan di WHERE membuang baris NULL dan mengubah LEFT JOIN menjadi INNER JOIN. Untuk mencari yang tidak berpasangan, gunakan WHERE kolom_kanan IS NULL.", ingat: "Kiri selalu ikut; kanan boleh NULL." },
    selfJoin: { langkah: "Self join menggabungkan tabel dengan dirinya sendiri; beri dua alias berbeda (mis. a dan b).", jebakan: "Tanpa alias, nama kolom ambigu. Kecualikan pasangan dengan dirinya sendiri (a.id <> b.id) bila perlu.", ingat: "Satu tabel, dua peran." },
    joinComplex: { langkah: "Kondisi ON boleh memuat lebih dari satu syarat (AND). Pasangkan semua kunci yang relevan.", jebakan: "Kunci yang kurang lengkap menggandakan baris. Cek jumlah baris sebelum dan sesudah JOIN.", ingat: "Cek jumlah baris setelah JOIN." },
    subquery: { langkah: "Subquery dihitung lebih dulu, hasilnya dipakai query luar. Subquery skalar harus menghasilkan satu nilai.", jebakan: "Subquery yang menghasilkan banyak baris tidak cocok dengan operator = ; pakai IN atau EXISTS.", ingat: "Dalam dulu, luar kemudian." },
    unionAll: { langkah: "UNION ALL menumpuk hasil dua query dan mempertahankan duplikat; UNION menghapus duplikat.", jebakan: "Jumlah dan urutan kolom kedua query harus sama. UNION lebih lambat karena harus menghapus duplikat.", ingat: "ALL = apa adanya." },
    exists: { langkah: "EXISTS hanya mengecek apakah subquery menghasilkan minimal satu baris; isi kolomnya tidak dipakai.", jebakan: "NOT EXISTS aman terhadap NULL, sedangkan NOT IN bisa menghasilkan kosong bila ada NULL.", ingat: "Ada atau tidak ada." },
    window: { langkah: "Window function menghitung per baris tanpa menghapus baris. PARTITION BY membagi kelompok, ORDER BY mengurutkan di dalamnya.", jebakan: "Untuk nilai seri, RANK() memberi peringkat sama dan melompat sesudahnya, sedangkan ROW_NUMBER() selalu unik. Window function tidak boleh langsung di WHERE: bungkus dalam subquery atau CTE.", ingat: "OVER (PARTITION BY … ORDER BY …)." },
    cte: { langkah: "WITH memberi nama pada query perantara sehingga langkah-langkahnya terbaca berurutan.", jebakan: "CTE hanya berlaku dalam satu pernyataan. Beri nama yang menjelaskan isinya.", ingat: "Pecah soal besar jadi langkah kecil." },
    duplicate: { langkah: "Duplikat dicari dengan GROUP BY kolom kunci lalu HAVING COUNT(*) > 1.", jebakan: "Tentukan dulu apa yang disebut duplikat: kolom mana saja yang harus sama.", ingat: "Kelompokkan, hitung, lalu > 1." },
    nullcheck: { langkah: "Gunakan IS NULL atau IS NOT NULL. Operator = dan != tidak bekerja pada NULL.", jebakan: "Teks kosong ('') bukan NULL. Keduanya perlu dicek bila data berantakan.", ingat: "NULL dicek dengan IS." },
    outlier: { langkah: "Nilai ekstrem dibandingkan dengan batas yang ditetapkan (rata-rata, kuantil, atau aturan di soal).", jebakan: "Definisi outlier berbeda-beda; ikuti persis definisi di soal.", ingat: "Definisikan batas, lalu saring." },
    dataValidation: { langkah: "Validasi data = mencari baris yang melanggar aturan (rentang nilai, format, referensi tidak ada).", jebakan: "Kondisi pelanggaran adalah kebalikan dari aturan yang benar: tulis aturan dulu, lalu balikkan.", ingat: "Cari yang melanggar." },
    dateFormatCheck: { langkah: "Format tanggal konsisten (ISO) membuat pengurutan dan perbandingan teks benar.", jebakan: "Gabungan format (17/05/2024 dan 2024-05-17) dalam satu kolom harus dibersihkan lebih dulu.", ingat: "Seragamkan format dulu." }
  };

  var ORDER_NOTE = "Urutan eksekusi logis SQL: FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.";

  // Kata kunci yang dibandingkan antara query siswa dan jawaban baku.
  var KEYS = [
    { k: "DISTINCT", re: /\bDISTINCT\b/i, perlu: "Soal ini membutuhkan DISTINCT agar duplikat tidak muncul berulang." , lebih: "Query Anda memakai DISTINCT, sedangkan jawaban baku tidak; baris yang sama mungkin memang harus muncul berulang." },
    { k: "GROUP BY", re: /\bGROUP\s+BY\b/i, perlu: "Soal ini membutuhkan GROUP BY untuk meringkas data per kelompok.", lebih: "Query Anda mengelompokkan data, padahal jawaban baku tidak." },
    { k: "HAVING", re: /\bHAVING\b/i, perlu: "Syarat atas hasil agregasi perlu ditulis di HAVING, bukan WHERE.", lebih: null },
    { k: "LEFT JOIN", re: /\bLEFT\s+(OUTER\s+)?JOIN\b/i, perlu: "Soal ini membutuhkan LEFT JOIN agar baris tabel kiri yang tak berpasangan tetap muncul.", lebih: "Query Anda memakai LEFT JOIN; jawaban baku memakai JOIN yang hanya mengambil baris berpasangan." },
    { k: "JOIN", re: /\b(INNER\s+)?JOIN\b/i, perlu: "Data berada di lebih dari satu tabel, jadi perlu JOIN.", lebih: null },
    { k: "UNION", re: /\bUNION\b/i, perlu: "Soal ini membutuhkan UNION / UNION ALL untuk menumpuk dua hasil.", lebih: null },
    { k: "EXISTS", re: /\bEXISTS\b/i, perlu: "Soal ini cocok dikerjakan dengan EXISTS / NOT EXISTS.", lebih: null },
    { k: "CASE", re: /\bCASE\b/i, perlu: "Soal ini membutuhkan CASE WHEN untuk memberi nilai berdasarkan kondisi.", lebih: null },
    { k: "COALESCE", re: /\bCOALESCE\b/i, perlu: "Soal ini membutuhkan COALESCE untuk mengganti NULL.", lebih: null },
    { k: "OVER", re: /\bOVER\s*\(/i, perlu: "Soal ini membutuhkan window function (OVER).", lebih: null },
    { k: "IS NULL", re: /\bIS\s+(NOT\s+)?NULL\b/i, perlu: "Pengecekan NULL harus memakai IS NULL / IS NOT NULL.", lebih: null },
    { k: "LIKE", re: /\bLIKE\b/i, perlu: "Pencocokan pola teks memakai LIKE.", lebih: null },
    { k: "BETWEEN", re: /\bBETWEEN\b/i, perlu: "Rentang nilai dapat ditulis dengan BETWEEN (inklusif).", lebih: null },
    { k: "LIMIT", re: /\bLIMIT\b/i, perlu: "Soal ini membatasi jumlah baris dengan LIMIT.", lebih: "Query Anda memakai LIMIT, padahal soal meminta semua baris yang memenuhi syarat." },
    { k: "ORDER BY", re: /\bORDER\s+BY\b/i, perlu: "Soal ini membutuhkan ORDER BY (urutan memengaruhi hasil).", lebih: null }
  ];

  function stripSql(sql) {
    return String(sql || "").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\r\n]*/g, " ").replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""');
  }
  function has(re, sql) { return re.test(stripSql(sql)); }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  function errorHints(msg) {
    var m = String(msg || ""), out = [];
    if (/no such column/i.test(m)) out.push({ judul: "Nama kolom tidak ditemukan", isi: "Periksa ejaan kolom. Nama kolom ber-spasi atau berhuruf besar dibungkus tanda kutip ganda (\"Nama Kolom\"), sedangkan nilai teks memakai kutip tunggal ('nilai')." });
    if (/no such table/i.test(m)) out.push({ judul: "Nama tabel tidak ditemukan", isi: "Cek ejaan nama tabel pada soal dan pastikan memakai tabel yang disediakan." });
    if (/ambiguous column/i.test(m)) out.push({ judul: "Kolom ambigu", isi: "Kolom itu ada di lebih dari satu tabel. Awali dengan alias tabel, misalnya a.id." });
    if (/misuse of aggregate/i.test(m)) out.push({ judul: "Agregat salah tempat", isi: "Fungsi agregat (COUNT, SUM, AVG, …) tidak boleh di WHERE. Pindahkan syaratnya ke HAVING setelah GROUP BY." });
    if (/syntax error/i.test(m)) out.push({ judul: "Kesalahan sintaks", isi: "Periksa koma, tanda kurung, dan ejaan kata kunci di dekat bagian yang disebut pada pesan error. Urutan klausa: SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT." });
    if (/incomplete input|unrecognized token/i.test(m)) out.push({ judul: "Query belum lengkap", isi: "Ada tanda kutip atau tanda kurung yang belum ditutup." });
    return out;
  }

  /** Diagnosis terarah berdasarkan verdict + perbandingan struktur query. */
  function diagnose(userSql, expectedSql, verdict) {
    var out = [];
    verdict = verdict || {};
    if (verdict.error) return errorHints(verdict.error);
    if (verdict.reason === "column_count") out.push({ judul: "Jumlah kolom berbeda", isi: "Periksa daftar kolom di SELECT: kolom yang diminta soal harus tampil persis, tidak kurang dan tidak lebih." });
    if (verdict.reason === "row_count") out.push({ judul: "Jumlah baris berbeda", isi: "Biasanya karena filter (WHERE/HAVING) terlalu longgar atau ketat, duplikat belum dihapus, atau JOIN menggandakan atau membuang baris." });
    if (verdict.reason === "value_mismatch") out.push({ judul: "Ada nilai yang berbeda", isi: "Jumlah baris sudah sama, tetapi isinya berbeda. Periksa rumus kolom, pembulatan, kondisi perbandingan (> vs >=), atau kolom yang dipakai untuk JOIN." });
    if (expectedSql) {
      KEYS.forEach(function (key) {
        // JOIN: jangan dobel dengan LEFT JOIN
        var exp = has(key.re, expectedSql), usr = has(key.re, userSql);
        if (key.k === "JOIN") { exp = has(/\b(INNER\s+)?JOIN\b/i, expectedSql); usr = has(/\bJOIN\b/i, userSql); }
        if (exp && !usr) out.push({ judul: "Belum memakai " + key.k, isi: key.perlu });
        else if (!exp && usr && key.lebih) out.push({ judul: "Memakai " + key.k + " yang tidak diperlukan", isi: key.lebih });
      });
    }
    return out.slice(0, 5);
  }

  function row(label, bodyHtml, cls) {
    return '<div class="sp-row ' + (cls || "") + '"><span class="sp-label">' + label + "</span>" + bodyHtml + "</div>";
  }

  /**
   * @param {object} q       soal aktif ({concept, conceptLabel, explanation, solutionSql, expectedSql})
   * @param {object} [opt]   {verdict, userSql, solved}
   */
  function html(q, opt) {
    opt = opt || {};
    var n = NOTES[q && q.concept];
    var h = '<div class="sp-box">';
    if (opt.solved) h += row("Mengapa jawabanmu benar", "<p>" + esc(q.explanation || "") + "</p>");
    else if (opt.verdict) {
      var d = diagnose(opt.userSql, q.expectedSql, opt.verdict);
      if (d.length) h += row("Petunjuk perbaikan", "<ul>" + d.map(function (x) { return "<li><strong>" + esc(x.judul) + "</strong> — " + esc(x.isi) + "</li>"; }).join("") + "</ul>", "sp-diag");
    } else if (q && q.explanation) h += row("Penjelasan", "<p>" + esc(q.explanation) + "</p>");
    if (n) {
      h += row("Cara berpikir (" + esc(q.conceptLabel || "") + ")", "<p>" + esc(n.langkah) + "</p>");
      h += row("Jebakan umum", "<p>" + esc(n.jebakan) + "</p>", "sp-warn");
      h += row("Cara mengingat", "<p>" + esc(n.ingat) + "</p>", "sp-tip");
    }
    if (opt.solved) h += row("Urutan eksekusi", "<p>" + esc(ORDER_NOTE) + "</p>");
    if (opt.solved && q && q.solutionSql) h += row("Query pembanding", '<pre class="lesson-syntax">' + esc(q.solutionSql) + "</pre><p><small>Jawaban lain yang menghasilkan hasil sama juga benar.</small></p>");
    return h + "</div>";
  }

  global.SQLPQ_Pembahasan = { diagnose: diagnose, html: html, NOTES: NOTES, KEYS: KEYS, errorHints: errorHints };
})(typeof window !== "undefined" ? window : globalThis);
