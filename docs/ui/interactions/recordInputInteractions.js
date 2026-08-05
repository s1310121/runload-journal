import { BODY_PARTS, BODY_PART_KEYS, SURFACE_FIELDS } from "../../core/model/modelConstants.js";
import { BODY_AREA_TAXONOMY } from "../../core/model/v27/bodyAreaTaxonomy.js";
import { SAFETY_FLAG_KEYS } from "../../core/safety/supportDecision.js";
import { RPE_PROVENANCE } from "../../core/safety/rpeProvenance.js";
import {
  booleanValue,
  numberValue,
  optionalNumberValue,
  setHidden,
  showFormMessages,
} from "./formUtilities.js";
import { primarySurfaceSummary, slopeSummary } from "../coursePresentation.js";
import { beginRecordInputJourney, clearRecordInputWorkspace, refreshActiveRecordInputWorkspace, restoreRecordInputWorkspace, saveRecordInputWorkspace } from "../recordInputWorkspace.js";
import { subjectiveSummaryFromFields } from "../subjectivePresentation.js";
import { PERSONAL_CONTEXT_FIELD_NAMES, personalContextFromFields, personalSummaryFromFields } from "../personalContextPresentation.js";
import { confirmGradeDomain } from "./gradeDomainConfirmation.js";



function rpeLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "未入力";
  if (numeric === 0) return "0・休息に近い";
  if (numeric <= 2) return `${numeric}・楽`;
  if (numeric <= 4) return `${numeric}・やや楽`;
  if (numeric <= 6) return `${numeric}・ややきつい`;
  if (numeric <= 8) return `${numeric}・きつい`;
  return `${numeric}・とてもきつい`;
}

function updateRpeControl(form) {
  const enabled = form.querySelector("[data-rpe-enabled]");
  const control = form.querySelector("[data-rpe-range]");
  const panel = form.querySelector("[data-rpe-control]");
  const output = form.querySelector("[data-rpe-output]");
  const active = Boolean(enabled?.checked);
  if (control) control.disabled = !active;
  if (panel) panel.hidden = !active;
  if (output && control) output.textContent = active ? rpeLabel(control.value) : "未入力";
}

function updateInputFormVisibility(form) {
  const activityType = form.querySelector('[name="activityType"]:checked')?.value || "run";
  form.querySelectorAll("[data-run-fields]").forEach((element) => setHidden(element, activityType === "rest"));
  form.querySelectorAll("[data-rest-fields]").forEach((element) => setHidden(element, activityType !== "rest"));

}

const SURFACE_CLASS_BY_RECORD_KEY = Object.freeze({
  pavedPercent: "REF_HARD_EVEN_STABLE",
  trackPercent: "REF_HARD_EVEN_STABLE",
  treadmillPercent: "REF_HARD_EVEN_STABLE",
  soilPercent: "KNOWN_OTHER",
  trailPercent: "EXPLICIT_UNEVEN",
  naturalGrassPercent: "DRY_STABLE_GRASS_TURF",
  artificialTurfPercent: "DRY_STABLE_GRASS_TURF",
  sandPercent: "DEEP_DRY_SOFT_SAND",
});

function readCourseSections(formData, distanceKm) {
  const rows = Array.from({ length: 5 }, (_, index) => {
    const sharePercent = optionalNumberValue(formData, `sectionShare_${index}`);
    if (!(sharePercent > 0)) return null;
    const gradeDirection = String(formData.get(`sectionDirection_${index}`) || "UNKNOWN");
    const magnitude = Math.abs(Number(optionalNumberValue(formData, `sectionGrade_${index}`) || 0));
    const signedGrade = gradeDirection === "DOWNHILL" ? -magnitude : gradeDirection === "UPHILL" ? magnitude : gradeDirection === "FLAT" ? 0 : null;
    return {
      sectionId: `section-${index + 1}`,
      sharePercent,
      distanceKm: Number(distanceKm) > 0 ? Number(distanceKm) * sharePercent / 100 : null,
      gradeDirection,
      gradePercent: signedGrade,
    };
  }).filter(Boolean);
  return rows;
}

