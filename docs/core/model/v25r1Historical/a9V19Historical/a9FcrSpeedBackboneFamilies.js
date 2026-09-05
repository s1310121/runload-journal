const EPS=1e-10;
const G=9.81, LEG_LENGTH_M=0.99, HANDOFF_MPS=2.78;
const vhat=v=>v/Math.sqrt(G*LEG_LENGTH_M);
const isRun=c=>c?.gait==='RUN';
const isTreadmill=c=>c?.runSetting==='TREADMILL';
const isLevel=c=>Number.isFinite(Number(c?.gradePercent))&&Math.abs(Number(c.gradePercent))<=1e-9;
const inRange=(v,min,maxExclusive)=>Number.isFinite(v)&&v>=min-EPS&&v<maxExclusive-EPS;
const inRangeInclusive=(v,min,maxInclusive)=>Number.isFinite(v)&&v>=min-EPS&&v<=maxInclusive+EPS;
const ratio=(raw,ref)=>raw/ref;

function gxRaw(v){return 0.046+0.223*vhat(v);}
function hamstringRaw(v){const h=vhat(v);return 1.04+2.68*h-0.64*h*h;}
const HAGEN_KNOTS_KMH=[8,10,12];
const HAGEN_PFJS=[563.11,470.14,411.02];
function interp(xs,ys,x){
 if(x<xs[0]-EPS||x>xs.at(-1)+EPS)return null;
 for(let i=0;i<xs.length;i++)if(Math.abs(x-xs[i])<=EPS)return ys[i];
 for(let i=0;i<xs.length-1;i++)if(x>=xs[i]-EPS&&x<=xs[i+1]+EPS){const t=(x-xs[i])/(xs[i+1]-xs[i]);return ys[i]+t*(ys[i+1]-ys[i]);}
 return null;
}
function hagenDirectRaw(v){return interp(HAGEN_KNOTS_KMH,HAGEN_PFJS,v*3.6);}
const HAGEN_LOW_SLOPE=(470.14-563.11)/2;
function hagenProvisionalRaw(v){return 563.11+HAGEN_LOW_SLOPE*(v*3.6-8);}
function riceRaw(v){return 1+0.14*(v-2.5);}
function kharaziRaw(v){return 2.284+0.272*(v-2.5);}

const REFS=Object.freeze({
 BA015:gxRaw(HANDOFF_MPS), BA018:hamstringRaw(HANDOFF_MPS), BA019:hagenDirectRaw(HANDOFF_MPS), BA021:riceRaw(HANDOFF_MPS), BA025:kharaziRaw(HANDOFF_MPS)
});

