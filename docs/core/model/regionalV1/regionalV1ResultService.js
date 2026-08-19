import {
  adaptPrototypeRecord,
  buildBodyMapPayload,
  buildRegionalEngineInput,
  calculateRegionalLoad,
  validateFormalInputBundle,
} from "./engine/index.js";
import { FORMAL_INPUT_CATALOG } from "./engine/data.js";
import { hashCanonical } from "./engine/sha256.js";
import { adaptStoredRecordToRegionalV1Ui, regionalV1ProfileContext } from "./regionalV1InputAdapter.js";

export const REGIONAL_V1_MODEL_VERSION = "runload-regional-model-v1.1-a8-1d-candidate-v1.2";
export const REGIONAL_V1_ENGINE_BUILD = "runload-prototype-integration-v1.1-a6-candidate-trace1";
export const REGIONAL_V1_OUTPUT_SEMANTIC_VERSION = "runload-regional-output-semantics-1.1-a8-1d-candidate-v1.2";
export const A7_SEMANTIC_DECOMPOSITION_VERSION = "runload-a8-1d-line-quality-0.2";

const ENDPOINT_META = Object.freeze({
  HIP_JOINT_MECHANICAL_DEMAND_TENDENCY: Object.freeze({
    family: "関節の機械的需要傾向",
    label: "股関節まわりの機械的需要傾向",
    shortLabel: "関節需要",
  }),
  GLUTEAL_FUNCTIONAL_DEMAND_TENDENCY: Object.freeze({
    family: "筋機能・筋需要傾向",
    label: "お尻の筋機能需要傾向",
    shortLabel: "筋機能需要",
  }),
  ANTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY: Object.freeze({
    family: "筋機能・筋需要傾向",
    label: "太もも前面の筋需要傾向",
    shortLabel: "筋需要",
  }),
  POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY: Object.freeze({
    family: "筋機能・筋需要傾向",
    label: "太もも後面の筋需要傾向",
    shortLabel: "筋需要",
  }),
  PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY: Object.freeze({
    family: "累積的な力積・stress傾向",
    label: "膝前面の累積的な力積傾向",
    shortLabel: "累積力積",
  }),
  TIBIAL_CUMULATIVE_TOTAL_STRESS_IMPULSE_TENDENCY: Object.freeze({
    family: "累積的な力積・stress傾向",
    label: "すねの累積的な力積傾向",
    shortLabel: "累積力積",
  }),
  POSTERIOR_LOWER_LEG_MUSCLE_DEMAND_TENDENCY: Object.freeze({
    family: "筋機能・筋需要傾向",
    label: "ふくらはぎの筋需要傾向",
    shortLabel: "筋需要",
  }),
  ANKLE_TOTAL_MECHANICAL_WORK_TENDENCY: Object.freeze({
    family: "関節の機械的仕事傾向",
    label: "足首まわりの機械的仕事傾向",
    shortLabel: "関節仕事",
  }),
  ANKLE_JOINT_POWER_REPETITION_PROXY_TENDENCY: Object.freeze({
    family: "足関節powerの反復proxy傾向",
    label: "足首まわりの関節power反復proxy傾向",
    shortLabel: "関節power proxy",
  }),
  ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY: Object.freeze({
    family: "累積的なstrain・力積傾向",
    label: "アキレス腱周辺の累積的なstrain力積傾向",
    shortLabel: "累積strain",
  }),
  REARFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY: Object.freeze({
    family: "圧力×時間の累積曝露傾向",
    label: "かかと側の圧力×時間曝露傾向",
    shortLabel: "圧力×時間",
  }),

  REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY: Object.freeze({
    family: "足底ピーク圧×接触回数の累積proxy傾向",
    label: "かかと側のピーク圧累積proxy傾向",
    shortLabel: "ピーク圧proxy",
  }),
  FOREFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY: Object.freeze({
    family: "足底ピーク圧×接触回数の累積proxy傾向",
    label: "前足部のピーク圧累積proxy傾向",
    shortLabel: "ピーク圧proxy",
  }),
  MEDIAL_LONGITUDINAL_ARCH_MECHANICAL_CONTROL_TENDENCY: Object.freeze({
    family: "足部アーチの機械的制御傾向",
    label: "土踏まず・足裏中央の機械的制御傾向",
    shortLabel: "アーチ制御",
  }),
  MEDIAL_LONGITUDINAL_ARCH_PEAK_ANGLE_REPETITION_PROXY_TENDENCY: Object.freeze({
    family: "足部アーチ角度の反復proxy傾向",
    label: "土踏まず・足裏中央のアーチ角度反復proxy傾向",
    shortLabel: "アーチ角度proxy",
  }),
  FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY: Object.freeze({
    family: "圧力×時間の累積曝露傾向",
    label: "前足部の圧力×時間曝露傾向",
    shortLabel: "圧力×時間",
  }),
});

const COMPONENT_LABELS = Object.freeze({
  GMAX: "大殿筋に対応する構成",
  GMED: "中殿筋に対応する構成",
  SOLEUS: "ヒラメ筋に対応する構成",
  GASTROCNEMIUS_MEDIALIS: "腓腹筋内側頭に対応する構成",
  ARCH_DEFORMATION_PROXY: "アーチ変形の代理構成",
  INTRINSIC_MUSCLE: "足部内在筋に対応する構成",
  PLANTAR_FASCIA_STRAIN: "足底腱膜strainに対応する構成",
  HEEL_PEAK_PRESSURE_PROXY: "踵部ピーク足底圧のproxy構成",
  FOREFOOT_PEAK_PRESSURE_PROXY: "前足部ピーク足底圧のproxy構成",
  PRESSURE_TIME_INTEGRAL_ENDPOINT: "圧力と接地時間を組み合わせた資料中の指標",
  INDIVIDUAL_MEASURED_FOOT_STRIKE: "計測された個人の接地様式",
  EXACT_STUDY_SHOE_MATCH: "原典と同一のシューズ条件",
});

const EXPOSURE_META = Object.freeze({
  GAIT_CYCLES: Object.freeze({ label: "歩数から推定した歩行周期", shortLabel: "歩行周期", unit: "周期" }),
  CONTACTS: Object.freeze({ label: "歩数を接触回数として扱う曝露", shortLabel: "接触回数", unit: "回" }),
  STEPS: Object.freeze({ label: "歩数", shortLabel: "歩数", unit: "歩" }),
  TIME: Object.freeze({ label: "実走時間", shortLabel: "時間", unit: "分" }),
  DISTANCE: Object.freeze({ label: "走行距離", shortLabel: "距離", unit: "km" }),
});

