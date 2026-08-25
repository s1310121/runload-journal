import { REGIONS } from "../core/model/regionalV1/engine/data.js";
import { bodyRegionDisplayName, bodyRegionFamiliarName, bodyRegionFormalName } from "./bodyRegionTerminology.js";
import {
  buildA7RegionSemanticDecomposition,
  regionalV1ConditionSupportMeta,
  regionalV1CoverageMeta,
  regionalV1ExposureMeta,
} from "../core/model/regionalV1/regionalV1ResultService.js";
import { escapeHtml, renderStatusLabel } from "./commonComponents.js";

const FRONT = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';
const VIEWS = [
  { key: "front", title: "前面", silhouette: FRONT, paths: [
    ["BA-DISP-014", "M120 142 C130 132 140 128 150 128 C160 128 170 132 180 142 L178 178 C168 184 160 188 150 188 C140 188 132 184 122 178 Z"],
    ["BA-DISP-016", "M122 190 C132 198 141 202 150 202 C159 202 168 198 178 190 L174 266 C164 274 158 278 150 278 C142 278 136 274 126 266 Z"],
    ["BA-DISP-019", "M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z"],
    ["BA-DISP-021", "M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z"],
    ["BA-DISP-024", "M135 386 L165 386 L166 416 L134 416 Z"],
  ] },
  { key: "back", title: "後面", silhouette: BACK, paths: [
    ["BA-DISP-015", "M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 190 C170 200 160 205 150 205 C140 205 130 200 120 190 Z"],
    ["BA-DISP-018", "M122 196 C132 204 141 209 150 209 C159 209 168 204 178 196 L174 274 C164 282 158 286 150 286 C142 286 136 282 126 274 Z"],
    ["BA-DISP-023", "M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z"],
    ["BA-DISP-025", "M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z"],
  ] },
  { key: "sole", title: "足裏", silhouette: FOOT, paths: [
    ["BA-DISP-029", "M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z"],
    ["BA-DISP-028", "M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z"],
    ["BA-DISP-027", "M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z"],
  ] },
];

function finite(value) { return value !== null && value !== "" && Number.isFinite(Number(value)); }

function semanticFor(resultRecord, row) {
  const stored = resultRecord?.a7_region_semantics?.[row?.regionId];
  return stored && typeof stored === "object" ? stored : buildA7RegionSemanticDecomposition(row || {});
}

function conditionIndexExact(semantic) {
  const ratio = semantic?.regionalConditionResponse?.ratioExact;
  return finite(ratio) && Number(ratio) > 0 ? 100 * Number(ratio) : null;
}

function conditionDisplayIndex(semantic) {
  const exact = conditionIndexExact(semantic);
  return exact === null ? null : Math.round(exact);
}

function conditionDisplayDelta(semantic) {
  const exact = conditionIndexExact(semantic);
  return exact === null ? null : Math.round(exact - 100);
}

function conditionStateLabel(row, semantic) {
  const status = semantic?.regionalConditionResponse?.status;
  if (status === "SUPPORTED_NUMERIC") return "条件応答を表示";
  if (status === "UNSUPPORTED_NO_NUMERIC_MAGNITUDE") return "条件応答の数値なし";
  const state = row?.calculationState;
  return {
    CALCULATED: "条件応答の数値なし",
    PARTIAL: "条件応答の数値なし",
    NOT_CALCULABLE: "表示なし",
    OUT_OF_SUPPORTED_RANGE: "確認できる範囲外",
    NOT_APPLICABLE: "対象外",
  }[state] || "表示状態を確認";
}

function directionState(semantic) {
  const delta = conditionDisplayDelta(semantic);
  if (delta === null) return "unavailable";
  return delta > 0 ? "above" : delta < 0 ? "below" : "reference";
}

function directionSymbol(semantic) {
  return { above: "↑", below: "↓", reference: "=", unavailable: "—" }[directionState(semantic)];
}

function direction(semantic) {
  const delta = conditionDisplayDelta(semantic);
  if (delta === null) return "走行条件による部位別応答は数値化していません";
  if (delta === 0) return "条件応答の基準100と同じ";
  return `条件応答の基準から${delta > 0 ? "+" : ""}${delta}ポイント`;
}

