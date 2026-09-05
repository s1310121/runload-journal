import { renderRecordsWorkspaceNavigation } from "../ui/screenArchitecture.js";
import { REGIONS } from "../core/model/regionalV1/engine/data.js";
import { bodyRegionFormalName, bodyRegionPlainMeaning } from "../ui/bodyRegionTerminology.js";
import {
  buildA7ConditionComparisonSignature,
  buildA7RegionSemanticDecomposition,
  compareA7ConditionSignatures,
} from "../core/model/regionalV1/regionalV1ResultService.js";
import {
  escapeHtml,
  renderEmptyState,
  renderPageHeading,
  renderScreenGuide,
  renderStatusLabel,
} from "../ui/commonComponents.js";
import { addDaysIso, localTodayIso, parseIsoDate } from "../ui/historyPresentation.js";
import {
  formatActivitySummary,
  formatLocalDate,
  formatNumber,
} from "../ui/recordPresentation.js";
import { bodyAreaLateralityLabel } from "../core/model/v27/bodyAreaTaxonomy.js";
import { median, modelTotalValue } from "../ui/resultPresentation.js";
import { NEW_MODEL_V1_MODEL_VERSION, buildNewModelV1ComparisonSignature, compareNewModelV1Signatures } from "../core/model/newModelV1/newModelV1ResultService.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } from "../core/model/nextPrimaryR12Candidate/primaryRegionalV2ResultService.js";

const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";
const TOTAL_MINIMUM_PRIOR = 3;

function isReference100ModelVersion(value = "") {
  return [NEW_MODEL_V1_MODEL_VERSION, PRIMARY_REGIONAL_V2_MODEL_VERSION].includes(String(value || ""));
}

function reference100DistanceKm(resultRecord = {}, experience = null) {
  const input = resultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || experience?.record?.runningFormat || "").toUpperCase() === "RUN_WALK";
  if (resultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
    const value = Number(runWalk ? input.runningDistanceKm : input.distanceKm);
    if (value > 0) return value;
  }
  const legacyInputDistance = Number(input.distanceKm);
  if (legacyInputDistance > 0) return legacyInputDistance;
  const record = experience?.record || {};
  const recordDistance = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  return recordDistance > 0 ? recordDistance : null;
}

