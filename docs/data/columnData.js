import { buildArticleEvidenceGovernance } from "./evidenceGovernanceData.js";

// RunLoadの利用者向け読みもの。
// 計算根拠の完全な追跡は研究成果物側で管理し、ここでは初心者が表示を
// 誤解しないために必要な範囲だけを説明する。

export const COLUMN_CATEGORIES = Object.freeze([
  "結果の読み方",
  "入力と振り返り",
  "走りとのつき合い方",
  "走る前・走っている間",
  "走った後の整え方",
  "部位・コース",
  "相談・共有",
]);

const PROJECT_V27 = Object.freeze({
  sourceId: "RUNLOAD-SPEC-CURRENT",
  title: "RunLoadの表示と比較の考え方",
  organization: "RunLoad研究プロジェクト",
  year: "2026",
  url: "",
  sourceType: "designSpecification",
  sourceTypeLabel: "アプリ内の説明",
  lastChecked: "2026-07-31",
});

const MINETTI_2002 = Object.freeze({
  sourceId: "APP-COL-MINETTI",
  title: "Energy cost of walking and running at extreme uphill and downhill slopes",
  organization: "Journal of Applied Physiology",
  year: "2002",
  url: "https://journals.physiology.org/doi/10.1152/japplphysiol.01177.2001",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究",
  lastChecked: "2026-07-31",
});

const VAN_HOOREN_2024 = Object.freeze({
  sourceId: "APP-COL-VAN-HOOREN",
  title: "Per-step and cumulative load at three common running injury locations: The effect of speed, surface gradient, and cadence",
  organization: "Scandinavian Journal of Medicine & Science in Sports",
  year: "2024",
  url: "https://onlinelibrary.wiley.com/doi/full/10.1111/sms.14570",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究",
  lastChecked: "2026-07-31",
});

const NUCKOLS_2020 = Object.freeze({
  sourceId: "APP-COL-NUCKOLS",
  title: "Mechanics of walking and running up and downhill: A joint-level perspective to guide design of lower-limb exoskeletons",
  organization: "PLOS ONE",
  year: "2020",
  url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0231996",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-07-31",
});

const YAMIN_2021 = Object.freeze({
  sourceId: "APP-COL-YAMIN",
  title: "Effects of Surface Stiffness on Plantar Pressure and Lower-Limb Muscle Activity during Running",
  organization: "BioMed Research International",
  year: "2021",
  url: "https://doi.org/10.1155/2021/8842591",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-05",
});

const VOLOSHINA_2015 = Object.freeze({
  sourceId: "APP-COL-VOLOSHINA",
  title: "Biomechanics and energetics of running on uneven terrain",
  organization: "Journal of Experimental Biology",
  year: "2015",
  url: "https://doi.org/10.1242/jeb.106518",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究",
  lastChecked: "2026-08-05",
});

const HORIGUCHI_2025 = Object.freeze({
  sourceId: "APP-COL-HORIGUCHI",
  title: "Effects of uphill and downhill running on plantar pressure distribution in different foot strike patterns",
  organization: "Frontiers in Sports and Active Living",
  year: "2025",
  url: "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1654489/full",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-05",
});

const HADDAD_2017 = Object.freeze({
  sourceId: "APP-COL-HADDAD",
  title: "Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors",
  organization: "Frontiers in Neuroscience",
  year: "2017",
  url: "https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full",
  sourceType: "reviewPaper",
  sourceTypeLabel: "レビュー・無料全文",
  lastChecked: "2026-07-31",
});

const LINTON_2025 = Object.freeze({
  sourceId: "APP-COL-LINTON",
  title: "Running-Centred Injury Prevention Support: A Scoping Review on Current Injury Risk Reduction Practices for Runners",
  organization: "Translational Sports Medicine",
  year: "2025",
  url: "https://doi.org/10.1155/tsm2/3007544",
  sourceType: "scopingReview",
  sourceTypeLabel: "スコーピングレビュー",
  lastChecked: "2026-07-31",
});

const BUIST_2008 = Object.freeze({
  sourceId: "APP-COL-BUIST",
  title: "No Effect of a Graded Training Program on the Number of Running-Related Injuries in Novice Runners: A Randomized Controlled Trial",
  organization: "The American Journal of Sports Medicine",
  year: "2008",
  url: "https://doi.org/10.1177/0363546507307505",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究",
  lastChecked: "2026-08-06",
});

const KRUKOWSKI_2024 = Object.freeze({
  sourceId: "APP-COL-KRUKOWSKI",
  title: "Impact of feedback generation and presentation on self-monitoring behaviors, dietary intake, physical activity, and weight: a systematic review and meta-analysis",
  organization: "International Journal of Behavioral Nutrition and Physical Activity",
  year: "2024",
  url: "https://doi.org/10.1186/s12966-023-01555-6",
  sourceType: "systematicReview",
  sourceTypeLabel: "システマティックレビュー・無料全文",
  lastChecked: "2026-08-06",
});

const KARAHANOGLU_2021 = Object.freeze({
  sourceId: "APP-COL-KARAHANOGLU",
  title: "How Are Sports-Trackers Used by Runners? Running-Related Data, Personal Goals, and Self-Tracking in Running",
  organization: "Sensors",
  year: "2021",
  url: "https://doi.org/10.3390/s21113687",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-06",
});

