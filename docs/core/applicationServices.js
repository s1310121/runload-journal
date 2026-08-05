import { createStorageGateway } from "./storage/storageGateway.js";
import { createRecordRepository } from "./storage/recordRepository.js";
import { createModelResultV27Repository } from "./storage/modelResultV27Repository.js";
import { createModelResultRegionalV1Repository } from "./storage/modelResultRegionalV1Repository.js";
import { createSubjectiveFeedbackRepository } from "./storage/subjectiveFeedbackRepository.js";
import { createPlanRepository } from "./storage/planRepository.js";
import { createNotebookRepository } from "./storage/notebookRepository.js";
import { createProfileRepository, createSettingsRepository, createDraftRepository } from "./storage/simpleValueRepositories.js";
import { createBackupService } from "./storage/backupService.js";
import { createCourseRepository } from "./storage/courseRepository.js";
import { createLegacyDataMigration } from "./storage/legacyDataMigration.js";
import { evaluateSupportDecision, shouldBlockNormalPlanSuggestions, shouldPrioritizeOfficialHelp } from "./safety/supportDecision.js";
import { buildPublicHelpGuidance } from "./safety/publicHelpGuidance.js";
import { normalizeSubjectiveFeedback } from "./safety/subjectiveFeedback.js";
import { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } from "./safety/inputValidation.js";
import { createRecordWorkflow } from "./workflows/recordWorkflow.js";
import { createHistoryWorkflow } from "./history/historyWorkflow.js";
import { createPlanWorkflow } from "./planning/planWorkflow.js";
import { createColumnService } from "./column/columnService.js";
import { createNotebookWorkflow } from "./notebook/notebookWorkflow.js";
import { createDataManagementService } from "./dataManagement/dataManagementService.js";
import {
  buildConsultationReport,
  createShortConsultationMemo,
  createStandardConsultationText,
  createDetailedConsultationText,
} from "./consultation/consultationReport.js";
import {
  buildDeterministicConsultation,
  CONSULTATION_PURPOSES,
  DETERMINISTIC_CONSULTATION_VERSION,
} from "./consultation/deterministicConsultation.js";
import { adaptRecordToV27Session } from "./model/v27/v27InputAdapter.js";
import {
  assertV27ResultSemantics,
  calculateV27Session,
} from "./model/v27/v27Model.js";
import { createV27ResultRecord } from "./model/v27/v27ResultService.js";
import { createRegionalV1ResultRecord } from "./model/regionalV1/regionalV1ResultService.js";
import { adaptStoredRecordToRegionalV1Ui } from "./model/regionalV1/regionalV1InputAdapter.js";
import { adaptPrototypeRecord, buildRegionalEngineInput, calculateRegionalLoad, buildBodyMapPayload } from "./model/regionalV1/engine/index.js";

export function createApplicationServices(options = {}) {
  const gateway = options.gateway || createStorageGateway(options.storage);
  const records = createRecordRepository(gateway);
  const modelResultsV27 = createModelResultV27Repository(gateway);
  const modelResultsRegionalV1 = createModelResultRegionalV1Repository(gateway);
  const subjectiveFeedback = createSubjectiveFeedbackRepository(gateway);
  const plans = createPlanRepository(gateway);
  const notebook = createNotebookRepository(gateway);
  const profile = createProfileRepository(gateway);
  const recordWorkflow = createRecordWorkflow({
    gateway,
    recordsRepository: records,
    subjectiveFeedbackRepository: subjectiveFeedback,
    profileRepository: profile,
    modelResultV27Repository: modelResultsV27,
    modelResultRegionalV1Repository: modelResultsRegionalV1,
  });

  const services = {
    model: Object.freeze({
      regionalV1: Object.freeze({ adaptStoredRecordToRegionalV1Ui, adaptPrototypeRecord, buildRegionalEngineInput, calculateRegionalLoad, buildBodyMapPayload, createRegionalV1ResultRecord }),
      v27: Object.freeze({
        adaptRecordToV27Session,
        calculateV27Session,
        assertV27ResultSemantics,
        createV27ResultRecord,
      }),
    }),
    safety: Object.freeze({
      evaluateSupportDecision,
      shouldBlockNormalPlanSuggestions,
      shouldPrioritizeOfficialHelp,
      buildPublicHelpGuidance,
      normalizeSubjectiveFeedback,
      normalizeRunningRecord,
      validateRunningRecord,
      validateRunningRecordInput,
    }),
    storage: Object.freeze({
      gateway,
      records,
      modelResultsV27,
      modelResultsRegionalV1,
      subjectiveFeedback,
      plans,
      notebook,
      profile,
      settings: createSettingsRepository(gateway),
      draft: createDraftRepository(gateway),
      courses: createCourseRepository(gateway),
      backup: createBackupService(gateway),
      legacyMigration: createLegacyDataMigration(gateway),
    }),
    workflows: {},
    consultation: Object.freeze({
      buildConsultationReport,
      createShortConsultationMemo,
      createStandardConsultationText,
      createDetailedConsultationText,
      buildDeterministicConsultation,
      purposes: CONSULTATION_PURPOSES,
      deterministicVersion: DETERMINISTIC_CONSULTATION_VERSION,
    }),
    column: createColumnService(),
    dataManagement: createDataManagementService(gateway),
  };
  services.workflows.records = recordWorkflow;
  services.workflows.history = createHistoryWorkflow({
    gateway,
    recordsRepository: records,
    modelResultV27Repository: modelResultsV27,
    modelResultRegionalV1Repository: modelResultsRegionalV1,
    subjectiveFeedbackRepository: subjectiveFeedback,
    planRepository: plans,
    notebookRepository: notebook,
  });
  services.workflows.plans = createPlanWorkflow({ services, planRepository: plans });
  services.workflows.notebook = createNotebookWorkflow({ services, notebookRepository: notebook });
  services.workflows = Object.freeze(services.workflows);
  return Object.freeze(services);
}