function formatExposureValue(value) {
  if (!finite(value)) return null;
  const number = Number(value);
  if (Math.abs(number - Math.round(number)) < 1e-9) return String(Math.round(number));
  return number.toFixed(1).replace(/\.0$/, "");
}

function commonExposureText(row, semantic) {
  const exposure = semantic?.commonRunningExposure;
  if (exposure?.status !== "NUMERIC") return "共通走行量：数値なし";
  const meta = regionalV1ExposureMeta(row);
  const current = formatExposureValue(exposure.qEquivalent);
  const reference = formatExposureValue(exposure.qReference);
  if (current !== null && reference !== null) {
    return `共通走行量：${meta.shortLabel} ${current}${meta.unit}（表示上の基準 ${reference}${meta.unit}）`;
  }
  if (finite(exposure.ratioExact)) {
    return `共通走行量：表示上の基準比 ${Number(exposure.ratioExact).toFixed(2)}`;
  }
  return "共通走行量：数値なし";
}

function a9EvidenceTierLabel(row) {
  const tier = row?.a9ConditionEvidence?.supportTier;
  if (tier === "PROVISIONAL_AUTHORIZED") return "限定的な推定";
  if (tier === "FORMAL_DIRECT_IN_DOMAIN") return "文献条件内";
  return null;
}

function semanticChips(row, semantic) {
  const exposure = regionalV1ExposureMeta(row);
  const coverage = regionalV1CoverageMeta(row);
  const chips = [];
  if (semantic?.regionalConditionResponse?.status === "SUPPORTED_NUMERIC") chips.push("走行条件を数値化");
  else chips.push("走行条件の数値なし");
  const evidenceTier = a9EvidenceTierLabel(row);
  if (evidenceTier) chips.push(evidenceTier);
  if (exposure.fallback) chips.push("走行量は一部情報から算出");
  if (coverage.state === "PARTIAL" && semantic?.regionalConditionResponse?.status === "SUPPORTED_NUMERIC") chips.push("一部条件を反映");
  return chips;
}

function renderMap(recordId, rows, resultRecord) {
  const byRegion = new Map(rows.map((row) => [row.regionId, row]));
  return `<div class="v27-body-map regional-v1-map" role="group" aria-label="12部位の走行条件に対する部位別応答。色は数値化できた部位だけ、その部位自身の条件応答の基準100に対する方向を表します。">${VIEWS.map((view) => `<figure class="v27-body-map__view"><figcaption>${view.title}</figcaption><svg viewBox="70 10 160 430" aria-label="${escapeHtml(view.title)}の部位図"><defs><pattern id="regional-unavailable-${view.key}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="currentColor" opacity="0.08"></rect><line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="3" opacity="0.24"></line></pattern></defs><g class="body-map__silhouette">${view.silhouette}</g>${view.paths.map(([id, d]) => {
    const row = byRegion.get(id);
    const semantic = semanticFor(resultRecord, row);
    const state = directionState(semantic);
    const displayName = bodyRegionDisplayName(id, row?.regionName || id, { includeFamiliar: true });
    const displayIndex = conditionDisplayIndex(semantic);
    const label = `${displayName}：${displayIndex === null ? "条件応答の数値なし" : `${displayIndex}、${direction(semantic)}`}`;
    return `<a class="regional-v1-map__link" href="#/body-part-detail?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(id)}" aria-label="${escapeHtml(`${label}。詳細を開く`)}"><path class="v27-body-map__region" data-direction="${state}" data-region-id="${id}"${state === "unavailable" ? ` style="fill:url(#regional-unavailable-${view.key})"` : ""} d="${d}"><title>${escapeHtml(label)}</title></path></a>`;
  }).join("")}</svg></figure>`).join("")}</div>`;
}

function formatComparisonDate(value = "") {
  const matched = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return String(value || "日付不明");
  return `${Number(matched[1])}年${Number(matched[2])}月${Number(matched[3])}日`;
}

