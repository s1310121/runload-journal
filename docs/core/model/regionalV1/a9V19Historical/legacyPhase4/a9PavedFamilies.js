const EPS=1e-10;
const near=(a,b,eps=EPS)=>Number.isFinite(a)&&Math.abs(a-b)<=eps;
const ratio=(value,reference)=>value/reference;

export const A9_PAVED_FAMILY_VERSION="RunLoad-A9-paved-direct-provisional-v2.0";

export const A9_PAVED_FAMILIES=Object.freeze({
  BA019:Object.freeze({
    regionId:"BA-DISP-019",
    constructId:"PEAK_PATELLAR_TENDON_FORCE_CONDITION_RESPONSE",
    referenceDefinitionId:"A9-RDEF-019-BRUND2021-PEAK-PTF-ASPHALT-10KMH-5102N",
    referenceValue:5102,
    unit:"N",
    direct:Object.freeze({
      routeId:"A9-BRUND-019-PTF-DIRECT",
      source:"Brund et al. 2021",
      speedAxis:"speedKmh",
      knots:Object.freeze([10,12,14]),
      raw:Object.freeze([5102,5361,5337]),
      evidenceClass:"DIRECT_TARGET_ENVIRONMENT_GROUP_KNOT_INTERPOLATION",
      signature:"BA-DISP-019|PEAK_PTF|BRUND_TABLES2_10KMH_5102N|DIRECT_KNOT_INTERP_V1"
    }),
    provisional:Object.freeze({
      routeId:"A9-PROV-BRUND-019-PTF-BELOW10",
      min:8,maxExclusive:10,slope:59,
      evidenceClass:"PROVISIONAL_ESTIMATE_OUTSIDE_DIRECT_ASPHALT_DOMAIN",
      uncertaintyClass:"PROVISIONAL_ESTIMATE_OUTSIDE_DIRECT_ASPHALT_DOMAIN",
      signature:"BA-DISP-019|PEAK_PTF|BRUND_TABLES2_10KMH_5102N|BRUND59_EXT_V1"
    })
  }),
  BA021:Object.freeze({
    regionId:"BA-DISP-021",
    constructId:"RESULTANT_3D_PEAK_TIBIAL_ACCELERATION_CONDITION_RESPONSE",
    referenceDefinitionId:"A9-RDEF-021-UEBERSCHAR2026-ROAD-PTA-V1-7P5G",
    referenceValue:7.5,
    unit:"g",
    direct:Object.freeze({
      routeId:"A9-UEB-021-PTA-ROAD-DIRECT",
      source:"Ueberschär et al. 2026",
      speedAxis:"speedMps",
      knots:Object.freeze([2.611111111,3.527777778,4.138888889]),
      raw:Object.freeze([7.5,11.1,13.3]),
      evidenceClass:"DIRECT_TARGET_ENVIRONMENT_GROUP_KNOT_INTERPOLATION",
      signature:"BA-DISP-021|RESULTANT_PTA|UEB_ROAD_V1_2P611111_7P5G|DIRECT_KNOT_INTERP_V1"
    }),
    provisional:Object.freeze({
      routeId:"A9-PROV-UEB-021-PTA-BELOWV1",
      min:2.3611,maxExclusive:2.611111111,slope:3.927272727,
      evidenceClass:"PROVISIONAL_ESTIMATE_OUTSIDE_DIRECT_ROAD_GROUP_DOMAIN",
      uncertaintyClass:"PROVISIONAL_GROUP_RESPONSE_EXTENSION_WITHIN_OBSERVED_V1_PARTICIPANT_SPEED_FLOOR",
      signature:"BA-DISP-021|RESULTANT_PTA|UEB_ROAD_V1_2P611111_7P5G|ROAD_LOCAL_EXT_V1"
    })
  }),
  BA025:Object.freeze({
    regionId:"BA-DISP-025",
    constructId:"PEAK_ACHILLES_TENDON_FORCE_CONDITION_RESPONSE",
    referenceDefinitionId:"A9-RDEF-025-BRUND2021-PEAK-ACHILLES-FORCE-ASPHALT-10KMH-4562N",
    referenceValue:4562,
    unit:"N",
    direct:Object.freeze({
      routeId:"A9-BRUND-025-ACHILLES-PEAK-DIRECT",
      source:"Brund et al. 2021",
      speedAxis:"speedKmh",
      knots:Object.freeze([10,12,14]),
      raw:Object.freeze([4562,5165,5709]),
      evidenceClass:"DIRECT_TARGET_ENVIRONMENT_GROUP_KNOT_INTERPOLATION",
      signature:"BA-DISP-025|PEAK_ACHILLES_FORCE|BRUND_TABLES2_10KMH_4562N|DIRECT_KNOT_INTERP_V1"
    }),
    provisional:Object.freeze({
      routeId:"A9-PROV-BRUND-025-ACHILLES-BELOW10",
      min:9,maxExclusive:10,slope:309,
      evidenceClass:"PROVISIONAL_ESTIMATE_OUTSIDE_DIRECT_ASPHALT_DOMAIN",
      uncertaintyClass:"PROVISIONAL_ESTIMATE_OUTSIDE_DIRECT_ASPHALT_DOMAIN",
      signature:"BA-DISP-025|PEAK_ACHILLES_FORCE|BRUND_TABLES2_10KMH_4562N|BRUND309_EXT_V1"
    })
  })
});

