import { BODY_PARTS, SURFACE_FIELDS } from "../core/model/modelConstants.js";
import { BODY_AREA_TAXONOMY } from "../core/model/v27/bodyAreaTaxonomy.js";
import { SAFETY_FLAG_KEYS } from "../core/safety/supportDecision.js";
import { reportedRpeValue } from "../core/safety/rpeProvenance.js";
import { escapeHtml, renderPageHeading, renderScreenGuide, renderStatusLabel } from "../ui/commonComponents.js";
import { subjectiveFieldsFromFeedback, subjectiveSummaryFromFields } from "../ui/subjectivePresentation.js";
import { PERSONAL_CONTEXT_FIELD_NAMES, personalContextFieldsFromRecord, personalContextSummary } from "../ui/personalContextPresentation.js";
import { renderCourseSummary } from "../ui/coursePresentation.js";
import { bodyPartKey, formatLocalDate } from "../ui/recordPresentation.js";
import { HIERARCHICAL_EXPLANATION_VERSION, INPUT_PURPOSE_GUIDANCE } from "../ui/hierarchicalExplanation.js";

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function selected(value, expected) {
  return String(value ?? "") === String(expected) ? " selected" : "";
}

function checked(value) {
  return value ? " checked" : "";
}

function hasDetailedCourse(course = {}) {
  if (course.name) return true;
  if (String(course.gradeKnowledge || "UNKNOWN") !== "UNKNOWN") return true;
  if (String(course.modelSurfaceClass || "UNKNOWN") !== "UNKNOWN") return true;
  if (["upPercent", "downPercent", "upGradePercent", "downGradePercent"].some((key) => Number(course[key] || 0) > 0)) return true;
  return SURFACE_FIELDS.some(({ recordKey }) => Number(course[recordKey] || 0) > 0);
}


function renderPlanCourseLibrarySaveOption(course = {}, { fromPlan = false, isRest = false } = {}) {
  if (!fromPlan || isRest || !String(course.name || "").trim()) return "";
  return `<div class="record-course-library-save" data-plan-course-library-save><label class="choice-card record-course-library-save__choice"><input type="checkbox" name="savePlanCourseToLibrary" value="1"><span><strong>このコースを保存したコースにも残す</strong><small>記録を保存すると、次回から入力画面で選べます。同じ名前がある場合は確認します。</small></span></label></div>`;
}

function renderCourseEntry(course = {}, isRest = false, { fromPlan = false } = {}) {
  const courseStatus = hasDetailedCourse(course) ? "選択済み" : "任意";
  return `<section class="record-course-entry" id="record-course-entry" data-run-fields${isRest ? " hidden" : ""} aria-labelledby="record-course-entry-title">
    <div class="record-course-entry__heading"><div><p>保存コース</p><h3 id="record-course-entry-title">今回のコース</h3></div><span class="disclosure-status">${escapeHtml(courseStatus)}</span></div>
    ${renderCourseSummary(course, { headingLevel: 4, compact: true })}
    <label class="field record-surface-condition"><span>今回の路面の濡れ・滑り</span><select name="surfaceWetSlipState"><option value="UNKNOWN"${course.surfaceWetSlipState === "UNKNOWN" || !course.surfaceWetSlipState ? " selected" : ""}>分からない・確認していない</option><option value="DRY"${course.surfaceWetSlipState === "DRY" ? " selected" : ""}>乾いている</option><option value="DAMP"${course.surfaceWetSlipState === "DAMP" ? " selected" : ""}>湿っている</option><option value="WET"${course.surfaceWetSlipState === "WET" ? " selected" : ""}>濡れている</option><option value="SLIPPERY_REPORTED"${course.surfaceWetSlipState === "SLIPPERY_REPORTED" ? " selected" : ""}>滑りやすさを感じた</option></select><small>保存コースには固定せず、今回の状態として記録します。</small></label>
    ${renderPlanCourseLibrarySaveOption(course, { fromPlan, isRest })}
    <div class="record-course-entry__actions"><button class="button button--secondary record-action-button record-action-button--course" type="button" data-action="open-course-library">コースを選ぶ・作る</button></div>
  </section>`;
}

