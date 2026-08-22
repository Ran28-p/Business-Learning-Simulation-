/**
 * question-generator.js
 * Compatibility layer — delegates to question-engine.js.
 * Keeps the old export names so app.js continues to work without a full rewrite.
 */

import { generateQuestion, generateQuestionBatch, clearSessionHistory } from './question-engine.js';

/**
 * @deprecated Use generateQuestion from question-engine.js
 */
export function generateLevel1Question(params) {
  return generateQuestion({
    level: 1,
    headers: params.headers,
    rows: params.rows,
    dataStartRowIndex: params.dataStartRowIndex,
    targetRowIndex: params.targetRowIndex,
    datasetType: params.datasetType || 'sales',
    columnTypes: params.columnTypes || [],
  });
}

/**
 * @deprecated Use generateQuestion from question-engine.js
 */
export function generateLevel2Question(params) {
  return generateQuestion({
    level: 2,
    headers: params.headers,
    rows: params.rows,
    dataStartRowIndex: params.dataStartRowIndex,
    targetRowIndex: params.targetRowIndex,
    datasetType: params.datasetType || 'sales',
    columnTypes: params.columnTypes || [],
  });
}

/**
 * Handles Level 3–6. Old signature passed `level` for higher levels.
 * @deprecated Use generateQuestion from question-engine.js
 */
export function generateLevel3Question(params) {
  const level = params.level >= 3 ? params.level : 3;
  return generateQuestion({
    level,
    headers: params.headers,
    rows: params.rows,
    dataStartRowIndex: params.dataStartRowIndex,
    targetRowIndex: params.targetRowIndex,
    datasetType: params.datasetType || 'sales',
    columnTypes: params.columnTypes || [],
  });
}

/**
 * Preferred entry point for new code.
 */
export function generateQuestionForLevel(params) {
  const level = params.level || 1;
  return generateQuestion({
    level,
    headers: params.headers,
    rows: params.rows,
    dataStartRowIndex: params.dataStartRowIndex,
    targetRowIndex: params.targetRowIndex,
    datasetType: params.datasetType || 'sales',
    columnTypes: params.columnTypes || [],
  });
}

export { generateQuestionBatch, clearSessionHistory };