function deriveLegacySurface(shares = {}) {
  const active = SURFACE_FIELDS.filter(({ recordKey }) => Number(shares[recordKey] || 0) > 0);
  const dominant = [...active].sort((left, right) => Number(shares[right.recordKey] || 0) - Number(shares[left.recordKey] || 0))[0];
  return {
    modelSurfaceClass: dominant ? SURFACE_CLASS_BY_RECORD_KEY[dominant.recordKey] : "UNKNOWN",
    modelSurfaceProfile: active.map(({ recordKey }) => ({
      sharePercent: Number(shares[recordKey] || 0),
      surfaceClass: SURFACE_CLASS_BY_RECORD_KEY[recordKey],
    })),
  };
}

export function readCourse(formData, distanceKm = 0) {
  const gradeInputMode = String(formData.get("gradeInputMode") || "UNKNOWN");
  const sections = gradeInputMode === "SECTIONS" ? readCourseSections(formData, distanceKm) : [];
  const shares = Object.fromEntries(SURFACE_FIELDS.map(({ recordKey }) => [recordKey, numberValue(formData, recordKey)]));
  const legacySurface = deriveLegacySurface(shares);
  const upRows = sections.filter((item) => item.gradeDirection === "UPHILL");
  const downRows = sections.filter((item) => item.gradeDirection === "DOWNHILL");
  const sumShare = (rows) => rows.reduce((sum, item) => sum + Number(item.sharePercent || 0), 0);
  const weightedGrade = (rows) => {
    const total = sumShare(rows);
    return total > 0 ? rows.reduce((sum, item) => sum + Math.abs(Number(item.gradePercent || 0)) * Number(item.sharePercent || 0), 0) / total : 0;
  };
  return {
    id: String(formData.get("courseId") || ""),
    name: String(formData.get("courseName") || ""),
    routePattern: String(formData.get("routePattern") || "UNKNOWN"),
    surfaceWetSlipState: String(formData.get("surfaceWetSlipState") || "UNKNOWN"),
    gradeInputMode,
    surfaceInputMode: String(formData.get("surfaceInputMode") || "UNKNOWN"),
    gradeKnowledge: gradeInputMode === "FLAT" ? "KNOWN_FLAT" : ["SUMMARY", "SECTIONS"].includes(gradeInputMode) ? "KNOWN_PROFILE" : String(formData.get("gradeKnowledge") || "UNKNOWN"),
    upPercent: gradeInputMode === "SECTIONS" ? sumShare(upRows) : numberValue(formData, "upPercent"),
    downPercent: gradeInputMode === "SECTIONS" ? sumShare(downRows) : numberValue(formData, "downPercent"),
    upGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(upRows) : numberValue(formData, "upGradePercent"),
    downGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(downRows) : numberValue(formData, "downGradePercent"),
    sections,
    ...legacySurface,
    ...shares,
  };
}

export const COURSE_FORM_FIELDS = Object.freeze([
  ["id", "courseId"],
  ["name", "courseName"],
  ["routePattern", "routePattern"],
  ["gradeInputMode", "gradeInputMode"],
  ["surfaceInputMode", "surfaceInputMode"],
  ["gradeKnowledge", "gradeKnowledge"],
  ["upPercent", "upPercent"],
  ["downPercent", "downPercent"],
  ["upGradePercent", "upGradePercent"],
  ["downGradePercent", "downGradePercent"],
  ["modelSurfaceClass", "modelSurfaceClass"],
  ...SURFACE_FIELDS.map(({ recordKey }) => [recordKey, recordKey]),
  ...Array.from({ length: 5 }, (_, index) => [
    [`sections.${index}.sharePercent`, `sectionShare_${index}`],
    [`sections.${index}.gradeDirection`, `sectionDirection_${index}`],
    [`sections.${index}.gradePercent`, `sectionGrade_${index}`],
  ]).flat(),
]);

function getCoursePath(course, path) {
  if (!String(path).includes(".")) return course?.[path];
  return String(path).split(".").reduce((value, key) => value?.[key], course);
}

