/**
 * spreadsheet/syntax.js — helper sintaks rumus murni (pecah argumen, literal, kurung, pola pemanggilan fungsi)
 * (dipecah dari ../spreadsheet-engine.js; perilaku identik)
 */

// ============================================================================
// Evaluator rumus
// ============================================================================

export const FORMULA_CALL_RE = /^=\s*([A-Za-z]+)\s*\((.*)\)\s*$/s;

/**
 * Pisahkan argumen rumus dengan pemisah ',' ATAU ';' (mendukung kebiasaan lokal
 * yang memakai titik koma). Menghormati tanda kutip (string literal) DAN
 * kedalaman tanda kurung, supaya argumen dari fungsi bersarang seperti
 * IF(AND(H2>5,I2>1000),"Besar","Kecil") tidak ikut terpotong pada koma
 * milik AND(...) di dalamnya.
 */
export function splitArgs(argsString) {
  const args = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;
  for (let i = 0; i < argsString.length; i++) {
    const ch = argsString[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (!inQuotes) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if ((ch === ',' || ch === ';') && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim() !== '') args.push(current.trim());
  return args;
}

/** True jika string diapit tanda kutip ganda secara utuh, mis. '"Jawa Barat"'. */
export function isQuotedString(s) {
  return s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"';
}

export function unquote(s) {
  return s.slice(1, -1);
}

const NUMERIC_LITERAL_RE = /^-?\d+(\.\d+)?$/;

export function isNumericLiteral(s) {
  return NUMERIC_LITERAL_RE.test(s.trim());
}

/** True jika seluruh kedalaman tanda kurung pada string seimbang (dan tidak pernah negatif). */
function isBalancedParens(s) {
  let depth = 0;
  let inQuotes = false;
  for (const ch of s) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (inQuotes) continue;
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export const FUNCTION_CALL_SYNTAX_RE = /^([A-Za-z]+)\((.*)\)$/s;

/** True jika string SECARA UTUH berbentuk PEMANGGILAN FUNGSI, mis. "AND(H2>5,I2>1000)". */
export function isFunctionCallSyntax(s) {
  return FUNCTION_CALL_SYNTAX_RE.test(s) && isBalancedParens(s);
}
