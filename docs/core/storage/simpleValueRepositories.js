import { normalizeBodyProfile } from "../model/bodyProfileAdjustment.js";
import { normalizePlainText } from "../safety/inputSafety.js";
import { STORAGE_KEYS } from "./storageKeys.js";

export function createProfileRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.profile, {});
    return result.ok
      ? { ...result, value: normalizeBodyProfile(result.value) }
      : { ...result, code: "STORAGE_PROFILE_READ_FAILED", value: normalizeBodyProfile({}) };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (profile) => gateway.writeJson(STORAGE_KEYS.profile, normalizeBodyProfile(profile)),
    clear: () => gateway.remove(STORAGE_KEYS.profile),
  });
}

export function createSettingsRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.settings, {});
    const validValue = result.value && typeof result.value === "object" && !Array.isArray(result.value)
      ? result.value
      : {};
    if (!result.ok) return { ...result, code: "STORAGE_SETTINGS_READ_FAILED", value: {} };
    if (validValue !== result.value) return { ok: false, key: STORAGE_KEYS.settings, code: "STORAGE_SETTINGS_INVALID", value: {} };
    return { ...result, value: validValue };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (settings) => gateway.writeJson(STORAGE_KEYS.settings, settings && typeof settings === "object" ? settings : {}),
    clear: () => gateway.remove(STORAGE_KEYS.settings),
  });
}

export function createDraftRepository(gateway) {
  function loadResult() {
    const result = gateway.readJsonResult(STORAGE_KEYS.draft, null);
    return result.ok
      ? result
      : { ...result, code: "STORAGE_DRAFT_READ_FAILED", value: null };
  }
  return Object.freeze({
    load: () => loadResult().value,
    loadResult,
    save: (draft) => gateway.writeJson(STORAGE_KEYS.draft, draft == null ? null : {
      ...draft,
      memo: normalizePlainText(draft.memo, 500),
      updatedAt: new Date().toISOString(),
    }),
    clear: () => gateway.remove(STORAGE_KEYS.draft),
  });
}
