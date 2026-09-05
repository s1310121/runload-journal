// Regional A4 source-bounded plantar peak-pressure proxy route data.
// All values are preserved-source descriptive means or deterministic ratios.
// No free calibration coefficient is introduced.

export const HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE = Object.freeze({
  sourceId: "SRC-A4-001",
  runSetting: "TREADMILL",
  speedMps: 3.33,
  speedMatchEpsilonMps: 1e-9,
  historicalSpeedToleranceFraction: 0.05, // retired R31; not source-defined and not used by numeric routing
  requiredShoeType: "TRAINING",
  requiredShoeSoftness: "NORMAL",
  gradeDegrees: [-6, 0, 6],
  validFootPlacements: Object.freeze(["RFS", "FFS"]),
  rearfoot: Object.freeze({
    endpoint: "heel-region peak plantar pressure per contact; cumulative-contact exposure proxy",
    referenceDefinitionId: "RCM-RDEF-027-A4-HORIGUCHI-PEAK",
    constructId: "REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",
    rawKpaByStrike: Object.freeze({
      RFS: Object.freeze([371.0, 280.8, 212.5]),
      FFS: Object.freeze([99.9, 72.1, 41.4]),
    }),
    referenceRawKpa: 280.8,
    ratiosByStrike: Object.freeze({
      RFS: Object.freeze([1.321225071225071, 1, 0.756766381766382]),
      FFS: Object.freeze([0.355769230769231, 0.256766381766382, 0.147435897435897]),
    }),
    sourceAnchorRange: "RCM-ANCH-A4-001..006",
  }),
  forefoot: Object.freeze({
    endpoint: "forefoot-region peak plantar pressure main-effect model; cumulative-contact exposure proxy",
    referenceDefinitionId: "RCM-RDEF-029-A4-HORIGUCHI-PEAK",
    constructId: "FOREFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",
    rawSlopeMarginalKpa: Object.freeze([416.9, 450.3, 449.15]),
    slopeRatios: Object.freeze([0.925827226293582, 1, 0.997446147013103]),
    rawStrikeMarginalKpa: Object.freeze({RFS: 358.3, FFS: 519.2666666666667}),
    strikeRatios: Object.freeze({RFS: 1, FFS: 1.449251093124942}),
    sourceAnchorRange: "RCM-ANCH-A4-007..011",
    noInteractionRule: "The reported slope x foot-strike interaction was not significant; slope and strike main effects are factorized and no interaction coefficient is created.",
  }),
  limitations: Object.freeze([
    "11 healthy men",
    "treadmill at 3.33 m/s",
    "standardized study shoe; app shoe match is only a conservative proxy",
    "100-Hz pressure insole",
    "app foot placement is self-reported",
    "peak pressure is a PARTIAL proxy for the region's broader cumulative plantar-loading tendency",
  ]),
});
