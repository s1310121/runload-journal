import {
  BODY_PARTS,
  DEFAULT_MODEL_CONFIGURATION,
  MODEL_TOTAL_LOAD_UNIT,
  MODEL_TOTAL_LOAD_VERSION,
  SURFACE_TRAITS,
} from "./modelConstants.js";
import { sumNumbers, toFiniteNumber } from "./numberUtilities.js";

export function calculateBodyPartWeights(derivedInputs, configuration = DEFAULT_MODEL_CONFIGURATION) {
  const scores = {};
  BODY_PARTS.forEach((bodyPart) => {
    const surfaceSensitivity = configuration.surfaceBodyPartSensitivity[bodyPart] || {};
    const surfaceRoleOffset = SURFACE_TRAITS.reduce(
      (total, trait) => total
        + toFiniteNumber(surfaceSensitivity[trait], 0)
        * toFiniteNumber(derivedInputs.surfaceTraits[trait], 0),
      0,
    ) * toFiniteNumber(configuration.surfaceRoleScale, 1);

    scores[bodyPart] = toFiniteNumber(configuration.baseBodyPartLogWeights[bodyPart], 0)
      + toFiniteNumber(configuration.speedCoefficients[bodyPart], 0) * derivedInputs.r_v
      + toFiniteNumber(configuration.uphillCoefficients[bodyPart], 0) * derivedInputs.G_plus
      + toFiniteNumber(configuration.downhillCoefficients[bodyPart], 0) * derivedInputs.G_minus
      + toFiniteNumber(configuration.surfaceCoefficientsByBodyPart[bodyPart], 0) * derivedInputs.S_surface
      + surfaceRoleOffset;
  });

  const maximumScore = Math.max(...BODY_PARTS.map((bodyPart) => scores[bodyPart]));
  const exponentialScores = {};
  let denominator = 0;
  BODY_PARTS.forEach((bodyPart) => {
    const value = Math.exp(toFiniteNumber(scores[bodyPart], 0) - maximumScore);
    exponentialScores[bodyPart] = Number.isFinite(value) ? value : 0;
    denominator += exponentialScores[bodyPart];
  });

  const weights = {};
  if (!Number.isFinite(denominator) || denominator <= configuration.epsilon) {
    const uniformWeight = 1 / BODY_PARTS.length;
    BODY_PARTS.forEach((bodyPart) => { weights[bodyPart] = uniformWeight; });
  } else {
    BODY_PARTS.forEach((bodyPart) => {
      weights[bodyPart] = exponentialScores[bodyPart] / denominator;
    });
  }

  return {
    z: scores,
    w: weights,
    sumW: sumNumbers(BODY_PARTS.map((bodyPart) => weights[bodyPart])),
  };
}

function normalizeWeightMap(rawWeights = {}) {
  const positiveWeights = Object.fromEntries(BODY_PARTS.map((bodyPart) => [
    bodyPart,
    Math.max(0, toFiniteNumber(rawWeights[bodyPart], 0)),
  ]));
  const total = sumNumbers(BODY_PARTS.map((bodyPart) => positiveWeights[bodyPart]));
  if (total <= DEFAULT_MODEL_CONFIGURATION.epsilon) {
    const uniformWeight = 1 / BODY_PARTS.length;
    return Object.fromEntries(BODY_PARTS.map((bodyPart) => [bodyPart, uniformWeight]));
  }
  return Object.fromEntries(BODY_PARTS.map((bodyPart) => [bodyPart, positiveWeights[bodyPart] / total]));
}

function calculateConditionalSpecialTransfer(derivedInputs = {}, configuration = DEFAULT_MODEL_CONFIGURATION) {
  const sinkScore = Math.max(0, toFiniteNumber(derivedInputs.surfaceTraits?.sink, 0));
  const sandPercent = Math.max(0, toFiniteNumber(derivedInputs.surfacePctMap?.sand, 0));
  const uphillFraction = Math.max(0, toFiniteNumber(derivedInputs.G_plus, 0));
  const sinkDrivenRatio = sinkScore >= 2.5 || sandPercent >= 80
    ? Math.min(0.08, 0.02 + sinkScore * 0.015)
    : 0;
  const uphillDrivenRatio = uphillFraction >= 0.05
    ? Math.min(0.04, uphillFraction * 0.5)
    : 0;
  const requestedTransferRatio = Math.max(sinkDrivenRatio, uphillDrivenRatio);
  const baseAchillesRatio = Math.max(0, toFiniteNumber(configuration.achillesTransferRatio, 0));
  const basePlantarRatio = Math.max(0, toFiniteNumber(configuration.plantarTransferRatio, 0));
  const baseTransferSum = baseAchillesRatio + basePlantarRatio;
  const achillesShare = baseTransferSum > configuration.epsilon ? baseAchillesRatio / baseTransferSum : 0.7;
  const plantarShare = baseTransferSum > configuration.epsilon ? basePlantarRatio / baseTransferSum : 0.3;
  const transferRatio = Math.min(0.12, requestedTransferRatio);

  return {
    active: transferRatio > configuration.epsilon,
    transferRatio,
    achillesRatio: transferRatio * achillesShare,
    plantarRatio: transferRatio * plantarShare,
    reason: transferRatio <= configuration.epsilon
      ? "no-special-transfer"
      : sinkDrivenRatio >= uphillDrivenRatio
        ? "sink-or-sand-condition"
        : "steep-uphill-condition",
  };
}

