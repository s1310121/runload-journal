import { BODY_PARTS } from "../model/modelConstants.js";
import { REGIONS } from "../model/regionalV1/engine/data.js";
import {
  buildA7ConditionComparisonSignature,
  buildA7RegionSemanticDecomposition,
  compareA7ConditionSignatures,
  regionalV1EndpointMeta,
  regionalV1ExposureMeta,
} from "../model/regionalV1/regionalV1ResultService.js";
import { bodyAreaLateralityLabel } from "../model/v27/bodyAreaTaxonomy.js";
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

const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";
const CONDITION_REFERENCE_TEXT = "この部位・同じ根拠系列の基準=100";

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function finiteOrNull(value) {
  return hasFiniteValue(value) ? Number(value) : null;
}

function normalizeRegionId(value = "") {
  const requested = String(value || "");
  return REGION_BY_ID.has(requested) ? requested : DEFAULT_REGION_ID;
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

function resultRow(experience, regionId) {
  return experience?.regionalV1Result?.regions?.find((row) => row.regionId === regionId)
    || experience?.regionalV1ResultRecord?.result?.regions?.find((row) => row.regionId === regionId)
    || null;
}

function semanticFor(experience, row) {
  const stored = experience?.regionalV1ResultRecord?.a7_region_semantics?.[row?.regionId];
  return stored && typeof stored === "object"
    ? stored
    : row ? buildA7RegionSemanticDecomposition(row) : null;
}

function exposureReference(row, semantic) {
  const meta = regionalV1ExposureMeta(row || {});
  const exposure = semantic?.commonRunningExposure || {};
  return Object.freeze({
    status: exposure.status || "UNAVAILABLE",
    basis: exposure.basis || meta.basis || null,
    label: meta.label,
    shortLabel: meta.shortLabel,
    unit: meta.unit,
    qEquivalent: finiteOrNull(exposure.qEquivalent),
    qReference: finiteOrNull(exposure.qReference),
    ratioExact: finiteOrNull(exposure.ratioExact),
    fallbackStatus: exposure.fallbackStatus || meta.fallbackStatus || "NONE",
  });
}

function regionalReference(experience, regionId) {
  const region = REGION_BY_ID.get(regionId);
  const base = {
    regionId,
    regionLabel: region?.name || regionId,
    state: "UNAVAILABLE",
    value: null,
    delta: null,
    reference: CONDITION_REFERENCE_TEXT,
    referenceDefinitionId: null,
    endpoint: regionalV1EndpointMeta({}),
    exposure: exposureReference(null, null),
    phase0NumericFamilyStatus: null,
    routeFamilySignature: null,
  };
  if (experience?.record?.activityType === "rest") {
    return Object.freeze({ ...base, state: "REST" });
  }
  const row = resultRow(experience, regionId);
  if (!row) return Object.freeze(base);
  const semantic = semanticFor(experience, row);
  const condition = semantic?.regionalConditionResponse || {};
  const ratio = condition.status === "SUPPORTED_NUMERIC"
    ? finiteOrNull(condition.ratioExact)
    : null;
  const signature = buildA7ConditionComparisonSignature(
    experience?.regionalV1ResultRecord || experience?.regionalV1Result || {},
    row,
  );
  return Object.freeze({
    ...base,
    state: condition.status || "UNAVAILABLE",
    value: ratio === null ? null : 100 * ratio,
    delta: ratio === null ? null : 100 * (ratio - 1),
    referenceDefinitionId: row.referenceDefinitionId || null,
    endpoint: regionalV1EndpointMeta(row),
    exposure: exposureReference(row, semantic),
    phase0NumericFamilyStatus: condition.phase0NumericFamilyStatus || null,
    routeFamilySignature: signature?.routeFamilySignature || null,
  });
}

function totalReference(experience) {
  const resultRecord = experience?.v27ResultRecord;
  if (!resultRecord || resultRecord.state !== "RUN") return null;
  const total = resultRecord.result?.total;
  return Object.freeze({
    central: finiteOrNull(total?.central_points),
    range: Array.isArray(total?.range_points) ? [...total.range_points] : null,
    showRange: total?.show_range_primary === true,
    gradeCoverage: finiteOrNull(total?.grade_coverage),
    surfaceCoverage: finiteOrNull(total?.surface_coverage),
    pairingState: String(total?.pairing_state || ""),
  });
}

function modelReference(experience, regionId) {
  const isRest = experience?.record?.activityType === "rest";
  const total = totalReference(experience);
  const regional = regionalReference(experience, regionId);
  const rpeWasReported = reportedRpeValue(experience?.record || {}) != null;
  const internal = experience?.v27ResultRecord?.result?.internal;
  return Object.freeze({
    modelVersion: String(
      experience?.regionalV1ResultRecord?.model_version
      || experience?.v27ResultRecord?.model_version
      || "",
    ),
    state: isRest ? "REST" : total || regional.state !== "UNAVAILABLE" ? "RUN" : "NO_NUMERIC_RESULT",
    total,
    regional,
    internalResponse: isRest ? null : Object.freeze({
      state: rpeWasReported ? String(internal?.state || "UNKNOWN") : "UNKNOWN",
      srpeAu: rpeWasReported ? finiteOrNull(internal?.srpe_au) : null,
      separateFromRunFactModel: internal?.separate_from_objective_model === true,
    }),
  });
}

function recordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

function recentFacts(allExperiences, target, regionId) {
  const currentRow = resultRow(target, regionId);
  const currentSignature = currentRow
    ? buildA7ConditionComparisonSignature(
      target?.regionalV1ResultRecord || target?.regionalV1Result || {},
      currentRow,
    )
    : null;
  return [...allExperiences]
    .filter((item) => item?.record?.id && item.record.id !== target?.record?.id)
    .filter((item) => recordChronology(item, target) < 0)
    .sort((left, right) => recordChronology(right, left))
    .slice(0, 14)
    .map((item) => {
      const row = resultRow(item, regionId);
      const signature = row
        ? buildA7ConditionComparisonSignature(
          item?.regionalV1ResultRecord || item?.regionalV1Result || {},
          row,
        )
        : null;
      const compatibility = compareA7ConditionSignatures(currentSignature, signature);
      const regional = regionalReference(item, regionId);
      return Object.freeze({
        recordId: item.record.id,
        date: item.record.date,
        activity: activitySummary(item.record),
        activityType: item.record.activityType === "rest" ? "rest" : "run",
        total: totalReference(item)?.central ?? null,
        regionalState: regional.state,
        regionalValue: compatibility.directDeltaAllowed ? regional.value : null,
        regionalDirectComparable: compatibility.directDeltaAllowed,
        regionalExclusionReasons: compatibility.differences,
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
  const feedback = experience.feedback || {};
  const entered = enteredBodyParts(feedback);
  const personal = summarizePersonalContext(experience.record.personalContext || {});
  const exactObservations = normalizeExactObservations(feedback);
  const recent = recentFacts(allExperiences, experience, regionId);
  return Object.freeze({
    reportVersion: "runload-consultation-report-a7-final-1.0",
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
    modelReference: modelReference(experience, regionId),
    recent: Object.freeze(recent),
    comparisonCounts: Object.freeze({
      direct: recent.filter((item) => item.regionalDirectComparable && hasFiniteValue(item.regionalValue)).length,
      excluded: recent.filter((item) => !item.regionalDirectComparable).length,
      nonnumeric: recent.filter((item) => item.regionalDirectComparable && !hasFiniteValue(item.regionalValue)).length,
    }),
    claimBoundary: Object.freeze({
      subjectiveAndModelAreSeparate: true,
      conditionAndExposureAreSeparate: true,
      unsupportedIsNeverReferenceOne: true,
      isDiagnosis: false,
      predictsInjury: false,
      provesCause: false,
      guaranteesSafety: false,
      determinesRunOrNoRun: false,
      isMeasuredPhysicalRegionalLoad: false,
      isAnatomicalShare: false,
    }),
  });
}

function exposureText(exposure = {}) {
  if (exposure.status !== "NUMERIC") return "共通走行量：数値なし";
  const current = hasFiniteValue(exposure.qEquivalent) ? Number(exposure.qEquivalent) : null;
  const reference = hasFiniteValue(exposure.qReference) ? Number(exposure.qReference) : null;
  if (current !== null && reference !== null) {
    return `共通走行量：${exposure.shortLabel} ${current}${exposure.unit}（表示上の基準 ${reference}${exposure.unit}）`;
  }
  return "共通走行量：記録あり（部位の条件応答とは別表示）";
}

function regionalText(regional) {
  if (!regional || !hasFiniteValue(regional.value)) {
    const label = regional?.regionLabel || "選択した部位";
    return `部位の条件応答：${label}／数値なし（根拠不足のため100で補完しません）`;
  }
  const rounded = Math.round(Number(regional.value) * 10) / 10;
  return `部位の条件応答：${regional.regionLabel} ${rounded}／${regional.reference}`;
}

function bodyObservationLines(report) {
  const exact = report.exactBodyObservations.map((item) => {
    const details = [];
    if (item.lateralityLabel) details.push(item.lateralityLabel);
    if (item.intensity != null) details.push(`程度 ${item.intensity}/5`);
    if (item.sensation) details.push(item.sensation);
    return `- ${item.label}${details.length ? `：${details.join("・")}` : ""}`;
  });
  const saved = report.subjectiveParts.map((item) => {
    const details = [];
    if (item.fatigue > 0) details.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (item.discomfort > 0) details.push(`気になる感じ ${item.discomfort}/5`);
    return `- ${item.label}：${details.join("・") || "確認済み"}`;
  });
  return [...exact, ...saved];
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
  if (observations.length) lines.push(`本人が記録した部位：${[...new Set(observations)].join("、")}。`);
  if (report.consultationNote) lines.push(`聞きたいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    if (hasFiniteValue(total)) lines.push(`走行全体の比較用推定値：${Math.round(total * 10) / 10}推定ポイント`);
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
  }
  lines.push("本人入力、走行全体、部位の条件応答、共通走行量は別の情報です。");
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
  lines.push(...(observationLines.length ? observationLines : ["- 部位入力なし"]));
  if (report.consultationNote) lines.push(`本人が聞きたいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    lines.push(hasFiniteValue(total)
      ? `走行全体の比較用推定値：${Math.round(total * 10) / 10}推定ポイント`
      : "走行全体の比較用推定値：数値なし");
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
    lines.push("部位条件応答の基準100は、安全値・正常値・初心者平均・部位間比較の共通尺度ではありません。");
    if (report.rawFacts.rpe != null) {
      lines.push(`走り全体のきつさ（RPE）：${report.rawFacts.rpe}/10（数値表示とは分けて記載）`);
    }
  } else if (report.modelReference.state === "REST") {
    lines.push("数値表示：休養記録のため走行の比較値なし");
  } else {
    lines.push("数値表示：この保存記録では比較値を表示できません");
  }
  lines.push("数値表示は走行記録を比べるための参考で、筋肉・腱・関節に加わった実際の力、診断、障害予測、原因、走行可否を示しません。");
  return lines.join("\n");
}

export function createDetailedConsultationText(report) {
  const standard = createStandardConsultationText(report);
  if (!report || !report.recent.length) return standard;
  const regionLabel = report.modelReference.regional?.regionLabel || "選択した部位";
  const recent = report.recent.map((item) => {
    const total = item.total == null ? "走行全体 数値なし" : `走行全体 ${Math.round(item.total * 10) / 10}`;
    const regional = item.regionalDirectComparable && hasFiniteValue(item.regionalValue)
      ? `${regionLabel}の条件応答 ${Math.round(item.regionalValue * 10) / 10}`
      : `${regionLabel}の条件応答 直接比較しない`;
    const rpe = item.rpe == null ? "" : `／RPE ${item.rpe}`;
    return `- ${item.date}：${item.activity}／${total}／${regional}${rpe}`;
  });
  return `${standard}\n\n最近の保存記録：\n${recent.join("\n")}\n\n条件応答の数値差は、同じ部位・同じ条件系列・同じReferenceなどの署名が一致する記録だけで扱います。速度系列と勾配系列を直接つなぎません。`;
}
