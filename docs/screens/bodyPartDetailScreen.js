import { REGIONS as REGIONAL_V1_REGIONS } from "../core/model/regionalV1/engine/data.js";
import { BODY_AREA_TO_REGIONAL_V1 } from "../core/model/regionalV1/regionalV1InputAdapter.js";
import {
  buildA7ConditionHistoryComparison,
  buildA7RegionSemanticDecomposition,
  regionalV1ExposureMeta,
} from "../core/model/regionalV1/regionalV1ResultService.js";
import {
  V27_REGIONAL_VIEW_IDS,
  V27_REGIONS,
} from "../core/model/v27/v27Constants.js";
import {
  escapeHtml,
  renderEmptyState,
  renderPageHeading,
  renderStatusLabel,
} from "../ui/commonComponents.js";
import {
  BODY_PART_DISPLAY_NAMES,
  BODY_PARTS,
  formatLocalDate,
  getEnteredBodyParts,
} from "../ui/recordPresentation.js";
import { regionalViewLabel } from "../ui/v27ResultPresentation.js";
import { bodyAreaLateralityLabel } from "../core/model/v27/bodyAreaTaxonomy.js";
import {
  buildRegionalConditionExplanation,
  columnHrefForCondition,
} from "../ui/hierarchicalExplanation.js";
import { renderResultWorkspaceNavigation } from "../ui/screenArchitecture.js";
import {
  bodyRegionDisplayName,
  bodyRegionFormalName,
  bodyRegionPlainMeaning,
} from "../ui/bodyRegionTerminology.js";

const REGION_BY_ID = new Map(V27_REGIONS.map((region) => [region.id, region]));
const CONTEXT_REGIONS = new Set(["R01", "R04"]);
const ALLOWED_VIEWS = new Set(Object.values(V27_REGIONAL_VIEW_IDS));

