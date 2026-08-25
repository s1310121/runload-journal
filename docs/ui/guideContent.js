import { escapeHtml } from "./commonComponents.js";
import { BODY_REGION_TERMINOLOGY } from "./bodyRegionTerminology.js";

export const APP_GUIDE_VERSION = "guide-beginner-language-20260805";
export const DEFAULT_GUIDE_SECTION = "first-use";

export const GUIDE_SECTIONS = Object.freeze([
  Object.freeze({ id: "first-use", label: "使い方ガイド" }),
  Object.freeze({ id: "record", label: "今日の記録" }),
  Object.freeze({ id: "result", label: "結果の読み方" }),
  Object.freeze({ id: "records", label: "履歴とノート" }),
  Object.freeze({ id: "safety", label: "限界と相談" }),
  Object.freeze({ id: "parts", label: "12部位と身体記録" }),
]);

const GUIDE_SECTION_ALIASES = Object.freeze({
  steps: "first-use",
  value: "first-use",
  scope: "safety",
  reading: "result",
  evidence: "safety",
});

const SCREEN_HINTS = Object.freeze({
  home: "今日の記録、最新結果、予定から、今行うことを選ぶ入口です。",
  "record-input": "距離と実走時間を中心に、分かる条件だけを入力します。",
  result: "走行全体の比較用推定値と12部位の比較値を別々に確認します。",
  "body-part-detail": "選んだ部位の比較値、関連する一般知識、本人の身体記録を確認します。",
  history: "記録一覧と、同じ意味で比べられる記録の推移を分けて確認します。",
  plan: "予定条件から作る参考表示を確認します。保存後の結果とは分けて扱います。",
  consultation: "本人入力と数値表示を区別し、相手へ見せる内容を整理します。",
  column: "走行条件と身体の使われ方に関する一般知識を、参考資料と一緒に確認します。",
  notebook: "履歴とは分けて、本人が選んだテーマと1行を残す場所です。",
});

const RESULT_REGION_GUIDE = Object.freeze(BODY_REGION_TERMINOLOGY.map((item) => Object.freeze([
  `${item.formalJa}（${item.familiarJa}）`,
  `${item.plainMeaningJa}について、今回の距離と条件を含む比較値を、その部位自身の1 km基準100と照らして確認します。`,
])));

export function normalizeGuideSection(section) {
  const normalized = GUIDE_SECTION_ALIASES[section] || section;
  return GUIDE_SECTIONS.some((item) => item.id === normalized)
    ? normalized
    : DEFAULT_GUIDE_SECTION;
}

export function shouldOpenGuide(settings = {}) {
  return settings?.guideVersionSeen !== APP_GUIDE_VERSION;
}

export function withGuideVersionSeen(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return Object.freeze({ ...source, guideVersionSeen: APP_GUIDE_VERSION });
}

function renderFirstUse(currentScreen) {
  const hint = SCREEN_HINTS[currentScreen]
    || "入力した事実、数値表示、本人入力を分けて確認します。";
  const steps = [
    ["走行事実を記録", "走行では距離と実走時間が必須です。歩数、走行形式、坂、路面、シューズ等は分かる範囲で追加します。"],
    ["分かる条件だけ追加", "坂、路面、歩数などは分かる範囲で追加します。分からない内容は、分からないまま記録できます。"],
    ["12部位の比較値を確認", "各部位自身の1 km基準走行を100として、今回の距離と条件を含む比較値を確認します。同じ部位の記録どうしで比べ、部位間ランキングはしません。"],
    ["本人の感覚を別に残す", "身体記録は数値結果と分けて保存し、本人が入力した内容として見返します。"],
    ["表示を区別", "12部位の比較値、走行全体の比較用推定値、履歴、本人の記録ノートを目的別に分けます。"],
  ];
  return `<div class="guide-lead"><p>RunLoad Journalは、走行事実・数値結果・本人の記録を分けて見返し、自己理解と自己判断を支援する記録アプリです。</p><p class="guide-screen-hint"><strong>この画面の見方：</strong>${escapeHtml(hint)}</p></div><div class="guide-step-list">${steps.map(([title, body], index) => `<article class="guide-step-card"><span aria-hidden="true">${index + 1}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div></article>`).join("")}</div><div class="guide-note"><h3>いつでも見返せます</h3><p>メニューの「アプリ説明」から、入力・結果・履歴・限界・部位の説明を開けます。</p></div>`;
}