const INPUT_BY_ID = new Map(FORMAL_INPUT_CATALOG.map((item) => [item.id, item]));
const SOURCE_MATCHED_ROUTES = new Set([
  "DIRECT_GRADE_SOURCE",
  "DIRECT_CADENCE_SOURCE",
  "DIRECT_SPEED_SOURCE",
  "BAT_SRC_009_GLUTE_EXACT",
  "BAT_SRC_009_GASTRO_EXACT",
  "BAT_SRC_019_GRADE_SPEED_PROFILE",
  "SURFACE_X_STANDARD_SHOE",
  "ARCH_SURFACE_X_HEELED_SHOE",
  "ARCH_PFA_SOURCE",
  "A3_SRC_SUP_003_JOINT_GRADE",
  "A8_NUCKOLS_HIP_TOTAL_ABSOLUTE_POWER",
  "A3_E04_GROUP_MEAN_CADENCE",
  "A3_E02_FIGURE_DIGITIZED_SPEED",
  "A3_BAT_SRC_009_VASTUS_EXACT",
  "A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE",
  "A6_HO2010_HEEL_PEAK_PRESSURE",
]);
const PROJECT_ROUTES = new Set([
  "HIP_PROJECT_ROUTE",
  "VM_UPHILL_PROJECT",
  "GLUTEAL_SPEED_COMPOSITE",
  "CALF_COMPOSITE",
  "ARCH_SPEED_OR_GAIT",
  "ARCH_GAIT_CATEGORICAL",
  "BOUNDED_UNEVENNESS_X_SPEED",
  "A6_NUCKOLS_BOUNDED_GRADE_TRANSFER",
  "A6_BAT_SRC_019_LOCAL_GRADE_SPEED_ENVELOPE",
]);

const A7_PHASE0_ACCEPTED_DIRECT_REGIONS = new Set(["BA-DISP-019", "BA-DISP-021", "BA-DISP-025"]);
const A7_PHASE0_ACCEPTED_VAN_HOOREN_ROUTES = new Set(["DIRECT_SPEED_SOURCE", "DIRECT_GRADE_SOURCE"]);

function hasContextValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function applySupplementalFormalInputs(bundle = {}, record = {}) {
  const next = clone(bundle);
  const entries = next.formalInputs || {};
  const profile = record.bodyProfileSnapshot || {};
  const personal = record.personalContext || {};
  const environment = record.environmentContext || {};
  const recovery = record.recoveryContext || {};
  const reflection = record.reflectionContext || {};
  const consultation = record.consultationContext || {};
  const routePattern = String(record.course?.routePattern || "UNKNOWN").toUpperCase();
  if (entries["RL-IN-038"] && ["LOOP", "OUT_AND_BACK", "ONE_WAY", "MIXED"].includes(routePattern)) {
    entries["RL-IN-038"] = {
      ...entries["RL-IN-038"], status: "KNOWN", value: routePattern, provenance: "USER", confidence: "HIGH",
      sourceField: "record.course.routePattern", notes: "UI_METADATA_ONLY; no Regional A4 numeric routing effect",
    };
  }
  const values = [
    ["RL-IN-060", environment.weather, "record.environmentContext.weather", null],
    ["RL-IN-061", environment.temperatureC, "record.environmentContext.temperatureC", "°C"],
    ["RL-IN-062", environment.windSummary, "record.environmentContext.windSummary", null],
    ["RL-IN-063", environment.environmentNote, "record.environmentContext.environmentNote", null],
    ["RL-IN-074", personal.equipmentTags, "record.personalContext.equipmentTags", null],
    ["RL-IN-075", personal.equipmentNote, "record.personalContext.equipmentNote", null],
    ["RL-IN-093", reflection.postRunReflection, "record.reflectionContext.postRunReflection", null],
    ["RL-IN-094", reflection.perceivedDifference, "record.reflectionContext.perceivedDifference", null],
    ["RL-IN-110", profile.runningStartDateOrBand, "record.bodyProfileSnapshot.runningStartDateOrBand", null],
    ["RL-IN-111", profile.experienceSelfAssessment, "record.bodyProfileSnapshot.experienceSelfAssessment", null],
    ["RL-IN-112", profile.runningGoalTags, "record.bodyProfileSnapshot.runningGoalTags", null],
    ["RL-IN-117", recovery.sleepSummary, "record.recoveryContext.sleepSummary", null],
    ["RL-IN-118", recovery.nutritionHydrationSummary, "record.recoveryContext.nutritionHydrationSummary", null],
    ["RL-IN-119", recovery.lifestyleNote, "record.recoveryContext.lifestyleNote", null],
    ["RL-IN-120", reflection.reflectionKeyPoint, "record.reflectionContext.reflectionKeyPoint", null],
    ["RL-IN-121", reflection.nextCheckPoint, "record.reflectionContext.nextCheckPoint", null],
    ["RL-IN-122", consultation.consultationTarget, "record.consultationContext.consultationTarget", null],
    ["RL-IN-123", consultation.consultationQuestion, "record.consultationContext.consultationQuestion", null],
    ["RL-IN-124", consultation.consultationDataSelection, "record.consultationContext.consultationDataSelection", null],
  ];
  values.forEach(([id, value, sourceField, unit]) => {
    if (!entries[id] || !hasContextValue(value)) return;
    entries[id] = {
      ...entries[id],
      status: "KNOWN",
      value: clone(value),
      unit,
      provenance: id.startsWith("RL-IN-11") && ["RL-IN-110", "RL-IN-111", "RL-IN-112"].includes(id) ? "SNAPSHOT" : "USER",
      confidence: "HIGH",
      sourceField,
      notes: "TRACE_ONLY_CONTEXT; not added to mechanical regional indices",
    };
  });
  next.recordSnapshot = {
    ...next.recordSnapshot,
    inputSnapshotHash: hashCanonical(entries),
  };
  return next;
}

