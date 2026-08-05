import {
  V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS,
  V27_MODEL_VERSION,
} from "./v27Constants.js";
import {
  isFiniteNumber,
  median,
  requirePositiveFinite,
} from "./v27Math.js";

export function deriveV27PersonalCadenceDelta({
  targetSessionId,
  currentSpeedMps,
  currentCadenceSpm,
  currentCadenceProvenanceReliable,
  priorRecords = [],
  speedToleranceMps = V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS,
}) {
  requirePositiveFinite(speedToleranceMps, "speedToleranceMps");
  if (
    !isFiniteNumber(currentCadenceSpm)
    || currentCadenceSpm <= 0
    || !currentCadenceProvenanceReliable
  ) {
    return Object.freeze({
      state: "NOT_APPLICABLE",
      eligible_n: 0,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const eligible = priorRecords.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.activity_type === "CONTINUOUS_RUN"
    && item.cadence_provenance_reliable === true
    && isFiniteNumber(item.speed_mps)
    && isFiniteNumber(item.cadence_spm)
    && item.cadence_spm > 0
    && Math.abs(item.speed_mps - currentSpeedMps) <= speedToleranceMps
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      expected_cadence_spm: null,
      delta_spm: null,
    });
  }
  const expected = median(eligible.map((item) => item.cadence_spm));
  return Object.freeze({
    state: "AVAILABLE",
    eligible_n: eligible.length,
    expected_cadence_spm: expected,
    delta_spm: currentCadenceSpm - expected,
    speed_tolerance_mps: speedToleranceMps,
  });
}

export function deriveV27PersonalCadenceSensitivity(input) {
  const tolerances = [0.05, 0.1, 0.15];
  const byTolerance = Object.fromEntries(tolerances.map((tolerance) => [
    String(tolerance),
    deriveV27PersonalCadenceDelta({ ...input, speedToleranceMps: tolerance }),
  ]));
  const central = byTolerance["0.1"];
  const allAvailable = Object.values(byTolerance).every((item) => item.state === "AVAILABLE");
  const robustnessState = allAvailable
    ? "ROBUST_ACROSS_DECLARED_TOLERANCES"
    : central.state === "AVAILABLE"
      ? "TOLERANCE_DEPENDENT"
      : "UNAVAILABLE_AT_CENTRAL_TOLERANCE";
  return Object.freeze({
    central,
    by_tolerance_mps: Object.freeze(byTolerance),
    robustness_state: robustnessState,
  });
}

export function calculateV27PersonalRelative({
  targetSessionId,
  currentRegionResult,
  priorResults = [],
}) {
  const eligible = priorResults.filter((item) => (
    item.session_id !== targetSessionId
    && item.model_version === V27_MODEL_VERSION
    && item.coverage_signature === currentRegionResult.coverage_signature
    && isFiniteNumber(item.raw_exposure)
    && item.raw_exposure > 0
  ));
  if (eligible.length < 3) {
    return Object.freeze({
      state: "BUILDING_REFERENCE",
      eligible_n: eligible.length,
      value: null,
    });
  }
  const referenceMedian = median(eligible.map((item) => item.raw_exposure));
  const sortedDates = eligible
    .map((item) => item.date)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
    .sort();
  return Object.freeze({
    state: eligible.length < 6 ? "PROVISIONAL" : "AVAILABLE",
    eligible_n: eligible.length,
    reference_median: referenceMedian,
    value: 100 * currentRegionResult.raw_exposure / referenceMedian,
    reference_revision_ids: Object.freeze(eligible.map((item) => item.result_id || item.session_id)),
    first_date: sortedDates[0] || null,
    last_date: sortedDates.at(-1) || null,
    target_excluded: eligible.every((item) => item.session_id !== targetSessionId),
  });
}

