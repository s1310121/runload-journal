import { BUILD_ID, REGION_DEFS, calculateRun } from "./nextPrimaryR12Engine.js";
import { adaptCurrentRecordToR12Candidate, buildAppRetainedInputTrace } from "./nextPrimaryR12AppAdapter.js";
import { NEW_MODEL_REGION_DEFS } from "../newModelV1/newModelV1Engine.js";

export const PRIMARY_REGIONAL_V2_MODEL_VERSION = "runload-primary-regional-v2.0";
export const PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION = "runload-primary-regional-output-semantics-v2.0";
export const PRIMARY_REGIONAL_V2_AUTHORITY_VERSION = "RunLoad-NextModel-R6-R14-Promotion-20260826-V1.0";
export const PRIMARY_REGIONAL_V2_BUILD_ID = BUILD_ID;

const DISPLAY_BY_R = new Map(NEW_MODEL_REGION_DEFS.map((d) => [d.id, d]));
const DEF_BY_R = new Map(REGION_DEFS.map((d) => [d.id, d]));
const BASE_SOURCE_BY_R = Object.freeze(Object.fromEntries(REGION_DEFS.map((d) => [d.id, d.baselineSource])));
const SOURCE_REGISTRY = Object.freeze({
  FUKUCHI_2017: { label: "Fukuchi et al. 2017", role: "股関節・足関節の速度応答" },
  GAZENDAM_HOF_2007_FROZEN_CURRENT: { label: "Gazendam & Hof 2007", role: "保存済み筋活動経路（再現性制約あり）" },
  HAGEN_2023: { label: "Hagen et al. 2023", role: "膝蓋大腿関節の速度・相対cadence応答" },
  VAN_HOOREN_2024: { label: "Van Hooren et al. 2024", role: "脛骨・アキレス腱の速度/条件応答" },
  HO_2010: { label: "Ho et al. 2010", role: "足底ピーク圧の速度/上り応答" },
  TESSUTTI_2012_NATURAL_GRASS: { label: "Tessutti et al. 2012", role: "自然芝の限定的な足底圧応答" },
  HORIGUCHI_2025_VERIFIED_STRIKE_GRADE: { label: "Horiguchi et al. 2025", role: "検証済み足部接地×勾配条件" },
});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function sanitize(v){return String(v||"").replace(/[^0-9A-Za-z._-]/g,"_");}
function revision(record={}){return String(record.updatedAt||record.createdAt||"");}
function unique(xs=[]){return [...new Set(xs.filter(Boolean).map(String))];}
function evidenceRank(s){return ({DIRECT_KNOT:0,SOURCE_DEFINED_MODEL:0,SOURCE_BOUNDED_INTERPOLATION:1,BOUNDED_TRANSFER:2,PROVISIONAL_FROZEN_INHERITED_PATH:3,PROVISIONAL_SEPARABLE_COMPOSITION:4,PROVISIONAL_GENERALITY_FALLBACK:5,PROVISIONAL_COMPONENT_ENVELOPE:5,EVIDENCE_INSUFFICIENT:9})[String(s||"")]??8;}
function weakest(states=[]){const xs=unique(states);return xs.sort((a,b)=>evidenceRank(b)-evidenceRank(a))[0]||"EVIDENCE_INSUFFICIENT";}
function sourceIdsForRegion(rid, rawResult={}){
  const ids=[BASE_SOURCE_BY_R[rid]];
  const text=JSON.stringify(rawResult||{});
  if(rid==="R05" && text.includes("VAN_HOOREN_2024")) ids.push("VAN_HOOREN_2024");
  if((rid==="R10"||rid==="R12") && text.includes("TESSUTTI_2012_NATURAL_GRASS")) ids.push("TESSUTTI_2012_NATURAL_GRASS");
  if((rid==="R10"||rid==="R12") && text.includes("HORIGUCHI")) ids.push("HORIGUCHI_2025_VERIFIED_STRIKE_GRADE");
  return unique(ids);
}
function aggregateEvidence(regionAgg={}){return weakest(regionAgg.segmentEvidence||[]);}
function axisRows(rawResult={}, rid){
  const axes=rawResult.axisEstimates||{};
  return Object.entries(axes).map(([axis, byRegion])=>{
    const r=byRegion?.[rid]||{};
    return Object.freeze({axis, value:r.value !== null && r.value !== "" && Number.isFinite(Number(r.value))?Number(r.value):null, valueEnvelope:Array.isArray(r.valueEnvelope)?clone(r.valueEnvelope):null, state:r.state||"UNAVAILABLE", evidenceState:aggregateEvidence(r), unsupportedDistanceKm:Number(r.unsupportedDistanceKm||0)});
  });
}
function buildRows(rawResult={}){
  return REGION_DEFS.map((def)=>{
    const display=DISPLAY_BY_R.get(def.id)||{};
    const agg=rawResult?.regions?.[def.id]||{};
    const value=agg.value !== null && agg.value !== "" && Number.isFinite(Number(agg.value))?Number(agg.value):null;
    const evidenceState=aggregateEvidence(agg);
    const axes=axisRows(rawResult,def.id);
    return Object.freeze({
      regionId:display.displayId||def.id,
      newModelRegionId:def.id,
      regionName:def.name,
      value,
      indexValue:value,
      valueEnvelope:Array.isArray(agg.valueEnvelope)?clone(agg.valueEnvelope):null,
      calculationState:value==null?(Number(agg.unsupportedDistanceKm||0)>0?"PARTIAL":"NOT_CALCULABLE"):"CALCULATED",
      provenance:evidenceState,
      evidenceState,
      evidenceStates:Object.freeze(unique(agg.segmentEvidence||[])),
      unsupportedDistanceKm:Number(agg.unsupportedDistanceKm||0),
      construct:def.construct,
      constructId:`PRIMARY_${def.id}_CONSTRUCT_V2`,
      referenceId:`PRIMARY_${def.id}_REFERENCE_V2`,
      referenceAmountKm:1,
      referenceSpeedMps:def.referenceSpeedMps,
      sourceIds:Object.freeze(sourceIdsForRegion(def.id,rawResult)),
      axisEstimates:Object.freeze(axes),
      optionalApplied:Object.freeze(axes.filter((x)=>x.value!=null).map((x)=>Object.freeze({axis:x.axis,evidenceState:x.evidenceState,value:x.value,valueEnvelope:x.valueEnvelope}))),
      fallback:Object.freeze((agg.segmentEvidence||[]).filter((s)=>String(s).startsWith("PROVISIONAL_"))),
    });
  });
}
function bodyMap(rows=[]){return Object.freeze({version:"primary-regional-v2-bodymap-1.0",regions:Object.freeze(rows.map((r)=>Object.freeze({regionId:r.regionId,newModelRegionId:r.newModelRegionId,regionName:r.regionName,value:r.value,calculationState:r.calculationState})))});}
function comparisonSignatures(record={}){return Object.freeze(Object.fromEntries((record.result?.regions||[]).map((row)=>[row.regionId,Object.freeze({regionId:row.regionId,newModelRegionId:row.newModelRegionId,modelVersion:PRIMARY_REGIONAL_V2_MODEL_VERSION,outputSemanticVersion:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,constructId:row.constructId,referenceId:row.referenceId,directDeltaAllowed:true})])));}
export function buildPrimaryRegionalV2ComparisonSignature(resultRecord={},rowOrRegionId=null){const id=typeof rowOrRegionId==="string"?rowOrRegionId:rowOrRegionId?.regionId;return resultRecord?.comparison_signatures?.[id]||null;}
export function comparePrimaryRegionalV2Signatures(a,b){const same=Boolean(a&&b&&a.modelVersion===b.modelVersion&&a.outputSemanticVersion===b.outputSemanticVersion&&a.regionId===b.regionId&&a.constructId===b.constructId&&a.referenceId===b.referenceId);return Object.freeze({directDeltaAllowed:same,status:same?"COMPARABLE":"INCOMPATIBLE",reason:same?"SAME_REGION_SEMANTIC":"SEMANTIC_OR_MODEL_MISMATCH"});}