function sanitize(value) { return String(value || "").replace(/[^0-9A-Za-z._-]/g, "_"); }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function sourceRevision(record) { return String(record.updatedAt || record.createdAt || ""); }
function finite(value) { return value !== null && value !== "" && Number.isFinite(Number(value)); }
function uniqueSorted(values = []) { return [...new Set((values || []).filter(Boolean).map(String))].sort(); }
function sameNumber(left, right) {
  if (!finite(left) || !finite(right)) return left == null && right == null;
  return Math.abs(Number(left) - Number(right)) <= 1e-12;
}

function fallbackApplied(row = {}) {
  return (row.reasonTrace || []).some((event) => (
    event.traceCode === "EXPOSURE_BASIS_FALLBACK"
    || String(event.routeId || "").endsWith("_FALLBACK")
    || event.messageArgs?.fallback === true
  ));
}

function exposureOnlyConditionUnsupported(row = {}) {
  return (row.reasonTrace || []).some((event) => event?.traceCode === "EXPOSURE_ONLY_ALL_SECTIONS_CONDITION_UNSUPPORTED");
}

export function regionalV1ConditionSupportMeta(row = {}) {
  if (exposureOnlyConditionUnsupported(row)) return Object.freeze({
    status: "EXPOSURE_ONLY_CONDITION_UNSUPPORTED",
    label: "走行量のみで表示",
    shortLabel: "条件効果は未推定",
  });
  if ((row.activeRouteIds || []).length) return Object.freeze({
    status: "CONDITION_ROUTE_APPLIED",
    label: "走行条件を反映",
    shortLabel: "条件効果を反映",
  });
  return Object.freeze({
    status: "NO_CONDITION_ROUTE",
    label: "条件routeなし",
    shortLabel: "条件routeなし",
  });
}

function routeClass(row = {}) {
  const routes = uniqueSorted(row.activeRouteIds || []);
  if (exposureOnlyConditionUnsupported(row)) return "EXPOSURE_ONLY_CONDITION_UNSUPPORTED";
  if (!routes.length) return "REFERENCE_OR_NEUTRAL";
  const hasSource = routes.some((route) => SOURCE_MATCHED_ROUTES.has(route) || route.startsWith("DIRECT_") || route.startsWith("BAT_SRC_"));
  const hasProject = routes.some((route) => PROJECT_ROUTES.has(route));
  const unknown = routes.some((route) => !SOURCE_MATCHED_ROUTES.has(route) && !PROJECT_ROUTES.has(route) && !route.startsWith("DIRECT_") && !route.startsWith("BAT_SRC_"));
  if (unknown || (hasSource && hasProject)) return "MIXED_OR_OTHER";
  if (hasSource) return "SOURCE_MATCHED";
  if (hasProject) return "PROJECT_OR_COMPOSITE";
  return "MIXED_OR_OTHER";
}

export function regionalV1EndpointMeta(row = {}) {
  const meta = ENDPOINT_META[row.constructId] || {
    family: "部位固有の相対傾向",
    label: "部位固有の相対傾向",
    shortLabel: "部位固有傾向",
  };
  return Object.freeze({
    constructId: row.constructId || null,
    ...meta,
  });
}

export function regionalV1ExposureMeta(row = {}) {
  const basis = row.exposure?.basis || null;
  const base = EXPOSURE_META[basis] || { label: "曝露basisなし", shortLabel: "basisなし", unit: "" };
  const fallback = fallbackApplied(row);
  return Object.freeze({
    basis,
    fallback,
    fallbackStatus: fallback ? "FALLBACK" : basis ? "PRIMARY" : "NONE",
    label: base.label,
    shortLabel: base.shortLabel,
    unit: base.unit,
    qEquivalent: finite(row.exposure?.qEquivalent) ? Number(row.exposure.qEquivalent) : null,
    qReference: finite(row.exposure?.qReference) ? Number(row.exposure.qReference) : null,
    alphaE: finite(row.exposure?.alphaE) ? Number(row.exposure.alphaE) : null,
  });
}

function expFromLog(value) {
  return finite(value) ? Math.exp(Number(value)) : null;
}

function closeEnough(left, right, tolerance = 1e-10) {
  return finite(left) && finite(right) && Math.abs(Number(left) - Number(right)) <= tolerance;
}

function a7Phase0NumericFamilyStatus(row = {}) {
  const routes = uniqueSorted(row.activeRouteIds || []);
  const acceptedRoutes = routes.filter((route) => A7_PHASE0_ACCEPTED_VAN_HOOREN_ROUTES.has(route));
  if (A7_PHASE0_ACCEPTED_DIRECT_REGIONS.has(row.regionId) && acceptedRoutes.length > 0) {
    return Object.freeze({
      status: "PHASE0_ACCEPTED_VAN_HOOREN_1D",
      acceptedRouteIds: Object.freeze(acceptedRoutes),
      blockedExpansion: false,
    });
  }
  return Object.freeze({
    status: "CURRENT_ONLY_NO_NEW_A7_NUMERIC_FAMILY",
    acceptedRouteIds: Object.freeze([]),
    blockedExpansion: true,
  });
}

/**
 * A7 Phase 1 semantic separation. This deliberately does not change the
 * Formal Current engine calculation. It exposes common exposure separately
 * from a genuine regional condition response and never labels an unsupported
 * condition as a neutral ratio of 1.
 */
