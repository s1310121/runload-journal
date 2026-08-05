import { DEFAULT_MODEL_CONFIGURATION } from "./modelConstants.js";
import { normalizeModelInput } from "./modelInputAdapter.js";
import { toFiniteNumber } from "./numberUtilities.js";

export function calculateTotalLoadComponents(record, derivedInputs, configuration = DEFAULT_MODEL_CONFIGURATION) {
  const input = normalizeModelInput(record);
  const stepTerm = toFiniteNumber(input.steps, 0);
  const speedTerm = derivedInputs.Vratio ** 2;
  const slopeTerm = 1
    + configuration.uphillMultiplier * derivedInputs.G_plus
    + configuration.downhillMultiplier * derivedInputs.G_minus;
  const surfaceTerm = 1 + configuration.surfaceMultiplier * derivedInputs.S_surface;
  const bodyTerm = toFiniteNumber(input.body_weight_factor, 1);
  const externalTotal = stepTerm * speedTerm * slopeTerm * surfaceTerm * bodyTerm;
  const internalTotal = derivedInputs.T_s * toFiniteNumber(input.RPE, 0);

  return {
    L_ext_total: externalTotal,
    L_int: internalTotal,
    ext_terms: {
      term_steps: stepTerm,
      term_speed: speedTerm,
      term_slope: slopeTerm,
      term_surface: surfaceTerm,
      term_body: bodyTerm,
      Vratio: derivedInputs.Vratio,
    },
  };
}
