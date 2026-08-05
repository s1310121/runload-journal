import { normalizePlainText, normalizeSingleLineText } from "../safety/inputSafety.js";
import { STORAGE_KEYS } from "./storageKeys.js";
import { NOTEBOOK_STATE_VERSION, hasNotebookWrittenContent } from "../notebook/notebookContinuity.js";
import { isObservationPlanPage, normalizeObservationPromptState } from "../notebook/observationLoop.js";

const ONE_THING_THEMES = new Set([
  "body-feel",
  "run-context",
  "tiny-win",
  "learning",
  "next-note",
  "rest-note",
]);

function normalizeOneThingTheme(value) {
  const normalized = normalizeSingleLineText(value, 40);
  return ONE_THING_THEMES.has(normalized) ? normalized : "";
}

const VIEW_EVENT_TYPES = new Set(["result-view", "column-read"]);

function normalizeViewEvent(event = {}) {
  const date = String(event.date || "").slice(0, 10);
  const type = normalizeSingleLineText(event.type, 40);
  if (!date || !VIEW_EVENT_TYPES.has(type)) return null;
  const recordId = normalizeSingleLineText(event.recordId, 100);
  const articleId = normalizeSingleLineText(event.articleId, 100);
  const sourceDate = String(event.sourceDate || "").slice(0, 10);
  const title = normalizeSingleLineText(event.title, 100);
  const id = normalizeSingleLineText(event.id, 160) || `${date}-${type}-${recordId || articleId || title}`;
  return Object.freeze({
    id,
    date,
    type,
    recordId,
    articleId,
    sourceDate,
    title,
    viewedAt: normalizeSingleLineText(event.viewedAt, 50) || new Date().toISOString(),
  });
}

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizePage(page = {}) {
  const date = String(page.date || "").slice(0, 10);
  return Object.freeze({
    date,
    recordId: normalizeSingleLineText(page.recordId, 100),
    pageTitle: normalizeSingleLineText(page.pageTitle, 100),
    dailyComment: normalizePlainText(page.dailyComment, 500),
    oneThingTheme: normalizeOneThingTheme(page.oneThingTheme),
    oneThingNote: normalizePlainText(page.oneThingNote, 160),
    selectedSeenMaterialKey: normalizeSingleLineText(page.selectedSeenMaterialKey, 160),
    selectedMaterials: Object.freeze(Array.isArray(page.selectedMaterials)
      ? [...new Set(page.selectedMaterials.map((value) => normalizeSingleLineText(value, 100)).filter(Boolean))]
      : []),
    readArticleIds: Object.freeze(Array.isArray(page.readArticleIds)
      ? [...new Set(page.readArticleIds.map((value) => normalizeSingleLineText(value, 100)).filter(Boolean))]
      : []),
    reflectionReferences: Object.freeze(Array.isArray(page.reflectionReferences)
      ? [...new Set(page.reflectionReferences.map((value) => normalizeSingleLineText(value, 100)).filter(Boolean))]
      : []),
    consultationNoteReference: normalizeSingleLineText(page.consultationNoteReference, 100),
    reviewReferenceDate: String(page.reviewReferenceDate || "").slice(0, 10),
    observationPromptState: normalizeObservationPromptState(page.observationPromptState),
    observationSourceDate: String(page.observationSourceDate || "").slice(0, 10),
    observationReviewNote: normalizePlainText(page.observationReviewNote, 240),
    updatedAt: normalizeSingleLineText(page.updatedAt, 50) || new Date().toISOString(),
  });
}

function normalizeMonthlyIssue(issue = {}) {
  return Object.freeze({
    monthKey: String(issue.monthKey || "").slice(0, 7),
    title: normalizeSingleLineText(issue.title, 100),
    coverPageDate: String(issue.coverPageDate || "").slice(0, 10),
    featuredPageDates: Object.freeze(Array.isArray(issue.featuredPageDates)
      ? [...new Set(issue.featuredPageDates.map((value) => String(value).slice(0, 10)).filter(Boolean))]
      : []),
    editorNote: normalizePlainText(issue.editorNote, 800),
    updatedAt: normalizeSingleLineText(issue.updatedAt, 50) || new Date().toISOString(),
  });
}

