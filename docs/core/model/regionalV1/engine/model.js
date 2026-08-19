import {
  PARAMETERS,
  SOURCE_CURVES,
  SURFACE_CURVES,
  ARCH_SURFACE_CURVES,
  PFA_CURVE,
  GASTRO_GRADE_CURVE,
  GLUTE_GRADE_CURVE,
  GRADE_SPEED_PROFILE,
  REGIONS,
} from "./data.js";
import { boundedFactor, gradePercentToDegrees, logInterpolate, mergeState } from "./utils.js";
import { RANGE_STATES, resolve1DKnots, resolveCategoricalMatch, resolveBoundedTransfer, resolvePaired1DPath, evidenceGap } from "./range-resolver.js";
import {
  JOINT_GRADE_SOURCE,
  CADENCE_JOINT_WORK_SOURCE,
  VASTUS_MEDIALIS_UPHILL_SOURCE,
  FIGURE_DIGITIZED_SPEED_SOURCE,
  WILLER_2024_TABULATED_SPEED_WORK_SOURCE,
  CHUMANOV_CADENCE_EMG_SOURCE,
  A6_NUCKOLS_REGIONAL_GRADE_PROXY_SOURCE,
} from "./a3-sources.js";
import { HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE } from "./a4-sources.js";
import { HO_2010_HEEL_PEAK_PRESSURE_SOURCE } from "./a6-r2-sources.js";
import { HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE, assessHagen2023BA019R6 } from "./a6-r6-sources.js";

export function resolveParameters(overrides={}){
  const p={...PARAMETERS,...overrides};
  p["RCM-P-015-WGMED"]=1-p["RCM-P-015-WGMAX"];
  p["RCM-P-023-WGAS"]=1-p["RCM-P-023-WSOL"];
  p["RCM-P-024-WNEG"]=1-p["RCM-P-024-WPOS"];
  p["RCM-P-028-WINTR"]=1-p["RCM-P-028-WARCH"]-p["RCM-P-028-WPFA"];
  return p;
}

const active=(routeSet,id)=>routeSet.has(id);
const FULL_COVERAGE=Object.freeze({state:"FULL",observedComponentIds:[],missingComponentIds:[],normalizedWeights:{}});
function routeResult(ratio=1,state="CALCULATED",routes=[],interactions=[],sources=[],parameters=[],trace=[],componentCoverage=FULL_COVERAGE,evidenceRange=null){return {ratio,state,routes,interactions,sources,parameters,trace,componentCoverage,evidenceRange:evidenceRange??evidenceGap("RANGE_METADATA_NOT_REGISTERED")};}
function partial(message,ratio=1,evidenceRange=evidenceGap("SOURCE_ROUTE_INACTIVE")){return routeResult(ratio,"PARTIAL",[],[],[],[],[{traceCode:"SOURCE_ROUTE_INACTIVE",message,numericEffectApplied:false}],FULL_COVERAGE,evidenceRange);}
function out(message,evidenceRange={state:RANGE_STATES.OUT_OF_RANGE,reason:"OUT_OF_SUPPORTED_RANGE"}){return routeResult(null,"OUT_OF_SUPPORTED_RANGE",[],[],[],[],[{traceCode:"OUT_OF_SUPPORTED_RANGE",message,numericEffectApplied:false}],FULL_COVERAGE,evidenceRange);}
function compositeEvidenceRange(...entries){
  const components=entries.flat().filter(Boolean);
  if(!components.length)return evidenceGap("NO_RANGE_COMPONENTS");
  const states=components.map(item=>item.state).filter(Boolean);
  const state=states.includes(RANGE_STATES.MULTISOURCE_BOUNDED_TRANSFER)?RANGE_STATES.MULTISOURCE_BOUNDED_TRANSFER
    :states.includes(RANGE_STATES.WITHIN_SOURCE_INTERPOLATION)?RANGE_STATES.WITHIN_SOURCE_INTERPOLATION
    :states.includes(RANGE_STATES.SOURCE_KNOT)?RANGE_STATES.SOURCE_KNOT
    :states.includes(RANGE_STATES.CATEGORICAL_MATCH)?RANGE_STATES.CATEGORICAL_MATCH
    :states[0]??RANGE_STATES.EVIDENCE_GAP;
  return {state,geometry:"COMPOSITE_RANGE_STATE",components};
}

function observedComposite(components){
  const observed=components.filter(component=>Number.isFinite(component.ratio)&&component.ratio>0);
  const totalWeight=observed.reduce((sum,component)=>sum+component.weight,0);
  if(!(totalWeight>0))return {ratio:null,coverage:{state:"NONE",observedComponentIds:[],missingComponentIds:components.map(component=>component.id),normalizedWeights:{}}};
  const normalizedWeights=Object.fromEntries(observed.map(component=>[component.id,component.weight/totalWeight]));
  const ratio=Math.exp(observed.reduce((sum,component)=>sum+normalizedWeights[component.id]*Math.log(component.ratio),0));
  const missingComponentIds=components.filter(component=>!observed.includes(component)).map(component=>component.id);
  return {
    ratio,
    coverage:{
      state:missingComponentIds.length?"PARTIAL":"FULL",
      observedComponentIds:observed.map(component=>component.id),
      missingComponentIds,
      normalizedWeights,
    },
  };
}

function linearInterpolate(xs,ys,x){
  if(x<xs[0]||x>xs.at(-1))return null;
  const exact=xs.findIndex(value=>Math.abs(value-x)<=1e-12);
  if(exact>=0)return ys[exact];
  for(let i=0;i<xs.length-1;i+=1){
    if(x>=xs[i]&&x<=xs[i+1]){
      const t=(x-xs[i])/(xs[i+1]-xs[i]);
      return ys[i]+(ys[i+1]-ys[i])*t;
    }
  }
  return null;
}

function sourceCoverage(observedComponentId, state="PARTIAL"){
  return {
    state,
    observedComponentIds:[observedComponentId],
    missingComponentIds:state==="FULL"?[]:["UNOBSERVED_REGION_COMPONENTS"],
    normalizedWeights:{[observedComponentId]:1},
  };
}

function withinRelativeTolerance(value, reference, fraction){
  return Number.isFinite(value)&&Math.abs(value-reference)<=Math.abs(reference*fraction)+1e-12;
}

