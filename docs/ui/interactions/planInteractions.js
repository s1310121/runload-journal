import { SURFACE_FIELDS } from "../../core/model/modelConstants.js";
import {
  createV27PlanPreview,
  normalizeV27PlanSession,
} from "../../core/planning/planPreviewV27.js";
import {
  buildPlanConditionSnapshot,
  describePlanComparisonForUser,
  describePlanModelAssumptions,
  parsePlanReference,
} from "../planPresentation.js";
import { formatLocalDate, formatNumber } from "../recordPresentation.js";
import { numberValue, setHidden, showFormMessages } from "./formUtilities.js";
import { confirmGradeDomain } from "./gradeDomainConfirmation.js";

const CUSTOM_FIELDS = new Set([
  "planType",
  "distanceKm",
  "durationMinutes",
  "runningFormat",
  "courseName",
  "routePattern",
  "gradeKnowledge",
  "upPercent",
  "downPercent",
  "upGradePercent",
  "downGradePercent",
  "surfaceInputMode",
  "primarySurfaceKey",
  ...SURFACE_FIELDS.map(({ recordKey }) => recordKey),
]);

function setFieldValue(form, name, value) {
  const fields = [...form.querySelectorAll(`[name="${name}"]`)];
  if (!fields.length) return;
  if (fields.some((field) => field.type === "radio")) {
    fields.forEach((field) => { field.checked = field.value === value; });
    return;
  }
  fields[0].value = value ?? "";
}

const SURFACE_CLASS_BY_RECORD_KEY = Object.freeze({ pavedPercent: "REF_HARD_EVEN_STABLE", trackPercent: "REF_HARD_EVEN_STABLE", treadmillPercent: "REF_HARD_EVEN_STABLE", soilPercent: "KNOWN_OTHER", trailPercent: "EXPLICIT_UNEVEN", naturalGrassPercent: "DRY_STABLE_GRASS_TURF", artificialTurfPercent: "DRY_STABLE_GRASS_TURF", sandPercent: "DEEP_DRY_SOFT_SAND" });
function readPlanSurface(formData) {
  const mode = String(formData.get("surfaceInputMode") || "UNKNOWN");
  const primary = String(formData.get("primarySurfaceKey") || "pavedPercent");
  const shares = Object.fromEntries(SURFACE_FIELDS.map(({ recordKey }) => [recordKey, mode === "SINGLE" ? (recordKey === primary ? 100 : 0) : mode === "MIXED" ? numberValue(formData, recordKey) : 0]));
  const active = SURFACE_FIELDS.filter(({ recordKey }) => shares[recordKey] > 0);
  const dominant = [...active].sort((left, right) => shares[right.recordKey] - shares[left.recordKey])[0];
  return { surfaceInputMode: mode, modelSurfaceClass: dominant ? SURFACE_CLASS_BY_RECORD_KEY[dominant.recordKey] : "UNKNOWN", modelSurfaceProfile: active.map(({ recordKey }) => ({ sharePercent: shares[recordKey], surfaceClass: SURFACE_CLASS_BY_RECORD_KEY[recordKey] })), ...shares };
}
function readPlanSession(formData) {
  return normalizeV27PlanSession({
    activityType: String(formData.get("planType") || "run"),
    distanceKm: numberValue(formData, "distanceKm"),
    durationMinutes: numberValue(formData, "durationMinutes"),
    runningFormat: String(formData.get("runningFormat") || "UNKNOWN"),
    course: {
      name: String(formData.get("courseName") || ""),
      routePattern: String(formData.get("routePattern") || "UNKNOWN"),
      gradeKnowledge: String(formData.get("gradeKnowledge") || "UNKNOWN"),
      upPercent: numberValue(formData, "upPercent"),
      downPercent: numberValue(formData, "downPercent"),
      upGradePercent: numberValue(formData, "upGradePercent"),
      downGradePercent: numberValue(formData, "downGradePercent"),
      ...readPlanSurface(formData),
    },
  });
}

