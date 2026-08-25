/**
 * workbook-blueprint.js
 * ---------------------------------------------------------------------------
 * Tahap "Workbook Blueprint" dari arsitektur baru (Bagian 3):
 *
 *   Practice Configuration → Learning Content Generator → Workbook Blueprint
 *      → Workbook Renderer → Professional XLSX
 *
 * File ini HANYA menghasilkan objek data biasa (tidak menyentuh ExcelJS sama
 * sekali) yang mendeskripsikan seluruh isi & struktur workbook: sheet apa
 * saja, judul, instruksi, tiap soal, dataset, kunci jawaban, dan panduan
 * fungsi. workbook-renderer.js yang nanti menerjemahkan blueprint ini jadi
 * file .xlsx sungguhan. Pemisahan ini membuat blueprint mudah diuji
 * (tests/test-workbook-blueprint.mjs) tanpa perlu menjalankan ExcelJS.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const OBJECTIVE_BY_DATASET = {
    sales: 'Melatih kemampuan menganalisis data penjualan menggunakan rumus Excel — mulai dari agregasi dasar sampai pencarian data bertingkat.',
    accounting: 'Melatih kemampuan mengolah data transaksi akuntansi menggunakan rumus Excel untuk mendukung penyusunan laporan keuangan.',
    hr: 'Melatih kemampuan mengolah data kepegawaian menggunakan rumus Excel untuk kebutuhan analisis dan pelaporan HR.',
    inventory: 'Melatih kemampuan mengolah data persediaan barang menggunakan rumus Excel untuk mendukung pengambilan keputusan operasional.',
  };

  const INSTRUCTIONS_GENERIC = [
    'Kerjakan setiap soal langsung di lembar "Latihan" pada kolom yang sudah ditandai sebagai area jawaban (berlatar kuning).',
    'Gunakan data pada lembar "Dataset" sebagai sumber — jangan mengetik ulang angka secara manual, gunakan referensi sel/rentang.',
    'Setiap soal mencantumkan fungsi Excel yang disarankan; kamu boleh memakai fungsi lain selama hasilnya benar.',
    'Lembar "Panduan Fungsi" berisi sintaks dan contoh setiap fungsi yang dipakai pada paket soal ini — buka kalau butuh bantuan.',
    'Lembar "Kunci Jawaban" sengaja disembunyikan (klik kanan pada tab sheet → Unhide) — coba kerjakan dulu sebelum melihatnya.',
  ];

  function safeFormula(f) {
    return (f && String(f).startsWith('=')) ? String(f) : `=${f || ''}`;
  }

  /**
   * Membangun Workbook Blueprint dari state aplikasi saat ini.
   * @param {Object} params
   * @param {Object} params.dataset - state.dataset ({headers, columnTypes, rows, meta})
   * @param {Array}  params.questions - state.practiceQuestions
   * @param {number} params.level
   * @param {string} params.levelLabel
   * @param {string} params.datasetType
   * @param {Array}  params.formulaCatalog - seluruh entri data/formula-catalog.json (boleh kosong)
   * @returns {Object} blueprint
   */
  function buildWorkbookBlueprint({ dataset, questions, level, levelLabel, datasetType, formulaCatalog = [] }) {
    if (!dataset) throw new Error('buildWorkbookBlueprint: dataset kosong.');

    const datasetLabel = dataset.meta?.datasetLabel || datasetType;
    const generatedAt = new Date();

    // ---- meta ----
    const meta = {
      workbookTitle: 'EXCEL PRACTICE',
      datasetLabel,
      datasetType,
      level,
      levelLabel,
      objective: OBJECTIVE_BY_DATASET[datasetType] || OBJECTIVE_BY_DATASET.sales,
      instructions: INSTRUCTIONS_GENERIC,
      generatedAt,
      seed: dataset.meta?.seed,
      rowCount: dataset.rows.length,
      questionCount: questions.length,
    };

    // ---- practice (soal + area jawaban) ----
    // Satu-satunya planner untuk alamat sel Sheet "Latihan". Renderer dilarang
    // menghitung alamat jawaban sendiri; ia hanya merender kontrak ini.
    const planPracticeLayout = (items) => {
      // Dengan layout renderer saat ini, baris 1..13 dipakai header, tujuan,
      // empat petunjuk, dan spacer; soal pertama mulai pada baris 14.
      let questionStartRow = 14;
      return items.map((q) => {
        const hasSuggestedFunctions = (q.acceptedFunctions || []).length > 0;
        const hasHint = Boolean(q.hints && q.hints[0]);
        const answerRow = questionStartRow + 2 + (hasSuggestedFunctions ? 1 : 0);
        const resultRow = answerRow + 1;
        const layout = {
          questionStartRow,
          answerCell: `D${answerRow}`,
          answerRange: `D${answerRow}:J${answerRow}`,
          resultCell: `D${resultRow}`,
          resultRange: `D${resultRow}:F${resultRow}`,
        };
        questionStartRow = resultRow + 1 + (hasHint ? 1 : 0) + 1;
        return layout;
      });
    };
    const practiceLayout = planPracticeLayout(questions);

    const practiceQuestions = questions.map((q, i) => ({
      number: i + 1,
      title: q.title || `Soal ${i + 1}`,
      instruction: q.instruction || '',
      suggestedFunctions: q.acceptedFunctions || [],
      hint: (q.hints && q.hints[0]) || '',
      points: q.points || 0,
      // targetCell dipertahankan sebagai alias kompatibilitas untuk consumer lama.
      targetCell: practiceLayout[i].answerCell,
      answerCell: practiceLayout[i].answerCell,
      answerRange: practiceLayout[i].answerRange,
      resultCell: practiceLayout[i].resultCell,
      resultRange: practiceLayout[i].resultRange,
    }));

    // ---- dataset sheet ----
    const semantics = dataset.headers.map((h, i) =>
      window.WorkbookExport.inferColumnSemantic(h, dataset.columnTypes?.[i], dataset.rows.map((r) => r[i]))
    );
    const datasetBlock = {
      headers: dataset.headers,
      columnTypes: dataset.columnTypes || [],
      semantics,
      rows: dataset.rows,
    };

    // ---- answer key sheet ----
    const answerKey = {
      questions: questions.map((q, i) => ({
        number: i + 1,
        instruction: q.instruction || '',
        expectedFormula: safeFormula(q.expectedFormula),
        expectedValue: q.expectedValue,
        explanation: q.explanation || '',
        acceptedFunctions: (q.acceptedFunctions || []).join(', '),
        answerCell: practiceLayout[i].answerCell,
        answerRange: practiceLayout[i].answerRange,
        resultCell: practiceLayout[i].resultCell,
      })),
    };

    // ---- guide sheet: fungsi unik yang benar-benar dipakai paket soal ini ----
    const usedFunctionNames = Array.from(new Set(
      questions.flatMap((q) => q.acceptedFunctions || [])
    ));
    const catalogByName = new Map(formulaCatalog.map((f) => [f.name.toUpperCase(), f]));
    const FALLBACK_ENTRIES = {
      XLOOKUP: {
        name: 'XLOOKUP', category: 'Pencarian', syntax: 'XLOOKUP(nilai_dicari, larik_pencarian, larik_hasil, [jika_tidak_ada])',
        description: 'Mencari suatu nilai pada satu larik dan mengembalikan nilai pada larik lain di posisi yang sama — pengganti modern VLOOKUP/INDEX-MATCH.',
        example: '=XLOOKUP(A2,Dataset!D:D,Dataset!E:E)',
        commonErrors: ['Larik pencarian dan larik hasil berbeda jumlah baris.', 'Belum tersedia di Excel versi lama (sebelum Microsoft 365 / Excel 2021).'],
      },
    };
    const guideEntries = usedFunctionNames.map((name) => {
      const found = catalogByName.get(name.toUpperCase()) || FALLBACK_ENTRIES[name.toUpperCase()];
      if (found) return found;
      return { name, category: 'Lainnya', syntax: `${name}(...)`, description: 'Deskripsi belum tersedia di katalog rumus.', example: `=${name}(...)`, commonErrors: [] };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // ---- helper sheet (metadata teknis, disembunyikan sangat rapat) ----
    const helper = {
      generatorVersion: 'workbook-blueprint v1',
      datasetType,
      datasetSeed: dataset.meta?.seed,
      datasetSeedNumber: dataset.meta?.seedNumber,
      level,
      questionCount: questions.length,
      questionFingerprints: questions.map((q) => q.fingerprint).filter(Boolean),
      answerCells: practiceLayout.map((item) => item.answerCell),
      resultCells: practiceLayout.map((item) => item.resultCell),
      generatedAt: generatedAt.toISOString(),
    };

    return { meta, practice: { questions: practiceQuestions }, dataset: datasetBlock, answerKey, guide: { entries: guideEntries }, helper };
  }

  window.WorkbookExport = window.WorkbookExport || {};
  window.WorkbookExport.buildWorkbookBlueprint = buildWorkbookBlueprint;
})();
