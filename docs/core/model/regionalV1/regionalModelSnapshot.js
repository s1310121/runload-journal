export const REGIONAL_MODEL_SNAPSHOT_IDS = Object.freeze({
  newModelV1: "NEW_MODEL_V1",
  v26c1: "FCR_V2_6C1",
  v25r1: "FCR_V2_5R1",
  fcrV19: "FCR_V1_9",
  legacyPhase4: "PHASE4_LEGACY",
});

export const CURRENT_REGIONAL_MODEL_SNAPSHOT = Object.freeze({
  snapshotId: REGIONAL_MODEL_SNAPSHOT_IDS.newModelV1,
  modelVersion: "runload-new-model-v1.0",
  outputSemanticVersion: "runload-new-model-output-semantics-v1.0",
  authorityVersion: "RunLoad-NewModel-Authority-NM-AUTH-055-100",
});
export const V26C1_REGIONAL_MODEL_SNAPSHOT = Object.freeze({
  snapshotId: REGIONAL_MODEL_SNAPSHOT_IDS.v26c1,
  modelVersion: "runload-regional-model-fcr-v2.6c1",
  outputSemanticVersion: "runload-regional-output-semantics-fcr-v2.6c1",
  authorityVersion: "RunLoad-V2.6C1-Corrective-Scientific-Authority-20260823",
});
export const V25R1_REGIONAL_MODEL_SNAPSHOT = Object.freeze({snapshotId:REGIONAL_MODEL_SNAPSHOT_IDS.v25r1,modelVersion:"runload-regional-model-fcr-v2.5r1",outputSemanticVersion:"runload-regional-output-semantics-fcr-v2.5r1",authorityVersion:"RunLoad-NextCurrent-Recovery-V2.5R1-PhaseD-G-20260822"});
export const FCR_V19_REGIONAL_MODEL_SNAPSHOT = Object.freeze({snapshotId:REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19,modelVersion:"runload-regional-model-fcr-v1.9-app-v1.0",outputSemanticVersion:"runload-regional-output-semantics-fcr-v1.9-app-v1.0",authorityVersion:"RunLoad-A9-FCR-Total-Audit-20260821-V2.0"});
export const LEGACY_PHASE4_REGIONAL_MODEL_SNAPSHOT = Object.freeze({snapshotId:REGIONAL_MODEL_SNAPSHOT_IDS.legacyPhase4,modelVersion:"runload-regional-model-v1.1-a8-1d-candidate-v1.2",outputSemanticVersion:"runload-regional-output-semantics-1.1-a8-1d-candidate-v1.2",authorityVersion:"RunLoad-A9-Provisional-Authority-Expansion-G07-Reconciliation-20260821-V2.0"});

export function normalizeRegionalModelSnapshot(value){const s=value&&typeof value==="object"?value:null;if(!s)return null;switch(String(s.snapshotId||"")){case REGIONAL_MODEL_SNAPSHOT_IDS.newModelV1:return CURRENT_REGIONAL_MODEL_SNAPSHOT;case REGIONAL_MODEL_SNAPSHOT_IDS.v26c1:return V26C1_REGIONAL_MODEL_SNAPSHOT;case REGIONAL_MODEL_SNAPSHOT_IDS.v25r1:return V25R1_REGIONAL_MODEL_SNAPSHOT;case REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19:return FCR_V19_REGIONAL_MODEL_SNAPSHOT;case REGIONAL_MODEL_SNAPSHOT_IDS.legacyPhase4:return LEGACY_PHASE4_REGIONAL_MODEL_SNAPSHOT;default:return null;}}
export function regionalModelSnapshotForRecord(record={}){return normalizeRegionalModelSnapshot(record.regionalModelSnapshot)||LEGACY_PHASE4_REGIONAL_MODEL_SNAPSHOT;}
export function stampCurrentRegionalModel(record={}){return Object.freeze({...record,regionalModelSnapshot:CURRENT_REGIONAL_MODEL_SNAPSHOT});}
export function isCurrentRegionalModelRecord(record={}){return isNewModelV1RegionalModelRecord(record);}
export function isNewModelV1RegionalModelRecord(record={}){return regionalModelSnapshotForRecord(record).snapshotId===REGIONAL_MODEL_SNAPSHOT_IDS.newModelV1;}
export function isV26C1RegionalModelRecord(record={}){return regionalModelSnapshotForRecord(record).snapshotId===REGIONAL_MODEL_SNAPSHOT_IDS.v26c1;}
export function isV25R1RegionalModelRecord(record={}){return regionalModelSnapshotForRecord(record).snapshotId===REGIONAL_MODEL_SNAPSHOT_IDS.v25r1;}
export function isFcrV19RegionalModelRecord(record={}){return regionalModelSnapshotForRecord(record).snapshotId===REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19;}
export function isLegacyPhase4RegionalModelRecord(record={}){return regionalModelSnapshotForRecord(record).snapshotId===REGIONAL_MODEL_SNAPSHOT_IDS.legacyPhase4;}
export function regionalModelGenerationForRecord(record={}){const id=regionalModelSnapshotForRecord(record).snapshotId;if(id===REGIONAL_MODEL_SNAPSHOT_IDS.newModelV1)return "NEW_MODEL_V1";if(id===REGIONAL_MODEL_SNAPSHOT_IDS.v26c1)return "V2_6C1";if(id===REGIONAL_MODEL_SNAPSHOT_IDS.v25r1)return "V2_5R1";if(id===REGIONAL_MODEL_SNAPSHOT_IDS.fcrV19)return "FCR_V1_9";return "PHASE4_LEGACY";}
