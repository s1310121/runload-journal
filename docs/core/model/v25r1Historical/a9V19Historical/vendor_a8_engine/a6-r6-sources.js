// A6 R6 source registry retained through R22.
// R22 scientific correction: Hagen 2023 is preserved as a published PFJS
// impulse-per-km model for provenance/reproduction, but its low-speed model is
// no longer normalized across studies into Current Reference 100. The app also
// cannot establish that a user's current absolute cadence equals the source's
// participant-specific habitual/preferred cadence condition.

export const HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R6-001",
  citation: "Hagen M, Vanmechelen A, Cloet E, Sellicaerts J, Van Welden K, Verstraete J, Catelli DS, Verschueren S, Vanrenterghem J. Increasing Step Frequency Reduces Patellofemoral Joint Stress and Patellar Tendon Force Impulse More at Low Running Speed. Med Sci Sports Exerc. 2023;55(9):1555-1563.",
  doi: "10.1249/MSS.0000000000003194",
  participants: "12 recreationally active runners analysed",
  runSetting: "TREADMILL",
  gradePercent: 0,
  candidateRegionId: "BA-DISP-019",
  currentConstructId: "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
  currentReferenceDefinitionId: "RCM-RDEF-019",
  endpoint: "patellofemoral joint stress impulse per km",
  endpointUnits: "MPa*s/km",
  exposureBasis: "PFJS_TIME_INTEGRAL_PER_STEP_X_STRIDES_PER_KM",
  speedKnotsKmh: Object.freeze([8,10,12,14,16]),
  speedKnotsMps: Object.freeze([8/3.6,10/3.6,12/3.6,14/3.6,16/3.6]),
  stepFrequencyConditions: Object.freeze(["DECREASED","HABITUAL","INCREASED"]),
  measuredPfjsImpulsePerKm: Object.freeze({
    DECREASED: Object.freeze([624.47,528.12,466.03,388.01,325.91]),
    HABITUAL: Object.freeze([563.11,470.14,411.02,361.11,305.97]),
    INCREASED: Object.freeze([461.71,406.25,366.64,318.87,281.82]),
  }),
  publishedLinearModels: Object.freeze({
    DECREASED: Object.freeze({slopePerKmh:-36.86,intercept:908.84}),
    HABITUAL: Object.freeze({slopePerKmh:-31.17,intercept:796.25}),
    INCREASED: Object.freeze({slopePerKmh:-22.36,intercept:635.35}),
  }),
  publishedModelDomainMps: Object.freeze([8/3.6,16/3.6]),
  formerAdoptedLowSpeedDomainMps: Object.freeze([8/3.6,2.78]),
  currentReferenceLabelMps: 2.78,
  formerSourceBridgeKnotKmh: 10,
  formerSourceBridgeKnotMps: 10/3.6,
  currentReferencePrintedPrecisionMps: 0.01,
  referenceBridgeState: "RETIRED_R22_UNCALIBRATED_CROSS_STUDY_NORMALIZATION",
  cadenceCompatibilityState: "UNRESOLVED_SOURCE_HABITUAL_PREFERRED_RELATIVE_STATE",
  magnitudePathState: "PUBLISHED_CONTINUOUS_MODEL_PROVENANCE_ONLY",
  numericEligible: false,
  currentReferenceComparison: Object.freeze({
    comparisonSourceId: "BAT-SRC-010",
    comparisonAnchorId: "RCM-ANCH-001",
    comparisonSpeedMps: 2.78,
    comparisonAbsolutePfjsImpulsePerKm: 787,
    hagenBridgeSpeedKmh: 10,
    hagenPublishedRegressionAtBridge: 484.55,
    hagenMeasuredHabitualAtBridge: 470.14,
    calibrationState: "NO_PRIMARY_CROSS_STUDY_ABSOLUTE_CALIBRATION",
  }),
  limitations: Object.freeze([
    "Hagen 2023 measured PFJS impulse per km under participant-specific habitual/preferred step frequency at each speed and under +/-10% step-frequency conditions; the app has current absolute cadence but no source-compatible habitual/preferred baseline.",
    "The published habitual regression is retained exactly for source reproduction, but R22 does not treat it as an individualized current-condition magnitude.",
    "At the former 10 km/h bridge, the Hagen habitual published regression predicts 484.55 MPa*s/km and the measured mean is 470.14 MPa*s/km, whereas Current's Van Hooren 2024 2.78 m/s reference anchor is 787 MPa*s/km. No primary source calibrates these study-specific absolute scales into one continuous Current Reference 100 curve.",
    "The former normalization at 10 km/h removed this cross-study absolute-model discrepancy by construction; R22 therefore retires that numeric bridge rather than presenting it as source-matched calibration.",
    "No slope dimension or outdoor correction is inferred from Hagen alone."
  ])
});

