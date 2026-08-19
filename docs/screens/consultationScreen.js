import { escapeHtml, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import { SAFETY_FLAG_LABELS, formatActivitySummary, formatLocalDate, formatNumber } from "../ui/recordPresentation.js";
import { registerConsultationDraft } from "../ui/consultationDraftState.js";
import {
  buildReportPresentation,
  createPlanShareMemo,
  createReportCopyText,
  renderReportSheet,
} from "../ui/consultationPresentation.js";



function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function latestPlan(plans = []) {
  const validPlans = Array.isArray(plans)
    ? plans.filter((plan) => plan && plan.id)
    : [];
  if (!validPlans.length) return null;

  const sortedPlans = [...validPlans].sort((a, b) => {
    return String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""));
  });
  const today = localDateKey();
  return sortedPlans.find((plan) => String(plan.scheduledDate || "") >= today) || sortedPlans[sortedPlans.length - 1] || null;
}


function modeLink(mode, current, label, description, enabled, parameters = {}) {
  if (!enabled) return `<span class="consult-mode-link is-disabled" aria-disabled="true"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span>`;
  const query = new URLSearchParams({ page: "quick", mode, ...parameters }).toString();
  return `<a class="consult-mode-link${mode === current ? " is-current" : ""}" href="#/consultation?${query}"${mode === current ? ' aria-current="page"' : ""}><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></a>`;
}

function reportFormatLink(format, current, label, description, recordId, regionId) {
  const query = new URLSearchParams({
    page: "report",
    mode: "result",
    recordId,
    format,
    regionId,
  }).toString();
  return `<a class="share-format-card${format === current ? " is-current" : ""}" href="#/consultation?${query}"${format === current ? ' aria-current="page"' : ""}><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></a>`;
}

function purposeLink(item, current, recordId, regionId, a4RegionId) {
  const query = new URLSearchParams({
    page: "quick",
    mode: "result",
    recordId,
    purpose: item.id,
    regionId,
    a4RegionId,
  }).toString();
  return `<a class="consult-purpose-link${item.id === current ? " is-current" : ""}" href="#/consultation?${query}"${item.id === current ? ' aria-current="page"' : ""}><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small></a>`;
}

function renderPurposeNavigation({ services, decision, experience, regionId }) {
  return `<section class="consult-purpose-selector" aria-labelledby="consult-purpose-title"><div class="section-heading"><p>2. 相談の目的</p><h2 id="consult-purpose-title">何を確認したいですか</h2></div><div class="consult-purpose-grid">${services.consultation.purposes.map((item) => purposeLink(item, decision.purpose, experience.record.id, regionId, decision.regionId)).join("")}</div></section>`;
}

function renderA4RegionSelector(decision) {
  const options = decision.regionOptions.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === decision.regionId ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("");
  return `<section class="consult-region-selector" aria-labelledby="consult-region-title"><div class="section-heading section-heading--compact"><p>3. 部位</p><h2 id="consult-region-title">確認する部位を1つ選ぶ</h2></div><label class="field"><span>確認する部位</span><select data-consult-region-selector>${options}</select><small>部位間の順位付けではありません。選んだ部位で条件応答を数値化できる場合だけ、その部位固有の基準100と比較します。</small></label></section>`;
}

function renderDecisionSources(decision) {
  return `<section class="consult-rule-summary" aria-labelledby="consult-rule-summary-title"><div class="section-heading section-heading--compact"><p>4. メモの内容</p><h2 id="consult-rule-summary-title">含める内容を確認する</h2></div><ul>${decision.sources.map((item) => `<li class="${item.used ? "is-used" : "is-unused"}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.used ? "含める" : "含めない")}</span><small>${escapeHtml(item.reason)}</small></li>`).join("")}</ul><p>保存した内容から下書きを作ります。必要な部分を自分の言葉へ直し、自分で共有してください。自動送信はしません。</p></section>`;
}

function planSummary(plan) {
  if (!plan) return "";
  const session = plan.plannedSession || {};
  if (plan.planType === "rest" || session.activityType === "rest") return "休養予定";
  const parts = [];
  if (Number(session.distanceKm) > 0) parts.push(`${formatNumber(session.distanceKm, 2)}km`);
  if (Number(session.durationMinutes) > 0) parts.push(`${formatNumber(session.durationMinutes, 0)}分`);
  if (session.course?.name) parts.push(session.course.name);
  return parts.join("・") || "走行予定";
}

