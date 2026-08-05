import { normalizeSubjectiveFeedback } from "../safety/subjectiveFeedback.js";
import { createCollectionRepository } from "./collectionRepository.js";
import { STORAGE_KEYS } from "./storageKeys.js";

export function createSubjectiveFeedbackRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.subjectiveFeedback,
    normalizeItem: (item) => normalizeSubjectiveFeedback(item, {
      planOutcome: item.planOutcome || {},
    }),
    getItemId: (item) => item.recordId || `feedback-${item.date}`,
    sortItems: (items) => [...items].sort((left, right) => (
      left.date.localeCompare(right.date) || left.recordId.localeCompare(right.recordId)
    )),
  });

  function findByRecordId(recordId) {
    return repository.loadAll().find((feedback) => feedback.recordId === recordId) || null;
  }

  function save(feedback, context = {}) {
    const normalized = normalizeSubjectiveFeedback(feedback, context);
    if (!normalized.recordId && !normalized.date) {
      return { ok: false, code: "SUBJECTIVE_FEEDBACK_TARGET_REQUIRED", item: null };
    }
    return repository.upsert(normalized);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findByRecordId,
    save,
    removeById: repository.removeById,
  });
}
