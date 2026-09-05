import { evaluateRegionCondition as evaluateA8RegionCondition } from "../vendor_a8_engine/model.js";
import { resolve1DKnots, RANGE_STATES } from "../vendor_a8_engine/range-resolver.js";
import { evaluateA9PavedFamily } from "./a9PavedFamilies.js";

const ratio=(value,reference)=>value/reference;
function linearInterpolate(xs,ys,x){
  if(!Number.isFinite(x)||xs.length!==ys.length||xs.length<2)return null;
  for(let i=0;i<xs.length;i++){if(Math.abs(x-xs[i])<=1e-12)return ys[i];}
  if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12)return null;
  for(let i=0;i<xs.length-1;i++){if(x>=xs[i]&&x<=xs[i+1]){const t=(x-xs[i])/(xs[i+1]-xs[i]);return ys[i]+t*(ys[i+1]-ys[i]);}}
  return null;
}

export const A9_EXTENSION_VERSION="RunLoad-A9-evidence-extension-phase3-v2.0";

export const A9_SOURCE_LINES=Object.freeze({
  "A9-HO-028-SPEED":Object.freeze({
    regionId:"BA-DISP-028", source:"Ho 2010", axis:"speedMps", runSetting:"TREADMILL",
    fixedGradePercent:0, knots:Object.freeze([1.5,2.0,2.5]), raw:Object.freeze([154.1,172.9,178.2]),
    ratios:Object.freeze([ratio(154.1,172.9),1,ratio(178.2,172.9)]),
    constructId:"MEDIAL_MIDFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-028-HO2010-MEDIAL-MIDFOOT-PEAK-PRESSURE-2.0MPS",
    evidenceClass:"DIRECT_WITHIN_SOURCE_PARTIAL_PROXY",
  }),
  "A9-HO-029-SPEED":Object.freeze({
    regionId:"BA-DISP-029", source:"Ho 2010", axis:"speedMps", runSetting:"TREADMILL",
    fixedGradePercent:0, knots:Object.freeze([1.5,2.0,2.5]), raw:Object.freeze([251.8,278.6,294.1]),
    ratios:Object.freeze([ratio(251.8,278.6),1,ratio(294.1,278.6)]),
    constructId:"MEDIAL_FOREFOOT_MAXIMUM_FORCE_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-029-HO2010-MEDIAL-FOREFOOT-FORCE-2.0MPS-LEVEL",
    evidenceClass:"DIRECT_WITHIN_SOURCE_PARTIAL_PROXY",
  }),
  "A9-HO-029-GRADE":Object.freeze({
    regionId:"BA-DISP-029", source:"Ho 2010", axis:"gradePercent", runSetting:"TREADMILL",
    fixedSpeedMps:2.0, knots:Object.freeze([0,5,10,15]), raw:Object.freeze([278.6,257.0,255.3,238.6]),
    ratios:Object.freeze([1,ratio(257.0,278.6),ratio(255.3,278.6),ratio(238.6,278.6)]),
    constructId:"MEDIAL_FOREFOOT_MAXIMUM_FORCE_GRADE_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-029-HO2010-MEDIAL-FOREFOOT-FORCE-2.0MPS-LEVEL",
    evidenceClass:"DIRECT_WITHIN_SOURCE_PARTIAL_PROXY",
  }),
  "A9-FUKUCHI-024-SPEED":Object.freeze({
    regionId:"BA-DISP-024", source:"Fukuchi 2017", axis:"speedMps", runSetting:"TREADMILL",
    fixedGradePercent:0, knots:Object.freeze([2.5,3.5,4.5]), raw:Object.freeze([1.22,1.55,1.91]),
    ratios:Object.freeze([1,1.55/1.22,1.91/1.22]),
    constructId:"ANKLE_TOTAL_ABSOLUTE_JOINT_WORK_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-024-FUKUCHI2017-ANKLE-TOTAL-ABSOLUTE-WORK-2.5MPS",
    evidenceClass:"WITHIN_SOURCE_PROJECT_DERIVED_PARTIAL_PROXY",
  }),
});


