import {
  escapeHtml,
  renderPageHeading,
  renderScreenGuide,
  renderStatusLabel,
} from "../ui/commonComponents.js";
import {
  BODY_PART_DISPLAY_NAMES,
  SAFETY_FLAG_LABELS,
  SUBJECTIVE_STATUS_LABELS,
  formatActivitySummary,
  formatLocalDate,
  formatNumber,
  getEnteredBodyParts,
} from "../ui/recordPresentation.js";
import { personalContextDisplayItems } from "../ui/personalContextPresentation.js";
import { courseSummaryText } from "../ui/coursePresentation.js";
import { buildRecentModelTotalComparison } from "../ui/resultPresentation.js";
import { RESULT_DISPLAY_MODE_OPTIONS, normalizeJournalSettings } from "../ui/appSettings.js";
import { renderV27TotalCard } from "../ui/v27ResultPresentation.js";
import { renderRegionalV1Card } from "../ui/regionalV1Presentation.js";
import { renderNewModelV1Card } from "../ui/newModelV1Presentation.js";
import { NEW_MODEL_V1_MODEL_VERSION } from "../core/model/newModelV1/newModelV1ResultService.js";
import { renderResultWorkspaceNavigation } from "../ui/screenArchitecture.js";
import { buildA7ConditionPreviousComparableMap } from "../core/model/regionalV1/regionalV1ResultService.js";
import { reportedRpeValue } from "../core/safety/rpeProvenance.js";
import { bodyAreaLateralityLabel } from "../core/model/v27/bodyAreaTaxonomy.js";

function runningFormatLabel(value) {
  return {
    CONTINUOUS_RUN: "途中で歩かず走った",
    RUN_WALK: "走りと歩きを混ぜた",
    UNKNOWN: "未設定",
  }[String(value || "UNKNOWN")] || "未設定";
}

function stepsSourceLabel(value) {
  return {
    DEVICE_MEASURED: "端末・時計で計測",
    DEVICE_SYNCED: "端末連携",
    ESTIMATED: "推定・手入力",
    UNKNOWN: "未設定",
  }[String(value || "UNKNOWN")] || "未設定";
}


function regionalModelSpeedMps(record = {}) {
  const runWalk = String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK";
  const distanceKm = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  const durationMinutes = Number(runWalk ? record.runWalkRunningDurationMinutes : record.durationMinutes);
  return distanceKm > 0 && durationMinutes > 0 ? distanceKm * 1000 / (durationMinutes * 60) : null;
}

