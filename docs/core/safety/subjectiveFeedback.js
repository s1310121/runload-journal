import { BODY_PARTS } from "../model/modelConstants.js";
import { normalizeBodyAreaObservations } from "../model/v27/bodyAreaTaxonomy.js";
import { clampNumber } from "../model/numberUtilities.js";
import { normalizePlainText, normalizeSingleLineText } from "./inputSafety.js";
import { evaluateSupportDecision, SAFETY_FLAG_KEYS } from "./supportDecision.js";

export const SUBJECTIVE_CHECK_STATUSES = Object.freeze([
  "not_asked",
  "deferred",
  "none_reported",
  "fatigue_reported",
  "discomfort_reported",
  "strong_reported",
]);

function createScoreMap(source = {}) {
  return Object.fromEntries(BODY_PARTS.map((bodyPart) => [
    bodyPart,
    clampNumber(source[bodyPart], 0, 10, 0),
  ]));
}

function createReviewedMap(source = {}, fatigue = {}, discomfort = {}) {
  return Object.fromEntries(BODY_PARTS.map((bodyPart) => [
    bodyPart,
    Boolean(source[bodyPart]) || fatigue[bodyPart] > 0 || discomfort[bodyPart] > 0,
  ]));
}

function hasPositiveScore(scoreMap = {}) {
  return BODY_PARTS.some((bodyPart) => Number(scoreMap[bodyPart] || 0) > 0);
}

export function normalizeSafetyFlags(source = {}) {
  return Object.freeze(Object.fromEntries(
    SAFETY_FLAG_KEYS.map((key) => [key, Boolean(source[key])]),
  ));
}

export function inferSubjectiveCheckStatus(feedback = {}, explicitStatus = "") {
  const hasSafetyFlag = SAFETY_FLAG_KEYS.some((key) => Boolean(feedback.safetyFlags?.[key]));
  if (hasSafetyFlag || Boolean(feedback.unexpectedSymptom ?? feedback.symptomContext?.hasUnexpectedSymptom)) {
    return "strong_reported";
  }
  if (hasPositiveScore(feedback.discomfortByBodyPart || feedback.discomfort || {})) {
    return "discomfort_reported";
  }
  if (normalizeBodyAreaObservations(feedback.bodyAreaObservations).length) {
    return "discomfort_reported";
  }
  if (hasPositiveScore(feedback.fatigueByBodyPart || feedback.fatigue || {})) {
    return "fatigue_reported";
  }
  const normalizedExplicitStatus = String(explicitStatus || "");
  if (SUBJECTIVE_CHECK_STATUSES.includes(normalizedExplicitStatus)) return normalizedExplicitStatus;
  if (feedback.safetyCheck?.status === "none_reported") return "none_reported";
  return "not_asked";
}

export function normalizeSubjectiveFeedback(input = {}, context = {}) {
  const fatigueByBodyPart = createScoreMap(input.fatigueByBodyPart || input.fatigue || {});
  const discomfortByBodyPart = createScoreMap(input.discomfortByBodyPart || input.discomfort || {});
  const reviewedBodyParts = createReviewedMap(
    input.reviewedBodyParts || input.reviewed || {},
    fatigueByBodyPart,
    discomfortByBodyPart,
  );
  const safetyFlags = normalizeSafetyFlags(input.safetyFlags || {});
  const hasActiveSafetyFlag = SAFETY_FLAG_KEYS.some((key) => safetyFlags[key]);
  const unexpectedSymptom = Boolean(
    input.unexpectedSymptom ?? input.symptomContext?.hasUnexpectedSymptom,
  );
  const bodyAreaObservations = normalizeBodyAreaObservations(input.bodyAreaObservations);
  const checkStatus = inferSubjectiveCheckStatus({
    fatigueByBodyPart,
    discomfortByBodyPart,
    bodyAreaObservations,
    unexpectedSymptom,
    safetyFlags,
    safetyCheck: input.safetyCheck,
  }, input.checkStatus || input.subjectiveCheck?.status);
  const safetyCheckStatus = hasActiveSafetyFlag
    ? "reported"
    : ["not_asked", "none_reported", "reported"].includes(String(input.safetyCheck?.status || ""))
      ? String(input.safetyCheck.status)
      : "not_asked";
  const legacyTopBodyPart = BODY_PARTS.includes(
    input.legacyTopBodyPart || input.topBodyPart || input.topPart,
  )
    ? input.legacyTopBodyPart || input.topBodyPart || input.topPart
    : "";

  const normalized = {
    recordId: normalizeSingleLineText(input.recordId, 100),
    date: String(input.date || "").slice(0, 10),
    checkStatus,
    checkedAt: normalizeSingleLineText(input.checkedAt || input.subjectiveCheck?.checkedAt, 40),
    fatigueByBodyPart,
    discomfortByBodyPart,
    reviewedBodyParts,
    bodyAreaObservations,
    legacyTopBodyPart,
    consultationNote: normalizePlainText(input.consultationNote, 500),
    unexpectedSymptom,
    symptomContext: Object.freeze({
      timing: normalizeSingleLineText(input.symptomContext?.timing, 40),
      startedWhen: normalizeSingleLineText(input.symptomContext?.startedWhen, 40),
      triggers: Object.freeze(
        Array.from(new Set(Array.isArray(input.symptomContext?.triggers)
          ? input.symptomContext.triggers.map((value) => normalizeSingleLineText(value, 40)).filter(Boolean)
          : [])).slice(0, 6),
      ),
      note: normalizePlainText(input.symptomContext?.note, 320),
    }),
    safetyFlags,
    safetyCheck: Object.freeze({
      status: safetyCheckStatus,
      checkedAt: normalizeSingleLineText(input.safetyCheck?.checkedAt, 40),
    }),
  };
  const supportDecision = evaluateSupportDecision({
    feedback: normalized,
    planOutcome: context.planOutcome || {},
  });

  return Object.freeze({
    ...normalized,
    supportDecisionSnapshot: supportDecision,
  });
}
