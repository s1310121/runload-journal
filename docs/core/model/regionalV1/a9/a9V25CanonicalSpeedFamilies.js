const EPS=1e-10;
const G=9.81, LEG_LENGTH_M=0.99;
const vhat=v=>v/Math.sqrt(G*LEG_LENGTH_M);
const ratio=(v,r)=>v/r;
const near=(a,b,eps=EPS)=>Number.isFinite(a)&&Math.abs(a-b)<=eps;

function interp(xs,ys,x){
  if(!Number.isFinite(x)||xs.length!==ys.length||xs.length<2)return null;
  if(x<xs[0]-EPS||x>xs.at(-1)+EPS)return null;
  for(let i=0;i<xs.length;i++)if(near(x,xs[i]))return ys[i];
  for(let i=0;i<xs.length-1;i++){
    if(x>=xs[i]-EPS&&x<=xs[i+1]+EPS){
      const t=(x-xs[i])/(xs[i+1]-xs[i]);
      return ys[i]+t*(ys[i+1]-ys[i]);
    }
  }
  return null;
}
function terminalLinear(xs,ys,x){
  if(x<xs[0]){
    const slope=(ys[1]-ys[0])/(xs[1]-xs[0]);
    return ys[0]+slope*(x-xs[0]);
  }
  if(x>xs.at(-1)){
    const n=xs.length;
    const slope=(ys[n-1]-ys[n-2])/(xs[n-1]-xs[n-2]);
    return ys[n-1]+slope*(x-xs[n-1]);
  }
  return interp(xs,ys,x);
}
function piecewiseFamily(xs,ys,formalMin,formalMax){
  return v=>({raw:terminalLinear(xs,ys,v),formal:v>=formalMin-EPS&&v<=formalMax+EPS});
}
function modelWithTangent(rawFn,derivativeFn,formalMin,formalMax){
  const lo=rawFn(formalMin), hi=rawFn(formalMax);
  return v=>{
    if(v<formalMin)return {raw:lo+derivativeFn(formalMin)*(v-formalMin),formal:false};
    if(v>formalMax)return {raw:hi+derivativeFn(formalMax)*(v-formalMax),formal:false};
    return {raw:rawFn(v),formal:true};
  };
}
function gxRaw(v){return 0.046+0.223*vhat(v);}
function gxDerivative(){return 0.223/Math.sqrt(G*LEG_LENGTH_M);}
function hamRaw(v){const h=vhat(v);return 1.04+2.68*h-0.64*h*h;}
function hamDerivative(v){const c=1/Math.sqrt(G*LEG_LENGTH_M); const h=vhat(v); return (2.68-1.28*h)*c;}

const HAGEN_X=[8/3.6,10/3.6,12/3.6,14/3.6,16/3.6];
const HAGEN_Y=[563.11,470.14,411.02,361.11,305.97];
const HAMNER_X=[2,3,4,5], HAMNER_Y=[15.748,18.976,20.748,22.441];
const FUK_HIP_X=[2.5,3.5,4.5], FUK_HIP_Y=[1.84,2.52,3.16];
const FUK_KNEE_X=[2.5,3.5,4.5], FUK_KNEE_Y=[2.84,3.18,3.41];
const FUK_ANKLE_X=[2.5,3.5,4.5], FUK_ANKLE_Y=[1.22,1.55,1.91];
const RICE_X=[2.5,3.0,3.5], RICE_Y=[1,1.07,1.07*1.06];
const KHARAZI_X=[2.5,3.5], KHARAZI_Y=[2.284,2.556];
const HO_X=[1.5,2.0,2.5];
const HO_Y=Object.freeze({
  'BA-DISP-027':[143.6,170.7,191.3],
  'BA-DISP-028':[154.1,172.9,178.2],
  'BA-DISP-029':[339.8,360.7,377.8],
});
const HAZZAA_X=[11/3.6,13/3.6,15/3.6];
const HAZZAA_SHAPE=Object.freeze({
  'BA-DISP-027':[1,1.046456265714018,1.119648254963774],
  'BA-DISP-028':[1,1.0427277276692306,1.102243163198696],
  'BA-DISP-029':[1,1.0450554480975627,1.0891384179730637],
});
function plantar(regionId){
  const ho=HO_Y[regionId], hz=HAZZAA_SHAPE[regionId];
  return v=>{
    if(v<=2.5+EPS)return {raw:interp(HO_X,ho,v),formal:true};
    const lastSlope=(ho[2]-ho[1])/(HO_X[2]-HO_X[1]);
    const atFirst=ho[2]+lastSlope*(HAZZAA_X[0]-2.5);
    if(v<HAZZAA_X[0]) return {raw:ho[2]+lastSlope*(v-2.5),formal:false};
    let shape;
    if(v<=HAZZAA_X.at(-1)+EPS)shape=interp(HAZZAA_X,hz,v);
    else {
      const slope=(hz[2]-hz[1])/(HAZZAA_X[2]-HAZZAA_X[1]);
      shape=hz[2]+slope*(v-HAZZAA_X[2]);
    }
    return {raw:atFirst*shape,formal:false};
  };
}

