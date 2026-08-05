import { escapeHtml, renderEmptyState, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import {
  BODY_PART_DISPLAY_NAMES,
  SUBJECTIVE_STATUS_LABELS,
  formatActivitySummary,
  formatLocalDate,
  formatNumber,
} from "../ui/recordPresentation.js";
import { NOTEBOOK_MATERIALS } from "../core/notebook/notebookWorkflow.js";
import { NOTEBOOK_CONTINUITY_VERSION, filterNotebookPages, resolveNotebookDayType } from "../core/notebook/notebookContinuity.js";
import { OBSERVATION_LOOP_VERSION, OBSERVATION_PROMPT_STATES } from "../core/notebook/observationLoop.js";
import { renderRecordsWorkspaceNavigation } from "../ui/screenArchitecture.js";
import { bodyAreaLateralityLabel } from "../core/model/v27/bodyAreaTaxonomy.js";
import { runningGoalDefinition, RUNNING_GOAL_SUPPORT_VERSION } from "../core/personal/runningGoalSupport.js";

function queryValue(context, name, fallback = "") {
  return context?.parameters?.get(name) || fallback;
}

function formatMonth(monthKey = "") {
  const match = String(monthKey).match(/^(\d{4})-(\d{2})$/);
  return match ? `${Number(match[1])}年${Number(match[2])}月のノート` : "今月のノート";
}

function buildNotebookHash(parameters = {}) {
  const query = new URLSearchParams(Object.entries(parameters).filter(([, value]) => value));
  return `#/notebook${query.toString() ? `?${query}` : ""}`;
}

function checked(condition) {
  return condition ? " checked" : "";
}

function selected(condition) {
  return condition ? " selected" : "";
}

const ONE_THING_THEME_OPTIONS = Object.freeze([
  { value: "body-feel", label: "今日のからだ", icon: "body", hint: "今日のからだの感じを1つ残します。" },
  { value: "run-context", label: "今日のコース", icon: "route", hint: "今日のコースや走りやすさを1つ残します。" },
  { value: "tiny-win", label: "今日できたこと", icon: "star", hint: "今日できたことを1つ残します。採点はしません。" },
  { value: "learning", label: "今日の気づき", icon: "bulb", hint: "今日気づいたことを1つ残します。" },
  { value: "next-note", label: "次回見ること", icon: "bookmark", hint: "次回の走りで見ることを1つ残します。" },
  { value: "rest-note", label: "休む日のメモ", icon: "rest", hint: "休む日に大事にすることを1つ残します。" },
]);

const ONE_THING_THEME_VALUES = new Set(ONE_THING_THEME_OPTIONS.map((option) => option.value));

const NOTEBOOK_SOURCE_GUIDES = Object.freeze({
  result: {
    material: "今回の活動記録",
    theme: "run-context",
    description: "本人が選んだ活動記録を日ページに残しました。",
  },
  column: {
    material: "読んだ記事",
    theme: "learning",
    description: "読んだ記事を、本人が選んだ事実として日ページに残しました。",
  },
  history: {
    material: "見返した記録",
    theme: "next-note",
    description: "見返した記録を、本人が選んだ事実として日ページに残しました。",
  },
  plan: {
    material: "保存した予定",
    theme: "next-note",
    description: "保存した予定を、本人が選んだ事実として日ページに残しました。",
  },
});

function oneThingThemeLabel(value = "") {
  return ONE_THING_THEME_OPTIONS.find((option) => option.value === value)?.label || "今日の1つ";
}

function oneThingThemeOption(value = "") {
  return ONE_THING_THEME_OPTIONS.find((option) => option.value === value) || ONE_THING_THEME_OPTIONS[0];
}

function themeClassName(value = "") {
  return `notebook-theme--${oneThingThemeOption(value).value}`;
}

function renderThemeTag(value = "", prefix = "") {
  const option = oneThingThemeOption(value);
  return `<span class="notebook-theme-tag ${themeClassName(option.value)}"><span class="notebook-theme-tag__icon" aria-hidden="true">${renderThemeIcon(option.icon)}</span><span>${prefix ? `${escapeHtml(prefix)} ` : ""}${escapeHtml(option.label)}</span></span>`;
}

function shouldShowEditor(page = {}, routeContext) {
  if (queryValue(routeContext, "edit") === "1") return true;
  if (queryValue(routeContext, "status") === "saved") return false;
  if (queryValue(routeContext, "source")) return true;
  return !Boolean(String(page.oneThingNote || "").trim() || String(page.pageTitle || "").trim() || String(page.dailyComment || "").trim());
}

function selectedTheme(page = {}, fallbackTheme = "body-feel") {
  return page.oneThingTheme || (ONE_THING_THEME_VALUES.has(fallbackTheme) ? fallbackTheme : "body-feel");
}

function recommendedThemeFromRoute(routeContext) {
  const requestedTheme = queryValue(routeContext, "theme");
  if (ONE_THING_THEME_VALUES.has(requestedTheme)) return requestedTheme;
  const source = queryValue(routeContext, "source");
  return NOTEBOOK_SOURCE_GUIDES[source]?.theme || "";
}

function renderNotebookArrivalGuide(routeContext, page = {}) {
  const status = queryValue(routeContext, "status");
  const source = queryValue(routeContext, "source");
  const guide = NOTEBOOK_SOURCE_GUIDES[source];
  if (status === "saved") {
    const hasOneThingNote = Boolean(String(page.oneThingNote || "").trim());
    return `<aside class="notebook-arrival-guide notebook-arrival-guide--saved" aria-label="保存後の案内"><p>保存しました</p><h2>${hasOneThingNote ? "今日のノートを保存しました" : "ノートを保存しました"}</h2><p>${hasOneThingNote ? "今日の1つと本人が選んだ事実を、このページに残しました。" : "このページは、本人が選んだ内容だけを残します。"}</p></aside>`;
  }
  if (source === "goal") {
    const goal = runningGoalDefinition(queryValue(routeContext, "goal"));
    if (goal) return `<aside class="notebook-arrival-guide notebook-arrival-guide--goal" data-running-goal-support-version="${RUNNING_GOAL_SUPPORT_VERSION}" aria-label="記録目的から開いた案内"><p>設定した記録目的：${escapeHtml(goal.label)}</p><h2>${escapeHtml(goal.supportTitle)}</h2><p>${escapeHtml(goal.supportDescription)}</p><small>テーマ候補だけを表示します。本文は自動入力せず、達成・失敗・優先順位を判定しません。</small></aside>`;
  }
  return "";
}

function pageSequenceLabel(context, page) {
  const dates = [...new Set([...(context.pagesInMonth || []).map((pageView) => pageView.page.date), page.date].filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right)));
  const index = dates.indexOf(page.date);
  return `NOTE ${String(index >= 0 ? index + 1 : dates.length || 1).padStart(2, "0")}`;
}

