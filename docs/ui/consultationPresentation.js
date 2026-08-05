import {
  V27_MODEL_VERSION,
  V27_REGIONAL_VIEW_IDS,
} from "../core/model/v27/v27Constants.js";
import { createV27PlanPreview } from "../core/planning/planPreviewV27.js";
import { escapeHtml, renderStatusLabel } from "./commonComponents.js";
import {
  buildHistoryWorkspace,
  historyRegionalValue,
  normalizeHistoryRegionId,
  normalizeHistoryViewId,
} from "./historyPresentation.js";
import {
  buildPlanConditionSnapshot,
  normalizePlanSession,
} from "./planPresentation.js";
import { bodyRegionPlainMeaning } from "./bodyRegionTerminology.js";
import {
  SAFETY_FLAG_LABELS,
  SUBJECTIVE_STATUS_LABELS,
  formatLocalDate,
  formatNumber,
} from "./recordPresentation.js";

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function percentage(value) {
  return hasFiniteValue(value) ? `${Math.round(Number(value) * 100)}%` : "—";
}

function surfaceLabel(value) {
  return {
    REF_HARD_EVEN_STABLE: "硬く平らで安定した基準路面",
    DRY_STABLE_GRASS_TURF: "乾いた安定した芝",
    DEEP_DRY_SOFT_SAND: "深く乾いた柔らかい砂",
    EXPLICIT_UNEVEN: "明確な凹凸・不整地（説明のみ）",
    KNOWN_OTHER: "把握済み・記録のみ",
    UNKNOWN: "不明",
  }[value] || "不明";
}

function gradeLabel(course = {}) {
  if (course.gradeKnowledge === "KNOWN_FLAT") return "平坦と把握";
  if (course.gradeKnowledge !== "KNOWN_PROFILE") return "不明";
  const values = [];
  if (Number(course.upPercent || 0) > 0) {
    values.push(`上り${formatNumber(course.upPercent, 1)}%区間・勾配${formatNumber(course.upGradePercent, 1)}%`);
  }
  if (Number(course.downPercent || 0) > 0) {
    values.push(`下り${formatNumber(course.downPercent, 1)}%区間・勾配${formatNumber(course.downGradePercent, 1)}%`);
  }
  const flat = 100 - Number(course.upPercent || 0) - Number(course.downPercent || 0);
  if (flat > 0) values.unshift(`平坦${formatNumber(flat, 1)}%区間`);
  return values.join("・") || "把握済みプロファイル";
}

function runningFormatLabel(value) {
  return {
    CONTINUOUS_RUN: "連続走",
    RUN_WALK: "走りと歩きを併用",
    UNKNOWN: "未設定",
  }[value] || "未設定";
}

function stepsSourceLabel(value) {
  return {
    DEVICE_MEASURED: "端末・時計で計測",
    DEVICE_SYNCED: "端末から取り込み",
    ESTIMATED: "推定・手入力",
    UNKNOWN: "取得方法は未設定",
  }[value] || "取得方法は未設定";
}

function planPreview(plan = {}) {
  if (plan.previewSnapshot?.modelVersion === V27_MODEL_VERSION) {
    return plan.previewSnapshot;
  }
  return createV27PlanPreview({
    session: plan.plannedSession || {},
    scheduledDate: plan.scheduledDate || "",
    previewId: `consultation-plan-${plan.id || "preview"}`,
  });
}

export function createPlanShareMemo(_services, plan) {
  if (!plan) return "";
  const preview = planPreview(plan);
  const session = normalizePlanSession(plan.plannedSession || {});
  const snapshot = buildPlanConditionSnapshot(session, {
    totalLoad: preview.state === "RUN" ? preview.result?.total?.central_points : null,
  });
  const values = Object.fromEntries(snapshot.rows.map((row) => [row.key, row.value]));
  const lines = [
    `${formatLocalDate(plan.scheduledDate)}の予定について相談したいです。`,
    `予定：${plan.title || (session.activityType === "rest" ? "休養予定" : "走行予定")}`,
  ];
  if (session.activityType === "rest") {
    lines.push("内容：休養予定");
  } else {
    lines.push(
      `距離：${values.distance}`,
      `実走予定時間：${values.duration}`,
      `走行形式：${values.runningFormat}`,
      `コース名：${values.courseName}`,
      `坂道：${values.grade}`,
      `路面：${values.surface}`,
    );
    if (preview.ok && preview.state === "RUN") {
      lines.push(`予定条件の比較用推定値：${formatNumber(preview.result?.total?.central_points, 1)}推定ポイント`);
    } else {
      lines.push(`推定表示：${preview.message || "入力条件を確認"}`);
    }
  }
  if (plan.memo) lines.push(`予定メモ：${plan.memo}`);
  lines.push("予定値は予定入力からの推定で、処方、最適条件、身体状態、走行可否を示しません。");
  return lines.join("\n");
}

