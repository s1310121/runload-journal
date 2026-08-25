import { FORMAL_INPUT_CATALOG, REGIONS } from "../model/regionalV1/engine/data.js";
import {
  buildA7ConditionPreviousComparable,
  buildA7RegionSemanticDecomposition,
  regionalV1CoverageMeta,
  regionalV1EndpointMeta,
  regionalV1ExposureMeta,
} from "../model/regionalV1/regionalV1ResultService.js";
import { summarizePersonalContext } from "../personal/personalContext.js";

export const DETERMINISTIC_CONSULTATION_VERSION = "runload-deterministic-consultation-v1";

export const CONSULTATION_PURPOSES = Object.freeze([
  Object.freeze({
    id: "body_observation",
    label: "身体の記録を伝える",
    description: "本人が入力した部位・感覚・体調情報を省略せず整理します。",
  }),
  Object.freeze({
    id: "run_conditions",
    label: "今回の条件を振り返る",
    description: "走行事実と、身体の使われ方を考えるときに一緒に見たい条件を整理します。",
  }),
  Object.freeze({
    id: "previous_comparison",
    label: "前の比較可能記録と比べる",
    description: "同じ部位・同じ基準など、同じ意味で比べられる過去記録がある場合だけ差を表示します。",
  }),
  Object.freeze({
    id: "next_check",
    label: "次回に確認する条件を相談する",
    description: "運動可否や練習内容を決めず、次回に記録・比較したい条件を質問文へ整理します。",
  }),
]);

const PURPOSE_IDS = new Set(CONSULTATION_PURPOSES.map((item) => item.id));
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const INPUT_BY_ID = new Map(FORMAL_INPUT_CATALOG.map((item) => [item.id, item]));
const ALLOWED_DATA_SELECTION = new Set(["current-result", "body-record", "course", "personal-note"]);

const DEFAULT_DATA_BY_PURPOSE = Object.freeze({
  body_observation: Object.freeze(["body-record", "course", "personal-note"]),
  run_conditions: Object.freeze(["current-result", "course", "personal-note"]),
  previous_comparison: Object.freeze(["current-result", "course", "personal-note"]),
  next_check: Object.freeze(["current-result", "body-record", "course", "personal-note"]),
});

const SAFETY_FLAG_LABELS = Object.freeze({
  severePain: "強い痛み",
  significantSwelling: "はっきりした腫れ",
  cannotBearWeight: "体重をかけにくい",
  movementDifficulty: "動かしにくい",
  numbnessOrWeakness: "しびれ・力の入りにくさ",
  coldPaleBlueLimb: "手足が冷たい・白い・青い",
  deformityOrMajorTrauma: "変形または大きな外傷",
  painAtRestOrNight: "安静時または夜間の痛み",
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "呼吸のしにくさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "多量の出血",
});

const LATERALITY_LABELS = Object.freeze({
  LEFT: "左",
  RIGHT: "右",
  BILATERAL: "両側",
  MIDLINE: "中央",
  UNKNOWN: "左右不明",
});

const DEFAULT_QUESTION_BY_PURPOSE = Object.freeze({
  body_observation: "本人が記録した身体の変化について、追加で伝えるべき事実があるか確認したいです。",
  run_conditions: "今回の条件を振り返るとき、次の比較でも揃えて記録する条件を確認したいです。",
  previous_comparison: "この差を解釈するとき、どの走行条件と本人入力を一緒に確認すべきか相談したいです。",
  next_check: "次回は一度に多くを変えず、比較のために記録する条件を相談したいです。",
});

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function normalizePurpose(value = "", supportRoute = "normal") {
  const requested = String(value || "");
  if (PURPOSE_IDS.has(requested)) return requested;
  return ["consult", "urgent"].includes(String(supportRoute || ""))
    ? "body_observation"
    : "run_conditions";
}

function firstObservedRegionId(feedback = {}) {
  const exact = Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [];
  return exact.map((item) => String(item?.modelRegionId || "")).find((id) => REGION_BY_ID.has(id)) || "";
}

function normalizeRegionId(value = "", experience = {}) {
  const requested = String(value || "");
  if (REGION_BY_ID.has(requested)) return requested;
  const observed = firstObservedRegionId(experience.feedback || {});
  return observed || REGIONS[0]?.id || "BA-DISP-014";
}

