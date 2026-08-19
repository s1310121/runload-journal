import {
  V27_EMPHASIS_REGION_IDS,
  V27_REGIONAL_VIEW_IDS,
  V27_REGIONS,
} from "../core/model/v27/v27Constants.js";
import { escapeHtml, renderStatusLabel } from "./commonComponents.js";
import { formatNumber } from "./recordPresentation.js";

const REGION_BY_ID = new Map(V27_REGIONS.map((region) => [region.id, region]));
const CONTEXT_REGION_IDS = Object.freeze(["R01", "R04"]);

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

const FRONT_SILHOUETTE = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK_SILHOUETTE = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const PLANTAR_SILHOUETTE = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';

const V27_MAP_VIEWS = Object.freeze([
  Object.freeze({
    id: "front",
    title: "前面",
    silhouette: FRONT_SILHOUETTE,
    paths: Object.freeze([
      Object.freeze({ regionId: "R01", d: "M124 110 C132 100 141 95 150 95 C159 95 168 100 176 110 L174 138 C166 146 160 150 150 150 C140 150 134 146 126 138 Z" }),
      Object.freeze({ regionId: "R03", d: "M120 184 C130 194 140 200 150 200 C160 200 170 194 180 184 L176 258 C168 268 160 274 150 274 C140 274 132 268 124 258 Z" }),
      Object.freeze({ regionId: "R05", d: "M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 298 C162 304 157 307 150 307 C143 307 138 304 130 298 Z" }),
      Object.freeze({ regionId: "R06", d: "M130 302 C138 310 144 314 150 314 C156 314 162 310 170 302 L166 384 C160 392 156 396 150 396 C144 396 140 392 134 384 Z" }),
      Object.freeze({ regionId: "R08", d: "M136 392 C142 398 146 401 150 401 C154 401 158 398 164 392 L166 416 H134 Z" }),
    ]),
  }),
  Object.freeze({
    id: "back",
    title: "後面",
    silhouette: BACK_SILHOUETTE,
    paths: Object.freeze([
      Object.freeze({ regionId: "R02", d: "M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 186 C170 198 160 204 150 204 C140 204 130 198 120 186 Z" }),
      Object.freeze({ regionId: "R04", d: "M120 194 C130 204 140 210 150 210 C160 210 170 204 180 194 L176 270 C168 278 160 282 150 282 C140 282 132 278 124 270 Z" }),
      Object.freeze({ regionId: "R07", d: "M128 286 C136 296 143 300 150 300 C157 300 164 296 172 286 L166 380 C160 390 156 395 150 395 C144 395 140 390 134 380 Z M142 380 C146 386 148 389 150 389 C152 389 154 386 158 380 L158 416 H142 Z" }),
    ]),
  }),
  Object.freeze({
    id: "plantar",
    title: "足裏",
    silhouette: PLANTAR_SILHOUETTE,
    paths: Object.freeze([
      Object.freeze({ regionId: "R08", d: "M118 96 C128 88 140 84 154 84 C174 84 186 96 190 118 L192 238 C190 270 178 294 160 304 C150 310 140 310 130 304 C114 294 104 270 104 238 L106 118 C108 108 112 100 118 96 Z" }),
    ]),
  }),
]);

const VIEW_META = Object.freeze({
  [V27_REGIONAL_VIEW_IDS.withinRun]: Object.freeze({
    label: "今回の部位間比較",
    subtitle: "6部位平均=100",
    helper: "今回の対象部位を同じ画面で見比べる表示です。身体全体の100%配分や、個人の身体を測った値ではありません。",
    referenceText: "6部位平均",
  }),
  [V27_REGIONAL_VIEW_IDS.ownFlat]: Object.freeze({
    label: "平坦基準との比較",
    subtitle: "各部位の平坦条件=100",
    helper: "各部位について、平坦な条件を100として見ます。部位ごとに意味が違うため、部位どうしの順位には使えません。",
    referenceText: "平坦基準",
  }),
  [V27_REGIONAL_VIEW_IDS.personal]: Object.freeze({
    label: "自分の過去記録との比較",
    subtitle: "同じ意味で比べられる過去記録の中央値=100",
    helper: "同じ部位・同じ基準など、同じ意味で比べられる過去記録だけを使います。過去記録が3件未満の部位には数値を表示しません。",
    referenceText: "自分の過去中央値",
  }),
});

