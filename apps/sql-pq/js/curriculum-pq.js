/**
 * curriculum-pq.js — Materi Power Query (ETL: Extract → Transform → Load)
 */
(function (global) {
  "use strict";
  function L(id, title, syntax, example, explain, sim) { return { id, title, syntax, example, explain, sim: sim || null }; }

  const BASIC = [
    L("import-excel", "Import Excel", "Get Data → Excel Workbook → pilih sheet/table", "Source = Excel.Workbook(File.Contents(\"data.xlsx\"), null, true)", "Langkah pertama ETL: mengambil data mentah dari file Excel ke Power Query editor."),
    L("import-csv", "Import CSV", "Get Data → Text/CSV", "Source = Csv.Document(File.Contents(\"data.csv\"),[Delimiter=\",\"])", "Mirip import Excel, tapi untuk file CSV — Power Query otomatis mendeteksi delimiter & tipe kolom."),
    L("import-folder", "Import Folder", "Get Data → Folder → Combine Files", "Source = Folder.Files(\"C:\\Data\\Penjualan\")", "Menggabungkan banyak file dengan struktur sama (mis. laporan bulanan) sekaligus dari satu folder."),
    L("import-table", "Import Table", "Get Data → From Table/Range (dari worksheet aktif)", "Source = Excel.CurrentWorkbook(){[Name=\"TabelPenjualan\"]}[Content]", "Mengambil data dari tabel Excel yang sudah didefinisikan (Ctrl+T) di workbook yang sama."),
    L("data-preview", "Data Preview", "Panel preview di Power Query Editor", "-- lihat 1000 baris pertama sebagai sampel", "Power Query menampilkan sampel data sebelum semua langkah transformasi diterapkan ke data penuh."),
    L("change-type", "Change Data Type", "Klik ikon tipe kolom → pilih tipe baru", "= Table.TransformColumnTypes(Source,{{\"Tanggal\", type date}})", "Menentukan tipe data tiap kolom (Text, Whole Number, Decimal, Date, dst.) agar perhitungan & sorting berjalan benar.", "changeType"),
    L("rename-column", "Rename Column", "Klik kanan header kolom → Rename", "= Table.RenameColumns(Source,{{\"Nm\", \"Nama\"}})", "Mengganti nama kolom agar lebih jelas / konsisten dengan standar penamaan.", "renameColumn"),
    L("remove-column", "Remove Column", "Pilih kolom → Home → Remove Columns", "= Table.RemoveColumns(Source,{\"Kolom_Tidak_Dipakai\"})", "Membuang kolom yang tidak diperlukan agar dataset lebih ringkas.", "removeColumns"),
    L("remove-rows", "Remove Rows", "Home → Remove Rows → Remove Top/Bottom Rows", "= Table.Skip(Source, 1)", "Menghapus baris tertentu, misalnya baris header ganda atau baris kosong di awal file."),
    L("keep-rows", "Keep Rows", "Home → Keep Rows → Keep Top Rows", "= Table.FirstN(Source, 100)", "Kebalikan Remove Rows — hanya menyimpan sejumlah baris tertentu (berguna untuk sampling)."),
    L("sort", "Sort", "Klik panah pada header kolom → Sort Ascending/Descending", "= Table.Sort(Source,{{\"Total_Sales\", Order.Descending}})", "Mengurutkan seluruh tabel berdasarkan satu atau beberapa kolom.", "sort"),
    L("filter", "Filter", "Klik panah pada header kolom → Filter", "= Table.SelectRows(Source, each [Region] = \"Bali\")", "Menyaring baris berdasarkan kondisi pada satu atau beberapa kolom.", "filter"),
    L("replace-values", "Replace Values", "Klik kanan kolom → Replace Values", "= Table.ReplaceValue(Source,\"N/A\",null,Replacer.ReplaceText,{\"Kolom\"})", "Mengganti nilai tertentu (mis. teks 'N/A') dengan nilai lain di seluruh kolom.", "replaceValues")
  ];

  const CLEANING = [
    L("remove-duplicates", "Remove Duplicates", "Pilih kolom → Remove Rows → Remove Duplicates", "= Table.Distinct(Source)", "Menghapus baris yang persis sama, sering jadi langkah pertama data cleaning.", "removeDuplicates"),
    L("handle-null", "Handle Null", "Filter kolom → hilangkan/ganti null, atau Fill Down/Up", "= Table.SelectRows(Source, each [Kolom] <> null)", "Menentukan strategi untuk data kosong: dihapus, diisi nilai default, atau diisi dari baris sekitarnya."),
    L("fill-down", "Fill Down", "Pilih kolom → Transform → Fill → Down", "= Table.FillDown(Source,{\"Kategori\"})", "Mengisi sel kosong dengan nilai TERAKHIR yang terisi DI ATASNYA — umum pada laporan hasil export yang \"digabung\" sel-nya.", "fillDown"),
    L("fill-up", "Fill Up", "Pilih kolom → Transform → Fill → Up", "= Table.FillUp(Source,{\"Kategori\"})", "Kebalikan Fill Down — mengisi sel kosong dengan nilai terdekat DI BAWAHNYA."),
    L("split-column", "Split Column", "Pilih kolom → Split Column → By Delimiter", "= Table.SplitColumn(Source,\"Kota_Provinsi\",Splitter.SplitTextByDelimiter(\",\"),{\"Kota\",\"Provinsi\"})", "Memecah satu kolom menjadi beberapa kolom berdasarkan pemisah (koma, spasi, dsb).", "splitColumn"),
    L("merge-column", "Merge Column", "Pilih ≥2 kolom → Transform → Merge Columns", "= Table.CombineColumns(Source,{\"Kota\",\"Provinsi\"},Combiner.CombineTextByDelimiter(\", \"),\"Alamat\")", "Menggabungkan beberapa kolom menjadi satu kolom teks.", "mergeColumn"),
    L("trim", "Trim", "Pilih kolom → Transform → Format → Trim", "= Table.TransformColumns(Source,{{\"Nama\", Text.Trim}})", "Menghapus spasi berlebih di awal/akhir teks — sumber bug klasik saat membandingkan/menggabungkan data.", "trim"),
    L("clean", "Clean", "Pilih kolom → Transform → Format → Clean", "= Table.TransformColumns(Source,{{\"Nama\", Text.Clean}})", "Membuang karakter non-printable (kontrol) yang kadang ikut terbawa saat copy-paste atau export dari sistem lain."),
    L("extract-text", "Extract Text", "Pilih kolom → Transform → Extract → First/Last Characters", "= Table.TransformColumns(Source,{{\"Kode\", each Text.Start(_,3)}})", "Mengambil sebagian teks dari sebuah kolom, misalnya 3 karakter pertama sebagai kode kategori."),
    L("replace-text", "Replace Text", "Klik kanan kolom → Replace Values (mode teks)", "= Table.ReplaceValue(Source,\"Jkt\",\"Jakarta\",Replacer.ReplaceText,{\"Kota\"})", "Mengganti potongan teks tertentu di dalam kolom, termasuk untuk menstandarkan singkatan."),
    L("format-date", "Format Date", "Pilih kolom tanggal → Change Type → Date (Locale)", "= Table.TransformColumnTypes(Source,{{\"Tanggal\", type date}}, \"id-ID\")", "Menstandarkan berbagai format tanggal (DD/MM/YYYY, MM-DD-YYYY, dsb) menjadi satu format Date yang konsisten."),
    L("format-number", "Format Number", "Pilih kolom → Change Type → Decimal/Whole Number", "= Table.TransformColumnTypes(Source,{{\"Harga\", type number}})", "Memastikan kolom angka benar-benar bertipe numerik, bukan teks — supaya bisa dijumlah & dihitung.")
  ];

  const TRANSFORM = [
    L("custom-column", "Add Custom Column", "Add Column → Custom Column", "= Table.AddColumn(Source,\"Subtotal\", each [Quantity]*[Unit_Price])", "Membuat kolom baru hasil rumus/ekspresi M yang merujuk kolom lain.", "customColumn"),
    L("conditional-column", "Conditional Column", "Add Column → Conditional Column", "= Table.AddColumn(Source,\"Kategori\", each if [Total_Sales] > 1000000 then \"Besar\" else \"Kecil\")", "Membuat kolom baru berdasarkan aturan IF/THEN/ELSE tanpa menulis M manual (walau hasilnya tetap kode M)."),
    L("index-column", "Index Column", "Add Column → Index Column", "= Table.AddIndexColumn(Source,\"No\",1,1)", "Menambahkan kolom nomor urut — berguna sebagai ID sementara atau untuk menjaga urutan asli."),
    L("group-by", "Group By", "Transform → Group By", "= Table.Group(Source,{\"Category\"},{{\"TotalSales\", each List.Sum([Total_Sales]), type number}})", "Meringkas data per kelompok — versi visual dari GROUP BY di SQL.", "groupBy"),
    L("pivot-column", "Pivot Column", "Transform → Pivot Column", "= Table.Pivot(Source, List.Distinct(Source[Category]), \"Category\", \"Total_Sales\")", "Mengubah nilai unik dari satu kolom menjadi header kolom baru — dari format panjang (long) ke lebar (wide).", "pivot"),
    L("unpivot-column", "Unpivot Column", "Pilih kolom → Transform → Unpivot Columns", "= Table.UnpivotOtherColumns(Source,{\"Product\"},\"Bulan\",\"Nilai\")", "Kebalikan Pivot — mengubah format lebar menjadi panjang, biasanya langkah wajib sebelum data dianalisis lebih lanjut.", "unpivot"),
    L("transpose", "Transpose", "Transform → Transpose", "= Table.Transpose(Source)", "Menukar posisi baris menjadi kolom dan sebaliknya — jarang dipakai tapi berguna untuk data yang terbalik orientasinya."),
    L("merge-queries", "Merge Queries", "Home → Merge Queries (mirip JOIN SQL)", "= Table.NestedJoin(Sales, \"Customer_ID\", Customers, \"Customer_ID\", \"CustomerData\", JoinKind.LeftOuter)", "Menggabungkan dua query berdasarkan kolom kunci — konsepnya sama persis dengan JOIN di SQL.", "mergeQueries"),
    L("append-queries", "Append Queries", "Home → Append Queries", "= Table.Combine({SalesJanuari, SalesFebruari})", "Menumpuk (menyatukan secara vertikal) dua atau lebih query yang strukturnya sama — mirip UNION ALL di SQL.", "appendQueries")
  ];

  const ADVANCED = [
    L("m-let-in", "let ... in", "let\n  langkah1 = ...,\n  langkah2 = ...\nin\n  langkah2", "let\n    Source = Sales,\n    Filtered = Table.SelectRows(Source, each [Region]=\"Bali\")\nin\n    Filtered", "Setiap query M adalah satu blok let...in: mendefinisikan variabel langkah demi langkah, lalu 'in' menentukan hasil akhirnya."),
    L("m-variables", "Variables", "namaVariabel = ekspresi,", "let\n    Sumber = Source,\n    Bersih = Table.Distinct(Sumber)\nin\n    Bersih", "Tiap baris di dalam let adalah variabel yang bisa dipakai oleh baris berikutnya — inilah yang membentuk daftar \"Applied Steps\"."),
    L("m-functions", "Functions (custom)", "(parameter) => ekspresi", "let\n    Pajak = (harga as number) => harga * 0.11\nin\n    Pajak(100000)", "M mendukung fungsi kustom — berguna untuk logika yang dipakai berulang kali di banyak query."),
    L("m-each", "each", "each [Kolom] > nilai   -- sintaks singkat untuk (_) => ...", "Table.SelectRows(Source, each [Total_Sales] > 1000000)", "'each' adalah singkatan untuk membuat fungsi anonim satu-baris yang dijalankan per baris tabel."),
    L("t-select-rows", "Table.SelectRows", "Table.SelectRows(tabel, kondisi)", "Table.SelectRows(Source, each [Status] = \"Aktif\")", "Fungsi M untuk memfilter baris — inilah yang dihasilkan otomatis saat Anda klik Filter di UI."),
    L("t-add-column", "Table.AddColumn", "Table.AddColumn(tabel, \"nama\", fungsi)", "Table.AddColumn(Source, \"Total\", each [Qty]*[Harga])", "Menambahkan kolom baru hasil ekspresi per baris."),
    L("t-transform-columns", "Table.TransformColumns", "Table.TransformColumns(tabel, {{\"kolom\", fungsi}})", "Table.TransformColumns(Source, {{\"Nama\", Text.Upper}})", "Mengubah ISI kolom yang sudah ada (bukan menambah kolom baru) menggunakan sebuah fungsi transformasi."),
    L("t-group", "Table.Group", "Table.Group(tabel, {kolom_grup}, {{\"nama\", agregasi, tipe}})", "Table.Group(Source, {\"Region\"}, {{\"Total\", each List.Sum([Total_Sales]), type number}})", "Versi M dari GROUP BY — mengelompokkan baris lalu menghitung agregasi per kelompok."),
    L("t-join", "Table.Join / NestedJoin", "Table.NestedJoin(kiri, kunciKiri, kanan, kunciKanan, \"kolomBaru\", JoinKind)", "Table.NestedJoin(Orders, \"customer_id\", Customers, \"customer_id\", \"Cust\", JoinKind.LeftOuter)", "Menggabungkan dua tabel berdasarkan kolom kunci — hasilnya kolom baru berisi tabel bersarang yang bisa di-expand."),
    L("t-combine", "Table.Combine", "Table.Combine({tabel1, tabel2, ...})", "Table.Combine({SalesQ1, SalesQ2, SalesQ3, SalesQ4})", "Menumpuk beberapa tabel dengan struktur sama menjadi satu tabel — dasar dari fitur Append Queries."),
    L("m-list-fn", "List Functions", "List.Sum, List.Average, List.Max, List.Distinct, dst.", "List.Sum({10,20,30})", "Fungsi untuk bekerja dengan List (daftar nilai) — sering dipakai di dalam Table.Group untuk menghitung agregasi."),
    L("m-text-fn", "Text Functions", "Text.Upper, Text.Trim, Text.Start, Text.Contains, dst.", "Text.Contains([Product], \"Laptop\")", "Fungsi manipulasi teks di level M — dasar dari banyak langkah data cleaning."),
    L("m-date-fn", "Date Functions", "Date.Year, Date.Month, Date.AddDays, dst.", "Date.Year([Tanggal])", "Fungsi untuk mengekstrak atau memanipulasi bagian tanggal di level M."),
    L("m-error-handling", "Error Handling", "try ekspresi otherwise nilai_pengganti", "= Table.AddColumn(Source, \"Aman\", each try [A]/[B] otherwise 0)", "'try ... otherwise' menangkap error (mis. pembagian dengan nol) dan menggantinya dengan nilai default, supaya query tidak berhenti total.")
  ];

  global.SQLPQ_CurriculumPQ = {
    groups: [
      { key: "basic", title: "Basic (Extract & Setup)", topics: BASIC },
      { key: "cleaning", title: "Data Cleaning", topics: CLEANING },
      { key: "transform", title: "Transformation", topics: TRANSFORM },
      { key: "advanced", title: "Advanced — Bahasa M", topics: ADVANCED }
    ]
  };
})(window);
