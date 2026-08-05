import { registerPwaServiceWorker } from "./core/pwaRegistration.js";
import { createApplicationServices } from "./core/applicationServices.js";
import { createAppRouter } from "./ui/appRouter.js";
import { focusScreenHeading, renderAppShell } from "./ui/appShell.js";
import { applyJournalSettings } from "./ui/appSettings.js";
import { APP_GUIDE_VERSION, DEFAULT_GUIDE_SECTION, normalizeGuideSection, shouldOpenGuide, withGuideVersionSeen } from "./ui/guideContent.js";
import { bindAppShellInteractions } from "./ui/shellInteractions.js";
import { bindScreenInteractions } from "./ui/screenInteractions.js";
import { prepareUiMotion } from "./ui/uiMotion.js";
import { bindScreenTutorial } from "./ui/screenTutorial.js";
import { handleRecordInputRouteChange, resolveRecordInputReturnState } from "./ui/recordInputWorkspace.js";
import { renderHomeScreen } from "./screens/homeScreen.js";
import { renderRecordInputScreen } from "./screens/recordInputScreen.js";
import { renderCourseLibraryScreen } from "./screens/courseLibraryScreen.js";
import { renderCourseEditorScreen } from "./screens/courseEditorScreen.js";
import { renderSubjectiveInputScreen } from "./screens/subjectiveInputScreen.js";
import { renderPersonalInputScreen } from "./screens/personalInputScreen.js";
import { renderResultScreen } from "./screens/resultScreen.js";
import { renderBodyPartDetailScreen } from "./screens/bodyPartDetailScreen.js";
import { renderHistoryScreen } from "./screens/historyScreen.js";
import { renderPlanScreen } from "./screens/planScreen.js";
import { renderConsultationScreen } from "./screens/consultationScreen.js";
import { renderColumnScreen } from "./screens/columnScreen.js";
import { renderNotebookScreen } from "./screens/notebookScreen.js";
import { renderSettingsScreen } from "./screens/settingsScreen.js";
import { renderActivationScreen } from "./screens/activationScreen.js";
import { renderSupportGuidanceScreen } from "./screens/supportGuidanceScreen.js";
import { renderPrivacyScreen } from "./screens/privacyScreen.js";

const screenRenderers = {
  home: renderHomeScreen,
  "record-input": renderRecordInputScreen,
  "course-library": renderCourseLibraryScreen,
  "course-editor": renderCourseEditorScreen,
  "subjective-input": renderSubjectiveInputScreen,
  "personal-input": renderPersonalInputScreen,
  result: renderResultScreen,
  "body-part-detail": renderBodyPartDetailScreen,
  history: renderHistoryScreen,
  activation: renderActivationScreen,
  "support-guidance": renderSupportGuidanceScreen,
  privacy: renderPrivacyScreen,
  plan: renderPlanScreen,
  consultation: renderConsultationScreen,
  column: renderColumnScreen,
  notebook: renderNotebookScreen,
  settings: renderSettingsScreen,
};

const routeAliases = Object.freeze({
  "history-detail": (parameters) => {
    const next = new URLSearchParams(parameters);
    next.set("view", "trends");
    return Object.freeze({ screen: "history", parameters: next });
  },
  "weekly-review": (parameters) => {
    const next = new URLSearchParams(parameters);
    next.set("view", "trends");
    next.set("period", "7");
    if (!next.get("anchorDate") && next.get("date")) next.set("anchorDate", next.get("date"));
    next.delete("date");
    return Object.freeze({ screen: "history", parameters: next });
  },
  finish: () => Object.freeze({
    screen: "settings",
    parameters: new URLSearchParams("section=data"),
  }),
});

const appRoot = document.getElementById("app");
const applicationServices = createApplicationServices();
const initialSettings = applicationServices.storage.settings.load();
applyJournalSettings(initialSettings);
let currentLocation = Object.freeze({ screen: "home", parameters: new URLSearchParams() });
let guideOpen = shouldOpenGuide(initialSettings);
let guideSection = DEFAULT_GUIDE_SECTION;
let guideFirstVisit = guideOpen;
let router;

function saveGuideVersionSeen() {
  const currentSettings = applicationServices.storage.settings.load();
  applicationServices.storage.settings.save(withGuideVersionSeen(currentSettings));
}

function renderCurrentLocation({ focusHeading = true, focusSelector = "" } = {}) {
  applyJournalSettings(applicationServices.storage.settings.load());
  const screenName = currentLocation.screen;
  const recordInputReturnState = screenName === "record-input"
    ? resolveRecordInputReturnState(currentLocation)
    : null;
  const renderSelectedScreen = screenRenderers[screenName] ?? screenRenderers.home;
  const latestExperience = applicationServices.workflows.records.loadLatestExperience();
  appRoot.innerHTML = renderAppShell({
    currentScreen: screenName,
    currentLocation,
    hasResult: Boolean(latestExperience),
    guide: {
      open: guideOpen,
      section: guideSection,
      firstVisit: guideFirstVisit,
      version: APP_GUIDE_VERSION,
    },
    screenContent: renderSelectedScreen({
      services: applicationServices,
      context: currentLocation,
    }),
  });
  document.body.classList.toggle("has-open-dialog", guideOpen);
  document.title = `${document.querySelector("#main-content h1")?.textContent ?? "RunLoad Journal"} — RunLoad Journal`;
  prepareUiMotion(appRoot, { screenName });

  bindAppShellInteractions({
    root: appRoot,
    onOpenGuide: (section) => {
      guideOpen = true;
      guideFirstVisit = false;
      guideSection = normalizeGuideSection(section);
      renderCurrentLocation({ focusHeading: false });
    },
    onCloseGuide: () => {
      saveGuideVersionSeen();
      guideOpen = false;
      guideFirstVisit = false;
      renderCurrentLocation({ focusHeading: false, focusSelector: "#feature-menu-button" });
    },
    onSelectGuideSection: (section) => {
      guideSection = normalizeGuideSection(section);
      renderCurrentLocation({ focusHeading: false, focusSelector: `#guide-tab-${guideSection}` });
    },
  });
  bindScreenInteractions({
    screenName,
    services: applicationServices,
    router,
    context: currentLocation,
    returnState: recordInputReturnState,
    rerender: () => renderCurrentLocation({ focusHeading: false }),
  });
  bindScreenTutorial({ root: appRoot, screenName });

  window.requestAnimationFrame(() => {
    const requestedFocusSelector = focusSelector || recordInputReturnState?.focusSelector || "";
    if (requestedFocusSelector) {
      const focusTarget = document.querySelector(requestedFocusSelector);
      if (focusTarget) {
        focusTarget.focus();
        return;
      }
    }
    if (guideOpen) {
      document.querySelector("[data-guide-panel]")?.focus();
      return;
    }
    if (focusHeading) focusScreenHeading();
  });
}

function renderScreen(location) {
  handleRecordInputRouteChange(currentLocation.screen, location.screen);
  currentLocation = location;
  renderCurrentLocation();
}

router = createAppRouter({
  availableScreens: Object.keys(screenRenderers),
  routeAliases,
  onScreenChange: renderScreen,
});

router.start();
registerPwaServiceWorker();
