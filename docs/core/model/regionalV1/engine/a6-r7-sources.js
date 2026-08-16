// A6 R7 candidate-only environment/categorical evidence registry.
// R7 adds NO numeric magnitude to the regional model. It records why a directly relevant
// overground cumulative PFJS source still cannot be mapped to Current user inputs without
// inventing protocol equivalence (barefoot vs shod; instrument-verified strike vs self-report).

export const NISHIGUCHI_2025_OVERGROUND_FOOTSTRIKE_CUMULATIVE_SOURCE = Object.freeze({
  sourceId: "SRC-A6-R7-001",
  citation: "Nishiguchi H, Takabayashi T, Kikumoto T, Kubo M. Effects of Foot-Strike Patterns During Running on Cumulative Load of Achilles Tendon Force, Plantar Fascia Force, and Patellofemoral Joint Stress. J Sports Sci Med. 2025;24(4):747-754.",
  doi: "10.52082/jssm.2025.747",
  publicationType: "PRIMARY_OPEN_ACCESS_ORIGINAL_ARTICLE",
  participants: "20 healthy adult males; habitual runner status not required",
  runSetting: "OVERGROUND_LAB_RUNWAY",
  runwayLengthM: 15,
  gradePercent: 0,
  speedTargetKmh: 10,
  speedTolerancePercent: 5,
  speedTargetMps: 10/3.6,
  speedDomainMps: Object.freeze([(10*0.95)/3.6,(10*1.05)/3.6]),
  footwearProtocol: "BAREFOOT",
  footStrikeProtocol: "INSTRUCTED_AND_INSTRUMENTED_FSA_VERIFIED",
  footStrikeCategories: Object.freeze(["RFS","MFS","FFS"]),
  ba019: Object.freeze({
    regionId: "BA-DISP-019",
    currentConstructId: "PATELLOFEMORAL_CUMULATIVE_STRESS_IMPULSE_TENDENCY",
    sourceEndpoint: "patellofemoral joint stress impulse per mile",
    exposureBasis: "PFJS_TIME_INTEGRAL_PER_STEP_X_RIGHT_LEG_STEPS_PER_MILE",
    endpointExposureCompatibility: "DIRECT_CUMULATIVE_STRESS_ENDPOINT_MATCH_CANDIDATE",
  }),
  ba025: Object.freeze({
    regionId: "BA-DISP-025",
    currentConstructId: "ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",
    sourceEndpoint: "Achilles tendon force impulse per mile",
    exposureBasis: "AT_FORCE_TIME_INTEGRAL_PER_STEP_X_RIGHT_LEG_STEPS_PER_MILE",
    endpointExposureCompatibility: "CUMULATIVE_FORCE_NOT_CURRENT_STRAIN_ENDPOINT",
  }),
  currentInputProtocolCompatibility: "BLOCKED",
  numericEligible: false,
  limitations: Object.freeze([
    "Current shoeType has no explicit barefoot state; TRAINING, LIGHTWEIGHT, RACING, TRAIL, OTHER, and UNKNOWN must not be silently reinterpreted as BAREFOOT.",
    "Current foot placement is a user self-report. The source imposed strike conditions and verified foot-strike angle instrumentally, so categorical identity is not equivalent.",
    "The source speed domain is approximately 2.639-2.917 m/s; the original 5 km / 35 min case is approximately 2.381 m/s and is outside source speed range.",
    "The overground laboratory runway does not by itself validate a continuous outdoor-route transfer of the Hagen 2023 treadmill speed model.",
    "BA025 source outcome is cumulative Achilles force impulse, whereas Current BA025 is cumulative strain-impulse tendency; no force-to-strain substitution is allowed."
  ])
});

const EPS=1e-12;
const finite=x=>Number.isFinite(Number(x));
const inSpeedDomain=(source,speed)=>finite(speed)&&Number(speed)>=source.speedDomainMps[0]-EPS&&Number(speed)<=source.speedDomainMps[1]+EPS;

