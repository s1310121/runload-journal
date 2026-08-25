import { buildNewModelV1FormalInputTrace } from "./newModelV1TraceAdapter.js";
import { calculateNewModelV1, NEW_MODEL_REGION_DEFS, NEW_MODEL_V1_AUTHORITY_VERSION, NEW_MODEL_V1_ENGINE_BUILD, NEW_MODEL_V1_MODEL_VERSION, NEW_MODEL_V1_OUTPUT_SEMANTIC_VERSION, regionDefinition, validateNewModelV1Calculation } from "./newModelV1Engine.js";

export { NEW_MODEL_V1_MODEL_VERSION, NEW_MODEL_V1_OUTPUT_SEMANTIC_VERSION } from "./newModelV1Engine.js";

const BASE_SOURCE_BY_REGION=Object.freeze({R01:["FUKUCHI_2017"],R02:["GAZENDAM_HOF_2007"],R03:["GAZENDAM_HOF_2007"],R04:["GAZENDAM_HOF_2007"],R05:["HAGEN_2023"],R06:["VAN_HOOREN_2024"],R07:["GAZENDAM_HOF_2007"],R08:["FUKUCHI_2017"],R09:["VAN_HOOREN_2024"],R10:["HO_2010"],R11:["HO_2010"],R12:["HO_2010"]});
const SOURCE_REGISTRY=Object.freeze({
  FUKUCHI_2017:{label:"Fukuchi et al. 2017",role:"canonical joint-work speed response"},
  GAZENDAM_HOF_2007:{label:"Gazendam & Hof 2007",role:"canonical muscle-activation speed response"},
  HAGEN_2023:{label:"Hagen et al. 2023",role:"canonical PFJ cumulative impulse speed response"},
  VAN_HOOREN_2024:{label:"Van Hooren et al. 2024",role:"canonical tibial/Achilles cumulative impulse and grade/cadence optional response"},
  HO_2010:{label:"Ho et al. 2010",role:"canonical plantar peak-pressure speed response"},
  TESSUTTI_2012:{label:"Tessutti et al. 2012",role:"natural-grass plantar optional response"},
});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function sanitize(v){return String(v||"").replace(/[^0-9A-Za-z._-]/g,"_");}
function revision(record){return String(record.updatedAt||record.createdAt||"");}
function normalizeSurfaceCategory(value){const v=String(value||"").toUpperCase();if(v==="NATURAL_GRASS"||v==="NATURAL_GRASS_SURFACE")return "NATURAL_GRASS";if(v==="PAVED"||v==="ASPHALT")return "ASPHALT";if(v==="TRACK"||v==="RUBBER_TRACK")return "RUBBER_TRACK";if(v==="CONCRETE")return "CONCRETE";return null;}
function continuousSurface(record={}){const c=record.course||{};const pairs=[["pavedPercent","ASPHALT"],["trackPercent","RUBBER_TRACK"],["naturalGrassPercent","NATURAL_GRASS"]];const out=[];for(const [key,category] of pairs){const share=Number(c[key]||0);if(share>0)out.push({category,share_percent:share});}const total=out.reduce((s,x)=>s+x.share_percent,0);return Math.abs(total-100)<=0.01?out:null;}
function sectionsForModel(record={}){if(String(record.runningFormat||"").toUpperCase()==="RUN_WALK")return Array.isArray(record.runWalkRunningSections)?record.runWalkRunningSections:[];return Array.isArray(record.course?.sections)?record.course.sections:[];}
function invalidGradeSummary(){return {uphill_share_percent:100,downhill_share_percent:0,uphill_grade_percent:999,downhill_grade_percent:0};}
function gradeFromSections(record={}){
  const sections=sectionsForModel(record);if(!sections.length)return null;
  let total=0,up=0,down=0,upAngleWeighted=0,downAngleWeighted=0;
  for(const s of sections){
    const share=Number(s.sharePercent||0);if(!(share>0)||!Number.isFinite(share))return invalidGradeSummary();
    total+=share;
    const dir=String(s.gradeDirection||"FLAT").toUpperCase();
    const g=Math.abs(Number(s.gradePercent||0));
    if(!Number.isFinite(g)||g>10.510423529000000+1e-9)return invalidGradeSummary();
    if(dir==="UPHILL"){up+=share;upAngleWeighted+=share*Math.atan(g/100);}
    else if(dir==="DOWNHILL"){down+=share;downAngleWeighted+=share*Math.atan(g/100);}
    else if(dir!=="FLAT")return invalidGradeSummary();
  }
  if(Math.abs(total-100)>0.01)return invalidGradeSummary();
  const upMeanAngle=up>0?upAngleWeighted/up:0,downMeanAngle=down>0?downAngleWeighted/down:0;
  return {uphill_share_percent:up,downhill_share_percent:down,uphill_grade_percent:Math.tan(upMeanAngle)*100,downhill_grade_percent:Math.tan(downMeanAngle)*100};
}
function gradeSummary(record={}){const fromSections=gradeFromSections(record);if(fromSections)return fromSections;if(String(record.runningFormat||"").toUpperCase()==="RUN_WALK")return null;const c=record.course||{};if(String(c.gradeKnowledge||"").toUpperCase()==="KNOWN_FLAT")return {uphill_share_percent:0,downhill_share_percent:0,uphill_grade_percent:0,downhill_grade_percent:0};if(String(c.gradeKnowledge||"").toUpperCase()!=="KNOWN_PROFILE"&&String(c.gradeKnowledge||"").toUpperCase()!=="KNOWN_SUMMARY")return null;return {uphill_share_percent:Number(c.upPercent||0),downhill_share_percent:Number(c.downPercent||0),uphill_grade_percent:Number(c.upGradePercent||0),downhill_grade_percent:Number(c.downGradePercent||0)};}
function invalidSurfaceComponents(){return [{category:"UNMAPPED",share_percent:100}];}
function surfaceFromSections(record={}){
  const sections=sectionsForModel(record);if(!sections.length)return null;
  const by=new Map();let total=0;
  for(const s of sections){
    const sectionShare=Number(s.sharePercent||0);if(!(sectionShare>0)||!Number.isFinite(sectionShare))return invalidSurfaceComponents();
    total+=sectionShare;
    const comps=Array.isArray(s.surfaceComponents)?s.surfaceComponents:[];if(!comps.length)return invalidSurfaceComponents();
    let componentTotal=0;
    for(const comp of comps){
      const componentShare=Number(comp?.sharePercent||0);if(!(componentShare>0)||!Number.isFinite(componentShare))return invalidSurfaceComponents();
      componentTotal+=componentShare;
      const category=normalizeSurfaceCategory(comp?.userCategory||comp?.category||"");if(!category)return invalidSurfaceComponents();
      const combinedShare=sectionShare*componentShare/100;
      by.set(category,(by.get(category)||0)+combinedShare);
    }
    if(Math.abs(componentTotal-100)>0.01)return invalidSurfaceComponents();
  }
  if(Math.abs(total-100)>0.01)return invalidSurfaceComponents();
  return [...by.entries()].map(([category,share_percent])=>({category,share_percent}));
}
function surfaceComponents(record={}){if(String(record.runningFormat||"").toUpperCase()==="RUN_WALK")return surfaceFromSections(record);return surfaceFromSections(record)||continuousSurface(record);}
function cadence(record={},durationMinutes){if(String(record.runningFormat||"").toUpperCase()==="RUN_WALK")return null;const steps=Number(record.steps);if(!(steps>0)||!(durationMinutes>0))return null;const prov=String(record.stepsProvenance||"").toUpperCase();if(!["DEVICE_MEASURED","DEVICE_SYNCED"].includes(prov))return null;return steps/durationMinutes;}
function calculationInputs(record={}){const runWalk=String(record.runningFormat||"").toUpperCase()==="RUN_WALK";const distanceKm=Number(runWalk?record.runWalkRunningDistanceKm:record.distanceKm),durationMinutes=Number(runWalk?record.runWalkRunningDurationMinutes:record.durationMinutes);return {distanceKm,durationMinutes,gradeSummary:gradeSummary(record),cadenceSpm:cadence(record,durationMinutes),surfaceComponents:surfaceComponents(record),runWalk};}
function bodyMap(result){return {version:"new-model-v1-bodymap-1.0",regions:NEW_MODEL_REGION_DEFS.map(def=>({regionId:def.displayId,newModelRegionId:def.id,regionName:def.name,value:result.values[def.id],calculationState:"CALCULATED"}))};}
function comparisonSignatures(resultRecord){return Object.fromEntries((resultRecord.result?.regions||[]).map(row=>[row.regionId,{regionId:row.regionId,newModelRegionId:row.newModelRegionId,modelVersion:NEW_MODEL_V1_MODEL_VERSION,outputSemanticVersion:NEW_MODEL_V1_OUTPUT_SEMANTIC_VERSION,constructId:row.constructId,referenceId:row.referenceId,directDeltaAllowed:true}]));}
export function buildNewModelV1ComparisonSignature(resultRecord={},rowOrRegionId=null){const id=typeof rowOrRegionId==="string"?rowOrRegionId:rowOrRegionId?.regionId;return resultRecord?.comparison_signatures?.[id]||null;}
export function compareNewModelV1Signatures(a,b){const same=Boolean(a&&b&&a.modelVersion===b.modelVersion&&a.outputSemanticVersion===b.outputSemanticVersion&&a.regionId===b.regionId&&a.constructId===b.constructId&&a.referenceId===b.referenceId);return {directDeltaAllowed:same,reason:same?"SAME_REGION_SEMANTIC":"SEMANTIC_OR_MODEL_MISMATCH"};}
export function createNewModelV1ResultRecord({record,feedback={},sessionSequence=1}={}){
  const trace=buildNewModelV1FormalInputTrace({record,feedback,sessionSequence});if(!trace.ok)return trace;
  const common={id:`new-model-v1-result-${sanitize(record.id)}-${sanitize(revision(record))}`,record_id:record.id,source_record_revision:revision(record),generated_at:new Date().toISOString(),model_version:NEW_MODEL_V1_MODEL_VERSION,authority_version:NEW_MODEL_V1_AUTHORITY_VERSION,engine_build_version:NEW_MODEL_V1_ENGINE_BUILD,output_semantic_version:NEW_MODEL_V1_OUTPUT_SEMANTIC_VERSION,input_snapshot:clone(trace.uiInput),formal_input_snapshot:clone(trace.value),source_registry:SOURCE_REGISTRY};
  if(record.activityType==="rest")return {ok:true,resultRecord:Object.freeze({...common,state:"REST",result:null,body_map_payload:{version:"new-model-v1-bodymap-1.0",regions:[]},comparison_signatures:{}})};
  const inputs=calculationInputs(record);const calc=calculateNewModelV1(inputs);
  if(calc.state!=="OK")return {ok:true,resultRecord:Object.freeze({...common,state:"RUN",engine_input_snapshot:clone(inputs),result:{state:calc.state,speed_mps:calc.speed_mps??null,model_version:NEW_MODEL_V1_MODEL_VERSION,regions:[],values:{},provenance:{},optional_applied:[],fallback:[]},body_map_payload:{version:"new-model-v1-bodymap-1.0",regions:[]},comparison_signatures:{}})};
  const appliedByRegion=new Map();for(const item of calc.optional_applied||[]){if(!appliedByRegion.has(item.region))appliedByRegion.set(item.region,[]);appliedByRegion.get(item.region).push(item);}
  const regions=NEW_MODEL_REGION_DEFS.map(def=>{const optional=appliedByRegion.get(def.id)||[];const sourceIds=[...(BASE_SOURCE_BY_REGION[def.id]||[]),...optional.flatMap(x=>x.sourceIds||[])];return {regionId:def.displayId,newModelRegionId:def.id,regionName:def.name,value:calc.values[def.id],indexValue:calc.values[def.id],calculationState:"CALCULATED",provenance:calc.provenance[def.id],construct:def.construct,constructId:`NEW_MODEL_${def.id}_CONSTRUCT_V1`,referenceId:`NEW_MODEL_${def.id}_REFERENCE_V1`,referenceAmountKm:1,referenceSpeedMps:def.referenceSpeedMps,sourceIds:[...new Set(sourceIds)],optionalApplied:clone(optional),fallback:clone(calc.fallback||[])};});
  const base={...common,state:"RUN",engine_input_snapshot:clone(inputs),result:{state:"OK",speed_mps:calc.speed_mps,model_version:NEW_MODEL_V1_MODEL_VERSION,regions,values:clone(calc.values),provenance:clone(calc.provenance),optional_applied:clone(calc.optional_applied||[]),fallback:clone(calc.fallback||[])},body_map_payload:null,source_registry:SOURCE_REGISTRY};base.body_map_payload=bodyMap(calc);base.comparison_signatures=comparisonSignatures({...base,result:base.result});return {ok:true,resultRecord:Object.freeze(base)};
}
export function validateNewModelV1ResultRecord(item={}){const issues=[];if(item.model_version!==NEW_MODEL_V1_MODEL_VERSION)issues.push("MODEL_VERSION");if(!item.id||!item.record_id)issues.push("IDENTITY");const formal=item.formal_input_snapshot?.formalInputs;if(!formal||Object.keys(formal).length!==93)issues.push("FORMAL_INPUT_93_REQUIRED");if(item.state==="REST")return {valid:issues.length===0,issues};if(item.result?.state==="BASELINE_OOD")return {valid:issues.length===0,issues};const v=validateNewModelV1Calculation(item.result||{});issues.push(...v.issues);const rows=item.result?.regions;if(!Array.isArray(rows)||rows.length!==12)issues.push("REGION_COUNT");if(!Array.isArray(item.body_map_payload?.regions)||item.body_map_payload.regions.length!==12)issues.push("BODY_MAP_COUNT");return {valid:issues.length===0,issues};}
export function upsertNewModelV1ResultRecord(items=[],resultRecord){const next=items.filter(x=>x.id!==resultRecord.id);next.push(resultRecord);return next.sort((a,b)=>a.record_id.localeCompare(b.record_id)||a.source_record_revision.localeCompare(b.source_record_revision)||a.id.localeCompare(b.id));}
export function newModelV1RegionDefinition(regionId){return regionDefinition(regionId);}
