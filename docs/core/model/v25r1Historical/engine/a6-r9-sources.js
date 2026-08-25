// A6 R9 candidate-only evidence closure registry.
// R9 adds NO numeric magnitude. It closes the current BA025 low-speed cumulative-strain search
// and opens BA029 low-speed forefoot pressure-time screening without merging incompatible subregions.

export const REITER_2024_BA025_LOW_SPEED_FORCE_SOURCE_R9 = Object.freeze({
  sourceId:"SRC-A6-R9-001", doi:"10.1249/MSS.0000000000003396", pmid:"38240495", pmcid:"PMC11096059",
  citation:"Reiter AJ, Martin JA, Knurr KA, Adamczyk PG, Thelen DG. Achilles Tendon Loading during Running Estimated Via Shear Wave Tensiometry: A Step Toward Wearable Kinetic Analysis. Med Sci Sports Exerc. 2024;56(6):1077-1084.",
  runSetting:"INSTRUMENTED_TREADMILL", speedsMps:Object.freeze([2.68,3.35,4.47]),
  endpoint:"Achilles tendon force estimated from shear-wave tensiometry; peak force increases with speed",
  beginnerPriorityOverlap:true, currentConstructId:"ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",
  endpointCompatibility:"LOW_SPEED_DIRECT_FORCE_ONLY_NOT_CUMULATIVE_STRAIN_IMPULSE", numericEligible:false
});

export const BAGGALEY_EDWARDS_2017_BA025_CUMULATIVE_FORCE_ABSTRACT_R9 = Object.freeze({
  sourceId:"SRC-A6-R9-002", doi:"10.1249/01.mss.0000517210.29165.6c",
  citation:"Baggaley M, Edwards WB. Effect of Running Speed on Achilles Tendon Injury Potential: Use of a Weighted Impulse Measure. Med Sci Sports Exerc. 2017;49(5S):139. Conference abstract.",
  publicationType:"CONFERENCE_ABSTRACT", reportedLowSpeedMentionMps:2.5,
  endpoint:"Achilles tendon traditional cumulative impulse and S-N weighted impulse per distance, force-based fatigue framing",
  fullPrimaryMethodsAndNumericTableSecured:false, currentConstructId:"ACHILLES_CUMULATIVE_STRAIN_IMPULSE_TENDENCY",
  endpointCompatibility:"CUMULATIVE_FORCE_IMPULSE_NEAR_MATCH_NOT_STRAIN_IMPULSE", numericEligible:false
});

export const HO_2010_BA029_LOW_SPEED_SUBREGION_SOURCE_R9 = Object.freeze({
  sourceId:"SRC-A6-R9-003", doi:"10.52082/jssm.2010.154",
  citation:"Ho IJ, Hou YY, Yang CH, Wu WL, Chen SK, Guo LY. Comparison of Plantar Pressure Distribution between Different Speed and Incline During Treadmill Jogging. J Sports Sci Med. 2010;9:154-160.",
  runSetting:"TREADMILL", levelSpeedsMps:Object.freeze([1.5,2.0,2.5]),
  forefootSegmentation:Object.freeze(["MEDIAL_FOREFOOT","CENTRAL_FOREFOOT","LATERAL_FOREFOOT"]),
  endpoint:"peak plantar pressure by separate plantar subregion", currentConstructId:"FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
  compositeForefootPressureTimeEndpoint:false, numericEligibleForBA029:false
});

export const FOURCHET_2012_BA029_FORCE_TIME_RELATIVE_LOAD_SOURCE_R9 = Object.freeze({
  sourceId:"SRC-A6-R9-004", doi:"10.1016/j.gaitpost.2011.12.004", pmid:"22205042",
  citation:"Fourchet F, Kelly L, Horobeanu C, Loepelt H, Taiar R, Millet GP. Comparison of plantar pressure distribution in adolescent runners at low vs high running velocity. Gait Posture. 2012;35(4):685-687.",
  participants:"11 highly trained adolescent runners", joggingSpeedKmhMean:11.2, joggingSpeedKmhSd:0.9,
  joggingSpeedMpsMean:11.2/3.6, runningSpeedKmhMean:17.8,
  endpoint:"regional relative load = regional force-time integral divided by total plantar force-time integral",
  forefootSegmentation:Object.freeze(["MEDIAL_FOREFOOT","CENTRAL_FOREFOOT","LESSER_TOES"]),
  currentConstructId:"FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
  absoluteCompositePressureTimeEndpoint:false, numericEligible:false
});

