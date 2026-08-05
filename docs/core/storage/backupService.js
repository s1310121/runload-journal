import { INPUT_LIMITS, parseJsonText } from "../safety/inputSafety.js";
import { inspectBackupSnapshot, RESTORE_STATUS } from "./restoreInspection.js";
import { STORAGE_KEYS, USER_DATA_STORAGE_KEYS } from "./storageKeys.js";

export const BACKUP_FORMAT_VERSION = "runner-load-app-backup-v1";

function blockedInspection(code, message, details = {}) {
  return Object.freeze({
    ok: false,
    status: RESTORE_STATUS.blocked,
    canRestore: false,
    requiresAcknowledgement: false,
    counts: Object.freeze({}),
    summary: Object.freeze({ blockingCount: 1, warningCount: 0 }),
    issues: Object.freeze([Object.freeze({
      severity: "BLOCKING",
      code,
      area: "backup",
      message,
      itemId: "",
      details: Object.freeze({ ...details }),
    })]),
  });
}

function createRestoreChanges(snapshot) {
  return USER_DATA_STORAGE_KEYS.map((key) => {
    if (!Object.prototype.hasOwnProperty.call(snapshot.data, key) || snapshot.data[key] == null) {
      return { key, remove: true };
    }
    return { key, value: snapshot.data[key] };
  });
}

export function createBackupService(gateway) {
  function tryCreateBackupSnapshot() {
    const data = {};
    for (const key of USER_DATA_STORAGE_KEYS) {
      const result = gateway.readJsonResult(key, null);
      if (!result.ok) {
        return {
          ok: false,
          code: result.operation === "parse" ? "BACKUP_SOURCE_DATA_CORRUPT" : "BACKUP_SOURCE_READ_FAILED",
          message: result.operation === "parse"
            ? "端末内データの一部を読み取れないため、バックアップを作成できません。"
            : "端末内データへアクセスできないため、バックアップを作成できません。",
          key,
          cause: result,
        };
      }
      data[key] = result.value;
    }
    return {
      ok: true,
      snapshot: Object.freeze({
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        data,
      }),
    };
  }

  function createBackupSnapshot() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.snapshot;
  }

  function tryExportBackupText() {
    const result = tryCreateBackupSnapshot();
    if (!result.ok) return result;
    try {
      return { ok: true, snapshot: result.snapshot, text: JSON.stringify(result.snapshot, null, 2) };
    } catch (error) {
      return {
        ok: false,
        code: "BACKUP_SERIALIZE_FAILED",
        message: "バックアップファイルを作成できませんでした。",
        cause: error,
      };
    }
  }

  function exportBackupText() {
    const result = tryExportBackupText();
    if (!result.ok) {
      const error = Object.assign(new Error(result.message), result);
      throw error;
    }
    return result.text;
  }

  function inspectBackupText(text) {
    const parsed = parseJsonText(text);
    if (!parsed.ok) {
      return blockedInspection(
        parsed.code || "BACKUP_JSON_INVALID",
        parsed.message || "JSONファイルを読み取れませんでした。",
        parsed.details || {},
      );
    }
    return inspectBackupSnapshot(parsed.value, BACKUP_FORMAT_VERSION);
  }

  async function inspectBackupFile(file) {
    if (!file || typeof file.text !== "function") {
      return blockedInspection("BACKUP_FILE_REQUIRED", "バックアップファイルを選択してください。");
    }
    const size = Number(file.size);
    if (Number.isFinite(size) && size > INPUT_LIMITS.backupBytes) {
      return blockedInspection("JSON_TOO_LARGE", "バックアップが大きすぎます。", {
        bytes: size,
        maximumBytes: INPUT_LIMITS.backupBytes,
      });
    }
    try {
      return inspectBackupText(await file.text());
    } catch (error) {
      return blockedInspection("BACKUP_FILE_READ_FAILED", "バックアップファイルを読み取れませんでした。", {
        message: String(error?.message || error || "file_read_failed"),
      });
    }
  }

  function validateBackupSnapshot(snapshot) {
    return inspectBackupSnapshot(snapshot, BACKUP_FORMAT_VERSION);
  }

  function restoreInspectedBackup(inspection, options = {}) {
    if (!inspection || inspection.inspectionVersion !== "runload-restore-inspection-v1" || !inspection.snapshot) {
      return { ok: false, code: "RESTORE_INSPECTION_REQUIRED", message: "復元前の検査をやり直してください。" };
    }
    const freshInspection = inspectBackupSnapshot(inspection.snapshot, BACKUP_FORMAT_VERSION);
    if (!freshInspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: "復元できない問題があります。", inspection: freshInspection };
    }
    if (freshInspection.requiresAcknowledgement && options.acceptReview !== true) {
      return { ok: false, code: "BACKUP_REVIEW_ACK_REQUIRED", message: "要確認の内容を確認してください。", inspection: freshInspection };
    }

    const previousResult = tryCreateBackupSnapshot();
    if (!previousResult.ok) {
      return {
        ok: false,
        code: "PRE_RESTORE_BACKUP_FAILED",
        message: "現在の端末内データを安全に退避できないため、復元を中止しました。",
        cause: previousResult,
      };
    }
    const changes = createRestoreChanges(freshInspection.snapshot);
    changes.push({ key: STORAGE_KEYS.historyUndo, remove: true });
    changes.push({
      key: STORAGE_KEYS.backups,
      value: [{
        id: `backup-before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        label: "復元前の自動バックアップ",
        createdAt: new Date().toISOString(),
        snapshot: previousResult.snapshot,
      }],
    });
    const result = gateway.transact(changes);
    return {
      ...result,
      restoredFormatVersion: freshInspection.formatVersion,
      restoreStatus: freshInspection.status,
      counts: freshInspection.counts,
    };
  }

  function restoreBackupText(text) {
    const inspection = inspectBackupText(text);
    if (!inspection.canRestore) {
      return { ok: false, code: "BACKUP_RESTORE_BLOCKED", message: inspection.issues?.[0]?.message || "復元できませんでした。", inspection };
    }
    return restoreInspectedBackup(inspection, { acceptReview: false });
  }

  return Object.freeze({
    createBackupSnapshot,
    tryCreateBackupSnapshot,
    exportBackupText,
    tryExportBackupText,
    inspectBackupText,
    inspectBackupFile,
    validateBackupSnapshot,
    restoreInspectedBackup,
    restoreBackupText,
  });
}
