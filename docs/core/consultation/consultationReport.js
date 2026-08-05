import { BODY_PARTS } from "../model/modelConstants.js";
import { bodyAreaLateralityLabel } from "../model/v27/bodyAreaTaxonomy.js";
import {
  V27_EMPHASIS_REGION_IDS,
  V27_MODEL_VERSION,
  V27_REGIONAL_VIEW_IDS,
  V27_REGIONS,
} from "../model/v27/v27Constants.js";
import { summarizePersonalContext } from "../personal/personalContext.js";
import { reportedRpeValue } from "../safety/rpeProvenance.js";

const BODY_PART_NAMES = Object.freeze({
  "腰骨盤部": "骨盤まわり（腰を含む）",
  "股関節臀部": "殿部（お尻まわり）",
  "大腿": "大腿部（太もも）",
  "膝": "膝まわり",
  "前下腿": "下腿前面（すね）",
  "後下腿": "下腿後面（ふくらはぎ）",
  "アキレス腱": "アキレス腱周辺",
  "足底部": "足底部（足裏）",
  "足関節・足背部": "足関節・足背部（足首・足の甲）",
});

const REGION_BY_ID = new Map(V27_REGIONS.map((region) => [region.id, region]));
const ALLOWED_REGION_IDS = new Set(V27_EMPHASIS_REGION_IDS);
const ALLOWED_VIEW_IDS = new Set(Object.values(V27_REGIONAL_VIEW_IDS));

const VIEW_DEFINITIONS = Object.freeze({
  [V27_REGIONAL_VIEW_IDS.withinRun]: Object.freeze({
    label: "今回の部位別表示",
    reference: "今回の対象部位の平均=100",
  }),
  [V27_REGIONAL_VIEW_IDS.ownFlat]: Object.freeze({
    label: "同じ部位の基準との比較",
    reference: "選択した部位の平坦条件=100",
  }),
  [V27_REGIONAL_VIEW_IDS.personal]: Object.freeze({
    label: "自分の過去記録との比較",
    reference: "今回より前の、同じ意味で比べられる記録の中央値=100",
  }),
});

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function finiteOrNull(value) {
  return hasFiniteValue(value) ? Number(value) : null;
}

function normalizeRegionId(value = "") {
  const requested = String(value || "");
  return ALLOWED_REGION_IDS.has(requested) ? requested : "R05";
}

function normalizeViewId(value = "") {
  const requested = String(value || "");
  return ALLOWED_VIEW_IDS.has(requested)
    ? requested
    : V27_REGIONAL_VIEW_IDS.withinRun;
}

function activitySummary(record = {}) {
  if (record.activityType === "rest") return "休養";
  const parts = [];
  if (Number(record.distanceKm) > 0) parts.push(`${record.distanceKm}km`);
  if (Number(record.durationMinutes) > 0) parts.push(`${record.durationMinutes}分`);
  if (Number(record.steps) > 0) parts.push(`${record.steps}歩`);
  return parts.join("・") || "走行";
}

function enteredBodyParts(feedback = {}) {
  return BODY_PARTS.filter((bodyPart) => (
    Number(feedback.fatigueByBodyPart?.[bodyPart] || 0) > 0
    || Number(feedback.discomfortByBodyPart?.[bodyPart] || 0) > 0
    || Boolean(feedback.reviewedBodyParts?.[bodyPart])
  ));
}

function normalizeExactObservations(feedback = {}) {
  const observations = Array.isArray(feedback.bodyAreaObservations)
    ? feedback.bodyAreaObservations
    : [];
  return observations
    .filter((item) => item && typeof item === "object")
    .map((item) => Object.freeze({
      areaId: String(item.areaId || ""),
      label: String(item.label || "詳細部位"),
      laterality: String(item.laterality || item.side || "UNKNOWN"),
      lateralityLabel: bodyAreaLateralityLabel(item.laterality || item.side),
      intensity: finiteOrNull(item.intensity),
      sensation: String(item.sensation || item.note || ""),
      modelRegionId: String(item.modelRegionId || ""),
    }));
}

