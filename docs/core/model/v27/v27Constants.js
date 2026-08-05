export const V27_MODEL_VERSION = "runload-load-model-v2.7";

export const V27_ACTIVITY_TYPES = Object.freeze({
  continuousRun: "CONTINUOUS_RUN",
  runWalk: "RUN_WALK",
  unknown: "UNKNOWN",
});

export const V27_MISSINGNESS_STATES = Object.freeze({
  knownApplied: "KNOWN_APPLIED",
  knownUnsupported: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  unknown: "UNKNOWN",
  invalid: "INVALID",
  outOfDomain: "OUT_OF_DOMAIN",
  notApplicable: "NOT_APPLICABLE",
});

export const V27_REGIONS = Object.freeze([
  Object.freeze({ id: "R01", label: "腰・骨盤", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R02", label: "股関節・臀部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R03", label: "大腿前部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R04", label: "大腿後部", primaryMode: "VOLUME_ONLY_CONTEXT" }),
  Object.freeze({ id: "R05", label: "膝", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R06", label: "すね", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R07", label: "ふくらはぎ・アキレス腱周辺", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
  Object.freeze({ id: "R08", label: "足関節・足部", primaryMode: "CONDITION_RESPONSIVE_NUMERIC" }),
]);

export const V27_EMPHASIS_REGION_IDS = Object.freeze([
  "R02",
  "R03",
  "R05",
  "R06",
  "R07",
  "R08",
]);

export const V27_SURFACE_FACTORS = Object.freeze({
  REF_HARD_EVEN_STABLE: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_APPLIED",
  }),
  DRY_STABLE_GRASS_TURF: Object.freeze({
    central: 1.05,
    low: 1,
    high: 1.1,
    state: "KNOWN_APPLIED",
  }),
  DEEP_DRY_SOFT_SAND: Object.freeze({
    central: 1.4,
    low: 1.2,
    high: 1.6,
    state: "KNOWN_APPLIED",
  }),
  EXPLICIT_UNEVEN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  KNOWN_OTHER: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "KNOWN_NOT_NUMERICALLY_SUPPORTED",
  }),
  UNKNOWN: Object.freeze({
    central: 1,
    low: 1,
    high: 1,
    state: "UNKNOWN",
  }),
});

export const V27_GRADE_CURVES = Object.freeze({
  R02: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.735294, 0.892157, 1, 1.362745, 1.598039]),
    endpointConfidence: "LOW",
    endpoint: "positive_hip_joint_power",
  }),
  R03: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([1.311475, 1.081967, 1, 0.857923, 0.830601]),
    endpointConfidence: "LOW",
    endpoint: "negative_knee_joint_power_magnitude",
  }),
  R05: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.347826, 1.147826, 1, 0.886957, 0.786957]),
    endpointConfidence: "MODERATE",
    endpoint: "pfj_cumulative_weighted_impulse_per_km",
  }),
  R06: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([1.066667, 0.975, 1, 1.058333, 1.133333]),
    endpointConfidence: "MODERATE",
    endpoint: "tibial_cumulative_weighted_impulse_per_km",
  }),
  R07: Object.freeze({
    xs: Object.freeze([-6, -3, 0, 3, 6]),
    ys: Object.freeze([0.652677, 0.808973, 1, 1.228654, 1.46165]),
    endpointConfidence: "MODERATE",
    endpoint: "achilles_cumulative_weighted_impulse_per_km",
  }),
  R08: Object.freeze({
    xs: Object.freeze([-5.71, -2.86, 0, 2.86, 5.71]),
    ys: Object.freeze([0.764331, 0.802548, 1, 1.015924, 1.012739]),
    endpointConfidence: "LOW",
    endpoint: "absolute_ankle_joint_power_sum",
  }),
});

export const V27_SPEED_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 0.991304, 1.008696, 1.052174, 1.034783]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1, 1, 1.008333, 1.008333]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([2.78, 3, 3.33, 4, 5]),
    ys: Object.freeze([1, 1.015919, 1.021708, 1.047757, 1.044863]),
  }),
});

export const V27_CADENCE_CURVES = Object.freeze({
  R05: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.034783, 1, 0.956522]),
  }),
  R06: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.041667, 1, 0.975]),
  }),
  R07: Object.freeze({
    xs: Object.freeze([-10, 0, 10]),
    ys: Object.freeze([1.093484, 1, 0.977337]),
  }),
});

export const V27_CADENCE_SPEED_MATCH_TOLERANCE_MPS = 0.1;
export const V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG = 0.005;
export const V27_TOTAL_GRADE_DOMAIN_MAX_PERCENT = 20;
export const V27_COMMON_REGIONAL_GRADE_DOMAIN_MAX_PERCENT = (
  Math.tan(5.71 * Math.PI / 180) * 100
);
export const V27_COMMON_REGIONAL_GRADE_INPUT_MAX_PERCENT = (
  Math.tan(
    (5.71 + V27_REPORTED_ANGLE_ROUNDING_TOLERANCE_DEG) * Math.PI / 180,
  ) * 100
);

export const V27_REGIONAL_VIEW_IDS = Object.freeze({
  withinRun: "WITHIN_RUN_REGIONAL_EMPHASIS",
  ownFlat: "OWN_FLAT_REFERENCE_RATIO",
  personal: "PERSONAL_USUAL_RATIO",
});