function buildHref(values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/history${query.size ? `?${query.toString()}` : ""}`;
}

function normalizedPeriod(value) {
  return [7, 28, 90, 180].includes(Number(value)) ? Number(value) : 28;
}

function normalizedView(value) {
  return value === "trends" ? "trends" : "records";
}

function normalizedMetric(value) {
  return ["total", "subjective"].includes(String(value || "")) ? String(value) : "region";
}

function normalizedRegionId(value) {
  return REGION_BY_ID.has(String(value || "")) ? String(value) : DEFAULT_REGION_ID;
}

function normalizedRegionalDisplay(value) {
  return String(value || "").toLowerCase() === "value" ? "value" : "ratio";
}

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function resultRow(resultRecord, regionId) {
  return resultRecord?.result?.regions?.find((row) => row.regionId === regionId) || null;
}

function recordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

function subjectiveKey(areaId = "", laterality = "") {
  return `${String(areaId || "")}::${String(laterality || "")}`;
}

function parseSubjectiveKey(value = "") {
  const [areaId = "", laterality = ""] = String(value || "").split("::");
  return Object.freeze({ areaId, laterality });
}

function buildWorkspace(services, context) {
  const allExperiences = services.workflows.records.loadAllExperiences()
    .filter(Boolean)
    .sort(recordChronology);
  if (!allExperiences.length) return null;

  const period = normalizedPeriod(context.parameters.get("period"));
  const view = normalizedView(context.parameters.get("view"));
  const metric = normalizedMetric(context.parameters.get("metric"));
  const regionId = normalizedRegionId(context.parameters.get("regionId"));
  const regionalDisplay = normalizedRegionalDisplay(context.parameters.get("display"));
  const requestedRecordId = context.parameters.get("recordId") || "";
  const requestedDate = context.parameters.get("anchorDate") || "";
  const latestDate = allExperiences.at(-1)?.record?.date || localTodayIso();
  const endDate = parseIsoDate(requestedDate) ? requestedDate : latestDate;
  const startDate = addDaysIso(endDate, -(period - 1));
  const notebookState = services.storage.notebook.loadState();
  const noteByDate = new Map((notebookState.pages || []).map((page) => [page.date, page]));
  const regionalByRecord = services.storage.modelResultsRegionalV1.latestByRecord();

  const periodExperiences = allExperiences.filter((experience) => (
    experience.record.date >= startDate && experience.record.date <= endDate
  ));
  const rows = periodExperiences.map((experience) => {
    const resultRecord = regionalByRecord.get(experience.record.id) || experience.regionalV1ResultRecord || null;
    const row = resultRow(resultRecord, regionId);
    return Object.freeze({
      experience,
      resultRecord,
      row,
      totalValue: experience.v27ResultRecord ? modelTotalValue(experience) : null,
      note: noteByDate.get(experience.record.date) || null,
    });
  });

  const semanticRows = rows.map((item) => {
    const modelVersion = item.resultRecord?.model_version || "";
    const isNew = modelVersion === NEW_MODEL_V1_MODEL_VERSION;
    const isPrimary = modelVersion === PRIMARY_REGIONAL_V2_MODEL_VERSION;
    const isReference100 = isReference100ModelVersion(modelVersion);
    const semantic = item.row && !isReference100
      ? item.resultRecord?.a7_region_semantics?.[item.row.regionId] || buildA7RegionSemanticDecomposition(item.row)
      : null;
    const ratio = semantic?.regionalConditionResponse?.ratioExact;
    const conditionIndexExact = isReference100
      ? (finite(item.row?.value) ? Number(item.row.value) : null)
      : (finite(ratio) && Number(ratio) > 0 ? 100 * Number(ratio) : null);
    const signature = item.row
      ? (isPrimary
        ? buildPrimaryRegionalV2ComparisonSignature(item.resultRecord, item.row)
        : (isNew ? buildNewModelV1ComparisonSignature(item.resultRecord, item.row) : buildA7ConditionComparisonSignature(item.resultRecord || item.resultRecord?.result || {}, item.row)))
      : null;
    const distanceKm = isReference100 ? reference100DistanceKm(item.resultRecord, item.experience) : null;
    const referenceValue = isReference100 && finite(distanceKm) ? 100 * Number(distanceKm) : 100;
    const referenceDelta = finite(conditionIndexExact) && finite(referenceValue) ? Number(conditionIndexExact) - Number(referenceValue) : null;
    return Object.freeze({ ...item, semantic, conditionIndexExact, signature, isNewModelV1: isNew, isPrimaryRegionalV2: isPrimary, isReference100, referenceDistanceKm: distanceKm, referenceValue, referenceDelta });
  });
  const requestedAnchor = requestedRecordId
    ? semanticRows.find((item) => item.experience.record.id === requestedRecordId && item.row) || null
    : null;
  const anchor = requestedAnchor
    || [...semanticRows].reverse().find((item) => item.signature && finite(item.conditionIndexExact))
    || [...semanticRows].reverse().find((item) => item.row)
    || [...semanticRows].reverse()[0]
    || null;
  const anchorSignature = anchor?.signature || null;
  const trendRows = semanticRows.map((item) => {
    let compatibility;
    if (!anchorSignature || !item.signature) {
      compatibility = Object.freeze({ status: "INCOMPATIBLE", differences: Object.freeze(["COMPARISON_SIGNATURE_MISSING"]), directDeltaAllowed: false });
    } else if (anchor?.isPrimaryRegionalV2 && item.isPrimaryRegionalV2) {
      compatibility = comparePrimaryRegionalV2Signatures(anchorSignature, item.signature);
    } else if (anchor?.isNewModelV1 && item.isNewModelV1) {
      compatibility = compareNewModelV1Signatures(anchorSignature, item.signature);
    } else if (!anchor?.isReference100 && !item.isReference100) {
      compatibility = compareA7ConditionSignatures(anchorSignature, item.signature);
    } else {
      compatibility = Object.freeze({ status: "INCOMPATIBLE", differences: Object.freeze(["MODEL_SEMANTIC_GENERATION_MISMATCH"]), directDeltaAllowed: false });
    }
    return Object.freeze({ ...item, compatibility });
  });

  const totalRows = rows
    .filter((item) => item.experience.record.activityType === "run" && finite(item.totalValue))
    .sort((left, right) => recordChronology(left.experience, right.experience));
  const totalAnchor = totalRows.find((item) => item.experience.record.id === requestedRecordId)
    || totalRows.at(-1)
    || null;
  const totalReferenceRows = totalAnchor
    ? totalRows.filter((item) => item.experience.record.id !== totalAnchor.experience.record.id)
      .filter((item) => recordChronology(item.experience, totalAnchor.experience) < 0)
    : [];
  const totalMedian = totalReferenceRows.length >= TOTAL_MINIMUM_PRIOR
    ? median(totalReferenceRows.map((item) => item.totalValue))
    : null;

  const observationRows = rows.flatMap((item) => (
    (item.experience.feedback?.bodyAreaObservations || [])
      .filter((observation) => Number(observation?.intensity) > 0 && observation?.areaId)
      .map((observation) => Object.freeze({ ...item, observation }))
  ));
  const optionMap = new Map();
  observationRows.forEach((item) => {
    const key = subjectiveKey(item.observation.areaId, item.observation.laterality);
    if (!optionMap.has(key)) optionMap.set(key, Object.freeze({
      key,
      areaId: item.observation.areaId,
      laterality: item.observation.laterality || "",
      label: item.observation.label || "詳細部位",
    }));
  });
  const subjectiveOptions = [...optionMap.values()];
  const queryKey = context.parameters.get("subjectiveKey") || subjectiveKey(
    context.parameters.get("areaId") || "",
    context.parameters.get("laterality") || "",
  );
  const requestedSubjective = parseSubjectiveKey(queryKey);
  const selectedSubjective = subjectiveOptions.find((item) => (
    item.areaId === requestedSubjective.areaId
      && (!requestedSubjective.laterality || item.laterality === requestedSubjective.laterality)
  )) || subjectiveOptions.at(-1) || null;
  const subjectiveRows = selectedSubjective
    ? observationRows
      .filter((item) => item.observation.areaId === selectedSubjective.areaId)
      .filter((item) => !selectedSubjective.laterality || item.observation.laterality === selectedSubjective.laterality)
      .sort((left, right) => recordChronology(left.experience, right.experience))
    : [];

  const plans = services.storage.plans.loadAll().filter((plan) => (
    plan.scheduledDate >= startDate && plan.scheduledDate <= endDate
  ));
  return Object.freeze({
    period,
    view,
    metric,
    regionId,
    region: REGION_BY_ID.get(regionId),
    regionalDisplay,
    requestedRecordId,
    startDate,
    endDate,
    rows,
    trendRows,
    anchor,
    anchorSignature,
    totalRows,
    totalAnchor,
    totalReferenceRows,
    totalMedian,
    subjectiveOptions,
    selectedSubjective,
    subjectiveRows,
    plans,
    counts: Object.freeze({
      run: rows.filter((item) => item.experience.record.activityType === "run").length,
      rest: rows.filter((item) => item.experience.record.activityType === "rest").length,
      notes: rows.filter((item) => item.note).length,
      regional: rows.filter((item) => item.row).length,
      comparable: trendRows.filter((item) => item.compatibility.directDeltaAllowed && finite(item.conditionIndexExact)).length,
      total: totalRows.length,
      subjective: observationRows.length,
    }),
  });
}

function sharedParameters(workspace) {
  return {
    period: workspace.period,
    anchorDate: workspace.endDate,
    regionId: workspace.regionId,
    metric: workspace.metric,
    recordId: workspace.requestedRecordId,
    areaId: workspace.selectedSubjective?.areaId,
    laterality: workspace.selectedSubjective?.laterality,
  };
}

function renderTabs(workspace) {
  const shared = sharedParameters(workspace);
  return `<nav class="view-tabs history-unified-tabs" aria-label="履歴の表示">
    <a class="view-tab${workspace.view === "records" ? " is-current" : ""}" href="${escapeHtml(buildHref({ ...shared, view: "records" }))}"${workspace.view === "records" ? ' aria-current="page"' : ""}>記録一覧</a>
    <a class="view-tab${workspace.view === "trends" ? " is-current" : ""}" href="${escapeHtml(buildHref({ ...shared, view: "trends" }))}"${workspace.view === "trends" ? ' aria-current="page"' : ""}>推移を見る</a>
  </nav>`;
}

function renderPeriodTabs(workspace) {
  const shared = sharedParameters(workspace);
  return `<nav class="period-tabs" aria-label="表示期間">${[7, 28, 90, 180].map((period) => `<a class="period-tab${workspace.period === period ? " is-current" : ""}" href="${escapeHtml(buildHref({ ...shared, view: workspace.view, period }))}"${workspace.period === period ? ' aria-current="page"' : ""}>${period}日</a>`).join("")}</nav>`;
}

function renderGuide() {
  return renderScreenGuide({
    id: "history-unified-guide",
    summary: "保存記録、部位別比較値の推移、本人の身体記録を役割ごとに分けて見返します。",
    sections: [
      { title: "記録一覧", body: "日付、走行・休養、距離、時間、コースから保存記録を探します。記録の良し悪しを判定する画面ではありません。" },
      { title: "数値の推移", body: "部位別比較値は、同じ部位・同じ数値定義・同じ保存時モデルで比べられる記録だけを線で結びます。" },
      { title: "本人の身体記録", body: "本人が入力した値を日付順に並べます。改善・悪化や危険度は判定しません。" },
    ],
  });
}

function renderCounts(workspace) {
  return `<dl class="history-count-grid"><div><dt>走行</dt><dd>${workspace.counts.run}件</dd></div><div><dt>休養</dt><dd>${workspace.counts.rest}件</dd></div><div><dt>部位結果</dt><dd>${workspace.counts.regional}件</dd></div><div><dt>記録ノート</dt><dd>${workspace.counts.notes}件</dd></div></dl>`;
}

function activityMatches(experience, activityType) {
  return activityType === "all" || experience.record.activityType === activityType;
}

function searchText(item) {
  const record = item.experience.record || {};
  return [
    record.date,
    record.course?.name,
    record.memo,
    formatActivitySummary(record),
    item.note?.oneThingNote,
    item.note?.pageTitle,
  ].filter(Boolean).join(" ").toLocaleLowerCase("ja-JP");
}

function renderRecordFilters(workspace, context) {
  const activityType = context.parameters.get("activityType") || "all";
  const query = context.parameters.get("query") || "";
  return `<form id="history-record-filter-form" class="filter-panel" role="search">
    <input type="hidden" name="view" value="records"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><input type="hidden" name="regionId" value="${escapeHtml(workspace.regionId)}">
    <div class="field-grid field-grid--two"><label class="field"><span>種類</span><select name="activityType"><option value="all"${activityType === "all" ? " selected" : ""}>走行・休養</option><option value="run"${activityType === "run" ? " selected" : ""}>走行</option><option value="rest"${activityType === "rest" ? " selected" : ""}>休養</option></select></label><label class="field"><span>記録内を検索</span><input name="query" type="search" value="${escapeHtml(query)}" placeholder="日付、コース、メモ"></label></div>
    <div class="screen-actions"><button class="button button--primary" type="submit">絞り込む</button><a class="button button--text" href="${escapeHtml(buildHref({ view: "records", period: workspace.period, anchorDate: workspace.endDate, regionId: workspace.regionId }))}">リセット</a></div>
  </form>`;
}

function renderRecordList(workspace, context) {
  const activityType = context.parameters.get("activityType") || "all";
  const query = String(context.parameters.get("query") || "").trim().toLocaleLowerCase("ja-JP");
  const items = [...workspace.rows]
    .filter((item) => activityMatches(item.experience, activityType))
    .filter((item) => !query || searchText(item).includes(query))
    .sort((left, right) => recordChronology(right.experience, left.experience));
  if (!items.length) return '<p class="muted-text">条件に合う記録はありません。</p>';
  return `<div class="history-list history-list--facts">${items.map((item) => {
    const record = item.experience.record;
    const hasRegional = Boolean(item.resultRecord);
    return `<article class="history-item history-fact-item"><div class="history-item__date"><time class="history-date${weekendClass(record.date)}" datetime="${escapeHtml(record.date)}">${escapeHtml(formatLocalDate(record.date))}</time>${renderStatusLabel(record.activityType === "rest" ? "休養" : "走行", record.activityType === "rest" ? "neutral" : "info")}</div><div class="history-item__body"><h2>${escapeHtml(formatActivitySummary(record))}</h2><p>${escapeHtml(record.course?.name || "コース名なし")}</p>${record.memo ? `<p class="history-item__memo">${escapeHtml(record.memo)}</p>` : ""}<div class="history-fact-item__labels">${hasRegional ? renderStatusLabel("部位結果あり", "model") : renderStatusLabel("部位結果なし", "neutral")}${item.note ? renderStatusLabel("ノートあり", "info") : ""}</div></div><div class="history-item__actions"><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(record.id)}">結果を見る</a>${item.note ? `<a class="button button--text" href="#/notebook?view=day&date=${encodeURIComponent(item.note.date)}">ノートを開く</a>` : `<a class="button button--text" href="#/notebook?view=day&date=${encodeURIComponent(record.date)}&source=result&recordId=${encodeURIComponent(record.id)}">ノートに残す</a>`}<a class="button button--text" href="#/record-input?recordId=${encodeURIComponent(record.id)}">編集</a><button class="button button--text" type="button" data-action="delete-history-record" data-record-id="${escapeHtml(record.id)}" data-record-label="${escapeHtml(`${formatLocalDate(record.date)}の記録`)}">削除</button></div></article>`;
  }).join("")}</div>`;
}

function renderRecordView(workspace, context) {
  return `<section class="history-records-view"><section class="history-role-boundary" data-information-role="fact" aria-labelledby="history-role-title"><p>自動保存された事実</p><h2 id="history-role-title">走行事実と数値結果を探す</h2><p>ここには保存した記録と結果が並びます。本人が残したい言葉は記録ノートで管理します。</p></section>${renderCounts(workspace)}${renderRecordFilters(workspace, context)}${renderRecordList(workspace, context)}</section>`;
}

function chartGeometry(items) {
  const reference100 = Boolean(items[0]?.isReference100);
  const values = items.flatMap((item) => [Number(item.conditionIndexExact), ...(reference100 && finite(item.referenceValue) ? [Number(item.referenceValue)] : [])]).filter(Number.isFinite);
  if (!reference100) values.push(100);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(2, (rawMax - rawMin) * 0.16);
  const minValue = rawMin - padding;
  const maxValue = rawMax + padding;
  const span = Math.max(1, maxValue - minValue);
  const projectY = (value) => 44 - ((Number(value) - minValue) / span) * 32;
  return Object.freeze({
    points: Object.freeze(items.map((item, index) => Object.freeze({
      ...item,
      x: items.length === 1 ? 54 : 12 + (index * 82) / (items.length - 1),
      y: projectY(item.conditionIndexExact),
      referenceY: reference100 && finite(item.referenceValue) ? projectY(item.referenceValue) : null,
    }))),
    referenceY: reference100 ? null : projectY(100),
    minValue,
    maxValue,
    reference100,
  });
}

function chartLabelIndices(length) {
  if (length <= 8) return new Set(Array.from({ length }, (_, index) => index));
  const step = Math.ceil((length - 1) / 6);
  const indices = new Set([0, length - 1]);
  for (let index = step; index < length - 1; index += step) indices.add(index);
  return indices;
}

function referenceRatioPercent(item) {
  const value = Number(item?.conditionIndexExact);
  const reference = Number(item?.referenceValue);
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) return null;
  return (value / reference) * 100;
}

function referenceRatioGeometry(items) {
  const ratios = items.map(referenceRatioPercent).filter(Number.isFinite);
  const maxDeviation = ratios.length ? Math.max(...ratios.map((value) => Math.abs(value - 100))) : 0;
  const halfRange = Math.max(10, Math.ceil((maxDeviation + 3) / 5) * 5);
  const minValue = Math.max(0, 100 - halfRange);
  const maxValue = 100 + halfRange;
  const span = Math.max(1, maxValue - minValue);
  const plotTop = 8;
  const plotBottom = 43;
  const projectY = (value) => plotBottom - ((Number(value) - minValue) / span) * (plotBottom - plotTop);
  const ticks = [];
  for (let value = Math.ceil(minValue / 5) * 5; value <= maxValue; value += 5) {
    ticks.push(Object.freeze({ value, y: projectY(value) }));
  }
  return Object.freeze({
    points: Object.freeze(items.map((item, index) => Object.freeze({
      ...item,
      ratioPercent: referenceRatioPercent(item),
      x: items.length === 1 ? 54 : 11 + (index * 84) / (items.length - 1),
      y: projectY(referenceRatioPercent(item)),
    }))),
    referenceY: projectY(100),
    minValue,
    maxValue,
    ticks: Object.freeze(ticks),
  });
}

function shortDateLabel(value = "") {
  const parts = String(value || "").split("-");
  if (parts.length !== 3) return String(value || "");
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function weekdayLabel(value = "") {
  const date = new Date(`${String(value || "")}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()] || "";
}

