import { calculateA9RegionalReview, A9_REVIEW_MODEL_VERSION } from "./a9ReviewModel.js";
import { A9_PAVED_FAMILY_VERSION } from "./a9PavedFamilies.js";
import { hashCanonical } from "../../engine/sha256.js";

export const A9_APP_OVERLAY_VERSION = "runload-a9-phase4-condition-overlay-v1.0";
export const A9_APP_AUTHORITY_VERSION = "RunLoad-A9-Provisional-Authority-Expansion-G07-Reconciliation-20260821-V2.0";

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

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function finite(value) { return value !== null && value !== "" && Number.isFinite(Number(value)); }
function positive(value) { return finite(value) && Number(value) > 0 ? Number(value) : null; }
function unique(values = []) { return [...new Set(values.filter(Boolean).map(String))]; }

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
  const knowledge = String(course?.gradeKnowledge || "UNKNOWN").toUpperCase();
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

function sections(record = {}) {
  const items = Array.isArray(record?.course?.sections) ? record.course.sections : [];
  if (!items.length) return [];
  const commonSurface = surfaceComponents(record.course);
  return items.flatMap((section = {}, index) => {
    const distanceKm = positive(section.distanceKm)
      ?? (positive(section.sharePercent) ? Number(record.distanceKm) * Number(section.sharePercent) / 100 : null);
    if (!distanceKm) return [];
    const gradeRaw = section.gradePercent == null ? null : Number(section.gradePercent);
    const gradeKnown = Number.isFinite(gradeRaw);
    const gradeDirection = String(section.gradeDirection || (gradeRaw > 0 ? "UPHILL" : gradeRaw < 0 ? "DOWNHILL" : gradeRaw === 0 ? "FLAT" : "UNKNOWN")).toUpperCase();
    return [{
      sectionId: section.sectionId || `section-${index + 1}`,
      distanceKm,
      sharePercent: positive(section.sharePercent),
      speedMps: positive(section.speedMps),
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

export function buildA9AppReviewInput(record = {}) {
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
    runSetting: runSetting(course),
    gradeKnown: grade.gradeKnown,
    gradePercent: grade.gradePercent,
    gradeDirection: grade.gradeDirection,
    cadenceSpm,
    sections: sections(record),
    surfaceComponents: surfaceComponents(course),
    exactSurfaceActive: false,
    exactArchSurfaceActive: false,
    footPlacement: FOOT_PLACEMENT[String(personal.footPlacement || "unknown")] || "UNKNOWN",
    shoeType: SHOE_TYPE[String(personal.shoeType || "other")] || "OTHER",
    shoeSoftness: SHOE_SOFTNESS[String(personal.shoeSoftness || "unknown")] || "UNKNOWN",
  };
}

function relevantA9Route(region = {}) {
  return (region.activeRouteIds || []).some((routeId) => String(routeId).startsWith("A9-"));
}

function inputIdsForRoute(region = {}) {
  const ids = ["RL-IN-003", "RL-IN-011", "RL-DV-019", "RL-IN-017", "RL-IN-032", "RL-IN-039", "RL-IN-040", "RL-IN-041"];
  if ((region.activeRouteIds || []).some((id) => String(id).includes("GRADE") || String(id).includes("RICE"))) ids.push("RL-IN-036", "RL-IN-037");
  return unique(ids);
}

function sectionContributionEvents(row, a9Region) {
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
        a9RouteSignature: routeSignature,
        a9UncertaintyClass: item.uncertaintyClass || null,
        a9AuthorityVersion: A9_APP_AUTHORITY_VERSION,
      },
      numericEffectApplied: true,
      contributionLog: weight * Math.log(ratio),
      inputIds: inputIdsForRoute(a9Region),
      sourceIds: clone(a9Region.sourceIds || []),
      parameterIds: unique((item.routeIds || []).map((id) => `A9-RULE:${id}`)),
    };
  });
}

