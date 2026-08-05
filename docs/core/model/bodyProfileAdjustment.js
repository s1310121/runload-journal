import { clampNumber, toFiniteNumber } from "./numberUtilities.js";

// The filename is retained for import compatibility with older app code.
// Current profile data is context-only. It does not create a body-size
// coefficient for Regional A4 or V2.7.
export const PERSONAL_PROFILE_SCHEMA_VERSION = 2;
export const PERSONAL_PROFILE_NUMERIC_USE = "CONTEXT_ONLY_NO_A4_OR_V27_COEFFICIENT";

export const PROFILE_AGE_BAND_OPTIONS = Object.freeze([
  Object.freeze({ key: "18-29", label: "18〜29歳", minAge: 18, maxAge: 29 }),
  Object.freeze({ key: "30-49", label: "30〜49歳", minAge: 30, maxAge: 49 }),
  Object.freeze({ key: "50-64", label: "50〜64歳", minAge: 50, maxAge: 64 }),
  Object.freeze({ key: "65-74", label: "65〜74歳", minAge: 65, maxAge: 74 }),
  Object.freeze({ key: "75+", label: "75歳以上", minAge: 75, maxAge: 130 }),
]);

export function normalizeSex(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (["male", "m", "man", "男性", "男"].includes(text)) return "male";
  if (["female", "f", "woman", "女性", "女"].includes(text)) return "female";
  return "";
}

export function normalizeAgeBand(value = "") {
  const text = String(value || "").trim();
  if (PROFILE_AGE_BAND_OPTIONS.some((item) => item.key === text)) return text;
  if (!text) return "";
  const age = Number(text);
  if (!Number.isFinite(age)) return "";
  return PROFILE_AGE_BAND_OPTIONS.find(
    (item) => age >= item.minAge && age <= item.maxAge,
  )?.key || "";
}

export function getAgeBandMetadata(ageBand = "") {
  const normalizedAgeBand = normalizeAgeBand(ageBand);
  return PROFILE_AGE_BAND_OPTIONS.find((item) => item.key === normalizedAgeBand) || null;
}

function normalizedOptionalNumber(value, min, max) {
  const number = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(number)
    ? Number(clampNumber(number, min, max).toFixed(1))
    : "";
}

export function normalizeBodyProfile(rawProfile = {}) {
  const source = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  const heightValue = source.heightCm ?? source.profile_height_cm ?? source.height_cm;
  const weightValue = source.weightKg ?? source.profile_weight_kg ?? source.weight_kg;
  const goals = Array.isArray(source.runningGoalTags)
    ? source.runningGoalTags
    : String(source.runningGoalTags || "").split(",");
  return Object.freeze({
    schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION,
    numericUse: PERSONAL_PROFILE_NUMERIC_USE,
    sex: normalizeSex(source.sex || source.profile_sex || ""),
    ageBand: normalizeAgeBand(source.ageBand || source.profile_age_band || ""),
    heightCm: normalizedOptionalNumber(heightValue, 100, 230),
    weightKg: normalizedOptionalNumber(weightValue, 25, 180),
    runningStartDateOrBand: String(source.runningStartDateOrBand || "").trim().slice(0, 80),
    experienceSelfAssessment: String(source.experienceSelfAssessment || "").trim().slice(0, 80),
    runningGoalTags: Object.freeze([...new Set(goals
      .map((item) => String(item || "").trim().slice(0, 80))
      .filter(Boolean))]),
    updatedAt: String(source.updatedAt || source.profile_updated_at || "").slice(0, 50),
  });
}

// Kept as a compatibility API so older callers do not fail. Current code must
// receive a neutral factor. Existing legacy record snapshots are read only by
// getBodyWeightFactorFromRecord below.
export function calculateBodyWeightAdjustment(rawProfile = {}) {
  const profile = normalizeBodyProfile(rawProfile);
  return Object.freeze({
    ready: false,
    profile,
    reference: null,
    referenceWeightKg: "",
    bodyWeightRatio: 1,
    bodyWeightFactor: 1,
    rawBodyWeightFactor: 1,
    formulaVersion: "disabled-current-profile-boundary-v1",
    sourceName: "",
    sourceYear: "",
    legacyCalculationDisabled: true,
    message: "プロフィールは見返し・相談・比較条件の文脈に使い、現行の数値計算には使いません。",
  });
}

export function createBodyProfileSnapshot(rawProfile = {}, recordedAt = new Date().toISOString()) {
  const profile = normalizeBodyProfile(rawProfile);
  return Object.freeze({
    schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION,
    numericUse: PERSONAL_PROFILE_NUMERIC_USE,
    sex: profile.sex || "",
    ageBand: profile.ageBand || "",
    heightCm: profile.heightCm || "",
    weightKg: profile.weightKg || "",
    runningStartDateOrBand: profile.runningStartDateOrBand || "",
    experienceSelfAssessment: profile.experienceSelfAssessment || "",
    runningGoalTags: Object.freeze([...(profile.runningGoalTags || [])]),
    recordedAt,
  });
}

export function getBodyWeightFactorFromRecord(record = {}) {
  const snapshot = record.bodyProfileSnapshot || {};
  if (
    snapshot.numericUse === PERSONAL_PROFILE_NUMERIC_USE
    || Number(snapshot.schemaVersion || 0) >= PERSONAL_PROFILE_SCHEMA_VERSION
  ) return 1;

  // Compatibility path for records created by the retired legacy model.
  // This value is never generated for a current profile snapshot.
  const candidate = snapshot.bodyWeightFactor ?? record.body_weight_factor;
  const factor = toFiniteNumber(candidate, Number.NaN);
  return Number.isFinite(factor) && factor > 0 ? factor : 1;
}
