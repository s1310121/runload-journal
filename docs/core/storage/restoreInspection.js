import { PERSONAL_PROFILE_SCHEMA_VERSION } from "../model/bodyProfileAdjustment.js";
import { REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/regionalV1ResultService.js";
import { NEW_MODEL_V1_MODEL_VERSION, validateNewModelV1ResultRecord } from "../model/newModelV1/newModelV1ResultService.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION, validatePrimaryRegionalV2ResultRecord } from "../model/nextPrimaryR12Candidate/primaryRegionalV2ResultService.js";
import { REGIONAL_V1_MODEL_VERSION as V25R1_REGIONAL_V1_MODEL_VERSION } from "../model/v25r1Historical/regionalV1ResultService.js";
import { REGIONAL_V1_MODEL_VERSION as FCR_V19_REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/fcrV19ResultService.js";
import { REGIONAL_V1_MODEL_VERSION as LEGACY_PHASE4_REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/legacyPhase4ResultService.js";
import { validateRegionalEngineOutput } from "../model/regionalV1/engine/validation.js";
import { V27_MODEL_VERSION } from "../model/v27/v27Constants.js";
import { assertV27ResultSemantics } from "../model/v27/v27Model.js";
import { NOTEBOOK_STATE_VERSION } from "../notebook/notebookContinuity.js";
import { INPUT_LIMITS } from "../safety/inputSafety.js";
import { validateRunningRecordInput, normalizeRunningRecord, validateRunningRecord } from "../safety/inputValidation.js";
import { validateCoursePresetInput } from "./courseRepository.js";
import { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } from "./storageKeys.js";

export const RESTORE_INSPECTION_VERSION = "runload-restore-inspection-v1";
const SUPPORTED_REGIONAL_MODEL_VERSIONS = new Set([PRIMARY_REGIONAL_V2_MODEL_VERSION, NEW_MODEL_V1_MODEL_VERSION, REGIONAL_V1_MODEL_VERSION, V25R1_REGIONAL_V1_MODEL_VERSION, FCR_V19_REGIONAL_V1_MODEL_VERSION, LEGACY_PHASE4_REGIONAL_V1_MODEL_VERSION]);
export const RESTORE_STATUS = Object.freeze({
  supported: "SUPPORTED",
  review: "REVIEW_REQUIRED",
  blocked: "RESTORE_BLOCKED",
});

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function issue(severity, code, area, message, itemId = "", details = {}) {
  return Object.freeze({ severity, code, area, message, itemId: String(itemId || ""), details: Object.freeze({ ...details }) });
}


function withinCollectionLimit(value, maximum, area, label, issues) {
  if (!Array.isArray(value)) return false;
  if (value.length <= maximum) return true;
  issues.push(issue(
    "BLOCKING",
    "COLLECTION_LIMIT_EXCEEDED",
    area,
    `${label}の件数が多すぎます。`,
    "",
    { count: value.length, maximum },
  ));
  return false;
}

function addDuplicateIssues(items, getId, area, label, issues) {
  const seen = new Set();
  const duplicates = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const id = String(getId(item) || "");
    if (!id) return;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });
  duplicates.forEach((id) => issues.push(issue(
    "BLOCKING",
    "DUPLICATE_ID",
    area,
    `${label}に同じ識別子が複数あります。`,
    id,
  )));
}

function deepFiniteNumbers(value, path = "", issues = [], area = "data", itemId = "") {
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(issue("BLOCKING", "NONFINITE_NUMBER", area, "有限でない数値が含まれています。", itemId, { path }));
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => deepFiniteNumbers(item, `${path}[${index}]`, issues, area, itemId));
  } else if (isObject(value)) {
    Object.entries(value).forEach(([key, item]) => deepFiniteNumbers(item, path ? `${path}.${key}` : key, issues, area, itemId));
  }
  return issues;
}