function conditionRows(record = {}) {
  if (record.activityType === "rest") {
    return [
      ["記録の種類", "休養"],
      ["走行条件", "なし"],
    ];
  }
  const course = record.course || {};
  return [
    ["距離", hasFiniteValue(record.distanceKm) ? `${formatNumber(record.distanceKm, 2)} km` : "未入力"],
    ["実走時間", hasFiniteValue(record.durationMinutes) ? `${formatNumber(record.durationMinutes, 1)} 分` : "未入力"],
    ["走行形式", runningFormatLabel(record.runningFormat)],
    ["歩数", Number(record.steps) > 0 ? `${formatNumber(record.steps, 0)} 歩（${stepsSourceLabel(record.stepsProvenance)}）` : "未入力"],
    ["走り全体のきつさ（RPE）", hasFiniteValue(record.perceivedExertion) ? `${formatNumber(record.perceivedExertion, 0)} / 10` : "未入力"],
    ["コース名", course.name || "未設定"],
    ["坂道", gradeLabel(course)],
    ["路面", surfaceLabel(course.modelSurfaceClass)],
  ];
}

function subjectiveRows(report = {}) {
  const rows = [];
  report.exactBodyObservations?.forEach((item) => {
    const values = [];
    if (item.lateralityLabel) values.push(item.lateralityLabel);
    if (item.intensity != null) values.push(`程度 ${item.intensity}/5`);
    if (item.sensation) values.push(item.sensation);
    rows.push([item.label, values.join("・") || "本人入力あり"]);
  });
  report.subjectiveParts?.forEach((item) => {
    const values = [];
    if (item.fatigue > 0) values.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (item.discomfort > 0) values.push(`気になる感じ ${item.discomfort}/5`);
    rows.push([item.label, values.join("・") || "確認済み"]);
  });
  return rows.length
    ? rows
    : [["入力状況", SUBJECTIVE_STATUS_LABELS[report.subjectiveStatus] || "部位入力なし"]];
}

function personalRows(report = {}) {
  return report.personalContextItems?.map((item, index) => [
    `今日の走り${index + 1}`,
    item,
  ]) || [];
}

