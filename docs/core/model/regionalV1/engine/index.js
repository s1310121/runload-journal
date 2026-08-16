export { adaptPrototypeRecord, validateFormalInputBundle } from "./adapter.js";
export { buildRegionalEngineInput } from "./engine-input.js";
export { calculateRegionalLoad } from "./engine.js";
export { buildBodyMapPayload } from "./bodymap.js";
export { evaluateAuthorityScenario, evaluateRegionCondition, resolveParameters } from "./model.js";
export {
  validatePrototypeRecordInput,
  validateRegionalEngineInputSemantics,
  validateRegionalEngineOutput,
} from "./validation.js";
export {
  AUTHORITY_VERSION,
  PARAMETER_SET_VERSION,
  ADAPTER_VERSION,
  REGIONS,
  FORMAL_INPUT_CATALOG,
  PARAMETERS,
  PARAMETER_BOUNDS,
  ORACLE_EXPECTED,
  ORACLE_STATUS,
} from "./data.js";
export { RICE_2024_TIBIAL_PEAK_SOURCE, assessRice2024BA021Evidence } from "./a6-r3-sources.js";
export { DOYLE_2025_PFJ_CUMULATIVE_SPEED_SOURCE, HO_2018_PFJ_GRADE_SOURCE, assessDoyle2025BA019Evidence, assessHo2018BA019Evidence, assessR4CrossSourceBA019Transfer } from "./a6-r4-sources.js";
export { DOYLE_2025_BA019_ENDPOINT_BRIDGE_SOURCE, FIRMINGER_2020_BA025_CUMULATIVE_METHOD_SOURCE, assessDoyle2025BA019R5, assessDoyleToCurrentBA019ReferenceBridgeR5, assessFirminger2020BA025R5 } from "./a6-r5-sources.js";
export { HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE, WILLY_2016_BA019_ENVIRONMENT_TRANSFER_SOURCE, hagen2023PfjsImpulsePerKm, hagen2023BA019LowSpeedRatio, assessHagen2023BA019R6, assessWilly2016BA019EnvironmentTransferR6 } from "./a6-r6-sources.js";
export { NISHIGUCHI_2025_OVERGROUND_FOOTSTRIKE_CUMULATIVE_SOURCE, assessNishiguchi2025R7, assessR7OutdoorBA019TransferAtOriginalCase } from "./a6-r7-sources.js";
export { WILLY_2016_BA019_SINGLE_PACE_ENVIRONMENT_SOURCE_R8, MESTELLE_2017_BA019_SHOD_OVERGROUND_SOURCE_R8, FIRMINGER_2020_BA025_EXACT_SPEED_SOURCE_R8, ERTMAN_2023_BA025_LOW_SPEED_PER_STEP_SOURCE_R8, assessR8BA019OutdoorBridge, assessFirminger2020BA025R8, assessErtmanToFirmingerBA025BridgeR8 } from "./a6-r8-sources.js";
export { REITER_2024_BA025_LOW_SPEED_FORCE_SOURCE_R9, BAGGALEY_EDWARDS_2017_BA025_CUMULATIVE_FORCE_ABSTRACT_R9, HO_2010_BA029_LOW_SPEED_SUBREGION_SOURCE_R9, FOURCHET_2012_BA029_FORCE_TIME_RELATIVE_LOAD_SOURCE_R9, HORIGUCHI_2025_BA029_COMPOSITE_FOREFOOT_SOURCE_R9, assessR9BA025LowSpeedCumulativeStrainGap, assessR9BA029LowSpeedForefootGap } from "./a6-r9-sources.js";
export { SAITO_2018_BA018_SPEED_GRADE_EMG_SOURCE_R10, assessR10BA018PosteriorThighEvidence } from "./a6-r10-sources.js";
export { WALL_SCHEFFLER_2010_BA018_LOW_SPEED_FACTORIAL_EMG_SOURCE_R11, JENSEN_2015_BA018_LOW_SPEED_FACTORIAL_EMG_SOURCE_R11, ROBINSON_2025_BA018_MECHANICAL_WORK_SOURCE_R11, assessR11BA018LowSpeedEvidence } from "./a6-r11-sources.js";

export { WALL_SCHEFFLER_2010_BA015_LOW_SPEED_FACTORIAL_GLUTEAL_EMG_SOURCE_R12, ENGELER_2025_BA015_PAIRED_GRADE_GLUTEAL_EMG_SOURCE_R12, CURRENT_BA015_PROXY_FAMILY_R12, assessR12BA015GlutealEvidence } from "./a6-r12-sources.js";

export { KHASSETARASH_2020_BA014_SPEED_GRADE_JOINT_WORK_GEOMETRY_R13, JIN_HAHN_2019_BA014_LOW_SPEED_LEVEL_HIP_WORK_SOURCE_R13, ROBINSON_2025_BA014_GRADED_MECHANICAL_WORK_SOURCE_R13, CURRENT_BA014_PROXY_FAMILY_R13, assessR13BA014HipEvidence } from "./a6-r13-sources.js";

export { JIN_HAHN_CADENCE_BRIDGE_AUDIT_R14, JIN_HAHN_2019_BA024_LOW_SPEED_ANKLE_WORK_R14, JIN_HAHN_2019_BA016_BA023_CONTEXT_R14, assessR14LowSpeedJointWorkBridge } from "./a6-r14-sources.js";
