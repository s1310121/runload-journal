import { FORMAL_INPUT_CATALOG, REGIONS } from "./data.js";
import { hashCanonical } from "./sha256.js";

const REGION_IDS = REGIONS.map((region) => region.id);
const REGION_ID_SET = new Set(REGION_IDS);
const STATUS_VALUES = new Set([
  "KNOWN",
  "UNKNOWN",
  "NOT_RECORDED",
  "NOT_SET",
  "NOT_APPLICABLE",
  "PARTIAL",
]);
const EMPTY_STATUSES = new Set(["UNKNOWN", "NOT_RECORDED", "NOT_SET", "NOT_APPLICABLE"]);
const SECTION_BASES = new Set(["DISTANCE", "TIME", "STEPS", "CONTACTS"]);
const GRADE_DIRECTIONS = new Set(["FLAT", "UPHILL", "DOWNHILL", "UNKNOWN"]);
const TIMINGS = new Set(["PRE_RUN", "DURING_RUN", "IMMEDIATE_POST", "LATER", "UNKNOWN"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function issue(code, path, details = {}) {
  return { code, messageKey: `validation.${code.toLowerCase()}`, path, details };
}

function requireFinite(issues, value, path, { min = -Infinity, max = Infinity, integer = false, nullable = true } = {}) {
  if (value == null && nullable) return;
  if (!finiteNumber(value)) {
    issues.push(issue("NUMBER_REQUIRED", path, { value }));
    return;
  }
  if (integer && !Number.isInteger(value)) issues.push(issue("INTEGER_REQUIRED", path, { value }));
  if (value < min || value > max) issues.push(issue("NUMBER_OUT_OF_RANGE", path, { value, min, max }));
}

function validateSection(section, index, issues, { allowDerivedSurface = false } = {}) {
  const path = `course.sections[${index}]`;
  if (!isObject(section)) {
    issues.push(issue("SECTION_OBJECT_REQUIRED", path));
    return;
  }
  if (!SECTION_BASES.has(section.shareBasis)) {
    issues.push(issue("SECTION_BASIS_INVALID", `${path}.shareBasis`, { value: section.shareBasis }));
  }
  requireFinite(issues, section.shareValue, `${path}.shareValue`, { min: Number.MIN_VALUE, nullable: false });
  requireFinite(issues, section.distanceKm, `${path}.distanceKm`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.durationMinutes, `${path}.durationMinutes`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.steps, `${path}.steps`, { min: 0, integer: true });
  requireFinite(issues, section.speedMps, `${path}.speedMps`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.cadenceSpm, `${path}.cadenceSpm`, { min: Number.MIN_VALUE });
  requireFinite(issues, section.gradePercent, `${path}.gradePercent`, { min: 0 });
  if (!GRADE_DIRECTIONS.has(section.gradeDirection)) {
    issues.push(issue("GRADE_DIRECTION_INVALID", `${path}.gradeDirection`, { value: section.gradeDirection }));
  }
  if (section.gradeDirection === "FLAT" && section.gradePercent != null && section.gradePercent !== 0) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (["UPHILL", "DOWNHILL"].includes(section.gradeDirection) && !(section.gradePercent > 0)) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (section.gradeDirection === "UNKNOWN" && section.gradePercent != null) {
    issues.push(issue("GRADE_DIRECTION_MAGNITUDE_CONFLICT", `${path}.gradePercent`, {
      gradeDirection: section.gradeDirection,
      gradePercent: section.gradePercent,
    }));
  }
  if (Object.hasOwn(section, "protocolTags")) {
    issues.push(issue("UNTRUSTED_PROTOCOL_TAG_FORBIDDEN", `${path}.protocolTags`));
  }
  if (!allowDerivedSurface && Object.hasOwn(section, "surfaceComponents")) {
    issues.push(issue("UNTRUSTED_DERIVED_SURFACE_FORBIDDEN", `${path}.surfaceComponents`));
  }
}

export function validatePrototypeRecordInput(input) {
  const issues = [];
  if (!isObject(input)) return [issue("OBJECT_REQUIRED", "")];
  if (!["run", "rest"].includes(input.activityType)) {
    issues.push(issue("ACTIVITY_TYPE_INVALID", "activityType", { value: input.activityType }));
  }
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    issues.push(issue("DATE_INVALID", "date", { value: input.date }));
  }
  if (input.activityType === "run") {
    requireFinite(issues, input.distanceKm, "distanceKm", { min: Number.MIN_VALUE, nullable: false });
    requireFinite(issues, input.durationMinutes, "durationMinutes", { min: Number.MIN_VALUE, nullable: false });
  } else if (input.activityType === "rest") {
    for (const field of ["distanceKm", "durationMinutes", "steps"]) {
      if (input[field] != null) issues.push(issue("REST_RUNNING_VALUE_FORBIDDEN", field, { value: input[field] }));
    }
  }
  requireFinite(issues, input.steps, "steps", { min: 0, integer: true });
  requireFinite(issues, input.rpe, "rpe", { min: 0, max: 10 });

  const course = input.course;
  if (course != null && !isObject(course)) {
    issues.push(issue("COURSE_OBJECT_REQUIRED", "course"));
  } else if (course) {
    for (const field of ["uphillSharePercent", "downhillSharePercent"]) {
      requireFinite(issues, course[field], `course.${field}`, { min: 0, max: 100 });
    }
    const up = course.uphillSharePercent ?? 0;
    const down = course.downhillSharePercent ?? 0;
    if (finiteNumber(up) && finiteNumber(down) && up + down > 100 + 1e-9) {
      issues.push(issue("GRADE_SHARE_SUM_INVALID", "course", { uphill: up, downhill: down }));
    }
    for (const field of ["uphillGradePercent", "downhillGradePercent"]) {
      requireFinite(issues, course[field], `course.${field}`, { min: Number.MIN_VALUE });
    }
    if (Array.isArray(course.surfaceSelections)) {
      let surfaceShare = 0;
      course.surfaceSelections.forEach((selection, index) => {
        const path = `course.surfaceSelections[${index}]`;
        if (!isObject(selection)) {
          issues.push(issue("SURFACE_SELECTION_OBJECT_REQUIRED", path));
          return;
        }
        requireFinite(issues, selection.sharePercent, `${path}.sharePercent`, { min: 0, max: 100, nullable: false });
        if (finiteNumber(selection.sharePercent)) surfaceShare += selection.sharePercent;
        if (selection.propertyOverrides != null && !isObject(selection.propertyOverrides)) {
          issues.push(issue("SURFACE_OVERRIDE_OBJECT_REQUIRED", `${path}.propertyOverrides`));
        } else {
          for (const field of ["hardnessLevel", "unevennessLevel", "gripLevel", "sinkLevel", "reboundLevel", "stabilityLevel"]) {
            requireFinite(issues, selection.propertyOverrides?.[field], `${path}.propertyOverrides.${field}`, {
              min: 1,
              max: 5,
              integer: true,
            });
          }
        }
      });
      if (course.surfaceSelections.length && Math.abs(surfaceShare - 100) > 0.01) {
        issues.push(issue("SURFACE_SHARE_SUM_INVALID", "course.surfaceSelections", { sum: surfaceShare }));
      }
    }
    if (Array.isArray(course.sections)) {
      const ids = new Set();
      const bases = new Set();
      course.sections.forEach((section, index) => {
        validateSection(section, index, issues);
        if (section?.sectionId) {
          if (ids.has(section.sectionId)) issues.push(issue("SECTION_ID_DUPLICATE", `course.sections[${index}].sectionId`, { value: section.sectionId }));
          ids.add(section.sectionId);
        }
        if (SECTION_BASES.has(section?.shareBasis)) bases.add(section.shareBasis);
      });
      if (bases.size > 1) issues.push(issue("MIXED_SECTION_BASES_FORBIDDEN", "course.sections", { bases: [...bases] }));
    }
  }

  const observations = input.bodyReview?.observations;
  if (observations != null && !Array.isArray(observations)) {
    issues.push(issue("OBSERVATIONS_ARRAY_REQUIRED", "bodyReview.observations"));
  } else {
    (observations ?? []).forEach((observation, index) => {
      const path = `bodyReview.observations[${index}]`;
      if (!isObject(observation)) {
        issues.push(issue("OBSERVATION_OBJECT_REQUIRED", path));
        return;
      }
      if (!REGION_ID_SET.has(observation.bodyAreaId)) {
        issues.push(issue("REGION_ID_INVALID", `${path}.bodyAreaId`, { value: observation.bodyAreaId }));
      }
      requireFinite(issues, observation.noticedIntensity, `${path}.noticedIntensity`, {
        min: 0,
        max: 5,
        integer: true,
        nullable: false,
      });
      if (!TIMINGS.has(observation.noticedTiming)) {
        issues.push(issue("OBSERVATION_TIMING_INVALID", `${path}.noticedTiming`, { value: observation.noticedTiming }));
      }
    });
  }
  return issues;
}

const NUMERIC_RANGES = new Map([
  ["RL-IN-011", { min: Number.MIN_VALUE }],
  ["RL-IN-013", { min: Number.MIN_VALUE }],
  ["RL-IN-015", { min: 0, integer: true }],
  ["RL-DV-019", { min: Number.MIN_VALUE }],
  ["RL-DV-020", { min: Number.MIN_VALUE }],
  ["RL-DV-021", { min: Number.MIN_VALUE }],
  ["RL-IN-033", { min: 0, max: 100 }],
  ["RL-IN-034", { min: 0, max: 100 }],
  ["RL-DV-035", { min: 0, max: 100 }],
  ["RL-IN-036", { min: Number.MIN_VALUE }],
  ["RL-IN-037", { min: Number.MIN_VALUE }],
  ["RL-IN-043", { min: 0, max: 100 }],
  ["RL-IN-044", { min: 1, max: 5, integer: true }],
  ["RL-IN-045", { min: 1, max: 5, integer: true }],
  ["RL-IN-046", { min: 1, max: 5, integer: true }],
  ["RL-IN-047", { min: 1, max: 5, integer: true }],
  ["RL-IN-048", { min: 1, max: 5, integer: true }],
  ["RL-IN-049", { min: 1, max: 5, integer: true }],
  ["RL-IN-091", { min: 0, max: 10 }],
  ["RL-IN-104", { min: 0, max: 5, integer: true }],
  ["RL-IN-113", { min: 50, max: 250 }],
  ["RL-IN-114", { min: 20, max: 300 }],
]);

export function validateFormalBundleSemantics(bundle) {
  const issues = [];
  if (!isObject(bundle) || !isObject(bundle.formalInputs)) return [issue("FORMAL_BUNDLE_INVALID", "")];
  const catalogById = new Map(FORMAL_INPUT_CATALOG.map((item) => [item.id, item]));
  const actualIds = Object.keys(bundle.formalInputs);
  for (const item of FORMAL_INPUT_CATALOG) {
    if (!Object.hasOwn(bundle.formalInputs, item.id)) issues.push(issue("MISSING_FORMAL_INPUT_ENTRY", `formalInputs.${item.id}`));
  }
  for (const id of actualIds) {
    const entry = bundle.formalInputs[id];
    const catalog = catalogById.get(id);
    if (!catalog) {
      issues.push(issue("UNKNOWN_FORMAL_INPUT_ID", `formalInputs.${id}`));
      continue;
    }
    if (!isObject(entry)) {
      issues.push(issue("FORMAL_INPUT_ENTRY_INVALID", `formalInputs.${id}`));
      continue;
    }
    if (entry.inputId !== id) issues.push(issue("FORMAL_INPUT_ID_MISMATCH", `formalInputs.${id}.inputId`, { value: entry.inputId }));
    if (!STATUS_VALUES.has(entry.status)) issues.push(issue("FORMAL_INPUT_STATUS_INVALID", `formalInputs.${id}.status`, { value: entry.status }));
    if (EMPTY_STATUSES.has(entry.status) && entry.value !== null) {
      issues.push(issue("STATUS_VALUE_CONFLICT", `formalInputs.${id}.value`, { status: entry.status }));
    }
    if (entry.status === "KNOWN" && entry.value === null) {
      issues.push(issue("KNOWN_VALUE_MISSING", `formalInputs.${id}.value`));
    }
    if (entry.numericPermission !== catalog.numericPermission) {
      issues.push(issue("NUMERIC_PERMISSION_MISMATCH", `formalInputs.${id}.numericPermission`, {
        value: entry.numericPermission,
        expected: catalog.numericPermission,
      }));
    }
    const range = NUMERIC_RANGES.get(id);
    if (range && entry.status === "KNOWN") requireFinite(issues, entry.value, `formalInputs.${id}.value`, { ...range, nullable: false });
  }
  const sections = bundle.formalInputs["RL-IN-039"]?.value;
  if (bundle.formalInputs["RL-IN-039"]?.status === "KNOWN") {
    if (!Array.isArray(sections)) issues.push(issue("SECTIONS_ARRAY_REQUIRED", "formalInputs.RL-IN-039.value"));
    else {
      const bases = new Set();
      sections.forEach((section, index) => {
        validateSection(section, index, issues, { allowDerivedSurface: true });
        if (SECTION_BASES.has(section?.shareBasis)) bases.add(section.shareBasis);
      });
      if (bases.size > 1) issues.push(issue("MIXED_SECTION_BASES_FORBIDDEN", "formalInputs.RL-IN-039.value", { bases: [...bases] }));
    }
  }
  const observations = bundle.formalInputs["RL-IN-101"]?.value;
  if (bundle.formalInputs["RL-IN-101"]?.status === "KNOWN") {
    if (!Array.isArray(observations)) issues.push(issue("OBSERVATIONS_ARRAY_REQUIRED", "formalInputs.RL-IN-101.value"));
    else {
      observations.forEach((observation, index) => {
        requireFinite(issues, observation?.noticedIntensity, `formalInputs.RL-IN-101.value[${index}].noticedIntensity`, {
          min: 0,
          max: 5,
          integer: true,
          nullable: false,
        });
        if (!REGION_ID_SET.has(observation?.bodyAreaId)) {
          issues.push(issue("REGION_ID_INVALID", `formalInputs.RL-IN-101.value[${index}].bodyAreaId`, { value: observation?.bodyAreaId }));
        }
      });
    }
  }
  if (bundle.recordSnapshot?.inputSnapshotHash && bundle.recordSnapshot.inputSnapshotHash !== hashCanonical(bundle.formalInputs)) {
    issues.push(issue("INPUT_SNAPSHOT_HASH_MISMATCH", "recordSnapshot.inputSnapshotHash"));
  }
  return issues;
}

export function validateRegionalEngineInputSemantics(input) {
  const issues = validateFormalBundleSemantics(input);
  if (!isObject(input)) return issues;
  const formalSections = input.formalInputs?.["RL-IN-039"]?.value;
  if (Array.isArray(formalSections) && hashCanonical(formalSections) !== hashCanonical(input.courseSections ?? [])) {
    issues.push(issue("ENGINE_SECTION_SNAPSHOT_MISMATCH", "courseSections"));
  }
  const routeIds = new Set();
  for (const [index, route] of (input.routeEligibility ?? []).entries()) {
    if (routeIds.has(route.routeId)) issues.push(issue("ROUTE_ID_DUPLICATE", `routeEligibility[${index}].routeId`, { value: route.routeId }));
    routeIds.add(route.routeId);
  }
  return issues;
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return finiteNumber(left) && finiteNumber(right) && Math.abs(left - right) <= tolerance;
}

export function validateRegionalEngineOutput(output) {
  const issues = [];
  if (!isObject(output)) return { valid: false, issues: [issue("OUTPUT_OBJECT_REQUIRED", "")] };
  if (output.traceContractVersion !== "runload-reason-trace-1.2") {
    issues.push(issue("TRACE_CONTRACT_VERSION_INVALID", "traceContractVersion", { value: output.traceContractVersion, expected: "runload-reason-trace-1.2" }));
  }
  if (!Array.isArray(output.regions) || output.regions.length !== REGION_IDS.length) {
    issues.push(issue("REGION_SET_INVALID", "regions", { count: output.regions?.length }));
  } else {
    const ids = output.regions.map((region) => region.regionId);
    if (ids.some((id, index) => id !== REGION_IDS[index])) {
      issues.push(issue("REGION_ORDER_OR_ID_INVALID", "regions", { ids, expected: REGION_IDS }));
    }
    if (new Set(ids).size !== REGION_IDS.length) issues.push(issue("REGION_ID_DUPLICATE", "regions", { ids }));
    output.regions.forEach((region, index) => {
      const path = `regions[${index}]`;
      const numericState = ["CALCULATED", "PARTIAL"].includes(region.calculationState);
      if (numericState) {
        if (!finiteNumber(region.indexExact)) issues.push(issue("NUMERIC_STATE_INDEX_REQUIRED", `${path}.indexExact`));
        if (!approximatelyEqual(region.deltaFromReferenceExact, region.indexExact - 100)) {
          issues.push(issue("DELTA_ARITHMETIC_MISMATCH", `${path}.deltaFromReferenceExact`));
        }
        if (region.displayIndex !== Math.round(region.indexExact)) issues.push(issue("DISPLAY_INDEX_MISMATCH", `${path}.displayIndex`));
        if (region.displayDeltaPoints !== Math.round(region.indexExact - 100)) issues.push(issue("DISPLAY_DELTA_MISMATCH", `${path}.displayDeltaPoints`));
        if (!approximatelyEqual(region.components?.selfReportedStateLog, 0)) {
          issues.push(issue("SELF_REPORT_NUMERIC_LEAKAGE", `${path}.components.selfReportedStateLog`));
        }
        if (!approximatelyEqual(region.components?.selfReportedStateMultiplier, 1)) {
          issues.push(issue("SELF_REPORT_MULTIPLIER_NOT_NEUTRAL", `${path}.components.selfReportedStateMultiplier`));
        }
        if (!approximatelyEqual(region.indexExact, region.components?.mechanicalIndexWithoutSelfState)) {
          issues.push(issue("CANONICAL_INDEX_OBSERVATION_OVERLAY_MISMATCH", `${path}.indexExact`));
        }
      } else {
        for (const field of ["indexExact", "deltaFromReferenceExact", "displayIndex", "displayDeltaPoints"]) {
          if (region[field] !== null) issues.push(issue("NON_NUMERIC_STATE_VALUE_FORBIDDEN", `${path}.${field}`, { state: region.calculationState }));
        }
      }
      if (!isObject(region.componentCoverage) || !Array.isArray(region.componentCoverage.sections)) {
        issues.push(issue("COMPONENT_COVERAGE_REQUIRED", `${path}.componentCoverage`));
      } else {
        const expectedCoverageState = region.componentCoverage.sections.some((section) => section.state === "PARTIAL")
          ? "PARTIAL"
          : region.componentCoverage.sections.length
            ? "FULL"
            : "NONE";
        if (region.componentCoverage.state !== expectedCoverageState) {
          issues.push(issue("COMPONENT_COVERAGE_STATE_MISMATCH", `${path}.componentCoverage.state`, {
            value: region.componentCoverage.state,
            expected: expectedCoverageState,
          }));
        }
        region.componentCoverage.sections.forEach((section, sectionIndex) => {
          const weights = Object.values(section.normalizedWeights ?? {});
          if (weights.length && Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) > 1e-9) {
            issues.push(issue("COMPONENT_WEIGHT_RENORMALIZATION_INVALID", `${path}.componentCoverage.sections[${sectionIndex}].normalizedWeights`));
          }
          const declaredFractions = Object.values(section.declaredShareFractions ?? {});
          const representedFraction = section.representedShareFraction;
          if (declaredFractions.length) {
            const declaredSum = declaredFractions.reduce((sum, weight) => sum + weight, 0);
            if (!(declaredSum > 0 && declaredSum <= 1 + 1e-9)) {
              issues.push(issue("DECLARED_COMPONENT_SHARE_INVALID", `${path}.componentCoverage.sections[${sectionIndex}].declaredShareFractions`));
            }
            if (!finiteNumber(representedFraction) || !approximatelyEqual(declaredSum, representedFraction, 1e-9)) {
              issues.push(issue("REPRESENTED_COMPONENT_SHARE_MISMATCH", `${path}.componentCoverage.sections[${sectionIndex}].representedShareFraction`, {value:representedFraction,expected:declaredSum}));
            }
            if (section.state === "PARTIAL" && !(representedFraction < 1 - 1e-9)) {
              issues.push(issue("PARTIAL_COMPONENT_SHARE_NOT_PARTIAL", `${path}.componentCoverage.sections[${sectionIndex}].representedShareFraction`));
            }
          }
        });
      }
      if (!isObject(region.observationOverlay)) {
        issues.push(issue("OBSERVATION_OVERLAY_REQUIRED", `${path}.observationOverlay`));
      }
      if (output.traceContractVersion === "runload-reason-trace-1.2" && numericState) {
        const numericEvents=(region.reasonTrace??[]).filter(event=>event.numericEffectApplied===true);
        if (numericEvents.some(event=>!finiteNumber(event.contributionLog))) {
          issues.push(issue("TRACE_NUMERIC_CONTRIBUTION_NONFINITE", `${path}.reasonTrace`));
        }
        const contributionSum=numericEvents.reduce((sum,event)=>sum+event.contributionLog,0);
        if (!approximatelyEqual(contributionSum, region.components?.totalLog, 1e-12)) {
          issues.push(issue("TRACE_CONTRIBUTION_SUM_MISMATCH", `${path}.reasonTrace`, {value:contributionSum,expected:region.components?.totalLog}));
        }
        const conditionEvents=numericEvents.filter(event=>event.traceCode==="SECTION_CONDITION_CONTRIBUTION");
        const exposureEvents=numericEvents.filter(event=>event.traceCode==="EXPOSURE_CONTRIBUTION");
        if (conditionEvents.length !== region.componentCoverage.sections.length || exposureEvents.length !== 1) {
          issues.push(issue("TRACE_ONE_TO_ONE_CARDINALITY_INVALID", `${path}.reasonTrace`, {conditionEvents:conditionEvents.length,sections:region.componentCoverage.sections.length,exposureEvents:exposureEvents.length}));
        }
        for (const [eventIndex,event] of numericEvents.entries()) {
          if (event.regionId!==region.regionId || !Object.hasOwn(event,"sectionId") || typeof event.routeId!=="string" || !event.routeId || !Array.isArray(event.inputIds) || !event.inputIds.length || !Array.isArray(event.sourceIds) || !Array.isArray(event.parameterIds)) {
            issues.push(issue("TRACE_PROVENANCE_INCOMPLETE", `${path}.reasonTrace[${eventIndex}]`));
          }
        }
      }
    });
  }
  const summary = output.coverageSummary ?? {};
  const count = (state) => (output.regions ?? []).filter((region) => region.calculationState === state).length;
  const expectedCounts = {
    calculatedRegionCount: count("CALCULATED"),
    partialRegionCount: count("PARTIAL"),
    notCalculableRegionCount: count("NOT_CALCULABLE"),
    outOfRangeRegionCount: count("OUT_OF_SUPPORTED_RANGE"),
    notApplicableRegionCount: count("NOT_APPLICABLE"),
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (summary[key] !== expected) issues.push(issue("COVERAGE_COUNT_MISMATCH", `coverageSummary.${key}`, { value: summary[key], expected }));
  }
  for (const field of ["crossRegionRank", "overallEstimatedLoad", "injuryRisk", "dangerScore", "runRestDecision", "personalHistoryDelta"]) {
    if (output.prohibitedFieldsAbsent?.[field] !== true || Object.hasOwn(output, field)) {
      issues.push(issue("PROHIBITED_FIELD_CONTRACT_VIOLATION", field));
    }
  }
  if (output.resultHash) {
    const { resultHash, ...base } = output;
    if (resultHash !== hashCanonical(base)) issues.push(issue("RESULT_HASH_MISMATCH", "resultHash"));
  } else {
    issues.push(issue("RESULT_HASH_MISSING", "resultHash"));
  }
  return { valid: issues.length === 0, issues };
}
