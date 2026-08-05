import {
  V27_EMPHASIS_REGION_IDS,
  V27_MODEL_VERSION,
  V27_REGIONAL_VIEW_IDS,
} from "./v27Constants.js";
import { adaptRecordToV27Session } from "./v27InputAdapter.js";
import {
  assertV27ResultSemantics,
  calculateV27Session,
} from "./v27Model.js";
import { calculateV27PersonalRelative } from "./v27Personal.js";

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function recordOrder(record) {
  return `${String(record.date || "")}\u0000${String(record.id || "")}`;
}

function resultId(record) {
  return [
    "v27-result",
    String(record.id || "").replace(/[^a-zA-Z0-9._-]/g, "_"),
    String(record.updatedAt || record.createdAt || "").replace(/[^0-9A-Za-z]/g, ""),
  ].join("-");
}

function latestPriorSnapshots(targetRecord, allRecords, existingResultRecords) {
  const recordById = new Map(allRecords.map((record) => [record.id, record]));
  const targetOrder = recordOrder(targetRecord);
  const latest = new Map();
  existingResultRecords.forEach((resultRecord) => {
    const sourceRecord = recordById.get(resultRecord.record_id)
      || resultRecord.input_snapshot?.record;
    if (!sourceRecord || recordOrder(sourceRecord) >= targetOrder) return;
    const current = latest.get(resultRecord.record_id);
    if (
      !current
      || resultRecord.source_record_revision > current.source_record_revision
      || (
        resultRecord.source_record_revision === current.source_record_revision
        && resultRecord.id > current.id
      )
    ) {
      latest.set(resultRecord.record_id, resultRecord);
    }
  });
  return [...latest.values()];
}

function cadenceFacts(priorSnapshots) {
  return priorSnapshots
    .filter((snapshot) => snapshot.state === "RUN" && snapshot.derived_facts)
    .map((snapshot) => ({
      session_id: snapshot.record_id,
      model_version: snapshot.model_version,
      activity_type: snapshot.derived_facts.activity_type,
      cadence_provenance_reliable: snapshot.derived_facts.cadence_provenance_reliable,
      speed_mps: snapshot.derived_facts.speed_mps,
      cadence_spm: snapshot.derived_facts.cadence_spm,
    }));
}

function priorRegionalFacts(priorSnapshots, regionId) {
  return priorSnapshots.flatMap((snapshot) => {
    const row = snapshot.result?.regional?.[regionId];
    if (!row) return [];
    return [{
      session_id: snapshot.record_id,
      result_id: snapshot.id,
      model_version: snapshot.model_version,
      coverage_signature: row.coverage_signature,
      raw_exposure: row.raw_exposure,
      date: snapshot.input_snapshot?.record?.date || "",
    }];
  });
}

function personalReferenceSnapshots(record, result, priorSnapshots, generatedAt) {
  return Object.freeze(Object.fromEntries(V27_EMPHASIS_REGION_IDS.map((regionId) => {
    const personal = calculateV27PersonalRelative({
      targetSessionId: record.id,
      currentRegionResult: result.regional[regionId],
      priorResults: priorRegionalFacts(priorSnapshots, regionId),
    });
    return [regionId, Object.freeze({
      ...personal,
      personal_reference_snapshot_id: `${resultId(record)}-personal-${regionId}`,
      region_id: regionId,
      coverage_signature: result.regional[regionId].coverage_signature,
      generated_at_cutoff: generatedAt,
      target_session_id: record.id,
      target_excluded: true,
    })];
  })));
}

export function createV27ResultRecord({
  record,
  allRecords = [],
  existingResultRecords = [],
}) {
  const generatedAt = String(record.updatedAt || record.createdAt || new Date().toISOString());
  const priorSnapshots = latestPriorSnapshots(record, allRecords, existingResultRecords);
  const adaptation = adaptRecordToV27Session(record, {
    priorCadenceFacts: cadenceFacts(priorSnapshots),
  });
  if (!adaptation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_INPUT_ADAPTATION_FAILED",
      validation: adaptation,
      resultRecord: null,
    });
  }
  if (adaptation.state === "REST") {
    return Object.freeze({
      ok: true,
      resultRecord: Object.freeze({
        id: resultId(record),
        record_id: record.id,
        source_record_revision: generatedAt,
        generated_at: generatedAt,
        model_version: V27_MODEL_VERSION,
        state: "REST",
        input_snapshot: Object.freeze({ record: cloneValue(record) }),
        result: null,
        personal_reference_snapshots: Object.freeze({}),
        view_contract: Object.freeze({
          default: V27_REGIONAL_VIEW_IDS.withinRun,
          switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
        }),
      }),
    });
  }

  let result;
  try {
    result = calculateV27Session(adaptation.session);
  } catch (error) {
    return Object.freeze({
      ok: false,
      code: "V27_CALCULATION_FAILED",
      message: String(error?.message || error),
      validation: adaptation,
      resultRecord: null,
    });
  }
  const semanticValidation = assertV27ResultSemantics(result);
  if (!semanticValidation.ok) {
    return Object.freeze({
      ok: false,
      code: "V27_SEMANTIC_VALIDATION_FAILED",
      validation: semanticValidation,
      resultRecord: null,
    });
  }
  const personalSnapshots = personalReferenceSnapshots(
    record,
    result,
    priorSnapshots,
    generatedAt,
  );
  return Object.freeze({
    ok: true,
    resultRecord: Object.freeze({
      id: resultId(record),
      record_id: record.id,
      source_record_revision: generatedAt,
      generated_at: generatedAt,
      model_version: V27_MODEL_VERSION,
      state: "RUN",
      input_snapshot: Object.freeze({
        record: cloneValue(record),
        session: cloneValue(adaptation.session),
        provenance: cloneValue(adaptation.provenance),
        warnings: cloneValue(adaptation.warnings),
      }),
      derived_facts: Object.freeze({
        speed_mps: adaptation.provenance.speed_mps,
        cadence_spm: adaptation.provenance.cadence_spm,
        cadence_provenance_reliable: adaptation.session.cadence_provenance_reliable,
        activity_type: adaptation.session.activity_type,
      }),
      result,
      personal_reference_snapshots: personalSnapshots,
      view_contract: Object.freeze({
        default: V27_REGIONAL_VIEW_IDS.withinRun,
        switchable: Object.freeze(Object.values(V27_REGIONAL_VIEW_IDS)),
      }),
      claims: Object.freeze({
        is_measured_physical_load: false,
        supports_absolute_regional_load_comparison: false,
        is_compositional_share: false,
        supports_medical_decision: false,
      }),
    }),
  });
}

export function upsertV27ResultRecord(items, resultRecord) {
  const nextItems = [...items];
  const index = nextItems.findIndex((item) => item.id === resultRecord.id);
  if (index >= 0) nextItems[index] = resultRecord;
  else nextItems.push(resultRecord);
  return nextItems.sort((left, right) => (
    left.record_id.localeCompare(right.record_id)
    || left.source_record_revision.localeCompare(right.source_record_revision)
    || left.id.localeCompare(right.id)
  ));
}