export function calculateIntegratedBodyPartLoads(
  totalLoad,
  bodyPartWeights,
  configuration = DEFAULT_MODEL_CONFIGURATION,
  derivedInputs = {},
) {
  const externalWeights = normalizeWeightMap(bodyPartWeights.w || {});
  const externalByBodyPart = Object.fromEntries(BODY_PARTS.map((bodyPart) => [
    bodyPart,
    externalWeights[bodyPart] * totalLoad.L_ext_total,
  ]));

  const effectiveInternalWeights = { ...externalWeights };
  const specialTransfer = calculateConditionalSpecialTransfer(derivedInputs, configuration);
  if (specialTransfer.active) {
    const sourceParts = ["後下腿", "足関節・足背部", "前下腿"];
    const sourceAvailable = sumNumbers(sourceParts.map((bodyPart) => effectiveInternalWeights[bodyPart]));
    const movableRatio = Math.min(specialTransfer.transferRatio, Math.max(0, sourceAvailable));
    if (movableRatio > configuration.epsilon && sourceAvailable > configuration.epsilon) {
      sourceParts.forEach((bodyPart) => {
        const sourceShare = effectiveInternalWeights[bodyPart] / sourceAvailable;
        effectiveInternalWeights[bodyPart] = Math.max(0, effectiveInternalWeights[bodyPart] - movableRatio * sourceShare);
      });
      effectiveInternalWeights["アキレス腱"] += movableRatio * (specialTransfer.achillesRatio / specialTransfer.transferRatio);
      effectiveInternalWeights["足底部"] += movableRatio * (specialTransfer.plantarRatio / specialTransfer.transferRatio);
      specialTransfer.transferRatio = movableRatio;
    }
  }
  const normalizedInternalWeights = normalizeWeightMap(effectiveInternalWeights);

  const integratedLoads = Object.fromEntries(BODY_PARTS.map((bodyPart) => [
    bodyPart,
    toFiniteNumber(externalByBodyPart[bodyPart], 0)
      + toFiniteNumber(normalizedInternalWeights[bodyPart], 0) * totalLoad.L_int,
  ]));

  const specialMovedLoadTotal = specialTransfer.active
    ? Math.max(0, totalLoad.L_int) * Math.max(0, specialTransfer.transferRatio)
    : 0;

  return {
    L: integratedLoads,
    L_ext: externalByBodyPart,
    m_eff: normalizedInternalWeights,
    sumM: sumNumbers(BODY_PARTS.map((bodyPart) => normalizedInternalWeights[bodyPart])),
    tauAchSafe: specialTransfer.active ? specialTransfer.achillesRatio : 0,
    tauPlantarSafe: specialTransfer.active ? specialTransfer.plantarRatio : 0,
    specialTransferActive: specialTransfer.active,
    specialTransferReason: specialTransfer.reason,
    specialTransferRatio: specialTransfer.active ? specialTransfer.transferRatio : 0,
    specialMovedLoadTotal,
  };
}

export function calculateModelTotalLoad(totalLoad, integratedLoads) {
  const externalComponent = Math.max(0, toFiniteNumber(totalLoad.L_ext_total, 0));
  const internalComponent = Math.max(0, toFiniteNumber(totalLoad.L_int, 0));
  const value = externalComponent + internalComponent;
  const partSum = sumNumbers(BODY_PARTS.map(
    (bodyPart) => Math.max(0, toFiniteNumber(integratedLoads.L[bodyPart], 0)),
  ));
  const consistencyError = Math.abs(partSum - value);
  const tolerance = Math.max(1e-6, Math.abs(value) * 1e-10);
  const safeValue = value > 0 ? value : 0;

  return {
    value: safeValue,
    externalComponent,
    internalComponent,
    externalShare: safeValue > 0 ? externalComponent / safeValue : 0,
    internalShare: safeValue > 0 ? internalComponent / safeValue : 0,
    partSum,
    consistencyError,
    consistent: consistencyError <= tolerance,
    unit: MODEL_TOTAL_LOAD_UNIT,
    formulaVersion: MODEL_TOTAL_LOAD_VERSION,
    label: "モデル総負荷",
    meaning: "入力条件を負荷モデルに当てはめた比較用の指数",
    isMeasuredPhysicalLoad: false,
    supportsMedicalDecision: false,
  };
}

export function getBodyPartDistribution(result = {}) {
  const totalValue = toFiniteNumber(result.modelTotalLoad?.value, 0);
  return Object.fromEntries(BODY_PARTS.map((bodyPart) => {
    const value = Math.max(0, toFiniteNumber(result.parts?.[bodyPart]?.L, 0));
    return [bodyPart, {
      value,
      share: totalValue > 0 ? value / totalValue : 0,
      sharePercent: totalValue > 0 ? (value / totalValue) * 100 : 0,
      equalSharePercent: 100 / BODY_PARTS.length,
      comparisonBase: "nine-part-equal-share",
      isMeasuredPhysicalLoad: false,
    }];
  }));
}
