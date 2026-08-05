export const RPE_PROVENANCE = Object.freeze({
  userReported: "USER_REPORTED",
  notReported: "NOT_REPORTED",
  legacyDefaultUnconfirmed: "LEGACY_DEFAULT_UNCONFIRMED",
  legacyNonDefaultRecorded: "LEGACY_NONDEFAULT_RECORDED",
  legacyUnverified: "LEGACY_UNVERIFIED",
});

const REPORTED_STATES = new Set([
  RPE_PROVENANCE.userReported,
  RPE_PROVENANCE.legacyNonDefaultRecorded,
]);

export function normalizeRpeProvenance(value = "", {
  hasValue = false,
  assumeExplicit = false,
} = {}) {
  const requested = String(value || "").toUpperCase();
  if (Object.values(RPE_PROVENANCE).includes(requested)) return requested;
  if (!hasValue) return RPE_PROVENANCE.notReported;
  return assumeExplicit
    ? RPE_PROVENANCE.userReported
    : RPE_PROVENANCE.legacyUnverified;
}

export function isReportedRpeProvenance(value = "") {
  return REPORTED_STATES.has(String(value || "").toUpperCase());
}

export function reportedRpeValue(record = {}) {
  if (!isReportedRpeProvenance(record.rpeProvenance)) return null;
  const value = Number(record.perceivedExertion);
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
}

export function legacyRpeProvenance(rawValue) {
  if (rawValue === "" || rawValue == null || !Number.isFinite(Number(rawValue))) {
    return RPE_PROVENANCE.notReported;
  }
  return Number(rawValue) === 4
    ? RPE_PROVENANCE.legacyDefaultUnconfirmed
    : RPE_PROVENANCE.legacyNonDefaultRecorded;
}