function a3JointGradeRoute(regionId,context){
  const entry=JOINT_GRADE_SOURCE.regions[regionId];
  if(!entry||context.runSetting!==JOINT_GRADE_SOURCE.runSetting)return null;
  if(!Number.isFinite(context.speedMps)||Math.abs(context.speedMps-JOINT_GRADE_SOURCE.speedMps)>JOINT_GRADE_SOURCE.speedMatchEpsilonMps)return null;
  const gp=context.gradePercent??0;
  const hipFamily=regionId==="BA-DISP-014" ? entry.endpointFamilies.totalAbsolutePower : null;
  const gradeKnots=hipFamily?.gradePercent??JOINT_GRADE_SOURCE.gradePercent;
  const ratios=hipFamily?.ratios??entry.ratios;
  const routeId=hipFamily?.routeId??"A3_SRC_SUP_003_JOINT_GRADE";
  const endpoint=hipFamily?.endpoint??entry.endpoint;
  const evidenceRange=resolve1DKnots(gradeKnots,gp,{axis:"gradePercent"});
  const ratio=linearInterpolate(gradeKnots,ratios,gp);
  if(ratio==null)return out("Grade is outside SRC-SUP-003 joint-level domain.",evidenceRange);
  return routeResult(
    ratio,
    entry.coverageState==="FULL"?"CALCULATED":"PARTIAL",
    [routeId],
    gp>0?["RCM-INT-001"]:gp<0?["RCM-INT-002"]:[],
    [entry.sourceAnchorRange],
    [],
    [{traceCode:hipFamily?"A8_SOURCE_BOUNDED_HIP_TOTAL_ABSOLUTE_GRADE":"SOURCE_BOUNDED_JOINT_GRADE",message:`${endpoint}; source-reported percent-grade knots with within-study linear interpolation at the fixed 2.25 m/s treadmill protocol.${hipFamily?" The same derived hip-power construct is retained from decline through incline; no cross-source bridge is applied.":""}`,numericEffectApplied:true}],
    sourceCoverage(endpoint,entry.coverageState),
    {...evidenceRange,geometry:"1D_GRADE_AT_FIXED_SOURCE_SPEED",...(hipFamily?{endpointFamilyId:hipFamily.familyId,referenceDefinitionId:hipFamily.referenceDefinitionId}:{}),fixedProtocolGate:{axis:"speedMps",reference:JOINT_GRADE_SOURCE.speedMps,match:"NUMERIC_EPSILON_ONLY"}},
  );
}

function a6NuckolsGradeTransferRoute(regionId,context){
  // R19: retired. The supporting studies corroborate slope-related changes or
  // treadmill/overground context, but they do not quantitatively calibrate the
  // 2.25 m/s Nuckols joint-power magnitude across 1.8-2.5 m/s or outdoors.
  // Preserve the policy/source registry for audit history; do not activate it.
  return null;
}

function a6NuckolsSourceProtocolProxyRoute(regionId,context){
  const entry=A6_NUCKOLS_REGIONAL_GRADE_PROXY_SOURCE.regions[regionId];
  if(!entry||context.runSetting!==JOINT_GRADE_SOURCE.runSetting)return null;
  if(!Number.isFinite(context.speedMps)||Math.abs(context.speedMps-JOINT_GRADE_SOURCE.speedMps)>JOINT_GRADE_SOURCE.speedMatchEpsilonMps)return null;
  const gp=context.gradePercent??0;
  const evidenceRange=resolve1DKnots(A6_NUCKOLS_REGIONAL_GRADE_PROXY_SOURCE.gradePercent,gp,{axis:"gradePercent"});
  const ratio=linearInterpolate(A6_NUCKOLS_REGIONAL_GRADE_PROXY_SOURCE.gradePercent,entry.ratios,gp);
  if(ratio==null)return out("Grade is outside SRC-SUP-003 proxy domain.",evidenceRange);
  const observedId=entry.observedComponentIds[0];
  return routeResult(
    ratio,
    "PARTIAL",
    ["A6_NUCKOLS_SOURCE_PROTOCOL_PROXY"],
    gp>0?["RCM-INT-001"]:gp<0?["RCM-INT-002"]:[],
    [A6_NUCKOLS_REGIONAL_GRADE_PROXY_SOURCE.sourceId],
    [],
    [{traceCode:"SOURCE_PROTOCOL_PROXY_NUCKOLS",message:`${entry.endpoint}; the positive-plus-absolute-negative aggregation is a project-derived within-source proxy. Magnitude is retained only at the fixed 2.25 m/s treadmill protocol. Region mapping remains a declared PARTIAL proxy, not direct muscle force or tissue load.`,numericEffectApplied:Math.abs(ratio-1)>1e-12}],
    {state:"PARTIAL",observedComponentIds:[observedId],missingComponentIds:[...entry.missingComponentIds],normalizedWeights:{[observedId]:1}},
    {...evidenceRange,geometry:"1D_GRADE_AT_FIXED_SOURCE_SPEED",fixedProtocolGate:{axis:"speedMps",reference:JOINT_GRADE_SOURCE.speedMps,match:"NUMERIC_EPSILON_ONLY"}},
  );
}

function a3CadenceRoute(regionId,context){
  const entry=CADENCE_JOINT_WORK_SOURCE.regions[regionId];
  if(!entry)return null;
  // R17: E04 manipulated step rate relative to each runner's own preferred
  // step rate at that runner's preferred speed. The app has current absolute
  // cadence but no source-compatible preferred-cadence baseline, so the
  // group-mean absolute coordinates are retained as evidence only and are not
  // used as an individualized numeric cadence magnitude.
  return null;
}

function a3FigureSpeedRoute(regionId,context){
  const entry=FIGURE_DIGITIZED_SPEED_SOURCE.regions[regionId];
  if(!entry||context.runSetting!==FIGURE_DIGITIZED_SPEED_SOURCE.runSetting)return null;
  if(Math.abs(context.gradePercent??0)>1e-9)return null;
  if(!Number.isFinite(context.speedMps))return null;
  const [entryMin,entryMax]=entry.validSpeedDomainMps??[FIGURE_DIGITIZED_SPEED_SOURCE.speedMps[0],FIGURE_DIGITIZED_SPEED_SOURCE.speedMps.at(-1)];
  if(context.speedMps<entryMin||context.speedMps>entryMax)return null;
  const evidenceRange=resolve1DKnots(FIGURE_DIGITIZED_SPEED_SOURCE.speedMps,context.speedMps,{axis:"speedMps"});
  const ratio=linearInterpolate(FIGURE_DIGITIZED_SPEED_SOURCE.speedMps,entry.ratiosAtModelReference,context.speedMps);
  if(ratio==null)return null;
  return routeResult(
    ratio,
    "PARTIAL",
    ["A3_E02_FIGURE_DIGITIZED_SPEED"],
    [],
    [entry.sourceAnchorRange],
    [],
    [{traceCode:"FIGURE_DIGITIZED_LOW_CONFIDENCE",message:`${entry.endpoint}; figure-derived population speed proxy, bounded to 2–5 m/s level treadmill running. R24 retains group-mean stride-time-derived cadence only as descriptive provenance and does not use it as an individual eligibility threshold.`,numericEffectApplied:true}],
    sourceCoverage(entry.endpoint,"PARTIAL"),
    {...evidenceRange,geometry:"1D_POPULATION_SPEED_PROFILE_AT_NATURAL_GAIT",descriptiveCadenceSpm:[...FIGURE_DIGITIZED_SPEED_SOURCE.sourceCadenceSpm],referenceState:"PROJECT_WITHIN_SOURCE_LINEAR_INTERPOLATION_BETWEEN_2_AND_3_MPS"},
  );
}

