import {
  SUPPORT_NEXT_ACTIONS,
  URGENT_SAFETY_FLAGS,
} from "./supportDecision.js";

export const PUBLIC_HELP_GUIDANCE_VERSION = "runload-public-help-guidance-v1";
export const PUBLIC_HELP_GUIDANCE_REVIEW_DATE = "2026-08-01";

const PUBLIC_FLAG_LABELS = Object.freeze({
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "強い息苦しさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "大量の出血",
  deformityOrMajorTrauma: "変形または大きな外傷",
});

export const OFFICIAL_HELP_REFERENCES = Object.freeze([
  Object.freeze({
    id: "MHLW-URGENCY-119",
    label: "厚生労働省『こんな時は迷わず119へ』",
    url: "https://kakarikata.mhlw.go.jp/kakaritsuke/urgency.html",
    purpose: "119番を検討する症状例の確認",
  }),
  Object.freeze({
    id: "FDMA-119-CALL",
    label: "総務省消防庁『119番緊急通報』",
    url: "https://www.fdma.go.jp/mission/enrichment/kyukyumusen_kinkyutuhou/119.html",
    purpose: "119番通報の方法の確認",
  }),
  Object.freeze({
    id: "FDMA-7119",
    label: "総務省消防庁『救急安心センター事業 #7119』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate007.html",
    purpose: "救急車を呼ぶか迷う場合の相談窓口と対応地域の確認",
  }),
  Object.freeze({
    id: "FDMA-QSUKE",
    label: "総務省消防庁『全国版救急受診アプリ Q助』",
    url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate003.html",
    purpose: "公式の救急受診ガイドの確認",
  }),
]);

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function buildPublicHelpGuidance(decision = {}) {
  const activeFlags = unique(Array.isArray(decision.activeSafetyFlags)
    ? decision.activeSafetyFlags.map(String)
    : []);
  const officialOverlapFlags = activeFlags.filter((flag) => URGENT_SAFETY_FLAGS.includes(flag));
  const nextActions = Array.isArray(decision.nextActions) ? decision.nextActions : [];
  const shouldPrioritize = String(decision.route || "") === "urgent"
    || nextActions.includes(SUPPORT_NEXT_ACTIONS.checkOfficialHelp);
  return Object.freeze({
    version: PUBLIC_HELP_GUIDANCE_VERSION,
    reviewedAt: PUBLIC_HELP_GUIDANCE_REVIEW_DATE,
    shouldPrioritize,
    selectedItems: Object.freeze(officialOverlapFlags.map((flag) => Object.freeze({
      id: flag,
      label: PUBLIC_FLAG_LABELS[flag] || flag,
    }))),
    references: OFFICIAL_HELP_REFERENCES,
    runtimeRequiresNetwork: false,
    externalLinksOptional: true,
    diagnosisPerformed: false,
    urgencyDeterminedByApp: false,
  });
}
