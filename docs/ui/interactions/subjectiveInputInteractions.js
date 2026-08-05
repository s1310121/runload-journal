import { BODY_PARTS, BODY_PART_KEYS } from "../../core/model/modelConstants.js";
import {
  BODY_AREA_GROUPS,
  BODY_AREA_LATERALITY,
  BODY_AREA_TAXONOMY,
} from "../../core/model/v27/bodyAreaTaxonomy.js";
import { SAFETY_FLAG_KEYS } from "../../core/safety/supportDecision.js";
import { showFormMessages } from "./formUtilities.js";
import {
  markRecordInputJourneyReturn,
  serializeRecordInputForm,
  updateRecordInputWorkspaceFields,
} from "../recordInputWorkspace.js";

const BODY_ENTRY_STATUSES = new Set(["discomfort_reported", "strong_reported"]);

function intensityLabel(value = 0) {
  return ["記録しない", "1・わずか", "2・軽い", "3・中程度", "4・強い", "5・とても強い"][Number(value)] || "記録しない";
}

function currentStatus(form) {
  return form.querySelector('[name="subjectiveStatus"]:checked')?.value || "deferred";
}

function setHidden(element, hidden) {
  if (element) element.hidden = hidden;
}

function bodyAreaControl(form, area) {
  return form.querySelector(`[name="bodyArea_${area.key}"]`);
}

function bodyAreaLateralityControl(form, area) {
  return form.querySelector(`[name="bodyAreaLaterality_${area.key}"]`);
}

function selectedBodyAreas(form) {
  return BODY_AREA_TAXONOMY.filter((area) => {
    const value = Number(bodyAreaControl(form, area)?.value || 0);
    return Number.isInteger(value) && value >= 1 && value <= 5;
  });
}

function updateSelectionSummary(form) {
  const selected = selectedBodyAreas(form);
  const summary = form.querySelector("[data-subjective-selection-summary]");
  const strong = summary?.querySelector("strong");
  const span = summary?.querySelector("span");
  if (strong) {
    strong.textContent = selected.length
      ? `${selected.length}部位を入力中`
      : "部位は未選択です";
  }
  if (span) {
    span.textContent = selected.length
      ? `${selected.slice(0, 3).map((area) => area.label).join("、")}${selected.length > 3 ? `ほか${selected.length - 3}部位` : ""}を入力しています。`
      : "該当するグループだけを開いて選んでください。";
  }
  BODY_AREA_GROUPS.forEach((group) => {
    const count = selected.filter((area) => area.groupId === group.id).length;
    const badge = form.querySelector(`[data-body-area-group-count="${group.id}"]`);
    if (badge) badge.textContent = count ? `${count}部位入力中` : "未選択";
  });
}

function refreshBodyAreaState(form) {
  BODY_AREA_TAXONOMY.forEach((area) => {
    const control = bodyAreaControl(form, area);
    const field = form.querySelector(`[data-body-area-field="${area.id}"]`);
    const value = Number(control?.value || 0);
    const selected = value > 0;
    const lateralityField = field?.querySelector("[data-body-area-laterality-field]");
    const lateralityControl = bodyAreaLateralityControl(form, area);
    const output = field?.querySelector("[data-body-area-value]");
    const mapRegion = form.querySelector(`[data-subjective-region-jump="${area.key}"]`);
    field?.classList.toggle("is-selected", selected);
    if (output) output.textContent = intensityLabel(value);
    if (lateralityField) lateralityField.hidden = !selected;
    if (lateralityControl) lateralityControl.disabled = !selected;
    if (mapRegion) {
      mapRegion.classList.toggle("is-selected", selected);
      mapRegion.setAttribute("aria-pressed", String(selected));
      mapRegion.dataset.intensity = String(value);
      const title = mapRegion.querySelector("title");
      if (title) title.textContent = `${area.label}：${intensityLabel(value)}`;
    }
  });
  updateSelectionSummary(form);
}

function updateVisibility(form) {
  const status = currentStatus(form);
  setHidden(form.querySelector("[data-subjective-body-entry]"), !BODY_ENTRY_STATUSES.has(status));
  setHidden(form.querySelector("[data-safety-details]"), status !== "strong_reported");
}

function clearLegacyBodyFields(form) {
  BODY_PARTS.forEach((bodyPart) => {
    const key = BODY_PART_KEYS[bodyPart];
    const reviewed = form.querySelector(`[name="reviewed_${key}"]`);
    const fatigue = form.querySelector(`[name="fatigue_${key}"]`);
    const discomfort = form.querySelector(`[name="discomfort_${key}"]`);
    if (reviewed) reviewed.checked = false;
    if (fatigue) fatigue.value = "0";
    if (discomfort) discomfort.value = "0";
  });
  const legacyTop = form.querySelector('[name="legacyTopBodyPart"]');
  if (legacyTop) legacyTop.value = "";
}

