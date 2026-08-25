import { renderManagementBoundary } from "../ui/screenArchitecture.js";
import {
  APPEARANCE_MODE_OPTIONS,
  COLOR_THEME_OPTIONS,
  EXTERNAL_LINK_DISPLAY_OPTIONS,
  RESULT_DISPLAY_MODE_OPTIONS,
  REGIONAL_PREVIOUS_COMPARISON_OPTIONS,
  REGIONAL_RESULT_INITIAL_VIEW_OPTIONS,
  TEXT_SIZE_OPTIONS,
  normalizeJournalSettings,
} from "../ui/appSettings.js";
import { escapeHtml, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";
import { PROFILE_AGE_BAND_OPTIONS } from "../core/model/bodyProfileAdjustment.js";
import { RUNNING_GOAL_OPTIONS } from "../core/personal/runningGoalSupport.js";

function renderRadioGroup({ name, legend, currentValue, options }) {
  return `<fieldset class="settings-fieldset"><legend>${escapeHtml(legend)}</legend><div class="settings-option-grid">${options.map((option) => {
    const checked = option.value === currentValue ? " checked" : "";
    return `<label class="settings-option"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.value)}"${checked}><span><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.description)}</small></span></label>`;
  }).join("")}</div></fieldset>`;
}

function renderDataOverview({ services, storageStatus }) {
  const records = services.storage.records.loadAll();
  const plans = services.storage.plans.loadAll();
  const draft = services.storage.draft.load();
  const courseCount = services.storage.courses.loadAll().length;
  return `<section class="settings-data-overview" aria-labelledby="settings-data-overview-title"><div class="result-card__heading"><div><p>端末内の保存状態</p><h3 id="settings-data-overview-title">現在のデータ</h3></div>${renderStatusLabel(storageStatus.ok ? "端末内保存を確認" : "保存領域を要確認", storageStatus.ok ? "success" : "attention")}</div><dl class="finish-facts"><div><dt>走行・休養記録</dt><dd>${records.length}件</dd></div><div><dt>保存した予定</dt><dd>${plans.length}件</dd></div><div><dt>保存したコース</dt><dd>${courseCount}件</dd></div><div><dt>入力途中</dt><dd>${draft ? "下書きあり" : "なし"}</dd></div></dl><p class="muted-text">ブラウザーを閉じても保存済みデータは残ります。重要な記録は必要なときにバックアップしてください。</p></section>`;
}

function renderDataManagement({ services, context }) {
  const storageStatus = services.storage.gateway.probe();
  const open = context?.parameters?.get("section") === "data" ? " open" : "";
  return `<details class="settings-data-management history-detail-disclosure"${open}><summary><span><small>端末内データ</small><strong>バックアップ・取込・削除</strong><em>通常は閉じたままで利用できます。</em></span><span class="history-detail-disclosure__cue">必要なときだけ開く</span></summary><div class="settings-data-management__body history-record-browser__body">
    ${renderDataOverview({ services, storageStatus })}
    <section class="data-management" aria-labelledby="backup-title"><div class="section-heading"><p>バックアップ</p><h2 id="backup-title">保存と復元</h2></div><p>自分で操作したときだけ平文JSONファイルを作成します。保存したコースを含み、外部サーバーへ自動送信しません。ファイルにはRunLoadによるパスワード保護や暗号化はありません。</p><div class="screen-actions"><button class="button button--secondary" type="button" data-action="export-backup">バックアップを保存</button><label class="button button--text" for="restore-backup-file">バックアップを選択して内容を確認</label><input id="restore-backup-file" data-action="restore-backup" type="file" accept="application/json,.json" class="visually-hidden"></div><div class="restore-preview-host" data-restore-preview-host aria-live="polite"><p class="muted-text">ファイルを選ぶと、保存内容と件数を確認してから復元できます。</p></div></section>
    <details class="danger-zone"><summary><span><small>削除</small><strong>このアプリの端末内データを削除</strong><em>削除する内容を確認してから実行します。</em></span><span class="danger-zone__cue">確認して開く</span></summary><div class="danger-zone__body"><p>走行・休養記録、保存済み結果、本人入力、予定、保存したコース、記録ノート、プロフィール、設定、下書き、復元前の自動バックアップ、取込・破損値の退避を削除します。入力関連画面の一時保存も削除します。端末へ書き出したJSONファイルは削除しません。</p><label class="field"><span>確認のため「削除」と入力</span><input id="clear-data-confirmation" autocomplete="off"></label><button class="button button--danger" type="button" data-action="clear-all-user-data">すべて削除</button></div></details>
    <div class="form-messages" data-data-management-messages role="status" aria-live="polite" tabindex="-1" hidden></div>
  </div></details>`;
}

function renderSavedShoes(settings = {}) {
  const savedShoes = Array.isArray(settings.savedShoes) ? settings.savedShoes : [];
  if (!savedShoes.length) {
    return '<p class="muted-text">保存シューズはまだありません。走行入力の「シューズと走り方のメモ」から追加できます。</p>';
  }
  return `<ul class="profile-saved-shoes">${savedShoes.map((shoe) => `<li><div><strong>${escapeHtml(shoe.label || "名称なし")}</strong><small>${escapeHtml([shoe.type, shoe.softness].filter(Boolean).join("・") || "種類・やわらかさ未設定")}</small></div><button class="button button--text" type="button" data-action="remove-saved-shoe" data-shoe-id="${escapeHtml(shoe.id || "")}">保存シューズから削除</button></li>`).join("")}</ul>`;
}

function renderReusableProfile(profile = {}, settings = {}) {
  const goals = new Set(Array.isArray(profile.runningGoalTags) ? profile.runningGoalTags : []);
  return `<section class="form-section" aria-labelledby="settings-profile-title">
    <div class="section-heading"><p>使い回す任意情報</p><h2 id="settings-profile-title">振り返りプロフィール</h2><p>記録を探す条件と、コラム・記録ノート・活用画面の任意の入口に使います。保存時には、その時点の内容も記録に残します。</p></div>
    <div class="source-boundary settings-boundary"><p><strong>数値結果には使いません。</strong> 12部位の比較値や傷害・安全の判断へ、身長・体重・年齢帯・性別・経験・目的を一律の補正値として掛けません。</p><p>すべて任意で、空欄のまま利用できます。</p></div>
    <div class="field-grid field-grid--two">
      <label class="field"><span>ランニング開始時期（任意）</span><input name="runningStartDateOrBand" maxlength="80" value="${escapeHtml(profile.runningStartDateOrBand || "")}" placeholder="例：2026年春、3か月前"><small>似た時期の記録や相談用説明に使います。</small></label>
      <label class="field"><span>本人の経験認識（任意）</span><select name="experienceSelfAssessment"><option value=""${!profile.experienceSelfAssessment ? " selected" : ""}>未設定</option><option value="始めたばかり"${profile.experienceSelfAssessment === "始めたばかり" ? " selected" : ""}>始めたばかり</option><option value="まだ慣れていない"${profile.experienceSelfAssessment === "まだ慣れていない" ? " selected" : ""}>まだ慣れていない</option><option value="少し慣れてきた"${profile.experienceSelfAssessment === "少し慣れてきた" ? " selected" : ""}>少し慣れてきた</option><option value="自分なりに継続している"${profile.experienceSelfAssessment === "自分なりに継続している" ? " selected" : ""}>自分なりに継続している</option></select></label>
    </div>
    <fieldset class="field-group"><legend>記録を続ける主な目的（任意）</legend><div class="checkbox-grid checkbox-grid--balanced-six">${RUNNING_GOAL_OPTIONS.map(({ value, label }) => `<label><input type="checkbox" name="runningGoalTags" value="${value}"${goals.has(value) ? " checked" : ""}><span>${label}</span></label>`).join("")}</div><p class="inline-helper">複数選択できます。数値や安全判断には使わず、読みもの・ノート・予定への入口だけに使います。</p></fieldset>
    <details class="settings-advanced"><summary><span><strong>身体に関する任意情報</strong><small>必要な場合だけ入力します。数値結果は変わりません。</small></span></summary><div class="settings-advanced__body">
      <div class="field-grid field-grid--two">
        <label class="field"><span>身長（cm・任意）</span><input name="profileHeightCm" type="number" inputmode="decimal" min="100" max="230" step="0.1" value="${escapeHtml(profile.heightCm ?? "")}"><small>記録の文脈として保存するだけで、12部位の比較値へ一律の補正値として掛けません。</small></label>
        <label class="field"><span>体重（kg・任意）</span><input name="profileWeightKg" type="number" inputmode="decimal" min="25" max="180" step="0.1" value="${escapeHtml(profile.weightKg ?? "")}"><small>記録の文脈として保存するだけで、数値結果には使いません。</small></label>
        <label class="field"><span>年齢帯（任意）</span><select name="profileAgeBand"><option value="">未設定・回答しない</option>${PROFILE_AGE_BAND_OPTIONS.map((item) => `<option value="${escapeHtml(item.key)}"${item.key === profile.ageBand ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select><small>資料の対象範囲を説明するときの文脈に限定します。</small></label>
        <label class="field"><span>性別関連入力（任意）</span><select name="profileSex"><option value="">未設定・回答しない</option><option value="male"${profile.sex === "male" ? " selected" : ""}>男性区分</option><option value="female"${profile.sex === "female" ? " selected" : ""}>女性区分</option></select><small>回答は任意です。個人補正、診断、性別判定には使いません。</small></label>
      </div>
    </div></details>
    <details class="settings-advanced"><summary><span><strong>保存シューズ</strong><small>次回の入力で呼び出す候補を管理します。</small></span></summary><div class="settings-advanced__body"><p>削除しても、過去記録に保存されたシューズ情報は変わりません。</p>${renderSavedShoes(settings)}</div></details>
  </section>`;
}

export function renderSettingsScreen({ services, context }) {
  const settings = normalizeJournalSettings(services.storage.settings.load());
  const profile = services.storage.profile.load();
  const saved = context?.parameters?.get("status") === "saved";
  return `<section class="screen screen--settings">
    ${renderPageHeading({
      eyebrow: "設定と管理",
      title: "表示と端末内データを管理する",
      description: "日常的な表示設定を先に、バックアップや削除は必要なときだけ開きます。数値結果は変わりません。",
    })}
    ${renderManagementBoundary()}
    <p class="screen-boundary-note">表示設定は保存済み記録、数値結果、過去比較の方法を変更しません。データ管理は利用者が明示的に操作したときだけ実行します。</p>
    <section class="settings-privacy-entry" aria-labelledby="settings-privacy-entry-title"><div><p>保存と外部との境界</p><h2 id="settings-privacy-entry-title">データとプライバシー</h2><p>端末内に保存する内容、外部リンク、バックアップ、削除範囲を一か所で確認できます。</p></div><a class="button button--secondary" href="#/privacy">内容を確認する</a></section>
    ${saved ? '<div class="data-message data-message--success" role="status">設定を保存しました。</div>' : ""}
    <form id="journal-settings-form" class="record-form settings-form" novalidate>
      ${renderReusableProfile(profile, settings)}
      <section class="form-section" aria-labelledby="settings-reading-title">
        <div class="section-heading"><p>1. 読みやすさ</p><h2 id="settings-reading-title">読みやすさ</h2><p>端末の表示と文字サイズを選びます。</p></div>
        ${renderRadioGroup({ name: "appearanceMode", legend: "明るさ", currentValue: settings.appearanceMode, options: APPEARANCE_MODE_OPTIONS })}
        ${renderRadioGroup({ name: "textSize", legend: "文字サイズ", currentValue: settings.textSize, options: TEXT_SIZE_OPTIONS })}
        <details class="settings-advanced"><summary><span><strong>配色を選ぶ</strong><small>情報の役割は見出しとラベルでも区別します。</small></span></summary><div class="settings-advanced__body">${renderRadioGroup({ name: "colorTheme", legend: "カラーテーマ", currentValue: settings.colorTheme, options: COLOR_THEME_OPTIONS })}</div></details>
      </section>

      <section class="form-section" aria-labelledby="settings-result-title">
        <div class="section-heading"><p>2. 結果画面</p><h2 id="settings-result-title">結果画面</h2><p>12部位の最初の見せ方と、自分の過去記録との比較表示を選びます。</p></div>
        ${renderRadioGroup({ name: "regionalResultInitialView", legend: "12部位の最初の表示", currentValue: settings.regionalResultInitialView, options: REGIONAL_RESULT_INITIAL_VIEW_OPTIONS })}
        ${renderRadioGroup({ name: "showRegionalPreviousComparison", legend: "自分の過去記録との比較", currentValue: settings.showRegionalPreviousComparison ? "show" : "hide", options: REGIONAL_PREVIOUS_COMPARISON_OPTIONS })}
        <p class="inline-helper">自分の過去記録との比較は、同じ部位・同じ基準など、同じ意味で比べられる最新記録がある場合だけ割合を表示し、増減へ良し悪しを付けません。</p>
        <details class="settings-advanced"><summary><span><strong>結果全体の並びを選ぶ</strong><small>通常は標準表示のままで利用できます。</small></span></summary><div class="settings-advanced__body">${renderRadioGroup({ name: "resultDisplayMode", legend: "結果画面の表示タイプ", currentValue: settings.resultDisplayMode, options: RESULT_DISPLAY_MODE_OPTIONS })}</div></details>
      </section>

      <section class="form-section" aria-labelledby="settings-support-title">
        <div class="section-heading"><p>3. 補助リンク</p><h2 id="settings-support-title">外部確認リンク</h2><p>距離や坂道を自分で確認するときのリンク表示を選びます。</p></div>
        <details class="settings-advanced"><summary><span><strong>外部リンクの表示を変更</strong><small>標準では必要なときだけ開きます。</small></span></summary><div class="settings-advanced__body">${renderRadioGroup({ name: "externalLinkDisplay", legend: "外部確認リンク", currentValue: settings.externalLinkDisplay, options: EXTERNAL_LINK_DISPLAY_OPTIONS })}<div class="source-boundary settings-boundary"><p>RunLoadはGPS、外部アカウント、地図画像、標高グラフを取得・保存しません。</p><p>外部サイトで確認したうち、分かる事実だけを手入力します。</p></div></div></details>
      </section>

      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      <section class="form-submit-area" aria-labelledby="settings-save-title"><div><strong id="settings-save-title">表示とプロフィールを保存</strong><p>表示設定と任意プロフィールを端末内に保存します。数値結果は変わりません。</p></div><div class="form-submit-actions"><button class="button button--primary" type="submit">表示とプロフィールを保存する</button><button class="button button--secondary" type="button" data-action="reset-journal-settings">標準設定に戻す</button></div></section>
    </form>
    ${renderDataManagement({ services, context })}
  </section>`;
}
