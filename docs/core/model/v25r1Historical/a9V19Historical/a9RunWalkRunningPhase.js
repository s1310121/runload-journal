import { calculateA9RegionalReview } from "./a9ReviewModel.js";
import { gradeIsWithinFullResponseDomain, hasTreadmillOutdoorSurfaceMixFromComponents } from "../../modelConstants.js";

export const A9_RUN_WALK_RUNNING_PHASE_VERSION="RunLoad-A9-FCR-run-walk-running-phase-v1.1";
export const A9_RUN_WALK_PHASE_SCOPE="RUNNING_ONLY";

function pos(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null;}
function isRunWalk(v){return String(v??"").toUpperCase()==="RUN_WALK";}
function canonicalSpeedMps(v){const n=Number(v);return Number.isFinite(n)?Number(n.toFixed(12)):null;}
function positiveSurfaceComponentsFrom(value){return (Array.isArray(value)?value:[]).filter(c=>Number(c.sharePercent)>0);}
function positiveSurfaceComponents(input={}){return positiveSurfaceComponentsFrom(input.surfaceComponents);}
function hasMixedCourse(input={}){
  if(Array.isArray(input.runWalkRunningSections)&&input.runWalkRunningSections.length)return true;
  if(Array.isArray(input.sections)&&input.sections.length>1)return true;
  const comps=positiveSurfaceComponents(input);
  if(comps.length>1)return true;
  return false;
}
function signedToDirection(g){return g<0?"DOWNHILL":g>0?"UPHILL":"FLAT";}
function normalizeRunningPhaseSections(input={},runD){
  const raw=Array.isArray(input.runWalkRunningSections)?input.runWalkRunningSections:[];
  if(!raw.length)return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_COMPOSITION_REQUIRED",message:"mixed RUN_WALK requires running-phase condition shares"}};
  const prepared=raw.map((s,i)=>({
    sectionId:String(s.sectionId??`run-phase-${i+1}`),
    sharePercent:Number(s.sharePercent),
    gradeKnown:s.gradeKnown===true,
    gradePercent:s.gradePercent==null?null:Number(s.gradePercent),
    gradeDirection:String(s.gradeDirection??"UNKNOWN").toUpperCase(),
    surfaceComponents:positiveSurfaceComponentsFrom(s.surfaceComponents),
  }));
  if(prepared.some(s=>!Number.isFinite(s.sharePercent)||s.sharePercent<=0))return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_SHARE_INVALID",message:"running-phase section shares must be positive finite percentages"}};
  const sum=prepared.reduce((a,s)=>a+s.sharePercent,0);if(Math.abs(sum-100)>1e-6)return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_SHARE_SUM_INVALID",message:"running-phase section shares must sum to 100"}};
  for(const s of prepared){
    if(!s.gradeKnown||!Number.isFinite(s.gradePercent)||s.gradePercent<0)return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_GRADE_REQUIRED",message:"each running-phase section requires a known non-negative grade magnitude and direction"}};
    if(!["FLAT","UPHILL","DOWNHILL"].includes(s.gradeDirection))return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_GRADE_DIRECTION_INVALID",message:"running-phase section gradeDirection must be FLAT, UPHILL, or DOWNHILL"}};
    if(!gradeIsWithinFullResponseDomain(s.gradePercent))return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_GRADE_OUT_OF_MODEL_USE_DOMAIN",message:"running-phase section grade magnitude is outside the ±15% full-response model-use domain"}};
    if(!s.surfaceComponents.length)return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_SURFACE_REQUIRED",message:"each running-phase section requires known surface composition"}};
    const ss=s.surfaceComponents.reduce((a,c)=>a+Number(c.sharePercent),0);if(s.surfaceComponents.some(c=>!Number.isFinite(Number(c.sharePercent))||Number(c.sharePercent)<=0)||Math.abs(ss-100)>1e-6)return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_SURFACE_SHARE_INVALID",message:"running-phase section surface shares must be positive and sum to 100"}};
  }
  // Flatten surface mixtures into distance portions. With >1 resulting condition section, the review model
  // deliberately leaves section speed unknown and uses the running-phase average only as the record-level
  // response coordinate in the already-authorized source-marginal composition route.
  const flat=[];
  for(const s of prepared){
    for(let j=0;j<s.surfaceComponents.length;j++){
      const c=s.surfaceComponents[j];const combined=s.sharePercent*Number(c.sharePercent)/100;
      if(!(combined>0))continue;
      flat.push({
        sectionId:`${s.sectionId}-surface-${j+1}`,
        sharePercent:combined,
        distanceKm:runD*combined/100,
        gradeKnown:true,gradePercent:s.gradePercent,gradeDirection:s.gradeDirection,
        surfaceComponents:[{...c,sharePercent:100}],
        exactSurfaceActive:Boolean(s.exactSurfaceActive),exactArchSurfaceActive:Boolean(s.exactArchSurfaceActive),
      });
    }
  }
  const flatSum=flat.reduce((a,s)=>a+Number(s.sharePercent),0);if(!flat.length||Math.abs(flatSum-100)>1e-6)return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_COMPOSITION_INVALID",message:"running-phase condition composition could not be normalized"}};
  if(hasTreadmillOutdoorSurfaceMixFromComponents(flat.flatMap((s)=>s.surfaceComponents)))return {ok:false,error:{code:"RUN_WALK_TREADMILL_OUTDOOR_MIX_FORBIDDEN",message:"treadmill and outdoor surfaces cannot be composed within the same running phase"}};
  return {ok:true,sections:flat,declaredSections:prepared};
}

