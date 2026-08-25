import { resolve1DKnots, RANGE_STATES } from "./vendor_a8_engine/range-resolver.js";
import { evaluateV25R1CanonicalSpeed } from "./a9V25CanonicalSpeedFamilies.js";
import { applyV25R1GradeModifier } from "./a9V25GradeComposition.js";
import { applyV25R1SurfacePolicy } from "./a9V25SurfacePolicy.js";
import { applyV25R1CadenceModifier } from "./a9V25CadenceModifier.js";

const ratio=(value,reference)=>value/reference;
function linearInterpolate(xs,ys,x){
  if(!Number.isFinite(x)||xs.length!==ys.length||xs.length<2)return null;
  for(let i=0;i<xs.length;i++){if(Math.abs(x-xs[i])<=1e-12)return ys[i];}
  if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12)return null;
  for(let i=0;i<xs.length-1;i++){if(x>=xs[i]&&x<=xs[i+1]){const t=(x-xs[i])/(xs[i+1]-xs[i]);return ys[i]+t*(ys[i+1]-ys[i]);}}
  return null;
}

export const A9_EXTENSION_VERSION="RunLoad-V2.5R1-evidence-extension-v1.0";

export const A9_SOURCE_LINES=Object.freeze({
  "A9-HO-028-SPEED":Object.freeze({
    regionId:"BA-DISP-028", source:"Ho 2010", axis:"speedMps", runSetting:"TREADMILL",
    fixedGradePercent:0, knots:Object.freeze([1.5,2.0,2.5]), raw:Object.freeze([154.1,172.9,178.2]),
    ratios:Object.freeze([ratio(154.1,172.9),1,ratio(178.2,172.9)]),
    constructId:"MEDIAL_MIDFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-028-HO2010-MEDIAL-MIDFOOT-PEAK-PRESSURE-2.0MPS",
    evidenceClass:"DIRECT_WITHIN_SOURCE_PARTIAL_PROXY",
    signature:"BA-DISP-028|HO2010_MEDIAL_MIDFOOT_PEAK_PRESSURE|REF_2P0_172P9KPA|DIRECT_SPEED_LINE_V1",
  }),
  "A9-HO-029-SPEED":Object.freeze({
    regionId:"BA-DISP-029", source:"Ho 2010", axis:"speedMps", runSetting:"TREADMILL",
    fixedGradePercent:0, knots:Object.freeze([1.5,2.0,2.5]), raw:Object.freeze([339.8,360.7,377.8]),
    ratios:Object.freeze([ratio(339.8,360.7),1,ratio(377.8,360.7)]),
    constructId:"MEDIAL_FOREFOOT_PEAK_PRESSURE_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-029-HO2010-MEDIAL-FOREFOOT-PEAK-PRESSURE-2.0MPS-LEVEL",
    evidenceClass:"DIRECT_WITHIN_SOURCE_PARTIAL_PROXY_ENDPOINT_COHERENCE_V2",
    signature:"BA-DISP-029|HO2010_MEDIAL_FOREFOOT_PEAK_PRESSURE|REF_2P0_360P7KPA|DIRECT_SPEED_LINE_V2",
  }),
  "A9-HO-029-GRADE":Object.freeze({
    regionId:"BA-DISP-029", source:"Ho 2010", axis:"gradePercent", runSetting:"TREADMILL",
    fixedSpeedMps:2.0, knots:Object.freeze([0,5,10,15]), raw:Object.freeze([360.7,322.1,318.5,306.8]),
    ratios:Object.freeze([1,ratio(322.1,360.7),ratio(318.5,360.7),ratio(306.8,360.7)]),
    constructId:"MEDIAL_FOREFOOT_PEAK_PRESSURE_GRADE_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-029-HO2010-MEDIAL-FOREFOOT-PEAK-PRESSURE-2.0MPS-LEVEL",
    evidenceClass:"DIRECT_WITHIN_SOURCE_PARTIAL_PROXY_ENDPOINT_COHERENCE_V2",
    signature:"BA-DISP-029|HO2010_MEDIAL_FOREFOOT_PEAK_PRESSURE|REF_2P0_360P7KPA|DIRECT_GRADE_LINE_V2",
  }),
  "A9-FUKUCHI-024-SPEED":Object.freeze({
    regionId:"BA-DISP-024", source:"Fukuchi 2017", axis:"speedMps", runSetting:"TREADMILL",
    fixedGradePercent:0, knots:Object.freeze([2.5,3.5,4.5]), raw:Object.freeze([1.22,1.55,1.91]),
    ratios:Object.freeze([1,1.55/1.22,1.91/1.22]),
    constructId:"ANKLE_TOTAL_ABSOLUTE_JOINT_WORK_SPEED_PROXY_TENDENCY",
    referenceDefinitionId:"A9-RDEF-024-FUKUCHI2017-ANKLE-TOTAL-ABSOLUTE-WORK-2.5MPS",
    evidenceClass:"WITHIN_SOURCE_PROJECT_DERIVED_PARTIAL_PROXY",
    signature:"BA-DISP-024|FUKUCHI2017_ANKLE_TOTAL_ABS_WORK|REF_2P5_1P22JPKG|DIRECT_SPEED_LINE_V1",
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
  const whole=Number(context.wholeRunAverageSpeedMps);
  const grade=Number(context.gradePercent);
  if(context?.gait!=="RUN"||!Number.isFinite(whole)||!Number.isFinite(grade))return null;
  const base=evaluateV25R1CanonicalSpeed(regionId,{...context,speedMps:whole,gradePercent:0},{includeProvisional:true});
  if(!base)return null;
  const graded=applyV25R1GradeModifier(base,regionId,{...context,speedMps:null},{recordLevelCanonicalSpeedUsed:true});
  if(!graded)return null;
  const composed=applyV25R1SurfacePolicy(graded,regionId,{...context,speedMps:null},{sectionSpeedKnown:false});
  if(!composed)return null;
  return {...composed,
    trace:[...(composed.trace??[]),{traceCode:"V25R1_UNKNOWN_SECTION_SPEED_RECORD_LEVEL_BASE",message:"The record-level canonical speed response is evaluated once; the whole-record speed is not written into this section's speed field.",numericEffectApplied:false}],
    evidenceRange:{...(composed.evidenceRange??{}),sectionSpeedRequired:false,wholeRunSpeedUsedAsSectionSpeed:false,wholeRunAverageSpeedMps:whole},
    a9Composition:{type:"V25R1_RECORD_LEVEL_CANONICAL_PLUS_SECTION_GRADE",wholeRunAverageSpeedMps:whole,wholeRunSpeedUsedAsSectionSpeed:false,sectionGradePercent:grade},
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
    a9SupportTier:line.signature?"FORMAL_DIRECT_IN_DOMAIN":undefined,
    a9RouteSignature:line.signature??null,
    a9UncertaintyClass:null,
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

function decorateRetainedDirect(regionId,result){
  const route=result?.routes?.[0];
  if(regionId==="BA-DISP-023"&&route==="A3_E02_FIGURE_DIGITIZED_SPEED"){
    return {...result,
      a9SemanticIdentity:{constructId:"POSTERIOR_LOWER_LEG_MUSCLE_DEMAND_TENDENCY",referenceDefinitionId:"RCM-RDEF-023-HAMNER-COM-ACCEL",evidenceClass:"DIRECT_SOURCE_BOUNDED_FIGURE_DIGITIZED_PROXY"},
      a9SupportTier:"FORMAL_DIRECT_IN_DOMAIN",
      a9RouteSignature:"BA-DISP-023|HAMNER_COM_ACCEL_PROXY|REF_2P78_PROJECT_INTERP_18P26584|DIRECT_SOURCE_LINE_V1",
      a9UncertaintyClass:"SOURCE_FIGURE_DIGITIZED_MPS2_0P08"};
  }
  if(regionId==="BA-DISP-027"&&route==="A6_HO2010_HEEL_PEAK_PRESSURE"){
    return {...result,
      a9SemanticIdentity:{constructId:"REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",referenceDefinitionId:"RCM-RDEF-027-A6-HO2010-HEEL-PEAK",evidenceClass:"DIRECT_WITHIN_SOURCE_PARTIAL_PROXY"},
      a9SupportTier:"FORMAL_DIRECT_IN_DOMAIN",
      a9RouteSignature:"BA-DISP-027|HO2010_HEEL_PEAK_PRESSURE|REF_2P0_170P7KPA|DIRECT_SOURCE_LINE_V1",
      a9UncertaintyClass:null};
  }
  return result;
}

export function evaluateA9Condition(regionId,context={},options={}){
  const normalizedContext={...context,routeSet:enrichA8RouteSet(context)};
  const speed=Number(normalizedContext.speedMps);
  const grade=Number(normalizedContext.gradePercent);
  if(isRun(normalizedContext)&&Number.isFinite(speed)&&Number.isFinite(grade)&&Math.abs(grade)<=15+1e-9){
    const canonical=evaluateV25R1CanonicalSpeed(regionId,{...normalizedContext,gradePercent:0},options);
    if(canonical){
      const graded=applyV25R1GradeModifier(canonical,regionId,normalizedContext,{recordLevelCanonicalSpeedUsed:false});
      if(graded){
        const surfaced=applyV25R1SurfacePolicy(graded,regionId,normalizedContext,{sectionSpeedKnown:true});
        if(surfaced)return applyV25R1CadenceModifier(surfaced,regionId,normalizedContext);
      }
    }
  }
  // V2.5R1 fails closed outside the canonical running-domain route. Legacy pointwise and
  // incompatible endpoint takeovers remain available only through historical snapshot evaluators.
  return null;
}

export function extensionOutOfDomainEvidence(lineId,coordinate){
  const line=A9_SOURCE_LINES[lineId];
  const range=resolve1DKnots(line.knots,coordinate,{axis:line.axis});
  return range.state===RANGE_STATES.OUT_OF_RANGE;
}
