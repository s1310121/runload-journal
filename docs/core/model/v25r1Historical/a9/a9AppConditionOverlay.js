import { calculateA9RegionalReview, A9_REVIEW_MODEL_VERSION } from "./a9ReviewModel.js";
import { calculateA9RunWalkRunningPhaseReview, A9_RUN_WALK_PHASE_SCOPE } from "./a9RunWalkRunningPhase.js";
import { A9_V25R1_CANONICAL_SPEED_VERSION } from "./a9V25CanonicalSpeedFamilies.js";
import { hashCanonical } from "../engine/sha256.js";
import { deriveV25R1PersonalHabitualCadence } from "./a9V25CadenceModifier.js";

export const A9_APP_OVERLAY_VERSION = "runload-v2.5r1-condition-overlay-v1.0";
export const A9_APP_AUTHORITY_VERSION = "RunLoad-NextCurrent-PhaseD-E-F-G-20260822-V2.5R1";

const SURFACE_MAP = Object.freeze([
  ["pavedPercent", "paved", "PAVED"],
  ["trackPercent", "track", "TRACK"],
  ["treadmillPercent", "treadmill", "TREADMILL"],
  ["soilPercent", "soil", "SOIL"],
  ["trailPercent", "trail", "TRAIL"],
  ["naturalGrassPercent", "natural_grass", "NATURAL_GRASS"],
  ["artificialTurfPercent", "artificial_turf", "ARTIFICIAL_TURF"],
  ["sandPercent", "sand", "SAND"],
]);

const FOOT_PLACEMENT = Object.freeze({ heel: "RFS", full_sole: "MFS", forefoot: "FFS", varies: "VARIABLE", unknown: "UNKNOWN" });
const SHOE_TYPE = Object.freeze({ usual_training: "TRAINING", soft: "TRAINING_SOFT", light: "LIGHTWEIGHT", race: "RACING", trail: "TRAIL", other: "OTHER" });
const SHOE_SOFTNESS = Object.freeze({ soft: "SOFT", normal: "NORMAL", firm: "FIRM", unknown: "UNKNOWN" });

const RW_DISTANCE_INPUT_ID = "A9-APP-RW-RUNNING-DISTANCE";
const RW_DURATION_INPUT_ID = "A9-APP-RW-RUNNING-DURATION";
const RW_SECTIONS_INPUT_ID = "A9-APP-RW-RUNNING-SECTIONS";
const A9_AMOUNT_PARAMETER_ID = "A9-P-COMMON-RUN-AMOUNT-5KM";

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function finite(value) { return value !== null && value !== "" && Number.isFinite(Number(value)); }
function positive(value) { return finite(value) && Number(value) > 0 ? Number(value) : null; }
function unique(values = []) { return [...new Set(values.filter(Boolean).map(String))]; }
function upper(value) { return String(value ?? "").toUpperCase(); }
function isRunWalk(record = {}) { return upper(record.runningFormat) === "RUN_WALK"; }

function surfaceComponents(course = {}) {
  return SURFACE_MAP.flatMap(([recordKey, componentId, userCategory]) => {
    const sharePercent = Number(course?.[recordKey] || 0);
    return sharePercent > 0 ? [{ componentId, sharePercent, userCategory }] : [];
  });
}

function runSetting(course = {}) {
  const components = surfaceComponents(course);
  if (components.length === 1 && components[0].componentId === "treadmill" && Math.abs(components[0].sharePercent - 100) <= 1e-9) return "TREADMILL";
  return "OUTDOOR";
}

function wholeRunGrade(course = {}) {
  const knowledge = upper(course?.gradeKnowledge || "UNKNOWN");
  if (knowledge === "KNOWN_FLAT") return { gradeKnown: true, gradePercent: 0, gradeDirection: "FLAT" };
  const up = Number(course?.upPercent || 0);
  const down = Number(course?.downPercent || 0);
  if (knowledge === "KNOWN_PROFILE" && up >= 99.999 && down <= 1e-9 && positive(course?.upGradePercent)) {
    return { gradeKnown: true, gradePercent: Number(course.upGradePercent), gradeDirection: "UPHILL" };
  }
  if (knowledge === "KNOWN_PROFILE" && down >= 99.999 && up <= 1e-9 && positive(course?.downGradePercent)) {
    return { gradeKnown: true, gradePercent: Number(course.downGradePercent), gradeDirection: "DOWNHILL" };
  }
  return { gradeKnown: false, gradePercent: null, gradeDirection: "UNKNOWN" };
}

