// A6 R5 candidate-only endpoint/reference bridge registry.
// R5 does not add numeric BA019/BA025 coefficients. It explicitly separates:
// (1) endpoint/exposure identity, (2) source geometry, and (3) Current Reference-100 bridge.

export const DOYLE_2025_BA019_ENDPOINT_BRIDGE_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R5-001",
  citation: "Doyle EW, Doyle TLA, Bonacci J, Beach AJ, Fuller JT. Cumulative patellofemoral force and stress are lower during faster running compared to slower running in recreational runners. Sports Biomech. 2025;24(5):1250-1262.",
  doi: "10.1080/14763141.2023.2226111",
  participants: "20 recreational runners",
  runSetting: "TREADMILL",
  candidateRegionId: "BA-DISP-019",
  currentConstructId: "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
  currentReferenceDefinitionId: "RCM-RDEF-019",
  sourceEndpoint: "cumulative patellofemoral joint stress per 1 km of continuous running",
  sourceExposureBasis: "CUMULATIVE_PER_1KM",
  endpointExposureCompatibility: "DIRECT_ENDPOINT_EXPOSURE_MATCH_CANDIDATE",
  speedsMps: Object.freeze([2.5,3.1,3.6,4.2]),
  gradesDegrees: Object.freeze([0]),
  sourceGeometry: "ONE_DIMENSIONAL_LEVEL_SPEED_SERIES",
  currentReferenceSpeedMps: 2.78,
  referenceBridgeState: "UNRESOLVED_EXACT_STRESS_SPECIFIC_NUMERIC_BRIDGE",
  numericEligible: false,
  limitations: Object.freeze([
    "The final article establishes cumulative PFJ stress per 1 km, but R5 does not have a source-verified stress-specific value/ratio at every knot that can be uniquely bridged to Current 2.78 m/s Reference 100.",
    "The published abstract reports ranges combining cumulative PFJ force/stress reductions; R5 does not choose a midpoint or guess which bound belongs to stress.",
    "An earlier conference version is not substituted for the final journal article when numerical estimates differ.",
    "The source speed domain begins at 2.5 m/s, so the 5 km / 35 min case (about 2.381 m/s) remains below source range.",
    "The source is level treadmill running only; no grade or outdoor numerical transfer is created."
  ])
});

export const FIRMINGER_2020_BA025_CUMULATIVE_METHOD_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R5-002",
  citation: "Firminger CR, Asmussen MJ, Cigoja S, Fletcher JR, Nigg BM, Edwards WB. Cumulative Metrics of Tendon Load and Damage Vary Discordantly with Running Speed. Med Sci Sports Exerc. 2020;52(7):1549-1556.",
  doi: "10.1249/MSS.0000000000002287",
  candidateRegionId: "BA-DISP-025",
  currentConstructId: "ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",
  currentReferenceDefinitionId: "RCM-RDEF-025",
  sourceEndpoint: "Achilles tendon force/strain cumulative load",
  sourceExposureBasis: "STANCE_TIME_INTEGRAL_FORCE_OR_STRAIN_X_STRIDE_COUNT_FOR_1KM",
  endpointExposureCompatibility: "DIRECT_CUMULATIVE_METHOD_MATCH_CANDIDATE",
  sourceGeometry: "THREE_SPEED_STUDY_SPEED_KNOTS_NOT_REGISTERED_IN_R5",
  exactSpeedKnotsVerifiedForNumericUse: false,
  numericEligible: false,
  limitations: Object.freeze([
    "The primary abstract verifies a three-speed protocol and the per-kilometer cumulative method, but exact speed knots and source values required for Current normalization were not secured from the primary full text in R5.",
    "No numeric knot is inferred from secondary citations or unrelated papers.",
    "The study is speed-only for this R5 purpose and does not establish a speed x grade surface."
  ])
});

const EPS=1e-12;
const exact=(xs,x)=>xs.some(v=>Math.abs(v-x)<=EPS);
const within=(xs,x)=>Number.isFinite(x)&&x>=Math.min(...xs)-EPS&&x<=Math.max(...xs)+EPS;