export const A9_SPEED_MARGINAL_LINES=Object.freeze({
  "A9-RICE-021-GRADE-MARGINAL-DOWNHILL":Object.freeze({
    regionId:"BA-DISP-021", source:"Rice et al. 2024", axis:"gradePercent", runSetting:"TREADMILL",
    wholeRunSpeedRegime:Object.freeze([2.5,3.5]),
    // Primary source reports peak posterior tibial stress 19% lower at -15% and 14% lower at -10% vs level, pooled across tested speeds.
    knots:Object.freeze([-15,-10]), ratios:Object.freeze([0.81,0.86]),
    constructId:"PEAK_POSTERIOR_TIBIAL_STRESS_GRADE_SPEED_MARGINAL_TENDENCY",
    referenceDefinitionId:"A9-RDEF-021-RICE2024-POSTERIOR-TIBIAL-STRESS-LEVEL-SPEED-MARGINAL-2P5-3P5",
    evidenceClass:"DIRECT_WITHIN_SOURCE_SPEED_MARGINAL_ALTERNATE_CONSTRUCT",
  }),
});

export function evaluateA9UnknownSectionSpeedMarginal(regionId,context={}){
  const line=A9_SPEED_MARGINAL_LINES["A9-RICE-021-GRADE-MARGINAL-DOWNHILL"];
  const whole=Number(context.wholeRunAverageSpeedMps);
  const grade=Number(context.gradePercent);
  if(regionId!==line.regionId||!isRun(context)||!isTreadmill(context)||!Number.isFinite(whole)||whole<line.wholeRunSpeedRegime[0]-1e-12||whole>line.wholeRunSpeedRegime[1]+1e-12||!Number.isFinite(grade)) return null;
  let rv=null, geometry=null;
  if(Math.abs(grade)<=1e-12){rv=1; geometry="EXACT_LEVEL_REFERENCE";}
  else if(grade>=line.knots[0]-1e-12&&grade<=line.knots[1]+1e-12){rv=linearInterpolate(line.knots,line.ratios,grade); geometry="BOUNDED_SOURCE_REPORTED_RATIO_INTERPOLATION";}
  else return null;
  return {
    ratio:rv,state:"PARTIAL",routes:["A9-RICE-021-GRADE-MARGINAL-DOWNHILL"],interactions:[],sources:[line.source],parameters:[],
    trace:[
      {traceCode:"A9_RICE2024_SPEED_MARGINAL_GRADE",message:"Uses Rice 2024 source-marginal gradient effect; not a speed-specific section prediction.",numericEffectApplied:true},
      {traceCode:"WHOLE_RUN_SPEED_REGIME_ONLY",message:"Whole-run average speed is used only as a source-regime eligibility guard, never substituted as section speed.",numericEffectApplied:false}
    ],
    componentCoverage:{state:"PARTIAL",observedComponentIds:[line.constructId],missingComponentIds:["CURRENT_CUMULATIVE_TIBIAL_TOTAL_STRESS_IMPULSE_NOT_THIS_CONSTRUCT"],normalizedWeights:{[line.constructId]:1}},
    evidenceRange:{axis:"gradePercent",geometry,sourceLineId:"A9-RICE-021-GRADE-MARGINAL-DOWNHILL",referenceDefinitionId:line.referenceDefinitionId,evidenceClass:line.evidenceClass,wholeRunSpeedRegime:line.wholeRunSpeedRegime,sectionSpeedRequired:false},
    a9SemanticIdentity:{constructId:line.constructId,referenceDefinitionId:line.referenceDefinitionId,evidenceClass:line.evidenceClass},
    a9SourceLayer:"A9_SPEED_MARGINAL_EXTENSION"
  };
}

function isRun(context){return context?.gait==="RUN";}
function isTreadmill(context){return context?.runSetting==="TREADMILL";}
function near(a,b,eps=1e-9){return Number.isFinite(a)&&Math.abs(a-b)<=eps;}
function inDomain(x,knots){return Number.isFinite(x)&&x>=knots[0]-1e-12&&x<=knots.at(-1)+1e-12;}

