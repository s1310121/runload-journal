import {
  PARAMETERS,
  SOURCE_CURVES,
  SURFACE_CURVES,
  ARCH_SURFACE_CURVES,
  PFA_CURVE,
  GASTRO_GRADE_CURVE,
  GLUTE_GRADE_CURVE,
  GRADE_SPEED_PROFILE,
  UNEVENNESS_UPPER_BOUND_CURVES,
  REGIONS,
} from "./data.js";
import { boundedFactor, gradePercentToDegrees, logInterpolate, mergeState } from "./utils.js";
import {
  JOINT_GRADE_SOURCE,
  CADENCE_JOINT_WORK_SOURCE,
  VASTUS_MEDIALIS_UPHILL_SOURCE,
  FIGURE_DIGITIZED_SPEED_SOURCE,
} from "./a3-sources.js";
import { HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE } from "./a4-sources.js";

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
function routeResult(ratio=1,state="CALCULATED",routes=[],interactions=[],sources=[],parameters=[],trace=[],componentCoverage=FULL_COVERAGE){return {ratio,state,routes,interactions,sources,parameters,trace,componentCoverage};}
function partial(message,ratio=1){return routeResult(ratio,"PARTIAL",[],[],[],[],[{traceCode:"SOURCE_ROUTE_INACTIVE",message,numericEffectApplied:false}]);}
function out(message){return routeResult(null,"OUT_OF_SUPPORTED_RANGE",[],[],[],[],[{traceCode:"OUT_OF_SUPPORTED_RANGE",message,numericEffectApplied:false}]);}

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
  if(!withinRelativeTolerance(context.speedMps,JOINT_GRADE_SOURCE.speedMps,JOINT_GRADE_SOURCE.speedToleranceFraction))return null;
  const gd=gradePercentToDegrees(context.gradePercent??0);
  if(Math.abs(gd)<=1e-9)return null;
  const ratio=linearInterpolate(JOINT_GRADE_SOURCE.gradeDegrees,entry.ratios,gd);
  if(ratio==null)return out("Grade is outside SRC-SUP-003 joint-level domain.");
  return routeResult(
    ratio,
    entry.coverageState==="FULL"?"CALCULATED":"PARTIAL",
    ["A3_SRC_SUP_003_JOINT_GRADE"],
    [gd>0?"RCM-INT-001":"RCM-INT-002"],
    [entry.sourceAnchorRange],
    [],
    [{traceCode:"SOURCE_BOUNDED_JOINT_GRADE",message:`${entry.endpoint}; exact table knots with linear interpolation only.`,numericEffectApplied:true}],
    sourceCoverage(entry.endpoint,entry.coverageState),
  );
}

function a3CadenceRoute(regionId,context){
  const entry=CADENCE_JOINT_WORK_SOURCE.regions[regionId];
  const [vmin,vmax]=CADENCE_JOINT_WORK_SOURCE.speedDomainMps;
  if(!entry||context.runSetting!==CADENCE_JOINT_WORK_SOURCE.runSetting)return null;
  if(Math.abs(context.gradePercent??0)>1e-9||!Number.isFinite(context.speedMps)||context.speedMps<vmin||context.speedMps>vmax)return null;
  if(!Number.isFinite(context.cadenceSpm)||Math.abs(context.cadenceSpm-CADENCE_JOINT_WORK_SOURCE.referenceCadenceSpm)<2)return null;
  const ratio=linearInterpolate(CADENCE_JOINT_WORK_SOURCE.cadenceSpm,entry.ratiosAtModelReference,context.cadenceSpm);
  if(ratio==null)return partial("Cadence is outside the preserved E04 source protocol range.");
  return routeResult(
    ratio,
    "PARTIAL",
    ["A3_E04_GROUP_MEAN_CADENCE"],
    ["RCM-INT-005"],
    [entry.sourceAnchorRange],
    ["RCM-P-GLOBAL-CADREF"],
    [{traceCode:"GROUP_MEAN_CADENCE_PROXY",message:`${entry.endpoint}; source group-mean cadence protocol normalized at 170 spm, not a personal prescription.`,numericEffectApplied:true}],
    sourceCoverage(entry.endpoint,"PARTIAL"),
  );
}