function normalizeDataSelection(value, purpose) {
  const requested = Array.isArray(value)
    ? unique(value).filter((item) => ALLOWED_DATA_SELECTION.has(item))
    : [];
  return Object.freeze(requested.length ? requested : [...(DEFAULT_DATA_BY_PURPOSE[purpose] || [])]);
}

function runningFormatLabel(value = "") {
  return {
    CONTINUOUS_RUN: "途中で歩かず走った",
    RUN_WALK: "走りと歩きを混ぜた",
  }[String(value || "")] || "";
}

function coverageLabel(value = "") {
  return {
    FULL: "必要な条件を確認",
    PARTIAL: "一部の条件を確認",
    NONE: "確認できる条件なし",
  }[String(value || "")] || "確認状況を表示できません";
}

function resultStateLabel(value = "") {
  return {
    CALCULATED: "表示あり",
    PARTIAL: "一部の条件で表示",
    NOT_CALCULABLE: "表示なし",
    OUT_OF_SUPPORTED_RANGE: "確認できる範囲外",
    NOT_APPLICABLE: "対象外",
  }[String(value || "")] || "表示状態を確認できません";
}

function comparisonReason(value = "") {
  return {
    COMPARABLE: "前の比較可能記録があります",
    NO_COMPARABLE_CONDITION_RECORD: "同じ条件応答として比べられる過去記録はありません",
    NO_PREVIOUS_CONDITION_RECORD: "前の条件応答記録はありません",
    CURRENT_CONDITION_UNAVAILABLE: "今回の条件応答を数値化できません",
  }[String(value || "")] || "比較できる記録を確認できません";
}

function courseSummary(record = {}) {
  if (record.activityType === "rest") return "休養記録";
  const parts = [];
  if (finite(record.distanceKm)) parts.push(`${Number(record.distanceKm)}km`);
  if (finite(record.durationMinutes)) parts.push(`${Number(record.durationMinutes)}分`);
  if (finite(record.steps) && Number(record.steps) > 0) parts.push(`${Math.round(Number(record.steps))}歩`);
  const runningFormat = runningFormatLabel(record.runningFormat);
  if (runningFormat) parts.push(runningFormat);
  if (record.course?.name) parts.push(String(record.course.name));
  else if (record.course?.modelSurfaceClass) parts.push("路面条件の入力あり");
  if (record.course?.gradeKnowledge === "KNOWN_FLAT") parts.push("平坦と把握");
  if (record.course?.gradeKnowledge === "KNOWN_PROFILE") {
    if (Number(record.course.upPercent || 0) > 0) parts.push(`上り区間 ${Number(record.course.upPercent)}%`);
    if (Number(record.course.downPercent || 0) > 0) parts.push(`下り区間 ${Number(record.course.downPercent)}%`);
  }
  if (record.course?.gradeKnowledge === "UNKNOWN") parts.push("勾配不明");
  return parts.join("・") || "走行条件の入力あり";
}

function bodyObservationItems(feedback = {}) {
  const exact = (Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const details = [];
      if (item.laterality) details.push(LATERALITY_LABELS[String(item.laterality)] || String(item.laterality));
      if (finite(item.intensity)) details.push(`程度 ${Number(item.intensity)}/5`);
      if (item.sensation) details.push(String(item.sensation));
      return `${item.label || "詳細部位"}${details.length ? `：${details.join("・")}` : ""}`;
    });
  const legacyNames = new Set([
    ...Object.keys(feedback.fatigueByBodyPart || {}),
    ...Object.keys(feedback.discomfortByBodyPart || {}),
    ...Object.keys(feedback.reviewedBodyParts || {}),
  ]);
  const legacy = [...legacyNames].filter((name) => (
    Number(feedback.fatigueByBodyPart?.[name] || 0) > 0
    || Number(feedback.discomfortByBodyPart?.[name] || 0) > 0
    || feedback.reviewedBodyParts?.[name] === true
  )).map((name) => {
    const details = [];
    const fatigue = Number(feedback.fatigueByBodyPart?.[name] || 0);
    const discomfort = Number(feedback.discomfortByBodyPart?.[name] || 0);
    if (fatigue > 0) details.push(`疲れ・だるさ ${fatigue}/5`);
    if (discomfort > 0) details.push(`気になる感じ ${discomfort}/5`);
    return `${name}${details.length ? `：${details.join("・")}` : "：確認済み"}`;
  });
  return Object.freeze(unique([...exact, ...legacy]));
}

