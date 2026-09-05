// A6 R14 candidate-only cadence/protocol bridge and low-speed joint-work registry.
// R14 adds NO active numerical magnitude or route. It closes the public cadence
// search for the Jin/Hahn speed-series bridge and audits BA024/BA016/BA023 using
// the already verified Jin & Hahn 2019 primary + supplement.

export const JIN_HAHN_CADENCE_BRIDGE_AUDIT_R14 = Object.freeze({
  state:"PUBLIC_PRIMARY_CADENCE_BRIDGE_NOT_RESOLVED",
  targetConstruct:"HIP_JOINT_MECHANICAL_DEMAND_TENDENCY",
  targetSourceId:"SRC-A6-R13-002",
  targetRunningSpeedsMps:Object.freeze([1.8,2.2,2.6,3.0,3.4,3.8]),
  reviewedPrimaryPublications:Object.freeze([
    Object.freeze({year:2018,doi:"10.1016/j.humov.2018.01.004",participants:"10 young healthy subjects",runSetting:"TREADMILL",runningRangeMps:Object.freeze([1.8,3.8]),speedCellCadencePublishedInAccessiblePrimary:false,sameDatasetAs2019Confirmed:false}),
    Object.freeze({year:2019,doi:"10.1038/s41598-019-41750-9",participants:"10 young + 10 middle-age healthy active subjects",runSetting:"TREADMILL",runningSpeedsMps:Object.freeze([1.8,2.2,2.6,3.0,3.4,3.8]),speedCellCadencePublishedInAccessiblePrimary:false,dataAvailability:"MAY_BE_AVAILABLE_FROM_CORRESPONDING_AUTHOR_ON_REASONABLE_REQUEST"}),
    Object.freeze({year:2022,doi:"10.3390/biomechanics2030034",participants:"20 healthy subjects",runSetting:"TREADMILL",runningSpeedsMps:Object.freeze([1.8,2.2,2.6,3.0,3.4,3.8]),speedCellCadencePublishedInAccessiblePrimary:false,sameDatasetAs2019Confirmed:false})
  ]),
  externalCadenceModelSubstitutionAllowed:false,
  numericEligible:false,
  numericEligibilityReason:"NO_SAME_OR_CONFIRMED_NEAR_DATASET_SPEED_CELL_NATURAL_CADENCE_VALUES_PUBLISHED_IN_REVIEWED_PRIMARY_SOURCES; A_DIFFERENT_COHORT_CADENCE_SPEED_CURVE_CANNOT_CALIBRATE_JIN_JOINT_WORK"
});

export const JIN_HAHN_2019_BA024_LOW_SPEED_ANKLE_WORK_R14 = Object.freeze({
  sourceId:"SRC-A6-R14-001",
  doi:"10.1038/s41598-019-41750-9",
  citation:"Jin L, Hahn ME. Comparison of lower extremity joint mechanics between healthy active young and middle age people in walking and running gait. Sci Rep. 2019;9:5568.",
  publicationType:"OPEN_ACCESS_PRIMARY_ARTICLE_WITH_OFFICIAL_SUPPLEMENT",
  runSetting:"TREADMILL",
  gradePercent:0,
  runningSpeedsMps:Object.freeze([1.8,2.2,2.6,3.0,3.4,3.8]),
  currentConstructId:"ANKLE_TOTAL_MECHANICAL_WORK_TENDENCY",
  currentReferenceSpeedMps:2.78,
  endpointCompatibility:"HIGH_DIRECT_JOINT_WORK_CONSTRUCT_CANDIDATE",
  stancePositiveAnkleWorkJkg:Object.freeze({young:Object.freeze([0.46,0.51,0.46,0.50,0.52,0.70]),middleAge:Object.freeze([0.49,0.49,0.56,0.52,0.55,0.62])}),
  stanceNegativeAnkleWorkJkg:Object.freeze({young:Object.freeze([0.30,0.31,0.31,0.35,0.33,0.44]),middleAge:Object.freeze([0.32,0.34,0.37,0.39,0.41,0.46])}),
  swingPositiveAnkleWorkJkg:Object.freeze({young:Object.freeze([0.01,0.01,0.01,0.01,0.01,0.02]),middleAge:Object.freeze([0.01,0.01,0.01,0.01,0.02,0.02])}),
  swingNegativeAnkleWorkReported:Object.freeze({young:Object.freeze(["<0.01","<0.01","<0.01","<0.01",0.01,0.01]),middleAge:Object.freeze(["<0.01","<0.01","<0.01",0.01,0.01,0.01])}),
  exactTotalAbsoluteWorkReconstructionAtAllSpeeds:false,
  naturalCadenceReportedForRunningSpeedCells:false,
  ageGroupsReportedSeparately:true,
  numericEligible:false,
  numericEligibilityReason:"DIRECT_LOW_SPEED_ANKLE_WORK_COMPONENTS_EXIST_BUT_SPEED_CELL_NATURAL_CADENCE_IS_UNREPORTED, AGE_GROUP_MAPPING_IS_UNRESOLVED, AND_LOW_SPEED_SWING_NEGATIVE_WORK_IS_LEFT_CENSORED_AS_LT_0_01"
});

