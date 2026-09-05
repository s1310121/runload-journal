import { AUTHORITY_VERSION, PARAMETER_SET_VERSION, REGIONS, PARAMETERS, FORMAL_INPUT_CATALOG } from "./data.js";
import { hashCanonical } from "./sha256.js";
import { evaluateRegionCondition } from "./model.js";
import { mergeState, success, failure, worstCalculationState } from "./utils.js";
import { validateRegionalEngineInputSemantics, validateRegionalEngineOutput } from "./validation.js";
import { deriveRegionalEngineState } from "./engine-input.js";

const value=(input,id)=>input.formalInputs[id]?.status==="KNOWN"?input.formalInputs[id].value:null;
function routeSet(input){return new Set((input.routeEligibility??[]).filter(r=>r.state==="ACTIVE").map(r=>r.routeId));}
const MUSCLE_EXPOSURE_REGIONS=new Set(["BA-DISP-015","BA-DISP-016","BA-DISP-018","BA-DISP-023"]);
const CUMULATIVE_PER_KM_REGIONS=new Set(["BA-DISP-019","BA-DISP-021","BA-DISP-025"]);
const MUSCLE_ENDPOINT_FAMILY_BY_ROUTE=Object.freeze({
  A3_E02_FIGURE_DIGITIZED_SPEED:"HAMNER_COM_ACCEL_PROXY",
  A6_NUCKOLS_SOURCE_PROTOCOL_PROXY:"NUCKOLS_JOINT_POWER_PROXY",
  A3_SRC_SUP_003_JOINT_GRADE:"NUCKOLS_JOINT_POWER_PROXY",
  BAT_SRC_009_GLUTE_EXACT:"PADULO_EMG_PROXY",
  A3_BAT_SRC_009_VASTUS_EXACT:"PADULO_EMG_PROXY",
  BAT_SRC_009_GASTRO_EXACT:"PADULO_EMG_PROXY",
  A5_WILLER_2024_TABULATED_SPEED_WORK:"WILLER_FUNCTIONAL_WORK_PROXY",
});
const MUSCLE_REFERENCE_DEFINITION_BY_REGION_AND_FAMILY=Object.freeze({
  "BA-DISP-015":Object.freeze({HAMNER_COM_ACCEL_PROXY:"RCM-RDEF-015-HAMNER-COM-ACCEL",PADULO_EMG_PROXY:"RCM-RDEF-015-PADULO-EMG"}),
  "BA-DISP-016":Object.freeze({NUCKOLS_JOINT_POWER_PROXY:"RCM-RDEF-016-NUCKOLS-JOINT-POWER",PADULO_EMG_PROXY:"RCM-RDEF-016-PADULO-EMG",WILLER_FUNCTIONAL_WORK_PROXY:"RCM-RDEF-016-WILLER-FUNCTIONAL-WORK"}),
  "BA-DISP-018":Object.freeze({WILLER_FUNCTIONAL_WORK_PROXY:"RCM-RDEF-018-WILLER-FUNCTIONAL-WORK"}),
  "BA-DISP-023":Object.freeze({HAMNER_COM_ACCEL_PROXY:"RCM-RDEF-023-HAMNER-COM-ACCEL",NUCKOLS_JOINT_POWER_PROXY:"RCM-RDEF-023-NUCKOLS-JOINT-POWER",PADULO_EMG_PROXY:"RCM-RDEF-023-PADULO-EMG",WILLER_FUNCTIONAL_WORK_PROXY:"RCM-RDEF-023-WILLER-FUNCTIONAL-WORK"}),
});
const HIP_ENDPOINT_FAMILY_BY_ROUTE=Object.freeze({
  A8_NUCKOLS_HIP_TOTAL_ABSOLUTE_POWER:"NUCKOLS_HIP_TOTAL_ABSOLUTE_POWER",
  A5_WILLER_2024_TABULATED_SPEED_WORK:"WILLER_HIP_FUNCTIONAL_WORK",
});
const HIP_REFERENCE_DEFINITION_BY_FAMILY=Object.freeze({
  NUCKOLS_HIP_TOTAL_ABSOLUTE_POWER:"RCM-RDEF-014-NUCKOLS-HIP-TOTAL-ABSOLUTE-POWER",
  WILLER_HIP_FUNCTIONAL_WORK:"RCM-RDEF-014-WILLER-HIP-FUNCTIONAL-WORK",
});
const TRACE_CONTRACT_VERSION="runload-reason-trace-1.2";
function muscleEndpointFamilies(routes=[]){return new Set(routes.map(route=>MUSCLE_ENDPOINT_FAMILY_BY_ROUTE[route]).filter(Boolean));}
function effectiveHipEndpointFamilies(families=new Set()){return new Set(families);}
function stateForRegion(observations,regionId){
  const regionObservations=(observations??[]).filter(observation=>observation.bodyAreaId===regionId);
  if(!regionObservations.length)return {log:0,overlay:{status:"NONE",observationCount:0,maxIntensity:null,timings:[],sensationTypes:[]},trace:[]};
  const max=Math.max(...regionObservations.map(observation=>observation.noticedIntensity));
  const overlay={
    status:"RECORDED_SEPARATE",
    observationCount:regionObservations.length,
    maxIntensity:max,
    timings:[...new Set(regionObservations.map(observation=>observation.noticedTiming))],
    sensationTypes:[...new Set(regionObservations.map(observation=>observation.sensationType).filter(Boolean))],
  };
  return {
    log:0,
    overlay,
    trace:[{
      traceCode:"SELF_STATE_OBSERVATION_OVERLAY",
      severity:"INFO",
      scope:"REGION",
      regionId,
      sectionId:null,
      routeId:"RCM-INT-021-A1",
      messageKey:"regional.self_state.observation_overlay",
      messageArgs:{intensity:max,observationCount:regionObservations.length},
      numericEffectApplied:false,
      contributionLog:0,
      inputIds:["RL-IN-101","RL-IN-104","RL-IN-106"],
      sourceIds:[],
      parameterIds:[],
    }],
  };
}
function selectExposure(input,regionId){
  const steps=value(input,"RL-IN-015");
  const distance=value(input,"RL-IN-011");
  if(CUMULATIVE_PER_KM_REGIONS.has(regionId)){
    // Source constructs already represent cumulative impulse per distance.
    // Distance remains their source-compatible primary exposure basis.
    if(distance>0)return {basis:"DISTANCE",qEquivalent:distance,qReference:PARAMETERS["RCM-P-GLOBAL-QREF"],alphaE:1,state:"CALCULATED",inputId:"RL-IN-011",parameterId:"RCM-P-GLOBAL-QREF",fallback:false};
    return null;
  }
  if(MUSCLE_EXPOSURE_REGIONS.has(regionId)){
    // R27: gait-cycle weighting is project-defined and calibrated only to the
    // explicit step-count input. Do not replace a missing primary exposure
    // basis with TIME or DISTANCE, because no source calibration links those
    // units to the same dimensionless Reference-100 scale.
    if(steps>0)return {basis:"GAIT_CYCLES",qEquivalent:steps/2,qReference:PARAMETERS["RCM-P-GLOBAL-QREF-GAIT-CYCLES"],alphaE:1,state:"CALCULATED",inputId:"RL-IN-015",parameterId:"RCM-P-GLOBAL-QREF-GAIT-CYCLES",fallback:false};
    return null;
  }
  // Other non-cumulative regions use explicit contacts as the primary project
  // exposure basis. A missing step count is not imputed from distance.
  if(steps>0)return {basis:"CONTACTS",qEquivalent:steps,qReference:PARAMETERS["RCM-P-GLOBAL-QREF-STEPS"],alphaE:1,state:"CALCULATED",inputId:"RL-IN-015",parameterId:"RCM-P-GLOBAL-QREF-STEPS",fallback:false};
  return null;
}
function primaryExposureRequirement(regionId){
  if(CUMULATIVE_PER_KM_REGIONS.has(regionId))return {basis:"DISTANCE",inputId:"RL-IN-011"};
  if(MUSCLE_EXPOSURE_REGIONS.has(regionId))return {basis:"GAIT_CYCLES",inputId:"RL-IN-015"};
  return {basis:"CONTACTS",inputId:"RL-IN-015"};
}
function integrationWeight(section){
  const basisValue={
    DISTANCE:section.distanceKm,
    TIME:section.durationMinutes,
    STEPS:section.steps,
    CONTACTS:section.steps,
  }[section.shareBasis];
  return basisValue??section.shareValue??0;
}
function signedGradePercent(section){
  const magnitude=section.gradePercent;
  if(section.gradeDirection==="FLAT")return 0;
  if(section.gradeDirection==="UPHILL")return magnitude;
  if(section.gradeDirection==="DOWNHILL")return -magnitude;
  return null;
}
const EXACT_SURFACE_CATEGORIES=new Set(["Asphalt","Concrete","Grass","Rubber"]);
const EXACT_ARCH_SURFACE_CATEGORIES=new Set(["Concrete","Rubber"]);
const EXACT_SURFACE_EVIDENCE=new Set(["EXPLICIT_SUBTYPE","MATERIAL_SPECIFIC_PRESET"]);
function hasSupportedSurfaceComponent(section,categories){
  return (section.surfaceComponents??[]).some(component=>categories.has(component.exactSourceCategory)&&EXACT_SURFACE_EVIDENCE.has(component.exactSourceEvidence));
}
function exactSurfaceActiveForSection(section,input){
  const speed=section.speedMps;
  const strike=value(input,"RL-IN-080");
  const shoeType=value(input,"RL-IN-072");
  const softness=value(input,"RL-IN-073");
  return Number.isFinite(speed)&&speed>=3.1667&&speed<=3.5
    &&strike==="RFS"&&shoeType==="TRAINING"&&softness==="NORMAL"
    &&hasSupportedSurfaceComponent(section,EXACT_SURFACE_CATEGORIES);
}
function exactArchSurfaceActiveForSection(section,input){
  const speed=section.speedMps;
  const shoeType=value(input,"RL-IN-072");
  const softness=value(input,"RL-IN-073");
  return Number.isFinite(speed)&&speed>=1.6&&speed<=2.4
    &&shoeType==="TRAINING"&&softness==="NORMAL"
    &&hasSupportedSurfaceComponent(section,EXACT_ARCH_SURFACE_CATEGORIES);
}
function normalizeGait(runningFormat){
  if(runningFormat==="CONTINUOUS_RUN"||runningFormat==="RUN")return "RUN";
  if(runningFormat==="RUN_WALK"||runningFormat==="MIXED")return "MIXED";
  if(runningFormat==="WALK")return "WALK";
  return "UNKNOWN";
}
function checkedSuccess(output){
  const validation=validateRegionalEngineOutput(output);
  return validation.valid
    ?success(output)
    :failure("INTERNAL_INVARIANT_VIOLATION","engine.output_semantic_validation_failed","",{issues:validation.issues});
}
const ACCOUNTED_NUMERIC_PERMISSIONS=new Set(["DIRECT_OR_CONDITIONAL","ROUTING_ONLY","EXPOSURE_ONLY","INTERACTION_ONLY","SELF_REPORTED_SEPARATE","NON_NUMERIC_GATE"]);
function sectionInputIds(section,result){
  const ids=new Set(["RL-IN-003","RL-IN-039"]);
  const exposureId={DISTANCE:"RL-IN-011",TIME:"RL-IN-013",STEPS:"RL-IN-015",CONTACTS:"RL-IN-015"}[section.shareBasis];
  if(exposureId)ids.add(exposureId);
  if(Number.isFinite(section.speedMps))ids.add("RL-DV-019");
  if(Number.isFinite(section.cadenceSpm))ids.add("RL-DV-021");
  if(section.gradeDirection==="UPHILL")ids.add("RL-IN-036");
  if(section.gradeDirection==="DOWNHILL")ids.add("RL-IN-037");
  if(["UPHILL","DOWNHILL","FLAT"].includes(section.gradeDirection))ids.add("RL-IN-032");
  if(section.runningFormat)ids.add("RL-IN-017");
  if((section.surfaceComponents??[]).length){ids.add("RL-IN-040");ids.add("RL-IN-041");}
  if(result.routes.includes("A6_HO2010_HEEL_PEAK_PRESSURE")){ids.add("RL-IN-018");ids.add("RL-IN-032");}
  if(result.routes.includes("SURFACE_X_STANDARD_SHOE")||result.routes.includes("ARCH_SURFACE_X_HEELED_SHOE")||result.routes.includes("A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE")||result.trace.some(item=>item.message?.includes("surface"))){ids.add("RL-IN-072");ids.add("RL-IN-073");ids.add("RL-IN-080");}
  return [...ids];
}
function accountSectionInputs(section,result,usedInputIds){
  const ids=sectionInputIds(section,result);
  for(const id of ids)usedInputIds.add(id);
  return ids;
}
function conditionRouteId(routes){
  const ids=[...new Set(routes??[])].sort();
  if(ids.length===0)return "REFERENCE_CONDITION";
  if(ids.length===1)return ids[0];
  return `COMPOSITE_CONDITION:${ids.join("+")}`;
}
function missingProvenanceReasons({routes,sources,parameters}){
  const reasons=[];
  if(!(routes?.length))reasons.push("NO_ACTIVE_CONDITION_ROUTE_REFERENCE_RATIO_1");
  if(!(sources?.length))reasons.push("NO_DIRECT_SOURCE_FOR_PROJECT_OR_REFERENCE_ROUTE");
  if(!(parameters?.length))reasons.push("NO_PARAMETER_FOR_SOURCE_TABLE_OR_REFERENCE_RATIO");
  return reasons;
}
function sectionConditionContributionEvent(regionId,draft,totalWeight){
  const normalizedSectionWeight=draft.weight/totalWeight;
  return {
    traceCode:"SECTION_CONDITION_CONTRIBUTION",severity:"INFO",scope:"SECTION",regionId,sectionId:draft.sectionId,
    routeId:conditionRouteId(draft.routes),messageKey:"regional.condition.section_contribution",
    messageArgs:{traceContractVersion:TRACE_CONTRACT_VERSION,sectionWeight:draft.weight,totalWeight,normalizedSectionWeight,conditionRatio:draft.ratio,conditionLogRaw:Math.log(draft.ratio),routeIds:[...draft.routes],interactionIds:[...draft.interactions],componentCoverage:draft.componentCoverage,evidenceRange:draft.evidenceRange,missingProvenanceReasons:missingProvenanceReasons(draft)},
    numericEffectApplied:true,contributionLog:normalizedSectionWeight*Math.log(draft.ratio),inputIds:[...draft.inputIds],sourceIds:[...draft.sources],parameterIds:[...draft.parameters],
  };
}
function exposureContributionEvent(regionId,exposure,exposureLog){
  const muscleProjectWeight=MUSCLE_EXPOSURE_REGIONS.has(regionId);
  const sourceProvenance=muscleProjectWeight
    ?"PROJECT_DIMENSIONLESS_REPETITION_WEIGHTING_NO_DIRECT_SOURCE_CALIBRATION"
    :"PROJECT_LINEAR_REFERENCE_RULE_NO_DIRECT_SOURCE";
  return {
    traceCode:"EXPOSURE_CONTRIBUTION",severity:"INFO",scope:"REGION",regionId,sectionId:null,
    routeId:`EXPOSURE_${exposure.basis}${exposure.fallback?"_FALLBACK":""}`,messageKey:"regional.exposure.contribution",
    messageArgs:{traceContractVersion:TRACE_CONTRACT_VERSION,basis:exposure.basis,fallback:exposure.fallback,fallbackStatus:exposure.fallback?"FALLBACK":"PRIMARY",qEquivalent:exposure.qEquivalent,qReference:exposure.qReference,alphaE:exposure.alphaE,exposureRatio:exposure.qEquivalent/exposure.qReference,sourceProvenance,physicalAccumulationClaim:muscleProjectWeight?"PROHIBITED":"NOT_ASSERTED"},
    numericEffectApplied:true,contributionLog:exposureLog,inputIds:[exposure.inputId],sourceIds:[],parameterIds:[exposure.parameterId,"RCM-P-GLOBAL-ALPHAE"],
  };
}
function completeRegionInputAccounting(input,usedInputIds,omittedInputIds){
  for(const item of FORMAL_INPUT_CATALOG){
    if(!ACCOUNTED_NUMERIC_PERMISSIONS.has(item.numericPermission))continue;
    if(!usedInputIds.has(item.id))omittedInputIds.add(item.id);
  }
}
function globalInputAccountingTrace(input,regions){
  const used=new Set(regions.flatMap(region=>region.usedInputIds));
  const traceOnly=[];
  const unknownNotImputed=[];
  const knownNotApplied=[];
  for(const item of FORMAL_INPUT_CATALOG){
    const entry=input.formalInputs[item.id];
    if(item.numericPermission==="TRACE_ONLY"&&entry?.status==="KNOWN")traceOnly.push(item.id);
    else if(ACCOUNTED_NUMERIC_PERMISSIONS.has(item.numericPermission)&&entry?.status!=="KNOWN")unknownNotImputed.push(item.id);
    else if(ACCOUNTED_NUMERIC_PERMISSIONS.has(item.numericPermission)&&entry?.status==="KNOWN"&&!used.has(item.id))knownNotApplied.push(item.id);
  }
  const events=[];
  if(traceOnly.length)events.push({traceCode:"TRACE_ONLY_INPUTS_RETAINED",severity:"INFO",scope:"GLOBAL",regionId:null,sectionId:null,routeId:null,messageKey:"input.trace_only_retained",messageArgs:{count:traceOnly.length},numericEffectApplied:false,contributionLog:null,inputIds:traceOnly,sourceIds:[],parameterIds:[]});
  if(unknownNotImputed.length)events.push({traceCode:"UNKNOWN_INPUTS_NOT_IMPUTED",severity:"INFO",scope:"GLOBAL",regionId:null,sectionId:null,routeId:null,messageKey:"input.unknown_not_imputed",messageArgs:{count:unknownNotImputed.length},numericEffectApplied:false,contributionLog:null,inputIds:unknownNotImputed,sourceIds:[],parameterIds:[]});
  if(knownNotApplied.length)events.push({traceCode:"KNOWN_INPUTS_INELIGIBLE_OR_NON_NUMERIC",severity:"INFO",scope:"GLOBAL",regionId:null,sectionId:null,routeId:null,messageKey:"input.known_not_applied",messageArgs:{count:knownNotApplied.length},numericEffectApplied:false,contributionLog:null,inputIds:knownNotApplied,sourceIds:[],parameterIds:[]});
  return events;
}

