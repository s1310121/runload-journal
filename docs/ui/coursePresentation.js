import { SURFACE_FIELDS } from "../core/model/modelConstants.js";
import { escapeHtml } from "./commonComponents.js";

export function primarySurfaceSummary(course = {}) {
  const nonZero = SURFACE_FIELDS
    .map(({ recordKey, label }) => ({ label, value: Number(course?.[recordKey] || 0) }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
  if (!nonZero.length) return "路面割合は未記録";
  return nonZero.slice(0, 3).map((item) => `${item.label}${item.value}%`).join("・");
}

export function slopeSummary(course = {}) {
  const knowledge = String(course.gradeKnowledge || "UNKNOWN");
  if (knowledge === "UNKNOWN") return "勾配不明";
  if (knowledge === "KNOWN_FLAT") return "平坦と記録";
  const uphill = Number(course.upPercent || 0) > 0
    ? `上り ${Number(course.upPercent || 0)}%・勾配${Number(course.upGradePercent || 0)}%`
    : "上りなし";
  const downhill = Number(course.downPercent || 0) > 0
    ? `下り ${Number(course.downPercent || 0)}%・勾配${Number(course.downGradePercent || 0)}%`
    : "下りなし";
  return `${uphill} ／ ${downhill}`;
}

export function surfaceModelSummary(course = {}) {
  const labels = {
    REF_HARD_EVEN_STABLE: "硬く平らで安定（結果に使用）",
    DRY_STABLE_GRASS_TURF: "乾いた安定した芝・ターフ（確認できる範囲で使用）",
    DEEP_DRY_SOFT_SAND: "深く乾いた柔らかい砂（確認できる範囲で使用）",
    EXPLICIT_UNEVEN: "明確な凹凸あり（説明のみ）",
    KNOWN_OTHER: "把握済み・上記以外（説明のみ）",
    UNKNOWN: "路面不明",
  };
  return labels[String(course.modelSurfaceClass || "UNKNOWN")] || labels.UNKNOWN;
}


export function surfaceInputSummary(course = {}) {
  const mode = String(course.surfaceInputMode || "").toUpperCase();
  if (mode === "MIXED") return "複数路面の割合";
  if (mode === "SINGLE") return "主な路面1種類";
  return SURFACE_FIELDS.some(({ recordKey }) => Number(course?.[recordKey] || 0) > 0) ? "路面材質を記録" : "路面は未入力";
}

export function courseSummaryText(course = {}) {
  const name = String(course.name || "コース名なし");
  return `${name}。${primarySurfaceSummary(course)}。${slopeSummary(course)}。${surfaceInputSummary(course)}。`;
}

export function renderCourseSummary(course = {}, { headingLevel = 3, compact = false, headingId = "" } = {}) {
  const Heading = `h${Math.min(6, Math.max(2, Number(headingLevel) || 3))}`;
  return `<div class="course-summary${compact ? " course-summary--compact" : ""}">
    <${Heading}${headingId ? ` id="${escapeHtml(headingId)}"` : ""}>${escapeHtml(course.name || "コース名なし")}</${Heading}>
    <p><strong>主な路面：</strong>${escapeHtml(primarySurfaceSummary(course))}</p>
    <p><strong>坂道：</strong>${escapeHtml(slopeSummary(course))}</p>
    <p><strong>入力方法：</strong>${escapeHtml(surfaceInputSummary(course))}</p>
  </div>`;
}
