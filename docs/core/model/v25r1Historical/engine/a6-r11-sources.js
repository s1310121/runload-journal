// A6 R11 candidate-only BA018 posterior-thigh evidence registry.
// R11 adds NO numeric magnitude. It closes the low-speed BA018 numeric bridge as
// EVIDENCE_GAP after locating independent low-speed speed×grade hamstring EMG
// geometry, but no source-reported magnitude/reference bridge to the Current
// Willer swing-phase negative knee-flexion-work Reference 100.

export const WALL_SCHEFFLER_2010_BA018_LOW_SPEED_FACTORIAL_EMG_SOURCE_R11 = Object.freeze({
  sourceId:"SRC-A6-R11-001",
  doi:"10.1002/ajpa.21356",
  citation:"Wall-Scheffler CM, Chumanov E, Steudel-Numbers K, Heiderscheit B. EMG activity across gait and incline: The impact of muscular activity on human morphology. Am J Phys Anthropol. 2010;143(4):601-611.",
  publicationType:"PRIMARY_ARTICLE_PMC_AUTHOR_MANUSCRIPT",
  pmcid:"PMC3011859",
  participants:"34 adults (17 women, 17 men); reduced subset N=18 for the 3.6 m/s x 20% running analysis",
  runSetting:"TREADMILL",
  runningSpeedsMps:Object.freeze([1.8,2.7,3.6]),
  gradesPercent:Object.freeze([0,10,15,20]),
  protocolCellCount:12,
  fullSampleBeginnerPriorityCells:8,
  muscles:Object.freeze(["BICEPS_FEMORIS","MEDIAL_HAMSTRINGS_SEMITENDINOSUS_SEMIMEMBRANOSUS_GROUP"]),
  endpoint:"integrated surface EMG (rectified/filtered time integral) normalized to each muscle's mean activity during 1.2 m/s level walking",
  currentConstructId:"POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
  sameStudyIndependentSpeedGradeDesign:true,
  beginnerPriorityOverlap:true,
  sourceReportsCellwiseNumericHamstringTable:false,
  sourceReportsPublishedContinuousHamstringMagnitudeModel:false,
  numericEligible:false,
  numericEligibilityReason:"DIRECT_LOW_SPEED_SPEED_GRADE_HAMSTRING_EMG_GEOMETRY_BUT_NO_CELLWISE_MAGNITUDE_OR_WORK_REFERENCE_BRIDGE"
});

export const JENSEN_2015_BA018_LOW_SPEED_FACTORIAL_EMG_SOURCE_R11 = Object.freeze({
  sourceId:"SRC-A6-R11-002",
  citation:"Jensen RL, Leissring SK, Stephenson ML. Effect of running speed and surface inclination on muscle activation during treadmill running by women. 33rd International Conference of Biomechanics in Sports. 2015.",
  publicationType:"PRIMARY_CONFERENCE_PROCEEDING",
  participants:"15 female university runners",
  runSetting:"TREADMILL",
  runningSpeedsMps:Object.freeze([1.79,2.24,2.68]),
  gradesPercent:Object.freeze([0,10,15]),
  protocolCellCount:9,
  endpoint:"surface EMG normalized to maximal voluntary isometric contraction; figure-reported muscle activation",
  posteriorThighEvidence:"biceps femoris plus a medial hamstring channel; source labeling is not sufficiently consistent for Current muscle-specific numeric mapping",
  currentConstructId:"POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
  sameStudyIndependentSpeedGradeDesign:true,
  beginnerPriorityOverlap:true,
  sourceReportsCellwiseNumericHamstringTable:false,
  journalFullArticle:false,
  numericEligible:false,
  numericEligibilityReason:"LOW_SPEED_CORROBORATING_FACTORIAL_EMG_ONLY_CONFERENCE_FIGURE_NO_REPRODUCIBLE_CELLWISE_CURRENT_RATIO"
});