function explicitSections(record = {}) {
  const items = Array.isArray(record?.course?.sections) ? record.course.sections : [];
  if (!items.length) return [];
  const commonSurface = surfaceComponents(record.course);
  return items.flatMap((section = {}, index) => {
    const distanceKm = positive(section.distanceKm)
      ?? (positive(section.sharePercent) ? Number(record.distanceKm) * Number(section.sharePercent) / 100 : null);
    if (!distanceKm) return [];
    const gradeRaw = section.gradePercent == null ? null : Number(section.gradePercent);
    const gradeKnown = Number.isFinite(gradeRaw);
    const gradeDirection = upper(section.gradeDirection || (gradeRaw > 0 ? "UPHILL" : gradeRaw < 0 ? "DOWNHILL" : gradeRaw === 0 ? "FLAT" : "UNKNOWN"));
    return [{
      sectionId: section.sectionId || `section-${index + 1}`,
      distanceKm,
      sharePercent: positive(section.sharePercent),
      speedMps: positive(section.speedMps)
        ?? (positive(section.durationMinutes) ? distanceKm * 1000 / (Number(section.durationMinutes) * 60) : null),
      cadenceSpm: positive(section.cadenceSpm),
      gradeKnown,
      gradePercent: gradeKnown ? Math.abs(gradeRaw) : null,
      gradeDirection,
      surfaceComponents: Array.isArray(section.surfaceComponents) && section.surfaceComponents.length ? clone(section.surfaceComponents) : clone(commonSurface),
      exactSurfaceActive: Boolean(section.exactSurfaceActive),
      exactArchSurfaceActive: Boolean(section.exactArchSurfaceActive),
    }];
  });
}

function summaryGradeSections(record = {}) {
  const course = record.course || {};
  if (upper(course.gradeKnowledge) !== "KNOWN_PROFILE") return [];
  const up = Math.max(0, Number(course.upPercent || 0));
  const down = Math.max(0, Number(course.downPercent || 0));
  const flat = Math.max(0, 100 - up - down);
  const positiveShares = [up, down, flat].filter((share) => share > 1e-9);
  if (positiveShares.length <= 1 || Math.abs(up + down + flat - 100) > 0.01) return [];
  const commonSurface = surfaceComponents(course);
  const out = [];
  if (up > 1e-9 && positive(course.upGradePercent)) out.push({ sectionId: "summary-uphill", sharePercent: up, distanceKm: Number(record.distanceKm) * up / 100, gradeKnown: true, gradePercent: Number(course.upGradePercent), gradeDirection: "UPHILL", surfaceComponents: clone(commonSurface) });
  if (down > 1e-9 && positive(course.downGradePercent)) out.push({ sectionId: "summary-downhill", sharePercent: down, distanceKm: Number(record.distanceKm) * down / 100, gradeKnown: true, gradePercent: Number(course.downGradePercent), gradeDirection: "DOWNHILL", surfaceComponents: clone(commonSurface) });
  if (flat > 1e-9) out.push({ sectionId: "summary-flat", sharePercent: flat, distanceKm: Number(record.distanceKm) * flat / 100, gradeKnown: true, gradePercent: 0, gradeDirection: "FLAT", surfaceComponents: clone(commonSurface) });
  return out.length === positiveShares.length ? out : [];
}

function sections(record = {}) {
  const explicit = explicitSections(record);
  if (explicit.length) return explicit;
  return summaryGradeSections(record);
}

function normalizeRunWalkRunningSections(record = {}) {
  return (Array.isArray(record.runWalkRunningSections) ? record.runWalkRunningSections : []).map((section, index) => ({
    sectionId: section.sectionId || `running-phase-${index + 1}`,
    sharePercent: Number(section.sharePercent),
    gradeKnown: section.gradeKnown !== false,
    gradePercent: section.gradePercent == null ? null : Number(section.gradePercent),
    gradeDirection: upper(section.gradeDirection),
    surfaceComponents: clone(section.surfaceComponents || []),
    exactSurfaceActive: Boolean(section.exactSurfaceActive),
    exactArchSurfaceActive: Boolean(section.exactArchSurfaceActive),
  }));
}