function a3WillerSpeedWorkRoute(regionId,context){
  const source=WILLER_2024_TABULATED_SPEED_WORK_SOURCE;
  const entry=source.regions[regionId];
  if(!entry||context.runSetting!==source.runSetting)return null;
  if(Math.abs(context.gradePercent??0)>1e-9)return null;
  if(!Number.isFinite(context.speedMps))return null;
  if(context.speedMps<source.speedMps[0]-1e-12||context.speedMps>source.speedMps.at(-1)+1e-12)return null;
  const evidenceRange=resolve1DKnots(source.speedMps,context.speedMps,{axis:"speedMps"});
  const ratio=linearInterpolate(source.speedMps,entry.ratiosToReference,context.speedMps);
  if(ratio==null)return null;
  return routeResult(
    ratio,
    "PARTIAL",
    ["A5_WILLER_2024_TABULATED_SPEED_WORK"],
    [],
    [source.sourceId],
    [],
    [{traceCode:"TABULATED_FUNCTIONAL_WORK_SPEED_PROXY",message:`${entry.endpoint}; exact Table 2 group means normalized to the 2.78 m/s source knot. R24 treats Table 1 cadence as descriptive provenance only; numeric eligibility is level treadmill plus the 2.78–5.00 m/s source speed domain.`,numericEffectApplied:Math.abs(ratio-1)>1e-12}],
    {state:"PARTIAL",observedComponentIds:[...entry.observedComponentIds],missingComponentIds:[...entry.missingComponentIds],normalizedWeights:Object.fromEntries(entry.observedComponentIds.map(id=>[id,1/entry.observedComponentIds.length]))},
    {...evidenceRange,geometry:"1D_POPULATION_SPEED_PROFILE_AT_NATURAL_GAIT",descriptiveCadenceSpm:[...source.sourceCadenceSpm]},
  );
}

function a3PosteriorThighCadenceEmgRoute(context){
  // R17: Chumanov 2012 manipulated preferred, +5%, and +10% of each
  // participant's own preferred step rate. Current absolute cadence cannot
  // identify that participant-relative intervention coordinate, so the EMG
  // response is preserved as evidence but not activated numerically.
  return null;
}

function a3VastusUphillRoute(context){
  if(context.runSetting!==VASTUS_MEDIALIS_UPHILL_SOURCE.runSetting)return null;
  if(!Number.isFinite(context.speedMps)||Math.abs(context.speedMps-VASTUS_MEDIALIS_UPHILL_SOURCE.speedMps)>VASTUS_MEDIALIS_UPHILL_SOURCE.speedMatchEpsilonMps)return null;
  const grade=context.gradePercent??0;
  if(!(grade>0))return null;
  const evidenceRange=resolve1DKnots(VASTUS_MEDIALIS_UPHILL_SOURCE.gradePercent,grade,{axis:"gradePercent"});
  const ratio=linearInterpolate(VASTUS_MEDIALIS_UPHILL_SOURCE.gradePercent,VASTUS_MEDIALIS_UPHILL_SOURCE.ratios,grade);
  if(ratio==null)return null;
  return routeResult(
    ratio,
    "PARTIAL",
    ["A3_BAT_SRC_009_VASTUS_EXACT"],
    ["RCM-INT-001"],
    [VASTUS_MEDIALIS_UPHILL_SOURCE.sourceAnchorRange],
    [],
    [{traceCode:"SOURCE_COMPONENT_PARTIAL",message:"Vastus medialis EMG is an observed anterior-thigh component; unobserved components are not imputed.",numericEffectApplied:true}],
    sourceCoverage("VASTUS_MEDIALIS_EMG","PARTIAL"),
    {...evidenceRange,geometry:"1D_GRADE_AT_FIXED_SPEED",fixedProtocolGate:{axis:"speedMps",reference:VASTUS_MEDIALIS_UPHILL_SOURCE.speedMps,match:"NUMERIC_EPSILON_ONLY"}},
  );
}

function a4HoriguchiPlantarRoute(regionId,context){
  if(!active(context.routeSet??new Set(),"A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE"))return null;
  const source=HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE;
  if(context.runSetting!==source.runSetting||!Number.isFinite(context.speedMps)||Math.abs(context.speedMps-source.speedMps)>source.speedMatchEpsilonMps)return null;
  if(!source.validFootPlacements.includes(context.footPlacement))return null;
  const degrees=gradePercentToDegrees(context.gradePercent??0);
  const gradeRange=resolve1DKnots(source.gradeDegrees,degrees,{axis:"gradeDegrees"});
  const strikeRange=resolveCategoricalMatch(context.footPlacement,source.validFootPlacements,{axis:"footPlacement"});
  if(degrees<source.gradeDegrees[0]-1e-12||degrees>source.gradeDegrees.at(-1)+1e-12)return out("Grade is outside the Horiguchi plantar-pressure source range.",gradeRange);
  let ratio=null,entry=null,traceMessage="";
  if(regionId==="BA-DISP-027"){
    entry=source.rearfoot;
    ratio=linearInterpolate(source.gradeDegrees,entry.ratiosByStrike[context.footPlacement],degrees);
    traceMessage=`${entry.endpoint}; significant slope x foot-strike interaction is represented by the preserved strike-specific cell-mean curve.`;
  }else if(regionId==="BA-DISP-029"){
    entry=source.forefoot;
    const slopeRatio=linearInterpolate(source.gradeDegrees,entry.slopeRatios,degrees);
    ratio=slopeRatio==null?null:slopeRatio*entry.strikeRatios[context.footPlacement];
    traceMessage=`${entry.endpoint}; significant slope and foot-strike main effects are factorized, and the non-significant interaction is not modeled.`;
  }else return null;
  if(!(ratio>0))return out("Horiguchi plantar-pressure source coordinate is unavailable.");
  return routeResult(
    ratio,
    "PARTIAL",
    ["A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE"],
    regionId==="BA-DISP-027"?["RCM-INT-A4-001"]:[],
    [entry.sourceAnchorRange],
    [],
    [{traceCode:"SOURCE_BOUNDED_PLANTAR_PEAK_PRESSURE_PROXY",message:traceMessage+" Self-reported strike and study-shoe matching limit the result to PARTIAL.",numericEffectApplied:true}],
    {state:"PARTIAL",observedComponentIds:[regionId==="BA-DISP-027"?"HEEL_PEAK_PRESSURE_PROXY":"FOREFOOT_PEAK_PRESSURE_PROXY"],missingComponentIds:["PRESSURE_TIME_INTEGRAL_ENDPOINT","INDIVIDUAL_MEASURED_FOOT_STRIKE","EXACT_STUDY_SHOE_MATCH"],normalizedWeights:{[regionId==="BA-DISP-027"?"HEEL_PEAK_PRESSURE_PROXY":"FOREFOOT_PEAK_PRESSURE_PROXY"]:1}},
    {...gradeRange,geometry:"GRADE_X_FOOT_STRIKE_SOURCE_CURVE",categoricalMatch:strikeRange,fixedProtocolGate:{axis:"speedMps",reference:source.speedMps,match:"NUMERIC_EPSILON_ONLY",sourceTolerance:null}},
  );
}