function effectiveRegionSemanticIdentity(region,activeRouteIds,activeEndpointFamilyIds=new Set()){
  const hipFamilies=effectiveHipEndpointFamilies(activeEndpointFamilyIds);
  if(region.id==="BA-DISP-014"&&hipFamilies.size===1){
    const family=[...hipFamilies][0];
    const referenceDefinitionId=HIP_REFERENCE_DEFINITION_BY_FAMILY[family];
    if(referenceDefinitionId)return {constructId:region.constructId,referenceDefinitionId};
  }
  if(MUSCLE_EXPOSURE_REGIONS.has(region.id)&&activeEndpointFamilyIds.size===1){
    const family=[...activeEndpointFamilyIds][0];
    const referenceDefinitionId=MUSCLE_REFERENCE_DEFINITION_BY_REGION_AND_FAMILY[region.id]?.[family];
    if(referenceDefinitionId)return {constructId:region.constructId,referenceDefinitionId};
  }
  // R29: endpoint-family semantic identities for contact-weighted foot/ankle routes.
  // The numeric index remains dimensionless. CONTACTS is a project repetition
  // weighting and must not silently turn joint power or peak angle into physical
  // total work/dose. Pressure-time and peak-pressure endpoint families also keep
  // distinct Reference-100 anchors.
  if(activeRouteIds.has("A3_SRC_SUP_003_JOINT_GRADE")&&region.id==="BA-DISP-024"){
    return {constructId:"ANKLE_JOINT_POWER_REPETITION_PROXY_TENDENCY",referenceDefinitionId:"RCM-RDEF-024-NUCKOLS-ANKLE-JOINT-POWER-REPETITION"};
  }
  if(activeRouteIds.has("A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE")){
    if(region.id==="BA-DISP-027")return {constructId:"REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",referenceDefinitionId:"RCM-RDEF-027-A4-HORIGUCHI-PEAK"};
    if(region.id==="BA-DISP-029")return {constructId:"FOREFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",referenceDefinitionId:"RCM-RDEF-029-A4-HORIGUCHI-PEAK"};
  }
  if(activeRouteIds.has("A6_HO2010_HEEL_PEAK_PRESSURE")&&region.id==="BA-DISP-027"){
    return {constructId:"REARFOOT_CUMULATIVE_PEAK_PRESSURE_EXPOSURE_PROXY_TENDENCY",referenceDefinitionId:"RCM-RDEF-027-A6-HO2010-HEEL-PEAK"};
  }
  if(activeRouteIds.has("SURFACE_X_STANDARD_SHOE")){
    if(region.id==="BA-DISP-027")return {constructId:"REARFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",referenceDefinitionId:"RCM-RDEF-027-TESSUTTI-SURFACE-PTI"};
    if(region.id==="BA-DISP-029")return {constructId:"FOREFOOT_CUMULATIVE_PRESSURE_TIME_EXPOSURE_TENDENCY",referenceDefinitionId:"RCM-RDEF-029-TESSUTTI-SURFACE-PTI"};
  }
  if(activeRouteIds.has("ARCH_SURFACE_X_HEELED_SHOE")&&region.id==="BA-DISP-028"){
    return {constructId:"MEDIAL_LONGITUDINAL_ARCH_PEAK_ANGLE_REPETITION_PROXY_TENDENCY",referenceDefinitionId:"RCM-RDEF-028-YAMIN-PEAK-MLA-REPETITION"};
  }
  return {constructId:region.constructId,referenceDefinitionId:region.referenceDefinitionId};
}

