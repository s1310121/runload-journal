import { copyText } from "./browserUtilities.js";
import { clearConsultationDraft, resetConsultationDraft, updateConsultationDraft } from "../consultationDraftState.js";

function reportText() {
  const region = document.getElementById("consultation-report-text");
  return region ? (("value" in region ? region.value : region.textContent) || "") : "";
}

function updateCharacterCount(textarea) {
  const counter = document.querySelector("[data-consult-character-count]");
  if (counter) counter.textContent = `${textarea.value.length} / ${textarea.maxLength || 1200}文字`;
}

export function bindConsultation() {
  const regionSelector = document.querySelector("[data-consult-region-selector]");
  regionSelector?.addEventListener("change", () => {
    const hash = window.location.hash || "#/consultation";
    const [path, query = ""] = hash.split("?");
    const parameters = new URLSearchParams(query);
    parameters.set("page", "quick");
    parameters.set("mode", "result");
    parameters.set("a4RegionId", regionSelector.value);
    window.location.hash = `${path}?${parameters.toString()}`;
  });

  const textarea = document.querySelector("[data-consultation-draft]");
  textarea?.addEventListener("input", () => {
    updateConsultationDraft(textarea.dataset.draftKey || "", textarea.value);
    updateCharacterCount(textarea);
  });

  document.querySelector('[data-action="reset-consultation-draft"]')?.addEventListener("click", (event) => {
    if (!textarea) return;
    const key = event.currentTarget.dataset.draftKey || textarea.dataset.draftKey || "";
    const text = resetConsultationDraft(key);
    textarea.value = text;
    updateCharacterCount(textarea);
    textarea.focus();
  });

  document.querySelector('[data-action="clear-consultation-draft"]')?.addEventListener("click", (event) => {
    if (!textarea) return;
    const key = event.currentTarget.dataset.draftKey || textarea.dataset.draftKey || "";
    textarea.value = clearConsultationDraft(key);
    updateCharacterCount(textarea);
    textarea.focus();
  });

  document.querySelector('[data-action="copy-consultation-report"]')?.addEventListener("click", async (event) => {
    const text = reportText();
    if (!text.trim()) {
      event.currentTarget.textContent = "内容を入力してください";
      return;
    }
    try {
      await copyText(text);
      event.currentTarget.textContent = "コピーしました";
    } catch {
      event.currentTarget.textContent = "コピーできませんでした";
    }
  });
  document.querySelector('[data-action="print-consultation-report"]')?.addEventListener("click", () => window.print());
}