function rowsMarkup(rows, className = "report-fact-list") {
  return `<dl class="${escapeHtml(className)}">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function reportSection({ id, kicker, title, body, className = "" }) {
  return `<section class="report-section${className ? ` ${escapeHtml(className)}` : ""}" aria-labelledby="${escapeHtml(id)}"><div class="report-section__heading"><p>${escapeHtml(kicker)}</p><h2 id="${escapeHtml(id)}">${escapeHtml(title)}</h2></div>${body}</section>`;
}

export function buildReportPresentation({
  services,
  experience,
  regionId = "",
  viewId = "",
}) {
  const settings = services.storage.settings.load() || {};
  const selectedRegionId = normalizeHistoryRegionId(regionId || settings.selectedHistoryRegionId);
  const selectedViewId = normalizeHistoryViewId(
    viewId || settings.selectedRegionalView || settings.selectedHistoryRegionalView,
  );
  const allExperiences = services.workflows.records.loadAllExperiences();
  const options = { regionId: selectedRegionId, viewId: selectedViewId };
  const report = services.consultation.buildConsultationReport(
    experience,
    allExperiences,
    options,
  );
  const history = buildHistoryWorkspace({
    services,
    anchorRecordId: experience.record.id,
    anchorDate: experience.record.date,
    period: 28,
    regionId: selectedRegionId,
    viewId: selectedViewId,
  });
  return Object.freeze({
    experience,
    report,
    history,
    selectedRegionId,
    selectedViewId,
    copy: Object.freeze({
      standard: services.consultation.createStandardConsultationText(report),
      detailed: services.consultation.createDetailedConsultationText(report),
    }),
  });
}

function reportHeader({ presentation, format }) {
  const { report } = presentation;
  const priority = report.supportRoute === "consult" || report.supportRoute === "urgent";
  const statusLabel = report.supportRoute === "urgent" ? "公的な窓口も確認" : priority ? "本人入力を先に確認" : "今回の記録";
  return `<header class="report-sheet__header"><div><p>${format === "detailed" ? "DETAILED REPORT / 期間まとめ" : "STANDARD REPORT / 今回の記録"}</p><h2 class="report-sheet__title">${priority ? "相談用レポート" : "共有用レポート"}</h2><p>${escapeHtml(formatLocalDate(report.date))}・${escapeHtml(report.activity)}</p></div>${renderStatusLabel(statusLabel, priority ? "attention" : "info")}</header>`;
}

function subjectiveSection(presentation) {
  const { report } = presentation;
  const personal = personalRows(report);
  const note = report.consultationNote
    ? `<div class="report-free-note"><strong>本人が聞きたいこと</strong><p>${escapeHtml(report.consultationNote)}</p></div>`
    : "";
  const flags = report.conditionFlags?.length
    ? `<div class="report-free-note"><strong>本人が選択した体調情報</strong><ul>${report.conditionFlags.map((flag) => `<li>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</li>`).join("")}</ul></div>`
    : "";
  return reportSection({
    id: "report-subjective-title",
    kicker: "01 / 本人入力",
    title: "本人が入力した身体記録",
    className: "report-section--subjective",
    body: `${personal.length ? `<div class="report-free-note"><strong>シューズと走り方のメモ</strong>${rowsMarkup(personal, "report-fact-list report-fact-list--personal")}</div>` : ""}${rowsMarkup(subjectiveRows(report))}${flags}${note}`,
  });
}

function recordSection(presentation) {
  return reportSection({
    id: "report-record-title",
    kicker: "02 / 走行事実",
    title: "今回入力した条件",
    body: rowsMarkup(conditionRows(presentation.experience?.record || {})),
  });
}

function regionalValueMarkup(regional = {}) {
  if (regional.state === "BUILDING_REFERENCE") {
    return `<strong>基準作成中 ${escapeHtml(String(regional.eligibleN || 0))}/3</strong>`;
  }
  if (!hasFiniteValue(regional.value)) {
    return `<strong>数値なし</strong><small>この条件では表示できません</small>`;
  }
  const range = regional.showRange
    && Array.isArray(regional.range)
    && regional.range.every(hasFiniteValue)
    ? `<small>範囲 ${escapeHtml(formatNumber(regional.range[0], 0))}–${escapeHtml(formatNumber(regional.range[1], 0))}</small>`
    : "";
  return `<strong>${escapeHtml(formatNumber(regional.value, 0))}</strong>${range}`;
}

function modelSection(presentation) {
  const model = presentation.report.modelReference;
  if (model.state === "REST") {
    return reportSection({
      id: "report-model-title",
      kicker: "03 / 数値結果",
      title: "走行推定値なし",
      body: "<p>休養記録には、走行による走行全体の比較用推定値と部位ごとの負荷傾向指数を作成しません。</p>",
    });
  }
  if (model.state !== "RUN") {
    return reportSection({
      id: "report-model-title",
      kicker: "03 / 数値結果",
      title: "比較値なし",
      body: "<p>この保存記録では、走行全体の比較用推定値を表示できません。</p>",
    });
  }
  const total = model.total;
  const regional = model.regional;
  const totalRange = total.showRange
    && Array.isArray(total.range)
    ? `<small>範囲 ${escapeHtml(formatNumber(total.range[0], 1))}–${escapeHtml(formatNumber(total.range[1], 1))}</small>`
    : "";
  const personalDetail = regional.viewId === V27_REGIONAL_VIEW_IDS.personal
    && regional.eligibleN >= 3
    ? `<p>適格な過去${escapeHtml(String(regional.eligibleN))}件${regional.firstDate && regional.lastDate ? `（${escapeHtml(regional.firstDate)}〜${escapeHtml(regional.lastDate)}）` : ""}。今回の記録は基準から除外。</p>`
    : "";
  return reportSection({
    id: "report-model-title",
    kicker: "03 / 数値結果",
    title: "走行全体の比較用推定値と部位ごとの負荷傾向指数",
    body: `<div class="report-model-total"><span>走行全体の比較用推定値</span><strong>${escapeHtml(formatNumber(total.central, 1))}</strong><em>推定ポイント</em>${totalRange}<p>確認できた勾配区間 ${escapeHtml(percentage(total.gradeCoverage))}・確認できた路面区間 ${escapeHtml(percentage(total.surfaceCoverage))}</p></div>
      <div class="report-model-total"><span>${escapeHtml(regional.regionLabel)}</span>${regionalValueMarkup(regional)}<em>${escapeHtml(regional.viewLabel)}</em><p>${escapeHtml(regional.reference)}</p>${personalDetail}</div>
      ${rowsMarkup([
        ["この部位の表示が表すこと", bodyRegionPlainMeaning(regional.regionId)],
        ["部位表示で確認できた勾配", percentage(regional.gradeCoverage)],
        ["比較表示", model.modelVersion ? "利用できます" : "利用できません"],
      ], "report-fact-list report-fact-list--model")}
      <p class="report-print-note">部位の相対表示は身体全体の100%配分ではなく、各部位の実際の力を測定したものでもありません。</p>`,
  });
}

function notesSection(presentation) {
  const memo = presentation.experience?.record?.memo || "";
  if (!memo && !presentation.report.consultationNote) return "";
  const rows = [];
  if (memo) rows.push(["記録メモ", memo]);
  if (presentation.report.consultationNote) {
    rows.push(["相談したいこと", presentation.report.consultationNote]);
  }
  return reportSection({
    id: "report-notes-title",
    kicker: "04 / 自由記述",
    title: "本人が残した文章",
    body: rowsMarkup(rows, "report-notes-list"),
  });
}

function printableStatus(row = {}) {
  if (row.status === "run") return row.legacy ? "走行（比較値なし）" : "走行";
  if (row.status === "rest") return "休養";
  return "未記録";
}

function detailedHistorySection(presentation) {
  const workspace = presentation.history;
  if (!workspace) return "";
  const rows = [...workspace.rows].slice(-14);
  return `<section class="report-period-section report-period-section--printable" aria-labelledby="report-period-title"><div class="report-section__heading"><p>05 / 最近の流れ</p><h2 id="report-period-title">同じ定義で見た最近の記録</h2><span>${escapeHtml(formatLocalDate(workspace.startDate))}〜${escapeHtml(formatLocalDate(workspace.endDate))}</span></div>
    <p><strong>${escapeHtml(workspace.selectedRegion.label)}／${escapeHtml(workspace.selectedView.label)}</strong><br>${escapeHtml(workspace.selectedView.reference)}</p>
    <div class="report-period-summary"><div><strong>${escapeHtml(String(workspace.counts.run))}日</strong><span>走行</span></div><div><strong>${escapeHtml(String(workspace.counts.rest))}日</strong><span>休養</span></div><div><strong>${escapeHtml(String(workspace.counts.missing))}日</strong><span>未記録</span></div><div><strong>${escapeHtml(String(workspace.counts.checked))}件</strong><span>本人入力確認</span></div></div>
    <table class="report-period-table"><thead><tr><th>日付</th><th>状態</th><th>走行全体の比較用推定値</th><th>${escapeHtml(workspace.selectedRegion.label)}</th><th>RPE</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.date.slice(5).replace("-", "/"))}</td><td>${escapeHtml(printableStatus(row))}</td><td>${row.totalLoad == null ? "—" : escapeHtml(formatNumber(row.totalLoad, 1))}</td><td>${row.regionalValue == null ? "—" : escapeHtml(formatNumber(row.regionalValue, 0))}</td><td>${row.rpe == null ? "—" : escapeHtml(formatNumber(row.rpe, 0))}</td></tr>`).join("")}</tbody></table>
    <p class="report-print-note">空欄・休養・比較できない記録を0として扱っていません。本人入力と数値表示は別の列です。</p>
  </section>`;
}

