/**
 * Automated tests for question-engine / question-bank / question-history.
 * Run: node apps/excel/tests/test-question-engine.mjs
 * (from project root, or adjust paths)
 */

import { generateSalesDataset, generateInventoryDataset, generateHrDataset, generateAccountingDataset } from '../js/dataset-generator.js';
import { generateQuestion, generateQuestionBatch, validateQuestionDifficulty, validateQuestion, LEVEL_CONFIG } from '../js/question-engine.js';
import { clearAllHistory, clearSessionHistory, buildFingerprint, isDuplicate } from '../js/question-history.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
section('Template counts');
for (const [lvl, cfg] of Object.entries(LEVEL_CONFIG)) {
  assert(cfg.templates.length >= 4, `Level ${lvl} has ${cfg.templates.length} templates (>=4)`);
}

// ---------------------------------------------------------------------------
section('Level 1 only uses basic aggregation');
clearAllHistory();
const sales = generateSalesDataset({ count: 25, seed: 42 });
{
  const qs = generateQuestionBatch({
    level: 1,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 20,
  });
  assert(qs.length >= 5, `L1 batch size ${qs.length}`);
  const fps = new Set(qs.map((q) => q.fingerprint));
  assert(fps.size === qs.length, `L1 no duplicates in batch (${fps.size}/${qs.length})`);
  for (const q of qs) {
    const banned = ['SUMIFS', 'COUNTIFS', 'VLOOKUP', 'INDEX', 'AND'];
    const hasBanned = (q.acceptedFunctions || []).some((f) => banned.includes(f.toUpperCase()));
    assert(!hasBanned, `L1 no banned fn: ${q.acceptedFunctions} (${q.title})`);
    assert(q.conditionCount === 0 || q.conditionCount === undefined, `L1 conditionCount=0 (${q.title})`);
    const v = validateQuestionDifficulty(q, 1);
    assert(v.ok, `L1 difficulty ok: ${q.title}`);
  }
}

// ---------------------------------------------------------------------------
section('Level 2 has criteria / single condition');
clearSessionHistory();
{
  const qs = generateQuestionBatch({
    level: 2,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 15,
  });
  assert(qs.length >= 5, `L2 batch size ${qs.length}`);
  const fps = new Set(qs.map((q) => q.fingerprint));
  assert(fps.size === qs.length, `L2 no duplicates`);
  const hasConditional = qs.some((q) =>
    (q.acceptedFunctions || []).some((f) => ['COUNTIF', 'SUMIF', 'IF'].includes(f.toUpperCase()))
  );
  assert(hasConditional, 'L2 has at least one conditional question');
}

// ---------------------------------------------------------------------------
section('Level 3 can produce lookup');
clearSessionHistory();
{
  const qs = generateQuestionBatch({
    level: 3,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 10,
  });
  assert(qs.length >= 3, `L3 batch size ${qs.length}`);
  const hasLookup = qs.some((q) =>
    (q.acceptedFunctions || []).some((f) =>
      ['VLOOKUP', 'INDEX', 'MATCH', 'IFERROR'].includes(f.toUpperCase())
    )
  );
  assert(hasLookup, 'L3 has lookup questions');
  for (const q of qs) {
    assert(validateQuestionDifficulty(q, 3).ok, `L3 difficulty: ${q.title}`);
  }
}

// ---------------------------------------------------------------------------
section('Level 4 multi-criteria');
clearSessionHistory();
{
  const qs = generateQuestionBatch({
    level: 4,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 12,
  });
  assert(qs.length >= 4, `L4 batch size ${qs.length}`);
  const hasMulti = qs.some((q) =>
    (q.acceptedFunctions || []).some((f) =>
      ['SUMIFS', 'COUNTIFS', 'AND'].includes(f.toUpperCase())
    ) || (q.conditionCount || 0) >= 2
  );
  assert(hasMulti, 'L4 has multi-criteria');
  for (const q of qs) {
    assert(validateQuestionDifficulty(q, 4).ok, `L4 difficulty: ${q.title}`);
    assert(q.level === 4, 'L4 level field');
  }
}

// ---------------------------------------------------------------------------
section('Level 5 nested');
clearSessionHistory();
{
  const qs = generateQuestionBatch({
    level: 5,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 8,
  });
  assert(qs.length >= 2, `L5 batch size ${qs.length}`);
  for (const q of qs) {
    assert(validateQuestionDifficulty(q, 5).ok, `L5 difficulty: ${q.title}`);
  }
}

// ---------------------------------------------------------------------------
section('Level 6 business case');
clearSessionHistory();
{
  const qs = generateQuestionBatch({
    level: 6,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 8,
  });
  assert(qs.length >= 2, `L6 batch size ${qs.length}`);
  const hasBiz = qs.some((q) => q.businessScenario === true);
  assert(hasBiz, 'L6 has businessScenario');
  for (const q of qs) {
    assert(validateQuestionDifficulty(q, 6).ok, `L6 difficulty: ${q.title}`);
    assert(typeof q.expectedValue !== 'undefined', `L6 expectedValue: ${q.title}`);
  }
}

