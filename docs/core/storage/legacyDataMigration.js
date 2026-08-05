import { SURFACE_FIELDS } from "../model/modelConstants.js";
import { normalizeRunningRecord } from "../safety/inputValidation.js";
import { normalizeSingleLineText } from "../safety/inputSafety.js";
import { normalizeSubjectiveFeedback } from "../safety/subjectiveFeedback.js";
import { legacyRpeProvenance } from "../safety/rpeProvenance.js";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "./storageKeys.js";

const LEGACY_COURSE_FIELDS = Object.freeze([
  Object.freeze({ recordKey: "upPercent", legacyKey: "up_pct" }),
  Object.freeze({ recordKey: "downPercent", legacyKey: "down_pct" }),
  Object.freeze({ recordKey: "upGradePercent", legacyKey: "up_grade_pct" }),
  Object.freeze({ recordKey: "downGradePercent", legacyKey: "down_grade_pct" }),
  ...SURFACE_FIELDS.map(({ recordKey, legacyKey }) => Object.freeze({ recordKey, legacyKey })),
]);

function readLegacyJson(gateway, key, fallback) {
  return gateway.readJson(key, fallback);
}

function collectLegacyRawValues(gateway) {
  return Object.fromEntries(Object.entries(LEGACY_STORAGE_KEYS).map(([name, key]) => [name, {
    key,
    rawValue: gateway.readRaw(key, null),
  }]));
}

function buildLegacyRawBackup(gateway) {
  return {
    formatVersion: "legacy-raw-backup",
    createdAt: new Date().toISOString(),
    values: collectLegacyRawValues(gateway),
  };
}

function convertLegacyRecords(legacySessions = []) {
  const existingIds = [];
  return (Array.isArray(legacySessions) ? legacySessions : [])
    .map((session) => {
      const activityType = Number(session.dist_km || 0) <= 0
        && Number(session.time_min || 0) <= 0
        && Number(session.steps || 0) <= 0
        ? "rest"
        : "run";
      const converted = normalizeRunningRecord({
        ...session,
        activityType,
        distanceKm: session.dist_km,
        durationMinutes: session.time_min,
        perceivedExertion: session.RPE,
        rpeProvenance: legacyRpeProvenance(session.RPE),
        course: {
          name: session.course_name,
          upPercent: session.up_pct,
          downPercent: session.down_pct,
          upGradePercent: session.up_grade_pct,
          downGradePercent: session.down_grade_pct,
          pavedPercent: session.surface_paved_pct,
          trackPercent: session.surface_track_pct,
          treadmillPercent: session.surface_treadmill_pct,
          soilPercent: session.surface_soil_pct,
          trailPercent: session.surface_trail_pct,
          naturalGrassPercent: session.surface_natural_grass_pct,
          artificialTurfPercent: session.surface_artificial_turf_pct,
          sandPercent: session.surface_sand_pct,
        },
        bodyProfileSnapshot: {
          sex: session.profile_sex,
          ageBand: session.profile_age_band,
          heightCm: session.profile_height_cm,
          weightKg: session.profile_weight_kg,
          referenceWeightKg: session.reference_weight_kg,
          bodyWeightRatio: session.body_weight_ratio,
          bodyWeightFactor: session.body_weight_factor,
          sourceName: session.profile_source,
          formulaVersion: session.profile_formula_version,
          recordedAt: session.profile_recorded_at,
        },
        planOutcome: {
          status: session.plan_outcome_status,
          reason: session.plan_change_reason,
          reasonNote: session.plan_change_note,
          plannedDistanceKm: session.planned_dist_km,
          plannedDurationMinutes: session.planned_time_min,
        },
      }, {
        existingIds,
        nowIso: session.updatedAt || session.createdAt || new Date().toISOString(),
      });
      existingIds.push(converted.id);
      return converted;
    })
    .filter((record) => record.date)
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
}

