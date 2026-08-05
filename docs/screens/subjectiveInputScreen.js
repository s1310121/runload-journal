import { BODY_PARTS, BODY_PART_KEYS } from "../core/model/modelConstants.js";
import {
  BODY_AREA_GROUPS,
  BODY_AREA_LATERALITY,
  BODY_AREA_LATERALITY_LABELS,
  BODY_AREA_TAXONOMY,
} from "../core/model/v27/bodyAreaTaxonomy.js";
import { SAFETY_FLAG_KEYS } from "../core/safety/supportDecision.js";
import { escapeHtml, renderPageHeading } from "../ui/commonComponents.js";
import { loadRecordInputWorkspace } from "../ui/recordInputWorkspace.js";
import { BODY_PART_DISPLAY_NAMES, SAFETY_FLAG_LABELS } from "../ui/recordPresentation.js";
import { bodyRegionFamiliarName } from "../ui/bodyRegionTerminology.js";
import {
  enteredBodyAreasFromFields,
  enteredBodyPartsFromFields,
  mergeSubjectiveFields,
  resolveSubjectiveStatusFromFields,
  subjectiveSummaryFromFields,
} from "../ui/subjectivePresentation.js";

const FRONT = '<circle cx="150" cy="36" r="20"></circle><path d="M110 78 C120 66 135 60 150 60 C165 60 180 66 190 78 L204 126 C208 138 204 150 196 160 L182 176 L188 212 C192 228 190 246 184 262 L172 308 C168 324 166 340 166 356 L166 400 C166 410 158 418 148 418 C138 418 130 410 130 400 L130 356 C130 340 128 324 124 308 L112 262 C106 246 104 228 108 212 L114 176 L100 160 C92 150 88 138 92 126 Z"></path>';
const BACK = '<circle cx="150" cy="36" r="20"></circle><path d="M112 76 C122 66 136 60 150 60 C164 60 178 66 188 76 L202 124 C206 136 202 150 194 160 L182 174 L188 212 C192 228 190 244 184 262 L172 310 C168 326 166 342 166 358 L166 402 C166 412 158 420 148 420 C138 420 130 412 130 402 L130 358 C130 342 128 326 124 310 L112 262 C106 244 104 228 108 212 L114 174 L102 160 C94 150 90 136 94 124 Z"></path>';
const FOOT = '<path d="M114 78 C126 66 140 60 154 60 C172 60 186 72 194 92 C198 102 200 116 200 132 L200 238 C200 274 186 306 160 320 C150 326 140 326 130 320 C108 306 96 274 96 238 L96 132 C96 112 102 90 114 78 Z"></path>';

const REGIONAL_SUBJECTIVE_AREAS = Object.freeze([
  Object.freeze({ regionId: "BA-DISP-014", label: bodyRegionFamiliarName("BA-DISP-014"), areaId: "BFR-200-COX" }),
  Object.freeze({ regionId: "BA-DISP-015", label: bodyRegionFamiliarName("BA-DISP-015"), areaId: "BFR-210-GLU" }),
  Object.freeze({ regionId: "BA-DISP-016", label: bodyRegionFamiliarName("BA-DISP-016"), areaId: "BFR-220-ANT" }),
  Object.freeze({ regionId: "BA-DISP-018", label: bodyRegionFamiliarName("BA-DISP-018"), areaId: "BFR-220-POST" }),
  Object.freeze({ regionId: "BA-DISP-019", label: bodyRegionFamiliarName("BA-DISP-019"), areaId: "BFR-230-ANT" }),
  Object.freeze({ regionId: "BA-DISP-021", label: bodyRegionFamiliarName("BA-DISP-021"), areaId: "BFR-240-ANT" }),
  Object.freeze({ regionId: "BA-DISP-023", label: bodyRegionFamiliarName("BA-DISP-023"), areaId: "BFR-240-POST" }),
  Object.freeze({ regionId: "BA-DISP-024", label: bodyRegionFamiliarName("BA-DISP-024"), areaId: "BFR-250-ANT" }),
  Object.freeze({ regionId: "BA-DISP-025", label: bodyRegionFamiliarName("BA-DISP-025"), areaId: "BFR-250-POST" }),
  Object.freeze({ regionId: "BA-DISP-027", label: bodyRegionFamiliarName("BA-DISP-027"), areaId: "BFR-260-REAR" }),
  Object.freeze({ regionId: "BA-DISP-028", label: bodyRegionFamiliarName("BA-DISP-028"), areaId: "BFR-260-MID" }),
  Object.freeze({ regionId: "BA-DISP-029", label: bodyRegionFamiliarName("BA-DISP-029"), areaId: "BFR-260-FORE" }),
]);

