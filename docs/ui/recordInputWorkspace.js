const WORKSPACE_KEY = "runner-load-app-record-input-workspace-v1";
const JOURNEY_KEY = "runner-load-app-record-input-journey-v1";
const memoryFallback = new Map();

function storage() {
  try {
    if (globalThis.sessionStorage) return globalThis.sessionStorage;
  } catch {}
  return {
    getItem: (key) => memoryFallback.has(key) ? memoryFallback.get(key) : null,
    setItem: (key, value) => { memoryFallback.set(key, String(value)); },
    removeItem: (key) => { memoryFallback.delete(key); },
  };
}

function normalizeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([name, value]) => [String(name), String(value ?? "")]));
}

function safeRecordInputHash(value = "#/record-input") {
  const text = String(value || "#/record-input");
  return text.startsWith("#/record-input") ? text : "#/record-input";
}

function canonicalRecordInputHash(value = "#/record-input") {
  const safe = safeRecordInputHash(value);
  const [path, query = ""] = safe.split("?");
  const parameters = new URLSearchParams(query);
  for (const transient of ["resume", "focus", "notice"]) parameters.delete(transient);
  const entries = [...parameters.entries()].sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue));
  const normalized = new URLSearchParams(entries).toString();
  return `${path}${normalized ? `?${normalized}` : ""}`;
}

function recordInputHashFromContext(context = {}) {
  const parameters = context.parameters instanceof URLSearchParams
    ? new URLSearchParams(context.parameters)
    : new URLSearchParams();
  return canonicalRecordInputHash(`#/record-input${parameters.toString() ? `?${parameters}` : ""}`);
}

function focusSelectorForSource(source = "") {
  if (source === "course") return '[data-action="open-course-library"]';
  if (source === "subjective") return '[data-action="open-subjective-input"]';
  if (source === "personal") return '[data-action="open-personal-input"]';
  return "#record-optional-title";
}

function defaultNotice(source = "", outcome = "cancelled") {
  if (outcome === "applied" && source === "course") return "選んだコース条件を今回の入力へ反映しました。";
  if (outcome === "applied" && source === "subjective") return "今回の身体記録を入力画面へ反映しました。";
  if (source === "course") return "コース条件を変更せず、入力途中を保ったまま戻りました。";
  if (source === "subjective") return "今回の身体記録を変更せず、入力途中を保ったまま戻りました。";
  if (source === "personal") return "シューズと走り方のメモを変更せず、入力途中を保ったまま戻りました。";
  return "入力途中を保ったまま戻りました。";
}

export function serializeRecordInputForm(form) {
  const fields = {};
  form?.querySelectorAll?.("input, select, textarea").forEach((control) => {
    if (!control.name || control.disabled) return;
    if (control.type === "checkbox" || control.type === "radio") {
      if (!(control.name in fields)) fields[control.name] = "__unchecked__";
      if (control.checked) fields[control.name] = control.value;
      return;
    }
    fields[control.name] = control.value;
  });
  return normalizeFields(fields);
}

export function saveRecordInputWorkspace(fieldsOrForm) {
  const fields = fieldsOrForm?.querySelectorAll
    ? serializeRecordInputForm(fieldsOrForm)
    : normalizeFields(fieldsOrForm || {});
  const payload = Object.freeze({ version: 1, updatedAt: new Date().toISOString(), fields });
  storage().setItem(WORKSPACE_KEY, JSON.stringify(payload));
  return payload;
}

export function loadRecordInputWorkspace() {
  try {
    const parsed = JSON.parse(storage().getItem(WORKSPACE_KEY) || "null");
    if (!parsed || parsed.version !== 1 || typeof parsed.fields !== "object") return null;
    return Object.freeze({ ...parsed, fields: normalizeFields(parsed.fields) });
  } catch {
    return null;
  }
}

export function updateRecordInputWorkspaceFields(nextFields = {}) {
  const current = loadRecordInputWorkspace();
  return saveRecordInputWorkspace({ ...(current?.fields || {}), ...normalizeFields(nextFields) });
}

