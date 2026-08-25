import { SURFACE_FIELDS, hasTreadmillOutdoorSurfaceMixFromCourse, hasTreadmillOutdoorSurfaceMixFromComponents } from "../model/modelConstants.js";
import { normalizeRegionalModelSnapshot } from "../model/regionalV1/regionalModelSnapshot.js";
import { roundNumber, toFiniteNumber } from "../model/numberUtilities.js";
import { normalizePlainText, normalizeSingleLineText, INPUT_LIMITS } from "./inputSafety.js";
import { normalizePersonalContext } from "../personal/personalContext.js";
import {
  normalizeRpeProvenance,
  RPE_PROVENANCE,
} from "./rpeProvenance.js";

export function isValidLocalDate(value = "") {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function createReadableRecordId(date, existingIds = []) {
  const safeDate = isValidLocalDate(date) ? date : "unknown-date";
  const prefix = `record-${safeDate}-`;
  const usedNumbers = new Set(
    existingIds
      .filter((id) => String(id).startsWith(prefix))
      .map((id) => Number(String(id).slice(prefix.length)))
      .filter(Number.isFinite),
  );
  let sequence = 1;
  while (usedNumbers.has(sequence)) sequence += 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function hasOwn(object, key) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
}

function normalizeBodyProfileSnapshot(profileSource = {}, input = {}) {
  if (!profileSource || typeof profileSource !== "object" || !Object.keys(profileSource).length) return null;
  const snapshot = {
    schemaVersion: Math.max(0, Math.trunc(toFiniteNumber(profileSource.schemaVersion, 0))),
    numericUse: normalizeSingleLineText(profileSource.numericUse, 100),
    sex: normalizeSingleLineText(profileSource.sex || input.profile_sex, 40),
    ageBand: normalizeSingleLineText(profileSource.ageBand || input.profile_age_band, 40),
    heightCm: firstDefined(profileSource.heightCm, input.profile_height_cm, ""),
    weightKg: firstDefined(profileSource.weightKg, input.profile_weight_kg, ""),
    runningStartDateOrBand: normalizeSingleLineText(profileSource.runningStartDateOrBand, 80),
    experienceSelfAssessment: normalizeSingleLineText(profileSource.experienceSelfAssessment, 80),
    runningGoalTags: Object.freeze(Array.isArray(profileSource.runningGoalTags)
      ? profileSource.runningGoalTags.map((item) => normalizeSingleLineText(item, 80)).filter(Boolean)
      : []),
    recordedAt: normalizeSingleLineText(profileSource.recordedAt || input.profile_recorded_at, 50),
  };
  const hasLegacyAdjustment = [
    "referenceWeightKg", "bodyWeightRatio", "bodyWeightFactor", "sourceName", "sourceYear", "formulaVersion",
  ].some((key) => hasOwn(profileSource, key))
    || ["reference_weight_kg", "body_weight_ratio", "body_weight_factor", "profile_source", "profile_formula_version"]
      .some((key) => hasOwn(input, key));
  if (hasLegacyAdjustment) {
    snapshot.referenceWeightKg = firstDefined(profileSource.referenceWeightKg, input.reference_weight_kg, "");
    snapshot.bodyWeightRatio = toFiniteNumber(firstDefined(profileSource.bodyWeightRatio, input.body_weight_ratio, 1), 1);
    snapshot.bodyWeightFactor = toFiniteNumber(firstDefined(profileSource.bodyWeightFactor, input.body_weight_factor, 1), 1);
    snapshot.sourceName = normalizeSingleLineText(profileSource.sourceName || input.profile_source, 100);
    snapshot.sourceYear = normalizeSingleLineText(profileSource.sourceYear, 20);
    snapshot.formulaVersion = normalizeSingleLineText(profileSource.formulaVersion || input.profile_formula_version, 100);
  }
  return Object.freeze(snapshot);
}

function normalizeCourse(rawCourse = {}, rawRecord = {}) {
  const course = rawCourse && typeof rawCourse === "object" ? rawCourse : {};
  const rawGradeMode = String(course.gradeInputMode || "").toUpperCase();
  const gradeInputMode = ["UNKNOWN", "FLAT", "SUMMARY", "SECTIONS"].includes(rawGradeMode)
    ? rawGradeMode
    : Array.isArray(course.sections) && course.sections.length
      ? "SECTIONS"
      : String(course.gradeKnowledge || "UNKNOWN").toUpperCase() === "KNOWN_FLAT"
        ? "FLAT"
        : String(course.gradeKnowledge || "UNKNOWN").toUpperCase() === "KNOWN_PROFILE"
          ? "SUMMARY"
          : "UNKNOWN";
  const gradeKnowledge = gradeInputMode === "FLAT"
    ? "KNOWN_FLAT"
    : ["SUMMARY", "SECTIONS"].includes(gradeInputMode)
      ? "KNOWN_PROFILE"
      : "UNKNOWN";
  const modelSurfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const routePattern = String(course.routePattern || "UNKNOWN").toUpperCase();
  const surfaceWetSlipState = String(course.surfaceWetSlipState || "UNKNOWN").toUpperCase();
  const normalized = {
    id: normalizeSingleLineText(firstDefined(course.id, course.courseId), 120),
    name: normalizeSingleLineText(firstDefined(course.name, course.courseName, rawRecord.course_name, rawRecord.courseName), 80),
    routePattern: ["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"].includes(routePattern) ? routePattern : "UNKNOWN",
    surfaceWetSlipState: ["DRY", "DAMP", "WET", "SLIPPERY_REPORTED", "UNKNOWN"].includes(surfaceWetSlipState) ? surfaceWetSlipState : "UNKNOWN",
    gradeInputMode,
    surfaceInputMode: ["UNKNOWN", "SINGLE", "MIXED"].includes(String(course.surfaceInputMode || "").toUpperCase())
      ? String(course.surfaceInputMode).toUpperCase()
      : "UNKNOWN",
    gradeKnowledge,
    upPercent: toFiniteNumber(firstDefined(course.upPercent, course.up_pct, rawRecord.up_pct), 0),
    downPercent: toFiniteNumber(firstDefined(course.downPercent, course.down_pct, rawRecord.down_pct), 0),
    upGradePercent: toFiniteNumber(firstDefined(course.upGradePercent, course.up_grade_pct, rawRecord.up_grade_pct), 0),
    downGradePercent: toFiniteNumber(firstDefined(course.downGradePercent, course.down_grade_pct, rawRecord.down_grade_pct), 0),
    modelSurfaceClass: [
      "REF_HARD_EVEN_STABLE",
      "DRY_STABLE_GRASS_TURF",
      "DEEP_DRY_SOFT_SAND",
      "EXPLICIT_UNEVEN",
      "KNOWN_OTHER",
      "UNKNOWN",
    ].includes(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
  };
  SURFACE_FIELDS.forEach(({ recordKey, legacyKey }) => {
    normalized[recordKey] = toFiniteNumber(
      firstDefined(course[recordKey], course[legacyKey], rawRecord[recordKey], rawRecord[legacyKey]),
      0,
    );
  });
  const positiveSurfaceCount = SURFACE_FIELDS.filter(({ recordKey }) => normalized[recordKey] > 0).length;
  if (normalized.surfaceInputMode === "UNKNOWN" && positiveSurfaceCount) {
    normalized.surfaceInputMode = positiveSurfaceCount === 1 ? "SINGLE" : "MIXED";
  }
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    normalized.modelSurfaceProfile = Object.freeze(course.modelSurfaceProfile.map((item = {}) => Object.freeze({
      sharePercent: toFiniteNumber(firstDefined(item.sharePercent, item.share_pct), 0),
      surfaceClass: normalizeSingleLineText(firstDefined(item.surfaceClass, item.surface_class), 80) || "UNKNOWN",
    })));
  }
  if (Array.isArray(course.sections) && course.sections.length) {
    normalized.sections = Object.freeze(course.sections.flatMap((item = {}, index) => {
      const rawDistance = firstDefined(item.distanceKm, item.distance_km);
      const rawShare = firstDefined(item.sharePercent, item.share_pct);
      const distanceKm = rawDistance == null ? null : toFiniteNumber(rawDistance, Number.NaN);
      const sharePercent = rawShare == null ? null : toFiniteNumber(rawShare, Number.NaN);
      const rawGrade = firstDefined(item.gradePercent, item.grade_pct);
      const signedGrade = rawGrade == null ? null : toFiniteNumber(rawGrade, Number.NaN);
      const durationMinutes = toFiniteNumber(firstDefined(item.durationMinutes, item.duration_minutes), Number.NaN);
      const steps = toFiniteNumber(item.steps, Number.NaN);
      const speedMps = toFiniteNumber(firstDefined(item.speedMps, item.speed_mps), Number.NaN);
      const cadenceSpm = toFiniteNumber(firstDefined(item.cadenceSpm, item.cadence_spm), Number.NaN);
      const rawDirection = String(item.gradeDirection || "").toUpperCase();
      const gradeDirection = ["UPHILL", "DOWNHILL", "FLAT", "UNKNOWN"].includes(rawDirection)
        ? rawDirection
        : Number(signedGrade) > 0
          ? "UPHILL"
          : Number(signedGrade) < 0
            ? "DOWNHILL"
            : Number(signedGrade) === 0
              ? "FLAT"
              : "UNKNOWN";
      const gradePercent = signedGrade == null || !Number.isFinite(signedGrade)
        ? null
        : gradeDirection === "DOWNHILL"
          ? -Math.abs(signedGrade)
          : gradeDirection === "UPHILL"
            ? Math.abs(signedGrade)
            : gradeDirection === "FLAT"
              ? 0
              : signedGrade;
      if (!(Number(distanceKm) > 0) && !(Number(sharePercent) > 0)) return [];
      return [Object.freeze({
        sectionId: normalizeSingleLineText(item.sectionId, 80) || `section-${index + 1}`,
        sharePercent: Number.isFinite(sharePercent) ? sharePercent : null,
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
        durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null,
        steps: Number.isInteger(steps) && steps >= 0 ? steps : null,
        speedMps: Number.isFinite(speedMps) && speedMps > 0 ? speedMps : null,
        cadenceSpm: Number.isFinite(cadenceSpm) && cadenceSpm > 0 ? cadenceSpm : null,
        gradeDirection,
        gradePercent,
        surfaceClass: normalizeSingleLineText(firstDefined(item.surfaceClass, item.surface_class), 80) || normalized.modelSurfaceClass,
      })];
    }));
  }
  return Object.freeze(normalized);
}

function rawNumericValue(input, modernKey, ...legacyKeys) {
  const values = [input[modernKey], ...legacyKeys.map((key) => input[key])];
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function validateProvidedNumber(errors, input, field, keys, minimum, maximum, message) {
  const value = rawNumericValue(input, keys[0], ...keys.slice(1));
  if (value === undefined) return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    errors.push({ field, code: `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`, message });
  }
}

function validateRequiredPositiveNumber(errors, input, field, keys, maximum, message) {
  const value = rawNumericValue(input, keys[0], ...keys.slice(1));
  const number = Number(value);
  if (value === undefined || !Number.isFinite(number) || number <= 0 || number > maximum) {
    errors.push({
      field,
      code: `INVALID_${field.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`,
      message,
    });
  }
}

function validateV27CourseInput(errors, input) {
  const course = input.course && typeof input.course === "object" ? input.course : {};
  const gradeKnowledge = String(course.gradeKnowledge || "UNKNOWN").toUpperCase();
  if (!["UNKNOWN", "KNOWN_FLAT", "KNOWN_PROFILE"].includes(gradeKnowledge)) {
    errors.push({ field: "course", code: "INVALID_GRADE_KNOWLEDGE", message: "坂道の入力方法を選び直してください。" });
  }
  const slopeFields = [
    ["upPercent", 0, 100],
    ["downPercent", 0, 100],
    ["upGradePercent", 0, 100],
    ["downGradePercent", 0, 100],
  ];
  slopeFields.forEach(([field, minimum, maximum]) => {
    if (course[field] === "" || course[field] == null) return;
    const number = Number(course[field]);
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      errors.push({ field: "course", code: `INVALID_${field.toUpperCase()}`, message: "坂道の割合・勾配を確認してください。" });
    }
  });
  const sections = Array.isArray(course.sections) ? course.sections : [];
  if (sections.length) {
    const invalid = sections.some((section) => {
      const distance = Number(section?.distanceKm);
      const share = Number(section?.sharePercent);
      const grade = section?.gradePercent == null ? null : Number(section.gradePercent);
      return (!(distance > 0) && !(share > 0))
        || (distance && !Number.isFinite(distance))
        || (share && (!Number.isFinite(share) || share < 0 || share > 100))
        || (grade != null && (!Number.isFinite(grade) || Math.abs(grade) > 100));
    });
    if (invalid) errors.push({ field: "course", code: "INVALID_COURSE_SECTION", message: "区間の距離・割合・勾配を確認してください。" });
    const shares = sections.map((section) => Number(section?.sharePercent)).filter(Number.isFinite);
    if (shares.length === sections.length && Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) > 0.01) {
      errors.push({ field: "course", code: "SECTION_SHARE_SUM_NOT_100", message: "区間割合の合計を100%にしてください。" });
    }
  } else if (gradeKnowledge === "KNOWN_PROFILE") {
    const up = Number(course.upPercent);
    const down = Number(course.downPercent);
    const upGrade = Number(course.upGradePercent);
    const downGrade = Number(course.downGradePercent);
    if ([up, down, upGrade, downGrade].some((value) => !Number.isFinite(value))) {
      errors.push({ field: "course", code: "GRADE_PROFILE_INCOMPLETE", message: "割合入力では、上り・下りの割合と代表勾配を確認してください。" });
    } else {
      if (up + down > 100.01) errors.push({ field: "course", code: "GRADE_SHARE_SUM_EXCEEDS_100", message: "上り区間と下り区間の合計は100%以下にしてください。" });
      if (up > 0 && upGrade <= 0) errors.push({ field: "course", code: "UPHILL_GRADE_REQUIRED", message: "上り区間がある場合は、正の代表勾配を入力してください。" });
      if (down > 0 && downGrade <= 0) errors.push({ field: "course", code: "DOWNHILL_GRADE_REQUIRED", message: "下り区間がある場合は、勾配の大きさを正の値で入力してください。" });
    }
  }

  const surfaceClass = String(course.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const surfaceClasses = new Set([
    "REF_HARD_EVEN_STABLE",
    "DRY_STABLE_GRASS_TURF",
    "DEEP_DRY_SOFT_SAND",
    "EXPLICIT_UNEVEN",
    "KNOWN_OTHER",
    "UNKNOWN",
  ]);
  if (!surfaceClasses.has(surfaceClass)) errors.push({ field: "course", code: "INVALID_MODEL_SURFACE_CLASS", message: "路面の入力内容を確認してください。" });
  if (Array.isArray(course.modelSurfaceProfile) && course.modelSurfaceProfile.length) {
    const shares = course.modelSurfaceProfile.map((item) => Number(item?.sharePercent ?? item?.share_pct));
    if (shares.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      errors.push({ field: "course", code: "INVALID_MODEL_SURFACE_SHARE", message: "路面割合を確認してください。" });
    } else if (Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) > 0.01) {
      errors.push({ field: "course", code: "MODEL_SURFACE_SUM_NOT_100", message: "路面割合の合計を100%にしてください。" });
    }
  }
}