const REGIONAL_AREA_IDS = new Set(REGIONAL_SUBJECTIVE_AREAS.map((item) => item.areaId));
const AREA_BY_ID = Object.freeze(Object.fromEntries(BODY_AREA_TAXONOMY.map((area) => [area.id, area])));

const SUBJECTIVE_MAP_VIEWS = Object.freeze([
  Object.freeze({ title: "前面", silhouette: FRONT, paths: Object.freeze([
    Object.freeze(["BFR-200-COX", "M120 142 C130 132 140 128 150 128 C160 128 170 132 180 142 L178 178 C168 184 160 188 150 188 C140 188 132 184 122 178 Z"]),
    Object.freeze(["BFR-220-ANT", "M122 190 C132 198 141 202 150 202 C159 202 168 198 178 190 L174 266 C164 274 158 278 150 278 C142 278 136 274 126 266 Z"]),
    Object.freeze(["BFR-230-ANT", "M126 270 C136 278 142 281 150 281 C158 281 164 278 174 270 L170 300 C162 306 157 309 150 309 C143 309 138 306 130 300 Z"]),
    Object.freeze(["BFR-240-ANT", "M130 306 C138 314 144 318 150 318 C156 318 162 314 170 306 L166 382 C160 390 156 394 150 394 C144 394 140 390 134 382 Z"]),
    Object.freeze(["BFR-250-ANT", "M135 386 L165 386 L166 416 L134 416 Z"]),
  ]) }),
  Object.freeze({ title: "後面", silhouette: BACK, paths: Object.freeze([
    Object.freeze(["BFR-210-GLU", "M120 138 C130 150 139 158 150 158 C161 158 170 150 180 138 L180 190 C170 200 160 205 150 205 C140 205 130 200 120 190 Z"]),
    Object.freeze(["BFR-220-POST", "M122 196 C132 204 141 209 150 209 C159 209 168 204 178 196 L174 274 C164 282 158 286 150 286 C142 286 136 282 126 274 Z"]),
    Object.freeze(["BFR-240-POST", "M128 288 C136 298 143 302 150 302 C157 302 164 298 172 288 L166 368 C160 378 156 383 150 383 C144 383 140 378 134 368 Z"]),
    Object.freeze(["BFR-250-POST", "M142 370 C146 378 148 382 150 382 C152 382 154 378 158 370 L158 416 H142 Z"]),
  ]) }),
  Object.freeze({ title: "足裏", silhouette: FOOT, paths: Object.freeze([
    Object.freeze(["BFR-260-FORE", "M112 92 C124 84 138 80 154 80 C174 80 188 94 190 120 L190 164 C174 170 158 172 140 168 C126 165 114 158 106 148 L106 120 C107 108 109 99 112 92 Z"]),
    Object.freeze(["BFR-260-MID", "M106 154 C120 166 136 172 154 172 C170 172 182 168 190 164 L190 252 C176 260 162 264 148 262 C130 260 116 252 104 240 L104 176 Z"]),
    Object.freeze(["BFR-260-REAR", "M104 240 C118 254 132 262 148 264 C164 266 178 260 190 252 C186 282 174 304 158 314 C148 320 138 318 128 312 C112 300 104 274 104 240 Z"]),
  ]) }),
]);