function activeSafetyFlags(feedback = {}) {
  return Object.entries(feedback.safetyFlags || {})
    .filter(([, active]) => active === true)
    .map(([key]) => SAFETY_FLAG_LABELS[key] || key);
}

function contributorLabel(event = {}, exposure = {}) {
  if (event.traceCode === "EXPOSURE_CONTRIBUTION") {
    return exposure.label || "走行量";
  }
  const inputLabels = unique(event.inputIds || [])
    .map((id) => INPUT_BY_ID.get(id)?.label || "関連する入力")
    .slice(0, 4);
  const input = inputLabels.length ? inputLabels.join("、") : "走行条件";
  return input;
}

function regionalContext(experience, allExperiences, regionId) {
  const row = experience?.regionalV1Result?.regions?.find((item) => item.regionId === regionId) || null;
  const region = REGION_BY_ID.get(regionId);
  if (!row) {
    return Object.freeze({
      state: experience?.record?.activityType === "rest" ? "REST" : "UNAVAILABLE",
      regionId,
      regionLabel: region?.name || "選択した部位",
      row: null,
      displayIndex: null,
      displayDeltaPoints: null,
      endpoint: null,
      exposure: null,
      semantic: null,
      coverage: null,
      contributors: Object.freeze([]),
      previousComparable: null,
    });
  }
  const endpoint = regionalV1EndpointMeta(row);
  const exposure = regionalV1ExposureMeta(row);
  const coverage = regionalV1CoverageMeta(row);
  const semantic = experience?.regionalV1ResultRecord?.a7_region_semantics?.[regionId]
    || buildA7RegionSemanticDecomposition(row);
  const ratio = semantic?.regionalConditionResponse?.ratioExact;
  const displayIndex = finite(ratio) && Number(ratio) > 0 ? Math.round(100 * Number(ratio)) : null;
  const displayDeltaPoints = displayIndex === null ? null : displayIndex - 100;
  const activeConditionRoutes = new Set(semantic?.regionalConditionResponse?.activeRouteIds || []);
  const contributors = (row.reasonTrace || [])
    .filter((event) => event.numericEffectApplied === true && finite(event.contributionLog))
    .filter((event) => activeConditionRoutes.has(String(event.routeId || "")))
    .map((event) => Object.freeze({
      traceCode: String(event.traceCode || ""),
      label: contributorLabel(event, exposure),
      contributionLog: Number(event.contributionLog),
      inputIds: Object.freeze(unique(event.inputIds || [])),
      sourceIds: Object.freeze(unique(event.sourceIds || [])),
      parameterIds: Object.freeze(unique(event.parameterIds || [])),
    }));
  const previousComparable = buildA7ConditionPreviousComparable({
    currentExperience: experience,
    experiences: allExperiences,
    regionId,
  });
  return Object.freeze({
    state: semantic?.regionalConditionResponse?.status || "UNAVAILABLE",
    regionId,
    regionLabel: row.regionName || region?.name || "選択した部位",
    row,
    displayIndex,
    displayDeltaPoints,
    endpoint,
    exposure,
    semantic,
    coverage,
    contributors: Object.freeze(contributors),
    previousComparable,
  });
}

