// A6 R8 candidate-only evidence closure registry.
// R8 adds NO numeric magnitude. It closes the current BA019 low-speed outdoor search
// and makes the BA025 low-speed cumulative-strain bridge conditions explicit.

export const WILLY_2016_BA019_SINGLE_PACE_ENVIRONMENT_SOURCE_R8 = Object.freeze({
  sourceId:"SRC-A6-R8-001", doi:"10.2519/jospt.2016.6494",
  citation:"Willy RW, Halsey L, Hayek A, Johnson H, Willson JD. Patellofemoral Joint and Achilles Tendon Loads During Overground and Treadmill Running. J Orthop Sports Phys Ther. 2016;46(8):664-672.",
  participants:"18 recreational runners", endpoint:"estimated cumulative patellofemoral joint stress per 1 km",
  environments:Object.freeze(["TREADMILL","OVERGROUND"]), speedProtocol:"SELF_SELECTED_NORMAL_ENDURANCE_TRAINING_PACE", reportedMeanSpeedMps:2.9,
  designGeometry:"PAIRED_ENVIRONMENT_COMPARISON_AT_ONE_SELF_SELECTED_PACE", numericTransferAcrossSpeedEligible:false,
  resultSummary:"No significant environment difference for cumulative PFJ stress/km; strong relationship, but no multi-speed environment surface."
});

export const MESTELLE_2017_BA019_SHOD_OVERGROUND_SOURCE_R8 = Object.freeze({
  sourceId:"SRC-A6-R8-002", pmid:"29181248", citation:"Mestelle Z, Kernozek T, Adkins KS, Miller J, Gheidi N. Effect of Heel Lifts on Patellofemoral Joint Stress During Running. Int J Sports Phys Ther. 2017;12(5):711-717.",
  participants:"16 healthy female runners", runSetting:"OVERGROUND_LAB_RUNWAY", footwear:"STANDARD_RUNNING_SHOE", speedMps:3.46, speedTolerancePercent:2.5,
  endpoint:"patellofemoral stress time integral per stance; one-km cumulative implication calculated from step length", numericEligibleForOriginalCase:false,
  limitations:Object.freeze(["Single speed only","Speed is above A6 beginner priority band","Heel-lift intervention study does not establish a speed transfer function"])
});

export const FIRMINGER_2020_BA025_EXACT_SPEED_SOURCE_R8 = Object.freeze({
  sourceId:"SRC-A6-R8-003", doi:"10.1249/MSS.0000000000002287",
  citation:"Firminger CR, Asmussen MJ, Cigoja S, Fletcher JR, Nigg BM, Edwards WB. Cumulative Metrics of Tendon Load and Damage Vary Discordantly with Running Speed. Med Sci Sports Exerc. 2020;52(7):1549-1556.",
  participants:"13 male recreational runners", runSetting:"TREADMILL", footwear:"Nike Free 5.0",
  speedsMps:Object.freeze([3.5,4.5,5.5]), endpoint:"Achilles tendon cumulative strain load = stance-phase strain time integral x strides per km",
  endpointCompatibility:"DIRECT_CUMULATIVE_STRAIN_METHOD_MATCH", beginnerPriorityOverlap:false, numericEligibleForBeginnerExtension:false
});

export const ERTMAN_2023_BA025_LOW_SPEED_PER_STEP_SOURCE_R8 = Object.freeze({
  sourceId:"SRC-A6-R8-004", doi:"10.1080/02640414.2023.2225015",
  citation:"Ertman B, Klaeser M, Voie L, Gheidi N, Vannatta CN, Rutherford D, Kernozek TW. Alterations in Achilles tendon stress and strain across a range of running velocities. J Sports Sci. 2023;41(5):495-501.",
  participants:"22 female participants", runSetting:"INSTRUMENTED_TREADMILL", speedDomainMps:Object.freeze([2.0,5.0]),
  endpoint:"Achilles tendon stress and strain; cadence and running kinematics", lowSpeedOverlap:true,
  cumulativePerDistanceStrainImpulseReportedAsSourceEndpoint:false, numericEligibleForCurrentBA025:false
});