function safeReturnTo(context) {
  const value = String(context?.parameters?.get("returnTo") || "#/record-input");
  return value.startsWith("#/record-input") ? value : "#/record-input";
}

function checked(value) {
  return value === "1" || value === "on" || value === "true" || value === true
    ? " checked"
    : "";
}

function selected(value, expected) {
  return String(value ?? "") === String(expected) ? " selected" : "";
}

function intensityLabel(value = 0) {
  return ["記録しない", "1・わずか", "2・軽い", "3・中程度", "4・強い", "5・とても強い"][Number(value)] || "記録しない";
}

function lateralityOptions(currentValue = "UNKNOWN") {
  return Object.values(BODY_AREA_LATERALITY)
    .map((value) => `<option value="${value}"${selected(currentValue, value)}>${escapeHtml(BODY_AREA_LATERALITY_LABELS[value])}</option>`)
    .join("");
}

function normalizedScreenStatus(status = "") {
  if (status === "strong_reported") return "strong_reported";
  if (status === "discomfort_reported" || status === "fatigue_reported") return "discomfort_reported";
  if (status === "none_reported") return "none_reported";
  return "deferred";
}

function renderIntensityControl(area, label, fields, className = "") {
  const value = Number(fields[`bodyArea_${area.key}`] || 0);
  const laterality = fields[`bodyAreaLaterality_${area.key}`] || "UNKNOWN";
  return `<article id="subjective-region-${escapeHtml(area.key)}" class="subjective-region-control ${className}${value > 0 ? " is-selected" : ""}" data-body-area-field="${escapeHtml(area.id)}">
    <div class="subjective-region-control__heading"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(area.label)}</small></div><output for="body-area-${escapeHtml(area.key)}" data-body-area-value>${escapeHtml(intensityLabel(value))}</output></div>
    <label class="subjective-range-field"><span>気になる程度</span><input id="body-area-${escapeHtml(area.key)}" type="range" min="0" max="5" step="1" name="bodyArea_${escapeHtml(area.key)}" value="${escapeHtml(value)}" data-body-area-score data-body-area-id="${escapeHtml(area.id)}" aria-label="${escapeHtml(`${label}の気になる程度`)}"><span class="subjective-range-scale" aria-hidden="true"><small>記録しない</small><small>とても強い</small></span></label>
    <label class="field subjective-region-control__laterality" data-body-area-laterality-field${value > 0 ? "" : " hidden"}><span>左右</span><select name="bodyAreaLaterality_${escapeHtml(area.key)}" data-body-area-laterality aria-label="${escapeHtml(`${label}の左右`)}"${value > 0 ? "" : " disabled"}>${lateralityOptions(laterality)}</select></label>
  </article>`;
}

function renderSubjectiveBodyMap(fields) {
  return `<div class="subjective-body-map" role="group" aria-label="結果画面と同じ12部位の身体図から気になる場所を選ぶ">${SUBJECTIVE_MAP_VIEWS.map((view) => `<figure class="subjective-body-map__view"><figcaption>${escapeHtml(view.title)}</figcaption><svg viewBox="70 10 160 430" aria-hidden="false"><g class="body-map__silhouette">${view.silhouette}</g>${view.paths.map(([areaId, d]) => {
    const area = AREA_BY_ID[areaId];
    const item = REGIONAL_SUBJECTIVE_AREAS.find((candidate) => candidate.areaId === areaId);
    const value = Number(fields[`bodyArea_${area.key}`] || 0);
    return `<path tabindex="0" role="button" aria-pressed="${value > 0}" class="subjective-body-map__region${value > 0 ? " is-selected" : ""}" data-subjective-region-jump="${escapeHtml(area.key)}" data-intensity="${escapeHtml(value)}" d="${d}"><title>${escapeHtml(`${item?.label || area.label}：${intensityLabel(value)}`)}</title></path>`;
  }).join("")}</svg></figure>`).join("")}</div>`;
}

