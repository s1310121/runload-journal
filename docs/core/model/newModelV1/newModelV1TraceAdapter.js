import { adaptStoredRecordToRegionalV1Ui, regionalV1ProfileContext } from "../regionalV1/regionalV1InputAdapter.js";
import { adaptPrototypeRecord } from "../regionalV1/engine/adapter.js";

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}

// This adapter reuses only the frozen 93-ID identity mapping. It never calls the V2.6 numerical engine.
export function buildNewModelV1FormalInputTrace({record,feedback={},sessionSequence=1}={}){
  const uiInput=adaptStoredRecordToRegionalV1Ui(record,feedback);
  const adapted=adaptPrototypeRecord(uiInput,{sessionId:record.id,sessionSequence,recordRevision:1,profile:regionalV1ProfileContext(record)});
  if(!adapted.ok)return {ok:false,code:adapted.error?.code||"NEW_MODEL_TRACE_ADAPTER_FAILED",error:adapted.error||null};
  const bundle=clone(adapted.value);
  // Preserve the frozen technical identities for RUN_WALK facts that are contract-only outside the 93-ID register.
  bundle.contractOnlyInputs={
    runWalkRunningDistanceKm:record.runningFormat==="RUN_WALK"?Number(record.runWalkRunningDistanceKm)||null:null,
    runWalkRunningDurationMinutes:record.runningFormat==="RUN_WALK"?Number(record.runWalkRunningDurationMinutes)||null:null,
    runWalkRunningSections:record.runningFormat==="RUN_WALK"?clone(record.runWalkRunningSections||[]):[],
  };
  return {ok:true,value:bundle,uiInput};
}
