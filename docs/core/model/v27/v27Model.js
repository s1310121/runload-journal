import {
  V27_CADENCE_CURVES,
  V27_EMPHASIS_REGION_IDS,
  V27_GRADE_CURVES,
  V27_MODEL_VERSION,
  V27_REGIONS,
  V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG,
  V27_SPEED_CURVES,
  V27_SURFACE_FACTORS,
  V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT,
} from "./v27Constants.js";
import {
  approximatelyEqual,
  isFiniteNumber,
  linearInterpolate,
  requirePositiveFinite,
  validateV27Shares,
  weightedMean,
  weightedRearrangementProduct,
} from "./v27Math.js";

export function minettiCost(gradeDecimal) {
  const grade = gradeDecimal;
  return (
    155.4 * grade ** 5
    - 30.4 * grade ** 4
    - 43.3 * grade ** 3
    + 46.3 * grade ** 2
    + 19.5 * grade
    + 3.6
  );
}

export function calculateV27TotalGradeFactor(gradePercent) {
  if (gradePercent == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!isFiniteNumber(gradePercent)) return Object.freeze({ factor: 1, state: "INVALID" });
  if (
    gradePercent < -V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT
    || gradePercent > V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT
  ) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: minettiCost(gradePercent / 100) / minettiCost(0),
    state: "KNOWN_APPLIED",
  });
}

function validateBaseSession(session) {
  requirePositiveFinite(session.distance_km, "distance_km");
  requirePositiveFinite(session.active_minutes, "active_minutes");
  if (
    session.rpe != null
    && (!isFiniteNumber(session.rpe) || session.rpe < 0 || session.rpe > 10)
  ) {
    throw new RangeError("RPE must be blank or in [0, 10]");
  }
}

function validateSections(session) {
  const sections = Array.isArray(session.sections) ? session.sections : [];
  if (!sections.length) return null;
  if (sections.some((section) => (
    !isFiniteNumber(section.distance_km) || section.distance_km <= 0
  ))) {
    throw new RangeError("section distances must be positive and finite");
  }
  const distanceSum = sections.reduce((total, section) => total + section.distance_km, 0);
  if (Math.abs(distanceSum - session.distance_km) > 0.01) {
    throw new RangeError("section distance sum mismatch; no rescaling is allowed");
  }
  return sections;
}

function validateMarginalProfiles(session) {
  const gradeProfile = Array.isArray(session.grade_profile) ? session.grade_profile : [];
  const surfaceProfile = Array.isArray(session.surface_profile) ? session.surface_profile : [];
  validateV27Shares(gradeProfile.map((item) => item.share_pct));
  validateV27Shares(surfaceProfile.map((item) => item.share_pct));
  return { gradeProfile, surfaceProfile };
}

function surfaceFactor(surfaceClass) {
  const entry = V27_SURFACE_FACTORS[surfaceClass];
  if (!entry) throw new RangeError(`unknown surface class: ${surfaceClass}`);
  return entry;
}