function updateVisibility(form) {
  const planType = form.querySelector('[name="planType"]:checked')?.value || "run";
  form.querySelectorAll("[data-plan-run-fields]").forEach((element) => {
    setHidden(element, planType === "rest");
  });
  const gradeKnowledge = form.querySelector('[name="gradeKnowledge"]')?.value || "UNKNOWN";
  form.querySelectorAll("[data-plan-grade-profile]").forEach((element) => {
    setHidden(element, planType === "rest" || gradeKnowledge !== "KNOWN_PROFILE");
  });
  const surfaceMode = form.querySelector('[name="surfaceInputMode"]')?.value || "UNKNOWN";
  form.querySelectorAll("[data-plan-surface-single]").forEach((element) => setHidden(element, planType === "rest" || surfaceMode !== "SINGLE"));
  form.querySelectorAll("[data-plan-surface-mixed]").forEach((element) => setHidden(element, planType === "rest" || surfaceMode !== "MIXED"));
}

function comparisonLabel(value) {
  if (value === "same") return "同じ";
  if (value === "changed") return "変更";
  return "基準なし";
}

function updateConditions(form, snapshot) {
  snapshot.rows.forEach((row) => {
    form.querySelectorAll(`[data-plan-summary-field="${row.key}"]`).forEach((element) => {
      element.textContent = row.value;
    });
    form.querySelectorAll(`[data-plan-summary-status="${row.key}"]`).forEach((element) => {
      element.textContent = comparisonLabel(row.comparison);
      element.classList.remove(
        "plan-condition-status--same",
        "plan-condition-status--changed",
        "plan-condition-status--unavailable",
      );
      element.classList.add(`plan-condition-status--${row.comparison}`);
    });
  });
}

function updatePreview(form) {
  const data = new FormData(form);
  const reference = parsePlanReference(form.dataset.planReference || "");
  const session = readPlanSession(data);
  const scheduledDate = String(data.get("scheduledDate") || "");
  const preview = createV27PlanPreview({
    session,
    scheduledDate,
    previewId: `plan-live-${scheduledDate || "undated"}`,
  });
  const total = preview.state === "RUN"
    ? Number(preview.result?.total?.central_points)
    : null;
  const snapshot = buildPlanConditionSnapshot(session, {
    referenceSession: reference.session,
    totalLoad: total,
    referenceTotal: reference.totalLoad,
  });
  updateConditions(form, snapshot);
  form.querySelectorAll("[data-plan-preview-total]").forEach((element) => {
    element.textContent = Number.isFinite(total) ? formatNumber(total, 1) : "—";
  });
  form.querySelectorAll("[data-plan-preview-difference]").forEach((element) => {
    element.textContent = describePlanComparisonForUser(preview, snapshot.totalDifference.label);
  });
  form.querySelectorAll("[data-plan-preview-message]").forEach((element) => {
    element.textContent = preview.message;
  });
  form.querySelectorAll("[data-plan-assumption-note]").forEach((element) => {
    element.textContent = describePlanModelAssumptions(session);
  });
  const date = form.querySelector("[data-plan-confirm-date]");
  if (date) date.textContent = formatLocalDate(scheduledDate);
  const title = form.querySelector("[data-plan-confirm-title]");
  if (title) title.textContent = String(
    data.get("title") || (session.activityType === "rest" ? "休養日" : "次の走り"),
  );
  return { session, preview };
}

