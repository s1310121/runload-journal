import { SURFACE_PRESETS } from "./data.js";
import { failure, success } from "./utils.js";

function normalizeExactCategory(preset, subtype) {
  if (preset.key === "paved" && subtype === "asphalt") return "Asphalt";
  if (preset.key === "paved" && subtype === "concrete") return "Concrete";
  if (preset.key === "track" && (subtype == null || subtype === "rubber")) return "Rubber";
  if (preset.key === "natural_grass" && (subtype == null || subtype === "grass")) return "Grass";
  return null;
}

export function resolveSurfaceSelections(selections) {
  if (!Array.isArray(selections) || selections.length === 0) {
    return success({ knowledge: "UNKNOWN", components: [], dominant: null }, [{
      code: "UNKNOWN_NOT_IMPUTED", messageKey: "surface.unknown_not_asphalt", path: "course.surfaceSelections", details: {}
    }]);
  }
  const normalized = selections.map((item, index) => {
    const preset = SURFACE_PRESETS[item.presetKey];
    if (!preset) throw Object.assign(new Error(`Unknown surface preset: ${item.presetKey}`), { code: "SCHEMA_INVALID", path: `course.surfaceSelections[${index}].presetKey` });
    const share = item.sharePercent ?? (selections.length === 1 ? 100 : null);
    if (!(share >= 0 && share <= 100)) throw Object.assign(new Error("Invalid surface share"), { code: "SECTION_SHARE_INVALID", path: `course.surfaceSelections[${index}].sharePercent` });
    const overrides = item.propertyOverrides ?? {};
    const profile = {
      hardnessLevel: overrides.hardnessLevel ?? preset.hardnessLevel,
      unevennessLevel: overrides.unevennessLevel ?? preset.unevennessLevel,
      gripLevel: overrides.gripLevel ?? preset.gripLevel,
      sinkLevel: overrides.sinkLevel ?? preset.sinkLevel,
      reboundLevel: overrides.reboundLevel ?? preset.reboundLevel,
      stabilityLevel: overrides.stabilityLevel ?? preset.stabilityLevel,
      wetSlipState: item.wetSlipState ?? preset.wetSlipDefault,
    };
    const exactCategory = normalizeExactCategory(preset, item.subtype);
    const exactEvidence = exactCategory
      ? item.subtype
        ? "EXPLICIT_SUBTYPE"
        : "MATERIAL_SPECIFIC_PRESET"
      : null;
    return {
      componentId: `surface-${index + 1}`, sharePercent: share, presetKey: preset.key,
      materialLabel: preset.materialLabel, runSetting: preset.runSetting,
      propertyProfile: profile, propertyOrigin: Object.keys(overrides).length ? "USER_OVERRIDE" : "PRESET",
      exactSourceCategory: exactCategory,
      exactSourceEvidence: exactEvidence,
      numericRouteDefault: preset.numericRouteDefault,
      confidence: preset.confidence,
    };
  });
  const sum = normalized.reduce((a, b) => a + b.sharePercent, 0);
  if (Math.abs(sum - 100) > 0.01) return failure("SECTION_SHARE_INVALID", "surface.share_sum_must_be_100", "course.surfaceSelections", { sum });
  const dominant = [...normalized].sort((a,b)=>b.sharePercent-a.sharePercent)[0];
  return success({ knowledge: normalized.length === 1 ? "DOMINANT_ONLY" : "MIXTURE_KNOWN", components: normalized, dominant });
}

export function isStandardShoeCandidate(shoeType, softness) {
  return shoeType === "TRAINING" && softness === "NORMAL";
}
