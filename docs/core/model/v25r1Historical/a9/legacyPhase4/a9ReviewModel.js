import { REGIONS } from "../vendor_a8_engine/data.js";
import { evaluateA9Condition, evaluateA9UnknownSectionSpeedMarginal } from "./a9EvidenceExtension.js";

export const A9_REVIEW_MODEL_VERSION="RunLoad-A9-12region-review-model-phase3-v2.0";
export const A9_COMMON_RUN_AMOUNT_REFERENCE_KM=5;

function finitePositive(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function signedGrade(section={}){
  if(section.gradeKnown===false||section.gradePercent==null)return null;
  const g=Number(section.gradePercent);
  if(!Number.isFinite(g))return null;
  if(section.gradeDirection==="DOWNHILL")return -Math.abs(g);
  if(section.gradeDirection==="UPHILL")return Math.abs(g);
  return g;
}
function gaitFrom(value){
  if(["RUN","CONTINUOUS_RUN","途中で歩かず走った"].includes(value))return "RUN";
  if(["MIXED","RUN_WALK"].includes(value))return "MIXED";
  if(value==="WALK")return "WALK";
  return "UNKNOWN";
}
function routeFamily(regionId,result){
  const routes=result?.routes??[];
  if(!routes.length)return null;
  const route=routes[0];
  if(["A9-BRUND-019-PTF-DIRECT","A9-PROV-BRUND-019-PTF-BELOW10"].includes(route))return "BRUND2021:PEAK_PTF:BA019:REF5102";
  if(["A9-UEB-021-PTA-ROAD-DIRECT","A9-PROV-UEB-021-PTA-BELOWV1"].includes(route))return "UEBERSCHAR2026:RESULTANT_PTA_ROAD:BA021:REF7P5";
  if(["A9-BRUND-025-ACHILLES-PEAK-DIRECT","A9-PROV-BRUND-025-ACHILLES-BELOW10"].includes(route))return "BRUND2021:PEAK_ACHILLES_FORCE:BA025:REF4562";
  if(route.startsWith("A9-HO-028"))return "HO2010:MIDFOOT_M02:BA028";
  if(route.startsWith("A9-HO-029"))return "HO2010:MEDIAL_FOREFOOT_M04:BA029";
  if(route==="A9-RICE-021-GRADE-MARGINAL-DOWNHILL")return "RICE2024:POSTERIOR_TIBIAL_STRESS_SPEED_MARGINAL:BA021";
  if(route==="A9-FUKUCHI-024-SPEED")return "FUKUCHI2017:ANKLE_TOTAL_ABS_WORK:BA024";
  if(["DIRECT_SPEED_SOURCE","DIRECT_GRADE_SOURCE"].includes(route))return `VAN_HOOREN_2024:${regionId}`;
  if(route==="A8_NUCKOLS_HIP_TOTAL_ABSOLUTE_POWER")return "NUCKOLS2020:HIP_TOTAL_ABS:BA014";
  if(route==="A3_SRC_SUP_003_JOINT_GRADE")return `NUCKOLS2020:JOINT_GRADE:${regionId}`;
  if(route==="A6_NUCKOLS_SOURCE_PROTOCOL_PROXY")return `NUCKOLS2020:JOINT_GRADE:${regionId}`;
  if(route==="A5_WILLER_2024_TABULATED_SPEED_WORK")return `WILLER2024:SPEED_WORK:${regionId}`;
  if(route==="A3_E02_FIGURE_DIGITIZED_SPEED")return `HAMNER2013:SPEED_PROXY:${regionId}`;
  if(route.includes("PADULO")||route.includes("BAT_SRC_009"))return `PADULO2013:GRADE:${regionId}`;
  if(route==="A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE")return `HORIGUCHI2025:GRADE_STRIKE:${regionId}`;
  if(route==="A6_HO2010_HEEL_PEAK_PRESSURE")return "HO2010:HEEL:BA027";
  if(route==="SURFACE_X_STANDARD_SHOE")return `TESSUTTI2012:SURFACE:${regionId}`;
  if(route==="ARCH_SURFACE_X_HEELED_SHOE")return "YAMIN2021:ARCH_SURFACE:BA028";
  return `ROUTE:${routes.slice().sort().join("+")}:${regionId}`;
}
function buildSections(input,speedMps){
  if(Array.isArray(input.sections)&&input.sections.length){
    const explicit=input.sections.map((section,index)=>({
      ...section,
      sectionId:section.sectionId??`section-${index+1}`,
      distanceKm:finitePositive(section.distanceKm)??(finitePositive(section.sharePercent)?Number(input.distanceKm)*Number(section.sharePercent)/100:null),
    })).filter(section=>section.distanceKm>0);
    const homogeneousWholeRun=explicit.length===1 && (Math.abs(Number(explicit[0].distanceKm)-Number(input.distanceKm))<=1e-9 || Math.abs(Number(explicit[0].sharePercent)-100)<=1e-9);
    return explicit.map((section,index)=>({
      sectionId:section.sectionId??`section-${index+1}`,
      distanceKm:section.distanceKm,
      speedMps:finitePositive(section.speedMps)??(homogeneousWholeRun?speedMps:null),
      gradeKnown:section.gradeKnown!==false&&section.gradePercent!=null,
      gradePercent:section.gradePercent,
      gradeDirection:section.gradeDirection,
      cadenceSpm:finitePositive(section.cadenceSpm),
      surfaceComponents:Array.isArray(section.surfaceComponents)?section.surfaceComponents:[],
      exactSurfaceActive:Boolean(section.exactSurfaceActive),
      exactArchSurfaceActive:Boolean(section.exactArchSurfaceActive),
    }));
  }
  return [{
    sectionId:"whole-run",
    distanceKm:Number(input.distanceKm),
    speedMps,
    gradeKnown:input.gradeKnown===true,
    gradePercent:input.gradeKnown===true?Number(input.gradePercent??0):null,
    gradeDirection:input.gradeDirection,
    cadenceSpm:finitePositive(input.cadenceSpm),
    surfaceComponents:Array.isArray(input.surfaceComponents)?input.surfaceComponents:[],
    exactSurfaceActive:Boolean(input.exactSurfaceActive),
    exactArchSurfaceActive:Boolean(input.exactArchSurfaceActive),
  }];
}

export function calculateA9RegionalReview(input={},options={}){
  const includeProvisional=options.includeProvisional!==false;
  const distanceKm=finitePositive(input.distanceKm);
  const durationMinutes=finitePositive(input.durationMinutes);
  if(!distanceKm||!durationMinutes)return {ok:false,error:{code:"INVALID_MANDATORY_RUN_FACTS",message:"distanceKm and durationMinutes must both be finite and positive"}};
  const speedMps=distanceKm*1000/(durationMinutes*60);
  const commonRunAmountIndex=100*distanceKm/A9_COMMON_RUN_AMOUNT_REFERENCE_KM;
  const sections=buildSections(input,speedMps);
  if(!sections.length)return {ok:false,error:{code:"NO_VALID_SECTIONS",message:"no positive-distance section is available"}};
  const gait=gaitFrom(input.runningFormat);
  const runSetting=String(input.runSetting??"UNKNOWN").toUpperCase();
  const footPlacement=String(input.footPlacement??"UNKNOWN").toUpperCase();
  const shoeType=String(input.shoeType??"UNKNOWN").toUpperCase();
  const shoeSoftness=String(input.shoeSoftness??"UNKNOWN").toUpperCase();

  const regions=REGIONS.map(region=>{
    const evaluated=sections.map(section=>{
      if(!section.gradeKnown)return {section,result:null,supported:false,family:null,reason:"GRADE_UNKNOWN"};
      const context={
        speedMps:section.speedMps,
        wholeRunAverageSpeedMps:speedMps,
        cadenceSpm:section.cadenceSpm,
        gradePercent:signedGrade(section),
        gait,runSetting,footPlacement,shoeType,shoeSoftness,
        surfaceComponents:section.surfaceComponents,
        exactSurfaceActive:section.exactSurfaceActive,
        exactArchSurfaceActive:section.exactArchSurfaceActive,
      };
      const result=Number.isFinite(section.speedMps)?evaluateA9Condition(region.id,context,{includeProvisional}):evaluateA9UnknownSectionSpeedMarginal(region.id,context);
      if(!result)return {section,result:null,supported:false,family:null,reason:"SECTION_SPEED_UNKNOWN_NO_SOURCE_MARGINAL_ROUTE"};
      const supported=Number.isFinite(result?.ratio)&&result.ratio>0&&(result?.routes?.length??0)>0;
      return {section,result,supported,family:supported?routeFamily(region.id,result):null,reason:supported?null:"NO_NUMERIC_CONDITION_ROUTE"};
    });
    const supported=evaluated.filter(item=>item.supported);
    const allSupported=supported.length===evaluated.length&&evaluated.length>0;
    const families=new Set(supported.map(item=>item.family));
    const compatible=allSupported&&families.size===1;
    let conditionRatio=null,conditionSupport="UNSUPPORTED",conditionReason="NO_FULL_RECORD_CONDITION_ROUTE";
    if(compatible){
      const totalWeight=evaluated.reduce((s,item)=>s+item.section.distanceKm,0);
      conditionRatio=Math.exp(evaluated.reduce((s,item)=>s+(item.section.distanceKm/totalWeight)*Math.log(item.result.ratio),0));
      conditionSupport="SUPPORTED_FULL";
      conditionReason=null;
    }else if(supported.length>0){
      conditionSupport="PARTIAL_UNAPPLIED";
      conditionReason=families.size>1?"HETEROGENEOUS_REFERENCE_FAMILY":"MIXED_SUPPORTED_UNSUPPORTED_SECTIONS";
    }
    const reviewIndex=conditionSupport==="SUPPORTED_FULL"?commonRunAmountIndex*conditionRatio:commonRunAmountIndex;
    const activeRouteIds=[...new Set(supported.flatMap(item=>item.result.routes??[]))];
    const sourceIds=[...new Set(supported.flatMap(item=>item.result.sources??[]))];
    const semantic=supported.find(item=>item.result?.a9SemanticIdentity)?.result.a9SemanticIdentity??null;
    const supportTiers=[...new Set(supported.map(item=>item.result?.a9SupportTier).filter(Boolean))];
    const routeSignatures=[...new Set(supported.map(item=>item.result?.a9RouteSignature).filter(Boolean))].sort();
    const uncertaintyClasses=[...new Set(supported.map(item=>item.result?.a9UncertaintyClass).filter(Boolean))].sort();
    const historySignature=routeSignatures.length===1?routeSignatures[0]:(routeSignatures.length>1?`COMPOSITE:${routeSignatures.join("||")}`:null);
    return {
      regionId:region.id,regionName:region.name,
      reviewConstructId:"A9_REGIONAL_REVIEW_INDEX_RUN_AMOUNT_PLUS_SUPPORTED_CONDITION",
      reviewReferenceDefinitionId:"A9-RDEF-COMMON-RUN-AMOUNT-5KM",
      reviewReferenceValue:100,
      reviewIndexExact:reviewIndex,displayIndex:Math.round(reviewIndex),displayIndex1dp:Math.round(reviewIndex*10)/10,
      commonRunAmountIndex,
      conditionResponseRatio:conditionRatio,
      conditionResponseSupported:conditionSupport==="SUPPORTED_FULL",
      conditionSupport,conditionReason,
      conditionReferenceFamily:compatible?[...families][0]:null,
      conditionConstructId:semantic?.constructId??region.constructId,
      conditionReferenceDefinitionId:semantic?.referenceDefinitionId??region.referenceDefinitionId,
      conditionSupportTier:supportTiers.length===1?supportTiers[0]:(supportTiers.length>1?"MIXED_DIRECT_PROVISIONAL":null),
      conditionRouteSignatures:routeSignatures,
      conditionHistorySignature:historySignature,
      conditionUncertaintyClasses:uncertaintyClasses,
      activeRouteIds,sourceIds,
      unsupportedConditionInterpretedAsNeutral:false,
      isMeasuredPhysicalLoad:false,supportsDiagnosis:false,supportsSafetyDecision:false,
      sectionAudit:evaluated.map(item=>({sectionId:item.section.sectionId,distanceKm:item.section.distanceKm,supported:item.supported,family:item.family,ratio:item.supported?item.result.ratio:null,routeIds:item.supported?item.result.routes:[],supportTier:item.supported?(item.result.a9SupportTier??null):null,routeSignature:item.supported?(item.result.a9RouteSignature??null):null,uncertaintyClass:item.supported?(item.result.a9UncertaintyClass??null):null,reason:item.reason})) ,
    };
  });
  return {ok:true,value:{
    schemaVersion:"runload-a9-regional-review-output-0.1",modelVersion:A9_REVIEW_MODEL_VERSION,
    commonRunAmount:{constructId:"A9_COMMON_RUN_AMOUNT_REVIEW_INDEX",referenceDistanceKm:A9_COMMON_RUN_AMOUNT_REFERENCE_KM,value:commonRunAmountIndex,meaning:"project-defined review/display amount index; not measured regional load"},
    derivedConditions:{averageSpeedMps:speedMps},auditConfiguration:{includeProvisional},regions,
    coverageSummary:{finiteRegionCount:regions.filter(r=>Number.isFinite(r.reviewIndexExact)).length,conditionSupportedRegionCount:regions.filter(r=>r.conditionResponseSupported).length,conditionPartialRegionCount:regions.filter(r=>r.conditionSupport==="PARTIAL_UNAPPLIED").length},
    limitations:["review_index_not_measured_tissue_load","unsupported_condition_response_not_assigned_scientific_neutral_ratio","cross_region_physical_load_ranking_prohibited"],
  }};
}
