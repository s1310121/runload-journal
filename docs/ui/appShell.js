import { escapeHtml } from "./commonComponents.js";
import { renderGuideDialog } from "./guideContent.js";
import { FEATURE_DESTINATION_GROUPS, PRIMARY_DESTINATIONS } from "./screenArchitecture.js";

const CORE_NAVIGATION = PRIMARY_DESTINATIONS;

export const PRIMARY_NAVIGATION = PRIMARY_DESTINATIONS;

const APP_EXPLANATION_NAVIGATION = Object.freeze([
  Object.freeze({ section: "first-use", label: "使い方ガイド", description: "最初に読む取扱説明書" }),
  Object.freeze({ section: "record", label: "今日の記録", description: "入力の流れ" }),
  Object.freeze({ section: "result", label: "結果の読み方", description: "走行全体と12部位の結果" }),
  Object.freeze({ section: "records", label: "履歴と記録ノート", description: "保存記録と本人の言葉を分ける" }),
  Object.freeze({ section: "safety", label: "注意と相談", description: "このアプリの限界" }),
]);

const PRIMARY_SECTION_BY_SCREEN = Object.freeze({
  "course-library": "record-input",
  "course-editor": "record-input",
  "subjective-input": "record-input",
  "personal-input": "record-input",
  "body-part-detail": "result",
  notebook: "history",
  column: "activation",
  consultation: "activation",
  "support-guidance": "activation",
  plan: "activation",
});

function navigationHref(item) {
  return `#/${item.screen}`;
}

export function resolveCurrentPrimaryScreen(currentScreen) {
  return PRIMARY_SECTION_BY_SCREEN[currentScreen] || currentScreen;
}

function navigationClassName(item, className) {
  return className;
}

function navigationIcon(screen) {
  const paths = {
    home: '<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4Z"/>',
    "record-input": '<path d="M5 19h4l10-10-4-4L5 15v4Zm9-13 4 4"/>',
    result: '<path d="M5 19V9m7 10V5m7 14v-7"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6M12 8v4l3 2"/>',
    activation: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z"/>',
  };
  return `<svg class="primary-navigation__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[screen] || paths.activation}</svg>`;
}

function renderDisabledNavigationItem(item, className, current = false) {
  const resolvedClassName = navigationClassName(item, className);
  return `<span class="${resolvedClassName} is-disabled${current ? " is-current" : ""}" aria-disabled="true" data-navigation-screen="${escapeHtml(item.screen)}"${current ? ' aria-current="page"' : ""}>${navigationIcon(item.screen)}<span class="primary-navigation__label">${escapeHtml(item.label)}</span><small>記録後</small></span>`;
}

function renderNavigationItem(item, currentScreen, className, currentLocation, hasResult, usePrimarySection = false) {
  const activeScreen = usePrimarySection ? resolveCurrentPrimaryScreen(currentScreen) : currentScreen;
  const current = item.screen === activeScreen;
  if (item.requiresRecord && !hasResult) return renderDisabledNavigationItem(item, className, current);
  const resolvedClassName = navigationClassName(item, className);
  return `<a class="${resolvedClassName}${current ? " is-current" : ""}" href="${escapeHtml(navigationHref(item))}" data-navigation-screen="${escapeHtml(item.screen)}"${current ? ' aria-current="page"' : ""}>${navigationIcon(item.screen)}<span class="primary-navigation__label">${escapeHtml(item.label)}</span></a>`;
}

function renderFeatureMenuLink(item, currentScreen, currentLocation, hasResult, usePrimarySection = false) {
  const activeScreen = usePrimarySection ? resolveCurrentPrimaryScreen(currentScreen) : currentScreen;
  const current = item.screen === activeScreen;
  const status = item.requiresRecord && !hasResult ? "記録後" : "";
  const description = status || item.description || "";
  const labelHtml = `<span class="feature-menu__item-title">${escapeHtml(item.label)}</span><span class="feature-menu__item-description">${escapeHtml(description)}</span>`;
  const itemClass = item.desktopPrimary ? " feature-menu__link--desktop-primary" : "";
  if (item.requiresRecord && !hasResult) {
    return `<span class="feature-menu__link${itemClass} is-disabled${current ? " is-current" : ""}" aria-disabled="true" data-navigation-screen="${escapeHtml(item.screen)}"${current ? ' aria-current="page"' : ""} aria-label="${escapeHtml(`${item.label}: 記録後に開けます`)}">${labelHtml}</span>`;
  }
  return `<a class="feature-menu__link${itemClass}${current ? " is-current" : ""}" href="${escapeHtml(navigationHref(item))}" data-navigation-screen="${escapeHtml(item.screen)}"${current ? ' aria-current="page"' : ""} aria-label="${escapeHtml(`${item.label}: ${item.description || ""}`)}">${labelHtml}</a>`;
}

