export const VOCAL_TAKE_LIMIT_SECONDS = 120;
export type StoredVocalTake = { ownerScope: string; lessonId: string; blob: Blob; recordedAt: string; durationSeconds: number };

export function recordingElapsedSeconds(startedAtMs: number, nowMs: number) {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) return 0;
  return Math.min(VOCAL_TAKE_LIMIT_SECONDS, Math.max(0, (nowMs - startedAtMs) / 1000));
}

const databaseName = "guitarhub-local-audio";
const legacyStoreName = "lesson-voice-takes";
const storeName = "lesson-voice-takes-v2";

export function vocalTakeOwnerScope(accountId: string | null) {
  return accountId ? `account:${accountId.toLowerCase()}` : "guest";
}

export function vocalTakeKey(ownerScope: string, lessonId: string): [string, string] {
  return [ownerScope, lessonId];
}

export function bindVocalRecordingLifecycle(interrupt: () => void, page: Pick<Document, "hidden" | "addEventListener" | "removeEventListener"> = document, surface: Pick<Window, "addEventListener" | "removeEventListener"> = window) {
  const hidden = () => { if (page.hidden) interrupt(); };
  const leave = () => interrupt();
  page.addEventListener("visibilitychange", hidden);
  surface.addEventListener("pagehide", leave);
  return () => {
    page.removeEventListener("visibilitychange", hidden);
    surface.removeEventListener("pagehide", leave);
  };
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Local recording storage is unavailable in this browser.")); return; }
    const request = indexedDB.open(databaseName, 2);
    request.onupgradeneeded = () => {
      // Version 1 had no account scope. Its recordings cannot be assigned to a
      // verified learner safely, so remove that unreleased store on upgrade.
      if (request.result.objectStoreNames.contains(legacyStoreName)) request.result.deleteObjectStore(legacyStoreName);
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: ["ownerScope", "lessonId"] });
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error ?? new Error("Local recording storage could not open."));
    request.onblocked = () => reject(new Error("Close other GuitarHub tabs, then try local recording again."));
  });
}

async function request<T>(mode: IDBTransactionMode, ownerScope: string, lessonId: string, value?: StoredVocalTake): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const key = vocalTakeKey(ownerScope, lessonId);
    const operation = mode === "readonly" ? store.get(key) : value ? store.put(value) : store.delete(key);
    transaction.oncomplete = () => { db.close(); resolve(operation.result as T | undefined); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("The local recording could not be saved.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("The local recording was not changed.")); };
  });
}

export async function loadVocalTake(ownerScope: string, lessonId: string) { return request<StoredVocalTake>("readonly", ownerScope, lessonId); }
export async function saveVocalTake(take: StoredVocalTake) { await request("readwrite", take.ownerScope, take.lessonId, take); }
export async function deleteVocalTake(ownerScope: string, lessonId: string) { await request("readwrite", ownerScope, lessonId); }
