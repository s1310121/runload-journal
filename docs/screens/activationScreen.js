import { escapeHtml, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import { formatActivitySummary, formatLocalDate } from "../ui/recordPresentation.js";
import { buildRunningGoalSupport, RUNNING_GOAL_SUPPORT_VERSION } from "../core/personal/runningGoalSupport.js";

function href(screen, values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/${screen}${query.size ? `?${query.toString()}` : ""}`;
}


function renderGoalSupport({ services, record, route }) {
  if (["consult", "urgent"].includes(route)) return "";
  const support = buildRunningGoalSupport(services.storage.profile.load());
  if (!support.hasSelection) return "";
  const recordId = record?.id || "";
  const date = record?.date || "";
  const items = support.items.map((item) => {
    const actionValues = item.action.screen === "notebook"
      ? { view: "day", date, source: "goal", goal: item.value, theme: item.action.theme, recordId }
      : { sourceRecordId: recordId, goal: item.value };
    return `<article class="goal-support-card"><p>${escapeHtml(item.label)}</p><h3>${escapeHtml(item.supportTitle)}</h3><p>${escapeHtml(item.supportDescription)}</p><div class="goal-support-card__links"><a class="button button--secondary" href="${escapeHtml(href(item.action.screen, actionValues))}">${escapeHtml(item.action.label)}</a><a class="button button--text" href="${escapeHtml(href("column", { articleId: item.articleId, origin: "goal", goal: item.value, recordId }))}">関連する読みもの</a></div></article>`;
  }).join("");
  return `<section class="goal-support" data-running-goal-support-version="${RUNNING_GOAL_SUPPORT_VERSION}" aria-labelledby="goal-support-title"><div class="section-heading"><p>設定した目的から選べる入口</p><h2 id="goal-support-title">目的に合わせて、見返し方を選ぶ</h2><p>設定で本人が選んだ目的を、説明・ノート・予定への任意の入口にだけ使います。数値、優先順位、達成度は変わりません。</p></div><div class="goal-support-grid">${items}</div><p class="source-boundary">目的を未設定でも、下の「理解する・共有する・次を考える」は同じように利用できます。複数の目的は表示順による優先付けをしません。</p></section>`;
}

function actionCard({ number, title, description, links }) {
  return `<article class="activation-card"><span class="activation-card__number">${escapeHtml(number)}</span><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><div class="activation-card__links">${links.map((link, index) => `<a class="button ${index === 0 ? "button--primary" : "button--secondary"}" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("")}</div></article>`;
}

export function renderActivationScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const record = experience?.record || null;
  const recordId = record?.id || "";
  const date = record?.date || "";
  const recordContext = record
    ? `<section class="activation-source" aria-label="活用する記録"><div>${renderStatusLabel("対象記録", "info")}<h2>${escapeHtml(formatLocalDate(date))}</h2><p>${escapeHtml(formatActivitySummary(record))}</p></div><a class="button button--secondary" href="${escapeHtml(href("result", { recordId }))}">結果へ戻る</a></section>`
    : `<aside class="screen-role-boundary"><p><strong>まだ対象記録がありません。</strong></p><p>コラムはそのまま読めます。相談用の整理や今回のノートは、記録を保存すると対象日を引き継いで開けます。</p></aside>`;

  const publicHelpPriority = experience?.supportDecision?.route === "urgent"
    ? `<section class="next-action next-action--urgent" aria-labelledby="activation-public-help-title"><div>${renderStatusLabel("公的な相談先を確認", "attention")}<h2 id="activation-public-help-title">ほかの活用機能より先に、公的な案内を確認する</h2><p>RunLoadは緊急性を判定しません。本人が選択した項目と119・#7119などの役割を分けて確認します。</p></div><a class="button button--primary" href="${escapeHtml(href("support-guidance", { recordId }))}">公的な相談先を確認する</a></section>`
    : "";

  const route = experience?.supportDecision?.route || "normal";
  const goalSupport = renderGoalSupport({ services, record, route });

  const cards = [
    actionCard({
      number: "01",
      title: "理解する",
      description: "今回の記録と関連する一般的な知見を、参考資料つきの読みもので振り返ります。",
      links: [{ href: href("column", { recordId, origin: record ? "activation" : "" }), label: "コラムを開く" }],
    }),
    actionCard({
      number: "02",
      title: "共有する",
      description: "走行事実、本人入力、数値表示を分けたまま、相談相手へ見せる内容を整理します。",
      links: record
        ? [{ href: href("consultation", { recordId }), label: "相談用に整理する" }]
        : [{ href: href("consultation", { mode: "free", page: "quick" }), label: "自分の言葉でメモする" }],
    }),
    actionCard({
      number: "03",
      title: "次を考える",
      description: "次回に確認したいことを本人の言葉で残すか、今回の事実を出発点に予定を作ります。アプリが練習の正解を決める機能ではありません。",
      links: [
        { href: href("notebook", { view: "day", date, source: record ? "result" : "", recordId, theme: "next-note" }), label: "次回見ることを残す" },
        { href: href("plan", { sourceRecordId: recordId }), label: "予定を作る" },
      ],
    }),
  ];

  return `<section class="screen screen--activation" data-screen-architecture="runload-screen-architecture-v2.5r1">
    ${renderPageHeading({ eyebrow: "結果の活用", title: "理解・共有・予定", description: "結果を見た後に、何を理解し、どう共有し、次回に何を残すかを選びます。" })}
    ${recordContext}
    ${publicHelpPriority}
    ${goalSupport}
    <section class="activation-intro" aria-labelledby="activation-intro-title"><p>次の行動を選ぶ</p><h2 id="activation-intro-title">結果を見て終わらせず、自分で使い方を選ぶ</h2><p>距離や速度を増やすことを促す画面ではありません。理解、共有、次回の観察という3つの使い方を同じ重さで示します。</p></section>
    <div class="activation-grid">${cards.join("")}</div>
  </section>`;
}