export function validateRunningRecordInput(input = {}) {
  const errors = [];
  const activityType = String(input.activityType || "").toLowerCase();
  if (!isValidLocalDate(input.date)) {
    errors.push({ field: "date", code: "INVALID_RECORD_DATE", message: "日付を正しく入力してください。" });
  }
  if (!["run", "rest"].includes(activityType)) {
    errors.push({ field: "activityType", code: "INVALID_ACTIVITY_TYPE", message: "走行または休養を選択してください。" });
  }
  if (activityType === "run") {
    validateRequiredPositiveNumber(errors, input, "distanceKm", ["distanceKm", "dist_km", "distKm"], INPUT_LIMITS.distanceKm, "走行記録では、0より大きい距離が必要です。");
    validateRequiredPositiveNumber(errors, input, "durationMinutes", ["durationMinutes", "time_min", "timeMin"], INPUT_LIMITS.durationMinutes, "走行記録では、0より大きい実走時間が必要です。");
    validateProvidedNumber(errors, input, "steps", ["steps"], 0, INPUT_LIMITS.steps, "歩数が入力可能な範囲を超えています。");
    validateProvidedNumber(errors, input, "perceivedExertion", ["perceivedExertion", "RPE", "rpe"], 0, 10, "きつさは0〜10で入力してください。");
    const runningFormat = String(input.runningFormat || input.activityFormat || "UNKNOWN").toUpperCase();
    if (!["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(runningFormat)) {
      errors.push({ field: "runningFormat", code: "INVALID_RUNNING_FORMAT", message: "走行形式を選び直してください。" });
    }
    if (runningFormat === "RUN_WALK") {
      const runD = Number(rawNumericValue(input, "runWalkRunningDistanceKm"));
      const runT = Number(rawNumericValue(input, "runWalkRunningDurationMinutes"));
      const totalD = Number(rawNumericValue(input, "distanceKm", "dist_km", "distKm"));
      const totalT = Number(rawNumericValue(input, "durationMinutes", "time_min", "timeMin"));
      if (!(runD > 0 && runD < totalD)) errors.push({ field: "runWalkRunningDistanceKm", code: "INVALID_RUN_WALK_RUNNING_DISTANCE", message: "RUN_WALKでは、走った距離を全体距離より小さい正の値で入力してください。" });
      if (!(runT > 0 && runT < totalT)) errors.push({ field: "runWalkRunningDurationMinutes", code: "INVALID_RUN_WALK_RUNNING_DURATION", message: "RUN_WALKでは、走った時間を全体の実走時間より短い正の値で入力してください。" });
      const rwSections = Array.isArray(input.runWalkRunningSections) ? input.runWalkRunningSections : [];
      if (rwSections.length) {
        const shares = rwSections.map((section) => Number(section?.sharePercent));
        if (shares.some((value) => !Number.isFinite(value) || value <= 0 || value > 100) || Math.abs(shares.reduce((a,b)=>a+b,0) - 100) > 0.01) errors.push({ field: "runWalkRunningSections", code: "INVALID_RUN_WALK_RUNNING_SECTION_SHARES", message: "走った区間の割合は正の値で、合計100%にしてください。" });
        if (rwSections.some((section) => {
          const direction = String(section?.gradeDirection || "").toUpperCase();
          const grade = Number(section?.gradePercent);
          const directionInvalid = !["FLAT","UPHILL","DOWNHILL"].includes(direction);
          const gradeInvalid = !Number.isFinite(grade) || grade < 0 || grade > 15;
          const directionMagnitudeInvalid = direction === "FLAT" ? Math.abs(grade) > 1e-9 : ["UPHILL","DOWNHILL"].includes(direction) ? !(grade > 0) : false;
          return directionInvalid || gradeInvalid || directionMagnitudeInvalid || !Array.isArray(section?.surfaceComponents) || !section.surfaceComponents.length;
        })) errors.push({ field: "runWalkRunningSections", code: "RUN_WALK_RUNNING_SECTION_GRADE_OUT_OF_MODEL_USE_DOMAIN", message: "走った区間の勾配は、方向と0〜15%の確認範囲で入力してください。" });
        const rwSurfaceComponents = rwSections.flatMap((section) => Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []);
        if (hasTreadmillOutdoorSurfaceMixFromComponents(rwSurfaceComponents)) errors.push({ field: "runWalkRunningSections", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
      }
    }
    const stepsProvenance = String(input.stepsProvenance || input.cadenceProvenance || "UNKNOWN").toUpperCase();
    if (!["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(stepsProvenance)) {
      errors.push({ field: "stepsProvenance", code: "INVALID_STEPS_PROVENANCE", message: "歩数の取得方法を選び直してください。" });
    }

    const rawCourse = input.course && typeof input.course === "object" ? input.course : {};
    const surfaceValues = SURFACE_FIELDS.map(({ recordKey, legacyKey }) => (
      firstDefined(rawCourse[recordKey], rawCourse[legacyKey], input[recordKey], input[legacyKey])
    ));
    const providedSurfaces = surfaceValues.filter((value) => value !== undefined);
    if (providedSurfaces.length && providedSurfaces.some((value) => Number(value) !== 0)) {
      const invalidSurface = providedSurfaces.some((value) => {
        const number = Number(value);
        return !Number.isFinite(number) || number < 0 || number > 100;
      });
      const surfaceSum = providedSurfaces.reduce((total, value) => total + Number(value || 0), 0);
      if (invalidSurface) {
        errors.push({ field: "course", code: "INVALID_SURFACE_PERCENT", message: "路面割合は0〜100で入力してください。" });
      } else if (Math.abs(surfaceSum - 100) > 1e-9) {
        errors.push({ field: "course", code: "SURFACE_SUM_NOT_100", message: "路面の合計を100%にしてください。", details: { surfaceSum } });
      }
      if (hasTreadmillOutdoorSurfaceMixFromCourse(rawCourse)) {
        errors.push({ field: "course", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
      }
    }
    validateV27CourseInput(errors, input);
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

function normalizeContextObject(source = {}, specification = {}) {
  const raw = source && typeof source === "object" ? source : {};
  return Object.freeze(Object.fromEntries(Object.entries(specification).map(([key, config]) => {
    const value = raw[key];
    if (config === "number") {
      const number = Number(value);
      return [key, Number.isFinite(number) ? number : null];
    }
    if (config === "tags") {
      const items = Array.isArray(value) ? value : String(value || "").split(",");
      return [key, Object.freeze([...new Set(items.map((item) => normalizeSingleLineText(item, 80)).filter(Boolean))])];
    }
    if (config === "line") return [key, normalizeSingleLineText(value, 160)];
    return [key, normalizePlainText(value, Number(config) || 500)];
  })));
}

export function normalizeRunningRecord(input = {}, options = {}) {
  const activityType = String(input.activityType || "").toLowerCase() === "rest" ? "rest" : "run";
  const nowIso = options.nowIso || new Date().toISOString();
  const date = String(input.date || "").slice(0, 10);
  const isRest = activityType === "rest";
  const distanceKm = isRest ? 0 : roundNumber(toFiniteNumber(firstDefined(input.distanceKm, input.dist_km, input.distKm), 0), 2);
  const durationMinutes = isRest ? 0 : toFiniteNumber(firstDefined(input.durationMinutes, input.time_min, input.timeMin), 0);
  const steps = isRest ? 0 : Math.round(toFiniteNumber(input.steps, 0));
  const rawRpe = firstDefined(input.perceivedExertion, input.RPE, input.rpe);
  const hasRpe = !isRest && rawRpe !== undefined && Number.isFinite(Number(rawRpe));
  const perceivedExertion = hasRpe ? Number(rawRpe) : null;
  const rpeProvenance = isRest
    ? RPE_PROVENANCE.notReported
    : normalizeRpeProvenance(input.rpeProvenance, {
      hasValue: hasRpe,
      assumeExplicit: options.assumeExplicitRpe === true,
    });
  const existingIds = Array.isArray(options.existingIds) ? options.existingIds : [];
  const id = normalizeSingleLineText(input.id, 100) || createReadableRecordId(date, existingIds);
  const profileSource = input.bodyProfileSnapshot || {};
  const planOutcomeSource = input.planOutcome || {};

  return Object.freeze({
    id,
    date,
    activityType,
    distanceKm,
    durationMinutes,
    steps,
    perceivedExertion,
    rpeProvenance,
    runningFormat: isRest
      ? "NOT_APPLICABLE"
      : ["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(String(input.runningFormat || input.activityFormat || "UNKNOWN").toUpperCase())
        ? String(input.runningFormat || input.activityFormat || "UNKNOWN").toUpperCase()
        : "UNKNOWN",
    runWalkRunningDistanceKm: isRest || String(input.runningFormat || input.activityFormat || "UNKNOWN").toUpperCase() !== "RUN_WALK"
      ? null : (Number.isFinite(Number(input.runWalkRunningDistanceKm)) && Number(input.runWalkRunningDistanceKm) > 0 ? roundNumber(Number(input.runWalkRunningDistanceKm), 3) : null),
    runWalkRunningDurationMinutes: isRest || String(input.runningFormat || input.activityFormat || "UNKNOWN").toUpperCase() !== "RUN_WALK"
      ? null : (Number.isFinite(Number(input.runWalkRunningDurationMinutes)) && Number(input.runWalkRunningDurationMinutes) > 0 ? Number(input.runWalkRunningDurationMinutes) : null),
    runWalkRunningSections: isRest || String(input.runningFormat || input.activityFormat || "UNKNOWN").toUpperCase() !== "RUN_WALK"
      ? Object.freeze([])
      : Object.freeze((Array.isArray(input.runWalkRunningSections) ? input.runWalkRunningSections : []).map((section, index) => Object.freeze({
          sectionId: normalizeSingleLineText(section?.sectionId, 80) || `running-phase-${index + 1}`,
          sharePercent: Number(section?.sharePercent),
          gradeKnown: section?.gradeKnown === true,
          gradePercent: Number(section?.gradePercent),
          gradeDirection: ["FLAT","UPHILL","DOWNHILL"].includes(String(section?.gradeDirection || "").toUpperCase()) ? String(section.gradeDirection).toUpperCase() : "UNKNOWN",
          surfaceComponents: Object.freeze((Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []).map((item) => Object.freeze({
            componentId: normalizeSingleLineText(item?.componentId, 80), sharePercent: Number(item?.sharePercent), userCategory: normalizeSingleLineText(item?.userCategory, 80).toUpperCase(),
          }))),
        }))),
    stepsProvenance: isRest
      ? "NOT_APPLICABLE"
      : ["DEVICE_MEASURED", "DEVICE_SYNCED", "ESTIMATED", "UNKNOWN"].includes(String(input.stepsProvenance || input.cadenceProvenance || "UNKNOWN").toUpperCase())
        ? String(input.stepsProvenance || input.cadenceProvenance || "UNKNOWN").toUpperCase()
        : "UNKNOWN",
    course: normalizeCourse(input.course, input),
    memo: normalizePlainText(input.memo, 500),
    bodyProfileSnapshot: normalizeBodyProfileSnapshot(profileSource, input),
    planOutcome: Object.freeze({
      status: normalizeSingleLineText(planOutcomeSource.status || input.plan_outcome_status, 40),
      reason: normalizeSingleLineText(planOutcomeSource.reason || input.plan_change_reason, 40),
      reasonNote: normalizePlainText(planOutcomeSource.reasonNote || input.plan_change_note, 240),
      plannedDistanceKm: Math.max(0, toFiniteNumber(firstDefined(planOutcomeSource.plannedDistanceKm, input.planned_dist_km), 0)),
      plannedDurationMinutes: Math.max(0, toFiniteNumber(firstDefined(planOutcomeSource.plannedDurationMinutes, input.planned_time_min), 0)),
      plannedCourseSnapshot: planOutcomeSource.plannedCourseSnapshot && typeof planOutcomeSource.plannedCourseSnapshot === "object"
        ? Object.freeze({ ...planOutcomeSource.plannedCourseSnapshot })
        : null,
      planNote: normalizePlainText(planOutcomeSource.planNote, 500),
    }),
    personalContext: normalizePersonalContext(input.personalContext || {}),
    environmentContext: normalizeContextObject(input.environmentContext, { weather: "line", temperatureC: "number", windSummary: "line", environmentNote: 500 }),
    recoveryContext: normalizeContextObject(input.recoveryContext, { sleepSummary: "line", nutritionHydrationSummary: "line", lifestyleNote: 500 }),
    reflectionContext: normalizeContextObject(input.reflectionContext, { postRunReflection: 500, perceivedDifference: 500, reflectionKeyPoint: 500, nextCheckPoint: 500 }),
    consultationContext: normalizeContextObject(input.consultationContext, { consultationTarget: "line", consultationQuestion: 500, consultationDataSelection: "tags" }),
    regionalModelSnapshot: normalizeRegionalModelSnapshot(input.regionalModelSnapshot),
    createdAt: normalizeSingleLineText(input.createdAt, 50) || nowIso,
    updatedAt: nowIso,
  });
}

export function validateRunningRecord(record = {}) {
  const errors = [];
  if (!isValidLocalDate(record.date)) {
    errors.push({ field: "date", code: "INVALID_RECORD_DATE", message: "日付を正しく入力してください。" });
  }
  if (!["run", "rest"].includes(record.activityType)) {
    errors.push({ field: "activityType", code: "INVALID_ACTIVITY_TYPE", message: "走行または休養を選択してください。" });
  }
  if (record.activityType === "run") {
    if (!Number.isFinite(record.distanceKm) || record.distanceKm <= 0 || record.distanceKm > INPUT_LIMITS.distanceKm) {
      errors.push({ field: "distanceKm", code: "INVALID_DISTANCE", message: "走行記録では、0より大きい距離が必要です。" });
    }
    if (!Number.isFinite(record.durationMinutes) || record.durationMinutes <= 0 || record.durationMinutes > INPUT_LIMITS.durationMinutes) {
      errors.push({ field: "durationMinutes", code: "INVALID_DURATION", message: "走行記録では、0より大きい実走時間が必要です。" });
    }
    if (record.steps < 0 || record.steps > INPUT_LIMITS.steps) {
      errors.push({ field: "steps", code: "INVALID_STEPS", message: "歩数が入力可能な範囲を超えています。" });
    }
    if (
      record.perceivedExertion != null
      && (
        !Number.isFinite(record.perceivedExertion)
        || record.perceivedExertion < 0
        || record.perceivedExertion > 10
      )
    ) {
      errors.push({ field: "perceivedExertion", code: "INVALID_EXERTION", message: "きつさは0〜10で入力してください。" });
    }
    if (!Object.values(RPE_PROVENANCE).includes(record.rpeProvenance)) {
      errors.push({ field: "rpeProvenance", code: "INVALID_RPE_PROVENANCE", message: "きつさの入力状態を確認してください。" });
    }
    if (
      record.rpeProvenance === RPE_PROVENANCE.userReported
      && record.perceivedExertion == null
    ) {
      errors.push({ field: "perceivedExertion", code: "REPORTED_RPE_VALUE_REQUIRED", message: "きつさを入力した状態では0〜10の値が必要です。" });
    }
    if (
      record.rpeProvenance === RPE_PROVENANCE.notReported
      && record.perceivedExertion != null
    ) {
      errors.push({ field: "rpeProvenance", code: "UNREPORTED_RPE_VALUE_CONTRADICTION", message: "きつさの値と入力状態が一致していません。" });
    }
    const surfaceSum = SURFACE_FIELDS.reduce(
      (total, { recordKey }) => total + toFiniteNumber(record.course?.[recordKey], 0),
      0,
    );
    if (surfaceSum > 0 && Math.abs(surfaceSum - 100) > 1e-9) {
      errors.push({ field: "course", code: "SURFACE_SUM_NOT_100", message: "路面の合計を100%にしてください。", details: { surfaceSum } });
    }
    if (hasTreadmillOutdoorSurfaceMixFromCourse(record.course || {})) {
      errors.push({ field: "course", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
    }
    if (record.runningFormat === "RUN_WALK") {
      const rwSurfaceComponents = (record.runWalkRunningSections || []).flatMap((section) => Array.isArray(section?.surfaceComponents) ? section.surfaceComponents : []);
      if (hasTreadmillOutdoorSurfaceMixFromComponents(rwSurfaceComponents)) {
        errors.push({ field: "runWalkRunningSections", code: "TREADMILL_OUTDOOR_MIX_FORBIDDEN", message: "トレッドミルと屋外路面は、同じ走行の路面割合として混ぜて入力できません。" });
      }
    }
    if (!["CONTINUOUS_RUN", "RUN_WALK", "UNKNOWN"].includes(record.runningFormat)) {
      errors.push({ field: "runningFormat", code: "INVALID_RUNNING_FORMAT", message: "走行形式を選び直してください。" });
    }
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