export function createPrimaryRegionalV2ResultRecord({record,feedback={},sessionSequence=1,allRecords=[]}={}){
  const trace=buildAppRetainedInputTrace({record,feedback,sessionSequence}); if(!trace.ok) return trace;
  const common={id:`primary-regional-v2-result-${sanitize(record.id)}-${sanitize(revision(record))}`,record_id:record.id,source_record_revision:revision(record),generated_at:new Date().toISOString(),model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,authority_version:PRIMARY_REGIONAL_V2_AUTHORITY_VERSION,engine_build_version:PRIMARY_REGIONAL_V2_BUILD_ID,output_semantic_version:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,input_trace:clone(trace.value),formal_input_snapshot:clone(trace.value),input_snapshot:clone(trace.uiInput),source_registry:SOURCE_REGISTRY};
  if(String(record.activityType||"").toLowerCase()==="rest") return {ok:true,resultRecord:Object.freeze({...common,state:"REST",engine_input_snapshot:null,result:null,body_map_payload:Object.freeze({version:"primary-regional-v2-bodymap-1.0",regions:Object.freeze([])}),comparison_signatures:Object.freeze({})})};
  const engineInput=adaptCurrentRecordToR12Candidate({record,allRecords});
  const raw=calculateRun(engineInput);
  const rows=buildRows(raw);
  const result=Object.freeze({state:raw.state||"UNAVAILABLE",courseState:raw.courseState||null,combinedConditionState:raw.combinedConditionState||null,model_version:PRIMARY_REGIONAL_V2_MODEL_VERSION,outputSemanticVersion:PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION,exposure:clone(raw.exposure||null),regions:Object.freeze(rows),axisEstimates:clone(raw.axisEstimates||{}),rawEngineState:raw.state||null});
  const base={...common,state:"RUN",engine_input_snapshot:clone(engineInput),result,body_map_payload:bodyMap(rows),comparison_signatures:null};
  base.comparison_signatures=comparisonSignatures(base);
  return {ok:true,resultRecord:Object.freeze(base)};
}
export function validatePrimaryRegionalV2ResultRecord(item={}){
  const issues=[];
  if(item.model_version!==PRIMARY_REGIONAL_V2_MODEL_VERSION)issues.push("MODEL_VERSION");
  if(item.output_semantic_version!==PRIMARY_REGIONAL_V2_OUTPUT_SEMANTIC_VERSION)issues.push("OUTPUT_SEMANTIC_VERSION");
  if(!item.id||!item.record_id)issues.push("IDENTITY");
  if(item.input_trace?.count!==93||!Array.isArray(item.input_trace?.entries)||item.input_trace.entries.length!==93)issues.push("INPUT_TRACE_93_REQUIRED");
  const repairs=(item.input_trace?.entries||[]).filter((x)=>x.traceAction==="R12_REPAIR_REQUIRED");
  if(repairs.length!==19)issues.push("TRACE_REPAIR_19_REQUIRED");
  if(item.state==="REST")return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
  const rows=item.result?.regions;
  if(!Array.isArray(rows)||rows.length!==12)issues.push("REGION_COUNT_12");
  if(!Array.isArray(item.body_map_payload?.regions)||item.body_map_payload.regions.length!==12)issues.push("BODY_MAP_COUNT_12");
  for(const row of Array.isArray(rows)?rows:[]){if(!row.regionId||!row.constructId||!row.referenceId)issues.push(`REGION_IDENTITY:${row.regionId||"UNKNOWN"}`);if(row.value!=null&&!Number.isFinite(Number(row.value)))issues.push(`NONFINITE_VALUE:${row.regionId}`);}
  return Object.freeze({valid:issues.length===0,issues:Object.freeze(issues)});
}
export function upsertPrimaryRegionalV2ResultRecord(items=[],resultRecord){const next=(Array.isArray(items)?items:[]).filter((x)=>x.id!==resultRecord.id&&!(x.record_id===resultRecord.record_id&&x.source_record_revision===resultRecord.source_record_revision&&x.model_version===PRIMARY_REGIONAL_V2_MODEL_VERSION));next.push(resultRecord);return next.sort((a,b)=>String(a.record_id).localeCompare(String(b.record_id))||String(a.source_record_revision).localeCompare(String(b.source_record_revision))||String(a.id).localeCompare(String(b.id)));}
