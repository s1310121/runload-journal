import { STORAGE_KEYS } from "./storageKeys.js";

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createFailure(operation, key, error, details = {}) {
  return {
    ok: false,
    operation,
    key,
    code: "STORAGE_OPERATION_FAILED",
    message: String(error?.message || error || "storage_error"),
    details,
  };
}

export function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues).map(([key, value]) => [key, String(value)]));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
    dump() { return Object.fromEntries(values.entries()); },
  };
}

export function createStorageGateway(storage) {
  let targetStorage = storage;
  if (!targetStorage) {
    try {
      targetStorage = globalThis.localStorage;
    } catch (error) {
      targetStorage = {
        getItem() { throw error; },
        setItem() { throw error; },
        removeItem() { throw error; },
      };
    }
  }
  let lastFailure = null;

  function readRaw(key, fallback = null) {
    try {
      const value = targetStorage.getItem(key);
      lastFailure = null;
      return value == null ? fallback : value;
    } catch (error) {
      lastFailure = createFailure("read", key, error);
      return fallback;
    }
  }

  function writeRaw(key, rawValue) {
    try {
      targetStorage.setItem(key, String(rawValue));
      lastFailure = null;
      return { ok: true, key };
    } catch (error) {
      lastFailure = createFailure("write", key, error);
      return { ...lastFailure, error };
    }
  }

  function remove(key) {
    try {
      targetStorage.removeItem(key);
      lastFailure = null;
      return { ok: true, key };
    } catch (error) {
      lastFailure = createFailure("remove", key, error);
      return { ...lastFailure, error };
    }
  }

  function preserveCorruptValue(key, rawValue, parseError) {
    let entries = [];
    try {
      const existingRawValue = targetStorage.getItem(STORAGE_KEYS.corruptStorageBackup);
      const existing = existingRawValue ? JSON.parse(existingRawValue) : [];
      entries = Array.isArray(existing) ? existing : [];
    } catch {
      entries = [];
    }
    const next = [...entries, {
      key,
      rawValue: String(rawValue).slice(0, 2 * 1024 * 1024),
      detectedAt: new Date().toISOString(),
      error: String(parseError?.message || parseError),
    }].slice(-20);
    try {
      targetStorage.setItem(STORAGE_KEYS.corruptStorageBackup, JSON.stringify(next));
    } catch {
      // 破損値の退避失敗は、元の読込結果を上書きしない。
    }
  }

  function readJsonResult(key, fallback) {
    const rawValue = readRaw(key, null);
    if (lastFailure) {
      return {
        ...cloneValue(lastFailure),
        value: cloneValue(fallback),
        exists: false,
      };
    }
    if (rawValue == null) {
      return { ok: true, key, value: cloneValue(fallback), exists: false };
    }
    try {
      return { ok: true, key, value: JSON.parse(rawValue), exists: true };
    } catch (error) {
      preserveCorruptValue(key, rawValue, error);
      lastFailure = createFailure("parse", key, error, { rawLength: String(rawValue).length });
      return {
        ...cloneValue(lastFailure),
        value: cloneValue(fallback),
        exists: true,
      };
    }
  }

  function readJson(key, fallback) {
    return readJsonResult(key, fallback).value;
  }

  function captureSnapshot(keys = []) {
    try {
      const items = [...new Set(keys.map(String))].map((key) => {
        const rawValue = targetStorage.getItem(key);
        return { key, existed: rawValue != null, rawValue };
      });
      lastFailure = null;
      return { ok: true, items };
    } catch (error) {
      lastFailure = createFailure("snapshot", "", error);
      return { ...lastFailure, error, items: [] };
    }
  }

  function restoreSnapshot(items = []) {
    const failures = [];
    let restoredCount = 0;
    [...items].reverse().forEach((item) => {
      try {
        if (item.existed) targetStorage.setItem(item.key, item.rawValue);
        else targetStorage.removeItem(item.key);
        restoredCount += 1;
      } catch (error) {
        failures.push(createFailure("rollback", item.key, error));
      }
    });
    return { ok: failures.length === 0, restoredCount, failures };
  }

  function transact(changes = []) {
    const normalizedChanges = changes.map((change) => ({
      key: String(change.key),
      remove: Boolean(change.remove),
      rawValue: change.remove
        ? null
        : Object.prototype.hasOwnProperty.call(change, "rawValue")
          ? String(change.rawValue)
          : JSON.stringify(change.value),
    }));
    const keys = normalizedChanges.map((change) => change.key);
    if (new Set(keys).size !== keys.length) {
      lastFailure = {
        ok: false,
        operation: "transaction",
        key: "",
        code: "STORAGE_TRANSACTION_DUPLICATE_KEY",
        message: "A storage transaction contains duplicate keys.",
        details: { duplicateKeys: [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))] },
      };
      return { ...cloneValue(lastFailure), committedCount: 0 };
    }
    const snapshot = captureSnapshot(keys);
    if (!snapshot.ok) return { ...snapshot, committedCount: 0 };

    let committedCount = 0;
    for (const change of normalizedChanges) {
      try {
        if (change.remove) targetStorage.removeItem(change.key);
        else targetStorage.setItem(change.key, change.rawValue);
        committedCount += 1;
      } catch (error) {
        const rollback = restoreSnapshot(snapshot.items.slice(0, committedCount));
        lastFailure = {
          ...createFailure(change.remove ? "remove" : "write", change.key, error),
          rollback,
        };
        return { ...lastFailure, error, committedCount, rollback };
      }
    }
    lastFailure = null;
    return { ok: true, committedCount, keys };
  }

  function writeJson(key, value) {
    return transact([{ key, value }]);
  }

  function contains(key) {
    return readRaw(key, null) != null;
  }

  function probe() {
    const probeKey = "runner-load-a7-final-candidate-v1-storage-probe";
    const snapshot = captureSnapshot([probeKey]);
    if (!snapshot.ok) return snapshot;
    const value = `storage-probe-${Date.now()}`;
    const writeResult = writeRaw(probeKey, value);
    if (!writeResult.ok) return writeResult;
    const matched = readRaw(probeKey, "") === value;
    const rollback = restoreSnapshot(snapshot.items);
    if (!matched || !rollback.ok) {
      lastFailure = {
        ok: false,
        operation: "probe",
        key: probeKey,
        code: "STORAGE_PROBE_FAILED",
        message: matched ? "storage_probe_restore_failed" : "storage_probe_mismatch",
        rollback,
      };
      return lastFailure;
    }
    lastFailure = null;
    return { ok: true };
  }

  return Object.freeze({
    readRaw,
    readJson,
    readJsonResult,
    writeRaw,
    writeJson,
    remove,
    contains,
    captureSnapshot,
    restoreSnapshot,
    transact,
    probe,
    getLastFailure: () => cloneValue(lastFailure),
  });
}