export function calculateA9RunWalkRunningPhaseReview(input={},options={}){
  if(!isRunWalk(input.runningFormat))return {ok:false,error:{code:"RUN_WALK_FORMAT_REQUIRED",message:"runningFormat must be RUN_WALK"}};
  const totalD=pos(input.distanceKm), totalT=pos(input.durationMinutes);
  if(!totalD||!totalT)return {ok:false,error:{code:"INVALID_MANDATORY_RUN_FACTS",message:"distanceKm and durationMinutes must both be finite and positive"}};
  const runD=pos(input.runWalkRunningDistanceKm), runT=pos(input.runWalkRunningDurationMinutes);
  if(!runD||!runT)return {ok:false,error:{code:"RUN_WALK_RUNNING_PHASE_DETAILS_REQUIRED",message:"running-phase distance and duration are required for 12-region RUN_WALK numeric output"}};
  if(!(runD<totalD))return {ok:false,error:{code:"RUN_WALK_RUNNING_DISTANCE_INCONSISTENT",message:"running-phase distance must be less than total distance"}};
  if(!(runT<totalT))return {ok:false,error:{code:"RUN_WALK_RUNNING_DURATION_INCONSISTENT",message:"running-phase duration must be less than total duration"}};
  if(!(totalD-runD>0))return {ok:false,error:{code:"RUN_WALK_WALKING_DISTANCE_REMAINDER_REQUIRED",message:"RUN_WALK requires a positive walking distance remainder"}};
  if(!(totalT-runT>0))return {ok:false,error:{code:"RUN_WALK_WALKING_DURATION_REMAINDER_REQUIRED",message:"RUN_WALK requires a positive walking duration remainder"}};
  const rawRunSpeedMps=runD*1000/(runT*60);
  const runSpeedMps=canonicalSpeedMps(rawRunSpeedMps);
  const wholeRecordAverageSpeedMps=totalD*1000/(totalT*60);
  const mixed=hasMixedCourse(input);
  let phaseSections=null,declaredRunningSections=null;
  if(mixed){
    const norm=normalizeRunningPhaseSections(input,runD);if(!norm.ok)return {ok:false,error:{code:"RUN_WALK_PHASE_TO_SECTION_MAPPING_REQUIRED",message:norm.error.message,detailCode:norm.error.code}};
    phaseSections=norm.sections;declaredRunningSections=norm.declaredSections;
  }else{
    phaseSections=[{
      sectionId:"run-walk-running-phase",distanceKm:runD,speedMps:runSpeedMps,
      gradeKnown:input.gradeKnown,gradePercent:input.gradePercent,gradeDirection:input.gradeDirection,
      cadenceSpm:input.cadenceSpm,surfaceComponents:Array.isArray(input.surfaceComponents)?input.surfaceComponents:[],
      exactSurfaceActive:Boolean(input.exactSurfaceActive),exactArchSurfaceActive:Boolean(input.exactArchSurfaceActive)
    }];
  }
  const phaseInput={...input,distanceKm:runD,durationMinutes:runT,runningFormat:"CONTINUOUS_RUN",sections:phaseSections};
  const out=calculateA9RegionalReview(phaseInput,options);
  if(!out.ok)return out;
  const regions=out.value.regions.map(r=>({
    ...r,
    reviewConstructId:"A9_REGIONAL_REVIEW_INDEX_RUN_WALK_RUNNING_PHASE_ONLY",
    reviewReferenceDefinitionId:"A9-RDEF-RUN_WALK_RUNNING_PHASE_AMOUNT-5KM",
    conditionHistorySignature:r.conditionHistorySignature?`PHASE_SCOPE=RUNNING_ONLY|${r.conditionHistorySignature}`:null,
    runWalkPhaseScope:"RUNNING_ONLY",
    walkingPhaseIncludedInNumericResult:false,
    transitionPhaseIncludedInNumericResult:false,
  }));
  return {ok:true,value:{
    ...out.value,
    schemaVersion:"runload-a9-regional-review-output-run-walk-running-phase-0.2",
    modelVersion:"RunLoad-A9-12region-review-model-fcr-v1.9",
    commonRunAmount:{...out.value.commonRunAmount,constructId:"A9_COMMON_RUN_WALK_RUNNING_PHASE_AMOUNT_REVIEW_INDEX",phaseScope:"RUNNING_ONLY",sourceDistanceKm:runD},
    derivedConditions:{...out.value.derivedConditions,runningPhaseSpeedMps:runSpeedMps,runningPhaseSpeedMpsRaw:rawRunSpeedMps,runningPhaseSpeedCanonicalizationDecimals:12,wholeRecordAverageSpeedMps},
    runWalkScope:{phaseScope:"RUNNING_ONLY",runningDistanceKm:runD,runningDurationMinutes:runT,runningPhaseSpeedMps:runSpeedMps,runningPhaseSpeedMpsRaw:rawRunSpeedMps,runningPhaseSpeedCanonicalizationDecimals:12,walkingDistanceKm:totalD-runD,walkingDurationMinutes:totalT-runT,walkingIncludedInNumericResult:false,transitionIncludedInNumericResult:false,wholeRecordAverageSpeedUsedForConditionRoute:false,mixedWholeRecordConditions:mixed,runningPhaseCompositionProvided:mixed,declaredRunningPhaseSections:declaredRunningSections??null,internalRunningConditionSectionCount:phaseSections.length},
    regions,
    coverageSummary:{finiteRegionCount:regions.filter(r=>Number.isFinite(r.reviewIndexExact)).length,conditionSupportedRegionCount:regions.filter(r=>r.conditionResponseSupported).length,conditionPartialRegionCount:regions.filter(r=>r.conditionSupport==="PARTIAL_UNAPPLIED").length},
    limitations:[...new Set([...(out.value.limitations??[]),"run_walk_numeric_result_covers_running_phase_only","walking_and_transition_not_numerically_modeled",...(mixed?["mixed_run_walk_requires_explicit_running_phase_condition_composition"]:[])])],
  }};
}