function materialCountLabel(count) {
  return count ? `${count}件の記録` : "記録なし";
}

function renderThemeIcon(iconName = "") {
  const paths = {
    body: `<circle cx="12" cy="6" r="2.2"></circle><path d="M8 21c.6-4 1.2-7 1.8-10.2L8.2 8.6c-.7-.9 0-2.1 1.1-2.1h5.4c1.1 0 1.8 1.2 1.1 2.1l-1.6 2.2C14.8 14 15.4 17 16 21"></path><path d="M9.8 10.8h4.4"></path>`,
    route: `<path d="M5 18c3-4.8 11-1.2 14-6"></path><path d="M5 18c1.4-6 8-6.2 8-12"></path><circle cx="5" cy="18" r="1.4"></circle><circle cx="13" cy="6" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle>`,
    star: `<path d="m12 4 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4Z"></path>`,
    bulb: `<path d="M9 18h6"></path><path d="M10 21h4"></path><path d="M8.4 14.5A6 6 0 1 1 15.6 14.5c-.6.6-.9 1.3-.9 2.1v.4H9.3v-.4c0-.8-.3-1.5-.9-2.1Z"></path>`,
    bookmark: `<path d="M7 4h10v16l-5-3-5 3V4Z"></path><path d="M10 9h5"></path><path d="m13 7 2 2-2 2"></path>`,
    rest: `<path d="M17.5 15.5A7 7 0 0 1 8.5 6.5 7 7 0 1 0 17.5 15.5Z"></path><path d="M6 19h12"></path><path d="M8 17h8"></path>`,
  };
  return `<svg class="notebook-theme-chip__svg" viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">${paths[iconName] || paths.body}</svg>`;
}

