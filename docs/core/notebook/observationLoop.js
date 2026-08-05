export const OBSERVATION_LOOP_VERSION = "runload-observation-loop-v1";

export const OBSERVATION_PROMPT_STATES = Object.freeze({
  linked: "linked",
  notLinked: "not_linked",
});

const VALID_PROMPT_STATES = new Set(Object.values(OBSERVATION_PROMPT_STATES));

export function normalizeObservationPromptState(value = "") {
  const normalized = String(value || "").trim();
  return VALID_PROMPT_STATES.has(normalized) ? normalized : "";
}

export function isObservationPlanPage(page = {}) {
  return page.oneThingTheme === "next-note" && Boolean(String(page.oneThingNote || "").trim());
}

export function nextRecordedDateAfter(sourceDate = "", records = []) {
  return [...new Set((records || [])
    .map((record) => String(record?.date || "").slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date > sourceDate))]
    .sort((left, right) => left.localeCompare(right))[0] || "";
}

export function buildObservationCandidate({ pages = [], records = [], selectedDate = "", currentPage = {} } = {}) {
  if (!records.some((record) => record?.date === selectedDate)) return null;
  if (normalizeObservationPromptState(currentPage.observationPromptState)) return null;
  const candidates = pages
    .filter((page) => page.date < selectedDate && isObservationPlanPage(page))
    .filter((page) => nextRecordedDateAfter(page.date, records) === selectedDate)
    .sort((left, right) => right.date.localeCompare(left.date));
  return candidates[0] || null;
}

export function normalizeObservationSelection({
  state = "",
  sourceDate = "",
  reviewNote = "",
  selectedDate = "",
  pages = [],
  records = [],
} = {}) {
  const normalizedState = normalizeObservationPromptState(state);
  if (!normalizedState) return Object.freeze({ observationPromptState: "", observationSourceDate: "", observationReviewNote: "" });
  const sourcePage = pages.find((page) => page.date === sourceDate && isObservationPlanPage(page)) || null;
  const isNextRecordedDay = sourcePage && nextRecordedDateAfter(sourcePage.date, records) === selectedDate;
  if (!isNextRecordedDay) return Object.freeze({ observationPromptState: "", observationSourceDate: "", observationReviewNote: "" });
  return Object.freeze({
    observationPromptState: normalizedState,
    observationSourceDate: sourcePage.date,
    observationReviewNote: normalizedState === OBSERVATION_PROMPT_STATES.linked ? String(reviewNote || "") : "",
  });
}
