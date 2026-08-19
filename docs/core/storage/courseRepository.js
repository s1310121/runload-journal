import { SURFACE_FIELDS } from "../model/modelConstants.js";
import { normalizeSingleLineText } from "../safety/inputSafety.js";
import { createCollectionRepository } from "./collectionRepository.js";
import { STORAGE_KEYS } from "./storageKeys.js";

export const COURSE_NUMERIC_FIELDS = Object.freeze([
  "upPercent", "downPercent", "upGradePercent", "downGradePercent",
  ...SURFACE_FIELDS.map(({ recordKey }) => recordKey),
]);

const GRADE_INPUT_MODES = new Set(["UNKNOWN", "FLAT", "SUMMARY", "SECTIONS"]);
const SURFACE_INPUT_MODES = new Set(["UNKNOWN", "SINGLE", "MIXED"]);
const GRADE_DIRECTIONS = new Set(["UPHILL", "DOWNHILL", "FLAT", "UNKNOWN"]);
const ROUTE_PATTERNS = new Set(["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED", "UNKNOWN"]);
const SURFACE_CLASSES = new Set([
  "REF_HARD_EVEN_STABLE",
  "DRY_STABLE_GRASS_TURF",
  "DEEP_DRY_SOFT_SAND",
  "EXPLICIT_UNEVEN",
  "KNOWN_OTHER",
  "UNKNOWN",
]);

function boundedNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number;
}

function normalizedGradeInputMode(course = {}) {
  const explicit = String(course?.gradeInputMode || "").toUpperCase();
  if (GRADE_INPUT_MODES.has(explicit)) return explicit;
  if (Array.isArray(course?.sections) && course.sections.length) return "SECTIONS";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_FLAT") return "FLAT";
  if (String(course?.gradeKnowledge || "").toUpperCase() === "KNOWN_PROFILE") return "SUMMARY";
  return "UNKNOWN";
}

function normalizedSurfaceInputMode(course = {}) {
  const explicit = String(course?.surfaceInputMode || "").toUpperCase();
  if (SURFACE_INPUT_MODES.has(explicit)) return explicit;
  const positive = SURFACE_FIELDS.filter(({ recordKey }) => Number(course?.[recordKey] || 0) > 0);
  if (!positive.length) return "UNKNOWN";
  if (positive.length === 1 && Math.abs(Number(course?.[positive[0].recordKey] || 0) - 100) <= 0.01) return "SINGLE";
  return "MIXED";
}

function normalizeSections(sections = []) {
  if (!Array.isArray(sections)) return Object.freeze([]);
  return Object.freeze(sections.flatMap((item = {}, index) => {
    const sharePercent = boundedNumber(item.sharePercent ?? item.share_pct ?? item.shareValue);
    const rawDirection = String(item.gradeDirection || "").toUpperCase();
    const rawGrade = boundedNumber(item.gradePercent ?? item.grade_pct);
    const gradeDirection = GRADE_DIRECTIONS.has(rawDirection)
      ? rawDirection
      : rawGrade > 0
        ? "UPHILL"
        : rawGrade < 0
          ? "DOWNHILL"
          : "FLAT";
    const gradePercent = gradeDirection === "FLAT" ? 0 : Math.abs(rawGrade);
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sectionId: normalizeSingleLineText(item.sectionId, 80) || `section-${index + 1}`,
      sharePercent,
      distanceKm: Number(item.distanceKm) > 0 ? Number(item.distanceKm) : null,
      durationMinutes: Number(item.durationMinutes) > 0 ? Number(item.durationMinutes) : null,
      steps: item.steps != null && Number.isInteger(Number(item.steps)) && Number(item.steps) >= 0 ? Number(item.steps) : null,
      speedMps: Number(item.speedMps) > 0 ? Number(item.speedMps) : null,
      cadenceSpm: Number(item.cadenceSpm) > 0 ? Number(item.cadenceSpm) : null,
      gradeDirection,
      gradePercent,
    })];
  }));
}

function normalizeSurfaceProfile(profile = []) {
  if (!Array.isArray(profile)) return Object.freeze([]);
  return Object.freeze(profile.flatMap((item = {}) => {
    const sharePercent = boundedNumber(item.sharePercent ?? item.share_pct);
    const surfaceClass = String(item.surfaceClass || item.surface_class || "UNKNOWN").toUpperCase();
    if (!(sharePercent > 0)) return [];
    return [Object.freeze({
      sharePercent,
      surfaceClass: SURFACE_CLASSES.has(surfaceClass) ? surfaceClass : "UNKNOWN",
    })];
  }));
}