function rawFacts(record = {}) {
  return Object.freeze({
    activityType: record.activityType === "rest" ? "rest" : "run",
    distanceKm: record.activityType === "rest" ? null : finiteOrNull(record.distanceKm),
    durationMinutes: record.activityType === "rest" ? null : finiteOrNull(record.durationMinutes),
    steps: record.activityType === "rest" ? null : finiteOrNull(record.steps),
    stepsProvenance: String(record.stepsProvenance || ""),
    rpe: record.activityType === "rest" ? null : reportedRpeValue(record),
    runningFormat: String(record.runningFormat || ""),
    course: record.course && typeof record.course === "object"
      ? JSON.parse(JSON.stringify(record.course))
      : {},
  });
}

function regionalReference(resultRecord, regionId, viewId) {
  const region = REGION_BY_ID.get(regionId);
  const view = VIEW_DEFINITIONS[viewId];
  const base = {
    regionId,
    regionLabel: region?.label || regionId,
    viewId,
    viewLabel: view.label,
    reference: view.reference,
    state: "UNAVAILABLE",
    value: null,
    range: null,
    showRange: false,
    endpoint: "",
    endpointConfidence: "",
    gradeCoverage: null,
    coverageSignature: "",
    eligibleN: null,
    firstDate: "",
    lastDate: "",
    targetExcluded: null,
  };
  if (!resultRecord || resultRecord.state !== "RUN") {
    return Object.freeze({
      ...base,
      state: resultRecord?.state === "REST" ? "REST" : "LEGACY_NO_V27",
    });
  }
  const regional = resultRecord.result?.regional?.[regionId];
  if (!regional) return Object.freeze(base);
  const common = {
    ...base,
    endpoint: String(regional.endpoint || ""),
    endpointConfidence: String(regional.endpoint_confidence || ""),
    gradeCoverage: finiteOrNull(regional.grade_coverage),
    coverageSignature: String(regional.coverage_signature || ""),
  };
  if (viewId === V27_REGIONAL_VIEW_IDS.withinRun) {
    const emphasis = resultRecord.result?.within_run_regional_emphasis;
    const row = emphasis?.rows?.find((item) => item.region_id === regionId);
    return Object.freeze({
      ...common,
      state: row ? "AVAILABLE" : String(emphasis?.state || "UNAVAILABLE"),
      value: finiteOrNull(row?.relative_emphasis_index),
      range: Array.isArray(row?.relative_emphasis_range)
        ? [...row.relative_emphasis_range]
        : null,
      showRange: row?.show_range_primary === true,
    });
  }
  if (viewId === V27_REGIONAL_VIEW_IDS.ownFlat) {
    const available = regional.primary_display_mode === "CONDITION_RESPONSIVE_NUMERIC";
    return Object.freeze({
      ...common,
      state: available ? "AVAILABLE" : "UNAVAILABLE",
      value: available ? finiteOrNull(regional.run_fact_regional_ratio) : null,
      range: available && Array.isArray(regional.condition_index_range)
        ? [...regional.condition_index_range]
        : null,
      showRange: available && regional.show_range_primary === true,
    });
  }
  const personal = resultRecord.personal_reference_snapshots?.[regionId];
  return Object.freeze({
    ...common,
    state: String(personal?.state || "BUILDING_REFERENCE"),
    value: finiteOrNull(personal?.value),
    eligibleN: Number(personal?.eligible_n || 0),
    firstDate: String(personal?.first_date || ""),
    lastDate: String(personal?.last_date || ""),
    targetExcluded: personal?.target_excluded === true,
  });
}

function modelReference(experience, regionId, viewId) {
  const resultRecord = experience?.v27ResultRecord;
  if (!resultRecord) {
    return Object.freeze({
      modelVersion: "",
      state: experience?.record?.activityType === "rest" ? "REST" : "LEGACY_NO_V27",
      total: null,
      regional: regionalReference(null, regionId, viewId),
      internalResponse: null,
    });
  }
  if (resultRecord.state !== "RUN") {
    return Object.freeze({
      modelVersion: resultRecord.model_version || V27_MODEL_VERSION,
      state: "REST",
      total: null,
      regional: regionalReference(resultRecord, regionId, viewId),
      internalResponse: null,
    });
  }
  const total = resultRecord.result?.total;
  const internal = resultRecord.result?.internal;
  const rpeWasReported = reportedRpeValue(experience.record || {}) != null;
  return Object.freeze({
    modelVersion: String(resultRecord.model_version || ""),
    state: "RUN",
    total: Object.freeze({
      central: finiteOrNull(total?.central_points),
      range: Array.isArray(total?.range_points) ? [...total.range_points] : null,
      showRange: total?.show_range_primary === true,
      gradeCoverage: finiteOrNull(total?.grade_coverage),
      surfaceCoverage: finiteOrNull(total?.surface_coverage),
      pairingState: String(total?.pairing_state || ""),
    }),
    regional: regionalReference(resultRecord, regionId, viewId),
    internalResponse: Object.freeze({
      state: rpeWasReported ? String(internal?.state || "UNKNOWN") : "UNKNOWN",
      srpeAu: rpeWasReported ? finiteOrNull(internal?.srpe_au) : null,
      separateFromRunFactModel: internal?.separate_from_objective_model === true,
    }),
  });
}

