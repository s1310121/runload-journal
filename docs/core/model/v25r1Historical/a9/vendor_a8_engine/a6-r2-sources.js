// A6 R2 candidate-only source-bounded plantar heel route data.
// Ho et al. (2010) used two independent treadmill protocols.
// The registered geometry is therefore the UNION of two 1D source paths, never a 2D speed x grade rectangle.
// No unsupported speed x grade interaction or extrapolation is introduced.

const ratio=(value,reference)=>value/reference;

export const HO_2010_HEEL_PEAK_PRESSURE_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R2-001",
  citation: "Ho IJ, Hou YY, Yang CH, Wu WL, Chen SK, Guo LY. Comparison of Plantar Pressure Distribution between Different Speed and Incline During Treadmill Jogging. J Sports Sci Med. 2010;9(1):154-160.",
  runSetting: "TREADMILL",
  regionId: "BA-DISP-027",
  endpoint: "heel-region peak plantar pressure per contact; cumulative-contact exposure proxy",
  heelMaskDefinition: "first 0% to 30% of foot length",
  referenceDefinitionId: "RCM-RDEF-027-A6-HO2010-HEEL-PEAK",
  constructId: "REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",
  referenceRawKpa: 170.7,
  levelSpeedPath: Object.freeze({
    pathId: "HO2010_LEVEL_SPEED_PATH",
    fixedGradePercent: 0,
    speedMps: Object.freeze([1.5, 2.0, 2.5]),
    rawKpa: Object.freeze([143.6, 170.7, 191.3]),
    ratios: Object.freeze([ratio(143.6,170.7), 1, ratio(191.3,170.7)]),
    sourceAnchorRange: "A6R2-HO2010-TABLE1-HEEL",
  }),
  fixedSpeedUphillPath: Object.freeze({
    pathId: "HO2010_FIXED_SPEED_UPHILL_PATH",
    fixedSpeedMps: 2.0,
    gradePercent: Object.freeze([0, 5, 10, 15]),
    rawKpa: Object.freeze([170.7, 161.4, 142.6, 124.1]),
    ratios: Object.freeze([1, ratio(161.4,170.7), ratio(142.6,170.7), ratio(124.1,170.7)]),
    sourceAnchorRange: "A6R2-HO2010-TABLE3-HEEL",
  }),
  geometry: "UNION_OF_TWO_1D_SOURCE_PATHS",
  limitations: Object.freeze([
    "20 healthy female collegiate students; participants reported no regular jogging",
    "treadmill protocol only",
    "speed series is level grade only: 1.5, 2.0, 2.5 m/s at 0%",
    "incline series is fixed speed only: 0, 5, 10, 15% at exactly 2.0 m/s",
    "the two series are independent protocols and must not be expanded into a 2D speed x grade rectangle",
    "no downhill protocol",
    "foot-strike category was not stratified or reported as a source condition",
    "pressure insoles were placed inside participants' own shoes; exact shoe transfer is not established",
    "peak pressure is a PARTIAL proxy for the region's broader cumulative plantar-loading tendency",
  ]),
});