function resolveHo2010HeelSourcePath(speedMps,gradePercent){
  const source=HO_2010_HEEL_PEAK_PRESSURE_SOURCE;
  if(!Number.isFinite(speedMps)||!Number.isFinite(gradePercent))return {ratio:null,evidenceRange:evidenceGap("MISSING_HO2010_COORDINATE",{geometry:source.geometry})};
  if(Math.abs(gradePercent-source.levelSpeedPath.fixedGradePercent)<=1e-12){
    const range=resolve1DKnots(source.levelSpeedPath.speedMps,speedMps,{axis:"speedMps"});
    const ratio=linearInterpolate(source.levelSpeedPath.speedMps,source.levelSpeedPath.ratios,speedMps);
    return {
      ratio,
      sourceAnchorRange:source.levelSpeedPath.sourceAnchorRange,
      evidenceRange:{...range,geometry:source.geometry,pathId:source.levelSpeedPath.pathId,fixedProtocolGate:{axis:"gradePercent",reference:source.levelSpeedPath.fixedGradePercent,tolerance:0}},
    };
  }
  if(Math.abs(speedMps-source.fixedSpeedUphillPath.fixedSpeedMps)<=1e-12&&gradePercent>=-1e-12){
    const range=resolve1DKnots(source.fixedSpeedUphillPath.gradePercent,gradePercent,{axis:"gradePercent"});
    const ratio=linearInterpolate(source.fixedSpeedUphillPath.gradePercent,source.fixedSpeedUphillPath.ratios,gradePercent);
    return {
      ratio,
      sourceAnchorRange:source.fixedSpeedUphillPath.sourceAnchorRange,
      evidenceRange:{...range,geometry:source.geometry,pathId:source.fixedSpeedUphillPath.pathId,fixedProtocolGate:{axis:"speedMps",reference:source.fixedSpeedUphillPath.fixedSpeedMps,tolerance:0}},
    };
  }
  return {
    ratio:null,
    evidenceRange:evidenceGap("OFF_HO2010_TWO_PROTOCOL_SOURCE_PATHS",{
      geometry:source.geometry,
      coordinates:{speedMps,gradePercent},
      registeredPaths:[
        {pathId:source.levelSpeedPath.pathId,fixedGradePercent:0,speedDomainMps:[1.5,2.5]},
        {pathId:source.fixedSpeedUphillPath.pathId,fixedSpeedMps:2.0,gradeDomainPercent:[0,15]},
      ],
    }),
  };
}

function a6Ho2010HeelRoute(regionId,context){
  if(regionId!=="BA-DISP-027"||!active(context.routeSet??new Set(),"A6_HO2010_HEEL_PEAK_PRESSURE"))return null;
  const source=HO_2010_HEEL_PEAK_PRESSURE_SOURCE;
  if(context.runSetting!==source.runSetting)return null;
  const resolved=resolveHo2010HeelSourcePath(context.speedMps,context.gradePercent??0);
  if(!(resolved.ratio>0)){
    return out("Coordinate is outside the registered Ho 2010 union of two independent 1D source protocols.",resolved.evidenceRange);
  }
  return routeResult(
    resolved.ratio,
    "PARTIAL",
    ["A6_HO2010_HEEL_PEAK_PRESSURE"],
    [],
    [resolved.sourceAnchorRange],
    [],
    [{traceCode:"SOURCE_BOUNDED_HO2010_HEEL_PEAK_PRESSURE_PROXY",message:`${source.endpoint}; exact source knots and within-protocol 1D interpolation only. Independent speed and incline protocols are not combined into a 2D surface.`,numericEffectApplied:true}],
    {state:"PARTIAL",observedComponentIds:["HEEL_PEAK_PRESSURE_PROXY"],missingComponentIds:["PRESSURE_TIME_INTEGRAL_ENDPOINT","FOOT_STRIKE_NOT_STRATIFIED_IN_SOURCE","EXACT_STUDY_SHOE_MATCH","OUTDOOR_TRANSFER_NOT_ESTABLISHED"],normalizedWeights:{HEEL_PEAK_PRESSURE_PROXY:1}},
    resolved.evidenceRange,
  );
}

function sourceMatchedGradeSpeed(regionId,gradePercent,speedMps){
  // R21 scientific correction: BAT-SRC-019 prescribed speed individually from
  // each participant's 10-km personal best and adjusted it by grade. The
  // published speed values are group means, not fixed source protocol targets.
  // The app does not encode the participant-specific source prescription, and
  // the former ±0.15 m/s group-mean matching tolerance has no source basis.
  // Retain GRADE_SPEED_PROFILE in data.js for provenance only; do not apply a
  // numeric condition magnitude from this descriptive group profile.
  void regionId; void gradePercent; void speedMps;
  return null;
}

function unevennessForSection(regionId,context){
  // R20 scientific correction: BAT-SRC-027 measured one artificial uneven
  // treadmill apparatus versus an even treadmill at one speed (2.3 m/s).
  // The app does not encode that apparatus as an exact source category.
  // Therefore source endpoint ratios remain archived in data.js, but no
  // ordinal 1-5, speed-band, trail, or other surface transfer is numeric.
  void regionId; void context;
  return null;
}

function a6HagenLowSpeedBA019Route(regionId,context){
  if(regionId!=="BA-DISP-019"||!Number.isFinite(context.speedMps)||context.speedMps>=2.78)return null;
  const assessment=assessHagen2023BA019R6({
    regionId,runSetting:context.runSetting,speedMps:context.speedMps,gradePercent:context.gradePercent??0,
  });
  if(assessment.reason==="R22_HAGEN_LOW_SPEED_REFERENCE_BRIDGE_RETIRED_UNCALIBRATED_CROSS_STUDY_NORMALIZATION")return routeResult(
    1,
    "PARTIAL",
    [],
    [],
    [HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE.sourceId],
    [],
    [{traceCode:"R22_HAGEN_REFERENCE_BRIDGE_RETIRED",message:"Hagen 2023 published regression retained for evidence reproduction only; no numeric condition effect is applied because cross-study Reference 100 calibration and source-compatible habitual/preferred cadence matching are not established.",numericEffectApplied:false}],
    FULL_COVERAGE,
    {state:RANGE_STATES.EVIDENCE_GAP,geometry:"PUBLISHED_MODEL_REFERENCE_BRIDGE_RETIRED",modelState:RANGE_STATES.PUBLISHED_CONTINUOUS_MODEL,modelId:assessment.modelId,domain:assessment.modelDomainMps,coordinates:assessment.coordinates,sourceGeometryState:assessment.sourceGeometryState,bridge:assessment.bridge,sourceIds:[HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE.sourceId],reason:assessment.reason,publishedModelValue:assessment.publishedModelValue,historicalSensitivityRatio:assessment.historicalSensitivityRatio},
  );
  if(assessment.reason==="HAGEN_TREADMILL_MODEL_OUTDOOR_TRANSFER_NOT_ESTABLISHED")return partial(
    "Hagen 2023 supplies a low-speed PFJS impulse-per-km model on a treadmill, but it is not transferred numerically to outdoor running.",
    1,
    {state:RANGE_STATES.EVIDENCE_GAP,geometry:"RUN_SETTING_TRANSFER_BLOCK",coordinates:{speedMps:context.speedMps,runSetting:context.runSetting},sourceIds:[HAGEN_2023_BA019_PUBLISHED_MODEL_SOURCE.sourceId,"SRC-A6-R6-002"],reason:assessment.reason},
  );
  return null;
}


