import { calculateRun, MODEL_VERSION, OUTPUT_SEMANTIC_VERSION } from './nextPrimaryR12Engine.js';
import { adaptCurrentRecordToR12Candidate, buildAppRetainedInputTrace } from './nextPrimaryR12AppAdapter.js';

export const NEXT_R12_CANDIDATE_STORAGE_KEY='runload.next.r12.candidate.results';
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function sanitize(v){return String(v||'').replace(/[^0-9A-Za-z._-]/g,'_');}
function revision(record){return String(record.updatedAt||record.createdAt||'');}

export function createNextPrimaryR12CandidateResultRecord({record,feedback={},sessionSequence=1,allRecords=[]}={}){
  const trace=buildAppRetainedInputTrace({record,feedback,sessionSequence});if(!trace.ok)return trace;
  const common={id:`next-r12-candidate-${sanitize(record.id)}-${sanitize(revision(record))}`,record_id:record.id,source_record_revision:revision(record),generated_at:new Date().toISOString(),candidate:true,model_version:MODEL_VERSION,output_semantic_version:OUTPUT_SEMANTIC_VERSION,input_trace:clone(trace.value)};
  if(String(record.activityType||'').toLowerCase()==='rest')return {ok:true,resultRecord:Object.freeze({...common,state:'REST',engine_input_snapshot:null,result:null})};
  const engineInput=adaptCurrentRecordToR12Candidate({record,allRecords});const result=calculateRun(engineInput);
  return {ok:true,resultRecord:Object.freeze({...common,state:'RUN',engine_input_snapshot:clone(engineInput),result:clone(result)})};
}
export function upsertNextPrimaryR12CandidateResult(items=[],resultRecord){const next=(Array.isArray(items)?items:[]).filter(x=>x.id!==resultRecord.id&&!(x.record_id===resultRecord.record_id&&x.source_record_revision===resultRecord.source_record_revision));next.push(resultRecord);return next.sort((a,b)=>String(a.record_id).localeCompare(String(b.record_id))||String(a.source_record_revision).localeCompare(String(b.source_record_revision))||String(a.id).localeCompare(String(b.id)));}
export function latestNextPrimaryR12CandidateResult(items=[],recordId){return [...(Array.isArray(items)?items:[])].filter(x=>x.record_id===recordId).sort((a,b)=>String(b.source_record_revision).localeCompare(String(a.source_record_revision))||String(b.generated_at).localeCompare(String(a.generated_at)))[0]||null;}
