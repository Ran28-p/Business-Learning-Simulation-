/**
 * question-bank.js
 * Generator soal SQL dinamis. Soal dibentuk dari kolom & nilai NYATA pada
 * dataset yang sedang dimuat (bukan teks statis), sehingga tiap kali
 * pengguna minta "soal baru" nilainya bisa berbeda.
 */
(function (global) {
  "use strict";

  // Peta "peran kolom" per kategori dataset flat, dipakai templat generik
  // level 1 / 2 / 5 agar tidak perlu menulis ulang soal untuk tiap kategori.
  const ROLE_MAP = {
    sales: { table: "sales", textCol: "Region", nameCol: "Customer_Name", groupCol: "Category", numCol: "Total_Sales", dateCol: "Date", idCol: "Transaction_ID" },
    accounting: { table: "accounting", textCol: "Department", nameCol: "Account_Name", groupCol: "Account_Name", numCol: "Debit", dateCol: "Date", idCol: "Transaction_ID" },
    hr: { table: "hr", textCol: "Department", nameCol: "Name", groupCol: "Position", numCol: "Salary", dateCol: "Join_Date", idCol: "Employee_ID" },
    inventory: { table: "inventory", textCol: "Category", nameCol: "Product_Name", groupCol: "Supplier", numCol: "Stock", dateCol: null, idCol: "Product_ID" },
    customers: { table: "customer_data", textCol: "Province", nameCol: "Name", groupCol: "Customer_Type", numCol: "Total_Purchase", dateCol: "Registration_Date", idCol: "Customer_ID" }
  };

  // ------------------------------------------------------------- helpers --
  function pickDistinctValue(table, col) {
    const eng = global.SQLPQ_Engine;
    const countRes = eng.run(`SELECT COUNT(DISTINCT "${col}") FROM "${table}" WHERE "${col}" IS NOT NULL`);
    const total = countRes.values.length ? countRes.values[0][0] : 0;
    if (!total) return null;
    const offset = Math.floor(Math.random() * total);
    const res = eng.run(`SELECT DISTINCT "${col}" FROM "${table}" WHERE "${col}" IS NOT NULL LIMIT 1 OFFSET ${offset}`);
    return res.values.length ? res.values[0][0] : null;
  }
  function pickDistinctValues(table, col, n) {
    const eng = global.SQLPQ_Engine;
    const res = eng.run(`SELECT DISTINCT "${col}" FROM "${table}" WHERE "${col}" IS NOT NULL ORDER BY RANDOM() LIMIT ${n}`);
    return res.values.map((v) => v[0]);
  }
  function numericRange(table, col) {
    const eng = global.SQLPQ_Engine;
    const res = eng.run(`SELECT MIN("${col}"), MAX("${col}"), AVG("${col}") FROM "${table}" WHERE "${col}" IS NOT NULL`);
    if (!res.values.length || res.values[0][0] == null) return { min: 0, max: 100, avg: 50 };
    return { min: res.values[0][0], max: res.values[0][1], avg: res.values[0][2] };
  }
  function round2(n) { return Math.round(n * 100) / 100; }

  const CONCEPTS = {
    where: {
      label: "WHERE — filter baris",
      hints: (p) => [
        `Gunakan klausa WHERE untuk menyaring baris berdasarkan kondisi tertentu.`,
        `Struktur dasar: SELECT ... FROM ${p.table} WHERE ${p.col} = 'nilai';`,
        `Jangan lupa tanda kutip satu untuk nilai teks: WHERE "${p.col}" = '${p.val}'`
      ],
      explain: (p) => `Query ini menyaring baris dari tabel "${p.table}" dengan membandingkan kolom "${p.col}" terhadap nilai '${p.val}' menggunakan WHERE. SQL mengevaluasi kondisi untuk tiap baris — hanya baris yang hasilnya TRUE yang ditampilkan. Kesalahan umum: lupa tanda kutip pada nilai teks, atau salah menulis nama kolom (case-sensitive pada beberapa engine).`
    },
    orderLimit: {
      label: "ORDER BY + LIMIT",
      hints: () => [
        `Urutkan hasil dengan ORDER BY, lalu batasi jumlah baris dengan LIMIT.`,
        `Struktur: SELECT kolom FROM tabel ORDER BY kolom_angka DESC LIMIT n;`,
        `DESC = dari besar ke kecil (descending), ASC = dari kecil ke besar.`
      ],
      explain: (p) => `ORDER BY mengurutkan seluruh hasil terlebih dahulu berdasarkan kolom "${p.col}" secara menurun (DESC), baru kemudian LIMIT memotong hanya sejumlah baris teratas. Urutan klausa ini penting: SQL selalu mengurutkan dulu sebelum membatasi jumlah baris.`
    },
    distinct: {
      label: "DISTINCT — nilai unik",
      hints: () => [
        `Gunakan DISTINCT untuk menghilangkan nilai yang berulang pada hasil.`,
        `Struktur: SELECT DISTINCT kolom FROM tabel;`,
        `DISTINCT bekerja pada kombinasi seluruh kolom yang dipilih, bukan hanya satu kolom jika Anda memilih lebih dari satu.`
      ],
      explain: (p) => `DISTINCT membuang baris duplikat dari hasil akhir, dengan membandingkan seluruh kolom yang dipilih (di sini hanya "${p.col}"). Ini berbeda dengan GROUP BY yang dipakai bersama fungsi agregat.`
    },
    like: {
      label: "LIKE — pencocokan pola teks",
      hints: (p) => [
        `Gunakan LIKE dengan simbol % untuk mencocokkan sebagian teks.`,
        `Struktur: SELECT * FROM tabel WHERE kolom LIKE 'awalan%';`,
        `'${p.prefix}%' berarti: dimulai dengan "${p.prefix}", diikuti apa saja setelahnya.`
      ],
      explain: (p) => `LIKE '${p.prefix}%' mencocokkan teks yang DIAWALI dengan "${p.prefix}" — simbol % berarti "sembarang karakter, 0 atau lebih". Kalau % diletakkan di depan ('%${p.prefix}') artinya mencari teks yang DIAKHIRI dengan kata itu, dan di kedua sisi ('%${p.prefix}%') berarti "mengandung" kata itu di mana saja.`
    },
    between: {
      label: "BETWEEN — rentang nilai",
      hints: (p) => [
        `BETWEEN memilih nilai dalam suatu rentang, termasuk kedua batasnya.`,
        `Struktur: SELECT * FROM tabel WHERE kolom BETWEEN nilai_bawah AND nilai_atas;`,
        `Di soal ini rentangnya adalah ${p.lo} sampai ${p.hi} pada kolom "${p.col}".`
      ],
      explain: () => `BETWEEN a AND b setara dengan "kolom >= a AND kolom <= b" — batas bawah dan batas atas SAMA-SAMA ikut termasuk dalam hasil (inklusif). Ini cara ringkas menyaring data dalam suatu rentang, misalnya rentang harga, tanggal, atau jumlah.`
    },
    inList: {
      label: "IN — daftar nilai",
      hints: (p) => [
        `IN adalah cara ringkas menulis beberapa kondisi OR yang membandingkan kolom yang sama.`,
        `Struktur: SELECT * FROM tabel WHERE kolom IN ('nilai1','nilai2');`,
        `Soal ini meminta baris dengan "${p.col}" bernilai salah satu dari: ${p.vals.map((v) => "'" + v + "'").join(", ")}`
      ],
      explain: () => `WHERE kolom IN ('a','b','c') sama persis hasilnya dengan WHERE kolom='a' OR kolom='b' OR kolom='c', tapi jauh lebih ringkas dan mudah dibaca — terutama saat daftar nilainya panjang.`
    },
    multiCond: {
      label: "AND / OR — kondisi majemuk",
      hints: (p) => [
        `Gabungkan dua syarat sekaligus dengan AND — baris harus memenuhi KEDUA syarat.`,
        `Struktur: SELECT * FROM tabel WHERE syarat1 AND syarat2;`,
        `Syarat 1: "${p.col1}" = '${p.val1}'. Syarat 2: "${p.col2}" > ${p.val2}.`
      ],
      explain: () => `AND mensyaratkan KEDUA kondisi bernilai TRUE agar baris ikut tampil — beda dengan OR yang cukup salah satu kondisi saja yang TRUE. Kombinasi AND/OR (dengan tanda kurung bila perlu) adalah dasar dari hampir semua filter data yang realistis.`
    },
    groupAgg: {
      label: "GROUP BY + fungsi agregat",
      hints: () => [
        `Kelompokkan data dengan GROUP BY, lalu gunakan fungsi agregat (SUM/COUNT/AVG) pada tiap kelompok.`,
        `Struktur: SELECT kolom_grup, SUM(kolom_angka) FROM tabel GROUP BY kolom_grup;`,
        `Kolom yang tidak diagregasi WAJIB muncul di GROUP BY, kalau tidak query akan error atau hasilnya tidak terdefinisi.`
      ],
      explain: (p) => `GROUP BY mengelompokkan baris yang punya nilai sama pada kolom "${p.groupCol}" menjadi satu grup, lalu fungsi agregat (di sini ${p.fn.toUpperCase()}) dihitung per grup — bukan untuk seluruh tabel. Ini dasar dari hampir semua laporan ringkasan (total penjualan per kategori, rata-rata gaji per departemen, dsb).`
    },
    having: {
      label: "HAVING — filter hasil agregasi",
      hints: () => [
        `WHERE menyaring baris SEBELUM dikelompokkan; kalau ingin menyaring hasil SETELAH agregasi, gunakan HAVING.`,
        `Struktur: SELECT kolom_grup, SUM(x) as total FROM tabel GROUP BY kolom_grup HAVING SUM(x) > nilai;`,
        `Nilai pembanding di soal ini adalah rata-rata (AVG) dari seluruh data — bisa dihitung dengan subquery: (SELECT AVG(kolom) FROM tabel).`
      ],
      explain: () => `HAVING mirip WHERE, tapi bekerja setelah GROUP BY dan fungsi agregat dihitung — karena itu HAVING boleh memakai SUM(), COUNT(), AVG(), dsb, sedangkan WHERE tidak boleh. Subquery pada bagian pembanding dihitung sekali dan hasilnya dipakai sebagai ambang batas untuk tiap grup.`
    },
    caseWhen: {
      label: "CASE WHEN — logika kondisional",
      hints: (p) => [
        `CASE WHEN bekerja seperti IF berlapis di dalam SELECT.`,
        `Struktur: CASE WHEN kondisi THEN nilai ELSE default END`,
        `Bandingkan "${p.col}" dengan rata-ratanya sendiri: (SELECT AVG("${p.col}") FROM "${p.table}")`
      ],
      explain: () => `CASE WHEN...THEN...ELSE...END mengevaluasi kondisi secara berurutan dan mengembalikan nilai dari cabang pertama yang TRUE — kalau tidak ada yang cocok, dipakai nilai ELSE. Ini dipakai untuk membuat kategori/label baru langsung dari data mentah, tanpa perlu mengubah tabel aslinya.`
    },
    coalesce: {
      label: "COALESCE — nilai pengganti NULL",
      hints: () => [
        `COALESCE mengembalikan nilai pertama yang TIDAK NULL dari daftar argumen.`,
        `Struktur: COALESCE(kolom, nilai_pengganti)`,
        `Kalau kolomnya NULL, COALESCE akan memakai nilai pengganti yang Anda tentukan sebagai argumen kedua.`
      ],
      explain: () => `COALESCE(kolom, 0) berarti: "pakai nilai kolom apa adanya, tapi kalau NULL, pakai 0 sebagai gantinya". Ini jauh lebih ringkas dibanding menulis CASE WHEN kolom IS NULL THEN 0 ELSE kolom END, dan sangat umum dipakai supaya hasil SUM/laporan tidak "rusak" akibat data kosong.`
    },
    stringFn: {
      label: "String Functions",
      hints: () => [
        `UPPER() mengubah ke huruf besar semua, TRIM() menghapus spasi berlebih di awal/akhir.`,
        `Struktur: SELECT UPPER(TRIM(kolom)) FROM tabel;`,
        `Fungsi bisa disarangkan — hasil TRIM() langsung menjadi input untuk UPPER().`
      ],
      explain: () => `Fungsi string seperti UPPER(), LOWER(), dan TRIM() sangat umum dipakai untuk menstandarkan data teks sebelum dibandingkan atau dilaporkan — data yang sama tapi beda kapitalisasi/spasi akan dianggap berbeda oleh SQL kalau tidak dibersihkan dulu.`
    },
    dateFn: {
      label: "Date Functions",
      hints: (p) => [
        `STRFTIME('%Y', kolom_tanggal) mengekstrak bagian TAHUN dari sebuah tanggal.`,
        `Struktur: SELECT STRFTIME('%Y', kolom) as tahun, COUNT(*) FROM tabel GROUP BY tahun;`,
        `Kolom tanggal yang dipakai di soal ini adalah "${p.col}".`
      ],
      explain: () => `STRFTIME adalah fungsi tanggal khas SQLite untuk mengekstrak bagian tertentu dari tanggal — '%Y' untuk tahun, '%m' untuk bulan, '%Y-%m' untuk gabungan tahun-bulan. Ini dasar dari hampir semua laporan tren bulanan/tahunan.`
    },
    join: {
      label: "INNER JOIN",
      hints: () => [
        `Gabungkan beberapa tabel yang berelasi menggunakan JOIN, hubungkan lewat kolom kunci (foreign key ↔ primary key).`,
        `Struktur: SELECT ... FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN products p ON o.product_id = p.product_id;`,
        `Gunakan alias (o, c, p) supaya query lebih ringkas dan jelas kolom mana milik tabel mana.`
      ],
      explain: () => `INNER JOIN memasangkan baris dari dua (atau lebih) tabel berdasarkan kondisi ON — hanya baris yang punya pasangan cocok di kedua tabel yang muncul di hasil. Ini dipakai saat data terpisah ke beberapa tabel (misalnya order, pelanggan, produk) tapi Anda butuh menampilkannya sebagai satu laporan gabungan.`
    },
    leftJoin: {
      label: "LEFT JOIN",
      hints: () => [
        `LEFT JOIN tetap menampilkan semua baris dari tabel kiri walau tidak ada pasangannya di tabel kanan.`,
        `Struktur: SELECT c.customer_name, COUNT(o.order_id) FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_name;`,
        `Baris tanpa pasangan akan berisi NULL pada kolom dari tabel kanan — COUNT(o.order_id) otomatis menghitungnya sebagai 0 karena COUNT mengabaikan NULL.`
      ],
      explain: () => `Berbeda dari INNER JOIN, LEFT JOIN mempertahankan SEMUA baris dari tabel kiri (di sini "customers"), meskipun tidak ditemukan baris pasangan di tabel kanan — kolom dari tabel kanan akan berisi NULL. Ini penting untuk pertanyaan seperti "pelanggan mana yang belum pernah order", yang akan hilang kalau memakai INNER JOIN.`
    },
    selfJoin: {
      label: "Self JOIN",
      hints: () => [
        `Sebuah tabel bisa di-JOIN dengan DIRINYA SENDIRI — beri dua alias berbeda untuk membedakan "peran"-nya.`,
        `Struktur: SELECT e.employee_name, m.employee_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.employee_id;`,
        `Pakai LEFT JOIN (bukan INNER JOIN) supaya karyawan yang TIDAK punya atasan (manager_id kosong) tetap ikut tampil.`
      ],
      explain: () => `Self JOIN menggabungkan tabel "employees" dengan salinan dirinya sendiri, dibedakan lewat alias (e untuk karyawan, m untuk atasan). Ini pola umum untuk data hierarkis/berjenjang seperti struktur organisasi, kategori bertingkat, atau relasi "teman dari teman".`
    },
    joinComplex: {
      label: "JOIN dengan Kondisi Kompleks",
      hints: (p) => [
        `Kondisi pada klausa ON boleh lebih dari satu, digabung dengan AND — sama seperti WHERE.`,
        `Struktur: FROM a JOIN b ON a.id = b.id AND b.kolom = 'nilai'`,
        `Tambahkan syarat "region = '${p.val}'" ke dalam kondisi ON, bukan hanya kolom kunci saja.`
      ],
      explain: () => `Kondisi ON tidak harus hanya membandingkan kolom kunci — Anda boleh menambahkan syarat lain dengan AND, persis seperti WHERE. Bedanya, syarat tambahan di ON memengaruhi PROSES PENGGABUNGAN itu sendiri (relevan terutama untuk LEFT/RIGHT JOIN), sedangkan syarat di WHERE menyaring SETELAH proses join selesai.`
    },
    subquery: {
      label: "Subquery",
      hints: () => [
        `Subquery adalah query di dalam query — dijalankan lebih dulu, hasilnya dipakai oleh query utama.`,
        `Struktur: SELECT * FROM tabel WHERE kolom > (SELECT AVG(kolom) FROM tabel);`,
        `Subquery di sini TIDAK merujuk ke tabel luar (non-correlated) — cukup dihitung SEKALI untuk seluruh query.`
      ],
      explain: () => `Subquery pada bagian WHERE dievaluasi lebih dulu menjadi satu nilai tunggal (di sini: rata-rata), baru kemudian dipakai sebagai pembanding untuk tiap baris di query utama. Ini berbeda dengan correlated subquery yang dijalankan ULANG untuk tiap baris.`
    },
    unionAll: {
      label: "UNION ALL",
      hints: () => [
        `UNION ALL menumpuk hasil dua query yang jumlah & jenis kolomnya sama, TANPA membuang duplikat.`,
        `Struktur: SELECT kolom FROM tabel1 UNION ALL SELECT kolom FROM tabel2;`,
        `Kalau ingin duplikat OTOMATIS dibuang, ganti UNION ALL menjadi UNION saja.`
      ],
      explain: () => `UNION ALL menggabungkan hasil dua SELECT secara vertikal apa adanya (baris demi baris), tanpa memeriksa duplikat — karena itu lebih cepat dibanding UNION. Kedua SELECT WAJIB punya jumlah kolom yang sama, dan sebaiknya tipe datanya sejenis.`
    },
    exists: {
      label: "EXISTS",
      hints: () => [
        `EXISTS mengecek apakah subquery menghasilkan MINIMAL satu baris — hasilnya hanya TRUE/FALSE.`,
        `Struktur: SELECT * FROM a WHERE EXISTS (SELECT 1 FROM b WHERE b.kunci = a.kunci);`,
        `Isi SELECT di dalam EXISTS tidak penting (boleh SELECT 1) — yang diperiksa hanya ADA/TIDAKNYA baris.`
      ],
      explain: () => `EXISTS lebih efisien dibanding IN untuk data besar karena database bisa BERHENTI mencari begitu menemukan satu baris cocok — tidak perlu mengumpulkan semua hasil terlebih dahulu. EXISTS sering dipakai untuk pertanyaan "adakah transaksi terkait" tanpa perlu tahu detail transaksinya.`
    },
    window: {
      label: "Window Function (RANK / ROW_NUMBER)",
      hints: () => [
        `Window function menghitung nilai (ranking, nomor urut, dst) TANPA mengurangi jumlah baris — beda dengan GROUP BY yang meringkas.`,
        `Struktur: SELECT kolom, RANK() OVER (ORDER BY nilai DESC) as ranking FROM tabel;`,
        `Untuk ranking per kelompok, tambahkan PARTITION BY: RANK() OVER (PARTITION BY kelompok ORDER BY nilai DESC)`
      ],
      explain: () => `Window function seperti RANK(), ROW_NUMBER(), dan DENSE_RANK() dihitung "di atas jendela baris" yang ditentukan oleh OVER(...), tanpa menggabungkan baris menjadi satu seperti GROUP BY. PARTITION BY membagi data jadi beberapa kelompok, dan ranking dihitung ulang dari 1 di tiap kelompok — sangat berguna untuk laporan seperti "produk terlaris per region".`
    },
    cte: {
      label: "CTE (WITH) + Subquery",
      hints: () => [
        `Gunakan CTE (Common Table Expression) dengan klausa WITH untuk memecah query kompleks jadi langkah-langkah yang lebih mudah dibaca.`,
        `Struktur: WITH ringkasan AS (SELECT ... GROUP BY ...) SELECT * FROM ringkasan WHERE total > (SELECT AVG(total) FROM ringkasan);`,
        `CTE bisa dirujuk berkali-kali dalam query utama, termasuk di dalam subquery pembanding — hasilnya sama seperti tabel sementara.`
      ],
      explain: () => `CTE (WITH ... AS (...)) mendefinisikan "tabel sementara" bernama yang hanya berlaku selama query itu berjalan. Ini membuat query bertingkat jauh lebih mudah dibaca dibanding subquery bersarang, dan CTE yang sama bisa dipakai ulang di beberapa bagian query utama.`
    },
    duplicate: {
      label: "Deteksi Duplikat",
      hints: () => [
        `Data duplikat biasanya punya ID yang sama tapi muncul lebih dari sekali — hitung kemunculannya per ID.`,
        `Struktur: SELECT id_kolom, COUNT(*) as jumlah FROM tabel GROUP BY id_kolom HAVING COUNT(*) > 1;`,
        `HAVING COUNT(*) > 1 hanya menyisakan ID yang muncul lebih dari satu kali — itulah kandidat duplikat.`
      ],
      explain: () => `Mengelompokkan data berdasarkan ID lalu menghitung kemunculannya adalah cara paling umum menemukan duplikat: ID yang seharusnya unik tapi COUNT()-nya lebih dari 1 berarti ada baris kembar (baik duplikat identik maupun re-entry data). Langkah selanjutnya di dunia nyata biasanya DELETE baris berlebih atau investigasi sumber datanya.`
    },
    nullcheck: {
      label: "Menemukan NULL",
      hints: () => [
        `NULL tidak bisa dibandingkan dengan =, harus pakai IS NULL / IS NOT NULL.`,
        `Struktur: SELECT * FROM tabel WHERE kolom IS NULL;`,
        `Ingat: kolom = NULL akan selalu menghasilkan UNKNOWN (bukan TRUE), jadi baris tidak akan pernah muncul jika Anda salah pakai '='.`
      ],
      explain: () => `NULL berarti "tidak ada nilai", bukan nol atau string kosong — karena itu SQL punya operator khusus IS NULL / IS NOT NULL. Menemukan baris dengan NULL pada kolom penting adalah langkah awal data cleaning sebelum data dipakai untuk analisis atau pelaporan.`
    },
    outlier: {
      label: "Deteksi Nilai Ekstrem (Outlier)",
      hints: () => [
        `Cara sederhana melihat outlier: urutkan data dari nilai tertinggi/terendah lalu lihat beberapa baris teratas.`,
        `Struktur: SELECT * FROM tabel ORDER BY kolom_angka DESC LIMIT 5;`,
        `Bandingkan nilai-nilai itu dengan rata-rata (AVG) — kalau jauh sekali dari rata-rata, kemungkinan besar itu outlier / kesalahan input.`
      ],
      explain: () => `Ini bukan deteksi statistik yang ketat (seperti z-score atau IQR), tapi cara cepat & praktis di SQL untuk melihat kandidat nilai ekstrem: urutkan lalu lihat ujung atasnya. Di pekerjaan nyata, nilai seperti ini sering kali salah input (misalnya harga tertukar dengan kode, atau kesalahan ketik menambah nol).`
    },
    dataValidation: {
      label: "Data Validation",
      hints: (p) => [
        `Tentukan dulu aturan bisnis yang wajar (mis. angka tidak boleh negatif), lalu cari baris yang MELANGGAR aturan itu.`,
        `Struktur: SELECT * FROM tabel WHERE kolom_angka < 0;`,
        `Kolom yang diperiksa di soal ini adalah "${p.col}" — nilainya seharusnya tidak pernah negatif.`
      ],
      explain: () => `Data validation memastikan data mematuhi aturan bisnis yang berlaku — misalnya kuantitas atau nominal transaksi seharusnya tidak pernah negatif. Query ini adalah pengecekan pertama sebelum data dipakai untuk laporan atau pengambilan keputusan; nilai yang lolos aturan bukan berarti pasti benar, tapi nilai yang gagal aturan hampir pasti perlu diperiksa.`
    },
    dateFormatCheck: {
      label: "Konsistensi Format Tanggal",
      hints: (p) => [
        `Tanggal yang rapi dalam format SQL biasanya berpola YYYY-MM-DD (4 digit tahun, 2 digit bulan, 2 digit hari).`,
        `SQLite punya operator GLOB untuk mencocokkan pola: kolom NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
        `Kolom tanggal pada soal ini adalah "${p.col}" — cari baris yang formatnya BUKAN pola tersebut.`
      ],
      explain: () => `GLOB adalah operator pencocokan pola di SQLite (mirip LIKE, tapi case-sensitive dan pakai tanda [ ] untuk rentang karakter). Pola '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' hanya cocok dengan tanggal berformat YYYY-MM-DD yang rapi — baris yang TIDAK cocok kemungkinan memakai format lain (DD/MM/YYYY, nama bulan, dsb) yang perlu distandarkan sebelum dianalisis.`
    }
  };

  function buildQuestion(level, concept, table, prompt, expectedSql, params, extra) {
    const c = CONCEPTS[concept];
    return Object.assign({
      id: "q_" + level + "_" + concept + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      level, table, concept, conceptLabel: c.label,
      prompt, expectedSql, solutionSql: expectedSql,
      orderMatters: false,
      hints: c.hints(params || {}),
      explanation: c.explain(params || {})
    }, extra || {});
  }

  // ---- Level 1/2/5 templates against a single flat category table ---------
  function genLevel1(category) {
    const r = ROLE_MAP[category];
    const which = Math.random();
    if (which < 0.22) {
      const val = pickDistinctValue(r.table, r.textCol);
      if (val == null) return genLevel1Fallback(r);
      return buildQuestion(1, "where", r.table,
        `Tampilkan seluruh data dari tabel "${r.table}" yang kolom "${r.textCol}" bernilai '${val}'.`,
        `SELECT * FROM "${r.table}" WHERE "${r.textCol}" = '${val}'`,
        { table: r.table, col: r.textCol, val });
    } else if (which < 0.4) {
      return buildQuestion(1, "orderLimit", r.table,
        `Tampilkan kolom "${r.nameCol}" dan "${r.numCol}" dari tabel "${r.table}", urutkan dari "${r.numCol}" TERBESAR ke terkecil, ambil 5 baris teratas.`,
        `SELECT "${r.nameCol}", "${r.numCol}" FROM "${r.table}" ORDER BY "${r.numCol}" DESC LIMIT 5`,
        { table: r.table, col: r.numCol },
        { orderMatters: true });
    } else if (which < 0.55) {
      return buildQuestion(1, "distinct", r.table,
        `Tampilkan seluruh nilai "${r.groupCol}" yang unik (tanpa duplikat) dari tabel "${r.table}".`,
        `SELECT DISTINCT "${r.groupCol}" FROM "${r.table}"`,
        { table: r.table, col: r.groupCol });
    } else if (which < 0.7) {
      const val = pickDistinctValue(r.table, r.nameCol);
      const prefix = (val ? String(val).trim().split(/\s+/)[0] : null);
      if (!prefix) return genLevel1Fallback(r);
      return buildQuestion(1, "like", r.table,
        `Tampilkan baris dari tabel "${r.table}" yang kolom "${r.nameCol}"-nya DIAWALI dengan kata "${prefix}".`,
        `SELECT * FROM "${r.table}" WHERE "${r.nameCol}" LIKE '${prefix}%'`,
        { prefix });
    } else if (which < 0.85) {
      const rng = numericRange(r.table, r.numCol);
      const span = Math.max(1, rng.max - rng.min);
      const lo = Math.round(rng.min + span * 0.2);
      const hi = Math.round(rng.min + span * 0.6);
      return buildQuestion(1, "between", r.table,
        `Tampilkan baris dari tabel "${r.table}" yang nilai "${r.numCol}"-nya berada di antara ${lo} dan ${hi} (inklusif).`,
        `SELECT * FROM "${r.table}" WHERE "${r.numCol}" BETWEEN ${lo} AND ${hi}`,
        { col: r.numCol, lo, hi });
    } else {
      const vals = pickDistinctValues(r.table, r.textCol, 3);
      if (vals.length < 2) return genLevel1Fallback(r);
      return buildQuestion(1, "inList", r.table,
        `Tampilkan baris dari tabel "${r.table}" yang "${r.textCol}"-nya salah satu dari: ${vals.map((v) => "'" + v + "'").join(", ")}.`,
        `SELECT * FROM "${r.table}" WHERE "${r.textCol}" IN (${vals.map((v) => "'" + v + "'").join(",")})`,
        { col: r.textCol, vals });
    }
  }
  function genLevel1Fallback(r) {
    return buildQuestion(1, "distinct", r.table,
      `Tampilkan seluruh nilai "${r.groupCol}" yang unik (tanpa duplikat) dari tabel "${r.table}".`,
      `SELECT DISTINCT "${r.groupCol}" FROM "${r.table}"`,
      { table: r.table, col: r.groupCol });
  }

  function genLevel2(category) {
    const r = ROLE_MAP[category];
    const which = Math.random();
    if (which < 0.25) {
      return buildQuestion(2, "groupAgg", r.table,
        `Hitung total "${r.numCol}" untuk setiap "${r.groupCol}" pada tabel "${r.table}".`,
        `SELECT "${r.groupCol}", SUM("${r.numCol}") as total FROM "${r.table}" GROUP BY "${r.groupCol}"`,
        { table: r.table, groupCol: r.groupCol, fn: "sum" });
    } else if (which < 0.45) {
      return buildQuestion(2, "having", r.table,
        `Tampilkan "${r.groupCol}" beserta total "${r.numCol}"-nya, tapi HANYA untuk "${r.groupCol}" yang total "${r.numCol}"-nya LEBIH BESAR dari rata-rata seluruh "${r.numCol}" di tabel "${r.table}".`,
        `SELECT "${r.groupCol}", SUM("${r.numCol}") as total FROM "${r.table}" GROUP BY "${r.groupCol}" HAVING SUM("${r.numCol}") > (SELECT AVG("${r.numCol}") FROM "${r.table}")`,
        { table: r.table, groupCol: r.groupCol });
    } else if (which < 0.6) {
      return buildQuestion(2, "caseWhen", r.table,
        `Tampilkan seluruh kolom tabel "${r.table}" ditambah satu kolom baru bernama "Kategori": isi 'Tinggi' jika "${r.numCol}" LEBIH BESAR ATAU SAMA DENGAN rata-rata seluruh "${r.numCol}", selain itu 'Rendah'.`,
        `SELECT *, CASE WHEN "${r.numCol}" >= (SELECT AVG("${r.numCol}") FROM "${r.table}") THEN 'Tinggi' ELSE 'Rendah' END as Kategori FROM "${r.table}"`,
        { table: r.table, col: r.numCol });
    } else if (which < 0.75) {
      return buildQuestion(2, "coalesce", r.table,
        `Tampilkan "${r.idCol}" dan "${r.numCol}" dari tabel "${r.table}" — tapi jika "${r.numCol}" NULL (kosong), tampilkan 0 sebagai gantinya (gunakan COALESCE).`,
        `SELECT "${r.idCol}", COALESCE("${r.numCol}", 0) as "${r.numCol}" FROM "${r.table}"`,
        {});
    } else if (which < 0.9 || !r.dateCol) {
      return buildQuestion(2, "stringFn", r.table,
        `Tampilkan kolom "${r.nameCol}" dari tabel "${r.table}" dalam huruf KAPITAL semua dan tanpa spasi berlebih di awal/akhir (gunakan UPPER dan TRIM).`,
        `SELECT UPPER(TRIM("${r.nameCol}")) as ${r.nameCol} FROM "${r.table}"`,
        {});
    } else {
      return buildQuestion(2, "dateFn", r.table,
        `Hitung jumlah baris untuk setiap TAHUN pada kolom "${r.dateCol}" di tabel "${r.table}" (ekstrak tahunnya saja).`,
        `SELECT STRFTIME('%Y', "${r.dateCol}") as tahun, COUNT(*) as jumlah FROM "${r.table}" GROUP BY tahun`,
        { col: r.dateCol });
    }
  }

  function genLevel5(category) {
    const r = ROLE_MAP[category];
    const which = Math.random();
    if (which < 0.22) {
      return buildQuestion(5, "duplicate", r.table,
        `Temukan kandidat data duplikat di tabel "${r.table}": tampilkan "${r.idCol}" yang muncul LEBIH DARI 1 kali beserta jumlah kemunculannya.`,
        `SELECT "${r.idCol}", COUNT(*) as jumlah FROM "${r.table}" GROUP BY "${r.idCol}" HAVING COUNT(*) > 1`,
        { table: r.table, idCol: r.idCol });
    } else if (which < 0.44) {
      return buildQuestion(5, "nullcheck", r.table,
        `Tampilkan seluruh baris pada tabel "${r.table}" yang kolom "${r.numCol}" bernilai NULL (kosong).`,
        `SELECT * FROM "${r.table}" WHERE "${r.numCol}" IS NULL`,
        { table: r.table, col: r.numCol });
    } else if (which < 0.66) {
      return buildQuestion(5, "outlier", r.table,
        `Tampilkan 5 baris dengan nilai "${r.numCol}" TERTINGGI pada tabel "${r.table}" — gunakan ini untuk memeriksa kemungkinan nilai ekstrem/outlier.`,
        `SELECT * FROM "${r.table}" ORDER BY "${r.numCol}" DESC LIMIT 5`,
        { table: r.table, col: r.numCol },
        { orderMatters: true });
    } else if (which < 0.85) {
      return buildQuestion(5, "dataValidation", r.table,
        `Tampilkan baris pada tabel "${r.table}" yang nilai "${r.numCol}"-nya TIDAK WAJAR: bernilai NEGATIF (kurang dari 0).`,
        `SELECT * FROM "${r.table}" WHERE "${r.numCol}" < 0`,
        { col: r.numCol });
    } else if (r.dateCol) {
      return buildQuestion(5, "dateFormatCheck", r.table,
        `Temukan baris pada tabel "${r.table}" yang kolom "${r.dateCol}"-nya TIDAK memakai format standar YYYY-MM-DD.`,
        `SELECT * FROM "${r.table}" WHERE "${r.dateCol}" NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
        { col: r.dateCol });
    } else {
      return buildQuestion(5, "duplicate", r.table,
        `Temukan kandidat data duplikat di tabel "${r.table}": tampilkan "${r.idCol}" yang muncul LEBIH DARI 1 kali beserta jumlah kemunculannya.`,
        `SELECT "${r.idCol}", COUNT(*) as jumlah FROM "${r.table}" GROUP BY "${r.idCol}" HAVING COUNT(*) > 1`,
        { table: r.table, idCol: r.idCol });
    }
  }

  // ---- Level 3/4 templates against the relational sample DB ---------------
  function genLevel3() {
    const which = Math.random();
    if (which < 0.22) {
      return buildQuestion(3, "join", "orders",
        `Tampilkan nama pelanggan (customer_name), nama produk (product_name), dan jumlah (quantity) dari setiap order — gabungkan tabel "orders", "customers", dan "products".`,
        `SELECT c.customer_name, p.product_name, o.quantity FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN products p ON o.product_id = p.product_id`,
        {});
    } else if (which < 0.44) {
      return buildQuestion(3, "join", "orders",
        `Tampilkan nama pelanggan (customer_name) beserta TOTAL nilai order-nya (SUM total_amount), urutkan dari yang TERBESAR, tampilkan 5 pelanggan teratas.`,
        `SELECT c.customer_name, SUM(o.total_amount) as total FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.customer_name ORDER BY total DESC LIMIT 5`,
        {}, { orderMatters: true });
    } else if (which < 0.62) {
      return buildQuestion(3, "leftJoin", "orders",
        `Tampilkan SEMUA pelanggan (customer_name) beserta jumlah order yang pernah mereka buat — termasuk pelanggan yang BELUM PERNAH order sekalipun (tampil sebagai 0).`,
        `SELECT c.customer_name, COUNT(o.order_id) as jumlah_order FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_name`,
        {});
    } else if (which < 0.81) {
      return buildQuestion(3, "selfJoin", "employees",
        `Tampilkan nama setiap karyawan (employee_name) beserta nama ATASANNYA (dari tabel "employees" juga, cari lewat manager_id). Karyawan tanpa atasan boleh tampil dengan nama atasan kosong.`,
        `SELECT e.employee_name, m.employee_name as manager_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.employee_id`,
        {});
    } else {
      const region = pickDistinctValue("employees", "region") || "Jawa Barat";
      return buildQuestion(3, "joinComplex", "orders",
        `Tampilkan order_id, employee_name, dan total_amount HANYA untuk order yang diproses oleh karyawan dari region '${region}' — tambahkan syarat region langsung di kondisi ON saat JOIN.`,
        `SELECT o.order_id, e.employee_name, o.total_amount FROM orders o JOIN employees e ON o.employee_id = e.employee_id AND e.region = '${region}'`,
        { val: region });
    }
  }

  function genLevel4() {
    const which = Math.random();
    if (which < 0.17) {
      return buildQuestion(4, "cte", "orders",
        `Gunakan CTE untuk menghitung total penjualan (SUM total_amount) per employee_id dari tabel "orders", lalu tampilkan hanya employee yang total penjualannya LEBIH BESAR dari rata-rata seluruh employee.`,
        `WITH ringkasan AS (SELECT employee_id, SUM(total_amount) as total FROM orders GROUP BY employee_id) SELECT employee_id, total FROM ringkasan WHERE total > (SELECT AVG(total) FROM ringkasan)`,
        {});
    } else if (which < 0.34) {
      return buildQuestion(4, "window", "orders",
        `Tampilkan product_id, total quantity terjual, dan RANKING-nya (RANK) berdasarkan total quantity terbesar — dari tabel "orders", dikelompokkan per product_id.`,
        `SELECT product_id, SUM(quantity) as total_qty, RANK() OVER (ORDER BY SUM(quantity) DESC) as ranking FROM orders GROUP BY product_id`,
        {});
    } else if (which < 0.5) {
      return buildQuestion(4, "window", "orders",
        `Untuk setiap pelanggan (customer_id), beri nomor urut (ROW_NUMBER) pada order-order mereka berdasarkan order_date dari yang PALING AWAL. Tampilkan customer_id, order_id, order_date, dan nomor urutnya.`,
        `SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date ASC) as urutan FROM orders`,
        {});
    } else if (which < 0.66) {
      return buildQuestion(4, "subquery", "orders",
        `Tampilkan order_id dan total_amount dari tabel "orders" yang total_amount-nya LEBIH BESAR dari rata-rata seluruh total_amount (gunakan subquery non-correlated, TANPA CTE).`,
        `SELECT order_id, total_amount FROM orders WHERE total_amount > (SELECT AVG(total_amount) FROM orders)`,
        {});
    } else if (which < 0.82) {
      return buildQuestion(4, "unionAll", "orders",
        `Gabungkan seluruh product_id dari tabel "orders" dengan seluruh product_id dari tabel "products" menjadi satu daftar, TANPA menghapus duplikat (gunakan UNION ALL).`,
        `SELECT product_id FROM orders UNION ALL SELECT product_id FROM products`,
        {});
    } else {
      return buildQuestion(4, "exists", "customers",
        `Tampilkan customer_name dari tabel "customers" yang PERNAH melakukan minimal satu order (gunakan EXISTS, bukan JOIN).`,
        `SELECT customer_name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)`,
        {});
    }
  }

  /**
   * category is required for levels 1/2/5 (flat dataset categories);
   * ignored for levels 3/4 (always uses the relational sample DB).
   */
  function generateQuestion(level, category) {
    switch (Number(level)) {
      case 1: return genLevel1(category || "sales");
      case 2: return genLevel2(category || "sales");
      case 3: return genLevel3();
      case 4: return genLevel4();
      case 5: return genLevel5(category || "sales");
      default: return genLevel1(category || "sales");
    }
  }

  global.SQLPQ_Questions = { generateQuestion, ROLE_MAP, CONCEPTS, pickDistinctValue, pickDistinctValues, numericRange };
})(window);
