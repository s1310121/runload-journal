/**
 * 利用者向け負荷モデルの固定定数。
 * 採用仕様はSourcebook / Validationで根拠・方向妥当性を管理する。
 * 画面には更新履歴ではなく、現在の計算結果と意味だけを表示する。
 */

export const BODY_PARTS = Object.freeze([
  "腰骨盤部",
  "股関節臀部",
  "大腿",
  "膝",
  "前下腿",
  "後下腿",
  "アキレス腱",
  "足底部",
  "足関節・足背部",
]);

export const CONTRACTILE_BODY_PARTS = Object.freeze([
  "腰骨盤部",
  "股関節臀部",
  "大腿",
  "前下腿",
  "後下腿",
]);

export const BODY_PART_KEYS = Object.freeze({
  "腰骨盤部": "lumbopelvic",
  "股関節臀部": "hipGlute",
  "大腿": "thigh",
  "膝": "knee",
  "前下腿": "anteriorLowerLeg",
  "後下腿": "posteriorLowerLeg",
  "アキレス腱": "achillesTendon",
  "足底部": "plantarFoot",
  "足関節・足背部": "ankleDorsum",
});

export const SURFACE_FIELDS = Object.freeze([
  Object.freeze({ recordKey: "pavedPercent", modelKey: "paved", legacyKey: "surface_paved_pct", label: "舗装路" }),
  Object.freeze({ recordKey: "trackPercent", modelKey: "track", legacyKey: "surface_track_pct", label: "陸上トラック" }),
  Object.freeze({ recordKey: "treadmillPercent", modelKey: "treadmill", legacyKey: "surface_treadmill_pct", label: "トレッドミル" }),
  Object.freeze({ recordKey: "soilPercent", modelKey: "soil", legacyKey: "surface_soil_pct", label: "締まった土道" }),
  Object.freeze({ recordKey: "trailPercent", modelKey: "trail", legacyKey: "surface_trail_pct", label: "不整地トレイル" }),
  Object.freeze({ recordKey: "naturalGrassPercent", modelKey: "natural_grass", legacyKey: "surface_natural_grass_pct", label: "芝生" }),
  Object.freeze({ recordKey: "artificialTurfPercent", modelKey: "artificial_turf", legacyKey: "surface_artificial_turf_pct", label: "人工芝" }),
  Object.freeze({ recordKey: "sandPercent", modelKey: "sand", legacyKey: "surface_sand_pct", label: "砂地" }),
]);

export const SURFACE_TRAITS = Object.freeze([
  "hardness",
  "grip",
  "unevenness",
  "sink",
  "rebound",
]);


export const SURFACE_TRAIT_LABELS = Object.freeze({
  hardness: "硬さ・剛性",
  grip: "摩擦・グリップ",
  unevenness: "不整地性",
  sink: "沈み込み",
  rebound: "反発性",
});

export const SURFACE_INTERPRETATION_GUIDE = Object.freeze({
  paved: Object.freeze({ label: "舗装路", traits: ["硬い", "安定"], interpretation: "基準路面。硬さと安定性が高く、衝撃・制動の基準として扱う。" }),
  track: Object.freeze({ label: "陸上トラック", traits: ["安定", "反発性"], interpretation: "安定して反発を感じやすい路面。接地のしやすさと推進のしやすさを見返す材料として扱う。" }),
  treadmill: Object.freeze({ label: "トレッドミル", traits: ["速度一定", "ベルト環境"], interpretation: "屋外路面とは違い、速度が一定になりやすい走行環境として扱う。" }),
  soil: Object.freeze({ label: "締まった土道", traits: ["やや柔らかい", "条件依存"], interpretation: "細かいグラベル等の近接根拠はあるが、土の湿り・締まり具合で性質が変わるため、補助確認に留める。" }),
  trail: Object.freeze({ label: "不整地トレイル", traits: ["不整地性", "低安定性"], interpretation: "凹凸や接地のばらつきが出やすい路面として、接地の安定や姿勢の見返しに使う。" }),
  natural_grass: Object.freeze({ label: "芝生", traits: ["柔らかい", "やや不安定"], interpretation: "柔らかさや状態差が出やすい路面として、接地感と脚への感じ方を見返す材料にする。" }),
  artificial_turf: Object.freeze({ label: "人工芝", traits: ["下地依存", "摩擦/反発条件依存"], interpretation: "下地・温度・摩擦で性質が変わりやすい路面として、記録時の感じ方と合わせて見返す。" }),
  sand: Object.freeze({ label: "砂地", traits: ["沈み込み大", "低安定性"], interpretation: "衝撃増加ではなく、沈み込み・推進効率低下・足部/下腿制御として扱う。" }),
});

