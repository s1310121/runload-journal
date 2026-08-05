const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const RECENT_COMPARISON_DAYS = 28;
export const RECENT_COMPARISON_MINIMUM_PRIOR = 3;

function dayNumber(date = "") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / MILLISECONDS_PER_DAY;
}

export function modelTotalValue(experience = {}) {
  const v27Value = Number(experience.v27Result?.total?.central_points);
  if (Number.isFinite(v27Value)) return v27Value;
  const value = Number(experience.modelResult?.modelTotalLoad?.value);
  return Number.isFinite(value) ? value : null;
}

export function modelTotalFamily(experience = {}) {
  return experience.v27ResultRecord ? "CURRENT_FORMAT" : "LEGACY_FORMAT";
}

export function sortExperiencesChronologically(experiences = []) {
  return [...experiences].filter((item) => item?.record?.id).sort((left, right) => (
    String(left.record.date || "").localeCompare(String(right.record.date || ""))
      || String(left.record.createdAt || "").localeCompare(String(right.record.createdAt || ""))
      || String(left.record.id || "").localeCompare(String(right.record.id || ""))
  ));
}

function monthDayLabel(date = "") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!match) return date || "日付なし";
  return `${Number(match[2])}/${Number(match[3])}`;
}

function average(values = []) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function median(values = []) {
  const ordered = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!ordered.length) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function medianComparisonKind(currentValue, medianValue) {
  if (currentValue == null || medianValue == null) return "insufficient";
  const tolerance = Math.max(1, Math.abs(medianValue) * 0.05);
  const difference = currentValue - medianValue;
  if (Math.abs(difference) <= tolerance) return "near_median";
  return difference > 0 ? "above_median" : "below_median";
}

function emptyComparison({ kind, count = 0, currentValue = null } = {}) {
  return Object.freeze({
    kind,
    count,
    currentValue,
    minimumPriorCount: RECENT_COMPARISON_MINIMUM_PRIOR,
    referenceStatistic: "median",
    median: null,
    differenceFromMedian: null,
    differencePercentFromMedian: null,
    provisional: false,
    average: null,
    differenceFromAverage: null,
    min: null,
    max: null,
    days: RECENT_COMPARISON_DAYS,
    trendPoints: Object.freeze([]),
  });
}

export function buildRecentModelTotalComparison(experiences = [], currentExperience = {}) {
  const record = currentExperience.record || {};
  const currentValue = modelTotalValue(currentExperience);
  const currentFamily = modelTotalFamily(currentExperience);
  if (record.activityType === "rest") {
    return emptyComparison({ kind: "rest", currentValue });
  }

  const targetDay = dayNumber(record.date);
  const recentExperiences = sortExperiencesChronologically(experiences).filter((item) => {
    if (item.record.id === record.id || item.record.activityType === "rest") return false;
    if (modelTotalFamily(item) !== currentFamily) return false;
    const candidateDay = dayNumber(item.record.date);
    const difference = targetDay - candidateDay;
    return Number.isFinite(difference) && difference >= 1 && difference <= RECENT_COMPARISON_DAYS;
  });
  const recentValues = recentExperiences.map(modelTotalValue).filter((value) => value != null);

  if (recentValues.length < RECENT_COMPARISON_MINIMUM_PRIOR || currentValue == null) {
    const recentAverage = average(recentValues);
    return Object.freeze({
      ...emptyComparison({ kind: "insufficient", count: recentValues.length, currentValue }),
      average: recentAverage,
      differenceFromAverage: currentValue != null && recentAverage != null ? currentValue - recentAverage : null,
      min: recentValues.length ? Math.min(...recentValues) : null,
      max: recentValues.length ? Math.max(...recentValues) : null,
    });
  }

  const min = Math.min(...recentValues);
  const max = Math.max(...recentValues);
  const recentAverage = average(recentValues);
  const recentMedian = median(recentValues);
  const differenceFromAverage = currentValue - recentAverage;
  const differenceFromMedian = currentValue - recentMedian;
  const differencePercentFromMedian = Math.abs(recentMedian) > 1e-9
    ? (differenceFromMedian / recentMedian) * 100
    : null;
  const trendSource = recentExperiences
    .map((item) => ({
      recordId: item.record.id,
      date: item.record.date,
      value: modelTotalValue(item),
      current: false,
    }))
    .filter((item) => item.value != null)
    .slice(-6);
  const trendPoints = Object.freeze([
    ...trendSource,
    { recordId: record.id, date: record.date, value: currentValue, current: true },
  ].map((item) => Object.freeze({
    ...item,
    label: item.current ? "今回" : monthDayLabel(item.date),
  })));

  return Object.freeze({
    kind: medianComparisonKind(currentValue, recentMedian),
    count: recentValues.length,
    currentValue,
    minimumPriorCount: RECENT_COMPARISON_MINIMUM_PRIOR,
    referenceStatistic: "median",
    median: recentMedian,
    differenceFromMedian,
    differencePercentFromMedian,
    provisional: recentValues.length < 6,
    // Compatibility fields remain available for existing reports/tests, but the UI uses the median.
    average: recentAverage,
    differenceFromAverage,
    min,
    max,
    days: RECENT_COMPARISON_DAYS,
    trendPoints,
  });
}
