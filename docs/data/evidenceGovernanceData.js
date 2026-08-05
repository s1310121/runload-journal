export const EVIDENCE_GOVERNANCE_VERSION = "runload-evidence-governed-columns-v2";
export const EVIDENCE_GOVERNANCE_REVIEW_DATE = "2026-08-05";

function freezeList(items = []) {
  return Object.freeze([...items]);
}

function sourceRecord(input) {
  return Object.freeze({
    ...input,
    modelSourceIds: freezeList(input.modelSourceIds),
    anchorIds: freezeList(input.anchorIds),
    relatedInputs: freezeList(input.relatedInputs),
    relatedRoutes: freezeList(input.relatedRoutes),
    relatedRegions: freezeList(input.relatedRegions),
  });
}

function articleRecord(input) {
  return Object.freeze({
    ...input,
    sourceIds: freezeList(input.sourceIds),
    relatedInputs: freezeList(input.relatedInputs),
    relatedRoutes: freezeList(input.relatedRoutes),
    relatedRegions: freezeList(input.relatedRegions),
  });
}

export const SOURCE_EVIDENCE_REGISTRY = Object.freeze([
  sourceRecord({
    sourceId: "RUNLOAD-SPEC-CURRENT",
    sourceRole: "CURRENT_INTERNAL_SPECIFICATION",
    title: "RunLoad Current model, output, and claim-boundary specifications",
    locator: "Master V1.10: 02_INPUT_OUTPUT_UI_CURRENT/03_OUTPUT_UI_SEMANTIC_CONTRACT_CURRENT.md; 03_REGIONAL_A4_MODEL_CURRENT/00, 12, 13, 24",
    evidenceStatus: "CURRENT_INTERNAL_SPEC",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: [],
    anchorIds: [],
    relatedInputs: ["記事ごとの関連入力", "表示状態", "比較signature"],
    relatedRoutes: ["表示契約", "情報分離", "非主張境界"],
    relatedRegions: ["記事ごとの対象部位"],
    allowedClaim: "Current仕様で固定した計算の意味、表示状態、情報分離、非主張境界を説明できる。",
    prohibitedClaim: "臨床妥当性、個人の安全、傷害確率、診断、走行可否を証明する資料として扱わない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-MINETTI",
    sourceRole: "V27_ACTIVE_MODEL_AND_APP_READING",
    title: "Energy cost of walking and running at extreme uphill and downhill slopes",
    locator: "Methods/equation and grade-cost results / PDF pp.3-6; Current packaged PDF identity in Source Crosswalk",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-NEW-001"],
    anchorIds: [],
    relatedInputs: ["代表勾配", "上り区間割合", "下り区間割合"],
    relatedRoutes: ["V2.7 grade energy-cost route"],
    relatedRegions: ["なし（総合推定負荷の別指標）"],
    allowedClaim: "資料内の勾配と代謝コストの方向・比率を、宣言したV2.7比較用変換の範囲で説明できる。",
    prohibitedClaim: "個人の消費エネルギー実測値、疲労、傷害、走行可否へ変換しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-VAN-HOOREN",
    sourceRole: "REGIONAL_A4_V27_AND_APP_READING",
    title: "Per-step and cumulative load at three common running injury locations: The effect of speed, surface gradient, and cadence",
    locator: "Table 2 / PDF p.9",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["BAT-SRC-010"],
    anchorIds: ["RCM-ANCH-001..039"],
    relatedInputs: ["速度", "勾配", "cadence"],
    relatedRoutes: ["Regional A4 SPEED", "Regional A4 GRADE", "Regional A4 CADENCE"],
    relatedRegions: ["膝蓋大腿関節領域", "アキレス腱領域", "足底腱膜領域"],
    allowedClaim: "資料の条件・endpoint・範囲内で、3領域の累積代理指標の方向と比率を説明できる。",
    prohibitedClaim: "3領域以外へ一般化せず、傷害確率、危険順位、共通物理単位、因果関係を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-NUCKOLS",
    sourceRole: "REGIONAL_A4_V27_AND_APP_READING",
    title: "Mechanics of walking and running up and downhill: a joint-level perspective",
    locator: "Table 1 / PDF p.6",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-SUP-003"],
    anchorIds: ["RCM-ANCH-A3-001..015"],
    relatedInputs: ["勾配"],
    relatedRoutes: ["Regional A4 GRADE_JOINT_POWER"],
    relatedRegions: ["股関節領域", "大腿前面領域", "足関節領域"],
    allowedClaim: "資料のjoint-power条件と指定proxy変換の範囲で、勾配による方向差を説明できる。",
    prohibitedClaim: "筋・腱・関節の実測負荷や、全12部位の直接測定として扱わない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-YAMIN",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Effects of Surface Stiffness on Plantar Pressure and Lower-Limb Muscle Activity during Running",
    locator: "Table 3 / PDF p.12",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["RCM-SRC-003"],
    anchorIds: [],
    relatedInputs: ["路面の硬さ", "シューズ着用条件"],
    relatedRoutes: ["Regional A4 surface context"],
    relatedRegions: ["足底部", "下肢筋群"],
    allowedClaim: "研究条件の範囲で、路面の硬さにより足底圧と下肢筋活動が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の障害原因、最適な路面、走行可否、全路面への一般化には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-VOLOSHINA",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Biomechanics and energetics of running on uneven terrain",
    locator: "Results / PDF pp.3-6",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["BAT-SRC-027"],
    anchorIds: [],
    relatedInputs: ["路面の凹凸"],
    relatedRoutes: ["Regional A4 uneven-surface context"],
    relatedRegions: ["下肢全体"],
    allowedClaim: "研究条件の範囲で、凹凸のある路面では平らな路面と身体の安定化やエネルギー面の反応が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の障害原因、転倒確率、走行可否、あらゆる自然路面への一般化には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HORIGUCHI",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Effects of uphill and downhill running on plantar pressure distribution in different foot strike patterns",
    locator: "Table 1 / PDF p.3; Methods / pp.2-3; limitations / pp.7-8",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-A4-001"],
    anchorIds: ["RCM-ANCH-A4-001..011"],
    relatedInputs: ["勾配", "足部接地"],
    relatedRoutes: ["Regional A4 grade and foot-strike context"],
    relatedRegions: ["後足部", "足底中部", "前足部"],
    allowedClaim: "研究条件の範囲で、上り・下りと足部接地の違いにより足底圧分布が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の接地型を推定せず、障害原因、最適な接地、走行可否には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HADDAD",
    sourceRole: "V27_ACTIVE_MODEL_AND_APP_READING",
    title: "Session-RPE Method for Training Load Monitoring",
    locator: "Session-RPE method and influencing-factor review / PDF pp.2-9",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-CUR-017"],
    anchorIds: [],
    relatedInputs: ["実走時間", "RPE"],
    relatedRoutes: ["session-RPE separate subjective route"],
    relatedRegions: ["なし（走行全体の本人申告）"],
    allowedClaim: "実走時間と本人RPEを別指標として記録する方法と、影響要因があることを一般的に説明できる。",
    prohibitedClaim: "Regional A4係数、部位別実測値、健康状態、傷害予測へ使用しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-LINTON",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Running-Centred Injury Prevention Support: A Scoping Review",
    locator: "Review scope, support practices, and limitations / PDF pp.2-6, 22-27",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-015"],
    anchorIds: [],
    relatedInputs: ["本人申告", "相談用共有範囲", "記録文脈"],
    relatedRoutes: ["deterministic consultation information-organization route"],
    relatedRegions: ["本人が選択した部位のみ"],
    allowedClaim: "ランナー支援で記録・教育・専門家への共有が検討される背景を一般的に説明できる。",
    prohibitedClaim: "RunLoadの傷害予防効果、診断精度、相談結果の有効性を主張しない。",
  }),
]);

