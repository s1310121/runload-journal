import { SURFACE_FIELDS } from "../core/model/modelConstants.js";
import { escapeHtml, renderPageHeading, renderScreenGuide } from "../ui/commonComponents.js";
import { renderExternalCourseCheckSupport } from "../ui/externalCourseCheckSupport.js";

function safeReturnTo(context) {
  const value = String(context?.parameters?.get("returnTo") || "#/record-input");
  return value.startsWith("#/record-input") ? value : "#/record-input";
}
function selected(value, expected) { return String(value ?? "") === String(expected) ? " selected" : ""; }
function routePatternOptions(current = "UNKNOWN") {
  return [["UNKNOWN", "分からない"], ["LOOP", "周回"], ["OUT_AND_BACK", "往復"], ["ONE_WAY", "片道"], ["MIXED", "複合・その他"]]
    .map(([value, label]) => `<option value="${value}"${selected(current, value)}>${label}</option>`).join("");
}
function gradeMode(course = {}) {
  if (course.gradeInputMode === "SECTIONS" || (Array.isArray(course.sections) && course.sections.length)) return "SECTIONS";
  if (course.gradeKnowledge === "KNOWN_PROFILE") return "SUMMARY";
  if (course.gradeKnowledge === "KNOWN_FLAT") return "FLAT";
  return "UNKNOWN";
}
function surfaceMode(course = {}) {
  const active = SURFACE_FIELDS.filter(({ recordKey }) => Number(course[recordKey] || 0) > 0);
  if (!active.length) return "UNKNOWN";
  if (active.length === 1 && Math.abs(Number(course[active[0].recordKey]) - 100) < 0.01) return "SINGLE";
  return "MIXED";
}
function primarySurface(course = {}) {
  return [...SURFACE_FIELDS].sort((a, b) => Number(course[b.recordKey] || 0) - Number(course[a.recordKey] || 0))[0]?.recordKey || "pavedPercent";
}
function renderSurfaceOptions(selectedRecordKey = "") {
  return SURFACE_FIELDS.map(({ recordKey, label }) => `<option value="${escapeHtml(recordKey)}"${selected(selectedRecordKey, recordKey)}>${escapeHtml(label)}</option>`).join("");
}
function surfaceFields(course = {}) {
  return SURFACE_FIELDS.map(({ recordKey, label }) => `<label class="field field--compact"><span>${escapeHtml(label)}（%）</span><input name="${escapeHtml(recordKey)}" type="number" inputmode="decimal" min="0" max="100" step="1" value="${escapeHtml(course[recordKey] ?? 0)}"></label>`).join("");
}
function renderSectionRows(course = {}) {
  const sections = Array.isArray(course.sections) ? course.sections : [];
  return Array.from({ length: 5 }, (_, index) => {
    const item = sections[index] || {};
    const direction = item.gradeDirection || (Number(item.gradePercent) > 0 ? "UPHILL" : Number(item.gradePercent) < 0 ? "DOWNHILL" : "FLAT");
    return `<div class="course-section-row" data-course-section-row>
      <span class="course-section-row__number">区間${index + 1}</span>
      <label class="field field--compact"><span>割合（%）</span><input name="sectionShare_${index}" type="number" min="0" max="100" step="1" value="${escapeHtml(item.sharePercent ?? "")}"></label>
      <label class="field field--compact"><span>坂道</span><select name="sectionDirection_${index}"><option value="FLAT"${selected(direction, "FLAT")}>平坦</option><option value="UPHILL"${selected(direction, "UPHILL")}>上り</option><option value="DOWNHILL"${selected(direction, "DOWNHILL")}>下り</option><option value="UNKNOWN"${selected(direction, "UNKNOWN")}>不明</option></select></label>
      <label class="field field--compact"><span>勾配の大きさ（%）</span><input name="sectionGrade_${index}" type="number" min="0" max="100" step="0.1" value="${escapeHtml(Math.abs(Number(item.gradePercent || 0)) || "")}"></label>
    </div>`;
  }).join("");
}
function renderCourseEditorGuide({ editing = false } = {}) {
  return renderScreenGuide({
    id: "course-editor-guide",
    summary: "コース名、坂道の混ざり方、路面材質の入力方法を確認できます。",
    sections: [
      { title: "まずここでやること", body: editing ? "保存したコースの内容を更新します。" : "次回以降も選べるコースを作ります。" },
      { title: "坂道", body: "割合入力は上り・下り・平坦の混在を残せます。さらに必要な場合だけ、最大5区間に分けます。" },
      { title: "路面", body: "材質を1種類または割合で入力すると、路面の違いを同じ基準で見返せます。同じ内容を二重入力する必要はありません。" },
    ],
    tutorialId: "course-editor",
  });
}

