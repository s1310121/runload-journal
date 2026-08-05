export const BODY_REGION_TERMINOLOGY_VERSION = "runload-body-region-terminology-v1";

const ENTRIES = Object.freeze([
  Object.freeze({ id: "BA-DISP-014", formalJa: "股関節部", familiarJa: "股関節まわり", plainMeaningJa: "股関節まわりの動き方に関する研究上の傾向", english: "Hip joint region" }),
  Object.freeze({ id: "BA-DISP-015", formalJa: "殿部", familiarJa: "お尻", plainMeaningJa: "お尻の筋肉の使われ方に関する研究上の傾向", english: "Gluteal region" }),
  Object.freeze({ id: "BA-DISP-016", formalJa: "大腿前面", familiarJa: "太ももの前", plainMeaningJa: "太ももの前の筋肉の使われ方に関する研究上の傾向", english: "Anterior thigh region" }),
  Object.freeze({ id: "BA-DISP-018", formalJa: "大腿後面", familiarJa: "太ももの後ろ", plainMeaningJa: "太ももの後ろの筋肉の使われ方に関する研究上の傾向", english: "Posterior thigh region" }),
  Object.freeze({ id: "BA-DISP-019", formalJa: "膝蓋大腿関節部", familiarJa: "膝の前", plainMeaningJa: "膝の前側への繰り返しのかかり方に関する研究上の傾向", english: "Patellofemoral region" }),
  Object.freeze({ id: "BA-DISP-021", formalJa: "脛骨部", familiarJa: "すね", plainMeaningJa: "すねへの繰り返しのかかり方に関する研究上の傾向", english: "Tibial region" }),
  Object.freeze({ id: "BA-DISP-023", formalJa: "下腿後面", familiarJa: "ふくらはぎ", plainMeaningJa: "ふくらはぎの筋肉の使われ方に関する研究上の傾向", english: "Posterior lower-leg region" }),
  Object.freeze({ id: "BA-DISP-024", formalJa: "足関節部", familiarJa: "足首まわり", plainMeaningJa: "足首まわりの動き方に関する研究上の傾向", english: "Ankle joint region" }),
  Object.freeze({ id: "BA-DISP-025", formalJa: "アキレス腱部", familiarJa: "足首の後ろ・アキレス腱周辺", plainMeaningJa: "アキレス腱周辺への繰り返しのかかり方に関する研究上の傾向", english: "Achilles tendon region" }),
  Object.freeze({ id: "BA-DISP-027", formalJa: "後足部", familiarJa: "かかと・足裏の後ろ", plainMeaningJa: "かかと側の足裏圧に関する研究上の傾向", english: "Rearfoot region" }),
  Object.freeze({ id: "BA-DISP-028", formalJa: "足底中部・内側縦足弓", familiarJa: "土踏まず・足裏の中央", plainMeaningJa: "土踏まず周辺の働き方に関する研究上の傾向", english: "Mid-plantar and medial longitudinal arch region" }),
  Object.freeze({ id: "BA-DISP-029", formalJa: "前足部", familiarJa: "足裏の前・母趾球周辺", plainMeaningJa: "前足部の足裏圧に関する研究上の傾向", english: "Forefoot region" }),
]);

export const BODY_REGION_TERMINOLOGY = ENTRIES;
const BY_ID = new Map(ENTRIES.map((item) => [item.id, item]));

export function bodyRegionTerminology(regionId) {
  return BY_ID.get(String(regionId || "")) || null;
}

export function bodyRegionFormalName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.formalJa || String(fallback || regionId || "");
}

export function bodyRegionFamiliarName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.familiarJa || String(fallback || "");
}

export function bodyRegionPlainMeaning(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.plainMeaningJa || String(fallback || "この部位に関する研究上の傾向");
}

export function bodyRegionDisplayName(regionId, fallback = "", { includeFamiliar = false } = {}) {
  const item = bodyRegionTerminology(regionId);
  if (!item) return String(fallback || regionId || "");
  return includeFamiliar && item.familiarJa && item.familiarJa !== item.formalJa
    ? `${item.formalJa}（${item.familiarJa}）`
    : item.formalJa;
}