const finite=x=>Number.isFinite(Number(x));
export function assessR8BA019OutdoorBridge({speedMps=5000/(35*60),runSetting="OUTDOOR_ROUTE"}={}){
  const willy=WILLY_2016_BA019_SINGLE_PACE_ENVIRONMENT_SOURCE_R8, mestelle=MESTELLE_2017_BA019_SHOD_OVERGROUND_SOURCE_R8;
  return Object.freeze({
    state:"EVIDENCE_GAP", reason:"NO_LOW_SPEED_MULTI_SPEED_SAME_ENDPOINT_ENVIRONMENT_BRIDGE_IDENTIFIED",
    numericEligible:false,numericRatio:null,coordinates:{speedMps,runSetting},
    evidence:Object.freeze({willySinglePaceMps:willy.reportedMeanSpeedMps,mestelleSingleSpeedMps:mestelle.speedMps}),
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_TREAT_WILLY_GROUP_MEAN_OR_SD_AS_A_VALIDATED_SPEED_RANGE",
      "DO_NOT_EXTRAPOLATE_WILLY_SINGLE_PACE_ENVIRONMENT_RESULT_TO_2_381_MPS",
      "DO_NOT_USE_MESTELLE_3_46_MPS_HEEL_LIFT_STUDY_AS_A_LOW_SPEED_ENVIRONMENT_TRANSFER",
      "DO_NOT_TRANSFER_HAGEN_TREADMILL_REGRESSION_TO_OUTDOOR_WITHOUT_MULTI_SPEED_SAME_ENDPOINT_BRIDGE"
    ])
  });
}

export function assessFirminger2020BA025R8({speedMps}={}){
  const s=FIRMINGER_2020_BA025_EXACT_SPEED_SOURCE_R8;
  if(!finite(speedMps))return {state:"EVIDENCE_GAP",reason:"MISSING_SPEED",numericEligible:false,sourceId:s.sourceId};
  const v=Number(speedMps), lo=s.speedsMps[0], hi=s.speedsMps[s.speedsMps.length-1];
  if(v<lo||v>hi)return {state:"OUT_OF_RANGE",reason:"OUTSIDE_FIRMINGER_3_5_TO_5_5_MPS_DOMAIN",numericEligible:false,sourceId:s.sourceId};
  return {state:"SOURCE_GEOMETRY_ONLY",reason:"DIRECT_CUMULATIVE_METHOD_BUT_NOT_ADOPTED_AS_CURRENT_REFERENCE_ROUTE",numericEligible:false,sourceId:s.sourceId};
}

export function assessErtmanToFirmingerBA025BridgeR8({speedMps=5000/(35*60)}={}){
  const e=ERTMAN_2023_BA025_LOW_SPEED_PER_STEP_SOURCE_R8, f=FIRMINGER_2020_BA025_EXACT_SPEED_SOURCE_R8;
  const withinE=finite(speedMps)&&Number(speedMps)>=e.speedDomainMps[0]&&Number(speedMps)<=e.speedDomainMps[1];
  return Object.freeze({
    state:"MULTISOURCE_BOUNDED_TRANSFER_CANDIDATE_BLOCKED",
    reason:"LOW_SPEED_PER_STEP_STRAIN_SOURCE_DOES_NOT_SUPPLY_CURRENT_CUMULATIVE_STRAIN_IMPULSE_ENDPOINT",
    speedWithinErtmanDomain:withinE, firmingerBeginnerOverlap:f.beginnerPriorityOverlap,
    endpointDirectionConsistentCandidate:true, numericEligible:false,numericRatio:null,
    prohibitedShortcuts:Object.freeze([
      "DO_NOT_CONVERT_PEAK_OR_PER_STEP_STRAIN_TO_CUMULATIVE_PER_KM_WITHOUT_SOURCE_SUPPORTED_TIME_INTEGRAL_AND_STRIDE_EXPOSURE",
      "DO_NOT_EXTRAPOLATE_FIRMINGER_BELOW_3_5_MPS",
      "DO_NOT_JOIN_ERTMAN_AND_FIRMINGER_ONLY_BECAUSE_THEIR_SPEED_DOMAINS_OVERLAP_ABOVE_3_5_MPS"
    ])
  });
}