function recentFacts(allExperiences, target, regionId, viewId) {
  return [...allExperiences]
    .filter((item) => (
      item?.record?.id !== target.record.id
      && item?.record?.date <= target.record.date
    ))
    .sort((left, right) => (
      right.record.date.localeCompare(left.record.date)
      || right.record.id.localeCompare(left.record.id)
    ))
    .slice(0, 5)
    .map((item) => {
      const model = modelReference(item, regionId, viewId);
      return Object.freeze({
        date: item.record.date,
        activity: activitySummary(item.record),
        total: model.total?.central ?? null,
        regional: model.regional,
        rpe: reportedRpeValue(item.record),
        subjectiveParts: enteredBodyParts(item.feedback || {})
          .map((bodyPart) => BODY_PART_NAMES[bodyPart] || bodyPart),
        exactObservations: normalizeExactObservations(item.feedback || {}),
      });
    });
}

export function buildConsultationReport(experience, allExperiences = [], options = {}) {
  if (!experience) return null;
  const regionId = normalizeRegionId(options.regionId);
  const viewId = normalizeViewId(options.viewId);
  const feedback = experience.feedback || {};
  const entered = enteredBodyParts(feedback);
  const personal = summarizePersonalContext(experience.record.personalContext || {});
  const exactObservations = normalizeExactObservations(feedback);
  return Object.freeze({
    reportVersion: "runload-consultation-report-v2.7",
    date: experience.record.date,
    activity: activitySummary(experience.record),
    courseName: experience.record.course?.name || "",
    memo: experience.record.memo || "",
    rawFacts: rawFacts(experience.record),
    personalContextItems: personal.hasInput ? personal.items : [],
    subjectiveStatus: feedback.checkStatus || "not_asked",
    subjectiveParts: entered.map((bodyPart) => Object.freeze({
      bodyPart,
      label: BODY_PART_NAMES[bodyPart] || bodyPart,
      fatigue: Number(feedback.fatigueByBodyPart?.[bodyPart] || 0),
      discomfort: Number(feedback.discomfortByBodyPart?.[bodyPart] || 0),
    })),
    exactBodyObservations: Object.freeze(exactObservations),
    consultationNote: feedback.consultationNote || "",
    conditionFlags: Object.entries(feedback.safetyFlags || {})
      .filter(([, active]) => active)
      .map(([flag]) => flag),
    supportRoute: experience.supportDecision?.route || "normal",
    modelReference: modelReference(experience, regionId, viewId),
    recent: Object.freeze(recentFacts(allExperiences, experience, regionId, viewId)),
    claimBoundary: Object.freeze({
      subjectiveAndModelAreSeparate: true,
      isDiagnosis: false,
      predictsInjury: false,
      provesCause: false,
      guaranteesSafety: false,
      isMeasuredPhysicalRegionalLoad: false,
      isAnatomicalShare: false,
    }),
  });
}

function regionalText(regional) {
  if (!regional) return "部位ごとの負荷傾向指数：数値なし";
  if (regional.state === "BUILDING_REFERENCE") {
    return `部位ごとの負荷傾向指数：${regional.regionLabel}／${regional.viewLabel}／基準作成中 ${regional.eligibleN || 0}/3`;
  }
  if (!hasFiniteValue(regional.value)) {
    return `部位ごとの負荷傾向指数：${regional.regionLabel}／${regional.viewLabel}／数値なし（${regional.state}）`;
  }
  const range = regional.showRange
    && Array.isArray(regional.range)
    && regional.range.every(hasFiniteValue)
    ? `（範囲 ${Math.round(regional.range[0])}–${Math.round(regional.range[1])}）`
    : "";
  return `部位ごとの負荷傾向指数：${regional.regionLabel} ${Math.round(regional.value)}${range}／${regional.viewLabel}／${regional.reference}`;
}