export function calculateV27TotalFromSections(session) {
  validateBaseSession(session);
  const sections = validateSections(session);
  if (!sections) throw new RangeError("paired sections are required");
  let central = 0;
  let low = 0;
  let high = 0;
  let gradeAppliedDistance = 0;
  let surfaceAppliedDistance = 0;
  const sectionResults = [];

  sections.forEach((section) => {
    const gradeResult = calculateV27TotalGradeFactor(section.grade_pct);
    const surfaceResult = surfaceFactor(section.surface_class);
    if (gradeResult.state === "KNOWN_APPLIED") gradeAppliedDistance += section.distance_km;
    if (surfaceResult.state === "KNOWN_APPLIED") surfaceAppliedDistance += section.distance_km;
    const centralFactor = gradeResult.factor * surfaceResult.central;
    let factorLow;
    let factorHigh;
    if (
      gradeResult.state === "KNOWN_APPLIED"
      && surfaceResult.state === "KNOWN_APPLIED"
      && surfaceResult.central !== 1
    ) {
      const candidates = [
        gradeResult.factor * surfaceResult.low,
        gradeResult.factor * surfaceResult.high,
        Math.max(0, gradeResult.factor + surfaceResult.low - 1),
        Math.max(0, gradeResult.factor + surfaceResult.high - 1),
      ];
      factorLow = Math.min(...candidates);
      factorHigh = Math.max(...candidates);
    } else if (surfaceResult.state === "KNOWN_APPLIED") {
      factorLow = gradeResult.factor * surfaceResult.low;
      factorHigh = gradeResult.factor * surfaceResult.high;
    } else {
      factorLow = gradeResult.factor;
      factorHigh = gradeResult.factor;
    }
    central += 100 * section.distance_km * centralFactor;
    low += 100 * section.distance_km * factorLow;
    high += 100 * section.distance_km * factorHigh;
    sectionResults.push(Object.freeze({
      distance_km: section.distance_km,
      grade_state: gradeResult.state,
      surface_state: surfaceResult.state,
      surface_class: section.surface_class,
      central_factor: centralFactor,
      factor_range: Object.freeze([factorLow, factorHigh]),
    }));
  });

  const widthRatio = central > 0 ? (high - low) / central : 0;
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    central_points: central,
    range_points: Object.freeze([low, high]),
    show_range_primary: widthRatio > 0.2,
    structural_width_ratio: widthRatio,
    grade_coverage: gradeAppliedDistance / session.distance_km,
    surface_coverage: surfaceAppliedDistance / session.distance_km,
    pairing_state: "PAIRED_ORDERED_SECTIONS",
    sections: Object.freeze(sectionResults),
    is_measured_physical_load: false,
    supports_medical_decision: false,
  });
}

export function calculateV27TotalFromMarginalProfiles(session) {
  validateBaseSession(session);
  const { gradeProfile, surfaceProfile } = validateMarginalProfiles(session);
  const gradeItems = [];
  const surfaceCentralItems = [];
  const surfaceLowItems = [];
  const surfaceHighItems = [];
  const gradeStates = [];
  const surfaceStates = [];
  let gradeCoverage = 0;
  let surfaceCoverage = 0;

  gradeProfile.forEach((item) => {
    const result = calculateV27TotalGradeFactor(item.grade_pct);
    const fraction = item.share_pct / 100;
    gradeItems.push([fraction, result.factor]);
    gradeStates.push(result.state);
    if (result.state === "KNOWN_APPLIED") gradeCoverage += fraction;
  });
  surfaceProfile.forEach((item) => {
    const result = surfaceFactor(item.surface_class);
    const fraction = item.share_pct / 100;
    surfaceCentralItems.push([fraction, result.central]);
    surfaceLowItems.push([fraction, result.low]);
    surfaceHighItems.push([fraction, result.high]);
    surfaceStates.push(result.state);
    if (result.state === "KNOWN_APPLIED") surfaceCoverage += fraction;
  });

  const meanGrade = weightedMean(gradeItems);
  const meanSurface = weightedMean(surfaceCentralItems);
  const meanSurfaceLow = weightedMean(surfaceLowItems);
  const meanSurfaceHigh = weightedMean(surfaceHighItems);
  const centralFactor = meanGrade * meanSurface;
  const multiplicativeLow = weightedRearrangementProduct(
    gradeItems,
    surfaceLowItems,
    false,
  );
  const multiplicativeHigh = weightedRearrangementProduct(
    gradeItems,
    surfaceHighItems,
    true,
  );
  const additiveLow = Math.max(0, meanGrade + meanSurfaceLow - 1);
  const additiveHigh = Math.max(0, meanGrade + meanSurfaceHigh - 1);
  const factorLow = Math.min(multiplicativeLow, additiveLow, centralFactor);
  const factorHigh = Math.max(multiplicativeHigh, additiveHigh, centralFactor);
  const central = 100 * session.distance_km * centralFactor;
  const low = 100 * session.distance_km * factorLow;
  const high = 100 * session.distance_km * factorHigh;
  const widthRatio = central > 0 ? (high - low) / central : 0;

  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    central_points: central,
    range_points: Object.freeze([low, high]),
    show_range_primary: widthRatio > 0.2,
    structural_width_ratio: widthRatio,
    grade_coverage: gradeCoverage,
    surface_coverage: surfaceCoverage,
    pairing_state: "MARGINAL_OVERLAP_UNKNOWN",
    central_pairing_assumption: "INDEPENDENCE_OF_MARGINAL_PROFILES",
    grade_states: Object.freeze(gradeStates),
    surface_states: Object.freeze(surfaceStates),
    is_measured_physical_load: false,
    supports_medical_decision: false,
  });
}

