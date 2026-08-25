export const DEFAULT_JOURNAL_SETTINGS = Object.freeze({
  appearanceMode: "system",
  colorTheme: "standard",
  textSize: "standard",
  externalLinkDisplay: "as-needed",
  resultDisplayMode: "standard",
  selectedRegionalView: "WITHIN_RUN_REGIONAL_EMPHASIS",
  regionalResultInitialView: "focus",
  regionalResultLastView: "focus",
  showRegionalPreviousComparison: true,
});

export const APPEARANCE_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: "system", label: "端末に合わせる", description: "スマホやブラウザのライト/ダーク設定に合わせます。" }),
  Object.freeze({ value: "light", label: "ライト", description: "明るい背景で表示します。" }),
  Object.freeze({ value: "dark", label: "ダーク", description: "暗い背景で表示します。" }),
]);

export const COLOR_THEME_OPTIONS = Object.freeze([
  Object.freeze({ value: "standard", label: "標準", description: "RunLoadの基本配色で、落ち着いて読みやすい画面にします。" }),
  Object.freeze({ value: "green", label: "やさしい緑", description: "緑系の配色で、目にやさしく落ち着いた画面にします。" }),
  Object.freeze({ value: "blue", label: "すっきり青", description: "寒色の青系配色で、情報を整理して見やすい画面にします。" }),
  Object.freeze({ value: "orange", label: "あたたかい橙", description: "暖色の橙系配色で、あたたかく前向きな画面にします。" }),
]);

export const TEXT_SIZE_OPTIONS = Object.freeze([
  Object.freeze({ value: "standard", label: "標準", description: "RunLoadの標準文字サイズで表示します。" }),
  Object.freeze({ value: "large", label: "大きめ", description: "RunLoadが数値、部位名、説明文を少し大きく表示します。" }),
]);


export const RESULT_DISPLAY_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: "standard", label: "標準（入力から読む）", description: "結果画面は、今日の入力内容を先に表示し、その後で12部位の比較値を表示します。" }),
  Object.freeze({ value: "result-first", label: "結果を先に見る", description: "結果画面は、走行全体の比較用推定値と12部位の身体図を先に表示し、その後で今日の入力内容を表示します。" }),
  Object.freeze({ value: "body-focus", label: "部位を詳しく見る", description: "結果画面は、12部位の身体図と本人が入力した身体記録を先に表示し、部位詳細へ進むボタンを見つけやすくします。" }),
  Object.freeze({ value: "consultation-focus", label: "相談しやすく見る", description: "結果画面は、本人が入力した身体記録と今日の記録条件を先に表示し、相談メモの作成へつなげます。" }),
  Object.freeze({ value: "compact", label: "短く見る", description: "結果画面は、走行全体の比較用推定値と12部位の身体図を先に表示し、今日の入力内容や詳しい説明を後半にまとめます。" }),
]);


export const REGIONAL_RESULT_INITIAL_VIEW_OPTIONS = Object.freeze([
  Object.freeze({ value: "focus", label: "今回注目する部位を先に表示", description: "各部位自身の同距離基準より上向いた部位、または比較可能な前回の同じ部位より上向いた部位を先に示します。最初は4部位まで表示し、残りは展開できます。部位間の数値差の大きさでは並べません。" }),
  Object.freeze({ value: "all", label: "全12部位を先に表示", description: "身体図とともに、12部位の比較値を解剖学的な固定順ですべて表示します。数値順には並べ替えません。" }),
  Object.freeze({ value: "remember", label: "前回の切替を引き継ぐ", description: "結果画面で最後に選んだ表示方法を次回も使います。" }),
]);

export const REGIONAL_PREVIOUS_COMPARISON_OPTIONS = Object.freeze([
  Object.freeze({ value: "show", label: "表示する", description: "同じ部位・同じ基準など、同じ意味で比べられる最新記録がある場合だけ、部位カードへ前回との差を小さく表示します。" }),
  Object.freeze({ value: "hide", label: "表示しない", description: "各部位の比較値を表示し、今回と同じ距離にそろえたその部位自身の基準との関係を示します。保存結果や履歴は変更しません。" }),
]);

export const EXTERNAL_LINK_DISPLAY_OPTIONS = Object.freeze([
  Object.freeze({ value: "as-needed", label: "必要なときだけ", description: "RunLoadは、コース入力画面とプラン作成画面で外部確認リンクを折りたたんで表示します。" }),
  Object.freeze({ value: "always", label: "いつも表示", description: "RunLoadは、外部確認リンクの説明を最初から開いた状態で表示します。" }),
  Object.freeze({ value: "hidden", label: "表示しない", description: "RunLoadは、外部地図サービスへのリンクをコース入力画面とプラン作成画面に表示しません。" }),
]);

function optionValues(options) {
  return new Set(options.map((option) => option.value));
}