export const WILLY_2016_BA019_ENVIRONMENT_TRANSFER_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R6-002",
  citation: "Willy RW, Halsey L, Hayek A, Johnson H, Willson JD. Patellofemoral Joint and Achilles Tendon Loads During Overground and Treadmill Running. J Orthop Sports Phys Ther. 2016;46(8):664-672.",
  doi: "10.2519/jospt.2016.6494",
  participants: "18 healthy runners",
  candidateRegionId: "BA-DISP-019",
  endpoint: "estimated cumulative patellofemoral joint stress per 1 km",
  comparison: "TREADMILL_VS_OVERGROUND",
  selfSelectedSpeedMps: 2.9,
  findingsRole: "ENVIRONMENT_TRANSFER_SUPPORT_ONLY",
  numericEligibleForHagenLowSpeedTransfer: false,
  reason: "SINGLE_SELF_SELECTED_SPEED_DOES_NOT_ESTABLISH_A_SPEED_DEPENDENT_TREADMILL_TO_OVERGROUND_TRANSFER_ACROSS_THE_2_22_TO_2_78_MPS_HAGEN_EXTENSION"
});

const EPS=1e-12;
const within=(x,[lo,hi])=>Number.isFinite(x)&&x>=lo-EPS&&x<=hi+EPS;

export function hagen2023PfjsImpulsePerKm(speedMps,condition="HABITUAL"){
  const source=HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE;
  if(!within(speedMps,source.publishedModelDomainMps))return null;
  const model=source.publishedLinearModels[condition];
  if(!model)return null;
  const speedKmh=speedMps*3.6;
  return model.intercept+model.slopePerKmh*speedKmh;
}

// Retained only as a reproducibility/sensitivity helper for the historical R6
// normalization. R22 runtime never treats this ratio as numeric eligibility.
export function hagen2023BA019LowSpeedRatio(speedMps){
  const source=HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE;
  if(!within(speedMps,source.formerAdoptedLowSpeedDomainMps))return null;
  const numerator=hagen2023PfjsImpulsePerKm(speedMps,"HABITUAL");
  const denominator=hagen2023PfjsImpulsePerKm(source.formerSourceBridgeKnotMps,"HABITUAL");
  if(!(Number.isFinite(numerator)&&Number.isFinite(denominator)&&denominator>0))return null;
  return numerator/denominator;
}