export function buildA9AppReviewInput(record = {}, options = {}) {
  const distanceKm = positive(record.distanceKm);
  const durationMinutes = positive(record.durationMinutes);
  if (record.activityType !== "run" || !distanceKm || !durationMinutes) return null;
  const course = record.course || {};
  const grade = wholeRunGrade(course);
  const stepCount = positive(record.steps);
  const cadenceSpm = stepCount && durationMinutes ? stepCount / durationMinutes : null;
  const personal = record.personalContext || {};
  return {
    distanceKm,
    durationMinutes,
    runningFormat: record.runningFormat || "UNKNOWN",
    runWalkRunningDistanceKm: positive(record.runWalkRunningDistanceKm),
    runWalkRunningDurationMinutes: positive(record.runWalkRunningDurationMinutes),
    runWalkRunningSections: normalizeRunWalkRunningSections(record),
    runSetting: runSetting(course),
    gradeKnown: grade.gradeKnown,
    gradePercent: grade.gradePercent,
    gradeDirection: grade.gradeDirection,
    cadenceSpm,
    cadenceProvenance: String(record.stepsProvenance || "UNKNOWN").toUpperCase(),
    cadenceReference: options.cadenceReference || null,
    sections: sections(record),
    surfaceComponents: surfaceComponents(course),
    exactSurfaceActive: false,
    exactArchSurfaceActive: false,
    footPlacement: FOOT_PLACEMENT[String(personal.footPlacement || "unknown")] || "UNKNOWN",
    shoeType: SHOE_TYPE[String(personal.shoeType || "other")] || "OTHER",
    shoeSoftness: SHOE_SOFTNESS[String(personal.shoeSoftness || "unknown")] || "UNKNOWN",
  };
}

function lineageForRegion(region = {}, { runningPhase = false, mixedRunningPhase = false } = {}) {
  const numeric = new Set();
  const routeGate = new Set(["RL-IN-003", "RL-IN-017", "RL-IN-018", "RL-IN-032", "RL-IN-040", "RL-IN-072", "RL-IN-073", "RL-IN-080"]);
  const aggregation = new Set(["RL-IN-039", "RL-IN-041"]);
  const derived = [];
  if (runningPhase) {
    numeric.add(RW_DISTANCE_INPUT_ID); routeGate.add(RW_DURATION_INPUT_ID);
    if (mixedRunningPhase) aggregation.add(RW_SECTIONS_INPUT_ID);
  } else {
    numeric.add("RL-IN-011"); numeric.add("RL-DV-019");
    derived.push({ derivedInputId: "RL-DV-019", dependsOnInputIds: ["RL-IN-011", "RL-IN-013"], meaning: "averageSpeedMps" });
  }
  const audits = Array.isArray(region.sectionAudit) ? region.sectionAudit : [];
  if (audits.some((item) => Number(item.gradePercent) > 1e-12)) numeric.add("RL-IN-036");
  if (audits.some((item) => Number(item.gradePercent) < -1e-12)) numeric.add("RL-IN-037");
  const surfaceNumeric = audits.some((item) => item.surfaceModifier?.numericSurfaceMainEffectApplied === true);
  if (surfaceNumeric) numeric.add("RL-IN-041");
  const cadence = region.cadenceDisposition || audits.find((item) => item.cadenceDisposition)?.cadenceDisposition || null;
  if (cadence?.numericEffectApplied === true) {
    numeric.add("RL-IN-015"); numeric.add("RL-DV-021"); routeGate.add("RL-IN-016");
    derived.push({ derivedInputId: "RL-DV-021", dependsOnInputIds: ["RL-IN-015", "RL-IN-013"], meaning: "averageCadenceSpm" });
  } else if (cadence?.applicable === true) routeGate.add("RL-IN-016");
  const used = new Set([...numeric, ...routeGate, ...aggregation]);
  return Object.freeze({
    numericInputIds: Object.freeze([...numeric].sort()),
    routeGateInputIds: Object.freeze([...routeGate].sort()),
    aggregationInputIds: Object.freeze([...aggregation].sort()),
    derivedInputLineage: Object.freeze(derived.map((item) => Object.freeze({ ...item, dependsOnInputIds: Object.freeze([...item.dependsOnInputIds]) }))),
    usedInputIds: Object.freeze([...used].sort()),
  });
}

function inputIdsForRoute(region = {}, flags = {}) {
  return lineageForRegion(region, flags).usedInputIds;
}

