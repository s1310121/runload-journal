import { BODY_PARTS } from "../model/modelConstants.js";
import { buildReviewCandidates, normalizeReviewReferenceDate, resolveNotebookDayType } from "./notebookContinuity.js";
import { buildObservationCandidate, normalizeObservationSelection } from "./observationLoop.js";

export const NOTEBOOK_MATERIALS = Object.freeze({
  recordSummary: "record-summary",
  subjectiveReflection: "subjective-reflection",
  planReflection: "plan-reflection",
  consultationNote: "consultation-note",
});

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


function isValidLocalDate(value = "") {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidMonthKey(value = "") {
  const match = String(value).match(/^(\d{4})-(\d{2})$/);
  return Boolean(match && Number(match[2]) >= 1 && Number(match[2]) <= 12);
}

function monthKeyFromDate(date = "") {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date).slice(0, 7) : "";
}

function latestByDate(items = [], getDate = (item) => item.date) {
  return [...items].sort((left, right) => (
    String(getDate(right)).localeCompare(String(getDate(left)))
  ))[0] || null;
}

function enteredBodyParts(feedback = {}) {
  return BODY_PARTS.filter((bodyPart) => (
    Number(feedback.fatigueByBodyPart?.[bodyPart] || 0) > 0
    || Number(feedback.discomfortByBodyPart?.[bodyPart] || 0) > 0
    || Boolean(feedback.reviewedBodyParts?.[bodyPart])
  ));
}

function enteredBodyAreas(feedback = {}) {
  return Array.isArray(feedback.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => item?.areaId)
    : [];
}

function findRecordForPage(page, records) {
  if (!page.recordId) return null;
  return records.find((record) => record.id === page.recordId) || null;
}

function buildPageView(page, dependencies) {
  const record = findRecordForPage(page, dependencies.records);
  const experience = record ? dependencies.loadExperience(record.id) : null;
  const feedback = experience?.feedback || null;
  const readArticles = (page.readArticleIds || [])
    .map((articleId) => dependencies.findArticle(articleId))
    .filter(Boolean);
  const reflectedRecords = (page.reflectionReferences || [])
    .map((recordId) => dependencies.records.find((recordItem) => recordItem.id === recordId))
    .filter(Boolean);
  const relatedPlans = dependencies.plans.filter((plan) => (
    plan.actualRecordId === record?.id || plan.scheduledDate === page.date
  ));
  return Object.freeze({
    page,
    record,
    feedback,
    readArticles,
    reflectedRecords,
    relatedPlans,
    enteredBodyParts: enteredBodyParts(feedback || {}),
    enteredBodyAreas: enteredBodyAreas(feedback || {}),
  });
}

function seenMaterialDedupeKey(material = {}) {
  if (material.type === "result-view") {
    return `result:${material.sourceDate || ""}:${material.activityType || "activity"}`;
  }
  if (material.type === "column-read") {
    return `column:${material.articleId || ""}`;
  }
  return String(material.key || "");
}

function uniqueSeenMaterials(materials = []) {
  const latestByLogicalKey = new Map();
  materials.forEach((material) => {
    const key = seenMaterialDedupeKey(material);
    if (!key) return;
    const existing = latestByLogicalKey.get(key);
    const currentViewedAt = String(material.viewedAt || "");
    const existingViewedAt = String(existing?.viewedAt || "");
    if (!existing || currentViewedAt.localeCompare(existingViewedAt) >= 0) {
      latestByLogicalKey.set(key, material);
    }
  });
  return [...latestByLogicalKey.values()].sort((left, right) => (
    left.type.localeCompare(right.type)
    || left.description.localeCompare(right.description, "ja")
    || String(left.key).localeCompare(String(right.key))
  ));
}

function buildSeenMaterials({ state, selectedDate, records, findArticle }) {
  const materials = (state.viewEvents || [])
    .filter((event) => event.date === selectedDate)
    .map((event) => {
      if (event.type === "result-view") {
        const record = records.find((item) => item.id === event.recordId) || null;
        if (!record) return null;
        return Object.freeze({
          type: "result-view",
          key: `result:${record.id}`,
          recordId: record.id,
          sourceDate: event.sourceDate || record.date,
          activityType: record.activityType || "run",
          viewedAt: event.viewedAt || "",
          theme: "run-context",
          title: "記録を確認しました",
          description: `${record.date}の${record.activityType === "rest" ? "休養記録" : "走行記録"}`,
          materialLabel: "記録確認",
        });
      }
      if (event.type === "column-read") {
        const article = findArticle(event.articleId) || null;
        if (!article) return null;
        return Object.freeze({
          type: "column-read",
          key: `column:${article.id}`,
          articleId: article.id,
          viewedAt: event.viewedAt || "",
          theme: "learning",
          title: "コラムを読みました",
          description: article.title,
          materialLabel: "コラム",
        });
      }
      return null;
    })
    .filter(Boolean)
    .sort((left, right) => left.type.localeCompare(right.type) || left.description.localeCompare(right.description, "ja"));

  return uniqueSeenMaterials(materials);
}