export function courseFormValues(course = {}) {
  return Object.fromEntries(COURSE_FORM_FIELDS.map(([courseKey, formName]) => {
    let value = getCoursePath(course, courseKey);
    if (courseKey.endsWith(".gradePercent") && value != null) value = Math.abs(Number(value));
    if (value === undefined || value === null) {
      if (["id", "name"].includes(courseKey)) value = "";
      else if (["routePattern", "gradeInputMode", "surfaceInputMode", "gradeKnowledge", "modelSurfaceClass"].includes(courseKey)) value = "UNKNOWN";
      else if (courseKey.endsWith(".gradeDirection")) value = "FLAT";
      else if (courseKey.includes("sections.")) value = "";
      else value = 0;
    }
    return [formName, value];
  }));
}

export function applyCoursePresetToForm(form, course = {}) {
  const values = courseFormValues(course);
  COURSE_FORM_FIELDS.forEach(([, formName]) => {
    const control = form?.elements?.namedItem?.(formName) || form?.querySelector?.(`[name="${formName}"]`);
    if (control) control.value = String(values[formName] ?? "");
  });
  return values;
}

function updateCourseSummary(form) {
  const distance = Number(form.elements.namedItem("distanceKm")?.value || 0);
  const course = readCourse(new FormData(form), distance);
  const summary = form.querySelector(".record-course-entry .course-summary");
  if (!summary) return;
  const heading = summary.querySelector("h4");
  const paragraphs = summary.querySelectorAll("p");
  if (heading) heading.textContent = course.name || "コース名なし";
  if (paragraphs[0]) paragraphs[0].innerHTML = `<strong>主な路面：</strong>${primarySurfaceSummary(course)}`;
  if (paragraphs[1]) paragraphs[1].innerHTML = `<strong>坂道：</strong>${slopeSummary(course)}`;
  if (paragraphs[2]) paragraphs[2].innerHTML = `<strong>入力方法：</strong>${course.surfaceInputMode === "MIXED" ? "複数路面の割合" : course.surfaceInputMode === "SINGLE" ? "主な路面1種類" : "路面は未入力"}`;
}

function updateSubjectiveSummary(form) {
  const fields = {};
  form.querySelectorAll('.subjective-hidden-fields input').forEach((control) => {
    if (!control.name) return;
    if (control.type === "checkbox") fields[control.name] = control.checked ? String(control.value || "1") : "__unchecked__";
    else fields[control.name] = control.value;
  });
  const summary = subjectiveSummaryFromFields(fields);
  const status = form.querySelector("[data-subjective-summary-status]");
  const description = form.querySelector("[data-subjective-summary-description]");
  const action = form.querySelector('[data-action="open-subjective-input"]');
  if (status) status.textContent = summary.label;
  if (description) description.textContent = summary.description;
  if (action) {
    const hasInput = !["deferred", "not_asked"].includes(summary.status);
    action.textContent = hasInput ? "確認・変更" : "身体の記録を入力";
    action.classList.add("button--secondary");
    action.classList.remove("button--primary");
  }
}

function readPersonalContextFieldsFromForm(form) {
  const fields = {};
  form.querySelectorAll('.personal-hidden-fields input').forEach((control) => {
    if (!control.name) return;
    if (control.type === "checkbox") fields[control.name] = control.checked ? String(control.value || "1") : "__unchecked__";
    else fields[control.name] = control.value;
  });
  return fields;
}

function updatePersonalSummary(form) {
  const summary = personalSummaryFromFields(readPersonalContextFieldsFromForm(form));
  const status = form.querySelector("[data-personal-summary-status]");
  const description = form.querySelector("[data-personal-summary-description]");
  const action = form.querySelector('[data-action="open-personal-input"]');
  if (status) status.textContent = summary.label;
  if (description) description.textContent = summary.description;
  if (action) {
    action.textContent = summary.hasInput ? "確認・変更" : "任意で入力";
    action.classList.add("button--secondary");
    action.classList.remove("button--text");
  }
}

function readPersonalContext(formData) {
  const fields = {};
  PERSONAL_CONTEXT_FIELD_NAMES.forEach((name) => {
    if (name.startsWith("personalFocus_") || name.startsWith("personalEquipment_")) fields[name] = formData.get(name) ? "1" : "__unchecked__";
    else fields[name] = String(formData.get(name) || "");
  });
  return personalContextFromFields(fields);
}