function weekendClass(value = "") {
  const weekday = weekdayLabel(value);
  if (weekday === "土") return " date-weekend--sat";
  if (weekday === "日") return " date-weekend--sun";
  return "";
}

function trendDirectionLabel(delta) {
  if (!Number.isFinite(Number(delta)) || Math.abs(Number(delta)) < 0.5) return Object.freeze({ arrow: "—", label: "基準と同程度", className: "is-near" });
  return Number(delta) > 0
    ? Object.freeze({ arrow: "↑", label: "基準より上", className: "is-above" })
    : Object.freeze({ arrow: "↓", label: "基準より下", className: "is-below" });
}

function trendSelectionHref(workspace, item) {
  return buildHref({
    view: "trends",
    metric: "region",
    period: workspace.period,
    anchorDate: workspace.endDate,
    regionId: workspace.regionId,
    display: workspace.regionalDisplay,
    recordId: item.experience.record.id,
  });
}

function renderReferenceRatioTrendChart(items, regionName, workspace) {
  if (!items.length) return '<p class="muted-text">比較できる記録が不足しています。</p>';
  const geometry = referenceRatioGeometry(items);
  const polyline = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
  const labelIndices = chartLabelIndices(geometry.points.length);
  const selectedId = workspace.anchor?.experience?.record?.id || items.at(-1)?.experience?.record?.id || "";
  const gridLines = geometry.ticks.map((tick) => `<line x1="7" y1="${tick.y}" x2="97" y2="${tick.y}" class="regional-history-chart__grid${tick.value === 100 ? " is-reference" : ""}"></line><text x="5.6" y="${tick.y + 0.75}" text-anchor="end" class="regional-history-chart__tick-label${tick.value === 100 ? " is-reference" : ""}">${escapeHtml(formatNumber(tick.value, 0))}%</text>`).join("");
  const valueLabels = geometry.points.map((point, index) => labelIndices.has(index)
    ? `<text x="${point.x}" y="${Math.max(6.4, point.y - 2.6)}" text-anchor="middle" class="regional-history-chart__value-label">${escapeHtml(formatNumber(point.ratioPercent, 0))}%</text>`
    : "").join("");
  const dateLabels = geometry.points.map((point, index) => {
    if (!labelIndices.has(index)) return "";
    const isCurrent = point.experience.record.id === selectedId;
    const weekday = weekdayLabel(point.experience.record.date);
    return `<text x="${point.x}" y="48.7" text-anchor="middle" class="regional-history-chart__date-label${weekendClass(point.experience.record.date)}${isCurrent ? " is-current" : ""}"><tspan x="${point.x}" dy="0">${escapeHtml(shortDateLabel(point.experience.record.date))}</tspan><tspan x="${point.x}" dy="2.7">(${escapeHtml(weekday)})</tspan></text>`;
  }).join("");
  const hiddenReferences = geometry.points.map((point) => `<span>${escapeHtml(formatNumber(point.referenceValue, 0))}</span>`).join("");
  const pointLinks = geometry.points.map((point) => {
    const selected = point.experience.record.id === selectedId;
    const delta = Number(point.ratioPercent) - 100;
    const halo = selected ? `<circle cx="${point.x}" cy="${point.y}" r="1.9" class="regional-history-chart__point-halo"></circle>` : "";
    return `<a href="${escapeHtml(trendSelectionHref(workspace, point))}" aria-label="${escapeHtml(`${formatLocalDate(point.experience.record.date)}、同距離基準との比率${formatNumber(point.ratioPercent, 0)}%、基準との差${delta >= 0 ? "+" : ""}${formatNumber(delta, 0)}%`)}">${halo}<circle cx="${point.x}" cy="${point.y}" r="${selected ? 1.2 : 0.82}" class="regional-history-chart__point${selected ? " is-current" : ""}"><title>${escapeHtml(`${formatLocalDate(point.experience.record.date)} ${formatNumber(point.ratioPercent, 0)}%`)}</title></circle></a>`;
  }).join("");
  return `<figure class="regional-history-chart regional-history-chart--ratio" data-regional-history="true"><div class="regional-history-chart__meaning"><strong>同距離基準を100%とした比率の推移</strong><span>基準線：同距離基準 100%（各記録の距離に対応）</span></div><svg viewBox="0 0 100 56" role="img" aria-label="${escapeHtml(regionName)}の同距離基準を100%とした比率の推移">${gridLines}<g class="regional-history-chart__zone"><rect x="8.1" y="9.2" width="13.8" height="4.2" rx="1.3"></rect><text x="15" y="12" text-anchor="middle">基準より上</text></g><g class="regional-history-chart__zone"><rect x="8.1" y="38.4" width="13.8" height="4.2" rx="1.3"></rect><text x="15" y="41.2" text-anchor="middle">基準より下</text></g>${geometry.points.length > 1 ? `<polyline points="${polyline}" class="regional-history-chart__line"></polyline>` : ""}${valueLabels}${pointLinks}${dateLabels}</svg><figcaption class="regional-history-chart__axis regional-history-chart__axis--ratio"><span>古い記録</span><strong>横軸：記録日</strong><span>新しい記録</span></figcaption><div class="visually-hidden">同距離基準との差${hiddenReferences}</div></figure>`;
}

