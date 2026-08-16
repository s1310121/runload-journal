// A6 R10 candidate-only BA018 posterior-thigh evidence registry.
// R10 adds NO numeric magnitude. It records low-speed speed×grade EMG geometry
// while explicitly preventing synergy/peak-EMG evidence from being converted into
// a new posterior-thigh numerical coefficient without a source-reported magnitude bridge.

export const SAITO_2018_BA018_SPEED_GRADE_EMG_SOURCE_R10 = Object.freeze({
  sourceId:"SRC-A6-R10-001",
  doi:"10.1038/s41598-018-24332-z",
  citation:"Saito A, Tomita A, Ando R, Watanabe K, Akima H. Muscle synergies are consistent across level and uphill treadmill running. Sci Rep. 2018;8:5979.",
  publicationType:"OPEN_ACCESS_PRIMARY_ARTICLE",
  license:"CC_BY_4_0",
  participants:"8 adults (7 men, 1 woman)",
  runSetting:"TREADMILL",
  speedsMps:Object.freeze([2.5,3.3,4.1]),
  gradesPercent:Object.freeze([0,10]),
  exactConditionCount:6,
  muscles:Object.freeze(["BICEPS_FEMORIS_LONG_HEAD","SEMIMEMBRANOSUS"]),
  endpoint:"surface-EMG envelopes normalized to each muscle's maximum across all tested speeds and inclinations; peak EMG amplitude and muscle-synergy structure",
  currentConstructId:"POSTERIOR_THIGH_MUSCLE_DEMAND_TENDENCY",
  beginnerPriorityOverlap:true,
  directPosteriorThighMusclesMeasured:true,
  sameStudySpeedGradeFactorial:true,
  sourceReportsNumericHamstringRatioTable:false,
  sourceReportsPublishedContinuousHamstringModel:false,
  sourceResultSummary:Object.freeze({
    speedDirection:"peak EMG increased significantly with increasing speed for each condition for recorded lower-limb muscles except medial gastrocnemius during uphill and tibialis anterior under both conditions",
    gradeMagnitude:"the article reports significant uphill-vs-level peak-EMG differences for vastus medialis at each speed and vastus intermedius at 4.1 m/s; no source-tabulated BA018 hamstring grade ratio is provided",
    synergyInterpretation:"hamstring-containing synergy structure and timing remained broadly similar across speeds and level/uphill conditions"
  }),
  numericEligible:false,
  numericEligibilityReason:"CONDITION_GEOMETRY_AND_DIRECTION_ONLY_NO_SOURCE_REPORTED_BA018_MAGNITUDE_BRIDGE"
});

const finite=x=>Number.isFinite(Number(x));
const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t;

export function assessR10BA018PosteriorThighEvidence({speedMps=5000/(35*60),gradePercent=0,runSetting="OUTDOOR_ROUTE"}={}){
  const s=SAITO_2018_BA018_SPEED_GRADE_EMG_SOURCE_R10;
  const v=Number(speedMps),g=Number(gradePercent);
  const exactSpeed=finite(v)?s.speedsMps.find(x=>near(x,v)):undefined;
  const exactGrade=finite(g)?s.gradesPercent.find(x=>near(x,g)):undefined;
  const exactSourceKnot=runSetting==="TREADMILL"&&exactSpeed!==undefined&&exactGrade!==undefined;
  const speedWithin=finite(v)&&v>=s.speedsMps[0]&&v<=s.speedsMps.at(-1);
  const gradeWithin=finite(g)&&g>=s.gradesPercent[0]&&g<=s.gradesPercent.at(-1);
  const state=exactSourceKnot?"SOURCE_KNOT_CONDITION_ONLY":"EVIDENCE_GAP";
  return Object.freeze({
    state,
    speedMps:finite(v)?v:null,
    gradePercent:finite(g)?g:null,
    runSetting,
    exactSourceKnot,
    speedWithinSourceEnvelope:speedWithin,
    gradeWithinSourceEnvelope:gradeWithin,
    beginnerPriorityOverlap:finite(v)&&v>=1.8&&v<=3.0,
    endpointCompatibility:"DIRECT_POSTERIOR_THIGH_EMG_PROXY_BUT_NO_NUMERIC_REFERENCE_BRIDGE",
    numericEligible:false,
    numericRatio:null,
    reason:exactSourceKnot?"EXACT_SPEED_GRADE_PROTOCOL_MEASURED_BUT_HAMSTRING_MAGNITUDE_NOT_TABULATED_FOR_CURRENT_REFERENCE":"NO_SUPPORTED_NUMERIC_BA018_ROUTE_AT_REQUESTED_CONDITION",
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_TREAT_SYNERGY_SIMILARITY_AS_EMG_MAGNITUDE_RATIO",
      "DO_NOT_TREAT_NON_SIGNIFICANT_HAMSTRING_GRADE_DIFFERENCE_AS_RATIO_ONE",
      "DO_NOT_INTERPOLATE_A_NUMERIC_2D_SURFACE_FROM_CONDITION_GEOMETRY_WITHOUT_HAMSTRING_MAGNITUDES",
      "DO_NOT_EXTRAPOLATE_BELOW_2_5_MPS",
      "DO_NOT_BRIDGE_SAITO_NORMALIZED_EMG_TO_WILLER_MECHANICAL_WORK_REFERENCE_100_WITHOUT_COMMON_NUMERIC_CALIBRATION",
      "DO_NOT_REUSE_CHUMANOV_MEDIAL_LATERAL_EQUAL_WEIGHT_AGGREGATION_ACROSS_DIFFERENT_PHASE_NORMALIZATION_PROTOCOLS"
    ])
  });
}
