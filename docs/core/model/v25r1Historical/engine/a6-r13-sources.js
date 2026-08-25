// A6 R13 candidate-only BA014 hip-joint evidence registry.
// R13 adds NO active numeric magnitude or route. It separates (a) same-study
// speed x grade joint-work geometry, (b) direct low-speed level total-absolute
// hip-work values, and (c) high-speed graded mechanical-work corroboration from
// the Current BA014 Reference-100 routing problem.

export const KHASSETARASH_2020_BA014_SPEED_GRADE_JOINT_WORK_GEOMETRY_R13 = Object.freeze({
  sourceId:"SRC-A6-R13-001",
  doi:"10.1111/sms.13735",
  citation:"Khassetarash A, Vernillo G, Martinez A, Baggaley M, Giandolini M, Horvais N, Edwards WB, Millet GY. Biomechanics of graded running: Part II - Joint kinematics and kinetics. Scand J Med Sci Sports. 2020.",
  publicationType:"PRIMARY_ARTICLE_PUBLISHER_PREVIEW_FULL_TEXT_NOT_OPENLY_REDISTRIBUTABLE_IN_R13",
  participants:"19 runners",
  runSetting:"TREADMILL",
  runningSpeedsMps:Object.freeze([2.5,3.33,4.17]),
  gradeDegrees:Object.freeze([-10,-5,0,5,10]),
  protocolCellCount:15,
  endpointFamily:"lower-extremity joint kinetics including hip joint energy absorption/generation across a same-study speed x grade design",
  currentConstructId:"HIP_JOINT_MECHANICAL_DEMAND_TENDENCY",
  sameStudyIndependentSpeedGradeDesign:true,
  sourceReportsAccessibleCellwiseNumericHipWorkTable:false,
  sourceReportsAccessibleContinuousHipWorkModel:false,
  numericEligible:false,
  numericEligibilityReason:"STRONG_SOURCE_SHAPED_SPEED_GRADE_GEOMETRY_BUT_REPRODUCIBLE_CELLWISE_HIP_WORK_MAGNITUDES_NOT_AVAILABLE_AS_AN_ACCESSIBLE_TABLE_OR_PUBLISHED_CONTINUOUS_MODEL"
});

export const JIN_HAHN_2019_BA014_LOW_SPEED_LEVEL_HIP_WORK_SOURCE_R13 = Object.freeze({
  sourceId:"SRC-A6-R13-002",
  doi:"10.1038/s41598-019-41750-9",
  citation:"Jin L, Hahn ME. Comparison of lower extremity joint mechanics between healthy active young and middle age people in walking and running gait. Sci Rep. 2019;9:5568.",
  publicationType:"OPEN_ACCESS_PRIMARY_ARTICLE_CC_BY_4_0_WITH_SUPPLEMENT",
  participants:Object.freeze({young:10,middleAge:10}),
  runSetting:"TREADMILL",
  gradePercent:0,
  runningSpeedsMps:Object.freeze([1.8,2.2,2.6,3.0,3.4,3.8]),
  endpoint:"hip total absolute sagittal-plane mechanical work reconstructed within each published age group as stance positive + stance negative magnitude + swing positive + swing negative magnitude (J/kg)",
  stancePositiveHipWorkJkg:Object.freeze({young:Object.freeze([0.04,0.05,0.13,0.14,0.21,0.21]),middleAge:Object.freeze([0.05,0.09,0.10,0.16,0.19,0.24])}),
  stanceNegativeHipWorkJkg:Object.freeze({young:Object.freeze([0.11,0.12,0.13,0.18,0.20,0.22]),middleAge:Object.freeze([0.17,0.19,0.22,0.26,0.27,0.31])}),
  swingPositiveHipWorkJkg:Object.freeze({young:Object.freeze([0.15,0.22,0.32,0.44,0.56,0.67]),middleAge:Object.freeze([0.18,0.25,0.33,0.45,0.53,0.72])}),
  swingNegativeHipWorkJkg:Object.freeze({young:Object.freeze([0.01,0.02,0.04,0.05,0.08,0.08]),middleAge:Object.freeze([0.01,0.02,0.03,0.06,0.09,0.11])}),
  totalAbsoluteHipWorkJkg:Object.freeze({young:Object.freeze([0.31,0.41,0.62,0.81,1.05,1.18]),middleAge:Object.freeze([0.41,0.55,0.68,0.93,1.08,1.38])}),
  naturalCadenceReportedForRunningSpeedCells:false,
  ageGroupsReportedSeparately:true,
  sourceProvidesGradeAxis:false,
  currentReferenceSpeedMps:2.78,
  currentReferenceLiesWithinSourceSpeedRange:true,
  directConstructCompatibility:"HIGH_CANDIDATE",
  numericEligible:false,
  numericEligibilityReason:"DIRECT_LOW_SPEED_LEVEL_HIP_WORK_VALUES_ARE_REPRODUCIBLE_BUT_NATURAL_CADENCE_FOR_SPEED_CELLS_IS_UNREPORTED_AND_AGE_GROUPS_ARE_REPORTED_SEPARATELY; CURRENT_MODELS_CADENCE_SEPARATELY_SO_SPEED_ONLY_ACTIVATION_COULD_DOUBLE_COUNT_CADENCE_MEDIATION"
});

