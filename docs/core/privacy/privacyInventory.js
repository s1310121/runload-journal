import {
  CURRENT_APP_REMOVABLE_STORAGE_KEYS,
  INTERNAL_RECOVERY_STORAGE_KEYS,
  LEGACY_STORAGE_KEYS,
  STORAGE_KEYS,
  USER_DATA_STORAGE_KEYS,
} from "../storage/storageKeys.js";

export const PRIVACY_OVERVIEW_VERSION = "runload-privacy-overview-v1";

const STORAGE_GROUPS = Object.freeze([
  Object.freeze({
    id: "records-results",
    label: "走行・休養記録と保存済み結果",
    keys: Object.freeze([
      STORAGE_KEYS.records,
      STORAGE_KEYS.modelResultsV27,
      STORAGE_KEYS.modelResultsRegionalV1,
    ]),
    description: "入力した走行・休養の事実、保存時点のコースや任意プロフィールの内容、走行全体と12部位の保存済み結果を含みます。",
  }),
  Object.freeze({
    id: "person-input",
    label: "本人入力と共有範囲",
    keys: Object.freeze([STORAGE_KEYS.subjectiveFeedback]),
    description: "本人が選んだ身体記録、相談したい相手・内容、共有する記録範囲を記録ごとに保存します。生成した相談文そのものは自動保存しません。",
  }),
  Object.freeze({
    id: "plans-notebook",
    label: "予定と記録ノート",
    keys: Object.freeze([STORAGE_KEYS.plans, STORAGE_KEYS.notebook]),
    description: "保存した予定、本人が書いたノート、見返し元、任意の観察メモを保存します。達成度や評価へ変換しません。",
  }),
  Object.freeze({
    id: "reusable-settings",
    label: "再利用する設定",
    keys: Object.freeze([STORAGE_KEYS.profile, STORAGE_KEYS.settings, STORAGE_KEYS.courses]),
    description: "表示設定、任意プロフィール、保存シューズ、保存コースを次回の入力や表示に使うため保存します。変更しても過去記録に保存された内容は自動更新しません。",
  }),
  Object.freeze({
    id: "draft",
    label: "入力途中の下書き",
    keys: Object.freeze([STORAGE_KEYS.draft]),
    description: "保存前の入力途中を再開するため、端末内に下書きを保存する場合があります。",
  }),
]);

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countProfileFields(profile = {}) {
  return Object.entries(profile || {}).filter(([key, value]) => (
    key !== "updatedAt"
    && value !== ""
    && value !== null
    && value !== undefined
    && (!Array.isArray(value) || value.length > 0)
  )).length;
}

function groupStatus(services, group) {
  const gateway = services.storage.gateway;
  const values = Object.fromEntries(group.keys.map((key) => [key, gateway.readJson(key, null)]));
  if (group.id === "records-results") return `${countArray(values[STORAGE_KEYS.records])}件の記録`;
  if (group.id === "person-input") return `${countArray(values[STORAGE_KEYS.subjectiveFeedback])}件`;
  if (group.id === "plans-notebook") {
    const plans = countArray(values[STORAGE_KEYS.plans]);
    const pages = Array.isArray(values[STORAGE_KEYS.notebook]?.pages) ? values[STORAGE_KEYS.notebook].pages.length : 0;
    return `予定${plans}件・ノート${pages}件`;
  }
  if (group.id === "reusable-settings") {
    const profileCount = countProfileFields(values[STORAGE_KEYS.profile]);
    const courses = countArray(values[STORAGE_KEYS.courses]);
    return `任意プロフィール${profileCount ? "あり" : "なし"}・コース${courses}件`;
  }
  return values[STORAGE_KEYS.draft] ? "下書きあり" : "下書きなし";
}

export function buildPrivacyOverview(services) {
  const storageGroups = STORAGE_GROUPS.map((group) => Object.freeze({
    ...group,
    status: groupStatus(services, group),
  }));
  return Object.freeze({
    version: PRIVACY_OVERVIEW_VERSION,
    storageMode: "DEVICE_LOCAL_BROWSER_STORAGE",
    automaticExternalTransfer: false,
    externalAiUsed: false,
    storageGroups: Object.freeze(storageGroups),
    backup: Object.freeze({
      format: "JSON_PLAIN_TEXT",
      encryptedByApp: false,
      includedKeys: USER_DATA_STORAGE_KEYS,
      internalRecoveryKeysIncluded: false,
    }),
    deletion: Object.freeze({
      currentAppKeys: CURRENT_APP_REMOVABLE_STORAGE_KEYS,
      internalRecoveryKeys: INTERNAL_RECOVERY_STORAGE_KEYS,
      legacyKeysExcluded: Object.freeze(Object.values(LEGACY_STORAGE_KEYS)),
      exportedFilesDeletedByApp: false,
    }),
  });
}

export function privacyStorageCoverage() {
  return Object.freeze({
    persistentUserKeys: USER_DATA_STORAGE_KEYS,
    groupedKeys: Object.freeze(STORAGE_GROUPS.flatMap((group) => group.keys)),
    removableKeys: CURRENT_APP_REMOVABLE_STORAGE_KEYS,
  });
}
