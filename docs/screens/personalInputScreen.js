import { escapeHtml, renderPageHeading } from "../ui/commonComponents.js";
import { loadRecordInputWorkspace } from "../ui/recordInputWorkspace.js";
import {
  ACTIVE_FOCUS_TAG_OPTIONS,
  RETIRED_PERSONAL_CONTEXT_FIELD_NAMES,
  SHOE_SOFTNESS_OPTIONS,
  SHOE_TYPE_OPTIONS,
  mergePersonalContextFields,
  personalSummaryFromFields,
  retiredPersonalContextDisplayItemsFromFields,
} from "../ui/personalContextPresentation.js";

function safeReturnTo(context) {
  const value = String(context?.parameters?.get("returnTo") || "#/record-input");
  return value.startsWith("#/record-input") ? value : "#/record-input";
}

function selected(value, expected) {
  return String(value ?? "") === String(expected) ? " selected" : "";
}

function checked(value) {
  return value === "1" || value === "on" || value === "true" || value === true ? " checked" : "";
}

function renderOptions(options, currentValue) {
  return options.map((option) => `<option value="${escapeHtml(option.value)}"${selected(currentValue, option.value)}>${escapeHtml(option.label)}</option>`).join("");
}

function renderFocusTags(fields) {
  return ACTIVE_FOCUS_TAG_OPTIONS.map((option) => `<label><input type="checkbox" name="personalFocus_${escapeHtml(option.value)}" value="1"${checked(fields[`personalFocus_${option.value}`])}><span><strong>${escapeHtml(option.label)}</strong></span></label>`).join("");
}

function savedShoeOptions(savedShoes = [], currentId = "") {
  return [`<option value="">保存シューズを使わない</option>`, ...savedShoes.map((shoe) => `<option value="${escapeHtml(shoe.id)}"${selected(currentId, shoe.id)}>${escapeHtml(shoe.label || "名称なし")}</option>`)].join("");
}

function renderRetiredFields(fields) {
  return RETIRED_PERSONAL_CONTEXT_FIELD_NAMES.map((name) => {
    const isCheckbox = name.startsWith("personalFocus_") || name.startsWith("personalEquipment_");
    if (isCheckbox) return `<input type="checkbox" name="${escapeHtml(name)}" value="1"${checked(fields[name])} hidden>`;
    return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(fields[name] || "")}">`;
  }).join("");
}

function renderLegacyReadOnly(fields) {
  const items = retiredPersonalContextDisplayItemsFromFields(fields);
  if (!items.length) return "";
  return `<details class="form-disclosure personal-legacy-disclosure"><summary><span>過去の補足情報 <small>以前の記録形式で保存された内容です。新しい入力では追加しません。</small></span></summary><div class="form-disclosure__content"><dl class="fact-grid">${items.map(([label, value]) => `<div class="fact-grid__wide"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl><p class="muted-text">この内容は過去記録との互換のため保持します。「この補足記録を空にする」を選ぶと、今回の編集では一緒に消去できます。</p></div></details>`;
}

export function renderPersonalInputScreen({ services, context }) {
  const returnTo = safeReturnTo(context);
  const workspace = loadRecordInputWorkspace();
  const fields = mergePersonalContextFields(workspace?.fields || {}, {});
  const summary = personalSummaryFromFields(fields);
  const settings = services?.storage?.settings?.load?.() || {};
  const savedShoes = Array.isArray(settings.savedShoes) ? settings.savedShoes : [];
  const hasShoeDetail = Boolean(fields.personalShoeType || fields.personalShoeSoftness);

  return `<section class="screen screen--personal-input">
    <nav class="context-navigation" aria-label="シューズと気づきメモ入力内の移動"><a class="body-part-detail__back-link" href="${escapeHtml(returnTo)}">今日の記録へ戻る</a></nav>
    ${renderPageHeading({
      eyebrow: "本人の補足記録",
      title: "シューズと気づきメモ",
      description: "必要なものだけ任意で残します。シューズ、今日意識したこと、あとで振り返りたい気づきを簡潔に記録できます。",
    })}
    <form id="personal-input-form" class="record-form personal-input-form" data-return-to="${escapeHtml(returnTo)}" novalidate>
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      ${renderRetiredFields(fields)}

      <section class="form-section" aria-labelledby="personal-shoe-title">
        <div class="section-heading"><p>1. 今日使ったもの</p><h2 id="personal-shoe-title">今日のシューズ</h2></div>
        <p class="section-introduction">名前が分かれば、それだけで記録できます。種類ややわらかさは、必要なときだけ追加してください。</p>
        <label class="field"><span>保存シューズを使う（任意）</span><select name="personalShoeId" data-saved-shoe-select>${savedShoeOptions(savedShoes, fields.personalShoeId || "")}</select><small>選ぶと保存済みの内容を今回の入力へ反映します。過去記録は変わりません。</small></label>
        <label class="field"><span>シューズ名・呼び名（任意）</span><input name="personalShoeLabel" type="text" maxlength="80" value="${escapeHtml(fields.personalShoeLabel || "")}" placeholder="例：いつもの黒い靴"></label>
        <details class="form-disclosure personal-shoe-details"${hasShoeDetail ? " open" : ""}>
          <summary><span>シューズの詳細を追加 <small>種類・やわらかさを必要なときだけ記録</small></span></summary>
          <div class="form-disclosure__content field-grid field-grid--two">
            <label class="field"><span>靴の種類</span><select name="personalShoeType">${renderOptions(SHOE_TYPE_OPTIONS, fields.personalShoeType)}</select></label>
            <label class="field"><span>やわらかさ</span><select name="personalShoeSoftness">${renderOptions(SHOE_SOFTNESS_OPTIONS, fields.personalShoeSoftness)}</select></label>
          </div>
        </details>
        <label class="choice-card"><input type="checkbox" name="saveCurrentShoePreset" value="1"><span><strong>今回のシューズを保存して次回も使う</strong><small>名前がある場合だけ、保存シューズへ追加します。</small></span></label>
      </section>

      <section class="form-section" aria-labelledby="personal-focus-title">
        <div class="section-heading"><p>2. 今日の意識</p><h2 id="personal-focus-title">今日意識したこと</h2></div>
        <p class="section-introduction">当てはまるものだけ選べます。複数選択できますが、何も選ばなくても構いません。</p>
        <fieldset class="field-group"><legend>意識したこと・試したこと</legend><div class="checkbox-grid personal-focus-list">${renderFocusTags(fields)}</div></fieldset>
      </section>

      <section class="form-section" aria-labelledby="personal-note-title">
        <div class="section-heading"><p>3. あとで振り返る</p><h2 id="personal-note-title">今日の気づきメモ</h2></div>
        <label class="field"><span>気づきメモ（任意）</span><textarea name="personalFreeNote" maxlength="240" rows="4" placeholder="例：今日は新しいシューズを試した。後半はテンポを意識した。">${escapeHtml(fields.personalFreeNote || "")}</textarea><small>シューズ、装備、走り方など、あとで振り返りたいことを自由に残せます。文章メモは数値結果には使いません。</small></label>
      </section>

      ${renderLegacyReadOnly(fields)}

      <div class="form-submit-area"><div><strong>補足記録を今回の入力へ反映</strong><p>すべて任意です。必要なものだけ入力してください。</p><p class="muted-text" data-personal-summary>${escapeHtml(summary.description)}</p></div><div class="form-submit-actions"><button class="button button--primary" type="submit">入力へ反映して戻る</button><button class="button button--text" type="button" data-action="clear-personal-context">この補足記録を空にする</button></div></div>
    </form>
  </section>`;
}