function sectionContributionEvents(row, a9Region, flags) {
  const audits = Array.isArray(a9Region.sectionAudit) ? a9Region.sectionAudit : [];
  const total = audits.reduce((sum, item) => sum + (Number(item.distanceKm) > 0 ? Number(item.distanceKm) : 0), 0);
  return audits.map((item, index) => {
    const weight = Number(item.distanceKm) > 0 && total > 0 ? Number(item.distanceKm) / total : (audits.length ? 1 / audits.length : 1);
    const ratio = Number(item.ratio);
    const routeId = String(item.routeIds?.[0] || a9Region.activeRouteIds?.[0] || "A9_CONDITION_ROUTE");
    const routeSignature = item.routeSignature || a9Region.conditionHistorySignature || null;
    return {
      traceCode: "SECTION_CONDITION_CONTRIBUTION",
      severity: "INFO",
      scope: "SECTION",
      regionId: row.regionId,
      sectionId: item.sectionId || `a9-section-${index + 1}`,
      routeId,
      messageKey: "regional.condition.section_contribution",
      messageArgs: {
        traceContractVersion: "runload-reason-trace-1.2",
        sectionWeight: Number(item.distanceKm) || null,
        totalWeight: total || null,
        normalizedSectionWeight: weight,
        conditionRatio: ratio,
        conditionLogRaw: Math.log(ratio),
        routeIds: clone(item.routeIds || []),
        interactionIds: [],
        a9SupportTier: item.supportTier || a9Region.conditionSupportTier || null,
        a9EvidenceOrigin: item.evidenceOrigin || null,
        a9RegionalMapping: item.regionalMapping || null,
        a9RouteSignature: routeSignature,
        a9UncertaintyClass: item.uncertaintyClass || null,
        a9AuthorityVersion: A9_APP_AUTHORITY_VERSION,
        evidenceRange: {
          state: (item.supportTier || a9Region.conditionSupportTier) === "PROVISIONAL_AUTHORIZED" ? "A9_BOUNDED_PROVISIONAL" : "A9_EVIDENCE_ACTIVE",
          supportTier: item.supportTier || a9Region.conditionSupportTier || null,
          routeSignature,
          uncertaintyClass: item.uncertaintyClass || null,
          authorityVersion: A9_APP_AUTHORITY_VERSION,
        },
      },
      numericEffectApplied: true,
      contributionLog: weight * Math.log(ratio),
      inputIds: inputIdsForRoute(a9Region, flags),
      sourceIds: clone(a9Region.sourceIds || []),
      parameterIds: unique((item.routeIds || []).map((id) => `A9-RULE:${id}`)),
    };
  });
}

function componentCoverageFor(a9Region) {
  const audits = Array.isArray(a9Region.sectionAudit) ? a9Region.sectionAudit : [];
  return {
    state: audits.length ? "FULL" : "NONE",
    sections: audits.map((item, index) => {
      const routes = unique(item.routeIds || []);
      const observed = routes.length ? routes : ["A9_CONDITION_RESPONSE"];
      return {
        sectionId: item.sectionId || `a9-section-${index + 1}`,
        state: "FULL",
        observedComponentIds: observed,
        missingComponentIds: [],
        normalizedWeights: Object.fromEntries(observed.map((id, i) => [id, i === 0 ? 1 : 0])),
      };
    }),
  };
}

function exposureEvent(row, a9Region, { runningPhase = false, runDistanceKm = null } = {}) {
  const qEquivalent = runningPhase ? Number(runDistanceKm) : 5 * Number(a9Region.commonRunAmountIndex) / 100;
  const exposureLog = Math.log(Number(a9Region.commonRunAmountIndex) / 100);
  return {
    traceCode: "EXPOSURE_CONTRIBUTION",
    severity: "INFO",
    scope: "REGION",
    regionId: row.regionId,
    sectionId: null,
    routeId: "A9_COMMON_RUN_AMOUNT_DISTANCE",
    messageKey: "regional.exposure.a9_common_run_amount",
    messageArgs: {
      basis: "DISTANCE",
      qEquivalent,
      qReference: 5,
      alphaE: 1,
      phaseScope: runningPhase ? A9_RUN_WALK_PHASE_SCOPE : "WHOLE_RUN",
    },
    numericEffectApplied: true,
    contributionLog: exposureLog,
    inputIds: runningPhase ? [RW_DISTANCE_INPUT_ID] : ["RL-IN-011"],
    sourceIds: [],
    parameterIds: [A9_AMOUNT_PARAMETER_ID],
  };
}