export function normalizeCourseFields(course = {}) {
  const gradeInputMode = normalizedGradeInputMode(course);
  const surfaceInputMode = normalizedSurfaceInputMode(course);
  const gradeKnowledge = gradeInputMode === "FLAT"
    ? "KNOWN_FLAT"
    : ["SUMMARY", "SECTIONS"].includes(gradeInputMode)
      ? "KNOWN_PROFILE"
      : "UNKNOWN";
  const modelSurfaceClass = String(course?.modelSurfaceClass || "UNKNOWN").toUpperCase();
  const normalized = {
    name: normalizeSingleLineText(course?.name, 80),
    routePattern: ROUTE_PATTERNS.has(String(course?.routePattern || "UNKNOWN").toUpperCase())
      ? String(course.routePattern || "UNKNOWN").toUpperCase()
      : "UNKNOWN",
    gradeInputMode,
    surfaceInputMode,
    gradeKnowledge,
    upPercent: boundedNumber(course?.upPercent),
    downPercent: boundedNumber(course?.downPercent),
    upGradePercent: boundedNumber(course?.upGradePercent),
    downGradePercent: boundedNumber(course?.downGradePercent),
    modelSurfaceClass: SURFACE_CLASSES.has(modelSurfaceClass) ? modelSurfaceClass : "UNKNOWN",
    modelSurfaceProfile: normalizeSurfaceProfile(course?.modelSurfaceProfile),
    sections: normalizeSections(course?.sections),
  };
  SURFACE_FIELDS.forEach(({ recordKey }) => {
    normalized[recordKey] = boundedNumber(course?.[recordKey] ?? 0);
  });
  return Object.freeze(normalized);
}

function validateSections(sections = []) {
  if (!sections.length) return { ok: false, code: "COURSE_SECTION_REQUIRED", message: "区間入力では、少なくとも1区間の割合を入力してください。" };
  const invalid = sections.some((section) => (
    !Number.isFinite(Number(section.sharePercent))
    || Number(section.sharePercent) <= 0
    || Number(section.sharePercent) > 100
    || !GRADE_DIRECTIONS.has(String(section.gradeDirection || "").toUpperCase())
    || !Number.isFinite(Number(section.gradePercent))
    || Number(section.gradePercent) < 0
    || Number(section.gradePercent) > 100
  ));
  if (invalid) return { ok: false, code: "COURSE_SECTION_INVALID", message: "区間の割合と勾配を0〜100の範囲で確認してください。" };
  const total = sections.reduce((sum, section) => sum + Number(section.sharePercent || 0), 0);
  if (Math.abs(total - 100) > 0.01) return { ok: false, code: "COURSE_SECTION_SHARE_INVALID", message: `区間割合の合計を100%にしてください。現在は${total}%です。` };
  const missingGrade = sections.some((section) => (
    ["UPHILL", "DOWNHILL"].includes(section.gradeDirection)
    && !(Number(section.gradePercent) > 0)
  ));
  if (missingGrade) return { ok: false, code: "COURSE_SECTION_GRADE_REQUIRED", message: "上り・下り区間には、正の勾配の大きさを入力してください。" };
  return { ok: true };
}

