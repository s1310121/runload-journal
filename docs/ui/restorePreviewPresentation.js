import { escapeHtml, renderStatusLabel } from "./commonComponents.js";

const COUNT_LABELS = Object.freeze([
  ["records", "走行・休養記録"],
  ["subjectiveFeedback", "本人入力"],
  ["v27Results", "走行全体の保存済み結果"],
  ["regionalResults", "部位別の保存済み結果"],
  ["plans", "予定"],
  ["notebookPages", "日ノート"],
  ["courses", "保存したコース"],
  ["profile", "プロフィール"],
  ["settings", "設定"],
  ["draft", "入力途中"],
]);

function statusCopy(status) {
  if (status === "SUPPORTED") return { label: "対応", tone: "success", title: "このバックアップは復元できます", description: "保存内容を確認できました。" };
  if (status === "REVIEW_REQUIRED") return { label: "要確認", tone: "attention", title: "確認してから復元できます", description: "復元可能ですが、参照がない項目などがあります。本人の文章や予定自体は保持されます。" };
  return { label: "復元不可", tone: "danger", title: "このバックアップは復元できません", description: "保存内容に復元を止める問題があります。" };
}

export function renderRestoreInspection(inspection, fileName = "") {
  const copy = statusCopy(inspection?.status);
  const counts = inspection?.counts || {};
  const issues = Array.isArray(inspection?.issues) ? inspection.issues : [];
  const blocking = issues.filter((item) => item.severity === "BLOCKING");
  const warnings = issues.filter((item) => item.severity === "WARNING");
  return `<section class="restore-preview restore-preview--${escapeHtml(String(inspection?.status || "blocked").toLowerCase())}" aria-labelledby="restore-preview-title" tabindex="-1">
    <div class="result-card__heading"><div><p>復元前の検査</p><h3 id="restore-preview-title">${escapeHtml(copy.title)}</h3></div>${renderStatusLabel(copy.label, copy.tone)}</div>
    ${fileName ? `<p class="muted-text">選択したファイル：${escapeHtml(fileName)}</p>` : ""}
    <p>${escapeHtml(copy.description)}</p>
    <dl class="restore-preview__counts">${COUNT_LABELS.map(([key, label]) => `<div><dt>${escapeHtml(label)}</dt><dd>${Number(counts[key] || 0)}件</dd></div>`).join("")}</dl>
    ${blocking.length ? `<div class="restore-preview__issues restore-preview__issues--blocking"><h4>復元を止める問題</h4><ul>${blocking.map((item) => `<li>${escapeHtml(item.message)}${item.itemId ? ` <small>対象：${escapeHtml(item.itemId)}</small>` : ""}</li>`).join("")}</ul></div>` : ""}
    ${warnings.length ? `<div class="restore-preview__issues"><h4>確認が必要な内容</h4><ul>${warnings.map((item) => `<li>${escapeHtml(item.message)}${item.itemId ? ` <small>対象：${escapeHtml(item.itemId)}</small>` : ""}</li>`).join("")}</ul></div>` : ""}
    ${inspection?.status === "REVIEW_REQUIRED" ? `<label class="restore-preview__ack"><input type="checkbox" data-restore-review-ack><span>要確認の内容を読み、参照が表示されない場合があることを理解しました。</span></label>` : ""}
    ${inspection?.canRestore ? `<div class="screen-actions"><button class="button button--primary" type="button" data-action="confirm-restore-backup"${inspection.requiresAcknowledgement ? " disabled" : ""}>この内容を復元</button><button class="button button--text" type="button" data-action="cancel-restore-preview">選び直す</button></div>` : '<p class="notice-text">現在の端末内データは変更されていません。別のバックアップを選択してください。</p>'}
    <p class="muted-text">復元を実行する直前に、現在の端末内データを自動バックアップします。</p>
  </section>`;
}