function directCurve(regionId, context){
  const curves=SOURCE_CURVES[regionId]; const {speedMps,cadenceSpm,gradePercent,conflictingProtocol,runSetting}=context;
  if(conflictingProtocol)return partial("A different exact protocol route is active; direct speed/grade/cadence curve is not stacked.");
  if(regionId==="BA-DISP-019"&&Number.isFinite(speedMps)&&speedMps<2.78){
    const hagenLowSpeed=a6HagenLowSpeedBA019Route(regionId,context); if(hagenLowSpeed)return hagenLowSpeed;
  }
  if(runSetting!=="TREADMILL"){
    return partial(
      "The direct cumulative source curves were measured on a treadmill; no numeric environment transfer is applied.",
      1,
      {state:RANGE_STATES.EVIDENCE_GAP,geometry:"RUN_SETTING_TRANSFER_BLOCK",coordinates:{speedMps,runSetting},sourceIds:["RCM-ANCH-SPEED","RCM-ANCH-GRADE","RCM-ANCH-CADENCE"],reason:"VAN_HOOREN_2024_TREADMILL_ONLY"}
    );
  }
  const gradeDegrees=gradePercent==null?null:gradePercentToDegrees(gradePercent);
  const cadenceTrace=Number.isFinite(cadenceSpm)?[{
    traceCode:"ABSOLUTE_CADENCE_NOT_MAPPABLE_TO_SOURCE_PREFERRED_DELTA",
    message:"Van Hooren 2024 manipulated cadence as ±10 steps/min relative to each participant's preferred cadence at 3.33 m/s. The app has current absolute cadence but no source-compatible preferred-cadence baseline, so cadence is not given a numeric effect for these cumulative-per-km endpoints.",
    numericEffectApplied:false
  }]:[];
  try{
    if(gradeDegrees!=null&&Math.abs(gradeDegrees)>1e-9){
      if(!Number.isFinite(speedMps)||Math.abs(speedMps-2.78)>1e-9)return partial("Grade source route requires the exact Van Hooren 2024 source speed (2.78 m/s); no project speed tolerance is applied.",1,{state:RANGE_STATES.EVIDENCE_GAP,geometry:"FIXED_SOURCE_SPEED_GATE",coordinates:{speedMps,gradeDegrees},sourceIds:["RCM-ANCH-GRADE"],reason:"VAN_HOOREN_2024_GRADE_FIXED_SPEED_2_78_MPS"});
      const evidenceRange=resolve1DKnots(curves.grade.map(([x])=>x),gradeDegrees,{axis:"gradeDegrees"});
      if(gradeDegrees < -6 || gradeDegrees > 6)return out("Grade is outside direct source domain.",evidenceRange);
      return routeResult(
        logInterpolate(curves.grade,gradeDegrees),
        "PARTIAL",
        ["DIRECT_GRADE_SOURCE"],
        [gradeDegrees>0?"RCM-INT-001":"RCM-INT-002"],
        ["RCM-ANCH-GRADE"],
        [],
        cadenceTrace,
        FULL_COVERAGE,
        {...evidenceRange,geometry:"1D_GRADE_AT_FIXED_SPEED",fixedProtocolGate:{axis:"speedMps",reference:2.78,numericEpsilon:1e-9,sourceTolerance:null},runSetting:"TREADMILL",exposureUnit:"CUMULATIVE_IMPULSE_PER_KM"}
      );
    }
    // Cadence-specific numeric routing is intentionally disabled in R16.
    // The source intervention is ±10 steps/min from each participant's own
    // preferred cadence, while the app only has current absolute cadence.
    if(speedMps>=2.78&&speedMps<=5){
      const evidenceRange=resolve1DKnots(curves.speed.map(([x])=>x),speedMps,{axis:"speedMps"});
      return routeResult(
        logInterpolate(curves.speed,speedMps),
        "PARTIAL",
        ["DIRECT_SPEED_SOURCE"],
        [],
        ["RCM-ANCH-SPEED"],
        [],
        cadenceTrace,
        FULL_COVERAGE,
        {...evidenceRange,geometry:"1D_SPEED_SOURCE_RANGE",runSetting:"TREADMILL",sourceCadenceState:"SELF_SELECTED_GROUP_PROTOCOL",exposureUnit:"CUMULATIVE_IMPULSE_PER_KM"}
      );
    }
    return partial("Speed is outside direct source route; exposure remains available.",1,{state:RANGE_STATES.OUT_OF_RANGE,axis:"speedMps",value:speedMps,domain:[2.78,5],reason:"LOW_SPEED_GAP_OR_HIGH_SPEED_OUT_OF_RANGE"});
  }catch(error){return out(error.message);}
}