const BASE_BODY_PART_WEIGHTS = Object.freeze({
  "腰骨盤部": 0.08,
  "股関節臀部": 0.13,
  "大腿": 0.16,
  "膝": 0.17,
  "前下腿": 0.11,
  "後下腿": 0.12,
  "アキレス腱": 0.08,
  "足底部": 0.07,
  "足関節・足背部": 0.08,
});

const BASE_BODY_PART_LOG_WEIGHTS = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_BODY_PART_WEIGHTS).map(([bodyPart, weight]) => [bodyPart, Math.log(weight)]),
  ),
);

const INTERNAL_LOAD_WEIGHTS = Object.freeze({
  "腰骨盤部": 0.18,
  "股関節臀部": 0.22,
  "大腿": 0.28,
  "前下腿": 0.14,
  "後下腿": 0.18,
});

export const DEFAULT_MODEL_CONFIGURATION = Object.freeze({
  referenceSpeedMetersPerSecond: 3.0,
  uphillMultiplier: 10,
  downhillMultiplier: 10,
  surfaceMultiplier: 0.035,
  acuteTimeConstant: 7,
  chronicTimeConstant: 28,
  standardizationRecordCount: 28,
  epsilon: 1e-8,
  tolerance: 1e-6,
  achillesTransferRatio: 0.25,
  plantarTransferRatio: 0.10,
  surfaceCoefficients: Object.freeze({
    paved: 0.0,
    trail: 1.0,
    treadmill: 0.1,
    track: 0.2,
    soil: 0.6,
    natural_grass: 0.55,
    artificial_turf: 0.75,
    sand: 0.9,
  }),
  surfaceTraitWeights: Object.freeze({
    hardness: 0.35,
    unevenness: 0.25,
    sink: 0.20,
    grip: 0.15,
    rebound: 0.05,
  }),
  surfaceTraitScores: Object.freeze({
    paved: Object.freeze({ hardness: 3, grip: 1, unevenness: 0, sink: 0, rebound: 2 }),
    track: Object.freeze({ hardness: 2, grip: 2, unevenness: 0, sink: 0, rebound: 3 }),
    treadmill: Object.freeze({ hardness: 1, grip: 1, unevenness: 0, sink: 0, rebound: 3 }),
    soil: Object.freeze({ hardness: 1, grip: 1, unevenness: 2, sink: 1, rebound: 1 }),
    trail: Object.freeze({ hardness: 1, grip: 1, unevenness: 3, sink: 1, rebound: 0 }),
    natural_grass: Object.freeze({ hardness: 1, grip: 1, unevenness: 2, sink: 1, rebound: 1 }),
    artificial_turf: Object.freeze({ hardness: 2, grip: 3, unevenness: 1, sink: 0, rebound: 2 }),
    sand: Object.freeze({ hardness: 0, grip: 1, unevenness: 2, sink: 3, rebound: 0 }),
  }),
  surfaceRoleScale: 0.5,
  surfaceBodyPartSensitivity: Object.freeze({
    "腰骨盤部": Object.freeze({ hardness: 0.00, grip: 0.00, unevenness: 0.05, sink: 0.04, rebound: 0.00 }),
    "股関節臀部": Object.freeze({ hardness: 0.01, grip: 0.02, unevenness: 0.07, sink: 0.06, rebound: 0.00 }),
    "大腿": Object.freeze({ hardness: 0.05, grip: 0.03, unevenness: 0.03, sink: 0.03, rebound: 0.02 }),
    "膝": Object.freeze({ hardness: 0.08, grip: 0.05, unevenness: 0.04, sink: 0.01, rebound: 0.01 }),
    "前下腿": Object.freeze({ hardness: 0.07, grip: 0.02, unevenness: 0.04, sink: 0.01, rebound: 0.03 }),
    "後下腿": Object.freeze({ hardness: 0.02, grip: 0.03, unevenness: 0.06, sink: 0.09, rebound: 0.04 }),
    "アキレス腱": Object.freeze({ hardness: 0.02, grip: 0.04, unevenness: 0.03, sink: 0.08, rebound: 0.05 }),
    "足底部": Object.freeze({ hardness: 0.06, grip: 0.06, unevenness: 0.05, sink: 0.08, rebound: 0.03 }),
    "足関節・足背部": Object.freeze({ hardness: 0.02, grip: 0.08, unevenness: 0.10, sink: 0.03, rebound: 0.01 }),
  }),
  baseBodyPartWeights: BASE_BODY_PART_WEIGHTS,
  baseBodyPartLogWeights: BASE_BODY_PART_LOG_WEIGHTS,
  internalLoadWeights: INTERNAL_LOAD_WEIGHTS,
  speedCoefficients: Object.freeze({
    "腰骨盤部": 0.18,
    "股関節臀部": 0.26,
    "大腿": 0.15,
    "膝": -0.08,
    "前下腿": -0.04,
    "後下腿": 0.12,
    "アキレス腱": 0.10,
    "足底部": 0.06,
    "足関節・足背部": 0.05,
  }),
  uphillCoefficients: Object.freeze({
    "腰骨盤部": 0.50,
    "股関節臀部": 1.10,
    "大腿": 1.00,
    "膝": -0.20,
    "前下腿": -0.10,
    "後下腿": 1.00,
    "アキレス腱": 0.80,
    "足底部": 0.30,
    "足関節・足背部": 0.35,
  }),
  downhillCoefficients: Object.freeze({
    "腰骨盤部": -0.10,
    "股関節臀部": 0.10,
    "大腿": 1.20,
    "膝": 1.40,
    "前下腿": 0.90,
    "後下腿": 0.10,
    "アキレス腱": -0.10,
    "足底部": 0.10,
    "足関節・足背部": 0.65,
  }),
  surfaceCoefficientsByBodyPart: Object.freeze({
    "腰骨盤部": 0.02,
    "股関節臀部": 0.04,
    "大腿": 0.02,
    "膝": -0.02,
    "前下腿": 0.12,
    "後下腿": 0.10,
    "アキレス腱": 0.06,
    "足底部": 0.10,
    "足関節・足背部": 0.14,
  }),
  timeConstantsByBodyPart: Object.freeze({
    "腰骨盤部": Object.freeze({ acute: 7, chronic: 28 }),
    "股関節臀部": Object.freeze({ acute: 7, chronic: 28 }),
    "大腿": Object.freeze({ acute: 7, chronic: 28 }),
    "膝": Object.freeze({ acute: 7, chronic: 35 }),
    "前下腿": Object.freeze({ acute: 7, chronic: 28 }),
    "後下腿": Object.freeze({ acute: 7, chronic: 28 }),
    "アキレス腱": Object.freeze({ acute: 10, chronic: 56 }),
    "足底部": Object.freeze({ acute: 10, chronic: 56 }),
    "足関節・足背部": Object.freeze({ acute: 7, chronic: 35 }),
  }),
});

export const MODEL_WARNING_THRESHOLD = Math.log(1.5);
export const MODEL_TOTAL_LOAD_VERSION = "model-total-load-v1";
export const MODEL_TOTAL_LOAD_UNIT = "model-index";
export const LOAD_MODEL_VERSION = "rule-observation-sequential-body-profile-surface-current";

// Retired body-size reference constants were removed from the current runtime.
// Existing legacy record snapshots retain their stored factor without recomputation.

export function cloneDefaultModelConfiguration() {
  return structuredClone(DEFAULT_MODEL_CONFIGURATION);
}
