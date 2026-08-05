import {
  V27_EMPHASIS_REGION_IDS,
  V27_MODEL_VERSION,
  V27_REGIONAL_VIEW_IDS,
  V27_REGIONS,
} from "../core/model/v27/v27Constants.js";
import {
  BODY_PART_DISPLAY_NAMES,
  SUBJECTIVE_STATUS_LABELS,
  formatActivitySummary,
  getEnteredBodyParts,
} from "./recordPresentation.js";
import { bodyAreaLateralityLabel } from "../core/model/v27/bodyAreaTaxonomy.js";
import { reportedRpeValue } from "../core/safety/rpeProvenance.js";

const REGION_BY_ID = new Map(V27_REGIONS.map((region) => [region.id, region]));
const ALLOWED_REGION_IDS = new Set(V27_EMPHASIS_REGION_IDS);
const ALLOWED_VIEW_IDS = new Set(Object.values(V27_REGIONAL_VIEW_IDS));

const LEGACY_BODY_TO_REGION = Object.freeze({
  "腰骨盤部": "R01",
  "股関節臀部": "R02",
  "大腿": "R03",
  "膝": "R05",
  "前下腿": "R06",
  "後下腿": "R07",
  "アキレス腱": "R07",
  "足底部": "R08",
  "足関節・足背部": "R08",
});