function renderRecordGuide() {
  return `<div class="guide-lead"><p>必須項目を前面に置き、任意項目は必要なときだけ別画面で追加します。</p></div><div class="guide-card-grid">
    <article><h3>必須の走行量</h3><p>走行日には距離と実走時間が必要です。休養日は走行による12部位の比較値を作成しません。</p></article>
    <article><h3>歩数・走行形式</h3><p>分かる場合だけ入力します。歩数は取得方法も一緒に残し、後から同じような記録を見分けやすくします。</p></article>
    <article><h3>坂と路面</h3><p>上り・下りや路面の違いは、身体の使われ方を振り返る手掛かりになります。分からない場合は「不明」のまま残せます。</p></article>
    <article><h3>シューズ・走り方</h3><p>今回の走りを思い出し、関連する一般説明を読むための補足として残します。自由記述は本人のメモとして扱います。</p></article>
    <article><h3>身体記録</h3><p>詳細部位、程度、気づいた時点を保存します。走行前からの状態を今回の走行原因として扱いません。</p></article>
    <article><h3>走り全体のきつさ（RPE）</h3><p>RPEは、走り終えた本人が感じたきつさを0〜10で残す方法です。部位の数値とは別の本人記録として見返します。</p></article>
  </div><div class="guide-note"><h3>分からない内容はそのままで構いません</h3><p>不明な坂・路面や、確認していない身体の状態を推測で入力する必要はありません。</p></div>`;
}

function renderResultGuide() {
  return `<div class="guide-lead"><p>結果画面では、目的の違う情報を分けて表示します。</p></div><ol class="guide-reading-order">
    <li><strong>12部位の比較値</strong><span>各部位自身の1 km基準走行を100として、今回の走行距離と条件を含む比較値を表示します。同じ部位の記録どうしで比べます。</span></li>
    <li><strong>走行全体の比較用推定値</strong><span>今回の走行量を、比較できる本人の過去記録と見比べます。12部位の比較値とは別のモデル・別の見方です。</span></li>
    <li><strong>基準100</strong><span>100はその部位自身の1 km基準走行です。今回の距離が長ければ値にはその分も含まれます。安全・正常・平均・推奨や実際の力の百分率ではありません。</span></li>
    <li><strong>表示状態</strong><span>速度がモデル範囲外の場合は外挿せず、部位別数値を表示しません。分からない任意条件も「効果なし」とは扱いません。</span></li>
    <li><strong>本人入力・RPE</strong><span>数値結果とは別の記録として確認します。診断、危険度、走行可否へ変換しません。</span></li>
  </ol><div class="guide-note"><h3>比べるときの注意</h3><p>異なる部位の値を同じ単位の順位として読みません。履歴では、同じ部位・同じ基準など、同じ意味で比べられる記録だけを線で結びます。</p></div>`;
}

function renderRecordsGuide() {
  return `<div class="guide-lead"><p>履歴と記録ノートは、保存する情報の役割を分けています。</p></div><div class="guide-card-grid">
    <article><h3>記録一覧</h3><p>走行・休養、距離、時間、コース、保存結果を日付から探します。自動保存された事実の入口です。</p></article>
    <article><h3>推移を見る</h3><p>走行全体または選択した部位について、同じ意味で比べられる記録だけを線で結びます。</p></article>
    <article><h3>結果画面との分担</h3><p>結果画面では前回の比較可能記録1件、履歴では複数回の推移を確認します。</p></article>
    <article><h3>記録ノート</h3><p>本人が選んだテーマと1行を保存します。距離や部位別比較値を自動複製せず、元の結果へリンクします。</p></article>
    <article><h3>比較できない記録</h3><p>条件がそろわない記録は線へ含めず、記録自体は一覧から確認できます。</p></article>
    <article><h3>バックアップ</h3><p>入力内容、数値結果、本人のノートを区別したまま保存します。</p></article>
  </div>`;
}