function overlayRow(row, a9Region, context = {}) {
  if (!a9Region?.conditionResponseSupported || !finite(a9Region.conditionResponseRatio) || !(Number(a9Region.conditionResponseRatio) > 0) || !finite(a9Region.reviewIndexExact)) return row;
  const runningPhase = context.runningPhase === true;
  const mixedRunningPhase = context.mixedRunningPhase === true;
  const flags = { runningPhase, mixedRunningPhase };
  const lineage = lineageForRegion(a9Region, flags);
  const conditionLog = Math.log(Number(a9Region.conditionResponseRatio));
  const exposureLog = Math.log(Number(a9Region.commonRunAmountIndex) / 100);
  const totalLog = conditionLog + exposureLog;
  const indexExact = Number(a9Region.reviewIndexExact);
  const conditionEvents = sectionContributionEvents(row, a9Region, flags);
  const amountEvent = exposureEvent(row, a9Region, { runningPhase, runDistanceKm: context.runDistanceKm });
  const disclosure = {
    traceCode: a9Region.conditionSupportTier === "PROVISIONAL_AUTHORIZED" ? "A9_AUTHORIZED_PROVISIONAL_DISCLOSURE" : "A9_DIRECT_SOURCE_DOMAIN_DISCLOSURE",
    severity: "INFO",
    scope: "REGION",
    regionId: row.regionId,
    sectionId: null,
    routeId: a9Region.activeRouteIds?.[0] || "A9_CONDITION_ROUTE",
    messageKey: "regional.a9.condition.evidence_tier",
    messageArgs: {
      supportTier: a9Region.conditionSupportTier || null,
      evidenceOrigins: clone(a9Region.conditionEvidenceOrigins || []),
      regionalMappings: clone(a9Region.conditionRegionalMappings || []),
      routeSignatures: clone(a9Region.conditionRouteSignatures || []),
      uncertaintyClasses: clone(a9Region.conditionUncertaintyClasses || []),
      conditionReferenceFamily: a9Region.conditionReferenceFamily || null,
      phaseScope: runningPhase ? A9_RUN_WALK_PHASE_SCOPE : "WHOLE_RUN",
      interpretation: a9Region.conditionSupportTier === "PROVISIONAL_AUTHORIZED"
        ? "BOUNDED_LITERATURE_ANCHORED_PROVISIONAL_ESTIMATE_NOT_DIRECT_OBSERVATION"
        : "DIRECT_SOURCE_DOMAIN_OR_WITHIN_SOURCE_DERIVATION",
    },
    numericEffectApplied: false,
    contributionLog: null,
    inputIds: inputIdsForRoute(a9Region, flags),
    sourceIds: clone(a9Region.sourceIds || []),
    parameterIds: unique((a9Region.activeRouteIds || []).map((id) => `A9-RULE:${id}`)),
  };
  const preservedNonnumeric = (row.reasonTrace || []).filter((event) => (
    event.numericEffectApplied !== true
    && !["SOURCE_ROUTE_INACTIVE", "EXPOSURE_ONLY_ALL_SECTIONS_CONDITION_UNSUPPORTED"].includes(event.traceCode)
  ));
  const newTrace = [...conditionEvents, amountEvent, ...preservedNonnumeric, disclosure];
  const newRoutes = unique(a9Region.activeRouteIds || []);
  const newSources = unique(a9Region.sourceIds || []);
  const newParameters = unique([A9_AMOUNT_PARAMETER_ID, ...newRoutes.map((id) => `A9-RULE:${id}`)]);
  const used = unique(lineage.usedInputIds);
  const omitted = unique([...(row.omittedInputIds || []), ...(row.usedInputIds || []).filter((id) => !used.includes(id))]).filter((id) => !used.includes(id));
  const limitations = unique([
    ...(row.limitations || []),
    "a9_condition_response_is_relative_not_measured_physical_load",
    ...(a9Region.conditionSupportTier === "PROVISIONAL_AUTHORIZED" ? ["a9_bounded_provisional_condition_response"] : []),
    ...(runningPhase ? ["run_walk_numeric_result_covers_running_phase_only", "walking_and_transition_not_numerically_modeled"] : []),
  ]);
  return {
    ...row,
    constructId: a9Region.conditionConstructId || row.constructId,
    referenceDefinitionId: a9Region.conditionReferenceDefinitionId || row.referenceDefinitionId,
    referenceValue: 100,
    indexExact,
    deltaFromReferenceExact: indexExact - 100,
    displayIndex: Math.round(indexExact),
    displayDeltaPoints: Math.round(indexExact - 100),
    calculationState: "CALCULATED",
    components: {
      ...row.components,
      conditionLog,
      exposureLog,
      interactionLog: 0,
      personalModifierLog: 0,
      selfReportedStateLog: 0,
      totalLog,
      mechanicalIndexWithoutSelfState: indexExact,
      selfReportedStateMultiplier: 1,
    },
    exposure: {
      basis: "DISTANCE",
      qEquivalent: runningPhase ? Number(context.runDistanceKm) : 5 * Number(a9Region.commonRunAmountIndex) / 100,
      qReference: 5,
      alphaE: 1,
      a9CommonRunAmount: true,
      phaseScope: runningPhase ? A9_RUN_WALK_PHASE_SCOPE : "WHOLE_RUN",
    },
    componentCoverage: componentCoverageFor(a9Region),
    activeRouteIds: newRoutes,
    activeInteractionIds: [],
    usedInputIds: used,
    numericInputIds: clone(lineage.numericInputIds),
    routeGateInputIds: clone(lineage.routeGateInputIds),
    aggregationInputIds: clone(lineage.aggregationInputIds),
    derivedInputLineage: clone(lineage.derivedInputLineage),
    omittedInputIds: omitted,
    sourceIds: newSources,
    parameterIds: newParameters,
    reasonTrace: newTrace,
    limitations,
    a9ConditionEvidence: {
      overlayVersion: A9_APP_OVERLAY_VERSION,
      authorityVersion: A9_APP_AUTHORITY_VERSION,
      modelVersion: A9_REVIEW_MODEL_VERSION,
      canonicalSpeedFamilyVersion: A9_V25R1_CANONICAL_SPEED_VERSION,
      supportTier: a9Region.conditionSupportTier || null,
      evidenceOrigins: clone(a9Region.conditionEvidenceOrigins || []),
      regionalMappings: clone(a9Region.conditionRegionalMappings || []),
      historySignature: a9Region.conditionHistorySignature || null,
      routeSignatures: clone(a9Region.conditionRouteSignatures || []),
      uncertaintyClasses: clone(a9Region.conditionUncertaintyClasses || []),
      referenceFamily: a9Region.conditionReferenceFamily || null,
      canonicalFamilyId: a9Region.canonicalFamilyId || a9Region.conditionReferenceFamily || null,
      surfaceDisposition: clone(a9Region.sectionAudit?.flatMap((item) => item.surfaceDispositions || []) || []),
      cadenceDisposition: clone(a9Region.cadenceDisposition || null),
      phaseScope: runningPhase ? A9_RUN_WALK_PHASE_SCOPE : "WHOLE_RUN",
      runningPhaseOnly: runningPhase,
      walkingPhaseIncludedInNumericResult: runningPhase ? false : null,
      transitionPhaseIncludedInNumericResult: runningPhase ? false : null,
      unsupportedConditionInterpretedAsNeutral: false,
      isMeasuredPhysicalLoad: false,
    },
  };
}