export function buildA7RegionSemanticDecomposition(row = {}) {
  const numericState = ["CALCULATED", "PARTIAL"].includes(row.calculationState);
  const support = regionalV1ConditionSupportMeta(row);
  const exposureMeta = regionalV1ExposureMeta(row);
  const conditionSupported = numericState && support.status === "CONDITION_ROUTE_APPLIED";
  const conditionLog = conditionSupported && finite(row.components?.conditionLog)
    ? Number(row.components.conditionLog)
    : null;
  const conditionRatio = expFromLog(conditionLog);
  const exposureLog = numericState && finite(row.components?.exposureLog)
    ? Number(row.components.exposureLog)
    : null;
  const exposureRatio = expFromLog(exposureLog);
  const currentIndex = numericState && finite(row.indexExact) ? Number(row.indexExact) : null;
  const currentTotalLog = numericState && finite(row.components?.totalLog) ? Number(row.components.totalLog) : null;
  const expectedCurrentIndex = currentTotalLog === null ? null : 100 * Math.exp(currentTotalLog);
  const phase0Family = a7Phase0NumericFamilyStatus(row);

  return Object.freeze({
    semanticVersion: A7_SEMANTIC_DECOMPOSITION_VERSION,
    regionId: row.regionId || null,
    regionalConditionResponse: Object.freeze({
      status: conditionSupported ? "SUPPORTED_NUMERIC" : numericState ? "UNSUPPORTED_NO_NUMERIC_MAGNITUDE" : "UNAVAILABLE",
      supportStatus: support.status,
      routeClass: routeClass(row),
      ratioExact: conditionRatio,
      deltaPercentExact: conditionRatio === null ? null : (conditionRatio - 1) * 100,
      logRatioExact: conditionLog,
      activeRouteIds: Object.freeze(uniqueSorted(row.activeRouteIds || [])),
      sourceIds: Object.freeze(uniqueSorted(row.sourceIds || [])),
      phase0NumericFamilyStatus: phase0Family.status,
      phase0AcceptedRouteIds: phase0Family.acceptedRouteIds,
      broadA7ExpansionBlocked: phase0Family.blockedExpansion,
    }),
    commonRunningExposure: Object.freeze({
      status: exposureRatio === null ? "UNAVAILABLE" : "NUMERIC",
      basis: exposureMeta.basis,
      ratioExact: exposureRatio,
      logRatioExact: exposureLog,
      qEquivalent: exposureMeta.qEquivalent,
      qReference: exposureMeta.qReference,
      alphaE: exposureMeta.alphaE,
      fallbackStatus: exposureMeta.fallbackStatus,
    }),
    currentCumulativeResult: Object.freeze({
      status: currentIndex === null ? "UNAVAILABLE" : "NUMERIC",
      indexExact: currentIndex,
      referenceValue: row.referenceValue ?? 100,
      totalLogExact: currentTotalLog,
      arithmeticIdentityVerified: currentIndex === null || expectedCurrentIndex === null
        ? null
        : closeEnough(currentIndex, expectedCurrentIndex),
      interpretation: conditionSupported
        ? "CURRENT_INDEX_COMBINES_REGIONAL_CONDITION_AND_COMMON_EXPOSURE"
        : numericState
          ? "CURRENT_INDEX_IS_EXPOSURE_ONLY_BECAUSE_REGIONAL_CONDITION_MAGNITUDE_IS_UNSUPPORTED"
          : "CURRENT_INDEX_UNAVAILABLE",
    }),
  });
}

export function buildA7SemanticDecompositionMap(result = {}) {
  return Object.freeze(Object.fromEntries((result?.regions || []).map((row) => [
    row.regionId,
    buildA7RegionSemanticDecomposition(row),
  ])));
}

export function regionalV1CoverageMeta(row = {}) {
  const sections = Array.isArray(row.componentCoverage?.sections) ? row.componentCoverage.sections : [];
  const observedComponentIds = uniqueSorted(sections.flatMap((section) => section.observedComponentIds || []));
  const missingComponentIds = uniqueSorted(sections.flatMap((section) => section.missingComponentIds || []));
  const state = row.componentCoverage?.state || "NONE";
  const sectionSignatures = sections.map((section) => ({
    sectionId: section.sectionId || null,
    state: section.state || "NONE",
    observedComponentIds: uniqueSorted(section.observedComponentIds || []),
    missingComponentIds: uniqueSorted(section.missingComponentIds || []),
  })).sort((left, right) => String(left.sectionId || "").localeCompare(String(right.sectionId || "")));
  const signature = JSON.stringify({
    state,
    sections: sectionSignatures.map((section) => ({
      state: section.state,
      observed: section.observedComponentIds,
      missing: section.missingComponentIds,
    })),
  });
  return Object.freeze({
    state,
    sectionCount: sections.length,
    observedComponentIds,
    missingComponentIds,
    observedLabels: observedComponentIds.map((id) => COMPONENT_LABELS[id] || id),
    missingLabels: missingComponentIds.map((id) => COMPONENT_LABELS[id] || id),
    signature,
  });
}

function omittedReasonKey(item = {}) {
  if (item.numericPermission === "PROHIBITED_FOR_COMPLETED_SESSION") return "PLAN_ONLY";
  if (item.numericPermission === "SELF_REPORTED_SEPARATE") return "SUBJECTIVE_SEPARATE";
  if (item.numericPermission === "TRACE_ONLY") return "CONTEXT_ONLY";
  if (item.numericPermission === "EXPOSURE_ONLY") return "ALTERNATE_EXPOSURE_NOT_STACKED";
  if (["DIRECT_OR_CONDITIONAL", "INTERACTION_ONLY"].includes(item.numericPermission)) return "ROUTE_NOT_ACTIVE";
  return "ROUTING_OR_GATE_ONLY";
}

const OMITTED_REASON_LABELS = Object.freeze({
  PLAN_ONLY: "予定用入力のため、完了した走行の部位指数へ加えません",
  SUBJECTIVE_SEPARATE: "本人申告として別表示し、機械的指数へ混合しません",
  CONTEXT_ONLY: "記録や比較の補足として保存します",
  ALTERNATE_EXPOSURE_NOT_STACKED: "別の曝露basisを採用したため、重複加算しません",
  ROUTE_NOT_ACTIVE: "この部位では、今回の条件から数値を表示できません",
  ROUTING_OR_GATE_ONLY: "適用判定・欠測確認に使う入力で、数値を直接加算しません",
});

