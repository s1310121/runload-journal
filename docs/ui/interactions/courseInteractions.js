import { SURFACE_FIELDS } from "../../core/model/modelConstants.js";
import { validateCoursePresetInput } from "../../core/storage/courseRepository.js";
import { courseFormValues } from "./recordInputInteractions.js";
import { setHidden, showFormMessages } from "./formUtilities.js";
import { confirmGradeDomain } from "./gradeDomainConfirmation.js";
import { markRecordInputJourneyReturn, updateRecordInputWorkspaceFields } from "../recordInputWorkspace.js";

function number(formData, name) { const raw = String(formData.get(name) ?? "").trim(); return raw === "" ? 0 : Number(raw); }
const SURFACE_CLASS_BY_RECORD_KEY = Object.freeze({ pavedPercent: "REF_HARD_EVEN_STABLE", trackPercent: "REF_HARD_EVEN_STABLE", treadmillPercent: "REF_HARD_EVEN_STABLE", soilPercent: "KNOWN_OTHER", trailPercent: "EXPLICIT_UNEVEN", naturalGrassPercent: "DRY_STABLE_GRASS_TURF", artificialTurfPercent: "DRY_STABLE_GRASS_TURF", sandPercent: "DEEP_DRY_SOFT_SAND" });
function readSections(data) {
  return Array.from({ length: 5 }, (_, index) => {
    const sharePercent = number(data, `sectionShare_${index}`);
    if (!(sharePercent > 0)) return null;
    const gradeDirection = String(data.get(`sectionDirection_${index}`) || "UNKNOWN");
    const magnitude = number(data, `sectionGrade_${index}`);
    const gradePercent = gradeDirection === "DOWNHILL" ? -Math.abs(magnitude) : gradeDirection === "UPHILL" ? Math.abs(magnitude) : gradeDirection === "FLAT" ? 0 : null;
    return { sectionId: `saved-section-${index + 1}`, sharePercent, gradeDirection, gradePercent };
  }).filter(Boolean);
}
function weightedGrade(sections, direction) {
  const rows = sections.filter((item) => item.gradeDirection === direction);
  const total = rows.reduce((sum, item) => sum + item.sharePercent, 0);
  return total > 0 ? rows.reduce((sum, item) => sum + Math.abs(Number(item.gradePercent || 0)) * item.sharePercent, 0) / total : 0;
}
function readCourseEditor(data) {
  const gradeInputMode = String(data.get("gradeInputMode") || "UNKNOWN");
  const sections = gradeInputMode === "SECTIONS" ? readSections(data) : [];
  const upShare = gradeInputMode === "SECTIONS" ? sections.filter((item) => item.gradeDirection === "UPHILL").reduce((sum, item) => sum + item.sharePercent, 0) : number(data, "upPercent");
  const downShare = gradeInputMode === "SECTIONS" ? sections.filter((item) => item.gradeDirection === "DOWNHILL").reduce((sum, item) => sum + item.sharePercent, 0) : number(data, "downPercent");
  const surfaceInputMode = String(data.get("surfaceInputMode") || "UNKNOWN");
  const primary = String(data.get("primarySurfaceKey") || "pavedPercent");
  const shares = Object.fromEntries(SURFACE_FIELDS.map(({ recordKey }) => [recordKey, surfaceInputMode === "SINGLE" ? (recordKey === primary ? 100 : 0) : surfaceInputMode === "MIXED" ? number(data, recordKey) : 0]));
  const active = SURFACE_FIELDS.filter(({ recordKey }) => shares[recordKey] > 0);
  const dominant = [...active].sort((a, b) => shares[b.recordKey] - shares[a.recordKey])[0];
  const modelSurfaceClass = dominant ? SURFACE_CLASS_BY_RECORD_KEY[dominant.recordKey] : "UNKNOWN";
  const modelSurfaceProfile = active.map(({ recordKey }) => ({ sharePercent: shares[recordKey], surfaceClass: SURFACE_CLASS_BY_RECORD_KEY[recordKey] }));
  return {
    name: String(data.get("courseName") || ""), routePattern: String(data.get("routePattern") || "UNKNOWN"), gradeInputMode,
    gradeKnowledge: gradeInputMode === "UNKNOWN" ? "UNKNOWN" : gradeInputMode === "FLAT" ? "KNOWN_FLAT" : "KNOWN_PROFILE",
    upPercent: gradeInputMode === "FLAT" ? 0 : upShare, downPercent: gradeInputMode === "FLAT" ? 0 : downShare,
    upGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(sections, "UPHILL") : number(data, "upGradePercent"),
    downGradePercent: gradeInputMode === "SECTIONS" ? weightedGrade(sections, "DOWNHILL") : number(data, "downGradePercent"),
    sections, surfaceInputMode, modelSurfaceClass, modelSurfaceProfile, ...shares,
  };
}
function updateVisibility(form) {
  const grade = form.elements.namedItem("gradeInputMode")?.value || "UNKNOWN";
  form.querySelectorAll("[data-course-grade-summary]").forEach((element) => setHidden(element, grade !== "SUMMARY"));
  form.querySelectorAll("[data-course-grade-sections]").forEach((element) => setHidden(element, grade !== "SECTIONS"));
  const surface = form.elements.namedItem("surfaceInputMode")?.value || "UNKNOWN";
  form.querySelectorAll("[data-course-surface-single]").forEach((element) => setHidden(element, surface !== "SINGLE"));
  form.querySelectorAll("[data-course-surface-mixed]").forEach((element) => setHidden(element, surface !== "MIXED"));
}
function updateTotals(form) {
  const data = new FormData(form); const up = number(data, "upPercent"), down = number(data, "downPercent");
  const flat = form.querySelector("[data-flat-share]"); if (flat) flat.value = Number.isFinite(up + down) ? String(100 - up - down) : "—";
  const section = form.querySelector("[data-section-share-total]"); if (section) section.value = String(Array.from({ length: 5 }, (_, i) => number(data, `sectionShare_${i}`)).reduce((a, b) => a + b, 0));
  const surface = form.querySelector("[data-surface-share-total]"); if (surface) surface.value = String(SURFACE_FIELDS.reduce((sum, { recordKey }) => sum + number(data, recordKey), 0));
}
export function bindCourseLibrary({ services, rerender }) {
  document.querySelectorAll('[data-action="use-course"]').forEach((button) => button.addEventListener("click", () => {
    const preset = services.storage.courses.findById(button.dataset.courseId || ""); if (!preset) return;
    updateRecordInputWorkspaceFields(courseFormValues({ ...preset.course, id: preset.id, name: preset.name }));
    markRecordInputJourneyReturn({ source: "course", outcome: "applied", notice: `「${preset.name}」を今回の入力へ反映しました。` });
    window.location.hash = String(button.dataset.returnTo || "#/record-input");
  }));
  document.querySelectorAll('[data-action="delete-course"]').forEach((button) => button.addEventListener("click", () => {
    const preset = services.storage.courses.findById(button.dataset.courseId || ""); const status = document.querySelector("[data-course-manager-status]"); if (!preset) return;
    if (!window.confirm(`「${preset.name}」を保存コース一覧から削除しますか？\n過去の記録や予定に保存済みの条件は変わりません。`)) return;
    const result = services.storage.courses.removeById(preset.id); if (!result.ok) { if (status) status.textContent = "コースを削除できませんでした。"; return; } rerender();
  }));
}
export function bindCourseEditor({ services }) {
  const form = document.getElementById("course-editor-form"); if (!form) return;
  form.addEventListener("input", () => updateTotals(form)); form.addEventListener("change", () => { updateVisibility(form); updateTotals(form); });
  updateVisibility(form); updateTotals(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(form); const id = String(data.get("courseId") || ""); const course = readCourseEditor(data);
    const validation = validateCoursePresetInput(course); if (!validation.ok) { showFormMessages(form, validation.message || "コースを保存できませんでした。"); return; }
    if (!confirmGradeDomain(validation.course, "コース")) return;
    const result = id ? services.storage.courses.update(id, validation.course) : services.storage.courses.create(validation.course);
    if (!result.ok) { showFormMessages(form, result.message || "コースを保存できませんでした。"); return; }
    const returnTo = String(data.get("returnTo") || "#/record-input"); window.location.hash = `#/course-library?returnTo=${encodeURIComponent(returnTo)}&notice=${encodeURIComponent(`「${result.item.name}」を保存しました。`)}`;
  });
}