function renderModelFamilyBoundary(record = {}, regionalV1ResultRecord = null) {
  if (regionalV1ResultRecord?.model_version === NEW_MODEL_V1_MODEL_VERSION) {
    const notes = [];
    if (String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK") notes.push("RUN_WALKでは、走った区間の距離と時間だけを12部位の比較値に使います。歩いた区間は0として扱うのではなく、この走行モデルの対象外です。");
    const speed = regionalModelSpeedMps(record);
    if (Number.isFinite(speed) && (speed < 2.25 || speed > 3.33)) notes.push(`現在の12部位モデルの速度範囲は2.25〜3.33 m/sです。今回の対象速度は${speed.toFixed(2)} m/sのため、部位別数値は外挿しません。`);
    return `<aside class="safety-notice model-family-boundary" aria-label="表示の読み方"><p><strong>12部位の比較値には、今回走った距離と速度条件が含まれます。</strong> 100は各部位自身の基準走行を表す比較用座標で、安全・正常・平均・推奨を意味しません。別部位どうしの数値を順位付けしません。</p>${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</aside>`;
  }
  const integration = regionalV1ResultRecord?.result?.a9Integration || {};
  const notes = [];
  if (String(record.runningFormat || "UNKNOWN").toUpperCase() === "RUN_WALK") {
    if (integration.status === "FULL_12_APPLIED" && integration.phaseScope === "RUNNING_ONLY") notes.push("RUN_WALKの12部位の条件応答は、今回のうち走った区間だけを対象にしています。歩いた区間と歩行・走行の切り替わりは、この数値には含めていません。");
    else if (["RUN_WALK_DETAILS_MISSING", "RUN_WALK_PHASE_MAPPING_MISSING"].includes(integration.status)) notes.push("この記録には、保存時のRUN_WALKモデルに必要な走行区間の情報がそろっていないため、不足分を推測していません。保存済みの事実はそのまま確認できます。");
  }
  const speed = regionalModelSpeedMps(record);
  if (Number.isFinite(speed) && (speed < 1.5 || speed > 5.0)) notes.push(`この保存時モデルで12部位の応答を確認した速度範囲は1.50〜5.00 m/sです。今回の対象速度は${speed.toFixed(2)} m/sです。`);
  return `<aside class="safety-notice model-family-boundary" aria-label="保存時の表示の読み方"><p><strong>この記録は保存時の数値定義で表示します。</strong> 現在の新しい部位別比較値とは直接比較しません。</p>${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</aside>`;
}

function renderRecordFacts(record = {}) {
  const rpe = reportedRpeValue(record);
  return `<dl class="fact-grid">
    <div><dt>日付</dt><dd>${escapeHtml(formatLocalDate(record.date))}</dd></div>
    <div><dt>種類</dt><dd>${record.activityType === "rest" ? "休養" : "走行"}</dd></div>
    <div><dt>記録内容</dt><dd>${escapeHtml(formatActivitySummary(record))}</dd></div>
    <div><dt>きつさ</dt><dd>${record.activityType === "rest" ? "—" : rpe == null ? "未入力" : `${formatNumber(rpe, 0)} / 10`}</dd></div>
    ${record.activityType === "run" ? `<div><dt>走行形式</dt><dd>${escapeHtml(runningFormatLabel(record.runningFormat))}</dd></div><div><dt>歩数の取得元</dt><dd>${escapeHtml(stepsSourceLabel(record.stepsProvenance))}</dd></div>` : ""}
    <div class="fact-grid__wide"><dt>コース条件</dt><dd>${escapeHtml(courseSummaryText(record.course || {}))}</dd></div>
    ${record.memo ? `<div class="fact-grid__wide"><dt>本人メモ</dt><dd>${escapeHtml(record.memo).replaceAll("\n", "<br>")}</dd></div>` : ""}
  </dl>`;
}

function renderRecordFactsCard(record = {}) {
  return `<section class="result-card" data-information-role="fact" aria-labelledby="record-facts-title"><div class="result-card__heading"><div><p>保存した事実</p><h2 id="record-facts-title">今回の記録条件</h2></div>${renderStatusLabel(record.activityType === "rest" ? "休養" : "走行", "neutral")}</div>${renderRecordFacts(record)}</section>`;
}

function renderPersonalContext(record = {}) {
  const items = personalContextDisplayItems(record.personalContext || {});
  if (!items.length) return "";
  return `<section class="result-card result-card--personal-context" data-information-role="personal" aria-labelledby="personal-context-title">
    <div class="result-card__heading"><div><p>本人が残した補足</p><h2 id="personal-context-title">走り方メモ</h2></div>${renderStatusLabel("主観・文脈", "info")}</div>
    <dl class="fact-grid">${items.map(([label, value]) => `<div${String(value).length > 36 ? ' class="fact-grid__wide"' : ""}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value).replaceAll("\n", "<br>")}</dd></div>`).join("")}</dl>
    <p class="muted-text">自由記述は本人のメモとして保存します。選択項目は、今回の走りを振り返り、関連する一般説明を探す手掛かりになります。</p>
  </section>`;
}

function subjectiveObservationHistory(experiences = [], record = {}, observation = {}) {
  const areaId = String(observation.areaId || "");
  const laterality = String(observation.laterality || "");
  if (!areaId) return Object.freeze({ count: 0, previousDate: "" });
  const matches = experiences
    .filter((experience) => experience?.record?.id && experience.record.id !== record.id)
    .filter((experience) => String(experience.record.date || "") < String(record.date || ""))
    .flatMap((experience) => (experience.feedback?.bodyAreaObservations || []).map((item) => ({
      recordId: experience.record.id,
      date: experience.record.date,
      item,
    })))
    .filter(({ item }) => String(item.areaId || "") === areaId)
    .filter(({ item }) => !laterality || !item.laterality || String(item.laterality) === laterality)
    .filter(({ item }) => Number(item.intensity) > 0)
    .sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")));
  return Object.freeze({
    count: matches.length,
    previousDate: matches.at(-1)?.date || "",
  });
}

