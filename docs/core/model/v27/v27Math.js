export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function requirePositiveFinite(value, name) {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new RangeError(`${name} must be positive and finite`);
  }
}

export function approximatelyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance;
}

export function validateV27Shares(shares, tolerance = 0.01) {
  const values = [...shares];
  if (
    values.length === 0
    || values.some((value) => !isFiniteNumber(value) || value < 0 || value > 100)
  ) {
    throw new RangeError("shares must be finite values in [0, 100]");
  }
  const sum = values.reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 100) > tolerance) {
    throw new RangeError("shares must sum to 100; no normalization is allowed");
  }
  return sum;
}

export function linearInterpolate(value, xs, ys) {
  const epsilon = 1e-9;
  if (value < xs[0] - epsilon || value > xs.at(-1) + epsilon) {
    throw new RangeError("out of interpolation domain");
  }
  if (Math.abs(value - xs[0]) <= epsilon) return ys[0];
  if (Math.abs(value - xs.at(-1)) <= epsilon) return ys.at(-1);
  for (let index = 0; index < xs.length - 1; index += 1) {
    const left = xs[index];
    const right = xs[index + 1];
    if (left <= value && value <= right) {
      const fraction = (value - left) / (right - left);
      return ys[index] + fraction * (ys[index + 1] - ys[index]);
    }
  }
  throw new Error("unreachable interpolation interval");
}

export function median(values) {
  const numeric = [...values].filter(isFiniteNumber).sort((left, right) => left - right);
  if (!numeric.length) throw new RangeError("median requires at least one finite value");
  const middle = Math.floor(numeric.length / 2);
  return numeric.length % 2
    ? numeric[middle]
    : (numeric[middle - 1] + numeric[middle]) / 2;
}

export function weightedMean(items) {
  return items.reduce((total, [weight, value]) => total + weight * value, 0);
}

export function weightedRearrangementProduct(left, right, sameOrder) {
  const leftWork = [...left]
    .sort((a, b) => a[1] - b[1])
    .map(([weight, value]) => [weight, value]);
  const rightWork = [...right]
    .sort((a, b) => sameOrder ? a[1] - b[1] : b[1] - a[1])
    .map(([weight, value]) => [weight, value]);
  let leftIndex = 0;
  let rightIndex = 0;
  let result = 0;
  const epsilon = 1e-12;

  while (leftIndex < leftWork.length && rightIndex < rightWork.length) {
    const amount = Math.min(leftWork[leftIndex][0], rightWork[rightIndex][0]);
    result += amount * leftWork[leftIndex][1] * rightWork[rightIndex][1];
    leftWork[leftIndex][0] -= amount;
    rightWork[rightIndex][0] -= amount;
    if (leftWork[leftIndex][0] <= epsilon) leftIndex += 1;
    if (rightWork[rightIndex][0] <= epsilon) rightIndex += 1;
  }
  return result;
}