const APPEARANCE_VALUES = optionValues(APPEARANCE_MODE_OPTIONS);
const COLOR_VALUES = optionValues(COLOR_THEME_OPTIONS);
const TEXT_SIZE_VALUES = optionValues(TEXT_SIZE_OPTIONS);
const RESULT_DISPLAY_VALUES = optionValues(RESULT_DISPLAY_MODE_OPTIONS);
const EXTERNAL_LINK_VALUES = optionValues(EXTERNAL_LINK_DISPLAY_OPTIONS);
const REGIONAL_RESULT_INITIAL_VIEW_VALUES = optionValues(REGIONAL_RESULT_INITIAL_VIEW_OPTIONS);
const REGIONAL_RESULT_VIEW_VALUES = new Set(["focus", "all"]);
const REGIONAL_VIEW_VALUES = new Set([
  "WITHIN_RUN_REGIONAL_EMPHASIS",
  "OWN_FLAT_REFERENCE_RATIO",
  "PERSONAL_USUAL_RATIO",
]);

function pick(value, allowedValues, fallback) {
  const normalized = String(value || "").trim();
  return allowedValues.has(normalized) ? normalized : fallback;
}

export function normalizeJournalSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return Object.freeze({
    ...source,
    appearanceMode: pick(source.appearanceMode, APPEARANCE_VALUES, DEFAULT_JOURNAL_SETTINGS.appearanceMode),
    colorTheme: pick(source.colorTheme, COLOR_VALUES, DEFAULT_JOURNAL_SETTINGS.colorTheme),
    textSize: pick(source.textSize, TEXT_SIZE_VALUES, DEFAULT_JOURNAL_SETTINGS.textSize),
    externalLinkDisplay: pick(source.externalLinkDisplay, EXTERNAL_LINK_VALUES, DEFAULT_JOURNAL_SETTINGS.externalLinkDisplay),
    resultDisplayMode: pick(source.resultDisplayMode, RESULT_DISPLAY_VALUES, DEFAULT_JOURNAL_SETTINGS.resultDisplayMode),
    selectedRegionalView: pick(source.selectedRegionalView, REGIONAL_VIEW_VALUES, DEFAULT_JOURNAL_SETTINGS.selectedRegionalView),
    regionalResultInitialView: pick(source.regionalResultInitialView, REGIONAL_RESULT_INITIAL_VIEW_VALUES, DEFAULT_JOURNAL_SETTINGS.regionalResultInitialView),
    regionalResultLastView: pick(source.regionalResultLastView, REGIONAL_RESULT_VIEW_VALUES, DEFAULT_JOURNAL_SETTINGS.regionalResultLastView),
    showRegionalPreviousComparison: source.showRegionalPreviousComparison !== false && source.showRegionalPreviousComparison !== "hide",
  });
}

export function mergeJournalSettings(currentSettings = {}, settingsUpdate = {}) {
  const current = currentSettings && typeof currentSettings === "object" ? currentSettings : {};
  return normalizeJournalSettings({ ...current, ...settingsUpdate });
}

export function shouldRenderExternalCourseCheck(settings = {}) {
  return normalizeJournalSettings(settings).externalLinkDisplay !== "hidden";
}

export function shouldOpenExternalCourseCheck(settings = {}) {
  return normalizeJournalSettings(settings).externalLinkDisplay === "always";
}

function replaceClassByPrefix(element, prefix, nextClass) {
  [...element.classList].forEach((className) => {
    if (className.startsWith(prefix)) element.classList.remove(className);
  });
  element.classList.add(nextClass);
}

function resolvedAppearanceIsDark(appearanceMode) {
  if (appearanceMode === "dark") return true;
  if (appearanceMode === "light") return false;
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function themeColorForSettings(settings) {
  const isDark = resolvedAppearanceIsDark(settings.appearanceMode);
  const lightColors = Object.freeze({ standard: "#f4f1ea", green: "#e7f4df", blue: "#edf3f7", orange: "#f7f0e5" });
  const darkColors = Object.freeze({ standard: "#111513", green: "#0b1810", blue: "#0e151c", orange: "#18120e" });
  const palette = isDark ? darkColors : lightColors;
  return palette[settings.colorTheme] || palette.standard;
}

export function applyJournalSettings(settings = {}) {
  if (typeof document === "undefined") return;
  const normalized = normalizeJournalSettings(settings);
  const root = document.documentElement;
  replaceClassByPrefix(root, "rl-appearance-", `rl-appearance-${normalized.appearanceMode}`);
  replaceClassByPrefix(root, "rl-color-", `rl-color-${normalized.colorTheme}`);
  replaceClassByPrefix(root, "rl-text-", `rl-text-${normalized.textSize}`);
  root.dataset.externalLinkDisplay = normalized.externalLinkDisplay;
  root.dataset.resultDisplayMode = normalized.resultDisplayMode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColorForSettings(normalized));
}