const VIEW_DEFINITIONS = Object.freeze({
  [V27_REGIONAL_VIEW_IDS.withinRun]: Object.freeze({
    id: V27_REGIONAL_VIEW_IDS.withinRun,
    label: "今回の部位別表示",
    reference: "各走行日の6部位平均=100",
    shortReference: "6部位平均=100",
  }),
  [V27_REGIONAL_VIEW_IDS.ownFlat]: Object.freeze({
    id: V27_REGIONAL_VIEW_IDS.ownFlat,
    label: "同じ部位の基準との比較",
    reference: "各部位自身の平坦条件=100",
    shortReference: "各部位の平坦=100",
  }),
  [V27_REGIONAL_VIEW_IDS.personal]: Object.freeze({
    id: V27_REGIONAL_VIEW_IDS.personal,
    label: "本人の過去記録との比較",
    reference: "各走行時点より前の、同じ意味で比べられる過去中央値=100",
    shortReference: "保存時点の自分の過去中央値=100",
  }),
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function average(values = []) {
  return values.length
    ? values.reduce((sum, value) => sum + Number(value), 0) / values.length
    : null;
}

function numericSummary(values = []) {
  const finiteValues = values.filter(hasFiniteValue).map(Number);
  return Object.freeze({
    n: finiteValues.length,
    minimum: finiteValues.length ? Math.min(...finiteValues) : null,
    maximum: finiteValues.length ? Math.max(...finiteValues) : null,
    average: average(finiteValues),
  });
}

export function localTodayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseIsoDate(dateText = "") {
  const match = String(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (
    date.getUTCFullYear() !== Number(match[1])
    || date.getUTCMonth() !== Number(match[2]) - 1
    || date.getUTCDate() !== Number(match[3])
  ) return null;
  return date;
}

export function formatIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addDaysIso(dateText, days) {
  const date = parseIsoDate(dateText);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return formatIsoDate(date);
}

export function startOfWeekMonday(dateText) {
  const date = parseIsoDate(dateText);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return formatIsoDate(date);
}

export function dateRange(startDate, numberOfDays) {
  return Array.from(
    { length: Math.max(0, Number(numberOfDays || 0)) },
    (_, index) => addDaysIso(startDate, index),
  );
}

export function periodMeaning(period) {
  if (Number(period) === 7) return Object.freeze({
    title: "選択日までの7日間",
    description: "短い流れを見返します。月曜〜日曜の固定週は「週の振り返り」で確認します。",
  });
  if (Number(period) === 90) return Object.freeze({
    title: "選択日までの90日間",
    description: "長い期間の入力事実と同じ比較基準の値を見返します。身体状態や運動可否は評価しません。",
  });
  return Object.freeze({
    title: "選択日までの28日間（約1か月）",
    description: "同じ意味で比べられる記録の流れを見返します。月単位の成績ではありません。",
  });
}

function normalizePeriod(value) {
  return [7, 28, 90].includes(Number(value)) ? Number(value) : 28;
}

export function normalizeHistoryRegionId(value = "") {
  const requested = String(value || "");
  if (ALLOWED_REGION_IDS.has(requested)) return requested;
  const legacyMapped = LEGACY_BODY_TO_REGION[requested];
  return ALLOWED_REGION_IDS.has(legacyMapped) ? legacyMapped : "R05";
}

export function normalizeHistoryViewId(value = "") {
  const requested = String(value || "");
  return ALLOWED_VIEW_IDS.has(requested)
    ? requested
    : V27_REGIONAL_VIEW_IDS.withinRun;
}

export function historyRegionDefinition(regionId = "R05") {
  const normalized = normalizeHistoryRegionId(regionId);
  return REGION_BY_ID.get(normalized);
}

export function historyViewDefinition(viewId = V27_REGIONAL_VIEW_IDS.withinRun) {
  return VIEW_DEFINITIONS[normalizeHistoryViewId(viewId)];
}

function isFeedbackChecked(feedback = {}) {
  return !["not_asked", "deferred"].includes(String(feedback?.checkStatus || "not_asked"));
}

function recordDateMap(experiences = []) {
  const map = new Map();
  experiences.forEach((experience) => {
    if (!experience?.record?.date) return;
    const current = map.get(experience.record.date);
    if (!current || String(experience.record.id).localeCompare(String(current.record.id)) > 0) {
      map.set(experience.record.date, experience);
    }
  });
  return map;
}

function courseLabel(record = {}) {
  if (record.activityType === "rest") return "休養";
  return record.course?.name
    || {
      REF_HARD_EVEN_STABLE: "硬く平らで安定した路面",
      DRY_STABLE_GRASS_TURF: "乾いた安定した芝",
      DEEP_DRY_SOFT_SAND: "深く乾いた柔らかい砂",
      EXPLICIT_UNEVEN: "明確な凹凸・不整地",
      KNOWN_OTHER: "把握済み・記録のみ",
      UNKNOWN: "路面不明",
    }[record.course?.modelSurfaceClass]
    || "コース名なし";
}

function environmentSummary(record = {}) {
  if (record.activityType === "rest") return "休養";
  const items = [];
  if (record.course?.gradeKnowledge === "KNOWN_FLAT") items.push("平坦と把握");
  if (record.course?.gradeKnowledge === "KNOWN_PROFILE") {
    if (Number(record.course.upPercent || 0) > 0) {
      items.push(`上り${Number(record.course.upPercent)}%区間`);
    }
    if (Number(record.course.downPercent || 0) > 0) {
      items.push(`下り${Number(record.course.downPercent)}%区間`);
    }
  }
  if (record.course?.gradeKnowledge === "UNKNOWN") items.push("勾配不明");
  items.push(courseLabel(record));
  return items.join("・");
}

function regionalValueForExperience(experience, regionId, viewId) {
  const normalizedRegion = normalizeHistoryRegionId(regionId);
  const normalizedView = normalizeHistoryViewId(viewId);
  const definition = historyViewDefinition(normalizedView);
  const resultRecord = experience?.v27ResultRecord;
  if (!resultRecord) {
    return Object.freeze({
      state: experience?.record?.activityType === "run" ? "LEGACY_NO_V27" : "NOT_APPLICABLE",
      value: null,
      range: null,
      reference: definition.reference,
      viewId: normalizedView,
      regionId: normalizedRegion,
    });
  }
  if (resultRecord.state !== "RUN") {
    return Object.freeze({
      state: "REST",
      value: null,
      range: null,
      reference: definition.reference,
      viewId: normalizedView,
      regionId: normalizedRegion,
    });
  }
  const regional = resultRecord.result?.regional?.[normalizedRegion];
  if (!regional) {
    return Object.freeze({
      state: "UNAVAILABLE",
      value: null,
      range: null,
      reference: definition.reference,
      viewId: normalizedView,
      regionId: normalizedRegion,
    });
  }
  const common = {
    reference: definition.reference,
    viewId: normalizedView,
    regionId: normalizedRegion,
    endpoint: regional.endpoint,
    endpointConfidence: regional.endpoint_confidence,
    gradeCoverage: regional.grade_coverage,
    coverageSignature: regional.coverage_signature,
    modelVersion: resultRecord.model_version,
  };
  if (normalizedView === V27_REGIONAL_VIEW_IDS.withinRun) {
    const emphasis = resultRecord.result?.within_run_regional_emphasis;
    const row = emphasis?.rows?.find((item) => item.region_id === normalizedRegion);
    return Object.freeze({
      ...common,
      state: row ? "AVAILABLE" : emphasis?.state || "UNAVAILABLE",
      value: row?.relative_emphasis_index ?? null,
      range: row?.relative_emphasis_range || null,
      showRange: row?.show_range_primary === true,
    });
  }
  if (normalizedView === V27_REGIONAL_VIEW_IDS.ownFlat) {
    return Object.freeze({
      ...common,
      state: regional.primary_display_mode === "CONDITION_RESPONSIVE_NUMERIC"
        ? "AVAILABLE"
        : "UNAVAILABLE",
      value: regional.primary_display_mode === "CONDITION_RESPONSIVE_NUMERIC"
        ? regional.run_fact_regional_ratio
        : null,
      range: regional.condition_index_range || null,
      showRange: regional.show_range_primary === true,
    });
  }
  const personal = resultRecord.personal_reference_snapshots?.[normalizedRegion];
  return Object.freeze({
    ...common,
    state: personal?.state || "BUILDING_REFERENCE",
    value: personal?.value ?? null,
    range: null,
    showRange: false,
    eligibleN: Number(personal?.eligible_n || 0),
    firstDate: personal?.first_date || "",
    lastDate: personal?.last_date || "",
    targetExcluded: personal?.target_excluded === true,
  });
}

export function historyRegionalValue(experience, regionId, viewId) {
  return regionalValueForExperience(experience, regionId, viewId);
}

function subjectiveValueForRegion(feedback = {}, regionId = "R05") {
  if (!isFeedbackChecked(feedback)) return null;
  const mappedParts = Object.entries(LEGACY_BODY_TO_REGION)
    .filter(([, mappedRegion]) => mappedRegion === regionId)
    .map(([bodyPart]) => bodyPart);
  const values = mappedParts.flatMap((bodyPart) => {
    const fatigue = feedback.fatigueByBodyPart?.[bodyPart];
    const discomfort = feedback.discomfortByBodyPart?.[bodyPart];
    const reviewed = feedback.reviewedBodyParts?.[bodyPart] === true;
    return [fatigue, discomfort]
      .filter(hasFiniteValue)
      .map(Number)
      .filter((value) => reviewed || value > 0);
  });
  const exactObservations = Array.isArray(feedback.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => item?.modelRegionId === regionId)
    : [];
  exactObservations.forEach((item) => {
    if (hasFiniteValue(item.intensity)) values.push(Number(item.intensity));
  });
  return values.length ? Math.max(...values) : null;
}

function rowForDate(date, experience, regionId, viewId, plan = null) {
  const status = !experience
    ? "missing"
    : experience.record.activityType === "rest"
      ? "rest"
      : "run";
  const resultRecord = experience?.v27ResultRecord;
  const total = resultRecord?.state === "RUN" ? resultRecord.result?.total : null;
  const regional = experience
    ? regionalValueForExperience(experience, regionId, viewId)
    : null;
  return Object.freeze({
    date,
    experience,
    plan,
    status,
    totalLoad: hasFiniteValue(total?.central_points) ? Number(total.central_points) : null,
    totalRange: Array.isArray(total?.range_points) ? total.range_points : null,
    totalGradeCoverage: total?.grade_coverage ?? null,
    totalSurfaceCoverage: total?.surface_coverage ?? null,
    modelVersion: resultRecord?.model_version || "",
    legacy: status === "run" && !resultRecord,
    regional,
    regionalValue: hasFiniteValue(regional?.value) ? Number(regional.value) : null,
    feedbackChecked: experience ? isFeedbackChecked(experience.feedback || {}) : false,
    feedbackStatus: experience?.feedback?.checkStatus || (experience ? "not_asked" : "missing"),
    feedbackLabel: experience
      ? SUBJECTIVE_STATUS_LABELS[experience.feedback?.checkStatus] || "未確認"
      : "未記録",
    subjectiveValue: experience
      ? subjectiveValueForRegion(experience.feedback || {}, regionId)
      : null,
    environment: experience ? environmentSummary(experience.record) : "未記録",
    rpe: status === "run" && reportedRpeValue(experience?.record || {}) != null
      ? reportedRpeValue(experience.record)
      : null,
  });
}

function planForDate(plans, date) {
  return plans.find((plan) => plan.scheduledDate === date) || null;
}

function buildCourseGroups(experiences, regionId, viewId) {
  const groups = new Map();
  experiences
    .filter((experience) => experience?.record?.activityType === "run")
    .forEach((experience) => {
      const label = courseLabel(experience.record);
      const current = groups.get(label) || {
        label,
        count: 0,
        v27Count: 0,
        distanceKm: 0,
        totals: [],
        regionalValues: [],
      };
      current.count += 1;
      current.distanceKm += Number(experience.record.distanceKm || 0);
      if (experience.v27ResultRecord?.state === "RUN") {
        current.v27Count += 1;
        const total = experience.v27ResultRecord.result?.total?.central_points;
        if (hasFiniteValue(total)) current.totals.push(Number(total));
        const regional = regionalValueForExperience(experience, regionId, viewId);
        if (hasFiniteValue(regional.value)) current.regionalValues.push(Number(regional.value));
      }
      groups.set(label, current);
    });
  return [...groups.values()]
    .map((group) => Object.freeze({
      label: group.label,
      count: group.count,
      v27Count: group.v27Count,
      distanceKm: group.distanceKm,
      averageTotal: average(group.totals),
      averageRegionalValue: average(group.regionalValues),
      regionalN: group.regionalValues.length,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "ja-JP"));
}

export function buildHistoryWorkspace({
  services,
  anchorRecordId = "",
  anchorDate = "",
  period = 28,
  regionId = "",
  viewId = "",
  bodyPart = "",
} = {}) {
  const experiences = services.workflows.records.loadAllExperiences()
    .filter(Boolean)
    .sort((left, right) => (
      left.record.date.localeCompare(right.record.date)
      || left.record.id.localeCompare(right.record.id)
    ));
  if (!experiences.length) return null;
  const normalizedPeriod = normalizePeriod(period);
  const selectedRegionId = normalizeHistoryRegionId(regionId || bodyPart);
  const selectedViewId = normalizeHistoryViewId(viewId);
  const latest = experiences.at(-1);
  const requestedEndDate = parseIsoDate(anchorDate) ? anchorDate : "";
  const anchor = experiences.find((item) => item.record.id === anchorRecordId)
    || [...experiences].reverse().find((item) => item.record.date === requestedEndDate)
    || [...experiences].reverse().find((item) => !requestedEndDate || item.record.date <= requestedEndDate)
    || latest;
  const anchorIndex = experiences.findIndex((item) => item.record.id === anchor.record.id);
  const endDate = requestedEndDate || anchor.record.date;
  const startDate = addDaysIso(endDate, -(normalizedPeriod - 1));
  const dates = dateRange(startDate, normalizedPeriod);
  const byDate = recordDateMap(experiences);
  const rows = dates.map((date) => rowForDate(
    date,
    byDate.get(date) || null,
    selectedRegionId,
    selectedViewId,
  ));
  const periodExperiences = rows.map((row) => row.experience).filter(Boolean);
  const checkedCount = rows.filter((row) => row.experience && row.feedbackChecked).length;
  const pendingRows = rows.filter((row) => row.experience && !row.feedbackChecked);
  return Object.freeze({
    anchor: clone(anchor),
    previous: clone(experiences[anchorIndex - 1] || null),
    next: clone(experiences[anchorIndex + 1] || null),
    latest: clone(latest),
    period: normalizedPeriod,
    startDate,
    endDate,
    selectedDate: anchor.record.date,
    anchorMatchesEndDate: anchor.record.date === endDate,
    dates,
    rows,
    experiences: periodExperiences,
    selectedRegionId,
    selectedRegion: historyRegionDefinition(selectedRegionId),
    selectedViewId,
    selectedView: historyViewDefinition(selectedViewId),
    counts: Object.freeze({
      run: rows.filter((row) => row.status === "run").length,
      rest: rows.filter((row) => row.status === "rest").length,
      missing: rows.filter((row) => row.status === "missing").length,
      saved: periodExperiences.length,
      checked: checkedCount,
      pending: pendingRows.length,
      v27: rows.filter((row) => row.modelVersion === V27_MODEL_VERSION).length,
      legacy: rows.filter((row) => row.legacy).length,
      regionalAvailable: rows.filter((row) => hasFiniteValue(row.regionalValue)).length,
    }),
    pendingRows,
    totalStats: numericSummary(rows.map((row) => row.totalLoad)),
    regionalStats: numericSummary(rows.map((row) => row.regionalValue)),
    subjectiveStats: numericSummary(rows.map((row) => row.subjectiveValue)),
    courses: buildCourseGroups(periodExperiences, selectedRegionId, selectedViewId),
  });
}

export function buildWeeklyWorkspace({
  services,
  anchorDate = "",
  regionId = "",
  viewId = "",
} = {}) {
  const experiences = services.workflows.records.loadAllExperiences().filter(Boolean);
  const latest = [...experiences].sort((left, right) => (
    right.record.date.localeCompare(left.record.date)
    || right.record.id.localeCompare(left.record.id)
  ))[0] || null;
  const selectedDate = parseIsoDate(anchorDate)
    ? anchorDate
    : latest?.record?.date || localTodayIso();
  const selectedRegionId = normalizeHistoryRegionId(regionId);
  const selectedViewId = normalizeHistoryViewId(viewId);
  const weekStart = startOfWeekMonday(selectedDate);
  const weekEnd = addDaysIso(weekStart, 6);
  const previousWeekStart = addDaysIso(weekStart, -7);
  const byDate = recordDateMap(experiences);
  const plans = services.storage.plans.loadAll();
  const days = dateRange(weekStart, 7).map((date) => rowForDate(
    date,
    byDate.get(date) || null,
    selectedRegionId,
    selectedViewId,
    planForDate(plans, date),
  ));
  const previousDays = dateRange(previousWeekStart, 7).map((date) => rowForDate(
    date,
    byDate.get(date) || null,
    selectedRegionId,
    selectedViewId,
    planForDate(plans, date),
  ));
  const weekExperiences = days.map((day) => day.experience).filter(Boolean);
  const runTotals = days.map((day) => day.totalLoad).filter(hasFiniteValue).map(Number);
  const previousRunTotals = previousDays.map((day) => day.totalLoad).filter(hasFiniteValue).map(Number);
  const regionalValues = days.map((day) => day.regionalValue).filter(hasFiniteValue).map(Number);
  const pendingDays = days.filter((day) => day.experience && !day.feedbackChecked);
  const outcomePlans = plans.filter((plan) => (
    plan.scheduledDate >= weekStart
    && plan.scheduledDate <= weekEnd
    && (plan.actualRecordId || plan.outcomeStatus)
  ));
  const routeWeight = { normal: 0, review: 1, consult: 2, urgent: 3 };
  const supportPriority = weekExperiences
    .map((item) => item.supportDecision?.route || "normal")
    .sort((left, right) => (routeWeight[right] || 0) - (routeWeight[left] || 0))[0]
    || "normal";
  const latestWeekExperience = [...weekExperiences].sort((left, right) => (
    right.record.date.localeCompare(left.record.date)
    || right.record.id.localeCompare(left.record.id)
  ))[0] || null;
  const runAverageLoad = average(runTotals);
  const previousRunAverageLoad = average(previousRunTotals);
  return Object.freeze({
    anchorDate: selectedDate,
    selectedDate,
    weekStart,
    weekEnd,
    previousWeekStart,
    nextWeekStart: addDaysIso(weekStart, 7),
    days,
    previousDays,
    experiences: weekExperiences,
    latestWeekExperience: clone(latestWeekExperience),
    selectedRegionId,
    selectedRegion: historyRegionDefinition(selectedRegionId),
    selectedViewId,
    selectedView: historyViewDefinition(selectedViewId),
    counts: Object.freeze({
      run: days.filter((day) => day.status === "run").length,
      rest: days.filter((day) => day.status === "rest").length,
      missing: days.filter((day) => day.status === "missing").length,
      checked: days.filter((day) => day.experience && day.feedbackChecked).length,
      pending: pendingDays.length,
      v27: days.filter((day) => day.modelVersion === V27_MODEL_VERSION).length,
      legacy: days.filter((day) => day.legacy).length,
    }),
    pendingDays,
    runTotalLoad: runTotals.reduce((sum, value) => sum + value, 0),
    runAverageLoad,
    previousRunAverageLoad,
    runAverageDifference: runAverageLoad != null && previousRunAverageLoad != null
      ? runAverageLoad - previousRunAverageLoad
      : null,
    regionalAverage: average(regionalValues),
    regionalN: regionalValues.length,
    outcomePlans: clone(outcomePlans),
    supportPriority,
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  const protectedText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

export function historyWorkspaceCsv(workspace) {
  const headers = [
    "date",
    "status",
    "model_version",
    "total_central_points",
    "total_range_low",
    "total_range_high",
    "total_grade_coverage",
    "total_surface_coverage",
    "view_id",
    "view_reference",
    "region_id",
    "region_label",
    "regional_state",
    "regional_value",
    "regional_range_low",
    "regional_range_high",
    "endpoint",
    "endpoint_confidence",
    "coverage_signature",
    "personal_eligible_n",
    "personal_first_date",
    "personal_last_date",
    "subjective_status",
    "subjective_value_separate",
    "distance_km",
    "active_minutes",
    "rpe_separate",
    "course_or_surface",
  ];
  const rows = workspace.rows.map((row) => {
    const record = row.experience?.record || {};
    const regional = row.regional || {};
    return [
      row.date,
      row.status,
      row.modelVersion,
      row.totalLoad ?? "",
      row.totalRange?.[0] ?? "",
      row.totalRange?.[1] ?? "",
      row.totalGradeCoverage ?? "",
      row.totalSurfaceCoverage ?? "",
      workspace.selectedViewId,
      workspace.selectedView.reference,
      workspace.selectedRegionId,
      workspace.selectedRegion.label,
      regional.state || (row.status === "missing" ? "MISSING" : ""),
      row.regionalValue ?? "",
      regional.range?.[0] ?? "",
      regional.range?.[1] ?? "",
      regional.endpoint || "",
      regional.endpointConfidence || "",
      regional.coverageSignature || "",
      regional.eligibleN ?? "",
      regional.firstDate || "",
      regional.lastDate || "",
      row.feedbackStatus,
      row.subjectiveValue ?? "",
      record.distanceKm ?? "",
      record.durationMinutes ?? "",
      row.rpe ?? "",
      row.experience ? courseLabel(record) : "",
    ];
  });
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function historyRecordSearchText(experience = {}) {
  const enteredParts = getEnteredBodyParts(experience.feedback || {})
    .map((part) => BODY_PART_DISPLAY_NAMES[part] || part);
  const exactAreas = Array.isArray(experience.feedback?.bodyAreaObservations)
    ? experience.feedback.bodyAreaObservations.flatMap((item) => [
      item.label || "詳細部位",
      bodyAreaLateralityLabel(item.laterality),
    ])
    : [];
  return [
    experience.record?.date,
    formatActivitySummary(experience.record || {}),
    experience.record?.course?.name,
    experience.record?.memo,
    experience.record?.course?.gradeKnowledge,
    experience.record?.course?.modelSurfaceClass,
    ...enteredParts,
    ...exactAreas,
  ].join(" ").toLocaleLowerCase("ja-JP");
}