function sourceUseSummary({ purpose, dataSelection, bodyItems, regional, profileItems, question, audience }) {
  const selected = new Set(dataSelection);
  return Object.freeze([
    Object.freeze({ id: "question", label: "相談したい内容", used: Boolean(question), reason: question ? "入力した確認内容" : "確認内容は未入力" }),
    Object.freeze({ id: "audience", label: "相談相手", used: Boolean(audience), reason: audience ? "入力した相談相手" : "相談相手は未入力" }),
    Object.freeze({ id: "body", label: "本人の身体記録", used: selected.has("body-record") && bodyItems.length > 0, reason: selected.has("body-record") ? (bodyItems.length ? "本人が記録した内容" : "身体記録は未入力") : "共有対象から外しています" }),
    Object.freeze({ id: "course", label: "走行事実・コース", used: selected.has("course"), reason: selected.has("course") ? "今回の保存記録" : "共有対象から外しています" }),
    Object.freeze({ id: "a4", label: "選択した部位の条件応答", used: selected.has("current-result") && regional.displayIndex !== null, reason: selected.has("current-result") ? (regional.displayIndex !== null ? "今回の部位結果" : "この記録では数値を表示できません") : "共有対象から外しています" }),
    Object.freeze({ id: "history", label: "前の比較可能記録", used: purpose === "previous_comparison" && selected.has("current-result") && regional.previousComparable?.status === "COMPARABLE", reason: purpose === "previous_comparison" ? (selected.has("current-result") ? comparisonReason(regional.previousComparable?.status) : "共有対象から外しています") : "今回の目的には含めません" }),
    Object.freeze({ id: "profile", label: "シューズ・走り方の記録", used: selected.has("personal-note") && profileItems.length > 0, reason: selected.has("personal-note") ? (profileItems.length ? "本人が記録した内容" : "入力はありません") : "共有対象から外しています" }),
  ]);
}

function appendSection(lines, heading, items) {
  const values = (items || []).filter(Boolean);
  if (!values.length) return;
  lines.push(heading);
  values.forEach((item) => lines.push(`- ${item}`));
}

function regionalCurrentLine(regional) {
  if (regional.displayIndex === null) return `${regional.regionLabel}：条件応答の数値なし`;
  const delta = regional.displayDeltaPoints == null
    ? ""
    : regional.displayDeltaPoints === 0
      ? "（基準100と同じ）"
      : `（基準100から${regional.displayDeltaPoints > 0 ? "+" : ""}${regional.displayDeltaPoints}ポイント）`;
  return `${regional.regionLabel}：${regional.displayIndex}${delta}`;
}

function comparisonLines(regional) {
  const comparison = regional.previousComparable;
  if (!comparison) return ["比較情報を作成できませんでした。"]; 
  if (comparison.status === "COMPARABLE") {
    const sign = comparison.percentChangeRounded > 0 ? "+" : "";
    return [
      `今回：${regionalCurrentLine(regional)}`,
      `前の比較可能記録：${comparison.previous.date}／条件応答 ${comparison.previous.displayConditionIndex}`,
      `同じ意味で比べた変化：${sign}${comparison.percentChangeRounded}%`,
    ];
  }
  if (comparison.status === "NO_COMPARABLE_CONDITION_RECORD") {
    return ["過去記録はありますが、同じ部位・同じ比較指標・同じ基準で比べられる記録がないため差を表示しません。"];
  }
  if (comparison.status === "NO_PREVIOUS_CONDITION_RECORD") return ["前の条件応答記録がないため、自分の過去記録との比較はまだ表示しません。"];
  return ["今回の条件応答を数値化できないため、自分の過去記録との比較は表示しません。"];
}

