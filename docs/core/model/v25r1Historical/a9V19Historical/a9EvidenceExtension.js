import { evaluateRegionCondition as evaluateA8RegionCondition } from "./vendor_a8_engine/model.js";
import { resolve1DKnots, RANGE_STATES } from "./vendor_a8_engine/range-resolver.js";
import { evaluateA9PavedFamily } from "./a9PavedFamilies.js";
import { evaluateA9FcrP1Family } from "./a9FcrP1Families.js";
import { evaluateA9FcrP3Family } from "./a9FcrP3Families.js";
import { evaluateA9FcrSpeedBackbone } from "./a9FcrSpeedBackboneFamilies.js";
import { evaluateA9FcrSurfaceConditionedProxy } from "./a9FcrSurfaceTransferFamilies.js";
import { evaluateA9FcrGradeConditionedProxy } from "./a9FcrGradeTransferFamilies.js";
import { normalizedMixedSurfaceComponents, evaluateA9FcrMixedSurfaceComposite } from "./a9FcrCompositionFamilies.js";
import { evaluateA9FcrHighSpeedFamily } from "./a9FcrHighSpeedFamilies.js";

const ratio=(value,reference)=>value/reference;
function linearInterpolate(xs,ys,x){
  if(!Number.isFinite(x)||xs.length!==ys.length||xs.length<2)return null;
  for(let i=0;i<xs.length;i++){if(Math.abs(x-xs[i])<=1e-12)return ys[i];}
  if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12)return null;
  for(let i=0;i<xs.length-1;i++){if(x>=xs[i]&&x<=xs[i+1]){const t=(x-xs[i])/(xs[i+1]-xs[i]);return ys[i]+t*(ys[i+1]-ys[i]);}}
  return null;
}

