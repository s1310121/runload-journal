export function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clampNumber(value, minimum, maximum, fallback = 0) {
  return Math.min(maximum, Math.max(minimum, toFiniteNumber(value, fallback)));
}

export function sumNumbers(values = []) {
  return values.reduce((total, value) => total + toFiniteNumber(value, 0), 0);
}

export function alphaFromTimeConstant(timeConstant) {
  return 2 / (toFiniteNumber(timeConstant, 0) + 1);
}

export function roundNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return number;
  const factor = 10 ** Math.max(0, Number(digits) || 0);
  return Math.round((number + Number.EPSILON) * factor) / factor;
}
