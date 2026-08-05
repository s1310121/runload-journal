import { INPUT_LIMITS, normalizePlainText, normalizeSingleLineText } from "../safety/inputSafety.js";
import { createCollectionRepository } from "./collectionRepository.js";
import { STORAGE_KEYS } from "./storageKeys.js";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeCourse(course = {}) {
  const source = course && typeof course === "object" ? course : {};
  const gradeKnowledge = String(source.gradeKnowledge || "UNKNOWN").toUpperCase();
  const modelSurfaceClass = String(source.modelSurfaceClass || "UNKNOWN").toUpperCase();
  return Object.freeze({
    ...clone(source),
    name: normalizeSingleLineText(source.name, 80),
    gradeKnowledge: ["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"].includes(gradeKnowledge)
      ? gradeKnowledge
      : "UNKNOWN",
    upPercent: finiteNumber(source.upPercent),
    downPercent: finiteNumber(source.downPercent),
    upGradePercent: finiteNumber(source.upGradePercent),
    downGradePercent: finiteNumber(source.downGradePercent),
    modelSurfaceClass: [
      "REF_HARD_EVEN_STABLE",
      "DRY_STABLE_GRASS_TURF",
      "DEEP_DRY_SOFT_SAND",
      "EXPLICIT_UNEVEN",
      "KNOWN_OTHER",
      "UNKNOWN",
    ].includes(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
  });
}

function normalizeSession(session = {}, planType = "run") {
  const source = session && typeof session === "object" ? session : {};
  const cloned = clone(source);
  delete cloned.steps;
  delete cloned.stepsProvenance;
  delete cloned.perceivedExertion;
  delete cloned.rpeProvenance;
  const runningFormat = String(source.runningFormat || "UNKNOWN").toUpperCase();
  const rawSteps = source.steps;
  const hasSteps = planType !== "rest"
    && rawSteps !== ""
    && rawSteps != null
    && Number.isFinite(Number(rawSteps))
    && Number(rawSteps) > 0;
  const rawRpe = source.perceivedExertion;
  const hasRpe = rawRpe !== "" && rawRpe != null && Number.isFinite(Number(rawRpe));
  return Object.freeze({
    ...cloned,
    activityType: planType,
    distanceKm: planType === "rest" ? 0 : finiteNumber(source.distanceKm),
    durationMinutes: planType === "rest" ? 0 : finiteNumber(source.durationMinutes),
    runningFormat: planType === "rest"
      ? "NOT_APPLICABLE"
      : ["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(runningFormat)
        ? runningFormat
        : "UNKNOWN",
    ...(hasSteps ? {
      steps: Math.round(Math.min(INPUT_LIMITS.steps, Number(rawSteps))),
      stepsProvenance: ["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(
        String(source.stepsProvenance || "UNKNOWN").toUpperCase(),
      )
        ? String(source.stepsProvenance || "UNKNOWN").toUpperCase()
        : "UNKNOWN",
    } : {}),
    perceivedExertion: planType === "rest" || !hasRpe
      ? null
      : Math.min(10, Math.max(0, Number(rawRpe))),
    rpeProvenance: planType === "rest" || !hasRpe
      ? "NOT_REPORTED"
      : String(source.rpeProvenance || "LEGACY_UNVERIFIED"),
    course: normalizeCourse(source.course),
  });
}

function normalizePlan(plan = {}) {
  const scheduledDate = String(plan.scheduledDate || plan.date || "").slice(0, 10);
  const id = normalizeSingleLineText(plan.id, 100)
    || `plan-${scheduledDate || "unscheduled"}-001`;
  const planType = String(plan.planType || "run") === "rest" ? "rest" : "run";
  return Object.freeze({
    ...clone(plan),
    id,
    scheduledDate,
    planType,
    title: normalizeSingleLineText(plan.title, 80),
    memo: normalizePlainText(plan.memo, 500),
    plannedSession: normalizeSession(plan.plannedSession, planType),
    sourceRecordId: normalizeSingleLineText(plan.sourceRecordId, 100),
    sourceCandidateId: normalizeSingleLineText(plan.sourceCandidateId, 80) || "custom",
    previewSnapshot: plan.previewSnapshot && typeof plan.previewSnapshot === "object"
      ? clone(plan.previewSnapshot)
      : null,
    previewGeneratedAt: normalizeSingleLineText(plan.previewGeneratedAt, 50),
    outcomeStatus: normalizeSingleLineText(plan.outcomeStatus, 40),
    actualRecordId: normalizeSingleLineText(plan.actualRecordId, 100),
    changeReason: normalizeSingleLineText(plan.changeReason, 60),
    changeReasonNote: normalizePlainText(plan.changeReasonNote, 240),
    createdAt: normalizeSingleLineText(plan.createdAt, 50) || new Date().toISOString(),
    updatedAt: normalizeSingleLineText(plan.updatedAt, 50) || new Date().toISOString(),
  });
}

export function createPlanRepository(gateway) {
  return createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.plans,
    normalizeItem: normalizePlan,
    sortItems: (items) => [...items].sort((left, right) => (
      left.scheduledDate.localeCompare(right.scheduledDate)
      || left.id.localeCompare(right.id)
    )),
  });
}