function referenceValueGeometry(items) {
  const values = items.flatMap((item) => [Number(item.conditionIndexExact), Number(item.referenceValue)]).filter(Number.isFinite);
  if (!values.length) return null;
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = Math.max(1, rawMax - rawMin);
  const targetStep = rawSpan / 5;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(targetStep, 1e-9)));
  const normalized = targetStep / magnitude;
  const stepBase = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = stepBase * magnitude;
  const minValue = Math.floor((rawMin - step * .55) / step) * step;
  const maxValue = Math.ceil((rawMax + step * .55) / step) * step;
  const plotTop = 8;
  const plotBottom = 43;
  const span = Math.max(step, maxValue - minValue);
  const projectY = (value) => plotBottom - ((Number(value) - minValue) / span) * (plotBottom - plotTop);
  const ticks = [];
  for (let value = minValue; value <= maxValue + step * .01; value += step) ticks.push(Object.freeze({ value, y: projectY(value) }));
  return Object.freeze({
    points: Object.freeze(items.map((item, index) => Object.freeze({
      ...item,
      x: items.length === 1 ? 54 : 11 + (index * 84) / (items.length - 1),
      y: projectY(item.conditionIndexExact),
      referenceY: finite(item.referenceValue) ? projectY(item.referenceValue) : null,
    }))),
    ticks: Object.freeze(ticks),
    minValue,
    maxValue,
  });
}

function renderRegionalDisplayToggle(workspace) {
  const shared = {
    view: "trends",
    metric: "region",
    period: workspace.period,
    anchorDate: workspace.endDate,
    regionId: workspace.regionId,
    recordId: workspace.anchor?.experience?.record?.id || workspace.requestedRecordId,
  };
  const option = (value, label) => `<a class="${workspace.regionalDisplay === value ? "is-current" : ""}" href="${escapeHtml(buildHref({ ...shared, display: value }))}"${workspace.regionalDisplay === value ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
  return `<nav class="history-chart-display-toggle" aria-label="グラフの表示"><span>グラフ表示</span><div>${option("ratio", "基準との比率")}${option("value", "比較値")}</div></nav>`;
}

function renderReferenceValueTrendChart(items, regionName, workspace) {
  if (!items.length) return '<p class="muted-text">比較できる記録が不足しています。</p>';
  const geometry = referenceValueGeometry(items);
  if (!geometry) return '<p class="muted-text">比較値を表示できません。</p>';
  const selectedId = workspace.anchor?.experience?.record?.id || items.at(-1)?.experience?.record?.id || "";
  const labelIndices = chartLabelIndices(geometry.points.length);
  const polyline = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
  const gridLines = geometry.ticks.map((tick) => `<line x1="7" y1="${tick.y}" x2="97" y2="${tick.y}" class="regional-history-chart__grid"></line><text x="5.6" y="${tick.y + .75}" text-anchor="end" class="regional-history-chart__tick-label">${escapeHtml(formatNumber(tick.value, Math.abs(tick.value) < 10 ? 1 : 0))}</text>`).join("");
  const valueLabels = geometry.points.map((point, index) => labelIndices.has(index)
    ? `<text x="${point.x}" y="${Math.max(6.4, point.y - 2.6)}" text-anchor="middle" class="regional-history-chart__value-label">${escapeHtml(formatNumber(point.conditionIndexExact, 1))}</text>`
    : "").join("");
  const dateLabels = geometry.points.map((point, index) => {
    if (!labelIndices.has(index)) return "";
    const current = point.experience.record.id === selectedId;
    const weekday = weekdayLabel(point.experience.record.date);
    return `<text x="${point.x}" y="48.7" text-anchor="middle" class="regional-history-chart__date-label${weekendClass(point.experience.record.date)}${current ? " is-current" : ""}"><tspan x="${point.x}" dy="0">${escapeHtml(shortDateLabel(point.experience.record.date))}</tspan><tspan x="${point.x}" dy="2.7">(${escapeHtml(weekday)})</tspan></text>`;
  }).join("");
  const referenceMarks = geometry.points.map((point) => point.referenceY == null ? "" : `<line x1="${Math.max(7.5, point.x - 1.35)}" y1="${point.referenceY}" x2="${Math.min(97, point.x + 1.35)}" y2="${point.referenceY}" class="regional-history-chart__reference-mark"><title>${escapeHtml(`同距離基準 ${formatNumber(point.referenceValue, 1)}`)}</title></line>`).join("");
  const pointLinks = geometry.points.map((point) => {
    const selected = point.experience.record.id === selectedId;
    const delta = Number(point.conditionIndexExact) - Number(point.referenceValue);
    const halo = selected ? `<circle cx="${point.x}" cy="${point.y}" r="1.9" class="regional-history-chart__point-halo"></circle>` : "";
    return `<a href="${escapeHtml(trendSelectionHref(workspace, point))}" aria-label="${escapeHtml(`${formatLocalDate(point.experience.record.date)}、比較値${formatNumber(point.conditionIndexExact, 1)}、同距離基準との差${delta >= 0 ? "+" : ""}${formatNumber(delta, 1)}`)}">${halo}<circle cx="${point.x}" cy="${point.y}" r="${selected ? 1.2 : .82}" class="regional-history-chart__point${selected ? " is-current" : ""}"><title>${escapeHtml(`${formatLocalDate(point.experience.record.date)} 比較値${formatNumber(point.conditionIndexExact, 1)}`)}</title></circle></a>`;
  }).join("");
  return `<figure class="regional-history-chart regional-history-chart--ratio regional-history-chart--value" data-regional-history="true"><div class="regional-history-chart__meaning"><strong>${escapeHtml(regionName)}の比較値の推移</strong><span>短線：各記録の同距離基準</span></div><svg viewBox="0 0 100 56" role="img" aria-label="${escapeHtml(regionName)}の比較値の推移">${gridLines}${referenceMarks}${geometry.points.length > 1 ? `<polyline points="${polyline}" class="regional-history-chart__line"></polyline>` : ""}${valueLabels}${pointLinks}${dateLabels}</svg><figcaption class="regional-history-chart__axis regional-history-chart__axis--ratio"><span>古い記録</span><strong>横軸：記録日　／　縦軸：${escapeHtml(regionName)}の比較値</strong><span>新しい記録</span></figcaption></figure>`;
}

function renderTrendChart(items, regionName, workspace) {
  const reference100 = Boolean(items[0]?.isReference100);
  if (reference100) return workspace.regionalDisplay === "value"
    ? renderReferenceValueTrendChart(items, regionName, workspace)
    : renderReferenceRatioTrendChart(items, regionName, workspace);
  const valueLabel = "条件応答";
  if (!items.length) return `<p class="muted-text">同じ部位・同じ数値定義・同じ基準で比べられる${valueLabel}の記録が不足しています。</p>`;
  const geometry = chartGeometry(items);
  const polyline = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
  const labelIndices = chartLabelIndices(geometry.points.length);
  const valueLabels = geometry.points.map((point, index) => labelIndices.has(index) ? `<text x="${point.x}" y="${Math.max(7, point.y - 4)}" text-anchor="middle" class="regional-history-chart__value-label">${escapeHtml(formatNumber(point.conditionIndexExact, 1))}</text>` : "").join("");
  const fixedReference = `<line x1="10" y1="${geometry.referenceY}" x2="96" y2="${geometry.referenceY}" class="regional-history-chart__reference"></line><text x="95" y="${Math.max(6, geometry.referenceY - 1.5)}" text-anchor="end" class="regional-history-chart__reference-label">基準100</text>`;
  const pointTitles = geometry.points.map((point) => `<a href="#/result?recordId=${encodeURIComponent(point.experience.record.id)}"><circle cx="${point.x}" cy="${point.y}" r="2.8" class="regional-history-chart__point"><title>${escapeHtml(`${formatLocalDate(point.experience.record.date)} ${valueLabel}${formatNumber(point.conditionIndexExact, 1)}、基準100との差${Number(point.conditionIndexExact) >= 100 ? "+" : ""}${formatNumber(Number(point.conditionIndexExact) - 100, 1)}`)}</title></circle></a>`).join("");
  return `<figure class="regional-history-chart" data-regional-history="true"><svg viewBox="0 0 100 56" role="img" aria-label="${escapeHtml(regionName)}の比較可能な${valueLabel}の推移"><text x="1.5" y="8" class="regional-history-chart__scale-label">${escapeHtml(formatNumber(geometry.maxValue, 0))}</text><text x="1.5" y="47" class="regional-history-chart__scale-label">${escapeHtml(formatNumber(geometry.minValue, 0))}</text>${fixedReference}${geometry.points.length > 1 ? `<polyline points="${polyline}" class="regional-history-chart__line"></polyline>` : ""}${valueLabels}${pointTitles}</svg><figcaption class="regional-history-chart__axis"><span>${escapeHtml(formatLocalDate(items[0].experience.record.date))}</span><strong>同じ数値定義を持つ記録だけを順につないでいます</strong><span>${escapeHtml(formatLocalDate(items.at(-1).experience.record.date))}</span></figcaption></figure>`;
}

function routeFamilyLabel(signature = null) {
  const tier = String(signature?.auditSupportTier || "");
  if (tier === "PROVISIONAL_AUTHORIZED") return "限定的な推定を含む";
  if (tier === "FORMAL_DIRECT_IN_DOMAIN") return "文献条件内";
  return "同じ比較指標";
}

function formatPacePerKm(record = {}) {
  const distance = Number(record.distanceKm);
  const duration = Number(record.durationMinutes);
  if (!(distance > 0) || !(duration > 0)) return "—";
  const seconds = Math.round((duration * 60) / distance);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")} /km`;
}