function renderModeNavigation({ mode, experience, plan }) {
  return `<nav class="consult-mode-navigation" aria-label="短い共有メモの種類">
    ${modeLink("result", mode, "結果を伝える", experience ? "保存した記録と本人入力を短く整理します。" : "対象記録がありません。", Boolean(experience), experience ? { recordId: experience.record.id } : {})}
    ${modeLink("plan", mode, "予定を伝える", plan ? "保存した予定とコース条件を短く整理します。" : "保存した予定がありません。", Boolean(plan), plan ? { planId: plan.id } : {})}
    ${modeLink("free", mode, "その他を書く", "結果や予定に収まらない内容を自分の言葉で書きます。", true)}
  </nav>`;
}

function renderEditableMemo({ key, originalText, title, help, placeholder = "", free = false }) {
  const draft = registerConsultationDraft(key, originalText);
  return `<section class="share-report quick-share-card" aria-labelledby="quick-share-title">
    <div class="result-card__heading"><div><p>編集して使う短文</p><h2 id="quick-share-title">${escapeHtml(title)}</h2></div>${renderStatusLabel("自動送信しません", "success")}</div>
    <p>${escapeHtml(help)}</p>
    <textarea id="consultation-report-text" class="report-textarea" rows="9" maxlength="1200" placeholder="${escapeHtml(placeholder)}" aria-labelledby="quick-share-title" aria-describedby="consultation-draft-character-count" data-consultation-draft data-draft-key="${escapeHtml(key)}">${escapeHtml(draft)}</textarea>
    <div class="consult-draft-toolbar"><span id="consultation-draft-character-count" aria-live="polite" data-consult-character-count>${draft.length} / 1200文字</span><div>${free ? "" : `<button class="button button--text" type="button" data-action="reset-consultation-draft" data-draft-key="${escapeHtml(key)}">原文へ戻す</button>`}<button class="button button--text" type="button" data-action="clear-consultation-draft" data-draft-key="${escapeHtml(key)}">内容を消去</button></div></div>
    <div class="screen-actions"><button class="button button--primary" type="button" data-action="copy-consultation-report">共有メモをコピー</button></div>
  </section>`;
}

function renderExperienceSource(experience, route) {
  const recordId = experience.record.id;
  const status = route === "urgent" ? "公的な窓口も確認" : route === "consult" ? "相談準備を優先" : "対象記録";
  const actions = route === "urgent"
    ? `<div class="next-action__actions"><a class="button button--primary" href="#/support-guidance?recordId=${encodeURIComponent(recordId)}">公的な相談先を確認</a><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(recordId)}">結果へ戻る</a></div>`
    : `<a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(recordId)}">結果へ戻る</a>`;
  return `<section class="next-action${route === "urgent" ? " next-action--urgent" : route === "consult" ? " next-action--consult" : ""}"><div>${renderStatusLabel(status, route === "normal" ? "info" : "attention")}<h2>${escapeHtml(formatLocalDate(experience.record.date))}の記録</h2><p>${escapeHtml(formatActivitySummary(experience.record))}</p></div>${actions}</section>`;
}

function renderConditionNotice(report) {
  if (!report.conditionFlags.length) return "";
  return `<section class="safety-notice"><h2>本人が選択した体調情報</h2><ul>${report.conditionFlags.map((flag) => `<li>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</li>`).join("")}</ul><p>アプリの数値結果による判定ではなく、本人入力としてそのまま共有します。</p></section>`;
}

function renderResultQuick({ services, experience, regionId, purpose, a4RegionId }) {
  const allExperiences = services.workflows.records.loadAllExperiences();
  const decision = services.consultation.buildDeterministicConsultation({
    experience,
    allExperiences,
    purpose,
    regionId: a4RegionId,
  });
  const report = services.consultation.buildConsultationReport(
    experience,
    allExperiences,
    { regionId: decision.regionId || regionId },
  );
  const priority = report.supportRoute === "consult" || report.supportRoute === "urgent";
  const reportQuery = new URLSearchParams({
    page: "report",
    mode: "result",
    recordId: experience.record.id,
    format: "standard",
    regionId: report.modelReference.regional.regionId,
  }).toString();
  const reportAction = priority
    ? `<section class="consult-priority-report"><div><p>${report.supportRoute === "urgent" ? "公的な案内とは別に作る資料" : "本人入力を先に確認する資料"}</p><h2>${report.supportRoute === "urgent" ? "相談用レポートも準備する" : "相談用レポートを優先"}</h2><p>本人入力、今回の条件、部位の条件応答の順でまとめます。数値化できる場合は基準100の意味も明記します。公的な窓口の確認を置き換える資料ではありません。</p></div><a class="button button--primary" href="#/consultation?${reportQuery}">相談用レポートを開く</a></section>`
    : "";
  const comparisonNotice = decision.purpose === "previous_comparison" && decision.regional.previousComparable?.status !== "COMPARABLE"
    ? `<aside class="editorial-boundary"><p>同じ部位・同じ基準など、同じ意味で比べられる過去記録がないため、差は表示せず、その理由をメモへ記載します。</p></aside>`
    : "";
  return `<section class="consult-source-panel" data-deterministic-consultation-version="${escapeHtml(decision.version)}">
    ${renderExperienceSource(experience, report.supportRoute)}
    ${renderConditionNotice(report)}
    ${reportAction}
    ${renderPurposeNavigation({ services, decision, experience, regionId: decision.regionId })}
    ${renderA4RegionSelector(decision)}
    ${comparisonNotice}
    ${renderDecisionSources(decision)}
    ${renderEditableMemo({ key: `result:${experience.record.id}:${decision.purpose}:${decision.regionId}`, originalText: decision.memo, title: "目的別の相談メモ", help: "保存した内容から作った下書きです。必要な範囲だけ残し、自分の言葉へ直して使います。" })}
    <aside class="editorial-boundary"><p>この機能は診断、障害予測、原因特定、走行可否、練習処方、安全保証を行いません。保存済みの部位別結果も変更しません。</p></aside>
  </section>`;
}