export function renderCourseEditorScreen({ services, context }) {
  const id = String(context?.parameters?.get("id") || "");
  const preset = id ? services.storage.courses.findById(id) : null;
  const course = preset?.course || { gradeKnowledge: "UNKNOWN", modelSurfaceClass: "UNKNOWN" };
  const returnTo = safeReturnTo(context);
  const settings = services.storage.settings.load();
  const managerHref = `#/course-library?returnTo=${encodeURIComponent(returnTo)}`;
  const currentGradeMode = gradeMode(course);
  const currentSurfaceMode = surfaceMode(course);
  return `<section class="screen screen--course-editor">
    <nav class="context-navigation" aria-label="コース設定内の移動"><a class="body-part-detail__back-link" href="${escapeHtml(managerHref)}">保存コース一覧へ戻る</a></nav>
    ${renderPageHeading({ eyebrow: "保存コース", title: preset ? "保存したコースを編集" : "新しいコースを作る", description: "坂道と路面を、分かる方法だけ選んで保存します。" })}
    ${renderCourseEditorGuide({ editing: Boolean(preset) })}
    <form id="course-editor-form" class="record-form course-editor-form" novalidate>
      <input type="hidden" name="courseId" value="${escapeHtml(preset?.id || "")}"><input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}">
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      <section class="form-section" aria-labelledby="course-name-title"><div class="section-heading"><p>1. コース</p><h2 id="course-name-title">コース名と形式</h2></div><label class="field"><span>コース名 <strong aria-label="必須">必須</strong></span><input name="courseName" type="text" maxlength="80" value="${escapeHtml(course.name || "")}" placeholder="例：川沿いの往復コース" required></label><label class="field"><span>コース形式 <small class="input-role-tag">コースを見返す</small></span><select name="routePattern">${routePatternOptions(course.routePattern || "UNKNOWN")}</select><small>周回・往復・片道が分かる場合だけ選びます。コースを思い出したり、相談時に説明したりするための情報です。</small></label></section>
      <section class="form-section" aria-labelledby="course-slope-title"><div class="section-heading"><p>2. 坂道</p><h2 id="course-slope-title">坂道の入力方法</h2></div>
        <label class="field"><span>どの方法で残しますか</span><select name="gradeInputMode"><option value="UNKNOWN"${selected(currentGradeMode, "UNKNOWN")}>分からない</option><option value="FLAT"${selected(currentGradeMode, "FLAT")}>全体がほぼ平坦</option><option value="SUMMARY"${selected(currentGradeMode, "SUMMARY")}>上り・下り・平坦の割合を入力</option><option value="SECTIONS"${selected(currentGradeMode, "SECTIONS")}>区間ごとに詳しく入力</option></select><small>不明を平坦や0%に置き換えません。</small></label>
        ${renderExternalCourseCheckSupport({ settings })}
        <div data-course-grade-summary${currentGradeMode === "SUMMARY" ? "" : " hidden"}><p class="inline-helper">上りと下り以外は平坦として自動表示します。</p><div class="field-grid field-grid--four">
          <label class="field field--compact"><span>上り区間（%）</span><input name="upPercent" type="number" min="0" max="100" step="1" value="${escapeHtml(course.upPercent || 0)}"></label>
          <label class="field field--compact"><span>上り代表勾配（%）</span><input name="upGradePercent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(course.upGradePercent || 0)}"></label>
          <label class="field field--compact"><span>下り区間（%）</span><input name="downPercent" type="number" min="0" max="100" step="1" value="${escapeHtml(course.downPercent || 0)}"></label>
          <label class="field field--compact"><span>下り代表勾配の大きさ（%）</span><input name="downGradePercent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(course.downGradePercent || 0)}"></label>
        </div><p class="derived-course-fact" role="status">平坦区間：<output data-flat-share>${escapeHtml(Math.max(0, 100 - Number(course.upPercent || 0) - Number(course.downPercent || 0)))}</output>%</p></div>
        <div data-course-grade-sections${currentGradeMode === "SECTIONS" ? "" : " hidden"}><p class="inline-helper inline-helper--important">入力した区間割合の合計を100%にします。空欄の行は保存しません。</p><div class="course-section-editor">${renderSectionRows(course)}</div><p class="derived-course-fact">区間割合の合計：<output data-section-share-total>0</output>%</p></div>
      </section>
      <section class="form-section" aria-labelledby="course-surface-title"><div class="section-heading"><p>3. 路面</p><h2 id="course-surface-title">路面の入力方法</h2></div>
        <label class="field"><span>どの方法で残しますか</span><select name="surfaceInputMode"><option value="UNKNOWN"${selected(currentSurfaceMode, "UNKNOWN")}>分からない</option><option value="SINGLE"${selected(currentSurfaceMode, "SINGLE")}>1種類の路面</option><option value="MIXED"${selected(currentSurfaceMode, "MIXED")}>複数の路面を割合で入力</option></select><small>材質を選ぶことで、路面の硬さ・凹凸などの違いを同じ基準で扱います。</small></label>
        <div data-course-surface-single${currentSurfaceMode === "SINGLE" ? "" : " hidden"}><label class="field"><span>今回の主な路面</span><select name="primarySurfaceKey">${renderSurfaceOptions(primarySurface(course))}</select></label></div>
        <div data-course-surface-mixed${currentSurfaceMode === "MIXED" ? "" : " hidden"}><p class="inline-helper inline-helper--important">使用した材質だけ入力し、合計を100%にします。</p><div class="field-grid field-grid--four">${surfaceFields(course)}</div><p class="derived-course-fact">路面割合の合計：<output data-surface-share-total>0</output>%</p></div>
      </section>
      <section class="form-submit-area" aria-labelledby="course-save-title"><div><strong id="course-save-title">入力内容を確認して保存</strong><p>保存後、コース一覧へ戻ります。</p></div><div class="form-submit-actions"><button class="button button--primary" type="submit">${preset ? "このコースを更新" : "新しいコースとして保存"}</button><a class="button button--secondary" href="${escapeHtml(managerHref)}">保存せず戻る</a></div></section>
    </form>
  </section>`;
}
