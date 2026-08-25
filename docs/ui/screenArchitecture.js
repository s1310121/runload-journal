import { escapeHtml } from "./commonComponents.js";

export const SCREEN_ARCHITECTURE_VERSION = "runload-screen-architecture-v2.5r1";

export const PRIMARY_DESTINATIONS = Object.freeze([
  Object.freeze({ screen: "home", label: "ホーム", description: "今日の入口", icon: "home" }),
  Object.freeze({ screen: "record-input", label: "入力", description: "走行・休養を残す", icon: "input" }),
  Object.freeze({ screen: "result", label: "結果", description: "今回の表示を見る", requiresRecord: true, icon: "result" }),
  Object.freeze({ screen: "history", label: "記録", description: "履歴と推移を見る", icon: "history" }),
  Object.freeze({ screen: "activation", label: "活用", description: "理解・共有・予定へ進む", icon: "activation" }),
]);

export const FEATURE_DESTINATION_GROUPS = Object.freeze([
  Object.freeze({
    label: "記録を振り返る",
    items: Object.freeze([
      Object.freeze({ screen: "history", label: "履歴・推移", description: "保存した事実と比較可能な推移" }),
      Object.freeze({ screen: "notebook", label: "記録ノート", description: "本人が選んだ言葉" }),
    ]),
  }),
  Object.freeze({
    label: "理解・共有・予定",
    items: Object.freeze([
      Object.freeze({ screen: "activation", label: "活用の入口", description: "理解・共有・次回の行動を選ぶ" }),
      Object.freeze({ screen: "column", label: "コラム", description: "結果を理解する読みもの" }),
      Object.freeze({ screen: "consultation", label: "相談", description: "見せる内容を整理" }),
      Object.freeze({ screen: "support-guidance", label: "公的な相談先", description: "119・#7119など公式案内を確認" }),
      Object.freeze({ screen: "plan", label: "予定", description: "次の予定を考える" }),
    ]),
  }),
  Object.freeze({
    label: "管理",
    items: Object.freeze([
      Object.freeze({ screen: "privacy", label: "データとプライバシー", description: "保存内容、外部リンク、削除範囲を確認" }),
      Object.freeze({ screen: "settings", label: "設定・データ管理", description: "表示、プロフィール、保存と復元" }),
    ]),
  }),
]);

const WORKSPACE_BY_SCREEN = Object.freeze({
  home: "today",
  "record-input": "record",
  "course-library": "record",
  "course-editor": "record",
  "subjective-input": "record",
  "personal-input": "record",
  result: "result",
  "body-part-detail": "result",
  history: "records",
  notebook: "records",
  activation: "support",
  "support-guidance": "support",
  plan: "support",
  consultation: "support",
  column: "support",
  privacy: "manage",
  settings: "manage",
});

export function resolveScreenWorkspace(screen = "") {
  return WORKSPACE_BY_SCREEN[screen] || "today";
}

function route(screen, values = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return `#/${screen}${query.size ? `?${query.toString()}` : ""}`;
}

function workspaceLink({ href, label, description, current = false }) {
  return `<a class="workspace-navigation__link${current ? " is-current" : ""}" href="${escapeHtml(href)}"${current ? ' aria-current="page"' : ""}><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></a>`;
}

export function renderResultWorkspaceNavigation({ recordId = "", date = "", regionId = "", active = "overview" } = {}) {
  const items = [
    { key: "overview", href: route("result", { recordId }), label: "今回の結果", description: "事実・本人入力・比較表示" },
    ...(regionId ? [{ key: "region", href: route("body-part-detail", { recordId, regionId }), label: "選択した部位", description: "この部位の条件応答と知見" }] : []),
    { key: "history", href: route("history", { view: "trends", period: 28, anchorDate: date, recordId, regionId }), label: "履歴・推移", description: regionId ? "同じ意味で比べられる記録" : "保存した記録を見返す" },
    { key: "notebook", href: route("notebook", { view: "day", date, source: "result", recordId }), label: "この日のノート", description: "本人の言葉を別に残す" },
  ];
  return `<nav class="workspace-navigation" data-screen-architecture="${SCREEN_ARCHITECTURE_VERSION}" aria-label="結果の関連画面">${items.map((item) => workspaceLink({ ...item, current: item.key === active })).join("")}</nav>`;
}

export function renderRecordsWorkspaceNavigation({ active = "history", date = "", month = "" } = {}) {
  const items = [
    { key: "history", href: route("history", { view: "records", anchorDate: date }), label: "履歴・推移", description: "自動保存された事実と結果" },
    { key: "notebook", href: route("notebook", { view: "list", month: month || String(date || "").slice(0, 7) }), label: "記録ノート", description: "本人が選んで残した言葉" },
  ];
  return `<nav class="workspace-navigation workspace-navigation--records" data-screen-architecture="${SCREEN_ARCHITECTURE_VERSION}" aria-label="記録を見返す画面">${items.map((item) => workspaceLink({ ...item, current: item.key === active })).join("")}</nav>`;
}

export function renderManagementBoundary() {
  return `<aside class="screen-role-boundary" data-screen-architecture="${SCREEN_ARCHITECTURE_VERSION}" aria-label="設定画面の役割"><p><strong>設定とデータ管理は、記録を見る画面から分けています。</strong></p><p>ここで変更できるのは表示、任意プロフィール、バックアップ、復元、削除です。保存済みの数値結果や過去のプロフィール内容は自動で書き換えません。</p></aside>`;
}
