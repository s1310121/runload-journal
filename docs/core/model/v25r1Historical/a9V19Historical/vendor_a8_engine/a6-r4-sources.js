// A6 R4 candidate-only low-speed patellofemoral evidence registry.
// Purpose: distinguish nearby/construct-relevant source geometry from evidence that is actually
// eligible to alter the Current BA019 cumulative PFJ stress-impulse tendency.
// R4 deliberately creates NO new BA019 numeric coefficient.

export const DOYLE_2025_PFJ_CUMULATIVE_SPEED_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R4-001",
  citation: "Doyle EW, Doyle TLA, Bonacci J, Beach AJ, Fuller JT. Cumulative patellofemoral force and stress are lower during faster running compared to slower running in recreational runners. Sports Biomech. 2025;24(5):1250-1262.",
  doi: "10.1080/14763141.2023.2226111",
  participants: "20 recreational runners",
  runSetting: "TREADMILL",
  candidateRegionId: "BA-DISP-019",
  sourceEndpoint: "peak and cumulative patellofemoral joint force and stress; cumulative outcomes expressed per 1 km continuous running",
  currentRequiredConstructId: "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
  currentReferenceDefinitionId: "RCM-RDEF-019",
  sourceExposureBasis: "CUMULATIVE_PER_1KM",
  currentExposureBasis: "CUMULATIVE_STRESS_IMPULSE",
  speedsMps: Object.freeze([2.5, 3.1, 3.6, 4.2]),
  gradesDegrees: Object.freeze([0]),
  geometry: "ONE_DIMENSIONAL_SPEED_SERIES_AT_LEVEL_GRADE",
  endpointCompatibility: "CONSTRUCT_RELEVANT_CUMULATIVE_PFJ_STRESS",
  numericCompatibility: "BLOCKED_REFERENCE_NORMALIZATION_NOT_ESTABLISHED_IN_R4",
  numericRoutePolicy: "CONDITION_AND_CONSTRUCT_SUPPORT_ONLY_NO_NUMERIC_TRANSFER",
  limitations: Object.freeze([
    "R4 does not register a source-defined numeric ratio against Current RCM-RDEF-019.",
    "The study supplies a speed series at level running, not a speed x grade surface.",
    "No value from another publication/proceeding version is substituted for the final article's numeric identity.",
    "Treadmill protocol; outdoor transfer is not established by this source alone.",
  ]),
});

export const HO_2018_PFJ_GRADE_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R4-002",
  citation: "Ho KY, French T, Klein B, Lee Y. Patellofemoral joint stress during incline and decline running. Phys Ther Sport. 2018;34:136-140.",
  doi: "10.1016/j.ptsp.2018.09.010",
  participants: "20 recreational runners",
  runSetting: "TREADMILL",
  candidateRegionId: "BA-DISP-019",
  sourceEndpoint: "patellofemoral joint stress, reaction force, contact area, and stress-time integral",
  currentRequiredConstructId: "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
  currentReferenceDefinitionId: "RCM-RDEF-019",
  sourceExposureBasis: "PER_STEP_STRESS_TIME_INTEGRAL",
  currentExposureBasis: "CUMULATIVE_STRESS_IMPULSE_OVER_DISTANCE",
  speedsMps: Object.freeze([2.3]),
  gradesDegrees: Object.freeze([-6, 0, 6]),
  geometry: "ONE_DIMENSIONAL_GRADE_SERIES_AT_FIXED_2_3_MPS",
  endpointCompatibility: "PFJ_STRESS_RELATED_BUT_EXPOSURE_BASIS_MISMATCH",
  numericCompatibility: "BLOCKED_EXPOSURE_BASIS_AND_REFERENCE_MISMATCH",
  numericRoutePolicy: "CONDITION_AND_DIRECTION_SUPPORT_ONLY_NO_NUMERIC_TRANSFER",
  limitations: Object.freeze([
    "Stress-time integral is per stance/step and is not the Current per-distance cumulative exposure construct by itself.",
    "The study does not establish Current RCM-RDEF-019 Reference 100 equivalence.",
    "A 2.3 m/s grade series cannot be combined with Doyle's level speed series into a numerical rectangle.",
    "Treadmill protocol; outdoor transfer is not established by this source alone.",
  ]),
});

const EPS=1e-12;
const exact=(values,x)=>values.some(v=>Math.abs(v-x)<=EPS);
const within=(values,x)=>x>=Math.min(...values)-EPS&&x<=Math.max(...values)+EPS;

