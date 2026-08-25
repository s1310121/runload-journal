import { buildPrivacyOverview, PRIVACY_OVERVIEW_VERSION } from "../core/privacy/privacyInventory.js";
import { escapeHtml, renderPageHeading, renderStatusLabel } from "../ui/commonComponents.js";

function renderStorageGroups(groups = []) {
  return `<div class="privacy-storage-grid">${groups.map((group) => `<article class="privacy-storage-card"><div class="privacy-storage-card__heading"><h3>${escapeHtml(group.label)}</h3>${renderStatusLabel(group.status, "neutral")}</div><p>${escapeHtml(group.description)}</p></article>`).join("")}</div>`;
}

function renderLocalStorageSection(overview) {
  return `<section class="privacy-section" aria-labelledby="privacy-local-title"><div class="section-heading"><p>端末内保存</p><h2 id="privacy-local-title">このブラウザーに保存するもの</h2><p>記録は、同じ端末・同じブラウザーで見返せるよう端末内に保存します。</p></div><details class="privacy-disclosure"><summary>保存される内容を確認</summary><div class="privacy-disclosure__body">${renderStorageGroups(overview.storageGroups)}</div></details><aside class="privacy-note"><p><strong>ブラウザーやOSでサイトデータを削除すると、端末内の記録も失われることがあります。</strong></p><p>重要な記録は、必要なときに設定画面からバックアップしてください。</p></aside></section>`;
}

function renderTemporarySection() {
  return `<section class="privacy-section" aria-labelledby="privacy-temporary-title"><div class="section-heading"><p>一時保持</p><h2 id="privacy-temporary-title">入力途中の内容</h2><p>入力画面を往復するときだけ、一時的に保持する情報があります。</p></div><details class="privacy-disclosure"><summary>一時データの扱いを確認</summary><div class="privacy-disclosure__body"><div class="privacy-explanation-card"><p>コース、本人入力、シューズの補助画面を開いて入力画面へ戻る間は、入力途中の内容を一時的に保持します。</p><p>入力関連画面の外へ移動したとき、記録を保存したとき、または「このアプリの端末内データを削除」を実行したときに消去します。ブラウザーの動作によっては、タブを閉じるまで残る場合があります。</p></div></div></details></section>`;
}

function renderNoAutomaticCollectionSection() {
  return `<section class="privacy-section" aria-labelledby="privacy-not-collected-title"><div class="section-heading"><p>自動取得・送信</p><h2 id="privacy-not-collected-title">外部へ自動送信しません</h2><p>入力・保存した記録を、RunLoadが外部サーバーへ自動送信することはありません。</p></div><details class="privacy-disclosure"><summary>自動取得・送信しない内容を確認</summary><div class="privacy-disclosure__body"><ul class="privacy-check-list"><li>GPS位置情報、外部アカウント、地図画像、標高グラフ</li><li>外部の解析サービスへの記録送信</li><li>相談メモの自動送信・外部保存</li><li>バックグラウンドでの記録アップロード</li></ul><p class="source-boundary">オフラインで画面を開きやすくするために保存されるアプリの表示データにも、利用者の記録を送信する機能はありません。</p></div></details></section>`;
}

function renderExternalLinksSection() {
  return `<section class="privacy-section" aria-labelledby="privacy-external-title"><div class="section-heading"><p>外部リンク</p><h2 id="privacy-external-title">別のサイトや電話機能を開く場合</h2><p>外部リンクを選んだときだけ、RunLoadとは別の機能やサイトを開きます。</p></div><details class="privacy-disclosure"><summary>外部リンクと電話リンクの扱いを確認</summary><div class="privacy-disclosure__body"><div class="privacy-explanation-grid"><article><h3>外部サイト</h3><p>地図、公開論文、公的案内などのリンクを選ぶと、RunLoadとは別のサイトが新しいタブで開きます。RunLoadの端末内記録をURLへ自動追加したり、外部サイトへ送信したりしません。</p><p>開いた先では、そのサイトの通信・Cookie・プライバシー方針が適用されます。</p></article><article><h3>電話リンク</h3><p>119や#7119の電話リンクを選ぶと、対応端末では電話機能が開きます。RunLoadから自動発信せず、発信操作は端末側で行います。RunLoadは通話内容、通話履歴、電話番号を取得・保存しません。</p></article></div></div></details></section>`;
}

function renderBackupSection() {
  return `<section class="privacy-section" aria-labelledby="privacy-backup-title"><div class="section-heading"><p>バックアップ</p><h2 id="privacy-backup-title">JSONファイルとして保存</h2><p><strong>バックアップは平文JSONで、パスワード保護や暗号化はありません。</strong></p></div><details class="privacy-disclosure"><summary>バックアップに含まれる内容を確認</summary><div class="privacy-disclosure__body"><div class="privacy-explanation-card"><p>「バックアップを保存」を選んだときだけ、走行・休養記録、保存済み結果、本人入力、予定、記録ノート、任意プロフィール、表示設定、下書き、保存コースをJSONファイルへ書き出します。</p><p>内容を読める人へ共有しない場所で保管してください。</p><p>作成したファイルは端末のダウンロード先など、ブラウザーが選んだ場所に保存されます。RunLoadが自動でクラウドへアップロードすることはありません。</p></div></div></details></section>`;
}

function renderDeleteSection() {
  return `<section class="privacy-section" aria-labelledby="privacy-delete-title"><div class="section-heading"><p>変更と削除</p><h2 id="privacy-delete-title">何が変わり、何が残るか</h2></div><div class="privacy-explanation-grid"><article><h3>プロフィールや設定を変更したとき</h3><p>次回以降の表示・入力候補へ反映します。すでに保存した記録のプロフィール、コース、シューズなどの保存時点の内容や保存済み数値結果は自動で書き換えません。</p></article><article><h3>アプリ内の「すべて削除」</h3><p>RunLoadが保存した記録、結果、本人入力、予定、ノート、プロフィール、設定、下書き、保存コース、一時入力、復元前の自動バックアップを削除します。</p><p>すでに端末へ書き出したJSONファイルは削除しません。</p></article></div><div class="screen-actions"><a class="button button--primary" href="#/settings?section=data">バックアップ・復元・削除を開く</a><a class="button button--secondary" href="#/settings">設定へ戻る</a></div></section>`;
}

export function renderPrivacyScreen({ services }) {
  const overview = buildPrivacyOverview(services);
  return `<section class="screen screen--privacy" data-privacy-overview-version="${escapeHtml(PRIVACY_OVERVIEW_VERSION)}">
    ${renderPageHeading({
      eyebrow: "データとプライバシー",
      title: "保存される情報と外部との境界を確認する",
      description: "RunLoadが端末内に保存する内容、外部リンク、バックアップ、削除範囲を一か所で確認できます。",
    })}
    <aside class="editorial-boundary privacy-primary-boundary"><p><strong>RunLoadの記録保存は、この端末のブラウザー内が基本です。</strong></p><p>利用者が明示的に外部リンク、電話、バックアップ保存、コピーを選ばない限り、入力内容や保存記録を外部へ自動送信しません。</p></aside>
    ${renderLocalStorageSection(overview)}
    ${renderTemporarySection()}
    ${renderNoAutomaticCollectionSection()}
    ${renderExternalLinksSection()}
    ${renderBackupSection()}
    ${renderDeleteSection()}
    <footer class="source-boundary privacy-footer"><p>この画面は、現在のアプリで実際に行う保存・通信の境界を説明するものです。法的な同意取得や医療情報管理制度への適合を示すものではありません。</p></footer>
  </section>`;
}
