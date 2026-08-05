import { mergeJournalSettings, normalizeJournalSettings } from "../appSettings.js";
import { regionalViewLabel } from "../v27ResultPresentation.js";


export function jumpToResultSection(targetId, root = document) {
  const id = String(targetId || "").replace(/^#/, "");
  if (!id) return false;
  const target = root.getElementById ? root.getElementById(id) : root.querySelector?.(`#${id}`);
  if (!target) return false;
  const heading = target.matches?.("h1, h2, h3") ? target : target.querySelector?.("h1, h2, h3") || target;
  heading.setAttribute?.("tabindex", "-1");
  target.scrollIntoView?.({ block: "start", behavior: "auto" });
  heading.focus?.({ preventScroll: true });
  return true;
}

function bindResultSectionJumps() {
  document.querySelectorAll("[data-result-jump-target]").forEach((button) => {
    button.addEventListener("click", () => jumpToResultSection(button.dataset.resultJumpTarget));
  });
}

function bindRegionalViewTabs(services) {
  const card = document.querySelector("[data-regional-result-card]");
  if (!card) return;
  const tabs = [...card.querySelectorAll('[role="tab"][data-regional-view]')];
  const panels = [...card.querySelectorAll('[role="tabpanel"]')];
  const announcement = card.querySelector("[data-regional-view-announcement]");
  const status = card.querySelector(".result-card__heading .status-label");

  const activate = (tab, { moveFocus = false, persist = true } = {}) => {
    if (!tab) return;
    const viewId = String(tab.dataset.regionalView || "");
    tabs.forEach((candidate) => {
      const active = candidate === tab;
      candidate.setAttribute("aria-selected", active ? "true" : "false");
      candidate.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== `regional-panel-${viewId}`;
    });
    const label = regionalViewLabel(viewId);
    if (announcement) announcement.textContent = `${label}へ切り替えました。`;
    if (status) {
      const subtitle = {
        WITHIN_RUN_REGIONAL_EMPHASIS: "6部位平均=100",
        OWN_FLAT_REFERENCE_RATIO: "各部位の平坦=100",
        PERSONAL_USUAL_RATIO: "自分の過去中央値=100",
      }[viewId] || label;
      status.textContent = subtitle;
    }
    if (moveFocus) tab.focus();
    if (persist) {
      const current = normalizeJournalSettings(services.storage.settings.load());
      services.storage.settings.save(mergeJournalSettings(current, {
        selectedRegionalView: viewId,
      }));
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      }
      if (nextIndex == null) return;
      event.preventDefault();
      activate(tabs[nextIndex], { moveFocus: true });
    });
  });
}


function bindRegionalV1ViewToggle(services) {
  const card = document.querySelector("[data-regional-v1-card]");
  if (!card) return;
  const buttons = [...card.querySelectorAll("[data-regional-v1-view-button]")];
  const panels = [...card.querySelectorAll("[data-regional-v1-panel]")];
  const activate = (view) => {
    if (!["focus", "all"].includes(view)) return;
    card.dataset.regionalV1View = view;
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.regionalV1ViewButton === view)));
    panels.forEach((panel) => { panel.hidden = panel.dataset.regionalV1Panel !== view; });
    const current = normalizeJournalSettings(services.storage.settings.load());
    services.storage.settings.save(mergeJournalSettings(current, { regionalResultLastView: view }));
  };
  buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.regionalV1ViewButton)));
}

export function bindResult({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  if (experience?.record?.id) services.workflows.notebook.rememberViewedResult(experience.record.id);
  bindResultSectionJumps();
  bindRegionalViewTabs(services);
  bindRegionalV1ViewToggle(services);
}
