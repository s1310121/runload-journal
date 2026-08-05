import { markRecordInputJourneyReturn, serializeRecordInputForm, updateRecordInputWorkspaceFields } from "../recordInputWorkspace.js";
import { PERSONAL_CONTEXT_FIELD_NAMES, personalSummaryFromFields } from "../personalContextPresentation.js";
import { showFormMessages } from "./formUtilities.js";

function currentPersonalFields(form) {
  const serialized = serializeRecordInputForm(form);
  return Object.fromEntries(Object.entries(serialized).filter(([key]) => PERSONAL_CONTEXT_FIELD_NAMES.includes(key)));
}

function refreshSummary(form) {
  const summary = personalSummaryFromFields(currentPersonalFields(form));
  const target = form.querySelector("[data-personal-summary]");
  if (target) target.textContent = summary.description;
}

function emptyPersonalFields() {
  return Object.fromEntries(PERSONAL_CONTEXT_FIELD_NAMES.map((name) => [name, name.startsWith("personalFocus_") || name.startsWith("personalEquipment_") ? "__unchecked__" : ""]));
}

function applySavedShoe(form, services) {
  const id = String(form.querySelector('[name="personalShoeId"]')?.value || "");
  if (!id) return;
  const settings = services.storage.settings.load();
  const preset = (Array.isArray(settings.savedShoes) ? settings.savedShoes : []).find((item) => item.id === id);
  if (!preset) return;
  for (const [name, value] of [["personalShoeLabel", preset.label], ["personalShoeType", preset.type], ["personalShoeSoftness", preset.softness]]) {
    const control = form.elements.namedItem(name);
    if (control) control.value = String(value || "");
  }
}

function saveShoePresetIfRequested(form, services) {
  if (!form.elements.namedItem("saveCurrentShoePreset")?.checked) return { ok: true, saved: false };
  const label = String(form.elements.namedItem("personalShoeLabel")?.value || "").trim();
  if (!label) return { ok: true, saved: false };
  const current = services.storage.settings.load();
  const saved = Array.isArray(current.savedShoes) ? [...current.savedShoes] : [];
  const existingId = String(form.elements.namedItem("personalShoeId")?.value || "");
  const id = existingId || `shoe-${Date.now()}`;
  const nextPreset = { id, label, type: String(form.elements.namedItem("personalShoeType")?.value || ""), softness: String(form.elements.namedItem("personalShoeSoftness")?.value || "") };
  const index = saved.findIndex((item) => item.id === id);
  if (index >= 0) saved[index] = nextPreset; else saved.push(nextPreset);
  const result = services.storage.settings.save({ ...current, savedShoes: saved });
  if (!result.ok) return { ...result, saved: false };
  form.elements.namedItem("personalShoeId").value = id;
  return { ok: true, saved: true };
}

export function bindPersonalInput({ services }) {
  const form = document.getElementById("personal-input-form");
  if (!form) return;

  form.querySelector('[data-saved-shoe-select]')?.addEventListener("change", () => { applySavedShoe(form, services); refreshSummary(form); });
  form.addEventListener("change", () => refreshSummary(form));
  form.addEventListener("input", () => refreshSummary(form));

  form.querySelector('[data-action="clear-personal-context"]')?.addEventListener("click", () => {
    Object.entries(emptyPersonalFields()).forEach(([name, value]) => {
      const control = form.elements.namedItem(name);
      if (!control) return;
      if (control.type === "checkbox") control.checked = false;
      else control.value = value === "__unchecked__" ? "" : value;
    });
    refreshSummary(form);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const shoeResult = saveShoePresetIfRequested(form, services);
    if (!shoeResult.ok) {
      showFormMessages(form, ["保存シューズを端末内へ保存できませんでした。保存せずに戻る場合は、保存のチェックを外してください。"]);
      return;
    }
    updateRecordInputWorkspaceFields(currentPersonalFields(form));
    markRecordInputJourneyReturn({ source: "personal", outcome: "applied", notice: "シューズと走り方のメモを入力画面へ反映しました。" });
    window.location.hash = String(form.dataset.returnTo || "#/record-input");
  });

  refreshSummary(form);
}