function recordInputReturnTo(context) {
  const parameters = new URLSearchParams(context?.parameters || undefined);
  parameters.delete("resume");
  const query = parameters.toString();
  return `#/record-input${query ? `?${query}` : ""}`;
}

export function readSubjectiveFeedback(formData) {
  const fatigueByBodyPart = {};
  const discomfortByBodyPart = {};
  const reviewedBodyParts = {};
  BODY_PARTS.forEach((bodyPart) => {
    const key = BODY_PART_KEYS[bodyPart];
    const fatigue = numberValue(formData, `fatigue_${key}`);
    const discomfort = numberValue(formData, `discomfort_${key}`);
    fatigueByBodyPart[bodyPart] = fatigue;
    discomfortByBodyPart[bodyPart] = discomfort;
    reviewedBodyParts[bodyPart] = booleanValue(formData, `reviewed_${key}`) || fatigue > 0 || discomfort > 0;
  });
  const safetyFlags = Object.fromEntries(SAFETY_FLAG_KEYS.map((flag) => [flag, booleanValue(formData, `safety_${flag}`)]));
  const hasSafetyFlag = Object.values(safetyFlags).some(Boolean);
  const primaryStatus = String(formData.get("subjectiveStatus") || "deferred");
  const checkStatus = primaryStatus === "body_reported"
    ? String(formData.get("subjectiveDetailType") || "")
    : primaryStatus;
  const bodyObservationTiming = String(formData.get("bodyObservationTiming") || "UNKNOWN");
  const bodyObservationSensation = String(formData.get("bodyObservationSensation") || "NOT_SELECTED");
  const bodyObservationNote = String(formData.get("bodyObservationNote") || "").trim().slice(0, 240);
  const bodyAreaObservations = BODY_AREA_TAXONOMY.flatMap((area) => {
    const intensity = numberValue(formData, `bodyArea_${area.key}`);
    if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) return [];
    return [{
      areaId: area.id,
      label: area.label,
      groupId: area.groupId,
      modelRegionId: area.modelRegionId,
      intensity,
      laterality: String(formData.get(`bodyAreaLaterality_${area.key}`) || "UNKNOWN"),
      noticedTiming: bodyObservationTiming,
      sensationType: bodyObservationSensation,
      note: bodyObservationNote,
    }];
  });
  return {
    checkStatus,
    fatigueByBodyPart,
    discomfortByBodyPart,
    reviewedBodyParts,
    bodyAreaObservations,
    legacyTopBodyPart: String(formData.get("legacyTopBodyPart") || ""),
    consultationNote: String(formData.get("consultationNote") || ""),
    unexpectedSymptom: booleanValue(formData, "unexpectedSymptom"),
    symptomContext: {
      timing: String(formData.get("symptomTiming") || ""),
      startedWhen: String(formData.get("symptomStartedWhen") || ""),
      note: String(formData.get("symptomNote") || ""),
    },
    safetyFlags,
    safetyCheck: {
      status: hasSafetyFlag
        ? "reported"
        : ["deferred", "not_asked"].includes(checkStatus)
          ? "not_asked"
          : "none_reported",
    },
  };
}