const FAMILIES=Object.freeze({
 'BA-DISP-014':{constructId:'HIP_BIDIRECTIONAL_PEAK_TORQUE_ENVELOPE_SUM_PROXY',referenceDefinitionId:'A9-FCR-RDEF-014-FUKUCHI2017-HIP-BIDIR-PEAK-TORQUE-SUM-2.5MPS',referenceValue:1.84,unit:'Nm/kg',sourceIds:['FUKUCHI2017_TABLE4_HIP_BIDIR_PEAK_TORQUE_SUM'],formalSpan:[2.5,4.5],eval:piecewiseFamily(FUK_HIP_X,FUK_HIP_Y,2.5,4.5)},
 'BA-DISP-015':{constructId:'GLUTEUS_MAXIMUS_TWO_BURST_EMG_GAIN_SUM_PROXY',referenceDefinitionId:'A9-FCR-RDEF-015-GAZENDAM-GX-2P78MPS',referenceValue:gxRaw(2.78),unit:'normalized_EMG_gain_scalar',sourceIds:['GAZENDAM_HOF_2007_TABLE3_GX'],formalSpan:[2.25,4.5],eval:modelWithTangent(gxRaw,gxDerivative,2.25,4.5)},
 'BA-DISP-016':{constructId:'KNEE_EXTENSION_TORQUE_ANTERIOR_THIGH_PARTIAL_PROXY',referenceDefinitionId:'A9-FCR-RDEF-016-FUKUCHI2017-MAX-KNEE-EXT-TORQUE-2.5MPS',referenceValue:2.84,unit:'Nm/kg',sourceIds:['FUKUCHI2017_TABLE4_MAX_KNEE_EXT_TORQUE'],formalSpan:[2.5,4.5],eval:piecewiseFamily(FUK_KNEE_X,FUK_KNEE_Y,2.5,4.5)},
 'BA-DISP-018':{constructId:'HAMSTRING_GROUP_TWO_BURST_EMG_GAIN_SUM_PROXY',referenceDefinitionId:'A9-FCR-RDEF-018-GAZENDAM-HAMSTRING-2P78MPS',referenceValue:hamRaw(2.78),unit:'normalized_EMG_gain_scalar',sourceIds:['GAZENDAM_HOF_2007_TABLE3_HAMSTRING'],formalSpan:[2.25,4.5],eval:modelWithTangent(hamRaw,hamDerivative,2.25,4.5)},
 'BA-DISP-019':{constructId:'CUMULATIVE_PATELLOFEMORAL_STRESS_IMPULSE_PER_KM',referenceDefinitionId:'A9-FCR-RDEF-019-HAGEN-PFJS-IMPULSE-2P78MPS',referenceValue:interp(HAGEN_X,HAGEN_Y,2.78),unit:'MPa*s/km',sourceIds:['HAGEN_2023_TABLE2_PFJS_IMPULSE_HABITUAL'],formalSpan:[HAGEN_X[0],HAGEN_X.at(-1)],eval:piecewiseFamily(HAGEN_X,HAGEN_Y,HAGEN_X[0],HAGEN_X.at(-1))},
 'BA-DISP-021':{constructId:'PEAK_POSTERIOR_TIBIAL_STRESS_SPEED_TENDENCY_ALTERNATE',referenceDefinitionId:'A9-FCR-RDEF-021-RICE-POSTERIOR-STRESS-2P78MPS',referenceValue:interp(RICE_X,RICE_Y,2.78),unit:'source_relative_ratio',sourceIds:['RICE_2024_LEVEL_POSTERIOR_TIBIAL_STRESS_SPEED_RATIO'],formalSpan:[2.5,3.5],eval:piecewiseFamily(RICE_X,RICE_Y,2.5,3.5)},
 'BA-DISP-023':{constructId:'POSTERIOR_LOWER_LEG_MUSCLE_DEMAND_TENDENCY',referenceDefinitionId:'RCM-RDEF-023-HAMNER-COM-ACCEL',referenceValue:interp(HAMNER_X,HAMNER_Y,2.78),unit:'COM_ACCEL_PROXY',sourceIds:['RCM-ANCH-A3-040..043'],formalSpan:[2,5],eval:piecewiseFamily(HAMNER_X,HAMNER_Y,2,5)},
 'BA-DISP-024':{constructId:'ANKLE_TOTAL_ABSOLUTE_JOINT_WORK_SPEED_PROXY_TENDENCY',referenceDefinitionId:'A9-RDEF-024-FUKUCHI2017-ANKLE-TOTAL-ABSOLUTE-WORK-2.5MPS',referenceValue:1.22,unit:'J/kg',sourceIds:['A9-FUKUCHI-024-SPEED'],formalSpan:[2.5,4.5],eval:piecewiseFamily(FUK_ANKLE_X,FUK_ANKLE_Y,2.5,4.5)},
 'BA-DISP-025':{constructId:'ACHILLES_TENDON_MAXIMUM_FORCE_ALTERNATE',referenceDefinitionId:'A9-FCR-RDEF-025-KHARAZI-AT-FORCE-2P78MPS',referenceValue:interp(KHARAZI_X,KHARAZI_Y,2.78),unit:'kN',sourceIds:['KHARAZI_2021_TABLE3_MAX_ACHILLES_FORCE'],formalSpan:[2.5,3.5],eval:piecewiseFamily(KHARAZI_X,KHARAZI_Y,2.5,3.5)},
 'BA-DISP-027':{constructId:'REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY',referenceDefinitionId:'RCM-RDEF-027-A6-HO2010-HEEL-PEAK',referenceValue:170.7,unit:'kPa',sourceIds:['A6R2-HO2010-TABLE1-HEEL','HAZZAA2018_TABLE2'],formalSpan:[1.5,2.5],eval:plantar('BA-DISP-027')},
 'BA-DISP-028':{constructId:'MEDIAL_MIDFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY',referenceDefinitionId:'A9-RDEF-028-HO2010-MEDIAL-MIDFOOT-PEAK-PRESSURE-2.0MPS',referenceValue:172.9,unit:'kPa',sourceIds:['HO2010_TABLE1_M02','HAZZAA2018_TABLE2'],formalSpan:[1.5,2.5],eval:plantar('BA-DISP-028')},
 'BA-DISP-029':{constructId:'MEDIAL_FOREFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY',referenceDefinitionId:'A9-RDEF-029-HO2010-MEDIAL-FOREFOOT-PEAK-PRESSURE-2.0MPS-LEVEL',referenceValue:360.7,unit:'kPa',sourceIds:['HO2010_TABLE1_M04','HAZZAA2018_TABLE2'],formalSpan:[1.5,2.5],eval:plantar('BA-DISP-029')},
});

