import { escapeHtml } from "../commonComponents.js";

export function numberValue(formData, name) {
  const rawValue = String(formData.get(name) ?? "").trim();
  return rawValue === "" ? 0 : Number(rawValue);
}

export function optionalNumberValue(formData, name) {
  const rawValue = String(formData.get(name) ?? "").trim();
  return rawValue === "" ? null : Number(rawValue);
}

export function booleanValue(formData, name) {
  return formData.has(name);
}

export function setHidden(element, hidden) {
  if (!element) return;
  const alreadyInitialized = element.dataset.visibilityInitialized === "true";
  if (alreadyInitialized && element.hidden === hidden) return;
  element.hidden = hidden;
  element.dataset.visibilityInitialized = "true";
  element.querySelectorAll("input, select, textarea").forEach((control) => {
    if (hidden) {
      control.setAttribute("data-was-disabled", control.disabled ? "true" : "false");
      control.disabled = true;
      return;
    }
    control.disabled = control.getAttribute("data-was-disabled") === "true";
    control.removeAttribute("data-was-disabled");
  });
}

export function showFormMessages(form, messages, tone = "error") {
  const region = form.querySelector("[data-form-messages]");
  if (!region) return;
  const normalized = Array.isArray(messages) ? messages : [messages];
  region.hidden = false;
  region.className = `form-messages form-messages--${tone}`;
  region.setAttribute("role", tone === "error" ? "alert" : "status");
  region.setAttribute("aria-live", tone === "error" ? "assertive" : "polite");
  region.innerHTML = `<p>${tone === "error" ? "入力できていない項目があります。下の内容を直して保存してください。" : "保存しました。"}</p><ul>${normalized.map((message) => `<li>${escapeHtml(String(message))}</li>`).join("")}</ul>`;
  region.focus({ preventScroll: false });
}

export function showDataMessage(messages, tone = "success") {
  const region = document.querySelector("[data-data-management-messages]");
  if (!region) return;
  const normalized = Array.isArray(messages) ? messages : [messages];
  region.hidden = false;
  region.className = `form-messages form-messages--${tone}`;
  region.setAttribute("role", tone === "error" ? "alert" : "status");
  region.setAttribute("aria-live", tone === "error" ? "assertive" : "polite");
  region.innerHTML = `<p>${normalized.map((message) => escapeHtml(String(message))).join(" ")}</p>`;
  region.focus({ preventScroll: false });
}
