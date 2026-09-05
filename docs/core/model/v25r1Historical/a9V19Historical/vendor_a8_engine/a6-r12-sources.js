// A6 R12 candidate-only BA015 gluteal evidence registry.
// R12 adds NO numeric magnitude or route. It separates low-speed direct gluteal
// evidence geometry from the existing Current proxy magnitudes (Hamner COM
// contribution and Nuckols hip joint power) and fixes the remaining numeric
// bridge as an evidence gap.

export const WALL_SCHEFFLER_2010_BA015_LOW_SPEED_FACTORIAL_GLUTEAL_EMG_SOURCE_R12 = Object.freeze({
  sourceId:"SRC-A6-R12-001",
  doi:"10.1002/ajpa.21356",
  citation:"Wall-Scheffler CM, Chumanov E, Steudel-Numbers K, Heiderscheit B. EMG activity across gait and incline: The impact of muscular activity on human morphology. Am J Phys Anthropol. 2010;143(4):601-611.",
  publicationType:"PRIMARY_ARTICLE_PMC_AUTHOR_MANUSCRIPT",
  pmcid:"PMC3011859",
  participants:"34 adults (17 women, 17 men); reduced subset for the highest-intensity running cell",
  runSetting:"TREADMILL",
  runningSpeedsMps:Object.freeze([1.8,2.7,3.6]),
  gradesPercent:Object.freeze([0,10,15,20]),
  protocolCellCount:12,
  beginnerPriorityCellCount:8,
  muscles:Object.freeze(["GLUTEUS_MAXIMUS","GLUTEUS_MEDIUS"]),
  endpoint:"integrated surface EMG normalized to each muscle's mean activity during 1.2 m/s level walking",
  currentConstructId:"GLUTEAL_FUNCTIONAL_DEMAND_TENDENCY",
  sameStudyIndependentSpeedGradeDesign:true,
  sourceReportsCellwiseNumericGlutealTable:false,
  sourceReportsPublishedContinuousGlutealMagnitudeModel:false,
  numericEligible:false,
  numericEligibilityReason:"DIRECT_LOW_SPEED_INDEPENDENT_SPEED_GRADE_GLUTEAL_EMG_GEOMETRY_BUT_NO_REPRODUCIBLE_CELLWISE_MAGNITUDE_OR_CURRENT_PROXY_REFERENCE_BRIDGE"
});

export const ENGELER_2025_BA015_PAIRED_GRADE_GLUTEAL_EMG_SOURCE_R12 = Object.freeze({
  sourceId:"SRC-A6-R12-002",
  doi:"10.26603/001c.142485",
  citation:"Engeler N, Lichtenstein E, Faude O, Roth R. How Downhill and Uphill Running Interfere Posture and Muscle Activity: A Descriptive Laboratory Study. Int J Sports Phys Ther. 2025;20(8):1186-1197.",
  publicationType:"OPEN_ACCESS_PRIMARY_ARTICLE",
  participants:"12 healthy recreational runners (6 women, 6 men)",
  runSetting:"TREADMILL",
  gradesPercent:Object.freeze([-15,-10,-5,0,5,10,15]),
  groupMeanSpeedsKmh:Object.freeze([13.5,12.9,12.3,11.0,8.2,6.5,5.4]),
  groupMeanSpeedsMps:Object.freeze([3.75,3.5833333333333335,3.4166666666666665,3.0555555555555554,2.2777777777777777,1.8055555555555556,1.5]),
  gluteusMaximusMeanPercentMVIC:Object.freeze([62.0,66.4,56.1,58.5,65.4,71.2,64.8]),
  gluteusMediusMeanPercentMVIC:Object.freeze([55.8,61.7,59.3,53.5,54.6,55.5,62.4]),
  endpoint:"average stance-phase surface EMG normalized to maximum voluntary isometric contraction",
  currentConstructId:"GLUTEAL_FUNCTIONAL_DEMAND_TENDENCY",
  speedGradeProtocol:"PAIRED_BY_PERFORMANCE_EQUIVALENCE; speed changes systematically with grade and is individualized from 10-km performance",
  independentSpeedGradeDesign:false,
  sourceReportsNumericGlutealTable:true,
  beginnerPriorityOverlap:true,
  numericEligible:false,
  numericEligibilityReason:"DIRECT_NUMERIC_GLUTEAL_EMG_IN_BEGINNER_SPEED_CONTEXT_BUT_SPEED_AND_GRADE_ARE_PAIRED_NOT_INDEPENDENT_AND_ENDPOINT_SCALE_DOES_NOT_CALIBRATE_TO_CURRENT_HAMNER_NUCKOLS_PROXY_REFERENCE"
});