function buildMemo({ purpose, record, feedback, audience, question, dataSelection, bodyItems, profileItems, regional }) {
  const selected = new Set(dataSelection);
  const lines = [`${record.date || "日付未設定"}の記録について相談したいです。`];
  if (audience) lines.push(`相談相手：${audience}`);
  lines.push(`目的：${CONSULTATION_PURPOSES.find((item) => item.id === purpose)?.label || purpose}`);
  lines.push(`確認したいこと：${question}`);

  if (selected.has("course")) appendSection(lines, "今回の走行事実：", [courseSummary(record)]);
  if (selected.has("personal-note")) appendSection(lines, "シューズ・走り方の文脈：", profileItems);
  if (selected.has("body-record")) {
    appendSection(lines, "本人が入力した身体記録：", bodyItems.length ? bodyItems : ["部位・感覚の入力なし"]);
    const flags = activeSafetyFlags(feedback);
    if (flags.length) appendSection(lines, "本人が選択した体調情報：", flags);
  }

  if (selected.has("current-result") && regional.displayIndex !== null) {
    appendSection(lines, "選択した部位の条件応答：", [
      regionalCurrentLine(regional),
      "この値の見方：根拠付きで数値化できる今回の走行条件への応答を、この部位自身の基準100と比べる表示です。",
      "共通走行量はこの条件応答へ足さず、別の情報として扱います。",
      "100は安全値・正常値・初心者平均ではなく、数値は身体を直接測った値でもありません。",
    ]);
  }

  if (purpose === "run_conditions" && selected.has("current-result")) {
    appendSection(lines, "今回の記録と一緒に確認したい条件：", [
      "坂道、走行ペース、歩数、路面などは、身体の使われ方と関係することが研究で報告されています。",
      "今回の数値だけで原因は分からないため、走行事実と本人の感覚を分けて振り返ります。",
    ]);
  }
  if (purpose === "previous_comparison" && selected.has("current-result")) appendSection(lines, "自分の過去記録との比較：", comparisonLines(regional));
  if (purpose === "previous_comparison" && !selected.has("current-result")) appendSection(lines, "自分の過去記録との比較：", ["共有する内容に数値結果を含めていないため、比較値を記載しません。"]);
  if (purpose === "next_check") {
    const reflection = record.reflectionContext || {};
    appendSection(lines, "次回に残しておきたい本人メモ：", [
      reflection.nextCheckPoint ? `次回確認したいこと：${reflection.nextCheckPoint}` : "次回確認したいことは未入力",
      reflection.reflectionKeyPoint ? `今回の主な気づき：${reflection.reflectionKeyPoint}` : "",
    ]);
  }

  const boundaryLines = [
    "本人入力・走行事実・数値表示は別の情報です。",
    "このメモは診断、障害予測、原因特定、走行可否、練習処方、安全保証を行いません。",
  ];
  const boundaryText = boundaryLines.join("\n");
  const bodyText = lines.join("\n");
  const separator = "\n";
  const bodyLimit = Math.max(0, 1200 - boundaryText.length - separator.length);
  const boundedBody = bodyText.length > bodyLimit
    ? `${bodyText.slice(0, Math.max(0, bodyLimit - 12)).trimEnd()}\n（本文を省略）`
    : bodyText;
  return `${boundedBody}${separator}${boundaryText}`.slice(0, 1200);
}

export function buildDeterministicConsultation({
  experience,
  allExperiences = [],
  purpose = "",
  regionId = "",
} = {}) {
  if (!experience?.record) return null;
  const supportRoute = experience.supportDecision?.route || "normal";
  const normalizedPurpose = normalizePurpose(purpose, supportRoute);
  const normalizedRegionId = normalizeRegionId(regionId, experience);
  const consultationContext = experience.record.consultationContext || {};
  const dataSelection = normalizeDataSelection(consultationContext.consultationDataSelection, normalizedPurpose);
  const audience = String(consultationContext.consultationTarget || "").trim();
  const question = String(
    consultationContext.consultationQuestion
    || experience.feedback?.consultationNote
    || DEFAULT_QUESTION_BY_PURPOSE[normalizedPurpose]
    || "",
  ).trim();
  const profile = summarizePersonalContext(experience.record.personalContext || {});
  const profileItems = profile.hasInput ? profile.items : [];
  const bodyItems = bodyObservationItems(experience.feedback || {});
  const regional = regionalContext(experience, allExperiences, normalizedRegionId);
  const sources = sourceUseSummary({
    purpose: normalizedPurpose,
    dataSelection,
    bodyItems,
    regional,
    profileItems,
    question,
    audience,
  });
  const memo = buildMemo({
    purpose: normalizedPurpose,
    record: experience.record,
    feedback: experience.feedback || {},
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems,
    regional,
  });
  return Object.freeze({
    version: DETERMINISTIC_CONSULTATION_VERSION,
    purpose: normalizedPurpose,
    purposeDefinition: CONSULTATION_PURPOSES.find((item) => item.id === normalizedPurpose),
    regionId: normalizedRegionId,
    regionOptions: Object.freeze(REGIONS.map((region) => Object.freeze({ id: region.id, label: region.name }))),
    supportRoute,
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems: Object.freeze(profileItems),
    regional,
    sources,
    memo,
    boundaries: Object.freeze({
      deterministicRulesOnly: true,
      externalAiUsed: false,
      modelChangesA4: false,
      usesBodyPartRanking: false,
      diagnosis: false,
      injuryPrediction: false,
      causation: false,
      runPermission: false,
      trainingPrescription: false,
      safetyGuarantee: false,
    }),
  });
}
