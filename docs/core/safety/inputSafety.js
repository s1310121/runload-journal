export const INPUT_LIMITS = Object.freeze({
  csvBytes: 4 * 1024 * 1024,
  csvRows: 20000,
  csvColumns: 256,
  csvLineCharacters: 256 * 1024,
  backupBytes: 16 * 1024 * 1024,
  jsonDepth: 64,
  jsonNodes: 300000,
  jsonStringCharacters: 2 * 1024 * 1024,
  steps: 10000000,
  distanceKm: 10000,
  durationMinutes: 100000,
  portableRecords: 20000,
  portableFeedbackEntries: 20000,
  portablePlans: 20000,
  portableNotebookPages: 20000,
  portableModelResults: 40000,
  portableCourses: 5000,
  portableNotebookMonthlyIssues: 2400,
  portableNotebookViewEvents: 50000,
});

const DANGEROUS_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const BIDI_AND_INVISIBLE_CONTROLS = /[\u061C\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
const SPREADSHEET_FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;
const PROTECTED_FORMULA_PREFIX = /^'([\t\r\n ]*[=+\-@])/;

export function byteLength(value = "") {
  const text = String(value ?? "");
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

export function normalizeUserText(value = "") {
  const text = String(value ?? "");
  const normalized = typeof text.normalize === "function" ? text.normalize("NFC") : text;
  return normalized.replace(BIDI_AND_INVISIBLE_CONTROLS, "");
}

export function normalizePlainText(value = "", maximumLength = 240) {
  return normalizeUserText(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maximumLength);
}

export function normalizeSingleLineText(value = "", maximumLength = 80) {
  return normalizePlainText(value, maximumLength * 2)
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

export function protectSpreadsheetFormula(value) {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value == null ? "" : String(value);
  }
  const text = String(value);
  return SPREADSHEET_FORMULA_PREFIX.test(text) && !PROTECTED_FORMULA_PREFIX.test(text)
    ? `'${text}`
    : text;
}

export function decodeProtectedSpreadsheetText(value) {
  return String(value ?? "").replace(PROTECTED_FORMULA_PREFIX, "$1");
}

export function escapeCsvValue(value, options = {}) {
  const text = options.protectFormula === false
    ? String(value ?? "")
    : protectSpreadsheetFormula(value);
  return /[",\n\r;,\t]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function assertCsvText(value, options = {}) {
  const text = String(value ?? "");
  const maximumBytes = Number(options.maximumBytes || INPUT_LIMITS.csvBytes);
  const bytes = byteLength(text);
  if (bytes > maximumBytes) {
    throw Object.assign(new Error("CSVが大きすぎます。"), {
      name: "InputSafetyError",
      code: "CSV_TOO_LARGE",
      details: { bytes, maximumBytes },
    });
  }
  const lines = text.split(/\r?\n/);
  const maximumRows = Number(options.maximumRows || INPUT_LIMITS.csvRows);
  if (lines.length > maximumRows + 1) {
    throw Object.assign(new Error("CSVの行数が多すぎます。"), {
      name: "InputSafetyError",
      code: "CSV_TOO_MANY_ROWS",
      details: { rows: lines.length, maximumRows },
    });
  }
  const maximumLineCharacters = Number(
    options.maximumLineCharacters || INPUT_LIMITS.csvLineCharacters,
  );
  const overlongLineIndex = lines.findIndex((line) => line.length > maximumLineCharacters);
  if (overlongLineIndex >= 0) {
    throw Object.assign(new Error(`CSVの${overlongLineIndex + 1}行目が長すぎます。`), {
      name: "InputSafetyError",
      code: "CSV_LINE_TOO_LONG",
      details: {
        line: overlongLineIndex + 1,
        length: lines[overlongLineIndex].length,
        maximumLineCharacters,
      },
    });
  }
  return Object.freeze({ ok: true, bytes, rows: lines.length });
}

export function inspectJsonValue(root, options = {}) {
  const limits = {
    maximumDepth: Number(options.maximumDepth || INPUT_LIMITS.jsonDepth),
    maximumNodes: Number(options.maximumNodes || INPUT_LIMITS.jsonNodes),
    maximumStringCharacters: Number(
      options.maximumStringCharacters || INPUT_LIMITS.jsonStringCharacters,
    ),
  };
  const stack = [{ value: root, depth: 0, path: "$" }];
  const seen = typeof WeakSet === "function" ? new WeakSet() : null;
  let nodes = 0;

  while (stack.length) {
    const current = stack.pop();
    nodes += 1;
    if (nodes > limits.maximumNodes) {
      return { ok: false, code: "JSON_TOO_MANY_NODES", message: "バックアップ内の項目数が多すぎます。", path: current.path, nodes, limits };
    }
    if (current.depth > limits.maximumDepth) {
      return { ok: false, code: "JSON_TOO_DEEP", message: "バックアップの入れ子が深すぎます。", path: current.path, depth: current.depth, limits };
    }
    if (typeof current.value === "string" && current.value.length > limits.maximumStringCharacters) {
      return { ok: false, code: "JSON_STRING_TOO_LONG", message: "バックアップ内に長すぎる文字列があります。", path: current.path, length: current.value.length, limits };
    }
    if (!current.value || typeof current.value !== "object") continue;
    if (seen) {
      if (seen.has(current.value)) {
        return { ok: false, code: "JSON_CYCLE", message: "バックアップ内に循環参照があります。", path: current.path, limits };
      }
      seen.add(current.value);
    }
    for (const key of Object.keys(current.value)) {
      if (DANGEROUS_JSON_KEYS.has(key)) {
        return { ok: false, code: "JSON_DANGEROUS_KEY", message: `安全上使用できない項目名があります: ${key}`, path: `${current.path}.${key}`, key, limits };
      }
      stack.push({ value: current.value[key], depth: current.depth + 1, path: `${current.path}.${key}` });
    }
  }
  return { ok: true, nodes, limits };
}

export function parseJsonText(value, options = {}) {
  const text = String(value ?? "").replace(/^\uFEFF/, "");
  const maximumBytes = Number(options.maximumBytes || INPUT_LIMITS.backupBytes);
  const bytes = byteLength(text);
  if (bytes > maximumBytes) {
    return { ok: false, code: "JSON_TOO_LARGE", message: "バックアップが大きすぎます。", details: { bytes, maximumBytes } };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, code: "JSON_PARSE_FAILED", message: "JSON形式を読み取れませんでした。", details: {} };
  }
  const inspection = inspectJsonValue(parsed, options);
  if (!inspection.ok) return { ok: false, code: inspection.code, message: inspection.message, details: inspection };
  return { ok: true, value: parsed, details: { bytes, nodes: inspection.nodes } };
}