export const ROBINSON_2025_BA014_GRADED_MECHANICAL_WORK_SOURCE_R13 = Object.freeze({
  sourceId:"SRC-A6-R13-003",
  doi:"10.1038/s41598-025-09968-y",
  citation:"Robinson et al. Biomechanical strategies to achieve faster running speeds on level ground, uphill and downhill grades. Sci Rep. 2025.",
  publicationType:"OPEN_ACCESS_PRIMARY_ARTICLE",
  participants:"12 recreational runners",
  runSetting:"TREADMILL",
  gradeDegrees:Object.freeze([-7.5,0,7.5]),
  approximateGroupMeanSpeedsMps:Object.freeze([3.23,3.44,3.68]),
  endpointFamily:"sagittal-plane lower-extremity joint mechanical work including hip work across speed and grade",
  currentConstructId:"HIP_JOINT_MECHANICAL_DEMAND_TENDENCY",
  numericEligibleForBeginnerPriority:false,
  numericEligibilityReason:"MECHANICAL_WORK_ENDPOINT_IS_COMPATIBLE_CONTEXT_BUT_STUDIED_SPEEDS_ARE_ABOVE_THE_ORIGINAL_2_381_MPS_CASE_AND_PREDOMINANTLY_ABOVE_THE_1_8_TO_3_0_MPS_PRIORITY_BAND"
});

export const CURRENT_BA014_PROXY_FAMILY_R13 = Object.freeze({
  constructId:"HIP_JOINT_MECHANICAL_DEMAND_TENDENCY",
  currentReferenceIndex:100,
  currentReferenceSpeedMps:2.78,
  levelSpeedRoute:Object.freeze({sourceId:"SRC-A5-001",endpoint:"hip total absolute mechanical work across reported stance/swing flexion-extension work terms",sourceSpeedsMps:Object.freeze([2.78,3.89,5.0])}),
  gradeRoute:Object.freeze({sourceId:"SRC-SUP-003",sourceSpeedMps:2.25,endpoint:"hip joint mechanical work: decline absolute negative power / incline positive power normalized to level"}),
  boundedGradeTransfer:Object.freeze({routeId:"A6_NUCKOLS_BOUNDED_GRADE_TRANSFER",status:"RETIRED_R19",numericRuntimeEligible:false,historicalSpeedEnvelopeMps:Object.freeze([1.8,2.5]),coverage:"HISTORICAL_ONLY"}),
  cadenceRoute:Object.freeze({sourceId:"E04",status:"RETIRED_R17",numericRuntimeEligible:false,endpoint:"hip total absolute work under preferred-relative step-rate manipulation",historicalSpeedEnvelopeMps:Object.freeze([2.4,3.4])})
});

