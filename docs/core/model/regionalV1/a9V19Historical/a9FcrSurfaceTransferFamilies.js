const EPS=1e-9;
const KNOWN_OUTDOOR_SURFACES=new Set(["PAVED","TRACK","SOIL","TRAIL","NATURAL_GRASS","ARTIFICIAL_TURF","SAND"]);
const VERY_HIGH=new Set(["SOIL","TRAIL"]);

export const A9_FCR_SURFACE_TRANSFER_VERSION="RunLoad-A9-FCR-surface-conditioned-P3-v1.0";

function fnv1a(text=""){
 let h=0x811c9dc5;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
 return h.toString(16).padStart(8,"0");
}
function knownSingleSurface(context={}){
 if(context.gait!=="RUN"||context.runSetting!=="OUTDOOR")return null;
 const g=Number(context.gradePercent); if(!Number.isFinite(g)||Math.abs(g)>EPS)return null;
 const comps=Array.isArray(context.surfaceComponents)?context.surfaceComponents:[];
 const positive=comps.filter(c=>Number(c.sharePercent)>0);
 if(positive.length!==1)return null;
 const total=positive.reduce((s,c)=>s+Number(c.sharePercent),0);if(Math.abs(total-100)>1e-6)return null;
 const surface=String(positive[0].userCategory??positive[0].componentId??"").toUpperCase();
 return KNOWN_OUTDOOR_SURFACES.has(surface)?surface:null;
}
function contextSources(surface){
 const map={
  PAVED:["Moon et al. 2025","Brund et al. 2021","Ueberschär et al. 2026"],
  TRACK:["Hollis et al. 2021","Höschler et al. 2026","Moon et al. 2025"],
  NATURAL_GRASS:["Hollis et al. 2021","Moon et al. 2025","Dolenec et al. 2015"],
  ARTIFICIAL_TURF:["Hsiao et al. 2023","Jafarnezhadgero et al. 2024"],
  SAND:["Pinnington et al. 2005","Jafarnezhadgero et al. 2022"],
  SOIL:["Dolenec et al. 2015 (gravel contextual only)"],
  TRAIL:["Genitrini et al. 2024"],
 };
 return map[surface]??[];
}
export function evaluateA9FcrSurfaceConditionedProxy(regionId,context={},sourceResult=null,options={}){
 if(options.includeProvisional===false)return null;
 const surface=knownSingleSurface(context); if(!surface)return null;
 if(!sourceResult||!Number.isFinite(sourceResult.ratio)||sourceResult.ratio<=0||(sourceResult.routes?.length??0)===0)return null;
 const srcSem=sourceResult.a9SemanticIdentity??{};
 const srcRef=String(srcSem.referenceDefinitionId??`UNKNOWN_REF_${regionId}`);
 const srcConstruct=String(srcSem.constructId??`UNKNOWN_CONSTRUCT_${regionId}`);
 const srcSig=String(sourceResult.a9RouteSignature??sourceResult.routes.join("+"));
 const refHash=fnv1a(srcRef), sigHash=fnv1a(srcSig);
 const routeId=`A9-FCR-SURF-${surface}-${regionId}-${refHash}`;
 const proxyConstruct=`FCR_SURFACE_CONDITIONED_REGIONAL_SPEED_RESPONSE_PROXY__${regionId}__${fnv1a(srcConstruct)}`;
 const refId=`A9-FCR-SURF-RDEF-${surface}-${regionId}-${refHash}`;
 const uncertainty=VERY_HIGH.has(surface)?"P3_VERY_HIGH_GENERIC_SURFACE_SPEED_PROXY":"P3_HIGH_SURFACE_CONDITIONED_SPEED_PROXY";
 return {
  ratio:sourceResult.ratio,state:"PARTIAL",routes:[routeId],interactions:[],
  sources:[...new Set(sourceResult.sources??[])],parameters:[],
  trace:[
   {traceCode:"A9_FCR_P3_SURFACE_CONDITIONED_SPEED_PROXY",message:"Uses the audited region-specific dimensionless level-running speed-response shape inside a new target-surface-specific provisional proxy identity.",numericEffectApplied:true},
   {traceCode:"SURFACE_MAIN_EFFECT_UNQUANTIFIED",message:"No numerical surface multiplier is applied. Equal proxy ratios across generic surfaces do not mean equal biomechanical surface effects.",numericEffectApplied:false},
   {traceCode:"NO_ABSOLUTE_ENVIRONMENT_MAGNITUDE_TRANSFER",message:"Raw force/stress/EMG/pressure/work/acceleration magnitude from the source environment is not transported to the target surface.",numericEffectApplied:false}
  ],
  componentCoverage:{state:"PARTIAL",observedComponentIds:[proxyConstruct],missingComponentIds:["NUMERIC_SURFACE_MAIN_EFFECT_UNQUANTIFIED"],normalizedWeights:{[proxyConstruct]:1}},
  evidenceRange:{axis:"speedMps",geometry:"P3_SURFACE_CONDITIONED_NORMALIZED_SPEED_SHAPE_PROXY",ruleId:"A9-FCR-SURFACE-P3-V1",referenceDefinitionId:refId,evidenceClass:"PROJECT_DERIVED_P3_SURFACE_CONDITIONED_REGIONAL_SPEED_PROXY",supportTier:"PROVISIONAL_AUTHORIZED",targetSurface:surface,sourceEnvironment:"TREADMILL_LEVEL",sourceReferenceDefinitionId:srcRef,sourceConstructId:srcConstruct,sourceSupportTier:sourceResult.a9SupportTier??null,surfaceMainEffectQuantified:false,absoluteMagnitudeTransported:false},
  a9SemanticIdentity:{constructId:proxyConstruct,referenceDefinitionId:refId,evidenceClass:"PROJECT_DERIVED_P3_SURFACE_CONDITIONED_REGIONAL_SPEED_PROXY"},
  a9SupportTier:"PROVISIONAL_AUTHORIZED",
  a9RouteSignature:`${regionId}|FCR_SURFACE_SPEED_PROXY|${surface}|SRCREF_${refHash}|SRCSIG_${sigHash}|V1`,
  a9UncertaintyClass:uncertainty,
  a9SourceLayer:"A9_FCR_SURFACE_P3_PROXY",
  a9NativeValue:{value:sourceResult.ratio,unit:"dimensionless_relative_response",individualPrediction:false,referenceOnlyNormalization:true,sourceNativeMagnitudeTransferred:false},
  a9SurfaceTransfer:{targetSurface:surface,sourceEnvironment:"TREADMILL_LEVEL",surfaceMainEffectQuantified:false,absoluteMagnitudeTransported:false,underlyingSourceTier:sourceResult.a9SupportTier??null,underlyingSourceRouteSignature:srcSig,contextualChallengeSources:contextSources(surface)}
 };
}
