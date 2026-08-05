import { BODY_PARTS, BODY_PART_KEYS } from "../core/model/modelConstants.js";
import {
  BODY_AREA_TAXONOMY,
  normalizeBodyAreaObservations,
} from "../core/model/v27/bodyAreaTaxonomy.js";
import { SAFETY_FLAG_KEYS } from "../core/safety/supportDecision.js";
import { BODY_PART_DISPLAY_NAMES, SUBJECTIVE_STATUS_LABELS } from "./recordPresentation.js";

export const DETAILED_SUBJECTIVE_STATUSES = Object.freeze([
  "discomfort_reported",
  "strong_reported",
]);

const LEGACY_DETAILED_SUBJECTIVE_STATUSES = Object.freeze([
  "fatigue_reported",
  "discomfort_reported",
  "strong_reported",
]);

function stringValue(value, fallback = "") {
  return value === undefined || value === null ? String(fallback) : String(value);
}

function checkedValue(value) {
  return value === true || value === "1" || value === "on" || value === "true";
}

export function subjectiveFieldsFromFeedback(feedback = {}) {
  const status = String(feedback.checkStatus || "deferred");
  const detailed = LEGACY_DETAILED_SUBJECTIVE_STATUSES.includes(status);
  const fields = {
    subjectiveStatus: detailed ? status : status,
    subjectiveDetailType: "",
    legacyTopBodyPart: feedback.legacyTopBodyPart || "",
    consultationNote: feedback.consultationNote || "",
    unexpectedSymptom: feedback.unexpectedSymptom ? "1" : "__unchecked__",
    symptomTiming: feedback.symptomContext?.timing || "",
    symptomStartedWhen: feedback.symptomContext?.startedWhen || "",
    symptomNote: feedback.symptomContext?.note || "",
    bodyObservationTiming: feedback.bodyAreaObservations?.[0]?.noticedTiming || "UNKNOWN",
    bodyObservationSensation: feedback.bodyAreaObservations?.[0]?.sensationType || "NOT_SELECTED",
    bodyObservationNote: feedback.bodyAreaObservations?.[0]?.note || "",
  };
  BODY_PARTS.forEach((bodyPart) => {
    const key = BODY_PART_KEYS[bodyPart];
    const fatigue = Number(feedback.fatigueByBodyPart?.[bodyPart] || 0);
    const discomfort = Number(feedback.discomfortByBodyPart?.[bodyPart] || 0);
    fields[`fatigue_${key}`] = String(fatigue);
    fields[`discomfort_${key}`] = String(discomfort);
    fields[`reviewed_${key}`] = feedback.reviewedBodyParts?.[bodyPart] || fatigue > 0 || discomfort > 0 ? "1" : "__unchecked__";
  });
  SAFETY_FLAG_KEYS.forEach((flag) => {
    fields[`safety_${flag}`] = feedback.safetyFlags?.[flag] ? "1" : "__unchecked__";
  });
  const observationById = new Map(
    normalizeBodyAreaObservations(feedback.bodyAreaObservations)
      .map((item) => [item.areaId, item]),
  );
  BODY_AREA_TAXONOMY.forEach((area) => {
    const observation = observationById.get(area.id);
    fields[`bodyArea_${area.key}`] = String(observation?.intensity || 0);
    fields[`bodyAreaLaterality_${area.key}`] = String(observation?.laterality || "UNKNOWN");
  });
  return Object.freeze(fields);
}

export function resolveSubjectiveStatusFromFields(fields = {}) {
  const primary = stringValue(fields.subjectiveStatus, "deferred");
  if (primary === "body_reported") return stringValue(fields.subjectiveDetailType, "");
  return primary;
}

export function enteredBodyPartsFromFields(fields = {}) {
  return BODY_PARTS.filter((bodyPart) => {
    const key = BODY_PART_KEYS[bodyPart];
    return checkedValue(fields[`reviewed_${key}`])
      || Number(fields[`fatigue_${key}`] || 0) > 0
      || Number(fields[`discomfort_${key}`] || 0) > 0;
  });
}

export function enteredBodyAreasFromFields(fields = {}) {
  return BODY_AREA_TAXONOMY
    .map((area) => Object.freeze({
      ...area,
      intensity: Number(fields[`bodyArea_${area.key}`] || 0),
      laterality: String(fields[`bodyAreaLaterality_${area.key}`] || "UNKNOWN"),
    }))
    .filter((item) => Number.isInteger(item.intensity) && item.intensity >= 1 && item.intensity <= 5);
}

export function subjectiveSummaryFromFields(fields = {}) {
  const status = resolveSubjectiveStatusFromFields(fields);
  const bodyParts = enteredBodyPartsFromFields(fields);
  const bodyAreas = enteredBodyAreasFromFields(fields);
  const label = SUBJECTIVE_STATUS_LABELS[status] || (status ? "入力途中" : "入力途中");
  const bodyPartLabels = bodyParts.map((bodyPart) => BODY_PART_DISPLAY_NAMES[bodyPart] || bodyPart);
  const bodyAreaLabels = bodyAreas.map((item) => item.label);
  let description = "入力しなくても記録を保存できます。";
  if (status === "none_reported") description = "身体の記録は残さず保存します。特になしとは断定しません。";
  else if (status === "deferred" || status === "not_asked") description = "身体の記録は未確認です。";
  else if (bodyAreaLabels.length) description = `${bodyAreaLabels.slice(0, 3).join("、")}${bodyAreaLabels.length > 3 ? `ほか${bodyAreaLabels.length - 3}部位` : ""}を入力しています。`;
  else if (bodyPartLabels.length) description = `保存された身体記録（${bodyPartLabels.slice(0, 3).join("、")}${bodyPartLabels.length > 3 ? `ほか${bodyPartLabels.length - 3}部位` : ""}）を保持しています。`;
  else if (LEGACY_DETAILED_SUBJECTIVE_STATUSES.includes(status)) description = "必要な詳細部位だけを選んでください。";
  return Object.freeze({
    status,
    label,
    description,
    bodyParts,
    bodyPartLabels,
    bodyAreas,
    bodyAreaLabels,
  });
}

export function mergeSubjectiveFields(workspaceFields = {}, fallbackFeedback = {}) {
  return Object.freeze({
    ...subjectiveFieldsFromFeedback(fallbackFeedback),
    ...Object.fromEntries(Object.entries(workspaceFields || {}).map(([key, value]) => [key, stringValue(value)])),
  });
}