export function calculateRegionalLoad(engineInput){
  try{
    const inputIssues=validateRegionalEngineInputSemantics(engineInput);
    if(inputIssues.length)return failure("SCHEMA_INVALID","engine_input.semantic_validation_failed",inputIssues[0].path,{issues:inputIssues});
    if(engineInput.authorityVersion!==AUTHORITY_VERSION)return failure("AUTHORITY_VERSION_MISMATCH","authority.version_mismatch","authorityVersion");
    if(engineInput.parameterSetVersion!==PARAMETER_SET_VERSION)return failure("PARAMETER_SET_MISMATCH","parameter.version_mismatch","parameterSetVersion");
    const expectedDerived=deriveRegionalEngineState(engineInput);
    const suppliedDerived={
      derivedConditions:engineInput.derivedConditions,
      courseSections:engineInput.courseSections,
      routeEligibility:engineInput.routeEligibility,
    };
    if(hashCanonical(suppliedDerived)!==hashCanonical(expectedDerived)){
      return failure("SCHEMA_INVALID","engine_input.derived_state_mismatch","derivedConditions|courseSections|routeEligibility");
    }
    const activity=value(engineInput,"RL-IN-003");
    if(activity==="REST")return checkedSuccess(buildNotApplicable(engineInput));
    const distance=value(engineInput,"RL-IN-011");
    if(!(distance>0))return checkedSuccess(buildUnavailable(engineInput,"NOT_CALCULABLE","Distance is unavailable."));
    if(distance<.5||distance>20)return checkedSuccess(buildUnavailable(engineInput,"OUT_OF_SUPPORTED_RANGE","Distance is outside 0.5–20 km model range."));
    const sections=engineInput.courseSections??[];if(!sections.length)return checkedSuccess(buildUnavailable(engineInput,"NOT_CALCULABLE","No route section is available."));
    const sectionSpeeds=sections.map(section=>section.speedMps??engineInput.derivedConditions.averageSpeedMps);
    if(sectionSpeeds.some(speed=>!Number.isFinite(speed)))return checkedSuccess(buildUnavailable(engineInput,"NOT_CALCULABLE","One or more section speeds are unavailable."));
    if(sectionSpeeds.some(speed=>speed<.5||speed>5))return checkedSuccess(buildUnavailable(engineInput,"OUT_OF_SUPPORTED_RANGE","One or more section speeds are outside the 0.5–5.0 m/s model domain."));
    const rset=routeSet(engineInput);const observations=value(engineInput,"RL-IN-101")??[];const footPlacement=value(engineInput,"RL-IN-080")??"UNKNOWN";
    const regions=[];
    for(const region of REGIONS){let sumLog=0,totalWeight=0,state="CALCULATED",primaryUnavailable=false;const activeRouteIds=new Set(),activeEndpointFamilyIds=new Set(),activeInteractionIds=new Set(),sourceIds=new Set(),parameterIds=new Set(),usedInputIds=new Set(),omittedInputIds=new Set(),reasonTrace=[],sectionComponentCoverage=[],sectionContributionDrafts=[],supportedConditionSectionIds=[],unsupportedConditionSectionIds=[];
      for(const section of sections){const weight=integrationWeight(section);if(!(weight>0)){state=mergeState(state,"PARTIAL");reasonTrace.push({traceCode:"SECTION_WEIGHT_MISSING",severity:"WARNING",scope:"SECTION",regionId:region.id,sectionId:section.sectionId??null,routeId:null,messageKey:"section.weight_missing",messageArgs:{},numericEffectApplied:false,contributionLog:null,inputIds:["RL-IN-039"],sourceIds:[],parameterIds:[]});continue;}
        const gait=normalizeGait(section.runningFormat);const result=evaluateRegionCondition(region.id,{speedMps:section.speedMps,cadenceSpm:section.cadenceSpm,gradePercent:signedGradePercent(section),gait,runSetting:value(engineInput,"RL-IN-018"),footPlacement,surfaceComponents:section.surfaceComponents??value(engineInput,"RL-IN-041")??[],exactSurfaceActive:exactSurfaceActiveForSection(section,engineInput),exactArchSurfaceActive:exactArchSurfaceActiveForSection(section,engineInput),routeSet:rset});const sectionInputs=accountSectionInputs(section,result,usedInputIds);
        state=mergeState(state,result.state);
        if(result.ratio==null){primaryUnavailable=true;for(const t of result.trace)reasonTrace.push({traceCode:t.traceCode,severity:"WARNING",scope:"REGION",regionId:region.id,sectionId:section.sectionId??null,routeId:null,messageKey:"regional.route.unavailable",messageArgs:{message:t.message,evidenceRange:result.evidenceRange},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[],parameterIds:[]});continue;}
        const ratio=result.ratio;const sectionId=section.sectionId??null;const hasNumericConditionRoute=(result.routes?.length??0)>0;if(hasNumericConditionRoute)supportedConditionSectionIds.push(sectionId);else unsupportedConditionSectionIds.push(sectionId);sumLog+=weight*Math.log(ratio);totalWeight+=weight;sectionContributionDrafts.push({sectionId,weight,ratio,inputIds:sectionInputs,routes:[...result.routes],interactions:[...result.interactions],sources:[...result.sources],parameters:[...result.parameters],componentCoverage:result.componentCoverage,evidenceRange:result.evidenceRange});for(const x of result.routes){activeRouteIds.add(x);const family=MUSCLE_EXPOSURE_REGIONS.has(region.id)?MUSCLE_ENDPOINT_FAMILY_BY_ROUTE[x]:region.id==="BA-DISP-014"?HIP_ENDPOINT_FAMILY_BY_ROUTE[x]:null;if(family)activeEndpointFamilyIds.add(family);}for(const x of result.interactions)activeInteractionIds.add(x);for(const x of result.sources)sourceIds.add(x);for(const x of result.parameters)parameterIds.add(x);
        sectionComponentCoverage.push({sectionId:section.sectionId??null,...result.componentCoverage});
        if(result.componentCoverage?.state==="PARTIAL"){
          state=mergeState(state,"PARTIAL");
          reasonTrace.push({traceCode:"COMPONENT_COVERAGE_PARTIAL",severity:"INFO",scope:"SECTION",regionId:region.id,sectionId:section.sectionId??null,routeId:null,messageKey:"regional.component_coverage.partial",messageArgs:{observedComponentIds:result.componentCoverage.observedComponentIds,missingComponentIds:result.componentCoverage.missingComponentIds},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[...result.sources],parameterIds:[...result.parameters]});
        }
        for(const t of result.trace)reasonTrace.push({traceCode:t.traceCode,severity:"WARNING",scope:"REGION",regionId:region.id,sectionId:section.sectionId??null,routeId:null,messageKey:"regional.route.partial",messageArgs:{message:t.message,numericContributionRepresentedBy:t.numericEffectApplied?"SECTION_CONDITION_CONTRIBUTION":null,evidenceRange:result.evidenceRange},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[],parameterIds:[]});}
      if(primaryUnavailable){regions.push(nullRegion(region,state==="CALCULATED"?"NOT_CALCULABLE":state,reasonTrace));continue;}
      if(!(totalWeight>0)){regions.push(nullRegion(region,state==="CALCULATED"?"NOT_CALCULABLE":state,reasonTrace));continue;}
      if(activeRouteIds.size>0&&unsupportedConditionSectionIds.length>0){
        reasonTrace.push({traceCode:"MIXED_SUPPORTED_UNSUPPORTED_SECTION_IMPUTATION_PROHIBITED",severity:"WARNING",scope:"REGION",regionId:region.id,sectionId:null,routeId:null,messageKey:"regional.mixed_supported_unsupported.prohibited",messageArgs:{supportedConditionSectionIds:[...supportedConditionSectionIds],unsupportedConditionSectionIds:[...unsupportedConditionSectionIds],activeRouteIds:[...activeRouteIds].sort(),reason:"UNKNOWN_SECTION_CONDITION_RATIO_MUST_NOT_BE_IMPUTED_AS_ONE"},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[...sourceIds],parameterIds:[]});
        regions.push(nullRegion(region,"NOT_CALCULABLE",reasonTrace));continue;
      }
      if(activeRouteIds.size===0&&unsupportedConditionSectionIds.length>0){
        reasonTrace.push({traceCode:"EXPOSURE_ONLY_ALL_SECTIONS_CONDITION_UNSUPPORTED",severity:"INFO",scope:"REGION",regionId:region.id,sectionId:null,routeId:null,messageKey:"regional.exposure_only.condition_unsupported",messageArgs:{unsupportedConditionSectionIds:[...unsupportedConditionSectionIds],interpretation:"NO_NUMERIC_CONDITION_MAGNITUDE_APPLIED"},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[...sourceIds],parameterIds:[]});
      }
      const effectiveHipFamilies=region.id==="BA-DISP-014"?effectiveHipEndpointFamilies(activeEndpointFamilyIds):new Set();
      if(region.id==="BA-DISP-014"&&effectiveHipFamilies.size>1){
        reasonTrace.push({traceCode:"HETEROGENEOUS_ENDPOINT_FAMILY_MIX_PROHIBITED",severity:"WARNING",scope:"REGION",regionId:region.id,sectionId:null,routeId:null,messageKey:"regional.endpoint_family_mix.prohibited",messageArgs:{endpointFamilies:[...activeEndpointFamilyIds].sort(),activeRouteIds:[...activeRouteIds].sort(),reason:"NO_SHARED_NATIVE_ENDPOINT_REFERENCE_FOR_WITHIN_RECORD_AGGREGATION"},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[...sourceIds],parameterIds:[]});
        regions.push(nullRegion(region,"NOT_CALCULABLE",reasonTrace));continue;
      }
      if(MUSCLE_EXPOSURE_REGIONS.has(region.id)&&activeEndpointFamilyIds.size>1){
        reasonTrace.push({traceCode:"HETEROGENEOUS_PROXY_FAMILY_MIX_PROHIBITED",severity:"WARNING",scope:"REGION",regionId:region.id,sectionId:null,routeId:null,messageKey:"regional.proxy_family_mix.prohibited",messageArgs:{endpointFamilies:[...activeEndpointFamilyIds].sort(),activeRouteIds:[...activeRouteIds].sort(),reason:"NO_CROSS_SOURCE_MAGNITUDE_CALIBRATION_FOR_WITHIN_RECORD_AGGREGATION"},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[...sourceIds],parameterIds:[]});
        regions.push(nullRegion(region,"NOT_CALCULABLE",reasonTrace));continue;
      }
      const conditionLog=sumLog/totalWeight;const exposure=selectExposure(engineInput,region.id);
      if(!exposure){
        const requirement=primaryExposureRequirement(region.id);
        reasonTrace.push({traceCode:"PRIMARY_EXPOSURE_BASIS_UNAVAILABLE_UNCALIBRATED_FALLBACK_PROHIBITED",severity:"WARNING",scope:"REGION",regionId:region.id,sectionId:null,routeId:null,messageKey:"regional.exposure.primary_unavailable",messageArgs:{requiredBasis:requirement.basis,requiredInputId:requirement.inputId,fallbackPolicy:"PROHIBITED_NO_SOURCE_CALIBRATION"},numericEffectApplied:false,contributionLog:null,inputIds:[requirement.inputId],sourceIds:[],parameterIds:[]});
        regions.push(nullRegion(region,"NOT_CALCULABLE",reasonTrace));continue;
      }
      state=mergeState(state,exposure.state);
      usedInputIds.add(exposure.inputId);
      parameterIds.add(exposure.parameterId);
      parameterIds.add("RCM-P-GLOBAL-ALPHAE");
      if(exposure.fallback)reasonTrace.push({traceCode:"EXPOSURE_BASIS_FALLBACK",severity:"INFO",scope:"REGION",regionId:region.id,sectionId:null,routeId:null,messageKey:"regional.exposure.fallback",messageArgs:{basis:exposure.basis,numericContributionRepresentedBy:"EXPOSURE_CONTRIBUTION"},numericEffectApplied:false,contributionLog:null,inputIds:[exposure.inputId],sourceIds:[],parameterIds:[exposure.parameterId,"RCM-P-GLOBAL-ALPHAE"]});
      const exposureLog=exposure.alphaE*Math.log(exposure.qEquivalent/exposure.qReference);const self=stateForRegion(observations,region.id);for(const event of self.trace)for(const id of event.inputIds)usedInputIds.add(id);completeRegionInputAccounting(engineInput,usedInputIds,omittedInputIds);const totalLog=conditionLog+exposureLog;const mechanical=100*Math.exp(totalLog);const index=mechanical;const contributionTrace=[...sectionContributionDrafts.map(draft=>sectionConditionContributionEvent(region.id,draft,totalWeight)),exposureContributionEvent(region.id,exposure,exposureLog)];const finalReasonTrace=[...contributionTrace,...reasonTrace,...self.trace];
      const semanticIdentity=effectiveRegionSemanticIdentity(region,activeRouteIds,activeEndpointFamilyIds);const limitations=["relative_model_estimate_not_measurement","cross_region_physical_comparison_prohibited"];if(MUSCLE_EXPOSURE_REGIONS.has(region.id)){limitations.push("project_dimensionless_repetition_weighting_not_physical_integral","source_endpoint_family_reference_specific");}
      if(region.id==="BA-DISP-014"&&activeRouteIds.has("A8_NUCKOLS_HIP_TOTAL_ABSOLUTE_POWER"))limitations.push("nuckols_hip_total_absolute_power_is_within_source_project_derived_from_reported_positive_and_negative_average_power");
      if(region.id==="BA-DISP-024"&&activeRouteIds.has("A3_SRC_SUP_003_JOINT_GRADE"))limitations.push("project_contact_repetition_weighting_not_physical_total_work","source_endpoint_stride_average_joint_power");
      if(region.id==="BA-DISP-028"&&activeRouteIds.has("ARCH_SURFACE_X_HEELED_SHOE"))limitations.push("project_contact_repetition_weighting_not_physical_arch_dose","source_endpoint_peak_mla_angle");
      if((region.id==="BA-DISP-027"||region.id==="BA-DISP-029")&&activeRouteIds.has("SURFACE_X_STANDARD_SHOE"))limitations.push("surface_source_pti_per_contact_scaled_by_contacts_as_normalized_exposure_proxy");
      if((region.id==="BA-DISP-027"||region.id==="BA-DISP-029")&&(activeRouteIds.has("A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE")||activeRouteIds.has("A6_HO2010_HEEL_PEAK_PRESSURE")))limitations.push("peak_pressure_per_contact_scaled_by_contacts_as_cumulative_peak_exposure_proxy_not_pti");
      regions.push({regionId:region.id,regionName:region.name,constructId:semanticIdentity.constructId,referenceDefinitionId:semanticIdentity.referenceDefinitionId,referenceValue:100,indexExact:index,deltaFromReferenceExact:index-100,displayIndex:Math.round(index),displayDeltaPoints:Math.round(index-100),calculationState:state,components:{conditionLog,exposureLog,interactionLog:0,personalModifierLog:0,selfReportedStateLog:0,totalLog,mechanicalIndexWithoutSelfState:mechanical,selfReportedStateMultiplier:1},exposure:{basis:exposure.basis,qEquivalent:exposure.qEquivalent,qReference:exposure.qReference,alphaE:exposure.alphaE},componentCoverage:{state:sectionComponentCoverage.some(item=>item.state==="PARTIAL")?"PARTIAL":"FULL",sections:sectionComponentCoverage},observationOverlay:self.overlay,activeRouteIds:[...activeRouteIds],activeInteractionIds:[...activeInteractionIds],usedInputIds:[...usedInputIds],omittedInputIds:[...omittedInputIds],sourceIds:[...sourceIds],parameterIds:[...parameterIds],reasonTrace:finalReasonTrace,limitations});}
    const counts={calculatedRegionCount:regions.filter(r=>r.calculationState==="CALCULATED").length,partialRegionCount:regions.filter(r=>r.calculationState==="PARTIAL").length,notCalculableRegionCount:regions.filter(r=>r.calculationState==="NOT_CALCULABLE").length,outOfRangeRegionCount:regions.filter(r=>r.calculationState==="OUT_OF_SUPPORTED_RANGE").length,notApplicableRegionCount:regions.filter(r=>r.calculationState==="NOT_APPLICABLE").length};
    const base={schemaVersion:"runload-regional-engine-output-1.0",traceContractVersion:TRACE_CONTRACT_VERSION,authorityVersion:AUTHORITY_VERSION,parameterSetVersion:PARAMETER_SET_VERSION,engineBuildVersion:engineInput.engineBuildVersion,sessionId:engineInput.recordSnapshot.sessionId,recordRevision:engineInput.recordSnapshot.recordRevision,inputSnapshotHash:engineInput.recordSnapshot.inputSnapshotHash,overallCalculationState:worstCalculationState(regions.map(r=>r.calculationState)),regions,globalReasonTrace:[{traceCode:"PLANNED_INPUT_IGNORED",severity:"INFO",scope:"GLOBAL",regionId:null,sectionId:null,routeId:null,messageKey:"plan.excluded_from_actual",messageArgs:{},numericEffectApplied:false,contributionLog:null,inputIds:["RL-IN-130","RL-IN-131","RL-IN-132","RL-IN-133","RL-IN-134","RL-IN-135","RL-IN-136","RL-IN-137","RL-IN-138","RL-IN-139","RL-IN-140"],sourceIds:[],parameterIds:["RCM-P-PLAN-ACTUAL"]},...globalInputAccountingTrace(engineInput,regions)],coverageSummary:counts,prohibitedFieldsAbsent:{crossRegionRank:true,overallEstimatedLoad:true,injuryRisk:true,dangerScore:true,runRestDecision:true,personalHistoryDelta:true}};
    return checkedSuccess({...base,resultHash:hashCanonical(base)});
  }catch(error){return failure(error.code??"INTERNAL_INVARIANT_VIOLATION","engine.calculation_failed","",{message:error.message,stack:error.stack});}
}
function nullRegion(region,state,trace=[]){return {regionId:region.id,regionName:region.name,constructId:region.constructId,referenceDefinitionId:region.referenceDefinitionId,referenceValue:100,indexExact:null,deltaFromReferenceExact:null,displayIndex:null,displayDeltaPoints:null,calculationState:state,components:{conditionLog:null,exposureLog:null,interactionLog:null,personalModifierLog:null,selfReportedStateLog:null,totalLog:null,mechanicalIndexWithoutSelfState:null,selfReportedStateMultiplier:null},exposure:{basis:null,qEquivalent:null,qReference:null,alphaE:null},componentCoverage:{state:"NONE",sections:[]},observationOverlay:{status:"NOT_CALCULATED",observationCount:0,maxIntensity:null,timings:[],sensationTypes:[]},activeRouteIds:[],activeInteractionIds:[],usedInputIds:[],omittedInputIds:[],sourceIds:[],parameterIds:[],reasonTrace:trace,limitations:["relative_model_estimate_not_measurement"]};}
function buildUnavailable(input,state,message){const regions=REGIONS.map(r=>nullRegion(r,state,[{traceCode:state,severity:"WARNING",scope:"REGION",regionId:r.id,sectionId:null,routeId:null,messageKey:"regional.unavailable",messageArgs:{message},numericEffectApplied:false,contributionLog:null,inputIds:[],sourceIds:[],parameterIds:[]}]));const base={schemaVersion:"runload-regional-engine-output-1.0",traceContractVersion:TRACE_CONTRACT_VERSION,authorityVersion:AUTHORITY_VERSION,parameterSetVersion:PARAMETER_SET_VERSION,engineBuildVersion:input.engineBuildVersion,sessionId:input.recordSnapshot.sessionId,recordRevision:input.recordSnapshot.recordRevision,inputSnapshotHash:input.recordSnapshot.inputSnapshotHash,overallCalculationState:state,regions,globalReasonTrace:[],coverageSummary:{calculatedRegionCount:0,partialRegionCount:0,notCalculableRegionCount:state==="NOT_CALCULABLE"?12:0,outOfRangeRegionCount:state==="OUT_OF_SUPPORTED_RANGE"?12:0,notApplicableRegionCount:0},prohibitedFieldsAbsent:{crossRegionRank:true,overallEstimatedLoad:true,injuryRisk:true,dangerScore:true,runRestDecision:true,personalHistoryDelta:true}};return {...base,resultHash:hashCanonical(base)};}
function buildNotApplicable(input){const out=buildUnavailable(input,"NOT_APPLICABLE","Rest day is not a regional running calculation.");out.coverageSummary.notApplicableRegionCount=12;out.coverageSummary.notCalculableRegionCount=0;const {resultHash,...base}=out;return {...base,resultHash:hashCanonical(base)};}