function bodyObservationLines(report) {
  const exact = report.exactBodyObservations.map((item) => {
    const details = [];
    if (item.lateralityLabel) details.push(item.lateralityLabel);
    if (item.intensity != null) details.push(`程度 ${item.intensity}/5`);
    if (item.sensation) details.push(item.sensation);
    return `- ${item.label}${details.length ? `：${details.join("・")}` : ""}`;
  });
  const legacy = report.subjectiveParts.map((item) => {
    const details = [];
    if (item.fatigue > 0) details.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (item.discomfort > 0) details.push(`気になる感じ ${item.discomfort}/5`);
    return `- ${item.label}：${details.join("・") || "確認済み"}`;
  });
  return [...exact, ...legacy];
}

export function createShortConsultationMemo(report) {
  if (!report) return "";
  const lines = [`${report.date}の${report.activity}について相談したいです。`];
  if (report.personalContextItems.length) {
    lines.push(`今日のシューズ・走り方：${report.personalContextItems.slice(0, 3).join("、")}。`);
  }
  const observations = [
    ...report.exactBodyObservations.map((item) => item.label),
    ...report.subjectiveParts.map((item) => item.label),
  ];
  if (observations.length) {
    lines.push(`本人が記録した部位：${[...new Set(observations)].join("、")}。`);
  }
  if (report.consultationNote) lines.push(`聞きたいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    lines.push(`参考：走行全体の比較用推定値 ${Math.round(report.modelReference.total.central * 10) / 10}、${regionalText(report.modelReference.regional).replace("部位ごとの負荷傾向指数：", "")}`);
  }
  lines.push("本人入力と数値表示は別の情報です。");
  return lines.join("\n");
}

export function createStandardConsultationText(report) {
  if (!report) return "";
  const lines = [
    "相談用レポート",
    `対象日：${report.date}`,
    `記録：${report.activity}`,
  ];
  if (report.courseName) lines.push(`コース：${report.courseName}`);
  if (report.personalContextItems.length) {
    lines.push("今日のシューズ・走り方：");
    report.personalContextItems.forEach((item) => lines.push(`- ${item}`));
  }
  const observationLines = bodyObservationLines(report);
  lines.push("本人が入力した身体記録：");
  if (observationLines.length) lines.push(...observationLines);
  else lines.push("- 部位入力なし");
  if (report.consultationNote) {
    lines.push(`本人が聞きたいこと：${report.consultationNote}`);
  }
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total;
    lines.push(`走行全体の比較用推定値：${Math.round(total.central * 10) / 10}推定ポイント`);
    lines.push(regionalText(report.modelReference.regional));
    if (report.rawFacts.rpe != null) {
      lines.push(`走り全体のきつさ（RPE）：${report.rawFacts.rpe}/10（数値表示とは分けて記載）`);
    }
  } else if (report.modelReference.state === "LEGACY_NO_V27") {
    lines.push("数値表示：この保存記録では比較値を表示できません");
  } else {
    lines.push("数値表示：休養記録のため走行の比較値なし");
  }
  lines.push("数値表示は走行記録を比べるための参考で、筋肉・腱・関節に加わった実際の力、診断、障害予測、原因、走行可否を示しません。");
  return lines.join("\n");
}

export function createDetailedConsultationText(report) {
  const standard = createStandardConsultationText(report);
  if (!report || !report.recent.length) return standard;
  const recent = report.recent.map((item) => {
    const model = item.total == null ? "" : `／走行全体の比較用推定値 ${Math.round(item.total * 10) / 10}`;
    const regional = hasFiniteValue(item.regional?.value)
      ? `／${item.regional.regionLabel} ${Math.round(item.regional.value)}`
      : "";
    const rpe = item.rpe == null ? "" : `／RPE ${item.rpe}`;
    return `- ${item.date}：${item.activity}${model}${regional}${rpe}`;
  });
  return `${standard}\n\n直近の記録（同じ意味で比べられる記録）：\n${recent.join("\n")}\n\nこの一覧は、相談相手に見せるための記録整理です。`;
}