export function restoreRecordInputWorkspace(form, workspace = loadRecordInputWorkspace()) {
  if (!form || !workspace?.fields) return false;
  const fields = workspace.fields;
  form.querySelectorAll("input, select, textarea").forEach((control) => {
    if (!control.name || !(control.name in fields)) return;
    const value = String(fields[control.name] ?? "");
    if (control.type === "checkbox" || control.type === "radio") {
      control.checked = value !== "__unchecked__" && control.value === value;
    } else {
      control.value = value;
    }
  });
  return true;
}

export function beginRecordInputJourney({ returnTo = "#/record-input", source = "" } = {}) {
  const payload = Object.freeze({
    version: 1,
    phase: "auxiliary",
    returnTo: canonicalRecordInputHash(returnTo),
    source: String(source || ""),
    outcome: "pending",
    notice: "",
    announcementPending: true,
    updatedAt: new Date().toISOString(),
  });
  storage().setItem(JOURNEY_KEY, JSON.stringify(payload));
  return payload;
}

export function loadRecordInputJourney() {
  try {
    const parsed = JSON.parse(storage().getItem(JOURNEY_KEY) || "null");
    if (!parsed || parsed.version !== 1 || !parsed.returnTo) return null;
    return Object.freeze({ ...parsed, returnTo: canonicalRecordInputHash(parsed.returnTo) });
  } catch {
    return null;
  }
}

function saveJourney(journey) {
  storage().setItem(JOURNEY_KEY, JSON.stringify({ ...journey, updatedAt: new Date().toISOString() }));
}

export function markRecordInputJourneyReturn({ source = "", outcome = "applied", notice = "" } = {}) {
  const current = loadRecordInputJourney();
  if (!current) return null;
  const next = {
    ...current,
    source: String(source || current.source || ""),
    outcome: String(outcome || "applied"),
    notice: String(notice || ""),
    announcementPending: true,
  };
  saveJourney(next);
  return Object.freeze(next);
}

export function resolveRecordInputReturnState(context = {}) {
  const journey = loadRecordInputJourney();
  const explicitResume = context?.parameters?.get?.("resume") === "1";
  if (!journey && !explicitResume) return null;
  const currentHash = recordInputHashFromContext(context);
  const matchesJourney = Boolean(journey && currentHash === journey.returnTo);
  if (!explicitResume && !matchesJourney) return null;

  if (!journey) {
    return Object.freeze({ restore: true, focusSelector: "#record-optional-title", notice: "入力途中を復元しました。", source: "legacy" });
  }

  const announce = journey.announcementPending !== false;
  const next = { ...journey, phase: "record", announcementPending: false };
  saveJourney(next);
  return Object.freeze({
    restore: true,
    focusSelector: announce ? focusSelectorForSource(journey.source) : "",
    notice: announce ? (journey.notice || defaultNotice(journey.source, journey.outcome)) : "",
    source: journey.source,
    outcome: journey.outcome,
  });
}

export function isRecordInputWorkspaceActive() {
  return loadRecordInputJourney()?.phase === "record";
}

export function refreshActiveRecordInputWorkspace(form) {
  if (!isRecordInputWorkspaceActive()) return null;
  return saveRecordInputWorkspace(form);
}

export function handleRecordInputRouteChange(previousScreen = "", nextScreen = "") {
  const related = new Set(["record-input", "course-library", "course-editor", "subjective-input", "personal-input"]);
  const auxiliary = new Set(["course-library", "course-editor", "subjective-input", "personal-input"]);
  const leavingJourney = (auxiliary.has(previousScreen) || previousScreen === "record-input") && !related.has(nextScreen);
  if (leavingJourney) clearRecordInputWorkspace();
}

export function clearRecordInputJourney() {
  storage().removeItem(JOURNEY_KEY);
}

export function clearRecordInputWorkspace() {
  storage().removeItem(WORKSPACE_KEY);
  clearRecordInputJourney();
}

export function recordInputWorkspaceKey() {
  return WORKSPACE_KEY;
}

export function recordInputJourneyKey() {
  return JOURNEY_KEY;
}