function recalculateCoverageSummary(output = {}) {
  const regions = output.regions || [];
  const count = (state) => regions.filter((region) => region.calculationState === state).length;
  return {
    ...(output.coverageSummary || {}),
    calculatedRegionCount: count("CALCULATED"),
    partialRegionCount: count("PARTIAL"),
    notCalculableRegionCount: count("NOT_CALCULABLE"),
    outOfRangeRegionCount: count("OUT_OF_SUPPORTED_RANGE"),
    notApplicableRegionCount: count("NOT_APPLICABLE"),
  };
}

function finalizeOutput(next) {
  next.coverageSummary = recalculateCoverageSummary(next);
  const { resultHash: _oldHash, ...base } = next;
  next.resultHash = hashCanonical(base);
  return next;
}

function failClosedWithStatus(calculationOutput, status, detail = {}) {
  const next = clone(calculationOutput);
  next.authorityVersion = A9_APP_AUTHORITY_VERSION;
  next.parameterSetVersion = A9_REVIEW_MODEL_VERSION;
  next.regions = (next.regions || []).map((row) => ({
    ...row,
    indexExact: null,
    deltaFromReferenceExact: null,
    displayIndex: null,
    displayDeltaPoints: null,
    calculationState: "NOT_CALCULABLE",
    activeRouteIds: [],
    activeInteractionIds: [],
    usedInputIds: [],
    numericInputIds: [],
    sourceIds: [],
    parameterIds: [],
    components: { ...(row.components || {}), conditionLog: null, exposureLog: null, interactionLog: null, personalModifierLog: null, selfReportedStateLog: null, totalLog: null, mechanicalIndexWithoutSelfState: null },
    reasonTrace: [
      ...(row.reasonTrace || []).filter((event) => event.numericEffectApplied !== true),
      { traceCode: "V25R1_MODEL_USE_FAIL_CLOSED", severity: "WARNING", scope: "REGION", regionId: row.regionId, sectionId: null, routeId: null, messageKey: "regional.v25r1.model_use_fail_closed", messageArgs: { status, ...clone(detail) }, numericEffectApplied: false, contributionLog: null, inputIds: [], sourceIds: [], parameterIds: [] },
    ],
    limitations: unique([...(row.limitations || []), "v25r1_condition_coordinate_unavailable_fail_closed"]),
    a9ConditionEvidence: { overlayVersion: A9_APP_OVERLAY_VERSION, authorityVersion: A9_APP_AUTHORITY_VERSION, modelVersion: A9_REVIEW_MODEL_VERSION, supportTier: null, phaseScope: detail.phaseScope || "WHOLE_RUN", unsupportedConditionInterpretedAsNeutral: false, isMeasuredPhysicalLoad: false, failClosed: true, failClosedStatus: status },
  }));
  next.a9Integration = {
    overlayVersion: A9_APP_OVERLAY_VERSION,
    authorityVersion: A9_APP_AUTHORITY_VERSION,
    reviewModelVersion: A9_REVIEW_MODEL_VERSION,
    appliedRegionIds: [],
    status,
    numericFullResponseAvailable: false,
    failClosed: true,
    unsupportedConditionInterpretedAsNeutral: false,
    ...clone(detail),
  };
  return finalizeOutput(next);
}

