import {
  cloneV27PlanPreview,
  createV27PlanPreview,
  normalizeV27PlanSession,
} from "./planPreviewV27.js";
import {
  normalizePlainText,
  normalizeSingleLineText,
} from "../safety/inputSafety.js";
import { isValidLocalDate } from "../safety/inputValidation.js";

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createReadablePlanId(date, existingIds) {
  const prefix = `plan-${date || "unscheduled"}-`;
  const used = new Set(existingIds
    .filter((id) => String(id).startsWith(prefix))
    .map((id) => Number(String(id).slice(prefix.length)))
    .filter(Number.isFinite));
  let sequence = 1;
  while (used.has(sequence)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

function defaultCourse() {
  return Object.freeze({
    name: "",
    gradeKnowledge: "UNKNOWN",
    upPercent: 0,
    downPercent: 0,
    upGradePercent: 0,
    downGradePercent: 0,
    modelSurfaceClass: "UNKNOWN",
  });
}

function defaultRunSession() {
  return normalizeV27PlanSession({
    activityType: "run",
    distanceKm: 0,
    durationMinutes: 20,
    runningFormat: "UNKNOWN",
    course: defaultCourse(),
  });
}

function sourceSession(experience) {
  const record = experience?.record;
  if (!record || record.activityType === "rest") return defaultRunSession();
  return normalizeV27PlanSession({
    activityType: "run",
    distanceKm: record.distanceKm,
    durationMinutes: record.durationMinutes,
    runningFormat: record.runningFormat,
    course: record.course,
  });
}

function lighterSession(base) {
  return normalizeV27PlanSession({
    ...cloneValue(base),
    distanceKm: Math.round(Number(base.distanceKm || 0) * 80) / 100,
    durationMinutes: Math.round(Number(base.durationMinutes || 0) * 8) / 10,
  });
}

function restSession() {
  return normalizeV27PlanSession({ activityType: "rest" });
}

function preview(session, scheduledDate, candidateId) {
  return createV27PlanPreview({
    session,
    scheduledDate,
    previewId: `plan-preview-${candidateId}-${scheduledDate}`,
  });
}

export function createPlanWorkflow({ services, planRepository }) {
  function createCandidates({ sourceRecordId = "", scheduledDate = "" } = {}) {
    const latestExperience = services.workflows.records.loadLatestExperience();
    const sourceExperience = sourceRecordId
      ? services.workflows.records.loadExperience(sourceRecordId)
      : latestExperience;
    const blockingExperience = [latestExperience, sourceExperience].find((experience) => (
      experience && services.safety.shouldBlockNormalPlanSuggestions(experience.supportDecision)
    )) || null;
    if (blockingExperience) {
      return { blocked: true, sourceExperience, blockingExperience, candidates: [] };
    }
    const base = sourceSession(sourceExperience);
    const definitions = [
      {
        candidateId: "same-conditions",
        title: "同じ条件を出発点にする",
        description: "前回の距離・時間・把握済みコースを転記します。",
        session: base,
      },
      {
        candidateId: "lighter-session",
        title: "距離と時間を小さくする",
        description: "前回の約8割を編集の出発点にします。",
        session: lighterSession(base),
      },
      {
        candidateId: "rest-day",
        title: "休養を予定する",
        description: "走らない予定も同じ位置づけの候補として扱います。",
        session: restSession(),
      },
    ];
    return {
      blocked: false,
      sourceExperience,
      candidates: definitions.map((candidate) => Object.freeze({
        ...candidate,
        preview: preview(candidate.session, scheduledDate, candidate.candidateId),
      })),
    };
  }

  function savePlan(input = {}) {
    const currentPlans = planRepository.loadAll();
    const existing = input.id ? currentPlans.find((plan) => plan.id === input.id) : null;
    const scheduledDate = String(input.scheduledDate || "").slice(0, 10);
    if (!isValidLocalDate(scheduledDate)) {
      return {
        ok: false,
        code: "PLAN_DATE_REQUIRED",
        message: "予定日を正しく入力してください。",
      };
    }
    if (!["run", "rest"].includes(String(input.planType || "run"))) {
      return {
        ok: false,
        code: "INVALID_PLAN_TYPE",
        message: "予定の種類を選び直してください。",
      };
    }
    const planType = input.planType === "rest" ? "rest" : "run";
    const plannedSession = normalizeV27PlanSession({
      ...(input.plannedSession || {}),
      activityType: planType,
    });
    const previewResult = preview(plannedSession, scheduledDate, input.id || "new");
    if (planType === "run" && !previewResult.ok) {
      return {
        ok: false,
        code: "INVALID_PLAN_SESSION",
        message: previewResult.message,
        errors: previewResult.validation?.errors || [],
      };
    }
    const id = normalizeSingleLineText(input.id, 100)
      || createReadablePlanId(scheduledDate, currentPlans.map((plan) => plan.id));
    const now = new Date().toISOString();
    return planRepository.upsert({
      ...input,
      id,
      scheduledDate,
      planType,
      title: normalizeSingleLineText(input.title, 80)
        || (planType === "rest" ? "休養予定" : "次回の走行予定"),
      memo: normalizePlainText(input.memo, 500),
      plannedSession,
      sourceCandidateId: normalizeSingleLineText(input.sourceCandidateId, 80) || "custom",
      previewSnapshot: cloneV27PlanPreview(previewResult),
      previewGeneratedAt: now,
      createdAt: existing?.createdAt || input.createdAt || now,
      updatedAt: now,
    });
  }

  function updateOutcome(planId, outcome = {}) {
    const plan = planRepository.findById(planId);
    if (!plan) {
      return {
        ok: false,
        code: "PLAN_NOT_FOUND",
        message: "対象の予定が見つかりません。",
      };
    }
    const allowedStatuses = new Set(["planned", "completed", "changed", "not_completed"]);
    const requestedStatus = normalizeSingleLineText(outcome.status, 40)
      || plan.outcomeStatus
      || "planned";
    const outcomeStatus = allowedStatuses.has(requestedStatus) ? requestedStatus : "planned";
    return planRepository.upsert({
      ...plan,
      outcomeStatus,
      actualRecordId: outcome.actualRecordId === undefined
        ? plan.actualRecordId
        : normalizeSingleLineText(outcome.actualRecordId, 100),
      changeReason: outcome.reason === undefined
        ? plan.changeReason
        : normalizeSingleLineText(outcome.reason, 60),
      changeReasonNote: outcome.reasonNote === undefined
        ? plan.changeReasonNote
        : normalizePlainText(outcome.reasonNote, 240),
      updatedAt: new Date().toISOString(),
    });
  }

  function markActualRecord(planId, recordId, outcome = {}) {
    return updateOutcome(planId, {
      status: outcome.status || "completed",
      actualRecordId: recordId,
      reason: outcome.reason,
      reasonNote: outcome.reasonNote,
    });
  }

  return Object.freeze({
    createCandidates,
    savePlan,
    updateOutcome,
    markActualRecord,
  });
}