function renderRegionalControls(fields) {
  return `<div class="subjective-region-controls">${REGIONAL_SUBJECTIVE_AREAS.map((item) => {
    const area = AREA_BY_ID[item.areaId];
    return renderIntensityControl(area, item.label, fields, "subjective-region-control--regional");
  }).join("")}</div>`;
}

function renderOtherBodyAreaGroup(group, fields, selectedIds) {
  const areas = BODY_AREA_TAXONOMY.filter((area) => area.groupId === group.id && !REGIONAL_AREA_IDS.has(area.id));
  if (!areas.length) return "";
  const selectedCount = areas.filter((area) => selectedIds.has(area.id)).length;
  return `<details class="subjective-area-group"${selectedCount ? " open" : ""}>
    <summary><span><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(String(areas.length))}選択肢</small></span><span class="disclosure-status" data-body-area-group-count="${escapeHtml(group.id)}">${selectedCount ? `${selectedCount}部位入力中` : "未選択"}</span></summary>
    <div class="subjective-area-grid subjective-area-grid--range">${areas.map((area) => renderIntensityControl(area, area.label, fields, "subjective-region-control--other")).join("")}</div>
  </details>`;
}

function renderLegacyFields(fields, legacyParts) {
  const hidden = BODY_PARTS.map((bodyPart) => {
    const key = BODY_PART_KEYS[bodyPart];
    return `<input type="checkbox" name="reviewed_${escapeHtml(key)}" value="1"${checked(fields[`reviewed_${key}`])} hidden><input type="hidden" name="fatigue_${escapeHtml(key)}" value="${escapeHtml(fields[`fatigue_${key}`] || 0)}"><input type="hidden" name="discomfort_${escapeHtml(key)}" value="${escapeHtml(fields[`discomfort_${key}`] || 0)}">`;
  }).join("");
  const notice = legacyParts.length
    ? `<details class="legacy-subjective-notice"><summary>保存された身体記録 ${legacyParts.length}部位を確認</summary><div><p>${escapeHtml(legacyParts.map((bodyPart) => BODY_PART_DISPLAY_NAMES[bodyPart] || bodyPart).join("、"))}</p><p>この記録に含まれる入力をそのまま保持しています。必要な場合だけ今回の部位を追加できます。</p></div></details>`
    : "";
  return `${hidden}<input type="hidden" name="legacyTopBodyPart" value="${escapeHtml(fields.legacyTopBodyPart || "")}">${notice}`;
}

function renderConditionFlags(fields) {
  return SAFETY_FLAG_KEYS.map((flag) => `<label class="choice-card choice-card--safety"><input type="checkbox" name="safety_${escapeHtml(flag)}" value="1"${checked(fields[`safety_${flag}`])}><span>${escapeHtml(SAFETY_FLAG_LABELS[flag] || flag)}</span></label>`).join("");
}

