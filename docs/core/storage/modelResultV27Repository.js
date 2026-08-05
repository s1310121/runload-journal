import { V27_MODEL_VERSION } from "../model/v27/v27Constants.js";
import { createCollectionRepository } from "./collectionRepository.js";
import { STORAGE_KEYS } from "./storageKeys.js";

function normalizeResultRecord(item = {}) {
  if (
    !item
    || typeof item !== "object"
    || item.model_version !== V27_MODEL_VERSION
    || !String(item.id || "")
    || !String(item.record_id || "")
  ) {
    return null;
  }
  return Object.freeze({
    ...item,
    id: String(item.id),
    record_id: String(item.record_id),
    source_record_revision: String(item.source_record_revision || ""),
    generated_at: String(item.generated_at || ""),
    model_version: V27_MODEL_VERSION,
  });
}

function sortResultRecords(items) {
  return [...items].sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}

export function createModelResultV27Repository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.modelResultsV27,
    normalizeItem: normalizeResultRecord,
    getItemId: (item) => item.id,
    sortItems: sortResultRecords,
  });

  function loadForRecord(recordId) {
    return repository.loadAll().filter((item) => item.record_id === recordId);
  }

  function findLatestForRecord(recordId) {
    return loadForRecord(recordId).sort((left, right) => (
      right.source_record_revision.localeCompare(left.source_record_revision)
      || right.generated_at.localeCompare(left.generated_at)
      || right.id.localeCompare(left.id)
    ))[0] || null;
  }

  function latestByRecord() {
    const result = new Map();
    repository.loadAll().forEach((item) => {
      const current = result.get(item.record_id);
      if (
        !current
        || item.source_record_revision > current.source_record_revision
        || (
          item.source_record_revision === current.source_record_revision
          && item.id > current.id
        )
      ) {
        result.set(item.record_id, item);
      }
    });
    return result;
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    loadForRecord,
    findLatestForRecord,
    latestByRecord,
    saveAll: repository.saveAll,
    upsert: repository.upsert,
    removeById: repository.removeById,
  });
}