export function buildRegionalV1InputUseSummary(row = {}) {
  const used = new Set((row.usedInputIds || []).filter((id) => INPUT_BY_ID.has(id)));
  const engineDeclaredOmitted = new Set((row.omittedInputIds || []).filter((id) => INPUT_BY_ID.has(id)));
  const usedGroups = {
    numericOrInteraction: [],
    routingOrGate: [],
    contextOrParallel: [],
  };
  for (const id of uniqueSorted([...used])) {
    const item = INPUT_BY_ID.get(id);
    const entry = Object.freeze({ id, label: item.label || id, numericPermission: item.numericPermission || "UNKNOWN" });
    if (["DIRECT_OR_CONDITIONAL", "EXPOSURE_ONLY", "INTERACTION_ONLY"].includes(item.numericPermission)) usedGroups.numericOrInteraction.push(entry);
    else if (["ROUTING_ONLY", "NON_NUMERIC_GATE"].includes(item.numericPermission)) usedGroups.routingOrGate.push(entry);
    else usedGroups.contextOrParallel.push(entry);
  }
  const omittedGroups = new Map();
  for (const item of FORMAL_INPUT_CATALOG) {
    if (used.has(item.id)) continue;
    const reasonKey = omittedReasonKey(item);
    if (!omittedGroups.has(reasonKey)) omittedGroups.set(reasonKey, []);
    omittedGroups.get(reasonKey).push(Object.freeze({
      id: item.id,
      label: item.label || item.id,
      engineDeclaredOmitted: engineDeclaredOmitted.has(item.id),
    }));
  }
  const omittedCount = FORMAL_INPUT_CATALOG.length - used.size;
  return Object.freeze({
    totalFormalInputCount: FORMAL_INPUT_CATALOG.length,
    usedCount: used.size,
    omittedCount,
    engineDeclaredOmittedCount: engineDeclaredOmitted.size,
    catalogRoleOnlyCount: omittedCount - engineDeclaredOmitted.size,
    usedGroups: Object.freeze({
      numericOrInteraction: Object.freeze(usedGroups.numericOrInteraction),
      routingOrGate: Object.freeze(usedGroups.routingOrGate),
      contextOrParallel: Object.freeze(usedGroups.contextOrParallel),
    }),
    omittedGroups: Object.freeze([...omittedGroups.entries()].map(([reasonKey, items]) => Object.freeze({
      reasonKey,
      reasonLabel: OMITTED_REASON_LABELS[reasonKey],
      items: Object.freeze(items),
    }))),
  });
}

export function buildRegionalV1ComparisonSignature(resultRecord = {}, rowOrRegionId = null) {
  const result = resultRecord?.result || resultRecord;
  const requestedRegionId = typeof rowOrRegionId === "string" ? rowOrRegionId : rowOrRegionId?.regionId;
  const stored = requestedRegionId ? resultRecord?.comparison_signatures?.[requestedRegionId] : null;
  if (stored && typeof stored === "object") return Object.freeze(clone(stored));
  const row = typeof rowOrRegionId === "string"
    ? result?.regions?.find((item) => item.regionId === rowOrRegionId)
    : rowOrRegionId;
  if (!row?.regionId) return null;
  const exposure = regionalV1ExposureMeta(row);
  const coverage = regionalV1CoverageMeta(row);
  return Object.freeze({
    semanticVersion: REGIONAL_V1_OUTPUT_SEMANTIC_VERSION,
    authorityVersion: resultRecord.authority_version || result?.authorityVersion || null,
    parameterSetVersion: resultRecord.parameter_set_version || result?.parameterSetVersion || null,
    traceContractVersion: resultRecord.trace_contract_version || result?.traceContractVersion || null,
    regionId: row.regionId,
    constructId: row.constructId || null,
    referenceDefinitionId: row.referenceDefinitionId || null,
    referenceValue: row.referenceValue ?? 100,
    calculationState: row.calculationState || null,
    exposureBasis: exposure.basis,
    qReference: exposure.qReference,
    alphaE: exposure.alphaE,
    fallbackStatus: exposure.fallbackStatus,
    coverageState: coverage.state,
    coverageSignature: coverage.signature,
    routeClass: routeClass(row),
    conditionSupportStatus: regionalV1ConditionSupportMeta(row).status,
  });
}

export function compareRegionalV1Signatures(current, candidate) {
  if (!current || !candidate) {
    return Object.freeze({ status: "INCOMPATIBLE", differences: Object.freeze(["SIGNATURE_MISSING"]), directDeltaAllowed: false });
  }
  const canonicalFields = [
    "semanticVersion",
    "authorityVersion",
    "parameterSetVersion",
    "regionId",
    "constructId",
    "referenceDefinitionId",
    "referenceValue",
  ];
  const comparisonFields = [
    "traceContractVersion",
    "calculationState",
    "exposureBasis",
    "qReference",
    "alphaE",
    "fallbackStatus",
    "coverageState",
    "coverageSignature",
    "routeClass",
    "conditionSupportStatus",
  ];
  const canonicalDifferences = canonicalFields.filter((field) => (
    ["referenceValue"].includes(field)
      ? !sameNumber(current[field], candidate[field])
      : current[field] !== candidate[field]
  ));
  if (canonicalDifferences.length) {
    return Object.freeze({
      status: "INCOMPATIBLE",
      differences: Object.freeze(canonicalDifferences),
      directDeltaAllowed: false,
    });
  }
  const differences = comparisonFields.filter((field) => (
    ["qReference", "alphaE"].includes(field)
      ? !sameNumber(current[field], candidate[field])
      : current[field] !== candidate[field]
  ));
  return Object.freeze({
    status: differences.length ? "QUALIFIED_ONLY" : "DIRECT_COMPARABLE",
    differences: Object.freeze(differences),
    directDeltaAllowed: differences.length === 0,
  });
}


function a7SemanticFor(resultRecord = {}, rowOrRegionId = null) {
  const result = resultRecord?.result || resultRecord;
  const regionId = typeof rowOrRegionId === "string" ? rowOrRegionId : rowOrRegionId?.regionId;
  if (!regionId) return null;
  const stored = resultRecord?.a7_region_semantics?.[regionId];
  if (stored && typeof stored === "object") return Object.freeze(clone(stored));
  const row = typeof rowOrRegionId === "string"
    ? result?.regions?.find((item) => item.regionId === rowOrRegionId)
    : rowOrRegionId;
  return row ? buildA7RegionSemanticDecomposition(row) : null;
}

function a7ConditionIndexExact(semantic = null) {
  const ratio = semantic?.regionalConditionResponse?.ratioExact;
  return finite(ratio) && Number(ratio) > 0 ? 100 * Number(ratio) : null;
}

function a7ConditionRouteFamilySignature(semantic = null) {
  const routes = uniqueSorted(semantic?.regionalConditionResponse?.activeRouteIds || []);
  return routes.length ? routes.join("|") : null;
}

function a7ConditionSourceFamilySignature(semantic = null) {
  const sourceIds = uniqueSorted(semantic?.regionalConditionResponse?.sourceIds || []);
  return sourceIds.length ? sourceIds.join("|") : null;
}

/**
 * Strict comparison identity for the A7 condition-response construct.
 * A speed-route result is intentionally not compared directly with a grade-route
 * result even when both are normalized to the same region-specific Reference 100.
 */