function renderOneThingEditor(page, recommendedTheme = "") {
  const currentTheme = selectedTheme(page, recommendedTheme);
  const currentThemeLabel = oneThingThemeLabel(currentTheme);
  const recommendation = "";
  return `<section class="notebook-one-thing-editor" aria-labelledby="notebook-one-thing-editor-title">
    <div class="section-heading section-heading--compact"><p>日ノート</p><h3 id="notebook-one-thing-editor-title">今日残したいことを1行で書く</h3></div>
    <p class="notebook-one-thing-status">今日の1つ / ${escapeHtml(currentThemeLabel)}</p>
    ${recommendation}
    <fieldset class="notebook-one-thing-selector notebook-theme-selector"><legend>今日の記録ノートに残すことを1つ選びます</legend>
      ${ONE_THING_THEME_OPTIONS.map((option) => `<label class="notebook-theme-chip ${themeClassName(option.value)}"><input type="radio" name="oneThingTheme" value="${escapeHtml(option.value)}"${checked(currentTheme === option.value)}><span class="notebook-theme-chip__icon" aria-hidden="true">${renderThemeIcon(option.icon)}</span><span class="notebook-theme-chip__text"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.hint)}</small></span></label>`).join("")}
    </fieldset>
    <label class="field"><span>今日の記録ノートに残す1行</span><textarea name="oneThingNote" maxlength="160" rows="3" placeholder="例：今日は最後まで余裕を残せた。次も同じくらいで試す。">${escapeHtml(page.oneThingNote || "")}</textarea></label>
    <p class="source-boundary">記録ノートは文章を解析しません。本人が選んだ残す内容と1行を保存します。</p>
  </section>`;
}

function renderCoverTitleEditor(page, pageView) {
  return `<section class="notebook-page__comment notebook-page__title-editor" aria-labelledby="notebook-day-title">
    <p id="notebook-day-title">ページの見出し</p>
    <label class="field notebook-cover-title-field"><span>ページの見出し（任意）</span><textarea name="pageTitle" maxlength="100" rows="3" placeholder="${escapeHtml(pageView.displayTitle)}">${escapeHtml(page.pageTitle || "")}</textarea></label>
    <small>閲覧モードでは、この場所にページタイトルとして大きく表示されます。</small>
  </section>`;
}

function renderCoverCommentEditor(page) {
  return `<section class="notebook-page__comment notebook-page__comment--editor" aria-labelledby="notebook-cover-comment-title">
    <p id="notebook-cover-comment-title">余白メモ</p>
    <label class="field notebook-cover-comment-field"><span>余白メモ（任意）</span><textarea name="dailyComment" maxlength="500" rows="4" placeholder="今日の1つ以外を残す時だけ書きます。">${escapeHtml(page.dailyComment || "")}</textarea></label>
    <small>閲覧モードでは、この位置に余白メモとして表示されます。</small>
  </section>`;
}

function renderNotebookNavigation(workflowContext, view) {
  const { selectedDate, selectedMonth } = workflowContext;
  return `<nav class="notebook-view-navigation" aria-label="記録ノートの表示">
    <a class="button ${view === "day" ? "button--primary" : "button--secondary"}" href="${buildNotebookHash({ view: "day", date: selectedDate })}">日ノート</a>
    <a class="button ${view === "list" ? "button--primary" : "button--secondary"}" href="${buildNotebookHash({ view: "list", month: selectedMonth })}">ノート一覧</a>
  </nav>`;
}

function renderNotebookStartGuide() {
  return `<aside class="notebook-role-boundary" data-information-role="personal" data-notebook-continuity-version="${escapeHtml(NOTEBOOK_CONTINUITY_VERSION)}" aria-label="履歴との違い"><p>本人が選んで残す</p><h2>記録ノートと履歴は役割が異なります</h2><p>履歴には走行事実と数値結果が自動保存されます。ここには、自分で選んだテーマと1行だけを残します。</p><p>連続日数、達成バッジ、距離・速度の順位は作りません。休養日や活動記録がない日も同じように残せます。</p></aside>`;
}

function renderDayTypeBadge(pageView) {
  const dayType = pageView.dayType || resolveNotebookDayType(pageView.record);
  return `<span class="notebook-day-type notebook-day-type--${escapeHtml(dayType.id)}"><strong>${escapeHtml(dayType.label)}</strong><small>${escapeHtml(dayType.description)}</small></span>`;
}

function renderReviewReferenceEditor(context) {
  const page = context.pageView.page;
  const candidates = context.reviewCandidates || [];
  return `<section class="notebook-review-reference" aria-labelledby="notebook-review-reference-title"><div class="section-heading section-heading--compact"><p>任意の見返し</p><h3 id="notebook-review-reference-title">前のノートを1つだけ結び付ける</h3></div><label class="field"><span>見返すノート（任意）</span><select name="reviewReferenceDate"><option value="">結び付けない</option>${candidates.map((candidate) => `<option value="${escapeHtml(candidate.page.date)}"${selected(page.reviewReferenceDate === candidate.page.date)}>${escapeHtml(formatLocalDate(candidate.page.date))}／${escapeHtml(oneThingThemeLabel(candidate.page.oneThingTheme))}／${escapeHtml(String(candidate.page.oneThingNote || candidate.displayTitle).slice(0, 44))}</option>`).join("")}</select></label><p class="source-boundary">候補は過去に本人が書いたノートだけです。アプリは最適なノートを選ばず、変化や良し悪しも判定しません。</p></section>`;
}

