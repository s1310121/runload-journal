import { escapeHtml, renderFeatureLinks, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import {
  BODY_PART_DISPLAY_NAMES,
  SUBJECTIVE_STATUS_LABELS,
  createNeutralResultSummary,
  formatActivitySummary,
  formatLocalDate,
  formatNumber,
  getEnteredBodyAreaObservations,
  getEnteredBodyParts,
} from "../ui/recordPresentation.js";

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderPrimaryAction(experience, draft) {
  if (!experience) {
    return `<section class="lead-action-card" aria-labelledby="home-primary-action-title"><div>${renderStatusLabel(draft ? "入力途中あり" : "はじめの一歩", "info")}<h2 id="home-primary-action-title">まずは今日の記録から</h2><p>基本5項目、または休養から。</p></div><div class="lead-action-card__actions"><a class="button button--primary" href="#/record-input">${draft ? "入力を再開する" : "今日の記録を始める"}</a>${draft ? `<a class="button button--secondary" href="#/record-input?new=1">新しい記録を入力する</a>` : ""}</div></section>`;
  }
  const route = experience.supportDecision?.route || "normal";
  const recordId = experience.record.id;
  if (route === "urgent") {
    return `<section class="lead-action-card lead-action-card--attention" aria-labelledby="home-primary-action-title"><div>${renderStatusLabel("公的な相談先を確認", "attention")}<h2 id="home-primary-action-title">本人入力を確認し、必要なら公的な窓口へ</h2><p>RunLoadは緊急性を判定しません。入力した項目と公式の救急案内を分けて確認します。</p></div><div class="lead-action-card__actions"><a class="button button--primary" href="#/support-guidance?recordId=${encodeURIComponent(recordId)}">公的な相談先を確認する</a><a class="button button--secondary" href="#/consultation?recordId=${encodeURIComponent(recordId)}">相談用に整理する</a></div></section>`;
  }
  if (route === "consult") {
    return `<section class="lead-action-card lead-action-card--attention" aria-labelledby="home-primary-action-title"><div>${renderStatusLabel("相談準備を優先", "attention")}<h2 id="home-primary-action-title">本人が入力した体調内容を先に確認する</h2><p>数値表示による判定ではなく、本人入力を整理して相談準備へ進みます。</p></div><a class="button button--primary" href="#/consultation?recordId=${encodeURIComponent(recordId)}">相談内容を開く</a></section>`;
  }
  const feedbackStatus = experience.feedback?.checkStatus || "not_asked";
  if (["not_asked", "deferred"].includes(feedbackStatus)) {
    return `<section class="lead-action-card" aria-labelledby="home-primary-action-title"><div>${renderStatusLabel("次に確認", "info")}<h2 id="home-primary-action-title">今回の身体記録</h2><p>身体記録なし／気になる部位／相談したい内容。</p></div><a class="button button--primary" href="#/record-input?recordId=${encodeURIComponent(recordId)}&focus=subjective">身体記録を確認する</a></section>`;
  }
  if (experience.record.date === localToday()) {
    return `<section class="lead-action-card" aria-labelledby="home-primary-action-title"><div>${renderStatusLabel("今日の記録あり", "success")}<h2 id="home-primary-action-title">今日の結果</h2><p>記録・本人入力・数値表示を分けて確認。</p></div><a class="button button--primary" href="#/result?recordId=${encodeURIComponent(recordId)}">今日の結果を開く</a></section>`;
  }
  return `<section class="lead-action-card" aria-labelledby="home-primary-action-title"><div>${renderStatusLabel("今日の入口", "info")}<h2 id="home-primary-action-title">今日の記録</h2><p>走行または休養を残す。</p></div><a class="button button--primary" href="#/record-input">今日の記録を始める</a></section>`;
}

function renderBeginnerSteps() {
  return `<section class="home-start-steps" aria-labelledby="home-start-steps-title"><div class="section-heading"><p>3つの基本ステップ</p><h2 id="home-start-steps-title">記録から振り返りまで</h2></div><ol><li><span>1</span><div><strong>記録する</strong><p>距離・実走時間を中心に、分かる条件だけ入力。</p></div></li><li><span>2</span><div><strong>結果を見る</strong><p>走行全体の比較用推定値と、12部位の条件応答・共通走行量。</p></div></li><li><span>3</span><div><strong>結果を活用する</strong><p>理解・共有・予定から次の行動を選ぶ。</p></div></li></ol><div class="home-start-steps__links"><a class="text-link" href="#/activation">活用の入口を開く</a><a class="text-link" href="#/plan">次の予定を作る</a><a class="text-link" href="#/consultation">相談内容を整理する</a><a class="text-link" href="#/column">読みものを開く</a></div></section>`;
}

function renderLatestRecord(experience) {
  if (!experience) return "";
  const exactAreas = getEnteredBodyAreaObservations(experience.feedback || {});
  const enteredParts = getEnteredBodyParts(experience.feedback || {});
  const subjective = exactAreas.length
    ? `<p class="home-summary-card__meta">本人が入力した詳細部位：${exactAreas.slice(0, 3).map((item) => escapeHtml(item.label || "詳細部位")).join("、")}${exactAreas.length > 3 ? `ほか${exactAreas.length - 3}部位` : ""}</p>`
    : enteredParts.length
      ? `<p class="home-summary-card__meta">本人が記録した部位：${enteredParts.map((bodyPart) => escapeHtml(BODY_PART_DISPLAY_NAMES[bodyPart] || bodyPart)).join("、")}</p>`
      : `<p class="home-summary-card__meta">本人の身体記録：${escapeHtml(SUBJECTIVE_STATUS_LABELS[experience.feedback?.checkStatus] || "未確認")}</p>`;
  return `<section class="home-summary-card" aria-labelledby="latest-record-title"><div class="home-summary-card__header"><div><p>最新の保存記録</p><h2 id="latest-record-title">最新の記録</h2></div><span>${escapeHtml(formatLocalDate(experience.record.date))}</span></div><div class="home-summary-card__body"><p class="home-summary-card__lead">${escapeHtml(formatActivitySummary(experience.record))}</p><p>${escapeHtml(createNeutralResultSummary(experience))}</p>${subjective}</div><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(experience.record.id)}">結果を開く</a></section>`;
}

function planPolicyLabel(plan = {}) {
  if (plan.planType === "rest" || plan.plannedSession?.activityType === "rest") return "休養を予定する";
  if (plan.sourceCandidateId === "lighter-session") return "時間や距離を小さくする";
  if (plan.sourceCandidateId === "same-conditions") return "同じ条件を基準にした予定";
  if (plan.sourceCandidateId === "rest-day") return "休養を予定する";
  if (plan.sourceCandidateId === "custom") return "自分で調整した予定";
  return "保存済みの予定";
}

function nextPlanDetailItems(plan = {}) {
  const planned = plan.plannedSession || {};
  if (plan.planType === "rest" || planned.activityType === "rest") return ["休養予定"];
  const items = [];
  const distance = Number(planned.distanceKm || 0);
  const duration = Number(planned.durationMinutes || 0);
  const amount = [
    distance > 0 ? `${formatNumber(distance, 2)}km` : "",
    duration > 0 ? `${formatNumber(duration, 0)}分` : "",
  ].filter(Boolean).join("・");
  if (amount) items.push(amount);
  const courseName = String(planned.course?.name || "").trim();
  if (courseName) items.push(`コース：${courseName}`);
  return items;
}

function renderNextPlan(services, latestExperience) {
  const route = latestExperience?.supportDecision?.route || "normal";
  if (["consult", "urgent"].includes(route)) return "";
  const today = localToday();
  const nextPlan = services.storage.plans.loadAll().find((plan) => plan.scheduledDate >= today);
  if (!nextPlan) {
    return `<section class="home-compact-card home-next-plan-card" aria-labelledby="home-next-plan-title"><div class="home-next-plan-card__content"><p>次の予定</p><h2 id="home-next-plan-title">次の予定はまだありません</h2><p>必要なときだけ、次の走り方や休養予定を考えます。</p><ul class="home-next-plan-card__notes"><li>今日の記録を残してから使えます</li><li>予定はあとで変更できます</li></ul></div><a class="button button--secondary" href="#/plan">次の予定を作る</a></section>`;
  }
  const policy = planPolicyLabel(nextPlan);
  const details = nextPlanDetailItems(nextPlan);
  return `<section class="home-compact-card home-next-plan-card" aria-labelledby="home-next-plan-title"><div class="home-next-plan-card__content"><p>次の予定</p><h2 id="home-next-plan-title">${escapeHtml(formatLocalDate(nextPlan.scheduledDate))}</h2><p class="home-next-plan-card__policy">${escapeHtml(policy)}</p>${details.length ? `<ul class="home-next-plan-card__notes">${details.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}</div><a class="button button--secondary" href="#/plan?planId=${encodeURIComponent(nextPlan.id)}">予定を開く</a></section>`;
}


export function renderHomeScreen({ services }) {
  const latestExperience = services.workflows.records.loadLatestExperience();
  const draft = services.storage.draft.load();
  const supportRoute = latestExperience?.supportDecision?.route || "normal";
  const supportLinks = [
    { number: "01", screen: "history", title: "履歴", description: "保存した記録と比較可能な推移を見る" },
    { number: "02", screen: "notebook", title: "記録ノート", description: "自分で選んだ言葉を残す" },
    { number: "03", screen: "consultation", title: "相談", description: "相手に見せる内容を整理する" },
  ];
  if (["consult", "urgent"].includes(supportRoute)) {
    supportLinks.unshift(supportLinks.pop());
  }
  return `<section class="screen screen--home">
    ${renderPageHeading({
      eyebrow: "今日の入口",
      title: latestExperience ? "今日することから始める" : "まずは今日の記録から",
      description: latestExperience
        ? "最初に一つの行動を示し、記録・予定・振り返りは必要なときに開きます。"
        : "基本項目または休養を記録すると、結果と振り返りへ進めます。",
    })}
    ${renderPrimaryAction(latestExperience, draft)}
    ${latestExperience ? "" : renderBeginnerSteps()}
    ${latestExperience ? `<section class="content-section home-current-state" aria-labelledby="home-current-state-title"><div class="section-heading"><p>現在の記録</p><h2 id="home-current-state-title">最近の記録と次の予定</h2><p>今回の結果と、保存済みの予定を別々に確認します。</p></div><div class="home-two-column">${renderLatestRecord(latestExperience)}${renderNextPlan(services, latestExperience)}</div></section>` : ""}
    <section class="content-section home-support-links" aria-labelledby="home-support-links-title"><div class="section-heading"><p>補助機能</p><h2 id="home-support-links-title">必要なときに開く</h2><p>履歴は事実、記録ノートは自分の言葉、相談は共有準備に使います。</p></div>${renderFeatureLinks(supportLinks)}</section>
  </section>`;
}
