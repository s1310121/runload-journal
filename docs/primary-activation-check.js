import { createApplicationServices } from "./core/applicationServices.js";
import { createMemoryStorage } from "./core/storage/storageGateway.js";
import { STORAGE_KEYS } from "./core/storage/storageKeys.js";
import {
  PRIMARY_REGIONAL_V2_MODEL_VERSION,
  PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,
  validatePrimaryRegionalV2ResultRecord,
} from "./core/model/nextPrimaryR12Candidate/primaryRegionalV2ResultService.js";

const out = document.querySelector("#output");
const show = (payload) => {
  out.textContent = JSON.stringify(payload, null, 2);
  out.classList.toggle("pass", payload.result === "PASS");
  out.classList.toggle("fail", payload.result === "FAIL");
};
const durationFor = (distanceKm, speedMps) => distanceKm * 1000 / (speedMps * 60);
const flatCourse = () => ({ id:"primary-check-course", name:"平坦", routePattern:"LOOP", gradeInputMode:"FLAT", gradeKnowledge:"KNOWN_FLAT", surfaceInputMode:"SINGLE", surfaceWetSlipState:"DRY", pavedPercent:100, trackPercent:0, treadmillPercent:0, soilPercent:0, trailPercent:0, naturalGrassPercent:0, artificialTurfPercent:0, sandPercent:0, modelSurfaceClass:"REF_HARD_EVEN_STABLE" });
const record = (id) => ({
  id, date:"2026-08-27", activityType:"run", distanceKm:5, durationMinutes:durationFor(5,3), steps:5000, stepsProvenance:"DEVICE_MEASURED", runningFormat:"CONTINUOUS_RUN", perceivedExertion:5, rpeProvenance:"USER_REPORTED", memo:"Primary browser check", course:flatCourse(),
  personalContext:{shoeId:"check-shoe",shoeLabel:"通常",shoeType:"usual_training",shoeSoftness:"normal",footPlacement:"heel",rhythmStride:"usual",focusTags:["posture"],freeNote:"check",equipmentTags:["watch"],equipmentNote:"check"},
  environmentContext:{weather:"CLEAR",temperatureC:24,windSummary:"LIGHT",environmentNote:"dry"}, recoveryContext:{sleepSummary:"GOOD",nutritionHydrationSummary:"OK",lifestyleNote:"normal"}, reflectionContext:{postRunReflection:"steady",perceivedDifference:"same",reflectionKeyPoint:"pace",nextCheckPoint:"repeat"}, consultationContext:{consultationTarget:"coach",consultationQuestion:"form",consultationDataSelection:["current-result"]}, planOutcome:{status:"completed",reason:"course",reasonNote:"none",plannedDistanceKm:5,plannedDurationMinutes:30,plannedCourseSnapshot:flatCourse(),planNote:"plan"},
});
const feedback = { checkStatus:"none_reported" };
const profile = { heightCm:170, weightKg:60, ageBand:"18-29", sex:"male", runningStartDateOrBand:"3 months", experienceSelfAssessment:"beginner", runningGoalTags:["health"] };

function primaryResultsFromStorage(storage) {
  try { return (JSON.parse(storage.getItem(STORAGE_KEYS.modelResultsRegionalV1) || "[]") || []).filter((x) => x?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION); }
  catch { return []; }
}

document.querySelector("#self-test").addEventListener("click", () => {
  try {
    const storage = createMemoryStorage();
    const services = createApplicationServices({ storage });
    const saved = services.workflows.records.saveRecordAndFeedback(record("primary-browser-self-test"), feedback, profile);
    const resultRecord = saved.primaryRegionalV2ResultRecord || saved.experience?.regionalV1ResultRecord || null;
    const validation = resultRecord ? validatePrimaryRegionalV2ResultRecord(resultRecord) : {valid:false};
    const repairs = resultRecord?.input_trace?.entries?.filter((x) => x.traceAction === "R12_REPAIR_REQUIRED")?.length || 0;
    const checks = {
      saveOK: saved.ok === true,
      snapshotPrimary: saved.record?.regionalModelSnapshot?.snapshotId === "PRIMARY_REGIONAL_V2",
      modelVersion: resultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION,
      outputSemanticVersion: resultRecord?.output_semantic_version === PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,
      resultValid: validation.valid === true,
      regions12: resultRecord?.result?.regions?.length === 12,
      trace93: resultRecord?.input_trace?.count === 93 && resultRecord?.input_trace?.entries?.length === 93,
      repairs19: repairs === 19,
      mainRepositoryStored: primaryResultsFromStorage(storage).length === 1,
    };
    show({result:Object.values(checks).every(Boolean)?"PASS":"FAIL",checks});
  } catch (error) { show({result:"FAIL",error:String(error?.stack || error)}); }
});

document.querySelector("#persistence-test").addEventListener("click", () => {
  try {
    const services = createApplicationServices({ storage: window.localStorage });
    const experiences = services.workflows.records.loadAllExperiences();
    const latestPrimary = [...experiences].reverse().find((x) => x?.regionalV1ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) || null;
    const formalResults = primaryResultsFromStorage(window.localStorage);
    const formalMatch = latestPrimary ? formalResults.find((x) => x.record_id === latestPrimary.record.id) : null;
    const validation = formalMatch ? validatePrimaryRegionalV2ResultRecord(formalMatch) : {valid:false};
    const checks = {
      normalAppPrimaryExists: Boolean(latestPrimary),
      formalRegionalRepositoryHasPrimary: Boolean(formalMatch),
      lastResultOK: validation.valid === true,
      primarySnapshot: latestPrimary?.record?.regionalModelSnapshot?.snapshotId === "PRIMARY_REGIONAL_V2",
      candidateNamespaceNotRequired: Boolean(formalMatch),
    };
    show({result:Object.values(checks).every(Boolean)?"PASS":"FAIL",checks,recordId:latestPrimary?.record?.id || null});
  } catch (error) { show({result:"FAIL",error:String(error?.stack || error)}); }
});

document.querySelector("#backup-test").addEventListener("click", () => {
  try {
    const services = createApplicationServices({ storage: window.localStorage });
    const exported = services.storage.backup.tryExportBackupText();
    const inspection = exported.ok ? services.storage.backup.inspectBackupText(exported.text) : null;
    const parsed = exported.ok ? JSON.parse(exported.text) : null;
    const results = parsed?.data?.[STORAGE_KEYS.modelResultsRegionalV1] || [];
    const primary = results.filter((x) => x?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION);
    const checks = {
      exportOK: exported.ok === true,
      primaryResultIncluded: primary.length > 0,
      inspectionCanRestore: inspection?.canRestore === true,
      inspectionStatusAccepted: ["SUPPORTED", "REVIEW_REQUIRED"].includes(inspection?.status),
      blocking0: inspection?.summary?.blockingCount === 0,
    };
    show({result:Object.values(checks).every(Boolean)?"PASS":"FAIL",checks,restoreStatus:inspection?.status || null,primaryResultCount:primary.length,warningCount:inspection?.summary?.warningCount ?? null});
  } catch (error) { show({result:"FAIL",error:String(error?.stack || error)}); }
});
