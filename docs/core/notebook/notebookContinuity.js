export const NOTEBOOK_CONTINUITY_VERSION = "runload-record-notebook-v1";
export const NOTEBOOK_STATE_VERSION = 3;

export const NOTEBOOK_THEME_IDS = Object.freeze([
  "body-feel",
  "run-context",
  "tiny-win",
  "learning",
  "next-note",
  "rest-note",
]);

const THEME_SET = new Set(NOTEBOOK_THEME_IDS);

export function hasNotebookWrittenContent(page = {}) {
  return Boolean(
    String(page.oneThingNote || "").trim()
    || String(page.pageTitle || "").trim()
    || String(page.dailyComment || "").trim(),
  );
}

export function normalizeNotebookTheme(value = "") {
  const normalized = String(value || "").trim();
  return THEME_SET.has(normalized) ? normalized : "";
}

export function normalizeReviewReferenceDate(value = "", currentDate = "", pages = []) {
  const candidate = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || candidate >= String(currentDate || "")) return "";
  const referenced = pages.find((page) => page.date === candidate);
  return referenced && hasNotebookWrittenContent(referenced) ? candidate : "";
}

export function buildReviewCandidates(pages = [], currentDate = "", limit = 12) {
  return [...pages]
    .filter((page) => page.date < currentDate && hasNotebookWrittenContent(page))
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, Math.max(0, Number(limit) || 0));
}

export function resolveNotebookDayType(record = null) {
  if (record?.activityType === "rest") {
    return Object.freeze({ id: "rest", label: "休養日のノート", description: "休養を選んだ日の観察を残します。" });
  }
  if (record) {
    return Object.freeze({ id: "run", label: "走行日のノート", description: "走行記録と本人の言葉を分けて残します。" });
  }
  return Object.freeze({ id: "unrecorded", label: "活動記録を結び付けない日ノート", description: "走行や休養の記録がない日も、自分の言葉だけを残せます。" });
}

export function filterNotebookPages(pages = [], { monthKey = "", theme = "" } = {}) {
  const normalizedTheme = normalizeNotebookTheme(theme);
  return [...pages]
    .filter((page) => !monthKey || page.date.startsWith(monthKey))
    .filter((page) => !normalizedTheme || page.oneThingTheme === normalizedTheme)
    .sort((left, right) => right.date.localeCompare(left.date));
}