function inspectRecords(records, issues) {
  addDuplicateIssues(records, (item) => item?.id, "records", "走行・休養記録", issues);
  (records || []).forEach((record, index) => {
    const itemId = String(record?.id || `#${index + 1}`);
    if (!isObject(record) || !record.id) {
      issues.push(issue("BLOCKING", "RECORD_OBJECT_OR_ID_REQUIRED", "records", "記録の形式または識別子を確認できません。", itemId));
      return;
    }
    const inputValidation = validateRunningRecordInput(record);
    const normalized = normalizeRunningRecord(record, {
      existingIds: [],
      nowIso: record.updatedAt || record.createdAt || "2000-01-01T00:00:00.000Z",
    });
    const validation = validateRunningRecord(normalized);
    if (!inputValidation.ok || !validation.ok) {
      issues.push(issue("BLOCKING", "RECORD_SCHEMA_INVALID", "records", "走行・休養記録の必須項目または値の範囲が現在の形式に適合しません。", itemId, {
        inputErrors: inputValidation.errors?.map((item) => item.code) || [],
        recordErrors: validation.errors?.map((item) => item.code) || [],
      }));
    }
    deepFiniteNumbers(record, "", issues, "records", itemId);
  });
}

function inspectV27Results(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "v27Results", "走行全体の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "V27_RESULT_ID_REQUIRED", "v27Results", "走行全体の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (item.model_version !== V27_MODEL_VERSION) {
      issues.push(issue("BLOCKING", "V27_VERSION_UNSUPPORTED", "v27Results", "対応していない走行全体の結果形式です。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "V27_RECORD_REFERENCE_MISSING", "v27Results", "結果が参照する走行・休養記録がバックアップ内にありません。", itemId));
    }
    if (item.input_snapshot?.record?.id && String(item.input_snapshot.record.id) !== String(item.record_id)) {
      issues.push(issue("BLOCKING", "V27_SNAPSHOT_REFERENCE_MISMATCH", "v27Results", "結果と元の記録の対応を確認できません。", itemId));
    }
    if (item.state === "RUN") {
      const semantic = assertV27ResultSemantics(item.result);
      if (!semantic.ok) {
        issues.push(issue("BLOCKING", "V27_SEMANTICS_INVALID", "v27Results", "走行全体の保存済み結果が現在の意味規則に適合しません。", itemId, { errors: semantic.errors }));
      }
    } else if (item.state !== "REST" || item.result !== null) {
      issues.push(issue("BLOCKING", "V27_STATE_INVALID", "v27Results", "走行全体の結果状態を確認できません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "v27Results", itemId);
  });
}

function inspectRegionalResults(results, recordIds, issues) {
  addDuplicateIssues(results, (item) => item?.id, "regionalResults", "部位別の保存済み結果", issues);
  (results || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id || !item.record_id) {
      issues.push(issue("BLOCKING", "REGIONAL_RESULT_ID_REQUIRED", "regionalResults", "部位別の保存済み結果の識別情報が不足しています。", itemId));
      return;
    }
    if (!SUPPORTED_REGIONAL_MODEL_VERSIONS.has(item.model_version)) {
      issues.push(issue("BLOCKING", "REGIONAL_VERSION_UNSUPPORTED", "regionalResults", "対応していない部位別結果形式です。", itemId));
    }
    if (!recordIds.has(String(item.record_id))) {
      issues.push(issue("BLOCKING", "REGIONAL_RECORD_REFERENCE_MISSING", "regionalResults", "部位別結果が参照する記録がバックアップ内にありません。", itemId));
    }
    if (item.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
      const outputValidation = validatePrimaryRegionalV2ResultRecord(item);
      if (!outputValidation.valid) issues.push(issue("BLOCKING", "PRIMARY_REGIONAL_V2_OUTPUT_INVALID", "regionalResults", "部位別比較値の12部位・入力追跡情報を確認できません。", itemId, { issueCodes: outputValidation.issues.slice(0, 20) }));
    } else if (item.model_version === NEW_MODEL_V1_MODEL_VERSION) {
      const outputValidation = validateNewModelV1ResultRecord(item);
      if (!outputValidation.valid) issues.push(issue("BLOCKING", "NEW_MODEL_REGIONAL_OUTPUT_INVALID", "regionalResults", "新しい部位別結果の数値・12部位・入力追跡情報を確認できません。", itemId, { issueCodes: outputValidation.issues.slice(0, 20) }));
    } else {
      const outputValidation = validateRegionalEngineOutput(item.result || {});
      if (!outputValidation.valid) {
        issues.push(issue("BLOCKING", "REGIONAL_OUTPUT_INVALID", "regionalResults", "部位別結果が12部位・数値・追跡情報の現在の形式に適合しません。", itemId, {
          issueCodes: outputValidation.issues.slice(0, 20).map((entry) => entry.code),
        }));
      }
      const bodyRegions = item.body_map_payload?.regions;
      if (!Array.isArray(bodyRegions) || bodyRegions.length !== 12) {
        issues.push(issue("BLOCKING", "REGIONAL_BODYMAP_REGION_COUNT_INVALID", "regionalResults", "部位別表示用データが12部位そろっていません。", itemId));
      }
    }
    deepFiniteNumbers(item, "", issues, "regionalResults", itemId);
  });
}

function inspectFeedback(items, recordIds, issues) {
  addDuplicateIssues(items, (item) => item?.recordId || `date:${item?.date || ""}`, "subjectiveFeedback", "本人入力", issues);
  (items || []).forEach((item, index) => {
    const itemId = String(item?.recordId || item?.date || `#${index + 1}`);
    if (!isObject(item) || (!item.recordId && !item.date)) {
      issues.push(issue("BLOCKING", "FEEDBACK_TARGET_REQUIRED", "subjectiveFeedback", "本人入力の対象記録または日付が不足しています。", itemId));
      return;
    }
    if (item.recordId && !recordIds.has(String(item.recordId))) {
      issues.push(issue("BLOCKING", "FEEDBACK_RECORD_REFERENCE_MISSING", "subjectiveFeedback", "本人入力が参照する記録がバックアップ内にありません。", itemId));
    }
    deepFiniteNumbers(item, "", issues, "subjectiveFeedback", itemId);
  });
}

function inspectPlans(plans, recordIds, issues) {
  addDuplicateIssues(plans, (item) => item?.id, "plans", "予定", issues);
  (plans || []).forEach((plan, index) => {
    const itemId = String(plan?.id || `#${index + 1}`);
    if (!isObject(plan) || !plan.id || !String(plan.scheduledDate || plan.date || "").slice(0, 10)) {
      issues.push(issue("BLOCKING", "PLAN_SCHEMA_INVALID", "plans", "予定の識別子または日付が不足しています。", itemId));
      return;
    }
    const sourceRecordId = String(plan.sourceRecordId || "");
    const actualRecordId = String(plan.actualRecordId || "");
    if (sourceRecordId && !recordIds.has(sourceRecordId)) {
      issues.push(issue("WARNING", "PLAN_SOURCE_RECORD_MISSING", "plans", "予定の元になった記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    if (actualRecordId && !recordIds.has(actualRecordId)) {
      issues.push(issue("WARNING", "PLAN_ACTUAL_RECORD_MISSING", "plans", "予定に結び付いた実績記録がバックアップ内にありません。予定自体は復元できます。", itemId));
    }
    deepFiniteNumbers(plan, "", issues, "plans", itemId);
  });
}

function inspectNotebook(notebook, recordIds, issues) {
  if (notebook == null) return;
  if (!isObject(notebook) || !Array.isArray(notebook.pages) || !Array.isArray(notebook.monthlyIssues)) {
    issues.push(issue("BLOCKING", "NOTEBOOK_SHAPE_INVALID", "notebook", "記録ノートの内容を確認できません。"));
    return;
  }
  const pagesWithinLimit = withinCollectionLimit(notebook.pages, INPUT_LIMITS.portableNotebookPages, "notebook", "日ノート", issues);
  const monthlyWithinLimit = withinCollectionLimit(notebook.monthlyIssues, INPUT_LIMITS.portableNotebookMonthlyIssues, "notebook", "月まとめ", issues);
  const viewEvents = Array.isArray(notebook.viewEvents) ? notebook.viewEvents : [];
  const viewEventsWithinLimit = withinCollectionLimit(viewEvents, INPUT_LIMITS.portableNotebookViewEvents, "notebook", "閲覧記録", issues);
  if (!pagesWithinLimit || !monthlyWithinLimit || !viewEventsWithinLimit) return;
  const version = Number(notebook.version || 1);
  if (!Number.isInteger(version) || version < 1 || version > NOTEBOOK_STATE_VERSION) {
    issues.push(issue("BLOCKING", "NOTEBOOK_VERSION_UNSUPPORTED", "notebook", "対応していない記録ノート形式です。"));
  } else if (version < NOTEBOOK_STATE_VERSION) {
    issues.push(issue("WARNING", "NOTEBOOK_VERSION_LEGACY", "notebook", "以前の記録ノート形式です。本人の文章を変えず、現在の形式として読み込みます。"));
  }
  addDuplicateIssues(notebook.pages, (page) => page?.date, "notebook", "日ノート", issues);
  const pageByDate = new Map((notebook.pages || []).map((page) => [String(page?.date || "").slice(0, 10), page]));
  (notebook.pages || []).forEach((page, index) => {
    const itemId = String(page?.date || `#${index + 1}`);
    if (!isObject(page) || !/^\d{4}-\d{2}-\d{2}$/.test(itemId)) {
      issues.push(issue("BLOCKING", "NOTEBOOK_PAGE_DATE_INVALID", "notebook", "日ノートの日付を確認できません。", itemId));
      return;
    }
    if (page.recordId && !recordIds.has(String(page.recordId))) {
      issues.push(issue("WARNING", "NOTEBOOK_RECORD_REFERENCE_MISSING", "notebook", "日ノートが参照する記録がバックアップ内にありません。文章は復元できます。", itemId));
    }
    (Array.isArray(page.reflectionReferences) ? page.reflectionReferences : []).forEach((recordId) => {
      if (recordId && !recordIds.has(String(recordId))) {
        issues.push(issue("WARNING", "NOTEBOOK_REFLECTION_REFERENCE_MISSING", "notebook", "日ノート内の記録参照の一部が見つかりません。文章は復元できます。", itemId));
      }
    });
    const reviewDate = String(page.reviewReferenceDate || "").slice(0, 10);
    if (reviewDate && (!pageByDate.has(reviewDate) || reviewDate >= itemId)) {
      issues.push(issue("WARNING", "NOTEBOOK_REVIEW_REFERENCE_INVALID", "notebook", "見返し元の日ノート参照が無効です。参照は表示されない場合があります。", itemId));
    }
    const observationDate = String(page.observationSourceDate || "").slice(0, 10);
    const observationSource = pageByDate.get(observationDate);
    if (observationDate && (
      !observationSource
      || observationDate >= itemId
      || observationSource.oneThingTheme !== "next-note"
      || !String(observationSource.oneThingNote || "").trim()
    )) {
      issues.push(issue("WARNING", "NOTEBOOK_OBSERVATION_REFERENCE_INVALID", "notebook", "次回観察メモの参照が無効です。参照は表示されない場合があります。", itemId));
    }
  });
  addDuplicateIssues(notebook.monthlyIssues, (item) => item?.monthKey, "notebook", "月まとめ", issues);
  (notebook.monthlyIssues || []).forEach((monthly) => {
    const itemId = String(monthly?.monthKey || "");
    const dates = [monthly?.coverPageDate, ...(Array.isArray(monthly?.featuredPageDates) ? monthly.featuredPageDates : [])]
      .map((value) => String(value || "").slice(0, 10)).filter(Boolean);
    if (dates.some((date) => !pageByDate.has(date))) {
      issues.push(issue("WARNING", "NOTEBOOK_MONTHLY_PAGE_REFERENCE_MISSING", "notebook", "月まとめが参照する日ノートの一部が見つかりません。", itemId));
    }
  });
  deepFiniteNumbers(notebook, "", issues, "notebook", "notebook");
}

function inspectCourses(courses, issues) {
  addDuplicateIssues(courses, (item) => item?.id, "courses", "保存したコース", issues);
  (courses || []).forEach((item, index) => {
    const itemId = String(item?.id || `#${index + 1}`);
    if (!isObject(item) || !item.id) {
      issues.push(issue("BLOCKING", "COURSE_ID_REQUIRED", "courses", "保存したコースの識別子が不足しています。", itemId));
      return;
    }
    const validation = validateCoursePresetInput(item.course || item);
    if (!validation.ok) {
      issues.push(issue("BLOCKING", "COURSE_SCHEMA_INVALID", "courses", "保存したコースの値が現在の形式に適合しません。", itemId, { code: validation.code }));
    }
    deepFiniteNumbers(item, "", issues, "courses", itemId);
  });
}

function collection(snapshot, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) return fallback;
  return snapshot.data[key];
}

export function inspectBackupSnapshot(snapshot, backupFormatVersion) {
  const issues = [];
  if (!isObject(snapshot)) {
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze([
      issue("BLOCKING", "BACKUP_OBJECT_REQUIRED", "backup", "バックアップの内容を確認できません。"),
    ]) });
  }
  if (snapshot.formatVersion !== backupFormatVersion) {
    issues.push(issue("BLOCKING", "BACKUP_VERSION_UNSUPPORTED", "backup", "対応していないバックアップ形式です。"));
  }
  if (!isObject(snapshot.data)) {
    issues.push(issue("BLOCKING", "BACKUP_DATA_REQUIRED", "backup", "バックアップにデータ領域がありません。"));
    return Object.freeze({ ok: false, status: RESTORE_STATUS.blocked, canRestore: false, issues: Object.freeze(issues) });
  }
  const unexpectedKeys = Object.keys(snapshot.data).filter((key) => !USER_DATA_STORAGE_KEYS.includes(key));
  if (unexpectedKeys.length) {
    issues.push(issue("BLOCKING", "BACKUP_UNKNOWN_STORAGE_KEY", "backup", "バックアップに現在のアプリで扱えない保存領域があります。"));
  }

  const records = collection(snapshot, STORAGE_KEYS.records, []);
  const v27Results = collection(snapshot, STORAGE_KEYS.modelResultsV27, []);
  const regionalResults = collection(snapshot, STORAGE_KEYS.modelResultsRegionalV1, []);
  const feedback = collection(snapshot, STORAGE_KEYS.subjectiveFeedback, []);
  const plans = collection(snapshot, STORAGE_KEYS.plans, []);
  const notebook = collection(snapshot, STORAGE_KEYS.notebook, null);
  const profile = collection(snapshot, STORAGE_KEYS.profile, null);
  const settings = collection(snapshot, STORAGE_KEYS.settings, null);
  const draft = collection(snapshot, STORAGE_KEYS.draft, null);
  const courses = collection(snapshot, STORAGE_KEYS.courses, []);

  const expectedArrays = [
    [records, "records", "走行・休養記録"],
    [v27Results, "v27Results", "走行全体の保存済み結果"],
    [regionalResults, "regionalResults", "部位別の保存済み結果"],
    [feedback, "subjectiveFeedback", "本人入力"],
    [plans, "plans", "予定"],
    [courses, "courses", "保存したコース"],
  ];
  expectedArrays.forEach(([value, area, label]) => {
    if (!Array.isArray(value)) issues.push(issue("BLOCKING", "COLLECTION_SHAPE_INVALID", area, `${label}が一覧形式ではありません。`));
  });
  [[profile, "profile", "プロフィール"], [settings, "settings", "設定"], [draft, "draft", "入力途中"]].forEach(([value, area, label]) => {
    if (value != null && !isObject(value)) issues.push(issue("BLOCKING", "OBJECT_SHAPE_INVALID", area, `${label}の形式が正しくありません。`));
  });

  const recordsWithinLimit = withinCollectionLimit(records, INPUT_LIMITS.portableRecords, "records", "走行・休養記録", issues);
  const v27WithinLimit = withinCollectionLimit(v27Results, INPUT_LIMITS.portableModelResults, "v27Results", "走行全体の保存済み結果", issues);
  const regionalWithinLimit = withinCollectionLimit(regionalResults, INPUT_LIMITS.portableModelResults, "regionalResults", "部位別の保存済み結果", issues);
  const feedbackWithinLimit = withinCollectionLimit(feedback, INPUT_LIMITS.portableFeedbackEntries, "subjectiveFeedback", "本人入力", issues);
  const plansWithinLimit = withinCollectionLimit(plans, INPUT_LIMITS.portablePlans, "plans", "予定", issues);
  const coursesWithinLimit = withinCollectionLimit(courses, INPUT_LIMITS.portableCourses, "courses", "保存したコース", issues);

  if (recordsWithinLimit) inspectRecords(records, issues);
  const recordIds = new Set(recordsWithinLimit ? records.map((item) => String(item?.id || "")).filter(Boolean) : []);
  if (v27WithinLimit) inspectV27Results(v27Results, recordIds, issues);
  if (regionalWithinLimit) inspectRegionalResults(regionalResults, recordIds, issues);
  if (feedbackWithinLimit) inspectFeedback(feedback, recordIds, issues);
  if (plansWithinLimit) inspectPlans(plans, recordIds, issues);
  inspectNotebook(notebook, recordIds, issues);
  if (coursesWithinLimit) inspectCourses(courses, issues);

  if (profile != null) {
    const version = Number(profile.schemaVersion || 0);
    if (Number.isFinite(version) && version > PERSONAL_PROFILE_SCHEMA_VERSION) {
      issues.push(issue("BLOCKING", "PROFILE_VERSION_UNSUPPORTED", "profile", "対応していないプロフィール形式です。"));
    } else if (version > 0 && version < PERSONAL_PROFILE_SCHEMA_VERSION) {
      issues.push(issue("WARNING", "PROFILE_VERSION_LEGACY", "profile", "以前のプロフィール形式です。数値計算には使わず、文脈情報として読み込みます。"));
    }
  }
  deepFiniteNumbers(profile, "", issues, "profile", "profile");
  deepFiniteNumbers(settings, "", issues, "settings", "settings");
  deepFiniteNumbers(draft, "", issues, "draft", "draft");

  const blockingCount = issues.filter((item) => item.severity === "BLOCKING").length;
  const warningCount = issues.filter((item) => item.severity === "WARNING").length;
  const status = blockingCount
    ? RESTORE_STATUS.blocked
    : warningCount
      ? RESTORE_STATUS.review
      : RESTORE_STATUS.supported;
  const counts = Object.freeze({
    records: Array.isArray(records) ? records.length : 0,
    subjectiveFeedback: Array.isArray(feedback) ? feedback.length : 0,
    v27Results: Array.isArray(v27Results) ? v27Results.length : 0,
    regionalResults: Array.isArray(regionalResults) ? regionalResults.length : 0,
    plans: Array.isArray(plans) ? plans.length : 0,
    notebookPages: Array.isArray(notebook?.pages) ? notebook.pages.length : 0,
    courses: Array.isArray(courses) ? courses.length : 0,
    profile: profile == null ? 0 : 1,
    settings: settings == null ? 0 : 1,
    draft: draft == null ? 0 : 1,
  });
  return Object.freeze({
    ok: blockingCount === 0,
    inspectionVersion: RESTORE_INSPECTION_VERSION,
    formatVersion: String(snapshot.formatVersion || ""),
    createdAt: String(snapshot.createdAt || ""),
    status,
    canRestore: status !== RESTORE_STATUS.blocked,
    requiresAcknowledgement: status === RESTORE_STATUS.review,
    counts,
    summary: Object.freeze({ blockingCount, warningCount }),
    issues: Object.freeze(issues),
    snapshot,
  });
}
