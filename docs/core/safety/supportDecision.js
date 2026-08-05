export const SUPPORT_ROUTES = Object.freeze(["normal", "review", "consult", "urgent"]);
export const SUPPORT_RULE_VERSION = "support-rules-v2";
export const SUPPORT_DATA_VERSION = "support-data-v2";

export const SAFETY_FLAG_KEYS = Object.freeze([
  "severePain",
  "significantSwelling",
  "cannotBearWeight",
  "movementDifficulty",
  "numbnessOrWeakness",
  "coldPaleBlueLimb",
  "deformityOrMajorTrauma",
  "painAtRestOrNight",
  "chestPainOrPressure",
  "breathingDifficulty",
  "faintingOrConfusion",
  "heavyBleeding",
]);

export const URGENT_SAFETY_FLAGS = Object.freeze([
  "chestPainOrPressure",
  "breathingDifficulty",
  "faintingOrConfusion",
  "heavyBleeding",
  "deformityOrMajorTrauma",
]);

export const CONSULT_SAFETY_FLAGS = Object.freeze([
  "severePain",
  "significantSwelling",
  "cannotBearWeight",
  "movementDifficulty",
  "numbnessOrWeakness",
  "coldPaleBlueLimb",
  "painAtRestOrNight",
]);

export const SUPPORT_BLOCKS = Object.freeze({
  normalPlanSuggestions: "normal_plan_suggestions",
});

export const SUPPORT_NEXT_ACTIONS = Object.freeze({
  continue: "continue_normal_flow",
  reviewInput: "review_subjective_input",
  openConsultationMemo: "open_consultation_memo",
  editSubjective: "edit_subjective",
  checkOfficialHelp: "check_official_help",
});

const FLAG_REASON_CODES = Object.freeze({
  severePain: "safety_severe_pain_reported",
  significantSwelling: "safety_significant_swelling_reported",
  cannotBearWeight: "safety_cannot_bear_weight_reported",
  movementDifficulty: "safety_movement_difficulty_reported",
  numbnessOrWeakness: "safety_numbness_or_weakness_reported",
  coldPaleBlueLimb: "safety_cold_pale_blue_limb_reported",
  deformityOrMajorTrauma: "safety_deformity_or_major_trauma_reported",
  painAtRestOrNight: "safety_pain_at_rest_or_night_reported",
  chestPainOrPressure: "safety_chest_pain_or_pressure_reported",
  breathingDifficulty: "safety_breathing_difficulty_reported",
  faintingOrConfusion: "safety_fainting_or_confusion_reported",
  heavyBleeding: "safety_heavy_bleeding_reported",
});

function hasPositiveScore(scoreMap = {}) {
  return Object.values(scoreMap && typeof scoreMap === "object" ? scoreMap : {})
    .some((value) => Number(value || 0) > 0);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function evaluateSupportDecision(input = {}) {
  const feedback = input.feedback && typeof input.feedback === "object" ? input.feedback : input;
  const planOutcome = input.planOutcome && typeof input.planOutcome === "object" ? input.planOutcome : {};
  const sourceFlags = feedback.safetyFlags && typeof feedback.safetyFlags === "object"
    ? feedback.safetyFlags
    : {};
  const safetyFlags = Object.fromEntries(
    SAFETY_FLAG_KEYS.map((key) => [key, Boolean(sourceFlags[key])]),
  );
  const activeSafetyFlags = SAFETY_FLAG_KEYS.filter((key) => safetyFlags[key]);
  const safetyCheckStatus = activeSafetyFlags.length
    ? "reported"
    : ["not_asked", "none_reported", "reported"].includes(String(feedback.safetyCheck?.status || ""))
      ? String(feedback.safetyCheck.status)
      : "not_asked";

  const urgentReasons = URGENT_SAFETY_FLAGS
    .filter((key) => safetyFlags[key])
    .map((key) => FLAG_REASON_CODES[key]);
  const consultReasons = CONSULT_SAFETY_FLAGS
    .filter((key) => safetyFlags[key])
    .map((key) => FLAG_REASON_CODES[key]);
  if (String(planOutcome.reason || "") === "strong_pain") {
    consultReasons.push("plan_change_strong_pain");
  }

  const reviewReasons = [];
  const subjectiveStatus = String(feedback.subjectiveCheck?.status || feedback.checkStatus || "");
  if (hasPositiveScore(feedback.fatigueByBodyPart || feedback.fatigue) || subjectiveStatus === "fatigue_reported") {
    reviewReasons.push("fatigue_reported");
  }
  if (hasPositiveScore(feedback.discomfortByBodyPart || feedback.discomfort) || subjectiveStatus === "discomfort_reported") {
    reviewReasons.push("discomfort_reported");
  }
  if (Boolean(feedback.unexpectedSymptom ?? feedback.symptomContext?.hasUnexpectedSymptom)) {
    reviewReasons.push("unexpected_symptom_reported");
  }

  let route = "normal";
  let routeReasons = ["no_subjective_concern"];
  if (urgentReasons.length) {
    route = "urgent";
    routeReasons = urgentReasons;
  } else if (consultReasons.length) {
    route = "consult";
    routeReasons = consultReasons;
  } else if (reviewReasons.length) {
    route = "review";
    routeReasons = reviewReasons;
  }

  let safetyContextReason = "safety_check_not_asked";
  if (safetyCheckStatus === "none_reported") safetyContextReason = "safety_check_none_reported";
  if (safetyCheckStatus === "reported" && activeSafetyFlags.length) safetyContextReason = "safety_check_reported";
  if (safetyCheckStatus === "reported" && !activeSafetyFlags.length) safetyContextReason = "safety_check_reported_without_active_flag";

  const contextReasons = [safetyContextReason];
  const blocks = ["consult", "urgent"].includes(route)
    ? [SUPPORT_BLOCKS.normalPlanSuggestions]
    : [];
  const nextActions = route === "urgent"
    ? [SUPPORT_NEXT_ACTIONS.checkOfficialHelp, SUPPORT_NEXT_ACTIONS.openConsultationMemo, SUPPORT_NEXT_ACTIONS.editSubjective]
    : route === "consult"
      ? [SUPPORT_NEXT_ACTIONS.openConsultationMemo, SUPPORT_NEXT_ACTIONS.editSubjective]
      : route === "review"
        ? [SUPPORT_NEXT_ACTIONS.reviewInput, SUPPORT_NEXT_ACTIONS.continue]
        : [SUPPORT_NEXT_ACTIONS.continue];

  return Object.freeze({
    route,
    reasons: Object.freeze(unique([...routeReasons, ...contextReasons])),
    routeReasons: Object.freeze(unique(routeReasons)),
    contextReasons: Object.freeze(unique(contextReasons)),
    blocks: Object.freeze(blocks),
    nextActions: Object.freeze(nextActions),
    safetyCheckStatus,
    activeSafetyFlags: Object.freeze(activeSafetyFlags),
    ruleVersion: SUPPORT_RULE_VERSION,
    modelInputUsed: false,
    qaSupportAffectsDecision: false,
  });
}

export function shouldBlockNormalPlanSuggestions(decision = {}) {
  return Array.isArray(decision.blocks)
    && decision.blocks.includes(SUPPORT_BLOCKS.normalPlanSuggestions);
}

export function shouldPrioritizeOfficialHelp(decision = {}) {
  return String(decision.route || "") === "urgent"
    && Array.isArray(decision.nextActions)
    && decision.nextActions.includes(SUPPORT_NEXT_ACTIONS.checkOfficialHelp);
}