function renderReviewReferenceReader(context) {
  const reference = context.reviewPageView;
  if (!reference) return "";
  const note = String(reference.page.oneThingNote || reference.page.dailyComment || reference.displayTitle || "").trim();
  return `<aside class="notebook-review-reference notebook-review-reference--reader" aria-label="本人が選んだ見返し元"><div><p>本人が選んだ見返し元</p><time datetime="${escapeHtml(reference.page.date)}">${escapeHtml(formatLocalDate(reference.page.date))}</time></div>${renderThemeTag(reference.page.oneThingTheme)}<blockquote>${escapeHtml(note)}</blockquote><a class="button button--text" href="${buildNotebookHash({ view: "day", date: reference.page.date })}">見返し元のノートを開く</a><small>現在のノートとの違いは自動評価しません。</small></aside>`;
}

function observationSourceView(context) {
  return context.observationSourcePageView || context.observationCandidate || null;
}

function renderObservationLoopEditor(context) {
  const source = observationSourceView(context);
  if (!source) return "";
  const page = context.pageView.page;
  const sourceNote = String(source.page.oneThingNote || "").trim();
  const linked = page.observationPromptState === OBSERVATION_PROMPT_STATES.linked;
  const notLinked = page.observationPromptState === OBSERVATION_PROMPT_STATES.notLinked;
  return `<section class="notebook-observation-loop" data-observation-loop-version="${escapeHtml(OBSERVATION_LOOP_VERSION)}" aria-labelledby="notebook-observation-loop-title">
    <input type="hidden" name="observationSourceDate" value="${escapeHtml(source.page.date)}">
    <div class="section-heading section-heading--compact"><p>前回から今回へ</p><h3 id="notebook-observation-loop-title">前回の「次回見ること」を任意で確認する</h3></div>
    <div class="notebook-observation-loop__source"><time datetime="${escapeHtml(source.page.date)}">${escapeHtml(formatLocalDate(source.page.date))}</time><blockquote>${escapeHtml(sourceNote)}</blockquote></div>
    <fieldset class="checkbox-grid notebook-observation-loop__choices"><legend>今回のノートとの結び付け方</legend>
      <label class="checkbox-row"><input type="radio" name="observationPromptState" value="${OBSERVATION_PROMPT_STATES.linked}"${checked(linked)}><span><strong>今回のノートに結び付ける</strong><small>今回、自分で見返した内容として残します。</small></span></label>
      <label class="checkbox-row"><input type="radio" name="observationPromptState" value="${OBSERVATION_PROMPT_STATES.notLinked}"${checked(notLinked)}><span><strong>今回は結び付けない</strong><small>未達成や失敗とは扱わず、この記録では表示を閉じます。</small></span></label>
    </fieldset>
    <label class="field"><span>今回気づいたこと（任意）</span><textarea name="observationReviewNote" maxlength="240" rows="3" placeholder="確認した内容を、自分の言葉で残す時だけ書きます。">${escapeHtml(page.observationReviewNote || "")}</textarea></label>
    <p class="source-boundary">RunLoadは確認できたか、改善したか、正しかったかを判定しません。この内容は数値結果・相談案内・予定候補に使いません。</p>
  </section>`;
}

function renderObservationLoopReader(context) {
  const page = context.pageView.page;
  const source = context.observationSourcePageView;
  if (!source || page.observationPromptState !== OBSERVATION_PROMPT_STATES.linked) return "";
  const sourceNote = String(source.page.oneThingNote || "").trim();
  const reviewNote = String(page.observationReviewNote || "").trim();
  return `<aside class="notebook-observation-loop notebook-observation-loop--reader" data-observation-loop-version="${escapeHtml(OBSERVATION_LOOP_VERSION)}" aria-label="前回から今回へ結び付けた観察"><div><p>前回残した「次回見ること」</p><time datetime="${escapeHtml(source.page.date)}">${escapeHtml(formatLocalDate(source.page.date))}</time></div><blockquote>${escapeHtml(sourceNote)}</blockquote>${reviewNote ? `<section><p>今回気づいたこと</p><div>${escapeHtml(reviewNote).replaceAll("\n", "<br>")}</div></section>` : ""}<a class="button button--text" href="${buildNotebookHash({ view: "day", date: source.page.date })}">前回のノートを開く</a><small>達成・失敗、改善・悪化、原因は自動評価しません。</small></aside>`;
}

