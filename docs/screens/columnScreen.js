import { escapeHtml, renderEmptyState, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import {
  V27_EMPHASIS_REGION_IDS,
  V27_REGIONS,
} from "../core/model/v27/v27Constants.js";
import { BODY_AREA_BY_ID } from "../core/model/v27/bodyAreaTaxonomy.js";
import { reportedRpeValue } from "../core/safety/rpeProvenance.js";
import { buildRunningGoalSupport, RUNNING_GOAL_SUPPORT_VERSION } from "../core/personal/runningGoalSupport.js";
import {
  formatActivitySummary,
  formatLocalDate,
} from "../ui/recordPresentation.js";

const REGION_BY_ID = new Map(V27_REGIONS.map((region) => [region.id, region]));

function articleHref(articleId, origin = "") {
  const query = new URLSearchParams({ articleId, ...(origin ? { origin } : {}) }).toString();
  return `#/column?${query}`;
}

function renderArticleCard(article, { compact = false } = {}) {
  return `<article class="article-card${compact ? " article-card--compact" : ""}"><p>${escapeHtml(article.category)}</p><h3><a href="${escapeHtml(articleHref(article.id))}">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.lead)}</p><div class="article-card__tags">${(article.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div><a class="text-link" href="${escapeHtml(articleHref(article.id))}">記事を読む</a></article>`;
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function dateToTime(dateText = "") {
  const match = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

function daysBetweenDates(leftDate, rightDate) {
  const left = dateToTime(leftDate);
  const right = dateToTime(rightDate);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.round((left - right) / 86400000);
}

function bodyAreaObservations(feedback = {}) {
  return Array.isArray(feedback.bodyAreaObservations)
    ? feedback.bodyAreaObservations.filter((item) => BODY_AREA_BY_ID[item?.areaId])
    : [];
}

function buildRecordHistory(experience, allExperiences = []) {
  if (!experience) return Object.freeze({ ordered: [], index: -1, previous: null, previousRun: null, previousRuns: [] });
  const ordered = [...allExperiences]
    .filter(Boolean)
    .sort((left, right) => left.record.date.localeCompare(right.record.date) || left.record.id.localeCompare(right.record.id));
  const index = ordered.findIndex((item) => item.record.id === experience.record.id);
  const before = index >= 0 ? ordered.slice(0, index) : [];
  const previous = before.at(-1) || null;
  const previousRuns = before.filter((item) => item.record.activityType === "run");
  return Object.freeze({
    ordered,
    index,
    previous,
    previousRun: previousRuns.at(-1) || null,
    previousRuns,
  });
}

function repeatedBodyAreas(experience, allExperiences = []) {
  const current = bodyAreaObservations(experience?.feedback || {});
  if (!current.length) return [];
  const history = buildRecordHistory(experience, allExperiences);
  const recent = history.previousRuns.slice(-4);
  return current.filter((observation) => recent.some((item) => (
    daysBetweenDates(experience.record.date, item.record.date) <= 28
    && bodyAreaObservations(item.feedback || {})
      .some((prior) => prior.areaId === observation.areaId)
  )));
}

function targetRegionId(context, experience) {
  const requested = context?.parameters?.get?.("regionId") || "";
  if (REGION_BY_ID.has(requested)) return requested;
  const observation = bodyAreaObservations(experience?.feedback || {})
    .find((item) => BODY_AREA_BY_ID[item.areaId]?.modelRegionId);
  return BODY_AREA_BY_ID[observation?.areaId]?.modelRegionId || "";
}

function buildColumnRecommendation(services, experience, allExperiences = [], context = {}) {
  const all = services.column.list();
  const find = (id) => services.column.findById(id) || all[0] || null;
  const recommendation = (id, reason) => Object.freeze({ article: find(id), reason });
  if (!experience) {
    return recommendation("model-total-v27", "まだ記録がないため、走行全体の比較用推定値の基本記事を表示しています。");
  }

  const { record, feedback = {}, supportDecision = {} } = experience;
  const route = supportDecision?.route || "normal";
  const course = record.course || {};
  const environment = record.environmentContext || {};
  const recovery = record.recoveryContext || {};
  const exertion = reportedRpeValue(record);
  const up = numberValue(course.upPercent, 0);
  const down = numberValue(course.downPercent, 0);
  const observations = bodyAreaObservations(feedback);
  const repeatedAreas = repeatedBodyAreas(experience, allExperiences);
  const selectedRegionId = targetRegionId(context, experience);
  const runCount = allExperiences.filter(
    (item) => item?.record?.activityType === "run" && item?.v27ResultRecord?.state === "RUN",
  ).length;
  const hasTemperature = environment.temperatureC !== null
    && environment.temperatureC !== undefined
    && String(environment.temperatureC).trim() !== "";
  const hasNutritionHydrationContext = Boolean(
    String(recovery.nutritionHydrationSummary || "").trim(),
  );
  const hasSleepContext = Boolean(String(recovery.sleepSummary || "").trim());
  const hasRecordedContext = hasTemperature || [
    environment.weather,
    environment.windSummary,
    environment.environmentNote,
    recovery.nutritionHydrationSummary,
    recovery.lifestyleNote,
  ].some((value) => String(value || "").trim());

  if (route === "consult" || route === "urgent") {
    return recommendation("consultation-prep-v27", "本人が入力した内容を共有前に整理する記事です。");
  }
  if (record.activityType === "rest") {
    return recommendation("history-compatible", "休養日や未記録日を数値の0と考えない、履歴の読み方に関連する記事です。");
  }
  if (repeatedAreas.length) {
    const labels = repeatedAreas.slice(0, 2).map((item) => item.label).join("、");
    return recommendation("consultation-prep-v27", `${labels}の本人入力が複数記録にあるため、事実を整理する記事です。`);
  }
  if (selectedRegionId && V27_EMPHASIS_REGION_IDS.includes(selectedRegionId)) {
    return recommendation("slope-endpoints", `${REGION_BY_ID.get(selectedRegionId)?.label || selectedRegionId}の値が表す内容と読み方に関連する記事です。`);
  }
  if (observations.length) {
    return recommendation("regional-six-eight-28", `${observations.slice(0, 2).map((item) => item.label).join("、")}の本人入力と12部位の比較値を分けて読む記事です。`);
  }
  if (hasNutritionHydrationContext) {
    return recommendation("hydration-not-more-is-better", "食事・水分の本人メモに関連する一般知識です。量や必要性を判断するものではありません。");
  }
  if (hasSleepContext) {
    return recommendation("sleep-not-hours-only", "睡眠の本人メモに関連する一般知識です。睡眠時間や回復状態を判定するものではありません。");
  }
  if (hasTemperature) {
    return recommendation("heat-not-temperature-only", "気温の本人記録に関連する一般知識です。安全・危険や運動可否を判断するものではありません。");
  }
  if (hasRecordedContext) {
    return recommendation("context-not-single-cause", "天候や生活背景などの本人メモを、一つの原因へ決めずに見返す記事です。");
  }
  if (course.gradeKnowledge === "KNOWN_PROFILE" && (up > 0 || down > 0)) {
    return recommendation("grade-and-coverage", "上り・下りで身体の使われ方が変わる理由を説明する記事です。");
  }
  if (
    ["UNKNOWN", "EXPLICIT_UNEVEN", "KNOWN_OTHER"].includes(
      String(course.modelSurfaceClass || "UNKNOWN"),
    )
  ) {
    return recommendation("surface-missingness", "路面や足のつき方で、足元の使われ方が変わる理由に関連する記事です。");
  }
  if (exertion != null && exertion >= 7) {
    return recommendation("rpe-separated", "走り全体のきつさ（RPE）と数値結果を分けて見返す記事です。");
  }
  if (exertion != null) {
    return recommendation("talk-test-as-subjective-cue", "走り全体のきつさ（RPE）の記録があるため、速度とは別に会話のしやすさを振り返る一般知識です。");
  }
  if (
    feedback?.checkStatus
    && !["none_reported", "not_asked", "deferred"].includes(feedback.checkStatus)
  ) {
    return recommendation("regional-six-eight-28", "本人入力と数値表示の役割を分けて読む記事です。");
  }
  if (runCount >= 3) {
    return recommendation("personal-reference", "同じ意味で比べられる記録が蓄積しているため、自分の過去記録との比べ方を説明する記事です。");
  }
  return recommendation("regional-three-views", "結果画面の3つの比較方法を確認する記事です。");
}

function resolveColumnTargetExperience(services, context) {
  const allExperiences = services.workflows.records.loadAllExperiences()
    .filter(Boolean)
    .sort((left, right) => left.record.date.localeCompare(right.record.date) || left.record.id.localeCompare(right.record.id));
  const requestedRecordId = context.parameters.get("recordId") || context.parameters.get("anchorRecordId") || "";
  const requestedDate = context.parameters.get("date") || context.parameters.get("anchorDate") || "";
  const byRecordId = requestedRecordId ? services.workflows.records.loadExperience(requestedRecordId) : null;
  const byDate = requestedDate
    ? [...allExperiences].reverse().find((item) => item.record.date === requestedDate)
    : null;
  const latest = services.workflows.records.loadLatestExperience();
  const experience = byRecordId || byDate || latest;
  const targetKind = byRecordId ? "selected-record" : byDate ? "selected-date" : latest ? "latest" : "none";
  return Object.freeze({ experience, allExperiences, targetKind });
}

function renderFeaturedArticle(recommendation, experience, targetKind = "latest") {
  const article = recommendation?.article || null;
  if (!article) return "";
  const targetLabel = targetKind === "latest" ? "最新記録" : targetKind === "none" ? "基礎記事" : "対象記録";
  return `<section class="column-front-page" aria-labelledby="column-feature-title"><div class="column-front-page__body"><div><p>おすすめの読みもの</p><h2 id="column-feature-title">${escapeHtml(article.title)}</h2><p>${escapeHtml(article.lead)}</p><a class="button button--primary" href="${escapeHtml(articleHref(article.id, "featured"))}">この記事を読む</a></div><details class="column-recommendation-reason"><summary>この内容を選んだ理由</summary><p>${escapeHtml(recommendation.reason || "記録と読みものの対応から選びました。")}</p>${experience ? `<p><strong>${escapeHtml(targetLabel)}：</strong>${escapeHtml(formatActivitySummary(experience.record))}</p>` : ""}<p>記事は記録を見返すための一般知識です。</p></details></div></section>`;
}


function renderGoalRelatedArticles(services, featuredId = "") {
  const support = buildRunningGoalSupport(services.storage.profile.load());
  if (!support.hasSelection) return "";
  const articleRows = support.items
    .map((goal) => ({ goal, article: services.column.findById(goal.articleId) }))
    .filter(({ article }) => article && article.id !== featuredId);
  const unique = [];
  const seen = new Set();
  articleRows.forEach((row) => {
    if (seen.has(row.article.id)) return;
    seen.add(row.article.id);
    unique.push(row);
  });
  if (!unique.length) return "";
  return `<section class="column-goal-context" data-running-goal-support-version="${RUNNING_GOAL_SUPPORT_VERSION}" aria-labelledby="column-goal-context-title"><div class="section-heading"><p>設定した記録目的</p><h2 id="column-goal-context-title">目的から選べる読みもの</h2><p>本人が設定で選んだ目的に関連する記事を並べます。記事の表示は推奨順位や効果判定ではありません。</p></div><div class="article-grid">${unique.map(({ goal, article }) => `<article class="article-card article-card--goal"><p>${escapeHtml(goal.label)}</p><h3><a href="${escapeHtml(articleHref(article.id, "goal"))}">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(goal.articleReason)}</p><a class="text-link" href="${escapeHtml(articleHref(article.id, "goal"))}">記事を読む</a></article>`).join("")}</div></section>`;
}

function renderArticleSections(articles, categories, featuredId) {
  return categories.map((category) => {
    const categoryArticles = articles.filter((article) => article.category === category && article.id !== featuredId);
    if (!categoryArticles.length) return "";
    const descriptions = {
      "結果の読み方": "12部位の比較値、走行全体の比較用推定値、本人入力の違いを説明します。",
      "入力と振り返り": "走り全体のきつさ（RPE）、過去比較、履歴、予定値を分けて見返します。",
      "走りとのつき合い方": "練習量、目標、生活や環境の背景を、一つの正解や評価に変えずに考えます。",
      "走る前・走っている間": "睡眠、暑さ、会話のしやすさを、一つの数値や基準だけで決めずに考えます。",
      "走った後の整え方": "クールダウン、水分、食事を、一つの方法や量だけで決めずに考えます。",
      "部位・コース": "坂・路面・値が表す内容と限界を確認します。",
      "相談・共有": "本人入力と数値表示を区別し、共有資料の範囲を整えます。",
    };
    return `<section class="column-section" aria-labelledby="column-${escapeHtml(category)}"><div class="section-heading"><p>カテゴリ</p><h2 id="column-${escapeHtml(category)}">${escapeHtml(category)}</h2><p>${escapeHtml(descriptions[category] || "関連する記事です。")}</p></div><div class="article-grid">${categoryArticles.map((article) => renderArticleCard(article)).join("")}</div></section>`;
  }).join("");
}

function sourceKey(source = {}) {
  return source.sourceId || [source.organization || "", source.title || "", source.url || ""].join("|");
}

function isUserFacingSource(source = {}) {
  return String(source.sourceType || "") !== "designSpecification";
}

function sourceBeginnerLabel(source = {}) {
  const type = String(source.sourceType || "");
  if (type === "primaryStudy") return "原著研究";
  if (type === "publicGuidance") return "公的な運動資料";
  if (type === "publicHealthInfo") return "公的な相談目安";
  if (type === "medicalInstitution") return "医療機関の一般情報";
  if (["systematicReview", "scopingReview", "reviewPaper", "clinicalReview"].includes(type)) return "専門資料をもとにした資料";
  return "参考資料";
}

function sourceBeginnerNote(source = {}) {
  const type = String(source.sourceType || "");
  if (type === "primaryStudy") return "限定された対象者・条件・指標の原著研究です。この記事では、記載された条件と範囲に限って紹介します。";
  if (type === "publicGuidance") return "運動の強さ、暑さ、活動量などを見返すために参照した資料です。";
  if (type === "publicHealthInfo" || type === "medicalInstitution") return "相談につなげる目安や一般的な注意点を確認するために参照した資料です。";
  if (["systematicReview", "scopingReview", "reviewPaper", "clinicalReview"].includes(type)) return "記事の背景を整理するために参照した資料です。個別の診断や効果判定には使いません。";
  return "記事を書くときに参考にした資料です。";
}

function renderSourceIndex(allArticles) {
  const rows = new Map();
  allArticles.forEach((article) => (article.sources || [])
    .filter(isUserFacingSource)
    .forEach((source) => {
      const key = sourceKey(source);
      const existing = rows.get(key) || { source, articleTitles: [] };
      if (!existing.articleTitles.includes(article.title)) existing.articleTitles.push(article.title);
      rows.set(key, existing);
    }));
  const groups = [...rows.values()].sort((left, right) => (
    String(left.source.sourceTypeLabel || "").localeCompare(String(right.source.sourceTypeLabel || ""), "ja")
    || String(left.source.organization || "").localeCompare(String(right.source.organization || ""), "ja")
  ));
  if (!groups.length) return "";
  return `<details class="column-source-index"><summary><span><strong>記事の参考資料</strong><small>読みものの背景として参照した公開資料です。必要なときだけ確認できます。</small></span></summary><div class="column-source-index__body">${groups.map(({ source, articleTitles }) => `<article><div><p>${renderStatusLabel(sourceBeginnerLabel(source), "neutral")}</p><h3>${escapeHtml(source.organization || "参考資料")}</h3><p>${escapeHtml(source.title || "")}</p><small>関連する読みもの：${escapeHtml(articleTitles.slice(0, 4).join("／"))}${articleTitles.length > 4 ? " ほか" : ""}</small></div>${source.url ? `<a class="text-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">資料ページを開く<span class="visually-hidden external-link-note">（新しいタブで開きます）</span></a>` : ""}</article>`).join("")}</div></details>`;
}

function renderArticleDetail(article, related, services, origin = "", recordId = "", regionId = "") {
  const cautionLine = article.caution
    ? `<p><strong>この読み物の補足：</strong>${escapeHtml(article.caution)}</p>`
    : "";
  const publicSources = (article.sources || []).filter(isUserFacingSource);
  return `<article class="column-article">
    <header class="column-article__header"><p>${escapeHtml(article.category)}</p><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.lead)}</p><div class="article-meta"><span>記事更新 ${escapeHtml(article.lastReviewed || "未記載")}</span><span>${(article.tags || []).map(escapeHtml).join("・")}</span></div></header>
    ${origin === "featured" ? '<p class="column-article-origin">おすすめの読みものから開いた記事です。</p>' : ""}${origin === "goal" ? '<p class="column-article-origin">設定した記録目的の入口から開いた記事です。目的は数値や優先順位には使いません。</p>' : ""}
    ${origin === "result-condition" ? `<aside class="column-article-origin column-article-origin--result"><p>この読みものは、選択した部位の「今回の記録と関連する知見」から開いています。</p>${recordId && regionId ? `<a class="text-link" href="#/body-part-detail?recordId=${encodeURIComponent(recordId)}&regionId=${encodeURIComponent(regionId)}">元の部位結果へ戻る</a>` : ""}</aside>` : ""}
    <aside class="editorial-boundary"><p>${renderStatusLabel("一般知識", "neutral")}</p><p>この記事は、自分の記録を見返すための一般的な学習資料です。個別の診断・処方・運動可否判断には使用しません。</p>${cautionLine}</aside>
    <section class="article-summary"><h2>この記事の要点</h2><p>${escapeHtml(article.summary)}</p></section>
    <div class="article-body">${(article.body || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
    ${(article.practicePoints || []).length ? `<section><h2>記録へ生かすヒント</h2><ul>${article.practicePoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>` : ""}
    ${publicSources.length ? `<section class="article-sources"><h2>参考資料</h2><p class="source-boundary">この記事の背景として参照した公開資料です。個別の身体状態を決めるものではありません。</p>${publicSources.map((source) => `<article><p>${renderStatusLabel(sourceBeginnerLabel(source), "neutral")}</p><h3>${escapeHtml(source.title)}</h3><p>${escapeHtml(source.organization)}・${escapeHtml(source.year)}</p><p>${escapeHtml(sourceBeginnerNote(source))}</p>${source.url ? `<a class="text-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">資料ページを開く<span class="visually-hidden external-link-note">（新しいタブで開きます）</span></a>` : ""}</article>`).join("")}</section>` : ""}
    ${related ? `<aside class="related-article"><p>関連する読みもの</p><h2>${escapeHtml(related.title)}</h2><p>${escapeHtml(related.lead)}</p><a class="button button--secondary" href="${escapeHtml(articleHref(related.id))}">関連記事を読む</a></aside>` : ""}
    <a class="button button--text" href="#/column">記事一覧へ戻る</a>
  </article>`;
}

export function renderColumnScreen({ services, context }) {
  const articleId = context.parameters.get("articleId") || "";
  if (articleId) {
    const article = services.column.findById(articleId);
    if (!article) return `<section class="screen">${renderPageHeading({ eyebrow: "読みもの", title: "記事が見つかりません", description: "記事一覧から読みたい内容を選んでください。" })}${renderEmptyState({ title: "指定された記事はありません", description: "指定した記事を確認できません。", actionLabel: "記事一覧へ", actionScreen: "column" })}</section>`;
    return `<section class="screen screen--column-detail">${renderArticleDetail(article, services.column.relatedArticle(article), services, context.parameters.get("origin") || "", context.parameters.get("recordId") || "", context.parameters.get("regionId") || "")}</section>`;
  }

  const query = context.parameters.get("query") || "";
  const category = context.parameters.get("category") || "all";
  const allArticles = services.column.list();
  const articles = services.column.list({ query, category });
  const target = resolveColumnTargetExperience(services, context);
  const recommendation = buildColumnRecommendation(services, target.experience, target.allExperiences, context);
  const featured = recommendation.article;
  const filterActive = Boolean(query) || category !== "all";
  const preservedRecordId = target.experience?.record?.id || "";
  const preservedRegionId = REGION_BY_ID.has(context.parameters.get("regionId") || "")
    ? context.parameters.get("regionId")
    : "";
  return `<section class="screen screen--column">
    ${renderPageHeading({ eyebrow: "読みもの", title: "記録を理解するための読みもの", description: "必要な記事だけを選び、一般知識として確認します。" })}
    ${renderFeaturedArticle(recommendation, target.experience, target.targetKind)}
    ${filterActive ? "" : renderGoalRelatedArticles(services, featured?.id || "")}
    <section class="column-finder" aria-labelledby="column-finder-title"><div class="section-heading"><p>記事を探す</p><h2 id="column-finder-title">読みたい内容を探す</h2><p>カテゴリまたはキーワードを使い、必要な記事だけを絞り込みます。</p></div><form id="column-search-form" class="filter-panel" role="search">${preservedRecordId ? `<input type="hidden" name="recordId" value="${escapeHtml(preservedRecordId)}">` : ""}${preservedRegionId ? `<input type="hidden" name="regionId" value="${escapeHtml(preservedRegionId)}">` : ""}<label class="field"><span>記事を検索</span><input name="query" type="search" value="${escapeHtml(query)}" placeholder="例：睡眠、暑さ、坂道"></label><label class="field"><span>カテゴリ</span><select name="category"><option value="all">すべて</option>${services.column.categories.map((item) => `<option value="${escapeHtml(item)}"${item === category ? " selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label><button class="button button--primary" type="submit">記事を探す</button></form><p class="article-count">全${allArticles.length}件の記事・表示${articles.length}件</p>${filterActive ? `<a class="text-link" href="#/column${preservedRecordId ? `?recordId=${encodeURIComponent(preservedRecordId)}${preservedRegionId ? `&regionId=${encodeURIComponent(preservedRegionId)}` : ""}` : ""}">検索条件をクリア</a>` : ""}</section>
    ${articles.length ? renderArticleSections(articles, services.column.categories, featured?.id || "") : renderEmptyState({ title: "条件に合う記事がありません", description: "検索語やカテゴリを変更してください。", actionLabel: "記事一覧へ戻る", actionScreen: "column" })}
    ${renderSourceIndex(allArticles)}
  </section>`;
}