export function buildA7ConditionComparisonSignature(resultRecord = {}, rowOrRegionId = null) {
  const result = resultRecord?.result || resultRecord;
  const row = typeof rowOrRegionId === "string"
    ? result?.regions?.find((item) => item.regionId === rowOrRegionId)
    : rowOrRegionId;
  if (!row?.regionId) return null;
  const semantic = a7SemanticFor(resultRecord, row);
  if (semantic?.regionalConditionResponse?.status !== "SUPPORTED_NUMERIC") return null;
  const conditionIndexExact = a7ConditionIndexExact(semantic);
  if (conditionIndexExact === null) return null;
  const coverage = regionalV1CoverageMeta(row);
  return Object.freeze({
    semanticVersion: A7_SEMANTIC_DECOMPOSITION_VERSION,
    authorityVersion: resultRecord.authority_version || result?.authorityVersion || null,
    parameterSetVersion: resultRecord.parameter_set_version || result?.parameterSetVersion || null,
    traceContractVersion: resultRecord.trace_contract_version || result?.traceContractVersion || null,
    regionId: row.regionId,
    constructId: row.constructId || null,
    referenceDefinitionId: row.referenceDefinitionId || null,
    referenceValue: row.referenceValue ?? 100,
    routeFamilySignature: a7ConditionRouteFamilySignature(semantic),
    sourceFamilySignature: a7ConditionSourceFamilySignature(semantic),
    phase0NumericFamilyStatus: semantic.regionalConditionResponse.phase0NumericFamilyStatus || null,
    coverageState: coverage.state,
    coverageSignature: coverage.signature,
  });
}

export function compareA7ConditionSignatures(current, candidate) {
  if (!current || !candidate) {
    return Object.freeze({ status: "INCOMPATIBLE", differences: Object.freeze(["A7_CONDITION_SIGNATURE_MISSING"]), directDeltaAllowed: false });
  }
  const fields = [
    "semanticVersion",
    "authorityVersion",
    "parameterSetVersion",
    "traceContractVersion",
    "regionId",
    "constructId",
    "referenceDefinitionId",
    "referenceValue",
    "routeFamilySignature",
    "sourceFamilySignature",
    "phase0NumericFamilyStatus",
    "coverageState",
    "coverageSignature",
  ];
  const differences = fields.filter((field) => (
    field === "referenceValue"
      ? !sameNumber(current[field], candidate[field])
      : current[field] !== candidate[field]
  ));
  return Object.freeze({
    status: differences.length ? "INCOMPATIBLE" : "DIRECT_COMPARABLE",
    differences: Object.freeze(differences),
    directDeltaAllowed: differences.length === 0,
  });
}

export function buildA7ConditionHistoryComparison({ currentExperience, experiences = [], regionId, limit = 8 }) {
  const currentRecord = currentExperience?.regionalV1ResultRecord;
  const currentRow = currentExperience?.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
  const currentSemantic = a7SemanticFor(currentRecord || currentExperience?.regionalV1Result || {}, currentRow);
  const currentSignature = buildA7ConditionComparisonSignature(currentRecord || currentExperience?.regionalV1Result || {}, currentRow);
  const currentConditionIndexExact = a7ConditionIndexExact(currentSemantic);
  const rows = [...experiences]
    .filter((experience) => experience?.record?.id && experience.record.id !== currentExperience?.record?.id)
    .filter((experience) => experience?.record?.activityType === "run")
    .sort((left, right) => (
      String(right.record.date || "").localeCompare(String(left.record.date || ""))
      || String(right.record.id || "").localeCompare(String(left.record.id || ""))
    ))
    .map((experience) => {
      const candidateRecord = experience.regionalV1ResultRecord;
      const candidateRow = experience.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
      const candidateSemantic = a7SemanticFor(candidateRecord || experience?.regionalV1Result || {}, candidateRow);
      const candidateSignature = buildA7ConditionComparisonSignature(candidateRecord || experience?.regionalV1Result || {}, candidateRow);
      const compatibility = compareA7ConditionSignatures(currentSignature, candidateSignature);
      const conditionIndexExact = a7ConditionIndexExact(candidateSemantic);
      const directDeltaPoints = compatibility.directDeltaAllowed
        && currentConditionIndexExact !== null
        && conditionIndexExact !== null
        ? currentConditionIndexExact - conditionIndexExact
        : null;
      return Object.freeze({
        recordId: experience.record.id,
        date: experience.record.date || "",
        conditionIndexExact,
        displayConditionIndex: conditionIndexExact === null ? null : Math.round(conditionIndexExact),
        routeFamilySignature: candidateSignature?.routeFamilySignature || null,
        signature: candidateSignature,
        compatibility,
        directDeltaPoints,
      });
    })
    .filter((item) => item.signature || item.conditionIndexExact !== null)
    .slice(0, Math.max(1, Number(limit) || 8));
  return Object.freeze({
    regionId,
    currentConditionIndexExact,
    currentSignature,
    rows: Object.freeze(rows),
    counts: Object.freeze({
      direct: rows.filter((item) => item.compatibility.status === "DIRECT_COMPARABLE").length,
      incompatible: rows.filter((item) => item.compatibility.status === "INCOMPATIBLE").length,
    }),
  });
}

