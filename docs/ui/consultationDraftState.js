const drafts = new Map();
const originals = new Map();

function normalizeKey(value = "") {
  return String(value || "").slice(0, 240);
}

export function registerConsultationDraft(key, originalText = "") {
  const normalizedKey = normalizeKey(key);
  const original = String(originalText || "");
  if (!originals.has(normalizedKey)) originals.set(normalizedKey, original);
  if (!drafts.has(normalizedKey)) drafts.set(normalizedKey, original);
  return drafts.get(normalizedKey) || "";
}

export function updateConsultationDraft(key, text = "") {
  const normalizedKey = normalizeKey(key);
  drafts.set(normalizedKey, String(text || ""));
  return drafts.get(normalizedKey) || "";
}

export function resetConsultationDraft(key) {
  const normalizedKey = normalizeKey(key);
  const original = originals.get(normalizedKey) || "";
  drafts.set(normalizedKey, original);
  return original;
}

export function clearConsultationDraft(key) {
  const normalizedKey = normalizeKey(key);
  drafts.set(normalizedKey, "");
  return "";
}
