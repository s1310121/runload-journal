import {
  BODY_PARTS,
  LOAD_MODEL_VERSION,
  MODEL_TOTAL_LOAD_VERSION,
  MODEL_WARNING_THRESHOLD,
} from "./modelConstants.js";
import { createModelInputSeries } from "./modelInputAdapter.js";
import { mergeModelConfiguration } from "./modelConfiguration.js";
import { calculateDerivedInputs } from "./calculateDerivedInputs.js";
import { calculateTotalLoadComponents } from "./calculateTotalLoad.js";
import {
  calculateBodyPartWeights,
  calculateIntegratedBodyPartLoads,
  calculateModelTotalLoad,
  getBodyPartDistribution,
} from "./calculateBodyPartDistribution.js";
import { alphaFromTimeConstant, sumNumbers, toFiniteNumber } from "./numberUtilities.js";

function isRestInput(input, configuration) {
  return Math.abs(toFiniteNumber(input.steps, 0)) < configuration.tolerance
    && Math.abs(toFiniteNumber(input.dist_km, 0)) < configuration.tolerance
    && Math.abs(toFiniteNumber(input.time_min, 0)) < configuration.tolerance
    && Math.abs(toFiniteNumber(input.RPE, 0)) < configuration.tolerance;
}

function getTimeConstants(bodyPart, configuration) {
  const specific = configuration.timeConstantsByBodyPart[bodyPart] || {};
  return {
    acute: specific.acute ?? configuration.acuteTimeConstant,
    chronic: specific.chronic ?? configuration.chronicTimeConstant,
  };
}

function calculateChecks({
  derivedInputs,
  totalLoad,
  bodyPartWeights,
  integratedLoads,
  modelTotalLoad,
  configuration,
  restDay,
  standardizationReady,
}) {
  const surfaceSumOk = restDay || Math.abs(derivedInputs.surfaceSumPct - 100) < 1e-9;
  const sumWeightOk = Math.abs(bodyPartWeights.sumW - 1) < configuration.tolerance;
  const externalPartSum = sumNumbers(BODY_PARTS.map(
    (bodyPart) => integratedLoads.L_ext[bodyPart],
  ));
  const externalOk = Math.abs(externalPartSum - totalLoad.L_ext_total) < configuration.tolerance;
  const internalWeightOk = Math.abs(integratedLoads.sumM - 1) < configuration.tolerance;
  const integratedPartSum = sumNumbers(BODY_PARTS.map(
    (bodyPart) => integratedLoads.L[bodyPart],
  ));
  const totalOk = Math.abs(
    integratedPartSum - (totalLoad.L_ext_total + totalLoad.L_int),
  ) < configuration.tolerance;
  const modelTotalLoadOk = Boolean(modelTotalLoad.consistent)
    && Math.abs(
      modelTotalLoad.value - (totalLoad.L_ext_total + totalLoad.L_int),
    ) < configuration.tolerance
    && modelTotalLoad.formulaVersion === MODEL_TOTAL_LOAD_VERSION;

  return {
    ok: surfaceSumOk
      && sumWeightOk
      && externalOk
      && internalWeightOk
      && totalOk
      && modelTotalLoadOk,
    surfaceSumOk,
    extOk: externalOk,
    totalOk,
    modelTotalLoadOk,
    sumW: bodyPartWeights.sumW,
    sumM: integratedLoads.sumM,
    standardizationReady,
  };
}

function lagMean(series, index, count) {
  let total = 0;
  for (let offset = 1; offset <= count; offset += 1) {
    total += toFiniteNumber(series[index - offset], 0);
  }
  return total / count;
}

function updateExponentiallyWeightedMean(previous, value, alpha) {
  return (1 - alpha) * previous + alpha * value;
}

function createInitialBodyPartResult(
  bodyPart,
  bodyPartWeights,
  integratedLoads,
  configuration,
) {
  const timeConstants = getTimeConstants(bodyPart, configuration);
  return {
    z: bodyPartWeights.z[bodyPart],
    w: bodyPartWeights.w[bodyPart],
    L_ext: integratedLoads.L_ext[bodyPart],
    L: integratedLoads.L[bodyPart],
    m_eff: integratedLoads.m_eff[bodyPart],
    Na: timeConstants.acute,
    Nc: timeConstants.chronic,
    alphaA: alphaFromTimeConstant(timeConstants.acute),
    alphaC: alphaFromTimeConstant(timeConstants.chronic),
    L_bar_lag: null,
    L_tilde: null,
    A: null,
    C: null,
    R: null,
    S: null,
  };
}

