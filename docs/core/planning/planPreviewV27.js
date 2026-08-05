import { SURFACE_FIELDS } from "../model/modelConstants.js";
import {
  V27_ACTIVITY_TYPES,
  V27_EMPHASIS_REGION_IDS,
  V27_MODEL_VERSION,
  V27_REGIONAL_VIEW_IDS,
} from "../model/v27/v27Constants.js";
import { adaptRecordToV27Session } from "../model/v27/v27InputAdapter.js";
import {
  assertV27ResultSemantics,
  calculateV27Session,
} from "../model/v27/v27Model.js";
import { validateRunningRecordInput } from "../safety/inputValidation.js";

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);
const RUNNING_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function provided(value) {
  return value !== undefined && value !== null && value !== "";
}

export function validateRawV27PlanSession(session = {}) {
  const errors = [];
  const activityType = String(session?.activityType || "run");
  if (!["run", "rest"].includes(activityType)) {
    errors.push({
      field: "activityType",
      code: "INVALID_PLAN_ACTIVITY_TYPE",
      message: "予定の種類を選び直してください。",
    });
  }
  if (activityType !== "rest") {
    const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
    if (!RUNNING_FORMATS.has(runningFormat)) {
      errors.push({
        field: "runningFormat",
        code: "INVALID_PLAN_RUNNING_FORMAT",
        message: "予定の走行形式を選び直してください。",
      });
    }
    const course = session?.course && typeof session.course === "object"
      ? session.course
      : {};
    const gradeKnowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
    if (!GRADE_KNOWLEDGE.has(gradeKnowledge)) {
      errors.push({
        field: "course.gradeKnowledge",
        code: "INVALID_PLAN_GRADE_KNOWLEDGE",
        message: "予定の坂道の入力方法を選び直してください。",
      });
    }
    const modelSurfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
    if (!SURFACE_CLASSES.has(modelSurfaceClass)) {
      errors.push({
        field: "course.modelSurfaceClass",
        code: "INVALID_PLAN_SURFACE_CLASS",
        message: "予定の路面材質を選び直してください。",
      });
    }
    const surfaceValues = SURFACE_FIELDS.map(({ recordKey }) => Number(course[recordKey] || 0));
    if (surfaceValues.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      errors.push({ field: "course", code: "INVALID_PLAN_SURFACE_SHARE", message: "予定の路面割合を0〜100で入力してください。" });
    } else {
      const total = surfaceValues.reduce((sum, value) => sum + value, 0);
      if (total > 0 && Math.abs(total - 100) > 0.01) errors.push({ field: "course", code: "PLAN_SURFACE_SUM_NOT_100", message: "予定の路面割合の合計を100%にしてください。" });
    }
    [
      "upPercent",
      "downPercent",
      "upGradePercent",
      "downGradePercent",
    ].forEach((field) => {
      if (!provided(course[field])) return;
      const value = Number(course[field]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        errors.push({
          field: `course.${field}`,
          code: "INVALID_PLAN_GRADE_VALUE",
          message: "予定の坂道割合・代表勾配は0〜100の数値で入力してください。",
        });
      }
    });
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

function normalizeCourse(course = {}) {
  const source = course && typeof course === "object" ? course : {};
  const gradeKnowledge = String(source.gradeKnowledge || "UNKNOWN").toUpperCase();
  const modelSurfaceClass = String(source.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    ...JSON.parse(JSON.stringify(source)),
    name: String(source.name || "").trim(),
    gradeKnowledge: GRADE_KNOWLEDGE.has(gradeKnowledge) ? gradeKnowledge : "UNKNOWN",
    upPercent: finiteNumber(source.upPercent),
    downPercent: finiteNumber(source.downPercent),
    upGradePercent: finiteNumber(source.upGradePercent),
    downGradePercent: finiteNumber(source.downGradePercent),
    surfaceInputMode: ["UNKNOWN", "SINGLE", "MIXED"].includes(String(source.surfaceInputMode || "").toUpperCase()) ? String(source.surfaceInputMode).toUpperCase() : "UNKNOWN",
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: Array.isArray(source.modelSurfaceProfile) ? source.modelSurfaceProfile.map((item) => ({ sharePercent: finiteNumber(item?.sharePercent), surfaceClass: String(item?.surfaceClass || "UNKNOWN") })) : [],
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => { normalized[recordKey] = finiteNumber(source[recordKey]); });
  return Object.freeze(normalized);
}

export function normalizeV27PlanSession(session = {}) {
  const activityType = String(session?.activityType || "run") === "rest" ? "rest" : "run";
  const runningFormat = String(session?.runningFormat || "UNKNOWN").toUpperCase();
  return Object.freeze({
    activityType,
    distanceKm: activityType === "rest" ? 0 : finiteNumber(session?.distanceKm),
    durationMinutes: activityType === "rest" ? 0 : finiteNumber(session?.durationMinutes),
    runningFormat: activityType === "rest"
      ? "NOT_APPLICABLE"
      : RUNNING_FORMATS.has(runningFormat)
        ? runningFormat
        : "UNKNOWN",
    course: activityType === "rest" ? normalizeCourse({}) : normalizeCourse(session?.course),
  });
}

function previewRecord(session, scheduledDate, previewId) {
  return Object.freeze({
    id: previewId,
    date: scheduledDate,
    activityType: session.activityType,
    distanceKm: session.distanceKm,
    durationMinutes: session.durationMinutes,
    runningFormat: session.runningFormat,
    stepsProvenance: "UNKNOWN",
    rpeProvenance: "NOT_REPORTED",
    course: session.course,
  });
}

function invalidPreview(session, validation, message = "") {
  return Object.freeze({
    ok: false,
    state: "INVALID",
    modelVersion: V27_MODEL_VERSION,
    session,
    result: null,
    validation,
    message: message || validation?.errors?.map((item) => item.message || item.code).join(" ") || "予定入力を確認してください。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
  });
}

export function createV27PlanPreview({
  session: rawSession = {},
  scheduledDate = "",
  previewId = "plan-preview",
} = {}) {
  const session = normalizeV27PlanSession(rawSession);
  const rawValidation = validateRawV27PlanSession(rawSession);
  if (!rawValidation.ok) return invalidPreview(session, rawValidation);
  if (session.activityType === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      modelVersion: V27_MODEL_VERSION,
      session,
      result: null,
      validation: Object.freeze({ ok: true, errors: Object.freeze([]) }),
      message: "休養予定には走行による推定値を作成しません。",
      viewContract: Object.freeze({
        available: Object.freeze([]),
        personalExcluded: true,
      }),
    });
  }
  const record = previewRecord(session, scheduledDate, previewId);
  const validation = validateRunningRecordInput(record);
  if (!validation.ok) return invalidPreview(session, validation);
  const adaptation = adaptRecordToV27Session(record);
  if (!adaptation.ok) return invalidPreview(session, adaptation);
  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return invalidPreview(
      session,
      Object.freeze({
        ok: false,
        errors: Object.freeze([{ code: "PLAN_PREVIEW_CALCULATION_FAILED" }]),
      }),
      String(error?.message || error),
    );
  }
  const semantic = assertV27ResultSemantics(result);
  if (!semantic.ok) return invalidPreview(session, semantic);
  return Object.freeze({
    ok: true,
    state: "RUN",
    modelVersion: V27_MODEL_VERSION,
    session,
    inputSnapshot: Object.freeze({
      session: adaptation.session,
      provenance: adaptation.provenance,
      warnings: adaptation.warnings,
    }),
    result,
    validation,
    message: "予定入力による推定です。実績、処方、最適条件、走行可否を示しません。",
    viewContract: Object.freeze({
      available: Object.freeze([
        V27_REGIONAL_VIEW_IDS.withinRun,
        V27_REGIONAL_VIEW_IDS.ownFlat,
      ]),
      personalExcluded: true,
    }),
    fixedRegionIds: V27_EMPHASIS_REGION_IDS,
  });
}

export function cloneV27PlanPreview(preview) {
  return preview == null ? preview : JSON.parse(JSON.stringify(preview));
}
