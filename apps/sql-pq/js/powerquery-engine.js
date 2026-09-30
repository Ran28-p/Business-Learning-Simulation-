/**
 * powerquery-engine.js
 * Simulasi transformasi Power Query murni di JavaScript (tanpa Excel/Power BI
 * sungguhan). Tabel direpresentasikan sebagai {columns:[{name,type}], rows:[{}]}.
 * Setiap fungsi transform() TIDAK mengubah tabel asli — mengembalikan tabel baru,
 * sama seperti sifat "immutable steps" pada Power Query asli.
 */
(function (global) {
  "use strict";

  function cloneTable(t) {
    return { columns: t.columns.map((c) => Object.assign({}, c)), rows: t.rows.map((r) => Object.assign({}, r)) };
  }

  function fmtVal(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "number") return String(v);
    return JSON.stringify(String(v));
  }

  // ---- Safe formula parser/evaluator: "[Quantity] * [Unit_Price]" ---------
  // Deliberately does NOT use eval()/new Function() — the formula is
  // tokenized and parsed into a small AST by hand, so the only things it can
  // ever do are: read a [Column] value from the current row, combine numbers
  // with + - * /, and parenthesize. There is no way to reach arbitrary JS
  // (e.g. `.constructor`, property access, function calls) through this path.
  function tokenizeFormula(expr) {
    const tokens = [];
    let i = 0;
    const n = expr.length;
    while (i < n) {
      const c = expr[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "[") {
        const end = expr.indexOf("]", i);
        if (end === -1) throw new Error("Tanda kurung siku '[' tidak ditutup.");
        tokens.push({ type: "COL", value: expr.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      if (c === '"' || c === "'") {
        const quote = c; let j = i + 1, s = "";
        while (j < n && expr[j] !== quote) { s += expr[j]; j++; }
        if (j >= n) throw new Error("String tidak ditutup dengan tanda kutip.");
        tokens.push({ type: "STR", value: s });
        i = j + 1;
        continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i, s = "";
        while (j < n && /[0-9.]/.test(expr[j])) { s += expr[j]; j++; }
        if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Angka tidak valid: " + s);
        tokens.push({ type: "NUM", value: parseFloat(s) });
        i = j;
        continue;
      }
      if ("+-*/()".indexOf(c) !== -1) { tokens.push({ type: c }); i++; continue; }
      throw new Error("Karakter tidak dikenali dalam ekspresi: '" + c + "'");
    }
    return tokens;
  }

  function parseFormula(expr) {
    const tokens = tokenizeFormula(expr);
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function parseExpr() {
      let node = parseTerm();
      while (peek() && (peek().type === "+" || peek().type === "-")) {
        const op = next().type;
        node = { type: "bin", op, left: node, right: parseTerm() };
      }
      return node;
    }
    function parseTerm() {
      let node = parseFactor();
      while (peek() && (peek().type === "*" || peek().type === "/")) {
        const op = next().type;
        node = { type: "bin", op, left: node, right: parseFactor() };
      }
      return node;
    }
    function parseFactor() {
      const t = peek();
      if (!t) throw new Error("Ekspresi tidak lengkap — ada operator tanpa nilai setelahnya.");
      if (t.type === "-") { next(); return { type: "neg", expr: parseFactor() }; }
      if (t.type === "+") { next(); return parseFactor(); }
      if (t.type === "(") {
        next();
        const node = parseExpr();
        if (!peek() || peek().type !== ")") throw new Error("Tanda kurung '(' tidak ditutup.");
        next();
        return node;
      }
      if (t.type === "NUM") { next(); return { type: "num", value: t.value }; }
      if (t.type === "STR") { next(); return { type: "str", value: t.value }; }
      if (t.type === "COL") { next(); return { type: "col", name: t.value }; }
      throw new Error("Token tidak terduga dalam ekspresi, dekat: '" + JSON.stringify(t) + "'");
    }

    const ast = parseExpr();
    if (pos < tokens.length) throw new Error("Ada karakter berlebih setelah ekspresi yang valid.");
    return ast;
  }

  function toNumber(v) {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    if (isNaN(n)) throw new Error('Nilai "' + v + '" bukan angka, tidak bisa dipakai dalam operasi matematika.');
    return n;
  }

  function evalAst(node, row) {
    switch (node.type) {
      case "num": return node.value;
      case "str": return node.value;
      case "col":
        if (!(node.name in row)) throw new Error('Kolom tidak ditemukan: "' + node.name + '"');
        return row[node.name];
      case "neg": return -toNumber(evalAst(node.expr, row));
      case "bin": {
        const l = evalAst(node.left, row), r = evalAst(node.right, row);
        if (node.op === "+") return toNumber(l) + toNumber(r);
        if (node.op === "-") return toNumber(l) - toNumber(r);
        if (node.op === "*") return toNumber(l) * toNumber(r);
        if (node.op === "/") { const d = toNumber(r); return d === 0 ? null : toNumber(l) / d; }
        throw new Error("Operator tidak dikenal: " + node.op);
      }
      default: throw new Error("Node AST tidak dikenal.");
    }
  }

  function collectColumnRefs(node, out) {
    out = out || [];
    if (node.type === "col") out.push(node.name);
    else if (node.type === "neg") collectColumnRefs(node.expr, out);
    else if (node.type === "bin") { collectColumnRefs(node.left, out); collectColumnRefs(node.right, out); }
    return out;
  }

  function evalFormula(expr, row) {
    return evalAst(parseFormula(expr), row);
  }

  // ---------------------------------------------------------------- STEPS --
  const STEPS = {
    changeType: {
      label: (p) => `Diubah Tipe: "${p.column}" → ${p.newType}`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        const col = nt.columns.find((c) => c.name === p.column);
        if (col) col.type = p.newType;
        nt.rows.forEach((r) => {
          if (r[p.column] == null) return;
          if (p.newType === "INTEGER") r[p.column] = parseInt(r[p.column], 10) || 0;
          else if (p.newType === "REAL") r[p.column] = parseFloat(r[p.column]) || 0;
          else if (p.newType === "TEXT") r[p.column] = String(r[p.column]);
        });
        return nt;
      },
      mCode: (p, prev) => `Table.TransformColumnTypes(${prev},{{"${p.column}", type ${p.newType === "INTEGER" ? "number" : p.newType === "REAL" ? "number" : "text"}}})`
    },
    renameColumn: {
      label: (p) => `Diganti Nama: "${p.from}" → "${p.to}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns.forEach((c) => { if (c.name === p.from) c.name = p.to; });
        nt.rows.forEach((r) => { r[p.to] = r[p.from]; delete r[p.from]; });
        return nt;
      },
      mCode: (p, prev) => `Table.RenameColumns(${prev},{{"${p.from}", "${p.to}"}})`
    },
    removeColumns: {
      label: (p) => `Kolom Dihapus: ${p.columns.join(", ")}`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns = nt.columns.filter((c) => !p.columns.includes(c.name));
        nt.rows.forEach((r) => p.columns.forEach((c) => delete r[c]));
        return nt;
      },
      mCode: (p, prev) => `Table.RemoveColumns(${prev},{${p.columns.map((c) => `"${c}"`).join(", ")}})`
    },
    keepTopRows: {
      label: (p) => `Simpan ${p.n} Baris Teratas`,
      apply: (t, p) => { const nt = cloneTable(t); nt.rows = nt.rows.slice(0, p.n); return nt; },
      mCode: (p, prev) => `Table.FirstN(${prev}, ${p.n})`
    },
    removeTopRows: {
      label: (p) => `Hapus ${p.n} Baris Teratas`,
      apply: (t, p) => { const nt = cloneTable(t); nt.rows = nt.rows.slice(p.n); return nt; },
      mCode: (p, prev) => `Table.Skip(${prev}, ${p.n})`
    },
    sort: {
      label: (p) => `Diurutkan: "${p.column}" (${p.direction === "desc" ? "Descending" : "Ascending"})`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.rows.sort((a, b) => {
          const av = a[p.column], bv = b[p.column];
          if (av == null) return 1; if (bv == null) return -1;
          if (av < bv) return p.direction === "desc" ? 1 : -1;
          if (av > bv) return p.direction === "desc" ? -1 : 1;
          return 0;
        });
        return nt;
      },
      mCode: (p, prev) => `Table.Sort(${prev},{{"${p.column}", Order.${p.direction === "desc" ? "Descending" : "Ascending"}}})`
    },
    filter: {
      label: (p) => `Difilter: "${p.column}" ${p.operator} ${p.value}`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        const val = t.columns.find((c) => c.name === p.column && c.type !== "TEXT") ? parseFloat(p.value) : p.value;
        nt.rows = nt.rows.filter((r) => {
          const cell = r[p.column];
          switch (p.operator) {
            case "=": return String(cell) === String(val);
            case "!=": return String(cell) !== String(val);
            case ">": return Number(cell) > Number(val);
            case "<": return Number(cell) < Number(val);
            case ">=": return Number(cell) >= Number(val);
            case "<=": return Number(cell) <= Number(val);
            case "contains": return cell != null && String(cell).toLowerCase().includes(String(val).toLowerCase());
            case "notnull": return cell != null;
            case "isnull": return cell == null;
            default: return true;
          }
        });
        return nt;
      },
      mCode: (p, prev) => {
        if (p.operator === "notnull") return `Table.SelectRows(${prev}, each [${p.column}] <> null)`;
        if (p.operator === "isnull") return `Table.SelectRows(${prev}, each [${p.column}] = null)`;
        if (p.operator === "contains") return `Table.SelectRows(${prev}, each Text.Contains([${p.column}], "${p.value}"))`;
        const opMap = { "=": "=", "!=": "<>", ">": ">", "<": "<", ">=": ">=", "<=": "<=" };
        const valLit = isNaN(parseFloat(p.value)) ? `"${p.value}"` : p.value;
        return `Table.SelectRows(${prev}, each [${p.column}] ${opMap[p.operator]} ${valLit})`;
      }
    },
    replaceValues: {
      label: (p) => `Nilai Diganti pada "${p.column}": "${p.oldVal}" → "${p.newVal}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.rows.forEach((r) => { if (String(r[p.column]) === String(p.oldVal)) r[p.column] = p.newVal; });
        return nt;
      },
      mCode: (p, prev) => `Table.ReplaceValue(${prev},"${p.oldVal}","${p.newVal}",Replacer.ReplaceText,{"${p.column}"})`
    },
    removeDuplicates: {
      label: () => `Baris Duplikat Dihapus`,
      apply: (t) => {
        const nt = cloneTable(t);
        const seen = new Set();
        nt.rows = nt.rows.filter((r) => {
          const key = nt.columns.map((c) => r[c.name]).join("\u0001");
          if (seen.has(key)) return false;
          seen.add(key); return true;
        });
        return nt;
      },
      mCode: (p, prev) => `Table.Distinct(${prev})`
    },
    fillDown: {
      label: (p) => `Fill Down: "${p.column}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        let last = null;
        nt.rows.forEach((r) => { if (r[p.column] == null || r[p.column] === "") r[p.column] = last; else last = r[p.column]; });
        return nt;
      },
      mCode: (p, prev) => `Table.FillDown(${prev},{"${p.column}"})`
    },
    fillUp: {
      label: (p) => `Fill Up: "${p.column}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        let next = null;
        for (let i = nt.rows.length - 1; i >= 0; i--) {
          const r = nt.rows[i];
          if (r[p.column] == null || r[p.column] === "") r[p.column] = next; else next = r[p.column];
        }
        return nt;
      },
      mCode: (p, prev) => `Table.FillUp(${prev},{"${p.column}"})`
    },
    trim: {
      label: (p) => `Trim: "${p.column}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.rows.forEach((r) => { if (typeof r[p.column] === "string") r[p.column] = r[p.column].trim().replace(/\s+/g, " "); });
        return nt;
      },
      mCode: (p, prev) => `Table.TransformColumns(${prev},{{"${p.column}", Text.Trim}})`
    },
    splitColumn: {
      label: (p) => `Kolom Dipisah: "${p.column}" → ${p.newNames.join(", ")}`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns = nt.columns.filter((c) => c.name !== p.column).concat(p.newNames.map((n) => ({ name: n, type: "TEXT" })));
        nt.rows.forEach((r) => {
          const parts = String(r[p.column] || "").split(p.delimiter);
          p.newNames.forEach((n, i) => { r[n] = parts[i] !== undefined ? parts[i].trim() : null; });
          delete r[p.column];
        });
        return nt;
      },
      mCode: (p, prev) => `Table.SplitColumn(${prev},"${p.column}",Splitter.SplitTextByDelimiter("${p.delimiter}"),{${p.newNames.map((n) => `"${n}"`).join(",")}})`
    },
    mergeColumn: {
      label: (p) => `Kolom Digabung: ${p.columns.join(", ")} → "${p.newName}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns = nt.columns.filter((c) => !p.columns.includes(c.name)).concat([{ name: p.newName, type: "TEXT" }]);
        nt.rows.forEach((r) => {
          r[p.newName] = p.columns.map((c) => (r[c] == null ? "" : r[c])).join(p.delimiter);
          p.columns.forEach((c) => delete r[c]);
        });
        return nt;
      },
      mCode: (p, prev) => `Table.CombineColumns(${prev},{${p.columns.map((c) => `"${c}"`).join(",")}},Combiner.CombineTextByDelimiter("${p.delimiter}"),"${p.newName}")`
    },
    indexColumn: {
      label: (p) => `Kolom Index Ditambahkan: "${p.newName}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns = nt.columns.concat([{ name: p.newName, type: "INTEGER" }]);
        nt.rows.forEach((r, i) => { r[p.newName] = (p.start || 1) + i; });
        return nt;
      },
      mCode: (p, prev) => `Table.AddIndexColumn(${prev},"${p.newName}",${p.start || 1},1)`
    },
    customColumn: {
      label: (p) => `Kolom Kustom Ditambahkan: "${p.newName}" = ${p.formula}`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns = nt.columns.concat([{ name: p.newName, type: "REAL" }]);
        const ast = parseFormula(p.formula); // throws immediately on a bad formula, instead of silently nulling every row
        const knownCols = t.columns.map((c) => c.name);
        collectColumnRefs(ast).forEach((name) => { if (knownCols.indexOf(name) === -1) throw new Error('Kolom tidak ditemukan: "' + name + '"'); });
        nt.rows.forEach((r) => { try { r[p.newName] = evalAst(ast, r); } catch (e) { r[p.newName] = null; } });
        return nt;
      },
      mCode: (p, prev) => `Table.AddColumn(${prev},"${p.newName}", each ${p.formula.replace(/\[([^\]]+)\]/g, "[$1]")})`
    },
    conditionalColumn: {
      label: (p) => `Kolom Kondisional Ditambahkan: "${p.newName}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns = nt.columns.concat([{ name: p.newName, type: "TEXT" }]);
        nt.rows.forEach((r) => {
          const cell = r[p.column];
          let cond;
          const val = isNaN(parseFloat(p.value)) ? p.value : parseFloat(p.value);
          switch (p.operator) {
            case ">": cond = Number(cell) > Number(val); break;
            case "<": cond = Number(cell) < Number(val); break;
            case ">=": cond = Number(cell) >= Number(val); break;
            case "<=": cond = Number(cell) <= Number(val); break;
            case "=": cond = String(cell) === String(val); break;
            default: cond = String(cell) === String(val);
          }
          r[p.newName] = cond ? p.thenVal : p.elseVal;
        });
        return nt;
      },
      mCode: (p, prev) => `Table.AddColumn(${prev},"${p.newName}", each if [${p.column}] ${p.operator} ${fmtVal(isNaN(parseFloat(p.value)) ? p.value : parseFloat(p.value))} then ${fmtVal(p.thenVal)} else ${fmtVal(p.elseVal)})`
    },
    groupBy: {
      label: (p) => `Dikelompokkan berdasarkan ${p.groupCols.join(", ")} — ${p.aggFunc.toUpperCase()}(${p.aggCol}) as "${p.newName}"`,
      apply: (t, p) => {
        const groups = {};
        t.rows.forEach((r) => {
          const key = p.groupCols.map((c) => r[c]).join("\u0001");
          if (!groups[key]) groups[key] = { keyVals: p.groupCols.map((c) => r[c]), items: [] };
          groups[key].items.push(r);
        });
        const rows = Object.values(groups).map((g) => {
          const row = {};
          p.groupCols.forEach((c, i) => { row[c] = g.keyVals[i]; });
          const vals = g.items.map((r) => Number(r[p.aggCol]) || 0);
          let agg;
          if (p.aggFunc === "sum") agg = vals.reduce((a, b) => a + b, 0);
          else if (p.aggFunc === "avg") agg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
          else if (p.aggFunc === "count") agg = g.items.length;
          else if (p.aggFunc === "min") agg = Math.min(...vals);
          else if (p.aggFunc === "max") agg = Math.max(...vals);
          row[p.newName] = Math.round(agg * 100) / 100;
          return row;
        });
        const columns = p.groupCols.map((c) => (t.columns.find((tc) => tc.name === c) || { name: c, type: "TEXT" })).map((c) => Object.assign({}, c));
        columns.push({ name: p.newName, type: "REAL" });
        return { columns, rows };
      },
      mCode: (p, prev) => `Table.Group(${prev},{${p.groupCols.map((c) => `"${c}"`).join(",")}},{{"${p.newName}", each List.${p.aggFunc === "sum" ? "Sum" : p.aggFunc === "avg" ? "Average" : p.aggFunc === "count" ? "Count" : p.aggFunc === "min" ? "Min" : "Max"}([${p.aggCol}]), type number}})`
    },
    unpivot: {
      label: (p) => `Unpivot: ${p.columns.join(", ")} → "${p.attrName}"/"${p.valueName}"`,
      apply: (t, p) => {
        const keepCols = t.columns.filter((c) => !p.columns.includes(c.name));
        const rows = [];
        t.rows.forEach((r) => {
          p.columns.forEach((c) => {
            const row = {};
            keepCols.forEach((kc) => { row[kc.name] = r[kc.name]; });
            row[p.attrName] = c;
            row[p.valueName] = r[c];
            rows.push(row);
          });
        });
        const columns = keepCols.map((c) => Object.assign({}, c)).concat([{ name: p.attrName, type: "TEXT" }, { name: p.valueName, type: "REAL" }]);
        return { columns, rows };
      },
      mCode: (p, prev) => `Table.UnpivotColumns(${prev},{${p.columns.map((c) => `"${c}"`).join(",")}},"${p.attrName}","${p.valueName}")`
    },
    pivot: {
      label: (p) => `Pivot: "${p.pivotCol}" menjadi kolom, nilai dari "${p.valueCol}"`,
      apply: (t, p) => {
        const otherCols = t.columns.filter((c) => c.name !== p.pivotCol && c.name !== p.valueCol).map((c) => c.name);
        const pivotVals = Array.from(new Set(t.rows.map((r) => r[p.pivotCol])));
        const groups = {};
        t.rows.forEach((r) => {
          const key = otherCols.map((c) => r[c]).join("\u0001");
          if (!groups[key]) {
            groups[key] = {}; otherCols.forEach((c) => { groups[key][c] = r[c]; });
            pivotVals.forEach((pv) => { groups[key][pv] = 0; });
          }
          groups[key][r[p.pivotCol]] = (Number(groups[key][r[p.pivotCol]]) || 0) + (Number(r[p.valueCol]) || 0);
        });
        const rows = Object.values(groups);
        const columns = otherCols.map((c) => ({ name: c, type: "TEXT" })).concat(pivotVals.map((pv) => ({ name: String(pv), type: "REAL" })));
        return { columns, rows };
      },
      mCode: (p, prev) => `Table.Pivot(${prev}, List.Distinct(${prev}[${p.pivotCol}]), "${p.pivotCol}", "${p.valueCol}")`
    },
    mergeQueries: {
      label: (p) => `Digabung (Merge) dengan "${p.otherLabel}" — bawa: ${p.bringColumns.join(", ")}`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns = nt.columns.concat(p.bringColumns.map((c) => ({ name: p.prefix + c, type: "TEXT" })));
        const index = {};
        p.otherTable.rows.forEach((r) => { index[String(r[p.otherKey])] = r; });
        nt.rows.forEach((r) => {
          const match = index[String(r[p.key])];
          p.bringColumns.forEach((c) => { r[p.prefix + c] = match ? match[c] : null; });
        });
        return nt;
      },
      mCode: (p, prev) => `Table.NestedJoin(${prev}, "${p.key}", ${JSON.stringify(p.otherLabel)}, "${p.otherKey}", "${p.prefix}Merged", JoinKind.LeftOuter)`
    },
    appendQueries: {
      label: (p) => `Ditambahkan (Append) data dari "${p.otherLabel}" (+${p.otherTable.rows.length} baris)`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        const colNames = nt.columns.map((c) => c.name);
        p.otherTable.rows.forEach((r) => {
          const row = {};
          colNames.forEach((c) => { row[c] = r[c] !== undefined ? r[c] : null; });
          nt.rows.push(row);
        });
        return nt;
      },
      mCode: (p, prev) => `Table.Combine({${prev}, ${JSON.stringify(p.otherLabel)}})`
    }