export const A9_EXTENSION_VERSION="RunLoad-A9-evidence-extension-fcr-v1.9";

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
  // V1.7 generic mixed-grade source-marginal proxy. Whole-run average speed is used once as a
  // record-level level-response coordinate and is never assigned to section.speedMps.
  const whole=Number(context.wholeRunAverageSpeedMps);
  const grade=Number(context.gradePercent);
  if(isRun(context)&&Number.isFinite(whole)&&Number.isFinite(grade)){
    const levelContext={...context,speedMps:whole,gradePercent:0,gradeDirection:"FLAT"};
    const levelBase=evaluateA9Condition(regionId,levelContext,{includeProvisional:true,_skipGradeFallback:true,_skipMixedSurfaceFallback:false});
    if(levelBase&&Number.isFinite(levelBase.ratio)&&levelBase.ratio>0&&(levelBase.routes?.length??0)>0){
      const sectionProxy=evaluateA9FcrGradeConditionedProxy(regionId,{...context,gradePercent:grade},levelBase,{includeProvisional:true,allowLevelProxy:true});
      if(sectionProxy){
        // Preserve stronger Rice source-marginal downhill magnitudes inside the common mixed-grade family where directly reported.
        let ratioValue=sectionProxy.ratio; let extraSource=[]; let shapeNote=null;
        if(regionId==="BA-DISP-021"&&isTreadmill(context)&&whole>=2.5-1e-12&&whole<=3.5+1e-12){
          if(Math.abs(grade+15)<=1e-12){ratioValue=levelBase.ratio*0.81;extraSource=["Rice et al. 2024"];shapeNote="RICE_REPORTED_MINUS15_RATIO";}
          else if(Math.abs(grade+10)<=1e-12){ratioValue=levelBase.ratio*0.86;extraSource=["Rice et al. 2024"];shapeNote="RICE_REPORTED_MINUS10_RATIO";}
        }
        const baseSig=String(levelBase.a9RouteSignature??levelBase.routes.join("+"));
        const routeId=`A9-FCR-MIXGRADE-${regionId}`;
        return {...sectionProxy,ratio:ratioValue,routes:[routeId],sources:[...new Set([...(sectionProxy.sources??[]),...extraSource])],
          trace:[...(sectionProxy.trace??[]),{traceCode:"WHOLE_RUN_SPEED_RECORD_COORDINATE_ONLY",message:"Whole-run average speed is used only to select the record-level level-response base; it is not substituted as this section's speed.",numericEffectApplied:false},...(shapeNote?[{traceCode:shapeNote,message:"Uses the stronger Rice 2024 source-marginal downhill ratio within the common mixed-grade P3 family.",numericEffectApplied:true}]:[])],
          a9SemanticIdentity:{constructId:`FCR_MIXED_GRADE_RECORD_MARGINAL_PROXY__${regionId}`,referenceDefinitionId:`A9-FCR-MIXGRADE-RDEF-${regionId}`,evidenceClass:"PROJECT_DERIVED_P3_MIXED_GRADE_SOURCE_MARGINAL"},
          a9SupportTier:"PROVISIONAL_AUTHORIZED",a9RouteSignature:`${regionId}|FCR_MIXGRADE_RECORD_P3|BASE_${baseSig}|V1`,a9UncertaintyClass:"P3_VERY_HIGH_MIXED_GRADE_UNKNOWN_SECTION_SPEED",a9SourceLayer:"A9_FCR_MIXED_GRADE_P3",
          evidenceRange:{...(sectionProxy.evidenceRange??{}),geometry:"P3_MIXED_GRADE_RECORD_LEVEL_SPEED_PLUS_SECTION_GRADE_MARGINAL",sectionSpeedRequired:false,wholeRunSpeedUsedAsSectionSpeed:false,wholeRunAverageSpeedMps:whole},
          a9Composition:{type:"MIXED_GRADE_SOURCE_MARGINAL",wholeRunAverageSpeedMps:whole,wholeRunSpeedUsedAsSectionSpeed:false,sectionGradePercent:grade,underlyingLevelRouteSignature:baseSig}};
      }
    }
  }
  // Retained legacy source-marginal route when the generic FCR record proxy cannot be formed.
  const line=A9_SPEED_MARGINAL_LINES["A9-RICE-021-GRADE-MARGINAL-DOWNHILL"];
  if(regionId!==line.regionId||!isRun(context)||!isTreadmill(context)||!Number.isFinite(whole)||whole<line.wholeRunSpeedRegime[0]-1e-12||whole>line.wholeRunSpeedRegime[1]+1e-12||!Number.isFinite(grade)) return null;
  let rv=null, geometry=null;
  if(Math.abs(grade)<=1e-12){rv=1; geometry="EXACT_LEVEL_REFERENCE";}
  else if(grade>=line.knots[0]-1e-12&&grade<=line.knots[1]+1e-12){rv=linearInterpolate(line.knots,line.ratios,grade); geometry="BOUNDED_SOURCE_REPORTED_RATIO_INTERPOLATION";}
  else return null;
  return {ratio:rv,state:"PARTIAL",routes:["A9-RICE-021-GRADE-MARGINAL-DOWNHILL"],interactions:[],sources:[line.source],parameters:[],trace:[{traceCode:"A9_RICE2024_SPEED_MARGINAL_GRADE",message:"Uses Rice 2024 source-marginal gradient effect; not a speed-specific section prediction.",numericEffectApplied:true},{traceCode:"WHOLE_RUN_SPEED_REGIME_ONLY",message:"Whole-run average speed is used only as a source-regime eligibility guard, never substituted as section speed.",numericEffectApplied:false}],componentCoverage:{state:"PARTIAL",observedComponentIds:[line.constructId],missingComponentIds:["CURRENT_CUMULATIVE_TIBIAL_TOTAL_STRESS_IMPULSE_NOT_THIS_CONSTRUCT"],normalizedWeights:{[line.constructId]:1}},evidenceRange:{axis:"gradePercent",geometry,sourceLineId:"A9-RICE-021-GRADE-MARGINAL-DOWNHILL",referenceDefinitionId:line.referenceDefinitionId,evidenceClass:line.evidenceClass,wholeRunSpeedRegime:line.wholeRunSpeedRegime,sectionSpeedRequired:false},a9SemanticIdentity:{constructId:line.constructId,referenceDefinitionId:line.referenceDefinitionId,evidenceClass:line.evidenceClass},a9SourceLayer:"A9_SPEED_MARGINAL_EXTENSION"};
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
  const speedBackbone=evaluateA9FcrSpeedBackbone(regionId,normalizedContext,options);
  if(speedBackbone)return speedBackbone;
  const base=evaluateA8RegionCondition(regionId,normalizedContext);
  if((base?.routes?.length??0)>0)return {...decorateRetainedDirect(regionId,base),a9SourceLayer:"A8_RETAINED"};
  const paved=evaluateA9PavedFamily(regionId,normalizedContext,options);
  if(paved)return paved;
  const speed=normalizedContext.speedMps;
  const grade=normalizedContext.gradePercent;
  // FCR V1.5: after all stronger actual-environment routes fail, a known single outdoor level surface may use
  // a separately identified P3 surface-conditioned regional speed proxy. The source is evaluated in the
  // already-audited V1.4 level-treadmill backbone at the same speed; raw native magnitudes are never transported.
  if(!options._skipSurfaceFallback && options.includeProvisional!==false && isRun(normalizedContext) && !isTreadmill(normalizedContext) && Number.isFinite(speed) && Number.isFinite(grade) && near(grade,0)){
    const sourceContext={...context,runSetting:"TREADMILL",routeSet:[],surfaceComponents:[{componentId:"treadmill",sharePercent:100,userCategory:"TREADMILL"}],exactSurfaceActive:false,exactArchSurfaceActive:false};
    const source=evaluateA9Condition(regionId,sourceContext,{...options,_skipSurfaceFallback:true});
    const transferred=evaluateA9FcrSurfaceConditionedProxy(regionId,normalizedContext,source,options);
    if(transferred)return transferred;
  }
  if(!options._skipMixedSurfaceFallback && options.includeProvisional!==false && isRun(normalizedContext) && !isTreadmill(normalizedContext) && Number.isFinite(speed) && Number.isFinite(grade) && near(grade,0)){
    const comps=normalizedMixedSurfaceComponents(normalizedContext);
    if(comps){
      const componentResults=comps.map(c=>evaluateA9Condition(regionId,{...context,surfaceComponents:[{componentId:c.surface.toLowerCase(),sharePercent:100,userCategory:c.surface}]},{...options,_skipMixedSurfaceFallback:true}));
      const mixed=evaluateA9FcrMixedSurfaceComposite(regionId,normalizedContext,componentResults,options);
      if(mixed)return mixed;
    }
  }
  if(!options._skipGradeFallback && options.includeProvisional!==false && isRun(normalizedContext) && !isTreadmill(normalizedContext) && Number.isFinite(speed) && Number.isFinite(grade) && !near(grade,0)){
    const levelContext={...context,gradePercent:0,gradeDirection:"FLAT"};
    const levelBase=evaluateA9Condition(regionId,levelContext,{...options,_skipGradeFallback:true});
    const gradeProxy=evaluateA9FcrGradeConditionedProxy(regionId,normalizedContext,levelBase,options);
    if(gradeProxy)return gradeProxy;
  }
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
  const highSpeed=evaluateA9FcrHighSpeedFamily(regionId,normalizedContext,options);
  if(highSpeed)return highSpeed;
  const p3=evaluateA9FcrP3Family(regionId,normalizedContext,options);
  if(p3)return p3;
  const p1=evaluateA9FcrP1Family(regionId,normalizedContext,options);
  if(p1)return p1;
  // FCR V1.6 fallback runs only after all stronger retained/A9 source-bounded routes fail.
  if(!options._skipGradeFallback && options.includeProvisional!==false && isRun(normalizedContext) && isTreadmill(normalizedContext) && Number.isFinite(speed) && Number.isFinite(grade) && !near(grade,0)){
    const levelContext={...context,gradePercent:0,gradeDirection:"FLAT"};
    const levelBase=evaluateA9Condition(regionId,levelContext,{...options,_skipGradeFallback:true});
    const gradeProxy=evaluateA9FcrGradeConditionedProxy(regionId,normalizedContext,levelBase,options);
    if(gradeProxy)return gradeProxy;
  }
  return {...base,a9SourceLayer:"A8_RETAINED_UNSUPPORTED"};
}

export function extensionOutOfDomainEvidence(lineId,coordinate){
  const line=A9_SOURCE_LINES[lineId];
  const range=resolve1DKnots(line.knots,coordinate,{axis:line.axis});
  return range.state===RANGE_STATES.OUT_OF_RANGE;
}