function visualIntensity(value) {
  if (!hasFiniteValue(value)) return 0;
  const bounded = Math.min(150, Math.max(50, Number(value)));
  return 0.25 + 0.65 * (bounded - 50) / 100;
}

function numericDirection(value, viewId) {
  if (!hasFiniteValue(value)) return "数値なし";
  const reference = VIEW_META[viewId].referenceText;
  if (Math.abs(Number(value) - 100) < 0.5) return `${reference}付近`;
  return Number(value) > 100 ? `${reference}より上向き` : `${reference}より下向き`;
}

function rowFromWithin(result, regionId) {
  const row = result?.within_run_regional_emphasis?.rows?.find(
    (item) => item.region_id === regionId,
  );
  if (!row) return null;
  return {
    regionId,
    value: row.relative_emphasis_index,
    range: row.relative_emphasis_range,
    showRange: row.show_range_primary,
    state: "AVAILABLE",
    endpoint: row.endpoint,
    confidence: row.endpoint_confidence,
  };
}

function rowFromOwnFlat(result, regionId) {
  const row = result?.regional?.[regionId];
  if (!row || row.primary_display_mode !== "CONDITION_RESPONSIVE_NUMERIC") return null;
  return {
    regionId,
    value: row.run_fact_regional_ratio,
    range: row.condition_index_range,
    showRange: row.show_range_primary,
    state: "AVAILABLE",
    endpoint: row.endpoint,
    confidence: row.endpoint_confidence,
  };
}

function rowFromPersonal(resultRecord, regionId) {
  const source = resultRecord?.result?.regional?.[regionId];
  const personal = resultRecord?.personal_reference_snapshots?.[regionId];
  if (!source || !personal) return null;
  return {
    regionId,
    value: personal.value,
    range: null,
    showRange: false,
    state: personal.state,
    eligibleN: personal.eligible_n,
    firstDate: personal.first_date,
    lastDate: personal.last_date,
    endpoint: source.endpoint,
    confidence: source.endpoint_confidence,
  };
}

function rowsForView(resultRecord, viewId) {
  const result = resultRecord?.result;
  if (viewId === V27_REGIONAL_VIEW_IDS.withinRun) {
    return V27_EMPHASIS_REGION_IDS.map((regionId) => rowFromWithin(result, regionId));
  }
  if (viewId === V27_REGIONAL_VIEW_IDS.ownFlat) {
    return V27_EMPHASIS_REGION_IDS.map((regionId) => rowFromOwnFlat(result, regionId));
  }
  return V27_EMPHASIS_REGION_IDS.map((regionId) => rowFromPersonal(resultRecord, regionId));
}

function coverageChips(result, regionId) {
  const row = result?.regional?.[regionId];
  if (!row) return [];
  const grade = row.grade_coverage == null
    ? null
    : row.grade_coverage === 0
      ? "勾配不明"
      : `勾配条件 ${Math.round(row.grade_coverage * 100)}%`;
  const speed = {
    KNOWN_APPLIED: "平均ペースを確認",
    OUT_OF_DOMAIN: "平均ペースは表示対象外",
    NOT_APPLICABLE: "平均ペースの確認なし",
  }[row.speed_state];
  const cadence = {
    KNOWN_APPLIED: "歩数を確認",
    OUT_OF_DOMAIN: "歩数は表示対象外",
    UNKNOWN: "歩数は未確認",
    NOT_APPLICABLE: "歩数の確認なし",
  }[row.cadence_state];
  return [grade, speed, cadence].filter(Boolean);
}

