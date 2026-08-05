import { escapeHtml, renderEmptyState, renderPageHeading, renderScreenGuide } from "../ui/commonComponents.js";
import { renderCourseSummary } from "../ui/coursePresentation.js";

function safeReturnTo(context) {
  const value = String(context?.parameters?.get("returnTo") || "#/record-input");
  return value.startsWith("#/record-input") ? value : "#/record-input";
}


function renderCourseLibraryGuide() {
  return renderScreenGuide({
    id: "course-library-guide",
    summary: "今回の入力に使うコースと、保存したコースの違いを確認できます。",
    sections: [
      { title: "まずここでやること", body: "保存したコースを選ぶか、新しいコースを作ります。" },
      { title: "この画面で使う言葉", body: "保存したコースは、次回以降も選べるコースです。選ぶと今回の入力へ写ります。" },
      { title: "編集・削除のあと", body: "保存したコースを変えても、過去の記録や保存済み予定は変わりません。" },
    ],
    tutorialId: "course-library",
  });

}

export function renderCourseLibraryScreen({ services, context }) {
  const courses = services.storage.courses.loadAll();
  const returnTo = safeReturnTo(context);
  const notice = context?.parameters?.get("notice") || "";
  return `<section class="screen screen--course-library">
    <nav class="context-navigation" aria-label="コース設定内の移動"><a class="body-part-detail__back-link" href="${escapeHtml(returnTo)}">今日の記録へ戻る</a></nav>
    ${renderPageHeading({
      eyebrow: "保存コース",
      title: "コースを選ぶ・管理する",
      description: "保存したコースを今回の入力へ使うか、新しいコースを作成します。",
    })}
    ${renderCourseLibraryGuide()}
    ${notice ? `<p class="editing-banner" role="status">${escapeHtml(notice)}</p>` : ""}
    <section class="course-manager-introduction" aria-labelledby="course-manager-introduction-title">
      <div><p>今回の入力へ使う</p><h2 id="course-manager-introduction-title">いつものコースを、今日の入力に使えます</h2></div>
      <a class="button button--primary" href="#/course-editor?returnTo=${encodeURIComponent(returnTo)}">新しいコースを作る</a>
    </section>
    ${courses.length ? `<section aria-labelledby="saved-course-list-title"><div class="section-heading"><p>保存済み</p><h2 id="saved-course-list-title">保存したコース</h2></div><div class="course-card-grid">${courses.map((preset) => `<article class="course-manager-card" aria-labelledby="course-${escapeHtml(preset.id)}-title">
      ${renderCourseSummary(preset.course, { headingLevel: 3, headingId: `course-${preset.id}-title` })}
      <div class="course-manager-card__actions">
        <button class="button button--primary" type="button" data-action="use-course" data-course-id="${escapeHtml(preset.id)}" data-return-to="${escapeHtml(returnTo)}">このコースを使う</button>
        <a class="button button--secondary" href="#/course-editor?id=${encodeURIComponent(preset.id)}&returnTo=${encodeURIComponent(returnTo)}">編集</a>
        <button class="button button--danger" type="button" data-action="delete-course" data-course-id="${escapeHtml(preset.id)}">削除</button>
      </div>
    </article>`).join("")}</div><p class="course-library-status" data-course-manager-status role="status" aria-live="polite"></p></section>` : renderEmptyState({ title: "保存したコースはまだありません", description: "よく使うコースを作ると、次回からコース条件を選んで入力できます。", actionLabel: "新しいコースを作る", actionScreen: `course-editor?returnTo=${encodeURIComponent(returnTo)}` })}
  </section>`;
}