function automaticPageTitle(pageView) {
  if (pageView.page.pageTitle) return pageView.page.pageTitle;
  if (pageView.record?.activityType === "rest") return "休養と振り返りのページ";
  if (pageView.readArticles.length) return "知識を走りに結びつけたページ";
  if (pageView.enteredBodyAreas.length || pageView.enteredBodyParts.length) return "身体の記録を残したページ";
  if (pageView.record) return "今日の記録を見返したページ";
  return "今日の小さな記録";
}

function buildDailySuggestion({ today, pages, records, feedbackItems, plans, latestExperience }) {
  const todayPage = pages.find((page) => page.date === today) || null;
  const supportRoute = latestExperience?.supportDecision?.route || "normal";
  if (supportRoute === "urgent") {
    return Object.freeze({
      type: "official-help",
      title: "公的な相談先を確認する",
      description: "RunLoadは緊急性を判定しません。本人が選択した項目と公式の窓口を分けて確認します。",
      screen: "support-guidance",
      parameters: latestExperience?.record?.id ? { recordId: latestExperience.record.id } : {},
    });
  }
  if (supportRoute === "consult") {
    return Object.freeze({
      type: "consultation",
      title: "相談したいことを1つ整理する",
      description: "記録ノートは走行や通常課題を勧めません。本人が伝えたい内容を残します。",
      screen: "consultation",
      parameters: latestExperience?.record?.id ? { recordId: latestExperience.record.id } : {},
    });
  }
  if (!records.length) {
    return Object.freeze({
      type: "record",
      title: "走行または休養を1つ記録する",
      description: "走ることは課題にしません。今日の事実を1つ残します。",
      screen: "record-input",
      parameters: {},
    });
  }
  const latestFeedback = latestExperience?.feedback;
  if (["not_asked", "deferred"].includes(latestFeedback?.checkStatus)) {
    return Object.freeze({
      type: "subjective",
      title: "前回の身体の記録を確認する",
      description: "自分がどう感じたかをページの材料にします。",
      screen: "result",
      parameters: { recordId: latestExperience.record.id },
    });
  }
  if (!todayPage?.oneThingNote && !todayPage?.dailyComment) {
    return Object.freeze({
      type: "comment",
      title: "今日の1つを1行残す",
      description: "評価や採点はしません。今日覚えておきたいことを1つ残します。",
      screen: "notebook",
      parameters: { view: "day", date: today },
    });
  }
  const unfinishedPlan = latestByDate(plans.filter((plan) => (
    plan.scheduledDate <= today && !["completed", "not_completed", "changed"].includes(plan.outcomeStatus)
  )), (plan) => plan.scheduledDate);
  if (unfinishedPlan) {
    return Object.freeze({
      type: "plan-reflection",
      title: "予定と実績を見返す",
      description: "予定どおりでなくても失敗とは扱いません。変更した事実や理由を残します。",
      screen: "plan",
      parameters: { planId: unfinishedPlan.id },
    });
  }
  const pageWithoutArticle = [...pages].reverse().find((page) => !(page.readArticleIds || []).length);
  if (pageWithoutArticle) {
    return Object.freeze({
      type: "learning",
      title: "一般知識を1つ読む",
      description: "記事は診断や処方として扱いません。次に見返したい知識として残します。",
      screen: "column",
      parameters: {},
    });
  }
  const latestRecord = latestExperience?.record;
  const olderRecord = latestRecord
    ? latestByDate(records.filter((record) => record.id !== latestRecord.id && record.date <= latestRecord.date))
    : null;
  if (olderRecord) {
    return Object.freeze({
      type: "reflection",
      title: "過去の記録を1つ見返す",
      description: "記録ノートは良し悪しを自動評価しません。気づいた違いだけを日ページへ残します。",
      screen: "history",
      parameters: { period: "all" },
    });
  }
  return Object.freeze({
    type: "comment",
    title: "今日のページを読み返す",
    description: "記録ノートは新しい走行を求めません。残したページを自分のペースで見返します。",
    screen: "notebook",
    parameters: { view: "day", date: today },
  });
}

