const EPS=1e-10;
const isRun=c=>c?.gait==='RUN';
const isTreadmill=c=>c?.runSetting==='TREADMILL';
const isLevel=c=>Number.isFinite(Number(c?.gradePercent))&&Math.abs(Number(c.gradePercent))<=1e-9;
const ratio=(v,r)=>v/r;
const V0=3.0, V1=11/3.6, V2=13/3.6, V3=15/3.6, VMAX=5.0;
const linear=(x0,y0,x1,y1,x)=>y0+(y1-y0)*(x-x0)/(x1-x0);

export const A9_FCR_HIGHSPEED_VERSION='RunLoad-A9-FCR-highspeed-domain-v1.1-rf09';

// Ho 2010 same-endpoint handoff values at V1 are obtained by continuing only the final 2.0->2.5 source segment.
const HO=Object.freeze({
 'BA-DISP-027':Object.freeze({ref:170.7,boundary:191.3,slope:(191.3-170.7)/0.5,constructId:'REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY',refId:'RCM-RDEF-027-A6-HO2010-HEEL-PEAK',label:'HEEL'}),
 'BA-DISP-028':Object.freeze({ref:172.9,boundary:178.2,slope:(178.2-172.9)/0.5,constructId:'MEDIAL_MIDFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY',refId:'A9-RDEF-028-HO2010-MEDIAL-MIDFOOT-PEAK-PRESSURE-2.0MPS',label:'MIDFOOT'}),
 'BA-DISP-029':Object.freeze({ref:360.7,boundary:377.8,slope:(377.8-360.7)/0.5,constructId:'MEDIAL_FOREFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY',refId:'A9-RDEF-029-HO2010-MEDIAL-FOREFOOT-PEAK-PRESSURE-2.0MPS-LEVEL',label:'FOREFOOT'}),
});
const HAZZAA=Object.freeze({
 'BA-DISP-027':Object.freeze({shape:[1,1.046456265714018,1.119648254963774],terminalSlope:0.13174558064956096}),
 'BA-DISP-028':Object.freeze({shape:[1,1.0427277276692306,1.102243163198696],terminalSlope:0.10712778395303761}),
 'BA-DISP-029':Object.freeze({shape:[1,1.0450554480975627,1.0891384179730637],terminalSlope:0.07934934577590172}),
});
function footShape(regionId,v){
 const h=HAZZAA[regionId]; if(!h)return null;
 if(v<V1-EPS||v>VMAX+EPS)return null;
 if(v<=V2+EPS)return linear(V1,h.shape[0],V2,h.shape[1],v);
 if(v<=V3+EPS)return linear(V2,h.shape[1],V3,h.shape[2],v);
 return h.shape[2]+h.terminalSlope*(v-V3);
}
function footRawAtFirst(f){return f.boundary+f.slope*(V1-2.5);}
function footRatio(regionId,v){
 const f=HO[regionId]; if(!f||v<=V0+EPS||v>VMAX+EPS)return null;
 const r0=ratio(f.boundary+f.slope*(V0-2.5),f.ref);
 const r1=ratio(footRawAtFirst(f),f.ref);
 if(v<V1-EPS)return linear(V0,r0,V1,r1,v);
 const shape=footShape(regionId,v); return Number.isFinite(shape)?r1*shape:null;
}
function footResult(regionId,v){
 const f=HO[regionId], r=footRatio(regionId,v); if(!Number.isFinite(r)||r<=0)return null;
 const inHazzaa=v>=V1-EPS&&v<=V3+EPS;
 const highExt=v>V3+EPS;
 const tier=inHazzaa?'PROVISIONAL_AUTHORIZED':'PROVISIONAL_AUTHORIZED';
 const phase=v<V1-EPS?'HO_TO_HAZZAA_SHORT_HANDOFF':inHazzaa?'HAZZAA_WITHIN_SOURCE_SHAPE':'HAZZAA_BOUNDED_UPPER_CONTINUATION';
 const routeId=`A9-FCR-HS-${regionId.slice(-3)}-${f.label}-V1`;
 const evidenceClass=inHazzaa?'P3_CROSS_SOURCE_DIMENSIONLESS_WITHIN_STRIKE_SHAPE':'P3_BOUNDED_HIGH_SPEED_CONTINUATION';
 const uncertainty=regionId==='BA-DISP-028'?'P3_HIGH_BROAD_MIDFOOT_TO_MEDIAL_MIDFOOT_MAPPING':regionId==='BA-DISP-027'?'P3_HIGH_HEEL_SPEED_BY_STRIKE_INTERACTION':'P3_MODERATE_FOREFOOT_PRESSURE_SHAPE_PROXY';
 return {ratio:r,state:'PARTIAL',routes:[routeId],interactions:[],sources:['HO2010_TABLE1','HAZZAA2018_TABLE2'],parameters:[],
  trace:[{traceCode:'A9_FCR_HIGHSPEED_PLANTAR_SHAPE',message:`${phase}: Ho 2010 within-region normalized handoff plus Hazzaa 2018 bilateral-baseline arithmetic mean, within-strike normalization, then FFS/RFS geometric-marginal speed shape; no raw cross-study magnitude merge.`,numericEffectApplied:true}],
  componentCoverage:{state:'PARTIAL',observedComponentIds:[f.constructId],missingComponentIds:['INDIVIDUAL_PLANTAR_LOAD_MEASUREMENT'],normalizedWeights:{[f.constructId]:1}},
  evidenceRange:{axis:'speedMps',geometry:phase,ruleId:`FCR-HS-${regionId}`,referenceDefinitionId:f.refId,evidenceClass,supportTier:tier,authorizedDomain:{minExclusive:3.0,maxInclusive:5.0},hazzaaDirectShapeDomain:{minInclusive:V1,maxInclusive:V3}},
  a9SemanticIdentity:{constructId:f.constructId,referenceDefinitionId:f.refId,evidenceClass},a9SupportTier:tier,a9RouteSignature:`${regionId}|${f.label}_PEAK_PRESSURE|HO_REF_2P0|HAZZAA_BILATERAL_BASELINE_STRIKE_MARGINAL_SHAPE|HS_V2_RF09`,a9UncertaintyClass:uncertainty,a9SourceLayer:'A9_FCR_HIGHSPEED_PLANTAR',a9NativeValue:{value:r,unit:'source_relative_ratio',individualPrediction:false,referenceOnlyNormalization:true}};
}
function ankleResult(v){
 if(!(v>4.5+EPS&&v<=5.0+EPS))return null;
 const ref=1.22,boundary=1.91,slope=(1.91-1.55)/(4.5-3.5),raw=boundary+slope*(v-4.5);
 return {ratio:raw/ref,state:'PARTIAL',routes:['A9-FCR-P1-024-FUKUCHI-HIGH-V1'],interactions:[],sources:['FUKUCHI2017_ANKLE_WORK','WILLER2024_ANKLE_WORK_CORROBORATION'],parameters:[],
 trace:[{traceCode:'A9_FCR_P1_SOURCE_ADJACENT_HIGH',message:'Fukuchi 2017 final 3.5->4.5 m/s ankle-work segment is continued only through 5.0 m/s; Willer 2024 independently corroborates increasing ankle plantar-flexor work/moment through 5.0 m/s. Raw magnitudes are not merged.',numericEffectApplied:true}],
 componentCoverage:{state:'PARTIAL',observedComponentIds:['ANKLE_TOTAL_ABSOLUTE_JOINT_WORK_SPEED_PROXY_TENDENCY'],missingComponentIds:['OUTSIDE_DIRECT_FUKUCHI_SPEED_DOMAIN','INDIVIDUAL_ANKLE_LOAD_MEASUREMENT'],normalizedWeights:{ANKLE_TOTAL_ABSOLUTE_JOINT_WORK_SPEED_PROXY_TENDENCY:1}},
 evidenceRange:{axis:'speedMps',geometry:'P1_SHORT_UPPER_SOURCE_ADJACENT_CONTINUATION',ruleId:'FCR-HS-024',referenceDefinitionId:'A9-RDEF-024-FUKUCHI2017-ANKLE-TOTAL-ABSOLUTE-WORK-2.5MPS',evidenceClass:'P1_SOURCE_ADJACENT_PROVISIONAL_WITH_EXTERNAL_DIRECTIONAL_CORROBORATION',supportTier:'PROVISIONAL_AUTHORIZED',authorizedDomain:{minExclusive:4.5,maxInclusive:5.0}},
 a9SemanticIdentity:{constructId:'ANKLE_TOTAL_ABSOLUTE_JOINT_WORK_SPEED_PROXY_TENDENCY',referenceDefinitionId:'A9-RDEF-024-FUKUCHI2017-ANKLE-TOTAL-ABSOLUTE-WORK-2.5MPS',evidenceClass:'P1_SOURCE_ADJACENT_PROVISIONAL_WITH_EXTERNAL_DIRECTIONAL_CORROBORATION'},a9SupportTier:'PROVISIONAL_AUTHORIZED',a9RouteSignature:'BA-DISP-024|FUKUCHI2017_ANKLE_TOTAL_ABS_WORK|REF_2P5_1P22JPKG|P1_HIGH_V1',a9UncertaintyClass:'P1_SOURCE_ADJACENT_UPPER_WITH_WILLER_CORROBORATION',a9SourceLayer:'A9_FCR_HIGHSPEED_ANKLE',a9NativeValue:{value:raw,unit:'J/kg',individualPrediction:false,referenceOnlyNormalization:true}};
}
export function evaluateA9FcrHighSpeedFamily(regionId,context={},options={}){
 if(options.includeProvisional===false||!isRun(context)||!isTreadmill(context)||!isLevel(context))return null;
 const v=Number(context.speedMps); if(!Number.isFinite(v))return null;
 if(regionId==='BA-DISP-024')return ankleResult(v);
 if(HO[regionId])return footResult(regionId,v);
 return null;
}
