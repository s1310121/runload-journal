export const STORAGE_KEYS = Object.freeze({
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