function renderFeatureMenuGroup(label, items, currentScreen, currentLocation, hasResult, usePrimarySection, extraClass = "") {
  const primaryClass = items.every((item) => item.desktopPrimary) ? " feature-menu__group--desktop-primary-only" : "";
  const groupClass = `${primaryClass}${extraClass ? ` ${extraClass}` : ""}`;
  return `<section class="feature-menu__group${groupClass}" aria-label="${escapeHtml(label)}"><p class="feature-menu__group-label">${escapeHtml(label)}</p><div class="feature-menu__links">${items.map((item) => renderFeatureMenuLink(item, currentScreen, currentLocation, hasResult, usePrimarySection)).join("")}</div></section>`;
}

function renderGuideMenuLink(item, index) {
  const idAttribute = index === 0 ? ' id="app-guide-button"' : "";
  return `<button type="button"${idAttribute} class="feature-menu__link feature-menu__link--button" data-open-guide="${escapeHtml(item.section)}" aria-label="${escapeHtml(`${item.label}: ${item.description}`)}"><span class="feature-menu__item-title">${escapeHtml(item.label)}</span><span class="feature-menu__item-description">${escapeHtml(item.description)}</span></button>`;
}

function renderFeatureGuideGroup() {
  return `<section class="feature-menu__group feature-menu__group--guide" aria-label="アプリ説明"><p class="feature-menu__group-label">アプリ説明</p><div class="feature-menu__links feature-menu__links--guide">${APP_EXPLANATION_NAVIGATION.map((item, index) => renderGuideMenuLink(item, index)).join("")}</div></section>`;
}

function renderFeatureMenu({ currentScreen, currentLocation, hasResult }) {
  const groupedDestinations = FEATURE_DESTINATION_GROUPS.map((group) => renderFeatureMenuGroup(group.label, group.items, currentScreen, currentLocation, hasResult, false)).join("");
  return `<div class="feature-menu" data-feature-menu><button type="button" id="feature-menu-button" class="app-menu-button" aria-label="メニューを開く" aria-haspopup="true" aria-expanded="false" aria-controls="feature-menu-panel"><span class="app-menu-button__label">メニュー</span></button><div id="feature-menu-panel" class="feature-menu__panel" role="dialog" aria-modal="false" aria-labelledby="feature-menu-title" hidden><header class="feature-menu__header"><p>画面メニュー</p><strong id="feature-menu-title">開く画面を選ぶ</strong></header><nav class="feature-menu__nav" aria-label="行き先">${renderFeatureMenuGroup("基本の流れ", CORE_NAVIGATION, currentScreen, currentLocation, hasResult, true, "feature-menu__group--mobile-core")}${groupedDestinations}${renderFeatureGuideGroup()}</nav></div></div>`;
}

export function renderAppShell({ currentScreen, currentLocation, screenContent, hasResult = false, guide = {} }) {
  return `
    <div class="app-shell">
      <header class="app-header">
        <a class="app-brand" href="#/home" aria-label="RunLoad Journal ホーム">
          <span class="app-brand__mark" aria-hidden="true">RL</span>
          <span><strong>RunLoad Journal</strong><small>走行結果と自分の気づきを分けて残す</small></span>
        </a>
        <div class="app-header__actions">
          ${renderFeatureMenu({ currentScreen, currentLocation, hasResult })}
        </div>
      </header>

      <main id="main-content" class="app-main" tabindex="-1">
        ${screenContent}
      </main>

      <nav class="primary-navigation" aria-label="主要画面">
        ${PRIMARY_NAVIGATION.map((item) => renderNavigationItem(item, currentScreen, "primary-navigation__link", currentLocation, hasResult, true)).join("")}
      </nav>
      ${renderGuideDialog({
        open: Boolean(guide.open),
        section: guide.section,
        currentScreen,
        firstVisit: Boolean(guide.firstVisit),
      })}
    </div>`;
}

export function focusScreenHeading() {
  const heading = document.querySelector("#main-content h1");
  if (!heading) return;
  heading.setAttribute("tabindex", "-1");
  heading.focus();
}