export const CURRENT_BA015_PROXY_FAMILY_R12 = Object.freeze({
  constructId:"GLUTEAL_FUNCTIONAL_DEMAND_TENDENCY",
  currentReferenceIndex:100,
  levelSpeedProxy:Object.freeze({sourceId:"E02",endpoint:"gluteus maximus peak upward COM-acceleration contribution",referenceSpeedMps:2.78,coverage:"PARTIAL_FIGURE_DIGITIZED"}),
  gradeProxy:Object.freeze({sourceId:"SRC-SUP-003",endpoint:"hip total absolute joint mechanical power used as gluteal functional-demand proxy",sourceSpeedMps:2.25,referenceGradeDegrees:0,coverage:"PARTIAL_PROXY"}),
  a6BoundedTransfer:Object.freeze({routeId:"A6_NUCKOLS_BOUNDED_GRADE_TRANSFER",status:"RETIRED_R19",numericRuntimeEligible:false,historicalSpeedEnvelopeMps:Object.freeze([1.8,2.5]),coverage:"HISTORICAL_ONLY"}),
  sourceProtocolGradeProxy:Object.freeze({routeId:"A6_NUCKOLS_SOURCE_PROTOCOL_PROXY",sourceId:"SRC-SUP-003",sourceSpeedMps:2.25,runSetting:"TREADMILL",coverage:"PARTIAL_PROXY"}),
  directGlutealForceReferenceAvailable:false,
  directGlutealEMGReferenceAvailable:false
});

const finite=x=>Number.isFinite(Number(x));
const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t;

export function assessR12BA015GlutealEvidence({speedMps=5000/(35*60),gradePercent=0,runSetting="OUTDOOR_ROUTE"}={}){
  const w=WALL_SCHEFFLER_2010_BA015_LOW_SPEED_FACTORIAL_GLUTEAL_EMG_SOURCE_R12;
  const e=ENGELER_2025_BA015_PAIRED_GRADE_GLUTEAL_EMG_SOURCE_R12;
  const v=Number(speedMps),g=Number(gradePercent);
  const wallSpeed=finite(v)?w.runningSpeedsMps.find(x=>near(x,v)):undefined;
  const wallGrade=finite(g)?w.gradesPercent.find(x=>near(x,g)):undefined;
  const wallKnot=runSetting==="TREADMILL"&&wallSpeed!==undefined&&wallGrade!==undefined;
  const engelerGradeIndex=finite(g)?e.gradesPercent.findIndex(x=>near(x,g)):-1;
  const engelerContext=runSetting==="TREADMILL"&&engelerGradeIndex>=0?Object.freeze({
    sourceId:e.sourceId,
    gradePercent:e.gradesPercent[engelerGradeIndex],
    groupMeanSpeedMps:e.groupMeanSpeedsMps[engelerGradeIndex],
    gluteusMaximusMeanPercentMVIC:e.gluteusMaximusMeanPercentMVIC[engelerGradeIndex],
    gluteusMediusMeanPercentMVIC:e.gluteusMediusMeanPercentMVIC[engelerGradeIndex],
    conditionClass:"PAIRED_PROTOCOL_GROUP_MEAN_CONTEXT_ONLY"
  }):null;
  return Object.freeze({
    state:wallKnot?"SOURCE_KNOT_CONDITION_ONLY":engelerContext?"PAIRED_PROTOCOL_CONTEXT_ONLY":"EVIDENCE_GAP",
    speedMps:finite(v)?v:null,
    gradePercent:finite(g)?g:null,
    runSetting,
    wallSchefflerExactCondition:wallKnot,
    engelerContext,
    independentLowSpeedSpeedGradeGeometryAvailable:true,
    directNumericLowSpeedGlutealEMGContextAvailable:true,
    numericEligible:false,
    numericRatio:null,
    referenceBridgeState:"EVIDENCE_GAP_NUMERIC_BRIDGE",
    reason:wallKnot?"DIRECT_GLUTEAL_EMG_FACTORIAL_CONDITION_EXISTS_BUT_NO_REPRODUCIBLE_CURRENT_PROXY_MAGNITUDE_BRIDGE":engelerContext?"NUMERIC_GLUTEAL_EMG_CONTEXT_EXISTS_BUT_SPEED_AND_GRADE_ARE_PAIRED_AND_NOT_A_CURRENT_REFERENCE_RATIO":"NO_R12_DIRECT_NUMERIC_GLUTEAL_REFERENCE_BRIDGE_AT_REQUESTED_CONDITION",
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_DIGITIZE_WALL_SCHEFFLER_FIGURES_TO_CREATE_NEW_BA015_MAGNITUDES",
      "DO_NOT_TREAT_WALKING_NORMALIZED_EMG_AS_HAMNER_COM_ACCELERATION_RATIO",
      "DO_NOT_TREAT_MVIC_NORMALIZED_EMG_AS_NUCKOLS_HIP_POWER_RATIO",
      "DO_NOT_TREAT_ENGELER_GROUP_MEAN_SPEED_AS_AN_INDIVIDUAL_SOURCE_KNOT",
      "DO_NOT_SEPARATE_ENGELER_GRADE_EFFECT_FROM_ITS_INTENTIONALLY_CHANGED_SPEED",
      "DO_NOT_BUILD_A_2D_NUMERIC_SURFACE_FROM_WALL_SCHEFFLER_GEOMETRY_WITHOUT_CELLWISE_MAGNITUDES",
      "DO_NOT_CROSS_CALIBRATE_WALL_SCHEFFLER_AND_ENGELER_EMG_NORMALIZATIONS",
      "DO_NOT_REPLACE_CURRENT_REFERENCE_100_WITH_A_GLUTEAL_EMG_BASELINE",
      "DO_NOT_TRANSFER_TREADMILL_GLUTEAL_EMG_MAGNITUDES_TO_OUTDOOR_ROUTE_WITHOUT_ENVIRONMENT_BRIDGE"
    ])
  });
}
