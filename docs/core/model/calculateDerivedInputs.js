import { DEFAULT_MODEL_CONFIGURATION, SURFACE_FIELDS, SURFACE_TRAITS } from "./modelConstants.js";
import { normalizeModelInput } from "./modelInputAdapter.js";
import { toFiniteNumber } from "./numberUtilities.js";

export function calculateDerivedInputs(record, configuration = DEFAULT_MODEL_CONFIGURATION) {
  const input = normalizeModelInput(record);
  const distanceMeters = toFiniteNumber(input.dist_km, 0) * 1000;
  const durationSeconds = toFiniteNumber(input.time_min, 0) * 60;
  const speedMetersPerSecond = distanceMeters / (durationSeconds + configuration.epsilon);
  const uphillFraction = (toFiniteNumber(input.up_pct, 0) / 100)
    * (toFiniteNumber(input.up_grade_pct, 0) / 100);
  const downhillFraction = (toFiniteNumber(input.down_pct, 0) / 100)
    * (toFiniteNumber(input.down_grade_pct, 0) / 100);

  const surfacePercentages = {};
  let surfaceSumPercent = 0;
  SURFACE_FIELDS.forEach(({ modelKey, legacyKey }) => {
    const value = toFiniteNumber(input[legacyKey], 0);
    surfacePercentages[modelKey] = value;
    surfaceSumPercent += value;
  });

  const surfaceTraits = Object.fromEntries(SURFACE_TRAITS.map((trait) => [trait, 0]));
  SURFACE_FIELDS.forEach(({ modelKey }) => {
    const percent = toFiniteNumber(surfacePercentages[modelKey], 0);
    const traitScores = configuration.surfaceTraitScores[modelKey] || {};
    SURFACE_TRAITS.forEach((trait) => {
      surfaceTraits[trait] += (percent / 100) * toFiniteNumber(traitScores[trait], 0);
    });
  });

  const surfaceScore = SURFACE_TRAITS.reduce(
    (total, trait) => total
      + toFiniteNumber(configuration.surfaceTraitWeights[trait], 0)
      * toFiniteNumber(surfaceTraits[trait], 0),
    0,
  );
  let dominantSurfaceKey = "";
  let dominantSurfacePercent = 0;
  SURFACE_FIELDS.forEach(({ modelKey }) => {
    const percent = toFiniteNumber(surfacePercentages[modelKey], 0);
    if (percent > dominantSurfacePercent) {
      dominantSurfacePercent = percent;
      dominantSurfaceKey = modelKey;
    }
  });

  const speedRatio = speedMetersPerSecond
    / (configuration.referenceSpeedMetersPerSecond + configuration.epsilon);
  const relativeSpeedDifference = (
    speedMetersPerSecond - configuration.referenceSpeedMetersPerSecond
  ) / (configuration.referenceSpeedMetersPerSecond + configuration.epsilon);

  return {
    D_m: distanceMeters,
    T_s: durationSeconds,
    V_mps: speedMetersPerSecond,
    Vratio: speedRatio,
    r_v: relativeSpeedDifference,
    G_plus: uphillFraction,
    G_minus: downhillFraction,
    S_surface: surfaceScore,
    surfaceSumPct: surfaceSumPercent,
    surfaceTraits,
    surfacePctMap: surfacePercentages,
    dominantSurfaceKey,
    dominantSurfacePct: dominantSurfacePercent,
  };
}
