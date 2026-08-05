import {
  V27_ACTIVITY_TYPES,
  V27_MODEL_VERSION,
  V27_SURFACE_FACTORS,
} from "./v27Constants.js";
import { deriveV27PersonalCadenceSensitivity } from "./v27Personal.js";
import { reportedRpeValue } from "../../safety/rpeProvenance.js";

const GRADE_KNOWLEDGE = new Set(["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"]);
const ACTIVITY_FORMATS = new Set(Object.values(V27_ACTIVITY_TYPES));
const RELIABLE_CADENCE_SOURCES = new Set(["DEVICE_MEASURED", "DEVICE_SYNCED"]);

function optionalFiniteNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function explicitActivityFormat(record) {
  const value = String(record.runningFormat || record.activityFormat || "UNKNOWN").toUpperCase();
  return ACTIVITY_FORMATS.has(value) ? value : "UNKNOWN";
}

function createGradeProfile(course, errors, warnings) {
  let knowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
  if (!GRADE_KNOWLEDGE.has(knowledge)) {
    errors.push({ field: "gradeKnowledge", code: "INVALID_GRADE_KNOWLEDGE" });
    knowledge = "UNKNOWN";
  }
  if (knowledge === "UNKNOWN") {
    const hasLegacyNonzero = [
      course.upPercent,
      course.downPercent,
      course.upGradePercent,
      course.downGradePercent,
    ].some((value) => Number(value || 0) !== 0);
    if (hasLegacyNonzero) {
      warnings.push({
        field: "course",
        code: "LEGACY_GRADE_VALUES_NOT_APPLIED_WITHOUT_KNOWLEDGE_STATE",
      });
    }
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (knowledge === "KNOWN_FLAT") {
    return [{ share_pct: 100, grade_pct: 0 }];
  }

  const upShare = optionalFiniteNumber(course.upPercent);
  const downShare = optionalFiniteNumber(course.downPercent);
  const upGrade = optionalFiniteNumber(course.upGradePercent);
  const downGrade = optionalFiniteNumber(course.downGradePercent);
  const values = [
    ["upPercent", upShare],
    ["downPercent", downShare],
    ["upGradePercent", upGrade],
    ["downGradePercent", downGrade],
  ];
  values.forEach(([field, value]) => {
    if (!Number.isFinite(value) || value < 0) {
      errors.push({ field, code: "INVALID_GRADE_PROFILE_VALUE" });
    }
  });
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  if (upShare > 100 || downShare > 100 || upShare + downShare > 100) {
    errors.push({ field: "course", code: "GRADE_SHARE_SUM_EXCEEDS_100" });
    return [{ share_pct: 100, grade_pct: null }];
  }
  if (upShare > 0 && upGrade <= 0) {
    errors.push({ field: "upGradePercent", code: "UPHILL_REQUIRES_POSITIVE_GRADE" });
  }
  if (downShare > 0 && downGrade <= 0) {
    errors.push({ field: "downGradePercent", code: "DOWNHILL_REQUIRES_POSITIVE_MAGNITUDE" });
  }
  if (errors.length) return [{ share_pct: 100, grade_pct: null }];
  const flatShare = 100 - upShare - downShare;
  return [
    ...(flatShare > 0 ? [{ share_pct: flatShare, grade_pct: 0 }] : []),
    ...(upShare > 0 ? [{ share_pct: upShare, grade_pct: upGrade }] : []),
    ...(downShare > 0 ? [{ share_pct: downShare, grade_pct: -downGrade }] : []),
  ];
}

function createSurfaceProfile(course, errors) {
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    const profile = course.modelSurfaceProfile.map((item, index) => {
      const share = optionalFiniteNumber(item.sharePercent ?? item.share_pct);
      const surfaceClass = String(item.surfaceClass || item.surface_class || "UNKNOWN");
      if (!Number.isFinite(share) || share < 0 || share > 100) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_SHARE" });
      }
      if (!V27_SURFACE_FACTORS[surfaceClass]) {
        errors.push({ field: `modelSurfaceProfile.${index}`, code: "INVALID_SURFACE_CLASS" });
      }
      return { share_pct: share, surface_class: surfaceClass };
    });
    if (
      profile.every((item) => Number.isFinite(item.share_pct))
      && Math.abs(profile.reduce((sum, item) => sum + item.share_pct, 0) - 100) > 0.01
    ) {
      errors.push({ field: "modelSurfaceProfile", code: "SURFACE_SHARE_SUM_NOT_100" });
    }
    return profile;
  }
  const surfaceClass = String(course.modelSurfaceClass || "UNKNOWN");
  if (!V27_SURFACE_FACTORS[surfaceClass]) {
    errors.push({ field: "modelSurfaceClass", code: "INVALID_SURFACE_CLASS" });
    return [{ share_pct: 100, surface_class: "UNKNOWN" }];
  }
  return [{ share_pct: 100, surface_class: surfaceClass }];
}