export function readRecordInput(formData, services) {
  const planId = String(formData.get("planId") || "");
  const plan = planId ? services.storage.plans.findById(planId) : null;
  const activityType = String(formData.get("activityType") || "run");
  const distanceKm = numberValue(formData, "distanceKm");
  const perceivedExertion = activityType === "rest" ? null : optionalNumberValue(formData, "perceivedExertion");
  return {
    id: String(formData.get("recordId") || ""),
    date: String(formData.get("date") || ""),
    activityType,
    distanceKm,
    durationMinutes: numberValue(formData, "durationMinutes"),
    steps: numberValue(formData, "steps"),
    perceivedExertion,
    rpeProvenance: perceivedExertion == null ? RPE_PROVENANCE.notReported : RPE_PROVENANCE.userReported,
    runningFormat: String(formData.get("runningFormat") || "UNKNOWN"),
    stepsProvenance: String(formData.get("stepsProvenance") || "UNKNOWN"),
    course: readCourse(formData, distanceKm),
    memo: String(formData.get("memo") || ""),
    environmentContext: {
      weather: String(formData.get("weather") || ""),
      temperatureC: optionalNumberValue(formData, "temperatureC"),
      windSummary: String(formData.get("windSummary") || ""),
      environmentNote: String(formData.get("environmentNote") || ""),
    },
    recoveryContext: {
      sleepSummary: String(formData.get("sleepSummary") || ""),
      nutritionHydrationSummary: String(formData.get("nutritionHydrationSummary") || ""),
      lifestyleNote: String(formData.get("lifestyleNote") || ""),
    },
    reflectionContext: {
      postRunReflection: String(formData.get("postRunReflection") || ""),
      perceivedDifference: String(formData.get("perceivedDifference") || ""),
      reflectionKeyPoint: String(formData.get("reflectionKeyPoint") || ""),
      nextCheckPoint: String(formData.get("nextCheckPoint") || ""),
    },
    consultationContext: {
      consultationTarget: String(formData.get("consultationTarget") || ""),
      consultationQuestion: String(formData.get("consultationQuestion") || ""),
      consultationDataSelection: formData.getAll("consultationDataSelection").map(String),
    },
    planOutcome: plan ? {
      status: plan.outcomeStatus || "completed",
      plannedDistanceKm: Number(plan.plannedSession?.distanceKm || 0),
      plannedDurationMinutes: Number(plan.plannedSession?.durationMinutes || 0),
      plannedCourseSnapshot: plan.plannedSession?.course || null,
      planNote: plan.memo || "",
      reason: plan.changeReason || "",
      reasonNote: plan.changeReasonNote || "",
    } : {},
    personalContext: readPersonalContext(formData),
  };
}

function validateUiRecord(record) {
  const messages = [];
  if (!record.date) messages.push("日付を入力してください。");
  if (record.activityType === "run") {
    if (!(record.distanceKm > 0)) messages.push("走行記録では、0より大きい距離を入力してください。");
    if (!(record.durationMinutes > 0)) messages.push("走行記録では、0より大きい実走時間を入力してください。");
    const surfaceSum = SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + Number(record.course[recordKey] || 0), 0);
    if (surfaceSum > 0 && Math.abs(surfaceSum - 100) > 1e-9) messages.push(`路面割合を入力する場合は、合計を100%にしてください。現在は${surfaceSum}%です。`);
    if (Array.isArray(record.course.sections) && record.course.sections.length) {
      const sectionTotal = record.course.sections.reduce((sum, section) => sum + Number(section.sharePercent || 0), 0);
      if (Math.abs(sectionTotal - 100) > 0.01) messages.push(`区間割合の合計を100%にしてください。現在は${sectionTotal}%です。`);
    } else if (record.course.gradeKnowledge === "KNOWN_PROFILE" && Number(record.course.upPercent || 0) + Number(record.course.downPercent || 0) > 100.01) {
      messages.push("上り区間と下り区間の合計は100%以下にしてください。");
    }
  }
  return messages;
}