function renderSafetyGuide() {
  return `<div class="guide-lead"><p>RunLoadは走行条件を整理して振り返るためのアプリで、身体や障害を判定するものではありません。</p></div><div class="guide-scope-grid"><article><h3>支援すること</h3><ul><li>走行・休養・コース事実の保存</li><li>12部位の比較値（モデル範囲内で根拠に基づく比較用座標）</li><li>本人入力と数値結果の区別</li><li>履歴、ノート、相談準備</li></ul></article><article><h3>主張しないこと</h3><ul><li>実際の筋・腱・関節力</li><li>診断、原因、危険度、傷害確率</li><li>走行可否、受診要否、個別処方</li><li>部位間の物理的な大小順位</li></ul></article></div><div class="guide-card-grid">
    <article><h3>本人入力と公的な案内を分ける</h3><p>伝えたい身体情報は数値表示と分けて保存します。公式の救急案内と重なる種類の項目を選んだ場合は、RunLoadが緊急性を判定せず、公的な相談先を確認する導線を先に示します。</p></article>
    <article><h3>研究で分かる範囲</h3><p>先行研究の対象や条件は限られています。今回の記録と研究条件が大きく異なる場合は、数値を無理に示さず「範囲外」などと表示します。</p></article>
    <article><h3>自動送信しません</h3><p>共有する内容、相手、タイミングは本人が選びます。</p></article>
    <article><h3>確認できている範囲</h3><p>アプリの動作と表示は確認していますが、利用者を対象にした有効性の検証は行っていません。</p></article>
  </div>`;
}

function renderParts() {
  return `<div class="guide-lead"><p>身体図は結果と本人入力で同じ12部位を使います。表示にない場所は「その他」から本人の記録として追加できます。</p></div><div class="guide-parts-grid">${RESULT_REGION_GUIDE.map(([title, body]) => `<article><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join("")}</div><div class="guide-note"><h3>各部位自身の1 km基準走行が100</h3><p>今回の走行距離とモデルで扱える条件を含む比較値を表示します。100は安全・正常・平均・推奨ではありません。同じ部位の記録どうしで比べ、ほかの部位との大小比較には使いません。モデル範囲外では外挿せず数値を示しません。</p></div><div class="guide-note"><h3>本人の身体記録</h3><p>本人が気になる場所は12部位の身体図から選び、必要な場合だけ「その他」を追加します。本人の記録は数値結果と分けて表示します。</p></div>`;
}

export function renderGuideSection(section, currentScreen) {
  const normalized = normalizeGuideSection(section);
  if (normalized === "record") return renderRecordGuide();
  if (normalized === "result") return renderResultGuide();
  if (normalized === "records") return renderRecordsGuide();
  if (normalized === "safety") return renderSafetyGuide();
  if (normalized === "parts") return renderParts();
  return renderFirstUse(currentScreen);
}

export function renderGuideDialog({
  open = false,
  section = DEFAULT_GUIDE_SECTION,
  currentScreen = "home",
  firstVisit = false,
} = {}) {
  if (!open) return "";
  const normalized = normalizeGuideSection(section);
  const completeLabel = firstVisit ? "使い始める" : "説明を閉じる";
  return `<div class="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-dialog-title" aria-describedby="guide-dialog-description"><button type="button" class="guide-dialog__backdrop" data-guide-close aria-label="アプリ説明を閉じる"></button><section class="guide-dialog__panel" tabindex="-1" data-guide-panel><header class="guide-dialog__header"><div><p>アプリ説明</p><h2 id="guide-dialog-title">${firstVisit ? "はじめての使い方ガイド" : "アプリ説明"}</h2><p id="guide-dialog-description">${firstVisit ? "最初に使い方を確認します。説明は後からメニューで開けます。" : "必要な説明を選んで確認できます。"}</p></div></header><div class="guide-tabs" role="tablist" aria-label="アプリ説明の内容">${GUIDE_SECTIONS.map((item) => `<button type="button" role="tab" id="guide-tab-${item.id}" aria-selected="${item.id === normalized}" aria-controls="guide-panel" tabindex="${item.id === normalized ? "0" : "-1"}" class="guide-tab${item.id === normalized ? " is-current" : ""}" data-guide-section="${item.id}">${escapeHtml(item.label)}</button>`).join("")}</div><div id="guide-panel" class="guide-dialog__body" role="tabpanel" aria-labelledby="guide-tab-${normalized}">${renderGuideSection(normalized, currentScreen)}</div><footer class="guide-dialog__footer"><button type="button" class="button button--primary" data-guide-complete>${completeLabel}</button></footer></section></div>`;
}
