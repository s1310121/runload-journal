export const EPS = 1e-12;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function nearlyEqual(a, b, tolerance = 1e-9) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

export function logInterpolate(points, x) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (!Number.isFinite(x) || x < sorted[0][0] - EPS || x > sorted.at(-1)[0] + EPS) {
    const error = new RangeError("OUT_OF_SOURCE_DOMAIN");
    error.code = "OUT_OF_SOURCE_DOMAIN";
    throw error;
  }
  for (const [px, py] of sorted) {
    if (Math.abs(px - x) <= EPS) return py;
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [x0, y0] = sorted[i];
    const [x1, y1] = sorted[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return Math.exp(Math.log(y0) + (Math.log(y1) - Math.log(y0)) * t);
    }
  }
  throw new Error("Interpolation invariant failed");
}

export function boundedFactor(raw, bound) {
  if (!(bound > 0)) return 1;
  return Math.exp(bound * Math.tanh(raw / bound));
}

export function geometricMeanRatio(weightedRatios) {
  const totalWeight = weightedRatios.reduce((sum, item) => sum + item.weight, 0);
  if (!(totalWeight > 0)) throw new Error("No positive integration weight");
  return Math.exp(weightedRatios.reduce((sum, item) => {
    if (!(item.ratio > 0)) throw new Error("Condition ratio must be positive");
    return sum + (item.weight / totalWeight) * Math.log(item.ratio);
  }, 0));
}

export function gradePercentToDegrees(percent) {
  return Math.atan(percent / 100) * 180 / Math.PI;
}

export function gradeDegreesToPercent(degrees) {
  return Math.tan(degrees * Math.PI / 180) * 100;
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function worstCalculationState(states) {
  const order = ["CALCULATED", "PARTIAL", "OUT_OF_SUPPORTED_RANGE", "NOT_CALCULABLE", "NOT_APPLICABLE"];
  return states.reduce((worst, state) => order.indexOf(state) > order.indexOf(worst) ? state : worst, "CALCULATED");
}

export function mergeState(a, b) {
  return worstCalculationState([a, b]);
}

export function success(value, warnings = []) { return { ok: true, value, warnings }; }
export function failure(code, messageKey, path = "", details = {}) {
  return { ok: false, error: { code, messageKey, path, details } };
}