export function assessNishiguchi2025R7({
  regionId="BA-DISP-019",
  speedMps,
  gradePercent=0,
  runSetting="OUTDOOR_ROUTE",
  shoeType="UNKNOWN",
  footPlacement="UNKNOWN",
  footPlacementProvenance="SELF_REPORT",
}={}){
  const s=NISHIGUCHI_2025_OVERGROUND_FOOTSTRIKE_CUMULATIVE_SOURCE;
  const target=regionId===s.ba019.regionId?s.ba019:regionId===s.ba025.regionId?s.ba025:null;
  const checks={
    regionRegistered:Boolean(target),
    levelGrade:finite(gradePercent)&&Math.abs(Number(gradePercent))<=EPS,
    speedWithinSourceDomain:inSpeedDomain(s,speedMps),
    environmentClassOverground:runSetting==="OUTDOOR_ROUTE"||runSetting==="OVERGROUND_LAB_RUNWAY",
    explicitBarefootProtocol:shoeType==="BAREFOOT",
    sourceStrikeCategory:s.footStrikeCategories.includes(footPlacement),
    instrumentVerifiedStrike:footPlacementProvenance==="INSTRUMENTED_FSA_VERIFIED",
    currentAppCanRepresentBarefoot:false,
    currentAppStrikeProvenanceEquivalent:false,
  };
  if(!target)return {state:"NOT_APPLICABLE_REGION",numericEligible:false,sourceId:s.sourceId,checks};
  if(!checks.levelGrade)return {state:"OUT_OF_RANGE",reason:"NISHIGUCHI_LEVEL_PROTOCOL_HAS_NO_GRADE_AXIS",numericEligible:false,sourceId:s.sourceId,checks};
  if(!checks.speedWithinSourceDomain)return {state:"OUT_OF_RANGE",reason:"OUTSIDE_NISHIGUCHI_10KMH_PLUS_MINUS_5_PERCENT_DOMAIN",numericEligible:false,sourceId:s.sourceId,checks};
  if(!checks.environmentClassOverground)return {state:"OUT_OF_RANGE",reason:"NISHIGUCHI_IS_OVERGROUND_LAB_RUNWAY_NOT_TREADMILL",numericEligible:false,sourceId:s.sourceId,checks};
  if(regionId===s.ba025.regionId)return {state:"EVIDENCE_GAP",reason:"BA025_FORCE_IMPULSE_ENDPOINT_DOES_NOT_MATCH_CURRENT_STRAIN_IMPULSE_CONSTRUCT",geometryState:"SOURCE_PROTOCOL_CONDITION",numericEligible:false,numericRatio:null,sourceId:s.sourceId,checks,endpointCompatibility:s.ba025.endpointExposureCompatibility};
  if(!checks.explicitBarefootProtocol)return {state:"EVIDENCE_GAP",reason:"SOURCE_BAREFOOT_PROTOCOL_NOT_REPRESENTED_BY_CURRENT_SHOE_INPUT",geometryState:"SOURCE_PROTOCOL_CONDITION",numericEligible:false,numericRatio:null,sourceId:s.sourceId,checks,endpointCompatibility:s.ba019.endpointExposureCompatibility};
  if(!checks.sourceStrikeCategory)return {state:"EVIDENCE_GAP",reason:"SOURCE_FOOT_STRIKE_CATEGORY_NOT_MATCHED",geometryState:"SOURCE_PROTOCOL_CONDITION",numericEligible:false,numericRatio:null,sourceId:s.sourceId,checks,endpointCompatibility:s.ba019.endpointExposureCompatibility};
  if(!checks.instrumentVerifiedStrike)return {state:"EVIDENCE_GAP",reason:"SOURCE_INSTRUMENT_VERIFIED_STRIKE_NOT_EQUIVALENT_TO_CURRENT_SELF_REPORT",geometryState:"CATEGORICAL_MATCH_PROTOCOL_MISMATCH",numericEligible:false,numericRatio:null,sourceId:s.sourceId,checks,endpointCompatibility:s.ba019.endpointExposureCompatibility};
  return {state:"CATEGORICAL_MATCH_CONDITION_ONLY",reason:"DIRECT_CUMULATIVE_ENDPOINT_BUT_CURRENT_PROTOCOL_MAPPING_AND_REFERENCE_BRIDGE_NOT_ESTABLISHED",geometryState:"SOURCE_KNOT_CATEGORICAL_PROTOCOL",numericEligible:false,numericRatio:null,sourceId:s.sourceId,checks,endpointCompatibility:s.ba019.endpointExposureCompatibility};
}

export function assessR7OutdoorBA019TransferAtOriginalCase({speedMps=5000/(35*60)}={}){
  return Object.freeze({
    state:"MULTISOURCE_BOUNDED_TRANSFER_CANDIDATE_BLOCKED",
    reason:"NO_MULTI_SPEED_SAME_ENDPOINT_TREADMILL_OVERGROUND_BRIDGE_AT_OR_BELOW_ORIGINAL_SPEED",
    originalCaseSpeedMps:speedMps,
    hagenLowSpeedTreadmillDomainMps:Object.freeze([8/3.6,2.78]),
    willyEnvironmentComparisonApproxSpeedMps:2.9,
    nishiguchiOvergroundDomainMps:NISHIGUCHI_2025_OVERGROUND_FOOTSTRIKE_CUMULATIVE_SOURCE.speedDomainMps,
    numericEligible:false,
    numericRatio:null,
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_TRANSFER_HAGEN_TREADMILL_REGRESSION_TO_OUTDOOR_FROM_WILLY_SINGLE_PACE_COMPARISON",
      "DO_NOT_EXTRAPOLATE_NISHIGUCHI_BELOW_ITS_10KMH_PLUS_MINUS_5_PERCENT_DOMAIN",
      "DO_NOT_MAP_CURRENT_OTHER_SHOE_TO_BAREFOOT",
      "DO_NOT_TREAT_SELF_REPORTED_FOOT_PLACEMENT_AS_INSTRUMENT_VERIFIED_FSA",
      "DO_NOT_COMBINE_HAGEN_SPEED_AXIS_WITH_HO_GRADE_AXIS_INTO_A_CROSS_SOURCE_RECTANGLE"
    ])
  });
}
