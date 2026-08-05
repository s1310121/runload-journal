import { buildArticleEvidenceGovernance } from "./evidenceGovernanceData.js";

// RunLoadの利用者向け読みもの。
// 計算根拠の完全な追跡は研究成果物側で管理し、ここでは初心者が表示を
// 誤解しないために必要な範囲だけを説明する。

export const COLUMN_CATEGORIES = Object.freeze([
  "結果の読み方",
  "入力と振り返り",
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
  title: "Running-Centred Injury Prevention Support: A Scoping Review on Current Injury Context Reduction Practices for Runners",
  organization: "Translational Sports Medicine",
  year: "2025",
  url: "https://doi.org/10.1155/tsm2/3007544",
  sourceType: "scopingReview",
  sourceTypeLabel: "スコーピングレビュー",
  lastChecked: "2026-07-31",
});

function article(input) {
  return Object.freeze({
    ...input,
    tags: Object.freeze([...(input.tags || [])]),
    body: Object.freeze([...(input.body || [])]),
    practicePoints: Object.freeze([...(input.practicePoints || [])]),
    sources: Object.freeze([...(input.sources || [])]),
    evidenceGovernance: buildArticleEvidenceGovernance(input.id, input.sources || []),
    lastReviewed: "2026-08-05",
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
    title: "12部位の負荷傾向指数をどう読むか",
    category: "結果の読み方",
    tags: ["部位ごとの負荷傾向指数", "12部位", "基準100", "身体図"],
    lead: "12部位それぞれを、その部位固有の表示上の基準100と比較します。",
    summary: "100より上か下かを部位ごとに見ます。別の部位との順位を表す数字ではありません。",
    body: [
      "坂の向き、走る速さ、足の運び方が変わると、関節の動き、筋肉の働き、足裏の圧のかかり方なども変わることが研究で報告されています。変化の仕方は部位ごとに同じではありません。",
      "この画面では、各部位の基準を100として今回の傾向を示します。たとえば128なら、その部位の基準より28ポイント上です。膝の128と足裏の120を比べて、膝の負荷が大きいと判断することはできません。",
      "記録だけでは表示できない部位もあります。その場合は無理に数字を補わず、表示できない理由を示します。",
    ],
    practicePoints: [
      "まず、その部位が100より上か下かを確認する。",
      "次に、坂・ペース・歩数・路面など、その日の条件を見る。",
      "過去比較があるときは、同じ意味で比べられる記録かを確認する。",
    ],
    caution: "この指数は実測値、傷害確率、危険度、走行可否、部位間の物理的順位ではありません。",
    sources: [PROJECT_V27, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "regional-six-eight-28",
    title: "12部位の身体図と、本人の身体記録の違い",
    category: "結果の読み方",
    tags: ["身体図", "12部位", "身体記録", "本人の感覚"],
    lead: "12部位の数値結果と、本人が選ぶ詳細な身体記録は目的が異なります。",
    summary: "身体図は走行条件と研究知見を照らして見る表示、身体記録は本人が感じたことをそのまま残す記録です。",
    body: [
      "12部位の身体図は、坂・ペース・歩数・路面などの記録と、研究で報告されている身体の使われ方を照らして見るための表示です。本人が痛みや疲れを感じた場所を示すものではありません。",
      "本人の身体記録では、感じた場所、左右、程度、気づいた時点を残せます。こちらは本人の感覚を記録するもので、12部位の数値とは分けて表示します。",
      "2つの表示が同じ方向でも違っていても、それだけで原因は分かりません。気になったことがあれば、走った条件と本人の感覚を分けて残すと、あとで振り返りやすくなります。",
    ],
    practicePoints: [
      "身体図では、部位ごとの100との差を見る。",
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
      "実際の路面は、同じ『舗装路』『芝』という名前でも状態が同じとは限りません。よく分からない場合は無理に決めず、分からないまま残すと、別の条件と取り違えずに振り返れます。",
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
    title: "自分の過去記録との比較は、いつから表示されるか",
    category: "入力と振り返り",
    tags: ["自分の過去記録", "過去比較", "中央値", "個人差"],
    lead: "同じ意味で比べられる過去記録が3件以上あるときに表示します。",
    summary: "今回だけを単独で見るのではなく、似た条件で記録した自分自身の過去と比べるための表示です。",
    body: [
      "人によって普段の距離、ペース、コースは違います。そのため、自分の記録を振り返るときは、同じ部位・同じ基準など、同じ意味で比べられる過去記録を使います。",
      "比べられる過去記録が3件未満のときは表示しません。3〜5件では『少ない記録での参考』、6件以上では『過去記録との比較』として、使った件数と期間も一緒に示します。",
      "比較には過去記録の真ん中にあたる値を使います。これは正常値や理想値ではなく、今回が自分の過去と比べてどうだったかを見るための目安です。",
    ],
    practicePoints: [
      "過去記録が少ない間は、今回の100との差と走行条件を見る。",
      "件数と参照期間を値と一緒に確認する。",
      "過去より上でも下でも、それだけで良し悪しを決めない。",
    ],
    caution: "自分の過去記録との比較は、正常範囲、身体の適応、障害リスク、原因を示しません。",
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
      "部位別の履歴では、選んだ部位と100の意味をそろえます。別の部位や別の基準を途中で混ぜないためです。",
      "RPEと本人の身体記録は、数値結果とは別の記録です。並びを見て自己理解の材料にはできますが、一致や不一致から原因を自動判定しません。",
    ],
    practicePoints: [
      "グラフの部位名と100の意味を確認する。",
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
      "研究ごとに調べた部位や条件が違うため、12部位は同じ単位で測った順位ではありません。それぞれの部位について、100との差と、その日の走行条件を一緒に見ます。",
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
