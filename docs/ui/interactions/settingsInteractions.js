import { normalizeBodyProfile } from "../../core/model/bodyProfileAdjustment.js";
import { STORAGE_KEYS } from "../../core/storage/storageKeys.js";
import { DEFAULT_JOURNAL_SETTINGS, applyJournalSettings, mergeJournalSettings } from "../appSettings.js";
import { downloadJsonText } from "./browserUtilities.js";
import { showDataMessage, showFormMessages } from "./formUtilities.js";
import { clearRecordInputWorkspace } from "../recordInputWorkspace.js";
import { renderRestoreInspection } from "../restorePreviewPresentation.js";

function readSettingsForm(form) {
  const data = new FormData(form);
  return {
    appearanceMode: String(data.get("appearanceMode") || "system"),
    colorTheme: String(data.get("colorTheme") || "standard"),
    textSize: String(data.get("textSize") || "standard"),
    externalLinkDisplay: String(data.get("externalLinkDisplay") || "as-needed"),
    resultDisplayMode: String(data.get("resultDisplayMode") || "standard"),
    regionalResultInitialView: String(data.get("regionalResultInitialView") || "focus"),
    showRegionalPreviousComparison: String(data.get("showRegionalPreviousComparison") || "show") === "show",
  };
}

function readProfileForm(form) {
  const data = new FormData(form);
  return {
    sex: String(data.get("profileSex") || ""),
    ageBand: String(data.get("profileAgeBand") || ""),
    heightCm: String(data.get("profileHeightCm") || ""),
    weightKg: String(data.get("profileWeightKg") || ""),
    runningStartDateOrBand: String(data.get("runningStartDateOrBand") || ""),
    experienceSelfAssessment: String(data.get("experienceSelfAssessment") || ""),
    runningGoalTags: data.getAll("runningGoalTags").map(String),
    updatedAt: new Date().toISOString(),
  };
}

function saveSettings(services, settingsUpdate) {
  const current = services.storage.settings.load();
  const next = mergeJournalSettings(current, settingsUpdate);
  const result = services.storage.settings.save(next);
  if (!result.ok) return { ...result, settings: next };
  applyJournalSettings(next);
  return { ok: true, settings: next };
}

export function saveSettingsAndProfile(services, settingsUpdate, profileUpdate) {
  const current = services.storage.settings.load();
  const nextSettings = mergeJournalSettings(current, settingsUpdate);
  const nextProfile = normalizeBodyProfile(profileUpdate);
  const result = services.storage.gateway.transact([
    { key: STORAGE_KEYS.settings, value: nextSettings },
    { key: STORAGE_KEYS.profile, value: nextProfile },
  ]);
  if (!result.ok) return result;
  applyJournalSettings(nextSettings);
  return { ok: true, settings: nextSettings, profile: nextProfile };
}