const SOURCE_BY_ID = new Map(SOURCE_EVIDENCE_REGISTRY.map((source) => [source.sourceId, source]));

export const ARTICLE_EVIDENCE_REGISTRY = Object.freeze([
  articleRecord({
    articleId: "model-total-v27", claimId: "COL-CLM-001", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-MINETTI"],
    relatedInputs: ["距離", "代表勾配", "上り・下り割合", "路面性質"], relatedRoutes: ["V2.7 total-load route", "coverage route"], relatedRegions: ["なし（総合推定負荷）"],
    allowedClaim: "距離を土台に、対応資料がある坂と路面だけを比較用推定へ反映する設計を説明する。",
    prohibitedClaim: "実測した身体負荷、消費エネルギー、疲労、傷害リスクとして説明しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-three-views", claimId: "COL-CLM-002", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["速度", "勾配", "cadence", "路面", "足部接地ほかA4 route入力"], relatedRoutes: ["Regional A4 endpoint-family routes", "coverage/status route"], relatedRegions: ["12部位"],
    allowedClaim: "各部位固有Reference 100、endpoint、算出状態、反映理由の読み方を説明する。",
    prohibitedClaim: "部位間順位、共通物理単位、傷害確率、危険度として読ませない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-six-eight-28", claimId: "COL-CLM-003", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["詳細身体記録", "左右", "程度", "気づいた時点"], relatedRoutes: ["self-report route", "Regional A4 separate display route"], relatedRegions: ["本人入力28領域", "Regional A4 12部位"],
    allowedClaim: "本人申告と走行条件モデルが異なる情報層であることを説明する。",
    prohibitedClaim: "一致・不一致から原因、診断、走行起因性を推定しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "rpe-separated", claimId: "COL-CLM-004", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-HADDAD"],
    relatedInputs: ["実走時間", "RPE"], relatedRoutes: ["session-RPE subjective route", "A4/V2.7 separation"], relatedRegions: ["なし（走行全体）"],
    allowedClaim: "RPEを本人の走行全体の感じ方として、走行事実モデルとは別に保存・表示する理由を説明する。",
    prohibitedClaim: "RPEを部位係数、健康判定、傷害予測へ変換しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "grade-and-coverage", claimId: "COL-CLM-005", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-MINETTI", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["上り割合", "下り割合", "代表勾配", "勾配把握状態"], relatedRoutes: ["V2.7 grade route", "Regional A4 grade routes", "supported-domain route"], relatedRegions: ["routeごとの対応部位"],
    allowedClaim: "区間割合、代表勾配、資料範囲、反映率を分けて扱う設計を説明する。",
    prohibitedClaim: "範囲外を端値へ丸めず、コース全変化や実測組織負荷として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "surface-missingness", claimId: "COL-CLM-006", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-YAMIN", "APP-COL-VOLOSHINA", "APP-COL-HORIGUCHI"],
    relatedInputs: ["路面性質", "路面の凹凸", "勾配", "足部接地"], relatedRoutes: ["surface and foot-strike explanatory route", "unknown route"], relatedRegions: ["足底部と下肢"],
    allowedClaim: "路面の硬さや凹凸、坂、足部接地により足底圧や身体の反応が異なるという研究知見を一般的に説明する。",
    prohibitedClaim: "路面名だけで個人の反応を決めず、障害原因や最適条件、走行可否を示さない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "personal-reference", claimId: "COL-CLM-007", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["比較signature", "過去の同一部位結果", "coverage", "model version"], relatedRoutes: ["directly comparable history route"], relatedRegions: ["本人が選択した同一部位"],
    allowedClaim: "適格な過去記録だけを用いる本人内比較の表示条件を説明する。",
    prohibitedClaim: "正常値、適応、危険な変化、因果関係として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "history-compatible", claimId: "COL-CLM-008", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["活動種別", "model version", "result state", "比較基準"], relatedRoutes: ["history compatibility route"], relatedRegions: ["選択した同一部位"],
    allowedClaim: "同一モデル版・同一比較条件だけを系列化し、空白や休養を0へ補完しないルールを説明する。",
    prohibitedClaim: "異なるモデル・部位・比較基準を同じ系列として比較しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "plan-preview-v27", claimId: "COL-CLM-009", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["予定距離", "予定コース条件"], relatedRoutes: ["plan preview route separated from completed records"], relatedRegions: ["予定表示で選択した部位"],
    allowedClaim: "予定値が完了記録とは別の比較材料であることを説明する。",
    prohibitedClaim: "結果予測、練習処方、実施の推奨、安全保証として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "consultation-prep-v27", claimId: "COL-CLM-010", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-LINTON"],
    relatedInputs: ["本人申告", "走行事実", "選択部位", "共有範囲"], relatedRoutes: ["deterministic consultation route"], relatedRegions: ["本人が明示選択した1部位"],
    allowedClaim: "本人入力、走行事実、モデル表示を分け、共有前に整理する方法を説明する。",
    prohibitedClaim: "診断、原因特定、走行可否、治療・練習処方を行わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "slope-endpoints", claimId: "COL-CLM-011", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["勾配", "速度", "cadence", "選択部位"], relatedRoutes: ["Regional A4 grade/speed/cadence endpoint routes"], relatedRegions: ["routeとendpointが対応する部位"],
    allowedClaim: "部位ごとに異なるendpointと資料条件を使うため、方向が一致しない場合があることを説明する。",
    prohibitedClaim: "endpoint間を共通単位で順位付けせず、直接測定された身体負荷と呼ばない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "model-limits-v27", claimId: "COL-CLM-012", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-LINTON", "APP-COL-VAN-HOOREN"],
    relatedInputs: ["全入力群", "欠測", "範囲外", "本人申告"], relatedRoutes: ["claim boundary", "unsupported-domain route", "information separation"], relatedRegions: ["12部位と別指標"],
    allowedClaim: "モデルの対応範囲、算出状態、非主張、本人入力との分離を説明する。",
    prohibitedClaim: "測定・診断・傷害確率・危険スコア・走行可否・因果推定を主張しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
]);