function renderPlanQuick(services, plan) {
  return `<section class="consult-source-panel">
    <section class="result-card"><div class="result-card__heading"><div><p>${escapeHtml(formatLocalDate(plan.scheduledDate))}の予定</p><h2>${escapeHtml(plan.title || (plan.planType === "rest" ? "休養予定" : "走行予定"))}</h2></div>${renderStatusLabel("予定", "neutral")}</div><p>${escapeHtml(planSummary(plan))}</p>${plan.memo ? `<p>${escapeHtml(plan.memo)}</p>` : ""}<a class="button button--text" href="#/plan?planId=${encodeURIComponent(plan.id)}&sourceRecordId=${encodeURIComponent(plan.sourceRecordId || "")}">予定を確認・編集</a></section>
    ${renderEditableMemo({ key: `plan:${plan.id}`, originalText: createPlanShareMemo(services, plan), title: "予定の共有メモ", help: "相手に見せるため、予定条件を短くまとめます。" })}
  </section>`;
}

function renderFreeQuick() {
  return `<section class="consult-source-panel">${renderEditableMemo({ key: "free", originalText: "", title: "その他の相談を書く", help: "相手に見せたい内容を、自分の言葉で短く書けます。", placeholder: "例：最近の走りで気になったことがあります。確認してほしい内容は…", free: true })}</section>`;
}

function renderConsultationHub({ experience, plan }) {
  const quickMode = experience ? "result" : plan ? "plan" : "free";
  const quickParameters = new URLSearchParams({ page: "quick", mode: quickMode });
  if (experience) quickParameters.set("recordId", experience.record.id);
  if (!experience && plan) quickParameters.set("planId", plan.id);
  const reportHref = experience
    ? `#/consultation?page=report&mode=result&recordId=${encodeURIComponent(experience.record.id)}&format=standard`
    : "";
  return `<section class="screen screen--consultation screen--consultation-hub">
    ${renderPageHeading({ eyebrow: "相談の準備", title: "見せる内容を選ぶ", description: "必要な範囲だけを、短いメモまたは資料に整理します。" })}
    <p class="screen-boundary-note">短いメモはその場で見せる文章、資料レポートは印刷・PDF用のまとめです。どちらも自動送信しません。</p>
    <div class="consult-entry-grid" aria-label="相談と共有の入口">
      <a class="consult-entry-card consult-entry-card--quick" data-consult-entry="quick" href="#/consultation?${quickParameters.toString()}"><span>01</span><strong>短い共有メモ</strong><p>選んで編集、コピー。</p><em>相談相手に文章を見せる</em></a>
      ${reportHref ? `<a class="consult-entry-card consult-entry-card--report" data-consult-entry="report" href="${reportHref}"><span>02</span><strong>資料レポート</strong><p>今回の記録／最近の流れ。</p><em>資料を開く</em></a>` : `<div class="consult-entry-card consult-entry-card--report is-disabled" data-consult-entry="report" aria-disabled="true"><span>02</span><strong>資料レポート</strong><p>記録後に資料化。</p><em>記録後に利用できます</em></div>`}
    </div>
    <aside class="editorial-boundary"><p>この画面は、本人が相談相手に見せる材料を整える場所です。相手に渡す範囲は本人が選びます。</p></aside>
  </section>`;
}

