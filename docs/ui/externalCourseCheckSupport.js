import { shouldOpenExternalCourseCheck, shouldRenderExternalCourseCheck, normalizeJournalSettings } from "./appSettings.js";
import { escapeHtml } from "./commonComponents.js";

export const COURSE_CHECK_LINKS = Object.freeze([
  Object.freeze({
    label: "On The Go Mapで距離・標高を見る",
    url: "https://onthegomap.com/",
    note: "走るコースを地図上でなぞり、距離と標高グラフを確認しやすい外部サービスです。",
  }),
  Object.freeze({
    label: "地理院地図で高低差を見る",
    url: "https://maps.gsi.go.jp/",
    note: "日本国内のコースで、線を引いて断面図を確認しやすい外部地図です。",
  }),
  Object.freeze({
    label: "Google Earthで経路を確認する",
    url: "https://earth.google.com/web/",
    note: "経路や周辺地形を見ながら、上り下りの位置を確認する補助に使えます。",
  }),
]);

export function renderExternalCourseCheckSupport({
  title = "区間や勾配が分からないとき",
  smallText = "外部地図で距離や坂道を確認し、この画面に自分で入力します",
  compact = false,
  settings = {},
} = {}) {
  const normalizedSettings = normalizeJournalSettings(settings);
  if (!shouldRenderExternalCourseCheck(normalizedSettings)) return "";
  const openAttribute = shouldOpenExternalCourseCheck(normalizedSettings) ? " open" : "";
  const className = compact ? "course-external-support course-external-support--compact" : "course-external-support";
  const titleId = compact ? "plan-external-support-title" : "course-external-support-title";
  return `<details class="${className}" aria-labelledby="${titleId}"${openAttribute}>
    <summary><span><strong id="${titleId}">${escapeHtml(title)}</strong><small>${escapeHtml(smallText)}</small></span><span class="disclosure-status">任意の確認</span></summary>
    <div class="course-external-support__body">
      <p>コース全体のうち坂が多い部分のおおよその割合を、上り区間・下り区間として入力します。勾配は「高低差 ÷ 距離 × 100」の目安です。正確に分からない場合は、0のままでも記録できます。</p>
      <p>On The Go Mapなどの外部地図でコースをなぞると、距離や標高グラフを確認できます。標高グラフが上がる部分を上り、下がる部分を下りの目安にします。</p>
      <div class="course-external-support__links">${COURSE_CHECK_LINKS.map((item) => `<a class="button button--secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.note)}</span></a>`).join("")}</div>
      <div class="source-boundary course-external-support__notice">
        <p>外部地図は、距離や坂道を自分で確認するための外部サイトです。RunLoadはGPS、外部アカウント、外部アプリの記録を自動取得しません。RunLoadは地図画像・標高グラフの転載や埋め込みも行いません。</p>
        <p>外部サイトを使う場合は、利用規約・プライバシーポリシーを読んだうえで使います。RunLoadでは標高や勾配を目安として扱い、本人が入力した範囲だけを記録します。</p>
      </div>
    </div>
  </details>`;
}