export const ROBINSON_2025_BA018_MECHANICAL_WORK_SOURCE_R11 = Object.freeze({
  sourceId:"SRC-A6-R11-003",
  doi:"10.1038/s41598-025-09968-y",
  citation:"Robinson RM, Donahue SR, Chebbi A, et al. Biomechanical strategies to achieve faster running speeds on level ground, uphill and downhill grades. Sci Rep. 2025;15:33917.",
  publicationType:"OPEN_ACCESS_PRIMARY_ARTICLE",
  participants:"12 recreational runners",
  runSetting:"INSTRUMENTED_TREADMILL",
  gradesDegrees:Object.freeze([-7.5,0,7.5]),
  meanSpeedsMps:Object.freeze([3.23,3.44,3.68]),
  speedsIndividualizedTo5kPace:true,
  endpoint:"sagittal-plane swing-phase negative knee joint work from inverse dynamics",
  currentConstructId:"POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
  proxyFamilyCompatibility:"HIGH_WITH_EXISTING_WILLER_SWING_NEGATIVE_KNEE_WORK_PROXY",
  beginnerPriorityOverlap:false,
  sourceReportsGradeSpecificSpeedIncrement:Object.freeze({levelJkgPerInterval:0.065,uphillJkgPerInterval:0.103,downhillJkgPerInterval:0.051}),
  numericEligibleForR11LowSpeedGap:false,
  numericEligibilityReason:"MECHANICAL_WORK_PROXY_COMPATIBLE_BUT_STUDIED_SPEEDS_ARE_ABOVE_R11_LOW_SPEED_GAP_AND_SPEEDS_ARE_INDIVIDUALIZED"
});

const finite=x=>Number.isFinite(Number(x));
const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t;

export function assessR11BA018LowSpeedEvidence({speedMps=5000/(35*60),gradePercent=0,runSetting="OUTDOOR_ROUTE"}={}){
  const w=WALL_SCHEFFLER_2010_BA018_LOW_SPEED_FACTORIAL_EMG_SOURCE_R11;
  const j=JENSEN_2015_BA018_LOW_SPEED_FACTORIAL_EMG_SOURCE_R11;
  const v=Number(speedMps),g=Number(gradePercent);
  const wallSpeed=finite(v)?w.runningSpeedsMps.find(x=>near(x,v)):undefined;
  const wallGrade=finite(g)?w.gradesPercent.find(x=>near(x,g)):undefined;
  const jensenSpeed=finite(v)?j.runningSpeedsMps.find(x=>near(x,v)):undefined;
  const jensenGrade=finite(g)?j.gradesPercent.find(x=>near(x,g)):undefined;
  const wallKnot=runSetting==="TREADMILL"&&wallSpeed!==undefined&&wallGrade!==undefined;
  const jensenKnot=runSetting==="TREADMILL"&&jensenSpeed!==undefined&&jensenGrade!==undefined;
  const exactConditionSources=Object.freeze([...(wallKnot?[w.sourceId]:[]),...(jensenKnot?[j.sourceId]:[])]);
  return Object.freeze({
    state:exactConditionSources.length?"SOURCE_KNOT_CONDITION_ONLY":"EVIDENCE_GAP",
    speedMps:finite(v)?v:null,
    gradePercent:finite(g)?g:null,
    runSetting,
    exactConditionSources,
    independentLowSpeedSpeedGradeGeometryAvailable:true,
    mechanicalWorkProxyCorroborationAboveGap:true,
    numericEligible:false,
    numericRatio:null,
    referenceBridgeState:"EVIDENCE_GAP_NUMERIC_BRIDGE",
    reason:exactConditionSources.length?"EXACT_LOW_SPEED_SPEED_GRADE_HAMSTRING_EMG_PROTOCOL_EXISTS_BUT_NO_REPRODUCIBLE_CURRENT_REFERENCE_MAGNITUDE":"NO_SUPPORTED_NUMERIC_BA018_ROUTE_AT_REQUESTED_CONDITION",
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_DIGITIZE_FIGURE_BARS_TO_CREATE_A_NEW_BA018_NUMERIC_SURFACE",
      "DO_NOT_TREAT_WALKING_NORMALIZED_INTEGRATED_EMG_AS_WILLER_MECHANICAL_WORK_RATIO",
      "DO_NOT_TREAT_MVIC_NORMALIZED_CONFERENCE_EMG_AS_CURRENT_REFERENCE_100",
      "DO_NOT_AVERAGE_BICEPS_FEMORIS_AND_MEDIAL_HAMSTRING_CHANNELS_WITHOUT_SOURCE_DEFINED_AGGREGATION",
      "DO_NOT_INTERPOLATE_A_NUMERIC_2D_SURFACE_FROM_FACTORIAL_CONDITION_GEOMETRY_WITHOUT_CELLWISE_MAGNITUDES",
      "DO_NOT_EXTRAPOLATE_ROBINSON_2025_MECHANICAL_WORK_BELOW_ITS_STUDIED_SPEEDS",
      "DO_NOT_USE_MEAN_INDIVIDUALIZED_SPEEDS_AS_UNIVERSAL_SOURCE_KNOTS",
      "DO_NOT_TRANSFER_TREADMILL_EMG_MAGNITUDES_TO_OUTDOOR_ROUTE_WITHOUT_ENVIRONMENT_BRIDGE"
    ])
  });
}
