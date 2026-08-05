import { escapeHtml, renderPageHeading } from "../ui/commonComponents.js";
import { loadRecordInputWorkspace } from "../ui/recordInputWorkspace.js";
import {
  EQUIPMENT_TAG_OPTIONS,
  FOCUS_TAG_OPTIONS,
  FOOT_PLACEMENT_OPTIONS,
  RHYTHM_STRIDE_OPTIONS,
  SHOE_SOFTNESS_OPTIONS,
  SHOE_TYPE_OPTIONS,
  mergePersonalContextFields,
  personalSummaryFromFields,
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
  return FOCUS_TAG_OPTIONS.map((option) => `<label class="choice-card"><input type="checkbox" name="personalFocus_${escapeHtml(option.value)}" value="1"${checked(fields[`personalFocus_${option.value}`])}><span>${escapeHtml(option.label)}</span></label>`).join("");
}

function renderEquipmentTags(fields) {
  return EQUIPMENT_TAG_OPTIONS.map((option) => `<label class="choice-card"><input type="checkbox" name="personalEquipment_${escapeHtml(option.value)}" value="1"${checked(fields[`personalEquipment_${option.value}`])}><span>${escapeHtml(option.label)}</span></label>`).join("");
}

function savedShoeOptions(savedShoes = [], currentId = "") {
  return [`<option value="">保存シューズを使わない</option>`, ...savedShoes.map((shoe) => `<option value="${escapeHtml(shoe.id)}"${selected(currentId, shoe.id)}>${escapeHtml(shoe.label || "名称なし")}</option>`)].join("");
}

export function renderPersonalInputScreen({ services, context }) {
  const returnTo = safeReturnTo(context);
  const workspace = loadRecordInputWorkspace();
  const fields = mergePersonalContextFields(workspace?.fields || {}, {});
  const summary = personalSummaryFromFields(fields);
  const settings = services?.storage?.settings?.load?.() || {};
  const savedShoes = Array.isArray(settings.savedShoes) ? settings.savedShoes : [];

  return `<section class="screen screen--personal-input">
    <nav class="context-navigation" aria-label="シューズと走り方のメモ入力内の移動"><a class="body-part-detail__back-link" href="${escapeHtml(returnTo)}">今日の記録へ戻る</a></nav>
    ${renderPageHeading({
      eyebrow: "本人の補足記録",
      title: "シューズと走り方のメモ",
      description: "履いたシューズと、自分で気づいた走り方を分けて残します。正確なフォーム判定ではなく、あとで似た記録を探すための任意情報です。",
    })}
    <form id="personal-input-form" class="record-form personal-input-form" data-return-to="${escapeHtml(returnTo)}" novalidate>
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      <section class="form-section personal-input-purpose" aria-labelledby="personal-summary-title"><div class="section-heading"><p>この画面で残すもの</p><h2 id="personal-summary-title">3種類の補足記録</h2></div><div class="personal-input-purpose__grid"><article><strong>シューズ</strong><span>名前・種類・やわらかさ</span></article><article><strong>本人の気づき</strong><span>足のつき方・歩幅・テンポ</span></article><article><strong>意識したこと</strong><span>今日試した内容と自由メモ</span></article></div><p class="section-introduction" data-personal-summary>${escapeHtml(summary.description)}</p></section>

      <section class="form-section" aria-labelledby="personal-shoe-title"><div class="section-heading"><p>1. 使用したもの</p><h2 id="personal-shoe-title">シューズの記録</h2></div><p class="section-introduction">同じシューズを使った記録をあとで見つけるために、分かる範囲だけ残します。シューズだけで身体状態を判断しません。</p>
        <label class="field"><span>保存シューズを使う（任意）</span><select name="personalShoeId" data-saved-shoe-select>${savedShoeOptions(savedShoes, fields.personalShoeId || "")}</select><small>選ぶと名前・種類・やわらかさを今回の入力へ反映します。過去記録は変わりません。</small></label>
        <label class="field"><span>シューズ名・呼び名（任意）</span><input name="personalShoeLabel" type="text" maxlength="80" value="${escapeHtml(fields.personalShoeLabel || "")}" placeholder="例：いつもの黒い靴"></label>
        <div class="field-grid field-grid--two">
          <label class="field"><span>靴の種類</span><select name="personalShoeType">${renderOptions(SHOE_TYPE_OPTIONS, fields.personalShoeType)}</select></label>
          <label class="field"><span>やわらかさ</span><select name="personalShoeSoftness">${renderOptions(SHOE_SOFTNESS_OPTIONS, fields.personalShoeSoftness)}</select></label>
        </div>
      </section>

      <section class="form-section" aria-labelledby="personal-run-title"><div class="section-heading"><p>2. 本人の気づき</p><h2 id="personal-run-title">自分で感じた走り方</h2></div><p class="section-introduction">測定やフォーム判定ではありません。自分で気づいた内容だけを選びます。</p>
        <div class="field-grid field-grid--two">
          <label class="field"><span>足のつき方（感じた範囲）</span><select name="personalFootPlacement">${renderOptions(FOOT_PLACEMENT_OPTIONS, fields.personalFootPlacement)}</select></label>
          <label class="field"><span>歩幅・テンポ</span><select name="personalRhythmStride">${renderOptions(RHYTHM_STRIDE_OPTIONS, fields.personalRhythmStride)}</select></label>
        </div>
        <fieldset class="field-group"><legend>今日意識したこと・試したこと</legend><p class="field-help">本人が意識して行った内容だけを選びます。選ばなくても保存できます。</p><div class="choice-grid choice-grid--detail">${renderFocusTags(fields)}</div></fieldset>
      </section>

      <section class="form-section" aria-labelledby="personal-equipment-title"><div class="section-heading"><p>3. 装備</p><h2 id="personal-equipment-title">携行品と装備</h2></div><p class="section-introduction">数値結果には使わず、同じ条件の記録を探すために保存します。</p>
        <fieldset class="field-group"><legend>使用した装備・携行品</legend><div class="choice-grid choice-grid--detail">${renderEquipmentTags(fields)}</div></fieldset>
        <label class="field"><span>装備メモ（任意）</span><textarea name="personalEquipmentNote" maxlength="240" rows="3">${escapeHtml(fields.personalEquipmentNote || "")}</textarea></label>
      </section>

      <section class="form-section" aria-labelledby="personal-note-title"><div class="section-heading"><p>4. 自由メモ</p><h2 id="personal-note-title">本人の気づきメモ</h2></div>
        <label class="field"><span>本人の気づきメモ（任意）</span><textarea name="personalFreeNote" maxlength="240" rows="4" placeholder="例：足音を小さくするように走った">${escapeHtml(fields.personalFreeNote || "")}</textarea><small>文章メモは数値結果には使わず、見返しや相談用に残します。</small></label>
        <label class="choice-card"><input type="checkbox" name="saveCurrentShoePreset" value="1"><span><strong>今回のシューズを保存して次回も使う</strong><small>名前がある場合だけ、プロフィールの保存シューズへ追加します。</small></span></label>
      </section>

      <div class="form-submit-area"><div><strong>シューズと走り方のメモを入力へ反映</strong><p>分からない項目は、未入力のまま残せます。</p></div><div class="form-submit-actions"><button class="button button--primary" type="submit">入力へ反映して戻る</button><button class="button button--text" type="button" data-action="clear-personal-context">この補足記録を空にする</button></div></div>
    </form>
  </section>`;
}