function formatRowValue(row) {
  if (!row || row.state === "BUILDING_REFERENCE") {
    return `<span class="regional-result-row__building">基準作成中 ${row?.eligibleN || 0}/3</span>`;
  }
  if (!hasFiniteValue(row.value)) return '<span class="regional-result-row__building">数値なし</span>';
  const central = Math.round(Number(row.value));
  if (
    row.showRange
    && Array.isArray(row.range)
    && row.range.every((value) => Number.isFinite(Number(value)))
  ) {
    return `<strong>${central}</strong><small>範囲 ${Math.round(row.range[0])}–${Math.round(row.range[1])}</small>`;
  }
  return `<strong>${central}</strong>`;
}

function renderRegionalList(resultRecord, viewId, rows) {
  const result = resultRecord?.result;
  return `<div class="regional-result-list">
    <ul class="regional-result-list__numeric">${rows.map((row, index) => {
      const regionId = V27_EMPHASIS_REGION_IDS[index];
      const label = REGION_BY_ID.get(regionId)?.label || regionId;
      const chips = coverageChips(result, regionId);
      const personalDetail = viewId === V27_REGIONAL_VIEW_IDS.personal && row?.eligibleN >= 3
        ? `${row.state === "PROVISIONAL" ? "暫定" : "利用可"}・過去${row.eligibleN}件${row.firstDate && row.lastDate ? `（${row.firstDate}〜${row.lastDate}）` : ""}`
        : "";
      const value = hasFiniteValue(row?.value) ? Number(row.value) : null;
      const visualPosition = value !== null ? Math.min(100, Math.max(0, value / 2)) : 0;
      return `<li class="regional-result-row">
        <a href="#/body-part-detail?recordId=${encodeURIComponent(resultRecord.record_id)}&regionId=${encodeURIComponent(regionId)}&viewId=${encodeURIComponent(viewId)}" aria-label="${escapeHtml(label)}の根拠と読み方を開く">
          <span class="regional-result-row__name"><strong>${escapeHtml(label)}</strong></span>
          <span class="regional-result-row__value">${formatRowValue(row)}</span>
          ${value !== null ? `<span class="regional-result-row__direction">${escapeHtml(numericDirection(value, viewId))}</span><span class="regional-result-row__scale" aria-hidden="true"><i></i><b style="--regional-position:${visualPosition}%"></b></span>` : `<span class="regional-result-row__direction">${escapeHtml(personalDetail || "適格な過去記録を蓄積中")}</span>`}
          ${personalDetail ? `<span class="regional-result-row__personal">${escapeHtml(personalDetail)}</span>` : ""}
          ${chips.length ? `<span class="regional-result-row__chips">${chips.map((chip) => `<small>${escapeHtml(chip)}</small>`).join("")}</span>` : ""}
        </a>
      </li>`;
    }).join("")}</ul>
    <ul class="regional-context-list">${CONTEXT_REGION_IDS.map((regionId) => `<li><span><strong>${escapeHtml(REGION_BY_ID.get(regionId)?.label || "対象部位")}</strong></span><span>走行量をもとに表示</span></li>`).join("")}</ul>
  </div>`;
}

function renderRegionalMap(rows, viewId) {
  const rowById = new Map(rows.filter(Boolean).map((row) => [row.regionId, row]));
  const mapSummary = V27_EMPHASIS_REGION_IDS.map((regionId) => {
    const row = rowById.get(regionId);
    const label = REGION_BY_ID.get(regionId)?.label || regionId;
    return hasFiniteValue(row?.value)
      ? `${label}${Math.round(row.value)}`
      : `${label}数値なし`;
  }).join("、");
  return `<div class="v27-body-map" role="img" aria-label="${escapeHtml(`${VIEW_META[viewId].label}。${mapSummary}。腰・骨盤と大腿後部は走行量をもとに表示。`)}">
    ${V27_MAP_VIEWS.map((view) => `<figure class="v27-body-map__view"><figcaption>${escapeHtml(view.title)}</figcaption><svg viewBox="70 10 160 430" aria-hidden="true" focusable="false"><g class="body-map__silhouette">${view.silhouette}</g>${view.paths.map(({ regionId, d }) => {
      const row = rowById.get(regionId);
      const contextOnly = CONTEXT_REGION_IDS.includes(regionId);
      const label = REGION_BY_ID.get(regionId)?.label || regionId;
      const valueText = hasFiniteValue(row?.value) ? `${Math.round(row.value)}` : "数値なし";
      return `<path class="v27-body-map__region${contextOnly ? " is-context" : ""}" style="--regional-opacity:${visualIntensity(row?.value)}" data-region-id="${escapeHtml(regionId)}" d="${d}"><title>${escapeHtml(`${label} ${valueText}`)}</title></path>`;
    }).join("")}</svg></figure>`).join("")}
  </div>`;
}

