const EPS=1e-10;
const near=(a,b,eps=EPS)=>Number.isFinite(a)&&Math.abs(a-b)<=eps;
const ratio=(value,reference)=>value/reference;

export const A9_FCR_P3_VERSION="RunLoad-A9-FCR-P3-alternate-construct-v1.1";

export const A9_FCR_P3_FAMILIES=Object.freeze({
  BA014:Object.freeze({
    ruleId:"FCR-P3-014-FUKUCHI-HIP-TORQUE-ENVELOPE",regionId:"BA-DISP-014",
    source:"Fukuchi et al. 2017 Table 4",sourceId:"FUKUCHI2017_TABLE4_HIP_BIDIR_PEAK_TORQUE_SUM",
    constructId:"HIP_BIDIRECTIONAL_PEAK_TORQUE_ENVELOPE_SUM_PROXY",
    referenceDefinitionId:"A9-FCR-RDEF-014-FUKUCHI2017-HIP-BIDIR-PEAK-TORQUE-SUM-2.5MPS",
    referenceValue:1.84,unit:"Nm/kg",boundarySpeed:2.5,rawAtBoundary:1.84,slope:(2.52-1.84)/(3.5-2.5),
    provisionalMinInclusive:1.5,provisionalMaxExclusive:2.5,directMinInclusive:2.5,directMaxExclusive:2.78,
    provisionalRouteId:"A9-FCR-P3-014-FUKUCHI-HIPTORQUE-PROVISIONAL",directRouteId:"A9-FCR-P3-014-FUKUCHI-HIPTORQUE-DIRECT",
    provisionalEvidenceClass:"P3_ALTERNATE_CONSTRUCT_SOURCE_ADJACENT_PROVISIONAL",directEvidenceClass:"WITHIN_SOURCE_PROJECT_DERIVED_PARTIAL_PROXY_ALTERNATE_CONSTRUCT",
    uncertaintyClass:"P3_ALTERNATE_CONSTRUCT_SOURCE_ADJACENT_PROVISIONAL",
    provisionalSignature:"BA-DISP-014|FUKUCHI2017_HIP_BIDIR_PEAK_TORQUE_SUM|REF_2P5_1P84NMPKG|P3_ALT_EXT_V1",
    directSignature:"BA-DISP-014|FUKUCHI2017_HIP_BIDIR_PEAK_TORQUE_SUM|REF_2P5_1P84NMPKG|DIRECT_SPEED_LINE_V1",
    missingComponentIds:Object.freeze(["SIMULTANEOUS_PHYSICAL_RESULTANT_NOT_CLAIMED","DIRECT_MUSCLE_FORCE","DIRECT_TISSUE_LOAD"]),
    directMessage:"Fukuchi 2017 hip flexion/extension peak torques are combined by the frozen within-source bidirectional-envelope derivation and used inside source speed domain as a hip-region partial proxy.",
    provisionalMessage:"The frozen source-adjacent continuation of the Fukuchi bidirectional hip peak-torque-envelope scalar is used below its lowest direct source speed as an alternate-construct provisional estimate."
  }),
  BA016:Object.freeze({
    ruleId:"FCR-P3-016-FUKUCHI-KNEEEXT",regionId:"BA-DISP-016",
    source:"Fukuchi et al. 2017 Table 4",sourceId:"FUKUCHI2017_TABLE4_MAX_KNEE_EXT_TORQUE",
    constructId:"KNEE_EXTENSION_TORQUE_ANTERIOR_THIGH_PARTIAL_PROXY",
    referenceDefinitionId:"A9-FCR-RDEF-016-FUKUCHI2017-MAX-KNEE-EXT-TORQUE-2.5MPS",
    referenceValue:2.84,unit:"Nm/kg",boundarySpeed:2.5,rawAtBoundary:2.84,slope:(3.18-2.84)/(3.5-2.5),
    provisionalMinInclusive:1.5,provisionalMaxExclusive:2.5,directMinInclusive:2.5,directMaxExclusive:2.78,
    provisionalRouteId:"A9-FCR-P3-016-FUKUCHI-KNEEEXT-PROVISIONAL",directRouteId:"A9-FCR-P3-016-FUKUCHI-KNEEEXT-DIRECT",
    provisionalEvidenceClass:"P3_ALTERNATE_CONSTRUCT_SOURCE_ADJACENT_PROVISIONAL",directEvidenceClass:"DIRECT_SOURCE_PARTIAL_PROXY_ALTERNATE_CONSTRUCT",
    uncertaintyClass:"P3_ALTERNATE_CONSTRUCT_SOURCE_ADJACENT_PROVISIONAL",
    provisionalSignature:"BA-DISP-016|FUKUCHI2017_MAX_KNEE_EXT_TORQUE|REF_2P5_2P84NMPKG|P3_ALT_EXT_V1",
    directSignature:"BA-DISP-016|FUKUCHI2017_MAX_KNEE_EXT_TORQUE|REF_2P5_2P84NMPKG|DIRECT_SPEED_LINE_V1",
    missingComponentIds:Object.freeze(["DIRECT_QUADRICEPS_FORCE","DIRECT_TISSUE_LOAD"]),
    directMessage:"Fukuchi 2017 maximum knee-extension torque is used inside the source speed domain as a distinct anterior-thigh partial proxy.",
    provisionalMessage:"The frozen source-adjacent Fukuchi knee-extension-torque continuation is used only below the lowest direct source speed and remains an alternate-construct provisional estimate."
  })
});
function isRun(c){return c?.gait==="RUN";} function isTreadmill(c){return c?.runSetting==="TREADMILL";} function isLevel(c){return Number.isFinite(Number(c?.gradePercent))&&near(Number(c.gradePercent),0,1e-9);}
function rawValue(f,v){return f.rawAtBoundary+f.slope*(v-f.boundarySpeed);} function inRange(v,minInclusive,maxExclusive){return Number.isFinite(v)&&v>=minInclusive-EPS&&v<maxExclusive-EPS;}
export function evaluateA9FcrP3Family(regionId,context={},options={}){
  if(!isRun(context)||!isTreadmill(context)||!isLevel(context))return null;
  const f=Object.values(A9_FCR_P3_FAMILIES).find(x=>x.regionId===regionId);if(!f)return null;
  const v=Number(context.speedMps);let tier=null,routeId=null,evidenceClass=null,signature=null,uncertaintyClass=null,geometry=null,message=null;
  if(inRange(v,f.directMinInclusive,f.directMaxExclusive)){tier="FORMAL_DIRECT_IN_DOMAIN";routeId=f.directRouteId;evidenceClass=f.directEvidenceClass;signature=f.directSignature;uncertaintyClass=null;geometry="BOUNDED_DIRECT_SOURCE_SEGMENT";message=f.directMessage;}
  else if(options.includeProvisional!==false&&inRange(v,f.provisionalMinInclusive,f.provisionalMaxExclusive)){tier="PROVISIONAL_AUTHORIZED";routeId=f.provisionalRouteId;evidenceClass=f.provisionalEvidenceClass;signature=f.provisionalSignature;uncertaintyClass=f.uncertaintyClass;geometry="LOCKED_ONE_SEGMENT_SOURCE_ADJACENT_EXTENSION";message=f.provisionalMessage;}
  else return null;
  const raw=rawValue(f,v);if(!Number.isFinite(raw)||raw<=0)return null;
  return {ratio:ratio(raw,f.referenceValue),state:"PARTIAL",routes:[routeId],interactions:[],sources:[f.sourceId],parameters:[],
    trace:[{traceCode:tier==="FORMAL_DIRECT_IN_DOMAIN"?"A9_FCR_P3_DIRECT_ALTERNATE_CONSTRUCT":"A9_FCR_P3_ALTERNATE_CONSTRUCT_PROVISIONAL",message,numericEffectApplied:true}],
    componentCoverage:{state:"PARTIAL",observedComponentIds:[f.constructId],missingComponentIds:f.missingComponentIds,normalizedWeights:{[f.constructId]:1}},
    evidenceRange:{axis:"speedMps",geometry,ruleId:f.ruleId,referenceDefinitionId:f.referenceDefinitionId,evidenceClass,supportTier:tier,sourceBoundarySpeedMps:f.boundarySpeed,authorizedDomain:tier==="FORMAL_DIRECT_IN_DOMAIN"?{minInclusive:f.directMinInclusive,maxExclusive:f.directMaxExclusive}:{minInclusive:f.provisionalMinInclusive,maxExclusive:f.provisionalMaxExclusive},existingHigherSpeedPrecedence:"WILLER2024_FROM_2P78"},
    a9SemanticIdentity:{constructId:f.constructId,referenceDefinitionId:f.referenceDefinitionId,evidenceClass},a9SupportTier:tier,a9RouteSignature:signature,a9UncertaintyClass:uncertaintyClass,
    a9SourceLayer:tier==="FORMAL_DIRECT_IN_DOMAIN"?"A9_FCR_P3_DIRECT_ALTERNATE":"A9_FCR_P3_PROVISIONAL_ALTERNATE",a9NativeValue:{value:raw,unit:f.unit,individualPrediction:false,referenceOnlyNormalization:true}};
}