function renderSubjectiveFeedback(feedback = {}, record = {}, experiences = [], { newModelRecord = false } = {}) {
  const status = feedback?.checkStatus || "not_asked";
  const enteredBodyParts = getEnteredBodyParts(feedback);
  const exactObservations = Array.isArray(feedback?.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => Number(item?.intensity) > 0)
    : [];
  const activeFlags = Object.entries(feedback?.safetyFlags || {}).filter(([, active]) => active);
  const hasNarrative = Boolean(feedback?.unexpectedSymptom || feedback?.consultationNote || activeFlags.length);
  const hasBodyEntry = exactObservations.length > 0 || enteredBodyParts.length > 0;
  if (!hasBodyEntry && !hasNarrative && ["deferred", "not_asked"].includes(status)) return "";

  const exactMarkup = exactObservations.length
    ? `<div class="subjective-entry-list">${exactObservations.map((item) => {
      const history = subjectiveObservationHistory(experiences, record, item);
      const historyHref = `#/history?view=trends&metric=subjective&period=90&anchorDate=${encodeURIComponent(record.date || "")}&recordId=${encodeURIComponent(record.id || "")}&areaId=${encodeURIComponent(item.areaId || "")}&laterality=${encodeURIComponent(item.laterality || "")}`;
      return `<article><h3>${escapeHtml(item.label || "詳細部位")}</h3><p>${escapeHtml(bodyAreaLateralityLabel(item.laterality))}・気になる程度 ${escapeHtml(formatNumber(item.intensity, 0))} / 5</p><small>${history.count ? `同じ部位の過去記録 ${history.count}件${history.previousDate ? `・前回 ${formatLocalDate(history.previousDate)}` : ""}` : "同じ部位の過去記録はまだありません"}</small><a class="text-link" href="${escapeHtml(historyHref)}">同じ部位の記録を見る</a></article>`;
    }).join("")}</div>`
    : "";
  const legacyMarkup = enteredBodyParts.length
    ? `<div class="subjective-entry-list">${enteredBodyParts.map((bodyPart) => {
      const fatigue = Number(feedback.fatigueByBodyPart?.[bodyPart] || 0);
      const discomfort = Number(feedback.discomfortByBodyPart?.[bodyPart] || 0);
      const details = [];
      if (fatigue > 0) details.push(`疲れ・だるさ ${fatigue} / 5`);
      if (discomfort > 0) details.push(`気になる感じ ${discomfort} / 5`);
      if (!details.length) details.push("確認済み");
      return `<article><h3>${escapeHtml(BODY_PART_DISPLAY_NAMES[bodyPart] || bodyPart)}</h3><p>${escapeHtml(details.join("・"))}</p><small>保存された入力</small></article>`;
    }).join("")}</div><p class="muted-text">この記録に含まれる身体記録を、そのまま表示しています。</p>`
    : "";
  const emptyMarkup = `<p class="muted-text">${status === "none_reported" ? "今回は身体の記録を残していません。「問題なし」とは置き換えません。" : record.activityType === "rest" ? "休養日の部位入力はありません。" : "部位ごとの入力はありません。"}</p>`;
  return `<section id="subjective-feedback" class="result-card result-card--subjective${hasBodyEntry || hasNarrative ? "" : " result-card--subjective-compact"}" data-information-role="personal" aria-labelledby="subjective-result-title">
    <div class="result-card__heading"><div><p>本人が残した文脈</p><h2 id="subjective-result-title">本人が残した身体記録</h2></div>${renderStatusLabel(SUBJECTIVE_STATUS_LABELS[status] || "本人の記録", status === "strong_reported" ? "attention" : "info")}</div>
    ${exactMarkup || legacyMarkup ? `${exactMarkup}${legacyMarkup}` : emptyMarkup}
    ${activeFlags.length ? `<div class="safety-flag-summary"><h3>体調確認で選んだ内容</h3><ul>${activeFlags.map(([flag]) => `<li>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</li>`).join("")}</ul></div>` : ""}
    ${feedback?.unexpectedSymptom ? '<p class="notice-text">「いつもと違う、説明しにくい症状がある」と入力されています。</p>' : ""}
    ${feedback?.consultationNote ? `<div class="consultation-note"><h3>コーチや指導者へ伝えたいこと</h3><p>${escapeHtml(feedback.consultationNote).replaceAll("\n", "<br>")}</p></div>` : ""}
    <p class="source-boundary">ここは本人が入力した記録です。${newModelRecord ? "12部位の比較値" : "部位ごとの条件応答"}とは分けて表示し、改善・悪化を自動判定しません。</p>
  </section>`;
}

function renderLegacyResultCard() {
  return `<section class="result-card result-card--model" data-information-role="model" aria-labelledby="recent-comparison-title">
    <div class="result-card__heading"><div><p>走行全体の比較用推定値</p><h2 id="recent-comparison-title">この記録では比較値を表示できません</h2></div>${renderStatusLabel("保存内容は確認できます", "neutral")}</div>
    <p>この保存記録では、走行事実と本人入力をそのまま確認できます。比較値は表示されません。</p>
  </section>`;
}

function renderRestRegionalCard() {
  return `<section class="result-card result-card--distribution" data-information-role="model" aria-labelledby="distribution-title"><div class="result-card__heading"><div><p>12部位の比較値</p><h2 id="distribution-title">走行による部位別比較値はありません</h2></div>${renderStatusLabel("休養記録", "neutral")}</div><div class="rest-distribution"><p>休養日には走行距離と走行条件に基づく12部位の比較値を作成しません。</p></div></section>`;
}

function renderPrioritySupportAction(experience) {
  const route = experience.supportDecision?.route || "normal";
  const recordId = experience.record.id;
  if (route === "urgent") {
    return `<section class="next-action next-action--urgent" aria-labelledby="result-priority-action-title"><div>${renderStatusLabel("公的な相談先を確認", "attention")}<h2 id="result-priority-action-title">数値結果ではなく、本人入力と公的な案内を先に確認する</h2><p>RunLoadは身体状態や緊急性を判定しません。入力した項目に対応する公式窓口を自分で確認できます。</p></div><div class="next-action__actions"><a class="button button--primary" href="#/support-guidance?recordId=${encodeURIComponent(recordId)}">公的な相談先を確認する</a><a class="button button--secondary" href="#/consultation?recordId=${encodeURIComponent(recordId)}">相談用に整理する</a></div></section>`;
  }
  if (route === "consult") {
    return `<section class="next-action next-action--consult" aria-labelledby="result-priority-action-title"><div>${renderStatusLabel("相談準備を優先", "attention")}<h2 id="result-priority-action-title">相談しやすい相手へ伝える内容を整理する</h2><p>予定候補より先に、本人が入力した事実を共有できる形へ整理します。</p></div><a class="button button--primary" href="#/consultation?recordId=${encodeURIComponent(recordId)}">相談用レポートを開く</a></section>`;
  }
  return "";
}

function renderSubjectiveFollowUpAction(experience) {
  const route = experience.supportDecision?.route || "normal";
  const checkStatus = experience.feedback?.checkStatus || "not_asked";
  if (route !== "normal" || !["not_asked", "deferred"].includes(checkStatus)) return "";
  const recordId = experience.record.id;
  return `<section class="next-action next-action--followup" aria-labelledby="result-subjective-followup-title"><div>${renderStatusLabel("本人の記録を追加", "info")}<h2 id="result-subjective-followup-title">今回の身体記録を確認</h2><p>結果を見たあとで、身体記録なし／気になる部位／相談したい内容を分けて残せます。</p></div><a class="button button--primary" href="#/record-input?recordId=${encodeURIComponent(recordId)}&focus=subjective">本人の身体記録を確認する</a></section>`;
}

function resultDisplayModeLabel(mode = "standard") {
  return RESULT_DISPLAY_MODE_OPTIONS.find((option) => option.value === mode)?.label || "標準";
}

function renderResultReadingSummary(experience, mode, hasSubjectiveCard = true, newModelRecord = false) {
  const record = experience.record || {};
  const items = {
    record: { href: "#record-facts-title", title: "今回の記録条件" },
    total: { href: "#recent-comparison-title", title: "走行全体の比較用推定値" },
    regional: { href: "#distribution-title", title: newModelRecord ? "12部位の比較値" : "部位ごとの条件応答" },
    subjective: { href: hasSubjectiveCard ? "#subjective-feedback" : "#result-subjective-followup-title", title: "本人が残した身体記録" },
    next: { href: "#result-activation-title", title: "この結果を次に活かす" },
  };
  const orders = {
    standard: ["record", "regional", "total"],
    "result-first": ["regional", "total", "record"],
    "body-focus": ["regional", "subjective", "total"],
    "consultation-focus": ["subjective", "record", "next"],
    compact: ["regional", "total", "next"],
  };
  const readingItems = (orders[mode] || orders.standard).map((key) => items[key]);
  return `<section class="result-reading-summary result-reading-summary--compact" aria-labelledby="result-reading-summary-title">
    <div class="result-reading-summary__header"><p id="result-reading-summary-title">見る順序</p><span>表示タイプ：${escapeHtml(resultDisplayModeLabel(mode))}</span></div>
    <div class="result-reading-summary__grid result-reading-summary__grid--compact">${readingItems.map((item, index) => `<button class="result-reading-summary__item result-reading-summary__item--compact" type="button" data-result-jump-target="${escapeHtml(item.href.replace(/^#/, ""))}"><span>${index + 1}</span><strong>${escapeHtml(item.title)}</strong></button>`).join("")}</div>
  </section>`;
}

function renderResultActivationHub(experience, observationCandidate = null) {
  const recordId = experience.record.id;
  const date = experience.record.date;
  const route = experience.supportDecision?.route || "normal";
  const observationPrompt = observationCandidate && !["consult", "urgent"].includes(route)
    ? `<aside class="result-observation-prompt" data-observation-loop-version="runload-observation-loop-v1"><div><p>前回から今回へ</p><h3>前回の「次回見ること」を確認できます</h3><blockquote>${escapeHtml(observationCandidate.page.oneThingNote || "")}</blockquote><small>確認するかどうか、何を残すかは本人が選びます。達成や失敗には変換しません。</small></div><a class="button button--secondary" href="#/notebook?view=day&date=${encodeURIComponent(date)}&recordId=${encodeURIComponent(recordId)}">任意で確認する</a></aside>`
    : "";
  const links = [
    { title: "理由を理解する", description: "今回の記録と関連する一般知識を参考資料つきで確認", href: `#/column?recordId=${encodeURIComponent(recordId)}&origin=result` },
    ...(["consult", "urgent"].includes(route) ? [] : [{ title: "相談用に整理する", description: "事実・本人入力・数値表示を分けて共有", href: `#/consultation?recordId=${encodeURIComponent(recordId)}` }]),
    { title: "次回見ることを残す", description: "自分の言葉をノートへ保存", href: `#/notebook?view=day&date=${encodeURIComponent(date)}&source=result&recordId=${encodeURIComponent(recordId)}&theme=next-note` },
    { title: "予定を考える", description: "今回の記録を出発点に予定事実を編集", href: `#/plan?sourceRecordId=${encodeURIComponent(recordId)}` },
  ];
  return `<section class="result-activation-hub" aria-labelledby="result-activation-title"><div class="section-heading section-heading--compact"><p>この結果を次に活かす</p><h2 id="result-activation-title">次にすることを自分で選ぶ</h2><p>理解・共有・次回の観察・予定をこの場所から選びます。アプリは走行可否や練習の正解を決めません。</p></div>${observationPrompt}<div class="result-activation-hub__grid">${links.map((item) => `<a class="result-activation-hub__item" href="${escapeHtml(item.href)}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small><span aria-hidden="true">→</span></a>`).join("")}</div></section>`;
}