function overlayRow(row, a9Region) {
  const baseNumericState = ["CALCULATED", "PARTIAL"].includes(row?.calculationState);
  const baseExposureAvailable = finite(row?.components?.exposureLog) && finite(row?.indexExact);
  if (!baseNumericState || !baseExposureAvailable) return row;
  if (!a9Region?.conditionResponseSupported || !finite(a9Region.conditionResponseRatio) || !(Number(a9Region.conditionResponseRatio) > 0) || !relevantA9Route(a9Region)) return row;
  const conditionLog = Math.log(Number(a9Region.conditionResponseRatio));
  const exposureLog = finite(row.components?.exposureLog) ? Number(row.components.exposureLog) : 0;
  const totalLog = conditionLog + exposureLog;
  const indexExact = 100 * Math.exp(totalLog);
  const exposureEvent = (row.reasonTrace || []).find((event) => event.traceCode === "EXPOSURE_CONTRIBUTION" && event.numericEffectApplied === true);
  const conditionEvents = sectionContributionEvents(row, a9Region);
  const disclosure = {
    traceCode: a9Region.conditionSupportTier === "PROVISIONAL_AUTHORIZED" ? "A9_AUTHORIZED_PROVISIONAL_DISCLOSURE" : "A9_DIRECT_SOURCE_DOMAIN_DISCLOSURE",
    severity: "INFO",
    scope: "REGION",
    regionId: row.regionId,
    sectionId: null,
    routeId: a9Region.activeRouteIds?.[0] || null,
    messageKey: "regional.a9.condition.evidence_tier",
    messageArgs: {
      supportTier: a9Region.conditionSupportTier || null,
      routeSignatures: clone(a9Region.conditionRouteSignatures || []),
      uncertaintyClasses: clone(a9Region.conditionUncertaintyClasses || []),
      conditionReferenceFamily: a9Region.conditionReferenceFamily || null,
      interpretation: a9Region.conditionSupportTier === "PROVISIONAL_AUTHORIZED"
        ? "BOUNDED_LITERATURE_ANCHORED_PROVISIONAL_ESTIMATE_NOT_DIRECT_OBSERVATION"
        : "DIRECT_SOURCE_DOMAIN_OR_WITHIN_SOURCE_DERIVATION",
    },
    numericEffectApplied: false,
    contributionLog: null,
    inputIds: inputIdsForRoute(a9Region),
    sourceIds: clone(a9Region.sourceIds || []),
    parameterIds: unique((a9Region.activeRouteIds || []).map((id) => `A9-RULE:${id}`)),
  };
  const preservedNonnumeric = (row.reasonTrace || []).filter((event) => (
    event.numericEffectApplied !== true
    && !["SOURCE_ROUTE_INACTIVE", "EXPOSURE_ONLY_ALL_SECTIONS_CONDITION_UNSUPPORTED"].includes(event.traceCode)
  ));
  const newTrace = [...conditionEvents, ...(exposureEvent ? [clone(exposureEvent)] : []), ...preservedNonnumeric, disclosure];
  const newRoutes = unique(a9Region.activeRouteIds || []);
  const newSources = unique(a9Region.sourceIds || []);
  const newParameters = unique([...(row.parameterIds || []).filter((id) => String(id).startsWith("RCM-P-GLOBAL-")), ...newRoutes.map((id) => `A9-RULE:${id}`)]);
  const used = unique([...(row.usedInputIds || []), ...inputIdsForRoute(a9Region)]);
  const omitted = (row.omittedInputIds || []).filter((id) => !used.includes(id));
  const limitations = unique([
    ...(row.limitations || []),
    "a9_condition_response_is_relative_not_measured_physical_load",
    ...(a9Region.conditionSupportTier === "PROVISIONAL_AUTHORIZED" ? ["a9_provisional_estimate_outside_direct_target_environment_group_domain"] : []),
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
    components: {
      ...row.components,
      conditionLog,
      interactionLog: 0,
      personalModifierLog: 0,
      selfReportedStateLog: 0,
      totalLog,
      mechanicalIndexWithoutSelfState: indexExact,
      selfReportedStateMultiplier: 1,
    },
    activeRouteIds: newRoutes,
    activeInteractionIds: [],
    usedInputIds: used,
    omittedInputIds: omitted,
    sourceIds: newSources,
    parameterIds: newParameters,
    reasonTrace: newTrace,
    limitations,
    a9ConditionEvidence: {
      overlayVersion: A9_APP_OVERLAY_VERSION,
      authorityVersion: A9_APP_AUTHORITY_VERSION,
      modelVersion: A9_REVIEW_MODEL_VERSION,
      pavedFamilyVersion: A9_PAVED_FAMILY_VERSION,
      supportTier: a9Region.conditionSupportTier || null,
      historySignature: a9Region.conditionHistorySignature || null,
      routeSignatures: clone(a9Region.conditionRouteSignatures || []),
      uncertaintyClasses: clone(a9Region.conditionUncertaintyClasses || []),
      referenceFamily: a9Region.conditionReferenceFamily || null,
      unsupportedConditionInterpretedAsNeutral: false,
      isMeasuredPhysicalLoad: false,
    },
  };
}

export function applyA9ConditionOverlay(calculationOutput = {}, record = {}) {
  const input = buildA9AppReviewInput(record);
  if (!input) return { ok: true, value: calculationOutput, audit: { appliedRegionIds: [], a9Review: null } };
  const review = calculateA9RegionalReview(input, { includeProvisional: true });
  if (!review.ok) return { ok: false, error: { code: "A9_APP_REVIEW_FAILED", detail: review.error } };
  const byId = new Map(review.value.regions.map((region) => [region.regionId, region]));
  const next = clone(calculationOutput);
  const appliedRegionIds = [];
  next.regions = (next.regions || []).map((row) => {
    const a9Region = byId.get(row.regionId);
    const overlaid = overlayRow(row, a9Region);
    if (overlaid !== row && overlaid.a9ConditionEvidence) appliedRegionIds.push(row.regionId);
    return overlaid;
  });
  next.a9Integration = {
    overlayVersion: A9_APP_OVERLAY_VERSION,
    authorityVersion: A9_APP_AUTHORITY_VERSION,
    reviewModelVersion: A9_REVIEW_MODEL_VERSION,
    appliedRegionIds: unique(appliedRegionIds),
    directAndProvisionalTierPreserved: true,
    unsupportedConditionInterpretedAsNeutral: false,
  };
  const { resultHash: _oldHash, ...base } = next;
  next.resultHash = hashCanonical(base);
  return { ok: true, value: next, audit: { appliedRegionIds: unique(appliedRegionIds), a9Review: review.value } };
}