export function createNotebookRepository(gateway) {
  function normalizePagesWithReferences(pages = []) {
    const normalizedPages = pages.map(normalizePage).sort((a, b) => a.date.localeCompare(b.date));
    const writtenDates = new Set(normalizedPages.filter(hasNotebookWrittenContent).map((page) => page.date));
    const observationSourceDates = new Set(normalizedPages.filter(isObservationPlanPage).map((page) => page.date));
    return normalizedPages.map((page) => {
      const observationSourceDate = page.observationSourceDate < page.date && observationSourceDates.has(page.observationSourceDate)
        ? page.observationSourceDate
        : "";
      const observationPromptState = observationSourceDate ? page.observationPromptState : "";
      return Object.freeze({
        ...page,
        reviewReferenceDate: page.reviewReferenceDate < page.date && writtenDates.has(page.reviewReferenceDate)
          ? page.reviewReferenceDate
          : "",
        observationPromptState,
        observationSourceDate,
        observationReviewNote: observationPromptState === "linked" ? page.observationReviewNote : "",
      });
    });
  }

  function normalizeState(state = {}) {
    return {
      version: NOTEBOOK_STATE_VERSION,
      pages: Array.isArray(state.pages) ? normalizePagesWithReferences(state.pages) : [],
      monthlyIssues: Array.isArray(state.monthlyIssues) ? state.monthlyIssues.map(normalizeMonthlyIssue).sort((a, b) => a.monthKey.localeCompare(b.monthKey)) : [],
      viewEvents: Array.isArray(state.viewEvents) ? state.viewEvents.map(normalizeViewEvent).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id)) : [],
    };
  }

  function loadStateResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.notebook, { version: 1, pages: [], monthlyIssues: [], viewEvents: [] });
    if (!result.ok) {
      return {
        ...result,
        code: "STORAGE_NOTEBOOK_READ_FAILED",
        state: normalizeState({}),
      };
    }
    if (!result.value || typeof result.value !== "object" || Array.isArray(result.value)) {
      return {
        ok: false,
        key: STORAGE_KEYS.notebook,
        operation: "validate",
        code: "STORAGE_NOTEBOOK_INVALID",
        message: "Stored notebook state is not an object.",
        state: normalizeState({}),
      };
    }
    return { ok: true, key: STORAGE_KEYS.notebook, exists: result.exists, state: normalizeState(result.value) };
  }

  function loadState() {
    const result = loadStateResult();
    return result.state;
  }

  function saveState(state) {
    const normalized = {
      version: NOTEBOOK_STATE_VERSION,
      pages: Array.isArray(state.pages) ? normalizePagesWithReferences(state.pages) : [],
      monthlyIssues: Array.isArray(state.monthlyIssues) ? state.monthlyIssues.map(normalizeMonthlyIssue) : [],
      viewEvents: Array.isArray(state.viewEvents) ? state.viewEvents.map(normalizeViewEvent).filter(Boolean) : [],
    };
    const result = gateway.writeJson(STORAGE_KEYS.notebook, normalized);
    return { ...result, state: result.ok ? cloneValue(normalized) : loadState() };
  }

  function savePage(page) {
    const loaded = loadStateResult();
    if (!loaded.ok) return { ...loaded, state: loaded.state };
    const state = loaded.state;
    const normalized = normalizePage(page);
    const nextPages = state.pages.filter((item) => item.date !== normalized.date);
    nextPages.push(normalized);
    return saveState({ ...state, pages: nextPages });
  }

  function saveMonthlyIssue(issue) {
    const loaded = loadStateResult();
    if (!loaded.ok) return { ...loaded, state: loaded.state };
    const state = loaded.state;
    const normalized = normalizeMonthlyIssue(issue);
    const nextIssues = state.monthlyIssues.filter((item) => item.monthKey !== normalized.monthKey);
    nextIssues.push(normalized);
    return saveState({ ...state, monthlyIssues: nextIssues });
  }

  function saveViewEvent(event) {
    const loaded = loadStateResult();
    if (!loaded.ok) return { ...loaded, state: loaded.state };
    const state = loaded.state;
    const normalized = normalizeViewEvent(event);
    if (!normalized) return { ok: false, code: "NOTEBOOK_VIEW_EVENT_INVALID", state };
    const recentEvents = state.viewEvents.filter((item) => item.date >= normalized.date.slice(0, 7));
    const nextEvents = recentEvents.filter((item) => item.id !== normalized.id);
    nextEvents.push(normalized);
    return saveState({ ...state, viewEvents: nextEvents });
  }

  function removePage(date) {
    const loaded = loadStateResult();
    if (!loaded.ok) return { ...loaded, state: loaded.state };
    const state = loaded.state;
    return saveState({ ...state, pages: state.pages.filter((page) => page.date !== date) });
  }

  return Object.freeze({ loadState, loadStateResult, savePage, saveMonthlyIssue, saveViewEvent, removePage });
}