function supportedSurfaceComposite(components,curveByCategory){
  const prepared=components.map((component,index)=>({
    ...component,
    coverageId:component.componentId??component.surfaceId??`surface-component-${index+1}`,
    declaredShare:Number(component.sharePercent??0),
  })).filter(component=>Number.isFinite(component.declaredShare)&&component.declaredShare>0);
  const totalDeclared=prepared.reduce((sum,component)=>sum+component.declaredShare,0);
  if(!(totalDeclared>0))return {ratio:null,coverage:{state:"NONE",observedComponentIds:[],missingComponentIds:prepared.map(component=>component.coverageId),normalizedWeights:{}}};
  const supported=prepared.filter(component=>Number.isFinite(curveByCategory?.[component.exactSourceCategory])&&curveByCategory[component.exactSourceCategory]>0);
  const missing=prepared.filter(component=>!supported.includes(component));
  const representedShare=supported.reduce((sum,component)=>sum+component.declaredShare,0);
  if(!(representedShare>0))return {ratio:null,coverage:{state:"NONE",observedComponentIds:[],missingComponentIds:missing.map(component=>component.coverageId),normalizedWeights:{},declaredShareFractions:{},representedShareFraction:0},evidenceRange:{state:RANGE_STATES.OUT_OF_RANGE,geometry:"CATEGORICAL_SURFACE_MIX",reason:"NO_SOURCE_COMPATIBLE_SURFACE_CATEGORY"}};
  const normalizedWeights=Object.fromEntries(supported.map(component=>[component.coverageId,component.declaredShare/representedShare]));
  const declaredShareFractions=Object.fromEntries(supported.map(component=>[component.coverageId,component.declaredShare/totalDeclared]));
  const logSum=supported.reduce((sum,component)=>sum+declaredShareFractions[component.coverageId]*Math.log(curveByCategory[component.exactSourceCategory]),0);
  return {
    ratio:Math.exp(logSum),
    coverage:{
      state:missing.length?"PARTIAL":"FULL",
      observedComponentIds:supported.map(component=>component.coverageId),
      missingComponentIds:missing.map(component=>component.coverageId),
      normalizedWeights,
      declaredShareFractions,
      representedShareFraction:representedShare/totalDeclared,
    },
    evidenceRange:{state:RANGE_STATES.CATEGORICAL_MATCH,geometry:"CATEGORICAL_SURFACE_MIX",categories:supported.map(component=>component.exactSourceCategory),aggregation:{state:RANGE_STATES.AGGREGATION_WEIGHT,declaredShareFractions,representedShareFraction:representedShare/totalDeclared},unsupportedCategoryIds:missing.map(component=>component.coverageId)},
  };
}
function surfaceRatioForSection(regionId,context){
  const comps=context.surfaceComponents??[];
  if(!comps.length)return {ratio:null,state:"NOT_CALCULABLE",routes:[],interactions:[],sources:[],parameters:[],trace:[{traceCode:"UNKNOWN_NOT_IMPUTED",message:"Surface unknown for plantar mask route",numericEffectApplied:false}],componentCoverage:FULL_COVERAGE,evidenceRange:evidenceGap("SURFACE_UNKNOWN")};
  if(!context.exactSurfaceActive)return partial("Named surface retained, but exact surface×shoe×strike gates are not all met.");
  const composite=supportedSurfaceComposite(comps,SURFACE_CURVES[regionId]);
  if(composite.ratio==null)return partial("No declared surface portion matches the exact named-source categories.");
  const state=composite.coverage.state==="FULL"?"CALCULATED":"PARTIAL";
  const trace=composite.coverage.state==="PARTIAL"?[{traceCode:"SUPPORTED_SURFACE_SHARE_ONLY",message:"Only source-compatible surface portions contribute to conditionLog; unsupported portions remain explicitly unmodelled and are not renormalized to 100%.",numericEffectApplied:true}]:[];
  return routeResult(composite.ratio,state,["SURFACE_X_STANDARD_SHOE"],["RCM-INT-007","RCM-INT-029"],["RCM-ANCH-046..053"],[],trace,composite.coverage,composite.evidenceRange);
}

function archSurfaceRatioForSection(context){
  const components=context.surfaceComponents??[];
  if(!components.length||!context.exactArchSurfaceActive)return null;
  return supportedSurfaceComposite(components,ARCH_SURFACE_CURVES);
}

