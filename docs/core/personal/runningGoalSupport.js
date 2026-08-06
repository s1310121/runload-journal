export const RUNNING_GOAL_SUPPORT_VERSION = "runload-running-goal-support-v2";

export const RUNNING_GOAL_OPTIONS = Object.freeze([
  Object.freeze({
    value: "health",
    label: "健康づくり",
    supportTitle: "からだの感じを言葉で残す",
    supportDescription: "数値表示と本人の感じ方を分けたまま、今日のからだを1つ記録します。",
    articleId: "regional-six-eight-28",
    articleReason: "数値表示と本人の身体記録を分けて読む内容です。",
    action: Object.freeze({ screen: "notebook", label: "今日のからだを残す", theme: "body-feel" }),
  }),
  Object.freeze({
    value: "habit",
    label: "習慣化",
    supportTitle: "走行日と休養日を同じ記録として残す",
    supportDescription: "連続日数や達成度を作らず、その日の事実を自分のペースで残します。",
    articleId: "goals-and-recording-differ",
    articleReason: "記録や目標の使い方を、一つの成功基準へ決めない内容です。",
    action: Object.freeze({ screen: "notebook", label: "休む日のメモも残す", theme: "rest-note" }),
  }),
  Object.freeze({
    value: "distance",
    label: "距離を伸ばす",
    supportTitle: "距離とほかの条件を分けて見返す",
    supportDescription: "距離を増やすことを正解にせず、次回に確認したい条件を1つ残します。",
    articleId: "training-progression-no-universal-rule",
    articleReason: "一つの増加割合を全員の正解にせず、予定と実績を見返す内容です。",
    action: Object.freeze({ screen: "notebook", label: "次回見る条件を残す", theme: "next-note" }),
  }),
  Object.freeze({
    value: "event",
    label: "大会参加",
    supportTitle: "予定と実績を分けて残す",
    supportDescription: "予定どおりでない場合も失敗にせず、予定と実績を別の事実として見返します。",
    articleId: "plan-preview-v27",
    articleReason: "予定の参考値と実績を混ぜずに読む内容です。",
    action: Object.freeze({ screen: "plan", label: "予定を開く", theme: "" }),
  }),
  Object.freeze({
    value: "refresh",
    label: "気分転換",
    supportTitle: "気分や走りやすさを自分の言葉で残す",
    supportDescription: "本人の感じ方を計算値と分け、今日気づいたこととして記録します。",
    articleId: "rpe-separated",
    articleReason: "本人の感じ方と走行条件から作る表示を分けて読む内容です。",
    action: Object.freeze({ screen: "notebook", label: "今日の気づきを残す", theme: "learning" }),
  }),
  Object.freeze({
    value: "other",
    label: "その他",
    supportTitle: "自分なりの目的を1行で残す",
    supportDescription: "アプリが目的を解釈せず、本人が覚えておきたいことを自由に残します。",
    articleId: "model-limits-v27",
    articleReason: "アプリが判断できる範囲と、本人が決める範囲を説明します。",
    action: Object.freeze({ screen: "notebook", label: "自分の気づきを残す", theme: "learning" }),
  }),
]);

const GOAL_BY_VALUE = new Map(RUNNING_GOAL_OPTIONS.map((item) => [item.value, item]));

export function normalizeRunningGoalTags(value = []) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  const selected = new Set(source.map((item) => String(item || "").trim()).filter(Boolean));
  return Object.freeze(RUNNING_GOAL_OPTIONS.filter((item) => selected.has(item.value)).map((item) => item.value));
}

export function runningGoalDefinition(value = "") {
  return GOAL_BY_VALUE.get(String(value || "").trim()) || null;
}

export function runningGoalLabel(value = "") {
  return runningGoalDefinition(value)?.label || "";
}

export function buildRunningGoalSupport(profile = {}) {
  const selectedTags = normalizeRunningGoalTags(profile?.runningGoalTags || []);
  const items = selectedTags.map((tag) => GOAL_BY_VALUE.get(tag)).filter(Boolean);
  return Object.freeze({
    version: RUNNING_GOAL_SUPPORT_VERSION,
    hasSelection: items.length > 0,
    selectedTags,
    items: Object.freeze(items),
    articleIds: Object.freeze([...new Set(items.map((item) => item.articleId).filter(Boolean))]),
    numericUse: "NONE",
    rankingUse: "NONE",
    automaticJudgement: false,
  });
}