function linearInterpolate(xs,ys,x){
  if(!Number.isFinite(x)||xs.length!==ys.length||xs.length<2)return null;
  for(let i=0;i<xs.length;i++)if(near(x,xs[i],1e-9))return ys[i];
  if(x<xs[0]-EPS||x>xs.at(-1)+EPS)return null;
  for(let i=0;i<xs.length-1;i++){
    if(x>=xs[i]-EPS&&x<=xs[i+1]+EPS){
      const t=(x-xs[i])/(xs[i+1]-xs[i]);
      return ys[i]+t*(ys[i+1]-ys[i]);
    }
  }
  return null;
}
function isRun(context){return context?.gait==="RUN";}
function isOutdoor(context){return context?.runSetting==="OUTDOOR";}
function isLevel(context){return Number.isFinite(Number(context?.gradePercent))&&near(Number(context.gradePercent),0,1e-9);}
function componentIsPaved(component={}){
  const user=String(component.userCategory??"").toUpperCase();
  const exact=String(component.exactSourceCategory??"").toUpperCase();
  const id=String(component.componentId??"").toUpperCase();
  return user==="PAVED"||exact==="ASPHALT"||id==="PAVED"||id==="ASPHALT"||id==="ORDINARY-PAVED"||id==="ORDINARY_PAVED";
}
export function isAuthorizedOrdinaryPaved(context={}){
  const comps=Array.isArray(context.surfaceComponents)?context.surfaceComponents:[];
  if(!comps.length)return false;
  const positive=comps.filter(c=>Number(c.sharePercent)>0);
  if(!positive.length||!positive.every(componentIsPaved))return false;
  const total=positive.reduce((s,c)=>s+Number(c.sharePercent),0);
  return Math.abs(total-100)<=1e-6;
}
function responseObject(family,route,rawValue,speedValue,tier,geometry,uncertaintyClass=null){
  return {
    ratio:ratio(rawValue,family.referenceValue),state:"PARTIAL",routes:[route.routeId],interactions:[],sources:[route.source??family.direct.source],parameters:[],
    trace:[{traceCode:tier==="FORMAL_DIRECT_IN_DOMAIN"?"A9_DIRECT_PAVED_SOURCE_FAMILY":"A9_AUTHORIZED_PROVISIONAL_PAVED_EXTENSION",message:tier==="FORMAL_DIRECT_IN_DOMAIN"?"Uses adjacent-knot interpolation inside an authorized direct target-environment source family.":"Uses a locked source-anchored provisional extension outside the direct target-environment source domain.",numericEffectApplied:true}],
    componentCoverage:{state:"PARTIAL",observedComponentIds:[family.constructId],missingComponentIds:[],normalizedWeights:{[family.constructId]:1}},
    evidenceRange:{axis:route.speedAxis??family.direct.speedAxis,geometry,referenceDefinitionId:family.referenceDefinitionId,evidenceClass:route.evidenceClass,supportTier:tier,speedValue},
    a9SemanticIdentity:{constructId:family.constructId,referenceDefinitionId:family.referenceDefinitionId,evidenceClass:route.evidenceClass},
    a9SupportTier:tier,
    a9RouteSignature:route.signature,
    a9UncertaintyClass:uncertaintyClass,
    a9SourceLayer:tier==="FORMAL_DIRECT_IN_DOMAIN"?"A9_PAVED_DIRECT":"A9_PAVED_PROVISIONAL",
    a9NativeValue:{value:rawValue,unit:family.unit,individualPrediction:false,referenceOnlyNormalization:true}
  };
}
function evaluateDirect(family,speedMps){
  const d=family.direct;
  const x=d.speedAxis==="speedKmh"?speedMps*3.6:speedMps;
  if(!Number.isFinite(x)||x<d.knots[0]-EPS||x>d.knots.at(-1)+EPS)return null;
  const raw=linearInterpolate(d.knots,d.raw,x);
  if(!Number.isFinite(raw))return null;
  return responseObject(family,d,raw,x,"FORMAL_DIRECT_IN_DOMAIN","ADJACENT_SOURCE_KNOT_INTERPOLATION");
}
function evaluateProvisional(family,speedMps){
  const p=family.provisional;
  const x=family.direct.speedAxis==="speedKmh"?speedMps*3.6:speedMps;
  if(!Number.isFinite(x)||x<p.min-EPS||x>=p.maxExclusive-EPS)return null;
  const anchorX=family.direct.knots[0];
  const raw=family.referenceValue+p.slope*(x-anchorX);
  return responseObject(family,{...p,speedAxis:family.direct.speedAxis,source:family.direct.source},raw,x,"PROVISIONAL_AUTHORIZED","LOCKED_BOUNDED_SOURCE_ANCHORED_EXTENSION",p.uncertaintyClass);
}
export function evaluateA9PavedFamily(regionId,context={},options={}){
  if(!isRun(context)||!isOutdoor(context)||!isLevel(context)||!Number.isFinite(Number(context.speedMps))||!isAuthorizedOrdinaryPaved(context))return null;
  const family=Object.values(A9_PAVED_FAMILIES).find(x=>x.regionId===regionId);
  if(!family)return null;
  const direct=evaluateDirect(family,Number(context.speedMps));
  if(direct)return direct;
  if(options.includeProvisional===false)return null;
  return evaluateProvisional(family,Number(context.speedMps));
}