function updateSelectedCandidate(candidateId) {
  document.querySelectorAll("[data-plan-candidate-card]").forEach((card) => {
    const selected = card.dataset.planCandidateCard === candidateId;
    card.classList.toggle("is-selected", selected);
    card.querySelectorAll("[data-plan-selected-label]").forEach((label) => {
      label.hidden = !selected;
    });
    card.querySelectorAll('[data-action="select-plan-candidate"]').forEach((button) => {
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  });
}

function populatePlanForm(form, candidate) {
  const session = normalizeV27PlanSession(candidate.session);
  setFieldValue(form, "candidateId", candidate.candidateId);
  setFieldValue(form, "planType", session.activityType);
  setFieldValue(form, "title", candidate.title);
  setFieldValue(form, "distanceKm", session.distanceKm || "");
  setFieldValue(form, "durationMinutes", session.durationMinutes || "");
  setFieldValue(form, "runningFormat", session.runningFormat);
  setFieldValue(form, "courseName", session.course.name);
  setFieldValue(form, "routePattern", session.course.routePattern || "UNKNOWN");
  setFieldValue(form, "gradeKnowledge", session.course.gradeKnowledge);
  setFieldValue(form, "upPercent", session.course.upPercent);
  setFieldValue(form, "downPercent", session.course.downPercent);
  setFieldValue(form, "upGradePercent", session.course.upGradePercent);
  setFieldValue(form, "downGradePercent", session.course.downGradePercent);
  const activeSurfaces = SURFACE_FIELDS.filter(({ recordKey }) => Number(session.course?.[recordKey] || 0) > 0);
  const surfaceMode = activeSurfaces.length === 0 ? "UNKNOWN" : activeSurfaces.length === 1 && Math.abs(Number(session.course[activeSurfaces[0].recordKey]) - 100) <= 0.01 ? "SINGLE" : "MIXED";
  setFieldValue(form, "surfaceInputMode", surfaceMode);
  setFieldValue(form, "primarySurfaceKey", activeSurfaces[0]?.recordKey || "pavedPercent");
  SURFACE_FIELDS.forEach(({ recordKey }) => setFieldValue(form, recordKey, session.course?.[recordKey] || 0));
  const current = form.querySelector("[data-plan-current-candidate]");
  if (current) current.textContent = candidate.title;
  updateSelectedCandidate(candidate.candidateId);
  updateVisibility(form);
  updatePreview(form);
  form.querySelector('[data-plan-stage="edit"]')?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function markCustom(form, target) {
  if (!target?.name || !CUSTOM_FIELDS.has(target.name)) return;
  const candidate = form.querySelector('[name="candidateId"]');
  if (!candidate || candidate.value === "custom") return;
  candidate.value = "custom";
  const current = form.querySelector("[data-plan-current-candidate]");
  if (current) current.textContent = "自分で調整した予定";
  updateSelectedCandidate("custom");
}

export function bindPlan({ services, router, rerender }) {
  const form = document.getElementById("plan-form");
  if (!form) return;
  updateVisibility(form);
  updatePreview(form);
  form.addEventListener("change", (event) => {
    markCustom(form, event.target);
    updateVisibility(form);
    updatePreview(form);
  });
  form.addEventListener("input", (event) => {
    markCustom(form, event.target);
    updatePreview(form);
  });

  const initial = new FormData(form);
  const candidateResult = services.workflows.plans.createCandidates({
    sourceRecordId: String(initial.get("sourceRecordId") || ""),
    scheduledDate: String(initial.get("scheduledDate") || ""),
  });
  document.querySelectorAll('[data-action="select-plan-candidate"]').forEach((button) => {
    button.addEventListener("click", () => {
      const candidate = candidateResult.candidates.find(
        (item) => item.candidateId === button.dataset.candidateId,
      );
      if (candidate) populatePlanForm(form, candidate);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const session = readPlanSession(data);
    if (!confirmGradeDomain(session.course, "予定")) return;
    const result = services.workflows.plans.savePlan({
      id: String(data.get("planId") || ""),
      sourceRecordId: String(data.get("sourceRecordId") || ""),
      scheduledDate: String(data.get("scheduledDate") || ""),
      planType: String(data.get("planType") || "run"),
      title: String(data.get("title") || ""),
      memo: String(data.get("memo") || ""),
      sourceCandidateId: String(data.get("candidateId") || "custom"),
      plannedSession: session,
    });
    if (!result.ok) {
      showFormMessages(form, [result.message || "予定を保存できませんでした。"]);
      return;
    }
    router.navigateToScreen("plan", {
      planId: result.item.id,
      sourceRecordId: result.item.sourceRecordId,
      saved: "1",
    });
  });

  document.querySelectorAll("[data-plan-outcome-form]").forEach((outcomeForm) => {
    outcomeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(outcomeForm);
      const result = services.workflows.plans.updateOutcome(
        String(data.get("planId") || ""),
        {
          status: String(data.get("outcomeStatus") || "planned"),
          reason: String(data.get("changeReason") || ""),
          reasonNote: String(data.get("changeReasonNote") || ""),
        },
      );
      if (result.ok) rerender();
      else window.alert("予定の結果を保存できませんでした。端末の保存状態を確認してください。");
    });
  });
  document.querySelectorAll('[data-action="delete-plan"]').forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.confirm("この予定を削除しますか？")) return;
      const result = services.storage.plans.removeById(button.dataset.planId || "");
      if (!result.ok) {
        window.alert("予定を削除できませんでした。端末の保存状態を確認してください。");
        return;
      }
      rerender();
    });
  });
}