function recentCourseTimestamp(course = {}) {
  const value = Date.parse(course.updatedAt || course.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

function renderRecentCourseShortcuts(courses = []) {
  if (!courses.length) return '<p class="record-course-shortcuts__empty">保存済みコースはまだありません。</p>';
  return `<div class="record-course-shortcuts" aria-label="最近使った保存コース">
    <p class="record-course-shortcuts__label">すぐ使う</p>
    <div class="record-course-shortcuts__grid">${courses.map((course) => `<button type="button" class="record-course-shortcut" data-action="apply-saved-course" data-course-id="${escapeHtml(course.id || "")}"><strong>${escapeHtml(course.name || "名称なし")}</strong><small>今回の入力へ反映</small></button>`).join("")}</div>
  </div>`;
}

function renderCourseHiddenFields(course = {}) {
  const values = {
    courseId: course.id || course.courseId || "",
    courseName: course.name || "",
    routePattern: course.routePattern || "UNKNOWN",
    gradeInputMode: course.gradeInputMode || (Array.isArray(course.sections) && course.sections.length ? "SECTIONS" : course.gradeKnowledge === "KNOWN_FLAT" ? "FLAT" : course.gradeKnowledge === "KNOWN_PROFILE" ? "SUMMARY" : "UNKNOWN"),
    surfaceInputMode: course.surfaceInputMode || "UNKNOWN",
    upPercent: course.upPercent || 0,
    downPercent: course.downPercent || 0,
    upGradePercent: course.upGradePercent || 0,
    downGradePercent: course.downGradePercent || 0,
    gradeKnowledge: course.gradeKnowledge || "UNKNOWN",
    modelSurfaceClass: course.modelSurfaceClass || "UNKNOWN",
  };
  const baseFields = Object.entries(values).map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`).join("");
  const sectionFields = Array.from({ length: 5 }, (_, index) => {
    const section = Array.isArray(course.sections) ? course.sections[index] || {} : {};
    const signedGrade = Number(section.gradePercent || 0);
    const direction = section.gradeDirection || (signedGrade > 0 ? "UPHILL" : signedGrade < 0 ? "DOWNHILL" : "FLAT");
    return `<input type="hidden" name="sectionShare_${index}" value="${escapeHtml(section.sharePercent ?? "")}"><input type="hidden" name="sectionDirection_${index}" value="${escapeHtml(direction)}"><input type="hidden" name="sectionGrade_${index}" value="${escapeHtml(Math.abs(signedGrade) || "")}">`;
  }).join("");
  const surfaceFields = SURFACE_FIELDS.map(({ recordKey }) => `<input type="hidden" name="${escapeHtml(recordKey)}" value="${escapeHtml(course[recordKey] ?? 0)}">`).join("");
  return `<div class="course-hidden-fields" hidden aria-hidden="true">${baseFields}${sectionFields}${surfaceFields}</div>`;
}

function renderSubjectiveHiddenFields(feedback = {}) {
  const fields = subjectiveFieldsFromFeedback(feedback);
  return `<div class="subjective-hidden-fields" hidden aria-hidden="true">
    <input type="hidden" name="subjectiveStatus" value="${escapeHtml(fields.subjectiveStatus)}">
    <input type="hidden" name="subjectiveDetailType" value="${escapeHtml(fields.subjectiveDetailType)}">
    ${BODY_PARTS.map((bodyPart) => {
      const key = bodyPartKey(bodyPart);
      return `<input type="hidden" name="fatigue_${escapeHtml(key)}" value="${escapeHtml(fields[`fatigue_${key}`] || 0)}"><input type="hidden" name="discomfort_${escapeHtml(key)}" value="${escapeHtml(fields[`discomfort_${key}`] || 0)}"><input type="checkbox" name="reviewed_${escapeHtml(key)}" value="1"${checked(fields[`reviewed_${key}`] === "1")} hidden>`;
    }).join("")}
    ${BODY_AREA_TAXONOMY.map((area) => `<input type="hidden" name="bodyArea_${escapeHtml(area.key)}" value="${escapeHtml(fields[`bodyArea_${area.key}`] || 0)}"><input type="hidden" name="bodyAreaLaterality_${escapeHtml(area.key)}" value="${escapeHtml(fields[`bodyAreaLaterality_${area.key}`] || "UNKNOWN")}">`).join("")}
    <input type="hidden" name="legacyTopBodyPart" value="${escapeHtml(fields.legacyTopBodyPart || "")}">
    <input type="hidden" name="consultationNote" value="${escapeHtml(fields.consultationNote || "")}">
    <input type="checkbox" name="unexpectedSymptom" value="1"${checked(fields.unexpectedSymptom === "1")} hidden>
    <input type="hidden" name="symptomTiming" value="${escapeHtml(fields.symptomTiming || "")}">
    <input type="hidden" name="symptomStartedWhen" value="${escapeHtml(fields.symptomStartedWhen || "")}">
    <input type="hidden" name="symptomNote" value="${escapeHtml(fields.symptomNote || "")}">
    ${SAFETY_FLAG_KEYS.map((flag) => `<input type="checkbox" name="safety_${escapeHtml(flag)}" value="1"${checked(fields[`safety_${flag}`] === "1")} hidden>`).join("")}
  </div>`;
}

function renderSubjectiveEntry(feedback = {}) {
  const fields = subjectiveFieldsFromFeedback(feedback);
  const summary = subjectiveSummaryFromFields(fields);
  const hasInput = !["deferred", "not_asked"].includes(summary.status);
  return `<section class="record-subjective-entry" id="record-subjective-entry" aria-labelledby="record-subjective-entry-title">
    <div class="record-subjective-entry__heading"><div><p>本人の身体記録</p><h3 id="record-subjective-entry-title">今回の身体記録</h3></div><span class="disclosure-status" data-subjective-summary-status>${escapeHtml(summary.label)}</span></div>
    <p class="record-subjective-entry__summary" data-subjective-summary-description>${escapeHtml(summary.description)}</p>
    <div class="record-subjective-entry__actions"><button class="button button--secondary record-action-button" type="button" data-action="open-subjective-input">${hasInput ? "確認・変更" : "身体の記録を入力"}</button></div>
    ${renderSubjectiveHiddenFields(feedback)}
  </section>`;
}

function renderPersonalHiddenFields(record = {}) {
  const fields = personalContextFieldsFromRecord(record);
  return `<div class="personal-hidden-fields" hidden aria-hidden="true">${PERSONAL_CONTEXT_FIELD_NAMES.map((name) => {
    const isCheckbox = name.startsWith("personalFocus_") || name.startsWith("personalEquipment_");
    const value = fields[name] || (isCheckbox ? "__unchecked__" : "");
    if (isCheckbox) return `<input type="checkbox" name="${escapeHtml(name)}" value="1"${checked(value === "1")} hidden>`;
    return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
  }).join("")}</div>`;
}

function renderPersonalEntry(record = {}) {
  const summary = personalContextSummary(record);
  return `<section class="record-personal-entry" id="record-personal-entry" aria-labelledby="record-personal-entry-title">
    <div class="record-subjective-entry__heading"><div><p>使用したもの・本人の気づき</p><h3 id="record-personal-entry-title">シューズと走り方のメモ</h3></div><span class="disclosure-status" data-personal-summary-status>${escapeHtml(summary.label)}</span></div>
    <p class="record-subjective-entry__summary" data-personal-summary-description>${escapeHtml(summary.hasInput ? summary.description : "履いたシューズ、自分で感じた足のつき方・歩幅、意識したことを任意で残します。")}</p>
    <div class="record-subjective-entry__actions"><button class="button button--secondary record-action-button" type="button" data-action="open-personal-input">${summary.hasInput ? "確認・変更" : "任意で入力"}</button></div>
    ${renderPersonalHiddenFields(record)}
  </section>`;
}


function renderRecordInputGuide({ selectedPlan = null, editing = false } = {}) {
  const saveText = editing
    ? "同じ記録を更新し、結果画面を開きます。"
    : selectedPlan
      ? "予定の内容を今回の記録へ残し、結果画面を開きます。コース保存は選んだ場合だけ行います。"
      : "今回の記録を保存し、結果画面を開きます。";
  return renderScreenGuide({
    id: "record-input-guide",
    summary: "必須項目から順に入力できます。必要な説明だけ確認してください。",
    sections: [
      { title: "まずここでやること", body: "走行または休養を選び、日付と必要な走行事実を入力します。" },
      { title: "入力の4つの目的", items: INPUT_PURPOSE_GUIDANCE.map((item) => item.title) },
      { title: "コースの扱い", body: "今回の条件として選びます。保存したコースは次回も使えます。" },
      { title: "保存後", body: saveText },
    ],
    tutorialId: "record-input",
  });

}

function rpeLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "未入力";
  if (numeric === 0) return "0・休息に近い";
  if (numeric <= 2) return `${numeric}・楽`;
  if (numeric <= 4) return `${numeric}・やや楽`;
  if (numeric <= 6) return `${numeric}・ややきつい`;
  if (numeric <= 8) return `${numeric}・きつい`;
  return `${numeric}・とてもきつい`;
}

function renderEnvironmentContext(record = {}) {
  const context = record.environmentContext || {};
  return `<details class="record-optional-details"><summary><span><strong>天候・環境を任意で残す</strong><small>結果の数値には使わず、あとで記録を見返すために保存します。</small></span></summary><div class="field-grid field-grid--two record-optional-details__body">
    <label class="field"><span>天候</span><input name="weather" maxlength="160" value="${escapeHtml(context.weather || "")}" placeholder="例：晴れ、雨上がり"></label>
    <label class="field"><span>気温（℃）</span><input name="temperatureC" type="number" inputmode="decimal" min="-50" max="60" step="0.1" value="${escapeHtml(context.temperatureC ?? "")}" placeholder="例：24"></label>
    <label class="field"><span>風</span><input name="windSummary" maxlength="160" value="${escapeHtml(context.windSummary || "")}" placeholder="例：弱い向かい風"></label>
    <label class="field"><span>環境メモ</span><textarea name="environmentNote" maxlength="500" rows="3" placeholder="暑さ、湿り、混雑などを任意で残せます。">${escapeHtml(context.environmentNote || "")}</textarea></label>
  </div></details>`;
}

function renderRecoveryAndReflection(record = {}) {
  const recovery = record.recoveryContext || {};
  const reflection = record.reflectionContext || {};
  const consultation = record.consultationContext || {};
  const selectedData = new Set(Array.isArray(consultation.consultationDataSelection) ? consultation.consultationDataSelection : []);
  return `<div class="record-context-details">
    <details class="record-optional-details"><summary><span><strong>睡眠・食事・生活背景</strong><small>本人の文脈として別に保存し、部位指数へ混ぜません。</small></span></summary><div class="field-grid field-grid--two record-optional-details__body">
      <label class="field"><span>睡眠の自己記録</span><input name="sleepSummary" maxlength="160" value="${escapeHtml(recovery.sleepSummary || "")}" placeholder="例：よく眠れた、短かった"></label>
      <label class="field"><span>食事・水分の自己記録</span><input name="nutritionHydrationSummary" maxlength="160" value="${escapeHtml(recovery.nutritionHydrationSummary || "")}" placeholder="例：走る前に水分を取った"></label>
      <label class="field field--wide"><span>生活背景メモ</span><textarea name="lifestyleNote" maxlength="500" rows="3">${escapeHtml(recovery.lifestyleNote || "")}</textarea></label>
    </div></details>
    <details class="record-optional-details"><summary><span><strong>今回の振り返りと次回</strong><small>記録ノートへ移さなくても、今回の記録と一緒に残せます。</small></span></summary><div class="field-grid field-grid--two record-optional-details__body">
      <label class="field"><span>今回の感想</span><textarea name="postRunReflection" maxlength="500" rows="3">${escapeHtml(reflection.postRunReflection || "")}</textarea></label>
      <label class="field"><span>普段との違い</span><textarea name="perceivedDifference" maxlength="500" rows="3">${escapeHtml(reflection.perceivedDifference || "")}</textarea></label>
      <label class="field"><span>今回の主な気づき</span><textarea name="reflectionKeyPoint" maxlength="500" rows="3">${escapeHtml(reflection.reflectionKeyPoint || "")}</textarea></label>
      <label class="field"><span>次回確認したいこと</span><textarea name="nextCheckPoint" maxlength="500" rows="3">${escapeHtml(reflection.nextCheckPoint || "")}</textarea></label>
    </div></details>
    <details class="record-optional-details"><summary><span><strong>相談用のメモ</strong><small>相談が必要なときだけ入力します。</small></span></summary><div class="record-optional-details__body">
      <div class="field-grid consultation-compose-grid"><label class="field"><span>相談したい相手</span><input name="consultationTarget" maxlength="160" value="${escapeHtml(consultation.consultationTarget || "")}" placeholder="例：家族、指導者、医療機関"></label><label class="field"><span>相談したい内容</span><textarea name="consultationQuestion" maxlength="500" rows="4" placeholder="相手に確認したいことを、自分の言葉で入力できます。">${escapeHtml(consultation.consultationQuestion || "")}</textarea></label></div>
      <fieldset class="field-group consultation-sharing-fieldset"><legend>共有する記録範囲</legend><div class="checkbox-grid">${[["current-result","今回の数値結果"],["body-record","本人の身体記録"],["course","コース・走行条件"],["personal-note","本人メモ"]].map(([value,label]) => `<label><input type="checkbox" name="consultationDataSelection" value="${value}"${selectedData.has(value) ? " checked" : ""}><span>${label}</span></label>`).join("")}</div></fieldset>
    </div></details>
  </div>`;
}

export function renderRecordInputScreen({ services, context }) {
  const requestedRecordId = context?.parameters?.get("recordId") || "";
  const requestedPlanId = context?.parameters?.get("planId") || "";
  const startNew = context?.parameters?.get("new") === "1";
  const selectedPlan = requestedPlanId ? services.storage.plans.findById(requestedPlanId) : null;
  const existingExperience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : null;
  const savedDraft = !existingExperience && !selectedPlan && !startNew ? services.storage.draft.load() : null;
  const plannedSession = selectedPlan?.plannedSession || {};
  const planUsesModelAssumptions = Boolean(plannedSession?.planModelAssumptions?.steps || plannedSession?.planModelAssumptions?.perceivedExertion);
  const draftRecord = savedDraft?.record || {};
  const record = existingExperience?.record || (selectedPlan ? {
    id: "",
    date: selectedPlan.scheduledDate || localToday(),
    activityType: selectedPlan.planType || "run",
    distanceKm: plannedSession.distanceKm ?? "",
    durationMinutes: plannedSession.durationMinutes ?? "",
    steps: planUsesModelAssumptions ? "" : plannedSession.steps ?? "",
    perceivedExertion: planUsesModelAssumptions ? null : plannedSession.perceivedExertion ?? null,
    rpeProvenance: plannedSession.rpeProvenance || "NOT_REPORTED",
    runningFormat: plannedSession.runningFormat || "UNKNOWN",
    stepsProvenance: plannedSession.stepsProvenance || "UNKNOWN",
    course: plannedSession.course || { gradeKnowledge: "UNKNOWN", modelSurfaceClass: "UNKNOWN" },
    memo: selectedPlan.memo || "",
  } : {
    id: "",
    date: draftRecord.date || context?.parameters?.get("date") || localToday(),
    activityType: draftRecord.activityType || "run",
    distanceKm: draftRecord.distanceKm ?? "",
    durationMinutes: draftRecord.durationMinutes ?? "",
    steps: draftRecord.steps ?? "",
    perceivedExertion: draftRecord.perceivedExertion ?? null,
    rpeProvenance: draftRecord.rpeProvenance || "NOT_REPORTED",
    runningFormat: draftRecord.runningFormat || "UNKNOWN",
    stepsProvenance: draftRecord.stepsProvenance || "UNKNOWN",
    course: draftRecord.course || { gradeKnowledge: "UNKNOWN", modelSurfaceClass: "UNKNOWN" },
    memo: draftRecord.memo || "",
  });
  const feedback = existingExperience?.feedback || savedDraft?.feedback || {
    checkStatus: "deferred",
    fatigueByBodyPart: {},
    discomfortByBodyPart: {},
    safetyFlags: {},
  };
  const isRest = record.activityType === "rest";
  const editing = Boolean(existingExperience);
  const course = record.course || {};
  const recentCourses = [...services.storage.courses.loadAll()]
    .sort((left, right) => recentCourseTimestamp(right) - recentCourseTimestamp(left))
    .slice(0, 3);
  const reportedRpe = reportedRpeValue(record);

  return `<section class="screen screen--record-input">
    ${renderPageHeading({
      eyebrow: "今日の記録",
      title: editing ? "保存した記録を確認・更新" : selectedPlan ? "予定を実績として記録" : "今日の記録",
      description: editing ? "保存した記録を更新します。" : "必須の走行事実を先に入力し、コースや振り返りは必要な範囲だけ追加します。",
    })}
    ${renderRecordInputGuide({ selectedPlan, editing })}
    ${editing ? `<p class="editing-banner">${renderStatusLabel("保存済み記録を編集中", "info")} ${escapeHtml(formatLocalDate(record.date))}の記録を更新します。</p>` : selectedPlan ? `<p class="editing-banner">${renderStatusLabel("予定から転記", "info")} ${escapeHtml(selectedPlan.title || "保存した予定")}から距離・時間・コース条件を転記しました。歩数ときつさは実績に合わせて入力します。</p>` : savedDraft ? `<p class="editing-banner">${renderStatusLabel("入力途中から再開", "info")} 端末内に保存した下書きを開きました。確認してから記録を保存してください。</p>` : ""}
    <form id="record-input-form" class="record-form record-form--staged" data-editing="${editing ? "true" : "false"}" novalidate>
      <input type="hidden" name="recordId" value="${escapeHtml(record.id || "")}">
      <input type="hidden" name="planId" value="${escapeHtml(selectedPlan?.id || "")}">
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>

      <section class="form-section form-section--stage form-section--required" data-information-role="fact" aria-labelledby="record-basic-title">
        <div class="section-heading"><p>1. 必須の走行事実</p><h2 id="record-basic-title">今日の走行事実</h2></div>
        <p class="form-stage-intro">あとから走行量を正しく見返すための基本情報を入力します。</p>
        <fieldset class="field fieldset-field activity-type-choice"><legend>記録の種類 <strong aria-label="必須">必須</strong></legend><div class="segmented-control"><label><input type="radio" name="activityType" value="run"${checked(!isRest)}><span>走行</span></label><label><input type="radio" name="activityType" value="rest"${checked(isRest)}><span>休養</span></label></div></fieldset>
        <label class="field record-date-field"><span>日付 <strong aria-label="必須">必須</strong></span><input name="date" type="date" value="${escapeHtml(record.date)}" required></label>
        <div data-run-fields${isRest ? " hidden" : ""}>
          <div class="record-measure-grid record-measure-grid--required">
            <label class="field record-measure-field"><span>距離（km） <strong aria-label="必須">必須</strong></span><input name="distanceKm" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="${escapeHtml(record.distanceKm || "")}" placeholder="例：5.0" required></label>
            <label class="field record-measure-field"><span>実走時間（分） <strong aria-label="必須">必須</strong></span><input name="durationMinutes" type="number" inputmode="decimal" min="0.01" max="100000" step="0.1" value="${escapeHtml(record.durationMinutes || "")}" placeholder="例：35" required></label>
          </div>
          <p class="field-help">信号待ちなどを除いた、実際に走行・歩行していた時間を入力します。</p>
        </div>
        <div class="rest-entry-note" data-rest-fields${isRest ? "" : " hidden"}><strong>休養日として保存します。</strong><p>走行による数値結果を表示しない記録です。本人メモや身体記録は必要な場合だけ追加できます。</p></div>
      </section>

      <section class="form-section form-section--stage form-section--course" data-information-role="fact" data-run-fields${isRest ? " hidden" : ""} aria-labelledby="record-course-title">
        <div class="section-heading section-heading--with-status"><div><p>2. コースと条件</p><h2 id="record-course-title">コースと走行条件</h2></div><span>任意</span></div>
        <p class="form-stage-intro">保存したコースを使い回すと、坂・路面を毎回設定し直さずに済みます。</p>
        ${renderRecentCourseShortcuts(recentCourses)}
        <p class="record-return-status" data-record-return-status role="status" aria-live="polite" hidden></p>
        ${renderCourseEntry(course, isRest, { fromPlan: Boolean(selectedPlan) })}
        <p class="record-snapshot-note">選択した条件は今回の記録へ、保存時点の内容として残ります。今回だけ変更しても、保存元コースと過去記録は自動で書き換えません。</p>
      </section>
      ${renderCourseHiddenFields(course)}

      <section class="form-section form-section--stage form-section--accuracy" data-information-role="condition" data-run-fields${isRest ? " hidden" : ""} aria-labelledby="record-accuracy-title">
        <div class="section-heading"><p>3. 比較しやすくする情報</p><h2 id="record-accuracy-title">似た記録を比べやすくする情報</h2></div>
        <p class="form-stage-intro">分かる項目だけ入力してください。空欄のままでも保存できます。</p>
        <div class="field-grid field-grid--two">
          <label class="field"><span>歩数（任意）</span><input name="steps" type="number" inputmode="numeric" min="0" max="10000000" step="1" value="${escapeHtml(record.steps || "")}" placeholder="例：6000"><small>歩数は、走るリズムを振り返り、同じような過去記録を見分ける手掛かりになります。</small></label>
          <label class="field"><span>歩数の取得方法（任意）</span><select name="stepsProvenance"><option value="UNKNOWN"${selected(record.stepsProvenance, "UNKNOWN")}>不明・未設定</option><option value="DEVICE_MEASURED"${selected(record.stepsProvenance, "DEVICE_MEASURED")}>端末・時計で計測</option><option value="ESTIMATED"${selected(record.stepsProvenance, "ESTIMATED")}>推定・手入力</option></select><small>歩数を入力した場合に、計測値か推定値かを選びます。</small></label>
          <label class="field"><span>走行形式（任意） <small class="input-role-tag">走り方を振り返る</small></span><select name="runningFormat"><option value="UNKNOWN"${selected(record.runningFormat, "UNKNOWN")}>覚えていない・未設定</option><option value="CONTINUOUS_RUN"${selected(record.runningFormat, "CONTINUOUS_RUN")}>途中で歩かず走った</option><option value="RUN_WALK"${selected(record.runningFormat, "RUN_WALK")}>走りと歩きを混ぜた</option></select><small>途中で歩いたかを残します。分からなければ未設定のまま保存できます。</small></label>
        </div>
        ${renderEnvironmentContext(record)}
        <p class="record-result-information-note" data-information-role="condition">距離と実走時間を入力すれば保存できます。保存後は、その日の走行条件と結果を一緒に確認できます。</p>
      </section>

      <section class="form-section form-section--stage form-section--reflection" data-information-role="personal" aria-labelledby="record-reflection-title">
        <div class="section-heading"><p>4. 本人の振り返り</p><h2 id="record-reflection-title">本人の振り返り</h2></div>
        <p class="form-stage-intro">数値結果とは別に、本人の感覚や文脈を残します。</p>
        <fieldset class="field-group record-exertion-field" data-run-fields${isRest ? " hidden" : ""}>
          <legend>走り全体のきつさ（RPE・任意）</legend>
          <label class="choice-card choice-card--compact rpe-enable-choice"><input type="checkbox" data-rpe-enabled${reportedRpe == null ? "" : " checked"}><span><strong>RPEを記録する</strong><small>選んだ場合だけ0〜10の値を保存します。</small></span></label>
          <div class="range-input-card" data-rpe-control${reportedRpe == null ? " hidden" : ""}>
            <div class="range-input-card__heading"><span>本人が感じたきつさ</span><output for="record-rpe" data-rpe-output>${escapeHtml(rpeLabel(reportedRpe == null ? 5 : reportedRpe))}</output></div>
            <input id="record-rpe" type="range" name="perceivedExertion" min="0" max="10" step="1" value="${escapeHtml(reportedRpe == null ? 5 : reportedRpe)}" data-rpe-range${reportedRpe == null ? " disabled" : ""}>
            <div class="range-input-card__scale" aria-hidden="true"><span>0・休息に近い</span><span>10・とてもきつい</span></div>
          </div>
          <p class="field-help">走行事実や部位別の数値とは分けて、本人が感じたきつさとして見返します。</p>
        </fieldset>
        <div class="record-optional-grid record-optional-grid--reflection">
          ${renderSubjectiveEntry(feedback)}
          ${renderPersonalEntry(record)}
        </div>
        ${renderRecoveryAndReflection(record)}
        <label class="field record-memo-field"><span>本人メモ（任意）</span><textarea name="memo" maxlength="500" rows="4" placeholder="今日残しておきたい事実や気づきを入力できます。">${escapeHtml(record.memo || "")}</textarea></label>
      </section>

      <div class="form-submit-area"><div><strong>${editing ? "入力内容を確認して更新" : "必須項目を確認して保存"}</strong><p>保存後、走行全体の比較用推定値と、12部位の結果画面を開きます。</p><p class="draft-status" data-draft-status role="status" aria-live="polite"></p></div><div class="form-submit-actions"><button class="button button--primary" type="submit">${editing ? "記録を更新して結果を見る" : "記録を保存して結果を見る"}</button>${editing ? "" : `<button class="button button--secondary" type="button" data-action="save-record-draft">入力途中を保存</button>`}</div></div>
    </form>

    <section class="record-management-links" aria-labelledby="record-management-title"><div><p>保存後の管理</p><h2 id="record-management-title">保存済みデータと管理</h2><p>入力後に、必要な場合だけ開きます。</p></div><div><a class="button button--secondary" href="#/history">保存済み記録を見る</a><a class="text-link" href="#/settings?section=data">バックアップ・復元・削除を確認</a></div></section>
  </section>`;
}