function calculateStandardizedState({
  index,
  configuration,
  loadSeries,
  integratedLoads,
  bodyPartResults,
  acuteState,
  chronicState,
}) {
  const standardizedLoads = {};
  BODY_PARTS.forEach((bodyPart) => {
    const average = lagMean(
      loadSeries[bodyPart],
      index,
      configuration.standardizationRecordCount,
    );
    const currentLoad = integratedLoads.L[bodyPart];
    const standardized = Math.abs(currentLoad) < configuration.tolerance
      && Math.abs(average) < configuration.tolerance
      ? 1
      : currentLoad / (average + configuration.epsilon);
    bodyPartResults[bodyPart].L_bar_lag = average;
    bodyPartResults[bodyPart].L_tilde = standardized;
    standardizedLoads[bodyPart] = standardized;
  });

  BODY_PARTS.forEach((bodyPart) => {
    if (index === configuration.standardizationRecordCount) {
      acuteState[bodyPart] = 1;
      chronicState[bodyPart] = 1;
    }
    const timeConstants = getTimeConstants(bodyPart, configuration);
    acuteState[bodyPart] = updateExponentiallyWeightedMean(
      acuteState[bodyPart],
      standardizedLoads[bodyPart],
      alphaFromTimeConstant(timeConstants.acute),
    );
    chronicState[bodyPart] = updateExponentiallyWeightedMean(
      chronicState[bodyPart],
      standardizedLoads[bodyPart],
      alphaFromTimeConstant(timeConstants.chronic),
    );
    let ratio = Math.abs(chronicState[bodyPart]) < configuration.tolerance
      ? 1
      : acuteState[bodyPart] / chronicState[bodyPart];
    if (!Number.isFinite(ratio) || ratio <= 0) ratio = 1;
    bodyPartResults[bodyPart].A = acuteState[bodyPart];
    bodyPartResults[bodyPart].C = chronicState[bodyPart];
    bodyPartResults[bodyPart].R = ratio;
    bodyPartResults[bodyPart].S = Math.log(ratio);
  });

  let maximumScore = -Infinity;
  let maximumBodyPart = BODY_PARTS[0];
  BODY_PARTS.forEach((bodyPart) => {
    if (bodyPartResults[bodyPart].S > maximumScore) {
      maximumScore = bodyPartResults[bodyPart].S;
      maximumBodyPart = bodyPart;
    }
  });
  const uniformPrior = 1 / BODY_PARTS.length;
  const globalScore = Math.log(Math.max(
    BODY_PARTS.reduce(
      (total, bodyPart) => total + uniformPrior * Math.exp(bodyPartResults[bodyPart].S),
      0,
    ),
    configuration.epsilon,
  ));

  return {
    theta: MODEL_WARNING_THRESHOLD,
    maxS: maximumScore,
    maxPart: maximumBodyPart,
    warn: maximumScore > MODEL_WARNING_THRESHOLD,
    G: globalScore,
  };
}

export function calculateLoadModel(records = [], configurationOverride = {}) {
  const configuration = mergeModelConfiguration(configurationOverride);
  const inputs = createModelInputSeries(records);
  const acuteState = Object.fromEntries(BODY_PARTS.map((bodyPart) => [bodyPart, null]));
  const chronicState = Object.fromEntries(BODY_PARTS.map((bodyPart) => [bodyPart, null]));
  const loadSeries = Object.fromEntries(BODY_PARTS.map((bodyPart) => [bodyPart, []]));
  const results = [];

  inputs.forEach((input, index) => {
    const derivedInputs = calculateDerivedInputs(input, configuration);
    const totalLoad = calculateTotalLoadComponents(input, derivedInputs, configuration);
    const bodyPartWeights = calculateBodyPartWeights(derivedInputs, configuration);
    const integratedLoads = calculateIntegratedBodyPartLoads(
      totalLoad,
      bodyPartWeights,
      configuration,
      derivedInputs,
    );
    const modelTotalLoad = calculateModelTotalLoad(totalLoad, integratedLoads);
    const restDay = isRestInput(input, configuration);
    BODY_PARTS.forEach((bodyPart) => {
      loadSeries[bodyPart].push(integratedLoads.L[bodyPart]);
    });

    const bodyPartResults = Object.fromEntries(BODY_PARTS.map((bodyPart) => [
      bodyPart,
      createInitialBodyPartResult(
        bodyPart,
        bodyPartWeights,
        integratedLoads,
        configuration,
      ),
    ]));
    const standardizationReady = index >= configuration.standardizationRecordCount;
    const globalResult = standardizationReady
      ? calculateStandardizedState({
        index,
        configuration,
        loadSeries,
        integratedLoads,
        bodyPartResults,
        acuteState,
        chronicState,
      })
      : {
        theta: MODEL_WARNING_THRESHOLD,
        maxS: null,
        maxPart: null,
        warn: false,
        G: null,
      };

    results.push({
      date: input.date,
      input: { ...input },
      derived: derivedInputs,
      total: totalLoad,
      modelTotalLoad,
      weights: bodyPartWeights,
      parts: bodyPartResults,
      audit: {
        internalWeightMode: "share-preserving-condition-aware",
        specialTransferActive: Boolean(integratedLoads.specialTransferActive),
        specialTransferReason: integratedLoads.specialTransferReason || "no-special-transfer",
        specialTransferRatio: integratedLoads.specialTransferRatio || 0,
        specialMovedLoadTotal: integratedLoads.specialMovedLoadTotal || 0,
        tauAchSafe: integratedLoads.tauAchSafe || 0,
        tauPlantarSafe: integratedLoads.tauPlantarSafe || 0,
      },
      global: globalResult,
      checks: calculateChecks({
        derivedInputs,
        totalLoad,
        bodyPartWeights,
        integratedLoads,
        modelTotalLoad,
        configuration,
        restDay,
        standardizationReady,
      }),
      meta: {
        standardizationReady,
        modelTotalLoadVersion: MODEL_TOTAL_LOAD_VERSION,
        loadModelVersion: LOAD_MODEL_VERSION,
      },
    });
  });

  return results;
}

export function calculateSingleRecord(record, configurationOverride = {}) {
  return calculateLoadModel([record], configurationOverride)[0] || null;
}

export {
  calculateBodyPartWeights,
  calculateDerivedInputs,
  calculateIntegratedBodyPartLoads,
  calculateModelTotalLoad,
  calculateTotalLoadComponents,
  getBodyPartDistribution,
  mergeModelConfiguration,
};