function createOrderedSections(course, errors) {
  if (!Array.isArray(course.sections) || !course.sections.length) return null;
  const sections = course.sections.map((item, index) => {
    const distance = optionalFiniteNumber(item.distanceKm ?? item.distance_km);
    const grade = optionalFiniteNumber(item.gradePercent ?? item.grade_pct);
    const surfaceClass = String(item.surfaceClass || item.surface_class || "UNKNOWN");
    if (!Number.isFinite(distance) || distance <= 0) {
      errors.push({ field: `sections.${index}.distanceKm`, code: "INVALID_SECTION_DISTANCE" });
    }
    if (grade !== null && !Number.isFinite(grade)) {
      errors.push({ field: `sections.${index}.gradePercent`, code: "INVALID_SECTION_GRADE" });
    }
    if (!V27_SURFACE_FACTORS[surfaceClass]) {
      errors.push({ field: `sections.${index}.surfaceClass`, code: "INVALID_SURFACE_CLASS" });
    }
    return {
      distance_km: distance,
      grade_pct: grade,
      surface_class: surfaceClass,
    };
  });
  return sections;
}

function readCadence(record, durationMinutes) {
  const source = String(record.cadenceProvenance || record.stepsProvenance || "UNKNOWN").toUpperCase();
  const directCadence = optionalFiniteNumber(record.cadenceSpm);
  const steps = optionalFiniteNumber(record.steps);
  const cadence = Number.isFinite(directCadence) && directCadence > 0
    ? directCadence
    : Number.isFinite(steps) && steps > 0 && durationMinutes > 0
      ? steps / durationMinutes
      : null;
  return Object.freeze({
    cadence_spm: cadence,
    source,
    reliable: cadence != null && RELIABLE_CADENCE_SOURCES.has(source),
    derivation: Number.isFinite(directCadence) && directCadence > 0
      ? "MEASURED_CADENCE"
      : cadence != null
        ? "RELIABLE_STEPS_DIVIDED_BY_ACTIVE_MINUTES"
        : "UNAVAILABLE",
  });
}

export function adaptRecordToV27Session(record, { priorCadenceFacts = [] } = {}) {
  const errors = [];
  const warnings = [];
  if (String(record.activityType || "").toLowerCase() === "rest") {
    return Object.freeze({
      ok: true,
      state: "REST",
      errors: Object.freeze([]),
      warnings: Object.freeze([]),
      session: null,
      provenance: Object.freeze({ model_version: V27_MODEL_VERSION }),
    });
  }
  const distance = optionalFiniteNumber(record.distanceKm);
  const duration = optionalFiniteNumber(record.durationMinutes);
  if (!Number.isFinite(distance) || distance <= 0) {
    errors.push({ field: "distanceKm", code: "DISTANCE_REQUIRED_POSITIVE" });
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push({ field: "durationMinutes", code: "ACTIVE_DURATION_REQUIRED_POSITIVE" });
  }
  const course = record.course && typeof record.course === "object" ? record.course : {};
  const sections = createOrderedSections(course, errors);
  if (
    sections
    && sections.every((section) => Number.isFinite(section.distance_km))
    && Number.isFinite(distance)
    && Math.abs(sections.reduce((sum, section) => sum + section.distance_km, 0) - distance) > 0.01
  ) {
    errors.push({ field: "sections", code: "SECTION_DISTANCE_SUM_MISMATCH" });
  }
  const gradeProfile = sections ? null : createGradeProfile(course, errors, warnings);
  const surfaceProfile = sections ? null : createSurfaceProfile(course, errors);
  const activityType = explicitActivityFormat(record);
  const rpe = reportedRpeValue(record);
  if (rpe != null && (!Number.isFinite(rpe) || rpe < 0 || rpe > 10)) {
    errors.push({ field: "perceivedExertion", code: "INVALID_RPE" });
  }
  if (errors.length) {
    return Object.freeze({
      ok: false,
      state: "INVALID",
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      session: null,
      provenance: null,
    });
  }

  const speedMps = distance * 1000 / (duration * 60);
  const cadence = readCadence(record, duration);
  const cadenceSensitivity = deriveV27PersonalCadenceSensitivity({
    targetSessionId: record.id,
    currentSpeedMps: speedMps,
    currentCadenceSpm: cadence.cadence_spm,
    currentCadenceProvenanceReliable: cadence.reliable,
    priorRecords: priorCadenceFacts,
  });
  const session = Object.freeze({
    session_id: String(record.id || ""),
    distance_km: distance,
    active_minutes: duration,
    ...(sections ? { sections: Object.freeze(sections) } : {
      grade_profile: Object.freeze(gradeProfile),
      surface_profile: Object.freeze(surfaceProfile),
    }),
    activity_type: activityType,
    rpe,
    cadence_delta_spm: cadenceSensitivity.central.delta_spm,
    cadence_provenance_reliable: cadence.reliable,
    cadence_reference_n: cadenceSensitivity.central.eligible_n,
    cadence_robustness_state: cadenceSensitivity.robustness_state,
  });
  return Object.freeze({
    ok: true,
    state: "RUN",
    errors: Object.freeze([]),
    warnings: Object.freeze(warnings),
    session,
    provenance: Object.freeze({
      model_version: V27_MODEL_VERSION,
      distance_source: "USER_RECORDED",
      active_duration_source: "USER_RECORDED",
      speed_source: "DERIVED_DISTANCE_ACTIVE_DURATION",
      speed_mps: speedMps,
      activity_type_source: activityType === "UNKNOWN" ? "UNKNOWN" : "USER_SELECTED",
      cadence_source: cadence.source,
      cadence_derivation: cadence.derivation,
      cadence_spm: cadence.cadence_spm,
      cadence_sensitivity: cadenceSensitivity,
      grade_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      surface_representation: sections ? "PAIRED_ORDERED_SECTIONS" : "MARGINAL_PROFILE",
      unknown_not_replaced: true,
      no_silent_normalization: true,
    }),
  });
}
