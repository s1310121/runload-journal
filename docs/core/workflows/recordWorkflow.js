import { createBodyProfileSnapshot, normalizeBodyProfile } from "../model/bodyProfileAdjustment.js";
import { calculateLoadModel, getBodyPartDistribution } from "../model/calculateLoadModel.js";
import {
  createV27ResultRecord,
  upsertV27ResultRecord,
} from "../model/v27/v27ResultService.js";
import { createRegionalV1ResultRecord, upsertRegionalV1ResultRecord, REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/regionalV1ResultService.js";
import { createNewModelV1ResultRecord, upsertNewModelV1ResultRecord, NEW_MODEL_V1_MODEL_VERSION, validateNewModelV1ResultRecord } from "../model/newModelV1/newModelV1ResultService.js";
import { createRegionalV1ResultRecord as createV25R1RegionalV1ResultRecord, REGIONAL_V1_MODEL_VERSION as V25R1_REGIONAL_V1_MODEL_VERSION } from "../model/v25r1Historical/regionalV1ResultService.js";
import { createRegionalV1ResultRecord as createFcrV19RegionalV1ResultRecord, REGIONAL_V1_MODEL_VERSION as FCR_V19_REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/fcrV19ResultService.js";
import { createRegionalV1ResultRecord as createLegacyPhase4RegionalV1ResultRecord, REGIONAL_V1_MODEL_VERSION as LEGACY_PHASE4_REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/legacyPhase4ResultService.js";
import { isNewModelV1RegionalModelRecord, isV26C1RegionalModelRecord, isV25R1RegionalModelRecord, isFcrV19RegionalModelRecord, stampCurrentRegionalModel } from "../model/regionalV1/regionalModelSnapshot.js";
import { validateRegionalEngineOutput } from "../model/regionalV1/engine/validation.js";
import { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } from "../safety/inputValidation.js";
import { normalizeSubjectiveFeedback } from "../safety/subjectiveFeedback.js";
import { evaluateSupportDecision } from "../safety/supportDecision.js";
import { STORAGE_KEYS } from "../storage/storageKeys.js";

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sortRecords(records = []) {
  return [...records].sort((left, right) => (
    left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
  ));
}

function sortFeedback(items = []) {
  return [...items].sort((left, right) => (
    left.date.localeCompare(right.date) || left.recordId.localeCompare(right.recordId)
  ));
}

function upsertById(items, item, getId) {
  const id = getId(item);
  const nextItems = [...items];
  const index = nextItems.findIndex((entry) => getId(entry) === id);
  if (index >= 0) nextItems[index] = item;
  else nextItems.push(item);
  return nextItems;
}

function regionalResultCreatorForRecord(record = {}) {
  if (isNewModelV1RegionalModelRecord(record)) return createNewModelV1ResultRecord;
  if (isV26C1RegionalModelRecord(record)) return createRegionalV1ResultRecord;
  if (isV25R1RegionalModelRecord(record)) return createV25R1RegionalV1ResultRecord;
  if (isFcrV19RegionalModelRecord(record)) return createFcrV19RegionalV1ResultRecord;
  return createLegacyPhase4RegionalV1ResultRecord;
}

function regionalModelVersionForRecord(record = {}) {
  if (isNewModelV1RegionalModelRecord(record)) return NEW_MODEL_V1_MODEL_VERSION;
  if (isV26C1RegionalModelRecord(record)) return REGIONAL_V1_MODEL_VERSION;
  if (isV25R1RegionalModelRecord(record)) return V25R1_REGIONAL_V1_MODEL_VERSION;
  if (isFcrV19RegionalModelRecord(record)) return FCR_V19_REGIONAL_V1_MODEL_VERSION;
  return LEGACY_PHASE4_REGIONAL_V1_MODEL_VERSION;
}

function storedRegionalResultForRecord(repository, record = {}) {
  const expectedVersion = regionalModelVersionForRecord(record);
  const rows = repository?.loadForRecord?.(record.id) || [];
  return [...rows]
    .filter((item) => item?.model_version === expectedVersion)
    .sort((left, right) => (
      String(right.source_record_revision || "").localeCompare(String(left.source_record_revision || ""))
      || String(right.generated_at || "").localeCompare(String(left.generated_at || ""))
      || String(right.id || "").localeCompare(String(left.id || ""))
    ))[0] || null;
}

function createModelExperience(
  records,
  subjectiveFeedback,
  targetRecordId,
  modelResultV27Repository,
  modelResultRegionalV1Repository,
) {
  const sortedRecords = sortRecords(records);
  const index = sortedRecords.findIndex((record) => record.id === targetRecordId);
  if (index < 0) return null;
  const record = sortedRecords[index];
  const v27ByRecord = modelResultV27Repository?.latestByRecord?.() || new Map();
  const v27ResultRecord = v27ByRecord.get(targetRecordId) || null;
  const storedRegionalV1ResultRecord = storedRegionalResultForRecord(modelResultRegionalV1Repository, record);
  const feedback = subjectiveFeedback.find((item) => item.recordId === targetRecordId) || null;
  let regionalV1ResultRecord = storedRegionalV1ResultRecord;
  let regionalV1Recovery = null;
  if (storedRegionalV1ResultRecord) {
    const newModelStored = storedRegionalV1ResultRecord.model_version === NEW_MODEL_V1_MODEL_VERSION;
    const newValidation = newModelStored ? validateNewModelV1ResultRecord(storedRegionalV1ResultRecord) : null;
    const validation = newModelStored ? { valid: newValidation.valid, issues: newValidation.issues.map((code) => ({ code })) } : validateRegionalEngineOutput(storedRegionalV1ResultRecord.result || {});
    const bodyMapRegions = storedRegionalV1ResultRecord.body_map_payload?.regions;
    const bodyMapValid = newModelStored && storedRegionalV1ResultRecord.result?.state === "BASELINE_OOD" ? true : (Array.isArray(bodyMapRegions) && bodyMapRegions.length === 12);
    if (!validation.valid || !bodyMapValid) {
      const sessionSequence = sortedRecords
        .filter((item) => item.date === record.date)
        .findIndex((item) => item.id === record.id) + 1;
      const recovered = regionalResultCreatorForRecord(record)({
        record,
        feedback: feedback || {},
        sessionSequence: Math.max(1, sessionSequence),
        allRecords: sortedRecords,
      });
      if (recovered.ok) {
        regionalV1ResultRecord = Object.freeze({
          ...recovered.resultRecord,
          recovery_status: "TRANSIENT_RECONSTRUCTED",
          recovery_source_result_id: storedRegionalV1ResultRecord.id,
        });
        regionalV1Recovery = Object.freeze({
          status: "RECOVERED",
          sourceResultId: storedRegionalV1ResultRecord.id,
          issueCodes: Object.freeze([
            ...validation.issues.map((issue) => issue.code),
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
          ]),
        });
      } else {
        regionalV1Recovery = Object.freeze({
          status: "FAILED",
          sourceResultId: storedRegionalV1ResultRecord.id,
          issueCodes: Object.freeze([
            ...validation.issues.map((issue) => issue.code),
            ...(bodyMapValid ? [] : ["BODY_MAP_INVALID"]),
            recovered.code || "RECONSTRUCTION_FAILED",
          ]),
        });
      }
    }
  }
  let modelResult = null;
  if (!v27ResultRecord) {
    const legacyRecords = sortedRecords.filter((item) => !v27ByRecord.has(item.id));
    const legacyIndex = legacyRecords.findIndex((item) => item.id === targetRecordId);
    const legacyResults = calculateLoadModel(legacyRecords);
    modelResult = legacyResults[legacyIndex] || null;
  }
  const supportDecision = feedback?.supportDecisionSnapshot
    || evaluateSupportDecision({ feedback: feedback || {}, planOutcome: record.planOutcome || {} });
  return Object.freeze({
    record: cloneValue(record),
    feedback: cloneValue(feedback),
    modelResult: cloneValue(modelResult),
    distribution: cloneValue(modelResult ? getBodyPartDistribution(modelResult) : {}),
    v27ResultRecord: cloneValue(v27ResultRecord),
    v27Result: cloneValue(v27ResultRecord?.result || null),
    regionalV1ResultRecord: cloneValue(regionalV1ResultRecord),
    regionalV1Result: cloneValue(regionalV1ResultRecord?.result || null),
    bodyMapV1: cloneValue(regionalV1ResultRecord?.body_map_payload || null),
    regionalV1Recovery: cloneValue(regionalV1Recovery),
    personalReferenceSnapshots: cloneValue(v27ResultRecord?.personal_reference_snapshots || {}),
    supportDecision: cloneValue(supportDecision),
  });
}

export function createRecordWorkflow({
  gateway,
  recordsRepository,
  subjectiveFeedbackRepository,
  profileRepository,
  modelResultV27Repository,
  modelResultRegionalV1Repository,
}) {
  function loadCollectionForMutation(repository, sourceName) {
    const result = repository?.loadAllResult?.();
    if (result?.ok) return result;
    if (result && !result.ok) {
      return {
        ...result,
        code: "STORAGE_SOURCE_READ_FAILED",
        details: { ...(result.details || {}), sourceName, sourceCode: result.code || "" },
      };
    }
    return {
      ok: false,
      code: "STORAGE_SOURCE_READ_FAILED",
      operation: "read",
      message: `Unable to read ${sourceName}.`,
      details: { sourceName, sourceCode: "LOAD_RESULT_UNAVAILABLE" },
      items: [],
    };
  }

  function saveRecordAndFeedback(recordInput = {}, feedbackInput = {}, profileInput = undefined) {
    const inputValidation = validateRunningRecordInput(recordInput);
    if (!inputValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_INPUT_VALIDATION_FAILED",
        validation: inputValidation,
      };
    }

    const recordsRead = loadCollectionForMutation(recordsRepository, "records");
    if (!recordsRead.ok) return recordsRead;
    const feedbackRead = loadCollectionForMutation(subjectiveFeedbackRepository, "subjectiveFeedback");
    if (!feedbackRead.ok) return feedbackRead;
    const v27Read = loadCollectionForMutation(modelResultV27Repository, "modelResultsV27");
    if (!v27Read.ok) return v27Read;
    const regionalRead = loadCollectionForMutation(modelResultRegionalV1Repository, "modelResultsRegionalV1");
    if (!regionalRead.ok) return regionalRead;

    const currentRecords = recordsRead.items;
    const currentFeedback = feedbackRead.items;
    const existingRecord = recordInput.id
      ? currentRecords.find((record) => record.id === recordInput.id)
      : null;
    const nowIso = new Date().toISOString();
    const explicitProfile = profileInput && typeof profileInput === "object";
    const profileRead = explicitProfile
      ? { ok: true, value: normalizeBodyProfile(profileInput) }
      : profileRepository?.loadResult?.();
    if (!profileRead?.ok) {
      return {
        ...(profileRead || {}),
        ok: false,
        code: "STORAGE_SOURCE_READ_FAILED",
        operation: profileRead?.operation || "read",
        message: profileRead?.message || "Unable to read profile.",
        details: { ...(profileRead?.details || {}), sourceName: "profile", sourceCode: profileRead?.code || "LOAD_RESULT_UNAVAILABLE" },
      };
    }
    const normalizedProfile = normalizeBodyProfile(profileRead.value || {});
    const bodyProfileSnapshot = normalizedProfile
      ? createBodyProfileSnapshot(normalizedProfile, nowIso)
      : existingRecord?.bodyProfileSnapshot || null;
    const versionedRecordInput = stampCurrentRegionalModel({
      ...recordInput,
      bodyProfileSnapshot,
      createdAt: existingRecord?.createdAt || recordInput.createdAt,
    });
    const normalizedRecordBase = normalizeRunningRecord(versionedRecordInput, {
      existingIds: currentRecords
        .filter((record) => record.id !== recordInput.id)
        .map((record) => record.id),
      nowIso,
      assumeExplicitRpe: true,
    });
    const normalizedRecord = stampCurrentRegionalModel(normalizedRecordBase);
    const recordValidation = validateRunningRecord(normalizedRecord);
    if (!recordValidation.ok) {
      return {
        ok: false,
        code: "RUNNING_RECORD_VALIDATION_FAILED",
        validation: recordValidation,
      };
    }

    const normalizedFeedback = normalizeSubjectiveFeedback({
      ...feedbackInput,
      recordId: normalizedRecord.id,
      date: normalizedRecord.date,
      checkedAt: feedbackInput.checkedAt || nowIso,
    }, {
      planOutcome: normalizedRecord.planOutcome || {},
    });

    const nextRecords = sortRecords(upsertById(
      currentRecords,
      normalizedRecord,
      (record) => record.id,
    ));
    const nextFeedback = sortFeedback(upsertById(
      currentFeedback,
      normalizedFeedback,
      (item) => item.recordId,
    ));
    const currentV27Results = v27Read.items;
    const currentRegionalV1Results = regionalRead.items;
    const calculation = createV27ResultRecord({
      record: normalizedRecord,
      allRecords: nextRecords,
      existingResultRecords: currentV27Results,
    });
    if (!calculation.ok) {
      return {
        ok: false,
        code: calculation.code || "V27_RESULT_CREATION_FAILED",
        validation: calculation.validation || null,
        message: calculation.message || "",
      };
    }
    const nextV27Results = upsertV27ResultRecord(
      currentV27Results,
      calculation.resultRecord,
    );
    const regionalCalculation = regionalResultCreatorForRecord(normalizedRecord)({
      record: normalizedRecord,
      feedback: normalizedFeedback,
      sessionSequence: nextRecords.filter((item) => item.date === normalizedRecord.date).findIndex((item) => item.id === normalizedRecord.id) + 1,
      allRecords: nextRecords,
    });
    if (!regionalCalculation.ok) {
      return { ok: false, code: regionalCalculation.code || "REGIONAL_V1_RESULT_CREATION_FAILED", validation: regionalCalculation.validation || null, message: regionalCalculation.error?.messageKey || "" };
    }
    const nextRegionalV1Results = isNewModelV1RegionalModelRecord(normalizedRecord)
      ? upsertNewModelV1ResultRecord(currentRegionalV1Results, regionalCalculation.resultRecord)
      : upsertRegionalV1ResultRecord(currentRegionalV1Results, regionalCalculation.resultRecord);

    const changes = [
      { key: STORAGE_KEYS.records, value: nextRecords },
      { key: STORAGE_KEYS.subjectiveFeedback, value: nextFeedback },
      { key: STORAGE_KEYS.modelResultsV27, value: nextV27Results },
      { key: STORAGE_KEYS.modelResultsRegionalV1, value: nextRegionalV1Results },
    ];
    if (explicitProfile) {
      changes.push({ key: STORAGE_KEYS.profile, value: normalizedProfile });
    }
    const saveResult = gateway.transact(changes);
    if (!saveResult.ok) {
      return {
        ...saveResult,
        code: "RECORD_EXPERIENCE_SAVE_FAILED",
      };
    }

    return {
      ok: true,
      record: cloneValue(normalizedRecord),
      feedback: cloneValue(normalizedFeedback),
      resultRecord: cloneValue(calculation.resultRecord),
      experience: createModelExperience(
        nextRecords,
        nextFeedback,
        normalizedRecord.id,
        modelResultV27Repository,
        modelResultRegionalV1Repository,
      ),
    };
  }

  function loadExperience(recordId) {
    if (!recordId) return null;
    return createModelExperience(
      recordsRepository.loadAll(),
      subjectiveFeedbackRepository.loadAll(),
      recordId,
      modelResultV27Repository,
      modelResultRegionalV1Repository,
    );
  }

  function loadLatestExperience() {
    const records = recordsRepository.loadAll();
    const latestRecord = [...records].sort((left, right) => (
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id)
    ))[0];
    return latestRecord ? loadExperience(latestRecord.id) : null;
  }

  function loadAllExperiences() {
    const records = recordsRepository.loadAll();
    const feedback = subjectiveFeedbackRepository.loadAll();
    return records.map((record) => createModelExperience(
      records,
      feedback,
      record.id,
      modelResultV27Repository,
      modelResultRegionalV1Repository,
    ));
  }

  return Object.freeze({
    saveRecordAndFeedback,
    loadExperience,
    loadLatestExperience,
    loadAllExperiences,
  });
}