function validateSubjectiveFeedback(feedback, formData) {
  const messages = [];
  const fatigueValues = Object.values(feedback.fatigueByBodyPart || {}).map(Number);
  const discomfortValues = Object.values(feedback.discomfortByBodyPart || {}).map(Number);
  const hasFatigue = fatigueValues.some((value) => value > 0);
  const hasDiscomfort = discomfortValues.some((value) => value > 0);
  const hasBodyAreaObservation = Array.isArray(feedback.bodyAreaObservations)
    && feedback.bodyAreaObservations.length > 0;
  const hasSafetyInformation = Object.values(feedback.safetyFlags || {}).some(Boolean) || Boolean(feedback.unexpectedSymptom);
  const primaryStatus = String(formData.get("subjectiveStatus") || "");
  const requiresBodyDetail = primaryStatus === "body_reported" || ["discomfort_reported", "strong_reported", "fatigue_reported"].includes(feedback.checkStatus);
  if (requiresBodyDetail && !feedback.checkStatus) messages.push("身体の記録を残す場合は、内容を選んでください。");
  if (requiresBodyDetail && feedback.checkStatus === "fatigue_reported" && !hasFatigue) messages.push("疲れ・だるさを記録する場合は、少なくとも1部位の程度を入力してください。");
  if (requiresBodyDetail && feedback.checkStatus === "discomfort_reported" && !(hasDiscomfort || hasBodyAreaObservation)) messages.push("気になる部位を残す場合は、少なくとも1部位の程度を1以上にしてください。");
  if (requiresBodyDetail && feedback.checkStatus === "strong_reported" && !(hasSafetyInformation || hasDiscomfort || hasBodyAreaObservation)) messages.push("相談したい内容を残す場合は、当てはまる内容または部位の程度を入力してください。");
  return messages;
}

function savePlanCourseToLibraryIfRequested(formData, services, recordInput) {
  if (String(formData.get("savePlanCourseToLibrary") || "") !== "1") return { ok: true, status: "not-requested" };
  if (recordInput.activityType === "rest") return { ok: true, status: "not-requested" };
  const course = recordInput.course || {};
  if (!String(course.name || "").trim()) return { ok: false, message: "保存コースに残す場合は、コース名が必要です。" };
  const createResult = services.storage.courses.create(course);
  if (createResult.ok) return { ok: true, status: "created", item: createResult.item };
  if (createResult.code !== "COURSE_NAME_DUPLICATE") {
    return { ok: false, message: createResult.message || "保存コースに追加できませんでした。" };
  }
  const duplicate = createResult.duplicate;
  const updateApproved = window.confirm(`「${duplicate?.name || course.name}」という保存コースがあります。今回のコース条件で既存コースを更新しますか？

キャンセルすると、記録だけを保存し、保存コースは変更しません。`);
  if (!updateApproved) return { ok: true, status: "skipped-duplicate", duplicate };
  const updateResult = services.storage.courses.update(duplicate?.id || "", course);
  return updateResult.ok
    ? { ok: true, status: "updated", item: updateResult.item }
    : { ok: false, message: updateResult.message || "同名の保存コースを更新できませんでした。" };
}

function saveDraftFromForm(form, services, announce = false) {
  if (form.dataset.editing === "true") return;
  const formData = new FormData(form);
  const result = services.storage.draft.save({
    record: readRecordInput(formData, services),
    feedback: readSubjectiveFeedback(formData),
  });
  if (announce) {
    const status = form.querySelector("[data-draft-status]");
    if (status) status.textContent = result?.ok === false ? "入力途中を保存できませんでした。" : "入力途中をこの端末へ保存しました。";
  }
}

