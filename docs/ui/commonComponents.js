export function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderPageHeading({ eyebrow, title, description }) {
  return `
    <header class="page-heading">
      <p class="page-heading__eyebrow">${escapeHtml(eyebrow)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="page-heading__description">${escapeHtml(description)}</p>
    </header>`;
}

export function renderStatusLabel(text, tone = "neutral") {
  return `<span class="status-label status-label--${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

export function renderEmptyState({ title, description, actionLabel = "", actionScreen = "" }) {
  const action = actionLabel && actionScreen
    ? `<a class="button button--primary" href="#/${escapeHtml(actionScreen)}">${escapeHtml(actionLabel)}</a>`
    : "";
  return `
    <section class="empty-state" aria-labelledby="empty-state-title">
      <p class="empty-state__label">現在の状態</p>
      <h2 id="empty-state-title">${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      ${action}
    </section>`;
}

export function renderFeatureLinks(items) {
  return `<div class="feature-link-grid">${items.map((item) => `
    <a class="feature-link-card" href="${escapeHtml(item.href || `#/${item.screen}`)}">
      <span class="feature-link-card__number" aria-hidden="true">${escapeHtml(item.number)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.description)}</span>
    </a>`).join("")}</div>`;
}

export function renderJournalClip({ legacyClass = "", variant = "", title, description, actionHtml, id = "journal-clip-title", label = "NOTE" }) {
  const classNames = [legacyClass, "journal-clip", variant ? `journal-clip--${variant}` : ""].filter(Boolean).join(" ");
  const labelledBy = id ? ` aria-labelledby="${escapeHtml(id)}"` : "";
  return `<aside class="${escapeHtml(classNames)}"${labelledBy}>
    <div class="journal-clip__mark" aria-hidden="true">${escapeHtml(label)}</div>
    <div class="journal-clip__body"><p>記録ノートへ</p><h2 id="${escapeHtml(id)}">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>
    <div class="journal-clip__action">${actionHtml || ""}</div>
  </aside>`;
}

export function renderScreenGuide({ id, summary, sections = [], tutorialId = "" }) {
  const guideId = id || "screen-guide";
  const safeGuideId = escapeHtml(guideId);
  const safeTutorialId = escapeHtml(tutorialId);
  const bodyId = `${guideId}-body`;
  const sectionHtml = sections.map((section) => {
    const items = Array.isArray(section.items) ? section.items.filter(Boolean) : [];
    const content = items.length
      ? `<ul class="screen-guide__list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p>${escapeHtml(section.body || "")}</p>`;
    return `
      <article class="screen-guide__section">
        <h3>${escapeHtml(section.title)}</h3>
        ${content}
      </article>`;
  }).join("");
  const tutorialHtml = tutorialId ? `
      <div class="screen-guide__tutorial" data-screen-tutorial-entry="${safeTutorialId}">
        <div>
          <strong>操作を順番に確認</strong>
          <span data-screen-tutorial-recommend="${safeTutorialId}">初めて使う方におすすめです</span>
        </div>
        <button type="button" class="button button--secondary screen-guide__tutorial-button" data-screen-tutorial-start="${safeTutorialId}">操作を順番に見る</button>
      </div>` : "";
  return `<details class="screen-guide" aria-labelledby="${safeGuideId}-title">
    <summary aria-controls="${escapeHtml(bodyId)}">
      <span class="screen-guide__label">ガイド</span>
      <span class="screen-guide__heading" id="${safeGuideId}-title">この画面の使い方</span>
      <span class="screen-guide__summary">${escapeHtml(summary)}</span>
      <span class="screen-guide__cue" aria-hidden="true">開く</span>
    </summary>
    <div class="screen-guide__body" id="${escapeHtml(bodyId)}">${sectionHtml}${tutorialHtml}</div>
  </details>`;
}