export function buildA7ConditionPreviousComparable({ currentExperience, experiences = [], regionId }) {
  const currentRecord = currentExperience?.regionalV1ResultRecord;
  const currentRow = currentExperience?.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
  const currentSemantic = a7SemanticFor(currentRecord || currentExperience?.regionalV1Result || {}, currentRow);
  const currentSignature = buildA7ConditionComparisonSignature(currentRecord || currentExperience?.regionalV1Result || {}, currentRow);
  const currentConditionIndexExact = a7ConditionIndexExact(currentSemantic);
  if (!currentSignature || currentConditionIndexExact === null) {
    return Object.freeze({
      status: "CURRENT_CONDITION_UNAVAILABLE",
      regionId,
      currentConditionIndexExact,
      previous: null,
      pointChangeExact: null,
      pointChangeRounded: null,
      percentChangeExact: null,
      percentChangeRounded: null,
      direction: "NONE",
    });
  }
  const previousRows = [...experiences]
    .filter((experience) => experience?.record?.id && experience.record.id !== currentExperience?.record?.id)
    .filter((experience) => experience?.record?.activityType === "run")
    .filter((experience) => compareExperienceChronology(experience, currentExperience) < 0)
    .sort((left, right) => compareExperienceChronology(right, left))
    .map((experience) => {
      const candidateRecord = experience.regionalV1ResultRecord;
      const candidateRow = experience.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
      const candidateSemantic = a7SemanticFor(candidateRecord || experience?.regionalV1Result || {}, candidateRow);
      const signature = buildA7ConditionComparisonSignature(candidateRecord || experience?.regionalV1Result || {}, candidateRow);
      const compatibility = compareA7ConditionSignatures(currentSignature, signature);
      const conditionIndexExact = a7ConditionIndexExact(candidateSemantic);
      return Object.freeze({
        recordId: experience.record.id,
        date: experience.record.date || "",
        createdAt: experience.record.createdAt || "",
        conditionIndexExact,
        displayConditionIndex: conditionIndexExact === null ? null : Math.round(conditionIndexExact),
        routeFamilySignature: signature?.routeFamilySignature || null,
        signature,
        compatibility,
      });
    })
    .filter((item) => item.signature || item.conditionIndexExact !== null);
  const previous = previousRows.find((item) => (
    item.compatibility.directDeltaAllowed
    && item.conditionIndexExact !== null
    && item.conditionIndexExact > 0
  ));
  if (!previous) {
    return Object.freeze({
      status: previousRows.length ? "NO_COMPARABLE_CONDITION_RECORD" : "NO_PREVIOUS_CONDITION_RECORD",
      regionId,
      currentConditionIndexExact,
      previous: previousRows[0] || null,
      pointChangeExact: null,
      pointChangeRounded: null,
      percentChangeExact: null,
      percentChangeRounded: null,
      direction: "NONE",
    });
  }
  const pointChangeExact = currentConditionIndexExact - previous.conditionIndexExact;
  const percentChangeExact = ((currentConditionIndexExact / previous.conditionIndexExact) - 1) * 100;
  const direction = Math.abs(pointChangeExact) < 1e-9
    ? "UNCHANGED"
    : pointChangeExact > 0
      ? "INCREASE"
      : "DECREASE";
  return Object.freeze({
    status: "COMPARABLE",
    regionId,
    currentConditionIndexExact,
    previous,
    pointChangeExact,
    pointChangeRounded: Math.round(pointChangeExact),
    percentChangeExact,
    percentChangeRounded: Math.round(percentChangeExact),
    direction,
  });
}

export function buildA7ConditionPreviousComparableMap({ currentExperience, experiences = [] }) {
  const regions = currentExperience?.regionalV1Result?.regions || [];
  return Object.freeze(Object.fromEntries(regions.map((row) => [
    row.regionId,
    buildA7ConditionPreviousComparable({ currentExperience, experiences, regionId: row.regionId }),
  ])));
}

export function buildRegionalV1HistoryComparison({ currentExperience, experiences = [], regionId, limit = 8 }) {
  const currentRecord = currentExperience?.regionalV1ResultRecord;
  const currentRow = currentExperience?.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
  const currentSignature = buildRegionalV1ComparisonSignature(currentRecord, currentRow);
  const rows = [...experiences]
    .filter((experience) => experience?.record?.id && experience.record.id !== currentExperience?.record?.id)
    .filter((experience) => experience?.record?.activityType === "run")
    .sort((left, right) => (
      String(right.record.date || "").localeCompare(String(left.record.date || ""))
      || String(right.record.id || "").localeCompare(String(left.record.id || ""))
    ))
    .map((experience) => {
      const candidateRecord = experience.regionalV1ResultRecord;
      const candidateRow = experience.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
      const candidateSignature = buildRegionalV1ComparisonSignature(candidateRecord, candidateRow);
      const compatibility = compareRegionalV1Signatures(currentSignature, candidateSignature);
      const currentValue = finite(currentRow?.displayIndex) ? Number(currentRow.displayIndex) : null;
      const candidateValue = finite(candidateRow?.displayIndex) ? Number(candidateRow.displayIndex) : null;
      const directDelta = compatibility.directDeltaAllowed && currentValue !== null && candidateValue !== null
        ? currentValue - candidateValue
        : null;
      return Object.freeze({
        recordId: experience.record.id,
        date: experience.record.date || "",
        value: candidateValue,
        calculationState: candidateRow?.calculationState || null,
        conditionSupportStatus: regionalV1ConditionSupportMeta(candidateRow || {}).status,
        signature: candidateSignature,
        compatibility,
        directDelta,
      });
    })
    .filter((item) => item.signature || item.value !== null)
    .slice(0, Math.max(1, Number(limit) || 8));
  return Object.freeze({
    regionId,
    currentSignature,
    rows: Object.freeze(rows),
    counts: Object.freeze({
      direct: rows.filter((item) => item.compatibility.status === "DIRECT_COMPARABLE").length,
      qualified: rows.filter((item) => item.compatibility.status === "QUALIFIED_ONLY").length,
      incompatible: rows.filter((item) => item.compatibility.status === "INCOMPATIBLE").length,
    }),
  });
}


function compareExperienceChronology(left, right) {
  const leftRecord = left?.record || {};
  const rightRecord = right?.record || {};
  return String(leftRecord.date || "").localeCompare(String(rightRecord.date || ""))
    || String(leftRecord.createdAt || "").localeCompare(String(rightRecord.createdAt || ""))
    || String(leftRecord.id || "").localeCompare(String(rightRecord.id || ""));
}