export const JIN_HAHN_2019_BA016_BA023_CONTEXT_R14 = Object.freeze({
  sourceId:"SRC-A6-R14-002",
  doi:"10.1038/s41598-019-41750-9",
  runningSpeedsMps:Object.freeze([1.8,2.2,2.6,3.0,3.4,3.8]),
  runSetting:"TREADMILL",
  gradePercent:0,
  BA016:Object.freeze({currentConstructId:"ANTERIOR_THIGH_FUNCTIONAL_DEMAND_TENDENCY",sourceEndpoint:"total knee-joint positive/negative mechanical work across stance/swing",compatibility:"JOINT_WORK_CONTEXT_ONLY",numericEligible:false,reason:"JOINT_WORK_DOES_NOT_ISOLATE_QUADRICEPS_OR_KNEE_EXTENSION_COMPONENT_USED_BY_CURRENT_BA016_PROXY"}),
  BA023:Object.freeze({currentConstructId:"POSTERIOR_LOWER_LEG_FUNCTIONAL_DEMAND_TENDENCY",sourceEndpoint:"total ankle-joint positive/negative mechanical work across stance/swing",compatibility:"JOINT_WORK_CONTEXT_ONLY",numericEligible:false,reason:"TOTAL_ANKLE_JOINT_WORK_DOES_NOT_ISOLATE_SOLEUS_GASTROCNEMIUS_OR_STANCE_PLANTARFLEXOR_COMPONENT_USED_BY_CURRENT_BA023_PROXY"})
});

const finite=x=>Number.isFinite(Number(x));
const near=(a,b,t=1e-9)=>Math.abs(Number(a)-Number(b))<=t;
export function assessR14LowSpeedJointWorkBridge({regionId="BA-DISP-014",speedMps=5000/(35*60),gradePercent=0,runSetting="OUTDOOR_ROUTE"}={}){
  const v=Number(speedMps),gp=Number(gradePercent), level=near(gp,0), treadmill=runSetting==="TREADMILL";
  const speeds=JIN_HAHN_2019_BA024_LOW_SPEED_ANKLE_WORK_R14.runningSpeedsMps;
  const inRange=finite(v)&&v>=speeds[0]&&v<=speeds.at(-1);
  const knot=inRange&&speeds.some(x=>near(x,v));
  let state="EVIDENCE_GAP", sourceContext=null, bridgeState="NO_R14_ACTIVE_NUMERIC_BRIDGE";
  if(regionId==="BA-DISP-014"){
    if(treadmill&&level&&inRange){state=knot?"SOURCE_KNOT_PROTOCOL_CONTEXT_ONLY":"WITHIN_SOURCE_SPEED_RANGE_PROTOCOL_CONTEXT_ONLY";bridgeState="EVIDENCE_GAP_CADENCE_AND_PROTOCOL_BRIDGE";sourceContext=Object.freeze({sourceId:"SRC-A6-R13-002",cadenceBridgeResolved:false});}
  } else if(regionId==="BA-DISP-024"){
    if(treadmill&&level&&inRange){state=knot?"SOURCE_KNOT_DIRECT_CONSTRUCT_CONTEXT_ONLY":"WITHIN_SOURCE_SPEED_RANGE_DIRECT_CONSTRUCT_CONTEXT_ONLY";bridgeState="EVIDENCE_GAP_CADENCE_POPULATION_AND_CENSORING_BRIDGE";sourceContext=Object.freeze({sourceId:JIN_HAHN_2019_BA024_LOW_SPEED_ANKLE_WORK_R14.sourceId,directConstructCandidate:true});}
  } else if(regionId==="BA-DISP-016"){
    if(treadmill&&level&&inRange){state="KNEE_JOINT_WORK_CONTEXT_ONLY_ENDPOINT_DECOMPOSITION_MISMATCH";bridgeState="EVIDENCE_GAP_REGION_COMPONENT_DECOMPOSITION";sourceContext=JIN_HAHN_2019_BA016_BA023_CONTEXT_R14.BA016;}
  } else if(regionId==="BA-DISP-023"){
    if(treadmill&&level&&inRange){state="ANKLE_JOINT_WORK_CONTEXT_ONLY_REGION_COMPONENT_MISMATCH";bridgeState="EVIDENCE_GAP_REGION_COMPONENT_DECOMPOSITION";sourceContext=JIN_HAHN_2019_BA016_BA023_CONTEXT_R14.BA023;}
  }
  return Object.freeze({regionId,speedMps:finite(v)?v:null,gradePercent:finite(gp)?gp:null,runSetting,state,sourceContext,bridgeState,numericEligible:false,numericRatio:null,activeNumericRoute:false,
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_INFER_JIN_SPEED_CELL_CADENCE_FROM_A_DIFFERENT_COHORT_SPEED_CADENCE_STUDY",
      "DO_NOT_TREAT_UNREPORTED_NATURAL_CADENCE_AS_CONSTANT_ACROSS_JIN_SPEEDS",
      "DO_NOT_ARBITRARILY_SELECT_OR_POOL_JIN_AGE_GROUPS_TO_FORCE_REFERENCE_100",
      "DO_NOT_REPLACE_LT_0_01_SWING_NEGATIVE_ANKLE_WORK_WITH_ZERO_OR_MIDPOINT_TO_FORCE_EXACT_TOTAL_WORK",
      "DO_NOT_USE_TOTAL_KNEE_WORK_AS_QUADRICEPS_SPECIFIC_BA016_MAGNITUDE",
      "DO_NOT_USE_TOTAL_ANKLE_WORK_AS_SOLEUS_GASTROCNEMIUS_SPECIFIC_BA023_MAGNITUDE",
      "DO_NOT_TRANSFER_LEVEL_TREADMILL_JOINT_WORK_TO_GRADE_OR_OUTDOOR_ROUTE",
      "DO_NOT_REPLACE_CURRENT_REFERENCE_100"
    ])});
}
