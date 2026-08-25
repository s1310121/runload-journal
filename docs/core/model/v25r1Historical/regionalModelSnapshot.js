export const REGIONAL_MODEL_SNAPSHOT_IDS = Object.freeze({
  legacyPhase4: "PHASE4_LEGACY",
  fcrV19: "FCR_V1_9",
  v25r1: "FCR_V2_5R1",
});

export const CURRENT_REGIONAL_MODEL_SNAPSHOT = Object.freeze({
  snapshotId: REGIONAL_MODEL_SNAPSHOT_IDS.v25r1,
  modelVersion: "runload-regional-model-fcr-v2.5r1",
  outputSemanticVersion: "runload-regional-output-semantics-fcr-v2.5r1",
  authorityVersion: "RunLoad-NextCurrent-Recovery-V2.5R1-PhaseD-G-20260822",
});

export const FCR_V19_REGIONAL_MODEL_SNAPSHOT = Object.freeze({
  snapshotId: REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19,
  modelVersion: "runload-regional-model-fcr-v1.9-app-v1.0",
  outputSemanticVersion: "runload-regional-output-semantics-fcr-v1.9-app-v1.0",
  authorityVersion: "RunLoad-A9-FCR-Total-Audit-20260821-V2.0",
});

export const LEGACY_PHASE4_REGIONAL_MODEL_SNAPSHOT = Object.freeze({
  snapshotId: REGIONAL_MODEL_SNAPSHOT_IDS.legacyPhase4,
  modelVersion: "runload-regional-model-v1.1-a8-1d-candidate-v1.2",
  outputSemanticVersion: "runload-regional-output-semantics-1.1-a8-1d-candidate-v1.2",
  authorityVersion: "RunLoad-A9-Provisional-Authority-Expansion-G07-Reconciliation-20260821-V2.0",
});

export function normalizeRegionalModelSnapshot(value) {
  const source = value && typeof value === "object" ? value : null;
  if (!source) return null;
  const snapshotId = String(source.snapshotId || "");
  if (snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.v25r1) return CURRENT_REGIONAL_MODEL_SNAPSHOT;
  if (snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19) return FCR_V19_REGIONAL_MODEL_SNAPSHOT;
  if (snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.legacyPhase4) return LEGACY_PHASE4_REGIONAL_MODEL_SNAPSHOT;
  return null;
}

export function regionalModelSnapshotForRecord(record = {}) {
  const normalized = normalizeRegionalModelSnapshot(record.regionalModelSnapshot);
  return normalized || LEGACY_PHASE4_REGIONAL_MODEL_SNAPSHOT;
}

export function stampCurrentRegionalModel(record = {}) {
  return Object.freeze({ ...record, regionalModelSnapshot: CURRENT_REGIONAL_MODEL_SNAPSHOT });
}

export function isCurrentRegionalModelRecord(record = {}) {
  return regionalModelSnapshotForRecord(record).snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.v25r1;
}
export function isFcrV19RegionalModelRecord(record = {}) {
  return regionalModelSnapshotForRecord(record).snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19;
}
export function isLegacyPhase4RegionalModelRecord(record = {}) {
  return regionalModelSnapshotForRecord(record).snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.legacyPhase4;
}
export function regionalModelGenerationForRecord(record = {}) {
  const snapshotId = regionalModelSnapshotForRecord(record).snapshotId;
  if (snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.v25r1) return "V2_5R1";
  if (snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19) return "FCR_V1_9";
  return "PHASE4_LEGACY";
}