function renderPreviousComparison(comparison, enabled) {
  if (!enabled) return "";
  if (comparison?.status === "COMPARABLE") {
    const points = Number(comparison.pointChangeExact);
    const symbol = points > 0 ? "↑" : points < 0 ? "↓" : "→";
    const rounded = Number(comparison.pointChangeRounded);
    const change = Math.abs(points) < 1e-9
      ? "変化なし"
      : `${symbol} ${rounded > 0 ? "+" : ""}${rounded}ポイント`;
    return `<span class="regional-result-row__previous" data-previous-comparison="comparable"><strong>前回の条件応答との比較 ${escapeHtml(change)}</strong><small>${escapeHtml(formatComparisonDate(comparison.previous?.date))}・同じ部位、同じ比較指標、同じ基準で比較</small></span>`;
  }
  if (comparison?.status === "NO_COMPARABLE_CONDITION_RECORD") {
    return '<span class="regional-result-row__previous" data-previous-comparison="not-comparable"><strong>条件応答の前回比較なし</strong><small>同じ比較指標・同じ基準で比べられる過去記録がありません</small></span>';
  }
  if (comparison?.status === "CURRENT_CONDITION_UNAVAILABLE") {
    return '<span class="regional-result-row__previous" data-previous-comparison="unavailable"><strong>条件応答の前回比較なし</strong><small>今回の走行条件による部位別応答を数値化していません</small></span>';
  }
  return '<span class="regional-result-row__previous" data-previous-comparison="none"><strong>条件応答の前回比較なし</strong><small>比較できる過去記録はまだありません</small></span>';
}

function visualPosition(semantic) {
  const index = conditionIndexExact(semantic);
  if (index === null) return 50;
  return Math.max(2, Math.min(98, index / 2));
}

function renderList(recordId, rows, resultRecord, previousComparisons = {}, showPreviousComparison = true) {
  return `<ul class="regional-result-grid regional-v1-list">${rows.map((row) => {
    const semantic = semanticFor(resultRecord, row);
    const displayIndex = conditionDisplayIndex(semantic);
    const delta = conditionDisplayDelta(semantic);
    const available = displayIndex !== null;
    const value = available
      ? `<strong><span aria-hidden="true">${directionSymbol(semantic)}</span> ${displayIndex}</strong><small>${delta === 0 ? "±0" : `${delta > 0 ? "+" : ""}${delta}`}ポイント</small>`
      : '<span class="regional-result-row__building">条件応答の数値なし</span>';
    const meter = available
      ? `<span class="regional-result-row__scale" aria-label="条件応答の基準100を中央とする位置"><i aria-hidden="true"><em>基準100</em></i><b style="--regional-position:${visualPosition(semantic)}%"></b></span>`
      : "";
    const formalName = bodyRegionFormalName(row.regionId, row.regionName);
    const familiarName = bodyRegionFamiliarName(row.regionId, row.regionName);
    return `<li class="regional-result-card" data-direction="${directionState(semantic)}"><a href="#/body-part-detail?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(row.regionId)}" aria-label="${escapeHtml(`${formalName}の詳細を開く`)}"><span class="regional-result-row__name"><strong>${escapeHtml(formalName)}</strong>${familiarName && familiarName !== formalName ? `<small class="body-region-familiar">${escapeHtml(familiarName)}</small>` : ""}</span><span class="regional-result-row__value">${value}</span>${meter}<span class="regional-result-row__direction">${escapeHtml(direction(semantic))}</span><span class="regional-result-row__exposure"><small>${escapeHtml(commonExposureText(row, semantic))}</small></span>${renderPreviousComparison(previousComparisons[row.regionId], showPreviousComparison)}<span class="regional-result-row__chips"><small>${escapeHtml(conditionStateLabel(row, semantic))}</small>${semanticChips(row, semantic).map((chip) => `<small>${escapeHtml(chip)}</small>`).join("")}</span></a></li>`;
  }).join("")}</ul>`;
}

function focusRows(rows, resultRecord) {
  // A7 must not rank different regional endpoint families by numeric magnitude.
  // Keep the fixed anatomical/registry order and show every region whose
  // condition response is supportably numeric.
  return rows.filter((row) => conditionIndexExact(semanticFor(resultRecord, row)) !== null);
}