export function validateCoursePresetInput(course = {}) {
  const normalized = normalizeCourseFields(course);
  if (!normalized.name) {
    return { ok: false, code: "COURSE_NAME_REQUIRED", message: "コース名を入力してください。", course: normalized };
  }
  const numericValues = COURSE_NUMERIC_FIELDS.map((field) => [field, Number(normalized[field] ?? 0)]);
  const invalidNumeric = numericValues.filter(([, value]) => !Number.isFinite(value) || value < 0 || value > 100);
  if (invalidNumeric.length) {
    return {
      ok: false,
      code: "COURSE_NUMERIC_VALUE_INVALID",
      message: "坂道と路面の値は0〜100の範囲で入力してください。",
      details: { fields: invalidNumeric.map(([field]) => field) },
      course: normalized,
    };
  }
  if (normalized.gradeInputMode === "SUMMARY") {
    const up = normalized.upPercent;
    const down = normalized.downPercent;
    if (up + down > 100.01) return { ok: false, code: "COURSE_GRADE_SHARE_INVALID", message: "上り区間と下り区間の合計は100%以下にしてください。", course: normalized };
    if (up > 0 && normalized.upGradePercent <= 0) return { ok: false, code: "COURSE_UP_GRADE_REQUIRED", message: "上り区間がある場合は、正の代表勾配を入力してください。", course: normalized };
    if (down > 0 && normalized.downGradePercent <= 0) return { ok: false, code: "COURSE_DOWN_GRADE_REQUIRED", message: "下り区間がある場合は、代表勾配の大きさを入力してください。", course: normalized };
  }
  if (normalized.gradeInputMode === "SECTIONS") {
    const sectionValidation = validateSections(normalized.sections);
    if (!sectionValidation.ok) return { ...sectionValidation, course: normalized };
  }
  const surfaceTotal = SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + normalized[recordKey], 0);
  if (normalized.surfaceInputMode === "UNKNOWN" && surfaceTotal > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_MODE_CONFLICT", message: "路面を入力した場合は、1種類または複数種類を選んでください。", course: normalized };
  }
  if (normalized.surfaceInputMode !== "UNKNOWN" && Math.abs(surfaceTotal - 100) > 0.01) {
    return { ok: false, code: "COURSE_SURFACE_TOTAL_INVALID", message: `路面割合の合計を100%にしてください。現在は${surfaceTotal}%です。`, course: normalized };
  }
  if (!SURFACE_CLASSES.has(normalized.modelSurfaceClass)) {
    return { ok: false, code: "COURSE_SURFACE_CLASS_INVALID", message: "路面の入力内容を確認してください。", course: normalized };
  }
  return { ok: true, course: normalized };
}

function normalizePreset(item = {}) {
  const course = normalizeCourseFields(item.course || item);
  const id = normalizeSingleLineText(item.id, 120);
  if (!id || !course.name) return null;
  return Object.freeze({
    id,
    name: course.name,
    course,
    createdAt: String(item.createdAt || item.updatedAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
  });
}

function createId(courseName, existingIds, nowIso) {
  const slug = normalizeSingleLineText(courseName, 40)
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";
  const stamp = nowIso.replace(/[^0-9]/g, "").slice(0, 17);
  let candidate = `course-${slug}-${stamp}`;
  let suffix = 2;
  while (existingIds.has(candidate)) candidate = `course-${slug}-${stamp}-${suffix++}`;
  return candidate;
}

export function createCourseRepository(gateway) {
  const repository = createCollectionRepository({
    gateway,
    storageKey: STORAGE_KEYS.courses,
    normalizeItem: normalizePreset,
    sortItems: (items) => [...items].sort((left, right) => left.name.localeCompare(right.name, "ja") || left.id.localeCompare(right.id)),
  });

  function duplicateByName(name, excludingId = "") {
    const normalizedName = normalizeSingleLineText(name, 80).toLocaleLowerCase("ja");
    return repository.loadAll().find((item) => item.id !== excludingId && item.name.toLocaleLowerCase("ja") === normalizedName) || null;
  }

  function create(courseInput) {
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前のコースがあります。保存済みコースを選んで更新するか、別の名前にしてください。", item: null, duplicate };
    const items = repository.loadAll();
    const nowIso = new Date().toISOString();
    const preset = normalizePreset({ id: createId(validation.course.name, new Set(items.map((item) => item.id)), nowIso), course: validation.course, createdAt: nowIso, updatedAt: nowIso });
    return repository.upsert(preset);
  }

  function update(id, courseInput) {
    const current = repository.findById(String(id || ""));
    if (!current) return { ok: false, code: "COURSE_NOT_FOUND", message: "更新するコースを選んでください。", item: null };
    const validation = validateCoursePresetInput(courseInput);
    if (!validation.ok) return { ...validation, item: null };
    const duplicate = duplicateByName(validation.course.name, current.id);
    if (duplicate) return { ok: false, code: "COURSE_NAME_DUPLICATE", message: "同じ名前の別コースがあります。別の名前にしてください。", item: null, duplicate };
    const preset = normalizePreset({ ...current, name: validation.course.name, course: validation.course, updatedAt: new Date().toISOString() });
    return repository.upsert(preset);
  }

  return Object.freeze({
    loadAll: repository.loadAll,
    loadAllResult: repository.loadAllResult,
    findById: repository.findById,
    create,
    update,
    removeById: repository.removeById,
    clear: () => gateway.remove(STORAGE_KEYS.courses),
  });
}