function a3FigureSpeedRoute(regionId,context){
  const entry=FIGURE_DIGITIZED_SPEED_SOURCE.regions[regionId];
  if(!entry||context.runSetting!==FIGURE_DIGITIZED_SPEED_SOURCE.runSetting)return null;
  if(Math.abs(context.gradePercent??0)>1e-9)return null;
  const expectedCadence=linearInterpolate(FIGURE_DIGITIZED_SPEED_SOURCE.speedMps,FIGURE_DIGITIZED_SPEED_SOURCE.sourceCadenceSpm,context.speedMps);
  if(expectedCadence==null||!Number.isFinite(context.cadenceSpm)||Math.abs(context.cadenceSpm-expectedCadence)>expectedCadence*FIGURE_DIGITIZED_SPEED_SOURCE.cadenceToleranceFraction)return null;
  const [entryMin,entryMax]=entry.validSpeedDomainMps??[FIGURE_DIGITIZED_SPEED_SOURCE.speedMps[0],FIGURE_DIGITIZED_SPEED_SOURCE.speedMps.at(-1)];
  if(context.speedMps<entryMin||context.speedMps>entryMax)return null;
  const ratio=linearInterpolate(FIGURE_DIGITIZED_SPEED_SOURCE.speedMps,entry.ratiosAtModelReference,context.speedMps);
  if(ratio==null)return null;
  return routeResult(
    ratio,
    "PARTIAL",
    ["A3_E02_FIGURE_DIGITIZED_SPEED"],
    [],
    [entry.sourceAnchorRange],
    [],
    [{traceCode:"FIGURE_DIGITIZED_LOW_CONFIDENCE",message:`${entry.endpoint}; figure-derived functional-contribution proxy, bounded to 2–5 m/s level treadmill running with source-compatible natural cadence.`,numericEffectApplied:true}],
    sourceCoverage(entry.endpoint,"PARTIAL"),
  );
}

function a3VastusUphillRoute(context){
  if(!withinRelativeTolerance(context.speedMps,VASTUS_MEDIALIS_UPHILL_SOURCE.speedMps,VASTUS_MEDIALIS_UPHILL_SOURCE.speedToleranceFraction))return null;
  const grade=context.gradePercent??0;
  if(!(grade>0))return null;
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
  );
}

function a4HoriguchiPlantarRoute(regionId,context){
  if(!active(context.routeSet??new Set(),"A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE"))return null;
  const source=HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE;
  if(context.runSetting!==source.runSetting||!withinRelativeTolerance(context.speedMps,source.speedMps,source.speedToleranceFraction))return null;
  if(!source.validFootPlacements.includes(context.footPlacement))return null;
  const degrees=gradePercentToDegrees(context.gradePercent??0);
  if(degrees<source.gradeDegrees[0]-1e-12||degrees>source.gradeDegrees.at(-1)+1e-12)return out("Grade is outside the Horiguchi plantar-pressure source range.");
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
  );
}

function sourceMatchedGradeSpeed(regionId,gradePercent,speedMps){
  if(!Number.isFinite(gradePercent)||!Number.isFinite(speedMps)||gradePercent < -15||gradePercent > 15)return null;
  const expectedSpeed=linearInterpolate(GRADE_SPEED_PROFILE.gradePercent,GRADE_SPEED_PROFILE.speedMps,gradePercent);
  if(expectedSpeed==null||Math.abs(speedMps-expectedSpeed)>0.15)return null;
  const values=GRADE_SPEED_PROFILE[regionId];
  if(values==null)return null;
  if(regionId==="BA-DISP-015"){
    return {
      expectedSpeed,
      ratios:{
        gmax:logInterpolate(GRADE_SPEED_PROFILE.gradePercent.map((g,index)=>[g,values.gmax[index]]),gradePercent),
        gmed:logInterpolate(GRADE_SPEED_PROFILE.gradePercent.map((g,index)=>[g,values.gmed[index]]),gradePercent),
      },
    };
  }
  return {
    expectedSpeed,
    ratio:logInterpolate(GRADE_SPEED_PROFILE.gradePercent.map((g,index)=>[g,values[index]]),gradePercent),
  };
}

function unevennessForSection(regionId,context){
  const upper=UNEVENNESS_UPPER_BOUND_CURVES[regionId];
  if(upper==null)return null;
  const components=context.surfaceComponents??[];
  if(!components.length)return null;
  let weightedLevel=0,total=0;
  for(const component of components){
    const level=component.propertyProfile?.unevennessLevel;
    const weight=component.sharePercent??0;
    if(!Number.isFinite(level)||!(weight>=0))return null;
    weightedLevel+=weight*level;
    total+=weight;
  }
  if(!(total>0))return null;
  const level=weightedLevel/total;
  if(level<=1+1e-12)return null;
  if(context.speedMps<1.955||context.speedMps>2.645)return null;
  const fraction=Math.min(1,Math.max(0,(level-1)/4));
  return {ratio:Math.exp(Math.log(upper)*fraction),level,fraction};
}