function normalizeSelectedMaterials(values = []) {
  const allowed = new Set(Object.values(NOTEBOOK_MATERIALS));
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

export function createNotebookWorkflow({ services, notebookRepository }) {
  function loadContext(options = {}) {
    const state = notebookRepository.loadState();
    const records = services.storage.records.loadAll();
    const feedbackItems = services.storage.subjectiveFeedback.loadAll();
    const plans = services.storage.plans.loadAll();
    const latestExperience = services.workflows.records.loadLatestExperience();
    const today = options.today || localToday();
    const requestedDate = options.date || "";
    const selectedDate = requestedDate || today;
    const requestedMonth = options.monthKey || monthKeyFromDate(selectedDate) || today.slice(0, 7);
    const page = state.pages.find((item) => item.date === selectedDate) || {
      date: selectedDate,
      recordId: records.find((record) => record.date === selectedDate)?.id || "",
      pageTitle: "",
      dailyComment: "",
      oneThingTheme: "",
      oneThingNote: "",
      selectedSeenMaterialKey: "",
      selectedMaterials: [],
      readArticleIds: [],
      reflectionReferences: [],
      consultationNoteReference: "",
      reviewReferenceDate: "",
      observationPromptState: "",
      observationSourceDate: "",
      observationReviewNote: "",
    };
    const dependencies = {
      records,
      plans,
      loadExperience: services.workflows.records.loadExperience,
      findArticle: services.column.findById,
    };
    const pageView = buildPageView(page, dependencies);
    const reviewCandidates = buildReviewCandidates(state.pages, selectedDate)
      .map((item) => buildPageView(item, dependencies))
      .map((item) => Object.freeze({ ...item, displayTitle: automaticPageTitle(item) }));
    const reviewPage = state.pages.find((item) => item.date === page.reviewReferenceDate) || null;
    const reviewPageView = reviewPage ? buildPageView(reviewPage, dependencies) : null;
    const observationCandidatePage = buildObservationCandidate({ pages: state.pages, records, selectedDate, currentPage: page });
    const observationSourcePage = state.pages.find((item) => item.date === page.observationSourceDate) || null;
    const observationCandidateView = observationCandidatePage ? buildPageView(observationCandidatePage, dependencies) : null;
    const observationSourcePageView = observationSourcePage ? buildPageView(observationSourcePage, dependencies) : null;
    const pagesInMonth = state.pages
      .filter((item) => item.date.startsWith(requestedMonth))
      .map((item) => buildPageView(item, dependencies))
      .sort((left, right) => left.page.date.localeCompare(right.page.date));
    const issue = state.monthlyIssues.find((item) => item.monthKey === requestedMonth) || {
      monthKey: requestedMonth,
      title: "",
      coverPageDate: "",
      featuredPageDates: [],
      editorNote: "",
    };
    return Object.freeze({
      today,
      state,
      records,
      feedbackItems,
      plans,
      selectedDate,
      selectedMonth: requestedMonth,
      pageView: Object.freeze({ ...pageView, displayTitle: automaticPageTitle(pageView), dayType: resolveNotebookDayType(pageView.record) }),
      reviewCandidates: Object.freeze(reviewCandidates),
      reviewPageView: reviewPageView ? Object.freeze({ ...reviewPageView, displayTitle: automaticPageTitle(reviewPageView), dayType: resolveNotebookDayType(reviewPageView.record) }) : null,
      observationCandidate: observationCandidateView ? Object.freeze({ ...observationCandidateView, displayTitle: automaticPageTitle(observationCandidateView), dayType: resolveNotebookDayType(observationCandidateView.record) }) : null,
      observationSourcePageView: observationSourcePageView ? Object.freeze({ ...observationSourcePageView, displayTitle: automaticPageTitle(observationSourcePageView), dayType: resolveNotebookDayType(observationSourcePageView.record) }) : null,
      pagesInMonth: Object.freeze(pagesInMonth.map((item) => Object.freeze({ ...item, displayTitle: automaticPageTitle(item) }))),
      issue,
      suggestion: buildDailySuggestion({ today, pages: state.pages, records, feedbackItems, plans, latestExperience }),
      seenMaterials: Object.freeze(buildSeenMaterials({ state, selectedDate, records, findArticle: services.column.findById })),
    });
  }

  function saveDayPage(input = {}) {
    if (!isValidLocalDate(input.date)) return { ok: false, code: "NOTEBOOK_PAGE_DATE_REQUIRED", state: notebookRepository.loadState() };
    const state = notebookRepository.loadState();
    const existing = state.pages.find((page) => page.date === input.date) || {};
    const reviewReferenceDate = normalizeReviewReferenceDate(
      input.reviewReferenceDate ?? existing.reviewReferenceDate ?? "",
      input.date,
      state.pages,
    );
    const observation = normalizeObservationSelection({
      state: input.observationPromptState ?? existing.observationPromptState ?? "",
      sourceDate: input.observationSourceDate ?? existing.observationSourceDate ?? "",
      reviewNote: input.observationReviewNote ?? existing.observationReviewNote ?? "",
      selectedDate: input.date,
      pages: state.pages,
      records: services.storage.records.loadAll(),
    });
    return notebookRepository.savePage({
      ...existing,
      date: input.date,
      recordId: input.recordId ?? existing.recordId ?? "",
      pageTitle: input.pageTitle ?? existing.pageTitle ?? "",
      dailyComment: input.dailyComment ?? existing.dailyComment ?? "",
      oneThingTheme: input.oneThingTheme ?? existing.oneThingTheme ?? "",
      oneThingNote: input.oneThingNote ?? existing.oneThingNote ?? "",
      selectedSeenMaterialKey: input.selectedSeenMaterialKey ?? existing.selectedSeenMaterialKey ?? "",
      selectedMaterials: normalizeSelectedMaterials(input.selectedMaterials ?? existing.selectedMaterials ?? []),
      readArticleIds: input.readArticleIds ?? existing.readArticleIds ?? [],
      reflectionReferences: input.reflectionReferences ?? existing.reflectionReferences ?? [],
      consultationNoteReference: input.consultationNoteReference ?? existing.consultationNoteReference ?? "",
      reviewReferenceDate,
      ...observation,
    });
  }

  function saveMonthlyIssue(input = {}) {
    if (!isValidMonthKey(input.monthKey)) return { ok: false, code: "NOTEBOOK_MONTH_REQUIRED", state: notebookRepository.loadState() };
    const context = loadContext({ monthKey: input.monthKey });
    const validDates = new Set(context.pagesInMonth.map((pageView) => pageView.page.date));
    const featuredPageDates = [...new Set(input.featuredPageDates || [])].filter((date) => validDates.has(date));
    const coverPageDate = validDates.has(input.coverPageDate) ? input.coverPageDate : context.pagesInMonth.at(-1)?.page.date || "";
    return notebookRepository.saveMonthlyIssue({
      monthKey: input.monthKey,
      title: input.title,
      coverPageDate,
      featuredPageDates,
      editorNote: input.editorNote,
    });
  }

  function addReflectionReference(date, recordId) {
    const existing = notebookRepository.loadState().pages.find((page) => page.date === date) || {};
    return saveDayPage({
      ...existing,
      date,
      reflectionReferences: [...new Set([...(existing.reflectionReferences || []), recordId])].filter(Boolean),
    });
  }

  function rememberViewedResult(recordId, date = localToday()) {
    const record = services.storage.records.findById(String(recordId || ""));
    if (!record) return { ok: false, code: "NOTEBOOK_VIEW_RECORD_NOT_FOUND", state: notebookRepository.loadState() };
    return notebookRepository.saveViewEvent({
      id: `${date}-result-view-${record.date}-${record.activityType || "activity"}`,
      date,
      type: "result-view",
      recordId: record.id,
      sourceDate: record.date,
      title: record.activityType === "rest" ? "休養記録" : "走行記録",
    });
  }

  function rememberReadArticle(articleId, date = localToday()) {
    const article = services.column.findById(String(articleId || ""));
    if (!article) return { ok: false, code: "NOTEBOOK_VIEW_ARTICLE_NOT_FOUND", state: notebookRepository.loadState() };
    return notebookRepository.saveViewEvent({
      id: `${date}-column-read-${article.id}`,
      date,
      type: "column-read",
      articleId: article.id,
      title: article.title,
    });
  }

  return Object.freeze({ loadContext, saveDayPage, saveMonthlyIssue, addReflectionReference, rememberViewedResult, rememberReadArticle });
}
