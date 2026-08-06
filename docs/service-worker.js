const CACHE_NAME = "runload-journal-current-v1-4-9-20260806-cache";
const PRECACHE_URLS = [
  "./app.js",
  "./core/applicationServices.js",
  "./core/column/columnService.js",
  "./core/consultation/consultationReport.js",
  "./core/consultation/deterministicConsultation.js",
  "./core/dataManagement/dataManagementService.js",
  "./core/history/historyWorkflow.js",
  "./core/model/bodyProfileAdjustment.js",
  "./core/model/calculateBodyPartDistribution.js",
  "./core/model/calculateDerivedInputs.js",
  "./core/model/calculateLoadModel.js",
  "./core/model/calculateTotalLoad.js",
  "./core/model/modelConfiguration.js",
  "./core/model/modelConstants.js",
  "./core/model/modelInputAdapter.js",
  "./core/model/numberUtilities.js",
  "./core/model/v27/bodyAreaTaxonomy.js",
  "./core/model/v27/v27Constants.js",
  "./core/model/v27/v27InputAdapter.js",
  "./core/model/v27/v27Math.js",
  "./core/model/v27/v27Model.js",
  "./core/model/v27/v27Personal.js",
  "./core/model/v27/v27ResultService.js",
  "./core/notebook/notebookContinuity.js",
  "./core/notebook/observationLoop.js",
  "./core/notebook/notebookWorkflow.js",
  "./core/personal/personalContext.js",
  "./core/personal/runningGoalSupport.js",
  "./core/planning/planPreviewV27.js",
  "./core/planning/planWorkflow.js",
  "./core/privacy/privacyInventory.js",
  "./core/pwaRegistration.js",
  "./core/safety/inputSafety.js",
  "./core/safety/inputValidation.js",
  "./core/safety/publicHelpGuidance.js",
  "./core/safety/rpeProvenance.js",
  "./core/safety/subjectiveFeedback.js",
  "./core/safety/supportDecision.js",
  "./core/storage/backupService.js",
  "./core/storage/restoreInspection.js",
  "./core/storage/collectionRepository.js",
  "./core/storage/courseRepository.js",
  "./core/storage/legacyDataMigration.js",
  "./core/storage/modelResultV27Repository.js",
  "./core/storage/notebookRepository.js",
  "./core/storage/planRepository.js",
  "./core/storage/recordRepository.js",
  "./core/storage/simpleValueRepositories.js",
  "./core/storage/storageGateway.js",
  "./core/storage/storageKeys.js",
  "./core/storage/subjectiveFeedbackRepository.js",
  "./core/workflows/recordWorkflow.js",
  "./data/columnData.js",
  "./data/evidenceGovernanceData.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./reset.html",
  "./reset.js",
  "./screens/activationScreen.js",
  "./screens/bodyPartDetailScreen.js",
  "./screens/columnScreen.js",
  "./screens/consultationScreen.js",
  "./screens/courseEditorScreen.js",
  "./screens/courseLibraryScreen.js",
  "./screens/historyScreen.js",
  "./screens/homeScreen.js",
  "./screens/notebookScreen.js",
  "./screens/personalInputScreen.js",
  "./screens/planScreen.js",
  "./screens/privacyScreen.js",
  "./screens/recordInputScreen.js",
  "./screens/resultScreen.js",
  "./screens/settingsScreen.js",
  "./screens/subjectiveInputScreen.js",
  "./screens/supportGuidanceScreen.js",
  "./service-worker.js",
  "./styles/base.css",
  "./styles/components.css",
  "./styles/layout.css",
  "./styles/screens.css",
  "./styles/tokens.css",
  "./ui/appRouter.js",
  "./ui/appShell.js",
  "./ui/appSettings.js",
  "./ui/bodyRegionTerminology.js",
  "./ui/commonComponents.js",
  "./ui/consultationDraftState.js",
  "./ui/consultationPresentation.js",
  "./ui/coursePresentation.js",
  "./ui/externalCourseCheckSupport.js",
  "./ui/guideContent.js",
  "./ui/historyPresentation.js",
  "./ui/hierarchicalExplanation.js",
  "./ui/interactions/browserUtilities.js",
  "./ui/interactions/columnInteractions.js",
  "./ui/interactions/consultationInteractions.js",
  "./ui/interactions/courseInteractions.js",
  "./ui/interactions/formUtilities.js",
  "./ui/interactions/gradeDomainConfirmation.js",
  "./ui/interactions/historyInteractions.js",
  "./ui/interactions/notebookInteractions.js",
  "./ui/interactions/personalInputInteractions.js",
  "./ui/interactions/planInteractions.js",
  "./ui/interactions/recordInputInteractions.js",
  "./ui/interactions/resultInteractions.js",
  "./ui/interactions/settingsInteractions.js",
  "./ui/interactions/subjectiveInputInteractions.js",
  "./ui/personalContextPresentation.js",
  "./ui/planPresentation.js",
  "./ui/recordInputWorkspace.js",
  "./ui/recordPresentation.js",
  "./ui/restorePreviewPresentation.js",
  "./ui/resultPresentation.js",
  "./ui/screenArchitecture.js",
  "./ui/screenInteractions.js",
  "./ui/shellInteractions.js",
  "./ui/screenTutorial.js",
  "./ui/subjectivePresentation.js",
  "./ui/uiMotion.js",
  "./ui/v27ResultPresentation.js",
  "./core/model/regionalV1/regionalV1InputAdapter.js",
  "./core/model/regionalV1/regionalV1ResultService.js",
  "./core/storage/modelResultRegionalV1Repository.js",
  "./ui/regionalV1Presentation.js",
  "./core/model/regionalV1/engine/adapter.js",
  "./core/model/regionalV1/engine/a3-sources.js",
  "./core/model/regionalV1/engine/a4-sources.js",
  "./core/model/regionalV1/engine/bodymap.js",
  "./core/model/regionalV1/engine/data.js",
  "./core/model/regionalV1/engine/engine-input.js",
  "./core/model/regionalV1/engine/engine.js",
  "./core/model/regionalV1/engine/index.js",
  "./core/model/regionalV1/engine/model.js",
  "./core/model/regionalV1/engine/presets.js",
  "./core/model/regionalV1/engine/sha256.js",
  "./core/model/regionalV1/engine/utils.js",
  "./core/model/regionalV1/engine/validation.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => (key.startsWith("running-journal-") || key.startsWith("runload-journal-")) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const PRECACHE_PATHS = new Set(PRECACHE_URLS.map((path) => new URL(path, self.location).pathname));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (!PRECACHE_PATHS.has(url.pathname)) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response;
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