export function evaluateRegionCondition(regionId,context,parameterOverrides={}){
  const p=resolveParameters(parameterOverrides); const B=p["RCM-P-GLOBAL-BPROJECT"];
  const v=context.speedMps, gp=context.gradePercent??0, gd=gradePercentToDegrees(gp), routeSet=context.routeSet??new Set();
  if(!Number.isFinite(v))return partial("Speed unavailable.");
  if(context.gait==="MIXED")return partial("Run/walk mixture is retained, but continuous-run condition routes are not applied without separated run and walk bouts.");
  if(context.gait==="UNKNOWN")return partial("Running format is unknown; continuous-run condition routes are not applied.");
  if(context.gait==="WALK"&&regionId!=="BA-DISP-028")return partial("A walk-specific condition route is unavailable for this region; exposure-only partial result is retained.");
  if(["BA-DISP-019","BA-DISP-021","BA-DISP-025"].includes(regionId))return directCurve(regionId,{...context,conflictingProtocol:false});
  if(regionId==="BA-DISP-014"){
    const jointGrade=a3JointGradeRoute(regionId,context); if(jointGrade)return jointGrade;
    const speedWork=a3WillerSpeedWorkRoute(regionId,context); if(speedWork)return speedWork;
    const cadence=a3CadenceRoute(regionId,context); if(cadence)return cadence;
    return partial("No source-bounded hip condition route is active; exposure-only partial result is retained.");
  }
  if(regionId==="BA-DISP-015"){
    if(v<2||v>5)return partial("Gluteal speed route outside 2–5 m/s.");
    const exact009=context.runSetting==="TREADMILL"&&Math.abs(v-4.17)<=1e-9&&gp>0&&gp<=7
      ?logInterpolate(GLUTE_GRADE_CURVE,gp)
      :null;
    if(exact009!=null){
      const composite=observedComposite([
        {id:"GMAX",ratio:exact009,weight:p["RCM-P-015-WGMAX"]},
        {id:"GMED",ratio:null,weight:p["RCM-P-015-WGMED"]},
      ]);
      const evidenceRange=resolve1DKnots(GLUTE_GRADE_CURVE.map(([x])=>x),gp,{axis:"gradePercent"});
      return routeResult(composite.ratio,"PARTIAL",["BAT_SRC_009_GLUTE_EXACT"],["RCM-INT-001"],["RCM-ANCH-A1-057..059"],["RCM-P-015-WGMAX","RCM-P-015-WGMED"],[{traceCode:"SOURCE_COMPONENT_PARTIAL",message:"Gluteus maximus EMG is an observed gluteal component; gluteus medius and direct force/tissue load are not imputed. Intermediate grades are project interpolation within the fixed 4.17 m/s treadmill source range.",numericEffectApplied:true}],composite.coverage,{...evidenceRange,geometry:"1D_GRADE_AT_FIXED_SPEED",fixedProtocolGate:{axis:"speedMps",reference:4.17,match:"NUMERIC_EPSILON_ONLY"}});
    }
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(profile){
      const composite=observedComposite([
        {id:"GMAX",ratio:profile.ratios.gmax,weight:p["RCM-P-015-WGMAX"]},
        {id:"GMED",ratio:profile.ratios.gmed,weight:p["RCM-P-015-WGMED"]},
      ]);
      return routeResult(composite.ratio,"PARTIAL",["BAT_SRC_019_GRADE_SPEED_PROFILE"],["RCM-INT-001","RCM-INT-002"],["RCM-ANCH-A1-060..073"],["RCM-P-015-WGMAX","RCM-P-015-WGMED"],[{traceCode:"DESCRIPTIVE_SOURCE_PROFILE",message:"BAT-SRC-019 paired grade-speed means are retained as a bounded descriptive profile, not an inferential or causal calibration.",numericEffectApplied:true}],composite.coverage,profile.evidenceRange);
    }
    const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;
    return partial("No source-bounded gluteal condition route is active; project speed fallback is retired in A3.");
  }
  if(regionId==="BA-DISP-016"){
    const jointGrade=a3JointGradeRoute(regionId,context); if(jointGrade)return jointGrade;
    const vm=a3VastusUphillRoute(context); if(vm)return vm;
    if(Math.abs(gp)<=1e-9){const speedWork=a3WillerSpeedWorkRoute(regionId,context); if(speedWork)return speedWork;}
    let ratio=1,state="CALCULATED",routes=[],sources=[],pars=[],trace=[],interactions=[],evidenceRanges=[];
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(profile){ratio*=profile.ratio;routes.push("BAT_SRC_019_GRADE_SPEED_PROFILE");sources.push("RCM-ANCH-A1-074..080");interactions.push("RCM-INT-001","RCM-INT-002");state="PARTIAL";evidenceRanges.push(profile.evidenceRange);trace.push({traceCode:"DESCRIPTIVE_SOURCE_PROFILE",message:"BAT-SRC-019 paired grade-speed means are retained as a bounded descriptive profile, not an inferential or causal calibration.",numericEffectApplied:true});}
    else {const cadence=a3CadenceRoute(regionId,context); if(cadence)return cadence; const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;}
    const uneven=unevennessForSection(regionId,context);
    if(uneven){ratio*=uneven.ratio;routes.push("BOUNDED_UNEVENNESS_X_SPEED");sources.push("RCM-ANCH-043");pars.push("RCM-P-A1-UNEVEN-MAP");interactions.push("RCM-INT-011");evidenceRanges.push(uneven.evidenceRange);}
    if(!routes.length)return partial("No source-bounded anterior-thigh condition route is active; project uphill fallback is retired in A3.");
    return routeResult(ratio,state,routes,interactions,sources,pars,trace,FULL_COVERAGE,compositeEvidenceRange(evidenceRanges));
  }
  if(regionId==="BA-DISP-018"){
    const cadenceEmg=a3PosteriorThighCadenceEmgRoute(context); if(cadenceEmg)return cadenceEmg;
    if(Math.abs(gp)<=1e-9){const speedWork=a3WillerSpeedWorkRoute(regionId,context); if(speedWork)return speedWork;}
    let ratio=1,routes=[],sources=[],interactions=[],trace=[],state="CALCULATED",evidenceRanges=[];
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(profile){ratio*=profile.ratio;routes.push("BAT_SRC_019_GRADE_SPEED_PROFILE");sources.push("RCM-ANCH-A1-081..087");interactions.push("RCM-INT-001","RCM-INT-002");state="PARTIAL";evidenceRanges.push(profile.evidenceRange);trace.push({traceCode:"DESCRIPTIVE_SOURCE_PROFILE",message:"BAT-SRC-019 paired grade-speed means are retained as a bounded descriptive profile, not an inferential or causal calibration.",numericEffectApplied:true});}
    if(!profile){const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;}
    const uneven=unevennessForSection(regionId,context);
    if(uneven){ratio*=uneven.ratio;routes.push("BOUNDED_UNEVENNESS_X_SPEED");sources.push("RCM-ANCH-044");interactions.push("RCM-INT-011");evidenceRanges.push(uneven.evidenceRange);}
    if(!routes.length)return partial("No source-bounded posterior-thigh condition route is active.");
    return routeResult(ratio,state,routes,interactions,sources,[],trace,FULL_COVERAGE,compositeEvidenceRange(evidenceRanges));
  }
  if(regionId==="BA-DISP-023"){
    const nuckolsProxy=a6NuckolsSourceProtocolProxyRoute(regionId,context); if(nuckolsProxy)return nuckolsProxy;
    if(v<2||v>5)return partial("Calf speed route outside 2–5 m/s.");
    if(Math.abs(gp)<=1e-9){const speedWork=a3WillerSpeedWorkRoute(regionId,context); if(speedWork)return speedWork;}
    const exact009=context.runSetting==="TREADMILL"&&Math.abs(v-4.17)<=1e-9&&gp>0&&gp<=7?logInterpolate(GASTRO_GRADE_CURVE,gp):null;
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(exact009!=null||profile){
      const gas=exact009??profile.ratio;
      const composite=observedComposite([
        {id:"SOLEUS",ratio:null,weight:p["RCM-P-023-WSOL"]},
        {id:"GASTROCNEMIUS_MEDIALIS",ratio:gas,weight:p["RCM-P-023-WGAS"]},
      ]);
      const exactSource=exact009!=null;
      const evidenceRange=exactSource?{...resolve1DKnots(GASTRO_GRADE_CURVE.map(([x])=>x),gp,{axis:"gradePercent"}),geometry:"1D_GRADE_AT_FIXED_SPEED",fixedProtocolGate:{axis:"speedMps",reference:4.17,match:"NUMERIC_EPSILON_ONLY"}}:profile.evidenceRange;
      return routeResult(composite.ratio,"PARTIAL",[exactSource?"BAT_SRC_009_GASTRO_EXACT":"BAT_SRC_019_GRADE_SPEED_PROFILE"],["RCM-INT-001","RCM-INT-002"],[exactSource?"RCM-ANCH-A1-040..042":"RCM-ANCH-A1-088..094"],["RCM-P-023-WSOL","RCM-P-023-WGAS"],[{traceCode:"SOURCE_COMPONENT_PARTIAL",message:"Gastrocnemius medialis EMG is an observed posterior-lower-leg component; soleus and direct force/tissue load are not imputed. Intermediate grades are project interpolation within the fixed 4.17 m/s treadmill source range.",numericEffectApplied:true}],composite.coverage,evidenceRange);
    }
    const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;
    return partial("No source-bounded calf condition route is active; project speed fallback is retired in A3.");
  }
  if(regionId==="BA-DISP-024"){
    const jointGrade=a3JointGradeRoute(regionId,context); if(jointGrade)return jointGrade;
    const cadence=a3CadenceRoute(regionId,context); if(cadence)return cadence;
    const uneven=unevennessForSection(regionId,context);
    if(uneven)return routeResult(uneven.ratio,"CALCULATED",["BOUNDED_UNEVENNESS_X_SPEED"],["RCM-INT-011"],["RCM-ANCH-045"],["RCM-P-A1-UNEVEN-MAP"],[],FULL_COVERAGE,uneven.evidenceRange);
    return partial("No source-bounded ankle condition route is active; exposure-only partial result is retained.");
  }
  if(regionId==="BA-DISP-027"||regionId==="BA-DISP-029"){const a4=a4HoriguchiPlantarRoute(regionId,context);if(a4)return a4;if(regionId==="BA-DISP-027"){const ho2010=a6Ho2010HeelRoute(regionId,context);if(ho2010)return ho2010;}return surfaceRatioForSection(regionId,context);}
  if(regionId==="BA-DISP-028"){
    const archSurface=archSurfaceRatioForSection(context);
    if(archSurface?.ratio!=null){
      const composite=observedComposite([
        {id:"ARCH_DEFORMATION_PROXY",ratio:archSurface.ratio,weight:p["RCM-P-028-WARCH"]},
        {id:"INTRINSIC_MUSCLE",ratio:null,weight:p["RCM-P-028-WINTR"]},
        {id:"PLANTAR_FASCIA_STRAIN",ratio:null,weight:p["RCM-P-028-WPFA"]},
      ]);
      const missing=[...new Set([...(archSurface.coverage?.missingComponentIds??[]),...(composite.coverage?.missingComponentIds??[])])];
      const coverage={...composite.coverage,state:missing.length?"PARTIAL":composite.coverage.state,missingComponentIds:missing};
      const trace=archSurface.coverage?.state==="PARTIAL"?[{traceCode:"SUPPORTED_SURFACE_SHARE_ONLY",message:"Only source-compatible Concrete/Rubber portions contribute to the arch condition proxy; unsupported portions remain explicitly unmodelled and are not renormalized.",numericEffectApplied:true}]:[];
      return routeResult(composite.ratio,"PARTIAL",["ARCH_SURFACE_X_HEELED_SHOE"],["RCM-INT-007","RCM-INT-029"],["RCM-ANCH-A1-095..096"],["RCM-P-028-WARCH","RCM-P-028-WINTR","RCM-P-028-WPFA"],trace,coverage,archSurface.evidenceRange);
    }
    // R18: the previous ARCH_GAIT_CATEGORICAL and ARCH_SPEED_OR_GAIT
    // magnitudes used project coefficients (RCM-P-028-KGAIT / KSPEED = 0.08)
    // without a preserved source-derived numeric calibration for the BA028 arch
    // construct. Kelly 2015 supports a gait-velocity ordering for longitudinal-
    // arch compression, and Kelly 2018 supports faster-running whole-foot
    // dissipation, but neither source supplies the retired exp(0.08*x) BA028
    // magnitude. Evidence is retained as direction/context only.
    if(context.gait==="WALK")return partial("BA028 walking-versus-running evidence is direction-only in R18; no source-calibrated gait magnitude is applied.",1,{state:RANGE_STATES.EVIDENCE_GAP,axis:"gait",value:"WALK",reason:"BA028_PROJECT_GAIT_MAGNITUDE_RETIRED_R18"});
    if(v<2.2||v>4.4)return partial("BA028 project speed magnitude is retired; speed remains context only.",1,{state:RANGE_STATES.OUT_OF_RANGE,axis:"speedMps",value:v,domain:[2.2,4.4],reason:"BA028_PROJECT_SPEED_MAGNITUDE_RETIRED_R18"});
    return partial("BA028 speed evidence is direction/context only in R18; no source-calibrated arch speed magnitude is applied.",1,{state:RANGE_STATES.EVIDENCE_GAP,axis:"speedMps",value:v,domain:[2.2,4.4],reason:"BA028_PROJECT_SPEED_MAGNITUDE_RETIRED_R18"});
  }
  return routeResult(1,"CALCULATED",[],[],[],[],[],FULL_COVERAGE,evidenceGap("REFERENCE_CONDITION_NO_ACTIVE_NUMERIC_ROUTE"));
}