function renderQuickPage({ services, experience, plan, mode, regionId, purpose, a4RegionId }) {
  const body = mode === "result" && experience
    ? renderResultQuick({ services, experience, regionId, purpose, a4RegionId })
    : mode === "plan" && plan
      ? renderPlanQuick(services, plan)
      : renderFreeQuick();
  return `<section class="screen screen--consultation screen--quick-share">
    ${renderPageHeading({ eyebrow: "短い共有メモ", title: "短い共有メモを作る", description: "見せたい内容を選び、自分の言葉へ直してコピーします。" })}
    <div class="page-heading-actions"><a class="button button--text" href="#/consultation">見せる内容の選択へ戻る</a></div>
    <section class="consult-selector" data-information-role="personal" aria-labelledby="consult-selector-title"><div class="section-heading"><p>1. 見せる内容</p><h2 id="consult-selector-title">何を見せますか</h2></div>${renderModeNavigation({ mode, experience, plan })}</section>
    ${body}
    
  </section>`;
}

function renderReportPage({ services, experience, format, regionId }) {
  const presentation = buildReportPresentation({
    services,
    experience,
    regionId,
  });
  const { report } = presentation;
  const priority = report.supportRoute === "consult" || report.supportRoute === "urgent";
  const copyText = createReportCopyText({ presentation, format });
  const documentTitle = format === "detailed" ? "詳細資料：最近の流れを追加" : "標準資料：今回1件・1ページ";
  return `<section class="screen screen--consultation screen--share-report">
    ${renderPageHeading({ eyebrow: priority ? "相談用の資料" : "共有用の資料", title: priority ? "相談用レポート" : "資料レポート", description: priority ? "本人入力を先に置き、必要な記録だけをまとめます。" : "今回の記録を、印刷・PDF・コピー用にまとめます。" })}
    <div class="page-heading-actions"><a class="button button--text" href="#/consultation">見せる内容の選択へ戻る</a></div>
    <div class="report-screen-tools">
      ${renderExperienceSource(experience, report.supportRoute)}
      ${renderConditionNotice(report)}
      <section aria-labelledby="report-format-title"><div class="section-heading"><p>1. 資料の種類</p><h2 id="report-format-title">資料の種類を選ぶ</h2></div><div class="share-format-picker">${reportFormatLink("standard", format, "標準資料", "今回の記録を短くまとめます。", experience.record.id, presentation.selectedRegionId)}${reportFormatLink("detailed", format, "詳細資料", "最近の流れも添えます。", experience.record.id, presentation.selectedRegionId)}</div></section>
      <section class="report-print-actions" aria-labelledby="report-print-title"><div><p>2. 出力</p><h2 id="report-print-title">${escapeHtml(documentTitle)}</h2><p>必要な内容をまとめた資料を開きます。</p></div><div class="screen-actions"><button class="button button--primary" type="button" data-action="print-consultation-report">印刷・PDFを開く</button><button class="button button--secondary" type="button" data-action="copy-consultation-report">本文をコピー</button></div></section>
    </div>
    <textarea id="consultation-report-text" class="report-copy-source" readonly tabindex="-1" aria-hidden="true">${escapeHtml(copyText)}</textarea>
    <div class="report-output-area">${renderReportSheet({ presentation, format })}</div>
  </section>`;
}

export function renderConsultationScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const requestedPlanId = context.parameters.get("planId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const plans = services.storage.plans.loadAll();
  const plan = requestedPlanId ? services.storage.plans.findById(requestedPlanId) : latestPlan(plans);
  const requestedMode = ["result", "plan", "free"].includes(context.parameters.get("mode"))
    ? context.parameters.get("mode")
    : experience ? "result" : plan ? "plan" : "free";
  const mode = requestedMode === "result" && !experience
    ? plan ? "plan" : "free"
    : requestedMode === "plan" && !plan
      ? experience ? "result" : "free"
      : requestedMode;
  const legacyView = context.parameters.get("view") || "";
  const format = ["standard", "detailed"].includes(context.parameters.get("format"))
    ? context.parameters.get("format")
    : ["standard", "detailed"].includes(legacyView) ? legacyView : "standard";
  const requestedPage = context.parameters.get("page") || "";
  const regionId = context.parameters.get("regionId") || "";
  const purpose = context.parameters.get("purpose") || "";
  const a4RegionId = context.parameters.get("a4RegionId") || "";
  const reportPage = Boolean(experience) && mode === "result" && (requestedPage === "report" || ["standard", "detailed"].includes(legacyView));
  const quickPage = requestedPage === "quick" || context.parameters.has("mode");

  if (reportPage) return renderReportPage({
    services,
    experience,
    format,
    regionId,
  });
  if (quickPage) return renderQuickPage({
    services,
    experience,
    plan,
    mode,
    regionId,
    purpose,
    a4RegionId,
  });
  return renderConsultationHub({ experience, plan });
}
