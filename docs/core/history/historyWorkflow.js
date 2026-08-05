import { STORAGE_KEYS } from "../storage/storageKeys.js";

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function localDateFromOffset(daysAgo = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterByPeriod(records, period) {
  if (period === "all") return records;
  const days = Number(period);
  if (!Number.isFinite(days) || days <= 0) return records;
  const minimumDate = localDateFromOffset(days - 1);
  return records.filter((record) => record.date >= minimumDate);
}

function hasCompletedSubjectiveCheck(feedback) {
  const status = String(feedback?.checkStatus || "not_asked");
  return !["not_asked", "deferred"].includes(status);
}

function includesText(value, query) {
  return String(value || "").toLocaleLowerCase("ja-JP").includes(query);
}

function removeRecordReferencesFromPage(page, recordId) {
  const directlyLinked = page.recordId === recordId;
  const reflected = (page.reflectionReferences || []).includes(recordId);
  const consultationLinked = page.consultationNoteReference === recordId;
  if (!(directlyLinked || reflected || consultationLinked)) return page;

  const recordDependentMaterials = new Set([
    "record-summary",
    "subjective-reflection",
    "consultation-note",
  ]);
  return {
    ...page,
    recordId: directlyLinked ? "" : page.recordId,
    selectedMaterials: directlyLinked
      ? (page.selectedMaterials || []).filter((material) => !recordDependentMaterials.has(material))
      : page.selectedMaterials,
    reflectionReferences: (page.reflectionReferences || []).filter((referenceId) => referenceId !== recordId),
    consultationNoteReference: consultationLinked ? "" : page.consultationNoteReference,
  };
}

function restorePageReferences(currentPage, previousPage, recordId) {
  if (!currentPage) return previousPage;
  const restoredMaterials = new Set(currentPage.selectedMaterials || []);
  if (previousPage.recordId === recordId) {
    (previousPage.selectedMaterials || []).forEach((material) => restoredMaterials.add(material));
  }
  const restoredReflections = new Set(currentPage.reflectionReferences || []);
  if ((previousPage.reflectionReferences || []).includes(recordId)) restoredReflections.add(recordId);
  return {
    ...currentPage,
    recordId: previousPage.recordId === recordId && !currentPage.recordId
      ? recordId
      : currentPage.recordId,
    selectedMaterials: [...restoredMaterials],
    reflectionReferences: [...restoredReflections],
    consultationNoteReference: previousPage.consultationNoteReference === recordId && !currentPage.consultationNoteReference
      ? recordId
      : currentPage.consultationNoteReference,
  };
}

function removeRecordReferencesFromPlan(plan, recordId) {
  if (plan.sourceRecordId !== recordId && plan.actualRecordId !== recordId) return plan;
  return {
    ...plan,
    sourceRecordId: plan.sourceRecordId === recordId ? "" : plan.sourceRecordId,
    actualRecordId: plan.actualRecordId === recordId ? "" : plan.actualRecordId,
  };
}

function restorePlanReferences(currentPlan, previousPlan, recordId) {
  if (!currentPlan) return null;
  return {
    ...currentPlan,
    sourceRecordId: previousPlan.sourceRecordId === recordId && !currentPlan.sourceRecordId
      ? recordId
      : currentPlan.sourceRecordId,
    actualRecordId: previousPlan.actualRecordId === recordId && !currentPlan.actualRecordId
      ? recordId
      : currentPlan.actualRecordId,
  };
}

export function createHistoryWorkflow({
  gateway,
  recordsRepository,
  modelResultV27Repository,
  modelResultRegionalV1Repository,
  subjectiveFeedbackRepository,
  planRepository,
  notebookRepository,
}) {
  function readCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || `Unable to read ${sourceName}.`,
      details: { ...(result?.details || {}), sourceName, sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function readNotebookForMutation() {
    const result = notebookRepository?.loadStateResult?.();
    if (result?.ok) return result;
    return {
      ...(result || {}),
      ok: false,
      code: "HISTORY_SOURCE_READ_FAILED",
      operation: result?.operation || "read",
      message: result?.message || "Unable to read notebook.",
      details: { ...(result?.details || {}), sourceName: "notebook", sourceCode: result?.code || "LOAD_RESULT_UNAVAILABLE" },
      state: result?.state || { pages: [], monthlyIssues: [], viewEvents: [] },
    };
  }

  function search(filters = {}) {
    const query = String(filters.query || "").trim().toLocaleLowerCase("ja-JP");
    const activityType = String(filters.activityType || "all");
    const subjective = String(filters.subjective || "all");
    const bodyPart = String(filters.bodyPart || "all");
    const allFeedback = subjectiveFeedbackRepository.loadAll();
    const feedbackByRecordId = new Map(allFeedback.map((item) => [item.recordId, item]));
    const records = filterByPeriod(recordsRepository.loadAll(), filters.period || "28")
      .filter((record) => activityType === "all" || record.activityType === activityType)
      .filter((record) => {
        const feedback = feedbackByRecordId.get(record.id) || null;
        const subjectiveCheckCompleted = hasCompletedSubjectiveCheck(feedback);
        if (subjective === "entered" && !subjectiveCheckCompleted) return false;
        if (subjective === "none" && subjectiveCheckCompleted) return false;
        if (bodyPart !== "all") {
          const fatigue = Number(feedback?.fatigueByBodyPart?.[bodyPart] || 0);
          const discomfort = Number(feedback?.discomfortByBodyPart?.[bodyPart] || 0);
          const reviewed = Boolean(feedback?.reviewedBodyParts?.[bodyPart]);
          if (!(fatigue > 0 || discomfort > 0 || reviewed)) return false;
        }
        if (!query) return true;
        const searchable = [
          record.date,
          record.memo,
          record.course?.name,
          feedback?.consultationNote,
          ...Object.keys(feedback?.reviewedBodyParts || {}).filter((key) => feedback.reviewedBodyParts[key]),
        ];
        return searchable.some((value) => includesText(value, query));
      })
      .sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));

    return records.map((record) => ({
      record: cloneValue(record),
      feedback: cloneValue(feedbackByRecordId.get(record.id) || null),
    }));
  }

  function deleteRecord(recordId) {
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items;
    const record = records.find((item) => item.id === recordId);
    if (!record) return { ok: false, code: "HISTORY_RECORD_NOT_FOUND" };
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items;
    const removedFeedback = feedbackItems.find((item) => item.recordId === recordId) || null;
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items;
    const removedModelResults = modelResultItems.filter((item) => item.record_id === recordId);
    const regionalRead = readCollectionForMutation(modelResultRegionalV1Repository, "modelResultsRegionalV1");
    if (!regionalRead.ok) return regionalRead;
    const regionalV1Items = regionalRead.items;
    const removedRegionalV1Results = regionalV1Items.filter((item) => item.record_id === recordId);
    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const plans = plansRead.items;
    const affectedPlans = plans.filter((plan) => plan.sourceRecordId === recordId || plan.actualRecordId === recordId);
    const notebookRead = readNotebookForMutation();
    if (!notebookRead.ok) return notebookRead;
    const notebookState = notebookRead.state;
    const affectedPages = notebookState.pages.filter((page) => (
      page.recordId === recordId
      || (page.reflectionReferences || []).includes(recordId)
      || page.consultationNoteReference === recordId
    ));
    const nextPages = notebookState.pages.map((page) => removeRecordReferencesFromPage(page, recordId));
    const nextPlans = plans.map((plan) => removeRecordReferencesFromPlan(plan, recordId));
    const undoEntry = {
      version: 3,
      deletedAt: new Date().toISOString(),
      record,
      feedback: removedFeedback,
      modelResultsV27: removedModelResults,
      modelResultsRegionalV1: removedRegionalV1Results,
      affectedPages,
      affectedPlans,
    };
    const result = gateway.transact([
      { key: STORAGE_KEYS.records, value: records.filter((item) => item.id !== recordId) },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems.filter((item) => item.recordId !== recordId) },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.modelResultsRegionalV1, value: regionalV1Items.filter((item) => item.record_id !== recordId) },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.notebook, value: { ...notebookState, pages: nextPages } },
      { key: STORAGE_KEYS.historyUndo, value: undoEntry },
    ]);
    return { ...result, deleted: result.ok, undoEntry: result.ok ? cloneValue(undoEntry) : null };
  }

  function loadUndoEntry() {
    return gateway.readJson(STORAGE_KEYS.historyUndo, null);
  }

  function loadUndoEntryResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.historyUndo, null);
    if (!result.ok) return { ...result, code: "HISTORY_SOURCE_READ_FAILED", entry: null };
    if (result.value != null && (typeof result.value !== "object" || Array.isArray(result.value))) {
      return { ok: false, code: "HISTORY_UNDO_INVALID", operation: "validate", key: STORAGE_KEYS.historyUndo, entry: null };
    }
    return { ok: true, key: STORAGE_KEYS.historyUndo, exists: result.exists, entry: result.value };
  }

  function undoDelete() {
    const undoRead = loadUndoEntryResult();
    if (!undoRead.ok) return undoRead;
    const entry = undoRead.entry;
    if (!entry?.record?.id) return { ok: false, code: "HISTORY_UNDO_NOT_AVAILABLE" };
    const recordId = entry.record.id;
    const recordsRead = readCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const records = recordsRead.items.filter((item) => item.id !== recordId);
    records.push(entry.record);
    const feedbackRead = readCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const feedbackItems = feedbackRead.items.filter((item) => item.recordId !== recordId);
    if (entry.feedback) feedbackItems.push(entry.feedback);
    const removedResultIds = new Set(
      (entry.modelResultsV27 || []).map((item) => item.id),
    );
    const v27Read = readCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const modelResultItems = v27Read.items
      .filter((item) => !removedResultIds.has(item.id));
    modelResultItems.push(...(entry.modelResultsV27 || []));
    const removedRegionalV1Ids = new Set((entry.modelResultsRegionalV1 || []).map((item) => item.id));
    const regionalRead = readCollectionForMutation(modelResultRegionalV1Repository, "modelResultsRegionalV1");
    if (!regionalRead.ok) return regionalRead;
    const regionalV1Items = regionalRead.items.filter((item) => !removedRegionalV1Ids.has(item.id));
    regionalV1Items.push(...(entry.modelResultsRegionalV1 || []));

    const notebookRead = readNotebookForMutation();
    if (!notebookRead.ok) return notebookRead;
    const notebookState = notebookRead.state;
    const previousPagesByDate = new Map((entry.affectedPages || []).map((page) => [page.date, page]));
    const nextPages = notebookState.pages.map((page) => (
      previousPagesByDate.has(page.date)
        ? restorePageReferences(page, previousPagesByDate.get(page.date), recordId)
        : page
    ));
    (entry.affectedPages || []).forEach((previousPage) => {
      if (!nextPages.some((page) => page.date === previousPage.date)) nextPages.push(previousPage);
    });

    const plansRead = readCollectionForMutation(planRepository, "plans");
    if (!plansRead.ok) return plansRead;
    const currentPlans = plansRead.items;
    const previousPlansById = new Map((entry.affectedPlans || []).map((plan) => [plan.id, plan]));
    const nextPlans = currentPlans.map((plan) => (
      previousPlansById.has(plan.id)
        ? restorePlanReferences(plan, previousPlansById.get(plan.id), recordId)
        : plan
    )).filter(Boolean);

    const result = gateway.transact([
      { key: STORAGE_KEYS.records, value: records },
      { key: STORAGE_KEYS.subjectiveFeedback, value: feedbackItems },
      { key: STORAGE_KEYS.modelResultsV27, value: modelResultItems },
      { key: STORAGE_KEYS.modelResultsRegionalV1, value: regionalV1Items },
      { key: STORAGE_KEYS.plans, value: nextPlans },
      { key: STORAGE_KEYS.notebook, value: { ...notebookState, pages: nextPages } },
      { key: STORAGE_KEYS.historyUndo, remove: true },
    ]);
    return { ...result, restored: result.ok, record: result.ok ? cloneValue(entry.record) : null };
  }

  return Object.freeze({ search, deleteRecord, loadUndoEntry, loadUndoEntryResult, undoDelete });
}