export const HORIGUCHI_2025_BA029_COMPOSITE_FOREFOOT_SOURCE_R9 = Object.freeze({
  sourceId:"SRC-A6-R9-005", doi:"10.3389/fspor.2025.1654489",
  citation:"Horiguchi Y, Noro H, Hata K, Yamazaki Y, Kubota A, Yanagiya T. Effects of the difference foot strike pattern on the plantar pressure during uphill and downhill running. Front Sports Act Living. 2025;7:1654489.",
  participants:"11 healthy male participants", runSetting:"TREADMILL", speedMps:3.33, slopesDeg:Object.freeze([-6,0,6]),
  footStrikePatterns:Object.freeze(["RFS","FFS"]), regions:Object.freeze(["HEEL","MIDFOOT","FOREFOOT"]),
  endpoints:Object.freeze(["PEAK_PRESSURE","PEAK_FORCE","TIME_TO_PEAK","LOADING_RATE"]),
  currentConstructId:"FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",
  compositeForefootRegionDirect:true, cumulativePressureTimeEndpoint:false, beginnerPriorityOverlap:false, numericEligible:false
});

const finite=x=>Number.isFinite(Number(x));
export function assessR9BA025LowSpeedCumulativeStrainGap({speedMps=5000/(35*60)}={}){
  const v=Number(speedMps), re=REITER_2024_BA025_LOW_SPEED_FORCE_SOURCE_R9, ba=BAGGALEY_EDWARDS_2017_BA025_CUMULATIVE_FORCE_ABSTRACT_R9;
  return Object.freeze({
    state:"EVIDENCE_GAP", reason:"NO_PRIMARY_FULL_METHOD_LOW_SPEED_CUMULATIVE_STRAIN_IMPULSE_ROUTE_IDENTIFIED",
    speedMps:finite(v)?v:null, reiterSpeedCovered:finite(v)&&v>=re.speedsMps[0]&&v<=re.speedsMps.at(-1),
    baggaleyLowSpeedMentionMps:ba.reportedLowSpeedMentionMps, numericEligible:false,numericRatio:null,
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_CONVERT_REITER_ACHILLES_FORCE_TO_CURRENT_STRAIN_IMPULSE_WITHOUT_SOURCE_STRAIN_TIME_INTEGRAL_AND_DISTANCE_EXPOSURE",
      "DO_NOT_USE_BAGGALEY_CONFERENCE_ABSTRACT_AS_A_FULL_NUMERIC_SOURCE_CURVE",
      "DO_NOT_SUBSTITUTE_CUMULATIVE_FORCE_IMPULSE_FOR_CUMULATIVE_STRAIN_IMPULSE",
      "DO_NOT_JOIN_REITER_BAGGALEY_ERTMAN_FIRMINGER_ONLY_BECAUSE_SPEED_DOMAINS_OVERLAP"
    ])
  });
}

export function assessR9BA029LowSpeedForefootGap({speedMps=5000/(35*60)}={}){
  const v=Number(speedMps), ho=HO_2010_BA029_LOW_SPEED_SUBREGION_SOURCE_R9, fo=FOURCHET_2012_BA029_FORCE_TIME_RELATIVE_LOAD_SOURCE_R9, hi=HORIGUCHI_2025_BA029_COMPOSITE_FOREFOOT_SOURCE_R9;
  const inHo=finite(v)&&v>=ho.levelSpeedsMps[0]&&v<=ho.levelSpeedsMps.at(-1);
  return Object.freeze({
    state:"EVIDENCE_GAP", reason:"NO_LOW_SPEED_COMPOSITE_FOREFOOT_CUMULATIVE_PRESSURE_TIME_ENDPOINT_IDENTIFIED",
    speedMps:finite(v)?v:null, withinHoLowSpeedDomain:inHo, fourchetJogMeanMps:fo.joggingSpeedMpsMean, horiguchiSpeedMps:hi.speedMps,
    numericEligible:false,numericRatio:null,
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_AVERAGE_HO_MEDIAL_CENTRAL_LATERAL_FOREFOOT_TO_CREATE_BA029",
      "DO_NOT_TREAT_HO_PEAK_PRESSURE_AS_PRESSURE_TIME_INTEGRAL",
      "DO_NOT_TREAT_FOURCHET_RELATIVE_FORCE_TIME_LOAD_AS_ABSOLUTE_COMPOSITE_PRESSURE_TIME_EXPOSURE",
      "DO_NOT_TREAT_FOURCHET_MEAN_PLUS_MINUS_SD_AS_A_VALIDATED_SPEED_RANGE",
      "DO_NOT_EXTRAPOLATE_HORIGUCHI_3_33_MPS_COMPOSITE_FOREFOOT_RESULTS_TO_2_381_MPS"
    ])
  });
}
