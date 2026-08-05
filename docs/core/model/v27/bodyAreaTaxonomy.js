export const BODY_AREA_GROUPS = Object.freeze([
  Object.freeze({ id: "TRUNK", label: "頭・体幹" }),
  Object.freeze({ id: "UPPER_LIMB", label: "上肢" }),
  Object.freeze({ id: "HIP_THIGH", label: "股関節・大腿" }),
  Object.freeze({ id: "KNEE_LOWER_LEG", label: "膝・下腿・足関節" }),
  Object.freeze({ id: "FOOT", label: "足部" }),
]);

export const BODY_AREA_LATERALITY = Object.freeze({
  unknown: "UNKNOWN",
  left: "LEFT",
  right: "RIGHT",
  bilateral: "BILATERAL",
});

export const BODY_AREA_LATERALITY_LABELS = Object.freeze({
  UNKNOWN: "左右不明",
  LEFT: "左",
  RIGHT: "右",
  BILATERAL: "両側",
});

export const BODY_AREA_TAXONOMY = Object.freeze([
  Object.freeze({ id: "BA-010", key: "ba_010", label: "頭", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-020", key: "ba_020", label: "首", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-030", key: "ba_030", label: "胸", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-040", key: "ba_040", label: "上背部", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-050", key: "ba_050", label: "腹部", groupId: "TRUNK", modelRegionId: "" }),
  Object.freeze({ id: "BA-060", key: "ba_060", label: "腰・下背部", groupId: "TRUNK", modelRegionId: "R01" }),
  Object.freeze({ id: "BA-100", key: "ba_100", label: "肩", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-110", key: "ba_110", label: "上腕", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-120", key: "ba_120", label: "肘", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-130", key: "ba_130", label: "前腕", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-140", key: "ba_140", label: "手首", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BA-150", key: "ba_150", label: "手", groupId: "UPPER_LIMB", modelRegionId: "" }),
  Object.freeze({ id: "BFR-200-ING", key: "bfr_200_ing", label: "ももの付け根の前側", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-200-COX", key: "bfr_200_cox", label: "股関節の外側周辺", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-210-GLU", key: "bfr_210_glu", label: "お尻", groupId: "HIP_THIGH", modelRegionId: "R02" }),
  Object.freeze({ id: "BFR-220-ANT", key: "bfr_220_ant", label: "太ももの前側", groupId: "HIP_THIGH", modelRegionId: "R03" }),
  Object.freeze({ id: "BFR-220-POST", key: "bfr_220_post", label: "太ももの後ろ側", groupId: "HIP_THIGH", modelRegionId: "R04" }),
  Object.freeze({ id: "BFR-230-ANT", key: "bfr_230_ant", label: "膝の前側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R05" }),
  Object.freeze({ id: "BFR-230-POST", key: "bfr_230_post", label: "膝の後ろ・膝窩周辺", groupId: "KNEE_LOWER_LEG", modelRegionId: "R05" }),
  Object.freeze({ id: "BFR-240-ANT", key: "bfr_240_ant", label: "すね側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R06" }),
  Object.freeze({ id: "BFR-240-POST", key: "bfr_240_post", label: "ふくらはぎ側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R07" }),
  Object.freeze({ id: "BFR-250-ANT", key: "bfr_250_ant", label: "足首の前側", groupId: "KNEE_LOWER_LEG", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-250-POST", key: "bfr_250_post", label: "足首の後ろ", groupId: "KNEE_LOWER_LEG", modelRegionId: "R07" }),
  Object.freeze({ id: "BFR-260-DOR", key: "bfr_260_dor", label: "足の甲", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-REAR", key: "bfr_260_rear", label: "踵・足底の後方", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-MID", key: "bfr_260_mid", label: "足裏の中央・土踏まず周辺", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-FORE", key: "bfr_260_fore", label: "足裏の前方", groupId: "FOOT", modelRegionId: "R08" }),
  Object.freeze({ id: "BFR-260-TOE", key: "bfr_260_toe", label: "足の指", groupId: "FOOT", modelRegionId: "R08" }),
]);

export const BODY_AREA_BY_ID = Object.freeze(Object.fromEntries(
  BODY_AREA_TAXONOMY.map((area) => [area.id, area]),
));

export const BODY_AREA_BY_KEY = Object.freeze(Object.fromEntries(
  BODY_AREA_TAXONOMY.map((area) => [area.key, area]),
));

export function normalizeBodyAreaObservations(source = []) {
  if (!Array.isArray(source)) return Object.freeze([]);
  const byId = new Map();
  source.forEach((item) => {
    const area = BODY_AREA_BY_ID[String(item?.areaId || "")];
    const intensity = Number(item?.intensity);
    if (!area || !Number.isInteger(intensity) || intensity < 1 || intensity > 5) return;
    const requestedLaterality = String(item?.laterality || item?.side || "UNKNOWN").toUpperCase();
    const laterality = Object.values(BODY_AREA_LATERALITY).includes(requestedLaterality)
      ? requestedLaterality
      : BODY_AREA_LATERALITY.unknown;
    byId.set(area.id, Object.freeze({
      areaId: area.id,
      label: area.label,
      groupId: area.groupId,
      modelRegionId: area.modelRegionId,
      intensity,
      laterality,
      sensationType: String(item?.sensationType || "NOT_SELECTED"),
      noticedTiming: String(item?.noticedTiming || "UNKNOWN"),
      note: String(item?.note || ""),
    }));
  });
  return Object.freeze(BODY_AREA_TAXONOMY
    .filter((area) => byId.has(area.id))
    .map((area) => byId.get(area.id)));
}

export function bodyAreaLateralityLabel(value = "UNKNOWN") {
  return BODY_AREA_LATERALITY_LABELS[String(value || "UNKNOWN").toUpperCase()]
    || BODY_AREA_LATERALITY_LABELS.UNKNOWN;
}
