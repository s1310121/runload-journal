import { validateRegionalEngineOutput } from "./validation.js";

export function buildBodyMapPayload(engineOutput, locale="ja-JP") {
  const validation = validateRegionalEngineOutput(engineOutput);
  if (!validation.valid) {
    const error = new TypeError("Regional engine output failed semantic validation.");
    error.code = "SCHEMA_INVALID";
    error.issues = validation.issues;
    throw error;
  }
  return {schemaVersion:"runload-bodymap-payload-1.0",sessionId:engineOutput.sessionId,referenceValue:100,
    regions:engineOutput.regions.map(r=>({regionId:r.regionId,regionName:r.regionName,displayIndex:r.displayIndex,displayDeltaPoints:r.displayDeltaPoints,calculationState:r.calculationState,detailAvailable:r.indexExact!=null,summaryMessageKey:r.indexExact==null?"regional_index.unavailable":r.displayDeltaPoints===0?"regional_index.reference_equal":r.displayDeltaPoints>0?"regional_index.above_reference":"regional_index.below_reference",summaryMessageArgs:{index:r.displayIndex,deltaPoints:r.displayDeltaPoints},coverageMessageKey:r.calculationState==="PARTIAL"?"regional_index.partial":null})),disclaimerKey:"regional_index.relative_model_estimate_not_measurement"};
}