export function renderSubjectiveInputScreen({ context }) {
  const returnTo = safeReturnTo(context);
  const workspace = loadRecordInputWorkspace();
  const fields = mergeSubjectiveFields(workspace?.fields || {}, {});
  const status = normalizedScreenStatus(resolveSubjectiveStatusFromFields(fields));
  const bodyEntryVisible = status === "discomfort_reported" || status === "strong_reported";
  const selectedAreas = enteredBodyAreasFromFields(fields);
  const selectedIds = new Set(selectedAreas.map((area) => area.id));
  const legacyParts = enteredBodyPartsFromFields(fields);
  const summary = subjectiveSummaryFromFields({ ...fields, subjectiveStatus: status, subjectiveDetailType: "" });

  return `<section class="screen screen--subjective-input">
    <nav class="context-navigation" aria-label="今回の身体記録入力内の移動"><a class="body-part-detail__back-link" href="${escapeHtml(returnTo)}">今日の記録へ戻る</a></nav>
    ${renderPageHeading({
      eyebrow: "本人の身体記録",
      title: "身体の記録を入力",
      description: "結果画面と同じ12部位の身体図から気になる場所を選び、必要な場合だけその他の場所を追加します。",
    })}
    <div class="safety-notice subjective-boundary-notice"><strong>本人の身体記録と数値結果は分けて保存します。</strong><p>身体図から選ぶ部位と程度は、本人が感じた内容の記録です。12部位の指数とは別に表示し、診断や走行可否の判定には使いません。</p></div>
    <form id="subjective-input-form" class="record-form subjective-input-form" data-return-to="${escapeHtml(returnTo)}" novalidate>
      <div class="form-messages" data-form-messages tabindex="-1" hidden></div>
      <section class="form-section" aria-labelledby="subjective-status-title"><div class="section-heading"><p>1. 入力状態</p><h2 id="subjective-status-title">今回の身体記録</h2></div><p class="section-introduction">入力しないまま保存できます。未入力を「特になし」へ置き換えません。</p>
        <fieldset class="choice-grid choice-grid--primary"><legend class="visually-hidden">今回の身体記録</legend>
          <label class="choice-card"><input type="radio" name="subjectiveStatus" value="deferred"${checked(status === "deferred")}><span><strong>今回は確認しない</strong><small>未確認のまま進めます</small></span></label>
          <label class="choice-card"><input type="radio" name="subjectiveStatus" value="none_reported"${checked(status === "none_reported")}><span><strong>確認したが部位は記録しない</strong><small>確認済みとして残します。「問題なし」という意味ではありません</small></span></label>
          <label class="choice-card"><input type="radio" name="subjectiveStatus" value="discomfort_reported"${checked(status === "discomfort_reported")}><span><strong>気になる場所を残す</strong><small>身体図から該当部位を選びます</small></span></label>
          <label class="choice-card choice-card--attention"><input type="radio" name="subjectiveStatus" value="strong_reported"${checked(status === "strong_reported")}><span><strong>相談したい内容を残す</strong><small>部位・体調情報・相談メモを整理します</small></span></label>
        </fieldset>
        <input type="hidden" name="subjectiveDetailType" value="">
      </section>

      <section class="form-section subjective-body-entry" data-subjective-body-entry${bodyEntryVisible ? "" : " hidden"} aria-labelledby="subjective-body-title"><div class="section-heading"><p>2. 気になる部位</p><h2 id="subjective-body-title">身体図から部位を選ぶ</h2></div>
        <p class="section-introduction">色の付いた場所を選ぶと、その部位の程度入力へ移動します。0は記録しない、1〜5は本人が感じた程度です。複数選択できます。</p>
        <p class="subjective-selection-summary" data-subjective-selection-summary><strong>${escapeHtml(selectedAreas.length ? `${selectedAreas.length}部位を入力中` : "部位は未選択です")}</strong><span>${escapeHtml(summary.description)}</span></p>
        <div class="subjective-body-map-layout">
          <div><p class="subjective-body-map-legend"><span aria-hidden="true"></span>青い濃さは本人が入力した程度を示します</p>${renderSubjectiveBodyMap(fields)}</div>
          <div class="field-grid field-grid--two subjective-observation-context"><label class="field"><span>気づいた時点（選択部位に共通・任意）</span><select name="bodyObservationTiming"><option value="UNKNOWN"${selected(fields.bodyObservationTiming || "UNKNOWN", "UNKNOWN")}>未設定</option><option value="PRE_RUN"${selected(fields.bodyObservationTiming, "PRE_RUN")}>走る前から</option><option value="DURING_RUN"${selected(fields.bodyObservationTiming, "DURING_RUN")}>走行中</option><option value="IMMEDIATE_POST"${selected(fields.bodyObservationTiming, "IMMEDIATE_POST")}>走行直後</option><option value="LATER"${selected(fields.bodyObservationTiming, "LATER")}>しばらく後</option></select></label><label class="field"><span>感じ方（選択部位に共通・任意）</span><select name="bodyObservationSensation"><option value="NOT_SELECTED"${selected(fields.bodyObservationSensation || "NOT_SELECTED", "NOT_SELECTED")}>未設定</option><option value="FATIGUE"${selected(fields.bodyObservationSensation, "FATIGUE")}>疲れ・だるさ</option><option value="TIGHTNESS"${selected(fields.bodyObservationSensation, "TIGHTNESS")}>張り・硬さ</option><option value="DISCOMFORT"${selected(fields.bodyObservationSensation, "DISCOMFORT")}>気になる感じ</option><option value="OTHER"${selected(fields.bodyObservationSensation, "OTHER")}>その他</option></select></label></div><label class="field subjective-observation-note"><span>選択部位の補足（共通・任意）</span><textarea name="bodyObservationNote" maxlength="240" rows="3" placeholder="例：階段では気にならない、走行後に少し張った">${escapeHtml(fields.bodyObservationNote || "")}</textarea><small>複数部位を選んだ場合は共通メモとして保存します。数値結果とは別に表示します。</small></label>
        </div>
        <section class="subjective-regional-section" aria-labelledby="subjective-regional-controls-title"><div class="section-heading section-heading--compact"><p>結果画面と同じ区分</p><h3 id="subjective-regional-controls-title">12部位の程度</h3></div>${renderRegionalControls(fields)}</section>
        <details class="subjective-other-areas"><summary>上肢・体幹・より詳しい場所を追加</summary><div><p>12部位に含まれない上肢・体幹や、膝の後ろ・足の甲などを記録する場合だけ開きます。</p><div class="subjective-area-groups">${BODY_AREA_GROUPS.map((group) => renderOtherBodyAreaGroup(group, fields, selectedIds)).join("")}</div></div></details>
        ${renderLegacyFields(fields, legacyParts)}
      </section>

      <section class="form-section safety-details" data-safety-details${status === "strong_reported" ? "" : " hidden"} aria-labelledby="subjective-condition-title"><div class="section-heading"><p>3. 伝えたい体調情報</p><h2 id="subjective-condition-title">本人が伝えたい体調情報</h2></div>
        <div class="safety-notice"><strong>数値結果は身体状態や緊急性を判定しません。</strong><p>相談相手へそのまま伝えたい事実だけを選んでください。</p></div>
        <fieldset class="field-group"><legend>当てはまる内容</legend><div class="choice-grid choice-grid--safety">${renderConditionFlags(fields)}</div></fieldset>
        <label class="choice-card"><input type="checkbox" name="unexpectedSymptom" value="1"${checked(fields.unexpectedSymptom)}><span>いつもと違う、説明しにくい症状がある</span></label>
        <div class="field-grid field-grid--two"><label class="field"><span>感じたタイミング</span><input name="symptomTiming" type="text" maxlength="40" value="${escapeHtml(fields.symptomTiming || "")}" placeholder="例：走行中、走行後"></label><label class="field"><span>いつから</span><input name="symptomStartedWhen" type="text" maxlength="40" value="${escapeHtml(fields.symptomStartedWhen || "")}" placeholder="例：今日から、数日前から"></label></div>
        <label class="field"><span>補足（任意）</span><textarea name="symptomNote" maxlength="320" rows="4">${escapeHtml(fields.symptomNote || "")}</textarea></label>
      </section>

      <section class="form-section" aria-labelledby="subjective-note-title"><div class="section-heading"><p>4. 相談メモ</p><h2 id="subjective-note-title">相談メモ</h2></div><label class="field"><span>コーチや指導者へ確認したいこと（任意）</span><textarea name="consultationNote" maxlength="500" rows="4" placeholder="質問したいことや、次回確認してほしいことを残せます。">${escapeHtml(fields.consultationNote || "")}</textarea></label></section>

      <section class="form-submit-area" aria-labelledby="subjective-apply-title"><div><strong id="subjective-apply-title">入力画面へ反映</strong><p>ここでは記録を確定しません。今日の記録へ戻り、内容を確認して保存します。</p></div><div class="form-submit-actions"><button class="button button--primary" type="submit">入力内容を反映して戻る</button><a class="button button--secondary" href="${escapeHtml(returnTo)}">変更せず戻る</a></div></section>
    </form>
  </section>`;
}