export function bindRecordInput({ services, router, context, returnState = null }) {
  const form = document.getElementById("record-input-form");
  if (!form) return;
  if (returnState?.restore || context?.parameters?.get("resume") === "1") restoreRecordInputWorkspace(form);
  else clearRecordInputWorkspace();
  updateInputFormVisibility(form);
  updateCourseSummary(form);
  updateSubjectiveSummary(form);
  updatePersonalSummary(form);
  updateRpeControl(form);
  const rpeEnabled = form.querySelector("[data-rpe-enabled]");
  const rpeRange = form.querySelector("[data-rpe-range]");
  rpeEnabled?.addEventListener("change", () => updateRpeControl(form));
  rpeRange?.addEventListener("input", () => updateRpeControl(form));
  const returnStatus = form.querySelector("[data-record-return-status]");
  if (returnStatus && returnState?.notice) {
    returnStatus.hidden = false;
    returnStatus.textContent = returnState.notice;
  }
  form.querySelectorAll('[data-action="apply-saved-course"]').forEach((button) => {
    button.addEventListener("click", () => {
      const courseId = String(button.dataset.courseId || "");
      const preset = courseId ? services.storage.courses.findById(courseId) : null;
      if (!preset) {
        if (returnStatus) {
          returnStatus.hidden = false;
          returnStatus.textContent = "保存済みコースを読み込めませんでした。";
        }
        return;
      }
      applyCoursePresetToForm(form, { ...preset.course, id: preset.id, name: preset.name });
      updateCourseSummary(form);
      saveDraftFromForm(form, services, false);
      refreshActiveRecordInputWorkspace(form);
      if (returnStatus) {
        returnStatus.hidden = false;
        returnStatus.textContent = `「${preset.name || "保存済みコース"}」を今回の入力へ反映しました。保存元コースは変更していません。`;
      }
    });
  });
  form.querySelector('[data-action="open-course-library"]')?.addEventListener("click", () => {
    const returnTo = recordInputReturnTo(context);
    saveRecordInputWorkspace(form);
    beginRecordInputJourney({ returnTo, source: "course" });
    router.navigateToScreen("course-library", { returnTo });
  });
  form.querySelector('[data-action="open-subjective-input"]')?.addEventListener("click", () => {
    const returnTo = recordInputReturnTo(context);
    saveRecordInputWorkspace(form);
    beginRecordInputJourney({ returnTo, source: "subjective" });
    router.navigateToScreen("subjective-input", { returnTo });
  });
  form.querySelector('[data-action="open-personal-input"]')?.addEventListener("click", () => {
    const returnTo = recordInputReturnTo(context);
    saveRecordInputWorkspace(form);
    beginRecordInputJourney({ returnTo, source: "personal" });
    router.navigateToScreen("personal-input", { returnTo });
  });
  form.addEventListener("change", () => {
    updateInputFormVisibility(form);
    updateCourseSummary(form);
    updateSubjectiveSummary(form);
    updatePersonalSummary(form);
    updateRpeControl(form);
    saveDraftFromForm(form, services, false);
    refreshActiveRecordInputWorkspace(form);
  });
  form.addEventListener("input", () => { updateCourseSummary(form); updateSubjectiveSummary(form); updatePersonalSummary(form); updateRpeControl(form); saveDraftFromForm(form, services, false); refreshActiveRecordInputWorkspace(form); });
  form.querySelector('[data-action="save-record-draft"]')?.addEventListener("click", () => saveDraftFromForm(form, services, true));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const formData = new FormData(form);
    const recordInput = readRecordInput(formData, services);
    const subjectiveFeedback = readSubjectiveFeedback(formData);
    const uiMessages = [...validateUiRecord(recordInput), ...validateSubjectiveFeedback(subjectiveFeedback, formData)];
    if (uiMessages.length) {
      showFormMessages(form, uiMessages);
      if (submitButton) submitButton.disabled = false;
      return;
    }
    if (!confirmGradeDomain(recordInput.course, "記録")) {
      if (submitButton) submitButton.disabled = false;
      return;
    }
    const result = services.workflows.records.saveRecordAndFeedback(recordInput, subjectiveFeedback);
    if (!result.ok) {
      showFormMessages(form, result.validation?.errors?.map((item) => item.message) || ["端末内へ保存できませんでした。未入力の必須項目、端末の空き容量、ブラウザーの保存許可を見直してください。"]);
      if (submitButton) submitButton.disabled = false;
      return;
    }
    const postSaveWarnings = [];
    const courseLibraryResult = savePlanCourseToLibraryIfRequested(formData, services, recordInput);
    if (!courseLibraryResult.ok) {
      postSaveWarnings.push(courseLibraryResult.message || "今回のコースを保存コースには追加できませんでした。");
    }
    const planId = String(formData.get("planId") || "");
    if (planId) {
      const planResult = services.workflows.plans.markActualRecord(planId, result.record.id);
      if (!planResult.ok) postSaveWarnings.push("記録は保存しましたが、予定との関連付けを保存できませんでした。");
    }
    const draftResult = services.storage.draft.clear();
    if (!draftResult.ok) postSaveWarnings.push("記録は保存しましたが、入力途中データを削除できませんでした。");
    clearRecordInputWorkspace();
    if (postSaveWarnings.length) {
      window.alert(`記録は保存しました。\n\n${postSaveWarnings.join("\n")}`);
    }
    router.navigateToScreen("result", { recordId: result.record.id });
  });
}
