import { normalizePlainText, normalizeSingleLineText } from "../safety/inputSafety.js";

export const PERSONAL_CONTEXT_SCHEMA_VERSION = 1;

export const SHOE_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "usual_training", label: "いつもの練習用" }),
  Object.freeze({ value: "soft", label: "やわらかめ" }),
  Object.freeze({ value: "light", label: "軽め" }),
  Object.freeze({ value: "race", label: "レース用" }),
  Object.freeze({ value: "trail", label: "山道・不整地向け" }),
  Object.freeze({ value: "other", label: "その他" }),
]);

export const SHOE_SOFTNESS_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "soft", label: "やわらかめ" }),
  Object.freeze({ value: "normal", label: "ふつう" }),
  Object.freeze({ value: "firm", label: "かため" }),
  Object.freeze({ value: "unknown", label: "わからない" }),
]);

export const FOOT_PLACEMENT_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "unknown", label: "よくわからない" }),
  Object.freeze({ value: "heel", label: "かかとからついた感じ" }),
  Object.freeze({ value: "full_sole", label: "足裏全体でついた感じ" }),
  Object.freeze({ value: "forefoot", label: "つま先寄りでついた感じ" }),
  Object.freeze({ value: "varies", label: "日によって違う" }),
]);

export const RHYTHM_STRIDE_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: "未設定" }),
  Object.freeze({ value: "usual", label: "いつも通り" }),
  Object.freeze({ value: "small_step", label: "歩幅を小さくした" }),
  Object.freeze({ value: "rhythm_focus", label: "テンポよく足を動かした" }),
  Object.freeze({ value: "long_step", label: "歩幅を大きくした" }),
  Object.freeze({ value: "unknown", label: "よくわからない" }),
]);


export const EQUIPMENT_TAG_OPTIONS = Object.freeze([
  Object.freeze({ value: "phone", label: "スマートフォン" }),
  Object.freeze({ value: "watch", label: "ランニングウォッチ" }),
  Object.freeze({ value: "bottle", label: "ボトル・給水" }),
  Object.freeze({ value: "bag", label: "バッグ・ポーチ" }),
  Object.freeze({ value: "support", label: "サポーター等" }),
  Object.freeze({ value: "other", label: "その他" }),
]);

export const FOCUS_TAG_OPTIONS = Object.freeze([
  Object.freeze({ value: "relax", label: "力を抜いた" }),
  Object.freeze({ value: "small_step", label: "歩幅を小さくした" }),
  Object.freeze({ value: "rhythm", label: "テンポよく足を動かした" }),
  Object.freeze({ value: "posture", label: "背すじを起こした" }),
  Object.freeze({ value: "quiet_landing", label: "足音を小さくした" }),
  Object.freeze({ value: "uphill_easy", label: "上りで無理しなかった" }),
  Object.freeze({ value: "downhill_slow", label: "下りをゆっくり走った" }),
]);

function allowedValue(value, options) {
  const text = normalizeSingleLineText(value, 80);
  return options.some((option) => option.value === text) ? text : "";
}

function normalizeTagList(value, options) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  const allowed = new Set(options.map((option) => option.value));
  return Object.freeze(Array.from(new Set(source
    .map((item) => normalizeSingleLineText(item, 40))
    .filter((item) => allowed.has(item)))));
}

function normalizeFocusTags(value) {
  return normalizeTagList(value, FOCUS_TAG_OPTIONS);
}

export function hasPersonalContextInput(context = {}) {
  if (!context || typeof context !== "object") return false;
  return Boolean(
    context.shoeId
    || context.shoeLabel
    || context.shoeType
    || context.shoeSoftness
    || context.footPlacement
    || context.rhythmStride
    || (Array.isArray(context.focusTags) && context.focusTags.length)
    || (Array.isArray(context.equipmentTags) && context.equipmentTags.length)
    || context.equipmentNote
    || context.freeNote,
  );
}

export function normalizePersonalContext(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const normalized = Object.freeze({
    schemaVersion: PERSONAL_CONTEXT_SCHEMA_VERSION,
    shoeId: normalizeSingleLineText(source.shoeId, 100),
    shoeLabel: normalizeSingleLineText(source.shoeLabel, 80),
    shoeType: allowedValue(source.shoeType, SHOE_TYPE_OPTIONS),
    shoeSoftness: allowedValue(source.shoeSoftness, SHOE_SOFTNESS_OPTIONS),
    footPlacement: allowedValue(source.footPlacement, FOOT_PLACEMENT_OPTIONS),
    rhythmStride: allowedValue(source.rhythmStride, RHYTHM_STRIDE_OPTIONS),
    focusTags: normalizeFocusTags(source.focusTags),
    equipmentTags: normalizeTagList(source.equipmentTags, EQUIPMENT_TAG_OPTIONS),
    equipmentNote: normalizePlainText(source.equipmentNote, 240),
    freeNote: normalizePlainText(source.freeNote, 240),
  });
  return hasPersonalContextInput(normalized) ? normalized : null;
}

export function labelForOption(value, options) {
  return options.find((option) => option.value === value)?.label || "";
}

export function summarizePersonalContext(context = {}) {
  const normalized = normalizePersonalContext(context);
  if (!normalized) {
    return Object.freeze({ hasInput: false, label: "未入力", description: "今日のシューズ・走り方は未入力です。", items: [] });
  }
  const items = [];
  if (normalized.shoeLabel) items.push(`シューズ：${normalized.shoeLabel}`);
  else if (normalized.shoeType) items.push(`シューズ：${labelForOption(normalized.shoeType, SHOE_TYPE_OPTIONS)}`);
  if (normalized.shoeSoftness) items.push(`やわらかさ：${labelForOption(normalized.shoeSoftness, SHOE_SOFTNESS_OPTIONS)}`);
  if (normalized.footPlacement) items.push(`足のつき方：${labelForOption(normalized.footPlacement, FOOT_PLACEMENT_OPTIONS)}`);
  if (normalized.rhythmStride) items.push(`歩幅・テンポ：${labelForOption(normalized.rhythmStride, RHYTHM_STRIDE_OPTIONS)}`);
  if (normalized.focusTags.length) {
    const labels = normalized.focusTags.map((tag) => FOCUS_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag);
    items.push(`今日やったこと：${labels.join("、")}`);
  }
  if (normalized.equipmentTags.length) {
    const labels = normalized.equipmentTags.map((tag) => EQUIPMENT_TAG_OPTIONS.find((option) => option.value === tag)?.label || tag);
    items.push(`装備：${labels.join("、")}`);
  }
  if (normalized.equipmentNote) items.push("装備メモあり");
  if (normalized.freeNote) items.push("走り方メモあり");
  return Object.freeze({
    hasInput: true,
    label: "入力あり",
    description: items.slice(0, 3).join("・") + (items.length > 3 ? ` ほか${items.length - 3}件` : ""),
    items,
  });
}