export function assessDoyle2025BA019R5({regionId="BA-DISP-019",runSetting="TREADMILL",speedMps,gradeDegrees=0,currentConstructId="PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",referenceDefinitionId="RCM-RDEF-019"}={}){
  const s=DOYLE_2025_BA019_ENDPOINT_BRIDGE_SOURCE;
  const checks={
    regionMatch:regionId===s.candidateRegionId,
    runSettingMatch:runSetting===s.runSetting,
    constructIdentityMatch:currentConstructId===s.currentConstructId,
    referenceIdentityMatch:referenceDefinitionId===s.currentReferenceDefinitionId,
    endpointExposureDirectMatch:true,
    exactNumericReferenceBridgeEstablished:false
  };
  if(!checks.regionMatch)return {state:"NOT_APPLICABLE_REGION",numericEligible:false,checks,sourceId:s.sourceId};
  if(!checks.runSettingMatch)return {state:"OUT_OF_RANGE",reason:"RUN_SETTING_OUTSIDE_SOURCE_PROTOCOL",numericEligible:false,checks,sourceId:s.sourceId};
  if(!Number.isFinite(speedMps)||!Number.isFinite(gradeDegrees))return {state:"EVIDENCE_GAP",reason:"MISSING_SOURCE_COORDINATE",numericEligible:false,checks,sourceId:s.sourceId};
  if(Math.abs(gradeDegrees)>EPS)return {state:"OUT_OF_RANGE",reason:"DOYLE_LEVEL_SPEED_SERIES_HAS_NO_GRADE_AXIS",numericEligible:false,checks,sourceId:s.sourceId};
  if(!within(s.speedsMps,speedMps))return {state:"OUT_OF_RANGE",reason:"OUTSIDE_DOYLE_SPEED_DOMAIN",numericEligible:false,checks,sourceId:s.sourceId};
  return {
    state:"EVIDENCE_GAP",
    reason:"DIRECT_ENDPOINT_EXPOSURE_MATCH_BUT_REFERENCE_BRIDGE_PENDING",
    geometryState:exact(s.speedsMps,speedMps)?"SOURCE_KNOT_ENDPOINT_MATCH_REFERENCE_BRIDGE_PENDING":"WITHIN_SOURCE_SPEED_GEOMETRY_REFERENCE_BRIDGE_PENDING",
    endpointCompatibility:"DIRECT_ENDPOINT_EXPOSURE_MATCH_CANDIDATE",
    numericEligible:false,
    numericRatio:null,
    interpolationAllowedForCurrentConstruct:false,
    multisourceBoundedTransferEligible:false,
    checks,sourceId:s.sourceId,coordinates:{speedMps,gradeDegrees}
  };
}

export function assessDoyleToCurrentBA019ReferenceBridgeR5(){
  return Object.freeze({
    state:"MULTISOURCE_BOUNDED_TRANSFER_CANDIDATE_BLOCKED",
    reason:"EXACT_STRESS_SPECIFIC_FINAL_ARTICLE_NUMERIC_BRIDGE_TO_RCM_RDEF_019_NOT_VERIFIED",
    endpointExposureCompatible:true,
    sourceReferenceSpeedMps:2.5,
    currentReferenceSpeedMps:2.78,
    currentReferenceDefinitionId:"RCM-RDEF-019",
    numericEligible:false,
    numericRatio:null,
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_USE_MIDPOINT_OF_PUBLISHED_FORCE_STRESS_PERCENT_RANGE",
      "DO_NOT_SUBSTITUTE_EARLIER_CONFERENCE_ESTIMATE_FOR_FINAL_ARTICLE",
      "DO_NOT_EXTRAPOLATE_BELOW_2_5_MPS",
      "DO_NOT_CREATE_SPEED_X_GRADE_RECTANGLE"
    ])
  });
}

export function assessFirminger2020BA025R5({regionId="BA-DISP-025",currentConstructId="ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",referenceDefinitionId="RCM-RDEF-025"}={}){
  const s=FIRMINGER_2020_BA025_CUMULATIVE_METHOD_SOURCE;
  const checks={regionMatch:regionId===s.candidateRegionId,constructIdentityMatch:currentConstructId===s.currentConstructId,referenceIdentityMatch:referenceDefinitionId===s.currentReferenceDefinitionId,cumulativeMethodDirectMatch:true,exactSpeedKnotsVerifiedForNumericUse:false,exactNumericReferenceBridgeEstablished:false};
  if(!checks.regionMatch)return {state:"NOT_APPLICABLE_REGION",numericEligible:false,checks,sourceId:s.sourceId};
  return {state:"EVIDENCE_GAP",reason:"CUMULATIVE_METHOD_MATCH_BUT_PRIMARY_NUMERIC_KNOTS_NOT_REGISTERED",geometryState:"STUDY_LEVEL_METHOD_EVIDENCE_ONLY",numericEligible:false,numericRatio:null,checks,sourceId:s.sourceId};
}
