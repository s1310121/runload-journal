import { SURFACE_FIELDS } from "../modelConstants.js";
import { reportedRpeValue } from "../../safety/rpeProvenance.js";

const SURFACE_KEY_BY_RECORD_KEY = Object.freeze(Object.fromEntries(
  SURFACE_FIELDS.map(({ recordKey, modelKey }) => [recordKey, modelKey]),
));

const SHOE_TYPE = Object.freeze({
  usual_training: "TRAINING", soft: "TRAINING_SOFT", light: "LIGHTWEIGHT",
  race: "RACING", trail: "TRAIL", other: "OTHER",
});
const SHOE_SOFTNESS = Object.freeze({ soft: "SOFT", normal: "NORMAL", firm: "FIRM", unknown: "UNKNOWN" });
const FOOT_PLACEMENT = Object.freeze({ heel: "RFS", full_sole: "MFS", forefoot: "FFS", varies: "VARIABLE", unknown: "UNKNOWN" });
const RHYTHM_STRIDE = Object.freeze({ usual: "USUAL", small_step: "SMALLER_STRIDE_SELF_REPORT", rhythm_focus: "CADENCE_FOCUS_SELF_REPORT", long_step: "LARGER_STRIDE_SELF_REPORT", unknown: "UNKNOWN" });

export const BODY_AREA_TO_REGIONAL_V1 = Object.freeze({
  "BFR-200-ING": "BA-DISP-014", "BFR-200-COX": "BA-DISP-014",
  "BFR-210-GLU": "BA-DISP-015", "BFR-220-ANT": "BA-DISP-016",
  "BFR-220-POST": "BA-DISP-018", "BFR-230-ANT": "BA-DISP-019",
  "BFR-240-ANT": "BA-DISP-021", "BFR-240-POST": "BA-DISP-023",
  "BFR-250-ANT": "BA-DISP-024", "BFR-260-DOR": "BA-DISP-024",
  "BFR-250-POST": "BA-DISP-025", "BFR-260-REAR": "BA-DISP-027",
  "BFR-260-MID": "BA-DISP-028", "BFR-260-FORE": "BA-DISP-029",
  "BFR-260-TOE": "BA-DISP-029",
});

function surfaceSelections(course = {}) {
  return SURFACE_FIELDS.flatMap(({ recordKey }) => {
    const sharePercent = Number(course?.[recordKey] || 0);
    if (!(sharePercent > 0)) return [];
    const wetSlipState = ["DRY", "DAMP", "WET", "SLIPPERY_REPORTED", "UNKNOWN"].includes(String(course?.surfaceWetSlipState || "UNKNOWN").toUpperCase())
      ? String(course.surfaceWetSlipState || "UNKNOWN").toUpperCase()
      : "UNKNOWN";
    return [{ presetKey: SURFACE_KEY_BY_RECORD_KEY[recordKey], sharePercent, wetSlipState }];
  });
}

function gradeKnowledge(value = "UNKNOWN") {
  if (value === "KNOWN_PROFILE") return "KNOWN_SUMMARY";
  if (value === "KNOWN_FLAT") return "KNOWN_FLAT";
  return "UNKNOWN";
}


function regionalSections(course = {}) {
  if (!Array.isArray(course?.sections) || !course.sections.length) return [];
  return course.sections.flatMap((section = {}, index) => {
    const distanceKm = Number(section.distanceKm);
    const sharePercent = Number(section.sharePercent);
    const grade = section.gradePercent == null ? null : Number(section.gradePercent);
    if (!(distanceKm > 0) && !(sharePercent > 0)) return [];
    const gradeDirection = section.gradeDirection
      || (grade > 0 ? "UPHILL" : grade < 0 ? "DOWNHILL" : grade === 0 ? "FLAT" : "UNKNOWN");
    return [{
      sectionId: section.sectionId || `section-${index + 1}`,
      shareBasis: "DISTANCE",
      shareValue: distanceKm > 0 ? distanceKm : sharePercent,
      distanceKm: distanceKm > 0 ? distanceKm : null,
      durationMinutes: Number(section.durationMinutes) > 0 ? Number(section.durationMinutes) : null,
      steps: section.steps != null && Number.isInteger(Number(section.steps)) && Number(section.steps) >= 0 ? Number(section.steps) : null,
      speedMps: Number(section.speedMps) > 0 ? Number(section.speedMps) : null,
      cadenceSpm: Number(section.cadenceSpm) > 0 ? Number(section.cadenceSpm) : null,
      sharePercent: sharePercent > 0 ? sharePercent : null,
      gradeDirection,
      gradePercent: grade == null || !Number.isFinite(grade) ? null : Math.abs(grade),
    }];
  });
}