function convertLegacyFeedback(legacyFeedbackMap = {}, convertedRecords = []) {
  const recordsByDate = new Map();
  convertedRecords.forEach((record) => {
    const records = recordsByDate.get(record.date) || [];
    records.push(record);
    recordsByDate.set(record.date, records);
  });
  return Object.entries(legacyFeedbackMap && typeof legacyFeedbackMap === "object" ? legacyFeedbackMap : {})
    .map(([date, feedback]) => {
      const dateRecords = recordsByDate.get(date) || [];
      const recordId = dateRecords.length === 1 ? dateRecords[0].id : "";
      const associatedRecord = dateRecords.length === 1 ? dateRecords[0] : null;
      return normalizeSubjectiveFeedback({
        ...feedback,
        recordId,
        date,
        checkStatus: feedback.subjectiveCheck?.status,
        fatigueByBodyPart: feedback.fatigue,
        discomfortByBodyPart: feedback.discomfort,
        reviewedBodyParts: feedback.reviewed,
        legacyTopBodyPart: feedback.topPart,
        unexpectedSymptom: feedback.symptomContext?.hasUnexpectedSymptom,
      }, {
        planOutcome: associatedRecord?.planOutcome || {},
      });
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function convertLegacyPlans(legacyPlans = []) {
  return (Array.isArray(legacyPlans) ? legacyPlans : []).map((plan, index) => ({
    id: String(plan.id || `plan-${String(plan.date || plan.scheduledDate || "unscheduled").slice(0, 10)}-${String(index + 1).padStart(3, "0")}`),
    scheduledDate: String(plan.scheduledDate || plan.date || "").slice(0, 10),
    planType: plan.planType === "rest" ? "rest" : "run",
    title: String(plan.title || plan.name || "次回予定").slice(0, 80),
    memo: String(plan.memo || plan.note || "").slice(0, 500),
    plannedSession: plan.plannedSession || plan.session || plan,
    sourceRecordId: String(plan.sourceRecordId || ""),
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: plan.updatedAt || new Date().toISOString(),
  }));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function normalizedCourseNameKey(name) {
  return normalizeSingleLineText(name, 80).toLocaleLowerCase("ja");
}

function readStrictCourseNumber(source, field) {
  const key = hasOwn(source, field.legacyKey)
    ? field.legacyKey
    : hasOwn(source, field.recordKey)
      ? field.recordKey
      : "";
  if (!key || source[key] === "" || source[key] == null) {
    return { ok: false, code: "LEGACY_COURSE_INCOMPLETE", field: field.recordKey };
  }
  const value = Number(source[key]);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, code: "LEGACY_COURSE_VALUE_INVALID", field: field.recordKey };
  }
  return { ok: true, value };
}

function convertLegacyCourseCandidate(input = {}, sourceIndex = 0) {
  const name = normalizeSingleLineText(input?.name || input?.course_name, 80);
  if (!name) {
    return { ok: false, sourceIndex, name: "", code: "LEGACY_COURSE_NAME_REQUIRED" };
  }
  const conditionSource = input?.condition && typeof input.condition === "object" && !Array.isArray(input.condition)
    ? input.condition
    : input;
  const course = { name };
  for (const field of LEGACY_COURSE_FIELDS) {
    const result = readStrictCourseNumber(conditionSource, field);
    if (!result.ok) return { ...result, ok: false, sourceIndex, name };
    course[field.recordKey] = result.value;
  }
  const surfaceTotal = SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + course[recordKey], 0);
  if (Math.abs(surfaceTotal - 100) > 1e-9) {
    return {
      ok: false,
      sourceIndex,
      name,
      code: "LEGACY_COURSE_SURFACE_TOTAL_INVALID",
      details: { surfaceTotal },
    };
  }
  return {
    ok: true,
    sourceIndex,
    name,
    nameKey: normalizedCourseNameKey(name),
    course: Object.freeze(course),
    createdAt: String(input?.createdAt || input?.updatedAt || ""),
    updatedAt: String(input?.updatedAt || input?.lastUsedDate || input?.createdAt || ""),
  };
}

function countReasons(rejected = []) {
  return Object.freeze(rejected.reduce((counts, item) => {
    counts[item.code] = (counts[item.code] || 0) + 1;
    return counts;
  }, {}));
}

export function inspectLegacyCoursePresets(rawCourses = [], existingCourses = []) {
  const source = Array.isArray(rawCourses) ? rawCourses : [];
  const converted = source.map((item, index) => convertLegacyCourseCandidate(item, index));
  const valid = converted.filter((item) => item.ok);
  const nameCounts = valid.reduce((counts, item) => {
    counts.set(item.nameKey, (counts.get(item.nameKey) || 0) + 1);
    return counts;
  }, new Map());
  const existingNames = new Set((Array.isArray(existingCourses) ? existingCourses : [])
    .map((item) => normalizedCourseNameKey(item?.name || item?.course?.name))
    .filter(Boolean));
  const eligible = [];
  const rejected = converted.filter((item) => !item.ok).map((item) => ({ ...item }));
  valid.forEach((item) => {
    if ((nameCounts.get(item.nameKey) || 0) > 1) {
      rejected.push({ ...item, ok: false, code: "LEGACY_COURSE_DUPLICATE" });
      return;
    }
    if (existingNames.has(item.nameKey)) {
      rejected.push({ ...item, ok: false, code: "LEGACY_COURSE_EXISTING_NAME_CONFLICT" });
      return;
    }
    eligible.push(item);
  });
  rejected.sort((left, right) => left.sourceIndex - right.sourceIndex);
  return Object.freeze({
    sourceCount: source.length,
    eligible: Object.freeze(eligible.map((item) => Object.freeze({ ...item }))),
    rejected: Object.freeze(rejected.map((item) => Object.freeze({ ...item }))),
    eligibleCount: eligible.length,
    rejectedCount: rejected.length,
    reasonCounts: countReasons(rejected),
  });
}

function slugifyCourseName(name) {
  return normalizeSingleLineText(name, 40)
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";
}

function createLegacyCourseId(name, sourceIndex, existingIds) {
  const base = `course-legacy-${slugifyCourseName(name)}-${String(sourceIndex + 1).padStart(3, "0")}`;
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) candidate = `${base}-${suffix++}`;
  existingIds.add(candidate);
  return candidate;
}

