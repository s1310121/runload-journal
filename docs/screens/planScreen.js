import { SURFACE_FIELDS } from "../core/model/modelConstants.js";
import {
  createV27PlanPreview,
  normalizeV27PlanSession,
} from "../core/planning/planPreviewV27.js";
import {
  buildPlanConditionSnapshot,
  buildPlanReference,
  describePlanComparisonForUser,
  describePlanModelAssumptions,
  serializePlanReference,
} from "../ui/planPresentation.js";
import {
  escapeHtml,
  renderEmptyState,
  renderPageHeading,
  renderScreenGuide,
  renderStatusLabel,
} from "../ui/commonComponents.js";
import { renderExternalCourseCheckSupport } from "../ui/externalCourseCheckSupport.js";
import {
  formatActivitySummary,
  formatLocalDate,
  formatNumber,
} from "../ui/recordPresentation.js";

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function sessionSummary(session = {}) {
  const normalized = normalizeV27PlanSession(session);
  if (normalized.activityType === "rest") return "休養";
  const values = [];
  if (normalized.distanceKm > 0) values.push(`${formatNumber(normalized.distanceKm, 2)}km`);
  if (normalized.durationMinutes > 0) values.push(`${formatNumber(normalized.durationMinutes, 1)}分`);
  if (normalized.course.name) values.push(normalized.course.name);
  return values.join("・") || "走行予定";
}

function previewFor(session, scheduledDate, id = "screen") {
  return createV27PlanPreview({
    session,
    scheduledDate,
    previewId: `plan-screen-${id}-${scheduledDate}`,
  });
}

function comparisonLabel(comparison) {
  if (comparison === "same") return "同じ";
  if (comparison === "changed") return "変更";
  return "基準なし";
}

function renderConditionSummary(snapshot, { live = false, showReference = true } = {}) {
  return `<dl class="plan-condition-summary">${snapshot.rows.map((row) => {
    const valueAttribute = live ? ` data-plan-summary-field="${escapeHtml(row.key)}"` : "";
    const statusAttribute = live ? ` data-plan-summary-status="${escapeHtml(row.key)}"` : "";
    return `<div class="plan-condition-row plan-condition-row--${escapeHtml(row.comparison)}"><dt>${escapeHtml(row.label)}</dt><dd><strong${valueAttribute}>${escapeHtml(row.value)}</strong>${showReference ? `<span class="plan-condition-status plan-condition-status--${escapeHtml(row.comparison)}"${statusAttribute}>${escapeHtml(comparisonLabel(row.comparison))}</span>` : ""}</dd></div>`;
  }).join("")}</dl>`;
}

function totalValue(preview) {
  return preview?.state === "RUN"
    ? Number(preview.result?.total?.central_points)
    : null;
}

function renderTotalPreview(preview, {
  live = false,
  heading = "走行全体の比較用推定値",
  difference = "",
} = {}) {
  const total = preview?.result?.total;
  const central = preview?.state === "RUN" ? Number(total?.central_points) : null;
  const valueAttribute = live ? " data-plan-preview-total" : "";
  const differenceAttribute = live ? " data-plan-preview-difference" : "";
  const comparisonText = describePlanComparisonForUser(preview, difference);
  if (preview?.state === "REST") {
    return `<div class="plan-load-summary"><span>${escapeHtml(heading)}</span><strong${valueAttribute}>—</strong><small${differenceAttribute}>${escapeHtml(comparisonText)}</small></div>`;
  }
  return `<div class="plan-load-summary"><span>${escapeHtml(heading)}</span><strong${valueAttribute}>${Number.isFinite(central) ? formatNumber(central, 1) : "—"}</strong><small${differenceAttribute}>${escapeHtml(comparisonText)}</small>${preview?.ok && total?.show_range_primary ? `<em>範囲 ${formatNumber(total.range_points[0], 1)}–${formatNumber(total.range_points[1], 1)}</em>` : ""}</div>`;
}

function changeSummary(snapshot, hasReference) {
  if (!hasReference) return "比較できる基準値がないため、入力した予定条件だけを確認します。";
  if (snapshot.changedCount === 0) return "基準記録から転記した条件です。";
  return `基準記録から変わる入力条件は${snapshot.changedCount}項目です。`;
}