function unavailableReasonMessage(result = {}, rows = []) {
  if (!rows.length) return "保存済みの部位別結果を読み取れませんでした。ページを再読み込みしても続く場合は、同じ記録を開き直してください。";
  const messages = rows.flatMap((row) => (row.reasonTrace || [])
    .map((event) => String(event?.messageArgs?.message || ""))
    .filter(Boolean));
  const message = messages[0] || "";
  if (message.includes("Distance is unavailable")) return "走行距離が確認できないため、部位別の走行量と条件応答を表示できません。保存した距離を確認してください。";
  if (message.includes("Distance is outside")) return "走行距離などの入力条件が、この表示で数値化できる条件に合わないため、部位別数値を表示しません。保存した走行事実はそのまま確認できます。";
  if (message.includes("No route section")) return "今回の走行条件を確認できないため、部位別表示を作成できません。";
  if (message.includes("section speeds are unavailable")) return "平均ペースを確認できないため、部位別の条件応答を確認できません。距離と実走時間を確認してください。";
  if (message.includes("section speeds are outside")) return "今回の平均ペースが現在の表示対象外のため、部位別の条件応答を確認できません。";
  if (result.overallCalculationState === "OUT_OF_SUPPORTED_RANGE" && !result.a9Integration?.numericFullResponseAvailable) return "今回の走行条件が現在の表示対象範囲外です。";
  return "今回の入力条件では、走行条件による部位別応答を数値化できません。全12部位表示で、走行量と各部位の対応状況を確認できます。";
}

function renderRecoveryNotice(resultRecord = {}) {
  if (resultRecord.recovery_status !== "TRANSIENT_RECONSTRUCTED") return "";
  return '<p class="regional-result-recovery-notice">保存済みの部位別表示を読み取れなかったため、保存した走行事実から現在の表示を一時的に再構成しています。元の記録データは変更していません。</p>';
}