function directCurve(regionId, context){
  const curves=SOURCE_CURVES[regionId]; const {speedMps,cadenceSpm,gradePercent,conflictingProtocol}=context;
  if(conflictingProtocol)return partial("A different exact protocol route is active; direct speed/grade/cadence curve is not stacked.");
  const gradeDegrees=gradePercent==null?null:gradePercentToDegrees(gradePercent);
  try{
    if(gradeDegrees!=null&&Math.abs(gradeDegrees)>1e-9){
      if(Math.abs(speedMps-2.78)>0.139)return partial("Grade source route requires source-compatible speed.");
      if(gradeDegrees < -6 || gradeDegrees > 6)return out("Grade is outside direct source domain.");
      return routeResult(logInterpolate(curves.grade,gradeDegrees),"CALCULATED",["DIRECT_GRADE_SOURCE"],[gradeDegrees>0?"RCM-INT-001":"RCM-INT-002"],["RCM-ANCH-GRADE"],[],[]);
    }
    if(cadenceSpm!=null&&Math.abs(speedMps-3.33)<=0.1665){
      const delta=cadenceSpm-170;
      if(Math.abs(delta)>10)return partial("Cadence delta is outside source range.");
      if(Math.abs(delta)>1e-9)return routeResult(logInterpolate(curves.cadence,delta),"CALCULATED",["DIRECT_CADENCE_SOURCE"],["RCM-INT-005"],["RCM-ANCH-CADENCE"],["RCM-P-GLOBAL-CADREF"],[]);
    }
    if(speedMps>=2.78&&speedMps<=5)return routeResult(logInterpolate(curves.speed,speedMps),"CALCULATED",["DIRECT_SPEED_SOURCE"],[],["RCM-ANCH-SPEED"],[],[]);
    return partial("Speed is outside direct source route; exposure remains available.");
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
  if(!(representedShare>0))return {ratio:null,coverage:{state:"NONE",observedComponentIds:[],missingComponentIds:missing.map(component=>component.coverageId),normalizedWeights:{},declaredShareFractions:{},representedShareFraction:0}};
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
  };
}
function surfaceRatioForSection(regionId,context){
  const comps=context.surfaceComponents??[];
  if(!comps.length)return {ratio:null,state:"NOT_CALCULABLE",routes:[],interactions:[],sources:[],parameters:[],trace:[{traceCode:"UNKNOWN_NOT_IMPUTED",message:"Surface unknown for plantar mask route",numericEffectApplied:false}]};
  if(!context.exactSurfaceActive)return partial("Named surface retained, but exact surface×shoe×strike gates are not all met.");
  const composite=supportedSurfaceComposite(comps,SURFACE_CURVES[regionId]);
  if(composite.ratio==null)return partial("No declared surface portion matches the exact named-source categories.");
  const state=composite.coverage.state==="FULL"?"CALCULATED":"PARTIAL";
  const trace=composite.coverage.state==="PARTIAL"?[{traceCode:"SUPPORTED_SURFACE_SHARE_ONLY",message:"Only source-compatible surface portions contribute to conditionLog; unsupported portions remain explicitly unmodelled and are not renormalized to 100%.",numericEffectApplied:true}]:[];
  return routeResult(composite.ratio,state,["SURFACE_X_STANDARD_SHOE"],["RCM-INT-007","RCM-INT-029"],["RCM-ANCH-046..053"],[],trace,composite.coverage);
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
    const cadence=a3CadenceRoute(regionId,context); if(cadence)return cadence;
    return partial("No source-bounded hip condition route is active; exposure-only partial result is retained.");
  }
  if(regionId==="BA-DISP-015"){
    if(v<2||v>5)return partial("Gluteal speed route outside 2–5 m/s.");
    const exact009=v>=3.9615&&v<=4.3785&&gp>0&&gp<=7
      ?logInterpolate(GLUTE_GRADE_CURVE,gp)
      :null;
    if(exact009!=null){
      const composite=observedComposite([
        {id:"GMAX",ratio:exact009,weight:p["RCM-P-015-WGMAX"]},
        {id:"GMED",ratio:null,weight:p["RCM-P-015-WGMED"]},
      ]);
      return routeResult(composite.ratio,"PARTIAL",["BAT_SRC_009_GLUTE_EXACT"],["RCM-INT-001"],["RCM-ANCH-A1-057..059"],["RCM-P-015-WGMAX","RCM-P-015-WGMED"],[],composite.coverage);
    }
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(profile){
      const composite=observedComposite([
        {id:"GMAX",ratio:profile.ratios.gmax,weight:p["RCM-P-015-WGMAX"]},
        {id:"GMED",ratio:profile.ratios.gmed,weight:p["RCM-P-015-WGMED"]},
      ]);
      return routeResult(composite.ratio,"PARTIAL",["BAT_SRC_019_GRADE_SPEED_PROFILE"],["RCM-INT-001","RCM-INT-002"],["RCM-ANCH-A1-060..073"],["RCM-P-015-WGMAX","RCM-P-015-WGMED"],[{traceCode:"DESCRIPTIVE_SOURCE_PROFILE",message:"BAT-SRC-019 paired grade-speed means are retained as a bounded descriptive profile, not an inferential or causal calibration.",numericEffectApplied:true}],composite.coverage);
    }
    const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;
    return partial("No source-bounded gluteal condition route is active; project speed fallback is retired in A3.");
  }
  if(regionId==="BA-DISP-016"){
    const jointGrade=a3JointGradeRoute(regionId,context); if(jointGrade)return jointGrade;
    const vm=a3VastusUphillRoute(context); if(vm)return vm;
    let ratio=1,state="CALCULATED",routes=[],sources=[],pars=[],trace=[],interactions=[];
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(profile){ratio*=profile.ratio;routes.push("BAT_SRC_019_GRADE_SPEED_PROFILE");sources.push("RCM-ANCH-A1-074..080");interactions.push("RCM-INT-001","RCM-INT-002");state="PARTIAL";trace.push({traceCode:"DESCRIPTIVE_SOURCE_PROFILE",message:"BAT-SRC-019 paired grade-speed means are retained as a bounded descriptive profile, not an inferential or causal calibration.",numericEffectApplied:true});}
    else {
      const cadence=a3CadenceRoute(regionId,context); if(cadence)return cadence;
      const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;
    }
    const uneven=unevennessForSection(regionId,context);
    if(uneven){ratio*=uneven.ratio;routes.push("BOUNDED_UNEVENNESS_X_SPEED");sources.push("RCM-ANCH-043");pars.push("RCM-P-A1-UNEVEN-MAP");interactions.push("RCM-INT-011");}
    if(!routes.length)return partial("No source-bounded anterior-thigh condition route is active; project uphill fallback is retired in A3.");
    return routeResult(ratio,state,routes,interactions,sources,pars,trace);
  }
  if(regionId==="BA-DISP-018"){
    let ratio=1,routes=[],sources=[],interactions=[],trace=[],state="CALCULATED";
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(profile){ratio*=profile.ratio;routes.push("BAT_SRC_019_GRADE_SPEED_PROFILE");sources.push("RCM-ANCH-A1-081..087");interactions.push("RCM-INT-001","RCM-INT-002");state="PARTIAL";trace.push({traceCode:"DESCRIPTIVE_SOURCE_PROFILE",message:"BAT-SRC-019 paired grade-speed means are retained as a bounded descriptive profile, not an inferential or causal calibration.",numericEffectApplied:true});}
    if(!profile){const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;}
    const uneven=unevennessForSection(regionId,context);
    if(uneven){ratio*=uneven.ratio;routes.push("BOUNDED_UNEVENNESS_X_SPEED");sources.push("RCM-ANCH-044");interactions.push("RCM-INT-011");}
    if(!routes.length)return partial("No source-bounded posterior-thigh condition route is active.");
    return routeResult(ratio,state,routes,interactions,sources,[],trace);
  }
  if(regionId==="BA-DISP-023"){
    if(v<2||v>5)return partial("Calf speed route outside 2–5 m/s.");
    const exact009=v>=3.9615&&v<=4.3785&&gp>0&&gp<=7?logInterpolate(GASTRO_GRADE_CURVE,gp):null;
    const profile=sourceMatchedGradeSpeed(regionId,gp,v);
    if(exact009!=null||profile){
      const gas=exact009??profile.ratio;
      const composite=observedComposite([
        {id:"SOLEUS",ratio:null,weight:p["RCM-P-023-WSOL"]},
        {id:"GASTROCNEMIUS_MEDIALIS",ratio:gas,weight:p["RCM-P-023-WGAS"]},
      ]);
      const exactSource=exact009!=null;
      return routeResult(composite.ratio,"PARTIAL",[exactSource?"BAT_SRC_009_GASTRO_EXACT":"BAT_SRC_019_GRADE_SPEED_PROFILE"],["RCM-INT-001","RCM-INT-002"],[exactSource?"RCM-ANCH-A1-040..042":"RCM-ANCH-A1-088..094"],["RCM-P-023-WSOL","RCM-P-023-WGAS"],[],composite.coverage);
    }
    const speedSource=a3FigureSpeedRoute(regionId,context); if(speedSource)return speedSource;
    return partial("No source-bounded calf condition route is active; project speed fallback is retired in A3.");
  }
  if(regionId==="BA-DISP-024"){
    const jointGrade=a3JointGradeRoute(regionId,context); if(jointGrade)return jointGrade;
    const cadence=a3CadenceRoute(regionId,context); if(cadence)return cadence;
    const uneven=unevennessForSection(regionId,context);
    if(uneven)return routeResult(uneven.ratio,"CALCULATED",["BOUNDED_UNEVENNESS_X_SPEED"],["RCM-INT-011"],["RCM-ANCH-045"],["RCM-P-A1-UNEVEN-MAP"],[]);
    return partial("No source-bounded ankle condition route is active; exposure-only partial result is retained.");
  }
  if(regionId==="BA-DISP-027"||regionId==="BA-DISP-029"){const a4=a4HoriguchiPlantarRoute(regionId,context);if(a4)return a4;return surfaceRatioForSection(regionId,context);}
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
      return routeResult(composite.ratio,"PARTIAL",["ARCH_SURFACE_X_HEELED_SHOE"],["RCM-INT-007","RCM-INT-029"],["RCM-ANCH-A1-095..096"],["RCM-P-028-WARCH","RCM-P-028-WINTR","RCM-P-028-WPFA"],trace,coverage);
    }
    if(context.gait==="WALK")return routeResult(Math.exp(-p["RCM-P-028-KGAIT"]),"CALCULATED",["ARCH_GAIT_CATEGORICAL"],["RCM-INT-016"],["BAT-SRC-015"],["RCM-P-028-KGAIT"],[]);
    let state="CALCULATED";let arch;
    if(v>=2.2&&v<=4.4){arch=boundedFactor(p["RCM-P-028-KSPEED"]*(v-p["RCM-P-GLOBAL-VREF"]),B);if(v<2.78||v>3.89)state="PARTIAL";}
    else return partial("Arch speed route outside supported oracle domain.");
    const routes=["ARCH_SPEED_OR_GAIT"];
    let pfa=null;
    if(active(routeSet,"ARCH_PFA_SOURCE")){const strike=context.footPlacement;if(PFA_CURVE[strike]==null)return partial("Foot placement missing for PFA route.");pfa=PFA_CURVE[strike];routes.push("ARCH_PFA_SOURCE");}
    const composite=observedComposite([
      {id:"ARCH_DEFORMATION_PROXY",ratio:arch,weight:p["RCM-P-028-WARCH"]},
      {id:"INTRINSIC_MUSCLE",ratio:null,weight:p["RCM-P-028-WINTR"]},
      {id:"PLANTAR_FASCIA_STRAIN",ratio:pfa,weight:p["RCM-P-028-WPFA"]},
    ]);
    state=mergeState(state,composite.coverage.state==="FULL"?"CALCULATED":"PARTIAL");
    return routeResult(composite.ratio,state,routes,active(routeSet,"ARCH_PFA_SOURCE")?["RCM-INT-019"]:[],active(routeSet,"ARCH_PFA_SOURCE")?["RCM-ANCH-054..056"]:[],["RCM-P-028-KSPEED","RCM-P-028-KGAIT","RCM-P-028-WARCH","RCM-P-028-WINTR","RCM-P-028-WPFA"],[],composite.coverage);
  }
  return routeResult(1);
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
      else if(rid==="BA-DISP-028"){if(scenario.gait==="WALK")cr=Math.exp(-p["RCM-P-028-KGAIT"]);else{const arch=boundedFactor(p["RCM-P-028-KSPEED"]*(projectV-p["RCM-P-GLOBAL-VREF"]),p["RCM-P-GLOBAL-BPROJECT"]);const strike=scenario.strike??"RFS";const pfa=PFA_CURVE[strike]??1;cr=Math.exp(p["RCM-P-028-WARCH"]*Math.log(arch)+p["RCM-P-028-WPFA"]*Math.log(pfa));}}
      const exposure=Math.pow(q/p["RCM-P-GLOBAL-QREF"],p["RCM-P-GLOBAL-ALPHAE"]);const stateLog=p["RCM-P-GLOBAL-BETASTATE"]*Math.max(0,Math.min(1,scenario.stateNorm??0));results[rid]={index:100*cr*exposure*Math.exp(stateLog),state};
    }catch{results[rid]={index:null,state:"OUT_OF_SUPPORTED_RANGE"};}
  }
  return results;
}