function renderCandidate(candidate, reference, selected, index) {
  const total = totalValue(candidate.preview);
  const snapshot = buildPlanConditionSnapshot(candidate.session, {
    referenceSession: reference.session,
    totalLoad: total,
    referenceTotal: reference.totalLoad,
  });
  return `<article class="plan-candidate${selected ? " is-selected" : ""}" data-plan-candidate-card="${escapeHtml(candidate.candidateId)}"><div class="plan-candidate__heading"><span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><div class="plan-candidate__copy"><p>編集の出発点</p><h3>${escapeHtml(candidate.title)}</h3><p>${escapeHtml(candidate.description)}</p></div><span class="plan-candidate__status-slot"><span class="status-label status-label--success" data-plan-selected-label${selected ? "" : " hidden"}>選択中</span></span></div>${renderTotalPreview(candidate.preview, { heading: "予定条件の比較用推定値", difference: snapshot.totalDifference.label })}<p class="plan-change-summary">${escapeHtml(changeSummary(snapshot, reference.hasReference && reference.totalLoad != null))}</p><details class="plan-candidate-details"><summary>候補の入力条件を見る</summary>${renderConditionSummary(snapshot)}</details><button class="button button--secondary" type="button" data-action="select-plan-candidate" data-candidate-id="${escapeHtml(candidate.candidateId)}" aria-pressed="${selected ? "true" : "false"}">この案から編集する</button></article>`;
}

function renderReferenceCard(reference, sourceSummary) {
  if (!reference.hasReference) {
    return `<article class="plan-reference-card">${renderStatusLabel("基準記録なし", "neutral")}<h3>保存記録を使わずに予定を作る</h3><p>${escapeHtml(sourceSummary)}</p><p>保存記録を出発点にせず、自分で予定内容を入力します。</p></article>`;
  }
  const snapshot = buildPlanConditionSnapshot(reference.session, {
    referenceSession: reference.session,
    totalLoad: reference.totalLoad,
    referenceTotal: reference.totalLoad,
  });
  return `<article class="plan-reference-card"><div class="result-card__heading"><div><p>基準にした保存記録</p><h3>${escapeHtml(sourceSummary)}</h3></div>${renderStatusLabel(reference.totalLoad == null ? "比較値なし" : "参考値あり", reference.totalLoad == null ? "neutral" : "model")}</div>${reference.totalLoad == null ? "<p>保存された事実だけを予定の参考にします。</p>" : `<div class="plan-load-summary"><span>保存した比較用推定値</span><strong>${formatNumber(reference.totalLoad, 1)}</strong><small>予定づくりの参考</small></div>`}<details class="plan-reference-details"><summary>基準記録の入力条件を見る</summary>${renderConditionSummary(snapshot, { showReference: false })}</details></article>`;
}

function renderPreviewStage(preview, snapshot, assumptionText) {
  return `<section class="plan-stage plan-stage--model" data-information-role="model" aria-labelledby="plan-preview-title" data-plan-stage="model"><div class="section-heading"><p>3. 参考表示</p><h2 id="plan-preview-title">保存前の参考表示</h2><p>予定内容から条件比較用の参考値を表示します。値の大小は良否や走行可否を示しません。</p></div><article class="plan-model-summary">${renderStatusLabel("比較用の参考値", "model")}${renderTotalPreview(preview, { live: true, heading: "予定条件の比較用推定値", difference: snapshot.totalDifference.label })}<p data-plan-preview-message>${escapeHtml(preview.message)}</p><p class="plan-model-assumption" data-plan-assumption-note>${escapeHtml(assumptionText)}</p><details class="plan-preview-details"><summary>基準記録との条件差を見る</summary>${renderConditionSummary(snapshot, { live: true })}</details></article></section>`;
}