function renderUnavailableState(resultRecord, viewId) {
  if (viewId === V27_REGIONAL_VIEW_IDS.withinRun) {
    const state = resultRecord?.result?.within_run_regional_emphasis?.state;
    if (state === "UNAVAILABLE_COVERAGE_MISMATCH") {
      return '<div class="regional-view-unavailable"><strong>同じ範囲で比較できません</strong><p>6部位で確認できた勾配範囲が一致しないため、部位間比較を作成していません。平坦基準との比較は確認できます。</p></div>';
    }
  }
  return "";
}

function renderViewPanel(resultRecord, viewId, selectedView) {
  const rows = rowsForView(resultRecord, viewId);
  const meta = VIEW_META[viewId];
  const unavailable = renderUnavailableState(resultRecord, viewId);
  const availableRows = rows.filter(Boolean);
  const coldStartCount = viewId === V27_REGIONAL_VIEW_IDS.personal
    ? Math.max(0, ...availableRows.map((row) => Number(row?.eligibleN || 0)))
    : null;
  const coldStart = viewId === V27_REGIONAL_VIEW_IDS.personal
    && availableRows.every((row) => !hasFiniteValue(row?.value));
  const partial = viewId !== V27_REGIONAL_VIEW_IDS.personal
    && resultRecord?.result?.within_run_regional_emphasis?.coverage_state === "PARTIAL";
  return `<section id="regional-panel-${escapeHtml(viewId)}" class="regional-view-panel" role="tabpanel" aria-labelledby="regional-tab-${escapeHtml(viewId)}"${selectedView === viewId ? "" : " hidden"}>
    <div class="regional-view-panel__heading"><div><strong>${escapeHtml(meta.subtitle)}</strong><p>${escapeHtml(meta.helper)}</p></div>${partial ? renderStatusLabel("一部の条件で表示", "neutral") : ""}</div>
    ${coldStart ? `<div class="regional-view-unavailable"><strong>比較基準を作成中（適格な過去記録 ${coldStartCount}/3）</strong><p>「今回の部位間比較」と「平坦基準との比較」は今すぐ確認できます。</p></div>` : ""}
    ${unavailable || `${renderRegionalMap(rows, viewId)}${renderRegionalList(resultRecord, viewId, rows)}`}
  </section>`;
}

export function renderV27RegionalCard({ resultRecord, selectedView }) {
  const allowedViews = Object.values(V27_REGIONAL_VIEW_IDS);
  const activeView = allowedViews.includes(selectedView)
    ? selectedView
    : V27_REGIONAL_VIEW_IDS.withinRun;
  return `<section class="result-card result-card--distribution result-card--regional-v27" data-information-role="model" aria-labelledby="distribution-title" data-regional-result-card data-record-id="${escapeHtml(resultRecord.record_id)}">
    <div class="result-card__heading"><div><p>部位ごとの比較表示</p><h2 id="distribution-title">部位ごとの相対比較値</h2></div>${renderStatusLabel(VIEW_META[activeView].subtitle, "model")}</div>
    <div class="regional-view-tabs" role="tablist" aria-label="部位ごとの相対比較値の比較基準">${allowedViews.map((viewId) => `<button id="regional-tab-${escapeHtml(viewId)}" type="button" role="tab" aria-selected="${activeView === viewId ? "true" : "false"}" aria-controls="regional-panel-${escapeHtml(viewId)}" tabindex="${activeView === viewId ? "0" : "-1"}" data-regional-view="${escapeHtml(viewId)}">${escapeHtml(VIEW_META[viewId].label)}</button>`).join("")}</div>
    <p class="regional-view-announcement visually-hidden" aria-live="polite" data-regional-view-announcement>${escapeHtml(VIEW_META[activeView].label)}</p>
    ${allowedViews.map((viewId) => renderViewPanel(resultRecord, viewId, activeView)).join("")}
    <details class="regional-claim-boundary"><summary>この表示で言えること・言えないこと</summary><div><p>坂道、走行ペース、歩数、路面が変わると、身体の使われ方も変わることが先行研究で報告されています。この表示は、その知見と今回の記録を照らして見るための参考です。</p><p>筋肉・腱・関節に加わった実際の力、身体全体の配分、障害の有無や発生確率、走行してよいかどうかは示しません。</p></div></details>
  </section>`;
}

