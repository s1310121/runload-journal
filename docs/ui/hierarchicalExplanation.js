export const HIERARCHICAL_EXPLANATION_VERSION = "runload-beginner-knowledge-explanation-v2";

export const INPUT_PURPOSE_GUIDANCE = Object.freeze([
  Object.freeze({
    key: "run-facts",
    title: "今回の走行量を残す",
    description: "日付、距離、実走時間は、今回の記録をあとから同じ意味で見返すための基本情報です。",
  }),
  Object.freeze({
    key: "course-conditions",
    title: "走った条件を振り返る",
    description: "坂道や路面は、どのような条件で走ったかを思い出し、結果に対応する読みものを探すために使います。",
  }),
  Object.freeze({
    key: "comparison-context",
    title: "似た記録を比べやすくする",
    description: "歩数、取得方法、走り方を残すと、条件がそろう過去記録かどうかを区別しやすくなります。",
  }),
  Object.freeze({
    key: "personal-reflection",
    title: "本人の感覚を別に残す",
    description: "きつさ、身体の記録、メモは、走行事実や部位別の数値と混ぜずに見返します。",
  }),
]);

const CONDITION_ORDER = Object.freeze([
  "amount",
  "grade-speed",
  "grade",
  "speed-style",
  "cadence",
  "surface-footwear",
  "other-condition",
]);

const CONDITION_DEFINITIONS = Object.freeze({
  amount: Object.freeze({
    title: "今回の走行量",
    description: "走る距離や時間が長くなると、身体は走る動きをより長く繰り返します。距離・時間・歩数は、今回の走行量を振り返る手掛かりです。",
    articleId: "regional-three-views",
  }),
  "grade-speed": Object.freeze({
    title: "坂道と走行ペースの組み合わせ",
    description: "先行研究では、坂の向きや勾配、走行ペースの組み合わせによって、関節や筋の働き方が異なることが報告されています。",
    articleId: "slope-endpoints",
  }),
  grade: Object.freeze({
    title: "坂道の向きと勾配",
    description: "先行研究では、上り・下り・平坦で、関節や筋の働き方、身体各部への繰り返しのかかり方が同じではないことが報告されています。",
    articleId: "grade-and-coverage",
  }),
  "speed-style": Object.freeze({
    title: "走行ペースと走り方",
    description: "走行ペースや、途中で歩いたかどうかが変わると、動きの繰り返し方や身体の使われ方も変わります。",
    articleId: "slope-endpoints",
  }),
  cadence: Object.freeze({
    title: "歩数と走るリズム",
    description: "歩数から分かる走るリズムは、同じ距離でも一歩ごとの動きと繰り返し回数を振り返る手掛かりになります。",
    articleId: "regional-three-views",
  }),
  "surface-footwear": Object.freeze({
    title: "路面・シューズ・足のつき方",
    description: "先行研究では、路面の硬さや凹凸、シューズ、足のつき方によって、足裏の圧や足部・下肢の動きが異なる場合があると報告されています。",
    articleId: "surface-missingness",
  }),
  "other-condition": Object.freeze({
    title: "今回の走行条件",
    description: "走行条件によって身体の使われ方は同じとは限りません。今回の記録と関連する一般説明を読みもので確認できます。",
    articleId: "regional-three-views",
  }),
});

function finiteContribution(event) {
  return event?.numericEffectApplied === true && Number.isFinite(Number(event?.contributionLog));
}

function nonZero(event) {
  return Math.abs(Number(event?.contributionLog || 0)) > 1e-12;
}

function routeText(event) {
  return String(event?.routeId || "").toUpperCase();
}

function inputSet(event) {
  return new Set(Array.isArray(event?.inputIds) ? event.inputIds : []);
}

