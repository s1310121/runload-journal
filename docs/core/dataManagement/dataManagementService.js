import { CURRENT_APP_REMOVABLE_STORAGE_KEYS } from "../storage/storageKeys.js";

export function createDataManagementService(gateway) {
  function clearAllUserData() {
    return gateway.transact(CURRENT_APP_REMOVABLE_STORAGE_KEYS.map((key) => ({ key, remove: true })));
  }
  return Object.freeze({ clearAllUserData });
}