const JANSSEN_2020 = Object.freeze({
  sourceId: "APP-COL-JANSSEN",
  title: "Understanding Different Types of Recreational Runners and How They Use Running-Related Technology",
  organization: "International Journal of Environmental Research and Public Health",
  year: "2020",
  url: "https://doi.org/10.3390/ijerph17072276",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-06",
});

const WINTER_2020 = Object.freeze({
  sourceId: "APP-COL-WINTER",
  title: "A Multifactorial Approach to Overuse Running Injuries: A 1-Year Prospective Study",
  organization: "Sports Health",
  year: "2020",
  url: "https://doi.org/10.1177/1941738119888504",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究",
  lastChecked: "2026-08-06",
});

const BESOMI_2025 = Object.freeze({
  sourceId: "APP-COL-BESOMI",
  title: "Exploring contextual factors for management and prevention of running-related injuries: runners and experts’ perspectives",
  organization: "BMJ Open Sport & Exercise Medicine",
  year: "2025",
  url: "https://doi.org/10.1136/bmjsem-2024-002413",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-06",
});

const COOLDOWN_VAN_HOOREN_2018 = Object.freeze({
  sourceId: "APP-COL-COOLDOWN-VAN-HOOREN",
  title: "Do We Need a Cool-Down After Exercise? A Narrative Review of the Psychophysiological Effects and the Effects on Performance, Injuries and the Long-Term Adaptive Response",
  organization: "Sports Medicine",
  year: "2018",
  url: "https://link.springer.com/article/10.1007/s40279-018-0916-2",
  sourceType: "reviewPaper",
  sourceTypeLabel: "レビュー・無料全文",
  lastChecked: "2026-08-06",
});

const AFONSO_2021 = Object.freeze({
  sourceId: "APP-COL-AFONSO",
  title: "The Effectiveness of Post-exercise Stretching in Short-Term and Delayed Recovery of Strength, Range of Motion and Delayed Onset Muscle Soreness: A Systematic Review and Meta-Analysis of Randomized Controlled Trials",
  organization: "Frontiers in Physiology",
  year: "2021",
  url: "https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2021.677581/full",
  sourceType: "systematicReview",
  sourceTypeLabel: "システマティックレビュー・無料全文",
  lastChecked: "2026-08-06",
});

const HEW_BUTLER_2017 = Object.freeze({
  sourceId: "APP-COL-HEW-BUTLER",
  title: "Exercise-Associated Hyponatremia: 2017 Update",
  organization: "Frontiers in Medicine",
  year: "2017",
  url: "https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2017.00021/full",
  sourceType: "reviewPaper",
  sourceTypeLabel: "レビュー・無料全文",
  lastChecked: "2026-08-06",
});

const ARENT_2020 = Object.freeze({
  sourceId: "APP-COL-ARENT",
  title: "Nutrient Timing: A Garage Door of Opportunity?",
  organization: "Nutrients",
  year: "2020",
  url: "https://www.mdpi.com/2072-6643/12/7/1948",
  sourceType: "reviewPaper",
  sourceTypeLabel: "レビュー・無料全文",
  lastChecked: "2026-08-06",
});

const DOHERTY_2021 = Object.freeze({
  sourceId: "APP-COL-DOHERTY-SLEEP",
  title: "The Sleep and Recovery Practices of Athletes",
  organization: "Nutrients",
  year: "2021",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8072992/",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-06",
});

const GRUNDSTEIN_2019 = Object.freeze({
  sourceId: "APP-COL-GRUNDSTEIN-HEAT",
  title: "Influence of Race Performance and Environmental Conditions on Exertional Heat Stroke Prevalence Among Runners Participating in a Warm Weather Road Race",
  organization: "Frontiers in Sports and Active Living",
  year: "2019",
  url: "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2019.00042/full",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-06",
});

const JSPO_HEAT_GUIDANCE_2025 = Object.freeze({
  sourceId: "APP-GUIDE-JSPO-HEAT",
  title: "スポーツ活動中の熱中症予防ガイドブック",
  organization: "公益財団法人日本スポーツ協会",
  year: "2025",
  url: "https://www.japan-sports.or.jp/medicine/heatstroke/tabid523.html",
  sourceType: "publicGuidance",
  sourceTypeLabel: "公的資料",
  lastChecked: "2026-08-06",
});

const KWON_2023 = Object.freeze({
  sourceId: "APP-COL-KWON-TALK",
  title: "The talk test as a useful tool to monitor aerobic exercise intensity in healthy population",
  organization: "Journal of Exercise Rehabilitation",
  year: "2023",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10331140/",
  sourceType: "primaryStudy",
  sourceTypeLabel: "原著研究・無料全文",
  lastChecked: "2026-08-06",
});

function article(input) {
  return Object.freeze({
    ...input,
    tags: Object.freeze([...(input.tags || [])]),
    body: Object.freeze([...(input.body || [])]),
    practicePoints: Object.freeze([...(input.practicePoints || [])]),
    sources: Object.freeze([...(input.sources || [])]),
    evidenceGovernance: buildArticleEvidenceGovernance(input.id, input.sources || []),
    lastReviewed: "2026-08-06",
  });
}

