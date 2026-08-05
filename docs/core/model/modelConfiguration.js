import { BODY_PARTS, DEFAULT_MODEL_CONFIGURATION } from "./modelConstants.js";

function mergeNestedMap(base = {}, override = {}) {
  return Object.fromEntries(
    Object.keys({ ...base, ...override }).map((key) => [key, {
      ...(base[key] || {}),
      ...(override[key] || {}),
    }]),
  );
}

export function mergeModelConfiguration(override = {}) {
  const base = DEFAULT_MODEL_CONFIGURATION;
  const normalizedOverride = {
    ...override,
    referenceSpeedMetersPerSecond: override.referenceSpeedMetersPerSecond ?? override.Vref,
    uphillMultiplier: override.uphillMultiplier ?? override.kG_plus,
    downhillMultiplier: override.downhillMultiplier ?? override.kG_minus,
    surfaceMultiplier: override.surfaceMultiplier ?? override.ks,
    acuteTimeConstant: override.acuteTimeConstant ?? override.Na,
    chronicTimeConstant: override.chronicTimeConstant ?? override.Nc,
    standardizationRecordCount: override.standardizationRecordCount ?? override.B,
    epsilon: override.epsilon ?? override.eps,
    tolerance: override.tolerance ?? override.tol,
    achillesTransferRatio: override.achillesTransferRatio ?? override.tauAch,
    plantarTransferRatio: override.plantarTransferRatio ?? override.tauPlantar,
    baseBodyPartWeights: override.baseBodyPartWeights ?? override.w0,
    baseBodyPartLogWeights: override.baseBodyPartLogWeights ?? override.a0,
    internalLoadWeights: override.internalLoadWeights ?? override.m0,
    speedCoefficients: override.speedCoefficients ?? override.beta_v,
    uphillCoefficients: override.uphillCoefficients ?? override.beta_u,
    downhillCoefficients: override.downhillCoefficients ?? override.beta_d,
    surfaceCoefficientsByBodyPart: override.surfaceCoefficientsByBodyPart ?? override.beta_s,
    surfaceCoefficients: override.surfaceCoefficients ?? override.surfaceCoeff,
    surfaceBodyPartSensitivity: override.surfaceBodyPartSensitivity ?? override.surfacePartSensitivity,
  };

  const legacyTimeConstants = override.timeConstantsByPart || {};
  const modernTimeConstants = override.timeConstantsByBodyPart || {};
  const timeConstantsByBodyPart = mergeNestedMap(
    base.timeConstantsByBodyPart,
    Object.fromEntries(BODY_PARTS.map((bodyPart) => {
      const legacy = legacyTimeConstants[bodyPart] || {};
      return [bodyPart, {
        ...(modernTimeConstants[bodyPart] || {}),
        ...(legacy.Na != null ? { acute: legacy.Na } : {}),
        ...(legacy.Nc != null ? { chronic: legacy.Nc } : {}),
      }];
    })),
  );

  return {
    ...base,
    ...Object.fromEntries(Object.entries(normalizedOverride).filter(([, value]) => value !== undefined)),
    // Bは暦日ではなく直近28記録で固定する。
    standardizationRecordCount: 28,
    baseBodyPartWeights: { ...base.baseBodyPartWeights, ...(normalizedOverride.baseBodyPartWeights || {}) },
    baseBodyPartLogWeights: { ...base.baseBodyPartLogWeights, ...(normalizedOverride.baseBodyPartLogWeights || {}) },
    internalLoadWeights: { ...base.internalLoadWeights, ...(normalizedOverride.internalLoadWeights || {}) },
    speedCoefficients: { ...base.speedCoefficients, ...(normalizedOverride.speedCoefficients || {}) },
    uphillCoefficients: { ...base.uphillCoefficients, ...(normalizedOverride.uphillCoefficients || {}) },
    downhillCoefficients: { ...base.downhillCoefficients, ...(normalizedOverride.downhillCoefficients || {}) },
    surfaceCoefficientsByBodyPart: { ...base.surfaceCoefficientsByBodyPart, ...(normalizedOverride.surfaceCoefficientsByBodyPart || {}) },
    surfaceCoefficients: { ...base.surfaceCoefficients, ...(normalizedOverride.surfaceCoefficients || {}) },
    surfaceTraitWeights: { ...base.surfaceTraitWeights, ...(override.surfaceTraitWeights || {}) },
    surfaceTraitScores: mergeNestedMap(base.surfaceTraitScores, override.surfaceTraitScores || {}),
    surfaceBodyPartSensitivity: mergeNestedMap(base.surfaceBodyPartSensitivity, normalizedOverride.surfaceBodyPartSensitivity || {}),
    timeConstantsByBodyPart,
  };
}
