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

const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";
const TOTAL_MINIMUM_PRIOR = 3;

function buildHref(values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/history${query.size ? `?${query.toString()}` : ""}`;
}

function normalizedPeriod(value) {
  return [7, 28, 90].includes(Number(value)) ? Number(value) : 28;
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
    const isNew = item.resultRecord?.model_version === NEW_MODEL_V1_MODEL_VERSION;
    const semantic = item.row && !isNew
      ? item.resultRecord?.a7_region_semantics?.[item.row.regionId] || buildA7RegionSemanticDecomposition(item.row)
      : null;
    const ratio = semantic?.regionalConditionResponse?.ratioExact;
    const conditionIndexExact = isNew
      ? (finite(item.row?.value) ? Number(item.row.value) : null)
      : (finite(ratio) && Number(ratio) > 0 ? 100 * Number(ratio) : null);
    const signature = item.row
      ? (isNew ? buildNewModelV1ComparisonSignature(item.resultRecord, item.row) : buildA7ConditionComparisonSignature(item.resultRecord || item.resultRecord?.result || {}, item.row))
      : null;
    return Object.freeze({ ...item, semantic, conditionIndexExact, signature, isNewModelV1: isNew });
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
    const compatibility = anchorSignature && item.signature
      ? (anchor?.isNewModelV1 && item.isNewModelV1
        ? compareNewModelV1Signatures(anchorSignature, item.signature)
        : (!anchor?.isNewModelV1 && !item.isNewModelV1
          ? compareA7ConditionSignatures(anchorSignature, item.signature)
          : Object.freeze({ status: "INCOMPATIBLE", differences: Object.freeze(["MODEL_SEMANTIC_GENERATION_MISMATCH"]), directDeltaAllowed: false })))
      : Object.freeze({ status: "INCOMPATIBLE", differences: Object.freeze(["COMPARISON_SIGNATURE_MISSING"]), directDeltaAllowed: false });
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
  return `<nav class="period-tabs" aria-label="表示期間">${[7, 28, 90].map((period) => `<a class="period-tab${workspace.period === period ? " is-current" : ""}" href="${escapeHtml(buildHref({ ...shared, view: workspace.view, period }))}"${workspace.period === period ? ' aria-current="page"' : ""}>${period}日</a>`).join("")}</nav>`;
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
    return `<article class="history-item history-fact-item"><div class="history-item__date"><time datetime="${escapeHtml(record.date)}">${escapeHtml(formatLocalDate(record.date))}</time>${renderStatusLabel(record.activityType === "rest" ? "休養" : "走行", record.activityType === "rest" ? "neutral" : "info")}</div><div class="history-item__body"><h2>${escapeHtml(formatActivitySummary(record))}</h2><p>${escapeHtml(record.course?.name || "コース名なし")}</p>${record.memo ? `<p class="history-item__memo">${escapeHtml(record.memo)}</p>` : ""}<div class="history-fact-item__labels">${hasRegional ? renderStatusLabel("部位結果あり", "model") : renderStatusLabel("部位結果なし", "neutral")}${item.note ? renderStatusLabel("ノートあり", "info") : ""}</div></div><div class="history-item__actions"><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(record.id)}">結果を見る</a>${item.note ? `<a class="button button--text" href="#/notebook?view=day&date=${encodeURIComponent(item.note.date)}">ノートを開く</a>` : `<a class="button button--text" href="#/notebook?view=day&date=${encodeURIComponent(record.date)}&source=result&recordId=${encodeURIComponent(record.id)}">ノートに残す</a>`}<a class="button button--text" href="#/record-input?recordId=${encodeURIComponent(record.id)}">編集</a><button class="button button--text" type="button" data-action="delete-history-record" data-record-id="${escapeHtml(record.id)}" data-record-label="${escapeHtml(`${formatLocalDate(record.date)}の記録`)}">削除</button></div></article>`;
  }).join("")}</div>`;
}

function renderRecordView(workspace, context) {
  return `<section class="history-records-view"><section class="history-role-boundary" data-information-role="fact" aria-labelledby="history-role-title"><p>自動保存された事実</p><h2 id="history-role-title">走行事実と数値結果を探す</h2><p>ここには保存した記録と結果が並びます。本人が残したい言葉は記録ノートで管理します。</p></section>${renderCounts(workspace)}${renderRecordFilters(workspace, context)}${renderRecordList(workspace, context)}</section>`;
}

function chartGeometry(items) {
  const values = items.map((item) => Number(item.conditionIndexExact));
  const rawMin = Math.min(100, ...values);
  const rawMax = Math.max(100, ...values);
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
    }))),
    referenceY: projectY(100),
    minValue,
    maxValue,
  });
}

function chartLabelIndices(length) {
  if (length <= 7) return new Set(Array.from({ length }, (_, index) => index));
  const step = Math.ceil((length - 1) / 5);
  const indices = new Set([0, length - 1]);
  for (let index = step; index < length - 1; index += step) indices.add(index);
  return indices;
}

function renderTrendChart(items, regionName) {
  const isNew = Boolean(items[0]?.isNewModelV1);
  const valueLabel = isNew ? "部位別比較値" : "条件応答";
  if (!items.length) return `<p class="muted-text">同じ部位・同じ数値定義・同じ基準で比べられる${valueLabel}の記録が不足しています。</p>`;
  const geometry = chartGeometry(items);
  const polyline = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
  const labelIndices = chartLabelIndices(geometry.points.length);
  const valueLabels = geometry.points.map((point, index) => labelIndices.has(index) ? `<text x="${point.x}" y="${Math.max(7, point.y - 4)}" text-anchor="middle" class="regional-history-chart__value-label">${escapeHtml(formatNumber(point.conditionIndexExact, 1))}</text>` : "").join("");
  return `<figure class="regional-history-chart" data-regional-history="true"><svg viewBox="0 0 100 56" role="img" aria-label="${escapeHtml(regionName)}の比較可能な${valueLabel}の推移"><text x="1.5" y="8" class="regional-history-chart__scale-label">${escapeHtml(formatNumber(geometry.maxValue, 0))}</text><text x="1.5" y="47" class="regional-history-chart__scale-label">${escapeHtml(formatNumber(geometry.minValue, 0))}</text><line x1="10" y1="${geometry.referenceY}" x2="96" y2="${geometry.referenceY}" class="regional-history-chart__reference"></line><text x="95" y="${Math.max(6, geometry.referenceY - 1.5)}" text-anchor="end" class="regional-history-chart__reference-label">基準100</text>${geometry.points.length > 1 ? `<polyline points="${polyline}" class="regional-history-chart__line"></polyline>` : ""}${valueLabels}${geometry.points.map((point) => `<a href="#/result?recordId=${encodeURIComponent(point.experience.record.id)}"><circle cx="${point.x}" cy="${point.y}" r="2.8" class="regional-history-chart__point"><title>${escapeHtml(`${formatLocalDate(point.experience.record.date)} ${valueLabel}${formatNumber(point.conditionIndexExact, 1)}、基準100との差${Number(point.conditionIndexExact) >= 100 ? "+" : ""}${formatNumber(Number(point.conditionIndexExact) - 100, 1)}`)}</title></circle></a>`).join("")}</svg><figcaption class="regional-history-chart__axis"><span>${escapeHtml(formatLocalDate(items[0].experience.record.date))}</span><strong>同じ数値定義を持つ記録だけを順につないでいます</strong><span>${escapeHtml(formatLocalDate(items.at(-1).experience.record.date))}</span></figcaption></figure>`;
}

function routeFamilyLabel(signature = null) {
  const tier = String(signature?.auditSupportTier || "");
  if (tier === "PROVISIONAL_AUTHORIZED") return "限定的な推定を含む";
  if (tier === "FORMAL_DIRECT_IN_DOMAIN") return "文献条件内";
  return "同じ比較指標";
}

function renderTrendTable(items) {
  const isNew = Boolean(items[0]?.isNewModelV1);
  const valueLabel = isNew ? "部位別比較値" : "条件応答";
  return `<div class="regional-trend-table"><table><thead><tr><th scope="col">日付</th><th scope="col">${valueLabel}</th><th scope="col">基準100との差</th><th scope="col">根拠の範囲</th></tr></thead><tbody>${items.map((item) => `<tr><th scope="row"><a href="#/result?recordId=${encodeURIComponent(item.experience.record.id)}">${escapeHtml(formatLocalDate(item.experience.record.date))}</a></th><td>${formatNumber(item.conditionIndexExact, 1)}</td><td>${Number(item.conditionIndexExact) >= 100 ? "+" : ""}${formatNumber(Number(item.conditionIndexExact) - 100, 1)}</td><td>${escapeHtml(routeFamilyLabel(item.signature))}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderRegionSelector(workspace) {
  return `<form id="regional-history-form" class="history-body-part-selector"><input type="hidden" name="view" value="trends"><input type="hidden" name="metric" value="region"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><label class="field"><span>推移を見る部位</span><select name="regionId">${REGIONS.map((region) => `<option value="${escapeHtml(region.id)}"${workspace.regionId === region.id ? " selected" : ""}>${escapeHtml(bodyRegionFormalName(region.id, region.name))}</option>`).join("")}</select></label><button class="button button--secondary" type="submit">部位を変更</button></form>`;
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
  return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="model" aria-labelledby="history-total-role-title"><p>走行全体の時系列</p><h2 id="history-total-role-title">比較できる推定ポイントを見返す</h2><p>線は走行全体の量の変化を示します。高い・低いを良し悪し、安全性、身体状態として評価しません。</p></section><section class="result-card" data-information-role="model" aria-labelledby="total-trend-title"><div class="result-card__heading"><div><p>${workspace.period}日間</p><h2 id="total-trend-title">走行全体の比較用推定値の推移</h2></div>${renderStatusLabel(`${workspace.totalRows.length}件`, "model")}</div><dl class="history-analysis-metrics"><div><dt>選択中の記録</dt><dd>${finite(anchorValue) ? formatNumber(anchorValue, 1) : "—"}</dd><small>推定ポイント</small></div><div><dt>過去中央値</dt><dd>${finite(workspace.totalMedian) ? formatNumber(workspace.totalMedian, 1) : "準備中"}</dd><small>今回を除く過去${referenceCount}件</small></div><div><dt>中央値との差</dt><dd>${difference == null ? "—" : `${difference > 0 ? "+" : ""}${formatNumber(difference, 1)}`}</dd><small>${percent == null ? `過去${TOTAL_MINIMUM_PRIOR}件から表示` : `${percent > 0 ? "+" : ""}${formatNumber(percent, 0)}%`}</small></div></dl><p class="source-boundary">中央値は本人の正常値・安全基準ではなく、選択期間内の比較できる記録の中央に位置する値です。</p>${renderTotalHistoryChart(workspace)}${workspace.totalRows.length ? renderTotalHistoryTable(workspace) : ""}</section>${renderPlanSummary(workspace)}</section>`;
}

function renderSubjectiveSelector(workspace) {
  if (!workspace.subjectiveOptions.length) return "";
  return `<form id="subjective-history-form" class="history-body-part-selector"><input type="hidden" name="view" value="trends"><input type="hidden" name="metric" value="subjective"><input type="hidden" name="period" value="${workspace.period}"><input type="hidden" name="anchorDate" value="${escapeHtml(workspace.endDate)}"><label class="field"><span>本人記録を見る部位</span><select name="subjectiveKey">${workspace.subjectiveOptions.map((item) => `<option value="${escapeHtml(item.key)}"${workspace.selectedSubjective?.key === item.key ? " selected" : ""}>${escapeHtml(`${item.label}・${bodyAreaLateralityLabel(item.laterality)}`)}</option>`).join("")}</select></label><button class="button button--secondary" type="submit">部位を変更</button></form>`;
}

function renderSubjectiveTrendView(workspace) {
  if (!workspace.selectedSubjective) {
    return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="personal" aria-labelledby="history-subjective-role-title"><p>本人が残した記録</p><h2 id="history-subjective-role-title">この期間に部位の身体記録はありません</h2><p>本人が部位と程度を入力すると、ここに日付順で表示します。</p></section></section>`;
  }
  return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="personal" aria-labelledby="history-subjective-role-title"><p>本人が残した記録</p><h2 id="history-subjective-role-title">同じ部位の入力を日付順に確認する</h2><p>入力値をそのまま並べます。線で傾向を作らず、改善・悪化・危険度を自動判定しません。</p></section>${renderSubjectiveSelector(workspace)}<section class="result-card result-card--subjective" data-information-role="personal" aria-labelledby="subjective-trend-title"><div class="result-card__heading"><div><p>本人入力の履歴</p><h2 id="subjective-trend-title">${escapeHtml(workspace.selectedSubjective.label)}・${escapeHtml(bodyAreaLateralityLabel(workspace.selectedSubjective.laterality))}</h2></div>${renderStatusLabel(`${workspace.subjectiveRows.length}件`, "info")}</div>${workspace.subjectiveRows.length ? `<ol class="history-subjective-timeline">${workspace.subjectiveRows.map((item) => `<li><time datetime="${escapeHtml(item.experience.record.date)}">${escapeHtml(formatLocalDate(item.experience.record.date))}</time><span><em>本人入力</em><strong>程度 ${escapeHtml(formatNumber(item.observation.intensity, 0))} / 5</strong></span><span><em>記録条件</em><strong>${escapeHtml(formatActivitySummary(item.experience.record))}</strong></span><a class="button button--text" href="#/result?recordId=${encodeURIComponent(item.experience.record.id)}">結果を開く</a></li>`).join("")}</ol>` : '<p class="muted-text">選択した部位の記録はありません。</p>'}<p class="source-boundary">同じ数値でも、その日の本人の判断基準や状況は異なる可能性があります。数値だけで身体状態を判断しません。</p></section></section>`;
}

function renderRegionTrendView(workspace) {
  const directItems = workspace.trendRows.filter((item) => item.compatibility.directDeltaAllowed && finite(item.conditionIndexExact)).sort((left, right) => recordChronology(left.experience, right.experience));
  const otherItems = workspace.trendRows.filter((item) => item.row && !item.compatibility.directDeltaAllowed).sort((left, right) => recordChronology(right.experience, left.experience));
  const isNew = Boolean(workspace.anchor?.isNewModelV1);
  const anchorConditionAvailable = Boolean(workspace.anchorSignature && finite(workspace.anchor?.conditionIndexExact));
  const title = isNew ? "同じ部位・同じ数値定義の記録だけで推移を見る" : "同じ条件応答として比較できる記録だけで推移を見る";
  const meaning = isNew ? "走行距離を含む部位別比較値" : bodyRegionPlainMeaning(workspace.region.id);
  const distanceNote = isNew ? "走行距離はこの比較値に含まれています。" : "共通走行量は別の情報で、このグラフの縦軸へ足しません。";
  return `<section class="history-trends-view"><section class="history-role-boundary" data-information-role="model" aria-labelledby="history-trend-role-title"><p>${isNew?"部位別比較値":"部位ごとの条件応答"}</p><h2 id="history-trend-role-title">${escapeHtml(title)}</h2><p>同じ部位・同じ数値定義・同じ基準・同じ保存時モデルで比べられる記録だけをつなぎます。異なる数値定義の記録は線でつなぎません。</p></section>${renderRegionSelector(workspace)}${!anchorConditionAvailable&&workspace.requestedRecordId?'<section class="result-card"><h2>この記録では数値推移を作りません</h2><p>同じ意味で比較できる部位別数値がありません。100を代入して補いません。</p></section>':""}<section class="result-card" data-information-role="model"><div class="result-card__heading"><div><p>同じ意味で比べられる記録</p><h2>${escapeHtml(bodyRegionFormalName(workspace.region.id, workspace.region.name))}の推移</h2></div>${renderStatusLabel(`グラフに使用 ${directItems.length}件`, "model")}</div><p class="inline-helper"><strong>この値が表すこと：</strong>${escapeHtml(meaning)}</p><p class="inline-helper"><strong>${escapeHtml(distanceNote)}</strong></p><p class="source-boundary">100は安全値・正常値・初心者平均ではありません。増減を改善・悪化・危険度とは評価しません。</p>${renderTrendChart(directItems, bodyRegionFormalName(workspace.region.id, workspace.region.name))}${directItems.length?renderTrendTable(directItems):""}</section>${otherItems.length?`<details class="history-detail-disclosure"><summary>同じ意味では比べられない記録 ${otherItems.length}件</summary><p>保存された記録は削除していません。数値定義または保存時の計算方法が一致しないため、グラフから分けています。</p></details>`:""}${renderPlanSummary(workspace)}</section>`;
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
  return `<section class="screen screen--history-unified">${renderPageHeading({ eyebrow: "保存した記録", title: "記録と推移を見返す", description: `${formatLocalDate(workspace.startDate)}〜${formatLocalDate(workspace.endDate)}。数値結果と本人入力を役割ごとに分けます。記録ノートは本人が選んで残した言葉です。` })}${renderRecordsWorkspaceNavigation({ active: "history", date: workspace.endDate })}${renderGuide()}${renderTabs(workspace)}${renderPeriodTabs(workspace)}${workspace.view === "trends" ? renderTrendView(workspace) : renderRecordView(workspace, context)}${services.workflows.history.loadUndoEntry() ? '<div class="history-undo" role="status"><p>直前に削除した記録を元に戻せます。</p><button class="button button--secondary" type="button" data-action="undo-history-delete">削除を元に戻す</button></div>' : ""}</section>`;
}