function reviewStatus(feedback = {}, observations = []) {
  if (["not_asked", "deferred"].includes(String(feedback?.checkStatus || ""))) return "NOT_REVIEWED";
  return observations.length ? "AREA_RECORDED" : "REVIEWED_NO_AREA";
}

function mappedObservations(feedback = {}) {
  return (Array.isArray(feedback?.bodyAreaObservations) ? feedback.bodyAreaObservations : []).flatMap((item) => {
    const bodyAreaId = BODY_AREA_TO_REGIONAL_V1[String(item?.areaId || "")];
    if (!bodyAreaId) return [];
    return [{
      bodyAreaId,
      laterality: String(item?.laterality || "UNKNOWN"),
      noticedIntensity: Number(item?.intensity || 0),
      sensationType: String(item?.sensationType || "NOT_SELECTED"),
      noticedTiming: String(item?.noticedTiming || "UNKNOWN"),
      note: String(item?.note || ""),
      sourceBodyAreaId: String(item?.areaId || ""),
    }];
  });
}

const PLAN_CHANGE_REASON = Object.freeze({
  physical_condition: "PHYSICAL_CONDITION",
  time: "TIME",
  weather: "WEATHER",
  course: "COURSE",
  other: "OTHER",
  prefer_not_to_answer: "PREFER_NOT_TO_ANSWER",
});
function planSnapshot(record = {}) {
  const outcome = record?.planOutcome || {};
  const hasPlan = Boolean(outcome.status || outcome.plannedDistanceKm || outcome.plannedDurationMinutes);
  if (!hasPlan) return {};
  const rawReason = String(outcome.reason || "").trim();
  const changeReason = PLAN_CHANGE_REASON[rawReason.toLowerCase()]
    || (Object.values(PLAN_CHANGE_REASON).includes(rawReason.toUpperCase()) ? rawReason.toUpperCase() : null);
  return {
    scheduledDate: record.date,
    planType: record.activityType === "rest" ? "REST" : "RUN",
    distanceKm: Number(outcome.plannedDistanceKm || 0) || null,
    durationMinutes: Number(outcome.plannedDurationMinutes || 0) || null,
    outcomeStatus: String(outcome.status || "COMPLETED").toUpperCase(),
    changeReason,
    course: outcome.plannedCourseSnapshot || null,
    note: outcome.planNote || null,
    changeReasonNote: outcome.reasonNote || null,
    actualSessionId: record.id,
  };
}

export function adaptStoredRecordToRegionalV1Ui(record = {}, feedback = {}) {
  const observations = mappedObservations(feedback);
  const personal = record.personalContext || {};
  return {
    sessionId: record.id,
    date: record.date,
    activityType: record.activityType,
    distanceKm: record.activityType === "run" ? Number(record.distanceKm) : null,
    durationMinutes: record.activityType === "run" ? Number(record.durationMinutes) : null,
    steps: record.activityType === "run" && Number(record.steps) > 0 ? Number(record.steps) : null,
    stepsProvenance: record.stepsProvenance === "ESTIMATED" ? "ESTIMATED" : (record.stepsProvenance || "UNKNOWN"),
    runningFormat: record.activityType === "run" ? (record.runningFormat || "UNKNOWN") : null,
    rpe: reportedRpeValue(record),
    memo: record.memo || "",
    course: {
      courseId: record.course?.id || null,
      courseName: record.course?.name || "",
      gradeKnowledge: gradeKnowledge(record.course?.gradeKnowledge),
      uphillSharePercent: Number(record.course?.upPercent || 0),
      downhillSharePercent: Number(record.course?.downPercent || 0),
      uphillGradePercent: Number(record.course?.upGradePercent || 0) || null,
      downhillGradePercent: Number(record.course?.downGradePercent || 0) || null,
      surfaceSelections: surfaceSelections(record.course),
      sections: regionalSections(record.course),
    },
    shoeAndStyle: {
      shoeId: personal.shoeId || null,
      shoeLabel: personal.shoeLabel || null,
      shoeType: SHOE_TYPE[personal.shoeType] || "UNKNOWN",
      shoeSoftness: SHOE_SOFTNESS[personal.shoeSoftness] || "UNKNOWN",
      footPlacement: FOOT_PLACEMENT[personal.footPlacement] || "UNKNOWN",
      rhythmStride: RHYTHM_STRIDE[personal.rhythmStride] || "UNKNOWN",
      focusTags: personal.focusTags || [],
      note: personal.freeNote || "",
    },
    bodyReview: {
      status: reviewStatus(feedback, observations),
      observations,
    },
    plan: planSnapshot(record),
  };
}

export function regionalV1ProfileContext(record = {}) {
  const profile = record.bodyProfileSnapshot || {};
  return {
    heightCm: profile.heightCm || null,
    weightKg: profile.weightKg || null,
    ageBand: profile.ageBand || null,
    sexOrReferenceCategory: profile.sex || null,
  };
}