function percentage(value) {
  return hasFiniteValue(value) ? `${Math.round(Number(value) * 100)}%` : "—";
}

function signedNumber(value, digits = 1) {
  if (!hasFiniteValue(value)) return "—";
  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${formatNumber(numeric, digits)}`;
}

function modelTotalTrendGeometry(points = [], medianValue = null) {
  const values = [
    ...points.map((point) => Number(point.value)).filter(Number.isFinite),
    Number(medianValue),
  ].filter(Number.isFinite);
  if (!values.length) return null;
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(1, (rawMax - rawMin) * 0.14);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const span = Math.max(1, max - min);
  const xStart = 34;
  const xEnd = 396;
  const yTop = 18;
  const yBottom = 104;
  const mapY = (value) => yBottom - ((Number(value) - min) / span) * (yBottom - yTop);
  return Object.freeze({
    points: Object.freeze(points.map((point, index) => Object.freeze({
      ...point,
      x: points.length === 1 ? (xStart + xEnd) / 2 : xStart + (index * (xEnd - xStart)) / (points.length - 1),
      y: mapY(point.value),
    }))),
    medianY: mapY(medianValue),
    min,
    max,
  });
}

function renderModelTotalTrend(comparison = {}) {
  if (comparison.kind === "insufficient" || !Array.isArray(comparison.trendPoints) || !comparison.trendPoints.length) {
    const remaining = Math.max(0, Number(comparison.minimumPriorCount || 3) - Number(comparison.count || 0));
    return `<div class="model-total-trend model-total-trend--building"><p><strong>自分の過去記録との比較は準備中です。</strong> 同じ意味で比べられる過去記録があと${remaining}件たまると、ここに中央値と小型グラフを表示します。</p></div>`;
  }
  const geometry = modelTotalTrendGeometry(comparison.trendPoints, comparison.median);
  if (!geometry) return "";
  const polyline = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
  const ariaSummary = `走行全体の推定ポイントの推移。過去${comparison.count}件の中央値は${formatNumber(comparison.median, 1)}、今回の値は${formatNumber(comparison.currentValue, 1)}。`;
  return `<figure class="model-total-trend">
    <figcaption>直近の比較可能な記録</figcaption>
    <svg viewBox="0 0 430 148" role="img" aria-label="${escapeHtml(ariaSummary)}">
      <line x1="24" y1="${geometry.medianY}" x2="406" y2="${geometry.medianY}" class="model-total-trend__average"></line>
      <text x="28" y="${Math.max(13, geometry.medianY - 5)}">中央値 ${escapeHtml(formatNumber(comparison.median, 1))}</text>
      ${geometry.points.length > 1 ? `<polyline points="${polyline}" class="model-total-trend__line"></polyline>` : ""}
      ${geometry.points.map((point) => `<a href="#/result?recordId=${encodeURIComponent(point.recordId || "")}" aria-label="${escapeHtml(`${point.label} ${formatNumber(point.value, 1)}推定ポイント`)}"><circle cx="${point.x}" cy="${point.y}" r="${point.current ? 5.3 : 4}" class="model-total-trend__point${point.current ? " is-current" : ""}"><title>${escapeHtml(`${point.label} ${formatNumber(point.value, 1)}推定ポイント`)}</title></circle></a><text x="${point.x}" y="128" text-anchor="middle">${escapeHtml(point.label)}</text>`).join("")}
    </svg>
    <p>${comparison.provisional ? "比べられる記録が3〜5件のため、少ない記録での参考表示です。" : "同じ意味で比べられる過去記録だけを線で結んでいます。"}</p>
    <ul class="visually-hidden">${geometry.points.map((point) => `<li>${escapeHtml(point.label)}：${escapeHtml(formatNumber(point.value, 1))}推定ポイント</li>`).join("")}</ul>
  </figure>`;
}

export function renderV27TotalCard({ resultRecord, comparison = {} }) {
  if (resultRecord.state === "REST") {
    return `<section class="result-card result-card--model" data-information-role="model" aria-labelledby="recent-comparison-title"><div class="result-card__heading"><div><p>走行全体の比較表示</p><h2 id="recent-comparison-title">走行全体の比較用推定値</h2></div>${renderStatusLabel("休養記録", "neutral")}</div><p>休養日は走行による比較用推定値を作成しません。</p></section>`;
  }
  const total = resultRecord.result?.total;
  const value = Number(total?.central_points);
  const range = total?.range_points || [];
  const showRange = total?.show_range_primary === true;
  const comparisonAvailable = comparison.kind !== "insufficient" && comparison.kind !== "rest" && hasFiniteValue(comparison.median);
  const medianDifferenceText = comparisonAvailable
    ? `${signedNumber(comparison.differenceFromMedian, 1)}ポイント（${signedNumber(comparison.differencePercentFromMedian, 0)}%）`
    : "—";
  const date = resultRecord.input_snapshot?.record?.date || "";
  const historyHref = `#/history?view=trends&metric=total&period=${encodeURIComponent(comparison.days || 28)}&anchorDate=${encodeURIComponent(date)}&recordId=${encodeURIComponent(resultRecord.record_id || "")}`;
  return `<section class="result-card result-card--model result-card--comparison" data-information-role="model" aria-labelledby="recent-comparison-title">
    <div class="result-card__heading"><div><p>今回の走行全体の位置づけ</p><h2 id="recent-comparison-title">走行全体の比較用推定値</h2></div>${renderStatusLabel("走行全体", "model")}</div>
    <div class="model-total"><strong>${formatNumber(value, 1)}</strong><span>推定ポイント</span></div>
    ${showRange && range.length === 2 ? `<p class="total-primary-range"><strong>${formatNumber(range[0], 1)}–${formatNumber(range[1], 1)}</strong><span>考えられる範囲</span></p>` : range.length === 2 && Math.abs(Number(range[1]) - Number(range[0])) > 1e-9 ? `<p class="muted-text">表示範囲：${formatNumber(range[0], 1)}–${formatNumber(range[1], 1)}</p>` : ""}
    <dl class="recent-comparison-values recent-comparison-values--three"><div><dt>自分の過去中央値</dt><dd>${comparisonAvailable ? formatNumber(comparison.median, 1) : "準備中"}</dd></div><div><dt>中央値との差</dt><dd>${escapeHtml(medianDifferenceText)}</dd></div><div><dt>比較した過去記録</dt><dd>${comparison.count || 0}件 / 過去${comparison.days || 28}日</dd></div></dl>
    ${renderModelTotalTrend(comparison)}
    <dl class="recent-comparison-values"><div><dt>確認できた勾配区間</dt><dd>${percentage(total?.grade_coverage)}</dd></div><div><dt>確認できた路面区間</dt><dd>${percentage(total?.surface_coverage)}</dd></div></dl>
    ${total?.pairing_state === "MARGINAL_OVERLAP_UNKNOWN" ? '<p class="inline-helper">坂と路面の重なりが分からないため、考えられる範囲を広めに示しています。</p>' : ""}
    <p>走った量と、分かっている坂・路面を一緒に振り返るための参考値です。同じ意味で比べられる過去走行だけを使います。高い・低いは記録した走行内容の違いであり、良し悪し・安全性・身体状態を示しません。</p>
    <div class="result-card__actions"><a class="button button--secondary" href="${escapeHtml(historyHref)}">走行全体の詳しい推移を見る</a></div>
  </section>`;
}

export function regionalViewLabel(viewId) {
  return VIEW_META[viewId]?.label || VIEW_META[V27_REGIONAL_VIEW_IDS.withinRun].label;
}