const ARTICLE_BY_ID = new Map(ARTICLE_EVIDENCE_REGISTRY.map((article) => [article.articleId, article]));

export function getSourceEvidenceGovernance(sourceId) {
  return SOURCE_BY_ID.get(String(sourceId || "")) || null;
}

export function getArticleEvidenceGovernance(articleId) {
  return ARTICLE_BY_ID.get(String(articleId || "")) || null;
}

export function buildArticleEvidenceGovernance(articleId, sources = []) {
  const governance = getArticleEvidenceGovernance(articleId);
  if (!governance) return null;
  const declaredSourceIds = sources.map((source) => String(source?.sourceId || "")).filter(Boolean);
  const missingSourceIds = governance.sourceIds.filter((sourceId) => !declaredSourceIds.includes(sourceId));
  return Object.freeze({
    ...governance,
    version: EVIDENCE_GOVERNANCE_VERSION,
    sourceRecords: Object.freeze(governance.sourceIds.map(getSourceEvidenceGovernance).filter(Boolean)),
    sourceIntegrity: Object.freeze({
      declaredSourceIds: Object.freeze(declaredSourceIds),
      missingSourceIds: Object.freeze(missingSourceIds),
      status: missingSourceIds.length ? "MISMATCH" : "PASS",
    }),
  });
}