export function evaluateA9SourceLine(lineId,coordinate){
  const line=A9_SOURCE_LINES[lineId];
  const points=line.knots.map((x,i)=>[x,line.ratios[i]]);
  const ratioValue=linearInterpolate(points.map(([x,y])=>x),points.map(([x,y])=>y),coordinate);
  const evidenceRange=resolve1DKnots(line.knots,coordinate,{axis:line.axis});
  return {
    ratio:ratioValue,
    state:"PARTIAL",
    routes:[lineId],
    interactions:[],
    sources:[line.source],
    parameters:[],
    trace:[{traceCode:"A9_PHASE1_ADMISSIBLE_1D_LINE",message:`${lineId} uses within-source adjacent-knot linear interpolation only.`,numericEffectApplied:true}],
    componentCoverage:{state:"PARTIAL",observedComponentIds:[line.constructId],missingComponentIds:["DIRECT_TISSUE_LOAD_NOT_MEASURED"],normalizedWeights:{[line.constructId]:1}},
    evidenceRange:{...evidenceRange,geometry:"A9_AUTHORIZED_1D_SOURCE_LINE",sourceLineId:lineId,referenceDefinitionId:line.referenceDefinitionId,evidenceClass:line.evidenceClass},
    a9SemanticIdentity:{constructId:line.constructId,referenceDefinitionId:line.referenceDefinitionId,evidenceClass:line.evidenceClass},
  };
}

export function enrichA8RouteSet(context={}){
  const set=new Set(context.routeSet??[]);
  const speed=context.speedMps, grade=context.gradePercent;
  if(isRun(context)&&isTreadmill(context)&&Number.isFinite(speed)&&Number.isFinite(grade)){
    if((near(grade,0)&&speed>=1.5-1e-12&&speed<=2.5+1e-12)||(near(speed,2.0)&&grade>=0&&grade<=15)){
      set.add("A6_HO2010_HEEL_PEAK_PRESSURE");
    }
    const deg=Math.atan(grade/100)*180/Math.PI;
    if(near(speed,3.33,1e-9)&&deg>=-6-1e-9&&deg<=6+1e-9&&["RFS","FFS"].includes(context.footPlacement)
      &&context.shoeType==="TRAINING"&&context.shoeSoftness==="NORMAL"){
      set.add("A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE");
    }
  }
  return set;
}

export function evaluateA9Condition(regionId,context={},options={}){
  const normalizedContext={...context,routeSet:enrichA8RouteSet(context)};
  const base=evaluateA8RegionCondition(regionId,normalizedContext);
  if((base?.routes?.length??0)>0)return {...base,a9SourceLayer:"A8_RETAINED"};
  const paved=evaluateA9PavedFamily(regionId,normalizedContext,options);
  if(paved)return paved;
  const speed=normalizedContext.speedMps;
  const grade=normalizedContext.gradePercent;
  if(!isRun(normalizedContext)||!isTreadmill(normalizedContext)||!Number.isFinite(speed)||!Number.isFinite(grade))return {...base,a9SourceLayer:"A8_RETAINED_UNSUPPORTED"};

  if(regionId==="BA-DISP-028"&&near(grade,0)){
    const line=A9_SOURCE_LINES["A9-HO-028-SPEED"];
    if(inDomain(speed,line.knots))return {...evaluateA9SourceLine("A9-HO-028-SPEED",speed),a9SourceLayer:"A9_EXTENSION"};
  }
  if(regionId==="BA-DISP-029"){
    const gradeLine=A9_SOURCE_LINES["A9-HO-029-GRADE"];
    if(near(speed,gradeLine.fixedSpeedMps)&&inDomain(grade,gradeLine.knots))return {...evaluateA9SourceLine("A9-HO-029-GRADE",grade),a9SourceLayer:"A9_EXTENSION"};
    const speedLine=A9_SOURCE_LINES["A9-HO-029-SPEED"];
    if(near(grade,0)&&inDomain(speed,speedLine.knots))return {...evaluateA9SourceLine("A9-HO-029-SPEED",speed),a9SourceLayer:"A9_EXTENSION"};
  }
  if(regionId==="BA-DISP-024"&&near(grade,0)){
    const line=A9_SOURCE_LINES["A9-FUKUCHI-024-SPEED"];
    if(inDomain(speed,line.knots))return {...evaluateA9SourceLine("A9-FUKUCHI-024-SPEED",speed),a9SourceLayer:"A9_EXTENSION"};
  }
  return {...base,a9SourceLayer:"A8_RETAINED_UNSUPPORTED"};
}

export function extensionOutOfDomainEvidence(lineId,coordinate){
  const line=A9_SOURCE_LINES[lineId];
  const range=resolve1DKnots(line.knots,coordinate,{axis:line.axis});
  return range.state===RANGE_STATES.OUT_OF_RANGE;
}