function renderPlanGuide({ empty = false } = {}) {
  return renderScreenGuide({
    id: empty ? "plan-empty-guide" : "plan-guide",
    summary: empty
      ? "記録を保存すると、その事実を出発点に予定を作れます。"
      : "保存記録を出発点にしても、予定は本人が編集して決めます。",
    sections: empty ? [
      { title: "まず記録", body: "走行または休養を保存すると、距離・時間・コースを転記できます。" },
      { title: "予定は実績と別", body: "予定を保存しても走行記録にはなりません。" },
    ] : [
      { title: "候補は処方ではありません", body: "同じ条件、量を小さくした案、休養を編集の出発点として並べます。" },
      { title: "参考表示の範囲", body: "予定条件の比較用推定値だけを示します。値の大小で候補を順位付けせず、12部位の実績結果や走行可否は予測しません。" },
      { title: "分からない条件", body: "不明のまま保存し、平坦や基準路面へ自動で置き換えません。" },
    ],
  });
}

function routePatternOptions(current = "UNKNOWN") {
  return [["UNKNOWN", "分からない"], ["LOOP", "周回"], ["OUT_AND_BACK", "往復"], ["ONE_WAY", "片道"], ["MIXED", "複合・その他"]]
    .map(([value, label]) => `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`).join("");
}

function gradeKnowledgeOptions(current) {
  return `<option value="UNKNOWN"${current === "UNKNOWN" ? " selected" : ""}>分からない</option><option value="KNOWN_FLAT"${current === "KNOWN_FLAT" ? " selected" : ""}>全体がほぼ平坦</option><option value="KNOWN_PROFILE"${current === "KNOWN_PROFILE" ? " selected" : ""}>上り・下り・平坦の割合を入力</option>`;
}

function surfaceInputMode(course = {}) {
  const active = SURFACE_FIELDS.filter(({ recordKey }) => Number(course?.[recordKey] || 0) > 0);
  if (!active.length) return "UNKNOWN";
  if (active.length === 1 && Math.abs(Number(course[active[0].recordKey]) - 100) <= 0.01) return "SINGLE";
  return "MIXED";
}

function primarySurfaceKey(course = {}) {
  return [...SURFACE_FIELDS].sort((left, right) => Number(course?.[right.recordKey] || 0) - Number(course?.[left.recordKey] || 0))[0]?.recordKey || "pavedPercent";
}