function keysForEvent(event) {
  if (event?.traceCode === "EXPOSURE_CONTRIBUTION") return ["amount"];

  const route = routeText(event);
  const inputs = inputSet(event);
  const keys = [];

  // Grade IDs can be present in a shared section trace even when the applied
  // route is speed-only. User-facing explanations therefore use the applied
  // route, not co-present input IDs, to decide whether a slope condition was
  // actually reflected.
  const hasGrade = /GRADE|UPHILL|DOWNHILL|SLOPE/.test(route);
  const hasSpeed = /SPEED/.test(route)
    || inputs.has("RL-DV-019") || inputs.has("RL-DV-021");

  if (hasGrade && hasSpeed && route !== "REFERENCE_CONDITION") keys.push("grade-speed");
  else {
    if (hasGrade && route !== "REFERENCE_CONDITION") keys.push("grade");
    if ((hasSpeed || /GAIT|RUNNING_FORMAT/.test(route)) && route !== "REFERENCE_CONDITION") keys.push("speed-style");
  }

  if (/CADENCE|STEP_RATE|RHYTHM/.test(route)) keys.push("cadence");

  if (/SURFACE|UNEVEN|SAND|GRASS|PLANTAR|SHOE|HEEL|STRIKE|FOOTWEAR/.test(route)
    || inputs.has("RL-IN-072") || inputs.has("RL-IN-073") || inputs.has("RL-IN-080")) {
    keys.push("surface-footwear");
  }

  return [...new Set(keys)];
}

export function buildRegionalConditionExplanation(row = {}) {
  const numericEvents = (Array.isArray(row.reasonTrace) ? row.reasonTrace : []).filter(finiteContribution);
  const supportingEvents = new Map(CONDITION_ORDER.map((key) => [key, []]));

  numericEvents.forEach((event) => {
    const keys = keysForEvent(event);
    keys.forEach((key) => supportingEvents.get(key)?.push(event));
  });

  const nonReferenceConditionEvents = numericEvents.filter((event) => (
    event.traceCode === "SECTION_CONDITION_CONTRIBUTION"
    && routeText(event) !== "REFERENCE_CONDITION"
    && nonZero(event)
  ));

  if (nonReferenceConditionEvents.length) {
    const recognized = new Set(
      CONDITION_ORDER.flatMap((key) => supportingEvents.get(key) || []),
    );
    if (nonReferenceConditionEvents.some((event) => !recognized.has(event))) {
      supportingEvents.get("other-condition").push(...nonReferenceConditionEvents.filter((event) => !recognized.has(event)));
    }
  }

  const conditions = CONDITION_ORDER.flatMap((key) => {
    const events = supportingEvents.get(key) || [];
    const effective = key === "amount" ? events : events.filter(nonZero);
    if (!effective.length) return [];
    const definition = CONDITION_DEFINITIONS[key];
    return [Object.freeze({
      key,
      ...definition,
      support: Object.freeze(effective.map((event) => Object.freeze({
        traceCode: String(event.traceCode || ""),
        routeId: String(event.routeId || ""),
        inputIds: Object.freeze([...(event.inputIds || [])]),
      }))),
    })];
  });

  return Object.freeze({
    version: HIERARCHICAL_EXPLANATION_VERSION,
    conditions: Object.freeze(conditions),
    hasAppliedConditionChange: nonReferenceConditionEvents.length > 0,
    hasExposure: conditions.some((item) => item.key === "amount"),
    statement: nonReferenceConditionEvents.length
      ? "ここでは、今回の記録と関連する一般的な知見を示しています。"
      : "今回の記録では、走行量を中心に振り返ります。関連する一般的な知見を示しています。",
  });
}

export function columnHrefForCondition(condition, { recordId = "", regionId = "" } = {}) {
  const query = new URLSearchParams({
    articleId: condition?.articleId || "regional-three-views",
    origin: "result-condition",
  });
  if (recordId) query.set("recordId", String(recordId));
  if (regionId) query.set("regionId", String(regionId));
  return `#/column?${query.toString()}`;
}
