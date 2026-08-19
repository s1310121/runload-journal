export const STORAGE_KEYS = Object.freeze({
  records: "runner-load-a8-1d-candidate-v1-2-records",
  modelResultsV27: "runner-load-a8-1d-candidate-v1-2-whole-run-results",
  modelResultsRegionalV1: "runner-load-a8-1d-candidate-v1-2-regional-results",
  subjectiveFeedback: "runner-load-a8-1d-candidate-v1-2-subjective-feedback",
  plans: "runner-load-a8-1d-candidate-v1-2-plans",
  notebook: "runner-load-a8-1d-candidate-v1-2-notebook",
  profile: "runner-load-a8-1d-candidate-v1-2-profile",
  settings: "runner-load-a8-1d-candidate-v1-2-settings",
  draft: "runner-load-a8-1d-candidate-v1-2-draft",
  courses: "runner-load-a8-1d-candidate-v1-2-courses",
  backups: "runner-load-a8-1d-candidate-v1-2-backup",
  legacyImportBackup: "runner-load-a8-1d-candidate-v1-2-legacy-import-backup",
  corruptStorageBackup: "runner-load-a8-1d-candidate-v1-2-corrupt-storage-backup",
  historyUndo: "runner-load-a8-1d-candidate-v1-2-history-undo",
});

export const A8_V1_1_CANDIDATE_PRESERVED_STORAGE_KEYS = Object.freeze({
  records: "runner-load-a8-1d-candidate-v1-1-records",
  modelResultsV27: "runner-load-a8-1d-candidate-v1-1-whole-run-results",
  modelResultsRegionalV1: "runner-load-a8-1d-candidate-v1-1-regional-results",
  subjectiveFeedback: "runner-load-a8-1d-candidate-v1-1-subjective-feedback",
  plans: "runner-load-a8-1d-candidate-v1-1-plans",
  notebook: "runner-load-a8-1d-candidate-v1-1-notebook",
  profile: "runner-load-a8-1d-candidate-v1-1-profile",
  settings: "runner-load-a8-1d-candidate-v1-1-settings",
  draft: "runner-load-a8-1d-candidate-v1-1-draft",
  courses: "runner-load-a8-1d-candidate-v1-1-courses",
  backups: "runner-load-a8-1d-candidate-v1-1-backup",
  legacyImportBackup: "runner-load-a8-1d-candidate-v1-1-legacy-import-backup",
  corruptStorageBackup: "runner-load-a8-1d-candidate-v1-1-corrupt-storage-backup",
  historyUndo: "runner-load-a8-1d-candidate-v1-1-history-undo",
});

export const A7_CANDIDATE_PRESERVED_STORAGE_KEYS = Object.freeze({
  records: "runner-load-a7-final-candidate-v1-records",
  modelResultsV27: "runner-load-a7-final-candidate-v1-whole-run-results",
  modelResultsRegionalV1: "runner-load-a7-final-candidate-v1-regional-results",
  subjectiveFeedback: "runner-load-a7-final-candidate-v1-subjective-feedback",
  plans: "runner-load-a7-final-candidate-v1-plans",
  notebook: "runner-load-a7-final-candidate-v1-notebook",
  profile: "runner-load-a7-final-candidate-v1-profile",
  settings: "runner-load-a7-final-candidate-v1-settings",
  draft: "runner-load-a7-final-candidate-v1-draft",
  courses: "runner-load-a7-final-candidate-v1-courses",
  backups: "runner-load-a7-final-candidate-v1-backup",
  legacyImportBackup: "runner-load-a7-final-candidate-v1-legacy-import-backup",
  corruptStorageBackup: "runner-load-a7-final-candidate-v1-corrupt-storage-backup",
  historyUndo: "runner-load-a7-final-candidate-v1-history-undo",
});


export const FORMAL_CURRENT_PRESERVED_STORAGE_KEYS = Object.freeze({
  records: "runner-load-app-records-v1",
  modelResultsV27: "runner-load-app-model-results-v2.7",
  modelResultsRegionalV1: "runner-load-app-model-results-regional-v1",
  subjectiveFeedback: "runner-load-app-subjective-feedback-v1",
  plans: "runner-load-app-plans-v1",
  notebook: "runner-load-app-notebook-v1",
  profile: "runner-load-app-profile-v1",
  settings: "runner-load-app-settings-v1",
  draft: "runner-load-app-draft-v1",
  courses: "runner-load-app-courses-v1",
  backups: "runner-load-app-backup-v1",
  legacyImportBackup: "runner-load-app-legacy-import-backup-v1",
  corruptStorageBackup: "runner-load-app-corrupt-storage-backup-v1",
  historyUndo: "runner-load-app-history-undo-v1",
});

export const LEGACY_STORAGE_KEYS = Object.freeze({
  sessions: "body-part-load-sessions-v3",
  feedback: "body-part-load-feedback-v3",
  ui: "body-part-load-ui-v3",
  draft: "body-part-load-draft-v3",
  backups: "body-part-load-backups-v1",
  reviewPlans: "body-part-load-review-plans-v1",
  preRun: "body-part-load-prerun-v1",
  runPlans: "body-part-load-run-plans-v1",
  profile: "body-part-load-profile-v1",
  courses: "body-part-load-courses-v1",
  personalization: "body-part-load-personalization-v3",
  notebook: "body-part-load-record-notebook-v1",
});

export const USER_DATA_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.records,
  STORAGE_KEYS.modelResultsV27,
  STORAGE_KEYS.modelResultsRegionalV1,
  STORAGE_KEYS.subjectiveFeedback,
  STORAGE_KEYS.plans,
  STORAGE_KEYS.notebook,
  STORAGE_KEYS.profile,
  STORAGE_KEYS.settings,
  STORAGE_KEYS.draft,
  STORAGE_KEYS.courses,
]);

export const INTERNAL_RECOVERY_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.backups,
  STORAGE_KEYS.legacyImportBackup,
  STORAGE_KEYS.corruptStorageBackup,
  STORAGE_KEYS.historyUndo,
]);

export const CURRENT_APP_REMOVABLE_STORAGE_KEYS = Object.freeze([
  ...USER_DATA_STORAGE_KEYS,
  ...INTERNAL_RECOVERY_STORAGE_KEYS,
]);