function signedGradeFromRecord(record = {}) {
  const course = record.course || {};
  if (String(course.gradeKnowledge || "").toUpperCase() === "KNOWN_FLAT") return 0;
  const sections = Array.isArray(course.sections) ? course.sections : [];
  if (sections.length) {
    let weighted = 0;
    let weightSum = 0;
    sections.forEach((section) => {
      const share = finite(section.sharePercent) ? Number(section.sharePercent) : (finite(section.distanceKm) ? Number(section.distanceKm) : null);
      const raw = finite(section.gradePercent) ? Number(section.gradePercent) : null;
      if (!(share > 0) || raw === null) return;
      const direction = String(section.gradeDirection || "").toUpperCase();
      const signed = direction === "DOWNHILL" ? -Math.abs(raw) : direction === "UPHILL" ? Math.abs(raw) : raw;
      weighted += signed * share;
      weightSum += share;
    });
    if (weightSum > 0) return weighted / weightSum;
  }
  if (finite(course.upPercent) || finite(course.downPercent)) {
    const upShare = finite(course.upPercent) ? Number(course.upPercent) : 0;
    const downShare = finite(course.downPercent) ? Number(course.downPercent) : 0;
    const upGrade = finite(course.upGradePercent) ? Math.abs(Number(course.upGradePercent)) : 0;
    const downGrade = finite(course.downGradePercent) ? Math.abs(Number(course.downGradePercent)) : 0;
    const denominator = upShare + downShare;
    if (denominator > 0) return ((upShare * upGrade) - (downShare * downGrade)) / denominator;
  }
  const raw = finite(course.gradePercent) ? Number(course.gradePercent) : null;
  if (raw !== null) {
    const direction = String(course.gradeDirection || "").toUpperCase();
    return direction === "DOWNHILL" ? -Math.abs(raw) : direction === "UPHILL" ? Math.abs(raw) : raw;
  }
  return null;
}

function formatAverageGrade(record = {}) {
  const grade = signedGradeFromRecord(record);
  if (!Number.isFinite(grade)) return "—";
  if (Math.abs(grade) < 0.05) return "0.0%";
  return `${grade > 0 ? "+" : ""}${formatNumber(grade, 1)}%`;
}

function primarySurfaceLabel(record = {}) {
  const course = record.course || {};
  const candidates = [
    ["pavedPercent", "舗装路"],
    ["trackPercent", "トラック"],
    ["treadmillPercent", "トレッドミル"],
    ["soilPercent", "土"],
    ["trailPercent", "トレイル"],
    ["naturalGrassPercent", "天然芝"],
    ["artificialTurfPercent", "人工芝"],
    ["sandPercent", "砂"],
  ].map(([key, label]) => ({ label, value: finite(course[key]) ? Number(course[key]) : 0 }));
  const best = candidates.sort((a, b) => b.value - a.value)[0];
  return best?.value > 0 ? best.label : (course.name || "—");
}

