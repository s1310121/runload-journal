import { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } from "../safety/inputValidation.js";
import { createCollectionRepository } from "./collectionRepository.js";
import { STORAGE_KEYS } from "./storageKeys.js";
import { stampCurrentRegionalModel } from "../model/regionalV1/regionalModelSnapshot.js";

export function createRecordRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.records,
    normalizeItem: (item) => normalizeRunningRecord(item, {
      existingIds: [],
      nowIso: item.updatedAt || item.createdAt || new Date().toISOString(),
    }),
    sortItems: (items) => [...items].sort((left, right) => (
      left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
    )),
  });

  function save(record) {
    const inputValidation = validateRunningRecordInput(record);
    if (!inputValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_INPUT_VALIDATION_FAILED",
        validation: inputValidation,
        item: null,
      };
    }
    const existingResult = repository.loadAllResult();
    if (!existingResult.ok) return { ...existingResult, item: null };
    const existingRecords = existingResult.items;
    const normalizedRecord = normalizeRunningRecord(stampCurrentRegionalModel(record), {
      existingIds: existingRecords.map((item) => item.id),
      nowIso: new Date().toISOString(),
      assumeExplicitRpe: true,
    });
    const validation = validateRunningRecord(normalizedRecord);
    if (!validation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_VALIDATION_FAILED",
        validation,
        item: null,
      };
    }
    return repository.upsert(normalizedRecord);
  }

  function loadByDate(date) {
    return repository.loadAll().filter((record) => record.date === date);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    loadByDate,
    save,
    removeById: repository.removeById,
  });
}