function clearBodyAreaFields(form) {
  BODY_AREA_TAXONOMY.forEach((area) => {
    const control = bodyAreaControl(form, area);
    if (control) control.value = "0";
    const laterality = bodyAreaLateralityControl(form, area);
    if (laterality) laterality.value = BODY_AREA_LATERALITY.unknown;
  });
}

function clearConditionFields(form) {
  SAFETY_FLAG_KEYS.forEach((flag) => {
    const control = form.querySelector(`[name="safety_${flag}"]`);
    if (control) control.checked = false;
  });
  const unexpected = form.querySelector('[name="unexpectedSymptom"]');
  if (unexpected) unexpected.checked = false;
  ["symptomTiming", "symptomStartedWhen", "symptomNote"].forEach((name) => {
    const control = form.querySelector(`[name="${name}"]`);
    if (control) control.value = "";
  });
}

function normalizeForStatus(form) {
  const status = currentStatus(form);
  form.querySelector('[name="subjectiveDetailType"]')?.setAttribute("value", "");
  if (!BODY_ENTRY_STATUSES.has(status)) {
    clearLegacyBodyFields(form);
    clearBodyAreaFields(form);
    clearConditionFields(form);
    return;
  }
  if (status === "discomfort_reported") clearConditionFields(form);
}

function validate(form) {
  const status = currentStatus(form);
  const messages = [];
  const selected = selectedBodyAreas(form);
  const hasLegacy = BODY_PARTS.some((bodyPart) => {
    const key = BODY_PART_KEYS[bodyPart];
    return Number(form.querySelector(`[name="fatigue_${key}"]`)?.value || 0) > 0
      || Number(form.querySelector(`[name="discomfort_${key}"]`)?.value || 0) > 0;
  });
  const invalidArea = BODY_AREA_TAXONOMY.some((area) => {
    const value = Number(bodyAreaControl(form, area)?.value || 0);
    return !Number.isInteger(value) || value < 0 || value > 5;
  });
  const invalidLaterality = selected.some((area) => (
    !Object.values(BODY_AREA_LATERALITY).includes(
      String(bodyAreaLateralityControl(form, area)?.value || ""),
    )
  ));
  const hasCondition = SAFETY_FLAG_KEYS.some(
    (flag) => form.querySelector(`[name="safety_${flag}"]`)?.checked,
  ) || form.querySelector('[name="unexpectedSymptom"]')?.checked;
  if (invalidArea) messages.push("部位の程度は0〜5の整数で選んでください。");
  if (invalidLaterality) messages.push("入力した部位の左右を選び直してください。");
  if (
    status === "discomfort_reported"
    && !selected.length
    && !hasLegacy
  ) {
    messages.push("気になる場所を残す場合は、少なくとも1部位の程度を1以上にしてください。");
  }
  if (
    status === "strong_reported"
    && !selected.length
    && !hasLegacy
    && !hasCondition
  ) {
    messages.push("相談したい内容を残す場合は、部位の程度または本人が伝えたい体調情報を入力してください。");
  }
  return messages;
}

export function bindSubjectiveInput() {
  const form = document.getElementById("subjective-input-form");
  if (!form) return;

  form.querySelectorAll("[data-body-area-score]").forEach((control) => {
    control.addEventListener("input", () => refreshBodyAreaState(form));
    control.addEventListener("change", () => refreshBodyAreaState(form));
  });

  const activateRegion = (target) => {
    const key = String(target?.dataset?.subjectiveRegionJump || "");
    if (!key) return;
    const control = form.querySelector(`[name="bodyArea_${key}"]`);
    if (!control) return;
    if (Number(control.value || 0) === 0) control.value = "1";
    refreshBodyAreaState(form);
    const field = form.querySelector(`#subjective-region-${key}`);
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => control.focus(), 120);
  };
  form.querySelectorAll("[data-subjective-region-jump]").forEach((target) => {
    target.addEventListener("click", () => activateRegion(target));
    target.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activateRegion(target);
    });
  });

  form.addEventListener("change", (event) => {
    if (event.target.matches('[name="subjectiveStatus"]')) {
      updateVisibility(form);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const messages = validate(form);
    if (messages.length) {
      showFormMessages(form, messages);
      return;
    }
    normalizeForStatus(form);
    updateRecordInputWorkspaceFields(serializeRecordInputForm(form));
    markRecordInputJourneyReturn({ source: "subjective", outcome: "applied" });
    window.location.hash = String(form.dataset.returnTo || "#/record-input");
  });

  updateVisibility(form);
  refreshBodyAreaState(form);
}
