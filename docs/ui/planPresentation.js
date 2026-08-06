import { normalizeV27PlanSession } from "../core/planning/planPreviewV27.js";
import { formatNumber } from "./recordPresentation.js";

const CONDITION_DEFINITIONS = Object.freeze([
  Object.freeze({ key: "distance", label: "距離" }),
  Object.freeze({ key: "duration", label: "実走予定時間" }),
  Object.freeze({ key: "runningFormat", label: "走行形式" }),
  Object.freeze({ key: "courseName", label: "コース名" }),
  Object.freeze({ key: "grade", label: "坂道" }),
  Object.freeze({ key: "surface", label: "路面" }),
]);

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function optionalFiniteNumber(value) {
  return hasFiniteValue(value) ? Number(value) : null;
}

function runningFormatLabel(value) {
  return {
    CONTINUOUS_RUN: "途中で歩かず走る予定",
    RUN_WALK: "走りと歩きを混ぜる予定",
    UNKNOWN: "未設定",
  }[value] || "未設定";
}

function gradeLabel(course = {}) {
  if (course.gradeKnowledge === "KNOWN_FLAT") return "平坦と把握";
  if (course.gradeKnowledge !== "KNOWN_PROFILE") return "不明";
  const values = [];
  if (Number(course.upPercent || 0) > 0) {
    values.push(`上り${formatNumber(course.upPercent, 1)}%区間・勾配${formatNumber(course.upGradePercent, 1)}%`);
  }
  if (Number(course.downPercent || 0) > 0) {
    values.push(`下り${formatNumber(course.downPercent, 1)}%区間・勾配${formatNumber(course.downGradePercent, 1)}%`);
  }
  const flat = 100 - Number(course.upPercent || 0) - Number(course.downPercent || 0);
  if (flat > 0) values.unshift(`平坦${formatNumber(flat, 1)}%区間`);
  return values.join("・") || "把握済みプロファイル";
}

function surfaceLabel(value) {
  return {
    REF_HARD_EVEN_STABLE: "硬く平らで安定した基準路面",
    DRY_STABLE_GRASS_TURF: "乾いた安定した天然芝・人工芝",
    DEEP_DRY_SOFT_SAND: "深く乾いた柔らかい砂",
    EXPLICIT_UNEVEN: "明確な凹凸・不整地（説明のみ）",
    KNOWN_OTHER: "把握済み・記録のみ",
    UNKNOWN: "不明",
  }[value] || "不明";
}

function conditionValues(session = {}) {
  const normalized = normalizeV27PlanSession(session);
  if (normalized.activityType === "rest") {
    return Object.freeze({
      distance: "—",
      duration: "—",
      runningFormat: "—",
      courseName: "休養",
      grade: "—",
      surface: "—",
    });
  }
  return Object.freeze({
    distance: normalized.distanceKm > 0
      ? `${formatNumber(normalized.distanceKm, 2)} km`
      : "未入力",
    duration: normalized.durationMinutes > 0
      ? `${formatNumber(normalized.durationMinutes, 1)} 分`
      : "未入力",
    runningFormat: runningFormatLabel(normalized.runningFormat),
    courseName: normalized.course.name || "未設定",
    grade: gradeLabel(normalized.course),
    surface: surfaceLabel(normalized.course.modelSurfaceClass),
  });
}

function rawConditionValues(session = {}) {
  const normalized = normalizeV27PlanSession(session);
  if (normalized.activityType === "rest") {
    return Object.freeze(Object.fromEntries(
      CONDITION_DEFINITIONS.map(({ key }) => [key, "rest"]),
    ));
  }
  return Object.freeze({
    distance: normalized.distanceKm,
    duration: normalized.durationMinutes,
    runningFormat: normalized.runningFormat,
    courseName: normalized.course.name,
    grade: [
      normalized.course.gradeKnowledge,
      normalized.course.upPercent,
      normalized.course.upGradePercent,
      normalized.course.downPercent,
      normalized.course.downGradePercent,
    ].join(":"),
    surface: normalized.course.modelSurfaceClass,
  });
}

function equalValue(left, right) {
  if (typeof left === "number" || typeof right === "number") {
    return Math.abs(Number(left || 0) - Number(right || 0)) < 1e-9;
  }
  return String(left ?? "") === String(right ?? "");
}

export function normalizePlanSession(session = {}) {
  return normalizeV27PlanSession(session);
}

export function buildPlanModelSession(session = {}) {
  return normalizeV27PlanSession(session);
}

