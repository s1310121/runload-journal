import {
  escapeHtml,
  renderPageHeading,
  renderStatusLabel,
} from "../ui/commonComponents.js";
import { formatActivitySummary, formatLocalDate } from "../ui/recordPresentation.js";

function externalLink(reference, label = "公式情報を開く") {
  return `<a class="button button--secondary" href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function renderPhoneAction({ numberHref, displayNumber, label }) {
  return `<div class="public-help-phone-action"><a class="button button--primary" href="${escapeHtml(numberHref)}" aria-label="電話機能で${escapeHtml(displayNumber)}を開く">${escapeHtml(label)}</a><small>RunLoadから自動発信しません。対応端末では電話機能へ移動し、発信操作は端末側で行います。</small></div>`;
}

function renderSelectedItems(guidance) {
  if (!guidance.selectedItems.length) return "";
  return `<section class="public-help-selected" aria-labelledby="public-help-selected-title"><div class="section-heading section-heading--compact"><p>本人が選択した内容</p><h2 id="public-help-selected-title">公式案内と同じ種類の項目</h2></div><ul>${guidance.selectedItems.map((item) => `<li>${escapeHtml(item.label)}</li>`).join("")}</ul><p>RunLoadは、症状の現在性、強さ、原因、緊急性を判定していません。誤入力または現在は当てはまらない場合は、本人入力を確認・修正できます。</p></section>`;
}

function renderPriorityPanel(recordId, guidance) {
  if (!guidance.shouldPrioritize) return "";
  const mhlw = guidance.references.find((item) => item.id === "MHLW-URGENCY-119");
  return `<section class="public-help-priority" aria-labelledby="public-help-priority-title"><div>${renderStatusLabel("公的な窓口を先に確認", "attention")}<h2 id="public-help-priority-title">現在も症状がある場合は、アプリ操作より公的な案内を優先してください</h2><p>本人が選んだ項目の中に、厚生労働省・消防庁の救急案内でも119番を検討する例として扱われる種類の内容があります。RunLoadが緊急性を判定したという意味ではありません。</p></div><div class="public-help-priority__actions">${renderPhoneAction({ numberHref: "tel:119", displayNumber: "119番", label: "電話機能で119番を開く" })}${mhlw ? externalLink(mhlw, "119番の目安を確認") : ""}</div>${recordId ? `<a class="text-link" href="#/subjective-input?recordId=${encodeURIComponent(recordId)}&returnTo=${encodeURIComponent(`#/support-guidance?recordId=${recordId}`)}">本人入力を確認・修正する</a>` : ""}</section>`;
}

function renderOfficialOptions(guidance) {
  const byId = Object.fromEntries(guidance.references.map((item) => [item.id, item]));
  return `<section class="public-help-options" aria-labelledby="public-help-options-title"><div class="section-heading"><p>公的な選択肢</p><h2 id="public-help-options-title">状況に応じて自分で選ぶ</h2><p>この画面は診断や受診判断を行いません。公式窓口の役割を区別して示します。</p></div><div class="public-help-options__grid"><article><span>01</span><h3>救急車が必要だと感じる</h3><p>日本国内では119番です。通報すると、指令員が必要事項を順に確認します。</p><div class="screen-actions">${renderPhoneAction({ numberHref: "tel:119", displayNumber: "119番", label: "電話機能で119番を開く" })}${byId["FDMA-119-CALL"] ? externalLink(byId["FDMA-119-CALL"], "通報方法を見る") : ""}</div></article><article><span>02</span><h3>救急車を呼ぶか迷う</h3><p>#7119は、実施している地域・時間帯で利用できる救急相談窓口です。利用可否は地域・時間帯によって異なります。</p><div class="screen-actions">${renderPhoneAction({ numberHref: "tel:%237119", displayNumber: "#7119", label: "電話機能で#7119を開く" })}${byId["FDMA-7119"] ? externalLink(byId["FDMA-7119"], "対応地域を確認") : ""}</div></article><article><span>03</span><h3>公式ガイドを自分で確認する</h3><p>消防庁の全国版救急受診ガイド「Q助」を任意で確認できます。外部サイトを開かなくても、RunLoadの記録・相談メモは利用できます。</p><div class="screen-actions">${byId["FDMA-QSUKE"] ? externalLink(byId["FDMA-QSUKE"], "Q助を開く") : ""}</div></article></div></section>`;
}

function renderAppActions(experience) {
  if (!experience?.record?.id) return "";
  const recordId = experience.record.id;
  return `<section class="public-help-app-actions" aria-labelledby="public-help-app-actions-title"><div class="section-heading section-heading--compact"><p>RunLoad内でできること</p><h2 id="public-help-app-actions-title">公的な案内とは分けて記録を整理する</h2></div><div class="result-activation-hub__grid"><a class="result-activation-hub__item" href="#/consultation?recordId=${encodeURIComponent(recordId)}"><strong>相談用に整理する</strong><small>本人入力と走行事実を分けたメモを作る</small><span aria-hidden="true">→</span></a><a class="result-activation-hub__item" href="#/subjective-input?recordId=${encodeURIComponent(recordId)}&returnTo=${encodeURIComponent(`#/support-guidance?recordId=${recordId}`)}"><strong>本人入力を確認する</strong><small>誤入力や現在は当てはまらない項目を修正する</small><span aria-hidden="true">→</span></a><a class="result-activation-hub__item" href="#/result?recordId=${encodeURIComponent(recordId)}"><strong>結果へ戻る</strong><small>数値表示と本人入力を分けて見直す</small><span aria-hidden="true">→</span></a></div></section>`;
}

export function renderSupportGuidanceScreen({ services, context }) {
  const requestedRecordId = context.parameters.get("recordId") || "";
  const experience = requestedRecordId
    ? services.workflows.records.loadExperience(requestedRecordId)
    : services.workflows.records.loadLatestExperience();
  const guidance = services.safety.buildPublicHelpGuidance(experience?.supportDecision || {});
  const recordContext = experience?.record
    ? `<section class="activation-source" aria-label="確認元の記録"><div>${renderStatusLabel("確認元の記録", "info")}<h2>${escapeHtml(formatLocalDate(experience.record.date))}</h2><p>${escapeHtml(formatActivitySummary(experience.record))}</p></div><a class="button button--secondary" href="#/result?recordId=${encodeURIComponent(experience.record.id)}">結果へ戻る</a></section>`
    : `<aside class="screen-role-boundary"><p><strong>対象記録を選ばずに、公的な窓口の役割を確認しています。</strong></p><p>この画面は日本国内向けの一般的な案内です。RunLoadは症状や緊急性を判定しません。</p></aside>`;
  return `<section class="screen screen--support-guidance" data-public-help-version="${escapeHtml(guidance.version)}">
    ${renderPageHeading({ eyebrow: "本人入力と公的な案内", title: "公的な相談先を確認する", description: "RunLoadの数値表示ではなく、本人が入力した内容をもとに公式の窓口を自分で確認するための画面です。" })}
    <aside class="editorial-boundary public-help-boundary"><p><strong>このアプリは緊急性、診断、受診要否を判定しません。</strong></p><p>症状が現在ある、急に始まった、強い、または命に関わると感じる場合は、アプリの入力や結果確認を続けることより公的な案内を優先してください。</p></aside>
    ${recordContext}
    ${renderPriorityPanel(experience?.record?.id || "", guidance)}
    ${renderSelectedItems(guidance)}
    <aside class="public-help-phone-boundary"><strong>電話ボタンについて</strong><span>ボタンは端末の電話機能を開くためのリンクです。RunLoadが自動で通話を開始することはありません。</span></aside>
    ${renderOfficialOptions(guidance)}
    ${renderAppActions(experience)}
    <footer class="source-boundary public-help-footer"><p>公式リンクは任意で、RunLoadの数値表示・保存・オフライン利用には必要ありません。#7119の実施地域・時間帯は変わる可能性があるため、消防庁の最新情報を確認してください。</p><p>案内確認日：${escapeHtml(guidance.reviewedAt)}</p></footer>
  </section>`;
}