function renderResultGuide({ newModelRecord = false } = {}) {
  if (newModelRecord) {
    return renderScreenGuide({
      id: "result-guide",
      summary: "保存した事実、12部位の比較値、走行全体の比較用推定値を、それぞれの意味を混ぜずに確認できます。",
      sections: [
        { title: "まずここでやること", body: "今回の記録、12部位の比較値、走行全体の過去記録との比較を順に見返します。" },
        { title: "12部位の比較値", body: "身体図または固定順の一覧で確認します。各部位の100は、その部位自身の1 km基準走行を表します。今回の走行距離と条件を含む値なので、同じ部位の記録どうしで比べ、異なる部位を数値で順位付けしません。" },
        { title: "範囲外の扱い", body: "現在の12部位モデルの範囲外では外挿せず、部位別数値を表示しません。分からない任意条件も効果なしとは扱いません。" },
        { title: "走行全体の比較用推定値", body: "別のモデルによる参考値として、同じ意味で比べられる過去記録と見返します。12部位の比較値とは同じ尺度ではありません。" },
      ],
      tutorialId: "result",
    });
  }
  return renderScreenGuide({
    id: "result-guide",
    summary: "この保存記録で使われた、部位ごとの条件応答と走行全体の比較用推定値の読み分けを確認できます。",
    sections: [
      { title: "まずここでやること", body: "今回の記録、保存時の部位ごとの条件応答、走行全体の過去記録との比較を順に見返します。" },
      { title: "部位の表示", body: "この記録は保存時の数値定義で表示します。現在の新しい12部位の比較値とは直接比較しません。" },
      { title: "走行全体の比較用推定値", body: "走った量とコース条件をまとめた参考値を、同じ意味で比べられる過去記録と見返します。高低は良し悪しを示しません。" },
    ],
    tutorialId: "result",
  });
}