export function renderReportSheet({ presentation, format = "standard" }) {
  return `<article class="report-sheet report-sheet--${escapeHtml(format)}" data-report-sheet data-report-format="${escapeHtml(format)}">
    ${reportHeader({ presentation, format })}
    ${subjectiveSection(presentation)}
    ${recordSection(presentation)}
    ${modelSection(presentation)}
    ${notesSection(presentation)}
    ${format === "detailed" ? detailedHistorySection(presentation) : ""}
    <footer class="report-sheet__boundary"><strong>この資料の範囲</strong><p>本人入力と数値表示は別の情報です。数値表示は走行記録を比べるための参考で、筋肉・腱・関節に加わった実際の力、診断、障害予測、原因、走行可否、安全保証を示しません。共有する範囲と相手は本人が選びます。</p></footer>
  </article>`;
}

export function createReportCopyText({ presentation, format = "standard" }) {
  const coreText = format === "detailed"
    ? presentation.copy.detailed
    : presentation.copy.standard;
  if (format !== "detailed" || !presentation.history) return coreText;
  const workspace = presentation.history;
  const recentLines = [...workspace.rows]
    .slice(-14)
    .filter((row) => row.status !== "missing")
    .map((row) => {
      const total = row.totalLoad == null ? "—" : formatNumber(row.totalLoad, 1);
      const regional = row.regionalValue == null ? "—" : formatNumber(row.regionalValue, 0);
      const rpe = row.rpe == null ? "—" : formatNumber(row.rpe, 0);
      return `- ${row.date}：${printableStatus(row)}／走行全体 ${total}／${workspace.selectedRegion.label} ${regional}／RPE ${rpe}`;
    });
  return [
    coreText,
    "",
    `表示定義：${workspace.selectedRegion.label}／${workspace.selectedView.label}／${workspace.selectedView.reference}`,
    "直近14日内の保存記録：",
    ...(recentLines.length ? recentLines : ["- 対象記録なし"]),
  ].join("\n");
}

export function selectedReportRegionalValue(presentation) {
  return historyRegionalValue(
    presentation?.experience,
    presentation?.selectedRegionId,
    presentation?.selectedViewId,
  );
}