export function buildRegionalV1PreviousComparable({ currentExperience, experiences = [], regionId }) {
  const currentRecord = currentExperience?.regionalV1ResultRecord;
  const currentRow = currentExperience?.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
  const currentSignature = buildRegionalV1ComparisonSignature(currentRecord, currentRow);
  const currentIndexExact = finite(currentRow?.indexExact) ? Number(currentRow.indexExact) : null;
  if (!currentSignature || currentIndexExact === null) {
    return Object.freeze({
      status: "CURRENT_UNAVAILABLE",
      regionId,
      currentIndexExact,
      conditionSupportStatus: regionalV1ConditionSupportMeta(currentRow || {}).status,
      previous: null,
      percentChangeExact: null,
      percentChangeRounded: null,
      direction: "NONE",
    });
  }
  const previousRows = [...experiences]
    .filter((experience) => experience?.record?.id && experience.record.id !== currentExperience?.record?.id)
    .filter((experience) => experience?.record?.activityType === "run")
    .filter((experience) => compareExperienceChronology(experience, currentExperience) < 0)
    .sort((left, right) => compareExperienceChronology(right, left))
    .map((experience) => {
      const candidateRecord = experience.regionalV1ResultRecord;
      const candidateRow = experience.regionalV1Result?.regions?.find((item) => item.regionId === regionId);
      const signature = buildRegionalV1ComparisonSignature(candidateRecord, candidateRow);
      const compatibility = compareRegionalV1Signatures(currentSignature, signature);
      const indexExact = finite(candidateRow?.indexExact) ? Number(candidateRow.indexExact) : null;
      return Object.freeze({
        recordId: experience.record.id,
        date: experience.record.date || "",
        createdAt: experience.record.createdAt || "",
        indexExact,
        displayIndex: finite(candidateRow?.displayIndex) ? Number(candidateRow.displayIndex) : null,
        calculationState: candidateRow?.calculationState || null,
        conditionSupportStatus: regionalV1ConditionSupportMeta(candidateRow || {}).status,
        signature,
        compatibility,
      });
    })
    .filter((item) => item.signature || item.indexExact !== null);

  const previous = previousRows.find((item) => (
    item.compatibility.directDeltaAllowed
    && item.indexExact !== null
    && item.indexExact > 0
  ));
  if (!previous) {
    const nearest = previousRows[0] || null;
    return Object.freeze({
      status: nearest ? "NO_COMPARABLE_RECORD" : "NO_PREVIOUS_RECORD",
      regionId,
      currentIndexExact,
      conditionSupportStatus: regionalV1ConditionSupportMeta(currentRow || {}).status,
      previous: nearest,
      percentChangeExact: null,
      percentChangeRounded: null,
      direction: "NONE",
    });
  }
  const percentChangeExact = ((currentIndexExact / previous.indexExact) - 1) * 100;
  const direction = Math.abs(percentChangeExact) < 1e-9
    ? "UNCHANGED"
    : percentChangeExact > 0
      ? "INCREASE"
      : "DECREASE";
  return Object.freeze({
    status: "COMPARABLE",
    regionId,
    currentIndexExact,
    conditionSupportStatus: regionalV1ConditionSupportMeta(currentRow || {}).status,
    previous,
    percentChangeExact,
    percentChangeRounded: Math.round(percentChangeExact),
    direction,
  });
}

export function buildRegionalV1PreviousComparableMap({ currentExperience, experiences = [] }) {
  const regions = currentExperience?.regionalV1Result?.regions || [];
  return Object.freeze(Object.fromEntries(regions.map((row) => [
    row.regionId,
    buildRegionalV1PreviousComparable({ currentExperience, experiences, regionId: row.regionId }),
  ])));
}

function buildOutputSemanticMetadata(resultRecord) {
  const signatures = Object.fromEntries((resultRecord.result?.regions || []).map((row) => [
    row.regionId,
    buildRegionalV1ComparisonSignature(resultRecord, row),
  ]));
  return Object.freeze({
    output_semantic_version: REGIONAL_V1_OUTPUT_SEMANTIC_VERSION,
    comparison_signatures: signatures,
    a7_semantic_decomposition_version: A7_SEMANTIC_DECOMPOSITION_VERSION,
    a7_region_semantics: buildA7SemanticDecompositionMap(resultRecord.result),
  });
}

export function createRegionalV1ResultRecord({ record, feedback = {}, sessionSequence = 1 }) {
  const uiInput = adaptStoredRecordToRegionalV1Ui(record, feedback);
  const adapted = adaptPrototypeRecord(uiInput, {
    sessionId: record.id,
    sessionSequence,
    recordRevision: 1,
    profile: regionalV1ProfileContext(record),
  });
  if (!adapted.ok) return { ...adapted, code: adapted.error?.code || "REGIONAL_V1_ADAPTER_FAILED" };
  const augmentedFormalBundle = applySupplementalFormalInputs(adapted.value, record);
  const validation = validateFormalInputBundle(augmentedFormalBundle);
  if (!validation.valid) return { ok: false, code: "REGIONAL_V1_FORMAL_INPUT_INVALID", validation };
  const engineInput = buildRegionalEngineInput(augmentedFormalBundle, { engineBuildVersion: REGIONAL_V1_ENGINE_BUILD });
  if (!engineInput.ok) return { ...engineInput, code: engineInput.error?.code || "REGIONAL_V1_ENGINE_INPUT_FAILED" };
  const calculation = calculateRegionalLoad(engineInput.value);
  if (!calculation.ok) return { ...calculation, code: calculation.error?.code || "REGIONAL_V1_CALCULATION_FAILED" };
  const bodyMap = buildBodyMapPayload(calculation.value, "ja-JP");
  const revision = sourceRevision(record);
  const baseRecord = {
    id: `regional-v1-result-${sanitize(record.id)}-${sanitize(revision)}`,
    record_id: record.id,
    source_record_revision: revision,
    generated_at: new Date().toISOString(),
    model_version: REGIONAL_V1_MODEL_VERSION,
    authority_version: calculation.value.authorityVersion,
    parameter_set_version: calculation.value.parameterSetVersion,
    adapter_version: augmentedFormalBundle.adapterVersion,
    engine_build_version: calculation.value.engineBuildVersion,
    trace_contract_version: calculation.value.traceContractVersion || null,
    state: record.activityType === "rest" ? "REST" : "RUN",
    input_snapshot: clone(uiInput),
    formal_input_snapshot: clone(augmentedFormalBundle),
    engine_input_snapshot: clone(engineInput.value),
    result: clone(calculation.value),
    body_map_payload: clone(bodyMap),
  };
  const resultRecord = Object.freeze({
    ...baseRecord,
    ...buildOutputSemanticMetadata(baseRecord),
  });
  return { ok: true, resultRecord };
}

export function upsertRegionalV1ResultRecord(items = [], resultRecord) {
  const next = items.filter((item) => item.id !== resultRecord.id);
  next.push(resultRecord);
  return next.sort((a, b) => a.record_id.localeCompare(b.record_id) || a.source_record_revision.localeCompare(b.source_record_revision) || a.id.localeCompare(b.id));
}