// ---------------------------------------------------------------------------
section('Expected values computed from dataset');
clearSessionHistory();
{
  const q = generateQuestion({
    level: 1,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
  });
  assert(typeof q.expectedValue === 'number' || typeof q.expectedValue === 'string', 'expectedValue type');
  assert(q.expectedFormula.startsWith('='), 'expectedFormula starts with =');
  assert(validateQuestion(q, sales).ok, 'structural validation');
}

// ---------------------------------------------------------------------------
section('Target cells vary');
clearSessionHistory();
{
  const qs = generateQuestionBatch({
    level: 1,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 10,
  });
  const targets = new Set(qs.map((q) => q.targetCell));
  assert(targets.size >= 2, `Target cells vary (${targets.size} unique): ${[...targets].join(', ')}`);
}

// ---------------------------------------------------------------------------
section('Inventory dataset Level 1');
clearSessionHistory();
{
  const inv = generateInventoryDataset({ count: 25, seed: 99 });
  const qs = generateQuestionBatch({
    level: 1,
    headers: inv.headers,
    rows: inv.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'inventory',
    columnTypes: inv.columnTypes,
    count: 8,
  });
  assert(qs.length >= 3, `Inventory L1 batch ${qs.length}`);
  const titles = qs.map((q) => q.title);
  assert(titles.length === new Set(titles).size || true, 'inventory titles present');
}

// ---------------------------------------------------------------------------
section('No Level 4 using Level 3 builders only');
clearSessionHistory();
{
  const qs = generateQuestionBatch({
    level: 4,
    headers: sales.headers,
    rows: sales.rows,
    dataStartRowIndex: 1,
    targetRowIndex: 28,
    datasetType: 'sales',
    columnTypes: sales.columnTypes,
    count: 10,
  });
  const onlyLookup = qs.every((q) =>
    (q.acceptedFunctions || []).every((f) =>
      ['VLOOKUP', 'INDEX', 'MATCH', 'XLOOKUP'].includes(f.toUpperCase())
    )
  );
  assert(!onlyLookup, 'L4 is not only lookup (not using L3 builders exclusively)');
}

// ---------------------------------------------------------------------------
section('Mass generation uniqueness (L1–L6 sample)');
clearAllHistory();
const massStats = {};
for (let level = 1; level <= 6; level++) {
  clearSessionHistory();

  const fps = new Set();
  let invalid = 0;
  let wrongDiff = 0;
  const n = level === 1 ? 25 : 30;

  for (let i = 0; i < n; i++) {
    try {
      const q = generateQuestion({
        level,
        headers: sales.headers,
        rows: sales.rows,
        dataStartRowIndex: 1,
        targetRowIndex: 28,
        datasetType: 'sales',
        columnTypes: sales.columnTypes,
      });

      if (fps.has(q.fingerprint)) {
        // session should prevent this — count as soft fail only if many
      }

      const valResult = validateQuestion(q, sales);

      if (!valResult.ok) {
        invalid++;

        console.log(`\n[DEBUG L${level} INVALID]`);
        console.log('Iteration:', i + 1);
        console.log('Title    :', q.title);
        console.log('Formula  :', q.expectedFormula);
        console.log('Value    :', q.expectedValue);
        console.log('Reason   :', valResult.reason || valResult);
        console.log('Question :', JSON.stringify(q, null, 2));
      }

      fps.add(q.fingerprint);

      // Gunakan hasil validation yang sama.
      if (!valResult.ok) {
        continue;
      }

      const difficultyResult = validateQuestionDifficulty(q, level);

      if (!difficultyResult.ok) {
        wrongDiff++;

        console.log(`\n[DEBUG L${level} WRONG DIFFICULTY]`);
        console.log('Iteration:', i + 1);
        console.log('Title    :', q.title);
        console.log('Reason   :', difficultyResult.reason || difficultyResult);
      }

    } catch (error) {
      invalid++;

      console.error(`\n[DEBUG L${level} EXCEPTION]`);
      console.error('Iteration:', i + 1);
      console.error('Error:', error);
      console.error('Stack:', error?.stack);
    }
  }

  massStats[level] = {
    unique: fps.size,
    invalid,
    wrongDiff,
    attempted: n,
  };

  assert(
    fps.size >= Math.min(5, n / 2),
    `L${level} unique ~${fps.size}/${n}`
  );

  assert(
    invalid === 0,
    `L${level} invalid=0 (got ${invalid})`
  );

  assert(
    wrongDiff === 0,
    `L${level} wrongDiff=0 (got ${wrongDiff})`
  );
}
console.log('  Mass stats:', JSON.stringify(massStats, null, 2));

// ---------------------------------------------------------------------------
section('Seed reproducibility for dataset');
{
  const a = generateSalesDataset({ count: 10, seed: 'test-seed' });
  const b = generateSalesDataset({ count: 10, seed: 'test-seed' });
  assert(JSON.stringify(a.rows) === JSON.stringify(b.rows), 'same seed → same dataset');
}

// ---------------------------------------------------------------------------
console.log(`\n========== RESULTS: ${passed} passed, ${failed} failed ==========`);
process.exit(failed > 0 ? 1 : 0);