function bindDataManagement({ services, router, rerender }) {
  let pendingRestoreInspection = null;
  const previewHost = document.querySelector("[data-restore-preview-host]");
  const fileInput = document.querySelector('[data-action="restore-backup"]');

  function clearRestorePreview() {
    pendingRestoreInspection = null;
    if (fileInput) fileInput.value = "";
    if (previewHost) {
      previewHost.innerHTML = '<p class="muted-text">ファイルを選ぶと、保存内容と件数を確認してから復元できます。</p>';
    }
  }

  function bindRestorePreviewActions() {
    const confirmButton = previewHost?.querySelector('[data-action="confirm-restore-backup"]');
    const acknowledgement = previewHost?.querySelector("[data-restore-review-ack]");
    acknowledgement?.addEventListener("change", () => {
      if (confirmButton) confirmButton.disabled = !acknowledgement.checked;
    });
    previewHost?.querySelector('[data-action="cancel-restore-preview"]')?.addEventListener("click", clearRestorePreview);
    confirmButton?.addEventListener("click", () => {
      if (!pendingRestoreInspection) {
        showDataMessage("復元前の検査をやり直してください。", "error");
        return;
      }
      const acceptReview = pendingRestoreInspection.requiresAcknowledgement
        ? Boolean(acknowledgement?.checked)
        : true;
      if (!acceptReview) {
        showDataMessage("要確認の内容を確認してください。", "error");
        return;
      }
      if (!window.confirm("現在の端末内データを自動バックアップしてから、この内容を復元しますか？")) return;
      const result = services.storage.backup.restoreInspectedBackup(pendingRestoreInspection, { acceptReview });
      if (result.ok) {
        clearRecordInputWorkspace();
        rerender();
        showDataMessage("バックアップを復元しました。復元前の端末内データは自動バックアップとして残しています。");
      } else {
        showDataMessage(result.message || "復元できませんでした。", "error");
      }
    });
  }

  document.querySelector('[data-action="export-backup"]')?.addEventListener("click", () => {
    const exported = services.storage.backup.tryExportBackupText();
    if (!exported.ok) {
      showDataMessage(exported.message || "バックアップファイルを作成できませんでした。", "error");
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadJsonText(`running-journal-backup-${date}.json`, exported.text);
    showDataMessage("バックアップファイルを作成しました。");
  });
  fileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const inspection = await services.storage.backup.inspectBackupFile(file);
    pendingRestoreInspection = inspection.canRestore ? inspection : null;
    if (previewHost) {
      previewHost.innerHTML = renderRestoreInspection(inspection, file.name);
      previewHost.querySelector("[tabindex]")?.focus();
      bindRestorePreviewActions();
    }
    showDataMessage(
      inspection.status === "SUPPORTED"
        ? "復元前の検査が完了しました。内容を確認して復元してください。"
        : inspection.status === "REVIEW_REQUIRED"
          ? "要確認の内容があります。内容を読んでから復元してください。"
          : "このバックアップは復元できません。検査結果を確認してください。",
      inspection.canRestore ? "success" : "error",
    );
  });
  document.querySelector('[data-action="clear-all-user-data"]')?.addEventListener("click", () => {
    const confirmation = document.getElementById("clear-data-confirmation")?.value || "";
    if (confirmation !== "削除") {
      showDataMessage("確認欄へ「削除」と入力してください。", "error");
      return;
    }
    if (!window.confirm("このアプリの端末内データをすべて削除しますか？")) return;
    const result = services.dataManagement.clearAllUserData();
    if (result.ok) {
      clearRecordInputWorkspace();
      router.navigateToScreen("home");
    }
    else showDataMessage("データを削除できませんでした。", "error");
  });
}
function bindSavedShoeManagement({ services, router }) {
  document.querySelectorAll('[data-action="remove-saved-shoe"]').forEach((button) => {
    button.addEventListener("click", () => {
      const shoeId = String(button.dataset.shoeId || "");
      if (!shoeId) return;
      if (!window.confirm("この保存シューズを候補から削除しますか？過去記録は変更されません。")) return;
      const current = services.storage.settings.load();
      const savedShoes = (Array.isArray(current.savedShoes) ? current.savedShoes : [])
        .filter((item) => String(item?.id || "") !== shoeId);
      const result = services.storage.settings.save({ ...current, savedShoes });
      if (!result.ok) {
        window.alert("保存シューズを削除できませんでした。端末の保存状態を確認してください。");
        return;
      }
      router.navigateToScreen("settings", { status: "saved" });
    });
  });
}

export function bindSettings({ services, router, rerender }) {
  const form = document.getElementById("journal-settings-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = saveSettingsAndProfile(services, readSettingsForm(form), readProfileForm(form));
    if (!result.ok) {
      showFormMessages(form, ["表示とプロフィールを保存できませんでした。端末の空き容量とブラウザーの保存許可を確認してください。"]);
      return;
    }
    router.navigateToScreen("settings", { status: "saved" });
  });
  form?.querySelector('[data-action="reset-journal-settings"]')?.addEventListener("click", () => {
    const result = saveSettings(services, DEFAULT_JOURNAL_SETTINGS);
    if (!result.ok) {
      showFormMessages(form, ["標準設定を保存できませんでした。端末の保存状態を確認してください。"]);
      return;
    }
    router.navigateToScreen("settings", { status: "saved" });
  });
  bindSavedShoeManagement({ services, router });
  bindDataManagement({ services, router, rerender });
}