function createMergedLegacyCourses(coursePreview, currentCourses = []) {
  const current = Array.isArray(currentCourses) ? currentCourses : [];
  const existingIds = new Set(current.map((item) => String(item?.id || "")).filter(Boolean));
  const nowIso = new Date().toISOString();
  const imported = coursePreview.eligible.map((candidate) => {
    const createdAt = candidate.createdAt || candidate.updatedAt || nowIso;
    const updatedAt = candidate.updatedAt || candidate.createdAt || nowIso;
    return Object.freeze({
      id: createLegacyCourseId(candidate.name, candidate.sourceIndex, existingIds),
      name: candidate.name,
      course: candidate.course,
      createdAt,
      updatedAt,
    });
  });
  return Object.freeze({
    merged: Object.freeze([...current, ...imported]),
    imported: Object.freeze(imported),
  });
}

export function createLegacyDataMigration(gateway) {
  function previewLegacyCourses() {
    return inspectLegacyCoursePresets(
      readLegacyJson(gateway, LEGACY_STORAGE_KEYS.courses, []),
      readLegacyJson(gateway, STORAGE_KEYS.courses, []),
    );
  }

  function preview() {
    const legacySessions = readLegacyJson(gateway, LEGACY_STORAGE_KEYS.sessions, []);
    const convertedRecords = convertLegacyRecords(legacySessions);
    const convertedFeedback = convertLegacyFeedback(
      readLegacyJson(gateway, LEGACY_STORAGE_KEYS.feedback, {}),
      convertedRecords,
    );
    const convertedPlans = convertLegacyPlans(
      readLegacyJson(gateway, LEGACY_STORAGE_KEYS.runPlans, []),
    );
    const profile = readLegacyJson(gateway, LEGACY_STORAGE_KEYS.profile, {});
    const courses = previewLegacyCourses();
    const hasCoreLegacyData = convertedRecords.length > 0
      || convertedFeedback.length > 0
      || convertedPlans.length > 0
      || Object.keys(profile || {}).length > 0;
    return Object.freeze({
      hasLegacyData: hasCoreLegacyData || courses.sourceCount > 0,
      hasCoreLegacyData,
      records: convertedRecords,
      subjectiveFeedback: convertedFeedback,
      plans: convertedPlans,
      profile,
      courses,
      omittedLegacyAreas: Object.freeze([
        "以前の記録ノートは現在の記録ノートと役割が異なるため自動変換しない",
        "以前の画面状態は現在の画面構造へ移行しない",
        "以前の研究用・個人差学習状態は実装アプリの初期移行対象にしない",
      ]),
    });
  }

  function migrateCourses() {
    const coursePreview = previewLegacyCourses();
    if (!coursePreview.eligibleCount) {
      return {
        ok: true,
        migrated: false,
        reason: coursePreview.sourceCount ? "NO_ELIGIBLE_LEGACY_COURSES" : "NO_LEGACY_COURSES",
        counts: { courses: 0, rejectedCourses: coursePreview.rejectedCount },
        coursePreview,
      };
    }
    const currentCourses = readLegacyJson(gateway, STORAGE_KEYS.courses, []);
    const merged = createMergedLegacyCourses(coursePreview, currentCourses);
    const result = gateway.transact([
      { key: STORAGE_KEYS.legacyImportBackup, value: buildLegacyRawBackup(gateway) },
      { key: STORAGE_KEYS.courses, value: merged.merged },
    ]);
    return {
      ...result,
      migrated: result.ok,
      counts: {
        courses: result.ok ? merged.imported.length : 0,
        rejectedCourses: coursePreview.rejectedCount,
      },
      importedCourses: result.ok ? merged.imported : [],
      coursePreview,
    };
  }

  function migrate(options = {}) {
    const migrationPreview = preview();
    if (!migrationPreview.hasLegacyData) {
      return { ok: true, migrated: false, reason: "NO_LEGACY_DATA" };
    }
    const newDataExists = [
      STORAGE_KEYS.records,
      STORAGE_KEYS.subjectiveFeedback,
      STORAGE_KEYS.plans,
      STORAGE_KEYS.profile,
    ].some((key) => gateway.contains(key));
    if (newDataExists && options.overwrite !== true) {
      return { ok: false, migrated: false, code: "NEW_DATA_ALREADY_EXISTS" };
    }

    const currentCourses = readLegacyJson(gateway, STORAGE_KEYS.courses, []);
    const mergedCourses = createMergedLegacyCourses(migrationPreview.courses, currentCourses);
    const changes = [
      { key: STORAGE_KEYS.legacyImportBackup, value: buildLegacyRawBackup(gateway) },
      { key: STORAGE_KEYS.records, value: migrationPreview.records },
      { key: STORAGE_KEYS.subjectiveFeedback, value: migrationPreview.subjectiveFeedback },
      { key: STORAGE_KEYS.plans, value: migrationPreview.plans },
      { key: STORAGE_KEYS.profile, value: migrationPreview.profile },
    ];
    if (mergedCourses.imported.length) changes.push({ key: STORAGE_KEYS.courses, value: mergedCourses.merged });
    const result = gateway.transact(changes);
    return {
      ...result,
      migrated: result.ok,
      counts: {
        records: migrationPreview.records.length,
        subjectiveFeedback: migrationPreview.subjectiveFeedback.length,
        plans: migrationPreview.plans.length,
        courses: result.ok ? mergedCourses.imported.length : 0,
        rejectedCourses: migrationPreview.courses.rejectedCount,
      },
      omittedLegacyAreas: migrationPreview.omittedLegacyAreas,
    };
  }

  return Object.freeze({ preview, previewLegacyCourses, migrate, migrateCourses });
}