export const COLUMN_ARTICLES = Object.freeze([
  article({
    id: "model-total-v27",
    title: "走行全体の比較用推定値で、何を見返せるか",
    category: "結果の読み方",
    tags: ["走行全体の比較用推定値", "距離", "勾配", "路面"],
    lead: "走った量とコース条件をまとめて振り返り、本人の記録どうしを比べるための参考値です。",
    summary: "長い距離を走った日と短い日、平坦な日と坂のある日では、走行の内容が違います。その違いを見返す手掛かりにします。",
    body: [
      "走行距離が増えれば、一般に走る動作を繰り返す回数や時間も増えます。また、上り・下りでは平坦路と比べて走り方や必要なエネルギーが変わることが研究で報告されています。",
      "路面の硬さや凹凸も、足の接地や身体の動かし方に関係します。そのため、数値だけを見るのではなく、距離・坂・路面など、その日の記録を一緒に見ることが大切です。",
      "この値は本人の記録を同じ意味で比べるための目安です。身体に加わった力や消費エネルギーを直接測った値ではありません。",
    ],
    practicePoints: [
      "値と一緒に、距離、時間、坂、路面を確認する。",
      "距離が大きく違う日は、まず走った量の違いを考える。",
      "分からない条件がある日は、分かっている範囲の目安として読む。",
    ],
    caution: "この値は実測した力、疲労、障害の有無や確率、走行可否を表しません。",
    sources: [PROJECT_V27, MINETTI_2002],
  }),
  article({
    id: "regional-three-views",
    title: "12部位の比較値をどう読むか",
    category: "結果の読み方",
    tags: ["部位別比較値", "走行量", "12部位", "基準100", "身体図"],
    lead: "走行距離と根拠付きで扱える走行条件を含めた比較値を、各部位自身の基準100と比べます。",
    summary: "12部位それぞれで100との差を見ます。別の部位との数値差を物理量の大小や順位として読みません。",
    body: [
      "坂の向き、走る速さ、足の運び方が変わると、関節の動き、筋肉の働き、足裏の圧のかかり方なども変わることが研究で報告されています。変化の仕方は部位ごとに同じではありません。",
      "この画面では、走行距離と根拠付きで扱える走行条件を含めた部位別比較値を、その部位自身の基準100と比べます。たとえば128なら、その部位の基準より28ポイント上です。膝の128と足裏の120を比べて、膝の負荷が大きいと判断することはできません。",
      "走行距離は部位別比較値に含まれます。歩数は条件を満たす場合だけ一部の部位でcadence情報として使い、根拠のない入力を一律の補正値として加えません。",
    ],
    practicePoints: [
      "各部位について、その部位自身の基準100との差を確認する。",
      "次に、距離・ペース・坂・路面など、保存した走行条件を一緒に確認する。",
      "過去比較があるときは、同じ意味で比べられる記録かを確認する。",
    ],
    caution: "この部位別比較値は実測した力、傷害確率、危険度、走行可否、部位間の物理的順位ではありません。基準100は安全値・正常値・初心者平均でもありません。",
    sources: [PROJECT_V27, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "regional-six-eight-28",
    title: "12部位の身体図と、本人の身体記録の違い",
    category: "結果の読み方",
    tags: ["身体図", "12部位", "身体記録", "本人の感覚"],
    lead: "12部位の比較値と、本人が選ぶ詳細な身体記録は目的が異なります。",
    summary: "身体図は走行条件と研究知見を照らして見る表示、身体記録は本人が感じたことをそのまま残す記録です。",
    body: [
      "12部位の身体図は、坂・ペース・歩数・路面などの記録と、研究で報告されている身体の使われ方を照らして見るための表示です。本人が痛みや疲れを感じた場所を示すものではありません。",
      "本人の身体記録では、感じた場所、左右、程度、気づいた時点を残せます。こちらは本人の感覚を記録するもので、12部位の比較値とは分けて表示します。",
      "2つの表示が同じ方向でも違っていても、それだけで原因は分かりません。気になったことがあれば、走った条件と本人の感覚を分けて残すと、あとで振り返りやすくなります。",
    ],
    practicePoints: [
      "身体図では、各部位自身の基準100との差を見る。",
      "身体記録では、感じた場所・程度・時点を自分の言葉で残す。",
      "2つが一致したかどうかだけで原因を決めない。",
    ],
    caution: "部位分類はアプリの情報設計であり、診断分類や普遍的な人体区分ではありません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "rpe-separated",
    title: "走り全体のきつさ（RPE）を別に見る理由",
    category: "入力と振り返り",
    tags: ["RPE", "走り全体のきつさ", "振り返り"],
    lead: "同じ距離やコースでも、本人が感じるきつさは毎回同じとは限りません。",
    summary: "RPEは、走り終えた本人が1回の走行全体をどれくらいきつく感じたかを0〜10で残す方法です。",
    body: [
      "RPEは、走り終えた本人が、この1回をどれくらいきつく感じたかを0〜10で記録する方法です。トレーニングの振り返りに広く使われています。",
      "同じ距離やコースでも、暑さ、睡眠、体調、走る速さなどによって感じ方が違うことがあります。そのため、走行条件の数値だけでなく、本人の感じ方も別に残す意味があります。",
      "履歴では、走行全体の参考値、部位ごとの表示、RPE、本人の身体記録を分けて見ます。似た条件の日に感じ方がどう違ったかを振り返る材料にできます。",
    ],
    practicePoints: [
      "RPEは走行全体を振り返って入力する。",
      "数値結果とRPEの一致・不一致を良し悪しへ変換しない。",
      "気になった背景は、睡眠や天候を断定せず本人メモへ残す。",
    ],
    caution: "RPEは部位の実測値、健康状態の判定、障害予測ではありません。",
    sources: [PROJECT_V27, HADDAD_2017],
  }),
  article({
    id: "grade-and-coverage",
    title: "上り・下りで身体の使われ方が変わる理由",
    category: "部位・コース",
    tags: ["上り", "下り", "坂道", "身体の使い方"],
    lead: "上り・下りでは、平坦路と比べて関節の動きや筋肉の働きが変わります。",
    summary: "同じ坂道でも、上りと下り、部位、走る速さによって身体の反応は同じではありません。",
    body: [
      "上りでは身体を持ち上げる動きが増え、下りでは着地しながら速度を調整する動きが増えます。研究でも、股関節・膝・足首の働き方が上りと下りで異なることが報告されています。",
      "膝、ふくらはぎ、足首などは、それぞれ違う役割を持ちます。そのため、上りだから全部位が上がる、下りだから全部位が下がる、という単純な関係ではありません。",
      "坂の傾きや区間の長さによっても走り方は変わります。記録するときは、コース全体のおおよその上り・下りと、分かる範囲の傾きを残すと振り返りやすくなります。",
    ],
    practicePoints: [
      "上りと下りを分けて記録する。",
      "坂の区間が短いか長いかも一緒に思い出す。",
      "部位の数値は、坂だけで決まるものとして読まない。",
    ],
    caution: "代表勾配はコースの全変化を再現するものではなく、部位表示は実際の筋・腱・関節力ではありません。",
    sources: [PROJECT_V27, MINETTI_2002, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "surface-missingness",
    title: "路面や足のつき方で、足元の使われ方が変わる理由",
    category: "部位・コース",
    tags: ["路面", "足裏", "足のつき方", "凹凸"],
    lead: "路面の硬さや凹凸、足のつき方によって、足裏の圧や身体の動かし方が変わることがあります。",
    summary: "路面名だけで決めつけず、硬さ、安定性、凹凸、乾湿など、実際の状態を一緒に見ることが大切です。",
    body: [
      "研究では、路面の硬さが変わると足裏の圧や下肢の筋活動が変わること、凹凸のある地面では平らな地面と比べて身体の安定を保つ動きが増えることが報告されています。",
      "上り・下りでは、かかと寄りか前足部寄りかといった足のつき方によっても、足裏の圧が分布する場所が変わることがあります。",
      "実際の路面は、同じ『舗装路』『天然芝』という名前でも状態が同じとは限りません。よく分からない場合は無理に決めず、分からないまま残すと、別の条件と取り違えずに振り返れます。",
    ],
    practicePoints: [
      "路面名だけでなく、硬さ・凹凸・乾湿を思い出す。",
      "自分の足のつき方が分からないときは、推測で選ばない。",
      "迷う条件は『不明』として残す。",
    ],
    caution: "路面による数値の違いは、個人の障害原因や、その路面を走ってよいかを示しません。",
    sources: [PROJECT_V27, YAMIN_2021, VOLOSHINA_2015, HORIGUCHI_2025],
  }),
  article({
    id: "personal-reference",
    title: "部位の前回比較は、いつ表示されるか",
    category: "入力と振り返り",
    tags: ["自分の過去記録", "過去比較", "同じ条件応答", "比較可能性"],
    lead: "同じ部位で、同じ意味の部位別比較値として直接比べられる以前の記録がある場合だけ表示します。",
    summary: "今回の部位別比較値を、同じ部位・同じ基準・同じ条件経路で比べられる直近の過去記録とだけ見比べます。",
    body: [
      "部位の部位別比較値は、同じ部位・同じ比較指標・同じ基準を保つ記録を比較候補にします。速度や勾配などの条件が違っても、その比較指標と基準が共通なら同じ座標上で比べられます。",
      "直接比べられる以前の記録があるときは、その中で直近の1件と今回の差を表示します。比べられる記録がなければ、無理に差を作らず理由を示します。",
      "この比較は正常値や理想値との比較ではありません。今回と以前の部位別比較値を同じ意味の範囲で振り返るための参考です。",
    ],
    practicePoints: [
      "部位別比較値を数値化できる場合は、その部位自身の基準100との関係も確認する。",
      "前回比較が出ないときは、比較できない理由と走行条件を確認する。",
      "前回より上でも下でも、それだけで良し悪しを決めない。",
    ],
    caution: "部位の前回比較は、正常範囲、身体の適応、障害リスク、原因を示しません。異なる条件経路どうしの数値を直接つなぎません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "history-compatible",
    title: "履歴で比べてよい記録・比べない記録",
    category: "入力と振り返り",
    tags: ["履歴", "過去比較", "未入力", "比べられない記録"],
    lead: "同じ意味で比べられる記録だけを、同じグラフに並べます。",
    summary: "休養、未記録、比較できない記録、数値なしを0で埋めず、線に含めない理由を表示します。",
    body: [
      "走っていない日、記録していない日、同じ意味で比べられない記録は、数値の0ではありません。グラフでは0として線をつながず、含めなかった理由を表示します。",
      "部位別の履歴では、選んだ部位・比較指標・基準・対象範囲の意味をそろえます。これらが異なる部位別比較値は途中でつなぎません。",
      "RPEと本人の身体記録は、数値結果とは別の記録です。並びを見て自己理解の材料にはできますが、一致や不一致から原因を自動判定しません。",
    ],
    practicePoints: [
      "グラフの部位名・基準・条件経路の意味を確認する。",
      "空白を0と読まず、線に含めなかった理由を確認する。",
      "書き出したデータでは、比べた記録の件数も一緒に確認する。",
    ],
    caution: "履歴の変化だけから身体状態、原因、障害の発生確率を推定しません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "plan-preview-v27",
    title: "走る予定と、実際の記録を分ける",
    category: "入力と振り返り",
    tags: ["プラン", "予定入力", "実績", "比較"],
    lead: "予定画面は、これから走る距離・時間・コース条件を整理する場所です。",
    summary: "予定値を処方や目標値にせず、保存した入力条件と実績を後から比べる材料にします。",
    body: [
      "走る前に分かるのは予定です。実際の歩数、走り全体のきつさ（RPE）、走行時間、コースの状態は、走ったあとで予定と違うことがあります。",
      "予定画面の参考値は、予定した走行全体を見返すためのものです。12部位の結果は、実際に走って記録を保存したあとに確認します。",
      "保存した予定は、その時点で考えていた内容として残ります。実際の記録と並べると、距離、時間、コース条件がどのように違ったかを振り返れます。",
    ],
    practicePoints: [
      "予定値には「予定入力による推定」と表示されているか確認する。",
      "予定はおすすめの練習メニューではなく、自分で考えた内容の記録として読む。",
      "走ったあとは、実際の歩数・RPE・走行時間を入力する。",
    ],
    caution: "予定値は最適な練習、達成可能性、身体状態、走行可否を示しません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "training-progression-no-universal-rule",
    title: "練習量に『毎週○％』という万能ルールはあるか",
    category: "走りとのつき合い方",
    tags: ["練習量", "10％ルール", "距離", "予定と実績"],
    lead: "毎週同じ割合で距離を増やせば、誰にでも安全になるという決まりは確認されていません。",
    summary: "一つの割合を正解にせず、予定と実績、その日の感じ方や背景を分けて見返すことが大切です。",
    body: [
      "初心者ランナーを対象とした研究では、練習量を毎週約10％ずつ増やす13週間のプログラムと、標準的なプログラムが比較されました。この研究では、段階的に増やしたグループでランニングに関連するけがが少なくなったとは確認されませんでした。",
      "これは、練習量を急に増やしてよいという意味ではありません。また、この研究だけから、10％を全員に当てはまる安全な増やし方とは言えません。",
      "ランナーへの支援をまとめた別の研究でも、取り組み方や結果には幅があり、一つの方法を全員へ当てはめることには注意が必要とされています。予定は守るべき正解ではなく、実際にどう走ったかを後で振り返るための記録として使えます。",
    ],
    practicePoints: [
      "予定どおり、変更、未実施のどれも事実として残す。",
      "割合だけでなく、距離、時間、回数、コースも分けて見る。",
      "次の予定は、直前の一回だけで決めず、自分の記録を見ながら考える。",
    ],
    caution: "この記事は、個人に合う増加率、けがを防ぐ方法、走ってよいかどうかを示しません。",
    sources: [BUIST_2008, LINTON_2025],
  }),
  article({
    id: "goals-and-recording-differ",
    title: "記録や目標の使い方は、人によって違う",
    category: "走りとのつき合い方",
    tags: ["記録", "目標", "振り返り", "ランニング用機器"],
    lead: "走る目的や、記録から知りたいことは、同じ人でも状況に応じて変わることがあります。",
    summary: "距離や連続日数だけを成功の基準にせず、自分が今知りたいことに合わせて記録を選びます。",
    body: [
      "ランニング用機器を使う人を調べた研究では、記録は走った事実を残すためにも、目標を考えて次の行動を選ぶためにも使われていました。また、本人の必要性、走る力、周囲の状況が変わると、目標も変わっていました。",
      "別の大規模調査でも、ランナーの考え方や関心、技術の使い方は同じではありませんでした。研究で分けられたタイプは、利用者を当てはめるための正解ではなく、人によって使い方が違うことを理解する材料です。",
      "自己記録とフィードバックをまとめた研究では、身体活動を支える可能性が示される一方、どの見せ方が最もよいかは一定していませんでした。記録が多いほどよいと決めず、今の目的に必要なものだけを見る方法もあります。",
    ],
    practicePoints: [
      "今の自分が覚えておきたいことを一つ選ぶ。",
      "目標が変わったら、以前の目標に無理に合わせない。",
      "記録しない日や休む日を、失敗や0点として扱わない。",
    ],
    caution: "この記事は、記録を続けたときの効果や、特定の目標・機器・アプリが他よりよいことを保証しません。",
    sources: [KARAHANOGLU_2021, JANSSEN_2020, KRUKOWSKI_2024],
  }),
  article({
    id: "context-not-single-cause",
    title: "走った日の背景を、一つの原因に決めない",
    category: "走りとのつき合い方",
    tags: ["生活背景", "環境", "個人差", "相談準備"],
    lead: "走った日の感じ方には、練習、過去の経験、生活や環境など、複数の背景が重なることがあります。",
    summary: "一つの記録だけで原因を決めず、分かっている事実と本人の感じ方を分けて残します。",
    body: [
      "ランナーを支える方法を整理した研究では、練習だけでなく、本人の状況や周囲からの支援などを含めて考える必要があり、一つの要因だけで全員を説明することは難しいとされています。",
      "1年間ランナーを追った研究でも、練習、過去の経験、身体的な特徴、走り方など複数の項目が検討されました。ただし、対象人数や調べ方に限界があり、個人の結果を正確に予測できる研究ではありませんでした。",
      "ランナーと専門家への聞き取りでは、経験や状況によって情報の受け取り方や行動が異なり、経験の少ない人が情報の確かさを判断しにくい場合も報告されています。これは、どれか一つを原因と決めるのではなく、分かる範囲の事実を整理する意味を示しています。",
      "天候、睡眠、生活背景、本人の感じ方は、それぞれ別の記録として残せます。何日かを見返すときも、同時に記録されていることだけで原因と結果を決めず、必要なら相談相手へ事実として共有します。",
    ],
    practicePoints: [
      "天候、睡眠、走った内容、本人の感じ方を別々に残す。",
      "一回だけの一致から、原因や良し悪しを決めない。",
      "相談するときは、推測より先に日付と記録した事実を伝える。",
    ],
    caution: "本人メモや数値から、原因、診断、けがの確率、走ってよいかどうかを推定する記事ではありません。",
    sources: [LINTON_2025, WINTER_2020, BESOMI_2025],
  }),
  article({
    id: "cooldown-stretching-limits",
    title: "クールダウンやストレッチで、できること・できないこと",
    category: "走った後の整え方",
    tags: ["クールダウン", "ストレッチ", "筋肉痛", "回復"],
    lead: "クールダウンやストレッチは、行えば必ず筋肉痛やけがを防げる方法ではありません。",
    summary: "目的や感じ方には違いがあります。回復への働きを一つに決めつけず、研究で確認された範囲と限界を分けて見ます。",
    body: [
      "運動後の軽い運動をまとめたレビューでは、翌日以降の運動成績や筋肉痛などへの効果は全体として小さいか、結果が一定していませんでした。また、クールダウンによってけがを防げることが確認されたわけではありません。",
      "運動後のストレッチを比べたシステマティックレビューでは、何もしないで休んだ場合と比べて、筋肉痛や筋力の戻り方が明らかに良くなるとは確認されませんでした。ただし、研究数や研究方法には限界があり、証拠の確かさはとても低いと評価されています。",
      "これらは、クールダウンやストレッチをしてはいけない、または全く意味がないという結論ではありません。気持ちの切り替えや本人の好みなど、回復効果とは別の目的もあります。行った内容と、その後にどう感じたかを分けて残すと振り返りやすくなります。",
    ],
    practicePoints: [
      "行った内容と、その後の本人の感じ方を別々に記録する。",
      "行ったかどうかだけを、その日の成功・失敗にしない。",
      "筋肉痛の有無だけで、次に走ってよいかを決めない。",
    ],
    caution: "この記事は、方法や時間を指定せず、治療効果、けがの予防、回復の保証、走行可否を示しません。",
    sources: [COOLDOWN_VAN_HOOREN_2018, AFONSO_2021],
  }),
  article({
    id: "hydration-not-more-is-better",
    title: "水分補給は、多いほどよいわけではない",
    category: "走った後の整え方",
    tags: ["水分補給", "発汗", "暑さ", "個人差"],
    lead: "走る前後や途中の水分補給は、全員が同じ量を飲めばよいものではありません。",
    summary: "走った時間や環境、本人の記録を分けて振り返り、飲んだ量の多さだけを良し悪しにしません。",
    body: [
      "汗のかき方や走る時間、気温などは人や日によって違います。そのため、全員に共通する一つの量だけで、水分補給の良し悪しを決めることはできません。",
      "長時間の運動などを扱ったレビューでは、のどの渇きを超えて飲み続けることが、運動に伴う低ナトリウム血症（血液中のナトリウム濃度が低くなる状態）の主な背景として整理されています。また、飲み過ぎを避ける考え方として、のどの渇きに応じて飲む方法が示されています。これは、全員に同じ量を示すものではありません。",
      "RunLoadには天候や食事・水分の自己記録を残せますが、必要な水分量や身体の水分状態を計算していません。何をどのくらい飲んだかは事実として残し、量の多さだけを安心や不足の判定に変えないことが大切です。",
    ],
    practicePoints: [
      "走った時間、天候、飲んだものを分けて記録する。",
      "本数や量だけを、水分が足りたかどうかの判定にしない。",
      "体調について気になることがある場合は、アプリで判断せず適切な相談先へ伝える。",
    ],
    caution: "この記事は、個人の水分量、電解質の取り方、脱水や飲み過ぎの判定、治療、走行可否を示しません。",
    sources: [HEW_BUTLER_2017],
  }),
  article({
    id: "post-run-food-timing-context",
    title: "走った後の食事は、早さだけで決まらない",
    category: "走った後の整え方",
    tags: ["食事", "栄養", "走った後", "個人差"],
    lead: "走った後の食事は、何分以内かだけでなく、走った内容や普段の食事も含めて考えます。",
    summary: "一つの短い時間帯を全員共通の正解にせず、運動の内容と一日の食事を分けて見ます。",
    body: [
      "栄養を取る時機についてまとめたレビューでは、運動前・運動中・運動後の食事は互いにつながっており、運動後の一つの短い時間だけで考えるものではないと整理されています。",
      "食事の時機がどれほど重要かは、運動の種類、強さ、長さ、回数や、次の運動までの間隔などによって変わります。同じ日に複数回運動する場合のように、短い時間での回復が必要な場面と、そうでない場面を同じに扱うことはできません。",
      "このレビューでは、一日の食事全体や運動内容が土台にあり、その上で食事の時機を考えるという見方が示されています。RunLoadの食事・水分メモは本人の記録であり、栄養状態や回復を評価するものではありません。",
    ],
    practicePoints: [
      "食べた内容と時刻を、良し悪しを付けずに記録する。",
      "次の運動までの間隔など、その日の予定も別に残す。",
      "早く食べたことや補助食品を使ったことだけを、よりよい回復と決めない。",
    ],
    caution: "この記事は、食事量、食品や補助食品、摂取時刻を個別に勧めず、栄養不足、回復効果、走行可否を判定しません。",
    sources: [ARENT_2020],
  }),
  article({
    id: "sleep-not-hours-only",
    title: "睡眠は、『何時間なら正解』だけで決めない",
    category: "走る前・走っている間",
    tags: ["睡眠", "睡眠時間", "睡眠の質", "本人の感じ方"],
    lead: "睡眠は、長さだけでなく、眠れた感じや普段との違いも分けて振り返ります。",
    summary: "一つの睡眠時間を全員共通の正解にせず、睡眠時間、眠りの質、眠る時間帯、本人の感じ方を別々の情報として見ます。",
    body: [
      "競技者338人を対象にした研究では、必要な睡眠時間には個人差があり、睡眠時間だけでなく、眠りの質や眠る時間帯も含めて考える必要があると説明されています。対象はさまざまな競技の競技者であり、初心者ランナー全員に同じ時間を示した研究ではありません。",
      "この研究では質問票や短期間の睡眠日誌が使われました。本人の記録は取り入れやすい一方、思い出し方による記録のずれもあります。そのため、一晩の記録だけで身体の回復や次の走りを決めることはできません。",
      "RunLoadの睡眠メモは、本人が覚えている事実や感じ方を残す欄です。睡眠の質や回復を計算するものではありません。『短かった』『途中で目が覚めた』『いつもと違った』のように分けて残すと、後から普段との違いを見返しやすくなります。",
    ],
    practicePoints: [
      "眠った時間と、眠れた感じを別々に記録する。",
      "他の人の時間ではなく、自分の普段の記録と比べる。",
      "一晩の記録だけで、原因や次に走ってよいかを決めない。",
    ],
    caution: "この記事は、睡眠障害、回復状態、治療、必要な睡眠時間、走行可否を判定または処方しません。",
    sources: [DOHERTY_2021],
  }),
  article({
    id: "heat-not-temperature-only",
    title: "暑い日の走りは、気温だけで判断しない",
    category: "走る前・走っている間",
    tags: ["暑さ", "気温", "暑さ指数", "WBGT", "天候"],
    lead: "暑さを考えるときは、気温だけでなく、湿度や日差し、走る内容なども関係します。",
    summary: "一つの気温だけで安全・危険を決めず、走る場所と時間の最新情報を別に確認します。",
    body: [
      "温暖な11.26kmのロードレースを15年間調べた研究では、気温だけではなく、湿度や日射などを含む暑さ指数（WBGT）と、参加者の平均ペースの両方が検討されました。特定の大会を後から振り返った研究のため、一緒に起きていたことは分かっても、個人の原因や安全を決めることはできません。",
      "日本スポーツ協会の案内でも、スポーツ時の暑さを考える指標としてWBGTが使われています。公式情報は更新されるため、走る前には、アプリ内の過去記録だけでなく、走る場所と時間の最新のWBGTや公的な案内を確認します。",
      "RunLoadには気温や天候のメモを残せますが、WBGTや暑さによる体調不良の可能性を計算していません。気温、天候、時間帯、日差しなどを分けて残すと、その日の環境を後から思い出しやすくなります。",
    ],
    practicePoints: [
      "走る場所と時間の最新のWBGTや公的な案内を、アプリとは別に確認する。",
      "気温、天候、時間帯、日差しの有無を分けて記録する。",
      "一つの気温や過去記録だけを、安全・危険の判定にしない。",
    ],
    caution: "この記事は、熱中症などの診断、個人の安全、必要な水分量、運動の中止・実施可否を判定しません。",
    sources: [GRUNDSTEIN_2019, JSPO_HEAT_GUIDANCE_2025],
  }),
  article({
    id: "talk-test-as-subjective-cue",
    title: "ペースが分からないときは、会話のしやすさも手掛かりになる",
    category: "走る前・走っている間",
    tags: ["ペース", "会話", "走るときのきつさ", "RPE", "本人の感じ方"],
    lead: "速度だけでなく、話しやすかったかどうかも、走っているときのきつさを振り返る手掛かりになります。",
    summary: "会話できる・話しにくいという本人の感覚を、速度や走り全体のきつさ（RPE）とは別の情報として扱います。",
    body: [
      "健康な成人17人がトレッドミル上で決まった文章を話した研究では、会話のしやすさを3段階で確認する方法と、呼吸や心拍などの測定値との間に関連が見られました。",
      "ただし、対象人数が少なく、平均年齢約27歳の健康な成人が実験室で行った研究です。会話のしやすさから、すべての初心者に共通する正確なペースや安全な強さを決めることはできません。",
      "会話のしやすさは本人の感覚であり、速度やRPEと同じ情報ではありません。『話しやすかった』『短い言葉なら話せた』『話しにくかった』などを本人メモに残し、同じ人の記録を何回か見返す手掛かりにできます。",
    ],
    practicePoints: [
      "走っている間の話しやすさを、自分の言葉で短く残す。",
      "速度、RPE、会話のしやすさを、それぞれ別の記録として見る。",
      "話せたかどうかだけで、安全・危険や目標ペースを決めない。",
    ],
    caution: "この記事は、心肺機能、病気、個人の目標ペース、走る強さ、走行可否を評価または処方しません。",
    sources: [KWON_2023],
  }),
  article({
    id: "consultation-prep-v27",
    title: "相談資料に入れるもの・入れないもの",
    category: "相談・共有",
    tags: ["相談準備", "本人入力", "比較基準", "共有"],
    lead: "入力した事実と本人の言葉を先に置き、数値には比較基準と限界を添えます。",
    summary: "相談相手が再確認できる情報をそろえ、順位・診断・原因推定は資料へ入れません。",
    body: [
      "相談資料には、日付、距離、実走時間、走り全体のきつさ（RPE）、把握した坂・路面、本人メモ、本人が選んだ身体部位を入れます。本人が感じたことと数値表示は別の欄にします。",
      "数値結果を入れる場合は、確認できた条件、選択した部位、100の意味、値が表す内容を明記します。自分の過去記録と比べる場合は、参照した件数と期間も添えます。",
      "部位の順位、障害名、原因、発生確率、危険度、走行してよいかという結論は自動で作りません。短文は本人が編集し、アプリから自動送信せず共有相手を本人が選びます。",
    ],
    practicePoints: [
      "相手に確認してほしいことを本人の言葉で1つ書く。",
      "標準資料は今回1件、詳細資料は同じ定義の最近の記録も含める。",
      "共有前に、見せたくないメモが含まれていないか確認する。",
    ],
    caution: "相談資料は記録整理であり、医学的評価や専門家の判断を代替しません。",
    sources: [PROJECT_V27, LINTON_2025],
  }),
  article({
    id: "slope-endpoints",
    title: "上りと下りで、部位表示の方向が違う理由",
    category: "部位・コース",
    tags: ["上り", "下り", "膝", "すね", "アキレス腱周辺"],
    lead: "上りと下りでは身体の役割が変わり、その変化も部位ごとに同じではありません。",
    summary: "股関節、膝、足首、アキレス腱周辺などは走るときの役割が違うため、同じ坂でも表示が別の方向へ動くことがあります。",
    body: [
      "上りでは身体を前上方へ運ぶため、股関節や足首の働き方が平坦路とは変わります。下りでは着地の衝撃を受け止めながら速度を調整する動きが増えます。",
      "速度、坂の傾き、歩数の違いによって、膝前面、アキレス腱周辺、足底周辺への繰り返しのかかり方が変わることも報告されています。",
      "研究ごとに調べた部位や条件が違うため、12部位は同じ単位で測った順位ではありません。部位別比較値を数値化できる部位では、その部位自身の基準100との差と、その日の走行条件を一緒に見ます。数値化できない部位は数値なしのまま確認します。",
    ],
    practicePoints: [
      "部位詳細画面で、その部位が何を表すかを確認する。",
      "数値だけでなく、坂・ペース・歩数も一緒に見る。",
      "上り・下りの一つの結果を、障害名や原因へ結びつけない。",
    ],
    caution: "研究値は個人の筋・腱・関節力の実測や障害予測ではなく、RunLoadはその限定された相対変化だけを利用します。",
    sources: [PROJECT_V27, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "model-limits-v27",
    title: "この表示が言えること・言えないこと",
    category: "相談・共有",
    tags: ["非主張", "限界", "多因子", "自己判断"],
    lead: "入力条件の違いを見返す道具であり、身体や障害を判定する道具ではありません。",
    summary: "数値を身体の測定値と思わず、走行記録を振り返るための目安として使うことが大切です。",
    body: [
      "RunLoadは、距離、時間、坂、路面、歩数など、本人が入力した走行記録を振り返るための表示です。似た意味の記録どうしを比べる手掛かりになります。",
      "実際に筋肉・腱・関節へ加わった力を測っているわけではありません。診断、障害の有無や確率、原因、走ってよいかどうかも示しません。",
      "ランニング中の身体の状態には、トレーニングだけでなく、休養、体調、環境など多くのことが関わります。数値と本人の感覚が並んでいても、一方がもう一方の原因だとは限りません。",
    ],
    practicePoints: [
      "値が表す内容、100の意味、その日の条件をセットで読む。",
      "本人入力は数値結果を証明せず、数値結果も本人の感覚を否定しない。",
      "分からない条件は、推測で埋めずにそのまま残す。",
    ],
    caution: "アプリの表示を医療判断、障害予防の保証、個別の練習処方へ使用しません。",
    sources: [PROJECT_V27, LINTON_2025, VAN_HOOREN_2024],
  }),
]);