function materialOptions(current) {
  return SURFACE_FIELDS.map(({ recordKey, label }) => `<option value="${escapeHtml(recordKey)}"${recordKey === current ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function renderPlanSurfaceInputs(course = {}) {
  const mode = surfaceInputMode(course);
  const primary = primarySurfaceKey(course);
  return `<label class="field"><span>路面の入力方法</span><select name="surfaceInputMode"><option value="UNKNOWN"${mode === "UNKNOWN" ? " selected" : ""}>分からない</option><option value="SINGLE"${mode === "SINGLE" ? " selected" : ""}>主な路面を1種類入力</option><option value="MIXED"${mode === "MIXED" ? " selected" : ""}>複数の路面を割合で入力</option></select></label><label class="field" data-plan-surface-single${mode === "SINGLE" ? "" : " hidden"}><span>主な路面</span><select name="primarySurfaceKey">${materialOptions(primary)}</select></label><div class="field-grid field-grid--four" data-plan-surface-mixed${mode === "MIXED" ? "" : " hidden"}>${SURFACE_FIELDS.map(({ recordKey, label }) => `<label class="field"><span>${escapeHtml(label)}（%）</span><input name="${escapeHtml(recordKey)}" type="number" min="0" max="100" step="1" value="${escapeHtml(course?.[recordKey] || 0)}"></label>`).join("")}</div><p class="inline-helper">材質を入力すると、路面の違いを同じ基準で扱えます。同じ内容を二重入力する必要はありません。</p>`;
}

function outcomeOption(value, current, label) {
  return `<option value="${escapeHtml(value)}"${value === current ? " selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderPlanOutcomeEditor(plan) {
  const status = plan.outcomeStatus || (plan.actualRecordId ? "completed" : "planned");
  return `<details class="plan-outcome-editor history-detail-disclosure"><summary><span><small>実施状況</small><strong>予定と実績の関係を記録</strong><em>実施・変更・未実施を事実として残します。</em></span><span class="history-detail-disclosure__cue">記録欄を開く</span></summary><form data-plan-outcome-form><input type="hidden" name="planId" value="${escapeHtml(plan.id)}"><div class="field-grid field-grid--two"><label class="field"><span>実施状況</span><select name="outcomeStatus">${outcomeOption("planned", status, "まだ予定")}${outcomeOption("completed", status, "実績あり")}${outcomeOption("changed", status, "内容を変更")}${outcomeOption("not_completed", status, "実施しなかった")}</select></label><label class="field"><span>変更・未実施の理由（任意）</span><select name="changeReason">${outcomeOption("", plan.changeReason || "", "選択しない")}${outcomeOption("condition", plan.changeReason || "", "本人の体調や感じ方")}${outcomeOption("time", plan.changeReason || "", "時間の都合")}${outcomeOption("weather", plan.changeReason || "", "天候")}${outcomeOption("course", plan.changeReason || "", "コースや環境")}${outcomeOption("other", plan.changeReason || "", "その他")}</select></label></div><label class="field"><span>補足（任意）</span><textarea name="changeReasonNote" maxlength="240" rows="3">${escapeHtml(plan.changeReasonNote || "")}</textarea></label><button class="button button--secondary" type="submit">実施状況を保存</button></form></details>`;
}

function savedPlanPreview(plan) {
  if (plan.previewSnapshot?.modelVersion === "runload-load-model-v2.7") {
    return plan.previewSnapshot;
  }
  return previewFor(plan.plannedSession, plan.scheduledDate, plan.id);
}

function renderSavedPlanSummary(plan) {
  const preview = savedPlanPreview(plan);
  return `<dl class="saved-plan-conditions"><div><dt>予定条件の比較用推定値</dt><dd>${preview.state === "RUN" ? formatNumber(preview.result?.total?.central_points, 1) : "—"}</dd></div><div><dt>入力条件</dt><dd>${escapeHtml(sessionSummary(plan.plannedSession))}</dd></div></dl>`;
}

function renderPlanList(plans, services) {
  if (!plans.length) {
    return renderEmptyState({
      title: "保存した予定はありません",
      description: "候補を出発点に予定内容を入力して保存できます。",
    });
  }
  return `<div class="saved-plan-list">${[...plans].sort((left, right) => right.scheduledDate.localeCompare(left.scheduledDate)).map((plan) => {
    const actual = plan.actualRecordId
      ? services.workflows.records.loadExperience(plan.actualRecordId)
      : null;
    const label = plan.outcomeStatus === "changed"
      ? "内容を変更"
      : plan.outcomeStatus === "not_completed"
        ? "実施せず"
        : actual || plan.outcomeStatus === "completed"
          ? "実績あり"
          : "実績未記録";
    return `<article class="saved-plan" aria-labelledby="${escapeHtml(plan.id)}-title"><div><p>${escapeHtml(formatLocalDate(plan.scheduledDate))}</p><h3 id="${escapeHtml(plan.id)}-title">${escapeHtml(plan.title || (plan.planType === "rest" ? "休養予定" : "走行予定"))}</h3><p>${escapeHtml(sessionSummary(plan.plannedSession))}</p>${plan.memo ? `<p>${escapeHtml(plan.memo)}</p>` : ""}</div><div>${renderStatusLabel(label, actual || plan.outcomeStatus === "completed" ? "success" : "neutral")}${actual ? `<p><a class="text-link" href="#/result?recordId=${encodeURIComponent(actual.record.id)}">実績の結果を見る</a></p>` : ""}</div>${renderSavedPlanSummary(plan)}<div class="saved-plan__actions"><a class="button button--secondary" href="#/record-input?planId=${encodeURIComponent(plan.id)}">この予定で入力</a><a class="button button--text" href="#/consultation?mode=plan&planId=${encodeURIComponent(plan.id)}">共有メモ</a><a class="button button--text" href="#/plan?planId=${encodeURIComponent(plan.id)}&sourceRecordId=${encodeURIComponent(plan.sourceRecordId || "")}">編集</a><button class="button button--danger" type="button" data-action="delete-plan" data-plan-id="${escapeHtml(plan.id)}">削除</button></div>${renderPlanOutcomeEditor(plan)}</article>`;
  }).join("")}</div>`;
}

function renderSavedPlansDisclosure(plans, services) {
  return `<details class="history-detail-disclosure plan-saved-disclosure"><summary><span><small>保存した予定</small><strong>保存した予定を見る</strong><em>予定内容と参考値を確認できます。</em></span><span class="history-detail-disclosure__cue">予定一覧を表示</span></summary><div class="history-record-browser__body">${renderPlanList(plans, services)}</div></details>`;
}

function renderPlanCompletion(plan, services) {
  const preview = savedPlanPreview(plan);
  return `<section class="screen screen--plan">${renderPageHeading({ eyebrow: "予定の保存", title: "予定を保存しました", description: "予定は実績と別に保存されています。" })}<section class="plan-complete-card"><div class="plan-complete-card__mark" aria-hidden="true">✓</div><p>${escapeHtml(formatLocalDate(plan.scheduledDate))}</p><h2>${escapeHtml(plan.title || "次の予定")}</h2><p>${escapeHtml(sessionSummary(plan.plannedSession))}</p>${renderTotalPreview(preview, { heading: "予定条件の比較用推定値" })}${plan.memo ? `<p>${escapeHtml(plan.memo)}</p>` : ""}<a class="button button--primary" href="#/home">ホームへ戻る</a></section>${renderSavedPlansDisclosure(services.storage.plans.loadAll(), services)}</section>`;
}

function renderPlanStartEmptyScreen(plans, services) {
  return `<section class="screen screen--plan">${renderPageHeading({ eyebrow: "次の予定", title: "次の走りや休養を考える", description: "保存記録を出発点に予定を作ります。" })}${renderPlanGuide({ empty: true })}${renderEmptyState({ title: "比較の出発点になる記録がありません", description: "走行または休養を保存すると、予定候補を作れます。", actionLabel: "今日の記録を始める", actionScreen: "record-input" })}${renderSavedPlansDisclosure(plans, services)}</section>`;
}

export function renderPlanScreen({ services, context }) {
  const editingId = context.parameters.get("planId") || "";
  const editingPlan = editingId ? services.storage.plans.findById(editingId) : null;
  if (editingPlan && context.parameters.get("saved") === "1") {
    return renderPlanCompletion(editingPlan, services);
  }
  const sourceRecordId = context.parameters.get("sourceRecordId")
    || editingPlan?.sourceRecordId
    || "";
  const scheduledDate = editingPlan?.scheduledDate
    || context.parameters.get("scheduledDate")
    || localToday();
  const candidateResult = services.workflows.plans.createCandidates({
    sourceRecordId,
    scheduledDate,
  });
  const plans = services.storage.plans.loadAll();
  if (!editingPlan && !candidateResult.sourceExperience) {
    return renderPlanStartEmptyScreen(plans, services);
  }
  if (candidateResult.blocked) {
    const recordId = candidateResult.blockingExperience?.record?.id || sourceRecordId;
    const supportRoute = candidateResult.blockingExperience?.supportDecision?.route || "consult";
    if (supportRoute === "urgent") {
      return `<section class="screen">${renderPageHeading({ eyebrow: "次の予定", title: "次の走りや休養を考える", description: "予定候補より本人入力と公的な案内の確認を優先します。" })}<section class="next-action next-action--urgent"><div>${renderStatusLabel("通常候補を停止", "attention")}<h2>公的な相談先を確認する</h2><p>RunLoadは緊急性を判定しません。本人が選択した項目に対応する公式窓口を確認してから、必要な記録整理へ進みます。</p></div><div class="next-action__actions"><a class="button button--primary" href="#/support-guidance?recordId=${encodeURIComponent(recordId)}">公的な相談先を確認する</a><a class="button button--secondary" href="#/consultation?recordId=${encodeURIComponent(recordId)}">相談用に整理する</a></div></section></section>`;
    }
    return `<section class="screen">${renderPageHeading({ eyebrow: "次の予定", title: "次の走りや休養を考える", description: "本人が入力した内容の整理を優先します。" })}<section class="next-action next-action--consult"><div>${renderStatusLabel("通常候補を停止", "attention")}<h2>本人入力を先に確認する</h2><p>通常の予定候補より、本人が入力した事実の相談準備を先に表示します。</p></div><a class="button button--primary" href="#/consultation?recordId=${encodeURIComponent(recordId)}">相談用の内容を開く</a></section></section>`;
  }

  const candidates = candidateResult.candidates;
  const initialCandidate = candidates.find((candidate) => candidate.candidateId === "same-conditions")
    || candidates[0];
  const session = normalizeV27PlanSession(
    editingPlan?.plannedSession || initialCandidate?.session || {},
  );
  const planType = editingPlan?.planType || session.activityType;
  const preview = editingPlan?.previewSnapshot?.modelVersion === "runload-load-model-v2.7"
    ? editingPlan.previewSnapshot
    : previewFor({ ...session, activityType: planType }, scheduledDate, editingId || "initial");
  const sourceSummary = candidateResult.sourceExperience
    ? `${formatLocalDate(candidateResult.sourceExperience.record.date)}・${formatActivitySummary(candidateResult.sourceExperience.record)}`
    : "保存済みの基準記録なし";
  const reference = buildPlanReference(candidateResult.sourceExperience);
  const snapshot = buildPlanConditionSnapshot(session, {
    referenceSession: reference.session,
    totalLoad: totalValue(preview),
    referenceTotal: reference.totalLoad,
  });
  const settings = services.storage.settings.load();
  return `<section class="screen screen--plan">
    ${renderPageHeading({ eyebrow: "次の予定", title: "次の走りや休養を考える", description: "保存記録を出発点に、予定内容を編集して保存します。" })}
    ${renderPlanGuide()}
    <ol class="plan-flow-steps" aria-label="予定を保存する4段階"><li><span>1</span><strong>出発点を選ぶ</strong></li><li><span>2</span><strong>予定を編集</strong></li><li><span>3</span><strong>参考値を確認</strong></li><li><span>4</span><strong>保存</strong></li></ol>
    <section class="plan-stage plan-stage--candidates" aria-labelledby="candidate-title"><div class="section-heading"><p>1. 出発点</p><h2 id="candidate-title">編集の出発点を選ぶ</h2><p>保存記録と候補を確認し、最も近い案から編集します。</p></div>${renderReferenceCard(reference, sourceSummary)}<div class="plan-candidate-grid">${candidates.map((candidate, index) => renderCandidate(candidate, reference, !editingPlan && candidate.candidateId === initialCandidate?.candidateId, index)).join("")}</div></section>
    <form id="plan-form" class="record-form plan-save-form" novalidate data-plan-reference="${escapeHtml(serializePlanReference(reference))}">
      <input type="hidden" name="planId" value="${escapeHtml(editingPlan?.id || "")}">
      <input type="hidden" name="sourceRecordId" value="${escapeHtml(sourceRecordId || editingPlan?.sourceRecordId || "")}">
      <input type="hidden" name="candidateId" value="${escapeHtml(editingPlan?.sourceCandidateId || initialCandidate?.candidateId || "custom")}">
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      <section class="form-section plan-stage plan-stage--edit" aria-labelledby="plan-edit-title" data-plan-stage="edit"><div class="section-heading"><p>2. 予定内容</p><h2 id="plan-edit-title">予定内容を編集する</h2><p>出発点：<strong data-plan-current-candidate>${escapeHtml(editingPlan ? "保存済み予定" : initialCandidate?.title || "候補")}</strong></p></div>
        <div class="field-grid field-grid--two"><label class="field"><span>予定日 <strong aria-label="必須">必須</strong></span><input name="scheduledDate" type="date" required value="${escapeHtml(scheduledDate)}"></label><fieldset class="field fieldset-field"><legend>予定の種類</legend><div class="segmented-control"><label><input type="radio" name="planType" value="run"${planType === "run" ? " checked" : ""}><span>走行</span></label><label><input type="radio" name="planType" value="rest"${planType === "rest" ? " checked" : ""}><span>休養</span></label></div></fieldset></div>
        <label class="field"><span>見出し（任意）</span><input name="title" maxlength="80" value="${escapeHtml(editingPlan?.title || (planType === "rest" ? "休養予定" : "次の走り"))}"></label>
        <div data-plan-run-fields${planType === "rest" ? " hidden" : ""}>
          <fieldset class="plan-edit-group"><legend>走る量</legend><p class="inline-helper inline-helper--important">走行全体の参考値を見るには、予定距離と実走予定時間の両方を入力してください。</p><div class="field-grid field-grid--two"><label class="field"><span>距離（km） <strong aria-label="必須">必須</strong></span><input name="distanceKm" type="number" min="0.01" step="0.01" value="${escapeHtml(session.distanceKm || "")}"></label><label class="field"><span>実走予定時間（分） <strong aria-label="必須">必須</strong></span><input name="durationMinutes" type="number" min="0.01" step="0.1" value="${escapeHtml(session.durationMinutes || "")}"></label></div><label class="field"><span>走行形式（任意）</span><select name="runningFormat"><option value="UNKNOWN"${session.runningFormat === "UNKNOWN" ? " selected" : ""}>未設定</option><option value="CONTINUOUS_RUN"${session.runningFormat === "CONTINUOUS_RUN" ? " selected" : ""}>途中で歩かず走る予定</option><option value="RUN_WALK"${session.runningFormat === "RUN_WALK" ? " selected" : ""}>走りと歩きを混ぜる予定</option></select></label></fieldset>
          <fieldset class="plan-edit-group plan-edit-group--course"><legend>コース条件</legend><p class="inline-helper">分からない条件は、不明のまま保存できます。</p>${renderExternalCourseCheckSupport({ title: "予定の区間や勾配を確認したいとき", smallText: "必要なときだけ外部地図を確認し、分かった事実だけ入力", compact: true, settings })}<label class="field"><span>コース名（任意）</span><input name="courseName" maxlength="80" value="${escapeHtml(session.course.name || "")}"></label><label class="field"><span>コース形式</span><select name="routePattern">${routePatternOptions(session.course.routePattern || "UNKNOWN")}</select></label><label class="field"><span>坂道の入力方法</span><select name="gradeKnowledge">${gradeKnowledgeOptions(session.course.gradeKnowledge)}</select></label><div class="field-grid field-grid--four" data-plan-grade-profile${session.course.gradeKnowledge === "KNOWN_PROFILE" ? "" : " hidden"}><label class="field"><span>上り区間（%）</span><input name="upPercent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(session.course.upPercent || 0)}"></label><label class="field"><span>上り代表勾配（%）</span><input name="upGradePercent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(session.course.upGradePercent || 0)}"></label><label class="field"><span>下り区間（%）</span><input name="downPercent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(session.course.downPercent || 0)}"></label><label class="field"><span>下り代表勾配の大きさ（%）</span><input name="downGradePercent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(session.course.downGradePercent || 0)}"></label></div>${renderPlanSurfaceInputs(session.course)}</fieldset>
        </div>
      </section>
      ${renderPreviewStage(preview, snapshot, describePlanModelAssumptions(session))}
      <section class="form-section plan-stage plan-stage--confirm" aria-labelledby="plan-confirm-title"><div class="section-heading"><p>4. 保存</p><h2 id="plan-confirm-title">予定を確認して保存する</h2></div><div class="plan-final-heading"><div><span>予定日</span><strong data-plan-confirm-date>${escapeHtml(formatLocalDate(scheduledDate))}</strong></div><div><span>見出し</span><strong data-plan-confirm-title>${escapeHtml(editingPlan?.title || (planType === "rest" ? "休養日" : "次の走り"))}</strong></div></div>${renderTotalPreview(preview, { live: true, heading: "予定条件の比較用推定値", difference: snapshot.totalDifference.label })}<label class="field"><span>メモ（任意）</span><textarea name="memo" maxlength="500" rows="4">${escapeHtml(editingPlan?.memo || "")}</textarea></label><div class="form-submit-area"><button class="button button--primary" type="submit">${editingPlan ? "変更を保存する" : "予定を保存する"}</button></div></section>
    </form>
    ${renderSavedPlansDisclosure(plans, services)}
  </section>`;
}