export const A9_FCR_SPEED_BACKBONE_VERSION='RunLoad-A9-FCR-speed-backbone-low-v1.0';
export const A9_FCR_SPEED_BACKBONE_FAMILIES=Object.freeze({
 BA015:Object.freeze({regionId:'BA-DISP-015',ruleId:'FCR-SB-015-GAZENDAM-GX',constructId:'GLUTEUS_MAXIMUS_TWO_BURST_EMG_GAIN_SUM_PROXY',sourceId:'GAZENDAM_HOF_2007_TABLE3_GX',referenceDefinitionId:'A9-FCR-RDEF-015-GAZENDAM-GX-2P78MPS',referenceValue:REFS.BA015,unit:'normalized_EMG_gain_scalar',directMin:2.25,directMaxInclusive:3.0,provisionalMin:1.5,provisionalMaxExclusive:2.25,directRouteId:'A9-FCR-SB-015-GAZENDAM-GX-DIRECT',provisionalRouteId:'A9-FCR-SB-015-GAZENDAM-GX-PROVISIONAL',directEvidenceClass:'WITHIN_SOURCE_FITTED_EMG_MODEL_PROJECT_DERIVED_PARTIAL_PROXY',provisionalEvidenceClass:'P3_WITHIN_SOURCE_RECORDED_SPEED_OUTSIDE_FITTED_MODEL',uncertaintyClass:'P3_HIGH_GAZENDAM_BELOW_FIT_DOMAIN',directSignature:'BA-DISP-015|GAZENDAM2007_GX_EMG_GAIN_SUM|REF_2P78|DIRECT_FIT_V1',provisionalSignature:'BA-DISP-015|GAZENDAM2007_GX_EMG_GAIN_SUM|REF_2P78|P3_LOW_V1',raw:gxRaw,missing:['DIRECT_GLUTEAL_FORCE','DIRECT_TISSUE_LOAD']}),
 BA018:Object.freeze({regionId:'BA-DISP-018',ruleId:'FCR-SB-018-GAZENDAM-HAM',constructId:'HAMSTRING_GROUP_TWO_BURST_EMG_GAIN_SUM_PROXY',sourceId:'GAZENDAM_HOF_2007_TABLE3_HAMSTRING',referenceDefinitionId:'A9-FCR-RDEF-018-GAZENDAM-HAMSTRING-2P78MPS',referenceValue:REFS.BA018,unit:'normalized_EMG_gain_scalar',directMin:2.25,directMaxExclusive:2.78,provisionalMin:1.5,provisionalMaxExclusive:2.25,directRouteId:'A9-FCR-SB-018-GAZENDAM-HAM-DIRECT',provisionalRouteId:'A9-FCR-SB-018-GAZENDAM-HAM-PROVISIONAL',directEvidenceClass:'WITHIN_SOURCE_FITTED_EMG_MODEL_PROJECT_DERIVED_PARTIAL_PROXY',provisionalEvidenceClass:'P3_WITHIN_SOURCE_RECORDED_SPEED_OUTSIDE_FITTED_MODEL',uncertaintyClass:'P3_HIGH_GAZENDAM_BELOW_FIT_DOMAIN',directSignature:'BA-DISP-018|GAZENDAM2007_HAMSTRING_GROUP_EMG_GAIN_SUM|REF_2P78|DIRECT_FIT_V1',provisionalSignature:'BA-DISP-018|GAZENDAM2007_HAMSTRING_GROUP_EMG_GAIN_SUM|REF_2P78|P3_LOW_V1',raw:hamstringRaw,missing:['DIRECT_HAMSTRING_FORCE','DIRECT_TISSUE_LOAD']}),
 BA019:Object.freeze({regionId:'BA-DISP-019',ruleId:'FCR-SB-019-HAGEN-PFJS-IMPULSE',constructId:'CUMULATIVE_PATELLOFEMORAL_STRESS_IMPULSE_PER_KM',sourceId:'HAGEN_2023_TABLE2_PFJS_IMPULSE_HABITUAL',referenceDefinitionId:'A9-FCR-RDEF-019-HAGEN-PFJS-IMPULSE-2P78MPS',referenceValue:REFS.BA019,unit:'MPa*s/km',directMin:8/3.6,directMaxExclusive:2.78,provisionalMin:1.5,provisionalMaxExclusive:8/3.6,directRouteId:'A9-FCR-SB-019-HAGEN-PFJS-IMPULSE-DIRECT',provisionalRouteId:'A9-FCR-SB-019-HAGEN-PFJS-IMPULSE-PROVISIONAL',directEvidenceClass:'DIRECT_WITHIN_SOURCE_CUMULATIVE_PFJS_ENDPOINT',provisionalEvidenceClass:'P3_SOURCE_ADJACENT_CUMULATIVE_PFJS_PROVISIONAL',uncertaintyClass:'P3_HIGH_HAGEN_BELOW_8KMH',directSignature:'BA-DISP-019|HAGEN2023_PFJS_IMPULSE_KM|REF_2P78|DIRECT_V1',provisionalSignature:'BA-DISP-019|HAGEN2023_PFJS_IMPULSE_KM|REF_2P78|P3_LOW_V1',directRaw:hagenDirectRaw,provisionalRaw:hagenProvisionalRaw,missing:['INDIVIDUAL_PFJ_STRESS_MEASUREMENT']}),
 BA021:Object.freeze({regionId:'BA-DISP-021',ruleId:'FCR-SB-021-RICE-POSTERIOR-STRESS',constructId:'PEAK_POSTERIOR_TIBIAL_STRESS_SPEED_TENDENCY_ALTERNATE',sourceId:'RICE_2024_LEVEL_POSTERIOR_TIBIAL_STRESS_SPEED_RATIO',referenceDefinitionId:'A9-FCR-RDEF-021-RICE-POSTERIOR-STRESS-2P78MPS',referenceValue:REFS.BA021,unit:'source_relative_ratio',directMin:2.5,directMaxExclusive:2.78,provisionalMin:1.5,provisionalMaxExclusive:2.5,directRouteId:'A9-FCR-SB-021-RICE-POSTERIOR-STRESS-DIRECT',provisionalRouteId:'A9-FCR-SB-021-RICE-POSTERIOR-STRESS-PROVISIONAL',directEvidenceClass:'WITHIN_SOURCE_REPORTED_RELATIVE_CHANGE_ALTERNATE_CONSTRUCT',provisionalEvidenceClass:'P3_SOURCE_ADJACENT_ALTERNATE_TIBIAL_STRESS_PROVISIONAL',uncertaintyClass:'P3_HIGH_RICE_BELOW_2P5MPS',directSignature:'BA-DISP-021|RICE2024_PEAK_POSTERIOR_TIBIAL_STRESS_SPEED|REF_2P78|DIRECT_V1',provisionalSignature:'BA-DISP-021|RICE2024_PEAK_POSTERIOR_TIBIAL_STRESS_SPEED|REF_2P78|P3_LOW_V1',raw:riceRaw,missing:['CURRENT_CUMULATIVE_TIBIAL_STRESS_IMPULSE_NOT_THIS_CONSTRUCT','INDIVIDUAL_TIBIAL_STRESS']}),
 BA025:Object.freeze({regionId:'BA-DISP-025',ruleId:'FCR-SB-025-KHARAZI-PEAK-FORCE',constructId:'ACHILLES_TENDON_MAXIMUM_FORCE_ALTERNATE',sourceId:'KHARAZI_2021_TABLE3_MAX_ACHILLES_FORCE',referenceDefinitionId:'A9-FCR-RDEF-025-KHARAZI-AT-FORCE-2P78MPS',referenceValue:REFS.BA025,unit:'kN',directMin:2.5,directMaxExclusive:2.78,provisionalMin:1.5,provisionalMaxExclusive:2.5,directRouteId:'A9-FCR-SB-025-KHARAZI-AT-FORCE-DIRECT',provisionalRouteId:'A9-FCR-SB-025-KHARAZI-AT-FORCE-PROVISIONAL',directEvidenceClass:'DIRECT_SAME_ENVIRONMENT_ALTERNATE_ACHILLES_FORCE',provisionalEvidenceClass:'P3_SOURCE_ADJACENT_ACHILLES_FORCE_PROVISIONAL',uncertaintyClass:'P3_MODERATE_HIGH_KHARAZI_BELOW_2P5MPS',directSignature:'BA-DISP-025|KHARAZI2021_MAX_ACHILLES_FORCE|REF_2P78|DIRECT_V1',provisionalSignature:'BA-DISP-025|KHARAZI2021_MAX_ACHILLES_FORCE|REF_2P78|P3_LOW_V1',raw:kharaziRaw,missing:['CURRENT_CUMULATIVE_ACHILLES_STRAIN_IMPULSE_NOT_THIS_CONSTRUCT','INDIVIDUAL_TENDON_FORCE']}),
});