,
    promoteHeaders: {
      label: (p) => "Promote Headers: Baris pertama dijadikan header kolom",
      apply: (t, p) => {
        const nt = cloneTable(t);
        if (nt.rows.length === 0) return nt;
        const firstRow = nt.rows.shift();
        nt.columns.forEach((c) => { if (firstRow[c.name] != null) c.name = String(firstRow[c.name]); });
        return nt;
      },
      mCode: (p, prev) => `Table.PromoteHeaders(${prev}, [PromoteAllScalars=true])`
    },
    removeEmptyRows: {
      label: (p) => "Hapus Baris Kosong",
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.rows = nt.rows.filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== ""));
        return nt;
      },
      mCode: (p, prev) => `Table.SelectRows(${prev}, each not List.IsEmpty(List.RemoveMatchingItems(Record.FieldValues(_), {null})))`
    },
    keepDuplicates: {
      label: (p) => `Simpan Hanya Duplikat: ${(p.columns || []).join(", ")}`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        const cols = p.columns || [];
        const seen = {};
        const dupes = [];
        nt.rows.forEach((r) => {
          const key = cols.map((c) => String(r[c] || "")).join("\u0001");
          if (seen[key]) dupes.push(Object.assign({}, r));
          else seen[key] = true;
        });
        nt.rows = dupes;
        return nt;
      },
      mCode: (p, prev) => `Table.Group(${prev}, {${(p.columns || []).map((c) => '"' + c + '"').join(", ")}}, {{"Count", each Table.RowCount(_), Int64.Type}}, 0, GroupKind.Global)`
    },
    reverseRows: {
      label: (p) => "Balik Urutan Baris (Reverse)",
      apply: (t, p) => { const nt = cloneTable(t); nt.rows.reverse(); return nt; },
      mCode: (p, prev) => `Table.ReverseRows(${prev})`
    },
    removeErrors: {
      label: (p) => "Hapus Baris dengan Error",
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.rows = nt.rows.filter((r) => Object.values(r).every((v) => !(v instanceof Error)));
        return nt;
      },
      mCode: (p, prev) => `Table.RemoveRowsWithErrors(${prev})`
    },
    duplicateColumn: {
      label: (p) => `Gandakan Kolom: "${p.from}" \u2192 "${p.to}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.columns.push({ name: p.to, type: (t.columns.find((c) => c.name === p.from) || {}).type || "TEXT" });
        nt.rows.forEach((r) => { r[p.to] = r[p.from]; });
        return nt;
      },
      mCode: (p, prev) => `Table.DuplicateColumn(${prev}, "${p.from}", "${p.to}")`
    },
    extractDatePart: {
      label: (p) => `Ekstrak ${p.part || "Year"} dari Kolom: "${p.column}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.rows.forEach((r) => {
          const v = r[p.column];
          if (typeof v === "string" && v.includes("-")) {
            const parts = v.split("-");
            if (p.part === "Year" && parts[0]) r[p.column] = parseInt(parts[0], 10) || v;
            else if (p.part === "Month" && parts[1]) r[p.column] = parseInt(parts[1], 10) || v;
            else if (p.part === "Day" && parts[2]) r[p.column] = parseInt(parts[2], 10) || v;
          }
        });
        return nt;
      },
      mCode: (p, prev) => `Table.TransformColumns(${prev},{{"${p.column}", each Date.${p.part || "Year"}(_), Int64.Type}})`
    },
    changeCase: {
      label: (p) => `Ubah "${(p.case || "Upper")}" Kolom: "${p.column}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        nt.rows.forEach((r) => {
          if (typeof r[p.column] === "string") {
            r[p.column] = p.case === "lower" ? r[p.column].toLowerCase() : r[p.column].toUpperCase();
          }
        });
        return nt;
      },
      mCode: (p, prev) => `Table.TransformColumns(${prev},{{"${p.column}", Text.${p.case || "Upper"}, type text}})`
    },
    roundNumber: {
      label: (p) => `Bulatkan Kolom: "${p.column}" (${p.digits || 0} digit)`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        const factor = Math.pow(10, p.digits || 0);
        nt.rows.forEach((r) => {
          if (typeof r[p.column] === "number") r[p.column] = Math.round(r[p.column] * factor) / factor;
        });
        return nt;
      },
      mCode: (p, prev) => `Table.TransformColumns(${prev},{{"${p.column}", each Number.Round(_, ${p.digits || 0}), type number}})`
    },
    filterTextContains: {
      label: (p) => `Filter Teks: "${p.column}" berisi "${p.value}"`,
      apply: (t, p) => {
        const nt = cloneTable(t);
        const search = String(p.value).toLowerCase();
        nt.rows = nt.rows.filter((r) => r[p.column] != null && String(r[p.column]).toLowerCase().includes(search));
        return nt;
      },
      mCode: (p, prev) => `Table.SelectRows(${prev}, each Text.Contains([${p.column}], "${p.value}"))`
    }

  };

  function applyStep(table, step) {
    const def = STEPS[step.type];
    if (!def) throw new Error("Tipe langkah tidak dikenal: " + step.type);
    return def.apply(table, step.params || {});
  }

  function stepLabel(step) {
    const def = STEPS[step.type];
    return def ? def.label(step.params || {}) : step.type;
  }

  function buildMCode(sourceLabel, steps) {
    const lines = [`Source = ${sourceLabel}`];
    let prevVar = "Source";
    steps.forEach((step, i) => {
      const def = STEPS[step.type];
      const varName = "Step" + (i + 1);
      const expr = def ? def.mCode(step.params || {}, prevVar) : `/* ${step.type} */ ${prevVar}`;
      lines.push(`${varName} = ${expr}`);
      prevVar = varName;
    });
    return `let\n    ${lines.join(",\n    ")}\nin\n    ${prevVar}`;
  }

  function runPipeline(baseTable, steps) {
    let t = baseTable;
    for (const s of steps) t = applyStep(t, s);
    return t;
  }

  global.SQLPQ_PowerQuery = { STEPS, applyStep, stepLabel, buildMCode, runPipeline, cloneTable, evalFormula, parseFormula, evalAst, collectColumnRefs };
})(window);