export const A9_V25R1_CANONICAL_SPEED_VERSION='RunLoad-V2.5R1-canonical-speed-v1.0';
export const A9_V25R1_CANONICAL_SPEED_FAMILIES=FAMILIES;

export function evaluateV25R1CanonicalSpeed(regionId,context={},options={}){
  if(context?.gait!=='RUN')return null;
  const v=Number(context.speedMps); if(!Number.isFinite(v)||v<1.5-EPS||v>5+EPS)return null;
  const f=FAMILIES[regionId]; if(!f)return null;
  const ev=f.eval(v); if(!ev||!Number.isFinite(ev.raw)||ev.raw<=0)return null;
  if(!ev.formal&&options.includeProvisional===false)return null;
  const tier=ev.formal?'FORMAL_DIRECT_IN_DOMAIN':'PROVISIONAL_AUTHORIZED';
  const familyId=`V25R1-CANONICAL-SPEED-${regionId}`;
  const evidenceClass=ev.formal?'CANONICAL_SOURCE_NATIVE_FORMAL':'CANONICAL_BOUNDED_SAME_FAMILY_PROVISIONAL';
  return {
    ratio:ratio(ev.raw,f.referenceValue),state:'PARTIAL',routes:[`${familyId}-${ev.formal?'FORMAL':'PROVISIONAL'}`],interactions:[],sources:f.sourceIds,parameters:[],
    trace:[{traceCode:'V25R1_CANONICAL_SPEED_FAMILY',message:ev.formal?'Uses the source-native canonical speed family.':'Uses the bounded continuation of the same canonical construct/reference family.',numericEffectApplied:true}],
    componentCoverage:{state:'PARTIAL',observedComponentIds:[f.constructId],missingComponentIds:['INDIVIDUAL_PHYSICAL_LOAD_NOT_MEASURED'],normalizedWeights:{[f.constructId]:1}},
    evidenceRange:{axis:'speedMps',geometry:ev.formal?'CANONICAL_SOURCE_NATIVE_FORMAL':'CANONICAL_BOUNDED_TERMINAL_CONTINUATION',canonicalFamilyId:familyId,referenceDefinitionId:f.referenceDefinitionId,evidenceClass,supportTier:tier,formalSpanMps:f.formalSpan,modelUseDomainMps:[1.5,5]},
    a9SemanticIdentity:{constructId:f.constructId,referenceDefinitionId:f.referenceDefinitionId,evidenceClass},a9SupportTier:tier,
    a9RouteSignature:`${regionId}|${f.constructId}|${f.referenceDefinitionId}|V25R1_CANONICAL`,a9CanonicalFamilyId:familyId,
    a9UncertaintyClass:ev.formal?null:'BOUNDED_SAME_FAMILY_PROVISIONAL',a9SourceLayer:'V25R1_CANONICAL_SPEED',
    a9NativeValue:{value:ev.raw,unit:f.unit,individualPrediction:false,referenceOnlyNormalization:true}
  };
}