export function evaluateA9FcrSpeedBackbone(regionId,context={},options={}){
 if(!isRun(context)||!isTreadmill(context)||!isLevel(context))return null;
 const v=Number(context.speedMps); const f=Object.values(A9_FCR_SPEED_BACKBONE_FAMILIES).find(x=>x.regionId===regionId);if(!f)return null;
 let direct=false, provisional=false;
 if(f.directMaxInclusive!=null)direct=inRangeInclusive(v,f.directMin,f.directMaxInclusive);else direct=inRange(v,f.directMin,f.directMaxExclusive);
 provisional=options.includeProvisional!==false&&inRange(v,f.provisionalMin,f.provisionalMaxExclusive);
 if(!direct&&!provisional)return null;
 let raw=null;
 if(f.regionId==='BA-DISP-019')raw=direct?f.directRaw(v):f.provisionalRaw(v); else raw=f.raw(v);
 if(!Number.isFinite(raw)||raw<=0||!Number.isFinite(f.referenceValue)||f.referenceValue<=0)return null;
 const tier=direct?'FORMAL_DIRECT_IN_DOMAIN':'PROVISIONAL_AUTHORIZED';
 const routeId=direct?f.directRouteId:f.provisionalRouteId;
 const evidenceClass=direct?f.directEvidenceClass:f.provisionalEvidenceClass;
 const signature=direct?f.directSignature:f.provisionalSignature;
 return {ratio:ratio(raw,f.referenceValue),state:'PARTIAL',routes:[routeId],interactions:[],sources:[f.sourceId],parameters:[],
  trace:[{traceCode:direct?'A9_FCR_SPEED_BACKBONE_DIRECT':'A9_FCR_SPEED_BACKBONE_PROVISIONAL',message:direct?'Uses the frozen source-bounded regional speed-backbone family.':'Uses the frozen explicit provisional continuation for regional speed-backbone completion.',numericEffectApplied:true},{traceCode:'BOUNDARY_REFERENCE_NORMALIZATION',message:'Reference 100 is this family\'s own value at the 2.78 m/s handoff coordinate; no cross-source raw-magnitude equivalence is claimed.',numericEffectApplied:false}],
  componentCoverage:{state:'PARTIAL',observedComponentIds:[f.constructId],missingComponentIds:f.missing,normalizedWeights:{[f.constructId]:1}},
  evidenceRange:{axis:'speedMps',geometry:direct?'BOUNDED_DIRECT_OR_SOURCE_MODEL_SPEED_FAMILY':'LOCKED_PROVISIONAL_LOW_SPEED_CONTINUATION',ruleId:f.ruleId,referenceDefinitionId:f.referenceDefinitionId,evidenceClass,supportTier:tier,authorizedDomain:direct?{minInclusive:f.directMin,maxExclusive:f.directMaxExclusive??null,maxInclusive:f.directMaxInclusive??null}:{minInclusive:f.provisionalMin,maxExclusive:f.provisionalMaxExclusive},handoffSpeedMps:HANDOFF_MPS},
  a9SemanticIdentity:{constructId:f.constructId,referenceDefinitionId:f.referenceDefinitionId,evidenceClass},a9SupportTier:tier,a9RouteSignature:signature,a9UncertaintyClass:direct?null:f.uncertaintyClass,a9SourceLayer:direct?'A9_FCR_SPEED_BACKBONE_DIRECT':'A9_FCR_SPEED_BACKBONE_PROVISIONAL',a9NativeValue:{value:raw,unit:f.unit,individualPrediction:false,referenceOnlyNormalization:true}};
}