function formatDuration(record = {}) {
  const minutes = Number(record.durationMinutes);
  if (!(minutes > 0)) return "—";
  const totalSeconds = Math.round(minutes * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function previousComparableItem(items, selected) {
  if (!selected) return null;
  const sorted = [...items].sort((left, right) => recordChronology(left.experience, right.experience));
  const index = sorted.findIndex((item) => item.experience.record.id === selected.experience.record.id);
  return index > 0 ? sorted[index - 1] : null;
}

function conditionDifferenceRows(selected, previous) {
  if (!selected || !previous) return [];
  const currentRecord = selected.experience.record;
  const previousRecord = previous.experience.record;
  return [
    ["平均ペース", formatPacePerKm(previousRecord), formatPacePerKm(currentRecord)],
    ["平均勾配", formatAverageGrade(previousRecord), formatAverageGrade(currentRecord)],
    ["主な路面", primarySurfaceLabel(previousRecord), primarySurfaceLabel(currentRecord)],
  ];
}

function renderSelectedTrendRecord(selected, previous, regionName) {
  if (!selected) return "";
  const ratio = referenceRatioPercent(selected);
  const delta = Number(ratio) - 100;
  const direction = trendDirectionLabel(delta);
  const rows = conditionDifferenceRows(selected, previous);
  return `<section class="history-selected-record" aria-labelledby="history-selected-record-title"><p class="history-panel-label">選択中の記録</p><h3 id="history-selected-record-title" class="history-selected-record__date${weekendClass(selected.experience.record.date)}">${escapeHtml(formatLocalDate(selected.experience.record.date))}</h3><div class="history-selected-record__hero"><div class="history-selected-record__ratio"><strong>${escapeHtml(formatNumber(ratio, 0))}%</strong><span>同距離基準との比率</span></div><div class="history-selected-record__delta ${escapeHtml(direction.className)}"><span>基準との差</span><strong>${delta >= 0 ? "+" : ""}${escapeHtml(formatNumber(delta, 0))}%</strong><small>${escapeHtml(direction.arrow)} ${escapeHtml(direction.label)}</small></div></div><dl class="history-selected-record__facts"><div><dt>実際の比較値</dt><dd>${escapeHtml(formatNumber(selected.conditionIndexExact, 1))}</dd></div><div><dt>距離</dt><dd>${escapeHtml(formatNumber(selected.referenceDistanceKm, 2))} km</dd></div></dl>${previous ? `<div class="history-condition-differences"><h4>前回記録（${escapeHtml(shortDateLabel(previous.experience.record.date))}）との主な条件の違い</h4><table><tbody>${rows.map(([label, before, current]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(before)}</td><td class="history-condition-differences__arrow">→</td><td>${escapeHtml(current)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted-text">この期間内に前回の比較可能記録はありません。</p>'}<a class="button button--secondary history-selected-record__detail" href="#/result?recordId=${encodeURIComponent(selected.experience.record.id)}">この記録の詳細を見る</a></section>`;
}

function renderComparisonConditions() {
  return `<section class="history-comparison-conditions" id="history-comparison-conditions" aria-labelledby="history-comparison-conditions-title"><h3 id="history-comparison-conditions-title">比較条件 <span>（この画面に表示している記録の条件）</span></h3><ul><li>同じ部位の記録</li><li>同じ意味の比較値</li><li>距離に応じた基準で比較</li><li>同じ計算方法で保存された記録</li></ul><details class="history-comparison-conditions__detail"><summary>条件の詳細を表示</summary><p>部位別比較値では、走行距離はこの比較値に含まれています。同じ数値定義・同じ基準・同じ計算方法で比較できる記録のみ表示します。100は安全値・正常値・初心者平均ではありません。100%は各記録の同距離基準との比率です。</p></details></section>`;
}

function renderReflectionActions(selected) {
  if (!selected) return "";
  const record = selected.experience.record;
  return `<section class="history-reflection-card" aria-labelledby="history-reflection-title"><p class="history-panel-label">記録を振り返る</p><h3 id="history-reflection-title">今回の変化で確認したい点を記録できます。</h3><div class="history-reflection-card__actions"><a class="button button--secondary" href="#/notebook?view=day&date=${encodeURIComponent(record.date)}&source=result&recordId=${encodeURIComponent(record.id)}">メモを残す</a><a class="button button--text" href="#/plan?sourceRecordId=${encodeURIComponent(record.id)}">次回確認したい条件</a></div></section>`;
}

function renderTrendTable(items, selectedId = "", workspace = null) {
  const reference100 = Boolean(items[0]?.isReference100);
  if (!reference100) {
    const valueLabel = "条件応答";
    return `<div class="regional-trend-table"><table><thead><tr><th scope="col">日付</th><th scope="col">${valueLabel}</th><th scope="col">基準100</th><th scope="col">基準100との差</th><th scope="col">根拠の範囲</th></tr></thead><tbody>${items.map((item) => { const delta = Number(item.conditionIndexExact) - 100; return `<tr><th scope="row"><a href="#/result?recordId=${encodeURIComponent(item.experience.record.id)}">${escapeHtml(formatLocalDate(item.experience.record.date))}</a></th><td>${formatNumber(item.conditionIndexExact, 1)}</td><td>100</td><td>${delta >= 0 ? "+" : ""}${formatNumber(delta, 1)}</td><td>${escapeHtml(routeFamilyLabel(item.signature))}</td></tr>`; }).join("")}</tbody></table></div>`;
  }
  return `<div class="regional-trend-table regional-trend-table--reference"><table><thead><tr><th scope="col" aria-label="番号"></th><th scope="col">記録日</th><th scope="col">距離</th><th scope="col">時間</th><th scope="col">平均ペース</th><th scope="col">平均勾配</th><th scope="col">路面</th><th scope="col">比較値</th><th scope="col">基準との比率</th><th scope="col">基準との差</th></tr></thead><tbody>${items.map((item, index) => { const ratio = referenceRatioPercent(item); const delta = Number(ratio) - 100; const record = item.experience.record; const selected = record.id === selectedId; const direction = trendDirectionLabel(delta); return `<tr${selected ? ' class="is-selected"' : ""}><td class="history-table-index"><span>${index + 1}</span></td><th scope="row"><a class="history-table-date${weekendClass(record.date)}" href="${escapeHtml(trendSelectionHref(workspace, item))}">${escapeHtml(shortDateLabel(record.date))} (${escapeHtml(weekdayLabel(record.date))})</a></th><td>${escapeHtml(formatNumber(item.referenceDistanceKm, 2))} km</td><td>${escapeHtml(formatDuration(record))}</td><td>${escapeHtml(formatPacePerKm(record))}</td><td>${escapeHtml(formatAverageGrade(record))}</td><td>${escapeHtml(primarySurfaceLabel(record))}</td><td>${escapeHtml(formatNumber(item.conditionIndexExact, 1))}</td><td><strong>${escapeHtml(formatNumber(ratio, 0))}%</strong></td><td class="history-table-delta ${escapeHtml(direction.className)}">${delta >= 0 ? "+" : ""}${escapeHtml(formatNumber(delta, 0))}% ${escapeHtml(direction.arrow)}</td></tr>`; }).join("")}</tbody></table></div>`;
}

function renderRegionSelector(workspace) {
  return `<form id="regional-history-form" class="history-body-part-selector"><input type="hidden" name="view" value="trends"><input type="hidden" name="metric" value="region"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><input type="hidden" name="display" value="${escapeHtml(workspace.regionalDisplay)}"><label class="field"><span>推移を見る部位</span><select name="regionId">${REGIONS.map((region) => `<option value="${escapeHtml(region.id)}"${workspace.regionId === region.id ? " selected" : ""}>${escapeHtml(bodyRegionFormalName(region.id, region.name))}</option>`).join("")}</select></label><button class="button button--secondary" type="submit">部位を変更</button></form>`;
}

function renderPlanSummary(workspace) {
  if (workspace.period !== 7) return "";
  if (!workspace.plans.length) return '<section class="result-card"><div class="result-card__heading"><div><p>7日間の予定</p><h2>予定と実績</h2></div></div><p>この7日間に保存された予定はありません。</p></section>';
  return `<section class="result-card"><div class="result-card__heading"><div><p>7日間の予定</p><h2>予定と実績</h2></div>${renderStatusLabel(`${workspace.plans.length}件`, "neutral")}</div><ul class="compact-link-list">${workspace.plans.map((plan) => `<li><a href="#/plan?planId=${encodeURIComponent(plan.id)}">${escapeHtml(formatLocalDate(plan.scheduledDate))}・${escapeHtml(plan.title || (plan.planType === "rest" ? "休養予定" : "走行予定"))}</a></li>`).join("")}</ul><p class="source-boundary">予定どおりかを採点せず、保存した予定と実績への入口だけを表示します。</p></section>`;
}

function renderMetricTabs(workspace) {
  const common = {
    view: "trends",
    period: workspace.period,
    anchorDate: workspace.endDate,
    recordId: workspace.requestedRecordId,
  };
  const options = [
    ["total", "走行全体"],
    ["region", "部位別比較値"],
    ["subjective", "本人の身体記録"],
  ];
  return `<nav class="view-tabs history-metric-tabs" aria-label="推移の種類">${options.map(([metric, label]) => `<a class="view-tab${workspace.metric === metric ? " is-current" : ""}" href="${escapeHtml(buildHref({ ...common, metric, regionId: workspace.regionId, areaId: workspace.selectedSubjective?.areaId, laterality: workspace.selectedSubjective?.laterality }))}"${workspace.metric === metric ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>`;
}

function totalChartGeometry(items, reference) {
  const values = [...items.map((item) => Number(item.totalValue)), Number(reference)].filter(Number.isFinite);
  if (!values.length) return null;
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(2, (rawMax - rawMin) * 0.16);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const span = Math.max(1, max - min);
  const projectY = (value) => 44 - ((Number(value) - min) / span) * 32;
  return Object.freeze({
    points: Object.freeze(items.map((item, index) => Object.freeze({
      ...item,
      x: items.length === 1 ? 54 : 12 + (index * 82) / (items.length - 1),
      y: projectY(item.totalValue),
    }))),
    referenceY: finite(reference) ? projectY(reference) : null,
    minValue: min,
    maxValue: max,
  });
}

function renderTotalHistoryChart(workspace) {
  if (!workspace.totalRows.length) return '<p class="muted-text">この期間に比較できる走行全体の値はありません。</p>';
  const geometry = totalChartGeometry(workspace.totalRows, workspace.totalMedian);
  const polyline = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
  const anchorId = workspace.totalAnchor?.experience.record.id || "";
  const labelIndices = chartLabelIndices(geometry.points.length);
  const valueLabels = geometry.points.map((point, index) => labelIndices.has(index) ? `<text x="${point.x}" y="${Math.max(7, point.y - 4)}" text-anchor="middle" class="regional-history-chart__value-label">${escapeHtml(formatNumber(point.totalValue, 1))}</text>` : "").join("");
  return `<figure class="regional-history-chart model-total-history-chart"><svg viewBox="0 0 100 56" role="img" aria-label="走行全体の比較用推定値の推移"><text x="1.5" y="8" class="regional-history-chart__scale-label">${escapeHtml(formatNumber(geometry.maxValue, 0))}</text><text x="1.5" y="47" class="regional-history-chart__scale-label">${escapeHtml(formatNumber(geometry.minValue, 0))}</text>${geometry.referenceY == null ? "" : `<line x1="10" y1="${geometry.referenceY}" x2="96" y2="${geometry.referenceY}" class="regional-history-chart__reference model-total-history-chart__median"></line><text x="95" y="${Math.max(6, geometry.referenceY - 1.5)}" text-anchor="end" class="regional-history-chart__reference-label">過去中央値</text>`}${geometry.points.length > 1 ? `<polyline points="${polyline}" class="regional-history-chart__line"></polyline>` : ""}${valueLabels}${geometry.points.map((point) => `<a href="#/result?recordId=${encodeURIComponent(point.experience.record.id)}"><circle cx="${point.x}" cy="${point.y}" r="${point.experience.record.id === anchorId ? 3.8 : 2.8}" class="regional-history-chart__point${point.experience.record.id === anchorId ? " is-current" : ""}"><title>${escapeHtml(`${formatLocalDate(point.experience.record.date)} ${formatNumber(point.totalValue, 1)}推定ポイント`)}</title></circle></a>`).join("")}</svg><figcaption class="regional-history-chart__axis"><span>${escapeHtml(formatLocalDate(workspace.totalRows[0].experience.record.date))}</span><strong>${finite(workspace.totalMedian) ? `破線：過去中央値 ${formatNumber(workspace.totalMedian, 1)}` : "過去3件から中央値を表示"}</strong><span>${escapeHtml(formatLocalDate(workspace.totalRows.at(-1).experience.record.date))}</span></figcaption></figure>`;
}

function renderTotalHistoryTable(workspace) {
  return `<div class="regional-trend-table"><table><thead><tr><th scope="col">日付</th><th scope="col">推定ポイント</th><th scope="col">過去中央値との差</th><th scope="col">記録条件</th></tr></thead><tbody>${workspace.totalRows.map((item) => {
    const difference = finite(workspace.totalMedian) ? Number(item.totalValue) - Number(workspace.totalMedian) : null;
    return `<tr><th scope="row"><a href="#/result?recordId=${encodeURIComponent(item.experience.record.id)}">${escapeHtml(formatLocalDate(item.experience.record.date))}</a></th><td>${formatNumber(item.totalValue, 1)}</td><td>${difference == null ? "—" : `${difference > 0 ? "+" : ""}${formatNumber(difference, 1)}`}</td><td>${escapeHtml(formatActivitySummary(item.experience.record))}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function renderTotalTrendView(workspace) {
  const referenceCount = workspace.totalReferenceRows.length;
  const anchorValue = workspace.totalAnchor?.totalValue;
  const difference = finite(workspace.totalMedian) && finite(anchorValue)
    ? Number(anchorValue) - Number(workspace.totalMedian)
    : null;
  const percent = difference != null && Math.abs(Number(workspace.totalMedian)) > 1e-9
    ? (difference / Number(workspace.totalMedian)) * 100
    : null;
  return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="model" aria-labelledby="history-total-role-title"><p>走行全体の時系列</p><h2 id="history-total-role-title">比較できる推定ポイントを見返す</h2><p>線は走行全体の量の変化を示します。高い・低いを良し悪し、安全性、身体状態として評価しません。</p></section><section class="result-card" data-information-role="model" aria-labelledby="total-trend-title"><div class="result-card__heading"><div><p>${workspace.period}日間</p><h2 id="total-trend-title">走行全体の比較用推定値の推移</h2></div>${renderStatusLabel(`${workspace.totalRows.length}件`, "model")}</div><dl class="history-analysis-metrics"><div><dt>選択中の記録</dt><dd>${finite(anchorValue) ? formatNumber(anchorValue, 1) : "—"}</dd><small>推定ポイント</small></div><div><dt>過去中央値</dt><dd>${finite(workspace.totalMedian) ? formatNumber(workspace.totalMedian, 1) : "準備中"}</dd><small>今回を除く過去${referenceCount}件</small></div><div><dt>中央値との差</dt><dd>${difference == null ? "—" : `${difference > 0 ? "+" : ""}${formatNumber(difference, 1)}`}</dd><small>${percent == null ? `過去${TOTAL_MINIMUM_PRIOR}件から表示` : `${percent > 0 ? "+" : ""}${formatNumber(percent, 0)}%`}</small></div></dl><details class="history-reading-disclosure"><summary>中央値とグラフの読み方</summary><div><p>中央値は本人の正常値・安全基準ではなく、選択期間内の比較できる記録の中央に位置する値です。</p><p>増減を良し悪し、安全性、身体状態として評価しません。</p></div></details>${renderTotalHistoryChart(workspace)}${workspace.totalRows.length ? renderTotalHistoryTable(workspace) : ""}</section>${renderPlanSummary(workspace)}</section>`;
}

function renderSubjectiveSelector(workspace) {
  if (!workspace.subjectiveOptions.length) return "";
  return `<form id="subjective-history-form" class="history-body-part-selector"><input type="hidden" name="view" value="trends"><input type="hidden" name="metric" value="subjective"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><label class="field"><span>本人記録を見る部位</span><select name="subjectiveKey">${workspace.subjectiveOptions.map((item) => `<option value="${escapeHtml(item.key)}"${workspace.selectedSubjective?.key === item.key ? " selected" : ""}>${escapeHtml(`${item.label}・${bodyAreaLateralityLabel(item.laterality)}`)}</option>`).join("")}</select></label><button class="button button--secondary" type="submit">部位を変更</button></form>`;
}

function renderSubjectiveTrendView(workspace) {
  if (!workspace.selectedSubjective) {
    return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="personal" aria-labelledby="history-subjective-role-title"><p>本人が残した記録</p><h2 id="history-subjective-role-title">この期間に部位の身体記録はありません</h2><p>本人が部位と程度を入力すると、ここに日付順で表示します。</p></section></section>`;
  }
  return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="personal" aria-labelledby="history-subjective-role-title"><p>本人が残した記録</p><h2 id="history-subjective-role-title">同じ部位の入力を日付順に確認する</h2><p>入力値をそのまま並べます。線で傾向を作らず、改善・悪化・危険度を自動判定しません。</p></section>${renderSubjectiveSelector(workspace)}<section class="result-card result-card--subjective" data-information-role="personal" aria-labelledby="subjective-trend-title"><div class="result-card__heading"><div><p>本人入力の履歴</p><h2 id="subjective-trend-title">${escapeHtml(workspace.selectedSubjective.label)}・${escapeHtml(bodyAreaLateralityLabel(workspace.selectedSubjective.laterality))}</h2></div>${renderStatusLabel(`${workspace.subjectiveRows.length}件`, "info")}</div>${workspace.subjectiveRows.length ? `<ol class="history-subjective-timeline">${workspace.subjectiveRows.map((item) => `<li><time class="history-date${weekendClass(item.experience.record.date)}" datetime="${escapeHtml(item.experience.record.date)}">${escapeHtml(formatLocalDate(item.experience.record.date))}</time><span><em>本人入力</em><strong>程度 ${escapeHtml(formatNumber(item.observation.intensity, 0))} / 5</strong></span><span><em>記録条件</em><strong>${escapeHtml(formatActivitySummary(item.experience.record))}</strong></span><a class="button button--text" href="#/result?recordId=${encodeURIComponent(item.experience.record.id)}">結果を開く</a></li>`).join("")}</ol>` : '<p class="muted-text">選択した部位の記録はありません。</p>'}<details class="history-reading-disclosure"><summary>本人入力の読み方</summary><div><p>同じ数値でも、その日の本人の判断基準や状況は異なる可能性があります。数値だけで身体状態を判断しません。</p></div></details></section></section>`;
}

function renderFocusedPeriodTabs(workspace) {
  return `<div class="history-focused-period"><strong>期間</strong><nav aria-label="表示期間">${[7, 28, 90, 180].map((period) => `<a class="${workspace.period === period ? "is-current" : ""}" href="${escapeHtml(buildHref({ view: "trends", metric: "region", period, anchorDate: workspace.endDate, regionId: workspace.regionId, display: workspace.regionalDisplay }))}"${workspace.period === period ? ' aria-current="page"' : ""}>${period}日</a>`).join("")}</nav></div>`;
}

function renderFocusedRegionPicker(workspace) {
  return `<details class="history-focused-region-picker"><summary>部位を変更</summary><form id="regional-history-form"><input type="hidden" name="view" value="trends"><input type="hidden" name="metric" value="region"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><label class="field"><span>表示する部位</span><select name="regionId">${REGIONS.map((region) => `<option value="${escapeHtml(region.id)}"${workspace.regionId === region.id ? " selected" : ""}>${escapeHtml(bodyRegionFormalName(region.id, region.name))}</option>`).join("")}</select></label><button class="button button--primary" type="submit">表示する</button></form></details>`;
}

function renderFocusedHistoryHeader(workspace, regionName, count) {
  return `<header class="history-focused-header"><a class="history-focused-back" href="${escapeHtml(buildHref({ view: "records", period: workspace.period, anchorDate: workspace.endDate, regionId: workspace.regionId }))}">← 戻る</a><div><h1>${escapeHtml(regionName)}の推移</h1><p>比較できる記録のみ表示します</p></div>${renderFocusedRegionPicker(workspace)}</header><div class="history-focused-toolbar">${renderFocusedPeriodTabs(workspace)}<div class="history-focused-count"><strong>比較できる記録</strong><span>${count}件</span></div><a class="history-focused-conditions-link" href="#history-comparison-conditions">ⓘ 条件の詳細</a></div>`;
}

function renderRegionTrendView(workspace) {
  const directItems = workspace.trendRows.filter((item) => item.compatibility.directDeltaAllowed && finite(item.conditionIndexExact)).sort((left, right) => recordChronology(left.experience, right.experience));
  const otherItems = workspace.trendRows.filter((item) => item.row && !item.compatibility.directDeltaAllowed).sort((left, right) => recordChronology(right.experience, left.experience));
  const isNew = Boolean(workspace.anchor?.isReference100);
  const anchorConditionAvailable = Boolean(workspace.anchorSignature && finite(workspace.anchor?.conditionIndexExact));
  const regionName = bodyRegionFormalName(workspace.region.id, workspace.region.name);
  const selected = directItems.find((item) => item.experience.record.id === workspace.anchor?.experience?.record?.id) || directItems.at(-1) || null;
  const previous = previousComparableItem(directItems, selected);

  if (isNew) {
    return `<section class="history-trends-view history-trends-view--regional history-focused-analysis">${renderFocusedHistoryHeader(workspace, regionName, directItems.length)}${!anchorConditionAvailable&&workspace.requestedRecordId?'<section class="result-card"><h2>この記録では数値推移を作りません</h2><p>同じ意味で比較できる部位別数値がありません。</p></section>':""}<div class="history-focused-grid"><section class="history-focused-chart-card" aria-labelledby="history-ratio-title"><h2 id="history-ratio-title" class="visually-hidden">${escapeHtml(regionName)}の推移グラフ</h2>${renderRegionalDisplayToggle(workspace)}${renderTrendChart(directItems, regionName, workspace)}</section>${renderSelectedTrendRecord(selected, previous, regionName)}${directItems.length ? `<details class="history-record-table-disclosure" open><summary>記録一覧（${directItems.length}件）</summary>${renderTrendTable(directItems, selected?.experience?.record?.id || "", workspace)}<a class="history-record-table-disclosure__all" href="${escapeHtml(buildHref({ view: "records", period: workspace.period, anchorDate: workspace.endDate, regionId: workspace.regionId }))}">すべての記録を確認する</a></details>` : ""}<aside class="history-focused-side-lower">${renderComparisonConditions()}${renderReflectionActions(selected)}</aside></div><p class="history-focused-footnote">※ 比率は「各記録の同距離基準を100%とした値」です。上がる・下がるが良い・悪いを示すものではありません。</p>${otherItems.length?`<details class="history-detail-disclosure"><summary>比較対象から外れた記録 ${otherItems.length}件</summary><p>保存記録は残したまま、同じ意味では比較できない記録をグラフから分けています。</p></details>`:""}</section>`;
  }

  const title = "同じ条件応答として比較できる記録だけで推移を見る";
  const meaning = bodyRegionPlainMeaning(workspace.region.id);
  const distanceNote = "共通走行量は別の情報で、このグラフの縦軸へ足しません。";
  return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="model" aria-labelledby="history-trend-role-title"><p>部位ごとの条件応答</p><h2 id="history-trend-role-title">${escapeHtml(title)}</h2><p>同じ部位・同じ数値定義・同じ基準・同じ保存時モデルで比べられる記録だけをつなぎます。異なる数値定義の記録は線でつなぎません。</p></section>${renderRegionSelector(workspace)}${!anchorConditionAvailable&&workspace.requestedRecordId?'<section class="result-card"><h2>この記録では数値推移を作りません</h2><p>同じ意味で比較できる部位別数値がありません。100を代入して補いません。</p></section>':""}<section class="result-card" data-information-role="model"><div class="result-card__heading"><div><p>同じ意味で比べられる記録</p><h2>${escapeHtml(regionName)}の推移</h2></div>${renderStatusLabel(`グラフに使用 ${directItems.length}件`, "model")}</div><p class="inline-helper"><strong>この値が表すこと：</strong>${escapeHtml(meaning)}</p><details class="history-reading-disclosure"><summary>このグラフの読み方</summary><div><p><strong>${escapeHtml(distanceNote)}</strong></p><p>増減を改善・悪化・危険度とは評価しません。</p></div></details>${renderTrendChart(directItems, regionName, workspace)}${directItems.length?renderTrendTable(directItems, selected?.experience?.record?.id || "", workspace):""}</section>${otherItems.length?`<details class="history-detail-disclosure"><summary>同じ意味では比べられない記録 ${otherItems.length}件</summary><p>保存された記録は削除していません。数値定義または保存時の計算方法が一致しないため、グラフから分けています。</p></details>`:""}${renderPlanSummary(workspace)}</section>`;
}

function renderTrendView(workspace) {
  const content = workspace.metric === "total"
    ? renderTotalTrendView(workspace)
    : workspace.metric === "subjective"
      ? renderSubjectiveTrendView(workspace)
      : renderRegionTrendView(workspace);
  return `${renderMetricTabs(workspace)}${content}`;
}

export function renderHistoryScreen({ services, context }) {
  const workspace = buildWorkspace(services, context);
  if (!workspace) {
    return `<section class="screen screen--history">${renderPageHeading({ eyebrow: "保存した記録", title: "履歴", description: "保存した記録と比較可能な推移を見返します。" })}${renderEmptyState({ title: "保存済みの記録がありません", description: "最初の走行または休養を保存してください。", actionLabel: "記録を始める", actionScreen: "record-input" })}</section>`;
  }
  const focusedRegional = workspace.view === "trends" && workspace.metric === "region" && Boolean(workspace.anchor?.isReference100);
  if (focusedRegional) {
    return `<section class="screen screen--history-comparison-focused">${renderRegionTrendView(workspace)}${services.workflows.history.loadUndoEntry() ? '<div class="history-undo" role="status"><p>直前に削除した記録を元に戻せます。</p><button class="button button--secondary" type="button" data-action="undo-history-delete">削除を元に戻す</button></div>' : ""}</section>`;
  }
  return `<section class="screen screen--history-unified">${renderPageHeading({ eyebrow: "保存した記録", title: "記録と推移を見返す", description: `${formatLocalDate(workspace.startDate)}〜${formatLocalDate(workspace.endDate)}。数値結果と本人入力を役割ごとに分けます。記録ノートは本人が選んで残した言葉です。` })}${renderRecordsWorkspaceNavigation({ active: "history", date: workspace.endDate })}${renderGuide()}${renderTabs(workspace)}${renderPeriodTabs(workspace)}${workspace.view === "trends" ? renderTrendView(workspace) : renderRecordView(workspace, context)}${services.workflows.history.loadUndoEntry() ? '<div class="history-undo" role="status"><p>直前に削除した記録を元に戻せます。</p><button class="button button--secondary" type="button" data-action="undo-history-delete">削除を元に戻す</button></div>' : ""}</section>`;
}