const SAVED_BODY_TO_REGION = Object.freeze({
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

const REGION_TO_SAVED_BODIES = Object.freeze({
  R01: Object.freeze(["腰骨盤部"]),
  R02: Object.freeze(["股関節臀部"]),
  R03: Object.freeze(["大腿"]),
  R04: Object.freeze([]),
  R05: Object.freeze(["膝"]),
  R06: Object.freeze(["前下腿"]),
  R07: Object.freeze(["後下腿", "アキレス腱"]),
  R08: Object.freeze(["足底部", "足関節・足背部"]),
});

const REFERENCE_CONTENT_LABELS = Object.freeze({
  volume_only: "走った距離に関する研究上の傾向",
  positive_hip_joint_power: "股関節まわりの動き方に関する研究上の傾向",
  negative_knee_joint_power_magnitude: "膝まわりの動き方に関する研究上の傾向",
  pfj_cumulative_weighted_impulse_per_km: "膝の前側への繰り返しのかかり方に関する研究上の傾向",
  tibial_cumulative_weighted_impulse_per_km: "すねへの繰り返しのかかり方に関する研究上の傾向",
  achilles_cumulative_weighted_impulse_per_km: "アキレス腱周辺への繰り返しのかかり方に関する研究上の傾向",
  absolute_ankle_joint_power_sum: "足首まわりの動き方に関する研究上の傾向",
});

function viewIdFromContext(context) {
  const value = String(context.parameters.get("viewId") || "");
  return ALLOWED_VIEWS.has(value) ? value : V27_REGIONAL_VIEW_IDS.withinRun;
}

function resolvedRegionId(context) {
  const requested = String(context.parameters.get("regionId") || "");
  if (REGION_BY_ID.has(requested)) return requested;
  const savedBodyPart = String(context.parameters.get("bodyPart") || "");
  return SAVED_BODY_TO_REGION[savedBodyPart] || "";
}

function valueForView(resultRecord, regionId, viewId) {
  const regional = resultRecord?.result?.regional?.[regionId];
  if (!regional) return null;
  if (CONTEXT_REGIONS.has(regionId)) {
    return { state: "CONTEXT_ONLY", value: null, range: null, reference: "走行量" };
  }
  if (viewId === V27_REGIONAL_VIEW_IDS.withinRun) {
    const row = resultRecord.result?.within_run_regional_emphasis?.rows?.find(
      (item) => item.region_id === regionId,
    );
    return row ? {
      state: "AVAILABLE",
      value: row.relative_emphasis_index,
      range: row.relative_emphasis_range,
      showRange: row.show_range_primary,
      reference: "今回の対象部位の平均=100",
    } : {
      state: resultRecord.result?.within_run_regional_emphasis?.state || "UNAVAILABLE",
      value: null,
      range: null,
      reference: "今回の対象部位の平均=100",
    };
  }
  if (viewId === V27_REGIONAL_VIEW_IDS.ownFlat) {
    return {
      state: "AVAILABLE",
      value: regional.run_fact_regional_ratio,
      range: regional.condition_index_range,
      showRange: regional.show_range_primary,
      reference: "この部位の平坦条件=100",
    };
  }
  const personal = resultRecord.personal_reference_snapshots?.[regionId];
  return {
    state: personal?.state || "BUILDING_REFERENCE",
    value: personal?.value ?? null,
    range: null,
    reference: "本人の過去記録の中央値=100",
    eligibleN: personal?.eligible_n || 0,
    firstDate: personal?.first_date || null,
    lastDate: personal?.last_date || null,
  };
}

function directionText(value, viewId) {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "数値なし";
  const reference = viewId === V27_REGIONAL_VIEW_IDS.withinRun
    ? "対象部位の平均"
    : viewId === V27_REGIONAL_VIEW_IDS.ownFlat
      ? "平坦条件"
      : "本人の過去中央値";
  if (Math.abs(Number(value) - 100) < 0.5) return `${reference}付近`;
  return Number(value) > 100 ? `${reference}より高い` : `${reference}より低い`;
}

function stateLabel(state) {
  return {
    KNOWN_APPLIED: "確認できた",
    UNKNOWN: "分からない",
    OUT_OF_DOMAIN: "確認できる範囲外",
    NOT_APPLICABLE: "対象外",
    INVALID: "確認できない",
  }[state] || "確認できない";
}

function renderCurrentValue(valueState, viewId) {
  if (!valueState || valueState.state === "CONTEXT_ONLY") {
    return `<div class="body-part-detail__context-value"><strong>走行量を記録</strong><p>この部位では、条件による数値差を表示していません。</p></div>`;
  }
  if (valueState.value == null || valueState.value === "" || !Number.isFinite(Number(valueState.value))) {
    const text = viewId === V27_REGIONAL_VIEW_IDS.personal
      ? `自分の過去記録との比較を準備中（比べられる過去記録 ${valueState.eligibleN || 0}/3）`
      : "この記録では比較値を表示できません";
    return `<div class="body-part-detail__context-value"><strong>${escapeHtml(text)}</strong><p>保存された記録内容は結果画面で確認できます。</p></div>`;
  }
  const range = valueState.showRange && Array.isArray(valueState.range)
    ? `<span>表示範囲 ${Math.round(valueState.range[0])}–${Math.round(valueState.range[1])}</span>`
    : "";
  const history = valueState.firstDate && valueState.lastDate
    ? `<small>過去${valueState.eligibleN}件（${escapeHtml(valueState.firstDate)}〜${escapeHtml(valueState.lastDate)}）</small>`
    : "";
  return `<div class="body-part-detail__primary-value"><strong>${Math.round(valueState.value)}</strong><div><span>${escapeHtml(directionText(valueState.value, viewId))}</span>${range}${history}</div></div>`;
}

function renderInputCoverage(regional) {
  if (!regional) return '<p class="muted-text">今回確認できる条件はありません。</p>';
  const grade = regional.grade_coverage == null
    ? "入力状況を確認できない"
    : regional.grade_coverage === 0
      ? "分からない"
      : `${Math.round(regional.grade_coverage * 100)}%の区間を確認`;
  return `<dl class="fact-grid">
    <div><dt>勾配</dt><dd>${escapeHtml(grade)}</dd></div>
    <div><dt>平均ペース</dt><dd>${escapeHtml(stateLabel(regional.speed_state))}</dd></div>
    <div><dt>歩数</dt><dd>${escapeHtml(stateLabel(regional.cadence_state))}</dd></div>
    <div class="fact-grid__wide"><dt>この表示が表すこと</dt><dd>${escapeHtml(REFERENCE_CONTENT_LABELS[regional.endpoint] || "この部位に関する研究上の傾向")}</dd></div>
  </dl>`;
}

function renderSurfaceContexts(contexts = []) {
  if (!contexts.length) return '<p class="muted-text">この部位について追加できる路面の説明はありません。</p>';
  const labels = {
    SAND_TIBIALIS_ANTERIOR_TESTED_INCREASE_GROUP_DEPENDENT: "砂地で前脛骨筋の活動が増えた試験がありますが、対象者や条件によって異なります。",
    SAND_GASTROCNEMIUS_RESPONSE_LOWER_OR_MIXED: "砂地で腓腹筋の反応は低下または一定せず、一方向の変化として扱えません。",
    SAND_REGIONAL_SCALAR_NOT_ESTABLISHED: "砂地での身体の反応は研究条件によって異なり、一つの方向には決められません。",
    UNEVEN_SELECTED_ANTERIOR_THIGH_EMG_INCREASED_IN_TEST: "特定の不整地試験で、大腿前部の一部の筋活動が増えました。一般的な変化量としては扱いません。",
    UNEVEN_MEDIAL_HAMSTRING_EMG_INCREASED_IN_TEST: "特定の不整地試験で、内側ハムストリングの活動が増えました。一般的な変化量としては扱いません。",
    UNEVEN_ANKLE_WORK_DECREASED_WHILE_VARIABILITY_INCREASED: "特定の不整地試験では、足首の使い方が変わり、反応のばらつきが増えました。",
    UNEVEN_REGIONAL_VARIABILITY_CONTEXT_ONLY: "不整地では、平らな路面より身体の反応にばらつきが出ることがあります。",
    KNOWN_SURFACE_WITHOUT_REGIONAL_SCALAR: "路面ごとの研究条件は限られるため、この記録だけで個人の反応は分かりません。",
    UNKNOWN_SURFACE_NO_REGIONAL_INFERENCE: "路面が分からないため、路面との関係はこの記録だけでは分かりません。",
  };
  return `<ul class="body-part-evidence-list">${contexts.map((context) => `<li>${escapeHtml(labels[context] || "路面について追加の注意があります。")}</li>`).join("")}</ul>`;
}

function subjectiveForRegion(feedback, regionId) {
  const exact = Array.isArray(feedback?.bodyAreaObservations)
    ? feedback.bodyAreaObservations
      .filter((item) => item?.modelRegionId === regionId)
      .map((item) => ({
        label: item.label || "詳細部位",
        intensity: Number(item.intensity || 0),
        laterality: String(item.laterality || "UNKNOWN"),
        saved: false,
      }))
    : [];
  const entered = getEnteredBodyParts(feedback || {});
  const mapped = REGION_TO_SAVED_BODIES[regionId] || [];
  const saved = mapped.filter((bodyPart) => entered.includes(bodyPart)).map((bodyPart) => ({
    label: BODY_PART_DISPLAY_NAMES[bodyPart] || bodyPart,
    fatigue: Number(feedback?.fatigueByBodyPart?.[bodyPart] || 0),
    discomfort: Number(feedback?.discomfortByBodyPart?.[bodyPart] || 0),
    saved: true,
  }));
  return [...exact, ...saved];
}

function renderSubjective(feedback, regionId) {
  const entries = subjectiveForRegion(feedback, regionId);
  if (!entries.length) {
    return `<p class="muted-text">この部位に対応する本人の身体記録はありません。未入力を「問題なし」とは解釈しません。</p>`;
  }
  return `<div class="subjective-entry-list">${entries.map((entry) => {
    const details = [];
    if (!entry.saved && entry.intensity > 0) {
      details.push(bodyAreaLateralityLabel(entry.laterality));
      details.push(`気になる程度 ${entry.intensity}/5`);
    }
    if (entry.saved && entry.fatigue > 0) details.push(`疲れ・だるさ ${entry.fatigue}/5`);
    if (entry.saved && entry.discomfort > 0) details.push(`気になる感じ ${entry.discomfort}/5`);
    if (!details.length) details.push("確認済み");
    return `<article><h3>${escapeHtml(entry.label)}</h3><p>${escapeHtml(details.join("・"))}</p>${entry.saved ? "<small>保存された入力</small>" : ""}</article>`;
  }).join("")}</div><p class="source-boundary">本人の身体記録と部位の条件応答は別の情報です。一致や不一致から原因を推定しません。</p>`;
}

function renderRegionNavigation(recordId, currentRegionId, viewId = "") {
  return `<nav class="body-part-navigation" aria-label="他の部位">${V27_REGIONS.filter((region) => region.id !== currentRegionId).map((region) => `<a class="body-part-navigation__link" href="#/body-part-detail?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(region.id)}${viewId ? `&viewId=${encodeURIComponent(viewId)}` : ""}"><strong>${escapeHtml(region.label)}</strong><span>${CONTEXT_REGIONS.has(region.id) ? "走行量" : "詳細"}</span></a>`).join("")}</nav>`;
}

function renderUnavailableSavedDetail(experience, bodyPart) {
  const display = BODY_PART_DISPLAY_NAMES[bodyPart] || bodyPart || "この部位";
  const regionId = SAVED_BODY_TO_REGION[bodyPart] || "";
  return `<section class="screen screen--body-part-detail">
    ${renderPageHeading({ eyebrow: "結果の詳細", title: `${display}の保存記録`, description: `${formatLocalDate(experience.record.date)}に保存された内容です。` })}
    ${renderResultWorkspaceNavigation({ recordId: experience.record.id, date: experience.record.date, active: "region" })}
    <section class="result-card"><div class="result-card__heading"><div><p>保存された記録</p><h2>この記録では部位の比較値を表示できません</h2></div>${renderStatusLabel("保存内容は確認できます", "neutral")}</div><p>現在の部位別表示に必要な条件がそろっていないため、別の記録との数値比較は行いません。</p>${regionId ? renderSubjective(experience.feedback || {}, regionId) : ""}</section>
    <div class="screen-actions"><a class="button button--primary" href="#/result?recordId=${encodeURIComponent(experience.record.id)}">今回の結果へ戻る</a></div>
  </section>`;
}

function renderSavedComparisonDetail({ services, context }) {
  const recordId = String(context.parameters.get("recordId") || "");
  const experience = services.workflows.records.loadExperience(recordId);
  const requestedBodyPart = String(context.parameters.get("bodyPart") || "");
  if (!experience) {
    return `<section class="screen">${renderPageHeading({ eyebrow: "結果の詳細", title: "部位の結果を詳しく見る", description: "結果画面から確認する部位を選びます。" })}${renderEmptyState({ title: "記録を確認できません", description: "結果画面から部位を選び直してください。", actionLabel: "今回の結果へ戻る", actionScreen: recordId ? `result?recordId=${encodeURIComponent(recordId)}` : "result" })}</section>`;
  }
  if (!experience.v27ResultRecord && BODY_PARTS.includes(requestedBodyPart)) {
    return renderUnavailableSavedDetail(experience, requestedBodyPart);
  }
  const regionId = resolvedRegionId(context);
  if (!experience.v27ResultRecord || !REGION_BY_ID.has(regionId)) {
    return `<section class="screen">${renderPageHeading({ eyebrow: "結果の詳細", title: "部位の結果を詳しく見る", description: "結果画面から部位を選びます。" })}${renderEmptyState({ title: "確認する部位が選択されていません", description: "結果画面へ戻り、部位の一覧から選び直してください。", actionLabel: "今回の結果へ戻る", actionScreen: `result?recordId=${encodeURIComponent(recordId)}` })}</section>`;
  }
  if (experience.v27ResultRecord.state === "REST") {
    return `<section class="screen">${renderPageHeading({ eyebrow: "結果の詳細", title: "休養記録", description: "休養日には部位ごとの条件応答を表示しません。" })}${renderEmptyState({ title: "走行事実に基づく部位結果はありません", description: "本人が入力した身体記録は結果画面で確認できます。", actionLabel: "今回の結果へ戻る", actionScreen: `result?recordId=${encodeURIComponent(recordId)}` })}</section>`;
  }

  const viewId = viewIdFromContext(context);
  const region = REGION_BY_ID.get(regionId);
  const regional = experience.v27Result?.regional?.[regionId];
  const valueState = valueForView(experience.v27ResultRecord, regionId, viewId);
  return `<section class="screen screen--body-part-detail">
    ${renderPageHeading({
      eyebrow: "結果の詳細",
      title: `${region.label}の結果を詳しく見る`,
      description: `${formatLocalDate(experience.record.date)}の部位表示、今回の条件、本人の身体記録を分けて確認します。`,
    })}
    ${renderResultWorkspaceNavigation({ recordId, date: experience.record.date, regionId, active: "region" })}
    <section class="result-card" aria-labelledby="region-current-value-title"><div class="result-card__heading"><div><p>${escapeHtml(regionalViewLabel(viewId))}</p><h2 id="region-current-value-title">今回の部位表示</h2></div>${renderStatusLabel(valueState?.reference || "比較値", CONTEXT_REGIONS.has(regionId) ? "neutral" : "model")}</div>${renderCurrentValue(valueState, viewId)}<p class="source-boundary">この値は、この部位に関係する資料をもとにした相対表示です。異なる部位の実際の力や身体状態を直接比べる値ではありません。</p></section>
    <section class="result-card" aria-labelledby="region-input-title"><div class="result-card__heading"><div><p>今回の条件</p><h2 id="region-input-title">確認できた走行条件</h2></div></div>${renderInputCoverage(regional)}</section>
    <section class="result-card" aria-labelledby="region-surface-title"><div class="result-card__heading"><div><p>路面</p><h2 id="region-surface-title">路面について分かること</h2></div></div>${renderSurfaceContexts(regional?.surface_contexts || [])}</section>
    <section class="result-card" aria-labelledby="region-subjective-title"><div class="result-card__heading"><div><p>本人の記録</p><h2 id="region-subjective-title">本人が入力した身体記録</h2></div>${renderStatusLabel("本人の記録", "info")}</div>${renderSubjective(experience.feedback || {}, regionId)}</section>
    <section class="result-card" aria-labelledby="region-boundary-title"><div class="result-card__heading"><div><p>この表示の限界</p><h2 id="region-boundary-title">この表示だけでは分からないこと</h2></div></div><ul class="body-part-evidence-list"><li>筋肉・腱・骨・関節に加わった実際の力や損傷</li><li>障害名、発生確率、原因</li><li>走行の可否や安全の保証</li><li>通常の走行事実だけでは分からない左右差</li></ul></section>
    <section class="content-section" aria-labelledby="other-region-title"><div class="section-heading"><p>別の部位</p><h2 id="other-region-title">他の部位を見る</h2></div>${renderRegionNavigation(recordId, regionId, viewId)}</section>
    <div class="screen-actions"><a class="button button--primary" href="#/history?view=trends&recordId=${encodeURIComponent(recordId)}&anchorDate=${encodeURIComponent(experience.record.date)}&regionId=${encodeURIComponent(regionId)}&period=28">この部位の推移を確認</a><a class="button button--secondary" href="#/column?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(regionId)}">関連する読みものを開く</a></div>
  </section>`;
}

const REGIONAL_V1_BY_ID = new Map(REGIONAL_V1_REGIONS.map((region) => [region.id, region]));

function finiteV1(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function semanticV1(experience, row) {
  const stored = experience?.regionalV1ResultRecord?.a7_region_semantics?.[row?.regionId];
  return stored && typeof stored === "object" ? stored : buildA7RegionSemanticDecomposition(row || {});
}

function conditionIndexV1(semantic) {
  const ratio = semantic?.regionalConditionResponse?.ratioExact;
  return finiteV1(ratio) && Number(ratio) > 0 ? 100 * Number(ratio) : null;
}

function stateLabelV1(row, semantic) {
  if (semantic?.regionalConditionResponse?.status === "SUPPORTED_NUMERIC") return "条件応答を表示";
  if (semantic?.regionalConditionResponse?.status === "UNSUPPORTED_NO_NUMERIC_MAGNITUDE") return "条件応答の数値なし";
  return ({
    NOT_CALCULABLE: "表示なし",
    OUT_OF_SUPPORTED_RANGE: "確認できる範囲外",
    NOT_APPLICABLE: "対象外",
  })[row?.calculationState] || "条件応答の数値なし";
}

function commonExposureTextV1(row, semantic) {
  const exposure = semantic?.commonRunningExposure;
  if (exposure?.status !== "NUMERIC") return "共通走行量は数値化できません";
  const meta = regionalV1ExposureMeta(row);
  const format = (value) => {
    if (!finiteV1(value)) return null;
    const n = Number(value);
    return Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
  };
  const current = format(exposure.qEquivalent);
  const reference = format(exposure.qReference);
  if (current !== null && reference !== null) return `${meta.shortLabel} ${current}${meta.unit}（表示上の基準 ${reference}${meta.unit}）`;
  return finiteV1(exposure.ratioExact) ? `表示上の基準比 ${Number(exposure.ratioExact).toFixed(2)}` : "共通走行量は数値化できません";
}

function subjectiveV1(feedback, regionId) {
  return (feedback?.bodyAreaObservations || []).filter(
    (item) => BODY_AREA_TO_REGIONAL_V1[item.areaId] === regionId,
  );
}

function comparisonLabelV1(status) {
  return {
    DIRECT_COMPARABLE: "比較できる",
    INCOMPATIBLE: "比較できない",
  }[status] || "比較できない";
}

function renderHistoryComparisonV1(comparison) {
  if (!comparison.rows.length) {
    return '<p class="muted-text">条件応答を同じ意味で比較できる過去記録はまだありません。</p>';
  }
  return `<div class="regional-history-comparison-list">${comparison.rows.map((item) => {
    const status = item.compatibility.status;
    const delta = finiteV1(item.directDeltaPoints)
      ? `今回との差 ${Number(item.directDeltaPoints) > 0 ? "+" : ""}${Math.round(Number(item.directDeltaPoints))}ポイント`
      : "条件軸または基準が異なるため、数値差は表示しません";
    return `<article class="regional-history-comparison-row" data-comparison-status="${escapeHtml(status)}"><div><time datetime="${escapeHtml(item.date)}">${escapeHtml(formatLocalDate(item.date))}</time><strong>${item.displayConditionIndex == null ? "条件応答の数値なし" : escapeHtml(String(item.displayConditionIndex))}</strong><small>${item.routeFamilySignature ? "条件応答の記録" : "比較対象外"}</small></div><div>${renderStatusLabel(comparisonLabelV1(status), status === "DIRECT_COMPARABLE" ? "model" : "neutral")}<p>${escapeHtml(delta)}</p><small>${status === "DIRECT_COMPARABLE" ? "同じ部位・同じ条件軸・同じ基準で比べられる記録です。良し悪しや改善・悪化は判定しません。" : "速度系列と勾配系列など、条件応答の意味が異なる記録どうしは直接比較しません。"}</small></div><a class="button button--text" href="#/result?recordId=${encodeURIComponent(item.recordId)}">記録を開く</a></article>`;
  }).join("")}</div><p class="source-boundary">比較できる場合も、条件応答の差は本人の記録間の相対差です。身体状態の改善・悪化、傷害の可能性、安全性を意味しません。</p>`;
}

function renderUserConditionExplanationV1(explanation, recordId, regionId) {
  const conditions = explanation?.conditions || [];
  const list = conditions.length
    ? `<div class="regional-condition-explanation-list">${conditions.map((condition) => `<article class="regional-condition-explanation" data-condition-key="${escapeHtml(condition.key)}"><div><h3>${escapeHtml(condition.title)}</h3><p>${escapeHtml(condition.description)}</p></div><a class="text-link" href="${escapeHtml(columnHrefForCondition(condition, { recordId, regionId }))}">関連する一般説明を読む</a></article>`).join("")}</div>`
    : '<p class="muted-text">今回の記録に追加できる一般説明はありません。</p>';
  const statement = explanation?.statement
    ? `<p class="inline-helper">${escapeHtml(explanation.statement)}</p>`
    : "";
  return `${list}${statement}<p class="source-boundary">先行研究の結果は、対象者や走行条件によって異なります。ここに示す説明は、個人の身体状態や原因を判定するものではありません。</p>`;
}

function renderRegionalV1Detail({ experience, regionId, experiences }) {
  const row = experience.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
  const region = REGIONAL_V1_BY_ID.get(regionId);
  if (!row || !region) return "";
  const semantic = semanticV1(experience, row);
  const conditionIndexExact = conditionIndexV1(semantic);
  const conditionDisplay = conditionIndexExact === null ? null : Math.round(conditionIndexExact);
  const conditionDelta = conditionIndexExact === null ? null : Math.round(conditionIndexExact - 100);
  const conditionDeltaText = conditionDelta === null ? "—" : conditionDelta === 0 ? "±0ポイント" : `${conditionDelta > 0 ? "+" : ""}${conditionDelta}ポイント`;
  const observations = subjectiveV1(experience.feedback || {}, regionId);
  const conditionExplanation = buildRegionalConditionExplanation(row);
  const historyComparison = buildA7ConditionHistoryComparison({
    currentExperience: experience,
    experiences,
    regionId,
    limit: 8,
  });
  const primaryValue = conditionDisplay === null
    ? '<div class="body-part-detail__context-value"><strong>条件応答の数値なし</strong><p>今回の速度・勾配・路面などについて、この部位の応答を根拠に基づいて数値化できないため、基準100として補いません。</p></div>'
    : `<div class="body-part-detail__primary-value"><strong>${conditionDisplay}</strong><div><span>この部位の条件応答の基準100から ${escapeHtml(conditionDeltaText)}</span></div></div>`;
  return `<section class="screen screen--body-part-detail">
    ${renderPageHeading({
      eyebrow: "結果の詳細",
      title: `${bodyRegionDisplayName(regionId, region.name, { includeFamiliar: true })}の結果を詳しく見る`,
      description: `${formatLocalDate(experience.record.date)}の、走行条件によるこの部位の応答と共通走行量を分けて確認します。`,
    })}
    ${renderResultWorkspaceNavigation({ recordId: experience.record.id, date: experience.record.date, regionId, active: "region" })}
    <section class="result-card" data-information-role="model" data-a7-condition-primary="true"><div class="result-card__heading"><div><p>走行条件による部位別応答</p><h2>この部位の条件応答</h2></div>${renderStatusLabel(stateLabelV1(row, semantic), conditionDisplay === null ? "neutral" : "model")}</div>${primaryValue}<p class="inline-helper"><strong>この表示が表すこと：</strong>${escapeHtml(bodyRegionPlainMeaning(regionId))}について、今回の走行条件に対応する相対的な応答です。</p><p class="inline-helper"><strong>基準100は安全値・正常値・初心者平均ではありません。</strong> また、条件応答を数値化できないときに100を代入しません。</p><p class="source-boundary">この値は先行研究を参考にした相対表示で、個人の身体を測った値ではありません。部位ごとに意味が異なるため、数値の大きさで部位間を順位づけできません。</p></section>
    <section class="result-card" data-information-role="fact" data-a7-common-exposure="true"><div class="result-card__heading"><div><p>条件応答とは別に確認</p><h2>共通走行量</h2></div>${renderStatusLabel("走行量", "info")}</div><p><strong>${escapeHtml(commonExposureTextV1(row, semantic))}</strong></p><p class="inline-helper">距離・歩数・接触回数などの走行量側の情報です。走行条件の応答が分からない部位でも、走行量を条件応答100として扱いません。</p></section>
    <section class="result-card" data-information-role="condition" data-regional-semantic-summary data-hierarchical-explanation="${escapeHtml(conditionExplanation.version || "current")}"><div class="result-card__heading"><div><p>今回の結果を理解する</p><h2>今回の記録と関連する知見</h2></div></div>${renderUserConditionExplanationV1(conditionExplanation, experience.record.id, regionId)}<details class="regional-result-reading-details"><summary>この値の読み方を確認</summary><div><ul class="body-part-evidence-list"><li>100との差は、この部位自身の条件応答の表示上の基準との差です。</li><li>数値の高低は、良し悪し、危険度、走行の可否を示しません。</li><li>条件応答の数値がない場合は、条件が基準と同じという意味ではありません。</li><li>本人の身体記録と共通走行量は、この数値とは別に確認します。</li></ul></div></details></section>
    <section id="regional-v1-history-comparison" class="result-card" data-information-role="fact" data-regional-history-comparison><div class="result-card__heading"><div><p>過去記録との比較</p><h2>同じ部位の条件応答</h2></div>${renderStatusLabel(`比較できる記録 ${historyComparison.counts.direct}件`, "info")}</div><p class="inline-helper">同じ部位・同じ条件軸・同じ基準など、条件応答の意味が一致する記録だけ今回との差を表示します。速度系列と勾配系列などを直接つなぎません。</p>${renderHistoryComparisonV1(historyComparison)}</section>
    <section class="result-card" data-information-role="personal"><div class="result-card__heading"><div><p>本人の記録</p><h2>本人が入力した身体記録</h2></div>${renderStatusLabel("本人の記録", "info")}</div>${observations.length ? `<div class="subjective-entry-list">${observations.map((observation) => `<article><h3>${escapeHtml(observation.label || "記録した部位")}</h3><p>${escapeHtml(bodyAreaLateralityLabel(observation.laterality))}・程度 ${Number(observation.intensity || 0)}/5${observation.noticedTiming ? `・${escapeHtml(observation.noticedTiming)}` : ""}</p></article>`).join("")}</div>` : '<p class="muted-text">この部位に対応する本人の身体記録はありません。</p>'}<p class="source-boundary">本人の身体記録と条件応答は別の情報です。両者を組み合わせて原因、危険度、走行の可否を判定しません。</p></section>
    <section class="result-card" data-information-role="limits"><div class="result-card__heading"><div><p>この表示の限界</p><h2>この表示だけでは分からないこと</h2></div></div><ul class="body-part-evidence-list"><li>筋肉・腱・骨・関節に加わった実際の力や損傷</li><li>障害名、発生確率、原因</li><li>走行の可否や安全の保証</li><li>通常の走行事実だけでは分からない左右差</li></ul></section>
    <details class="body-part-other-regions"><summary>今回の結果で別の部位を選ぶ</summary><nav class="body-part-navigation body-part-navigation--collapsed" aria-label="他の部位">${REGIONAL_V1_REGIONS.filter((item) => item.id !== regionId).map((item) => `<a class="body-part-navigation__link" href="#/body-part-detail?recordId=${encodeURIComponent(experience.record.id)}&regionId=${encodeURIComponent(item.id)}"><strong>${escapeHtml(bodyRegionFormalName(item.id, item.name))}</strong><span>詳細</span></a>`).join("")}</nav></details>
    <div class="screen-actions"><a class="button button--primary" href="#/history?view=trends&metric=region&recordId=${encodeURIComponent(experience.record.id)}&anchorDate=${encodeURIComponent(experience.record.date)}&regionId=${encodeURIComponent(regionId)}&period=28">この部位の条件応答の推移を確認</a><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(experience.record.id)}">今回の結果へ戻る</a><a class="button button--secondary" href="#/column?recordId=${encodeURIComponent(experience.record.id)}&regionId=${encodeURIComponent(regionId)}">関連する読みものを開く</a></div>
  </section>`;
}

export function renderBodyPartDetailScreen({ services, context }) {
  const recordId = String(context.parameters.get("recordId") || "");
  const regionId = String(context.parameters.get("regionId") || "");
  const experience = services.workflows.records.loadExperience(recordId);
  if (experience?.regionalV1ResultRecord && REGIONAL_V1_BY_ID.has(regionId)) {
    const experiences = services.workflows.records.loadAllExperiences();
    return renderRegionalV1Detail({ experience, regionId, experiences });
  }
  if (!experience) {
    return `<section class="screen">${renderPageHeading({ eyebrow: "結果の詳細", title: "部位の結果を詳しく見る", description: "結果画面から確認する部位を選びます。" })}${renderEmptyState({ title: "記録を確認できません", description: "結果画面から部位を選び直してください。", actionLabel: "今回の結果へ戻る", actionScreen: recordId ? `result?recordId=${encodeURIComponent(recordId)}` : "result" })}</section>`;
  }
  return `<section class="screen screen--body-part-detail">
    ${renderPageHeading({ eyebrow: "結果の詳細", title: "部位の条件応答", description: `${formatLocalDate(experience.record.date)}の保存記録です。` })}
    ${renderResultWorkspaceNavigation({ recordId: experience.record.id, date: experience.record.date, active: "region" })}
    <section class="result-card"><div class="result-card__heading"><div><p>保存された記録</p><h2>この記録では12部位の条件応答を表示できません</h2></div>${renderStatusLabel("数値なし", "neutral")}</div><p>現在の条件応答の意味で保存された部位結果がないため、別の部位表示へ置き換えず、100も代入しません。</p><p class="source-boundary">走行全体の比較用推定値、本人の身体記録、共通走行量を部位条件応答として読み替えません。</p></section>
    <div class="screen-actions"><a class="button button--primary" href="#/result?recordId=${encodeURIComponent(experience.record.id)}">今回の結果へ戻る</a></div>
  </section>`;
}
