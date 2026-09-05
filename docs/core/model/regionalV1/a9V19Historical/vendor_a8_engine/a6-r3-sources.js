// A6 R3 candidate-only evidence-compatibility registry.
// Rice et al. (2024) provides a fully crossed speed x gradient CONDITION grid for tibial PEAK loading,
// but the Current BA021 construct is cumulative total stress impulse tendency.
// R3 therefore registers source geometry without creating numeric magnitudes or 2D interpolation.

export const RICE_2024_TIBIAL_PEAK_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R3-001",
  citation: "Rice H, Kurz M, Mai P, Robertz L, Bill K, Derrick TR, Willwacher S. Speed and surface steepness affect internal tibial loading during running. J Sport Health Sci. 2024;13(1):118-124.",
  doi: "10.1016/j.jshs.2023.03.004",
  pmcid: "PMC10818105",
  license: "CC BY-NC-ND 4.0",
  participants: "20 recreational runners",
  runSetting: "TREADMILL",
  candidateRegionId: "BA-DISP-021",
  sourceEndpoint: "peak tibial bending moment; peak anterior tensile stress; peak posterior compressive stress at distal-third tibia",
  currentRequiredConstructId: "TIBIAL_CUMULATIVE_TOTAL_STRESS_IMPULSE_TENDENCY",
  currentReferenceDefinitionId: "RCM-RDEF-021",
  sourceExposureBasis: "PER_STEP_PEAK",
  currentExposureBasis: "CUMULATIVE_STRESS_IMPULSE",
  speedsMps: Object.freeze([2.5, 3.0, 3.5]),
  gradesPercent: Object.freeze([-15, -10, -5, 0, 5, 10, 15]),
  geometry: "FULL_CROSS_3_SPEED_X_7_GRADE_CONDITION_GRID",
  conditionCellCount: 21,
  numericCompatibility: "BLOCKED_ENDPOINT_AND_EXPOSURE_BASIS_MISMATCH",
  numericRoutePolicy: "NO_NUMERIC_TRANSFER_TO_BA021_CURRENT_CONSTRUCT",
  limitations: Object.freeze([
    "Source outcome is peak tibial bending/stress, not cumulative total stress impulse.",
    "No source-defined Reference 100 equivalent to RCM-RDEF-021 is registered.",
    "The 21 measured condition cells establish experimental condition geometry only for R3.",
    "No interpolation of Rice peak magnitudes into the BA021 cumulative construct is allowed.",
    "Treadmill protocol; outdoor transfer is not established by this source alone.",
  ]),
});

const EPS=1e-12;
const exactIndex=(values,x)=>values.findIndex(v=>Math.abs(v-x)<=EPS);

export function assessRice2024BA021Evidence({regionId="BA-DISP-021",runSetting="TREADMILL",speedMps,gradePercent,currentConstructId="TIBIAL_CUMULATIVE_TOTAL_STRESS_IMPULSE_TENDENCY",referenceDefinitionId="RCM-RDEF-021"}={}){
  const s=RICE_2024_TIBIAL_PEAK_SOURCE;
  const checks={
    regionMatch: regionId===s.candidateRegionId,
    runSettingMatch: runSetting===s.runSetting,
    constructIdentityMatch: currentConstructId===s.currentRequiredConstructId,
    referenceIdentityMatch: referenceDefinitionId===s.currentReferenceDefinitionId,
    endpointCompatible: false,
    exposureBasisCompatible: false,
    sourceReferenceEquivalentEstablished: false,
  };
  if(!checks.regionMatch)return {state:"NOT_APPLICABLE_REGION",numericEligible:false,checks,sourceId:s.sourceId};
  if(!checks.runSettingMatch)return {state:"OUT_OF_RANGE",reason:"RUN_SETTING_OUTSIDE_SOURCE_PROTOCOL",numericEligible:false,checks,sourceId:s.sourceId};
  if(!Number.isFinite(speedMps)||!Number.isFinite(gradePercent))return {state:"EVIDENCE_GAP",reason:"MISSING_SOURCE_COORDINATE",numericEligible:false,checks,sourceId:s.sourceId};
  const speedInDomain=speedMps>=s.speedsMps[0]-EPS&&speedMps<=s.speedsMps.at(-1)+EPS;
  const gradeInDomain=gradePercent>=s.gradesPercent[0]-EPS&&gradePercent<=s.gradesPercent.at(-1)+EPS;
  if(!speedInDomain||!gradeInDomain)return {state:"OUT_OF_RANGE",reason:"OUTSIDE_RICE2024_CONDITION_DOMAIN",numericEligible:false,checks,sourceId:s.sourceId,coordinates:{speedMps,gradePercent}};
  const speedIndex=exactIndex(s.speedsMps,speedMps);
  const gradeIndex=exactIndex(s.gradesPercent,gradePercent);
  const exactConditionCell=speedIndex>=0&&gradeIndex>=0;
  const geometryState=exactConditionCell?"SOURCE_KNOT_CONDITION_ONLY":"WITHIN_SOURCE_GRID_GEOMETRY_ONLY";
  return {
    state:"EVIDENCE_GAP",
    reason:"ENDPOINT_AND_EXPOSURE_BASIS_MISMATCH",
    geometryState,
    exactConditionCell,
    conditionCell: exactConditionCell?{speedMps:s.speedsMps[speedIndex],gradePercent:s.gradesPercent[gradeIndex]}:null,
    coordinates:{speedMps,gradePercent},
    numericEligible:false,
    numericRatio:null,
    interpolationAllowedForCurrentConstruct:false,
    sourceId:s.sourceId,
    checks,
  };
}
