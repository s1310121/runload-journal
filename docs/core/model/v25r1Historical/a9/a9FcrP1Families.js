const EPS=1e-10;
const near=(a,b,eps=EPS)=>Number.isFinite(a)&&Math.abs(a-b)<=eps;
const ratio=(value,reference)=>value/reference;

export const A9_FCR_P1_VERSION="RunLoad-A9-FCR-P1-source-adjacent-v1.2";

export const A9_FCR_P1_FAMILIES=Object.freeze({
  BA024:Object.freeze({
    ruleId:"FCR-P1-024-LOW",regionId:"BA-DISP-024",routeId:"A9-FCR-P1-024-FUKUCHI-LOW",
    source:"Fukuchi et al. 2017",sourceId:"A9-FUKUCHI-024-SPEED",
    constructId:"ANKLE_TOTAL_ABSOLUTE_JOINT_WORK_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-024-FUKUCHI2017-ANKLE-TOTAL-ABSOLUTE-WORK-2.5MPS",referenceValue:1.22,unit:"J/kg",
    minInclusive:1.5,maxExclusive:2.5,
    rawAtBoundary:1.22,boundarySpeed:2.5,slope:(1.55-1.22)/(3.5-2.5),
    evidenceClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    uncertaintyClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    signature:"BA-DISP-024|FUKUCHI2017_ANKLE_TOTAL_ABS_WORK|REF_2P5_1P22JPKG|P1_EXT_V1"
  }),
  BA023:Object.freeze({
    ruleId:"FCR-P1-023-LOW",regionId:"BA-DISP-023",routeId:"A9-FCR-P1-023-HAMNER-LOW",
    source:"Hamner et al. 2013",sourceId:"RCM-ANCH-A3-040..043",
    constructId:"POSTERIOR_LOWER_LEG_MUSCLE_DEMAND_TENDENCY",
    referenceDefinitionId:"RCM-RDEF-023-HAMNER-COM-ACCEL",referenceValue:18.26584,unit:"COM_ACCEL_PROXY",
    minInclusive:1.5,maxExclusive:2.0,
    rawAtBoundary:15.748,boundarySpeed:2.0,slope:18.976-15.748,
    evidenceClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    uncertaintyClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    signature:"BA-DISP-023|HAMNER_COM_ACCEL_PROXY|REF_2P78_PROJECT_INTERP_18P26584|P1_EXT_V1"
  }),
  BA027:Object.freeze({
    ruleId:"FCR-P1-027-HIGH",regionId:"BA-DISP-027",routeId:"A9-FCR-P1-027-HO-HEEL-HIGH",
    source:"Ho et al. 2010",sourceId:"A6R2-HO2010-TABLE1-HEEL",
    constructId:"REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",
    referenceDefinitionId:"RCM-RDEF-027-A6-HO2010-HEEL-PEAK",referenceValue:170.7,unit:"kPa",
    minExclusive:2.5,maxInclusive:3.0,
    rawAtBoundary:191.3,boundarySpeed:2.5,slope:(191.3-170.7)/(2.5-2.0),
    evidenceClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    uncertaintyClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    signature:"BA-DISP-027|HO2010_HEEL_PEAK_PRESSURE|REF_2P0_170P7KPA|P1_EXT_V1"
  }),
  BA028:Object.freeze({
    ruleId:"FCR-P1-028-HIGH",regionId:"BA-DISP-028",routeId:"A9-FCR-P1-028-HO-MIDFOOT-HIGH",
    source:"Ho et al. 2010",sourceId:"HO2010_TABLE1_M02",
    constructId:"MEDIAL_MIDFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-028-HO2010-MEDIAL-MIDFOOT-PEAK-PRESSURE-2.0MPS",referenceValue:172.9,unit:"kPa",
    minExclusive:2.5,maxInclusive:3.0,
    rawAtBoundary:178.2,boundarySpeed:2.5,slope:(178.2-172.9)/(2.5-2.0),
    evidenceClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    uncertaintyClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    signature:"BA-DISP-028|HO2010_MEDIAL_MIDFOOT_PEAK_PRESSURE|REF_2P0_172P9KPA|P1_EXT_V1"
  }),
  BA029:Object.freeze({
    ruleId:"FCR-P1-029-HIGH",regionId:"BA-DISP-029",routeId:"A9-FCR-P1-029-HO-FOREFOOT-HIGH",
    source:"Ho et al. 2010",sourceId:"HO2010_TABLE1_M04",
    constructId:"MEDIAL_FOREFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-029-HO2010-MEDIAL-FOREFOOT-PEAK-PRESSURE-2.0MPS-LEVEL",referenceValue:360.7,unit:"kPa",
    minExclusive:2.5,maxInclusive:3.0,
    rawAtBoundary:377.8,boundarySpeed:2.5,slope:(377.8-360.7)/(2.5-2.0),
    evidenceClass:"P1_SOURCE_ADJACENT_PROVISIONAL_ENDPOINT_COHERENCE_V2",
    uncertaintyClass:"P1_SOURCE_ADJACENT_PROVISIONAL",
    signature:"BA-DISP-029|HO2010_MEDIAL_FOREFOOT_PEAK_PRESSURE|REF_2P0_360P7KPA|P1_EXT_V2"
  })
});