export function assessHagen2023BA019R6({
  regionId="BA-DISP-019",
  runSetting="TREADMILL",
  speedMps,
  gradePercent=0,
  currentConstructId="PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
  referenceDefinitionId="RCM-RDEF-019",
}={}){
  const source=HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE;
  const bridgeDeltaMps=Math.abs(source.currentReferenceLabelMps-source.formerSourceBridgeKnotMps);
  const roundingHalfUnit=source.currentReferencePrintedPrecisionMps/2;
  const checks={
    regionMatch:regionId===source.candidateRegionId,
    constructIdentityMatch:currentConstructId===source.currentConstructId,
    referenceIdentityMatch:referenceDefinitionId===source.currentReferenceDefinitionId,
    endpointExposureDirectMatch:true,
    runSettingMatch:runSetting===source.runSetting,
    levelGradeMatch:Number.isFinite(gradePercent)&&Math.abs(gradePercent)<=EPS,
    formerReferenceBridgeWithinPrintedRounding:bridgeDeltaMps<=roundingHalfUnit+EPS,
    publishedRegressionReproducible:true,
    sourceHabitualCadenceStateReconstructable:false,
    crossStudyAbsoluteCalibrationAvailable:false,
  };
  if(!checks.regionMatch)return {state:"NOT_APPLICABLE_REGION",numericEligible:false,checks,sourceId:source.sourceId};
  if(!Number.isFinite(speedMps)||!Number.isFinite(gradePercent))return {state:"EVIDENCE_GAP",reason:"MISSING_SOURCE_COORDINATE",numericEligible:false,checks,sourceId:source.sourceId};
  if(!checks.levelGradeMatch)return {state:"OUT_OF_RANGE",reason:"HAGEN_SPEED_MODEL_HAS_NO_GRADE_AXIS",numericEligible:false,checks,sourceId:source.sourceId};
  if(!within(speedMps,source.formerAdoptedLowSpeedDomainMps))return {state:"OUT_OF_RANGE",reason:"OUTSIDE_FORMER_R6_LOW_SPEED_DOMAIN",numericEligible:false,checks,sourceId:source.sourceId};
  if(!checks.runSettingMatch){
    return {state:"EVIDENCE_GAP",reason:"HAGEN_TREADMILL_MODEL_OUTDOOR_TRANSFER_NOT_ESTABLISHED",numericEligible:false,numericRatio:null,checks,sourceId:source.sourceId,environmentSupportSourceId:WILLY_2016_BA019_ENVIRONMENT_TRANSFER_SOURCE.sourceId};
  }
  const publishedModelValue=hagen2023PfjsImpulsePerKm(speedMps,"HABITUAL");
  const historicalSensitivityRatio=hagen2023BA019LowSpeedRatio(speedMps);
  return {
    state:"EVIDENCE_GAP",
    bridgeState:source.referenceBridgeState,
    reason:"R22_HAGEN_LOW_SPEED_REFERENCE_BRIDGE_RETIRED_UNCALIBRATED_CROSS_STUDY_NORMALIZATION",
    numericEligible:false,
    numericRatio:null,
    publishedModelValue,
    historicalSensitivityRatio,
    sourceGeometryState:"PUBLISHED_MODEL_RETAINED_PROVENANCE_ONLY",
    checks,
    sourceId:source.sourceId,
    coordinates:{speedMps,gradePercent},
    modelId:"HAGEN_2023_HABITUAL_PFJS_IMPULSE_PER_KM_LINEAR_REGRESSION",
    modelDomainMps:source.formerAdoptedLowSpeedDomainMps,
    bridge:{
      sourceBridgeKnotMps:source.formerSourceBridgeKnotMps,
      currentReferenceLabelMps:source.currentReferenceLabelMps,
      bridgeDeltaMps,
      roundingHalfUnit,
      calibrationState:source.currentReferenceComparison.calibrationState,
      currentReferenceAbsolutePfjsImpulsePerKm:source.currentReferenceComparison.comparisonAbsolutePfjsImpulsePerKm,
      hagenPublishedRegressionAtBridge:source.currentReferenceComparison.hagenPublishedRegressionAtBridge,
      hagenMeasuredHabitualAtBridge:source.currentReferenceComparison.hagenMeasuredHabitualAtBridge,
    },
  };
}

export function assessWilly2016BA019EnvironmentTransferR6({runSetting="OUTDOOR_ROUTE",speedMps}={}){
  const source=WILLY_2016_BA019_ENVIRONMENT_TRANSFER_SOURCE;
  if(runSetting!=="OUTDOOR_ROUTE")return {state:"NOT_APPLICABLE_SETTING",numericEligible:false,sourceId:source.sourceId};
  return {
    state:"MULTISOURCE_BOUNDED_TRANSFER_CANDIDATE_BLOCKED",
    reason:source.reason,
    numericEligible:false,
    numericRatio:null,
    sourceId:source.sourceId,
    coordinates:{speedMps,validationSpeedMps:source.selfSelectedSpeedMps},
    supportedInterpretation:"PFJ cumulative stress estimates were similar between treadmill and overground at the study's self-selected pace; R22 does not treat non-significance as equivalence across other speeds.",
  };
}