function renderRecordMaterial(pageView) {
  if (!pageView.record) return "";
  if (pageView.record.activityType === "rest") {
    return `<article class="notebook-material-card notebook-scrap notebook-material-card--activity"><p class="notebook-material-card__label">活動記録</p><h3>休養を記録しました</h3><p>本人が選んだ、この日の休養記録です。</p></article>`;
  }
  const distance = Number(pageView.record.distanceKm || 0);
  const duration = Number(pageView.record.durationMinutes || 0);
  const steps = Number(pageView.record.steps || 0);
  const titleParts = [];
  if (distance > 0) titleParts.push(`${formatNumber(distance, 2)}km`);
  if (duration > 0) titleParts.push(`${formatNumber(duration, 0)}分`);
  const title = titleParts.length ? `${titleParts.join("・")}を記録しました` : "走行を記録しました";
  const details = [];
  if (steps > 0) details.push(`${formatNumber(steps, 0)}歩`);
  const courseName = String(pageView.record.course?.name || "").trim();
  if (courseName) details.push(`コース：${courseName}`);
  return `<article class="notebook-material-card notebook-scrap notebook-material-card--activity"><p class="notebook-material-card__label">活動記録</p><h3>${escapeHtml(title)}</h3>${details.length ? `<ul class="notebook-material-card__details">${details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}<p>本人が選んだ、この日の活動記録です。</p></article>`;
}

function renderSubjectiveMaterial(pageView) {
  if (!pageView.feedback) return "";
  const exactAreaNames = (pageView.enteredBodyAreas || [])
    .map((item) => `${item.label || "詳細部位"}（${bodyAreaLateralityLabel(item.laterality)}）`)
    .filter(Boolean);
  const bodyPartNames = pageView.enteredBodyParts.map((bodyPart) => BODY_PART_DISPLAY_NAMES[bodyPart] || bodyPart);
  const status = SUBJECTIVE_STATUS_LABELS[pageView.feedback.checkStatus] || "確認した内容";
  const details = [
    exactAreaNames.length ? `詳細部位：${exactAreaNames.join("、")}` : "",
    bodyPartNames.length ? `保存された身体記録：${bodyPartNames.join("、")}` : "",
  ].filter(Boolean);
  return `<article class="notebook-material-card notebook-scrap"><p class="notebook-material-card__label">身体記録</p><h3>${escapeHtml(status)}</h3><p>${details.length ? escapeHtml(details.join("／")) : "部位ごとの記録はありません。"}</p></article>`;
}

function renderPlanMaterial(pageView) {
  if (!pageView.relatedPlans.length) return "";
  return `<article class="notebook-material-card notebook-scrap"><p class="notebook-material-card__label">予定の振り返り</p><h3>${pageView.relatedPlans.length}件の予定を振り返りました</h3><ul>${pageView.relatedPlans.map((plan) => `<li>${escapeHtml(plan.title || formatLocalDate(plan.scheduledDate))}${plan.changeReasonNote ? ` — ${escapeHtml(plan.changeReasonNote)}` : ""}</li>`).join("")}</ul></article>`;
}

function renderConsultationMaterial(pageView) {
  const note = pageView.feedback?.consultationNote || "";
  if (!note) return "";
  return `<article class="notebook-material-card notebook-scrap"><p class="notebook-material-card__label">本人メモ</p><h3>伝えたい内容</h3><p>${escapeHtml(note).replaceAll("\n", "<br>")}</p></article>`;
}

function renderLearningMaterial(pageView) {
  if (!pageView.readArticles.length) return "";
  return `<article class="notebook-material-card notebook-scrap"><p class="notebook-material-card__label">読んだ内容</p><h3>${pageView.readArticles.length}件のコラムを読みました</h3><ul>${pageView.readArticles.map((article) => `<li>${escapeHtml(article.title)}</li>`).join("")}</ul></article>`;
}

function renderReflectionMaterial(pageView) {
  if (!pageView.reflectedRecords.length) return "";
  return `<article class="notebook-material-card notebook-scrap"><p class="notebook-material-card__label">見返した記録</p><h3>${pageView.reflectedRecords.length}件を振り返りました</h3><ul>${pageView.reflectedRecords.map((record) => `<li>${escapeHtml(formatLocalDate(record.date))} — ${escapeHtml(formatActivitySummary(record))}</li>`).join("")}</ul></article>`;
}

function renderDayPageMaterials(pageView, selected) {
  return [
    selected.has(NOTEBOOK_MATERIALS.recordSummary) ? renderRecordMaterial(pageView) : "",
    selected.has(NOTEBOOK_MATERIALS.subjectiveReflection) ? renderSubjectiveMaterial(pageView) : "",
    selected.has(NOTEBOOK_MATERIALS.planReflection) ? renderPlanMaterial(pageView) : "",
    selected.has(NOTEBOOK_MATERIALS.consultationNote) ? renderConsultationMaterial(pageView) : "",
    renderLearningMaterial(pageView),
    renderReflectionMaterial(pageView),
  ].filter(Boolean);
}

function selectedSeenMaterialSummaries(pageView) {
  const triggerKey = pageView.page.selectedSeenMaterialKey || "";
  const summaries = [];
  if ((pageView.page.selectedMaterials || []).includes(NOTEBOOK_MATERIALS.recordSummary) && pageView.record) {
    const key = `result:${pageView.record.id}`;
    summaries.push({ key, label: "記録を確認しました", description: formatActivitySummary(pageView.record), trigger: triggerKey === key });
  }
  pageView.readArticles.forEach((article) => {
    const key = `column:${article.id}`;
    summaries.push({ key, label: "コラムを読みました", description: article.title, trigger: triggerKey === key });
  });
  return summaries;
}

function renderSelectedSeenMaterial(pageView) {
  const summaries = selectedSeenMaterialSummaries(pageView);
  if (!summaries.length) return "";
  return `<section class="notebook-selected-seen" aria-label="本人が選んだ今日の事実"><p>今日の事実</p><ul>${summaries.map((summary) => `<li><strong>${escapeHtml(summary.label)}</strong><span>${escapeHtml(summary.description)}</span>${summary.trigger ? "<em>本人選択</em>" : ""}</li>`).join("")}</ul></section>`;
}

function seenMaterialIsSelected(page = {}, selected, item = {}) {
  if (item.type === "result-view") {
    if (!selected.has(NOTEBOOK_MATERIALS.recordSummary)) return false;
    return page.recordId === item.recordId || (item.sourceDate && item.sourceDate === page.date);
  }
  if (item.type === "column-read") return (page.readArticleIds || []).includes(item.articleId);
  return false;
}

function renderSeenMaterialOption(item, page, selected) {
  return `<label class="notebook-seen-material"><input class="notebook-seen-material__input" type="checkbox" name="seenMaterials" value="${escapeHtml(item.key)}"${checked(seenMaterialIsSelected(page, selected, item))}><span class="notebook-seen-material__mark" aria-hidden="true">✓</span><span class="notebook-seen-material__body"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.materialLabel)}：${escapeHtml(item.description)}</small><em>本人選択</em></span></label>`;
}

function renderSeenMaterialSelector(context, selected) {
  const seenMaterials = context.seenMaterials || [];
  if (!seenMaterials.length) {
    return `<section class="notebook-seen-materials notebook-seen-materials--empty" aria-label="今日の事実"><p>今日の事実</p><small>この日に本人が選べる事実がある時だけ表示します。</small></section>`;
  }
  const page = context.pageView.page;
  return `<section class="notebook-seen-materials" aria-labelledby="notebook-seen-materials-title"><input type="hidden" name="seenMaterialsAvailable" value="1"><div class="notebook-seen-materials__heading"><p id="notebook-seen-materials-title">今日の事実</p><small>この日に残す事実を本人が選びます。選ばない場合は、このページに事実カードを表示しません。</small></div><fieldset class="notebook-seen-materials__group"><legend>このページに残す事実</legend>${seenMaterials.map((item) => renderSeenMaterialOption(item, page, selected)).join("")}</fieldset></section>`;
}

function renderScrapbook(renderedMaterials) {
  return renderedMaterials.length
    ? `<section class="notebook-scrapbook" aria-labelledby="notebook-scrapbook-title"><div class="notebook-scrapbook__heading"><p>選んだ記録</p><h3 id="notebook-scrapbook-title">この日に残したこと</h3><small>本人が選んだ活動記録と事実だけをまとめています。</small><span>${escapeHtml(materialCountLabel(renderedMaterials.length))}</span></div><div class="notebook-material-grid notebook-material-grid--feature">${renderedMaterials.join("")}</div></section>`
    : `<p class="source-boundary">このページには、本人が選んだ記録がまだありません。記録ノートは結果や履歴を自動複製しません。</p>`;
}

function renderDayPageReader(context, routeContext, renderedMaterials) {
  const pageView = context.pageView;
  const page = pageView.page;
  const currentTheme = selectedTheme(page, recommendedThemeFromRoute(routeContext));
  const note = String(page.oneThingNote || "").trim();
  const dailyComment = String(page.dailyComment || "").trim();
  const editHref = buildNotebookHash({ view: "day", date: page.date, edit: "1" });
  const oneThingReader = note
    ? `<section class="notebook-one-thing notebook-one-thing--read ${themeClassName(currentTheme)}" aria-label="今日の記録ノートに残した1行"><div class="notebook-read-theme">${renderThemeTag(currentTheme, "残す内容")}</div><blockquote>${escapeHtml(note)}</blockquote></section>`
    : "";
  return `<article class="notebook-page notebook-page--magazine notebook-page--reader" aria-labelledby="notebook-day-title">
    <header class="notebook-page__header notebook-page__coverlet">
      <div class="notebook-page__kicker"><span>日ノート</span><span>${escapeHtml(pageSequenceLabel(context, page))}</span></div>
      <p class="notebook-page__date">${escapeHtml(formatLocalDate(page.date))}</p>
      ${renderDayTypeBadge(pageView)}
      <h2 id="notebook-day-title">${escapeHtml(pageView.displayTitle)}</h2>
      ${oneThingReader}
      ${dailyComment ? `<section class="notebook-page__comment"><p>余白メモ</p><div>${escapeHtml(dailyComment).replaceAll("\n", "<br>")}</div></section>` : ""}
    </header>
    ${renderObservationLoopReader(context)}
    ${renderReviewReferenceReader(context)}
    ${renderScrapbook(renderedMaterials)}
    <p class="source-boundary">記録ノートは文章を解析しません。このページは本人が選んだ内容だけを読み、連続記録や成績には変換しません。</p>
    <div class="notebook-page__actions"><a class="button button--secondary" href="${editHref}">このページを編集</a></div>
  </article>`;
}

function renderDayPageEditor(context, routeContext, renderedMaterials, selected) {
  const pageView = context.pageView;
  const page = pageView.page;
  const recommendedTheme = recommendedThemeFromRoute(routeContext) || context.seenMaterials?.[0]?.theme || "";
  const arrivalGuide = renderNotebookArrivalGuide(routeContext, page);
  return `<form id="notebook-day-form" class="notebook-day-layout notebook-day-layout--magazine notebook-day-layout--direct notebook-day-layout--edit" data-notebook-day-form>
    <input type="hidden" name="date" value="${escapeHtml(page.date)}">
    <input type="hidden" name="recordId" value="${escapeHtml(page.recordId || pageView.record?.id || "")}">
    ${arrivalGuide}
    <article class="notebook-page notebook-page--magazine notebook-page--editor" aria-labelledby="notebook-day-title">
      <header class="notebook-page__header notebook-page__coverlet">
        <div class="notebook-page__kicker"><span>日ノート</span><span>${escapeHtml(pageSequenceLabel(context, page))}</span></div>
        <p class="notebook-page__date">${escapeHtml(formatLocalDate(page.date))}</p>
        ${renderDayTypeBadge(pageView)}
        ${renderCoverTitleEditor(page, pageView)}
        ${renderOneThingEditor(page, recommendedTheme)}
        ${renderObservationLoopEditor(context)}
        ${renderReviewReferenceEditor(context)}
        ${renderCoverCommentEditor(page)}
      </header>
      ${renderScrapbook(renderedMaterials)}
      ${renderSeenMaterialSelector(context, selected)}
      <p class="source-boundary">記録ノートには、本人が選んだ1行・活動記録・事実・任意の見返し元・任意の観察のつながりだけを残します。本文は解析せず、連続日数や達成度を作りません。</p>
      <div class="form-messages" data-form-messages hidden tabindex="-1"></div>
      <div class="notebook-page__actions">${renderStatusLabel("採点なし", "neutral")}<button class="button button--primary" type="submit">このページを保存</button></div>
    </article>
  </form>`;
}

function renderDayPage(context, routeContext) {
  const pageView = context.pageView;
  const page = pageView.page;
  const selected = new Set(page.selectedMaterials || []);
  const renderedMaterials = renderDayPageMaterials(pageView, selected);
  const hasUnselectedSeenMaterials = (context.seenMaterials || []).some((item) => !seenMaterialIsSelected(page, selected, item));
  const shouldOfferNewSeenMaterials = hasUnselectedSeenMaterials && queryValue(routeContext, "status") !== "saved";
  const shouldOfferObservation = Boolean(context.observationCandidate) && !page.observationPromptState && queryValue(routeContext, "status") !== "saved";
  if (shouldShowEditor(page, routeContext) || shouldOfferNewSeenMaterials || shouldOfferObservation) return renderDayPageEditor(context, routeContext, renderedMaterials, selected);
  return `${renderNotebookArrivalGuide(routeContext, page)}${renderDayPageReader(context, routeContext, renderedMaterials)}`;
}


function renderNotebookList(context, routeContext) {
  const requestedMonth = queryValue(routeContext, "month") || context.selectedMonth;
  const requestedTheme = ONE_THING_THEME_VALUES.has(queryValue(routeContext, "theme")) ? queryValue(routeContext, "theme") : "";
  const pages = filterNotebookPages(context.state.pages || [], { monthKey: requestedMonth, theme: requestedTheme });
  const months = [...new Set((context.state.pages || []).map((page) => page.date.slice(0, 7)).filter(Boolean))].sort().reverse();
  const themeNavigation = `<nav class="notebook-theme-filter" aria-label="ノートのテーマ"><a class="${requestedTheme ? "" : "is-current"}" href="${buildNotebookHash({ view: "list", month: requestedMonth })}"${requestedTheme ? "" : ' aria-current="page"'}>すべて</a>${ONE_THING_THEME_OPTIONS.map((option) => `<a class="${requestedTheme === option.value ? "is-current" : ""}" href="${buildNotebookHash({ view: "list", month: requestedMonth, theme: option.value })}"${requestedTheme === option.value ? ' aria-current="page"' : ""}>${escapeHtml(option.label)}</a>`).join("")}</nav>`;
  const monthNavigation = months.length ? `<nav class="notebook-month-filter" aria-label="ノートの月">${months.map((month) => `<a class="${month === requestedMonth ? "is-current" : ""}" href="${buildNotebookHash({ view: "list", month, theme: requestedTheme })}"${month === requestedMonth ? ' aria-current="page"' : ""}>${escapeHtml(formatMonth(month))}</a>`).join("")}</nav>` : "";
  if (!pages.length) {
    return `${monthNavigation}${themeNavigation}${renderEmptyState({ title: requestedTheme ? "この条件のノートはまだありません" : "この月のノートはまだありません", description: "日ノートで1行を保存すると一覧に追加されます。テーマは本人が探すためだけに使います。", actionLabel: "日ノートを書く", actionScreen: `notebook?view=day&date=${context.selectedDate}` })}`;
  }
  const recordsById = new Map((context.records || []).map((record) => [record.id, record]));
  return `<section class="notebook-list-view" aria-labelledby="notebook-list-title"><div class="section-heading"><p>本人が残した言葉</p><h2 id="notebook-list-title">ノート一覧</h2></div>${monthNavigation}${themeNavigation}<div class="notebook-simple-list">${pages.map((page) => { const record = recordsById.get(page.recordId) || null; const dayType = resolveNotebookDayType(record); return `<article class="notebook-simple-item">${renderThemeTag(page.oneThingTheme)}<span class="notebook-list-day-type">${escapeHtml(dayType.label)}</span><time datetime="${escapeHtml(page.date)}">${escapeHtml(formatLocalDate(page.date))}</time><h3>${escapeHtml(page.pageTitle || page.oneThingNote || "記録ノート")}</h3><p>${escapeHtml(page.oneThingNote || page.dailyComment || "本人が選んだ内容を保存したページです。")}</p><div class="screen-actions"><a class="button button--secondary" href="${buildNotebookHash({ view: "day", date: page.date })}">ノートを開く</a>${page.recordId ? `<a class="button button--text" href="#/result?recordId=${encodeURIComponent(page.recordId)}">元の結果を見る</a>` : ""}</div></article>`; }).join("")}</div><p class="source-boundary">一覧とテーマ絞り込みは本人の言葉を探すためのものです。件数、連続日数、距離・速度、数値結果を成績や順位に変換しません。</p></section>`;
}

export function renderNotebookScreen({ services, context }) {
  const requestedView = queryValue(context, "view");
  const view = requestedView === "list" || requestedView === "issue" || requestedView === "shelf" ? "list" : "day";
  const workflowContext = services.workflows.notebook.loadContext({
    date: queryValue(context, "date"),
    monthKey: queryValue(context, "month"),
  });
  return `<section class="screen screen--notebook screen--notebook-simple screen--notebook-magazine screen--notebook-contrast">
    ${renderPageHeading({ eyebrow: "記録ノート", title: "自分の言葉を残す", description: "日ノートと一覧だけに整理し、履歴の事実・数値結果とは分けて保存します。" })}
    ${renderRecordsWorkspaceNavigation({ active: "notebook", date: workflowContext.selectedDate, month: workflowContext.selectedMonth })}
    ${renderNotebookNavigation(workflowContext, view)}
    ${renderNotebookStartGuide()}
    ${view === "list" ? renderNotebookList(workflowContext, context) : renderDayPage(workflowContext, context)}
  </section>`;
}
