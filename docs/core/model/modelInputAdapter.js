import { SURFACE_FIELDS } from "./modelConstants.js";
import { getBodyWeightFactorFromRecord } from "./bodyProfileAdjustment.js";
import { clampNumber, roundNumber, toFiniteNumber } from "./numberUtilities.js";

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function readCourseValue(record, modernKey, legacyKey, fallback = 0) {
  const course = record.course && typeof record.course === "object" ? record.course : {};
  return firstDefined(course[modernKey], course[legacyKey], record[modernKey], record[legacyKey], fallback);
}

export function normalizeModelInput(record = {}) {
  const activityType = String(record.activityType || "").toLowerCase();
  const isRest = activityType === "rest";
  const surfaceValuesProvided = SURFACE_FIELDS.some(({ recordKey, legacyKey }) => (
    readCourseValue(record, recordKey, legacyKey, "") !== ""
  ));

  const input = {
    date: String(record.date || "").slice(0, 10),
    steps: isRest ? 0 : Math.round(Math.max(0, toFiniteNumber(firstDefined(record.steps, 0), 0))),
    dist_km: isRest ? 0 : roundNumber(Math.max(0, toFiniteNumber(firstDefined(record.distanceKm, record.dist_km, record.distKm, 0), 0)), 2),
    time_min: isRest ? 0 : Math.max(0, toFiniteNumber(firstDefined(record.durationMinutes, record.time_min, record.timeMin, 0), 0)),
    RPE: isRest ? 0 : clampNumber(firstDefined(record.perceivedExertion, record.RPE, record.rpe, 0), 0, 10),
    up_pct: isRest ? 0 : clampNumber(readCourseValue(record, "upPercent", "up_pct", 0), 0, 100),
    down_pct: isRest ? 0 : clampNumber(readCourseValue(record, "downPercent", "down_pct", 0), 0, 100),
    up_grade_pct: isRest ? 0 : clampNumber(readCourseValue(record, "upGradePercent", "up_grade_pct", 0), 0, 100),
    down_grade_pct: isRest ? 0 : clampNumber(readCourseValue(record, "downGradePercent", "down_grade_pct", 0), 0, 100),
    body_weight_factor: getBodyWeightFactorFromRecord(record),
  };

  SURFACE_FIELDS.forEach(({ recordKey, legacyKey }) => {
    const fallback = legacyKey === "surface_paved_pct" && !surfaceValuesProvided ? 100 : 0;
    input[legacyKey] = isRest ? fallback : clampNumber(
      readCourseValue(record, recordKey, legacyKey, fallback),
      0,
      100,
    );
  });

  return Object.freeze(input);
}

export function createModelInputSeries(records = []) {
  return [...records]
    .map(normalizeModelInput)
    .filter((record) => /^\d{4}-\d{2}-\d{2}$/.test(record.date))
    .sort((left, right) => left.date.localeCompare(right.date));
}