export function assessDoyle2025BA019Evidence({regionId="BA-DISP-019",runSetting="TREADMILL",speedMps,gradeDegrees=0,currentConstructId="PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",referenceDefinitionId="RCM-RDEF-019"}={}){
  const s=DOYLE_2025_PFJ_CUMULATIVE_SPEED_SOURCE;
  const checks={regionMatch:regionId===s.candidateRegionId,runSettingMatch:runSetting===s.runSetting,constructIdentityMatch:currentConstructId===s.currentRequiredConstructId,referenceIdentityMatch:referenceDefinitionId===s.currentReferenceDefinitionId,endpointConstructRelevant:true,exposureBasisClose:true,sourceReferenceEquivalentEstablished:false};
  if(!checks.regionMatch)return {state:"NOT_APPLICABLE_REGION",numericEligible:false,checks,sourceId:s.sourceId};
  if(!checks.runSettingMatch)return {state:"OUT_OF_RANGE",reason:"RUN_SETTING_OUTSIDE_SOURCE_PROTOCOL",numericEligible:false,checks,sourceId:s.sourceId};
  if(!Number.isFinite(speedMps)||!Number.isFinite(gradeDegrees))return {state:"EVIDENCE_GAP",reason:"MISSING_SOURCE_COORDINATE",numericEligible:false,checks,sourceId:s.sourceId};
  if(Math.abs(gradeDegrees)>EPS)return {state:"OUT_OF_RANGE",reason:"DOYLE_SPEED_SERIES_IS_LEVEL_ONLY",numericEligible:false,checks,sourceId:s.sourceId};
  if(!within(s.speedsMps,speedMps))return {state:"OUT_OF_RANGE",reason:"OUTSIDE_DOYLE_SPEED_DOMAIN",numericEligible:false,checks,sourceId:s.sourceId};
  return {state:"EVIDENCE_GAP",reason:"REFERENCE_NORMALIZATION_NOT_ESTABLISHED",geometryState:exact(s.speedsMps,speedMps)?"SOURCE_KNOT_CONDITION_ONLY":"WITHIN_SOURCE_SPEED_GEOMETRY_ONLY",numericEligible:false,numericRatio:null,interpolationAllowedForCurrentConstruct:false,checks,sourceId:s.sourceId,coordinates:{speedMps,gradeDegrees}};
}

export function assessHo2018BA019Evidence({regionId="BA-DISP-019",runSetting="TREADMILL",speedMps,gradeDegrees,currentConstructId="PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",referenceDefinitionId="RCM-RDEF-019"}={}){
  const s=HO_2018_PFJ_GRADE_SOURCE;
  const checks={regionMatch:regionId===s.candidateRegionId,runSettingMatch:runSetting===s.runSetting,constructIdentityMatch:currentConstructId===s.currentRequiredConstructId,referenceIdentityMatch:referenceDefinitionId===s.currentReferenceDefinitionId,endpointRelated:true,exposureBasisCompatible:false,sourceReferenceEquivalentEstablished:false};
  if(!checks.regionMatch)return {state:"NOT_APPLICABLE_REGION",numericEligible:false,checks,sourceId:s.sourceId};
  if(!checks.runSettingMatch)return {state:"OUT_OF_RANGE",reason:"RUN_SETTING_OUTSIDE_SOURCE_PROTOCOL",numericEligible:false,checks,sourceId:s.sourceId};
  if(!Number.isFinite(speedMps)||!Number.isFinite(gradeDegrees))return {state:"EVIDENCE_GAP",reason:"MISSING_SOURCE_COORDINATE",numericEligible:false,checks,sourceId:s.sourceId};
  if(Math.abs(speedMps-2.3)>EPS)return {state:"OUT_OF_RANGE",reason:"HO2018_GRADE_SERIES_FIXED_AT_2_3_MPS",numericEligible:false,checks,sourceId:s.sourceId};
  if(!within(s.gradesDegrees,gradeDegrees))return {state:"OUT_OF_RANGE",reason:"OUTSIDE_HO2018_GRADE_DOMAIN",numericEligible:false,checks,sourceId:s.sourceId};
  return {state:"EVIDENCE_GAP",reason:"EXPOSURE_BASIS_AND_REFERENCE_MISMATCH",geometryState:exact(s.gradesDegrees,gradeDegrees)?"SOURCE_KNOT_CONDITION_ONLY":"WITHIN_SOURCE_GRADE_GEOMETRY_ONLY",numericEligible:false,numericRatio:null,interpolationAllowedForCurrentConstruct:false,checks,sourceId:s.sourceId,coordinates:{speedMps,gradeDegrees}};
}

export function assessR4CrossSourceBA019Transfer({runSetting="TREADMILL",speedMps,gradeDegrees}={}){
  // Explicitly reject building a numerical 2D surface by connecting Doyle's level-speed series
  // with Ho's fixed-speed grade series. Proximity is not evidence equivalence.
  const d=assessDoyle2025BA019Evidence({runSetting,speedMps,gradeDegrees});
  const h=assessHo2018BA019Evidence({runSetting,speedMps,gradeDegrees});
  return {state:"EVIDENCE_GAP",reason:"NO_SINGLE_NUMERICALLY_COMPATIBLE_SOURCE_PATH_AND_CROSS_SOURCE_RECTANGLE_FORBIDDEN",numericEligible:false,numericRatio:null,multisourceBoundedTransferEligible:false,sourceAssessments:Object.freeze([d,h])};
}