export function calculateV27Total(session) {
  return Array.isArray(session.sections) && session.sections.length
    ? calculateV27TotalFromSections(session)
    : calculateV27TotalFromMarginalProfiles(session);
}

function gradeDegrees(gradePercent) {
  return Math.atan(gradePercent / 100) * 180 / Math.PI;
}

export function calculateV27RegionalGradeFactor(regionId, gradePercent) {
  const curve = V27_GRADE_CURVES[regionId];
  if (!curve) return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  if (gradePercent == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!isFiniteNumber(gradePercent)) return Object.freeze({ factor: 1, state: "INVALID" });
  let valueDegrees = gradeDegrees(gradePercent);
  if (
    valueDegrees < curve.xs[0] - V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG
    || valueDegrees > curve.xs.at(-1) + V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG
  ) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  if (valueDegrees < curve.xs[0]) valueDegrees = curve.xs[0];
  if (valueDegrees > curve.xs.at(-1)) valueDegrees = curve.xs.at(-1);
  return Object.freeze({
    factor: linearInterpolate(valueDegrees, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

export function calculateV27RegionalSpeedFactor(regionId, speedMps, activityType) {
  const curve = V27_SPEED_CURVES[regionId];
  if (!curve || activityType !== "CONTINUOUS_RUN") {
    return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  }
  if (speedMps < curve.xs[0] || speedMps > curve.xs.at(-1)) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: linearInterpolate(speedMps, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

export function calculateV27RegionalCadenceFactor({
  regionId,
  speedMps,
  cadenceDeltaSpm,
  reliable,
  referenceN,
}) {
  const curve = V27_CADENCE_CURVES[regionId];
  if (!curve) return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  if (cadenceDeltaSpm == null) return Object.freeze({ factor: 1, state: "UNKNOWN" });
  if (!reliable || referenceN < 3) {
    return Object.freeze({ factor: 1, state: "NOT_APPLICABLE" });
  }
  if (speedMps < 3 || speedMps > 3.67) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  if (cadenceDeltaSpm < curve.xs[0] || cadenceDeltaSpm > curve.xs.at(-1)) {
    return Object.freeze({ factor: 1, state: "OUT_OF_DOMAIN" });
  }
  return Object.freeze({
    factor: linearInterpolate(cadenceDeltaSpm, curve.xs, curve.ys),
    state: "KNOWN_APPLIED",
  });
}

function regionalGradeSections(session) {
  const sections = validateSections(session);
  if (sections) return sections;
  const { gradeProfile } = validateMarginalProfiles(session);
  return gradeProfile.map((item) => ({
    distance_km: session.distance_km * item.share_pct / 100,
    grade_pct: item.grade_pct,
  }));
}

function regionalSurfaceClasses(session) {
  const sections = Array.isArray(session.sections) ? session.sections : [];
  if (sections.length) return new Set(sections.map((section) => section.surface_class));
  const { surfaceProfile } = validateMarginalProfiles(session);
  return new Set(surfaceProfile.map((item) => item.surface_class));
}

function surfaceContexts(regionId, surfaceClasses) {
  const contexts = [];
  if (surfaceClasses.has("DEEP_DRY_SOFT_SAND")) {
    if (regionId === "R06") {
      contexts.push("SAND_TIBIALIS_ANTERIOR_TESTED_INCREASE_GROUP_DEPENDENT");
    } else if (regionId === "R07") {
      contexts.push("SAND_GASTROCNEMIUS_RESPONSE_LOWER_OR_MIXED");
    } else {
      contexts.push("SAND_REGIONAL_SCALAR_NOT_ESTABLISHED");
    }
  }
  if (surfaceClasses.has("EXPLICIT_UNEVEN")) {
    if (regionId === "R03") {
      contexts.push("UNEVEN_SELECTED_ANTERIOR_THIGH_EMG_INCREASED_IN_TEST");
    } else if (regionId === "R04") {
      contexts.push("UNEVEN_MEDIAL_HAMSTRING_EMG_INCREASED_IN_TEST");
    } else if (regionId === "R08") {
      contexts.push("UNEVEN_ANKLE_WORK_DECREASED_WHILE_VARIABILITY_INCREASED");
    } else {
      contexts.push("UNEVEN_REGIONAL_VARIABILITY_CONTEXT_ONLY");
    }
  }
  if (surfaceClasses.has("KNOWN_OTHER")) {
    contexts.push("KNOWN_SURFACE_WITHOUT_REGIONAL_SCALAR");
  }
  if (surfaceClasses.has("UNKNOWN")) {
    contexts.push("UNKNOWN_SURFACE_NO_REGIONAL_INFERENCE");
  }
  return Object.freeze(contexts);
}

export function calculateV27Regional(session) {
  validateBaseSession(session);
  const sections = regionalGradeSections(session);
  const surfaceClasses = regionalSurfaceClasses(session);
  const speedMps = session.distance_km * 1000 / (session.active_minutes * 60);
  const outputs = {};

  V27_REGIONS.forEach((region) => {
    let gradeOnlyExposure = 0;
    let appliedGradeDistance = 0;
    const gradeStates = [];
    sections.forEach((section) => {
      const result = calculateV27RegionalGradeFactor(region.id, section.grade_pct);
      gradeOnlyExposure += section.distance_km * result.factor;
      gradeStates.push(result.state);
      if (result.state === "KNOWN_APPLIED") appliedGradeDistance += section.distance_km;
    });
    const speedResult = calculateV27RegionalSpeedFactor(
      region.id,
      speedMps,
      session.activity_type,
    );
    const cadenceResult = calculateV27RegionalCadenceFactor({
      regionId: region.id,
      speedMps,
      cadenceDeltaSpm: session.cadence_delta_spm,
      reliable: session.cadence_provenance_reliable === true,
      referenceN: session.cadence_reference_n || 0,
    });
    const gradeMeanFactor = gradeOnlyExposure / session.distance_km;
    const multiplicativeFactor = gradeMeanFactor * speedResult.factor * cadenceResult.factor;
    const additiveFactor = Math.max(
      0,
      1
      + (gradeMeanFactor - 1)
      + (speedResult.factor - 1)
      + (cadenceResult.factor - 1),
    );
    const knownGrades = new Set(
      sections
        .filter((section) => isFiniteNumber(section.grade_pct))
        .map((section) => section.grade_pct.toFixed(9)),
    );
    const averageSpeedApproximation = (
      Boolean(V27_SPEED_CURVES[region.id]) && knownGrades.size > 1
    );
    const candidates = [multiplicativeFactor, additiveFactor];
    if (
      session.cadence_robustness_state === "TOLERANCE_DEPENDENT"
      && cadenceResult.state === "KNOWN_APPLIED"
    ) {
      candidates.push(gradeMeanFactor * speedResult.factor);
    }
    if (averageSpeedApproximation) candidates.push(gradeMeanFactor);
    const rawExposure = session.distance_km * multiplicativeFactor;
    const exposureLow = session.distance_km * Math.min(...candidates);
    const exposureHigh = session.distance_km * Math.max(...candidates);
    const widthRatio = rawExposure > 0 ? (exposureHigh - exposureLow) / rawExposure : 0;
    const curve = V27_GRADE_CURVES[region.id];
    const gradeCoverage = curve ? appliedGradeDistance / session.distance_km : null;
    const endpointConfidence = curve?.endpointConfidence || "LOW";
    const endpoint = curve?.endpoint || "volume_only";
    const gradeSignature = gradeCoverage == null ? "NA" : gradeCoverage.toFixed(3);
    const ratio = 100 * rawExposure / session.distance_km;
    outputs[region.id] = Object.freeze({
      region_id: region.id,
      label: region.label,
      raw_exposure: rawExposure,
      raw_exposure_range: Object.freeze([exposureLow, exposureHigh]),
      show_range_primary: widthRatio > 0.1,
      interaction_width_ratio: widthRatio,
      condition_index_same_distance: ratio,
      run_fact_regional_ratio: ratio,
      condition_index_range: Object.freeze([
        100 * exposureLow / session.distance_km,
        100 * exposureHigh / session.distance_km,
      ]),
      primary_display_value: curve ? ratio : null,
      primary_display_mode: curve
        ? "CONDITION_RESPONSIVE_NUMERIC"
        : "VOLUME_ONLY_CONTEXT",
      grade_coverage: gradeCoverage,
      grade_states: Object.freeze(gradeStates),
      speed_factor: speedResult.factor,
      speed_state: speedResult.state,
      cadence_factor: cadenceResult.factor,
      cadence_state: cadenceResult.state,
      cadence_robustness_state: session.cadence_robustness_state || "NOT_EVALUATED",
      session_average_speed_approximation: averageSpeedApproximation,
      coverage_signature: `G:${gradeSignature}|S:${speedResult.state}|C:${cadenceResult.state}`,
      endpoint,
      endpoint_confidence: endpointConfidence,
      surface_contexts: surfaceContexts(region.id, surfaceClasses),
      supports_medical_decision: false,
    });
  });
  return Object.freeze(outputs);
}

export function calculateV27WithinRunRegionalEmphasis(regionalResults) {
  if (V27_EMPHASIS_REGION_IDS.some((regionId) => !regionalResults[regionId])) {
    throw new RangeError("all fixed six emphasis regions are required");
  }
  const rows = V27_EMPHASIS_REGION_IDS.map((regionId) => regionalResults[regionId]);
  const centralValues = rows.map((row) => row.run_fact_regional_ratio);
  const ranges = rows.map((row) => row.condition_index_range);
  const gradeCoverages = rows.map((row) => row.grade_coverage);
  if (centralValues.some((value) => !isFiniteNumber(value) || value <= 0)) {
    throw new RangeError("all six run-fact regional ratios must be positive");
  }
  if (ranges.some(([low, high]) => (
    !isFiniteNumber(low)
    || !isFiniteNumber(high)
    || low <= 0
    || high <= 0
    || low > high
  ))) {
    throw new RangeError("all six regional ranges must be positive and ordered");
  }
  if (gradeCoverages.some((value) => !isFiniteNumber(value))) {
    throw new RangeError("all six grade coverage values are required");
  }
  const roundedCoverages = new Set(gradeCoverages.map((value) => value.toFixed(9)));
  if (roundedCoverages.size !== 1) {
    return Object.freeze({
      model_version: V27_MODEL_VERSION,
      state: "UNAVAILABLE_COVERAGE_MISMATCH",
      coverage_values: Object.freeze(gradeCoverages),
      region_ids: V27_EMPHASIS_REGION_IDS,
      rows: Object.freeze([]),
      supports_relative_emphasis_comparison: false,
      supports_absolute_regional_load_comparison: false,
      is_compositional_share: false,
    });
  }

  const commonGradeCoverage = gradeCoverages[0];
  const centralSum = centralValues.reduce((total, value) => total + value, 0);
  const resultRows = V27_EMPHASIS_REGION_IDS.map((regionId, index) => {
    const central = 600 * centralValues[index] / centralSum;
    const [ownLow, ownHigh] = ranges[index];
    const otherHighSum = ranges.reduce(
      (total, range, otherIndex) => total + (otherIndex === index ? 0 : range[1]),
      0,
    );
    const otherLowSum = ranges.reduce(
      (total, range, otherIndex) => total + (otherIndex === index ? 0 : range[0]),
      0,
    );
    const low = 600 * ownLow / (ownLow + otherHighSum);
    const high = 600 * ownHigh / (ownHigh + otherLowSum);
    const widthRatio = central > 0 ? (high - low) / central : 0;
    const direction = central > 100
      ? "ABOVE_SIX_REGION_MEAN"
      : central < 100
        ? "BELOW_SIX_REGION_MEAN"
        : "AT_SIX_REGION_MEAN";
    return Object.freeze({
      region_id: regionId,
      relative_emphasis_index: central,
      relative_emphasis_range: Object.freeze([low, high]),
      show_range_primary: widthRatio > 0.1,
      direction,
      endpoint: rows[index].endpoint,
      endpoint_confidence: rows[index].endpoint_confidence,
    });
  });
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    state: "AVAILABLE",
    coverage_state: approximatelyEqual(commonGradeCoverage, 1) ? "FULL" : "PARTIAL",
    common_grade_coverage: commonGradeCoverage,
    region_ids: V27_EMPHASIS_REGION_IDS,
    rows: Object.freeze(resultRows),
    mean_index: resultRows.reduce(
      (total, row) => total + row.relative_emphasis_index,
      0,
    ) / resultRows.length,
    supports_relative_emphasis_comparison: true,
    supports_absolute_regional_load_comparison: false,
    is_compositional_share: false,
    fixed_region_count: 6,
  });
}

export function calculateV27InternalResponse(session) {
  validateBaseSession(session);
  if (session.rpe == null) {
    return Object.freeze({ state: "UNKNOWN", srpe_au: null });
  }
  return Object.freeze({
    state: "KNOWN",
    srpe_au: session.active_minutes * session.rpe,
    separate_from_objective_model: true,
  });
}

export function calculateV27Session(session) {
  const regional = calculateV27Regional(session);
  return Object.freeze({
    model_version: V27_MODEL_VERSION,
    total: calculateV27Total(session),
    regional,
    within_run_regional_emphasis: calculateV27WithinRunRegionalEmphasis(regional),
    internal: calculateV27InternalResponse(session),
  });
}

export function assertV27ResultSemantics(result) {
  const errors = [];
  const emphasis = result?.within_run_regional_emphasis;
  if (result?.model_version !== V27_MODEL_VERSION) errors.push("MODEL_VERSION_MISMATCH");
  if (!emphasis) errors.push("MISSING_WITHIN_RUN_EMPHASIS");
  if (emphasis?.state === "AVAILABLE") {
    if (emphasis.fixed_region_count !== 6) errors.push("FIXED_REGION_COUNT_NOT_SIX");
    if (
      JSON.stringify(emphasis.region_ids) !== JSON.stringify(V27_EMPHASIS_REGION_IDS)
    ) {
      errors.push("FIXED_REGION_IDS_MISMATCH");
    }
    const values = emphasis.rows.map((row) => row.relative_emphasis_index);
    if (values.some((value) => !isFiniteNumber(value) || value <= 0)) {
      errors.push("INVALID_EMPHASIS_VALUE");
    }
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    if (!approximatelyEqual(mean, 100, 1e-9)) errors.push("EMPHASIS_MEAN_NOT_100");
    emphasis.rows.forEach((row) => {
      const [low, high] = row.relative_emphasis_range;
      if (
        low - row.relative_emphasis_index > 1e-9
        || row.relative_emphasis_index - high > 1e-9
      ) {
        errors.push(`EMPHASIS_RANGE_INVALID_${row.region_id}`);
      }
    });
  }
  if (emphasis?.is_compositional_share !== false) errors.push("COMPOSITIONAL_FLAG_INVALID");
  if (emphasis?.supports_absolute_regional_load_comparison !== false) {
    errors.push("ABSOLUTE_COMPARISON_FLAG_INVALID");
  }
  if (result?.total?.supports_medical_decision !== false) {
    errors.push("MEDICAL_SUPPORT_FLAG_INVALID");
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
