import { REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/regionalV1ResultService.js";
import { NEW_MODEL_V1_MODEL_VERSION } from "../model/newModelV1/newModelV1ResultService.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../model/nextPrimaryR12Candidate/primaryRegionalV2ResultService.js";
import { REGIONAL_V1_MODEL_VERSION as V25R1_REGIONAL_V1_MODEL_VERSION } from "../model/v25r1Historical/regionalV1ResultService.js";
import { REGIONAL_V1_MODEL_VERSION as FCR_V19_REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/fcrV19ResultService.js";
import { REGIONAL_V1_MODEL_VERSION as LEGACY_PHASE4_REGIONAL_V1_MODEL_VERSION } from "../model/regionalV1/legacyPhase4ResultService.js";
import { createCollectionRepository } from "./collectionRepository.js";
import { STORAGE_KEYS } from "./storageKeys.js";

const SUPPORTED_REGIONAL_MODEL_VERSIONS = new Set([PRIMARY_REGIONAL_V2_MODEL_VERSION, NEW_MODEL_V1_MODEL_VERSION, REGIONAL_V1_MODEL_VERSION, V25R1_REGIONAL_V1_MODEL_VERSION, FCR_V19_REGIONAL_V1_MODEL_VERSION, LEGACY_PHASE4_REGIONAL_V1_MODEL_VERSION]);

function normalize(item = {}) {
  if (!item || typeof item !== "object" || !SUPPORTED_REGIONAL_MODEL_VERSIONS.has(item.model_version) || !item.id || !item.record_id) return null;
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
