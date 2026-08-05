const MOTION_CARD_SELECTOR = [
  ".result-card",
  ".home-summary-card",
  ".home-compact-card",
  ".daily-suggestion",
  ".home-reading-card",
  ".body-part-focus",
  ".editorial-summary",
  ".next-action",
  ".form-section",
  ".filter-panel",
  ".share-report",
  ".related-article",
  ".danger-zone",
  ".history-item",
  ".saved-plan",
  ".article-card",
  ".plan-candidate",
  ".plan-complete-card",
  ".quick-share-card",
  ".consult-entry-card",
  ".numbered-detail-card",
  ".record-course-entry",
  ".record-subjective-entry",
  ".record-management-links",
  ".course-card",
  ".body-part-analysis-action",
  ".notebook-page-cover",
  ".notebook-selected-seen",
  ".notebook-editor-card",
  ".notebook-month-page",
  ".notebook-book-card",
  ".screen-guide"
].join(", ");

const MOTION_INTERACTIVE_SELECTOR = [
  ".button",
  ".text-link",
  ".feature-link-card",
  ".share-format-card",
  ".consult-entry-card",
  ".primary-navigation__link",
  ".feature-menu__link",
  ".app-menu-button",
  ".choice-card",
  ".check-option",
  ".notebook-seen-material",
  ".notebook-theme-chip",
  ".subjective-body-part-chip",
  ".plan-candidate",
  ".history-calendar__day",
  ".distribution-list__item a"
].join(", ");

const MOTION_DETAILS_SELECTOR = [
  "details.form-disclosure",
  "details.evidence-disclosure",
  "details.history-detail-disclosure",
  "details.history-record-browser--collapsed",
  "details.notebook-start-guide--collapsed",
  "details.danger-zone",
  "details.history-chart-data",
  "details.plan-outcome-editor",
  "details.plan-saved-disclosure",
  "details.body-part-navigation",
  "details.column-source-index",
  "details.finish-data-tools",
  "details.screen-guide"
].join(", ");

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MAX_STAGGERED_CARDS = 10;

function isReducedMotion() {
  return Boolean(window.matchMedia?.(REDUCED_MOTION_QUERY).matches);
}

function markMotionCards(scope) {
  scope.querySelectorAll(MOTION_CARD_SELECTOR).forEach((element, index) => {
    element.classList.add("ui-motion-card");
    element.style.setProperty("--ui-motion-order", String(Math.min(index, MAX_STAGGERED_CARDS)));
  });
}

function markInteractiveElements(scope) {
  scope.querySelectorAll(MOTION_INTERACTIVE_SELECTOR).forEach((element) => {
    element.classList.add("ui-motion-interactive");
  });
}

function cleanupDetailsAnimation(details) {
  details.classList.remove("is-ui-motion-animating", "is-ui-motion-opening", "is-ui-motion-closing");
  details.style.height = "";
}

function animateDetailsOpen(details, summary) {
  details.classList.add("is-ui-motion-animating", "is-ui-motion-opening");
  details.style.height = `${summary.offsetHeight}px`;
  details.open = true;
  const expandedHeight = details.scrollHeight;
  window.requestAnimationFrame(() => {
    details.style.height = `${expandedHeight}px`;
  });
}

function animateDetailsClose(details, summary) {
  details.classList.add("is-ui-motion-animating", "is-ui-motion-closing");
  details.style.height = `${details.offsetHeight}px`;
  const collapsedHeight = summary.offsetHeight;
  window.requestAnimationFrame(() => {
    details.style.height = `${collapsedHeight}px`;
  });
}

function toggleDetailsWithMotion(details) {
  if (details.classList.contains("is-ui-motion-animating")) return;
  const summary = details.querySelector(":scope > summary");
  if (!summary) return;

  if (details.open) {
    animateDetailsClose(details, summary);
    return;
  }
  animateDetailsOpen(details, summary);
}

function enhanceDetailsMotion(scope) {
  scope.querySelectorAll(MOTION_DETAILS_SELECTOR).forEach((details) => {
    const summary = details.querySelector(":scope > summary");
    if (!summary || details.dataset.uiMotionBound === "true") return;
    details.dataset.uiMotionBound = "true";
    details.classList.add("ui-motion-details");
    summary.addEventListener("click", (event) => {
      if (isReducedMotion()) return;
      event.preventDefault();
      toggleDetailsWithMotion(details);
    });
    details.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "height") return;
      if (details.classList.contains("is-ui-motion-closing")) details.open = false;
      cleanupDetailsAnimation(details);
    });
  });
}

function synchronizeReducedMotionClass() {
  document.documentElement.classList.toggle("ui-motion-reduced", isReducedMotion());
}

export function prepareUiMotion(root, { screenName = "" } = {}) {
  if (!root) return;
  synchronizeReducedMotionClass();
  const scope = root.querySelector("#main-content") || root;
  scope.classList.add("ui-motion-scope");
  if (screenName) scope.dataset.motionScreen = screenName;
  markMotionCards(scope);
  markInteractiveElements(root);
  enhanceDetailsMotion(scope);

  if (isReducedMotion()) {
    scope.classList.add("is-ui-motion-visible");
    return;
  }
  window.requestAnimationFrame(() => {
    scope.classList.add("is-ui-motion-visible");
  });
}