const finite=x=>Number.isFinite(Number(x));
const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t;
export function assessR13BA014HipEvidence({speedMps=5000/(35*60),gradePercent=0,gradeDegrees=null,runSetting="OUTDOOR_ROUTE"}={}){
  const v=Number(speedMps),gp=Number(gradePercent),gd=gradeDegrees===null?gp/100*180/Math.PI:Number(gradeDegrees);
  const k=KHASSETARASH_2020_BA014_SPEED_GRADE_JOINT_WORK_GEOMETRY_R13;
  const j=JIN_HAHN_2019_BA014_LOW_SPEED_LEVEL_HIP_WORK_SOURCE_R13;
  const r=ROBINSON_2025_BA014_GRADED_MECHANICAL_WORK_SOURCE_R13;
  const khSpeed=finite(v)&&k.runningSpeedsMps.some(x=>near(x,v,1e-6));
  const khGrade=finite(gd)&&k.gradeDegrees.some(x=>near(x,gd,1e-6));
  const khKnot=runSetting==="TREADMILL"&&khSpeed&&khGrade;
  const jinIndex=finite(v)?j.runningSpeedsMps.findIndex(x=>near(x,v,1e-9)):-1;
  const jinKnot=runSetting==="TREADMILL"&&near(gp,0)&&jinIndex>=0;
  const jinInRange=runSetting==="TREADMILL"&&near(gp,0)&&finite(v)&&v>=j.runningSpeedsMps[0]&&v<=j.runningSpeedsMps.at(-1);
  const robinsonInSpeedContext=finite(v)&&v>=Math.min(...r.approximateGroupMeanSpeedsMps)&&v<=Math.max(...r.approximateGroupMeanSpeedsMps);
  let sourceContext=null,state="EVIDENCE_GAP";
  if(jinKnot){state="SOURCE_KNOT_NUMERIC_CONTEXT_ONLY";sourceContext=Object.freeze({sourceId:j.sourceId,speedMps:v,youngTotalAbsoluteHipWorkJkg:j.totalAbsoluteHipWorkJkg.young[jinIndex],middleAgeTotalAbsoluteHipWorkJkg:j.totalAbsoluteHipWorkJkg.middleAge[jinIndex]});}
  else if(jinInRange){state="WITHIN_SOURCE_SPEED_RANGE_CONTEXT_ONLY";sourceContext=Object.freeze({sourceId:j.sourceId,speedMps:v,referenceBridgeCandidate:true});}
  else if(khKnot){state="SOURCE_KNOT_CONDITION_ONLY";sourceContext=Object.freeze({sourceId:k.sourceId,speedMps:v,gradeDegrees:gd});}
  else if(runSetting==="TREADMILL"&&robinsonInSpeedContext){state="HIGH_SPEED_MECHANICAL_WORK_CONTEXT_ONLY";sourceContext=Object.freeze({sourceId:r.sourceId,speedMps:v});}
  return Object.freeze({
    state,speedMps:finite(v)?v:null,gradePercent:finite(gp)?gp:null,gradeDegrees:finite(gd)?gd:null,runSetting,sourceContext,
    directConstructNumericBridgeCandidateAvailable:true,
    sameStudySpeedGradeGeometryAvailable:true,
    numericEligible:false,numericRatio:null,
    referenceBridgeState:"EVIDENCE_GAP_CADENCE_AND_PROTOCOL_BRIDGE",
    reason:state.startsWith("SOURCE_KNOT_NUMERIC")||state.startsWith("WITHIN_SOURCE_SPEED")?"JIN_DIRECT_HIP_WORK_CONTEXT_AVAILABLE_BUT_CADENCE_AND_AGE_GROUP_MAPPING_TO_CURRENT_REFERENCE_100_UNRESOLVED":khKnot?"KHASSETARASH_EXACT_SPEED_GRADE_CONDITION_EXISTS_BUT_ACCESSIBLE_CELLWISE_HIP_WORK_MAGNITUDE_TABLE_IS_NOT_AVAILABLE":state.startsWith("HIGH_SPEED")?"ROBINSON_MECHANICAL_WORK_CONTEXT_IS_ABOVE_ORIGINAL_LOW_SPEED_CASE":"NO_R13_ACTIVE_NUMERIC_BRIDGE_AT_REQUESTED_CONDITION",
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_DIGITIZE_KHASSETARASH_FIGURES_TO_CREATE_CELLWISE_BA014_MAGNITUDES",
      "DO_NOT_CREATE_A_NUMERIC_2D_SURFACE_FROM_KHASSETARASH_GEOMETRY_WITHOUT_REPRODUCIBLE_CELL_MAGNITUDES",
      "DO_NOT_TREAT_JIN_SPEED_SERIES_AS_PURE_SPEED_EFFECT_INDEPENDENT_OF_UNREPORTED_NATURAL_CADENCE",
      "DO_NOT_ARBITRARILY_SELECT_YOUNG_OR_MIDDLE_AGE_GROUP_AS_CURRENT_REFERENCE_POPULATION",
      "DO_NOT_POOL_JIN_AGE_GROUPS_MERELY_TO_FORCE_A_REFERENCE_RATIO",
      "DO_NOT_TRANSFER_JIN_LEVEL_WORK_CURVE_TO_GRADED_RUNNING",
      "DO_NOT_TRANSFER_TREADMILL_HIP_WORK_TO_OUTDOOR_ROUTE_WITHOUT_WORK_SPECIFIC_ENVIRONMENT_BRIDGE",
      "DO_NOT_EXTRAPOLATE_ROBINSON_MECHANICAL_WORK_BELOW_ITS_STUDIED_SPEED_CONTEXT",
      "DO_NOT_REPLACE_CURRENT_REFERENCE_100_AT_2_78_MPS"
    ])
  });
}