function renderCompactResultDetails({ recordCard, personalContextCard, subjectiveCard }) {
  return `<details class="result-compact-details"><summary>保存した記録と本人入力も見る</summary><div class="result-compact-details__content">${[recordCard, personalContextCard, subjectiveCard].filter(Boolean).join("")}</div></details>`;
}

function orderedResultSections(mode, fragments) {
  const standard = ["record", "modelBoundary", "regional", "total", "subjective", "personal"];
  const orders = {
    standard,
    "result-first": ["modelBoundary", "regional", "total", "record", "subjective", "personal"],
    "body-focus": ["modelBoundary", "regional", "subjective", "total", "record", "personal"],
    "consultation-focus": ["subjective", "record", "personal", "modelBoundary", "total", "regional"],
    compact: ["modelBoundary", "regional", "total", "compactDetails"],
  };
  return (orders[mode] || standard).map((key) => fragments[key]).filter(Boolean).join("\n");
}

export function renderResultScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  if (!experience) {
    return `<section class="screen screen--result">${renderPageHeading({ eyebrow: "今回の記録", title: "結果", description: "記録後に走行事実・本人入力・数値表示を確認します。" })}<section class="empty-state" aria-labelledby="empty-result-title"><p class="empty-state__label">現在の状態</p><h2 id="empty-result-title">表示できる記録がありません</h2><p>距離と実走時間を含む走行記録を保存すると結果を確認できます。</p><div class="screen-actions"><a class="button button--primary" href="#/record-input">記録する</a><a class="button button--secondary" href="#/plan">プランを作る</a></div></section></section>`;
  }

  const allExperiences = services.workflows.records.loadAllExperiences();
  const { record, feedback, v27ResultRecord, v27Result, regionalV1ResultRecord } = experience;
  const observationContext = services.workflows.notebook.loadContext({ date: record.date });
  const comparison = buildRecentModelTotalComparison(allExperiences, experience);
  const settings = normalizeJournalSettings(services.storage.settings.load());
  const recordCard = renderRecordFactsCard(record);
  const personalContextCard = renderPersonalContext(record);
  const newModelRecord = regionalV1ResultRecord?.model_version === NEW_MODEL_V1_MODEL_VERSION;
  const subjectiveCard = renderSubjectiveFeedback(feedback || {}, record, allExperiences, { newModelRecord });
  const totalCard = v27ResultRecord
    ? renderV27TotalCard({ resultRecord: v27ResultRecord, comparison })
    : renderLegacyResultCard(experience);
  const previousComparisons = regionalV1ResultRecord && !newModelRecord
    ? buildA7ConditionPreviousComparableMap({ currentExperience: experience, experiences: allExperiences })
    : {};
  const regionalInitialView = settings.regionalResultInitialView === "remember"
    ? settings.regionalResultLastView
    : settings.regionalResultInitialView;
  const regionalCard = regionalV1ResultRecord
    ? (newModelRecord
      ? renderNewModelV1Card({ resultRecord: regionalV1ResultRecord, experiences: allExperiences, initialView: regionalInitialView, showPreviousComparison: settings.showRegionalPreviousComparison })
      : renderRegionalV1Card({
        resultRecord: regionalV1ResultRecord,
        previousComparisons,
        initialView: regionalInitialView,
        showPreviousComparison: settings.showRegionalPreviousComparison,
      }))
    : v27ResultRecord
      ? renderRestRegionalCard()
      : "";
  const fragments = {
    summary: renderResultReadingSummary(experience, settings.resultDisplayMode, Boolean(subjectiveCard), newModelRecord),
    record: recordCard,
    personal: personalContextCard,
    subjective: subjectiveCard,
    modelBoundary: renderModelFamilyBoundary(record, regionalV1ResultRecord),
    total: totalCard,
    regional: regionalCard,
    compactDetails: renderCompactResultDetails({ recordCard, personalContextCard, subjectiveCard }),
  };
  return `<section class="screen screen--result">
    ${renderPageHeading({
      eyebrow: "今回の記録",
      title: "今回の結果を理解する",
      description: `${formatLocalDate(record.date)}の走行事実・本人入力・比較表示。`,
    })}
    ${renderResultWorkspaceNavigation({ recordId: record.id, date: record.date, active: "overview" })}
    ${fragments.summary}
    ${renderPrioritySupportAction(experience)}
    ${orderedResultSections(settings.resultDisplayMode, fragments)}
    ${renderSubjectiveFollowUpAction(experience)}
    ${renderResultActivationHub(experience, observationContext.observationCandidate)}
    ${renderResultGuide({ newModelRecord })}
  </section>`;
}