export function renderRegionalV1Card({ resultRecord, previousComparisons = {}, initialView = "focus", showPreviousComparison = true }) {
  if (resultRecord?.state === "REST") {
    return `<section class="result-card result-card--distribution" data-information-role="model"><div class="result-card__heading"><div><p>12部位の条件応答</p><h2 id="distribution-title">部位ごとの条件応答</h2></div>${renderStatusLabel("休養記録", "neutral")}</div><p>休養日には走行条件による部位別応答を作成しません。</p></section>`;
  }
  const rows = resultRecord?.result?.regions || [];
  const availableRows = rows.filter((row) => conditionIndexExact(semanticFor(resultRecord, row)) !== null);
  const hasA9Provisional = rows.some((row) => row?.a9ConditionEvidence?.supportTier === "PROVISIONAL_AUTHORIZED");
  const hasA9Direct = rows.some((row) => row?.a9ConditionEvidence?.supportTier === "FORMAL_DIRECT_IN_DOMAIN");
  const a9TierNotice = hasA9Provisional
    ? '<p class="inline-helper" data-a9-evidence-tier-notice="provisional"><strong>「限定的な推定」と表示する値があります。</strong> 公開された研究値を基準に、あらかじめ範囲を限定して延長した推定で、研究で直接測られた条件そのものではありません。</p>'
    : hasA9Direct
      ? '<p class="inline-helper" data-a9-evidence-tier-notice="direct"><strong>「文献条件内」と表示する値があります。</strong> 公開された研究の測定条件内の値またはその区間内の補間に基づきます。</p>'
      : '';
  const hasUnquantifiedSurface = rows.some((row) => (row?.a9ConditionEvidence?.surfaceDisposition || []).some((item) => item && item.numericSurfaceMainEffectApplied !== true && !["BASE_REFERENCE", "ENVIRONMENT_BASE_RESPONSE"].includes(String(item.surfaceDisposition || ""))));
  const surfaceNotice = hasUnquantifiedSurface
    ? '<p class="inline-helper" data-surface-effect-notice="unquantified"><strong>路面による独立した数値効果を未定量として扱う部位があります。</strong> 路面情報は記録と説明に残しますが、根拠が数値化を支えない部分を0や基準100として補いません。</p>'
    : '';
  const hasPersonalCadenceEffect = rows.some((row) => row?.a9ConditionEvidence?.cadenceDisposition?.numericEffectApplied === true);
  const cadenceNotice = hasPersonalCadenceEffect
    ? '<p class="inline-helper" data-cadence-effect-notice="personal-habitual"><strong>膝蓋大腿関節ストレス積算量／kmの表示だけ、本人の過去記録から同じ速度帯の普段の歩数ペースを確認できた場合に限り、歩数ペースの関係を限定的な推定として反映しています。</strong> 絶対的な歩数だけから効果を決めたり、ほかの11部位へ同じ効果を広げたりしません。</p>'
    : '';
  const focused = focusRows(rows, resultRecord);
  const resolvedView = initialView === "all" ? "all" : "focus";
  const focusContent = focused.length
    ? renderList(resultRecord.record_id, focused, resultRecord, previousComparisons, showPreviousComparison)
    : `<div class="regional-focus-empty regional-focus-empty--unavailable"><strong>走行条件による部位別応答を数値化できません</strong><p>${escapeHtml(unavailableReasonMessage(resultRecord?.result || {}, rows))}</p><p>走行量は条件応答とは分けて各部位に保持しています。</p></div>`;
  return `<section class="result-card result-card--distribution result-card--regional-v27" data-information-role="model" aria-labelledby="distribution-title" data-regional-v1-card data-regional-v1-view="${resolvedView}" data-a7-condition-primary="true">
    <div class="result-card__heading"><div><p>走行条件に対する部位別応答</p><h2 id="distribution-title">部位ごとの条件応答</h2></div>${renderStatusLabel("条件応答を主表示", "model")}</div>
    <p class="inline-helper"><strong>ここでは走行量と走行条件を分けて表示します。</strong> 主な数値は、速度・勾配・路面などについて、その部位で根拠に基づく条件応答を数値化できた場合だけ表示します。走行量は各部位で別に確認できます。</p>
    <p class="inline-helper"><strong>100は安全値・正常値・平均値ではありません。</strong> 初心者平均でもありません。 数値がある部位について、その部位固有の条件応答の表示上の基準です。</p>
    ${a9TierNotice}
    ${surfaceNotice}
    ${cadenceNotice}
    ${renderRecoveryNotice(resultRecord)}
    <div class="regional-v1-view-toggle" role="group" aria-label="表示する部位"><button type="button" data-regional-v1-view-button="focus" aria-pressed="${resolvedView === "focus"}">条件応答を数値化できた部位</button><button type="button" data-regional-v1-view-button="all" aria-pressed="${resolvedView === "all"}">全12部位</button></div>
    <p class="muted-text">「条件応答を数値化できた部位」は、根拠に基づいて数値化できた部位を身体図と同じ固定順で表示します。数値の大きさによる並べ替えや部位間ランキングはしません。</p>
    <ul class="regional-direction-legend" aria-label="身体図の色と記号"><li data-direction="above"><span aria-hidden="true">↑</span>条件応答の基準より上</li><li data-direction="reference"><span aria-hidden="true">=</span>数値上は基準100</li><li data-direction="below"><span aria-hidden="true">↓</span>条件応答の基準より下</li><li data-direction="unavailable"><span aria-hidden="true">—</span>条件応答の数値なし</li></ul>
    <div class="regional-v1-overview">
      <div class="regional-v1-overview__map">${renderMap(resultRecord.record_id, rows, resultRecord)}<p class="muted-text">色は、条件応答を数値化できた部位だけ、その部位自身の基準100に対する方向を示します。斜線の部位は条件が基準と同じなのではなく、今回の条件応答を数値化していない部位です。</p></div>
      <div class="regional-v1-overview__feedback">
        <div class="regional-result-list" data-regional-v1-panel="focus"${resolvedView === "focus" ? "" : " hidden"}>${focusContent}</div>
        <div class="regional-result-list" data-regional-v1-panel="all"${resolvedView === "all" ? "" : " hidden"}>${renderList(resultRecord.record_id, rows, resultRecord, previousComparisons, showPreviousComparison)}</div>
      </div>
    </div>
    <details class="regional-claim-boundary"><summary>この表示と過去比較の読み方</summary><div>
      <p>部位ごとに値が表す内容が異なるため、別部位の数値を同じ物理単位として比べません。</p>
      <p>共通走行量は、距離・歩数・接触回数などの走行量側の情報です。条件応答の数値へ置き換えず、別に表示します。</p>
      <p>前回比較は、同じ部位・同じ比較指標・同じ基準・同じ対象範囲を持つ最新の過去記録がある場合だけ表示します。</p>
      <p>増減は良し悪し、改善・悪化、傷害リスク、走行の可否を意味しません。</p>
      <p>本人が入力した身体記録は別の情報として保存し、条件応答とは分けて確認します。</p>
    </div></details>
  </section>`;
}

export function regionalV1Region(regionId) {
  return REGIONS.find((region) => region.id === regionId) || null;
}
