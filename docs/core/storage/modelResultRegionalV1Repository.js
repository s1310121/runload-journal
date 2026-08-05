import { REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/regionalV1ResultService.js";
import { createCollectionRepository } from "./collectionRepository.js";
import { STORAGE_KEYS } from "./storageKeys.js";

function normalize(item = {}) {
  if (!item || typeof item !== "object" || item.model_version !== REGIONAL_V1_MODEL_VERSION || !item.id || !item.record_id) return null;
  return Object.freeze({ ...item, id: String(item.id), record_id: String(item.record_id), source_record_revision: String(item.source_record_revision || ""), generated_at: String(item.generated_at || "") });
}
function sort(items) { return [...items].sort((a,b)=>a.record_id.localeCompare(b.record_id)||a.source_record_revision.localeCompare(b.source_record_revision)||a.id.localeCompare(b.id)); }
export function createModelResultRegionalV1Repository(gateway) {
  const repo=createCollectionRepository({gateway,storageKey:STORAGE_KEYS.modelResultsRegionalV1,normalizeItem:normalize,getItemId:x=>x.id,sortItems:sort});
  function loadForRecord(recordId){return repo.loadAll().filter(x=>x.record_id===recordId);}
  function findLatestForRecord(recordId){return loadForRecord(recordId).sort((a,b)=>b.source_record_revision.localeCompare(a.source_record_revision)||b.generated_at.localeCompare(a.generated_at)||b.id.localeCompare(a.id))[0]||null;}
  function latestByRecord(){const map=new Map();repo.loadAll().forEach(x=>{const cur=map.get(x.record_id);if(!cur||x.source_record_revision>cur.source_record_revision||(x.source_record_revision===cur.source_record_revision&&x.id>cur.id))map.set(x.record_id,x);});return map;}
  return Object.freeze({...repo,loadForRecord,findLatestForRecord,latestByRecord});
}