function passthroughWithStatus(calculationOutput, status, detail = {}) {
  const next = clone(calculationOutput);
  next.authorityVersion = A9_APP_AUTHORITY_VERSION;
  next.parameterSetVersion = A9_REVIEW_MODEL_VERSION;
  next.a9Integration = {
    overlayVersion: A9_APP_OVERLAY_VERSION,
    authorityVersion: A9_APP_AUTHORITY_VERSION,
    reviewModelVersion: A9_REVIEW_MODEL_VERSION,
    appliedRegionIds: [],
    status,
    numericFullResponseAvailable: false,
    legacyOrInsufficientInputPreservedWithoutImputation: true,
    unsupportedConditionInterpretedAsNeutral: false,
    ...clone(detail),
  };
  return finalizeOutput(next);
}

export function applyA9ConditionOverlay(calculationOutput = {}, record = {}, options = {}) {
  const cadenceReference = deriveV25R1PersonalHabitualCadence({ currentRecord: record, priorRecords: options.allRecords || [] });
  const input = buildA9AppReviewInput(record, { cadenceReference });
  if (!input) return { ok: true, value: calculationOutput, audit: { appliedRegionIds: [], a9Review: null } };

  const runningPhase = isRunWalk(record);
  if (runningPhase && (!positive(record.runWalkRunningDistanceKm) || !positive(record.runWalkRunningDurationMinutes))) {
    const value = passthroughWithStatus(calculationOutput, "RUN_WALK_DETAILS_MISSING");
    return { ok: true, value, audit: { appliedRegionIds: [], a9Review: null, status: "RUN_WALK_DETAILS_MISSING" } };
  }

  const review = runningPhase
    ? calculateA9RunWalkRunningPhaseReview(input, { includeProvisional: true })
    : calculateA9RegionalReview(input, { includeProvisional: true });

  if (!review.ok && runningPhase && review.error?.code === "RUN_WALK_PHASE_TO_SECTION_MAPPING_REQUIRED") {
    const detailCode = review.error?.detailCode || null;
    const status = String(detailCode || "").includes("GRADE_OUT_OF_MODEL_USE_DOMAIN")
      ? "RUN_WALK_GRADE_OUT_OF_MODEL_USE_DOMAIN"
      : String(detailCode || "").includes("TREADMILL_OUTDOOR_MIX")
        ? "TREADMILL_OUTDOOR_MIX_FORBIDDEN"
        : "RUN_WALK_PHASE_MAPPING_MISSING";
    const value = failClosedWithStatus(calculationOutput, status, { detailCode, phaseScope: A9_RUN_WALK_PHASE_SCOPE });
    return { ok: true, value, audit: { appliedRegionIds: [], a9Review: null, status } };
  }
  if (!review.ok && ["TREADMILL_OUTDOOR_MIX_FORBIDDEN","GRADE_OUT_OF_MODEL_USE_DOMAIN","SPEED_OUT_OF_MODEL_USE_DOMAIN"].includes(review.error?.code)) {
    const value = failClosedWithStatus(calculationOutput, review.error.code, { modelUseDomainFailure: clone(review.error), phaseScope: runningPhase ? A9_RUN_WALK_PHASE_SCOPE : "WHOLE_RUN" });
    return { ok: true, value, audit: { appliedRegionIds: [], a9Review: null, status: review.error.code } };
  }
  if (!review.ok) return { ok: false, error: { code: "A9_APP_REVIEW_FAILED", detail: review.error } };

  if ((review.value.regions || []).every((region) => region.conditionResponseSupported !== true)) {
    const value = failClosedWithStatus(calculationOutput, "CONDITION_COORDINATE_UNAVAILABLE", {
      phaseScope: runningPhase ? A9_RUN_WALK_PHASE_SCOPE : "WHOLE_RUN",
      conditionReasons: unique((review.value.regions || []).map((region) => region.conditionReason || region.sectionAudit?.[0]?.reason).filter(Boolean)),
      explicitUnknownPreserved: true,
    });
    return { ok: true, value, audit: { appliedRegionIds: [], a9Review: review.value, status: "CONDITION_COORDINATE_UNAVAILABLE" } };
  }

  const byId = new Map(review.value.regions.map((region) => [region.regionId, region]));
  const next = clone(calculationOutput);
  const appliedRegionIds = [];
  const mixedRunningPhase = runningPhase && Boolean(review.value.runWalkScope?.mixedWholeRecordConditions);
  next.regions = (next.regions || []).map((row) => {
    const a9Region = byId.get(row.regionId);
    const overlaid = overlayRow(row, a9Region, {
      runningPhase,
      mixedRunningPhase,
      runDistanceKm: runningPhase ? Number(review.value.runWalkScope?.runningDistanceKm) : null,
    });
    if (overlaid.a9ConditionEvidence) appliedRegionIds.push(row.regionId);
    return overlaid;
  });
  next.a9Integration = {
    overlayVersion: A9_APP_OVERLAY_VERSION,
    authorityVersion: A9_APP_AUTHORITY_VERSION,
    reviewModelVersion: A9_REVIEW_MODEL_VERSION,
    appliedRegionIds: unique(appliedRegionIds),
    status: appliedRegionIds.length === 12 ? "FULL_12_APPLIED" : "PARTIAL_APPLIED",
    numericFullResponseAvailable: appliedRegionIds.length === 12,
    phaseScope: runningPhase ? A9_RUN_WALK_PHASE_SCOPE : "WHOLE_RUN",
    runningPhaseOnly: runningPhase,
    runWalkScope: runningPhase ? clone(review.value.runWalkScope || null) : null,
    wholeRecordAverageSpeedUsedForRunWalkConditionRoute: runningPhase ? false : null,
    directAndProvisionalTierPreserved: true,
    cadenceReference: clone(cadenceReference),
    unsupportedConditionInterpretedAsNeutral: false,
    stateSemantics: {
      inheritedLegacyOverallCalculationState: calculationOutput.overallCalculationState || null,
      inheritedLegacyDistanceSupportRangeKm: [0.5, 20],
      legacyRangeDefinesFcrScientificDomain: false,
      fcrConditionResponseState: review.value.stateSemantics?.conditionResponseState || (appliedRegionIds.length === 12 ? "FULL_12_SUPPORTED" : "PARTIAL_SUPPORTED"),
      fcrAmountIndexState: review.value.stateSemantics?.amountIndexState || "AVAILABLE_PROJECT_DEFINED",
      fcrAmountScientificRangeClaimed: false,
      currentRegionNumericState: appliedRegionIds.length === 12 ? "CALCULATED_FCR_FULL_12" : "CALCULATED_FCR_PARTIAL",
    },
  };
  finalizeOutput(next);
  return { ok: true, value: next, audit: { appliedRegionIds: unique(appliedRegionIds), a9Review: review.value } };
}