function isRun(context){return context?.gait==="RUN";}
function isTreadmill(context){return context?.runSetting==="TREADMILL";}
function isLevel(context){return Number.isFinite(Number(context?.gradePercent))&&near(Number(context.gradePercent),0,1e-9);}
function inDomain(family,v){
  if(!Number.isFinite(v))return false;
  if(family.minInclusive!=null&&v<family.minInclusive-EPS)return false;
  if(family.minExclusive!=null&&v<=family.minExclusive+EPS)return false;
  if(family.maxInclusive!=null&&v>family.maxInclusive+EPS)return false;
  if(family.maxExclusive!=null&&v>=family.maxExclusive-EPS)return false;
  return true;
}
function rawValue(family,v){return family.rawAtBoundary+family.slope*(v-family.boundarySpeed);}

export function evaluateA9FcrP1Family(regionId,context={},options={}){
  if(options.includeProvisional===false||!isRun(context)||!isTreadmill(context)||!isLevel(context))return null;
  const family=Object.values(A9_FCR_P1_FAMILIES).find(x=>x.regionId===regionId);
  if(!family)return null;
  const v=Number(context.speedMps);
  if(!inDomain(family,v))return null;
  const raw=rawValue(family,v);
  if(!Number.isFinite(raw)||raw<=0)return null;
  return {
    ratio:ratio(raw,family.referenceValue),state:"PARTIAL",routes:[family.routeId],interactions:[],sources:[family.sourceId],parameters:[],
    trace:[{traceCode:"A9_FCR_P1_SOURCE_ADJACENT_PROVISIONAL",message:`${family.ruleId} uses the frozen source-adjacent one-segment continuation only inside its Authority-bounded domain.`,numericEffectApplied:true}],
    componentCoverage:{state:"PARTIAL",observedComponentIds:[family.constructId],missingComponentIds:["OUTSIDE_DIRECT_SOURCE_SPEED_DOMAIN"],normalizedWeights:{[family.constructId]:1}},
    evidenceRange:{axis:"speedMps",geometry:"LOCKED_ONE_SEGMENT_SOURCE_ADJACENT_EXTENSION",ruleId:family.ruleId,referenceDefinitionId:family.referenceDefinitionId,evidenceClass:family.evidenceClass,supportTier:"PROVISIONAL_AUTHORIZED",sourceBoundarySpeedMps:family.boundarySpeed,authorizedDomain:{minInclusive:family.minInclusive??null,minExclusive:family.minExclusive??null,maxInclusive:family.maxInclusive??null,maxExclusive:family.maxExclusive??null}},
    a9SemanticIdentity:{constructId:family.constructId,referenceDefinitionId:family.referenceDefinitionId,evidenceClass:family.evidenceClass},
    a9SupportTier:"PROVISIONAL_AUTHORIZED",
    a9RouteSignature:family.signature,
    a9UncertaintyClass:family.uncertaintyClass,
    a9SourceLayer:"A9_FCR_P1_SOURCE_ADJACENT",
    a9NativeValue:{value:raw,unit:family.unit,individualPrediction:false,referenceOnlyNormalization:true}
  };
}