export function describePlanModelAssumptions(session = {}) {
  const normalized = normalizeV27PlanSession(session);
  if (normalized.activityType === "rest") {
    return "休養予定には走行による推定値を作成しません。";
  }
  return "予定で分かる距離・時間・坂道・路面を記録します。分からない内容は、分からないまま残します。";
}

export function buildPlanReference(sourceExperience = null) {
  const record = sourceExperience?.record;
  const resultRecord = sourceExperience?.v27ResultRecord;
  if (!record?.id) {
    return Object.freeze({
      hasReference: false,
      recordId: "",
      date: "",
      session: null,
      totalLoad: null,
      modelVersion: "",
    });
  }
  return Object.freeze({
    hasReference: true,
    recordId: String(record.id),
    date: String(record.date || ""),
    session: normalizeV27PlanSession(record),
    totalLoad: resultRecord?.state === "RUN"
      ? optionalFiniteNumber(resultRecord.result?.total?.central_points)
      : null,
    modelVersion: resultRecord?.model_version || "",
  });
}

export function describeTotalDifference(currentTotal, referenceTotal) {
  const current = optionalFiniteNumber(currentTotal);
  const reference = optionalFiniteNumber(referenceTotal);
  if (current == null) return Object.freeze({ kind: "unavailable", label: "入力条件を確認" });
  if (reference == null) return Object.freeze({ kind: "unavailable", label: "比較用推定値の基準なし" });
  const difference = current - reference;
  if (Math.abs(difference) < 0.05) return Object.freeze({ kind: "same", label: "基準と同じ" });
  return Object.freeze({
    kind: "changed",
    label: difference > 0
      ? `基準より +${formatNumber(difference, 1)}`
      : `基準より −${formatNumber(Math.abs(difference), 1)}`,
  });
}

export const describeModelTotalDifference = describeTotalDifference;

export function describePlanComparisonForUser(preview = {}, differenceLabel = "") {
  if (preview?.state === "REST") return "休養予定は走行値なし（良否の評価ではありません）";
  if (!preview?.ok) return "入力条件を確認";
  const label = String(differenceLabel || "").trim();
  if (!label || label === "入力条件を確認") return "予定条件から表示（良否を示しません）";
  if (label === "比較用推定値の基準なし") return "比較できる基準値なし";
  if (label === "基準と同じ") return "基準記録と同じ（良否を示しません）";
  return `${label}（良否を示しません）`;
}

export function buildPlanConditionSnapshot(session = {}, {
  referenceSession = null,
  totalLoad = null,
  referenceTotal = null,
} = {}) {
  const normalized = normalizeV27PlanSession(session);
  const displayValues = conditionValues(normalized);
  const rawValues = rawConditionValues(normalized);
  const referenceDisplay = referenceSession ? conditionValues(referenceSession) : null;
  const referenceRaw = referenceSession ? rawConditionValues(referenceSession) : null;
  const rows = CONDITION_DEFINITIONS.map(({ key, label }) => Object.freeze({
    key,
    label,
    value: displayValues[key],
    referenceValue: referenceDisplay?.[key] ?? "基準なし",
    comparison: referenceRaw
      ? equalValue(rawValues[key], referenceRaw[key]) ? "same" : "changed"
      : "unavailable",
  }));
  return Object.freeze({
    activityType: normalized.activityType,
    rows: Object.freeze(rows),
    changedCount: rows.filter((row) => row.comparison === "changed").length,
    totalLoad: optionalFiniteNumber(totalLoad),
    totalDifference: describeTotalDifference(totalLoad, referenceTotal),
  });
}

export function serializePlanReference(reference = {}) {
  return JSON.stringify({
    hasReference: Boolean(reference.hasReference),
    totalLoad: optionalFiniteNumber(reference.totalLoad),
    modelVersion: String(reference.modelVersion || ""),
    session: reference.session || null,
  });
}

export function parsePlanReference(serialized = "") {
  try {
    const value = JSON.parse(String(serialized || "{}"));
    return Object.freeze({
      hasReference: Boolean(value?.hasReference),
      totalLoad: optionalFiniteNumber(value?.totalLoad),
      modelVersion: String(value?.modelVersion || ""),
      session: value?.session ? normalizeV27PlanSession(value.session) : null,
    });
  } catch {
    return Object.freeze({
      hasReference: false,
      totalLoad: null,
      modelVersion: "",
      session: null,
    });
  }
}
