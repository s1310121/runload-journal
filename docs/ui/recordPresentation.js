import { BODY_PARTS, BODY_PART_KEYS, SURFACE_FIELDS } from "../core/model/modelConstants.js";

export const BODY_PART_DISPLAY_NAMES = Object.freeze({
  "腰骨盤部": "骨盤まわり（腰を含む）",
  "股関節臀部": "殿部（お尻まわり）",
  "大腿": "大腿部（太もも）",
  "膝": "膝まわり",
  "前下腿": "下腿前面（すね）",
  "後下腿": "下腿後面（ふくらはぎ）",
  "アキレス腱": "アキレス腱",
  "足底部": "足底部（足裏）",
  "足関節・足背部": "足関節・足背部（足首・足の甲）",
});

export const SUBJECTIVE_STATUS_LABELS = Object.freeze({
  not_asked: "まだ確認していない",
  deferred: "未確認",
  none_reported: "身体記録なし",
  fatigue_reported: "疲れ・だるさを記録",
  discomfort_reported: "気になる部位を記録",
  strong_reported: "相談したい内容を記録",
});

export const SUPPORT_ROUTE_LABELS = Object.freeze({
  normal: "通常の振り返り",
  review: "本人入力を確認",
  consult: "相談準備を優先",
  urgent: "公的な相談先を確認",
});

export const SAFETY_FLAG_LABELS = Object.freeze({
  severePain: "強い痛み",
  significantSwelling: "目立つ腫れ",
  cannotBearWeight: "体重をかけられない",
  movementDifficulty: "動かしにくい・歩きにくい",
  numbnessOrWeakness: "しびれ・力が入りにくい",
  coldPaleBlueLimb: "手足が冷たい・白い・青い",
  deformityOrMajorTrauma: "変形または大きな外傷",
  painAtRestOrNight: "安静時または夜間の痛み",
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "強い息苦しさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "大量の出血",
});

export function formatLocalDate(dateText = "") {
  const match = String(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateText || "日付なし";
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

export function formatNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatActivitySummary(record = {}) {
  if (record.activityType === "rest") return "休養を記録";
  const items = [];
  if (Number(record.distanceKm) > 0) items.push(`${formatNumber(record.distanceKm, 2)}km`);
  if (Number(record.durationMinutes) > 0) items.push(`${formatNumber(record.durationMinutes, 0)}分`);
  if (Number(record.steps) > 0) items.push(`${formatNumber(record.steps, 0)}歩`);
  return items.length ? items.join("・") : "走行を記録";
}

export function getActiveSurfaceLabels(record = {}) {
  return SURFACE_FIELDS
    .map(({ recordKey, label }) => ({ label, value: Number(record.course?.[recordKey] || 0) }))
    .filter((item) => item.value > 0)
    .map((item) => `${item.label} ${formatNumber(item.value, 0)}%`);
}

export function getEnteredBodyParts(feedback = {}) {
  return BODY_PARTS.filter((bodyPart) => (
    Number(feedback?.fatigueByBodyPart?.[bodyPart] || 0) > 0
    || Number(feedback?.discomfortByBodyPart?.[bodyPart] || 0) > 0
    || Boolean(feedback?.reviewedBodyParts?.[bodyPart])
  ));
}

export function getEnteredBodyAreaObservations(feedback = {}) {
  return Array.isArray(feedback?.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => item && item.areaId)
    : [];
}

export function createNeutralResultSummary(experience = {}) {
  const { record = {}, feedback = {} } = experience;
  const activity = formatActivitySummary(record);
  const subjectiveLabel = SUBJECTIVE_STATUS_LABELS[feedback?.checkStatus] || "本人の身体記録は未確認";
  if (record.activityType === "rest") {
    return `${activity}しました。本人の身体記録は「${subjectiveLabel}」として保存されています。休養日には走行による推定値を作成しません。`;
  }
  const resultRecord = experience.v27ResultRecord;
  if (resultRecord?.state === "RUN") {
    const total = resultRecord.result?.total?.central_points;
    return `${activity}しました。走行全体の比較用推定値は${formatNumber(total, 1)}推定ポイントです。部位ごとの負荷傾向指数は、結果画面で全12部位を確認できます。本人の身体記録は「${subjectiveLabel}」として別に保存されています。`;
  }
  return `${activity}しました。この保存記録では一部の比較表示を利用できません。本人の身体記録は「${subjectiveLabel}」として保存されています。`;
}

export function bodyPartKey(bodyPart) {
  return BODY_PART_KEYS[bodyPart] || "unknownBodyPart";
}

export { BODY_PARTS, SURFACE_FIELDS };