// Formula-level Authority evaluator. It accepts independent source/project coordinates for reproducible legacy oracles.
export function evaluateAuthorityScenario(scenario,parameterOverrides={}){
  const p=resolveParameters(parameterOverrides); const q=scenario.distance??p["RCM-P-GLOBAL-QREF"]; if(q<.5||q>20)return Object.fromEntries(REGIONS.map(r=>[r.id,{index:null,state:"OUT_OF_SUPPORTED_RANGE"}]));
  const results={};
  for(const region of REGIONS){const rid=region.id;let cr=1;let state="CALCULATED";const v=scenario.speed??p["RCM-P-GLOBAL-VREF"],g=scenario.projectGrade??scenario.grade??0;
    const projectV=scenario.projectSpeed??((scenario.sourceFamily==="cadence"||scenario.gait==="WALK")?p["RCM-P-GLOBAL-VREF"]:v);
    try{
      if(["BA-DISP-019","BA-DISP-021","BA-DISP-025"].includes(rid)&&scenario.sourceFamily){const x=scenario.sourceFamily==="speed"?v:scenario.sourceFamily==="grade"?(scenario.sourceGrade??scenario.grade??0):(scenario.cadenceDelta??0);cr=logInterpolate(SOURCE_CURVES[rid][scenario.sourceFamily],x);}
      else if(rid==="BA-DISP-014")cr=boundedFactor(p["RCM-P-014-KSPEED"]*(projectV-p["RCM-P-GLOBAL-VREF"])+p["RCM-P-014-KUP"]*Math.max(g,0)+p["RCM-P-014-KDOWN"]*Math.max(-g,0),p["RCM-P-GLOBAL-BPROJECT"]);
      else if(rid==="BA-DISP-015")cr=boundedFactor(p["RCM-P-015-KSPEED"]*(projectV-p["RCM-P-GLOBAL-VREF"]),p["RCM-P-GLOBAL-BPROJECT"]);
      else if(rid==="BA-DISP-016"){cr=boundedFactor(p["RCM-P-016-KUP"]*Math.max(g,0),p["RCM-P-GLOBAL-BPROJECT"]);if(scenario.unevenExact)cr*=1.07;}
      else if(rid==="BA-DISP-018"){cr=scenario.unevenExact?1.19:1;if(scenario.selectedGradeRoute)cr*=boundedFactor(p["RCM-P-018-KGRADE"]*Math.max(g,0),p["RCM-P-GLOBAL-BPROJECT"]);}
      else if(rid==="BA-DISP-023"){const sol=boundedFactor(p["RCM-P-023-KSOLSPD"]*(projectV-p["RCM-P-GLOBAL-VREF"]),p["RCM-P-GLOBAL-BPROJECT"]);let gas=boundedFactor(p["RCM-P-023-KGASSPD"]*(projectV-p["RCM-P-GLOBAL-VREF"]),p["RCM-P-GLOBAL-BPROJECT"]);if(scenario.gastroExact)gas=logInterpolate(GASTRO_GRADE_CURVE,g);cr=Math.exp(p["RCM-P-023-WSOL"]*Math.log(sol)+p["RCM-P-023-WGAS"]*Math.log(gas));}
      else if(rid==="BA-DISP-024")cr=scenario.unevenExact?p["RCM-P-024-WPOS"]*.78+p["RCM-P-024-WNEG"]*.82:1;
      else if(rid==="BA-DISP-027"||rid==="BA-DISP-029"){const surf=scenario.surface??"Asphalt";if(SURFACE_CURVES[rid][surf]==null)throw new RangeError("OUT_OF_SOURCE_DOMAIN");cr=SURFACE_CURVES[rid][surf];}
      else if(rid==="BA-DISP-028"){cr=1;}
      const exposure=Math.pow(q/p["RCM-P-GLOBAL-QREF"],p["RCM-P-GLOBAL-ALPHAE"]);const stateLog=p["RCM-P-GLOBAL-BETASTATE"]*Math.max(0,Math.min(1,scenario.stateNorm??0));results[rid]={index:100*cr*exposure*Math.exp(stateLog),state};
    }catch{results[rid]={index:null,state:"OUT_OF_SUPPORTED_RANGE"};}
  }
  return results;
}
